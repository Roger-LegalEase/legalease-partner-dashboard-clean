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
