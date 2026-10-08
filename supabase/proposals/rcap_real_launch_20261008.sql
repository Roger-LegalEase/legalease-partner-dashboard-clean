-- Additive companion to the two accepted Launch Studio proposals.
-- Disposable local application only until separately authorized for Production.
begin;
alter table public.partner_onboarding add column rcap_launch_operation_id uuid;
create table public.rcap_commercial_authorizations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.partner_onboarding(id),
 kind text not null check(kind in ('verified_paid','sponsored','purchase_order')),
 document_id uuid not null references public.partner_onboarding_assets(id),
 document_hash text not null check(document_hash ~ '^[a-f0-9]{64}$'),
 authority_reference text not null check(length(btrim(authority_reference)) between 10 and 1000),
 access_mode text not null check(access_mode in ('open','invite_only','optional_code','required_code')),
 packet_entitlement_id uuid not null references public.partner_packet_entitlement(id),
 actor_auth_user_id uuid not null references auth.users(id),
 expires_at timestamptz not null,
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(workspace_id,request_id)
);
alter table public.rcap_commercial_authorizations enable row level security;
revoke all on public.rcap_commercial_authorizations from public,anon,authenticated,service_role;
grant select,insert on public.rcap_commercial_authorizations to service_role;
create trigger rcap_commercial_immutable before update or delete on public.rcap_commercial_authorizations for each row execute function public.rcap_refuse_audit_rewrite();
create function public.rcap_guard_commercial_authorization() returns trigger language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; r public.partner_records%rowtype; begin
 perform public.rcap_service_assert_internal_actor(new.actor_auth_user_id);
 select * into strict w from public.partner_onboarding where id=new.workspace_id for update;
 select * into strict r from public.partner_records where id=w.partner_record_id for update;
 if w.status='live' or w.agreement_status<>'signed' or new.expires_at<=now() then raise exception 'current signed agreement and unpublished program required'; end if;
 if not exists(select 1 from public.partner_onboarding_assets a where a.id=new.document_id and a.workspace_id=w.id and a.category='procurement_document' and a.sha256_hex=new.document_hash and a.lifecycle_status='active' and a.review_status='approved') then raise exception 'approved partner procurement evidence required'; end if;
 if not exists(select 1 from public.partner_onboarding_sections s where s.workspace_id=w.id and s.section_key='access_sponsorship_capacity' and s.status='approved' and s.response_data->>'participant_access_model'=new.access_mode) then raise exception 'canonical access scope required'; end if;
 if new.kind='verified_paid' and not coalesce((r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0),false) then raise exception 'verified payment required'; end if;
 if r.payment_status='demo_paid' then raise exception 'demo payment cannot authorize a real program';end if;
 if r.qualification_status is distinct from 'qualified' then raise exception 'qualification required'; end if;
 if not exists(select 1 from public.partner_packet_entitlement e where e.id=new.packet_entitlement_id and e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.packet_cap>0 and e.effective_at<=now() and (e.expires_at is null or e.expires_at>=new.expires_at)) then raise exception 'current scoped packet allocation required'; end if;
 return new;
end $$;
create trigger rcap_commercial_guard before insert on public.rcap_commercial_authorizations for each row execute function public.rcap_guard_commercial_authorization();

