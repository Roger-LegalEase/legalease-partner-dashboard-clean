# Nebraska central evidence recovered; no packet rebuild needed

The original workflow artifact download succeeded through the connected GitHub artifact action in this ChatGPT session. This directory makes its small JSON members available through ordinary GitHub contents reads to a Captain whose artifact-download redirect is blocked.

## What is here

- `ne-seal-pardoned-set.verdict.json`: **the unchanged 8,283-byte original** from artifact `10099982865`, including all eight page measurements. It is not reconstructed from logs.
- `canary-receipt.json`, `runtime-receipt.json`, `negative-controls.json`: unchanged members of artifact `10099823541` from the same run.
- `TRANSPORT.json`: separately authored provenance and read-only check results, not a new workflow verdict or terminal grant.

Every published original JSON Git object and byte length was read back and matched to its downloaded archive member. Archive CRCs and GitHub digests matched. All eight original page PNGs were rehashed and decoded; their byte lengths match the verdict and recorded geometry is internally consistent. This is transport validation, not a second visual or legal review.

## Exact original execution

| Item | Value |
|---|---|
| Family | `ne-seal-pardoned-set` |
| Run | `34341080972` |
| Packet candidate | `a25db5034ab8ff3ed1466fa8028c63d0558e809d` |
| Workflow-definition head | `a3d4587b0fbbbfa887c78372afbfdb8824906333` |
| Family job | `102432777025` |
| Canary job | `102431769489` |
| Family artifact | `10099982865` |
| Family archive SHA-256 | `9badfe8024ca3453f8505d6e5b5952ce09687d9c9124cd3264420f61e0cc6d4c` |
| Family archive bytes | `3040284` |
| Canary artifact | `10099823541` |
| Canary archive SHA-256 | `49db7592145e2060f241d2fab23ce785edd6e27f0ed549e89f6ce1442936954d` |
| Canary archive bytes | `5955` |
| Original verdict SHA-256 | `074ce750f85f5639d420cd4ddfb681d04f383704490167b2dce3a78a56a14f52` |
| Original verdict Git blob | `89eee254eac2483b7954c02fc4402e3cc04eded7` |
| Document-set digest | `6d448642a0ad477dc7e53339b6a0ad8893b952715f7c4ce26afdde8180d2fb05` |

The workflow definition runs on main but checks out the named candidate; these two commit identities must remain distinct. Five canary negative controls were exercised and refused; `headless_shell_render_refused` was explicitly not exercised. Preserve that limit.

## Captain: consume the real missing input

1. Read these files at the evidence PR's pinned head. Use GitHub contents API or `git show` from the evidence branch; no desktop upload, artifact blob redirect or source-archive reconstruction is necessary for the JSON. Do not check out this branch over an active worktree.
2. Verify all four original-member hashes in `TRANSPORT.json`. Preserve their exact bytes. Verify the run/job/artifact metadata through the authorized GitHub API and compare current local packet hashes, selected document inventory and all page dimensions against the original verdict.
3. At inspected Captain `15c70f0aaed657d3e7b1b19221192a637834d788`, `scripts/rcap-packet-recovery/ingest-completed-raster.mjs` is genuinely Delaware-specific. Its `FAMILY`, `VERDICT`, `PIN` and next-owner assignment cannot be used unchanged for Nebraska. Its module exports `validateCompletedRaster`; the current main function has twelve mutated-verdict controls plus a wrong-packet-byte control. Preserve those validations and the existing Delaware behavior when making the scoped parameterization, or use a newer existing general ingester if already supplied. Do not weaken page coverage, calibrated geometry, source-byte binding, run identity or ownership checks. Do not merely hand-write a RASTER_PASS into the queue.
4. Authenticate the original execution separately from current-byte validation. The original archive digest authenticates the recovered transport via GitHub metadata; the committed JSON is the unchanged extracted member. Rechecking packet hashes here at the destination is still required. Any caller-supplied configuration is not by itself new workflow approval.
5. Once the existing admission requirements pass, consume the receipt, regenerate the applicable records without overwriting the national matrix with a one-family output, publish and derive the actual delta. Keep independent semantic review separate. Do not dispatch another unchanged raster job just to regain these measurements.

## Boundaries

No packet source/output bytes, shared ingester, queue, state, workflow, review verdict or production setting was modified by this evidence branch. The original PNGs and ZIPs are retained as downloadable artifacts of the ChatGPT session; they are not committed in this directory. Local current full-PDF validation and ingestion have not been performed here. This relay is not an independent packet approval and does not itself promote the family.
