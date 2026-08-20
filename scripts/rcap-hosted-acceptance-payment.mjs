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

const { buildRenderJobSpec, validateRenderOutput } = await import("../src/lib/rcap/render/job-contract.ts");
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
/**
 * Fails closed, because a verdict function that accepts anything truthy is not
 * a verdict function. Two malformed calls have already reached main here: one
 * passed four arguments, which slid a non-empty string into `passed` and made
 * the case incapable of failing; another reported a claimed, artifactless job
 * as ok. Both were shaped exactly like a passing test.
 *
 * So: exactly three arguments, `passed` a real boolean and nothing else, a
 * non-empty case id and observation, and one verdict per case. Anything else
 * throws, which stops the run without an evidence file rather than producing a
 * green one. A `!!x`, a count, a status code, a truthy object or an accidental
 * `undefined` from a short-circuit can no longer become a pass.
 */
function record(caseId, passed, observed) {
  if (arguments.length !== 3) {
    throw new TypeError(`record(caseId, passed, observed) takes exactly 3 arguments; ${arguments.length} given for "${caseId}"`);
  }
  if (typeof passed !== "boolean") {
    throw new TypeError(`record("${caseId}") needs a real boolean verdict; got ${typeof passed} (${JSON.stringify(passed) ?? String(passed)})`);
  }
  if (typeof caseId !== "string" || caseId.trim() === "") {
    throw new TypeError("record() needs a non-empty case id");
  }
  if (typeof observed !== "string" || observed.trim() === "") {
    throw new TypeError(`record("${caseId}") needs a non-empty observation; an unexplained verdict is not evidence`);
  }
  if (verdicts.has(caseId)) {
    throw new Error(`record("${caseId}") was called twice; a second verdict would silently overwrite the first`);
  }
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "payment_preview_deployment_discovered",
  "bypass_reaches_the_application_not_the_protection_layer",
  "renderable_route_selected_from_the_registry",
  "seeded_item_agrees_with_the_authoritative_resolver",
  // Before a single cent is spent: the published image, by digest, admits the
  // exact tuple the job about to be created will carry.
  "immutable_image_admits_the_tuple_before_any_charge",
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
    const suffix = BYPASS ? `${joiner}x-vercel-protection-bypass=${encodeURIComponent(BYPASS)}` : "";
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
    const buffer = Buffer.from(await res.arrayBuffer());
    const text = buffer.toString("utf8");
    let json = null;
    try { json = JSON.parse(text); } catch { /* HTML or empty is fine */ }
    // Headers and raw bytes are part of the evidence: a redirect is only a
    // refusal if you can say where it points, and a delivered packet is only
    // delivered if the bytes it carries parse as the artifact.
    return {
      status: res.status,
      json,
      text,
      bytes: buffer,
      location: res.headers.get("location"),
      contentType: res.headers.get("content-type")
    };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, json: null, text: "", bytes: Buffer.alloc(0), location: null, contentType: null };
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

// What this matrix does and does not prove about jurisdictions. It buys and
// delivers ONE matter on whichever route the evaluator will actually sell, and
// that is a proof about the payment and delivery machinery — not about
// Pennsylvania or Illinois coverage. Those are established per route in
// docs/RCAP_ROUTE_REACHABILITY.md and restated here so a green matrix can never
// be read as jurisdiction proof it did not perform.
const JURISDICTION_SCOPE = {
  note: "This matrix proves payment, finalization and delivery for one sellable matter. It is not evidence about any jurisdiction it did not transact.",
  pennsylvania: {
    sellablePathways: 0,
    inspectedPathways: 11,
    disposition: "intentional guidance",
    evidence: "every one of the 11 inspected PA pathways carries the recorded Lawrence hold lawrence_review=hold_guidance_only; the evaluator returns guidance_only with pa.lawrence_hold_guidance_only (Path J: pa.guidance_only_no_user_filed_court_petition). No $50 Checkout should open for those held routes.",
    isEvaluatorDefect: false
  },
  illinois: {
    sellablePathways: 3,
    inspectedPathways: 9,
    sellable: [
      "juvenile-automatic-or-petition-expungement",
      "adult-conviction-sealing",
      "felony-prostitution-relief"
    ],
    evidence: "each reaches packet_ready_with_caution with paymentAllowed=true under a witnessing public answer set recorded in docs/RCAP_ROUTE_REACHABILITY.md."
  }
};

function finish() {
  evidence.jurisdictionScope = JURISDICTION_SCOPE;
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
  // record() takes (caseId, passed, observed). This call passed FOUR arguments:
  // a stray "seeded_item_agrees_with_the_authoritative_resolver" sat where
  // `passed` belongs, so `passed` was a non-empty string — always truthy — and
  // `observed` was Boolean(route). This check could not fail. It reported ok
  // even in the branch whose own message reads "nothing in the product is
  // currently sellable-and-renderable", and the finish() below was the only
  // thing still stopping the run.
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

// The briefcase item id is minted here because the derivation below builds a
// render spec against it, and a const referenced before its declaration is a
// temporal dead zone error rather than a subtle one.
const itemId = crypto.randomUUID();
// Single-quoted SQL literal, doubling embedded quotes. Never JSON.stringify:
// that produces double quotes, which Postgres reads as an identifier.
const sqlText = (value) => String(value).split("'").join("''");

/**
 * This run's namespace: the exact identities every count, every verdict and
 * every replay assertion below is filtered by.
 *
 * The acceptance project is shared. Jobs abandoned by earlier runs are still
 * queued, still claimable and still older than anything this run creates, and
 * `claim_packet_render_job` is unscoped — it orders by created_at across the
 * WHOLE project. So "a job", "an artifact" and "a worker cycle" are not facts
 * about this run unless they are tied to one of these identities. Run
 * 32393413747 reported a backlog job's failure as this run's result, and named
 * a profile version the published image demonstrably admits.
 *
 * Each field is filled at the boundary that mints it and never inferred: the
 * render-job id comes from the paid render response and from nowhere else.
 */
const runNamespace = {
  briefcaseItemId: itemId,
  authUserId: A.id,
  personId: null,
  matterId: null,
  providerEventId: null,
  checkoutSessionId: null,
  renderJobId: null,
  artifactIdentity: null
};
evidence.runNamespace = runNamespace;

// --- 2b. The reviewed packet information -------------------------------------
//
// A participant cannot buy or render a packet whose information they have not
// completed and reviewed, and the application enforces that BEFORE it consults
// payment: consumer-render-request checks the accuracy review first and returns
// route_not_renderable, so an unreviewed item can never reach the 402 the
// payment gate would give it. Checkout refuses the same item with 409
// review_required.
//
// This harness previously seeded summary_json alone. commercialFlowForItem then
// synthesised a flow at stage "not_started" with every required input missing,
// so the deployment answered 403 and 409 — correctly — and the run read as an
// application defect when the application was right and the seed was thin.
//
// The answers are not written by hand. They are converged: the authoritative
// evaluator is asked what it still needs, each missing question is answered
// from the profile's own options, and the loop repeats until the evaluator
// itself returns a packet_ready route with paymentAllowed. Choosing values that
// merely satisfy a gate is the mistake the packet_type hardcode above already
// made once; this asks the engine instead of guessing at it.
const { packetInformationModelFor, packetInformationReviewSafety } =
  await import("../src/lib/expungement-ai/packet-information.ts");
const { evaluateAuthoritativeScreeningResult } =
  await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");

// Answers that carry meaning rather than merely satisfying a type. A route sold
// as a non-conviction expungement must not be seeded with a felony conviction,
// and the Mississippi non-conviction route additionally requires these exact
// neutral facts — packetInformationReviewSafety refuses any other value.
const PREFERRED_ANSWERS = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
  offense_level: "Misdemeanor",
  offense_category: "Misdemeanor",
  record_type: "Arrest or charge",
  resolved_timing_bucket: "gt_10_years",
  court_requirements_completed: "yes",
  pending_cases: "No",
  trafficking_status: "No",
  prior_relief: "No",
  pardon_status: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  state_exclusion_categories: ["None of these"],
  age_at_offense: "30",
  charge: "Shoplifting",
  county: "Hinds",
  court: "Hinds County Circuit Court",
  residency_or_location: "Jackson",
  criminal_history: "No other cases",
  disposition_date: "2005-01-10",
  participant_full_legal_name: "Acceptance Test Participant",
  contact_information: "hosted-acceptance@example.test"
};

function publicQuestionIndex(profile) {
  const index = new Map();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label)) {
      if (!index.has(node.id)) index.set(node.id, node);
    }
    Object.values(node).forEach(walk);
  })(projectPublicProfile(profile));
  return index;
}

function answerForQuestion(question, id) {
  const preferred = PREFERRED_ANSWERS[id];
  const optionsAllow = !question || question.type !== "single_choice"
    || !question.options?.length || question.options.includes(preferred);
  if (preferred !== undefined && optionsAllow) return preferred;
  if (!question) return "No";
  if (question.type === "date_or_unknown") return "2005-01-10";
  if (question.type === "number_or_range") return "30";
  if (question.type === "multi_select" && question.options?.length) {
    return [question.options.find((option) => /^none/i.test(option)) ?? question.options[0]];
  }
  if (question.type === "single_choice" && question.options?.length) {
    return question.options.find((option) => /^(no\b|none)/i.test(option)) ?? question.options[0];
  }
  if (question.type?.startsWith("yes_no")) return "No";
  return "None";
}

/**
 * Answers whatever the authoritative evaluator says is still missing until it
 * returns a sellable packet route, or gives up and says why. Returns null when
 * this jurisdiction cannot be sold at all — which is a fact about the corpus,
 * not a fault to paper over.
 */
