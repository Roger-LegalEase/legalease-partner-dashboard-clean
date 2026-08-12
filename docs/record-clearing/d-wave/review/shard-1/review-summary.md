# D-wave corrected-family review — shard 1

Independent review. The reviewer built none of this and fixed none of it. Every
disposition below rests on opening the artifact; the JSON evidence was read as a
claim and checked against the PDF.

- Review branch: `claude/rcap-review-d-corrected-shard-1`
- Reviewed from: `4da1b0d56f393ea9f326666228484d0c2ec9102a`
- D0 base: `03c14f985beda55596b894686bf70833e44a8f5b`
- Machine-readable detail: `review-findings.json`

## Counts by disposition

| Disposition | Families |
| --- | --- |
| `technical_approved` | 24 |
| `correction_required` | 19 |
| `held_on_source_or_design` | 32 |
| **Total in shard** | **75** |

28 findings were raised across the 19 families requiring correction.

## What was opened

| | |
| --- | --- |
| PDFs opened | 144 |
| Canonical fixtures | 43 |
| Boundary fixtures | 43 |
| Negative fixtures | 15 |
| Contact sheets | 43 |
| Official source binaries | 73 |
| Pages rasterised for visual confirmation | 5 families |

The shard rule was recomputed rather than trusted: `sha256(familyId) mod 3` over
the full hex digest, across all 253 corrected families, reproduces the recorded
shard for every one of them and the recorded shard counts `[84, 75, 94]` exactly.

Source identity was verified first-hand, not just for internal consistency. The
`rcap-d-source-packs-2026-08-12` release was downloaded, each pack's own sha256
confirmed against its manifest, and every one of the 75 declared source hashes
resolved to a real file in the packs. For all 67 families that declare a
canonical path, the file carrying the declared hash has the declared filename.

## The five defects on the face of a filed document

These are the findings that would reach a court. Each was confirmed by decoding
the finalized artifact's page content, including text inside flattened widget
appearances, and four of the five were also confirmed by rendering the page.

**1. NC AOC-CR-288 fills the attorney block with the petitioner.**
Under the printed heading "Name And Address Of Petitioner's Attorney For
Expunction Petition", the finalized petition prints the petitioner's own name,
city, state and ZIP (`NameAtty`, `CityAtty`, `StateAtty`, `ZipCodeAtty`). A
filed AOC-CR-288 would name the petitioner as their own attorney of record.

**2. NC AOC-CR-288 writes the petitioner's name into the court's findings of
fact.** AOC-CR-288 is a combined petition and order. Item 5 of FINDINGS OF FACT
reads "Petitioner [ ] is [ ] is not eligible … If not eligible, it is because:"
followed by two rules. Both rules carry the petitioner's name, so the order
states that the reason for ineligibility is the petitioner's own name, while the
is/is-not election above stays blank.

**3. VA CC-1203 puts the court name where the venue locality belongs.** The
caption rule at y=617 is labelled "CITY OR COUNTY" in the source's own printed
text at y=607, with "Circuit Court" printed to its right. `User.CourtName` writes
`matter.court`, so the filed caption reads "……District Court…… Circuit Court" and
the locality is never stated. This family's census records `printedContext: null`
— the printed-label gate that D2A and D1C apply was not applied here.

**4. MO CR300 asserts an arrest locality nobody supplied.** "County Where Arrest
Occurred" is bound to `matter.county`, the venue county, with no explicit
mapping. The petition therefore tells a Missouri court where the arrest happened
using a fact that describes something else. D0 guards the *dates* of the criminal
event behind `requiresExplicitMapping` on exactly this reasoning; the locality of
the event carries no such guard.

**5. NE CC-6-12 and CC-6-15.1 ship an illegible caption.** Flattening paints two
instructional strings on top of each other: "(Enter the type of court)" at
y=665.9 over "Choose the court" at y=663.5, both 8pt, 2.4pt apart — and the same
collision for the county slot. Neither the court nor the county value is written,
so the venue line of the filed motion is overlapping guidance text.

Alongside these, **NH NHJB-2311, NH NHJB-3057, VA CC-1203 and VA CC-1473** ship
filings with the source form's interactive buttons baked in as printed matter —
bordered grey "Clear Form", "Lock & Save Form", "Top of Page", "Clear All Data" —
and NHJB-2311 additionally prints "Enter /s/ before name" inside its signature
widget. **VA CC-1473** fills three rules labelled "[ ] PETITIONER [ ] ATTORNEY FOR
PETITIONER" without ever marking the election, because checkboxes are outside the
writable types, leaving the contact block attributable to counsel on its face.