create function public.rcap_service_record_commercial_authority(p_slug text,p_actor uuid,p_kind text,p_document uuid,p_hash text,p_reference text,p_expires timestamptz,p_packet uuid,p_request uuid,p_version bigint,p_reconcile boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; a uuid; mode text; old public.rcap_commercial_authorizations%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 select * into old from public.rcap_commercial_authorizations where workspace_id=w.id and request_id=p_request;
 if found then
 if old.actor_auth_user_id<>p_actor or old.kind<>p_kind or old.document_id<>p_document or old.document_hash<>p_hash or old.authority_reference<>p_reference or old.expires_at<>p_expires or old.packet_entitlement_id<>p_packet then raise exception 'request binding conflict'; end if; return old.id; end if;
 if w.aggregate_version<>p_version or w.status='live' or not p_reconcile then raise exception 'explicit current-source reconciliation required'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.step='prepared' and not exists(select 1 from public.rcap_launch_operation_events t where t.operation_id=e.operation_id and t.step in ('complete','held','failed'))) then raise exception 'launch in progress'; end if;
 select response_data->>'participant_access_model' into strict mode from public.partner_onboarding_sections where workspace_id=w.id and section_key='access_sponsorship_capacity';
 insert into public.rcap_commercial_authorizations(workspace_id,kind,document_id,document_hash,authority_reference,access_mode,packet_entitlement_id,actor_auth_user_id,expires_at,request_id)
 values(w.id,p_kind,p_document,p_hash,p_reference,mode,p_packet,p_actor,p_expires,p_request) returning id into a;
 -- Reconcile access/provisioning from documented authority. Never write payment.
 update public.partner_records set access_mode=mode,provisioning_status='provisioned' where id=w.partner_record_id;
 update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id;
 -- A changed commercial/activation source requires renewed exact-source approvals.
 update public.partner_onboarding_launch_checks set invalidated_at=now(),invalidated_reason='Commercial authorization and activation reconciled' where workspace_id=w.id;
 update public.partner_onboarding_launch_approvals set invalidated_at=now() where workspace_id=w.id;
 return a;
end $$;

-- Preparation also rechecks publication under the journal's existing workspace lock.
-- A late concurrent request must not append a second preparation after completion.
create function public.rcap_guard_real_preparation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.step='prepared' and new.evidence->>'mode'='real' then
 begin perform 1 from public.partner_onboarding where id=new.workspace_id for update nowait; exception when lock_not_available then raise exception 'another operation owns the workspace' using errcode='42501'; end;
 if exists(select 1 from public.rcap_launch_operation_events active where active.workspace_id=new.workspace_id and active.step='prepared' and active.operation_id<>new.operation_id and not exists(select 1 from public.rcap_launch_operation_events terminal where terminal.operation_id=active.operation_id and terminal.step in ('complete','held','failed'))) then raise exception 'another launch is active' using errcode='42501'; end if;
 if exists(select 1 from public.partner_onboarding w where w.id=new.workspace_id and (w.status='live' or w.landing_page_ready or w.aggregate_version<>(new.evidence->>'workspaceVersion')::bigint)) then raise exception 'publication or source changed before preparation' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger rcap_a_real_preparation_guard before insert on public.rcap_launch_operation_events for each row execute function public.rcap_guard_real_preparation();

