# Gate B dispatch package

No verdict is issued here. Every family below is a re-review candidate. The reviewer records at the reviewed head remain the current verdicts until a reviewer issues new ones against the new bytes.

## The blocker this lane cannot clear

Four families -- AK TF-800, AK TF-805, NC AOC-CR-287 and NC AOC-CR-298 -- were refused for one reason only: the reviewer could not recompute the official source SHA-256, because the Master Library extract is absent from the reviewer's clone. That is an environment fact, not a defect in any artifact. The corpus is mounted in this lane's container and all four sources hash to their pinned values there, but the reviewer must recompute it in their own clone, and no commit in this repository can carry the corpus bytes to them.

| family | verdict at the reviewed head | corrected here | still open | pages shown | placement clean | ready for re-review |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| AK:tf-800-form-en | correction_required | 0 | 0 | 1, 2, 3 | yes | yes |
| AK:tf-805-form-en | correction_required | 0 | 0 | 1, 2 | yes | yes |
| KY:aoc-334-form-en | correction_required | 2 | 1 | 1 | yes | no |
| KY:aoc-496-3-form-en | correction_required | 1 | 1 | 1, 2, 3 | yes | no |
| NC:aoc-cr-287-form-en | correction_required | 0 | 0 | 1, 2 | yes | yes |
| NC:aoc-cr-288-form-en | correction_required | 1 | 0 | 1, 2 | yes | yes |
| NC:aoc-cr-296-form-en | substantive_owner_decision_required | 0 | 2 | 1, 2 | yes | no |
| NC:aoc-cr-298-form-en | correction_required | 1 | 0 | 1, 2 | yes | yes |

## AK:tf-800-form-en

- **A-SOURCE-BYTES-ABSENT** — _outside_this_lane_
  - the reviewer could not recompute the official source SHA-256, because the Master Library extract is not mounted in the reviewer's clone
  - remains: the reviewer needs RCAP_BUNDLE_EXTRACT set to a mounted Edition 1 extract; this repository cannot carry the corpus bytes

## AK:tf-805-form-en

- **A-SOURCE-BYTES-ABSENT** — _outside_this_lane_
  - the official source SHA-256 could not be recomputed from bytes
  - remains: same mount; no artifact, map, classification or sidecar change was requested or made

## KY:aoc-334-form-en

- **A-KY334-UNDECLARED-WRITES** — _corrected_
  - the artifact drew 7 values against a map declaring 5: the case number into `Court` and the participant's name onto the rule captioned `Date`, both recorded unwritable in the family's own map
  - closed by: the renderer is now given the role refusals the map records and applies them before any name match, and the family was re-rendered
  - proven by: controls C2 and C3 reproduce both writes from the bytes at the reviewed head and require the contract to refuse them; the placement audit at this head reports no protected-slot finding for this family
- **A-X3-NEVER-WRITE-COVERS-ONLY-MANUAL** — _corrected_
  - field `Text1` is classified `unused`, which the binder's denylist did not name, and was bound and written
  - closed by: writable classes are an allowlist of participant, deterministic and participant_writable, mirrored in the verifier
  - proven by: control C7; `unused`, `not_applicable`, `manual_participant` and `prosecutor_or_outside_party` are all refused by default now
- **batch-1: ownership typed as participant filing on a court order; revision REV-UNKNOWN; scraped officialTitle; Reset/Print captions flattened into ink** — _open_
  - recorded by the reviewer as open at the reviewed head
  - remains: source-identity and document-ownership questions this correction wave did not address

## KY:aoc-496-3-form-en

- **A-KY4963-COUNTY-DROPPED** — _corrected_
  - the map declares 2 bindings, the artifact draws 1, and the scan reported both numbers and passed: the county dropdown produced nothing and nothing said so
  - closed by: populated-fields.json records what the renderer did rather than only what the map declared, and the scan reconciles written against declared in both directions
  - proven by: control C9; this family's scan now records `value_not_among_field_options` against `3 County Dropdown` -- the fixture county is not one of the form's real options -- rather than reporting it populated
  - remains: the binding is still not exercised by any fixture, because selecting a real county would mean putting a county this platform did not choose onto a filed document
- **A-KY4963-IDENTITY-UNRECORDED** — _open_
  - revision REV-UNKNOWN with freshnessStatus revision_confirmation_required, and officialTitle is a scraped body fragment
  - remains: source identity, unaddressed by this wave

## NC:aoc-cr-287-form-en

- **source binary not resolvable** — _outside_this_lane_
  - the reviewed source binary could not be resolved in the reviewer's clone
  - remains: the same mount blocker as the two Alaska families

## NC:aoc-cr-288-form-en

- **ESC-GEOMETRY-NOT-AN-INPUT (still present)** — _corrected_
  - the petitioner's name was written into `PetitionerIsEligibleBecauseText1`, a field whose widget sits under the printed heading FINDINGS OF FACT on page 2 -- the judge's block
  - closed by: the region channel consults a heading vocabulary rather than the field-name rules, which match nothing in `FINDINGS OF FACT`; and page 2's topmost heading is no longer suppressed as a document title
  - proven by: controls C1 and C6; the binder now refuses this field with reason protected_page_region / court
- **withdraw the false provenAgainstThisFamilysBytes claim** — _acknowledged_
  - the rerender record claimed this escalation proven against this family's bytes and it was not
  - closed by: the claim is superseded: the check the reviewer said was missing now runs against every family, not just this one
  - proven by: the placement audit reports 17 of 17 rerendered families clean on every page, measured rather than asserted

## NC:aoc-cr-296-form-en

- **substantive_owner_decision_required** — _owner_decision_
  - AOC-CR-296 is prosecutor-controlled, and whether it belongs in a participant-completed packet at all is not a technical question
  - remains: an owner has to decide; the pathway stays sellable only through supported participant-filed documents
- **DLState bound to participant.state on a field-name substring match** — _open_
  - the residence state and the state that issued a driver's licence are different facts, and the canonical fixture renders 'XX' in the Drivers License State column
  - remains: subordinate to the ownership decision, and wrong either way

## NC:aoc-cr-298-form-en

- **source binary not resolvable** — _outside_this_lane_
  - the reviewed source binary could not be resolved in the reviewer's clone
  - remains: the same mount blocker
- **not raised by any reviewer** — _found_by_the_new_contract_
  - the participant's name was drawn into `NotEligibleReason` on page 2, a field recorded unwritable in this family's own map
  - closed by: the same role refusal now reaching the renderer
  - proven by: the placement audit; this defect was invisible to a page-1 raster, which is why no reviewer saw it
