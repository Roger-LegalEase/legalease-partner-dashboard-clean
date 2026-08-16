import { register } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Hosted acceptance staging — the Stripe payment and packet-delivery journey.
//
// Runs against the DEPLOYED Preview instance and the hosted acceptance Supabase
// project. Nothing here is simulated except one step, and that step is called
// out rather than glossed:
//
//   * The Checkout Session is REAL. It is created by the deployed application
//     talking to Stripe with the sandbox secret key, and every field this
//     journey later asserts on — id, amount_total, currency, metadata,
//     client_reference_id — is read back from Stripe, never invented here.
//   * The webhook event is signed with the REAL signing secret and posted to
//     the REAL endpoint, so signature verification, idempotency and the
//     server-authoritative payment write are all exercised for real.
//   * The one thing that is NOT automated is a human typing a test card into
//     Stripe's hosted page. That page cannot be driven from CI without a
//     browser, so the session's payment_status is the single field overridden.
//     Roger's phone test is what covers that last inch, and this script says so
//     in its own evidence rather than implying a card was entered.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { consumerPacketPriceCents } = await import("../src/lib/expungement-ai/payment-adapter.ts");
const { consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");
const { packetInformationReviewSafety, reviewedPacketInputHash } = await import("../src/lib/expungement-ai/packet-information.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

const rootDir = process.cwd();
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const WORKER_DIGEST_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const WORKER_DIGEST = WORKER_DIGEST_REF.includes("@") ? WORKER_DIGEST_REF.split("@").at(-1) ?? "" : "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const STRIPE_KEY = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
const WEBHOOK_SECRET = process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET ?? "";

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const PA_PATHWAY_ID = "path-a-non-conviction-expungement";
const PA_PATHWAY = "Path A — Non-conviction expungement";
const ACCEPTANCE_ORIGIN = `https://rcap-acceptance-${PROJECT_REF}.vercel.app`;
const EXPECTED_WEBHOOK_EVENTS = [
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
].sort();

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF) || !VERCEL_TOKEN || !BYPASS) {
  console.error("PAYMENT: SUPABASE_ACCESS_TOKEN, ACCEPTANCE_SUPABASE_PROJECT_REF, VERCEL_TOKEN and VERCEL_AUTOMATION_BYPASS_SECRET are required");
  process.exit(1);
}
if (!STRIPE_KEY.startsWith("sk_test_") || !WEBHOOK_SECRET.startsWith("whsec_")) {
  console.error("PAYMENT: a sandbox Stripe secret key (sk_test_) and signing secret (whsec_) are required; refusing to run a payment journey without them");
  process.exit(1);
}

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "payment_preview_deployment_discovered",
  "bypass_reaches_the_application_not_the_protection_layer",
  "sandbox_webhook_destination_preconditions_exact",
  "sandbox_webhook_destination_updated_in_place_and_read_back_exact",
  "renderable_route_selected_from_the_registry",
  "packet_information_review_is_complete_and_route_safe",
  "seeded_item_agrees_with_the_authoritative_resolver",
  "unpaid_render_is_refused_for_payment",
  "checkout_session_created_against_stripe_sandbox",
  "checkout_session_identity_and_return_binding_exact",
  "forged_webhook_signature_is_rejected",
  "signed_webhook_records_the_payment",
  "payment_is_server_authoritative_in_the_database",
  "paid_render_is_queued",
  "worker_queue_contains_only_the_target_job",
  "worker_renders_and_stores_the_artifact",
  "person_and_matter_are_bound_on_the_render_job",
  "artifact_is_stored_privately_and_re_readable",
  "delivery_serves_the_owner_and_refuses_everyone_else",
  "event_replay_creates_no_second_entitlement_or_render_job",
  "synthetic_checkout_session_expired_after_automated_journey",
  "synthetic_acceptance_chain_retained_and_hash_valid_after_replay"
];

const bypassHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

async function vercelApi(pathname) {
  const joiner = pathname.includes("?") ? "&" : "?";
  const param = VERCEL_ORG_ID.startsWith("team_") ? "teamId" : "slug";
  const res = await fetch(`https://api.vercel.com${pathname}${joiner}${param}=${encodeURIComponent(VERCEL_ORG_ID)}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  let json = null;
  try { json = JSON.parse(await res.text()); } catch { /* non-JSON surfaces as null */ }
  return { status: res.status, json };
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  let json = null;
  try { json = JSON.parse(await res.text()); } catch { /* non-JSON surfaces as null */ }
  return { status: res.status, json };
}

async function stripeRequest(pathname, { method = "GET", form = null } = {}) {
  const headers = { Authorization: `Bearer ${STRIPE_KEY}` };
  if (form !== null) headers["Content-Type"] = "application/x-www-form-urlencoded";
  const res = await fetch(`https://api.stripe.com${pathname}`, {
    method,
    headers,
    body: form === null ? undefined : new URLSearchParams(form)
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

async function listStripeCollection(pathname) {
  const rows = [];
  let startingAfter = null;
  for (let page = 0; page < 100; page += 1) {
    const url = new URL(`https://api.stripe.com${pathname}`);
    url.searchParams.set("limit", "100");
    if (startingAfter) url.searchParams.set("starting_after", startingAfter);
    const response = await stripeRequest(`${url.pathname}${url.search}`);
    if (!response.ok || !Array.isArray(response.json?.data)) return null;
    rows.push(...response.json.data);
    if (!response.json.has_more) return rows;
    startingAfter = response.json.data.at(-1)?.id ?? null;
    if (!startingAfter) return null;
  }
  return null;
}

function sameStringSet(left, right) {
  return JSON.stringify([...(left ?? [])].sort()) === JSON.stringify([...(right ?? [])].sort());
}

function webhookUrlShape(value) {
  try {
    const url = new URL(value);
    return { host: url.host, pathname: url.pathname, queryParameterNames: [...url.searchParams.keys()].sort() };
  } catch {
    return { host: "(invalid)", pathname: "", queryParameterNames: [] };
  }
}

let ANON_KEY = "";
async function supabaseKeys() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  });
  const list = await res.json().catch(() => []);
  return Array.isArray(list) ? list.find((k) => k.name === "anon")?.api_key ?? "" : "";
}

// Identical to the matrix: the application reads its session from the cookie
// @supabase/ssr persists, never from an Authorization header.
const SSR_COOKIE_CHUNK_SIZE = 3180;
function sessionCookieHeader(session) {
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  if (value.length <= SSR_COOKIE_CHUNK_SIZE) return `${name}=${value}`;
  const chunks = [];
  for (let i = 0; i < value.length; i += SSR_COOKIE_CHUNK_SIZE) {
    chunks.push(`${name}.${chunks.length}=${value.slice(i, i + SSR_COOKIE_CHUNK_SIZE)}`);
  }
  return chunks.join("; ");
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json().catch(() => null);
  if (res.status !== 200 || !json?.user?.id) return null;
  return { id: json.user.id, session: json, cookie: sessionCookieHeader(json) };
}

