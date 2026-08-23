# Independent security review — RCAP internal-admin hardening (c1b65603)

Independent reviewer record. The implementing session is not the reviewer. Nothing in the
implementation was repaired, no migration was applied, no production system, account, session,
or credential was accessed, and no merge or deploy was performed.

## 1. Frozen review input

| Field | Value |
| --- | --- |
| CANDIDATE_SHA | `c1b65603eba80c19f48919f70ae7cccfb3f5c026` |
| BASE_SHA | `dd93579871962260b12918e54c44cf9bf1e81529` |
| Implementation branch | `codex/rcap-internal-admin-auth-hardening` |
| Review branch | `codex/review-rcap-internal-admin-c1b65603` |
| Candidate is the exact remote branch head | yes |
| Base is an ancestor of the candidate | yes |
| Tracked worktree clean at review start | yes |
| Merge/rebase in progress | none |

IMPLEMENTATION_COMMITS (base..candidate):

- `01bcec9f` security: harden internal admin application boundary
- `2469be8b` security: consolidate internal admin RLS authority
- `63037f81` security: reconcile internal admin remediation controls
- `c1b65603` security: preserve internal admin deep-link redirects

CHANGED_PATHS (42 files, +2835 / −1437):

- application: `src/proxy.ts`, `src/app/internal/layout.tsx` (new), `src/app/internal/content/layout.tsx`,
  `src/app/internal/content/settings/page.tsx`, `src/app/internal/partner-users/new/page.tsx`,
  `src/app/internal/partner-users/invite/route.ts`, `src/app/sign-out/route.ts`,
  `src/app/api/internal/analytics/summary/route.ts`,
  `src/app/api/internal/content/posts/[id]/transition/route.ts`,
  `src/app/api/internal/partners/provisioning/route.ts`,
  `src/app/api/internal/pilot-requests/status/route.ts`,
  `src/components/content/admin/ContentDenied.tsx`, `src/lib/content/auth.ts`,
  `src/lib/observability/logger.ts`, `src/lib/partners/internal-admin-gate.tsx`,
  `src/lib/partners/session-partner.ts`
- database: `supabase/migrations/20260823171000_internal_admin_authority_hardening.sql` (added, only
  migration touched)
- tooling/tests: `scripts/security/audit-internal-admin-access.mjs`,
  `scripts/security/remediate-internal-admin-accounts.mjs`,
  `scripts/test-internal-admin-rls-hardening.mjs`, `scripts/verify-internal-admin-security-tools.mjs`,
  `scripts/verify-internal-admin-browser-access.mjs`, `scripts/lib/internal-auth-test-doubles.mjs`,
  `scripts/lib/internal-auth-test-loader.mjs`, `scripts/verify-content-cms-access.mjs`,
  `scripts/verify-command-center-summary.mjs`, `scripts/verify-content-visual.mjs`,
  `scripts/verify-launch-readiness.mjs`, `scripts/capture-internal-admin-access-acceptance.mjs`,
  `package.json`
- documentation/evidence: `.env.example`, `docs/CONTENT_PLATFORM.md`,
  `docs/PHASE_17_PRODUCTION_DEPLOYMENT.md`, `docs/WEB_ANALYTICS.md`, and eight
  `docs/security/rcap-internal-admin-*` records

No implementation path was altered by this review.

## 2. Root cause — independently reconstructed

Traced request path, read from code rather than from the implementation report:

1. `src/proxy.ts` matches `/internal**`, refreshes the Supabase SSR cookies, strips any
   caller-supplied `x-legalease-internal-path` header and rewrites it from
   `request.nextUrl.pathname`, then applies `private, no-store` + `noindex` response headers. It
   makes no authorization decision.
2. `src/app/internal/layout.tsx` and every `/internal` page call
   `resolveInternalAdminPageAccess()` → `requireInternalAdminSession()`.
3. `resolveSessionPartner()` (`src/lib/partners/session-partner.ts`) calls
   `supabase.auth.getUser()` on the server, then queries `public.partner_users` filtered by
   `auth_user_id = <server-verified Auth UUID>` and `status = 'active'`.
