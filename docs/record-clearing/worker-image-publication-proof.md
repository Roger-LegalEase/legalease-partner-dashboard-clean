# Worker Image Publication Proof — build proven, publication blocked on registry

Lane-owned evidence for the staging execution gate's image-digest requirement
(`docs/RCAP_STAGING_REHEARSAL_PLAN.md` step 2). This records a reproduced
clean build of the render worker container at the integration tip, the
runtime and secret verification of that exact image, and the single owner
action that stands between here and an immutable registry digest.

## Source identity

| Item | Value |
|---|---|
| Source commit | `abbc48a19f79a817a4e14d4350297a9a753dbc05` (`origin/claude/rcap-final-sprint-integration` tip at proof time) |
| Dockerfile | `deploy/rcap-render-worker/Dockerfile`, sha256 `6079456600e00d9929f9d899b6e5c1be6919bbe844e44f2aba456f5036b9daa7` |
| Lockfile | `package-lock.json`, sha256 `fc0208973470f108d82dc3defa99647fe1ee01c43a7bea5302487368ae36aae7` |
| Build context | clean `git archive` checkout of the source commit (no working-tree files) |
| Build command | `docker build -f deploy/rcap-render-worker/Dockerfile -t rcap-render-worker:<git-sha> .` |
| Local image ID | `sha256:76ff7b20b91ba6e2ddba65d4fbe459482e0e61da3896be5e9255e8874ddd9cab` — a **local image ID, not a registry digest**; the gate requires the digest a registry mints on push |

## What determines the image bytes

The Dockerfile copies exactly `package.json`, `package-lock.json`,
`tsconfig.json`, `scripts/rcap-render-worker.mjs`, `scripts/lib/`, and
`src/` (plus the `node:22-slim` base). Therefore:

- **Crosswalk and documentation changes do not affect image bytes.** The
  canonical crosswalk artifacts (`docs/record-clearing/track-pathway-crosswalk.md`,
  `data/rcap-ledger/*.json`) and everything else under `docs/` and `data/`
  never enter the image.
- **Any change under `src/`, `scripts/lib/`, the entrypoint, `tsconfig.json`
  or the package manifests changes the image.** `src/lib/rcap/render/job-contract.ts`
  already changed between `e078a87f` and this tip (phase-51
  `consumer_payment_required` accounting value), so if final E3 integration
  lands further such changes, **the publishable digest must be minted from a
  rebuild at A's final integration SHA** — the build below proves the
  pipeline, not the final bytes.

## Runtime verification of the built image (this exact image ID)

| Check | Result |
|---|---|
| Production start command | `CMD ["node", "scripts/rcap-render-worker.mjs", "--loop"]`, `USER rcapworker` (non-root), HEALTHCHECK present — confirmed in image config |
| Config fail-fast | started with no Supabase env: clear one-line error, exit 2 |
| Liveness | with env set: container reaches `health=healthy` after the first HEALTHCHECK interval |
| Readiness | worker emits its polling banner and enters the claim loop; there is deliberately no inbound readiness endpoint — operational readiness is the queue-age check in `docs/RCAP_RENDER_WORKER_DEPLOYMENT.md` |
| Graceful shutdown | `docker stop -t 15` returned in 0.067s, exit code 0, with `worker_stop_requested` / `worker_stopped` JSON events logged |

## Secret scan of the built image

| Surface | Result |
|---|---|
| Image config env | no credential-bearing variables |
| Build history | the only `key`-matching layers are the upstream Node/Yarn base layers importing their public release-signing GPG keys |
| Filesystem (full `docker export` listing) | no `.env*`, `.pem`, `.key`, or credentials files outside `node_modules` |
| Shipped app code | no JWTs or live/test key material; the only match is Stripe key **prefix checks** in `src/lib/stripe/server.ts` |

Builds run with no secrets present on the build machine, so nothing secret
can be baked in by construction — consistent with the deployment spec's
"production secrets never exist on a build machine".

## Sandboxed-build caveat

The proof build ran in a network-sandboxed environment that required two
scaffolds that must not ship: the base image was pulled through a Docker Hub
mirror, and the sandbox's TLS-interception CA was injected via a local
shadow of the `node:22-slim` tag (visible as `NODE_EXTRA_CA_CERTS` in the
local image env). The repository Dockerfile itself built **unmodified**.
The publishable image must therefore be built on a machine with ordinary
egress (or CI) using the same commands — which is also where the registry
credential lives.

## Canonical registry determination

No canonical registry exists yet: the repository names none (no registry
reference in code, docs, or CI; no image-building workflow in
`.github/workflows/`), this environment holds no registry credential
(no docker logins, no registry tokens), and `data/rcap-authorization-queue.json`
— the policy artifact for production-touching actions — contains no
publication grant. The deployment spec records the vendor/account choice as
the one remaining deployment decision. Inventing a registry here would be a
production naming decision this lane is not authorized to make.

**Recommended default, pending Roger's confirmation:**
`ghcr.io/roger-legalease/rcap-render-worker` (same GitHub org that owns the
source; GHCR packages support immutable digests and org-scoped private
access).

## Prepared publication runbook (blocked on one owner action)

Run on a machine with normal egress and the registry credential, at the
final integration SHA `<SHA>`:

```bash
git clone https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean src && cd src
git checkout <SHA>
docker build -f deploy/rcap-render-worker/Dockerfile -t <REGISTRY>/rcap-render-worker:<SHA> .
docker login <REGISTRY>            # credential from Roger's secret store
docker push <REGISTRY>/rcap-render-worker:<SHA>
# The push output's `digest: sha256:...` line is the immutable digest the
# staging gate requires. Confirm and verify pull-by-digest:
docker buildx imagetools inspect <REGISTRY>/rcap-render-worker:<SHA>
docker pull <REGISTRY>/rcap-render-worker@sha256:<DIGEST>
docker run --rm <REGISTRY>/rcap-render-worker@sha256:<DIGEST>   # expect exit 2 + config error (no env): proves start
```

Record the digest as `RCAP_WORKER_CONTAINER_DIGEST` for the staging deploy
per `docs/RCAP_RENDER_WORKER_DEPLOYMENT.md`.

**Exact blocker:** no canonical registry target or push credential exists.
**Owner action (Roger):** name the canonical staging registry (or confirm
`ghcr.io/roger-legalease/rcap-render-worker`) and provision one push
credential for it. Everything else above is proven and prepared.
