import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

/**
 * The reviewed screening-parity delta mechanism.
 *
 * The parity verifier's guarantee is that participant-facing screening values do
 * not drift from `main` unnoticed. A reviewed change still has to pass through
 * something, and the wrong shape for that something is a waiver list — a set of
 * failures the verifier agrees to ignore. Ignoring a failure means the verifier
 * stops describing the expected result, and everything that failure was standing
 * in front of goes unchecked with it.
 *
 * So this does the opposite. A record here is APPLIED to the baseline to build
 * the exact shape the tree is expected to have, and the verifier's ordinary
 * strict comparison then runs against that. Nothing is skipped. A second added
 * question, a reordered question, a reworded prompt, a question in a different
 * stage or a different jurisdiction all still fail, because the authorized
 * baseline says precisely what should be there and they are not it.
 *
 * Fail-closed properties, in order of how they are likely to be tested:
 *
 *   * Unknown keys are rejected, at every level. Widening scope cannot be done
 *     by adding a field; it requires editing this schema and its mutation tests.
 *   * No field accepts a wildcard, a glob, a prefix or a path traversal. Paths
 *     are exact and are compared as whole strings.
 *   * Every authorized path is pinned by content hash, so the approval expires
 *     the moment the bytes it approved change.
 *   * The added question is pinned by its own canonical hash, per projection —
 *     the compiled profile and the aggregate carry different shapes of the same
 *     question and each is pinned separately.
 *   * A malformed record throws. An absent record yields no deltas, which leaves
 *     the parity comparison strict and therefore red for any real change.
 *   * A record that does not match the tree fails. A stale approval must not
 *     quietly pass once the thing it approved is gone.
 */

export const APPROVED_DELTAS_PATH = "data/expungement-ai/screening-parity-approved-deltas.json";

const DELTA_KEYS = new Set([
  "id",
  "jurisdiction",
  "questionId",
  "questionType",
  "pathwayId",
  "flowStageId",
  "insertion",
  "beforeQuestionCount",
  "afterQuestionCount",
  "statutoryAuthority",
  "purpose",
  "routeBehavior",
  "authorization",
  "supersedesApproval",
  "beforeAfterEvidence",
  "authorizedPaths",
  "authorizedSha256",
  "originallyApprovedSha256",
  "supersededSha256",
  "projectionsNote",
  "projections"
]);

const AUTHORIZATION_KEYS = new Set(["authorizedBy", "authorizedOn", "statement", "doesNotAuthorize"]);
const SUPERSEDES_APPROVAL_KEYS = new Set(["id", "authorizedBy", "authorizedOn"]);
const BEFORE_AFTER_EVIDENCE_KEYS = new Set([
  "beforeRef",
  "afterRef",
  "behaviorBefore",
  "behaviorAfter",
  "beforeSha256",
  "afterSha256",
  "behavioralProof"
]);
const SUPERSEDED_KEYS = new Set(["path", "sha256", "supersededOn", "reason", "behaviouralProof", "repinnedTo"]);
/**
 * `repinnedTo` is optional and is what makes a supersession move the live pin.
 *
 * A supersession without it is pure history: the hash was the pin once, is not
 * now, and the entry records why. With it, the entry also says which hash the
 * pin moved TO, and `authorizedRuntimeHash` walks those forward after the
 * runtime re-authorization chain.
 *
 * The distinction exists because a re-authorization and a re-pin are different
 * acts. A re-authorization is signed: it says a person approved a specific
 * runtime behaviour change, and its `newSha256` names the bytes they approved.
 * A re-pin is not signed and authorizes nothing: it says a pinned file changed
 * for an unrelated reason and the approved behaviour still holds over the new
 * bytes, which is why every entry must cite a behavioural proof that runs.
 *
 * Editing a re-authorization's `newSha256` to absorb a later unrelated edit
 * would put a person's name on bytes they never saw. This is the mechanism that
 * makes that unnecessary.
 */
const REPIN_KEY = "repinnedTo";
const OPTIONAL_DELTA_KEY = "supersededSha256";
const PROJECTION_KEYS = new Set([
  "path",
  "jurisdictionKey",
  "beforeQuestionCount",
  "afterQuestionCount",
  "flowStageChange",
  "pathwayChange",
  "beforePathwayCount",
  "afterPathwayCount",
  "addedQuestionSha256"
]);

/**
 * How the delta touches this projection's pathway list.
 *
 *   * `add_one` — the approved pathway, and only it, is added.
 *   * `none` — this shape carries no pathways, so the list must stay absent or
 *     identical.
 *
 * Without this the recorded pathway id would be documentation rather than a
 * constraint, and a delta approved for one pathway would silently cover another.
 */
const PATHWAY_CHANGES = new Set(["add_one", "none"]);

/**
 * How the delta touches this projection's flow stages.
 *
 *   * `append_question_id` — the stages list questions, and the approved change
 *     appends the new id to exactly one named stage.
 *   * `none` — the stages carry no question ids in this shape (the aggregate
 *     lists stage order and screen type only), so the approved change must
 *     leave them byte-identical.
 *
 * There is deliberately no "ignore" value.
 */
const FLOW_STAGE_CHANGES = new Set(["append_question_id", "none"]);

