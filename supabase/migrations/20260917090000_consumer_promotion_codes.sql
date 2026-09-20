-------------------------------------------------------------------------------
-- Consumer promotion codes: reconcile the order instead of asserting one price.
--
-- Until now a paid consumer row had to carry exactly 5000 cents, in the
-- constraint and again inside the security-definer writer. That was the correct
-- rule while no discount could exist. Customers may now redeem Stripe promotion
-- codes, so the amount collected is derived — the regular price less the
-- discount the provider applied — and the rule worth enforcing is that the
-- three numbers reconcile.
--
-- What does NOT change:
--
--   * The regular price is still 5000 cents. A row whose regular price is
--     anything else is refused, so a discount can never be used to smuggle in a
--     different product at a different price.
--   * Payment facts are still writable only by the security-definer function,
--     still only by service_role, and a paid row still requires a named server
--     authority and a provider event id. This migration does not relax
--     ownership, idempotency, verification or the sponsorship separation.
--   * A sponsored clinic item still cannot enter the consumer payment writer.
--     A discounted consumer order is a consumer order; it consumes no sponsor
--     credit.
--
-- What changes: `amount_cents` now means what was actually collected, and a
-- fully discounted order records 0 rather than a fabricated 50 dollars.
-------------------------------------------------------------------------------

do $consumer_promotion_columns$
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    return;
  end if;

  -- Nullable, because rows that never entered payment have no order to
  -- describe. The constraint below requires them only on a paid row.
  execute $ddl$
    alter table public.consumer_briefcase_items
      add column if not exists regular_price_cents integer,
      add column if not exists discount_cents integer
  $ddl$;

  -- Every order that exists today was created before a discount was possible,
  -- so its regular price was its collected amount and its discount was zero.
  -- This is a statement of fact about those rows, not a default for new ones.
  execute $ddl$
    update public.consumer_briefcase_items
       set regular_price_cents = coalesce(regular_price_cents, 5000),
           discount_cents = coalesce(discount_cents, 0)
     where payment_status = 'paid'
       and (regular_price_cents is null or discount_cents is null)
  $ddl$;

  -- The base-schema constraint said amount_cents is null or exactly 5000. It
  -- predates discounts and would refuse every discounted order, so it is
  -- replaced by the rule that actually holds now: a whole number of cents, not
  -- negative, never more than the regular price. The reconciliation itself is
  -- enforced on the paid row below, where the other two columns are present.
  execute $ddl$
    alter table public.consumer_briefcase_items
      drop constraint if exists consumer_briefcase_items_amount_cents_check,
      add constraint consumer_briefcase_items_amount_cents_check
        check (amount_cents is null or (amount_cents >= 0 and amount_cents <= 5000))
  $ddl$;

  execute $ddl$
    alter table public.consumer_briefcase_items
      drop constraint if exists consumer_briefcase_items_paid_requires_server_evidence,
      add constraint consumer_briefcase_items_paid_requires_server_evidence
        check (
          payment_status <> 'paid'
          or (
            payment_authority is not null
            and provider_event_id is not null
            and payment_recorded_at is not null
            and currency = 'usd'
            -- The regular price is fixed even when nothing was collected.
            and regular_price_cents = 5000
            and discount_cents between 0 and regular_price_cents
            -- The reconciliation itself. Collected is what remained after the
            -- provider's discount, which is zero on a fully discounted order.
            and amount_cents = regular_price_cents - discount_cents
            -- Everything Phase 55 required of a paid row still holds. Only the
            -- amount rule changes; the bindings do not.
            and nullif(trim(coalesce(checkout_session_id, '')), '') is not null
            and payment_product_id = 'expungement_packet'
            and payment_person_id is not null
            and payment_matter_id = public.consumer_matter_id_for_briefcase_item(id)
          )
        )
  $ddl$;
end
$consumer_promotion_columns$;

-------------------------------------------------------------------------------
-- The payment writer, reconciling.
--
-- Two parameters are added rather than reinterpreting the existing one, so that
-- a caller which does not know about discounts cannot accidentally describe a
-- discounted order. The legacy entry points are retired at the end, replaced by
-- a refusal: leaving a signature that still hard-writes 5000 would leave a way
-- to record a false amount for a discounted order.
-------------------------------------------------------------------------------

