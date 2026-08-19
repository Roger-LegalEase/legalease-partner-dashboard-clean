#!/usr/bin/env node
// Proof that the problematic-PDF contract is actually reached by CI.
//
//   node scripts/verify-rcap-problematic-pdf-ci-wiring.mjs
//   node scripts/verify-rcap-problematic-pdf-ci-wiring.mjs --mutations
//
// A verifier nothing runs protects nothing. This one was recorded as
// `keep_available` precisely because the obvious way to wire it -- an npm
// script -- edits package.json, which is a worker image input: adding an entry
// there changes the image fingerprint and forces a rebuild for a check that
// alters nothing the image contains. The workflow file is in neither
// image-input set, so the lane's guards are invoked from it directly, the same
// way the migration-sequence, worker-tag and hosted-verdict guards already are.
//
// What this asserts is that the invocation is really there and really
// unconditional. A step guarded by `if: steps.scope.outputs.rcapAffected` would
// be skipped on exactly the change that matters most -- someone flipping a
// problematic route sellable in a commit the scope detector does not read as
// RCAP-affected -- so a conditional step is treated as no step at all.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withTrackedMutation, assertTreeNotMidMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/rcap-all50-handoff.yml";
const DISPOSITIONS = "data/rcap-verifier-dispositions.json";
const mutationsMode = process.argv.includes("--mutations");

const abs = (repoPath) => path.join(rootDir, repoPath);

// Every invocation the lane depends on, and whether a conditional form is
// tolerable for it. None of them is.
const REQUIRED_STEPS = [
  { command: "node scripts/verify-rcap-problematic-pdf-remediation.mjs", label: "the lane contract" },
  { command: "node scripts/verify-rcap-problematic-pdf-remediation.mjs --mutations", label: "the lane contract's mutation proof" },
  { command: "node scripts/verify-rcap-problematic-pdf-ci-wiring.mjs", label: "this wiring check" }
];

/**
 * The workflow's steps, as (name, run, if) triples.
 *
 * Parsed by structure rather than with a YAML library, which the repository
 * does not depend on for this purpose. Only two shapes matter -- a `- name:`
 * that opens a step and the `run:` and `if:` keys under it -- and both are
 * unambiguous at this indentation.
 */
function workflowSteps(text) {
  const steps = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const stepStart = /^\s{6}- name:\s*(.*)$/.exec(rawLine);
    if (stepStart) {
      if (current) steps.push(current);
      current = { name: stepStart[1].trim(), run: null, if: null };
      continue;
    }
    if (!current) continue;
    const runKey = /^\s{8}run:\s*(.*)$/.exec(rawLine);
    if (runKey) { current.run = runKey[1].trim(); continue; }
    const ifKey = /^\s{8}if:\s*(.*)$/.exec(rawLine);
    if (ifKey) { current.if = ifKey[1].trim(); continue; }
    // A run block continued onto following lines still belongs to this step.
    if (current.run !== null && /^\s{10}\S/.test(rawLine)) current.run += ` ${rawLine.trim()}`;
  }
  if (current) steps.push(current);
  return steps;
}

function runChecks() {
  const failures = new Map();
  const fail = (check, message) => {
    if (!failures.has(check)) failures.set(check, []);
    failures.get(check).push(message);
  };

  if (!fs.existsSync(abs(WORKFLOW))) {
    fail("workflow_present", `${WORKFLOW} does not exist`);
    return failures;
  }
  const steps = workflowSteps(fs.readFileSync(abs(WORKFLOW), "utf8"));

  for (const required of REQUIRED_STEPS) {
    // Matched exactly, so a step running the verifier with different arguments
    // does not satisfy a requirement for the arguments the lane needs.
    const matching = steps.filter((step) => step.run === required.command);
    if (matching.length === 0) {
      fail("ci_invokes_the_lane_contract", `${WORKFLOW} has no step running \`${required.command}\` (${required.label})`);
      continue;
    }
    if (matching.every((step) => step.if !== null)) {
      fail("ci_invocation_is_unconditional", `every step running \`${required.command}\` is conditional (${matching.map((s) => s.if).join("; ")}); a skipped guard is not a guard`);
    }
  }

  // The disposition register has to agree with reality, or the next reader is
  // told this verifier is merely available while CI is in fact depending on it.
  const register = fs.existsSync(abs(DISPOSITIONS)) ? JSON.parse(fs.readFileSync(abs(DISPOSITIONS), "utf8")) : null;
  const entry = register?.entries?.["verify-rcap-problematic-pdf-remediation.mjs"] ?? null;
  if (!entry) {
    fail("disposition_matches_reality", "the verifier disposition register has no entry for verify-rcap-problematic-pdf-remediation.mjs");
  } else if (entry.disposition !== "wired") {
    fail("disposition_matches_reality", `the register records verify-rcap-problematic-pdf-remediation.mjs as ${entry.disposition}, but this workflow invokes it directly`);
  }
  const own = register?.entries?.["verify-rcap-problematic-pdf-ci-wiring.mjs"] ?? null;
  if (!own || own.disposition !== "wired") {
    fail("disposition_matches_reality", `the register records this wiring check as ${own?.disposition ?? "absent"}, but this workflow invokes it directly`);
  }

  return failures;
}

