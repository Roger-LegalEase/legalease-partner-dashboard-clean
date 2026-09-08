# Chat 5: complete Maryland 072A candidate, September 7, 2026

## Delivered and measured

Family `md_10105_favorable-set`, ordinary official CC-DC-CR-072A scope. Fifteen complete PDFs / sixty pages (one official form and three participant instruction/checklist pages each), including canonical, boundary and all implemented selectable disposition/venue/process branches. All fifty-one generated family files match across two actual full renderer executions and the final output directory. No `--check` run is counted as regeneration.

Renderer suite: 58 passes, zero failures. Reused appearance/flattening primitive suites: 6 + 5 + 3 passes. Actual complete-PDF audit checks text glyphs, widget bounds, selections, protected execution blanks and page inventory. Five altered complete PDFs were rejected (missing held name, forged execution ink, wrong selection, missing page, out-of-bounds glyph). All thirty distinct complete page images were visually inspected in fifteen full-page pairs; thirty additional pages are exact PNG-byte aliases, individually inventoried. This is AUTHOR QA, not independent review or central raster acceptance.

Canonical SHA256: `1b0c72fd95847a8097339061546246649b4a2465b7915c8dd54df0ebfd2d9101`.
Boundary SHA256: `44c3c53433c133e0beb0cf05f771969ae53714526177aeb60806e2dac41f45be`.
Held official source SHA256: `8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2` (195,791 bytes, 47 fields, edition 09/2025).

The source is the actual retained Maryland Judiciary PDF, not a drawn substitute. Current live source was visually checked, but its live downloaded-byte digest is not claimed. All consumed shared code, lockfile and route/source-contract blobs were reconciled to the current worker branch. The older environment snapshot is not described as current recovery. The stale global packet manifest is not consumed.

## Exact execution

From repository root with locked dependencies and the retained source installed:

```sh
node scripts/rcap-packet-recovery/chat5/test-md-favorable.mjs /tmp/md-tests.json
node scripts/rcap-official-forms/test-appearance-fit-to-rect.mjs
node scripts/rcap-official-forms/test-synthesized-off-appearances.mjs
node scripts/rcap-official-forms/test-widget-appearance-placement.mjs
node scripts/build-census-v1-md_10105_favorable-set.mjs --out /tmp/md-pass-1
node scripts/build-census-v1-md_10105_favorable-set.mjs --out /tmp/md-pass-2
node scripts/build-census-v1-md_10105_favorable-set.mjs
python scripts/rcap-packet-recovery/chat5/audit-md-favorable.py --root . --evidence /tmp/md-audit
```

All commands exited zero in author execution. Compare every file in both output directories, not just PDFs. `build-summary.json` retains every actual output hash and measured result; `source-inputs.json` retains exact consumed input anchors; `publication-patch-manifest.json` retains every publication path. Fixture facts are explicitly synthetic test records and never substitute for participant facts.

## Publication boundary and exact-byte integration

The first PR contains executable source-specific builder code, wrapper, tests and this evidence handoff. The separate complete artifact contains the actual PDFs, generated maps/reports/instructions, source bytes, complete visual inventory and a standard lossless Git binary patch. Consult `artifact-handoff.json` for its verified Drive locator and complete ZIP digest.

At first PR publication, the new PDF paths are NOT yet installed in GitHub. A must apply the artifact's existing exact bytes, not recreate the packet or count this as runtime delivery. The patch contains exactly 52 new paths: 51 files in the owned MD family directory plus its retained official blank source. It was applied to an isolated empty repository and every resulting file matched the full renderer byte-for-byte.

Patch: `data/rcap-grade-a/chat-parallel-2026-09-07/chat5-build/md_10105_favorable-set/packet-output.patch`.
Patch SHA256: `45625505304c4b5ad245c83e00a4fa24df021bc4a4c4a7ea35b52d397a30b042`.
Patch bytes: 4,510,813.

A: compare current paths before applying; do not overwrite a newer implementation. Preserve current common helpers and product wiring. Then bind selected artifacts, arrange central raster/admission and consume Chat 4's independent current-byte review. No shared generator, workflow, product registry, payment/auth resource or other family was changed by Chat 5.

## Source/route distinctions requiring reconciliation, not a blanket hold

The ordinary 072A candidate includes acquittal, dismissal, nolle, treatment dispositions, PBJ, qualifying PBJ DUI, stet, compromise, not-criminally-responsible and transfer selections with actual per-basis clocks and fact checks. Unknown mandatory facts stay blank with a concrete missing-fact disclosure. Signatures, execution dates, attorney certification, witness/notarial acts and judicial findings are never synthesized.

A / Chat 6: the current favorable track includes conviction-related dispositions which the actual 072A cannot serve. Resolve the exact B/D-versus-A source selector for those track dispositions. Do not authorize 072A for a conviction, pardon or cannabis conviction merely because the track label says favorable. Other assigned Maryland families retain their distinct instruments.

The actual source's nolle recital states three years or an attached waiver, while Criminal Procedure 10-105(c)(3) separately addresses completion of a treatment program. The implemented nolle-treatment fixture is mature and truthfully meets both. A recent completed-treatment case without a release is intentionally not asserted through a false printed recital. Chat 6 should resolve the narrow source/recital bridge before expanding that selection; ordinary mature packets remain buildable.

Early release and CC-DC-CR-072C are distinct from this ordinary set. A selected general release changes tort rights and needs actual informed participant election and execution; it is not a fee waiver. Mixed disposition/date charging units are rejected rather than collapsed into a false single recital. Unsupported text encoding is rejected before emitting a partial PDF. Future law on or after October 1, 2026 requires revalidation, not silently continuing this September 7 authority snapshot.

Independent review, central raster acceptance, all-route coverage reconciliation, runtime installation and terminal admission remain unclaimed. No terminal totals were changed.
