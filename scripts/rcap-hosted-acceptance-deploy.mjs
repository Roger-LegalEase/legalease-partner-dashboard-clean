#!/usr/bin/env node
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

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRestPreview } from "./rcap-hosted-vercel-rest-transport.mjs";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  HOSTED_PREVIEW_VARIANTS,
  expectedHostedReturnOrigin,
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
const CLINIC_DEMO_MODE = (process.env.HOSTED_CLINIC_DEMO_MODE ?? "").trim();
const MISSISSIPPI_PREVIEW_MODE = CLINIC_DEMO_MODE === "mississippi_preview";
const CLINIC_DEMO_PASSWORD = (process.env.HOSTED_CLINIC_DEMO_PASSWORD ?? "").trim();
// A SECOND Preview of the SAME application SHA, differing only in its
// per-deployment environment.
//
// Two required acceptance cases cannot both run on one deployment. Proving that
// a stored Session which CANNOT be verified is refused needs a deployment with
// no expected Stripe account; proving that one POSITIVELY VERIFIED as absent is
// replaced needs a deployment that has one. Configuring the ordinary Preview
// would silently convert the first case's refusal into a replacement, so the
// second half runs here instead, on its own Preview with its own alias.
const PREVIEW_VARIANT = (process.env.HOSTED_PREVIEW_VARIANT ?? "").trim() || null;
if (PREVIEW_VARIANT !== null && !HOSTED_PREVIEW_VARIANTS.includes(PREVIEW_VARIANT)) {
  console.error(`DEPLOY: HOSTED_PREVIEW_VARIANT must be one of ${HOSTED_PREVIEW_VARIANTS.join(", ")}`);
  process.exit(1);
}
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
const VERCEL_IDENTITY = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
const RETURN_ORIGIN = expectedHostedReturnOrigin(APPLICATION_SHA, PREVIEW_VARIANT);
const RETURN_ALIAS_HOST = new URL(RETURN_ORIGIN).host;

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  // The verified-account Preview must prove it actually carries the expectation
  // it exists for. Without this, the narrow phase that runs on it could pass by
  // taking the ordinary Preview's refusal path and calling it success.
  ...((process.env.HOSTED_PREVIEW_VARIANT ?? "").trim() === "verified-account"
    ? ["verified_stripe_account_bound_to_this_preview"]
    : []),
  "deployed_to_preview_not_production",
  "deployment_carries_the_final_application_sha",
  "deterministic_nonproduction_return_alias_bound",
  "bound_to_the_acceptance_supabase_project_only",
  "production_aliases_unchanged",
  "production_environment_variables_unchanged",
  "deployed_application_health_is_200",
  "delivery_route_refuses_on_the_deployed_instance"
];

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function sqlText(value) {
  return String(value).split("'").join("''");
}

// A stable acceptance-only secret: the same acceptance environment always
// derives the same bytes, so a replacement Preview can still read what the
// previous Preview encrypted, and no value ever has to be stored or shown.
function acceptanceServerSecret(purpose, bytes) {
  const material = CLINIC_DEMO_PASSWORD.length >= 20 ? CLINIC_DEMO_PASSWORD : SUPABASE_ACCESS_TOKEN;
  return crypto.createHmac("sha256", material).update(`rcap-acceptance-server-secret:${PROJECT_REF}:${purpose}`).digest().subarray(0, bytes);
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
  deliveryRouteState: ROUTE_STATE || "disabled (flag not set)",
  neverPassedProdFlag: true,
  neverWroteProjectLevelEnv: true,
  largeFunctionsSupport: "enabled per-deployment; the checkout/status function bundles the RCAP corpus to ~611mb against a 250mb default"
};

// --- 0. Before-picture of everything this run must not disturb ---------------
const beforeProject = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}`);
const beforeEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}/env`);
const aliasesBefore = Array.isArray(beforeProject.json?.alias)
  ? beforeProject.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain).sort()
  : [];
const envBefore = envShape(Array.isArray(beforeEnv.json?.envs) ? beforeEnv.json.envs : []);
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
const STRIPE_CONFIGURED = Boolean(process.env.HOSTED_STRIPE_TEST_SECRET && process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET);
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

/**
 * The Stripe account the TEST key belongs to, read from Stripe rather than
 * configured by hand.
 *
 * The application concludes that a stored Session is absent only when the
 * account and mode that answered are the ones it expects to sell through. On a
 * Preview there is no such expectation unless one is supplied, so the
 * verified-account variant supplies it — and supplies the REAL id, discovered
 * from the very key this deployment will hold. A typed-in value would prove
 * nothing: it would either be the right one by luck or make the check
 * unsatisfiable. This is a read; it creates and changes nothing at Stripe.
 */
