#!/usr/bin/env node
// Hosted acceptance staging — the golden-journey matrix.
//
// Runs the frozen application against the PERSISTENT hosted acceptance
// Supabase project. Everything the participant would touch is exercised
// through a real HTTP surface with real GoTrue identities and real RLS; the
// only synthetic thing is who the participants are.
//
// Why the application runs on the runner rather than only on the Vercel
// deployment: the delivery control refuses `staging_scoped` in any production
// runtime, and a Next.js production build compiles `NODE_ENV === "production"`
// to a literal true. That is the control's fail-closed design and it is
// asserted here as a REQUIRED case, not worked around — but it also means the
// scoped journey can only execute in a development-compiled runtime. So the
// matrix runs both: the production build proves the route is shut, and the dev
// compile proves the scope logic admits exactly its named identity and nobody
// else. Both are bound to the same hosted database.
//
// Journeys covered, in Roger's terms: paid, sponsored, guidance, exact
// deferral, product-scope exclusion, security/isolation, problematic-PDF
// safety, and the rollback rehearsal.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const WORKER_DIGEST_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const APP_PORT = Number(process.env.HOSTED_APP_PORT ?? 3000);
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("MATRIX: SUPABASE_ACCESS_TOKEN and a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF are required");
  process.exit(1);
}

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "hosted_auth_real_identities",
  "delivery_disabled_by_default",
  "scoped_refused_in_production_runtime",
  "scoped_admits_only_its_named_identity",
  "rollback_restores_disabled",
  "guidance_route_is_not_sellable",
  "exact_deferral_route_is_not_sellable",
  "product_scope_exclusion_is_typed",
  "sponsored_session_never_opens_payment",
  "problematic_pdf_routes_are_not_sellable",
  "cross_tenant_read_denied",
  "browser_role_person_access_denied",
  "payment_write_denied_through_postgrest",
  "worker_digest_runs_against_hosted_project"
];

// Deterministic, obviously synthetic, and namespaced to this environment.
const USERS = [
  { key: "A", email: "acceptance-consumer-a@rcap-acceptance.test", password: "Acceptance-a-4f7c21!" },
  { key: "B", email: "acceptance-consumer-b@rcap-acceptance.test", password: "Acceptance-b-8d3e95!" }
];
const identities = new Map();

let ANON_KEY = "";
let SERVICE_KEY = "";

async function managementApi(pathname, { method = "GET", body = null } = {}) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 300) };
}

const query = (sql) => managementApi(`/v1/projects/${PROJECT_REF}/database/query`, { method: "POST", body: { query: sql } });

// The Management API can return an HTTP error object that happens to be valid
// JSON. Acceptance SQL must never treat that shape as an empty result set: an
// unchecked insert followed by a 404 from the application is not application
// evidence. Every SQL operation added to the partner-covered journey therefore
// requires both a successful HTTP response and the query endpoint's row-array
// result shape.
async function mustQuery(sql, label) {
  const response = await query(sql);
  if (!response.ok || !Array.isArray(response.json)) {
    throw new Error(`${label}: SQL ${response.status}: ${response.text || JSON.stringify(response.json)}`);
  }
  return response.json;
}

function sqlText(value) {
  return String(value).replaceAll("'", "''");
}

async function supabase(pathname, { method = "GET", key = null, token = null, body = null, headers = {} } = {}) {
  const apikey = key ?? ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    method,
    headers: { apikey, Authorization: `Bearer ${token ?? apikey}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = JSON.parse(await res.clone().text()); } catch { /* non-JSON is fine */ }
  return { status: res.status, json };
}

/**
 * The application authenticates from COOKIES, not from an Authorization header.
 *
 * `getRcapBriefcaseAuthState` goes through `createServerSupabaseAuthClient`,
 * which builds a @supabase/ssr server client over `cookies()`. A Bearer header
 * is simply not read, so a probe that sends one is an ANONYMOUS probe wearing a
 * costume — it gets 401 from the authentication gate and never reaches the
 * delivery control at all. That is what made four cases here look like control
 * failures when the control was never consulted.
 *
 * @supabase/ssr stores the whole session as `base64-` + base64(JSON) under
 * `sb-<project-ref>-auth-token`, and splits values past its chunk size into
 * `.0`, `.1`, … suffixed cookies. Both are reproduced exactly; a value that
 * needed chunking and was sent whole would be rejected as malformed.
 */
const SSR_COOKIE_CHUNK_SIZE = 3180;

function sessionCookieHeader(session) {
  if (!session) return null;
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  if (value.length <= SSR_COOKIE_CHUNK_SIZE) return `${name}=${value}`;
  const chunks = [];
  for (let i = 0; i < value.length; i += SSR_COOKIE_CHUNK_SIZE) {
    chunks.push(`${name}.${chunks.length}=${value.slice(i, i + SSR_COOKIE_CHUNK_SIZE)}`);
  }
  return chunks.join("; ");
}

async function app(pathname, { method = "GET", body = null, headers = {} } = {}) {
  try {
    const res = await fetch(`${APP_URL}${pathname}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = JSON.parse(await res.clone().text()); } catch { /* non-JSON is fine */ }
    return { status: res.status, json };
  } catch (error) {
    return { status: `unreachable: ${error.message}`, json: null };
  }
}

