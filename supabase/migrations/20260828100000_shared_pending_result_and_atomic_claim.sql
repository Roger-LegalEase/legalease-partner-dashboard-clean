-- Shared pending result and the atomic claim boundary.
--
-- Authority: docs/PRODUCT_CONTRACT.md §7, docs/architecture/adr/ADR-0002.
--
--   Screening may be anonymous. A Briefcase may not be anonymous. A pending
--   result becomes a matter only when it is securely and atomically claimed by
--   the authenticated participant.
--
-- Expungement.ai and RCAP share one pending-result object and one claim service.
-- Nothing here creates a second claim system, and nothing here changes partner
-- dashboard reporting.

begin;

-- ---------------------------------------------------------------------------
-- 1. The pending result becomes the one governed pre-claim object.
-- ---------------------------------------------------------------------------

-- 1a. Two renames that are corrections, not tidying.
--
--   matter_id -> screening_correlation_id
--     Contract §2: a screening correlation ID may exist, but it must not be
--     called matter_id. This column never held a matter. It holds a
--     browser-supplied correlation value used to re-evaluate stored answers, and
--     its old name invited exactly the mistake the contract forbids.
--
--   source_session_id -> anonymous_session_id
--     Same column, correct name. It points at screening_sessions, which is the
--     anonymous session.
--
--   pending_token_hash -> claim_token_hash
--     The column existed and was never written or read; its own comment said
--     "server claims currently use pending_id only". It becomes load-bearing.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consumer_pending_screening_results'
      and column_name = 'matter_id'
  ) then
    alter table public.consumer_pending_screening_results
      rename column matter_id to screening_correlation_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consumer_pending_screening_results'
      and column_name = 'source_session_id'
  ) then
    alter table public.consumer_pending_screening_results
      rename column source_session_id to anonymous_session_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consumer_pending_screening_results'
      and column_name = 'pending_token_hash'
  ) then
    alter table public.consumer_pending_screening_results
      rename column pending_token_hash to claim_token_hash;
  end if;
end
$$;

-- 1b. The fields contract §7 requires and the table did not carry.
alter table public.consumer_pending_screening_results
  add column if not exists status text not null default 'PENDING',
  add column if not exists claimed_matter_id uuid,
  add column if not exists revoked_at timestamptz,
  add column if not exists locale text,
  add column if not exists partner_slug text,
  add column if not exists program_id text,
  add column if not exists event_id uuid,
  add column if not exists campaign_name text,
  add column if not exists access_code_id uuid,
  add column if not exists consent_grant_id uuid,
  add column if not exists candidate_route_context jsonb not null default '{}'::jsonb;

-- 1c. Reconcile the rows that already exist.
--
--     Rows already claimed under the old scheme get their matter link back where
--     it is provable: the current claim route writes the pending id into
--     consumer_briefcase_items.source_session_id for DTC claims, so that link is
--     evidence, not a guess. Only a unique match counts.
update public.consumer_pending_screening_results p
   set claimed_matter_id = m.id
  from public.consumer_briefcase_items m
 where p.claimed_user_id is not null
   and p.claimed_matter_id is null
   and m.user_id = p.claimed_user_id
   and m.source_session_id = p.pending_id::text
   and (select count(*) from public.consumer_briefcase_items m2
         where m2.user_id = p.claimed_user_id
           and m2.source_session_id = p.pending_id::text) = 1;

update public.consumer_pending_screening_results
   set status = 'CLAIMED'
 where claimed_user_id is not null
   and claimed_matter_id is not null
   and claimed_at is not null
   and status <> 'CLAIMED';

--     Everything still PENDING that carries no token hash cannot be claimed
--     under the new rule, because possession of pending_id no longer authorizes
--     anything. Revoke those rather than fabricating tokens for them. The
--     exposure window is bounded by the 24-hour claim window the table already
--     enforces; the alternative is keeping the pending_id-is-authorization path
--     alive, which is the defect this migration exists to close.
update public.consumer_pending_screening_results
   set status = 'REVOKED',
       revoked_at = now()
 where status = 'PENDING'
   and (claim_token_hash is null or claimed_user_id is not null);

