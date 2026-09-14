#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_PATH = path.join(ROOT, "scripts/rcap-hosted-acceptance-vercel-identity.mjs");
const TEAM_SLUG = "roger947s-projects";
const PROJECT_NAME = "legalease-partner-dashboard-clean";

const RUNTIME_SCRIPTS = [
  "rcap-hosted-acceptance-preflight.mjs",
  "rcap-hosted-acceptance-deploy.mjs",
  "rcap-hosted-acceptance-auth-config.mjs",
  "rcap-hosted-acceptance-gallery.mjs",
  "rcap-hosted-acceptance-payment.mjs",
  "rcap-hosted-acceptance-prepare.mjs",
  "rcap-hosted-checkout-gate.mjs",
  "rcap-hosted-resolve-preview.mjs",
  "rcap-vercel-failure-audit.mjs"
];

function jsonResponse(status, value) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(value?.teams && !value.pagination ? { ...value, pagination: { next: null } } : value); }
  };
}

test("identity resolver pins the public team slug and project name", async () => {
  assert.equal(fs.existsSync(MODULE_PATH), true, "the Vercel identity module must exist");
  const identity = await import(`${new URL(`file://${MODULE_PATH}`).href}?${Date.now()}`);
  assert.equal(identity.HOSTED_VERCEL_TEAM_SLUG, TEAM_SLUG);
  assert.equal(identity.HOSTED_VERCEL_TEAM_ID, "team_4qLmZK9WI6xIy5vjYC0IF3ae");
  assert.equal(identity.HOSTED_VERCEL_PROJECT_ID, "prj_cdgwGzFqIHgEUlzEburSLaZETdQV");
  assert.equal(identity.HOSTED_VERCEL_PROJECT_NAME, PROJECT_NAME);
});

test("hosted return origin is deterministic, SHA-scoped, and never Production", async () => {
  const { expectedHostedReturnOrigin } = await import(`${new URL(`file://${MODULE_PATH}`).href}?${Date.now()}`);
  const sha = "441ee3188ee52047a012232d8d11f890a09b4ac5";
  assert.equal(
    expectedHostedReturnOrigin(sha),
    "https://legalease-rcap-441ee3188ee5-roger947s-projects.vercel.app"
  );
  assert.doesNotMatch(expectedHostedReturnOrigin(sha), /expungement\.ai/);
  assert.throws(() => expectedHostedReturnOrigin("441ee3188ee5"), /40-character/);
});

test("scoped PAT resolves pinned project even when team enumeration is forbidden", async () => {
  const { resolveHostedVercelIdentity, HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID } = await import('./rcap-hosted-acceptance-vercel-identity.mjs');
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Authorization, 'Bearer synthetic');
    if (new URL(url).pathname === '/v2/teams') return jsonResponse(403, { error: 'forbidden' });
    assert.equal(url, `https://api.vercel.com/v9/projects/${PROJECT_NAME}?teamId=${HOSTED_VERCEL_TEAM_ID}`);
    return jsonResponse(200, { id: HOSTED_VERCEL_PROJECT_ID, name: PROJECT_NAME, accountId: HOSTED_VERCEL_TEAM_ID });
  };
  assert.equal((await fetchImpl('https://api.vercel.com/v2/teams', {redirect:'error',signal:AbortSignal.timeout(1000),headers:{Authorization:'Bearer synthetic'}})).status, 403);
  calls.length = 0;
  const identity = await resolveHostedVercelIdentity({ token:'synthetic', fetchImpl });
  assert.deepEqual(identity, {teamSlug:TEAM_SLUG,teamId:HOSTED_VERCEL_TEAM_ID,projectName:PROJECT_NAME,projectId:HOSTED_VERCEL_PROJECT_ID});
  assert.equal(calls.length, 1);
});

