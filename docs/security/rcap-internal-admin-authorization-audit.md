# RCAP internal-admin authorization audit

Security base: `dd93579871962260b12918e54c44cf9bf1e81529` (`origin/main` at 2026-08-23). The complete machine-readable route and authority inventory is in `rcap-internal-admin-authorization-map.json`; the pre-change synthetic identity/operation results are in `rcap-internal-admin-pre-hardening-matrix.json`; protected-scope tree objects are in `rcap-internal-admin-protected-scope-baseline.json`.

## Root cause

The provisioning page was not authorized by email, corporate domain, client navigation, or mere authentication. Its request path was:

1. Supabase Auth established the browser session and SSR auth cookies.
2. The pre-hardening proxy admitted either a matching environment bearer token or an internal-admin session. A normal address-bar navigation cannot attach that bearer token.
3. `/internal/partners/provisioning` called `resolveInternalAdminPageAccess()` before calling `getAllPartners()`.
4. That function called `requireInternalAdminSession()`, which called `auth.getUser()` and used the returned Auth user UUID to query `public.partner_users`.
5. The page rendered only when exactly one active row for that UUID resolved to `role = 'internal_admin'` and `partner_slug is null`.
6. Provisioning mutations repeated the same UUID-bound check before parsing their payload or calling the service/RPC.

Therefore, given the reported rendered production page and this deployed request path, the personal Gmail Auth UUID resolved as an active `internal_admin` membership at the time of access. The email string was incidental; ownership of the address did not grant access. This task did not query or mutate production data, so the exact production row and UUID must be captured with the read-only audit command before remediation.

No evidence in this audit establishes a breach or unauthorized action. It establishes an over-privileged identity configuration and conflicting secondary route authorities.

## Canonical authority

`public.partner_users` is the one internal-administrator authorization source. The principal is `auth.users.id` / `auth.uid()`. The application helper is `requireInternalAdminSession()` and the RLS helper is `public.is_internal_admin()`.

The application rule is fail-closed:

- a current server-verified Supabase user is required;
- lookup is by that user's UUID, never a client email or role string;
- exactly one active identity may resolve;
- the role must be `internal_admin`;
- `partner_slug` must be null;
- a disabled membership is denied (the current schema uses disabled state for revoked or completed-expiration lifecycle states);
- database errors, unknown roles, missing email, malformed scope, and ambiguity are denied.

The schema has no membership `expires_at` column. No schema extension is needed for this incident or account transition: current internal memberships are non-expiring while active, and revocation/expiry completion is represented by `status = 'disabled'`.

The authorized RLS-only migration finishes authority consolidation in the branch. Existing content policies fell back to `content_admin_users`, and the Wilma telemetry and LegalEase OS support policies used role-only checks that omitted active/null-scope requirements. `20260823171000_internal_admin_authority_hardening.sql` replaces those predicates with `public.is_internal_admin()`. Its blast radius, exact effect, and reviewed rollback are in `rcap-internal-admin-rls-blast-radius.md` and `rcap-internal-admin-rls-migration-blocker.md`. The migration was verified in isolated PGlite and was not applied to production or an external staging database.

## Competing authorities and bypasses found

- `INTERNAL_ADMIN_ACCESS_TOKEN` let a bearer secret pass the `/internal` proxy independently of a user session. It did not by itself pass the provisioning page's second guard, but it was a conflicting environment authority and could expose any incompletely guarded page. It was removed from the proxy and environment contract.
- `content_admin_users` allowed a non-internal content role to reach `/internal/content` pages, APIs, and content-table RLS. Application content capabilities now require the canonical internal-admin session first. The migration makes `content_current_role()` return `primary_admin` only for `public.is_internal_admin()` and null otherwise. Existing role rows remain untouched for history, but cease to authorize when the migration is applied.
- `COMMAND_CENTER_API_KEY` independently authorized `/api/internal/analytics/summary`. That internal endpoint now requires the canonical UUID-bound session.
- The proxy formerly made an authorization decision and had content/invite carve-outs. It now refreshes cookies and applies private no-store headers only. Page and handler checks remain load-bearing.
- No product authorization code contained either incident email, a hardcoded administrator UUID, a corporate-domain grant, or an owner/founder exception.
- Auth `app_metadata` and `user_metadata` are not consulted by the canonical helper. Synthetic internal-role claims in both are denied without the database membership.
- `partner_admin`, `partner_staff`, unsupported viewer roles, participant authentication, and corporate email without membership are denied.
- No internal Next.js server actions exist. Internal mutations are route handlers, all inventoried in the JSON map.

## Server and data boundary after hardening

