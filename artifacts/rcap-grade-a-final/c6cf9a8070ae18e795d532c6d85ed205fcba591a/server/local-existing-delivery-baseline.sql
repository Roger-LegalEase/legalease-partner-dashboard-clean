begin;
-- Short-lived, exact-matter grants for authenticated consumer artifact delivery.
-- The storage bucket remains private; a grant is a second factor bound to the
-- already-authenticated owner, item, matter and immutable artifact revision.

create table public.consumer_artifact_download_grants (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  consumer_auth_user_id uuid not null,
  briefcase_item_id uuid not null
    references public.consumer_briefcase_items(id) on delete cascade,
  matter_id uuid not null,
  artifact_revision integer not null check (artifact_revision >= 1),
  verification_hash text not null check (verification_hash ~ '^[a-f0-9]{64}$'),
  artifact_storage_path text not null check (nullif(trim(artifact_storage_path), '') is not null),
  artifact_sha256 text not null check (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  file_name text not null,
  content_type text not null default 'application/pdf',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint consumer_artifact_download_grants_expiry check (expires_at > created_at)
);

create index consumer_artifact_download_grants_owner_item_idx
  on public.consumer_artifact_download_grants(consumer_auth_user_id, briefcase_item_id);

alter table public.consumer_artifact_download_grants enable row level security;
revoke all on table public.consumer_artifact_download_grants from public, anon, authenticated;

-- Publishing is downstream of the existing worker finalizer.  It does not
-- make a route commercially admissible and it cannot enqueue work: it only
-- mirrors a consumer job after the canonical finalizer has proved both the
-- stored bytes and the exact-matter payment consumption.
create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified';
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', now(),
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
  ) on conflict on constraint consumer_packet_artifact_provenance_pkey do nothing;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact, packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;

drop trigger if exists publish_validated_consumer_render_artifact_trg on public.packet_render_jobs;
create trigger publish_validated_consumer_render_artifact_trg
  after insert or update on public.packet_render_jobs
  for each row execute function public.publish_validated_consumer_render_artifact();