4. An internal session is returned only when the single resolved row has `role = 'internal_admin'`
   and `partner_slug IS NULL`, and the authenticated user has a current email.
5. Only then does the page call `getAllPartners()` / `getPartnerRecordBySlug()` / equivalents.

Confirming schema facts read from `supabase/migrations/20260728213131_remote_schema.sql`:

- `partner_users.auth_user_id` carries a `UNIQUE` constraint, so at most one membership row can
  exist per Auth UUID; the "ambiguous identity" branch is defence-in-depth only.
- `partner_users_role_partner_slug_check` forces `partner_slug IS NULL` for `internal_admin`.
- `public.is_internal_admin()` is `auth.uid()` + `status = 'active'` + `role = 'internal_admin'` +
  `partner_slug is null`, identical to the application rule.
- there is no `expires_at` column; revocation and completed expiry are represented by
  `status = 'disabled'`, which the resolver denies.

Alternative grant paths searched at the candidate: hardcoded emails, email-domain tests,
environment allowlists, `app_metadata` / `user_metadata` / JWT claims, `partner_admin` equivalence,
`content_admin_users`, `content_current_role`, `INTERNAL_ADMIN_ACCESS_TOKEN`,
`COMMAND_CENTER_API_KEY`, proxy bearer admission, `NODE_ENV`/preview bypasses, owner or founder
exceptions, and inactive/revoked role paths. None grants internal access at the candidate. No
application path can write `role = 'internal_admin'` into `partner_users`: the only invitation
writer (`src/lib/partners/add-partner-user.ts`) allowlists `partner_admin` and `partner_staff`.

ROOT CAUSE CONFIRMED. The reported personal-Gmail access is fully explained by that Auth UUID
holding an active, global `internal_admin` membership in `public.partner_users`. Email ownership
and email domain are not consulted anywhere in the authorization path, at base or at the candidate.

## 3. Canonical guard

`requireInternalAdminSession()` satisfies every required property: server-verified Auth UUID;
active membership required; global/null partner scope required; inactive/revoked/expired denied;
fail-closed on database error, ambiguity, unknown role, partner-scoped internal row, or missing
authenticated email; returns effective identity (`authUserId`, `email`, `role`); never reads a
client-supplied email or role; `partner_admin` is a separate `kind` and can never satisfy it.

Coverage verified by direct inspection, not by trusting the candidate's own textual scan:

- 39 `/internal` pages: 38 call `resolveInternalAdminPageAccess()` or `resolveContentPageAccess()`
  directly; `src/app/internal/pilot-requests/page.tsx` authorizes through
  `listPilotRequestsForInternalAdmin()`, which calls `requireInternalAdminSession()` before it
  touches the service-role client. Guard-before-read ordering spot-checked on the provisioning,
  partner-admin, billing, partner-data, and CMS article pages.
- 31 internal route handlers (`src/app/api/internal/**/route.ts` and
  `src/app/internal/**/route.ts`) reach the same resolver through five adapters, each of which was
  read to its terminus: `requireInternalAdminRouteAccess`, `requireInternalAdminSession`,
  `denyUnlessInternalAdmin` (`onboarding/legacy-internal-http.ts`),
  `requireInternalOnboardingContext` (`onboarding/auth-context.ts`), and
  `denyUnlessContentCapability` (`src/lib/content/auth.ts`).
- invitation, workspace creation, commercial gate, publication, activation, role/user management,
  billing creation, and the Phase 1 artifact download all authorize before parsing a body or
  performing a mutation.
- no `"use server"` server actions exist under `src/app/internal`, `src/lib/partners`, or
  `src/lib/content`, so no unguarded action surface exists.

The new `/internal` layout is an additional boundary, not a substitute: every page keeps its own
guard, which is the correct arrangement because a Next.js layout does not re-run on every client
navigation and does not block a concurrently rendering page's data fetch.

## 4. Competing authorities

Closed by this candidate:

| Authority | Where it lived | Closure |
| --- | --- | --- |
| `INTERNAL_ADMIN_ACCESS_TOKEN` proxy bearer admission | `src/proxy.ts` | constant-time bearer path, session probe, and 401 recovery page removed; variable removed from `.env.example` |
| `content_admin_users` application fallback | `src/lib/content/auth.ts` | `resolveContentSession()` now delegates to `requireInternalAdminSession()` only |
| `COMMAND_CENTER_API_KEY` on an internal API | `src/app/api/internal/analytics/summary/route.ts` | replaced with `requireInternalAdminRouteAccess()` |
| `content_current_role()` DB fallback | `content_current_role()` | returns `primary_admin` only when `public.is_internal_admin()`, else `null` |
| Wilma telemetry role-only RLS | `consumer wilma telemetry internal safety select` | replaced with `using (public.is_internal_admin())`, `to authenticated` |
| Support-queue role-only RLS | `legalease_os_support_items_internal_admin_all` | replaced with `using`/`with check (public.is_internal_admin())`, `to authenticated` |

The prior predicates were read from `supabase/migrations/20260728213131_remote_schema.sql`. Both
replaced policies admitted a bare `role IN ('internal_admin','safety_reviewer')` /
`('internal_admin','support_reviewer')` match with no `status` and no partner-scope test, so a
disabled membership and two non-canonical role strings previously satisfied them. Policy names in
the migration match the deployed names exactly, so the `drop policy if exists` statements target
the real objects.

Remaining non-canonical authority (recorded, not an internal-boundary bypass):

- `COMMAND_CENTER_API_KEY` still independently authorizes `GET /api/metrics/signups`. That route is
  outside `/internal`, returns only `count: exact, head: true` aggregates, and cannot reach an
  internal page, API, or mutation. It is nevertheless a live bearer authority that
  `docs/security/rcap-internal-admin-authorization-audit.md` and
  `rcap-internal-admin-authorization-map.json` describe as scoped to
  `/api/internal/analytics/summary` only. The inventory is incomplete.

## 5. Migration review

`supabase/migrations/20260823171000_internal_admin_authority_hardening.sql` is additive and
non-destructive: one `create or replace function`, two `drop policy if exists` + `create policy`
pairs, three comments, and function grants. It contains no `insert`, `update`, `delete`,
`truncate`, `drop table`, `drop column`, or Auth mutation, and touches no participant, partner,
content, support, telemetry, or Auth row.

- content role: privileged `primary_admin` only when `public.is_internal_admin()` is true;
  `content_admin_users` rows are preserved as history and can no longer produce a privileged role.
  `content_admin_users_select_self` (own-row visibility) is unchanged and cannot manufacture a role.
- Wilma telemetry: privileged SELECT is `public.is_internal_admin()` for `authenticated`. Partner
  role, content role, email domain, and inactive membership cannot substitute.
- support queue: `for all to authenticated using (public.is_internal_admin()) with check
  (public.is_internal_admin())`.
- service role: all three writers of `legalease_os_support_items`
  (`src/lib/legalease/launch-os-events.ts`, `src/lib/legalease/correspondence.ts`,
  `src/lib/expungement-ai/support-os-adapter.ts`) use `getSupabaseAdminClient()`; the new `to
  authenticated` clause therefore removes nothing that service-role intake relied on. Under the
  prior policies `auth.uid()` was null for a service-role caller, so those predicates never matched
  anyway — the change is behaviour-preserving for service role in both directions.
- public view: no view, grant, `anon` policy, or public predicate is modified.
- tenant isolation: `current_partner_slug()` partner policies are untouched and unreferenced by the
  migration.
- historical rows: preserved; the candidate's PGlite suite snapshots and diffs them across the
  migration.

The rollback SQL in `docs/security/rcap-internal-admin-rls-migration-blocker.md` was compared
statement by statement with the pre-change definitions in `remote_schema.sql` and restores them
exactly, including the absent `TO` clause on both policies. It correctly names the three
authorities rollback would reopen.

The migration was NOT executed against any database in this review.

Recorded consequence for staging acceptance: every non-internal content role
(`editor`, `legal_reviewer`, `social_manager`, `contributor`, `partner_contributor`) loses
privileged CMS access at both layers. `docs/security/rcap-internal-admin-rls-blast-radius.md`
classifies this as intended and no application path depends on those roles, but a credentialed
staging pass should confirm no live content operator is currently working through one.

