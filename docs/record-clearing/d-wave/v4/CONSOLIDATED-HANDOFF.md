# D wave v4 — consolidated handoff for the eight open families

Machine-readable: `consolidated-handoff.json` beside this file. Regenerate with
`node scripts/rcap-official-forms/d-v4-build-consolidated-handoff.mjs`.

**No family is approved. No track is promotable on this cycle.**

## Result

| | families |
| --- | --- |
| `technical_approved` | **0** |
| `correction_required` | **8** |
| `held_on_source_or_design` | **0** |

35 distinct findings, 62 family attachments: 13 high, 34 medium, 15 low.

## Refreshed totals across all 253 D families

| | before | after |
| --- | --- | --- |
| technical_approved | 157 | **157** |
| correction_required | 8 | **8** |
| held_on_source_or_design | 88 | **88** |

Unchanged. The eight open families stay open, so no D track loses its
open-family blocker and the nationwide ledger does not move.

## The eight

| family | fix | implementation | review | disposition | blockers |
| --- | --- | --- | --- | --- | --- |
| `MO:cr145-form-petition-en` | D-FIX-1 | `26cd37a4` | `cda279f9` | correction_required | 9 |
| `NH:nhjb-2956-support-record-request-en` | D-FIX-2 | `6fea79cd` | `496ae244` | correction_required | 5 |
| `VA:cc-1203-form-en` | D-FIX-4 | `f23bcfbe` | `8466600a` | correction_required | 3 |
| `VT:200-00631-form-en` | D-FIX-4 | `f23bcfbe` | `8466600a` | correction_required | 4 |
| `WA:blake-006-form-en` | D-FIX-3 | `e2c95761` | `e01a5064` | correction_required | 10 |
| `WA:blake-008-form-en` | D-FIX-3 | `e2c95761` | `e01a5064` | correction_required | 11 |
| `WA:crrlj-09-0100-form-en` | D-FIX-3 | `e2c95761` | `e01a5064` | correction_required | 10 |
| `WA:crrlj-09-0870-form-en` | D-FIX-3 | `e2c95761` | `e01a5064` | correction_required | 10 |

Every source SHA-256, reviewed participant-PDF SHA-256, current contact-sheet
SHA-256 and current artifact-manifest SHA-256 is in the JSON, per family.

## The reviewers were one commit behind, and it does not matter

Each reviewer cloned before the generated-manifest refresh, so each judged
implementation commit `4c8aa852` / `e6bb20c2` / `46c312c7` / `76730af8` while the
branch tips are one commit later.

For all eight families the participant PDF, the contact sheet and the
rendered-artifacts manifest hash **identically** at the reviewed commit and at
the branch tip. The refresh touched only
`data/rcap-all50/review-artifacts/f{2,3}-*.json`. Their technical judgement is
about the bytes that are still there.

One consequence did reach a reviewer: D-FIX-3-R-014 records
`generate-rcap-review-manifests.mjs --check` as red, which is the staleness the
refresh fixed. It is green on all five branch tips.

## What went wrong, by kind

### Values landing outside the space the form leaves for them — Washington, Vermont

The serious ones. `buildFlatAnchors` derives a write area from "the rule token's
end, or the next printed token's start, or `pageWidth - RIGHT_MARGIN`". Nine of
twelve Washington anchors took the third branch, so nine write areas are an
assumed page margin rather than a measured blank — and the 40-point minimum-width
floor is then applied to the fabricated width, so it cannot fire. The true
clearances at the four worst anchors were about 24, 2.2, 22.3 and 22.7 points.

The cause is that these forms draw every blank as a **vector path**, and the
token assembler only recognises a blank drawn as underscores. On Blake-006 and
Blake-008 the date of birth is drawn across the caption box's vertical rule at
x=306.7 and strikes through the printed `[ ] Granted` election. On CRRLJ-09-0870
the participant's name is drawn into the court's own disposition cell while the
defendant-name rule beside it stays empty.

Vermont is the same failure by a different route: field `"1"` has **two**
widgets, the fitter and both read-backs look only at `widgets[0]`, and the
second widget is the **Date** line of the perjury declaration — so the
participant's full legal name is printed where the form asks for a date, and it
is visible in the contact sheet.

Nothing in the pipeline could have caught the Washington cases:
`finalizeFlatOverlay` has no read-back at all, and all five Washington
assertions are about line counts and refusal bookkeeping. Not one asks where a
value landed. That is how four families reported 10 of 10 while carrying
overprints on a court's disposition.

### Records that describe bytes that no longer exist

