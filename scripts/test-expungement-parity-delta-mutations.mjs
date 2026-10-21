import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-expungement-parity-delta-mutations.mjs", [
  "data/expungement-ai/screening-parity-approved-deltas.json",
  "src/lib/rcap-engine/compiled/profiles/MD-maryland.json",
  "src/lib/rcap-engine/evaluator.ts",
  "src/lib/rcap-engine/public-profile-projection.ts"
]);


/**
 * Proves the reviewed parity-delta mechanism is a constraint, not a bypass.
 *
 * The risk with any approved-exception mechanism is that it quietly becomes a
 * general one: the approval is present, so the guard stops looking. Each case
 * below makes a change the approval does NOT cover and requires the parity
 * verifier to go red — and requires it to go red for the RIGHT reason, which is
 * why every case asserts on the message rather than only the exit code.
 *
 * Cases that edit an approved file also re-pin that file's hash in the record
 * first. Otherwise every one of them would trip the content pin and prove
 * nothing about the parity logic sitting behind it.
 */

const root = process.cwd();
const RECORD = "data/expungement-ai/screening-parity-approved-deltas.json";
const MD_PROFILE = "src/lib/rcap-engine/compiled/profiles/MD-maryland.json";
const EVALUATOR = "src/lib/rcap-engine/evaluator.ts";
const PUBLIC_PROJECTION = "src/lib/rcap-engine/public-profile-projection.ts";
const TOUCHED = [RECORD, MD_PROFILE, EVALUATOR, PUBLIC_PROJECTION];

const originals = new Map(TOUCHED.map((file) => [file, fs.readFileSync(path.join(root, file))]));

function restore() {
  for (const [file, bytes] of originals) fs.writeFileSync(path.join(root, file), bytes);
}

const disposeGuard = registerMutationRestore(restore);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(file) {
  return createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
}

/** Re-pin a file the case deliberately edits, so the content pin is not what fires. */
/**
 * Simulate an approval issued over these exact bytes: both the live pin and the
 * originally-approved hash move together, as they would in a delta authored
 * today. Moving only the live pin would instead simulate an unrecorded re-pin,
 * which the schema now refuses on its own — and every case below is about
 * whether the PARITY comparison catches the change, not about whether the hash
 * bookkeeping does.
 */
function repin(file) {
  const record = readJson(RECORD);
  const hash = sha256File(file);
  record.deltas[0].authorizedSha256[file] = hash;
  record.deltas[0].originallyApprovedSha256[file] = hash;
  record.deltas[0].beforeAfterEvidence.beforeSha256[file] = hash;
  record.deltas[0].beforeAfterEvidence.afterSha256[file] = hash;
  // Re-pin entries continue the chain from authorizedSha256, so moving the pin
  // to the live bytes strands any that pointed at the old start. Clearing them
  // is part of simulating a clean pin, not part of the case under test: leaving
  // them makes the schema reject the stranded hop and the mutation then proves
  // the bookkeeping works rather than proving the parity comparison does.
  const superseded = record.deltas[0].supersededSha256;
  if (Array.isArray(superseded)) {
    const kept = superseded.filter((entry) => !(entry.path === file && typeof entry.repinnedTo === "string"));
    if (kept.length > 0) record.deltas[0].supersededSha256 = kept;
    else delete record.deltas[0].supersededSha256;
  }
  writeJson(RECORD, record);
}

/**
 * Each case runs the real verifier in a child process, under a hard deadline.
 *
 * The deadline is not decoration. The verifier shells out to `git show` for
 * every compared file, and a git invocation can block indefinitely on a host
 * this harness does not control — a lock, a credential prompt, a partial-clone
 * fetch. Without a bound, one such case turns a blocking CI step into a job that
 * runs until the platform kills it, which is indistinguishable from "still
 * working" and is exactly the failure mode SF-DEFECT-001 was about.
 *
 * A timeout is reported as a harness FAILURE, never as a caught mutation: a case
 * that did not finish proved nothing.
 */
const VERIFIER_TIMEOUT_MS = 300_000;