## 6. Identity, denial, sign-out

- `/internal` shell renders server-derived `access.session.email` and `access.session.role` and an
  `aria-label`led Sign out submit button with `focus-visible:ring-2`, `min-h-10`, and a
  `sm:` responsive layout. The Auth UUID is never rendered.
- denied authenticated account: `InternalAdminDenied` shows the server-derived email, a Sign out
  form, and a `intent=switch-account` form. The denial payload carries no partner data — the layout
  returns before rendering `children`, and the denial object contains only title/body/email.
- `/sign-out` POST calls `supabase.auth.signOut({ scope: "local" })` (which revokes that session's
  refresh token server-side), writes cleared cookies through the SSR cookie adapter, returns 303 to
  `/sign-in?signedOut=1` or `?switchAccount=1`, and sets `private, no-store, must-revalidate`,
  `Clear-Site-Data: "cache"`, `Expires: 0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`.
  Internal responses are `force-dynamic` + `noStore()` + proxy `no-store`, so a Back navigation
  cannot replay a protected response or perform a protected action. Already-issued access JWTs
  remain valid until `exp`, which the runbook states explicitly and which the per-request
  membership recheck neutralises for internal operations.

Open finding on returnTo — see Finding 1.

## 7. Audit and remediation tooling

`scripts/security/audit-internal-admin-access.mjs` is read-only: exact-email match, `select` and
`auth.admin.listUsers` only, no write method anywhere in the file, `--redact` mode available, and
it declares the SDK's session-listing limitation instead of inventing a result.

`scripts/security/remediate-internal-admin-accounts.mjs`: dry-run by default; `--apply` required;
both exact Auth UUIDs required and asserted against the exact-email resolution; refuses when either
email does not resolve to exactly one Auth user; refuses when the two expected UUIDs are equal;
grant and revoke are separate modes and revoke refuses unless the corporate UUID is already exactly
one active global internal administrator and `--confirm-corporate-access` is passed; never deletes
an Auth user, never changes an email, and disables rather than deletes membership and legacy
content-role rows; the receipt records emails, UUIDs, and planned operations but no token or key;
`safeError()` truncates and strips messages; session revocation uses the supported
`auth.admin.signOut(jwt, "global")` call with a locally decoded `sub`/`exp` check against the
expected personal UUID.

Lockout protection holds through the revoke precondition
(`corporate.activeInternalAdminRecords.length !== 1` → refuse). Note that the explicit
`plannedActive.size < 1` check is vacuous, because the corporate UUID is unconditionally added to
that set before the test; it is not the control that actually prevents lockout.

The runbook may name the two real production emails and does. No general application authorization
code and no synthetic fixture hardcodes either address —
`scripts/verify-internal-admin-browser-access.mjs` asserts their absence from the proxy, the
resolver, and the gate, and an independent grep across `src/`, `scripts/`, and `data/` found them
only in unrelated report branding templates and in that assertion itself.

No remediation command was executed. PRODUCTION MUTATIONS EXECUTED: none.

## 8. Independent test execution

Environment: `npm ci` on Node v22.22.2, clean tracked worktree at the candidate SHA.

| Suite | Result |
| --- | --- |
| `scripts/verify-internal-admin-browser-access.mjs` | pass, 31/31 |
| `scripts/test-internal-admin-rls-hardening.mjs` (real migration in isolated PGlite) | pass |
| `scripts/verify-internal-admin-security-tools.mjs` | pass |
| `scripts/verify-content-cms-access.mjs` | pass |
| `scripts/verify-command-center-summary.mjs` | pass |
| `scripts/verify-launch-readiness.mjs` | pass |
| `scripts/verify-rcap-phase52-consumer-payment-authority.mjs` | pass, 32/32 |
| `scripts/test-rcap-phase52-mutations.mjs` | pass, 12/12 mutations caught |
| `npx tsc --noEmit` | pass |
| `npx eslint` | 0 errors, 102 pre-existing warnings |
| `scripts/verify-legacy-internal-admin-gates.mjs` | not run — requires `PARTNER_RLS_*` staging credentials |
| full `npm test` | **fail** at `scripts/verify-rcap-verifier-dispositions.mjs` (candidate-caused, see Finding 4) |

