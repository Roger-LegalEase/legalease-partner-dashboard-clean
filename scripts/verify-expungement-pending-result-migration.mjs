import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = "supabase/phase-38-expungement-pending-screening-results.sql";
const source = fs.readFileSync(path.join(root, migrationPath), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includes(marker, label = marker) {
  assert(source.includes(marker), `Missing ${label}`);
}

includes("create table if not exists public.consumer_pending_screening_results", "pending result table creation");
includes("alter table public.consumer_pending_screening_results enable row level security", "RLS enablement");
includes('create policy "service role can manage pending screening results"', "service-role-only management policy");
includes("auth.role() = 'service_role'", "service-role policy guard");

for (const column of [
  "pending_id uuid primary key",
  "pending_token_hash text unique",
  "jurisdiction text not null",
  "result_code text not null",
  "pathway_label text",
  "packet_type text",
  "screening_answers jsonb not null",
  "result_payload jsonb not null",
  "product text not null",
  "claimed_user_id uuid",
  "expires_at timestamptz not null",
  "created_at timestamptz not null",
  "updated_at timestamptz not null",
  "claimed_at timestamptz",
  "source_session_id uuid"
]) {
  includes(column, `required column: ${column}`);
}

includes("check (product in ('expungement_ai_dtc', 'rcap_partner'))", "DTC/partner source attribution constraint");
includes("check (jsonb_typeof(screening_answers) = 'object')", "answers payload object constraint");
includes("check (jsonb_typeof(result_payload) = 'object')", "result payload object constraint");
includes("consumer_pending_screening_results_expires_at_idx", "expiration index");
includes("consumer_pending_screening_results_claimed_user_idx", "claimed-user index");

assert(!/create policy[\s\S]*auth\.role\(\)\s*=\s*'anon'/i.test(source), "Migration must not grant anon direct access.");
assert(!/create policy[\s\S]*auth\.role\(\)\s*=\s*'authenticated'/i.test(source), "Migration must not grant authenticated direct access.");
assert(!/for select[\s\S]*using\s*\(\s*true\s*\)/i.test(source), "Migration must not include public select policy.");
assert(!/for update[\s\S]*using\s*\(\s*true\s*\)/i.test(source), "Migration must not include public update policy.");

if (failures.length) {
  console.error("Expungement.ai pending-result migration verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai pending-result migration verifier passed.");
console.log("Phase 38 migration is present, RLS-enabled, service-role-only, expiring, and has pending/result/claim fields.");
