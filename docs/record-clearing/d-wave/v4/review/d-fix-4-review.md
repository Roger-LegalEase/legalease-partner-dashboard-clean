# D-FIX-4 independent review — Virginia CC-1203, Vermont 200-00631

Branch reviewed: `claude/rcap-d-fix-4-va-vt-clipping`
(family commit `76730af`, base commit `257bf04`).

Everything below was checked against the artifact bytes with tools independent of
the factory under review: Mozilla `pdfjs-dist` for page text and glyph positions,
a purpose-written content-stream and object-graph walker over pdf-lib's low-level
API for flattened-widget provenance, and pdf-lib's own Helvetica metrics for true
glyph widths. The repository's capture module was used only where its output is
itself the subject of a finding.

The source binaries are not in git. Nothing here depends on one: widget rectangles
came from each package's committed `field-census.json` and were corroborated
against the flattened appearance BBoxes and placement matrices in the finalized
artifacts, which agree to within 0.1pt.

## Dispositions

| Subject | Disposition |
| --- | --- |
| `VA:cc-1203-form-en` | **correction_required** |
| `VT:200-00631-form-en` | **correction_required** |
| Approved-family fitter scan | **correction_required** |

## What holds

Both families are safe on the page, and that is worth stating plainly before the
findings. Reading every appearance stream in all four fixtures and measuring each
run with real Helvetica metrics:

- **Nothing visible is clipped.** All nineteen drawn values render whole, and
  every one starts and ends inside its own widget rectangle *and* inside its
  appearance clip path. No mid-word truncation anywhere.
- **Every withdrawal is a true blank.** Virginia's six withdrawn boundary values
  and Vermont's one have no appearance stream in the emitted artifact at all —
  proven absent from the bytes, not merely absent from a report.
- **D-V3-R-002 is fixed at its real mechanism.** The pre-fix boundary drew
  `User.AncillaryCaseNumber` starting at x=331.55 inside a widget that starts at
  x=365.07: pdf-lib centre-quads an over-wide value on a `/Q 1` widget, so
  `(129.72 − 196.75)/2 = −33.5pt` pushed the text out both sides and the clip cut
  it mid-token at both ends. The value is now withdrawn. D-V3-R-003 is fixed —
  the ledger records it.
- **D-V3-R-004 is fixed for the right reason.** `User.VSBCaseNumber` is refused
  as `protected_category / attorney`, its measured label is
  `"[ ] ATTORNEY FOR PETITIONER (VSB No."`, and its widget is 23pt wide inside
  the attorney signature block. Refused for meaning, not for width.
- **Manifests and safety are clean.** Every manifest path exists; every digest and
  byte count matches disk; both contact sheets were built from the finalized
  canonical artifact and contain its values. An independent object-graph walk
  found no XFA, JavaScript, `/AA`, `/OpenAction`, `/Launch`, `/SubmitForm`,
  `/ImportData`, `/URI`, `/GoToR`, `/RichMedia`, `/EmbeddedFiles`, `/Names`,
  `/Movie`, `/Sound`, `/Rendition` or `/SetOCGState`; no AcroForm survives; every
  `/Annots` array is empty, so no orphaned widget.
- All three canaries pass (149, 43 and 35 checks) and
  `d-v4-verify-corrections.mjs` reports 20/20.

## Why it is still `correction_required`

### Vermont writes into a widget nobody measured, and it is the Date line

Field `"1"` has **two** widgets. `field-census.json` records both —
`(287.3, 611.9, 273.6, 13)` and `(53.4, 164.4, 156.3, 13)` — and
`canonical-filled.pdf` draws the value twice, as `/FlatWidget-7888911063` at
cm `(287.35, 611.95)` and `/FlatWidget-979344929` at cm `(53.43, 164.35)`.

The fitter measures `widgets[0]` only (`rcap-official-form-finalize.mjs:258`),
the read-back checks `widgets[0]` only (`:336`), and the acceptance verifier
checks `widgets[0]` only (`d-v4-verify-corrections.mjs:196`). So the ledger holds
one row, `availableWidth: 273.6`, for a write that also lands in a 156.3pt box
that is never fitted against and never read back. The claim "every written value
is read back from the page" covers half of this family's only write. **[D-R4-001]**

Worse, that second widget is the **Date** line of the perjury declaration. On the
page: the label `Date` at (54.0, 181.1); the rule it captions at (54.0, 167.6)
width 159.0; the widget sitting on that rule from (53.4, 164.4) to (209.7, 177.4);
and the signature line elsewhere — the right-hand rule at (288.0, 167.6) width
224.6, captioned `Signature of Requestor` below it. The participant's full legal
name is printed where the form asks for a date, and it is visible in the contact
sheet a reviewer signs off (the sheet carries the name twice). **[D-R4-002]**

### The overflow numbers are estimates presented as measurements