## D0 shared-factory defects confirmed

All seven lane heads carry byte-identical copies of the D0 shared modules, so
these are inherited, not lane-local.

| Defect | Module | Families in shard |
| --- | --- | --- |
| Contact sheet embeds unsanitised source and is never scanned | `rcap-contact-sheet.mjs` | 19 |
| `form.flatten()` bakes buttons, dropdown captions and helper text into filings | `rcap-active-content.mjs` | 6 |
| Attorney protect rule misses the `Atty` abbreviation | `rcap-field-semantics.mjs` | 1 |
| `full_legal_name` descriptor matches `/petitioner/`, capturing narrative court fields | `rcap-field-semantics.mjs` | 1 |
| Event *locality* is not guarded the way event *dates* are | `rcap-field-semantics.mjs` | 1 |

The contact-sheet defect is the widest. `buildContactSheet` embeds the raw blank
bytes with `embedPdf`, which copies the source page's `/Annots` widgets and
everything they reference — `/AA` dictionaries and `/S /JavaScript` action
objects — then calls `sheet.save()` with no sanitize, no rebuild and no residue
scan. For NC AOC-CR-288 this was proved without any re-serialisation: six of the
stored sheet's FlateDecode streams inflate to object-stream payloads holding
`/JS (AFDate_FormatEx("mm/dd/yyyy");) /S /JavaScript` verbatim. The NJ CN-10557
sheet carries 3,419 widget annotations copied from its source. Because `save()`
defaults to object streams, a caller that *did* scan the stored sheet would get
`inspectable: false` rather than a verdict — so the D0 scanner's own refusal to
certify a compressed file is being silently bypassed. The finalized fixtures are
clean; only the review artifact is affected.

## Lane-reported claims, weighed rather than inherited

| Claim | Verdict |
| --- | --- |
| TX GC-411 page access | **Reproduced.** GC-411.0729 fails to load with the identical pdf-lib error the lane recorded, and the manifest carries the matching hold. GC-411.0725 and 0727 open normally, so it is that binary, not the set. |
| CO JDF-683 overlay | **Confirmed as a deliberate hold, not a defect.** No fill was produced and the withholding rationale is recorded. |
| WA anchor issues | **Consistent with the recorded statuses.** All five WA families produced zero artifacts; nothing was shipped. |
| ESM issue around the non-filing notice | **Not reproduced.** Both held families carry a fully populated notice object and produced no fill; a scan of every artifact for do-not-file language surfaced nothing unrecorded. |
| UTF-8 scan issue in the shared verifier | **Not reproduced.** Across 144 artifacts the scanner produced no false positive on any fixture, and every hit it did produce was independently corroborated by inflating the stored object streams. |
| MO CR-145 AcroForm handling | **Out of shard.** Not assessed. |

## Evidence consistency

The prompt's suspicion about inconsistent hold naming is correct, and it is worse
than one field. The non-filing hold is recorded four different ways — D1A writes
`nonFilingNotice` plus a boolean `nonFilingHoldEnforced`, D1B/D1C/D2A write
`nonFilingNotice` alone, D3A writes `nonFilingNoticeOnFace`, and D2B and D3B
write nothing at all. The manifest exposes a single `nonFilingNotice` key, so an
importer reading it gets `undefined` for every D3A family and has no field to read
for D2B or D3B: 39 of the 75 families in this shard. No concrete missed hold
exists in this shard today — every affected source-record holds a null notice, and
the artifact scan found no unrecorded face notice — so the defect is in the
contract, not yet in the data.

`legalDesign` is in the same state and it gates `approved_for_live`: seven
distinct spellings across seven lanes, three of which differ only in punctuation
and word order, and 25 of 75 families recorded as `unrecorded`. Per-family
evidence files diverge too — `populated-fields.json` has three incompatible
shapes, `overflow-and-clipping.json` has seven, the contact-sheet proof lives at
two different paths, and the census records its provenance under `censusBasis` in
six lanes and `basis` in D3B.

Finally, the manifest carries `activeContentResidue: null` for 13 families that
shipped a fill and `protectedFieldScanPass: null` for four. The four — LA
CCRP-999.1 and the three NM families — have a protected-fields *policy* list but
no read-back from the rendered artifact, and they are anchor-placed overlays,
where a read-back matters more than on an AcroForm. This reviewer scanned all of
them directly and their finalized fixtures are clean, so the artifacts are sound;
it is the recorded evidence that is missing.

## What held up

Everything else did, and it held up under first-hand measurement rather than on
the strength of the reports.