function runVerifier() {
  const result = spawnSync(process.execPath, ["scripts/verify-expungement-plain-language-values.mjs"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    timeout: VERIFIER_TIMEOUT_MS,
    killSignal: "SIGKILL",
    // The child must never wait on an interactive prompt in a non-interactive
    // run; failing closed is the only acceptable outcome.
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" }
  });
  return {
    status: result.status,
    timedOut: result.error?.code === "ETIMEDOUT" || result.signal === "SIGKILL",
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`
  };
}

const results = [];
let failed = 0;

function mutation(name, mutate, expectedMarker) {
  restore();
  try {
    mutate();
  } catch (error) {
    console.error(`  ERROR    ${name}: could not apply the mutation — ${error.message}`);
    failed += 1;
    restore();
    return;
  }

  const { status, timedOut, output } = runVerifier();
  restore();

  if (timedOut) {
    console.error(`  TIMEOUT  ${name}: the verifier did not finish within ${VERIFIER_TIMEOUT_MS / 1000}s`);
    failed += 1;
    return;
  }
  if (status === 0) {
    console.error(`  SURVIVED ${name}: the parity verifier still passed`);
    failed += 1;
    return;
  }
  if (!output.includes(expectedMarker)) {
    console.error(`  WRONG    ${name}: red, but not for the expected reason`);
    console.error(`           expected to see: ${expectedMarker}`);
    console.error(`           actual output:\n${output.trim().split("\n").map((line) => `             ${line}`).join("\n")}`);
    failed += 1;
    return;
  }

  results.push(name);
  console.log(`  caught   ${name}`);
}

// A note on the expected markers below, several of which changed when the
// Maryland delta MERGED into main.
//
// These cases assert on the message, not just the exit code, so that a red run
// is red for the stated reason. Before the merge, `main` held 35 questions and
// the tree held 36, so a broken approval showed up as a COUNT difference. After
// the merge both hold 36 — the delta has settled — so the same mutations are
// caught by the assertion that now fires first: order, stage metadata, the
// approved-pathway check, or the landed question losing its spec-table
// coverage. Every mutation is still caught, and none is caught by a vaguer
// statement than before; two of them are now caught by a more specific one.
//
// Cases 5 and 10 deliberately share a marker. In both, the approval no longer
// covers MD, so the landed question loses its pin and ordinary parity applies —
// which is exactly the behaviour those cases exist to pin down.

// 1 — a second new question. Approved is exactly one.
mutation(
  "a second new question is added alongside the approved one",
  () => {
    const profile = readJson(MD_PROFILE);
    profile.questions.push({
      id: "pardon_witness_name",
      stage: "timing_and_completion",
      prompt: "Who witnessed the pardon?",
      type: "text",
      options: null,
      required: false,
      source: "derived_from_state_rule_fields"
    });
    profile.flowStages.find((stage) => stage.id === "timing_and_completion").questionIds.push("pardon_witness_name");
    writeJson(MD_PROFILE, profile);
    repin(MD_PROFILE);
  },
  "MD question count changed."
);

// 2 — an existing question is reworded.
mutation(
  "an existing question's wording is changed",
  () => {
    const profile = readJson(MD_PROFILE);
    profile.questions.find((question) => question.id === "pardon_status").prompt = "Did you get a pardon?";
    writeJson(MD_PROFILE, profile);
    repin(MD_PROFILE);
  },
  "pardon_status prompt was"
);

// 3 — existing questions are reordered. The approval permits an append only.
mutation(
  "two existing questions are reordered",
  () => {
    const profile = readJson(MD_PROFILE);
    const first = profile.questions.findIndex((question) => question.id === "ownership_scope");
    const second = profile.questions.findIndex((question) => question.id === "jurisdiction_scope");
    [profile.questions[first], profile.questions[second]] = [profile.questions[second], profile.questions[first]];
    writeJson(MD_PROFILE, profile);
    repin(MD_PROFILE);
  },
  "MD question order changed."
);

// 4 — the approved question lands in a stage the approval does not name.
mutation(
  "the approved question is placed in a different flow stage",
  () => {
    const profile = readJson(MD_PROFILE);
    const from = profile.flowStages.find((stage) => stage.id === "timing_and_completion");
    from.questionIds = from.questionIds.filter((id) => id !== "pardon_signed_date");
    profile.flowStages.find((stage) => stage.id === "exclusion_screen").questionIds.push("pardon_signed_date");
    writeJson(MD_PROFILE, profile);
    repin(MD_PROFILE);
  },
  "MD flow stage/order metadata changed."
);

// 5 — the approval names a different jurisdiction, so it covers nothing here.
mutation(
  "the approval names another jurisdiction",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].jurisdiction = "VA";
    record.deltas[0].projections[1].jurisdictionKey = "VA";
    writeJson(RECORD, record);
  },
  "MD:pardon_signed_date is not covered by the plain-language spec table."
);

// 6 — the approval names a different pathway than the one actually added.
mutation(
  "the approval names another pathway",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].pathwayId = "non-conviction-expungement-under-crim-proc-10-105-a-1";
    writeJson(RECORD, record);
  },
  "does not carry the approved pathway non-conviction-expungement-under-crim-proc-10-105-a-1"
);

// 7 — the approval is widened from a file to a directory prefix.
mutation(
  "the approval is widened to a path prefix",
  () => {
    const record = readJson(RECORD);
    const widened = "src/lib/rcap-engine/compiled/";
    const pins = record.deltas[0].authorizedSha256;
    pins[widened] = pins[MD_PROFILE];
    delete pins[MD_PROFILE];
    record.deltas[0].authorizedPaths = record.deltas[0].authorizedPaths.map((entry) =>
      entry === MD_PROFILE ? widened : entry
    );
    writeJson(RECORD, record);
  },
  "is not a repo-relative file path"
);

// 8 — an approved file's bytes change after approval. No re-pin here: that is
// the point of the case.
mutation(
  "an approved file's bytes drift after approval",
  () => {
    const file = path.join(root, EVALUATOR);
    fs.writeFileSync(file, `${fs.readFileSync(file, "utf8")}\n// drift\n`);
  },
  "the approval does not cover these bytes"
);