const ROOT_KEYS = new Set(["schemaVersion", "note", "runtimeReauthorizations", "deltas"]);
const RUNTIME_REAUTHORIZATION_KEYS = new Set([
  "id",
  "deltaId",
  "path",
  "priorSha256",
  "newSha256",
  "proofPath",
  "proofSha256",
  "authorizedBy",
  "authorizedOn",
  "scope",
  "environment",
  "statement",
  "doesNotAuthorize",
  "proofRevisions"
]);
const RUNTIME_REAUTHORIZATION_REVISION_KEYS = new Set(["commit", "date", "author", "linesAdded", "linesRemoved", "sha256", "reason"]);
const RUNTIME_REAUTHORIZATION_AUTHORIZER = "Roger Roman via the controlling 2026-08-26 targeted fine-tune directive";
const RUNTIME_REAUTHORIZATION_PATH = "src/lib/rcap-engine/public-profile-projection.ts";
const RUNTIME_REAUTHORIZATION_PRIOR_SHA256 = "30a6360e99e93895757604fcdefa7a59dac94b78e1a622ea59112e6ffa78d8e9";
const RUNTIME_REAUTHORIZATION_NEW_SHA256 = "c744aa842bcf24ec943d6f1238a57726ac682f24802165ab7dd3591bcd98be73";
const RUNTIME_REAUTHORIZATION_PROOF_PATH = "scripts/verify-screening-verification-finetune.mjs";
/**
 * The proof as it stands, not as it was first approved.
 *
 * The authorization is dated 2026-08-26 and the check hashes the proof file
 * live, so any later edit to the proof breaks it — which is the point: an
 * approval that names a proof must name the proof that exists. What was missing
 * was a way to move the hash honestly. On 2026-08-27 the proof gained 82 lines
 * of assertions and lost none, and nothing re-recorded that, so the suite failed
 * a day later on an approval nobody had withdrawn.
 *
 * Each move is now recorded in the record's `proofRevisions`, and a revision is
 * only accepted if it removes nothing: a proof may be strengthened under a
 * standing approval, never weakened. Weakening it needs a new authorization.
 */
const RUNTIME_REAUTHORIZATION_PROOF_SHA256 = "74624c8464e40e02c272b967ebeba42452681d163ea4be6d013af01778b7759d";
const RUNTIME_REAUTHORIZATION_SCOPE = "post_projection_question_lifecycle_validation_only";
const RUNTIME_REAUTHORIZATION_ENVIRONMENT = "repository_non_production_only";
const RUNTIME_REAUTHORIZATION_EXCLUSIONS = [
  "legal_behavior",
  "date_behavior",
  "question_changes",
  "evaluator_changes",
  "migration",
  "deployment",
  "staging",
  "production",
  "launch"
];

const SHA256 = /^[0-9a-f]{64}$/;
const JURISDICTION = /^[A-Z]{2}$/;
const QUESTION_ID = /^[a-z][a-z0-9_]*$/;
const PATHWAY_ID = /^[a-z0-9][a-z0-9-]*$/;
const FLOW_STAGE_ID = /^[a-z][a-z0-9_]*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Deterministic, key-sorted serialization. Pins a value, not a formatting. */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function reject(message) {
  throw new Error(`screening parity approval is malformed: ${message}`);
}

/**
 * A proof may be strengthened under a standing approval; it may not be weakened.
 *
 * Every hash this approval has carried since it was signed must be listed, in
 * order, ending at the hash the approval names today. A revision that removes
 * lines is rejected here rather than accepted with a note, because "we also
 * deleted some assertions" is precisely the change that needs a person.
 */
function validateProofRevisions(reauthorization) {
  const revisions = reauthorization.proofRevisions;
  if (revisions === undefined) return;
  if (!Array.isArray(revisions) || revisions.length === 0) {
    reject(`${reauthorization.id}.proofRevisions is not a non-empty array`);
  }
  revisions.forEach((revision, index) => {
    const where = `${reauthorization.id}.proofRevisions[${index}]`;
    requireExactKeys(revision, RUNTIME_REAUTHORIZATION_REVISION_KEYS, where);
    requireString(revision.commit, /^[0-9a-f]{7,40}$/, `${where}.commit`);
    requireString(revision.date, ISO_DATE, `${where}.date`);
    requireString(revision.sha256, SHA256, `${where}.sha256`);
    if (typeof revision.author !== "string" || revision.author.length === 0) reject(`${where}.author is missing`);
    if (typeof revision.reason !== "string" || revision.reason.length === 0) reject(`${where}.reason is missing`);
    if (!Number.isInteger(revision.linesAdded) || revision.linesAdded < 0) reject(`${where}.linesAdded is not a count`);
    if (!Number.isInteger(revision.linesRemoved) || revision.linesRemoved < 0) reject(`${where}.linesRemoved is not a count`);
    if (revision.linesRemoved > 0) {
      reject(`${where} removes ${revision.linesRemoved} line(s) from the proof; weakening a proof needs a new authorization, not a revision`);
    }
    if (revision.linesAdded === 0) reject(`${where} records no change to the proof`);
    if (revision.date < reauthorization.authorizedOn) {
      reject(`${where} is dated ${revision.date}, before the authorization it revises`);
    }
  });
  const last = revisions[revisions.length - 1];
  if (last.sha256 !== reauthorization.proofSha256) {
    reject(`${reauthorization.id}.proofSha256 is not the hash its last proof revision produced`);
  }
}