The focused matrix executed by the candidate's suite covers, with synthetic identities only:
unauthenticated redirect-before-data; participant, partner viewer, partner staff, partner
administrator, external personal-email (with forged `app_metadata`/`user_metadata`
`role: internal_admin`), corporate-domain-without-role, revoked, and expired/disabled denial;
active global internal-admin success with server-derived identity; direct API 401/403; mutation and
publication/activation/invitation/commercial-gate guard ordering; identity and role display;
Sign out and post-sign-out denial; Back/cache contract; content-role and partner-admin
non-equivalence; and no partner data in a denied payload. The RLS suite additionally proves
service-role preservation, public-view preservation, tenant isolation, and historical-row
preservation against the real migration.

Problem-class regression confirmed: an authenticated external-email UUID with no active global
`internal_admin` row is denied by `requireInternalAdminSession()` before any protected read, both
in the resolver test and in the page-gate test that asserts the denial object contains no
`partnerSlug`.

## 9. Phase 52 attribution

The implementation reported `npm test` red on a Phase 52 payment mutation suite with 12 surviving
mutations. That did not reproduce here.

- `scripts/test-rcap-phase52-mutations.mjs`,
  `scripts/verify-rcap-phase52-consumer-payment-authority.mjs`, and the harness target
  `supabase/phase-52-rcap-consumer-payment-authority.sql` are byte-identical between
  `dd93579871962260b12918e54c44cf9bf1e81529` and `c1b65603` (identical blob SHAs).
- Run at the candidate on a clean tracked tree, the verifier passes 32/32 and the mutation harness
  reports 12/12 mutations red — i.e. all twelve defences are load-bearing.
- The suite is outside every changed authorization path; nothing under `supabase/phase-52-*`,
  `src/lib/expungement-ai/consumer-payment-authority.ts`, or the payment routes was touched.

Attribution: not caused by the candidate, and not currently failing. The reported red run is most
consistent with an interrupted or dirty local harness run (the harness mutates and restores its
target migration in place and installs signal-safe restore guards precisely because two earlier
interrupted runs left tracked mutations behind). No payment or Phase 52 code was modified by this
review.

Full-suite result at the candidate: `npm test` is **red**, but not on Phase 52 and never reaching
it. The chain stops earlier, at `scripts/verify-rcap-verifier-dispositions.mjs`, which runs before
`verify-rcap-phase52-consumer-payment-authority.mjs` in the `test` script. See Finding 4 — that
failure is caused by this candidate, not by Phase 52.

## 10. Scope and hygiene

Every protected tree recorded in `docs/security/rcap-internal-admin-protected-scope-baseline.json`
was independently compared base→candidate. All are byte-identical except `supabase/migrations`,
which differs only by the single added hardening migration; no existing migration was modified.
That covers Expungement.ai state/remedy flow, Clinic Mode, PDF implementation/evidence/review,
payment and entitlement, packet credits, participant Briefcase, worker, deployment, and unrelated
onboarding business logic. The recorded baseline object SHAs also match the real base tree.

Secret and production-data scan over the full diff found no committed secret, token, cookie,
service-role key, production database export, or production user record. The two real production
emails appear only in the production runbook, which is permitted.

## Findings

### Finding 1 — `returnTo` accepts a backslash-prefixed off-site path (BLOCKER)

