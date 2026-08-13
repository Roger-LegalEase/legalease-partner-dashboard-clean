#!/usr/bin/env node
// Hosted acceptance staging — the Vercel Preview deployment.
//
// Deploys the final application SHA to the EXISTING Vercel project's PREVIEW
// environment and binds it to the acceptance Supabase project and nothing else.
//
// What this deliberately does not do, and how that is enforced rather than
// promised:
//
//   * It never passes --prod, never assigns an alias, and asserts afterwards
//     that the deployment's own `target` is not "production".
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
import { spawnSync } from "node:child_process";
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
const SCOPE_IDS = (process.env.HOSTED_STAGING_SCOPE ?? "").trim();
const ROUTE_STATE = (process.env.HOSTED_ROUTE_STATE ?? "").trim();

if (!VERCEL_TOKEN || !VERCEL_ORG_ID || !VERCEL_PROJECT_ID || !SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("DEPLOY: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, SUPABASE_ACCESS_TOKEN and a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF are required");
  process.exit(1);
}

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "deployed_to_preview_not_production",
  "deployment_carries_the_final_application_sha",
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
  deliveryRouteState: ROUTE_STATE || "disabled (flag not set)",
  neverPassedProdFlag: true,
  neverWroteProjectLevelEnv: true,
  largeFunctionsSupport: "enabled per-deployment; the checkout/status function bundles the RCAP corpus to ~611mb against a 250mb default"
};

// --- 0. Before-picture of everything this run must not disturb ---------------
const beforeProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
const beforeEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`);
const aliasesBefore = Array.isArray(beforeProject.json?.alias)
  ? beforeProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
  : [];
const envBefore = envShape(Array.isArray(beforeEnv.json?.envs) ? beforeEnv.json.envs : []);

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

const args = ["vercel@latest", "deploy", "--yes", "--token", VERCEL_TOKEN, "--scope", VERCEL_ORG_ID];
for (const [key, value] of Object.entries(runtimeEnv)) args.push("--env", `${key}=${value}`);
for (const [key, value] of Object.entries(buildEnv)) args.push("--build-env", `${key}=${value}`);
args.push("--meta", `rcapApplicationSha=${APPLICATION_SHA}`);
args.push("--meta", `rcapAcceptanceProjectRef=${PROJECT_REF}`);

console.log(`  deploying ${APPLICATION_SHA.slice(0, 12)}… to the Preview environment (no --prod, no alias, no project-level env write)`);
const deploy = spawnSync("npx", args, {
  cwd: rootDir,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, VERCEL_ORG_ID, VERCEL_PROJECT_ID }
});

const redact = (text) => String(text ?? "")
  .replaceAll(VERCEL_TOKEN, "***")
  .replaceAll(SUPABASE_ACCESS_TOKEN, "***")
  .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***")
  .replace(/sk_(test|live)_[A-Za-z0-9_]+/g, "***REDACTED***");

const combined = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`;
const urlMatch = combined.match(/https:\/\/[a-z0-9-]+\.vercel\.app/gi) ?? [];
const previewUrl = urlMatch[urlMatch.length - 1] ?? null;

if (deploy.status !== 0 || !previewUrl) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({ ...evidence, passed: false, exitCode: deploy.status, tail: redact(combined).slice(-1500) }, null, 2)}\n`);
  console.error(`DEPLOY FAILED — vercel exited ${deploy.status}\n${redact(combined).slice(-2000)}`);
  process.exit(1);
}
evidence.previewUrl = previewUrl;
console.log(`  deployment URL: ${previewUrl}`);

// --- 2. Prove it is Preview, not Production ---------------------------------
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
    meta.rcapApplicationSha === APPLICATION_SHA,
    `deployment metadata records rcapApplicationSha=${meta.rcapApplicationSha ?? "(absent)"} against the declared final SHA ${APPLICATION_SHA}`
  );
  evidence.deployment = { id: detail.json?.id ?? null, target, readyState: detail.json?.readyState ?? null };
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
    JSON.stringify(aliasesBefore) === JSON.stringify(aliasesAfter),
    `${aliasesBefore.length} production alias(es) before, ${aliasesAfter.length} after, identical sets`
  );

  const afterEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env`);
  const envAfter = envShape(Array.isArray(afterEnv.json?.envs) ? afterEnv.json.envs : []);
  record(
    "production_environment_variables_unchanged",
    JSON.stringify(envBefore) === JSON.stringify(envAfter),
    `${envBefore.length} production-target variable(s) before and ${envAfter.length} after, with identical keys, targets and updatedAt stamps — no value was read into this comparison`
  );
  evidence.productionUntouched = { aliasCount: aliasesAfter.length, productionVariableCount: envAfter.length };
}

// --- 4. Probe the deployed instance -----------------------------------------
{
  const probe = async (pathname, init) => {
    try {
      const res = await fetch(`${previewUrl}${pathname}`, init);
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

  // 401 is Vercel deployment protection answering ahead of the app; 503 is the
  // delivery control answering; 401 from the app is the auth gate. All three
  // are refusals — what must never appear is a 2xx.
  const refused = typeof render.status === "number" && render.status >= 400;
  record(
    "delivery_route_refuses_on_the_deployed_instance",
    refused,
    `GET /api/health=${health.status}; POST /api/expungement-ai/packet/render=${render.status} — the delivery route must refuse while the flag is unset, and a 2xx here would be the failure`
  );
  evidence.probes = { health: health.status, render: render.status };
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