`codeAdvance` falls back to `w = 500` — half an em per character — when a font
carries no `/Widths`, and the font in every generated appearance is
`/BaseFont /Helvetica` with no `/Widths`. So `metricsExact` is **false on every
value run in these artifacts**, and nothing downstream consults it, while
`verifyWrittenValue`'s comment states the extents are "measured from each run's
own extent rather than estimated." **[D-R4-003]**

Measured against pdf-lib's Helvetica metrics the estimate is wrong both ways:

| value | size | reported | true |
| --- | --- | --- | --- |
| `Alexandrina-Katharine …-Vandenberg-Oyelaran y Fitzwilliam III` | 10 | 350.00 | 326.07 |
| `0123-45-2026-CR-900123.00-AB-CDE/2201` | 10 | 185.00 | **196.75** |
| `jordan.reyes@example.com` | 11 | 132.00 | **136.16** |

Under-measurement on digit- and capital-heavy strings is a false-clean path — a
value drawn outside its widget read back as complete. That is the D-V3-R-006
signature this work exists to abolish, still reachable.

It has already produced a wrong record. Vermont's boundary row cites widget
`(287.3, 611.9, 273.6, 13)` with `overflowRightPt: 7.45`. That figure is exactly
`70 × 0.5 × 8 = 280.00` drawn from x=288.35 against a right edge at 560.90. With
real metrics the name at 8pt is 260.86pt wide and ends at 549.21 — **11.7pt
inside** that widget. The clip that does exist at 8pt is in the *second* widget,
whose clip path is 154.3pt: about 41 of 70 characters, cut mid-word, which is
D-V3-R-005 exactly as originally reported. The blank outcome is right; the widget,
the number and the cause are not, and the real cause is recorded nowhere. **[D-R4-004]**

### Ledger fields that do not agree with the artifact

- Virginia's canonical `User.AncillaryCaseNumber` row records
  `selectedFontSize: 11`; the appearance stream says `/Helvetica 10 Tf`. The
  ledger publishes `w.fontSize`, the fitter's choice, not the size that drew
  (`finalize.mjs:352`). Nothing clips at 10pt, but substituting the prediction for
  the observation is the original defect in miniature. **[D-R4-005]**
- Withdrawn rows carry no `page`, `selectedFontSize`, `availableWidth`,
  `fittingOutcome` or `runsSelectedBy`, and `requiredWidth` is absent from every
  row in both families — while the code comment above the row builder promises
  "required width, available width, the size chosen, what was supplied, what is
  visible". Three of the six quantities the acceptance condition asks to agree are
  not recorded at all. **[D-R4-006]**
- Every withdrawn row records `renderedChars` equal to `suppliedChars` (70, 37,
  70, 75, 47, 70 in Virginia; 70 in Vermont). The fields are blank; the visible
  length is 0. Read literally, six Virginia fields are both left blank and
  rendered at full length. **[D-R4-007]**

### Virginia's binding drop is described wrongly, and one half of it is a regression

The two bindings that do not survive are `User.ChargeCaseNumber` and
`User.VSBCaseNumber` — **not** `User.DateOfArrest`, which is bound, listed in
`explicitMappings`, and drawn at 9pt into (192.0, 347.38, 231.71, 10.79) on page 2
of both fixtures. The family commit describes the pair as "a case number the
form's own width refuses and an arrest date that is a sensitive fact with no
explicit mapping"; the bytes say otherwise.

Dropping `User.VSBCaseNumber` is a correction. Dropping `User.ChargeCaseNumber` is
a regression in substance: its measured label is
`"2.Case number for charge or conviction:"` — the case number of the charge being
sealed, i.e. `matter.case_number` — and the refusal category
`disposition_or_hearing` looks triggered by the word "conviction". It fails safe,
but a core field of the petition is now silently blank with no note. **[D-R4-008]**

### Evidence that the package no longer carries

- `reports/protected-fields-scan.json` and `fixtures/negative.json` were not
  regenerated. The scan declares `writtenFields: 14, pass: true` for an artifact
  that writes 13, and both files still record `User.VSBCaseNumber` refused for
  `value_exceeds_widget_width_at_minimum_font` while the field map records
  `protected_category / attorney`. The package answers the D-V3-R-004 question two
  ways, and the stale answer is the one the finding said was wrong. **[D-R4-009]**
- Virginia's `bindingRefusals` went 116 → 2 and `protected-fields.json` refusals
  116 → 2; Vermont's went 9 → 0 and 9 → 0. `unwritableFields` and `manualFields`
  survive in the field map, so the fields are still listed, but the typed reason
  each is blank is gone — including hand-authored lane notes such as
  `User.FullNameOfArrest`: *"Writing the current name here would misstate the
  arrest record."* Vermont now records no reason for any of fields 2–10; only the
  unregenerated `negative.json` still says field `"2"` is an agency field.
  Behaviour is unchanged; the evidence for "every field starts protected" is
  not. **[D-R4-010]**

### Vermont's measured labels are one printed row too high

