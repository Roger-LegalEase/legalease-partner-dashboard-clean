# Mis-write class census — 2026-09-04

Measurement only. No builder, field map, semantics record, packet, receipt, ledger,
queue or generated graph was edited; no regeneration was run; no family was claimed.
Measured at Captain tip `46caf9354c58c8ebce4004354fef5b237f391d3f`.

Full record: `MIS_WRITE_CLASS_CENSUS_2026-09-04.json`.

## The headline

**No family carries a sworn mis-write, proven or otherwise. Zero confirmed
semantic mis-writes land in any built family.** Seven write slots in proven
families come close - role-conflicting, on a sworn page, on a blank whose
captured caption belongs to a different blank - and all seven are correct ink
under a wrong label. That is a computed zero, not an
assumed one, and the section "How the zero was proved" says exactly how.

What is wide is the *caption* defect underneath it: **1,063 blanks across 135 of
309 readable official source binaries carry a caption that, by its own drawn
coordinates, belongs to a different blank.** In every case where a built family
writes into one of those blanks, the family's own committed map named the blank
correctly and the ink is right. The corpus is being held safe by 220 families'
worth of hand-authored captions and by-name refusals sitting on top of a shared
capture that is wrong 12% of the time.

## Is the AOC-CR-288 defect shared or form-specific?

**Shared.** It lives in `scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs`,
in `captureWidgetContext`, which picks a caption by geometry alone and never asks
whether the run it chose is another blank's label. Two of its rules can take a
neighbour's caption:

| shape | rule | when it fires | drifted captions |
|---|---|---|---|
| strip | `printed_to_the_left_in_the_same_cell` | the form prints column captions *inside the top of the boxes*, so the caption row and the box row overlap in y and the nearest run to the left is the previous column's label | 359 |
| caption-under-the-rule | `printed_directly_above_in_the_same_column` | the form captions its blanks *beneath* the line, so the line above a blank is the caption of the blank above it | 704 |

Reproduced first-hand on AOC-CR-288 (sha256 `776210116d1ee07a2a53aab41cd3f0a51e382fd3c6f5a7bba9798fc667246a08`):

```
SNN      captured "Date Of Birth"            — that run is printed inside blank DOB
Age      captured "Full Social Security No"  — that run is printed inside blank SNN
Race     captured "State"                    — that run is printed inside blank DLState
Sex      captured "Age"                      — that run is printed inside blank Age
ZipCode  captured "Race"                     — that run is printed inside blank Race
```

14 of that form's 128 widgets carry another blank's caption. AOC-CR-297 carries
27, AOC-CR-287 18, NM-4-222 41, SD UJS-390-395 37, KY AOC-496.4 33, NJ CN-10557 32.
It is not this form's geometry; it is this code's rule.

A drifted caption becomes a *write* because
`scripts/rcap-official-forms/rcap-field-semantics.mjs` `decideBinding` sets
`subject = effectiveLabel ?? name` and, when the field NAME matches no descriptor,
falls back to the printed label.

**A second shared defect co-fires on AOC-CR-288 and is worth naming separately.**
The `government_identifier` protect rule matches `ssn`, `social security`,
`soc sec` and the driver-licence spellings. The AOC names its Full Social Security
No. blank **`SNN`**. None of those patterns match it, so identifier protection
never fired on the name channel and the drifted caption was left to decide. The
same name-channel miss repeats on WV SCA-C906 (`PetSocSecno`) and IN
CCA-XP-0220-7009 (`AliasNamesDOBsandSSNs`). Fixing the capture alone would leave
that hole open.

## A. Caption capture drift

| measure | count |
|---|---|
| readable official source binaries | 309 of 330 |
| widgets caption-captured | 8,714 |
| drifted captions | **1,063** |
| binaries affected | 135 |
| drifted blanks a built family actually writes | 201 |
| families touched | 56 (18 of them COMPLETE_PACKET_PROVEN) |
| of the 201, caption names a different role than the value written | 74 |
| of the 201, on a page carrying sworn / perjury language | 36 |
| of the 201, on a document that carries a sworn page somewhere | 63 |
| of the 201, role-conflicting **and** sworn | 13 |
| of the 201, role-conflicting **and** sworn **and** proven | 7 |
| of the 74, where the drifted caption actually decided the write | **0** |

### The seven that come closest — and why none is a mis-write

These are the rows to read first: a proven family, a page executed under oath or
under penalty of perjury, and a blank whose captured caption belongs to a
different blank.

- **`nd/nd-nonconviction-close-petition-set`, page 4, under "I declare, under
  penalty of perjury…"** — the `Address` blank's committed caption is
  "(Printed Name)" and the `Telephone Number` blank's is "(Address) (City, State,
  Zip Code)". This is the single most important row in the census. It is **not** a
  mis-write: the AcroForm names those blanks `Address` and `Telephone Number`, and
  that is exactly what each received.
- **`al/official-form-treatment:…:al-olr`, C-94A page 2, sworn before a notary** —
  `PetitionerPrinted Name` carries the committed caption "(Date)"; `Email` was
  captured as "(Petitioner Mailing Address) (SSN Last 4 only)". Ink correct.
- **`ct/ct-cleanslate-petition-set`, JD-CR-202 page 1, sworn before a notary** —
  the whole four-column strip "Name of defendant / E-mail address / Phone number /
  Date of birth" is captured as the caption of each of the three blanks in it. The
  family authored the correct per-blank caption itself. Ink correct.

Two more sit on NC AOC-CV-226 page 1, the **Civil Affidavit of Indigency**, in
`nc-145-5-felony-set` and `nc-146-dismissal-petition-set`: the applicant's
date-of-birth blank is captured as "Telephone Number Of Applicant" and the
telephone blank as "Telephone Number Of ApplicantDate Of Birth". Both families
write the right value into each, from the blank's own name. Neither family is
proven.

