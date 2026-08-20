# Gate B — Independent Review, Wave C, Shard C

Review-only record. This shard created no artifact, map, classification, sidecar or
raster, and repaired nothing.

- Review base: `e94fb456b13dacd05479641bc3c4fe37eb898d07`
- Reviewed branch: `claude/rcap-pdf-family-rerender-mounted`
- Reviewer branch: `claude/epic-newton-022oud` (distinct from the reviewed branch)
- Machine-readable records: [`assignment.json`](../../../../data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/assignment.json),
  [`verdicts.json`](../../../../data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/verdicts.json),
  [`visual-evidence-log.json`](../../../../data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/visual-evidence-log.json)
- Focused verifier: `RCAP_BUNDLE_EXTRACT=… node data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/verify-wave-c-shard-c.mjs`

This record was issued in two passes. The first could not execute source verification
because no corpus was mounted. The shard-c reviewer source pack then supplied the four
official sources, and the findings below are restated on source-derived geometry and on
the source's own field semantics. One first-pass reading was wrong and is corrected in
place — see *Correction to the first pass*.

## Denominator and shard

Sixteen families satisfy every criterion evaluable against disk. Sorted lexicographically
and sliced at `[8:12]`:

| # | Family | Verdict |
|---|--------|---------|
| 8 | `NC:aoc-cv-226-support-en` | correction_required |
| 9 | `NE:cc-6-11-2-form-en` | correction_required |
| 10 | `NE:cc-6-11-form-en` | correction_required |
| 11 | `NE:cc-6-12-form-en` | substantive_owner_decision_required |

No overlap with shards a, b or d; NE DC-1-15 excluded.

## Source verification

All four sources were installed from the shard-c reviewer source pack into the gitignored
`private/` tree and verified from bytes. Each SHA-256 was recomputed and compared against
the family's own `source-record.json`, `source-receipt.json`, `artifact-provenance.json`
and the digest embedded in the sidecar `sourceUrl`. The pack's own `manifest.json` was not
used as proof — it is another lane's receipt. All four agree, and byte lengths match.

Visible form numbers and revisions were read off page 1 of each blank source:
`AOC-CV-226, Rev. 4/23`, `CC 6:11 Rev. 04/2024`, `CC 6:11.2 Rev. 12/2020`,
`CC 6:12 Rev. 04/2024`.

All 130 widget rectangles across the four `field-census.json` files were recomputed from
the source AcroForm and matched exactly, so the geometric findings rest on source bytes
rather than on the lane's own census.

**Standing gate-level blocker:** this pack carries only four PDFs. The contract's
corpus-wide counts — 499 source-library files, 329 PDFs — remain unverified. That is
outside this shard's four families and is reported as a gate blocker, not a family defect.

## What was verified clean

Every map, classification, sidecar, artifact, contact-sheet and raster hash recomputes
equal to disk, and every raster manifest is bound to the current artifact hash.

All twelve artifacts are flattened: zero AcroForm fields, zero widgets, zero annotations,
no XFA, no JavaScript, no OpenAction, no Additional Actions. The blank sources carry active
content — 70 JavaScript objects in the NC source, ComboBox calculate actions in the Nebraska
sources — and none of it survives. A raw byte scan reports `/AA` on CC 6:12; that resolves
to the font subset prefix `AAAZSD+TimesNewRomanPSMT` and is **not** a defect.

Every page carrying fields was rasterized and inspected. All 28 participant draws land
inside the rectangle of the field they were bound to; none writes into a protected slot.
Court, judge, clerk, prosecutor, attorney, agency, service, signature, notarization and
decision regions are blank on every page, including AOC-CV-226 side two — the notarization
and clerk page a page-1-only contract would have missed, and CC 6:11.2's order body,
`Dated`, `BY THE COURT` and `JUDGE` regions.

## Correction to the first pass

The first pass reported the Nebraska county value as correctly anchored, and called
`COUNTY, NEBRASKA` printed source text. The source shows both readings were wrong:

- `COUNTY, NEBRASKA` is the flattened **default value of the `fullcountystatementRIGHT`
  form field**, not page furniture.
- `fullcountystatementRIGHT` — not `enter the county` — is the county data slot. Its source
  calculate action is `event.value = this.getField("DROPDOWNCOUNTY2").value;`.
- `enter the county` is a caption **hint** field whose source value is literally
  `(Enter the county name)`.

So the county fact is written into the wrong slot. It is inside the rectangle of the field
it was bound to, which is why a rect-containment check passed it; the slot itself is wrong.

## Findings

### ESC-CAPTION-VARIANTS is not closed — all three Nebraska families

Recorded `corrected`, `provenAgainstThisFamilysBytes: true`. Its own mutation test:

> Flatten a form with an unselected dropdown: the prompt string must not appear in the page
> content stream.

