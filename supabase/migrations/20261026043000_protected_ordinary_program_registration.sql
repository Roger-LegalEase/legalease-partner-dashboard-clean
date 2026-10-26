-- Normal Start registers only the immutable internal Acceptance scope, in the same publication transaction.
BEGIN;
DO $prerequisites$ BEGIN
 IF to_regprocedure('public.rcap_service_stage_program_launch(text,uuid,uuid,bigint,text,jsonb,uuid)') IS NULL OR to_regprocedure('public.sponsored_packet_route_for_source(text,uuid,uuid,uuid)') IS NULL OR to_regclass('public.ordinary_sponsored_packet_routes') IS NULL THEN RAISE EXCEPTION 'Normal program and ordinary sponsorship source prerequisites are absent';END IF;
END $prerequisites$;
create function public.rcap_service_register_ordinary_sponsored_route(p_slug text,p_actor uuid,p_operation uuid,p_version bigint,p_hash text,p_authority uuid)
returns boolean language plpgsql security definer set search_path='' as $registration$
declare w public.partner_onboarding%rowtype; prepared public.rcap_launch_operation_events%rowtype; release_binding jsonb; preview_binding jsonb; d jsonb; registration jsonb;
begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 if p_slug<>'legalease-ordinary-qa-20261024' or w.operating_model<>'legalease_managed' or w.rcap_policy_version<>'rcap2.2'
  or w.status in ('live','paused','closed') or w.landing_page_ready or p_version is null or w.aggregate_version<>p_version then raise exception 'ordinary registration source changed' using errcode='PT409';end if;
 select * into strict prepared from public.rcap_launch_operation_events where workspace_id=w.id and partner_slug=p_slug and operation_id=p_operation
  and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real';
 if prepared.created_at>now() or prepared.created_at<=now()-interval '15 minutes' or prepared.evidence->>'workspaceVersion' is distinct from p_version::text
  or coalesce(prepared.evidence->>'releaseAuthorization','') ~ '^release:[a-f0-9]{40}$'
  or exists(select 1 from public.rcap_launch_operation_events e where e.operation_id=p_operation and e.step in ('held','failed','complete','publication_staged')) then raise exception 'ordinary registration requires current exact prepared Preview operation';end if;
 if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text then raise exception 'exact release and authority binding required';end if;
 if coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then
  release_binding:=(prepared.evidence->>'releaseAuthorization')::jsonb;
  preview_binding:=prepared.evidence->'previewRelease';
  if jsonb_typeof(release_binding) is distinct from 'object' or jsonb_typeof(preview_binding) is distinct from 'object' then raise exception 'exact Preview release binding required';end if;
  if (select array_agg(key order by key) from jsonb_object_keys(release_binding) key) is distinct from array['adminAuthUserId','applicationSha','partnerSlug','projectId','schema','supabaseProjectRef']::text[]
   or (select array_agg(key order by key) from jsonb_object_keys(preview_binding) key) is distinct from array['adminAuthUserId','applicationSha','deploymentId','origin','partnerSlug','projectId','supabaseProjectRef']::text[]
   or exists(select 1 from jsonb_each(release_binding) e where jsonb_typeof(e.value)<>'string')
   or exists(select 1 from jsonb_each(preview_binding) e where jsonb_typeof(e.value)<>'string')
   or release_binding->>'schema' is distinct from 'rcap-partner-acceptance-launch/v1'
   or coalesce(release_binding->>'applicationSha','') !~ '^[a-f0-9]{40}$'
   or release_binding->>'projectId' is distinct from 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV'
   or release_binding->>'supabaseProjectRef' is distinct from 'hyflxnlhpmiqxvvcoiia'
   or p_slug is distinct from 'legalease-ordinary-qa-20261024'
   or release_binding->>'partnerSlug' is distinct from p_slug
   or release_binding->>'adminAuthUserId' is distinct from p_actor::text
   or (preview_binding-'deploymentId'-'origin') is distinct from (release_binding-'schema')
   or coalesce(preview_binding->>'deploymentId','') !~ '^dpl_[A-Za-z0-9]+$'
   or coalesce(preview_binding->>'origin','') !~ '^https://[a-z0-9-]+[.]vercel[.]app$'
  then raise exception 'exact Preview release binding required';end if;
 end if;

 registration:=prepared.evidence->'ordinarySponsoredRoute';
 if registration is distinct from '{"schema":"rcap-ordinary-sponsored-route-registration/v1","decisionId":"MS-NONCONV-ORDINARY-INTERNAL-QA-20261024","decisionSha256":"316a211790dbdaca3bd260beac0a854076ebed618390b339b1d68b6a40381ebb","routeKey":"MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal","packetSpecificationSha256":"23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126","participantScopeSha256":"da8d2556ebe1c462a3892d4f17799458724ab301a94323c1e1eccaca48aae038","partnerSlug":"legalease-ordinary-qa-20261024"}'::jsonb then raise exception 'exact approved ordinary registration required';end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 perform 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null for update;
 d:=public.rcap_service_evaluate_program(p_slug,p_actor,'publish_partner_page');
 if not coalesce((d->>'allowed')::boolean,false) or d->>'authorityId' is distinct from p_authority::text
  or prepared.evidence->'snapshot'->>'scopeHash' is distinct from d->>'scopeHash'
  or prepared.evidence->'snapshot'->>'materialsHash' is distinct from d->>'materialsHash'
  or public.rcap_program_policy_source(w.id)#>'{geography_audience_language_accessibility,jurisdictions}' is distinct from '["MS"]'::jsonb
  or public.rcap_program_policy_source(w.id)#>>'{program_goals,service_mode}' is distinct from 'sponsored_packets'
  or not public.rcap_program_funding_valid(w.id)
  or not exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed=1 and screenings_used=0)
  or not exists(select 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and packet_cap=1 and effective_at<=now() and expires_at is null)
 then raise exception 'current ordinary operating materials and one-unit allocation required';end if;
 perform 1 from public.sponsored_packet_render_routes where route_key=registration->>'routeKey' and packet_specification_sha256=registration->>'packetSpecificationSha256' and jurisdiction='MS' and active for share;
 if not found then raise exception 'canonical ordinary route source changed';end if;
 if exists(select 1 from public.ordinary_sponsored_packet_routes where route_key=registration->>'routeKey' and partner_slug=p_slug and (packet_specification_sha256 is distinct from registration->>'packetSpecificationSha256' or not active)) then raise exception 'existing ordinary registration conflicts';end if;
 insert into public.ordinary_sponsored_packet_routes(route_key,partner_slug,packet_specification_sha256,active)
 values(registration->>'routeKey',p_slug,registration->>'packetSpecificationSha256',true)
 on conflict(route_key,partner_slug) do nothing;
 return true;
