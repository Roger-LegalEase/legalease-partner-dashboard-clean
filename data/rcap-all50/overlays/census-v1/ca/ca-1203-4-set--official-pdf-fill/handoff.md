# ca-1203-4-set — California Penal Code § 1203.4 (official_pdf_fill)

**Result: finished. The five official sources bind by exact SHA-256; a controlled
pipeline produces a tooling-readable rendition of each and proves it is the same
document on fourteen dimensions with zero deltas and deterministic bytes; all 217
fields are censused with geometry tied to the official binaries; 59 of 59 write
boxes are mapped to boxes the forms actually draw; canonical and boundary
fixtures are rendered for all five documents, verified from their own bytes at
their measured rectangles, and every one of the 18 pages is rastered and
reviewed. Zero blocking findings.**

This family is *not* `ca-1203-41-set`. That is a different statute, a different
packet and a sibling worker's family. Nothing here applies to it.

Nothing here approves an output, opens a commercial route or creates a
fulfilment record. `OUTPUT_LEGAL_APPROVAL_REQUIRED` is requested, not granted.

## 1. What the previous run left, and what changed

The previous run measured everything off the official bytes and stopped before
rendering, for two stated reasons. Both are now closed, and neither by an
exception:

**(a) There was no sanctioned way to write a filled artifact from an encrypted
source.** There is now: `scripts/rcap-corpus/build-tooling-readable-rendition.py`,
plus a preflight check (`readable_rendition_stage_declared`) that refuses to call
any family that declares a rendition request buildable unless the stage is
installed *and* its committed proof holds. Section 2 is the pipeline.

**(b) A filled artifact is not structurally the official form.** Still true, and
now stated as a decision rather than a hesitation. `build-findings.json`
`xfaDecision` records what the fill stage removes, what it does not, why the
obvious fear is the wrong one, and — importantly — that our own raster review
cannot be cited as evidence either way.

`SOURCE_FIDELITY_FINDING.md` is the predecessor's finding. It is unrevised and
nothing in it is contradicted; its §7 open items 1 and 2 are answered here and
its §7 item 3 remains open.

## 2. The pipeline: a rendition, and the proof that it is the document

The problem was never the encryption. All five sources open on the first try
with an **empty user password** in any conforming implementation, and their
`/P -1084` explicitly *allows filling in form fields*. The problem is that
**pdf-lib 1.17.1 implements no decryption at all**, so the only writer in this
repository cannot open them to write.

So the pipeline does not "get past" anything. It produces a tooling-readable
form of an official source and proves it is the same document.

| Control | How |
|---|---|
| Verify before transforming | The official SHA-256 is checked **before** pikepdf opens the file. A mismatch stops the run and nothing is transformed. |
| Never commit the intermediate | Renditions are written to `private/readable-renditions/ca-1203-4-set/`, which is git-ignored. No source binary, no derivative, no absolute container path, no symlink is committed. |
| Prove identity | Fourteen dimensions compared; **any** delta is a stop. |
| Record the transformation | `pikepdf 10.12.0` over `libqpdf 12.3.2`; `pikepdf.open(source, password='').save(out, deterministic_id=True)`; equivalently `qpdf --decrypt --deterministic-id`. |
| Deterministic bytes | Produced twice per run and asserted byte-identical, and byte-identical again across separate invocations minutes apart. |
| Output is a PDF | `application/pdf` asserted from the file's own bytes, not its extension. |

Compared, with **0 deltas on all five**: page count; per-page `/MediaBox`,
`/CropBox`, `/Rotate`, `/UserUnit`; per-page annotation count; per-page
content-stream SHA-256 and byte length; catalogue key set and `/NeedsRendering`;
AcroForm `/NeedAppearances`, `/SigFlags`, `/DA`, `/DR` font names; XFA presence,
shape, part names and packet SHA-256; optional-content groups, their `/Print`
and `/View` usage states and which pages use them; terminal field identities;
per field `/FT`, `/Ff`, `/MaxLen`, `/Opt`, widget count; per widget page index,
`/Rect`, `/F`; per widget `/AP /N` state names and appearance-stream SHA-256;
the document information dictionary; and trailer `/ID[0]`.

