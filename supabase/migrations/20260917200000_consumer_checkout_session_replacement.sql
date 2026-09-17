-- Compare-and-swap replacement of an incompatible or stale OPEN Checkout Session.
--
-- Why this exists. `bind_consumer_checkout_verification` refuses any new
-- checkout_session_id when the row already holds a different one, returning
-- `checkout_binding_conflict`. That refusal is correct for an INITIAL binding:
-- it is what stops a second Session being written over an order that already
-- has one. But it also made the replacement path structurally incapable of
-- succeeding — the application can detect that a stored OPEN Session sells the
-- wrong Product and expire it, and then has nowhere to record the replacement.
-- Hosted acceptance observed exactly that: the wrong-product Session was
-- expired and the replacement was refused 503, leaving the matter with an
-- expired Session and no way forward.
--
-- What this does NOT do. It does not weaken the initial-binding RPC, which is
-- left byte-for-byte alone. A caller that has no OLD id to name cannot use this
-- function at all: `p_expected_checkout_session_id` is required and must equal
-- the stored value exactly. There is no "replace whatever is there" mode.
--
-- The swap is a compare-and-swap under a row lock. Every precondition the
-- initial binding enforces is re-enforced here, plus two more: the order must
-- not already be paid, and the stored Session must be exactly the one the
-- caller believes it is replacing. A caller that loses the race sees
-- `checkout_replacement_conflict` together with the id that actually won, so it
-- can expire the Session it just created and reconcile against the winner
-- rather than overwriting it.

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
  v_other uuid;
begin
  -- Both ids are mandatory and must differ. A replacement that names no
  -- predecessor is an initial binding and belongs to the other function; a
  -- replacement of an id by itself is a no-op dressed as a swap.
  if nullif(trim(coalesce(p_expected_checkout_session_id, '')), '') is null
     or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
     or p_expected_checkout_session_id = p_checkout_session_id then
    return query select false, 'checkout_replacement_invalid'::text, p_briefcase_item_id, null::text; return;
  end if;

  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id for update;
  if not found or v_item.user_id is distinct from p_consumer_auth_user_id then
    return query select false, 'item_not_found'::text, null::uuid, null::text; return;
  end if;

  -- Money already collected is never re-bound to a different Session. This is
  -- the guard the initial binding does not need and this one does: it is the
  -- only path that can point a paid row at another order.
  if v_item.payment_status = 'paid' then
    return query select false, 'already_paid'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;

  select v.verification_hash into v_hash from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id and v.status = 'verified' for update;
  if v_hash is distinct from p_expected_verification_hash then
    return query select false, 'verification_changed'::text, p_briefcase_item_id, null::text; return;
  end if;

  -- The same eligibility the initial binding demands, re-checked rather than
  -- inherited: a replacement is a fresh write and is held to the fresh rules.
  if v_item.payment_allowed is not true or v_item.payment_status = 'not_applicable'
     or p_product_id is distinct from public.expungement_packet_product_id()
     or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id)
     or p_person_id is null or p_payment_provider not in ('stripe', 'dry_run') then
    return query select false, 'checkout_binding_invalid'::text, p_briefcase_item_id, null::text; return;
  end if;

  -- The new Session must not already belong to another matter.
  select i.id into v_other from public.consumer_briefcase_items i
    where i.checkout_session_id = p_checkout_session_id and i.id <> p_briefcase_item_id limit 1;
  if v_other is not null then
    return query select false, 'checkout_session_in_use'::text, p_briefcase_item_id, null::text; return;
  end if;

  -- The compare half of the compare-and-swap. The stored Session must be
  -- exactly the one the caller expired. Anything else means another request
  -- replaced it first, and the caller is told which id won so it can expire its
  -- own and reconcile against that one instead of overwriting it.
  if v_item.checkout_session_id is distinct from p_expected_checkout_session_id then
    return query select false, 'checkout_replacement_conflict'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;

  update public.consumer_briefcase_items i set
    checkout_session_id = p_checkout_session_id,
    payment_provider = p_payment_provider,
    payment_product_id = p_product_id,
    payment_person_id = p_person_id,
    payment_matter_id = p_matter_id,
    payment_status = 'unpaid',
    amount_cents = null,
    updated_at = now()
  where i.id = p_briefcase_item_id
    and i.checkout_session_id = p_expected_checkout_session_id
    and i.payment_status <> 'paid';
  if not found then
    return query select false, 'checkout_replacement_conflict'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;

  return query select true, 'replaced'::text, p_briefcase_item_id, p_checkout_session_id;
end;
$replace$;

revoke all on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) from public;
revoke all on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) from anon;
revoke all on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) from authenticated;
grant execute on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) to service_role;

comment on function public.replace_consumer_checkout_session(uuid,uuid,text,text,text,text,uuid,uuid,text) is
  'Server-only compare-and-swap replacement of an incompatible or stale OPEN consumer Checkout Session. Replaces OLD with NEW only when the owner, verification hash, eligibility and the exact stored OLD id all still hold and the order is not paid. Never used for an initial binding.';
