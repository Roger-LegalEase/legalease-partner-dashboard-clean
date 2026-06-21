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

const migrationPath = "supabase/phase-32-expungement-screening-sessions.sql";
const forbiddenResultKeys = ["resultCode", "paymentAllowed", "packetPlan"];

const persistence = loadTsModule(path.join(rootDir, "src/lib/expungement-ai/screening-session-persistence.ts"));
const { toScreeningAnswers } = loadTsModule(path.join(rootDir, "src/components/expungement-ai/screening/answers.ts"));
const { evaluateScreening } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/evaluator.ts"));
const { getProfileByJurisdiction } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/profile-registry.ts"));
const { projectPublicProfile } = loadTsModule(path.join(rootDir, "src/lib/rcap-engine/public-profile-projection.ts"));

try {
  assert(fs.existsSync(path.join(rootDir, migrationPath)), "Screening session migration file is missing.");

  const db = new PGlite();
  await db.exec(fs.readFileSync(path.join(rootDir, migrationPath), "utf8"));
  const storage = createPgliteScreeningSessionStorage(db);

  await verifyRoundTripIdentity(storage);
  await verifyCompleteResumeEqualsFresh(storage);
  await verifyPartialResumeEqualsFresh(storage);
  await verifyNoResultPersisted(db, storage);
  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
}

if (failures.length) {
  console.error("Expungement.ai screening session persistence verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai screening session persistence verification passed.");
console.log("Real storage: migration executed in an isolated PGlite PostgreSQL database with jsonb answers.");
console.log("Round-trip identity covered string, number/range, date, yes/no/unsure, prefer-not-to-say, multi-select, unknown sentinel, null, and absent optional answers.");
console.log("Complete and partial resumed sessions re-evaluated through evaluateScreening with identical resultCode, paymentAllowed, and packetPlan.");
console.log("No resultCode, paymentAllowed, or packetPlan columns or answer values were persisted.");

async function verifyRoundTripIdentity(storage) {
  const originalAnswers = {
    text_answer: "simple text",
    number_range_answer: { value: "18", unknown: false },
    primitive_number_answer: 42,
    date_answer: { value: "2010-01-15", unknown: false },
    yes_no_unsure_answer: "I am not sure",
    prefer_not_answer: "Prefer not to say",
    multi_select_answer: ["Dismissed", "No pending case", "None of these"],
    not_sure_sentinel_answer: { unknown: true },
    explicit_null_optional_answer: null
  };

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "11111111-1111-4111-8111-111111111111",
    jurisdiction: "MS",
    answers: originalAnswers,
    currentQuestionId: "case_identifier",
    furthestStage: "case_details",
    status: "in_progress",
    lastDropQuestion: "case_identifier"
  });
  const loaded = await persistence.loadScreeningSession(storage, saved.sessionId);

  assert(loaded, "Round-trip session failed to load.");
  assertDeepEqual(loaded.answers, originalAnswers, "Loaded answers must deep-equal original answers.");
  assert(!("absent_optional_answer" in loaded.answers), "Absent optional answers must remain absent after load.");
}

async function verifyCompleteResumeEqualsFresh(storage) {
  const profile = mustProfile("MS");
  const publicProfile = projectPublicProfile(profile);
  const answers = representativeAnswers(publicProfile);
  const fresh = evaluate(profile, answers, "matter-complete");

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "22222222-2222-4222-8222-222222222222",
    jurisdiction: profile.jurisdiction.code,
    answers,
    currentQuestionId: publicProfile.questions.at(-1)?.id ?? null,
    furthestStage: publicProfile.questions.at(-1)?.stage ?? null,
    status: "completed",
    lastDropQuestion: null
  });
  const loaded = await persistence.loadScreeningSession(storage, saved.sessionId);
  assert(loaded, "Complete session failed to load.");

  const resumed = evaluate(profile, loaded.answers, "matter-complete");
  assertEvaluationEqual(resumed, fresh, "Complete resumed evaluation must match fresh evaluation.");
}

async function verifyPartialResumeEqualsFresh(storage) {
  const profile = mustProfile("IL");
  const publicProfile = projectPublicProfile(profile);
  const completeAnswers = representativeAnswers(publicProfile);
  const resumeQuestion = publicProfile.questions.find((question) => question.stage === "case_details");
  assert(resumeQuestion, "Representative profile must include a case_details resume question.");

  const partialAnswers = {};
  for (const question of publicProfile.questions) {
    if (question.id === resumeQuestion.id) break;
    if (question.id in completeAnswers) partialAnswers[question.id] = completeAnswers[question.id];
  }

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "33333333-3333-4333-8333-333333333333",
    jurisdiction: profile.jurisdiction.code,
    answers: partialAnswers,
    currentQuestionId: resumeQuestion.id,
    furthestStage: resumeQuestion.stage,
    status: "in_progress",
    lastDropQuestion: resumeQuestion.id
  });
  const loaded = await persistence.loadScreeningSession(storage, saved.sessionId);
  assert(loaded, "Partial session failed to load.");
  assert(loaded.currentQuestionId === resumeQuestion.id, "Partial session current_question_id did not restore.");
  assert(loaded.furthestStage === resumeQuestion.stage, "Partial session furthest_stage did not restore.");

  const continuedAnswers = { ...loaded.answers };
  for (const [questionId, value] of Object.entries(completeAnswers)) {
    if (!(questionId in continuedAnswers)) continuedAnswers[questionId] = value;
  }

  const fresh = evaluate(profile, completeAnswers, "matter-partial");
  const resumed = evaluate(profile, continuedAnswers, "matter-partial");
  assertEvaluationEqual(resumed, fresh, "Partial continued evaluation must match fresh evaluation.");
}

