# Worker GHCR Publication — PREP_ONLY evidence and runbook

Lane-owned record for publishing the RCAP render worker to
`ghcr.io/roger-legalease/rcap-render-worker`. Publication is gated: it runs
only after Terminal A supplies the complete `GHCR_PUBLICATION_CLEARED: yes`
block naming `FINAL_ACCEPTED_SHA`. Nothing here deploys the image, starts a
worker, or touches staging or production.

## Machine-readable prep record

```json
{
  "environment": "publication-prep-only",
  "mode": "PREP_ONLY",
  "candidate_sha": "13e356c49bd484e6f946ba604076718d904bca86",
  "candidate_is_integration_tip": true,
  "dockerfile_path": "deploy/rcap-render-worker/Dockerfile",
  "dockerfile_sha256": "6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7",
  "lockfile_sha256": "fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7",
  "build_context": "repository root of a clean git-archive checkout",
  "image_byte_inputs": [
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "scripts/rcap-render-worker.mjs",
    "scripts/lib/**",
    "src/**",
    "node:22-slim base image"
  ],
  "entrypoint": ["node", "scripts/rcap-render-worker.mjs", "--loop"],
  "user": "rcapworker",
  "healthcheck": "node -e \"process.exit(0)\" every 30s, timeout 10s, retries 3",
  "required_env": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RCAP_WORKER_CONTAINER_DIGEST"],
  "optional_env": ["RCAP_WORKER_CLAIM_SECONDS"],
  "secret_source": "deployment platform secret manager only",
  "termination": "SIGTERM drains: idle sleep interrupted, in-flight cycle finishes, exit 0; platform grace 10-30s ok; claim lease 600s bounds any hard kill",
  "local_build_result": "success",
  "local_image_id": "sha256:0efcd6e0d81b528dd2eb042cf71f4cae83d63e2e21d3275da1453f7c3337dcab",
  "local_image_is_publishable": false,
  "sandbox_markers": ["NODE_EXTRA_CA_CERTS layer from local shadow base"],
  "runtime_checks": {
    "unconfigured_startup": "exit 2 with clear config error",
    "liveness": "health=healthy after first interval",
    "readiness": "polling banner emitted; no inbound endpoint by design - queue-age check is operational readiness",
    "graceful_shutdown": "docker stop returned in 0.104s, exit 0, stop events logged",
    "temp_hygiene": "/tmp/rcap-render-scratch empty after run",
    "secret_scan": "image env, history, exported filesystem and shipped code clean",
    "source_sha_observable": "org.opencontainers.image.revision label applied at build time",
    "uncommitted_file_dependency": "none - built from git archive of the commit"
  },
  "image_repository": "ghcr.io/roger-legalease/rcap-render-worker",
  "tag_policy": "full 40-hex source SHA only; no latest tag ever",
  "workflow_path_expected": ".github/workflows/rcap-worker-ghcr-publish.yml",
  "workflow_exists": false,
  "publication_blockers": [
    "captain-owned GHCR workflow absent from the repository",
    "GHCR_PUBLICATION_CLEARED block with FINAL_ACCEPTED_SHA not yet supplied"
  ]
}
```

## What determines the image bytes (proven from the Dockerfile)

The Dockerfile copies exactly: `package.json` + `package-lock.json` (deps
stage), then `package.json`, `tsconfig.json`, `scripts/rcap-render-worker.mjs`,
`scripts/lib/`, `src/` (runtime stage). Nothing else in the repository can
change the image. Documentation, `data/` ledgers and crosswalk files never
enter it — but `package.json` does, and it changed between `abbc48a` and
`13e356c` (phase-52 script registrations), so the digest must always be
minted from the exact accepted SHA, never assumed equal across "docs-only"
integration commits without checking these paths.

## Required captain-owned workflow (absent — exact correction for A)

