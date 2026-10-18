# AT-GA-43 / CT09 / CT12 isolated delivery rehearsal — single command sequence

Status: PREPARED, NOT RUN. Every case below is NOT_RUN until a genuine artifact exists.
Identities: AT-GA-43 (owner positive control + staff-owner-artifact-denied, wrong-participant-denied,
wrong-program-denied, revoked-consent-staff-denied), AT-GA-49, AT-GA-52. Isolated PASS is not Production PASS.

## Fixed inputs (bound once, never moved by later commits)
- Application SHA: the exact SHA the lead names for publication. Recommended `2d6576395dd48389feede489634efae0cb14178e`
  (first pushed head that contains the accepted private-delivery F1-F6, 084766a87); `3cf47c6123cd9d1c34712aa885f588cdb4a4e9be`
  lacks them and would fail the denial predicates by design. Receipt-only successors are allowed; worker inputs must stay equal.
- Worker source SHA = the same SHA. Image: `ghcr.io/roger-legalease/rcap-render-worker:<SHA>` pulled by `@sha256:<digest from the publication artifact>`.
- Canonical worker-input fingerprint: `node scripts/rcap-hosted-acceptance-worker-input-plan.mjs` at the application checkout; must equal `workerInputFingerprint` in `data/rcap-render/worker-publication-evidence.json`.
- Target: loopback only. Application `http://127.0.0.1:3139`; Supabase gateway `http://127.0.0.1:54321`; PostgREST 54322; Postgres 127.0.0.1:55432 (container `legalease-hotfix-local-db-1`, db `rcap`); Mailpit 54324; storage-api container `rcap-practice-storage`.

## Preconditions (each is a listed permission or lead item; none is done here)
1. P1 publication + P2 image acceptance recorded in `data/rcap-render/worker-publication-evidence.json`.
2. P3 registry/observation regenerated so the MS record's `provider.imageDigest` equals that digest.
3. P4 disk OK; P5 a read:packages credential for the pull.
4. P6 resolved locally (lead, 2026-10-18 Section 3): no separate loader exists. The run env is derived from the local stack's own
   `/workspaces/legalease-hotfix-runtime-20261006/.env` (names `ANON_KEY`, `SERVICE_KEY`, `JWT_SECRET`; local isolated keys, never printed)
   and the synthetic programs already present in the local DB: `CLINIC_QA_PROGRAM=qa-legacy-clinic-mv34wa4l` (the only MS-capable,
   activation-true synthetic program), `CLINIC_QA_OTHER_PROGRAM=qa-agreement-mv34j5dl` (synthetic, inactive; the fixture only needs slug+name).

## Sequence (run from the application checkout at the bound SHA; values come from the private loader, never from arguments)
```sh
# 0. lease (held for the whole sequence; released when the shell exits)
flock -n /workspaces/training-modules-09-10/output/dual-agent/db.lock bash -e <<'RUN'
# 0a. run env from the local stack's config; values stay in the shell, never echoed
set -a; . /workspaces/legalease-hotfix-runtime-20261006/.env; set +a
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_KEY"
export JOURNEY_BASE_URL=http://127.0.0.1:3139 CLINIC_QA_DB_CONTAINER=legalease-hotfix-local-db-1 CLINIC_QA_DB_PORT=55432 CLINIC_QA_DB_NAME=rcap
export CLINIC_QA_PROGRAM=qa-legacy-clinic-mv34wa4l CLINIC_QA_OTHER_PROGRAM=qa-agreement-mv34j5dl CLINIC_QA_JURISDICTION=MS
export CLINIC_QA_ISOLATED=owner-authorized-synthetic-only CLINIC_QA_SIMULATED_ALLOCATION=owner-authorized-run-scoped
# 1. stack on the existing volume (project name is REQUIRED: without -p compose creates a second project on the same
#    volume). The pre-existing containers lost their RW layers in a daemon restart; --force-recreate rebuilds the
#    container objects only, the data volume b34fd07d... is external and untouched.
docker compose -p legalease-hotfix-local -f /workspaces/legalease-hotfix-runtime-20261006/compose.yml up -d --force-recreate
docker start rcap-practice-storage || echo "rcap-practice-storage needs recreation by the lead (same RW-layer defect)"
# 2. identity: the published worker equals this checkout's inputs (refuses otherwise)
node scripts/verify-rcap-worker-input-equivalence.mjs --base "$(node -p "require('./data/rcap-render/worker-publication-evidence.json').sourceSha")" --head "$(git rev-parse HEAD)" --label "published worker -> application"
# 3. worker from the immutable digest only (never a tag), bound to loopback Supabase; no Production variable present
docker pull "ghcr.io/roger-legalease/rcap-render-worker@${WORKER_DIGEST}"
docker run -d --name ga43-worker --network host --env-file "${PRIVATE_WORKER_ENV_FILE}" -e RCAP_WORKER_CONTAINER_DIGEST="${WORKER_DIGEST}" "ghcr.io/roger-legalease/rcap-render-worker@${WORKER_DIGEST}"
# 4. application: the SAME checkout, already built at /tmp/legalease-app-2d6576395 (BUILD_ID lR-_UGdFu-WuwztiSAN6a640M, credential-free
#    build exit 0 on 2026-10-18). node_modules there is a cp -a copy, not a symlink: Turbopack refuses a symlink outside the project root.
npm start -- -p 3139 &
# 5. the existing harness: owner generation/download + the four denials, run-owned cleanup, restoration proof
CLINIC_QA_OUTPUT="$PRIVATE_EVIDENCE_DIR" CLINIC_QA_APPLICATION_ROOT="$PWD" npm run clinic:acceptance
# 6. stop everything this run started; pre-existing rows and objects are restored by the harness's own teardown
docker rm -f ga43-worker
docker compose -f /workspaces/legalease-hotfix-runtime-20261006/compose.yml stop
docker stop rcap-practice-storage
RUN
```
Exit 0 = all cases PASS; exit 2 = PARTIAL (remaining requirements in the receipt); exit 1 = a check, execution or cleanup failed. Preserve the private receipt if cleanup fails.

## What is recorded
- `CLINIC_QA_OUTPUT` receipt (private, never committed): per-case status for the 22 cases per locale, the owner PDF hash/length vs. the finalized job and provenance, `artifactWorkerBinding` (source SHA, container digest, renderer, input fingerprint, acceptance run id), cleanup/restoration hashes.
- Acceptance note in ACCEPTANCE_TO_LEAD.md: image digest, run ids, start/stop times of the stack, lease held, and the five identity-mapped results (owner positive control, staff-owner-artifact-denied, wrong-participant-denied, wrong-program-denied, revoked-consent-staff-denied), each PASS / FAIL / NOT_RUN with the reason.

## Never
No placeholder PDF, in-memory mock, fabricated render job, counter, receipt or publication. No Production or hosted Supabase. No `latest` tag. No pull by tag.
