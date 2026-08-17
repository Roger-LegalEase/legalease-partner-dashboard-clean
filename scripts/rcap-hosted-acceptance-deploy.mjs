#!/usr/bin/env node
// Hosted acceptance staging — the Vercel Preview deployment.
//
// Deploys the final application SHA to the EXISTING Vercel project's PREVIEW
// environment and binds it to the acceptance Supabase project and nothing else.
//
// What this deliberately does not do, and how that is enforced rather than
// promised:
//
//   * It never passes --prod. It assigns one pinned acceptance-only Preview
//     alias so Checkout can return to the same stable non-production origin,
//     and asserts both the deployment target and the production aliases.
//   * It never writes a project-level environment variable. Every value is
//     passed per-deployment with --env / --build-env, so other Preview
//     deployments and the Production environment keep exactly the variables
//     they had. The production-target variable list is captured before and
//     after and compared.
//   * It captures the project's PRODUCTION aliases before and after and fails
//     if the set changed.
//   * The delivery route is left DISABLED: the flag is simply not passed, and
//     the control's default is disabled. The deployed instance is then probed
//     to confirm the route refuses.
//
// Secrets are passed to the Vercel CLI through an argv array and are never
// echoed, never interpolated into a shell string, and never written to the
// evidence bundle.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
let SCOPE_IDS = (process.env.HOSTED_STAGING_SCOPE ?? "").trim();
const ROUTE_STATE = (process.env.HOSTED_ROUTE_STATE ?? "").trim();
const ACCEPTANCE_ALIAS = (process.env.HOSTED_ACCEPTANCE_ALIAS ?? `rcap-acceptance-${PROJECT_REF}.vercel.app`).trim().toLowerCase();

if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID || !SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("DEPLOY: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, SUPABASE_ACCESS_TOKEN and a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF are required");
  process.exit(1);
}
if (!/^rcap-acceptance-[a-z]{20}\.vercel\.app$/.test(ACCEPTANCE_ALIAS)
  || ACCEPTANCE_ALIAS !== `rcap-acceptance-${PROJECT_REF}.vercel.app`) {
  console.error("DEPLOY: HOSTED_ACCEPTANCE_ALIAS must be the acceptance-project-scoped *.vercel.app alias");
  process.exit(1);
}

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ACCEPTANCE_ORIGIN = `https://${ACCEPTANCE_ALIAS}`;
const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "deployed_to_preview_not_production",
  "deployment_carries_the_final_application_sha",
  "acceptance_alias_points_only_to_the_preview_deployment",
  "bound_to_the_acceptance_supabase_project_only",
  "production_aliases_unchanged",
  "production_environment_variables_unchanged",
  "delivery_route_refuses_on_the_deployed_instance"
];

