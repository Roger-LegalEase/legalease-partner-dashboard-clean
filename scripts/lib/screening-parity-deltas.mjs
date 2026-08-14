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
  "authorizedPaths",
  "authorizedSha256",
  "projectionsNote",
  "projections"
]);

const AUTHORIZATION_KEYS = new Set(["authorizedBy", "authorizedOn", "statement", "doesNotAuthorize"]);
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

const ROOT_KEYS = new Set(["schemaVersion", "note", "deltas"]);

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
  if (!Array.isArray(parsed.deltas) || parsed.deltas.length === 0) reject("deltas is not a non-empty array");

  const seen = new Set();
  for (const delta of parsed.deltas) {
    validateDelta(delta, rootDir);
    if (seen.has(delta.id)) reject(`duplicate delta id "${delta.id}"`);
    seen.add(delta.id);
  }

  return { deltas: parsed.deltas, present: true };
}

function validateDelta(delta, rootDir) {
  requireExactKeys(delta, DELTA_KEYS, "a delta");
  for (const key of DELTA_KEYS) {
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

  if (!Array.isArray(delta.authorizedPaths) || delta.authorizedPaths.length === 0) {
    reject(`${delta.id}.authorizedPaths is not a non-empty array`);
  }
  for (const candidate of delta.authorizedPaths) requireExactPath(candidate, `${delta.id}.authorizedPaths entry`);

  requireExactKeys(delta.authorizedSha256, new Set(delta.authorizedPaths), `${delta.id}.authorizedSha256`);
  for (const candidate of delta.authorizedPaths) {
    if (!(candidate in delta.authorizedSha256)) reject(`${delta.id} pins no hash for ${candidate}`);
    requireString(delta.authorizedSha256[candidate], SHA256, `${delta.id}.authorizedSha256["${candidate}"]`);
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
    if (actual !== delta.authorizedSha256[candidate]) {
      reject(
        `${delta.id} approved ${candidate} at ${delta.authorizedSha256[candidate].slice(0, 12)}… but the file is ${actual.slice(0, 12)}…; the approval does not cover these bytes`
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
