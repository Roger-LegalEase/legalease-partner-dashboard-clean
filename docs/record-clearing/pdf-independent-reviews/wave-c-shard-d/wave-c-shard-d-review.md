# Gate B — Independent Review, Wave C, Shard D

Review base: `e94fb456b13dacd05479641bc3c4fe37eb898d07`
Reviewed branch: `claude/rcap-pdf-family-rerender-mounted`
Reviewer branch: `claude/gate-b-wave-c-review-kibrgo`

This review issues verdicts. It repairs nothing, edits no historical verdict,
and touches no implementation path.

## Denominator

The rerender and all-page evidence records at the review base carry seventeen
rerendered families; `NE:dc-1-15-form-en` is held back and unreviewable. The
remaining sixteen satisfy every eligibility test — source hash-matched,
finalized artifact hash present, rerender complete, all-page evidence package
present, every field-carrying page rasterized, raster manifest bound to the
current artifact hash, sidecar conformant, no open technical correction.

Sorted lexicographically and sliced at `start = 3 × 4 = 12`, `end = 16`, shard D
owns:

| # | Family | Doc | Pages |
|---|---|---|---|
| 12 | `NE:cc-6-15-1-form-en` | CC-6-15.1 | 1 |
| 13 | `VA:cc-1201-form-en` | CC-1201 | 4 |
| 14 | `VA:cc-1473-form-en` | CC-1473 | 2 |
| 15 | `VT:600-00228-support-en` | 600-00228 | 2 |

No overlap with shards A, B or C. NE DC-1-15 is not in the batch.

## Verdicts

| Family | Verdict |
|---|---|
| `NE:cc-6-15-1-form-en` | `correction_required` |
| `VA:cc-1201-form-en` | `correction_required` |
| `VA:cc-1473-form-en` | `substantive_owner_decision_required` |
| `VT:600-00228-support-en` | `correction_required` |

No family is approved.

## Source bytes — verified

The four official source PDFs for this shard were supplied after the first pass
as a reviewer source pack and installed under
`private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`. They
remain uncommitted, enforced by `.gitignore:53 private/`.

Every digest was recomputed by this reviewer from the installed bytes and
compared against the family's own pinned identity in three independent places —
`source-receipt.json`, `source-record.json` and `artifact-provenance.json`. The
pack's own manifest was not treated as proof.

| Family | Recomputed SHA-256 | Bytes | Pins | Visible form no. / revision |
|---|---|---|---|---|
| NE CC-6-15.1 | `d1fb1340…` | 2,909,936 | 3/3 match | `CC 6:15.1 NEW 05/2021` ✓ |
| VA CC-1201 | `7b56d8e1…` | 282,919 | 3/3 match | `FORM CC-1201 (MASTER) … 07/26` ✓ |
| VA CC-1473 | `6176c2f5…` | 120,875 | 3/3 match | `FORM CC-1473 (MASTER …) 07/26` ✓ |
| VT 600-00228 | `263d4e19…` | 2,871,072 | 3/3 match | `600-00228 … (04/2026)` ✓ |

**Zero source mismatches.** Byte lengths match all three recorded places,
`canonicalBundlePath` agrees with the receipt path, XFA is absent in all four
as the receipts claim, and page counts agree. No approval was refused on source
grounds.

One scope caveat, stated plainly: the pack is a four-file review-input pack, not
the 499-file / 329-PDF Master Library the brief names as the required corpus.
Every source *this shard reviews* is verified; the brief's corpus-size
precondition remains unmet globally and is not something this shard can close.

### Registered source-versus-artifact comparison

With the real sources in hand, the blank official form and the finalized
artifact were rasterized through the same engine at identical scale and compared
per pixel. This is reliable for page 1 of each document and for the single-page
NE form; for pages 2 and beyond the PDF viewer's `#page` navigation did not
reposition consistently between the two documents, so those captures are not
registered and were **not** used as evidence — pages 2+ were reviewed from the
hash-bound contact sheets, as in the first pass.

| Family | Page | Source ink destroyed | Reading |
|---|---|---|---|
| NE CC-6-15.1 | 1 | **402 px** | preprinted wording destroyed — see below |
| VA CC-1201 | 1 | 0 | nothing preprinted damaged; the defects are wrong values in right rectangles |
| VA CC-1473 | 1 | 0 | nothing preprinted damaged |
| VT 600-00228 | 1 | 17 px | benign — the unfilled widgets' background shading, which flattening removes by design |

## Hashes

45 digests were recomputed from disk — field map, classification, provenance
sidecar, canonical artifact, boundary artifact, contact sheet, every all-page
raster, and every pin the sidecar itself carries. All 45 match. The evidence
package is current for the artifacts it describes, not stale.

