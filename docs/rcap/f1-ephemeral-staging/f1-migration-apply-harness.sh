#!/bin/bash
# F1 ephemeral six-migration apply with per-apply hash recomputation.
# Authorized scope: local_ephemeral_test (throwaway cluster, created and destroyed here).
set -euo pipefail
export PATH="/usr/lib/postgresql/16/bin:$PATH"
R=/home/user/rcap-f1-ephemeral-staging
OUT=/home/user/f1-stack/evidence
mkdir -p "$OUT"
S=$(mktemp -d /tmp/rcap-f1-XXXX)
chmod 777 "$S"; chown postgres:postgres "$S"
sup() { su postgres -s /bin/bash -c "$1"; }
sup "/usr/lib/postgresql/16/bin/initdb -D $S/data -U postgres -A trust" >/dev/null
sup "/usr/lib/postgresql/16/bin/pg_ctl -D $S/data -o '-p 55499 -k $S -c listen_addresses=' -l $S/log start -w -t 30" >/dev/null
q() { psql -h "$S" -p 55499 -U postgres -d postgres -X --no-psqlrc -Atc "$1"; }
cleanup() { sup "/usr/lib/postgresql/16/bin/pg_ctl -D $S/data stop" >/dev/null 2>&1 || true; rm -rf "$S"; }
trap cleanup EXIT

# Production-equivalent preconditions (Supabase default privileges + partner tables).
q "create extension if not exists pgcrypto" >/dev/null
q "create role anon nologin" >/dev/null
q "create role authenticated nologin" >/dev/null
q "create role service_role nologin bypassrls" >/dev/null
q "alter default privileges in schema public grant all on tables to service_role" >/dev/null
q "alter default privileges in schema public grant all on tables to anon, authenticated" >/dev/null
q "create table public.partner_records (id uuid primary key, partner_slug text unique not null)" >/dev/null
q "create table public.rcap_persons (id uuid primary key default gen_random_uuid(), partner_slug text not null, match_key text not null)" >/dev/null
q "create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())" >/dev/null
q "create table public.consumer_briefcase_items (id uuid primary key default gen_random_uuid(), user_id uuid, payment_status text default 'unpaid', amount_cents integer)" >/dev/null

declare -A FROZEN=(
  [49]=2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6
  [50]=15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62
  [51]=3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba
  [52]=c906068f7800df7dd9a34baff5830269f50bab3ddc7224b72f2e7369ff256bd3
  [53]=469ece83b54ef840f8571d90f0fbeed3ee16f246e906f0e44cc82ecac899b22f
  [54]=3114c1d26ad6f70a0eb78331c2729e035a53b4f9af9ab9cb36feb3a5fb2becac
)
declare -A PATHS=(
  [49]=supabase/phase-49-rcap-packet-render-jobs.sql
  [50]=supabase/phase-50-rcap-packet-delivery-hardening.sql
  [51]=supabase/phase-51-rcap-consumer-payment-gate.sql
  [52]=supabase/phase-52-rcap-consumer-payment-authority.sql
  [53]=supabase/phase-53-rcap-consumer-job-binding.sql
  [54]=supabase/phase-54-rcap-person-namespace-hardening.sql
)

echo "{" > "$OUT/migration-apply.json"
echo "  \"appliedAtUtc\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$OUT/migration-apply.json"
echo "  \"sequence\": [" >> "$OUT/migration-apply.json"
first=1
for p in 49 50 51 52 53 54; do
  f="$R/${PATHS[$p]}"
  actual=$(sha256sum "$f" | cut -d' ' -f1)          # recomputed immediately before apply
  if [ "$actual" != "${FROZEN[$p]}" ]; then
    echo "HASH MISMATCH phase $p: expected ${FROZEN[$p]} got $actual" >&2
    exit 1
  fi
  psql -h "$S" -p 55499 -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$f" > "$OUT/apply-phase-$p.log" 2>&1
  [ $first -eq 1 ] && first=0 || echo "," >> "$OUT/migration-apply.json"
  printf '    {"phase": %s, "path": "%s", "sha256": "%s", "hashMatch": true, "applied": true}' \
    "$p" "${PATHS[$p]}" "$actual" >> "$OUT/migration-apply.json"
  echo "phase $p applied, hash verified $actual"
done
echo "" >> "$OUT/migration-apply.json"
echo "  ]," >> "$OUT/migration-apply.json"

# ---- post-apply object verification -----------------------------------------
v() { printf '  %-58s %s\n' "$1" "$(q "$2")"; }
{
echo "=== OBJECT VERIFICATION (post 49->54) ==="
v "packet_render_jobs table"        "select to_regclass('public.packet_render_jobs') is not null"
v "partner_packet_entitlement"      "select to_regclass('public.partner_packet_entitlement') is not null"
v "packet_credit_ledger"            "select to_regclass('public.packet_credit_ledger') is not null"
v "packet_delivery_events"          "select to_regclass('public.packet_delivery_events') is not null"
v "finalize is PHASE 52 definition" "select (prosrc like '%consumer_packet_payment_authority%' and prosrc like '%consumer_packet_payment_consumption%' and prosrc like '%consumer_payment_matter_conflict%') from pg_proc where proname='finalize_packet_render_job' limit 1"
v "record_consumer_packet_payment"  "select exists(select 1 from pg_proc where proname='record_consumer_packet_payment')"
v "enqueue signature count (==1)"   "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='enqueue_packet_render_job'"
v "enqueue is phase53-bound (15 arg)" "select pg_get_function_identity_arguments(p.oid) like '%p_expected_consumer_auth_user_id%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='enqueue_packet_render_job'"
v "rcap_persons RLS enabled (P54)"  "select relrowsecurity from pg_class where relname='rcap_persons'"
v "anon has NO rcap_persons grant"  "select not has_table_privilege('anon','public.rcap_persons','SELECT')"
v "authenticated NO rcap_persons"   "select not has_table_privilege('authenticated','public.rcap_persons','SELECT')"
v "anon NO packet_render_jobs DML"  "select not has_table_privilege('anon','public.packet_render_jobs','INSERT')"
v "auth NO ledger INSERT"           "select not has_table_privilege('authenticated','public.packet_credit_ledger','INSERT')"
v "guard triggers on jobs"          "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='packet_render_jobs' and not t.tgisinternal"
v "ledger guard trigger"            "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid where c.relname='packet_credit_ledger' and not t.tgisinternal"
v "eligible-requires-accounting"    "select count(*) from pg_constraint where conname='packet_render_jobs_eligible_requires_accounting_check'"
v "accounting_result allows p51"    "select pg_get_constraintdef(oid) like '%consumer_payment_required%' from pg_constraint where conname='packet_render_jobs_accounting_result_check'"
v "reserved-namespace constraint"   "select count(*) from pg_constraint c join pg_class t on t.oid=c.conrelid where t.relname='rcap_persons'"
v "search_path pinned on writer"    "select coalesce(array_to_string(proconfig,','),'none') like '%search_path%' from pg_proc where proname='record_consumer_packet_payment'"
v "functions total (public)"        "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"
v "RLS-enabled tables count"        "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity"
v "policies count"                  "select count(*) from pg_policies where schemaname='public'"
} | tee "$OUT/object-verification.txt"

echo "  \"objectVerification\": \"see object-verification.txt\"" >> "$OUT/migration-apply.json"
echo "}" >> "$OUT/migration-apply.json"
echo "F1-MIGRATION-APPLY-COMPLETE"
