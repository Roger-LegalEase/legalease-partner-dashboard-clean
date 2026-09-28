import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import {
  APPROVED_DELTAS_PATH,
  authorizedBaseline,
  canonicalJson,
  loadApprovedParityDeltas
} from "./lib/screening-parity-deltas.mjs";

/** The same hash the delta record pins with: sha256 over the canonical JSON. */
function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

const root = process.cwd();
const profileRoot = "src/lib/rcap-engine/compiled/profiles";
const aggregateFiles = [
  "src/lib/rcap-engine/compiled/all51.json",
  "src/lib/expungement-ai/frontend/profiles/all51.json"
];
const failures = [];
const baselineRef = resolveBaselineRef();

/**
 * Reviewed screening changes arrive as a delta record that is APPLIED to the
 * baseline, producing the exact shape the tree must match. Nothing below is
 * skipped for an approved change — the comparison is the same one, run against
 * a fully specified expectation. A malformed record throws here rather than
 * being treated as "no approval", because a broken approval is not an absent
 * one and must not read as permission.
 */
const approvedDeltas = loadApprovedParityDeltas({ rootDir: root });
/** Ids whose bytes the approval pins directly, so the prompt spec table does not apply. */
const hashPinnedQuestionIds = new Set(approvedDeltas.deltas.map((delta) => delta.questionId));

const expectedPromptById = {
  jurisdiction_scope: (state) => `Did this case happen in ${state} (not a federal case)?`,
  case_outcome: () => "How did the case end?",
  possible_pathway_context: () => "Do any of these sound like your situation?",
  offense_level: () => "What kind of charge was it?",
  charge: () => "What does the record say you were charged with?",
  record_documents: () => "Do you have your court paperwork handy?",
  county_or_filing_location: (state) => `Where in ${state} did the case happen?`,
  case_identifier: () => "What's the case number?",
  sentence_completion_date: () => "Have you finished everything the court ordered?",
  disposition_date: () => "When did the case end or finish?",
  financial_obligations: () => "Have you paid off everything the court charged?",
  age_at_offense: () => "How old were you when this happened?",
  pardon_status: () => "Have you gotten a pardon or similar official relief for this?",
  pending_cases: () => "Do you have any open cases right now?",
  state_exclusion_categories: () => "Did the case involve any of these?",
  criminal_history: () => "Do you have your background check or court records handy?",
  trafficking_status: () => "Did this happen because you were a victim of human trafficking?",
  prior_relief: () => "Have you had a record cleared before, anywhere?",
  county: () => "Which county (or local area) handled the case?",
  identity_error: () => "Was this arrest a mistake — wrong person, identity theft, or an error?",
  arrest_date: () => "When did the arrest happen?",
  case_number: () => "What's the case number?",
  actual_innocence_basis: () => "For an actual-innocence motion, what facts show the offense did not occur or was not committed by you?",
  dc_offense_severity_group: () => "For a DC felony sealing motion, what Offense Severity Group does the record show?"
};

const unchangedPromptIds = new Set(["ownership_scope", "court"]);
const caseOutcomeDisplay = {
  "Arrest or citation with no charge filed": ["Arrested, but never charged", "arrest or citation with no charge filed"],
  "Dismissed, no-billed, nolle prosequi, or not prosecuted": ["The case was dropped or thrown out", "dismissed, no-billed, nolle prosequi, or not prosecuted"],
  "Acquitted or found not guilty": ["Found not guilty", "acquitted or found not guilty"],
  "Diversion, deferred disposition, supervision, or similar program": ["Completed a program instead of a conviction", "diversion, deferred disposition, supervision, or similar"],
  "Misdemeanor conviction": ["Convicted of a misdemeanor", "a less serious conviction"],
  "Felony conviction": ["Convicted of a felony", "a more serious conviction"],
  "Other conviction or adjudication": ["Another kind of conviction", "other conviction or adjudication"],
  "Juvenile adjudication or offense committed as a minor": ["It happened when I was a minor", "juvenile adjudication or offense as a minor"],
  "Pardoned conviction": ["Pardoned", "pardoned conviction"],
  "I am not sure": ["I'm not sure", "That's okay — we'll help you figure it out"]
};

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function refExists(ref) {
  const result = spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], {
    cwd: root,
    encoding: "utf8"
  });
  return result.status === 0;
}

