# RCAP Partner Onboarding — Commercial Readiness Audit

Branch: `fix/rcap-onboarding-commercial-readiness`
Base: `origin/main` @ `2dced50e916f2aebf777a9a62026267551208207`
Worktree: `/home/user/legalease-partner-dashboard-clean`
Phase: 1 (portal-owned surfaces only; shared-file ownership gate active)

> **2026-08-13 acceptance addendum:** the Codespace now provides a complete local
> Supabase CLI stack and Mailpit. The authenticated acceptance lane described in
> `HOSTED_ACCEPTANCE.md` supersedes the earlier D-3 environment blocker recorded below.
> A-1 through A-16 and A-18 through A-20 pass. A-17 fails on the prohibited shared
> public partner route; the exact S-1 patch specification is in that acceptance report.

This audit records **confirmed** findings only. Areas inspected and found clean are
listed in §3 so a later pass does not re-litigate them. Speculative product ideas are
deliberately excluded.

## 1. Scope of this pass

Inspected:

- `src/app/partner/onboarding/**` (home, section editor, review, artifacts, resources)
- `src/app/partner/dashboard/page.tsx` (program setup card wiring)
- `src/app/partner/onboarding/OnboardingDashboardCard.tsx`
- `src/app/api/partners/onboarding/**` (asset download tenant scoping)
- `src/lib/partners/onboarding/**` (service shape, assets, types)
- `supabase/phase-43-rcap-partner-onboarding-phase1.sql` (read-only: status domains)

Not covered by this pass, and not claimed as verified: hosted staging acceptance
(§12 of the governing spec), live Auth/Storage/RLS behavior, browser journeys against
a hosted environment, and every item gated behind the shared-file freeze (§4 below).

## 2. Confirmed findings

### F-1 — Partner-facing status vocabulary has no single source of truth, and one copy diverges

**Severity:** Moderate
**Surface / route:** `/partner/onboarding`, `/partner/onboarding/review`,
`/partner/onboarding/[sectionKey]`, `/partner/dashboard`
**Role:** partner_admin, partner_staff

**Evidence.** The same curated label maps are duplicated across four surfaces:

| Vocabulary | Copies |
| --- | --- |
| Section status | `src/app/partner/onboarding/page.tsx:197-208`, `src/app/partner/onboarding/[sectionKey]/OnboardingSectionEditor.tsx:918-929` (identical) — and `src/app/partner/onboarding/review/page.tsx:167-172` (divergent) |
| Workspace status | `src/app/partner/onboarding/page.tsx:182-195`, `src/app/partner/dashboard/page.tsx:260-273` (identical); partial 5-key copy at `src/app/partner/onboarding/review/page.tsx:174-183` |
| Next-action owner | `src/app/partner/onboarding/page.tsx:210-214`, `src/app/partner/dashboard/page.tsx:275-279` (identical) |

The review page's `statusLabel()` is not a curated map at all — it is a mechanical
underscore-to-Title-Case transform:

```ts
function statusLabel(status: string) {
  return status.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
```

**Expected.** One partner-facing status vocabulary, used everywhere, in the sentence
case the rest of the portal already uses.

**Actual.** The same underlying section status renders as `Not started` on the
onboarding home and `Not Started` on the review page; `Needs changes` vs `Needs Changes`;
`Not applicable` vs `Not Applicable`. Any status value added later renders on the review
page as a mechanically prettified enum with no curation at all.

**Smallest safe correction.** Extract one partner-facing label module under the
portal-owned path `src/lib/partners/onboarding/` and have all four surfaces read from it.
Do not add a second vocabulary.

### F-2 — Agreement status is mechanically derived, and the partner-safe explanation is discarded

**Severity:** Moderate
**Surface / route:** `/partner/onboarding` (Agreements and procurement panel)
**Role:** partner_admin, partner_staff

**Evidence.** `src/app/partner/onboarding/page.tsx:155-163` maps each agreement to
`{ label, statusLabel, downloadHref }` and drops the rest of the view model.
`statusLabel` comes from `enumLabel()` (`:261-266`), another mechanical
underscore-to-Title-Case transform.