create function public.rcap_service_stage_real_launch(p_slug text,p_actor uuid,p_operation uuid,p_version bigint,p_hash text,p_versions jsonb,p_authority uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; a public.rcap_commercial_authorizations%rowtype; consent public.partner_onboarding_launch_approvals%rowtype; final_review public.partner_onboarding_launch_approvals%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 perform 1 from public.partner_onboarding_sections where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_assets where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifacts where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifact_versions where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_checks where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_approvals where workspace_id=w.id for update;
 select * into strict a from public.rcap_commercial_authorizations where id=p_authority and workspace_id=w.id;
 if w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version or w.agreement_status<>'signed' or w.commercial_gate_status='blocked' then raise exception 'stale or unapproved publication source' using errcode='40001'; end if;
 if not exists(select 1 from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real' and evidence->>'commercialAuthorityId'=a.id::text) then raise exception 'matching real launch authorization required'; end if;
 if exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at) then raise exception 'renew commercial authorization after capacity changes';end if;
 if a.expires_at<=now() or not exists(select 1 from public.partner_onboarding_assets where id=a.document_id and workspace_id=w.id and sha256_hex=a.document_hash and lifecycle_status='active' and review_status='approved') then raise exception 'commercial authority expired or withdrawn'; end if;
 if exists(select 1 from public.partner_records r join public.rcap_launch_operation_events e on e.workspace_id=w.id and e.operation_id=p_operation and e.step='prepared' where r.id=w.partner_record_id and ((e.evidence->'snapshot'->'activationRecord'->>'payment_status') is distinct from r.payment_status or (e.evidence->'snapshot'->'activationRecord'->>'stripe_payment_intent_id') is distinct from r.stripe_payment_intent_id or (e.evidence->'snapshot'->'activationRecord'->>'paid_at')::timestamptz is distinct from r.paid_at or (e.evidence->'snapshot'->'activationRecord'->>'payment_amount')::numeric is distinct from r.payment_amount or (e.evidence->'snapshot'->'activationRecord'->>'qualification_status') is distinct from r.qualification_status)) then raise exception 'financial or activation source changed after snapshot';end if;
 if not exists(select 1 from public.partner_records r where r.id=w.partner_record_id and r.qualification_status='qualified' and r.payment_status is distinct from 'demo_paid' and r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))) then raise exception 'activation or payment authority changed'; end if;
 if (select count(*) from public.partner_onboarding_sections where workspace_id=w.id and status='approved')<>8 or not exists(select 1 from public.partner_onboarding_sections where workspace_id=w.id and section_key='access_sponsorship_capacity' and response_data->>'participant_access_model'=a.access_mode) then raise exception 'canonical configuration unapproved or conflicting'; end if;
 if not exists(select 1 from public.partner_onboarding_sections geo join public.partner_records r on r.id=w.partner_record_id join public.rcap_launch_operation_events e on e.operation_id=p_operation and e.step='prepared' where geo.workspace_id=w.id and geo.section_key='geography_audience_language_accessibility' and geo.status='approved' and case when jsonb_array_length(geo.response_data->'jurisdictions')=1 then geo.response_data->'jurisdictions'->>0 else case when geo.response_data->'jurisdictions' ? coalesce(r.target_state,r.state) then coalesce(r.target_state,r.state) end end=e.evidence->>'intakeJurisdiction') then raise exception 'approved primary screening jurisdiction changed or absent';end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if not exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used) then raise exception 'screening allocation exhausted or absent'; end if;
 perform 1 from public.partner_packet_entitlement where id=a.packet_entitlement_id for update;
 if not exists(select 1 from public.partner_packet_entitlement e where e.id=a.packet_entitlement_id and e.partner_id=w.partner_record_id and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type='consumed')) then raise exception 'packet allocation exhausted or absent'; end if;
 select * into consent from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='partner_launch_approval' order by recorded_at desc,id desc limit 1;
 select * into final_review from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='legalease_final_review' order by recorded_at desc,id desc limit 1;
 if consent.id is null or consent.decision<>'approve' or consent.invalidated_at is not null or not exists(select 1 from public.partner_users where auth_user_id=consent.reviewer_user_id and partner_slug=p_slug and role='partner_admin' and status='active') or final_review.id is null or final_review.decision<>'approve' or final_review.invalidated_at is not null then raise exception 'current partner consent and final review required'; end if;
 perform public.rcap_service_assert_internal_actor(final_review.reviewer_user_id);
 if not exists(select 1 from public.partner_onboarding_launch_checks where workspace_id=w.id and check_key='staff_training_completed' and status='passing' and invalidated_at is null) then raise exception 'current training review required'; end if;
 if jsonb_typeof(p_versions)<>'array' or jsonb_array_length(p_versions)<>5 or (select count(distinct item->>'type') from jsonb_array_elements(p_versions) item)<>5 then raise exception 'exact five-material package required'; end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifact_versions v join public.partner_onboarding_artifacts ar on ar.id=v.artifact_id where v.workspace_id=w.id and v.id=(item->>'id')::uuid and ar.current_version_id=v.id and ar.artifact_type=item->>'type' and ar.artifact_type in ('implementation_brief','operations_escalation_plan','dashboard_user_reporting_matrix','staff_quick_start_guide','co_branded_page_configuration') and v.snapshot_hash=item->>'hash' and item->>'freshness'='current' and v.approval_status='approved' and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (ar.artifact_type not in ('implementation_brief','co_branded_page_configuration') or v.partner_review_status='approved'))) then raise exception 'approved package changed' using errcode='40001'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e cross join lateral jsonb_array_elements(e.evidence->'checks') c where e.operation_id=p_operation and e.step='prepared' and exists(select 1 from public.partner_onboarding_launch_checks lc where lc.workspace_id=w.id and lc.check_key=c->>'key' and (lc.status<>c->>'status' or lc.invalidated_at is not null or lc.checked_at is distinct from (c->>'checkedAt')::timestamptz))) then raise exception 'recorded checks changed after snapshot'; end if;
 update public.partner_records set onboarding_status='approved',onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=w.partner_record_id;
 update public.partner_onboarding set status='live' ,landing_page_ready=true,internal_approved_at=now(),launched_at=now(),rcap_launch_operation_id=p_operation where id=w.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 select workspace_id,partner_slug,operation_id,request_id,'publication_staged',actor_auth_user_id,snapshot_hash,authority_reference,jsonb_build_object('mode','real','commercialAuthorityId',a.id,'workspaceVersion',p_version) from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and step='prepared';
 return true;
