# D targeted correction cycle — the exact correction index

The accepted review totals are controlling: **104 technical_approved, 61
correction_required, 88 held_on_source_or_design, 253 families**. This
directory holds the closed work list for the correction cycle, so the re-render
wave cannot quietly grow to touch an approved or a held family.

`correction-index.json` is the machine-readable index. It is built by
`scripts/rcap-official-forms/build-d-correction-index.mjs`, which reads the
three review-findings artifacts directly out of git at the review branches'
pushed heads rather than from any working tree.

## What the three reviewers each produced

The shards were reviewed independently and do not share a schema, which is a
feature of the review and a problem for anything consuming it:

| shard | per-family defects live in | defect label |
| --- | --- | --- |
| 0 | `findings[]` | `id` |
| 1 | `findings[]` | `category` |
| 2 | `corrections[]` | neither — classified from the defect text and owner attribution |

The normalizer refuses to file a defect it does not recognize. A defect
bucketed as "other" is a family that never gets fixed, so an unclassified entry
fails the build instead. All 114 entries across the 61 families classified.

## The nine defect classes, and where each is fixed

| defect class | corrections | fix route |
| --- | --- | --- |
| `contact_sheet_active_content` | 39 | D0-v2 defects **B + C** |
| `withheld_field_written_by_lane` | 32 | lane D1B |
| `print_flag_ink_leak` | 17 | D0-v2 defect **A** |
| `orchestrator_manifest_source_pointer` | 11 | orchestrator evidence — resolved, see below |
| `semantic_binding_error` | 5 | lane |
| `anchor_decoder_subset_font` | 4 | **outside the three named D0-v2 defects** |
| `overflow_ledger_missing_refusal` | 3 | lane D3A |
| `caption_overlap` | 2 | lane D1C |
| `rich_text_field_finalize_crash` | 1 | **outside the three named D0-v2 defects** |

56 of the 114 corrections are fixed once in the shared factory. 42 need the
owning lane to change its own code or mapping.

## The 61 families split three ways

**48 require a re-render.** Every defect blocking them has a fix route this
cycle authorized — a D0-v2 shared fix, a lane fix, or both.

**8 require no new bytes.** Their only defect was the review manifest reporting
a null source pointer, because the builder read `canonicalBundlePath` while
lane D1C records `canonicalRelativePath`. The finding was against
`corrected-review-manifest.json`, not against any artifact; the reviewer
confirmed each family's own evidence was sound and every recorded sha256
matched the source bytes. The manifest builder now normalizes both spellings to
the pack-relative form, which is the one that resolves inside an extracted
pack. All 253 manifest families — and all 61 families here — now carry a
pointer that resolves to a real pack file whose bytes hash to the recorded
sha256, recorded in the index under `sourcePointerVerification` and asserted at
build time.

**5 cannot be corrected by fixing the three named defects.** They are blocked
on two genuine D0 defects the review found in the same modules, neither of
which this cycle authorized:

- `WA:blake-006-form-en`, `WA:blake-008-form-en`, `WA:crrlj-09-0100-form-en`,
  `WA:crrlj-09-0870-form-en` — `rcap-pdf-anchor-capture.mjs` `loadFonts()`
  never consults `/ToUnicode` or `/Encoding /Differences`, so a subset-font
  text layer decodes to nothing. All four were dispositioned as having no
  extractable text or no matching participant label; the reviewer decoded the
  text by hand and found usable content, so the disposition rests on a false
  premise.
- `MO:cr145-form-petition-en` — `sanitizeAndFlatten` calls
  `updateFieldAppearances()` with no guard for rich-text (`/RV`) AcroForm
  fields, so the family throws `RichTextFieldReadError` and produces no
  artifact at all. The lane disclosed this and correctly claimed no fill.

These are recorded rather than fixed. Widening a shared-tooling commit that
seven lanes build on is not a call to make silently, and the cycle named
exactly three defects. They need a scope decision before those five families
can clear.

## Work per lane

| lane | re-render | evidence-only | blocked | correction branch |
| --- | --- | --- | --- | --- |
| D1A | 0 | 0 | 0 | `claude/rcap-d1a-corrections-v2` |
| D1B | 19 | 0 | 0 | `claude/rcap-d1b-corrections-v2` |
| D1C | 6 | 8 | 0 | `claude/rcap-d1c-corrections-v2` |
| D2A | 4 | 0 | 4 | `claude/rcap-d2a-corrections-v2` |
| D2B | 3 | 0 | 0 | `claude/rcap-d2b-corrections-v2` |
| D3A | 15 | 0 | 1 | `claude/rcap-d3a-corrections-v2` |
| D3B | 1 | 0 | 0 | `claude/rcap-d3b-corrections-v2` |

D1A's 30 families are entirely approved or held; its correction branch carries
the D0-v2 tooling forward but re-renders nothing.

## Assertions

The build fails unless all seven hold:

1. exactly 61 unique correction_required families
2. no technical_approved family appears
3. no held_on_source_or_design family appears
4. every correction points to an existing branch, a commit reachable from it,
   and an artifact present at that commit
5. every reviewer defect entry was classified
6. every family's source pointer resolves to pack bytes matching its sha256
7. observed dispositions match the controlling totals (104 / 61 / 88 / 253)

The 104 approved and 88 held family ids are recorded in the index under
`preservedTechnicalApproved` and `preservedHeldOnSourceOrDesign`, so the
re-render wave can prove afterwards that it never touched them.
