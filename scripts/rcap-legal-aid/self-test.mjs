// Proves the shared readback query against a real PostgreSQL catalog (PGlite)
// before it is trusted on a hosted project: empty before the migration,
// complete after it, and prerequisite-sensitive.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "../../node_modules/@electric-sql/pglite/dist/index.cjs";
import { LEGAL_AID_MIGRATION, readbackQuery, summarizeReadback } from "./contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(`
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table public.partner_records(id uuid primary key, partner_slug text unique not null);
    create table public.partner_users(id uuid primary key, auth_user_id uuid unique not null references auth.users(id), partner_slug text references public.partner_records(partner_slug), role text not null, status text not null);
    create table public.screening_sessions(session_id uuid primary key);
    create table public.consumer_briefcase_items(id uuid primary key, user_id uuid not null references auth.users(id));
    create table public.packet_credit_ledger(id uuid primary key);
    create table public.packet_render_jobs(id uuid primary key, status text not null, accounting_result text, failure_disposition text, credit_ledger_id uuid references public.packet_credit_ledger(id), partner_id uuid references public.partner_records(id), matter_id uuid, consumer_auth_user_id uuid references auth.users(id));
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
  `);
  const clinic = ["20260825120000_clinic_mode_core.sql", "20260825121000_clinic_mode_security.sql", "20260825122000_clinic_mode_accounting_reporting.sql"];
  for (const file of clinic) await db.exec(fs.readFileSync(path.join(root, "supabase/migrations", file), "utf8"));
  const summarize = async () => summarizeReadback((await db.query(readbackQuery())).rows[0]);
  const noJurisdiction = await summarize();
  assert.equal(noJurisdiction.prerequisitesExact, false, "the jurisdiction column is a prerequisite");
  assert.equal(noJurisdiction.prerequisites.jurisdictionColumnPresent, false);
  await db.exec(fs.readFileSync(path.join(root, "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql"), "utf8"));
  const before = await summarize();
  assert.equal(before.prerequisitesExact, true, JSON.stringify(before.prerequisites));
  assert.equal(before.empty, true, "Legal Aid state must read as empty before the migration");
  assert.equal(before.complete, false);
  const sql = fs.readFileSync(path.join(root, LEGAL_AID_MIGRATION.path), "utf8");
  await db.exec(sql);
  const after = await summarize();
  assert.equal(after.complete, true, JSON.stringify(after.legalAid));
  assert.equal(after.empty, false);
  // A partial state is neither empty nor complete.
  await db.exec("create table public.legal_aid_probe_partial as select 1; drop table public.legal_aid_probe_partial;");
  await db.exec("revoke execute on function public.legal_aid_register(uuid,uuid,text,text,text,text,text,text,text,text,text,uuid) from service_role");
  const partial = await summarize();
  assert.equal(partial.complete, false, "a grant regression must read as incomplete");
  assert.equal(partial.empty, false);
  console.log("Legal Aid migration readback self-test passed (PGlite; empty → complete; prerequisite- and grant-sensitive).");
} finally {
  await db.close();
}
