# Independent Review — Batch A

**Reviewer:** Independent Reviewer A
**Reviewer branch:** `claude/rcap-pdf-independent-review-a-qkff6d`
**Reviewed lane:** `claude/rcap-pdf-family-rerender-mounted`
**Reviewed head:** `ea1a16b6358086c3c24fbd66e2fd005173d3ad87`
**Review date:** 2026-08-20

Canonical records:

- `data/rcap-all50/pdf-independent-reviews/batch-a-manifest.json`
- `data/rcap-all50/pdf-independent-reviews/batch-a-group-1.review.json`
- `data/rcap-all50/pdf-independent-reviews/batch-a-verdicts.json`

This batch does not edit, adopt or restate the batch-1 record, and copies no
verdict forward. Each verdict was reached from the evidence at the head above.

## Verdicts

| Family | Document | Verdict |
| --- | --- | --- |
| `AK:tf-800-form-en` | TF-800 | correction_required |
| `AK:tf-805-form-en` | TF-805 | correction_required |
| `KY:aoc-334-form-en` | AOC-334 | correction_required |
| `KY:aoc-496-3-form-en` | AOC-496.3 | correction_required |

Approved: 0. Correction required: 4. Owner decision: 0 as a verdict, 1 escalated
inside a correction verdict.

Two different kinds of correction sit under one word. **AK tf-800 and tf-805 are
clean in every artifact respect that could be tested here** and are held back
only because the official source bytes are absent at this head, so their source
SHA-256 could not be recomputed. **KY aoc-334 and aoc-496-3 carry defects in
their own bytes** and would not approve even with the corpus mounted.

Closest to approval: `AK:tf-805-form-en` — seven bindings, seven drawn values,
exact map-to-artifact agreement, every protected area blank on both pages,
correct identity and revision, flattened and active-content clean, sidecar
complete and hash-bound, raster bound to the current contact sheet against a
discriminating control.

## The finding that matters most

The Gate B rerender **processed zero families**, and the record produced from it
still marks per-family objections as `provenAgainstThisFamilysBytes: true`.

`gate-b-family-rerender-evidence.json` records the attempt as *"ran to completion
and processed 0 families, 0 fields, 0 contact sheets"*, `artifactsChanged: 0`,
`privateCorpusMountedInThisClone: false`, and `newArtifactSha256` equal to
`currentCanonicalArtifactSha256` for all 17 families. Its own `notAnApproval`
field says *"no objection is proven against any family's own bytes, because no
family's bytes changed."* The `families[]` array then sets
`provenAgainstThisFamilysBytes: true` on 28 objections.

`KY:aoc-334-form-en` shows the cost. Its field map refuses `Court` and `Date`.
Its artifact writes to both. **The maps are corrected; the artifacts are not.**

## Per-family findings

### AK:tf-800-form-en — correction_required

Clean throughout. Map declares 7 bindings over fields carrying 9 widgets
(`caseNo` alone has 3, on pages 1–3); the artifact draws exactly 9 values.
Identity correct — the page foot prints `TF-800 (5/25)` and `Admin. R. 37.6`,
matching the recorded `REV-2025-05`.

The historical objection — `certDate` writing a filing date onto the
*"I certify on \_\_\_"* line inside the Certificate of Service — **is closed**.
The map now carries `{ field: "certDate", reason: "protected_category",
category: "service_block" }`, the artifact contains no ISO date on any page, and
pages 2 and 3 carry only the legitimate repeating case-number header. The
notarisation block, the service block and the page-3 judicial block are blank.

Open: `A-SOURCE-BYTES-ABSENT`. Would approve on `94bab525…` recomputing from
bytes, with no other change.

### AK:tf-805-form-en — correction_required

Cleanest of the four. 7 bindings, 7 single-widget fields, 7 drawn values — exact
agreement. Page 2 carries zero participant ink; the Certificate of Service, the
`Presiding Judge / Date` line and the clerk's distribution certificate are all
blank. The page-1 Verification block is untouched: Date, signature, `(SEAL)`,
`Court clerk, notary public…` and `My commission expires` all empty. The
historical `certDate` objection **is closed**.

Open: `A-SOURCE-BYTES-ABSENT`. Would approve on `96306d64…` recomputing from
bytes, with no other change.

### KY:aoc-334-form-en — correction_required (highest severity in this batch)

Four corrections, plus one owner decision.

1. **`A-KY334-UNDECLARED-WRITES`** — the map declares 5 bindings over 5
   single-widget fields, so 5 drawn values are expected. The artifact draws 7:
   `24-CR-001234` twice and `Jordan Avery Reyes` four times. The two undeclared
   draws land on **`Court`** — printing the case number directly beneath the
   correctly-filled `Case No.` line, so the case number appears twice in the
   caption box and the court's own identity slot carries a case number — and on
   **`Date`**, printing the participant's name on the rule captioned `Date`.
   Both fields are in the map's `unwritableFields` as class `manual`.
   *Smallest correction: re-render against the current map. The map is already
   right; only the bytes are stale.*

2. **`A-KY334-NAME-INTO-SEALING-ORDER`** — `Text1` (class **`unused`**) and
   `listed charges` are both bound to `participant.full_legal_name` off the same
   truncated label fragment, *"their custody regarding the above-named Defendant
   and above-"*. That slot is the court's list of agencies ordered to seal. The
   participant's name prints into it twice. `ESC-MANUAL-NOT-NEVER-WRITE` added
   the literal string `manual` to `NEVER_WRITE`; `unused` was never added, so the
   same defect survives verbatim under a different class name.
   *Smallest correction: write to participant classes only and refuse everything
   else by default, rather than denylisting one class name.*