`src/lib/auth/redirect.ts::safeAppRedirectPath()` rejects `//host`, absolute URLs, and
scheme-prefixed values, but accepts a single-backslash form. `/\evil.com` passes the filter, and
`window.location.assign()` in `src/app/sign-in/page.tsx` resolves it through the WHATWG URL parser,
which treats `\` as `/` for special schemes:

```
input:                 "/\evil.com"
safeAppRedirectPath -> "/\evil.com"
new URL(value, "https://app.example/sign-in").href -> "https://evil.com/"
```

Verified locally against Node v22's URL parser. `/sign-in?next=/\evil.com` is therefore an open
redirect usable for credential phishing against exactly the sign-in page this hardening routes
denied internal users to.

The defect is pre-existing: `src/lib/auth/redirect.ts` is unchanged by the candidate, and the
candidate's own flows never produce an unsafe value (the internal gate's `next` is derived from a
proxy-controlled `x-legalease-internal-path` that is always overwritten and always begins with
`/internal`). It is reported as a blocker because the review's acceptance criterion is
"returnTo accepts safe local internal paths only", because
`scripts/verify-internal-admin-browser-access.mjs` adds an assertion named "returnTo accepts safe
local paths only" that does not cover this form, and because the fix is one predicate inside the
hardening's own scope.

Suggested correction (for the implementing session, not applied here): reject any value containing
a backslash or a control character, and add `"/\\attacker.test"` and `"/\\\\attacker.test"` to the
existing unsafe-value table in the focused suite.

### Finding 2 — remediation receipt defaults into a tracked repository directory (correction)

`scripts/security/remediate-internal-admin-accounts.mjs` defaults `receiptPath` to
`artifacts/security/internal-admin-remediation-<mode>-<timestamp>.json`. `artifacts/` is a tracked
directory in this repository (it already contains committed PNG evidence) and neither `artifacts/`
nor `artifacts/security/` is matched by `.gitignore` (`git check-ignore` returns not-ignored). The
receipt contains the production corporate and personal emails and both production Auth UUIDs.

The receipt itself is non-secret (no token, no key), the file is written `0o600` with `flag: "wx"`,
the tool prints a "do not commit" warning, the runbook always passes an explicit
`--receipt <SECURE_EVIDENCE_PATH>/…`, and `AGENTS.md` forbids `git add .`. The risk is therefore
residual rather than realised — but a production account export should not default to a path inside
the working tree.

Suggested correction: require `--receipt` in apply mode, or default outside the repository, and/or
add `artifacts/security/` to `.gitignore`.

### Finding 3 — `COMMAND_CENTER_API_KEY` inventory is incomplete (recommended)

See section 4. `GET /api/metrics/signups` still authorizes on that bearer key; the audit document
and the authorization map describe the key's scope as `/api/internal/analytics/summary` only.
No internal page, API, or mutation is reachable through it and it returns aggregate counts only, so
this is an accuracy defect in the inventory rather than a bypass. Either close the route on the
canonical session as well, or record it explicitly as a retained non-internal machine authority.

### Finding 4 — the candidate makes `npm test` red at the verifier-disposition gate (BLOCKER)

`npm test` fails at the candidate. It does not reach Phase 52; it stops earlier at
`scripts/verify-rcap-verifier-dispositions.mjs`:

```
Verifier disposition verification failed:
- test-internal-admin-rls-hardening.mjs: no recorded disposition
- verify-internal-admin-security-tools.mjs: no recorded disposition

