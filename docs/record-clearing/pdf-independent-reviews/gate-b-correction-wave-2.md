# Gate B correction wave 2 — wave C shards B and C

No family is approved and nothing is promoted. Both shards refused every family at the same step: the official source bytes were absent from the environment they ran in, and the contract forbids accepting the producing lane's own receipt as source proof. That refusal is a statement about where the reviewer ran, not about any artifact.

## The blocker that is not a defect

**WCB-SOURCE-UNVERIFIABLE** — RCAP_BUNDLE_EXTRACT was unset and no Master Library extract was present on the reviewers' filesystem, so no official source SHA-256 could be recomputed.

Run the re-review in a worktree that has the Edition 1 extract mounted with RCAP_BUNDLE_EXTRACT exported. Four such worktrees exist and were verified to recompute all six named source hashes to their pinned values; the reviewers that produced these records ran elsewhere.

Both shards completed every other section, and both suites pass in their own worktrees. Only §2 needs repeating.

## Not consumed

- **shard a** — ran in the wrong environment, never reached the review base, derived zero families and issued zero verdicts; its blocker-only record is not a review result
- **shard d** — the transcript ends mid-review with no final verdict rollup and no consumable final commit

## Reopened

### ESC-CAPTION-VARIANTS

Prior claim: recorded closed, with provenAgainstThisFamilysBytes set on the affected families. That flag is not accepted as evidence.

Shard C reproduced this escalation's own stated mutation. It requires that flattening a form with an unselected dropdown leave no prompt string in the page content stream; 'Choose the court' and 'Choose the county' are in the content stream of three finalized Nebraska artifacts at this base.

Carried by: WCC-CHOOSER-PROMPT-ON-FILED-PAGE, WCB-CAPTION-ENCODING

### ESC-NO-REFUSE-WHEN

Prior claim: recorded closed against several families. That flag is not accepted as evidence.

Shard B closed it for NC AOC-CR-287 and AOC-CR-288 against the bytes, and found it only partially closed for NC AOC-CR-296: DLState takes participant.state, and the refuseWhen guards cannot catch it because the field prints no caption and the binder matched on the name alone. A guard that only inspects captions does not cover a field that has none.

Carried by: WCB-B-296-DLSTATE

## Owner decisions

### NC:aoc-cr-296-form-en — prosecutor_controlled

Not delivered as a participant artifact and not counted toward any checkout or packet-completion gate. It may be named to the participant as a step the district attorney controls, with guidance saying so.

Still carries: WCB-B-296-STREETADDR, WCB-B-296-DLSTATE. The ownership decision does not retire the technical findings. Whether or not this form is participant-filled, a binder that withholds a street address because a title-block line in another column was read as the governing heading is wrong, and the fix is shared.

### NE:cc-6-12-form-en — not_an_owner_question

The caption name is the participant's own, so there is no ownership question to answer. The verdict is re-read as the technical correction it actually describes, and the family joins the correction wave rather than waiting on a decision.

Still carries: WCC-CHOOSER-PROMPT-ON-FILED-PAGE. Recorded here so the re-review does not stall this family behind a decision nobody needs to make.

## Corrections dispatched

| id | owner | direction | families |
| --- | --- | --- | --- |
| WCB-B-REGION-ATTRIBUTION | shared geometry | over-protection | 4 |
| WCB-CAPTION-ENCODING | shared geometry | both | 3 |
| WCC-CHOOSER-PROMPT-ON-FILED-PAGE | shared finalizer | residue | 3 |
| WCB-B-296-DLSTATE | shared semantics | wrong fact written | 1 |
| WCB-B-298-RECORDS-OFFICER-NAME | source acquisition, then the family package | unknown until the source is read | 1 |
| WCB-B-298-SOURCEURL | the family package | provenance | 1 |

### WCB-B-REGION-ATTRIBUTION

_systemic; raised by wave-c-shard-b; owned by shared geometry — scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs_

**Finding.** regionHeading and effectiveLabel are attributed across columns and across rows, so a widget's protection is frequently decided from printed text that does not govern it.

**Proven damage.** NC AOC-CR-296: StreetAddr and MailAddr — the defendant's own address lines at x=38, sitting between the bound name line and the bound city line — are refused as protected_page_region / prosecutor under the heading 'DISTRICT ATTORNEY PETITION', which is a line of the title block in the right-hand column. The filed petition carries a name and a city and no street address.

