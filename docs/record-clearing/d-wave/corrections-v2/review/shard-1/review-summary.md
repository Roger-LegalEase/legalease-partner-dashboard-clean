# D corrections-v2 — independent review, shard 1

19 families. **15 technical_approved, 4 correction_required, 0 held_on_source_or_design.**

The three shared-factory defects the cycle named are genuinely fixed, and I verified
each one against the bytes rather than against a report. What did not happen is the
lane-specific half of the work: every one of the five `semantic_binding_error`
corrections in this shard is unapplied, and all four families carrying them are sent
back.

## The shard rule

Recomputed independently. `sha256(familyId) mod 3` over the full hex digest, taken as
a big-endian integer, reproduces `review-shards.json` exactly — 34 / 19 / 8 across
shards 0 / 1 / 2, family for family, zero disagreements. The split is uneven for a
modulo-3 rule, but that is what the stated rule produces on these 61 identifiers.

## Where I disagree with the assignment's scope

The assignment asked me to check four family-specific correction classes "where the
index names them", and singled out New Hampshire's `overflow_ledger_missing_refusal`
reasoning — the `/MaxLen 17` versus 60-character argument — for judgement. Recomputing
the shard rule puts none of those in shard 1:

| class | corrections | shard |
| --- | --- | --- |
| `overflow_ledger_missing_refusal` | 3 | all shard 0 (NHJB-2317, NHJB-3056, NHJB-3124) |
| `withheld_field_written_by_lane` | 32 | all shard 2 |
| `orchestrator_manifest_source_pointer` (evidence-only) | 11 | all shard 0 |
| `anchor_decoder_subset_font` | 4 | all shard 0 |
| `rich_text_field_finalize_crash` | 1 | shard 2 |

I did not review them. The assignment's limits are explicit that this review covers
its 19 families "and nothing else", and reviewing shard 0's families to satisfy a
sentence in the brief would break that. The `/MaxLen` judgement belongs to shard 0's
reviewer. What shard 1 actually contains is 19 `contact_sheet_active_content`, 5
`semantic_binding_error`, 2 `print_flag_ink_leak` and 2 `caption_overlap`.

## Defect C — fail-closed inspection

Verified first, because everything else depends on being able to read the files.

Every pre-correction contact sheet in this shard is written **with** object streams and
carries real residue inside them: `/AA`, `/JS` and `/JavaScript` in fifteen of the
nineteen, `/URI` only in the remaining four, plus `/Widget` annotations copied in from
the blank source. That reproduces the prior review's finding exactly. Every corrected artifact —
47 fixtures and 19 contact sheets — is written with no object streams at all, so every
object is directly readable, and both my object-graph walk and my structural byte sweep
return nothing.

Nothing here uses pdf-lib or any lane module. Verdicts come from pypdf plus a
purpose-written content-stream parser, so the factory is not the judge of its own
output. Each file is inspected twice: a walk of the whole indirect-object graph,
including an xref sweep for objects orphaned from the page tree — which is precisely
how the defect-B residue hid — and a byte sweep applied to the file body with stream
payloads blanked and to the decompressed payload of every `/Type /ObjStm`.

One trap worth recording. A naive substring sweep for `/AA` fires on subset-font
BaseFont names like `/AAAZSD+TimesNewRomanPSMT` and on raw TrueType glyph tables. Three
families — both Nebraska families and NJ:cn-10557 — tripped it in my first pass. They
are clean; matching markers as complete PDF names terminated by a delimiter, and only
in syntax-bearing regions, clears them. A reviewer grepping raw bytes would file three
false findings here.

## Defect B — contact sheets

All 19 corrected sheets are clean by both methods. Each has two panels per page, page
count equal to the source's, and every value the sheet's own proof declares expected is
present in the composed file. Three families (FL, IA, NJ) declare an empty
`expectedValues` list, which makes their `allExpectedValuesVisible: true` claim vacuous;
for those I checked instead that every field the renderer recorded as written carries
visible ink, and it does.

## Defect A — print flags

This is the check where method mattered most.

**pdfminer silently skips the `/FlatWidget-*` Form XObjects that pdf-lib's `flatten()`
emits** — which is exactly where the leaked ink lives. A layout-level text diff of
NH:nhjb-2311 before and after reports 157 runs on both sides and no change at all, which
would have been a false pass on the one family most clearly implicated. The verdicts
below come from parsing each page content stream directly, tracking the CTM through
`q`/`Q`/`cm`, and reading each flattened widget's own appearance stream, decoding hex
string operands as well as literal ones. Every flattened widget is then matched back to
a single source widget `/Rect` by geometry, which is what makes the overlapping-rectangle
rule decidable — the ink belongs to one identifiable widget rather than to whichever
rectangles happen to contain a point.

Across 47 fixtures: **3,373 flattened widgets, every one matched to a source widget whose
`/F` sets Print. Zero non-printing widgets survive. Zero unmatched.**

Nothing legitimate was removed either. 33 widgets were dropped in total, every one
matched to a source widget, and all but four have `/F = 0`:

- **NH:nhjb-2311** — `Clear Form`, `Lock & Save Form`, `Top of Page`, `Top of 1st Page`,
  and the greyed placeholder `Enter /s/ before name` that had been painted inside
  signature widget `sig.8`. All five gone; the signature block is blank; the two real
  participant values (`2023CR004182`, `Marion T. Ellsworth`) survive at byte-identical
  positions.
- **NH:nhjb-3057** — five button captions gone, and the negative fixture now adds no
  text at all, as its acceptance condition required.
- **NJ:cn-10557** — 13 removals including the `Print` and `Clear` captions that had been
  flattened onto page 1 of a 43-page filing.