| Form | Official SHA-256 | Rendition SHA-256 | Pages | Fields | Deltas |
|---|---|---|---|---|---|
| CR-180 | `06c1b643…c98bbdbe` | `57b57b2f…5176a4fa` | 3 | 81 | 0 |
| CR-181 | `f737503a…95ce504` | `ef5d0e26…19764e05` | 2 | 58 | 0 |
| CR-106 | `f8a37a9a…bf190c5a` | `0c8fb5dd…72dcd97c` | 2 | 48 | 0 |
| MC-025 | `b0ca1509…94f6f0af` | `e0118ec4…58c4dcc03` | 1 | 12 | 0 |
| MC-031 | `defc9108…95191075` | `bd918db5…4ac69ab1` | 1 | 18 | 0 |

**The one normalisation, and it was measured rather than assumed.** qpdf's
default trailer `/ID` is derived from the clock: three default saves of CR-180 at
*t*, *t* and *t+3s* produced three different SHA-256 values. `deterministic_id`
derives it from the file's own content instead. What that changes is exactly
`/ID[1]` — the *changing* identifier, which ISO 32000-1 §14.4 expects to differ
whenever a file is written again. `/ID[0]`, the *permanent* identifier, is
preserved and is an asserted dimension of the comparison. The rendition keeps
the document's permanent identity and says, correctly, that it is a different
file of it.

**Geometry is still measured off the official binary, not off a rendition.**
`reports/official-field-census.json` and `reports/write-box-map.json` are read
from the official bytes by pikepdf. Every widget rectangle the build uses is
asserted equal to the official one to 0.011pt before anything is written, and a
disagreement stops the build. The rendition is where pdf-lib *writes*; it is
never where this family measures. No rescued derivative was opened.

## 3. XFA, decided rather than deferred

CR-180, CR-181 and CR-106 are hybrid **static** XFA (`/XFA` present,
`/NeedsRendering` absent). MC-025 and MC-031 carry none.

- **The rendition stage removes nothing.** Its whole claim is that the rendition
  *is* the document, so the packet is carried through and its SHA-256 is a
  compared dimension: identical on all three.
- **The fill stage removes it.** pdf-lib strips XFA on load, announcing it, with
  no option to keep it. What is lost is the `/XFA` packet and the publisher's
  permission bits. What is not lost — measured, not assumed — is every page's
  decoded content stream byte for byte, every page's geometry, every field's
  identity, type, flags and maximum length, and every widget's rectangle.
- **The obvious fear is the wrong one.** Because the packet is *removed* rather
  than left stale, there is no AcroForm/XFA desynchronisation and no risk of a
  viewer rendering the form blank.
- **Do not check this with the rasters.** The rasteriser does not render XFA at
  all, so a green raster is not evidence either way.

That is still an alteration to an official Judicial Council form, so it is put to
the reviewer in `approval-request.json` rather than settled here.

## 4. What measuring the forms found

Seven wrong bindings, each refused by ROLE and each **proved blank in the
artifact bytes** in both fixtures — see
`reports/role-refusals-proved-from-the-bytes.json`.

1–3. CR-180's court block is named `CrtStreet`, `CrtMailingAdd`, `CrtCityZip`.
`Crt` is not `court`, so `participant.street_address`'s own `/\bcourt\b/` refusal
never fires, and the harvested captions are the bare words STREET ADDRESS and
MAILING ADDRESS printed *inside the court box*. The participant's home address
and ZIP bound to the Superior Court's address, on a petition filed with that
court.

4. CR-181's `CrtStreet` took `matter.county` — the county name in the court's
street-address line. `captionOnly` does not reach it, because county *is* a
caption fact.

5. CR-181's page-2 short title took `participant.state`, off the squashed band
`PEOPLE OF THE STATE OF CALIFORNIA v. DEFENDANT:CASE NUMBER`, in which STATE
reaches `participant.state` before DEFENDANT reaches `full_legal_name`.

6. **MC-031's two caption blanks are attributed each other's captions.** Measured
on the official page: `PLAINTIFF/PETITIONER:` prints at y=730.56 and `FillText10`
sits at y=728.08–743.27; `DEFENDANT/RESPONDENT:` prints at y=715.14 and
`FillText9` sits at y=711.83–726.71. The harvester gives `FillText10` the label
"DEFENDANT/RESPONDENT" and `FillText9` the label "PLAINTIFF/PETITIONER…". Because
both labels reach `full_legal_name` the error is invisible in the binding and
visible only on the paper, where the petitioner appears as the plaintiff *and* as
the defendant. In a § 1203.4 matter the plaintiff is the People of the State of
California. The raster of `declaration-canonical/page-01.png` shows the
PLAINTIFF/PETITIONER line empty and the DEFENDANT/RESPONDENT line filled.

