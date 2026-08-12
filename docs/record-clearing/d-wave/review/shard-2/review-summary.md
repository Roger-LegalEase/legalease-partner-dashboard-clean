# D-wave corrected-family review — shard 2

Independent review. Nothing here was built by this reviewer, and nothing was fixed by this reviewer.

## Counts by disposition

| disposition | families |
| --- | ---: |
| `technical_approved` | 43 |
| `correction_required` | 8 |
| `held_on_source_or_design` | 43 |
| **total** | **94** |

## What was opened

| | count |
| --- | ---: |
| families in shard 2 | 94 |
| families inspected | 94 |
| finalized PDFs opened | 116 |
| contact sheets opened | 49 |
| verified source binaries opened | 94 (1 of them, TX GC-411.073, would not parse — see below) |

The shard rule was recomputed from scratch — `sha256(familyId) mod 3` over the full hex digest, as a BigInt — for all 253 corrected families. It reproduces the manifest's own shard split exactly (84 / 75 / 94) with **zero** disagreements, so the 94 families carrying `reviewShard: 2` are the correct set.

Source binaries were not taken on trust from the lane evidence. All three archives of release `rcap-d-source-packs-2026-08-12` were downloaded and their sha256 checked against the release digests before any of it was used. Every family's `sourceSha256` was then located in those packs and re-hashed.

## Findings tally

| check | findings |
| --- | ---: |
| active content (JS, /AA, Launch, OpenAction, SubmitForm, ImportData, URI, GoToR/E, RichMedia) | 0 |
| XFA present in a finalized artifact | 0 |
| residual interactive AcroForm fields after flatten | 0 |
| protected / withheld field carrying a value | 32 (across 7 families) |
| clipping, overlap, misplacement, or text below the 6pt floor | 0 |
| unresolved placeholders (TBD/TODO/lorem/xxx/{{…}}) | 0 |
| page order / page count divergence from source | 0 |
| output sha256 not matching the recorded hash | 0 |
| production hold dropped between source-record and manifest | 0 |

Every one of the 116 finalized artifacts is byte-inspectable (`useObjectStreams: false`), carries no active-content residue, no XFA, and no surviving interactive field. Every recorded artifact hash, contact-sheet `finalizedSha256` and `sheetSha256` matches the bytes on the branch. Every artifact's page count and page geometry matches its source. No production hold recorded in a family's `source-record.json` is missing from the manifest.

## By lane

| lane | approved | correction | held | total |
| --- | ---: | ---: | ---: | ---: |
| D1A | 11 | 0 | 1 | 12 |
| D1B | 2 | 7 | 6 | 15 |
| D1C | 4 | 0 | 1 | 5 |
| D2A | 5 | 0 | 10 | 15 |
| D2B | 7 | 0 | 4 | 11 |
| D3A | 9 | 1 | 16 | 26 |
| D3B | 5 | 0 | 5 | 10 |

## Blockers

### 1. Lane D1B records field withholdings and then ships artifacts that ignore them

This is the material finding of the shard. `d1b-regenerate.mjs` computes a binding decision per field, pushes deliberate legal-safety withholdings into `bindingRefusals` with `reason: "withheld_by_lane_review"`, and then calls `finalizeOfficialForm` with the **unfiltered** `census`. `finalizeOfficialForm` re-runs D0's `decideBinding` over every census entry, so the lane's withholdings never reach the renderer. Lane D1A does the opposite and is the working model:

```js
// d1a-regenerate.mjs
const laneRefusedNames = new Set(laneRefusals.filter((r) => r.field).map((r) => r.field));
const renderCensus = census.filter((f) => !laneRefusedNames.has(f.name));
```

The map and the artifact were written in the same commit, so this is not a stale render. 32 field-level leaks across 7 families. What is actually visible in shipped court forms:

| family | field | value printed | why the lane withheld it |
| --- | --- | --- | --- |
| KY:aoc-497-3-source-gated-en | `Defendants SSN` | Jordan Avery Reyes | As Def.VitalStats.SSN. |
| NC:aoc-cr-287-form-en | `PetitionerAddr2` | 118 Maple Street | The continuation line of the petitioner's address; as address2. |
| NC:aoc-cr-287-form-en | `DriversLicenseState` | XX | The state that issued the licence, which is not the participant's mailing state and is not held as a distinct fact. |
| NC:aoc-cr-297-form-en | `EmailAddressOfRecord` | 118 Maple Street | The district attorney's email inside a certificate-of-service block, and the binder was offering it the participant's st |
| NC:aoc-cv-226-support-en | `BankNameAndAccountType` | Jordan Avery Reyes | A bank name and account type on the affidavit of indigency. The binder matched the word 'Name'. Financial account detail |
| VA:cc-1201-a-form-en | `User.FullNameOfArrest` | Jordan Avery Reyes | The name the arrest record was made under. The form itself offers a 'same as above' box, so it is a different fact from  |
| VA:cc-1201-a-form-en | `User.CityOrCounty` | Springfield | The city or county of the court of final disposition -- a venue, not the participant's home city. Virginia's independent |
| VA:cc-1201-a-form-en | `User.AncillaryFullNameOfArrest` | Jordan Avery Reyes | The name used in the ancillary matter, a separate fact from the petitioner's legal name. |
| VA:cc-1201-a-form-en | `User.AncillaryCityOrCounty` | Springfield | Venue of the ancillary matter's court; as User.CityOrCounty. |
| VA:cc-1201-a-form-en | `User.AncillaryFullNameOfArrest1` | Jordan Avery Reyes | Further ancillary block; same reasoning. |
| VA:cc-1201-a-form-en | `User.AncillaryCityOrCounty1` | Springfield | Venue of a further ancillary matter's court. |
| VA:cc-1201-a-form-en | `User.AncillaryFullNameOfArrestD` | Jordan Avery Reyes | Further ancillary block; same reasoning. |
| VA:cc-1201-a-form-en | `User.AncillaryCityOrCountyD` | Springfield | Venue of a further ancillary matter's court. |
| VA:cc-1203-a-form-en | `User.FullNameOfArrest` | Jordan Avery Reyes | The name the arrest record was made under. The form itself offers a 'same as above' box, so it is a different fact from  |
| VA:cc-1203-a-form-en | `User.CityOrCounty` | Springfield | The city or county of the court of final disposition -- a venue, not the participant's home city. Virginia's independent |
| VA:cc-1203-a-form-en | `User.AncillaryFullNameOfArrest` | Jordan Avery Reyes | The name used in the ancillary matter, a separate fact from the petitioner's legal name. |
| VA:cc-1203-a-form-en | `User.AncillaryCityOrCounty` | Springfield | Venue of the ancillary matter's court; as User.CityOrCounty. |
| VA:cc-1203-a-form-en | `User.AncillaryFullNameOfArrestA` | Jordan Avery Reyes | Further ancillary block; same reasoning. |
| VA:cc-1203-a-form-en | `User.AncillaryCityOrCountyA` | Springfield | Venue of a further ancillary matter's court. |
| VA:cc-1203-a-form-en | `User.AncillaryFullNameOfArrestB` | Jordan Avery Reyes | Further ancillary block; same reasoning. |
| VA:cc-1203-a-form-en | `User.AncillaryCityOrCountyB` | Springfield | Venue of a further ancillary matter's court. |
| VA:cc-1203-b-form-en | `User.AncillaryFullNameOfArrest` | Jordan Avery Reyes | The name used in the ancillary matter, a separate fact from the petitioner's legal name. |
| VA:cc-1203-b-form-en | `User.AncillaryCityOrCounty` | Springfield | Venue of the ancillary matter's court; as User.CityOrCounty. |
| VA:cc-1203-b-form-en | `User.AncillaryFullNameOfArrestA` | Jordan Avery Reyes | Further ancillary block; same reasoning. |
| VA:cc-1203-b-form-en | `User.AncillaryCityOrCountyA` | Springfield | Venue of a further ancillary matter's court. |

The two that would matter most to a court: **NC AOC-CV-226** (Civil Affidavit of Indigency) prints the applicant's name in `BankNameAndAccountType` — the cell captioned *"Cash On Hand And In Bank Accounts (list name of bank and account type, do not list account no.)"* — and **KY AOC-497.3** prints the participant's name in `Defendants SSN`.

