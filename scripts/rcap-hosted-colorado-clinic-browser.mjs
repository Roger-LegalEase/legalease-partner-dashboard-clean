#!/usr/bin/env node

// Isolated hosted browser acceptance for the exact release Preview.
//
// This script reuses one exact Vercel deployment. It does not deploy, migrate,
// create a Checkout, complete a payment, or run the worker. The Vercel bypass
// is attached only to in-memory requests for the exact Preview origin; it is
// never placed in a URL, cookie, screenshot, log, or evidence file.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  expectedHostedReturnOrigin,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const ROOT = process.cwd();
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: ROOT });
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, "hosted-browser-screenshots");
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "hosted-browser.json");

const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const DEPLOYMENT_ID = (process.env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? "").trim();
const PREVIEW_HOSTNAME = (process.env.HOSTED_PREVIEW_HOSTNAME ?? "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const BYPASS = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "").trim();
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const PREVIEW = /^[0-9a-f]{40}$/.test(APPLICATION_SHA) ? expectedHostedReturnOrigin(APPLICATION_SHA) : "";
const EXPECTED_HOSTNAME = PREVIEW ? new URL(PREVIEW).host : "";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

const FIXTURE = Object.freeze({
  partnerSlug: "expunge-colorado-clinic-acceptance",
  eventId: "76000000-0000-4000-8000-000000000055",
  eventSlug: "expunge-colorado-clinic",
  eventName: "Expunge Colorado Clinic",
  staffId: "76000000-0000-4000-8000-000000000056",
  screeningId: "76000000-0000-4000-8000-000000000057",
  sessionId: "76000000-0000-4000-8000-000000000058",
  matterId: "76000000-0000-4000-8000-000000000059",
  caseId: "76000000-0000-4000-8000-00000000005a",
  followUpId: "76000000-0000-4000-8000-00000000005b"
});

const secrets = [VERCEL_TOKEN, SUPABASE_ACCESS_TOKEN, BYPASS].filter(Boolean);
const sanitize = (value) => {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text
    .replace(/(x-vercel-protection-bypass[=:])[A-Za-z0-9._~-]+/gi, "$1***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
};

const evidence = {
  schemaVersion: "rcap-hosted-colorado-clinic-browser/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  previewUrl: PREVIEW || null,
  previewDeploymentId: DEPLOYMENT_ID || null,
  workerRun: false,
  migrationApplied: false,
  checkoutCreated: false,
  paymentCompleted: false,
  protectionBypassTransport: "in-memory header scoped to exact Preview origin",
  fixture: {
    eventName: FIXTURE.eventName,
    eventSlug: FIXTURE.eventSlug,
    participantData: "deterministic synthetic only",
    ColoradoTreatment: "juvenile guidance_only; no payment, packet credit, render job, or artifact"
  },
  screenshots: [],
  cases: {}
};

class BrowserGateFailure extends Error {
  constructor(caseId, message) {
    super(`${caseId}: ${sanitize(message)}`);
    this.name = "BrowserGateFailure";
    this.caseId = caseId;
  }
}

function record(caseId, passed, observed) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new BrowserGateFailure(caseId, observed);
}

function writeEvidence(passed, error = null) {
  evidence.passed = passed;
  if (error) evidence.failure = {
    caseId: error instanceof BrowserGateFailure ? error.caseId : null,
    message: sanitize(error instanceof Error ? error.message : error)
  };
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

function sqlText(value) { return String(value).split("'").join("''"); }
function shortId(value) { return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12); }
function sha256(value) { return crypto.createHash("sha256").update(String(value)).digest("hex"); }

async function managementQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced below */ }
  if (!response.ok) throw new BrowserGateFailure("acceptance_database_query_succeeded", `HTTP ${response.status}: ${sanitize(text).slice(0, 300)}`);
  return json;
}

async function supabaseKeys() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  });
  const list = await response.json().catch(() => null);
  const pick = (name) => Array.isArray(list) ? list.find((entry) => entry.name === name)?.api_key ?? null : null;
  if (!response.ok || !pick("anon") || !pick("service_role")) {
    throw new BrowserGateFailure("acceptance_keys_resolved", `management API status=${response.status}; required keys present=false`);
  }
  return { anon: pick("anon"), service: pick("service_role") };
}

