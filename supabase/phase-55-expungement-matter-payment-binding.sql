-- Phase 55 — Expungement.ai matter-bound packet payment authority
--
-- Extends the Phase 52/53 consumer payment authority. It does not create a
-- second entitlement system. The paid consumer_briefcase_items row remains the
-- payment authority, consumer_packet_payment_consumption remains the immutable
-- post-validation consumption record, and packet_render_jobs remains the
-- durable work queue.
--
-- Applied after: 26, 27, 28, 49, 50, 51, 52, 53, 54.

begin;

-------------------------------------------------------------------------------
-- 1. Canonical product and matter identity.
-------------------------------------------------------------------------------

create or replace function public.expungement_packet_product_id()
returns text
language sql
immutable
set search_path = ''
as $$ select 'expungement_packet'::text $$;

create or replace function public.consumer_matter_id_for_briefcase_item(p_item_id uuid)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_hash text;
  v_variant text;
begin
  if p_item_id is null then return null; end if;
  v_hash := encode(
    extensions.digest(convert_to('rcap:consumer-matter:v1:' || p_item_id::text, 'utf8'), 'sha256'),
    'hex'
  );
  v_variant := to_hex(((get_byte(decode(substr(v_hash, 17, 2), 'hex'), 0) >> 4) & 3) + 8);
  return (
    substr(v_hash, 1, 8) || '-' || substr(v_hash, 9, 4) || '-4' ||
    substr(v_hash, 14, 3) || '-' || v_variant || substr(v_hash, 18, 3) || '-' ||
    substr(v_hash, 21, 12)
  )::uuid;
end;
$$;

-------------------------------------------------------------------------------
-- 2. The existing Briefcase payment row becomes the immediate matter-level
--    entitlement. Browser roles receive no write privilege on these columns.
-------------------------------------------------------------------------------

do $payment_binding_columns$
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    raise notice 'phase-55: consumer_briefcase_items absent; payment binding skipped';
    return;
  end if;

  alter table public.consumer_briefcase_items
    add column if not exists payment_product_id text,
    add column if not exists payment_person_id uuid,
    add column if not exists payment_matter_id uuid;

  alter table public.consumer_briefcase_items
    drop constraint if exists consumer_briefcase_items_payment_product_check,
    add constraint consumer_briefcase_items_payment_product_check
      check (payment_product_id is null or payment_product_id = 'expungement_packet');

  -- Existing paid rows predate literal product/person/matter columns. Preserve
  -- their payment evidence while deriving the same identities the application
  -- has always used for consumer render jobs.
  if to_regclass('public.rcap_persons') is not null then
    insert into public.rcap_persons (partner_slug, match_key)
    select distinct
      'expungement-ai-consumer',
      'consumer:' || encode(
        extensions.digest(convert_to('rcap:consumer-person:v1:' || b.user_id::text, 'utf8'), 'sha256'),
        'hex'
      )
    from public.consumer_briefcase_items b
    where b.payment_status = 'paid'
    on conflict (partner_slug, match_key) do nothing;

    update public.consumer_briefcase_items b
       set payment_product_id = coalesce(b.payment_product_id, 'expungement_packet'),
           payment_person_id = coalesce(b.payment_person_id, p.id),
           payment_matter_id = coalesce(b.payment_matter_id, public.consumer_matter_id_for_briefcase_item(b.id))
      from public.rcap_persons p
     where b.payment_status = 'paid'
       and p.partner_slug = 'expungement-ai-consumer'
       and p.match_key = 'consumer:' || encode(
         extensions.digest(convert_to('rcap:consumer-person:v1:' || b.user_id::text, 'utf8'), 'sha256'),
         'hex'
       );
  end if;

  alter table public.consumer_briefcase_items
    drop constraint if exists consumer_briefcase_items_paid_requires_server_evidence,
    add constraint consumer_briefcase_items_paid_requires_server_evidence
      check (
        payment_status <> 'paid'
        or (
          payment_authority is not null
          and provider_event_id is not null
          and payment_recorded_at is not null
          and amount_cents = 5000
          and currency = 'usd'
          and nullif(trim(coalesce(checkout_session_id, '')), '') is not null
          and payment_product_id = 'expungement_packet'
          and payment_person_id is not null
          and payment_matter_id = public.consumer_matter_id_for_briefcase_item(id)
        )
      );

  create unique index if not exists consumer_briefcase_items_checkout_session_uk
    on public.consumer_briefcase_items(checkout_session_id)
    where checkout_session_id is not null;

  -- One completed screening can become one matter for one user. The
  -- application lookup makes ordinary retries idempotent; this index closes
  -- the concurrent double-claim race underneath it.
  create unique index if not exists consumer_briefcase_items_user_source_session_uk
    on public.consumer_briefcase_items(user_id, source_session_id)
    where source_session_id is not null;

  -- These columns decide whether the row is a DTC packet matter and which
  -- authoritative route it represents. RLS limits a participant to their own
  -- rows; it does not make those route facts safe for that participant to
  -- author. The anonymous screening claim is re-evaluated and inserted by the
  -- service role, while ordinary Briefcase notes/progress remain user-writable.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke insert (
             payment_product_id, payment_person_id, payment_matter_id,
             payment_allowed, item_type, jurisdiction, pathway_label,
             result_code, packet_type, source_session_id
           ),
           update (
             payment_product_id, payment_person_id, payment_matter_id,
             payment_allowed, item_type, jurisdiction, pathway_label,
             result_code, packet_type, source_session_id
           )
      on public.consumer_briefcase_items from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke insert (
             payment_product_id, payment_person_id, payment_matter_id,
             payment_allowed, item_type, jurisdiction, pathway_label,
             result_code, packet_type, source_session_id
           ),
           update (
             payment_product_id, payment_person_id, payment_matter_id,
             payment_allowed, item_type, jurisdiction, pathway_label,
             result_code, packet_type, source_session_id
           )
      on public.consumer_briefcase_items from authenticated;
  end if;
