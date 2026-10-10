begin;

-- A retry belongs to one temporary screening. This adds no participant owner,
-- benefit, financial entitlement, or second screening record store.
alter table public.screening_sessions add column if not exists entry_request_hash text;
alter table public.screening_sessions add column if not exists entry_request_fingerprint text;
create unique index if not exists screening_sessions_entry_request_unique on public.screening_sessions(entry_request_hash) where entry_request_hash is not null;

create or replace function public.rcap_service_claim_program_screening(
 p_partner_slug text,p_jurisdiction text,p_mode text,p_request_hash text,
 p_code_hash text default null,p_clinic_redemption text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare fingerprint text; existing public.screening_sessions%rowtype; result jsonb; code public.partner_access_codes%rowtype;
begin
 if p_request_hash !~ '^[a-f0-9]{64}$' or p_request_hash is null or p_mode is null or p_mode not in ('ordinary','code','clinic') or (p_mode='clinic' and (p_clinic_redemption is null or p_clinic_redemption !~ '^[a-f0-9]{64}$')) or (p_mode='code' and (p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$')) or (p_mode<>'clinic' and p_clinic_redemption is not null) or (p_mode<>'code' and p_code_hash is not null) then raise exception 'invalid_screening_request' using errcode='22023';end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(p_partner_slug,p_jurisdiction,p_mode,p_code_hash,p_clinic_redemption)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('rcap-screening-entry:'||p_request_hash,0));
 select * into existing from public.screening_sessions where entry_request_hash=p_request_hash;
 if found then
  if existing.entry_request_fingerprint is distinct from fingerprint then raise exception 'screening_request_conflict' using errcode='PT409';end if;
  if not public.rcap_partner_activation_for_launch(p_partner_slug) or p_jurisdiction<>all(public.rcap_program_screening_jurisdictions(p_partner_slug)) then return jsonb_build_object('ok',false,'reason','partner_inactive');end if;
  if existing.created_at<=now()-interval '8 hours' then return jsonb_build_object('ok',false,'reason','expired');end if;
  if existing.partner_access_code_id is not null then
   select * into code from public.partner_access_codes where id=existing.partner_access_code_id and partner_slug=p_partner_slug;
   if not found or not code.is_active then return jsonb_build_object('ok',false,'reason','inactive');end if;
   if code.starts_at>now() or code.expires_at<=now() then return jsonb_build_object('ok',false,'reason','expired');end if;
  end if;
  if p_mode='clinic' and not exists(select 1 from public.clinic_event_access_redemptions r join public.clinic_events e on e.id=r.event_id
    where r.redemption_nonce_hash=p_clinic_redemption and r.redeemed_at>now()-interval '8 hours' and e.partner_slug=p_partner_slug and e.jurisdiction=p_jurisdiction and e.status='published' and e.starts_at<=now() and e.ends_at>now()) then return jsonb_build_object('ok',false,'reason','partner_inactive');end if;
  return jsonb_build_object('ok',true,'session_id',existing.session_id,'benefit_active',existing.partner_benefit_active,'attribution_source',existing.attribution_source,'campaign_name',existing.campaign_name,'code_id',existing.partner_access_code_id);
 end if;
 if p_mode='code' then
  select to_jsonb(r) into result from public.claim_partner_screening_session(p_partner_slug,p_jurisdiction,p_code_hash) r;
 else
  if p_mode='ordinary' and p_clinic_redemption is not null then raise exception 'invalid_screening_request' using errcode='22023';end if;
  select to_jsonb(r) into result from public.claim_rcap_screening_session(p_partner_slug,p_jurisdiction,p_clinic_redemption) r;
 end if;
 if (result->>'ok')::boolean then
  update public.screening_sessions set entry_request_hash=p_request_hash,entry_request_fingerprint=fingerprint where session_id=(result->>'session_id')::uuid;
 end if;
 return result;
end $$;
revoke all on function public.rcap_service_claim_program_screening(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.rcap_service_claim_program_screening(text,text,text,text,text,text) to service_role;

-- Replaying the same bounded consent cannot create a second assistance grant
-- or extend an existing grant's expiry. All original permission guards remain.
do $migration$
declare fn regprocedure; definition text; anchor text;
begin
 fn:='public.clinic_start_assisted_session(uuid,uuid,uuid,uuid,text,text,text,timestamptz,integer)'::regprocedure;
 definition:=pg_get_functiondef(fn);
 if position('rcap-assistance-retry:' in definition)=0 then
  definition:=replace(definition,'declare v_id uuid;','declare v_id uuid; previous_session public.clinic_assisted_sessions%rowtype;');
  anchor:='  insert into public.clinic_assisted_sessions(';
  if position(anchor in definition)=0 then raise exception 'clinic consent retry anchor changed';end if;
  execute replace(definition,anchor,$guard$  perform pg_advisory_xact_lock(hashtextextended('rcap-assistance-retry:'||lower(p_handoff_token_hash),0));
  select * into previous_session from public.clinic_assisted_sessions where handoff_token_hash=lower(p_handoff_token_hash);
  if found then
   if previous_session.event_id is distinct from p_event_id or previous_session.event_staff_id is distinct from p_event_staff_id
    or previous_session.participant_user_id is distinct from p_participant_user_id or previous_session.screening_session_id is distinct from p_screening_session_id
    or previous_session.device_nonce_hash is distinct from lower(p_device_nonce_hash) or previous_session.consent_version is distinct from trim(p_consent_version) then raise exception 'clinic_request_conflict' using errcode='PT409';end if;
   if previous_session.status not in ('active','handed_off') or previous_session.expires_at<=now() then raise exception 'clinic_session_ended' using errcode='55000';end if;
   return previous_session.id;
  end if;
$guard$||anchor);
 end if;
end $migration$;
commit;
