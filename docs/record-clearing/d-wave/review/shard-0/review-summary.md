# D-Wave Corrected Families — Independent Review, Shard 0 of 3

| Disposition | Families |
| --- | ---: |
| `technical_approved` | **37** |
| `correction_required` | **34** |
| `held_on_source_or_design` | **13** |
| **Total in shard** | **84** |

84 families inspected, 84 of 84 opened. 147 artifact PDFs opened (103 finalized fixtures, 44 contact sheets) plus 84 source binaries. No artifact was approved from JSON alone.

Shard membership was recomputed independently — `sha256(familyId) mod 3` over the full hex digest — and agrees with every recorded `reviewShard` across all 253 families in the manifest. Shard sizes 84 / 75 / 94 match the manifest's `shardCounts`. **0 disagreements.**

This review is read-only. Nothing was fixed, rebuilt, re-rendered or merged.

---

## Evidence basis

The three source-pack zips were pulled from release `rcap-d-source-packs-2026-08-12` and their sha256 digests matched the release metadata exactly. Every statement below about source identity is measured against those bytes, not against a lane's own JSON. Artifacts were read off the lane branches with `git cat-file` at each family's recorded commit.

D0 modules were used read-only for inspection: `extractTextItems`/`groupIntoLines` (which recurse into flattened appearance XObjects, so a filled form reads back as filled), `scanBytesForActiveContent`, `missingExpectedValues`, and `protectCategoryOf`.

---

## What passed across the whole shard

- **Source identity.** All 84 sources resolved. Every sha256 recorded in the manifest, source-record, field-census and field map matched the actual source bytes; every `byteLength` matched. `documentId`, `revision` and canonical path agree between manifest and source-record. **0 mismatches.**
- **Determinism.** Every recorded output sha256 reproduced the extracted artifact byte for byte across all 147 artifacts, as did every contact-sheet `finalizedSha256`/`sheetSha256` and the manifest's `contactSheetProof`. **0 mismatches.**
- **Protected and outside-party fields.** 194 written fields across 73 families re-judged with the factory's own `protectCategoryOf`. **0** fall in a protected category. No court, clerk, prosecutor, attorney, agency, service-recipient, signature, notary, money, race or responsible-official field was written anywhere in the shard.
- **Placeholders.** 0 occurrences of TBD, TODO, lorem ipsum, xxx, FIXME, `{{…}}` or `<<…>>` in any artifact.
- **Font floor.** **0** renderer-written runs below 6pt across all 103 finalized fixtures.
- **Clipping of written values.** 174 value-runs matched to their widget geometrically and re-measured with true Helvetica metrics: **0** overflow. The 24 empty widget slots are all boundary-fixture refusals — correct fail-closed behaviour.
- **Page count and order.** Artifact page count equals source page count for all 44 filled families; 144 of 150 pages confirmed in position with a probe line unique to that source page. **0** reordering.
- **Active content in filing artifacts.** All 103 finalized fixtures were written without object streams, were genuinely inspectable, and scanned clean. 0 residual AcroForm fields, 0 `/XFA` keys.
- **Hold preservation.** **0** production holds dropped between source-record and manifest. `currentness` and `legalDesign` non-empty for all 84. Nothing silently cleared.
- **Non-filing holds.** All 4 held families produced no PDF at all, and the DO NOT COMPLETE THIS FORM FOR FILING notice was confirmed first-hand in each source binary.

---

## Findings

### 1. Non-printing and hidden widget ink is flattened onto the filed artifact — 15 families, blocker/major

Owner: **D0 shared factory**, `scripts/rcap-official-forms/rcap-active-content.mjs`, `sanitizeAndFlatten()`.

`form.flatten()` is called unconditionally, and nothing anywhere in `scripts/rcap-official-forms/` inspects an annotation's `/F` flag bits. Per PDF 32000-1 §12.5.3, an annotation without the Print bit (value 4) does not print, and one with the Hidden bit (value 2) must not render at all. pdf-lib draws every widget appearance regardless, so ink the official form never shows is now on the filed page.

Worst case — **`NE:dc-6-7-2-form-en`** (67 leaked runs, 2 from Hidden widgets). Page 1 of the finalized Order to Proceed In Forma Pauperis now prints:

- `"The items in this box will NOT print on your form."` — the form's own helper box, printing;
- `"Type of Case - Check only one: … Civil (includes divorce, child support, custody, …)"`;
- every mutually exclusive caption variant stamped over the others: `IN THE MATTER OF THE ESTATE OF:`, `IN THE INTEREST OF`, `IN THE MATTER OF THE ADOPTION`, `RE EMANCIPATION`, `NAME CHANGE OF`, `(Decedent)`, `Juvenile`, `A Minor`, with `"IN"` and `"RE"` double-stamped at identical coordinates.

`NE:cc-6-11` and `NE:cc-6-11-2` overlay dropdown captions `"Choose the court"`/`"Choose the county"` at y663.5 on top of the printed `"(Enter the type of court)"`/`"(Enter the county name)"` at y665.9 — 2.4pt apart. `KY` (×6) prints `Print`/`Reset`; `AZ` (×2) prints `Reset`; `NH` (×3) prints `Clear Form`, `Lock & Save Form`, `Top Page`; `VA:cc-1201` prints `Clear All Data` from a button titled `ResetButton`.

**Acceptance condition.** Before `form.flatten()`, remove or suppress every widget annotation whose `/F` lacks the Print bit or sets the Hidden bit. Re-verify that no text run inside such a widget's `/Rect` appears in the artifact but not in the untouched source's printed page content.

Affected: `AZ:aoccrsl1f-050825-form-en`, `AZ:aoccrsl2f-050825-form-en`, `KY:aoc-334-form-en`, `KY:aoc-496-form-en`, `KY:aoc-496-2-form-en`, `KY:aoc-496-3-form-en`, `KY:aoc-496-4-form-en`, `KY:aoc-497-form-en`, `NE:cc-6-11-form-en`, `NE:cc-6-11-2-form-en`, `NE:dc-6-7-2-form-en`, `NH:nhjb-2317-form-petition-en`, `NH:nhjb-3056-form-petition-en`, `NH:nhjb-3124-form-petition-en`, `VA:cc-1201-form-en`.

### 2. Active-content residue in delivered contact sheets — 20 families, major

Owner: **D0 shared factory**, `rcap-contact-sheet.mjs`, `buildContactSheet()`.

Re-serialized without object streams, 20 of 44 contact sheets match residue markers: `document_javascript`, `field_javascript`, `additional_actions`, and in five cases `uri_action`. They still carry `/Widget` dicts with `/AA → /JS (/S /JavaScript)` objects (e.g. `AFDate_FormatEx`) copied in when `embedPdf` deep-copied the blank source's page dictionary.

The objects are **unreachable** from the page tree — no `/AcroForm`, `/Names` or `/OpenAction` — so a viewer will not execute them. But `RESIDUE_MARKERS` is documented to catch precisely "a stream object that is still present even though nothing references it any more", so this fails the project's own standard and would trip a downstream PDF/DLP scanner. **The finalized filing artifacts are clean.**

**Acceptance condition.** `buildContactSheet` must sanitize the embedded bytes (or rebuild so no source widget objects are copied), save with `{ useObjectStreams: false }`, and assert `scanBytesForActiveContent` returns `inspectable: true` with `hits: []` before writing.

### 3. Systemic — the contact-sheet active-content verdict is fail-open — all 44 contact sheets, major

`buildContactSheet` saves with pdf-lib defaults, so every contact sheet uses object streams. `scanBytesForActiveContent` then returns `{ hits: [], inspectable: false, compressed: true }` — its own documented refusal to give a verdict — and callers record the empty `hits` array as a clean result.

**No contact sheet in this shard was ever actually verified for active content**, and in 20 of 44 that unverified pass is masking the real residue in finding 2. Reported once here rather than against 44 families, so the 20 that need artifact changes stay visible.

**Acceptance condition.** `inspectable: false` must fail closed in every caller, never pass.

### 4. Boundary refusal absent from the overflow ledger — 3 families (NH), major

Owner: **Lane D3A**.

On `NH:nhjb-2317`, `nhjb-3056` and `nhjb-3124`, the boundary case number `2023CR004182-CONSOLIDATED-WITH-2023CR004183-AND-2023CR004184` needs 210.4pt at the 6pt floor against a 196.93pt widget (p1, x=127.73 y=649.84). The renderer correctly left it blank — **the artifact is right**. But `reports/overflow-and-clipping.json` records `refusedBelowFloor: 0` and contains no entry for the field; its only finding is a shrink on `Mailing Address.1`. The ledger positively asserts nothing was refused below the floor, which is false.

