# D approval-evidence review — independent verification of the 104 prior approvals

Read-only review. No participant PDF was re-rendered, no implementation, correction or
evidence branch was touched, and no legal or source hold was reopened. This review does not
approve anything and does not mark any track terminal.
`prior_technical_approval_reaffirmed` means only that the corrected evidence supports the
approval that was already granted.

Machine-readable detail: `review-findings.json`.

## Result

| Result | Families |
| --- | ---: |
| `prior_technical_approval_reaffirmed` | 100 |
| `correction_required` | 4 |
| `held_on_source_or_design` | 0 |
| **Total inspected** | **104** |

**All 104 families in `preservedTechnicalApproved` were inspected.**
**85 of 85 participant-artifact hashes were confirmed unchanged** against the lane head the
approval was originally granted at — the load-bearing claim of the gate. Nineteen families
have no filed participant artifact at all.

## What was verified, and against what

Source binaries came from release `rcap-d-source-packs-2026-08-12`. All three ZIPs matched
their expected sha256 exactly, and were extracted outside every git worktree; no ZIP or
extracted official binary was committed. Each family's blank source was resolved out of the
packs **by the sha256 recorded in its own source record**, not by path — all 85 resolved with
a matching hash.

Everything below was checked against bytes I extracted myself, not against
`approval-evidence-summary.json`.

