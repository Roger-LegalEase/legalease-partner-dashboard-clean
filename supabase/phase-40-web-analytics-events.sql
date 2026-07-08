-- Phase 40 First-party web analytics events + daily rollups.
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- Append-only, privacy-conscious web traffic + funnel event store for the LegalEase Command Center.
-- No raw IP, no PII, no criminal-record answers are ever written here (enforced in the app layer at
-- src/lib/analytics/*). Only anonymous visitor/session UUIDs, salted ip_hash, and low-cardinality
-- funnel metadata are stored. RLS is enabled and only the service_role may read or write; clients
-- never touch this table directly (writes go through /api/analytics/web).

create table if not exists public.web_analytics_events (
  event_id uuid primary key,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  domain text,
  product_surface text,
  event_name text not null,
  path text,
  query text,
  page_title text,
  referrer_domain text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  visitor_id uuid,
  session_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  partner_slug text,
  jurisdiction text,
  device_type text,
  user_agent_family text,
  ip_hash text,
  country text,
  region text,
  event_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint web_analytics_events_meta_is_object check (jsonb_typeof(event_meta) = 'object')
);

alter table public.web_analytics_events enable row level security;

create policy "service role can manage web analytics events"
  on public.web_analytics_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists web_analytics_events_occurred_at_idx
  on public.web_analytics_events (occurred_at desc);

create index if not exists web_analytics_events_domain_idx
  on public.web_analytics_events (domain, occurred_at desc);

create index if not exists web_analytics_events_surface_idx
  on public.web_analytics_events (product_surface, occurred_at desc);

create index if not exists web_analytics_events_event_name_idx
  on public.web_analytics_events (event_name, occurred_at desc);

create index if not exists web_analytics_events_path_idx
  on public.web_analytics_events (path);

create index if not exists web_analytics_events_session_idx
  on public.web_analytics_events (session_id);

create index if not exists web_analytics_events_visitor_idx
  on public.web_analytics_events (visitor_id);

create index if not exists web_analytics_events_partner_idx
  on public.web_analytics_events (partner_slug, occurred_at desc)
  where partner_slug is not null;

create index if not exists web_analytics_events_utm_campaign_idx
  on public.web_analytics_events (utm_campaign, occurred_at desc)
  where utm_campaign is not null;

comment on table public.web_analytics_events is
  'Append-only first-party web analytics events (pageviews + funnel). No raw IP or PII; anonymous visitor/session UUIDs and salted ip_hash only. Service-role access only.';
comment on column public.web_analytics_events.event_id is
  'Client-generated UUID used as an idempotency key; duplicate deliveries are ignored on insert.';
comment on column public.web_analytics_events.ip_hash is
  'HMAC-SHA256 of the request IP using WEB_ANALYTICS_IP_SALT. Never the raw IP. Null when the salt is unset.';
comment on column public.web_analytics_events.product_surface is
  'One of expungement_ai | legalease | legalease_partner, derived server-side from the request Host.';
comment on column public.web_analytics_events.event_meta is
  'Sanitized low-cardinality funnel metadata (state code, result_code, packet_allowed, partner_slug). Never screening answers or record details.';

-- Optional daily rollup table for cheap Command Center summaries at scale. The summary API can read
-- raw events directly for early-stage volume; this table is populated by a future scheduled rollup
-- job (see docs/WEB_ANALYTICS.md) and is created here so the shape is reviewed alongside the events.
create table if not exists public.web_analytics_daily_rollups (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  domain text not null,
  product_surface text,
  event_name text not null,
  event_count bigint not null default 0,
  unique_visitors bigint not null default 0,
  sessions bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint web_analytics_daily_rollups_unique unique (day, domain, event_name)
);

alter table public.web_analytics_daily_rollups enable row level security;

create policy "service role can manage web analytics rollups"
  on public.web_analytics_daily_rollups
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists web_analytics_daily_rollups_day_idx
  on public.web_analytics_daily_rollups (day desc, domain);

comment on table public.web_analytics_daily_rollups is
  'Pre-aggregated daily web analytics counts per domain/event for the Command Center. Populated by a scheduled rollup job; append/upsert on (day, domain, event_name).';