function convergeSellableScreening(state) {
  const profile = getProfileByJurisdiction(state);
  if (!profile) return null;
  const questions = publicQuestionIndex(profile);
  let answers = {
    ownership_scope: PREFERRED_ANSWERS.ownership_scope,
    jurisdiction_scope: PREFERRED_ANSWERS.jurisdiction_scope,
    case_outcome: PREFERRED_ANSWERS.case_outcome,
    offense_level: PREFERRED_ANSWERS.offense_level,
    disposition_date: PREFERRED_ANSWERS.disposition_date
  };
  let last = null;
  for (let round = 0; round < 16; round += 1) {
    let evaluation;
    try {
      evaluation = evaluateAuthoritativeScreeningResult({
        jurisdiction: state,
        profileVersion: profile.profileVersion,
        matterId: itemId,
        answers
      }).evaluation;
    } catch (error) {
      // Packet-only fields are not evaluator questions. Drop exactly the ids it
      // names and re-ask; every recognised route fact stays.
      if (!error?.invalidQuestionIds?.length) return { state, failure: String(error?.message ?? error).slice(0, 160) };
      for (const id of error.invalidQuestionIds) delete answers[id];
      continue;
    }
    last = evaluation;
    const sellable = (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution")
      && evaluation.paymentAllowed === true
      && typeof evaluation.pathwayId === "string";
    if (sellable) return { state, evaluation, answers, profile };
    const missing = evaluation.missingQuestionIds ?? [];
    if (!missing.length) {
      return {
        state,
        failure: `${evaluation.resultCode} with nothing further to answer (${(evaluation.reasons ?? []).map((r) => r.code).join(",") || "no reason given"})`
      };
    }
    for (const id of missing) answers[id] = answerForQuestion(questions.get(id), id);
  }
  return { state, failure: `did not settle in 16 rounds; last ${last?.resultCode ?? "(none)"}` };
}

/** Assembles the reviewed flow and asserts it with the application's own predicates. */
function buildReviewedFlow(settled) {
  const { state, evaluation, answers, profile } = settled;
  const pathway = profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === evaluation.pathwayId);
  if (!pathway) return { failure: `${state}: the evaluator chose ${evaluation.pathwayId}, which the packet generator does not offer` };

  const baseItem = {
    id: itemId,
    type: "result",
    title: "hosted acceptance payment journey",
    state,
    status: "packet_ready",
    resultCode: "packet_ready",
    createdAt: new Date().toISOString(),
    summary: "hosted acceptance payment journey",
    nextSteps: [],
    paymentAllowed: true,
    packetReady: true,
    pathwayLabel: pathway.pathwayLabel,
    packetType: "custom_pleading",
    artifactRefs: {}
  };
  const model = packetInformationModelFor(baseItem);
  if (!model) return { failure: `${state}: no packet-information model for ${pathway.pathwayLabel}` };

  const packetAnswers = { ...answers };
  for (const question of model.questions) {
    if (!(question.id in packetAnswers)) packetAnswers[question.id] = answerForQuestion(question, question.id);
  }
  const stamp = new Date().toISOString();
  const commercialFlow = {
    version: 1,
    entitlementSource: "consumer_payment",
    productId: "expungement_packet",
    screening: {
      profileVersion: profile.profileVersion,
      pathwayId: model.pathwayId,
      pathwayLabel: model.pathwayLabel,
      resultCode: "packet_ready",
      paymentAllowed: true,
      packetType: "custom_pleading",
      packetPlan: model.packetPlan,
      answers
    },
    packetInformation: {
      stage: "ready_to_generate",
      requiredInputIds: model.requiredInputIds,
      serverFacts: { jurisdiction: state, pathway_id: model.pathwayId },
      prefilledAnswers: {},
      answers: packetAnswers,
      missingInputIds: [],
      updatedAt: stamp,
      reviewedAt: stamp
    }
  };

  const reviewedItem = { ...baseItem, artifactRefs: { commercialFlow } };
  const reviewedModel = packetInformationModelFor(reviewedItem);
  const safety = packetInformationReviewSafety(reviewedItem);
  const complete = reviewedModel
    && reviewedModel.stage === "ready_to_generate"
    && reviewedModel.missingInputIds.length === 0
    && Boolean(reviewedModel.reviewedAt)
    && safety.safe;
  if (!complete) {
    return {
      failure: `${state}: stage=${reviewedModel?.stage ?? "(none)"}, missing=${JSON.stringify(reviewedModel?.missingInputIds ?? null)}, reviewedAt=${reviewedModel?.reviewedAt ?? "null"}, safety=${safety.reason}`
    };
  }
  return { state, pathway, commercialFlow, model: reviewedModel, safety, questionCount: model.questions.length };
}

// The route the registry offered is tried first; the remaining priority states
// follow. A state whose waiting rule the evaluator cannot execute is reported
// by name rather than silently skipped — that is a finding about the corpus.
let reviewed = null;
{
  const attempts = [];
  const candidates = [route.state, ...["MS", "IL", "PA"].filter((code) => code !== route.state)];
  for (const state of candidates) {
    const settled = convergeSellableScreening(state);
    if (!settled || settled.failure) { attempts.push(`${state}: ${settled?.failure ?? "no profile"}`); continue; }
    const built = buildReviewedFlow(settled);
    if (built.failure) { attempts.push(built.failure); continue; }
    reviewed = built;
    break;
  }
  record(
    "seeded_item_carries_reviewed_packet_information",
    Boolean(reviewed),
    reviewed
      ? `${reviewed.state} / ${reviewed.pathway.pathwayLabel} — the evaluator itself returns a sellable route, all ${reviewed.model.requiredInputIds.length} required inputs are answered across ${reviewed.questionCount} questions, reviewedAt is set and review safety is ${reviewed.safety.reason}`
      : `no jurisdiction produced a reviewed, sellable matter — ${attempts.join(" | ")}`
  );
  if (!reviewed) finish();
  evidence.reviewedPacketInformation = {
    state: reviewed.state,
    pathwayId: reviewed.model.pathwayId,
    pathwayLabel: reviewed.model.pathwayLabel,
    profileVersion: reviewed.commercialFlow.screening.profileVersion,
    requiredInputIds: reviewed.model.requiredInputIds,
    reviewSafety: reviewed.safety.reason,
    attempts
  };
  // The seeded row must describe the route that was proven sellable, not the
  // one the render-spec scan happened to reach first.
  route = { state: reviewed.state, pathwayLabel: reviewed.pathway.pathwayLabel, pathwayId: reviewed.model.pathwayId };
  evidence.route = route;
}
// --- 2c. Derive every route-specific value from the authorities ---------------
//
// packet_type was previously hardcoded to 'official_pdf_overlay' because the
// phase-26 CHECK constraint accepted it. That is not a derivation, it is a
// value that happened to be legal, and it was WRONG: eligibility-adapter maps
// result_code to packet_type, and packet_ready maps to 'custom_pleading'. The
// resolver independently classifies PA / Path A as routeKind legacy_verified
// with rendererKind packet_document_v1 — it is not an official-PDF overlay at
// all. Deriving instead of guessing is what surfaced that.
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
  const resultCode = "packet_ready";
  // eligibility-adapter's packetTypeForResult: guidance_only -> guidance_packet,
  // packet_ready / packet_ready_with_caution -> custom_pleading.
  const packetType = resultCode === "guidance_only" ? "guidance_packet" : "custom_pleading";
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