// --- application process control ---------------------------------------------
let appProcess = null;

/**
 * Stop the previous server and PROVE the port is free before returning.
 *
 * The old implementation pattern-matched `next start` / `next dev`, but the
 * process that actually serves is `next-server`, spawned as a child — the
 * runner's own cleanup reported terminating an orphaned `next-server` after the
 * whole matrix had finished. So a "dev-compiled" phase was still being answered
 * by the surviving PRODUCTION server, which refuses the scoped state by design.
 * That produced A=503, B=503, anon=401: a perfect production-runtime signature
 * reported as a scoped-admission failure.
 *
 * Killing the process GROUP reaches next-server, and waiting for the port to
 * stop accepting connections is what makes the next `startApp` an assertion
 * about a server this function started rather than one it inherited.
 */
async function killApp() {
  if (appProcess?.pid) {
    try { process.kill(-appProcess.pid, "SIGKILL"); } catch { /* already gone */ }
  }
  spawnSync("bash", ["-c", "pkill -9 -f next-server || true; pkill -9 -f 'next start' || true; pkill -9 -f 'next dev' || true"], { encoding: "utf8" });
  appProcess = null;

  for (let i = 0; i < 40; i += 1) {
    const probe = await app("/api/health");
    if (typeof probe.status !== "number") return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`MATRIX: a server is still answering on ${APP_URL} after the kill; every runtime case after this point would test the wrong process`);
}

async function startApp(extraEnv, logName, runtime = "start") {
  const log = fs.openSync(path.join(EVIDENCE_DIR, logName), "a");
  appProcess = spawn("npx", ["next", runtime, "-p", String(APP_PORT)], {
    cwd: rootDir,
    stdio: ["ignore", log, log],
    // Its own process group, so killApp can signal next-server too.
    detached: true,
    env: {
      ...process.env,
      NODE_ENV: runtime === "dev" ? "development" : "production",
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      ENABLE_SUPABASE_PARTNER_DATA: "true",
      // Test-mode Stripe placeholders. A live key is never present in this
      // environment, and the dry-run flag is refused in a production runtime
      // by the payment adapter itself.
      STRIPE_SECRET_KEY: "sk_test_hosted_acceptance_placeholder",
      STRIPE_WEBHOOK_SECRET: "whsec_hosted_acceptance_placeholder",
      ...extraEnv
    }
  });
  for (let i = 0; i < 90; i += 1) {
    const probe = await app("/api/health");
    if (typeof probe.status === "number") return true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return false;
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-matrix/v1",
  acceptanceProjectRef: PROJECT_REF,
  supabaseUrl: SUPABASE_URL,
  workerDigestRef: WORKER_DIGEST_REF || null,
  cases: {}
};

// --- 0. Keys and real identities on the hosted project ------------------------
{
  const keys = await managementApi(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const list = Array.isArray(keys.json) ? keys.json : [];
  ANON_KEY = list.find((k) => k.name === "anon")?.api_key ?? "";
  SERVICE_KEY = list.find((k) => k.name === "service_role")?.api_key ?? "";
  if (!ANON_KEY || !SERVICE_KEY) {
    console.error(`MATRIX: could not read the acceptance project's anon/service_role keys (${keys.status})`);
    process.exit(1);
  }

  const notes = [];
  for (const user of USERS) {
    // Created confirmed through the admin API so the matrix needs no mail
    // catcher against a hosted project.
    await supabase("/auth/v1/admin/users", {
      method: "POST",
      key: SERVICE_KEY,
      body: { email: user.email, password: user.password, email_confirm: true }
    });
    const signIn = await supabase("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email: user.email, password: user.password }
    });
    if (signIn.status === 200 && signIn.json?.access_token) {
      // The whole token response is the session @supabase/ssr persists.
      identities.set(user.key, { id: signIn.json.user.id, token: signIn.json.access_token, session: signIn.json, email: user.email });
    } else {
      notes.push(`${user.key}: sign-in ${signIn.status}`);
    }
  }
  const ok = identities.size === USERS.length;
  record(
    "hosted_auth_real_identities",
    ok,
    ok
      ? `${USERS.length} GoTrue identities created and signed in against ${SUPABASE_URL}`
      : `identity setup incomplete: ${notes.join("; ")}`
  );
  if (!ok) { finish(); }
}

const A = () => identities.get("A");
const B = () => identities.get("B");

// --- 1. Delivery-route lifecycle: disabled -> scoped -> rollback --------------
// `briefcaseItemId` is the body key the route reads; anything else is a 400
// before the delivery control is ever consulted.
async function probeRenderAs(identity, briefcaseItemId = crypto.randomUUID()) {
  const cookie = identity ? sessionCookieHeader(identity.session) : null;
  const res = await app("/api/expungement-ai/packet/render", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
    body: { briefcaseItemId }
  });
  return { status: res.status, reason: String(res.json?.reason ?? res.json?.error ?? "") };
}