The status domain is fixed by
`supabase/phase-43-rcap-partner-onboarding-phase1.sql:861-871`:
`not_required`, `not_started`, `requested`, `under_review`, `finalized`, `executed`,
`approved`, `waived`.

`OnboardingAgreementView` (`src/lib/partners/onboarding/service.ts:75-83`) also carries
`partnerSafeDetail` — a field the schema explicitly reserves for partner-facing
explanation (`:872-873`, bounded at 5000 chars) — plus `required` and `effectiveDate`.
None of the three reaches the UI.

**Expected.** Curated, ownership-explicit labels, and display of the partner-safe detail
the data layer already produces.

**Actual.** The partner sees a bare Title-Cased word. `Requested` and `Under Review` do
not say who owes the next step, which is exactly the question §5 of the governing spec
requires every screen to answer. The explanatory text written for this purpose is
fetched from the database and then thrown away.

**Smallest safe correction.** Curated label map for the eight known statuses; pass
`partnerSafeDetail` through and render it beneath the status.

### F-3 — Paused and closed programs are told their setup is complete

**Severity:** Moderate
**Surface / route:** `/partner/dashboard` (program setup card)
**Role:** partner_admin, partner_staff

**Evidence.** `src/app/partner/onboarding/OnboardingDashboardCard.tsx:31-36` collapses
four distinct workspace statuses into one presentation state:

```ts
const compactCompleteState = ["ready_to_launch", "live", "paused", "closed"]
  .includes(status.trim().toLowerCase());
```

When true, the card heading becomes `Your setup history` and the body (`:88-92`) reads:

> Your program setup is complete. The workspace remains available as a record of
> approved configuration.

**Expected.** §6.4 of the governing spec requires the card to adapt correctly for
`paused` and `closed` as distinct states.

**Actual.** A **closed** program tells the partner its setup is complete and the
configuration is approved. A **paused** program says the same and surfaces no reason,
while the same file's `toneForStatus()` (`:117`) simultaneously classifies `paused` as a
warning state — the badge and the body copy contradict each other.

**Smallest safe correction.** Keep the compact (non-launch-work) layout for all four
statuses, but give `paused` and `closed` their own honest body copy.

### F-4 — "Need help?" is a dead end; no configured LegalEase support route exists

**Severity:** Moderate
**Surface / route:** `/partner/onboarding` (Need help? panel)
**Role:** partner_admin, partner_staff

**Evidence.** `src/app/partner/onboarding/Phase1OnboardingHome.tsx:290-292`:

> Contact your LegalEase program lead through the support channel already provided to
> your organization.

There is no destination — no address, link, or route. `PartnerOnboardingPortal`
(`src/lib/partners/onboarding/service.ts:94-134`) exposes no LegalEase support contact.
The `*_support_*` fields that do exist
(`src/lib/partners/onboarding/validation.ts:451-453`) are the **participant** support
contacts the partner configures for their own participants — not the partner's route
to LegalEase.

**Expected.** §5 requires every meaningful screen to answer "Where do I get program,
technical, or legal-referral help?"; §6.5 requires a configured LegalEase support
contact on the onboarding home.

**Actual.** The partner is told a channel exists and is not told what it is.

**Smallest safe correction, and why it is not taken in Phase 1.** A per-partner program
lead is the correct end state, and that requires a new authoritative field — a schema and
migration change, which the shared-file gate freezes. See §4. A same-day mitigation using
the organization-wide address already configured across the app (`info@legalease.law`,
used at `src/app/legalease/contact/page.tsx:69`, `src/app/expungement-ai/support/page.tsx:49`
and three other surfaces) is possible without touching a frozen file, but it is a
mitigation, not the fix, and it should not be mistaken for the configured per-partner
route the spec asks for.

## 3. Inspected and clean — do not re-litigate

- **Onboarding asset download is correctly tenant-scoped.**
  `src/app/api/partners/onboarding/assets/[assetId]/route.ts` derives the partner from
  the session (never from a URL parameter), and
  `getPartnerOnboardingAssetDownload` (`src/lib/partners/onboarding/assets.ts:380-413`)
  double-gates: the asset must appear in the caller's own portal asset list **and** the
  admin query filters `.eq("workspace_id", portal.workspace.id)` with `deleted_at is null`
  and a lifecycle allowlist. Cross-partner access fails closed with a
  `workspace_not_found` error that does not disclose existence.