- **Determinism.** All 144 recorded sha256 values and byte lengths match the
  extracted artifacts. Every artifact carrying a date uses the pinned
  `D:20260101000000Z`, with no `/ID` array and no `/Producer`. Running D0's
  `finalizeOfficialForm` twice against the verified source for seven families
  produced byte-identical output every time. Lane output cannot be reproduced from
  D0 alone, because each lane adds refusal gates on top; what is established is
  that the factory is deterministic and every recorded hash matches what shipped.
- **Official appearance.** Across all 43 fillable families, page count, page size
  and page order match the source binary exactly, and every printed line of the
  source is still present in the output. The apparent "lost lines" are all cases
  where a written value merged into a printed line, which is the fill working.
- **Active content in the filed artifacts.** Zero markers and zero structural hits
  across every canonical, boundary and negative fixture, by byte scan of an
  inspectable serialisation and by walking the loaded document model for
  `/OpenAction`, `/AA`, `/XFA`, name-tree JavaScript and active annotation
  subtypes.
- **Protected fields.** Recomputing `protectCategoryOf` over every census field
  found no family writing into a field the shipped rules classify as protected,
  and testing whether renderer-added text lands inside any protected widget
  rectangle surfaced only the NH signature-block placeholder described above. The
  NC attorney-block defect is invisible to this test precisely because the rule
  misses `Atty` — which is the finding.
- **Clipping and fit.** Measured on each value's own runs against its own widget
  rectangle: no truncation, no overflow past a box edge, no value drawn below its
  box, and nothing below the 6pt floor. Boundary values that are absent are absent
  because the fitter refused rather than clipped — confirmed from the artifact, by
  checking that the widget holds no fragment of the value, not from the reports.
- **Placeholders.** No `TBD`, `TODO`, `lorem`, `xxx` or `{{…}}` in any artifact.
- **Non-filing holds.** Both held families produced zero fill artifacts.
- **Holds preserved.** No production hold in the manifest is missing from its
  family's source-record, `generationAllowed` is false everywhere, and every
  family's `currentness` matches its source-record's `freshnessStatus` exactly.

## Dispositions

### `correction_required` (19)

CO:jdf-641-form-motion-en · FL:fl-4th-judicial-circuit-duval-county-en ·
IA:rule-2-86-form-4-application-to-expunge-underage-alcohol-records ·
IL:exp-ad-request-form-en · MO:cr300-source-gated-petition-en ·
NC:aoc-cr-288-form-en · NC:aoc-cr-296-form-en · NC:aoc-cr-298-form-en ·
ND:nd-north-dakota-pardon-advisory-board-applica-support-instructions-en ·
NE:cc-6-12-form-en · NE:cc-6-15-1-form-en · NH:nhjb-2311-support-fee-waiver-en ·
NH:nhjb-3057-form-petition-en · NJ:cn-10557-en ·
TX:tx-gc-411-0725-form-petition-en · TX:tx-gc-411-0727-form-petition-en ·
VA:cc-1203-form-en · VA:cc-1473-form-en · WI:dj-le-247-support-en

Eleven of these nineteen are here for the contact-sheet residue alone; their
finalized fixtures are clean and the fix is in D0, not in the lane.

### `technical_approved` (24)

AL:c-10-criminal-form-en · the nine AR ACIC order and petition families ·
CO:jdf-477-form-motion-en · KS:ksjc-source-gated-en · LA:la-ccrp-art-999-1-en ·
MO:cr375-form-petition-en · NM:nm-4-952-en · NM:nm-4-956-en ·
NM:nm-local-conviction-order-en · both OR families · UT:1002ex · UT:1020ex ·
UT:1022ex · UT:1305ge · WI:cr-266-form-en

Technical approval means the artifact passes the technical and safety checks in
this review. It is not release approval: every family in this shard remains under
its recorded production holds, including
`f_independent_visual_review_required` and the legal-design blocker.

### `held_on_source_or_design` (32)

Thirty-two families produced no fill and none should have. Two are explicit
non-filing holds (NC AOC-CR-288 instructions ES and NC AOC-CV-226 VI), both
carrying the "DO NOT COMPLETE THIS FORM FOR FILING" notice read off the source's
own face. The rest are instructional documents, court-issued orders, an
outside-party document, a `.docx` outside the PDF factory's scope, one binary the
loader cannot traverse, and overlays whose anchors were withheld after review.
Every one produced zero PDFs, which was verified by listing the artifacts rather
than by reading the status.

## Limits of this review

Legal sufficiency, venue rules and statutory fit are outside its scope. MO CR-145
falls outside shard 1. Boundary absences were classified as fitter refusals from
the artifact; the lanes' refusal records were read but did not decide the call.
