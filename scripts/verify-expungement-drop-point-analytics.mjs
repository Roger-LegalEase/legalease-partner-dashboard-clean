import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const analytics = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-drop-point-analytics.ts"));

try {
  const db = new PGlite();
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-33-expungement-screening-resume-links.sql"));
  await seedSessions(db);

  const sourceRows = await analyticsRows(db);
  const aggregateRows = analytics.aggregateScreeningDropPoints(sourceRows);

  verifyDerivation(sourceRows);
  verifyRanking(aggregateRows);
  verifyResumedWentDarkSplit(aggregateRows);
  verifyPrivacy(sourceRows, aggregateRows);
  verifyInternalViewIsAdminGated();
  verifyAggregateOnly(aggregateRows);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("Expungement.ai drop-point analytics verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai drop-point analytics verification passed.");
console.log("Real storage: phase 32 + 33 migrations executed in isolated PGlite PostgreSQL.");
console.log("Drop-point analytics are derived from screening_sessions without a new events table.");
console.log("Aggregate ranking, resumed-vs-went-dark split, admin gate, and no-PII output verified.");

async function seedSessions(db) {
  const rows = [
    sessionRow("11111111-1111-4111-8111-111111111111", "MS", "case_identifier", "case_details", "in_progress", "2026-01-01T10:00:00.000Z"),
    sessionRow("22222222-2222-4222-8222-222222222222", "MS", "case_identifier", "case_details", "abandoned", "2026-01-02T10:00:00.000Z"),
    sessionRow("33333333-3333-4333-8333-333333333333", "MS", "case_identifier", "case_details", "resumed", "2026-01-03T10:00:00.000Z"),
    sessionRow("44444444-4444-4444-8444-444444444444", "MS", "disposition_date", "case_details", "in_progress", "2026-01-04T10:00:00.000Z"),
    sessionRow("55555555-5555-4555-8555-555555555555", "IL", "case_identifier", "case_details", "completed", "2026-01-05T10:00:00.000Z"),
    unsavedSessionRow("66666666-6666-4666-8666-666666666666", "IL", "charge", "case_details", "in_progress")
  ];

  for (const row of rows) {
    await db.query(
      `insert into public.screening_sessions (
        session_id,
        jurisdiction,
        answers,
        current_question_id,
        furthest_stage,
        status,
        last_drop_question,
        resume_email,
        resume_email_normalized,
        resume_token_hash,
        resume_sent_at,
        updated_at
      ) values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        row.session_id,
        row.jurisdiction,
        JSON.stringify(row.answers),
        row.current_question_id,
        row.furthest_stage,
        row.status,
        row.last_drop_question,
        row.resume_email,
        row.resume_email_normalized,
        row.resume_token_hash,
        row.resume_sent_at,
        row.updated_at
      ]
    );
  }
}

function verifyDerivation(sourceRows) {
  const source = sourceRows.find((row) => row.session_id === "11111111-1111-4111-8111-111111111111");
  const derived = analytics.deriveScreeningDropPoint(source);
  assert(derived, "Saved source row did not derive a drop point.");
  assert(derived.questionId === "case_identifier", "Derived question id was incorrect.");
  assert(derived.furthestStage === "case_details", "Derived furthest stage was incorrect.");
  assert(derived.jurisdiction === "MS", "Derived jurisdiction was incorrect.");
  assert(derived.droppedAt === "2026-01-01T10:00:00.000Z", "Derived timestamp was incorrect.");
  assert(derived.sessionRef === source.session_id, "Derived session reference was incorrect.");
  assertDeepEqual(Object.keys(derived).sort(), ["droppedAt", "furthestStage", "jurisdiction", "outcome", "questionId", "sessionRef"].sort(), "Derived row exposed unexpected keys.");

  const unsaved = analytics.deriveScreeningDropPoint({
    ...source,
    session_id: "66666666-6666-4666-8666-666666666666",
    resume_sent_at: null,
    current_question_id: "charge",
    last_drop_question: "charge"
  });
  assert(unsaved === null, "Unsaved sessions must not derive saved-progress drop analytics.");
}

function verifyRanking(rows) {
  assert(rows[0].question_id === "case_identifier", "Top-ranked drop question should be case_identifier.");
  assert(rows[0].jurisdiction === "MS", "Top-ranked jurisdiction should be MS.");
  assert(rows[0].drop_count === 3, "case_identifier/MS drop count should be 3.");
  const disposition = mustFind(rows, "disposition_date", "MS", "case_details");
  assert(disposition.drop_count === 1, "disposition_date/MS drop count should be 1.");
}

function verifyResumedWentDarkSplit(rows) {
  const caseIdentifier = mustFind(rows, "case_identifier", "MS", "case_details");
  assert(caseIdentifier.resumed_count === 1, "case_identifier/MS resumed count should be 1.");
  assert(caseIdentifier.went_dark_count === 2, "case_identifier/MS went-dark count should be 2.");
  assert(caseIdentifier.went_dark_rate === 2 / 3, "case_identifier/MS went-dark rate should be 2/3.");

  const completed = mustFind(rows, "case_identifier", "IL", "case_details");
  assert(completed.resumed_count === 1, "Completed saved session should count as resumed.");
  assert(completed.went_dark_count === 0, "Completed saved session should not count as went dark.");
}

function verifyPrivacy(sourceRows, aggregateRows) {
  const sourceJson = JSON.stringify(sourceRows);
  assert(!sourceJson.includes("answers"), "Source analytics projection must not include answers.");
  assert(!sourceJson.includes("resume_email"), "Source analytics projection must not include email fields.");
  assert(!sourceJson.includes("secret-token-hash"), "Source analytics projection must not include token hashes.");

  const outputJson = JSON.stringify(aggregateRows);
  for (const forbidden of [
    "Sensitive charge answer",
    "pilot@example.com",
    "resume_email",
    "resume_token",
    "token",
    "session_id",
    "sessionRef",
    "resumeUrl",
    "answers"
  ]) {
    assert(!outputJson.includes(forbidden), `Aggregate output exposed forbidden value: ${forbidden}`);
  }
}

function verifyInternalViewIsAdminGated() {
  const page = read("src/app/internal/expungement-ai/drop-points/page.tsx");
  assert(page.includes('resolveInternalAdminPageAccess("/internal/expungement-ai/drop-points")'), "Internal view does not use the existing admin gate.");
  assert(page.includes("InternalAdminDenied"), "Internal view does not render existing denied component.");
  assert(page.indexOf("resolveInternalAdminPageAccess(") < page.indexOf("getScreeningDropPointAnalytics("), "Internal view must gate before reading analytics data.");
}

function verifyAggregateOnly(rows) {
  const expectedKeys = [
    "drop_count",
    "furthest_stage",
    "jurisdiction",
    "question_id",
    "resumed_count",
    "went_dark_count",
    "went_dark_rate"
  ].sort();

  for (const row of rows) {
    assertDeepEqual(Object.keys(row).sort(), expectedKeys, "Aggregate row exposed unexpected keys.");
  }

  const page = read("src/app/internal/expungement-ai/drop-points/page.tsx");
  for (const marker of ["session_id", "sessionRef", "answers", "email", "token", "resumeUrl", "href={`/"]) {
    assert(!page.includes(marker), `Internal view includes forbidden per-session marker: ${marker}`);
  }
  for (const column of ["drop_count", "resumed_count", "went_dark_count", "went_dark_rate"]) {
    assert(page.includes(column), `Internal view missing aggregate column: ${column}`);
  }
}

async function analyticsRows(db) {
  const result = await db.query(
    `select
      session_id,
      jurisdiction,
      current_question_id,
      last_drop_question,
      furthest_stage,
      status,
      created_at,
      updated_at,
      resume_sent_at,
      resume_token_rotated_at
    from public.screening_sessions
    where resume_sent_at is not null`
  );
  return result.rows.map((row) => ({
    session_id: row.session_id,
    jurisdiction: row.jurisdiction,
    current_question_id: row.current_question_id,
    last_drop_question: row.last_drop_question,
    furthest_stage: row.furthest_stage,
    status: row.status,
    created_at: isoString(row.created_at),
    updated_at: isoString(row.updated_at),
    resume_sent_at: row.resume_sent_at ? isoString(row.resume_sent_at) : null,
    resume_token_rotated_at: row.resume_token_rotated_at ? isoString(row.resume_token_rotated_at) : null
  }));
}

function sessionRow(sessionId, jurisdiction, questionId, stage, status, timestamp) {
  return {
    session_id: sessionId,
    jurisdiction,
    answers: {
      charge: "Sensitive charge answer",
      case_identifier: "Sensitive case number"
    },
    current_question_id: questionId,
    furthest_stage: stage,
    status,
    last_drop_question: questionId,
    resume_email: "pilot@example.com",
    resume_email_normalized: "pilot@example.com",
    resume_token_hash: "secret-token-hash",
    resume_sent_at: timestamp,
    updated_at: timestamp
  };
}

function unsavedSessionRow(sessionId, jurisdiction, questionId, stage, status) {
  return {
    ...sessionRow(sessionId, jurisdiction, questionId, stage, status, "2026-01-06T10:00:00.000Z"),
    resume_email: null,
    resume_email_normalized: null,
    resume_token_hash: null,
    resume_sent_at: null
  };
}

function mustFind(rows, questionId, jurisdiction, stage) {
  const row = rows.find((candidate) => (
    candidate.question_id === questionId
    && candidate.jurisdiction === jurisdiction
    && candidate.furthest_stage === stage
  ));
  assert(row, `Missing aggregate row for ${questionId}/${jurisdiction}/${stage}.`);
  return row;
}

function isoString(value) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  assert(actualJson === expectedJson, `${message}\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    if (request === "server-only") return {};
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    if (nextFile?.endsWith(".json")) return require(nextFile);
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    const candidate = path.join(rootDir, "src", request.slice(2));
    return resolveExistingModuleFile(candidate);
  }

  if (request.startsWith(".")) {
    return resolveExistingModuleFile(path.resolve(basedir, request));
  }

  return null;
}

function resolveExistingModuleFile(candidate) {
  for (const extension of [".ts", ".tsx", ".js", ".json"]) {
    if (fs.existsSync(`${candidate}${extension}`)) return `${candidate}${extension}`;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js"]) {
    const file = path.join(candidate, indexFile);
    if (fs.existsSync(file)) return file;
  }
  return null;
}