### 2. D0 descriptor ordering binds the wrong fact on composite field names

`FACT_DESCRIPTORS` in `rcap-field-semantics.mjs` resolves first-match-wins, but its order does not track specificity:

- `participant.street_address` sits above `participant.city`, `participant.zip` and `participant.email`, so `EmailAddressOfRecord`, `…MailingAddressCity` and `…MailingAddressZip` all bind the street address.
- `participant.full_legal_name` matches on a bare `\bname\b`, so `BankNameAndAccountType` and *"Street Number And Street Name"* bind the participant's name.
- `participant.city` sits above `matter.county`, so a Virginia `CITY OR COUNTY` **venue** field binds the participant's home city.

D1B diagnosed every one of these in its own withholding notes — the lane's read of the root cause is correct. Because blocker 1 discards those withholdings, the defects ship anyway. Note that blocker 1 alone does not clear **NC:aoc-cv-226-support-en**: three of its wrong bindings are *declared*, not withheld, and are visible on page 1 of the canonical fixture as `Jordan Avery Reyes` printed twice under "Street Number And Street Name" and `118 Maple Street` printed in the city and zip cells.

### 3. D0 factory cannot finalize a source carrying rich-text AcroForm fields

Reproduced first hand against the verified MO CR-145 binary: `sanitizeAndFlatten` → `form.updateFieldAppearances()` raises pdf-lib's `RichTextFieldReadError` on the field `Other Defendants`, and no artifact of any kind can be produced. Lane D3A's handling was correct — it disclosed the blocker, claimed no fill, and did not modify the source. The defect is the shared factory's.

## Claims checked, not inherited

| claim | verdict |
| --- | --- |
| MO CR-145 AcroForm handling | **confirmed** — reproduced; owner is the D0 factory, not the lane |
| WA anchor issues | **confirmed and correctly handled** — `blake-005` has a CID-only text layer (111 lines, zero Latin words); `crrlj-09-0200` and `crrlj-09-0800` yield no matchable participant label (columns interleave on shared baselines); `blake-003` measured labels and held the write box. No fill produced or claimed in any case |
| TX GC-411 page access | **partly confirmed** — only `tx-gc-411-073-instructions` is affected, and the cause is the source binary itself (`Expected instance of PDFDict, but got instance of undefined`), not page access in the factory. The other eight TX GC-411 families in this shard finalize normally |
| ESM issue around the non-filing notice | **not reproduced** — `finalizeOfficialForm` throws `NonFilingHoldError`, `instanceof` holds across the module boundary, and the notice survives on the error |
| UTF-8 issue in the shared verifier | **not reproduced as stated** — `scanBytesForActiveContent` decodes latin1 and redacts stream payloads before matching, which is correct, and returned `inspectable: true` with zero residue on all 116 artifacts. There *is* a real encoding limitation, but it is in text extraction, not the active-content scan (see XC-6) |
| CO JDF-683 overlay | **not in this shard** — its familyId does not hash to shard 2, so this review makes no finding about it |
| Descriptor gaps in the D0 factory | **confirmed** — see blocker 2 |

## Evidence-schema divergence across lanes

Recorded as a finding because it would mislead an importer, not merely because it is untidy:

- **Non-filing hold.** `source-record.json` carries `nonFilingNotice` in D1A/D1B/D1C/D2A — `null`, or an **object** `{notice, page, decodeBasis, cmapsConsulted, matched}` in D1B. D3A uses `nonFilingNoticeOnFace` instead. **D2B and D3B carry neither key.** The manifest flattens D1B's object to a **string**. A consumer keying on `source-record.nonFilingNotice` reads "no hold" for every D2B/D3A/D3B family.
- **`expectedValues` changes type.** An array in every lane except D3A, where `reports/protected-fields-scan.json` makes it a **number**. Iterating it throws — it threw in this review's own tooling before being guarded.
- **`field-census.json` counts different things under the same keys.** `rcap-field-census/v3-first-hand` and `v4-lane-d1c` count AcroForm terminal fields; D3B's `rcap-flat-slot-census/v1` counts measured flat rule-line blanks. Eight families in this shard report a non-zero `fieldCount` for a source with **zero** AcroForm fields.
- **`reports/populated-fields.json` changes shape** — a bare array in D1A/D1B/D2A/D2B/D3A, an object keyed `canonicalWritten`/`boundaryWritten` in D1C, `count`/`fields` in D3B.
- **The contact-sheet proof moves** between `contact-sheet/contact-sheet-proof.json` (D1A/D1B/D1C/D2A/D3A) and `reports/contact-sheet-proof.json` (D2B/D3B).
- **`productionHolds` is not a controlled vocabulary.** The same concept appears as `track_level_import_mapping_required`, `legal_review_mapping_requires_track_level_import_mapping`, `legal_review_mapping:requires_track-level import mapping` and `legal_review_requires_track-level import mapping`; currentness appears under four spellings. Some identifiers embed spaces and colons. `legalDesign` carries seven distinct spellings across 94 families, 31 of them the bare value `unrecorded`.

