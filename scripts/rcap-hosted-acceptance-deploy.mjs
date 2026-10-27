#!/usr/bin/env node
import {SOURCE_SUCCESSOR_PHASE,SOURCE_SUCCESSOR_PROTECTED,sourceSuccessorMetadata,assertProtectedSourceDeployment,assertSourceSuccessorAliasAbsent,refusePriorSourceSuccessorAttempt,restoreSourceSuccessorAlias} from './rcap-managed-start-source-successor-contract.mjs';
// Hosted acceptance staging — the Vercel Preview deployment.
//
// Deploys the final application SHA to the EXISTING Vercel project's PREVIEW
// environment and binds it to the acceptance Supabase project and nothing else.
//
// What this deliberately does not do, and how that is enforced rather than
// promised:
//
//   * It never passes --prod. It binds exactly one deterministic SHA-scoped
//     nonproduction alias, known before build, and asserts afterwards that the
//     deployment's own `target` is not "production".
//   * It never writes a project-level environment variable. Every value is
//     passed per-deployment as env / build.env, so other Preview
//     deployments and the Production environment keep exactly the variables
//     they had. The production-target variable list is captured before and
//     after and compared.
//   * It captures the project's PRODUCTION aliases before and after and fails
//     if the set changed.
//   * The delivery route is left DISABLED: the flag is simply not passed, and
//     the control's default is disabled. The deployed instance is then probed
//     to confirm the route refuses.
//
// Secrets are sent in the authenticated REST request body and are never
// echoed or written to the evidence bundle.

import {MANAGED_RUNTIME_REPAIR_PHASE,MANAGED_REPAIR_PREDECESSOR,managedRepairMetadata,classifyManagedRepairSibling,assertManagedRepairAliasPrestate,restoreManagedRepairAlias} from './rcap-managed-start-runtime-repair-contract.mjs';
import {assertPurposeRuntimeIdentity,CONFIGURED_SANDBOX_PHASE,CLINIC_PURPOSE,CURRENT_PURPOSE_TUPLE,CURRENT_ORDINARY_PREVIEW,CONFIGURED_SANDBOX_OWNER,currentPurposeMetadata,classifyCurrentPurposeDeployment,configuredSandboxOverrides} from './rcap-configured-sandbox-preview-contract.mjs';
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { assertPreviewResponse, assertPreservedOrdinaryPreview, createRestPreview, FROZEN_WORKER_METADATA } from "./rcap-hosted-vercel-rest-transport.mjs";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  expectedHostedReturnOrigin,
  HOSTED_MS_CLINIC_PARTICIPANTS,
  HOSTED_ORDINARY_PREVIEW,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
let SCOPE_IDS = (process.env.HOSTED_STAGING_SCOPE ?? "").trim();
const ROUTE_STATE = (process.env.HOSTED_ROUTE_STATE ?? "").trim();
const SOURCE_SUCCESSOR = process.env.PHASE_INPUT === SOURCE_SUCCESSOR_PHASE;
const RUNTIME_REPAIR = process.env.PHASE_INPUT === MANAGED_RUNTIME_REPAIR_PHASE;
const HELD_PURPOSE_PREVIEW = [CONFIGURED_SANDBOX_PHASE,CLINIC_PURPOSE].includes(process.env.PHASE_INPUT);
const configuredSandboxEnv = process.env.PHASE_INPUT === CONFIGURED_SANDBOX_PHASE ? configuredSandboxOverrides(process.env) : null;
const CLINIC_DEMO_MODE = (process.env.HOSTED_CLINIC_DEMO_MODE ?? "").trim();
const MISSISSIPPI_PREVIEW_MODE = CLINIC_DEMO_MODE === "mississippi_preview";
const ISOLATED_CLINIC_PREVIEW = process.env.HOSTED_ISOLATED_CLINIC_PREVIEW === "true";
if (ISOLATED_CLINIC_PREVIEW && !MISSISSIPPI_PREVIEW_MODE) throw new Error("DEPLOY_CLINIC_PURPOSE_MISMATCH");
if (process.env.PHASE_INPUT === "replace_preview" && (ROUTE_STATE || SCOPE_IDS || CLINIC_DEMO_MODE || ISOLATED_CLINIC_PREVIEW)) throw new Error("DEPLOY_CANDIDATE_PREVIEW_MUST_BE_CLOSED");
const CLINIC_DEMO_PASSWORD = (process.env.HOSTED_CLINIC_DEMO_PASSWORD ?? "").trim();
const LEGAL_AID_EMAIL = (() => {
  const apiKey = (process.env.HOSTED_LEGAL_AID_RESEND_API_KEY ?? "").trim();
  const from = (process.env.HOSTED_LEGAL_AID_EMAIL_FROM ?? "").trim();
  const mailbox = (process.env.HOSTED_LEGAL_AID_TEST_MAILBOX ?? "").trim();
  if (!apiKey || !from || !mailbox) return null;
  if (!apiKey.startsWith("re_")) throw new Error("HOSTED_LEGAL_AID_RESEND_API_KEY is not a Resend API key");
  if (!/^[^<>@\s]+@[^<>@\s]+$/.test(from.replace(/^.*<([^>]+)>$/, "$1"))) throw new Error("HOSTED_LEGAL_AID_EMAIL_FROM is not an email sender");
  return { apiKey, from };
})();

if (!VERCEL_TOKEN || !SUPABASE_ACCESS_TOKEN || PROJECT_REF !== EXPECTED_PROJECT_REF || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA)) {
  console.error("DEPLOY: VERCEL_TOKEN, SUPABASE_ACCESS_TOKEN, the pinned acceptance project ref and one exact application SHA are required");
  process.exit(1);
}
// DS-08: existing data keys are independent of rotatable access credentials.
// Validate before any remote call. Keep exact preserved bytes; never normalize,
// derive, fingerprint, or include these values in evidence or build metadata.
function preservedDataKeys(env) {
  const key = env.HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY;
  const version = env.HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION;
  const pseudonym = env.HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET;
  if (typeof key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(key)
    || Buffer.from(key, "base64").length !== 32
    || Buffer.from(key, "base64").toString("base64") !== key) {
    throw new Error("DEPLOY_PRESERVED_ENCRYPTION_KEY_REQUIRED");
  }
  // The authoritative pre-rotation deployment used v1. This credential-only
  // operation cannot relabel a key or introduce a data-key rotation.
  if (version !== "v1") throw new Error("DEPLOY_PRESERVED_KEY_VERSION_MISMATCH");
  if (typeof pseudonym !== "string" || pseudonym.length < 24 || !pseudonym.trim()) {
    throw new Error("DEPLOY_PRESERVED_PSEUDONYM_REQUIRED");
  }
  return Object.freeze({
    LEGAL_AID_RESTRICTED_FIELD_KEY: key,
    LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: version,
    PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: pseudonym
  });
}
const PRESERVED_DATA_KEYS = preservedDataKeys(process.env);

