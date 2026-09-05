# CLOUD04 — RCAP provisioning, first admin, onboarding, and prefill verification

## Run identity

- Assignment: `CLOUD04_RCAP_ONBOARDING_PREFILL`
- Verified checkout: `48f74d82016795307e565220e38ce369cf43da5e`
- Required ancestor: `4fb89c96e2886e6d9d80f9bb757278c20ecb6b13` (confirmed with `git merge-base --is-ancestor`)
- Branch observed: `work`
- Date: 2026-09-01 UTC
- Production touched: **no**
- Application files modified: **0**

## Verdict

**PASS for the credential-free current-head gates that could be reproduced in this
environment.** All 28 registered local onboarding verifiers passed. The independent
provisioning verifier passed 33 checks, and the public-publication verifier exercised five
publication/activation combinations and confirmed that only published plus active opens.

The old A-17 condition **does not reproduce at current head**. The public route now resolves
through an authoritative publication-and-activation eligibility boundary, calls `notFound()`
when that boundary is not satisfied, remains dynamically resolved, and is absent from sitemap
generation. The focused executable verifier passed all five state combinations.

This run does **not** claim a fresh full Auth/Storage/browser acceptance. The checkout provides
loopback lifecycle and browser harnesses, but this execution image has no `supabase`, `docker`,
`psql`, PostgreSQL `initdb`, or Chromium executable and supplies no loopback Supabase URL or
service-role credential. Both lifecycle harnesses refused to run before connecting, exactly as
their loopback-only guards require. No remote or Production fallback was attempted.

## Reproduced coverage

### Provisioning and first administrator

- Provisioning is a single transactional RPC, is idempotent, writes its idempotency record
  last, fails closed on slug ambiguity, and begins private/inactive/unlaunched.
- Provisioning creates no Auth user, membership, invitation, access code, allocation, billing
  side effect, publication, or activation.
- The first-admin boundary uses the live authenticated email, denies a wrong email without
  tenant disclosure, creates exactly one membership, and treats replay as a no-op.
- Expired and revoked invitations resolve to a recovery state. Invitation state is carried in
  an HttpOnly, path-scoped cookie. Password recovery is not membership authority.
- Result: **first admin exactly once — PASS at deterministic/domain/service boundary; database
  concurrency re-execution unavailable in this image.**

### Eight-section Implementation Center and prepared values

- The registry, section model, implementation-center presentation, guided experience, labels,
  support contact, artifact domain, and launch-readiness gates all passed.
- Prepared values are explicitly classified and normalized. Prohibited identity, authority,
  payment, sponsorship, ownership, publication, activation, and final-authorization fields are
  excluded by the allowlists.
- Import, review, apply, edit, reject, confirm, compare-and-swap conflict, idempotency,
  re-proposal lineage, and explicit override behavior passed the focused service verifier.
- Partner reads are tenant-bound and expose only applied values, not internal provenance.
- Result: **prefill boundary — PASS.** LegalEase may prepare allowed values; the partner keeps,
  edits, or rejects them; applied reviewed values are not silently overwritten.

### Save/resume, private artifacts, review, and change cycle

- The registered local suite passed persistence contracts, artifact domain/security/database
  SQL contracts, document generation, page configuration, review presentation, guided section
  behavior, and launch readiness.
- Field-specific change requests, partner response/resubmission, internal resolution, and
  approval remain separate from publication, activation, and go-live.
- Private artifact contracts preserve tenant binding and private Storage semantics; no public
  URL is minted by the onboarding artifact flow.
- Result: **change cycle — PASS at executable local contract boundary; fresh browser/Storage
  interaction unavailable in this image.**

### Role and final-authorization boundaries

- Partner staff are view-only; mutation actions remain administrator-only.
- Prepared-value confirmation, section approval, artifact approval, and workspace approval do
  not authorize publication, participant activation, payment, entitlement, or commercial packet
  delivery.
- Result: **staff view only — PASS. Approval without go-live — PASS.**

### Unpublished public route / A-17 retest

Reproduction:

```text
node scripts/test-public-partner-publication-security.mjs
```

- Expected: unpublished or inactive partner combinations fail closed; only separately published
  and active partners resolve; the private internal preview is unaffected; sitemap generation
  does not enumerate unpublished partner pages.