test("identity refuses mismatches, absent ownership, failures and missing credentials", async () => {
  const { resolveHostedVercelIdentity, HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID } = await import('./rcap-hosted-acceptance-vercel-identity.mjs');
  const project = { id:HOSTED_VERCEL_PROJECT_ID, name:PROJECT_NAME, accountId:HOSTED_VERCEL_TEAM_ID };
  for (const [patch, code] of [
    [{id:'prj_other'}, 'PINNED_PROJECT_ID_MISMATCH'],
    [{id:null}, 'PINNED_PROJECT_ID_MISMATCH'],
    [{name:'other'}, 'PINNED_PROJECT_NAME_MISMATCH'],
    [{accountId:undefined}, 'PINNED_PROJECT_TEAM_MISMATCH'],
    [{accountId:null}, 'PINNED_PROJECT_TEAM_MISMATCH'],
    [{accountId:'team_other'}, 'PINNED_PROJECT_TEAM_MISMATCH'],
    [{teamId:'team_other'}, 'PINNED_PROJECT_TEAM_MISMATCH'],
    [{ownerId:'team_other'}, 'PINNED_PROJECT_TEAM_MISMATCH']
  ]) await assert.rejects(resolveHostedVercelIdentity({token:'synthetic',fetchImpl:async()=>jsonResponse(200,{...project,...patch})}), {code});
  for (const status of [401,403,404,500]) await assert.rejects(resolveHostedVercelIdentity({token:'synthetic',fetchImpl:async()=>jsonResponse(status,{error:'SECRET_BODY'})}), error => {assert.match(error.message,new RegExp(`HTTP ${status}`));assert.doesNotMatch(error.message,/SECRET/);return true;});
  await assert.rejects(resolveHostedVercelIdentity({token:'',fetchImpl:()=>assert.fail('unexpected request')}), /VERCEL_TOKEN/);
  await assert.rejects(resolveHostedVercelIdentity({token:'synthetic',fetchImpl:async()=>{throw new Error('SECRET');}}), /failed or timed out/);
  await assert.rejects(resolveHostedVercelIdentity({token:'synthetic',fetchImpl:async()=>({ok:true,text:async()=>'invalid'})}), /non-JSON/);
});

test("scoped URL and CLI environment use resolved IDs while scope stays the public slug", async () => {
  assert.equal(fs.existsSync(MODULE_PATH), true, "the Vercel identity module must exist");
  const { hostedVercelCliEnvironment, hostedVercelScopedUrl } = await import(
    `${new URL(`file://${MODULE_PATH}`).href}?${Date.now()}`
  );
  const identity = {
    teamSlug: TEAM_SLUG,
    teamId: "team_exact",
    projectName: PROJECT_NAME,
    projectId: "prj_exact"
  };
  assert.equal(
    hostedVercelScopedUrl("/v6/deployments?state=READY", identity),
    "https://api.vercel.com/v6/deployments?state=READY&teamId=team_exact"
  );
  assert.deepEqual(hostedVercelCliEnvironment(identity), {
    VERCEL_ORG_ID: "team_exact",
    VERCEL_PROJECT_ID: "prj_exact"
  });
  assert.equal(identity.teamSlug, TEAM_SLUG);
});

