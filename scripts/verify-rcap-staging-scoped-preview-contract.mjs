#!/usr/bin/env node
// A payment matrix may only run against an OPEN, identity-narrowed Preview.
//
//   node scripts/verify-rcap-staging-scoped-preview-contract.mjs
//   node scripts/verify-rcap-staging-scoped-preview-contract.mjs --mutations
//
// Run 32365300555 reused Preview dpl_7A6s4jUP… for a payment phase. Everything
// about it checked out — READY, Preview target, correct application SHA,
// correct acceptance project, Stripe configured, and the delivery route
// refusing an unauthenticated caller — and it was still the wrong deployment,
// because its rcapRouteState was `disabled` rather than `staging_scoped`.
//
// The refusal check is what made that invisible: a disabled route answers 503
// and a staging-scoped route answers 401, and both read as "safe". Only one of
// them can transact. So the route state has to be asserted by name at the
// resolution boundary, not inferred from a refusal, and not discovered four
// steps later by the Checkout gate after a build and a registry login.
//
// Deployment metadata is fixed when the deployment is created, so a disabled
// Preview can never be promoted into a payment one. The only correct outcomes
// are reuse of an exact staging-scoped Preview, or exactly one new one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HOSTED = ".github/workflows/rcap-hosted-acceptance-staging.yml";
const RESOLVER = "scripts/rcap-hosted-resolve-preview.mjs";
const DEPLOY = "scripts/rcap-hosted-acceptance-deploy.mjs";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");

