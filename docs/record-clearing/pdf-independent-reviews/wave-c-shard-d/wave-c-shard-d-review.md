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

## Source bytes — blocked

`RCAP_BUNDLE_EXTRACT` is not present in this container. The required corpus
path does not exist, and no copy of the Master Library exists anywhere on the
filesystem. The SHA-256 of the official source bytes could therefore not be
recomputed for any assigned family, and this review does not accept another
lane's receipt as source proof.

What was verified instead: the visible official form number and revision, read
from the blank panel of each family's hash-verified contact sheet, agree with
the pinned identity in all four cases — `CC 6:15.1 NEW 05/2021` against
REV-2021-05, `FORM CC-1201 (MASTER) … 07/26` and `FORM CC-1473 (MASTER …) 07/26`
against REV-2026-07, and `600-00228 … (04/2026)` against REV-2026-04.

The digest itself remains unverified. No family in this shard could have been
approved on source grounds even had its artifact been clean.

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

Page 1, caption band. The drawn values obliterate the form's own preprinted
wording. Column-wise ink measurement over the caption row shows the blank panel
carrying ink across the `IN THE` columns and the filled panel carrying **zero**
ink over the same columns; `COURT OF` is overwritten by the drawn value
`District Court`; the two values abut with no separator, so the statutory
caption renders `District CourtExample County COUNTY, NEBRASKA`. On the
sub-caption row the printed italic `(Enter the county name)` is gone from the
filled panel while the unselected chooser's prompt `Choose the county` survives
the flatten — the exact inverse of what ESC-CAPTION-VARIANTS requires.
Confirmed twice: on the committed contact-sheet raster and on an independent
rasterization of `fixtures/canonical-filled.pdf` by this reviewer.

Second defect: all 21 classification entries store `effectiveLabel` and
`regionHeading` as raw Identity-H glyph ids at a fixed +29 offset from ASCII,
never mapped through the font's ToUnicode CMap, so `Neb. Rev. Stat.` is recorded
as `1HE\x11\x035HY\x11\x036WDW\x11`. The other three families have none of this.
This matters because the heading-vocabulary region channel added at this review
base has no legible input on this family — which is the mechanism by which the
caption-band draw went unrefused.

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

## Records

- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/assignment.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/hash-verification.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/historical-objection-review.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verdicts.json`
- `data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs`

Run the focused verifier with:

```
node data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/verify-wave-c-shard-d.mjs
```