let PREVIEW = "";
async function callApp(pathname, {
  method = "GET",
  cookie = null,
  body = null,
  headers = {},
  queryOnlyBypass = false
} = {}) {
  try {
    // Ordinary browser/API probes carry both forms. Stripe webhook probes use
    // queryOnlyBypass so they model the only bypass form Stripe can send.
    const joiner = pathname.includes("?") ? "&" : "?";
    const suffix = BYPASS ? `${joiner}x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}` : "";
    const res = await fetch(`${PREVIEW}${pathname}${suffix}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(queryOnlyBypass ? {} : bypassHeaders),
        ...headers
      },
      body: body === null ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      redirect: "manual"
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    const text = bytes.toString("utf8");
    let json = null;
    try { json = JSON.parse(text); } catch { /* HTML or empty is fine */ }
    return {
      status: res.status,
      json,
      text,
      bytes,
      contentType: res.headers.get("content-type") ?? "",
      contentDisposition: res.headers.get("content-disposition") ?? "",
      location: res.headers.get("location") ?? ""
    };
  } catch (error) {
    return {
      status: `unreachable: ${error.message}`,
      json: null,
      text: "",
      bytes: Buffer.alloc(0),
      contentType: "",
      contentDisposition: "",
      location: ""
    };
  }
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-payment/v1",
  acceptanceProjectRef: PROJECT_REF,
  applicationSha: APPLICATION_SHA,
  stripeMode: "sandbox (sk_test_)",
  cardEntryAutomated: false,
  cardEntryNote: "Stripe's hosted Checkout page cannot be driven from CI without a browser. Every field of the completion event comes from the real session read back from Stripe; payment_status is the single overridden field. The phone test covers the card entry itself."
};

function finish() {
  const missing = REQUIRED_CASES.filter((c) => !verdicts.has(c));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([c]) => c);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "payment.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log("");
  if (missing.length > 0) console.error(`PAYMENT INCOMPLETE — no verdict for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`PAYMENT FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`PAYMENT PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} against ${PROJECT_REF} on ${PREVIEW}`);
  process.exit(evidence.passed ? 0 : 1);
}

// --- 1. The deployment that actually carries Stripe --------------------------
{
  // Resolve the stable acceptance alias itself. Listing by metadata is not
  // enough because an older READY deployment carries the same public-origin
  // metadata even after the alias has moved away from it.
  const aliasHost = new URL(ACCEPTANCE_ORIGIN).host;
  const projectRes = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
  const canonicalProjectId = projectRes.json?.id ?? null;
  const res = await vercelApi(`/v13/deployments/${encodeURIComponent(aliasHost)}`);
  const deployment = res.json;
  const deploymentProjectId = deployment?.projectId ?? deployment?.project?.id ?? null;
  const meta = deployment?.meta ?? {};
  const aliases = Array.isArray(deployment?.alias) ? deployment.alias : [];
  const exact = projectRes.status === 200
    && Boolean(canonicalProjectId)
    && res.status === 200
    && deploymentProjectId === canonicalProjectId
    && deployment?.readyState === "READY"
    && deployment?.target !== "production"
    && aliases.includes(aliasHost)
    && meta.rcapApplicationSha === APPLICATION_SHA
    && meta.rcapAcceptanceProjectRef === PROJECT_REF
    && meta.rcapStripeConfigured === "true"
    && meta.rcapRouteState === "staging_scoped"
    && meta.rcapPublicOrigin === ACCEPTANCE_ORIGIN;
  PREVIEW = exact ? ACCEPTANCE_ORIGIN : "";
  record(
    "payment_preview_deployment_discovered",
    exact,
    PREVIEW
      ? `${PREVIEW} resolves to deployment ${deployment?.id ?? "(unknown)"} — READY, non-production, acceptance-project-bound, built WITH Stripe configuration and the scoped delivery state`
      : `the pinned alias did not resolve to the exact READY staging deployment (project API=${projectRes.status}, deployment API=${res.status}, id=${deployment?.id ?? "(none)"}, project-bound=${deploymentProjectId === canonicalProjectId}, ready=${deployment?.readyState ?? "(none)"}, target=${JSON.stringify(deployment?.target ?? null)}, alias-bound=${aliases.includes(aliasHost)}, application=${meta.rcapApplicationSha ?? "(none)"}, acceptance project=${meta.rcapAcceptanceProjectRef ?? "(none)"}, stripe=${meta.rcapStripeConfigured ?? "(none)"}, route=${meta.rcapRouteState ?? "(none)"})`
  );
  if (!PREVIEW) finish();
  evidence.previewUrl = PREVIEW;
  evidence.previewDeploymentId = deployment.id;
  evidence.previewVercelProjectId = deploymentProjectId;
}

// --- 1b. The bypass MUST reach the application -------------------------------
//
// Three probes, because they answer three different questions and only one of
// them is the one Stripe depends on.
//
// A must-refuse route can never evidence that the bypass worked: 401, 402, 403
// and 503 are all things Vercel's protection layer returns when it never let
// the request through at all. /api/health is the only route here that must
// answer 200 with application JSON, which is why all three probes use it.
//
// The previous single probe sent the header AND the cookie-bootstrap parameter
// together and read the resulting 307 as failure. That was wrong twice over: it
// conflated three mechanisms into one signal, and it never recorded `location`,
// which is the only header that separates a Vercel SSO redirect from an
// application redirect.
{
  // Never let the secret or a cookie VALUE reach evidence or a log line.
  const sanitize = (text) => String(text ?? "")
    .split(BYPASS).join("***BYPASS***")
    .replace(/(x-vercel-protection-bypass=)[^&\s"']+/gi, "$1***BYPASS***");

  // Names and attributes only — never the value.
  const cookieShapes = (res) => {
    const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    return raw.map((line) => {
      const [pair, ...attrs] = String(line).split(";");
      return {
        name: pair.split("=")[0].trim(),
        attributes: attrs.map((a) => a.trim().split("=")[0]).filter(Boolean)
      };
    });
  };

  const observe = async (label, url, headers, cookie = null) => {
    try {
      const res = await fetch(url, {
        headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
        redirect: "manual"
      });
      const body = await res.text();
      let json = null;
      try { json = JSON.parse(body); } catch { /* not JSON */ }
      const cookies = cookieShapes(res);
      return {
        label,
        url: sanitize(url),
        status: res.status,
        location: sanitize(res.headers.get("location") ?? "(none)"),
        contentType: res.headers.get("content-type") ?? "(none)",
        server: res.headers.get("server") ?? "(none)",
        vercelId: res.headers.get("x-vercel-id") ?? "(none)",
        vercelCache: res.headers.get("x-vercel-cache") ?? "(none)",
        cookieNames: cookies.map((c) => c.name),
        cookies,
        bodyHead: sanitize(body).slice(0, 200),
        isApplicationJson: res.status === 200 && json !== null && typeof json === "object" && "checks" in json
      };
    } catch (error) {
      return {
        label, url: sanitize(url), status: `unreachable: ${error.message}`,
        location: "(none)", contentType: "(none)", server: "(none)",
        vercelId: "(none)", vercelCache: "(none)",
        cookieNames: [], cookies: [], bodyHead: "", isApplicationJson: false
      };
    }
  };

  const HEALTH = `${PREVIEW}/api/health`;
  const encoded = encodeURIComponent(BYPASS);

  // A: header only, no cookie bootstrap.
  const probeA = await observe("A", HEALTH, { "x-vercel-protection-bypass": BYPASS });
  // B: query only — the exact mechanism Stripe uses. Stripe cannot perform an
  // interactive login or a cookie bootstrap, so this is the probe that decides
  // whether the webhook can ever be delivered.
  const probeB = await observe("B", `${HEALTH}?x-vercel-protection-bypass=${encoded}`, {});
  // C: query plus the cookie bootstrap, which is ALLOWED to redirect once.
  const probeC = await observe("C", `${HEALTH}?x-vercel-protection-bypass=${encoded}&x-vercel-set-bypass-cookie=true`, {});

  let probeCFollowed = null;
  const previewHost = new URL(PREVIEW).host;
  if (probeC.status >= 300 && probeC.status < 400 && probeC.location !== "(none)") {
    let target = null;
    try { target = new URL(probeC.location, PREVIEW); } catch { target = null; }
    // Followed exactly once, and only when it stays on this deployment. A
    // redirect that leaves the deployment is not a cookie bootstrap, and
    // following it would be following Vercel's login flow.
    if (target && target.host === previewHost) {
      target.searchParams.delete("x-vercel-set-bypass-cookie");
      const jar = probeC.cookies.length > 0
        ? probeC.cookies.map((c) => `${c.name}=1`).join("; ")
        : null;
      probeCFollowed = await observe("C-followed", target.toString(), {}, jar);
    }
  }

  // Independent control: the Vercel CLI's own protected-deployment request.
  // Diagnostic only. Stripe is proven by probe B, never by this.
  let cliControl = "not attempted";
  {
    const run = spawnSync("npx", [
      "vercel@latest", "curl", "/api/health",
      "--deployment", PREVIEW,
      "--token", process.env.VERCEL_TOKEN ?? "",
      "--scope", VERCEL_ORG_ID
    ], { encoding: "utf8", timeout: 120000, stdio: ["ignore", "pipe", "pipe"] });
    const token = process.env.VERCEL_TOKEN ?? "";
    let out = sanitize(`${run.stdout ?? ""}${run.stderr ?? ""}`);
    if (token) out = out.split(token).join("***TOKEN***");
    cliControl = run.error
      ? `could not run: ${run.error.code ?? run.error.message}`
      : `exit ${run.status}; reached application JSON: ${/"checks"/.test(out)}; output head: ${out.slice(0, 220)}`;
  }

  const locationIsVercelAuth = (loc) => {
    if (!loc || loc === "(none)") return false;
    try {
      const u = new URL(loc, PREVIEW);
      return /(^|\.)vercel\.com$/i.test(u.host) || /sso|login|access|authenticate/i.test(u.pathname);
    } catch { return false; }
  };

  // Stripe can send the query parameter but cannot add the automation header or
  // participate in a cookie bootstrap. Probe B is therefore the release gate;
  // A and C remain diagnostics only.
  const bypassWorks = probeB.isApplicationJson;
  const anyVercelAuthRedirect = [probeA, probeB, probeC].some((p) => locationIsVercelAuth(p.location));
  const chain = [probeA, probeB, probeC, probeCFollowed].filter(Boolean)
    .map((p) => `${p.label}:${p.status}->${p.location}`).join(" | ");

  evidence.bypassProbes = {
    A: probeA, B: probeB, C: probeC, CFollowed: probeCFollowed,
    cliControl,
    locationChain: chain,
    stripeRelevantProbe: "B (query parameter, no cookie bootstrap)",
    verdict: bypassWorks
      ? "the query-only bypass Stripe can use reaches the application"
      : anyVercelAuthRedirect
        ? "Vercel authentication rejected the bypass"
        : "application-owned redirect, or a shape neither classification matches"
  };

  record(
    "bypass_reaches_the_application_not_the_protection_layer",
    bypassWorks,
    `A(header only)=${probeA.status} loc=${probeA.location} ct=${probeA.contentType} json=${probeA.isApplicationJson}; ` +
    `B(query only, Stripe's method)=${probeB.status} loc=${probeB.location} ct=${probeB.contentType} json=${probeB.isApplicationJson}; ` +
    `C(cookie bootstrap)=${probeC.status} loc=${probeC.location}; ` +
    `C-followed=${probeCFollowed ? `${probeCFollowed.status} json=${probeCFollowed.isApplicationJson} loc=${probeCFollowed.location}` : "(not followed — redirect left the deployment or was absent)"}; ` +
    `cookie names=${JSON.stringify([...new Set([...probeA.cookieNames, ...probeB.cookieNames, ...probeC.cookieNames])])}; ` +
    `server=${probeB.server}; x-vercel-id=${probeB.vercelId}; ` +
    `vercel-cli control: ${cliControl}`
  );

  // Everything downstream is a statement about the application. If the wall is
  // answering, none of it would mean what it claims to mean.
  if (!bypassWorks) finish();
}

// --- 1c. Move the ONE existing sandbox webhook in place ----------------------
//
// Checkout continuity uses the stable acceptance alias, so the existing Stripe
// sandbox destination must use that same host and the query-only Vercel bypass.
// This is an UPDATE of one already-existing endpoint, never a create/delete:
// its id, creation time, enabled event set, mode and status are captured before
// the URL-only POST and required to be byte-for-byte equivalent on readback.
// The bypass value is compared in memory and is never printed or written to
// evidence; only the host, path and query-parameter name are retained.
{
  const endpoints = await listStripeCollection("/v1/webhook_endpoints");
  const canonical = Array.isArray(endpoints) ? endpoints.filter((endpoint) => {
    try { return new URL(endpoint.url).pathname === "/api/stripe/webhook"; } catch { return false; }
  }) : [];
  const endpoint = canonical[0] ?? null;
  const preconditions = canonical.length === 1
    && /^we_[A-Za-z0-9]+$/.test(endpoint?.id ?? "")
    && endpoint?.livemode === false
    && endpoint?.status === "enabled"
    && Number.isInteger(endpoint?.created)
    && sameStringSet(endpoint?.enabled_events, EXPECTED_WEBHOOK_EVENTS);
  record(
    "sandbox_webhook_destination_preconditions_exact",
    preconditions,
    `${canonical.length} canonical-path endpoint(s); id=${endpoint?.id ?? "(none)"}; livemode=${endpoint?.livemode ?? "(none)"}; status=${endpoint?.status ?? "(none)"}; events exact=${sameStringSet(endpoint?.enabled_events, EXPECTED_WEBHOOK_EVENTS)}`
  );
  if (!preconditions) finish();

  const requiredUrl = new URL("/api/stripe/webhook", PREVIEW);
  requiredUrl.searchParams.set("x-vercel-protection-bypass", BYPASS);
  const before = {
    id: endpoint.id,
    created: endpoint.created,
    enabledEvents: [...endpoint.enabled_events].sort(),
    livemode: endpoint.livemode,
    status: endpoint.status,
    urlShape: webhookUrlShape(endpoint.url)
  };

  // Stripe's endpoint-update API is POST /v1/webhook_endpoints/{existing_id}.
  // `url` is the only form field, so events, status and secret cannot change.
  const update = await stripeRequest(`/v1/webhook_endpoints/${encodeURIComponent(endpoint.id)}`, {
    method: "POST",
    form: { url: requiredUrl.toString() }
  });
  const readback = await stripeRequest(`/v1/webhook_endpoints/${encodeURIComponent(endpoint.id)}`);
  const endpointsAfter = await listStripeCollection("/v1/webhook_endpoints");
  const canonicalAfter = Array.isArray(endpointsAfter) ? endpointsAfter.filter((candidate) => {
    try { return new URL(candidate.url).pathname === "/api/stripe/webhook"; } catch { return false; }
  }) : [];
  const observed = readback.json;
  let observedUrl = null;
  try { observedUrl = new URL(observed?.url); } catch { /* exact check below fails */ }
  const queryEntries = observedUrl ? [...observedUrl.searchParams.entries()] : [];
  const exact = update.ok
    && readback.ok
    && canonicalAfter.length === 1
    && canonicalAfter[0]?.id === before.id
    && observed?.id === before.id
    && observed?.created === before.created
    && observed?.livemode === before.livemode
    && observed?.status === before.status
    && sameStringSet(observed?.enabled_events, before.enabledEvents)
    && observedUrl?.origin === PREVIEW
    && observedUrl.pathname === "/api/stripe/webhook"
    && queryEntries.length === 1
    && queryEntries[0][0] === "x-vercel-protection-bypass"
    && queryEntries[0][1] === BYPASS;
  record(
    "sandbox_webhook_destination_updated_in_place_and_read_back_exact",
    exact,
    `URL-only update HTTP=${update.status}; readback HTTP=${readback.status}; same endpoint id=${observed?.id === before.id}; same created=${observed?.created === before.created}; same events=${sameStringSet(observed?.enabled_events, before.enabledEvents)}; one canonical endpoint after=${canonicalAfter.length === 1}; destination=${observedUrl?.host ?? "(invalid)"}${observedUrl?.pathname ?? ""}; only required query parameter=${queryEntries.length === 1 && queryEntries[0]?.[0] === "x-vercel-protection-bypass"}`
  );
  evidence.stripeWebhookDestination = {
    endpointId: before.id,
    updateMethod: "URL-only in-place update",
    createdUnchanged: observed?.created === before.created,
    eventSetUnchanged: sameStringSet(observed?.enabled_events, before.enabledEvents),
    statusUnchanged: observed?.status === before.status,
    livemode: observed?.livemode ?? null,
    canonicalEndpointCountBefore: canonical.length,
    canonicalEndpointCountAfter: canonicalAfter.length,
    before: before.urlShape,
    after: webhookUrlShape(observed?.url),
    bypassValueRecorded: false
  };
  if (!exact) finish();
}

ANON_KEY = await supabaseKeys();
const A = await signIn("acceptance-consumer-a@rcap-acceptance.test", "Acceptance-a-4f7c21!");
const B = await signIn("acceptance-consumer-b@rcap-acceptance.test", "Acceptance-b-8d3e95!");
if (!A || !B) {
  record("renderable_route_selected_from_the_registry", false, "the synthetic consumer identities could not sign in");
  finish();
}

// --- 2. The exact Pennsylvania route Roger will exercise ----------------------
// buildRenderJobSpec remains the render authority. The release checkpoint is
// specifically PA Path A, so a fallback to some other renderable jurisdiction
// would be a green result for the wrong human journey and is refused.
let route = null;
{
  const profile = getProfileByJurisdiction("PA");
  const pathway = profile?.pathways?.find((candidate) => candidate.id === PA_PATHWAY_ID && candidate.label === PA_PATHWAY) ?? null;
  const built = pathway ? buildRenderJobSpec({
    packetId: crypto.randomUUID(),
    state: "PA",
    pathway: PA_PATHWAY,
    profileId: "PA",
    profileVersion: "1.3.0",
    briefcaseItemId: crypto.randomUUID(),
    trackId: null,
    packetFields: {}
  }) : null;
  if (profile && pathway && built?.spec) route = { state: "PA", pathwayLabel: PA_PATHWAY, pathwayId: PA_PATHWAY_ID };
  record(
    "renderable_route_selected_from_the_registry",
    Boolean(route && built?.spec?.routeId === `PA:${PA_PATHWAY}`),
    route
      ? `${route.state} / ${route.pathwayLabel} — buildRenderJobSpec produced ${built.spec.routeId}`
      : "the exact PA Path A route did not produce a render spec"
  );
  if (!route) finish();
  evidence.route = route;
}

// The briefcase item id is minted here because the derivation below builds a
// render spec against it, and a const referenced before its declaration is a
// temporal dead zone error rather than a subtle one.
const itemId = crypto.randomUUID();
// Single-quoted SQL literal, doubling embedded quotes. Never JSON.stringify:
// that produces double quotes, which Postgres reads as an identifier.
const sqlText = (value) => String(value).split("'").join("''");

// --- 2b. Derive every route-specific value from the authorities ---------------
//
// packet_type was previously hardcoded to 'official_pdf_overlay' because the
// phase-26 CHECK constraint accepted it. That is not a derivation, it is a
// value that happened to be legal, and it was WRONG: eligibility-adapter maps
// result_code to packet_type, and packet_ready maps to 'custom_pleading'. The
// resolver independently classifies PA / Path A as routeKind legacy_verified
// with rendererKind packet_document_v1 — it is not an official-PDF overlay at
// all. Deriving instead of guessing is what surfaced that.
const profile = getProfileByJurisdiction(route.state);
const screeningAnswers = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  possible_pathway_context: PA_PATHWAY,
  disposition_date: "2000-01-01",
  waiting_rule_id: "wait-02"
};
const authoritativeScreening = evaluateAuthoritativeScreeningResult({
  jurisdiction: route.state,
  profileVersion: profile?.profileVersion,
  matterId: `hosted-payment-${itemId}`,
  answers: screeningAnswers
});
const derived = (() => {
  const built = buildRenderJobSpec({
    packetId: crypto.randomUUID(),
    state: route.state,
    pathway: route.pathwayLabel,
    profileId: route.state,
    // The same profileVersion consumer-render-request pins when it builds the
    // real job, so the spec compared here is the spec that route will produce.
    profileVersion: "1.3.0",
    briefcaseItemId: itemId,
    trackId: null,
    packetFields: {}
  });
  // result_code must be one the payment policy admits: isConsumerPaymentAllowed
  // permits packet_ready and packet_ready_with_caution and nothing else.
  const resultCode = authoritativeScreening.evaluation.resultCode;
  // eligibility-adapter's packetTypeForResult: guidance_only -> guidance_packet,
  // packet_ready / packet_ready_with_caution -> custom_pleading.
  const packetType = authoritativeScreening.packetType;
  return {
    resultCode,
    packetType,
    routeKind: built.route?.routeKind ?? null,
    compiledPathwayId: built.route?.pathwayId ?? null,
    jurisdiction: built.route?.jurisdiction ?? null,
    sellable: built.route?.sellable ?? null,
    creditConsumable: built.route?.creditConsumable ?? null,
    trackId: built.route?.exactDeferralTrackId ?? null,
    rendererKind: built.spec?.rendererKind ?? null,
    rendererVersion: built.spec?.rendererVersion ?? null,
    sourceSha256: built.spec?.sourceSha256 ?? null,
    profileId: built.spec?.profileId ?? null,
    profileVersion: built.spec?.profileVersion ?? null,
    routeId: built.spec?.routeId ?? null
  };
})();
evidence.derivedRouteIdentity = derived;

