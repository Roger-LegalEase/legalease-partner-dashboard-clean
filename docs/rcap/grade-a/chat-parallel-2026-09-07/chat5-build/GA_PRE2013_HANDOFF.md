# Chat 5: complete Georgia pre-2013 GCIC candidate

Family `ga-nonconv-pre2013-set`. Baseline `362694c4fea3872e80778533fd477c6212f63791`; existing PR #231, recovery target. This is the initial participant application using the retained four-page GCIC form, not the post-July 1, 2013 process. Binary publication is pending A. Author QA is not independent approval.

## Delivered and measured

Fifteen complete PDFs, 108 pages, 52 generated family files. Canonical seven pages; boundary eight. All ten adopted disposition bases have full emitted packets. The official-disposition-needed/available and FBI-only branches include an acquisition checklist, explicitly NOT an actual disposition or certified attachment. Missing participant facts remain blank with exact supply instructions. Longer known values are fitted or refused, never shortened. SSN is intentionally private manual completion, never fabricated or stored by this adapter.

Three full renderer executions (two isolated directories and the default family directory) returned zero; every generated file is byte-identical across all three. The renderer suite passes 88 tests. Eight real importer controls pass, but the candidate's importer result itself remains failed as described below. Twelve deliberately corrupted complete PDFs were rejected by glyph, page and pixel checks, not merely changed-file checksums. Measured 188 textual writes and 90 protected pixel checks. Thirty distinct complete pages were author-inspected; 78 additional page instances are exact PNG-byte aliases. Final rerendered PNGs were compared byte-for-byte with the viewed images. No independent or central raster result is claimed.

- Canonical SHA256: `3f98067cbd445d8222fa948dc6b992b360d371726f64b10031e93b4e37e17716`.
- Boundary SHA256: `72d3d16df250dacc08ca45463a14eae340faab51e3e32be479031d7b55618447`.
- Official source SHA256: `5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab`, 449,903 bytes, four pages, effective 07/01/2013.

Only Section One on source page 2 receives supplied participant information. Every agency/prosecutor page and the GBI-use, SSN and execution areas remain pixel-identical to the blank source. Official printed content was not redrawn or edited. The current official face was compared, but a freshly downloaded live-issuer binary hash is not claimed.

## Executed commands

From repository root with locked dependencies and the retained source:

```sh
node scripts/rcap-packet-recovery/chat5/test-ga-pre2013.mjs /mnt/data/ga-renderer-final-tests.json
node scripts/build-census-v1-ga-nonconv-pre2013-set.mjs --out /mnt/data/ga-repeat-proof/pass-1
node scripts/build-census-v1-ga-nonconv-pre2013-set.mjs --out /mnt/data/ga-repeat-proof/pass-2
node scripts/build-census-v1-ga-nonconv-pre2013-set.mjs
python scripts/rcap-packet-recovery/chat5/audit-ga-pre2013.py --root . --evidence /mnt/data/ga-checked-output
node scripts/rcap-packet-recovery/chat5/test-ga-pre2013-importer.mjs /mnt/data/ga-importer-final-tests.json
```

`repeat-build-proof.json` retains hashes for all 52 files and all complete PDFs. The logs, per-fixture facts and reports, source/input hashes, all page hashes, distinct full-page images and complete-PDF audit are in the complete candidate archive. `--check` is deliberately rejected and never counted as a build. These commands generate review examples, not authorized commercial fulfillment.

## Exact remaining importer requirement for A

The actual existing `auditFamily` invocation reports `FAIL_MISSING_REQUIRED_FACTS`, `knownRequiredFieldsMissing:4`, with 52 fields, 13 canonical writes and 39 blanks. Do not zero those counters or call the reader passed. The four labels are Section Two Arresting Agency Name and ORI, Section Three Prosecuting Agency ORI, and the prosecutor's return-for-further-research action. Each lies under an explicit official-owned source heading. Section One's applicant-supplied arresting agency is filled.

A's exact request is recorded at #224 comment 5574431671: source-hash/page/region/heading-bound actor ownership in the existing reader, not a broad exemption for agency fields. The new importer controls explicitly catch an omitted participant agency field. Filling official regions to satisfy the generic classifier would violate the source. No shared reader, registry or workflow was changed here. This is an importer/source-role reconciliation, not a new legal approval requirement.

## Baseline-bound existing-byte publication

`data/rcap-grade-a/chat-parallel-2026-09-07/chat5-build/ga-nonconv-pre2013-set/packet-output.patch` is a standard lossless Git binary patch, SHA256 `6e296ad3284325b2026fb06e6225553cd4d17f6b0350f6cd1d506bd0b49912cc`, 9,915,531 bytes. It creates exactly 53 paths: 52 Georgia-family files and its held official source. Paths were absent on the observed worker baseline. It was applied to an isolated empty repository and every reconstructed byte compared successfully.

A must first compare current paths, preserve any newer work, then publish the existing bytes atomically and bind the appropriate artifact and receipt. A ZIP is not an installed packet. The source/output patch does not alter MD/KY, product-wiring, shared hosts, registries or other families. It is not a request to author or rebuild Georgia. Companion `artifact-handoff.json` records the accessible upload and re-download digest.

## Existing work and review

MD favorable and KY nonconviction archives were downloaded and freshly rehashed; both match their recorded digests and remain unchanged. The KY code head 362694c... and both earlier binary patches are preserved. Their ZIPs are not silently called installed packets.

Chat4 reviews the actual Georgia candidate bytes. The latest visible Chat4 branch at inspection held NC review records; no MD/KY/GA independent approval was inferred from their absence. This session preserves the other Chat5 session's active Maryland-early work identified in #224 comment5573640958 rather than overwriting its worktree. Current headings/claim status must be rechecked before taking subsequent families.

No terminal increase, runtime installation, main/Captain write, production deployment, live auth/payment, external inquiry, or invented participant/judicial fact is claimed.
