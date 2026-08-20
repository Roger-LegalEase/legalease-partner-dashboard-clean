# Gate B — Independent Review, Wave C, Shard C

Review-only record. This shard created no artifact, map, classification, sidecar or
raster, and repaired nothing.

- Review base: `e94fb456b13dacd05479641bc3c4fe37eb898d07`
- Reviewed branch: `claude/rcap-pdf-family-rerender-mounted`
- Reviewer branch: `claude/epic-newton-022oud` (distinct from the reviewed branch)
- Machine-readable records: [`assignment.json`](../../../../data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/assignment.json),
  [`verdicts.json`](../../../../data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/verdicts.json)
- Focused verifier: `node data/rcap-all50/pdf-independent-reviews/wave-c-shard-c/verify-wave-c-shard-c.mjs`

## Denominator

Sixteen families satisfy every criterion this reviewer could evaluate against disk:
finalized artifact hash present and recomputed-equal, all-page evidence present, every
relevant page rasterized, raster manifest bound to the current artifact, sidecar
recomputed-equal and carrying 24 fields with no null, and not NE DC-1-15. Sorted
lexicographically and sliced at `[8:12]`, this shard owns:

| # | Family | Verdict |
|---|--------|---------|
| 8 | `NC:aoc-cv-226-support-en` | correction_required |
| 9 | `NE:cc-6-11-2-form-en` | correction_required |
| 10 | `NE:cc-6-11-form-en` | correction_required |
| 11 | `NE:cc-6-12-form-en` | substantive_owner_decision_required |

No overlap with shards a, b or d; NE DC-1-15 excluded.

## Blocker: source bytes could not be verified

The review contract requires recomputing SHA-256 from the official source bytes under

```
RCAP_BUNDLE_EXTRACT=/home/user/legalease-rcap-pdf-inventory-closure/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1
```

That path does not exist on this review machine. An exhaustive filesystem search found no
Master Library extract, no 499-file source library and no 329 PDFs; the repository's
`private/` tree is gitignored and was never materialized in this clone. The required
counts could not be checked, and no blank source binary could be opened or hashed.

Because the contract forbids accepting another lane's receipt as source proof, **no family
in this shard was eligible for `approved_platform_ready` on the source axis**, independently
of the defects below. Each pinned source digest is carried forward marked unverified.

The blank-source appearance was inspected only through the blank panel embedded in each
family's committed contact sheet, which is sufficient to attribute page content to source
versus fill but not to establish source identity.

## What was verified

Every map, classification, sidecar, canonical artifact, boundary artifact, contact sheet
and raster hash was recomputed from disk and matches both the evidence record and the
sidecar. Every raster manifest is bound to the current artifact hash — no stale evidence
package is describing a superseded artifact.

All twelve artifacts are flattened: zero AcroForm fields, zero widgets, zero annotations,
no XFA, no JavaScript, no OpenAction and no Additional Actions. A raw byte scan reports
`/AA` in the CC 6:12 artifacts; that resolves to the font subset prefix
`AAAZSD+TimesNewRomanPSMT` and is **not** a defect.

Every page carrying fields was rasterized and inspected, blank panel against filled panel.
All 28 participant-derived draws across the four families lie inside their intended writable
rectangles; none writes into a protected slot. Court, judge, clerk, prosecutor, attorney,
agency, service, signature, notarization and decision regions are blank on every page,
including AOC-CV-226 side two — the notarization and clerk page a page-1-only contract
would have missed.

Two lane-reported gaps were closed by measurement rather than accepted: the
`notLocatableBecauseTooShort` entries for AOC-CV-226's two `XX` state values were located
inside their own rectangles, and the apparent third `01234` on page 1 is the tail of the
case number `24-CR-001234` in `FileNumber`, not a stray ZIP.

## Findings

### ESC-CAPTION-VARIANTS is not closed — all three Nebraska families

The rerender record marks this escalation `corrected` with
`provenAgainstThisFamilysBytes: true`. Its own stated mutation test is:

> Flatten a form with an unselected dropdown: the prompt string must not appear in the page
> content stream.

Both prompt strings appear in the page content stream of all three current finalized
Nebraska artifacts, and in their committed page-01 rasters:

