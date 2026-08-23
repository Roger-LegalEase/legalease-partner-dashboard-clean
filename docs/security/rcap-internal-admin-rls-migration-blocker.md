# Internal-admin RLS consolidation requiring approval

No migration has been written or applied. The application boundary can be consolidated without a schema change, but the current database policies contain authorities that cannot be removed from application code.

## Why the current database boundary is insufficient

- `public.content_current_role()` falls back to active `public.content_admin_users` rows when `public.is_internal_admin()` is false. Every content policy built on `content_current_role()`, `content_has_any_role()`, `content_can_edit_any()`, `content_can_publish()`, or `content_can_legal_approve()` therefore grants direct PostgREST/database access without the canonical `partner_users` internal-admin membership.
- `consumer wilma telemetry internal safety select` admits a `partner_users` row based on role alone. It omits `status = 'active'` and the null partner scope, so a disabled internal-admin row still satisfies the policy.
- `legalease_os_support_items_internal_admin_all` has the same role-only defect for consumer support records.

The current canonical table can represent the intended corporate administrator and revoke the personal account using its existing UUID-bound active/disabled state. No new table, column, role, or email policy is needed. A migration is unavoidable only because deployed RLS functions and policies must be replaced transactionally.

## Exact additive migration proposed

Create one reviewed migration containing only these policy/function replacements:

1. Replace `public.content_current_role()` so it returns `primary_admin` only when `public.is_internal_admin()` is true and otherwise returns null. Retain its `stable`, `security definer`, empty `search_path`, ownership, grants, and public/anon revocations. Retain `content_admin_users` rows for history; they cease to be an authorization source.
2. Drop and recreate `consumer wilma telemetry internal safety select` for `authenticated` SELECT with `using (public.is_internal_admin())`.
3. Drop and recreate `legalease_os_support_items_internal_admin_all` for `authenticated` ALL with both `using (public.is_internal_admin())` and `with check (public.is_internal_admin())`.
4. Add migration verification proving active canonical internal admin allow; signed out, participant, partner staff, partner admin, disabled internal admin, and content-role-only identities deny; service-role paths remain available.

No data update, Auth mutation, schema object addition, destructive table change, tenant policy broadening, or production credential is part of the migration.

## RLS effect

- Content-role-only JWTs can no longer read drafts, media metadata, version/review/publication history, audit history, or social/editorial records, and cannot mutate content base tables.
- Active UUID-bound canonical internal admins retain current CMS access as effective `primary_admin`.
- Disabled internal administrators no longer read Wilma telemetry or read/write support records directly.
- Service-role policies, public content projection views, partner-scoped policies, and tenant isolation remain unchanged.

## Rollback implication

Rollback would restore the prior `content_current_role()` fallback and the two prior role-only policies. No data restoration is necessary because membership/content-role/history rows are not deleted or rewritten. Rolling back would intentionally reopen the competing database authorities and therefore requires the same security approval as applying the consolidation.
