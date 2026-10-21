# Existing control census — 2026-08-27

Every material control-relevant artifact found in the repository, with what it
proves and what it does not. Compiled by inspecting implementations, not
filenames.

**Rule applied throughout:** a document saying a control should exist does not
make it implemented; code existing does not make it operating.

## Verified existing — repository implementation

| Path | Purpose | Proves | Does NOT prove | Status | Controls |
|---|---|---|---|---|---|
| `supabase/migrations/*.sql` — 73 `CREATE POLICY`, 44 tables with RLS | Row-level tenant and owner isolation | Authorization is enforced in the database, not only in application code | That policies match intent, that they are the deployed policies, or that any review of them occurred | `REPOSITORY_IMPLEMENTED` | IAM-08, IAM-09, PIN-03 |
| `docs/security/rcap-internal-admin-authorization-audit.md` + 3 JSON inventories | Internal-admin authorization audit and route/authority map | A real over-privileged identity configuration was found, root-caused through the deployed request path, and documented with restraint — it explicitly states no breach is established | That remediation was applied in production, or that the configuration is now correct | `PARTIALLY_IMPLEMENTED` | IAM-11, GOV-09 |
| `docs/security/rcap-internal-admin-production-remediation.md` | Remediation plan for the above | A remediation path was designed | That it ran, or its outcome | `EXTERNAL_ACTION_REQUIRED` | IAM-11 |
| `docs/security/rcap-internal-admin-rls-blast-radius.md`, `-rls-migration-blocker.md` | Impact analysis before RLS change | Change impact was assessed before acting | Deployment | `DESIGN_DOCUMENTED` | SDLC-08 |
| `scripts/security/audit-internal-admin-access.mjs` | Read-only privileged-access audit | A tool exists to produce the privileged-access inventory | That it has been run against production, or its output | `REPOSITORY_IMPLEMENTED` | IAM-03 |
| `scripts/security/remediate-internal-admin-accounts.mjs` | Account remediation | A remediation tool exists | Execution | `REPOSITORY_IMPLEMENTED` | IAM-04 |
| `scripts/security/test-auth-redirect-security.mjs`, `test-sign-out-origin.mjs` | Redirect and sign-out boundary tests | Open-redirect and sign-out origin handling are tested | Runtime configuration | `REPOSITORY_IMPLEMENTED` | NET-04, SDLC-13 |
| `scripts/security/test-internal-admin-remediation.mjs`, `scripts/test-internal-admin-rls-hardening.mjs` | Remediation and RLS hardening verifiers | The hardening is regression-tested | That the hardened state is deployed | `REPOSITORY_IMPLEMENTED` | IAM-11 |
| `scripts/test-briefcase-presentation-authority.mjs` | Briefcase presentation authority | Participant-ownership presentation rules are tested | Hosted behaviour | `REPOSITORY_IMPLEMENTED` | PIN-03 |
| `.github/workflows/` — 13 workflows | CI for commercial flow, consumer adapter, hosted acceptance, worker publication and integrity, canary, source acquisition | Automated checks exist and run | That they are *required* to merge — no branch protection is evidenced | `PARTIALLY_IMPLEMENTED` | SDLC-03, SDLC-04 |
| `scripts/verify-*.mjs` — 333 verifiers | Product contract enforcement | Extensive automated assertion of product behaviour | Change control; a verifier proves only what it tests, and green CI is not evidence of a protected merge path | `REPOSITORY_IMPLEMENTED` | SDLC-14 |
| `src/content/legal/privacy-policy.md` | Published privacy notice | A privacy notice exists and recognises deletion rights | Any operational privacy-request workflow | `PARTIALLY_IMPLEMENTED` | PRI-01, PRI-07 |
| `consumer_pending_screening_results` — RLS enabled, service-role policy only, `expires_at` default 24h, `payment_allowed` default false | Pre-authentication result storage | The anonymous/authenticated boundary is enforced at the database | That the pending result is bound to the browser that created it — see the gap below | `REPOSITORY_IMPLEMENTED` | PRI-04, PIN-02 |
| `requireConsumerBriefcaseSession()` on packet download/generate/status/checkout | Owner-scoped artifact access | Artifact routes resolve against the session user, never a client-supplied id | Hosted verification | `REPOSITORY_IMPLEMENTED` | IAM-08, PIN-13 |
| `docs/PRODUCT_CONTRACT.md` | Controlling product contract | The target state is written down and outranks status reports | Implementation | `DESIGN_DOCUMENTED` | GOV-03, PIN-01 |
| `docs/sprint-control/audit/CONTRACT_AUDIT_FINDINGS_20260827.json` | 153 adversarially-verified contract gaps | A real, evidence-backed gap inventory exists | Remediation | `REPOSITORY_IMPLEMENTED` | GOV-06, VUL-04 |

## Confirmed absent

Searched repository-wide and across all 617 remote branches. No implementation,
partial work, or historical artifact exists for any of these:

| Area | Search result | Consequence |
|---|---|---|
| SOC 2 / Secureframe / Trust Services | Only this workstream's own documents mention them | Whole program is new |
| Dependency scanning (Dependabot) | No `.github/dependabot.yml` | VUL-01 unstarted |
| Code scanning (CodeQL) | No workflow | VUL-03 unstarted |
| Secret scanning configuration | No repository configuration found | VUL-02 unstarted |
| Security policy set | Only `privacy-policy.md`; no information-security, access-control, acceptable-use, asset, classification, retention, vendor, SDLC, vulnerability, logging, encryption, HR or remote-work policy | CC1 entirely new |
| Risk register, asset register, data inventory, vendor register, access-review records | None | CC3 entirely new |
| Incident-response plan, BCP, DR runbook, tabletop records, restore-test records | None | CC5 entirely new |
| Participant data export / matter deletion / account deletion | None on any branch — see `docs/PRODUCT_CONTRACT.md` §12A | CC6 partly a build task, not only a control task |
| Branch protection evidence | None in repository; reported externally as `main protected: false` | P0-1 |
| Training records, policy acknowledgments, endpoint inventory | None | CC3 |

## Material gap carried from the contract audit

`pending_token_hash` is declared in `supabase/phase-38-expungement-pending-screening-results.sql:6`
with a comment stating server claims currently use `pending_id` only. No code on
any of the 617 branches writes or verifies it. The claim is therefore authorized
by possession of the identifier, which travels in sign-in and set-password URLs
with no `Referrer-Policy` set. This is dead schema for a control the product
contract §7 already requires. Tracked as `PIN-02` and `IAM-12`, P0.

## Reuse rule

Nothing above is to be duplicated. `docs/security/` remains the home for the
internal-admin authorization work; `scripts/security/` remains the home for its
tooling; the 333 verifiers remain the product-contract evidence source. This
workstream references them by control ID and does not restate them.
