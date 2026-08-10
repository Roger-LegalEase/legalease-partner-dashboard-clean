# F0 Staging Rehearsal Prep Report — Session F

- Lane: session-f-staging-rehearsal (execution and evidence lane; no implementation)
- MODE: PREP_ONLY (execution gate not supplied; no staging touched)
- Date: 2026-08-10
- Branch: `claude/rcap-staging-rehearsal` (new, from the integration tip)
- Base: `origin/claude/rcap-final-sprint-integration` @ `e078a87f4096dc96cd6cae9b91e1ede0a82a3fca` — checkpoint `e078a87f` confirmed on the tip
- Worktree: separate clean worktree; captain-owned paths untouched (all changes live under `docs/rcap/staging-rehearsal/`)

## 1. Preflight verification of the review base

| Check | Result |
|---|---|
| Remote tip contains checkpoint e078a87f | YES — tip IS e078a87f4096dc96cd6cae9b91e1ede0a82a3fca |
| Worktree clean | YES |
| AGENTS.md read | YES — identical on integration tip and main |
| Phase 49 bytes vs queue `authorizedSha256` | MATCH — `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` |
| Phase 50 bytes vs queue `authorizedSha256` | MATCH — `15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62` |
| Phase 48 status | declined/superseded in queue; file absent from tree; not to be applied |

### Authorization scope on record (data/rcap-authorization-queue.json)

- Phase 49 (`auth-2026-08-10-phase-49-packet-render-jobs`): status `authorized`; `applyStaging: authorized`.
- Phase 50 (`auth-2026-08-10-phase-50-packet-delivery-hardening`): status `authorized_scoped`; scope `repository_integration_only`; **staging is `queued` — "requires Roger to name both migration files and the staging environment"** (prepared action `A1-staging`).

Consequence: even a complete gate block from Terminal A cannot start EXECUTE_STAGING until the queue record for Phase 50 carries Roger's staging grant naming both files and the environment.

## 2. Local ephemeral verification of the tip (authorized scope; run in this container)

All on PostgreSQL 16 ephemeral clusters with the pinned chromium (`/opt/pw-browsers/chromium`), against the exact authorized migration bytes:

| Verifier | Result |
|---|---|
| `rcap:verify-render-job-contract` | PASS — fixture, SQL and TypeScript agree; mutation killed |
| `rcap:verify-packet-render-jobs` (Phase 49) | PASS |
| `verify-rcap-packet-delivery-db` (49→50 sequence) | PASS |
| `verify-rcap-render-worker-delivery` (crash + corruption injection) | PASS |
| `verify-rcap-packet-delivery-e2e` (mobile Chromium over HTTP) | PASS |
| `verify-rcap-mutation-authority` (forgery battery) | PASS — "grants are the boundary" |

These are local rehearsals only; no staging case in the evidence matrix is marked from them.

## 3. Infrastructure discovery (facts, no guesses)

| Item | Finding |
|---|---|
| Staging Supabase project identifier | NOT DISCOVERABLE from repo or container — no project ref in tree (correct hygiene), no env vars present. Must come from the gate block. |
| Staging application project / preview domain | UNKNOWN — Vercel is the documented hosting path (docs/PHASE_17_PRODUCTION_DEPLOYMENT.md); no staging project/domain recorded in repo; no Vercel CLI or token in container. |
| Staging worker hosting target | UNCHOSEN — spec allows Fly.io / Railway / ECS / supervised container (docs/RCAP_RENDER_WORKER_DEPLOYMENT.md); gate must name it. No platform CLI in container. |
| Staging DB connection method | `psql` present in container (client 16); connection string absent. Prepared action A1-staging uses `psql <staging> -f …`. |
| Staging Auth availability | UNVERIFIABLE without project URL + keys. |
| Staging Storage availability | UNVERIFIABLE without project URL + keys. Bucket name in spec: `rcap-packet-artifacts-private`. |
| Applied migration list (read-only) | UNREADABLE — no credentials. Note: pre-49 phases prove by object presence, not ledger rows. |
| Current staging application SHA | UNKNOWN — no staging domain to probe. |
| Current staging worker image digest | UNKNOWN — likely none deployed yet. |
| Feature-flag mechanism | NO named in-code flag in the delivery path (`src/app/api/rcap/packets/**`, `src/lib/rcap/render/**` read only `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RCAP_WORKER_CONTAINER_DIGEST`). Effective gating = deployment + worker claim enablement. Gate field `STAGING_FEATURE_FLAG` must name the real mechanism. |
| Secrets source | Platform secret manager per deployment spec; nothing in repo or container (verified: zero credential env vars). |
| Email-verification behavior | Supabase Auth handles verification; staging test-mail capture/sandbox NOT confirmed — real-email risk is a stop condition until A confirms the staging mail configuration or test domain. |
| Observability / log access | Worker: stdout JSON to platform drain; job table is metrics source of truth. No dashboard/drain access from this container. |
| Mobile-browser / Playwright environment | AVAILABLE — pinned chromium at `/opt/pw-browsers/chromium` (used by the e2e verifier), Playwright configured. |
| Docker daemon | NOT AVAILABLE in this container — worker image must be built by CI/platform builder; this lane consumes only the digest. |
| PostgreSQL 16 server binaries | AVAILABLE (`/usr/lib/postgresql/16/bin`) — ephemeral local clusters work. |