function resolveBaselineRef() {
  const candidates = ["origin/main", "main"];
  if (process.env.GITHUB_BASE_REF) candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
  for (const candidate of candidates) {
    if (refExists(candidate)) return candidate;
  }
  throw new Error(`could not resolve a baseline ref to compare against; tried ${candidates.join(", ")}`);
}

function readBaselineJson(file) {
  const result = spawnSync("git", ["show", `${baselineRef}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Unable to read ${file} from ${baselineRef}:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

function stable(value) {
  return JSON.stringify(value);
}

function questionKey(code, question) {
  return `${code}:${question.id}`;
}

/**
 * A reviewed delta describes a transition: baseline has N questions, the tree
 * has N+1. That statement is true right up until the branch carrying it merges
 * — after which `main` IS the after-shape, the before-count no longer matches,
 * and the projection fails permanently. The approval turns red at the exact
 * moment it succeeds, and it takes the question's pin down with it: the caller
 * falls back to the untransformed baseline with an empty pinned set, so the
 * newly-landed question is also reported as "not covered by the plain-language
 * spec table". Both halves of the Maryland failure after PR #93 merged were
 * this one cause.
 *
 * So: recognise the settled state explicitly. The baseline already holds the
 * approved after-shape, the tree still agrees with it question-for-question,
 * and — checked here rather than assumed — the approved question still hashes
 * to exactly the bytes Roger authorised. That is the approval being HONOURED,
 * not violated, so the pin is kept: the question stays governed by the delta's
 * content hash, which is a stricter statement than the spec table ("the wording
 * is exactly what was approved", not "the wording follows a pattern").
 *
 * Deliberately not fixed in `scripts/lib/screening-parity-deltas.mjs`, where
 * `authorizedBaseline` lives: that directory is one of the seven worker
 * image inputs, and editing it would invalidate the digest published from this
 * commit and force a rebuild for a change no image contains. This file is in
 * neither image-input set.
 *
 * Returns null when the delta has not settled, leaving the ordinary projection
 * to run unchanged.
 */
function settledDelta(match, baseline, current, label) {
  const { delta, projection } = match;
  const baselineIds = (baseline?.questions ?? []).map((question) => question.id);

  // Compare the entire participant-facing parity topology: exact questions,
  // exact flow stages, and exact pathway identity/order. Non-question legal
  // contract fields may differ from main only because validateDelta has already
  // pinned the whole file's exact approved bytes. This keeps additions,
  // rewording, reordering and stage/pathway mutations red while allowing an
  // expressly approved legalAuthority/waiting-rule binding to settle without
  // pretending the already-landed question is a new 35 -> 36 transition again.
  const baselinePathwayIds = (baseline?.pathways ?? []).map((pathway) => pathway.id);
  const currentPathwayIds = (current?.pathways ?? []).map((pathway) => pathway.id);
  const settled =
    baselineIds.length === projection.afterQuestionCount &&
    baselineIds.includes(delta.questionId) &&
    canonicalJson(baseline.questions) === canonicalJson(current.questions) &&
    canonicalJson(baseline.flowStages) === canonicalJson(current.flowStages) &&
    canonicalJson(baselinePathwayIds) === canonicalJson(currentPathwayIds);
  if (!settled) return null;

  const fail = (message) => assert(false, `${label} ${delta.id}: ${message}`);
  if (!settledShapeChecks(match, current, fail)) return { baseline, pinned: new Set() };
  return { baseline, pinned: new Set([delta.questionId]) };
}

/**
 * Every claim a projection made about the approved SHAPE, re-checked against a
 * tree in which the question has already landed. Only the transition counts are
 * dropped, because there is no longer a transition to count — and a record
 * whose remaining claims went unchecked would be a standing exemption rather
 * than an approval. The pathway assertion in particular is what stops the
 * record being quietly repointed at a pathway nobody approved. Returns false
 * after reporting the first failure.
 */
function settledShapeChecks(match, current, fail) {
  const { delta, projection } = match;
  const question = current.questions.find((candidate) => candidate.id === delta.questionId);
  if (!question) return fail(`${delta.questionId} is not present to compare`), false;

  const hash = sha256(canonicalJson(question));
  if (hash !== projection.addedQuestionSha256) {
    fail(`${delta.questionId} has landed in the baseline but hashes to ${hash.slice(0, 12)}…, approved at ${projection.addedQuestionSha256.slice(0, 12)}…`);
    return false;
  }
  if (question.type !== delta.questionType) {
    fail(`${delta.questionId} is type "${question.type}", approved type is "${delta.questionType}"`);
    return false;
  }
  if (question.stage !== undefined && question.stage !== delta.flowStageId) {
    fail(`${delta.questionId} sits in stage "${question.stage}", approved stage is "${delta.flowStageId}"`);
    return false;
  }

  if (projection.flowStageChange === "append_question_id") {
    const stage = (current.flowStages ?? []).find((candidate) => candidate.id === delta.flowStageId);
    if (!stage) return fail(`the approved stage "${delta.flowStageId}" is not present`), false;
    if (!(stage.questionIds ?? []).includes(delta.questionId)) {
      return fail(`"${delta.flowStageId}" does not list ${delta.questionId}`), false;
    }
  } else if (JSON.stringify(current.flowStages ?? "").includes(`"${delta.questionId}"`)) {
    return fail(`names ${delta.questionId} in its flow stages, which this projection does not approve`), false;
  }

  if (projection.pathwayChange === "add_one") {
    const pathwayIds = (current.pathways ?? []).map((pathway) => pathway.id);
    if (pathwayIds.length !== projection.afterPathwayCount) {
      return fail(`holds ${pathwayIds.length} pathways, approved after-count is ${projection.afterPathwayCount}`), false;
    }
    if (!pathwayIds.includes(delta.pathwayId)) {
      return fail(`does not carry the approved pathway ${delta.pathwayId}`), false;
    }
  }
  return true;
}

/**
 * Every reviewed delta that projects onto this exact file and jurisdiction, in
 * record order. One jurisdiction may carry several approved questions (Nevada's
 * three NRS 176A facts), each its own signed record; their counts must chain
 * and they are applied in sequence below.
 */
function projectionsFor(filePath, jurisdictionCode) {
  return approvedDeltas.deltas
    .filter((delta) => delta.jurisdiction === jurisdictionCode)
    .map((delta) => ({ delta, projection: delta.projections.find((candidate) => candidate.path === filePath) }))
    .filter((match) => match.projection);
}

/**
 * Parity governs pathway IDENTITY and ORDER, exactly as `settledDelta` already
 * does; a pathway's legal-authority, waiting-rule or ratification content is
 * governed by the legal-authority and ratification verifiers and moves under
 * their records, not under a screening approval. A `pathwayChange: "none"`
 * projection therefore compares pathway ids, and only when they are identical
 * is the content substituted so the ordinary transform can run. A removed,
 * added or reordered pathway leaves the baseline untouched and fails below.
 */
function pathwayIdentityBaseline(baseline, current, projection) {
  if (projection.pathwayChange !== "none") return baseline;
  const baselineIds = (baseline?.pathways ?? []).map((pathway) => pathway.id);
  const currentIds = (current?.pathways ?? []).map((pathway) => pathway.id);
  if (canonicalJson(baselineIds) !== canonicalJson(currentIds)) return baseline;
  if (baseline?.pathways === undefined && current?.pathways === undefined) return baseline;
  return { ...baseline, pathways: current.pathways };
}

/**
 * Several approved questions in one jurisdiction and file: the records are
 * applied in order, each adding exactly its own question, and the resulting
 * shape must equal the tree — flow stages compared once after the last
 * append, pathways by identity with at most one approved addition. Anything
 * the chain does not name (a fourth question, a reordering, a stage move, a
 * dropped pathway) leaves the untransformed baseline in place and fails.
 */
function chainedBaseline(matches, baseline, current, label) {
  const untouched = { baseline, pinned: new Set() };
  const ids = matches.map((match) => match.delta.questionId);
  const chainLabel = `${label} ${matches.map((match) => match.delta.id).join(" → ")}`;
  const fail = (message) => {
    assert(false, `${chainLabel}: ${message}`);
    return untouched;
  };

  for (let index = 1; index < matches.length; index += 1) {
    const previous = matches[index - 1].projection;
    const next = matches[index].projection;
    if (next.beforeQuestionCount !== previous.afterQuestionCount) {
      return fail(`chained approvals do not chain: ${matches[index].delta.id} starts at ${next.beforeQuestionCount}, the previous record ends at ${previous.afterQuestionCount}`);
    }
  }
  const first = matches[0].projection;
  const last = matches[matches.length - 1].projection;

  if (!Array.isArray(baseline?.questions) || !Array.isArray(current?.questions)) {
    return fail("the compared profiles carry no question list");
  }
  const baselineIds = baseline.questions.map((question) => question.id);
  const currentIds = current.questions.map((question) => question.id);
  const baselinePathwayIds = (baseline.pathways ?? []).map((pathway) => pathway.id);
  const currentPathwayIds = (current.pathways ?? []).map((pathway) => pathway.id);

  // Settled: main already carries every chained question and the tree agrees.
  if (
    baselineIds.length === last.afterQuestionCount &&
    ids.every((id) => baselineIds.includes(id)) &&
    canonicalJson(baseline.questions) === canonicalJson(current.questions) &&
    canonicalJson(baseline.flowStages) === canonicalJson(current.flowStages) &&
    canonicalJson(baselinePathwayIds) === canonicalJson(currentPathwayIds)
  ) {
    for (const match of matches) {
      const perDelta = (message) => assert(false, `${label} ${match.delta.id}: ${message}`);
      if (!settledShapeChecks(match, current, perDelta)) return untouched;
    }
    return { baseline, pinned: new Set(ids) };
  }

  if (baselineIds.length !== first.beforeQuestionCount) {
    return fail(`baseline holds ${baselineIds.length} questions, the first approved before-count is ${first.beforeQuestionCount}`);
  }
  if (currentIds.length !== last.afterQuestionCount) {
    return fail(`holds ${currentIds.length} questions, the last approved after-count is ${last.afterQuestionCount}`);
  }
  const removed = baselineIds.filter((id) => !currentIds.includes(id));
  if (removed.length > 0) return fail(`removes ${removed.join(", ")}, which no approval permits`);
  const added = currentIds.filter((id) => !baselineIds.includes(id));
  if (canonicalJson(added) !== canonicalJson(ids)) {
    return fail(`adds ${added.length === 0 ? "nothing" : added.join(", ")}; the chained approvals cover exactly ${ids.join(", ")} in that order`);
  }
  const survivingOrder = currentIds.filter((id) => baselineIds.includes(id));
  if (canonicalJson(survivingOrder) !== canonicalJson(baselineIds)) {
    return fail("reorders questions that already existed; only appends are approved");
  }

  const stages = Array.isArray(baseline.flowStages)
    ? baseline.flowStages.map((stage) => ({ ...stage, questionIds: [...(stage.questionIds ?? [])] }))
    : undefined;
  let appended = false;
  const transformedQuestions = [...baseline.questions];
  for (const match of matches) {
    const { delta, projection } = match;
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
      return fail(`${delta.questionId} in ${projection.path} hashes to ${questionHash.slice(0, 12)}…, approved at ${projection.addedQuestionSha256.slice(0, 12)}…`);
    }
    if (projection.flowStageChange === "append_question_id") {
      if (!stages || !Array.isArray(current.flowStages)) {
        return fail(`${projection.path} is recorded as listing questions in its flow stages but does not`);
      }
      const stage = stages.find((candidate) => candidate.id === delta.flowStageId);
      if (!stage) return fail(`the approved stage "${delta.flowStageId}" is not in the baseline`);
      stage.questionIds.push(delta.questionId);
      appended = true;
    } else if (JSON.stringify(current.flowStages ?? "").includes(`"${delta.questionId}"`)) {
      return fail(`${projection.path} names ${delta.questionId} in its flow stages, which this projection does not approve`);
    }
  }
  if (appended) {
    if (canonicalJson(stages) !== canonicalJson(current.flowStages)) {
      return fail(`the flow-stage change is not an append of ${ids.join(", ")} to their approved stages and nothing else`);
    }
  } else if (canonicalJson(baseline.flowStages) !== canonicalJson(current.flowStages)) {
    return fail(`${first.path} is recorded as changing no flow stages, but they differ`);
  }

  const additions = matches.filter((match) => match.projection.pathwayChange === "add_one");
  if (additions.length > 1) return fail("more than one chained record claims a pathway addition");
  if (additions.length === 1) {
    const { delta, projection } = additions[0];
    if (baselinePathwayIds.length !== projection.beforePathwayCount) {
      return fail(`${projection.path} baseline holds ${baselinePathwayIds.length} pathways, approved before-count is ${projection.beforePathwayCount}`);
    }
    if (currentPathwayIds.length !== projection.afterPathwayCount) {
      return fail(`${projection.path} holds ${currentPathwayIds.length} pathways, approved after-count is ${projection.afterPathwayCount}`);
    }
    const droppedPathways = baselinePathwayIds.filter((id) => !currentPathwayIds.includes(id));
    if (droppedPathways.length > 0) return fail(`removes pathway ${droppedPathways.join(", ")}, which no approval permits`);
    const addedPathways = currentPathwayIds.filter((id) => !baselinePathwayIds.includes(id));
    if (addedPathways.length !== 1 || addedPathways[0] !== delta.pathwayId) {
      return fail(`adds pathway ${addedPathways.length === 0 ? "nothing" : addedPathways.join(", ")}; only ${delta.pathwayId} is approved`);
    }
    const survivingPathways = currentPathwayIds.filter((id) => baselinePathwayIds.includes(id));
    if (canonicalJson(survivingPathways) !== canonicalJson(baselinePathwayIds)) {
      return fail("reorders pathways that already existed; only one approved addition is permitted");
    }
  } else if (canonicalJson(baselinePathwayIds) !== canonicalJson(currentPathwayIds)) {
    return fail(`${first.path} is recorded as changing no pathways, but their identity or order differs`);
  }

  for (const id of ids) {
    const question = current.questions.find((candidate) => candidate.id === id);
    transformedQuestions.splice(currentIds.indexOf(id), 0, question);
  }
  const transformed = { ...baseline, questions: transformedQuestions };
  if (appended) transformed.flowStages = current.flowStages;
  if (current.pathways !== undefined) transformed.pathways = current.pathways;
  return { baseline: transformed, pinned: new Set(ids) };
}

/**
 * Applies any reviewed delta covering this exact file and jurisdiction, giving
 * back the baseline the tree is expected to match. When the tree does not match
 * the record, the untransformed baseline comes back and the ordinary comparison
 * stays red — a stale or wrong approval never turns into permission.
 */
function baselineFor(filePath, jurisdictionCode, baseline, current, label) {
  const matches = projectionsFor(filePath, jurisdictionCode);
  if (matches.length === 0) return { baseline, pinned: new Set() };
  if (matches.length > 1) return chainedBaseline(matches, baseline, current, label);

  const match = matches[0];
  const settled = settledDelta(match, baseline, current, label);
  if (settled) return settled;

  const transformed = authorizedBaseline({
    delta: match.delta,
    projection: match.projection,
    baseline: pathwayIdentityBaseline(baseline, current, match.projection),
    current,
    onFailure: (reason) => assert(false, `${label} ${reason}`)
  });
  if (!transformed) return { baseline, pinned: new Set() };

  return { baseline: transformed, pinned: new Set([match.delta.questionId]) };
}

function compareProfile(code, before, after, pinnedIds = new Set()) {
  assert(before.questions.length === after.questions.length, `${code} question count changed.`);
  assert(stable(before.questions.map((question) => question.id)) === stable(after.questions.map((question) => question.id)), `${code} question order changed.`);
  assert(stable(before.flowStages) === stable(after.flowStages), `${code} flow stage/order metadata changed.`);

  const afterById = new Map(after.questions.map((question) => [question.id, question]));
  const state = after.jurisdiction.name;
  for (const beforeQuestion of before.questions) {
    const afterQuestion = afterById.get(beforeQuestion.id);
    assert(afterQuestion, `${questionKey(code, beforeQuestion)} missing after rewrite.`);
    if (!afterQuestion) continue;

    for (const key of ["id", "stage", "type", "required", "contextOnly", "doesNotSelectPathway"]) {
      assert(stable(beforeQuestion[key]) === stable(afterQuestion[key]), `${questionKey(code, beforeQuestion)} changed ${key}.`);
    }
    assert(stable(beforeQuestion.options ?? null) === stable(afterQuestion.options ?? null), `${questionKey(code, beforeQuestion)} changed option values/order.`);

    if (expectedPromptById[afterQuestion.id]) {
      const expected = expectedPromptById[afterQuestion.id](state);
      assert(afterQuestion.prompt === expected, `${questionKey(code, afterQuestion)} prompt was "${afterQuestion.prompt}", expected "${expected}".`);
    } else if (unchangedPromptIds.has(afterQuestion.id)) {
      assert(afterQuestion.prompt === beforeQuestion.prompt, `${questionKey(code, afterQuestion)} should have stayed unchanged.`);
    } else if (pinnedIds.has(afterQuestion.id)) {
      // Covered by the reviewed delta's content hash instead, which is a
      // stricter statement than the spec table: not "the wording follows a
      // pattern" but "the wording is exactly what was approved".
    } else if (!String(afterQuestion.id).startsWith("source_question")) {
      assert(false, `${questionKey(code, afterQuestion)} is not covered by the plain-language spec table.`);
    }

    if (afterQuestion.id === "case_outcome") {
      for (const value of afterQuestion.options ?? []) {
        const display = afterQuestion.optionDisplay?.[value];
        if (caseOutcomeDisplay[value]) {
          const [label, helperText] = caseOutcomeDisplay[value];
          assert(display?.label === label, `${code} case_outcome value "${value}" has wrong display label.`);
          if (helperText === undefined) {
            assert(!display?.helperText, `${code} case_outcome value "${value}" should not have helper text.`);
          } else {
            assert(display?.helperText === helperText, `${code} case_outcome value "${value}" has wrong helper text.`);
          }
        } else {
          const allowedSourceUnknown = value === "Outcome unknown or record needed" && (!display || (display.label === value && !display.helperText));
          assert(allowedSourceUnknown, `${code} case_outcome value "${value}" was not in spec and should stay undisplayed.`);
        }
      }
    }
  }
}

const profileFiles = fs.readdirSync(path.join(root, profileRoot)).filter((file) => file.endsWith(".json")).sort();
for (const file of profileFiles) {
  const filePath = `${profileRoot}/${file}`;
  const current = readJson(filePath);
  const baseline = readBaselineJson(filePath);
  const code = current.jurisdiction.code;
  const authorized = baselineFor(filePath, code, baseline, current, code);
  compareProfile(code, authorized.baseline, current, authorized.pinned);
}

for (const file of aggregateFiles) {
  const current = readJson(file);
  const baseline = readBaselineJson(file);
  assert(stable(Object.keys(current).sort()) === stable(Object.keys(baseline).sort()), `${file} jurisdiction set changed.`);
  for (const code of Object.keys(current).sort()) {
    const label = `${file}:${code}`;
    const authorized = baselineFor(file, code, baseline[code], current[code], label);
    compareProfile(label, authorized.baseline, current[code], authorized.pinned);
  }
}

if (failures.length) {
  console.error("Expungement plain-language value parity failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement plain-language value parity passed.");
console.log(`Baseline ref: ${baselineRef}`);
console.log("Option value arrays, question order, stages, required flags, and contextOnly flags match main.");
