# Independent security re-review — RCAP internal-admin hardening (fc8a391a)

Reviewer-owned record. The implementing session is not the reviewer. No implementation file or
implementation test was modified, no finding was repaired, no migration was applied, no production
system, account or session was touched, and nothing was merged or deployed.

## 1. Frozen re-review input

| Field | Value |
| --- | --- |
| CANDIDATE_SHA | `fc8a391a355bfd94cc494ea5da058482c76e5534` |
| PRIOR_CANDIDATE_SHA | `c1b65603eba80c19f48919f70ae7cccfb3f5c026` |
| BASE_SHA | `dd93579871962260b12918e54c44cf9bf1e81529` |
| Implementation branch | `codex/rcap-internal-admin-auth-hardening` |
| Re-review branch | `codex/review-rcap-internal-admin-fc8a391a` |
| Prior review head | `9dcf3decd322e2ec6c8587e9270e7fc9011feba5` (verdict CORRECTION_REQUIRED) |
| fc8a391a is the exact branch head | yes |
| c1b65603 is an ancestor | yes |
| dd935798 is an ancestor | yes |
| Tracked worktree clean | yes |
| Merge/rebase in progress | none |

CORRECTION_COMMITS (`c1b65603..fc8a391a`):

- `8f4c9982` security: close redirect and sign-out request boundaries
- `05091088` security: harden remediation receipts and lockout guarantees
- `fc8a391a` test: wire security verifiers and correct authority inventory

CHANGED_PATHS (18 files, +1090 / -131):

- application (2): `src/lib/auth/redirect.ts`, `src/app/sign-out/route.ts`
- security tooling (2): `scripts/security/audit-internal-admin-access.mjs`,
  `scripts/security/remediate-internal-admin-accounts.mjs`
- new tests (3): `scripts/security/test-auth-redirect-security.mjs`,
  `scripts/security/test-sign-out-origin.mjs`, `scripts/security/test-internal-admin-remediation.mjs`
- existing tests (4): `scripts/test-internal-admin-rls-hardening.mjs`,
  `scripts/verify-internal-admin-security-tools.mjs`, `scripts/verify-internal-admin-browser-access.mjs`,
  `scripts/verify-command-center-summary.mjs`
- harness/registry (3): `scripts/lib/internal-auth-test-doubles.mjs`,
  `scripts/generate-rcap-verifier-dispositions.mjs`, `data/rcap-verifier-dispositions.json`
- chain (1): `package.json`
- documentation (3): `docs/security/rcap-internal-admin-authorization-audit.md`,
  `docs/security/rcap-internal-admin-authorization-map.json`,
  `docs/security/rcap-internal-admin-production-remediation.md`

No implementation-owned path was altered by this review.

## 2. Previously approved architecture is preserved

Every file carrying the approved UUID-bound boundary is **byte-identical** to its c1b65603 blob:
`src/lib/partners/session-partner.ts`, `src/lib/partners/internal-admin-gate.tsx`,
`src/lib/content/auth.ts`, `src/proxy.ts`, `src/app/internal/layout.tsx`,
`src/app/internal/content/layout.tsx`, `src/components/content/admin/ContentDenied.tsx`,
`src/lib/observability/logger.ts`, the four corrected internal routes, and
`supabase/migrations/20260823171000_internal_admin_authority_hardening.sql`.

Coverage was re-derived at fc8a391a rather than carried over from the prior record:

- 39 `/internal` pages, 39 carrying a direct canonical gate
  (`resolveInternalAdminPageAccess`, `resolveContentPageAccess`, or
  `listPilotRequestsForInternalAdmin`, which authorizes before its service-role read).
- 33 internal route handlers (`src/app/api/internal/**` + `src/app/internal/**`), 33 gated through
  the five canonical adapters.
- The internal surface is unchanged in size and membership across `dd935798`, `c1b65603` and
  `fc8a391a` (33 handlers / 39 pages at each); the correction adds or removes no internal route or
  page.
- Zero `"use server"` server actions under `src/app/internal`, `src/lib/partners`, `src/lib/content`.
- No email-string, email-domain, environment-allowlist, `app_metadata`, `user_metadata` or JWT-claim
  authority exists anywhere in the canonical path.