## 4. Credential matrix (verified in this container)

| Capability | Credential needed | Present | Rehearsal can continue without it? | Owner action |
|---|---|---|---|---|
| Migration application | staging `DATABASE_URL` (direct psql) | NO | Prep yes; EXECUTE no | Roger/A: inject via session env or secret store |
| Database verification | same as above (read role sufficient for before-state) | NO | Prep yes; EXECUTE no | same |
| Supabase Auth administration | `SUPABASE_SERVICE_ROLE_KEY` (staging) + project URL | NO | Prep yes; EXECUTE no (Stage 6 needs it) | same |
| Private Storage verification | service key and/or scoped worker storage credential | NO | Prep yes; EXECUTE no (Stage 5 storage battery) | same; least-privilege worker credential per deployment spec |
| Application deployment | Vercel (or named target) token + project | NO | Prep yes; EXECUTE no (Stage 3) | A names target; Roger grants token |
| Worker deployment | container-host credential + registry; image built elsewhere (no local Docker daemon) | NO | Prep yes; EXECUTE no (Stage 4) | A names WORKER_IMAGE_SOURCE/DIGEST + target credential |
| Feature-flag control | mechanism unnamed | NO | Prep yes; EXECUTE no (Stages 7/14) | A names STAGING_FEATURE_FLAG mechanism |
| Log and metric inspection | platform log-drain access; DB access covers job-table metrics | NO | Prep yes; EXECUTE degraded-but-possible via DB queries if drain absent | A names OBSERVABILITY_DESTINATION |
| Staging test email | test-mail domain or Supabase mail sandbox confirmation | NO | Prep yes; EXECUTE no (real-email stop condition) | A confirms staging mail capture |

No secret value was displayed, printed, committed, or echoed at any point; the container holds none.

## 5. Evidence convention

- Repo precedent: `data/rcap-render/delivery-gate-evidence.json` (machine-generated gate evidence) and the queue's "compliance package" language; no canonical staging-evidence directory exists yet.
- Terminal A has NOT assigned evidence paths. Proposed lane-owned paths (nothing shared touched):
  - `docs/rcap/staging-rehearsal/` — lane scaffolding (this report, matrix, identities, commands)
  - `docs/rcap/staging-rehearsal/evidence/<testId>/` — per-case captures during EXECUTE_STAGING
  - `docs/rcap/staging-rehearsal/sql/` — generated object-verification SQL
- These become final only when A confirms or reassigns them.

## 6. Prepared artifacts

| Artifact | Purpose |
|---|---|
| `F0-TEST-IDENTITIES.json` | Sanitized partners/participants/sessions/entitlements/matters; canonical deterministic route `MS:misdemeanor_conviction` (renderer `packet_document_v1@1.0.0`, profile `MS@1.3.0`, petitioner "Test Participant", Hinds County) |
| `F0-EVIDENCE-MATRIX.json` | 69 test cases across Stages 5–12 and 14, every case carrying testId, prerequisite, identity, partner, participant, matter, entitlement condition, action, expected HTTP / render-job / artifact / credit-ledger / transmission-event results, expected denial-or-success, evidence location, pass/fail=pending |
| `F0-EXECUTION-COMMANDS.md` | Inert command list for migration, verification, deploys, flags, render, download, accounting, events, rollback |
| `F0-PREP-REPORT.md` | This report |

## 7. Exact blockers to EXECUTE_STAGING

1. Execution-gate block from Terminal A: not supplied (all fields absent).
2. Roger's staging authorization for Phase 50 naming both migration files and the staging environment: queue still shows `staging: queued`.
3. Staging Supabase project identity + credentials: absent from container.
4. Application deployment target/credential: absent.
5. Worker image source/digest + deployment target/credential: absent; no local Docker daemon to build.
6. STAGING_FEATURE_FLAG mechanism: no in-code flag exists; A must name the mechanism.
7. Staging email safety: test-mail capture unconfirmed (stop condition: a test could send a real participant email).
8. REQUIRED_GITHUB_CHECKS_GREEN attestation for the final integration SHA: not supplied; final SHA itself not yet named by A (e078a87f is only the preflight base).