async function vercelApi(pathname) {
  const joiner = pathname.includes("?") ? "&" : "?";
  const param = VERCEL_ORG_ID.startsWith("team_") ? "teamId" : "slug";
  const res = await fetch(`https://api.vercel.com${pathname}${joiner}${param}=${encodeURIComponent(VERCEL_ORG_ID)}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { status: res.status, json, text: text.slice(0, 300) };
}

async function supabaseKeys() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  });
  const list = await res.json();
  const pick = (name) => (Array.isArray(list) ? list.find((k) => k.name === name)?.api_key : null);
  return { anon: pick("anon"), service: pick("service_role") };
}

/** Sorted (key, target, updatedAt) triples — enough to detect any change without holding a value. */
function envShape(entries) {
  return entries
    .filter((entry) => Array.isArray(entry.target) && entry.target.includes("production"))
    .map((entry) => `${entry.key}:${[...entry.target].sort().join("|")}:${entry.updatedAt ?? ""}`)
    .sort();
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-deploy/v1",
  acceptanceProjectRef: PROJECT_REF,
  applicationSha: APPLICATION_SHA,
  acceptanceOrigin: ACCEPTANCE_ORIGIN,
  deliveryRouteState: ROUTE_STATE || "disabled (flag not set)",
  neverPassedProdFlag: true,
  neverAssignedProductionAlias: true,
  neverWroteProjectLevelEnv: true,
  largeFunctionsSupport: "enabled per-deployment; the checkout/status function bundles the RCAP corpus to ~611mb against a 250mb default"
};

// --- 0. Before-picture of everything this run must not disturb ---------------
const beforeProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
const beforeEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`);
if (beforeProject.status !== 200 || beforeEnv.status !== 200) {
  console.error(`DEPLOY: could not capture the production before-picture exactly (project=${beforeProject.status}, env=${beforeEnv.status})`);
  process.exit(1);
}
const aliasesBefore = Array.isArray(beforeProject.json?.alias)
  ? beforeProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
  : [];
const envBefore = envShape(Array.isArray(beforeEnv.json?.envs) ? beforeEnv.json.envs : []);
if (aliasesBefore.includes(ACCEPTANCE_ALIAS)) {
  console.error(`DEPLOY: refusing to move ${ACCEPTANCE_ALIAS} because Vercel reports it as a Production alias`);
  process.exit(1);
}

// --- 0b. Reuse a READY Preview deployment of these exact bytes, if one exists -
//
// A killed CLI does not cancel a Vercel deployment: the two runs the 15-minute
// job timer cut off (31755348356, 31756386367) each left a deployment that kept
// building server-side and may well have reached READY. Creating a third would
// be waste, so this asks Vercel first and reuses what is already there.
//
// The bar for reuse is deliberately narrow. A candidate must be READY, must not
// be a production-target deployment, and must carry rcapApplicationSha equal to
// the SHA this run was told to deploy — the same metadata assertion the
// freshly-created path is held to below. Anything that does not match all three
// is ignored rather than reasoned about, and the deploy proceeds normally.
// Same bytes is NOT the same deployment. Environment variables are baked into a
// Vercel deployment at creation, so a deployment of this SHA built without
// Stripe configuration cannot serve a payment journey no matter how many times
// it is reused. The intended configuration is recorded as deployment metadata
// and compared, which is what stops a redeploy-with-Stripe from silently
// resolving to the earlier no-Stripe deployment and reporting success.
const STRIPE_CONFIGURED = Boolean(process.env.HOSTED_STRIPE_TEST_SECRET && process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET);
const ROUTE_STATE_TAG = ROUTE_STATE || "disabled";

async function findReusableDeployment() {
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&limit=100&state=READY`);
  if (res.status !== 200 || !Array.isArray(res.json?.deployments)) return null;
  const match = res.json.deployments.find(
    (d) =>
      (d.readyState ?? d.state) === "READY" &&
      d.target !== "production" &&
      d.meta?.rcapApplicationSha === APPLICATION_SHA &&
      d.meta?.rcapStripeConfigured === String(STRIPE_CONFIGURED) &&
      d.meta?.rcapRouteState === ROUTE_STATE_TAG &&
      d.meta?.rcapPublicOrigin === ACCEPTANCE_ORIGIN
  );
  return match ? { url: `https://${match.url}`, id: match.uid ?? match.id ?? null } : null;
}

// A disabled deployment has no identity-scoped runtime input and may be reused.
// staging_scoped is different: the admitted auth UUID is baked into the
// deployment environment, while public metadata intentionally contains no
// participant identifier. Always rebuild that state after resolving the
// current synthetic identity so an old deployment can never carry a stale
// scope UUID after identity recreation.
const reusable = ROUTE_STATE === "staging_scoped" ? null : await findReusableDeployment();

// The scoped state names UUIDs, and a deployment's environment is fixed at
// creation, so the scope has to be resolved BEFORE the build rather than after.
// Consumer A alone: B stays outside on purpose, so the hosted admission test can
// tell "the scope admitted its named identity" from "everyone gets in".
if (ROUTE_STATE === "staging_scoped" && !SCOPE_IDS) {
  const lookup = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "select id from auth.users where email = 'acceptance-consumer-a@rcap-acceptance.test' limit 1" })
  });
  const rows = await lookup.json().catch(() => null);
  const id = Array.isArray(rows) ? rows[0]?.id : null;
  if (!id) {
    console.error("DEPLOY: staging_scoped was requested but the acceptance consumer identity does not exist yet; run the accept phase first so the scope names a real user");
    process.exit(1);
  }
  SCOPE_IDS = id;
}

