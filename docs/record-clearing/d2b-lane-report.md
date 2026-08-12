# D2B — New Jersey, Florida, Louisiana and New Mexico

Lane D2B established four state families from scratch. None of them had a
package root at the D0 base: `data/rcap-all50/overlays/production/` held only
the nine D1 states, so there were no prior source records, no prior field maps
and no entries in the shared indexes to regenerate. This is a first build.

Everything here is built on the remediated D0 factory
(`docs/record-clearing/d0-official-form-factory.md`), driven from
`scripts/rcap-official-forms/lanes/d2b-regenerate.mjs`. The D0 canary was run
before any state work and passed 107 checks. No shared factory module was
modified.

## What was built

| | families | acroform | overlay | fields read | blanks measured | bound | refused |
| --- | --- | --- | --- | --- | --- | --- | --- |
| New Jersey | 2 | 1 | 1 | 179 | 1 | 5 | 175 |
| Florida | 5 | 2 | 3 | 155 | 90 | 22 | 223 |
| Louisiana | 6 | 0 | 6 | 0 | 518 | 3 | 515 |
| New Mexico | 18 | 1 | 17 | 158 | 958 | 50 | 1,066 |
| **total** | **31** | **4** | **27** | **492** | **1,567** | **80** | **1,979** |

All 31 sources resolved by exact sha256 against their state's
`STATE_MANIFEST.csv`, and all 31 matched. Byte lengths and page counts matched
too. Every binary was then opened and read: the census is the document's own
field list, never the manifest's claim about it. Two disagreed — NJ CN-10557
declares 269 fields and carries 179, NM 4-222 declares 161 and carries 158 —
and both are recorded as findings rather than reconciled away.

## The second gate, and why it exists

D0's typed binder is fail-closed about categories. Every field starts protected
and becomes writable only by passing six tests, and it correctly refused money,
race, agency, court, clerk, prosecutor, attorney, signature, notary, service and
outside-party fields across all four states without help.

What it cannot do — because it reads field names rather than documents — is
decide *which* participant fact a writable field carries. On these four states
that gap is load-bearing:

- **NJ CN-10557** names its service-recipient blocks `ProsAddr2`, `ProbAddr2`,
  `WardenAddr2`, `SuperintendentAddr2`, `MuniCrtsAddr2` and `SccAddr2`. None of
  those names contains a token any protect rule matches, so the generic binder
  offered to write the participant's own street address into the prosecutor's,
  the warden's and the probation department's service blocks.
- The same form's `DefAddrSt`, `DefAddrStr`, `DefBirthDt`, `ExpungeCntyName`,
  `ProsCntyName` and `FamDivName` all bind `participant.full_legal_name`,
  because that descriptor's `\bdef\b` and `\bname\b` alternatives are reached
  before the more specific state, street, date-of-birth and county descriptors.
- **FL Duval** repeats one caption case number across six sub-forms as
  `CASE NO`, `CASE NO_2` … `CASE NO_6`. The trailing suffix reads as a charge
  row index, so the affidavit would have received charge 2's case number.
- **FL Duval** also offers the four `DONE AND ORDERED in Chambers at
  Jacksonville, Duval County, Florida this ___` fields as `matter.county`.
  Those are the judge's own dating blanks.
- **NM 4-952** offers `Court of Appeals case number(s)` and `Supreme Court case
  number(s)` as `matter.case_number` — the trial court's number stated to a
  court as the appellate one — and `Name of offense and statute/ordinance
  number` as the participant's name.
- **The NM DPS release** prints `STATE OF ____ COUNTY OF ____` in its notary
  jurat. The county blank matched the caption county rule until the rule was
  narrowed to require the first blank on its line.

So every write in this lane passes two gates. D0 decides first and is never
bypassed or weakened, then the write must also appear in the lane's reviewed
mapping table naming the exact fact it carries. The table can only subtract:
80 writes survived both gates out of the several hundred D0 alone would have
allowed. Each refusal is recorded with its reason in the family's
`field-classification-policy.json` and `production-field-map.json` /
`overlay-profile.json`, so a reviewer sees a decision rather than an absence.