// GA-43/GA-52: this future controller supplies configuration, never platform identity.
const MANAGED_START = ["managed_start_preview","managed_start_runtime_repair","managed_start_source_successor"].includes(process.env.PHASE_INPUT) ? (() => {
  if (CLINIC_DEMO_MODE || ISOLATED_CLINIC_PREVIEW
    || process.env.HOSTED_STRIPE_TEST_SECRET || process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET
    || process.env.HOSTED_STRIPE_CATALOG_PRODUCT_ID || LEGAL_AID_EMAIL) {
    throw new Error("DEPLOY_MANAGED_START_PURPOSE_MISMATCH");
  }
  let binding;
  try { binding = JSON.parse(process.env.HOSTED_PARTNER_LAUNCH_RELEASE_AUTHORIZATION ?? ""); }
  catch { throw new Error("DEPLOY_MANAGED_START_BINDING_INVALID"); }
  const fields = ["schema", "applicationSha", "projectId", "supabaseProjectRef", "partnerSlug", "adminAuthUserId"];
  if (!binding || typeof binding !== "object" || Array.isArray(binding)
    || Object.keys(binding).sort().join() !== fields.sort().join()
    || Object.values(binding).some(value => typeof value !== "string")
    || binding.schema !== "rcap-partner-acceptance-launch/v1"
    || !/^[a-f0-9]{40}$/.test(APPLICATION_SHA) || binding.applicationSha !== APPLICATION_SHA
    || binding.projectId !== "prj_cdgwGzFqIHgEUlzEburSLaZETdQV"
    || PROJECT_REF !== EXPECTED_PROJECT_REF || binding.supabaseProjectRef !== EXPECTED_PROJECT_REF
    || binding.partnerSlug !== "legalease-ordinary-qa-20261024"
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(binding.adminAuthUserId)) {
    throw new Error("DEPLOY_MANAGED_START_BINDING_INVALID");
  }
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (typeof bypass !== "string" || !bypass.trim() || /[\r\n]/.test(bypass)) {
    throw new Error("DEPLOY_MANAGED_START_BYPASS_REQUIRED");
  }
  let grantText;
  try {
    grantText = execFileSync("git", ["show", `${APPLICATION_SHA}:data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json`], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch { throw new Error("DEPLOY_MANAGED_START_GRANT_SOURCE_MISSING"); }
  if (sha256(grantText) !== "9db1864b330945e3307a430a013328f9ec5a00ccfb2dee2bfec68dab8a780e40") {
    throw new Error("DEPLOY_MANAGED_START_GRANT_MISMATCH");
  }
  const grant = JSON.parse(grantText);
  if (sha256(JSON.stringify(grant)) !== "316a211790dbdaca3bd260beac0a854076ebed618390b339b1d68b6a40381ebb"
    || grant.partnerSlug !== binding.partnerSlug || grant.acceptanceProjectRef !== PROJECT_REF
    || grant.acquisitionMode !== "partner" || grant.eventId !== null || grant.eventName !== null
    || ROUTE_STATE !== grant.routeState || SCOPE_IDS !== grant.participantUserIds.join(",")
    || sha256(SCOPE_IDS) !== grant.participantScopeSha256) {
    throw new Error("DEPLOY_MANAGED_START_GRANT_SCOPE_MISMATCH");
  }
  return { authorization: JSON.stringify(binding), bypass, grant };

})() : null;

const VERCEL_IDENTITY = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
const RETURN_ORIGIN = expectedHostedReturnOrigin(APPLICATION_SHA, ISOLATED_CLINIC_PREVIEW ? "mississippi_clinic" : MANAGED_START ? "managed_start" : "");
const RETURN_ALIAS_HOST = new URL(RETURN_ORIGIN).host;

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "deployed_to_preview_not_production",
  "deployment_carries_the_final_application_sha",
  "deployment_carries_the_accepted_worker_binding",
  "deterministic_nonproduction_return_alias_bound",
  "bound_to_the_acceptance_supabase_project_only",
  "production_aliases_unchanged",
  "production_environment_variables_unchanged",
  "deployed_application_health_is_200",
  "delivery_route_refuses_on_the_deployed_instance"
];
if (HELD_PURPOSE_PREVIEW) REQUIRED_CASES.push("purpose_runtime_source_identity", "current_ordinary_preview_unchanged", "purpose_siblings_unchanged");
if (configuredSandboxEnv) REQUIRED_CASES.push("ordinary_preview_unchanged", "configured_sandbox_scope_and_purpose_exact");
if (MANAGED_START) REQUIRED_CASES.push("managed_start_release_source_bound", "ordinary_preview_unchanged");
if (SOURCE_SUCCESSOR) REQUIRED_CASES.push('source_successor_protected_targets_unchanged');
if (RUNTIME_REPAIR) REQUIRED_CASES.push("repair_predecessor_immutable_unchanged", "purpose_siblings_unchanged");
if (ISOLATED_CLINIC_PREVIEW) REQUIRED_CASES.push("ordinary_preview_unchanged", "clinic_scope_and_purpose_exact");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sqlText(value) {
  return String(value).split("'").join("''");
}

function syntheticPassword(email) {
  if (MISSISSIPPI_PREVIEW_MODE) return CLINIC_DEMO_PASSWORD;
  const material = crypto.createHmac("sha256", SUPABASE_ACCESS_TOKEN)
    .update(`rcap-ms-clinic-preview:${email}`)
    .digest("base64url");
  return `Acceptance-${material.slice(0, 32)}!`;
}

if (MISSISSIPPI_PREVIEW_MODE && CLINIC_DEMO_PASSWORD.length < 20) {
  console.error("DEPLOY: HOSTED_CLINIC_DEMO_PASSWORD must contain at least 20 characters in Mississippi Preview mode");
  process.exit(1);
}

async function vercelApi(pathname, init = {}) {
  const res = await fetch(hostedVercelScopedUrl(pathname, VERCEL_IDENTITY), {
    ...init,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, ...(init.headers ?? {}) }
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
  ...((HELD_PURPOSE_PREVIEW||RUNTIME_REPAIR||SOURCE_SUCCESSOR)?{purposeSource:{phase:process.env.PHASE_INPUT,carrierSha:process.env.GITHUB_SHA,carrierWorkflowSha:process.env.GITHUB_WORKFLOW_SHA,controllerSha:process.env.RCAP_ADMITTED_CONTROLLER_SHA,toolsSha:process.env.TOOLS_SHA_INPUT,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT}}:{}),
  deliveryRouteState: ROUTE_STATE || "disabled (flag not set)",
  neverPassedProdFlag: true,
  neverWroteProjectLevelEnv: true,
  largeFunctionsSupport: "enabled per-deployment; the checkout/status function bundles the RCAP corpus to ~611mb against a 250mb default"
};

async function ordinaryPreviewSnapshot() {
  const alias = new URL(expectedHostedReturnOrigin(HOSTED_ORDINARY_PREVIEW.applicationSha)).host;
  if (RETURN_ALIAS_HOST === alias) throw new Error("DEPLOY_CLINIC_ALIAS_NOT_ISOLATED");
  const details = [];
  for (const name of [HOSTED_ORDINARY_PREVIEW.id, HOSTED_ORDINARY_PREVIEW.immutableHostname, alias]) {
    const response = await vercelApi(`/v13/deployments/${encodeURIComponent(name)}`);
    if (response.status !== 200) throw new Error("DEPLOY_ORDINARY_PREVIEW_READBACK_FAILED");
    const d = assertPreservedOrdinaryPreview(response.json);
    details.push({ name, id: d.id, immutableHostname: d.url, target: d.target,
      applicationSha: d.meta.rcapApplicationSha, aliases: [...(d.alias ?? [])].sort() });
  }
  return { deploymentId: HOSTED_ORDINARY_PREVIEW.id, immutableHostname: HOSTED_ORDINARY_PREVIEW.immutableHostname, alias, details };
}

async function currentOrdinaryPreviewSnapshot() {
  const alias = new URL(expectedHostedReturnOrigin(CURRENT_PURPOSE_TUPLE.applicationSha,'managed_start')).host;
  if (RETURN_ALIAS_HOST === alias) throw new Error('DEPLOY_CURRENT_ORDINARY_ALIAS_NOT_ISOLATED');
  const details = [];
  for (const name of [CURRENT_ORDINARY_PREVIEW.id,CURRENT_ORDINARY_PREVIEW.hostname,alias]) {
    const response = await vercelApi('/v13/deployments/'+encodeURIComponent(name));
    if(response.status!==200)throw new Error('DEPLOY_CURRENT_ORDINARY_READBACK_FAILED');
    const d=classifyCurrentPurposeDeployment(response.json,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin);
    if(d.phase!=='managed_start_preview')throw new Error('DEPLOY_CURRENT_ORDINARY_PURPOSE_MISMATCH');
    details.push({name,...d});
  }
  return details;
}
async function sourceSuccessorProtectedSnapshot(){
 const result=[];for(const known of SOURCE_SUCCESSOR_PROTECTED){for(const name of [known.id,known.hostname,...(known.alias?[known.alias]:[])]){const response=await vercelApi('/v13/deployments/'+encodeURIComponent(name));if(response.status!==200)throw Error('DEPLOY_SOURCE_SUCCESSOR_PROTECTED_READBACK_FAILED');result.push({name,...assertProtectedSourceDeployment(response.json,known,expectedHostedReturnOrigin)});}}return result;
}
async function repairPredecessorSnapshot(){
  const result=[];
  for(const name of [MANAGED_REPAIR_PREDECESSOR.id,MANAGED_REPAIR_PREDECESSOR.hostname]){
    const response=await vercelApi('/v13/deployments/'+encodeURIComponent(name));
    const known=assertManagedRepairAliasPrestate(response,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin);result.push({name,...known});
  }
  return result;
}
async function purposeSiblingSnapshot(before) {
  const result=[];
  for(const prior of before){
    const response=await vercelApi('/v13/deployments/'+encodeURIComponent(prior.id));
    if(response.status!==200)throw new Error('DEPLOY_PURPOSE_SIBLING_READBACK_FAILED');
    result.push(classifyCurrentPurposeDeployment(response.json,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin));
  }
  return result;
}

// --- 0. Before-picture of everything this run must not disturb ---------------
const beforeProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}`);
const beforeEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}/env${(HELD_PURPOSE_PREVIEW||RUNTIME_REPAIR||SOURCE_SUCCESSOR)?"?decrypt=false":""}`);
if (beforeProject.status !== 200 || !Array.isArray(beforeProject.json?.alias) || beforeEnv.status !== 200 || !Array.isArray(beforeEnv.json?.envs)) {
  throw new Error("DEPLOY_PRODUCTION_BOUNDARY_READBACK_FAILED");
}
// Existing project readback must prove platform system variables are exposed.
if ((MANAGED_START || HELD_PURPOSE_PREVIEW) && beforeProject.json?.autoExposeSystemEnvs !== true) {
  throw new Error("DEPLOY_MANAGED_START_SYSTEM_ENV_EXPOSURE_UNPROVEN");
}
const aliasesBefore = Array.isArray(beforeProject.json?.alias)
  ? beforeProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
  : [];