**Correction.** Constrain region attribution to headings whose horizontal extent overlaps the widget's column, and caption attribution to the caption cell above or left of the widget within that column, rather than the whole row.

**Families.** NC:aoc-cr-287-form-en, NC:aoc-cr-288-form-en, NC:aoc-cr-296-form-en, NC:aoc-cr-298-form-en

### WCB-CAPTION-ENCODING

_systemic; raised by wave-c-shard-b and wave-c-shard-c, independently; owned by shared geometry — scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs_

**Finding.** Printed captions are harvested without applying the font's ToUnicode mapping, so Identity-H and UTF-16 text arrives as undecoded glyph codes. A protection channel that reads captions is blind wherever that happens, and it fails silently.

**Proven damage.** NC AOC-CV-226: two fields classified `participant` are refused as category `money` because their unreadable label matched the money rule. NC AOC-CR-287 carries the same mojibake in its census. NE DC-1-15 — held out of the evidence wave — still writes `printedname` on page 2 inside its Certificate of Service, and its headings decode to nothing.

**Correction.** Decode printed text through the font's ToUnicode CMap when harvesting captions and region headings in the census, then re-derive the maps.

**Families.** NC:aoc-cr-287-form-en, NC:aoc-cv-226-support-en, NE:dc-1-15-form-en

### WCC-CHOOSER-PROMPT-ON-FILED-PAGE

_substantive, participant-facing; raised by wave-c-shard-c; owned by shared finalizer — scripts/rcap-official-forms/rcap-official-form-finalize.mjs_

**Finding.** Refusing to write a widget leaves the source appearance stream in place, so an unselected dropdown's prompt is flattened onto the filed page. 'Choose the court' is drawn at (144.3,120.2,198.6,131.0) inside TYPEOFCOURTDROPDOWN and 'Choose the county' at (291.8,120.2,351.3,131.0); on CC 6:12 the prompt overprints the court's own printed caption.

**Proven damage.** Three Nebraska families file a pleading carrying interface instructions as ink. This is the mutation ESC-CAPTION-VARIANTS itself declares must fail, and it does not.

**Correction.** At finalize, clear the appearance stream of every widget that was refused or left unwritten before flattening, rather than preserving the source appearance.

**Families.** NE:cc-6-11-form-en, NE:cc-6-11-2-form-en, NE:cc-6-12-form-en

### WCB-B-296-DLSTATE

_substantive, wrong fact in production; raised by wave-c-shard-b; owned by shared semantics — scripts/rcap-official-forms/rcap-field-semantics.mjs_

**Finding.** DLState binds participant.state. The residence state and the state that issued a driver's licence are different facts; the field carries no printed caption, so the binder had only the name to work from and the refuseWhen guards never saw a subject to refuse.

**Proven damage.** The canonical fixture renders the participant's residence state in the Drivers License State column.

**Correction.** Add the driver's-licence cluster to the government_identifier rule's name test so DLState is refused on its name the way DLNo already is.

**Families.** NC:aoc-cr-296-form-en

### WCB-B-298-RECORDS-OFFICER-NAME

_substantive, participant-facing, not previously recorded anywhere; raised by wave-c-shard-b; owned by source acquisition, then the family package_

**Finding.** A records-officer name appears in a cell the reviewer could not attribute to any participant binding, and could not check against the blank source because the corpus was absent from their environment.

**Proven damage.** Unresolved: this needs the pinned source opened, which this reviewer could not do.

**Correction.** Open the pinned source under RCAP_BUNDLE_EXTRACT and inspect that cell. If the official blank does not print the name, re-acquire AOC-CR-298 REV-2025-07 and re-render; if it does, record it as source ink.

**Families.** NC:aoc-cr-298-form-en

### WCB-B-298-SOURCEURL

_substantive provenance defect, provable without the corpus; raised by wave-c-shard-b; owned by the family package_

**Finding.** The provenance sidecar carries a sourceUrl that the reviewer could not tie to this form, where the other three families in the shard correctly fall back to the master-library locator.

**Proven damage.** A provenance locator that cannot be shown to resolve to this form is indistinguishable from one that does until somebody follows it.

**Correction.** Null the sourceUrl and let the master-library locator stand, as the sibling families do, or replace it with the AOC-CR-298 URL after confirming it resolves to this form.

**Families.** NC:aoc-cr-298-form-en