create or replace function public.issue_consumer_artifact_download_grant(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table(grant_id uuid, expires_at text)
language plpgsql
security definer
set search_path = ''
as $issue$
declare
  v_artifact public.consumer_packet_artifact_provenance%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_path text;
  v_sha text;
  v_name text;
  v_type text;
  v_grant uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at <= now()
     or p_expires_at > now() + interval '15 minutes' then return; end if;

  select p.* into v_artifact
  from public.consumer_packet_artifact_provenance p
  join public.consumer_briefcase_items i
    on i.id = p.briefcase_item_id and i.user_id = p_consumer_auth_user_id
  join public.consumer_packet_verifications v
    on v.briefcase_item_id = p.briefcase_item_id
   and v.consumer_auth_user_id = p_consumer_auth_user_id
   and v.status = 'verified'
   and v.verification_hash = p.verification_hash
  where p.briefcase_item_id = p_briefcase_item_id
    and p.consumer_auth_user_id = p_consumer_auth_user_id
  for update of p;
  if not found then return; end if;

  select j.* into v_job from public.packet_render_jobs j
  where j.id = v_artifact.render_job_id
    and j.consumer_briefcase_item_id = p_briefcase_item_id
    and j.consumer_auth_user_id = p_consumer_auth_user_id
    and j.matter_id = v_artifact.matter_id
    and j.consumer_verification_hash = v_artifact.verification_hash
    and j.status in ('artifact_validated', 'delivered')
    and j.delivery_eligibility = 'eligible'
    and j.accounting_result in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed');
  if not found then return; end if;

  v_path := nullif(v_job.output_storage_path, '');
  v_sha := v_job.output_sha256;
  v_name := coalesce(nullif(v_artifact.artifact ->> 'fileName', ''), 'record-clearing-packet.pdf');
  v_type := coalesce(nullif(v_artifact.artifact ->> 'contentType', ''), 'application/pdf');
  if v_path is null or v_sha !~ '^[a-f0-9]{64}$' then return; end if;
  if v_path <> v_artifact.artifact ->> 'storagePath'
     or v_sha <> v_artifact.artifact ->> 'artifactSha256'
     or v_path like '/%'
     or v_path like '%..%'
     or v_path <> ('packet-artifacts/consumer/' || v_artifact.matter_id::text || '/' || v_job.id::text || '/' || v_sha || '.pdf')
  then return; end if;

  insert into public.consumer_artifact_download_grants(
    token_hash, consumer_auth_user_id, briefcase_item_id, matter_id,
    artifact_revision, verification_hash, artifact_storage_path,
    artifact_sha256, file_name, content_type, expires_at
  ) values (
    p_token_hash, p_consumer_auth_user_id, p_briefcase_item_id,
    v_artifact.matter_id, v_artifact.revision, v_artifact.verification_hash,
    v_path, v_sha, v_name, v_type, p_expires_at
  ) returning id into v_grant;
  return query select v_grant, p_expires_at::text;
end;
$issue$;

create or replace function public.authorize_consumer_artifact_download(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_token_hash text
)
returns table(
  grant_id uuid,
  artifact_storage_path text,
  artifact_sha256 text,
  file_name text,
  content_type text,
  render_job_id uuid
)
language plpgsql
security definer
set search_path = ''
as $authorize$
declare
  v_grant public.consumer_artifact_download_grants%rowtype;
  v_job uuid;
begin
  select g.* into v_grant from public.consumer_artifact_download_grants g
  join public.consumer_briefcase_items i
    on i.id = g.briefcase_item_id and i.user_id = p_consumer_auth_user_id
  join public.consumer_packet_artifact_provenance p
    on p.briefcase_item_id = g.briefcase_item_id
   and p.consumer_auth_user_id = g.consumer_auth_user_id
   and p.matter_id = g.matter_id
   and p.revision = g.artifact_revision
   and p.verification_hash = g.verification_hash
  join public.consumer_packet_verifications v
    on v.briefcase_item_id = g.briefcase_item_id
   and v.consumer_auth_user_id = g.consumer_auth_user_id
   and v.status = 'verified'
   and v.verification_hash = g.verification_hash
  where g.token_hash = p_token_hash
    and g.consumer_auth_user_id = p_consumer_auth_user_id
    and g.briefcase_item_id = p_briefcase_item_id
    and g.revoked_at is null
    and g.expires_at > now()
  for update of g;
  if not found then return; end if;

  select p.render_job_id into v_job from public.consumer_packet_artifact_provenance p
   where p.briefcase_item_id = v_grant.briefcase_item_id;
  update public.consumer_artifact_download_grants g set
    download_count = g.download_count + 1,
    last_downloaded_at = now()
  where g.id = v_grant.id;
  return query select v_grant.id, v_grant.artifact_storage_path,
    v_grant.artifact_sha256, v_grant.file_name, v_grant.content_type, v_job;
end;
$authorize$;

create or replace function public.revoke_consumer_artifact_download_grant(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_grant_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $revoke$
declare v_count integer;
begin
  update public.consumer_artifact_download_grants g set revoked_at = coalesce(g.revoked_at, now())
   where g.id = p_grant_id
     and g.consumer_auth_user_id = p_consumer_auth_user_id
     and g.briefcase_item_id = p_briefcase_item_id
     and exists (select 1 from public.consumer_briefcase_items i
       where i.id = g.briefcase_item_id and i.user_id = p_consumer_auth_user_id);
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$revoke$;

do $grants$
declare
  v_signature text;
  v_signatures text[] := array[
    'public.issue_consumer_artifact_download_grant(uuid,uuid,text,timestamp with time zone)',
    'public.authorize_consumer_artifact_download(uuid,uuid,text)',
    'public.revoke_consumer_artifact_download_grant(uuid,uuid,uuid)'
  ];
begin
  foreach v_signature in array v_signatures loop
    execute format('revoke all on function %s from public', v_signature);
    execute format('revoke all on function %s from anon', v_signature);
    execute format('revoke all on function %s from authenticated', v_signature);
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end;
$grants$;

-- Tighten the provenance lookup inside authorize_consumer_artifact_download.
--
-- The 20260901130000 version resolved render_job_id from
-- consumer_packet_artifact_provenance by briefcase_item_id alone, with no
-- owner-consistency filter and no LIMIT. That is safe today only because
-- briefcase_item_id is the table's primary key. If provenance ever stores
-- per-revision rows for one briefcase item (a natural evolution the grant
-- table already anticipates via artifact_revision), the bare lookup would
-- silently become an arbitrary pick of whichever row the planner returns
-- first — and could return a render_job_id belonging to a different revision
-- than the one the grant was issued for.
--
-- This migration re-creates the function with an identical body except that
-- the render_job_id lookup is pinned to the exact grant it authorizes:
-- owner, matter, revision and verification hash must all match, and an
-- explicit `order by p.revision desc limit 1` makes the result deterministic
-- even under any future multi-row shape. No behavior changes for the current
-- single-row-per-item schema.

create or replace function public.authorize_consumer_artifact_download(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_token_hash text
)
returns table(
  grant_id uuid,
  artifact_storage_path text,
  artifact_sha256 text,
  file_name text,
  content_type text,
  render_job_id uuid
)
language plpgsql
security definer
set search_path = ''
as $authorize$
declare
  v_grant public.consumer_artifact_download_grants%rowtype;
  v_job uuid;
begin
  select g.* into v_grant from public.consumer_artifact_download_grants g
  join public.consumer_briefcase_items i
    on i.id = g.briefcase_item_id and i.user_id = p_consumer_auth_user_id
  join public.consumer_packet_artifact_provenance p
    on p.briefcase_item_id = g.briefcase_item_id
   and p.consumer_auth_user_id = g.consumer_auth_user_id
   and p.matter_id = g.matter_id
   and p.revision = g.artifact_revision
   and p.verification_hash = g.verification_hash
  join public.consumer_packet_verifications v
    on v.briefcase_item_id = g.briefcase_item_id
   and v.consumer_auth_user_id = g.consumer_auth_user_id
   and v.status = 'verified'
   and v.verification_hash = g.verification_hash
  where g.token_hash = p_token_hash
    and g.consumer_auth_user_id = p_consumer_auth_user_id
    and g.briefcase_item_id = p_briefcase_item_id
    and g.revoked_at is null
    and g.expires_at > now()
  for update of g;
  if not found then return; end if;

  -- Deterministic, grant-consistent provenance lookup. briefcase_item_id is
  -- the primary key today, so at most one row can match — but future
  -- per-revision provenance rows must not turn this into an arbitrary pick,
  -- so the lookup is pinned to the grant's owner, matter, revision and
  -- verification hash, and ordered with an explicit LIMIT.
  select p.render_job_id into v_job
  from public.consumer_packet_artifact_provenance p
  where p.briefcase_item_id = v_grant.briefcase_item_id
    and p.consumer_auth_user_id = v_grant.consumer_auth_user_id
    and p.matter_id = v_grant.matter_id
    and p.revision = v_grant.artifact_revision
    and p.verification_hash = v_grant.verification_hash
  order by p.revision desc, p.render_job_id desc
  limit 1;
  update public.consumer_artifact_download_grants g set
    download_count = g.download_count + 1,
    last_downloaded_at = now()
  where g.id = v_grant.id;
  return query select v_grant.id, v_grant.artifact_storage_path,
    v_grant.artifact_sha256, v_grant.file_name, v_grant.content_type, v_job;
end;
$authorize$;

-- create or replace preserves the function's ACL, but restate the execute
-- surface explicitly so this migration stands on its own.
revoke all on function public.authorize_consumer_artifact_download(uuid,uuid,text) from public;
revoke all on function public.authorize_consumer_artifact_download(uuid,uuid,text) from anon;
revoke all on function public.authorize_consumer_artifact_download(uuid,uuid,text) from authenticated;
grant execute on function public.authorize_consumer_artifact_download(uuid,uuid,text) to service_role;

-- Local forward repair for verified durable-artifact regeneration.
-- Extends the existing protected provenance row with prior artifact revisions;
-- no new queue, entitlement ledger, provider, route, auth or RLS policy.
-- Historical job/storage bytes remain immutable. Only a new current verified
-- job for the same participant, matter and entitlement may replace the current
-- pointer. Existing grants to the prior revision become unusable.
-- No hosted execution or Production authorization is granted by this file.

alter table public.consumer_packet_artifact_provenance
  add column if not exists superseded_artifacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(superseded_artifacts) = 'array');

comment on column public.consumer_packet_artifact_provenance.superseded_artifacts is
  'Prior immutable artifact identities, retained on their existing owner-protected provenance row. No duplicated owner identifier; erasure retains its original owner-pseudonymization semantics.';

create or replace function public.consumer_packet_artifact_provenance_immutable()
returns trigger
language plpgsql
set search_path = ''
as $provenance$
declare
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
  v_job public.packet_render_jobs%rowtype;
  v_hash text;
  v_valid boolean;
  v_changed boolean;
begin
  if tg_op = 'UPDATE' then
    if new.briefcase_item_id is distinct from old.briefcase_item_id
       or new.matter_id is distinct from old.matter_id
       or new.entitlement_source is distinct from old.entitlement_source
       or new.legacy_evidence is distinct from old.legacy_evidence
       or new.superseded_artifacts is distinct from old.superseded_artifacts then
      raise exception 'consumer_packet_artifact_provenance: identity and history are immutable';
    end if;
    if new.consumer_auth_user_id is distinct from old.consumer_auth_user_id and not v_erasure then
      raise exception 'consumer_packet_artifact_provenance: consumer_auth_user_id is immutable once set';
    end if;
    v_changed := new.render_job_id is distinct from old.render_job_id
      or new.verification_hash is distinct from old.verification_hash
      or new.artifact is distinct from old.artifact;
    if v_changed then
      -- No GUC or caller flag authorizes replacement: the committed job and
      -- current protected verification independently prove its entire identity.
      if v_erasure or old.render_job_id is null or new.render_job_id is null
         or new.render_job_id = old.render_job_id
         or new.verification_hash is not distinct from old.verification_hash
         or new.verification_hash is null then
        raise exception 'consumer_packet_artifact_provenance: replacement requires a new verified job';
      end if;
      select v.verification_hash into v_hash
      from public.consumer_packet_verifications v
      join public.consumer_briefcase_items i
        on i.id = v.briefcase_item_id and i.user_id = v.consumer_auth_user_id
      where v.briefcase_item_id = new.briefcase_item_id
        and v.consumer_auth_user_id = new.consumer_auth_user_id
        and v.matter_id = new.matter_id and v.status = 'verified'
      for update of v;
      if v_hash is distinct from new.verification_hash then
        raise exception 'consumer_packet_artifact_provenance: replacement verification is stale';
      end if;
      select * into v_job from public.packet_render_jobs where id = new.render_job_id;
      if not found or v_job.matter_id is distinct from new.matter_id
         or v_job.status not in ('artifact_validated', 'delivered')
         or v_job.delivery_eligibility is distinct from 'eligible'
         or coalesce(v_job.accounting_result, '') not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
         or v_job.output_sha256 is null
         or v_job.output_sha256 is distinct from new.artifact ->> 'artifactSha256'
         or v_job.output_storage_path is null
         or v_job.output_storage_path is distinct from new.artifact ->> 'storagePath'
         or v_job.id::text is distinct from new.artifact ->> 'renderJobId'
         or new.artifact ->> 'contentType' is distinct from 'application/pdf'
         or new.artifact ->> 'provider' is distinct from old.artifact ->> 'provider' then
        raise exception 'consumer_packet_artifact_provenance: replacement artifact is not its validated job';
      end if;
      if new.entitlement_source = 'consumer_payment' then
        if v_job.partner_id is not null
           or v_job.consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.consumer_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement consumer binding mismatch';
        end if;
        select a.valid into v_valid from public.consumer_packet_payment_authority(
          new.briefcase_item_id, new.consumer_auth_user_id,
          public.expungement_packet_product_id(), v_job.person_id, new.matter_id
        ) a;
      elsif new.entitlement_source = 'partner_sponsorship' then
        if v_job.partner_id is null
           or v_job.sponsored_consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.sponsored_consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.sponsored_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement sponsored binding mismatch';
        end if;
        select a.valid into v_valid from public.sponsored_packet_render_authority(
          v_job.sponsored_route_key, v_job.sponsored_session_id,
          new.briefcase_item_id, new.consumer_auth_user_id
        ) a;
      else
        raise exception 'consumer_packet_artifact_provenance: legacy provenance cannot be replaced';
      end if;
      if not coalesce(v_valid, false) then
        raise exception 'consumer_packet_artifact_provenance: replacement entitlement refused';
      end if;
      new.superseded_artifacts := old.superseded_artifacts || jsonb_build_array(
        jsonb_build_object('revision', old.revision, 'renderJobId', old.render_job_id,
          'verificationHash', old.verification_hash, 'entitlementSource', old.entitlement_source,
          'artifact', old.artifact, 'createdAt', old.created_at, 'supersededAt', now()));
      update public.consumer_artifact_download_grants
      set revoked_at = coalesce(revoked_at, now())
      where briefcase_item_id = old.briefcase_item_id and artifact_revision = old.revision;
    end if;
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$provenance$;

create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified'
  for update;
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', new.artifact_validated_at,
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
    ) on conflict on constraint consumer_packet_artifact_provenance_pkey do update
    set render_job_id = excluded.render_job_id,
        verification_hash = excluded.verification_hash,
        artifact = excluded.artifact
    where consumer_packet_artifact_provenance.consumer_auth_user_id = excluded.consumer_auth_user_id
      and consumer_packet_artifact_provenance.matter_id = excluded.matter_id
      and consumer_packet_artifact_provenance.entitlement_source = excluded.entitlement_source
      and consumer_packet_artifact_provenance.verification_hash is distinct from excluded.verification_hash;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact, packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;