No image workflow exists on any branch (repository workflow registry lists
only the two verification workflows on `main` plus two branch-side
verification workflows). A must land
`.github/workflows/rcap-worker-ghcr-publish.yml` with exactly these
invariants; this lane will verify the bytes before dispatching:

- `on: workflow_dispatch` only, with one required input `source_sha`
  validated against `^[0-9a-f]{40}$`
- `permissions: { contents: read, packages: write }`
- `actions/checkout` with `ref: ${{ inputs.source_sha }}` (exact-SHA checkout)
- record `sha256sum deploy/rcap-render-worker/Dockerfile package-lock.json`
  in the log
- build from `deploy/rcap-render-worker/Dockerfile` with labels
  `org.opencontainers.image.revision=${{ inputs.source_sha }}` and
  `org.opencontainers.image.source=https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean`
- push exactly one tag:
  `ghcr.io/roger-legalease/rcap-render-worker:${{ inputs.source_sha }}`
- never tag or move `latest`; no deploy step; no worker-start step; no
  staging or production mutation
- print the pushed digest (`docker buildx imagetools inspect`) as the final step

## Prepared publication sequence (do not run before the gate)

1. **Verify the clearance block against the repository:**
   - `git fetch origin` then confirm `FINAL_ACCEPTED_SHA` is the current tip
     of the named canonical integration branch and is 40 hex chars.
   - `git show <SHA>:deploy/rcap-render-worker/Dockerfile | sha256sum` and
     `git show <SHA>:package-lock.json | sha256sum` must equal the block's
     hashes.
   - Workflow bytes at the dispatch ref must hash to `WORKFLOW_SHA256`.
   - Required GitHub checks green on `<SHA>`; Terminal B re-audit green.
2. **Trigger** (GitHub Actions API; no credentials stored in this repo):
   dispatch `rcap-worker-ghcr-publish.yml` on the ref that carries the
   workflow file, with input `source_sha=<FINAL_ACCEPTED_SHA>`.
3. **Observe to completion:** poll the run until `status=completed`; require
   `conclusion=success`. A queued or running workflow is not success.
4. **Read the digest** from the run's final step; confirm independently with
   `docker buildx imagetools inspect ghcr.io/roger-legalease/rcap-render-worker:<SHA>`.
5. **Confirm tag hygiene:** the package has the full-SHA tag and no `latest`.
6. **Pull by digest:**
   `docker pull ghcr.io/roger-legalease/rcap-render-worker@sha256:<digest>`
   and verify the pulled digest matches.
7. **Runtime verification of the pulled image:** unconfigured start exits 2;
   with env, healthcheck reaches healthy and the polling banner appears;
   `docker stop` exits 0 sub-second with stop events; image env/history/
   filesystem secret scan clean;
   `org.opencontainers.image.revision` equals `<FINAL_ACCEPTED_SHA>`.
8. **Record evidence** (workflow run ID, SHA, hashes, repository, tag,
   digest, visibility, pull/health/shutdown/secret results, statement that
   no deployment occurred) in this lane's evidence file, one atomic commit.
9. The future staging worker host needs only GHCR **read** permission on the
   package (`packages: read` via an org token or a deploy-scoped PAT).

## Sandbox caveat for the local proof build

The sandbox build required a Docker Hub mirror and a locally-injected proxy
CA (visible as `NODE_EXTRA_CA_CERTS` in the local image config). Those
scaffolds live outside the repository; the repository Dockerfile built
byte-for-byte unmodified. The local image is proof of buildability and
runtime behavior only — the publishable bytes are produced by the GitHub
runner, which needs no such scaffolding.

## Workflow verification and start-condition audit (2026-08-11, second pass)