async function ensureSyntheticUser({ email, keys }) {
  const rows = await managementQuery(`select id from auth.users where lower(email)=lower('${sqlText(email)}') limit 1`);
  let userId = Array.isArray(rows) ? rows[0]?.id ?? null : null;
  const password = `Acceptance-${crypto.randomBytes(24).toString("base64url")}!`;
  if (!userId) {
    const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: keys.service, Authorization: `Bearer ${keys.service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, email_confirm: true })
    });
    const body = await created.json().catch(() => null);
    userId = body?.id ?? body?.user?.id ?? null;
    if (!created.ok || !userId) throw new BrowserGateFailure("synthetic_auth_users_ready", `could not create ${email.split("@")[0]} (HTTP ${created.status})`);
  } else {
    const updated = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: { apikey: keys.service, Authorization: `Bearer ${keys.service}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password, email_confirm: true })
    });
    if (!updated.ok) throw new BrowserGateFailure("synthetic_auth_users_ready", `could not rotate synthetic ${email.split("@")[0]} password (HTTP ${updated.status})`);
  }
  const signedIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: keys.anon, Authorization: `Bearer ${keys.anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const session = await signedIn.json().catch(() => null);
  if (!signedIn.ok || !session?.access_token || !session?.refresh_token) {
    throw new BrowserGateFailure("synthetic_auth_users_ready", `could not sign in ${email.split("@")[0]} (HTTP ${signedIn.status})`);
  }
  return { id: userId, email, session };
}

const SSR_COOKIE_CHUNK_SIZE = 3180;
function authCookies(session) {
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const pairs = [];
  if (value.length <= SSR_COOKIE_CHUNK_SIZE) pairs.push([name, value]);
  else for (let index = 0; index < value.length; index += SSR_COOKIE_CHUNK_SIZE) pairs.push([`${name}.${pairs.length}`, value.slice(index, index + SSR_COOKIE_CHUNK_SIZE)]);
  return pairs.map(([cookieName, cookieValue]) => ({
    name: cookieName, value: cookieValue, domain: EXPECTED_HOSTNAME, path: "/", secure: true, httpOnly: true, sameSite: "Strict"
  }));
}

async function vercelJson(route, identity) {
  const response = await fetch(hostedVercelScopedUrl(route, identity), {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  const json = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, json };
}

async function newContext(browser, { viewport, user = null, clinicSessionToken = null }) {
  const context = await browser.newContext({ viewport });
  // Scope the secret header to this exact origin. No query parameter, bypass
  // cookie, global context header, screenshot, or artifact can carry it.
  await context.route(`${PREVIEW}/**`, async (route) => {
    await route.continue({ headers: { ...route.request().headers(), "x-vercel-protection-bypass": BYPASS } });
  });
  if (user) await context.addCookies(authCookies(user.session));
  if (clinicSessionToken) {
    await context.addCookies([
      ["clinic_session", clinicSessionToken],
      ["clinic_device", "synthetic-device-token"],
      ["clinic_event", FIXTURE.eventSlug]
    ].map(([name, value]) => ({ name, value, domain: EXPECTED_HOSTNAME, path: "/", secure: true, httpOnly: true, sameSite: "Strict" })));
  }
  return context;
}

async function appRequest(context, pathname, options = {}) {
  return context.request.fetch(new URL(pathname, PREVIEW).toString(), {
    ...options,
    headers: { "x-vercel-protection-bypass": BYPASS, ...(options.headers ?? {}) }
  });
}

async function screenshot(page, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  evidence.screenshots.push(path.relative(EVIDENCE_DIR, file));
}

function assertNoHorizontalOverflow(dimensions) {
  return dimensions.scrollWidth <= dimensions.clientWidth + 1;
}

async function main() {
  const missing = [
    ["exact application SHA", /^[0-9a-f]{40}$/.test(APPLICATION_SHA)],
    ["acceptance project", PROJECT_REF === EXPECTED_PROJECT_REF],
    ["exact deployment id", /^dpl_[A-Za-z0-9]+$/.test(DEPLOYMENT_ID)],
    ["deterministic Preview hostname", PREVIEW_HOSTNAME === EXPECTED_HOSTNAME],
    ["Vercel token", Boolean(VERCEL_TOKEN)],
    ["Supabase token", Boolean(SUPABASE_ACCESS_TOKEN)],
    ["in-memory bypass header", Boolean(BYPASS)]
  ].filter(([, present]) => !present).map(([label]) => label);
  record("exact_nonproduction_inputs_present", missing.length === 0, missing.length === 0 ? "all exact nonproduction inputs present" : `missing/mismatched: ${missing.join(", ")}`);

  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  const [deployment, alias, aliases] = await Promise.all([
    vercelJson(`/v13/deployments/${encodeURIComponent(DEPLOYMENT_ID)}`, identity),
    vercelJson(`/v13/deployments/${encodeURIComponent(EXPECTED_HOSTNAME)}`, identity),
    vercelJson(`/v2/deployments/${encodeURIComponent(DEPLOYMENT_ID)}/aliases`, identity)
  ]);
  const deploymentId = deployment.json?.id ?? deployment.json?.uid ?? null;
  const aliasDeploymentId = alias.json?.id ?? alias.json?.uid ?? null;
  const productionAliases = (aliases.json?.aliases ?? []).filter((entry) => entry?.deployment?.target === "production" || entry?.target === "production");
  record(
    "exact_sha_alias_and_preview_target_verified",
    deployment.ok
      && alias.ok
      && deploymentId === DEPLOYMENT_ID
      && aliasDeploymentId === DEPLOYMENT_ID
      && (deployment.json?.readyState ?? deployment.json?.state) === "READY"
      && (deployment.json?.target === null || deployment.json?.target === "preview")
      && deployment.json?.meta?.rcapApplicationSha === APPLICATION_SHA
      && deployment.json?.meta?.rcapAcceptanceProjectRef === PROJECT_REF
      && deployment.json?.meta?.rcapRouteState === "staging_scoped"
      && deployment.json?.meta?.rcapReturnOrigin === PREVIEW
      && productionAliases.length === 0,
    `deployment=${deploymentId}; alias resolves exact=${aliasDeploymentId === DEPLOYMENT_ID}; READY=${deployment.json?.readyState}; target=${JSON.stringify(deployment.json?.target ?? null)}; SHA=${deployment.json?.meta?.rcapApplicationSha}; Production aliases=${productionAliases.length}`
  );

  const health = await fetch(`${PREVIEW}/api/health`, { headers: { "x-vercel-protection-bypass": BYPASS } });
  const healthJson = await health.json().catch(() => null);
  record("header_only_bypass_reaches_exact_application", health.status === 200 && healthJson && typeof healthJson.checks === "object", `GET /api/health=${health.status}; application JSON=${Boolean(healthJson?.checks)}`);

  const schemaRows = await managementQuery(`
    select
      array(select phase from public.rcap_acceptance_migration_ledger where phase between 49 and 55 order by phase) as phases,
      to_regclass('public.clinic_events') is not null as clinic_events,
      to_regclass('public.clinic_event_staff') is not null as clinic_event_staff,
      to_regclass('public.clinic_assisted_sessions') is not null as clinic_assisted_sessions,
      to_regclass('public.clinic_cases') is not null as clinic_cases,
      to_regclass('public.clinic_follow_ups') is not null as clinic_follow_ups,
      to_regclass('public.clinic_event_audit') is not null as clinic_event_audit,
      to_regprocedure('public.clinic_end_assisted_session(uuid,uuid,text)') is not null as end_session,
      to_regprocedure('public.clinic_upsert_event_follow_up(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text,text,text)') is not null as event_follow_up,
      to_regprocedure('public.clinic_get_follow_ups(uuid,uuid)') is not null as get_follow_ups
  `);
  const schema = Array.isArray(schemaRows) ? schemaRows[0] ?? {} : {};
  const phases = (schema.phases ?? []).map(Number);
  const schemaFlags = Object.entries(schema).filter(([key]) => key !== "phases").map(([, value]) => value === true);
  record(
    "phases_49_through_55_and_clinic_schema_read_back",
    JSON.stringify(phases) === JSON.stringify([49, 50, 51, 52, 53, 54, 55]) && schemaFlags.length === 9 && schemaFlags.every(Boolean),
    `ledger phases=${JSON.stringify(phases)}; required Clinic tables/functions=${schemaFlags.filter(Boolean).length}/9; no migration command exists in this phase`
  );

  const keys = await supabaseKeys();
  const [participant, staff, negative] = await Promise.all([
    ensureSyntheticUser({ email: "hosted-browser-participant-a@rcap-acceptance.test", keys }),
    ensureSyntheticUser({ email: "hosted-browser-clinic-staff@rcap-acceptance.test", keys }),
    ensureSyntheticUser({ email: "hosted-browser-negative-control@rcap-acceptance.test", keys })
  ]);
  record("synthetic_auth_users_ready", true, `participant=${shortId(participant.id)}; staff=${shortId(staff.id)}; negative=${shortId(negative.id)} (hashed identifiers only)`);

  const clinicSessionToken = crypto.randomBytes(32).toString("base64url");
  const deviceToken = crypto.randomBytes(32).toString("base64url");
  const seeded = await managementQuery(`
    insert into public.partner_records (partner_id,partner_slug,partner_name,program_tier,payment_status,qualification_status,provisioning_status)
    values ('rcap-hosted-expunge-colorado','${FIXTURE.partnerSlug}','Expunge Colorado','sponsored','paid','qualified','provisioned')
    on conflict (partner_slug) do update set partner_name=excluded.partner_name, updated_at=now();

    insert into public.partner_users (auth_user_id,partner_slug,role,status,invited_email)
    values ('${staff.id}','${FIXTURE.partnerSlug}','partner_admin','active','hosted-browser-clinic-staff@rcap-acceptance.test')
    on conflict (auth_user_id) do update set partner_slug=excluded.partner_slug,role=excluded.role,status='active',updated_at=now();

    insert into public.clinic_events (id,partner_slug,public_slug,name,starts_at,ends_at,timezone,location_name,geography,capacity,status,sponsorship_allocation,created_by)
    values ('${FIXTURE.eventId}','${FIXTURE.partnerSlug}','${FIXTURE.eventSlug}','${FIXTURE.eventName}','2026-09-01T13:00:00Z','2026-09-01T21:00:00Z','America/Denver','Expunge Colorado acceptance center','Colorado statewide',500,'published',50,'${staff.id}')
    on conflict (id) do update set name=excluded.name,status='published',updated_at=now();

    insert into public.clinic_event_staff (id,event_id,partner_user_id,status,permissions,approved_by)
    select '${FIXTURE.staffId}','${FIXTURE.eventId}',id,'approved',array['assist','queue','follow_up','reporting']::text[],'${staff.id}'
      from public.partner_users where auth_user_id='${staff.id}'
    on conflict (id) do update set status='approved',permissions=excluded.permissions,revoked_at=null,updated_at=now();

    insert into public.screening_sessions (session_id,jurisdiction,answers,current_question_id,furthest_stage,status,partner_slug,flow_mode,claimed_slot_state)
    values ('${FIXTURE.screeningId}','CO','{"age_at_offense":"juvenile"}'::jsonb,null,'results','completed','${FIXTURE.partnerSlug}','rcap','claimed')
    on conflict (session_id) do update set jurisdiction='CO',answers=excluded.answers,status='completed',updated_at=now();

    insert into public.consumer_briefcase_items (id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,summary_json,next_steps_json,artifact_refs_json,payment_status,packet_status,source_session_id)
    values ('${FIXTURE.matterId}','${participant.id}','result','CO','Juvenile expungement under 19-1-306','guidance_only','guidance_packet',false,'guidance_saved','{"summary":"Colorado juvenile guidance only; exact JDF 302 packet unavailable."}'::jsonb,'["Review the Colorado juvenile guidance and confirm the official court process before filing."]'::jsonb,'{}'::jsonb,'not_applicable','not_started','${FIXTURE.screeningId}')
    on conflict (id) do update set user_id=excluded.user_id,result_code='guidance_only',payment_allowed=false,status='guidance_saved',artifact_refs_json='{}'::jsonb,payment_status='not_applicable',packet_status='not_started',updated_at=now();

    insert into public.clinic_assisted_sessions (id,event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,device_nonce_hash,consent_version,consented_at,status,expires_at,ended_at,ended_reason)
    values ('${FIXTURE.sessionId}','${FIXTURE.eventId}','${FIXTURE.staffId}','${participant.id}','${FIXTURE.screeningId}','${sha256(clinicSessionToken)}','${sha256(deviceToken)}','clinic-assistance-v1',now(),'active',now()+interval '2 hours',null,null)
    on conflict (id) do update set participant_user_id=excluded.participant_user_id,handoff_token_hash=excluded.handoff_token_hash,device_nonce_hash=excluded.device_nonce_hash,status='active',expires_at=excluded.expires_at,ended_at=null,ended_reason=null,updated_at=now();

    insert into public.clinic_cases (id,event_id,participant_user_id,assisted_session_id,screening_session_id,matter_id,queue_status,route_disposition,jurisdiction)
    values ('${FIXTURE.caseId}','${FIXTURE.eventId}','${participant.id}','${FIXTURE.sessionId}','${FIXTURE.screeningId}','${FIXTURE.matterId}','attorney_review','referral','CO')
    on conflict (id) do update set participant_user_id=excluded.participant_user_id,matter_id=excluded.matter_id,queue_status='attorney_review',route_disposition='referral',updated_at=now();

    insert into public.clinic_follow_ups (id,event_id,clinic_case_id,owner_event_staff_id,status,communication_state,participant_safe_message,internal_notes,created_by)
    values ('${FIXTURE.followUpId}','${FIXTURE.eventId}','${FIXTURE.caseId}','${FIXTURE.staffId}','open','draft','Your matter is saved. No payment or packet credit was used.','Synthetic hosted browser follow-up.','${staff.id}')
    on conflict (id) do update set status='open',communication_state='draft',participant_safe_message=excluded.participant_safe_message,internal_notes=excluded.internal_notes,updated_at=now();

    select '${FIXTURE.eventId}'::uuid as event_id, '${FIXTURE.caseId}'::uuid as case_id, '${FIXTURE.matterId}'::uuid as matter_id;
  `);
  record("deterministic_synthetic_clinic_fixture_ready", Array.isArray(seeded) && seeded.length === 1, `${FIXTURE.eventName}; fixed event/case/matter identities; additive upsert only`);

  const colorado = spawnSync(process.execPath, ["scripts/verify-rcap-colorado-juvenile-packet-boundary.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
    env: { ...process.env, RCAP_EVALUATOR_TODAY: "2026-08-25" }
  });
  const coloradoOutput = `${colorado.stdout ?? ""}\n${colorado.stderr ?? ""}`;
  record(
    "colorado_juvenile_and_adjacent_packet_boundaries_53_of_53",
    colorado.status === 0 && coloradoOutput.includes("Colorado juvenile packet boundary (53/53)"),
    colorado.status === 0 ? "53/53; juvenile guidance-only/no payment/no render/no credit; adjacent JDF 417 and JDF 612 controls unchanged" : sanitize(coloradoOutput).slice(-800)
  );

  let browser = null;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const desktop = await newContext(browser, { viewport: { width: 1440, height: 1000 }, user: participant, clinicSessionToken });
    const desktopPage = await desktop.newPage();
    let response = await desktopPage.goto(`${PREVIEW}/clinic/${FIXTURE.eventSlug}`, { waitUntil: "networkidle" });
    record("desktop_public_clinic_entry_visible", response?.status() === 200 && await desktopPage.getByRole("heading", { name: FIXTURE.eventName }).isVisible(), `status=${response?.status()}; event heading visible`);
    const desktopDimensions = await desktopPage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    record("desktop_clinic_entry_has_no_horizontal_overflow", assertNoHorizontalOverflow(desktopDimensions), JSON.stringify(desktopDimensions));
    await screenshot(desktopPage, "desktop-clinic-entry");

    response = await desktopPage.goto(`${PREVIEW}/briefcase/${FIXTURE.matterId}`, { waitUntil: "networkidle" });
    const desktopGuidance = await desktopPage.locator("[data-briefcase-guidance-state]").count();
    const desktopPayment = await desktopPage.getByText(/Pay \$50|start checkout|generate my packet/i).count();
    const desktopPacket = await desktopPage.locator("[data-packet-ready='true']").count();
    record("desktop_juvenile_matter_is_guidance_only", response?.status() === 200 && desktopGuidance === 1 && desktopPayment === 0 && desktopPacket === 0, `status=${response?.status()}; guidance=${desktopGuidance}; payment CTA=${desktopPayment}; packet artifact=${desktopPacket}`);
    await screenshot(desktopPage, "desktop-colorado-juvenile-guidance");

    response = await desktopPage.goto(`${PREVIEW}/clinic/${FIXTURE.eventSlug}/screening/co`, { waitUntil: "networkidle" });
    record("desktop_participant_owned_clinic_session_visible", response?.status() === 200 && await desktopPage.getByText("Shared-device privacy is active").isVisible(), `status=${response?.status()}; privacy boundary visible`);
    await screenshot(desktopPage, "desktop-clinic-participant-session");

    const staffContext = await newContext(browser, { viewport: { width: 1440, height: 1000 }, user: staff });
    const followBody = {
      id: FIXTURE.followUpId,
      clinicCaseId: FIXTURE.caseId,
      ownerEventStaffId: FIXTURE.staffId,
      dueAt: "2026-09-03T15:00:00.000Z",
      status: "waiting_on_participant",
      communicationState: "approved",
      participantSafeMessage: "Your matter is saved. No payment or packet credit was used.",
      internalNotes: "Synthetic hosted browser follow-up."
    };
    const updateOne = await appRequest(staffContext, `/api/clinic/events/${FIXTURE.eventId}/follow-ups`, { method: "PATCH", data: followBody });
    const updateTwo = await appRequest(staffContext, `/api/clinic/events/${FIXTURE.eventId}/follow-ups`, { method: "PATCH", data: followBody });
    const firstBody = await updateOne.json().catch(() => null);
    const secondBody = await updateTwo.json().catch(() => null);
    const followRows = await managementQuery(`select count(*)::int as count,min(status) as status,min(communication_state) as communication_state from public.clinic_follow_ups where id='${FIXTURE.followUpId}' and event_id='${FIXTURE.eventId}' and clinic_case_id='${FIXTURE.caseId}'`);
    const followReadback = Array.isArray(followRows) ? followRows[0] ?? {} : {};
    record(
      "clinic_follow_up_update_is_idempotent",
      updateOne.status() === 200 && updateTwo.status() === 200 && firstBody?.id === FIXTURE.followUpId && secondBody?.id === FIXTURE.followUpId && Number(followReadback.count) === 1 && followReadback.status === "waiting_on_participant" && followReadback.communication_state === "approved",
      `PATCH statuses=${updateOne.status()}/${updateTwo.status()}; same deterministic id=${firstBody?.id === secondBody?.id}; row count=${followReadback.count}`
    );

    const staffPage = await staffContext.newPage();
    response = await staffPage.goto(`${PREVIEW}/partner/clinic/${FIXTURE.eventId}/follow-up`, { waitUntil: "networkidle" });
    record("desktop_staff_follow_up_console_visible", response?.status() === 200 && await staffPage.getByRole("heading", { name: FIXTURE.eventName }).isVisible() && await staffPage.getByText("Schedule follow-up").isVisible(), `status=${response?.status()}; event and follow-up controls visible`);
    await screenshot(staffPage, "desktop-clinic-follow-up");

    const negativeContext = await newContext(browser, { viewport: { width: 1440, height: 1000 }, user: negative });
    const negativePage = await negativeContext.newPage();
    response = await negativePage.goto(`${PREVIEW}/briefcase/${FIXTURE.matterId}`, { waitUntil: "networkidle" });
    const notFound = await negativePage.getByRole("heading", { name: /couldn't find that matter/i }).count();
    const negativeFollow = await appRequest(negativeContext, `/api/clinic/events/${FIXTURE.eventId}/follow-ups`);
    record("negative_control_cannot_read_participant_matter_or_follow_up", response?.status() === 200 && notFound === 1 && [401, 403].includes(negativeFollow.status()), `matter not-found visible=${notFound === 1}; follow-up API=${negativeFollow.status()}`);
    await negativeContext.close();

    const mobile = await newContext(browser, { viewport: { width: 390, height: 844 }, user: participant, clinicSessionToken });
    const mobilePage = await mobile.newPage();
    response = await mobilePage.goto(`${PREVIEW}/clinic/${FIXTURE.eventSlug}`, { waitUntil: "networkidle" });
    const mobileDimensions = await mobilePage.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    record("mobile_public_clinic_entry_visible", response?.status() === 200 && await mobilePage.getByRole("heading", { name: FIXTURE.eventName }).isVisible() && assertNoHorizontalOverflow(mobileDimensions), `status=${response?.status()}; no overflow=${assertNoHorizontalOverflow(mobileDimensions)}`);
    await screenshot(mobilePage, "mobile-clinic-entry");
    // Key names are non-sensitive. Capture the public-entry baseline before
    // any injected participant sentinel so post-reset storage can be compared
    // with the state a clean arrival legitimately creates.
    const cleanPublicEntryBaselineKeys = await mobilePage.evaluate(() =>
      Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index) ?? "").sort()
    );

    response = await mobilePage.goto(`${PREVIEW}/briefcase/${FIXTURE.matterId}`, { waitUntil: "networkidle" });
    const mobileGuidance = await mobilePage.locator("[data-briefcase-guidance-state]").count();
    const mobilePayment = await mobilePage.getByText(/Pay \$50|start checkout|generate my packet/i).count();
    record("mobile_juvenile_matter_is_guidance_only", response?.status() === 200 && mobileGuidance === 1 && mobilePayment === 0, `status=${response?.status()}; guidance=${mobileGuidance}; payment CTA=${mobilePayment}`);
    await screenshot(mobilePage, "mobile-colorado-juvenile-guidance");

    response = await mobilePage.goto(`${PREVIEW}/clinic/${FIXTURE.eventSlug}/screening/co`, { waitUntil: "networkidle" });
    record("mobile_participant_owned_clinic_session_visible", response?.status() === 200 && await mobilePage.getByText("Shared-device privacy is active").isVisible(), `status=${response?.status()}; privacy boundary visible`);
    await screenshot(mobilePage, "mobile-clinic-participant-session");

    const mobileStaff = await newContext(browser, { viewport: { width: 390, height: 844 }, user: staff });
    const mobileStaffPage = await mobileStaff.newPage();
    response = await mobileStaffPage.goto(`${PREVIEW}/partner/clinic/${FIXTURE.eventId}/follow-up`, { waitUntil: "networkidle" });
    record("mobile_staff_follow_up_console_visible", response?.status() === 200 && await mobileStaffPage.getByText("Schedule follow-up").isVisible(), `status=${response?.status()}; follow-up controls visible`);
    await screenshot(mobileStaffPage, "mobile-clinic-follow-up");
    await mobileStaff.close();

    const resetSentinelKey = `clinic-participant-sentinel-${crypto.randomBytes(12).toString("hex")}`;
    const resetSentinelValue = `synthetic-participant-${crypto.randomBytes(24).toString("base64url")}`;
    await mobilePage.evaluate(async ({ sentinelKey, sentinelValue }) => {
      localStorage.setItem(sentinelKey, sentinelValue);
      sessionStorage.setItem("clinic-form", "synthetic-sensitive-state");
      await caches.open("clinic-synthetic-cache").then((cache) => cache.put("/synthetic-private", new Response("synthetic")));
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("clinic-synthetic-participant", 1);
        request.onsuccess = () => { request.result.close(); resolve(true); };
        request.onerror = () => reject(request.error);
      });
      history.pushState({ participant: sentinelValue, matter: "synthetic-matter" }, "", "/clinic/sensitive-prior");
    }, { sentinelKey: resetSentinelKey, sentinelValue: resetSentinelValue });
    await mobilePage.getByRole("button", { name: "End clinic session / Reset device" }).click();
    await mobilePage.waitForURL(`${PREVIEW}/clinic/${FIXTURE.eventSlug}`, { timeout: 30_000 });
    await mobilePage.goBack({ waitUntil: "networkidle" }).catch(() => null);
    const resetProof = await mobilePage.evaluate(async ({ participantMarkers, baselineKeys, sentinelKey }) => {
      const localEntries = Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index) ?? "";
        return [key, localStorage.getItem(key) ?? ""];
      });
      const localStorageKeys = localEntries.map(([key]) => key).sort();
      const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const identifierHashes = new Set(await Promise.all(participantMarkers.map(hash)));
      const localStorageValueHashes = await Promise.all(localEntries.map(([, value]) => hash(value)));
      const localStorageKeyHashes = await Promise.all(localEntries.map(([key]) => hash(key)));
      const localStorageParticipantBearing = localEntries.some(([key, value]) =>
        participantMarkers.some((marker) => `${key}\u0000${value}`.includes(marker))
      );
      const identifierHashMatch = [...localStorageKeyHashes, ...localStorageValueHashes]
        .some((valueHash) => identifierHashes.has(valueHash));
      const pageText = document.body?.innerText ?? "";
      return {
        pathname: location.pathname,
        localStorageKeys,
        localStorageValueHashes,
        sentinelKeyPresent: localStorage.getItem(sentinelKey) !== null,
        localKeysSubsetOfBaseline: localStorageKeys.every((key) => baselineKeys.includes(key)),
        identifierHashMatch,
        localStorageParticipantBearing,
        sessionStorage: sessionStorage.length,
        caches: (await caches.keys()).length,
        databases: typeof indexedDB.databases === "function" ? (await indexedDB.databases()).length : 0,
        historyHasParticipant: Boolean(history.state?.participant),
        pageContainsParticipantMarker: participantMarkers.some((marker) => pageText.includes(marker))
      };
    }, {
      participantMarkers: [
        resetSentinelKey,
        resetSentinelValue,
        participant.id,
        FIXTURE.sessionId,
        FIXTURE.screeningId,
        FIXTURE.matterId,
        FIXTURE.caseId
      ],
      baselineKeys: cleanPublicEntryBaselineKeys,
      sentinelKey: resetSentinelKey
    });
    const remainingCookies = (await mobile.cookies()).filter((cookie) => cookie.name.startsWith("clinic_") || cookie.name.startsWith("sb-"));
    const resetRows = await managementQuery(`select status,ended_reason,ended_at is not null as ended from public.clinic_assisted_sessions where id='${FIXTURE.sessionId}'`);
    const resetRow = Array.isArray(resetRows) ? resetRows[0] ?? {} : {};
    await screenshot(mobilePage, "mobile-after-reset");
    record(
      "end_session_reset_device_and_back_navigation_leave_no_participant_state",
      resetProof.pathname !== "/clinic/sensitive-prior"
        && resetProof.sentinelKeyPresent === false
        && resetProof.localKeysSubsetOfBaseline === true
        && resetProof.identifierHashMatch === false
        && resetProof.localStorageParticipantBearing === false
        && resetProof.sessionStorage === 0
        && resetProof.caches === 0
        && resetProof.databases === 0
        && resetProof.historyHasParticipant === false
        && resetProof.pageContainsParticipantMarker === false
        && remainingCookies.length === 0
        && resetRow.status === "reset"
        && resetRow.ended_reason === "staff_reset"
        && resetRow.ended === true,
      `path=${resetProof.pathname}; clean baseline keys=${JSON.stringify(cleanPublicEntryBaselineKeys)}; remaining keys=${JSON.stringify(resetProof.localStorageKeys)}; remaining value hashes=${JSON.stringify(resetProof.localStorageValueHashes)}; sentinel present=${resetProof.sentinelKeyPresent}; subset of baseline=${resetProof.localKeysSubsetOfBaseline}; identifier hash match=${resetProof.identifierHashMatch}; participant-bearing local=${resetProof.localStorageParticipantBearing}; participant marker in page=${resetProof.pageContainsParticipantMarker}; session=${resetProof.sessionStorage}; caches=${resetProof.caches}; IndexedDB=${resetProof.databases}; participant cookies=${remainingCookies.length}; DB status=${resetRow.status}/${resetRow.ended_reason}`
    );

    const noPaymentRows = await managementQuery(`
      select b.result_code,b.payment_allowed,b.payment_status,b.packet_status,b.checkout_session_id,
        (select count(*)::int from jsonb_object_keys(coalesce(b.artifact_refs_json,'{}'::jsonb))) as artifact_refs,
        (select count(*)::int from public.packet_render_jobs j where j.briefcase_item_id=b.id) as jobs,
        (select count(*)::int from public.consumer_packet_payment_consumption c where c.consumer_briefcase_item_id=b.id) as credits
      from public.consumer_briefcase_items b where b.id='${FIXTURE.matterId}' and b.user_id='${participant.id}'
    `);
    const noPayment = Array.isArray(noPaymentRows) ? noPaymentRows[0] ?? {} : {};
    record(
      "juvenile_guidance_created_no_checkout_credit_render_or_artifact",
      noPayment.result_code === "guidance_only"
        && noPayment.payment_allowed === false
        && noPayment.payment_status === "not_applicable"
        && noPayment.packet_status === "not_started"
        && noPayment.checkout_session_id === null
        && Number(noPayment.artifact_refs) === 0
        && Number(noPayment.jobs) === 0
        && Number(noPayment.credits) === 0,
      `result=${noPayment.result_code}; paymentAllowed=${noPayment.payment_allowed}; checkout=${noPayment.checkout_session_id ?? "none"}; artifact refs=${noPayment.artifact_refs}; jobs=${noPayment.jobs}; credits=${noPayment.credits}`
    );

    await Promise.all([desktop.close(), staffContext.close(), mobile.close()]);
  } finally {
    await browser?.close();
  }

  evidence.fixtureRetainedForReview = true;
  writeEvidence(true);
  console.log(`HOSTED BROWSER PASSED — ${Object.keys(evidence.cases).length} cases; desktop/mobile Colorado + Clinic evidence captured; Production untouched.`);
}

main().catch((error) => {
  writeEvidence(false, error);
  console.error(`HOSTED BROWSER FAILED — ${sanitize(error instanceof Error ? error.message : error)}`);
  process.exit(1);
});
