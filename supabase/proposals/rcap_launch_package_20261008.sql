-- PROPOSED ONLY. Do not run in Production. Requires owner authorization for
-- the narrow new service RPC grants. Reuses existing version and review tables.
begin;
create or replace function public.rcap_service_review_launch_package(
  p_partner_slug text, p_actor_user_id uuid, p_request_id uuid,
  p_workspace_version bigint, p_versions jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_item jsonb;
  v_version public.partner_onboarding_artifact_versions%rowtype;
  v_count integer;
begin
  if not exists(select 1 from public.partner_users u where u.auth_user_id=p_actor_user_id and u.role='internal_admin' and u.status='active' and u.partner_slug is null) then
    raise exception 'internal_admin_required' using errcode='42501';
  end if;
  select * into v_workspace from public.partner_onboarding where partner_slug=p_partner_slug for update;
  if v_workspace.id is null or v_workspace.aggregate_version <> p_workspace_version then raise exception 'stale_workspace'; end if;
  if p_request_id is null then raise exception 'request_identity_required'; end if;
  if jsonb_typeof(p_versions)<>'array' or jsonb_array_length(p_versions)<>5 then raise exception 'exact_package_required'; end if;
  select count(distinct item->>'id') into v_count from jsonb_array_elements(p_versions) item;
  if v_count<>5 then raise exception 'duplicate_version'; end if;
  if exists(select 1 from public.partner_onboarding_artifact_reviews r where r.workspace_id=v_workspace.id and r.request_id=p_request_id and
    (r.reviewer_user_id<>p_actor_user_id or r.reviewer_type<>'legalease' or r.decision<>'approve' or not exists(select 1 from jsonb_array_elements(p_versions) item where (item->>'id')::uuid=r.artifact_version_id))) then raise exception 'idempotency_payload_conflict'; end if;
  -- Lock and validate the entire package before any review is recorded.
  for v_item in select * from jsonb_array_elements(p_versions) loop
    select v.* into v_version from public.partner_onboarding_artifact_versions v
      join public.partner_onboarding_artifacts a on a.id=v.artifact_id
      where v.id=(v_item->>'id')::uuid and v.workspace_id=v_workspace.id
      and a.current_version_id=v.id and a.artifact_type in ('implementation_brief','operations_escalation_plan','dashboard_user_reporting_matrix','staff_quick_start_guide','co_branded_page_configuration')
      for update of v,a;
    if v_version.id is null or v_version.snapshot_hash<>v_item->>'snapshotHash'
      or v_version.generation_status<>'succeeded' or v_version.approval_status='superseded'
      or v_version.superseded_at is not null or v_version.source_drift_invalidated_at is not null then raise exception 'package_version_changed'; end if;
  end loop;
  for v_item in select * from jsonb_array_elements(p_versions) loop
    perform public.rcap_service_review_onboarding_artifact(p_partner_slug,p_actor_user_id,'legalease',(v_item->>'id')::uuid,'approve','Reviewed as part of the exact launch package',null,p_request_id);
  end loop;
  return true;
end; $$;
revoke all on function public.rcap_service_review_launch_package(text,uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.rcap_service_review_launch_package(text,uuid,uuid,bigint,jsonb) to service_role;

create or replace function public.rcap_service_retire_onboarding_artifact(
  p_partner_slug text, p_actor_user_id uuid, p_artifact_version_id uuid,
  p_reason text, p_request_id uuid
) returns table(superseded boolean) language plpgsql security invoker set search_path='' as $$
declare v_workspace uuid; v_artifact uuid;
begin
  if not exists(select 1 from public.partner_users u where u.auth_user_id=p_actor_user_id and u.role='internal_admin' and u.status='active' and u.partner_slug is null) then raise exception 'internal_admin_required' using errcode='42501'; end if;
  if length(btrim(p_reason))<10 or length(p_reason)>2000 or p_request_id is null then raise exception 'specific_reason_required'; end if;
  select v.workspace_id,v.artifact_id into v_workspace,v_artifact from public.partner_onboarding_artifact_versions v join public.partner_onboarding po on po.id=v.workspace_id where v.id=p_artifact_version_id and po.partner_slug=p_partner_slug for update of v,po;
  if v_workspace is null then raise exception 'version_not_found'; end if;
  if exists(select 1 from public.partner_onboarding_artifact_reviews where artifact_version_id=p_artifact_version_id and request_id=p_request_id and (reviewer_user_id<>p_actor_user_id or comments<>'Version retirement: '||btrim(p_reason))) then raise exception 'idempotency_payload_conflict'; end if;
  -- Preserve the actual reviewer, reason and request identity in the existing
  -- append-only review ledger, then retire and clear only this current pointer.
  if not exists(select 1 from public.partner_onboarding_artifact_reviews where artifact_version_id=p_artifact_version_id and request_id=p_request_id) then
    insert into public.partner_onboarding_artifact_reviews(artifact_version_id,workspace_id,reviewer_type,reviewer_user_id,decision,comments,request_id)
      values(p_artifact_version_id,v_workspace,'legalease',p_actor_user_id,'request_changes','Version retirement: '||btrim(p_reason),p_request_id);
  end if;
  perform public.rcap_service_supersede_onboarding_artifact_version(p_partner_slug,p_actor_user_id,p_artifact_version_id);
  update public.partner_onboarding_artifacts set current_version_id=null,lifecycle_status='not_generated' where id=v_artifact and current_version_id=p_artifact_version_id;
  superseded:=true; return next;
end; $$;
revoke all on function public.rcap_service_retire_onboarding_artifact(text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_retire_onboarding_artifact(text,uuid,uuid,text,uuid) to service_role;
commit;
