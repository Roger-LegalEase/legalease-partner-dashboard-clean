# BLOCKER-1 — Worker republication runbook (non-production)

Lane J. **Nothing here has been run.** No image was built, published, tagged,
pulled or deployed. No workflow was dispatched. Production was not touched.

This is the runbook plus the exact authorization that must exist before anyone
runs step 6.

---

## 1. What is actually red, and why

`node scripts/verify-rcap-worker-publication-workflow.mjs` fails on one child
check, `scripts/verify-rcap-image-input-fingerprint.mjs`:

```
  - package.json hashes to 77d33f078ed7…, fingerprint records e012497a859a…
  - scripts/lib/ at HEAD is e45510bec104…, fingerprint records 5188836468b3…
  - src/ at HEAD is a05e14d930ed…, fingerprint records ae331d677496…
  - HEAD differs from the fingerprint base 67a0a789 on image-input paths: … (180+ paths)
  - the staging action does not survive its own generator --check
```

The published image is bound to source SHA
`441ee3188ee52047a012232d8d11f890a09b4ac5`, published 2026-08-25T13:57:59Z. The
image-input fingerprint in `data/rcap-staging-action.json` was taken at base
`67a0a7895dcc9e1ddb55bdf8e7cbc764aed5a27a`. Both predate the current head. The
image no longer corresponds to the source it would be run against — so the
blocker is republication, not a bug.

`imageInputEquivalenceRequired` is `true`, and the rule is stated in the record:

> `git diff --quiet {imageInputFingerprintBaseSha} HEAD -- package.json package-lock.json tsconfig.json scripts/rcap-render-worker.mjs scripts/lib src deploy/rcap-render-worker/Dockerfile` must exit 0; a commit that changes any image-input path invalidates this fingerprint and requires regeneration.

### Which inputs actually moved

Measured at base `148382ab`, against the recorded fingerprint:

| Input | Fingerprint | At `148382ab` | Moved |
|---|---|---|---|
| `package.json` | `e012497a…50eea` | `77d33f07…b37d7` | **yes** |
| `package-lock.json` | `fc020897…6aae7` | `fc020897…6aae7` | no |
| `tsconfig.json` | `f096fb57…88b5` | `f096fb57…88b5` | no |
| `scripts/rcap-render-worker.mjs` | `e021e936…20b70` | `e021e936…20b70` | no |
| `deploy/rcap-render-worker/Dockerfile` | `60794566…daa7` | `60794566…daa7` | no |
| `scripts/lib/` (tree) | `5188836468b3…` | `e45510bec104…` | **yes** |
| `src/` (tree) | `ae331d677496…` | `a05e14d930ed…` | **yes** |

Three of seven. Notably the lockfile and the Dockerfile are unchanged, so the
rebuild's dependency layer should be cache-identical; the application layer is
what moves.

## 2. Exact candidate source SHA prerequisite

The candidate SHA is **not** `148382ab2a2acbe673b6d35c8967f5a908342e60`, and it
is not chosen by this lane. It is:

> the exact 40-character integration commit on which the release is cut,
> after Lane J's decision packets have been dispositioned by the captain and
> whatever code changes follow are merged.

Publishing before that means republishing again, which is what the five
superseded publications in `data/rcap-render/worker-publication-evidence.json`
each record:

| Source SHA | Digest | Publication run | Disposition |
|---|---|---|---|
| `441ee318…` | `sha256:67132df2…` | 32856262198 | **current accepted** |
| `7cc8675d…` | `sha256:6bc20972…` | 32850336907 | superseded_by_source_drift |
| `daddfa04…` | `sha256:42fec914…` | 32844735030 | superseded_by_source_drift |
| `cd2d46a4…` | `sha256:6e0…` | 32838819932 | superseded_by_source_drift |
| `f30f9e88…` | `sha256:631…` | 32837037182 | superseded_by_source_drift |
| `5ac0d8d6…` | `sha256:4e5b58e4…` | 32307070302 | superseded_by_source_drift |

The workflow enforces two hard prerequisites on whatever SHA is chosen:

- **Full 40 hex characters.** An abbreviated SHA is rejected before anything is
  fetched: *"an abbreviated SHA could let two commits share one alias, so it is
  refused before any lookup."*
- **Contained in `main` OR in the exact branch named by
  `RELEASE_INTEGRATION_BRANCH`** (currently
  `sprint/20260825-full-product-captain`). No wildcard, no pattern, no runtime
  input. A SHA on any other branch is refused, and which branch contained it is
  recorded in the publication evidence.

