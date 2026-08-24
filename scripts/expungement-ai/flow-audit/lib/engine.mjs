// Shared harness for the Expungement.ai flow audit.
//
// One job: give every audit script the same deterministic view of the runtime
// flow authority — the compiled engine profiles, the public projection served to
// the browser, the consumer screen derivation, and the authoritative evaluator.
//
// It imports the REAL product modules through the repository's existing
// `scripts/lib/ts-esm-loader.mjs`. Nothing here re-implements a product rule; a
// re-implementation would audit itself instead of the product.
//
// The audit reads. It never writes into src/, never mutates a profile, and never
// calls a mutating endpoint.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Pinned evaluation clock. Waiting-period maths must not drift with wall time. */
export const EVALUATOR_TODAY = "2026-07-01";
process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? EVALUATOR_TODAY;

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
process.chdir(ROOT_DIR);
register("./scripts/lib/ts-esm-loader.mjs", new URL("file://" + path.join(ROOT_DIR, "/")));

export const read = (p) => fs.readFileSync(path.join(ROOT_DIR, p), "utf8");
export const readJson = (p) => JSON.parse(read(p));
export const exists = (p) => fs.existsSync(path.join(ROOT_DIR, p));
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const stableJson = (value) => JSON.stringify(value, null, 2) + "\n";

export function writeArtifact(relativePath, value) {
  const target = path.join(ROOT_DIR, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const text = typeof value === "string" ? value : stableJson(value);
  fs.writeFileSync(target, text);
  return { path: relativePath, bytes: Buffer.byteLength(text), sha256: sha256(text) };
}

export function gitSha(ref = "HEAD") {
  return execFileSync("git", ["rev-parse", ref], { cwd: ROOT_DIR, encoding: "utf8" }).trim();
}

/* ------------------------------------------------------------------ */
/* Product modules (the runtime authority, imported not copied)        */
/* ------------------------------------------------------------------ */

const registry = await import(path.join(ROOT_DIR, "src/lib/rcap-engine/profile-registry.ts"));
const projection = await import(path.join(ROOT_DIR, "src/lib/rcap-engine/public-profile-projection.ts"));
const screensModule = await import(path.join(ROOT_DIR, "src/components/expungement-ai/screening/screens.ts"));
const answersModule = await import(path.join(ROOT_DIR, "src/components/expungement-ai/screening/answers.ts"));
const authoritative = await import(path.join(ROOT_DIR, "src/lib/expungement-ai/authoritative-screening-result.ts"));
const planner = await import(path.join(ROOT_DIR, "src/lib/rcap-engine/packet-planner.ts"));

export const getProfileByJurisdiction = registry.getProfileByJurisdiction;
export const getAllJurisdictionProfiles = registry.getAllJurisdictionProfiles;
export const normalizeJurisdictionCode = registry.normalizeJurisdictionCode;
export const projectPublicProfile = projection.projectPublicProfile;
export const deriveScreens = screensModule.deriveScreens;
export const blocksContinue = answersModule.blocksContinue;
export const evaluateAuthoritativeScreeningResult = authoritative.evaluateAuthoritativeScreeningResult;
export const packetPlanForPathway = planner.packetPlanForPathway;

/* ------------------------------------------------------------------ */
/* Deterministic synthetic participant                                 */
/* ------------------------------------------------------------------ */

/**
 * The pinned "clear record" seed. Identical to the constant the repository's own
 * `scripts/generate-rcap-public-witness-answer-sets.mjs` uses, so this audit and
 * the existing witness ledger describe the same participant rather than two.
 *
 * Synthetic only. No value here is, or resembles, a real participant fact.
 */
export const CLEAR_RECORD = Object.freeze({
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  state_exclusion_categories: ["None of these"],
  pending_cases: "No",
  new_convictions_during_waiting_period: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  court_requirements_completed: "yes",
  special_preconditions_confirmed: "Yes",
  trafficking_status: "No",
  pardon_status: "No",
  record_documents: "Yes",
  resolved_timing_bucket: "gt_10_years"
});

export const ANSWER_RULE = Object.freeze({
  clearRecordConstant: "answers pinned in CLEAR_RECORD win for their question id",
  multiSelect: "the option matching /^none/i, else the first option",
  singleSelect: "the first option matching /^(no\\b|none|yes)/i, else the first option",
  dateOrUnknown: "2012-06-01",
  numberOrRange: "30",
  yesNo: "Yes",
  fallback: "unknown"
});

/** Every question object reachable anywhere in the public profile payload. */
export function questionIndex(publicProfile) {
  const index = new Map();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label)) {
      if (!index.has(node.id)) index.set(node.id, node);
    }
    Object.values(node).forEach(walk);
  })(publicProfile);
  return index;
}

export function answerFor(question, id, overrides = {}) {
  if (overrides[id] !== undefined) return overrides[id];
  if (CLEAR_RECORD[id] !== undefined) return CLEAR_RECORD[id];
  if (!question) return "No";
  if (question.options?.length) {
    if (question.type === "multi_select") {
      return [question.options.find((o) => /^none/i.test(o)) ?? question.options[0]];
    }
    return question.options.find((o) => /^(no\b|none|yes)/i.test(o)) ?? question.options[0];
  }
  if (question.type === "date_or_unknown") return "2012-06-01";
  if (question.type === "number_or_range") return "30";
  if (typeof question.type === "string" && question.type.startsWith("yes_no")) return "Yes";
  return "unknown";
}

/**
 * Drive one synthetic participant to a terminal evaluation, keeping the whole
 * exchange. Mirrors the convergence loop the repository's witness generator uses
 * so a fixture produced here replays identically there.
 */
export function converge({ jurisdiction, profile, questions, seedAnswers, overrides = {}, maxRounds = 24 }) {
  const answers = { ...seedAnswers };
  const transcript = [];
  for (let round = 0; round < maxRounds; round += 1) {
    let evaluation;
    let selectedTrackId = null;
    try {
      const outcome = evaluateAuthoritativeScreeningResult({
        jurisdiction,
        profileVersion: profile.profileVersion,
        matterId: "expai-flow-audit",
        answers
      });
      evaluation = outcome.evaluation;
      selectedTrackId = outcome.selectedTrackId ?? null;
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) {
        return { answers, transcript, evaluation: null, selectedTrackId: null, error: String(error?.message ?? error) };
      }
      for (const id of error.invalidQuestionIds) delete answers[id];
      transcript.push({ round, droppedAsNotEvaluatorQuestions: [...error.invalidQuestionIds].sort() });
      continue;
    }
    const missing = [...(evaluation.missingQuestionIds ?? [])].sort();
    if (missing.length === 0) return { answers, transcript, evaluation, selectedTrackId, error: null };
    const supplied = {};
    for (const id of missing) {
      answers[id] = answerFor(questions.get(id), id, overrides);
      supplied[id] = answers[id];
    }
    transcript.push({ round, requested: missing, supplied });
  }
  return { answers, transcript, evaluation: null, selectedTrackId: null, error: `did not settle in ${maxRounds} rounds` };
}

/** Sorted-key object, so every emitted artifact is byte-stable. */
export function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sortObject(v)]));
}
