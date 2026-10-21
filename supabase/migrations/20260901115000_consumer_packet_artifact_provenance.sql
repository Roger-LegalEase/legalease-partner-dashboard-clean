-- Protected consumer packet-artifact provenance prerequisite.
--
-- The authoritative schema was first introduced inside the broader
-- participant-data-rights migration.  The bounded Clinic Preview sequence does
-- not apply that unrelated migration, but every consumer launch/delivery
-- migration after this point relies on the same protected provenance table.
-- This forward-only prerequisite establishes that exact authority without
-- backfilling an artifact, changing an entitlement, or opening a route.

begin;

-- The provenance immutability trigger uses the same narrowly-scoped erasure
-- signal as the original authoritative definition.  It grants no erasure
-- ability: only a trusted caller that has already set the transaction-local
-- setting can exercise the one owner-pseudonymization exception.
create or replace function public.rcap_participant_erasure_authority()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('rcap.participant_erasure_authority', true), '');
$$;

revoke all on function public.rcap_participant_erasure_authority() from public, anon, authenticated;
grant execute on function public.rcap_participant_erasure_authority() to service_role;

create table if not exists public.consumer_packet_artifact_provenance (
  briefcase_item_id uuid primary key
    references public.consumer_briefcase_items(id) on delete cascade,
  consumer_auth_user_id uuid not null,
  matter_id uuid not null,
  render_job_id uuid references public.packet_render_jobs(id),
  verification_hash text
    constraint consumer_packet_artifact_provenance_verification_hash_check
    check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$'),
  entitlement_source text not null
    constraint consumer_packet_artifact_provenance_entitlement_source_check
    check (entitlement_source in ('consumer_payment', 'partner_sponsorship', 'legacy_backfill')),
  artifact jsonb not null,
  legacy_evidence jsonb,
  revision integer not null default 1
    constraint consumer_packet_artifact_provenance_revision_check
    check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumer_packet_artifact_provenance_legacy_evidence_required
    check (entitlement_source <> 'legacy_backfill' or legacy_evidence is not null)
);

-- CREATE TABLE IF NOT EXISTS must never turn an incompatible preexisting table
-- into apparent success.  Validate the complete authoritative shape before
-- creating or replacing any table-dependent object.
do $provenance_shape$
begin
  if (
    select count(*)
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'consumer_packet_artifact_provenance'
  ) <> 11 or exists (
    with expected(column_name, ordinal_position, udt_name, is_nullable, default_kind) as (
      values
        ('briefcase_item_id', 1, 'uuid', 'NO', 'none'),
        ('consumer_auth_user_id', 2, 'uuid', 'NO', 'none'),
        ('matter_id', 3, 'uuid', 'NO', 'none'),
        ('render_job_id', 4, 'uuid', 'YES', 'none'),
        ('verification_hash', 5, 'text', 'YES', 'none'),
        ('entitlement_source', 6, 'text', 'NO', 'none'),
        ('artifact', 7, 'jsonb', 'NO', 'none'),
        ('legacy_evidence', 8, 'jsonb', 'YES', 'none'),
        ('revision', 9, 'int4', 'NO', 'one'),
        ('created_at', 10, 'timestamptz', 'NO', 'now'),
        ('updated_at', 11, 'timestamptz', 'NO', 'now')
    )
    select 1
    from expected e
    left join information_schema.columns c
      on c.table_schema = 'public'
     and c.table_name = 'consumer_packet_artifact_provenance'
     and c.column_name = e.column_name
    where c.column_name is null
       or c.ordinal_position <> e.ordinal_position
       or c.udt_name <> e.udt_name
       or c.is_nullable <> e.is_nullable
       or (e.default_kind = 'none' and c.column_default is not null)
       or (e.default_kind = 'one' and coalesce(c.column_default, '') not in ('1', '1::integer'))
       or (e.default_kind = 'now' and coalesce(c.column_default, '') <> 'now()')
  ) then
    raise exception 'consumer_packet_artifact_provenance: incompatible column shape';
  end if;

  if (
    select count(*)
    from pg_constraint c
    where c.conrelid = 'public.consumer_packet_artifact_provenance'::regclass
  ) <> 7 or exists (
    with expected(name, definition) as (values
      ('consumer_packet_artifact_provenance_pkey',
        'PRIMARY KEY (briefcase_item_id)'),
      ('consumer_packet_artifact_provenance_briefcase_item_id_fkey',
        'FOREIGN KEY (briefcase_item_id) REFERENCES consumer_briefcase_items(id) ON DELETE CASCADE'),
      ('consumer_packet_artifact_provenance_render_job_id_fkey',
        'FOREIGN KEY (render_job_id) REFERENCES packet_render_jobs(id)'),
      ('consumer_packet_artifact_provenance_verification_hash_check',
        'CHECK (((verification_hash IS NULL) OR (verification_hash ~ ''^[a-f0-9]{64}$''::text)))'),
      ('consumer_packet_artifact_provenance_entitlement_source_check',
        'CHECK ((entitlement_source = ANY (ARRAY[''consumer_payment''::text, ''partner_sponsorship''::text, ''legacy_backfill''::text])))'),
      ('consumer_packet_artifact_provenance_revision_check',
        'CHECK ((revision >= 1))'),
      ('consumer_packet_artifact_provenance_legacy_evidence_required',
        'CHECK (((entitlement_source <> ''legacy_backfill''::text) OR (legacy_evidence IS NOT NULL)))')
    )
    select 1
    from expected e
    left join pg_constraint c
      on c.conrelid = 'public.consumer_packet_artifact_provenance'::regclass
     and c.conname = e.name
    where c.oid is null or pg_get_constraintdef(c.oid) <> e.definition
  ) then
    raise exception 'consumer_packet_artifact_provenance: incompatible constraint shape';
  end if;
