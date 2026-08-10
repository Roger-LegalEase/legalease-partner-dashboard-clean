# F0 Staging Rehearsal Prep Report — Session F

- Lane: session-f-staging-rehearsal (execution and evidence lane; no implementation)
- MODE: PREP_ONLY (execution gate not supplied; no staging touched)
- Date: 2026-08-10 (revised same day for the moved integration tip)
- Branch: `claude/rcap-staging-rehearsal` (lane-owned, rebased onto the current tip)
- Base: `origin/claude/rcap-final-sprint-integration` @ `abbc48a19f79a817a4e14d4350297a9a753dbc05`
  (previous preflight base `e078a87f` was superseded twice within the day — the
  gate's warning against assuming a stale SHA is demonstrated fact)
- Worktree: separate clean worktree; captain-owned paths untouched (all lane changes live under `docs/rcap/staging-rehearsal/`)

## 1. Preflight verification of the review base

| Check | Result |
|---|---|
| Worktree clean before work | YES |
| AGENTS.md read | YES |
| Phase 49 bytes at tip vs queue `authorizedSha256` | MATCH — `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` |
| Phase 50 bytes at tip vs queue `authorizedSha256` | MATCH — `15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62` |
| Phase 51 bytes at tip vs queue `authorizedSha256` | MATCH — `3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba` (new since prior base) |
| Phase 48 status | declined/superseded in queue; file absent; never to be applied |

### Authorization scope on record (queue at `abbc48a1`)

- Phase 49: `authorized`; `applyStaging: authorized`.
- Phase 50: `authorized_scoped`; staging **queued** — "requires Roger to name both migration files and the staging environment".
- Phase 51: `authorized_scoped`; staging **queued** — "requires Roger to name **all three** migration files and the staging environment".

The canonical staging migration sequence is now **49 → 50 → 51**. No chat-level
grant substitutes for the queue record; as of this base the record grants
staging for phase 49 only.

## 2. Local ephemeral verification of the tip (authorized scope; run in this container)

PostgreSQL 16 ephemeral clusters, pinned chromium (`/opt/pw-browsers/chromium`), exact authorized migration bytes:

| Verifier | Result on `abbc48a1` |
|---|---|
| `rcap:verify-render-job-contract` | PASS |
| `rcap:verify-packet-render-jobs` (Phase 49) | PASS |
| `verify-rcap-packet-delivery-db` (49→50→51) | PASS |
| `verify-rcap-render-worker-delivery` | **FLAKY — pass/FAIL/FAIL across three identical runs; see SF-DEFECT-001** |
| `verify-rcap-render-worker-runtime` (new) | PASS |
| `verify-rcap-packet-delivery-e2e` (mobile Chromium) | PASS |
| `verify-rcap-mutation-authority` | PASS |
| `verify-rcap-runtime-credential-boundary` (new) | PASS — 50 assertions |

Local rehearsals only; no staging matrix case is marked from them.

## 3. Defect reported to Terminal A

`F0-DEFECT-REPORT-001.md`: the substitution assert
(`verify-rcap-render-worker-delivery.mjs:400`, "another job's valid PDF at this
path fails closed") is a latent timing flake. Empirically confirmed in this
session: the real renderer produces **byte-identical PDFs for different packets
rendered within the same wall-clock second** (pdf-lib second-granularity
timestamps; fixture content identical across packets), making the expected
denial unsatisfiable in that window. Phase 51's SQL is not implicated — its
`applyFile` line only shifted timing. Implicated captain-owned paths:
`scripts/verify-rcap-render-worker-delivery.mjs` (fixture) and
`src/lib/rcap/documents/packet-document-renderer.ts` (render reproducibility
policy). This lane made no patch and reruns the case only on a corrected green
SHA from Terminal A. Until fixed, the launch test chain is nondeterministically
red, which blocks a trustworthy REQUIRED_GITHUB_CHECKS_GREEN.

## 4. Infrastructure discovery (facts, no guesses)

| Item | Finding |
|---|---|
| Staging Supabase project identifier | NOT DISCOVERABLE from repo or container — no project ref in tree (correct hygiene), zero credential env vars (re-verified this session). Must come from the gate. |
| Staging application project / preview domain | UNKNOWN — Vercel is the documented hosting path (docs/PHASE_17_PRODUCTION_DEPLOYMENT.md); no staging project/domain in repo; no Vercel CLI or token in container. |
| Staging worker hosting target | UNCHOSEN — Fly.io / Railway / ECS / supervised container allowed by docs/RCAP_RENDER_WORKER_DEPLOYMENT.md; gate must name it. New: signal-aware worker loop (`scripts/lib/rcap-render-worker-loop.mjs`) makes graceful SIGTERM drain the normal path. |
| Staging DB connection method | `psql` client 16 present; connection string absent. Prepared action A1-staging uses `psql <staging> -f …`. |
| Staging Auth availability | UNVERIFIABLE without project URL + keys. |
| Staging Storage availability | UNVERIFIABLE without keys. Bucket per spec: `rcap-packet-artifacts-private`. |
| Applied migration list (read-only) | UNREADABLE — no credentials. Pre-49 phases prove by object presence, not ledger rows. |
| Current staging application SHA | UNKNOWN — no staging domain to probe. |
| Current staging worker image digest | UNKNOWN — likely none deployed. No Docker daemon in this container (verified); image must be CI/platform-built, digest supplied via gate. |
| Feature-flag mechanism | NO named in-code flag in the delivery path (env vars read: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RCAP_WORKER_CONTAINER_DIGEST`, plus `RCAP_WORKER_CLAIM_SECONDS` in the new worker loop). Effective gating = deployment + worker claim enablement; gate field `STAGING_FEATURE_FLAG` must name the real mechanism. |
| Secrets source | Platform secret manager per deployment spec; nothing in repo or container. |
| Email-verification behavior | Supabase Auth; staging test-mail capture UNCONFIRMED — real-email risk is a stop condition until confirmed. |
| Observability / log access | Worker stdout JSON → platform drain; job table is metrics source of truth; no drain access from this container. |
| Mobile-browser / Playwright environment | AVAILABLE — pinned chromium at `/opt/pw-browsers/chromium`; e2e verifier exercised it this session. |
| PostgreSQL 16 server binaries | AVAILABLE (`/usr/lib/postgresql/16/bin`). |

## 5. Credential / missing-access matrix (verified in this container this session)

| Capability | Credential needed | Present | Rehearsal can continue without it? | Owner action |
|---|---|---|---|---|
| Migration application | staging `DATABASE_URL` | NO | Prep yes; EXECUTE no | Roger/A: inject via session environment secret store |
| Database verification | same (read role suffices for before-state) | NO | Prep yes; EXECUTE no | same |
| Supabase Auth administration | staging `SUPABASE_SERVICE_ROLE_KEY` + project URL | NO | Prep yes; EXECUTE no (Stage 6) | same |
| Private Storage verification | service key and/or scoped worker storage credential | NO | Prep yes; EXECUTE no (Stage 5) | same; least-privilege worker credential per deployment spec |
| Application deployment | Vercel (or named target) token + project | NO | Prep yes; EXECUTE no (Stage 3) | A names target; Roger grants token |
| Worker deployment | container-host credential + registry; no local Docker daemon | NO | Prep yes; EXECUTE no (Stage 4) | A names WORKER_IMAGE_SOURCE/DIGEST + target credential |
| Feature-flag control | mechanism unnamed | NO | Prep yes; EXECUTE no (Stages 7/14) | A names STAGING_FEATURE_FLAG |
| Observability | platform log-drain access | NO | Prep yes; EXECUTE degraded-but-possible via DB metrics | A names OBSERVABILITY_DESTINATION |
| Staging test email | test-mail domain or sandbox confirmation | NO | Prep yes; EXECUTE no (stop condition) | A confirms staging mail capture |

No secret value was displayed, printed, committed, or echoed; the container holds none.

## 6. Evidence convention and prepared artifacts

Proposed lane-owned paths (Terminal A has not assigned canonical ones):
`docs/rcap/staging-rehearsal/` (scaffolding), `docs/rcap/staging-rehearsal/evidence/<testId>/`
(per-case captures at execution), `docs/rcap/staging-rehearsal/sql/` (generated
object-verification SQL for phases 49/50/51).

| Artifact | Purpose |
|---|---|
| `F0-TEST-IDENTITIES.json` | Sanitized partners/participants/sessions/entitlements/matters; canonical deterministic route `MS:misdemeanor_conviction` |
| `F0-EVIDENCE-MATRIX.json` | 70 test cases (Stages 5–12, 14) with full per-case expectations; includes the new phase-51 `consumer_payment_required` case and the SF-DEN-13 byte-identity caveat |
| `F0-EXECUTION-COMMANDS.md` | Inert command list, now covering the 49→50→51 sequence |
| `F0-PHONE-ACCEPTANCE.md` | Roger's physical-phone acceptance checklist and pass/fail form |
| `F0-DEFECT-REPORT-001.md` | Flaky substitution assert — evidence and implicated owned paths for Terminal A |
| `F0-PREP-REPORT.md` | This report |

## 7. Exact blockers to EXECUTE_STAGING

1. Execution-gate block from Terminal A: not supplied.
2. Roger's staging grant in the queue for Phases 50 AND 51, naming all three files and the environment: still `queued` at `abbc48a1`.
3. SF-DEFECT-001: launch test chain nondeterministically red → no trustworthy CI-green attestation until Terminal A lands a fix and names a corrected green SHA.
4. Staging Supabase project identity + credentials: absent.
5. Application deployment target/credential: absent.
6. Worker image source/digest + deployment target/credential: absent; no local Docker daemon.
7. STAGING_FEATURE_FLAG mechanism: no in-code flag exists; A must name it.
8. Staging email safety: test-mail capture unconfirmed.