`explicitMappings` — D0's sanctioned escape hatch — was not needed in this lane.
It confirms a descriptor D0 already chose and cannot redirect one, so the
descriptor collisions above are reported to the factory owner rather than worked
around here. See `docs/record-clearing/d2b-factory-findings.md`.

## Flat forms

Twenty-seven of the 31 binaries are flat, so there is nothing to fill and
nothing to interrogate for geometry. Anchors are measured from each document's
own page content stream: a contiguous run of underscore glyphs is a printed
rule, and a contiguous run of drawn space glyphs wide enough to be a fill area
is a gap. 1,567 blanks were found this way. No coordinate is inferred.

Labels are read *immediately* either side of each blank rather than from the
whole line, which is what keeps `City: ___ State: ___ Zip Code: ___` from
looking like three city blanks. A protect rule matching either side refuses the
blank before any reviewed rule is consulted.

Two shapes defeat this honestly and are reported as such:

- **The three FDLE applications** draw their blanks as table cells in the
  graphics stream rather than as text. Their labels are column headers with no
  measurable rule beneath them, so none of the 90 blanks measured on them binds.
- **Louisiana Article 984** draws no blanks at all; it is controlling statutory
  requirements rather than a form.

## Evidence

- **57 finalized PDFs** — canonical, boundary and negative fixtures for each of
  the 19 renderable families. Each is the artifact a participant would file:
  values materialized into appearances, flattened into page content, sanitized
  of active content and rebuilt from its flattened pages so orphaned objects are
  left behind. No residue survived in any of them.
- **19 contact sheets**, each built from the finalized artifact rather than an
  intermediate, each refusing to exist unless its expected values are provably
  visible in it. All 19 passed, and the proof is re-run against the artifact on
  disk so the package's own claim is checkable without re-rendering. All 80
  written values are visible in the finalized artifacts and absent from the
  untouched sources, so the blank and filled panels provably differ.
- **Determinism** — every renderable family was rendered twice and produced
  identical bytes.
- **The negative fixture wrote nothing** in all 19 families.
- **44 unfittable values** were refused rather than drawn below the 6pt floor,
  and reported with the width they would have needed.
- **Placement** — every pair of write boxes on a page was compared for
  intersection and no fact is drawn twice on one page. This caught a real defect
  during the build: a write box sized at 1.25× the font reached into the line
  above on the tightly-led San Juan packet. Box height is now capped by the
  measured distance to the baseline above.
- **147 mutations, all refused.** Each removes one guarantee from the inputs —
  never from a shared module — and confirms the pipeline refuses: perturbed
  source bytes, an injected non-filing notice, the contact sheet fed the
  unfilled source in place of the finalized artifact, a protected field named
  through `explicitMappings`, an unindexed charge row, and an oversized value
  against the readable floor.

## Holds

258 holds are carried forward across the 31 families, none of them cleared.
Every family carries `state_manifest_generation_allowed_no`,
`edition_1_runtime_disabled`, `state_runtime_disabled`,
`legal_review_mapping:requires_track-level import mapping` and
`f_independent_visual_review_required`. Thirteen families are source-gated and
carry `source_gated_never_runtime_selectable`.

**Florida's STATE_README reports no state legal-design review.** That is a
release blocker, it is carried on all five Florida families, and it is not
cleared by the fact that the Duval and St. Johns packets render cleanly. No
held form became a sellable route in this lane.

No source in this lane states `DO NOT COMPLETE THIS FORM FOR FILING`. The
refusal path is exercised by the mutation suite on every family regardless.

## State-pack fidelity

32 fidelity findings. The compiled Florida profile carries no PDF form inventory
at all and Louisiana's `formInventory` is empty, so every Edition 1 binary in
those states is new to its profile. New Mexico's profile records five PDFs whose
sha256 appears nowhere in the Edition 1 manifest, and three that match. Edition 1
is the identity authority in every case; no profile was edited — they are
read-only to this lane.

## Indexes

This lane writes `state-index.json` under each of its four state directories and
does **not** write `verified-binary-index.json` or `implementation-index.json`.
Seven lanes ran concurrently against those two shared files and would have
collided. Each `state-index.json` carries its merge target and the entries the
captain should fold in at import.

## Status

`implementation_complete_pending_independent_review`.

Not technically approved, not a track terminal, not production ready, not live.
This lane does not approve its own output.
