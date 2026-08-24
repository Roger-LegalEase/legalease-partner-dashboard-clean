# RCAP internal admin final security and staging acceptance

Verdict: `STAGING_ENVIRONMENT_BLOCKED`

This is the independent final review of candidate `fc838be7871dc977e0a3e811b801d6c8ee7398e5`. The implementation review, exact nonproduction RLS migration, real acceptance-database authorization matrix, worker evidence, and repository checks are green. The gate cannot be approved because no Preview deployment exists for the exact candidate and the available reviewer environment has no authorized Vercel credential. The repository-owned hosted workflows are frozen to application SHA `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926` and reject the candidate SHA, so the required real-browser and deployed direct-request acceptance could not be run without changing a protected workflow.

## Frozen input

- Candidate: `fc838be7871dc977e0a3e811b801d6c8ee7398e5`
- Security implementation: `646d8969576e33b9ed72d3bca64b33b7e352c452`
- Original/current main: `dd93579871962260b12918e54c44cf9bf1e81529`
- Candidate remote: exact head of `origin/codex/rcap-internal-admin-release-evidence`
- Review branch: `codex/final-review-rcap-internal-admin-fc838be`
- Candidate contains security implementation: yes
- Candidate contains current main: yes
- Tracked input was clean and no merge or rebase was active when the branch was created.

The 36-path security implementation manifest has SHA-256 `84e3350dc657987cfb995e35fb386a0c3b0d327b3f3318f100b749349e4592af` at both the security SHA and candidate. Key Git objects are unchanged:

| Frozen item | Git object at security SHA and candidate |
| --- | --- |
| RLS migration | `768a44905c2b3d2a737dac4d9e22e375abc4e1e3` |
| Sign Out tree | `06331ff6c5db87ea1e80730cffd850cbd50ae550` |
| Redirect helper | `75b7adc0aa862a9502be2b0e1477b72dc52f1691` |
| Remediation tool | `655071197ea61a27614abed8ea654f49e055dd0b` |

The five-file worker/release evidence manifest at the candidate has SHA-256 `e54e8f50c41053aab32af016340566ae00e10520c8203754c059c2ca477f38e3`. Candidate evidence commits changed no security implementation byte.

## Acceptance database and migration

- Project: `legalease-rcap-acceptance`
- Project ref: `hyflxnlhpmiqxvvcoiia`
- Region/state: `us-west-2`, `ACTIVE_HEALTHY`
- Nonproduction marker: exact project ref, stamped `2026-08-21 00:17:19.473711+00`
- Prior recorded migration level: acceptance ledger phases 49 through 55
- Migration: `supabase/migrations/20260823171000_internal_admin_authority_hardening.sql`
- SHA-256: `3e6db05c24e7ac9248eea2a1d6ee077463579c127fc150321eecfff1cd08bf50`
- Applied: once, to the named acceptance project only, at `2026-08-24 13:04:40.164703+00`
- Result: success

Before application, the database had no Supabase schema-migration ledger and its live catalog still carried the prior `content_admin_users` resolver and prior role-only telemetry/support predicates, proving this hardening had not already been applied under another migration identity. The reviewed SQL contains no data-row rewrite, and a reviewed rollback exists in `docs/security/rcap-internal-admin-rls-migration-blocker.md`. No unrelated migration was applied and rollback was not needed.

After application, `content_current_role()` is owned by `postgres`, is stable and security-definer, has an empty search path, and returns the privileged role only through `public.is_internal_admin()`. `consumer wilma telemetry internal safety select` is an authenticated SELECT policy with `USING (is_internal_admin())`. `legalease_os_support_items_internal_admin_all` is an authenticated ALL policy with both `USING (is_internal_admin())` and `WITH CHECK (is_internal_admin())`.

Pre/post counts and row fingerprints for `partner_users`, `content_admin_users`, `partner_records`, `content_posts`, `consumer_wilma_telemetry`, and `legalease_os_support_items` matched after synthetic fixture cleanup. Historical rows were unchanged.

## Real database authorization matrix

The final synthetic matrix executed 67 checks against the real acceptance database and passed all 67. Fixtures were removed without cleanup errors.

| Identity | Canonical internal authority | Protected read | Protected mutation |
| --- | --- | --- | --- |
| Unauthenticated | denied | denied | denied |
| Ordinary participant | denied | denied | denied |
| Content viewer substitute | denied | denied | denied |
| Partner staff | denied | denied | denied |
| Partner administrator | denied | denied | denied |
| External personal email, no role | denied | denied | denied |
| `@legalease.com`, no role, forged metadata | denied | denied | denied |
| Active global UUID-bound internal administrator | allowed | allowed | allowed |
| Inactive/disabled internal administrator | denied | denied | denied |
| Revoked/disabled internal administrator | denied | denied | denied |
| Content `primary_admin` role only | denied | denied | denied |
| Forged application/user metadata role | denied | denied | denied |
| Partner-scoped internal-looking claim | denied; tenant only | denied | denied |
| Internal role carrying partner scope | database constraint refused row | denied | denied |