- Guard-before-read ordering re-checked on the provisioning, partner-admin and CMS article pages.

Authorization therefore remains: server-verified `auth.getUser()` -> Auth UUID ->
`public.partner_users` -> `status = 'active'` -> `role = 'internal_admin'` ->
`partner_slug IS NULL`, failing closed on database error, ambiguity, unknown role, partner-scoped
internal row and missing email. `partner_admin` and `content_admin_users` grant nothing internally.

## 3. Prior finding 1 - verifier dispositions and CI execution: CLOSED

- `node scripts/verify-rcap-verifier-dispositions.mjs` passes **342 / 342** (base was 340/340).
- Register diff is exactly: the two new entries, plus `verify-command-center-summary.mjs` moving
  `keep_available -> wired` with the generated reason "Already reached by npm test." That entry's
  `decidedBy` was and remains `generated`, so no human rationale was rewritten; counts move
  `keep_available 179->178`, `wired 126->129`, consistent with +2 entries and +1 promotion.
- No prior disposition was removed.
- Regeneration is byte-identical: I ran `scripts/generate-rcap-verifier-dispositions.mjs` and `cmp`
  reported no difference against the committed register; the tree stayed clean.
- The three new `scripts/security/*` test scripts are outside the register's scan scope by
  pre-existing design (the generator scans only top-level `scripts/` for
  `^(verify|test|audit)-.*\.mjs$`), and they are wired explicitly instead.
- Both required scripts now execute in the default chain: `package.json#test` runs
  `security/test-auth-redirect-security.mjs`, `security/test-sign-out-origin.mjs`,
  `test-internal-admin-rls-hardening.mjs`, `verify-internal-admin-security-tools.mjs`,
  `security/test-internal-admin-remediation.mjs` and `verify-command-center-summary.mjs`
  immediately after `verify-internal-admin-browser-access.mjs`.
- The same seven run through the new `security:test-internal-admin` aggregate script.
- Mutation controls are real, and I validated each one's mechanism by reading the migration and the
  replacement strings, not just by observing a green run:
  - RLS verifier: three in-process mutations (`content_current_role` authority, Wilma `using (...)`,
    support `using`/`with check`) each provably break a marker or shape regex that
    `verifyMigrationSource()` asserts, and each is required to throw.
  - Tool verifier: four in-process mutations (tracked-path refusal, exclusive `wx` receipt creation,
    `assertPostPlanRecoverySet`, `assertAppliedInvariant`) are each required to make
    `verifyRemediationSource()` throw.
- Both suites pass at fc8a391a.

## 4. Prior finding 2 - returnTo safety: CLOSED

`safeAppRedirectPath()` now (a) rejects any value that is not `/`-initial, is `//`-initial, contains
a backslash, contains a C0/DEL control character, or carries a scheme; (b) repeats that shape test
across up to eight `decodeURIComponent` passes, failing closed on a malformed escape; and (c) parses
the **raw** value against a sentinel origin and requires `parsed.origin` to match and
`username`/`password` to be empty.

I tested it independently with a 33-value superset of the mission list, driving the real module:

- rejected (all fell back, none returned): `//evil.example`, `/\evil.example`, `\\evil.example`,
  `https://evil.example`, `http://evil.example`, `javascript:alert(1)`, `JaVaScRiPt:alert(1)`,
  `data:text/html,x`, `/%5Cevil.example`, `/%5c%5cevil.example`, `/%2Fevil.example`,
  `/%2f%2fevil.example`, `/%5C%5Cevil.example`, `/%09/evil.example`,
  `/%0d%0aLocation:%20https://evil.example`, `/%255CEvil.example`, `/%252f%252fEVIL.example`,
  `/%25255cEvil.example`, literal-tab and literal-CRLF forms, `/\/evil.example`, `//\evil.example`,
  `/%00/evil.example`, ` //evil.example`, `https:/evil.example`, `HTTPS://EVIL.EXAMPLE`,
  `//user:pass@evil.example`, `/%2f/evil.example`, `/%5cevil.example/path`,
  `//evil.example/%2e%2e`, tab-prefixed `//evil.example`, `/%u005cevil.example`.