// --- 3. Seed the participant's item, unpaid ----------------------------------
//
// The authoritative route this run will sell, hoisted so the pre-charge image
// preflight below can name the exact tuple the render job will carry.
let preflightRoute = null;
const seedResult = await sql(`
  insert into public.consumer_briefcase_items
    (id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
     status, summary_json, artifact_refs_json, payment_status, payment_allowed)
  values ('${itemId}', '${A.id}', 'result', '${route.state}', '${sqlText(route.pathwayLabel)}',
          '${derived.resultCode}', '${derived.packetType}',
          'packet_ready', '{"text":"hosted acceptance payment journey"}'::jsonb,
          '${sqlText(JSON.stringify({ commercialFlow: reviewed.commercialFlow }))}'::jsonb, 'unpaid', true)
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
  preflightRoute = derived;
}

// --- 3b. What the published image will accept, BEFORE anything is charged ----
//
// Run 32393413747 spent a real Stripe Sandbox Checkout, a signed webhook and a
// durable render job before discovering anything about whether the pinned
// worker would accept the tuple it was about to be handed — and then blamed a
// profile version the image demonstrably admits. Money and durable rows are
// spent last here, not first.
//
// Everything asserted below is knowable before a charge:
//
//   * the pathway is authoritative and sellable (the resolver already said so);
//   * it depends on no problematic PDF, so no held binary can fail the render;
//   * the tuple the job will carry is known exactly;
//   * the PUBLISHED IMAGE, executing its own shipped modules by digest with no
//     bind mount and no host path, admits that exact tuple;
//   * the digest actually pulled is the digest this run pins;
//   * and the queue depth the target will have to get through is recorded, so
//     a later "the worker never reached it" is a measurement rather than a
//     surprise.
{
  const tuple = { profileId: preflightRoute.profileId, profileVersion: preflightRoute.profileVersion };
  const digestPinned = /@sha256:[0-9a-f]{64}$/.test(WORKER_DIGEST_REF);

  // No problematic-PDF dependency. The register is the authority; a route that
  // composes its own document (sourceSha256 null) depends on no binary at all,
  // and a route that names one must not name a held one.
  const registerCsv = fs.existsSync(path.join(rootDir, "docs/record-clearing/problematic-pdf-register.csv"))
    ? fs.readFileSync(path.join(rootDir, "docs/record-clearing/problematic-pdf-register.csv"), "utf8")
    : "";
  const registerLines = registerCsv.split("\n").slice(1).filter((line) => line.trim() !== "");
  const heldShas = new Set(registerLines.map((line) => line.split(",")[3]).filter(Boolean));
  const heldForJurisdiction = registerLines.filter((line) => line.split(",")[0] === preflightRoute.profileId).length;
  const dependsOnHeldPdf = typeof preflightRoute.sourceSha256 === "string" && heldShas.has(preflightRoute.sourceSha256);

  // The image's own registry and contract, through the image's own loader.
  // `docker run <digest> node -e` executes the shipped bytes; there is no mount
  // and no host path, so this cannot accidentally measure the checkout instead.
  const probeSource = `
import { register } from "node:module";
register("./scripts/lib/ts-esm-loader.mjs", "file:///app/");
const { getAllJurisdictionProfiles } = await import("/app/src/lib/rcap-engine/profile-registry.ts");
const { assertClaimAcceptable, RenderContractError } = await import("/app/src/lib/rcap/render/job-contract.ts");
const profiles = getAllJurisdictionProfiles();
const versions = [...new Set(profiles.map((p) => String(p.profileVersion)))].sort();
const tuple = ${JSON.stringify(tuple)};
let claim = { attempted: false };
try {
  assertClaimAcceptable(
    { id: "00000000-0000-4000-8000-000000000000", rendererKind: ${JSON.stringify(preflightRoute.rendererKind)},
      sourceSha256: ${JSON.stringify(preflightRoute.sourceSha256 ?? null)},
      profileVersion: tuple.profileVersion, fencingToken: "preflight" },
    { knownJobIds: new Set(["00000000-0000-4000-8000-000000000000"]), allowedSourceShas: new Set(),
      knownProfileVersions: new Set(versions), supportedRendererKinds: new Set([${JSON.stringify(preflightRoute.rendererKind)}]) }
  );
  claim = { attempted: true, accepted: true, errorCode: null };
} catch (error) {
  claim = { attempted: true, accepted: false,
    errorCode: error instanceof RenderContractError ? error.errorCode : "non_contract_error" };
}
console.log("PREFLIGHT_JSON " + JSON.stringify({
  profilesLoaded: profiles.length,
  distinctProfileVersions: versions.length,
  admitsProfileVersion: versions.includes(tuple.profileVersion),
  claim,
  cwd: process.cwd()
}));
`;
  const probeRun = spawnSync("docker", [
    "run", "--rm", "--entrypoint", "node", WORKER_DIGEST_REF, "--input-type=module", "-e", probeSource
  ], { encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  const probeLine = String(probeRun.stdout ?? "").split("\n").find((l) => l.startsWith("PREFLIGHT_JSON "));
  let probe = null;
  try { probe = probeLine ? JSON.parse(probeLine.slice("PREFLIGHT_JSON ".length)) : null; } catch { probe = null; }

  const repoDigests = spawnSync("docker", ["image", "inspect", "--format", "{{join .RepoDigests \"\\n\"}}", WORKER_DIGEST_REF], { encoding: "utf8" });
  const pulledDigests = (repoDigests.stdout ?? "").trim().split("\n").filter(Boolean);
  const pinnedDigest = WORKER_DIGEST_REF.split("@")[1] ?? "";
  const digestMatches = pulledDigests.some((d) => d.endsWith(`@${pinnedDigest}`));

  // The queue the target will have to get through, measured before it exists.
  const backlog = await readClaimOrder(null, preflightRoute.rendererKind);

  const imageAdmits = Boolean(probe) && probe.claim?.attempted === true && probe.claim.accepted === true && probe.admitsProfileVersion === true;
  const passed = preflightRoute.routeKind === "legacy_verified"
    && preflightRoute.sellable === true
    && dependsOnHeldPdf === false
    && digestPinned
    && digestMatches
    && imageAdmits
    && backlog.readOutcome === "read";
  record(
    "immutable_image_admits_the_tuple_before_any_charge",
    passed,
    `pathway ${JSON.stringify(preflightRoute.routeId)} is ${preflightRoute.routeKind} and sellable=${preflightRoute.sellable}; sourceSha256=${JSON.stringify(preflightRoute.sourceSha256)} and the problematic-PDF register holds ${heldShas.size} source hash(es) across ${registerLines.length} row(s), ${heldForJurisdiction} of them for ${preflightRoute.profileId} — this route depends on a held binary: ${dependsOnHeldPdf}. The tuple the job will carry is ${tuple.profileId}@${tuple.profileVersion}. ${WORKER_DIGEST_REF} was pulled by immutable digest (${digestPinned}) and the digest actually present matches the pin (${digestMatches}; ${pulledDigests.join(" ") || "no repo digest reported"}). Executing the image's OWN shipped modules by digest — no bind mount, no host path — it loaded ${probe?.profilesLoaded ?? "(probe produced no verdict)"} profile(s) across ${probe?.distinctProfileVersions ?? "?"} distinct version(s) from cwd ${probe?.cwd ?? "?"}, admits that profile version (${probe?.admitsProfileVersion ?? "unknown"}) and assertClaimAcceptable ${probe?.claim?.attempted ? (probe.claim.accepted ? "ACCEPTED it" : `refused it at ${probe.claim.errorCode}`) : "was never reached"}. The claimable queue for renderer ${preflightRoute.rendererKind} currently holds ${backlog.readOutcome === "read" ? `${backlog.currentlyClaimable} job(s) (${backlog.totalQueued} queued in total)` : `an unreadable count (${backlog.detail ?? "no detail"})`}, so the target this run enqueues will start behind ${backlog.readOutcome === "read" ? backlog.currentlyClaimable : "an unknown number of"} claimable predecessor(s). Nothing has been charged at this point.`
  );
  evidence.imagePreflight = {
    tuple,
    routeKind: preflightRoute.routeKind,
    sellable: preflightRoute.sellable,
    sourceSha256: preflightRoute.sourceSha256 ?? null,
    problematicPdfRegisterRows: registerLines.length,
    dependsOnHeldPdf,
    digestPinned,
    digestMatches,
    pulledDigests,
    probe,
    probeStderrTail: probe ? null : redactSecrets(`${probeRun.stdout ?? ""}${probeRun.stderr ?? ""}`).slice(-1200),
    backlogBeforeEnqueue: backlog
  };
  if (!passed) finish();
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
  // The route answers with checkoutSessionId. Reading only sessionId/id meant
  // that a perfectly successful 200 produced a null id, no Stripe fetch, and a
  // FAIL whose own diagnostic then reported "Stripe holds session cs_test_…
  // for this exact briefcase item" — the harness proving, in its failure text,
  // that the thing it had just called missing did exist.
  const sessionId = res.json?.checkoutSessionId ?? res.json?.sessionId ?? res.json?.id ?? null;
  let fetched = null;
  if (sessionId) {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
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
        ? `YES — Stripe holds session ${mine.id} for this exact briefcase item (amount_total=${mine.amount_total} ${mine.currency}, payment_status=${mine.payment_status}). The application created it and then failed AFTER the create, so the ${res.status} is not Stripe refusing the request.`
        : "no — Stripe holds no session carrying this briefcase item as client_reference_id, so the create itself did not succeed";
    } catch (error) {
      sessionCreatedBeforeFailure = `could not ask Stripe: ${error.message}`;
    }
  }

  let stripeDirect = "not attempted";
  if (!session) {
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", "https://example.com/success");
    form.set("cancel_url", "https://example.com/cancel");
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(consumerPacketPriceCents ?? 5000));
    form.set("line_items[0][price_data][product_data][name]", "hosted acceptance direct control");
    try {
      const direct = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString()
      });
      const body = await direct.json().catch(() => null);
      stripeDirect = direct.status === 200
        ? `the SAME sk_test_ key created session ${body?.id} directly, so the key and account transact and the fault is in what the application sent`
        : `Stripe refused the same key directly: ${direct.status} ${body?.error?.type ?? ""} ${body?.error?.message ?? ""}`;
    } catch (error) {
      stripeDirect = `direct Stripe call failed: ${error.message}`;
    }
  }

  record(
    "checkout_session_created_against_stripe_sandbox",
    Boolean(session),
    session
      ? `the deployed application created Stripe session ${session.id} (amount_total=${session.amount_total} ${session.currency}, channel=${session.metadata?.channel ?? "(none)"}), read back from Stripe rather than from the response body`
      : `checkout returned ${res.status}: ${String(res.text).slice(0, 160)} | SESSION CREATED BEFORE FAILURE? ${sessionCreatedBeforeFailure} | DIRECT STRIPE CONTROL: ${stripeDirect}`
  );
  evidence.stripeDirectControl = stripeDirect;
  evidence.sessionCreatedBeforeFailure = sessionCreatedBeforeFailure;
  if (!session) finish();
  evidence.checkout = { sessionId: session.id, amountTotal: session.amount_total, currency: session.currency, expectedCents: consumerPacketPriceCents ?? null };
  runNamespace.checkoutSessionId = session.id;
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
runNamespace.providerEventId = completionEvent.id;

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
//
// THE TARGET IS MINTED HERE, AND ONLY HERE. The job id in this 202 is the one
// row this run is entitled to make statements about, and it is the only value
// in this file permitted to name the target.
//
// Nothing below may infer the target from a worker cycle. The claim function is
// unscoped to the run — it hands out the oldest currently-claimable job in the
// whole acceptance project — so "the job the next cycle touched" is routinely
// some other run's abandoned work. Inferring the target that way is exactly how
// run 32393413747 attributed a backlog job's `profile_version_unknown` to this
// pathway, against a profile version the published image demonstrably admits.
let targetJobId = null;
{
  const res = await callApp("/api/expungement-ai/packet/render", { method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId } });
  const returnedJobId = typeof res.json?.jobId === "string" && res.json.jobId.trim() !== "" ? res.json.jobId.trim() : null;
  // A 202 that names no job is not a queued render: there would be nothing to
  // follow, and the journey below would have to guess. It does not guess.
  record(
    "paid_render_is_queued",
    res.status === 202 && returnedJobId !== null,
    `POST /api/expungement-ai/packet/render for the same item after payment = ${res.status} (must be 202), jobId=${returnedJobId ?? "(none)"} — the identical request that was 402 moments ago. This job id is THE TARGET for the rest of this run; every worker cycle below is classified against it and no other row may satisfy a target case.`
  );
  evidence.render = { status: res.status, jobId: returnedJobId };
  if (res.status !== 202 || returnedJobId === null) finish();
  targetJobId = returnedJobId;
  runNamespace.renderJobId = targetJobId;
}

// --- 8. The pinned worker, by digest, against the hosted project -------------
//
// Two things this step used to get wrong, and does not any more.
//
// The verdict. `exit 0 and the job is not 'failed'` reported a delivery success
// for a job still sitting in 'claimed' with no artifact path and nothing in
// storage. A worker process exit code is the exit code of one claim-to-finalize
// cycle, not a statement about delivery: runWorkerCycle returns
// {outcome:"failed", errorCode:"job_not_claimable"} and exits 0 when a single
// RPC declines, and every non-terminal state is now a failure here.
//
// The diagnostics. stdout and stderr were concatenated and cut to the last 260
// characters. docker writes pull progress to stderr, so what survived was one
// character of pull output and none of the worker's own JSON cycle result — the
// single line that names the boundary it stopped at was produced and then
// thrown away. Both streams are now captured separately, in full, per cycle,
// and written to the evidence directory that CI uploads.
//
// And the worker is run to a CONCLUSION rather than once. A claim lease is 600
// seconds by default, so one shot followed by an immediate read cannot tell a
// broken worker from a superseded claim; the lease is shortened here through
// the worker's own documented environment contract and the cycle is repeated
// until the job is terminal or the budget runs out.
async function serviceRoleKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  });
  const list = await res.json().catch(() => []);
  return Array.isArray(list) ? list.find((k) => k.name === "service_role")?.api_key ?? "" : "";
}

const TERMINAL_SUCCESS = new Set(["artifact_validated", "delivered"]);
// Everything a delivery may NOT be sitting in. In flight, failed, and the
// dispositions a failed job can carry — none of these is a delivered packet,
// and the previous verdict treated the absence of 'failed' as success.
const NON_TERMINAL = new Set(["queued", "claimed", "rendering", "validating", "failed", "retryable", "expired"]);
// Passed explicitly rather than inherited. resolveClaimSeconds() defaults to
// 600, which is longer than this whole job step: a claim that goes stale can
// then never be released inside the run, so one declined RPC and a genuine
// worker defect look identical. Long enough for a real render and upload,
// short enough that the queue's own recovery is observable here.
const WORKER_CLAIM_SECONDS = 120;

/**
 * Every column of the job the diagnosis needs, in one read.
 *
 * The fencing token is fetched raw and hashed HERE, in Node, rather than in
 * SQL. The previous version called extensions.digest(...) through the
 * Management API; that call is not available on the acceptance project, so the
 * whole query errored, readJob returned null, and run 32195867963 reported a
 * job that plainly existed as "(no job row)". A query failure and a missing row
 * are different facts and are now reported as different facts — silence about
 * which one happened is how a broken diagnostic passes for a finding.
 *
 * The raw token never leaves this function: it is hashed immediately, the
 * fingerprint replaces it on the returned object, and the local binding goes
 * out of scope. Nothing printed or written carries it.
 *
 * Read by EXACT JOB IDENTITY, never by briefcase item. Two rows can carry this
 * run's item: the paid render enqueues one, and a webhook replay that lands on
 * the recovery path enqueues another. `order by created_at desc limit 1` would
 * then silently switch which row the artifact, delivery and replay cases were
 * talking about, halfway through the run. The target is the id the 202 named.
 */