The second is worth flagging to the captain: the release-integration branch is
pinned by literal name in the workflow. If this sprint's release integrates on a
different branch, `RELEASE_INTEGRATION_BRANCH` must be updated in
`.github/workflows/publish-rcap-render-worker.yml` **before** dispatch, and that
is a captain-owned workflow edit, not something to work around at dispatch time.

## 3. Required green checks before publication

On the exact candidate SHA:

- `node scripts/verify-rcap-image-input-fingerprint.mjs` — green, which requires
  `data/rcap-staging-action.json` to have been regenerated at the candidate SHA
  (see step 3 below).
- `node scripts/generate-rcap-staging-action.mjs --check` — green.
- `node scripts/verify-rcap-worker-publication-workflow.mjs` — green.
- `node scripts/verify-rcap-worker-tag-guard.mjs` — currently green (10/10).
- `node scripts/test-rcap-worker-tag-guard-mutations.mjs`
- `node scripts/test-rcap-image-fingerprint-mutations.mjs` — currently green
  (11/11).
- `node scripts/verify-rcap-render-worker-runtime.mjs`
- `node scripts/verify-rcap-render-worker-delivery.mjs` — currently green.
- `node scripts/verify-rcap-worker-source-binding-exception.mjs` — currently
  green; it reports "no source-binding exception is in force" and that "future
  publications record `org.opencontainers.image.revision`, so the next image
  needs no exception."
- `npm test` on the candidate SHA.

Note the deadlock the workflow documents and deliberately breaks: `npm test`
includes the staging-action gate, which does not pass until a worker is
published for the current image inputs. That is why the workflow accepts a SHA
contained in the release branch and not only one already merged to `main`. Do
not resolve it by overriding a check or merging over red.

## 4. Image repository, tag, digest

| | |
|---|---|
| Repository | `ghcr.io/roger-legalease/rcap-render-worker` |
| Dockerfile | `deploy/rcap-render-worker/Dockerfile` |
| Tag | `<candidate_sha>` — the full 40-character SHA, and nothing else |
| Mutable `latest` | **never created.** The workflow pushes exactly one tag. |
| Digest | `steps.build.outputs.digest`, `sha256:…` |
| Digest-pinned reference | `ghcr.io/roger-legalease/rcap-render-worker@sha256:…` |
| Package visibility | private |

**Source-SHA tag treatment.** The workflow's own concurrency comment is the
governing statement and should not be softened in any evidence record:

> "the source-SHA tag is an ALIAS, not an immutable object. Calling it immutable
> is what let two publications of 664b8ddd move it. Only the sha256: digest is
> immutable."

The tag is therefore a convenience for humans. Every downstream binding — the
staging action's `WORKER_IMAGE_DIGEST`, the acceptance workflow, the Preview
host — takes the digest.

## 5. Build command

Not a local `docker build`. The build is the workflow's
`docker/build-push-action@v6` step, and reproducing it by hand would produce a
digest no evidence record can point at. For reference, the step is:

```yaml
- name: Build and push by source-SHA tag only
  id: build
  uses: docker/build-push-action@v6
  with:
    context: .
    file: deploy/rcap-render-worker/Dockerfile
    push: true
    tags: ghcr.io/roger-legalease/rcap-render-worker:<candidate_sha>
    labels: |
      org.opencontainers.image.revision=<candidate_sha>
      org.opencontainers.image.source=https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean
      org.opencontainers.image.version=<candidate_sha>
    provenance: false
    sbom: false
```

### SBOM and provenance evidence

`provenance: false` and `sbom: false`. **No SBOM and no SLSA provenance
attestation is produced**, and none should be claimed in any evidence record.
What stands in their place:

- **OCI revision label.** `org.opencontainers.image.revision` binds the image to
  its source commit from inside the image, so the binding does not rest solely
  on a JSON file this repository wrote about itself. Images published before
  this label was added carry no revision and needed the compensating control in
  `data/rcap-render/worker-source-binding-exception.json`; that exception is not
  in force and the next image does not need one.
- **Image-input fingerprint.** The seven pinned inputs in
  `data/rcap-staging-action.json` constrain what a build at the freeze SHA would
  copy.
- **Acceptance workflow evidence.** Per §8.

Turning on `sbom`/`provenance` would be an improvement and is worth raising —
but it changes the published artifact's shape and the digest, so it is a
separate decision, not something to enable inside a republication.

## 6. Workflow name and invocation