This is specific to the NH forms, not the shared fitter: sibling D3A forms (CO JDF-2371, TX GC-411.0726/0728/0729/0732) record the identical refusal as `refused_below_readable_floor`.

**Acceptance condition.** Each NH family's ledger must carry a refusal entry for `case number` on the boundary fixture naming the value, widget rect, `minFontSize` 6 and `requiredWidthAtMin` 210.4, with `refusedBelowFloor` equal to the number of such entries.

### 5. Anchor capture cannot decode subset-font text — 4 families (WA), blocker/major

Owner: **D0 shared factory**, `rcap-pdf-anchor-capture.mjs`, `loadFonts()`.

`loadFonts` reads only `Subtype`, `FirstChar`, `Widths` and `MissingWidth`, and never consults `/ToUnicode` or `/Encoding /Differences`, so content-stream byte codes are used verbatim as characters.

- **`WA:blake-006-form-en` and `WA:blake-008-form-en`** are dispositioned `overlay_no_extractable_text_layer` with 0 anchors and no fill. They do have a text layer — 199 and 222 lines respectively, every one recorded `unreadable`. The text is a subset font with a +29 code offset; decoding page 1 of blake-006 yields `"District/Municipal Court of Washington, County/City of … No. … Plaintiff … Defendant … DOB"`. **The stated premise is false, and forms that could have been anchored were dropped.**
- **`WA:crrlj-09-0100-form-en` and `WA:crrlj-09-0870-form-en`** are dispositioned `overlay_no_participant_label_matched`, but 52 of 197 and 10 of 63 lines were never decoded, so a zero-label conclusion rests on a partially-read document — implausible when the readable part already prints `Plaintiff`, `Defendant`, `No.` and `County of`.

Lane D1B's NC decoder shows the correct approach is already available in-house (`decodeBasis: page_content_stream_tounicode_decoded_per_run`, `cmapsConsulted: 9`).

**Acceptance condition.** Build a code→unicode map from each font's `/ToUnicode` CMap (falling back to `/Encoding /Differences` and the standard encodings). After the fix, `anchorCapture` must report `readableLines > 0` on every page for blake-006/008 and `unreadableLines: 0` for the two crrlj families, and each family must be re-dispositioned on the real anchor set.

### 6. D1C source pointer is null in the review manifest — 11 families, major

Owner: **`scripts/rcap-official-forms/build-d-review-manifest.mjs`**, with lane D1C's divergent schema contributing.

Lane D1C records the source pointer as `canonicalRelativePath` (pack-relative) while all six other lanes use `canonicalBundlePath` (Edition-1-prefixed). The manifest builder reads only `canonicalBundlePath`, so **every D1C family — all 11 in shard 0, 47 lane-wide — carries `sourceCanonicalPath: null`.** An importer keyed on that field silently loses the source pointer for an entire lane.

The underlying evidence is sound: resolving each D1C source by its own key, every recorded sha256 matched the source bytes exactly. This is one fix in one place, but it is wrong on 11 rows of the delivered manifest, so those families are held to `correction_required` with otherwise-clean artifacts.

**Acceptance condition.** Normalize D1C source-records to `canonicalBundlePath`, or teach the builder both keys. No family in `corrected-review-manifest.json` may then have a null `sourceCanonicalPath`, and each value must resolve to a source-pack file whose sha256 equals the family's `sourceSha256`.

#### Related, not separately dispositioned

Evidence naming diverges across lanes in ways an importer would trip over: the non-filing notice is `nonFilingNotice` in D1A/D1B/D1C/D2A (null in most, an **object** in D1B), `nonFilingNoticeOnFace` in D3A, and **absent entirely** in D2B and D3B. The contact-sheet proof lives at `contact-sheet/contact-sheet-proof.json` in five lanes and `reports/contact-sheet-proof.json` in D2B/D3B. `reports/populated-fields.json` is a bare array in five lanes but an object with a `fields` key in D3B, and the field identifier is `field` in most lanes and `anchor` in D3B. Any single-schema importer will silently under-read most lanes.