- Actual: verifier passed. Five publication/activation combinations failed closed except the
  published-plus-active combination; the public route uses `notFound()`, remains dynamic, and is
  absent from sitemap generation.
- Affected path/symbol: `src/app/p/[partnerSlug]/page.tsx` / public co-branded route,
  `src/lib/partners/public-partner-page.ts` / public eligibility resolution, and
  `src/lib/partners/partner-public-eligibility.ts` / authorization predicate.
- Security/user impact: the previously documented guessed-URL disclosure and indexing risk is
  closed at current head.
- Smallest bounded patch: **none; no current-head defect reproduced.**
- Focused regression test: `node scripts/test-public-partner-publication-security.mjs`.
- Result: **unpublished route — PASS (404/fail-closed). Old A-17 — CLOSED at current head.**

## Commands and outcomes

| Command | Outcome |
| --- | --- |
| `git merge-base --is-ancestor 4fb89c96e2886e6d9d80f9bb757278c20ecb6b13 HEAD` | PASS (exit 0) |
| `node scripts/verify-onboarding-all.mjs` | PASS: 28/28 registered local verifiers |
| `node scripts/verify-rcap-partner-provisioning.mjs` | PASS: 33/33 checks |
| `node scripts/test-public-partner-publication-security.mjs` | PASS: five combinations; only published + active opens |
| `node scripts/verify-first-admin-provisioning.mjs` | PASS |
| `node scripts/verify-rcap-onboarding-prefill-domain.mjs` | PASS |
| `node scripts/verify-rcap-onboarding-prefill-service.mjs` | PASS |
| `node scripts/verify-rcap-onboarding-prefill-security.mjs` | PASS |
| `node scripts/verify-rcap-onboarding-prefill-ui.mjs` | PASS |
| `node scripts/test-rcap-partner-provisioning-lifecycle.mjs` | NOT RUN: fail-fast requires loopback Supabase URL and service-role key |
| `node scripts/test-rcap-partner-provisioning-journey.mjs` | NOT RUN: fail-fast requires a loopback Supabase stack |

## Defects

No current-head product failure was reproduced by the executable gates available in this
environment. Consequently there is no bounded application patch to prescribe.

### Environment limitation (not a product defect)

- Exact reproduction: run either loopback lifecycle command listed above in this image.
- Expected: a loopback Supabase service is configured and the database/Auth/Storage lifecycle
  executes.
- Actual: each harness exits before connection because the required loopback environment is not
  present. Tool discovery also finds no local Supabase/PostgreSQL/browser runtime.
- Affected harnesses: `scripts/test-rcap-partner-provisioning-lifecycle.mjs`,
  `scripts/test-rcap-partner-provisioning-journey.mjs`, and the browser-group
  `scripts/capture-rcap-prepared-onboarding-acceptance.mjs`.
- Security/user impact: no new database-concurrency, Auth-email-delivery, Storage, responsive, or
  end-to-end browser evidence can be claimed from this run; this does not establish a product
  failure.
- Smallest bounded remedy: rerun the existing harnesses in the documented isolated loopback
  acceptance image with local Supabase, Mailpit, and Chromium. Do not substitute Production.
- Focused regression test: run the two lifecycle commands, then the browser capture harness,
  against that isolated stack.

## Changed-path report

Only this verification report was added. No shared application module, migration, packet path,
claim, queue, Production setting, commercial authority, or Fable-owned path was modified.

## Return

```text
ASSIGNMENT: CLOUD04_RCAP_ONBOARDING_PREFILL
BASE SHA: 48f74d82016795307e565220e38ce369cf43da5e
COMMIT: recorded by the verification commit containing this report
CASES RUN: 28 registered onboarding gates; 33 provisioning checks; 5 public-state combinations; focused first-admin and prefill gates
PASS: all executable current-head gates
FAIL: 0 reproduced product failures; 2 loopback harnesses unavailable before execution
FIRST ADMIN EXACTLY ONCE: PASS at deterministic/service boundary; loopback concurrency rerun unavailable
PREFILL BOUNDARY: PASS
CHANGE CYCLE: PASS at local contract boundary; browser rerun unavailable
STAFF VIEW ONLY: PASS
UNPUBLISHED ROUTE: PASS — fails closed; old A-17 does not reproduce
DEFECTS: none reproduced; environment limitation recorded
APPLICATION FILES MODIFIED: 0
PRODUCTION TOUCHED: NO
```
