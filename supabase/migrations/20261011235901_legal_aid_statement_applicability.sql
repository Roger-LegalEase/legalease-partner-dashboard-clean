-- GA-41 indispensable compatibility guard. Draft for the single reviewed
-- release batch; no participant answers or signatures are migrated.
-- Function signatures, statement wording/version/hash, ownership, row locks,
-- existing RLS and service-role-only invocation remain unchanged.
-- The prior app's valid Yes/No calls remain compatible. Rollback may retain
-- these guards safely; never remove uncertainty answers or signature history.
begin;

create or replace function public.legal_aid_sign_intake(
  p_intake_id uuid, p_participant_user_id uuid, p_statement_key text, p_statement_version text,
  p_statement_hash text, p_signer_name text, p_signature_method text, p_signature_data text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  -- Only the applicant signs; an assisting volunteer never becomes the signer.
  if v_intake.participant_user_id is null or v_intake.participant_user_id <> p_participant_user_id then
    raise exception 'legal_aid_signer_mismatch';
  end if;
  if v_intake.status not in ('draft','needs_information') then raise exception 'legal_aid_intake_not_editable'; end if;
  if v_intake.answers_hash is null then raise exception 'legal_aid_answers_required'; end if;
  -- GA-41: evaluate applicability under the same row lock as signing. An
  -- unknown answer remains unknown; it never becomes an assertion of citizenship.
  if p_statement_key = 'citizenship_attestation' and not coalesce(
    v_intake.answers #>> '{is_us_citizen,state}' = 'answered'
    and v_intake.answers #> '{is_us_citizen,value}' in ('"yes"'::jsonb, '["yes"]'::jsonb), false
  ) then raise exception 'legal_aid_statement_not_applicable'; end if;
  if p_statement_key = 'noncitizen_review_acknowledgment' and not coalesce(
    v_intake.answers #>> '{is_us_citizen,state}' = 'unknown'
    or (v_intake.answers #>> '{is_us_citizen,state}' = 'answered'
        and v_intake.answers #> '{is_us_citizen,value}' in ('"no"'::jsonb, '["no"]'::jsonb)), false
  ) then raise exception 'legal_aid_statement_not_applicable'; end if;
  update public.legal_aid_intake_signatures
    set status = 'superseded', superseded_at = now(), superseded_reason = 're_signed'
    where intake_id = p_intake_id and statement_key = p_statement_key and status = 'active';
  insert into public.legal_aid_intake_signatures(
    intake_id, statement_key, statement_version, statement_hash, answers_hash, answers_version,
    signer_user_id, signer_name, signature_method, signature_data
  ) values (
    p_intake_id, p_statement_key, p_statement_version, p_statement_hash, v_intake.answers_hash, v_intake.current_version,
    p_participant_user_id, trim(p_signer_name), p_signature_method, p_signature_data
  ) returning id into v_id;
  update public.legal_aid_intakes set last_activity_at = now() where id = p_intake_id;
  return v_id;
end $$;

create or replace function public.legal_aid_submit_intake(
  p_intake_id uuid, p_participant_user_id uuid, p_required_statement_keys text[]
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_event public.clinic_events%rowtype; v_key text; v_case uuid; v_required text[]; v_status_statement text;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then return 'not_found'; end if;
  if v_intake.participant_user_id is null or v_intake.participant_user_id <> p_participant_user_id then return 'forbidden'; end if;
  if v_intake.status in ('submitted','staff_review','approved','declined_for_program','referred') then return 'already_submitted'; end if;
  if v_intake.status = 'withdrawn' then return 'withdrawn'; end if;
  if v_intake.answers_hash is null then return 'answers_required'; end if;
  -- Re-derive the existing required statements from locked current answers.
  -- A stale preflight or an older caller cannot omit the uncertainty review.
  if v_intake.answers #>> '{is_us_citizen,state}' = 'answered'
     and v_intake.answers #> '{is_us_citizen,value}' in ('"yes"'::jsonb, '["yes"]'::jsonb) then
    v_status_statement := 'citizenship_attestation';
  elsif v_intake.answers #>> '{is_us_citizen,state}' = 'unknown'
     or (v_intake.answers #>> '{is_us_citizen,state}' = 'answered'
         and v_intake.answers #> '{is_us_citizen,value}' in ('"no"'::jsonb, '["no"]'::jsonb)) then
    v_status_statement := 'noncitizen_review_acknowledgment';
  else
    return 'validation_failed';
  end if;
  v_required := array['financial_attestation', v_status_statement, 'information_sharing_consent']
    || coalesce(p_required_statement_keys, array[]::text[]);
  foreach v_key in array v_required loop
    if not exists (
      select 1 from public.legal_aid_intake_signatures s
      where s.intake_id = p_intake_id and s.statement_key = v_key and s.status = 'active' and s.answers_hash = v_intake.answers_hash
    ) then return 'signature_required:' || v_key; end if;
  end loop;
  select * into v_event from public.clinic_events where id = v_intake.event_id;
  -- One clinic case per submitted intake, in the existing case model, so the
  -- existing queue, follow-up and sponsored packet controls see the same person.
  if v_intake.clinic_case_id is null then
    select c.id into v_case from public.clinic_cases c
      where c.event_id = v_intake.event_id and c.participant_user_id = p_participant_user_id and c.screening_session_id is null
      limit 1;
    if v_case is null then
      insert into public.clinic_cases(event_id, participant_user_id, queue_status, route_disposition, jurisdiction)
      values (v_intake.event_id, p_participant_user_id, 'needs_information', 'pending', coalesce(v_event.jurisdiction, 'MS'))
      returning id into v_case;
    end if;
  else
    v_case := v_intake.clinic_case_id;
  end if;
  update public.legal_aid_information_requests set status = 'fulfilled', fulfilled_at = now()
    where intake_id = p_intake_id and status = 'open';
  update public.legal_aid_intakes set
    status = 'submitted', submitted_at = now(), submitted_version = current_version,
    clinic_case_id = v_case, last_activity_at = now()
    where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, null, 'intake_submitted', 'intake', p_intake_id,
    jsonb_build_object('version', v_intake.current_version));
  return 'submitted';
end $$;

revoke all on function public.legal_aid_sign_intake(uuid,uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.legal_aid_submit_intake(uuid,uuid,text[]) from public, anon, authenticated;
grant execute on function public.legal_aid_sign_intake(uuid,uuid,text,text,text,text,text,text),
  public.legal_aid_submit_intake(uuid,uuid,text[]) to service_role;

commit;
