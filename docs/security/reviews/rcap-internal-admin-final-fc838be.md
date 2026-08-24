# RCAP internal admin final security and staging acceptance

Verdict: `APPROVED_FOR_MERGE`

This is the independent final review of candidate `fc838be7871dc977e0a3e811b801d6c8ee7398e5`. The implementation review, exact nonproduction RLS migration, real acceptance-database authorization matrix, worker evidence, and repository checks remain green and were not repeated. A single final Preview used secure per-deployment build and runtime overrides, became Ready with the frozen candidate and Large Functions enabled, contacted only acceptance Supabase project `hyflxnlhpmiqxvvcoiia`, and passed the remaining deployed identity, browser-control, redirect, API, mutation, and data-before-authorization checks. No repository implementation byte, Vercel project environment setting, or Production resource changed.

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

Initial exact candidate deployment discovery returned zero GitHub deployments and zero commit deployment statuses. The GitHub-hosted and Vercel-hosted acceptance workflows both set `AUTHORIZED_APPLICATION_SHA` to `f7ed0ad3a8f37a0c1446b62760b1a36fb163c926` and fail any different input. The later CLI follow-up authenticated successfully but stopped at the independent Preview-environment identity check described below.

Consequently, the following mandatory tests are `NOT RUN — PREVIEW DEPLOYMENT ERROR` for the exact candidate:

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

## Exact CLI Preview follow-up

On `2026-08-24`, the reviewer preserved review head `58545f4df60b4655d7b48e23fe39dca421110d0a`, created `/workspaces/rcap-admin-exact-preview` as a detached worktree at exactly `fc838be7871dc977e0a3e811b801d6c8ee7398e5`, and confirmed an empty tracked status. Its complete Git tree was `91ca2ba3b6e901980bf80b7e4c23aa6399de674c` before and after the CLI preflight.

Vercel CLI 59.5.0 authenticated as `roger947`. The only available scope was `roger947s-projects`; the existing project list contained `legalease-partner-dashboard-clean`, and `vercel link` linked exactly `roger947s-projects/legalease-partner-dashboard-clean`. It did not create a project or connect Git.

The exact required pull was then run for Preview and branch `codex/rcap-internal-admin-release-evidence`. The generated effective file contained the expected Supabase variable names, but `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ENABLE_SUPABASE_PARTNER_DATA` all materialized as empty quoted values. Vercel classified the Supabase values as Sensitive, and there was no readable non-secret project reference or acceptance-environment identity in the pulled project settings. The CLI therefore could not prove that the effective Preview environment identified `hyflxnlhpmiqxvvcoiia`. The same Vercel environment-variable inventory associated the Supabase entries with both Preview and Production, so no production-safe inference was possible.

The required predeployment identity gate failed before any `vercel deploy` command. No Preview or Production deployment was created, no URL or deployment ID was assigned, and a Vercel query for Preview deployments carrying candidate metadata `githubCommitSha=fc838be7871dc977e0a3e811b801d6c8ee7398e5` returned zero. No environment variable was edited. The temporary worktree and its ignored `.vercel`/`.env.local` runtime material were removed after the clean-tree and tree-hash recheck.

Because no exact Preview became Ready, the previously blocked browser, Sign Out, redirect, direct API, mutation, and guard-before-body tests remain not run. The database migration and worker evidence were not repeated or changed.

## Codespace recovery and single exact Preview attempt

The restarted session recovered existing review head `d6071d1765244daeb5cf259346158b03f284492f` on `codex/final-review-rcap-internal-admin-fc838be`. The review worktree was clean, both controlling remote branches and both controlling SHAs existed, and no merge or rebase was active. `/workspaces/rcap-admin-exact-preview` did not exist, so it was recreated as a detached worktree at exactly `fc838be7871dc977e0a3e811b801d6c8ee7398e5`. Its tracked status was clean and its complete candidate tree was `91ca2ba3b6e901980bf80b7e4c23aa6399de674c` before and after the attempt.

Vercel CLI 59.5.0 was already authenticated as `roger947` with active scope `roger947s-projects`. The detached worktree linked only to the existing `roger947s-projects/legalease-partner-dashboard-clean` project. No project was created, no Git repository was connected, and `.vercel` was not committed.

Source inspection identified these required Preview variable names, and `vercel env ls preview` showed all four configured:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_SUPABASE_PARTNER_DATA`

The CLI version did not support `env ls preview --git-branch`. Sensitive values remained hidden and were neither printed nor changed.

Exactly one deployment command then targeted Preview with a TGZ archive and the required candidate metadata. It created:

- URL: `https://legalease-partner-dashboard-clean-42dvvcmo1-roger947s-projects.vercel.app`
- Deployment: `dpl_9pcLXpea33u3csd1QWebrJGCXCBX`
- Project: `legalease-partner-dashboard-clean`
- Metadata SHA: `fc838be7871dc977e0a3e811b801d6c8ee7398e5`
- Metadata branch: `codex/rcap-internal-admin-release-evidence`
- Environment/target: Preview
- Final status: `ERROR`