function requireExactKeys(object, allowed, where) {
  if (object === null || typeof object !== "object" || Array.isArray(object)) reject(`${where} is not an object`);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) reject(`${where} carries the unrecognised key "${key}"`);
  }
}

/**
 * Exact, whole-string, repo-relative. A prefix or a glob here would be the
 * widening this mechanism exists to prevent, so it is rejected rather than
 * normalised.
 */
function requireExactPath(value, where) {
  if (typeof value !== "string" || value.length === 0) reject(`${where} is not a path`);
  if (/[*?\[\]]/.test(value)) reject(`${where} contains a wildcard: ${value}`);
  if (value.includes("..")) reject(`${where} contains a path traversal: ${value}`);
  if (value.startsWith("/") || value.endsWith("/")) reject(`${where} is not a repo-relative file path: ${value}`);
  if (!/\.(json|ts|tsx|mjs)$/.test(value)) reject(`${where} does not name a file: ${value}`);
}

function requireString(value, pattern, where) {
  if (typeof value !== "string" || !pattern.test(value)) reject(`${where} is not in the required form`);
}

function requireCount(value, where) {
  if (!Number.isInteger(value) || value < 0) reject(`${where} is not a non-negative integer`);
}

/**
 * @returns {{deltas: Array<object>, present: boolean}} `present` is false when no
 *   record file exists at all, which leaves parity strict rather than open.
 */
export function loadApprovedParityDeltas({ rootDir = process.cwd(), recordPath = APPROVED_DELTAS_PATH } = {}) {
  const absolute = path.join(rootDir, recordPath);
  if (!fs.existsSync(absolute)) return { deltas: [], present: false };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    reject(`${recordPath} is not valid JSON (${error.message})`);
  }

  requireExactKeys(parsed, ROOT_KEYS, recordPath);
  if (parsed.schemaVersion !== 1) reject(`unsupported schemaVersion ${JSON.stringify(parsed.schemaVersion)}`);
  if (typeof parsed.note !== "string" || parsed.note.length === 0) reject("note is missing");
  if (!Array.isArray(parsed.runtimeReauthorizations)) reject("runtimeReauthorizations is not an array");
  if (!Array.isArray(parsed.deltas) || parsed.deltas.length === 0) reject("deltas is not a non-empty array");

  const seen = new Set();
  const deltaById = new Map(parsed.deltas.map((delta) => [delta.id, delta]));
  const seenRuntimeReauthorizations = new Set();
  for (const reauthorization of parsed.runtimeReauthorizations) {
    validateRuntimeReauthorization(reauthorization, deltaById, rootDir);
    if (seenRuntimeReauthorizations.has(reauthorization.id)) {
      reject(`duplicate runtime reauthorization id "${reauthorization.id}"`);
    }
    seenRuntimeReauthorizations.add(reauthorization.id);
  }
  for (const delta of parsed.deltas) {
    validateDelta(delta, rootDir, parsed.runtimeReauthorizations);
    if (seen.has(delta.id)) reject(`duplicate delta id "${delta.id}"`);
    seen.add(delta.id);
  }

  return {
    deltas: parsed.deltas,
    runtimeReauthorizations: parsed.runtimeReauthorizations,
    present: true
  };
}

