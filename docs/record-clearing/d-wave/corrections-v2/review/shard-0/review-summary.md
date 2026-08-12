# D corrections-v2 — independent review, shard 0

34 families. **23 technical_approved, 7 correction_required, 4 held_on_source_or_design.**

This is a technical review of bytes only. Nothing here is a visual, counsel,
source-freshness or adoption clearance, and no track is terminal.

## Shard rule — recomputed, agrees

`sha256(familyId) modulo 3, over the full hex digest`, recomputed in this
session for all 61 correction_required families:

| shard | recomputed | declared |
| --- | --- | --- |
| 0 | 34 | 34 |
| 1 | 19 | 19 |
| 2 | 8 | 8 |

Membership agrees family for family; there are no disagreements to report. The
split is lopsided because 61 items is a small sample, not because the rule
drifted. Every family's `reviewShardRecomputed` field in `correction-index.json`
also matches my own computation.

## What I read

Source binaries came from release `rcap-d-source-packs-2026-08-12`. All three
ZIP digests matched the expected values before extraction, and extraction went
to `/tmp/rcap-source-packs`, outside every git worktree. No ZIP or extracted
official binary is committed.

Artifacts came from the seven correction branches at their pushed heads, read
out of git rather than from any report about them. The shared factory modules
(`rcap-active-content.mjs`, `rcap-contact-sheet.mjs`,
`rcap-official-form-finalize.mjs`, `rcap-pdf-anchor-capture.mjs`,
`rcap-field-semantics.mjs`, `rcap-text-fitting.mjs`) are byte-identical across
all seven branches, so one reading of the D0-v2 change applies to every lane.

87 PDF artifacts opened — 61 finalized fixtures and 26 contact sheets. Every emitted artifact was scanned twice: a raw-byte
scan matching the factory's own gate, and a full xref object-graph walk with
object streams resolved, so a `hits: []` on a file I could not read into was
never treated as a pass.

## Two defects in my own harness, found and fixed before dispositioning

Recording these because both would have produced a falsely clean review.

**PyMuPDF's `get_text()` renders widget appearance streams.** My first baseline
for "does the untouched source's own page content print this?" was taken
straight off the source PDF, which meant the source's own `Reset` and
`Print` button captions appeared in the baseline — and every print-flag leak
would have been excused as "the source prints it too". The baseline is now a
copy of the source with every page's `/Annots` dropped, which yields page
content alone. Confirmed on AZ AOCCRSL1F: `Reset` is present in the naive
extraction at `[94.69, 34.61, 121.36, 50.62]` and absent from the content-only
one.

**A regex that misread PDF reals.** `-?\d+\.?\d*` reads the legal PDF number
`.126999` as `126999`, which turned KY AOC-334's `Print` and `Reset Form`
button rectangles into `[202.96, -126207.0, 277.04, 773.79]` and made six
correct removals look unattributable. Fixed to `[-+]?(?:\d+\.?\d*|\.\d+)`.

A third false positive is worth naming because it is easy to hit: scanning
*decompressed stream payloads* for `/AA` matches raw glyph outline data inside
embedded font programs. Three NE artifacts showed 4–8 `/AA` "hits" that are
bytes inside a CFF font, not dictionary keys. The object-graph scan is the
authority; those files are clean.

## Defect A — print flags

Verified against the source's own `/F` bits, with the overlap rule applied
(a run inside a non-printing rect that also falls inside a printing widget's
rect is not a leak) and the source's page-content baseline as the exemption.

**Zero print-flag ink leaks across all 61 finalized fixtures.** No text run survives
inside a non-printing widget rectangle that the source's own page content does
not print at that position.

Nothing legitimate was removed either. Every text run the old flatten produced
that is now absent is attributable to one of three causes, each checked
individually against the source binary and the family's own field map:

- a non-printing widget (`Reset`, `Reset Form`, `Print` — `/F` absent or
  without the Print bit);
- a field the family's own `production-field-map.json` records as
  `withheld_by_lane_review` — 14 such values across KY AOC-334, AOC-496,
  AOC-496.2, AOC-497 and VA CC-1201, all now blank in every fixture, matched by
  fully-qualified field name (`Def.VitalStats.SSN`, `User.CityOrCounty`, …);
- six charge-row values in three KY boundary fixtures, in fields the map
  already recorded as `repeating_row_without_indexed_fact`. D1B's lane change
  narrows the census handed to the renderer to the lane's own decisions, so a
  refusal now actually reaches the renderer instead of being re-decided by D0's
  binder. The effect is that a single-charge boundary fixture stops printing
  the same charge into rows 2 and 3 of a court filing. That is an improvement,
  not a regression.