end $registration$;
revoke all on function public.rcap_service_register_ordinary_sponsored_route(text,uuid,uuid,bigint,text,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.rcap_service_register_ordinary_sponsored_route(text,uuid,uuid,bigint,text,uuid) to service_role;

DO $stage_patch$ DECLARE definition text;BEGIN
 definition:=pg_get_functiondef('public.rcap_service_stage_program_launch(text,uuid,uuid,bigint,text,jsonb,uuid)'::regprocedure);
 IF (length(definition)-length(replace(definition,$old_stage_0$delegated public.partner_onboarding_launch_approvals%rowtype;$old_stage_0$,'')))/length($old_stage_0$delegated public.partner_onboarding_launch_approvals%rowtype;$old_stage_0$)<>1 THEN RAISE EXCEPTION 'Unrecognized current normal stage boundary 0; preserve later guards';END IF;
 definition:=replace(definition,$old_stage_0$delegated public.partner_onboarding_launch_approvals%rowtype;$old_stage_0$,$new_stage_0$delegated public.partner_onboarding_launch_approvals%rowtype; release_binding jsonb; preview_binding jsonb;$new_stage_0$);
 IF (length(definition)-length(replace(definition,$old_stage_1$ if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text or coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then raise exception 'exact release and authority binding required';end if;
$old_stage_1$,'')))/length($old_stage_1$ if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text or coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then raise exception 'exact release and authority binding required';end if;
$old_stage_1$)<>1 THEN RAISE EXCEPTION 'Unrecognized current normal stage boundary 1; preserve later guards';END IF;
 definition:=replace(definition,$old_stage_1$ if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text or coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then raise exception 'exact release and authority binding required';end if;
$old_stage_1$,$new_stage_1$ if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text then raise exception 'exact release and authority binding required';end if;
 if coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then
  release_binding:=(prepared.evidence->>'releaseAuthorization')::jsonb;
  preview_binding:=prepared.evidence->'previewRelease';
  if jsonb_typeof(release_binding) is distinct from 'object' or jsonb_typeof(preview_binding) is distinct from 'object' then raise exception 'exact Preview release binding required';end if;
  if (select array_agg(key order by key) from jsonb_object_keys(release_binding) key) is distinct from array['adminAuthUserId','applicationSha','partnerSlug','projectId','schema','supabaseProjectRef']::text[]
   or (select array_agg(key order by key) from jsonb_object_keys(preview_binding) key) is distinct from array['adminAuthUserId','applicationSha','deploymentId','origin','partnerSlug','projectId','supabaseProjectRef']::text[]
   or exists(select 1 from jsonb_each(release_binding) e where jsonb_typeof(e.value)<>'string')
   or exists(select 1 from jsonb_each(preview_binding) e where jsonb_typeof(e.value)<>'string')
   or release_binding->>'schema' is distinct from 'rcap-partner-acceptance-launch/v1'
   or coalesce(release_binding->>'applicationSha','') !~ '^[a-f0-9]{40}$'
   or release_binding->>'projectId' is distinct from 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV'
   or release_binding->>'supabaseProjectRef' is distinct from 'hyflxnlhpmiqxvvcoiia'
   or p_slug is distinct from 'legalease-ordinary-qa-20261024'
   or release_binding->>'partnerSlug' is distinct from p_slug
   or release_binding->>'adminAuthUserId' is distinct from p_actor::text
   or (preview_binding-'deploymentId'-'origin') is distinct from (release_binding-'schema')
   or coalesce(preview_binding->>'deploymentId','') !~ '^dpl_[A-Za-z0-9]+$'
   or coalesce(preview_binding->>'origin','') !~ '^https://[a-z0-9-]+[.]vercel[.]app$'
  then raise exception 'exact Preview release binding required';end if;
 end if;
$new_stage_1$);
 IF (length(definition)-length(replace(definition,$old_stage_2$ update public.partner_records set onboarding_status='approved'$old_stage_2$,'')))/length($old_stage_2$ update public.partner_records set onboarding_status='approved'$old_stage_2$)<>1 THEN RAISE EXCEPTION 'Unrecognized current normal stage boundary 2; preserve later guards';END IF;
 definition:=replace(definition,$old_stage_2$ update public.partner_records set onboarding_status='approved'$old_stage_2$,$new_stage_2$ if preview_binding is not null then perform public.rcap_service_register_ordinary_sponsored_route(p_slug,p_actor,p_operation,p_version,p_hash,p_authority);end if;
 update public.partner_records set onboarding_status='approved'$new_stage_2$);
 EXECUTE definition;
END $stage_patch$;
COMMIT;
