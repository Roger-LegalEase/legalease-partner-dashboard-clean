# F3 — Independent Read-Only Visual Review: Official-Form Families

**Lane:** F3 (independent, read-only). F3 authored no fix, edited no product code, overlay,
field map or form family. Everything below `docs/rcap/review/f3/` is review evidence only.

**Review branch:** `claude/rcap-review-f3-official-forms`
**Review date:** 2026-08-12

## Targets

Both target SHAs were fetched and verified to exist before review began.

| Terminal | SHA | Branch | Tip commit |
|---|---|---|---|
| D1 | `a6cd03b7d50e5b141676960ebc6b94458065a496` | `origin/claude/rcap-terminalize-d-official-forms` | `chore(rcap): record the D1 official-forms verifier's disposition` |
| E | `fab2861205be8e6c61f23c24bd700b6b1bb751e6` | `origin/claude/rcap-terminalize-e-hard-forms` | `E: commit the CR-410 and CR-106 derivatives their records already pin` |

Both trees were checked out detached and inspected in place. No blockers on target reachability.

## Scope — how the family list was built

The list is taken from the actual diffs, not invented.

* **D1** — `git diff --name-only 2dced50e a6cd03b7` touches 1,490 files under
  `data/rcap-all50/overlays/production/`. `implementation-index.json` at the target SHA enumerates
  **89 families** across AK, AL, AR, KY, NC, NE, VA, VT, WI. Of those, **62 are IMPLEMENTED** — they
  carry a `production-field-map.json`, rendered `fixtures/canonical-filled.pdf` +
  `fixtures/boundary-filled.pdf`, and a `contact-sheet/blank-vs-filled.pdf`
  (53 `acroform`, 9 `flat_overlay`). The remaining 27 are out of scope for this review and were not
  given a disposition: 16 `no_fill_instructional_document`, 5 `overlay_no_participant_label_matched`,
  3 `acroform_mapped_all_fields_manual_or_unwritable`, 2 `overlay_labels_measured_write_box_pending_review`,
  1 `no_fill_outside_party_document` — none of them renders a fill.
* **E** — the lane's own five commits (`3118cc83..fab28612`) add
  `data/rcap-all50/hard-forms/` with **4 implemented CA families** (CR-180, CR-181, CR-409, CR-410),
  **1 Tier-1-capable component** (CR-106, field map deliberately unauthored) and
  **2 exact supported deferrals** (DE Family Court Form 281, ME CR-289). All 7 are dispositioned.
  The Tier-0 reclassifications (MC-031, MC-025) are handoffs to Terminal D, not families implemented here.

**69 families dispositioned.**

## Result

| Disposition | Count |
|---|---|
| `technical_approved` | **0** |
| `correction_required` | **62** |
| `held_on_source_or_design` | **7** |

`held_on_source_or_design`: AR ACIC DWI order + DWI petition + pardoned-offender order + veterans
petition (technically clean, blocked only on the open source/currentness gate); CA CR-106;
DE Form 281; ME CR-289.

## Method and tooling

`poppler-utils` (`pdftoppm`, `pdftotext -layout`, `pdftotext -bbox`, `pdfinfo`), `qpdf`
(`--qdf --object-streams=disable --decode-level=all`, so JavaScript hidden inside compressed object
streams is visible), `pypdf` 6.15.0, Pillow, Node 22 + `pdf-lib` 1.17.1 to re-run lane E's own renderer.

* 200 output PDFs rasterised and structurally parsed.
* Lane E's converter `scripts/rcap-hard-form-xfa-shadow-fill.mjs` was re-run against all 12 committed
  fixtures; outputs were hashed against `reports/output-fingerprints.json`.
* Contact sheets for visual review were rebuilt by F3 as three-up
  **blank | canonical | boundary** composites, because D1's own contact sheets do not show the fill
  (finding S-1). The blank panel is cropped from the left half of D1's own sheet, i.e. the real
  official source page; the canonical and boundary panels are `pdftoppm` rasterisations of the
  committed fixtures, which do render widget appearance streams.
* Every visual claim below was read off an image that was actually inspected. Where a check could not
  be discharged from what is in the clone, it is recorded as **unverified**, not as a pass.

## What could not be verified

* **Check 2 (source SHA matches the pinned value) is unverified for all 62 D1 families and for the
  four CA official sources.** `private/Nationwide Record Clearing/` and
  `Expungement_AI_RCAP_Master_Library_Edition_1/` are absent from the clone, and no D1 package commits
  its source binary. What F3 *could* verify: the pinned `sha256` is internally consistent across
  `source-record.json`, `field-census.json`, `production-field-map.json` and
  `reports/rendered-artifacts.json` in **all 89** D1 families (0 disagreements), and every recorded
  render artifact hashes byte-for-byte to the committed file (0 drifts). For lane E, the four
  committed **derived** sources hash exactly to their pins; the encrypted **official** sources are
  not in the clone.