test("Lane F runtimes use the pinned identity module and ignore arbitrary identity inputs", () => {
  for (const name of RUNTIME_SCRIPTS) {
    const source = fs.readFileSync(path.join(ROOT, "scripts", name), "utf8");
    assert.match(source, /rcap-hosted-acceptance-vercel-identity\.mjs/, `${name} must import the identity contract`);
    assert.doesNotMatch(source, /process\.env\.VERCEL_ORG_ID/, `${name} must ignore arbitrary VERCEL_ORG_ID input`);
    assert.doesNotMatch(source, /process\.env\.VERCEL_PROJECT_ID/, `${name} must ignore arbitrary VERCEL_PROJECT_ID input`);
  }

  const deploy = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-acceptance-deploy.mjs"), "utf8");
  assert.match(deploy, /"--scope", HOSTED_VERCEL_TEAM_SLUG/);
  assert.match(deploy, /hostedVercelCliEnvironment\(VERCEL_IDENTITY\)/);
  const deployArguments = deploy.match(/const args = \[[^\n]+/)?.[0] ?? "";
  assert.notEqual(deployArguments, "");
  assert.doesNotMatch(deployArguments, /"--prod"|"alias"/);

  const preflight = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-acceptance-preflight.mjs"), "utf8");
  assert.doesNotMatch(preflight, /env\?decrypt=true/);

  const resolver = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-resolve-preview.mjs"), "utf8");
  assert.doesNotMatch(resolver, /teamId[^\n]+roger947s-projects/);
});

test("Preview reuse requires exact candidate, project, and Preview target metadata", () => {
  const resolver = fs.readFileSync(path.join(ROOT, "scripts/rcap-hosted-resolve-preview.mjs"), "utf8");
  assert.match(resolver, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(resolver, /hyflxnlhpmiqxvvcoiia/);
  assert.match(resolver, /target === null \|\| target === "preview"/);
  assert.doesNotMatch(resolver, /target !== "production"/);
  assert.match(resolver, /meta\.rcapAcceptanceProjectRef === PROJECT_REF/);
  assert.doesNotMatch(resolver, /meta\.rcapAcceptanceProjectRef \?\? PROJECT_REF/);
  assert.doesNotMatch(resolver, /not recorded in deployment metadata; asserted downstream/);

  for (const name of [
    "rcap-hosted-acceptance-auth-config.mjs",
    "rcap-hosted-acceptance-deploy.mjs",
    "rcap-hosted-acceptance-gallery.mjs",
    "rcap-hosted-acceptance-payment.mjs"
  ]) {
    const source = fs.readFileSync(path.join(ROOT, "scripts", name), "utf8");
    assert.match(
      source,
      /meta\?\.rcapAcceptanceProjectRef === PROJECT_REF|meta\.rcapAcceptanceProjectRef === PROJECT_REF/,
      `${name} must refuse a Preview without exact acceptance-project metadata`
    );
  }
});

test("every hosted consumer reads the one resolved Preview by immutable deployment id", () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github/workflows/rcap-hosted-acceptance-staging.yml"),
    "utf8"
  );
  for (const [stepName, scriptName] of [
    ["Configure acceptance Auth and create the synthetic identities", "rcap-hosted-acceptance-auth-config.mjs"],
    ["Run the hosted Stripe payment and packet-delivery journey", "rcap-hosted-acceptance-payment.mjs"],
    ["Prove the Pennsylvania, Mississippi and Illinois galleries render", "rcap-hosted-acceptance-gallery.mjs"]
  ]) {
    const step = workflow.match(new RegExp(`- name: ${stepName}[\\s\\S]*?\\n\\s+run: node scripts/${scriptName.replaceAll(".", "\\.")}`))?.[0] ?? "";
    assert.match(step, /HOSTED_PREVIEW_DEPLOYMENT_ID: \$\{\{ steps\.resolve_preview\.outputs\.deployment_id \|\| steps\.deploy_preview\.outputs\.deployment_id \}\}/);
    assert.match(step, /HOSTED_PREVIEW_HOSTNAME: \$\{\{ steps\.resolve_preview\.outputs\.hostname \|\| steps\.deploy_preview\.outputs\.hostname \}\}/);

    const source = fs.readFileSync(path.join(ROOT, "scripts", scriptName), "utf8");
    assert.match(source, /const EXACT_DEPLOYMENT_ID = process\.env\.HOSTED_PREVIEW_DEPLOYMENT_ID/);
    assert.match(source, /const EXACT_PREVIEW_HOSTNAME = \(?process\.env\.HOSTED_PREVIEW_HOSTNAME/);
    assert.match(source, /\/v13\/deployments\/\$\{encodeURIComponent\(EXACT_DEPLOYMENT_ID\)\}/);
    assert.doesNotMatch(source, /\/v6\/deployments\?/);
  }
});

test("nonproduction Vercel runtimes refuse any Supabase project except acceptance", () => {
  for (const [name, variable] of [
    ["rcap-hosted-acceptance-auth-config.mjs", "PROJECT_REF"],
    ["rcap-hosted-acceptance-deploy.mjs", "PROJECT_REF"],
    ["rcap-hosted-acceptance-gallery.mjs", "PROJECT_REF"],
    ["rcap-hosted-acceptance-payment.mjs", "PROJECT_REF"],
    ["rcap-hosted-acceptance-preflight.mjs", "ACCEPTANCE_PROJECT_REF"],
    ["rcap-hosted-resolve-preview.mjs", "PROJECT_REF"]
  ]) {
    const source = fs.readFileSync(path.join(ROOT, "scripts", name), "utf8");
    assert.match(source, /const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia"/);
    assert.match(
      source,
      new RegExp(`${variable} !== EXPECTED_PROJECT_REF`),
      `${name} must refuse a non-acceptance Supabase ref before remote work`
    );
  }
});

test("gallery defaults to the pinned acceptance project when workflow input is absent", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts/rcap-hosted-acceptance-gallery.mjs"),
    "utf8"
  );
  assert.match(
    source,
    /const PROJECT_REF = process\.env\.ACCEPTANCE_SUPABASE_PROJECT_REF \?\? EXPECTED_PROJECT_REF/,
    "the always-run gallery step must remain runnable when its workflow does not pass the project ref"
  );
  assert.match(source, /PROJECT_REF !== EXPECTED_PROJECT_REF/);
});

test("fresh staging-scoped deploy bootstraps consumer A before binding the immutable Preview", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts/rcap-hosted-acceptance-deploy.mjs"),
    "utf8"
  );
  const keysIndex = source.indexOf("const keys = await supabaseKeys()");
  const scopeIndex = source.indexOf('if (ROUTE_STATE === "staging_scoped" && !SCOPE_IDS)');
  assert.ok(keysIndex >= 0 && keysIndex < scopeIndex, "service credentials must be resolved before scoped identity bootstrap");
  assert.match(source, /fetch\(`\$\{SUPABASE_URL\}\/auth\/v1\/admin\/users`/);
  assert.match(source, /acceptance-consumer-a@rcap-acceptance\.test/);
  assert.doesNotMatch(source, /run the accept phase first/);
});

test("deploy cannot pass unless the exact Preview health endpoint is application JSON", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts/rcap-hosted-acceptance-deploy.mjs"),
    "utf8"
  );
  assert.match(source, /"deployed_application_health_is_200"/);
  assert.match(source, /health\.status === 200/);
  assert.match(source, /health\.json !== null/);
  assert.match(source, /"checks" in health\.json/);
});
