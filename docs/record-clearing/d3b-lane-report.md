# D3B — Oregon, Iowa, Massachusetts and Utah, built from Edition 1

Lane D3B, branch `claude/rcap-d3b-regenerate-or-ia-ma-ut`, based on
`03c14f985beda55596b894686bf70833e44a8f5b`.

This is a first build, not a regeneration. At the D0 base
`data/rcap-all50/overlays/production/` held only the nine D1 states; Oregon,
Iowa, Massachusetts and Utah had no package directories, no source records and
no entries in the shared indexes. Every family here is established from the
Edition 1 source pack, whose `STATE_MANIFEST.csv` is the identity authority.

29 source binaries. All 29 verify byte-for-byte against the pack manifest —
both sha256 and declared length. No mismatches, so nothing was blocked on
identity.

## What is here

| | IA | MA | OR | UT | total |
|---|---|---|---|---|---|
| families | 2 | 2 | 4 | 21 | 29 |
| AcroForm / flat overlay | 0 / 2 | 1 / 1 | 2 / 2 | 0 / 21 | 3 / 26 |
| blanks and fields inventoried | 104 | 54 | 141 | 1,121 | 1,420 |
| written | 16 | 0 | 22 | 39 | 77 |
| protected or refused | 88 | 54 | 121 | 1,046 | 1,309 |
| finalized PDFs | 4 | 0 | 8 | 16 | 28 |
| contact sheets | 2 | 0 | 4 | 8 | 14 |

Canonical, boundary and negative fixtures: 29 of each. Mutation tests: 72,
all passing. Unfittable refusals at the readable floor: 6.

## Measuring a flat form

26 of the 29 binaries carry no AcroForm, so their census had to be measured
rather than read. Three of D0's shared modules do the measuring and none of
them was edited; what this lane added is a content-stream path reader, which
`rcap-pdf-anchor-capture` does not expose.

A blank is a mark the document makes. Iowa, Oregon and Massachusetts draw
theirs as thin filled rectangles — `298.32 677.64 137.759 0.481 re f` is
Iowa's county blank, verbatim. Utah draws most of its as runs of underscore
glyphs, which the per-character positions the anchor capture already records
locate exactly. Clipping rectangles (`re W n`) are ignored: they bound a
drawing region and are not marks on the page.

Each rule is then named by text the document prints beside it — to the left, on
the caption line beneath, or, on Utah's `____ Judicial District ____ County`,
to the right. Nothing is inferred: every rectangle is bounded by a mark the
document draws and every label is a string it prints.

Four things had to be got right before the labels were trustworthy, and each
was found by a binding that came out wrong:

**Word spacing lives in the positions, not in space characters.** A PDF draws
`FOR THE COUNTY OF` as separate show operations, so a naive join yields
`FORTHECOUNTYOF`, which matches no descriptor. Oregon's county would have lost
its binding to a text-extraction artifact. Runs are rejoined with a space
wherever the gap exceeds 0.14 of the font size.

**The nearest line beneath a rule is not always the one that names it.**
Oregon's defendant-name rule sits under `DECLARATION OF ELIGIBILITY` in the
right column before it sits under `Defendant` in the left. The candidates are
walked nearest-first and the first with text actually over the blank wins.

**A parenthetical is not a name.** Oregon's `Case No: ____` carries
`(leave blank if no court case)` underneath. A left label ending in a colon
beats a parenthetical beneath it.

**A slot id must not end in digits.** D0 reads a trailing one- or two-digit
group on a field name as a repeating charge-row index, so `...x330` was read as
row 30 and refused for want of a thirtieth charge. Utah's case number was lost
to exactly that until slot ids gained a `.rule` suffix.

A rule the form draws but never names stays in the census with a null label. It
cannot bind — the binder falls back to the slot id, which matches nothing — but
a census that dropped it would be claiming a completeness it does not have.

## What is written, and what is not

A blank is written only when this lane names it explicitly, the name resolves
to exactly one measured slot, and D0's binder independently agrees it is
writable. The binder's approval is necessary and never sufficient.

