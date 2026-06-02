-- Phase 13 paid provisioning activation fields.
-- Safe additive migration: preserves existing partner_records data.

alter table partner_records
  add column if not exists selected_package_id text,
  add column if not exists selected_package_name text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_amount integer,
  add column if not exists payment_currency text;

alter table partner_records
  alter column payment_status set default 'unpaid',
  alter column provisioning_status set default 'blocked_payment_required';

create index if not exists partner_records_stripe_checkout_session_id_idx
  on partner_records(stripe_checkout_session_id);

comment on column partner_records.selected_package_id is
  'Public package identifier selected before Stripe Checkout.';

comment on column partner_records.selected_package_name is
  'Public package name selected before Stripe Checkout, such as Full Access Program.';

comment on column partner_records.stripe_checkout_session_id is
  'Stripe Checkout Session ID confirmed by verified webhook before paid provisioning activation.';

comment on column partner_records.paid_at is
  'Timestamp recorded only after verified Stripe checkout.session.completed payment confirmation.';
