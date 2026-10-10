-- Screening access is not packet sponsorship. Preserve the existing funding
-- decision for Clinic-cap exhaustion, and recognize explicitly consumer-paid
-- LegalEase program scope without changing acquisition, ownership or payment.
begin;
-- Keep the original cap decision separately so its participant-facing notice
-- continues to mean exhausted sponsorship. The old application-facing name
-- remains a compatible consumer-channel check for application rollback.
do $capacity$
declare body text;
begin
 if to_regprocedure('public.clinic_packet_capacity_dtc_authorized(uuid,uuid)') is null then
  body:=pg_get_functiondef('public.clinic_packet_dtc_authorized(uuid,uuid)'::regprocedure);
  if strpos(body,'f.funding_mode = ''dtc''')=0 and strpos(body,'f.funding_mode=''dtc''')=0 then
   raise exception 'unrecognized Clinic capacity authority';
  end if;
  execute replace(body,'FUNCTION public.clinic_packet_dtc_authorized(', 'FUNCTION public.clinic_packet_capacity_dtc_authorized(');
 end if;
end;
$capacity$;
revoke all on function public.clinic_packet_capacity_dtc_authorized(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clinic_packet_capacity_dtc_authorized(uuid,uuid) to service_role;
create or replace function public.rcap_consumer_packet_authorized(p_item uuid,p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $authority$
 select public.clinic_packet_capacity_dtc_authorized(p_item,p_owner) or exists (
  select 1 from public.consumer_briefcase_items i
  join public.consumer_pending_screening_results s on s.pending_id=i.source_pending_result_id
   and s.claimed_matter_id=i.id and s.claimed_user_id=i.user_id and s.status='CLAIMED'
   and s.product='rcap_partner' and s.anonymous_session_id::text=i.source_session_id
   and s.jurisdiction=i.jurisdiction
  join public.partner_onboarding w on w.partner_slug=s.partner_slug and w.operating_model='legalease_managed'
  join public.partner_onboarding_sections goals on goals.workspace_id=w.id and goals.section_key='program_goals'
  where i.id=p_item and i.user_id=p_owner
   and goals.response_data->>'service_mode' in ('screening_only','participant_paid')
   and s.jurisdiction=any(public.rcap_program_screening_jurisdictions(s.partner_slug))
   -- Previously reserved or delivered sponsored work must not become a charge.
   and not exists(select 1 from public.clinic_packet_funding f where f.briefcase_item_id=i.id and f.funding_mode='sponsored')
   and not exists(select 1 from public.consumer_packet_artifact_provenance a where a.briefcase_item_id=i.id and a.entitlement_source='partner_sponsorship')
   and not exists(select 1 from public.packet_credit_ledger l
    where l.matter_id=public.consumer_matter_id_for_briefcase_item(i.id)
     and l.event_type in ('reserved','consumed','overage_consumed'))
 );
$authority$;
revoke all on function public.rcap_consumer_packet_authorized(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rcap_consumer_packet_authorized(uuid,uuid) to service_role;

create or replace function public.clinic_packet_dtc_authorized(p_item uuid,p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $compatibility$
 select public.rcap_consumer_packet_authorized(p_item,p_owner);
$compatibility$;
revoke all on function public.clinic_packet_dtc_authorized(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clinic_packet_dtc_authorized(uuid,uuid) to service_role;

-- All existing owner, exact Checkout binding, amount, provider event, person,
-- product, verification and duplicate-payment guards remain in this transaction.
do $payment$
declare body text; old text:='and not public.clinic_packet_dtc_authorized(p_briefcase_item_id,v_owner) then';
begin
 body:=pg_get_functiondef('public.record_consumer_packet_payment(uuid,text,integer,integer,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure);
 if strpos(body,old)>0 then
  execute replace(body,old,'and not public.rcap_consumer_packet_authorized(p_briefcase_item_id,v_owner) then');
 elsif strpos(body,'and not public.rcap_consumer_packet_authorized(p_briefcase_item_id,v_owner) then')=0 then
  raise exception 'unrecognized consumer funding guard';
 end if;
end;
$payment$;
commit;