create or replace function public.record_consumer_packet_payment(
  p_briefcase_item_id uuid,
  p_payment_status text,
  p_amount_cents integer,
  p_regular_price_cents integer,
  p_discount_cents integer,
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
  v_amount_due integer;
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

    -- The reconciliation, in the database, where it holds even if the
    -- application is wrong. This is what replaces `p_amount_cents <> 5000`.
    v_amount_due := coalesce(p_regular_price_cents, -1) - coalesce(p_discount_cents, -1);
    if p_regular_price_cents is distinct from 5000
       or p_discount_cents is null
       or p_discount_cents < 0
       or p_discount_cents > p_regular_price_cents
       or p_amount_cents is distinct from v_amount_due
       or lower(coalesce(p_currency, '')) <> 'usd'
       or nullif(trim(coalesce(p_provider_event_id, '')), '') is null
       or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
       or p_product_id is distinct from 'expungement_packet'
       or p_person_id is null
       or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
      return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- Stripe creates no PaymentIntent for a zero-total order and always creates
    -- one when money is due. A row that disagrees with its own total is not a
    -- description of any order Stripe produced.
    if (v_amount_due > 0) <> (nullif(trim(coalesce(p_payment_intent_id, '')), '') is not null) then
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

    if v_existing_session is distinct from p_checkout_session_id
       or v_existing_product is distinct from p_product_id
       or v_existing_person is distinct from p_person_id
       or v_existing_matter is distinct from p_matter_id then
      return query select 'checkout_binding_mismatch'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- A second signed event for the same already-settled Session is an
    -- idempotent success. The stored amount is compared against what this event
    -- reconciles to rather than against 5000, so a replayed no-cost order
    -- converges instead of reading as a conflict.
    if v_status = 'paid' then
      if v_existing_amount is not distinct from p_amount_cents
         and lower(coalesce(v_existing_currency, '')) = 'usd'
         and nullif(trim(coalesce(v_existing_event, '')), '') is not null then
        return query select 'already_paid'::text, p_briefcase_item_id, v_existing_event;
        return;
      end if;
      return query select 'payment_conflict'::text, p_briefcase_item_id, v_existing_event;
      return;
    end if;

    begin
      execute
        'update public.consumer_briefcase_items
            set payment_status = ''paid'', amount_cents = $11,
                regular_price_cents = $12, discount_cents = $13, currency = ''usd'',
                payment_provider = coalesce($2, payment_provider),
                payment_intent_id = coalesce($3, payment_intent_id),
                receipt_url = coalesce($4, receipt_url), provider_event_id = $5,
                payment_authority = $6, payment_recorded_at = now(),
                payment_recorded_by = $7, payment_product_id = $8,
                payment_person_id = $9, payment_matter_id = $10
          where id = $1'
      using p_briefcase_item_id, p_payment_provider, p_payment_intent_id,
            p_receipt_url, trim(p_provider_event_id), p_authority, p_recorded_by,
            p_product_id, p_person_id, p_matter_id,
            p_amount_cents, p_regular_price_cents, p_discount_cents;
    exception when unique_violation then
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
  uuid, text, integer, integer, integer, text, text, text, text, text, text, text, text, text, uuid, uuid
) from public, anon, authenticated;

do $grant_reconciling_writer$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_consumer_packet_payment(
      uuid, text, integer, integer, integer, text, text, text, text, text, text, text, text, text, uuid, uuid
    ) to service_role;
  end if;
end
$grant_reconciling_writer$;

-------------------------------------------------------------------------------
-- The verification-checking entry point the application actually calls.
-------------------------------------------------------------------------------

create or replace function public.record_consumer_packet_payment(
  p_briefcase_item_id uuid,
  p_payment_status text,
  p_amount_cents integer,
  p_regular_price_cents integer,
  p_discount_cents integer,
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
  p_matter_id uuid,
  p_expected_verification_hash text
)
returns table(outcome text, briefcase_item_id uuid, provider_event_id text)
language plpgsql
security definer
set search_path = ''
as $payment$
declare
  v_hash text;
  v_result record;
begin
  select v.verification_hash into v_hash from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then
    return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text; return;
  end if;
  select * into v_result from public.record_consumer_packet_payment(
    p_briefcase_item_id, p_payment_status, p_amount_cents,
    p_regular_price_cents, p_discount_cents, p_currency,
    p_payment_provider, p_provider_event_id, p_checkout_session_id,
    p_payment_intent_id, p_receipt_url, p_authority, p_recorded_by,
    p_product_id, p_person_id, p_matter_id
  );
  return query select v_result.outcome::text, v_result.briefcase_item_id::uuid,
    v_result.provider_event_id::text;