create or replace function public.finalize_sponsored_packet_generation_for_route(
  p_route_key text,
  p_session_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_packet_artifact jsonb,
  p_render_job_id uuid default null
)
returns table(ok boolean, recorded boolean, counted_as text, reason text)
language plpgsql
security definer
set search_path = ''
as $finalize$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_item public.consumer_briefcase_items%rowtype;
  v_verification public.consumer_packet_verifications%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_entitlement public.partner_entitlement%rowtype;
  v_provenance public.consumer_packet_artifact_provenance%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_matter_id uuid;
  v_event_artifact_count integer;
  v_counted_as text;
begin
  -- Refuse malformed caller values before taking a lock or changing a row.
  if p_route_key is null
     or p_session_id is null
     or p_briefcase_item_id is null
     or p_expected_verification_hash !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_packet_artifact) is distinct from 'object' then
    return query select false, false, 'not_counted'::text, 'invalid_input'::text;
    return;
  end if;

  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    return query select false, false, 'not_counted'::text, 'route_not_registered'::text;
    return;
  end if;

  -- The canonical matter is the first lock. The function never accepts an
  -- owner, matter, route, partner, event, or entitlement from its caller.
  select * into v_item
  from public.consumer_briefcase_items i
  where i.id = p_briefcase_item_id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  v_matter_id := public.consumer_matter_id_for_briefcase_item(v_item.id);

  -- Lock the protected verification row immediately after the matter. Display
  -- JSON and packet_status are intentionally not verification authority.
  select * into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = v_item.id
  for update;
  if not found
     or v_verification.status <> 'verified'
     or v_verification.verification_hash is distinct from p_expected_verification_hash then
    return query select false, false, 'not_counted'::text, 'verification_mismatch'::text;
    return;
  end if;
  if v_verification.consumer_auth_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_verification.matter_id is distinct from v_matter_id then
    return query select false, false, 'not_counted'::text, 'wrong_matter'::text;
    return;
  end if;
  if v_item.jurisdiction <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'jurisdiction' <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'pathwayId' <> v_route.pathway_id
     or (v_route.registry_track_id is not null
         and v_verification.verification_snapshot ->> 'selectedTrackId' is distinct from v_route.registry_track_id) then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  -- Reconstruct the same protected claimed source used by the server-side
  -- presentation authority. It binds owner, item, anonymous source session,
  -- partner product, and Clinic event without trusting request JSON.
  select * into v_source
  from public.consumer_pending_screening_results p
  where p.pending_id = v_item.source_pending_result_id
  for update;
  if not found or v_source.status <> 'CLAIMED'
     or v_source.claimed_matter_id is distinct from v_item.id then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  if v_source.claimed_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_source.anonymous_session_id is distinct from p_session_id then
    return query select false, false, 'not_counted'::text, 'wrong_session'::text;
    return;
  end if;
  if v_source.product <> 'rcap_partner'
     or v_source.partner_slug is distinct from v_route.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_source.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_session
  from public.screening_sessions s
  where s.session_id = p_session_id
  for update;
  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_benefit_active is not true then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;
  if v_session.partner_slug is distinct from v_source.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_session.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select c.* into v_case
  from public.clinic_cases c
  where c.event_id = v_source.event_id
    and c.participant_user_id = v_item.user_id
    and c.screening_session_id = p_session_id
    and c.matter_id = v_item.id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_case.jurisdiction <> v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_event
  from public.clinic_events e
  where e.id = v_case.event_id
  for update;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null
     or v_event.sponsorship_allocation <= 0 then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;

  -- A participant-deliverable artifact is a Grade-A PDF bound to this exact
  -- item, verification, specification, family, and immutable byte hash.
  if p_packet_artifact ->> 'provider' <> v_route.artifact_provider
     or p_packet_artifact ->> 'source' <> v_route.artifact_source
     or p_packet_artifact ->> 'contentType' <> v_route.artifact_content_type
     or p_packet_artifact ->> 'packetId' <> v_item.id::text
     or p_packet_artifact ->> 'verificationHash' <> p_expected_verification_hash
     or p_packet_artifact ->> 'packetSpecificationId' <> v_route.packet_specification_id
     or p_packet_artifact ->> 'packetSpecificationVersion' <> v_route.packet_specification_version
     or p_packet_artifact ->> 'packetSpecificationSha256' <> v_route.packet_specification_sha256
     or p_packet_artifact ->> 'packetFamily' <> v_route.packet_family_id
     or p_packet_artifact ->> 'artifactSha256' !~ '^[a-f0-9]{64}$'
     or coalesce((p_packet_artifact ->> 'pageCount') ~ '^[1-9][0-9]*$', false) is not true
     or coalesce((p_packet_artifact ->> 'documentCount') ~ '^[1-9][0-9]*$', false) is not true then
    return query select false, false, 'not_counted'::text, 'malformed_artifact'::text;
    return;
  end if;

  -- An optional render job. When the caller names one it must be this
  -- participant's own sponsored job for this exact route, session and
  -- verification, and it must already hold validated, deliverable bytes.
  if p_render_job_id is not null then
    select * into v_job
    from public.packet_render_jobs j
    where j.id = p_render_job_id
    for update;
    if not found
       or v_job.sponsored_route_key is distinct from v_route.route_key
       or v_job.sponsored_session_id is distinct from p_session_id
       or v_job.sponsored_consumer_briefcase_item_id is distinct from v_item.id
       or v_job.sponsored_consumer_auth_user_id is distinct from v_item.user_id
       or v_job.sponsored_verification_hash is distinct from p_expected_verification_hash
       or v_job.matter_id is distinct from v_matter_id
       or v_job.status not in ('artifact_validated', 'delivered')
       or v_job.delivery_eligibility <> 'eligible'
       or coalesce(v_job.output_sha256, '') <> (p_packet_artifact ->> 'artifactSha256') then
      return query select false, false, 'not_counted'::text, 'render_job_mismatch'::text;
      return;
    end if;
  end if;

  -- Lock existing provenance before reading the allowance. An exact retry is
  -- successful and never approaches the credit counter. A changed verification
  -- may publish another validated job for the same matter without recounting.
  select * into v_provenance
  from public.consumer_packet_artifact_provenance p
  where p.briefcase_item_id = v_item.id
  for update;
  if found then
    if v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.verification_hash = p_expected_verification_hash
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.render_job_id is not distinct from p_render_job_id
       and v_provenance.artifact = p_packet_artifact then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
      order by a.occurred_at asc, a.id asc
      limit 1;
      return query select true, false, coalesce(v_counted_as, 'not_counted'), 'already_finalized'::text;
      return;
    end if;
    -- A new protected verification can replace the current artifact for the
    -- same sponsored matter. Every claim/event/route/job check above still ran.
    -- Existing allowance evidence is reused; no counter or analytics event is
    -- written on this path. Same-verification byte changes remain conflicts.
    if p_render_job_id is not null and v_provenance.render_job_id is not null
       and v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.verification_hash is distinct from p_expected_verification_hash
       and exists (
         select 1 from public.packet_render_jobs previous
         where previous.id = v_provenance.render_job_id
           and previous.sponsored_route_key = p_route_key
           and previous.sponsored_session_id = p_session_id
           and previous.sponsored_clinic_event_id = v_event.id
           and previous.partner_id = v_job.partner_id
       ) then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
        and a.metadata ->> 'clinic_event_id' = v_event.id::text
      order by a.occurred_at asc, a.id asc limit 1;
      if v_counted_as not in ('included', 'overage') or v_counted_as is null
         or v_session.claimed_slot_state is distinct from 'consumed' then
        return query select false, false, 'not_counted'::text, 'prior_consumption_missing'::text;
        return;
      end if;
      update public.consumer_packet_artifact_provenance
      set render_job_id = p_render_job_id,
          verification_hash = p_expected_verification_hash,
          artifact = p_packet_artifact
      where briefcase_item_id = v_item.id;
      update public.consumer_briefcase_items
      set artifact_refs_json = p_packet_artifact, packet_status = 'ready', updated_at = now()
      where id = v_item.id and user_id = v_item.user_id;
      update public.clinic_cases
      set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
      where id = v_case.id;
      return query select true, false, v_counted_as, 'regenerated'::text;
      return;
    end if;
    return query select false, false, 'not_counted'::text, 'artifact_conflict'::text;
    return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, false, 'not_counted'::text, 'sponsorship_already_consumed'::text;
    return;
  end if;

  -- The event allocation is a second, narrower cap around the partner usage
  -- window. Count only protected sponsored provenance for matters in this
  -- exact event; a repeat was returned above and therefore cannot recount.
  select count(*)::integer into v_event_artifact_count
  from public.consumer_packet_artifact_provenance p
  join public.clinic_cases c on c.matter_id = p.briefcase_item_id
  where c.event_id = v_event.id
    and p.entitlement_source = 'partner_sponsorship';
  if v_event_artifact_count >= v_event.sponsorship_allocation then
    return query select false, false, 'capped'::text, 'event_sponsorship_exhausted'::text;
    return;
  end if;

  select * into v_entitlement
  from public.partner_entitlement pe
  where pe.partner_slug = v_event.partner_slug
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'no_entitlement'::text;
    return;
  end if;
  if v_entitlement.screenings_used < v_entitlement.screenings_allowed then
    v_counted_as := 'included';
  elsif v_entitlement.pause_at_cap then
    return query select false, false, 'capped'::text, 'paused_at_cap'::text;
    return;
  elsif v_entitlement.overage_enabled then
    v_counted_as := 'overage';
  else
    return query select false, false, 'not_counted'::text, 'cap_reached_no_overage'::text;
    return;
  end if;

  -- All refusal branches are above this line. Any unexpected failure below is
  -- raised so PostgreSQL rolls back the complete transaction rather than
  -- returning a partially-mutated refusal.
  if v_counted_as = 'included' then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  else
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + pe.overage_packet_price_cents,
        updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  end if;

  update public.screening_sessions s
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where s.session_id = p_session_id and s.claimed_slot_state = 'claimed';
  if not found then raise exception 'sponsored finalization lost its locked session'; end if;

  insert into public.rcap_record_events
    (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values
    ('partner_entitlement', v_event.partner_slug, v_event.partner_slug,
     case when v_counted_as = 'overage'
       then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
     now(), 'system', jsonb_build_object(
       'session_id', p_session_id,
       'briefcase_item_id', v_item.id,
       'counted_as', v_counted_as,
       'clinic_event_id', v_event.id
     ));

  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name,
     event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug,
     v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, now(),
     jsonb_build_object('counted_as', v_counted_as, 'clinic_event_id', v_event.id));
  if v_counted_as = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name,
       event_type, packet_route_available, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug,
       v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', true, now(),
       jsonb_build_object(
         'overage_packet_price_cents', v_entitlement.overage_packet_price_cents,
         'clinic_event_id', v_event.id
       ));
  end if;

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    v_item.id, v_item.user_id, v_matter_id, p_render_job_id,
    p_expected_verification_hash, 'partner_sponsorship', p_packet_artifact
  );

  update public.consumer_briefcase_items i
  set artifact_refs_json = coalesce(i.artifact_refs_json, '{}'::jsonb) || p_packet_artifact,
      packet_status = 'ready', updated_at = now()
  where i.id = v_item.id and i.user_id = v_item.user_id;
  if not found then raise exception 'sponsored finalization lost its locked matter'; end if;

  update public.clinic_cases c
  set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
  where c.id = v_case.id;

  return query select true, true, v_counted_as, null::text;