- `Choose the court` at `(144.3,120.2,198.6,131.0)`, inside the refused
  `TYPEOFCOURTDROPDOWN` rect `(142,119,221,133)`
- `Choose the county` at `(291.8,120.2,351.3,131.0)`, inside the refused
  `DROPDOWNCOUNTY2` rect `(290,119,369,133)`

`Choose the court` also overprints the court's own printed caption
`(Enter the type of court)` at `(147.8,117.8,225.0,128.5)`; the two strings collide and
neither is legible. Refusing to write a widget does not clear its stale appearance stream,
so the prompt survives flattening.

See `NE-*-reviewer-crop-caption-band.png` in this directory.

### County caption slot — overlap undetected

`selectOnePerSlot()` reduced the court-side trio to one binding and refused the other two as
`duplicate_widget_for_one_slot`. The county side was not reduced: `fullcountystatementRIGHT`
overlaps the bound `enter the county` by 51% and was refused only as
`no_allowlisted_fact_matches`. The drawn value sits 100% inside its intended anchor but 82%
inside the refused sibling, so ownership of that slot is geometrically ambiguous. Because
`COUNTY, NEBRASKA` is printed source text, the filed caption reads
`Example County COUNTY, NEBRASKA`.

### Captured headings and labels are undecoded glyph ids

`regionHeading` is stored as raw Identity-H glyph ids for every field in CC 6:11 (19/19) and
CC 6:11.2 (9/9), and for 7 of 24 in CC 6:12. Decoding with the subset offset recovers real
text — `Neb. Rev. Stat. § 29-2264`, `PETITION TO SET ASIDE`, `vs .`. The heading channel that
ESC-GEOMETRY-NOT-AN-INPUT depends on is therefore fed unmatchable strings, so any
heading-keyed protection cannot fire for these families. This is the same guard whose failure
held NE DC-1-15 back; its absence here is not evidence of safety.

### ESC-NO-REFUSE-WHEN is not closed — AOC-CV-226

The record marks it `provenAgainstThisFamilysBytes: true`, and its own follow-up says
"the duplicated address lines ... clear with the binding". They have not cleared. The guard
over-refuses on one side and under-refuses on the other:

- `ApplicantStreetNumberAndStreetNameLine1/2` — classified `participant`, refused
  `no_allowlisted_fact_matches`, so the primary street address is blank
- `ApplicantFullPermanentMailingAddressAddr1/2` — classified `participant`, refused
  `protected_category` / **`money`**; their label is glyph-id mojibake that decodes to
  `Full Permanent Mailing Address`
- `...MailingAddressCity/State/Zip` — written with values identical to the block above

The filed sworn affidavit of indigency therefore carries no street address anywhere, while
`Springfield`, `XX` and `01234` each appear twice, filling a block the form conditions on
being "different than above". See
`NC-aoc-cv-226-support-en-reviewer-crop-applicant-address-block.png`.

### CC 6:12 caption name — owner decision

`Adult name`, the `vs. ____, (your full name) Defendant.` caption slot at `(108,247,305,261)`,
is classified `manual` and refused `classified_unwritable_by_role`. The filed Motion carries
no movant name in its caption, while the same participant's name is printed on page 2. Both
companion Nebraska families in this shard resolve the identical slot the other way — CC 6:11
and CC 6:11.2 bind their caption field to `participant.full_legal_name` and write it.

The three Nebraska forms disagree with each other and nothing records which reading is
intended. Both are defensible, so this is an ownership decision for the RCAP
document-ownership owner, not a mechanical correction a reviewer may make.

## Record-integrity note

`gate-b-family-rerender-evidence.json` carries a stale `rerenderAttempt` block: at
`24d1c5e8` ("the rerender that actually ran — 17 families, real bytes") `extractMounted`
flipped to `true` and `newArtifactsProduced` to `17`, but `result` still reads "processed 0
families, 0 fields, 0 contact sheets", `privateCorpusMountedInThisClone` still reads `false`
and `artifactsChanged` still reads `0`. The per-family entries and the artifacts on disk show
the rerender did run. The narrative block contradicts the record it sits in and should be
refreshed; no artifact is implicated.

Historical verdicts and correction records were read and left unchanged.