end $$;

create function public.rcap_service_compensate_real_launch(p_slug text,p_actor uuid,p_operation uuid,p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare e public.rcap_launch_operation_events%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select ev.* into strict e from public.rcap_launch_operation_events ev join public.partner_onboarding w on w.id=ev.workspace_id where ev.partner_slug=p_slug and ev.operation_id=p_operation and ev.step='prepared' and ev.actor_auth_user_id=p_actor and ev.snapshot_hash=p_hash and ev.evidence->>'mode'='real' for update of w;
 if exists(select 1 from public.rcap_launch_operation_events where operation_id=p_operation and step='complete') then raise exception 'completed operation cannot compensate'; end if;
 if exists(select 1 from public.partner_onboarding where id=e.workspace_id and rcap_launch_operation_id=p_operation) then
 update public.partner_records set onboarding_status=e.evidence->'previousLegacyOnboarding'->>'onboarding_status',onboarding_completed_at=(e.evidence->'previousLegacyOnboarding'->>'onboarding_completed_at')::timestamptz where partner_slug=p_slug;
 end if;
 -- Retain the operation marker so an uncertain failure cannot expose a page.
 update public.partner_onboarding set status=e.evidence->'previousPublication'->>'status',landing_page_ready=false,internal_approved_at=(e.evidence->'previousPublication'->>'internal_approved_at')::timestamptz,launched_at=(e.evidence->'previousPublication'->>'launched_at')::timestamptz where id=e.workspace_id and rcap_launch_operation_id=p_operation;
 return true;
end $$;
-- Bounded preparation of existing allocations; never payment or credit consumption.
create table public.rcap_launch_capacity_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.partner_onboarding(id),
 actor_auth_user_id uuid not null references auth.users(id),document_id uuid not null references public.partner_onboarding_assets(id),document_hash text not null,
 screenings_allowed integer not null check(screenings_allowed>0),packet_cap integer not null check(packet_cap>0),
 authority_reference text not null check(length(btrim(authority_reference))>=10),request_id uuid not null,
 previous_capacity jsonb not null,created_at timestamptz not null default now(),unique(workspace_id,request_id)
);
alter table public.rcap_launch_capacity_events enable row level security;
revoke all on public.rcap_launch_capacity_events from public,anon,authenticated,service_role;
grant select,insert on public.rcap_launch_capacity_events to service_role;
create trigger rcap_capacity_immutable before update or delete on public.rcap_launch_capacity_events for each row execute function public.rcap_refuse_audit_rewrite();
create function public.rcap_guard_launch_capacity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform public.rcap_service_assert_internal_actor(new.actor_auth_user_id);
 if not exists(select 1 from public.partner_onboarding_assets d join public.partner_onboarding w on w.id=d.workspace_id where w.id=new.workspace_id and w.status<>'live' and not w.landing_page_ready and w.agreement_status='signed' and d.id=new.document_id and d.sha256_hex=new.document_hash and d.category='procurement_document' and d.review_status='approved' and d.lifecycle_status='active') then raise exception 'current signed procurement authority required'; end if;
 return new;