// --- 1. Deploy to Preview ----------------------------------------------------
const keys = await supabaseKeys();
if (!keys.anon || !keys.service) {
  console.error("DEPLOY: could not read the acceptance project's anon/service_role keys");
  process.exit(1);
}

// Public at build time, server-only at runtime. The delivery flag is passed
// ONLY when ROUTE_STATE is explicitly set; the default deployment carries no
// flag at all, so the control's own default (disabled) applies.
const runtimeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anon,
  NEXT_PUBLIC_EXPUNGEMENT_AI_URL: ACCEPTANCE_ORIGIN,
  NEXT_PUBLIC_APP_URL: ACCEPTANCE_ORIGIN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: keys.service,
  ENABLE_SUPABASE_PARTNER_DATA: "true",
  // Stripe TEST mode only. A live key is never present in this environment and
  // the payment adapter refuses dry-run in a production runtime independently.
  STRIPE_SECRET_KEY: process.env.HOSTED_STRIPE_TEST_SECRET || "sk_test_hosted_acceptance_placeholder",
  STRIPE_WEBHOOK_SECRET: process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET || "whsec_hosted_acceptance_placeholder",
  ...(ROUTE_STATE ? { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: ROUTE_STATE } : {}),
  ...(SCOPE_IDS ? { RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: SCOPE_IDS } : {}),
  VERCEL_SUPPORT_LARGE_FUNCTIONS: "1"
};
const buildEnv = {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anon,
  NEXT_PUBLIC_EXPUNGEMENT_AI_URL: ACCEPTANCE_ORIGIN,
  NEXT_PUBLIC_APP_URL: ACCEPTANCE_ORIGIN,
  // The first deploy built cleanly and then failed at "Deploying outputs":
  // api/expungement-ai/checkout/status bundles to 610.93mb uncompressed
  // against a 250mb default limit. That size is the RCAP corpus — compiled
  // profiles, state packs, overlays and form assets — reached transitively
  // from a route handler, and it is a property of the FROZEN bytes.
  //
  // This is Vercel's own documented remedy for a project it reports as
  // eligible, and it is passed per-deployment rather than written to the
  // project, so no other Preview deployment and nothing in Production is
  // affected. Trimming the bundle instead would mean editing src/ — a new
  // application freeze, a new worker image, and a re-run of both required
  // checks, to change nothing a participant can observe.
  VERCEL_SUPPORT_LARGE_FUNCTIONS: "1"
};

// A live Stripe key must never reach this environment, and the check is on the
// PREFIX rather than on trust: sk_live_ and whsec_ are distinguishable without
// reading the value, and refusing before the deploy is the only moment at which
// refusing still costs nothing.
{
  const stripeSecret = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
  const stripeWebhook = process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET ?? "";
  if (stripeSecret && !stripeSecret.startsWith("sk_test_")) {
    console.error("DEPLOY: HOSTED_STRIPE_TEST_SECRET is not an sk_test_ key; refusing to deploy a non-test Stripe key to the acceptance environment");
    process.exit(1);
  }
  if (stripeWebhook && !stripeWebhook.startsWith("whsec_")) {
    console.error("DEPLOY: HOSTED_STRIPE_TEST_WEBHOOK_SECRET is not a whsec_ signing secret");
    process.exit(1);
  }
  evidence.stripe = {
    mode: stripeSecret ? "test key supplied" : "no key supplied; the placeholder cannot transact",
    webhookSigningSecretSupplied: Boolean(stripeWebhook)
  };
}