const envBefore = envShape(Array.isArray(beforeEnv.json?.envs) ? beforeEnv.json.envs : []);
evidence.productionBefore = { aliases: aliasesBefore, environmentShape: envBefore };
if (ISOLATED_CLINIC_PREVIEW || MANAGED_START || configuredSandboxEnv) evidence.ordinaryPreviewBefore = await ordinaryPreviewSnapshot();
if (HELD_PURPOSE_PREVIEW) evidence.currentOrdinaryPreviewBefore = await currentOrdinaryPreviewSnapshot();
if(SOURCE_SUCCESSOR){evidence.sourceSuccessorProtectedBefore=await sourceSuccessorProtectedSnapshot();const response=await vercelApi('/v13/deployments/'+encodeURIComponent(RETURN_ALIAS_HOST));assertSourceSuccessorAliasAbsent(response);evidence.sourceSuccessorAliasBefore={hostname:RETURN_ALIAS_HOST,state:'absent'};}
if(RUNTIME_REPAIR){evidence.runtimeRepairPredecessorBefore=await repairPredecessorSnapshot();const a=await vercelApi("/v13/deployments/"+encodeURIComponent(RETURN_ALIAS_HOST));assertManagedRepairAliasPrestate(a,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin);evidence.runtimeRepairAliasBefore={hostname:RETURN_ALIAS_HOST,deploymentId:MANAGED_REPAIR_PREDECESSOR.id};}
if (aliasesBefore.includes(RETURN_ALIAS_HOST)) {
  console.error(`DEPLOY: deterministic acceptance alias ${RETURN_ALIAS_HOST} is attached to Production; refusing`);
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
const STRIPE_CONFIGURED = process.env.PHASE_INPUT !== "replace_preview" && Boolean(process.env.HOSTED_STRIPE_TEST_SECRET && process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET);
const ROUTE_STATE_TAG = ROUTE_STATE || "disabled";
// The sandbox catalog Product this Preview is built to sell. It is baked in at
// creation like every other environment variable, so it belongs in the reuse
// identity for exactly the reason Stripe configuration does: a Preview built
// without it sells the inline fallback, and reusing one under a run that is
// supposed to be proving the catalog path would prove the opposite.
const CATALOG_PRODUCT_ID = (process.env.HOSTED_STRIPE_CATALOG_PRODUCT_ID ?? "").trim();
if (CATALOG_PRODUCT_ID && !CATALOG_PRODUCT_ID.startsWith("prod_")) {
  console.error("DEPLOY: HOSTED_STRIPE_CATALOG_PRODUCT_ID is not a Stripe product id");
  process.exit(1);
}
const CATALOG_PRODUCT_TAG = CATALOG_PRODUCT_ID || "inline";
if (ISOLATED_CLINIC_PREVIEW && (process.env.HOSTED_STRIPE_TEST_SECRET || process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET || CATALOG_PRODUCT_ID || LEGAL_AID_EMAIL)) {
  throw new Error("DEPLOY_CLINIC_PROVIDER_CONFIGURATION_REFUSED");
}

async function findReusableDeployment() {
  if (HELD_PURPOSE_PREVIEW || RUNTIME_REPAIR || SOURCE_SUCCESSOR) {
    const matches=[],siblings=[],cursors=new Set(),seen=new Set();let until=null,pages=0,details=0,predecessors=0;
    do {
      if(++pages>50)throw new Error('DEPLOY_PURPOSE_SEARCH_PAGE_BOUND');
      const res=await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_IDENTITY.projectId)}&limit=100${until===null?'':`&until=${encodeURIComponent(until)}`}`);
      if(res.status!==200||!Array.isArray(res.json?.deployments)||res.json.deployments.length>100||!res.json.pagination||!Object.hasOwn(res.json.pagination,'next'))throw new Error('DEPLOY_PURPOSE_SEARCH_INCOMPLETE');
      for(const summary of res.json.deployments){
        const reported=[summary.meta?.rcapApplicationSha,summary.gitSource?.sha,summary.meta?.githubCommitSha].filter(Boolean);
        if(reported.length&&!reported.includes(APPLICATION_SHA))continue;
        if(++details>200)throw new Error('DEPLOY_PURPOSE_SEARCH_DETAIL_BOUND');
        const id=summary.uid??summary.id;if(!/^dpl_[A-Za-z0-9]+$/.test(id??''))throw new Error('DEPLOY_PURPOSE_SEARCH_ID_INVALID');
        const detail=await vercelApi('/v13/deployments/'+encodeURIComponent(id));
        if(detail.status!==200)throw new Error('DEPLOY_PURPOSE_SEARCH_READBACK_FAILED');
        const d=detail.json;
        if(d?.gitSource?.sha!==APPLICATION_SHA&&d?.meta?.rcapApplicationSha!==APPLICATION_SHA&&d?.meta?.githubCommitSha!==APPLICATION_SHA)continue;
        if(seen.has(id))throw new Error('DEPLOY_PURPOSE_DUPLICATE_SEARCH_ID');seen.add(id);
        if(SOURCE_SUCCESSOR){refusePriorSourceSuccessorAttempt(d);throw Error('DEPLOY_SOURCE_SUCCESSOR_UNKNOWN_ATTEMPT');}
        const known=RUNTIME_REPAIR?classifyManagedRepairSibling(d,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin):classifyCurrentPurposeDeployment(d,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin);
        if(RUNTIME_REPAIR&&known.id===MANAGED_REPAIR_PREDECESSOR.id)predecessors++;
        if(!RUNTIME_REPAIR&&known.phase===process.env.PHASE_INPUT)matches.push({url:'https://'+known.url,id:known.id});else siblings.push(known);
      }
      const next=res.json.pagination.next;if(next!==null&&(!Number.isFinite(next)||cursors.has(next)))throw new Error('DEPLOY_PURPOSE_SEARCH_PAGINATION_INVALID');
      until=next;cursors.add(next);
    }while(until!==null);
    if(RUNTIME_REPAIR&&predecessors!==1)throw new Error('DEPLOY_REPAIR_EXACT_PREDECESSOR_REQUIRED');
    if(matches.length>1)throw new Error('DEPLOY_PURPOSE_MULTIPLE_EXACT_TARGETS');
    evidence.purposePreviewSearch={complete:true,pages,details,exactReadyMatches:matches,siblings,observedAt:new Date().toISOString()};
    evidence.purposeSiblingsBefore=siblings;
    return matches[0]??null;
  }
  if (ISOLATED_CLINIC_PREVIEW || MANAGED_START) {
    // Read every page, including non-READY attempts. An incomplete/ambiguous
    // prior creation is a readback boundary, never permission to create twice.
    const expected = { ...FROZEN_WORKER_METADATA, rcapPreviewPurpose: ISOLATED_CLINIC_PREVIEW ? "mississippi_clinic" : "managed_start", rcapApplicationSha: APPLICATION_SHA,
      rcapAcceptanceProjectRef: PROJECT_REF, rcapClinicDemoMode: CLINIC_DEMO_MODE || "none",
      rcapRouteState: ROUTE_STATE_TAG, rcapStagingScopeSha256: sha256(SCOPE_IDS),
      rcapReturnOrigin: RETURN_ORIGIN, rcapStripeConfigured: "false", rcapCatalogProduct: "inline",
      ...(MANAGED_START ? { rcapOrdinaryGrantSha256: "9db1864b330945e3307a430a013328f9ec5a00ccfb2dee2bfec68dab8a780e40", rcapSponsoredChannel: MANAGED_START.grant.channel } : {}) };
    const matches = [], cursors = new Set();
    let until = null;
    do {
      const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_IDENTITY.projectId)}&limit=100${until === null ? "" : `&until=${encodeURIComponent(until)}`}`);
      if (res.status !== 200 || !Array.isArray(res.json?.deployments) || !res.json.pagination || !Object.hasOwn(res.json.pagination, "next")) throw new Error("DEPLOY_CLINIC_SEARCH_INCOMPLETE");
      for (const summary of res.json.deployments) {
        if (summary.meta?.rcapApplicationSha !== APPLICATION_SHA || summary.meta?.rcapClinicDemoMode !== (CLINIC_DEMO_MODE || "none")) continue;
        const detail = await vercelApi(`/v13/deployments/${encodeURIComponent(summary.uid ?? summary.id)}`);
        if (detail.status !== 200) throw new Error("DEPLOY_CLINIC_SEARCH_READBACK_FAILED");
        // Same-source Clinic attempts must be reconciled, not bypassed by a new deployment.
        const d = assertPreviewResponse(detail.json, expected);
        if (d.readyState !== "READY") throw new Error("DEPLOY_CLINIC_PRIOR_ATTEMPT_NOT_READY");
        matches.push({ url: `https://${d.url}`, id: d.id });
      }
      until = res.json.pagination.next;
      if (until !== null && (!Number.isFinite(until) || cursors.has(until))) throw new Error("DEPLOY_CLINIC_SEARCH_PAGINATION_INVALID");
      cursors.add(until);
    } while (until !== null);
    if (matches.length > 1) throw new Error("DEPLOY_CLINIC_MULTIPLE_EXACT_PREVIEWS");
    evidence.clinicPreviewSearch = { complete: true, exactReadyMatches: matches, observedAt: new Date().toISOString() };
    return matches[0] ?? null;
  }
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_IDENTITY.projectId)}&limit=100&state=READY`);
  if (res.status !== 200 || !Array.isArray(res.json?.deployments)) return null;
  const match = res.json.deployments.find(
    (d) =>
      (d.readyState ?? d.state) === "READY" &&
      (d.target === null || d.target === "preview") &&
      d.meta?.rcapApplicationSha === APPLICATION_SHA &&
      Object.entries(FROZEN_WORKER_METADATA).every(([key,value]) => d.meta?.[key] === value) &&
      d.meta?.rcapAcceptanceProjectRef === PROJECT_REF &&
      (process.env.PHASE_INPUT !== "replace_preview" || (d.meta?.rcapClosedPreview === "true" && d.meta?.rcapPartnerOnboardingEnabled === "true")) &&
      d.meta?.rcapStripeConfigured === String(STRIPE_CONFIGURED) &&
      d.meta?.rcapCatalogProduct === CATALOG_PRODUCT_TAG &&
      d.meta?.rcapRouteState === ROUTE_STATE_TAG &&
      d.meta?.rcapReturnOrigin === RETURN_ORIGIN &&
      d.meta?.rcapClinicDemoMode === (CLINIC_DEMO_MODE || "none") &&
      d.meta?.rcapStagingScopeSha256 === sha256(SCOPE_IDS)
  );
  return match ? { url: `https://${match.url}`, id: match.uid ?? match.id ?? null } : null;
}

