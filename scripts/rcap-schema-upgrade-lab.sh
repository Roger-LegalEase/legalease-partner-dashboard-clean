#!/usr/bin/env bash
# Local lab for the Production schema upgrade. Builds isolated databases from the
# recovered Production baseline and from the repository's SQL inputs, so the
# forward migration can be derived and proven without touching Production.
#
# Nothing here connects to Supabase. There is no login, link, remote migration
# list, db push, db pull, migration repair or db reset anywhere in this file.
#
#   scripts/rcap-schema-upgrade-lab.sh up                 start the cluster
#   scripts/rcap-schema-upgrade-lab.sh build baseline DB  baseline only
#   scripts/rcap-schema-upgrade-lab.sh build target   DB  repository SQL inputs only
#   scripts/rcap-schema-upgrade-lab.sh build stacked  DB  baseline + repository inputs
#   scripts/rcap-schema-upgrade-lab.sh build stacked-pre DB  the same, minus the hardening phase
#   scripts/rcap-schema-upgrade-lab.sh seed DB            load the public-view fixture
#   scripts/rcap-schema-upgrade-lab.sh sql DB < file      run SQL, print unaligned rows
#   scripts/rcap-schema-upgrade-lab.sh build upgrade  DB  baseline + forward migrations
#   scripts/rcap-schema-upgrade-lab.sh catalog DB [FILE]  normalized catalog inventory
#   scripts/rcap-schema-upgrade-lab.sh down               stop the cluster
#
# The server is PostgreSQL 17.6 — the same major.minor Production runs, and the
# version the recovered baseline was replayed on during its reconciliation. The
# `MAINTAIN` privilege the baseline grants is PostgreSQL 17+ syntax, so a 16
# server cannot replay the baseline at all. The binaries come from the
# @embedded-postgres/linux-x64 npm package because this container has no Docker
# and no PGDG apt source; set PGBIN to a real PostgreSQL 17 bin directory to skip
# that download.
#
# The lab is plain PostgreSQL, not the Supabase image, so it creates the platform
# surface the SQL depends on: the auth/storage/extensions/vault schemas, the
# anon/authenticated/service_role roles, auth.uid()/auth.role()/auth.email()
# reading request.jwt.claim.*, storage.buckets/storage.objects, and the
# supabase_realtime publication. `supabase_vault` has no open-source build, so a
# stub extension supplies only the identity the baseline declares — the baseline
# and every repository SQL input read no vault object.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAB_HOME="${RCAP_LAB_HOME:-/tmp/rcap-schema-lab}"
PG_NPM_PACKAGE="${RCAP_LAB_PG_PACKAGE:-@embedded-postgres/linux-x64@17.6.0-beta.15}"
PGPORT="${PGPORT:-55433}"
PGBIN="${PGBIN:-$LAB_HOME/pg/native/bin}"
PGLIB="${PGLIB:-$LAB_HOME/pg/native/lib}"
PGSHARE="${PGSHARE:-$LAB_HOME/pg/native/share/postgresql}"
PGDATA="${PGDATA:-$LAB_HOME/data}"
BASELINE="$ROOT/supabase/migrations/20260728213131_remote_schema.sql"
ADMIN_URL="postgres://postgres@127.0.0.1:${PGPORT}/postgres"

export LD_LIBRARY_PATH="$PGLIB${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

db_url() { echo "postgres://postgres@127.0.0.1:${PGPORT}/$1"; }

# Repository SQL inputs are ordered by phase number, then by any letter suffix, so
# phase-19 precedes phase-19i and phase-35 precedes phase-35b/c/d. This is the same
# order scripts/local-onboarding-db.sh implements; a plain sort gets it wrong.
loose_order() {
  ls "$ROOT"/supabase/phase-*.sql \
    | sed -E 's|.*/phase-([0-9]+)([a-z]*)-.*|\1 \2 &|' \
    | sort -k1,1n -k2,2 \
    | awk '{print $NF}'
}

# The hardening phase, excluded by the `stacked-pre` recipe so the public row sets can be
# compared with and without it. Nothing else treats it specially.
HARDENING_INPUT="phase-56-public-view-and-default-privilege-hardening.sql"