// The application SHA under test requires a completed, route-safe packet review
// before it will create Checkout. Build the exact commercialFlow persisted by
// the product and run the production review guard locally before seeding it.
const packetPlan = profile ? packetPlanForPathway(profile, route.pathwayId) : null;
const reviewedAt = "2026-08-16T00:00:00.000Z";
const packetAnswers = {
  age_at_offense: "30",
  case_outcome: screeningAnswers.case_outcome,
  charge: { value: "Synthetic misdemeanor charge", unknown: false },
  contact_information: "100 Acceptance Way, Pittsburgh, PA 15219",
  county: { value: "Allegheny County", unknown: false },
  court: { value: "Allegheny County Court of Common Pleas", unknown: false },
  criminal_history: { value: "No other synthetic history", unknown: false },
  disposition_date: { value: "2000-01-01", unknown: false },
  financial_obligations: "Yes",
  offense_category: { value: "Misdemeanor", unknown: false },
  offense_level: "Misdemeanor",
  pardon_status: "No",
  participant_full_legal_name: "Alex Acceptance",
  record_type: "Arrest or charge",
  residency_or_location: { value: "Pittsburgh, Pennsylvania", unknown: false },
  trafficking_status: "No"
};
const artifactRefs = {
  commercialFlow: {
    version: 1,
    entitlementSource: "consumer_payment",
    productId: "expungement_packet",
    screening: {
      profileVersion: profile?.profileVersion,
      screeningMatterId: `hosted-payment-${itemId}`,
      pathwayId: route.pathwayId,
      pathwayLabel: route.pathwayLabel,
      resultCode: derived.resultCode,
      paymentAllowed: true,
      packetType: derived.packetType,
      packetPlan,
      answers: screeningAnswers
    },
    packetInformation: {
      stage: "ready_to_generate",
      requiredInputIds: packetPlan?.requiredInputIds ?? [],
      serverFacts: { jurisdiction: route.state, pathway_id: route.pathwayId },
      prefilledAnswers: {},
      answers: packetAnswers,
      missingInputIds: [],
      updatedAt: reviewedAt,
      reviewedAt
    }
  }
};
const reviewFixture = {
  id: itemId,
  userId: A.id,
  itemType: "result",
  state: route.state,
  pathwayLabel: route.pathwayLabel,
  resultCode: derived.resultCode,
  packetType: derived.packetType,
  status: "packet_ready",
  paymentStatus: "unpaid",
  paymentAllowed: true,
  artifactRefs
};
const reviewSafety = packetInformationReviewSafety(reviewFixture);
const reviewedInputHash = reviewedPacketInputHash(reviewFixture);
record(
  "packet_information_review_is_complete_and_route_safe",
  Boolean(packetPlan)
    && packetPlan?.pathwayId === route.pathwayId
    && derived.resultCode === "packet_ready_with_caution"
    && authoritativeScreening.evaluation.pathwayId === route.pathwayId
    && reviewSafety.safe
    && reviewSafety.reason === "authoritative_route_confirmed"
    && /^[a-f0-9]{64}$/.test(reviewedInputHash ?? ""),
  `plan=${packetPlan?.pathwayId ?? "(none)"}; safety=${reviewSafety.reason}; reviewed hash present=${Boolean(reviewedInputHash)}`
);

