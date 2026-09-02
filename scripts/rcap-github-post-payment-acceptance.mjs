#!/usr/bin/env node
// Same-run post-payment acceptance for the GitHub-hosted fallback.
//
// Entry is permitted only after the payment watcher has independently proven
// a real paid Stripe Checkout Session, the real checkout.session.completed
// event, the canonical webhook write, and one queued render job. This script
// replays that real event without changing it, proves idempotency, runs the
// already-pulled immutable worker once, and verifies private PDF delivery.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { computeNormalizedFingerprint } = await import("../src/lib/rcap/render/job-contract.ts");

const ROOT = process.cwd();
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: ROOT });
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "github-post-payment-acceptance.json");

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const TOOLS_SHA = process.env.HOSTED_TOOLS_SHA ?? "";
const WORKER_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const PUBLIC_URL = (process.env.HOSTED_PUBLIC_URL ?? "").replace(/\/+$/, "");
const CHECKOUT_SESSION_ID = process.env.HOSTED_CHECKOUT_SESSION_ID ?? "";
const BRIEFCASE_ITEM_ID = process.env.HOSTED_BRIEFCASE_ITEM_ID ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const STRIPE_KEY = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
const WEBHOOK_SECRET = process.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET ?? "";

const applicationShaExact = /^[0-9a-f]{40}$/.test(APPLICATION_SHA);
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_PROJECT_NAME = "legalease-rcap-acceptance";
const EXPECTED_WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";
const EXPECTED_WORKER_REF = `ghcr.io/roger-legalease/rcap-render-worker@${EXPECTED_WORKER_DIGEST}`;
const EXPECTED_ROUTE_ID = "PA:Path A — Non-conviction expungement";
const EXPECTED_PATHWAY_LABEL = "Path A — Non-conviction expungement";
const CONSUMER_PACKET_NAMESPACE = "rcap:consumer-packet:v1";
const CONSUMER_PACKET_STORAGE_PATHWAY = "source_engine_packet_plan";
const CONSUMER_PACKET_SAFETY_DISCLAIMER = "This personalized self-help packet is not legal advice and does not guarantee court approval. Review every answer and confirm current local filing requirements before filing.";
const CONSUMER_PACKET_SUMMARY = "RCAP hosted Checkout gate — synthetic Pennsylvania Path A";
const EXPECTED_EVENTS = [
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
].sort();
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const ARTIFACT_BUCKET = "rcap-packet-artifacts-private";

const secretValues = [SUPABASE_ACCESS_TOKEN, STRIPE_KEY, WEBHOOK_SECRET].filter(Boolean);
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secretValues) text = text.split(secret).join("***REDACTED***");
  return text
    .replace(/sk_(test|live)_[A-Za-z0-9_]+/g, "***REDACTED***")
    .replace(/whsec_[A-Za-z0-9_]+/g, "***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-github-post-payment-acceptance/v1",
  applicationSha: APPLICATION_SHA,
  toolsSha: TOOLS_SHA,
  workerDigest: EXPECTED_WORKER_DIGEST,
  acceptanceProjectRef: PROJECT_REF,
  hostedEnvironment: "GitHub Actions runner + Cloudflare Quick Tunnel",
  publicUrl: PUBLIC_URL,
  checkoutSessionId: CHECKOUT_SESSION_ID,
  briefcaseItemId: BRIEFCASE_ITEM_ID,
  stripeMode: "sandbox",
  production: false,
  fixturePreserved: true,
  syntheticCompletionCreated: false,
  paidStateWrittenByScript: false,
  workerStartedBeforeRealPaymentProof: false,
  cases: {}
};

class AcceptanceFailure extends Error {
  constructor(caseId, message) {
    super(`${caseId}: ${sanitize(message)}`);
    this.name = "AcceptanceFailure";
    this.caseId = caseId;
  }
}