No unexplained text was added anywhere.

## Defects B and C — contact sheets and fail-closed inspection

The re-rendered sheets are dramatically cleaner. Measured on the object graph,
before → after:

| family | before | after |
| --- | --- | --- |
| IL fw-civ | 420 JavaScript, 184 `/AA`, 4 `/URI`, 520 `/Widget` | none |
| VA CC-1201 | 148 JavaScript, 72 `/AA`, 412 `/Widget` | none |
| NH 2317 | 303 JavaScript, 117 `/AA`, 132 `/Widget` | none |
| CO JDF-2371 | 24 JavaScript, 12 `/AA`, 177 `/Widget` | none |
| NM San Juan | 26 `/URI` | none |
| KY, TX, NE | JavaScript, `/AA`, `/URI` and `/Widget` throughout | none |
| AZ ×2 | 485 and 135 `/Widget` (no scripting) | none |

Every re-rendered sheet is byte-inspectable (no object streams), carries no
`/AcroForm` and no `/Widget`, and shows every expected participant value on my
own decode, with both the sheet and finalized digests matching the bytes on
disk.

**Four sheets were not re-rendered and do not pass.** See below.

## The seven correction_required families

### VT 200-00132, VT 200-00132a, VT 200-00631, WI CR-267 — pre-fix contact sheets

These four were classified `orchestrator_evidence_only`, so the cycle excluded
them from the re-render on the basis that their artifacts were never
implicated. Their *fixtures* are indeed fine. Their **contact sheets are not**.

Each sheet is byte-identical to its lane head and carries 1–3 `/Type /ObjStm`
object streams in its raw bytes, so `scanBytesForActiveContent` returns
`inspectable: false` and `assertInspectableAndClean` would raise
`UninspectableArtifactError` rather than emit it. The corrected factory could
not produce these files. Their `contact-sheet-proof.json` confirms it: none of
them carries `activeContentScan`, `panelScans` or
`panelsSanitizedBeforeEmbedding`, the fields the corrected builder emits.

The three VT sheets additionally carry 33, 33 and 11 orphaned `/Widget`
annotation objects copied out of the unsanitized blank panel — `/FT`, `/T`,
`/DA` and `/Rect` intact, `/P` pointing at a page of the original source form,
absent from every page's `/Annots` array but present in the bytes. That is
precisely the residue defect B was written to remove.

Resolving the object streams myself, I found no XFA, JavaScript, `/AA`,
`/OpenAction`, `/Launch`, `/SubmitForm`, `/ImportData` or `/URI` in any object.
So this is a fail-closed and residue finding, not an executable-code finding —
but "I could read into it and it turned out fine" is not the standard this
cycle set, and the sheets carry embedded form-field machinery they should not.

Their dispositioned defect *is* cured: the manifest pointer resolves and the
recorded sha256 matches the pack bytes.

### NH 2317, NH 3056, NH 3124 — overflow ledger, mechanism disagreement

Defects A and B are verified fixed on these three. They are held back only by
their third, lane-specific defect, and the situation is more interesting than a
plain miss.

The acceptance condition demanded a `refused_below_readable_floor` entry for
field `case number` naming `minFontSize 6` and `requiredWidthAtMin 210.4`, with
`refusedBelowFloor >= 1`. What the lane shipped instead is a
`refused_exceeds_form_declared_max_length` entry (`declaredMaxLength 17`,
`valueLength 60`), plus two previously undisclosed `DefDate` refusals — one of
them on the *canonical* fixture — with `refusalsRecorded: 3`.
`refusedBelowFloor` is still `0`.

Reading the source binaries, **the lane's mechanism is the correct primary
one**: all three NH forms declare `/MaxLen 17` on `case number` and `/MaxLen 18`
on `DefDate`, so the length gate fires before font fitting is ever reached. The
original finding inferred the width mechanism by analogy with the CO and TX
siblings, which have no `/MaxLen`. The widget rect it cites,
`[127.727, 649.841, 324.658, 664.519]`, is right.

So the substance is largely cured — the ledger no longer falsely asserts that
nothing was refused, and it now discloses more than the finding asked for. What
remains is narrow but real: the 60-character value *also* exceeds the widget
width at the 6pt floor, and a reader auditing "was anything dropped as
unreadably small?" still reads `refusedBelowFloor: 0`. The entry also omits the
widget rect and `requiredWidthAtMin` that the sibling CO/TX entries carry.

