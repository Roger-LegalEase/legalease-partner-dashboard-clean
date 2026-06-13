-- Phase 25 partner invoice billing.
-- Local migration only until reviewed and applied through the production DB process.

create table if not exists public.partner_billing_requests (
  id uuid primary key default gen_random_uuid(),
  partner_slug text,
  partner_pilot_request_id uuid references public.partner_pilot_requests(id) on delete set null,
  contact_email text not null,
  contact_name text,
  amount_cents integer not null check (amount_cents >= 100000 and amount_cents <= 25000000),
  currency text not null default 'usd' check (currency = 'usd'),
  description text not null check (char_length(description) between 1 and 500),
  due_date date,
  status text not null default 'draft' check (
    status in ('draft', 'invoice_created', 'invoice_sent', 'paid', 'payment_failed', 'voided', 'canceled')
  ),
  stripe_customer_id text,
  stripe_invoice_id text unique,
  stripe_invoice_url text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists partner_billing_requests_partner_slug_idx
  on public.partner_billing_requests(partner_slug);

create index if not exists partner_billing_requests_partner_pilot_request_id_idx
  on public.partner_billing_requests(partner_pilot_request_id);

create index if not exists partner_billing_requests_created_at_idx
  on public.partner_billing_requests(created_at desc);

create index if not exists partner_billing_requests_status_idx
  on public.partner_billing_requests(status);

create table if not exists public.processed_stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  related_object_id text
);

alter table public.partner_billing_requests enable row level security;
alter table public.processed_stripe_events enable row level security;

comment on table public.partner_billing_requests is
  'Internal-admin scoped Stripe invoice requests for custom LegalEase partner engagements.';

comment on table public.processed_stripe_events is
  'Stripe webhook event IDs processed after signature verification for idempotent reconciliation.';

comment on column public.partner_billing_requests.amount_cents is
  'Custom-scoped invoice amount in USD cents, entered only by LegalEase internal_admin tooling.';

comment on column public.partner_billing_requests.stripe_invoice_url is
  'Stripe-hosted invoice URL returned by Stripe after invoice creation/finalization.';