7. **`rowIndexOf()` reads any trailing digit as a table row.** MC-025's
`FillText5` and MC-031's `FillText11` are CASE NUMBER caption blanks, and
`matter.case_number` is a `ROW_FACT`, so they resolve to charge rows 5 and 11.
The **boundary fixture carries five charges precisely so row index 4 is
reachable** and this is live rather than masked by
`repeating_row_without_indexed_fact`: at five charges the binder would write the
fifth charge's case number into a continuation sheet's caption, and the role
refusal is the only thing stopping it. The bytes prove it.

## 5. One shared defect was repaired, and its blast radius measured

`SUPPRESS_CONTROL_APPEARANCE` did not hold on a nested field tree.
`detachFromAcroForm()` scanned only the **top level** of `/Fields`, which is every
field on a flat-named form and none of the terminals on an XFA-authored one. So a
suppressed pushbutton stayed in the form, `updateFieldAppearances` regenerated
the `/AP` that `dropWidgets` had just deleted (from `/MK /CA`), and `flatten`
found the widget's page through its `/P` and stamped the button face onto the
page. Filed CR-180, CR-181 and CR-106 carried `www.courts.ca.gov`,
`Print this form`, `Save this form`, `Clear this form` and the privacy warning as
ordinary ink.

`detachFromAcroForm` now walks the tree, which is what it already claimed to do.
All five census-v1 families were rebuilt after the change: **AK, both AR families
and MI are byte-identical**; **CT moved, and the entire move is four appearances
leaving its fixtures — `Print Form` and `Reset Form` on pages 1 and 2.** CT's own
`build-findings.json` had already recorded all eight as advisory findings
(`flattening_materialised_the_forms_own_widget_caption`, "recorded for visual
review"); it had seen the symptom without reaching the cause, and that advisory
list is now empty. CT's regenerated fixtures, rasters and hash records are
committed, because a committed artifact its own script no longer reproduces is
worse than an updated one.

Details and the full measurement: `build-findings.json` → `sharedModuleRepaired`.

## 6. What is written, and why so little

15 fields across five documents in the canonical fixture. The written set is
small for reasons stated field by field in `production-field-map.json`
(`whyTheWrittenSetIsSmall`) and `reports/blanks-left-for-the-participant.json`:

- **The party block is the biggest gap.** CR-180 and CR-181 head it `ATTORNEY OR
  PARTY WITHOUT ATTORNEY` and name every field in it `Atty*`, so the shared
  `attorney` protect rule refuses all eleven per form. That is right for a
  represented party and wrong for the self-represented petitioner this family
  serves — an **over-refusal**, left standing, because widening a protect
  category is not this family's call.
- **The conviction table is delivered blank.** CR-180 wants Code, Section and
  Type of offense in three columns; the vocabulary holds one `matter.charge`
  string. Writing it into the `Code` column would misstate the record to the
  court, which is the defect twelve blocked Arkansas and Kentucky artifacts were
  blocked for. Left blank and recorded as a vocabulary gap, not worked around.
- **No box is ticked, on any of the five.** All 59 checkable widgets are mapped
  to a box the form draws, with each widget's own `/AP /N` on-state (`1`, `2`,
  `3`, `4`, `5`, `6` — never `Yes`), and none is marked: on CR-180 each checkbox
  elects which subdivision of § 1203.4 the petitioner qualifies under, and on
  CR-181 each is the court's own ruling. Both are legal determinations. **No box
  was drawn by this build.**
- **CR-106 carries only its caption.** Under Code Civ. Proc. § 1013a service by
  mail is made by someone who is not a party, so the participant is not the
  server, and every service-block blank is refused by ROLE rather than by the
  `captionOnly` flag — a flag someone could turn off.

One expectation was **disproved by measurement and the record corrected**:
CR-106's Case Name blank was expected to understate the case name. It does not.
The form itself prints `People of the State of California` and `v.` inside the
box, so the defendant's name alone completes it exactly.