-- 1d. Shape constraints.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_status_check') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_status_check
      check (status in ('PENDING', 'CLAIMED', 'EXPIRED', 'REVOKED'));
  end if;

  -- A PENDING row without a token hash would be claimable by id alone.
  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_pending_needs_token') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_pending_needs_token
      check (status <> 'PENDING' or claim_token_hash is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_token_shape') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_token_shape
      check (claim_token_hash is null or claim_token_hash ~ '^[0-9a-f]{64}$');
  end if;

  -- Two one-directional checks rather than a biconditional. Together they make
  -- "the matter was written but the claim state was not" a row the database
  -- cannot hold, while still tolerating a pre-migration row that recorded a
  -- claiming user but whose matter link could not be proven in 1c.
  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_claim_shape') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_claim_shape
      check (
        status <> 'CLAIMED'
        or (claimed_user_id is not null and claimed_matter_id is not null and claimed_at is not null)
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_matter_implies_claimed') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_matter_implies_claimed
      check (claimed_matter_id is null or status = 'CLAIMED');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'consumer_pending_screening_results_claimed_matter_fkey') then
    alter table public.consumer_pending_screening_results
      add constraint consumer_pending_screening_results_claimed_matter_fkey
      foreign key (claimed_matter_id) references public.consumer_briefcase_items(id) on delete set null;
  end if;
end
$$;

create index if not exists consumer_pending_screening_results_status_idx
  on public.consumer_pending_screening_results (status, expires_at);

comment on column public.consumer_pending_screening_results.claim_token_hash is
  'SHA-256 hex of the single-use opaque claim token. The token itself is returned to the browser exactly once and is never stored. pending_id authorizes nothing on its own.';
comment on column public.consumer_pending_screening_results.screening_correlation_id is
  'Correlation identifier for the evaluation that produced this preliminary result. It is not a matter identifier and must never be treated as durable authority.';
comment on column public.consumer_pending_screening_results.anonymous_session_id is
  'The anonymous screening_sessions row this preliminary result came from.';
comment on column public.consumer_pending_screening_results.status is
  'PENDING | CLAIMED | EXPIRED | REVOKED. A pending result holds no owner, Briefcase, entitlement, payment, artifact or verification snapshot.';

-- ---------------------------------------------------------------------------
-- 2. The canonical matter gains its idempotency key.
--
--    ADR-0002 Decision 1: consumer_briefcase_items is the canonical matter.
--    clinic_cases.matter_id and packet_render_jobs.matter_id already reference
--    it, and it already has user_id NOT NULL with owner-scoped RLS.
--
--    Deliberately no foreign key to the pending table: pending rows are
--    short-lived and are deleted or de-identified by retention, and the matter
--    must outlive them.
-- ---------------------------------------------------------------------------

alter table public.consumer_briefcase_items
  add column if not exists source_pending_result_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consumer_briefcase_items_source_pending_result_id_key') then
    alter table public.consumer_briefcase_items
      add constraint consumer_briefcase_items_source_pending_result_id_key
      unique (source_pending_result_id);
  end if;
end
$$;

comment on column public.consumer_briefcase_items.source_pending_result_id is
  'The pending result this matter was claimed from. UNIQUE: one pending result can produce exactly one matter, which is what makes two tabs, two auth callbacks and a refresh mid-claim converge.';

-- ---------------------------------------------------------------------------
-- 3. Append-only claim audit.
--
--    Redacted by construction: no answers, no names, no token, no signed URL.
-- ---------------------------------------------------------------------------

create table if not exists public.participant_claim_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  event text not null check (event in (
    'claim_succeeded',
    'claim_idempotent_replay',
    'claim_denied_other_user',
    'claim_denied_expired',
    'claim_denied_revoked',
    'claim_denied_invalid_token',
    'claim_denied_not_found',
    'claim_denied_product_mismatch',
    -- A required post-claim obligation that did not complete. The matter is
    -- durable and owned; this row is how the obligation stays visible and
    -- retryable instead of being lost with the request that dropped it.
    'clinic_follow_up_outstanding'
  )),
  pending_result_id uuid,
  matter_id uuid,
  actor_user_id uuid,
  product text,
  jurisdiction text,
  partner_slug text,
  event_id uuid,
  request_id text,
  detail jsonb not null default '{}'::jsonb,
  constraint participant_claim_events_detail_object check (jsonb_typeof(detail) = 'object')
);

create index if not exists participant_claim_events_pending_idx
  on public.participant_claim_events (pending_result_id, occurred_at desc);
create index if not exists participant_claim_events_actor_idx
  on public.participant_claim_events (actor_user_id, occurred_at desc);

alter table public.participant_claim_events enable row level security;

-- Append-only in the strongest sense the database can express: even the table
-- owner and a SECURITY DEFINER function cannot rewrite history here.
create or replace function public.participant_claim_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'participant_claim_events is append-only';
end
$$;

