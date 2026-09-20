#!/usr/bin/env node

// Read-only closure for the bounded MVL Preview journey. It joins the browser
// proof to the acceptance database so ownership, Clinic scope, sponsored
// accounting, immutable provenance, and server-side reset are evidence rather
// than assertions made by the browser harness.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const EVENT_ID = "77000000-0000-4000-8000-000000000055";
const EVENT_NAME = "Mississippi Volunteer Lawyers Clinic Mode Demo";
const EVIDENCE_SUBDIR = (process.env.RCAP_BROWSER_EVIDENCE_DIR ?? "hosted-acceptance-evidence/ms-clinic-preview").trim();

if (PROJECT_REF !== EXPECTED_PROJECT_REF || !/^[0-9a-f]{40}$/.test(APPLICATION_SHA) || !SUPABASE_ACCESS_TOKEN) {
  throw new Error("Clinic audit requires the exact acceptance project, application SHA, and Supabase management credential.");
}

const browserPath = path.resolve(EVIDENCE_SUBDIR, "sponsored-browser-result.json");
const browser = JSON.parse(fs.readFileSync(browserPath, "utf8"));
const itemId = browser.packetItemId;
if (!browser.passed || !uuid(itemId) || !uuid(browser.screeningSessionId)) {
  throw new Error("Clinic audit requires a passing browser result with exact matter and screening-session UUIDs.");
}

const rows = await managementQuery(`
  select jsonb_build_object(
    'identities', (select coalesce(jsonb_agg(jsonb_build_object(
      'id',u.id,'email',u.email,'role',pu.role,'partner_slug',pu.partner_slug,'status',pu.status
    ) order by u.email),'[]'::jsonb)
      from auth.users u left join public.partner_users pu on pu.auth_user_id=u.id
      where lower(u.email) in (
        'mvl-demo-admin@rcap-acceptance.test','mvl-demo-staff@rcap-acceptance.test',
        'mvl-demo-participant-a@rcap-acceptance.test','mvl-demo-participant-b@rcap-acceptance.test'
      )),
    'event', (select to_jsonb(e) from (select id,partner_slug,public_slug,name,jurisdiction,status,sponsorship_allocation
      from public.clinic_events where id='${EVENT_ID}') e),
    'clinic_case', (select to_jsonb(c) from (select id,event_id,participant_user_id,assisted_session_id,
      screening_session_id,matter_id,jurisdiction,route_disposition,queue_status
      from public.clinic_cases where event_id='${EVENT_ID}' and matter_id='${itemId}') c),
    'screening', (select to_jsonb(s) from (select session_id,partner_slug,jurisdiction,flow_mode,
      partner_benefit_active,claimed_slot_state,status from public.screening_sessions
      where session_id='${browser.screeningSessionId}') s),
    'assisted_session', (select to_jsonb(s) from (select id,event_id,participant_user_id,screening_session_id,
      status,ended_reason,ended_at from public.clinic_assisted_sessions
      where screening_session_id='${browser.screeningSessionId}' order by started_at desc limit 1) s),
    'matter', (select to_jsonb(i) from (select id,user_id,source_session_id,packet_status,jurisdiction,result_code
      from public.consumer_briefcase_items where id='${itemId}') i),
    'provenance', (select jsonb_build_object('briefcase_item_id',p.briefcase_item_id,
      'consumer_auth_user_id',p.consumer_auth_user_id,'matter_id',p.matter_id,
      'verification_hash',p.verification_hash,'entitlement_source',p.entitlement_source,'artifact',p.artifact)
      from public.consumer_packet_artifact_provenance p where p.briefcase_item_id='${itemId}'),
    'credit_event', (select jsonb_build_object('id',a.id,'session_id',a.session_id,'event_type',a.event_type,
      'counted_as',a.metadata->>'counted_as','clinic_event_id',a.metadata->>'clinic_event_id')
      from public.rcap_screening_analytics_events a where a.session_id='${browser.screeningSessionId}'
        and a.event_type='packet_generated' order by a.occurred_at asc,a.id asc limit 1),
    'credit_event_count', (select count(*) from public.rcap_screening_analytics_events a
      where a.session_id='${browser.screeningSessionId}' and a.event_type='packet_generated'),
    'entitlement', (select to_jsonb(p) from (select partner_slug,screenings_allowed,screenings_used,
      pause_at_cap,overage_enabled,overage_packets from public.partner_entitlement where partner_slug='mvl-demo') p),
    'reset_audit', (select jsonb_build_object('id',a.id,'action',a.action,'target_id',a.target_id,
      'reason',a.metadata->>'reason') from public.clinic_event_audit a
      join public.clinic_assisted_sessions s on s.id=a.target_id
      where s.screening_session_id='${browser.screeningSessionId}' and a.action='assisted_session_ended'
      order by a.occurred_at desc,a.id desc limit 1),
    'render_jobs', (select coalesce(jsonb_agg(to_jsonb(j)),'[]'::jsonb) from (
      select id,status,accounting_result,output_sha256 from public.packet_render_jobs
      where briefcase_item_id='${itemId}' or consumer_briefcase_item_id='${itemId}' order by created_at
    ) j)
  ) as evidence;
`);

