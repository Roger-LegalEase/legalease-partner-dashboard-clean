-- Restore the CAS contract from 62425c837b5edf3d7e22b110910885abdaec1692,
-- with explicit preservation of all bound identities and payment evidence.
-- The application proves the predecessor expired before calling this RPC.
-- Initial binding remains unchanged; an unnamed predecessor never authorizes
-- a replacement. This forward migration also upgrades the historical RPC on
-- acceptance, where it is present even though its caller was lost.

begin;

-- Existing Phase 55 authority: closes the cross-item race beneath both writers.
create unique index if not exists consumer_briefcase_items_checkout_session_uk
  on public.consumer_briefcase_items(checkout_session_id)
  where checkout_session_id is not null;

create or replace function public.replace_consumer_checkout_session(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_checkout_session_id text,
  p_checkout_session_id text,
  p_payment_provider text,
  p_product_id text,
  p_person_id uuid,
  p_matter_id uuid,
  p_expected_verification_hash text
)
returns table(ok boolean, reason text, briefcase_item_id uuid, checkout_session_id text)
language plpgsql
security definer
set search_path = ''
as $replace$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_hash text;
begin
  if nullif(trim(coalesce(p_expected_checkout_session_id, '')), '') is null
     or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
     or p_expected_checkout_session_id = p_checkout_session_id then
    return query select false, 'checkout_replacement_invalid'::text, p_briefcase_item_id, null::text; return;
  end if;

  -- Same lock order as the verification and payment authorities: item first.
  select * into v_item from public.consumer_briefcase_items i
    where i.id = p_briefcase_item_id for update;
  if not found or p_consumer_auth_user_id is null
     or v_item.user_id is distinct from p_consumer_auth_user_id then
    return query select false, 'item_not_found'::text, null::uuid, null::text; return;
  end if;

  if v_item.payment_status = 'paid' then
    return query select false, 'already_paid'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;
  -- Refunded/unknown states are not unpaid. Zero-dollar completed orders and
  -- partial server evidence remain protected even before payment_status catches up.
  if v_item.payment_status is distinct from 'unpaid'
     or v_item.packet_status is distinct from 'not_started'
     or v_item.provider_event_id is not null
     or v_item.payment_intent_id is not null
     or v_item.payment_authority is not null
     or v_item.payment_recorded_at is not null
     or v_item.payment_recorded_by is not null
     or v_item.receipt_url is not null
     or v_item.amount_cents is not null
     or exists (select 1 from public.consumer_packet_payment_consumption c
       where c.consumer_briefcase_item_id = p_briefcase_item_id)
     or exists (select 1 from public.packet_render_jobs j
       where j.briefcase_item_id = p_briefcase_item_id)
     or exists (select 1 from public.processed_stripe_events e
       where e.related_object_id in (v_item.checkout_session_id, p_checkout_session_id)) then
    return query select false, 'checkout_payment_evidence_present'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;

  select v.verification_hash into v_hash from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id and v.status = 'verified' for update;
  if v_hash is null or p_expected_verification_hash is null
     or p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or v_hash is distinct from p_expected_verification_hash then
    return query select false, 'verification_changed'::text, p_briefcase_item_id, null::text; return;
  end if;

  -- A replacement changes only the Session, never who/what the order belongs to.
  if v_item.payment_allowed is not true
     or p_product_id is distinct from public.expungement_packet_product_id()
     or v_item.payment_product_id is distinct from p_product_id
     or p_person_id is null or v_item.payment_person_id is distinct from p_person_id
     or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id)
     or v_item.payment_matter_id is distinct from p_matter_id
     or p_payment_provider is distinct from 'stripe'
     or v_item.payment_provider is distinct from p_payment_provider then
    return query select false, 'checkout_binding_invalid'::text, p_briefcase_item_id, null::text; return;
  end if;

  if exists (select 1 from public.consumer_briefcase_items i
    where i.checkout_session_id = p_checkout_session_id and i.id <> p_briefcase_item_id) then
    return query select false, 'checkout_session_in_use'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.checkout_session_id is distinct from p_expected_checkout_session_id then
    return query select false, 'checkout_replacement_conflict'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;

  -- Never clear or rewrite payment evidence, including when it is NULL today.
  update public.consumer_briefcase_items i set
    checkout_session_id = p_checkout_session_id, updated_at = now()
    where i.id = p_briefcase_item_id and i.checkout_session_id = p_expected_checkout_session_id;
  return query select true, 'replaced'::text, p_briefcase_item_id, p_checkout_session_id;
exception when unique_violation then
  -- Another item won the unique Session claim after the pre-check. PostgreSQL
  -- rolls this block back, preserving this item's predecessor and all evidence.
  return query select false, 'checkout_session_in_use'::text, p_briefcase_item_id, null::text;
end;
$replace$;

revoke all on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) to service_role;
comment on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) is
  'Server-only exact-predecessor Checkout replacement; preserves owner, current verification, product/person/matter, uniqueness and all payment/delivery evidence. Unpaid and unsettled only.';

commit;