end
$payment_binding_columns$;

-------------------------------------------------------------------------------
-- 3. Replace the Phase 52 writer. A completed provider event must agree with
--    the checkout binding already stored for this exact matter.
-------------------------------------------------------------------------------

drop function if exists public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text
);

create or replace function public.record_consumer_packet_payment(
  p_briefcase_item_id uuid,
  p_payment_status text,
  p_amount_cents integer,
  p_currency text,
  p_payment_provider text,
  p_provider_event_id text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_receipt_url text,
  p_authority text,
  p_recorded_by text,
  p_product_id text,
  p_person_id uuid,
  p_matter_id uuid
)
returns table (
  outcome text,
  briefcase_item_id uuid,
  provider_event_id text
)
language plpgsql
security definer
set search_path = ''
as $record$
declare
  v_found boolean;
  v_owner uuid;
  v_status text;
  v_existing_event text;
  v_existing_session text;
  v_existing_product text;
  v_existing_person uuid;
  v_existing_matter uuid;
  v_existing_amount integer;
  v_existing_currency text;
  v_payment_allowed boolean;
  v_source_session_id text;
  v_item_type text;
  v_jurisdiction text;
  v_pathway_label text;
  v_result_code text;
  v_packet_type text;
  v_item_status text;
  v_sponsored boolean := false;
  v_expected_match_key text;
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    return query select 'no_payment_storage'::text, p_briefcase_item_id, null::text;
    return;
  end if;
  if p_briefcase_item_id is null then
    return query select 'invalid_item'::text, null::uuid, null::text;
    return;
  end if;
  if coalesce(p_authority, '') not in ('server_webhook', 'server_admin') then
    return query select 'invalid_authority'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  execute
    'select true, b.user_id, b.payment_status, b.provider_event_id,
            b.checkout_session_id, b.payment_product_id, b.payment_person_id,
            b.payment_matter_id, b.amount_cents, b.currency,
            b.payment_allowed, b.source_session_id, b.item_type,
            b.jurisdiction, b.pathway_label, b.result_code,
            b.packet_type, b.status
       from public.consumer_briefcase_items b
      where b.id = $1 for update'
  into v_found, v_owner, v_status, v_existing_event, v_existing_session,
       v_existing_product, v_existing_person, v_existing_matter,
       v_existing_amount, v_existing_currency, v_payment_allowed,
       v_source_session_id, v_item_type, v_jurisdiction,
       v_pathway_label, v_result_code, v_packet_type, v_item_status
  using p_briefcase_item_id;

  if not coalesce(v_found, false) then
    return query select 'item_not_found'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  if p_payment_status = 'paid' then
    -- RCAP sponsorship and DTC payment are separate entitlement sources. Even
    -- the security-definer writer must not turn a sponsored item into a paid
    -- consumer item if an application caller is compromised or regresses.
    if v_payment_allowed is not true then
      return query select 'payment_not_allowed'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if v_item_type not in ('result', 'packet')
       or nullif(trim(coalesce(v_jurisdiction, '')), '') is null
       or nullif(trim(coalesce(v_pathway_label, '')), '') is null
       or v_result_code not in ('packet_ready', 'packet_ready_with_caution')
       or v_packet_type not in ('official_pdf_overlay', 'custom_pleading', 'legacy_packet')
       or v_item_status is distinct from 'packet_ready' then
      return query select 'invalid_item'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if to_regclass('public.screening_sessions') is not null
       and exists (
         select 1
           from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'screening_sessions'
            and c.column_name in ('session_id', 'flow_mode', 'partner_slug', 'partner_benefit_active')
          group by c.table_schema, c.table_name
         having count(*) = 4
       ) then
      execute
        'select exists (
           select 1 from public.screening_sessions s
            where s.session_id::text = nullif(trim($1), '''')
              and s.flow_mode = ''rcap''
              and nullif(trim(coalesce(s.partner_slug, '''')), '''') is not null
              and s.partner_benefit_active is true
         )'
      into v_sponsored
      using v_source_session_id;
    end if;

    if coalesce(v_sponsored, false) then
      return query select 'sponsored_item'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if p_amount_cents is distinct from 5000
       or lower(coalesce(p_currency, '')) <> 'usd'
       or nullif(trim(coalesce(p_provider_event_id, '')), '') is null
       or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
       or p_product_id is distinct from 'expungement_packet'
       or p_person_id is null
       or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
      return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    v_expected_match_key := 'consumer:' || encode(
      extensions.digest(convert_to('rcap:consumer-person:v1:' || v_owner::text, 'utf8'), 'sha256'),
      'hex'
    );
    if not exists (
      select 1 from public.rcap_persons p
       where p.id = p_person_id
         and p.partner_slug = 'expungement-ai-consumer'
         and p.match_key = v_expected_match_key
    ) then
      return query select 'invalid_payment_identity'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- The session was stored when Checkout began. A signed event may confirm
    -- that session; it may not swing the entitlement to a different one.
    if v_existing_session is distinct from p_checkout_session_id
       or v_existing_product is distinct from p_product_id
       or v_existing_person is distinct from p_person_id
       or v_existing_matter is distinct from p_matter_id then
      return query select 'checkout_binding_mismatch'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- A second signed event for the same already-paid Session is an idempotent
    -- success. Preserve the first authoritative provider receipt.
    if v_status = 'paid' then
      if v_existing_amount = 5000
         and lower(coalesce(v_existing_currency, '')) = 'usd'
         and nullif(trim(coalesce(v_existing_event, '')), '') is not null then
        return query select 'already_paid'::text, p_briefcase_item_id, v_existing_event;
      end if;
      return query select 'payment_conflict'::text, p_briefcase_item_id, v_existing_event;
      return;
    end if;

    begin
      execute
        'update public.consumer_briefcase_items
            set payment_status = ''paid'', amount_cents = 5000, currency = ''usd'',
                payment_provider = coalesce($2, payment_provider),
                payment_intent_id = coalesce($3, payment_intent_id),
                receipt_url = coalesce($4, receipt_url), provider_event_id = $5,
                payment_authority = $6, payment_recorded_at = now(),
                payment_recorded_by = $7, payment_product_id = $8,
                payment_person_id = $9, payment_matter_id = $10
          where id = $1'
      using p_briefcase_item_id, p_payment_provider, p_payment_intent_id,
            p_receipt_url, trim(p_provider_event_id), p_authority, p_recorded_by,
            p_product_id, p_person_id, p_matter_id;
    exception when unique_violation then
      -- This event or Session belongs to another item. Exact same-item replay
      -- returned already_paid above, so this outcome is never safe to accept.
      return query select 'duplicate_provider_event'::text, p_briefcase_item_id, trim(p_provider_event_id);
      return;
    end;

    return query select 'recorded_paid'::text, p_briefcase_item_id, trim(p_provider_event_id);
    return;
  end if;

  if p_payment_status not in ('not_applicable', 'unpaid', 'refunded') then
    return query select 'invalid_status'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  execute
    'update public.consumer_briefcase_items
        set payment_status = $2, payment_authority = $3,
            payment_recorded_at = now(), payment_recorded_by = $4
      where id = $1'
  using p_briefcase_item_id, p_payment_status, p_authority, p_recorded_by;

  return query select ('recorded_' || p_payment_status)::text, p_briefcase_item_id, v_existing_event;
end;
$record$;

revoke all on function public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text, text, uuid, uuid
) from public, anon, authenticated;

do $grant_payment_writer$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_consumer_packet_payment(
      uuid, text, integer, text, text, text, text, text, text, text, text, text, uuid, uuid
    ) to service_role;
  end if;
end
$grant_payment_writer$;

-------------------------------------------------------------------------------
-- 4. Authority probes. The five-argument form is used before enqueue; the
--    Phase 52 two-argument signature remains for finalization compatibility but
--    now also requires all stored matter-level bindings.
-------------------------------------------------------------------------------

create or replace function public.consumer_packet_payment_authority(
  p_briefcase_item_id uuid,
  p_consumer_auth_user_id uuid,
  p_product_id text,
  p_person_id uuid,
  p_matter_id uuid
)
returns table (valid boolean, reason text, provider_event_id text)
language plpgsql
stable
security definer
set search_path = ''
as $authority$
declare
  v_status text;
  v_amount integer;
  v_currency text;
  v_owner uuid;
  v_event text;
  v_authority text;
  v_session text;
  v_product text;
  v_person uuid;
  v_matter uuid;
begin
  if p_briefcase_item_id is null then return query select false, 'no_briefcase_item'::text, null::text; return; end if;
  if p_consumer_auth_user_id is null then return query select false, 'no_consumer_binding'::text, null::text; return; end if;
  if to_regclass('public.consumer_briefcase_items') is null then return query select false, 'no_payment_storage'::text, null::text; return; end if;

  execute
    'select b.payment_status, b.amount_cents, b.currency, b.user_id,
            b.provider_event_id, b.payment_authority, b.checkout_session_id,
            b.payment_product_id, b.payment_person_id, b.payment_matter_id
       from public.consumer_briefcase_items b where b.id = $1'
  into v_status, v_amount, v_currency, v_owner, v_event, v_authority,
       v_session, v_product, v_person, v_matter
  using p_briefcase_item_id;

  if v_status is null and v_owner is null then return query select false, 'item_not_found'::text, null::text; return; end if;
  if v_owner is distinct from p_consumer_auth_user_id then return query select false, 'owner_mismatch'::text, null::text; return; end if;
  if v_status is distinct from 'paid' then return query select false, ('payment_status_' || coalesce(v_status, 'null'))::text, null::text; return; end if;
  if v_amount is distinct from 5000 then return query select false, 'amount_not_product_price'::text, null::text; return; end if;
  if lower(coalesce(v_currency, '')) <> 'usd' then return query select false, 'currency_not_usd'::text, null::text; return; end if;
  if v_authority is null or nullif(trim(coalesce(v_event, '')), '') is null then return query select false, 'no_server_payment_evidence'::text, null::text; return; end if;
  if nullif(trim(coalesce(v_session, '')), '') is null then return query select false, 'no_checkout_session'::text, null::text; return; end if;
  if v_product is distinct from p_product_id or p_product_id is distinct from 'expungement_packet' then return query select false, 'product_mismatch'::text, null::text; return; end if;
  if v_person is distinct from p_person_id then return query select false, 'person_mismatch'::text, null::text; return; end if;
  if v_matter is distinct from p_matter_id or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then return query select false, 'matter_mismatch'::text, null::text; return; end if;

  return query select true, 'authorized'::text, v_event;
end;
$authority$;

create or replace function public.consumer_packet_payment_authority(
  p_briefcase_item_id uuid,
  p_consumer_auth_user_id uuid
)
returns table (valid boolean, reason text, provider_event_id text)
language plpgsql
stable
security definer
set search_path = ''
as $compat$
declare
  v_product text;
  v_person uuid;
  v_matter uuid;
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    return query select false, 'no_payment_storage'::text, null::text;
    return;
  end if;
  execute
    'select b.payment_product_id, b.payment_person_id, b.payment_matter_id
       from public.consumer_briefcase_items b where b.id = $1'
  into v_product, v_person, v_matter
  using p_briefcase_item_id;
  return query select * from public.consumer_packet_payment_authority(
    p_briefcase_item_id, p_consumer_auth_user_id, v_product, v_person, v_matter
  );
end;
$compat$;

revoke all on function public.consumer_packet_payment_authority(uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.consumer_packet_payment_authority(uuid, uuid)
  from public, anon, authenticated;

do $grant_payment_probe$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.consumer_packet_payment_authority(uuid, uuid, text, uuid, uuid) to service_role;
    grant execute on function public.consumer_packet_payment_authority(uuid, uuid) to service_role;
  end if;
end
$grant_payment_probe$;

-------------------------------------------------------------------------------
-- 5. A consumer job cannot enter or leave the durable queue with bindings that
--    differ from the paid matter. Sponsored jobs remain entirely untouched.
-------------------------------------------------------------------------------

create or replace function public.packet_render_jobs_paid_matter_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
declare
  v_valid boolean;
  v_reason text;
begin
  if new.partner_id is not null then return new; end if;
  select a.valid, a.reason into v_valid, v_reason
    from public.consumer_packet_payment_authority(
      new.consumer_briefcase_item_id,
      new.consumer_auth_user_id,
      public.expungement_packet_product_id(),
      new.person_id,
      new.matter_id
    ) a;
  if not coalesce(v_valid, false) then
    raise exception 'packet_render_jobs: consumer payment binding refused (%)', coalesce(v_reason, 'unknown');
  end if;
  return new;
end;
$guard$;

do $render_job_binding_triggers$
begin
  if to_regclass('public.packet_render_jobs') is null then
    raise notice 'phase-55: packet_render_jobs absent; matter-bound queue triggers skipped';
    return;
  end if;

  drop trigger if exists packet_render_jobs_paid_matter_insert_trg on public.packet_render_jobs;
  create trigger packet_render_jobs_paid_matter_insert_trg
    before insert on public.packet_render_jobs
    for each row execute function public.packet_render_jobs_paid_matter_guard();

  drop trigger if exists packet_render_jobs_paid_matter_finalize_trg on public.packet_render_jobs;
  create trigger packet_render_jobs_paid_matter_finalize_trg
    before update of status on public.packet_render_jobs
    for each row
    when (new.partner_id is null and new.status in ('artifact_validated', 'delivered'))
    execute function public.packet_render_jobs_paid_matter_guard();
end
$render_job_binding_triggers$;

-------------------------------------------------------------------------------
-- 6. Copy the exact paid binding into the existing post-validation consumption
--    row. This remains accounting evidence, not a second entitlement.
-------------------------------------------------------------------------------

do $consumption_columns$
begin
  if to_regclass('public.consumer_packet_payment_consumption') is null then return; end if;
  alter table public.consumer_packet_payment_consumption
    add column if not exists product_id text,
    add column if not exists checkout_session_id text,
    add column if not exists amount_cents integer,
    add column if not exists currency text;

  if to_regclass('public.consumer_briefcase_items') is not null then
    if exists (
      select 1
        from public.consumer_packet_payment_consumption c
        join public.consumer_briefcase_items b
          on b.id = c.consumer_briefcase_item_id
       where b.payment_status = 'paid'
         and (
           c.consumer_auth_user_id is distinct from b.user_id
           or c.person_id is distinct from b.payment_person_id
           or c.matter_id is distinct from b.payment_matter_id
         )
    ) then
      raise exception 'phase-55: existing consumer payment consumption conflicts with the canonical paid matter binding';
    end if;

    update public.consumer_packet_payment_consumption c
       set product_id = b.payment_product_id,
           checkout_session_id = b.checkout_session_id,
           amount_cents = b.amount_cents,
           currency = b.currency
      from public.consumer_briefcase_items b
     where b.id = c.consumer_briefcase_item_id;
  end if;
end
$consumption_columns$;

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
begin
  if tg_op = 'UPDATE' then
    if new.consumer_briefcase_item_id is distinct from old.consumer_briefcase_item_id
       or new.consumer_auth_user_id is distinct from old.consumer_auth_user_id
       or new.provider_event_id is distinct from old.provider_event_id
       or new.person_id is distinct from old.person_id
       or new.matter_id is distinct from old.matter_id
       or new.product_id is distinct from old.product_id
       or new.checkout_session_id is distinct from old.checkout_session_id
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency then
      raise exception 'consumer payment consumption binding is immutable';
    end if;
    -- A refund removes authority for new work, but Phase 52 deliberately keeps
    -- an already-delivered artifact and its consumption evidence. A benign
    -- maintenance update therefore must not re-run current payment authority.
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

do $consumption_binding_constraints$
begin
  if to_regclass('public.consumer_packet_payment_consumption') is null then
    raise notice 'phase-55: consumer payment consumption absent; binding trigger and constraints skipped';
    return;
  end if;

  drop trigger if exists consumer_payment_consumption_binding_trg
    on public.consumer_packet_payment_consumption;
  create trigger consumer_payment_consumption_binding_trg
    before insert or update on public.consumer_packet_payment_consumption
    for each row execute function public.consumer_payment_consumption_binding_guard();

  alter table public.consumer_packet_payment_consumption
    drop constraint if exists consumer_payment_consumption_product_check,
    drop constraint if exists consumer_payment_consumption_amount_check,
    drop constraint if exists consumer_payment_consumption_currency_check,
    alter column product_id set not null,
    alter column checkout_session_id set not null,
    alter column amount_cents set not null,
    alter column currency set not null,
    add constraint consumer_payment_consumption_product_check
      check (product_id = 'expungement_packet'),
    add constraint consumer_payment_consumption_amount_check
      check (amount_cents = 5000),
    add constraint consumer_payment_consumption_currency_check
      check (currency = 'usd');
end
$consumption_binding_constraints$;

do $payment_binding_comments$
begin
  if to_regclass('public.consumer_briefcase_items') is null then return; end if;
  comment on column public.consumer_briefcase_items.payment_product_id is
    'Server-only product discriminator for the matter-level payment entitlement. Phase 55.';
  comment on column public.consumer_briefcase_items.payment_person_id is
    'Canonical consumer person bound to this paid matter. Phase 55.';
  comment on column public.consumer_briefcase_items.payment_matter_id is
    'Canonical matter bound to this paid Briefcase item. Phase 55.';
end
$payment_binding_comments$;

commit;
