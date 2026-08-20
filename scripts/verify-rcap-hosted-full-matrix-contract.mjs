#!/usr/bin/env node
// A hosted_full run must actually run the matrix, or conclude failure.
//
//   node scripts/verify-rcap-hosted-full-matrix-contract.mjs
//   node scripts/verify-rcap-hosted-full-matrix-contract.mjs --mutations
//
// Run 32330767286 concluded SUCCESS having skipped every proof that makes it
// acceptance: Auth, the frozen build, registry login, the Checkout gate, the
// golden journey, the payment-and-delivery journey, the galleries. `full` was
// listed on the deploy step and on none of the matrix steps, so the phase
// deployed a Preview and stopped.
//
// That is the worst available failure mode. A red run is a problem you fix; a
// green run that proved nothing is a problem you ship. So two things are
// enforced here: the phase contract is a single normalized decision rather than
// eight hand-written conditions that can quietly disagree, and a final
// always() gate asserts the OUTCOME of every required step, where `skipped` and
// a missing step id both fail.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HOSTED = ".github/workflows/rcap-hosted-acceptance-staging.yml";
const CALLER = ".github/workflows/rcap-f1-ephemeral-staging.yml";

/** Steps a phase claiming the matrix must actually execute. */
const REQUIRED_MATRIX_IDS = [
  "deploy_preview", "auth_identities", "matrix_build", "registry_login",
  "gate_deps", "checkout_gate", "golden_journey", "payment_journey", "galleries"
];

function stepsOf(text) {
  const doc = yaml.load(text);
  return Object.values(doc.jobs)[0].steps.map((s) => ({
    name: s.name ?? "",
    id: s.id ?? null,
    if: s.if === undefined ? null : String(s.if),
    run: typeof s.run === "string" ? s.run : ""
  }));
}

function failures(hostedText, callerText) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const steps = stepsOf(hostedText);
  const byId = new Map(steps.filter((s) => s.id).map((s) => [s.id, s]));

  // The caller must hand hosted_full through as the full phase.
  fail(/inputs\.mode == 'hosted_full' && 'full'/.test(callerText),
    "the caller no longer maps hosted_full to the full phase");

  // One normalized contract, and it must fail closed on an unknown phase.
  const contract = byId.get("contract");
  fail(contract !== undefined, "there is no normalized phase contract step");
  if (contract) {
    fail(/full\)\s*DEPLOY=true;\s*MATRIX=true;\s*GATE=true/.test(contract.run),
      "the contract does not give `full` deploy AND matrix AND checkout gate");
    fail(/unknown phase/.test(contract.run) && /exit 1/.test(contract.run),
      "the contract does not fail closed on an unknown phase");
    fail(/deploy\)\s*DEPLOY=true;\s*MATRIX=false/.test(contract.run),
      "the contract no longer allows a legitimate deploy-only phase");
  }

  // Every required step exists, carries a stable id, and is driven by the
  // normalized flags rather than a hand-written phase list.
  for (const id of REQUIRED_MATRIX_IDS) {
    const step = byId.get(id);
    fail(step !== undefined, `required matrix step '${id}' is missing or lost its id`);
    if (!step) continue;
    fail(step.if !== null && /steps\.contract\.outputs\./.test(step.if),
      `'${id}' is gated on something other than the normalized contract, so it can disagree with the others`);
    fail(!/inputs\.phase ==/.test(step.if),
      `'${id}' still tests inputs.phase directly; that is how 'full' went missing from eight conditions`);
  }

  // The anti-skip gate.
  const gate = byId.get("antiskip");
  fail(gate !== undefined, "there is no anti-skip completion gate");
  if (gate) {
    fail(gate.if !== null && /always\(\)/.test(gate.if),
      "the anti-skip gate is not always(), so a prior failure can skip the gate itself");
    for (const id of REQUIRED_MATRIX_IDS) {
      fail(gate.run.includes(`steps.${id}.outcome`) || hostedText.includes(`steps.${id}.outcome`),
        `the anti-skip gate never reads the outcome of '${id}'`);
    }
    fail(/success\)\s*echo/.test(gate.run), "the gate does not treat only `success` as passing");
    fail(/MISSING/.test(gate.run), "the gate does not fail on an absent step id");
    fail(/exit 1/.test(gate.run), "the gate never fails the job");
  }

  // The verdict must be earned from emitted evidence.
  fail(/verify-rcap-hosted-acceptance-verdicts\.mjs/.test(hostedText),
    "the workflow never runs the hosted verdict verifier, so a run could report success with no evidence behind it");

  return out;
}

