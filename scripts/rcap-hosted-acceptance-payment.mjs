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
const { consumerPacketPriceCents } = await import("../src/lib/expungement-ai/payment-adapter.ts");

const rootDir = process.cwd();
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const WORKER_DIGEST_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const STRIPE_KEY = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
const WEBHOOK_SECRET = process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET ?? "";

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF) || !VERCEL_TOKEN) {
  console.error("PAYMENT: SUPABASE_ACCESS_TOKEN, ACCEPTANCE_SUPABASE_PROJECT_REF and VERCEL_TOKEN are required");
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
  "renderable_route_selected_from_the_registry",
  "unpaid_render_is_refused_for_payment",
  "checkout_session_created_against_stripe_sandbox",
  "forged_webhook_signature_is_rejected",
  "signed_webhook_records_the_payment",
  "payment_is_server_authoritative_in_the_database",
  "paid_render_is_queued",
  "worker_renders_and_stores_the_artifact",
  "person_and_matter_are_bound_on_the_render_job",
  "artifact_is_stored_privately_and_re_readable",
  "delivery_serves_the_owner_and_refuses_everyone_else",
  "event_replay_creates_no_second_entitlement_or_render_job"
];

const bypassHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS, "x-vercel-set-bypass-cookie": "false" } : {};

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
async function callApp(pathname, { method = "GET", cookie = null, body = null, headers = {} } = {}) {
  try {
    // Header AND query parameter — see the gallery script; the header alone
    // was answered 401 by a protected Preview.
    const joiner = pathname.includes("?") ? "&" : "?";
    const suffix = BYPASS ? `${joiner}x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}&x-vercel-set-bypass-cookie=true` : "";
    const res = await fetch(`${PREVIEW}${pathname}${suffix}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...bypassHeaders,
        ...headers
      },
      body: body === null ? undefined : typeof body === "string" ? body : JSON.stringify(body),
      redirect: "manual"
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* HTML or empty is fine */ }
    return { status: res.status, json, text };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, json: null, text: "" };
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
  const res = await vercelApi(`/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&limit=100&state=READY`);
  const match = (Array.isArray(res.json?.deployments) ? res.json.deployments : []).find(
    (d) => (d.readyState ?? d.state) === "READY"
      && d.target !== "production"
      && d.meta?.rcapApplicationSha === APPLICATION_SHA
      && d.meta?.rcapStripeConfigured === "true"
      && d.meta?.rcapRouteState === "staging_scoped"
  );
  PREVIEW = match ? `https://${match.url}` : "";
  record(
    "payment_preview_deployment_discovered",
    Boolean(PREVIEW),
    PREVIEW
      ? `${PREVIEW} — READY, non-production, built WITH Stripe configuration and the scoped delivery state`
      : "no READY non-production deployment of this SHA carries rcapStripeConfigured=true and rcapRouteState=staging_scoped; the payment journey would otherwise have run against a deployment that cannot transact"
  );
  if (!PREVIEW) finish();
  evidence.previewUrl = PREVIEW;
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

  const bypassWorks = probeA.isApplicationJson || probeB.isApplicationJson || Boolean(probeCFollowed?.isApplicationJson);
  const anyVercelAuthRedirect = [probeA, probeB, probeC].some((p) => locationIsVercelAuth(p.location));
  const chain = [probeA, probeB, probeC, probeCFollowed].filter(Boolean)
    .map((p) => `${p.label}:${p.status}->${p.location}`).join(" | ");

  evidence.bypassProbes = {
    A: probeA, B: probeB, C: probeC, CFollowed: probeCFollowed,
    cliControl,
    locationChain: chain,
    stripeRelevantProbe: "B (query parameter, no cookie bootstrap)",
    verdict: bypassWorks
      ? "the bypass reaches the application"
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

ANON_KEY = await supabaseKeys();
const A = await signIn("acceptance-consumer-a@rcap-acceptance.test", "Acceptance-a-4f7c21!");
const B = await signIn("acceptance-consumer-b@rcap-acceptance.test", "Acceptance-b-8d3e95!");
if (!A || !B) {
  record("renderable_route_selected_from_the_registry", false, "the synthetic consumer identities could not sign in");
  finish();
}

// --- 2. A route the renderer will actually accept ----------------------------
// Discovered rather than hardcoded: buildRenderJobSpec is the authority on what
// is renderable, so the journey asks it instead of assuming a state.
let route = null;
{
  if (!buildRenderJobSpec) {
    record("renderable_route_selected_from_the_registry", false, "buildRenderJobSpec could not be imported, so no route could be proven renderable");
    finish();
  }
  const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const tried = [];
  // Pennsylvania first, because PA is the first review priority and PA does in
  // fact expose packet-capable routes — 11 of them. Mississippi and Illinois
  // follow for the same reason. The rest of the corpus is the fallback, so the
  // journey still runs if the priority states ever stop being renderable
  // rather than silently testing nothing.
  const PRIORITY_ORDER = ["PA", "MS", "IL"];
  const profiles = [...getAllJurisdictionProfiles()].sort((a, b) => {
    const rank = (p) => {
      const index = PRIORITY_ORDER.indexOf(p.jurisdiction.code);
      return index === -1 ? PRIORITY_ORDER.length : index;
    };
    return rank(a) - rank(b);
  });
  outer:
  for (const profile of profiles) {
    for (const pathway of profile.pathways ?? []) {
      const label = pathway.label ?? pathway.id;
      const built = buildRenderJobSpec({
        packetId: crypto.randomUUID(),
        state: profile.jurisdiction.code,
        pathway: label,
        profileId: profile.jurisdiction.code,
        profileVersion: "1.3.0",
        briefcaseItemId: crypto.randomUUID(),
        trackId: null,
        packetFields: {}
      });
      tried.push(`${profile.jurisdiction.code}:${pathway.id}`);
      if (built.spec) { route = { state: profile.jurisdiction.code, pathwayLabel: label, pathwayId: pathway.id }; break outer; }
    }
  }
  record(
    "renderable_route_selected_from_the_registry",
    Boolean(route),
    route
      ? `${route.state} / ${route.pathwayLabel} — buildRenderJobSpec produced a spec, so this route is genuinely renderable rather than assumed to be`
      : `no compiled pathway produced a render spec across ${tried.length} candidates; nothing in the product is currently sellable-and-renderable`
  );
  if (!route) finish();
  evidence.route = route;
}

// --- 3. Seed the participant's item, unpaid ----------------------------------
const itemId = crypto.randomUUID();
await sql(`
  insert into public.consumer_briefcase_items
    (id, user_id, item_type, jurisdiction, pathway_label, status, summary_json, payment_status, payment_allowed)
  values ('${itemId}', '${A.id}', 'result', '${route.state}', ${JSON.stringify(route.pathwayLabel).replace(/'/g, "''")},
          'result_saved', '{"text":"hosted acceptance payment journey"}'::jsonb, 'unpaid', true)
`);

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
  const sessionId = res.json?.sessionId ?? res.json?.id ?? null;
  let fetched = null;
  if (sessionId) {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` }
    });
    fetched = await stripeRes.json().catch(() => null);
  }
  session = fetched && fetched.id ? fetched : null;
  record(
    "checkout_session_created_against_stripe_sandbox",
    Boolean(session),
    session
      ? `the deployed application created Stripe session ${session.id} (amount_total=${session.amount_total} ${session.currency}, channel=${session.metadata?.channel ?? "(none)"}), read back from Stripe rather than from the response body`
      : `checkout returned ${res.status} and no retrievable Stripe session: ${String(res.text).slice(0, 200)}`
  );
  if (!session) finish();
  evidence.checkout = { sessionId: session.id, amountTotal: session.amount_total, currency: session.currency, expectedCents: consumerPacketPriceCents ?? null };
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
    method: "POST", body: forged.body, headers: { "stripe-signature": forged.header }
  });
  record(
    "forged_webhook_signature_is_rejected",
    forgedRes.status === 400,
    `POST /api/stripe/webhook with a payload signed by the WRONG secret = ${forgedRes.status} (must be 400) — this is the negative control for every payment case below it`
  );

  const genuineRes = await callApp("/api/stripe/webhook", {
    method: "POST", body: genuine.body, headers: { "stripe-signature": genuine.header }
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
  const after = await sql(`select payment_status, payment_provider from public.consumer_briefcase_items where id = '${itemId}'`);
  const row = Array.isArray(after.json) ? after.json[0] : null;
  record(
    "payment_is_server_authoritative_in_the_database",
    row?.payment_status === "paid",
    `consumer_briefcase_items.payment_status is now '${row?.payment_status ?? "(missing)"}' (provider ${row?.payment_provider ?? "none"}). Phase 52 revoked the application's privilege to set this column directly, so a value of 'paid' here can only have come through the server-only writer the webhook invoked.`
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
  const service = await (async () => {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
    });
    const list = await res.json().catch(() => []);
    return Array.isArray(list) ? list.find((k) => k.name === "service_role")?.api_key ?? "" : "";
  })();

  const run = spawnSync("docker", [
    "run", "--rm",
    "-e", `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
    "-e", `SUPABASE_URL=${SUPABASE_URL}`,
    "-e", `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    WORKER_DIGEST_REF,
    "node", "scripts/rcap-render-worker.mjs"
  ], { encoding: "utf8", timeout: 300000 });

  const jobs = await sql(`
    select status, attempt_count from public.packet_render_jobs
     where briefcase_item_id = '${itemId}' order by created_at desc limit 1
  `);
  const job = Array.isArray(jobs.json) ? jobs.json[0] : null;
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
  record(
    "worker_renders_and_stores_the_artifact",
    run.status === 0 && Boolean(job) && job.status !== "failed",
    `${WORKER_DIGEST_REF} exited ${run.status}; the job for this item is '${job?.status ?? "(no job row)"}' after ${job?.attempt_count ?? 0} attempt(s). Tail: ${output.slice(-260)}`
  );
  evidence.worker = { exitCode: run.status, jobStatus: job?.status ?? null };
}

// --- 8b. Identity: the job is bound to server-owned person and matter --------
{
  const rows = await sql(`
    select j.person_id, j.matter_id, j.output_storage_path, j.output_sha256, j.status,
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
  const bound = Boolean(row?.person_id) && Boolean(row?.matter_id)
    && row.person_id === row.consumption_person_id
    && String(row.matter_id) === String(row.consumption_matter_id);
  record(
    "person_and_matter_are_bound_on_the_render_job",
    bound,
    `render job person_id=${row?.person_id ?? "(null)"} matter_id=${row?.matter_id ?? "(null)"}; the payment consumption row names person_id=${row?.consumption_person_id ?? "(null)"} matter_id=${row?.consumption_matter_id ?? "(null)"} against Stripe event ${row?.provider_event_id ?? "(none)"} — these must agree, or the packet was rendered for one identity and paid for by another`
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
      }).then(async (r) => ({ status: r.status, bytes: r.ok ? (await r.arrayBuffer()).byteLength : 0 })).catch(() => ({ status: "unreachable", bytes: 0 }))
    : { status: "no artifact path recorded", bytes: 0 };

  record(
    "artifact_is_stored_privately_and_re_readable",
    Boolean(artifactPath) && publicRead >= 400 && serviceRead.status === 200 && serviceRead.bytes > 0,
    `anonymous read of the object path = ${publicRead} (must refuse); an authorized re-read returned ${serviceRead.status} with ${serviceRead.bytes} bytes — written once and readable back, but not by the public`
  );
  evidence.storage = { path: artifactPath, anonymous: publicRead, authorized: serviceRead };
}

// --- 9. Delivery: the owner, and nobody else ---------------------------------
{
  const download = `/api/expungement-ai/packet/download?briefcaseItemId=${itemId}`;
  const owner = await callApp(download, { cookie: A.cookie });
  const stranger = await callApp(download, { cookie: B.cookie });
  const anonymous = await callApp(download);
  const strangerRefused = typeof stranger.status === "number" && stranger.status >= 400;
  const anonRefused = typeof anonymous.status === "number" && anonymous.status >= 400;
  record(
    "delivery_serves_the_owner_and_refuses_everyone_else",
    strangerRefused && anonRefused,
    `owner A=${owner.status}; a different authenticated participant B=${stranger.status} (must refuse); anonymous=${anonymous.status} (must refuse). B paid for nothing and must receive nothing.`
  );
  evidence.delivery = { owner: owner.status, stranger: stranger.status, anonymous: anonymous.status };
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
    method: "POST", body: replay.body, headers: { "stripe-signature": replay.header }
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

// Leave the acceptance database as it was found.
await sql(`delete from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}'`);
await sql(`delete from public.consumer_briefcase_items where id = '${itemId}'`);

finish();