* **Check 1** is likewise unverified against the issuing authority. 48 of 62 D1 families record
  `sourceUrl: null`.

---

# Systemic findings

## S-1 — Every acroform contact sheet is blind (53 families)

`contact-sheet/blank-vs-filled.pdf` is built in
`scripts/implement-rcap-official-forms-d1.mjs` (~L594-613) with
`sheet.embedPdf(...)` + `page.drawPage(...)`. That copies **page content streams only**. AcroForm
values live in widget *annotations*, which `drawPage` does not carry, so for every `acroform` family
the panel labelled "canonical fill" is identical to the blank panel.

Proof, two independent ways:

* Text: for all 53 acroform families, the field values present in the fixture's extracted text appear
  **zero** times in the contact sheet's text (45 families score a literal 0; the other 8 score exactly
  1, in each case a coincidental match on pre-printed form text, with every real value —
  `Jordan Avery Reyes`, `118 Maple Street`, `1991-04-17`, `24-CR-001234`, `District Court` — absent).
* Visual: `defect-evidence/F3-001_blind-contact-sheet_NE-cc-6-11.jpg`. The two panels are the same page.

The nine `flat_overlay` families are unaffected — they draw into the content stream, and their sheets
do show the fill.

**Acceptance condition:** the committed `contact-sheet/blank-vs-filled.pdf` for every `acroform`
family visibly renders the canonical values in the right-hand panel — e.g. by rasterising each page
(or calling `form.flatten()` on a copy) before embedding — and a verifier asserts that at least one
canonical field value is extractable from the sheet's text for every family whose `filled > 0`.

## S-2 — The acroform fill path reports clipping but never shrinks (53 families, 308 findings)

`implement-rcap-official-forms-d1.mjs` L560-572 measures the value against the widget width and, when
it does not fit, pushes a finding with `"handling": "shrink_to_fit_required_at_render"` — then calls
`f.setText(value)` unchanged. Nothing reduces the font size. The value is therefore either silently
truncated mid-word (fixed `/DA` size) or auto-shrunk by pdf-lib to illegible microtype (`/DA` size 0).
The `flat_overlay` path does implement shrink-to-fit (L502-509) and is clean.

308 clipping findings are recorded; **13 families clip on the canonical (normal-length) fixture**, not
only on boundary. Visually confirmed:

* `contact-sheets/D1__AL__c-94a-source-gated-en.jpg` — boundary county renders
  `Saint Bartholomew and the N`, case number `0123-45-2026-CR-900`.
* `contact-sheets/D1__NC__aoc-cr-287-form-en.jpg` — boundary county renders
  `tholomew and the Northern Reache` (clipped at both ends); file number `5-2026-CR-900123.00-AB-CD`.
* `contact-sheets/D1__VA__cc-1201-form-en.jpg` — boundary "Specific charge or conviction" and
  "Case number for charge or conviction" render at roughly 3pt, illegible.
* `contact-sheets/D1__AK__tf-800-form-en.jpg` — boundary address, phone and case name truncated,
  case name abutting the `Case No.:` label with no gap.

**Acceptance condition:** for every family, the boundary fixture renders with no value truncated and
no value below a stated legibility floor (e.g. 6.5pt), demonstrated in a contact sheet that shows the
fill; any value that genuinely cannot fit is routed to a continuation/addendum rather than cut, and
`reports/overflow-and-clipping.json` records `handling` values that describe what the renderer
actually did.

## S-3 — Output PDFs retain source JavaScript (27 families); no XFA anywhere in D1

Decompressed scan of all 188 D1 PDFs: **`/XFA` count 0**, no `/Launch`, no `/SubmitForm`, no
`/EmbeddedFile`, no `/RichMedia`. But 27 families ship fixtures carrying live AcroForm JavaScript
inherited from the official source (42 distinct script bodies), and in **20** of them a script is
attached to a **bound** field.

Highest risk, the six Nebraska families: `TYPEOFCOURTRESULTS` is a bound field, is listed in the
AcroForm `/CO` calculation order, and carries the calculate script
`event.value = this.getField("TYPEOFCOURTDROPDOWN").value;`. `TYPEOFCOURTRESULTS` is written with
`District Court`; `TYPEOFCOURTDROPDOWN` is left at its unselected placeholder
(`IN THE                   COURT OF`). Opening the output in any viewer that runs calculations
replaces the rendered court type with the placeholder.

Others of note: `this.getField("User.…").value = "Off"` mutual-exclusion scripts on the six Virginia
families (35-71 JS actions each); `AFDate_FormatEx`/`AFDate_KeystrokeEx` on bound date fields;
`app.alert("Enter numeric characters only.")`; a Format script that injects the literal
`Enter Attorney's name, address and phone here` into an empty field. Four Kentucky fixtures also carry
a catalog `/OpenAction`.

