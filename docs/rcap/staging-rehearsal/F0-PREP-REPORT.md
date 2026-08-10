# F0 Staging Preflight Report — Session F (Phase-51 revision)

- Lane: session-f-staging-preflight (execution and evidence lane; no implementation)
- MODE: PREP_ONLY (nothing applied, deployed, enabled, or altered)
- Date: 2026-08-10 (third revision: rehearsal extended to the 49→50→51 sequence)
- Branch: `claude/rcap-staging-preflight-phase51`
- Base: `origin/claude/rcap-final-sprint-integration` @ `abbc48a19f79a817a4e14d4350297a9a753dbc05` (re-fetched and re-pinned this session; preflight base, not deploy authorization)
- Worktree: separate clean worktree (0 dirty paths at creation); captain-owned paths untouched — all lane changes live under `docs/rcap/staging-rehearsal/`

## 1. Migration paths, hashes and the three-file action (all verified this session)

| Item | Result |
|---|---|
| `supabase/phase-49-rcap-packet-render-jobs.sql` | sha256 `2ad3726d8c2c02058a0545b940d84865b30de95b8a367a081a08cf709a7bc2d6` — matches queue `authorizedSha256`; staging **authorized** |
| `supabase/phase-50-rcap-packet-delivery-hardening.sql` | sha256 `15063ea9179402f35a22fbdf9ec78b8bb8ae7408adf6447f1a3e07cb4579eb62` — matches queue; staging **queued** |
| `supabase/phase-51-rcap-consumer-payment-gate.sql` | sha256 `3c3e971c1fdb3382f4caef3e14c683d237033dc3949518a144b01d23b908e1ba` — matches queue; staging **queued** |
| Prepared staging action A1-staging | names all three files, in order, in one command: `psql <staging> -f phase-49… && psql <staging> -f phase-50… && psql <staging> -f phase-51…` |
| Two-file form | explicitly superseded — sequenceNote: "The two-file form of this action is superseded and must not be run"; applying 49+50 alone installs the consumer payment defect (unsponsored jobs zero_charge AND deliverable without payment) |
| Phase 48 | declined/superseded; file absent; never applied |

## 2. Apply-evidence check (proven discriminating on a real ephemeral cluster this session)

The queue's `evidenceOnApply` requires the live `finalize_packet_render_job`
to resolve to the phase-51 definition (consumer branch calling
`consumer_packet_payment_valid`). Executed on ephemeral PostgreSQL 16:

| State | `finalize` definition contains `consumer_packet_payment_valid` |
|---|---|
| After 49 + 50 only | **f** |
| After 49 + 50 + 51 | **t** (and `consumer_packet_payment_valid` exists) |

All three migrations applied with zero SQL errors. The exact check SQL is in
`F0-EXECUTION-COMMANDS.md` §9.

Consumer-payment semantics read from the phase-51 bytes:
`consumer_briefcase_items.payment_status = 'paid' AND amount_cents = 5000`,
keyed by `briefcase_item_id`; unpaid, refunded, not_applicable, wrong-amount
and missing-table all fail closed as "not proven paid".

## 3. Local ephemeral verification of the tip (this session)

| Verifier | Result on `abbc48a1` |
|---|---|
| `rcap:verify-render-job-contract` | PASS |
| `rcap:verify-packet-render-jobs` | PASS |
| `verify-rcap-packet-delivery-db` (49→50→51) | PASS |
| `verify-rcap-render-worker-delivery` | **FLAKY — pass/FAIL/FAIL on identical trees; SF-DEFECT-001, reported to Terminal A, not patched by this lane** |
| `verify-rcap-render-worker-runtime` | PASS |
| `verify-rcap-packet-delivery-e2e` (mobile Chromium) | PASS |
| `verify-rcap-mutation-authority` | PASS |
| `verify-rcap-runtime-credential-boundary` | PASS — 50 assertions |

## 4. Infrastructure discovery (facts, no guesses — all checked in this container)

