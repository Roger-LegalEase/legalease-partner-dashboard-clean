import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

import {
  APPROVED_DELTAS_PATH,
  authorizedBaseline,
  canonicalJson,
  findProjection,
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
  const candidates = ["main", "origin/main"];
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

  // Byte-equality of the WHOLE profile, not merely matching id lists. Anything
  // weaker would let a tree edit ride in under the settled branch and skip the
  // projection: an extra question, a reorder, a moved flow stage. Those all
  // leave baseline and tree different, so they fall through and the projection
  // reports them exactly as before.
  const settled =
    baselineIds.length === projection.afterQuestionCount &&
    baselineIds.includes(delta.questionId) &&
    canonicalJson(baseline) === canonicalJson(current);
  if (!settled) return null;

  const fail = (message) => assert(false, `${label} ${delta.id}: ${message}`);

  // Every claim the projection made about the approved SHAPE is re-checked here
  // against the settled tree. Only the transition counts are dropped, because
  // there is no longer a transition to count — and a record whose remaining
  // claims went unchecked would be a standing exemption rather than an
  // approval. The pathway assertion in particular is what stops the record
  // being quietly repointed at a pathway nobody approved.
  const question = current.questions.find((candidate) => candidate.id === delta.questionId);
  if (!question) return fail(`${delta.questionId} is not present to compare`);

  const hash = sha256(canonicalJson(question));
  if (hash !== projection.addedQuestionSha256) {
    return fail(
      `${delta.questionId} has landed in the baseline but hashes to ${hash.slice(0, 12)}…, approved at ${projection.addedQuestionSha256.slice(0, 12)}…`
    );
  }
  if (question.type !== delta.questionType) {
    return fail(`${delta.questionId} is type "${question.type}", approved type is "${delta.questionType}"`);
  }
  if (question.stage !== undefined && question.stage !== delta.flowStageId) {
    return fail(`${delta.questionId} sits in stage "${question.stage}", approved stage is "${delta.flowStageId}"`);
  }

  if (projection.flowStageChange === "append_question_id") {
    const stage = (current.flowStages ?? []).find((candidate) => candidate.id === delta.flowStageId);
    if (!stage) return fail(`the approved stage "${delta.flowStageId}" is not present`);
    if (!(stage.questionIds ?? []).includes(delta.questionId)) {
      return fail(`"${delta.flowStageId}" does not list ${delta.questionId}`);
    }
  } else if (JSON.stringify(current.flowStages ?? "").includes(`"${delta.questionId}"`)) {
    return fail(`names ${delta.questionId} in its flow stages, which this projection does not approve`);
  }

  if (projection.pathwayChange === "add_one") {
    const pathwayIds = (current.pathways ?? []).map((pathway) => pathway.id);
    if (pathwayIds.length !== projection.afterPathwayCount) {
      return fail(`holds ${pathwayIds.length} pathways, approved after-count is ${projection.afterPathwayCount}`);
    }
    if (!pathwayIds.includes(delta.pathwayId)) {
      return fail(`does not carry the approved pathway ${delta.pathwayId}`);
    }
  }

  return { baseline, pinned: new Set([delta.questionId]) };
}

/**
 * Applies any reviewed delta covering this exact file and jurisdiction, giving
 * back the baseline the tree is expected to match. When the tree does not match
 * the record, the untransformed baseline comes back and the ordinary comparison
 * stays red — a stale or wrong approval never turns into permission.
 */
function baselineFor(filePath, jurisdictionCode, baseline, current, label) {
  const match = findProjection(approvedDeltas.deltas, { filePath, jurisdictionCode });
  if (!match) return { baseline, pinned: new Set() };

  const settled = settledDelta(match, baseline, current, label);
  if (settled) return settled;

  const transformed = authorizedBaseline({
    delta: match.delta,
    projection: match.projection,
    baseline,
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