const probeRender = (authenticated) => probeRenderAs(authenticated ? A() : null);

{
  await killApp();
  const up = await startApp({}, "app-disabled.log");
  const anon = await probeRender(false);
  const authed = await probeRender(true);
  record(
    "delivery_disabled_by_default",
    up && authed.status === 503 && anon.status === 401,
    `no flag set, production build against the hosted project: authenticated=${authed.status} ("${authed.reason.slice(0, 70)}"), anonymous=${anon.status} — 503 proves the delivery control answered, not authentication`
  );
  evidence.cases.disabled = { authenticated: authed.status, anonymous: anon.status };
}

{
  await killApp();
  const up = await startApp(
    { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped", RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: `${A().id},acceptance-scope-2` },
    "app-scoped-prod.log"
  );
  const authed = await probeRender(true);
  record(
    "scoped_refused_in_production_runtime",
    up && authed.status === 503,
    `staging_scoped under a production build: the in-scope identity A still gets ${authed.status} — a production runtime refuses the scoped state outright, which is the control's fail-closed design and the reason a hosted Vercel deployment cannot serve this journey`
  );
  evidence.cases.scopedUnderProductionBuild = { authenticated: authed.status };
}

{
  // The only runtime in which the scoped state can execute at all.
  await killApp();
  const up = await startApp(
    { RCAP_CONSUMER_DELIVERY_ROUTE_STATE: "staging_scoped", RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: `${A().id},acceptance-scope-2` },
    "app-scoped-dev.log",
    "dev"
  );
  const anon = await probeRenderAs(null);
  const inScope = await probeRenderAs(A());
  // B is a real, signed-in, authenticated participant who is simply not named
  // by the scope. Distinguishing A from B is the whole point of the case.
  const outOfScope = await probeRenderAs(B());

  // What this case can honestly prove is which side of the DELIVERY CONTROL
  // each caller lands on, and 503 is that control's own answer. Requiring a
  // specific downstream code from A would be asserting something else — how far
  // past the gate a synthetic item happens to get — and would fail for reasons
  // that have nothing to do with the scope. Past the gate is the property.
  const admittedA = inScope.status !== 503 && inScope.status !== 401;
  const pass = up && admittedA && outOfScope.status === 503 && anon.status === 401;
  record(
    "scoped_admits_only_its_named_identity",
    pass,
    `dev-compiled runtime against the hosted project: in-scope A=${inScope.status} (past the delivery gate: ${admittedA}), out-of-scope authenticated B=${outOfScope.status} (must be 503, the control's own refusal), anonymous=${anon.status}`
  );
  evidence.cases.scopedUnderDevRuntime = { inScopeA: inScope.status, outOfScopeB: outOfScope.status, anonymous: anon.status };
}

{
  await killApp();
  const up = await startApp({}, "app-rolledback.log");
  const authed = await probeRender(true);
  record(
    "rollback_restores_disabled",
    up && authed.status === 503,
    `after the rollback rehearsal: the identity the scope had previously admitted gets ${authed.status} — the disabled default is restored`
  );
  evidence.cases.rollback = { authenticated: authed.status };
}

// --- 2. Journey classification through the evaluation surface ----------------
// The application is left running in its ROLLED-BACK (disabled) state for
// these, which is the state Roger's acceptance will meet it in.
// No default profileVersion. The compiled profiles carry a dated version string
// and the engine answers a mismatch with 409, so a placeholder default would
// turn every journey into a version error that still looked like "the route did
// not open payment". The fixture carries the version on every probe.
async function evaluate(jurisdiction, answers, profileVersion) {
  if (!profileVersion) throw new Error("MATRIX: every journey probe must carry an explicit profileVersion");
  return app("/api/expungement-ai/evaluate", {
    method: "POST",
    body: { jurisdiction, profileVersion, matterId: crypto.randomUUID(), answers }
  });
}

{
  const journeys = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-all50/hosted-acceptance-journeys.json"), "utf8"));

  for (const [caseId, spec] of Object.entries(journeys.cases)) {
    // The generated fixture still documents representative sponsored route
    // inputs, but an evaluation response cannot prove checkout bypass. The
    // required case is registered below only after a real persisted partner,
    // entitlement, RCAP session and owned Briefcase item survive an
    // authenticated HTTP POST to the actual Checkout route.
    if (caseId === "sponsored_session_never_opens_payment") continue;
    const results = [];
    for (const probe of spec.probes) {
      const res = await evaluate(probe.jurisdiction, probe.answers, probe.profileVersion);
      results.push({
        label: probe.label,
        status: res.status,
        resultCode: res.json?.resultCode ?? null,
        paymentAllowed: res.json?.paymentAllowed ?? null,
        selectedTrackId: res.json?.selectedTrackId ?? null
      });
    }
    // Every journey in this group asserts the same safety property: the route
    // did not open payment. A probe the engine could not evaluate at all is a
    // failure, not a pass by absence.
    const answered = results.filter((r) => r.status === 200);
    const anyPaid = results.some((r) => r.paymentAllowed === true);
    const pass = answered.length === results.length && !anyPaid;
    record(
      caseId,
      pass,
      pass
        ? `${results.length}/${results.length} probes evaluated against the hosted deployment and none opened payment: ${results.map((r) => `${r.label}=${r.resultCode}`).join(", ")}`
        : `${answered.length}/${results.length} evaluated; paymentAllowed=true on ${results.filter((r) => r.paymentAllowed === true).map((r) => r.label).join(", ") || "none"}; statuses ${results.map((r) => `${r.label}:${r.status}`).join(", ")}`
    );
    evidence.cases[caseId] = { intent: spec.intent, results };
  }
}

// --- 3. Partner-covered journey through the authenticated Checkout route -----
// This is deliberately a real database relationship, not a request-body hint:
//
//   partner_records -> partner_entitlement -> screening_sessions
//                                      \-> consumer_briefcase_items
//
// The application resolves sponsorship from the server-owned screening row.
// The participant can name only their owned Briefcase item. A successful case
// is the exact partner-specific 403 before Stripe/payment/job code, with every
// payment binding still null and every persisted fixture byte unchanged.
{
  const nonce = crypto.randomUUID();
  const partnerId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const itemId = crypto.randomUUID();
  const partnerSlug = `acceptance-sponsored-${nonce.replaceAll("-", "").slice(0, 16)}`;
  const partnerExternalId = `acceptance-${nonce}`;
  const expectedError = "Checkout is not used for partner-sponsored RCAP sessions.";

  let seededExactly = false;
  let before = null;
  let checkout = null;
  let after = null;
  let journeyError = null;
  let cleanup = null;
  let cleanupReadback = null;
  let cleanupError = null;

  const readFixtureState = async (label) => {
    const rows = await mustQuery(`
      select
        (select to_jsonb(p) from (
          select id, partner_id, partner_slug, partner_name, program_tier,
                 target_state, payment_status, qualification_status,
                 provisioning_status, created_at, updated_at
            from public.partner_records
           where id = '${partnerId}' and partner_slug = '${sqlText(partnerSlug)}'
        ) p) as partner_state,
        (select to_jsonb(e) from (
          select partner_slug, screenings_allowed, screenings_used,
                 contract_note, period_label, created_at, updated_at
            from public.partner_entitlement
           where partner_slug = '${sqlText(partnerSlug)}'
        ) e) as entitlement_state,
        (select to_jsonb(s) from (
          select session_id, jurisdiction, answers, current_question_id,
                 furthest_stage, status, last_drop_question, partner_slug,
                 flow_mode, claimed_slot_state, partner_access_code_id,
                 campaign_name, attribution_source, partner_benefit_active,
                 created_at, updated_at
            from public.screening_sessions
           where session_id = '${sessionId}'
        ) s) as screening_state,
        (select to_jsonb(b) from (
          select id, user_id, source_session_id, payment_status, packet_status,
                 payment_allowed, payment_provider, checkout_session_id,
                 payment_intent_id, amount_cents, currency, receipt_url,
                 provider_event_id, payment_authority, payment_recorded_at,
                 payment_recorded_by, payment_product_id, payment_person_id,
                 payment_matter_id, created_at, updated_at
            from public.consumer_briefcase_items
           where id = '${itemId}' and user_id = '${A().id}'
        ) b) as item_state,
        (select count(*)::int from public.partner_records
          where id = '${partnerId}' and partner_slug = '${sqlText(partnerSlug)}') as partner_rows,
        (select count(*)::int from public.partner_entitlement
          where partner_slug = '${sqlText(partnerSlug)}') as entitlement_rows,
        (select count(*)::int from public.screening_sessions
          where session_id = '${sessionId}' and partner_slug = '${sqlText(partnerSlug)}') as screening_rows,
        (select count(*)::int from public.consumer_briefcase_items
          where id = '${itemId}' and user_id = '${A().id}' and source_session_id = '${sessionId}') as item_rows,
        (select count(*)::int from public.packet_render_jobs
          where briefcase_item_id = '${itemId}' or consumer_briefcase_item_id = '${itemId}') as render_jobs,
        (select count(*)::int from public.consumer_packet_payment_consumption
          where consumer_briefcase_item_id = '${itemId}') as payment_consumptions
    `, label);
    if (rows.length !== 1) throw new Error(`${label}: expected exactly one aggregate row; observed ${rows.length}`);
    return rows[0];
  };

  try {
    const seedRows = await mustQuery(`
      with inserted_partner as (
        insert into public.partner_records
          (id, partner_id, partner_slug, partner_name, program_tier,
           target_state, payment_status, qualification_status, provisioning_status)
        values
          ('${partnerId}', '${sqlText(partnerExternalId)}', '${sqlText(partnerSlug)}',
           'Hosted acceptance sponsored partner', 'implementation', 'MS',
           'paid', 'qualified', 'provisioned')
        returning id, partner_slug
      ), inserted_entitlement as (
        insert into public.partner_entitlement
          (partner_slug, screenings_allowed, screenings_used, contract_note, period_label)
        select partner_slug, 5, 1,
               'Synthetic hosted acceptance entitlement', 'hosted-acceptance'
          from inserted_partner
        returning partner_slug, screenings_allowed, screenings_used
      ), inserted_session as (
        insert into public.screening_sessions
          (session_id, jurisdiction, answers, status, partner_slug, flow_mode,
           claimed_slot_state, attribution_source, partner_benefit_active)
        select '${sessionId}', 'MS', '{}'::jsonb, 'completed', partner_slug,
               'rcap', 'consumed', 'partner_page', true
          from inserted_partner
        returning session_id, partner_slug, flow_mode, partner_benefit_active
      ), inserted_item as (
        insert into public.consumer_briefcase_items
          (id, user_id, item_type, jurisdiction, pathway_label, result_code,
           packet_type, payment_allowed, status, summary_json, next_steps_json,
           artifact_refs_json, payment_status, packet_status, source_session_id)
        select '${itemId}', '${A().id}', 'result', 'MS',
               'Hosted acceptance partner-covered packet', 'packet_ready',
               'legacy_packet', false, 'packet_ready',
               '{"note":"synthetic partner-covered acceptance fixture"}'::jsonb,
               '[]'::jsonb, '{}'::jsonb, 'not_applicable', 'not_started', session_id
          from inserted_session
        returning id, user_id, source_session_id, payment_allowed, payment_status,
                  checkout_session_id, payment_provider, amount_cents
      )
      select p.id as partner_id, p.partner_slug,
             e.screenings_allowed, e.screenings_used,
             s.session_id, s.flow_mode, s.partner_benefit_active,
             i.id as item_id, i.user_id, i.source_session_id,
             i.payment_allowed, i.payment_status, i.checkout_session_id,
             i.payment_provider, i.amount_cents
        from inserted_partner p
        join inserted_entitlement e on e.partner_slug = p.partner_slug
        join inserted_session s on s.partner_slug = p.partner_slug
        join inserted_item i on i.source_session_id = s.session_id
    `, "seed partner-covered Checkout fixture");

    const seeded = seedRows.length === 1 ? seedRows[0] : null;
    seededExactly = seeded?.partner_id === partnerId
      && seeded?.partner_slug === partnerSlug
      && Number(seeded?.screenings_allowed) === 5
      && Number(seeded?.screenings_used) === 1
      && seeded?.session_id === sessionId
      && seeded?.flow_mode === "rcap"
      && seeded?.partner_benefit_active === true
      && seeded?.item_id === itemId
      && seeded?.user_id === A().id
      && seeded?.source_session_id === sessionId
      && seeded?.payment_allowed === false
      && seeded?.payment_status === "not_applicable"
      && seeded?.checkout_session_id === null
      && seeded?.payment_provider === null
      && seeded?.amount_cents === null;
    if (!seededExactly) {
      throw new Error(`seed partner-covered Checkout fixture: returned row was not exact (${JSON.stringify(seeded)})`);
    }

    before = await readFixtureState("read partner-covered state before Checkout");
    const beforeExact = Number(before.partner_rows) === 1
      && Number(before.entitlement_rows) === 1
      && Number(before.screening_rows) === 1
      && Number(before.item_rows) === 1
      && Number(before.render_jobs) === 0
      && Number(before.payment_consumptions) === 0
      && before.screening_state?.flow_mode === "rcap"
      && before.screening_state?.partner_benefit_active === true
      && before.screening_state?.partner_slug === partnerSlug
      && before.item_state?.source_session_id === sessionId
      && before.item_state?.payment_allowed === false
      && before.item_state?.payment_status === "not_applicable"
      && before.item_state?.checkout_session_id === null
      && before.item_state?.payment_provider === null
      && before.item_state?.payment_intent_id === null
      && before.item_state?.amount_cents === null
      && before.item_state?.provider_event_id === null
      && before.item_state?.payment_authority === null
      && before.item_state?.payment_product_id === null
      && before.item_state?.payment_person_id === null
      && before.item_state?.payment_matter_id === null;
    if (!beforeExact) throw new Error(`partner-covered precondition was not exact (${JSON.stringify(before)})`);

    checkout = await app("/api/expungement-ai/checkout", {
      method: "POST",
      headers: { Cookie: sessionCookieHeader(A().session) },
      body: { briefcaseItemId: itemId }
    });
    after = await readFixtureState("read partner-covered state after Checkout");
  } catch (error) {
    journeyError = error instanceof Error ? error.message : String(error);
  }

  // Teardown uses the complete synthetic identity chain, not a broad prefix.
  // Each delete depends on the previous RETURNING set, so a missing/mismatched
  // owner or relationship fails closed instead of deleting an unrelated row.
  try {
    const cleanupRows = await mustQuery(`
      with deleted_consumptions as (
        delete from public.consumer_packet_payment_consumption
         where consumer_briefcase_item_id = '${itemId}'
        returning id
      ), deleted_item as (
        delete from public.consumer_briefcase_items
         where id = '${itemId}'
           and user_id = '${A().id}'
           and source_session_id = '${sessionId}'
           and (select count(*) from deleted_consumptions) >= 0
        returning id
      ), deleted_session as (
        delete from public.screening_sessions
         where session_id = '${sessionId}'
           and partner_slug = '${sqlText(partnerSlug)}'
           and exists (select 1 from deleted_item)
        returning session_id
      ), deleted_entitlement as (
        delete from public.partner_entitlement
         where partner_slug = '${sqlText(partnerSlug)}'
           and exists (select 1 from deleted_session)
        returning partner_slug
      ), deleted_partner as (
        delete from public.partner_records
         where id = '${partnerId}'
           and partner_id = '${sqlText(partnerExternalId)}'
           and partner_slug = '${sqlText(partnerSlug)}'
           and exists (select 1 from deleted_entitlement)
        returning id
      )
      select
        (select count(*)::int from deleted_consumptions) as payment_consumptions,
        (select count(*)::int from deleted_item) as items,
        (select count(*)::int from deleted_session) as sessions,
        (select count(*)::int from deleted_entitlement) as entitlements,
        (select count(*)::int from deleted_partner) as partners
    `, "clean partner-covered Checkout fixture");
    cleanup = cleanupRows.length === 1 ? cleanupRows[0] : null;

    const readbackRows = await mustQuery(`
      select
        (select count(*)::int from public.partner_records
          where id = '${partnerId}' or partner_id = '${sqlText(partnerExternalId)}' or partner_slug = '${sqlText(partnerSlug)}') as partners,
        (select count(*)::int from public.partner_entitlement
          where partner_slug = '${sqlText(partnerSlug)}') as entitlements,
        (select count(*)::int from public.screening_sessions
          where session_id = '${sessionId}' or partner_slug = '${sqlText(partnerSlug)}') as sessions,
        (select count(*)::int from public.consumer_briefcase_items
          where id = '${itemId}' or (user_id = '${A().id}' and source_session_id = '${sessionId}')) as items,
        (select count(*)::int from public.packet_render_jobs
          where briefcase_item_id = '${itemId}' or consumer_briefcase_item_id = '${itemId}') as render_jobs,
        (select count(*)::int from public.consumer_packet_payment_consumption
          where consumer_briefcase_item_id = '${itemId}') as payment_consumptions
    `, "prove partner-covered Checkout fixture cleanup");
    cleanupReadback = readbackRows.length === 1 ? readbackRows[0] : null;
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
  }

  const exactResponse = checkout?.status === 403
    && checkout?.json?.error === expectedError
    && Object.keys(checkout?.json ?? {}).length === 1;
  const persistedStateUnchanged = Boolean(before && after)
    && JSON.stringify(after.partner_state) === JSON.stringify(before.partner_state)
    && JSON.stringify(after.entitlement_state) === JSON.stringify(before.entitlement_state)
    && JSON.stringify(after.screening_state) === JSON.stringify(before.screening_state)
    && JSON.stringify(after.item_state) === JSON.stringify(before.item_state);
  const noSideEffects = Boolean(after)
    && Number(after.partner_rows) === 1
    && Number(after.entitlement_rows) === 1
    && Number(after.screening_rows) === 1
    && Number(after.item_rows) === 1
    && Number(after.render_jobs) === 0
    && Number(after.payment_consumptions) === 0
    && after.item_state?.payment_allowed === false
    && after.item_state?.payment_status === "not_applicable"
    && after.item_state?.checkout_session_id === null
    && after.item_state?.payment_provider === null
    && after.item_state?.payment_intent_id === null
    && after.item_state?.amount_cents === null
    && after.item_state?.provider_event_id === null
    && after.item_state?.payment_authority === null
    && after.item_state?.payment_product_id === null
    && after.item_state?.payment_person_id === null
    && after.item_state?.payment_matter_id === null;
  const cleanupExact = !cleanupError
    && (!seededExactly || (
      Number(cleanup?.payment_consumptions) === 0
      && Number(cleanup?.items) === 1
      && Number(cleanup?.sessions) === 1
      && Number(cleanup?.entitlements) === 1
      && Number(cleanup?.partners) === 1
    ))
    && Number(cleanupReadback?.partners) === 0
    && Number(cleanupReadback?.entitlements) === 0
    && Number(cleanupReadback?.sessions) === 0
    && Number(cleanupReadback?.items) === 0
    && Number(cleanupReadback?.render_jobs) === 0
    && Number(cleanupReadback?.payment_consumptions) === 0;
  const passed = !journeyError && seededExactly && exactResponse
    && persistedStateUnchanged && noSideEffects && cleanupExact;

  record(
    "sponsored_session_never_opens_payment",
    passed,
    passed
      ? `authenticated POST ${APP_URL}/api/expungement-ai/checkout returned the exact partner-sponsored 403; Checkout binding/session, payment, entitlement, RCAP session and render-job state were unchanged; exact synthetic rows removed`
      : `seed exact=${seededExactly}; POST=${checkout?.status ?? "not reached"}; error=${JSON.stringify(checkout?.json?.error ?? null)}; state unchanged=${persistedStateUnchanged}; no side effects=${noSideEffects}; cleanup exact=${cleanupExact}; journey error=${journeyError ?? "none"}; cleanup error=${cleanupError ?? "none"}`
  );
  evidence.cases.sponsored_session_never_opens_payment = {
    authenticatedUserId: A().id,
    endpoint: `${APP_URL}/api/expungement-ai/checkout`,
    hostedAuthority: SUPABASE_URL,
    expectedStatus: 403,
    expectedError,
    observedStatus: checkout?.status ?? null,
    observedError: checkout?.json?.error ?? null,
    seededExactly,
    preCheckoutState: before,
    postCheckoutState: after,
    persistedStateUnchanged,
    noCheckoutBindingSessionJobOrPaymentMutation: noSideEffects,
    cleanupExact,
    cleanup,
    cleanupReadback,
    journeyError,
    cleanupError
  };
}

// --- 4. Security and isolation, straight through PostgREST -------------------
{
  const seed = await query(`
    insert into public.consumer_briefcase_items
      (user_id, item_type, jurisdiction, status, summary_json, payment_status)
    values ('${A().id}', 'result', 'MS', 'guidance_saved',
            '{"note":"hosted acceptance isolation fixture"}'::jsonb, 'unpaid')
    returning id
  `);
  const itemId = Array.isArray(seed.json) ? seed.json[0]?.id : null;

  const asB = await supabase(`/rest/v1/consumer_briefcase_items?id=eq.${itemId}`, { token: B().token });
  const rows = Array.isArray(asB.json) ? asB.json.length : -1;
  record(
    "cross_tenant_read_denied",
    rows === 0,
    `participant B reading participant A's item through PostgREST on the hosted project: status ${asB.status}, rows returned ${rows} (must be 0)`
  );

  const patch = await supabase(`/rest/v1/consumer_briefcase_items?id=eq.${itemId}`, {
    method: "PATCH",
    token: A().token,
    body: { payment_status: "paid" },
    headers: { Prefer: "return=representation" }
  });
  const after = await query(`select payment_status from public.consumer_briefcase_items where id = '${itemId}'`);
  const value = Array.isArray(after.json) ? after.json[0]?.payment_status : null;
  record(
    "payment_write_denied_through_postgrest",
    value === "unpaid",
    `the OWNER patching their own row's payment_status through PostgREST returned ${patch.status}; the stored value is still '${value}' (must be 'unpaid') — this is the RCAP-SEC-001 forgery attempted over HTTP rather than in SQL`
  );
  evidence.cases.isolation = { crossTenantRows: rows, ownerPatchStatus: patch.status, storedPaymentStatus: value };

  await query(`delete from public.consumer_briefcase_items where id = '${itemId}'`);
}

{
  const anon = await supabase("/rest/v1/rcap_persons?select=id&limit=1");
  const authed = await supabase("/rest/v1/rcap_persons?select=id&limit=1", { token: A().token });
  const denied = (status, json) => status === 401 || status === 403 || status === 404
    || (status === 200 && Array.isArray(json) && json.length === 0);
  const pass = denied(anon.status, anon.json) && denied(authed.status, authed.json);
  record(
    "browser_role_person_access_denied",
    pass,
    `phase 54 through Kong/PostgREST on the hosted project: anon=${anon.status}, authenticated=${authed.status} — neither browser role reaches rcap_persons`
  );
  evidence.cases.personNamespace = { anon: anon.status, authenticated: authed.status };
}

// --- 5. The pinned worker image against the hosted project -------------------
{
  if (!WORKER_DIGEST_REF) {
    record("worker_digest_runs_against_hosted_project", false, "HOSTED_WORKER_DIGEST_REF was not supplied, so the pinned image was never exercised");
  } else {
    const run = spawnSync("docker", [
      "run", "--rm", "--name", "hosted-acceptance-worker",
      // getSupabaseAdminClient reads NEXT_PUBLIC_SUPABASE_URL, not SUPABASE_URL.
      // Passing only the latter left the worker with no configured storage and
      // it exited 2 before claiming anything.
      "-e", `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
      "-e", `SUPABASE_URL=${SUPABASE_URL}`,
      "-e", `SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}`,
      WORKER_DIGEST_REF,
      // The image's own CMD is `--loop`, and the loop only stops on SIGTERM —
      // RCAP_WORKER_MAX_BATCHES and RCAP_WORKER_EXIT_WHEN_DRAINED are not
      // variables this worker reads, so the previous run polled an empty queue
      // until the harness timeout killed it and reported exit null. Overriding
      // the command drops `--loop`, which is this worker's own single-cycle
      // mode: claim once, or report idle, and exit.
      "node", "scripts/rcap-render-worker.mjs"
    ], { encoding: "utf8", timeout: 240000 });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    // Draining an empty queue cleanly is the assertion: the image pulled by
    // digest starts, authenticates to the hosted project, finds no claimable
    // job, and exits without error.
    const pass = run.status === 0;
    record(
      "worker_digest_runs_against_hosted_project",
      pass,
      pass
        ? `${WORKER_DIGEST_REF} started, reached ${SUPABASE_URL}, drained the queue and exited 0`
        : `worker exited ${run.status}: ${output.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***").slice(-400)}`
    );
    evidence.cases.worker = { ref: WORKER_DIGEST_REF, exitCode: run.status };
  }
}

// Teardown, not an assertion. A stubborn process here must not turn a passing
// matrix into a failing one — the verdict is already decided by the cases.
await killApp().catch((error) => console.warn(`  note: ${error.message}`));
finish();

function finish() {
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "matrix.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`MATRIX INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`MATRIX FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`MATRIX PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} golden-journey cases against ${PROJECT_REF}.`);
  process.exit(evidence.passed ? 0 : 1);
}
