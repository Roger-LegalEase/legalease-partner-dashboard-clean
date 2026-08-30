-- Phase 57 — participant data rights: export, single-matter deletion, and
-- permanent account/personal-data deletion.
--
-- Local migration only until reviewed and applied through the production DB
-- process. Nothing here is run against a live project by this repository.
--
-- What this adds, and why each piece exists:
--
--   participant_privacy_requests        the durable, idempotent workflow record
--   participant_privacy_request_steps   the ordered, resumable step ledger
--   participant_legal_holds             the hold that outranks an erasure ask
--   participant_account_tombstones      freeze -> deletion -> restore barrier
--   participant_processor_propagations  what was told to which approved processor
--
-- The tombstone is the piece with the longest life. It carries NO foreign key to
-- auth.users precisely because it has to outlive that row: it is the record that
-- says "this account was erased", and it is what makes a database restored from
-- a backup taken before the erasure refuse to bring the account back. For the
-- same reason participant_privacy_requests.user_id is a bare uuid — a cascade
-- would delete the completion receipt at the exact moment it starts to matter.
--
-- Three existing guards are re-created here with one narrow relaxation each, named
-- and gated on a session-local erasure authority. Neither weakens any rule that
-- applies without that authority set:
--
--   packet_render_jobs_consumer_binding_immutable — allows replacing
--       consumer_auth_user_id with a pseudonym under the erasure authority. The
--       binding stays immutable for every other caller, and the accounting
--       columns are untouched, so the row still balances.
--   guard_packet_delivery_events — allows rewriting actor_user_id to a
--       pseudonym under the erasure authority. The append-only rule holds for
--       every other column and every other caller; no event is added or removed,
--       so delivery evidence still counts.
--   guard_packet_render_job_transition — allows queued -> failed under the
--       cancel_participant_render_jobs authority, so an unstarted render can be
--       cancelled without a fencing token that only a worker could hold.
--   consumer_payment_consumption_binding_guard — allows the same pseudonym
--       substitution on the consumption row. Amount, currency, product and
--       receipt reference stay immutable even under the erasure authority.
--
-- packet_credit_ledger is deliberately NOT touched. It carries no direct
-- participant identifier: person_id resolves to rcap_persons.match_key, which is
-- already a one-way hash of the auth user id, and matter_id is a derived hash.
-- It is pseudonymous by construction, and leaving it byte-identical is what
-- keeps partner entitlement accounting correct across an erasure.

-------------------------------------------------------------------------------
-- 1. Legal holds. Checked before any destructive step runs.
-------------------------------------------------------------------------------

create table if not exists public.participant_legal_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  -- Null scope means the whole account. A matter-scoped hold blocks only that
  -- matter and downgrades an account erasure to de-identification for it.
  matter_scope_item_id uuid,
  reason text not null,
  placed_by text not null,
  placed_at timestamptz not null default now(),
  released_at timestamptz,
  released_by text,

  constraint participant_legal_holds_reason_check
    check (length(trim(reason)) between 3 and 2000),
  constraint participant_legal_holds_release_shape_check
    check ((released_at is null) = (released_by is null))
);

create index if not exists participant_legal_holds_active_idx
  on public.participant_legal_holds(user_id)
  where released_at is null;

alter table public.participant_legal_holds enable row level security;

-- No policy: holds are an internal control. A participant learns that a hold
-- exists through the refusal reason on their own request, never by reading this
-- table, and the reason text is written for that purpose.
revoke all on table public.participant_legal_holds from anon;
revoke all on table public.participant_legal_holds from authenticated;

comment on table public.participant_legal_holds is
  'Active preservation obligations that outrank a participant erasure request. Internal only; a participant sees the effect as a refusal reason on their own privacy request.';

-------------------------------------------------------------------------------
-- 2. The durable privacy-request workflow.
-------------------------------------------------------------------------------