- **VA:cc-1203, VA:cc-1473** — the `Clear All Data` ResetButton caption.
- **NE:cc-6-12, NE:cc-6-15-1** — four widgets, discussed next.

### One correctness concern in the shared rule

`readAnnotationFlags()` computes `partOfFiledAppearance = prints && !hidden && !noView`.
Treating NoView as suppressing print is not what the specification says: PDF 32000-1:2008
Table 165 states a NoView annotation "may be printed (depending on the setting of the
Print flag)" and is hidden only for on-screen display and interaction. A widget with
`/F = 36` (Print|NoView) prints on paper, and D0-v2 removes it.

In this shard that rule fired on exactly four widgets — `enter the type of court` and
`enter the county` in each Nebraska family — and removing them is precisely what those
families' own `caption_overlap` acceptance condition demanded ("a helper field whose
value is the form's own parenthetical instruction is dropped rather than flattened").
So no artifact in shard 1 is harmed, and both Nebraska families are approved. The rule
itself is over-broad and can drop printing ink in any family that uses Print|NoView for
content rather than guidance. Measured across all 19 shard-1 source binaries: 1,401
widgets, 29 without the Print bit, 0 with Hidden, and exactly those 4 with Print|NoView.
Recorded as a medium finding against the D0 module, which is byte-identical on all seven
correction branches.

### Caption overlap

Both Nebraska collisions are resolved. Enumerating every text-bearing flattened widget
in the caption band and testing pairwise, no two overlap; the only survivors are the
form's own printing caption widgets. The venue slots are now empty rather than filled,
which the acceptance condition permits ("at most one string in each caption slot") but
which leaves the filed caption reading `IN THE ___ COURT OF ___ COUNTY, NEBRASKA`.
Recorded as a low-severity observation, not a block.

## The four families sent back

None of the five `semantic_binding_error` corrections landed. In every case
`production-field-map.json` is unchanged at the correction branch and the defective
value is still in the artifact.

| family | lane | what is still wrong |
| --- | --- | --- |
| `MO:cr300-source-gated-petition-en` | D3A | `County Where Arrest Occurred` still bound to `matter.county`; still renders `Greene`. All three fixtures byte-identical to the pre-correction render — only the contact sheet was rebuilt. |
| `NC:aoc-cr-288-form-en` | D1B | Attorney block still carries the petitioner's identity (`NameAtty` = `Jordan Avery Reyes`, `CityAtty` = `Springfield`, `StateAtty` = `XX`, `ZipCodeAtty` = `01234`). The D0 attorney protect rule still does not match the `Atty` abbreviation, and `protected-fields-scan.json` still reports `pass: true`. |
| `NC:aoc-cr-288-form-en` | D1B | Both FINDINGS OF FACT rules still read the petitioner's name, so the order still says the reason the petitioner is not eligible is `Jordan Avery Reyes`. |
| `VA:cc-1203-form-en` | D1B | `User.CourtName` still bound to `matter.court`; caption still reads `District Court` under a printed `CITY OR COUNTY` label. |
| `VA:cc-1473-form-en` | D1B | All three contact rules still filled while all eight petitioner/attorney election boxes are still blank. |

D1B did land lane-specific work in these same families — `PetitionNotFiledSignName`
blanked in NC:288 and NC:296, `EmailAddressOfRecord` (which had been carrying a street
address) blanked in NC:298, the `Clear All Data` caption removed in both Virginia
families. So this is a gap in the correction, not a lane that never ran.

Worth noting for whoever merges the shards: `corrections-audit.json` reports
`familiesChanged: 48` against `familiesExpected: 48` and `pass: true` for all seven
lanes. That audit tests whether a family's bytes moved, not whether the correction the
index asked for was applied. For these four families the bytes moved — or, for MO, only
the contact sheet's did — and the named defect survived.

## Standing checks, all 19 families

- Source `sha256` resolves to pack bytes for all 19; each family's own `source-record.json`
  agrees with the index.
- Page count, page sizes and rotation identical to the source in every fixture.
- Every value the renderer recorded as written is visible in the finalized artifact.
- No protected-category field is written by the factory. Two Texas families carry
  source-supplied `/V` defaults (`misdemeanor`, `is`, `is not`) that survive flattening;
  `populated-fields.json` shows the renderer wrote none of them and the untouched source
  carries them, so the check passes. Recorded as a low observation for TX:0725, where the
  field is classed `protected`.
- Recorded artifact hashes match the committed bytes for all 19.
- Currentness and legal-design hold records byte-identical to the pre-correction render
  for all 19.

## Preserved families

Diffing every lane head against its correction branch across
`data/rcap-all50/overlays/production/` gives 48 changed family directories, all 48 among
the 61, plus three lane-scoped `state-index.json` files. No `technical_approved` or
`held_on_source_or_design` family's bytes changed, so none was reviewed.

## What I could not verify

**The generator was not re-executed.** The released source packs are laid out as
`STATES/<CODE>/...`, while the lane drivers expect a private pack tree with per-state
`STATE_MANIFEST.csv` under an Edition-1 prefix. I could not reproduce a faithful
re-render from the released assets, and a re-render from a guessed tree would not be the
real one. Determinism is therefore supported but **not proven**: dates are pinned to
`D:20260101000000Z`, no trailer `/ID` is emitted, recorded hashes match committed bytes,
and 24 of 47 fixture PDFs are byte-identical across the two independent renders — the
other 23 differing exactly where widgets were removed.

**No visual rasterisation.** Every geometric claim here comes from decoded content-stream
coordinates.

This is a technical review of shard 1 only. It approves nothing beyond the dispositions
above, marks no track terminal, and clears no source-currentness, legal-design, counsel
or adoption hold.
