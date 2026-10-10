-- Bind an anonymous Clinic entry to its actual assisted handoff, or close it
-- without inventing consent. Start and pre-consent exit serialize on that entry.
alter table public.clinic_event_access_redemptions
  add column reset_binding_supported boolean not null default false,
  add column assisted_session_id uuid references public.clinic_assisted_sessions(id) on delete restrict,
  add column closed_at timestamptz,
  add column closed_by uuid references auth.users(id) on delete restrict,
  add constraint clinic_entry_close_pair check ((closed_at is null) = (closed_by is null));
-- Historical entries lack exact handoff provenance; do not infer it from the
-- latest participant, event, or session. Existing assisted recovery still works.
-- Corrected entry responses opt in explicitly; old deployments remain false.

-- Mark provenance in the same transaction as redemption so a lost response or
-- failed write cannot leave a newly accepted entry without its reset binding.
create function public.clinic_redeem_event_code_with_reset(p_public_slug text,p_code_hash text,p_redemption_nonce_hash text)
returns table(outcome text,event_id uuid) language plpgsql security invoker set search_path = '' as $$
declare result record;
begin
  select * into result from public.clinic_redeem_event_code(p_public_slug,p_code_hash,p_redemption_nonce_hash);
  if result.outcome='redeemed' then
    update public.clinic_event_access_redemptions set reset_binding_supported=true
      where redemption_nonce_hash=p_redemption_nonce_hash and clinic_event_access_redemptions.event_id=result.event_id;
  end if;
  return query select result.outcome::text,result.event_id::uuid;
end $$;

create function public.clinic_start_assisted_session_for_entry(
  p_entry_hash text, p_event_id uuid, p_event_staff_id uuid, p_participant_user_id uuid,
  p_screening_session_id uuid, p_handoff_token_hash text, p_device_nonce_hash text,
  p_consent_version text, p_consented_at timestamptz, p_ttl_minutes integer default 30
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare entry public.clinic_event_access_redemptions%rowtype; session_id uuid;
begin
  select * into entry from public.clinic_event_access_redemptions
    where redemption_nonce_hash=p_entry_hash and event_id=p_event_id for update;
  if not found or entry.closed_at is not null or entry.redeemed_at<=now()-interval '8 hours'
    then raise exception 'clinic_entry_unavailable' using errcode='42501'; end if;
  if entry.assisted_session_id is not null and not exists (
    select 1 from public.clinic_assisted_sessions s where s.id=entry.assisted_session_id
      and s.handoff_token_hash=lower(p_handoff_token_hash)
      and s.participant_user_id=p_participant_user_id
  ) then raise exception 'clinic_entry_already_used' using errcode='42501'; end if;
  session_id:=public.clinic_start_assisted_session(p_event_id,p_event_staff_id,p_participant_user_id,
    p_screening_session_id,p_handoff_token_hash,p_device_nonce_hash,p_consent_version,p_consented_at,p_ttl_minutes);
  update public.clinic_event_access_redemptions set assisted_session_id=session_id
    where id=entry.id;
  return session_id;
end $$;

create function public.clinic_close_unassisted_entry(p_entry_hash text,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare entry public.clinic_event_access_redemptions%rowtype;
begin
  if p_actor is null
    then raise exception 'clinic_participant_required' using errcode='42501'; end if;
  select * into entry from public.clinic_event_access_redemptions
    where redemption_nonce_hash=p_entry_hash for update;
  if not found or not entry.reset_binding_supported or entry.assisted_session_id is not null
    or entry.redeemed_at<=now()-interval '8 hours'
    then raise exception 'clinic_handoff_required' using errcode='42501'; end if;
  if entry.closed_by is not null and entry.closed_by<>p_actor
    then raise exception 'clinic_entry_owner_mismatch' using errcode='42501'; end if;
  if entry.closed_at is null then
    update public.clinic_event_access_redemptions set closed_at=now(),closed_by=p_actor
      where id=entry.id returning * into entry;
    insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id,metadata)
      values(entry.event_id,p_actor,'unassisted_entry_closed','access_code',entry.access_code_id,
        jsonb_build_object('redemption_id',entry.id,'assistance_created',false));
  end if;
  return jsonb_build_object('closed_at',entry.closed_at,'redeemed_at',entry.redeemed_at,'event_id',entry.event_id);
end $$;
revoke all on function public.clinic_start_assisted_session_for_entry(text,uuid,uuid,uuid,uuid,text,text,text,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.clinic_close_unassisted_entry(text,uuid) from public,anon,authenticated;
grant execute on function public.clinic_start_assisted_session_for_entry(text,uuid,uuid,uuid,uuid,text,text,text,timestamptz,integer),
  public.clinic_close_unassisted_entry(text,uuid) to service_role;
revoke all on function public.clinic_redeem_event_code_with_reset(text,text,text) from public,anon,authenticated;
grant execute on function public.clinic_redeem_event_code_with_reset(text,text,text) to service_role;
notify pgrst,'reload schema';
