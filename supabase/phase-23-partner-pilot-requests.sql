create table if not exists public.partner_pilot_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_name text not null,
  organization_name text not null,
  email text not null,
  phone text,
  role_title text,
  organization_type text not null,
  state_or_jurisdiction text not null,
  community_served text not null,
  estimated_people_served text,
  interested_workflow text,
  message text,
  consent_to_contact boolean not null default false,
  source text not null default 'legaleasepartner.com',
  status text not null default 'new',
  user_agent text,
  referrer text
);

create index if not exists partner_pilot_requests_created_at_idx
  on public.partner_pilot_requests (created_at desc);

create index if not exists partner_pilot_requests_status_idx
  on public.partner_pilot_requests (status);

alter table public.partner_pilot_requests enable row level security;