async function readJob(jobId = targetJobId) {
  const res = await sql(`
    select id, status, attempt_count, max_attempts, claimed_by, claim_expires_at,
           fencing_token, next_attempt_at,
           error_code, failure_disposition,
           left(coalesce(last_error_detail, ''), 1000) as last_error_detail,
           renderer_kind, renderer_version, route_id, source_sha256,
           profile_id, profile_version, person_id, matter_id, partner_id,
           consumer_briefcase_item_id, consumer_auth_user_id,
           output_storage_path, output_sha256, normalized_output_sha256,
           output_byte_count, page_count, container_digest,
           delivery_eligibility, accounting_result,
           created_at, claimed_at, rendering_at, validating_at, artifact_validated_at
      from public.packet_render_jobs
     where id = '${sqlText(jobId)}'
  `);

  // The Management API answers a failed query with a non-array body carrying a
  // message. Reading that as "no rows" is the defect being closed.
  if (!Array.isArray(res.json)) {
    const detail = typeof res.json?.message === "string" ? res.json.message
      : typeof res.json?.error === "string" ? res.json.error
      : JSON.stringify(res.json ?? null);
    return {
      readOutcome: "query_error",
      readErrorClass: res.json?.code ?? `http_${res.status}`,
      readErrorMessage: redactSecrets(String(detail)).slice(0, 400)
    };
  }
  const row = res.json[0] ?? null;
  if (!row) return { readOutcome: "no_row" };

  const rawToken = row.fencing_token;
  delete row.fencing_token;
  const tokenPresent = typeof rawToken === "string" && rawToken.trim() !== "";
  return {
    ...row,
    readOutcome: "row",
    fencingTokenOutcome: tokenPresent ? "hashed" : "absent",
    // A deterministic fingerprint of the claim, never the claim itself.
    fencingTokenSha256: tokenPresent
      ? crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")
      : null
  };
}

/** The job row when the read actually returned one, and null otherwise. */
const jobRowOrNull = (read) => (read && read.readOutcome === "row" ? read : null);

/**
 * Every secret this run holds, by value, plus the shapes they take. A database
 * error message can quote the connection it failed on, so the diagnostic path
 * is redacted the same way the worker's output is.
 */
function redactSecrets(text) {
  let out = String(text ?? "");
  for (const secret of [SUPABASE_ACCESS_TOKEN, VERCEL_TOKEN, BYPASS, STRIPE_KEY, WEBHOOK_SECRET, ANON_KEY]) {
    if (typeof secret === "string" && secret.length >= 8) out = out.split(secret).join("***REDACTED***");
  }
  return out
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***")
    .replace(/sk_(test|live)_[A-Za-z0-9]{10,}/g, "***REDACTED***")
    .replace(/whsec_[A-Za-z0-9]{10,}/g, "***REDACTED***");
}
const redact = (text) => redactSecrets(text);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The worker's --once mode prints exactly one line: JSON.stringify of the cycle
 * result. That single object names the boundary the cycle stopped at — idle,
 * job_not_claimable, a validation error code, render_failed, or finalized with
 * its accounting result — and it is the decisive diagnostic. It is parsed here,
 * out of stdout ONLY, so nothing docker writes to stderr can obscure it.
 */
function parseCycleResult(stdout) {
  const lines = String(stdout ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].startsWith("{")) continue;
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed && typeof parsed.outcome === "string") return parsed;
    } catch { /* not the cycle result */ }
  }
  return null;
}

/** The boundary a cycle result names, in the vocabulary the worker itself uses. */
function cycleBoundary(result) {
  if (!result) return "no cycle result was emitted";
  if (result.outcome === "idle") return "no job — the worker claimed nothing";
  if (result.outcome === "finalized") return `finalized (accounting=${result.accountingResult}, delivery=${result.deliveryEligibility})`;
  if (result.outcome === "failed") return `failed at ${result.errorCode} (disposition=${result.disposition ?? "none recorded"})`;
  return `unrecognised outcome ${result.outcome}`;
}

// --- the queue the claim function will actually walk --------------------------
//
// This mirrors `claim_packet_render_job` (phase 50) EXACTLY:
//
//   where status = 'queued'
//     and (next_attempt_at is null or next_attempt_at <= now())
//     and renderer_kind = any (...)
//   order by created_at
//   for update skip locked
//   limit 1
//
// `queued` and `currently claimable` are different sets. A retryable job whose
// next_attempt_at is in the future is queued and cannot be claimed; counting it
// as a predecessor over-states the backlog, and omitting the predicate
// altogether under-states it. Either error names the wrong row as the one
// standing in front of the target, so the predicate is reproduced rather than
// approximated.
// A declaration rather than a const arrow: readClaimOrder is called by the
// pre-charge preflight, which runs earlier in the file than this line, and a
// const would still be in its temporal dead zone there.
function claimablePredicate(rendererKind) {
  return `
       status = 'queued'
       and (next_attempt_at is null or next_attempt_at <= now())
       ${rendererKind ? `and renderer_kind = '${sqlText(rendererKind)}'` : ""}`;
}

/** Where the target sits in claim order, and exactly what stands ahead of it. */
async function readClaimOrder(jobId, rendererKind) {
  const res = await sql(`
    select id, status, attempt_count, max_attempts, next_attempt_at, created_at,
           renderer_kind, profile_id, profile_version, consumer_briefcase_item_id,
           left(coalesce(error_code, ''), 80) as error_code
      from public.packet_render_jobs
     where ${claimablePredicate(rendererKind)}
     order by created_at
     limit 200
  `);
  const queued = await sql(`select count(*)::int as n from public.packet_render_jobs where status = 'queued'`);
  if (!Array.isArray(res.json)) {
    return {
      readOutcome: "query_error",
      detail: redactSecrets(typeof res.json?.message === "string" ? res.json.message : String(res.text ?? "")).slice(0, 300)
    };
  }
  const rows = res.json;
  const rank = rows.findIndex((r) => r.id === jobId);
  const predecessors = rank >= 0 ? rows.slice(0, rank) : rows;
  return {
    readOutcome: "read",
    predicateMirrorsLiveClaimFunction: true,
    rendererKindFilter: rendererKind ?? null,
    totalQueued: Array.isArray(queued.json) ? (queued.json[0]?.n ?? null) : null,
    currentlyClaimable: rows.length,
    targetIsClaimable: rank >= 0,
    targetClaimRank: rank >= 0 ? rank + 1 : null,
    claimablePredecessors: predecessors.length,
    predictedFirstClaim: rows[0]?.id ?? null,
    predictedFirstClaimIsTarget: Boolean(rows[0]) && rows[0].id === jobId,
    distinctPredecessorProfileVersions: [...new Set(predecessors.map((r) => r.profile_version))].sort(),
    predecessors: predecessors.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      attemptCount: r.attempt_count,
      maxAttempts: r.max_attempts,
      nextAttemptAt: r.next_attempt_at,
      rendererKind: r.renderer_kind,
      profileId: r.profile_id,
      profileVersion: r.profile_version,
      errorCode: r.error_code || null,
      belongsToThisRunNamespace: r.consumer_briefcase_item_id === itemId
    }))
  };
}

/**
 * The next instant the QUEUE ITSELF is waiting on: the earliest future
 * next_attempt_at among queued work, and the target's own lease expiry when it
 * is sitting claimed. Sleeping to a canonical instant is the difference between
 * waiting for the queue to become claimable and hammering it on a guess.
 */
async function canonicalWakeInstant(jobId, rendererKind) {
  const res = await sql(`
    select
      (select min(next_attempt_at) from public.packet_render_jobs
        where status = 'queued' and next_attempt_at is not null and next_attempt_at > now()
          ${rendererKind ? `and renderer_kind = '${sqlText(rendererKind)}'` : ""}) as queue_next_attempt_at,
      (select claim_expires_at from public.packet_render_jobs where id = '${sqlText(jobId)}') as target_claim_expires_at,
      (select next_attempt_at from public.packet_render_jobs where id = '${sqlText(jobId)}') as target_next_attempt_at,
      now() as server_now
  `);
  const row = Array.isArray(res.json) ? res.json[0] ?? null : null;
  if (!row) return { source: "unreadable", at: null };
  const candidates = [
    ["the target's own retry backoff", row.target_next_attempt_at],
    ["the target's claim lease expiry", row.target_claim_expires_at],
    ["the earliest future retry in the claimable queue", row.queue_next_attempt_at]
  ].filter(([, value]) => value && Number.isFinite(Date.parse(value)));
  if (candidates.length === 0) return { source: "nothing in the queue is waiting on a clock", at: null };
  candidates.sort((left, right) => Date.parse(left[1]) - Date.parse(right[1]));
  return { source: candidates[0][0], at: candidates[0][1], serverNow: row.server_now ?? null };
}

// The mutable claim state of every job, used to say WHICH row a cycle touched
// when the worker's own account cannot. The fencing token is hashed here, in
// Node — extensions.digest is not available on the acceptance project — and the
// raw value never leaves this function.
const CLAIM_STATE_FIELDS = [
  "status", "attempt_count", "claimed_by", "claimed_at", "claim_expires_at",
  "next_attempt_at", "error_code", "failure_disposition",
  "rendering_at", "validating_at", "artifact_validated_at", "fencingTokenSha256"
];

async function claimStateSnapshot() {
  const res = await sql(`
    select id, status, attempt_count, claimed_by, claimed_at, claim_expires_at,
           fencing_token, next_attempt_at, error_code, failure_disposition,
           rendering_at, validating_at, artifact_validated_at
      from public.packet_render_jobs
     order by created_at
     limit 500
  `);
  if (!Array.isArray(res.json)) return { readOutcome: "query_error" };
  const byId = new Map();
  for (const row of res.json) {
    const rawToken = row.fencing_token;
    delete row.fencing_token;
    byId.set(row.id, {
      ...row,
      fencingTokenSha256: typeof rawToken === "string" && rawToken.trim() !== ""
        ? crypto.createHash("sha256").update(rawToken, "utf8").digest("hex")
        : null
    });
  }
  return { readOutcome: "read", byId };
}

/** Every job whose claim state moved across a cycle, or null if unreadable. */
function rowsThatChanged(before, after) {
  if (before?.readOutcome !== "read" || after?.readOutcome !== "read") return null;
  const changed = new Set();
  for (const [id, now] of after.byId) {
    const then = before.byId.get(id);
    if (!then) { changed.add(id); continue; }
    if (CLAIM_STATE_FIELDS.some((field) => String(then[field] ?? "") !== String(now[field] ?? ""))) changed.add(id);
  }
  for (const id of before.byId.keys()) if (!after.byId.has(id)) changed.add(id);
  return [...changed];
}

/**
 * Which job this cycle actually claimed, and therefore what the cycle is
 * allowed to mean.
 *
 * The published image's cycle result carries `jobId` on every outcome that
 * claimed anything — `idle` is the only shape without one, and it is without
 * one because nothing was claimed. So stdout is the primary source and no
 * worker change is needed to obtain it; the row-state diff is the corroborating
 * fallback for a cycle that emitted nothing parsable.
 *
 * Identity is MANDATORY. An unattributable cycle is not evidence about the
 * target in either direction, and is never allowed to become one by default.
 */