Vercel failed while deploying outputs because function `api/expungement-ai/briefcase/[itemId]/packet-information` was 635.89 MB uncompressed, exceeding the 250 MB function limit. The deployment has no alias and never became Ready. No second deployment was attempted, no environment variable was edited, and no Production domain or deployment changed.

Because there was no runnable application, Chromium was not opened for authentication, no credential was submitted, and no application mutation occurred. The actual Supabase runtime project ref could not be observed; neither a match nor a mismatch was claimed. The five identity journeys, browser controls, origin/referrer controls, return-destination matrix, and deployed page/API/mutation guards therefore remain unexecuted.

## Preview-only Large Functions retry

The reviewer recovered clean review head `d6363414f304da02a7e6580dbfca88b349e39c68` and the existing detached candidate worktree. Immediately before configuration and deployment, the candidate HEAD was exactly `fc838be7871dc977e0a3e811b801d6c8ee7398e5`, its tracked status was empty, and its complete tree was `91ca2ba3b6e901980bf80b7e4c23aa6399de674c`.

Vercel project inspection showed Fluid Compute enabled, zero Secure Compute networks, and no Static IP configuration exposed. `VERCEL_SUPPORT_LARGE_FUNCTIONS` was absent from Preview before this retry. The reviewer added it once as non-sensitive Config value `1`, scoped to Preview. A separate Production entry predated this review and was not modified.

Exactly one retry then deployed the unchanged candidate with the required Git metadata:

- URL: `https://legalease-partner-dashboard-clean-rcjqzcqs0-roger947s-projects.vercel.app`
- Deployment: `dpl_BuysudSvAMr8S2kGJznoj79cp5gi`
- Project: `legalease-partner-dashboard-clean`
- Target/environment: Preview
- Metadata SHA: `fc838be7871dc977e0a3e811b801d6c8ee7398e5`
- Metadata branch: `codex/rcap-internal-admin-release-evidence`
- Final status: Ready in seven minutes

The same 635.89 MB measured uncompressed function passed the output phase after the opt-in. Vercel did not emit a separate Large Function label, so use is inferred from the unchanged candidate becoming Ready after the Preview-only setting. Production was not deployed or changed.

Before authentication, real Chromium opened the deployed sign-in application using the project's pre-existing automation-protection bypass. Chromium loaded the deployment itself, and the same-origin client bundle exposed Supabase project ref `wwtwtsmywnckfkdaqqeg`. That does not match required acceptance ref `hyflxnlhpmiqxvvcoiia`.

Per the controlling pre-authentication stop rule, no credentials were submitted and no application mutation was attempted. The five identity journeys, browser Sign Out and switch-account controls, Origin/Referer controls, return-destination matrix, and direct deployed page/API/mutation checks were therefore not run against the wrong Supabase project. The candidate HEAD, tree, and clean tracked status remained unchanged after deployment and inspection; implementation, RLS migration, worker evidence, and application-source bytes moved are all zero.

## Branch-specific acceptance-environment rebind

The reviewer recovered clean review head `0fd10c878fd4ff0ce68011211efd8cc913dedb53` and the existing detached candidate worktree at exact HEAD `fc838be7871dc977e0a3e811b801d6c8ee7398e5` and tree `91ca2ba3b6e901980bf80b7e4c23aa6399de674c`. Vercel CLI remained authenticated as `roger947`, and the worktree remained linked to the existing `roger947s-projects/legalease-partner-dashboard-clean` project.