The schema does not support a `partner_viewer` membership (`partner_users_role_check` supports partner admin, partner staff, and internal admin); a content viewer was exercised as the supported non-internal viewer class.

Service-role insert/read remained functional. Anonymous access to the intentional public content projection remained functional. Partner staff and partner admin saw only their own synthetic tenant, cross-tenant reads and mutations changed no row, and a forged partner-scoped internal claim remained tenant-scoped. Participants and content-role-only users could not create an internal membership.

## Application review and browser status

The shared internal layout, page adapters, API/route adapters, UUID-bound session resolver, Sign Out origin checks, redirect helper, content capability consolidation, and remediation tool were independently reviewed. No implementation correction was identified. The focused internal-admin suite passed 31/31, including isolated RLS, guard-before-data, Sign Out origin, redirect mutation, Chromium HTML-control, remediation, receipt, and lockout cases. This local Chromium evidence is static/synthetic evidence and is not treated as exact-Preview acceptance.

Exact candidate deployment discovery returned zero GitHub deployments and zero commit deployment statuses. No exact candidate Preview URL or deployment ID exists. No Vercel credential is available in the reviewer environment. The GitHub-hosted and Vercel-hosted acceptance workflows both set `AUTHORIZED_APPLICATION_SHA` to `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926` and fail any different input. Modifying those protected workflows was outside this review.

Consequently, the following mandatory tests are `NOT RUN — STAGING ENVIRONMENT BLOCKED` for the exact candidate:

- desktop and mobile active-admin, external-email, corporate-domain, partner-admin, and inactive/revoked account browser journeys;
- exact-Preview identity/role display, page rendering, switch-account behavior, cookie clearing, Back behavior, and post-Sign-Out denial;
- exact-Preview same-origin, cross-origin, unsafe Origin/Referer, `Origin: null`, GET, and consumer Sign Out behavior;
- exact-Preview malicious `returnTo` and legitimate deep-link preservation;
- deployed direct page/API/mutation requests for provisioning, invitation lifecycle, workspace creation, commercial gate, publication, activation, role/user mutation, and protected assets;
- deployed proof that authorization precedes body parsing and protected partner data loading.

No Preview from another SHA was substituted.

## Remediation tooling

The audit tool ran read-only against synthetic acceptance identities with redacted output and exactly one synthetic active global match. The remediation tool ran only in grant-mode dry-run: it planned the corporate grant, changed neither membership, created no receipt, and deleted no Auth user.

The focused suite separately passed refusal and sequencing cases for a missing receipt path, tracked receipt destination, symlink escape, ambiguous users, same UUID, unverified corporate target, partner-scoped target, zero-admin result, grant-before-removal, corporate confirmation before personal revocation, no Auth deletion, and secret redaction. Production identities were not used and remediation was not applied.

## Worker and release evidence

- Publication run `32688658427`: success; source `646d8969576e33b9ed72d3bca64b33b7e352c452`; full-SHA tag; publish only; no deployment.
- Acceptance run `32723173565`: success; digest pull and tag agreement succeeded; OCI revision equals the security SHA; no production update.
- Image: `ghcr.io/roger-legalease/rcap-render-worker:646d8969576e33b9ed72d3bca64b33b7e352c452`
- Digest: `sha256:c1a18b3a9f36f5f7ce0b01268c7bb30242b69cca13cb14bde18281d984098402`
- Registry verification: full-SHA tag present, no `latest` tag.
- Production worker: not updated.

## Checks and scope

| Check | Result |
| --- | --- |
| Focused internal-admin security suite | pass, 31/31 |
| Real acceptance-database matrix | pass, 67/67 |
| Audit/remediation acceptance | pass |
| Verifier-disposition check | pass |
| Publication verifier | pass |
| Worker acceptance verifier | pass |
| Deployment-closure verifier | pass |
| Staging-action check | pass |
| Authorization-queue verifier | pass |
| Staging/readiness verifier | pass |
| Release/readiness verifier | pass |
| `npm test` | pass |
| TypeScript | pass |
| Lint | pass with 102 existing warnings, 0 errors |
| `git diff --check` | pass |

The protected state-remedy, flow-audit, PDF, Briefcase, payment/entitlement, onboarding business-logic, worker source/deployment, and Clinic Mode baselines did not change from `dd93579871962260b12918e54c44cf9bf1e81529`; the only migration addition is the reviewed hardening migration. A tracked-file scan covered 7,719 paths and found no secret/session artifact path. A content scan found no live Stripe secret, webhook secret, GitHub token, Supabase secret, JWT, or Vercel blob token pattern. Launch readiness also found no configured secret value in tracked files. No database dump, production-user export, cookie file, JWT, service-role key, or browser-session file is committed.

## Final disposition

`STAGING_ENVIRONMENT_BLOCKED`

The candidate is not ready to merge because the required real Chromium and deployed API/mutation acceptance cannot be performed against an exact-SHA Preview with the permissions and frozen workflows available. This is not an approval based on static tests, and no production account cutover, production deployment, Clinic Mode foundation, merge, or production change is authorized.