One thing the recomputation surfaced: `gate-b-family-rerender-evidence.json`
records `newArtifactSha256` values that are superseded for three of the four
families — NE, VA CC-1201 and VT were rendered again at the review base. Every
`provenAgainstThisFamilysBytes: true` flag on those three was therefore proven
against bytes that are no longer the artifact. Each was re-checked here rather
than trusted.

## What the all-page inspection found

### `NE:cc-6-15-1-form-en` — correction_required

Page 1, caption band. The artifact destroys wording that is printed in the
official source. Rendered directly from the verified source bytes
(`d1fb1340…`), the band reads cleanly:

```
IN THE ________ COURT OF ________ COUNTY, NEBRASKA
       [Choose the court]   [Choose the county]
```

The finalized artifact (`41d2dfd9…`) renders:

```
              District CourtExample County  COUNTY, NEBRASKA
   (Enter the type of court)      Choose the county
   Choose the court
```

A registered per-pixel comparison puts numbers on it: **402 source-ink pixels
destroyed** and 1037 added, with the destroyed columns falling exactly on
`x 429-479` (`IN THE`) and `x 557-634` (`COURT OF`). `COUNTY, NEBRASKA` is
untouched, which serves as the alignment control. The two values also abut with
no separator, so the statutory caption reads `District CourtExample County`.

Three further things the source comparison exposed. The flatten *materialises*
the italic captions `(Enter the type of court)` and `(Enter the county name)`,
which the official form's own rendering keeps hidden behind the chooser widgets.
The unselected chooser prompts `Choose the court` and `Choose the county`
survive the flatten — the exact inverse of what ESC-CAPTION-VARIANTS requires.
And the contact sheet's **blank** panel already carries the materialised
captions, so it is not a faithful rendering of the official form: comparing the
artifact against that blank hides part of the very damage recorded here.

Second defect, unchanged: all 21 classification entries store `effectiveLabel`
and `regionHeading` as raw Identity-H glyph ids at a fixed +29 offset from
ASCII, never mapped through the font's ToUnicode CMap, so `Neb. Rev. Stat.` is
recorded as `1HE\x11\x035HY\x11\x036WDW\x11`. The other three families have
none of this. The heading-vocabulary region channel added at this review base
therefore has nothing legible to match on this family — which is the mechanism
by which the caption-band draw went unrefused.

### `VA:cc-1201-form-en` — correction_required

Page 1: `User.CourtName` (rect x=37 y=651 w=366 h=12) is written with
`matter.court` = `District Court` onto the court caption rule whose printed
caption is `CITY OR COUNTY` and whose preprinted continuation is `Circuit
Court`. The line renders `District Court … Circuit Court`. The same slot type is
already refused on page 2 (`User.Court`, "Court of final disposition", also
captioned `CITY OR COUNTY`), so the family is inconsistent with itself.

Page 4: `User.CaseNumber1201` (rect x=134 y=579 w=53 h=12) is written with the
case number into the addendum-count slot captioned `NUMBER`, rendering
`CC-1201(A). 24-CR-001234 addendums are attached to this petition`. The value is
shrunk well below body size to fit a 53pt box; the family's own boundary fixture
already refuses this field with `value_exceeds_widget_width_at_minimum_font`.

Underlying both: the census resolves captions with `labelBasis:
"printed_directly_above_in_the_same_column"`, but this form prints each caption
*below* its rule. So `UserPetitionerName` is recorded with `effectiveLabel:
"CITY OR COUNTY"` and `User.CourtName` with `"and any related ancillary
matters)"` — every caption on the block attributed to the rule above the one it
belongs to. The map's own labels cannot support an approval.

### `VA:cc-1473-form-en` — substantive_owner_decision_required

Geometry is clean. Values land on their captioned rules, `DATE`, `SIGNATURE`,
`PRINT NAME`, `TELEPHONE`, `EMAIL`, `VSB` and `CLERK` are all blank, page 2 is
untouched, the artifact is flattened with no active content, and every hash
matches. Two questions are the owner's, not a reviewer's:

- `User.City` writes `participant.city` into the court caption's `CITY OR
  COUNTY` slot. The value type is right and nothing preprinted is damaged, but
  the fact is the petitioner's residence city while the slot names the circuit
  court's locality. The fixture also carries `matter.county`; the two coincide
  only by fixture.
- `User.CaseNumbers` and `User.UnderlyingCaseNumbers` fill conditional slots —
  "if matter was heard on appeal from General District Court" and an "Underlying
  Case No.(s)" line gated by an unchecked attachment box. Neither condition is
  established by the fact set, so as rendered the document asserts an appeal
  history and an attachment that the facts do not support.

### `VT:600-00228-support-en` — correction_required

Placement is correct and page 2 is identical blank versus filled, with the
Section 5 signature block properly blank. The defect is what is missing.

Field `3` carries the correctly captured caption `Name: (First & Last) …` and is
classified `manual`. So are `2` (Street Address), `4` (City/State/Zip), `5a`
(Email Address) and `6`/`7` (phone). `classCounts` is `{manual: 78, participant:
2}` — only `Docket Number` and `Case Name` are written. The applicant's name,
address, phone and email are blank on an application whose whole purpose is to
state the applicant's identity and means, while every one of those facts exists
in the fact set and is written on other families in this shard.

ESC-VALUE-NOT-VISIBLE states its own mutation test as *"Offer full_legal_name to
a field named `2` sitting under a printed 'Name' caption: it must bind, not
refuse."* That is precisely this case, and it still refuses. The escalation is
recorded `sharedCorrectionProven: true`, `provenAgainstThisFamilysBytes: true`;
it is not closed against the bytes at this review base.

## Historical objections

| Family | Escalation | Reviewer finding |
|---|---|---|
| NE CC-6-15.1 | ESC-CAPTION-VARIANTS | not closed |
| NE CC-6-15.1 | ESC-SIDECAR-NONCONFORMANT | closed on the artifact; record is another lane's |
| VA CC-1201 | ESC-GEOMETRY-NOT-AN-INPUT | not closed |
| VA CC-1201 | ESC-NO-REFUSE-WHEN | closed |
| VA CC-1201 | ESC-SIDECAR-NONCONFORMANT | closed on the artifact; record is another lane's |
| VA CC-1473 | ESC-GEOMETRY-NOT-AN-INPUT | closed with a reservation |
| VA CC-1473 | ESC-NO-REFUSE-WHEN | closed | 
| VA CC-1473 | ESC-SIDECAR-NONCONFORMANT | closed on the artifact; record is another lane's |
| VT 600-00228 | ESC-VALUE-NOT-VISIBLE | not closed |
| VT 600-00228 | ESC-SIDECAR-NONCONFORMANT | closed on the artifact; record is another lane's |

On the sidecar escalation: it is recorded `open` and owned by another lane, but
measured against the current bytes the sidecar itself conforms — 24 fields, no
null field, and every digest it pins recomputed and matching. This reviewer
records no artifact-level sidecar defect for any of the four.

## On the relaxed overlay assertion

Not relied on. All four families are AcroForm packages carrying a full
classification with a class recorded for every written field, so the
flat-overlay relaxation does not apply here and no safety was inferred from an
absent class. Where ownership was substantively ambiguous — VA CC-1473's
locality and conditional slots — that is reported as an owner decision rather
than assumed either way.

## Structural checks

All four artifacts, canonical and boundary alike: flattened, no AcroForm, zero
widget annotations, zero annotations of any kind, no XFA, no JavaScript, no
OpenAction, no additional actions, and no `/Launch`, `/EmbeddedFile` or
`/RichMedia` token in the raw bytes. Page counts — 1, 4, 2, 2 — match both the
sidecar and the raster coverage.

## Canonical re-emission

`loadReviewRecords()` in `scripts/rcap-official-forms/rcap-platform-ready.mjs`
discovers review records by scanning the **top level** of
`data/rcap-all50/pdf-independent-reviews` for `<batch>-manifest.json`. The
shard-d records live in a subdirectory, so the loader never saw them and the
shared gate could not read them — the same gap Reviewers A and B closed for
their shards.

The same four verdicts are therefore re-emitted in the canonical top-level
layout as batch `wave-c-final-d`:

- `wave-c-final-d-manifest.json` — the frozen four families with every pinned hash
- `wave-c-final-d-group-1.review.json` — the four verdicts
- `wave-c-final-d-verdicts.json` — the rollup

This is a re-emission, not a re-review: no verdict changed and no pinned hash
changed. The emitter recomputes every digest from disk and exits non-zero if any
differs from what the shard record already pinned, so the record cannot describe
bytes that moved. It is deterministic — a second pass leaves the three files
byte-identical.

After emission `scripts/verify-rcap-pdf-independent-review-records.mjs` reports
**2 batches, 27 family records, validation clean, 0 problems**, and all four
shard-d families resolve to batch `wave-c-final-d` as their newest record. The
gate refuses all 27 at condition 1 — the verdict is not
`approved_platform_ready` — which for these four is the correct outcome.

**Denominator effect: platform_ready delta 0.** Shard d carries no approval. The
record exists so the four families are countable as reviewed rather than
missing.

## Records

- `data/rcap-all50/pdf-independent-reviews/wave-c-final-d-manifest.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-final-d-group-1.review.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-final-d-verdicts.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/emit-canonical-wave-c-final-d.mjs`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/assignment.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/source-verification.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/hash-verification.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/historical-objection-review.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verdicts.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs`

Run the focused verifier with:

```
node data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs
```

With the private corpus mounted it also reproduces every source digest:

```
RCAP_BUNDLE_EXTRACT="$PWD/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1" \
  node data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs
```

Without it the source block reports `skip` rather than failing, because the
corpus is uncommitted by design.