end;
$finalize$;

-- Existing function identities and grants are retained by CREATE OR REPLACE.
-- No browser/table privilege, RLS policy or authentication/session path changes.

create or replace function public.requeue_retryable_packet_render_jobs()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_key record;
  v_job public.packet_render_jobs%rowtype;
  v_winner uuid;
  v_live uuid;
  v_reason text;
  v_constraint text;
  v_sqlstate text;
  v_schema text;
  v_table text;
  v_count integer := 0;
begin
  perform set_config('rcap.packet_mutation_authority', 'requeue_retryable_packet_render_jobs', true);
  for v_key in
    select distinct packet_id, input_hash from public.packet_render_jobs
    where status = 'failed' and failure_disposition = 'retryable'
    order by packet_id, input_hash
  loop
    -- Housekeepers serialize by logical input, not the whole queue. A busy input
    -- does not block unrelated inputs. The unique index also arbitrates enqueue.
    if not pg_try_advisory_xact_lock(hashtextextended(v_key.packet_id::text || ':' || v_key.input_hash, 0)) then
      continue;
    end if;
    select id into v_live from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
    select id into v_winner from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash
      and status = 'failed' and failure_disposition = 'retryable' and attempt_count < max_attempts
      and next_attempt_at is not null and isfinite(next_attempt_at)
    order by created_at, id limit 1;

    for v_job in
      select * from public.packet_render_jobs
      where packet_id = v_key.packet_id and input_hash = v_key.input_hash
        and status = 'failed' and failure_disposition = 'retryable'
      order by created_at, id for update
    loop
      v_sqlstate := null;
      v_constraint := null;
      v_reason := case
        when v_job.attempt_count >= v_job.max_attempts then 'attempt_limit_reached'
        when v_live is not null then 'live_sibling_exists'
        when v_job.next_attempt_at is null or not isfinite(v_job.next_attempt_at) then 'canonical_retry_time_missing'
        when v_job.id is distinct from v_winner then 'duplicate_retry_superseded'
        else null end;
      if v_reason is null and v_job.next_attempt_at <= now() then
        begin
          update public.packet_render_jobs j
          set status = 'queued', failure_disposition = null,
              retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
                'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', 'canonical_retry_due',
                'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
                'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
                'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
          where j.id = v_job.id;
          v_count := v_count + 1;
          v_live := v_job.id;
        exception when unique_violation then
          get stacked diagnostics v_constraint = constraint_name, v_sqlstate = returned_sqlstate,
            v_schema = schema_name, v_table = table_name;
          if v_sqlstate = '23505' and v_constraint = 'packet_render_jobs_input_hash_live_unique'
             and v_schema = 'public' and v_table = 'packet_render_jobs' then
            -- A concurrent enqueue won. Only this row's attempted requeue is
            -- rolled back; other logical inputs still make progress.
            select id into v_live from public.packet_render_jobs
            where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
            if v_live is null then raise; end if;
            v_reason := 'concurrent_live_sibling_won';
          else
            -- A trigger or another relation's constraint is not this race.
            raise;
          end if;
        end;
      end if;
      if v_reason is not null then
        update public.packet_render_jobs j
        set failure_disposition = 'terminal', next_attempt_at = null,
            retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
              'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', v_reason,
              'canonical_job_id', coalesce(v_live, v_winner),
              'requeue_sqlstate', v_sqlstate, 'requeue_constraint', v_constraint,
              'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
              'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
              'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
        where j.id = v_job.id;
      end if;
    end loop;
  end loop;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;