mutation(
  "the newly approved prepay projection bytes drift after approval",
  () => {
    const file = path.join(root, PUBLIC_PROJECTION);
    fs.writeFileSync(file, `${fs.readFileSync(file, "utf8")}\n// projection drift\n`);
  },
  "the approval does not cover these bytes"
);

mutation(
  "the runtime reauthorization widens beyond post-projection lifecycle validation",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].scope = "all_shared_runtime_changes";
    writeJson(RECORD, record);
  },
  ".scope is not the exact post-projection lifecycle-validation scope"
);

mutation(
  "the runtime reauthorization breaks its exact prior-hash chain",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].priorSha256 = "0".repeat(64);
    writeJson(RECORD, record);
  },
  ".priorSha256 is not the exact superseded projection hash"
);

mutation(
  "the runtime reauthorization substitutes a different proof",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].proofPath = "scripts/verify-public-profile-projection.mjs";
    writeJson(RECORD, record);
  },
  ".proofPath is not the exact lifecycle-validation proof path"
);

mutation(
  "the runtime reauthorization drops the legal-behavior exclusion",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].doesNotAuthorize = record.runtimeReauthorizations[0].doesNotAuthorize
      .filter((entry) => entry !== "legal_behavior");
    writeJson(RECORD, record);
  },
  ".doesNotAuthorize is not the exact legal/date/question/evaluator/deployment exclusion set"
);

mutation(
  "the runtime reauthorization claims joint legal-team authority",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].authorizedBy = "Roger Roman and the LegalEase legal team";
    writeJson(RECORD, record);
  },
  ".authorizedBy is not the exact controlling fine-tune authority"
);

mutation(
  "the runtime reauthorization widens into production",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].environment = "production";
    writeJson(RECORD, record);
  },
  ".environment is not repository/non-production only"
);

mutation(
  "the runtime reauthorization names another path",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].path = EVALUATOR;
    writeJson(RECORD, record);
  },
  ".path is not the exact public-profile projection path"
);

mutation(
  "the runtime reauthorization substitutes another target hash",
  () => {
    const record = readJson(RECORD);
    record.runtimeReauthorizations[0].newSha256 = "0".repeat(64);
    writeJson(RECORD, record);
  },
  ".newSha256 is not the exact lifecycle-validation projection hash"
);

// 9 — an unrecognised key. Widening by adding a field must not work either.
mutation(
  "the approval carries an unrecognised key",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].allowAdditionalQuestions = true;
    writeJson(RECORD, record);
  },
  'carries the unrecognised key "allowAdditionalQuestions"'
);