The right remedy is a judgment for the owner: record both constraints, or amend
the acceptance condition to the mechanism the source binary actually shows and
say why `refusedBelowFloor: 0` is correct. Either way the artifact itself is
right — the field is correctly blank — so this is severity `minor` and an
evidence-completeness gap, not an artifact defect.

## Noted, not dispositioned — NE CC-6-11 and CC-6-11.2

Both families are approved: defects A and B are verified fixed and the source
pointer resolves. One thing is recorded against them anyway.

Their boundary fixtures print a case number
(`0123-45-2026-CR-900124.00`) inside the `Text2` widget rect, while
`field-classification.json` records `Text2` as `writable: false` with
`factId: null` and `refusalReason: repeating_row_without_indexed_fact`, and
`production-field-map.json` lists it under `bindingRefusals`.

Read carefully the two reconcile: the refusal is conditional on there being no
indexed fact, and the boundary fact set supplies indexed charges, which
`populated-fields.json` records as `matter.charges[1].case_number`. So this is
not a defect against these bytes, and it is pre-existing —
`populated-fields.json` is byte-identical to the lane head.

It is recorded because **the sibling lane now resolves the same question the
opposite way.** D1B's correction narrows the render census to exclude every
lane-refused field, and that is exactly what removed the KY `CHARGE_2` and
`CHARGE_3` writes described above. Two lanes now behave differently on whether
an indexed-charge-row mapping may supersede a name-based binding refusal. That
deserves one decision rather than two conventions, and the classification
record should state the condition instead of a flat `writable: false`.

## The four held families — WA

`WA:blake-006`, `WA:blake-008`, `WA:crrlj-09-0100`, `WA:crrlj-09-0870` are
**unchanged, as scoped, and are not approved.**

`git diff` over each family directory between its lane head and the correction
branch head is empty, and none emits a filled fixture or contact sheet.
`rcap-pdf-anchor-capture.mjs` is byte-identical to the D0 base
(`25358c46fb0e894b43ccd15a1689f257f9131e88`) on all seven branches, and
`loadFonts()` still contains no `/ToUnicode` or `/Encoding /Differences`
handling.

Reading the source binaries directly, their text layers decode cleanly for me —
including the five subset fonts (`DBZLJR+SymbolMT`, `GJYQZL+ArialMT`,
`SJVFLN+Arial-ItalicMT`, `WGPVPF+Arial-BoldMT`, …) on CrRLJ 09.0100 — so the
"no extractable text" premise the original dispositions rested on remains
false. These cannot clear until the scope decision on that decoder is made.

## Checks that held across every family

- Source sha256 matches the pack bytes: **34/34**, recomputed from the extracted
  pack rather than read back from a report.
- Review-manifest source pointer resolves, pack-relative, to a real file whose
  bytes hash to the recorded sha256: **34/34**, including all 8 evidence-only
  families.
- Page count preserved against the source: every artifact.
- Page order preserved: per-page text similarity against the source's own
  content is **1.000 on every page of every artifact**.
- No protected-category field written: across the shard, every written field is
  classified `participant` or `deterministic`, with one exception —
  VA CC-1201 writes `User.FullName`, which its classifier labels `manual` and
  its own binding table then binds to `participant.full_legal_name`. That is
  the petitioner's own name field and a recorded lane decision, not a
  protected-category write. No field in any of the 16 default protected
  categories (`signature`, `notarization`, `court`, `clerk`, `prosecutor`,
  `attorney`, `race`, `money`, …) is written anywhere. In the anchor-based
  families (NM, WI) the write targets are anchors rather than classified field
  names, so the check there is against the anchor list, not the classifier.
- Recorded artifact hashes match the committed bytes: every entry in every
  `rendered-artifacts.json`.
- Determinism: every lane's own report records identical first and second
  renders. Independently, seven families that *were* re-rendered this cycle
  (CO JDF-2371, IL fw-civ, NM San Juan and the four TX GC-411 petitions)
  produced **byte-identical fixtures** across two renderer invocations
  separated by the correction — determinism observed, not asserted. The four
  VT/WI families are also byte-identical, but that is because they were never
  re-run, so it is not evidence either way.
- Currentness and legal-design holds: no hold present at a lane head is missing
  at its correction branch head, in any family.

## Scope discipline

No family outside the 61 was reviewed. Independently confirmed that the
correction branches touched 48 family directories plus 3 state-level
`state-index.json` files, and that **every touched family directory belongs to
the 61** — none of the 104 `preservedTechnicalApproved` or 88
`preservedHeldOnSourceOrDesign` families was modified.

No implementation branch was written. This review branch contains only these
two files.