## Smaller findings

- **The shared contact-sheet proof can be satisfied by pre-printed text.** `missingExpectedValues` strips whitespace and tests substring containment against the whole document, so a short expected value is "proved visible" by any pre-printed occurrence. Six families pass the proof for a value that also appears on the *blank* panel: `XX`, `OR`, `ND`, `District Court`. In all six the value is genuinely written as well — confirmed here against a blank-flattened baseline — but the proof alone does not establish that.
- **D0 text extraction cannot read Identity-H CID text.** `extractTextItems` does not consult a font's ToUnicode CMap, so CID documents return glyph codes. Confirmed on the four NC non-filing families and WA `blake-005`. Bounded impact: factory-written values are drawn in WinAnsi Helvetica and read back correctly, so no visibility proof is wrong — but every source-text-derived check is blind on these documents. D1B and D2A each worked around it independently.
- **NH NHJB-2956** ships `canonical-filled.pdf`, `boundary-filled.pdf` and `negative-filled.pdf` byte-identical (nothing was bound). The lane discloses this in `reports/findings.json` and the manifest flags `finalized_artifact_review_without_contact_sheet`, so the evidence is honest — but `implementation_complete_pending_independent_review` plus three separately-named `finalPdfPaths` overstates it.
- **D1B contradicts itself on one fact across two adjacent forms.** AOC-CR-287 withholds `DriversLicenseState` ("the state that issued the licence … is not the participant's mailing state"); AOC-CR-297 *declares* `DLState <- participant.state`. Both print `XX`. One of the two is wrong.
- **Three NM families and one CO family** are labelled implemented, ship no artifact, and carry no manifest hold that says why. Each family's own `overlay-profile.json` does explain it (all measurable blanks refused; 38 and 33 refusals for NM 4-957 and 4-958), so the gap is in the manifest's hold vocabulary, not in the work.

## Checked and cleared

Things that looked like defects on first pass and are not:

- **Charge rows 2–3 filled in boundary fixtures** (IL, NC ×2, VT ×2) although the map lists them `repeating_row_without_indexed_fact`. The map is a canonical-fixture snapshot taken with one charge; the boundary fixture supplies three. Correct row-indexed behaviour.
- **Boundary artifacts with no drawn value** (NM ×3, WA `cr-08-0900`). Every boundary value was refused below the readable floor rather than clipped. This is the fail-closed path working; review criterion 5 is met by demonstrated refusal rather than by visible boundary values.
- **KY's red "NOTICE: Not all bowsers handle fillable PDFs…" block and the attorney-block prompt**, **CO JDF-612's 5.5pt glyph**, **TX's "is not" dropdown defaults**, **NH's `0.00` totals and `Lock & Save Form` / `Clear Form` / `Top of Page` button captions**. All source-origin: they come from the source's own field values, defaults and widget appearances, confirmed against a blank-flattened render of the same binary. None is a factory-written value, and the KY attorney field itself stays unwritten.
- **Apparent overflow at ~14pt on KY, VA, NC and VT boundary values.** A measurement artifact of the first pass: pdf-lib's standard Helvetica carries no `/Widths`, so D0's walker honestly reports `metricsExact: false` and falls back to 500/1000 per glyph, over-estimating width by roughly 7%. Re-measured with real Helvetica metrics — and checked against the appearance stream's own clip box (`1 1 m … 265.88 1 l h W n` on KY's `NAME`) — every value fits.

