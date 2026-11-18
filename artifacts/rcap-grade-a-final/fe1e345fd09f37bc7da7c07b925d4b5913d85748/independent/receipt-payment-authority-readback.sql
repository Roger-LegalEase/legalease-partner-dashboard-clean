SET
CREATE OR REPLACE FUNCTION public.consumer_packet_payment_authority(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid, p_product_id text, p_person_id uuid, p_matter_id uuid)
 RETURNS TABLE(valid boolean, reason text, provider_event_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