Regenerate with: npm run rcap:generate-verifier-dispositions
```

Attribution is unambiguous:

- `data/rcap-verifier-dispositions.json` is byte-identical between base and candidate
  (blob `c5e83a9f0f12831540abb5deef240940a46a384e`), and contains no entry for either new script.
- The two unrecorded scripts are both **added by this candidate**.
- Extracting the base tree and running the same verifier against it passes 340/340.

So the candidate adds two verifier scripts without regenerating the register that `npm test`
enforces, turning the repository's default gate red.

The same omission is why the new regression protection does not actually run in CI:
`scripts/test-internal-admin-rls-hardening.mjs` has an npm alias
(`security:test-internal-admin-rls`) but no caller in `npm test` or any workflow, and
`scripts/verify-internal-admin-security-tools.mjs` has neither an alias nor a caller — it is
referenced only from `docs/security/rcap-internal-admin-checkpoint-inventory.json`. Only
`scripts/verify-internal-admin-browser-access.mjs` runs in `npm test`. The RLS consolidation and the
remediation-tool guardrails are therefore both unprotected against regression and the reason the
suite is red.

Suggested correction: run `npm run rcap:generate-verifier-dispositions`, record a deliberate
disposition for both scripts, and wire at least `security:test-internal-admin-rls` into the default
gate so the migration boundary is defended in CI.

### Finding 5 — `/sign-out` has no same-origin check (informational)

`POST /sign-out` accepts a cross-site form submission, unlike
`src/app/internal/partner-users/invite/route.ts`, which calls `isSameOriginRequest()`. The impact is
limited to a forced sign-out (a nuisance, and in the fail-safe direction), but the asymmetry is
worth closing when the route is next touched.

### Finding 6 — `/internal` is no longer refused at the edge on public product hosts (informational)

Removing the proxy authority means `/internal**` now reaches the application on `expungement.ai`,
`legalease.com`, `legalease.law`, and `cleartherecord.org` and renders the server-side denial screen
there instead of the proxy's 401. Authorization is unaffected — every page and handler still
resolves the canonical membership — and `X-Robots-Tag: noindex, nofollow` plus `no-store` are
applied. The host-scoping assertions that
`scripts/verify-content-cms-access.mjs` previously carried were removed with the proxy authority and
were not replaced by an equivalent host-level assertion.

### Finding 7 — non-internal content roles lose all CMS access (informational)

See section 5. Intended and documented; confirm during credentialed staging acceptance that no live
content operator depends on an `editor`, `legal_reviewer`, `social_manager`, `contributor`, or
`partner_contributor` row.

### Finding 8 — vacuous zero-administrator check (informational)

See section 7. `plannedActive.size < 1` can never be true. Lockout protection is real but rests
entirely on the `corporate.activeInternalAdminRecords.length !== 1` precondition; the redundant
check should either be made meaningful or removed so it is not mistaken for the control.

## Verdicts

### A. CODE_AND_STATIC_SECURITY_REVIEW

**CORRECTION_REQUIRED.**

The security design is sound and, on every substantive axis of this review, verified: the stated
root cause is supported by the real request path; one UUID-bound canonical authority is
established and is applied independently to every internal page, API route, and mutation before any
protected read or parse; six competing authorities are closed across the application and the
database; the migration is additive, correctly targeted, and preserves service-role, public-view,
tenant-isolation, and historical rows; identity, denial, and sign-out are server-derived and safe;
and the audit and remediation tooling is read-only-by-default, dry-run-first, exact-UUID-bound, and
cannot leave zero recovery administrators.

Correction is required for Findings 4, 1, and 2.

The exact blocker is Finding 4: the candidate turns the repository's default test gate red. Two
verifier scripts it adds have no entry in `data/rcap-verifier-dispositions.json` (which it leaves
unchanged), so `npm test` fails at `scripts/verify-rcap-verifier-dispositions.mjs` — before it ever
reaches Phase 52. Base passes the same check 340/340. The same omission leaves the new RLS boundary
suite and the remediation-tool guardrails unrun in CI.

Finding 1 must be corrected alongside it: the returnTo predicate this review is required to certify
accepts `/\host`, which resolves to an off-site origin, and the candidate's own regression assertion
claims a property the code does not have. Finding 2 is a small hygiene correction to a tool this
candidate adds.

### B. CREDENTIALED_STAGING_ACCEPTANCE

**ENVIRONMENT_BLOCKED — not performed, and still mandatory.**

`RCAP_TEST_DATABASE_URL`, a staging URL, and synthetic staging identities are unavailable in this
review environment. Production was not used as a substitute. The following remain outstanding and
cannot be satisfied by static review:

- applying the migration to a credentialed non-production database and running the post-apply
  catalog checks in `rcap-internal-admin-rls-migration-blocker.md`;
- the credentialed RLS/tenant-isolation identity matrix
  (`scripts/verify-onboarding-tenant-isolation.mjs`, `scripts/verify-legacy-internal-admin-gates.mjs`);
- desktop and mobile browser acceptance of identity display, role display, Sign out,
  post-sign-out denial, and Back-navigation behaviour with real staging identities.

This candidate is not approved for merge, not approved for production, and not a foundation for
Clinic Mode work.
