-- Authorized for disposable NON-PRODUCTION implementation on 2026-10-08.
-- Proposed for future release review only; no remote or Production execution.
-- Companion to rcap_launch_package_20261008.sql. No existing membership,
-- auth helper, session resolver, public eligibility, or RLS policy is changed.
-- A separately approved bounded server guard must verify auth.getUser(), then
-- the exact active assignment before entering an assigned partner's Studio.
-- It must not admit a PSM to the Command Center or general internal APIs.
-- Existing partner_admin consent and elevated legal/finance/launch guards stay.
begin;
create table public.rcap_partner_operator_assignments (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id),
  partner_slug text not null references public.partner_records(partner_slug),
  capabilities text[] not null check (cardinality(capabilities) > 0 and capabilities <@ array['prepare','review_operational_material']::text[]),
  granted_by uuid not null references auth.users(id),
  authority_reference text not null check (length(btrim(authority_reference)) >= 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revocation_reason text,
  check (expires_at is null or expires_at > created_at),
  check ((revoked_at is null and revoked_by is null and revocation_reason is null) or
         (revoked_at >= created_at and revoked_by is not null and length(btrim(revocation_reason)) >= 10))
);
create index rcap_partner_operator_assignment_scope on public.rcap_partner_operator_assignments(auth_user_id,partner_slug) where revoked_at is null;

-- Immutable event ledger: an exception never overwrites a raw check or approval.
-- The application must check the typed policy catalog and approved alternative
-- authority. Classifications alone confer no waiver authority.
create table public.rcap_launch_exception_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('grant','revoke')),
  grant_id uuid references public.rcap_launch_exception_events(id),
  workspace_id uuid not null references public.partner_onboarding(id),
  partner_slug text not null references public.partner_records(partner_slug),
  check_key text not null check (check_key in ('planned_partner_administrator_present','report_recipients_configured','staff_training_completed','communications_approved')),
  actor_auth_user_id uuid not null references auth.users(id),
  actor_role text not null check (actor_role = 'internal_admin'),
  request_id uuid not null,
  reason text not null check (length(btrim(reason)) >= 10),
  authority_reference text not null check (length(btrim(authority_reference)) >= 10),
  snapshot_hash text not null check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (workspace_id,request_id),
  check ((kind='grant' and grant_id is null) or (kind='revoke' and grant_id is not null)),
  check (expires_at is null or expires_at > created_at)
);

-- Append-only operation journal. Hold publication until durable preparation,
-- genuine authority, matching package hash and independent public verification.
-- No receipt in this table itself constitutes payment or partner consent.
create table public.rcap_launch_operation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.partner_onboarding(id),
  partner_slug text not null references public.partner_records(partner_slug),
  operation_id uuid not null,
  request_id uuid not null,
  step text not null check (step in ('prepared','publication_staged','public_verified','complete','held','failed')),
  actor_auth_user_id uuid not null references auth.users(id),
  snapshot_hash text not null check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  authority_reference text not null check (length(btrim(authority_reference)) >= 10),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  unique (workspace_id,operation_id,step),
  unique (workspace_id,request_id,step)
);
-- Validate actor and scope even for privileged service callers.
create function public.rcap_guard_launch_authority_event() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_actor uuid;
  v_grant public.rcap_launch_exception_events%rowtype;
  v_prior public.rcap_launch_operation_events%rowtype;