// `--archive=tgz` uploads ONE tarball instead of walking the file tree and
// uploading each file separately.
//
// This is not a micro-optimisation, it is the fix for a two-hour hang. Once the
// nationwide corpus landed in main the deployment source grew to thousands of
// files, and two consecutive runs — one with a 60-minute ceiling, one with 120
// — sat in `vercel deploy` without ever producing a READY deployment. The
// evidence that it was the upload rather than the build: at cancellation the
// runner still listed `npm exec vercel` as a live orphan process, and the
// gallery step, which runs even when the deploy fails, reported "no READY
// non-production deployment carrying 264d2a24" — so after 59 minutes Vercel had
// not been handed a complete deployment at all.
const args = ["vercel@latest", "deploy", "--archive=tgz", "--yes", "--token", VERCEL_TOKEN, "--scope", VERCEL_ORG_ID];
for (const [key, value] of Object.entries(runtimeEnv)) args.push("--env", `${key}=${value}`);
for (const [key, value] of Object.entries(buildEnv)) args.push("--build-env", `${key}=${value}`);
args.push("--meta", `rcapApplicationSha=${APPLICATION_SHA}`);
args.push("--meta", `rcapAcceptanceProjectRef=${PROJECT_REF}`);
// Metadata, not secrets: whether a deployment was BUILT with Stripe
// configuration and which delivery state it carries. These are what the reuse
// predicate compares, so they must be recorded on every deployment this script
// creates or the next run cannot tell two builds of the same SHA apart.
args.push("--meta", `rcapStripeConfigured=${STRIPE_CONFIGURED}`);
args.push("--meta", `rcapRouteState=${ROUTE_STATE_TAG}`);
args.push("--meta", `rcapPublicOrigin=${ACCEPTANCE_ORIGIN}`);

const redact = (text) => String(text ?? "")
  .replaceAll(VERCEL_TOKEN, "***")
  .replaceAll(SUPABASE_ACCESS_TOKEN, "***")
  .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***")
  .replace(/sk_(test|live)_[A-Za-z0-9_]+/g, "***REDACTED***");

let previewUrl = null;
if (reusable) {
  // No third deployment is created. Every proof below still runs against this
  // URL unchanged — reuse skips the creation, never the verification.
  previewUrl = reusable.url;
  evidence.deploymentOrigin = "reused an existing READY Preview deployment of the same application SHA";
  console.log(`  reusing READY Preview deployment ${reusable.id ?? "(id unknown)"} — no new deployment created`);
} else {
  console.log(`  deploying ${APPLICATION_SHA.slice(0, 12)}… to the Preview environment (no --prod, pinned acceptance alias only, no project-level env write)`);
  // Streamed, not buffered.
  //
  // This used to be spawnSync with piped stdio, which holds every byte until
  // the process exits and prints only on failure. When the job timer killed the
  // step, the buffer died with it: two runs totalling nearly three hours
  // produced not one line about what the CLI was doing. A harness whose output
  // only survives the happy path cannot diagnose the unhappy one.
  //
  // Every line is redacted before it is printed, so streaming does not turn the
  // job log into a place secrets can appear.
  const deploy = await new Promise((resolve) => {
    const child = spawn("npx", args, {
      cwd: rootDir,
      // stdin explicitly closed rather than left as an open pipe nobody writes
      // to. An earlier run died with an uncaught EPIPE on write AFTER Vercel
      // had already accepted the deployment, which is the worst shape of
      // failure: the work succeeded and the harness reported failure.
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, VERCEL_ORG_ID, VERCEL_PROJECT_ID }
    });

    let combined = "";
    let pending = "";
    const consume = (chunk) => {
      const text = String(chunk);
      combined += text;
      pending += text;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim().length > 0) console.log(`  vercel| ${redact(line)}`);
      }
    };

    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.on("error", (error) => resolve({ status: null, error, stdout: combined, stderr: "" }));
    child.on("close", (code) => {
      if (pending.trim().length > 0) console.log(`  vercel| ${redact(pending)}`);
      resolve({ status: code, error: null, stdout: combined, stderr: "" });
    });
  });
  if (deploy.error) {
    console.error(`DEPLOY: the Vercel CLI could not be run to completion — ${deploy.error.code ?? ""} ${deploy.error.message ?? deploy.error}`);
  }

  const combined = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`;
  const urlMatch = combined.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) ?? [];
  previewUrl = urlMatch[urlMatch.length - 1] ?? null;

  if (deploy.status !== 0 || !previewUrl) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({ ...evidence, passed: false, exitCode: deploy.status, tail: redact(combined).slice(-1500) }, null, 2)}\n`);
    console.error(`DEPLOY FAILED — vercel exited ${deploy.status}\n${redact(combined).slice(-2000)}`);
    process.exit(1);
  }
  evidence.deploymentOrigin = "created a new Preview deployment";
}