function validateRuntimeReauthorization(reauthorization, deltaById, rootDir) {
  requireExactKeys(reauthorization, RUNTIME_REAUTHORIZATION_KEYS, "a runtime reauthorization");
  for (const key of RUNTIME_REAUTHORIZATION_KEYS) {
    if (!(key in reauthorization)) reject(`a runtime reauthorization is missing "${key}"`);
  }
  if (typeof reauthorization.id !== "string" || reauthorization.id.length === 0) {
    reject("runtime reauthorization id is missing");
  }
  const delta = deltaById.get(reauthorization.deltaId);
  if (!delta) reject(`${reauthorization.id} names unknown delta ${JSON.stringify(reauthorization.deltaId)}`);
  requireExactPath(reauthorization.path, `${reauthorization.id}.path`);
  if (reauthorization.path !== RUNTIME_REAUTHORIZATION_PATH) {
    reject(`${reauthorization.id}.path is not the exact public-profile projection path`);
  }
  if (!delta.authorizedPaths?.includes(reauthorization.path)) {
    reject(`${reauthorization.id} names ${reauthorization.path}, which ${reauthorization.deltaId} does not authorize`);
  }
  requireString(reauthorization.priorSha256, SHA256, `${reauthorization.id}.priorSha256`);
  requireString(reauthorization.newSha256, SHA256, `${reauthorization.id}.newSha256`);
  if (reauthorization.priorSha256 !== RUNTIME_REAUTHORIZATION_PRIOR_SHA256) {
    reject(`${reauthorization.id}.priorSha256 is not the exact superseded projection hash`);
  }
  if (reauthorization.newSha256 !== RUNTIME_REAUTHORIZATION_NEW_SHA256) {
    reject(`${reauthorization.id}.newSha256 is not the exact lifecycle-validation projection hash`);
  }
  if (reauthorization.priorSha256 === reauthorization.newSha256) {
    reject(`${reauthorization.id} does not move to new bytes`);
  }
  requireExactPath(reauthorization.proofPath, `${reauthorization.id}.proofPath`);
  requireString(reauthorization.proofSha256, SHA256, `${reauthorization.id}.proofSha256`);
  if (reauthorization.proofPath !== RUNTIME_REAUTHORIZATION_PROOF_PATH) {
    reject(`${reauthorization.id}.proofPath is not the exact lifecycle-validation proof path`);
  }
  if (reauthorization.proofSha256 !== RUNTIME_REAUTHORIZATION_PROOF_SHA256) {
    reject(`${reauthorization.id}.proofSha256 is not the exact lifecycle-validation proof hash`);
  }
  const proof = path.join(rootDir, reauthorization.proofPath);
  if (!fs.existsSync(proof)) reject(`${reauthorization.id} cites missing proof ${reauthorization.proofPath}`);
  const actualProofSha = sha256(fs.readFileSync(proof));
  if (actualProofSha !== reauthorization.proofSha256) {
    reject(`${reauthorization.id} proof ${reauthorization.proofPath} hashes to ${actualProofSha}, not ${reauthorization.proofSha256}`);
  }
  validateProofRevisions(reauthorization);
  if (reauthorization.authorizedBy !== RUNTIME_REAUTHORIZATION_AUTHORIZER) {
    reject(`${reauthorization.id}.authorizedBy is not the exact controlling fine-tune authority`);
  }
  requireString(reauthorization.authorizedOn, ISO_DATE, `${reauthorization.id}.authorizedOn`);
  if (reauthorization.authorizedOn !== "2026-08-26") {
    reject(`${reauthorization.id}.authorizedOn is not 2026-08-26`);
  }
  if (reauthorization.scope !== RUNTIME_REAUTHORIZATION_SCOPE) {
    reject(`${reauthorization.id}.scope is not the exact post-projection lifecycle-validation scope`);
  }
  if (reauthorization.environment !== RUNTIME_REAUTHORIZATION_ENVIRONMENT) {
    reject(`${reauthorization.id}.environment is not repository/non-production only`);
  }
  if (typeof reauthorization.statement !== "string" || reauthorization.statement.length < 80) {
    reject(`${reauthorization.id}.statement is missing or too short`);
  }
  if (JSON.stringify(reauthorization.doesNotAuthorize) !== JSON.stringify(RUNTIME_REAUTHORIZATION_EXCLUSIONS)) {
    reject(`${reauthorization.id}.doesNotAuthorize is not the exact legal/date/question/evaluator/deployment exclusion set`);
  }
}

function authorizedRuntimeHash(delta, candidate, runtimeReauthorizations) {
  let expected = delta.authorizedSha256[candidate];
  const entries = runtimeReauthorizations.filter(
    (entry) => entry.deltaId === delta.id && entry.path === candidate
  );
  for (const entry of entries) {
    if (entry.priorSha256 !== expected) {
      reject(`${entry.id} prior hash does not continue the append-only runtime authorization chain for ${candidate}`);
    }
    expected = entry.newSha256;
  }
  // Re-pins continue the chain after the signed re-authorizations. Each hop is
  // matched by the hash it supersedes, so the order they are written in does
  // not decide the outcome and a hop that names a hash the chain never reaches
  // is dead rather than silently applied.
  const repins = (delta.supersededSha256 ?? []).filter(
    (entry) => entry.path === candidate && typeof entry[REPIN_KEY] === "string"
  );
  const consumed = new Set();
  for (let hop = 0; hop < repins.length; hop += 1) {
    const next = repins.find((entry) => entry.sha256 === expected && !consumed.has(entry));
    if (!next) break;
    consumed.add(next);
    expected = next[REPIN_KEY];
  }
  for (const entry of repins) {
    if (!consumed.has(entry)) {
      reject(`${delta.id} re-pins ${candidate} from ${entry.sha256.slice(0, 12)}…, which the authorization chain never reaches`);
    }
  }
  return expected;
}