function failures(hosted, resolver, deployScript) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const doc = yaml.load(hosted);
  const steps = Object.values(doc.jobs)[0].steps;
  const byId = new Map(steps.filter((s) => s.id).map((s) => [s.id, s]));
  const contract = byId.get("contract");
  const resolveStep = byId.get("resolve_preview");
  const deployStep = byId.get("deploy_preview");
  const gate = byId.get("antiskip");

  // R1 — a payment matrix must not accept a disabled route state.
  fail(/REQUIRED_ROUTE_STATE\s*=\s*"staging_scoped"/.test(resolver),
    "R1 the resolver no longer names staging_scoped as the required route state");
  fail(/function routeStateAcceptable/.test(resolver),
    "R1 the resolver has no route-state decision at all");
  fail(/REQUIRE_STAGING_SCOPED\s*\?\s*state === REQUIRED_ROUTE_STATE\s*:\s*true/.test(resolver),
    "R1 route-state acceptance no longer requires an exact staging_scoped match when the phase demands one");
  fail(/bad\("route_state_matches_this_phase"/.test(resolver),
    "R1 a wrong route state no longer fails the resolution boundary");

  // R2 — the unauthenticated refusal must not stand in for the route state.
  // Both checks must exist and be distinct; 503 and 401 are not equivalent.
  fail(/unauthenticated_render_refuses/.test(resolver),
    "R2 the resolver stopped proving the delivery route refuses unauthenticated callers");
  fail(/ok\("route_state_matches_this_phase"/.test(resolver) && /bad\("route_state_matches_this_phase"/.test(resolver),
    "R2 the route state is no longer asserted independently of the refusal check, so 503 and 401 read alike");

  // R3 — every transacting phase, including hosted_full, must deploy
  // staging_scoped from the normalized contract decision.
  fail(/steps\.contract\.outputs\.require_staging_scoped == 'true' && 'staging_scoped'/.test(hosted),
    "R3 a transacting phase can deploy a route-disabled Preview");

  // R4 — no nontransacting phase, and no unknown phase, may open the route.
  fail(/HOSTED_ROUTE_STATE: \$\{\{ steps\.contract\.outputs\.require_staging_scoped == 'true' && 'staging_scoped' \|\| '' \}\}/.test(hosted),
    "R4 the route-opening ternary no longer falls back to disabled for nontransacting phases");
  fail(!/require_staging_scoped != 'true' && 'staging_scoped'/.test(hosted),
    "R4 route opening has been inverted");
  if (contract) {
    fail(/unknown phase/.test(contract.run ?? "") && /exit 1/.test(contract.run ?? ""),
      "R4 an unknown phase no longer fails closed, so it could reach a route-opening deploy");
  } else {
    fail(false, "R4 there is no normalized phase contract");
  }

  // R1/R5 — the requirement is derived from the same decision that runs the
  // transacting steps, so it cannot drift away from them.
  if (contract) {
    fail(/require_staging_scoped=true/.test(contract.run ?? "") && /require_staging_scoped=false/.test(contract.run ?? ""),
      "R5 the contract no longer emits a route-state requirement");
    fail(/\$MATRIX" = "true" \]\s*\|\|\s*\[ "\$GATE" = "true"/.test(contract.run ?? ""),
      "R5 the route-state requirement is no longer derived from the phases that actually transact");
  }
  fail(/HOSTED_REQUIRE_STAGING_SCOPED: \$\{\{ steps\.contract\.outputs\.require_staging_scoped \}\}/.test(hosted),
    "R5 the resolver is not told whether this phase requires a staging-scoped route");

  // R5 — a disabled supplied Preview must never reach Checkout.
  fail(/refused_no_exact_preview/.test(resolver), "R5 the resolver has no refusal outcome");
  fail(/problems\.length > 0[\s\S]{0,400}refused_no_exact_preview/.test(resolver),
    "R5 a candidate failing a condition no longer leads to refusal");
  const checkoutStep = byId.get("checkout_gate");
  fail(checkoutStep !== undefined, "R5 the Checkout gate step is missing");
  if (resolveStep) {
    fail(/rcap-hosted-resolve-preview\.mjs/.test(resolveStep.run ?? ""),
      "R5 the resolution boundary no longer runs the resolver");
  } else {
    fail(false, "R5 there is no resolve_preview boundary, so nothing screens the Preview before Checkout");
  }

  // R6 — a failed staging-scoped lookup must not fall back to something else.
  fail(!/problems\.length > 0[\s\S]{0,200}created_one_new_preview/.test(resolver),
    "R6 a mismatching candidate falls back to creating a deployment");
  // Anchored on the `&&` so this matches the SEARCH FILTER, not the function
  // declaration `function routeStateAcceptable(state)` — which is what made an
  // earlier version of this check pass while the filter had been gutted.
  fail(/&&\s*routeStateAcceptable\(state\)/.test(resolver),
    "R6 the Vercel search no longer filters candidates by route state, so it could return an unauthorized deployment");
  // Declaration AND call site: renaming only one leaves the other's name in the
  // file, so a name-anywhere test proves nothing.
  fail(/async function findExistingExactPreview\s*\(/.test(resolver),
    "R6 the resolver no longer defines a search for an existing exact Preview");
  fail(/await findExistingExactPreview\s*\(\)/.test(resolver),
    "R6 the resolver never calls the search, so it authorises a new Preview without looking for an existing one");

  // The reuse-only human Checkout gate runs only when the contract scheduled it.
  // Running it under `payment` (GATE=false) contradicted the contract and asked
  // for a supplied deployment id the create path cannot have.
  if (checkoutStep) {
    fail(String(checkoutStep.if).trim() === "steps.contract.outputs.gate == 'true'",
      "the reuse-only Checkout gate is not bound to the contract's GATE flag alone, so a phase that sets GATE=false still runs it");
  }
  if (gate) {
    fail(/if \[ "\$RUNS_GATE" = "true" \]; then\s*\n\s*require "Sandbox Checkout and unpaid 402"/.test(gate.run ?? ""),
      "the anti-skip gate demands the Checkout gate even in phases whose contract did not schedule it");
  }

  // Identity after a fresh create. The resolver's outputs are deliberately empty
  // on the create path — the deployment does not exist when the resolver runs —
  // so the deploy step must publish what it created, and downstream must read it.
  fail(/hostname=\$\{previewUrl/.test(deployScript) && /deployment_id=\$\{evidence\.deployment\?\.id/.test(deployScript),
    "the deploy step does not publish the Preview identity it created, so downstream receives an empty deployment id");
  for (const id of ["auth_identities", "checkout_gate", "payment_journey", "galleries"]) {
    const consumer = byId.get(id);
    fail(
      consumer?.env?.HOSTED_PREVIEW_DEPLOYMENT_ID === "${{ steps.resolve_preview.outputs.deployment_id || steps.deploy_preview.outputs.deployment_id }}",
      `${id} does not fall back to the deploy step's deployment id after a fresh create`
    );
  }

  // Environment provisioning order. Three times now a step has been placed
  // ahead of the step that gives it a runtime: the All50 guards before npm ci,
  // a contract-gated condition above the contract, and the worker-contract
  // diagnosis before both the registry login and the dependency install — which
  // died on ERR_MODULE_NOT_FOUND for 'typescript' before it read anything.
  // The condition always looks right; only the position is wrong.
  {
    const positionOf = (id) => steps.findIndex((s) => s.id === id);
    const diagnose = positionOf("worker_contract");
    const registry = positionOf("registry_login");
    const deps = positionOf("gate_deps");
    fail(diagnose !== -1, "the worker-contract diagnosis step is missing or lost its id");
    if (diagnose !== -1) {
      fail(registry !== -1 && registry < diagnose,
        "the worker-contract diagnosis runs before the registry login, so it cannot pull the private image by digest");
      fail(deps !== -1 && deps < diagnose,
        "the worker-contract diagnosis runs before dependencies are installed, so its TypeScript loader cannot resolve 'typescript'");
      const depsStep = byId.get("gate_deps");
      if (depsStep) {
        fail(/diagnose == 'true'/.test(String(depsStep.if)),
          "the dependency install does not cover the diagnosis phase, so the diagnosis would run against an empty node_modules");
      }
    }
    if (gate) {
      fail(/RUNS_DIAGNOSE/.test(gate.run ?? ""),
        "the anti-skip gate does not assert the diagnosis ran in a phase that claims it");
    }
  }

  // R7 — at most one new Preview.
  fail(deployStep !== undefined, "R7 the deploy step is gone");
  if (deployStep) {
    fail(/resolve_preview\.outputs\.reused != 'true'/.test(String(deployStep.if)),
      "R7 the deploy step runs even when a Preview was reused, so a second Preview can be created");
  }
  fail(steps.filter((s) => /rcap-hosted-acceptance-deploy\.mjs/.test(typeof s.run === "string" ? s.run : "")).length === 1,
    "R7 more than one step can create a deployment");
  fail(/vercelDeployCommandsExecuted: 0/.test(resolver),
    "R7 reuse no longer records that it executed no deployment command");

  // R8 — the final gate must require success, never accept a skip.
  fail(gate !== undefined, "R8 the anti-skip gate is gone");
  if (gate) {
    fail(/always\(\)/.test(String(gate.if)), "R8 the anti-skip gate is not always()");
    fail(/success\)\s*echo/.test(gate.run ?? ""), "R8 the gate no longer treats only success as passing");
    fail(/MISSING/.test(gate.run ?? ""), "R8 the gate no longer fails on an absent step id");
    fail(/O_CONTRACT" != "success"/.test(gate.run ?? ""),
      "R8 the gate can again pass vacuously when the contract did not run");
    for (const id of ["golden_journey", "payment_journey", "galleries", "auth_identities", "matrix_build"]) {
      fail(hosted.includes(`steps.${id}.outcome`), `R8 the gate never reads the outcome of '${id}'`);
    }
  }

  // The payment phase must read the migration sequence back before transacting.
  const migrate = byId.get("migrate_readback");
  fail(migrate !== undefined, "the migration readback step lost its id");
  if (migrate) {
    fail(/inputs\.phase == 'payment'/.test(String(migrate.if)),
      "hosted_payment transacts without reading the authorized migration sequence back");
  }

  // The resolution record must state the route state outright.
  fail(/routeState: extra\.routeState/.test(resolver),
    "the resolution record no longer reports the observed route state");
  fail(/requiredRouteState/.test(resolver),
    "the resolution record no longer reports which route state the phase required");

  return out;
}

const hosted = read(HOSTED);
const resolver = read(RESOLVER);
const deployScript = read(DEPLOY);
const base = failures(hosted, resolver, deployScript);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }

  const M = [
    ["R1 a payment matrix accepts route state disabled", (h, r) =>
      [h, r.replace("REQUIRE_STAGING_SCOPED ? state === REQUIRED_ROUTE_STATE : true", "true")]],
    ["R1 the wrong route state stops failing the boundary", (h, r) =>
      [h, r.replace('bad("route_state_matches_this_phase"', 'ok("route_state_matches_this_phase"')]],
    ["R2 a 503 refusal is treated as equivalent to a staging-scoped 401", (h, r) =>
      [h, r.replace(/ok\("route_state_matches_this_phase"/, 'ok("route_state_unchecked"')]],
    ["R3 a transacting phase deploys without staging_scoped", (h, r) =>
      [h.replace("HOSTED_ROUTE_STATE: ${{ steps.contract.outputs.require_staging_scoped == 'true' && 'staging_scoped' || '' }}",
                 "HOSTED_ROUTE_STATE: ''"), r]],
    ["R4 an unknown phase opens staging_scoped", (h, r) =>
      [h.replace("HOSTED_ROUTE_STATE: ${{ steps.contract.outputs.require_staging_scoped == 'true' && 'staging_scoped' || '' }}",
                 "HOSTED_ROUTE_STATE: ${{ steps.contract.outputs.require_staging_scoped != 'true' && 'staging_scoped' || 'staging_scoped' }}"), r]],
    ["R4 the contract stops failing closed on an unknown phase", (h, r) =>
      [h.replace(`            *)\n              echo "::error::unknown phase '$PHASE'; refusing rather than defaulting to a weaker phase"\n              exit 1\n              ;;`,
                 "            *)             DEPLOY=true;  MATRIX=true;  GATE=true ;;"), r]],
    ["R5 a disabled supplied Preview reaches Checkout", (h, r) =>
      [h, r.replace('emit("refused_no_exact_preview", { hostname: resolvedHost', 'emit("reused_exact_ready_preview", { hostname: resolvedHost')]],
    ["R5 the resolver is no longer told the phase requires staging_scoped", (h, r) =>
      [h.replace("          HOSTED_REQUIRE_STAGING_SCOPED: ${{ steps.contract.outputs.require_staging_scoped }}\n", ""), r]],
    ["R5 the requirement stops being derived from the transacting phases", (h, r) =>
      [h.replace('if [ "$MATRIX" = "true" ] || [ "$GATE" = "true" ]; then', 'if false; then'), r]],
    ["R6 a failed staging-scoped lookup falls back to an unauthorized deployment", (h, r) =>
      [h, r.replace("      && routeStateAcceptable(state);", "      && true;")]],
    ["R6 the resolver stops looking for an existing exact Preview", (h, r) =>
      [h, r.replace("async function findExistingExactPreview", "async function unusedSearch")]],
    ["R7 more than one new Preview is created", (h, r) =>
      [h.replace(" && steps.resolve_preview.outputs.reused != 'true'", ""), r]],
    ["R8 the final gate accepts a skipped matrix step", (h, r) =>
      [h.replace("    success) echo \"  ok       $1\" ;;", "    success|skipped) echo \"  ok       $1\" ;;"), r]],
    ["R8 the gate can pass vacuously again", (h, r) =>
      [h.replace('if [ "$O_CONTRACT" != "success" ]; then', 'if false; then'), r]],
    ["hosted_payment transacts without a migration readback", (h, r) =>
      [h.replace("        if: inputs.phase == 'migrate' || inputs.phase == 'full' || inputs.phase == 'payment'",
                 "        if: inputs.phase == 'migrate' || inputs.phase == 'full'"), r]],
    ["the resolution record stops reporting the observed route state", (h, r) =>
      [h, r.replace("routeState: extra.routeState ?? null,", "")]],
    ["the reuse-only Checkout gate runs in a phase whose contract set GATE=false", (h, r) =>
      [h.replace("        id: checkout_gate\n        if: steps.contract.outputs.gate == 'true'",
                 "        id: checkout_gate\n        if: steps.contract.outputs.matrix == 'true' || steps.contract.outputs.gate == 'true'"), r]],
    ["the anti-skip gate demands a Checkout gate the contract never scheduled", (h, r) =>
      [h.replace('            if [ "$RUNS_GATE" = "true" ]; then\n              require "Sandbox Checkout and unpaid 402"  "$O_GATE"',
                 '            if true; then\n              require "Sandbox Checkout and unpaid 402"  "$O_GATE"'), r]],
    ["the deploy step stops publishing the identity it created", (h, r, d) =>
      [h, r, d.replace("`deployment_id=${evidence.deployment?.id ?? \"\"}`", "`unused=${\"\"}`")]],
    ["the diagnosis is moved ahead of the registry login and npm ci", (h, r, d) => {
      const block = h.match(/      # Placed AFTER the registry login[\s\S]*?run: node scripts\/rcap-worker-contract-contradiction\.mjs/);
      if (!block) return [h, r, d];
      const without = h.replace(block[0] + "\n", "");
      return [without.replace("      - name: Normalize the execution contract for this phase", block[0] + "\n\n      - name: Normalize the execution contract for this phase"), r, d];
    }],
    ["the dependency install stops covering the diagnosis phase", (h, r, d) =>
      [h.replace("        if: steps.contract.outputs.matrix == 'true' || steps.contract.outputs.gate == 'true' || steps.contract.outputs.diagnose == 'true'\n        run: npm ci",
                 "        if: steps.contract.outputs.matrix == 'true' || steps.contract.outputs.gate == 'true'\n        run: npm ci"), r, d]],
    ["the anti-skip gate stops asserting the diagnosis", (h, r, d) =>
      [h.replace(/RUNS_DIAGNOSE/g, "RUNS_UNUSED"), r, d]],
    ["downstream stops falling back to the deploy step's deployment id", (h, r, d) =>
      [h.replace("${{ steps.resolve_preview.outputs.deployment_id || steps.deploy_preview.outputs.deployment_id }}",
                 "${{ steps.resolve_preview.outputs.deployment_id }}"), r, d]]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const [h, r, d] = mutate(hosted, resolver, deployScript);
    if (h === hosted && r === resolver && (d ?? deployScript) === deployScript) {
      console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue;
    }
    let caught;
    try { caught = failures(h, r, d ?? deployScript).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-staging-scoped-preview-contract FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nA transacting phase cannot run against a route-disabled Preview (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-staging-scoped-preview-contract FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}
console.log("verify-rcap-staging-scoped-preview-contract passed.");
console.log("  Checkout, payment, worker, artifact and delivery phases require rcapRouteState=staging_scoped at the resolution boundary.");
console.log("  The route state is asserted by name, never inferred from a refusal: 503 and 401 both look safe and only one can transact.");
console.log("  Every transacting contract phase opens the scoped route; nontransacting and unknown phases stay disabled or fail closed.");
console.log("  An exact staging-scoped Preview is reused if one exists; otherwise exactly one is created, never two.");