begin
  if tg_table_name='rcap_partner_operator_assignments' then v_actor := new.granted_by;
  else v_actor := new.actor_auth_user_id; end if;
  if not exists(select 1 from public.partner_users where auth_user_id=v_actor and role='internal_admin' and partner_slug is null and status='active') then
    raise exception 'verified internal authority required' using errcode='42501';
  end if;
  if tg_table_name='rcap_partner_operator_assignments' then
    if tg_op='UPDATE' then
      if (to_jsonb(new)-array['revoked_at','revoked_by','revocation_reason']) is distinct from (to_jsonb(old)-array['revoked_at','revoked_by','revocation_reason']) or old.revoked_at is not null or new.revoked_at is null then
        raise exception 'assignment grant is immutable; revocation only' using errcode='42501';
      end if;
      if not exists(select 1 from public.partner_users where auth_user_id=new.revoked_by and role='internal_admin' and partner_slug is null and status='active') then
        raise exception 'verified revocation authority required' using errcode='42501';
      end if;
    end if;
    return new;
  end if;
  if not exists(select 1 from public.partner_onboarding where id=new.workspace_id and partner_slug=new.partner_slug) then
    raise exception 'workspace and partner mismatch' using errcode='42501';
  end if;
  if tg_table_name='rcap_launch_exception_events' then
    if new.kind='grant' and new.check_key<>'communications_approved' then raise exception 'separate conditional policy authority required' using errcode='42501'; end if;
    if new.kind='revoke' then
    select * into v_grant from public.rcap_launch_exception_events where id=new.grant_id;
    if not found or v_grant.kind<>'grant' or v_grant.workspace_id<>new.workspace_id or v_grant.partner_slug<>new.partner_slug or v_grant.check_key<>new.check_key then
      raise exception 'revocation scope mismatch' using errcode='42501';
    end if;
    end if;
  elsif tg_table_name='rcap_launch_operation_events' then
    -- Serialize transitions of the same workspace; receipt insertion is atomic.
    perform 1 from public.partner_onboarding where id=new.workspace_id for update;
    if new.step='prepared' and exists(select 1 from public.rcap_launch_operation_events active where active.workspace_id=new.workspace_id and active.step='prepared' and active.operation_id<>new.operation_id and not exists(select 1 from public.rcap_launch_operation_events terminal where terminal.operation_id=active.operation_id and terminal.step in ('complete','held','failed'))) then
      raise exception 'another launch operation is active' using errcode='40001';
    end if;
    select * into v_prior from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id order by created_at desc limit 1;
    if found and (v_prior.snapshot_hash<>new.snapshot_hash or v_prior.request_id<>new.request_id or v_prior.actor_auth_user_id<>new.actor_auth_user_id or v_prior.authority_reference<>new.authority_reference) then
      raise exception 'operation inputs are immutable' using errcode='40001';
    end if;
    if exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step in ('complete','held','failed')) then
      raise exception 'terminal operation cannot advance' using errcode='23514';
    end if;
    if new.step='publication_staged' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='prepared') then
      raise exception 'preparation receipt required' using errcode='23514';
    elsif new.step='public_verified' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='publication_staged') then
      raise exception 'staged publication receipt required' using errcode='23514';
    elsif new.step='complete' and not exists(select 1 from public.rcap_launch_operation_events where workspace_id=new.workspace_id and operation_id=new.operation_id and step='public_verified') then
      raise exception 'independent public verification receipt required' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.rcap_guard_launch_authority_event() from public,anon,authenticated;
grant execute on function public.rcap_guard_launch_authority_event() to service_role;
create trigger rcap_operator_assignment_guard before insert or update on public.rcap_partner_operator_assignments for each row execute function public.rcap_guard_launch_authority_event();
create trigger rcap_launch_exception_guard before insert on public.rcap_launch_exception_events for each row execute function public.rcap_guard_launch_authority_event();
create trigger rcap_launch_operation_guard before insert on public.rcap_launch_operation_events for each row execute function public.rcap_guard_launch_authority_event();

alter table public.rcap_partner_operator_assignments enable row level security;
alter table public.rcap_launch_exception_events enable row level security;
alter table public.rcap_launch_operation_events enable row level security;
revoke all on public.rcap_partner_operator_assignments,public.rcap_launch_exception_events,public.rcap_launch_operation_events from public,anon,authenticated;
grant select,insert,update on public.rcap_partner_operator_assignments to service_role;
grant select,insert on public.rcap_launch_exception_events,public.rcap_launch_operation_events to service_role;
-- Scoped capabilities: no change to global identity or internal-admin helpers.
create function public.rcap_studio_actor_can(p_actor uuid,p_slug text,p_capability text)
returns boolean language sql stable security invoker set search_path='' as $$
select exists(select 1 from public.partner_users where auth_user_id=p_actor and role='internal_admin' and partner_slug is null and status='active') or
(p_capability in ('prepare','review_operational_material') and exists(select 1 from public.rcap_partner_operator_assignments where auth_user_id=p_actor and partner_slug=p_slug and revoked_at is null and (expires_at is null or expires_at>now()) and p_capability=any(capabilities)))
$$;
create function public.rcap_studio_assert_prepare(p_actor uuid,p_slug text)
returns void language plpgsql security invoker set search_path='' as $$ begin
 if not public.rcap_studio_actor_can(p_actor,p_slug,'prepare') then raise exception 'assigned preparation authority required' using errcode='42501'; end if;
end $$;
revoke all on function public.rcap_studio_actor_can(uuid,text,text),public.rcap_studio_assert_prepare(uuid,text) from public,anon,authenticated;
grant execute on function public.rcap_studio_actor_can(uuid,text,text),public.rcap_studio_assert_prepare(uuid,text) to service_role;
-- Preserve the existing validator, concurrency, idempotency and pending partner
-- confirmation semantics. Change only the actor guard in these three RPCs.
do $scoped$ declare v_name text; v_oid oid; v_definition text; begin
 foreach v_name in array array['rcap_service_prepare_onboarding_prefill','rcap_service_review_onboarding_prefill','rcap_service_apply_onboarding_prefill'] loop
  select oid into strict v_oid from pg_proc where pronamespace='public'::regnamespace and proname=v_name;
  v_definition:=pg_get_functiondef(v_oid);
  if position('perform public.rcap_service_assert_internal_actor(p_actor_user_id);' in v_definition)=0 then raise exception 'unexpected prefill guard in %',v_name; end if;
  execute replace(v_definition,'perform public.rcap_service_assert_internal_actor(p_actor_user_id);','perform public.rcap_studio_assert_prepare(p_actor_user_id,p_partner_slug);');
 end loop;
