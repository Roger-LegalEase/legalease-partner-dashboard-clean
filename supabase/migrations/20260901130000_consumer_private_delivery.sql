-- Short-lived, exact-matter grants for authenticated consumer artifact delivery.
-- The storage bucket remains private; a grant is a second factor bound to the
-- already-authenticated owner, item, matter and immutable artifact revision.

begin;

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

commit;