The captain-owned workflow now exists at
`.github/workflows/publish-rcap-render-worker.yml` on the canonical
integration branch (verified at tip `d6310fd`), sha256
`53a746405b5405651fe3fc259ea2a2acafb22b112065e5231506161a4ee43f0f`. Byte-level audit: every required
invariant holds — `workflow_dispatch` only with a full-40-hex-validated
`integration_sha` input, ancestry check against the canonical integration
branch, exact-SHA detached checkout, `contents: read` / `packages: write`,
canonical Dockerfile, exactly one full-SHA tag, explicitly no `latest`,
digest output with a hard failure when the registry returns none, input
hashes recorded, a machine-readable publication artifact, per-SHA
concurrency guard, and no deploy / worker-start / staging / production
step. (It relies on tag + artifact + ancestry for source-to-digest
correspondence rather than an OCI revision label — acceptable; noted.)

Publication remains blocked by the start condition, audited in this order:

1. **`WORKER_SOURCE_FREEZE_SHA` is not declared** anywhere on the
   integration tip, in tags, or in any remote branch — Terminal A2 declares
   it after integrating B/E/F per the lane plan.
2. **No image-input fingerprint is published** to verify against.
3. **The workflow is not dispatchable yet**: the GitHub API returns 404 for
   its runs because `workflow_dispatch` workflows register only from the
   default branch. `.github/workflows/publish-rcap-render-worker.yml` must
   land on `main` before any dispatch can happen, regardless of clearance.

On declaration this lane verifies the freeze SHA is in canonical ancestry,
re-hashes Dockerfile/lockfile/workflow at that SHA against the published
fingerprint, dispatches with the full SHA, observes to completion, records
the digest from the publication artifact, pulls by digest, and runs the
startup/health/readiness/shutdown/secret battery on the pulled image.

## Owner authorization received (2026-08-11)

Roger authorized `ghcr.io/roger-legalease/rcap-render-worker` as the private
canonical RCAP worker image registry, publication-only: the grant covers
building and publishing the image from the exact `WORKER_SOURCE_FREEZE_SHA`
declared by Terminal A after local verification and required GitHub checks
are green. It does not authorize worker deployment, migration application,
staging feature enablement, production changes, or the nationwide launch.

Authorization status accordingly moves from missing to granted. Remaining
blockers, re-audited at this timestamp (integration tip still `d6310fd`):

1. `WORKER_SOURCE_FREEZE_SHA` — still undeclared; Terminal A/A2 declares it
   after B/E/F integrate and checks are green.
2. Workflow registration — `main` (at `2dced50`) still carries only the two
   verification workflows; `.github/workflows/publish-rcap-render-worker.yml`
   must land on the default branch before GitHub will accept any dispatch.

This lane holds armed: on declaration it verifies ancestry and fingerprints,
dispatches, observes to success, and returns the immutable digest with
pull-by-digest and runtime proof — publication only, no deployment.

## Freeze verification complete — dispatch attempted (2026-08-12)

`WORKER_SOURCE_FREEZE_SHA` declared as `5987870c`, resolved to full SHA
`5987870ca0d70ea4437d0711c430b9eda299a0ef`, verified as the tip of and
contained in `origin/claude/rcap-final-sprint-integration`.

From a clean detached worktree at that exact SHA (0 dirty files), the
repository's own fingerprint verifier ran green:
`node scripts/verify-rcap-image-input-fingerprint.mjs` — "all seven
image-input hashes independently recomputed and matching; base 763bb42e…
is image-input-equivalent to HEAD; securityCheckpointSha is not the build
source; the record survives generator --check."

The seven verified image-input hashes (from `data/rcap-staging-action.json`,
independently recomputed by the verifier):

| Input | Hash |
|---|---|
| package.json | `ee2b9fcdf7be28c228e72c4a4f3349d336698ea2b2e70f61399556c6b737c65e` |
| package-lock.json | `fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7` |
| tsconfig.json | `f096fb57605f57b18db33441a4b4b85901e1ad816183a87d6d8dc086f7e088b5` |
| scripts/rcap-render-worker.mjs | `e021e936bb677ea98283823bc0a1ac3ad7295a8d61b2fd21635feda718020b70` |
| deploy/rcap-render-worker/Dockerfile | `6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7` |
| scripts/lib (git tree) | `e8f80d8b59b889061363f4ea24d3d4f8c30b129c` |
| src (git tree) | `6ae7362894fe118ce9ac231f7ef8913e3cb7feee` |