create or replace function public.consumer_packet_artifact_provenance_immutable()
returns trigger
language plpgsql
set search_path = ''
as $provenance$
declare
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
  v_job public.packet_render_jobs%rowtype;
  v_hash text;
  v_valid boolean;
  v_changed boolean;
begin
  if tg_op = 'UPDATE' then
    if new.briefcase_item_id is distinct from old.briefcase_item_id
       or new.matter_id is distinct from old.matter_id
       or new.entitlement_source is distinct from old.entitlement_source
       or new.legacy_evidence is distinct from old.legacy_evidence
       or new.superseded_artifacts is distinct from old.superseded_artifacts then
      raise exception 'consumer_packet_artifact_provenance: identity and history are immutable';
    end if;
    if new.consumer_auth_user_id is distinct from old.consumer_auth_user_id and not v_erasure then
      raise exception 'consumer_packet_artifact_provenance: consumer_auth_user_id is immutable once set';
    end if;
    v_changed := new.render_job_id is distinct from old.render_job_id
      or new.verification_hash is distinct from old.verification_hash
      or new.artifact is distinct from old.artifact;
    if v_changed then
      -- No GUC or caller flag authorizes replacement: the committed job and
      -- current protected verification independently prove its entire identity.
      if v_erasure or old.render_job_id is null or new.render_job_id is null
         or new.render_job_id = old.render_job_id
         or new.verification_hash is not distinct from old.verification_hash
         or new.verification_hash is null then
        raise exception 'consumer_packet_artifact_provenance: replacement requires a new verified job';
      end if;
      select v.verification_hash into v_hash
      from public.consumer_packet_verifications v
      join public.consumer_briefcase_items i
        on i.id = v.briefcase_item_id and i.user_id = v.consumer_auth_user_id
      where v.briefcase_item_id = new.briefcase_item_id
        and v.consumer_auth_user_id = new.consumer_auth_user_id
        and v.matter_id = new.matter_id and v.status = 'verified'
      for update of v;
      if v_hash is distinct from new.verification_hash then
        raise exception 'consumer_packet_artifact_provenance: replacement verification is stale';
      end if;
      select * into v_job from public.packet_render_jobs where id = new.render_job_id;
      if not found or v_job.matter_id is distinct from new.matter_id
         or v_job.status not in ('artifact_validated', 'delivered')
         or v_job.delivery_eligibility is distinct from 'eligible'
         or coalesce(v_job.accounting_result, '') not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
         or v_job.output_sha256 is null
         or v_job.output_sha256 is distinct from new.artifact ->> 'artifactSha256'
         or v_job.output_storage_path is null
         or v_job.output_storage_path is distinct from new.artifact ->> 'storagePath'
         or v_job.id::text is distinct from new.artifact ->> 'renderJobId'
         or new.artifact ->> 'contentType' is distinct from 'application/pdf'
         or new.artifact ->> 'provider' is distinct from old.artifact ->> 'provider' then
        raise exception 'consumer_packet_artifact_provenance: replacement artifact is not its validated job';
      end if;
      if new.entitlement_source = 'consumer_payment' then
        if v_job.partner_id is not null
           or v_job.consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.consumer_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement consumer binding mismatch';
        end if;
        select a.valid into v_valid from public.consumer_packet_payment_authority(
          new.briefcase_item_id, new.consumer_auth_user_id,
          public.expungement_packet_product_id(), v_job.person_id, new.matter_id
        ) a;
      elsif new.entitlement_source = 'partner_sponsorship' then
        if v_job.partner_id is null
           or v_job.sponsored_consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.sponsored_consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.sponsored_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement sponsored binding mismatch';
        end if;
        select a.valid into v_valid from public.sponsored_packet_render_authority(
          v_job.sponsored_route_key, v_job.sponsored_session_id,
          new.briefcase_item_id, new.consumer_auth_user_id
        ) a;
      else
        raise exception 'consumer_packet_artifact_provenance: legacy provenance cannot be replaced';
      end if;
      if not coalesce(v_valid, false) then
        raise exception 'consumer_packet_artifact_provenance: replacement entitlement refused';
      end if;
      new.superseded_artifacts := old.superseded_artifacts || jsonb_build_array(
        jsonb_build_object('revision', old.revision, 'renderJobId', old.render_job_id,
          'verificationHash', old.verification_hash, 'entitlementSource', old.entitlement_source,
          'artifact', old.artifact, 'createdAt', old.created_at, 'supersededAt', now()));
      update public.consumer_artifact_download_grants
      set revoked_at = coalesce(revoked_at, now())
      where briefcase_item_id = old.briefcase_item_id and artifact_revision = old.revision;
    end if;
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$provenance$;
create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified'
  for update;
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', new.artifact_validated_at,
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
    ) on conflict on constraint consumer_packet_artifact_provenance_pkey do update
    set render_job_id = excluded.render_job_id,
        verification_hash = excluded.verification_hash,
        artifact = excluded.artifact
    where consumer_packet_artifact_provenance.consumer_auth_user_id = excluded.consumer_auth_user_id
      and consumer_packet_artifact_provenance.matter_id = excluded.matter_id
      and consumer_packet_artifact_provenance.entitlement_source = excluded.entitlement_source
      and consumer_packet_artifact_provenance.verification_hash is distinct from excluded.verification_hash;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact, packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;
