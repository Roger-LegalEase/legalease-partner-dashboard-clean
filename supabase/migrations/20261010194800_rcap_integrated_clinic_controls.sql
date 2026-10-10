begin;

-- Legal Aid is an optional module. Its absence must not break standard clinics.
create or replace function public.rcap_program_legal_aid_available(p_slug text) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare available boolean;
begin
 if to_regclass('public.legal_aid_policy_profiles') is null then return false;end if;
 execute 'select exists(select 1 from public.legal_aid_policy_profiles where partner_slug=$1 and status=''approved'')' into available using p_slug;
 return available;
end $$;
revoke all on function public.rcap_program_legal_aid_available(text) from public,anon,authenticated;
grant execute on function public.rcap_program_legal_aid_available(text) to service_role;

-- Read the same policy used by event creation. This projects choices; it does
-- not grant event, participant, or financial authority.
create or replace function public.rcap_service_clinic_program_options(p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare r record; s jsonb; d jsonb; funding jsonb; result jsonb:='[]'; internal_actor boolean;
begin
 internal_actor:=exists(select 1 from public.partner_users where auth_user_id=p_actor and role='internal_admin' and partner_slug is null and status='active');
 if not internal_actor and not exists(select 1 from public.partner_users where auth_user_id=p_actor and role='partner_admin' and status='active') then
  raise exception 'clinic_event_forbidden' using errcode='42501';
 end if;
 for r in select pr.partner_slug,coalesce(pr.organization_name,pr.partner_name) as name,pr.service_area,coalesce(pr.target_state,pr.state) as fallback,
   w.id as workspace_id,w.rcap_policy_version from public.partner_records pr left join public.partner_onboarding w on w.partner_slug=pr.partner_slug
   where internal_actor or exists(select 1 from public.partner_users u where u.auth_user_id=p_actor and u.partner_slug=pr.partner_slug and u.role='partner_admin' and u.status='active')
   order by coalesce(pr.organization_name,pr.partner_name),pr.partner_slug
 loop
  s:=case when r.workspace_id is not null then public.rcap_program_policy_source(r.workspace_id) else '{}'::jsonb end;
  d:=null; funding:=null;
  if r.rcap_policy_version='rcap2.2' then
   d:=public.rcap_service_evaluate_program(r.partner_slug,p_actor,'create_clinic');
   funding:=public.rcap_service_evaluate_program(r.partner_slug,p_actor,'issue_sponsored_packet');
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('slug',r.partner_slug,'name',r.name,
   'geography',coalesce(s#>>'{geography_audience_language_accessibility,service_area_description}',r.service_area,''),
   'jurisdictions',coalesce(s#>'{geography_audience_language_accessibility,jurisdictions}',case when r.fallback is not null then jsonb_build_array(r.fallback) else '[]'::jsonb end),
   'canCreate',case when d is not null then (d->>'allowed')::boolean else r.fallback is not null end,
   'creationIssue',case when d is not null and not (d->>'allowed')::boolean then d#>>'{blockers,0,label}' when d is null and r.fallback is null then 'Configure the program jurisdiction before creating a clinic.' else null end,
   'canSponsor',coalesce((funding->>'allowed')::boolean,false),
   'legalAidAvailable',public.rcap_program_legal_aid_available(r.partner_slug)));
 end loop;
 return result;
end $$;
revoke all on function public.rcap_service_clinic_program_options(uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_clinic_program_options(uuid) to service_role;

-- Preserve the canonical functions and their latest policy guards. A stable
-- client event slug/code hash identifies a retry, never a second mutation.
do $migration$
declare fn regprocedure; definition text; anchor text; inserted text;
begin
 fn:='public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer,text)'::regprocedure;
 definition:=pg_get_functiondef(fn);
 if position('clinic-create:' in definition)>0 then return;end if;
 definition:=replace(definition,'declare v_id uuid;','declare v_id uuid; existing_event public.clinic_events%rowtype;');
 anchor:='  insert into public.clinic_events(';
 inserted:=$guard$  perform pg_advisory_xact_lock(hashtextextended('clinic-create:'||lower(trim(p_public_slug)),0));
  select * into existing_event from public.clinic_events where public_slug=lower(trim(p_public_slug));
  if found then
   if existing_event.partner_slug is distinct from p_partner_slug or existing_event.created_by is distinct from p_actor_user_id
    or existing_event.name is distinct from trim(p_name) or existing_event.starts_at is distinct from p_starts_at or existing_event.ends_at is distinct from p_ends_at
    or existing_event.timezone is distinct from trim(p_timezone) or existing_event.location_name is distinct from trim(p_location_name)
    or existing_event.geography is distinct from trim(p_geography) or existing_event.jurisdiction is distinct from p_jurisdiction
    or existing_event.capacity is distinct from p_capacity or existing_event.sponsorship_allocation is distinct from p_sponsorship_allocation then
     raise exception 'clinic_request_conflict' using errcode='PT409';
   end if;
   return existing_event.id;
  end if;
$guard$;
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then raise exception 'clinic creation guard anchor changed';end if;
 execute replace(definition,anchor,inserted||anchor);

 fn:='public.clinic_create_access_code(uuid,uuid,text,text,integer,timestamptz,timestamptz)'::regprocedure;
 definition:=pg_get_functiondef(fn);
 definition:=replace(definition,'declare v_partner_slug text; v_id uuid;','declare v_partner_slug text; v_id uuid; existing_code public.clinic_event_access_codes%rowtype;');
 anchor:='  insert into public.clinic_event_access_codes(';
 inserted:=$guard$  perform pg_advisory_xact_lock(hashtextextended('clinic-code:'||p_event_id::text||':'||lower(p_code_hash),0));
  select * into existing_code from public.clinic_event_access_codes where event_id=p_event_id and code_hash=lower(p_code_hash);
  if found then
   if existing_code.created_by is distinct from p_actor_user_id or existing_code.max_uses is distinct from p_max_uses
    or existing_code.starts_at is distinct from p_starts_at or existing_code.expires_at is distinct from p_expires_at then
     raise exception 'clinic_request_conflict' using errcode='PT409';
   end if;
   if not existing_code.is_active then raise exception 'clinic_code_inactive' using errcode='55000';end if;
   return existing_code.id;
  end if;
$guard$;
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then raise exception 'clinic code guard anchor changed';end if;
 execute replace(definition,anchor,inserted||anchor);
end $migration$;

-- Shared readiness projection: the event console and publication transaction
-- use the same remaining condition. This creates no staff or funding authority.
create or replace function public.rcap_clinic_open_issue(p_event uuid) returns text
language plpgsql stable security invoker set search_path='' as $$
declare e public.clinic_events%rowtype;
begin
 select * into e from public.clinic_events where id=p_event;
 if not found then return 'event_missing';end if;
 if e.ends_at<=now() then return 'event_ended';end if;
 if to_jsonb(e)->>'experience'='legal_aid' then return null;end if;
 if not exists(select 1 from public.clinic_event_staff s join public.partner_users u on u.id=s.partner_user_id
   where s.event_id=e.id and s.status='approved' and 'assist'=any(s.permissions) and u.status='active' and u.partner_slug=e.partner_slug) then return 'staff_required';end if;
 if not exists(select 1 from public.clinic_event_access_codes c where c.event_id=e.id and c.is_active
   and (c.starts_at is null or c.starts_at<=now()) and (c.expires_at is null or c.expires_at>now())
   and (c.max_uses is null or c.uses_count<c.max_uses)) then return 'code_required';end if;
 if (select count(*) from public.clinic_event_access_redemptions where event_id=e.id)>=e.capacity then return 'event_full';end if;
 return null;
end $$;
revoke all on function public.rcap_clinic_open_issue(uuid) from public,anon,authenticated;
grant execute on function public.rcap_clinic_open_issue(uuid) to service_role;

do $migration$
declare fn regprocedure; definition text; anchor text;
begin
 fn:='public.clinic_set_event_status(uuid,uuid,text)'::regprocedure;
 definition:=pg_get_functiondef(fn);
 if position('rcap_clinic_open_issue' in definition)=0 then
  definition:=replace(definition,'declare v_event public.clinic_events%rowtype;','declare v_event public.clinic_events%rowtype; opening_issue text;');
  anchor:='  update public.clinic_events set status = p_status where id = p_event_id;';
  if position(anchor in definition)=0 then raise exception 'clinic status guard anchor changed';end if;
  execute replace(definition,anchor,$guard$  if p_status='published' then
   opening_issue:=public.rcap_clinic_open_issue(p_event_id);
   if opening_issue is not null then raise exception '%',('clinic_open_'||opening_issue) using errcode='55000';end if;
  end if;
$guard$||anchor);
 end if;
 -- A retry reuses the same redemption, but it cannot revive expired access.
 fn:='public.clinic_redeem_event_code(text,text,text)'::regprocedure;
 definition:=pg_get_functiondef(fn);
 if position('rcap_integrated_entry_schedule' in definition)=0 then
  anchor:='  select * into v_code from public.clinic_event_access_codes';
  if position(anchor in definition)=0 then raise exception 'clinic entry guard anchor changed';end if;
  definition:=replace(definition,anchor,$guard$  -- rcap_integrated_entry_schedule
  if now()<v_event.starts_at or now()>=v_event.ends_at then return query select 'event_outside_schedule'::text,null::uuid,null::text;return;end if;
$guard$||anchor);
  anchor:='  if exists (select 1 from public.clinic_event_access_redemptions r where r.access_code_id = v_code.id';
  if position(anchor in definition)=0 then raise exception 'clinic redemption guard anchor changed';end if;
  definition:=replace(definition,anchor,$guard$  if not v_code.is_active then return query select 'code_inactive'::text,null::uuid,null::text;return;end if;
  if v_code.starts_at is not null and now()<v_code.starts_at then return query select 'code_not_started'::text,null::uuid,null::text;return;end if;
  if v_code.expires_at is not null and now()>=v_code.expires_at then return query select 'code_expired'::text,null::uuid,null::text;return;end if;
$guard$||anchor);
  execute definition;
 end if;
end $migration$;

-- A staff queue label must describe an existing owned result/artifact, never
-- manufacture verification or packet entitlement.
-- Protected artifact tables deliberately deny direct service-role reads. This
-- service-only projection exposes two booleans; the queue operation authorizes
-- the event before requesting them. It grants no table or browser privilege.
create or replace function public.rcap_clinic_case_materials(p_case uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('saved',exists(select 1 from public.clinic_cases c join public.consumer_briefcase_items m on m.id=c.matter_id and m.user_id=c.participant_user_id where c.id=p_case),
  'packet',exists(select 1 from public.clinic_cases c
   join public.consumer_briefcase_items m on m.id=c.matter_id and m.user_id=c.participant_user_id
   join public.consumer_packet_artifact_provenance a on a.briefcase_item_id=c.matter_id and a.consumer_auth_user_id=c.participant_user_id and a.entitlement_source in ('consumer_payment','partner_sponsorship')
   join public.consumer_packet_verifications v on v.briefcase_item_id=c.matter_id and v.matter_id=a.matter_id and v.consumer_auth_user_id=c.participant_user_id and v.status='verified' and v.verification_hash=a.verification_hash
   join public.packet_render_jobs j on j.id=a.render_job_id and j.status in ('artifact_validated','delivered') and j.delivery_eligibility='eligible' and j.output_storage_path is not null and j.output_sha256 is not null
   where c.id=p_case))
$$;
revoke all on function public.rcap_clinic_case_materials(uuid) from public,anon,authenticated;
grant execute on function public.rcap_clinic_case_materials(uuid) to service_role;
create or replace function public.rcap_clinic_queue_materials(p_cases uuid[]) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(id::text,public.rcap_clinic_case_materials(id)),'{}'::jsonb) from unnest(p_cases) id
$$;
revoke all on function public.rcap_clinic_queue_materials(uuid[]) from public,anon,authenticated;
grant execute on function public.rcap_clinic_queue_materials(uuid[]) to service_role;
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.clinic_transition_case(uuid,uuid,text,uuid,timestamptz)'::regprocedure);
 if position('rcap_clinic_case_materials' in definition)=0 then
  anchor:='  update public.clinic_cases set queue_status=p_queue_status,';
  if position(anchor in definition)=0 then raise exception 'clinic queue guard anchor changed';end if;
  execute replace(definition,anchor,$guard$  if p_queue_status='packet_ready' and not (public.rcap_clinic_case_materials(p_case_id)->>'packet')::boolean then return 'packet_not_prepared';end if;
  if p_queue_status='in_progress' and not (public.rcap_clinic_case_materials(p_case_id)->>'saved')::boolean then return 'result_not_saved';end if;
$guard$||anchor);
 end if;
end $migration$;
-- Follow-up uses the participant's existing, current consent. Ending assistance
-- keeps the audit/history, but removes these cases and notes from active work.
do $migration$
declare definition text; anchor text;
begin
 definition:=pg_get_functiondef('public.clinic_upsert_follow_up(uuid,uuid,uuid,uuid,timestamptz,text,text,text,text)'::regprocedure);
 if position('clinic_follow_up_consent_required' in definition)=0 then
  anchor:='  if p_owner_event_staff_id is not null and not exists(';
  if position(anchor in definition)=0 then raise exception 'follow-up consent anchor changed';end if;
  execute replace(definition,anchor,$guard$  if not exists(select 1 from public.clinic_assisted_sessions s where s.id=v_case.assisted_session_id
    and s.event_id=v_case.event_id and s.participant_user_id=v_case.participant_user_id
    and s.status in ('active','handed_off') and s.expires_at>now()) then raise exception 'clinic_follow_up_consent_required' using errcode='42501';end if;
$guard$||anchor);
 end if;
 definition:=pg_get_functiondef('public.clinic_get_follow_ups(uuid,uuid)'::regprocedure);
 if position('s.id=c.assisted_session_id' in definition)=0 then
  anchor:='  where f.event_id=p_event_id';
  if position(anchor in definition)=0 then raise exception 'follow-up visibility anchor changed';end if;
  execute replace(definition,anchor,anchor||$guard$ and exists(select 1 from public.clinic_assisted_sessions s where s.id=c.assisted_session_id
    and s.event_id=c.event_id and s.participant_user_id=c.participant_user_id and s.status in ('active','handed_off') and s.expires_at>now())$guard$);
 end if;
end $migration$;

create or replace function public.rcap_service_clinic_follow_up_cases(p_event uuid,p_actor uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if not public.clinic_actor_can_event(p_event,p_actor,'follow_up') then raise exception 'clinic_follow_up_forbidden' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'jurisdiction',c.jurisdiction,'queueStatus',c.queue_status) order by c.last_activity_at desc),'[]'::jsonb)
  from public.clinic_cases c join public.clinic_assisted_sessions s on s.id=c.assisted_session_id and s.event_id=c.event_id and s.participant_user_id=c.participant_user_id
  where c.event_id=p_event and s.status in ('active','handed_off') and s.expires_at>now());
