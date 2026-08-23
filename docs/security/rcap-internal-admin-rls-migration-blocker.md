# Internal-admin RLS consolidation

Status: authorized, written, and verified against an isolated PGlite database. The migration has not been applied to production or any external staging database. The application boundary can be consolidated without a schema change, but the deployed database policies contain authorities that cannot be removed from application code.

## Why the current database boundary is insufficient

- `public.content_current_role()` falls back to active `public.content_admin_users` rows when `public.is_internal_admin()` is false. Every content policy built on `content_current_role()`, `content_has_any_role()`, `content_can_edit_any()`, `content_can_publish()`, or `content_can_legal_approve()` therefore grants direct PostgREST/database access without the canonical `partner_users` internal-admin membership.
- `consumer wilma telemetry internal safety select` admits a `partner_users` row based on role alone. It omits `status = 'active'` and the null partner scope, so a disabled internal-admin row still satisfies the policy.
- `legalease_os_support_items_internal_admin_all` has the same role-only defect for consumer support records.

The current canonical table can represent the intended corporate administrator and revoke the personal account using its existing UUID-bound active/disabled state. No new table, column, role, or email policy is needed. A migration is unavoidable only because deployed RLS functions and policies must be replaced transactionally.

## Exact additive migration

Create one reviewed migration containing only these policy/function replacements:

1. Replace `public.content_current_role()` so it returns `primary_admin` only when `public.is_internal_admin()` is true and otherwise returns null. Retain its `stable`, `security definer`, empty `search_path`, ownership, grants, and public/anon revocations. Retain `content_admin_users` rows for history; they cease to be an authorization source.
2. Drop and recreate `consumer wilma telemetry internal safety select` for `authenticated` SELECT with `using (public.is_internal_admin())`.
3. Drop and recreate `legalease_os_support_items_internal_admin_all` for `authenticated` ALL with both `using (public.is_internal_admin())` and `with check (public.is_internal_admin())`.
4. Add migration verification proving active canonical internal admin allow; signed out, participant, partner staff, partner admin, disabled internal admin, and content-role-only identities deny; service-role paths remain available.

No data update, Auth mutation, schema object addition, destructive table change, tenant policy broadening, or production credential is part of the migration.

Migration: `supabase/migrations/20260823171000_internal_admin_authority_hardening.sql`

Blast-radius review: `docs/security/rcap-internal-admin-rls-blast-radius.md`

## RLS effect

- Content-role-only JWTs can no longer read drafts, media metadata, version/review/publication history, audit history, or social/editorial records, and cannot mutate content base tables.
- Active UUID-bound canonical internal admins retain current CMS access as effective `primary_admin`.
- Disabled internal administrators no longer read Wilma telemetry or read/write support records directly.
- Service-role policies, public content projection views, partner-scoped policies, and tenant isolation remain unchanged.

## Reviewed rollback procedure

The repository does not use automatically executed down migrations. If an incident owner authorizes rollback, run the following as one reviewed transaction. These statements restore the exact prior authority predicates. No data restoration is necessary because membership, content-role, telemetry, support, and audit rows are not deleted or rewritten by the forward migration.

```sql
begin;

create or replace function public.content_current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_internal_admin() then 'primary_admin'
    else (
      select cau.content_role
      from public.content_admin_users cau
      where cau.auth_user_id = auth.uid()
        and cau.status = 'active'
      limit 1
    )
  end
$$;

comment on function public.content_current_role() is
  'Effective content role for the current caller. Internal admins resolve to primary_admin.';

revoke all on function public.content_current_role() from public;
revoke all on function public.content_current_role() from anon;
grant execute on function public.content_current_role() to authenticated;
grant execute on function public.content_current_role() to service_role;

drop policy if exists "consumer wilma telemetry internal safety select"
  on public.consumer_wilma_telemetry;

create policy "consumer wilma telemetry internal safety select"
on public.consumer_wilma_telemetry
for select
using (
  exists (
    select 1
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.role in ('internal_admin', 'safety_reviewer')
  )
);

drop policy if exists legalease_os_support_items_internal_admin_all
  on public.legalease_os_support_items;

create policy legalease_os_support_items_internal_admin_all
on public.legalease_os_support_items
for all
using (
  exists (
    select 1
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.role in ('internal_admin', 'support_reviewer')
  )
)
with check (
  exists (
    select 1
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.role in ('internal_admin', 'support_reviewer')
  )
);

commit;
```

This rollback deliberately reopens three competing authorities: active `content_admin_users` rows again grant privileged CMS roles; role-only and inactive `safety_reviewer`/`internal_admin` memberships again grant Wilma reads; and role-only and inactive `support_reviewer`/`internal_admin` memberships again grant support reads and writes. Rollback therefore requires an incident decision and an explicit compensating-control plan.
