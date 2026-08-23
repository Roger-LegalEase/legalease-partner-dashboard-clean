# Internal-admin RLS blast-radius review

Reviewed at base `dd93579871962260b12918e54c44cf9bf1e81529` before writing the authorized migration. This review classifies repository callers and policy dependencies; it does not query an external database.

## Decision

The migration can be limited to one role resolver and two existing policies. It requires no data rewrite, destructive schema change, grant change, table/column change, production identity operation, or tenant-policy change.

No required non-internal-admin application workflow remains: all CMS pages and handlers live under `/internal` or `/api/internal` and now require the canonical UUID-bound internal-admin guard before their reads and writes. `content_admin_users` remains useful as preserved historical/audit data, but its former role-only browser authority conflicts with the accepted internal boundary. Repository public content uses explicit public projection views and does not depend on a content role. Server ingestion, support intake, schedulers, callbacks, and internal CMS repositories use the server-only service-role client and remain operational.

## Caller and policy classification

| Object/caller group | Current dependency | Classification | Migration result |
| --- | --- | --- | --- |
| `/internal/content/**` pages | Application content adapter formerly resolved `content_admin_users` | Obsolete role-only bypass | Canonical `partner_users` internal admin is required before any read |
| `/api/internal/content/**` handlers | Application capability adapter formerly resolved `content_admin_users` | Obsolete role-only bypass | Canonical internal admin required; effective application content role is `primary_admin` |
| `content_apply_legal_review()` | Calls `content_current_role()` with the caller's authenticated JWT | Legitimate internal-admin use | Active global internal admin returns `primary_admin`; every other identity fails closed |
| `content_can_edit_any()`, `content_can_publish()`, `content_can_legal_approve()`, `content_has_any_role()` | Delegate to `content_current_role()` | Legitimate internal-admin use plus former role-only bypass | Continue working for canonical internal admins; content-role-only callers return false |
| Content base-table authenticated RLS policies | Use the resolver/helper functions for drafts, media, versions, review history, publication history, social/editorial data, and role management | Former role-only bypass | Canonical internal admin only through `primary_admin`; no policy is broadened |
| `content_admin_users_select_self` | Lets an authenticated UUID read its own role-history row | Historical/self visibility, not an internal grant | Unchanged; reading the assignment row cannot manufacture `content_current_role()` |
| `content_admin_users_manage_primary_admin` | Uses `is_internal_admin()` or `content_current_role() = 'primary_admin'` | Legitimate internal-admin role-history management; former recursive primary-admin bypass | After resolver replacement both branches require the same canonical internal admin; self-escalation rule remains |
| `src/lib/content/cms-queries.ts` and internal content route repositories | Use `getSupabaseAdminClient()` after application authorization | Legitimate service-role use | Unchanged; service-role key remains server-only |
| Scheduler, Command Center callback, OG/media generation, promotion worker | Server-only content clients and service-role policies | Legitimate service-role use | Unchanged |
| `content_public_posts`, `content_public_authors`, `content_public_media`, `content_public_testimonials`, `content_public_state_editorial` | Explicit security-invoker projections and anon policies from the existing security migration | Legitimate public-view use | Unchanged; no view, grant, base-table anon policy, or public predicate changes |
| Content rows carrying `partner_slug` | Former `partner_contributor` content-role path | Obsolete role-only internal CMS bypass, not partner tenant authorization | Content role no longer opens internal content; partner dashboard/tenant policies are unchanged |
| `consumer wilma telemetry internal safety select` | Direct role-only `partner_users` subquery omits status and global scope | Obsolete role-only bypass | Replaced with authenticated SELECT using `is_internal_admin()` |
| Wilma chat telemetry production path | Current code stores in process and does not directly query the table; future trusted persistence uses server boundary | Legitimate service-role use | Service role remains functional; no telemetry row changes |
| `legalease_os_support_items_internal_admin_all` | Direct role-only `partner_users` subquery omits status and global scope | Obsolete role-only bypass | Replaced with authenticated ALL using/with-check `is_internal_admin()` |
| Expungement.ai support adapter, umbrella correspondence, launch OS events | `getSupabaseAdminClient()` inserts from trusted server routes | Legitimate service-role use | Unchanged; consumer/public submission remains mediated by server validation/redaction |
| `public.is_internal_admin()` consumers in partner, onboarding, RCAP, storage, and provisioning policies/RPCs | UUID + active + `internal_admin` + null scope | Legitimate internal-admin use | Function is not modified; all existing callers retain behavior |
| `current_partner_slug()` partner policies and partner onboarding actor checks | Active partner membership and exact tenant | Legitimate tenant-scoped use | Unchanged; internal resolver does not participate |
| Participant/Briefcase and public RCAP policies | User ownership or public eligibility rules | Legitimate participant/public use | Unchanged |

## Identities and expected effect

- Active global `internal_admin`: privileged content role and affected RLS access remain allowed.
- Disabled/revoked internal administrator: denied because `is_internal_admin()` requires active status.
- `content_admin_users` role without canonical membership: the historical row remains, but it grants no privileged role or internal table access.
- Participant, external-email user, corporate-domain user without membership, partner staff, partner admin, and unsupported viewer: denied.
- Service role: unchanged.
- Anonymous public-view caller: unchanged.
- Partner tenant caller: existing same-tenant access remains and cross-tenant access remains denied.

No caller is classified as ambiguous or requiring an owner decision under the explicitly accepted authority policy.