function report(failures, label) {
  const total = [...failures.values()].reduce((n, list) => n + list.length, 0);
  if (total === 0) { console.log(`OK ${label}`); return true; }
  console.error(`FAIL ${label} — ${total} failure(s) across ${failures.size} check(s)`);
  for (const [check, messages] of failures) {
    console.error(`  ${check}:`);
    for (const message of messages) console.error(`    - ${message}`);
  }
  return false;
}

assertTreeNotMidMutation("verify-rcap-problematic-pdf-ci-wiring.mjs");
if (!report(runChecks(), "problematic-PDF CI wiring")) process.exit(1);
if (!mutationsMode) process.exit(0);

const CASES = [
  {
    name: "the CI invocation is silently removed",
    expect: "ci_invokes_the_lane_contract",
    apply: () => {
      const text = fs.readFileSync(abs(WORKFLOW), "utf8");
      fs.writeFileSync(abs(WORKFLOW), text.replace(
        "        run: node scripts/verify-rcap-problematic-pdf-remediation.mjs\n",
        "        run: echo skipped\n"
      ));
    }
  },
  {
    name: "the CI invocation is made conditional",
    expect: "ci_invocation_is_unconditional",
    apply: () => {
      const text = fs.readFileSync(abs(WORKFLOW), "utf8");
      fs.writeFileSync(abs(WORKFLOW), text.replace(
        "      - name: Verify the problematic-PDF register, evidence and dispositions\n        run: node scripts/verify-rcap-problematic-pdf-remediation.mjs\n",
        "      - name: Verify the problematic-PDF register, evidence and dispositions\n        if: ${{ steps.scope.outputs.rcapAffected == 'true' }}\n        run: node scripts/verify-rcap-problematic-pdf-remediation.mjs\n"
      ));
    }
  },
  {
    name: "the disposition register stops saying the verifier is wired",
    expect: "disposition_matches_reality",
    apply: () => {
      const register = JSON.parse(fs.readFileSync(abs(DISPOSITIONS), "utf8"));
      register.entries["verify-rcap-problematic-pdf-remediation.mjs"].disposition = "keep_available";
      fs.writeFileSync(abs(DISPOSITIONS), `${JSON.stringify(register, null, 2)}\n`);
    }
  }
];

let mutationFailures = 0;
for (const testCase of CASES) {
  const wentRed = await withTrackedMutation(`verify-rcap-problematic-pdf-ci-wiring: ${testCase.name}`, [WORKFLOW, DISPOSITIONS], async () => {
    testCase.apply();
    return runChecks().has(testCase.expect);
  });
  if (wentRed) console.log(`  OK mutation "${testCase.name}" turns ${testCase.expect} red`);
  else { mutationFailures += 1; console.error(`  FAIL mutation "${testCase.name}" did NOT turn ${testCase.expect} red`); }
}

if (!report(runChecks(), "problematic-PDF CI wiring, after mutations")) {
  console.error("FAIL the tree did not come back clean after the mutation pass");
  process.exit(1);
}
if (mutationFailures > 0) {
  console.error(`FAIL ${mutationFailures} mutation(s) did not turn their check red`);
  process.exit(1);
}
console.log(`OK problematic-PDF CI wiring mutations — ${CASES.length} cases, every one turns its own check red`);