Three proven families carry the drifted caption **verbatim in their committed
field map** — the ink is right, the record describing it is not:

- **`id/id-clean-slate-shield-set`** (COMPLETE_PACKET_PROVEN) — a four-deep shift
  on ISC-PETITION-TO-SHIELD-67-3004: the mailing-address blank is recorded as
  "Full Name of Party Filing Document", the telephone blank as "City, State and
  Zip Code", the e-mail blank as "Telephone". Its `participant-instructions.md`
  names the printed caption correctly, so the shift did not reach the participant.
- **`nd/nd-nonconviction-close-petition-set`** (COMPLETE_PACKET_PROVEN, **sworn
  page 4**) — the address blank recorded as "(Printed Name)", the telephone blank
  as "(Address) (City, State, Zip Code)".
- **`al/official-form-treatment:…:al-olr`** (COMPLETE_PACKET_PROVEN, **sworn page
  2**) — on C-94A, the printed-name blank recorded as "(Date)", the phone and
  date-of-birth blanks both recorded as "(Email)".

A caption is the disclosure label. Where a committed record carries another
blank's caption, every downstream artifact that quotes it describes the wrong
blank — and the nine completeness counters cannot see it.

## B. Semantic mis-write

**Confirmed mis-writes landing in a built family: 0.**

How the zero was proved, three independent ways:

1. **Every committed write slot.** All 3,825 unique write slots across all 223
   field maps — read through all six committed schema shapes — compared value
   role against the blank's own recorded caption *and* against the blank's own
   field name. 73 candidates surfaced; each was read individually and resolved
   as a lexicon artefact or a correct write.
2. **The shared binder, re-run.** `decideBinding` over the 309 readable binaries
   with no refusals supplied: 1,844 would-be writes, 301 decided by the caption
   rather than the field name, **50 decided by a caption belonging to a different
   blank**.
3. **The join.** Each of those 50 against every built family binding that binary:
   **0 written with the conflicting fact**, 48 refused by name in the family's own
   map, 24 written with a different and correct fact, 4 absent from the map.

A note on method, because it is the way this measurement goes wrong: a probe
written against `maps[].canonicalWrites` alone reads 2,174 of the 3,850 write
rows and silently misses 66 families, including every California and Illinois
family. The first pass here did exactly that and returned a clean zero. The
numbers above are from the corrected extractor.

### The two seed cases, as they stand today

- **NC AOC-CR-288 `SNN`** (`nc_146_acquittal_petition-set`, BUILT_RASTER_PENDING,
  not proven). The shared binder does write `participant.date_of_birth` there when
  no refusal is supplied — reproduced. The family refuses it by name. AOC-CR-288
  carries **no** perjury, affidavit or verification language on any page: it is
  signed, not sworn. It remains an identifier case.
- **TX Statement of Inability** (sha256 `bd17a3fe…2fab10d`). Six built families
  enclose it; **all six refuse all eight named blanks plus `Today`**. Seven of the
  eight are field-NAME mis-binds, not caption drift — the descriptor list matches
  `Name NombreRowN` as a person's name, `Direccion Postal` as a postal code,
  `County state` as a state. Only `Month / Mes` is decided by a neighbouring
  caption. Repairing the capture would not have prevented seven of the eight.
  `tx_nd_veterans_court-set` and `tx_nd_veterans_reemployment-set` enclose the
  same binary, have no overlay directory, and write nothing today.

### Identifier blanks the shared semantics would mis-write absent a refusal

All are refused in every built family that binds them; none is on a sworn page.

| form | blank | printed role | would receive |
|---|---|---|---|
| NC AOC-CR-288 | `SNN` | Full Social Security No. | date of birth |
| WV SCA-C906 | `PetSocSecno` | petitioner's SSN | date of birth |
| IN CCA-XP-0220-7009 | `AliasNamesDOBsandSSNs` | alias names, DOBs, SSNs | street address |
| AR ACIC nolle-prosequi petition | `Sex` | sex | date of birth |
| VA CC-1201 / CC-1203 | `User.Sex` | sex | date of birth |

## What is not measurable here

- **21 source binaries the shared capture cannot open** — the whole California
  Judicial Council set (CR-106/180/181/400/401/402/403/409/410, MC-025, MC-031 and
  two INFO sheets), DE CIV-EXP-06-A and -07-A, MD DC-CR-071, ME CR-307, three TX
  GC-411 instruction sheets, WV SCA-C903. Eight CA families depend on them.
  Committed `pikepdf-unlocked` derivatives exist for CR-180, CR-400 and CR-409
  only; those three were measured and carry three drifted captions, one of which
  (CR-400 `CrtStreet` → `matter.county`) would bind and is refused in
  `ca-prop64-set`. **What would let us measure the rest: unlocked derivatives for
  the remaining eight CA forms, of the kind that already exist for those three.**
- **The delivered bytes.** This lane read committed field maps and
  `reports/actual-writes.json`; it did not re-render or re-read a fixture PDF.
- **1,028 write slots in 83 custom-pleading families.** Those documents are
  LegalEase-authored, so the shared PDF capture never runs on them and caption
  drift cannot arise; they were measured against their own committed captions only.
- **Two official-PDF families with no field map, no fixtures and a recorded
  vehicle stop** — `ne/ne-trafficking-setaside-and-seal-set` and
  `wa/wa-blake-vacatur-and-lfo-refund-set`. Nothing written, nothing to measure.
- **A full disclosure-label audit.** Whether a drifted caption reached
  participant-facing text was spot-checked for ID and ND only.