- **no returned value, for any input, resolves off the application origin.**
- preserved: `/internal/partners/provisioning`, `.../provisioning/example`,
  `/internal/content/articles/123`, `.../provisioning?tab=access`, `.../provisioning#users`,
  `/internal/record-clearing/states/CA/review`, `/internal/partners/admin/acme-legal-aid`,
  `/internal/content/state-resources/ny` - each returned verbatim and each resolving to the
  application origin.

The nested-internal deep-link correction is not regressed: `src/proxy.ts` and
`src/app/internal/layout.tsx` are byte-identical to c1b65603, the proxy still strips and rewrites
`x-legalease-internal-path`, and the round trip `/sign-in?next=<encoded nested deep link>` ->
`safeAppRedirectPath` returns the nested path intact.

Informational only: a legitimate path whose query carries a literal `%25`, or an encoded backslash,
now falls back to the safe default rather than being followed. Fail-closed usability edge, not a
security defect.

## 5. Prior finding 3 - remediation receipt safety: CLOSED

`resolveReceiptOutput()` / `reserveReceipt()` / `writeReservedReceipt()` and the new
`buildRemediationReceipt()` satisfy every required control:

- dry-run writes no receipt - `resolveReceiptOutput` is reached only after the `if (!options.apply)`
  return, and the fixture test proves the tree is unchanged after planning;
- apply requires an explicit `--receipt-output` (rejected at parse time and again in
  `resolveReceiptOutput`);
- there is no default path at all;
- repository root refused; `.git` refused; Git-tracked path refused
  (`git ls-files --error-unmatch`); repository-local but unignored path refused
  (`git check-ignore -q --no-index`);
- symlink component refused (`assertNoSymlinkComponents`, `lstat().isSymbolicLink()`);
- an existing destination is refused, and `fs.openSync(..., "wx", 0o600)` makes silent overwrite
  impossible; `writeReservedReceipt` re-checks `lstat` and opens `O_NOFOLLOW|O_TRUNC` on a path this
  process reserved;
- a gitignored repository-local path succeeds - the candidate's fixture creates a real throwaway Git
  repo and proves it, including mode `0600`;
- receipt fields: `receiptVersion`, `operationId`, `status`, `timestamp`/`startedAt`/`completedAt`,
  `targetUserUuids`, `mode`, non-secret `beforeRoleState`/`afterRoleState`, `actionsPlanned` /
  `actionsAttempted` / `actionsCompleted`, `sessionRevocation`, `operatorIdentity`, `tool.path` +
  `tool.candidateSha`, `authUsersDeleted`, `authEmailsChanged`;
- **no email** is recorded any more (the prior version stored both), and no token, key, cookie, JWT
  or session value is; a failure records only a character-validated `error.name`.

No generated receipt is committed: `git ls-files` shows no receipt artefact and `artifacts/security`
is untracked.

The runbook now names the destination explicitly - incident evidence vault, absolute path outside
the source tree preferred, repository-local permitted only under approved gitignore rules - and
documents that dry-run writes nothing and that the receipt never records either email or the
injected credentials.

## 6. Prior finding 4 - Command Center inventory: CLOSED

`docs/security/rcap-internal-admin-authorization-map.json` gains a `nonInternalAuthorities` entry
for `GET /api/metrics/signups` recording route, source file, authentication mechanism (constant-time
SHA-256 bearer comparison against `COMMAND_CENTER_API_KEY`), returned data class, `aggregateOnly`,
query shape, tenant scope, rate limiting (`none at the route layer`), `personalDataPresent` /
`partnerLevelDataPresent` / `matterDataPresent` / `paymentRecordDataPresent` /
`paymentDerivedAggregatePresent` / `participantDataPresent`, `canInvokeInternalAction`,
`internalAdminBoundary` with a reason, and lifecycle - explicitly recording that no continued-use or
deprecation owner exists in the repository. The audit document carries the same disclosure in prose
and states that ownership must be assigned before the endpoint is changed or retired.

