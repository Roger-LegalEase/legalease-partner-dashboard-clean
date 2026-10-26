-- Preserve the existing capacity ledger and strict partner procurement path.
-- Managed sponsored programs use an actual authenticated Platform Admin allocation;
-- no external invoice, agreement, payment, credit consumption or participant consent is created.
-- PREPARE ONLY: existing normal RCAP schema/functions are required; do not apply remotely without exact review.
begin;
do $prerequisites$
declare signature text;
begin
 foreach signature in array array[
  'public.rcap_guard_launch_capacity()',
  'public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint)',
  'public.rcap_program_funding_valid(uuid)',
  'public.rcap_program_policy_source(uuid)'
 ] loop
  if to_regprocedure(signature) is null then raise exception 'Managed capacity prerequisite missing: %',signature;end if;
 end loop;
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='partner_onboarding' and column_name='aggregate_version') then
  raise exception 'Existing normal RCAP workspace version contract is required; no legacy schema upgrade is performed here';
 end if;
end;
$prerequisites$;
alter table public.rcap_launch_capacity_events alter column document_id drop not null,alter column document_hash drop not null;
alter table public.rcap_launch_capacity_events add constraint rcap_capacity_document_pair check ((document_id is null)=(document_hash is null));

create or replace function public.rcap_guard_launch_capacity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform public.rcap_service_assert_internal_actor(new.actor_auth_user_id);
 -- Platform-owned allocations are actual internal authority, not a partner invoice.
 if new.document_id is null and new.document_hash is null and exists(
  select 1 from public.partner_onboarding w
  where w.id=new.workspace_id and w.operating_model='legalease_managed' and w.rcap_policy_version='rcap2.2'
   and w.status<>'live' and not w.landing_page_ready
   and public.rcap_program_policy_source(w.id)#>>'{program_goals,service_mode}'='sponsored_packets'
   and length(btrim(public.rcap_program_policy_source(w.id)#>>'{program_goals,operator_authority_reference}'))>=10
 ) then return new;end if;
 if not exists(select 1 from public.partner_onboarding_assets d join public.partner_onboarding w on w.id=d.workspace_id where w.id=new.workspace_id and w.status<>'live' and not w.landing_page_ready and w.agreement_status='signed' and d.id=new.document_id and d.sha256_hex=new.document_hash and d.category='procurement_document' and d.review_status='approved' and d.lifecycle_status='active') then raise exception 'current signed procurement authority required'; end if;
 return new;
end $$;

create or replace function public.rcap_service_configure_launch_capacity(p_slug text,p_actor uuid,p_document uuid,p_hash text,p_screenings integer,p_packets integer,p_reference text,p_request uuid,p_version bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; old public.rcap_launch_capacity_events%rowtype; previous jsonb; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 select * into old from public.rcap_launch_capacity_events where workspace_id=w.id and request_id=p_request;
 if found then if old.actor_auth_user_id is distinct from p_actor or old.document_id is distinct from p_document or old.document_hash is distinct from p_hash or old.screenings_allowed is distinct from p_screenings or old.packet_cap is distinct from p_packets or old.authority_reference is distinct from p_reference then raise exception 'capacity request binding conflict'; end if;return true;end if;
 if p_version is null or p_version<1 or w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version then raise exception 'publication or source changed'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.step='prepared' and not exists(select 1 from public.rcap_launch_operation_events t where t.operation_id=e.operation_id and t.step in ('complete','held','failed'))) then raise exception 'launch in progress'; end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 perform 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null for update;
 previous:=jsonb_build_object('screening',(select to_jsonb(e) from public.partner_entitlement e where e.partner_slug=p_slug),'packet',(select to_jsonb(e) from public.partner_packet_entitlement e where e.partner_id=w.partner_record_id and e.entitlement_scope='sponsored_packets' and e.expires_at is null));
 insert into public.rcap_launch_capacity_events(workspace_id,actor_auth_user_id,document_id,document_hash,screenings_allowed,packet_cap,authority_reference,request_id,previous_capacity) values(w.id,p_actor,p_document,p_hash,p_screenings,p_packets,p_reference,p_request,previous);
 insert into public.partner_entitlement(partner_slug,screenings_allowed,contract_note) values(p_slug,p_screenings,p_reference) on conflict(partner_slug) do update set screenings_allowed=excluded.screenings_allowed,contract_note=excluded.contract_note;
 if exists(select 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null) then
 update public.partner_packet_entitlement set packet_cap=p_packets where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null;
 else insert into public.partner_packet_entitlement(partner_id,entitlement_scope,packet_cap,contract_note) values(w.partner_record_id,'sponsored_packets',p_packets,p_reference);end if;
 update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id;
 update public.partner_onboarding_launch_checks set invalidated_at=now(),invalidated_reason='Documented allocation changed' where workspace_id=w.id;
 update public.partner_onboarding_launch_approvals set invalidated_at=now() where workspace_id=w.id;
 return true;
end $$;

create or replace function public.rcap_program_funding_valid(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select case when (select operating_model from public.partner_onboarding where id=p_workspace)='legalease_managed' then exists(select 1 from public.partner_onboarding w join public.partner_records r on r.id=w.partner_record_id join lateral(select * from public.rcap_launch_capacity_events where workspace_id=w.id order by created_at desc,id desc limit 1) c on true left join public.partner_onboarding_assets d on d.id=c.document_id and d.workspace_id=w.id join public.partner_packet_entitlement e on e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.expires_at is null where w.id=p_workspace and c.packet_cap>0 and e.packet_cap=c.packet_cap and e.effective_at<=now() and r.payment_status is distinct from 'demo_paid' and ((c.document_id is null and c.document_hash is null) or (d.sha256_hex=c.document_hash and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null)) and exists(select 1 from public.partner_users where auth_user_id=c.actor_auth_user_id and role='internal_admin' and partner_slug is null and status='active')) else exists(select 1 from public.partner_onboarding w join public.partner_records r on r.id=w.partner_record_id
 join lateral(select * from public.rcap_commercial_authorizations where workspace_id=w.id order by created_at desc,id desc limit 1) a on true
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id
 where w.id=p_workspace and a.expires_at>now()
 and (w.rcap_policy_version<>'rcap2.2' or w.status<>'live' or exists(select 1 from public.rcap_launch_operation_events staged where staged.operation_id=w.rcap_launch_operation_id and staged.workspace_id=w.id and staged.step='prepared' and staged.evidence->'snapshot'->>'scopeHash'=public.rcap_program_launch_scope(w.id))) and (w.operating_model='legalease_managed' or r.qualification_status='qualified') and r.payment_status is distinct from 'demo_paid'
 and ((w.operating_model='legalease_managed' and public.rcap_program_policy_source(w.id)#>>'{access_sponsorship_capacity,participant_access_model}'=a.access_mode) or (r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode))
 and d.category='procurement_document' and d.sha256_hex=a.document_hash and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null
 and exists(select 1 from public.partner_users where auth_user_id=a.actor_auth_user_id and partner_slug is null and role='internal_admin' and status='active')
 and not exists(select 1 from public.partner_onboarding_launch_approvals rv where rv.workspace_id=w.id and rv.approval_type='commercial_revocation' and rv.policy_details->>'authority_id'=a.id::text and rv.decision='withdraw')
 and not exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at)
 and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and (public.rcap_agreement_clearance(w.id) or (w.rcap_policy_version='rcap2.2' and a.kind='screening_only' and a.packet_entitlement_id is null
 and a.legal_basis->>'agreement_requirement'='not_required' and length(btrim(a.legal_basis->>'policy_reference'))>=10
 and length(btrim(a.legal_basis->>'effective_conditions'))>=10 and length(btrim(a.legal_basis->>'termination_rule'))>=10
 and a.legal_basis->>'funding_obligation'='none'
 and not exists(select 1 from public.partner_onboarding_agreements g where g.workspace_id=w.id and g.is_required and g.status not in ('not_required','waived')))))
end
$$;

commit;