function writeEvidence() {
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

function record(caseId, passed, observed) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new AcceptanceFailure(caseId, observed);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function deterministicUuid(seed) {
  const digest = sha256(Buffer.from(seed, "utf8"));
  const variant = ((parseInt(digest[16], 16) & 0x3) | 0x8).toString(16);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-${variant}${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

function sameStringSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
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
  return managementApi(`/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: { query }
  });
}

async function stripeGet(pathname, params = {}) {
  const url = new URL(`https://api.stripe.com${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${STRIPE_KEY}` } });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced through sanitized text */ }
  return { status: response.status, ok: response.ok, json, text: sanitize(text).slice(0, 500) };
}

async function listStripeCollection(pathname) {
  const rows = [];
  let startingAfter = null;
  for (let page = 0; page < 100; page += 1) {
    const response = await stripeGet(pathname, {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {})
    });
    if (!response.ok || !Array.isArray(response.json?.data)) {
      throw new AcceptanceFailure("stripe_collection_readable", `${pathname} returned ${response.status}: ${response.text}`);
    }
    rows.push(...response.json.data);
    if (!response.json.has_more) return rows;
    startingAfter = response.json.data.at(-1)?.id ?? null;
    if (!startingAfter) throw new AcceptanceFailure("stripe_collection_paginated", "has_more was true without a last id");
  }
  throw new AcceptanceFailure("stripe_collection_paginated", `${pathname} exceeded 100 pages`);
}

async function callApp(pathname, { method = "GET", cookie = null, body = null, headers = {} } = {}) {
  try {
    const response = await fetch(new URL(pathname, PUBLIC_URL), {
      method,
      headers: {
        ...(body === null ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers
      },
      body: body === null ? undefined : body,
      redirect: "manual"
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString("utf8");
    let json = null;
    try { json = JSON.parse(text); } catch { /* PDF or HTML */ }
    return {
      status: response.status,
      bytes,
      text: sanitize(text),
      json,
      contentType: response.headers.get("content-type") ?? "",
      contentDisposition: sanitize(response.headers.get("content-disposition") ?? ""),
      location: sanitize(response.headers.get("location") ?? "")
    };
  } catch (error) {
    return {
      status: `unreachable: ${sanitize(error instanceof Error ? error.message : error)}`,
      bytes: Buffer.alloc(0),
      text: "",
      json: null,
      contentType: "",
      contentDisposition: "",
      location: ""
    };
  }
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

function signedStripeBody(bytes) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET)
    .update(String(timestamp))
    .update(".")
    .update(bytes)
    .digest("hex");
  return { timestamp, header: `t=${timestamp},v1=${signature}` };
}

function dockerClientEnv() {
  const env = {};
  for (const name of ["PATH", "HOME", "DOCKER_CONFIG", "DOCKER_HOST", "XDG_RUNTIME_DIR"]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  return env;
}

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const hostedUrl = (() => { try { return new URL(PUBLIC_URL); } catch { return null; } })();
  record(
    "immutable_acceptance_inputs_exact",
    applicationShaExact
      && /^[0-9a-f]{40}$/.test(TOOLS_SHA)
      && PROJECT_REF === EXPECTED_PROJECT_REF
      && WORKER_REF === EXPECTED_WORKER_REF
      && /^cs_test_[A-Za-z0-9_]+$/.test(CHECKOUT_SESSION_ID)
      && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(BRIEFCASE_ITEM_ID)
      && SUPABASE_ACCESS_TOKEN.length > 0
      && STRIPE_KEY.startsWith("sk_test_")
      && WEBHOOK_SECRET.startsWith("whsec_")
      && hostedUrl?.protocol === "https:"
      && hostedUrl?.hostname.endsWith(".trycloudflare.com")
      && hostedUrl.pathname === "/"
      && hostedUrl.search === "",
    `application=${APPLICATION_SHA}; tools=${TOOLS_SHA}; project=${PROJECT_REF}; worker=${WORKER_REF}; session=${CHECKOUT_SESSION_ID}; host=${hostedUrl?.host ?? "invalid"}`
  );

  const projects = await managementApi("/v1/projects");
  const project = Array.isArray(projects.json)
    ? projects.json.find((candidate) => candidate.id === PROJECT_REF)
    : null;
  record(
    "acceptance_project_identity_not_production",
    projects.ok && project?.name === EXPECTED_PROJECT_NAME && project?.status === "ACTIVE_HEALTHY",
    `GET=${projects.status}; name=${project?.name ?? "(none)"}; status=${project?.status ?? "(none)"}; ref=${PROJECT_REF}`
  );

  const endpoints = await listStripeCollection("/v1/webhook_endpoints");
  const canonical = endpoints.filter((candidate) => {
    try { return new URL(candidate.url).pathname === "/api/stripe/webhook"; } catch { return false; }
  });
  const requiredWebhook = new URL("/api/stripe/webhook", hostedUrl.origin);
  const endpoint = canonical[0] ?? null;
  record(
    "canonical_webhook_remains_exact",
    canonical.length === 1
      && endpoint.status === "enabled"
      && endpoint.livemode === false
      && endpoint.url === requiredWebhook.toString()
      && sameStringSet(endpoint.enabled_events ?? [], EXPECTED_EVENTS),
    `canonical destinations=${canonical.length}; endpoint=${endpoint?.id ?? "(none)"}; URL exact=${endpoint?.url === requiredWebhook.toString()}; enabled=${endpoint?.status}; livemode=${endpoint?.livemode}; events=${JSON.stringify([...(endpoint?.enabled_events ?? [])].sort())}`
  );

  const sessionResponse = await stripeGet(`/v1/checkout/sessions/${encodeURIComponent(CHECKOUT_SESSION_ID)}`);
  const session = sessionResponse.json;
  record(
    "real_checkout_session_is_paid",
    sessionResponse.ok
      && session?.id === CHECKOUT_SESSION_ID
      && session?.livemode === false
      && session?.status === "complete"
      && session?.payment_status === "paid"
      && session?.amount_total === 5000
      && String(session?.currency ?? "").toLowerCase() === "usd"
      && session?.client_reference_id === BRIEFCASE_ITEM_ID
      && session?.metadata?.briefcase_item_id === BRIEFCASE_ITEM_ID,
    `GET=${sessionResponse.status}; id=${session?.id ?? "(none)"}; livemode=${session?.livemode}; status=${session?.status}; payment_status=${session?.payment_status}; amount=${session?.amount_total}; currency=${session?.currency}; item=${session?.client_reference_id ?? "(none)"}`
  );
  const userId = session.metadata?.user_id ?? "";
  record(
    "real_session_user_binding_is_synthetic_uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId),
    `metadata user=${userId || "(none)"}`
  );

  const itemResponse = await sql(`
    select id, user_id, jurisdiction, pathway_label, result_code, packet_type,
           payment_status, payment_provider, payment_authority, checkout_session_id,
           amount_cents, currency, provider_event_id, packet_status, artifact_refs_json
      from public.consumer_briefcase_items
     where id = '${BRIEFCASE_ITEM_ID}'
  `);
  const itemRows = Array.isArray(itemResponse.json) ? itemResponse.json : [];
  const item = itemRows[0] ?? null;
  record(
    "canonical_webhook_applied_server_authoritative_payment",
    itemResponse.ok
      && itemRows.length === 1
      && item?.user_id === userId
      && item?.jurisdiction === "PA"
      && item?.pathway_label === "Path A — Non-conviction expungement"
      && item?.result_code === "packet_ready"
      && item?.packet_type === "custom_pleading"
      && item?.payment_status === "paid"
      && item?.payment_provider === "stripe"
      && item?.payment_authority === "server_webhook"
      && item?.checkout_session_id === CHECKOUT_SESSION_ID
      && Number(item?.amount_cents) === 5000
      && String(item?.currency ?? "").toLowerCase() === "usd"
      && /^evt_[A-Za-z0-9_]+$/.test(item?.provider_event_id ?? ""),
    `SQL=${itemResponse.status}; rows=${itemRows.length}; user exact=${item?.user_id === userId}; route=${item?.jurisdiction}/${item?.pathway_label}; payment=${item?.payment_status}/${item?.payment_provider}/${item?.payment_authority}; event=${item?.provider_event_id ?? "(none)"}`
  );
  const eventId = item.provider_event_id;

  const processedResponse = await sql(`
    select stripe_event_id, event_type, related_object_id
      from public.processed_stripe_events
     where related_object_id = '${CHECKOUT_SESSION_ID}'
     order by processed_at, stripe_event_id
  `);
  const processedEvents = Array.isArray(processedResponse.json) ? processedResponse.json : [];
  record(
    "one_real_checkout_completed_event_matches_database",
    processedResponse.ok
      && processedEvents.length === 1
      && processedEvents[0]?.stripe_event_id === eventId
      && processedEvents[0]?.event_type === "checkout.session.completed"
      && processedEvents[0]?.related_object_id === CHECKOUT_SESSION_ID,
    `SQL=${processedResponse.status}; events=${processedEvents.length}; event=${processedEvents[0]?.stripe_event_id ?? "(none)"}; type=${processedEvents[0]?.event_type ?? "(none)"}; session=${processedEvents[0]?.related_object_id ?? "(none)"}`
  );

  const realEventResponse = await stripeGet(`/v1/events/${encodeURIComponent(eventId)}`);
  const realEvent = realEventResponse.json;
  record(
    "stripe_event_object_matches_session_and_database",
    realEventResponse.ok
      && realEvent?.id === eventId
      && realEvent?.livemode === false
      && realEvent?.type === "checkout.session.completed"
      && realEvent?.data?.object?.id === CHECKOUT_SESSION_ID
      && realEvent?.data?.object?.payment_status === "paid"
      && realEvent?.data?.object?.client_reference_id === BRIEFCASE_ITEM_ID,
    `GET=${realEventResponse.status}; event=${realEvent?.id ?? "(none)"}; type=${realEvent?.type ?? "(none)"}; livemode=${realEvent?.livemode}; session=${realEvent?.data?.object?.id ?? "(none)"}; payment=${realEvent?.data?.object?.payment_status ?? "(none)"}; pending_webhooks=${realEvent?.pending_webhooks ?? "(unknown)"}`
  );
  evidence.originalStripeDelivery = {
    eventId,
    endpointId: endpoint.id,
    pendingWebhooksFromEventApi: realEvent.pending_webhooks ?? null,
    applicationDatabaseAppliedEvent: true,
    exactHttpStatusAvailableViaStripeEventApi: false,
    exactHttpStatus: null,
    manualEvidenceRequired: true,
    manualEvidenceItem: `Stripe Workbench > Webhooks > ${endpoint.id} > event ${eventId}: record the original delivery HTTP status and confirm it is 2xx. The API event object and application database do not expose that historical response code.`
  };

  const authorityResponse = await sql(`
    select valid, reason, provider_event_id
      from public.consumer_packet_payment_authority('${BRIEFCASE_ITEM_ID}'::uuid, '${userId}'::uuid)
  `);
  const authorityRows = Array.isArray(authorityResponse.json) ? authorityResponse.json : [];
  const authority = authorityRows[0] ?? null;
  const beforeResponse = await sql(`
    select
      (select count(*)::int from public.consumer_briefcase_items where id = '${BRIEFCASE_ITEM_ID}' and payment_status = 'paid') as paid_items,
      (select count(*)::int from public.packet_render_jobs where briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as jobs,
      (select count(*)::int from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as consumptions,
      (select count(*)::int from public.processed_stripe_events where related_object_id = '${CHECKOUT_SESSION_ID}') as processed_events
  `);
  const before = Array.isArray(beforeResponse.json) ? beforeResponse.json[0] ?? null : null;
  record(
    "one_payment_authority_one_job_zero_preworker_consumption",
    authorityResponse.ok
      && authorityRows.length === 1
      && authority?.valid === true
      && authority?.reason === "authorized"
      && authority?.provider_event_id === eventId
      && beforeResponse.ok
      && Number(before?.paid_items) === 1
      && Number(before?.jobs) === 1
      && Number(before?.consumptions) === 0
      && Number(before?.processed_events) === 1,
    `authority rows=${authorityRows.length}; valid=${authority?.valid}; reason=${authority?.reason}; paid items=${before?.paid_items}; jobs=${before?.jobs}; consumptions=${before?.consumptions}; processed events=${before?.processed_events}`
  );

  const jobBeforeResponse = await sql(`
    select j.id, j.packet_id, j.route_id, j.renderer_kind, j.renderer_version,
           j.source_sha256, j.profile_id, j.profile_version, j.status,
           j.briefcase_item_id, j.consumer_briefcase_item_id, j.consumer_auth_user_id,
           j.partner_id, j.person_id, j.matter_id, j.created_at,
           p.state as packet_state, p.jurisdiction as packet_jurisdiction,
           p.pathway as packet_pathway, p.briefcase_id as packet_briefcase_id,
           p.user_id as packet_user_id, p.partner_slug as packet_partner_slug,
           p.document_type as packet_document_type, p.status as packet_status,
           p.generated_plain_text as packet_generated_plain_text,
           p.safety_disclaimer as packet_safety_disclaimer
      from public.packet_render_jobs j
      join public.rcap_document_packets p on p.id = j.packet_id
     where j.briefcase_item_id = '${BRIEFCASE_ITEM_ID}'
  `);
  const jobsBefore = Array.isArray(jobBeforeResponse.json) ? jobBeforeResponse.json : [];
  const jobBefore = jobsBefore[0] ?? null;
  const expectedPacketId = deterministicUuid(`${CONSUMER_PACKET_NAMESPACE}:${BRIEFCASE_ITEM_ID}`);
  record(
    "application_packet_contract_exact",
    jobBeforeResponse.ok
      && jobsBefore.length === 1
      && jobBefore?.route_id === EXPECTED_ROUTE_ID
      && jobBefore?.renderer_kind === "packet_document_v1"
      && jobBefore?.renderer_version === "1.0.0"
      && jobBefore?.source_sha256 === null
      && jobBefore?.profile_id === "PA"
      && jobBefore?.profile_version === "1.3.0"
      && jobBefore?.status === "queued"
      && jobBefore?.briefcase_item_id === BRIEFCASE_ITEM_ID
      && jobBefore?.consumer_briefcase_item_id === BRIEFCASE_ITEM_ID
      && jobBefore?.consumer_auth_user_id === userId
      && jobBefore?.partner_id === null
      && Boolean(jobBefore?.person_id)
      && Boolean(jobBefore?.matter_id)
      && jobBefore?.packet_id === expectedPacketId
      && jobBefore?.packet_state === "PA"
      && jobBefore?.packet_jurisdiction === "PA"
      && jobBefore?.packet_pathway === CONSUMER_PACKET_STORAGE_PATHWAY
      && jobBefore?.packet_briefcase_id === BRIEFCASE_ITEM_ID
      && jobBefore?.packet_user_id === userId
      && jobBefore?.packet_partner_slug === "expungement-ai-consumer"
      && jobBefore?.packet_document_type === "source_driven_packet"
      && jobBefore?.packet_status === "ready_for_review"
      && String(jobBefore?.packet_generated_plain_text ?? "").includes(CONSUMER_PACKET_SUMMARY)
      && String(jobBefore?.packet_generated_plain_text ?? "").includes(`Matter pathway: ${EXPECTED_PATHWAY_LABEL}.`)
      && jobBefore?.packet_safety_disclaimer === CONSUMER_PACKET_SAFETY_DISCLAIMER,
    `SQL=${jobBeforeResponse.status}; jobs=${jobsBefore.length}; id=${jobBefore?.id ?? "(none)"}; route=${jobBefore?.route_id ?? "(none)"}; renderer=${jobBefore?.renderer_kind ?? "(none)"}@${jobBefore?.renderer_version ?? "(none)"}; profile=${jobBefore?.profile_id ?? "(none)"}@${jobBefore?.profile_version ?? "(none)"}; status=${jobBefore?.status ?? "(none)"}; packet=${jobBefore?.packet_state ?? "(none)"}/${jobBefore?.packet_pathway ?? "(none)"}; deterministic packet id exact=${jobBefore?.packet_id === expectedPacketId}`
  );
  evidence.applicationOwnedPacket = {
    packetId: expectedPacketId,
    storagePathway: CONSUMER_PACKET_STORAGE_PATHWAY,
    authoritativeRouteId: EXPECTED_ROUTE_ID,
    createdByCanonicalApplication: true,
    createdAfterRealPayment: true,
    scriptPacketWritePerformed: false,
    compatibilityFixtureUsed: false
  };
  const jobId = jobBefore.id;

  // Replay the real Stripe Event object exactly as retrieved. The Buffer below
  // is serialized once, hashed, signed, and sent without any field override.
  const replayBody = Buffer.from(JSON.stringify(realEvent), "utf8");
  const replayBodySha256 = sha256(replayBody);
  const replaySignature = signedStripeBody(replayBody);
  const replayResponse = await callApp("/api/stripe/webhook", {
    method: "POST",
    body: replayBody,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": replaySignature.header
    }
  });
  record(
    "real_event_byte_equivalent_replay_accepted",
    replayResponse.status === 200
      && ["duplicate", "recovered"].includes(replayResponse.json?.outcome),
    `POST=${replayResponse.status}; outcome=${replayResponse.json?.outcome ?? "(none)"}; real event=${eventId}; exact signed/sent body sha256=${replayBodySha256}; fresh timestamp=${replaySignature.timestamp}`
  );
  evidence.replay = {
    eventId,
    source: "Stripe GET /v1/events/:id",
    realEventObjectMutated: false,
    bodySerializedOnce: true,
    signedBodySha256: replayBodySha256,
    sentBodySha256: replayBodySha256,
    freshSignatureTimestamp: replaySignature.timestamp,
    status: replayResponse.status,
    outcome: replayResponse.json?.outcome ?? null
  };

  const afterReplayResponse = await sql(`
    select
      (select count(*)::int from public.consumer_briefcase_items where id = '${BRIEFCASE_ITEM_ID}' and payment_status = 'paid') as paid_items,
      (select count(*)::int from public.packet_render_jobs where briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as jobs,
      (select count(*)::int from public.consumer_packet_payment_consumption where consumer_briefcase_item_id = '${BRIEFCASE_ITEM_ID}') as consumptions,
      (select count(*)::int from public.processed_stripe_events where related_object_id = '${CHECKOUT_SESSION_ID}') as processed_events
  `);
  const afterReplay = Array.isArray(afterReplayResponse.json) ? afterReplayResponse.json[0] ?? null : null;
  record(
    "real_event_replay_creates_no_second_authority_consumption_or_job",
    afterReplayResponse.ok
      && Number(afterReplay?.paid_items) === 1
      && Number(afterReplay?.jobs) === 1
      && Number(afterReplay?.consumptions) === 0
      && Number(afterReplay?.processed_events) === 1,
    `paid items ${before?.paid_items}→${afterReplay?.paid_items}; jobs ${before?.jobs}→${afterReplay?.jobs}; pre-worker consumptions ${before?.consumptions}→${afterReplay?.consumptions}; processed events ${before?.processed_events}→${afterReplay?.processed_events}`
  );

  const claimableResponse = await sql(`
    select id, status, renderer_kind, failure_disposition, next_attempt_at, claim_expires_at
      from public.packet_render_jobs
     where renderer_kind = 'packet_document_v1'
       and (
         status = 'queued'
         or (status = 'failed' and failure_disposition = 'retryable' and (next_attempt_at is null or next_attempt_at <= now()))
         or (status = 'claimed' and claim_expires_at is not null and claim_expires_at < now())
       )
     order by created_at, id
  `);
  const claimable = Array.isArray(claimableResponse.json) ? claimableResponse.json : [];
  record(
    "target_is_only_claimable_worker_job",
    claimableResponse.ok && claimable.length === 1 && claimable[0]?.id === jobId && claimable[0]?.status === "queued",
    `claimable packet_document_v1 jobs=${claimable.length}; ids=${claimable.map((candidate) => `${candidate.id}:${candidate.status}`).join(",")}`
  );

  const keysResponse = await managementApi(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const keys = Array.isArray(keysResponse.json) ? keysResponse.json : [];
  const anonKey = keys.find((candidate) => candidate.name === "anon")?.api_key ?? "";
  const serviceKey = keys.find((candidate) => candidate.name === "service_role")?.api_key ?? "";
  record(
    "acceptance_runtime_keys_available_for_worker_and_download_proof",
    keysResponse.ok && /^eyJ[A-Za-z0-9._-]+$/.test(anonKey) && /^eyJ[A-Za-z0-9._-]+$/.test(serviceKey) && anonKey !== serviceKey,
    `GET=${keysResponse.status}; anon present=${Boolean(anonKey)}; service present=${Boolean(serviceKey)}; distinct=${anonKey !== serviceKey}`
  );
  secretValues.push(anonKey, serviceKey);

  const inspect = spawnSync("docker", ["inspect", "--format={{join .RepoDigests \"\\n\"}}", WORKER_REF], {
    encoding: "utf8",
    timeout: 30000,
    env: dockerClientEnv()
  });
  const inspectOutput = sanitize(`${inspect.stdout ?? ""}${inspect.stderr ?? ""}`);
  record(
    "immutable_worker_image_is_still_local_and_exact",
    inspect.status === 0 && String(inspect.stdout ?? "").split(/\r?\n/).includes(WORKER_REF),
    `docker inspect exit=${inspect.status}; exact RepoDigest present=${String(inspect.stdout ?? "").split(/\r?\n/).includes(WORKER_REF)}; output=${inspectOutput.slice(0, 240)}`
  );

  const workerEnvPath = `/tmp/rcap-worker-runtime-${process.pid}-${crypto.randomUUID()}.env`;
  fs.writeFileSync(workerEnvPath, [
    `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}`,
    `SUPABASE_URL=${SUPABASE_URL}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `RCAP_WORKER_CONTAINER_DIGEST=${EXPECTED_WORKER_DIGEST}`,
    "RCAP_EVALUATOR_TODAY=2026-07-01"
  ].join("\n") + "\n", { mode: 0o600, flag: "wx" });
  let workerRun;
  try {
    workerRun = spawnSync("docker", [
      "run", "--rm", "--env-file", workerEnvPath,
      WORKER_REF,
      "node", "scripts/rcap-render-worker.mjs", "--once"
    ], {
      encoding: "utf8",
      timeout: 300000,
      env: dockerClientEnv()
    });
  } finally {
    fs.rmSync(workerEnvPath, { force: true });
  }
  const workerOutput = sanitize(`${workerRun?.stdout ?? ""}${workerRun?.stderr ?? ""}`);
  let workerCycle = null;
  for (const line of String(workerRun?.stdout ?? "").trim().split(/\r?\n/).reverse()) {
    try { workerCycle = JSON.parse(line); break; } catch { /* try the preceding line */ }
  }
  record(
    "immutable_worker_claims_and_finalizes_exact_job",
    workerRun?.status === 0
      && workerCycle?.outcome === "finalized"
      && workerCycle?.jobId === jobId
      && workerCycle?.accountingResult === "zero_charge"
      && workerCycle?.deliveryEligibility === "eligible",
    `docker run exit=${workerRun?.status}; outcome=${workerCycle?.outcome ?? "(none)"}; job=${workerCycle?.jobId ?? "(none)"}; accounting=${workerCycle?.accountingResult ?? "(none)"}; delivery=${workerCycle?.deliveryEligibility ?? "(none)"}; output tail=${workerOutput.slice(-300)}`
  );
  evidence.worker = {
    reference: WORKER_REF,
    digest: EXPECTED_WORKER_DIGEST,
    exitCode: workerRun.status,
    cycle: workerCycle,
    startedAfterRealPaymentAndReplayProof: true
  };

  const finalResponse = await sql(`
    select j.id, j.packet_id, j.route_id, j.renderer_kind, j.renderer_version,
           j.source_sha256, j.profile_id, j.profile_version, j.status,
           j.attempt_count, j.briefcase_item_id, j.consumer_briefcase_item_id,
           j.consumer_auth_user_id, j.partner_id, j.person_id, j.matter_id,
           j.output_storage_path, j.output_sha256, j.normalized_output_sha256,
           j.output_byte_count, j.page_count, j.container_digest,
           j.delivery_eligibility, j.accounting_result,
           p.state as packet_state, p.jurisdiction as packet_jurisdiction,
           p.pathway as packet_pathway, p.briefcase_id as packet_briefcase_id,
           p.user_id as packet_user_id, p.partner_slug as packet_partner_slug,
           p.document_type as packet_document_type, p.status as packet_status,
           p.generated_plain_text as packet_generated_plain_text,
           p.safety_disclaimer as packet_safety_disclaimer
      from public.packet_render_jobs j
      join public.rcap_document_packets p on p.id = j.packet_id
     where j.id = '${jobId}'
  `);
  const finalJob = Array.isArray(finalResponse.json) ? finalResponse.json[0] ?? null : null;
  const consumptionResponse = await sql(`
    select id, consumer_briefcase_item_id, consumer_auth_user_id, provider_event_id,
           person_id, matter_id, first_render_job_id, consumption_unit_hash
      from public.consumer_packet_payment_consumption
     where consumer_briefcase_item_id = '${BRIEFCASE_ITEM_ID}'
  `);
  const consumptions = Array.isArray(consumptionResponse.json) ? consumptionResponse.json : [];
  const consumption = consumptions[0] ?? null;
  const totalJobsResponse = await sql(`select count(*)::int as count from public.packet_render_jobs where briefcase_item_id = '${BRIEFCASE_ITEM_ID}'`);
  const totalJobs = Number(Array.isArray(totalJobsResponse.json) ? totalJobsResponse.json[0]?.count ?? -1 : -1);
  record(
    "one_consumption_and_one_finalized_pennsylvania_job_exact",
    finalResponse.ok
      && finalJob?.id === jobId
      && finalJob?.route_id === EXPECTED_ROUTE_ID
      && finalJob?.renderer_kind === "packet_document_v1"
      && finalJob?.renderer_version === "1.0.0"
      && finalJob?.source_sha256 === null
      && finalJob?.profile_id === "PA"
      && finalJob?.profile_version === "1.3.0"
      && finalJob?.status === "artifact_validated"
      && finalJob?.container_digest === EXPECTED_WORKER_DIGEST
      && finalJob?.delivery_eligibility === "eligible"
      && finalJob?.accounting_result === "zero_charge"
      && finalJob?.packet_id === expectedPacketId
      && finalJob?.packet_state === "PA"
      && finalJob?.packet_jurisdiction === "PA"
      && finalJob?.packet_pathway === CONSUMER_PACKET_STORAGE_PATHWAY
      && finalJob?.packet_briefcase_id === BRIEFCASE_ITEM_ID
      && finalJob?.packet_user_id === userId
      && finalJob?.packet_partner_slug === "expungement-ai-consumer"
      && finalJob?.packet_document_type === "source_driven_packet"
      && finalJob?.packet_status === "ready_for_review"
      && String(finalJob?.packet_generated_plain_text ?? "").includes(CONSUMER_PACKET_SUMMARY)
      && String(finalJob?.packet_generated_plain_text ?? "").includes(`Matter pathway: ${EXPECTED_PATHWAY_LABEL}.`)
      && finalJob?.packet_safety_disclaimer === CONSUMER_PACKET_SAFETY_DISCLAIMER
      && consumptionResponse.ok
      && consumptions.length === 1
      && consumption?.consumer_briefcase_item_id === BRIEFCASE_ITEM_ID
      && consumption?.consumer_auth_user_id === userId
      && consumption?.provider_event_id === eventId
      && consumption?.person_id === finalJob?.person_id
      && String(consumption?.matter_id) === String(finalJob?.matter_id)
      && consumption?.first_render_job_id === jobId
      && /^[0-9a-f]{64}$/.test(consumption?.consumption_unit_hash ?? "")
      && totalJobsResponse.ok
      && totalJobs === 1,
    `job=${finalJob?.id ?? "(none)"}; route=${finalJob?.route_id ?? "(none)"}; status=${finalJob?.status ?? "(none)"}; digest=${finalJob?.container_digest ?? "(none)"}; accounting=${finalJob?.accounting_result ?? "(none)"}; delivery=${finalJob?.delivery_eligibility ?? "(none)"}; consumptions=${consumptions.length}; total jobs=${totalJobs}; identity exact=${consumption?.person_id === finalJob?.person_id && String(consumption?.matter_id) === String(finalJob?.matter_id)}`
  );

  const bucketResponse = await sql(`select id, public from storage.buckets where id = '${ARTIFACT_BUCKET}'`);
  const buckets = Array.isArray(bucketResponse.json) ? bucketResponse.json : [];
  const artifactPath = finalJob.output_storage_path ?? "";
  record(
    "artifact_bucket_and_path_are_private_and_content_addressed",
    bucketResponse.ok
      && buckets.length === 1
      && buckets[0]?.public === false
      && artifactPath.includes(jobId)
      && artifactPath.includes(finalJob.output_sha256 ?? "")
      && artifactPath.endsWith(".pdf"),
    `bucket rows=${buckets.length}; public=${buckets[0]?.public}; path binds job=${artifactPath.includes(jobId)}; path binds hash=${artifactPath.includes(finalJob.output_sha256 ?? "")}; PDF suffix=${artifactPath.endsWith(".pdf")}`
  );
  const encodedPath = artifactPath.split("/").map(encodeURIComponent).join("/");
  const publicRead = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${ARTIFACT_BUCKET}/${encodedPath}`, {
    redirect: "manual"
  }).catch(() => null);
  const serviceRead = await fetch(`${SUPABASE_URL}/storage/v1/object/${ARTIFACT_BUCKET}/${encodedPath}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    redirect: "manual"
  }).catch(() => null);
  const storedBytes = serviceRead?.ok ? Buffer.from(await serviceRead.arrayBuffer()) : Buffer.alloc(0);
  const storedSha256 = sha256(storedBytes);
  let storedNormalizedSha256 = "";
  let pdf = null;
  try {
    storedNormalizedSha256 = storedBytes.length > 0 ? await computeNormalizedFingerprint(storedBytes) : "";
    pdf = storedBytes.length > 0 ? await PDFDocument.load(storedBytes) : null;
  } catch { /* asserted below */ }
  const pages = pdf?.getPages() ?? [];
  const letterPages = pages.every((page) => {
    const { width, height } = page.getSize();
    return Math.abs(width - 612) < 0.01 && Math.abs(height - 792) < 0.01;
  });
  record(
    "private_storage_bytes_reread_hash_and_pdf_validate",
    Boolean(publicRead)
      && publicRead.status !== 200
      && serviceRead?.status === 200
      && storedBytes.length > 0
      && storedBytes.subarray(0, 5).toString("latin1") === "%PDF-"
      && storedSha256 === finalJob.output_sha256
      && storedNormalizedSha256 === finalJob.normalized_output_sha256
      && storedBytes.length === Number(finalJob.output_byte_count)
      && pages.length === Number(finalJob.page_count)
      && pages.length > 0
      && letterPages,
    `anonymous public read=${publicRead?.status ?? "unreachable"}; service read=${serviceRead?.status ?? "unreachable"}; bytes=${storedBytes.length}/${finalJob.output_byte_count}; sha exact=${storedSha256 === finalJob.output_sha256}; normalized exact=${storedNormalizedSha256 === finalJob.normalized_output_sha256}; PDF=${storedBytes.subarray(0, 5).toString("latin1") === "%PDF-"}; pages=${pages.length}/${finalJob.page_count}; letter pages=${letterPages}`
  );
  evidence.storage = {
    bucket: ARTIFACT_BUCKET,
    bucketPublic: false,
    objectPath: artifactPath,
    anonymousPublicReadStatus: publicRead?.status ?? null,
    authorizedRereadStatus: serviceRead?.status ?? null,
    byteCount: storedBytes.length,
    outputSha256: storedSha256,
    normalizedOutputSha256: storedNormalizedSha256,
    pageCount: pages.length,
    allPagesLetter: letterPages
  };

  const A = await signIn("acceptance-consumer-a@rcap-acceptance.test", "Acceptance-a-4f7c21!", anonKey);
  const B = await signIn("acceptance-consumer-b@rcap-acceptance.test", "Acceptance-b-8d3e95!", anonKey);
  record(
    "synthetic_download_identities_exact",
    Boolean(A && B) && A.id === userId && A.id !== B.id,
    `A signed in=${Boolean(A)} and owns item=${A?.id === userId}; B signed in=${Boolean(B)} and distinct=${A?.id !== B?.id}`
  );
  const briefcasePage = await callApp(`/briefcase/${encodeURIComponent(BRIEFCASE_ITEM_ID)}`, { cookie: A.cookie });
  const readyCopy = /Prepared, ready to print|Your documents|Your packet is ready/i.test(briefcasePage.text);
  record(
    "consumer_a_briefcase_shows_ready",
    item?.packet_status === "ready"
      && item?.artifact_refs_json !== null
      && typeof item?.artifact_refs_json === "object"
      && briefcasePage.status === 200
      && readyCopy,
    `database packet_status=${item?.packet_status ?? "(none)"}; artifact refs present=${item?.artifact_refs_json !== null && typeof item?.artifact_refs_json === "object"}; A Briefcase GET=${briefcasePage.status}; ready copy=${readyCopy}`
  );

  const downloadPath = `/api/rcap/packets/${encodeURIComponent(jobId)}/download`;
  const ownerDownload = await callApp(downloadPath, { cookie: A.cookie });
  record(
    "consumer_a_downloads_exact_worker_pdf",
    ownerDownload.status === 200
      && ownerDownload.contentType.toLowerCase().startsWith("application/pdf")
      && /attachment/i.test(ownerDownload.contentDisposition)
      && ownerDownload.bytes.length === storedBytes.length
      && sha256(ownerDownload.bytes) === storedSha256
      && ownerDownload.bytes.subarray(0, 5).toString("latin1") === "%PDF-",
    `A download=${ownerDownload.status}; content-type=${ownerDownload.contentType}; disposition attachment=${/attachment/i.test(ownerDownload.contentDisposition)}; bytes=${ownerDownload.bytes.length}; stored bytes=${storedBytes.length}; sha exact=${sha256(ownerDownload.bytes) === storedSha256}; PDF=${ownerDownload.bytes.subarray(0, 5).toString("latin1") === "%PDF-"}`
  );
  const strangerDownload = await callApp(downloadPath, { cookie: B.cookie });
  const anonymousDownload = await callApp(downloadPath);
  record(
    "consumer_b_and_anonymous_cannot_download_worker_pdf",
    strangerDownload.status === 403 && anonymousDownload.status === 401,
    `B download=${strangerDownload.status}; anonymous download=${anonymousDownload.status}`
  );

  let delivered = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const deliveryResponse = await sql(`
      select j.status,
             (select count(*)::int from public.packet_delivery_events e where e.render_job_id = j.id and e.event_type = 'delivery_authorized') as authorized,
             (select count(*)::int from public.packet_delivery_events e where e.render_job_id = j.id and e.event_type = 'transmission_started') as started,
             (select count(*)::int from public.packet_delivery_events e where e.render_job_id = j.id and e.event_type = 'transmission_completed') as completed
        from public.packet_render_jobs j
       where j.id = '${jobId}'
    `);
    delivered = Array.isArray(deliveryResponse.json) ? deliveryResponse.json[0] ?? null : null;
    if (delivered?.status === "delivered" && Number(delivered?.completed) >= 1) break;
    await sleep(500);
  }
  record(
    "owner_pdf_stream_records_completed_delivery",
    delivered?.status === "delivered"
      && Number(delivered?.authorized) >= 1
      && Number(delivered?.started) >= 1
      && Number(delivered?.completed) >= 1,
    `job status=${delivered?.status ?? "(none)"}; delivery_authorized=${delivered?.authorized ?? 0}; transmission_started=${delivered?.started ?? 0}; transmission_completed=${delivered?.completed ?? 0}`
  );
  evidence.delivery = {
    jobId,
    ownerStatus: ownerDownload.status,
    ownerContentType: ownerDownload.contentType,
    ownerByteCount: ownerDownload.bytes.length,
    ownerSha256: sha256(ownerDownload.bytes),
    consumerBStatus: strangerDownload.status,
    anonymousStatus: anonymousDownload.status,
    database: delivered
  };

  evidence.outcome = evidence.originalStripeDelivery.manualEvidenceRequired
    ? "post_payment_acceptance_passed_workbench_http_status_evidence_required"
    : "post_payment_acceptance_passed";
  evidence.passed = true;
  writeEvidence();
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, [
      `job_id=${jobId}`,
      `provider_event_id=${eventId}`,
      `pdf_sha256=${storedSha256}`,
      `download_path=${downloadPath}`,
      "workbench_http_status_evidence_required=true"
    ].join("\n") + "\n");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
      "## Pennsylvania post-payment acceptance passed",
      "",
      `- Real Stripe event: ${eventId}`,
      `- Checkout Session: ${CHECKOUT_SESSION_ID}`,
      `- Immutable worker: ${EXPECTED_WORKER_DIGEST}`,
      `- Render job: ${jobId}`,
      `- PDF SHA-256: ${storedSha256}`,
      `- Owner download: ${new URL(downloadPath, PUBLIC_URL)}`,
      "- Consumer B: denied; anonymous: denied",
      `- Application-owned packet: ${expectedPacketId}, storage pathway ${CONSUMER_PACKET_STORAGE_PATHWAY}; authoritative job route ${EXPECTED_ROUTE_ID}`,
      `- Manual Workbench evidence still required: record the original delivery HTTP status for ${eventId}; do not infer it from pending_webhooks or the database`,
      "- Acceptance fixture preserved",
      ""
    ].join("\n"));
  }
  console.log("PENNSYLVANIA POST-PAYMENT ACCEPTANCE PASSED — original Stripe delivery HTTP status remains a distinct Workbench evidence item");
}

main().catch((error) => {
  evidence.passed = false;
  evidence.outcome = error instanceof AcceptanceFailure ? "acceptance_gate_failed" : "unexpected_error";
  evidence.failure = {
    caseId: error instanceof AcceptanceFailure ? error.caseId : null,
    message: sanitize(error instanceof Error ? error.message : error)
  };
  writeEvidence();
  console.error(`POST-PAYMENT ACCEPTANCE FAILED — ${evidence.failure.message}`);
  process.exit(1);
});
