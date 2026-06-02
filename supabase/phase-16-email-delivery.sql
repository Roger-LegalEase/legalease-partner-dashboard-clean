-- Phase 16: safe partner email delivery records.
-- This migration is additive and does not destroy existing partner data.

create table if not exists partner_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references partner_records(partner_slug) on delete cascade,
  email_type text not null,
  recipient_email text,
  recipient_name text,
  subject text not null,
  status text not null default 'draft',
  provider text,
  provider_message_id text,
  preview_url text,
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table partner_email_deliveries is
  'Partner Journey OS email preview, dry-run, skipped, failed, and sent delivery records.';

create index if not exists partner_email_deliveries_partner_slug_idx on partner_email_deliveries(partner_slug);
create index if not exists partner_email_deliveries_email_type_idx on partner_email_deliveries(email_type);
create index if not exists partner_email_deliveries_status_idx on partner_email_deliveries(status);
create index if not exists partner_email_deliveries_created_at_idx on partner_email_deliveries(created_at);
