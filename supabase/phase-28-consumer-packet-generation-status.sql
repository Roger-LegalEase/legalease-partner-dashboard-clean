-- Phase 28 Expungement.ai post-payment packet generation status.
-- Local migration only until reviewed and applied through the production DB process.
-- This extends consumer Briefcase packet status only; it does not alter partner billing or Stripe invoice tables.

alter table public.consumer_briefcase_items
  drop constraint if exists consumer_briefcase_items_packet_status_check;

alter table public.consumer_briefcase_items
  add constraint consumer_briefcase_items_packet_status_check
  check (
    packet_status in ('not_started', 'pending', 'generating', 'ready', 'failed', 'downloaded')
  );

comment on column public.consumer_briefcase_items.packet_status is
  'Consumer packet generation lifecycle for paid Expungement.ai packets: not_started, pending, generating, ready, failed, downloaded.';