// --- 3. Seed the participant's item, unpaid ----------------------------------
const artifactRefsJson = sqlText(JSON.stringify(artifactRefs));
const seedResult = await sql(`
  insert into public.consumer_briefcase_items
    (id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
     status, summary_json, artifact_refs_json, payment_status, payment_allowed)
  values ('${itemId}', '${A.id}', 'result', '${route.state}', '${sqlText(route.pathwayLabel)}',
          '${derived.resultCode}', '${derived.packetType}',
          'packet_ready', '{"text":"hosted acceptance payment journey"}'::jsonb,
          '${artifactRefsJson}'::jsonb, 'unpaid', true)
  returning id, status, result_code, pathway_label
`);

// The seed is asserted, not assumed. Two defects hid behind an unchecked
// insert and both surfaced as a 404 from the application, which read as an
// application fault when it was this harness writing nothing:
//
//   * pathway_label was interpolated with JSON.stringify, which emits DOUBLE
//     quotes — a Postgres IDENTIFIER, not a string literal. The statement
//     referenced a column that does not exist.
//   * result_code was absent. assertCheckoutAllowed refuses a null one with
//     "missing_result_code", so checkout returned 403 on an item that was
//     otherwise fine — payment_allowed alone is not enough.
//   * status was 'result_saved', which is not in the phase-26 CHECK
//     constraint ('check_saved', 'guidance_saved', 'packet_ready',
//     'needs_info', 'needs_review', 'waiting', 'not_eligible', 'hard_stop').
//
// A silent write failure that later looks like a missing row is exactly the
// shape of bug that wastes a full hosted cycle, so it fails here instead.
{
  const seeded = Array.isArray(seedResult.json) ? seedResult.json[0] : null;
  if (!seeded || seeded.id !== itemId) {
    record(
      "unpaid_render_is_refused_for_payment",
      false,
      `the briefcase item could not be seeded, so nothing downstream could be tested: status ${seedResult.status}, response ${JSON.stringify(seedResult.json).slice(0, 300)}`
    );
    finish();
  }
  evidence.seededItem = { id: seeded.id, status: seeded.status, resultCode: seeded.result_code, pathwayLabel: seeded.pathway_label, jurisdiction: route.state };

  // The stored row and the resolver must agree. A row that disagrees with the
  // authority is a row that would render one thing and be sold as another.
  const agrees =
    seeded.result_code === derived.resultCode &&
    seeded.pathway_label === derived.compiledPathwayId &&
    derived.jurisdiction === route.state &&
    derived.rendererKind === "packet_document_v1" &&
    derived.sellable === true &&
    derived.creditConsumable === true &&
    derived.profileId === route.state &&
    typeof derived.profileVersion === "string" && derived.profileVersion.length > 0 &&
    derived.routeId === `${route.state}:${derived.compiledPathwayId}`;
  record(
    "seeded_item_agrees_with_the_authoritative_resolver",
    agrees,
    `routeKind=${derived.routeKind}; compiled pathway=${JSON.stringify(derived.compiledPathwayId)}; routeId=${JSON.stringify(derived.routeId)}; ` +
    `renderer=${derived.rendererKind}@${derived.rendererVersion}; sourceSha256=${JSON.stringify(derived.sourceSha256)} ` +
    `(null is correct — this route composes its own document and the worker's allowedSourceShas is empty); ` +
    `profile=${derived.profileId}@${derived.profileVersion}; sellable=${derived.sellable}; creditConsumable=${derived.creditConsumable}; ` +
    `stored result_code=${JSON.stringify(seeded.result_code)} vs derived ${JSON.stringify(derived.resultCode)}; ` +
    `stored packet_type derived from result_code as ${JSON.stringify(derived.packetType)} per eligibility-adapter; ` +
    `stored pathway_label=${JSON.stringify(seeded.pathway_label)}`
  );
  if (!agrees) finish();
}

