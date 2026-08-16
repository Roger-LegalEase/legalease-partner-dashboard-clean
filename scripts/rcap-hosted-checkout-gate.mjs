#!/usr/bin/env node
// Reuse-only hosted Checkout gate.
//
// This script never deploys, migrates, completes a payment, runs the worker, or
// cleans up its fixture. It verifies one exact existing Preview deployment,
// checks the existing Stripe sandbox webhook before any write, creates exactly
// one Checkout Session through the deployed application, proves that both the
// Session and Briefcase item remain unpaid, emits Roger's direct Stripe-hosted
// URL, and stops.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, "hosted-acceptance-evidence");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "checkout-gate.json");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const DEPLOYMENT_ID = process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "";
const WORKER_REF = process.env.HOSTED_WORKER_DIGEST_REF ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const STRIPE_KEY = process.env.HOSTED_STRIPE_TEST_SECRET ?? "";
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const EXPECTED_APPLICATION_SHA = "664b8ddd374642bf2bd1820f7e05224f3dd081bc";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_WORKER_DIGEST = "sha256:e958cb057abaa1c22902d01ffe0e42aec0feb09118ba9f2bc44210cbdeb244c7";
const EXPECTED_WORKER_REF = `ghcr.io/roger-legalease/rcap-render-worker@${EXPECTED_WORKER_DIGEST}`;
const EXPECTED_ACCEPTANCE_ORIGIN = `https://rcap-acceptance-${EXPECTED_PROJECT_REF}.vercel.app`;
const PA_PATHWAY = "Path A — Non-conviction expungement";
const EXPECTED_EVENTS = [
  "checkout.session.async_payment_succeeded",
  "checkout.session.completed",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
].sort();

