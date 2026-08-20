#!/usr/bin/env node
// Reusing a Preview must never quietly become deploying a different one.
//
//   node scripts/verify-rcap-preview-reuse-contract.mjs
//   node scripts/verify-rcap-preview-reuse-contract.mjs --mutations
//
// When an operator names one deployment to test against, the dangerous
// behaviour is not refusing — it is helpfulness. A resolver that cannot
// confirm the named deployment, and deploys a fresh one instead, produces a
// green matrix against a Preview nobody chose, and the report still says the
// acceptance passed.
//
// So the contract is: a supplied candidate matches every condition, or the run
// REFUSES. Creating a Preview is allowed only when no candidate was supplied at
// all. And because reuse legitimately skips the raw deploy step, the anti-skip
// gate has to assert the RESOLUTION boundary rather than the deploy step, or
// reuse would read as a skipped requirement.
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
const RESOLVER = "scripts/rcap-hosted-resolve-preview.mjs";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");

function failures(hosted, caller, resolver) {
  const out = [];
  const fail = (c, m) => { if (!c) out.push(m); };
  const doc = yaml.load(hosted);
  const steps = Object.values(doc.jobs)[0].steps;
  const byId = new Map(steps.filter((s) => s.id).map((s) => [s.id, s]));

  // 1. hosted_full must be able to receive a hostname, and the caller must send it.
  const inputs = (yaml.load(hosted).on ?? yaml.load(hosted)[true]).workflow_call.inputs;
  fail(inputs.preview_hostname !== undefined, "the hosted workflow accepts no preview_hostname, so a supplied hostname is ignored");
  fail(/preview_hostname: \$\{\{ inputs\.preview_hostname \}\}/.test(caller),
    "the caller does not forward preview_hostname to the hosted workflow");

  // The resolver boundary exists and always runs for phases needing a Preview.
  const resolve = byId.get("resolve_preview");
  fail(resolve !== undefined, "there is no resolve_preview boundary");
  if (resolve) {
    fail(/contract\.outputs\.(deploy|matrix|gate)/.test(String(resolve.if)),
      "resolve_preview is not tied to the phase contract");
    fail(/rcap-hosted-resolve-preview\.mjs/.test(resolve.run ?? ""), "resolve_preview does not run the resolver");
  }

  // 8. an exact reuse match must suppress every deployment command.
  const deploy = byId.get("deploy_preview");
  fail(deploy !== undefined, "the deploy step is gone");
  if (deploy) {
    fail(/resolve_preview\.outputs\.reused != 'true'/.test(String(deploy.if)),
      "the deploy step still runs when a Preview was reused; reuse must execute no deployment command");
  }

  // 9. downstream reads the resolved identity from the one boundary.
  // The resolver first, with the deploy step as the only permitted fallback:
  // on the create path the resolver's outputs are legitimately empty, because
  // the deployment does not exist yet when the resolver runs. What must never
  // appear downstream is a raw `inputs.preview_*`, which would bypass the
  // boundary entirely.
  fail(/HOSTED_PREVIEW_HOSTNAME: \$\{\{ steps\.resolve_preview\.outputs\.hostname( \|\| steps\.deploy_preview\.outputs\.hostname)? \}\}/.test(hosted),
    "downstream steps do not read the hostname from the resolution boundary");
  fail(/HOSTED_PREVIEW_DEPLOYMENT_ID: \$\{\{ steps\.resolve_preview\.outputs\.deployment_id( \|\| steps\.deploy_preview\.outputs\.deployment_id)? \}\}/.test(hosted),
    "downstream steps do not read the deployment id from the resolution boundary");
  {
    const consumers = steps.filter((s) => s.id && s.id !== "resolve_preview");
    const bypassing = consumers.filter((s) => /HOSTED_PREVIEW_(HOSTNAME|DEPLOYMENT_ID): \$\{\{ inputs\./.test(JSON.stringify(s.env ?? {})));
    fail(bypassing.length === 0,
      `${bypassing.map((s) => s.id).join(", ")} read the Preview identity straight from the workflow inputs, bypassing the resolution boundary`);
  }

  // 11. the gate asserts the boundary, not the raw deploy step.
  const gate = byId.get("antiskip");
  fail(gate !== undefined, "the anti-skip gate is gone");
  if (gate) {
    fail(/O_RESOLVE/.test(gate.run ?? ""), "the anti-skip gate never asserts the Preview resolution outcome");
    fail(/Preview resolution boundary/.test(gate.run ?? ""), "the gate does not require the resolution boundary to succeed");
    fail(/O_REUSED/.test(gate.run ?? ""), "the gate cannot tell a legitimate reuse from a skipped deployment");
  }

  // 2-7, 10, 12. the resolver's own conditions.
  fail(/refused_no_exact_preview/.test(resolver), "the resolver has no refusal outcome");
  fail(/reused_exact_ready_preview/.test(resolver), "the resolver has no reuse outcome");
  fail(/created_one_new_preview/.test(resolver), "the resolver has no create outcome");
  fail(/readyState === "READY"/.test(resolver), "the resolver does not require READY");
  // Bind the COMPARISON to the assertion it feeds. Testing for the ok()/bad()
  // pair alone passes even when the condition has been replaced by `true`,
  // because both branches remain in the source either way.
  fail(/target !== "production"\s*\?\s*ok\("target_is_preview_not_production"/.test(resolver),
    "the resolver does not refuse a production deployment on the supplied-candidate path");
  fail(/deployedSha === APPLICATION_SHA/.test(resolver),
    "the resolver does not compare the supplied candidate's deployed application SHA against the authorized one");
  fail(/bad\("deployment_carries_the_authorized_application_sha"/.test(resolver),
    "a wrong application SHA no longer fails the supplied candidate");
  fail(/no_production_alias_attached/.test(resolver), "the resolver does not check production aliases");
  fail(/unauthenticated_render_refuses/.test(resolver), "the resolver does not prove the delivery route still refuses");
  fail(/deploymentIdWasResolvedFromHostname/.test(resolver), "the resolver does not record that it resolved the id from the hostname");
  fail(/vercelDeployCommandsExecuted: 0/.test(resolver), "the resolver does not record that reuse executed no deployment command");
  // The refusal must not fall back to creating one.
  fail(
    /problems\.length > 0[\s\S]{0,400}refused_no_exact_preview/.test(resolver),
    "a mismatching candidate does not lead to refusal"
  );
  fail(!/problems\.length > 0[\s\S]{0,200}created_one_new_preview/.test(resolver),
    "a mismatching candidate falls back to creating a deployment");

  return out;
}

const hosted = read(HOSTED);
const caller = read(CALLER);
const resolver = read(RESOLVER);
const base = failures(hosted, caller, resolver);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }
  const M = [
    ["hosted_full ignores a supplied Preview hostname", (h, c, r) => [h.replace("      preview_hostname:\n", "      unused_hostname:\n"), c, r]],
    ["reuse accepts a non-READY deployment", (h, c, r) => [h, c, r.replace('readyState === "READY"', "true")]],
    ["reuse accepts a Production deployment", (h, c, r) => [h, c, r.replaceAll('target !== "production"', "true")]],
    ["reuse accepts the wrong application SHA", (h, c, r) => [h, c, r.replaceAll("deployedSha === APPLICATION_SHA", "true")]],
    ["reuse stops checking production aliases", (h, c, r) => [h, c, r.replace(/no_production_alias_attached/g, "alias_check_removed")]],
    ["reuse stops proving the route refuses", (h, c, r) => [h, c, r.replace(/unauthenticated_render_refuses/g, "route_check_removed")]],
    ["a mismatching candidate falls back to deploying", (h, c, r) =>
      [h, c, r.replace('emit("refused_no_exact_preview", { hostname: resolvedHost', 'emit("created_one_new_preview", { hostname: resolvedHost')]],
    ["an exact reuse match still runs the deploy step", (h, c, r) =>
      [h.replace(" && steps.resolve_preview.outputs.reused != 'true'", ""), c, r]],
    ["downstream uses a hostname other than the resolved one", (h, c, r) =>
      [h.replace("HOSTED_PREVIEW_HOSTNAME: ${{ steps.resolve_preview.outputs.hostname || steps.deploy_preview.outputs.hostname }}", "HOSTED_PREVIEW_HOSTNAME: ${{ inputs.preview_hostname }}"), c, r]],
    ["the deployment id is never resolved from the hostname", (h, c, r) =>
      [h, c, r.replace(/deploymentIdWasResolvedFromHostname/g, "unused")]],
    ["the anti-skip gate treats reuse as a skipped requirement", (h, c, r) =>
      [h.replace(/O_RESOLVE/g, "O_UNUSED"), c, r]],
    ["the caller stops forwarding the hostname", (h, c, r) =>
      [h, c.replace("      preview_hostname: ${{ inputs.preview_hostname }}\n", ""), r]]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const [h, c, r] = mutate(hosted, caller, resolver);
    if (h === hosted && c === caller && r === resolver) {
      console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue;
    }
    let caught;
    try { caught = failures(h, c, r).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-preview-reuse-contract FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nA named Preview is reused exactly, or the run refuses — never replaced by a different one (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-preview-reuse-contract FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}
console.log("verify-rcap-preview-reuse-contract passed.");
console.log("  One resolution boundary: reused_exact_ready_preview | created_one_new_preview | refused_no_exact_preview.");
console.log("  A supplied candidate matches every condition or the run refuses; it is never replaced by a fresh deployment.");
console.log("  Reuse executes no Vercel deployment command, and the anti-skip gate asserts the boundary rather than the deploy step.");
