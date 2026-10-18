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
3. P4 disk OK; P5 a read:packages credential for the pull; P6 the private env loader and the two synthetic program slugs.

## Sequence (run from the application checkout at the bound SHA; values come from the private loader, never from arguments)
```sh
# 0. lease (held for the whole sequence; released when the shell exits)
flock -n /workspaces/training-modules-09-10/output/dual-agent/db.lock bash -e <<'RUN'
# 1. stack on the existing volume, then storage
docker compose -f /workspaces/legalease-hotfix-runtime-20261006/compose.yml up -d
docker start rcap-practice-storage
# 2. identity: the published worker equals this checkout's inputs (refuses otherwise)
node scripts/verify-rcap-worker-input-equivalence.mjs --base "$(node -p "require('./data/rcap-render/worker-publication-evidence.json').sourceSha")" --head "$(git rev-parse HEAD)" --label "published worker -> application"
# 3. worker from the immutable digest only (never a tag), bound to loopback Supabase; no Production variable present
docker pull "ghcr.io/roger-legalease/rcap-render-worker@${WORKER_DIGEST}"
docker run -d --name ga43-worker --network host --env-file "${PRIVATE_WORKER_ENV_FILE}" -e RCAP_WORKER_CONTAINER_DIGEST="${WORKER_DIGEST}" "ghcr.io/roger-legalease/rcap-render-worker@${WORKER_DIGEST}"
# 4. application: production build + start of the SAME checkout (the checkout lives on /tmp while /workspaces is below the disk floor)
npm run build && (npm start -- -p 3139 &)
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
