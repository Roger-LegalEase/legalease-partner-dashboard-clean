# Florida self-defense: original raster receipts ready for consumption

Family: `fl-self-defense-set`. Run: `34373388204`.

This is an additive handoff for a newly completed run, not a replay of the already-consumed seven-family batch `34364359375`. It changes no packet, source, review, ingester, queue, claim, main or production state.

## Exact transport

`original-raster-receipts.tar.xz`: **4,528 bytes**.

SHA-256: `6473b51eac3fcfd58499c9a696e438c8de49a0b38966c67f42e39df542583722`

Git blob: `4eaa8e03d732bb7a898823a3baa0ac7b0510a7ba`

Two original Actions ZIPs were downloaded and matched their API sizes and hashes. All four original JSON files are retained byte-for-byte: the family verdict, canary, runtime and negative controls. Ten actual PNG bodies were read, hashed and decoded, with their measured paper rectangles checked inside the images. This was transport checking, not a new raster execution or independent packet review.

The original family verdict covers canonical and boundary, five pages each. Its packet commit is `113305fa146a82dbd06f4ae0c4839be043fbd9e1`; the workflow-definition head is separately `a3d4587b0fbbbfa887c78372afbfdb8824906333`.

## Consume with the existing interface

First check whether current Captain has already consumed this exact run and packet set. Otherwise retrieve the small Git blob through normal authenticated Git/Contents access, verify the SHA-256, and extract into separate scratch storage. This avoids the denied Actions artifact redirect; no user upload or main push is required.

The payload keeps the already-consumed layout:

- `34373388204/fl-self-defense-set.verdict.json` and the original canary/runtime/control JSONs;
- `TRANSPORT.json`, with every original identity and immutable packet/document pin;
- `PAGE_IMAGES_SHA256.json`, with measured original image identities;
- `RUN_API_SUMMARY.json` and `JOBS_API_SUMMARY.json`, explicitly labeled projections of this session's API reads, not original archive members. They retain the fields used by the existing importer and include the matrix ID.

Actual completed successful jobs: canary `102539959683`, matrix `102540710943`, family `102541068320`.

Use the existing `admit-completed-fixture-raster.py` bundle-directory path, with a config derived from the current queue and these exact pins. Set bundleArchive, bundleSha256 and imageBytesReadBy truthfully. Preserve current/immutable PDF checks, whole-delivery inventory, page geometry, ancestry and independent-review requirements. Keep the existing explicit `viewportDimensionsCheckedAgainstASecondSource: false` disclosure: the paper rectangle is not the PNG viewport. Do not invent a second measurement.

The original controls retain five exercised refusals and one unexercised `headless_shell_render_refused`; neither this handoff nor its publisher converts that into an exercised pass.

If every remaining admission requirement holds, consume and derive the state. Otherwise retain the exact residual and continue the seven already-raster-admitted independent reviews. No terminal or production approval is issued here. Do not rerender unchanged PDFs to retrieve these already-recovered measurements.