function classifyCycle(cycleResult, changedRows, jobId) {
  const fromStdout = typeof cycleResult?.jobId === "string" && cycleResult.jobId.trim() !== ""
    ? cycleResult.jobId.trim() : null;
  if (fromStdout) {
    return {
      claimedJobId: fromStdout,
      identitySource: "the worker's own cycle result on stdout named the claimed job",
      classification: fromStdout === jobId ? "target_cycle" : "backlog_cycle"
    };
  }
  if (changedRows === null) {
    return {
      claimedJobId: null,
      identitySource: cycleResult?.outcome === "idle"
        ? "the cycle result reported idle, but the corroborating row snapshot could not be read"
        : "no cycle result named a job and the corroborating row snapshot could not be read",
      classification: "claimed_identity_unproven"
    };
  }
  if (changedRows.length === 0) {
    return {
      claimedJobId: null,
      identitySource: cycleResult?.outcome === "idle"
        ? "the cycle result reported idle and no job row's claim state moved — the two agree"
        : "no cycle result named a job and no job row's claim state moved",
      classification: "no_job"
    };
  }
  if (changedRows.length === 1) {
    return {
      claimedJobId: changedRows[0],
      identitySource: "exactly one job row's claim state moved across this cycle",
      classification: changedRows[0] === jobId ? "target_cycle" : "backlog_cycle"
    };
  }
  return {
    claimedJobId: null,
    identitySource: `${changedRows.length} job rows moved across this cycle (${changedRows.slice(0, 5).join(", ")}), so no single row can be attributed to it`,
    classification: "claimed_identity_unproven"
  };
}