## 7. Reading the rasters

Every page of every fixture is rastered — 18 pages — and reviewed page by page.

**The raster is not the printed page, and the measurement says which way.**
CR-180, CR-181 and CR-106 each use exactly one optional-content block, on their
last page, in a group named `ViewOnly Layer` whose `/Usage` is
`/Print /PrintState /OFF`. That block is the light-grey panel behind the
`Clear This Form` warning (0.753 grey, `[36.00, 12.78, 247.29, 35.96]` on CR-180
page 3). **It appears in these PNGs and a conforming printer omits it.** It is
the court's own page content; nothing here rewrites a page.

The dangerous direction was checked: content in a `/PrintState /ON`,
`/ViewState /OFF` group would print and never appear in a raster. All three forms
*declare* such a group (`PrintOnly Layer`) and **no page of any of the five draws
a single block inside it**, so there is nothing on these documents that prints
and is invisible to this review.

## 8. Work-type status

| Work type | Status |
|---|---|
| `OFFICIAL_SOURCE_ACQUISITION_REQUIRED` | **CLEARED** as custody, 5/5 exact. Nothing acquired. |
| `OFFICIAL_FORM_MAP_REQUIRED` | **CLEARED.** 217/217 fields decided; `not_mapped` appears nowhere. 59/59 write boxes mapped. |
| `LOCAL_VARIATION_REQUIRED` | **ADDRESSED, statewide only** — `local-variation-record.json`. Zero of 58 counties has county-specific practice established from a source here. |
| `ARTIFACT_REVIEW_REQUIRED` | **CLEARED for this build's own review.** 10 fixtures rendered, verified from their bytes, 18 pages rastered, 0 blocking findings. The review is **not independent** — same worker. |
| `OUTPUT_LEGAL_APPROVAL_REQUIRED` | **REQUESTED, NOT GRANTED.** |

## 9. For the Captain

Four items, reported and not acted on. Full text in `build-findings.json`.

1. **pdf-lib can read no encrypted source**, so it cannot write a filled artifact
   from any of them — not just these five. This family built the rendition stage
   and a preflight check for it; whether the stage is adopted corpus-wide, and
   how it is declared, is a factory-level decision. `package.json` is the
   worker-image input and was **not touched**.
2. **`structuralClassObserved: "unreadable"`** in
   `data/rcap-all50/local-source-corpus-index.json` is a true statement about
   pdf-lib and a false statement about the documents. Shared manifest — **not
   edited here**. Likely affects every other encrypted entry.
3. **`rowIndexOf()`** reads any trailing digit in a field name as a repeating-row
   index. Corpus-wide class; two instances proved here.
4. **The shared appearance registry cannot take a sixth family** without editing
   the equality frozen in `verify-rcap-appearance-semantics.mjs`. This family
   recorded its two classifications locally instead, in the same schema and
   through the shared validating loader; that verifier still passes at exactly
   five families.

And one verifier that **was already failing at the branch point** and still is:
`verify-name-date-component-semantics.mjs`, on its frozen-totals check —
`157 of 162 censuses, 5352 of 5428 fields` at 2f023bd1, `157 of 162 censuses,
5352 of 5645 fields` after this build. The census count is unchanged; the field
count grows by 217 because this family is now enrolled in that scan, which the
check itself requires. The frozen record is outside this family's owned path.

One verifier **was repaired**: a predecessor on this branch wrote
`reports/field-census.json` here, which took
`verify-full-name-charge-caption-semantics.mjs` from 156 families to 157 and made
it fail. That file is renamed `reports/official-field-census.json` — also the
more accurate name for it — and the verifier passes again. Nothing was weakened
and the frozen diff record was not edited.

## 10. What this build did not do

No participant name in any charge, offence, count, statute or violation caption.
No prefilled signature, signature date, certificate of mailing or court-only
field. No box drawn, no box ticked. No verifier skipped or weakened. No source
binary, derivative, absolute container path or symlink committed. No rescued
derivative opened. `package.json`, `migrations/**`, production, payment and
sponsorship untouched. `data/rcap-all50/local-source-corpus-index.json` and
`data/rcap-grade-a/**` untouched. No other encrypted California family built,
dispatched or measured — the pipeline is what unblocks them, and finishing this
one first is what proves the pipeline.
