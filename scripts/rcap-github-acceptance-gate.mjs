#!/usr/bin/env node
// GitHub Actions-hosted temporary HTTPS acceptance Checkout gate.
//
// This script never deploys, migrates, completes a payment, runs the worker, or
// cleans up its fixture. It verifies the workflow-owned temporary HTTPS host,
// checks the existing Stripe sandbox webhook before any external write, creates exactly
// one Checkout Session through the deployed application, proves that both the
// Session and Briefcase item remain unpaid, emits Roger's direct Stripe-hosted
// URL, and stops.

import crypto from "node:crypto";
import { checkoutMetadataExpectation, checkoutMetadataEvidence } from "./rcap-checkout-metadata-contract.mjs";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

import { claimAndVerifyHostedFixture, HOSTED_FINAL_REVIEW_ANSWERS } from "./rcap-hosted-final-verification.mjs";
import { readPaRefusal, paRefusalEvidence, MS_CHECKOUT, msMappingEvidence } from "./rcap-hosted-checkout-route-contract.mjs";
import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: ROOT });
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "github-checkout-gate.json");

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const PUBLIC_URL = (process.env.HOSTED_PUBLIC_URL ?? "").replace(/\/+$/, "");
const TOOLS_SHA = process.env.HOSTED_TOOLS_SHA ?? "";
const WORKER_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const STRIPE_KEY = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
const GATE_PHASE = process.env.RCAP_GITHUB_ACCEPTANCE_PHASE ?? "checkout";
const CHECKOUT_SESSION_ID = process.env.HOSTED_CHECKOUT_SESSION_ID ?? "";
const BRIEFCASE_ITEM_ID = process.env.HOSTED_BRIEFCASE_ITEM_ID ?? "";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const applicationShaExact = /^[0-9a-f]{40}$/.test(APPLICATION_SHA);
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_WORKER_DIGEST = "sha256:80c6da8c14cd8f09bba81a2b8d0385ac2b2f40bbde16464acc80aa83db0e4813";
const EXPECTED_WORKER_REF = `ghcr.io/roger-legalease/rcap-render-worker@${EXPECTED_WORKER_DIGEST}`;
const CONSUMER_PACKET_STORAGE_PATHWAY = "source_engine_packet_plan";
const EXPECTED_EVENTS = [
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
].sort();

const secrets = [SUPABASE_ACCESS_TOKEN, STRIPE_KEY].filter(Boolean);
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text
    .replace(/sk_(test|live)_[A-Za-z0-9_]+/g, "***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-github-acceptance-checkout-gate/v1",
  applicationSha: APPLICATION_SHA,
  toolsSha: TOOLS_SHA,
  acceptanceProjectRef: PROJECT_REF,
  hostedEnvironment: "GitHub Actions runner + Cloudflare Quick Tunnel",
  publicUrl: PUBLIC_URL,
  workerDigest: EXPECTED_WORKER_DIGEST,
  stripeMode: "sandbox",
  deploymentCreated: false,
  migrationApplied: false,
  syntheticCompletionCreated: false,
  workerRun: false,
  fixtureRetainedForRoger: false,
  vercelProtectionParametersUsed: false,
  phase: GATE_PHASE,
  cases: {}
};

function record(caseId, passed, observed, details = undefined) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed), ...(details === undefined ? {} : { details }) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new GateFailure(caseId, observed);
}

class GateFailure extends Error {
  constructor(caseId, message) {
    super(`${caseId}: ${sanitize(message)}`);
    this.name = "GateFailure";
    this.caseId = caseId;
  }
}