create table if not exists public.participant_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  -- Bare uuid, not a foreign key. See the header: the receipt has to outlive
  -- the auth user it is a receipt for.
  user_id uuid not null,
  -- Stable keyed pseudonym for the owner, written at open time so a completed
  -- account deletion still has a subject that is not a raw account id.
  subject_pseudonym text,
  request_type text not null,
  idempotency_key text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),

  -- Recent-auth proof. Destructive requests carry all three; an export carries
  -- none, because an export is not destructive and the session is proof enough.
  recent_auth_verified_at timestamptz,
  recent_auth_method text,
  recent_auth_proof_hash text,

  -- Legal-hold check. Recorded as an outcome, not as an absence: "we looked and
  -- found nothing" and "we never looked" must not be the same row.
  legal_hold_checked_at timestamptz,
  legal_hold_active boolean,
  legal_hold_reason text,

  -- What survives the request and why, per retained record class.
  retention_treatment jsonb not null default '{}'::jsonb,

  -- Matter deletion only.
  target_matter_item_id uuid,

  completed_at timestamptz,
  completion_receipt jsonb,
  receipt_code text,

  failure_code text,
  last_error text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint participant_privacy_requests_type_check check (
    request_type in ('export', 'matter_deletion', 'account_deletion')
  ),
  constraint participant_privacy_requests_status_check check (
    status in ('pending', 'in_progress', 'completed', 'failed', 'blocked_legal_hold', 'cancelled')
  ),
  constraint participant_privacy_requests_idempotency_shape_check
    check (length(trim(idempotency_key)) between 8 and 200),
  constraint participant_privacy_requests_retention_object_check
    check (jsonb_typeof(retention_treatment) = 'object'),
  constraint participant_privacy_requests_receipt_object_check
    check (completion_receipt is null or jsonb_typeof(completion_receipt) = 'object'),
  -- A completed request without a receipt is the failure mode this whole table
  -- exists to prevent, so the database refuses to represent one.
  constraint participant_privacy_requests_completed_requires_receipt check (
    status <> 'completed'
    or (completed_at is not null and completion_receipt is not null and receipt_code is not null)
  ),
  -- Destructive work is never recorded without the proof that authorized it.
  constraint participant_privacy_requests_destructive_requires_proof check (
    request_type = 'export'
    or status in ('pending', 'cancelled')
    or (recent_auth_verified_at is not null and recent_auth_proof_hash is not null)
  ),
  constraint participant_privacy_requests_matter_target_check check (
    (request_type = 'matter_deletion') = (target_matter_item_id is not null)
  ),
  constraint participant_privacy_requests_attempts_check check (attempt_count >= 0)
);

-- Idempotency, stated as a key rather than as application discipline. A retried
-- submit finds the same request instead of starting a second erasure.
create unique index if not exists participant_privacy_requests_idempotency_uk
  on public.participant_privacy_requests(user_id, request_type, idempotency_key);

create unique index if not exists participant_privacy_requests_receipt_code_uk
  on public.participant_privacy_requests(receipt_code)
  where receipt_code is not null;

-- One recent-auth proof authorizes one request. Replaying it at a second
-- request — a different matter, or the account — is refused here.
create unique index if not exists participant_privacy_requests_proof_uk
  on public.participant_privacy_requests(recent_auth_proof_hash)
  where recent_auth_proof_hash is not null;

-- At most one live account deletion per participant.
create unique index if not exists participant_privacy_requests_live_account_deletion_uk
  on public.participant_privacy_requests(user_id)
  where request_type = 'account_deletion' and status in ('pending', 'in_progress');

create index if not exists participant_privacy_requests_user_idx
  on public.participant_privacy_requests(user_id, requested_at desc);

create index if not exists participant_privacy_requests_resumable_idx
  on public.participant_privacy_requests(status, requested_at)
  where status in ('pending', 'in_progress');

alter table public.participant_privacy_requests enable row level security;

-- A participant reads their own requests: that is how they see status, the
-- retention explanation, and the completion receipt. They never write here;
-- every write goes through the security-definer functions below, so a client
-- cannot mark its own request complete or forge a proof.
drop policy if exists "participant reads own privacy requests" on public.participant_privacy_requests;
create policy "participant reads own privacy requests"
  on public.participant_privacy_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.participant_privacy_requests from anon;
revoke all on table public.participant_privacy_requests from authenticated;
grant select on table public.participant_privacy_requests to authenticated;

comment on table public.participant_privacy_requests is
  'Durable participant data-rights workflow: export, single-matter deletion, account deletion. Idempotent per (user, type, key). Participants read their own rows; only security-definer functions write.';
comment on column public.participant_privacy_requests.user_id is
  'Deliberately not a foreign key to auth.users: an account-deletion receipt must survive deletion of the auth user it describes.';
comment on column public.participant_privacy_requests.recent_auth_proof_hash is
  'SHA-256 of the recent-auth proof token that authorized this request. Unique across the table, so one proof cannot authorize two erasures.';

-------------------------------------------------------------------------------
-- 3. The step ledger — what makes a partial failure resumable.
-------------------------------------------------------------------------------

