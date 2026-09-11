# VF02 independent current-output review — 2026-09-11

Base: `1e09363c514ddfabfe493be8685bc466afd7f723`. Both live grants asserted in the assigned checkout. No packet, source, shared helper, claim ledger, central matrix or live route was changed.

| Family | Verdict | Obligations |
| --- | --- | --- |
| `al-pardon-set` | `PASS_COMPLETE_INDEPENDENT` | 15 PASS |
| `census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement` | `FAIL_REPAIR_REQUIRED` | 10 PASS, 5 FAIL |

The durable rows are in `../rows-vf02-20260911-al-ut-current.json`. All thirty obligations were freshly scored; `VERIFIER_RETURNS.json` contains no prior indexed row for either exact family at this base.

Both original sources were read and rehashed. Both canonical and boundary PDFs match raster run **34644046027**, pinned to `3c799170ea5f0bdf4bdc75338b5defb364cec9b1`. All **32 original packet PNGs** were directly inspected and rehashed: AL 8, UT 24. Actual PNG dimensions are **2448 × 3168**; the paper bounds are **2040 × 2640**. Calibration images were not counted as packet pages. No local rendering was performed.

AL's four held facts and pardon election are visible, source pages and protected blanks are preserved, and all nine independent counters are zero. The release-of-information waiver and conviction list remain separately required participant-supplied materials, expressly disclosed by the guide; this verdict does not claim they are generated.

UT fails because its white-backed overlays obscure original question labels and selection brackets. The exhaustive confirmed list has **36 defective placements** across **31 field definitions**: 9 canonical and 27 boundary. It also has **12 required-content gaps**, including **6 incomplete attorney name/address rows**. Each instance is bound to a current field, source question, original image and actual PDF geometry or text. The six rows are a subset of the twelve content gaps.

UT independent nonzero counters are `requiredFactsNotCollected=12`, `incompleteRows=6`, and `visualDefects=36`; the other six are zero. Both real completeness commands returned `PASS_COMPLETE` with zero counters. That result does not inspect source-label erasure or recognize nonresponsive prose. The independent findings take precedence over those author/reader counters.

The single complete UT repair group is in `repair-assignments.json`; geometry details are in `ut-geometry-findings.json`, content details in `ut-required-content-findings.json`, and all original-image observations in `page-by-page-original-image-review.json`. Small geometric intersection candidates are retained separately from confirmed visible defects.

`commands.json` records 33 successful commands, including exact grant assertions, both real builder `--check` commands, both completeness readers, both focused source/output tests, both product-wiring checks, the seven UT declaration tests, direct PDF measurements and return consistency validation. `current-bindings.json` and `authority-and-helper-pins.json` contain all source, current PDF, raster, product metadata and relevant authority/helper hashes.

UT's resolved Rule 65C implementation decision remains accepted. No 1231XX alias research or new legal decision was performed. Runtime reconciliation, live authority, payment, sponsorship and central admission remain outside this review. The pre-existing previous-lane ledger modification was preserved in `/tmp/vf02-de-ledger-wip-before-al-ut-20260911` before the authorized branch switch; untracked `private` was preserved.
