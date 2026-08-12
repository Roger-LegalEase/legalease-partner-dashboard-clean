# D2A — Arizona, Illinois, Washington, Kansas, Minnesota

First build. At the D0 base these five states had no package root: no directories
under `data/rcap-all50/overlays/production/`, no source records, and no rows in
`verified-binary-index.json`. Everything here is established from the Edition 1
source pack, whose `STATE_MANIFEST.csv` is the identity authority.

- Base: `03c14f985beda55596b894686bf70833e44a8f5b`
- Source pack: `RCAP_D_D2_SOURCE_PACK.zip`,
  sha256 `8f7ef41b7077105dc0bc23e7e3963cff88104004db0745012bf76e6b47c14557`
- Driver: `scripts/rcap-official-forms/lanes/d2a-regenerate.mjs`

## Why this lane has its own driver

`scripts/implement-rcap-official-forms-d1.mjs` reads and rewrites
`verified-binary-index.json` and `implementation-index.json`. Seven lanes are
running against the same tree, so both files are the captain's; a lane that
wrote either would clobber the others. The D1 script's index does not list these
states in any case.

The lane therefore drives the D0 factory modules directly and writes a
lane-scoped `state-index.json` under each state for the captain to merge. No
file under `scripts/rcap-official-forms/` outside `lanes/` was modified, and no
compiled profile was touched.

## Numbers

| | |
|---|---|
| Families discovered and built | 36 |
| Source hash matches / mismatches | 36 / 0 |
| AcroForm families / flat-overlay families | 8 / 28 |
| Fields inventoried first-hand | 563 |
| Fields safely bound | 51 |
| Fields protected or refused | 516 |
| Unfittable values refused at the 6pt floor | 17 |
| Finalized PDFs (canonical + boundary) | 26 |
| Contact sheets, each proved against its artifact | 13 |
| Mutation assertions | 157, all passing |
| Families re-rendered to identical bytes | 13 / 13 |
| Protected-field and visibility scans failing | 0 |

Per-family status:

| Status | Families |
|---|---|
| `implemented_pending_independent_review` | 8 |
| `overlay_implemented_pending_independent_review` | 5 |
| `overlay_labels_measured_write_box_pending_review` | 5 |
| `overlay_no_participant_label_matched` | 7 |
| `overlay_no_extractable_text_layer` | 4 |
| `no_fill_instructional_document` | 6 |
| `no_fill_service_block_document` | 1 |

## How a field earns a value

D0 selects the fact from the field's name and nothing else. Four further gates
may then refuse it. None of them can write anything D0 would not have written on
its own, so the result is strictly no weaker than the shared binder.

1. **The nine-class classifier.** A field in an unwritable class, or one the
   classifier could not name at all, is never bound.
2. **Deny rules.** D0's, plus the additions in `LANE_PROTECT_RULES`, applied to
   the field's name and to the text measured on the widget's own baseline.
3. **Descriptor ambiguity.** A name matching more than one allowlisted
   descriptor is bound only where this lane read the binary and said which one
   the form means.
4. **Per-field decisions** authored against the printed form.

Anything only this lane refuses is named in `explicitMappings` with the sentinel
`lane.refused_by_first_hand_review`, so D0's own conflict guard performs the
refusal during finalization rather than the lane deciding for itself what gets
written.

### Measured context protects; it never selects

Every widget's printed surroundings are measured out of the page content stream
and recorded in the census. Only the text on the widget's **own baseline** is
acted on, and only to refuse.

Offering that text to the binder as an `effectiveLabel` was tried and reverted.
D0 resolves a name to the first descriptor that matches it, so adding
surrounding prose can only add matches, and an earlier-listed descriptor then
wins on text that was never the field's label. Illinois prints *"County Where
You Are Filing the Case"* directly above the widget it names `2 - Your name`,
and the county descriptor is listed before the name one; the participant's
county was being written into their name field. More matches mean more refusals
when the same text drives the deny rules, and the wrong fact when it drives
selection, so it drives exactly one of the two.

The line *above* a widget is recorded but not acted on either: on a dense form
it is usually the previous row's label. Illinois prints *"Other Names Used In
These Cases"* above `4 - Date of birth`.

## Release blockers carried forward