77 values across 14 families. Caption county, case number, party name, date of
birth, and the participant's own name, street address, city/state/zip,
telephone and email where the form asks for each separately.

Nothing else. Every court, clerk, prosecutor, attorney, agency,
service-recipient, outside-party, signature, notary, money, race and
responsible-official field is blank, and 1,309 refusals each carry the reason
D0's binder gave.

### Binding corrections

84 across the four states. A correction names a field's true fact; because that
fact differs from the one the field's own name resolves to, D0's binder refuses
the field rather than writing an approximately-right value. **A correction can
only ever remove a binding**, and no D0 protect rule, type guard or
readable-size floor was relaxed anywhere in this lane.

They exist because the descriptor list resolves any name containing a bare
`name` to `participant.full_legal_name`, and any name containing a bare
`address` to `participant.street_address`. Left alone, a generic fill would
have written:

- the petitioner's own legal name into three alias lines on each Oregon record
  check — a form whose purpose is to disclose names other than the legal one;
- the petitioner's own name into `Father's Name`, `Mother's Maiden Name` and
  `Spouse's Name` on the Massachusetts probation petition;
- the petitioner's own name into `Name of Person to Receive Report` on Utah's
  BCI third-party release, which would have disclosed a criminal history record
  to the wrong person;
- the petitioner's street address into every `Email address` caption;
- the court's address into `Court Address` on two Utah forms;
- employers, lien holders and title holders as the petitioner, throughout
  Utah's ten-page financial declaration;
- a two-letter state code onto Utah's `State income tax` withholding line and
  onto `DRIVER LICENSE # AND STATE`;
- the petitioner's details into the Defendant/Respondent column of Utah's civil
  cover sheet;
- charge-table and offence-table headers on the Oregon packet as a person's
  name.

Where a lane declines a blank the binder would bind without a specific
correction — the eighteen other-party blocks on Utah's cover sheet, pages 2 to
10 of the fee-waiver declaration — the family records a written rationale for
the class, and the build fails if one is missing.

## Holds

Every family in this lane is held. Nothing here is a sellable route, and
rendering cleanly did not make anything one.

| hold | families |
|---|---|
| `state_manifest_generation_allowed_no` | 29 |
| `edition_1_runtime_disabled` | 29 |
| `legal_review_mapping_requires_track_level_import_mapping` | 29 |
| `f_independent_visual_review_required` | 29 |
| `state_readme_open_items_present` | 25 |
| `not_participant_fillable_no_fixture_fill` | 15 |
| `source_or_currentness_gate_open` | 9 |
| `source_gated_asset` | 9 |
| `revision_confirmation_required` | 5 |
| `xfa_source_runtime_renderer_cannot_fill` | 1 |

15 families are censused and classified in full but not filled. The line this
lane drew: a document is filled when it is participant-completed **and** its
source is a candidate-current source. It is not filled when its own gate is
open — when the manifest marks it `source_gated`, when its revision is
`REV-UNKNOWN` with `revision_confirmation_required`, or when it is not a
participant document at all. A rendered sample of a possibly-superseded form
invites exactly the inference those gates exist to prevent.

That decision accounts for all of Massachusetts, seven Utah source-gated
assets, four BCI assets whose revision is unconfirmed, two instruction sheets
with no blanks, a return of service, and the two Oregon and Utah court orders'
non-caption fields.

Held families still carry the full census, the full classification, the
protected-field report, the negative assertion and the mutation results.
Because a document-level hold otherwise refuses every field at once and tells a
reviewer nothing, each field is put through the binder twice — once with the
gate open, once with it applied — and both answers are recorded. The
Massachusetts finding above came out of the intrinsic pass.

## Non-filing holds

All 29 sources were scanned for `DO NOT COMPLETE THIS FORM FOR FILING` and its
variants. **None carries it**, so no family in this lane is under a non-filing
hold.

That is a negative result, so the mechanism is proved separately rather than
assumed: `verify` passes a real binary from each of the four states the notice
its own face does not carry, and requires `NonFilingHoldError` and no fill.
4 of 4 refuse.