Candidate source and acceptance configuration establish this exact environment contract:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_SUPABASE_PARTNER_DATA=true`
- inherited `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`

The authenticated Supabase CLI accessed project `hyflxnlhpmiqxvvcoiia` and retrieved its existing legacy `anon` and `service_role` keys directly to a mode-0600 temporary file. No key was created or rotated. JWT claims established roles `anon` and `service_role` and exact ref `hyflxnlhpmiqxvvcoiia`; both keys returned HTTP 200 from the expected project's non-mutating Auth settings endpoint. No key value was printed, and all temporary secret material and Supabase CLI working files were deleted.

The branch-specific Preview inventory was empty before the write attempt. Vercel first refused legacy Sensitive visibility for a new `NEXT_PUBLIC_` entry under its current public-prefix policy. The supported Config form then reached the branch-target validation and failed with this exact platform response:

> Project "legalease-partner-dashboard-clean" does not have a connected Git repository.

No branch-specific variable was created. The post-attempt branch inventory remained empty, while all global Preview and Production variable timestamps remained unchanged and the global Preview Large Functions setting remained present. GitHub was not connected because this review did not have authority to expand the operational scope after Vercel exposed that prerequisite.

The effective branch configuration therefore could not be established, and the required predeployment environment gate stopped the task. No new Preview was deployed, the incorrect Preview was not reused, and no authentication, browser control, direct request, or application mutation was attempted. Candidate HEAD, tree, and clean status remained unchanged; implementation, RLS migration, worker/release evidence, and application source bytes moved are zero.

## One-shot per-deployment acceptance Preview

The reviewer recovered clean review head `a185572e6699f3e8a7020f128c692e24715e0735` and the existing detached candidate worktree at exact HEAD `fc838be7871dc977e0a3e811b801d6c8ee7398e5`. Its complete Git tree was `91ca2ba3b6e901980bf80b7e4c23aa6399de674c` before deployment and remained identical afterward. The candidate worktree was clean before and after.

The authenticated Supabase CLI retrieved the existing acceptance project's legacy `anon` and `service_role` keys without creating, rotating, revoking, or printing a key. JWT claims established the exact project ref and distinct client/server roles. A mode-0600 Node wrapper outside the repository constructed the Vercel argument array in memory and executed without shell interpolation. It supplied these names to both `--build-env` and `--env` for this deployment only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENABLE_SUPABASE_PARTNER_DATA=true`
- `VERCEL_SUPPORT_LARGE_FUNCTIONS=1`

Exactly one Preview was created by this final mechanism:

- URL: `https://legalease-partner-dashboard-clean-5ckis2c20-roger947s-projects.vercel.app`
- Deployment: `dpl_GquPPeqnFKKyuxL5K7UbQ4XGrybw`
- Project: `roger947s-projects/legalease-partner-dashboard-clean`
- Target/status: Preview, Ready
- Metadata SHA: `fc838be7871dc977e0a3e811b801d6c8ee7398e5`
- Metadata branch: `codex/rcap-internal-admin-release-evidence`
- Large Functions: effective; the unchanged function previously measured at 635.89 MB uncompressed deployed successfully

The command used only per-deployment values. It did not add, update, or remove a global Preview, Production, Development, branch-specific, or custom-environment variable. No Production deployment or domain changed. All temporary key, capture, and wrapper files were removed; none appears in Git status or the review diff.

Before authentication, real Chromium loaded the new deployment through the project's existing automation bypass and observed only `hyflxnlhpmiqxvvcoiia.supabase.co` in Supabase client initialization and network destinations. The client bundle carried the `anon` class only. No service-role key reached a client bundle, browser request, log, screenshot, or reviewer record.

The deployed synthetic identity matrix passed:

| Identity | Deployed result |
| --- | --- |
| Active global internal administrator | Authenticated; provisioning page, email, effective `internal_admin` role, Sign Out, and read-only provisioning records visible |
| External email with no role and forged metadata | Authenticated; internal page denied; email visible; no protected partner data; direct API and mutations denied |
| Corporate-domain account without a role | Denied; domain alone granted nothing |
| Partner administrator | Denied from LegalEase internal administration |
| Disabled/revoked internal administrator | Denied |

Real Chromium submitted the internal-shell, denial-page, and content-route Sign Out/switch-account HTML forms. The deployment emitted `Referrer-Policy: same-origin`; Chromium sent the expected same-origin Origin and Referer; accepted posts returned local 303 redirects; Supabase session cookies cleared; protected pages and mutations were denied afterward; browser Back exposed no usable protected page or identity. A cross-origin HTML form with an unsafe Origin and Referer returned 403 without clearing the session. An opaque `data:` form produced `Origin: null` without Referer and returned 403 without clearing the session. GET redirected without mutation, and the consumer Sign Out control remained functional.

The deployed return-destination matrix rejected protocol-relative, backslash-host, absolute HTTP, absolute HTTPS, encoded slash, encoded backslash, double-encoded, CRLF/control-character, and malformed-encoding inputs to the local `/briefcase` fallback. A nested internal provisioning detail route retained its query string and fragment exactly.

An authenticated external-no-role browser issued deployed unauthorized requests for provisioning read/write, invitation create/resend/revoke, onboarding workspace creation, commercial-gate mutation, publication, activation, role/user mutation, protected promotion export, and protected media mutation. Every request returned 403. The malformed JSON cases returned authorization denial instead of a parse error, proving the gate ran before body parsing; all denied bodies omitted protected partner markers, and membership state remained unchanged.

All five named Auth fixtures and the synthetic acceptance partner were removed. A final acceptance-project inventory returned zero matching users and zero matching partner rows. Implementation, application source, RLS migration, worker/release evidence, and candidate-tree bytes moved are all zero.

## Final disposition

`APPROVED_FOR_MERGE`

The exact candidate is ready to merge. The final Preview is Ready, its runtime Supabase identity matches the authorized acceptance project, and every remaining deployed browser and direct-request gate passed. Production account cutover, Production deployment, and Clinic Mode foundation remain explicitly unauthorized and not ready.