let finalJob = null;
let finalJobRead = null;
let finalCycleResult = null;
{
  const service = await serviceRoleKey();
  const containerName = `rcap-acceptance-worker-${itemId.slice(0, 8)}`;
  const command = [
    "run", "--rm", "--name", containerName,
    "-e", "NEXT_PUBLIC_SUPABASE_URL=<acceptance project url>",
    "-e", "SUPABASE_URL=<acceptance project url>",
    "-e", "SUPABASE_SERVICE_ROLE_KEY=<redacted>",
    "-e", `RCAP_WORKER_CLAIM_SECONDS=${WORKER_CLAIM_SECONDS}`,
    "-e", `RCAP_WORKER_CONTAINER_DIGEST=${WORKER_DIGEST_REF.split("@")[1] ?? WORKER_DIGEST_REF}`,
    WORKER_DIGEST_REF, "node", "scripts/rcap-render-worker.mjs", "--once"
  ];
  const imageId = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}}", WORKER_DIGEST_REF], { encoding: "utf8" });

  const diagnostics = {
    image: WORKER_DIGEST_REF,
    immutableDigest: WORKER_DIGEST_REF.split("@")[1] ?? null,
    localImageId: (imageId.stdout ?? "").trim() || null,
    containerName,
    // The sanitized command. The real invocation carries the same flags with
    // the acceptance URL and the service key in place of the placeholders.
    command: `docker ${command.join(" ")}`,
    claimSeconds: WORKER_CLAIM_SECONDS,
    cycles: []
  };

  // --- the derived bound, and the budget it is spent against ------------------
  //
  // Four cycles was a guess, and it was the wrong guess: run 32393413747 spent
  // all four on a shared project backlog and never reached its own job. The
  // bound is DERIVED from what actually stands in front of the target, so a
  // deeper backlog gets more cycles and an empty one gets no wasted work.
  //
  //   cycleBound = claimable predecessors + 1 target cycle + churn allowance
  //
  // The allowance covers work that becomes claimable mid-journey (a retryable
  // job whose backoff elapses while the run is in progress). It is small,
  // explicit and a CEILING: the bound is recomputed after every cycle from the
  // backlog that remains, and may tighten, but a bound that follows a growing
  // queue upward without limit is not a bound.
  const QUEUE_CHURN_ALLOWANCE = 2;
  const WAIT_BUDGET_MS = 8 * 60 * 1000;
  const MAX_SINGLE_WAIT_MS = 90_000;
  const MIN_SINGLE_WAIT_MS = 3_000;

  /**
   * Drive the pinned worker until it claims THIS run's target job, or until a
   * derived bound or an explicit wait budget says it never will.
   *
   * Every cycle is classified before it is permitted to mean anything. A
   * backlog cycle may not satisfy the target verdict, may not fail it, and may
   * not supply artifact, delivery or replay evidence — it is progress through
   * other runs' work and is reported as exactly that.
   */
  async function runTargetWorkerJourney(jobId) {
    const journey = {
      targetJobId: jobId,
      targetJobIdSource: "the jobId returned by the paid render request (HTTP 202)",
      queueChurnAllowance: QUEUE_CHURN_ALLOWANCE,
      waitBudgetMs: WAIT_BUDGET_MS,
      waitedMs: 0,
      cyclesRun: 0,
      backlogCycles: 0,
      targetCycles: 0,
      noJobCycles: 0,
      unprovenCycles: 0,
      backlogJobsClaimed: [],
      failure: null,
      targetCycleResult: null,
      targetRowFinal: null,
      targetReadFinal: null
    };

    const initialTargetRead = await readJob(jobId);
    const initialTargetRow = jobRowOrNull(initialTargetRead);
    journey.initialTargetRead = initialTargetRead;
    journey.rendererKind = initialTargetRow?.renderer_kind ?? null;
    journey.targetProfileTuple = initialTargetRow
      ? `${initialTargetRow.profile_id}@${initialTargetRow.profile_version}`
      : null;
    journey.targetReadFinal = initialTargetRead;
    journey.targetRowFinal = initialTargetRow;

    const initialOrder = await readClaimOrder(jobId, journey.rendererKind);
    journey.initialClaimOrder = initialOrder;
    if (initialOrder.readOutcome !== "read") {
      journey.failure = {
        code: "acceptance_target_claim_identity_unproven",
        detail: `the claim order could not be read (${initialOrder.detail ?? "no detail"}), so the number of claimable predecessors standing in front of the target is unknown and no cycle bound can be derived from it`
      };
      return journey;
    }
    const initialClaimablePredecessors = initialOrder.claimablePredecessors;
    journey.initialClaimablePredecessors = initialClaimablePredecessors;
    journey.targetClaimRank = initialOrder.targetClaimRank;
    const boundCeiling = initialClaimablePredecessors + 1 + QUEUE_CHURN_ALLOWANCE;
    journey.cycleBoundCeiling = boundCeiling;
    let cycleBound = boundCeiling;
    journey.cycleBoundHistory = [];

    console.log(`  target ${jobId} is rank ${initialOrder.targetClaimRank ?? "(not claimable)"} of ${initialOrder.currentlyClaimable} currently-claimable job(s) (${initialOrder.totalQueued ?? "?"} queued in total); ${initialClaimablePredecessors} claimable predecessor(s); cycle bound ${cycleBound} = ${initialClaimablePredecessors} + 1 + ${QUEUE_CHURN_ALLOWANCE}`);

    let cycle = 0;
    while (cycle < cycleBound) {
      cycle += 1;
      journey.cyclesRun = cycle;
      const outcome = await runOneCycle(cycle, jobId, journey);
      if (outcome === "stop") break;

      const order = await readClaimOrder(jobId, journey.rendererKind);
      journey.cycleBoundHistory.push({
        afterCycle: cycle,
        claimablePredecessors: order.readOutcome === "read" ? order.claimablePredecessors : null,
        targetClaimRank: order.readOutcome === "read" ? order.targetClaimRank : null
      });
      if (order.readOutcome === "read" && order.targetIsClaimable) {
        // Recomputed from what remains, never above the declared ceiling.
        cycleBound = Math.min(boundCeiling, Math.max(cycle + 1, cycle + order.claimablePredecessors + 1));
      }
      if (cycle >= cycleBound) break;

      // Sleep only to an instant the queue itself is waiting on, and only
      // inside the declared budget. A fixed poll interval would burn the
      // budget on a queue that is not going to change for another minute.
      const wake = await canonicalWakeInstant(jobId, journey.rendererKind);
      const requested = wake.at ? Date.parse(wake.at) + 3000 - Date.now() : MIN_SINGLE_WAIT_MS;
      const waitMs = Math.min(Math.max(requested, MIN_SINGLE_WAIT_MS), MAX_SINGLE_WAIT_MS);
      if (journey.waitedMs + waitMs > WAIT_BUDGET_MS) {
        journey.failure = {
          code: "acceptance_wait_budget_exhausted",
          detail: `waiting a further ${waitMs}ms for ${wake.source} would exceed the declared ${WAIT_BUDGET_MS}ms wait budget, of which ${journey.waitedMs}ms has been spent across ${cycle} cycle(s)`
        };
        break;
      }
      journey.waitedMs += waitMs;
      console.log(`  waiting ${waitMs}ms for ${wake.source}${wake.at ? ` (${wake.at})` : ""}; ${journey.waitedMs}/${WAIT_BUDGET_MS}ms of the wait budget spent`);
      await sleep(waitMs);
    }

    if (!journey.failure && journey.targetCycles === 0) {
      journey.failure = {
        code: "acceptance_backlog_did_not_converge",
        detail: `${cycle} cycle(s) ran against a bound of ${cycleBound} derived from ${initialClaimablePredecessors} claimable predecessor(s), and the worker never claimed the target. ${journey.backlogCycles} cycle(s) claimed other runs' backlog (${journey.backlogJobsClaimed.join(", ") || "none recorded"}), ${journey.noJobCycles} claimed nothing at all.`
      };
    }
    return journey;
  }

  /**
   * One worker cycle, attributed before it is interpreted. Returns "stop" when
   * the journey may not usefully continue.
   */
  async function runOneCycle(cycle, jobId, journey) {
    const claimBefore = await claimStateSnapshot();
    const jobBefore = await readJob(jobId);
    const startedAt = new Date().toISOString();
    // --cidfile is the only way to learn the container id of a --rm run; docker
    // refuses to start if the path already exists, and may remove it on
    // teardown, so it is read opportunistically and reported as absent rather
    // than invented when teardown wins the race.
    const cidFile = path.join(EVIDENCE_DIR, `.worker-cid-${cycle}`);
    fs.rmSync(cidFile, { force: true });
    const run = spawnSync("docker", [
      "run", "--rm", "--cidfile", cidFile, "--name", `${containerName}-${cycle}`,
      "-e", `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
      "-e", `SUPABASE_URL=${SUPABASE_URL}`,
      "-e", `SUPABASE_SERVICE_ROLE_KEY=${service}`,
      "-e", `RCAP_WORKER_CLAIM_SECONDS=${WORKER_CLAIM_SECONDS}`,
      "-e", `RCAP_WORKER_CONTAINER_DIGEST=${WORKER_DIGEST_REF.split("@")[1] ?? WORKER_DIGEST_REF}`,
      WORKER_DIGEST_REF,
      "node", "scripts/rcap-render-worker.mjs", "--once"
    ], { encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
    const finishedAt = new Date().toISOString();
    // The target is read INDEPENDENTLY of whatever the cycle claimed. Its row
    // is a fact about this run; the cycle result is a fact about whichever row
    // the unscoped claim function happened to hand out.
    const jobAfter = await readJob(jobId);
    const claimAfter = await claimStateSnapshot();

    // Parsed out of stdout ONLY, before anything else is looked at: docker's
    // pull progress goes to stderr, and mixing the two is what destroyed this
    // diagnostic in run 32185795181.
    const cycleResult = parseCycleResult(run.stdout);
    const changedRows = rowsThatChanged(claimBefore, claimAfter);
    const identity = classifyCycle(cycleResult, changedRows, jobId);
    const containerId = fs.existsSync(cidFile) ? fs.readFileSync(cidFile, "utf8").trim() : null;
    fs.rmSync(cidFile, { force: true });
    diagnostics.cycles.push({
      cycle,
      containerName: `${containerName}-${cycle}`,
      containerId: containerId ?? "(removed with the container before it could be read)",
      startedAt,
      finishedAt,
      exitCode: run.status,
      exitSignal: run.signal ?? null,
      spawnError: run.error ? String(run.error.message) : null,
      cycleResult,
      boundary: cycleBoundary(cycleResult),
      classification: identity.classification,
      claimedJobId: identity.claimedJobId,
      claimedJobIdentitySource: identity.identitySource,
      rowsThatMoved: changedRows,
      claimedTuple: identity.claimedJobId
        ? claimedTupleFor(identity.claimedJobId, claimAfter)
        : null,
      stdout: redact(run.stdout),
      stderr: redact(run.stderr),
      targetStateBefore: jobBefore,
      targetStateAfter: jobAfter
    });
    console.log(`  worker cycle ${cycle} [${identity.classification}]: exit=${run.status} signal=${run.signal ?? "none"} claimed=${identity.claimedJobId ?? "(nothing)"} boundary=${cycleBoundary(cycleResult)}; target ${jobBefore?.status ?? `(${jobBefore?.readOutcome ?? "unread"})`} -> ${jobAfter?.status ?? `(${jobAfter?.readOutcome ?? "unread"})`}`);

    // The target row is recorded on every cycle, because it is read directly.
    journey.targetReadFinal = jobAfter;
    journey.targetRowFinal = jobRowOrNull(jobAfter);

    if (identity.classification === "claimed_identity_unproven") {
      journey.unprovenCycles += 1;
      journey.failure = {
        code: "acceptance_target_claim_identity_unproven",
        detail: `cycle ${cycle} cannot be attributed to a job: ${identity.identitySource}. An unattributable cycle is not evidence about the target in either direction, so the journey stops rather than crediting or blaming this run for it.`
      };
      return "stop";
    }

    if (identity.classification === "backlog_cycle") {
      journey.backlogCycles += 1;
      // A predecessor claimed twice has not moved out of the way, so the
      // backlog is not draining and further cycles would repeat forever.
      if (journey.backlogJobsClaimed.includes(identity.claimedJobId)) {
        journey.failure = {
          code: "acceptance_backlog_predecessor_repeated",
          detail: `job ${identity.claimedJobId} was claimed for a second time on cycle ${cycle}; it is not leaving the claimable queue, so the backlog is not draining and no number of further cycles would reach the target`
        };
        return "stop";
      }
      journey.backlogJobsClaimed.push(identity.claimedJobId);
      // Explicitly NOT recorded as the run's cycle result. This cycle is
      // progress through another run's work and proves nothing about here.
      return "continue";
    }

    if (identity.classification === "no_job") {
      journey.noJobCycles += 1;
      return "continue";
    }

    // target_cycle — and only here may a cycle result become this run's.
    journey.targetCycles += 1;
    journey.targetCycleResult = cycleResult;
    const target = journey.targetRowFinal;
    if (target && TERMINAL_SUCCESS.has(target.status)) return "stop";
    if (target && target.status === "failed" && target.failure_disposition === "terminal") {
      journey.failure = {
        code: "acceptance_target_terminal_failure",
        detail: `the target failed terminally at ${target.error_code ?? "(no error code)"} on cycle ${cycle}: ${(target.last_error_detail ?? "(no detail)").slice(0, 300)}`
      };
      return "stop";
    }
    if (target && Number(target.attempt_count ?? 0) >= Number(target.max_attempts ?? 0) && Number(target.max_attempts ?? 0) > 0) {
      journey.failure = {
        code: "acceptance_target_terminal_failure",
        detail: `the target has exhausted its retries (${target.attempt_count}/${target.max_attempts}) at ${target.error_code ?? "(no error code)"}`
      };
      return "stop";
    }
    return "continue";
  }

  /** The claimed job's profile tuple, read from the same snapshot that named it. */
  function claimedTupleFor(claimedJobId, snapshot) {
    if (snapshot?.readOutcome !== "read") return null;
    const row = snapshot.byId.get(claimedJobId);
    return row ? { status: row.status, attemptCount: row.attempt_count, errorCode: row.error_code ?? null } : null;
  }

  const journey = await runTargetWorkerJourney(targetJobId);
  diagnostics.journey = journey;
  finalJobRead = journey.targetReadFinal;
  finalJob = journey.targetRowFinal;
  // Set by a target cycle and by nothing else, so a backlog job's account can
  // never be quoted as this run's result.
  finalCycleResult = journey.targetCycleResult;
  evidence.targetJourney = {
    targetJobId: journey.targetJobId,
    targetJobIdSource: journey.targetJobIdSource,
    rendererKind: journey.rendererKind ?? null,
    targetProfileTuple: journey.targetProfileTuple ?? null,
    initialClaimablePredecessors: journey.initialClaimablePredecessors ?? null,
    targetClaimRank: journey.targetClaimRank ?? null,
    queueChurnAllowance: journey.queueChurnAllowance,
    cycleBoundCeiling: journey.cycleBoundCeiling ?? null,
    cycleBoundHistory: journey.cycleBoundHistory ?? [],
    waitBudgetMs: journey.waitBudgetMs,
    waitedMs: journey.waitedMs,
    cyclesRun: journey.cyclesRun,
    backlogCycles: journey.backlogCycles,
    targetCycles: journey.targetCycles,
    noJobCycles: journey.noJobCycles,
    unprovenCycles: journey.unprovenCycles,
    backlogJobsClaimed: journey.backlogJobsClaimed,
    initialClaimOrder: journey.initialClaimOrder ?? null,
    failure: journey.failure
  };

  fs.writeFileSync(path.join(EVIDENCE_DIR, "worker-diagnostics.json"), `${JSON.stringify(diagnostics, null, 2)}\n`);
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "worker-console.log"),
    diagnostics.cycles.map((c) =>
      `===== cycle ${c.cycle} (${c.startedAt} -> ${c.finishedAt}) exit=${c.exitCode} signal=${c.exitSignal} =====\n`
      + `----- stdout -----\n${c.stdout}\n----- stderr -----\n${c.stderr}\n`).join("\n")
  );

  // The nine conditions, each read from something that exists rather than from
  // the absence of a failure. A claimed job is a failure. An exit code is not a
  // delivery.
  const job = finalJob;
  const storagePath = job?.output_storage_path ?? null;
  const declaredBytes = Number(job?.output_byte_count ?? 0);
  let stored = { status: "not attempted", bytes: 0 };
  let validation = null;
  if (storagePath) {
    stored = await fetch(`${SUPABASE_URL}/storage/v1/object/rcap-packet-artifacts-private/${storagePath}`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` }
    }).then(async (r) => ({ status: r.status, bytes: r.ok ? Buffer.from(await r.arrayBuffer()) : Buffer.alloc(0) }))
      .catch((error) => ({ status: `unreachable: ${error.message}`, bytes: Buffer.alloc(0) }));
    if (stored.status === 200 && stored.bytes.length > 0) {
      // The same validator the worker itself runs: it parses the PDF, reads its
      // pages, checks the page geometry and recomputes both hashes.
      validation = await validateRenderOutput(
        { jobId: job.id, bytes: stored.bytes, containerDigest: job.container_digest ?? "acceptance-read-back" },
        { expectedPageSize: { width: 612, height: 792 } }
      );
    }
  }

  const conditions = {
    // The image is addressed by its immutable digest, not by a tag. A tag is an
    // alias and can be moved; only the sha256 digest names these exact bytes.
    pulled_by_immutable_digest: /@sha256:[0-9a-f]{64}$/.test(WORKER_DIGEST_REF),
    // --- the journey reached THIS run's job, and knows that it did -----------
    target_job_id_from_the_paid_render_response: typeof targetJobId === "string" && targetJobId.trim() !== "",
    // Every cycle was attributable to a specific row. An unattributable cycle
    // cannot be credited or blamed here, and is never allowed to pass by
    // default.
    every_cycle_attributed_to_a_job: journey.unprovenCycles === 0,
    // At least one cycle provably claimed the target. Without this, a run that
    // spent its whole budget on other runs' backlog would be reporting on work
    // it never did — which is precisely what run 32393413747 did.
    target_cycle_observed: journey.targetCycles > 0,
    backlog_converged: journey.failure === null,
    // The worker said what it did, and said it about THIS job. finalCycleResult
    // is only ever set by a cycle proven to have claimed the target, so this is
    // a second, independent reading of the same fact.
    cycle_result_emitted: Boolean(finalCycleResult),
    cycle_result_names_this_job: Boolean(finalCycleResult) && Boolean(job) && finalCycleResult.jobId === job.id,
    cycle_result_is_finalized: finalCycleResult?.outcome === "finalized",
    terminal_successful_state: Boolean(job) && TERMINAL_SUCCESS.has(job.status),
    not_in_flight: Boolean(job) && !NON_TERMINAL.has(job.status),
    // --- the lifecycle the target actually walked, timestamp by timestamp ----
    target_admitted_and_claimed: Boolean(job?.claimed_at),
    target_rendering_started: Boolean(job?.rendering_at),
    target_validation_started: Boolean(job?.validating_at),
    target_finalized: Boolean(job?.artifact_validated_at),
    artifact_path_present: typeof storagePath === "string" && storagePath.trim() !== "",
    nonzero_stored_byte_count: declaredBytes > 0,
    storage_object_exists: stored.status === 200,
    exact_bytes_re_read: Boolean(stored.bytes?.length) && stored.bytes.length === declaredBytes,
    pdf_parses: Boolean(validation?.ok),
    page_proof: Number(validation?.pageCount ?? 0) > 0 && Number(validation?.pageCount ?? 0) === Number(job?.page_count ?? -1),
    immutable_hash_agrees: Boolean(validation?.ok)
      && validation.outputSha256 === job?.output_sha256
      && validation.normalizedOutputSha256 === job?.normalized_output_sha256
  };
  const unmet = Object.entries(conditions).filter(([, ok]) => !ok).map(([name]) => name);
  const lastCycle = diagnostics.cycles.at(-1);

  // The worker's own account and the database must agree. If the cycle says it
  // finalized and the row is not artifact_validated — or the row is validated
  // and no cycle claims to have finalized it — something between them is lying
  // and neither reading may be quoted as the result.
  const contradiction =
    finalCycleResult?.outcome === "finalized" && job && !TERMINAL_SUCCESS.has(job.status)
      ? `the worker reported finalized for ${finalCycleResult.jobId} but the job row is '${job.status}'`
      : job && TERMINAL_SUCCESS.has(job.status) && finalCycleResult && finalCycleResult.outcome !== "finalized"
        ? `the job row is '${job.status}' but the last cycle result was ${cycleBoundary(finalCycleResult)}`
        : null;
  if (contradiction) {
    evidence.workerContradiction = contradiction;
    console.error(`  CONTRADICTION ${contradiction}`);
  }

  record(
    "worker_renders_and_stores_the_artifact",
    unmet.length === 0 && contradiction === null,
    unmet.length === 0 && contradiction === null
      ? `${WORKER_DIGEST_REF} drove THIS RUN'S TARGET job ${job.id} — the id returned by the paid render request, not a row inferred from a worker cycle — to '${job.status}'. ${diagnostics.cycles.length} cycle(s) ran against a bound of ${journey.cycleBoundCeiling} derived from ${journey.initialClaimablePredecessors} claimable predecessor(s) + 1 target cycle + a ${journey.queueChurnAllowance}-cycle churn allowance: ${journey.backlogCycles} spent on other runs' backlog, ${journey.noJobCycles} idle, ${journey.targetCycles} on the target. Its own cycle result reads ${cycleBoundary(finalCycleResult)} and names ${finalCycleResult?.jobId}. ${declaredBytes} bytes at ${storagePath}, re-read and reparsed to ${validation.pageCount} page(s), output_sha256 and normalized_output_sha256 both recomputed from the stored bytes and equal to the values the finalization transaction recorded.`
      : `TARGET ${targetJobId ?? "(never minted)"}${journey.failure ? ` — ${journey.failure.code}: ${journey.failure.detail}` : ""}. Target read outcome ${finalJobRead?.readOutcome ?? "never attempted"}${finalJobRead?.readOutcome === "query_error" ? ` (${finalJobRead.readErrorClass}: ${finalJobRead.readErrorMessage}) — this is the diagnostic failing, NOT evidence that no job exists` : ""}; the target is '${job?.status ?? (finalJobRead?.readOutcome === "no_row" ? "(no job row)" : "(unread)")}' after ${diagnostics.cycles.length} cycle(s) and ${job?.attempt_count ?? 0} attempt(s), of which ${journey.targetCycles} provably claimed it, ${journey.backlogCycles} claimed other runs' backlog (${journey.backlogJobsClaimed.join(", ") || "none"}), ${journey.noJobCycles} claimed nothing and ${journey.unprovenCycles} could not be attributed. It entered the journey at claim rank ${journey.targetClaimRank ?? "(not claimable)"} behind ${journey.initialClaimablePredecessors ?? "(unknown)"} claimable predecessor(s). TARGET CYCLE RESULT: ${cycleBoundary(finalCycleResult)}${finalCycleResult ? ` — ${JSON.stringify(finalCycleResult)}` : " (no cycle provably claimed the target, so no cycle result may be quoted as this run's)"}.${contradiction ? ` CONTRADICTION: ${contradiction}.` : ""} Unmet: ${unmet.join(", ")}. Last cycle exit=${lastCycle?.exitCode} signal=${lastCycle?.exitSignal}; error_code=${job?.error_code ?? "(none)"}; disposition=${job?.failure_disposition ?? "(none)"}; detail=${(job?.last_error_detail ?? "(none)").slice(0, 300)}. Complete stdout and stderr for every cycle are in the uploaded worker-console.log and worker-diagnostics.json.`
  );

  evidence.worker = {
    image: WORKER_DIGEST_REF,
    immutableDigest: diagnostics.immutableDigest,
    localImageId: diagnostics.localImageId,
    claimSeconds: WORKER_CLAIM_SECONDS,
    cycles: diagnostics.cycles.length,
    exitCodes: diagnostics.cycles.map((c) => c.exitCode),
    exitSignals: diagnostics.cycles.map((c) => c.exitSignal),
    boundaries: diagnostics.cycles.map((c) => c.boundary),
    classifications: diagnostics.cycles.map((c) => c.classification),
    claimedJobIds: diagnostics.cycles.map((c) => c.claimedJobId),
    journeyFailure: journey.failure,
    cycleResult: finalCycleResult,
    contradiction,
    jobReadOutcome: finalJobRead?.readOutcome ?? null,
    jobReadError: finalJobRead?.readOutcome === "query_error"
      ? { class: finalJobRead.readErrorClass, message: finalJobRead.readErrorMessage }
      : null,
    fencingTokenOutcome: job?.fencingTokenOutcome ?? null,
    fencingTokenSha256: job?.fencingTokenSha256 ?? null,
    jobStatus: job?.status ?? null,
    attemptCount: job?.attempt_count ?? null,
    errorCode: job?.error_code ?? null,
    failureDisposition: job?.failure_disposition ?? null,
    conditions,
    unmetConditions: unmet,
    storedStatus: stored.status,
    storedByteCount: stored.bytes?.length ?? 0,
    validation: validation
      ? { ok: validation.ok, errorCode: validation.errorCode ?? null, pageCount: validation.pageCount ?? null, byteCount: validation.byteCount ?? null }
      : null
  };
  evidence.artifactPath = storagePath;
  // The artifact's identity, bound into the run namespace so the replay
  // snapshot below compares the same object rather than "an artifact".
  runNamespace.artifactIdentity = job && storagePath
    ? { jobId: job.id, storagePath, outputSha256: job.output_sha256 ?? null, byteCount: declaredBytes, pageCount: job.page_count ?? null }
    : null;
}

