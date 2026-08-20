# All-Page PDF Evidence Contract (v2)

**Base:** `ea1a16b6358086c3c24fbd66e2fd005173d3ad87`
**Reviewer A consumed read-only:** `130149d63cec5ea81e7eca5fd02d61fb7255706e`
**Reviewer B consumed read-only:** `06d676869618fd9ed2b5915057104bc46299d0f0`

Neither review branch was merged. This lane renders and validates evidence. It
issues no verdict, adopts none, and altered none.

## What was broken

Two reviewers, working on opposite ends of the corpus, hit the same wall from
different directions:

- a multi-page form carried review evidence for page 1 only;
- a value counted as visible because the string appeared *somewhere* on the page;
- nothing proved the value appeared inside the geometry it was meant to occupy;
- a protected value on page 2 escaped the evidence package entirely;
- a stale contact-sheet hash could stay attached to a current artifact.

Reviewer B's own lane action put it plainly: *"Raster page 2 as well as page 1.
The AOC-CR-288 defect is on the order side, below the crop."*

## What the contract now proves

| Property | How |
| --- | --- |
| Every relevant page is rasterised | `rasterizePdf` over the whole contact sheet, blank panel beside filled panel |
| A page may only be omitted if it is provably empty | `pageRelevance` — a page with any widget, any participant ink or any court-owned region is required |
| Each raster is bound to its artifact | `boundToArtifactSha256` recomputed from the bytes on disk at generation time |
| The package cannot be silently shortened | one `visualEvidenceSha256` over the ordered set of page hashes |
| A value is inside its own rectangle | content-stream text runs at absolute page coordinates, compared against the census widget rect |
| A value does not cross its boundary | `value_crosses_field_boundary` |
| A value is not drawn where nothing declared it | `value_drawn_outside_every_declared_slot` |
| A declared binding actually reached the page | `declared_binding_not_visible_in_its_rect` |
| No participant value reaches a court-owned region | `binding_declared_in_court_owned_region` and `participant_value_in_protected_geometry` |
| A rename cannot unprotect a region | the region is matched on the printed heading, never on the field name |
| Only participant classes are writable | `binding_on_non_participant_class` — not a denylist of the single class `manual` |
| No recorded contact-sheet hash is stale | recomputed from disk on every generation |

Geometry is answered from the artifact's own content stream at absolute
coordinates, so it is exact and needs no pixel tolerance. The rasters are the
human-facing channel; they are not what the machine check depends on.

### One deliberate refinement

A bare `ORDER` token is **not** treated as a court-owned region. Every one of
these forms is titled *"PETITION AND ORDER OF EXPUNCTION"*, and matching the
title would condemn the petitioner block printed directly beneath it. Only
section phrases — `FINDINGS OF FACT`, `ORDER OF THE COURT`, `CERTIFICATE OF
SERVICE`, `CERTIFICATION`, notarisation, verification, clerk's-use — name a
region the court owns.

## New findings this lane produced

### `EV-NC298-PAGE2-FINDINGS-OF-FACT` — high

`NC:aoc-cr-298-form-en` page 2 draws **`Jordan Avery Reyes`** at (70.4, 369.7),
on the rule beneath printed item 12 — *"Petitioner ☐ is ☐ is not eligible for an
expunction of the offense(s) listed on Side One. If not eligible, it is
because:"* — under `FINDINGS OF FACT`, immediately above the printed `ORDER`
band. The map declares 5 bindings; the artifact draws 6 values. This is the
sixth, and no binding declares it. It intersects the unwritable fields
`EligibleCkBox`, `NotEligibleCkBox` and `NotEligibleReason`.

The filed page asserts the petitioner is ineligible **because of their own name**.

Reviewer B recorded this family as *"nothing is written on page 2"*. That reading
was correct against the evidence B was given — the committed package was one PNG
and it was page 1. This is exactly the defect class the contract was rebuilt to
catch, found on a family that had already been reviewed and called clean.

Evidence: `docs/record-clearing/pdf-visual-evidence/all-page/NC-aoc-cr-298-form-en/contact-sheet-page-02.png`

### `EV-NC296-PAGE2-FINDINGS-OF-FACT` — high

The same defect on `NC:aoc-cr-296-form-en`, at (70.7, 671.0) beneath printed
item 5. Independent of, and additional to, the district-attorney ownership
question B raised.

### `EV-CONTACT-SHEET-STALENESS-14` — medium

**14 of 63** families in the legacy page-1 proof recorded a contact-sheet hash
that was not the file on disk — including three of Reviewer B's four families and
`KY:aoc-334`, which Reviewer A found independently. Reviewer A found one; it was
fourteen.