const secrets = [VERCEL_TOKEN, SUPABASE_ACCESS_TOKEN, STRIPE_KEY, BYPASS].filter(Boolean);
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text
    .replace(/(x-vercel-protection-bypass=)[^&\s"']+/gi, "$1***REDACTED***")
    .replace(/sk_(test|live)_[A-Za-z0-9_]+/g, "***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-hosted-checkout-gate/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  requestedDeploymentId: DEPLOYMENT_ID,
  workerDigest: EXPECTED_WORKER_DIGEST,
  stripeMode: "sandbox",
  deploymentCreated: false,
  migrationApplied: false,
  syntheticCompletionCreated: false,
  workerRun: false,
  fixtureRetainedForRoger: false,
  requestsUsedCookieBootstrap: false,
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

let vercelScopeName = null;
function scopedVercelUrl(pathname, scopeName) {
  const joiner = pathname.includes("?") ? "&" : "?";
  return `https://api.vercel.com${pathname}${joiner}${scopeName}=${encodeURIComponent(VERCEL_ORG_ID)}`;
}

async function vercelFetch(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced through sanitized text */ }
  return { status: response.status, json, text: sanitize(text).slice(0, 500) };
}

async function vercelApi(pathname) {
  if (vercelScopeName) return vercelFetch(scopedVercelUrl(pathname, vercelScopeName));
  const candidates = VERCEL_ORG_ID.startsWith("team_") ? ["teamId", "slug"] : ["slug", "teamId"];
  let last = null;
  for (const candidate of candidates) {
    last = await vercelFetch(scopedVercelUrl(pathname, candidate));
    if (last.status < 400) {
      vercelScopeName = candidate;
      return last;
    }
  }
  return last;
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

function queryBypassUrl(previewUrl, pathname) {
  const url = new URL(pathname, previewUrl);
  url.searchParams.set("x-vercel-protection-bypass", BYPASS);
  return url;
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

async function callApp(previewUrl, pathname, { method = "GET", cookie = null, body = null } = {}) {
  return observe(queryBypassUrl(previewUrl, pathname), {
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
    ["HOSTED_PREVIEW_DEPLOYMENT_ID", DEPLOYMENT_ID],
    ["HOSTED_WORKER_DIGEST_REF", WORKER_REF],
    ["VERCEL_TOKEN", VERCEL_TOKEN],
    ["VERCEL_ORG_ID", VERCEL_ORG_ID],
    ["VERCEL_PROJECT_ID", VERCEL_PROJECT_ID],
    ["SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN],
    ["HOSTED_STRIPE_TEST_SECRET", STRIPE_KEY],
    ["VERCEL_AUTOMATION_BYPASS_SECRET", BYPASS]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) throw new GateFailure("required_inputs_present", `missing ${missing.join(", ")}`);

  record(
    "immutable_inputs_exact",
    APPLICATION_SHA === EXPECTED_APPLICATION_SHA && PROJECT_REF === EXPECTED_PROJECT_REF && WORKER_REF === EXPECTED_WORKER_REF && STRIPE_KEY.startsWith("sk_test_"),
    `application=${APPLICATION_SHA}; project=${PROJECT_REF}; worker=${WORKER_REF}; Stripe key is sk_test_=${STRIPE_KEY.startsWith("sk_test_")}`
  );

  // Exact existing deployment only. There is intentionally no list-and-pick or
  // create fallback in this gate.
  const projectResponse = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
  const canonicalProjectId = projectResponse.json?.id ?? null;
  record(
    "vercel_project_identity_resolved",
    projectResponse.status === 200
      && Boolean(canonicalProjectId)
      && (projectResponse.json?.id === VERCEL_PROJECT_ID || projectResponse.json?.name === VERCEL_PROJECT_ID),
    `project lookup=${projectResponse.status}; canonical id present=${Boolean(canonicalProjectId)}; scope parameter=${vercelScopeName ?? "(unresolved)"}`
  );

  const deploymentResponse = await vercelApi(`/v13/deployments/${encodeURIComponent(DEPLOYMENT_ID)}`);
  const deployment = deploymentResponse.json;
  const resolvedDeploymentId = deployment?.id ?? deployment?.uid ?? null;
  const deploymentProjectId = deployment?.projectId ?? deployment?.project?.id ?? null;
  const deploymentOk = deploymentResponse.status === 200
    && resolvedDeploymentId === DEPLOYMENT_ID
    && (deployment?.readyState ?? deployment?.state) === "READY"
    && (deployment?.target === null || deployment?.target === undefined || deployment?.target === "preview")
    && deploymentProjectId === canonicalProjectId
    && deployment?.meta?.rcapApplicationSha === APPLICATION_SHA
    && deployment?.meta?.rcapAcceptanceProjectRef === PROJECT_REF
    && deployment?.meta?.rcapStripeConfigured === "true"
    && deployment?.meta?.rcapRouteState === "staging_scoped"
    && deployment?.meta?.rcapPublicOrigin === EXPECTED_ACCEPTANCE_ORIGIN
    && Array.isArray(deployment?.alias)
    && deployment.alias.includes(new URL(EXPECTED_ACCEPTANCE_ORIGIN).hostname)
    && typeof deployment?.url === "string";
  record(
    "exact_ready_preview_reused",
    deploymentOk,
    `GET deployment=${deploymentResponse.status}; id=${resolvedDeploymentId}; project matches=${deploymentProjectId === canonicalProjectId}; ready=${deployment?.readyState ?? deployment?.state}; target=${JSON.stringify(deployment?.target ?? null)}; app=${deployment?.meta?.rcapApplicationSha ?? "(absent)"}; ref=${deployment?.meta?.rcapAcceptanceProjectRef ?? "(absent)"}; stripe=${deployment?.meta?.rcapStripeConfigured ?? "(absent)"}; route=${deployment?.meta?.rcapRouteState ?? "(absent)"}; public origin=${deployment?.meta?.rcapPublicOrigin ?? "(absent)"}`
  );
  const previewUrl = deployment.meta.rcapPublicOrigin;
  evidence.deployment = {
    id: DEPLOYMENT_ID,
    generatedHostname: deployment.url,
    acceptanceOrigin: previewUrl,
    target: deployment.target ?? null,
    readyState: deployment.readyState ?? deployment.state,
    applicationSha: deployment.meta.rcapApplicationSha,
    acceptanceProjectRef: deployment.meta.rcapAcceptanceProjectRef
  };

  // The immutable worker is pulled and inspected, but never run before Roger's
  // real payment.
  const dockerChildEnv = {};
  for (const key of ["PATH", "HOME", "DOCKER_CONFIG"]) {
    if (process.env[key]) dockerChildEnv[key] = process.env[key];
  }
  const pull = spawnSync("docker", ["pull", WORKER_REF], {
    encoding: "utf8",
    timeout: 600000,
    env: dockerChildEnv
  });
  const inspect = pull.status === 0
    ? spawnSync("docker", ["inspect", "--format={{join .RepoDigests \"\\n\"}}", WORKER_REF], {
      encoding: "utf8",
      timeout: 30000,
      env: dockerChildEnv
    })
    : { status: null, stdout: "", stderr: "" };
  const repoDigests = String(inspect.stdout ?? "").trim().split(/\r?\n/).filter(Boolean);
  const pulledDigest = repoDigests.find((entry) => entry.endsWith(`@${EXPECTED_WORKER_DIGEST}`)) ?? null;
  record(
    "worker_pulled_by_immutable_digest",
    pull.status === 0 && inspect.status === 0 && Boolean(pulledDigest),
    `docker pull exit=${pull.status}; inspect exit=${inspect.status}; exact RepoDigest present=${Boolean(pulledDigest)}; pull tail=${sanitize(`${pull.stdout ?? ""}${pull.stderr ?? ""}`).slice(-260)}`
  );
  evidence.workerPull = { reference: WORKER_REF, exactRepoDigestObserved: pulledDigest, workerStarted: false };

  // Compare the real Stripe sandbox destination before any database write or
  // Checkout creation. The bypass value is compared in memory and never emitted.
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
  const requiredWebhookUrl = queryBypassUrl(previewUrl, "/api/stripe/webhook");
  const eventSetOk = sameStringSet(webhook.enabled_events ?? [], EXPECTED_EVENTS);
  record(
    "webhook_event_set_and_mode_preserved",
    webhook.status === "enabled" && webhook.livemode === false && eventSetOk,
    `endpoint=${webhook.id}; status=${webhook.status}; livemode=${webhook.livemode}; events=${JSON.stringify([...(webhook.enabled_events ?? [])].sort())}`
  );
  const queryEntries = [...currentWebhookUrl.searchParams.entries()];
  const webhookUrlExact = currentWebhookUrl.origin === requiredWebhookUrl.origin
    && currentWebhookUrl.pathname === requiredWebhookUrl.pathname
    && queryEntries.length === 1
    && queryEntries[0][0] === "x-vercel-protection-bypass"
    && queryEntries[0][1] === BYPASS;
  evidence.webhookDestination = {
    endpointId: webhook.id,
    current: endpointShape(webhook.url),
    required: { host: requiredWebhookUrl.host, pathname: requiredWebhookUrl.pathname, queryParameterNames: ["x-vercel-protection-bypass"] },
    exact: webhookUrlExact,
    enabledEvents: [...(webhook.enabled_events ?? [])].sort(),
    editExistingDestinationOnly: true,
    signingSecretMustRemainUnchanged: true
  };
  if (!webhookUrlExact) {
    evidence.outcome = "stripe_webhook_url_update_required";
    evidence.passed = false;
    writeEvidence();
    console.log("STRIPE WEBHOOK URL UPDATE REQUIRED");
    console.log(`  current host: ${currentWebhookUrl.host}`);
    console.log(`  required host: ${requiredWebhookUrl.host}`);
    console.log("  required endpoint: /api/stripe/webhook?x-vercel-protection-bypass=<existing secret>");
    process.exit(78);
  }
  record("canonical_webhook_destination_exact", true, `existing endpoint ${webhook.id} already targets ${requiredWebhookUrl.host} with only the required bypass parameter`);

  // Both mechanisms must independently reach application JSON. No request in
  // this gate asks Vercel to mint a bypass cookie.
  const healthHeader = await observe(`${previewUrl}/api/health`, {
    headers: { "x-vercel-protection-bypass": BYPASS }
  });
  const healthQuery = await observe(queryBypassUrl(previewUrl, "/api/health"));
  const applicationHealth = (result) => result.status === 200 && result.json && typeof result.json.checks === "object";
  record(
    "header_only_bypass_reaches_application_json",
    applicationHealth(healthHeader),
    `status=${healthHeader.status}; content-type=${healthHeader.contentType}; location=${healthHeader.location || "(none)"}; application JSON=${applicationHealth(healthHeader)}`
  );
  record(
    "query_only_bypass_reaches_application_json",
    applicationHealth(healthQuery),
    `status=${healthQuery.status}; content-type=${healthQuery.contentType}; location=${healthQuery.location || "(none)"}; application JSON=${applicationHealth(healthQuery)}`
  );
  evidence.health = {
    headerOnly: { status: healthHeader.status, applicationJson: applicationHealth(healthHeader) },
    queryOnly: { status: healthQuery.status, applicationJson: applicationHealth(healthQuery) }
  };

  const webhookProbe = await observe(requiredWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  record(
    "canonical_webhook_reaches_application",
    webhookProbe.status === 400 && webhookProbe.json?.error === "Missing Stripe signature.",
    `unsigned query-only POST=${webhookProbe.status}; application error=${JSON.stringify(webhookProbe.json?.error ?? null)}`
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

  const { buildRenderJobSpec } = await import("../src/lib/rcap/render/job-contract.ts");
  const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
  const { isConsumerPaymentAllowed } = await import("../src/lib/expungement-ai/eligibility-adapter.ts");
  const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
  const { consumerMatterIdForItem, consumerPersonMatchKey, CONSUMER_PERSON_NAMESPACE } = await import("../src/lib/expungement-ai/consumer-identity.ts");
  const { packetInformationReviewSafety, reviewedPacketInputHash } = await import("../src/lib/expungement-ai/packet-information.ts");
  const consumerRenderSource = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/consumer-render-request.ts"), "utf8");
  const eligibilitySource = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/eligibility-adapter.ts"), "utf8");
  const callerVersionMatch = consumerRenderSource.match(/buildRenderJobSpec\(\{[\s\S]*?profileVersion:\s*"([^"]+)"/);
  const packetTypeMatch = eligibilitySource.match(/resultCode === "packet_ready"\s*\|\|\s*resultCode === "packet_ready_with_caution"\)\s*return "([^"]+)"/);
  const consumerProfileVersion = callerVersionMatch?.[1] ?? null;
  const compiledProfile = getProfileByJurisdiction("PA");
  const compiledPathway = compiledProfile?.pathways?.find((candidate) => candidate.label === PA_PATHWAY) ?? null;
  const screeningMatterId = `hosted-checkout-${crypto.randomUUID()}`;
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
    jurisdiction: "PA",
    profileVersion: compiledProfile?.profileVersion,
    matterId: screeningMatterId,
    answers: screeningAnswers
  });
  const consumerResultCode = authoritativeScreening.evaluation.resultCode;
  const consumerPacketType = authoritativeScreening.packetType ?? packetTypeMatch?.[1] ?? null;
  record(
    "consumer_caller_profile_and_eligibility_mapping_exact",
    consumerProfileVersion === "1.3.0"
      && consumerPacketType === "custom_pleading"
      && consumerResultCode === "packet_ready_with_caution"
      && authoritativeScreening.evaluation.pathwayId === compiledPathway?.id
      && isConsumerPaymentAllowed(consumerResultCode, true) === true
      && compiledProfile?.jurisdiction?.code === "PA"
      && compiledPathway?.label === PA_PATHWAY,
    `caller profile=${consumerProfileVersion ?? "(not derived)"}; compiled profile=${compiledProfile?.profileVersion ?? "(absent)"}; pathway id=${compiledPathway?.id ?? "(absent)"}; result=${consumerResultCode}; packet=${consumerPacketType ?? "(not derived)"}; payment admitted=${isConsumerPaymentAllowed(consumerResultCode, true)}`
  );

  // Begin with the same hosted, unauthenticated free-check boundary used by a
  // DTC participant. Only the four client-owned screening fields are sent;
  // route identity, payment posture, packet type, and pathway stay server-owned.
  const evaluateResponse = await callApp(previewUrl, "/api/expungement-ai/evaluate", {
    method: "POST",
    body: {
      jurisdiction: "PA",
      profileVersion: compiledProfile?.profileVersion,
      matterId: screeningMatterId,
      answers: screeningAnswers
    }
  });
  const hostedEvaluation = evaluateResponse.json;
  const hostedFreeCheckExact = evaluateResponse.status === 200
    && hostedEvaluation?.jurisdiction === "PA"
    && hostedEvaluation?.profileVersion === compiledProfile?.profileVersion
    && hostedEvaluation?.matterId === screeningMatterId
    && hostedEvaluation?.pathwayId === compiledPathway?.id
    && hostedEvaluation?.pathwayLabel === PA_PATHWAY
    && hostedEvaluation?.resultCode === consumerResultCode
    && hostedEvaluation?.resultCode === "packet_ready_with_caution"
    && hostedEvaluation?.paymentAllowed === true
    && hostedEvaluation?.packetPlan?.pathwayId === compiledPathway?.id
    && hostedEvaluation?.packetPlan?.mode === "state_specific_custom_packet_from_source_rules"
    && JSON.stringify(hostedEvaluation?.packetPlan?.requiredInputIds ?? [])
      === JSON.stringify(authoritativeScreening.evaluation.packetPlan?.requiredInputIds ?? []);
  record(
    "hosted_dtc_free_check_authoritative_pa_path_a",
    hostedFreeCheckExact,
    `POST evaluate=${evaluateResponse.status}; jurisdiction=${hostedEvaluation?.jurisdiction ?? "(none)"}; pathway=${hostedEvaluation?.pathwayId ?? "(none)"}; result=${hostedEvaluation?.resultCode ?? "(none)"}; payable=${hostedEvaluation?.paymentAllowed}`
  );
  evidence.freeCheck = {
    endpoint: "/api/expungement-ai/evaluate",
    matterId: screeningMatterId,
    jurisdiction: hostedEvaluation.jurisdiction,
    profileVersion: hostedEvaluation.profileVersion,
    pathwayId: hostedEvaluation.pathwayId,
    pathwayLabel: hostedEvaluation.pathwayLabel,
    resultCode: hostedEvaluation.resultCode,
    paymentAllowed: hostedEvaluation.paymentAllowed,
    packetPlan: hostedEvaluation.packetPlan
  };

  // Hand the same screening inputs—not the public response's route facts—to
  // the pending-result boundary, then claim it as the signed-in synthetic DTC
  // participant. Claim re-evaluates server-side and is the only creator of the
  // Briefcase item used by this gate.
  const pendingResponse = await callApp(previewUrl, "/api/expungement-ai/screening/pending", {
    method: "POST",
    body: {
      product: "expungement_ai_dtc",
      jurisdiction: "PA",
      profileVersion: compiledProfile?.profileVersion,
      matterId: screeningMatterId,
      answers: screeningAnswers
    }
  });
  const pendingId = pendingResponse.json?.pendingId ?? null;
  record(
    "anonymous_pending_result_created_from_screening_inputs",
    pendingResponse.status === 200
      && pendingResponse.json?.ok === true
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pendingId ?? ""),
    `POST pending=${pendingResponse.status}; ok=${pendingResponse.json?.ok}; pending id present=${Boolean(pendingId)}`
  );
  const claimResponse = await callApp(previewUrl, "/api/expungement-ai/screening/pending/claim", {
    method: "POST",
    cookie: A.cookie,
    body: { pendingId, next: "/briefcase" }
  });
  const itemId = claimResponse.json?.itemId ?? null;
  record(
    "authenticated_pending_claim_created_authoritative_briefcase_item",
    claimResponse.status === 200
      && claimResponse.json?.ok === true
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId ?? "")
      && claimResponse.json?.redirectTo === `/briefcase/${itemId}`,
    `POST claim=${claimResponse.status}; ok=${claimResponse.json?.ok}; item id present=${Boolean(itemId)}; redirect=${claimResponse.json?.redirectTo ?? "(none)"}`
  );
  evidence.fixtureRetainedForRoger = true;
  evidence.screeningHandoff = {
    pendingId,
    claimEndpoint: "/api/expungement-ai/screening/pending/claim",
    authenticatedUserId: A.id,
    itemId,
    redirectTo: claimResponse.json.redirectTo
  };

  const built = buildRenderJobSpec({
    packetId: crypto.randomUUID(),
    state: "PA",
    pathway: PA_PATHWAY,
    profileId: "PA",
    profileVersion: consumerProfileVersion,
    briefcaseItemId: itemId,
    trackId: null,
    packetFields: {}
  });
  const routeIdentity = {
    routeKind: built.route?.routeKind ?? null,
    routeId: built.spec?.routeId ?? null,
    pathwayId: built.route?.pathwayId ?? null,
    jurisdiction: built.route?.jurisdiction ?? null,
    rendererKind: built.spec?.rendererKind ?? null,
    rendererVersion: built.spec?.rendererVersion ?? null,
    profileId: built.spec?.profileId ?? null,
    profileVersion: built.spec?.profileVersion ?? null,
    sourceSha256: built.spec?.sourceSha256 ?? null,
    sellable: built.route?.sellable ?? null,
    creditConsumable: built.route?.creditConsumable ?? null,
    resultCode: consumerResultCode,
    packetType: consumerPacketType
  };
  const routeExact = routeIdentity.routeKind === "legacy_verified"
    && routeIdentity.routeId === `PA:${PA_PATHWAY}`
    && routeIdentity.pathwayId === PA_PATHWAY
    && routeIdentity.jurisdiction === "PA"
    && routeIdentity.rendererKind === "packet_document_v1"
    && routeIdentity.rendererVersion === "1.0.0"
    && routeIdentity.profileId === "PA"
    && routeIdentity.profileVersion === "1.3.0"
    && routeIdentity.sourceSha256 === null
    && routeIdentity.sellable === true
    && routeIdentity.creditConsumable === true;
  record("pennsylvania_path_a_resolver_exact", routeExact, JSON.stringify(routeIdentity));
  evidence.pennsylvaniaRoute = routeIdentity;

  const claimedRead = await sql(`
    select id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
           status, payment_status, payment_allowed, checkout_session_id, payment_provider,
           amount_cents, packet_status, source_session_id, artifact_refs_json
      from public.consumer_briefcase_items
     where id = '${itemId}' and user_id = '${A.id}'
  `);
  const claimedRows = Array.isArray(claimedRead.json) ? claimedRead.json : [];
  const claimed = claimedRows[0] ?? null;
  const claimedFlow = claimed?.artifact_refs_json?.commercialFlow;
  const claimedExact = claimedRead.ok
    && claimedRows.length === 1
    && claimed?.item_type === "result"
    && claimed?.jurisdiction === "PA"
    && claimed?.pathway_label === PA_PATHWAY
    && claimed?.result_code === consumerResultCode
    && claimed?.packet_type === consumerPacketType
    && claimed?.status === "packet_ready"
    && claimed?.payment_status === "unpaid"
    && claimed?.payment_allowed === true
    && claimed?.checkout_session_id === null
    && claimed?.payment_provider === null
    && Number(claimed?.amount_cents) === 5000
    && claimed?.packet_status === "not_started"
    && claimed?.source_session_id === pendingId
    && claimedFlow?.entitlementSource === "consumer_payment"
    && claimedFlow?.productId === "expungement_packet"
    && claimedFlow?.screening?.profileVersion === compiledProfile?.profileVersion
    && claimedFlow?.screening?.screeningMatterId === screeningMatterId
    && claimedFlow?.screening?.pathwayId === compiledPathway?.id
    && claimedFlow?.screening?.pathwayLabel === PA_PATHWAY
    && claimedFlow?.screening?.resultCode === consumerResultCode
    && claimedFlow?.screening?.paymentAllowed === true
    && claimedFlow?.screening?.packetType === consumerPacketType
    && claimedFlow?.packetInformation?.stage === "not_started"
    && claimedFlow?.packetInformation?.reviewedAt === null;
  record(
    "pending_claim_persisted_authoritative_unpaid_item",
    claimedExact,
    `SQL=${claimedRead.status}; rows=${claimedRows.length}; state=${claimed?.jurisdiction ?? "(none)"}; pathway=${claimed?.pathway_label ?? "(none)"}; result=${claimed?.result_code ?? "(none)"}; payment=${claimed?.payment_status ?? "(none)"}; source bound=${claimed?.source_session_id === pendingId}`
  );

  // Complete the free packet-information builder through the hosted owner-only
  // route. These are participant answers; the server re-evaluates them against
  // the claim's saved route before it marks the review ready for checkout.
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
  const packetInformationResponse = await callApp(
    previewUrl,
    `/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information`,
    { method: "POST", cookie: A.cookie, body: { answers: packetAnswers, reviewed: true } }
  );
  record(
    "packet_information_review_saved_through_hosted_application",
    packetInformationResponse.status === 200
      && packetInformationResponse.json?.ok === true
      && packetInformationResponse.json?.itemId === itemId
      && packetInformationResponse.json?.readyToGenerate === true
      && packetInformationResponse.json?.reviewReason === "authoritative_route_confirmed"
      && Array.isArray(packetInformationResponse.json?.missingInputIds)
      && packetInformationResponse.json.missingInputIds.length === 0
      && packetInformationResponse.json?.reviewPath === `/briefcase/${itemId}/review`,
    `POST packet information=${packetInformationResponse.status}; ready=${packetInformationResponse.json?.readyToGenerate}; reason=${packetInformationResponse.json?.reviewReason ?? "(none)"}; missing=${JSON.stringify(packetInformationResponse.json?.missingInputIds ?? null)}`
  );

  const reread = await sql(`
    select id, user_id, item_type, jurisdiction, pathway_label, result_code, packet_type,
           status, payment_status, payment_allowed, checkout_session_id, payment_provider,
           amount_cents, packet_status, source_session_id, artifact_refs_json
      from public.consumer_briefcase_items
     where id = '${itemId}' and user_id = '${A.id}'
  `);
  const storedRows = Array.isArray(reread.json) ? reread.json : [];
  const stored = storedRows[0] ?? null;
  const storedPacketInformation = stored?.artifact_refs_json?.commercialFlow?.packetInformation;
  const packetPlan = stored?.artifact_refs_json?.commercialFlow?.screening?.packetPlan ?? null;
  const reviewedAt = storedPacketInformation?.reviewedAt ?? null;
  const reviewFixture = {
    id: itemId,
    userId: A.id,
    itemType: "result",
    state: "PA",
    pathwayLabel: PA_PATHWAY,
    resultCode: consumerResultCode,
    packetType: consumerPacketType,
    status: "packet_ready",
    paymentStatus: "unpaid",
    paymentAllowed: true,
    artifactRefs: stored?.artifact_refs_json ?? {}
  };
  const reviewSafety = packetInformationReviewSafety(reviewFixture);
  const reviewedInputHash = reviewedPacketInputHash(reviewFixture);
  record(
    "packet_information_review_is_complete_and_route_safe",
    reread.ok
      && storedRows.length === 1
      && Boolean(packetPlan)
      && packetPlan?.pathwayId === compiledPathway?.id
      && storedPacketInformation?.stage === "ready_to_generate"
      && Array.isArray(storedPacketInformation?.missingInputIds)
      && storedPacketInformation.missingInputIds.length === 0
      && typeof reviewedAt === "string"
      && reviewedAt.length > 0
      && storedPacketInformation?.reviewSafety?.safe === true
      && storedPacketInformation?.reviewSafety?.reason === "authoritative_route_confirmed"
      && reviewSafety.safe
      && reviewSafety.reason === "authoritative_route_confirmed"
      && /^[a-f0-9]{64}$/.test(reviewedInputHash ?? ""),
    `rows=${storedRows.length}; plan=${packetPlan?.pathwayId ?? "(none)"}; stage=${storedPacketInformation?.stage ?? "(none)"}; reviewed=${Boolean(reviewedAt)}; safety=${reviewSafety.reason}; reviewed hash present=${Boolean(reviewedInputHash)}`
  );
  const storedExact = storedRows.length === 1
    && stored.source_session_id === pendingId
    && stored.jurisdiction === "PA"
    && stored.pathway_label === PA_PATHWAY
    && stored.result_code === routeIdentity.resultCode
    && stored.packet_type === routeIdentity.packetType
    && stored.status === "packet_ready"
    && stored.payment_status === "unpaid"
    && stored.payment_allowed === true
    && stored.checkout_session_id === null
    && stored.artifact_refs_json?.commercialFlow?.packetInformation?.stage === "ready_to_generate"
    && stored.artifact_refs_json?.commercialFlow?.packetInformation?.reviewedAt === reviewedAt
    && stored.artifact_refs_json?.commercialFlow?.packetInformation?.reviewSafety?.safe === true
    && stored.artifact_refs_json?.commercialFlow?.packetInformation?.reviewSafety?.reason === "authoritative_route_confirmed";
  record("stored_row_matches_authoritative_resolver", storedExact, `rows=${storedRows.length}; stored=${JSON.stringify(stored)}`);
  evidence.reviewedItem = { id: itemId, userId: A.id, ...stored, reviewedInputHash };

  // The application creates or reuses this deterministic person during the
  // Checkout call; before that call, only prove the reserved namespace is not a
  // registered partner. The gate does not SQL-seed identity or matter rows.
  const personMatchKey = consumerPersonMatchKey(A.id);
  const matterId = consumerMatterIdForItem(itemId);
  const namespaceCollision = await sql(`select count(*)::int as count from public.partner_records where partner_slug = '${CONSUMER_PERSON_NAMESPACE}'`);
  const collisionCount = Number(Array.isArray(namespaceCollision.json) ? namespaceCollision.json[0]?.count ?? -1 : -1);
  record("consumer_person_namespace_reserved", collisionCount === 0, `registered partner collisions=${collisionCount}`);

  const unpaidRender = await callApp(previewUrl, "/api/expungement-ai/packet/render", {
    method: "POST", cookie: A.cookie, body: { briefcaseItemId: itemId }
  });
  record("unpaid_render_returns_402", unpaidRender.status === 402, `A render of reviewed unpaid item=${unpaidRender.status}; reason=${unpaidRender.json?.reason ?? "(none)"}`);

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

  const person = await sql(`
    select id, partner_slug, match_key
      from public.rcap_persons
     where partner_slug = '${CONSUMER_PERSON_NAMESPACE}'
       and match_key = '${sqlText(personMatchKey)}'
  `);
  const personRows = Array.isArray(person.json) ? person.json : [];
  const personRow = personRows[0] ?? null;
  record(
    "application_checkout_resolved_unique_consumer_person",
    person.ok
      && personRows.length === 1
      && Boolean(personRow?.id)
      && personRow?.partner_slug === CONSUMER_PERSON_NAMESPACE
      && personRow?.match_key === personMatchKey,
    `rows=${personRows.length}; person id=${personRow?.id ?? "(none)"}; namespace=${personRow?.partner_slug ?? "(none)"}; match exact=${personRow?.match_key === personMatchKey}`
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

  const expectedMetadata = {
    channel: "expungement_ai_consumer",
    user_id: A.id,
    briefcase_item_id: itemId,
    product_id: "expungement_packet",
    person_id: personRow.id,
    matter_id: matterId,
    result_code: consumerResultCode,
    jurisdiction: "PA",
    packet_type: "custom_pleading",
    pathway_label: PA_PATHWAY,
    source_session_id: pendingId,
    reviewed_input_hash: reviewedInputHash
  };
  const metadataExact = Object.entries(expectedMetadata).every(([key, value]) => session?.metadata?.[key] === value)
    && Object.keys(session?.metadata ?? {}).sort().join("|") === Object.keys(expectedMetadata).sort().join("|");
  const lineItem = lineItems[0] ?? null;
  const product = lineItem?.price?.product;
  const productName = typeof product === "object" ? product.name : lineItem?.description;
  const sessionExact = sessionResponse.status === 200
    && session?.id === checkoutSessionId
    && session?.livemode === false
    && session?.mode === "payment"
    && session?.status === "open"
    && session?.payment_status === "unpaid"
    && session?.amount_total === 5000
    && String(session?.currency ?? "").toLowerCase() === "usd"
    && session?.client_reference_id === itemId
    && session?.url === checkoutUrl
    && metadataExact
    && lineItemsResponse.status === 200
    && lineItems.length === 1
    && lineItem?.quantity === 1
    && lineItem?.amount_total === 5000
    && productName === "Expungement.ai self-help packet"
    && (typeof product === "object" && product?.metadata?.product_id === "expungement_packet");
  record(
    "stripe_session_amount_mode_metadata_and_product_exact",
    sessionExact,
    `id=${session?.id}; livemode=${session?.livemode}; status=${session?.status}; payment_status=${session?.payment_status}; amount=${session?.amount_total}; currency=${session?.currency}; metadata exact=${metadataExact}; line items=${lineItems.length}; quantity=${lineItem?.quantity}; product=${JSON.stringify(productName)}`
  );

  const personMatterProductBound = session.metadata.user_id === A.id
    && personRow?.match_key === consumerPersonMatchKey(session.metadata.user_id)
    && matterId === consumerMatterIdForItem(session.metadata.briefcase_item_id)
    && session.metadata.product_id === "expungement_packet"
    && session.metadata.person_id === personRow?.id
    && session.metadata.matter_id === matterId
    && session.metadata.reviewed_input_hash === reviewedInputHash
    && session.metadata.jurisdiction === routeIdentity.jurisdiction
    && session.metadata.pathway_label === routeIdentity.pathwayId
    && session.metadata.packet_type === routeIdentity.packetType
    && productName === "Expungement.ai self-help packet"
    && (typeof product === "object" && product?.metadata?.product_id === "expungement_packet");
  record(
    "metadata_transitively_binds_user_person_item_matter_and_product",
    personMatterProductBound,
    `user=${A.id}; person=${personRow?.id}; item=${itemId}; deterministic matter=${matterId}; product route=${routeIdentity.routeId}; Stripe product=${JSON.stringify(productName)}`
  );
  evidence.identityBinding = {
    directMetadataKeys: Object.keys(session.metadata ?? {}).sort(),
    authenticatedUserId: A.id,
    personId: personRow.id,
    personBinding: "metadata.user_id -> consumerPersonMatchKey(user_id) -> unique rcap_persons row",
    briefcaseItemId: itemId,
    matterId,
    matterBinding: "metadata.briefcase_item_id -> consumerMatterIdForItem(item)",
    productBinding: "metadata product_id + jurisdiction/pathway/packet_type + authoritative route + Stripe line item",
    reviewedInputHash,
    literalPersonIdMetadataPresent: Object.hasOwn(session.metadata ?? {}, "person_id"),
    literalMatterIdMetadataPresent: Object.hasOwn(session.metadata ?? {}, "matter_id")
  };

  const successUrl = new URL(session.success_url);
  const cancelUrl = new URL(session.cancel_url);
  evidence.checkoutReturn = {
    successUrl: session.success_url,
    cancelUrl: session.cancel_url,
    hostedEnvironmentOrigin: previewUrl,
    returnsToHostedEnvironment: successUrl.origin === previewUrl && cancelUrl.origin === previewUrl,
    originObservation: successUrl.origin === previewUrl && cancelUrl.origin === previewUrl
      ? "the Checkout Session returns to this exact Preview"
      : "the Checkout Session does not return to the exact non-production Preview"
  };
  const returnShapeExact = successUrl.origin === previewUrl
    && cancelUrl.origin === previewUrl
    && successUrl.pathname === `/briefcase/${itemId}`
    && successUrl.searchParams.get("payment") === "return"
    && successUrl.searchParams.get("session_id") === "{CHECKOUT_SESSION_ID}"
    && cancelUrl.pathname === `/briefcase/${itemId}`
    && cancelUrl.searchParams.get("checkout") === "canceled";
  const afterItemResponse = await sql(`
    select id, user_id, payment_status, payment_provider, checkout_session_id,
           amount_cents, packet_status, provider_event_id,
           payment_product_id, payment_person_id, payment_matter_id
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
    && Number(afterItem?.amount_cents) === 5000
    && afterItem?.packet_status === "not_started"
    && afterItem?.provider_event_id === null
    && afterItem?.payment_product_id === "expungement_packet"
    && afterItem?.payment_person_id === personRow.id
    && afterItem?.payment_matter_id === matterId
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
    `success=${sanitize(session.success_url)}; cancel=${sanitize(session.cancel_url)}; returns to hosted environment=${evidence.checkoutReturn.returnsToHostedEnvironment}`
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
      `preview_url=${previewUrl}`,
      `deployment_id=${DEPLOYMENT_ID}`,
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
      `- Preview: ${previewUrl}`,
      `- Deployment: ${DEPLOYMENT_ID}`,
      `- Pennsylvania route: PA / ${PA_PATHWAY}`,
      `- Briefcase item: ${itemId}`,
      `- Stripe Session: ${checkoutSessionId}`,
      `- Stripe-hosted Checkout: ${checkoutUrl}`,
      `- Expected return: ${session.success_url}`,
      "- State: open and unpaid; no entitlement or render job exists",
      ""
    ].join("\n"));
  }
  console.log("");
  console.log("RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED");
  console.log(`  Preview: ${previewUrl}`);
  console.log(`  Deployment: ${DEPLOYMENT_ID}`);
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