Workflow bytes at the freeze SHA still hash to the audited
`53a746405b5405651fe3fc259ea2a2acafb22b112065e5231506161a4ee43f0f`.

Dispatch was then attempted with the full SHA against
`publish-rcap-render-worker.yml` on the integration branch: the GitHub API
returned **404** — the workflow has never existed on the default branch, so
GitHub has not registered it and rejects all dispatches by construction.
This is the single remaining blocker, unchanged since first reported:
**the workflow file must land on `main`** (its exact bytes; the ancestry
guard inside it already refuses any SHA outside the canonical integration
branch, so landing it early authorizes nothing by itself). The moment it is
registered, this lane dispatches `integration_sha=5987870ca0d70ea4437d0711c430b9eda299a0ef`
and completes digest, pull-by-digest, and runtime proof.

## PUBLICATION COMPLETE (2026-08-12) — immutable digest recorded

```json
{
  "environment": "publication-only",
  "publicationTimestamp": "2026-08-12T02:29:47Z",
  "workflowRunId": 31556968201,
  "workflowRunUrl": "https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/31556968201",
  "workflowConclusion": "success",
  "mainRegistrationSha": "0e8c21d3f03fff725c99860a1e4b122dad2f6b06",
  "workflowSha256": "53a746405b5405651fe3fc259ea2a2acafb22b112065e5231506161a4ee43f0f",
  "sourceSha": "5987870ca0d70ea4437d0711c430b9eda299a0ef",
  "dockerfilePath": "deploy/rcap-render-worker/Dockerfile",
  "dockerfileSha256": "6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7",
  "lockfileSha256": "fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7",
  "imageRepository": "ghcr.io/roger-legalease/rcap-render-worker",
  "imageTag": "5987870ca0d70ea4437d0711c430b9eda299a0ef",
  "immutableRegistryDigest": "sha256:337083a25988b10a677813c3c8034461bfe18ffe1d2dd6a942a4d97235c3b64d",
  "digestPinnedReference": "ghcr.io/roger-legalease/rcap-render-worker@sha256:337083a25988b10a677813c3c8034461bfe18ffe1d2dd6a942a4d97235c3b64d",
  "packageVisibility": "private",
  "mutableLatestTagCreated": false,
  "publishOnlyNoDeploy": true,
  "workerClaimingStarted": false,
  "stagingAndProductionUnchanged": true,
  "pullByDigestFromThisSandbox": "unauthorized (private package; no packages:read credential exists here by design)",
  "stagingHostPullRequirement": "a GHCR token with packages:read on rcap-render-worker",
  "runtimeProofAtFreezeInputs": {
    "unconfiguredStartup": "exit 2 with clear config error",
    "liveness": "health=healthy after first HEALTHCHECK interval",
    "readiness": "polling banner; queue-age check is the operational readiness signal",
    "gracefulShutdown": "docker stop returned in 0.091s, exit 0, stop events logged",
    "tempHygiene": "/tmp/rcap-render-scratch empty",
    "secretScan": "no unexpected env vars beyond the sandbox CA marker; zero .env/.pem/.key/credentials files"
  }
}
```

Chain of proof for source-to-digest correspondence:

1. `WORKER_SOURCE_FREEZE_SHA=5987870ca0d70ea4437d0711c430b9eda299a0ef`
   verified in canonical ancestry; the repository's fingerprint verifier ran
   green from a clean checkout at that SHA, independently recomputing all
   seven image-input hashes.
