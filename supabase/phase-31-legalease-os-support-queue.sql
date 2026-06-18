create table if not exists public.legalease_os_support_items (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'expungement_ai',
  channel text not null default 'web_support_form',
  type text not null default 'support_request',
  category text not null,
  status text not null default 'new',
  priority text not null default 'normal',
  user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  briefcase_item_id uuid null,
  message_redacted text not null,
  original_message_redaction_applied boolean not null default false,
  route_submitted_from text not null,
  user_agent text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legalease_os_support_items_source_check check (source = 'expungement_ai'),
  constraint legalease_os_support_items_channel_check check (channel = 'web_support_form'),
  constraint legalease_os_support_items_type_check check (type = 'support_request'),
  constraint legalease_os_support_items_category_check check (category in ('account_login', 'payment_receipt', 'packet_download', 'briefcase', 'wilma', 'technical_issue', 'general_contact', 'other')),
  constraint legalease_os_support_items_status_check check (status in ('new', 'in_review', 'waiting_on_customer', 'resolved', 'closed')),
  constraint legalease_os_support_items_priority_check check (priority in ('normal', 'urgent'))
);

create index if not exists legalease_os_support_items_created_at_idx
  on public.legalease_os_support_items (created_at desc);

create index if not exists legalease_os_support_items_status_idx
  on public.legalease_os_support_items (status);

create index if not exists legalease_os_support_items_user_id_idx
  on public.legalease_os_support_items (user_id);

alter table public.legalease_os_support_items enable row level security;

drop policy if exists legalease_os_support_items_internal_admin_all on public.legalease_os_support_items;
create policy legalease_os_support_items_internal_admin_all
on public.legalease_os_support_items
for all
using (
  exists (
    select 1
    from public.partner_users pu
    where pu.user_id = auth.uid()
      and pu.role in ('internal_admin', 'support_reviewer')
  )
)
with check (
  exists (
    select 1
    from public.partner_users pu
    where pu.user_id = auth.uid()
      and pu.role in ('internal_admin', 'support_reviewer')
  )
);

comment on table public.legalease_os_support_items is
  'LegalEase OS operational source of truth for Expungement.ai support/contact correspondence. Consumers create through the server route only. Partner users must not access consumer support items.';