| Check | Result |
| --- | --- |
| Participant PDF byte-identical to the lane head | 85 / 85 |
| — confirmed twice, by git blob identity and by sha256 of two separately extracted copies | 85 / 85 |
| Contact sheet actually rebuilt (bytes differ from the lane head's) | 85 / 85 |
| Proof carries `activeContentScan`, `panelScans`, `panelsSanitizedBeforeEmbedding` | 85 / 85 |
| Sheet byte-inspectable (re-saved with object streams disabled, then scanned) | 85 / 85 |
| Sheet free of XFA, JavaScript, field `/AA`, document `/AA`, OpenAction, Launch, SubmitForm, ImportData, URI or other network action, and unsafe active annotations | 85 / 85 |
| Sheet free of orphaned `/Widget` objects | 85 / 85 |
| Every expected participant value visible in the filed artifact | 85 / 85 |
| Blank and filled differ where values are expected | 85 / 85 |
| Every value drawn inside its own write box | 85 / 85 |
| No caption, helper text or non-printing-control run in the filed artifact | **81 / 85** |

### The scan had to be built to see the residue

An early version of this review reported every old and new sheet clean, which was wrong.
Re-saving a PDF through QPDF **drops objects nothing references** — exactly the orphaned
`/Widget` residue the scan exists to find — so scanning the re-saved copy launders the file and
then pronounces it clean. The scan was rebuilt to walk the **original** object table directly
(which surfaces both object-stream contents and unreferenced objects), using the re-save only
to prove inspectability.

That correction is what makes the clean results meaningful, and it independently confirms the
premise of this gate. Scanned with the corrected tool, the **old** sheets at the lane heads
carry exactly the described defect:

| Family | Orphaned `/Widget` objects in the old sheet | Active-content tokens |
| --- | ---: | --- |
| `AK:tf-800-form-en` | 87 | `/URI`, `/Widget` |
| `AL:c-10-criminal-form-en` | 108 | `/Widget` |
| `KY:aoc-333-source-gated-en` | 14 | `/AA`, `/JS`, `/JavaScript`, `/Widget` |
| `NH:nhjb-2328-support-affidavit-en` | 297 | `/AA`, `/JS`, `/JavaScript`, `/Widget` |

The regenerated sheets for the same families show zero orphans and no tokens.

The residue had somewhere to come from: of the 85 blank sources, **49 carry widget annotations
or AcroForm fields**, 19 carry active-content tokens beyond a bare `/Widget`, and **11 carry
JavaScript and 11 carry `/AA`**. The prior approvals did rest on evidence that could not have
proven what it claimed, and the regenerated evidence does prove it.

## The four filed artifacts that fail

Confirmed independently, against the source binaries — not taken from the regeneration report.
These are defects in the **filed** artifact, which this gate does not re-render, so the
evidence around them is sound while the artifact is not.

A run was counted as a leak only if it sits inside a widget whose `/F` carries no print bit,
**and** overlaps no printing widget, **and** does not appear in the untouched source's own page
content at that position. Positions were computed with a content-stream walker that composes
the CTM through `q`/`Q`, `cm` and `Do` (including each Form XObject's own `/Matrix`), because
the off-the-shelf extractor reports positions in the XObject's local space and would have put
every flattened caption near the page origin. Glyph codes were decoded through each font's
ToUnicode CMap or `/Differences` first, so subset fonts with offset codes decode before
judging.

| Family | Lane | Leaked runs | Examples |
| --- | --- | ---: | --- |
| `KY:aoc-333-source-gated-en` | D1B | 2 | `Print`, `Reset Form` — both inside `/Btn` widgets whose `/MK /CA` captions match exactly |
| `KY:aoc-496-5-form-en` | D1B | 11 | `Print`, `Reset Form`, plus a whole non-printing `/Tx` notice block (`NOTICE:`, `Not all bowsers handle fillable PDFs the same.` …) and an attorney hint line |
| `NH:nhjb-2328-support-affidavit-en` | D3A | 6 | `Clear Form`, `Lock & Save Form`, `Top of Page`, `Top of 1st Page` (pages 1–3) |
| `NH:nhjb-2956-support-record-request-en` | D3A | 3 | `Instructions`, `Clear Form`, `Top of Page` |

Every one of these widgets carries `/F` = 0 — no print bit — and its caption text appears
nowhere in the source's own page content. The regeneration's finding on all four is confirmed.

### The three retracted findings

The regeneration flagged three families and then retracted them as false positives of its own
detector. Each was re-checked from scratch, and **each retraction is upheld**:

- `NM:nm-4-960-2-en` — the source is a flat PDF with **zero** widget annotations, so no
  non-printing control exists that could have leaked.
- `CO:jdf-477-form-motion-en` — 13 non-printing widgets, zero leaked runs.
- `CO:jdf-612-form-motion-en` — 23 non-printing widgets, zero leaked runs.

## The nineteen families with no filed artifact

For each, the family's whole directory was enumerated in both the evidence-branch tree and the
lane head tree: **neither contains a single PDF**. There is genuinely no filed artifact and no
contact sheet, so the defective path never produced evidence for them and none of their prior
approval rested on it. There is nothing to correct.

Nine are `INSTRUCTIONS`, six are court `ORDER` documents with no participant fill, two are
overlays whose write box is still pending
(`MN:fee103-support-en`, `WA:blake-002-form-en` — `overlay_labels_measured_write_box_pending_review`),
one is a `RECORD_REQUEST` and one a `SERVICE` document. That matches the stated composition.

## Two things the report does not say

**1. One family's approval was granted with no contact sheet in the tree at all.**
`NH:nhjb-2956-support-record-request-en` has no `contact-sheet/` directory at its lane head
(`b1cac44f`) — the sheet on the evidence branch is newly created, not regenerated. Its
contact-sheet proof also carries an **empty** `expectedValues` list, so the "every expected
value is visible" check is vacuous for this family. It is `correction_required` on its filed
artifact regardless, but the gap in how its original approval was evidenced is worth recording
separately.

**2. `reports/rendered-artifacts.json` is stale for 84 of the 85 families.**
Each still records the **pre-regeneration** contact-sheet sha256, so that manifest now
describes a file that exists nowhere on the branch. The `fixtures/canonical-filled.pdf` hash in
the same manifest still matches the filed artifact in all 85 cases, so this is a bookkeeping
inconsistency in the evidence bundle rather than a defect in an artifact — but anyone
reconciling a sheet against that manifest will get a mismatch on every family. It is left
flagged, not fixed, since this review writes only its own branch.

## Method notes

- Lane ownership for each family was resolved from the family's own `source-record.json` rather
  than from the report, and agreed with the report's lane on all 104. (The lane branches share
  history, so a family's directory appears on several trees; only the owning lane's record
  carries the specific lane code.)
- "Expected participant value" was derived from each family's **own** records —
  `reports/populated-fields.json` where it names what was written, otherwise the overlay
  bindings and anchors, in both cases minus the refusals recorded in
  `reports/overflow-and-clipping.json`. Four families have a bound fact whose value is absent
  from the filed artifact, and in every case the absence is the documented, correct behaviour,
  not a defect:
  - `AR:ar-acic-petition-to-seal-felony-under-act-1460-source-gated-en` —
    `participant.street_address` refused, `value_exceeds_widget_width_at_minimum_font`
    (39pt widget, 45.7pt needed at 6pt); policy is to refuse rather than clip.
  - `KY:aoc-333-source-gated-en` and `KY:aoc-496-5-form-en` — `matter.county` refused,
    `value_not_among_field_options` on a dropdown.
  - `WI:cr-266-form-en` — `deterministic.filing_date` is a captured anchor that was never
    written; the family's own `populated-fields.canonicalWritten` and `expectedValues` both
    omit it, so nothing contradicts the artifact.
- Both a positional content-stream walk and a second independent text extractor were used for
  value visibility, so a value was only called missing when both failed to find it. For
  `WI:cr-266-form-en` the only `2026` in the file is the pinned `CreationDate`/`ModDate`
  metadata, not a rendered date.
- Values two to four characters long (`XX`, `ND`, `OR`) were excluded from the
  blank-versus-filled comparison; they match inside ordinary prose and make that test
  meaningless.

## Not covered

The 61 `correction_required` families are out of scope here; a separate review covered those.
Source-currentness, legal-design and counsel review remain untouched and unaddressed by this
review.