// Resolve the acceptance project's keys before the scoped-identity decision.
// A completely fresh acceptance project has no consumer A yet, and the scope
// must name a real UUID before Vercel bakes the deployment environment.
const keys = await supabaseKeys();
if (!keys.anon || !keys.service) {
  console.error("DEPLOY: could not read the acceptance project's anon/service_role keys");
  process.exit(1);
}

// The scoped state names UUIDs, and a deployment's environment is fixed at
// creation, so the scope has to be resolved BEFORE the build rather than after.
// The bounded Mississippi Preview names exactly A and B. The legacy hosted
// payment matrix continues to name A alone so its existing negative control
// remains unchanged.
if (ROUTE_STATE === "staging_scoped" && (!SCOPE_IDS || ISOLATED_CLINIC_PREVIEW)) {
  const participants = MISSISSIPPI_PREVIEW_MODE
    ? [
        "mvl-demo-participant-a@rcap-acceptance.test",
        "mvl-demo-participant-b@rcap-acceptance.test"
      ]
    : ["acceptance-consumer-a@rcap-acceptance.test"];
  const resolved = [];
  const outcomes = [];
  for (const email of participants) {
    const lookup = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `select id from auth.users where lower(email)=lower('${sqlText(email)}') limit 1` })
    });
    const rows = await lookup.json().catch(() => null);
    let id = lookup.ok && Array.isArray(rows) ? rows[0]?.id : null;
    if (ISOLATED_CLINIC_PREVIEW && id !== HOSTED_MS_CLINIC_PARTICIPANTS[email]) throw new Error("DEPLOY_CLINIC_EXISTING_IDENTITY_MISMATCH");
    if (!id && (ISOLATED_CLINIC_PREVIEW || process.env.HOSTED_EXISTING_PARTICIPANT_ONLY === "true")) {
      throw new Error("DEPLOY_EXISTING_ACCEPTANCE_PARTICIPANT_REQUIRED");
    }
    if (!id) {
      const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: keys.service,
          Authorization: `Bearer ${keys.service}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password: syntheticPassword(email),
          email_confirm: true
        })
      });
      const createdUser = await created.json().catch(() => null);
      id = createdUser?.id ?? createdUser?.user?.id ?? null;
      outcomes.push(id ? `created_${email.split("@")[0]}` : `failed_${email.split("@")[0]}_${created.status}`);
    } else {
      outcomes.push(`reused_${email.split("@")[0]}`);
    }
    if (!id) {
      console.error(`DEPLOY: staging_scoped identity ${email.split("@")[0]} could not be resolved in the pinned acceptance project`);
      process.exit(1);
    }
    resolved.push(id);
  }
  if (ISOLATED_CLINIC_PREVIEW && SCOPE_IDS && SCOPE_IDS !== resolved.join(",")) throw new Error("DEPLOY_CLINIC_SCOPE_MISMATCH");
  SCOPE_IDS = resolved.join(",");
  evidence.syntheticConsumerBootstrap = outcomes;
  evidence.stagingScopeParticipantCount = resolved.length;
}

if (MISSISSIPPI_PREVIEW_MODE && (ROUTE_STATE !== "staging_scoped" || SCOPE_IDS.split(",").filter(Boolean).length !== 2)) {
  console.error("DEPLOY: the Mississippi Clinic Preview requires staging_scoped delivery with exactly two participant UUIDs");
  process.exit(1);
}

if (MANAGED_START) {
  const participantId = MANAGED_START.grant.participantUserIds[0];
  const lookup = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `select id from auth.users where id='${participantId}'::uuid and deleted_at is null and (banned_until is null or banned_until < now())` })
  });
  const rows = await lookup.json().catch(() => null);
  if (!lookup.ok || !Array.isArray(rows) || rows.length !== 1 || rows[0]?.id !== participantId) {
    throw new Error("DEPLOY_MANAGED_START_EXISTING_PARTICIPANT_REQUIRED");
  }
  evidence.managedStartExistingParticipant = { id: participantId, verified: true, created: false };
}

if(configuredSandboxEnv){
  const lookup=await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:`select id from auth.users where id='${CONFIGURED_SANDBOX_OWNER}'::uuid and deleted_at is null and (banned_until is null or banned_until < now())`})});
  const rows=await lookup.json().catch(()=>null);if(!lookup.ok||!Array.isArray(rows)||rows.length!==1||rows[0]?.id!==CONFIGURED_SANDBOX_OWNER)throw new Error('DEPLOY_CONFIGURED_EXISTING_PARTICIPANT_REQUIRED');
  evidence.configuredSandboxExistingParticipant={verified:true,created:false};
}

const reusable = await findReusableDeployment();
// Legacy metadata cannot prove the deployed keys equal the preserved inputs.
// Refuse reuse until that exact deployment has independent continuity proof;
// never silently reuse it or create a second deployment to bypass the hold.
if (reusable) throw new Error("DEPLOY_REUSE_PRESERVED_KEY_CONTINUITY_UNPROVEN");
if (ISOLATED_CLINIC_PREVIEW || configuredSandboxEnv) {
  const current = await vercelApi(`/v13/deployments/${encodeURIComponent(RETURN_ALIAS_HOST)}`);
  if (current.status !== 404) {
    if (current.status !== 200 || !reusable || current.json?.id !== reusable.id) throw new Error("DEPLOY_CLINIC_ALIAS_CONFLICT");
    assertPreviewResponse(current.json, { rcapReturnOrigin: RETURN_ORIGIN, rcapClinicDemoMode: CLINIC_DEMO_MODE }, reusable.id);
  }
  if(HELD_PURPOSE_PREVIEW)evidence.purposeAliasBefore={hostname:RETURN_ALIAS_HOST,state:current.status===404?"absent":"existing",deploymentId:current.json?.id??null};
  if(ISOLATED_CLINIC_PREVIEW)evidence.clinicScope = { participants: HOSTED_MS_CLINIC_PARTICIPANTS, scope: SCOPE_IDS, sha256: sha256(SCOPE_IDS) };
  else evidence.configuredSandboxScope={participantCount:1,sha256:sha256(SCOPE_IDS)};
  fs.writeFileSync(path.join(EVIDENCE_DIR, ISOLATED_CLINIC_PREVIEW?"clinic-deploy-before.json":"configured-sandbox-before.json"), `${JSON.stringify(evidence, null, 2)}\n`);
}

// --- 1. Deploy to Preview ----------------------------------------------------
// Public at build time, server-only at runtime. The delivery flag is passed
// ONLY when ROUTE_STATE is explicitly set; the default deployment carries no
// flag at all, so the control's own default (disabled) applies.
// Candidate staging cannot inherit payment, legacy billing or outbound delivery authority.
const closedPreviewEnv = (process.env.PHASE_INPUT === "replace_preview" || ISOLATED_CLINIC_PREVIEW || MANAGED_START) ? {
  RCAP_PARTNER_ONBOARDING_ENABLED: "true",
  RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "disabled",
  RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: "",
  RCAP_SPONSORED_PREVIEW_CHANNEL: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
  STRIPE_LEGACY_WEBHOOK_SECRET: "",
  OPENAI_API_KEY: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  ENABLE_PARTNER_EMAIL_DELIVERY: "false",
  EXPUNGEMENT_EMAIL_PROVIDER: "",
  RESEND_API_KEY: "",
  INTERNAL_ADMIN_ACCESS_TOKEN: "",
  LEGALEASE_OS_EVENTS_ENABLED: "false",
  LEGALEASE_OS_EVENTS_ENDPOINT: "",
  ...(ISOLATED_CLINIC_PREVIEW ? { STRIPE_CONSUMER_PACKET_PRODUCT_ID: "", PARTNER_EMAIL_PROVIDER: "" } : {})
} : {};
const runtimeEnv = {
  NEXT_PUBLIC_EXPUNGEMENT_AI_URL: RETURN_ORIGIN,
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: keys.anon,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: keys.service,
  ENABLE_SUPABASE_PARTNER_DATA: "true",
  // Stripe TEST mode only. A live key is never present in this environment and
  // the payment adapter refuses dry-run in a production runtime independently.
  STRIPE_SECRET_KEY: process.env.HOSTED_STRIPE_TEST_SECRET || "sk_test_hosted_acceptance_placeholder",
  STRIPE_WEBHOOK_SECRET: process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET || "whsec_hosted_acceptance_placeholder",
  // The sandbox catalog Product, so this Preview exercises the catalog-product
  // Checkout path that production runs rather than the inline fallback it
  // replaced. It is a test-mode product id from the sandbox fixtures, never the
  // live catalog entry: the application picks its production default only when
  // this is absent and the deployment is production.
  ...(CATALOG_PRODUCT_ID ? { STRIPE_CONSUMER_PACKET_PRODUCT_ID: CATALOG_PRODUCT_ID } : {}),
  ...(ROUTE_STATE ? { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: ROUTE_STATE } : {}),
  ...(CLINIC_DEMO_MODE ? { RCAP_SPONSORED_PREVIEW_CHANNEL: CLINIC_DEMO_MODE } : {}),
  ...(SCOPE_IDS ? { RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: SCOPE_IDS } : {}),
  // Server-only transport to this Acceptance deployment; never build inputs.
  ...PRESERVED_DATA_KEYS,
  ...(HELD_PURPOSE_PREVIEW?{NEXT_PUBLIC_RCAP_BUILD_SHA:APPLICATION_SHA,RCAP_2_0_ENABLED:"true",RCAP_PARTNER_LAUNCH_ENABLED:"false",RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:"",RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:"",VERCEL_AUTOMATION_BYPASS_SECRET:""}:{}),
  // Legal Aid browser phase only, and only when the workflow was given all
  // three nonproduction email values: the Preview then carries a real email
  // provider so follow-up delivery to the authorized test mailbox can be
  // proved. Without them nothing is set and the application reports
  // "saved, not sent". Never a Production sender or key.
  ...(LEGAL_AID_EMAIL ? {
    ENABLE_PARTNER_EMAIL_DELIVERY: "true",
    PARTNER_EMAIL_PROVIDER: "resend",
    RESEND_API_KEY: LEGAL_AID_EMAIL.apiKey,
    PARTNER_EMAIL_FROM: LEGAL_AID_EMAIL.from
  } : {}),
  VERCEL_SUPPORT_LARGE_FUNCTIONS: "1",
  ...closedPreviewEnv,
  ...(ISOLATED_CLINIC_PREVIEW ? {
    RCAP_CONSUMER_DELIVERY_ROUTE_STATE: ROUTE_STATE,
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: SCOPE_IDS,
    RCAP_SPONSORED_PREVIEW_CHANNEL: CLINIC_DEMO_MODE
  } : {}),
  ...(configuredSandboxEnv?.runtime ?? {}),
  ...(MANAGED_START ? {
    NEXT_PUBLIC_RCAP_BUILD_SHA: APPLICATION_SHA,
    RCAP_2_0_ENABLED: "true",
    ...((RUNTIME_REPAIR||SOURCE_SUCCESSOR)?{RCAP_ONBOARDING_LAUNCH_PREP_ENABLED:"true",RCAP_LAUNCH_STUDIO_ENABLED:"false"}:{}),
    RCAP_CONSUMER_DELIVERY_ROUTE_STATE: MANAGED_START.grant.routeState,
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: MANAGED_START.grant.participantUserIds.join(","),
    RCAP_SPONSORED_PREVIEW_CHANNEL: MANAGED_START.grant.channel,
    RCAP_PARTNER_LAUNCH_ENABLED: "true",
    RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION: MANAGED_START.authorization,
    RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN: "",
    VERCEL_AUTOMATION_BYPASS_SECRET: MANAGED_START.bypass
  } : {})
};
const buildEnv = {
  ...closedPreviewEnv,
  ...(ISOLATED_CLINIC_PREVIEW ? { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: "", LEGAL_AID_RESTRICTED_FIELD_KEY: "", LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "", PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: "" } : {}),
  ...(process.env.PHASE_INPUT === "replace_preview" ? { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: "", VERCEL_ANALYZE_BUILD_OUTPUT: "1" } : {}),
  NEXT_PUBLIC_EXPUNGEMENT_AI_URL: RETURN_ORIGIN,
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
  VERCEL_SUPPORT_LARGE_FUNCTIONS: "1",
  ...(configuredSandboxEnv?.build ?? {}),
  ...(HELD_PURPOSE_PREVIEW?{NEXT_PUBLIC_RCAP_BUILD_SHA:APPLICATION_SHA,RCAP_2_0_ENABLED:"true",SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:"",LEGAL_AID_RESTRICTED_FIELD_KEY:"",LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION:"",PARTICIPANT_PRIVACY_PSEUDONYM_SECRET:"",RCAP_PARTNER_LAUNCH_ENABLED:"false",RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:"",RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:"",VERCEL_AUTOMATION_BYPASS_SECRET:""}:{}),
  ...(MANAGED_START ? {
    NEXT_PUBLIC_RCAP_BUILD_SHA: APPLICATION_SHA,
    RCAP_2_0_ENABLED: "true",
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: "",
    LEGAL_AID_RESTRICTED_FIELD_KEY: "",
    LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "",
    PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: "",
    RCAP_PARTNER_LAUNCH_ENABLED: "false",
    RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION: "",
    RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN: "",
    VERCEL_AUTOMATION_BYPASS_SECRET: ""
  } : {})
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
  evidence.legalAidEmailDelivery = LEGAL_AID_EMAIL
    ? { configured: true, provider: "resend", valuesRecorded: false }
    : { configured: false, note: "no nonproduction email provider supplied; follow-up messages are saved, not sent" };
  evidence.stripe = {
    mode: process.env.PHASE_INPUT === "replace_preview" ? "closed candidate Preview; Stripe credentials are absent" : stripeSecret ? "test key supplied" : "no key supplied; the placeholder cannot transact",
    webhookSigningSecretSupplied: process.env.PHASE_INPUT !== "replace_preview" && Boolean(stripeWebhook)
  };
}

const deploymentMeta = {
  ...(RUNTIME_REPAIR?managedRepairMetadata(RETURN_ORIGIN):{}),
  ...(SOURCE_SUCCESSOR?sourceSuccessorMetadata(RETURN_ORIGIN):{}),
  ...(configuredSandboxEnv?currentPurposeMetadata(CONFIGURED_SANDBOX_PHASE,RETURN_ORIGIN):{}),
  ...(process.env.PHASE_INPUT === "replace_preview" ? { rcapClosedPreview: "true", rcapPartnerOnboardingEnabled: "true" } : {}),
  ...FROZEN_WORKER_METADATA,
  ...(ISOLATED_CLINIC_PREVIEW ? { rcapPreviewPurpose: "mississippi_clinic" } : MANAGED_START ? { rcapPreviewPurpose: "managed_start" } : {}),
  ...(MANAGED_START ? { rcapOrdinaryGrantSha256: "9db1864b330945e3307a430a013328f9ec5a00ccfb2dee2bfec68dab8a780e40", rcapSponsoredChannel: MANAGED_START.grant.channel } : {}),
  rcapApplicationSha: APPLICATION_SHA,
  rcapAcceptanceProjectRef: PROJECT_REF,
  rcapStripeConfigured: String(STRIPE_CONFIGURED),
  rcapCatalogProduct: CATALOG_PRODUCT_TAG,
  rcapRouteState: ROUTE_STATE_TAG,
  rcapReturnOrigin: RETURN_ORIGIN,
  rcapClinicDemoMode: CLINIC_DEMO_MODE || "none",
  rcapStagingScopeSha256: sha256(SCOPE_IDS)
};

let deploymentUrl = null;
if (reusable) {
  // No third deployment is created. Every proof below still runs against this
  // URL unchanged — reuse skips the creation, never the verification.
  deploymentUrl = reusable.url;
  evidence.deploymentOrigin = "reused an existing READY Preview deployment of the same application SHA";
  console.log(`  reusing READY Preview deployment ${reusable.id ?? "(id unknown)"} — no new deployment created`);
} else {
  console.log(`  creating one REST Preview from exact Git SHA ${APPLICATION_SHA}`);
  try {
    const created = await createRestPreview({token: VERCEL_TOKEN, identity: VERCEL_IDENTITY,
      applicationSha: APPLICATION_SHA, runtimeEnv, buildEnv, meta: deploymentMeta}, {
      onState: receipt => {
        evidence.restCreation = receipt;
        fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({...evidence, passed:false, status:"REST_ATTEMPT_PENDING_VERIFICATION"}, null, 2)}\n`);
      }
    });
    deploymentUrl = created.url;
    evidence.restCreation = created;
  } catch (error) {
    // Do not log the request, response body, or credentials. No fallback/retry.
    const failure = /^REST_[A-Z0-9_]+$/.test(error.message ?? "") ? error.message : "REST_TRANSPORT_FAILED_NO_RETRY";
    fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({...evidence, passed:false, failure}, null, 2)}\n`);
    console.error(`DEPLOY FAILED — ${failure}`);
    process.exit(1);
  }
  evidence.deploymentOrigin = "created a new Preview deployment";
}
evidence.deploymentUrl = deploymentUrl;
console.log(`  immutable deployment URL: ${deploymentUrl}`);

// --- 2. Prove Preview identity, then bind the build-time return alias --------
let deployedAcceptanceProjectRef = null;
let deploymentId = null;
{
  const host = deploymentUrl.replace(/^https:\/\//, "");
  const detail = await vercelApi(`/v13/deployments/${encodeURIComponent(host)}`);
  if (detail.status !== 200) throw new Error("DEPLOY_EXACT_READBACK_FAILED");
  assertPreviewResponse(detail.json, deploymentMeta, reusable?.id);
  if (detail.json.readyState !== "READY") throw new Error("DEPLOY_PREVIEW_NOT_READY");
  const target = detail.json?.target ?? null;
  const meta = detail.json?.meta ?? {};
  deploymentId = detail.json?.id ?? detail.json?.uid ?? null;
  record(
    "deployed_to_preview_not_production",
    detail.status === 200 && (target === null || target === "preview"),
    `Vercel reports target=${JSON.stringify(target)} for this deployment (must be Preview); readyState=${detail.json?.readyState ?? "unknown"}`
  );
  record(
    "deployment_carries_the_accepted_worker_binding",
    Object.entries(FROZEN_WORKER_METADATA).every(([key,value]) => meta[key] === value),
    `deployment metadata records worker ${meta.rcapWorkerSourceSha} at ${meta.rcapWorkerDigest}; canonical inputs ${meta.rcapWorkerInputFingerprint}`
  );
  record(
    "deployment_carries_the_final_application_sha",
    meta.rcapApplicationSha === APPLICATION_SHA && meta.rcapReturnOrigin === RETURN_ORIGIN,
    `deployment metadata records rcapApplicationSha=${meta.rcapApplicationSha ?? "(absent)"} and rcapReturnOrigin=${meta.rcapReturnOrigin ?? "(absent)"}`
  );
  deployedAcceptanceProjectRef = meta.rcapAcceptanceProjectRef ?? null;
  evidence.deployment = { id: deploymentId, target, readyState: detail.json?.readyState ?? null, immutableHostname: host };
  evidence.deployment.gitSourceSha = detail.json.gitSource.sha;
  evidence.deployment.projectId = detail.json.projectId;
  evidence.deployment.metadata = meta;
  evidence.deploymentAliases = Array.isArray(detail.json?.alias) ? detail.json.alias : [];
}

if (MANAGED_START || HELD_PURPOSE_PREVIEW) {
  const response = await fetch(`${deploymentUrl}/api/rcap/release`, {
    method: "GET", redirect: "manual", signal: AbortSignal.timeout(30000),
    headers: { "x-vercel-protection-bypass": MANAGED_START?MANAGED_START.bypass:process.env.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-skip-toolbar": "1" }
  });
  const release = await response.json().catch(() => null);
  let identity;
  try{identity=assertPurposeRuntimeIdentity({status:response.status,body:release,applicationSha:APPLICATION_SHA,adminLaunch:Boolean(MANAGED_START)});}
  catch{throw new Error(MANAGED_START?"DEPLOY_MANAGED_START_RELEASE_SOURCE_UNPROVEN":"DEPLOY_PURPOSE_RUNTIME_SOURCE_IDENTITY_UNPROVEN");}
  record(MANAGED_START?"managed_start_release_source_bound":"purpose_runtime_source_identity", identity.runtimeSourceIdentityVerified,
    `immutable release GET=${response.status}; exact build/runtime source=${identity.runtimeSourceIdentityVerified}; ordinary admin launch sourceBound=${identity.adminLaunchSourceBound}`);
  const proof={status:response.status,...identity,applicationSha:APPLICATION_SHA,deploymentId};
  if(MANAGED_START)evidence.managedStartRelease={...proof,sourceBound:release.sourceBound};else evidence.purposeRuntimeRelease=proof;
}

let sourceSuccessorAliasAttempted=false;
let runtimeRepairAliasAttempted=false;
try {
if (deploymentId && verdicts.get("deployed_to_preview_not_production")?.passed && verdicts.get("deployment_carries_the_final_application_sha")?.passed) {
  const current = await vercelApi(`/v13/deployments/${encodeURIComponent(RETURN_ALIAS_HOST)}`);
  const currentId = current.json?.id ?? current.json?.uid ?? null;
  if(SOURCE_SUCCESSOR)assertSourceSuccessorAliasAbsent(current);
  else if(RUNTIME_REPAIR)assertManagedRepairAliasPrestate(current,VERCEL_IDENTITY.projectId,expectedHostedReturnOrigin);
  else if ((ISOLATED_CLINIC_PREVIEW || MANAGED_START || HELD_PURPOSE_PREVIEW) && current.status !== 404 && (current.status !== 200 || currentId !== deploymentId)) throw new Error("DEPLOY_CLINIC_ALIAS_CONFLICT");
  if (current.status !== 200 || currentId !== deploymentId) {
    if (ISOLATED_CLINIC_PREVIEW || MANAGED_START || HELD_PURPOSE_PREVIEW) fs.writeFileSync(path.join(EVIDENCE_DIR, "deploy.json"), `${JSON.stringify({...evidence, status:"ALIAS_ASSIGNMENT_PENDING"}, null, 2)}\n`);
    if(SOURCE_SUCCESSOR)sourceSuccessorAliasAttempted=true;
    if(RUNTIME_REPAIR)runtimeRepairAliasAttempted=true;
    const assigned = await vercelApi(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: RETURN_ALIAS_HOST })
    });
    if (assigned.status < 200 || assigned.status >= 300) {
      evidence.aliasAssignment = { status: assigned.status, passed: false };
    }
  }
  const bound = await vercelApi(`/v13/deployments/${encodeURIComponent(RETURN_ALIAS_HOST)}`);
  const boundId = bound.json?.id ?? bound.json?.uid ?? null;
  const boundTarget = bound.json?.target ?? null;
  const boundMeta = bound.json?.meta ?? {};
  const aliasPassed = bound.status === 200
    && boundId === deploymentId
    && (boundTarget === null || boundTarget === "preview")
    && boundMeta.rcapApplicationSha === APPLICATION_SHA
    && boundMeta.rcapReturnOrigin === RETURN_ORIGIN;
  record(
    "deterministic_nonproduction_return_alias_bound",
    aliasPassed,
    `${RETURN_ALIAS_HOST} resolves to deployment ${boundId ?? "(none)"}; target=${JSON.stringify(boundTarget)}; exact SHA/return-origin metadata=${boundMeta.rcapApplicationSha === APPLICATION_SHA && boundMeta.rcapReturnOrigin === RETURN_ORIGIN}`
  );
  evidence.aliasAssignment = { hostname: RETURN_ALIAS_HOST, deploymentId: boundId, target: boundTarget, passed: aliasPassed };
  if(SOURCE_SUCCESSOR){evidence.sourceSuccessorAliasInverse={hostname:RETURN_ALIAS_HOST,priorState:'absent',createdDeploymentId:deploymentId,currentBindingMustEqual:deploymentId,performed:false};if(!aliasPassed)throw Error('DEPLOY_SOURCE_SUCCESSOR_ALIAS_FAILED_NO_RETRY');}
  if(RUNTIME_REPAIR){
    evidence.runtimeRepairAliasInverse={hostname:RETURN_ALIAS_HOST,priorDeploymentId:MANAGED_REPAIR_PREDECESSOR.id,createdDeploymentId:deploymentId,currentBindingMustEqual:deploymentId,performed:false};
    if(!aliasPassed){fs.writeFileSync(path.join(EVIDENCE_DIR,"deploy.json"),`${JSON.stringify({...evidence,passed:false,status:"REPAIR_ALIAS_FAILED_NO_RETRY"},null,2)}\n`);throw Error("DEPLOY_REPAIR_ALIAS_FAILED_NO_RETRY");}
  }
  if(HELD_PURPOSE_PREVIEW)evidence.purposeAliasInverse={hostname:RETURN_ALIAS_HOST,priorState:evidence.purposeAliasBefore?.state,createdDeploymentId:deploymentId,currentBindingMustEqual:deploymentId,permittedScope:"Only remove the new binding introduced by this operation if it still names this exact deployment; never alter pre-existing or Production aliases",performed:false};
} else {
  record("deterministic_nonproduction_return_alias_bound", false, "Vercel returned no deployment id to bind");
}

const previewUrl = RETURN_ORIGIN;
evidence.previewUrl = previewUrl;
console.log(`  exact acceptance return origin: ${previewUrl}`);

// --- 2b. Where does the Stripe webhook now have to point? --------------------
//
// A Stripe webhook destination is configured once and then keeps firing at
// whatever URL it holds. This release uses the deterministic SHA-scoped alias
// above for both browser return URLs and the webhook destination. The existing
// sandbox destination is still retargeted and reverified explicitly because it
// currently names the superseded immutable deployment hostname.
//
// So this is derived rather than assumed. The previous host is queried on its
// own and asked which application SHA it carries; the new deployment is asked
// for any alias that would let a stable URL survive the move.
if (!ISOLATED_CLINIC_PREVIEW && !MANAGED_START) {
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
    deployedAcceptanceProjectRef === PROJECT_REF,
    `deployment metadata records rcapAcceptanceProjectRef=${deployedAcceptanceProjectRef ?? "(absent)"} against ${PROJECT_REF}; the acceptance URL hashes to ${acceptanceHash.slice(0, 16)}…`
  );

  const afterProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}`);
  const aliasesAfter = Array.isArray(afterProject.json?.alias)
    ? afterProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
    : [];
  record(
    "production_aliases_unchanged",
    JSON.stringify(aliasesBefore) === JSON.stringify(aliasesAfter),
    `${aliasesBefore.length} production alias(es) before, ${aliasesAfter.length} after, identical sets`
  );

  const afterEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}/env${(HELD_PURPOSE_PREVIEW||RUNTIME_REPAIR||SOURCE_SUCCESSOR)?"?decrypt=false":""}`);
  if (afterProject.status !== 200 || !Array.isArray(afterProject.json?.alias) || afterEnv.status !== 200 || !Array.isArray(afterEnv.json?.envs)) {
    throw new Error("DEPLOY_PRODUCTION_BOUNDARY_READBACK_FAILED");
  }
  const envAfter = envShape(Array.isArray(afterEnv.json?.envs) ? afterEnv.json.envs : []);
  record(
    "production_environment_variables_unchanged",
    JSON.stringify(envBefore) === JSON.stringify(envAfter),
    `${envBefore.length} production-target variable(s) before and ${envAfter.length} after, with identical keys, targets and updatedAt stamps — no value was read into this comparison`
  );
  evidence.productionUntouched = { aliasCount: aliasesAfter.length, productionVariableCount: envAfter.length };
  evidence.productionAfter = { aliases: aliasesAfter, environmentShape: envAfter };
}
if (ISOLATED_CLINIC_PREVIEW || MANAGED_START || configuredSandboxEnv) {
  evidence.ordinaryPreviewAfter = await ordinaryPreviewSnapshot();
  record("ordinary_preview_unchanged", JSON.stringify(evidence.ordinaryPreviewBefore) === JSON.stringify(evidence.ordinaryPreviewAfter), "ordinary deployment, immutable hostname and application-SHA alias compared before/after");
}
if(SOURCE_SUCCESSOR){evidence.sourceSuccessorProtectedAfter=await sourceSuccessorProtectedSnapshot();record('source_successor_protected_targets_unchanged',JSON.stringify(evidence.sourceSuccessorProtectedBefore)===JSON.stringify(evidence.sourceSuccessorProtectedAfter),'9aad source predecessor triplet, BaX repair triplet, original managed immutable pair, DTC and Clinic triplets unchanged; Production independently preserved');}
if(RUNTIME_REPAIR){
  evidence.runtimeRepairPredecessorAfter=await repairPredecessorSnapshot();record('repair_predecessor_immutable_unchanged',JSON.stringify(evidence.runtimeRepairPredecessorBefore)===JSON.stringify(evidence.runtimeRepairPredecessorAfter),'original managed immutable deployment stays unchanged; alias transition is separately guarded');
  evidence.purposeSiblingsAfter=await purposeSiblingSnapshot(evidence.purposeSiblingsBefore??[]);record('purpose_siblings_unchanged',JSON.stringify(evidence.purposeSiblingsBefore)===JSON.stringify(evidence.purposeSiblingsAfter),'known same-application sibling identities remain unchanged');
}
if (HELD_PURPOSE_PREVIEW) {
  evidence.currentOrdinaryPreviewAfter=await currentOrdinaryPreviewSnapshot();
  record('current_ordinary_preview_unchanged',JSON.stringify(evidence.currentOrdinaryPreviewBefore)===JSON.stringify(evidence.currentOrdinaryPreviewAfter),'current managed ordinary target preserved across all three names');
  evidence.purposeSiblingsAfter=await purposeSiblingSnapshot(evidence.purposeSiblingsBefore??[]);
  record('purpose_siblings_unchanged',JSON.stringify(evidence.purposeSiblingsBefore)===JSON.stringify(evidence.purposeSiblingsAfter),'all reconciled same-application purpose siblings remain unchanged');
}
if(configuredSandboxEnv){
  const expected=currentPurposeMetadata(CONFIGURED_SANDBOX_PHASE,RETURN_ORIGIN);
  record('configured_sandbox_scope_and_purpose_exact',Object.entries(expected).every(([key,value])=>evidence.deployment.metadata[key]===value),'existing scoped owner/test catalog only; no payment or worker executed');
}

if (ISOLATED_CLINIC_PREVIEW) {
  record("clinic_scope_and_purpose_exact", evidence.deployment.metadata.rcapStagingScopeSha256 === sha256(Object.values(HOSTED_MS_CLINIC_PARTICIPANTS).join(","))
    && evidence.deployment.metadata.rcapRouteState === "staging_scoped" && evidence.deployment.metadata.rcapClinicDemoMode === "mississippi_preview", "existing A/B identities only; exact scope hash and Clinic metadata");
  evidence.clinicExecutionPerformed = false;
  evidence.stripeRetargetPerformed = false;
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
      const suffix = bypass && !MANAGED_START ? `${joiner}x-vercel-protection-bypass=${encodeURIComponent(bypass)}` : "";
      const res = await fetch(`${previewUrl}${pathname}${suffix}`, {
        ...init,
        ...(MANAGED_START ? { redirect: "manual" } : {}),
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

  const healthy = health.status === 200
    && health.json !== null
    && typeof health.json === "object"
    && "checks" in health.json;
  record(
    "deployed_application_health_is_200",
    healthy,
    `GET /api/health=${health.status}; application JSON with checks=${Boolean(health.json && typeof health.json === "object" && "checks" in health.json)}`
  );

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
  // Publish the identity this step resolved or created. Without it the
  // resolver's outputs are the only source downstream, and those are
  // deliberately empty on the create path — the deployment does not exist yet
  // when the resolver runs. Run 32382623729 failed exactly there: the Checkout
  // gate received an empty HOSTED_PREVIEW_DEPLOYMENT_ID after a successful
  // deploy, and reported a missing input rather than a wrong one.
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, [
      `hostname=${previewUrl ? String(previewUrl).replace(/^https?:\/\//, "") : ""}`,
      `deployment_id=${evidence.deployment?.id ?? ""}`
    ].join("\n") + "\n");
  }
  if (evidence.passed) console.log(`DEPLOY PASSED — ${previewUrl} on ${PROJECT_REF}, Preview only, production untouched.`);
  if(SOURCE_SUCCESSOR&&!evidence.passed)throw Error("DEPLOY_SOURCE_SUCCESSOR_POSTCHECK_FAILED");
  if(RUNTIME_REPAIR&&!evidence.passed)throw Error("DEPLOY_REPAIR_POSTCHECK_FAILED");
  process.exit(evidence.passed ? 0 : 1);
}

} catch(error) {
  if(SOURCE_SUCCESSOR){
    if(sourceSuccessorAliasAttempted){try{evidence.sourceSuccessorAliasInverse=await restoreSourceSuccessorAlias({api:vercelApi,newDeploymentId:deploymentId});}catch{evidence.sourceSuccessorAliasInverse={performed:false,restored:false,blocked:true,currentBindingMustEqual:deploymentId};}}
    fs.writeFileSync(path.join(EVIDENCE_DIR,'deploy.json'),`${JSON.stringify({...evidence,passed:false,status:'SOURCE_SUCCESSOR_STOP_NO_RETRY'},null,2)}\n`);throw Error('DEPLOY_SOURCE_SUCCESSOR_STOP_NO_RETRY');
  }
  if(RUNTIME_REPAIR){
    if(runtimeRepairAliasAttempted){try{evidence.runtimeRepairAliasInverse=await restoreManagedRepairAlias({api:vercelApi,alias:RETURN_ALIAS_HOST,newDeploymentId:deploymentId,assertPredecessor:repairPredecessorSnapshot});}catch{evidence.runtimeRepairAliasInverse={performed:false,restored:false,blocked:true,priorDeploymentId:MANAGED_REPAIR_PREDECESSOR.id,currentBindingMustEqual:deploymentId};}}
    fs.writeFileSync(path.join(EVIDENCE_DIR,"deploy.json"),`${JSON.stringify({...evidence,passed:false,status:"REPAIR_STOP_NO_RETRY"},null,2)}\n`);
    throw Error("DEPLOY_REPAIR_STOP_NO_RETRY");
  }
  throw error;
}