Every internal page in the proposed application change retains a page-level guard before its sensitive read; the root internal layout adds a second server-derived shell identity and denial boundary. Every internal API, route handler, upload/download handler, publication/activation path, invitation path, and onboarding mutation uses the canonical helper or an adapter that calls it before data access.

Provisioning and partner RLS use `public.is_internal_admin()`, which applies the same Auth UUID, active status, internal role, and null partner scope. Partner policies continue to use `current_partner_slug()` and cannot turn `partner_admin` into provisioning access. Service-role clients remain server-only, and provisioning/Phase 1 RPCs additionally validate the actor UUID in the database.

The new migration consolidates the content resolver, Wilma telemetry SELECT, and LegalEase OS support ALL policy on `public.is_internal_admin()`. Its isolated tests prove canonical allow, role-only/inactive/partner/participant denial, service-role preservation, public-view preservation, tenant isolation, and historical-row preservation. A credentialed non-production database verification remains required before merge; no external database was used in this task.

## Identity, denial, sign-out, and caching

The shared `/internal` shell persistently shows server-derived email, effective role, and an accessible Sign out button at desktop and mobile widths. It never renders the Auth UUID.

An authenticated denied account sees its server-derived email, a clear inactive-authorization explanation, Sign out, and Sign in with another account. The denial renders before child internal content.

Ordinary Sign out explicitly uses Supabase's local scope, clears the current SSR session cookies, returns a 303 to `/sign-in?signedOut=1`, emits a security event, and returns `no-store` plus `Clear-Site-Data: "cache"`. Internal responses are forced dynamic and carry private no-store headers. Administrative global revocation remains a separate guarded production operation.

## Audit visibility

Application security logs record allowed/denied internal access and sign-out with Auth UUID, route, decision, role where available, timestamp, and request/request-platform correlation ID. Existing partner/onboarding/content audit paths continue to record invitation, workspace, role, commercial-gate, publication, activation, and review operations. Tokens, cookies, secrets, passwords, and participant legal facts are excluded by the logger allowlist.

`scripts/security/audit-internal-admin-access.mjs` performs an exact-email, read-only audit and emits no broad user dump. It reports the Auth UUID and verification state, all canonical memberships, disabled memberships, partner memberships, relevant metadata claims, content-role conflicts, legacy allowlist matches, exact-actor onboarding/content events, and authority conflicts. The installed Supabase Admin SDK cannot list sessions by user UUID, so the report states that limitation rather than inventing a result.

## Boundary tests

The focused synthetic matrix covers unauthenticated, participant, partner viewer, partner staff, partner administrator, external personal-email, corporate-domain-without-role, active internal administrator, revoked internal administrator, and completed-expiration/disabled administrator identities. It also covers direct API denial, mutation guard ordering, publication, activation, invitations, commercial gate, no partner data in denial payloads, metadata and legacy-token non-bypass, identity UI, keyboard focus, local sign-out, post-sign-out denial, Back/cache controls, and safe local return paths.

Before edits, the base revision's proxy/session suite passed 20/20, the first-admin provisioning suite passed, and the RCAP partner-provisioning suite passed 33 checks. Those results and the guard-before-data trace are recorded separately from the after-state in `rcap-internal-admin-pre-hardening-matrix.json`. The local database tenant-isolation suite could not start because `RCAP_TEST_DATABASE_URL` was not configured. The new isolated PGlite suite applies the real migration and verifies same-tenant access plus cross-tenant denial, but it does not substitute for the credentialed non-production integration suite.

The external-email regression is synthetic and contains neither real incident address:

`authenticated external-email UUID + no active internal authorization = 403 / access denied`

After-state repository verification on 2026-08-23:

- canonical application boundary: 31/31 focused checks passed;
- RLS overlay: the real migration passed the isolated PGlite boundary suite without an external database;
- content boundary and route suites: passed;
- first-admin provisioning: passed;
- RCAP partner provisioning: 33/33 checks passed;
- onboarding security, prefill RLS, artifact security, and workflow suites: passed;
- Command Center summary canonical-session verifier: passed;
- audit/remediation tool guardrails: passed;
- TypeScript: passed;
- ESLint: passed with 102 repository warnings and zero errors;
- `RCAP_TEST_DATABASE_URL`: absent, so the credentialed non-production RLS/tenant suite remains required;
- staging browser identities: absent, so desktop/mobile browser acceptance remains required.

## Production boundary

No production account, membership, metadata, session, customer row, secret, or environment variable was read or modified in this work. Follow `rcap-internal-admin-production-remediation.md` as a separately approved production change. Until that runbook disables the personal UUID's canonical membership, deployed code must continue to honor any active canonical row; hardcoding an email denial would create another unsafe authority.
