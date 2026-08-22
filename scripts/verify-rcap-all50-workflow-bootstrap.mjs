#!/usr/bin/env node
// The All50 job must give its unconditional guards the environment they need.
//
//   node scripts/verify-rcap-all50-workflow-bootstrap.mjs
//   node scripts/verify-rcap-all50-workflow-bootstrap.mjs --mutations
//
// A tools-only pull request produced this sequence: the CI scope detector said
// RCAP was not affected, so `Set up Node` and `npm ci` were skipped — and the
// worker tag guard, which is deliberately unconditional, ran anyway against a
// tree with no node_modules and died on `Cannot find package 'js-yaml'`.
//
// The verifier had not failed its contract. The job had failed to provide the
// execution environment it promised, and the failure looked like a broken
// guard rather than a broken workflow.
//
// The release guards are unconditional on purpose: a workflow-only edit is
// exactly how worker publication, tag integrity, fingerprint and digest
// binding get weakened, so those are the changes they most need to see. That
// makes "the guards run without dependencies" a reachable state unless the
// bootstrap is unconditional too.
//
// js-yaml is deliberately NOT added to package.json to fix this. package.json
// is a canonical image input for both the application and the worker, so
// declaring a dependency there would change the fingerprint and invalidate the
// accepted worker digest — a release-scale consequence for a CI-ordering bug.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const WORKFLOW = ".github/workflows/rcap-all50-handoff.yml";

/** Guards that must run for every change, including workflow-only ones. */
const UNCONDITIONAL_GUARDS = [
  "scripts/verify-rcap-deployment-closure.mjs",
  "scripts/verify-rcap-acceptance-migration-sequence.mjs",
  "scripts/test-rcap-acceptance-migration-sequence-mutations.mjs",
  "scripts/test-rcap-worker-digest-binding-mutations.mjs",
  "scripts/verify-rcap-worker-tag-guard.mjs"
];

const SCOPE_CONDITION = /steps\.scope\.outputs\.rcapAffected/;

function stepsOf(text) {
  const doc = yaml.load(text);
  const job = Object.values(doc.jobs)[0];
  return job.steps.map((s, i) => ({
    index: i,
    name: s.name ?? "",
    uses: s.uses ?? "",
    run: typeof s.run === "string" ? s.run : "",
    if: s.if ?? null
  }));
}

function failures(text) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const steps = stepsOf(text);

  const setup = steps.find((s) => /actions\/setup-node/.test(s.uses));
  const installs = steps.filter((s) => /npm ci\b/.test(s.run));

  // 2 and 3. the bootstrap must exist and must not be scope-gated
  fail(setup !== undefined, "the job never sets up Node");
  fail(installs.length > 0, "the job never installs dependencies");
  if (setup) {
    fail(setup.if === null || !SCOPE_CONDITION.test(String(setup.if)),
      "Set up Node is gated on the RCAP scope; a tools-only run would leave the unconditional guards without a runtime");
  }
  // 5 and 6. exactly one installation per job, whatever the scope decides
  fail(installs.length === 1, `${installs.length} dependency installations in one job; there must be exactly one`);
  for (const install of installs) {
    fail(install.if === null || !SCOPE_CONDITION.test(String(install.if)),
      "npm ci is gated on the RCAP scope; the unconditional guards would run against an empty node_modules");
  }

  // 1, 4 and 7. every dependency-using guard is unconditional AND ordered after
  // the install. Either half alone is insufficient: unconditional-but-early
  // fails on a missing module, gated-but-late silently proves nothing.
  const installIndex = installs.length > 0 ? installs[0].index : Number.POSITIVE_INFINITY;
  const setupIndex = setup ? setup.index : Number.POSITIVE_INFINITY;
  for (const guard of UNCONDITIONAL_GUARDS) {
    const step = steps.find((s) => s.run.includes(guard));
    fail(step !== undefined, `${guard} is not run by this workflow at all`);
    if (!step) continue;
    fail(step.if === null || !SCOPE_CONDITION.test(String(step.if)),
      `${guard} has been moved inside the RCAP-only block; a workflow-only change would skip the guard that exists to catch workflow-only changes`);
    fail(step.index > installIndex, `${guard} runs before dependencies are installed`);
    fail(step.index > setupIndex, `${guard} runs before Node is set up`);
  }

  return out;
}

const text = fs.readFileSync(path.join(rootDir, WORKFLOW), "utf8");
const base = failures(text);

if (MUTATIONS) {
  const mutations = [
    ["setup-node becomes scope-gated again", (t) =>
      t.replace("      - name: Set up Node\n        uses: actions/setup-node@v4",
                "      - name: Set up Node\n        if: ${{ steps.scope.outputs.rcapAffected == 'true' }}\n        uses: actions/setup-node@v4")],
    ["npm ci becomes scope-gated again", (t) =>
      t.replace("      - name: Install dependencies\n        run: npm ci",
                "      - name: Install dependencies\n        if: ${{ steps.scope.outputs.rcapAffected == 'true' }}\n        run: npm ci")],
    ["a second npm ci is introduced", (t) =>
      t.replace("      - name: Install dependencies\n        run: npm ci",
                "      - name: Install dependencies\n        run: npm ci\n\n      - name: Install dependencies again\n        run: npm ci")],
    ["the worker tag guard is moved inside the RCAP-only block", (t) =>
      t.replace("      - name: Verify the worker publication cannot move an existing source-SHA tag\n        run: node scripts/verify-rcap-worker-tag-guard.mjs",
                "      - name: Verify the worker publication cannot move an existing source-SHA tag\n        if: ${{ steps.scope.outputs.rcapAffected == 'true' }}\n        run: node scripts/verify-rcap-worker-tag-guard.mjs")],
    ["a dependency-using guard is moved ahead of installation", (t) => {
      const guard = "      - name: Verify the worker publication cannot move an existing source-SHA tag\n        run: node scripts/verify-rcap-worker-tag-guard.mjs\n";
      const without = t.replace(guard, "");
      return without.replace("      - name: Set up Node\n", `${guard}\n      - name: Set up Node\n`);
    }],
    ["the tag guard is dropped from the workflow entirely", (t) =>
      t.replace("        run: node scripts/verify-rcap-worker-tag-guard.mjs", "        run: echo skipped")]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = mutate(text);
    if (mutated === text) {
      console.log(`MISSED   ${label} (mutation anchor did not match; the check would prove nothing)`);
      undetected += 1;
      continue;
    }
    let caught;
    try {
      caught = failures(mutated).length > base.length;
    } catch {
      caught = true; // an unparseable workflow is also a caught regression
    }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-all50-workflow-bootstrap FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe unconditional release guards cannot be starved of their runtime or quietly skipped (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-all50-workflow-bootstrap FAILED — ${base.length} problem(s):\n`);
  for (const problem of base) console.error(` - ${problem}`);
  process.exit(1);
}

const steps = stepsOf(text);
const install = steps.find((s) => /npm ci\b/.test(s.run));
console.log("verify-rcap-all50-workflow-bootstrap passed.");
console.log(`  Node setup and one npm ci run unconditionally, at step ${install.index + 1}.`);
console.log(`  ${UNCONDITIONAL_GUARDS.length} release guards run for every change, all ordered after installation.`);
console.log("  A workflow-only change still executes the guards that exist to catch workflow-only changes.");
