# D-FIX-3 — independent review of the four Washington families

Reviewed branch `claude/rcap-d-fix-3-wa-decoder` at `46c312c`, together with its
shared factory base `257bf04`. Findings and dispositions in
`d-fix-3-review.json`.

## Dispositions

| Family | Disposition |
| --- | --- |
| `WA:blake-006-form-en` | `correction_required` |
| `WA:blake-008-form-en` | `correction_required` |
| `WA:crrlj-09-0100-form-en` | `correction_required` |
| `WA:crrlj-09-0870-form-en` | `correction_required` |

## The four findings this branch set out to fix are fixed

Both premises were real and both are addressed.

Blake-006 and blake-008 do draw every glyph as its own text-showing operator — I
re-decoded page 1 of blake-006 and all 45 runs on the baseline carrying "State of
Washington/City of \_\_\_\_\_\_\_\_\_\_\_\_\_\_," are one character wide. Token
assembly now recovers the labels, and the four families offer 79, 91, 76 and 41
candidate labels.

The unreadable-line reconciliation is correct. I re-derived it from the finalized
artifacts rather than from the profile: **0, 0, 2 and 7**, matching profile and
ledger exactly, page by page. Blake's zeroes are genuine zeroes; 0100's two are
whole statutory bullet items on page 4 (53 and 41 undecoded codes); 0870's seven
are four on page 1 and three on page 2. No anchor sits on a refused line. Every
refusal carries a reason and a location. Both counts and both partitions are
sound.

The evidence hygiene is also sound: every manifest path exists, every digest is
the digest on disk, no PDF is omitted from a manifest, page counts, boxes and
rotations are preserved, each contact sheet is pinned to and demonstrably built
from the finalized artifact, and all twelve artifacts are free of XFA,
JavaScript, `/AA`, `/OpenAction`, Launch, Submit, ImportData, URI, embedded
files, encryption and object streams. No AcroForm survives and every page's
`/Annots` is an empty array. All three canaries pass and
`d-v4-verify-corrections.mjs` reports 40 of 40.

Washington's three adoption-continuity records remain
`stale_due_to_substantive_family_change`, last written by `08dbcfe`. Nothing on
this branch refreshes them: the family commit changes only files under
`data/rcap-all50/overlays/production/washington/`.

## Why none of the four can be approved

These packages previously had no rendered artifacts. They now have three each,
and the artifacts put values where the forms do not leave room for them.

**One rule is doing the damage.** `buildFlatAnchors` derives a write area from
"the rule token's end, or the next printed token's start, or `pageWidth -
RIGHT_MARGIN`". Nine of the twelve anchors across the four families end at
exactly `558.0 = 612 − 54`: nine write areas are the assumed page margin. Three
are real next-token gaps. **Not one is a printed rule line** — because the token
assembler only recognises a blank drawn as underscores, and every blank on all
four of these forms is a vector path the text decoder never reads. Since the
40-point `MIN_WRITE_WIDTH` floor is then applied to the fabricated width, it
cannot fire where it matters. The true clearances were about 24pt, 2.2pt, 22.3pt
and 22.7pt at the four worst anchors, all below the floor, and all four were
accepted.

What that produces on the page:

- **blake-006 and blake-008** — the date of birth is drawn `x=[282.6, 338.9]` on
  baseline 453.2. The caption box's vertical rule is at `x=306.7`, so most of the
  value lies in the court's right-hand cell, and at 11pt the digits rise 3.8
  points above the printed baseline 457.3 to strike through `[ ] Granted` —
  `[ ] Granted (ORVCDC)` on blake-008. Ink over a court's disposition election.
  The only rule in that caption cell is `y=464.8, x=[72.7, 271.7]`, directly
  above the label, and it is left empty.

- **crrlj-09-0870** — "Defendant" on this form is a party designator printed
  *beneath* the defendant-name rule (`y=484.7, x=[78.7, 297.8]`), not a label
  with a blank beside it. That rule is left blank and the participant's name is
  drawn from `x=303.4` — 2.2 points of clearance existed before the cell border
  at `x=305.6` — into the court's own caption cell, the one carrying the cause
  number, the order title, `Granted (in full or in part) (ORVCJG)`,
  `Denied (ORVCJD)` and `Clerk's Action Required`. On a proposed order a judge
  signs, a name printed in the disposition cell says something about the
  disposition.

