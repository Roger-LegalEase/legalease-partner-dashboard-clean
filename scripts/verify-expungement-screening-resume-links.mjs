import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const persistence = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-session-persistence.ts"));
const security = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-resume-security.ts"));
const service = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-resume-service.ts"));
const email = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-resume-email.ts"));
const rateLimit = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-resume-rate-limit.ts"));
const { toScreeningAnswers } = loadTsModule(path.join(rootDir, "src/components/expungement-ai/screening/answers.ts"));
const { evaluateScreening } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/evaluator.ts"));
const { getProfileByJurisdiction } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/profile-registry.ts"));
const { projectPublicProfile } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/public-profile-projection.ts"));

try {
  const db = new PGlite();
  await db.exec(read("supabase/phase-32-expungement-screening-sessions.sql"));
  await db.exec(read("supabase/phase-33-expungement-screening-resume-links.sql"));
  const storage = createPgliteResumeStorage(db);

  await verifyTokenHashOnly(db, storage);
  await verifySuccessfulResume(storage);
  await verifyWrongEmailAndLockout(storage);
  await verifyIpRateLimit();
  await verifyExpiredAndFreshLink(db, storage);
  await verifyTokenRotation(db, storage);
  await verifyEnumerationResistance(storage);
  verifyDiscreetEmail();
  verifyConsentAndSingleSaveHook();
  await verifyNoForbiddenPersistence(db);
  verifyBoundaryProtection();
  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("Expungement.ai screening resume-link verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai screening resume-link verification passed.");
console.log("Real storage: phase 32 + 33 migrations executed in isolated PGlite PostgreSQL with jsonb answers.");
console.log("Token hashes, email confirmation, expiry, lockout, IP rate limit, rotation, and enumeration-resistant failures verified.");
console.log("Discreet email copy, consent UI, single save hook, and post-payment boundary protections verified.");

async function verifyTokenHashOnly(db, storage) {
  const rawToken = security.generateResumeToken();
  const saved = await seedSession(storage, {
    sessionId: "55555555-5555-4555-8555-555555555555",
    rawToken,
    email: "User@Example.com"
  });
  const row = await one(db, "select * from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(row.resume_token_hash === security.hashResumeToken(rawToken), "Active token hash was not stored.");
  assert(!Object.values(row).includes(rawToken), "Raw resume token was stored in a row column.");
  assert(!JSON.stringify(row).includes(rawToken), "Raw resume token leaked into stored row JSON.");
}

async function verifySuccessfulResume(storage) {
  const profile = getProfileByJurisdiction("IL");
  const publicProfile = projectPublicProfile(profile);
  const answers = representativeAnswers(publicProfile);
  const resumeQuestion = publicProfile.questions.find((question) => question.stage === "case_details");
  const rawToken = security.generateResumeToken();
  const saved = await seedSession(storage, {
    sessionId: "66666666-6666-4666-8666-666666666666",
    rawToken,
    email: "resume@example.com",
    jurisdiction: "IL",
    answers,
    currentQuestionId: resumeQuestion.id,
    furthestStage: resumeQuestion.stage
  });
  const fresh = evaluate(profile, answers, "resume-success");
  const result = await service.confirmScreeningResume(storage, { token: rawToken, email: " Resume@Example.com " }, 1_700_000_000_000);
  assert(result.ok, "Correct token/email did not resume.");
  assert(result.session.sessionId === saved.sessionId, "Resumed wrong session id.");
  assertDeepEqual(result.session.answers, answers, "Resumed answers were not restored byte-identically.");
  assert(result.session.currentQuestionId === resumeQuestion.id, "Current question did not restore.");
  assert(result.session.furthestStage === resumeQuestion.stage, "Furthest stage did not restore.");
  const resumed = evaluate(profile, result.session.answers, "resume-success");
  assertEvaluationEqual(resumed, fresh, "Resumed evaluation must match fresh evaluation through evaluateScreening.");
}

async function verifyWrongEmailAndLockout(storage) {
  const rawToken = security.generateResumeToken();
  const saved = await seedSession(storage, {
    sessionId: "77777777-7777-4777-8777-777777777777",
    rawToken,
    email: "lock@example.com"
  });
  const wrong = await service.confirmScreeningResume(storage, { token: rawToken, email: "wrong@example.com" }, 1_700_000_000_000);
  assert(!wrong.ok && wrong.session === null, "Wrong email must not resume or return answers.");
  let row = await storage.loadSession(saved.sessionId);
  assert(row.resumeConfirmFailedAttempts === 1, "Wrong email did not increment failure count.");
  for (let index = 0; index < 4; index += 1) {
    await service.confirmScreeningResume(storage, { token: rawToken, email: "wrong@example.com" }, 1_700_000_000_000 + index + 1);
  }
  row = await storage.loadSession(saved.sessionId);
  assert(row.resumeConfirmFailedAttempts === 5, "Five failures were not tracked.");
  assert(row.resumeConfirmLockedUntil, "Five failures did not lock the session.");
  const lockedCorrect = await service.confirmScreeningResume(storage, { token: rawToken, email: "lock@example.com" }, 1_700_000_100_000);
  assert(!lockedCorrect.ok && lockedCorrect.session === null, "Locked token resumed with correct email.");
}

async function verifyIpRateLimit() {
  rateLimit.resetResumeRateLimitsForTests();
  const policy = rateLimit.resumeRateLimitPolicies.confirmIp;
  let blocked = false;
  for (let index = 0; index < policy.maxAttempts + 1; index += 1) {
    const result = await rateLimit.checkResumeRateLimit({
      supabase: null,
      scope: policy.scope,
      keyParts: ["203.0.113.20"],
      maxAttempts: policy.maxAttempts,
      windowMs: policy.windowMs,
      now: 1_700_000_000_000
    });
    if (!result.ok) blocked = true;
  }
  assert(blocked, "Confirm IP rate limit did not block repeated attempts.");
}

async function verifyExpiredAndFreshLink(db, storage) {
  const rawToken = security.generateResumeToken();
  const saved = await seedSession(storage, {
    sessionId: "88888888-8888-4888-8888-888888888888",
    rawToken,
    email: "expired@example.com",
    expiresAt: new Date(1_600_000_000_000).toISOString()
  });
  const expired = await service.confirmScreeningResume(storage, { token: rawToken, email: "expired@example.com" }, 1_700_000_000_000);
  assert(!expired.ok, "Expired token resumed.");
  const rowBefore = await one(db, "select answers from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(rowBefore.answers.ownership_scope === "Yes", "Expired token deleted session data.");
  await service.requestFreshScreeningResumeLink(storage, { token: rawToken, email: "expired@example.com" }, 1_700_000_000_000);
  const rowAfter = await one(db, "select resume_token_hash, resume_token_expires_at from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(rowAfter.resume_token_hash !== security.hashResumeToken(rawToken), "Fresh link request did not rotate expired token.");
  assert(Date.parse(rowAfter.resume_token_expires_at) > 1_700_000_000_000, "Fresh link did not set a new expiry.");
}

async function verifyTokenRotation(db, storage) {
  const rawToken = security.generateResumeToken();
  const saved = await seedSession(storage, {
    sessionId: "99999999-9999-4999-8999-999999999999",
    rawToken,
    email: "rotate@example.com"
  });
  const result = await service.confirmScreeningResume(storage, { token: rawToken, email: "rotate@example.com" }, 1_700_000_000_000);
  assert(result.ok && result.resumeUrl, "Successful resume did not return replacement URL.");
  const replacement = new URL(result.resumeUrl).searchParams.get("token");
  assert(replacement && replacement !== rawToken, "Replacement token was not returned.");
  const row = await one(db, "select resume_token_hash, previous_resume_token_hash, previous_resume_token_grace_expires_at from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(row.resume_token_hash === security.hashResumeToken(replacement), "Replacement hash was not persisted.");
  assert(row.previous_resume_token_hash === security.hashResumeToken(rawToken), "Previous token hash was not retained for grace.");
  const oldDuringGrace = await service.confirmScreeningResume(storage, { token: rawToken, email: "rotate@example.com" }, 1_700_000_100_000);
  assert(oldDuringGrace.ok, "Previous token did not work during grace.");

  const rawTokenAfterGrace = security.generateResumeToken();
  await seedSession(storage, {
    sessionId: "99999999-9999-4999-8999-999999999998",
    rawToken: rawTokenAfterGrace,
    email: "rotate2@example.com"
  });
  const first = await service.confirmScreeningResume(storage, { token: rawTokenAfterGrace, email: "rotate2@example.com" }, 1_700_000_000_000);
  assert(first.ok, "Rotation setup failed.");
  const oldAfterGrace = await service.confirmScreeningResume(storage, { token: rawTokenAfterGrace, email: "rotate2@example.com" }, 1_700_000_400_000);
  assert(!oldAfterGrace.ok, "Previous token worked after grace.");
  const replacementAfterGrace = new URL(first.resumeUrl).searchParams.get("token");
  const replacementWorks = await service.confirmScreeningResume(storage, { token: replacementAfterGrace, email: "rotate2@example.com" }, 1_700_000_400_000);
  assert(replacementWorks.ok, "Replacement token did not work after grace.");
}

async function verifyEnumerationResistance(storage) {
  const rawValid = security.generateResumeToken();
  const rawExpired = security.generateResumeToken();
  const rawLocked = security.generateResumeToken();
  await seedSession(storage, { sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", rawToken: rawValid, email: "enum@example.com" });
  await seedSession(storage, { sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", rawToken: rawExpired, email: "enum@example.com", expiresAt: new Date(1_600_000_000_000).toISOString() });
  const locked = await seedSession(storage, { sessionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", rawToken: rawLocked, email: "enum@example.com" });
  await storage.recordResumeConfirmFailure({ sessionId: locked.sessionId, failedAttempts: 5, lockedUntil: new Date(1_700_010_000_000).toISOString(), failedAt: new Date(1_700_000_000_000).toISOString() });

  const failures = [
    await service.confirmScreeningResume(storage, { token: rawValid, email: "wrong@example.com" }, 1_700_000_000_000),
    await service.confirmScreeningResume(storage, { token: "invalid-token", email: "enum@example.com" }, 1_700_000_000_000),
    await service.confirmScreeningResume(storage, { token: rawExpired, email: "enum@example.com" }, 1_700_000_000_000),
    await service.confirmScreeningResume(storage, { token: rawLocked, email: "enum@example.com" }, 1_700_000_000_000)
  ];
  const shapes = failures.map((failure) => JSON.stringify(Object.keys(failure).sort()));
  assert(new Set(shapes).size === 1, "Failure response shapes differ.");
  for (const failure of failures) {
    assert(!failure.ok && failure.message === security.genericResumeFailureMessage && failure.session === null && failure.resumeUrl === null, "Failure response was not generic.");
  }
}

function verifyDiscreetEmail() {
  const rendered = email.renderScreeningResumeEmail({ to: "user@example.com", resumeUrl: "https://example.test/resume?token=abc" });
  const combined = `${rendered.subject}\n${rendered.text}\n${rendered.html}`.toLowerCase();
  for (const banned of ["expungement", "criminal record", "charges", "arrest", "conviction", "court case", "eligibility result", "packet", "payment"]) {
    assert(!combined.includes(banned), `Discreet email includes banned term: ${banned}`);
  }
  assert(rendered.subject === "Your saved progress", "Unexpected discreet email subject.");
  assert(combined.includes("expires in 7 days"), "Discreet email must include expiry.");
  assert(combined.includes("if you did not request this"), "Discreet email must include ignore-if-not-requested copy.");
}

function verifyConsentAndSingleSaveHook() {
  const flow = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
  const saveRoute = read("src/app/api/expungement-ai/screening/save-resume/route.ts");
  assert(flow.includes("only use this email") && flow.includes("send you a link back to your saved progress"), "Consent copy missing.");
  assert(flow.includes("Continue without saving"), "Continue-without-saving path missing.");
  assert((flow.match(/Save progress/g) ?? []).length === 1, "Expected a single visible save-progress affordance.");
  assert(flow.includes("Save your progress"), "Save-progress modal title missing.");
  assert(flow.includes("/api/expungement-ai/screening/save-resume"), "Save hook is not wired to API.");
  assert(saveRoute.includes("checkResumeRateLimit") && saveRoute.includes("resumeRateLimitPolicies.resendEmail"), "Save/send route must rate-limit by IP and email.");
}

async function verifyNoForbiddenPersistence(db) {
  const columns = await db.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'screening_sessions'");
  const columnNames = columns.rows.map((row) => row.column_name.toLowerCase());
  for (const forbidden of ["resultcode", "result_code", "paymentallowed", "payment_allowed", "packetplan", "packet_plan", "resume_token"]) {
    assert(!columnNames.includes(forbidden), `Forbidden column exists: ${forbidden}`);
  }
}

function verifyBoundaryProtection() {
  const protectedFiles = [
    "src/app/briefcase/page.tsx",
    "src/app/expungement-ai/pay/page.tsx",
    "src/app/api/expungement-ai/packet/download/route.ts",
    "src/app/api/expungement-ai/packet/generate/route.ts"
  ].map(read).join("\n");
  assert(protectedFiles.includes("requireConsumerBriefcaseSession") || protectedFiles.includes("getBriefcaseItem"), "Protected surfaces lost account/session boundary.");
  const resumeSources = [
    read("src/app/api/expungement-ai/screening/resume/confirm/route.ts"),
    read("src/lib/expungement-ai/screening-resume-service.ts")
  ].join("\n");
  for (const forbidden of ["stripe", "checkout", "webhook", "packetPlan:", "paymentAllowed:", "resultCode:"]) {
    assert(!resumeSources.includes(forbidden), `Resume source touched forbidden surface: ${forbidden}`);
  }
}

async function seedSession(storage, options) {
  const now = options.now ?? 1_700_000_000_000;
  const answers = options.answers ?? { ownership_scope: "Yes", jurisdiction_scope: "State or local" };
  const session = await persistence.saveScreeningSession(storage, {
    sessionId: options.sessionId,
    jurisdiction: options.jurisdiction ?? "MS",
    answers,
    currentQuestionId: options.currentQuestionId ?? "case_outcome",
    furthestStage: options.furthestStage ?? "pathway_routing",
    status: "in_progress",
    lastDropQuestion: options.currentQuestionId ?? "case_outcome"
  });
  await storage.updateResumeDelivery({
    sessionId: session.sessionId,
    email: options.email,
    emailNormalized: security.normalizeResumeEmail(options.email),
    tokenHash: security.hashResumeToken(options.rawToken),
    tokenExpiresAt: options.expiresAt ?? security.resumeExpiry(now),
    sentAt: new Date(now).toISOString(),
    consentAt: new Date(now).toISOString(),
    consentTextVersion: security.resumeConsentTextVersion
  });
  return storage.loadSession(session.sessionId);
}

function createPgliteResumeStorage(db) {
  return {
    async saveSession(input) {
      const result = await db.query(
        `insert into public.screening_sessions (
          session_id, jurisdiction, answers, current_question_id, furthest_stage, status, last_drop_question
        ) values ($1, $2, $3::jsonb, $4, $5, $6, $7)
        on conflict (session_id) do update set
          jurisdiction = excluded.jurisdiction,
          answers = excluded.answers,
          current_question_id = excluded.current_question_id,
          furthest_stage = excluded.furthest_stage,
          status = excluded.status,
          last_drop_question = excluded.last_drop_question,
          updated_at = now()
        returning *`,
        [input.sessionId ?? crypto.randomUUID(), input.jurisdiction, JSON.stringify(input.answers), input.currentQuestionId, input.furthestStage, input.status, input.lastDropQuestion]
      );
      return rowToSerialized(result.rows[0]);
    },
    async loadSession(sessionId) {
      const result = await db.query("select * from public.screening_sessions where session_id = $1", [sessionId]);
      return result.rows[0] ? rowToSerialized(result.rows[0]) : null;
    },
    async updateResumeDelivery(input) {
      const result = await db.query(
        `update public.screening_sessions set
          resume_email = $2,
          resume_email_normalized = $3,
          resume_token_hash = $4,
          resume_token_expires_at = $5,
          previous_resume_token_hash = null,
          previous_resume_token_grace_expires_at = null,
          resume_sent_at = $6,
          resume_confirm_failed_attempts = 0,
          resume_confirm_locked_until = null,
          resume_last_failed_at = null,
          resume_consent_at = $7,
          resume_consent_text_version = $8,
          updated_at = now()
        where session_id = $1 returning *`,
        [input.sessionId, input.email, input.emailNormalized, input.tokenHash, input.tokenExpiresAt, input.sentAt, input.consentAt, input.consentTextVersion]
      );
      return rowToSerialized(result.rows[0]);
    },
    async findByTokenHash(tokenHash) {
      const result = await db.query(
        "select * from public.screening_sessions where resume_token_hash = $1 or previous_resume_token_hash = $1 limit 1",
        [tokenHash]
      );
      return result.rows[0] ? rowToSerialized(result.rows[0]) : null;
    },
    async recordResumeConfirmFailure(input) {
      await db.query(
        `update public.screening_sessions set
          resume_confirm_failed_attempts = $2,
          resume_confirm_locked_until = $3,
          resume_last_failed_at = $4,
          updated_at = now()
        where session_id = $1`,
        [input.sessionId, input.failedAttempts, input.lockedUntil, input.failedAt]
      );
    },
    async rotateResumeToken(input) {
      const result = await db.query(
        `update public.screening_sessions set
          resume_token_hash = $2,
          resume_token_expires_at = $3,
          resume_token_rotated_at = $6,
          previous_resume_token_hash = $4,
          previous_resume_token_grace_expires_at = $5,
          resume_confirm_failed_attempts = 0,
          resume_confirm_locked_until = null,
          resume_last_failed_at = null,
          status = 'resumed',
          updated_at = now()
        where session_id = $1 returning *`,
        [input.sessionId, input.tokenHash, input.tokenExpiresAt, input.previousTokenHash, input.previousTokenGraceExpiresAt, input.rotatedAt]
      );
      return rowToSerialized(result.rows[0]);
    }
  };
}

function rowToSerialized(row) {
  return {
    sessionId: row.session_id,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    jurisdiction: row.jurisdiction,
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers,
    currentQuestionId: row.current_question_id,
    furthestStage: row.furthest_stage,
    status: row.status,
    lastDropQuestion: row.last_drop_question,
    resumeEmail: row.resume_email,
    resumeEmailNormalized: row.resume_email_normalized,
    resumeTokenHash: row.resume_token_hash,
    resumeTokenExpiresAt: row.resume_token_expires_at,
    resumeTokenRotatedAt: row.resume_token_rotated_at,
    previousResumeTokenHash: row.previous_resume_token_hash,
    previousResumeTokenGraceExpiresAt: row.previous_resume_token_grace_expires_at,
    resumeSentAt: row.resume_sent_at,
    resumeConfirmFailedAttempts: row.resume_confirm_failed_attempts ?? 0,
    resumeConfirmLockedUntil: row.resume_confirm_locked_until,
    resumeLastFailedAt: row.resume_last_failed_at,
    resumeConsentAt: row.resume_consent_at,
    resumeConsentTextVersion: row.resume_consent_text_version
  };
}

function representativeAnswers(profile) {
  const answers = {};
  for (const question of profile.questions) {
    if (question.contextOnly) continue;
    answers[question.id] = answerForQuestion(question);
  }
  return answers;
}

function answerForQuestion(question) {
  switch (question.id) {
    case "ownership_scope":
      return "Yes";
    case "jurisdiction_scope":
      return "State or local";
    case "case_outcome":
      return question.options?.find((option) => option.toLowerCase().includes("misdemeanor")) ?? question.options?.[0] ?? "Convicted of a misdemeanor";
    case "sentence_completion_date":
    case "record_documents":
      return "Yes";
    case "pending_cases":
    case "pardon_status":
      return "No";
    case "state_exclusion_categories":
      return [question.options?.find((option) => option.toLowerCase().includes("none")) ?? "None of these"];
    case "disposition_date":
      return { value: "2010-01-15", unknown: false };
    case "age_at_offense":
      return { value: "30", unknown: false };
    case "county_or_filing_location":
      return "Cook County";
    case "case_identifier":
      return "CR-2010-123";
    case "charge":
      return "Misdemeanor trespass";
    case "court":
      return "County court";
    default:
      return question.options?.[0] ?? "Sample answer";
  }
}

function evaluate(profile, uiAnswers, matterId) {
  return evaluateScreening({
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId,
    answers: toScreeningAnswers(uiAnswers)
  });
}

function assertEvaluationEqual(actual, expected, message) {
  assert(actual.resultCode === expected.resultCode, `${message}: resultCode differed.`);
  assert(actual.paymentAllowed === expected.paymentAllowed, `${message}: paymentAllowed differed.`);
  assertDeepEqual(actual.packetPlan ?? null, expected.packetPlan ?? null, `${message}: packetPlan differed.`);
}

async function one(db, sql, params) {
  const result = await db.query(sql, params);
  assert(result.rows.length === 1, `Expected one row for ${sql}`);
  return result.rows[0];
}

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(sortForCompare(actual));
  const expectedJson = JSON.stringify(sortForCompare(expected));
  assert(actualJson === expectedJson, `${message}\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
}

function sortForCompare(value) {
  if (Array.isArray(value)) return value.map(sortForCompare);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortForCompare(item)]));
  }
  return value;
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) return cached.exports;
  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
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
  if (request.startsWith("@/")) return resolveExistingModuleFile(path.join(rootDir, "src", request.slice(2)));
  if (request.startsWith(".")) return resolveExistingModuleFile(path.resolve(basedir, request));
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