**Workflow:** `Publish RCAP render worker` —
`.github/workflows/publish-rcap-render-worker.yml`. Manual only
(`workflow_dispatch`), captain-owned. Permissions `contents: read`,
`packages: write`. Concurrency group
`publish-rcap-render-worker-<integration_sha>`, `cancel-in-progress: false`.

Inputs:

| Input | Value |
|---|---|
| `integration_sha` | the exact 40-character candidate SHA |
| `tag_replacement_authorization` | **leave empty** |

Leave `tag_replacement_authorization` empty. It exists only to deliberately move
an existing full-SHA tag, and using it to get past a refusal is the failure mode
the guard was built after.

The workflow header states what it does and does not do, and it should be quoted
into the authorization request verbatim:

> "This workflow PUBLISHES AN IMAGE AND NOTHING ELSE. It does not deploy the
> worker, does not start claiming, and touches neither staging nor production."

## 7. Pre-publication read-only checks and duplicate-tag refusal

**Read-only preflight, before dispatch:**

1. `git rev-parse <candidate_sha>` resolves, and the SHA is contained in `main`
   or in `RELEASE_INTEGRATION_BRANCH`.
2. All of §3 green on that exact SHA.
3. `data/rcap-staging-action.json` regenerated at the candidate SHA, with
   `imageInputFingerprintBaseSha` equal to it, and
   `node scripts/generate-rcap-staging-action.mjs --check` green.
4. `RCAP_WORKER_TAG=<candidate_sha> GHCR_TOKEN=… node scripts/verify-rcap-worker-tag-integrity.mjs --resolve`
   — read-only. Confirms whether the tag already exists.
5. Confirm the package is still private.

**Duplicate-tag refusal.** The workflow runs
`verify-rcap-worker-tag-integrity.mjs --guard` **twice** — once before the build
and again immediately before the push — because a preflight cannot see a push
that has not happened yet. The guard's behaviours, all currently green (10/10):

- exactly one source-SHA tag is pushed, and no `latest`;
- a short SHA is refused;
- a missing credential fails closed — *"'cannot see' must never read as 'free'"*;
- a registry that refuses or is unreachable exits non-zero rather than
  proceeding;
- an existing `latest` alias refuses publication outright;
- an existing source-SHA alias can only be moved by an explicitly named
  `replace-<sha>` authorization.

**If the tag already exists, stop.** Do not pass a replacement authorization to
get past it. An existing tag means either the image was already published for
this SHA — in which case republication is unnecessary — or something moved that
needs explaining first.

## 8. Post-publication verification

1. **Fail-if-no-digest.** The workflow fails the run if the registry returned no
   digest: *"A local image ID is not acceptable evidence."*
2. **Capture the publication artifact.** The workflow emits
   `publication/rcap-render-worker-publication.json` and uploads it as
   `rcap-render-worker-publication-<candidate_sha>`. Import it into
   `data/rcap-render/worker-publication-evidence.json` rather than hand-writing
   the fields, exactly as the current record's `importedFrom` block did.
3. **Run `RCAP worker image acceptance`** —
   `.github/workflows/rcap-worker-image-acceptance.yml`. It is EXACT-HEAD and
   read-only: it takes the tag and digest from the **committed** publication
   evidence rather than typed inputs, because *"a typed digest can name an image
   the freeze record does not."* It pulls with credentials, proves the full-SHA
   tag resolves to the same digest, verifies the OCI revision equals the source
   SHA, runs the worker with **no Supabase configuration** so it cannot reach a
   queue or claim a job, and checks health, graceful SIGTERM shutdown, non-root
   ownership, a clean scratch directory, and a secret scan reporting paths and
   counts only. It builds, tags, pushes, deploys and claims nothing.
4. **Prove anonymous pull is refused.** The acceptance workflow's
   anonymous-pull step fails the run if GHCR ever issues an unauthenticated
   token for this repository. That is what re-proves private visibility per run;
   do not carry visibility forward as an assertion.
5. **Move the superseded record.** Push `441ee318…` /
   `sha256:67132df2…` into `supersededChain` with
   `disposition: "superseded_by_source_drift"` and a `why` naming the image-input
   paths that moved. Do not delete it and do not retag it — *"The prior digest
   remains unchanged in GHCR."*
6. **Update `releaseTruth`** to `imagePublished: true`, `imageAccepted: true`,
   and every deployment field still `false`.

## 9. Preview binding

The Preview host binds by **digest, never by tag**.

- Field: `WORKER_IMAGE_DIGEST` in
  `docs/rcap/staging-rehearsal/F0-EXECUTION-GATE-BLOCK.md`, currently blank —
  *"produced by that workflow at the final accepted SHA; host pulls with its own
  read:packages secret."*
