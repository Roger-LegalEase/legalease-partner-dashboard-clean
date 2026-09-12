# Original raster receipts: 13 families, two completed runs

These are recovered original Actions receipts, not reconstructed summaries or new approvals.

- Run 34352802308: seven families, 14 documents, 138 measured pages; packet commit `4bf305425ddd1bb524421a36087c0bb095c6a183`.
- Run 34357236801: six families, 12 documents, 120 measured pages; packet commit `18b5f42707806d0e2a7c29e8f83926347e438556`.
- All 15 original artifact ZIPs (13 family archives and two canaries), totaling 129,093,949 bytes, were downloaded and matched to the recorded GitHub API size and SHA-256. ZIP integrity was checked.
- All 19 original JSON files are unchanged: 13 verdicts plus each run's canary, runtime and negative-control report.
- All 258 declared page-image byte lengths matched the actual images. Their actual SHA-256 values and PNG-header dimensions are in the separate transport inventory. Paper rectangles are within the viewport captures, not equal to their overall dimensions. This is transport measurement, not a new visual examination.

## Retrieve and extract

`original-raster-receipts.tar.xz` is 16,400 bytes.

SHA-256: `ad517cdf289770a770b496a46c5232e1671a5ae06be7df7807f9429fbb3263cb`

Git blob: `ee437d18f3c46042c6af23afdf500f48bb6990ec`

Fetch this evidence branch or read the blob through the normal repository Contents/Git API. The ZIP redirect that Claude's proxy denies is not involved. Decode a GitHub Contents base64 response in the shell, not as a model-authored reconstruction.

Extract into a new scratch directory, not over a packet family:

```sh
DEST=$(mktemp -d /tmp/rcap-recovered-receipts.XXXXXX)
# BUNDLE is the actual downloaded repository file.
printf '%s  %s\n' ad517cdf289770a770b496a46c5232e1671a5ae06be7df7807f9429fbb3263cb "$BUNDLE" | sha256sum -c -
tar -xJf "$BUNDLE" -C "$DEST"
```

Each run has its own directory with the original filenames. `TRANSPORT.json` supplies every original ZIP identity, job/run/artifact ID, candidate commit, document inventory/digest and original member SHA-256/Git blob. `PAGE_IMAGES_SHA256.json` records the actual page-image identities without duplicating the large image corpus.

## Consume, do not rerender

Use the Captain's current `admit-completed-fixture-raster.py` or existing applicable ingestion path. Read its actual options rather than guessing a CLI. Validate these originals against current packet hashes, page geometry and document inventory; retain the applicable independent verdict. Then perform the existing derivation and publish each qualifying admission.

No rerender, replacement review, main push or workflow modification is needed merely to obtain the missing measurements. If any candidate changed, leave that family's receipt unapplied and continue the matching families. This is not a blanket 13-family terminal promotion.

The workflow-definition head was `a3d4587b0fbbbfa887c78372afbfdb8824906333`; the explicitly checked-out packet commits are the two different commits above. Do not conflate them.

Both original negative-control reports record five exercised refusals and one NOT EXERCISED (`headless_shell_render_refused`). Preserve that distinction. Nothing here changes source/legal authority, participant facts, packet bytes, reviews, queues, runtime, production or worker claims.

## Scope boundary

This publication closes transport for these two runs only. The later New Hampshire run is not in this payload. It does not solve future artifact transport globally. Keep workers running and consume this already-completed group now rather than waiting for another batch or a transport redesign.