## Massachusetts OCP004

The lane brief flagged OCP004 as an opt-out notice package whose legacy
filename is URL-encoded, and asked whether it is participant-completed before
anything binds to it.

It is not in Edition 1, in any form. Identity was resolved by sha256 against
the pack manifest rather than by filename, so its absence is real and not a
matching artifact: Edition 1 carries exactly two Massachusetts binaries and
neither has OCP004's hash. Nothing is bound to it, and this lane records no
opinion about whether it is participant-completed, because it never had the
binary to inspect.

## Proofs

Per family: the artifact is finalized (values materialized into appearances,
flattened into page content, sanitized, rebuilt from flattened pages); the
active-content scan is clean and byte-inspectable; every expected value is
proved visibly present by decoding the finalized page content including
flattened appearances; blank and filled panels are proved to differ; the
contact sheet is built from the finalized artifact and refuses to emit
otherwise; and no token appears in the artifact that does not decompose into
expected values and source tokens.

72 mutation tests, all passing, four per filled family:

- perturbing one source byte makes the render refuse on hash drift;
- handing the contact sheet the blank source in place of the finalized artifact
  makes its visibility proof fail — the defect F3 found;
- a value that cannot be drawn at six points or larger in a real widget from
  the document is refused rather than shrunk past the floor;
- no token reaches the artifact without an expected value behind it.

Determinism is checked twice: each canonical fixture is rendered twice during
the build and the bytes compared, and `verify` re-derives all 42 committed
artifact hashes from disk. 42 of 42 match.

## Shared paths

None. This lane wrote no entry into `verified-binary-index.json` or
`implementation-index.json`; seven lanes are building concurrently and both
files are whole-file rewrites. Each state carries a `state-index.json` instead,
for the captain to merge at import. `scripts/implement-rcap-official-forms-d1.mjs`
was not run — it rewrites both shared indexes and does not list these states
anyway. The D0 factory modules were driven directly and none was edited; the
canary still reports 107 checks passing.

Everything changed by this lane is under `data/rcap-all50/overlays/production/`
for its own four states, `scripts/rcap-official-forms/lanes/d3b-regenerate.mjs`,
and `docs/record-clearing/d3b-*.md`.

## Findings for D0 rather than for these states

**The descriptor list is too permissive on bare `name` and bare `address`.**
Every correction above traces to one of these two. `Father's Name`,
`Alias/Maiden/Previous Name`, `Name of Charges`, `Business name`,
`Name(s) on title` and `Name of Person to Receive Report` all resolve to
`participant.full_legal_name`; `Email address`, `Court Address` and
`Address & phone` all resolve to `participant.street_address` because the
street-address descriptor matches a bare `address` and is ordered first. The
fail-closed design holds — nothing was written that should not have been — but
it held here because 84 fields were named individually.

**There is no composite address descriptor.** Several forms ask for a whole
mailing address on one rule: Oregon's `Street, City, State, Zip code`, Utah's
`(Street/Box number) (Apt #) (City) (State) (Zip)`. `participant.city_state_zip`
fills part and drops the street; `participant.street_address` drops everything
else. Both are refused. A composite would make forms of this shape fillable
across the corpus.

**Dates are written in ISO form with no presentation layer.** D0's type check
requires `YYYY-MM-DD` and the value is drawn verbatim, so a field captioned
`MM/DD/YYYY` — as Oregon's and Utah's date-of-birth blanks are — receives
`1991-04-17`. Correct and unambiguous, but not what the caption asks for.

**A split field has no fact.** `( ___ ) ______` for a telephone number,
`HOME PHONE` beside `DAYTIME PHONE`, `Month / Day / Year` as three blanks: one
`participant.phone` and one ISO date cannot fill any of them honestly. They are
refused throughout this lane, which is right, and they are common enough across
official forms to be worth a descriptor decision.

## Status

`implementation_complete_pending_independent_review`.

This lane does not approve its own output. Visual review, counsel review and
source-freshness review are all open, and every hold above is still in force.
