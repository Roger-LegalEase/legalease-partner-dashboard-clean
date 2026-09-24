import fs from 'node:fs';
import path from 'node:path';
import { startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
import { REPAIR_PATH, packetCatalogQuery, normalizeCatalog, digest } from './rcap-packet-database-contract.mjs';

export const PHASE_FILES = [
  'supabase/phase-49-rcap-packet-render-jobs.sql',
  'supabase/phase-50-rcap-packet-delivery-hardening.sql',
  'supabase/phase-51-rcap-consumer-payment-gate.sql',
  'supabase/phase-52-rcap-consumer-payment-authority.sql',
  'supabase/phase-53-rcap-consumer-job-binding.sql',
  'supabase/phase-54-rcap-person-namespace-hardening.sql',
  'supabase/phase-55-expungement-matter-payment-binding.sql'
];

// Existing local PostgreSQL harness, with only prerequisite relations. Every
// Phase-50 statement executes, including Storage and runtime-role revokes.
// Later phases are replayed to account explicitly for their superseding packet
// definitions. This is not a certificate for their unrelated consumer objects.
export function packetTestDatabase(root, through = 55) {
  const db = startEphemeralPg();
  try {
    db.sql(`create role service_role nologin bypassrls;
      alter default privileges in schema public grant all on tables to service_role;
      alter default privileges in schema public grant execute on functions to service_role;
      create table public.partner_records(id uuid primary key default gen_random_uuid(),partner_slug text unique not null);
      create table public.rcap_persons(id uuid primary key default gen_random_uuid(),partner_slug text not null,match_key text not null,unique(partner_slug,match_key));
      create table public.rcap_document_packets(id uuid primary key default gen_random_uuid());
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
    for (const file of PHASE_FILES.slice(0,through-48)) db.applyFile(path.join(root,file));
    return db;
  } catch (error) { db.stop(); throw error; }
}

export function readPacketCatalog(db) {
  return normalizeCatalog(JSON.parse(db.sql(packetCatalogQuery()).trim().split('\n').at(-1)));
}

export function buildPacketReference(root) {
  const db = packetTestDatabase(root,50);
  try {
    const phase50 = readPacketCatalog(db);
    const supersessions = [];
    let prior = phase50;
    for (const file of [...PHASE_FILES.slice(2),REPAIR_PATH]) {
      db.applyFile(path.join(root,file));
      const current = readPacketCatalog(db);
      const keys = Object.keys(current).filter(key => JSON.stringify(prior[key]) !== JSON.stringify(current[key]));
      supersessions.push({ path:file, keys });
      prior = current;
    }
    return {
      schemaVersion:'rcap-packet-database-contract/v1',
      derivation:'Disposable PostgreSQL: exact Phase 49 -> Phase 50, then explicit packet-object successors; no live schema adopted as expected authority.',
      sources:[...PHASE_FILES,REPAIR_PATH].map(file=>({path:file,sha256:digest(fs.readFileSync(path.join(root,file)))})),
      phase50, supersessions, current:prior
    };
  } finally { db.stop(); }
}