function validateDelta(delta, rootDir, runtimeReauthorizations) {
  requireExactKeys(delta, DELTA_KEYS, "a delta");
  for (const key of DELTA_KEYS) {
    // supersededSha256 is the one optional key: a delta whose authorized files
    // have never moved has no history to record, and inventing an empty one
    // would make "no re-pin has happened" indistinguishable from "the history
    // was emptied". Absent means never re-pinned; present means it must be a
    // complete, reasoned record.
    if (key === OPTIONAL_DELTA_KEY) continue;
    if (!(key in delta)) reject(`a delta is missing "${key}"`);
  }

  if (typeof delta.id !== "string" || delta.id.length === 0) reject("delta id is missing");
  requireString(delta.jurisdiction, JURISDICTION, `${delta.id}.jurisdiction`);
  requireString(delta.questionId, QUESTION_ID, `${delta.id}.questionId`);
  requireString(delta.questionType, QUESTION_ID, `${delta.id}.questionType`);
  requireString(delta.pathwayId, PATHWAY_ID, `${delta.id}.pathwayId`);
  requireString(delta.flowStageId, FLOW_STAGE_ID, `${delta.id}.flowStageId`);
  if (delta.insertion !== "append_without_reordering") {
    reject(`${delta.id}.insertion must be "append_without_reordering"`);
  }
  requireCount(delta.beforeQuestionCount, `${delta.id}.beforeQuestionCount`);
  requireCount(delta.afterQuestionCount, `${delta.id}.afterQuestionCount`);
  if (delta.afterQuestionCount !== delta.beforeQuestionCount + 1) {
    reject(`${delta.id} approves exactly one added question; counts say otherwise`);
  }
  if (typeof delta.statutoryAuthority !== "string" || delta.statutoryAuthority.length === 0) {
    reject(`${delta.id}.statutoryAuthority is missing`);
  }
  if (typeof delta.purpose !== "string" || delta.purpose.length === 0) reject(`${delta.id}.purpose is missing`);
  if (!Array.isArray(delta.routeBehavior) || delta.routeBehavior.length === 0) {
    reject(`${delta.id}.routeBehavior is missing`);
  }
  if (typeof delta.projectionsNote !== "string" || delta.projectionsNote.length === 0) {
    reject(`${delta.id}.projectionsNote is missing`);
  }

  requireExactKeys(delta.authorization, AUTHORIZATION_KEYS, `${delta.id}.authorization`);
  for (const key of AUTHORIZATION_KEYS) {
    if (!(key in delta.authorization)) reject(`${delta.id}.authorization is missing "${key}"`);
  }
  if (typeof delta.authorization.authorizedBy !== "string" || delta.authorization.authorizedBy.length === 0) {
    reject(`${delta.id}.authorization.authorizedBy is missing`);
  }
  requireString(delta.authorization.authorizedOn, ISO_DATE, `${delta.id}.authorization.authorizedOn`);
  if (typeof delta.authorization.statement !== "string" || delta.authorization.statement.length < 40) {
    reject(`${delta.id}.authorization.statement is missing or too short to be a record of anything`);
  }
  if (!Array.isArray(delta.authorization.doesNotAuthorize) || delta.authorization.doesNotAuthorize.length === 0) {
    reject(`${delta.id}.authorization.doesNotAuthorize is missing`);
  }

  requireExactKeys(delta.supersedesApproval, SUPERSEDES_APPROVAL_KEYS, `${delta.id}.supersedesApproval`);
  for (const key of SUPERSEDES_APPROVAL_KEYS) {
    if (!(key in delta.supersedesApproval)) reject(`${delta.id}.supersedesApproval is missing "${key}"`);
  }
  if (typeof delta.supersedesApproval.id !== "string" || delta.supersedesApproval.id.length === 0) {
    reject(`${delta.id}.supersedesApproval.id is missing`);
  }
  if (typeof delta.supersedesApproval.authorizedBy !== "string" || delta.supersedesApproval.authorizedBy.length === 0) {
    reject(`${delta.id}.supersedesApproval.authorizedBy is missing`);
  }
  requireString(delta.supersedesApproval.authorizedOn, ISO_DATE, `${delta.id}.supersedesApproval.authorizedOn`);
  if (delta.supersedesApproval.id === delta.id) reject(`${delta.id} cannot supersede itself`);

  requireExactKeys(delta.beforeAfterEvidence, BEFORE_AFTER_EVIDENCE_KEYS, `${delta.id}.beforeAfterEvidence`);
  for (const key of BEFORE_AFTER_EVIDENCE_KEYS) {
    if (!(key in delta.beforeAfterEvidence)) reject(`${delta.id}.beforeAfterEvidence is missing "${key}"`);
  }
  if (typeof delta.beforeAfterEvidence.beforeRef !== "string" || delta.beforeAfterEvidence.beforeRef.length < 12) {
    reject(`${delta.id}.beforeAfterEvidence.beforeRef is missing`);
  }
  if (typeof delta.beforeAfterEvidence.afterRef !== "string" || delta.beforeAfterEvidence.afterRef.length < 12) {
    reject(`${delta.id}.beforeAfterEvidence.afterRef is missing`);
  }
  for (const key of ["behaviorBefore", "behaviorAfter"]) {
    if (!Array.isArray(delta.beforeAfterEvidence[key]) || delta.beforeAfterEvidence[key].length === 0) {
      reject(`${delta.id}.beforeAfterEvidence.${key} is missing`);
    }
  }
  if (!Array.isArray(delta.beforeAfterEvidence.behavioralProof) || delta.beforeAfterEvidence.behavioralProof.length === 0) {
    reject(`${delta.id}.beforeAfterEvidence.behavioralProof is missing`);
  }
  for (const proofPath of delta.beforeAfterEvidence.behavioralProof) {
    requireExactPath(proofPath, `${delta.id}.beforeAfterEvidence.behavioralProof entry`);
    if (!fs.existsSync(path.join(rootDir, proofPath))) reject(`${delta.id} cites missing behavioral proof ${proofPath}`);
  }

  if (!Array.isArray(delta.authorizedPaths) || delta.authorizedPaths.length === 0) {
    reject(`${delta.id}.authorizedPaths is not a non-empty array`);
  }
  for (const candidate of delta.authorizedPaths) requireExactPath(candidate, `${delta.id}.authorizedPaths entry`);

  requireExactKeys(delta.authorizedSha256, new Set(delta.authorizedPaths), `${delta.id}.authorizedSha256`);
  for (const candidate of delta.authorizedPaths) {
    if (!(candidate in delta.authorizedSha256)) reject(`${delta.id} pins no hash for ${candidate}`);
    requireString(delta.authorizedSha256[candidate], SHA256, `${delta.id}.authorizedSha256["${candidate}"]`);
  }

  for (const evidenceKey of ["beforeSha256", "afterSha256"]) {
    const evidenceHashes = delta.beforeAfterEvidence[evidenceKey];
    requireExactKeys(evidenceHashes, new Set(delta.authorizedPaths), `${delta.id}.beforeAfterEvidence.${evidenceKey}`);
    for (const candidate of delta.authorizedPaths) {
      if (!(candidate in evidenceHashes)) reject(`${delta.id}.beforeAfterEvidence.${evidenceKey} pins no hash for ${candidate}`);
      requireString(evidenceHashes[candidate], SHA256, `${delta.id}.beforeAfterEvidence.${evidenceKey}["${candidate}"]`);
      if (evidenceKey === "afterSha256" && evidenceHashes[candidate] !== delta.authorizedSha256[candidate]) {
        reject(`${delta.id}.beforeAfterEvidence.afterSha256 for ${candidate} does not equal the live authorized hash`);
      }
    }
  }

  // The hashes as of authorization.authorizedOn. These never change. They are
  // the fixed point that makes a re-pin detectable at all: without them a
  // re-pin plus a deleted history is indistinguishable from a file that never
  // moved, which is precisely the silent re-authorization this mechanism exists
  // to prevent.
  requireExactKeys(delta.originallyApprovedSha256, new Set(delta.authorizedPaths), `${delta.id}.originallyApprovedSha256`);
  for (const candidate of delta.authorizedPaths) {
    if (!(candidate in delta.originallyApprovedSha256)) {
      reject(`${delta.id} records no originally-approved hash for ${candidate}`);
    }
    requireString(delta.originallyApprovedSha256[candidate], SHA256, `${delta.id}.originallyApprovedSha256["${candidate}"]`);
  }

  // An authorized path may legitimately move again — these are shared runtime
  // files, not the property of one delta, and a later window that corrects
  // something unrelated in the same file changes its bytes. The danger is not
  // that the hash changes; it is that it changes SILENTLY, so a delta approved
  // over one shape quietly comes to cover another.
  //
  // So a re-pin has to leave a record. Every superseded hash stays here, each
  // one naming why the bytes moved and the verifier that proves the approved
  // behaviour still holds over the new bytes. The list is append-only in effect:
  // a hash may not be dropped from it and then reused as the live pin, and the
  // live pin may never appear in it, so "supersede then restore" cannot be used
  // to launder an unrecorded shape.
  if (delta.supersededSha256 !== undefined) {
    if (!Array.isArray(delta.supersededSha256) || delta.supersededSha256.length === 0) {
      reject(`${delta.id}.supersededSha256 is present but not a non-empty array`);
    }
    const seenSuperseded = new Set();
    for (const entry of delta.supersededSha256) {
      requireExactKeys(entry, SUPERSEDED_KEYS, `${delta.id}.supersededSha256 entry`);
      for (const key of SUPERSEDED_KEYS) {
        // `repinnedTo` is the one optional key, and its absence is meaningful:
        // an entry without it is history, an entry with it moves the live pin.
        // Requiring it would force every historical entry to claim it moved the
        // pin, which is exactly the record this file exists to keep straight.
        if (key === REPIN_KEY) continue;
        if (!(key in entry)) reject(`${delta.id}.supersededSha256 entry is missing "${key}"`);
      }
      requireExactPath(entry.path, `${delta.id}.supersededSha256 entry path`);
      if (!delta.authorizedPaths.includes(entry.path)) {
        reject(`${delta.id} records a superseded hash for ${entry.path}, which it does not authorize`);
      }
      requireString(entry.sha256, SHA256, `${delta.id}.supersededSha256 entry sha256`);
      requireString(entry.supersededOn, ISO_DATE, `${delta.id}.supersededSha256 entry supersededOn`);
      if (typeof entry.reason !== "string" || entry.reason.length < 40) {
        reject(`${delta.id}.supersededSha256 entry reason is missing or too short to be a record of anything`);
      }
      requireExactPath(entry.behaviouralProof, `${delta.id}.supersededSha256 entry behaviouralProof`);
      const proof = path.join(rootDir, entry.behaviouralProof);
      if (!fs.existsSync(proof)) {
        reject(`${delta.id} cites ${entry.behaviouralProof} as proof, and it does not exist`);
      }
      if (REPIN_KEY in entry) {
        requireString(entry[REPIN_KEY], SHA256, `${delta.id}.supersededSha256 entry ${REPIN_KEY}`);
        if (entry[REPIN_KEY] === entry.sha256) {
          reject(`${delta.id} re-pins ${entry.path} to the hash it supersedes, which moves nothing`);
        }
      }
      // The "never supersede the live pin" rule moved to the authorizedPaths
      // loop below, where the live pin is known. `authorizedSha256` is the
      // START of the authorization chain, not its end: once a re-authorization
      // or a re-pin exists, superseding the start is exactly what happened and
      // rejecting it here would forbid recording it.
      const key = `${entry.path}:${entry.sha256}`;
      if (seenSuperseded.has(key)) reject(`${delta.id} records ${entry.path} superseded twice at the same hash`);
      seenSuperseded.add(key);
    }
  }

  // The rule that makes the history load-bearing rather than decorative: a path
  // whose live pin has moved away from the originally-approved hash must record
  // that original hash as superseded. Deleting the history to make a re-pin look
  // like it never happened fails here.
  for (const candidate of delta.authorizedPaths) {
    const original = delta.originallyApprovedSha256[candidate];
    if (delta.authorizedSha256[candidate] === original) continue;
    const recorded = (delta.supersededSha256 ?? []).some(
      (entry) => entry.path === candidate && entry.sha256 === original
    );
    if (!recorded) {
      reject(
        `${delta.id} has re-pinned ${candidate} away from the originally-approved ${original.slice(0, 12)}… without recording that hash as superseded; a re-pin must say what it replaced and why`
      );
    }
  }

  if (!Array.isArray(delta.projections) || delta.projections.length === 0) {
    reject(`${delta.id}.projections is not a non-empty array`);
  }
  for (const projection of delta.projections) {
    requireExactKeys(projection, PROJECTION_KEYS, `${delta.id} projection`);
    for (const key of PROJECTION_KEYS) {
      if (!(key in projection)) reject(`${delta.id} projection is missing "${key}"`);
    }
    requireExactPath(projection.path, `${delta.id} projection path`);
    if (!delta.authorizedPaths.includes(projection.path)) {
      reject(`${delta.id} projects onto ${projection.path}, which it does not authorize`);
    }
    if (projection.jurisdictionKey !== null) {
      requireString(projection.jurisdictionKey, JURISDICTION, `${delta.id} projection jurisdictionKey`);
      if (projection.jurisdictionKey !== delta.jurisdiction) {
        reject(`${delta.id} projects onto jurisdiction ${projection.jurisdictionKey}, not ${delta.jurisdiction}`);
      }
    }
    requireCount(projection.beforeQuestionCount, `${delta.id} projection beforeQuestionCount`);
    requireCount(projection.afterQuestionCount, `${delta.id} projection afterQuestionCount`);
    if (projection.afterQuestionCount !== projection.beforeQuestionCount + 1) {
      reject(`${delta.id} projection approves exactly one added question; counts say otherwise`);
    }
    if (!FLOW_STAGE_CHANGES.has(projection.flowStageChange)) {
      reject(`${delta.id} projection flowStageChange must be one of ${[...FLOW_STAGE_CHANGES].join(", ")}`);
    }
    if (!PATHWAY_CHANGES.has(projection.pathwayChange)) {
      reject(`${delta.id} projection pathwayChange must be one of ${[...PATHWAY_CHANGES].join(", ")}`);
    }
    if (projection.pathwayChange === "add_one") {
      requireCount(projection.beforePathwayCount, `${delta.id} projection beforePathwayCount`);
      requireCount(projection.afterPathwayCount, `${delta.id} projection afterPathwayCount`);
      if (projection.afterPathwayCount !== projection.beforePathwayCount + 1) {
        reject(`${delta.id} projection approves exactly one added pathway; counts say otherwise`);
      }
    } else if (projection.beforePathwayCount !== null || projection.afterPathwayCount !== null) {
      reject(`${delta.id} projection changes no pathways but carries pathway counts`);
    }
    requireString(projection.addedQuestionSha256, SHA256, `${delta.id} projection addedQuestionSha256`);
  }

  // The participant-facing counts Roger approved must be a real projection, not
  // a number that appears only in the prose.
  const headline = delta.projections.find(
    (projection) =>
      projection.beforeQuestionCount === delta.beforeQuestionCount &&
      projection.afterQuestionCount === delta.afterQuestionCount
  );
  if (!headline) {
    reject(`${delta.id} approves ${delta.beforeQuestionCount} -> ${delta.afterQuestionCount} but no projection carries those counts`);
  }

  for (const candidate of delta.authorizedPaths) {
    const absolute = path.join(rootDir, candidate);
    if (!fs.existsSync(absolute)) reject(`${delta.id} pins ${candidate}, which does not exist`);
    const actual = sha256(fs.readFileSync(absolute));
    const runtimeAuthorized = authorizedRuntimeHash(delta, candidate, runtimeReauthorizations);
    // The live pin may never appear in the history. Superseding it and then
    // re-pinning back to it is how an unrecorded shape would be laundered
    // through a history that looks complete.
    for (const entry of delta.supersededSha256 ?? []) {
      if (entry.path === candidate && entry.sha256 === runtimeAuthorized) {
        reject(`${delta.id} records ${candidate} as superseded at the hash it is currently pinned to`);
      }
    }
    if (actual !== runtimeAuthorized) {
      reject(
        `${delta.id} approved ${candidate} through runtime hash ${runtimeAuthorized.slice(0, 12)}… but the file is ${actual.slice(0, 12)}…; the approval does not cover these bytes`
      );
    }
  }
}