- **Review submission is idempotent and cannot show false success.**
  `OnboardingReviewClient.tsx:116-191` guards re-entry (`submittingRef`), reuses one
  `requestId` across retries, handles HTTP 409 `revision_conflict` as a distinct
  actionable state, and on a network throw states explicitly that no success has been
  shown.
- **Section editor save semantics.** Revision-conflict handling, `aria-live` save
  status, `role="status"`/`role="alert"` regions, unsaved-change tracking against a
  serialized baseline, and a `requestId` keyed to the payload snapshot
  (`requestIdForSave`, `:2875-2889`) are all present.
- **Review page prefill callout does not leak section keys.** `review/page.tsx:89-91`
  maps `pendingSections` keys to section titles before display.
- **Partner dashboard two-column split is responsive.** The inline
  `gridTemplateColumns` at `dashboard/page.tsx:133` and `:429` is overridden by the
  `!important` rule at `:97` under `max-width: 900px`, which is the only way a
  stylesheet can beat an inline style.

## 4. Shared-file and hosted-staging dependencies (Phase 2 handoff)

Recorded per the concurrent-repository safety rules. None of these were changed in
Phase 1.

| # | File / system | Smallest required change | Why the portal is incomplete without it |
| --- | --- | --- | --- |
| D-1 | `supabase/` migration + `partner_onboarding` read model | Add an authoritative per-partner LegalEase support contact (program lead name + route), exposed through the partner-safe view | F-4: the onboarding home cannot show a configured support route because no such field exists. Spec §6.5 requires one and §7 forbids hardcoding a new address |
| D-2 | CI workflow files and/or `package.json` | Add the 11 unwired onboarding verifiers listed below to the normal `npm test` gate, and fix the three `verify-launch-readiness.mjs` failures | Spec §11.2 and §15 both treat "a verifier that exists but does not block the normal gate" as a blocking condition. Both candidate files are frozen |
| D-3 | Isolated acceptance services | **Closed by the Codespace lane.** Local Supabase CLI supplied Auth, Database, and Storage; Mailpit captured the invitation; the production build served the authenticated browser journeys | See the superseding run record in `HOSTED_ACCEPTANCE.md` |
| D-4 | `/dashboard/partners` prerender path and/or shared Supabase client config | Make `/dashboard/partners` prerender without Supabase credentials, as the repo already promises | `npm run build` fails on `origin/main` today (see below). The build is a required gate in spec §11.3, so it currently blocks the release regardless of portal work |

### D-4 detail — the production build is red on `main`

```
Error occurred prerendering page "/dashboard/partners".
Error: Supabase public URL and anon key are required for authentication.
Export encountered an error on /dashboard/partners/page, exiting the build.
```

TypeScript compiles and all 173 pages collect; the failure is at static export only.
This reproduces exactly on a clean checkout of `2dced50e` with this branch stashed, so it
is pre-existing and was not introduced here.

It contradicts the repository's own documented contract in two places:

- `README.md:40` — "local seeded partner data by default so local development and
  `npm run build` do not require Supabase credentials"
- `docs/supabase-partner-setup-checklist.md:55` — "Build should pass without Supabase env
  vars: unset Supabase env vars and run `npm run build`."

Not fixed here: the remedy is either in the `/dashboard/partners` prerender path or in the
shared Supabase client configuration, and the latter is frozen by the shared-file gate.
Recorded for the Phase 2 handoff rather than worked around, since forcing a build-time
credential would weaken the no-credentials contract the checklist depends on.

### D-2 detail — onboarding verifiers that gate nothing

`npm test` invokes 57 script files directly (it calls no `npm run` sub-scripts), and the
two workflows in `.github/workflows/` add a fixed list on top. Cross-referencing every
onboarding-related verifier against both gives **11 of 23 wired to nothing**:

| Verifier | In `npm test` | In CI |
| --- | --- | --- |
| `verify-launch-readiness.mjs` | no | no |
| `verify-onboarding-persistence.mjs` | no | no |
| `verify-rcap-onboarding-prefill-domain.mjs` | no | no |
| `verify-rcap-onboarding-prefill-security.mjs` | no | no |
| `verify-rcap-onboarding-prefill-service.mjs` | no | no |
| `verify-rcap-onboarding-prefill-ui.mjs` | no | no |
| `verify-rcap-partner-onboarding-domain.mjs` | no | no |
| `verify-rcap-partner-onboarding-phase1-database.mjs` | no | no |
| `verify-rcap-partner-onboarding-security.mjs` | no | no |
| `verify-rcap-partner-onboarding-service.mjs` | no | no |
| `verify-rcap-partner-onboarding-ui.mjs` | no | no |

The other 12 (`verify-first-admin-provisioning`, the four
`verify-rcap-onboarding-artifact-*`, the three `verify-rcap-onboarding-launch-*`,
`verify-rcap-onboarding-document-generators`, `-page-configuration`,
`-registry-extension`, and `verify-rcap-partner-onboarding`) are wired to both gates and
pass.

Every unwired verifier above passes today when run by hand — **except
`verify-launch-readiness.mjs`, which fails on `origin/main` right now**:

```
- .env.example does not include the LegalEase production URL.
- Internal route protection is not configured.
- intake placeholder is missing the required disclaimer.
```

That failure is pre-existing and reproduces on a clean checkout of
`2dced50e` with this branch's changes stashed. It was not introduced here and is not
fixed here: all three findings point at `.env.example` and route-protection
configuration, which the shared-file gate freezes. Wiring this verifier into CI before
fixing those three items would turn the gate red on every PR, so D-2 must land as one
change: fix the three, then wire all eleven.

The new `verify-rcap-onboarding-partner-labels.mjs` added by this branch is in the same
position — it passes, and it gates nothing until D-2 lands. It is listed for wiring with
the rest.

## 4a. Second pass — what was closed

The shared-file freeze was lifted for this branch, so the dependencies recorded above were
worked rather than deferred. All four are closed except the parts that need a hosted
environment.

| Was | Now |
| --- | --- |
| D-1 support destination | **Closed.** `src/lib/partners/onboarding/support-contact.ts` resolves one address from `RCAP_PARTNER_SUPPORT_EMAIL`, defaulting to `partners@legalease.com`, and returns the mailto, label and accessible name. A malformed override falls back rather than rendering a broken link. Wired into the onboarding home, both account-access dead ends, and the submission-failure card. **Residual: the mailbox must be confirmed as forwarding and monitored before launch.** |
| D-2 gate coverage | **Closed.** `scripts/verify-onboarding-all.mjs` owns every onboarding verifier and refuses to run when one exists that no group claims. `npm test` invokes it once; local coverage went from 11 to 23. A new `RCAP Partner Onboarding` workflow runs lint, typecheck, the local group, launch readiness, and the credential-free build on every PR. |
| D-3 acceptance services | **Closed.** The complete local Supabase CLI + Mailpit lane ran in this Codespace. See §4b and `HOSTED_ACCEPTANCE.md`. |
| D-4 credential-free build | **Closed.** Root cause was eight authenticated pages missing `export const dynamic`; sixteen siblings behind the same gate already had it. `npm run build` now completes with the Supabase variables explicitly empty, and all sixteen protected routes report as dynamic with no static HTML emitted. |

Also fixed in this pass:

- **`verify-launch-readiness.mjs` passes.** Three unrelated causes: `.env.example` pointed
  `NEXT_PUBLIC_LEGALEASE_URL` at the email domain rather than the web origin defined in
  `app-url.ts`; the intake disclaimer omitted the eligibility clause; and the internal
  route-protection check required a `/internal/:path*` matcher entry that no longer exists
  because the gate moved into the middleware body. The route was protected the whole time —
  the assertion now checks the gate that exists, including the default-deny return it never
  looked at.
