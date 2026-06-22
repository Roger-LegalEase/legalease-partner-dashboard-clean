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

const service = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-drop-point-nudge-service.ts"));
const email = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-drop-point-nudge-email.ts"));
const security = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-resume-security.ts"));

try {
  const db = new PGlite();
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-33-expungement-screening-resume-links.sql"));
  await db.exec(read("supabase/phase-34-expungement-screening-drop-point-nudges.sql"));
  const storage = createPgliteNudgeStorage(db);

  verifyFieldSpecificCopy();
  await verifyAlreadyReturnedGuard(db, storage);
  await verifyOptOutRespected(storage);
  await verifyNoContactOrConsent(storage);
  await verifyCadenceAndIdempotency(db, storage);
  verifyDiscretion();
  await verifyLocalTimeWindow(db, storage);
  await verifyRecordShieldAggregate(db);
  verifyMigrationPrivacy();
  verifyScopeGuardAllowlist();

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("Expungement.ai drop-point nudge verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai drop-point nudge verification passed.");
console.log("Real storage: phase 32 + 33 + 34 migrations executed in isolated PGlite PostgreSQL.");
console.log("Field-specific copy, send-time dark recheck, opt-out, consent, cadence, local window, and idempotency verified.");
console.log("RecordShield demand signal remains aggregate-only with no PII or answers.");

function verifyFieldSpecificCopy() {
  const cases = [
    ["case_identifier", "case number"],
    ["case_number", "case number"],
    ["charge", "charge on your record"],
    ["disposition_date", "stopped on a date"],
    ["sentence_completion_date", "stopped on a date"],
    ["arrest_date", "stopped on a date"],
    ["record_documents", "having your court records"],
    ["criminal_history", "having your court records"],
    ["unlisted_question", "almost through your screening"]
  ];

  for (const [questionId, expected] of cases) {
    const body = email.touch1Body(questionId);
    assert(body.includes(expected), `Touch 1 copy for ${questionId} did not use expected copy.`);
  }
}

async function verifyAlreadyReturnedGuard(db, storage) {
  const rawToken = security.generateResumeToken();
  await seedSession(db, {
    sessionId: "11111111-1111-4111-8111-111111111111",
    rawToken,
    questionId: "case_identifier",
    resumeSentAt: hoursAgo(30),
    status: "in_progress"
  });
  const candidates = await storage.listDueNudgeCandidates({ touch: 1, now: nowIso(), limit: 10 });
  assert(candidates.some((row) => row.session_id === "11111111-1111-4111-8111-111111111111"), "Due queue did not include returned-guard setup session.");

  await db.query("update public.screening_sessions set status = 'resumed' where session_id = $1", ["11111111-1111-4111-8111-111111111111"]);
  const result = await service.sendScreeningDropPointNudge(storage, "11111111-1111-4111-8111-111111111111", 1, nowMs());
  assert(result === "skipped", "Session resumed between queue and send received a nudge.");
  const row = await one(db, "select nudge_touch1_sent_at from public.screening_sessions where session_id = $1", ["11111111-1111-4111-8111-111111111111"]);
  assert(row.nudge_touch1_sent_at === null, "Returned session was marked touch-1 sent.");
}

async function verifyOptOutRespected(storage) {
  await seedForStorage(storage, {
    sessionId: "22222222-2222-4222-8222-222222222222",
    questionId: "charge",
    resumeSentAt: hoursAgo(30),
    nudgeOptedOutAt: hoursAgo(1)
  });
  const result = await service.sendScreeningDropPointNudge(storage, "22222222-2222-4222-8222-222222222222", 1, nowMs());
  assert(result === "skipped", "Opted-out session received a nudge.");
}

async function verifyNoContactOrConsent(storage) {
  await seedForStorage(storage, {
    sessionId: "33333333-3333-4333-8333-333333333333",
    questionId: "charge",
    resumeSentAt: hoursAgo(30),
    email: null
  });
  await seedForStorage(storage, {
    sessionId: "44444444-4444-4444-8444-444444444444",
    questionId: "charge",
    resumeSentAt: hoursAgo(30),
    consentAt: null
  });
  const noEmail = await service.sendScreeningDropPointNudge(storage, "33333333-3333-4333-8333-333333333333", 1, nowMs());
  const noConsent = await service.sendScreeningDropPointNudge(storage, "44444444-4444-4444-8444-444444444444", 1, nowMs());
  assert(noEmail === "skipped", "No-contact session received a nudge.");
  assert(noConsent === "skipped", "No-consent session received a nudge.");
}

async function verifyCadenceAndIdempotency(db, storage) {
  await seedSession(db, {
    sessionId: "55555555-5555-4555-8555-555555555555",
    questionId: "record_documents",
    resumeSentAt: hoursAgo(30)
  });
  let first = await service.sendScreeningDropPointNudge(storage, "55555555-5555-4555-8555-555555555555", 1, nowMs());
  assert(first === "sent", "Touch 1 did not send at 24h window.");
  first = await service.sendScreeningDropPointNudge(storage, "55555555-5555-4555-8555-555555555555", 1, nowMs());
  assert(first === "skipped", "Touch 1 double-send was not idempotently blocked.");

  let second = await service.sendScreeningDropPointNudge(storage, "55555555-5555-4555-8555-555555555555", 2, nowMs());
  assert(second === "skipped", "Touch 2 sent before the 72h window.");
  await db.query("update public.screening_sessions set resume_sent_at = $2 where session_id = $1", ["55555555-5555-4555-8555-555555555555", hoursAgo(80)]);
  second = await service.sendScreeningDropPointNudge(storage, "55555555-5555-4555-8555-555555555555", 2, nowMs());
  assert(second === "sent", "Touch 2 did not send after 72h while still dark.");
  second = await service.sendScreeningDropPointNudge(storage, "55555555-5555-4555-8555-555555555555", 2, nowMs());
  assert(second === "skipped", "Touch 2 double-send was not blocked.");

  const row = await one(db, "select nudge_touch1_sent_at, nudge_touch2_sent_at from public.screening_sessions where session_id = $1", ["55555555-5555-4555-8555-555555555555"]);
  assert(row.nudge_touch1_sent_at && row.nudge_touch2_sent_at, "Cadence sent timestamps were not persisted.");
}

function verifyDiscretion() {
  for (const touch of [1, 2]) {
    const rendered = email.renderScreeningDropPointNudgeEmail({
      to: "pilot@example.com",
      touch,
      dropQuestionId: touch === 1 ? "case_identifier" : "record_documents",
      resumeUrl: "https://example.test/resume?token=raw",
      optOutUrl: "https://example.test/opt-out?token=raw"
    });
    const subject = rendered.subject.toLowerCase();
    for (const banned of ["expungement", "criminal record", "charges", "arrest", "conviction", "court case", "eligibility", "result", "payment", "packet"]) {
      assert(!subject.includes(banned), `Nudge subject includes banned term: ${banned}`);
    }
    const combined = `${rendered.text}\n${rendered.html}`.toLowerCase();
    for (const forbidden of ["cr-2010", "pilot@example.com", "resultcode", "paymentallowed", "packetplan", "you qualify", "guarantee"]) {
      assert(!combined.includes(forbidden), `Nudge body includes forbidden detail: ${forbidden}`);
    }
    assert(combined.includes("turn off"), "Nudge body is missing opt-out link copy.");
    assert(combined.includes("token=raw"), "Nudge body is missing resume/opt-out links.");
  }
}

async function verifyLocalTimeWindow(db, storage) {
  assert(service.isInsideNudgeSendWindow("MS", Date.UTC(2026, 0, 1, 16)), "MS daytime window should allow send.");
  assert(!service.isInsideNudgeSendWindow("MS", Date.UTC(2026, 0, 1, 8)), "MS overnight window should block send.");
  assert(service.isInsideNudgeSendWindow(null, Date.UTC(2026, 0, 1, 15)), "Unknown timezone safe default daytime should allow send.");
  assert(!service.isInsideNudgeSendWindow(null, Date.UTC(2026, 0, 1, 5)), "Unknown timezone safe default overnight should block send.");

  await seedSession(db, {
    sessionId: "77777777-7777-4777-8777-777777777777",
    questionId: "case_identifier",
    resumeSentAt: hoursAgo(30),
    jurisdiction: "MS"
  });
  const result = await service.sendScreeningDropPointNudge(storage, "77777777-7777-4777-8777-777777777777", 1, Date.UTC(2026, 0, 2, 8, 0, 0));
  assert(result === "skipped", "Overnight send was not skipped.");
  const row = await one(db, "select nudge_touch1_claimed_at, nudge_touch1_sent_at from public.screening_sessions where session_id = $1", ["77777777-7777-4777-8777-777777777777"]);
  assert(row.nudge_touch1_claimed_at === null && row.nudge_touch1_sent_at === null, "Overnight skipped send left a stale claim or sent timestamp.");
}

async function verifyRecordShieldAggregate(db) {
  await seedSession(db, {
    sessionId: "66666666-6666-4666-8666-666666666666",
    questionId: "record_documents",
    resumeSentAt: hoursAgo(80),
    touch2SentAt: hoursAgo(1),
    status: "resumed"
  });
  const rows = await allNudgeRows(db);
  const aggregate = service.nudgeRecordShieldAggregate(rows);
  assert(aggregate.record_readiness_dark_count >= 1, "Record-readiness dark-driver count was not captured.");
  assert(aggregate.touch2_sent_count >= 1, "Touch-2 sent count was not captured.");
  assert(aggregate.touch2_returned_count >= 1, "Touch-2 return count was not captured.");
  const serialized = JSON.stringify(aggregate).toLowerCase();
  for (const forbidden of ["session", "email", "token", "answer", "pilot@example.com"]) {
    assert(!serialized.includes(forbidden), `RecordShield aggregate exposed forbidden detail: ${forbidden}`);
  }
}

function verifyMigrationPrivacy() {
  const migration = read("supabase/phase-34-expungement-screening-drop-point-nudges.sql");
  for (const required of ["nudge_touch1_sent_at", "nudge_touch2_sent_at", "nudge_opted_out_at"]) {
    assert(migration.includes(required), `Nudge migration missing required field: ${required}`);
  }
  for (const forbidden of ["answers", "resume_email ", "resultCode", "paymentAllowed", "packetPlan"]) {
    assert(!migration.includes(forbidden), `Nudge migration includes forbidden field/content: ${forbidden}`);
  }
}

function verifyScopeGuardAllowlist() {
  const allowlist = read("scripts/rcap-scope-allowlist.mjs");
  assert(allowlist.includes("SCREENING_DROP_POINT_NUDGE_FILES"), "Centralized nudge allowlist group missing.");
  assert(allowlist.includes("src/app/api/expungement-ai/screening/nudge/opt-out/route.ts"), "Nudge opt-out route not centralized in scope allowlist.");
  assert(allowlist.includes("supabase/phase-34-expungement-screening-drop-point-nudges.sql"), "Nudge migration not centralized in scope allowlist.");
  for (const verifier of ["scripts/test-inspect-local-record-clearing-pdfs.mjs", "scripts/test-nebraska-record-clearing-shadow.mjs"]) {
    const source = read(verifier);
    assert(source.includes("REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES"), `${verifier} must use the centralized expungement scope allowlist.`);
    assert(source.includes("isReviewedExpungementScopeLine"), `${verifier} must filter reviewed expungement scope through the centralized allowlist.`);
  }
}

async function seedForStorage(storage, options) {
  await seedSession(storage.db, options);
}

async function seedSession(db, options) {
  const rawToken = options.rawToken ?? security.generateResumeToken();
  const email = options.email === undefined ? "pilot@example.com" : options.email;
  const consentAt = options.consentAt === undefined ? options.resumeSentAt : options.consentAt;
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
      resume_token_expires_at,
      resume_sent_at,
      resume_consent_at,
      nudge_touch1_sent_at,
      nudge_touch2_sent_at,
      nudge_opted_out_at
    ) values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    on conflict (session_id) do update set
      status = excluded.status,
      resume_email = excluded.resume_email,
      resume_email_normalized = excluded.resume_email_normalized,
      resume_consent_at = excluded.resume_consent_at,
      nudge_opted_out_at = excluded.nudge_opted_out_at`,
    [
      options.sessionId,
      options.jurisdiction ?? "MS",
      JSON.stringify({ case_identifier: "CR-2010-123", charge: "Sensitive charge answer" }),
      options.questionId,
      options.furthestStage ?? "case_details",
      options.status ?? "in_progress",
      options.questionId,
      email,
      email,
      security.hashResumeToken(rawToken),
      hoursFromNow(200),
      options.resumeSentAt,
      consentAt,
      options.touch1SentAt ?? null,
      options.touch2SentAt ?? null,
      options.nudgeOptedOutAt ?? null
    ]
  );
}

function createPgliteNudgeStorage(db) {
  return {
    db,
    async listDueNudgeCandidates(input) {
      const cutoff = new Date(Date.parse(input.now) - (input.touch === 1 ? service.nudgeTouch1DelayMs : service.nudgeTouch2DelayMs)).toISOString();
      const touchSql = input.touch === 1
        ? "and nudge_touch1_sent_at is null and nudge_touch1_claimed_at is null"
        : "and nudge_touch1_sent_at is not null and nudge_touch2_sent_at is null and nudge_touch2_claimed_at is null";
      const result = await db.query(
        `select ${selectColumns()} from public.screening_sessions
        where resume_sent_at is not null
          and resume_email_normalized is not null
          and resume_consent_at is not null
          and nudge_opted_out_at is null
          and status in ('in_progress', 'abandoned')
          and resume_sent_at <= $1
          ${touchSql}
        limit ${Number(input.limit)}`,
        [cutoff]
      );
      return result.rows.map(rowToNudgeRow);
    },
    async claimNudgeTouch(input) {
      const claimedColumn = input.touch === 1 ? "nudge_touch1_claimed_at" : "nudge_touch2_claimed_at";
      const cutoff = new Date(Date.parse(input.now) - (input.touch === 1 ? service.nudgeTouch1DelayMs : service.nudgeTouch2DelayMs)).toISOString();
      const touchSql = input.touch === 1
        ? "and nudge_touch1_sent_at is null and nudge_touch1_claimed_at is null"
        : "and nudge_touch1_sent_at is not null and nudge_touch2_sent_at is null and nudge_touch2_claimed_at is null";
      const result = await db.query(
        `update public.screening_sessions set ${claimedColumn} = $2, updated_at = $2
        where session_id = $1
          and resume_sent_at is not null
          and resume_email_normalized is not null
          and resume_consent_at is not null
          and nudge_opted_out_at is null
          and status in ('in_progress', 'abandoned')
          and resume_sent_at <= $3
          ${touchSql}
        returning ${selectColumns()}`,
        [input.sessionId, input.claimedAt, cutoff]
      );
      return result.rows[0] ? rowToNudgeRow(result.rows[0]) : null;
    },
    async releaseNudgeClaim(input) {
      const claimedColumn = input.touch === 1 ? "nudge_touch1_claimed_at" : "nudge_touch2_claimed_at";
      await db.query(
        `update public.screening_sessions set ${claimedColumn} = null, updated_at = $3
        where session_id = $1 and ${claimedColumn} = $2`,
        [input.sessionId, input.claimedAt, input.releasedAt]
      );
    },
    async markNudgeSent(input) {
      const sentColumn = input.touch === 1 ? "nudge_touch1_sent_at" : "nudge_touch2_sent_at";
      await db.query(`update public.screening_sessions set ${sentColumn} = $2, updated_at = $2 where session_id = $1`, [input.sessionId, input.sentAt]);
    },
    async rotateResumeToken(input) {
      const result = await db.query(
        `update public.screening_sessions set
          resume_token_hash = $2,
          resume_token_expires_at = $3,
          resume_token_rotated_at = $6,
          previous_resume_token_hash = $4,
          previous_resume_token_grace_expires_at = $5,
          updated_at = $6
        where session_id = $1 and status in ('in_progress', 'abandoned')
        returning ${selectColumns()}`,
        [input.sessionId, input.tokenHash, input.tokenExpiresAt, input.previousTokenHash, input.previousTokenGraceExpiresAt, input.rotatedAt]
      );
      if (!result.rows[0]) throw new Error("No row rotated.");
      return rowToNudgeRow(result.rows[0]);
    },
    async optOutByTokenHash(input) {
      const result = await db.query(
        `update public.screening_sessions set nudge_opted_out_at = $2, updated_at = $2
        where resume_token_hash = $1 or previous_resume_token_hash = $1
        returning session_id`,
        [input.tokenHash, input.optedOutAt]
      );
      return result.rows.length > 0;
    }
  };
}

async function allNudgeRows(db) {
  const result = await db.query(`select ${selectColumns()} from public.screening_sessions`);
  return result.rows.map(rowToNudgeRow);
}

async function one(db, query, params) {
  const result = await db.query(query, params);
  assert(result.rows.length === 1, "Expected one row.");
  return result.rows[0];
}

function rowToNudgeRow(row) {
  return {
    session_id: row.session_id,
    jurisdiction: row.jurisdiction,
    current_question_id: row.current_question_id,
    last_drop_question: row.last_drop_question,
    furthest_stage: row.furthest_stage,
    status: row.status,
    resume_email_normalized: row.resume_email_normalized,
    resume_token_hash: row.resume_token_hash,
    resume_sent_at: iso(row.resume_sent_at),
    resume_consent_at: iso(row.resume_consent_at),
    resume_token_expires_at: iso(row.resume_token_expires_at),
    nudge_touch1_sent_at: iso(row.nudge_touch1_sent_at),
    nudge_touch2_sent_at: iso(row.nudge_touch2_sent_at),
    nudge_touch1_claimed_at: iso(row.nudge_touch1_claimed_at),
    nudge_touch2_claimed_at: iso(row.nudge_touch2_claimed_at),
    nudge_opted_out_at: iso(row.nudge_opted_out_at)
  };
}

function selectColumns() {
  return [
    "session_id",
    "jurisdiction",
    "current_question_id",
    "last_drop_question",
    "furthest_stage",
    "status",
    "resume_email_normalized",
    "resume_token_hash",
    "resume_sent_at",
    "resume_consent_at",
    "resume_token_expires_at",
    "nudge_touch1_sent_at",
    "nudge_touch2_sent_at",
    "nudge_touch1_claimed_at",
    "nudge_touch2_claimed_at",
    "nudge_opted_out_at"
  ].join(",");
}

function nowMs() {
  return Date.UTC(2026, 0, 2, 16, 0, 0);
}

function nowIso() {
  return new Date(nowMs()).toISOString();
}

function hoursAgo(hours) {
  return new Date(nowMs() - hours * 60 * 60 * 1000).toISOString();
}

function hoursFromNow(hours) {
  return new Date(nowMs() + hours * 60 * 60 * 1000).toISOString();
}

function iso(value) {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