Seven of ten. Each of the form's ten label/rule rows shares a baseline with
exactly one widget rectangle (after normalising the five stored with height −13),
in order. Recorded vs. printed: field 3 reads *Name of Requestor's Criminal
Justice Agency* where the form prints **Phone Number**; 4 reads *Phone Number* /
**Email Address**; 5 reads *Email Address* / **Mailing Address**; 6 reads the
section heading *Information Regarding Sealing Order Requested* / **Defendant's
name (required)**; 8 reads *Defendant's date of birth (required)* / **County of
venue (required)**; 9 reads *County of venue (required)* / **Docket number**; 10
reads *Docket number* / **Charge**.

Every wrong one carries `source: line_above_widget`; the three right ones (1, 2, 7)
carry `left_of_widget`. The left-of window is too narrow for short captions —
"Phone Number" ends 163.7pt from its widget against the 33.6pt gap that made field
1 work — so the search falls back to the row above. Nothing is mis-filed today
because only field 1 is bound, but under the base commit's own rule a positional
name is *no* evidence and this label is what would select or protect for fields
2–10. Field 10 is labelled "Docket number" where the form prints "Charge". **[D-R4-011]**

## The approved-family scan

It reproduces exactly — 157 approved, 135 scanned, 22 skipped, 552 values, 0
additional affected, `git diff` empty — once the seven lane branches named in
`v3/family-handoff.json` are fetched. The headline is nonetheless not yet a
supportable negative result.

- **It fails open.** On a fresh clone of this branch none of the seven lane
  commits resolve, so every family is skipped and the script prints
  `scanned: 0 … additional affected: 0`, exits 0, and overwrites the report. Its
  own `executableProof` says exit 0 with `additionalAffectedFamilies == 0` *is*
  the negative result — a criterion satisfied by a run that read nothing. **[D-R4-012]**
- **It reads canonical fixtures and first widgets only.** All seven clips that
  motivated this work are in *boundary* fixtures, which the scan never opens; and
  multi-widget fields are present in the scanned corpus (Vermont's field `"1"`,
  NE `dc-1-15`'s `printedname`). Vermont's true clip is in a second widget. "552
  written values" counts first widgets in canonical fixtures, not writes on the
  page. **[D-R4-013]**
- **"Already in the ledger" is not "the approval is still supportable."**
  `existingApprovalStillSupportable` is literally `reported.has(name)` — a
  field-*name* match against the union of three ledger arrays, with no check of
  fixture or condition. Two of the four "disclosed" rows fail on inspection:
  - `ND:expertise-form-instructions-en / Judicial District` — the family's ledger
    holds two entries for that field, both `check: "shrink_to_fit_applied"`,
    `handling: "written at the fitted size"`, and `populated-fields.json` records
    `outcome: "shrunk"`. That is the clean outcome, the opposite of a disclosed
    clip — yet the scan reads 19.87pt of overflow and files it as "disclosed, not
    concealed". (The 19.87pt is itself a phantom: at 8.5pt the string is 110.87pt
    against a 117.74pt box.)
  - `NE:dc-1-15-form-en / printedname` — the ledger's only entry for that field is
    the **boundary** fixture; the scan's row is **canonical**.

  Had either clip been real, this bucket would have waved through exactly the
  D-V3-R-006 signature. **[D-R4-014]**
- **The dropdown exclusion never fires.** `w.type` reads `.type` off
  `f.widgets[0]`, which is `{page, rect}`; the type lives on the field as
  `f.type`. And `row.kind` is absent from the older `populated-fields` schema.
  Verified against the family the comment cites: KY `aoc-496-3` has
  `type: "dropdown"` on the field, nothing on the widget, no `kind` on the row. So
  both Kentucky dropdowns reached the clip check and were rescued by the ledger
  match, not by the rule. Nothing is being skipped. **[D-R4-015]**
- **It falls back to geometry on unflattened approved artifacts.** NE `dc-1-15`'s
  approved `canonical-filled.pdf` is an 8.5 MB file that still carries an AcroForm,
  105 annotations and `/AA` and `/JS` objects, from the older `…-d1.mjs` renderer.
  With no appearance runs, `runSource: "auto"` selects geometry and the scan read
  the printed label `"Name:"` back as the field's value — the label-as-value error
  the same commit says it eliminated. **[D-R4-016]**
- **The 22 skips are not a hole**, but they are asserted rather than shown. All 22
  are "no participant artifact to read", and the list is dominated by instruction,
  order and support packages that write no participant values. The report never
  records *that* fact, so names like `NM:nm-dps-roi-en` and `WA:blake-002-form-en`
  rest on the reader's inference. `locate()` also resolves ownership by "largest
  package", a proxy with no check against the tree the approval was granted
  against. **[D-R4-017]**

## Note on running the verifier

`d-v4-verify-corrections.mjs` writes
`docs/record-clearing/d-wave/v4/correction-verification.json` as a side effect. It
is untracked; it was removed after the run so this review changes nothing outside
`docs/record-clearing/d-wave/v4/review/`.

Full findings, each with id, severity, file, field or region, visible defect and a
specific acceptance condition, are in `d-fix-4-review.json`.