---

## D0 factory claims weighed

**Confirmed:** WA anchor issues (root cause: no `/ToUnicode` decoding); the shared verifier giving an unearned clean verdict (root cause: fail-open on `inspectable:false`, not a UTF-8 problem); TX GC-411 page access (confirmed, but as a source property — the binary carries `/Encrypt` and pdf-lib cannot traverse it under any load option; the lane's handling was correct). Plus one defect no lane reported: flatten ignoring annotation Print/Hidden flags.

**Not reproduced:** the ESM issue around the non-filing notice — `rcap-official-form-finalize.mjs` imports cleanly, `NonFilingHoldError` is a proper `Error` subclass preserving `.notice`, and all four holds in this shard were enforced. The UTF-8 scan issue — `scanBytesForActiveContent` decodes with latin1, which is byte-accurate, and detected markers identically in UTF-8 multi-byte and latin1 content.

**Out of shard, not tested:** MO CR-145 (this shard has only `MO:cr360`), CO JDF-683 (this shard has jdf-2370/2371/478/615/642/681), and descriptor gaps (no instance surfaced; all 194 written bindings resolved to an allowlisted descriptor).

---

## Detector errors I corrected before reporting

Recorded so no one re-derives them as findings:

- **Clipping on KY aoc-334/aoc-497 and MO cr360** — false positive. The anchor extractor reports `metricsExact: false` for those runs, so its `x2` is a fallback estimate. Re-measured with real Helvetica metrics, all three fit.
- **Protected-field hits on AZ `CourtCaseNum` and VA `User.CourtName`** — false positive. `matter.case_number` and `matter.court` are allowlisted `CAPTION_FACTS`; the `court` protect rule targets judge/clerk/for-court-use fields, not the caption court name.
- **Page-order anomalies on 31 families** — false positive of a contiguous-substring probe that breaks when a value is inserted mid-line; 10 more came from probe lines repeated across pages. With unique probes only one page failed to locate, and that probe was a row of dots.
- **`NC:aoc-cr-287-instructions-vi` held on a notice absent from its own text** — false positive. The notice is drawn in an offset subset font; decoding confirms the lane's recorded text verbatim. The lane did the harder, correct thing.

---

## Held on source or design — 13 families

`NC:aoc-cr-287-form-es`, `NC:aoc-cr-287-instructions-es`, `NC:aoc-cr-287-instructions-vi`, `NC:aoc-cr-288-form-es` — the source states on its face DO NOT COMPLETE THIS FORM FOR FILING; confirmed first-hand, hold enforced, no PDF produced.

`TX:tx-gc-411-072-instructions-instructions-en` — source binary is encrypted and not traversable; the lane's exact error reproduced independently, and it claimed nothing.

`FL:fdle40-021-sealing-en`, `FL:fdle40-026-en`, `LA:la-ccrp-art-990-en`, `LA:la-ccrp-art-993-en`, `UT:1146xx-acceptance-of-service-expungement`, `UT:1149xx-victims-or-prosecutors-statement`, `UT:1164xx-notice-of-hearing-expungement`, `UT:1173xx-response-by-adult-probation-and-parole` — no fill produced and none appropriate (agency-, court-, served-party- or outside-party-completed, or a currentness gate left open). The census, classification and refusal list are the deliverable, and every production hold is preserved.

---

## Blockers to approval

1. **Finding 1** blocks all 15 affected families. `NE:dc-6-7-2-form-en` is the most severe artifact in this shard: it prints a helper box reading "will NOT print on your form" plus every mutually exclusive caption variant superimposed. It should not be shown to counsel as a representative sample.
2. **Finding 5** blocks WA `blake-006` and `blake-008`: their no-fill disposition rests on a premise I disproved.
3. **Findings 2 and 3** block the contact sheets as review evidence — 20 carry residue, and none of the 44 was ever genuinely verified.
4. **Finding 4** blocks the three NH families on evidence integrity: the artifact is correct but the ledger asserts something false about it.
5. **Finding 6** blocks the 11 D1C rows until the source pointer resolves.

Nothing in this shard is approved for live. `technical_approved` here means the artifact and its evidence withstood this review; every production, currentness and legal-design hold remains in force.