// --- 8b. Identity: the job is bound to server-owned person and matter --------
//
// Binding happens at ENQUEUE, not at finalization, and this case is written to
// the boundary that actually exists. Phase 53 creates a consumer job with
// person_id, matter_id and consumer_auth_user_id set in the same INSERT — there
// is deliberately no later statement that attaches them — and phase 55's
// BEFORE INSERT guard refuses the row outright unless those bindings match the
// paid matter. So a bound job is provable the moment the 202 comes back.
//
// The previous version compared the job against consumer_packet_payment_
// consumption, which phase 52 writes inside finalize_packet_render_job. That is
// a post-validation accounting row: before an artifact validates it is correct
// for it to be absent, and the LEFT JOIN then produced (null, null) and read as
// a binding failure. This case no longer depends on the worker at all.
{
  const rows = await sql(`
    select j.id as job_id, j.status, j.person_id, j.matter_id, j.partner_id,
           j.consumer_briefcase_item_id, j.consumer_auth_user_id,
           b.user_id as item_owner, b.payment_person_id, b.payment_matter_id,
           b.payment_product_id, b.provider_event_id,
           public.consumer_matter_id_for_briefcase_item(b.id) as canonical_matter_id
      from public.packet_render_jobs j
      join public.consumer_briefcase_items b on b.id = j.consumer_briefcase_item_id
     where j.id = '${sqlText(targetJobId)}'
  `);
  const row = Array.isArray(rows.json) ? rows.json[0] : null;
  runNamespace.personId = row?.person_id ?? null;
  runNamespace.matterId = row?.matter_id ?? null;
  const same = (left, right) => left !== null && left !== undefined && String(left) === String(right);

  // The phase-55 authority probe, asked directly: does this exact
  // (item, user, product, person, matter) tuple authorize a paid render? And
  // the negative controls — a substituted person and a substituted matter must
  // both be refused, or the binding is decorative.
  const authority = await sql(`
    select
      (select valid from public.consumer_packet_payment_authority(
         '${sqlText(itemId)}', '${sqlText(A.id)}', public.expungement_packet_product_id(),
         '${sqlText(row?.person_id ?? "00000000-0000-0000-0000-000000000000")}',
         '${sqlText(row?.matter_id ?? "00000000-0000-0000-0000-000000000000")}')) as exact_valid,
      (select reason from public.consumer_packet_payment_authority(
         '${sqlText(itemId)}', '${sqlText(A.id)}', public.expungement_packet_product_id(),
         '${sqlText(row?.person_id ?? "00000000-0000-0000-0000-000000000000")}',
         '${sqlText(row?.matter_id ?? "00000000-0000-0000-0000-000000000000")}')) as exact_reason,
      (select valid from public.consumer_packet_payment_authority(
         '${sqlText(itemId)}', '${sqlText(A.id)}', public.expungement_packet_product_id(),
         '11111111-1111-4111-8111-111111111111',
         '${sqlText(row?.matter_id ?? "00000000-0000-0000-0000-000000000000")}')) as other_person_valid,
      (select valid from public.consumer_packet_payment_authority(
         '${sqlText(itemId)}', '${sqlText(A.id)}', public.expungement_packet_product_id(),
         '${sqlText(row?.person_id ?? "00000000-0000-0000-0000-000000000000")}',
         '22222222-2222-4222-8222-222222222222')) as other_matter_valid,
      (select valid from public.consumer_packet_payment_authority(
         '${sqlText(itemId)}', '${sqlText(B.id)}', public.expungement_packet_product_id(),
         '${sqlText(row?.person_id ?? "00000000-0000-0000-0000-000000000000")}',
         '${sqlText(row?.matter_id ?? "00000000-0000-0000-0000-000000000000")}')) as other_user_valid
  `);
  const auth = Array.isArray(authority.json) ? authority.json[0] : null;
  const isFalse = (value) => value === false || value === "f" || value === "false";
  const isTrue = (value) => value === true || value === "t" || value === "true";

  const bound = Boolean(row)
    && row.partner_id === null
    && same(row.person_id, row.payment_person_id)
    && same(row.matter_id, row.payment_matter_id)
    && same(row.matter_id, row.canonical_matter_id)
    && same(row.consumer_auth_user_id, row.item_owner)
    && same(row.consumer_briefcase_item_id, itemId)
    && isTrue(auth?.exact_valid)
    && isFalse(auth?.other_person_valid)
    && isFalse(auth?.other_matter_valid)
    && isFalse(auth?.other_user_valid);
  record(
    "person_and_matter_are_bound_on_the_render_job",
    bound,
    `render job ${row?.job_id ?? "(none)"} carries person_id=${row?.person_id ?? "(null)"} matter_id=${row?.matter_id ?? "(null)"} consumer_auth_user_id=${row?.consumer_auth_user_id ?? "(null)"}; the paid item names payment_person_id=${row?.payment_person_id ?? "(null)"} payment_matter_id=${row?.payment_matter_id ?? "(null)"} owner=${row?.item_owner ?? "(null)"}, and the database derives canonical matter ${row?.canonical_matter_id ?? "(null)"}. The phase-55 authority probe answers valid=${auth?.exact_valid ?? "(none)"} (${auth?.exact_reason ?? "no reason"}) for that exact tuple, and refuses every substitution: another person ${auth?.other_person_valid ?? "(none)"}, another matter ${auth?.other_matter_valid ?? "(none)"}, another user ${auth?.other_user_valid ?? "(none)"} — all of which must be false. Written in the enqueue INSERT and guarded there, so this is provable without any artifact; the accounting row finalization writes is asserted separately.`
  );
  evidence.identityBinding = { job: row ?? null, authority: auth ?? null };
}