drop trigger if exists participant_claim_events_no_update on public.participant_claim_events;
create trigger participant_claim_events_no_update
  before update or delete on public.participant_claim_events
  for each row execute function public.participant_claim_events_append_only();

comment on table public.participant_claim_events is
  'Append-only redacted audit of pending-result claim attempts. Never contains answers, participant identity beyond the auth user id, or the claim token.';

-- ---------------------------------------------------------------------------
-- 4. The atomic claim transaction.
--
--    Contract §7. One function, one transaction, row lock first.
--
--    Denials RETURN an outcome rather than raising. A raised exception rolls
--    back the audit row written to record the denial, and §15 requires claims to
--    produce audit evidence. Only genuine internal faults raise.
-- ---------------------------------------------------------------------------

-- The browser submits one opaque value and nothing else. The pending id is
-- resolved server-side from the token hash, so it never leaves the server and
-- there is no identifier to enumerate.
create or replace function public.claim_pending_screening_result(
  p_claim_token text,
  p_user_id uuid,
  p_matter jsonb,
  p_request_id text default null
)
returns table (matter_id uuid, outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pending public.consumer_pending_screening_results%rowtype;
  v_hash text;
  v_matter_id uuid;
  v_owner uuid;
  v_pending_id uuid;
begin
  -- 1. Require an authenticated participant. The caller proves the session; this
  --    function refuses to act without a user id under any circumstance.
  if p_user_id is null then
    raise exception 'claim_requires_authenticated_participant' using errcode = '28000';
  end if;

  if p_claim_token is null or p_claim_token !~ '^[A-Za-z0-9_-]{32,200}$' then
    insert into public.participant_claim_events (event, actor_user_id, request_id)
      values ('claim_denied_invalid_token', p_user_id, p_request_id);
    return query select null::uuid, 'denied_invalid_token'::text;
    return;
  end if;

  -- 2. Resolve and lock the pending result by the hash of the presented token.
  --    Every later check reads a row no other claimant can move underneath it.
  v_hash := encode(sha256(convert_to(p_claim_token, 'utf8')), 'hex');

  select * into v_pending
    from public.consumer_pending_screening_results
   where claim_token_hash = v_hash
     for update;

  if not found then
    -- A wrong token and an unknown pending result are the same answer on
    -- purpose: neither tells the caller whether a result exists.
    insert into public.participant_claim_events (event, actor_user_id, request_id)
      values ('claim_denied_invalid_token', p_user_id, p_request_id);
    return query select null::uuid, 'denied_invalid_token'::text;
    return;
  end if;

  v_pending_id := v_pending.pending_id;

  if v_pending.status = 'REVOKED' then
    insert into public.participant_claim_events
      (event, pending_result_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
      values ('claim_denied_revoked', v_pending_id, p_user_id, v_pending.product,
              v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
    return query select null::uuid, 'denied_revoked'::text;
    return;
  end if;

  -- 4. Existing claim state, checked before expiry on purpose. Once a pending
  --    result is claimed the matter is durable and the claim window governs
  --    claiming, not owning: an owner who returns after 24 hours must land on
  --    their matter, not be told the result expired.
  if v_pending.status = 'CLAIMED' then
    if v_pending.claimed_user_id = p_user_id then
      insert into public.participant_claim_events
        (event, pending_result_id, matter_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
        values ('claim_idempotent_replay', v_pending_id, v_pending.claimed_matter_id, p_user_id,
                v_pending.product, v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
      return query select v_pending.claimed_matter_id, 'idempotent_replay'::text;
      return;
    end if;

    insert into public.participant_claim_events
      (event, pending_result_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
      values ('claim_denied_other_user', v_pending_id, p_user_id, v_pending.product,
              v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
    return query select null::uuid, 'denied_other_user'::text;
    return;
  end if;

  -- 5. Expiration.
  if v_pending.expires_at <= now() or v_pending.status = 'EXPIRED' then
    update public.consumer_pending_screening_results
       set status = 'EXPIRED'
     where pending_id = v_pending_id
       and status = 'PENDING';
    insert into public.participant_claim_events
      (event, pending_result_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
      values ('claim_denied_expired', v_pending_id, p_user_id, v_pending.product,
              v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
    return query select null::uuid, 'denied_expired'::text;
    return;
  end if;

  -- 6. Product and channel. A partner-attributed pending result may not be
  --    claimed through the consumer channel and the reverse, because the
  --    entitlement posture of the resulting matter differs.
  if coalesce(p_matter ->> 'product', v_pending.product) is distinct from v_pending.product then
    insert into public.participant_claim_events
      (event, pending_result_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
      values ('claim_denied_product_mismatch', v_pending_id, p_user_id, v_pending.product,
              v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
    return query select null::uuid, 'denied_product_mismatch'::text;
    return;
  end if;

  -- 7. Create exactly one participant-owned matter, keyed by the pending result.
  --    ON CONFLICT DO NOTHING closes any race that slipped the row lock: the
  --    loser reads the winner's matter instead of creating a second one.
  insert into public.consumer_briefcase_items (
    user_id,
    item_type,
    jurisdiction,
    pathway_label,
    result_code,
    packet_type,
    payment_allowed,
    status,
    summary_json,
    next_steps_json,
    artifact_refs_json,
    payment_status,
    amount_cents,
    packet_status,
    reminder_at,
    source_session_id,
    source_pending_result_id
  )
  values (
    p_user_id,
    coalesce(p_matter ->> 'item_type', 'result'),
    p_matter ->> 'jurisdiction',
    nullif(p_matter ->> 'pathway_label', ''),
    nullif(p_matter ->> 'result_code', ''),
    nullif(p_matter ->> 'packet_type', ''),
    coalesce((p_matter ->> 'payment_allowed')::boolean, false),
    p_matter ->> 'status',
    coalesce(p_matter -> 'summary_json', '{}'::jsonb),
    coalesce(p_matter -> 'next_steps_json', '[]'::jsonb),
    coalesce(p_matter -> 'artifact_refs_json', '{}'::jsonb),
    coalesce(p_matter ->> 'payment_status', 'not_applicable'),
    (p_matter ->> 'amount_cents')::integer,
    coalesce(p_matter ->> 'packet_status', 'not_started'),
    (p_matter ->> 'reminder_at')::timestamptz,
    nullif(p_matter ->> 'source_session_id', ''),
    v_pending_id
  )
  on conflict (source_pending_result_id) do nothing
  returning id into v_matter_id;

  if v_matter_id is null then
    select id, user_id into v_matter_id, v_owner
      from public.consumer_briefcase_items
     where source_pending_result_id = v_pending_id;

    if v_matter_id is null then
      raise exception 'claim_matter_persistence_failed' using errcode = 'XX000';
    end if;

    if v_owner is distinct from p_user_id then
      insert into public.participant_claim_events
        (event, pending_result_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
        values ('claim_denied_other_user', v_pending_id, p_user_id, v_pending.product,
                v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);
      return query select null::uuid, 'denied_other_user'::text;
      return;
    end if;
  end if;

  -- 8-9. Mark the pending result claimed. The claim-shape constraint means this
  --      update and the matter above stand or fall together: there is no state
  --      in which a matter exists and the pending result is not claimed.
  update public.consumer_pending_screening_results
     set status = 'CLAIMED',
         claimed_at = now(),
         claimed_user_id = p_user_id,
         claimed_matter_id = v_matter_id
   where pending_id = v_pending_id;

  -- 10. Append-only audit.
  insert into public.participant_claim_events
    (event, pending_result_id, matter_id, actor_user_id, product, jurisdiction, partner_slug, event_id, request_id)
    values ('claim_succeeded', v_pending_id, v_matter_id, p_user_id, v_pending.product,
            v_pending.jurisdiction, v_pending.partner_slug, v_pending.event_id, p_request_id);

  return query select v_matter_id, 'claimed'::text;
end
$$;

comment on function public.claim_pending_screening_result(text, uuid, jsonb, text) is
  'The one atomic claim transaction shared by Expungement.ai and RCAP. Locks the pending result, verifies the single-use claim token, creates exactly one participant-owned matter keyed by source_pending_result_id, marks the pending result claimed and writes an append-only audit event. Denials return an outcome so their audit row survives.';

-- ---------------------------------------------------------------------------
-- 5. Least privilege on the objects this migration owns.
--
--    Scope note: partner dashboard reporting tables are deliberately untouched
--    here; that is the grant-layer workstream. This section only removes access
--    to the pre-claim object and the claim machinery.
-- ---------------------------------------------------------------------------

revoke all on table public.consumer_pending_screening_results from anon, authenticated;
revoke all on table public.participant_claim_events from anon, authenticated;
grant select, insert, update, delete on table public.consumer_pending_screening_results to service_role;
grant select, insert on table public.participant_claim_events to service_role;

revoke all on function public.claim_pending_screening_result(text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.claim_pending_screening_result(text, uuid, jsonb, text) to service_role;

revoke all on function public.participant_claim_events_append_only() from public, anon, authenticated;

commit;