function writeEvidence() {
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

function sqlText(value) {
  return String(value).split("'").join("''");
}

function deterministicUuid(seed) {
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  const variant = ((parseInt(digest[16], 16) & 0x3) | 0x8).toString(16);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${variant}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

async function managementApi(pathname, { method = "GET", body = null } = {}) {
  const response = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body === null ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced through sanitized text */ }
  return { status: response.status, ok: response.ok, json, text: sanitize(text).slice(0, 500) };
}

async function sql(query) {
  return managementApi(`/v1/projects/${PROJECT_REF}/database/query`, { method: "POST", body: { query } });
}

async function stripeGet(pathname, params = {}) {
  const url = new URL(`https://api.stripe.com${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) for (const item of value) url.searchParams.append(key, String(item));
    else if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced through sanitized text */ }
  return { status: response.status, ok: response.ok, json, text: sanitize(text).slice(0, 500) };
}

async function listStripeCollection(pathname, params = {}) {
  const rows = [];
  let startingAfter = null;
  for (let page = 0; page < 100; page += 1) {
    const response = await stripeGet(pathname, {
      ...params,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });
    if (!response.ok || !Array.isArray(response.json?.data)) {
      throw new GateFailure("stripe_collection_readable", `${pathname} returned ${response.status}: ${response.text}`);
    }
    rows.push(...response.json.data);
    if (!response.json.has_more) return rows;
    startingAfter = response.json.data.at(-1)?.id ?? null;
    if (!startingAfter) throw new GateFailure("stripe_collection_paginated", `${pathname} reported has_more without a last id`);
  }
  throw new GateFailure("stripe_collection_paginated", `${pathname} exceeded 100 pages`);
}

const SSR_COOKIE_CHUNK_SIZE = 3180;
function sessionCookieHeader(session) {
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  if (value.length <= SSR_COOKIE_CHUNK_SIZE) return `${name}=${value}`;
  const chunks = [];
  for (let index = 0; index < value.length; index += SSR_COOKIE_CHUNK_SIZE) {
    chunks.push(`${name}.${chunks.length}=${value.slice(index, index + SSR_COOKIE_CHUNK_SIZE)}`);
  }
  return chunks.join("; ");
}

async function signIn(email, password, anonKey) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const json = await response.json().catch(() => null);
  return response.status === 200 && json?.user?.id
    ? { id: json.user.id, email, cookie: sessionCookieHeader(json) }
    : null;
}

async function observe(url, { method = "GET", headers = {}, body = undefined } = {}) {
  try {
    const response = await fetch(url, { method, headers, body, redirect: "manual" });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON recorded below */ }
    return {
      status: response.status,
      json,
      bodyHead: sanitize(text).slice(0, 240),
      contentType: response.headers.get("content-type") ?? "",
      location: sanitize(response.headers.get("location") ?? "")
    };
  } catch (error) {
    return { status: `unreachable: ${sanitize(error.message)}`, json: null, bodyHead: "", contentType: "", location: "" };
  }
}

async function callApp(hostedUrl, pathname, { method = "GET", cookie = null, body = null } = {}) {
  return observe(new URL(pathname, hostedUrl), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body === null ? undefined : JSON.stringify(body)
  });
}

function sameStringSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function endpointShape(urlText) {
  try {
    const url = new URL(urlText);
    return {
      host: url.host,
      pathname: url.pathname,
      queryParameterNames: [...new Set(url.searchParams.keys())].sort()
    };
  } catch {
    return { host: "(invalid URL)", pathname: "", queryParameterNames: [] };
  }
}

async function checkoutSessionsForItem(itemId, createdGte) {
  const sessions = await listStripeCollection("/v1/checkout/sessions", { "created[gte]": createdGte });
  return sessions.filter(
    (session) => session.client_reference_id === itemId || session.metadata?.briefcase_item_id === itemId
  );
}

async function main() {
  const missing = [
    ["HOSTED_APPLICATION_SHA", APPLICATION_SHA],
    ["ACCEPTANCE_SUPABASE_PROJECT_REF", PROJECT_REF],
    ["HOSTED_PUBLIC_URL", PUBLIC_URL],
    ["HOSTED_TOOLS_SHA", TOOLS_SHA],
    ["HOSTED_WORKER_DIGEST_REF", WORKER_REF],
    ["SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN],
    ["HOSTED_STRIPE_TEST_SECRET", STRIPE_KEY],
    ...(GATE_PHASE === "payment"
      ? [["HOSTED_CHECKOUT_SESSION_ID", CHECKOUT_SESSION_ID], ["HOSTED_BRIEFCASE_ITEM_ID", BRIEFCASE_ITEM_ID]]
      : [])
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new GateFailure("required_inputs_present", `missing ${missing.join(", ")}`);

  let hostedUrl = null;
  try { hostedUrl = new URL(PUBLIC_URL); } catch { /* rejected below */ }

  record(
    "immutable_inputs_exact",
    applicationShaExact
      && PROJECT_REF === EXPECTED_PROJECT_REF
      && WORKER_REF === EXPECTED_WORKER_REF
      && /^[0-9a-f]{40}$/.test(TOOLS_SHA)
      && STRIPE_KEY.startsWith("sk_test_")
      && hostedUrl?.protocol === "https:"
      && hostedUrl?.hostname.endsWith(".trycloudflare.com")
      && hostedUrl.pathname === "/"
      && hostedUrl.search === ""
      && ["webhook", "checkout", "payment"].includes(GATE_PHASE),
    `application=${APPLICATION_SHA}; tools=${TOOLS_SHA}; project=${PROJECT_REF}; worker=${WORKER_REF}; Stripe key is sk_test_=${STRIPE_KEY.startsWith("sk_test_")}; host=${hostedUrl?.host ?? "invalid"}`
  );
  const publicOrigin = hostedUrl.origin;
  const previewUrl = publicOrigin;
  evidence.host = {
    provider: "github_actions_cloudflare_quick_tunnel",
    origin: publicOrigin,
    applicationSha: APPLICATION_SHA,
    toolsSha: TOOLS_SHA,
    target: "temporary acceptance",
    production: false
  };

  // Compare the real Stripe sandbox destination before any external write or
  // Checkout creation. GitHub-hosted staging has no Vercel query parameter.
  const endpoints = await listStripeCollection("/v1/webhook_endpoints");
  const canonicalCandidates = endpoints.filter((endpoint) => {
    try { return new URL(endpoint.url).pathname === "/api/stripe/webhook"; } catch { return false; }
  });
  record(
    "single_existing_canonical_webhook_destination",
    canonicalCandidates.length === 1,
    `${canonicalCandidates.length} existing Stripe sandbox destination(s) use /api/stripe/webhook`
  );
  const webhook = canonicalCandidates[0];
  const currentWebhookUrl = new URL(webhook.url);
  const requiredWebhookUrl = new URL("/api/stripe/webhook", publicOrigin);
  const eventSetOk = sameStringSet(webhook.enabled_events ?? [], EXPECTED_EVENTS);
  record(
    "webhook_event_set_and_mode_preserved",
    webhook.status === "enabled" && webhook.livemode === false && eventSetOk,
    `endpoint=${webhook.id}; status=${webhook.status}; livemode=${webhook.livemode}; events=${JSON.stringify([...(webhook.enabled_events ?? [])].sort())}`
  );
  const queryNames = [...new Set(currentWebhookUrl.searchParams.keys())].sort();
  const webhookUrlExact = currentWebhookUrl.origin === requiredWebhookUrl.origin
    && currentWebhookUrl.pathname === requiredWebhookUrl.pathname
    && queryNames.length === 0;
  evidence.webhookDestination = {
    endpointId: webhook.id,
    current: endpointShape(webhook.url),
    required: { host: requiredWebhookUrl.host, pathname: requiredWebhookUrl.pathname, queryParameterNames: [] },
    exact: webhookUrlExact,
    enabledEvents: [...(webhook.enabled_events ?? [])].sort(),
    editExistingDestinationOnly: true,
    signingSecretMustRemainUnchanged: true
  };

  // Prove the temporary public origin and webhook route reach the accepted
  // application before asking Roger to edit any external destination.
  const health = await observe(`${previewUrl}/api/health`);
  const applicationHealth = (result) => result.status === 200 && result.json && typeof result.json.checks === "object";
  record(
    "temporary_https_host_reaches_application_json",
    applicationHealth(health),
    `status=${health.status}; content-type=${health.contentType}; location=${health.location || "(none)"}; application JSON=${applicationHealth(health)}`
  );
  evidence.health = {
    status: health.status,
    applicationJson: applicationHealth(health),
    protectionBypassUsed: false
  };

  const webhookProbe = await observe(requiredWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  record(
    "canonical_webhook_reaches_application",
    webhookProbe.status === 400 && webhookProbe.json?.error === "Missing Stripe signature.",
    `unsigned POST=${webhookProbe.status}; application error=${JSON.stringify(webhookProbe.json?.error ?? null)}`
  );

  if (!webhookUrlExact) {
    evidence.outcome = "stripe_webhook_url_update_required";
    evidence.passed = false;
    writeEvidence();
    console.log("STRIPE WEBHOOK URL UPDATE REQUIRED");
    console.log(`  current host: ${currentWebhookUrl.host}`);
    console.log(`  required host: ${requiredWebhookUrl.host}`);
    console.log(`  required endpoint: ${requiredWebhookUrl.toString()}`);
    console.log("  edit the existing destination only; preserve its signing secret and six event types");
    process.exit(78);
  }
  record("canonical_webhook_destination_exact", true, `existing endpoint ${webhook.id} targets the temporary HTTPS host with no query parameters`);

  if (GATE_PHASE === "webhook") {
    evidence.outcome = "canonical_webhook_exact";
    evidence.passed = true;
    writeEvidence();
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, "webhook_exact=true\n");
    console.log(`CANONICAL WEBHOOK READY — ${requiredWebhookUrl.toString()}`);
    return;
  }

  if (GATE_PHASE === "payment") {
    record(
      "payment_watch_identifiers_exact",
      /^cs_test_[A-Za-z0-9_]+$/.test(CHECKOUT_SESSION_ID)
        && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(BRIEFCASE_ITEM_ID),
      `Stripe Session=${CHECKOUT_SESSION_ID}; Briefcase item=${BRIEFCASE_ITEM_ID}`
    );

    const sessionResponse = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(CHECKOUT_SESSION_ID)}`);
    const session = sessionResponse.json;
    record(
      "payment_watch_session_identity_and_mode_exact",
      sessionResponse.status === 200
        && session?.id === CHECKOUT_SESSION_ID
        && session?.mode === "payment"
        && session?.livemode === false
        && session?.client_reference_id === BRIEFCASE_ITEM_ID
        && session?.metadata?.briefcase_item_id === BRIEFCASE_ITEM_ID
        && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session?.metadata?.user_id ?? "")
        && session?.amount_total === 5000
        && session?.amount_subtotal === 5000
        && String(session?.currency ?? "").toLowerCase() === "usd",
      `GET=${sessionResponse.status}; id=${session?.id ?? "(none)"}; livemode=${session?.livemode}; item=${session?.client_reference_id ?? "(none)"}; amount=${session?.amount_total}; currency=${session?.currency}`
    );

    const itemResponse = await sql(`
      select id, user_id, payment_status, payment_provider, checkout_session_id,
             amount_cents, packet_status, provider_event_id
        from public.consumer_briefcase_items
       where id = '${BRIEFCASE_ITEM_ID}'
    `);
    const countsResponse = await sql(`
      select
        (select count(*)::int from public.packet_render_jobs where briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as jobs,
        (select count(*)::int from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as consumptions
    `);
    const eventsResponse = await sql(`
      select stripe_event_id, event_type, related_object_id
       from public.processed_stripe_events
       where related_object_id = '${CHECKOUT_SESSION_ID}'
       order by processed_at, stripe_event_id
    `);
    record(
      "payment_watch_database_reads_succeeded",
      itemResponse.ok && countsResponse.ok && eventsResponse.ok,
      `item SQL=${itemResponse.status}; counts SQL=${countsResponse.status}; events SQL=${eventsResponse.status}`
    );
    const itemRows = Array.isArray(itemResponse.json) ? itemResponse.json : [];
    const item = itemRows[0] ?? null;
    const counts = Array.isArray(countsResponse.json) ? countsResponse.json[0] ?? null : null;
    const events = Array.isArray(eventsResponse.json) ? eventsResponse.json : [];
    const authorityResponse = await sql(`
      select valid, reason, provider_event_id
        from public.consumer_packet_payment_authority(
          '${BRIEFCASE_ITEM_ID}'::uuid,
          '${sqlText(session?.metadata?.user_id ?? "00000000-0000-0000-0000-000000000000")}'::uuid
        )
    `);
    const authority = Array.isArray(authorityResponse.json) ? authorityResponse.json[0] ?? null : null;
    record(
      "payment_watch_authority_read_succeeded",
      authorityResponse.ok,
      `authority SQL=${authorityResponse.status}; valid=${authority?.valid}; reason=${authority?.reason ?? "(none)"}`
    );
    const completedEvent = events.find((candidate) => candidate.event_type === "checkout.session.completed") ?? null;
    const stripePaid = session?.status === "complete" && session?.payment_status === "paid";
    const webhookApplied = itemRows.length === 1
      && item?.payment_status === "paid"
      && item?.payment_provider === "stripe"
      && item?.user_id === session?.metadata?.user_id
      && item?.checkout_session_id === CHECKOUT_SESSION_ID
      && Number(item?.amount_cents) === 5000
      && /^evt_[A-Za-z0-9_]+$/.test(item?.provider_event_id ?? "")
      && events.length === 1
      && completedEvent?.stripe_event_id === item?.provider_event_id
      && completedEvent?.related_object_id === CHECKOUT_SESSION_ID
      && authority?.valid === true
      && authority?.reason === "authorized"
      && authority?.provider_event_id === item?.provider_event_id
      && Number(counts?.consumptions) === 0
      && Number(counts?.jobs) === 1;
    evidence.paymentObservation = {
      checkoutSessionId: CHECKOUT_SESSION_ID,
      briefcaseItemId: BRIEFCASE_ITEM_ID,
      stripeStatus: session?.status ?? null,
      stripePaymentStatus: session?.payment_status ?? null,
      databasePaymentStatus: item?.payment_status ?? null,
      providerEventId: item?.provider_event_id ?? null,
      paymentAuthority: authority,
      processedEvents: events.map((candidate) => ({
        id: candidate.stripe_event_id,
        type: candidate.event_type,
        relatedObjectId: candidate.related_object_id
      })),
      paymentConsumptionsBeforeWorker: Number(counts?.consumptions ?? 0),
      renderJobsEnqueuedByCanonicalWebhook: Number(counts?.jobs ?? 0),
      workerRunByThisWorkflow: false
    };
    if (!stripePaid || !webhookApplied) {
      evidence.outcome = "real_payment_pending";
      evidence.passed = false;
      writeEvidence();
      console.log(
        `REAL PAYMENT PENDING — Stripe paid=${stripePaid}; webhook evidence exact=${webhookApplied}; `
        + `events=${events.length}; payment authority=${authority?.valid === true}; consumptions=${Number(counts?.consumptions ?? 0)}; jobs=${Number(counts?.jobs ?? 0)}`
      );
      process.exit(75);
    }
    record(
      "real_stripe_payment_and_canonical_webhook_observed",
      true,
      `Session=${CHECKOUT_SESSION_ID}; event=${completedEvent.stripe_event_id}; one authoritative paid item; consumption remains zero before the worker`
    );
    const continuationUrl = new URL(session.success_url.replace("{CHECKOUT_SESSION_ID}", CHECKOUT_SESSION_ID));
    record(
      "same_host_continuation_url_exact",
      continuationUrl.origin === publicOrigin
        && continuationUrl.pathname === `/briefcase/${encodeURIComponent(BRIEFCASE_ITEM_ID)}`
        && continuationUrl.searchParams.get("payment") === "return"
        && continuationUrl.searchParams.get("session_id") === CHECKOUT_SESSION_ID,
      `continuation=${sanitize(continuationUrl.toString())}`
    );
    const continuationProbe = await observe(continuationUrl);
    evidence.continuation = {
      url: continuationUrl.toString(),
      origin: continuationUrl.origin,
      sameTemporaryHost: continuationUrl.origin === publicOrigin,
      unauthenticatedProbeStatus: continuationProbe.status,
      runnerKeepsHostAliveAfterObservation: true
    };
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `continuation_url=${continuationUrl.toString()}\n`);
    }

    const jobResponse = await sql(`
      select id, briefcase_item_id, status
        from public.packet_render_jobs
       where briefcase_item_id = '${BRIEFCASE_ITEM_ID}'
       order by created_at, id
    `);
    const jobs = Array.isArray(jobResponse.json) ? jobResponse.json : [];
    record(
      "exactly_one_webhook_queued_render_job_exists",
      jobResponse.ok && jobs.length === 1 && jobs[0]?.briefcase_item_id === BRIEFCASE_ITEM_ID,
      `SQL=${jobResponse.status}; jobs=${jobs.length}; id=${jobs[0]?.id ?? "(none)"}; status=${jobs[0]?.status ?? "(none)"}`
    );
    evidence.paymentObservation.renderJobsAfterWebhookReadback = jobs.length;
    evidence.paymentObservation.renderJob = jobs[0] ?? null;
    evidence.paymentObservation.renderRequestIssuedByWatcher = false;

    evidence.outcome = "real_payment_and_webhook_observed";
    evidence.passed = true;
    writeEvidence();
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, [
        "payment_observed=true",
        `provider_event_id=${completedEvent.stripe_event_id}`
      ].join("\n") + "\n");
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
        "## Real Stripe payment and canonical webhook observed",
        "",
        `- Checkout Session: ${CHECKOUT_SESSION_ID}`,
        `- Stripe event: ${completedEvent.stripe_event_id}`,
        `- Same-host continuation: ${continuationUrl.toString()}`,
        "- One server-authoritative payment and one render job exist; consumption remains zero because the worker has not run",
        ""
      ].join("\n"));
    }
    console.log(`REAL STRIPE PAYMENT OBSERVED — same-host continuation ${continuationUrl.toString()}`);
    return;
  }

  // Only after the existing Stripe destination is exact may this workflow
  // write the acceptance project's callback configuration.
  const callbackAllowList = [
    `${publicOrigin}/**`,
    `${publicOrigin}/auth/callback`,
    `${publicOrigin}/api/auth/callback`
  ];
  const authPatch = await managementApi(`/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    body: { site_url: publicOrigin, uri_allow_list: callbackAllowList.join(",") }
  });
  const authAfter = await managementApi(`/v1/projects/${PROJECT_REF}/config/auth`);
  record(
    "acceptance_auth_callbacks_bound_to_temporary_host",
    authPatch.ok
      && authAfter.json?.site_url === publicOrigin
      && typeof authAfter.json?.uri_allow_list === "string"
      && authAfter.json.uri_allow_list.includes(publicOrigin),
    `PATCH=${authPatch.status}; site_url=${JSON.stringify(authAfter.json?.site_url ?? null)}; temporary host allow-listed=${String(authAfter.json?.uri_allow_list ?? "").includes(publicOrigin)}`
  );

  const keyResponse = await managementApi(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const keys = Array.isArray(keyResponse.json) ? keyResponse.json : [];
  const anonKey = keys.find((entry) => entry.name === "anon")?.api_key ?? "";
  const serviceKey = keys.find((entry) => entry.name === "service_role")?.api_key ?? "";
  record("acceptance_keys_available", Boolean(anonKey && serviceKey), `Management API=${keyResponse.status}; anon/service present=${Boolean(anonKey && serviceKey)}`);
  secrets.push(anonKey, serviceKey);
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

  const A = await signIn("acceptance-consumer-a@rcap-acceptance.test", "Acceptance-a-4f7c21!", anonKey);
  const B = await signIn("acceptance-consumer-b@rcap-acceptance.test", "Acceptance-b-8d3e95!", anonKey);
  record("synthetic_consumers_sign_in", Boolean(A && B), `consumer A signed in=${Boolean(A)}; consumer B signed in=${Boolean(B)}`);

  const nonexistentItemId = crypto.randomUUID();
  const [admittedA, outsideB, anonymous] = await Promise.all([
    callApp(previewUrl, "/api/expungement-ai/packet/render", { method: "POST", cookie: A.cookie, body: { briefcaseItemId: nonexistentItemId } }),
    callApp(previewUrl, "/api/expungement-ai/packet/render", { method: "POST", cookie: B.cookie, body: { briefcaseItemId: nonexistentItemId } }),
    callApp(previewUrl, "/api/expungement-ai/packet/render", { method: "POST", body: { briefcaseItemId: nonexistentItemId } })
  ]);
  record("consumer_a_admitted_to_staging_scope", admittedA.status === 404, `A render probe=${admittedA.status}; 404 proves the request passed the scope and reached item lookup`);
  record("consumer_b_outside_staging_scope", outsideB.status === 503, `B render probe=${outsideB.status}; expected route-disabled 503`);
  record("anonymous_access_denied", anonymous.status === 401, `anonymous render probe=${anonymous.status}; expected 401`);

  const paRefusal = paRefusalEvidence(await readPaRefusal());
  record("pennsylvania_path_a_refuses_commercial_authority", paRefusal.passed, JSON.stringify(paRefusal), paRefusal);

  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const { isConsumerPaymentAllowed } = await import("../src/lib/expungement-ai/eligibility-adapter.ts");
  const { consumerMatterIdForItem, consumerPersonMatchKey, CONSUMER_PERSON_NAMESPACE } = await import("../src/lib/expungement-ai/consumer-identity.ts");
  const consumerRenderSource = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/consumer-render-request.ts"), "utf8");
  const eligibilitySource = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/eligibility-adapter.ts"), "utf8");
  // The caller must NOT name a profile version. It used to, and this gate used
  // to assert the literal it named — encoding the defect as the expectation.
  // The version the specification carries is now derived inside
  // buildRenderJobSpec from the compiled profile the route resolved against,
  // so what is checked here is that no literal survives and that the derived
  // value is the registry's own.
  const callerVersionMatch = consumerRenderSource
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .match(/buildRenderJobSpec\(\{[\s\S]*?profileVersion:\s*"([^"]+)"/);
  const packetTypeMatch = eligibilitySource.match(/resultCode === "packet_ready"\s*\|\|\s*resultCode === "packet_ready_with_caution"\)\s*return "([^"]+)"/);
  const consumerProfileVersion = callerVersionMatch?.[1] ?? null;
  const consumerResultCode = "packet_ready";
  const consumerPacketType = packetTypeMatch?.[1] ?? null;
  const { fulfillmentAuthorityFor } = await import("../src/lib/rcap/fulfillment/grade-a-admission.ts");
  const { packetRouteCanRender } = await import("../src/lib/rcap/documents/packet-route-resolver.ts");
  const compiledProfile = getProfileByJurisdiction(MS_CHECKOUT.jurisdiction);
  const compiledPathway = compiledProfile?.pathways?.find((candidate) => candidate.id === MS_CHECKOUT.pathwayId) ?? null;
  let itemId = crypto.randomUUID();
  const mappingRequest = {
    packetId: crypto.randomUUID(),
    state: MS_CHECKOUT.jurisdiction,
    pathway: MS_CHECKOUT.pathwayId,
    briefcaseItemId: itemId,
    trackId: MS_CHECKOUT.trackId,
    packetFields: {}
  };
  const built = buildRenderJobSpec(mappingRequest);
  const consumerMappingEvidence = msMappingEvidence({
    request: mappingRequest, built, compiledProfile, compiledPathway,
    authority: fulfillmentAuthorityFor(MS_CHECKOUT.routeId),
    renderable: packetRouteCanRender(built.route),
    paymentAllowed: isConsumerPaymentAllowed(consumerResultCode, true),
    consumerProfileVersion, consumerPacketType
  });
  record(
    "consumer_caller_profile_and_eligibility_mapping_exact",
    consumerMappingEvidence.passed,
    JSON.stringify(consumerMappingEvidence),
    consumerMappingEvidence
  );

  // Exactly the Captain-selected route. No search across other jurisdictions,
  // siblings, or whichever route happens to pass is permitted.
  const { packetInformationModelFor, packetInformationReviewSafety } =
    await import("../src/lib/expungement-ai/packet-information.ts");
  const { evaluateAuthoritativeScreeningResult } =
    await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
  const { projectPublicProfile } =
    await import("../src/lib/rcap-engine/public-profile-projection.ts");
  // The one fulfillment authority. Since ADR-0004 an evaluator verdict of
  // paymentAllowed is a necessary condition for a sale and never a sufficient
  // one: it says the matter qualifies for relief, not that the product can
  // deliver the filing. This harness transacts a real Checkout, so it selects
  // only a route the authority itself proves.
  const { packetFulfillmentAuthority } =
    await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
  const preferredAnswers = {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    offense_level: "Misdemeanor",
    offense_category: "Misdemeanor",
    record_type: "Arrest or charge",
    resolved_timing_bucket: "gt_10_years",
    court_requirements_completed: "yes",
    actual_arrest: "Yes",
    release_confirmed: "Yes",
    disposition_record_wording: "Charge dismissed",
    pending_cases: "No",
    trafficking_status: "No",
    prior_relief: "No",
    pardon_status: "No",
    sentence_completion_date: "Yes",
    financial_obligations: "Yes",
    state_exclusion_categories: ["None of these"],
    disposition_date: "2005-01-10",
    age_at_offense: "30",
    charge: "Shoplifting",
    county: "Hinds",
    court: "Hinds County Circuit Court",
    residency_or_location: "Jackson",
    criminal_history: "No other cases",
    participant_full_legal_name: "Acceptance Test Participant",
    contact_information: "hosted-acceptance@example.test"
  };
  function publicQuestionIndex(profile) {
    const index = new Map();
    (function walk(node) {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label)) {
        if (!index.has(node.id)) index.set(node.id, node);
      }
      Object.values(node).forEach(walk);
    })(projectPublicProfile(profile));
    return index;
  }
  function answerForQuestion(question, id) {
    const preferred = preferredAnswers[id];
    const preferredAllowed = !question || question.type !== "single_choice"
      || !question.options?.length || question.options.includes(preferred);
    if (preferred !== undefined && preferredAllowed) return preferred;
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
  function convergeSellableScreening(state) {
    const profile = getProfileByJurisdiction(state);
    if (!profile) return { state, failure: "compiled profile unavailable" };
    const questions = publicQuestionIndex(profile);
    const answers = {
      ownership_scope: preferredAnswers.ownership_scope,
      jurisdiction_scope: preferredAnswers.jurisdiction_scope,
      case_outcome: preferredAnswers.case_outcome,
      offense_level: preferredAnswers.offense_level,
      disposition_date: preferredAnswers.disposition_date
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
        if (!error?.invalidQuestionIds?.length) {
          return { state, failure: String(error?.message ?? error).slice(0, 180) };
        }
        for (const id of error.invalidQuestionIds) delete answers[id];
        continue;
      }
      last = evaluation;
      if (evaluation.pathwayId && evaluation.pathwayId !== MS_CHECKOUT.pathwayId) {
        return { state, failure: `unexpected pathway ${evaluation.pathwayId}; no fallback permitted` };
      }
      const evaluatorAdmitsPayment = (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution")
        && evaluation.paymentAllowed === true
        && typeof evaluation.pathwayId === "string";
      // Two independent conditions, deliberately not collapsed: the evaluator
      // admits payment for the matter, AND a fulfillment record proves this
      // exact route delivers a packet. The harness may transact only where both
      // hold, so a route that qualifies legally but has nothing to ship is
      // rejected here rather than at a participant's download.
      const fulfillment = evaluatorAdmitsPayment
        ? packetFulfillmentAuthority(state, evaluation.pathwayId, "checkout creation", { trackId: MS_CHECKOUT.trackId })
        : { allowed: false, reason: "the evaluator does not admit payment for this matter" };
      if (evaluatorAdmitsPayment && !fulfillment.allowed) {
        return { state, failure: `${evaluation.pathwayId}: evaluator admits payment but no proven fulfillment — ${fulfillment.reason}` };
      }
      if (evaluatorAdmitsPayment && fulfillment.allowed) return { state, profile, evaluation, answers };
      const missing = evaluation.missingQuestionIds ?? [];
      if (!missing.length) {
        return { state, failure: `${evaluation.resultCode} with no remaining questions` };
      }
      for (const id of missing) answers[id] = answerForQuestion(questions.get(id), id);
    }
    return { state, failure: `did not settle in 16 rounds; last ${last?.resultCode ?? "unavailable"}` };
  }
  function buildReviewedFlow(settled) {
    const { state, profile, evaluation, answers } = settled;
    const pathway = profile.packetGenerator?.pathways?.find(
      (candidate) => candidate.pathwayId === evaluation.pathwayId
    );
    if (!pathway) return { failure: `${state}: packet generator does not offer ${evaluation.pathwayId}` };
    const baseItem = {
      id: itemId,
      type: "result",
      title: "RCAP hosted Checkout gate — evaluator-proven sellable packet",
      state,
      status: "packet_ready",
      resultCode: evaluation.resultCode,
      createdAt: new Date().toISOString(),
      summary: "RCAP hosted Checkout gate — evaluator-proven sellable packet",
      nextSteps: [],
      paymentAllowed: true,
      packetReady: true,
      pathwayLabel: pathway.pathwayLabel,
      packetType: consumerPacketType,
      selectedTrackId: MS_CHECKOUT.trackId,
      artifactRefs: { selectedTrackId: MS_CHECKOUT.trackId }
    };
    const initialModel = packetInformationModelFor(baseItem);
    if (!initialModel) return { failure: `${state}: packet-information model unavailable for ${pathway.pathwayLabel}` };
    const packetAnswers = { ...answers };
    for (const question of initialModel.questions) {
      if (!(question.id in packetAnswers)) packetAnswers[question.id] = answerForQuestion(question, question.id);
    }
    const reviewedAt = new Date().toISOString();
    const commercialFlow = {
      version: 1,
      entitlementSource: "consumer_payment",
      productId: "expungement_packet",
      screening: {
        profileVersion: profile.profileVersion,
        pathwayId: initialModel.pathwayId,
        pathwayLabel: initialModel.pathwayLabel,
        resultCode: evaluation.resultCode,
        paymentAllowed: true,
        packetType: consumerPacketType,
        packetPlan: initialModel.packetPlan,
        answers
      },
      packetInformation: {
        stage: "ready_to_generate",
        requiredInputIds: initialModel.requiredInputIds,
        serverFacts: { jurisdiction: state, pathway_id: initialModel.pathwayId },
        prefilledAnswers: {},
        answers: packetAnswers,
        missingInputIds: [],
        updatedAt: reviewedAt,
        reviewedAt
      }
    };
    const reviewedItem = { ...baseItem, artifactRefs: { selectedTrackId: MS_CHECKOUT.trackId, commercialFlow } };
    const model = packetInformationModelFor(reviewedItem);
    const safety = packetInformationReviewSafety(reviewedItem);
    const complete = model?.stage === "ready_to_generate"
      && model.missingInputIds.length === 0
      && Boolean(model.reviewedAt)
      && safety.safe;
    return complete
      ? { state, profile, evaluation, pathway, commercialFlow, model, safety }
      : { failure: `${state}: stage=${model?.stage ?? "unavailable"}, missing=${model?.missingInputIds.length ?? "unavailable"}, review=${safety.reason}` };
  }

  const settled = convergeSellableScreening(MS_CHECKOUT.jurisdiction);
  const reviewed = settled.failure ? settled : buildReviewedFlow(settled);
  record(
    "seeded_item_carries_reviewed_packet_information",
    !reviewed.failure
      && reviewed.state === MS_CHECKOUT.jurisdiction
      && reviewed.evaluation?.pathwayId === MS_CHECKOUT.pathwayId
      && reviewed.pathway?.pathwayLabel === MS_CHECKOUT.pathwayLabel
      && reviewed.model?.pathwayId === MS_CHECKOUT.pathwayId,
    reviewed.failure ?? `${reviewed.state} / ${reviewed.pathway?.pathwayLabel}; result=${reviewed.evaluation?.resultCode}; review=${reviewed.safety?.reason}`
  );

  const checkoutRequest = {
    packetId: crypto.randomUUID(),
    state: MS_CHECKOUT.jurisdiction,
    pathway: MS_CHECKOUT.pathwayId,
    briefcaseItemId: itemId,
    trackId: MS_CHECKOUT.trackId,
    packetFields: reviewed.model.initialAnswers
  };
  const checkoutBuilt = buildRenderJobSpec(checkoutRequest);
  const checkoutRouteIdentity = {
    routeKind: checkoutBuilt.route?.routeKind ?? null,
    routeId: checkoutBuilt.spec?.routeId ?? null,
    pathwayId: checkoutBuilt.route?.pathwayId ?? null,
    pathwayLabel: reviewed.pathway.pathwayLabel,
    trackId: checkoutRequest.trackId,
    packetFamilyId: checkoutBuilt.route?.factoryV2?.packetFamilyId ?? null,
    jurisdiction: checkoutBuilt.route?.jurisdiction ?? null,
    rendererKind: checkoutBuilt.spec?.rendererKind ?? null,
    rendererVersion: checkoutBuilt.spec?.rendererVersion ?? null,
    profileId: checkoutBuilt.spec?.profileId ?? null,
    profileVersion: checkoutBuilt.spec?.profileVersion ?? null,
    sourceSha256: checkoutBuilt.spec?.sourceSha256 ?? null,
    sellable: checkoutBuilt.route?.sellable ?? null,
    creditConsumable: checkoutBuilt.route?.creditConsumable ?? null,
    resultCode: reviewed.evaluation.resultCode,
    packetType: consumerPacketType
  };
  const checkoutRouteEvidence = msMappingEvidence({
    request: checkoutRequest, built: checkoutBuilt,
    compiledProfile: reviewed.profile,
    compiledPathway: reviewed.profile.pathways.find((candidate) => candidate.id === reviewed.evaluation.pathwayId),
    authority: fulfillmentAuthorityFor(MS_CHECKOUT.routeId),
    renderable: packetRouteCanRender(checkoutBuilt.route),
    paymentAllowed: isConsumerPaymentAllowed(reviewed.evaluation.resultCode, reviewed.evaluation.paymentAllowed),
    consumerProfileVersion, consumerPacketType
  });
  record(
    "checkout_fixture_route_derived_from_authorities",
    checkoutRouteEvidence.passed,
    JSON.stringify(checkoutRouteEvidence),
    checkoutRouteEvidence
  );
  evidence.checkoutRoute = checkoutRouteIdentity;
  evidence.reviewedPacketInformation = {
    state: reviewed.state,
    profileVersion: reviewed.profile.profileVersion,
    pathwayId: reviewed.model.pathwayId,
    pathwayLabel: reviewed.pathway.pathwayLabel,
    requiredInputCount: reviewed.model.requiredInputIds.length,
    reviewSafety: reviewed.safety.reason,
    selectedTrackId: MS_CHECKOUT.trackId
  };

  // Establish the fixture through the same claim and final-review APIs as a participant.
  itemId = await claimAndVerifyHostedFixture({
    call: (endpoint, options) => callApp(previewUrl, endpoint, { method: "POST", cookie: A.cookie, ...options }),
    record,
    screening: {
      jurisdiction: reviewed.state,
      profileVersion: reviewed.profile.profileVersion,
      screeningCorrelationId: itemId,
      answers: reviewed.commercialFlow.screening.answers,
      locale: "en"
    },
    answers: HOSTED_FINAL_REVIEW_ANSWERS
  });
  evidence.fixtureRetainedForRoger = true;

  const reread = await sql(`
    select id, user_id, jurisdiction, pathway_label, result_code, packet_type, status,
           payment_status, payment_allowed, checkout_session_id, payment_provider,
           amount_cents, packet_status, source_session_id
      from public.consumer_briefcase_items
     where id = '${itemId}' and user_id = '${A.id}'
  `);
  const storedRows = Array.isArray(reread.json) ? reread.json : [];
  const stored = storedRows[0] ?? null;
  // Retain the row-existence gate: the application claim now performs the INSERT.
  record("briefcase_insert_returning_proves_row", reread.ok && storedRows.length === 1 && stored?.id === itemId,
    `application claim returned id=${itemId}; persisted rows=${storedRows.length}`);
  const storedExact = storedRows.length === 1
    && stored.id === itemId
    && stored.user_id === A.id
    && stored.jurisdiction === checkoutRouteIdentity.jurisdiction
    && stored.pathway_label === checkoutRouteIdentity.pathwayLabel
    && stored.result_code === checkoutRouteIdentity.resultCode
    && stored.packet_type === checkoutRouteIdentity.packetType
    && stored.status === "packet_ready"
    && stored.payment_status === "unpaid"
    && stored.payment_allowed === true
    && stored.checkout_session_id === null;
  record("stored_row_matches_authoritative_resolver", storedExact, `rows=${storedRows.length}; stored=${JSON.stringify(stored)}`);
  evidence.seededItem = { id: itemId, userId: A.id, ...stored };

  // Read back the application-written protected record. Validate its hashes and
  // current facts with the same pure validator used by the render guard.
  const verificationRead = await sql(`
    select status, reason, verification_hash as hash, verification_snapshot as snapshot,
           draft_hash as "draftHash", draft_snapshot as "draftSnapshot", revision
      from public.consumer_packet_verifications
     where briefcase_item_id = '${itemId}' and consumer_auth_user_id = '${A.id}'
  `);
  const verificationRows = Array.isArray(verificationRead.json) ? verificationRead.json : [];
  const protectedVerification = verificationRows[0];
  const { requireCurrentPacketVerificationRecord } = await import("../src/lib/expungement-ai/packet-information.ts");
  let currentVerification = null;
  let verificationFailure = null;
  try {
    currentVerification = requireCurrentPacketVerificationRecord(
      { id: itemId, state: stored.jurisdiction, artifactRefs: {} }, protectedVerification
    );
  } catch (error) { verificationFailure = error.message; }
  // The RPC inserts the first unverified save at revision 0; final review
  // is a material update, so this two-step fixture has server-owned revision 1.
  record("protected_final_verification_current", verificationRead.ok && verificationRows.length === 1
    && currentVerification !== null && currentVerification.revision === 1,
  JSON.stringify({ hash: currentVerification?.hash, draftHash: currentVerification?.draftHash,
    revision: currentVerification?.revision, failure: verificationFailure }));

  // Establish the accepted application's deterministic person and matter chain.
  const personMatchKey = consumerPersonMatchKey(A.id);
  const matterId = consumerMatterIdForItem(itemId);
  const namespaceCollision = await sql(`select count(*)::int as count from public.partner_records where partner_slug = '${CONSUMER_PERSON_NAMESPACE}'`);
  const collisionCount = Number(Array.isArray(namespaceCollision.json) ? namespaceCollision.json[0]?.count ?? -1 : -1);
  record("consumer_person_namespace_reserved", collisionCount === 0, `registered partner collisions=${collisionCount}`);
  const person = await sql(`
    insert into public.rcap_persons (partner_slug, match_key)
    values ('${CONSUMER_PERSON_NAMESPACE}', '${sqlText(personMatchKey)}')
    on conflict (partner_slug, match_key) do update set match_key = excluded.match_key
    returning id, partner_slug, match_key
  `);
  const personRow = Array.isArray(person.json) ? person.json[0] : null;
  record("authenticated_user_resolves_unique_consumer_person", Boolean(personRow?.id) && personRow.match_key === personMatchKey, `person id=${personRow?.id ?? "(none)"}; namespace=${personRow?.partner_slug ?? "(none)"}`);

  // Independently derive the full expectation before Checkout from owned server
  // rows and the application's pure verification/preflight authority.
  const expectedMetadata = await checkoutMetadataExpectation({
    userId: A.id, stored, personRow, protectedVerification
  });

  // No acceptance-script packet write is permitted. Payment authority is
  // checked before the application creates its constrained packet row, so the
  // pre-Checkout proof is exact absence; the canonical Stripe webhook must be
  // the authority that later invokes application-owned packet creation.
  const packetAbsence = await sql(`
    select count(*)::int as packets
      from public.rcap_document_packets
     where briefcase_id = '${itemId}' and user_id = '${A.id}'
  `);
  const packetCount = Number(Array.isArray(packetAbsence.json) ? packetAbsence.json[0]?.packets ?? -1 : -1);
  record(
    "consumer_packet_record_absent_before_real_payment",
    packetAbsence.ok && packetCount === 0,
    `SQL=${packetAbsence.status}; owned item=${itemId}; rows before payment=${packetCount}`
  );
  evidence.applicationOwnedPacket = {
    briefcaseItemId: itemId,
    packetIdentityDerivedByApplicationAfterPayment: true,
    storagePathway: CONSUMER_PACKET_STORAGE_PATHWAY,
    creationAuthority: "canonical Stripe webhook",
    applicationCreatesPacketAfterPayment: true,
    scriptPacketWritePerformed: false,
    compatibilityFixtureUsed: false,
    paymentAuthorityRequired: true
  };

  const unpaidRender = await callApp(previewUrl, "/api/expungement-ai/packet/render", {
    method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId }
  });
  record("unpaid_render_returns_402", unpaidRender.status === 402, `A render of seeded unpaid item=${unpaidRender.status}; reason=${unpaidRender.json?.reason ?? "(none)"}`);

  const zeroBefore = await sql(`
    select
      (select count(*)::int from public.packet_render_jobs where briefcase_item_id = '${itemId}') as jobs,
      (select count(*)::int from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}') as entitlements
  `);
  const beforeCounts = Array.isArray(zeroBefore.json) ? zeroBefore.json[0] : null;
  record("no_job_or_entitlement_before_checkout", Number(beforeCounts?.jobs) === 0 && Number(beforeCounts?.entitlements) === 0, JSON.stringify(beforeCounts));

  // One-minute clock-skew allowance between the Actions runner and Stripe.
  // The item UUID is unique to this gate, so widening the time window cannot
  // make an unrelated Session match it.
  const createdGte = Math.floor(Date.now() / 1000) - 60;
  const sessionsBefore = await checkoutSessionsForItem(itemId, createdGte);
  record("no_existing_checkout_for_unique_item", sessionsBefore.length === 0, `matching Stripe Sessions before application POST=${sessionsBefore.length}`);

  // Exactly one application call. There is no retry and no direct Stripe
  // Session-create fallback anywhere in this gate.
  const checkoutResponse = await callApp(previewUrl, "/api/expungement-ai/checkout", {
    method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId }
  });
  const checkoutSessionId = checkoutResponse.json?.checkoutSessionId ?? null;
  const checkoutUrl = checkoutResponse.json?.checkoutUrl ?? null;
  record(
    "application_created_one_checkout_response",
    checkoutResponse.status === 200
      && checkoutResponse.json?.mode === "stripe"
      && checkoutResponse.json?.amountCents === 5000
      && checkoutResponse.json?.briefcaseItemId === itemId
      && checkoutResponse.json?.outcome === "checkout_created"
      && checkoutResponse.json?.alreadyPaid === false
      && /^cs_test_/.test(checkoutSessionId ?? "")
      && typeof checkoutUrl === "string",
    `POST=${checkoutResponse.status}; mode=${checkoutResponse.json?.mode ?? "(none)"}; outcome=${checkoutResponse.json?.outcome ?? "(none)"}; alreadyPaid=${checkoutResponse.json?.alreadyPaid}; id=${checkoutSessionId ?? "(none)"}; amount=${checkoutResponse.json?.amountCents ?? "(none)"}`
  );

  const sessionResponse = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`);
  const lineItemsResponse = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}/line_items`, {
    limit: 10,
    "expand[]": ["data.price.product"]
  });
  const session = sessionResponse.json;
  const lineItems = Array.isArray(lineItemsResponse.json?.data) ? lineItemsResponse.json.data : [];
  const sessionsAfter = await checkoutSessionsForItem(itemId, createdGte);
  record(
    "exactly_one_real_stripe_session_for_item",
    sessionsAfter.length === 1 && sessionsAfter[0]?.id === checkoutSessionId,
    `matching Sessions after the one application POST=${sessionsAfter.length}; ids=${sessionsAfter.map((entry) => entry.id).join(",")}`
  );

  const metadataProof = checkoutMetadataEvidence(session?.metadata, expectedMetadata);
  const metadataExact = metadataProof.passed;
  const lineItem = lineItems[0] ?? null;
  const product = lineItem?.price?.product;
  const productName = typeof product === "object" ? product.name : lineItem?.description;
  const productId = typeof product === "object" ? product?.id ?? null : (typeof product === "string" ? product : null);
  // The packet is identified by its catalog Product where one is configured --
  // which is what a product-restricted coupon matches on -- and by the legacy
  // ad-hoc name where none is. Checkout used to mint a fresh ad-hoc Product per
  // Session, so the name was the only handle there was; it is not the handle
  // any more, and pinning it would fail every Session that sells the catalog
  // entry this release exists to sell.
  const expectedCatalogProductId = (process.env.HOSTED_STRIPE_CATALOG_PRODUCT_ID ?? "").trim();
  const isThePacketProduct = expectedCatalogProductId
    ? productId === expectedCatalogProductId
    : productName === "Expungement.ai self-help packet";
  const productIdentity = expectedCatalogProductId
    ? `catalog product ${JSON.stringify(productId)} (expected ${expectedCatalogProductId})`
    : `inline product ${JSON.stringify(productName)}`;
  const sessionExact = sessionResponse.status === 200
    && session?.id === checkoutSessionId
    && session?.mode === "payment"
    && session?.livemode === false
    && session?.status === "open"
    && session?.payment_status === "unpaid"
    && session?.amount_total === 5000
    && session?.amount_subtotal === 5000
    && String(session?.currency ?? "").toLowerCase() === "usd"
    && session?.client_reference_id === itemId
    && session?.url === checkoutUrl
    && metadataExact
    && lineItemsResponse.status === 200
    && lineItems.length === 1
    && lineItem?.quantity === 1
    && lineItem?.amount_total === 5000
    && lineItem?.amount_subtotal === 5000
    && lineItem?.price?.unit_amount === 5000
    && lineItem?.currency === "usd"
    && lineItem?.price?.currency === "usd"
    && isThePacketProduct;
  record(
    "stripe_session_amount_mode_metadata_and_product_exact",
    sessionExact,
    `id=${session?.id}; livemode=${session?.livemode}; status=${session?.status}; payment_status=${session?.payment_status}; amount=${session?.amount_total}; currency=${session?.currency}; metadata exact=${metadataExact}; metadata failures=${JSON.stringify(metadataProof.failures)}; line items=${lineItems.length}; quantity=${lineItem?.quantity}; product=${JSON.stringify(productName)}`
  );

  const personMatterProductBound = metadataExact
    && session.metadata.user_id === A.id
    && personRow?.match_key === consumerPersonMatchKey(session.metadata.user_id)
    && matterId === consumerMatterIdForItem(session.metadata.briefcase_item_id)
    && session.metadata.jurisdiction === checkoutRouteIdentity.jurisdiction
    && session.metadata.pathway_id === expectedMetadata.pathway_id
    && session.metadata.packet_type === checkoutRouteIdentity.packetType
    && isThePacketProduct;
  record(
    "metadata_transitively_binds_user_person_item_matter_and_product",
    personMatterProductBound,
    `user=${A.id}; person=${personRow?.id}; item=${itemId}; deterministic matter=${matterId}; product route=${checkoutRouteIdentity.routeId}; Stripe product=${JSON.stringify(productName)}`
  );
  evidence.identityBinding = {
    directMetadataKeys: Object.keys(session.metadata ?? {}).sort(),
    authenticatedUserId: A.id,
    personId: personRow.id,
    personBinding: "metadata.user_id -> consumerPersonMatchKey(user_id) -> unique rcap_persons row",
    briefcaseItemId: itemId,
    matterId,
    matterBinding: "metadata.briefcase_item_id -> consumerMatterIdForItem(item)",
    productBinding: "canonical metadata.product_id + authoritative route + Stripe line item",
    metadataContract: metadataProof,
    literalPersonIdMetadataPresent: Object.hasOwn(session.metadata ?? {}, "person_id"),
    literalMatterIdMetadataPresent: Object.hasOwn(session.metadata ?? {}, "matter_id")
  };

  const successUrl = new URL(session.success_url);
  const cancelUrl = new URL(session.cancel_url);
  evidence.checkoutReturn = {
    successUrl: session.success_url,
    cancelUrl: session.cancel_url,
    hostedOrigin: publicOrigin,
    returnsToHostedOrigin: successUrl.origin === publicOrigin && cancelUrl.origin === publicOrigin,
    originObservation: successUrl.origin === publicOrigin && cancelUrl.origin === publicOrigin
      ? "the Checkout Session returns to this exact temporary HTTPS host"
      : "the Checkout Session selected a different origin"
  };
  const returnShapeExact = successUrl.pathname === `/briefcase/${encodeURIComponent(itemId)}`
    && successUrl.searchParams.get("payment") === "return"
    && successUrl.searchParams.get("session_id") === "{CHECKOUT_SESSION_ID}"
    && cancelUrl.pathname === `/briefcase/${encodeURIComponent(itemId)}`
    && cancelUrl.searchParams.get("checkout") === "canceled"
    && successUrl.origin === publicOrigin
    && cancelUrl.origin === publicOrigin;
  const afterItemResponse = await sql(`
    select id, user_id, payment_status, payment_provider, checkout_session_id,
           amount_cents, packet_status, provider_event_id
      from public.consumer_briefcase_items
     where id = '${itemId}' and user_id = '${A.id}'
  `);
  const afterCountsResponse = await sql(`
    select
      (select count(*)::int from public.packet_render_jobs where briefcase_item_id = '${itemId}') as jobs,
      (select count(*)::int from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${itemId}') as entitlements,
      (select count(*)::int from public.processed_stripe_events where related_object_id = '${checkoutSessionId}') as processed_events
  `);
  const afterItem = Array.isArray(afterItemResponse.json) ? afterItemResponse.json[0] ?? null : null;
  const afterCounts = Array.isArray(afterCountsResponse.json) ? afterCountsResponse.json[0] ?? null : null;
  const stillUnpaid = afterItem?.payment_status === "unpaid"
    && afterItem?.payment_provider === "stripe"
    && afterItem?.checkout_session_id === checkoutSessionId
    // The binding RPC clears uncollected amounts; zero is a settled free order.
    && afterItem?.amount_cents === null
    && afterItem?.packet_status === "not_started"
    && afterItem?.provider_event_id === null
    && Number(afterCounts?.jobs) === 0
    && Number(afterCounts?.entitlements) === 0
    && Number(afterCounts?.processed_events) === 0;
  record(
    "beginning_checkout_does_not_mark_paid_or_queue_work",
    stillUnpaid,
    `item=${JSON.stringify(afterItem)}; counts=${JSON.stringify(afterCounts)}`
  );
  record(
    "checkout_return_page_shape_exact",
    returnShapeExact,
    `success=${sanitize(session.success_url)}; cancel=${sanitize(session.cancel_url)}; returns to hosted origin=${evidence.checkoutReturn.returnsToHostedOrigin}`
  );

  evidence.checkout = {
    sessionId: checkoutSessionId,
    checkoutUrl,
    status: session.status,
    paymentStatus: session.payment_status,
    livemode: session.livemode,
    amountTotal: session.amount_total,
    currency: session.currency,
    successUrl: session.success_url,
    cancelUrl: session.cancel_url
  };
  evidence.outcome = "rcap_test_checkout_ready";
  evidence.passed = true;
  writeEvidence();

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, [
      `hosted_url=${publicOrigin}`,
      `briefcase_item_id=${itemId}`,
      `checkout_session_id=${checkoutSessionId}`,
      `checkout_url=${checkoutUrl}`,
      `expected_return_url=${session.success_url}`
    ].join("\n") + "\n");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      "## RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED",
      "",
      `- GitHub-hosted temporary environment: ${publicOrigin}`,
      `- Application SHA: ${APPLICATION_SHA}`,
      `- Tools SHA: ${TOOLS_SHA}`,
      `- Accepted route: ${checkoutRouteIdentity.routeId}`,
      `- Briefcase item: ${itemId}`,
      `- Stripe Session: ${checkoutSessionId}`,
      `- Stripe-hosted Checkout: ${checkoutUrl}`,
      `- Expected return: ${session.success_url}`,
      "- State: open and unpaid; no entitlement or render job exists",
      `- Application-owned packet is derived after payment; storage pathway ${CONSUMER_PACKET_STORAGE_PATHWAY}; authoritative job route ${checkoutRouteIdentity.routeId}`,
      ""
    ].join("\n"));
  }
  console.log("");
  console.log("RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED");
  console.log(`  GitHub-hosted URL: ${publicOrigin}`);
  console.log(`  Briefcase item: ${itemId}`);
  console.log(`  Stripe Session: ${checkoutSessionId}`);
  console.log(`  Stripe-hosted Checkout: ${checkoutUrl}`);
  console.log(`  Expected return: ${session.success_url}`);
}

main().catch((error) => {
  evidence.passed = false;
  evidence.outcome = error instanceof GateFailure ? "gate_failed" : "unexpected_error";
  evidence.failure = {
    caseId: error instanceof GateFailure ? error.caseId : null,
    message: sanitize(error instanceof Error ? error.message : error)
  };
  writeEvidence();
  console.error(`CHECKOUT GATE FAILED — ${evidence.failure.message}`);
  process.exit(1);
});