// --- 8c. The artifact is in PRIVATE storage ----------------------------------
{
  const artifactPath = evidence.artifactPath;
  const service = await serviceRoleKey();

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

  // Its own question, not an echo of the worker case: the worker case asks
  // whether the finalized artifact identity is real, this one asks whether the
  // object is private. Both need actual stored bytes, so a run with no artifact
  // fails both — but for stated, separate reasons.
  record(
    "artifact_is_stored_privately_and_re_readable",
    typeof artifactPath === "string" && artifactPath.trim() !== ""
      && typeof publicRead === "number" && publicRead >= 400
      && serviceRead.status === 200 && serviceRead.bytes > 0,
    `artifact path ${artifactPath ?? "(none recorded)"}: anonymous read of the public object path = ${publicRead} (must refuse); an authorized re-read returned ${serviceRead.status} with ${serviceRead.bytes} bytes. Written once, readable back by an authorized reader, and not readable by the public.`
  );
  evidence.storage = { path: artifactPath, anonymous: publicRead, authorized: serviceRead };
}

// --- 9. Delivery: the owner, and nobody else ---------------------------------
{
  // The RCAP artifact is delivered by /api/rcap/packets/<jobId>/download, which
  // authorizes the participant, re-reads the stored object, checks its identity
  // against the finalized hashes and streams PDF bytes.
  //
  // This case used to call /api/expungement-ai/packet/download instead. That is
  // the legacy DTC route: getConsumerPacketDownload serves artifactRefs.text and
  // requires packetStatus === "ready", so it can never serve a render-job
  // artifact and answers 409 not-ready for one. The owner's 409 in run
  // 32185795181 was that route answering correctly about a packet it does not
  // own — the case was pointed at the wrong surface, and B's 404 and the
  // anonymous 307 were answers about the legacy route too.
  // The TARGET, always. Falling back to `finalJob?.id` would let a run whose
  // target never rendered download whatever row the journey last looked at.
  const jobId = targetJobId;
  const download = `/api/rcap/packets/${jobId}/download`;
  const owner = jobId ? await callApp(download, { cookie: A.cookie }) : { status: "no render job to download", bytes: Buffer.alloc(0), location: null };
  const stranger = jobId ? await callApp(download, { cookie: B.cookie }) : { status: "no render job to download", bytes: Buffer.alloc(0), location: null };
  const anonymous = jobId ? await callApp(download) : { status: "no render job to download", bytes: Buffer.alloc(0), location: null };
  // The legacy consumer route is probed too, but only as evidence: it must not
  // hand a stranger anything either, and it is not where this artifact lives.
  const legacy = await callApp(`/api/expungement-ai/packet/download?briefcaseItemId=${itemId}`, { cookie: B.cookie });

  // Refusals alone are not delivery. The old verdict ignored the owner
  // entirely, so a run in which NOBODY could download — including the person
  // who paid — passed this case on the strength of two 4xx answers. Delivery is
  // proven by the owner receiving the validated artifact and nobody else
  // receiving anything.
  const ownerBytes = typeof owner.status === "number" && owner.status === 200 ? owner.bytes ?? Buffer.alloc(0) : Buffer.alloc(0);
  const ownerPdf = ownerBytes.length > 0 && ownerBytes.subarray(0, 5).toString("latin1") === "%PDF-";
  const ownerPdfContentType = /application\/pdf/i.test(owner.contentType ?? "");
  const ownerHash = ownerBytes.length > 0 ? crypto.createHash("sha256").update(ownerBytes).digest("hex") : null;
  const ownerServed = ownerPdf && ownerPdfContentType
    && ownerHash === (evidence.worker?.validation ? finalJob?.output_sha256 : null);
  // A sign-in redirect is a refusal; a redirect to anywhere else is not, and
  // saying which one it was is the difference between evidence and a number.
  const refused = (response) => {
    if (typeof response.status !== "number") return false;
    if (response.status >= 400) return true;
    if (response.status >= 300 && response.status < 400) {
      return typeof response.location === "string" && /sign-?in|login|auth/i.test(response.location);
    }
    return false;
  };
  record(
    "delivery_serves_the_owner_and_refuses_everyone_else",
    ownerServed && refused(stranger) && refused(anonymous) && refused(legacy),
    `GET ${download} — owner A=${owner.status} content-type=${owner.contentType ?? "(none)"} carrying ${ownerBytes.length} bytes (PDF header ${ownerPdf}, sha256 ${ownerHash ? `${ownerHash.slice(0, 16)}…` : "(none)"} vs the finalized ${finalJob?.output_sha256 ? `${String(finalJob.output_sha256).slice(0, 16)}…` : "(no finalized artifact)"}); a different authenticated participant B=${stranger.status}${stranger.location ? ` -> ${stranger.location}` : ""} (must refuse); anonymous=${anonymous.status}${anonymous.location ? ` -> ${anonymous.location}` : ""} (must refuse); the legacy consumer route answers B ${legacy.status} (must also refuse). The owner must receive the exact validated artifact; B paid for nothing and must receive nothing.`
  );
  evidence.delivery = {
    route: download,
    owner: owner.status,
    ownerByteCount: ownerBytes.length,
    ownerSha256: ownerHash,
    stranger: stranger.status,
    strangerLocation: stranger.location ?? null,
    anonymous: anonymous.status,
    anonymousLocation: anonymous.location ?? null,
    legacyRouteForStranger: legacy.status
  };
}

// --- 10. Replay: Stripe retries, and must change nothing ---------------------
{
  // Idempotency is a statement about counts before and after, and it is true or
  // false whether or not anything ever rendered. The old verdict additionally
  // demanded exactly one entitlement, which made it a test of finalization: the
  // consumption row is written inside finalize_packet_render_job, so before an
  // artifact validates a count of zero is the CORRECT answer and the case
  // failed while reporting the very numbers that prove replay changed nothing.
  //
  // Provider event records, payment records, consumption rows, entitlements and
  // render jobs are all counted on both sides. None of them may move.
  // Every count is filtered by an identity in THIS RUN'S namespace — the
  // briefcase item, the auth user, the target render job — and the target's own
  // finalized identity is snapshotted alongside them. The acceptance project is
  // shared, so a project-wide count would move whenever anything else in the
  // queue moved and would report unrelated backlog as an idempotency defect.
  // Project-wide movement is measured too, separately, and is never allowed to
  // make this verdict red.
  const counts = () => sql(`
    select
      (select count(*) from public.packet_render_jobs where briefcase_item_id = '${sqlText(itemId)}') as jobs,
      (select count(*) from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_job,
      (select coalesce(status, '(absent)') from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_status,
      (select coalesce(output_sha256, '(none)') from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_output_sha256,
      (select coalesce(output_storage_path, '(none)') from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_storage_path,
      (select coalesce(page_count, -1) from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_page_count,
      (select coalesce(output_byte_count, -1) from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_byte_count,
      (select coalesce(attempt_count, -1) from public.packet_render_jobs where id = '${sqlText(targetJobId)}') as target_attempt_count,
      (select count(*) from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${sqlText(itemId)}') as entitlements,
      (select count(*) from public.packet_credit_ledger where render_job_id = '${sqlText(targetJobId)}') as target_ledger_events,
      (select count(*) from public.packet_credit_ledger l
        join public.packet_render_jobs j on j.id = l.render_job_id
       where j.briefcase_item_id = '${sqlText(itemId)}') as ledger_events,
      (select count(*) from public.consumer_briefcase_items
        where id = '${sqlText(itemId)}' and payment_status = 'paid') as paid_payments,
      (select count(*) from public.consumer_briefcase_items c
        where c.provider_event_id is not null
          and c.provider_event_id = (select provider_event_id from public.consumer_briefcase_items where id = '${sqlText(itemId)}')) as provider_event_records,
      (select coalesce(provider_event_id, '(none)') from public.consumer_briefcase_items where id = '${sqlText(itemId)}') as provider_event_id
  `);
  /** Movement anywhere else in the shared project — reported, never asserted. */
  const projectWide = () => sql(`
    select
      (select count(*) from public.packet_render_jobs) as all_jobs,
      (select count(*) from public.packet_render_jobs where status = 'queued') as all_queued
  `);
  const before = await counts();
  const b = Array.isArray(before.json) ? before.json[0] : null;
  const projectBefore = await projectWide();
  const pb = Array.isArray(projectBefore.json) ? projectBefore.json[0] : null;

  // Byte-identical redelivery of the SAME event id, correctly signed with a
  // fresh timestamp — exactly what Stripe does when it retries, and what
  // happens when one event fans out to the canonical and legacy endpoints.
  const timestamp = Math.floor(Date.now() / 1000);
  const replay = signedBody(completionEvent, WEBHOOK_SECRET, timestamp);
  const replayRes = await callApp("/api/stripe/webhook", {
    method: "POST", body: replay.body, headers: { "stripe-signature": replay.header }
  });

  const after = await counts();
  const a = Array.isArray(after.json) ? after.json[0] : null;
  const projectAfter = await projectWide();
  const pa = Array.isArray(projectAfter.json) ? projectAfter.json[0] : null;

  const TRACKED = [
    "jobs", "entitlements", "ledger_events", "paid_payments", "provider_event_records", "provider_event_id",
    // The target's own identity, which a replay may not disturb in any way.
    "target_job", "target_status", "target_output_sha256", "target_storage_path",
    "target_page_count", "target_byte_count", "target_attempt_count", "target_ledger_events"
  ];
  const moved = (b && a) ? TRACKED.filter((key) => String(b[key]) !== String(a[key])) : TRACKED;
  const projectMoved = (pb && pa)
    ? ["all_jobs", "all_queued"].filter((key) => String(pb[key]) !== String(pa[key]))
    : ["(project-wide counts unreadable)"];
  record(
    "event_replay_creates_no_second_entitlement_or_render_job",
    replayRes.status === 200 && moved.length === 0,
    `replaying the same signed event returned ${replayRes.status} (outcome=${replayRes.json?.outcome ?? "none"}); ${TRACKED.map((key) => `${key} ${b?.[key] ?? "?"} → ${a?.[key] ?? "?"}`).join(", ")}. ${moved.length === 0 ? "Nothing in this run's namespace moved" : `MOVED: ${moved.join(", ")}`}. Every count above is filtered by this run's own identities — briefcase item ${itemId}, target render job ${targetJobId} — and the target's finalized identity is compared field by field, so a replay that re-rendered, re-hashed or re-attempted THE TARGET would show here. Project-wide, ${projectMoved.length === 0 ? "nothing moved either" : `${projectMoved.join(", ")} moved`} (all_jobs ${pb?.all_jobs ?? "?"} → ${pa?.all_jobs ?? "?"}, all_queued ${pb?.all_queued ?? "?"} → ${pa?.all_queued ?? "?"}); that is the shared acceptance project's own backlog and is reported rather than asserted, because other runs' rows are not this run's idempotency.`
  );
  evidence.replay = {
    status: replayRes.status,
    outcome: replayRes.json?.outcome ?? null,
    scopedTo: { briefcaseItemId: itemId, targetJobId, authUserId: A.id },
    before: b,
    after: a,
    moved,
    projectWideBefore: pb,
    projectWideAfter: pa,
    projectWideMoved: projectMoved
  };
}

// Leave the acceptance database as it was found.
await sql(`delete from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}'`);
await sql(`delete from public.consumer_briefcase_items where id = '${itemId}'`);

finish();