Lane E is the counter-example and the model: its converter deletes `/XFA`, flattens the form and
refuses to emit if any widget action survives — its outputs have 0 annotations, 0 fields, 0 JS.

**Acceptance condition:** every D1 output PDF contains no `/JS`, no `/S /JavaScript`, no widget
`/AA`, and no catalog `/OpenAction` when scanned after
`qpdf --qdf --object-streams=disable --decode-level=all`; and a verifier fails the build if any
survive. If retaining the interactive form is a deliberate product decision, that decision is recorded
per family with the calculate-script hazard in S-3 resolved explicitly.

## S-4 — Holds that do not describe the artifact (34 families)

All 62 implemented families correctly carry `state_manifest_generation_allowed_no`,
`edition_1_runtime_disabled` and `f_independent_visual_review_required`, and all have
`generationAllowed: false`. Those holds are intact and unweakened.

However `not_participant_fillable_no_fixture_fill` is asserted on 34 families that all have
`participantFillable: true` and a non-zero canonical fixture fill (1 to 16 fields each). The hold
does not describe the artifact it is attached to.

Separately, 10 families record `revision: null` (all six NE, plus KY `aoc-334`, `aoc-496-3`,
`aoc-497`, `aoc-333`) even though the canonical bundle filename carries the revision — e.g.
`NE__FORM__CC-6-11__…__REV-2024-04__EN.pdf`. The six NE records also leave `officialTitle`,
`documentRole`, `sourceStatus`, `freshnessStatus`, `declaredPages` and `pageCountAgrees` null and
record `declaredFieldCount: 0` against `observedAcroFieldCount: 19`.

53 families record `structuralClassAgrees: false` (declared `acroform_pdf` vs observed `acroform`).

**Acceptance condition:** `not_participant_fillable_no_fixture_fill` appears only on families with
`filled == 0`; every source record carries the revision the bundle filename encodes; the six NE
records are completed; `structuralClassDeclared` and `structuralClassObserved` are reconciled to one
vocabulary.

## S-5 — Overlay ink is blue, not black (9 flat_overlay families)

The flat-overlay path draws with `color: rgb(0, 0, 0.55)`. Verified visually at 300dpi in
`AR ar-acic-petition-to-seal-misdemeanor-dwi-or-bwi-conviction`. Fine as an internal preview marker;
it is not filed ink, and the distinction should be explicit before any of these reach `approved_for_live`.

---

# Family-specific correction_required items

Each line names: branch / job / track / family / file / fixture / page or component / defect /
likely owner / acceptance condition.

### C-1 — NC AOC-CV-226 (English) financial affidavit is systematically mis-bound
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 official-form implementation ·
  **track** NC expunction fee-waiver support · **family** `north-carolina/aoc-cv-226-support-en`
* **file** `data/rcap-all50/overlays/production/north-carolina/aoc-cv-226-support-en/production-field-map.json`
* **fixture** `fixtures/canonical-filled.pdf` and `fixtures/boundary-filled.pdf`, **page 1**
* **defect** `participant.full_legal_name` is bound to `ApplicantStreetNumberAndStreetNameLine1` and
  `Line2` (the name prints in the street rows), and to
  `ApplicantEmploymentIncomeMonthlyAmount` and `MoneyOwedToOrHeldForApplicantAssetsAmount` — a person's
  name printed in the sworn dollar-amount fields of a G.S. 7A-450 Civil Affidavit of Indigency, which
  renders as `$dan Avery Reyes` and `$an y Fitzwilliam III`. `participant.street_address` is bound to
  `ApplicantFullPermanentMailingAddressCity`, `…State` (a 24pt widget) and `…Zip`, and to
  `ApplicantsEmployerNameAndAddress` and `SpousesEmployerNameAndAddress` — outside-party fields.
  Evidence: `defect-evidence/F3-002_NC-aoc-cv-226_misbound-name-and-money-fields.jpg`.
* **likely owner** Terminal D1 (field-map author for NC)
* **acceptance** no binding writes a name into a currency field or an address into a City/State/Zip
  field; `SpousesEmployerNameAndAddress` and `ApplicantsEmployerNameAndAddress` are reclassified as
  outside-party and left blank or bound to their own facts; the canonical fixture produces zero
  clipping findings; a contact sheet showing the fill is inspected and every value sits under its own
  printed label.

### C-2 — AL SBI Form 46 enters the applicant as their own two witnesses
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** AL criminal-history
  review support · **family** `alabama/sbi-form-46-support-en`
* **file** `…/alabama/sbi-form-46-support-en/production-field-map.json` and `field-classification.json`
* **fixture** `fixtures/canonical-filled.pdf`, **page 1** — Personal Information block and the
  witness/notary block