- Set it to `sha256:<new digest>` from the publication artifact, only after
  acceptance (§8.3) is green.
- The host pulls with its own `read:packages` credential. The package stays
  private; no public pull is enabled.
- Verification at the host, from
  `docs/rcap/staging-rehearsal/F0-EXECUTION-COMMANDS.md`:
  `docker inspect --format '{{index .RepoDigests 0}}' rcap-render-worker:<SHA>`
  must equal `WORKER_IMAGE_DIGEST`.

Binding Preview to the tag instead of the digest would reintroduce exactly the
failure the workflow's no-`latest` rule exists to prevent: the thing that was
verified could stop being the thing that runs.

## 10. Rollback

**Target:** `ghcr.io/roger-legalease/rcap-render-worker@sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c`
(source SHA `441ee3188ee52047a012232d8d11f890a09b4ac5`, publication run
32856262198, acceptance run 32857155298). This is the currently accepted image
and it stays in GHCR unchanged.

**Invocation:** there is nothing to un-publish. Rollback is a **binding change,
not a registry change**:

1. Set `WORKER_IMAGE_DIGEST` back to `sha256:67132df2…` at the Preview host and
   restart the worker there.
2. Leave the new digest in the registry. Do not delete it, do not move its tag.
   `priorDigestsRemainInRegistry` is `true` by design, and a deleted digest
   destroys the evidence that a publication happened.
3. Record the reversal in `worker-publication-evidence.json` — the new digest
   moves to `supersededChain` with a `why` naming the actual failure, and
   `441ee318…` returns to the accepted position.

Because publication touches neither staging nor production, a rollback of a
*publication* is a no-op everywhere except a Preview binding that was explicitly
pointed at the new digest. That is the whole reason publish-only and deploy are
separate.

## 11. Exact authorization required before publication

Publication needs **Roger Roman**. It is not covered by AGENTS.md standing
permission, and `data/rcap-staging-action.json` lists "publication of the worker
image" in its `doesNotAuthorize` array.

The request must carry all of this, filled in, and nothing else:

> **Requested:** one dispatch of `Publish RCAP render worker`
> (`.github/workflows/publish-rcap-render-worker.yml`) with
> `integration_sha = <exact 40-char candidate SHA>` and
> `tag_replacement_authorization` empty.
>
> **Why:** the accepted image `sha256:67132df2…` was built from
> `441ee3188ee5…`. Three of the seven pinned image inputs have since moved —
> `package.json`, the `src/` tree and the `scripts/lib/` tree — so the published
> image no longer corresponds to the source it would run against.
> `verify-rcap-image-input-fingerprint.mjs` is red for exactly that reason.
>
> **Effect:** one image is built and pushed to
> `ghcr.io/roger-legalease/rcap-render-worker` under exactly one tag, the full
> candidate SHA. No `latest`. A private package. Nothing is deployed, no worker
> claims a job, staging and production are unchanged.
>
> **Preflight evidence:** §3 checks green on the candidate SHA, listed with
> their output; `--resolve` shows the source-SHA tag free.
>
> **Not requested and not authorized by this:** any deployment; any worker
> claiming; any migration; any environment or secret change; any Stripe
> live-mode call; enabling any feature flag; any change to Production; any
> change to the Preview binding (that is a separate step after acceptance).
>
> Signed: Roger Roman — date: ____________

A **second, separate** authorization is required to point the Preview host at
the new digest (§9). Publication and binding are distinct decisions and should
not be granted in one sentence.

## 12. What engineering may do the moment that authorization exists

1. Dispatch the workflow with the candidate SHA. **Once.**
2. If the run fails on the tag guard, stop and report. Do not retry with a
   replacement authorization.
3. On success: download the publication artifact, import it into
   `data/rcap-render/worker-publication-evidence.json`, move the superseded
   record into `supersededChain`.
4. Commit that evidence, then run `RCAP worker image acceptance` against the
   committed evidence.
5. On green acceptance, update `releaseTruth` and record the acceptance run id
   and URL.
6. **Stop.** The Preview binding needs the second authorization.

## 13. What this lane did not do

- Did not publish, build, tag, push, pull or deploy any image.
- Did not dispatch any workflow.
- Did not regenerate `data/rcap-staging-action.json`; that must be regenerated
  at the candidate SHA, and this lane does not own it or know that SHA.
- Did not edit `.github/workflows/publish-rcap-render-worker.yml`, including
  `RELEASE_INTEGRATION_BRANCH`, which is captain-owned. §2 flags it for the
  captain's decision.
- Did not touch Production.