const hostedText = fs.readFileSync(path.join(rootDir, HOSTED), "utf8");
const callerText = fs.readFileSync(path.join(rootDir, CALLER), "utf8");
const base = failures(hostedText, callerText);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("verify-rcap-hosted-full-matrix-contract: baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }

  const mutations = [
    ["hosted_full loses deploy+matrix in the contract", (h, c) =>
      [h.replace("full)          DEPLOY=true;  MATRIX=true;  GATE=true",
                 "full)          DEPLOY=true;  MATRIX=false; GATE=false"), c]],
    ["a required step is switched back to a phase list", (h, c) =>
      [h.replace("        id: golden_journey\n        if: steps.contract.outputs.matrix == 'true'",
                 "        id: golden_journey\n        if: inputs.phase == 'accept'"), c]],
    ["the caller passes the wrong phase for hosted_full", (h, c) =>
      [h, c.replace("inputs.mode == 'hosted_full' && 'full'", "inputs.mode == 'hosted_full' && 'deploy'")]],
    ["the Auth step loses its id", (h, c) => [h.replace("        id: auth_identities\n", ""), c]],
    ["the Checkout gate loses its id", (h, c) => [h.replace("        id: checkout_gate\n", ""), c]],
    ["the payment journey loses its id", (h, c) => [h.replace("        id: payment_journey\n", ""), c]],
    ["the golden journey loses its id", (h, c) => [h.replace("        id: golden_journey\n", ""), c]],
    ["the gallery step loses its id", (h, c) => [h.replace("        id: galleries\n", ""), c]],
    ["the anti-skip gate is removed", (h, c) => [h.replace("        id: antiskip\n", ""), c]],
    ["the gate stops being always()", (h, c) =>
      [h.replace("        id: antiskip\n        if: always()", "        id: antiskip\n        if: success()"), c]],
    ["an unknown phase silently becomes deploy-only", (h, c) =>
      [h.replace(`            *)\n              echo "::error::unknown phase '$PHASE'; refusing rather than defaulting to a weaker phase"\n              exit 1\n              ;;`,
                 "            *)             DEPLOY=true;  MATRIX=false; GATE=false ;;"), c]],
    ["the hosted verdict verifier is dropped", (h, c) =>
      [h.replace("node scripts/verify-rcap-hosted-acceptance-verdicts.mjs", "echo skipped"), c]]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const [h, c] = mutate(hostedText, callerText);
    if (h === hostedText && c === callerText) {
      console.log(`MISSED   ${label} (anchor did not match; this check proves nothing)`);
      undetected += 1;
      continue;
    }
    let caught;
    try {
      caught = failures(h, c).length > base.length;
    } catch {
      caught = true;
    }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-hosted-full-matrix-contract FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nA hosted_full run cannot skip the matrix and still report success (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-hosted-full-matrix-contract FAILED — ${base.length} problem(s):\n`);
  for (const problem of base) console.error(` - ${problem}`);
  process.exit(1);
}

console.log("verify-rcap-hosted-full-matrix-contract passed.");
console.log(`  One normalized phase contract; unknown phases fail closed.`);
console.log(`  ${REQUIRED_MATRIX_IDS.length} required matrix steps, each driven by the contract and each asserted by an always() gate.`);
console.log("  skipped, cancelled, failed and absent all fail; only success passes.");
console.log("  The verdict is read from emitted evidence, not from the job reaching its end.");