end
$provenance_shape$;

create index if not exists consumer_packet_artifact_provenance_user_idx
  on public.consumer_packet_artifact_provenance (consumer_auth_user_id);

do $provenance_index$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class x on x.oid = i.indexrelid
    join pg_am am on am.oid = x.relam
    where i.indrelid = 'public.consumer_packet_artifact_provenance'::regclass
      and x.relname = 'consumer_packet_artifact_provenance_user_idx'
      and am.amname = 'btree'
      and i.indisunique is false
      and i.indisvalid
      and i.indnkeyatts = 1
      and i.indpred is null
      and i.indexprs is null
      and pg_get_indexdef(i.indexrelid) =
        'CREATE INDEX consumer_packet_artifact_provenance_user_idx ON public.consumer_packet_artifact_provenance USING btree (consumer_auth_user_id)'
  ) then
    raise exception 'consumer_packet_artifact_provenance: incompatible owner index';
  end if;
end
$provenance_index$;

alter table public.consumer_packet_artifact_provenance enable row level security;
revoke all on table public.consumer_packet_artifact_provenance from public, anon, authenticated;

do $provenance_policy$
begin
  if exists (
    select 1 from pg_policy
    where polrelid = 'public.consumer_packet_artifact_provenance'::regclass
  ) then
    raise exception 'consumer_packet_artifact_provenance: direct RLS policy is incompatible with protected authority';
  end if;
end
$provenance_policy$;

comment on table public.consumer_packet_artifact_provenance is
  'Protected provenance for an issued consumer packet artifact. The authority behind the private download link. No RLS policy exists, so it is unreadable except by the service role; the participant reaches it only through the download route.';

create or replace function public.consumer_packet_artifact_provenance_immutable()
returns trigger
language plpgsql
set search_path to ''
as $provenance$
declare
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
begin
  if tg_op = 'UPDATE' then
    if new.briefcase_item_id is distinct from old.briefcase_item_id
       or new.matter_id is distinct from old.matter_id
       or new.render_job_id is distinct from old.render_job_id
       or new.entitlement_source is distinct from old.entitlement_source
       or new.verification_hash is distinct from old.verification_hash
       or new.artifact is distinct from old.artifact
       or new.legacy_evidence is distinct from old.legacy_evidence then
      raise exception 'consumer_packet_artifact_provenance: issued artifact provenance is immutable';
    end if;
    if new.consumer_auth_user_id is distinct from old.consumer_auth_user_id and not v_erasure then
      raise exception 'consumer_packet_artifact_provenance: consumer_auth_user_id is immutable once set';
    end if;
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$provenance$;

revoke all on function public.consumer_packet_artifact_provenance_immutable() from public, anon, authenticated;
grant execute on function public.consumer_packet_artifact_provenance_immutable() to service_role;

drop trigger if exists consumer_packet_artifact_provenance_immutable
  on public.consumer_packet_artifact_provenance;
create trigger consumer_packet_artifact_provenance_immutable
  before update on public.consumer_packet_artifact_provenance
  for each row execute function public.consumer_packet_artifact_provenance_immutable();

commit;