# Post-baseline migrations, in filename order. The baseline itself is excluded:
# it is the starting point, never a forward step.
forward_order() {
  ls "$ROOT"/supabase/migrations/*.sql \
    | grep -v '20260728213131_remote_schema.sql' \
    | sort
}

provision_postgres() {
  [ -x "$PGBIN/postgres" ] && return 0
  echo "provisioning PostgreSQL 17 into $LAB_HOME/pg (one time)"
  mkdir -p "$LAB_HOME/pkg"
  ( cd "$LAB_HOME/pkg" && npm pack "$PG_NPM_PACKAGE" >/dev/null )
  mkdir -p "$LAB_HOME/pg"
  tar xzf "$LAB_HOME"/pkg/*.tgz -C "$LAB_HOME/pg" --strip-components=1
  # The npm package ships versioned shared objects and expects its install script
  # to create the soname symlinks. Without them the server cannot start.
  ( cd "$PGLIB" && for f in *.so.*; do
      base="${f%.*}"
      [ "$base" != "$f" ] && [ ! -e "$base" ] && ln -sf "$f" "$base"
    done ) || true
}

install_vault_stub() {
  local extdir="$PGSHARE/extension"
  [ -f "$extdir/supabase_vault.control" ] && return 0
  cat > "$extdir/supabase_vault.control" <<'CTL'
comment = 'local lab stub standing in for supabase_vault'
default_version = '0.3.1'
relocatable = false
CTL
  cat > "$extdir/supabase_vault--0.3.1.sql" <<'STUB'
\echo Use "CREATE EXTENSION supabase_vault" to load this file. \quit
-- Deliberately empty. The recovered baseline declares the vault extension but
-- reads no vault object, and neither does any repository SQL input.
STUB
}

apply_shim() {
  psql "$(db_url "$1")" -v ON_ERROR_STOP=1 -q <<'SQL'
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists vault;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_stat_statements with schema extensions;
create extension if not exists supabase_vault with schema vault;
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
do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
SQL
}

apply_file() {
  local db="$1" file="$2" label err
  label="$(basename "$file")"
  err="$(mktemp)"
  if psql "$(db_url "$db")" -v ON_ERROR_STOP=1 -q -f "$file" >/dev/null 2>"$err"; then
    echo "  ok   $label"
    rm -f "$err"
  else
    echo "  FAIL $label"
    grep -E "ERROR" "$err" | head -3 || true
    rm -f "$err"
    # RCAP_LAB_CONTINUE=1 surveys every failure in one pass instead of stopping at
    # the first. Only ever used to diagnose an input set, never to declare a build good.
    [ "${RCAP_LAB_CONTINUE:-0}" = "1" ] || return 1
    LAB_FAILURES=$((${LAB_FAILURES:-0} + 1))
  fi
}

# Eight repository inputs create a policy the recovered baseline already contains,
# using bare `create policy` rather than a guarded form, so stacking them on the
# baseline stops with "policy ... already exists". Every one of the eight is
# identical to the baseline's policy in command, roles, USING and WITH CHECK, so the
# lab drops the duplicate immediately before the input recreates it and the stacked
# reference ends up exactly where the input intended.
#
# The forward migration never does this. It does not re-create any of the eight,
# which is why no table's access is ever momentarily absent in Production.
clear_bootstrap_collisions() {
  psql "$(db_url "$1")" -v ON_ERROR_STOP=1 -q <<'SQL'
drop policy if exists "consumer briefcase delete own items" on public.consumer_briefcase_items;
drop policy if exists "consumer briefcase insert own items" on public.consumer_briefcase_items;
drop policy if exists "consumer briefcase select own items" on public.consumer_briefcase_items;
drop policy if exists "consumer briefcase update own items" on public.consumer_briefcase_items;
drop policy if exists "service role can manage pending screening results"
  on public.consumer_pending_screening_results;
drop policy if exists "consumer wilma telemetry internal safety select"
  on public.consumer_wilma_telemetry;
drop policy if exists "service role can manage web analytics rollups"
  on public.web_analytics_daily_rollups;
drop policy if exists "service role can manage web analytics events"
  on public.web_analytics_events;
SQL
}

ensure_cluster() {
  provision_postgres
  install_vault_stub
  if psql "$ADMIN_URL" -c 'select 1' >/dev/null 2>&1; then return 0; fi
  command -v psql >/dev/null || { echo "missing: psql client"; exit 1; }
  id -u postgres >/dev/null 2>&1 || useradd -m postgres
  mkdir -p "$LAB_HOME"
  chown -R postgres:postgres "$LAB_HOME"
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    rm -rf "$PGDATA"
    su postgres -c "LD_LIBRARY_PATH=$PGLIB $PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
  fi
  su postgres -c "LD_LIBRARY_PATH=$PGLIB $PGBIN/pg_ctl -D $PGDATA -o '-p $PGPORT' -l $LAB_HOME/pg.log start" >/dev/null
  for _ in $(seq 1 30); do psql "$ADMIN_URL" -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done
  psql "$ADMIN_URL" -tAc 'select version()' | head -1
}

build() {
  local recipe="$1" db="$2"
  ensure_cluster
  psql "$ADMIN_URL" -q -c "drop database if exists \"$db\"" -c "create database \"$db\"" 2>/dev/null
  apply_shim "$db"
  case "$recipe" in
    baseline)
      apply_file "$db" "$BASELINE"
      ;;
    target)
      apply_file "$db" "$ROOT/supabase/partner-journey-os.sql"
      while read -r f; do apply_file "$db" "$f"; done < <(loose_order)
      ;;
    stacked)
      apply_file "$db" "$BASELINE"
      clear_bootstrap_collisions "$db"
      apply_file "$db" "$ROOT/supabase/partner-journey-os.sql"
      while read -r f; do apply_file "$db" "$f"; done < <(loose_order)
      ;;
    stacked-pre)
      # The accepted schema as it stood before the Security Advisor remediation. Exists
      # only so the remediation can be proven to leave the public row sets alone.
      apply_file "$db" "$BASELINE"
      clear_bootstrap_collisions "$db"
      apply_file "$db" "$ROOT/supabase/partner-journey-os.sql"
      while read -r f; do
        [ "$(basename "$f")" = "$HARDENING_INPUT" ] && continue
        apply_file "$db" "$f"
      done < <(loose_order)
      ;;
    upgrade)
      apply_file "$db" "$BASELINE"
      while read -r f; do apply_file "$db" "$f"; done < <(forward_order)
      ;;
    *) echo "unknown recipe: $recipe"; exit 1 ;;
  esac
  echo "built $recipe -> $(db_url "$db")"
}

case "${1:-}" in
  up)      ensure_cluster; echo "cluster ready on port $PGPORT" ;;
  build)   build "${2:?recipe}" "${3:?database}" ;;
  sql)
    # Reads one statement batch on stdin and prints unaligned rows. Used by the verifier
    # for the probes a catalog dump cannot express, such as reading a view as anon.
    ensure_cluster >/dev/null
    # stderr is merged into stdout so a caller can assert on a permission denial, which
    # psql reports on stderr and would otherwise vanish.
    psql "$(db_url "${2:?database}")" -At -F '|' -v ON_ERROR_STOP=0 2>&1
    ;;
  seed)
    ensure_cluster >/dev/null
    apply_file "${2:?database}" "$ROOT/scripts/rcap-public-view-fixture.sql"
    ;;
  catalog)
    ensure_cluster >/dev/null
    if [ -n "${3:-}" ]; then
      psql "$(db_url "${2:?database}")" -At -F $'\t' -f "$ROOT/scripts/rcap-schema-catalog.sql" > "$3"
    else
      psql "$(db_url "${2:?database}")" -At -F $'\t' -f "$ROOT/scripts/rcap-schema-catalog.sql"
    fi
    ;;
  psql)    exec psql "$(db_url "${2:?database}")" ;;
  down)    su postgres -c "LD_LIBRARY_PATH=$PGLIB $PGBIN/pg_ctl -D $PGDATA stop" >/dev/null && echo "stopped" ;;
  *) echo "usage: $0 {up|build RECIPE DB|seed DB|sql DB|catalog DB [FILE]|psql DB|down}"; exit 1 ;;
esac