2. The workflow (bytes on `main` at `0e8c21d3` hash-identical to the freeze
   SHA's copy, `53a74640…`) validated the full SHA, proved canonical
   ancestry on the runner, detached to the exact SHA, and recorded
   Dockerfile/lockfile hashes that match the fingerprint record and this
   lane's independent computation exactly.
3. The runner built and pushed exactly one full-SHA tag and the registry
   minted `sha256:337083a2…` (OCI manifest digest, linux/amd64), captured
   in both the run log and the uploaded publication artifact
   (artifact 9126345943, zip sha256 `b9d77e91…`).
4. Runtime behavior of those exact build inputs proven by the local
   clean-checkout battery above. Pull-by-digest re-verification of the
   registry bytes is one command wherever a `packages:read` credential
   exists (the future staging host requirement) — this sandbox correctly
   holds none, and the artifact-blob CDN is likewise egress-blocked here.

No deployment occurred; no worker was started; no claiming was enabled;
staging and production are unchanged. The digest above is the input
Terminal A3 needs for the staging authorization block.

## FINAL MAIN PUBLICATION COMPLETE (2026-08-16)

The replacement worker image for final merged `main` was published once by
workflow run [31965540347](https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/31965540347).
The workflow ran from commit
`99193e3e4562b17e3c36a6158eee1b60d4e0291d`, validated that the exact image
source `664b8ddd374642bf2bd1820f7e05224f3dd081bc` belongs to `main`, checked out
that source, and completed every publication step successfully.

```json
{
  "environment": "publication-only",
  "publicationTimestamp": "2026-08-16T18:47:27Z",
  "workflowRunId": 31965540347,
  "workflowConclusion": "success",
  "workflowCommitSha": "99193e3e4562b17e3c36a6158eee1b60d4e0291d",
  "workflowSha256": "0f55ac64510bcf3bd69c08649f22b7c4e5ff05cfd992787e49e66e261e761495",
  "sourceSha": "664b8ddd374642bf2bd1820f7e05224f3dd081bc",
  "canonicalIntegrationBranch": "main",
  "dockerfileSha256": "6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7",
  "lockfileSha256": "fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7",
  "publicationArtifactId": 9268400752,
  "publicationArtifactArchiveSha256": "56cc93ddeff568ba550a53cc5d9785b63222d814a1ecb6db3997df3ec825edd5",
  "publicationArtifactJsonSha256": "811ef949aff3b77099fe97c4a6dfad82bf13be2dc4aaa9c46afa7fb2ec3dae53",
  "imageRepository": "ghcr.io/roger-legalease/rcap-render-worker",
  "imageTag": "664b8ddd374642bf2bd1820f7e05224f3dd081bc",
  "immutableRegistryDigest": "sha256:e958cb057abaa1c22902d01ffe0e42aec0feb09118ba9f2bc44210cbdeb244c7",
  "digestPinnedReference": "ghcr.io/roger-legalease/rcap-render-worker@sha256:e958cb057abaa1c22902d01ffe0e42aec0feb09118ba9f2bc44210cbdeb244c7",
  "packageVisibility": "private",
  "mutableLatestTagCreated": false,
  "publishOnlyNoDeploy": true,
  "workerClaimingStarted": false,
  "stagingAndProductionUnchanged": true
}
```

Independent registry proof pulled the image by its immutable digest and pulled
the full-SHA tag to the same digest. Anonymous manifest access was denied, and
the repository has no `latest` manifest. The pulled image runs as
`rcapworker`, uses the expected loop command and healthcheck, and fails closed
when Supabase configuration is absent. Against an isolated host-only mock with
no real queue, it reached `healthy`, emitted the polling banner, accepted
`SIGTERM`, logged both stop events, and exited 0 in 211 ms. The scratch
directory remained empty, and image environment, history, and sensitive-file
scans found no embedded credential material.

This publication did not deploy the image, start a worker against any real
queue, enable claiming, apply a migration, or change staging or production.
The canonical machine-readable record is
`data/rcap-render/worker-publication-evidence.json`; the staging-action record
binds this exact digest without authorizing deployment.
