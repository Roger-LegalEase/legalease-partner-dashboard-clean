#!/usr/bin/env bash
# Bring up a local Postgres with every migration applied, so onboarding database and RLS
# behavior can be verified without a Supabase project or Docker.
#
# The migrations target Supabase, so this creates the parts of that platform they depend on:
# the auth and storage schemas, the anon/authenticated/service_role roles, and auth.uid(),
# auth.role(), auth.email() reading the request.jwt.claim.* settings that RLS policies use.
# That shim is what makes `set role authenticated` plus a claim behave like a signed-in user.
#
#   scripts/local-onboarding-db.sh up      init, start, apply all migrations
#   scripts/local-onboarding-db.sh apply   re-apply migrations to a running cluster
#   scripts/local-onboarding-db.sh psql    open a shell
#   scripts/local-onboarding-db.sh down    stop the cluster
#
# Then:
#   RCAP_TEST_DATABASE_URL=postgres://postgres@127.0.0.1:${PGPORT:-55432}/rcap \
#     node scripts/verify-onboarding-tenant-isolation.mjs

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGPORT="${PGPORT:-55432}"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDATA="${PGDATA:-/var/lib/postgresql/rcapdata}"
DB="${DB:-rcap}"
URL="postgres://postgres@127.0.0.1:${PGPORT}/${DB}"

need() { command -v "$1" >/dev/null || { echo "missing: $1"; exit 1; }; }

# Migrations are ordered by phase number, then by any letter suffix, so phase-19 precedes
# phase-19i and phase-35 precedes phase-35b/c/d. A plain sort gets this wrong and the
# dependent migrations fail on tables that do not exist yet.
migration_order() {
  ls "$ROOT"/supabase/phase-*.sql \
    | sed -E 's|.*/phase-([0-9]+)([a-z]*)-.*|\1 \2 &|' \
    | sort -k1,1n -k2,2 \
    | awk '{print $NF}'
}

apply_shim() {
  psql "$URL" -v ON_ERROR_STOP=1 -q <<'SQL'
create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists storage;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now());
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create or replace function auth.email() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '') $$;
create table if not exists storage.buckets (
  id text primary key, name text, owner uuid, public boolean default false,
  avif_autodetection boolean default false, file_size_limit bigint,
  allowed_mime_types text[], created_at timestamptz default now(),
  updated_at timestamptz default now());
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id), name text, owner uuid,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(), metadata jsonb, path_tokens text[]);
alter table storage.objects enable row level security;
SQL
}

apply_migrations() {
  local failed=0 applied=0
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/supabase/partner-journey-os.sql" >/dev/null
  applied=$((applied+1)); echo "  ok   partner-journey-os.sql"
  while read -r f; do
    if psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null 2>&1; then
      applied=$((applied+1)); echo "  ok   $(basename "$f")"
    else
      failed=$((failed+1)); echo "  FAIL $(basename "$f")"
      psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f" 2>&1 | grep -E "ERROR" | head -2 || true
    fi
  done < <(migration_order)
  echo "applied=$applied failed=$failed"
  [ "$failed" -eq 0 ]
}

case "${1:-up}" in
  up)
    [ -x "$PGBIN/initdb" ] || { echo "missing: $PGBIN/initdb (set PGBIN to your PostgreSQL bin directory)"; exit 1; }
    need psql
    id -u postgres >/dev/null 2>&1 || useradd -m postgres
    rm -rf "$PGDATA"; mkdir -p "$(dirname "$PGDATA")"; chown postgres:postgres "$(dirname "$PGDATA")"
    su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
    su postgres -c "$PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT' -l $(dirname "$PGDATA")/pg.log start" >/dev/null
    for _ in $(seq 1 30); do psql "postgres://postgres@127.0.0.1:${PGPORT}/postgres" -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done
    psql "postgres://postgres@127.0.0.1:${PGPORT}/postgres" -q -c "drop database if exists ${DB}" -c "create database ${DB}"
    apply_shim
    apply_migrations
    echo "ready: $URL"
    ;;
  apply) apply_shim; apply_migrations ;;
  psql)  exec psql "$URL" ;;
  down)  su postgres -c "$PGBIN/pg_ctl -D $PGDATA stop" >/dev/null && echo "stopped" ;;
  *) echo "usage: $0 {up|apply|psql|down}"; exit 1 ;;
esac
