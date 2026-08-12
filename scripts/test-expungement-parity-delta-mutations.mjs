import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

// Signal-safe restoration. A `finally` block does not survive SIGTERM, and two
// interrupted runs left tracked mutations behind. The journal this writes is
// recovered by the next repository command even if this process is killed.
registerTrackedMutation("test-expungement-parity-delta-mutations.mjs", ["data/expungement-ai/screening-parity-approved-deltas.json", "src/lib/rcap-engine/compiled/profiles/MD-maryland.json"]);


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
const TOUCHED = [RECORD, MD_PROFILE, EVALUATOR];

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
function repin(file) {
  const record = readJson(RECORD);
  record.deltas[0].authorizedSha256[file] = sha256File(file);
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
  "approved after-count is 36"
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
  "reorders questions that already existed"
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
  "is not an append of pardon_signed_date"
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
  "MD question count changed."
);

// 6 — the approval names a different pathway than the one actually added.
mutation(
  "the approval names another pathway",
  () => {
    const record = readJson(RECORD);
    record.deltas[0].pathwayId = "non-conviction-expungement-under-crim-proc-10-105-a-1";
    writeJson(RECORD, record);
  },
  "only non-conviction-expungement-under-crim-proc-10-105-a-1 is approved"
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

// 10 — the approval is gone. Parity must simply be strict again.
mutation(
  "the approval record is absent",
  () => {
    fs.rmSync(path.join(root, RECORD));
  },
  "MD question count changed."
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
