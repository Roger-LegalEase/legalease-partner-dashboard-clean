# D corrections-v2 — independent review, shard 2

**7 technical_approved, 1 correction_required, 0 held_on_source_or_design.**

Eight families, re-reviewed against the bytes on the correction branches rather
than against any report about them. Machine-readable results, including a named
boolean per check on every family, are in `review-findings.json`.

## Shard rule

Recomputed independently: `sha256(familyId)` over the full hex digest, modulo 3,
across all 61 `correction_required` ids in `correction-index.json`. It reproduces
the published `review-shards.json` exactly — 34 / 19 / 8 — with **no
disagreement**. Shard 2 is the 8 families below.

| family | jurisdiction | lane | defect class | disposition |
| --- | --- | --- | --- | --- |
| `KY:aoc-497-3-source-gated-en` | KY | D1B | withheld_field_written_by_lane | technical_approved |
| `NC:aoc-cr-287-form-en` | NC | D1B | withheld_field_written_by_lane | technical_approved |
| `NC:aoc-cr-297-form-en` | NC | D1B | withheld_field_written_by_lane | technical_approved |
| `NC:aoc-cv-226-support-en` | NC | D1B | withheld_field_written_by_lane | technical_approved |
| `VA:cc-1201-a-form-en` | VA | D1B | withheld_field_written_by_lane | technical_approved |
| `VA:cc-1203-a-form-en` | VA | D1B | withheld_field_written_by_lane | technical_approved |
| `VA:cc-1203-b-form-en` | VA | D1B | withheld_field_written_by_lane | technical_approved |
| `MO:cr145-form-petition-en` | MO | D3A | rich_text_field_finalize_crash | correction_required |

The shard carries **all 32** `withheld_field_written_by_lane` corrections in the
cycle, plus the one rich-text blocker. It contains no `orchestrator_evidence_only`
family.

## How the withheld-field fix was tested

Rather than trust the lane's reports, the detector was rebuilt from scratch:
enumerate the source AcroForm's widget annotations by fully-qualified name with
`/Rect` and `/F`, then extract positioned text from the finalized artifact's
**page content stream** and compare, at each widget's own rectangle, against what
the untouched source's page content draws at that same rectangle. Any difference
is ink the render added.

The detector's calibration is the point:

- Run against the **pre-correction** bytes it finds **exactly 32 leaks**, split
  1 / 4 / 1 / 2 / 10 / 10 / 4 across the seven families — matching the correction
  index family-by-family, and reproducing the recorded values ("Jordan Avery
  Reyes" in Kentucky's *Defendants SSN*, "118 Maple Street" in North Carolina's
  *EmailAddressOfRecord*, "Springfield" in Virginia's *User.CityOrCounty*).
- Run against the **corrected** bytes it finds **0**, in canonical and boundary
  alike.

Widening the same test from the 25 withheld fields to **every** field the lane
records as refused gives 1,006 rectangle checks across both fixtures — covering
137 protected-category fields among them — with **zero** values written.

## Nothing legitimate was removed

Checked at character level, not by eye: every `(glyph, x, y)` the untouched
source's page content draws survives into both fixtures of all seven families,
with zero missing. Page count, page order and page geometry are preserved —
source page *i* is contained in finalized page *i* and in no other page. Every
bound participant value is still visible at its own rectangle.

The one bound field that renders blank, NC AOC-CV-226
`ApplicantFullPermanentMailingAddressState`, is a documented
`value_exceeds_widget_width_at_minimum_font` refusal that survives in the
overflow ledger and in the negative fixture — refusing rather than clipping is
the policy, so blank is correct there.

## Print flags (defect A)

Five non-printing widgets exist across the shard's sources — two in Kentucky and
a `ResetButton` in each of the three Virginia forms. No text run appears
inside any of their rectangles in any finalized artifact beyond what the source
itself prints there or what an overlapping **printing** widget covers.

Kentucky is the clean demonstration. Its `Notice` widget (`/F` 0) carried the
browser helper text *"Not all bowsers handle fillable PDFs the same… please save
and reopen it before you make any entries."* and its `Attorney_name` widget
(`/F` 0) carried filing instructions. The old flatten printed both onto a court
filing; the corrected artifact carries neither, while the legitimate page content
that had been visually merged with them ("Case No. ____", "Page 1 of 2", "OF
RECORD UPON") is confirmed still present and unaltered.

The D0 canary suite was also executed here and passes: 147 checks across 7
canaries and 9 mutations, including the new print-flag canary that asserts in
both directions — non-printing helper text must go, legitimate printed text must
stay.

## Contact sheets (defect B) and fail-closed inspection (defect C)

Every emitted artifact was scanned with an independently written scanner that
materialises every indirect object, decompresses every stream, and additionally
greps raw bytes — no reliance on the lane's own scan, and nothing hidden in
object streams.

No artifact in the shard uses object streams or encryption at all, so all 21 are
fully inspectable; `inspectable: false` never arises. Result: **no** XFA,
JavaScript, field or document `/AA`, OpenAction, Launch, SubmitForm, ImportData,
URI or other network action, in either fixture or in any contact sheet. Both
panels are sanitized before embedding and the composed sheet is sanitized.

One raw-byte hit on NC AOC-CR-287 was run down and is a **false positive**: the
subset-font tag `/AAQYQO+Arial-BoldMT` contains the literal `/AA`. The object
model carries no `/AA` key.

Worth flagging as an unrecorded gain: the **pre-correction** contact sheets in
this shard were carrying substantial active content — 342 such objects for VA
CC-1201-A, 318 for CC-1203-A and 96 for CC-1203-B; 173 for NC AOC-CV-226, 170 for
AOC-CR-287 and 65 for AOC-CR-297; 16 for Kentucky. None of these families had a
contact-sheet defect recorded against it; the recorded defect was the withheld
field. Defect B's fix cleaned them anyway.

## Determinism, verified first-hand

Not read off `family-evidence.json`. The D1B lane was re-run from the verified
source pack in a detached worktree at the correction branch head, and all 21
artifacts — 14 fixtures and 7 contact sheets — reproduce **byte-identically**
against the committed bytes. Nothing else in those seven family directories
changed either. Dates are pinned and no random `/ID` is written. Every recorded
hash (`rendered-artifacts.json`, `contact-sheet-proof.json`) matches the actual
bytes.

## Sources and scope

All three source-pack ZIPs were downloaded and hash-verified against the
assignment's values, and extracted to `/tmp/rcap-source-packs`, outside every git
worktree. Nothing from them is committed. All eight families' source pointers
resolve to pack files whose bytes hash to the recorded `sha256`.

Scope discipline was verified rather than assumed: each of the seven correction
branches was diffed against its own pre-correction lane head over
`data/rcap-all50/overlays/production/`, and every changed family directory mapped
back to a family id. Exactly **48** correction families changed; **0** of the 104
`technical_approved` and **0** of the 88 `held_on_source_or_design` families were
touched. Neither preserved set needed review, and none was reviewed.

Currentness and legal-design holds are unchanged on every family — in the seven
D1B families the only key that differs from the prior head in
`family-evidence.json` is `determinism`.

## The one systemic finding

Recorded against all seven approved families, severity **moderate**, and it does
**not** affect any artifact.

The prescribed fix filters every lane-refused field out of the census before
`finalizeOfficialForm`. That is exactly what the correction index specified,
verbatim including the filter expression, and it is what D1A — reviewed and
approved — already did. But it also means D0's binder never sees those fields, so
the two artifacts that independently corroborate the lane's refusals have gone
quiet:

- `reports/protected-fields-scan.json` now reports `protectedFieldsRefused: 0`
  (was 85 / 61 / 61 / 51 / 51 / 23 / 4) and `refusedFields: 0`, while still
  emitting `pass: true`.
- `fixtures/negative.json` now enumerates an empty `refusedFields[]` in six of
  seven families.

What the correction *did* get right is verifiable: `writtenFields` dropped by
exactly the withheld count in every family (VA CC-1201-A 17→9, CC-1203-A 16→8,
CC-1203-B 12→8, KY 5→4, NC-287 14→12, NC-297 15→14, NC-CV-226 15→14).

Every dropped report entry was checked one by one and each names a field the
lane's own `production-field-map.json` still records as refused — **zero**
non-lane-refused entries were dropped, and the substantive overflow findings
survive exactly. The lane's own counters still register the refusals (317
`protectedRefused` across VA/KY/NC on re-run). So no information left the family;
it stopped being independently confirmed.

The practical consequence: `protected-fields-scan.json` should not be read as
evidence that protected fields were evaluated, and a future binder regression on
a protected field would not be caught by it. The owner is D0 / the cycle design,
not lane D1B. A future cycle should let the renderer keep deciding every field
while honouring the lane's refusals — passing the full census plus an explicit
refusal set rather than a pre-filtered census. This needs the same kind of scope
decision as the two D0 defects the cycle already declined to widen into.

## MO:cr145-form-petition-en

Unchanged, as the assignment expected, and **not approved**. It still produces no
artifact at all.

Reproduced first-hand against the verified source binary: `sanitizeAndFlatten`
throws `Reading rich text fields is not supported: Attempted to read rich text
field: Other Defendants`. The family directory holds no filled PDF and no contact
sheet — only census, classification, fact fixtures, source record, findings and
handoff. The lane disclosed the blocker, claimed no fill and did not modify the
source, which is the correct handling; the defect is D0's and outside the three
this cycle authorized.

One correction to the index's phrasing, which matters for whoever fixes it: the
two fields carry **no `/RV` entry** — the file contains zero `/RV` tokens, raw or
in any decompressed stream. pdf-lib refuses on the AcroForm **RichText flag**,
`/Ff` bit 26; both `Other Defendants` and `Address at Time of Arrest` carry
`Ff 41947136` with that bit set. A fix that looked only for `/RV` would miss this
family.

## Standing

These are technical-track dispositions only. Every family in the shard still
carries its recorded holds, including `f_independent_visual_review_required`,
`edition_1_runtime_disabled` and `state_manifest_generation_allowed_no`. Nothing
here approves any family for live use, and no track is terminal.