Present in all four batches. Missouri's `handoff.md` still lists `Other
Defendants ← participant.full_legal_name`; its `determinism.json` certifies the
digest of the artifact the commit replaced. All four Washington
`source-record.json` files still read `overlay_no_participant_label_matched` —
the exact disposition this cycle was meant to retire — and all four
`determinism.json` files still say no artifact was ever produced, beside three
artifacts each. Virginia's `protected-fields-scan.json` was not regenerated.

This is the same species as the finding D-FIX-2 was opened to fix. The
regeneration covered the artifacts and the reports the driver writes, and left
the ones it does not.

### Measurements that are estimates, and assertions that cannot fail

`codeAdvance` falls back to half an em per character when a font carries no
`/Widths`, and the generated appearances use `/BaseFont /Helvetica` with no
`/Widths` — so `metricsExact` is **false on every value run** in these
artifacts, nothing downstream consults it, and Vermont's `overflowRightPt: 7.45`
is exactly what the 0.5-em estimate yields. Separately, two Washington
assertions compare three fields that `writeFlatReports` writes from one
variable, and one New Hampshire assertion reads back a literal `true` that
`buildContactSheet` always writes. The substance held only because the reviewers
re-decoded the artifacts themselves.

### Scope narrowing that lost disclosure

Missouri's refusal ledger went from 37 recorded refusals to 1, and New
Hampshire's from 17 to 0, because the re-render is scoped to the reviewed
binding set and the reports are written from that scope. The packages no longer
record why most of their fields are blank. The bindings are right; the
disclosure is gone.

## What still holds

Worth stating, because the corrections themselves were largely upheld.

- **Missouri's fix is right, and right for the right reason.** The reviewer
  re-parsed both artifacts with an independent PDF reader, matched all 48
  flattened placements to the census rects to within 0.012pt, and confirmed the
  widget is blank, the name is still in the two fields that carry it, exactly
  one binding was removed, and the other ten draw identical strings at identical
  positions. The reviewer also found the page-1 line that settles the meaning:
  *"I have reason to believe the agencies named above as defendants may possess
  records subject to expungement."*
- **New Hampshire's D-V3-R-001 is fixed.** The pre-fix sheet carried 17 widgets
  in its filled panel, three drawing `Clear Form`, `Top of Page` and
  `Instructions`. The new one carries 14 that paint nothing.
- **Washington's two premises were both real and both are addressed.** Every run
  on the Blake-006 caption baseline is one character wide; token assembly
  recovers the labels; the unreadable-line counts re-derive independently to
  0, 0, 2 and 7, matching profile and ledger page by page.
- **Virginia and Vermont are safe on the page.** All nineteen drawn values render
  whole inside their widget rectangles and their clip paths; every withdrawal is
  a true blank with no appearance stream at all. D-V3-R-002's real mechanism was
  identified — pdf-lib centre-quads an over-wide value on a `/Q 1` widget — and
  D-V3-R-004 is fixed for meaning, not width: `User.VSBCaseNumber` is refused as
  `protected_category / attorney` against the measured label
  `"[ ] ATTORNEY FOR PETITIONER (VSB No."`.
- **Evidence hygiene is clean throughout.** Every manifest path exists, every
  digest matches disk, every contact sheet is pinned to its finalized artifact,
  and no artifact carries XFA, JavaScript, `/AA`, `/OpenAction`, Launch, Submit,
  ImportData, URI, embedded files, encryption, a surviving AcroForm or an
  orphaned widget.
- **The approved-corpus scan found nothing new**, though the reviewer disputes
  its method — see below.

## The approved-family fitter scan

`correction_required` as a piece of evidence, not as a finding against any
family. The scan read 135 of 157 approved families and 552 written values and
returned no additional family carrying the false-clean signature. The reviewer's
objections: the 22 skipped families are a hole the report does not size; the
dropdown exclusion is right for the wrong reason; and "already in the ledger"
was treated as equivalent to "the approval is still supportable" without saying
so. The negative result stands as far as it goes and should not be cited as
corpus-wide clearance.

## For Terminal A

**Nothing here is promotable.** Do not integrate any of these eight families as
approved work. The branches are additive and safe to leave standing.

When a corrected cycle does produce approvals, the integration rule is:

1. start from the latest green canonical tip, never from `08dbcfe1`;
2. import the common D0-v4 factory closure once — the eleven modules under
   `scripts/rcap-official-forms/` plus the canary evidence, taken at the tip
   rather than as a stack of diffs;
3. import only the exact independently approved family paths;
4. import the consolidated handoff;
5. regenerate the current manifests, including
   `generate-rcap-review-manifests.mjs`;
6. run the current full chain and both required GitHub checks.

Do not merge any D branch wholesale, and do not move canonical back to
`08dbcfe1`.

Two things Terminal A should know about the chain as it stands on canonical:
eight scripts fail identically at `08dbcfe1` and on every D branch, so they are
pre-existing and not caused by this work; and `generate-rcap-staging-action.mjs
--check` mutates `data/rcap-render/staging-apply-evidence.json` mid-run, which
makes `verify-rcap-terminalize-c1/c2/c3` fail on a dirty tree afterwards. On a
clean tree all three pass.

## Branches

| purpose | branch | tip |
| --- | --- | --- |
| shared base + integration + evidence | `claude/rcap-d-eight-family-remediation-v4` | `24ea7a6c` |
| D-FIX-1 Missouri | `claude/rcap-d-fix-1-mo-cr145` | `26cd37a4` |
| D-FIX-2 New Hampshire | `claude/rcap-d-fix-2-nh-nhjb-2956` | `6fea79cd` |
| D-FIX-3 Washington ×4 | `claude/rcap-d-fix-3-wa-decoder` | `e2c95761` |
| D-FIX-4 Virginia + Vermont | `claude/rcap-d-fix-4-va-vt-clipping` | `f23bcfbe` |
| review — Missouri | `claude/rcap-review-d-fix-1-mo` | `cda279f9` |
| review — New Hampshire | `claude/rcap-review-d-fix-2-nh` | `496ae244` |
| review — Washington | `claude/rcap-review-d-fix-3-wa` | `e01a5064` |
| review — Virginia + Vermont | `claude/rcap-review-d-fix-4-va-vt` | `8466600a` |