| Item | Finding |
|---|---|
| Staging Supabase project | NOT DISCOVERABLE — no project ref in tree; zero credential env vars |
| Staging app target / domain | UNKNOWN — Vercel per docs/PHASE_17; project/domain unnamed; no Vercel CLI/token |
| Staging worker registry / deployment target | UNCHOSEN — image from `deploy/rcap-render-worker/Dockerfile` via CI/platform builder (no Docker daemon here); host per spec: Fly.io/Railway/ECS/supervised container |
| Database access method | `psql` 16 client present; PostgreSQL 16 server binaries present for ephemeral clusters; staging connection string absent |
| Auth / Storage readiness | UNVERIFIABLE without project + keys; bucket per spec `rcap-packet-artifacts-private` |
| Current staging app SHA | UNKNOWN — no staging domain to probe |
| Current worker image digest | UNKNOWN — likely none deployed; digest consumed from the gate (`WORKER_IMAGE_DIGEST`, supplied by Terminal A from the builder) |
| Feature flags | NO named in-code flag in the delivery path (env reads: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, RCAP_WORKER_CONTAINER_DIGEST, RCAP_WORKER_CLAIM_SECONDS); gate must name the mechanism |
| Secret source | platform secret manager per deployment spec; none in repo or container |
| Logs / metrics | worker stdout JSON → platform drain (unnamed); job table is metrics source of truth |
| Mobile-browser environment | AVAILABLE — pinned chromium `/opt/pw-browsers/chromium`, exercised by the e2e verifier this session |

## 5. Missing-access matrix

| Capability | Present | EXECUTE possible without it? | Owner action |
|---|---|---|---|
| Migration application (staging DATABASE_URL) | NO | no | Roger/A: session secret store |
| Database verification | NO | no | same |
| Supabase Auth administration | NO | no (Stage 6) | same |
| Private Storage verification | NO | no (Stage 5) | same + least-privilege worker credential |
| App deployment (Vercel token/project) | NO | no (Stage 3) | A names target; Roger grants token |
| Image publication (registry) | NO | no (Stage 4) | A: CI/platform builder publishes; supplies digest |
| Worker deployment (host credential) | NO | no (Stage 4) | A names target + credential |
| Feature-flag control | NO (mechanism unnamed) | no (Stages 7/14) | A names STAGING_FEATURE_FLAG |
| Observability (log drain) | NO | degraded-but-possible via DB metrics | A names OBSERVABILITY_DESTINATION |
| Staging test email | UNCONFIRMED | no (stop condition) | A confirms mail capture/test domain |

No secret value was displayed, printed, committed, or echoed; the container holds none.

## 6. Prepared artifacts (this branch)

| Artifact | Purpose |
|---|---|
| `F0-TEST-IDENTITIES.json` | Sanitized partners, participants, sessions, entitlements, matters — now including consumers C1/C2 and five payment-state briefcase items |
| `F0-EVIDENCE-MATRIX.json` | **77 cases** (Stages 5–12, 14): 69 carried cases + 8 consumer-payment cases SF-PAY-01…08 (unpaid, wrong amount, refunded-before-finalization, paid-$50 eligible, participant/matter binding, no cross-matter unlock, sponsored unaffected, free repeat download) |
| `F0-EXECUTION-COMMANDS.md` | Inert 49→50→51 apply + object-verification commands, the proven finalize-definition apply-evidence check, worker-digest provenance, deploy/health/flag/render/download/accounting/rollback commands |
| `F0-EXECUTION-GATE-BLOCK.md` | Complete execution authorization block — repo-verifiable fields filled and marked VERIFIED, all others visibly BLANK/BLOCKED |
| `F0-PHONE-ACCEPTANCE.md` | Roger's physical-phone checklist covering BOTH journeys: sponsored packet and paid consumer packet, with a combined pass/fail form |
| `F0-DEFECT-REPORT-001.md` | Flaky substitution assert (unchanged at this tip) — owned-path fix awaited from Terminal A |
| `F0-PREP-REPORT.md` | This report |

## 7. Exact blockers to EXECUTE_STAGING

1. Roger's staging grant for Phases 50 and 51 — queue still `queued`; must name all three files and the environment in `data/rcap-authorization-queue.json` (captain-owned; this lane cannot write it).
2. SF-DEFECT-001 — launch chain nondeterministically red; no trustworthy REQUIRED_GITHUB_CHECKS_GREEN until Terminal A lands a fix and names a corrected green SHA.
3. Execution-gate block — all environment/credential fields BLANK (see `F0-EXECUTION-GATE-BLOCK.md`).
4. Staging credentials — none in this container (DB, Auth, Storage, deploy, registry, flags, logs).
5. Feature-flag mechanism unnamed (no in-code flag exists).
6. Staging test-mail capture unconfirmed (real-email stop condition).