end $$;
create trigger rcap_capacity_guard before insert on public.rcap_launch_capacity_events for each row execute function public.rcap_guard_launch_capacity();
create function public.rcap_service_configure_launch_capacity(p_slug text,p_actor uuid,p_document uuid,p_hash text,p_screenings integer,p_packets integer,p_reference text,p_request uuid,p_version bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; old public.rcap_launch_capacity_events%rowtype; previous jsonb; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 select * into old from public.rcap_launch_capacity_events where workspace_id=w.id and request_id=p_request;
 if found then if old.actor_auth_user_id<>p_actor or old.document_id<>p_document or old.document_hash<>p_hash or old.screenings_allowed<>p_screenings or old.packet_cap<>p_packets or old.authority_reference<>p_reference then raise exception 'capacity request binding conflict'; end if;return true;end if;
 if w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version then raise exception 'publication or source changed'; end if;
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
revoke all on function public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint) from public,anon,authenticated;
grant execute on function public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint) to service_role;

-- The two existing screening claim operations retain their code, tenant, capacity,
-- and attribution controls. Only their legacy payment predicate is reconciled.
create function public.rcap_partner_activation_for_launch(p_slug text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.partner_records r left join public.partner_onboarding w on w.partner_slug=r.partner_slug
 where r.partner_slug=p_slug and r.qualification_status='qualified' and r.provisioning_status in ('active','provisioned') and
 case when w.rcap_launch_operation_id is null then r.payment_status in ('paid','demo_paid') and not exists(select 1 from public.rcap_commercial_authorizations pending where pending.workspace_id=w.id) else
 r.payment_status is distinct from 'demo_paid' and w.status='live' and w.landing_page_ready and w.internal_approved_at is not null and w.launched_at is not null and w.agreement_status='signed' and exists(
 select 1 from public.rcap_launch_operation_events e join public.rcap_commercial_authorizations a on a.id=(e.evidence->>'commercialAuthorityId')::uuid
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id and d.sha256_hex=a.document_hash
 where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id and e.step in ('public_verified','complete') and (e.step='complete' or e.created_at>now()-interval '15 minutes') and a.workspace_id=w.id and a.expires_at>now() and a.access_mode=r.access_mode
 and d.lifecycle_status='active' and d.review_status='approved' and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and not exists(select 1 from public.rcap_launch_operation_events failed where failed.operation_id=e.operation_id and failed.step in ('held','failed')))
 end)
$$;
revoke all on function public.rcap_partner_activation_for_launch(text) from public,anon,authenticated;
grant execute on function public.rcap_partner_activation_for_launch(text) to service_role;
do $$
declare signature text; definition text; needle text := 'pr.payment_status in (''paid'', ''demo_paid'')'; begin
 foreach signature in array array['public.claim_partner_screening_session(text,text,text,timestamptz)','public.claim_rcap_screening_session(text,text)'] loop
 definition:=pg_get_functiondef(signature::regprocedure);
 if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'existing claim activation predicate differs: %; migration refused',signature; end if;
 execute replace(definition,needle,'public.rcap_partner_activation_for_launch(pr.partner_slug)');
 end loop;
end $$;

revoke all on function public.rcap_service_record_commercial_authority(text,uuid,text,uuid,text,text,timestamptz,uuid,uuid,bigint,boolean),public.rcap_service_stage_real_launch(text,uuid,uuid,bigint,text,jsonb,uuid),public.rcap_service_compensate_real_launch(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.rcap_service_record_commercial_authority(text,uuid,text,uuid,text,text,timestamptz,uuid,uuid,bigint,boolean),public.rcap_service_stage_real_launch(text,uuid,uuid,bigint,text,jsonb,uuid),public.rcap_service_compensate_real_launch(text,uuid,uuid,text) to service_role;
commit;