// 12 — a re-pin that records nothing. An approved file may legitimately move
// again, but only with the superseded hash, the reason and the proof recorded.
// A bare re-pin is exactly the silent re-authorization the pin exists to stop.
mutation(
  "the superseded hash is dropped after a re-pin",
  () => {
    const record = readJson(RECORD);
    delete record.deltas[0].supersededSha256;
    writeJson(RECORD, record);
    const file = path.join(root, EVALUATOR);
    fs.writeFileSync(file, `${fs.readFileSync(file, "utf8")}\n// a later correction\n`);
    const repinned = readJson(RECORD);
    repinned.deltas[0].authorizedSha256[EVALUATOR] = createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    repinned.deltas[0].beforeAfterEvidence.afterSha256[EVALUATOR] = repinned.deltas[0].authorizedSha256[EVALUATOR];
    writeJson(RECORD, repinned);
  },
  "without recording that hash as superseded"
);

// 13 — a superseded entry that names the hash the delta is pinned to now.
// "Supersede then restore" must not launder an unrecorded shape.
mutation(
  "a superseded entry names the live pin",
  () => {
    const record = readJson(RECORD);
    // The live pin is the END of the chain — authorizedSha256 plus every
    // re-authorization and re-pin — not authorizedSha256 itself. Naming the
    // chain's start would only prove the start was superseded, which it was.
    const repins = (record.deltas[0].supersededSha256 ?? [])
      .filter((entry) => entry.path === EVALUATOR && typeof entry.repinnedTo === "string");
    const live = repins.length > 0
      ? repins[repins.length - 1].repinnedTo
      : record.deltas[0].authorizedSha256[EVALUATOR];
    const target = (record.deltas[0].supersededSha256 ?? []).find(
      (entry) => entry.path === EVALUATOR && typeof entry.repinnedTo !== "string"
    ) ?? record.deltas[0].supersededSha256[0];
    target.sha256 = live;
    writeJson(RECORD, record);
  },
  "records src/lib/rcap-engine/evaluator.ts as superseded at the hash it is currently pinned to"
);

// 14 — a re-pin whose stated reason is a shrug. The record has to say why the
// bytes moved, not merely that they did.
mutation(
  "a superseded entry carries no real reason",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].supersededSha256[0].reason = "updated";
    writeJson(RECORD, record);
  },
  "reason is missing or too short to be a record of anything"
);

// 15 — a re-pin citing a proof that does not exist. A named verifier that is
// not there proves nothing.
mutation(
  "a superseded entry cites a proof that does not exist",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].supersededSha256[0].behaviouralProof = "scripts/verify-nothing-at-all.mjs";
    writeJson(RECORD, record);
  },
  "as proof, and it does not exist"
);

// 16 — a re-pin recorded for a path the delta never authorized.
mutation(
  "a superseded entry names an unauthorized path",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].supersededSha256[0].path = "src/lib/rcap-engine/packet-planner.ts";
    writeJson(RECORD, record);
  },
  "which it does not authorize"
);

// 17 — the dated before/after record is load-bearing. Its after hash must be
// the same exact byte pin the live approval enforces.
mutation(
  "the before-after evidence names different final bytes",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].beforeAfterEvidence.afterSha256[EVALUATOR] = "0".repeat(64);
    writeJson(RECORD, record);
  },
  "beforeAfterEvidence.afterSha256 for src/lib/rcap-engine/evaluator.ts does not equal the live authorized hash"
);

// 10 — the approval is gone. Parity must simply be strict again.
mutation(
  "the approval record is absent",
  () => {
    fs.rmSync(path.join(root, RECORD));
  },
  "MD:pardon_signed_date is not covered by the plain-language spec table."
);

// 11 — the approval is unreadable. A broken approval is not an absent one and
// must not read as permission.
mutation(
  "the approval record is malformed",
  () => {
    fs.writeFileSync(path.join(root, RECORD), "{ this is not json");
  },
  "is not valid JSON"
);

restore();
disposeGuard();

// Byte comparison against what was read at start, rather than `git status`,
// which would call a file untracked on the run that first introduces it and say
// nothing about whether its contents came back.
for (const [file, bytes] of originals) {
  if (!fs.readFileSync(path.join(root, file)).equals(bytes)) {
    console.error(`  DIRTY    ${file} was not restored to its original bytes`);
    failed += 1;
  }
}

const total = results.length + failed;
if (failed > 0) {
  console.error(`\ntest-expungement-parity-delta-mutations FAILED: ${failed} of ${total} did not hold.`);
  process.exit(1);
}

console.log(`\ntest-expungement-parity-delta-mutations passed: ${results.length}/${results.length} mutations red, files restored.`);
console.log("The reviewed Maryland delta is a constraint: it admits exactly its own change and nothing adjacent to it.");
