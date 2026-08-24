-- Consolidate privileged internal authorization on public.is_internal_admin().
--
-- Supabase applies each migration transactionally. This migration changes one
-- role resolver and two RLS policies only. It performs no data update, does not
-- alter an Auth user or membership, and preserves every historical row.

-- content_admin_users remains available as historical role-assignment data,
-- but a row there is no longer an alternate source of privileged CMS access.
-- The only effective privileged content role is derived from the current Auth
-- UUID's active, global partner_users.internal_admin membership.
create or replace function public.content_current_role()
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when public.is_internal_admin() then 'primary_admin'::text
    else null::text
  end
$function$;

comment on function public.content_current_role() is
  'Privileged content role derived only from the active global UUID-bound internal administrator authority.';

revoke all on function public.content_current_role() from public;
revoke all on function public.content_current_role() from anon;
grant execute on function public.content_current_role() to authenticated;
grant execute on function public.content_current_role() to service_role;

-- Wilma safety telemetry is internal data. A role string on an inactive or
-- partner-scoped membership must never substitute for the canonical helper.
drop policy if exists "consumer wilma telemetry internal safety select"
  on public.consumer_wilma_telemetry;

create policy "consumer wilma telemetry internal safety select"
on public.consumer_wilma_telemetry
for select
to authenticated
using (public.is_internal_admin());

comment on policy "consumer wilma telemetry internal safety select"
  on public.consumer_wilma_telemetry is
  'Allows telemetry reads only for an active global UUID-bound internal administrator.';

-- Support queue reads and writes share one canonical rule. Trusted consumer
-- intake remains on server-only service-role clients and is unaffected by this
-- authenticated-role policy.
drop policy if exists legalease_os_support_items_internal_admin_all
  on public.legalease_os_support_items;

create policy legalease_os_support_items_internal_admin_all
on public.legalease_os_support_items
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

comment on policy legalease_os_support_items_internal_admin_all
  on public.legalease_os_support_items is
  'Allows support queue reads and writes only for an active global UUID-bound internal administrator; service-role intake remains separate.';