Each is recorded in every affected family's `productionHolds` and is not
cleared by anything in this lane.

- **Arizona has no state legal review.** `STATE_README.md` reports
  `Legal review: missing` and names an open item,
  *Arizona state legal-design review — missing_from_supplied_corpus /
  release_blocker*. Every Arizona family carries
  `state_legal_review_missing_release_blocker`.
- **Minnesota's legal review is supplied only in Spanish.** The manifest row is
  `MN:STATEWIDE:LEGAL_REVIEW:ES` and there is no English counterpart. Every
  Minnesota family carries
  `state_legal_review_supplied_only_in_es`.
- **Washington names a county-supplement gap.** `STATE_README.md` records
  *County-required supplements identified by local rules —
  local_jurisdiction_required / jurisdiction_input_required*.
- **Kansas Judicial Council forms are source-gated for commercial
  distribution.** The manifest states the Council's forms are for
  non-commercial use and may not be sold, republished or transferred for value
  without express permission. All three Kansas families are `source_gated` and
  carry `source_gated_never_runtime_selectable`.
- **Edition 1 is runtime-disabled throughout.** Every family in all five states
  carries `edition_1_runtime_disabled` and
  `f_independent_visual_review_required`, and every manifest row has
  `generation_allowed = no`.

Nothing here became a sellable route because it rendered.

## State-pack fidelity findings

The Edition 1 pack manifest is the canonical source of record and wins wherever
it disagrees with a compiled profile. No profile was edited.

- **Declared field counts disagree with the first-hand census in five
  families**: Arizona `AOCCRSL1F-050825` (97 declared, 71 observed) and
  `AOCCRSL2F-050825` (45 / 41); Illinois `EXP-AD-ORDER-GRANTING` (75 / 74),
  `EXP-AD-REQUEST` (160 / 151) and `FW-CIV-APPLICATION` (130 / 121). The census
  counts fields; the manifest appears to count widgets, and several fields on
  these forms own more than one. Every binding decision was made against the
  census.
- **The compiled profiles list forms Edition 1 does not supply**: Arizona 2,
  Illinois 15, Washington 6, Kansas 3, Minnesota 6. These are recorded in each
  state's `state-index.json` under
  `compiledProfileFormInventoryRowsWithNoEdition1Counterpart`. No profile
  `formInventory` sha256 contradicted a manifest sha256 for a form Edition 1
  does supply.
- **Three Washington sources are legacy `.doc` files** — `CR-09.0500`,
  `CR-09.0600` and `CR-09.0700`, the treaty Indian fishing-rights set. The
  official-form factory renders PDFs. They are recorded in
  `washington/state-index.json` under `nonPdfSources`, not rendered.
- **Structural class agreed with the binary in all 36 families.**

## Washington's flat corpus

Washington supplies 18 PDFs and not one AcroForm. Four of them —
`BLAKE-005` through `BLAKE-008`, the Blake order set — draw their text through a
Type0/Identity-H subset font with no ToUnicode map, so the decoded text is glyph
indices rather than characters. There is no readable label to anchor against and
none was invented; those four are `overlay_no_extractable_text_layer`.

Seven more carry a readable text layer whose captions do not name a participant
fact in terms D0 accepts. Washington writes `No.` where the binder's descriptor
reads `case no`, and widening the descriptor would mean editing
`rcap-field-semantics.mjs`. They are recorded as
`overlay_no_participant_label_matched` rather than anchored on a guess.

Where Washington's caption prints the blank on one line and `Defendant.` on the
next, the following line's opening text is used to name the blank. That text is
measured from the document like everything else, and `CR-08.0900` is anchored
because of it.

## What independent review should look at first

- The 51 bound fields, listed per family in `reports/populated-fields.json`.
- The 13 contact sheets. Each is built from the finalized artifact and refuses
  to exist unless every expected value is provably visible in it and the two
  panels differ.
- The write boxes on the 5 anchored overlay families. Label position and right
  boundary are measured; the left edge is derived from the label's rendered
  width and is the one estimated number in the package.
- The refusals in `reports/protected-fields.json`, which are where the
  protection is auditable.

## Status

`implementation_complete_pending_independent_review`.

Not approved, not terminal, not production ready, not live. This lane does not
approve its own output.
