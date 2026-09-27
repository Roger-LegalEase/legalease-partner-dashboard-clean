// Disposable synthetic shapes reused from the existing IL sponsored transaction proof.
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { register } from "node:module";
import { startEphemeralPg } from "../lib/rcap-ephemeral-pg.mjs";
register("../lib/ts-esm-loader.mjs", import.meta.url);
const { consumerPersonMatchKey, consumerMatterIdForItem } = await import("../../src/lib/expungement-ai/consumer-identity.ts");
export const IL_ROUTE = "IL:felony-prostitution-relief";
const IL_TRACK="il-prostitution-j-vacate", IL_FAMILY="il-prostitution-j-vacate-set";
const IL_SPEC_ID="il-felony-prostitution-relief", IL_SPEC_VERSION="1.0.0";
const IL_SPEC_SHA="bc9050e096eeb99677edb9815eacae7c68d22914d8c08a785dfc375c68ed010f";
const IL_PARTNER="il-clinic-sponsor";
const q=v=>v==null?"null":"'"+String(v).replaceAll("'","''")+"'";
const sha=v=>createHash("sha256").update(v).digest("hex");
export function createFundingFixture() {
const db=startEphemeralPg();
function baseline() {
  return `
    create role anon nologin; create role authenticated nologin;
    create role service_role nologin bypassrls;
    alter default privileges in schema public grant all on tables to service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create schema if not exists extensions;
    create extension if not exists pgcrypto with schema extensions;
    create table partner_records(id uuid primary key, partner_slug text unique not null);
    create table rcap_persons(id uuid primary key default gen_random_uuid(), partner_slug text not null,
      match_key text not null, unique(partner_slug, match_key));
    create table rcap_document_packets(id uuid primary key default gen_random_uuid(), partner_slug text,
      user_id uuid, briefcase_id uuid, person_id uuid, state text, jurisdiction text, document_type text,
      pathway text, status text, petitioner_first_name text, petitioner_last_name text, petitioner_city text,
      petitioner_county text, court_county text, court_name text, cause_number text, charge text,
      offense_date text, arrest_date text, arresting_agency text, agency_case_number text,
      disposition_date text, conviction_date text, sentence_completion_date text, needs_record_review boolean,
      generated_plain_text text, filing_instructions text[], county_court_instructions text[],
      missing_fields text[], safety_disclaimer text);
    create table rcap_document_packet_inputs(document_packet_id uuid primary key, partner_slug text, input_payload jsonb);
  `;
}

// Clinic-mode shapes the sponsored transaction reads. These mirror the columns
// the real clinic-mode migrations define; the real clinic-mode migrations pull
// in partner_users/auth wiring this focused harness does not need.
function clinicFixtures() {
  return `
    alter table consumer_briefcase_items add column if not exists source_pending_result_id uuid;
    create table consumer_pending_screening_results(pending_id uuid primary key, status text not null,
      claimed_matter_id uuid references consumer_briefcase_items(id), claimed_user_id uuid,
      claimed_at timestamptz, anonymous_session_id uuid, product text, partner_slug text,
      jurisdiction text, profile_version text, candidate_route_context jsonb, screening_answers jsonb,
      event_id uuid);
    create table screening_sessions(session_id uuid primary key, flow_mode text, partner_benefit_active boolean,
      partner_slug text, jurisdiction text, claimed_slot_state text, status text,
      updated_at timestamptz not null default now(), partner_access_code_id uuid, campaign_name text);
    create table clinic_events(id uuid primary key, partner_slug text, program_key text not null default 'record-clearing',
      name text, jurisdiction text, status text, sponsorship_allocation integer);
    create table clinic_cases(id uuid primary key, event_id uuid, participant_user_id uuid,
      screening_session_id uuid, matter_id uuid, jurisdiction text, route_disposition text,
      queue_status text, last_activity_at timestamptz default now(), updated_at timestamptz default now());
    create table partner_entitlement(partner_slug text primary key, screenings_used integer not null default 0,
      screenings_allowed integer not null default 0, pause_at_cap boolean not null default false,
      overage_enabled boolean not null default false, overage_packets integer not null default 0,
      overage_amount_cents integer not null default 0, overage_packet_price_cents integer not null default 5000,
      updated_at timestamptz not null default now());
    create table rcap_record_events(id uuid primary key default gen_random_uuid(), record_type text,
      record_id text, partner_slug text, event_type text, occurred_at timestamptz, actor text, metadata jsonb);
    create table rcap_screening_analytics_events(id uuid primary key default gen_random_uuid(), session_id uuid,
      partner_slug text, partner_access_code_id uuid, campaign_name text, event_type text,
      packet_route_available boolean, occurred_at timestamptz, metadata jsonb);
  `;
}

const partnerId = randomUUID();
const otherPartnerId = randomUUID();
const eventId = randomUUID();
const otherEventId = randomUUID();

function seedParticipant({ jurisdiction = "IL", track = IL_TRACK, pathway = "felony-prostitution-relief",
  product = "rcap_partner", partnerSlug = IL_PARTNER, event = eventId, caseEvent = event,
  claimedUser = null, disposition = "packet", benefit = true } = {}) {
  const userId = randomUUID();
  const itemId = randomUUID();
  const personId = randomUUID();
  const pendingId = randomUUID();
  const sessionId = randomUUID();
  const matterId = consumerMatterIdForItem(itemId);
  const snapshot = {
    schemaVersion: "expungement-ai/final-verification/v1", jurisdiction, pathwayId: pathway,
    selectedTrackId: track, verifiedAt: "2026-09-06T00:00:00.000Z",
    profileVersion: "2026-06-19-source-conversion-1", packetAnswers: { participant_full_legal_name: `P-${itemId.slice(0, 8)}` },
    screeningAnswers: {}, prefilledAnswers: {}, serverFacts: {}
  };
  const verificationHash = sha(JSON.stringify(snapshot));
  const draft = { ...snapshot, schemaVersion: "expungement-ai/protected-packet-draft/v1" };
  db.sql(`
    insert into auth.users values(${q(userId)});
    insert into rcap_persons(id,partner_slug,match_key) values(${q(personId)},'expungement-ai-consumer',${q(consumerPersonMatchKey(userId))});
    insert into consumer_briefcase_items(id,user_id,item_type,status,jurisdiction,pathway_label,result_code,
      packet_type,payment_allowed,payment_status,packet_status,source_pending_result_id)
      values(${q(itemId)},${q(userId)},'result','packet_ready',${q(jurisdiction)},${q(pathway)},'packet_ready',
        'custom_pleading',true,'unpaid','not_started',${q(pendingId)});
    insert into consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,
      verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision)
      values(${q(itemId)},${q(userId)},${q(matterId)},'verified','synthetic fixture',${q(verificationHash)},
        ${q(JSON.stringify(snapshot))},${q(sha(JSON.stringify(draft)))},${q(JSON.stringify(draft))},1);
    insert into consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,claimed_at,
      anonymous_session_id,product,partner_slug,jurisdiction,event_id)
      values(${q(pendingId)},'CLAIMED',${q(itemId)},${q(claimedUser ?? userId)},now(),${q(sessionId)},
        ${q(product)},${q(partnerSlug)},${q(jurisdiction)},${q(event)});
    insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,
      claimed_slot_state,status) values(${q(sessionId)},'rcap',${benefit},${q(partnerSlug)},${q(jurisdiction)},'claimed','in_progress');
    insert into clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,
      route_disposition,queue_status) values(${q(randomUUID())},${q(caseEvent)},${q(userId)},${q(sessionId)},
        ${q(itemId)},${q(jurisdiction)},${q(disposition)},'in_progress');
  `);
  return { userId, itemId, personId, pendingId, sessionId, matterId, snapshot, verificationHash };
}

function renderPayload(p, { routeKey = IL_ROUTE, family = IL_FAMILY, track = IL_TRACK,
  specId = IL_SPEC_ID, specVersion = IL_SPEC_VERSION, specSha = IL_SPEC_SHA } = {}) {
  const packetId = randomUUID();
  const inputHash = sha(`${p.itemId}:${p.verificationHash}:${routeKey}`);
  const payload = {
    schemaVersion: "rcap-personalized-render/v1", authUserId: p.userId, briefcaseItemId: p.itemId,
    personId: p.personId, matterId: p.matterId, verificationHash: p.verificationHash, snapshot: p.snapshot,
    routeId: routeKey, trackId: track, packetFamilyId: family, specificationId: specId,
    specificationVersion: specVersion, specificationSha256: specSha, inputHash
  };
  const packet = {
    id: packetId, user_id: p.userId, briefcase_id: p.itemId, person_id: p.personId,
    state: p.snapshot.jurisdiction, jurisdiction: p.snapshot.jurisdiction,
    document_type: "source_driven_packet", pathway: "source_engine_packet_plan", status: "ready_for_review"
  };
  return { packetId, inputHash, payload, packet, routeKey };
}

function enqueueSql(p, r) {
  return `select id from enqueue_verified_sponsored_packet_render(${q(r.routeKey)},${q(p.sessionId)},
    ${q(r.packetId)},${q(r.routeKey)},'packet_document_v1','1.0.0',null,${q(p.snapshot.jurisdiction)},
    '2026-06-19-source-conversion-1',${q(r.inputHash)},${q(p.itemId)},${q(p.personId)},${q(p.matterId)},5,
    ${q(p.userId)},${q(p.verificationHash)},${q(JSON.stringify(r.packet))}::jsonb,
    ${q(JSON.stringify(r.payload))}::jsonb)`;
}

function artifactFor(p, outputSha, overrides = {}) {
  return {
    provider: "rcap_grade_a_composer_v1", packetId: p.itemId, fileName: "illinois-record-clearing-packet.pdf",
    contentType: "application/pdf", generatedAt: "2026-09-06T00:00:00.000Z",
    source: "grade_a_packet_specification", packetSpecificationId: IL_SPEC_ID,
    packetSpecificationVersion: IL_SPEC_VERSION, packetSpecificationSha256: IL_SPEC_SHA,
    packetFamily: IL_FAMILY, documentCount: 2, verificationHash: p.verificationHash,
    downloadPath: `/api/expungement-ai/packet/${p.itemId}/download`, artifactSha256: outputSha,
    pageCount: 3, ...overrides
  };
}

function finalize(routeKey, p, artifact, jobId) {
  return db.json(`select to_jsonb(x) from (select * from finalize_sponsored_packet_generation_for_route(
    ${q(routeKey)},${q(p.sessionId)},${q(p.itemId)},${q(p.verificationHash)},
    ${q(JSON.stringify(artifact))}::jsonb,${q(jobId)})) x`);
}

const clinicUsed = () => Number(db.scalar(`select screenings_used from partner_entitlement where partner_slug=${q(IL_PARTNER)}`));
const provenanceCount = () => Number(db.scalar("select count(*) from consumer_packet_artifact_provenance"));
const ledgerConsumed = (jobId) => Number(db.scalar(`select count(*) from packet_credit_ledger where render_job_id=${q(jobId)} and event_type in ('consumed','overage_consumed')`));

try {
  db.sql(baseline());
  for (const phase of ["26-consumer-briefcase-items", "27-consumer-checkout-metadata",
    "28-consumer-packet-generation-status", "49-rcap-packet-render-jobs",
    "50-rcap-packet-delivery-hardening", "51-rcap-consumer-payment-gate",
    "52-rcap-consumer-payment-authority", "53-rcap-consumer-job-binding",
    "54-rcap-person-namespace-hardening", "55-expungement-matter-payment-binding"]) {
    db.applyFile(path.resolve(`supabase/phase-${phase}.sql`));
  }
  db.sql(clinicFixtures());
  for (const migration of ["20260901115000_consumer_packet_artifact_provenance.sql",
    "20260901120000_dtc_consumer_launch_rails.sql", "20260901130000_consumer_private_delivery.sql",
    "20260901140000_tighten_consumer_artifact_authorization.sql", "20260903130000_atomic_sponsored_packet_finalization.sql",
    "20260906120000_sponsored_route_render_transaction.sql", "20260906130000_verified_artifact_regeneration.sql",
    "20260917090000_consumer_promotion_codes.sql", "20260924120347_packet_delivery_dependency_and_retry_errors.sql",
    "20260924172645_preserve_sponsored_regeneration_attribution.sql",
    "20260927152649_clinic_packet_funding_choice.sql"]) db.applyFile(path.resolve("supabase/migrations",migration));
  db.sql(`insert into partner_records values (${q(partnerId)},${q(IL_PARTNER)}),(${q(otherPartnerId)},'wrong-partner');
    insert into partner_packet_entitlement(partner_id,packet_cap,overage_enabled,overage_cap) values(${q(partnerId)},1,false,0);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation) values
      (${q(eventId)},${q(IL_PARTNER)},'Synthetic Clinic','IL','published',1),
      (${q(otherEventId)},'wrong-partner','Other Clinic','IL','published',1);
    insert into partner_entitlement(partner_slug,screenings_allowed,pause_at_cap,overage_enabled)
      values(${q(IL_PARTNER)},1,true,false);`);
  return { db, seedParticipant, renderPayload, enqueueSql, artifactFor, finalize, eventId, otherEventId, partnerId };
} catch(error) {db.stop();throw error;}
}
