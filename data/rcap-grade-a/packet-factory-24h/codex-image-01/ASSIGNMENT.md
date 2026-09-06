# CODEX-IMAGE-01 — rebuild and smoke-test the render-worker image on the integrated snapshot

You are a Codex Cloud task for the LegalEase RCAP Grade-A launch. You are not the Captain and you integrate nothing. Repository `Roger-LegalEase/legalease-partner-dashboard-clean`. Create branch `codex/image-01-render-worker` from commit `85e9d69e851705b43b1a73b93db6158e40bb02ea` on `claude/legalease-sprint-captain-utucnw` (never from `main`), push only that branch, write one return file. Never rebase, force-push, push to `main` or the Captain branch, or open a pull request. Never `git add .`, `-A` or `--all`. Read `data/rcap-grade-a/packet-factory-24h/codex-image-01/ASSIGNMENT.json` at the Captain branch tip first (its `captainBaseSha` must be the commit you branched from; stop if not), then `AGENTS.md`.

## What already exists (do not redo, do not claim)

A Claude lane (DEL-D, integrated at e3fa459e2) traced the worker's read-only runtime data (67 files, 10.6 MB, `deploy/rcap-render-worker/runtime-data-manifest.json`, built by `deploy/rcap-render-worker/build-runtime-data-manifest.mjs`), wrote `Dockerfile.dockerignore`, `preflight.mjs` and `IMAGE_BUILD_RECORD.json`, built image `sha256:1e3eebe5…` on base cba72cf5a and ran the preflight inside that container. That snapshot predates the participant renderer (DEL-A, 0fcedd773) and the sponsored migration (DEL-B, 7307b0e34), and no render ran inside the container. That image must not be claimed to contain this work.

## Your outcome

An image built from your base commit, carrying exactly the traced read-only runtime data (registry, observation, specifications, dependency JSON — no `data/` wholesale, no `private/`, no secrets, no test-authority fixtures), its input fingerprint regenerated and verified, and an in-container smoke test reported in three separate stages:

1. **startup / import / assets** — `docker run --rm --network none <image> node deploy/rcap-render-worker/preflight.mjs` (file digests, module graph);
2. **authority gate** — every record in `data/rcap-grade-a/fulfillment-authority-registry.json` evaluated inside the container with a reasoned decision;
3. **render attempt** — `il-prostitution-j-vacate-set` through `composeParticipantDeliveryPacket` (`src/lib/rcap/grade-a/participant-packet.ts`) for two synthetic participants, inside the container, against a disposable local PostgreSQL and filesystem storage (see `scripts/test-rcap-il-delivery-ephemeral.mjs` for the harness). A refusal here (for example `composer.ts` refusing the Mississippi routes on `approved_shipping_component`) is reported as a stage-3 failure with the exact message; it is never folded into stages 1–2.

## Steps

- `docker info` first. If this environment cannot build and run containers, do everything up to the build (manifest regeneration, Dockerfile, `.dockerignore`, fingerprint regeneration, a build+smoke script the Captain can run) and record `dockerAvailable: false` and `stages.*.ran: false`; the Captain executes the build in the authorized build-capable environment. A test run from the source checkout is not an image smoke test and must not be reported as one.
- Regenerate the manifest with the existing script and reconcile it with the import graph after DEL-A (new modules under `src/lib/rcap/grade-a/families/**`, `scripts/lib/il-prostitution-j-vacate-composition.mjs`, anything `scripts/rcap-render-worker.mjs` now reaches). Package only what the worker reads at runtime.
- Regenerate `data/rcap-staging-action.json` `imageInputs` with `scripts/generate-rcap-staging-action.mjs` and make `node scripts/verify-rcap-image-input-fingerprint.mjs` pass on your snapshot (it has been stale since 3285b660).
- `docker build -f deploy/rcap-render-worker/Dockerfile -t rcap-render-worker:codex-image-01 .` where docker exists (base `node:22-slim`; Docker Hub blobs may be blocked, `mirror.gcr.io/library/node:22-slim` retagged worked before). Record image ID and digest. Do not push the image anywhere.
- `npx tsc --noEmit -p .` must stay green.

Writable: `deploy/rcap-render-worker/**`, `data/rcap-staging-action.json` (generator only), `data/rcap-grade-a/packet-factory-24h/codex-image-01/RETURN.json`. Everything else is read-only: if `scripts/rcap-render-worker.mjs` or application code needs a change to run from the packaged layout, report the exact change in the return instead of making it. No approval record edited; no unapproved digest bound as approved; no hosted or Production step.

## Return

`data/rcap-grade-a/packet-factory-24h/codex-image-01/RETURN.json` with the shape in ASSIGNMENT.json `returnLocation` (dockerAvailable, filesPackaged, manifestSha256, imageId, imageDigest, fingerprintVerifier, stages {preflight, authority, render} each {ran, command, exitCode, outputTail}, notDone, productionTouched false, routesOpened 0). Commit it with your changes, commit by file name, push `codex/image-01-render-worker`. In the final message: pushed SHA, docker available yes/no, image ID or exact build failure, the three stage results separately, anything not done.