- **`verify-rcap-partner-onboarding-ui.mjs` runs at all.** It rendered four fixtures missing
  required props and threw before its first assertion. Pre-existing, reproduces at the
  branch base. Fixed by supplying the props, not by making them optional.
- **Migrations verified against a live database.** All 42 apply cleanly in the correct
  order. Ordering matters: phase number then letter suffix, so 19 precedes 19i and 35
  precedes 35b/c/d.
- **RLS tenant isolation proven, not asserted.** As a real authenticated role: a partner
  sees only their own workspace, an identity-less session sees nothing, cross-tenant read,
  update, insert and delete all fail, a disabled membership loses access, and every
  `partner_onboarding*` table has RLS enabled.

### Runtime behavior observed against a running production build

With no Supabase credentials present:

| Route | Result |
| --- | --- |
| `/internal/partners/data` | `401` — the proxy gate fails closed |
| `/partner/onboarding`, `/partner/dashboard`, `/dashboard/partners` | `500`, Next's generic error page |

The 500 responses disclose nothing: the configuration error appears in the server log only,
and the browser body contains no mention of Supabase, no key, and no stack. So the routes
fail closed and leak nothing, but the failure is a generic 500 rather than a legible
message. That residual is recorded rather than claimed as polished.

## 4b. Acceptance services and remaining shared release failure

The environment blocker is closed. Local GoTrue, PostgreSQL, Storage, and Mailpit ran in
the isolated Codespace, and the authenticated portal was exercised through a credentialed
production build. Invitation acceptance, single-use behavior, Storage privacy, tenant RLS,
browser rendering, keyboard operation, responsive viewports, and accessibility smoke checks
all ran.

The remaining release failure is S-1: `CoBrandedPartnerPage` renders the inactive,
unpublished Rythm Labs record at `/p/rythm-labs-test` with HTTP 200 and no `noindex`
directive. That participant-facing route is prohibited in this lane. The exact minimal
patch and acceptance test are recorded in `HOSTED_ACCEPTANCE.md` for Session A or the later
shared integration assignment.

## 5. Status

Phase 1 fixes for F-1 through F-4 are implemented on this branch, and the isolated
acceptance-service gate is closed.

**RCAP onboarding is not ready for public release.** The single exact release failure is
S-1, the missing publication/activation gate on the shared public partner route (§4b).
D-1 through D-4 are closed. The portal-owned functional, visual, responsive, accessibility,
and security acceptance cases otherwise pass.

### Gates run on this branch

| Gate | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass, 0 errors (21 pre-existing warnings, none in changed files) |
| `npm test` | pass, no failing assertions |
| `partners:verify-onboarding-all` (local group, 23 verifiers) | pass |
| `partners:verify-launch-readiness` | pass — **was failing on `main`** |
| `verify-rcap-onboarding-partner-labels.mjs` | pass, 11/11 |
| `verify-rcap-onboarding-support-contact.mjs` | pass, 11/11 |
| `verify-rcap-partner-onboarding-ui.mjs` | pass — **was throwing on `main`** |
| Migrations applied in order to local PostgreSQL | 42/42 |
| `verify-onboarding-tenant-isolation.mjs` (local RLS) | pass, 8/8 |
| `npm run build` with Supabase vars empty | pass — **was failing on `main`** |
| Credentialed local production build (`typecheck`, Next compile, Next generate) | pass against local Supabase |
| Authenticated browser acceptance harness | pass for A-4 through A-16 and A-18 through A-19; A-17 shared-route failure recorded |
| Runtime probe of protected routes | fails closed, no disclosure (§4a) |
| `git diff --check` | clean |

Every verifier added or repaired in this work was mutation-tested: a deliberate break of
the condition it protects makes it fail. Specifically — restoring the old closed-program
copy; removing the owner from an agreement label; removing the proxy's deny path; removing
the `/internal` prefix match; removing the aggregate from `npm test`; dropping a verifier
from the registry; disabling RLS on an onboarding table; and broadening a tenant policy to
`using (true)`.

External SMTP delivery and monitored handling of `partners@legalease.com` remain post-merge
canary checks. `FINAL_MAIN_SYNC_PENDING_SESSION_A: yes`.