{
  const res = await callApp("/api/expungement-ai/packet/render", { method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId } });
  record(
    "unpaid_render_is_refused_for_payment",
    res.status === 402,
    `POST /api/expungement-ai/packet/render as the in-scope owner of an UNPAID item = ${res.status} (must be 402). A 503 would mean the delivery control refused and the payment gate was never reached; a 202 would mean unpaid work was queued.`
  );
  evidence.unpaidRender = res.status;
}

// --- 4. A real Stripe Checkout Session, created by the deployed application --
let session = null;
{
  const res = await callApp("/api/expungement-ai/checkout", { method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId } });
  const sessionId = res.json?.checkoutSessionId ?? null;
  let fetched = null;
  if (sessionId) {
    const stripeUrl = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
    stripeUrl.searchParams.append("expand[]", "line_items.data.price.product");
    const stripeRes = await fetch(stripeUrl, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` }
    });
    fetched = await stripeRes.json().catch(() => null);
  }
  session = fetched && fetched.id ? fetched : null;
  // A generic 503 from the application says only "Stripe did not answer as
  // expected". Asking Stripe DIRECTLY with the same key separates a key or
  // account that cannot transact from an application that sent Stripe
  // something it rejected — two faults with completely different owners.
  // Was a session created before the application failed? Stripe is the only
  // witness that can answer. If one exists carrying this item as its
  // client_reference_id, then checkout DID reach Stripe and the 503 came from
  // something after the create — which is a completely different defect from
  // "Stripe rejected the request".
  let sessionCreatedBeforeFailure = "not checked";
  if (!session) {
    try {
      const list = await fetch("https://api.stripe.com/v1/checkout/sessions?limit=100", {
        headers: { Authorization: `Bearer ${STRIPE_KEY}` }
      });
      const body = await list.json().catch(() => null);
      const mine = Array.isArray(body?.data) ? body.data.find((x) => x.client_reference_id === itemId) : null;
      sessionCreatedBeforeFailure = mine
        ? `YES — Stripe holds session ${mine.id} for this exact briefcase item (amount_total=${mine.amount_total} ${mine.currency}, payment_status=${mine.payment_status}). The application created it and then failed AFTER the create, so the 503 is not Stripe refusing the request.`
        : "no — Stripe holds no session carrying this briefcase item as client_reference_id, so the create itself did not succeed";
    } catch (error) {
      sessionCreatedBeforeFailure = `could not ask Stripe: ${error.message}`;
    }
  }

  record(
    "checkout_session_created_against_stripe_sandbox",
    Boolean(session)
      && res.status === 200
      && res.json?.mode === "stripe"
      && res.json?.outcome === "checkout_created"
      && res.json?.amountCents === consumerPacketPriceCents
      && res.json?.currency === "usd"
      && res.json?.briefcaseItemId === itemId
      && res.json?.alreadyPaid === false
      && session.livemode === false
      && session.mode === "payment"
      && session.status === "open"
      && session.payment_status === "unpaid"
      && session.amount_total === consumerPacketPriceCents
      && String(session.currency ?? "").toLowerCase() === "usd",
    session
      ? `the deployed application created Stripe session ${session.id} (amount_total=${session.amount_total} ${session.currency}, channel=${session.metadata?.channel ?? "(none)"}), read back from Stripe rather than from the response body`
      : `checkout returned ${res.status}: ${String(res.text).slice(0, 160)} | SESSION CREATED BEFORE FAILURE? ${sessionCreatedBeforeFailure}; no direct create diagnostic was attempted`
  );
  evidence.directStripeCreateDiagnostic = "not attempted; diagnostics are read-only so this journey cannot mint a second Session";
  evidence.sessionCreatedBeforeFailure = sessionCreatedBeforeFailure;
  if (!session) finish();
  evidence.checkout = { sessionId: session.id, amountTotal: session.amount_total, currency: session.currency, expectedCents: consumerPacketPriceCents ?? null };
}

// Phase 55 makes this direct identity/product binding authoritative. Check it,
// and the non-production return origin, before fabricating the one signed
// completion used by the automated journey. A bad binding must remain unpaid.
{
  const bindingResponse = await sql(`
    select payment_product_id, payment_person_id, payment_matter_id
      from public.consumer_briefcase_items
     where id = '${itemId}' and user_id = '${A.id}'
  `);
  const binding = Array.isArray(bindingResponse.json) ? bindingResponse.json[0] ?? null : null;
  const matterId = consumerMatterIdForItem(itemId);
  const successUrl = new URL(session.success_url);
  const cancelUrl = new URL(session.cancel_url);
  const lineItems = session.line_items?.data ?? [];
  const lineItem = lineItems[0] ?? null;
  const product = lineItem?.price?.product;
  const exact = session.livemode === false
    && session.mode === "payment"
    && session.status === "open"
    && session.payment_status === "unpaid"
    && session.amount_total === consumerPacketPriceCents
    && String(session.currency ?? "").toLowerCase() === "usd"
    && session.client_reference_id === itemId
    && session.metadata?.channel === "expungement_ai_consumer"
    && session.metadata?.user_id === A.id
    && session.metadata?.briefcase_item_id === itemId
    && session.metadata?.product_id === "expungement_packet"
    && session.metadata?.person_id === binding?.payment_person_id
    && session.metadata?.matter_id === matterId
    && binding?.payment_product_id === "expungement_packet"
    && binding?.payment_matter_id === matterId
    && session.metadata?.reviewed_input_hash === reviewedInputHash
    && session.metadata?.result_code === derived.resultCode
    && session.metadata?.jurisdiction === route.state
    && session.metadata?.packet_type === derived.packetType
    && session.metadata?.pathway_label === route.pathwayLabel
    && (session.metadata?.source_session_id ?? "") === ""
    && lineItems.length === 1
    && lineItem?.quantity === 1
    && lineItem?.amount_total === consumerPacketPriceCents
    && typeof product === "object"
    && product?.name === "Expungement.ai self-help packet"
    && product?.metadata?.product_id === "expungement_packet"
    && successUrl.origin === PREVIEW
    && cancelUrl.origin === PREVIEW
    && successUrl.pathname === `/briefcase/${itemId}`
    && successUrl.searchParams.get("payment") === "return"
    && successUrl.searchParams.get("session_id") === "{CHECKOUT_SESSION_ID}"
    && cancelUrl.pathname === `/briefcase/${itemId}`
    && cancelUrl.searchParams.get("checkout") === "canceled";
  record(
    "checkout_session_identity_and_return_binding_exact",
    exact,
    `amount=${session.amount_total} ${session.currency}; line items=${lineItems.length}; product=${session.metadata?.product_id ?? "(none)"}/${typeof product === "object" ? product?.metadata?.product_id : "(unexpanded)"}; person matches=${session.metadata?.person_id === binding?.payment_person_id}; matter matches=${session.metadata?.matter_id === matterId && binding?.payment_matter_id === matterId}; reviewed hash matches=${session.metadata?.reviewed_input_hash === reviewedInputHash}; success origin=${successUrl.origin}; cancel origin=${cancelUrl.origin}`
  );
  evidence.checkoutBinding = {
    productId: session.metadata?.product_id ?? null,
    personId: session.metadata?.person_id ?? null,
    matterId: session.metadata?.matter_id ?? null,
    reviewedInputHash: session.metadata?.reviewed_input_hash ?? null,
    successUrl: session.success_url,
    cancelUrl: session.cancel_url
  };
  if (!exact) finish();
}

// --- 5. The webhook: a forgery first, then the genuine signature -------------
function signedBody(payload, secret, timestamp) {
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { body, header: `t=${timestamp},v1=${signature}` };
}

const completionEvent = {
  id: `evt_hosted_acceptance_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
  object: "event",
  type: "checkout.session.completed",
  created: Math.floor(Date.parse(session.created ? session.created * 1000 : Date.parse("2026-08-14T00:00:00Z")) / 1000) || 1786665600,
  // Every field is the REAL session as Stripe returned it. Only payment_status
  // is overridden, because completing the hosted page needs a browser.
  data: { object: { ...session, payment_status: "paid" } }
};

{
  const timestamp = Math.floor(Date.now() / 1000);
  const genuine = signedBody(completionEvent, WEBHOOK_SECRET, timestamp);
  // Same payload, wrong key. If this is accepted, the signing secret is not
  // being verified and every other payment assertion is worthless.
  const forged = signedBody(completionEvent, "whsec_this_is_not_the_signing_secret", timestamp);

  const forgedRes = await callApp("/api/stripe/webhook", {
    method: "POST", body: forged.body, headers: { "stripe-signature": forged.header }, queryOnlyBypass: true
  });
  record(
    "forged_webhook_signature_is_rejected",
    forgedRes.status === 400,
    `POST /api/stripe/webhook with a payload signed by the WRONG secret = ${forgedRes.status} (must be 400) — this is the negative control for every payment case below it`
  );

  const genuineRes = await callApp("/api/stripe/webhook", {
    method: "POST", body: genuine.body, headers: { "stripe-signature": genuine.header }, queryOnlyBypass: true
  });
  record(
    "signed_webhook_records_the_payment",
    genuineRes.status === 200,
    `POST /api/stripe/webhook correctly signed = ${genuineRes.status}, outcome=${genuineRes.json?.outcome ?? "(none)"}`
  );
  evidence.webhook = { forged: forgedRes.status, genuine: genuineRes.status, outcome: genuineRes.json?.outcome ?? null };
}

// --- 6. The payment fact, in the database, written by the server -------------
{
  const after = await sql(`
    select payment_status, payment_provider, payment_product_id, payment_person_id,
           payment_matter_id, provider_event_id
      from public.consumer_briefcase_items where id = '${itemId}'
  `);
  const row = Array.isArray(after.json) ? after.json[0] : null;
  const matterId = consumerMatterIdForItem(itemId);
  const authority = row?.payment_person_id ? await sql(`
    select valid, reason, provider_event_id
      from public.consumer_packet_payment_authority(
        '${itemId}', '${A.id}', 'expungement_packet',
        '${row.payment_person_id}', '${matterId}'
      )
  `) : { json: [] };
  const authorityRow = Array.isArray(authority.json) ? authority.json[0] : null;
  record(
    "payment_is_server_authoritative_in_the_database",
    row?.payment_status === "paid"
      && row?.payment_product_id === "expungement_packet"
      && Boolean(row?.payment_person_id)
      && row?.payment_matter_id === matterId
      && Boolean(row?.provider_event_id)
      && authorityRow?.valid === true
      && authorityRow?.reason === "authorized",
    `consumer_briefcase_items.payment_status='${row?.payment_status ?? "(missing)"}', product=${row?.payment_product_id ?? "(missing)"}, person=${row?.payment_person_id ?? "(missing)"}, matter=${row?.payment_matter_id ?? "(missing)"}; five-argument authority=${authorityRow?.valid ?? false}/${authorityRow?.reason ?? "missing"}.`
  );
  evidence.paymentRow = row ?? null;
}

// --- 7. The render, now that payment is authoritative ------------------------
{
  const res = await callApp("/api/expungement-ai/packet/render", { method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId } });
  record(
    "paid_render_is_queued",
    res.status === 202,
    `POST /api/expungement-ai/packet/render for the same item after payment = ${res.status} (must be 202), jobId=${res.json?.jobId ?? "(none)"} — the identical request that was 402 moments ago`
  );
  evidence.render = { status: res.status, jobId: res.json?.jobId ?? null };
}