end $$;
revoke all on function public.rcap_service_clinic_follow_up_cases(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_clinic_follow_up_cases(uuid,uuid) to service_role;

alter table public.clinic_follow_ups add column if not exists creation_request_id uuid;
alter table public.clinic_follow_ups add column if not exists creation_request_hash text;
create unique index if not exists clinic_follow_up_creation_request on public.clinic_follow_ups(created_by,creation_request_id) where creation_request_id is not null;
create or replace function public.rcap_service_save_clinic_follow_up(
 p_event_id uuid,p_follow_up_id uuid,p_case_id uuid,p_actor_user_id uuid,p_owner_event_staff_id uuid,p_due_at timestamptz,
 p_status text,p_communication_state text,p_participant_safe_message text,p_internal_notes text,p_request_id uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.clinic_follow_ups%rowtype; fingerprint text; result uuid;
begin
 if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'follow_up') then raise exception 'clinic_follow_up_forbidden' using errcode='42501';end if;
 if not exists(select 1 from public.clinic_cases c join public.clinic_assisted_sessions s on s.id=c.assisted_session_id and s.event_id=c.event_id and s.participant_user_id=c.participant_user_id
  where c.id=p_case_id and c.event_id=p_event_id and s.status in ('active','handed_off') and s.expires_at>now()) then raise exception 'clinic_follow_up_consent_required' using errcode='42501';end if;
 if p_follow_up_id is not null then
  select * into previous from public.clinic_follow_ups where id=p_follow_up_id and event_id=p_event_id and clinic_case_id=p_case_id for update;
  if not found then raise exception 'clinic_follow_up_not_found' using errcode='P0002';end if;
  -- The retained completion action never edits old messages, contact state or notes.
  if p_status is distinct from 'completed' or previous.owner_event_staff_id is distinct from p_owner_event_staff_id or previous.due_at is distinct from p_due_at
   or previous.communication_state is distinct from p_communication_state or coalesce(previous.participant_safe_message,'') is distinct from btrim(coalesce(p_participant_safe_message,''))
   or coalesce(previous.internal_notes,'') is distinct from btrim(coalesce(p_internal_notes,'')) then raise exception 'clinic_follow_up_changed' using errcode='PT409';end if;
  if previous.status='completed' then return previous.id;end if;
 else
  if p_request_id is null or p_communication_state is distinct from 'draft' or p_status is distinct from 'open' then raise exception 'clinic_follow_up_invalid_draft' using errcode='22023';end if;
  fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_event_id,p_case_id,p_owner_event_staff_id,p_due_at,p_status,p_communication_state,btrim(coalesce(p_participant_safe_message,'')),btrim(coalesce(p_internal_notes,'')))::text,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('clinic-follow-up:'||p_actor_user_id::text||':'||p_request_id::text,0));
  select * into previous from public.clinic_follow_ups where created_by=p_actor_user_id and creation_request_id=p_request_id;
  if found then
   if previous.creation_request_hash is distinct from fingerprint then raise exception 'clinic_follow_up_changed' using errcode='PT409';end if;
   return previous.id;
  end if;
 end if;
 result:=public.clinic_upsert_event_follow_up(p_event_id,p_follow_up_id,p_case_id,p_actor_user_id,p_owner_event_staff_id,p_due_at,p_status,p_communication_state,p_participant_safe_message,p_internal_notes);
 if p_follow_up_id is null then update public.clinic_follow_ups set creation_request_id=p_request_id,creation_request_hash=fingerprint where id=result;end if;
 return result;