async function resolveStripeTestAccountId() {
  const key = (process.env.HOSTED_STRIPE_TEST_SECRET ?? "").trim();
  if (!key) throw new Error("the verified-account Preview needs the acceptance Stripe TEST key");
  if (!key.startsWith("sk_test_")) throw new Error("only a Stripe TEST key may reach an acceptance Preview");
  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${key}` },
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  const json = await res.json().catch(() => null);
  if (res.status !== 200 || typeof json?.id !== "string") {
    throw new Error(`Stripe did not identify the account for this key (HTTP ${res.status})`);
  }
  if (!/^acct_[A-Za-z0-9]+$/.test(json.id)) {
    throw new Error("Stripe returned something that is not an account id");
  }
  // A test key must belong to a test-mode account. If Stripe says otherwise,
  // this deployment is not the one this variant is for.
  if (json.livemode === true) throw new Error("a TEST key resolved to a live-mode account");
  return json.id;
}

const STRIPE_ACCOUNT_ID = PREVIEW_VARIANT === "verified-account" ? await resolveStripeTestAccountId() : null;

async function findReusableDeployment() {
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_IDENTITY.projectId)}&limit=100&state=READY`);
  if (res.status !== 200 || !Array.isArray(res.json?.deployments)) return null;
  const match = res.json.deployments.find(
    (d) =>
      (d.readyState ?? d.state) === "READY" &&
      (d.target === null || d.target === "preview") &&
      d.meta?.rcapApplicationSha === APPLICATION_SHA &&
      d.meta?.rcapAcceptanceProjectRef === PROJECT_REF &&
      d.meta?.rcapStripeConfigured === String(STRIPE_CONFIGURED) &&
      d.meta?.rcapCatalogProduct === CATALOG_PRODUCT_TAG &&
      d.meta?.rcapRouteState === ROUTE_STATE_TAG &&
      d.meta?.rcapReturnOrigin === RETURN_ORIGIN &&
      d.meta?.rcapClinicDemoMode === (CLINIC_DEMO_MODE || "none") &&
      d.meta?.rcapStagingScopeSha256 === sha256(SCOPE_IDS) &&
      d.meta?.rcapPreviewVariant === (PREVIEW_VARIANT ?? "primary") &&
      d.meta?.rcapStripeAccountId === (STRIPE_ACCOUNT_ID ?? "none")
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
if (ROUTE_STATE === "staging_scoped" && !SCOPE_IDS) {
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
    let id = Array.isArray(rows) ? rows[0]?.id : null;
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
  SCOPE_IDS = resolved.join(",");
  evidence.syntheticConsumerBootstrap = outcomes;
  evidence.stagingScopeParticipantCount = resolved.length;
}

if (MISSISSIPPI_PREVIEW_MODE && (ROUTE_STATE !== "staging_scoped" || SCOPE_IDS.split(",").filter(Boolean).length !== 2)) {
  console.error("DEPLOY: the Mississippi Clinic Preview requires staging_scoped delivery with exactly two participant UUIDs");
  process.exit(1);
}

const reusable = await findReusableDeployment();

// --- 1. Deploy to Preview ----------------------------------------------------
// Public at build time, server-only at runtime. The delivery flag is passed
// ONLY when ROUTE_STATE is explicitly set; the default deployment carries no
// flag at all, so the control's own default (disabled) applies.
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
  // The account this Preview is expected to sell through, discovered from the
  // key above. Passed per-deployment like everything else here: the project's
  // own environment and Production's are untouched, and the ordinary Preview
  // carries no expectation at all, which is what lets its refusal case stand.
  ...(STRIPE_ACCOUNT_ID ? { STRIPE_ACCOUNT_ID } : {}),
  ...(ROUTE_STATE ? { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: ROUTE_STATE } : {}),
  ...(SCOPE_IDS ? { RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: SCOPE_IDS } : {}),
  // Acceptance-only server secrets, derived per acceptance environment from a
  // secret this job already holds and never printed. They are separate from
  // the Production values by construction: Production keeps its own keys in
  // the Vercel Production environment store, which this Preview never reads.
  LEGAL_AID_RESTRICTED_FIELD_KEY: acceptanceServerSecret("legal-aid-restricted-field-key/v1", 32).toString("base64"),
  LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION: "v1",
  PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: acceptanceServerSecret("participant-privacy-pseudonym-secret/v1", 32).toString("base64url"),
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
  VERCEL_SUPPORT_LARGE_FUNCTIONS: "1"
};
const buildEnv = {
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
  evidence.legalAidEmailDelivery = LEGAL_AID_EMAIL
    ? { configured: true, provider: "resend", valuesRecorded: false }
    : { configured: false, note: "no nonproduction email provider supplied; follow-up messages are saved, not sent" };
  evidence.stripe = {
    mode: stripeSecret ? "test key supplied" : "no key supplied; the placeholder cannot transact",
    webhookSigningSecretSupplied: Boolean(stripeWebhook)
  };
}

