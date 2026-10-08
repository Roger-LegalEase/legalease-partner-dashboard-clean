-- PROPOSED ONLY. Requires Roger's authorization; no Production execution.
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
    if new.kind='revoke' then
    select * into v_grant from public.rcap_launch_exception_events where id=new.grant_id;
    if not found or v_grant.kind<>'grant' or v_grant.workspace_id<>new.workspace_id or v_grant.partner_slug<>new.partner_slug or v_grant.check_key<>new.check_key then
      raise exception 'revocation scope mismatch' using errcode='42501';
    end if;
    end if;
  elsif tg_table_name='rcap_launch_operation_events' then
    -- Serialize transitions of the same workspace; receipt insertion is atomic.
    perform 1 from public.partner_onboarding where id=new.workspace_id for update;
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
commit;