// --- 8. The pinned worker, by digest, against the hosted project -------------
{
  const workerHost = `rcap-payment-${evidence.render?.jobId ?? "missing-job"}`;
  const queueRows = await sql(`
    select count(*)::int as claimable_after_housekeeping_jobs,
           count(*) filter (where id = '${evidence.render?.jobId}')::int as target_jobs
      from public.packet_render_jobs
     where renderer_kind = 'packet_document_v1'
       and (
         (status = 'queued' and (next_attempt_at is null or next_attempt_at <= now()))
         or (status = 'claimed' and claim_expires_at is not null and claim_expires_at < now())
         or (status = 'failed' and failure_disposition = 'retryable'
             and attempt_count < max_attempts
             and (next_attempt_at is null or next_attempt_at <= now()))
       )
  `);
  const queueState = Array.isArray(queueRows.json) ? queueRows.json[0] : null;
  const soleTarget = Number(queueState?.claimable_after_housekeeping_jobs) === 1
    && Number(queueState?.target_jobs) === 1;
  record(
    "worker_queue_contains_only_the_target_job",
    soleTarget,
    `packet_document_v1 jobs claimable after the worker's expired-claim release and retry requeue=${queueState?.claimable_after_housekeeping_jobs ?? "(none)"}; rows matching target ${evidence.render?.jobId ?? "(none)"}=${queueState?.target_jobs ?? "(none)"}; refusing to start a global one-cycle worker unless its only possible claim is this target`
  );
  evidence.workerQueuePrecondition = {
    targetJobId: evidence.render?.jobId ?? null,
    claimableAfterHousekeepingJobs: Number(queueState?.claimable_after_housekeeping_jobs ?? -1),
    targetJobs: Number(queueState?.target_jobs ?? -1),
    exact: soleTarget
  };
  if (!soleTarget) finish();

  const service = await (async () => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
    });
    const list = await res.json().catch(() => []);
    return Array.isArray(list) ? list.find((k) => k.name === "service_role")?.api_key ?? "" : "";
  })();

  const run = spawnSync("docker", [
    "run", "--rm",
    "--hostname", workerHost,
    "-e", `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
    "-e", `SUPABASE_URL=${SUPABASE_URL}`,
    "-e", `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    "-e", `RCAP_WORKER_CONTAINER_DIGEST=${WORKER_DIGEST}`,
    WORKER_DIGEST_REF,
    "node", "scripts/rcap-render-worker.mjs"
  ], { encoding: "utf8", timeout: 300000 });

  const jobs = await sql(`
    select id, status, attempt_count, claimed_by, output_storage_path, output_sha256,
           output_byte_count, container_digest, delivery_eligibility, accounting_result
      from public.packet_render_jobs
     where briefcase_item_id = '${itemId}' order by created_at desc limit 1
  `);
  const job = Array.isArray(jobs.json) ? jobs.json[0] : null;
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
  let workerResult = null;
  for (const line of String(run.stdout ?? "").trim().split(/\r?\n/).reverse()) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") { workerResult = parsed; break; }
    } catch { /* worker diagnostics before the final JSON line are expected */ }
  }
  const finalized = run.status === 0
    && workerResult?.outcome === "finalized"
    && workerResult?.jobId === evidence.render?.jobId
    && workerResult?.deliveryEligibility === "eligible"
    && workerResult?.accountingResult === "zero_charge"
    && job?.id === evidence.render?.jobId
    && job?.status === "artifact_validated"
    && new RegExp(`^${workerHost}-\\d+$`).test(job?.claimed_by ?? "")
    && typeof job?.output_storage_path === "string" && job.output_storage_path.length > 0
    && /^[a-f0-9]{64}$/.test(job?.output_sha256 ?? "")
    && Number(job?.output_byte_count) > 0
    && job?.container_digest === WORKER_DIGEST
    && job?.delivery_eligibility === "eligible"
    && job?.accounting_result === "zero_charge";
  record(
    "worker_renders_and_stores_the_artifact",
    finalized,
    `${WORKER_DIGEST_REF} exited ${run.status}; emitted outcome=${workerResult?.outcome ?? "(none)"}/job=${workerResult?.jobId ?? "(none)"}; database job=${job?.id ?? "(none)"} (expected ${evidence.render?.jobId ?? "(none)"}) claimed_by=${job?.claimed_by ?? "(none)"} (must start ${workerHost}-), status='${job?.status ?? "(no job row)"}' after ${job?.attempt_count ?? 0} attempt(s); bytes=${job?.output_byte_count ?? 0}; digest=${job?.container_digest ?? "(none)"}; delivery=${job?.delivery_eligibility ?? "(none)"}/${job?.accounting_result ?? "(none)"}. Tail: ${output.slice(-260)}`
  );
  evidence.worker = {
    exitCode: run.status,
    emittedResult: workerResult,
    expectedHostname: workerHost,
    claimedBy: job?.claimed_by ?? null,
    jobId: job?.id ?? null,
    jobStatus: job?.status ?? null,
    outputStoragePath: job?.output_storage_path ?? null,
    outputSha256: job?.output_sha256 ?? null,
    outputByteCount: Number(job?.output_byte_count ?? 0),
    containerDigest: job?.container_digest ?? null,
    deliveryEligibility: job?.delivery_eligibility ?? null,
    accountingResult: job?.accounting_result ?? null
  };
}