The route itself is byte-identical to c1b65603: `GET` only, two
`.select("*", { count: "exact", head: true })` queries against `consumer_briefcase_items`, returning
`{ registered, paid }`. No rows, no user/email/partner/matter/payment-record or participant data, no
tenant selector, no mutation path - it cannot invoke an internal action and it neither grants nor
participates in internal-admin authorization.

The inventory regression test is a genuine drift detector: `findApiKeyRoutes()` walks
`src/app/api/**/route.ts`, collects every exported method on any file referencing
`COMMAND_CENTER_API_KEY`, and requires the map's route list to match exactly. I verified the negative
case in an isolated copy of the tree - with the entry removed the verifier exits **1** with
`COMMAND_CENTER_API_KEY inventory mismatch: map=none; source=GET /api/metrics/signups` and 17 further
failures. It also asserts the route retains exactly two count-only queries, exports no mutating
method, and contains no rate limiter contradicting the recorded `rateLimiting`.

## 7. Prior finding 5 - Sign Out same-origin: **NOT CLOSED - new regression**

The check itself is correctly placed: `POST /sign-out` calls `isFirstAdminSameOriginRequest()`
before the Auth client is created, so an unsafe request cannot mutate a session; `GET` never
mutates; the 403 body is `{ ok: false, error: "Invalid request origin." }` with no session or partner
data; the redirect destinations are fixed local literals, so no returnTo open redirect is introduced.
The candidate's synthetic suite passes.

**But the corrected route cannot be reached by the very controls it is meant to protect.**

`src/proxy.ts` sets `Referrer-Policy: no-referrer` on every `/internal*` response
(`applyPrivateInternalHeaders`, line 305). Per the Fetch specification's *Append a request `Origin`
header* step, a non-CORS request with a method other than `GET`/`HEAD` from a document whose
referrer policy is `no-referrer` has its serialized origin set to `null`.

I verified this empirically in the pre-installed Chromium (local throwaway HTTP server, two
documents, one with the header and one without):

| document | request kind | `Origin` | `Referer` |
| --- | --- | --- | --- |
| control (no header) | HTML form POST | real origin | present |
| `Referrer-Policy: no-referrer` | HTML form POST | **`null`** | **absent** |
| `Referrer-Policy: no-referrer` | `fetch()` POST | real origin | absent |

`isFirstAdminSameOriginRequest()` reads `origin ?? referer`, gets the literal string `"null"`,
`new URL("null")` throws, and the helper returns `false` - so the route answers **403**.

Every internal Sign Out control is a plain HTML form POST rendered on an `/internal*` page:

- `src/app/internal/layout.tsx:56` - the shell "Sign out" button on every internal page;
- `src/lib/partners/internal-admin-gate.tsx:78` and `:86` - the access-denied page's "Sign out" and
  "Sign in with another account";
- `src/components/content/admin/ContentDenied.tsx:27` and `:35` - the same two controls on the CMS
  denial page.

So in a real browser: shell Sign Out fails, denial-page Sign Out fails, and the denied account's
switch-account path fails. `src/components/expungement-ai/ConsumerNav.tsx:85` is not under
`/internal`, receives no `no-referrer` header, and is unaffected; `fetch()`-based internal APIs such
as `/internal/partner-users/invite` are also unaffected, which is why the pre-existing helper worked
where it was previously used.

The candidate's own `scripts/security/test-sign-out-origin.mjs:32` deliberately asserts
`Origin: null -> 403`, and `scripts/verify-internal-admin-browser-access.mjs` was amended to inject
`origin: https://internal.test` into its synthetic Sign Out requests. Both are reasonable in
isolation; neither reproduces the header a browser actually sends from these pages, so the suite is
green while the shipped control is inert.

This is a regression against c1b65603, where these controls worked, and it defeats the access-denied
remediation path that the hardening introduced. Remediation is the implementer's call - the two
obvious directions are relaxing the internal referrer policy to `same-origin` or `strict-origin`
(which still suppresses cross-origin referrers while preserving a real `Origin`), or adding a
token/`Sec-Fetch-Site` based boundary that tolerates `Origin: null` for same-site navigations. No
repair was attempted here.