revoke all on function public.publish_validated_consumer_render_artifact() from public,anon,authenticated;grant execute on function public.publish_validated_consumer_render_artifact() to service_role;
-- Preserve existing durable attribution when publishing validated artifact metadata.
-- Forward-only successor to the September 24 delivery correction. No row backfill,
-- history rewrite, default locale, privilege change or authority-check change.

do $publisher_precondition$
declare
  v_source_md5 text;
begin
  select md5(p.prosrc) into v_source_md5
  from pg_catalog.pg_proc p
  where p.oid = pg_catalog.to_regprocedure('public.publish_validated_consumer_render_artifact()');
  if v_source_md5 is null or v_source_md5 not in (
    'ed59bd717ea5b193e3f791c9e94353e7', -- legitimate prior publisher
    'c0af97726dedbd21018ab10e307bca18'  -- this idempotent successor
  ) then
    raise exception 'unrecognized current authority: publish_validated_consumer_render_artifact';
  end if;
end;
$publisher_precondition$;

create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified'
  for update;
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', new.artifact_validated_at,
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
    ) on conflict on constraint consumer_packet_artifact_provenance_pkey do update
    set render_job_id = excluded.render_job_id,
        verification_hash = excluded.verification_hash,
        artifact = excluded.artifact
    where consumer_packet_artifact_provenance.consumer_auth_user_id = excluded.consumer_auth_user_id
      and consumer_packet_artifact_provenance.matter_id = excluded.matter_id
      and consumer_packet_artifact_provenance.entitlement_source = excluded.entitlement_source
      and consumer_packet_artifact_provenance.verification_hash is distinct from excluded.verification_hash;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact || case
          when i.artifact_refs_json ? 'attribution'
            then jsonb_build_object('attribution', i.artifact_refs_json -> 'attribution')
          else '{}'::jsonb
        end,
        packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;

commit;
