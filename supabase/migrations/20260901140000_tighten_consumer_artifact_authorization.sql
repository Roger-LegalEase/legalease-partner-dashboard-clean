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

begin;

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

commit;
