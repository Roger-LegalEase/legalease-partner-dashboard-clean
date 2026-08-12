# D1C — Nebraska, Vermont and Wisconsin, regenerated against the D0 factory

Lane D1C regenerates all 24 official-form families for NE, VT and WI from the
Edition-1 source pack, driving the remediated D0 factory rather than the shared
D1 builder.

- Branch: `claude/rcap-d1c-regenerate-ne-vt-wi`, cut from `03c14f9`.
- Source pack: `RCAP_D_D1_SOURCE_PACK.zip`, release `rcap-d-source-packs-2026-08-12`,
  sha256 `01ab34d2eee2ae5621e18fa74e4c03f24df667965eb27a4e3bf7f80c3216acaa`,
  verified before extraction. Extracted outside every worktree; no source
  binary is committed.
- Driver: `scripts/rcap-official-forms/lanes/d1c-regenerate.mjs`.
- D0 canary: 107 checks, green, before any state work.
- Shared verifier `verify-rcap-official-forms-d1.mjs`: green except one stale
  index entry, described under **What the captain has to merge**.

Every source resolved by exact sha256 against its `STATE_MANIFEST.csv` row:
24 of 24 match, 0 mismatches.

## Why this lane has its own driver

`scripts/implement-rcap-official-forms-d1.mjs` reads and rewrites
`verified-binary-index.json` and `implementation-index.json`. Seven lanes
regenerate concurrently, so whichever finished last would silently discard the
other six. This lane writes neither file. It emits
`data/rcap-all50/overlays/production/<state>/state-index.json` instead, and the
captain merges those.

## What had to be measured rather than named

Three properties of these three corpora meant a field's meaning could not be
read off its field name, and each was measured out of the binary.

**Positional widget names.** Nebraska's CC-6-11, CC-6-12 and CC-6-15.1 and
every Vermont petition name widgets `Text5`, `38`, `34h`. The printed label
beside the widget carries the meaning, so it is measured; the field name is
still preferred wherever it says something, because measurement finds the
*nearest* text and nearest is not the same as correct.

