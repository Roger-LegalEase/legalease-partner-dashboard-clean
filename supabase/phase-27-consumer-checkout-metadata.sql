-- Phase 27 Expungement.ai consumer checkout metadata.
-- Local migration only until reviewed and applied through the production DB process.
-- This extends consumer Briefcase records only; it does not alter partner billing or Stripe invoice tables.

alter table public.consumer_briefcase_items
  add column if not exists payment_provider text check (
    payment_provider is null or payment_provider in ('stripe', 'dry_run')
  ),
  add column if not exists checkout_session_id text,
  add column if not exists payment_intent_id text,
  add column if not exists amount_cents integer check (
    amount_cents is null or amount_cents = 5000
  ),
  add column if not exists receipt_url text;

create index if not exists consumer_briefcase_items_checkout_session_id_idx
  on public.consumer_briefcase_items(checkout_session_id)
  where checkout_session_id is not null;

comment on column public.consumer_briefcase_items.payment_provider is
  'Consumer checkout provider for Expungement.ai packet payments. Isolated from partner billing.';

comment on column public.consumer_briefcase_items.checkout_session_id is
  'Stripe Checkout session ID or dry-run session ID for consumer packet checkout.';

comment on column public.consumer_briefcase_items.amount_cents is
  'Consumer packet checkout amount. Current product price is fixed at 5000 cents.';