end $$;
revoke all on function public.rcap_service_save_clinic_follow_up(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_save_clinic_follow_up(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text,text,text,uuid) to service_role;
-- Report only completed sponsored artifacts for this authorized event. Private
-- provenance remains inaccessible as a table; no participant data is returned.
create or replace function public.rcap_service_clinic_generated_packets(p_event uuid,p_actor uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.clinic_actor_can_event(p_event,p_actor,'reporting') then raise exception 'clinic_reporting_forbidden' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('briefcase_item_id',a.briefcase_item_id)),'[]'::jsonb)
 from public.consumer_packet_artifact_provenance a
 join public.consumer_briefcase_items m on m.id=a.briefcase_item_id and m.user_id=a.consumer_auth_user_id
 join public.packet_render_jobs j on j.id=a.render_job_id and j.status in ('artifact_validated','delivered') and j.delivery_eligibility='eligible' and j.output_storage_path is not null and j.output_sha256 is not null
 where a.entitlement_source='partner_sponsorship' and (
  exists(select 1 from public.clinic_cases c where c.event_id=p_event and c.matter_id=a.briefcase_item_id and c.participant_user_id=a.consumer_auth_user_id)
  or exists(select 1 from public.clinic_packet_funding f where f.event_id=p_event and f.briefcase_item_id=a.briefcase_item_id)));
end $$;
revoke all on function public.rcap_service_clinic_generated_packets(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_clinic_generated_packets(uuid,uuid) to service_role;
commit;
