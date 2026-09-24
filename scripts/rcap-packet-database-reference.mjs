import fs from 'node:fs';
import path from 'node:path';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
import { REPAIR_PATH, CORRECTION_PATH, packetCatalogQuery, normalizeCatalog, digest } from './rcap-packet-database-contract.mjs';

export const PHASE_FILES = [
  'supabase/phase-49-rcap-packet-render-jobs.sql',
  'supabase/phase-50-rcap-packet-delivery-hardening.sql',
  'supabase/phase-51-rcap-consumer-payment-gate.sql',
  'supabase/phase-52-rcap-consumer-payment-authority.sql',
  'supabase/phase-53-rcap-consumer-job-binding.sql',
  'supabase/phase-54-rcap-person-namespace-hardening.sql',
  'supabase/phase-55-expungement-matter-payment-binding.sql'
];

export const CONSUMER_PHASE_FILES = [
  'supabase/phase-26-consumer-briefcase-items.sql',
  'supabase/phase-27-consumer-checkout-metadata.sql',
  'supabase/phase-28-consumer-packet-generation-status.sql'
];
export const CONSUMER_GRANTS_SOURCE = 'supabase/migrations/20260818207000_rcap_upgrade_07_grants.sql';
export const CONSUMER_CLAIM_SOURCE = 'supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql';
export const APPLICATION_FILES = [
  'supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql',
  'supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql',
  'supabase/migrations/20260901130000_consumer_private_delivery.sql',
  'supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql',
  'supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql',
  'supabase/migrations/20260906120000_sponsored_route_render_transaction.sql',
  'supabase/migrations/20260906130000_verified_artifact_regeneration.sql',
  'supabase/migrations/20260917090000_consumer_promotion_codes.sql',
  'supabase/migrations/20260924120000_consumer_checkout_replacement_evidence_guard.sql'
];

// Existing local PostgreSQL harness, with only prerequisite relations. Every
// Phase-50 statement executes, including Storage and runtime-role revokes.
// Later phases are replayed to account explicitly for their superseding packet
// definitions. This is not a certificate for their unrelated consumer objects.
export function packetTestDatabase(root, through = 55, application = false) {
  const db = startEphemeralPg();
  try {
    db.sql(`create role anon nologin; create role authenticated nologin;
      create role service_role nologin bypassrls;
      alter default privileges in schema public grant all on tables to service_role;
      alter default privileges in schema public grant execute on functions to service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select current_user::text $$;
      create table public.partner_records(id uuid primary key default gen_random_uuid(),partner_slug text unique not null);
      create table public.rcap_persons(id uuid primary key default gen_random_uuid(),partner_slug text not null,match_key text not null,unique(partner_slug,match_key));
      create table public.rcap_document_packets(id uuid primary key default gen_random_uuid());
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    if (application) for (const file of CONSUMER_PHASE_FILES) db.applyFile(path.join(root,file));
    for (const file of PHASE_FILES.slice(0,through-48)) db.applyFile(path.join(root,file));
    return db;
  } catch (error) { db.stop(); throw error; }
}

// Cross-reference fixtures reused from test-rcap-sponsored-delivery-binding.
// These clinic relations are not certified by the packet contract.
function clinicFixtures() {
  return `
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

function applyConsumerGrants(db,root) {
  // The recovered forward chain owns these ACLs after phase files. MAINTAIN is
  // PG17-only and is outside this certificate's explicit privilege vocabulary;
  // all seven measured table privileges and every column grant are replayed.
  const source=fs.readFileSync(path.join(root,CONSUMER_GRANTS_SOURCE),'utf8');
  const statements=source.split('\n').filter(line=> /^(revoke|grant) /i.test(line)
    && /on (?:TABLE|table) "public"[.]"consumer_briefcase_items" /.test(line));
  if(statements.length<20)throw new Error('consumer_grant_projection_incomplete');
  db.sql(statements.map(line=>line.replace(/MAINTAIN, /g,'')).join('\n'));
  // The current reader also returns the durable claim binding. Replay only
  // its original DDL, never historical pending-result reconciliation data.
  const claim=fs.readFileSync(path.join(root,CONSUMER_CLAIM_SOURCE),'utf8');
  const start=claim.indexOf('alter table public.consumer_briefcase_items\n  add column if not exists source_pending_result_id');
  const end=claim.indexOf('-- 3. Append-only claim audit.',start);
  if(start<0||end<0)throw new Error('consumer_claim_binding_source_missing');
  db.sql(claim.slice(start,end));
}

export function applyPacketApplicationDependencies(db, root, { deliverySuccessors = true } = {}) {
  applyConsumerGrants(db,root);
  db.sql(clinicFixtures());
  db.sql(`create table public.rcap_document_packet_inputs(document_packet_id uuid primary key, partner_slug text, input_payload jsonb);
    create table public.processed_stripe_events(event_id text primary key, related_object_id text);`);
  for (const file of APPLICATION_FILES) {
    if(!deliverySuccessors && /202609061[23]0000_/.test(file))continue;
    db.applyFile(path.join(root,file));
  }
}

export function packetApplicationTestDatabase(root, { corrected = true, deliverySuccessors = true } = {}) {
  const db=packetTestDatabase(root,55,true);
  try {
    applyPacketApplicationDependencies(db,root,{deliverySuccessors});
    db.applyFile(path.join(root,REPAIR_PATH));
    if(corrected) db.applyFile(path.join(root,CORRECTION_PATH));
    return db;
  } catch(error) { db.stop(); throw error; }
}

export function readPacketCatalog(db) {
  return normalizeCatalog(JSON.parse(db.sql(packetCatalogQuery()).trim().split('\n').at(-1)));
}

export function buildPacketReference(root) {
  const db = packetTestDatabase(root,50,true);
  try {
    const phase50 = readPacketCatalog(db);
    const supersessions = [];
    let prior = phase50;
    for (const file of [...PHASE_FILES.slice(2), ...APPLICATION_FILES, REPAIR_PATH, CORRECTION_PATH]) {
      if (file === APPLICATION_FILES[0]) {
        applyConsumerGrants(db,root);
        db.sql(clinicFixtures());
        db.sql(`create table public.rcap_document_packet_inputs(document_packet_id uuid primary key, partner_slug text, input_payload jsonb);
          create table public.processed_stripe_events(event_id text primary key, related_object_id text);`);
      }
      db.applyFile(path.join(root,file));
      const current = readPacketCatalog(db);
      const keys = Object.keys(current).filter(key => JSON.stringify(prior[key]) !== JSON.stringify(current[key]));
      supersessions.push({ path:file, keys });
      prior = current;
    }
    return {
      schemaVersion:'rcap-packet-database-contract/v2',
      derivation:'Disposable PostgreSQL: exact packet and consumer phase sources followed by current verification, sponsored binding, artifact regeneration, promotion and checkout successors. Clinic cross-reference fixtures are excluded from certification; no live schema is adopted as expected authority.',
      sources:[...CONSUMER_PHASE_FILES,CONSUMER_GRANTS_SOURCE,CONSUMER_CLAIM_SOURCE,...PHASE_FILES,...APPLICATION_FILES,REPAIR_PATH,CORRECTION_PATH].map(file=>({path:file,sha256:digest(fs.readFileSync(path.join(root,file)))})),
      phase50, supersessions, current:prior
    };
  } finally { db.stop(); }
}