/**
 * Builds the baseline the tree is expected to match, by applying the delta to
 * the `main` baseline. Returns `null` when the tree does not match the record —
 * which leaves the caller comparing against the untransformed baseline, and
 * therefore red.
 *
 * @param onFailure receives a human-readable reason for each mismatch.
 */
export function authorizedBaseline({ delta, projection, baseline, current, onFailure }) {
  const fail = (message) => {
    onFailure(`${delta.id}: ${message}`);
    return null;
  };

  if (!Array.isArray(baseline?.questions) || !Array.isArray(current?.questions)) {
    return fail("the compared profiles carry no question list");
  }

  const baselineIds = baseline.questions.map((question) => question.id);
  const currentIds = current.questions.map((question) => question.id);

  if (baselineIds.length !== projection.beforeQuestionCount) {
    return fail(`${projection.path} baseline holds ${baselineIds.length} questions, approved before-count is ${projection.beforeQuestionCount}`);
  }
  if (currentIds.length !== projection.afterQuestionCount) {
    return fail(`${projection.path} holds ${currentIds.length} questions, approved after-count is ${projection.afterQuestionCount}`);
  }

  const removed = baselineIds.filter((id) => !currentIds.includes(id));
  if (removed.length > 0) return fail(`removes ${removed.join(", ")}, which no approval permits`);

  const added = currentIds.filter((id) => !baselineIds.includes(id));
  if (added.length !== 1 || added[0] !== delta.questionId) {
    return fail(`adds ${added.length === 0 ? "nothing" : added.join(", ")}; only ${delta.questionId} is approved`);
  }

  // Relative order of every pre-existing question, independent of where the new
  // one landed in the flat array.
  const survivingOrder = currentIds.filter((id) => baselineIds.includes(id));
  if (canonicalJson(survivingOrder) !== canonicalJson(baselineIds)) {
    return fail("reorders questions that already existed; only an append is approved");
  }

  const question = current.questions.find((candidate) => candidate.id === delta.questionId);
  if (!question) return fail(`${delta.questionId} is not present to compare`);
  if (question.type !== delta.questionType) {
    return fail(`${delta.questionId} is type "${question.type}", approved type is "${delta.questionType}"`);
  }
  if (question.stage !== undefined && question.stage !== delta.flowStageId) {
    return fail(`${delta.questionId} sits in stage "${question.stage}", approved stage is "${delta.flowStageId}"`);
  }
  const questionHash = sha256(canonicalJson(question));
  if (questionHash !== projection.addedQuestionSha256) {
    return fail(
      `${delta.questionId} in ${projection.path} hashes to ${questionHash.slice(0, 12)}…, approved at ${projection.addedQuestionSha256.slice(0, 12)}…`
    );
  }

  const transformed = {
    ...baseline,
    questions: [...baseline.questions]
  };
  transformed.questions.splice(currentIds.indexOf(delta.questionId), 0, question);

  if (projection.flowStageChange === "append_question_id") {
    if (!Array.isArray(baseline.flowStages) || !Array.isArray(current.flowStages)) {
      return fail(`${projection.path} is recorded as listing questions in its flow stages but does not`);
    }
    const stages = baseline.flowStages.map((stage) => ({ ...stage, questionIds: [...(stage.questionIds ?? [])] }));
    const stage = stages.find((candidate) => candidate.id === delta.flowStageId);
    if (!stage) return fail(`the approved stage "${delta.flowStageId}" is not in the baseline`);
    stage.questionIds.push(delta.questionId);
    transformed.flowStages = stages;

    // Deep equality here is what makes "added to a different stage" fail: the
    // approved transform puts the id in exactly one stage, and anything else
    // leaves the two shapes different.
    if (canonicalJson(stages) !== canonicalJson(current.flowStages)) {
      return fail(`the flow-stage change is not an append of ${delta.questionId} to "${delta.flowStageId}" and nothing else`);
    }
  } else {
    // `none`: this shape lists no question ids in its stages, so an approved
    // question addition must leave the stage list untouched.
    if (canonicalJson(baseline.flowStages) !== canonicalJson(current.flowStages)) {
      return fail(`${projection.path} is recorded as changing no flow stages, but they differ`);
    }
    if (JSON.stringify(current.flowStages ?? "").includes(`"${delta.questionId}"`)) {
      return fail(`${projection.path} names ${delta.questionId} in its flow stages, which this projection does not approve`);
    }
  }

  if (projection.pathwayChange === "add_one") {
    const basePathways = (baseline.pathways ?? []).map((pathway) => pathway.id);
    const currentPathways = (current.pathways ?? []).map((pathway) => pathway.id);
    if (basePathways.length !== projection.beforePathwayCount) {
      return fail(`${projection.path} baseline holds ${basePathways.length} pathways, approved before-count is ${projection.beforePathwayCount}`);
    }
    if (currentPathways.length !== projection.afterPathwayCount) {
      return fail(`${projection.path} holds ${currentPathways.length} pathways, approved after-count is ${projection.afterPathwayCount}`);
    }
    const droppedPathways = basePathways.filter((id) => !currentPathways.includes(id));
    if (droppedPathways.length > 0) {
      return fail(`removes pathway ${droppedPathways.join(", ")}, which no approval permits`);
    }
    const addedPathways = currentPathways.filter((id) => !basePathways.includes(id));
    if (addedPathways.length !== 1 || addedPathways[0] !== delta.pathwayId) {
      return fail(
        `adds pathway ${addedPathways.length === 0 ? "nothing" : addedPathways.join(", ")}; only ${delta.pathwayId} is approved`
      );
    }
    transformed.pathways = current.pathways;
  } else if (canonicalJson(baseline.pathways) !== canonicalJson(current.pathways)) {
    return fail(`${projection.path} is recorded as changing no pathways, but they differ`);
  }

  return transformed;
}

/** The delta covering a given compared file and jurisdiction, or null. */
export function findProjection(deltas, { filePath, jurisdictionCode }) {
  for (const delta of deltas) {
    if (delta.jurisdiction !== jurisdictionCode) continue;
    const projection = delta.projections.find((candidate) => candidate.path === filePath);
    if (projection) return { delta, projection };
  }
  return null;
}