// --- 8b. Identity: the job is bound to server-owned person and matter --------
{
  const rows = await sql(`
    select j.id as job_id, j.person_id, j.matter_id, j.output_storage_path,
           j.output_sha256, j.output_byte_count, j.container_digest,
           j.delivery_eligibility, j.accounting_result, j.status,
           c.person_id as consumption_person_id, c.matter_id as consumption_matter_id,
           c.first_render_job_id, c.provider_event_id
      from public.packet_render_jobs j
      left join public.consumer_packet_payment_consumption c
        on c.consumer_briefcase_item_id = j.briefcase_item_id
     where j.briefcase_item_id = '${itemId}'
     order by j.created_at desc limit 1
  `);
  const row = Array.isArray(rows.json) ? rows.json[0] : null;
  // Both must be present AND agree. A job carrying a person the entitlement
  // does not name would mean the packet was rendered for one identity and paid
  // for by another.
  const bound = row?.job_id === evidence.render?.jobId
    && row?.job_id === evidence.worker?.jobId
    && row?.first_render_job_id === row?.job_id
    && row?.output_storage_path === evidence.worker?.outputStoragePath
    && row?.output_sha256 === evidence.worker?.outputSha256
    && Number(row?.output_byte_count) === evidence.worker?.outputByteCount
    && row?.container_digest === WORKER_DIGEST
    && row?.delivery_eligibility === "eligible"
    && row?.accounting_result === "zero_charge"
    && Boolean(row?.person_id) && Boolean(row?.matter_id)
    && row.person_id === row.consumption_person_id
    && String(row.matter_id) === String(row.consumption_matter_id);
  record(
    "person_and_matter_are_bound_on_the_render_job",
    bound,
    `render job=${row?.job_id ?? "(null)"}, first consumption job=${row?.first_render_job_id ?? "(null)"}, person_id=${row?.person_id ?? "(null)"}, matter_id=${row?.matter_id ?? "(null)"}, output_sha256=${row?.output_sha256 ?? "(null)"}, bytes=${row?.output_byte_count ?? 0}, digest=${row?.container_digest ?? "(null)"}; the payment consumption row names person_id=${row?.consumption_person_id ?? "(null)"} matter_id=${row?.consumption_matter_id ?? "(null)"} against Stripe event ${row?.provider_event_id ?? "(none)"} — job, artifact, worker, person and matter must all agree`
  );
  evidence.identityBinding = row ?? null;
  evidence.artifactPath = row?.output_storage_path ?? null;
}

// --- 8c. The artifact is in PRIVATE storage ----------------------------------
{
  const artifactPath = evidence.artifactPath;
  const service = await (async () => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
    });
    const list = await res.json().catch(() => []);
    return Array.isArray(list) ? list.find((k) => k.name === "service_role")?.api_key ?? "" : "";
  })();

  const bucket = "rcap-packet-artifacts-private";
  // Anonymous, over the public object path. A 200 here would mean a paid
  // participant's packet is readable by anyone who guesses the path.
  const publicRead = artifactPath
    ? await fetch(`${SUPABASE_URL}/storage/v1/object/public/${bucket}/${artifactPath}`).then((r) => r.status).catch(() => "unreachable")
    : "no artifact path recorded";
  const serviceRead = artifactPath
    ? await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${artifactPath}`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` }
      }).then(async (r) => {
        const bytes = r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0);
        return {
          status: r.status,
          bytes: bytes.length,
          contentType: r.headers.get("content-type") ?? "",
          pdf: bytes.subarray(0, 5).toString("latin1") === "%PDF-",
          sha256: r.ok ? crypto.createHash("sha256").update(bytes).digest("hex") : null
        };
      }).catch(() => ({ status: "unreachable", bytes: 0, contentType: "", pdf: false, sha256: null }))
    : { status: "no artifact path recorded", bytes: 0, contentType: "", pdf: false, sha256: null };
  const bucketRead = await sql(`select id, public from storage.buckets where id = '${bucket}'`);
  const bucketRows = Array.isArray(bucketRead.json) ? bucketRead.json : [];
  const bucketPrivate = typeof bucketRead.status === "number"
    && bucketRead.status >= 200
    && bucketRead.status < 300
    && bucketRows.length === 1
    && bucketRows[0]?.public === false;
  const anonymousRefused = [400, 401, 403, 404].includes(publicRead);

  record(
    "artifact_is_stored_privately_and_re_readable",
    Boolean(artifactPath)
      && bucketPrivate
      && anonymousRefused
      && serviceRead.status === 200
      && serviceRead.contentType.toLowerCase().startsWith("application/pdf")
      && serviceRead.bytes > 0
      && serviceRead.pdf
      && serviceRead.sha256 === evidence.worker?.outputSha256
      && serviceRead.bytes === evidence.worker?.outputByteCount,
    `bucket metadata public=false=${bucketPrivate}; anonymous public-path read=${publicRead} (must be a deterministic 4xx); authorized re-read=${serviceRead.status}, content-type=${serviceRead.contentType || "(none)"}, bytes=${serviceRead.bytes}/${evidence.worker?.outputByteCount ?? 0}, PDF=${serviceRead.pdf}, hash matches finalized job=${serviceRead.sha256 === evidence.worker?.outputSha256}`
  );
  evidence.storage = { path: artifactPath, bucketPrivate, anonymous: publicRead, authorized: serviceRead };
}

// --- 9. Delivery: the owner, and nobody else ---------------------------------
{
  const jobId = evidence.worker?.jobId;
  const download = `/api/rcap/packets/${encodeURIComponent(jobId ?? "missing-job-id")}/download`;
  const owner = await callApp(download, { cookie: A.cookie });
  const stranger = await callApp(download, { cookie: B.cookie });
  const anonymous = await callApp(download);
  const ownerSha256 = owner.status === 200 ? crypto.createHash("sha256").update(owner.bytes).digest("hex") : null;
  const ownerPdf = owner.status === 200
    && owner.contentType.toLowerCase().startsWith("application/pdf")
    && /attachment/i.test(owner.contentDisposition)
    && owner.bytes.length > 0
    && owner.bytes.subarray(0, 5).toString("latin1") === "%PDF-"
    && ownerSha256 === evidence.worker?.outputSha256
    && ownerSha256 === evidence.storage?.authorized?.sha256
    && owner.bytes.length === evidence.worker?.outputByteCount
    && owner.bytes.length === evidence.storage?.authorized?.bytes;
  const strangerRefused = stranger.status === 403
    && stranger.json?.code === "unauthorized"
    && stranger.json?.error === "This packet is not available for download.";
  const anonRefused = anonymous.status === 401
    && anonymous.json?.code === "unauthenticated"
    && anonymous.json?.error === "Sign in to download your packet.";
  record(
    "delivery_serves_the_owner_and_refuses_everyone_else",
    Boolean(jobId) && ownerPdf && strangerRefused && anonRefused,
    `GET worker-backed job ${jobId ?? "(none)"}: owner A=${owner.status}, content-type=${owner.contentType || "(none)"}, attachment=${/attachment/i.test(owner.contentDisposition)}, bytes=${owner.bytes.length}/${evidence.worker?.outputByteCount ?? 0}, PDF=${owner.bytes.subarray(0, 5).toString("latin1") === "%PDF-"}, hash matches job+Storage=${ownerSha256 === evidence.worker?.outputSha256 && ownerSha256 === evidence.storage?.authorized?.sha256}; ` +
      `a different authenticated participant B=${stranger.status}/${stranger.json?.code ?? "(none)"} (must be exact application 403 unauthorized); anonymous=${anonymous.status}/${anonymous.json?.code ?? "(none)"} (must be exact application 401 unauthenticated). B paid for nothing and must receive nothing.`
  );
  evidence.delivery = {
    jobId,
    route: download,
    owner: owner.status,
    ownerContentType: owner.contentType,
    ownerContentDisposition: owner.contentDisposition,
    ownerByteCount: owner.bytes.length,
    ownerSha256,
    finalizedJobSha256: evidence.worker?.outputSha256 ?? null,
    privateStorageSha256: evidence.storage?.authorized?.sha256 ?? null,
    ownerPdf,
    stranger: stranger.status,
    strangerCode: stranger.json?.code ?? null,
    strangerRefused,
    anonymous: anonymous.status,
    anonymousCode: anonymous.json?.code ?? null,
    anonymousRefused
  };
}