const server = Array.isArray(rows) ? rows[0]?.evidence : null;
const identities = server?.identities ?? [];
const participantA = identities.find((entry) => entry.email === "mvl-demo-participant-a@rcap-acceptance.test");
const provenanceArtifact = server?.provenance?.artifact ?? {};
const expectedIdempotencyKey = crypto.createHash("sha256")
  .update(`rcap-sponsored-credit/v1\0${browser.screeningSessionId}\0${itemId}\0${server?.provenance?.matter_id ?? ""}`)
  .digest("hex");

const checks = {
  exactApplicationAndProject: browser.environmentClassification?.applicationSha === APPLICATION_SHA
    && browser.environmentClassification?.acceptanceProjectRef === PROJECT_REF,
  exactSyntheticCohort: identities.length === 4
    && identities.every((entry) => String(entry.email).endsWith("@rcap-acceptance.test")),
  exactEvent: server?.event?.id === EVENT_ID && server?.event?.name === EVENT_NAME
    && server?.event?.jurisdiction === "MS" && Number(server?.event?.sponsorship_allocation) === 2,
  clinicMatterBound: server?.clinic_case?.matter_id === itemId
    && server?.clinic_case?.participant_user_id === participantA?.id
    && server?.clinic_case?.screening_session_id === browser.screeningSessionId
    && server?.clinic_case?.route_disposition === "packet" && server?.clinic_case?.queue_status === "packet_ready",
  sponsoredScreeningBound: server?.screening?.session_id === browser.screeningSessionId
    && server?.screening?.partner_slug === "mvl-demo" && server?.screening?.jurisdiction === "MS"
    && server?.screening?.flow_mode === "rcap" && server?.screening?.partner_benefit_active === true
    && server?.screening?.claimed_slot_state === "consumed",
  immutableArtifactBound: server?.provenance?.briefcase_item_id === itemId
    && server?.provenance?.consumer_auth_user_id === participantA?.id
    && server?.provenance?.entitlement_source === "partner_sponsorship"
    && provenanceArtifact.artifactSha256 === browser.artifactSha256
    && browser.repeatDownloadSha256 === browser.artifactSha256,
  oneIncludedSponsorCredit: Number(server?.credit_event_count) === 1
    && server?.credit_event?.counted_as === "included"
    && server?.credit_event?.clinic_event_id === EVENT_ID
    && server?.entitlement?.pause_at_cap === true && server?.entitlement?.overage_enabled === false,
  eventScopedStaffStatus: browser.staffViewPassed === true,
  participantBDenied: browser.participantBDenied === true,
  resetCompleted: browser.deviceResetPassed === true
    && server?.assisted_session?.status === "reset" && server?.assisted_session?.ended_reason === "staff_reset"
    && server?.reset_audit?.action === "assisted_session_ended" && server?.reset_audit?.reason === "staff_reset",
  noProductionOrStripe: browser.productionTouched === false && browser.stripeTouched === false
};

const evidence = {
  schemaVersion: "rcap-hosted-ms-clinic-preview-audit/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  eventId: EVENT_ID,
  screeningSessionId: browser.screeningSessionId,
  briefcaseMatterId: itemId,
  renderOperation: {
    mode: "synchronous_grade_a_composer",
    queuedRenderJobId: server?.render_jobs?.[0]?.id ?? null,
    note: "This sponsored route composes and validates the PDF synchronously; packet_render_jobs is not its execution path."
  },
  sponsorCreditIdempotencyKeySha256: expectedIdempotencyKey,
  checks,
  browser,
  server,
  passed: Object.values(checks).every(Boolean)
};

const { root } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });
const outputPath = path.join(root, "ms-clinic-preview-audit.json");
fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
if (!evidence.passed) {
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  throw new Error(`Clinic server-side audit failed: ${failed.join(", ")}`);
}
console.log(`MVL CLINIC AUDIT PASSED — matter ${itemId}; one included sponsor credit; reset and cross-owner denial proven.`);

async function managementQuery(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`acceptance database audit failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

function uuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