create table if not exists public.participant_privacy_request_steps (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.participant_privacy_requests(id) on delete cascade,
  step_key text not null,
  step_order integer not null,
  status text not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  detail jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint participant_privacy_request_steps_status_check check (
    status in ('pending', 'in_progress', 'completed', 'skipped', 'failed')
  ),
  constraint participant_privacy_request_steps_detail_object_check
    check (jsonb_typeof(detail) = 'object'),
  constraint participant_privacy_request_steps_order_check check (step_order > 0),
  constraint participant_privacy_request_steps_attempts_check check (attempt_count >= 0)
);

create unique index if not exists participant_privacy_request_steps_uk
  on public.participant_privacy_request_steps(request_id, step_key);

create index if not exists participant_privacy_request_steps_resume_idx
  on public.participant_privacy_request_steps(request_id, step_order);

alter table public.participant_privacy_request_steps enable row level security;

-- No participant policy. The step ledger names internal systems and processor
-- keys; the participant-facing summary of it is the completion receipt.
revoke all on table public.participant_privacy_request_steps from anon;
revoke all on table public.participant_privacy_request_steps from authenticated;

comment on table public.participant_privacy_request_steps is
  'Ordered, idempotent step ledger for a privacy request. Resume = re-run from the first step that is not completed or skipped.';

-------------------------------------------------------------------------------
-- 4. Tombstones. Freeze, erase, and refuse to come back.
-------------------------------------------------------------------------------

create table if not exists public.participant_account_tombstones (
  user_id uuid primary key,
  subject_pseudonym text not null,
  request_id uuid,
  frozen_at timestamptz not null default now(),
  sessions_revoked_at timestamptz,
  deleted_at timestamptz,
  receipt_code text,
  -- The restoration barrier. A database restored from a backup taken before the
  -- erasure brings the participant's rows back with it; this row comes back too,
  -- and the guard below then refuses every write for the account, and the
  -- application refuses the sign-in. Restoring the data does not restore the
  -- account.
  restoration_barrier boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint participant_account_tombstones_pseudonym_shape_check
    check (subject_pseudonym ~ '^[0-9a-f]{64}$'),
  constraint participant_account_tombstones_deleted_requires_receipt
    check (deleted_at is null or receipt_code is not null)
);

create unique index if not exists participant_account_tombstones_pseudonym_uk
  on public.participant_account_tombstones(subject_pseudonym);

alter table public.participant_account_tombstones enable row level security;

revoke all on table public.participant_account_tombstones from anon;
revoke all on table public.participant_account_tombstones from authenticated;

comment on table public.participant_account_tombstones is
  'Freeze and erasure record for a participant account. Carries no foreign key to auth.users on purpose: it must survive that row, and it is what makes a restore-from-backup refuse to recreate the account.';

create or replace function public.participant_account_is_blocked(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.participant_account_tombstones t
    where t.user_id = p_user_id
      and t.restoration_barrier
  );
$$;

comment on function public.participant_account_is_blocked(uuid) is
  'True once an account is frozen or erased. Frozen and erased are both blocked: a freeze is the first step of an erasure and must stop writes immediately.';

-- The restoration barrier, enforced in the database rather than only in the
-- application. Restoring a backup replays participant rows; this refuses them.
create or replace function public.reject_tombstoned_participant_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is not null and public.participant_account_is_blocked(new.user_id) then
    raise exception 'participant account % is frozen or erased; new records are refused', new.user_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- INSERT only, and the reason is the erasure itself.
--
-- The barrier this trigger enforces is "no NEW record may appear for an erased
-- account". Extending it to UPDATE looked stricter and was in fact broken: the
-- erasure pipeline freezes the account as its FIRST step and then spends nine
-- more steps updating the very rows it is about to remove — clearing reminders,
-- invalidating downloads, de-identifying a matter held under a preservation
-- order. An UPDATE guard makes an account, once frozen, impossible to finish
-- erasing, which is the worst of both outcomes: frozen forever and never
-- deleted.
--
-- Nothing is lost by narrowing it. An UPDATE requires a row that already exists
-- and, for a participant, an RLS policy that requires auth.uid() to match its
-- owner — and a frozen or erased account reaches no authenticated surface,
-- because every one of them checks the tombstone on the way in. What the
-- database is asked to stop here is the case the application cannot see: rows
-- arriving from a restored backup, or a write path that predates the tombstone.
-- Those are inserts.
drop trigger if exists reject_tombstoned_consumer_briefcase_writes on public.consumer_briefcase_items;
create trigger reject_tombstoned_consumer_briefcase_writes
before insert on public.consumer_briefcase_items
for each row
execute function public.reject_tombstoned_participant_write();

