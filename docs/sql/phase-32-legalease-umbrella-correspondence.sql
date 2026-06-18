-- Pending migration for LegalEase umbrella-site correspondence.
-- Do not apply automatically. This broadens the existing LegalEase OS support queue
-- so /legalease/contact and /legalease/waitlist can persist as the operational
-- source of truth instead of falling back to server logs.

alter table public.legalease_os_support_items
  drop constraint if exists legalease_os_support_items_source_check;

alter table public.legalease_os_support_items
  add constraint legalease_os_support_items_source_check
  check (source in ('expungement_ai', 'legalease_umbrella_site'));

alter table public.legalease_os_support_items
  drop constraint if exists legalease_os_support_items_type_check;

alter table public.legalease_os_support_items
  add constraint legalease_os_support_items_type_check
  check (type in ('support_request', 'waitlist_request'));

comment on table public.legalease_os_support_items is
  'LegalEase OS operational source of truth for support/contact/waitlist correspondence. Consumers create through server routes only. Partner users must not access consumer support items.';