// --- 10. Replay: Stripe retries, and must change nothing ---------------------
{
  const before = await sql(`
    select
      (select count(*) from public.packet_render_jobs where briefcase_item_id = '${itemId}') as jobs,
      (select count(*) from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}') as entitlements
  `);
  const b = Array.isArray(before.json) ? before.json[0] : null;

  // Byte-identical redelivery of the SAME event id, correctly signed with a
  // fresh timestamp — exactly what Stripe does when it retries, and what
  // happens when one event fans out to the canonical and legacy endpoints.
  const timestamp = Math.floor(Date.now() / 1000);
  const replay = signedBody(completionEvent, WEBHOOK_SECRET, timestamp);
  const replayRes = await callApp("/api/stripe/webhook", {
    method: "POST", body: replay.body, headers: { "stripe-signature": replay.header }, queryOnlyBypass: true
  });

  const after = await sql(`
    select
      (select count(*) from public.packet_render_jobs where briefcase_item_id = '${itemId}') as jobs,
      (select count(*) from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}') as entitlements
  `);
  const a = Array.isArray(after.json) ? after.json[0] : null;

  const unchanged = b && a && String(a.jobs) === String(b.jobs) && String(a.entitlements) === String(b.entitlements);
  record(
    "event_replay_creates_no_second_entitlement_or_render_job",
    replayRes.status === 200 && unchanged && String(a?.entitlements) === "1",
    `replaying the same signed event returned ${replayRes.status} (outcome=${replayRes.json?.outcome ?? "none"}); render jobs ${b?.jobs} → ${a?.jobs}, payment entitlements ${b?.entitlements} → ${a?.entitlements}. Exactly one entitlement must exist and no second job may appear — a retry that charged twice or rendered twice would be indistinguishable from success without this count.`
  );
  evidence.replay = { status: replayRes.status, outcome: replayRes.json?.outcome ?? null, before: b, after: a };
}

// --- 11. Close the disposable Session, retain the durable evidence chain -----
// The synthetic Stripe Session is external, open and unpaid after the signed
// webhook exercise, so it is expired narrowly. The database and private object
// are deliberately retained: packet_render_jobs is an append-only audit ledger,
// and deleting the item, entitlement, processed event, or object would orphan
// or contradict that immutable terminal job.
evidence.cleanup = {};

let syntheticSessionExpired = false;
{
  const safeTarget = session?.id?.startsWith("cs_test_")
    && session?.livemode === false
    && session?.status === "open"
    && session?.payment_status === "unpaid"
    && session?.client_reference_id === itemId
    && session?.metadata?.briefcase_item_id === itemId;
  const expired = safeTarget
    ? await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(session.id)}/expire`, { method: "POST", form: {} })
    : { ok: false, status: "not attempted", json: null };
  const readback = safeTarget
    ? await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(session.id)}`)
    : { ok: false, status: "not attempted", json: null };
  syntheticSessionExpired = Boolean(safeTarget)
    && expired.ok
    && readback.ok
    && expired.json?.id === session.id
    && readback.json?.id === session.id
    && readback.json?.livemode === false
    && readback.json?.status === "expired"
    && readback.json?.payment_status === "unpaid"
    && readback.json?.client_reference_id === itemId
    && readback.json?.metadata?.briefcase_item_id === itemId;
  record(
    "synthetic_checkout_session_expired_after_automated_journey",
    syntheticSessionExpired,
    `target was exact automated cs_test_ Session=${Boolean(safeTarget)}; expire HTTP=${expired.status}; readback HTTP=${readback.status}; same id=${readback.json?.id === session?.id}; status=${readback.json?.status ?? "(none)"}; payment_status=${readback.json?.payment_status ?? "(none)"}`
  );
  evidence.cleanup.stripeSession = {
    id: session?.id ?? null,
    targetedByExactAutomatedItemBinding: Boolean(safeTarget),
    expireStatus: expired.status,
    readbackStatus: readback.status,
    finalSessionStatus: readback.json?.status ?? null,
    finalPaymentStatus: readback.json?.payment_status ?? null,
    retainedForRoger: false
  };
}

// Re-read the whole authoritative chain after replay and Session expiry. This
// is not a loose “rows exist” check: each row is bound to the random item,
// Session, event and finalized job minted by this run, and the retained private
// object is fetched again and hashed from bytes.
{
  const bucket = "rcap-packet-artifacts-private";
  const artifactPath = evidence.storage?.path ?? null;
  const jobId = evidence.worker?.jobId ?? null;
  const outputSha256 = evidence.worker?.outputSha256 ?? null;
  const outputByteCount = evidence.worker?.outputByteCount ?? 0;
  const exactPathIdentity = typeof artifactPath === "string"
    && artifactPath.includes(jobId ?? "missing-job-id")
    && artifactPath.includes(outputSha256 ?? "missing-output-sha");

  const chain = await sql(`select
      (select count(*)::int from public.consumer_briefcase_items
        where id = '${itemId}' and user_id = '${A.id}'
          and payment_status = 'paid'
          and checkout_session_id = '${sqlText(session.id)}'
          and provider_event_id = '${sqlText(completionEvent.id)}') as items,
      (select count(*)::int from public.consumer_packet_payment_consumption
        where consumer_briefcase_item_id = '${itemId}'
          and provider_event_id = '${sqlText(completionEvent.id)}'
          and first_render_job_id = '${jobId}') as entitlements,
      (select count(*)::int from public.packet_render_jobs
        where id = '${jobId}'
          and briefcase_item_id = '${itemId}'
          and consumer_briefcase_item_id = '${itemId}'
          and consumer_auth_user_id = '${A.id}'
          and status in ('artifact_validated', 'delivered')
          and output_storage_path = '${sqlText(artifactPath ?? "")}'
          and output_sha256 = '${outputSha256}'
          and output_byte_count = ${Number(outputByteCount)}
          and container_digest = '${sqlText(WORKER_DIGEST)}'
          and delivery_eligibility = 'eligible'
          and accounting_result = 'zero_charge') as jobs,
      (select count(*)::int from public.processed_stripe_events
        where stripe_event_id = '${sqlText(completionEvent.id)}'
          and event_type = 'checkout.session.completed'
          and related_object_id = '${sqlText(session.id)}') as processed_events`);
  const counts = Array.isArray(chain.json) ? chain.json[0] : null;

  const keys = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  }).then((response) => response.json()).catch(() => []);
  const service = Array.isArray(keys) ? keys.find((entry) => entry.name === "service_role")?.api_key ?? "" : "";
  const encodedPath = exactPathIdentity
    ? artifactPath.split("/").map((segment) => encodeURIComponent(segment)).join("/")
    : "";
  const retainedObject = exactPathIdentity && service
    ? await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${encodedPath}`, {
        headers: { apikey: service, Authorization: `Bearer ${service}` }
      }).then(async (response) => {
        const bytes = response.ok ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
        return {
          status: response.status,
          bytes: bytes.length,
          pdf: bytes.subarray(0, 5).toString("latin1") === "%PDF-",
          sha256: response.ok ? crypto.createHash("sha256").update(bytes).digest("hex") : null
        };
      }).catch(() => ({ status: "unreachable", bytes: 0, pdf: false, sha256: null }))
    : { status: "not attempted", bytes: 0, pdf: false, sha256: null };
  const retained = syntheticSessionExpired
    && exactPathIdentity
    && Number(counts?.items) === 1
    && Number(counts?.entitlements) === 1
    && Number(counts?.jobs) === 1
    && Number(counts?.processed_events) === 1
    && retainedObject.status === 200
    && retainedObject.pdf
    && retainedObject.bytes === outputByteCount
    && retainedObject.sha256 === outputSha256;
  record(
    "synthetic_acceptance_chain_retained_and_hash_valid_after_replay",
    retained,
    `Session expired=${syntheticSessionExpired}; exact path identity=${exactPathIdentity}; retained rows item/entitlement/job/event=${counts?.items ?? "(none)"}/${counts?.entitlements ?? "(none)"}/${counts?.jobs ?? "(none)"}/${counts?.processed_events ?? "(none)"}; private object readback=${retainedObject.status}, PDF=${retainedObject.pdf}, bytes=${retainedObject.bytes}/${outputByteCount}, hash matches=${retainedObject.sha256 === outputSha256}`
  );
  evidence.cleanup.durableEvidence = {
    bucket,
    path: artifactPath,
    eventId: completionEvent.id,
    relatedSessionId: session?.id ?? null,
    rowCounts: counts,
    exactJobAndHashPath: exactPathIdentity,
    privateObject: retainedObject,
    databaseRowsRetained: true,
    privateObjectRetained: true
  };
}

finish();