Recorded before the fix in
`data/rcap-all50/visual-evidence/contact-sheet-staleness-ledger.json`, so the
signal survives the repair. The legacy proof has been regenerated and is now
current for all 63; the new package recomputes from disk and cannot drift.

## Sidecar escalation, re-derived from measurement

`ESC-SIDECAR-NONCONFORMANT` was being carried globally as open because an older
record said so. That record predates the sidecars now committed. Measured against
the canonical contract — `rcap-artifact-provenance/v1`, 20 required fields
non-null, `provenanceCoversArtifact` for every named artifact:

- **16 of 63** sidecars are conformant and the escalation is **resolved for them**;
- **47** carry a current measured failure and **retain** it;
- all **eight reviewed families** are conformant at 20/20 with 3/3 artifacts bound.

Reviewer A's claim of 20 required fields present was verified, not repeated and
not rejected. Record: `data/rcap-all50/visual-evidence/sidecar-escalation-status.json`.

The 47 failures are real and share one shape: `formFamily`, `officialTitle`,
`sourceUrl`, `classificationSha256`, `packetSpecSha256`, `activeContentResult`,
`flatteningResult` and `protectedFieldResult` are absent. These are families the
Gate B rerender never reached.

## First evidence batch

| Family | Pages | Rasterised | Writable geometry | Protected geometry | Sidecar |
| --- | --- | --- | --- | --- | --- |
| `AK:tf-800-form-en` | 3 | 3/3 | pass | pass | conformant |
| `AK:tf-805-form-en` | 2 | 2/2 | pass | pass | conformant |
| `NC:aoc-cr-287-form-en` | 2 | 2/2 | pass | pass | conformant |
| `NC:aoc-cr-298-form-en` | 2 | 2/2 | **fail** | **fail** | conformant |

Three are ready for re-review. The fourth is ready for re-review *because* it
fails — the evidence now shows what page-1-only evidence could not.

## Canaries and mutations

`node scripts/verify-rcap-all-page-visual-evidence.mjs` — **43/43 green.**

All ten named defects are reproduced. Canaries 1–5 and 10 run against the
committed families the defects actually live in, not synthetic fixtures; 6–9 are
mutations from `NC:aoc-cr-287-form-en`, which passes with zero findings before
any mutation is applied.

| # | Defect | Check |
| --- | --- | --- |
| 1 | NC AOC-CR-288 name in page-2 findings of fact | `canary-1-nc288-findings-of-fact` |
| 2 | KY AOC-334 case number in `Court` | `canary-2-ky334-case-number-in-court` |
| 3 | KY AOC-334 name in `Date` | `canary-3-ky334-name-in-date` |
| 4 | KY AOC-334 name in the agency-list slot | `canary-4-ky334-agency-list-slot` |
| 5 | KY AOC-496.3 county declared, never drawn | `canary-5-ky4963-county-declared-not-drawn` |
| 6 | stale contact-sheet hash | `contact-sheet-current-*`, `mutation-6-stale-contact-sheet-hash` |
| 7 | raster bound to an obsolete artifact | `raster-binding-*`, `mutation-7-obsolete-artifact-binding` |
| 8 | page 2 omitted from a two-page package | `pages-*`, `mutation-8-dropping-a-page-changes-the-package` |
| 9 | value visible but outside its rectangle | `mutation-9-value-outside-its-rectangle`, `mutation-9b-value-crosses-boundary` |
| 10 | protected value below the page-1 crop | `canary-10-protected-value-below-page-1-crop` |

Plus `mutation-1b-rename-cannot-unprotect`: renaming the findings-of-fact field to
something innocuous does not clear the region refusal.

## Scope

Changed: the evidence lane only — raster generation, visual-evidence manifests,
evidence validation, sidecar verification, canaries and mutations. One existing
check was strengthened: the orphaned-evidence scan now walks subdirectories
instead of reading the top level, and knows the all-page package as a referencing
source. Its output is byte-identical to base.

Not changed: family field maps, classifications, source binaries, PDF artifacts,
review verdicts, register counts, retirement records, `src/**`, package files,
worker inputs, hosted acceptance, `main`.

## Known limits

- **The source corpus is still absent.** `RCAP_BUNDLE_EXTRACT` is unset and no
  official source binary resolves, so no source digest is recomputed from bytes
  anywhere in this package. Both reviewers named this; it is unchanged and it
  still blocks every approval.
- **9 of 63 legacy sheets carry no discrimination control**, `KY:aoc-334` among
  them, because a single-page sheet has no second page to compare against. The
  new package does not depend on that control — the geometry contract is the gate.
- **This batch covers 4 families.** The other 59 need the same treatment.