const deploymentMeta = {
  rcapApplicationSha: APPLICATION_SHA,
  rcapAcceptanceProjectRef: PROJECT_REF,
  rcapStripeConfigured: String(STRIPE_CONFIGURED),
  rcapCatalogProduct: CATALOG_PRODUCT_TAG,
  rcapRouteState: ROUTE_STATE_TAG,
  rcapReturnOrigin: RETURN_ORIGIN,
  rcapClinicDemoMode: CLINIC_DEMO_MODE || "none",
  rcapStagingScopeSha256: sha256(SCOPE_IDS),
  rcapPreviewVariant: PREVIEW_VARIANT ?? "primary",
  // The account id, not a credential: it appears on every object the account
  // owns. It is in the identity so a Preview built for one account is never
  // reused under a run proving something about another.
  rcapStripeAccountId: STRIPE_ACCOUNT_ID ?? "none"
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
      applicationSha: APPLICATION_SHA, runtimeEnv, buildEnv, meta: deploymentMeta, variant: PREVIEW_VARIANT}, {
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
// The metadata Vercel reports back for the deployment actually serving, read
// once here and asserted against below. It is the deployment's own account of
// itself, not this script's intent.
let deployedMeta = {};
let deploymentId = null;
{
  const host = deploymentUrl.replace(/^https:\/\//, "");
  const detail = await vercelApi(`/v13/deployments/${encodeURIComponent(host)}`);
  const target = detail.json?.target ?? null;
  const meta = detail.json?.meta ?? {};
  deploymentId = detail.json?.id ?? detail.json?.uid ?? null;
  record(
    "deployed_to_preview_not_production",
    detail.status === 200 && (target === null || target === "preview"),
    `Vercel reports target=${JSON.stringify(target)} for this deployment (must be Preview); readyState=${detail.json?.readyState ?? "unknown"}`
  );
  record(
    "deployment_carries_the_final_application_sha",
    meta.rcapApplicationSha === APPLICATION_SHA && meta.rcapReturnOrigin === RETURN_ORIGIN,
    `deployment metadata records rcapApplicationSha=${meta.rcapApplicationSha ?? "(absent)"} and rcapReturnOrigin=${meta.rcapReturnOrigin ?? "(absent)"}`
  );
  deployedAcceptanceProjectRef = meta.rcapAcceptanceProjectRef ?? null;
  deployedMeta = meta;
  evidence.deployment = { id: deploymentId, target, readyState: detail.json?.readyState ?? null, immutableHostname: host };
  evidence.deploymentAliases = Array.isArray(detail.json?.alias) ? detail.json.alias : [];
}

if (deploymentId && verdicts.get("deployed_to_preview_not_production")?.passed && verdicts.get("deployment_carries_the_final_application_sha")?.passed) {
  const current = await vercelApi(`/v13/deployments/${encodeURIComponent(RETURN_ALIAS_HOST)}`);
  const currentId = current.json?.id ?? current.json?.uid ?? null;
  if (current.status !== 200 || currentId !== deploymentId) {
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
} else {
  record("deterministic_nonproduction_return_alias_bound", false, "Vercel returned no deployment id to bind");
}

const previewUrl = RETURN_ORIGIN;
evidence.previewUrl = previewUrl;
console.log(`  exact acceptance return origin: ${previewUrl}`);

// --- 2a. The verified-account Preview declares the account it was built for --
//
// This lives here, in the identity section, rather than inside the
// production-untouched comparison below: that block is frozen bytes, because it
// is what proves this deployment disturbed nothing, and a release's additions do
// not belong in it.
if (PREVIEW_VARIANT === "verified-account") {
  const boundVariant = deployedMeta?.rcapPreviewVariant ?? null;
  const boundAccount = deployedMeta?.rcapStripeAccountId ?? null;
  record(
    "verified_stripe_account_bound_to_this_preview",
    boundVariant === "verified-account"
      && boundAccount === STRIPE_ACCOUNT_ID
      && /^acct_[A-Za-z0-9]+$/.test(String(boundAccount))
      && RETURN_ORIGIN === expectedHostedReturnOrigin(APPLICATION_SHA, "verified-account"),
    `this deployment declares rcapPreviewVariant=${boundVariant ?? "(absent)"} and rcapStripeAccountId=`
      + `${boundAccount ?? "(absent)"}, which is the account Stripe itself named for the TEST key this`
      + ` deployment holds — not a value typed into a workflow. It answers on its own variant-scoped alias`
      + ` ${new URL(RETURN_ORIGIN).host}, so it can never be mistaken for the ordinary Preview, which carries`
      + ` no expected account at all and therefore still refuses a stored Session it cannot verify.`
  );
  evidence.verifiedAccountPreview = {
    variant: boundVariant,
    stripeAccountId: boundAccount,
    returnOrigin: RETURN_ORIGIN,
    liveMode: false
  };
}

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

  const afterEnv = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}/env`);
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
  process.exit(evidence.passed ? 0 : 1);
}