end;
$payment$;

revoke all on function public.record_consumer_packet_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, text, text, text, text, uuid, uuid, text
) from public, anon, authenticated;

do $grant_reconciling_entry$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.record_consumer_packet_payment(
      uuid, text, integer, integer, integer, text, text, text, text, text, text, text, text, text, uuid, uuid, text
    ) to service_role;
  end if;
end
$grant_reconciling_entry$;

-------------------------------------------------------------------------------
-- Retire the signatures that hard-write 5000, without removing them.
--
-- They are unreachable from the application now, and a path that records the
-- regular price against a discounted order must not remain. They are replaced
-- by a refusal rather than dropped, because dropping them would also remove the
-- REVOKE that makes a participant's direct call fail as a permission denial:
-- a function that does not exist refuses for the wrong reason, and the
-- protected-writer boundary is worth keeping observable.
-------------------------------------------------------------------------------

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
as $retired$
begin
  -- No caller may record a payment without saying what the regular price and
  -- the discount were. Silence here would mean a discounted order recorded at
  -- full price.
  return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
end;
$retired$;

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
  p_matter_id uuid,
  p_expected_verification_hash text
)
returns table (
  outcome text,
  briefcase_item_id uuid,
  provider_event_id text
)
language plpgsql
security definer
set search_path = ''
as $retired_entry$
begin
  return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
end;
$retired_entry$;

-------------------------------------------------------------------------------
-- The entitlement probe.
--
-- `amount_not_product_price` asked whether 5000 cents had been collected. On a
-- discounted order nothing like 5000 was collected, and the packet is owed all
-- the same, so the question becomes whether the row reconciles: the regular
-- price is the product's price, the discount is within it, and what was
-- collected is what remained. Every other condition — owner, paid status,
-- currency, server evidence, session, product, person, matter — is unchanged.
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
  v_regular integer;
  v_discount integer;
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
    'select b.payment_status, b.amount_cents, b.regular_price_cents, b.discount_cents,
            b.currency, b.user_id, b.provider_event_id, b.payment_authority,
            b.checkout_session_id, b.payment_product_id, b.payment_person_id, b.payment_matter_id
       from public.consumer_briefcase_items b where b.id = $1'
  into v_status, v_amount, v_regular, v_discount, v_currency, v_owner, v_event,
       v_authority, v_session, v_product, v_person, v_matter
  using p_briefcase_item_id;

  if v_status is null and v_owner is null then return query select false, 'item_not_found'::text, null::text; return; end if;
  if v_owner is distinct from p_consumer_auth_user_id then return query select false, 'owner_mismatch'::text, null::text; return; end if;
  if v_status is distinct from 'paid' then return query select false, ('payment_status_' || coalesce(v_status, 'null'))::text, null::text; return; end if;
  if v_regular is distinct from 5000
     or v_discount is null or v_discount < 0 or v_discount > v_regular
     or v_amount is distinct from (v_regular - v_discount) then
    return query select false, 'amount_not_product_price'::text, null::text; return;
  end if;
  if lower(coalesce(v_currency, '')) <> 'usd' then return query select false, 'currency_not_usd'::text, null::text; return; end if;
  if v_authority is null or nullif(trim(coalesce(v_event, '')), '') is null then return query select false, 'no_server_payment_evidence'::text, null::text; return; end if;
  if nullif(trim(coalesce(v_session, '')), '') is null then return query select false, 'no_checkout_session'::text, null::text; return; end if;
  if v_product is distinct from p_product_id or p_product_id is distinct from 'expungement_packet' then return query select false, 'product_mismatch'::text, null::text; return; end if;
  if v_person is distinct from p_person_id then return query select false, 'person_mismatch'::text, null::text; return; end if;
  if v_matter is distinct from p_matter_id or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then return query select false, 'matter_mismatch'::text, null::text; return; end if;

  return query select true, 'authorized'::text, v_event;
end;
$authority$;

revoke all on function public.consumer_packet_payment_authority(uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated;

do $grant_reconciling_probe$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.consumer_packet_payment_authority(uuid, uuid, text, uuid, uuid) to service_role;
  end if;
end
$grant_reconciling_probe$;
