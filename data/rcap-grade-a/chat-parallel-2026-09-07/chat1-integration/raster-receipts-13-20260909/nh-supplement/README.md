# New Hampshire: original raster receipts, ready for the current identity reader

This additive supplement preserves PR #244's original thirteen-family bundle unchanged. It contains the original receipts from run 34359435506:

| Family | Documents | Measured pages | Original artifact |
|---|---:|---:|---|
| nh_conviction_standard-set | 2 | 26 | 10108062005 |
| nh_marijuana_annulment-set | 2 | 14 | 10107473123 |

Canary artifact: 10107230709. All three original ZIP sizes and SHA-256 digests were checked. All forty original page-image bodies were read, hashed, decoded, and checked against their recorded lengths and paper bounds. Five original JSON members are preserved byte-for-byte, including canary/runtime/control evidence. Five exercised refusals and one explicitly unexercised control remain distinct.

The 6,108-byte archive uses the SAME directory and inventory conventions as the thirteen-family bundle already consumed by Captain: `34359435506/*.verdict.json`, `PAGE_IMAGES_SHA256.json`, and `TRANSPORT.json`. Each image entry has runId, familyId, member, bytes, sha256, pngWidth and pngHeight. PNG dimensions refer to the viewport, not the paper rectangle.

SHA-256: `94883f018841aa81a1ebf5785d98dcf85709db457af2f20efaae9ab556fd366a`
Git blob: `c7592cc9a4335194225c06ea4808035cf6f4ac01`

## Consume

Retrieve the archive through ordinary Git/Contents access, verify the archive digest, and extract into a separate scratch directory. Use the EXISTING bundle-directory identity path in `scripts/rcap-packet-recovery/admit-completed-fixture-raster.py` as installed at `41d04e7c6c5bcdd83bc524227b0b069738af67af`, or its compatible successor. No new ingestion framework or ZIP-only workaround is requested.

Set the config's bundleArchive, bundleSha256 and imageBytesReadBy truthfully. Read original run/artifact/document pins from TRANSPORT.json. Preserve the current packet, ancestry, actual page-count, complete delivered-output inventory and independent-review requirements. Do not treat the four rendered PDFs as proof that no additional outputs exist. Keep `viewportDimensionsCheckedAgainstASecondSource: false` on the identity path; the consumer did not read the PNGs. The publisher did.

Checked-out packet commit: `e0c78f7fae5007e55bcd22b8ba234ab0a17608a3`.
Workflow-definition head: `a3d4587b0fbbbfa887c78372afbfdb8824906333`. These are separate identities.

The earlier exploratory note about a ZIP-only importer predates Captain's successful identity-path correction and is superseded by this instruction. Do not reopen those repaired checks. No packet was rebuilt or rerasterized here. No independent semantic approval, queue mutation, terminal promotion, or production change is claimed. No fonts or page-image corpus are included.