* **defect** `Full Name (First, Middle, Last, Suffix)` is classified `manual` and renders empty, while
  the same `participant.full_legal_name` is written into `Name of Witness` **and** `Name of Witness_2`,
  with `Address of Witness`/`_2` and `City State and Zip`/`_2` filled with the applicant's own address —
  on a form whose release requires "two witnesses **OR** notarized". Separately, the `Work Phone`
  AcroForm widget sits at x=363-533, y=606-621, which is the **Race → "Other (please specify)"** line
  (the printed `Work Phone:` label is at y=582), so the bound phone `555-0142` renders as the
  self-specified race; and `Issuing State` is filled with `participant.state` while
  `Drivers License Number` is blank, asserting an issuing state for a licence number that is not given.
  `Work Email Address` is bound to `participant.street_address`.
  Evidence: `defect-evidence/F3-003_AL-SBI-46_applicant-as-own-witness_phone-on-race-line.jpg`.
* **likely owner** Terminal D1 (field-map and classification author for AL)
* **acceptance** the applicant's own `Full Name` field is bound; no witness, notary or other
  outside-party field receives participant data; every binding is validated against the widget's
  **position** relative to its printed label, not only against the field's internal name; `Issuing
  State` is written only when a licence number is written.

### C-3 — AL C-94A serves the licensing board at the petitioner's home address
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** AL Order of Limited
  Relief · **family** `alabama/c-94a-source-gated-en`
* **file** `…/alabama/c-94a-source-gated-en/production-field-map.json`
* **fixture** `fixtures/canonical-filled.pdf` (defect) and `fixtures/boundary-filled.pdf` (clipping),
  **page 1** caption block
* **defect** `Mailing Address of Board or other entity to be served`, its `City State Zip Code` and its
  `Telephone Number` are filled with the participant's own street, city and phone, so the service block
  for the licensing board carries the petitioner's address; meanwhile the `, Petitioner v. ,
  Respondent` name line is left blank. Boundary additionally truncates the county to
  `Saint Bartholomew and the N` and the case number to `0123-45-2026-CR-900`.
  Evidence: `defect-evidence/F3-004_AL-C-94A_board-service-address_and_boundary-clipping.jpg`.
* **likely owner** Terminal D1 (field-map author for AL)
* **acceptance** the board/entity service block is reclassified as outside-party and left blank (or
  bound to a board fact), the petitioner name line is bound, and the boundary fixture renders the
  county and case number in full.

### C-4 — AR ACIC Petition to Seal Felony writes the petitioner's name into the arrest-date blank
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** AR Act 1460 felony
  sealing · **family** `arkansas/ar-acic-petition-to-seal-felony-under-act-1460-source-gated-en`
* **file** `…/production-field-map.json`
* **fixture** `fixtures/canonical-filled.pdf`, **page 1**, numbered paragraph 1 and the caption
* **defect** `1 The Defendant was arrested on the` — the day-of-month blank — is bound to
  `participant.full_legal_name`, so the petition reads "The Defendant was arrested on the
  *Jordan Avery Reyes* day of ___". The caption field `(First, Middle and Last name)` is bound to
  `participant.last_name` and renders `Reyes` alone. `and charged with the offenses of`
  (widget x=124, y=383 — the date-continuation blank) receives `matter.charge`.
  `misdemeanor in violation of A C A_2` is a **15pt-wide** widget bound to `matter.charges[1].charge`,
  and `Defendants Address` is a **39pt-wide** widget bound to `participant.street_address`.
  Evidence: `defect-evidence/F3-005_AR-petition-seal-felony_name-in-arrest-date-blank.jpg`.
* **likely owner** Terminal D1 (field-map author for AR)
* **acceptance** date blanks receive date facts only; the caption carries the full legal name; no
  binding targets a widget too narrow to hold its fact class; the canonical fixture produces zero
  clipping findings.

### C-5 — Two more AR families put the name in the arrest-date blank
* **families** `arkansas/ar-acic-order-to-seal-felony-under-act-1460-source-gated-en` and
  `arkansas/ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-`
* **file** `…/production-field-map.json` · **fixture** `fixtures/canonical-filled.pdf`, **page 1**,
  paragraph 1
* **defect** same binding as C-4: `1 The Defendant was arrested on the` ← `participant.full_legal_name`.
* **likely owner** Terminal D1 · **acceptance** as C-4.

### C-6 — AK DPS CRI-103 names the participant as the privilege decision-maker
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** AK APSIN record
  correction · **family** `alaska/dps-cri-103-source-gated-en`
* **file** `…/alaska/dps-cri-103-source-gated-en/overlay-profile.json`
* **fixture** `fixtures/canonical-filled.pdf`, **page 1**, the yellow right-hand panel
* **defect** `Requester Name` and `Subject Name` are left blank while the participant's name and phone
  are drawn into the panel headed "Complete this section if the information … was or will be used to
  deny a right or a privilege → **Person responsible for granting or denying privilege**: Name /
  Telephone". The participant is thereby named as the official who denied them the privilege.
  Evidence: `defect-evidence/F3-006_AK-DPS-CRI-103_participant-named-as-privilege-decisionmaker.jpg`.
* **likely owner** Terminal D1 (overlay anchor author for AK)
* **acceptance** the outside-party panel is left entirely blank, `Subject Name` and the participant's
  own telephone/e-mail anchors are bound instead, and the anchor labels are disambiguated by their
  enclosing section heading rather than by the bare label text.

### C-7 — Four NC translations are completed despite a printed do-not-file instruction
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** NC expunction
  language access · **families** `north-carolina/aoc-cr-287-form-es`, `aoc-cr-288-form-es`,
  `aoc-cv-226-support-es`, `aoc-cv-226-support-vi`
* **file** `…/<family>/source-record.json` and `overlay-profile.json`
* **fixture** `fixtures/canonical-filled.pdf`, **page 1** header
* **defect** each source prints, at the top of page 1 and as a diagonal watermark, "NOTE: THIS FORM IS
  FOR INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM FOR FILING. USE THE ENGLISH VERSION OF
  THE AOC-… INSTEAD." (verified by `pdftotext` on all four). The overlay nonetheless writes a matter
  value onto each — the file number on the `-es`/`-vi` CV-226 sheets, `State: XX` on CR-287-es. The
  source records describe them as ordinary "Participant-completed filing" and carry **no** non-filing
  hold, so a required hold is absent rather than merely weakened.
  Evidence: `contact-sheets/D1__NC__aoc-cv-226-support-es.jpg`, `D1__NC__aoc-cr-287-form-es.jpg`.
* **likely owner** Terminal D1, with a state-pack legal-design confirmation for NC
* **acceptance** each of the four carries an explicit non-filing hold (e.g.
  `translation_informational_never_filed`), `ownershipDetermination` is corrected from
  "Participant-completed filing", and no participant or matter value is written onto the translation —
  it is delivered blank alongside the English form.

### C-8 — Six NE families: dropdown never selects, and a calculate script overwrites the bound value
* **branch** `claude/rcap-terminalize-d-official-forms` · **job** D1 · **track** NE set-aside /
  sealing · **families** `nebraska/cc-6-11-form-en`, `cc-6-11-2-form-en`, `cc-6-12-form-en`,
  `cc-6-15-1-form-en`, `dc-1-15-form-en`, `dc-6-7-2-form-en`
* **file** `…/<family>/production-field-map.json`, `…/source-record.json`
* **fixture** `fixtures/canonical-filled.pdf`, **page 1** caption
* **defect** `TYPEOFCOURTDROPDOWN` is bound to `matter.court` but the option match fails
  (`option_not_in_list`), leaving the caption at `IN THE ___________ COURT OF`; the option that should
  be selected is `IN THE DISTRICT COURT OF`. `TYPEOFCOURTRESULTS`, which *is* written with
  `District Court`, sits in the AcroForm `/CO` calculation order and carries
  `event.value = this.getField("TYPEOFCOURTDROPDOWN").value;`, so a calculation-running viewer replaces
  the good value with the placeholder. `DROPDOWNCOUNTY2` is classified `manual`, so the caption also
  carries no county. All six source records leave `revision`, `officialTitle`, `documentRole`,
  `sourceStatus`, `freshnessStatus`, `declaredPages` and `pageCountAgrees` null.
  Evidence: `contact-sheets/D1__NE__cc-6-11-form-en.jpg`.
* **likely owner** Terminal D1 (field-map author for NE)
* **acceptance** the court dropdown selects the correct option (matching on the export value, not the
  display string), or the family is failed closed rather than shipped with a placeholder caption; the
  `/CO` calculate script is removed with the rest of the JavaScript per S-3; the county is bound or its
  `manual` classification is justified in the handoff; the six source records are completed.

### C-9 — KY AOC-496-2 puts the street address in the City and Zip fields
* **family** `kentucky/aoc-496-2-form-en` · **file** `…/production-field-map.json` ·
  **fixture** `fixtures/canonical-filled.pdf`, page 1 defendant address block
* **defect** `Def.Address.City` and `Def.Address.Zip` (a 40pt widget) are both bound to
  `participant.street_address`; 3 further values are silently truncated by form `maxLength`.
* **likely owner** Terminal D1 · **acceptance** City and Zip receive `participant.city` and
  `participant.zip`; no value is truncated by `maxLength` without being routed to an addendum.

### C-10 — NC AOC-CR-297 and AOC-CR-298 put the street address in the e-mail field
* **families** `north-carolina/aoc-cr-297-form-en`, `north-carolina/aoc-cr-298-form-en`
* **file** `…/production-field-map.json` · **fixture** `fixtures/canonical-filled.pdf`, page 1
* **defect** `EmailAddressOfRecord` ← `participant.street_address`.
* **likely owner** Terminal D1 · **acceptance** the e-mail of record receives `participant.email` or
  is left blank.

### C-11 — CA CR-180 writes an offense description into a yes/no eligibility column
* **branch** `claude/rcap-terminalize-e-hard-forms` · **job** `T-E-CA-production-packet` ·
  **tracks** `ca-1203-41/42/43/4a`, `ca-17b-reduction` ·
  **family** `california/cr-180-petition-for-dismissal`
* **file** `data/rcap-all50/hard-forms/california/cr-180-petition-for-dismissal/profile.json`
* **fixture** `fixtures/canonical.json` and `fixtures/boundary.json`, **page 1**, conviction table Row 1
* **defect** the binding `…ConvTable[0].Row1[0].Offense1[0] ← offense1Description` writes
  `Petty theft` (canonical) and `Shoplift — see Attachment A` (boundary) into the table's fifth column.
  That widget occupies x=453.6–569.3, and `pdftotext -bbox` places the printed header
  `Code, § 17(d)(2) (yes or no)` at x=453.6–569.6 — the same column. The XFA field name `Offense1[0]`
  is misleading: the column asks a yes/no eligibility question. The fourth column `Reduce1[0]`
  (`§ 17(b) (yes or no)`) has no binding and stays blank, so of the two eligibility answers the form
  asks for, one is wrong and one is missing. CR-180 has no column for a narrative offense description.
  Evidence: `defect-evidence/F3-007_CA-CR-180_offense-description-in-17d2-yes-no-column.jpg`.
* **likely owner** Terminal E (CA hard-form profile author), with a CA legal-design call on what the
  17(b)/17(d)(2) answers should be
* **acceptance** `Offense1[0]` and `Reduce1[0]` receive only yes/no eligibility values (or stay blank
  pending the legal-design call), `offense1Description` is removed from the CR-180 profile or routed to
  MC-025/MC-031, and a rendered fixture shows each conviction-table cell under its own printed header.

### C-12 — CA CR-409 and CR-410 duplicate the "People v." caption
* **branch** `claude/rcap-terminalize-e-hard-forms` · **job** `T-E-CA-production-packet` ·
  **track** `ca-851-91` · **families** `california/cr-409-petition-to-seal-arrest-records`,
  `california/cr-410-order-to-seal-arrest-records`
* **file** `…/<family>/profile.json` (bindings `rightCaption[0].TCCaseName[0]` and
  `Stamp_court_case[0].TCCaseName_ft[0]`, both ← `caseName`)
* **fixture** `fixtures/canonical.json` and `fixtures/boundary.json`, **page 1**, "Trial Court Case
  Name" box
* **defect** the box pre-prints `People of the State of California v.`; the fill adds
  `People v. Rivera` / `People v. Featherstonehaugh-Wetherby`, so the rendered caption reads
  "People of the State of California v. People v. Rivera". CR-409's boundary `caseName` is also a
  canonical-length value carrying the wrong surname for the boundary participant, so the field is never
  stress-tested. Evidence: `defect-evidence/F3-008_CA-CR-409-CR-410_duplicated-people-v-caption.jpg`.
* **likely owner** Terminal E (CA hard-form profile author)
* **acceptance** `TCCaseName` receives only the defendant portion of the caption (the fact supplies
  what follows the pre-printed `v.`), the boundary fixture supplies a boundary-length case name matching
  its participant, and a rendered fixture shows the caption reading once.

### C-13 — CA CR-181 boundary fixture does not exercise long values, and its caption is unaccounted for
* **branch** `claude/rcap-terminalize-e-hard-forms` · **job** `T-E-CA-production-packet` ·
  **tracks** `ca-1203-41/42/43/4a`, `ca-17b-reduction` ·
  **family** `california/cr-181-order-for-dismissal`
* **file** `…/cr-181-order-for-dismissal/fixtures/boundary.json` and `profile.json`
* **fixture** `fixtures/boundary.json`, **page 1** caption
* **defect** the boundary fixture is a near-copy of canonical — `participantStreet`,
  `participantCity`, `participantZip`, `participantPhone` and `participantEmail` are all
  canonical-length, so 10 of the 12 bound fields are never stress-tested and check 5 cannot be
  discharged from the committed artifact. The same fixture sets `courtCounty: San Francisco` against
  `courtCityZip: San Bernardino, CA 92415-0210`. Separately, the page-1 caption `DEFENDANT` and
  `CASE NUMBER` are neither bound nor listed in `protectedFields` (only the page-2
  `CaseNumber2[0]` is protected), so the proposed order is lodged with a blank case caption.
  Evidence: `contact-sheets/E__cr-181-order-for-dismissal.jpg`.
* **likely owner** Terminal E (CA hard-form fixture and profile author)
* **acceptance** `boundary.json` carries maximum-length values for every bound field and an internally
  consistent court block; the page-1 caption `DEFENDANT` and `CASE NUMBER` are either bound or
  explicitly listed as protected with a reason.

---

# Check-by-check summary

| # | Check | Result |
|---|---|---|
| 1 | Correct official source and revision | **unverified** for all 69 (source binaries absent from the clone). Additionally **fail** on 10 D1 families whose `revision` is null. |
| 2 | Source SHA matches the recorded/pinned value | **unverified** against the official bytes. Internally consistent across all 89 D1 packages (0 disagreements); all 4 lane-E derived sources hash exactly to their pins; all recorded D1 render artifacts hash byte-for-byte to disk (0 drifts). |
| 3 | Field census completeness | **pass**. D1: every census field classified, every binding resolves to a census field, `classCounts` reconcile, in all 89 families. E: all 4 CA families account for every terminal field (81/81, 58/58, 39/39, 26/26) as bound, protected or `unbound_available`. Exception noted in C-13. |
| 4 | No clipping or overlap | **fail** on all 53 D1 acroform families (S-2). **pass** on the 9 flat_overlay families and all 4 lane-E families. |
| 5 | Long-name and multiline behaviour | **fail** on all 53 D1 acroform families. **pass** on flat_overlay (shrink-to-fit works, verified at 300dpi) and on E CR-180/CR-409/CR-410. **fail** on E CR-181 (fixture does not exercise it). |
| 6 | Protected and outside-party fields blank | **pass** on 55 D1 families and all E families — no court-use, judge, clerk, signature or notarisation field is written anywhere, and E's proposed orders keep every decretal box blank. **fail** on 7 D1 families (C-1, C-2, C-3, C-6). |
| 7 | No unresolved placeholders | **pass**. Strict scan of all 200 output PDFs for `{{`, `}}`, `TODO`, `TBD`, `FIXME`, `Lorem`, `${`, `<%`, `null`, `undefined`, `[object Object]`, `NaN`: **0 hits**. The `[  ]` and `XXX-XX-____` sequences that a loose scan flags are pre-printed official checkbox and SSN-mask text — confirmed because they appear at exactly 2× the count in the blank-plus-filled contact sheets. |
| 8 | Correct page sequence | **pass**. Every D1 fixture matches its source record's `pageGeometry` page count; every E output matches `output-fingerprints.json` (CR-180 3pp, CR-181 2pp, CR-409 2pp, CR-410 1pp). |
| 9 | No active XFA, no JavaScript | **XFA: pass everywhere** — 0 `/XFA` in all 188 D1 outputs, and lane E deletes the XFA package from four hybrid LiveCycle sources and proves its removal by re-read. **JavaScript: fail on 27 D1 families** (S-3); pass on the other 26 D1 families and all E outputs. |
| 10 | Official appearance preserved | **pass** in the fixture renders for 58 D1 families and E CR-181; **fail** on E CR-180 and CR-409/CR-410 (value in the wrong column / duplicated caption) and on the D1 families in C-1…C-6. Note for all 53 D1 acroform families: appearance is only assessable from the fixture render, because the committed contact sheet is unusable (S-1). |
| 11 | Source/currentness and legal-design holds preserved | **pass** on the runtime holds — all 62 D1 families keep `generationAllowed: false` and all three mandatory holds, and all 25 source-gated families keep `source_gated_never_runtime_selectable` with `freshnessStatus: source_or_currentness_gate_open`. Lane E's three deferrals each name missing evidence, owner and next action, unweakened. **fail** on the 4 NC translations (required non-filing hold absent, C-7) and on 34 families carrying a hold that contradicts their own artifact (S-4). |

---

---

# Appendix — disposition per family (69)

| Lane | Jur | Family | Kind | Disposition |
|---|---|---|---|---|
| D1 | AK | `dps-cri-103-source-gated-en` | flat_overlay | **correction_required** |
| D1 | AK | `tf-800-form-en` | acroform | **correction_required** |
| D1 | AK | `tf-805-form-en` | acroform | **correction_required** |
| D1 | AK | `tf-810-form-en` | acroform | **correction_required** |
| D1 | AL | `c-94a-source-gated-en` | acroform | **correction_required** |
| D1 | AL | `sbi-form-46-support-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-of-probation-under-act-346-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-dismiss-and-seal-first-offenders-act-346-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-dismiss-and-seal-post-adjudication-drug-court-off-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-dismiss-and-seal-pre-adjudication-drug-court-offe-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-arrest-under-act-1460-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-controlled-or-counterfeit-substance-possessi-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-felony-under-act-1460-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-misdemeanor-dwi-or-bwi-conviction-source-gated-en` | flat_overlay | **held_on_source_or_design** |
| D1 | AR | `ar-acic-order-to-seal-misdemeanors-under-act-1460-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-nolle-prosequi-dismissal-acquittal-or-no-cha-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-order-to-seal-records-of-pardoned-offender-or-youthful-fel-source-gated-` | flat_overlay | **held_on_source_or_design** |
| D1 | AR | `ar-acic-order-to-seal-under-community-punishment-act-531-and-act-1-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-dismiss-and-seal-post-adjudication-drug-court-source-gated-e` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-dismiss-and-seal-pre-adjudication-drug-court-o-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-dismiss-and-seal-veterans-treatment-specialty-source-gated-e` | flat_overlay | **held_on_source_or_design** |
| D1 | AR | `ar-acic-petition-to-seal-arrest-under-act-1460-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-seal-controlled-or-counterfeit-substance-posse-source-gated-` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-seal-felony-under-act-1460-source-gated-en` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-seal-misdemeanor-dwi-or-bwi-conviction-source-gated-en` | flat_overlay | **held_on_source_or_design** |
| D1 | AR | `ar-acic-petition-to-seal-nolle-prosequi-dismissal-acquittal-or-no-source-gated-e` | acroform | **correction_required** |
| D1 | AR | `ar-acic-petition-to-seal-under-community-punishment-act-531-and-ac-source-gated-` | acroform | **correction_required** |
| D1 | KY | `aoc-333-source-gated-en` | acroform | **correction_required** |
| D1 | KY | `aoc-334-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-496-2-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-496-3-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-496-4-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-496-5-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-496-form-en` | acroform | **correction_required** |
| D1 | KY | `aoc-497-3-source-gated-en` | acroform | **correction_required** |
| D1 | KY | `aoc-497-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cr-287-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cr-287-form-es` | flat_overlay | **correction_required** |
| D1 | NC | `aoc-cr-288-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cr-288-form-es` | flat_overlay | **correction_required** |
| D1 | NC | `aoc-cr-296-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cr-297-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cr-298-form-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cv-226-support-en` | acroform | **correction_required** |
| D1 | NC | `aoc-cv-226-support-es` | flat_overlay | **correction_required** |
| D1 | NC | `aoc-cv-226-support-vi` | flat_overlay | **correction_required** |
| D1 | NE | `cc-6-11-2-form-en` | acroform | **correction_required** |
| D1 | NE | `cc-6-11-form-en` | acroform | **correction_required** |
| D1 | NE | `cc-6-12-form-en` | acroform | **correction_required** |
| D1 | NE | `cc-6-15-1-form-en` | acroform | **correction_required** |
| D1 | NE | `dc-1-15-form-en` | acroform | **correction_required** |
| D1 | NE | `dc-6-7-2-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1201-a-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1201-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1203-a-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1203-b-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1203-form-en` | acroform | **correction_required** |
| D1 | VA | `cc-1473-form-en` | acroform | **correction_required** |
| D1 | VT | `200-00130-form-en` | acroform | **correction_required** |
| D1 | VT | `200-00132-form-en` | acroform | **correction_required** |
| D1 | VT | `200-00132a-form-en` | acroform | **correction_required** |
| D1 | VT | `600-00228-support-en` | acroform | **correction_required** |
| E | CA | `cr-106-proof-of-service` | tier_1_capable_binding_policy_open | **held_on_source_or_design** |
| E | CA | `cr-180-petition-for-dismissal` | tier_1_hybrid_xfa_shadow_fill | **correction_required** |
| E | CA | `cr-181-order-for-dismissal` | tier_1_hybrid_xfa_shadow_fill | **correction_required** |
| E | CA | `cr-409-petition-to-seal-arrest-records` | tier_1_hybrid_xfa_shadow_fill | **correction_required** |
| E | CA | `cr-410-order-to-seal-arrest-records` | tier_1_hybrid_xfa_shadow_fill | **correction_required** |
| E | DE | `family-court-form-281` | exact_supported_deferral | **held_on_source_or_design** |
| E | ME | `cr-289-motion-to-seal-prostitution-conviction` | exact_supported_deferral | **held_on_source_or_design** |


---

# Evidence index

* `F3-DISPOSITIONS.json` — one entry per family: disposition, findings, all 11 checks, holds, pinned SHA.
* `contact-sheets/` — 66 three-up **blank | canonical | boundary** sheets (page 1), one per implemented
  family, built by F3 because D1's own sheets do not show the fill.
* `defect-evidence/` — eight annotated crops for the findings called out above.

Every image in this directory was rendered from the committed artifacts at the two target SHAs and was
inspected before the corresponding claim was written.