async function verifyNoResultPersisted(db, storage) {
  const columns = await db.query(
    "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'screening_sessions' order by ordinal_position"
  );
  const columnNames = columns.rows.map((row) => row.column_name);
  for (const forbidden of forbiddenResultKeys) {
    assert(!columnNames.includes(forbidden), `Forbidden result column exists: ${forbidden}`);
    assert(!columnNames.includes(toSnakeCase(forbidden)), `Forbidden result column exists: ${toSnakeCase(forbidden)}`);
  }

  const saved = await persistence.saveScreeningSession(storage, {
    sessionId: "44444444-4444-4444-8444-444444444444",
    jurisdiction: "MS",
    answers: { charge: "trespass", disposition_date: { value: "2010-01-15", unknown: false } },
    currentQuestionId: "charge",
    furthestStage: "case_details",
    status: "in_progress",
    lastDropQuestion: "charge"
  });
  const row = await db.query("select * from public.screening_sessions where session_id = $1", [saved.sessionId]);
  assert(row.rows.length === 1, "No-result-persisted row was not stored.");
  for (const forbidden of forbiddenResultKeys) {
    assert(!(forbidden in row.rows[0]), `Forbidden result key exists on row: ${forbidden}`);
    assert(!jsonContainsKey(row.rows[0].answers, forbidden), `Forbidden result key exists inside answers: ${forbidden}`);
  }
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
      return optionMatching(question, ["misdemeanor", "convicted"], "Convicted of a misdemeanor");
    case "sentence_completion_date":
    case "financial_obligations":
    case "record_documents":
    case "criminal_history":
      return "Yes";
    case "pending_cases":
    case "prior_relief":
    case "pardon_status":
    case "trafficking_status":
    case "identity_error":
      return "No";
    case "state_exclusion_categories":
      return [optionMatching(question, ["none of these", "none"], "None of these")];
    case "disposition_date":
    case "arrest_date":
      return { value: "2010-01-15", unknown: false };
    case "age_at_offense":
      return { value: "30", unknown: false };
    case "county":
    case "county_or_filing_location":
      return "Hinds County";
    case "case_identifier":
    case "case_number":
      return "CR-2010-123";
    case "charge":
      return "Misdemeanor trespass";
    case "court":
      return "County court";
    default:
      return defaultAnswerForType(question);
  }
}

function defaultAnswerForType(question) {
  switch (question.type) {
    case "single_choice":
      return question.options?.[0] ?? "Yes";
    case "multi_select":
      return [question.options?.[0] ?? "None of these"];
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say":
      return "No";
    case "date_or_unknown":
      return { value: "2010-01-15", unknown: false };
    case "number_or_range":
      return { value: "30", unknown: false };
    case "text":
      return "Sample answer";
    case "text_or_unknown":
      return { value: "Sample answer", unknown: false };
    default:
      throw new Error(`No representative answer for question type ${question.type} (${question.id}).`);
  }
}

function optionMatching(question, needles, fallback) {
  const options = question.options ?? [];
  const match = options.find((option) => needles.every((needle) => option.toLowerCase().includes(needle)));
  return match ?? options.find((option) => option.toLowerCase().includes(needles[0])) ?? fallback;
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
  assert(actual.resultCode === expected.resultCode, `${message}: resultCode differed (${actual.resultCode} !== ${expected.resultCode}).`);
  assert(actual.paymentAllowed === expected.paymentAllowed, `${message}: paymentAllowed differed.`);
  assertDeepEqual(actual.packetPlan ?? null, expected.packetPlan ?? null, `${message}: packetPlan differed.`);
}

function mustProfile(jurisdiction) {
  const profile = getProfileByJurisdiction(jurisdiction);
  assert(profile, `Missing profile for ${jurisdiction}.`);
  return profile;
}

function createPgliteScreeningSessionStorage(db) {
  return {
    async saveSession(input) {
      const result = await db.query(
      `insert into public.screening_sessions (
        session_id,
        jurisdiction,
        answers,
        current_question_id,
        furthest_stage,
        status,
        last_drop_question
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
      [
        input.sessionId ?? randomUuid(),
        input.jurisdiction,
        JSON.stringify(input.answers),
        input.currentQuestionId,
        input.furthestStage,
        input.status,
        input.lastDropQuestion
      ]
      );
      return rowToSerializedSession(result.rows[0]);
    },

    async loadSession(sessionId) {
      const result = await db.query("select * from public.screening_sessions where session_id = $1", [sessionId]);
      return result.rows[0] ? rowToSerializedSession(result.rows[0]) : null;
    }
  };
}

function rowToSerializedSession(row) {
  return {
    sessionId: row.session_id,
    createdAt: isoString(row.created_at),
    updatedAt: isoString(row.updated_at),
    jurisdiction: row.jurisdiction,
    answers: typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers,
    currentQuestionId: row.current_question_id,
    furthestStage: row.furthest_stage,
    status: row.status,
    lastDropQuestion: row.last_drop_question
  };
}

function isoString(value) {
  return value instanceof Date ? value.toISOString() : String(value);
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

function jsonContainsKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => jsonContainsKey(item, key));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([candidate, item]) => candidate === key || jsonContainsKey(item, key));
  }
  return false;
}

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function randomUuid() {
  return crypto.randomUUID();
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