-------------------------------------------------------------------------------
-- 5. Approved processors. Propagation is recorded, not assumed.
-------------------------------------------------------------------------------

create table if not exists public.participant_processor_propagations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.participant_privacy_requests(id) on delete cascade,
  processor_key text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  reference text,
  detail jsonb not null default '{}'::jsonb,

  constraint participant_processor_propagations_status_check check (
    status in ('pending', 'sent', 'acknowledged', 'not_applicable', 'failed')
  ),
  constraint participant_processor_propagations_detail_object_check
    check (jsonb_typeof(detail) = 'object')
);

create unique index if not exists participant_processor_propagations_uk
  on public.participant_processor_propagations(request_id, processor_key);

alter table public.participant_processor_propagations enable row level security;

revoke all on table public.participant_processor_propagations from anon;
revoke all on table public.participant_processor_propagations from authenticated;

comment on table public.participant_processor_propagations is
  'One row per approved downstream processor per erasure request. A processor with no participant personal data is recorded as not_applicable rather than silently omitted.';

-------------------------------------------------------------------------------
-- 6. Write authority. Every mutation above goes through one of these.
-------------------------------------------------------------------------------

create or replace function public.open_participant_privacy_request(
  p_user_id uuid,
  p_request_type text,
  p_idempotency_key text,
  p_subject_pseudonym text,
  p_recent_auth_verified_at timestamptz,
  p_recent_auth_method text,
  p_recent_auth_proof_hash text,
  p_target_matter_item_id uuid,
  p_step_keys text[]
)
returns public.participant_privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.participant_privacy_requests;
  v_key text;
  v_index integer := 0;
begin
  if p_user_id is null then
    raise exception 'a privacy request requires an owner';
  end if;

  -- Idempotent open. A retry with the same key returns the existing request
  -- untouched, which is what makes a double-submitted deletion safe.
  select * into v_request
  from public.participant_privacy_requests
  where user_id = p_user_id
    and request_type = p_request_type
    and idempotency_key = p_idempotency_key;

  if not found then
    insert into public.participant_privacy_requests (
      user_id, subject_pseudonym, request_type, idempotency_key, status,
      recent_auth_verified_at, recent_auth_method, recent_auth_proof_hash,
      target_matter_item_id
    ) values (
      p_user_id, p_subject_pseudonym, p_request_type, p_idempotency_key, 'pending',
      p_recent_auth_verified_at, p_recent_auth_method, p_recent_auth_proof_hash,
      p_target_matter_item_id
    )
    returning * into v_request;
  end if;

  if p_step_keys is not null then
    foreach v_key in array p_step_keys loop
      v_index := v_index + 1;
      insert into public.participant_privacy_request_steps (request_id, step_key, step_order)
      values (v_request.id, v_key, v_index)
      on conflict (request_id, step_key) do nothing;
    end loop;
  end if;

  return v_request;
end;
$$;