**Identity-H captions.** The captions that matter most are drawn in subset
fonts whose glyphs are two-byte CIDs — Nebraska's `(Date of conviction)`,
Wisconsin's `Defendant's Name`. Read a byte at a time they come back as
mojibake. The driver resolves each font's `/ToUnicode` CMap and its real width
source (`/W` for CID fonts, `/Widths` otherwise) before decoding, and records
per glyph whether a mapping existed. A caption containing an unmapped glyph is
never treated as if it read cleanly.

**Vector rule lines.** Wisconsin's four forms carry no widgets. Their answer
blanks are thin filled rectangles, so rule geometry is taken from painted
rectangles in the content stream. Clipping paths use the same `re` operator and
describe no ink, so an unpainted path is discarded rather than measured.

`extractRects`, which the lane brief names, does not exist in
`rcap-pdf-anchor-capture.mjs`. Editing a shared D0 module is out of scope for a
lane, so rect capture and the Unicode-aware walk live in the lane driver.

## Three placement conventions, told apart by geometry

Which side of a rule a value belongs on is not cosmetic — guessing wrong puts
the value in a different box.

| convention | how it is recognised | where the value goes |
| --- | --- | --- |
| `boxed_cell_caption_at_top` | vertical rules stand at both ends of the rule and hang downward | inside the box, below the caption |
| `rule_with_caption_beneath` | a free rule with its caption printed under it | on the rule |
| `inline_rule_blank` | the caption shares the rule's baseline | on the rule |

The first two are otherwise identical — a rule with a caption a few points
below it — and the difference between them is the difference between writing
inside DJ-LE-247's cell and writing in the row above it. Vertical enclosure
separates them and is measured. A rule closed from below by verticals is a cell
floor, never a line to write on.

A rule matching no convention is recorded unanchored and left blank: 90 of them
across the three states.

## Guards this lane added, all of them narrowing

D0's binder is unmodified and has the last word on every field and every
anchor. What the lane adds only ever refuses more.

**Source default values.** *This is the defect that visual review caught.*
Nebraska's caption line is not page content: `IN THE ___ COURT OF ___ COUNTY,
NEBRASKA` is stored as the default value of four form fields that the form's
own script rewrites. Writing a county into one of them does not fill a blank —
it deletes the printed caption, and the first render of CC-6-11 read
`District Court Example County COUNTY, NEBRASKA`. Every NE form in this pack
does this; DC-1-15 stores 28 such values. No field that arrives holding text is
written, and each is recorded with the value it holds.

**Overlap.** D0 judges one field at a time, which is the right unit for
protection and the wrong unit for placement. Two writable widgets drawn on top
of each other are individually valid and jointly wrong, and once the script is
stripped nothing says which the court reads. The group is refused whole.

**Measured-label conflicts.** A binding resting on a measurement is discarded
when another measurement contradicts it: the same label found beside two
widgets, two labels claiming one fact, or measured text that is prose rather
than a caption (a blank with words after it is a sentence with a gap in it, not
a label).

**Multi-variant court captions.** A court-issued document names each party
once. DC-1-15 carries separate caption fields for divorce, probate, adoption,
emancipation and name change; which variant applies is not a fact in the fact
set, so several fields claiming one caption fact are all refused. On a
participant filing the repetition is ordinary — a petition prints the
petitioner's name in its caption and again over the signature — and stays
allowed. This is why DC-1-15 now renders nothing.

## A defect in the shared descriptor list

`FACT_DESCRIPTORS` is ordered most-specific-first and `matches[0]` wins, which
is how `City, State, Zip` correctly resolves to the compound descriptor. But
`participant.street_address` carries `/\baddress\b/` and is listed above
`participant.email`, so **every field captioned "Email Address" resolves to the
street address** — eight of them across Vermont and Nebraska — and would have
had the participant's home address written into the email box.

The list is shared and this lane does not edit it, so the mis-resolution is
refused rather than redirected: writing nothing is correct, writing the wrong
participant fact is not. Fixing the ordering upstream would recover eight
fields for every lane at once.

Two related gaps, recorded but not worked around: `emailaddress` as a field
name matches nothing, because there is no word boundary in it for `/\bemail\b/`
or `/\baddress\b/`; and `deterministic.filing_date`'s `^\s*dated?\s*$`
alternative can never fire, because `haystack()` appends ` || <squashed>` to
every subject and no anchored pattern can match the result.

## Holds

Every family carries the holds its manifest row declares, and this lane
discharges none of them. All 24 rows are `generation_allowed: no` and
`runtime_status: runtime_disabled`; 5 are `revision_confirmation_required`; all
24 carry the independent-visual-review and counsel-review holds. Nothing here
becomes a sellable route because it renders. No source in these three states
states `DO NOT COMPLETE THIS FORM FOR FILING`; the hold is enforced anyway and
is proven load-bearing by a mutation test per family.

## Results

24 families: 15 AcroForm, 9 flat. 481 form fields inventoried first-hand with
per-widget page, rectangle, max length, multiline flag and option list, plus 18
measured overlay anchors. 46 AcroForm fields and 18 anchors bound; 444 field
refusals and 90 unanchored rules recorded with reasons. 62 values written into
the canonical artifact.

15 families render: 15 canonical fixtures, 15 boundary fixtures, 15 negative
fixtures, 15 contact sheets. All 15 reproduce byte-identically on a second
render. All 15 pass the visibility, placeholder, protection and overlap scan.
Active-content residue: 0 across every artifact.

16 unfittable values, every one of them in the boundary fixture and every one
refused rather than clipped — the 6pt floor holding against deliberately
oversized input. Zero unfittable values in any canonical fixture.

Mutation tests, three per rendering family, all red as required: a perturbed
source byte is refused on hash; a non-filing notice refuses the fill; and the
contact sheet refuses a panel built from the unflattened document.

### Per state

| | families | rendered | fields | bound | anchors | contact sheets |
| --- | --- | --- | --- | --- | --- | --- |
| NE | 11 | 5 | 176 | 21 | 0 | 5 |
| VT | 9 | 7 | 305 | 25 | 0 | 7 |
| WI | 4 | 3 | 0 | 0 | 18 | 3 |

### Families that render nothing, and why

- `NE/dc-1-15-form-en` — court-issued notice, multi-case-type template; its
  caption fields are mutually exclusive variants.
- `NE/*-instructions-en` (5) — instructional; read, not filed.
- `VT/200-00131-form-en` — completed by the opposing party.
- `VT/200-00130a-instructions-en` — instructional.
- `WI/dj-le-250b-support-en` — captions are drawn in a subset font with no
  usable `/ToUnicode`, and the form has no per-field rule segments. No
  unambiguous anchor exists, so nothing is written.

`WI/cr-267-form-en` renders its county, date of birth and case number. Its
`Defendant's ⟨unmapped glyph⟩` caption is refused: one glyph the font never
mapped, and no reading of it is certain.

## What the captain has to merge

`state-index.json` in each state carries `statusChangesForCaptainToMerge`.
Until those land in `implementation-index.json`, the shared verifier judges
these packages against the previous build's claims and reports three missing
fixtures for `NE/dc-1-15-form-en`, which no longer renders one. Everything else
in the shared verifier is green.

Earlier build generations left sibling directories under these three states
that this lane did not write and did not delete. Only the directories listed in
each `state-index.json` are D1C output.

## Status

`implementation_complete_pending_independent_review`. Not approved, not
technically approved, not live. This lane does not approve its own output.