Both prompts appear in all three current artifacts and in their committed page-01 rasters.
`TYPEOFCOURTDROPDOWN` and `DROPDOWNCOUNTY2` are ComboBoxes whose unselected default option
pairs an export value with the display label `Choose the court` / `Choose the county`. The
display label is what the appearance renders, and it survives because the finalizer refuses
to write the widget rather than clearing it:

- `Choose the court` at `(144.3,120.2,198.6,131.0)`, inside `TYPEOFCOURTDROPDOWN` `(142,119,221,133)`
- `Choose the county` at `(291.8,120.2,351.3,131.0)`, inside `DROPDOWNCOUNTY2` `(290,119,369,133)`

`Choose the court` also overprints the hint field `enter the type of court` at
`(147.8,117.8,225.0,128.5)`; neither string is legible. See the `*-reviewer-crop-caption-band.png`
files in this directory.

With the source in hand the failure is broader than the prompt. The caption band should
compose `IN THE DISTRICT COURT OF` + `EXAMPLE COUNTY, NEBRASKA`. It instead renders
`District Court` + `Example County` + the untouched `COUNTY, NEBRASKA` default, because:

- `matter.county` went into the hint field and the data slot was left at its default
- `TYPEOFCOURTRESULTS` received the bare name `District Court` rather than the export phrase
  its own calculate action defines

### ESC-NO-REFUSE-WHEN is not closed — AOC-CV-226

Recorded `provenAgainstThisFamilysBytes: true`, with the follow-up "the duplicated address
lines ... clear with the binding". They have not. Source geometry confirms which widgets are
which, and every address widget in the blank source is empty, so everything visible on the
filed artifact was written by this build:

- `ApplicantStreetNumberAndStreetNameLine1/2` at `(37,117,315,133)` / `(37,133,315,149)`,
  directly beneath the printed caption `Street Number And Street Name…` — classified
  `participant`, refused `no_allowlisted_fact_matches`, so the primary street is blank
- `ApplicantFullPermanentMailingAddressAddr1/2` at `(38,181,315,194)` / `(37,193,315,206)`,
  directly beneath `Full Permanent Mailing Address Of Applicant (if different than above)` —
  classified `participant`, refused `protected_category` / **`money`**; their label is
  glyph-id mojibake decoding to `Full Permanent Mailing Address`
- `…MailingAddressCity/State/Zip` — written with values identical to the block above

The filed sworn affidavit of indigency therefore carries no street address anywhere, while
`Springfield`, `XX` and `01234` each appear twice, filling a block the form conditions on
being "different than above". See `NC-aoc-cv-226-support-en-reviewer-crop-applicant-address-block.png`.

### Captured headings and labels are undecoded glyph ids

`regionHeading` is stored as raw Identity-H glyph ids for every field in CC 6:11 (19/19) and
CC 6:11.2 (9/9), and for 7 of 24 in CC 6:12. Decoding recovers real text —
`Neb. Rev. Stat. § 29-2264`, `PETITION TO SET ASIDE`, `vs .`. The heading channel
ESC-GEOMETRY-NOT-AN-INPUT depends on is fed unmatchable strings and cannot fire for these
families. This is the same guard whose failure held NE DC-1-15 back; its silence here is not
evidence of safety.

### Nebraska source records declare nothing

Only visible with the source in hand. The forms print their revision, and the archive paths
encode `REV-2024-04` / `REV-2020-12`, but all three Nebraska `source-record.json` files carry
`revision: null`, `officialTitle: null`, `declaredPages: null`, `structuralClassDeclared: null`,
`freshnessStatus: null` and `declaredFieldCount: 0` against 19/9/24 observed. `pageCountAgrees`
and `structuralClassAgrees` are therefore `null`, not `true` — nothing is declared, so nothing
can disagree, and no superseded-edition check can fire. NC declares every attribute and each
one agrees.

### CC 6:12 caption name — owner decision

`Adult name`, the `vs. ____, (your full name) Defendant.` caption slot at source rect
`(108,247,305,261)`, is classified `manual` and refused `classified_unwritable_by_role`. The
filed Motion carries no movant name in its caption while the same name is printed on page 2.
Both companion Nebraska forms bind their equivalent caption field and write it, and the source
shows the widget is an ordinary empty text field identical in kind to theirs.

The three forms disagree and nothing records which reading is intended. Both are defensible,
so this is an ownership decision for the RCAP document-ownership owner, not a mechanical
correction a reviewer may make.

## Record-integrity note

`gate-b-family-rerender-evidence.json` carries a stale `rerenderAttempt` block: at `24d1c5e8`
`extractMounted` flipped to `true` and `newArtifactsProduced` to `17`, but `result` still reads
"processed 0 families, 0 fields, 0 contact sheets", `privateCorpusMountedInThisClone` still
reads `false` and `artifactsChanged` still reads `0`. The per-family entries and the artifacts
on disk show the rerender did run. The narrative contradicts the record it sits in; no artifact
is implicated.

Historical verdicts and correction records were read and left unchanged. The private source
corpus remains uncommitted under the gitignored `private/` tree.