create or replace function public.record_participant_privacy_legal_hold_check(
  p_request_id uuid,
  p_active boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.participant_privacy_requests
  set legal_hold_checked_at = now(),
      legal_hold_active = p_active,
      legal_hold_reason = p_reason,
      status = case when p_active then 'blocked_legal_hold' else status end,
      updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.record_participant_privacy_step(
  p_request_id uuid,
  p_step_key text,
  p_status text,
  p_detail jsonb,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.participant_privacy_request_steps
  set status = p_status,
      started_at = coalesce(started_at, now()),
      completed_at = case when p_status in ('completed', 'skipped') then now() else completed_at end,
      attempt_count = attempt_count + 1,
      detail = coalesce(p_detail, detail),
      error = p_error,
      updated_at = now()
  where request_id = p_request_id
    and step_key = p_step_key;

  update public.participant_privacy_requests
  set status = case
        when status in ('pending', 'in_progress') and p_status = 'failed' then 'failed'
        when status in ('pending', 'failed') then 'in_progress'
        else status
      end,
      failure_code = case when p_status = 'failed' then p_step_key else failure_code end,
      last_error = case when p_status = 'failed' then p_error else last_error end,
      updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.complete_participant_privacy_request(
  p_request_id uuid,
  p_receipt jsonb,
  p_receipt_code text,
  p_retention_treatment jsonb
)
returns public.participant_privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.participant_privacy_requests;
  v_open integer;
begin
  select count(*) into v_open
  from public.participant_privacy_request_steps
  where request_id = p_request_id
    and status not in ('completed', 'skipped');

  if v_open > 0 then
    raise exception 'privacy request % has % step(s) still open', p_request_id, v_open;
  end if;

  update public.participant_privacy_requests
  set status = 'completed',
      completed_at = now(),
      completion_receipt = p_receipt,
      receipt_code = p_receipt_code,
      retention_treatment = coalesce(p_retention_treatment, retention_treatment),
      failure_code = null,
      last_error = null,
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.freeze_participant_account(
  p_user_id uuid,
  p_subject_pseudonym text,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.participant_account_tombstones (user_id, subject_pseudonym, request_id)
  values (p_user_id, p_subject_pseudonym, p_request_id)
  on conflict (user_id) do update
    set request_id = coalesce(public.participant_account_tombstones.request_id, excluded.request_id),
        restoration_barrier = true,
        updated_at = now();
end;
$$;

create or replace function public.finalize_participant_account_tombstone(
  p_user_id uuid,
  p_receipt_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.participant_account_tombstones
  set deleted_at = coalesce(deleted_at, now()),
      receipt_code = coalesce(receipt_code, p_receipt_code),
      restoration_barrier = true,
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'no tombstone to finalize for participant %', p_user_id;
  end if;
end;
$$;

create or replace function public.mark_participant_sessions_revoked(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.participant_account_tombstones
  set sessions_revoked_at = coalesce(sessions_revoked_at, now()),
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

-------------------------------------------------------------------------------
-- 7. The two narrow guard relaxations, plus the erasure functions that use them.
-------------------------------------------------------------------------------

create or replace function public.rcap_participant_erasure_authority()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('rcap.participant_erasure_authority', true), '');
$$;

-- Phase 52's binding-immutability trigger, re-created with one exception: the
-- erasure authority may replace consumer_auth_user_id with a pseudonym. Every
-- other rule is byte-for-byte the rule phase 52 wrote, and the item binding,
-- person and matter stay immutable even under the erasure authority.
create or replace function public.packet_render_jobs_consumer_binding_immutable()
returns trigger
language plpgsql
as $immutable$
declare
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
begin
  if tg_op = 'UPDATE' then
    if old.consumer_briefcase_item_id is not null
       and new.consumer_briefcase_item_id is distinct from old.consumer_briefcase_item_id then
      raise exception 'packet_render_jobs: consumer_briefcase_item_id is immutable once set';
    end if;
    if old.consumer_auth_user_id is not null
       and new.consumer_auth_user_id is distinct from old.consumer_auth_user_id
       and not v_erasure then
      raise exception 'packet_render_jobs: consumer_auth_user_id is immutable once set';
    end if;
    if old.person_id is not null and new.person_id is distinct from old.person_id then
      raise exception 'packet_render_jobs: person_id is immutable once set';
    end if;
    if old.matter_id is not null and new.matter_id is distinct from old.matter_id then
      raise exception 'packet_render_jobs: matter_id is immutable once set';
    end if;
  end if;
  return new;
end;
$immutable$;

-- Phase 50's delivery-event guard, re-created with one exception: the erasure
-- authority may rewrite actor_user_id to a pseudonym. No event may be inserted
-- outside record_packet_delivery_event, none may be deleted, and no other column
-- may change — so the count and content of delivery evidence are unchanged.
create or replace function public.guard_packet_delivery_events()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.rcap_packet_mutation_authority() <> 'record_packet_delivery_event' then
      raise exception 'packet_delivery_events: events are recorded only by record_packet_delivery_event';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE'
     and public.rcap_participant_erasure_authority() = 'erase_participant_identifiers'
     and new.id = old.id
     and new.render_job_id = old.render_job_id
     and new.event_type = old.event_type
     and new.request_context = old.request_context
     and new.created_at = old.created_at then
    return new;
  end if;

  raise exception 'packet_delivery_events: append-only; % is never permitted', tg_op;
end;
$$;

-- Phase 55's consumption-binding guard, re-created with one exception: the
-- erasure authority may replace consumer_auth_user_id with a pseudonym. The
-- binding stays immutable for every other column and every other caller, and
-- the amount, currency, product and receipt reference — the fields accounting
-- actually reads — cannot move at all.
create or replace function public.consumer_payment_consumption_binding_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
declare
  v_valid boolean;
  v_reason text;
  v_session text;
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
begin
  if tg_op = 'UPDATE' then
    if new.consumer_briefcase_item_id is distinct from old.consumer_briefcase_item_id
       or (new.consumer_auth_user_id is distinct from old.consumer_auth_user_id and not v_erasure)
       or new.provider_event_id is distinct from old.provider_event_id
       or new.person_id is distinct from old.person_id
       or new.matter_id is distinct from old.matter_id
       or new.product_id is distinct from old.product_id
       or new.checkout_session_id is distinct from old.checkout_session_id
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency then
      raise exception 'consumer payment consumption binding is immutable';
    end if;
    return new;
  end if;

  select a.valid, a.reason, b.checkout_session_id
    into v_valid, v_reason, v_session
    from public.consumer_briefcase_items b
    cross join lateral public.consumer_packet_payment_authority(
      new.consumer_briefcase_item_id,
      new.consumer_auth_user_id,
      public.expungement_packet_product_id(),
      new.person_id,
      new.matter_id
    ) a
   where b.id = new.consumer_briefcase_item_id;
  if not coalesce(v_valid, false) then
    raise exception 'consumer payment consumption binding refused (%)', coalesce(v_reason, 'unknown');
  end if;
  new.product_id := public.expungement_packet_product_id();
  new.checkout_session_id := v_session;
  new.amount_cents := 5000;
  new.currency := 'usd';
  return new;
end;
$guard$;

-- Phase 50's transition guard, re-created with one exception: a QUEUED job may
-- be failed under the cancel_participant_render_jobs authority. A queued job has
-- no fencing token, so fail_packet_render_job cannot reach it; without this an
-- erasure would leave work queued against a deleted participant.
create or replace function public.guard_packet_render_job_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_authority text := public.rcap_packet_mutation_authority();
begin
  if new.status <> old.status then
    if not (
      (old.status = 'queued' and new.status in ('claimed', 'failed'))
      or (old.status = 'claimed' and new.status in ('rendering', 'failed', 'queued'))
      or (old.status = 'rendering' and new.status in ('validating', 'failed'))
      or (old.status = 'validating' and new.status in ('artifact_validated', 'failed'))
      or (old.status = 'artifact_validated' and new.status = 'delivered')
      or (old.status = 'failed' and new.status = 'queued')
    ) then
      raise exception 'packet_render_jobs: illegal transition % -> %', old.status, new.status;
    end if;

    if old.status = 'queued' and new.status = 'claimed'
       and v_authority <> 'claim_packet_render_job' then
      raise exception 'packet_render_jobs: claiming requires claim_packet_render_job';
    end if;

    if new.status = 'artifact_validated'
       and v_authority <> 'finalize_packet_render_job' then
      raise exception 'packet_render_jobs: artifact_validated is written only by finalize_packet_render_job';
    end if;

    if new.status = 'delivered'
       and v_authority <> 'record_packet_delivery_event' then
      raise exception 'packet_render_jobs: delivered is written only by record_packet_delivery_event';
    end if;

    if old.status = 'failed' and new.status = 'queued' then
      if v_authority not in ('requeue_retryable_packet_render_jobs', 'requeue_packet_render_job_manual') then
        raise exception 'packet_render_jobs: failed jobs return to queued only through a requeue function';
      end if;
      if old.failure_disposition = 'terminal'
         and v_authority <> 'requeue_packet_render_job_manual' then
        raise exception 'packet_render_jobs: a terminal failure is requeued only manually with recorded authorization';
      end if;
    end if;

    if new.status in ('rendering', 'validating')
       and v_authority not in ('start_packet_render', 'start_packet_validation') then
      raise exception 'packet_render_jobs: worker transitions require their canonical functions';
    end if;

    if new.status = 'failed'
       and v_authority not in (
         'fail_packet_render_job',
         'release_expired_packet_render_claims',
         'finalize_packet_render_job',
         'cancel_participant_render_jobs'
       ) then
      raise exception 'packet_render_jobs: failure is recorded only through its canonical functions';
    end if;

    -- Only an unstarted job may be cancelled this way. Anything a worker has
    -- already touched still belongs to the worker's own failure path.
    if v_authority = 'cancel_participant_render_jobs' and old.status <> 'queued' then
      raise exception 'packet_render_jobs: participant cancellation applies only to a queued job';
    end if;

    new.claimed_at            := case when new.status = 'claimed'            then now() else new.claimed_at end;
    new.rendering_at          := case when new.status = 'rendering'          then now() else new.rendering_at end;
    new.validating_at         := case when new.status = 'validating'         then now() else new.validating_at end;
    new.artifact_validated_at := case when new.status = 'artifact_validated' then now() else new.artifact_validated_at end;
    new.delivered_at          := case when new.status = 'delivered'          then now() else new.delivered_at end;

    if new.status = 'queued' then
      new.claimed_by := null;
      new.claimed_at := null;
    end if;
  end if;

  if (new.delivery_eligibility is distinct from old.delivery_eligibility
      or new.accounting_result is distinct from old.accounting_result
      or new.credit_ledger_id is distinct from old.credit_ledger_id)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: accounting fields are written only by finalize_packet_render_job';
  end if;

  if (new.output_storage_path is distinct from old.output_storage_path
      or new.output_sha256 is distinct from old.output_sha256
      or new.normalized_output_sha256 is distinct from old.normalized_output_sha256
      or new.container_digest is distinct from old.container_digest)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: artifact evidence is written only by finalize_packet_render_job';
  end if;

  if old.partner_id is not null and new.partner_id is distinct from old.partner_id then
    raise exception 'packet_render_jobs: partner_id is immutable';
  end if;
  if old.person_id is not null and new.person_id is distinct from old.person_id then
    raise exception 'packet_render_jobs: person_id is immutable';
  end if;
  if old.matter_id is not null and new.matter_id is distinct from old.matter_id then
    raise exception 'packet_render_jobs: matter_id is immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- A queued render for an erased participant is cancelled, and the reason is
-- recorded honestly rather than borrowed from a renderer failure code.
alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_error_code_check;
alter table public.packet_render_jobs
  add constraint packet_render_jobs_error_code_check check (
    error_code is null or error_code in (
      'source_not_whitelisted',
      'profile_unknown',
      'render_failed',
      'invalid_pdf_output',
      'page_count_mismatch',
      'protected_field_populated',
      'storage_write_failed',
      'storage_readback_failed',
      'checksum_mismatch',
      'timeout',
      'worker_crashed',
      'participant_deletion_cancelled'
    )
  );

-- Scoped by owner, and optionally by one matter. The matter scope is not
-- decoration: a single-matter deletion that cancelled every queued render on the
-- account would destroy work belonging to matters the participant asked to keep.
create or replace function public.cancel_participant_queued_render_jobs(
  p_user_id uuid,
  p_briefcase_item_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  perform set_config('rcap.packet_mutation_authority', 'cancel_participant_render_jobs', true);
  update public.packet_render_jobs
  set status = 'failed',
      failure_disposition = 'terminal',
      error_code = 'participant_deletion_cancelled',
      last_error_detail = 'Cancelled by a participant data deletion request.',
      fencing_token = null,
      claim_expires_at = null,
      next_attempt_at = null
  where consumer_auth_user_id = p_user_id
    and status = 'queued'
    and (p_briefcase_item_id is null or consumer_briefcase_item_id = p_briefcase_item_id);
  get diagnostics v_count = row_count;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;

-- Replaces every direct participant identifier in the retained accounting and
-- delivery records with the keyed pseudonym. Amounts, counts, event types and
-- ledger rows are untouched, so the books still balance after an erasure.
--
-- p_briefcase_item_id narrows the sweep to one matter, and a single-matter
-- deletion MUST pass it. Without the narrowing, deleting one matter would
-- unlink the payment records of every other matter on the account — matters the
-- participant explicitly chose to keep — and they would then have no readable
-- payment history for work they still hold.
create or replace function public.pseudonymize_participant_retained_records(
  p_user_id uuid,
  p_pseudonym_user_id uuid,
  p_briefcase_item_id uuid default null
)
returns table (
  render_jobs integer,
  payment_consumptions integer,
  delivery_events integer,
  analytics_events integer,
  support_items integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jobs integer := 0;
  v_consumptions integer := 0;
  v_delivery integer := 0;
  v_analytics integer := 0;
  v_support integer := 0;
  v_job_ids uuid[];
begin
  if p_user_id is null or p_pseudonym_user_id is null then
    raise exception 'pseudonymization requires both the subject and its pseudonym';
  end if;
  if p_user_id = p_pseudonym_user_id then
    raise exception 'the pseudonym must differ from the identifier it replaces';
  end if;

  perform set_config('rcap.participant_erasure_authority', 'erase_participant_identifiers', true);

  -- Collected BEFORE the jobs are rewritten: once consumer_auth_user_id carries
  -- the pseudonym, the delivery events can no longer be found by the account id.
  select coalesce(array_agg(id), '{}'::uuid[])
    into v_job_ids
    from public.packet_render_jobs
   where consumer_auth_user_id = p_user_id
     and (p_briefcase_item_id is null or consumer_briefcase_item_id = p_briefcase_item_id);

  update public.packet_render_jobs
  set consumer_auth_user_id = p_pseudonym_user_id
  where id = any (v_job_ids);
  get diagnostics v_jobs = row_count;

  update public.consumer_packet_payment_consumption
  set consumer_auth_user_id = p_pseudonym_user_id
  where consumer_auth_user_id = p_user_id
    and (p_briefcase_item_id is null or consumer_briefcase_item_id = p_briefcase_item_id);
  get diagnostics v_consumptions = row_count;

  if to_regclass('public.packet_delivery_events') is not null then
    update public.packet_delivery_events
    set actor_user_id = p_pseudonym_user_id
    where actor_user_id = p_user_id
      and (p_briefcase_item_id is null or render_job_id = any (v_job_ids));
    get diagnostics v_delivery = row_count;
  end if;

  -- Analytics events carry no matter, so they are account-scoped work only.
  if p_briefcase_item_id is null and to_regclass('public.web_analytics_events') is not null then
    update public.web_analytics_events
    set user_id = null
    where user_id = p_user_id;
    get diagnostics v_analytics = row_count;
  end if;

  if to_regclass('public.legalease_os_support_items') is not null then
    delete from public.legalease_os_support_items
    where user_id = p_user_id
      and (p_briefcase_item_id is null or briefcase_item_id = p_briefcase_item_id);
    get diagnostics v_support = row_count;
  end if;

  perform set_config('rcap.participant_erasure_authority', '', true);

  return query select v_jobs, v_consumptions, v_delivery, v_analytics, v_support;
end;
$$;

comment on function public.pseudonymize_participant_retained_records(uuid, uuid, uuid) is
  'Replaces direct participant identifiers in retained payment, delivery and audit records with a keyed pseudonym. Never changes an amount, a count, an event type, or a ledger row.';

-------------------------------------------------------------------------------
-- 8. Grants.
--
-- Revoking from `anon` and `authenticated` is NOT enough, and assuming it was
-- is how a function that erases a participant stays callable by a browser role.
-- PostgreSQL grants EXECUTE on a newly created function to PUBLIC by default,
-- and PUBLIC includes every role — so a revoke aimed at the two browser roles
-- leaves the default grant standing underneath it and changes nothing. The
-- revoke has to name PUBLIC. The browser roles are then named as well, because
-- a role may hold a direct grant of its own from an earlier deployment and a
-- PUBLIC revoke does not touch that.
--
-- What is left afterwards: the participant-facing surface is the SELECT policy
-- on participant_privacy_requests, and nothing else. Every function below is
-- reachable only by the service role the server holds.
-------------------------------------------------------------------------------

do $participant_privacy_grants$
declare
  v_function text;
  v_role text;
  v_functions text[] := array[
    'public.open_participant_privacy_request(uuid, text, text, text, timestamptz, text, text, uuid, text[])',
    'public.complete_participant_privacy_request(uuid, jsonb, text, jsonb)',
    'public.record_participant_privacy_step(uuid, text, text, jsonb, text)',
    'public.record_participant_privacy_legal_hold_check(uuid, boolean, text)',
    'public.freeze_participant_account(uuid, text, uuid)',
    'public.finalize_participant_account_tombstone(uuid, text)',
    'public.mark_participant_sessions_revoked(uuid)',
    'public.cancel_participant_queued_render_jobs(uuid, uuid)',
    'public.pseudonymize_participant_retained_records(uuid, uuid, uuid)',
    'public.participant_account_is_blocked(uuid)',
    'public.rcap_participant_erasure_authority()'
  ];
begin
  foreach v_function in array v_functions loop
    execute format('revoke all on function %s from public', v_function);
    foreach v_role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = v_role) then
        execute format('revoke all on function %s from %I', v_function, v_role);
      end if;
    end loop;
    -- The server's own credential. Named explicitly rather than left to a
    -- default privilege, so the revoke above cannot strand the application.
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', v_function);
    end if;
  end loop;
end
$participant_privacy_grants$;
