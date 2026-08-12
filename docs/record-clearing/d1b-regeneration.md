# D1B — Virginia, Kentucky and North Carolina, regenerated against D0

Lane D1B regenerates three states from the Edition-1 source pack against the
remediated official-form factory. Thirty-seven canonical binaries, all
hash-verified, all opened and censused first-hand.

- Branch: `claude/rcap-d1b-regenerate-va-ky-nc`
- Base: `03c14f985beda55596b894686bf70833e44a8f5b`
- Source pack: `RCAP_D_D1_SOURCE_PACK.zip`, sha256
  `01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa`
- Driver: `scripts/rcap-official-forms/lanes/d1b-regenerate.mjs`
  (`--audit`, `--verify`, or a bare run to build; optional state codes narrow it)

## Why a lane driver rather than the D1 script

`scripts/implement-rcap-official-forms-d1.mjs` reads and rewrites
`verified-binary-index.json` and `implementation-index.json`. Seven lanes are
running at once, so either write would clobber six other states' work. This
driver calls the same D0 factory modules and writes only its own three trees
plus a lane-scoped `state-index.json` per state, which the captain merges.

Two things in the D1 script would also have stopped it working here.
`notForFilingNotice` is referenced at both finalize call sites and never
defined, so every renderable family would land in the catch as
`finalize_refused`; and nothing in it detects the notice in the first place.
This driver detects the notice from the page and passes it in.

## What the numbers are

| | VA | KY | NC | total |
|---|---|---|---|---|
| families | 6 | 10 | 21 | 37 |
| source hash matches | 6 | 10 | 21 | 37 |
| AcroForm / flat overlay | 6 / 0 | 10 / 0 | 6 / 15 | 22 / 15 |
| fields inventoried | 498 | 331 | 668 | 1497 |
| fields safely bound | 70 | 40 | 83 | 193 |
| bindings refused | 428 | 291 | 585 | 1304 |
| refused as a protected category | 42 | 7 | 268 | 317 |
| refused as unreadable below 6pt | 2 | 0 | 1 | 3 |
| non-filing holds | 0 | 0 | 10 | 10 |
| finalized PDFs / contact sheets | 12 / 6 | 18 / 9 | 12 / 6 | 42 / 21 |

Every rendered family renders byte-identically twice. Every family refuses a
source whose bytes have been perturbed. Every family's mutation set fails
closed. `--verify` re-derives all of that from the committed files.

## The three things worth a reviewer's attention

### 1. Ten North Carolina translations are held, and four of them used to fill

Every Spanish and Vietnamese translation in the North Carolina corpus prints,
on page 1:

> NOTE: THIS FORM IS FOR INFORMATIONAL PURPOSES ONLY. DO NOT COMPLETE THIS FORM
> FOR FILING. USE THE ENGLISH VERSION OF THE AOC-CR-287 INSTEAD.

That is ten documents, not six: the AOC-CR-287 and AOC-CR-288 petitions, their
instruction sheets, and the AOC-CV-226 affidavit of indigency, in both
languages. All ten are now held, bind nothing, place no anchor and produce no
fill, and the hold is evidenced by handing the finalizer the sentence the
document prints and recording that it refused.

Four of them — `aoc-cr-287-form-es`, `aoc-cr-288-form-es`,
`aoc-cv-226-support-es`, `aoc-cv-226-support-vi` — carried a filled fixture and
a contact sheet from the previous factory. Those artifacts have been removed.

Reading the notice at all took work. The Vietnamese files draw it with
Type0/Identity-H subset fonts, so the page content stream yields glyph ids and
a plain read finds nothing; the driver parses the documents' own `/ToUnicode`
CMaps and maps the ids back. The Spanish files are the opposite trap: they mix
an English notice in a simple font with Spanish body text in a Type0 subset, so
decoding the whole page as CID pairs destroys the one sentence that matters.
Decoding is therefore per run, never per page. An earlier pass of this lane got
that wrong and silently lost all five Spanish holds, which is why the driver
records `decodeBasis` on every hold it finds.

### 2. A binding now needs two keys, and that caught six real defects

The typed fail-closed binder and the nine-class classifier were written
independently. Where they disagreed, the old pipeline took the binder's answer.
Requiring both, and withholding otherwise, stopped these:

| field | what the binder offered | what the field is |
|---|---|---|
| `Def.VitalStats.SSN` | the petitioner's **name** | a social security number box |
| `Defendants SSN`, `Defendants ssn` | the petitioner's **name** | as above |
| `Def.Info.JailId` | the petitioner's **name** | a jail identification number |
| `BankNameAndAccountType` | the petitioner's **name** | a bank account on an indigency affidavit |
| `PetitionNotFiledSignName` | the petitioner's name | a name on a signature line |
| `User.FullNameOfArrest` | the petitioner's current legal name | the name the arrest record was made under — the form prints a "same as above" box precisely because it can differ |

The binder reaches the first four through the `Def` token in a field path,
which matches its `participant.full_legal_name` descriptor.