end $scoped$;
-- A delegated review records the actual operator in the existing review ledger.
-- It cannot review the implementation brief, public/legal page, or partner consent.
create function public.rcap_service_review_operational_artifact(p_partner_slug text,p_actor_user_id uuid,p_version uuid,p_decision text,p_request_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_type text; begin
 if not public.rcap_studio_actor_can(p_actor_user_id,p_partner_slug,'review_operational_material') then raise exception 'assigned review authority required' using errcode='42501'; end if;
 select a.artifact_type into v_type from public.partner_onboarding_artifacts a join public.partner_onboarding_artifact_versions v on v.artifact_id=a.id join public.partner_onboarding po on po.id=v.workspace_id where v.id=p_version and po.partner_slug=p_partner_slug and a.current_version_id=v.id and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null;
 if v_type is null or v_type not in ('operations_escalation_plan','dashboard_user_reporting_matrix','staff_quick_start_guide') then raise exception 'operational review only' using errcode='42501'; end if;
 perform public.rcap_service_review_onboarding_artifact(p_partner_slug,p_actor_user_id,'legalease',p_version,p_decision,'Operational material reviewed by assigned operator',null,p_request_id);
 return true;
end $$;
revoke all on function public.rcap_service_review_operational_artifact(text,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_review_operational_artifact(text,uuid,uuid,text,uuid) to service_role;
-- Targets exist only in disposable acceptance databases; registration is elevated.
create table public.rcap_synthetic_launch_targets(partner_slug text primary key references public.partner_records(partner_slug),registered_by uuid not null references auth.users(id),authority_reference text not null check(length(btrim(authority_reference))>=10), failure_step text check(failure_step in ('public_verified')));
alter table public.rcap_synthetic_launch_targets enable row level security;
revoke all on public.rcap_synthetic_launch_targets from public,anon,authenticated;
grant select,insert on public.rcap_synthetic_launch_targets to service_role;

create function public.rcap_refuse_audit_rewrite() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'append-only audit history' using errcode='42501'; end $$;
create trigger rcap_exception_immutable before update or delete on public.rcap_launch_exception_events for each row execute function public.rcap_refuse_audit_rewrite();
create trigger rcap_operation_immutable before update or delete on public.rcap_launch_operation_events for each row execute function public.rcap_refuse_audit_rewrite();
revoke all on function public.rcap_refuse_audit_rewrite() from public,anon,authenticated;
grant execute on function public.rcap_refuse_audit_rewrite() to service_role;
-- The app restricts this RPC to registered loopback synthetic databases. There
-- is no live-launch endpoint or registration API. Activation/payment is read-only.
create function public.rcap_service_stage_synthetic_launch(p_slug text,p_actor uuid,p_operation uuid,p_version bigint,p_hash text,p_versions jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_workspace public.partner_onboarding%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 if not exists(select 1 from public.rcap_synthetic_launch_targets t join public.partner_users u on u.auth_user_id=t.registered_by where t.partner_slug=p_slug and u.role='internal_admin' and u.status='active' and u.partner_slug is null) then raise exception 'registered synthetic target required' using errcode='42501'; end if;
 select * into strict v_workspace from public.partner_onboarding where partner_slug=p_slug for update;
 if v_workspace.status='live' then raise exception 'already published' using errcode='40001'; end if;
 if v_workspace.aggregate_version<>p_version then raise exception 'stale launch source' using errcode='40001'; end if;
 if not exists(select 1 from public.rcap_launch_operation_events where workspace_id=v_workspace.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared') then raise exception 'matching prepared authority required' using errcode='42501'; end if;
 if not exists(select 1 from public.partner_records where partner_slug=p_slug and payment_status in ('paid','demo_paid') and qualification_status='qualified' and provisioning_status in ('provisioned','active')) then raise exception 'existing activation authority required' using errcode='42501'; end if;
 if not exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used) then raise exception 'screening capacity required' using errcode='42501'; end if;
 if v_workspace.commercial_gate_status='blocked' or v_workspace.agreement_status<>'signed' then raise exception 'commercial and contractual authority required' using errcode='42501'; end if;
 if jsonb_typeof(p_versions)<>'array' or jsonb_array_length(p_versions)<>5 or (select count(distinct item->>'id') from jsonb_array_elements(p_versions) item)<>5 then raise exception 'exact package required'; end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifact_versions v join public.partner_onboarding_artifacts a on a.id=v.artifact_id where v.workspace_id=v_workspace.id and v.id=(item->>'id')::uuid and a.current_version_id=v.id and v.snapshot_hash=item->>'hash' and v.approval_status='approved' and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (a.artifact_type not in ('implementation_brief','co_branded_page_configuration') or v.partner_review_status='approved'))) then raise exception 'package changed' using errcode='40001'; end if;
 update public.partner_onboarding set status='live',landing_page_ready=true,internal_approved_at=now(),launched_at=now() where id=v_workspace.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 select workspace_id,partner_slug,operation_id,request_id,'publication_staged',actor_auth_user_id,snapshot_hash,authority_reference,jsonb_build_object('workspaceVersion',p_version) from public.rcap_launch_operation_events where workspace_id=v_workspace.id and operation_id=p_operation and step='prepared';
 return true;
end $$;
create function public.rcap_service_compensate_synthetic_launch(p_slug text,p_actor uuid,p_operation uuid,p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_event public.rcap_launch_operation_events%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select e.* into strict v_event from public.rcap_launch_operation_events e join public.partner_onboarding po on po.id=e.workspace_id where e.partner_slug=p_slug and e.operation_id=p_operation and e.step='prepared' and e.actor_auth_user_id=p_actor and e.snapshot_hash=p_hash for update of po;
 if exists(select 1 from public.rcap_launch_operation_events where operation_id=p_operation and step='complete') then raise exception 'completed operation cannot compensate'; end if;
 if not exists(select 1 from public.rcap_launch_operation_events where operation_id=p_operation and step='publication_staged') then return true; end if;
 update public.partner_onboarding set status=v_event.evidence->'previousPublication'->>'status',landing_page_ready=(v_event.evidence->'previousPublication'->>'landing_page_ready')::boolean,internal_approved_at=(v_event.evidence->'previousPublication'->>'internal_approved_at')::timestamptz,launched_at=(v_event.evidence->'previousPublication'->>'launched_at')::timestamptz where id=v_event.workspace_id;
 return true;
end $$;
revoke all on function public.rcap_service_stage_synthetic_launch(text,uuid,uuid,bigint,text,jsonb),public.rcap_service_compensate_synthetic_launch(text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.rcap_service_stage_synthetic_launch(text,uuid,uuid,bigint,text,jsonb),public.rcap_service_compensate_synthetic_launch(text,uuid,uuid,text) to service_role;

-- Private organizational media review, reusing existing immutable metadata.
create table public.rcap_studio_asset_reviews(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.partner_onboarding(id),asset_id uuid not null references public.partner_onboarding_assets(id),actor_auth_user_id uuid not null references auth.users(id),decision text not null check(decision in ('approve','reject')),reason text not null check(length(btrim(reason))>=10),request_id uuid not null,created_at timestamptz not null default now(),unique(workspace_id,request_id));
alter table public.rcap_studio_asset_reviews enable row level security;
revoke all on public.rcap_studio_asset_reviews from public,anon,authenticated;
grant select,insert on public.rcap_studio_asset_reviews to service_role;
create trigger rcap_asset_review_immutable before update or delete on public.rcap_studio_asset_reviews for each row execute function public.rcap_refuse_audit_rewrite();
create function public.rcap_service_review_studio_asset(p_slug text,p_actor uuid,p_asset uuid,p_decision text,p_reason text,p_request uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_workspace uuid; v_prior public.rcap_studio_asset_reviews%rowtype; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select a.workspace_id into v_workspace from public.partner_onboarding_assets a join public.partner_onboarding po on po.id=a.workspace_id where a.id=p_asset and po.partner_slug=p_slug and a.deleted_at is null and a.lifecycle_status in ('pending_review','active') for update of a,po;
 if v_workspace is null then raise exception 'current scoped organizational asset required'; end if;
 select * into v_prior from public.rcap_studio_asset_reviews where workspace_id=v_workspace and request_id=p_request;
 if found then if v_prior.asset_id<>p_asset or v_prior.actor_auth_user_id<>p_actor or v_prior.decision<>p_decision or v_prior.reason<>btrim(p_reason) then raise exception 'review request conflict'; end if;return true;end if;
 insert into public.rcap_studio_asset_reviews(workspace_id,asset_id,actor_auth_user_id,decision,reason,request_id)values(v_workspace,p_asset,p_actor,p_decision,btrim(p_reason),p_request);
 update public.partner_onboarding_assets set review_status=case when p_decision='approve' then 'approved' else 'rejected' end,lifecycle_status=case when p_decision='approve' then 'active' else 'pending_review' end,review_reason=btrim(p_reason) where id=p_asset;
 update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=v_workspace;
 return true;
end $$;
revoke all on function public.rcap_service_review_studio_asset(text,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_review_studio_asset(text,uuid,uuid,text,text,uuid) to service_role;
commit;