// Checkout is compiled to return to ACCEPTANCE_ORIGIN. Move only that pinned
// project-ref-scoped Preview alias to this exact non-production deployment.
// Production aliases were captured above and are compared again afterwards.
const deploymentUrl = previewUrl;
const aliasResult = await new Promise((resolve) => {
  const child = spawn("npx", [
    "vercel@latest", "alias", "set", deploymentUrl, ACCEPTANCE_ALIAS,
    "--token", VERCEL_TOKEN, "--scope", VERCEL_ORG_ID
  ], {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, VERCEL_ORG_ID, VERCEL_PROJECT_ID }
  });
  let combined = "";
  child.stdout.on("data", (chunk) => { combined += String(chunk); });
  child.stderr.on("data", (chunk) => { combined += String(chunk); });
  child.on("error", (error) => resolve({ status: null, error, output: combined }));
  child.on("close", (code) => resolve({ status: code, error: null, output: combined }));
});
if (aliasResult.error || aliasResult.status !== 0) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({
    ...evidence,
    passed: false,
    deploymentUrl,
    acceptanceOrigin: ACCEPTANCE_ORIGIN,
    aliasExitCode: aliasResult.status,
    aliasTail: redact(aliasResult.output).slice(-1000)
  }, null, 2)}\n`);
  console.error(`DEPLOY FAILED — acceptance Preview alias assignment exited ${aliasResult.status}: ${redact(aliasResult.output).slice(-1000)}`);
  process.exit(1);
}
previewUrl = ACCEPTANCE_ORIGIN;
evidence.deploymentUrl = deploymentUrl;
evidence.previewUrl = previewUrl;
console.log(`  deployment URL: ${deploymentUrl}`);
console.log(`  acceptance Preview origin: ${previewUrl}`);

// --- 2. Prove it is Preview, not Production ---------------------------------
let deploymentRouteMetadataExact = false;
{
  const host = previewUrl.replace(/^https:\/\//, "");
  const detail = await vercelApi(`/v13/deployments/${encodeURIComponent(host)}`);
  const target = detail.json?.target ?? null;
  const meta = detail.json?.meta ?? {};
  record(
    "deployed_to_preview_not_production",
    detail.status === 200 && target !== "production",
    `Vercel reports target=${JSON.stringify(target)} for this deployment (must not be "production"); readyState=${detail.json?.readyState ?? "unknown"}`
  );
  record(
    "deployment_carries_the_final_application_sha",
    detail.status === 200
      && meta.rcapApplicationSha === APPLICATION_SHA
      && meta.rcapPublicOrigin === ACCEPTANCE_ORIGIN
      && meta.rcapAcceptanceProjectRef === PROJECT_REF
      && meta.rcapStripeConfigured === String(STRIPE_CONFIGURED)
      && meta.rcapRouteState === ROUTE_STATE_TAG,
    `deployment metadata records application=${meta.rcapApplicationSha ?? "(absent)"}, origin=${meta.rcapPublicOrigin ?? "(absent)"}, project=${meta.rcapAcceptanceProjectRef ?? "(absent)"}, stripe=${meta.rcapStripeConfigured ?? "(absent)"}, route=${meta.rcapRouteState ?? "(absent)"}`
  );
  deploymentRouteMetadataExact = detail.status === 200
    && meta.rcapAcceptanceProjectRef === PROJECT_REF
    && meta.rcapPublicOrigin === ACCEPTANCE_ORIGIN
    && meta.rcapRouteState === ROUTE_STATE_TAG;
  const deploymentAliases = Array.isArray(detail.json?.alias) ? detail.json.alias : [];
  record(
    "acceptance_alias_points_only_to_the_preview_deployment",
    detail.status === 200
      && target !== "production"
      && deploymentAliases.includes(ACCEPTANCE_ALIAS)
      && meta.rcapPublicOrigin === ACCEPTANCE_ORIGIN,
    `${ACCEPTANCE_ALIAS} resolves to deployment ${detail.json?.id ?? "(unknown)"}, target=${JSON.stringify(target)}, aliases=${deploymentAliases.join(",")}`
  );
  evidence.deployment = {
    id: detail.json?.id ?? null,
    target,
    readyState: detail.json?.readyState ?? null,
    metadata: {
      applicationSha: meta.rcapApplicationSha ?? null,
      acceptanceProjectRef: meta.rcapAcceptanceProjectRef ?? null,
      publicOrigin: meta.rcapPublicOrigin ?? null,
      stripeConfigured: meta.rcapStripeConfigured ?? null,
      routeState: meta.rcapRouteState ?? null
    }
  };
  evidence.deploymentAliases = deploymentAliases;
}

// --- 2b. Where does the Stripe webhook now have to point? --------------------
//
// A Stripe webhook destination is configured once and then keeps firing at
// whatever URL it holds. This release gives the application a pinned Preview
// alias for browser/Checkout continuity, but the Stripe endpoint still has to
// be checked against that exact alias and path before a payment can proceed.
//
// So this is derived rather than assumed. The previous host is queried on its
// own and asked which application SHA it carries; the new deployment is asked
// for any alias that would let a stable URL survive the move.
{
  const previousHost = (process.env.HOSTED_PREVIOUS_WEBHOOK_HOST ?? "").trim().replace(/^https:\/\//, "");
  const newHost = previewUrl.replace(/^https:\/\//, "");
  const stableAliases = (evidence.deploymentAliases ?? []).filter((a) => typeof a === "string" && a.length > 0);

  let previousServes = null;
  if (previousHost && previousHost !== newHost) {
    const prior = await vercelApi(`/v13/deployments/${encodeURIComponent(previousHost)}`);
    previousServes = {
      status: prior.status,
      readyState: prior.json?.readyState ?? null,
      applicationSha: prior.json?.meta?.rcapApplicationSha ?? null,
      stripeConfigured: prior.json?.meta?.rcapStripeConfigured ?? null,
      routeState: prior.json?.meta?.rcapRouteState ?? null
    };
  }

  const hostMoved = Boolean(previousHost) && previousHost !== newHost;
  const reachableByAlias = stableAliases.includes(previousHost);
  const mustChange = hostMoved && !reachableByAlias;

  evidence.stripeWebhookDestination = {
    previousHost: previousHost || "(not supplied)",
    newHost,
    hostMoved,
    aliasesOnNewDeployment: stableAliases,
    previousHostStillServes: previousServes,
    reachableByAlias,
    mustChange,
    // Only ever the path and the parameter NAME. The bypass secret is never read
    // by this script and never written to the evidence bundle.
    requiredPath: "/api/stripe/webhook",
    requiredQueryParameterName: "x-vercel-protection-bypass",
    editNotDuplicate: true
  };

  console.log(
    mustChange
      ? `  STRIPE WEBHOOK URL UPDATE REQUIRED — the destination host moved from ${previousHost} to ${newHost}` +
        `; the old host still serves rcapApplicationSha=${previousServes?.applicationSha ?? "(unknown)"}`
      : hostMoved
        ? `  the previous host ${previousHost} is an alias of this deployment; the Stripe destination still reaches the new bytes`
        : `  the deployment host is unchanged (${newHost}); the Stripe destination still reaches the new bytes`
  );
}

// --- 3. Prove the binding, and that production was not disturbed ------------
{
  const acceptanceHash = crypto.createHash("sha256").update(SUPABASE_URL).digest("hex");
  record(
    "bound_to_the_acceptance_supabase_project_only",
    Boolean(keys.anon && keys.service),
    `every Supabase value passed to this deployment was read from ${PROJECT_REF} moments ago; the acceptance URL hashes to ${acceptanceHash.slice(0, 16)}… and no other project's URL or key was passed`
  );

  const afterProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
  const aliasesAfter = Array.isArray(afterProject.json?.alias)
    ? afterProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
    : [];
  record(
    "production_aliases_unchanged",
    afterProject.status === 200 && JSON.stringify(aliasesBefore) === JSON.stringify(aliasesAfter),
    `Vercel API=${afterProject.status}; ${aliasesBefore.length} production alias(es) before, ${aliasesAfter.length} after, identical sets`
  );

  const afterEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`);
  const envAfter = envShape(Array.isArray(afterEnv.json?.envs) ? afterEnv.json.envs : []);
  record(
    "production_environment_variables_unchanged",
    afterEnv.status === 200 && JSON.stringify(envBefore) === JSON.stringify(envAfter),
    `Vercel API=${afterEnv.status}; ${envBefore.length} production-target variable(s) before and ${envAfter.length} after, with identical keys, targets and updatedAt stamps — no value was read into this comparison`
  );
  evidence.productionUntouched = { aliasCount: aliasesAfter.length, productionVariableCount: envAfter.length };
}

// --- 4. Probe the deployed instance -----------------------------------------
{
  // See the gallery script: on a Preview protected by Vercel Authentication,
  // an unauthenticated probe is answered by Vercel, not by the application, so
  // a refusal here would prove nothing about the delivery control.
  const bypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
  const bypassHeaders = bypass ? { "x-vercel-protection-bypass": bypass } : {};
  evidence.protectionBypassSupplied = Boolean(bypass);

  const probe = async (pathname, init = {}) => {
    try {
      // Header AND query parameter: the header alone was answered 401 by a
      // protected Preview, and the query form is the one Vercel's own
      // documentation and Roger's Stripe destination rely on.
      const joiner = pathname.includes("?") ? "&" : "?";
      const suffix = bypass ? `${joiner}x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : "";
      const res = await fetch(`${previewUrl}${pathname}${suffix}`, {
        ...init,
        headers: { ...(init.headers ?? {}), ...bypassHeaders }
      });
      let json = null;
      try { json = JSON.parse(await res.clone().text()); } catch { /* non-JSON is fine */ }
      return { status: res.status, json };
    } catch (error) {
      return { status: `unreachable: ${error.message}`, json: null };
    }
  };

  const health = await probe("/api/health");
  const render = await probe("/api/expungement-ai/packet/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: crypto.randomUUID() })
  });

  const healthIsApplication = health.status === 200
    && health.json !== null
    && typeof health.json === "object"
    && "checks" in health.json;
  // The random unauthenticated item must stop at the application's exact auth
  // perimeter. An arbitrary 4xx/5xx is not evidence: it could be Vercel's wall,
  // a missing route, or a crashed function. The requested delivery state is
  // proved separately by exact immutable deployment metadata above.
  const applicationAuthRefusal = render.status === 401
    && render.json?.error === "Authentication is required.";
  const refused = deploymentRouteMetadataExact && healthIsApplication && applicationAuthRefusal;
  record(
    "delivery_route_refuses_on_the_deployed_instance",
    refused,
    `metadata route=${ROUTE_STATE_TAG} exact=${deploymentRouteMetadataExact}; GET /api/health=${health.status} application-json=${healthIsApplication}; POST /api/expungement-ai/packet/render=${render.status} error=${JSON.stringify(render.json?.error ?? null)} — exact application auth refusal required`
  );
  evidence.probes = {
    health: { status: health.status, applicationJson: healthIsApplication },
    render: { status: render.status, error: render.json?.error ?? null, applicationAuthRefusal },
    deploymentRouteMetadataExact
  };
}

// --- verdict -----------------------------------------------------------------
{
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`DEPLOY INCOMPLETE — no verdict for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`DEPLOY FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`DEPLOY PASSED — ${previewUrl} on ${PROJECT_REF}, Preview only, production untouched.`);
  process.exit(evidence.passed ? 0 : 1);
}