Three fields went the other way, where the classifier was the one that was
wrong, and each was checked against the sentence the form actually prints
before being bound: `User.FullName` on CC-1201 and CC-1203 ("My full name
is:"), and `User.PrintName` on CC-1473 ("PRINT NAME").

### 3. D0's descriptor list is not ordered most-specific-first everywhere

`participant.street_address` matches `\baddress\b` and sits above both
`participant.email` (`\bemail\b`) and `participant.zip` (`\bzip\b`);
`participant.city` (`\bcity\b`) sits above `matter.county`. Both keys agree in
these cases, so only an explicit withholding stops them:

- `EmailAddressOfRecord` on AOC-CR-297 and AOC-CR-298 would have received the
  petitioner's street address. The field is the **district attorney's** email,
  inside a certificate-of-service block. Two guards missed it at once: the
  descriptor ordering, and the fact that the protect rules read field names
  only — this field's role is stated purely in the surrounding prose, so
  neither the prosecutor nor the service-block rule ever saw it.
- `Def.Address.City`, `Def.Address.State` and `Def.Address.Zip` on AOC-496.2
  would each have received the whole street address.
- `User.CityOrCounty` and its ancillary variants on the Virginia petitions
  would have received the petitioner's home city. The printed label is
  "4. Court of final disposition: … CITY OR COUNTY" — a venue.

All are left blank. Reordering `FACT_DESCRIPTORS`, or teaching the protect
rules to read a positional field's printed context, is the factory owner's
call, not this lane's; 49 withholdings across 25 distinct fields are recorded
in each family's `reports/family-evidence.json` under
`classifierAgreement.withheldByLaneReview`.

## Other findings, recorded rather than worked around

- **`Description:N` binds nothing.** The offense-description column on
  AOC-CR-288 (11 rows) and AOC-CR-296 (12 rows) is named `Description:N`, which
  matches no allowlisted fact descriptor at all. The explicit-mapping escape
  hatch can only satisfy a descriptor that already matched, so it cannot reach
  a field that matched nothing, and the column stays blank. Twenty-three rows
  of offense text across two forms are affected.
- **Widget rectangles with reversed corners.** A `/Rect` names two diagonally
  opposite corners in either order, and pdf-lib subtracts without normalising,
  so some Virginia widgets report a negative height. The census puts the
  corners back in order, records `rectCornersReordered` and keeps the raw
  values. Without this the fitter refuses a perfectly usable box.
- **The manifest's `field_count` is not the field count.** It counts widget
  annotations; a field owning several widgets is still one field. Six families
  differ. The observed number is what each package binds against, and both are
  recorded.
- **Multi-widget fields draw their value more than once.** Kentucky repeats the
  case number in a caption and a footer from one field, and AOC-496.4 draws it
  four times. That is correct flattening, not duplication, and the
  duplicate-value check accounts for widget counts.
- **Ambiguous role lines.** Fourteen bindings sit on fields whose name carries
  a role token the binder does not recognise — `PrintedNameOfPetAtt` and its
  address, phone, city and email siblings on CC-1201 and CC-1203. The printed
  label is "PRINTED NAME OF [ ] PETITIONER" with an attorney checkbox beside
  it, so on a self-represented filing the line is the participant's own and the
  fact written into it is the participant's own. Listed per family under
  `ambiguousRoleBindings` for counsel.
- **Kentucky AOC-009 binds nothing.** All nineteen fields are manual or
  unwritable. It is mapped, not filled.
- **Six orphaned Virginia stubs.** `cc-1201-en`, `cc-1201-a-en`, `cc-1203-en`,
  `cc-1203-a-en`, `cc-1203-b-en` and `cc-1473-en` are earlier partial packages
  for the same six binaries under an older census schema. They are not in
  `verified-binary-index.json` and are not regenerated here. They are left
  untouched rather than deleted; the captain should decide whether they are
  superseded.

## What the captain must merge

This lane deliberately did not write either shared index. Merging needs:

1. `verified-binary-index.json` — the 37 entries are unchanged in identity;
   `participantFillable` becomes `false` for the ten held North Carolina
   translations.
2. `implementation-index.json` — take the 37 entries from each
   `data/rcap-all50/overlays/production/<state>/state-index.json`.

Until step 2 lands, `scripts/verify-rcap-official-forms-d1.mjs` reports twelve
failures, all of one kind: the stale index still records
`overlay_implemented_pending_independent_review` for `aoc-cr-287-form-es`,
`aoc-cr-288-form-es`, `aoc-cv-226-support-es` and `aoc-cv-226-support-vi`, and
so demands the fixtures a held document must not have. The same verifier passes
on the base commit, and every other assertion over these three states passes
now.

## Holds that remain

Every family carries `edition_1_runtime_disabled` and
`f_independent_visual_review_required`. All 37 carry
`state_manifest_generation_allowed_no`: the Edition-1 manifest sets
`generation_allowed=no` for every row in all three states, and nothing here
changes that. Two Kentucky assets are `source_gated` and are never
runtime-selectable. Four Kentucky families carry
`currentness_revision_confirmation_required` and two carry
`source_or_currentness_gate_open`. The ten North Carolina translations carry
`source_states_do_not_complete_for_filing`.

Rendering cleanly is not adoption. None of these is a sellable route on the
strength of this work.

## Status

`implementation_complete_pending_independent_review`. This lane does not
approve its own output.