## Dispositions in detail

### `correction_required` — 8

- **KY:aoc-497-3-source-gated-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `81846d776`) — 1 correction record in `review-findings.json`
- **MO:cr145-form-petition-en** (D3A, `claude/rcap-d3a-regenerate-co-tx-nd-nh-mo` @ `321fef30d`) — 1 correction record in `review-findings.json`
- **NC:aoc-cr-287-form-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `1dc4201cb`) — 4 correction records in `review-findings.json`
- **NC:aoc-cr-297-form-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `1dc4201cb`) — 1 correction record in `review-findings.json`
- **NC:aoc-cv-226-support-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `1dc4201cb`) — 2 correction records in `review-findings.json`
- **VA:cc-1201-a-form-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `e7a22117b`) — 10 correction records in `review-findings.json`
- **VA:cc-1203-a-form-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `e7a22117b`) — 10 correction records in `review-findings.json`
- **VA:cc-1203-b-form-en** (D1B, `claude/rcap-d1b-regenerate-va-ky-nc` @ `e7a22117b`) — 4 correction records in `review-findings.json`

### `held_on_source_or_design` — 43

Families where the correct outcome is no participant fill, and no fill was produced. Verified by opening the source binary and confirming the hold or the no-fill basis first hand:

| recorded status | families |
| --- | ---: |
| `implementation_complete_pending_independent_review` | 20 |
| `no_fill_instructional_document` | 7 |
| `implemented_pending_independent_review` | 5 |
| `held_not_for_filing_no_fill_produced` | 4 |
| `overlay_no_participant_label_matched` | 3 |
| `overlay_labels_measured_write_box_pending_review` | 2 |
| `no_fill_service_block_document` | 1 |
| `overlay_no_extractable_text_layer` | 1 |

The four `held_not_for_filing_no_fill_produced` families are the NC translations whose own face reads *"DO NOT COMPLETE THIS FORM FOR FILING"*. On the three Vietnamese forms that text is drawn as Identity-H CIDs; decoding the CIDs independently recovers the notice on all three. No fixture artifact of any kind exists for any of the four.

### `technical_approved` — 43

Families whose finalized artifacts were opened and passed every check. 42 of the 43 also had their contact sheet opened and its blank/filled panels compared.

Approval here is **technical only**. Every family in this shard carries `edition_1_runtime_disabled`, `f_independent_visual_review_required` and `state_manifest_generation_allowed_no`; 21 have an open currentness gate and 13 need revision confirmation; 63 carry a legal-design or legal-review hold and 31 have it recorded as `unrecorded`. None of those holds is cleared by anything in this review, and none was found to have been silently cleared by a lane.

## Method

- Every finalized PDF and contact sheet was extracted from its lane branch at the manifest-recorded commit with `git cat-file blob` and opened with pdf-lib.
- Every source binary was taken from the verified release packs, re-hashed, and opened.
- What the factory WROTE was separated from what the SOURCE already carried by diffing each artifact's drawn text against a blank-flattened render of the same source binary, round-tripped through save/load so pdf-lib's flattened appearances are readable by D0's walker.
- Value geometry was measured with the metrics of the font that actually draws each run; where D0's walker reports metricsExact:false (pdf-lib's standard Helvetica carries no /Widths) the width was recomputed from Helvetica metrics rather than the 500/1000 fallback.
- Each drawn value was attributed to an exact field by matching the flattened widget XObject's placement and BBox to the census rectangle, not by guessing from overlapping rectangles.
- A sample of artifacts was rasterised with pdftoppm and read as images.

Two corrections to this reviewer's own first pass are worth recording, because both would have produced false findings:

1. The blank baseline must be **saved and reloaded** before its text is extracted. pdf-lib's freshly flattened appearances are in-memory content streams, and D0's walker only decodes `PDFRawStream`, so an unsaved baseline reads as if the form were empty — which made every source-supplied field value look like a factory fill.
2. A drawn value must be attributed to a field by matching the flattened widget's XObject placement and BBox to the census rectangle. Adjacent charge-table columns overlap by a couple of points, so "first box whose left edge is behind this glyph" picks the wrong column and invents overflow.