## 8. Prior finding 6 - lockout protection: CLOSED

The vacuous check is gone. `buildRemediationPlan()` now derives the authoritative set from real role
rows via `activeGlobalInternalAdminIds()`, which counts only
`role = internal_admin AND status = active AND partner_slug IS NULL` with a valid UUID - inactive
rows, partner-scoped rows, metadata claims, email domain and content roles are all excluded by
construction. In revoke mode the corporate UUID is **not** added to the planned set; it must already
be present, so `assertPostPlanRecoverySet()` is non-vacuous.

Refusals verified (by reading the code and by the candidate's live-call fixtures, which I re-ran):

| condition | control |
| --- | --- |
| zero administrators would remain | `assertPostPlanRecoverySet` + revoke precondition |
| only administrator is the Gmail account being disabled | `!before.has(expectedCorporateUuid)` -> refuse |
| corporate unverified | `assertPlanningIdentities` (`emailVerified`) |
| corporate membership partner-scoped | active partner membership and partner-scoped internal row both refused |
| corporate grant failed | grant/revoke are separate invocations and revoke requires an already-active corporate administrator; the fixture proves a failing grant never reaches personal disablement |
| both emails resolve to one UUID | `parseRemediationArgs` (equal expected UUIDs) and `assertPlanningIdentities` |
| ambiguous resolution | `assertExactIdentity` (`matchCount !== 1`), ambiguous corporate internal rows |

Allowances verified: a confirmed verified corporate grant plans one recovery administrator; Gmail
removal with corporate active yields `recoveryAdministratorCountAfter = 1`; a third administrator
yields `2`.

Ordering and preservation: `--confirm-corporate-access` is required for an applied revoke; the
corporate account must already be an authoritative active global administrator before the personal
account is touched; `deleteUser(` does not appear in the tool; memberships and legacy content roles
are `status = "disabled"` updates, never deletes; the Auth metadata update carries no `email` field
(asserted); and `assertAppliedInvariant()` re-audits **after** apply from live role state, requiring
the corporate UUID active, at least one active global administrator, and - in revoke mode - zero
active personal internal rows.

Also new and correct: the corporate account is refused if its Auth user is currently banned.

## 9. RLS migration

`supabase/migrations/20260823171000_internal_admin_authority_hardening.sql` is byte-identical to the
previously reviewed migration (same blob as c1b65603), and it remains the only migration this branch
touches. `scripts/test-internal-admin-rls-hardening.mjs` passes at fc8a391a, applying the real
migration in isolated PGlite and proving: `content_current_role()` privileged only through
`public.is_internal_admin()`; Wilma telemetry SELECT and LegalEase OS support `USING`/`WITH CHECK`
only through the same helper; content-role-only, inactive-administrator and partner-role identities
denied; service role preserved; the intentional public projection view preserved; tenant isolation
preserved and cross-tenant access denied; historical rows unchanged; no DML; no external or
production database contacted.

## 10. Authorization matrix

`scripts/verify-internal-admin-browser-access.mjs` passes **31/31** at fc8a391a, covering
unauthenticated redirect-before-data; participant, partner viewer, partner staff, partner
administrator, external personal-email (with forged `app_metadata`/`user_metadata`
`role: internal_admin`), corporate-domain-without-role, revoked and expired/disabled denial; active
global administrator success with server-derived identity; direct API 401/403; mutation, invitation,
publication, activation and commercial-gate guard ordering; identity and role display; Sign Out and
post-Sign-Out denial; safe returnTo including the nested deep link and the backslash/encoded forms;
no partner data in the denial payload; and content-role and partner-admin non-equivalence.
Service-role, public-view and tenant-isolation preservation come from the RLS suite.

Problem class re-confirmed: an authenticated external-email UUID with no active global UUID-bound
`internal_admin` role is denied by `requireInternalAdminSession()` before any protected read, and the
denial object contains no `partnerSlug`.

Caveat carried from section 7: the "Sign Out" row of this matrix passes only under synthetic
same-origin headers and does not hold in a real browser on `/internal*`.

## 11. npm-test failure attribution

**Classification: CANDIDATE_CAUSED.**

- Exact failing command: `node scripts/generate-rcap-staging-action.mjs --check`.
- Exact first assertion:
  `imageInputFingerprintBaseSha 57318c20 is not image-input-equivalent to HEAD; changed: package.json, scripts/lib/internal-auth-test-doubles.mjs, scripts/lib/internal-auth-test-loader.mjs, src/... (20 paths) - the fingerprint is stale and must be regenerated`.
  A second assertion follows: the worker publication evidence was built from `57318c20`, which is no
  longer image-input-equivalent, so "the published image is for other bytes and must be republished
  at the freeze".
- Files it reads: `data/rcap-staging-action.json` (the committed record and its
  `imageInputFingerprintBaseSha`), `data/rcap-authorization-queue.json`, the pinned
  `supabase/phase-*.sql` migrations, the worker publication evidence, and the Git trees for the
  declared image inputs - `package.json`, `package-lock.json`, `tsconfig.json`,
  `scripts/rcap-render-worker.mjs`, `scripts/lib/`, `src/`, `deploy/rcap-render-worker/Dockerfile`.
- Files a correction would modify: `data/rcap-staging-action.json` (regenerated) and the worker
  publication evidence / republished worker image - deployment-lane release artefacts, not
  internal-admin authorization code.
- Fails at `c1b65603`: yes on the same predicate (19 of the same image-input paths differ). It was
  never observed there because the run died earlier at the verifier-disposition gate, which fc8a391a
  has now fixed.
- Fails at `dd935798`: **no**. I checked out the base in a throwaway worktree and ran the same
  command: exit 0, `staging action current - 7 migrations, 7 required environment value(s) still
  unpopulated`. `git diff --name-only 57318c20 dd935798 -- <image inputs>` is empty.
- Did fc8a391a change its script, generator, inputs or expected output? It did not change the
  script, generator or committed record - it changed the **inputs**: 17 files under `src/`,
  `package.json`, and two files under `scripts/lib/`.

This is therefore not `PRE_EXISTING_AND_UNCHANGED` and not `MAIN_ADVANCE_STALENESS`: the recorded
fingerprint base still resolves and the base commit is exactly image-input-equivalent to it. The
gate is red because this branch edited declared image-input paths without regenerating the staging
action record or republishing the worker image.

The correction does not belong to the internal-admin security lane - it is a deployment/release
action requiring the freeze owner - but it is candidate-triggered and required CI is red, so the
branch is not mergeable as it stands. No deployment evidence or fingerprint was modified by this
review.

Full-suite result at fc8a391a: `npm test` runs to that gate and stops there. Everything before it
passes, including the previously blocking verifier-disposition gate (`342 / 342`), all six newly
wired security suites (`Internal admin authorization hardening: 31/31`, `Auth redirect security
passed`, `Sign Out same-origin security passed`, `Internal admin RLS hardening ... passed`,
`Internal admin audit/remediation tool guardrails passed`, `Internal admin remediation safety
passed: 8 lockout cases and 8 receipt controls`, `PASS verify-command-center-summary`), and the
Phase 52 suites the first review flagged (`test-rcap-phase52-mutations passed: 12/12 mutations
red`). `generate-rcap-staging-action.mjs --check` is the sole failure in the whole run, and the tree
was left clean.

## 12. Scope and secrets

All 23 protected trees recorded in `docs/security/rcap-internal-admin-protected-scope-baseline.json`
were compared `dd935798 -> fc8a391a`. Every one is byte-identical except `supabase/migrations`,
which differs solely by the single added hardening migration. That covers the Expungement.ai
state/remedy flow and flow-audit paths, Clinic Mode, PDF implementation/evidence/review, payment and
entitlement, packet credits, participant Briefcase, worker implementation, deployment, and unrelated
onboarding business logic.

Secret scan over the whole `dd935798..fc8a391a` diff found no password, token, cookie, JWT,
service-role key, production database export or production user record. No generated remediation
receipt is tracked and `artifacts/security` is untracked. The two real Roger addresses appear in
`docs/security/rcap-internal-admin-production-remediation.md` (the guarded runbook, permitted) and in
three files that are byte-identical to the base and therefore pre-existing and outside this branch:
`docs/expungement-ai/RELEASE_HARDENING_REPORT.md` and two report-branding HTML templates.

Static checks: `npx tsc --noEmit` passes; `npx eslint` reports 0 errors and 102 pre-existing
warnings.

## 13. Environment boundary

No credentialed non-production access was present. Production was not used as a substitute.

- **CODE_AND_STATIC_SECURITY_REVIEW** - performed; see the verdict below.
- **STAGING_DATABASE_ACCEPTANCE** - not performed. `RCAP_TEST_DATABASE_URL` is absent; applying the
  migration to a credentialed non-production database, running the post-apply catalog checks in
  `rcap-internal-admin-rls-migration-blocker.md`, and the credentialed tenant-isolation identity
  matrix (`verify-onboarding-tenant-isolation.mjs`, `verify-legacy-internal-admin-gates.mjs`) all
  remain required.
- **STAGING_BROWSER_ACCEPTANCE** - not performed and now materially more important: section 7's
  defect is exactly the class of failure that only a real browser reproduces. Desktop and mobile
  acceptance of identity display, role display, **Sign Out**, switch-account, post-Sign-Out denial
  and Back-navigation behaviour with real staging identities remain required after the correction.

## Findings

### Finding A - internal Sign Out is inert in a real browser (BLOCKER, regression)

See section 7. Introduced by `8f4c9982`. `Referrer-Policy: no-referrer` on `/internal*` forces
`Origin: null` on HTML form POSTs (Chromium-verified), and the new same-origin check rejects that,
so all five internal Sign Out / switch-account controls return 403. Prior finding 5 is not closed.

### Finding B - the branch leaves the staging-action fingerprint gate red (BLOCKER, candidate-caused)

See section 11. `generate-rcap-staging-action.mjs --check` fails at fc8a391a and passes at
`dd935798`. Resolution is a deployment-lane regeneration plus worker-image republish at the freeze;
it does not affect the security design, but required CI is red.

### Finding C - encoded-percent deep links now fall back (informational)

See section 4. `safeAppRedirectPath()` rejects an otherwise-legitimate path whose query contains a
literal `%25` or an encoded backslash. Fail-closed and safe; worth a note if such links exist.

### Finding D - `assertPostPlanRecoverySet` remains vacuous in grant mode (informational)

The corporate UUID is unconditionally added to the planned set in grant mode, so neither branch of
the assertion can fire there. Harmless - a grant cannot reduce the administrator count - and the
revoke path, where it matters, is now non-vacuous.

### Finding E - non-internal content roles lose CMS access (informational, carried forward)

Unchanged from the prior review and documented as intended in the blast-radius record. Confirm
during staging acceptance that no live content operator depends on an `editor`, `legal_reviewer`,
`social_manager`, `contributor` or `partner_contributor` row.

## Verdict

**CORRECTION_REQUIRED.**

Five of the six prior findings are properly closed, and closed with real controls rather than
assertions: the disposition register is complete, regenerates byte-identically and now runs both
security verifiers in the default chain with working mutation controls; `safeAppRedirectPath()`
withstands a 33-value adversarial superset while preserving nested internal deep links; the
remediation receipt has no default path, refuses tracked, unignored, symlinked, root and existing
destinations, and carries no email or credential; the Command Center inventory is complete, accurate
and drift-tested; and lockout protection is now computed from authoritative role state both before
the plan and after the apply. The previously approved UUID-bound architecture and the RLS migration
are byte-identical and re-verified independently.

Prior finding 5 is not closed. The same-origin boundary added to `POST /sign-out` is correct in
itself but incompatible with the `Referrer-Policy: no-referrer` the proxy already sets on
`/internal*`, and I confirmed in Chromium that this makes every internal Sign Out and switch-account
control return 403. That is a regression against c1b65603 and it defeats the denied-account
remediation path this hardening exists to provide. Separately, required CI is red on a
candidate-caused staging-action fingerprint gate.

Credentialed staging database and browser acceptance remain mandatory after correction. The
candidate is not approved to merge or deploy, and Clinic Mode remains blocked.