- **crrlj-09-0100** — the caption name crosses the cell border at `x=310.4` into
  the right-hand cell; the ZIP ends 7.9 points past the printed rule and past the
  form's right column edge at `x=531.0`; and on page 5 the address row's captions
  are printed under their rule, so every value was drawn beside a caption while
  the official blanks stayed empty. No decretal risk on a petition, but not a
  correctly filled form either.

- **blake-008** additionally declares a 187.3-point county write box where the
  printed `County/City of` blank is 122.6 points, so the boundary fixture writes
  the county 64.2 points past the end of the blank. Measured correctly it would
  have been refused.

**Nothing in the pipeline could have caught any of this.** The AcroForm path
reads back what reached the page, withdraws a clipped value and re-finalizes, and
the verifier then asserts "no rendered value leaves its widget". The flat-overlay
path has no read-back at all: `finalizeFlatOverlay` draws and returns,
`overflow-and-clipping.json` records only the fitter's predictions, and the five
WA assertions are all about line counts and refusal bookkeeping. Not one looks at
where a value landed. That is how four families report 10 of 10 while carrying
the overprints above.

Two of those five assertions also cannot fail. "The profile's unreadable-line
count equals the decoder's own refusal count" compares three fields that
`writeFlatReports` writes from the same variable — which is the exact failure
mode D-V3-R-008 and D-V3-R-009 reported. The substance holds, but only because I
re-decoded the artifacts; the assertion does not establish it.

## Two smaller things worth fixing while the packages are open

A token can run for any distance as long as the form draws spaces, because only a
gap between glyph boxes ends one. Blake's 41 space glyphs between "Defendant" and
"DOB" merge two labels 125 points apart into a single token whose `labelBox` is
205.9 points wide and whose recorded text, after whitespace collapsing, reads as
a tidy 13-character label. On 0870 the same mechanism merges across the caption
divider into "Plaintiff Order on Petition to Vacate Cannabis".

And the caption-only rule is a page-number test, not a caption test. The ledgers
show what that admits on page 1 of a court order: blake-006's decretal blank
"This jurisdiction's applicable ordinance is" cleared both gates and reached the
binder, stopped only by the absence of a matching fact descriptor; 0870's three
decretal `Offense:` rows reached the last gate. All three orders draw their
caption box explicitly, so the boundary is measurable rather than assumed.

## Records that still describe the old failure

All four `source-record.json` files still read `implementationStatus:
overlay_no_participant_label_matched` and `factoryVersion: d0-remediated-v1`, and
all four `handoff.md` files still read "0 overlay anchors measured out of the page
content streams". The required outcome for this cycle was that no "no participant
label matched" disposition survive where usable label glyphs exist. It survives
in the two files a reviewer opens first.

All four `reports/determinism.json` files still read `{"rendered": false, "reason":
"no finalized artifact was produced for this family, so there is nothing to
re-render"}` while three artifacts sit beside them, and the manifest in the same
directory asserts byte-for-byte reproducibility that nothing in the package
supports.

## Method and limits

The blank source PDFs are not in git and no extraction root exists under
`/tmp/rcap-source-packs`, so no artifact was compared against its blank source
directly. These are flat-overlay renders, so each finalized fixture carries the
source's own page content streams and vector paths unchanged, and every geometric
claim here was re-derived from those bytes. The one claim that needs the source
alone — byte-for-byte reproducibility — is recorded as unverified rather than
assumed.

Overlay text was separated from printed text by font channel (the forms draw only
with embedded Type0 subsets, the overlay only with the standard-14 Helvetica) and
each drawn value re-measured with the Helvetica metrics it was drawn with. Caption
box borders and printed rule lines were recovered by walking each page's path
operators through the CTM, independently of the module under review. An earlier
pass that used the decoder's own fallback advance understated some extents; the
numbers above are the corrected ones.

Two scripts write into the repository when run — `d-v4-verify-corrections.mjs`
and `generate-rcap-review-manifests.mjs`. Everything they wrote during this
review was reverted.