3. **`A-KY334-STALE-RASTER`** — the visual proof records contact sheet
   `585d94fb…`; the contact sheet on disk is `deaffe86…`. The raster evidence is
   bound to a contact sheet that is not the current one. The same entry has
   `knownDifferentControl: null`, so its `differingPixelFraction` of 0.004237 is
   measured against no control. (The findings above were confirmed against the
   artifact's own page content, so this does not weaken them.)

4. **`A-KY334-IDENTITY-UNRECORDED`** — `REV-UNKNOWN` and a scraped body fragment
   for `officialTitle`, while the page header prints `AOC-334`, `Doc. Code: OVSR`,
   `Rev. 1-22`, *Order Voiding Conviction and Sealing Records*. Open since batch-1.

**Closed:** the batch-1 SSN finding. `Defendants ssn` is now refused as
`government_identifier` and the SSN rule is blank in the bytes and on the raster.

**Owner decision escalated (`A-KY334-OWNERSHIP`):** AOC-334 is a court order — it
recites *"Defendant's conviction is hereby void"*, ends *"So ORDERED this \_\_\_
day of"* over a Judge rule, and carries an agency CERTIFICATION block. The map
types it `participant_completed` with `captionOnly: false`. Whether the platform
prepares a court's own order at all is a product and counsel question, not a
rendering one. The verdict is `correction_required` rather than
`substantive_owner_decision_required` because the four defects above must be
fixed whichever way that question is decided.

### KY:aoc-496-3-form-en — correction_required

Field safety is the strongest in the batch: 61 refusals, 17 of them protected,
and 60 ordinally-named fields refusing `no_allowlisted_fact_matches`. Jail ID and
SSN are blank. Fail-closed is working as designed.

1. **`A-KY4963-COUNTY-DROPPED`** — the map declares 2 bindings and
   `populated-fields.json` lists both; the artifact draws exactly one value, the
   case number. `3 County Dropdown` never reaches the page, and
   `protected-fields-scan.json` records `writtenFields: 1` with `pass: true`.
   Open since batch-1, unchanged.
2. **`A-KY4963-IDENTITY-UNRECORDED`** — `REV-UNKNOWN` against a printed
   `Rev. 6-23`; `officialTitle` is the body fragment *"In support of this
   Application, the Defendant states as follows:"*. Open since batch-1.
3. **`A-SOURCE-BYTES-ABSENT`**.

Worth recording beside aoc-334: here the `Court` rule is correctly **blank**
while `Case No.` carries the case number. Two KY families, one binder,
disagreeing — further evidence that aoc-334's bytes are stale rather than its
map wrong.

## Cross-family findings

- **`A-X1-NO-RERENDER`** (all four) — every canonical artifact hash equals the
  pre-rerender hash. Corrected maps and uncorrected bytes coexist.
- **`A-X2-SCAN-DOES-NOT-COMPARE`** (both KY) — `protected-fields-scan.json`
  reports `pass: true` while counting 7 written against 5 bound (aoc-334) and 1
  written against 2 bound (aoc-496-3). It never compares the two numbers, so an
  undeclared write and a silent drop both pass. One reconciliation check catches
  both.
- **`A-X3-NEVER-WRITE-COVERS-ONLY-MANUAL`** (aoc-334) — denylisting one class
  name leaves the hole open to the next class name.
- **`A-X4-RASTER-COVERS-PAGE-1-ONLY`** (tf-800, tf-805, aoc-496-3) — the rendered
  evidence is a single 1342×930 PNG carrying page 1 and a sliver of page 2. For
  the AK families the certification line is exactly what the historical objection
  asked a reviewer to confirm blank, and it is below the crop. Both were verified
  blank from the artifact bytes instead. Recorded as a batch-level evidence gap,
  not a per-family correction.
- **`A-X5-APPROVAL-CHANNEL-ABSENT`** (all four) — no `overlay-profile.json` and no
  `independentReview` field on the field map, so an approval recorded here has no
  channel to the gate. Unchanged since batch-1.

## Structural blockers above any single form

1. **The source corpus is not mounted at this head.** `RCAP_BUNDLE_EXTRACT` is
   unset, `private/` does not exist, and a whole-filesystem search found no copy
   of any official source binary. The instruction's precondition of 499
   source-library files and 329 PDFs is **not met** — 0 and 0 were found. No
   family can complete source verification until this is fixed.
2. **No family was re-rendered.**
3. **No approval channel exists** for these four families.

## Base deviations recorded

- The instruction named branch `claude/rcap-pdf-independent-review-wave-a`. No
  such ref exists on the remote, and this session is bound by its harness to
  `claude/rcap-pdf-independent-review-a-qkff6d`. The designated branch was used
  and the deviation is recorded rather than silently resolved.
- Commit `ea1a16b6` was reachable only after fetching; it is the tip of
  `origin/claude/rcap-pdf-family-rerender-mounted` and is not an ancestor of
  `main`. The worktree was reset to it and was clean throughout.

## Artifact safety

All eight finalized PDFs across the four families are flattened and
active-content clean, established by parsing rather than byte-grep: no
`/AcroForm`, zero form fields, zero annotations, no `/OpenAction`, no additional
actions, no JavaScript name tree. The single raw `/JS` byte sequence in
KY aoc-496-3 lies inside a compressed image stream and is not an action. The
`Reset` and `Print` captions printed on KY aoc-334 are inherited static ink from
the source form — present in the blank panel too — not live widgets.

## What this record does not do

It does not edit, adopt, extend or restate the batch-1 record; it copies no
verdict forward; it approves nothing and promotes nothing; and it changed no
source binary, sidecar, artifact, map, classification, raster, register count,
retirement record, runtime, worker or implementation path.
