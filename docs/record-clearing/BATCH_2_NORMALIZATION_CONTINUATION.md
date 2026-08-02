# Batch 2 normalization — continuation state

Last updated: 1 August 2026
Branch: `feat/record-clearing-batch-2-legal-design`
Base: `e3f034b9c499fc6b6ec906dd82ef8e6599f8951f` (PR #87 platform base)
Last clean checkpoint: `2d787e7` — Batch 2 source-package import

## Done

- **B1** worktree `/workspaces/legalease-partner-dashboard-clean-batch-2`,
  branch cut from the exact base and pushed. Private corpus synced, untracked
  (`git ls-files private/` → 0).
- **B2** inputs verified: bundle 7/7 OK, source package 46/46 OK.
- **B3** source-package import complete. 39 files, 0 conflicts. Registries
  regenerated from the single canonical inventory. See
  `BATCH_2_SOURCE_IMPORT_RECORD.md` and `batch-2-source-gap-report.json`.

## Source-slot reconciliation baseline — done

`docs/record-clearing/batch-2-source-slot-reconciliation.json`

**136 source slots counted from the corpus, reconciling exactly with the
memorandum. Zero duplicates, zero dropped, zero extra.**

| | |
|---|---|
| Source slots | **136** |
| Split additions (IL +1, GA +2, KS +1) | **+4** |
| Projected normalized nodes | **140** |
| Non-relief nodes (IA, ME, MA, MD, MI) | **5** |
| Projected substantive relief mechanisms | **135** |

Per jurisdiction: GA 13, IL 16, IN 10, IA 7, KS 7, LA 10, MD 11, MI 11, MN 12,
MT 6, ME 6, MA 8, MS 9, MO 10.

Counting method: PART 1 relief-track headings. Indiana groups tracks 1–3 and
4–7 under combined headings and is expanded to individual slots. Lower-case
`Track N` headings in the custom-pleading and process-guidance specification
parts are cross-references, not slot definitions, and are excluded — counting
them inflates the total to 142.

140/135 is **derived** from the counsel-approved splits and reclassifications,
not hard-coded. The authoritative counts must still be generated from the
normalized corpus once memos exist.

**Use this file to check every memo on arrival**, so a dropped, extra or
duplicate source ID is caught at the first jurisdiction rather than after all
fourteen.

## Illinois — done

`data/record-clearing/legal-design-intake/IL.memo.json`

16 source slots → **17 normalized nodes**, all `relief_track`, all
runtime-disabled at `legal_review_pending`. 0 deferred. Strategies after the
packet-only re-review: `official_pdf_fill` 10, `process_guidance` 4,
`custom_pleading` 2, `composed` 1 (`il-prb-cert`, sequential, 2 units,
0 unresolved). 0 build blockers.

`il-immediate-seal` was reclassified from `process_guidance` to
`custom_pleading` with `localFormOverride: true` — a § 5.2(g) petition and
proposed order exist, and the courtroom constraint is a delivery restriction,
not an absent packet. `il-prb-cert` stage 1 stays guidance on the narrow ground
that no Prisoner Review Board application form has been sourced. See the
guidance re-review table in `BATCH_2_ADOPTION_CHANGELOG.md`.

Source Track P split into `il-prostitution-j-auto` and
`il-prostitution-j-vacate` under the counsel-approved crosswalk correction — see
the erratum in `BATCH_2_ADOPTION_CHANGELOG.md`. Cannabis Tracks N and O were
already separate and are unchanged; the statewide cannabis suite is mapped to
`il-cannabis-vacate` only.

### Batch 2 delta needs three arguments

The delta defaults to Batch 1. For a Batch 2 jurisdiction:

```bash
npm run rcap:legal-design-batch-delta -- \
  --batch=IL \
  --expected=/workspaces/legalease-legal-review-import/batch-2/expected/expected-track-ids.json
```

The `--expected=` override was added this pass, mirroring the script's existing
`--intake=`, `--out=` and `--approvals=` overrides. It defaults to the Batch 1
path, so a Batch 1 run is unchanged.

### ⚠️ Approving a composed unit rewrites the whole approvals file

`--approve-composed-units` **replaces** `legal-design-composed-unit-approvals.json`
with the composed tracks of the batch in that run. Running it with `--batch=IL`
alone would have silently deleted Batch 1's ten approvals. Always pass every
batch whose approvals must survive:

```bash
npm run rcap:legal-design-batch-delta -- \
  --batch=AL,AK,AZ,AR,CA,CO,CT,DC,DE,FL,HI,ID,IL \
  --expected=/workspaces/legalease-legal-review-import/batch-2/expected/expected-track-ids.json \
  --approve-composed-units
```

Then diff the file and confirm the pre-existing entries are byte-identical
before committing.

## Iowa — done

`data/record-clearing/legal-design-intake/IA.memo.json`

7 source slots → **7 normalized nodes**: 6 `relief_track` + 1
`supporting_action`. 0 deferred. Strategies: `official_pdf_fill` 5,
`composed` 1, `process_guidance` 1. 1 build blocker, 11 release blockers
across 7 tracks.

`ia-dci77` is the `supporting_action` the adopted memorandum directs: a
criminal-history check retrieves and verifies records and alters none, so it is
not a paid packet mechanism. Under the packet-only re-review it is nonetheless
*expected* to be packet-capable, because DCI-77 is a participant-completed
request carrying the participant's own release authorization signature. It is
held as guidance only because **no copy of DCI-77 has been sourced** — the same
fail-closed shape as the Illinois PRB gap.

`ia-9079`, deferred judgments, is modelled as a **composed alternative** rather
than one guidance route: the post-July-2013 branch is genuinely nothing-to-file,
while the pre-2013 branch does contemplate a participant application but has no
form, no rule and thin statutory mechanics, so that unit is unavailable and
carries the single Iowa build blocker.

Iowa's August 2024 Rule 2.86 Form 4 is mapped; the January 2021 revision stays
`historical_obsolete` and never runtime-selectable.

## Indiana — done

`data/record-clearing/legal-design-intake/IN.memo.json`

10 source slots → **10 normalized nodes**, all `relief_track`, 0 deferred.
Strategies: `official_pdf_fill` 6, `custom_pleading` 2, `process_guidance` 1,
`composed` 1. 1 build blocker, 17 release blockers across 10 tracks.

Combined headings in the review (Tracks 1–3 and 4–7) were expanded to
individual slots; lower-case cross-references in the pleading and guidance
specification sections were not counted.

`in_collateral_action` takes `custom_pleading` from the adopted memorandum,
which is controlling: the official-form label is not carried forward until the
actual statewide form is verified. `in_supplemental_order` is `custom_pleading`
because § 35-38-9-9(l) describes a petition on its face. `in_auto_expungement`
is the only standalone guidance route — § 35-38-9-1(b) expressly requires no
petition. `in_infraction_nondisclosure` is composed sequential: check whether
the court already acted, then a verified petition held unavailable pending the
form and MC case-type questions.

**Source gate:** the Coalition for Court Access **Section 5 conviction insert is
absent from the corpus**. Sections 2, 3 and 4 inserts are present. That is the
single Indiana build blocker and the conviction packet for
`in_conviction_serious_felony` cannot be completed without it.

## Group 1 source-completion correction — 2 August 2026

Ten official artifacts retrieved from the issuing agencies and imported with full
provenance. Corpus 557 → **567** expected artifacts; `form_candidate` 58 → 63,
`reference_only` 29 → 34.

| Jurisdiction | Change | Blocker effect |
|---|---|---|
| IL `il-prb-cert` | composed `sequential` → **`mixed`**, 2 → 5 units. Sealing and military certificate branches `official_pdf_fill` and available | build 0 → 0; only the non-military § 5.2(e-6) branch held |
| IA `ia-dci77` | `process_guidance` → **`official_pdf_fill`**, still `supporting_action` | missing-form blocker removed |
| IN `in_conviction_serious_felony` | `official_pdf_fill` → **`custom_pleading`**, `localFormOverride: true` | **build 1 → 0** |

**Group 1 build blockers: 2 → 1.** The only remaining one is the Iowa
pre-July-2013 `ia-9079` deferred-judgment application unit.

Two findings worth carrying forward:

- **There is no Indiana Section 5 insert to acquire.** The Coalition publishes
  inserts for Sections 2, 3 and 4 only. The corpus was already complete; the
  route needed a statutory custom pleading, not a form hunt.
- **Do not use the IPDC copy of I.C. 35-38-9.** It is labelled "Indiana Code
  2016" with amendment history ending at P.L.142-2015. Use the Office of Judicial
  Administration publication, updated 7/1/2026, now in the corpus.
- `iga.in.gov` is a JavaScript SPA and returns a 691-byte shell to every path;
  it cannot be scraped for statutory text.

## Group 1 complete — totals

| | IL | IA | IN | total |
|---|---|---|---|---|
| Source slots | 16 | 7 | 10 | **33** |
| Normalized nodes | 17 | 7 | 10 | **34** |
| `relief_track` | 17 | 6 | 10 | **33** |
| `supporting_action` | 0 | 1 | 0 | **1** |
| Deferred | 0 | 0 | 0 | **0** |
| Build blockers | 0 | 1 | 1 | **2** |

## Maryland — done

`data/record-clearing/legal-design-intake/MD.memo.json`

11 source slots → **11 nodes**: 10 `relief_track` + 1 `completed_or_verification`
(the DPSCS cannabis sweep, per the adopted memorandum). 0 deferred. Strategies:
`official_pdf_fill` 6, `process_guidance` 5. **0 build blockers**, 7 release
blockers across 6 tracks. Source-complete — the Batch 2 import already supplied
all five forms the review flagged as missing.

Three corrections to the source review, all recorded in the memo provenance:

- **`md_second_chance_shielding` is packet-capable.** The review recommended
  guidance-only; the adopted memorandum controls and directs
  `official_pdf_fill` on CC-DC-CR-148 with MDJ-008, treating the
  once-per-lifetime/one-court/one-county rules as scope and routing fields. The
  review's multi-court hard block is retained as the scope restriction.
- **`md_10103_legacy_police` is not composed.** The memorandum directs a staged
  official-form route, but § 10-103 requires the request within 8 years of an
  incident that must predate 1 October 2007, so the entry window closed no later
  than October 2015 and neither stage is reachable. A composed route requires at
  least one available unit, so it is `process_guidance` on a closed-window scope
  restriction. The memorandum's actual correction is preserved: DC-CR-071 is the
  **Maryland District Court** form, not a D.C. limitation.
- **`md_10104_pre_service` resolved from primary authority.** The review left it
  open ("full text not pulled"). § 10-104 empowers the **District Court** to
  order expungement on the State's nolle prosequi before service unless the State
  objects, and bars costs against the defendant. No participant filing exists, so
  `process_guidance` now rests on a precise ground.

## Massachusetts — done

`data/record-clearing/legal-design-intake/MA.memo.json`

8 source slots → **8 nodes**: 7 `relief_track` + 1 `local_variant` (the Boston
Municipal Court consolidated procedure, per the adopted memorandum). 0 deferred.
Strategies: `official_pdf_fill` 5, `process_guidance` 1, `composed` 1,
`custom_pleading` 1. **0 build blockers**, 4 release blockers across 4 tracks.

Two corrections to the source review, recorded with provenance:

- **Three of the four "staged or hybrid" tracks are not composed.** Tracks 4, 6
  and 8 stage a *product workflow*, not legally distinct units: the review's
  stage 2 is the participant's own narrative, which the product model permits
  through structured prompts, and stage 3 is filing and hearing attendance, a
  `post_generation_handoff`. Tracks 4 and 6 are single `official_pdf_fill`
  routes; Track 8 is a single `custom_pleading`. **Only Track 5 is genuinely
  composed** — the Commissioner of Probation certifies eligibility under
  §§ 100I/100J before the matter reaches a judge, so agency and court stages have
  different destinations.
- **Track 8 has no published BMC form.** The review left it unresolved; the
  adopted memorandum authorises the fallback directly, so it is `custom_pleading`
  with `localFormOverride: true` against the Standing Order's required contents,
  scope-restricted to three or more records across two or more BMC divisions.
  Recorded as a release blocker, not a build blocker.

`ma-autoseal` is the only retained guidance route, on a precise ground: § 100C ¶1
seals by operation of law and the sole participant-facing form, OCPS004, exists
only to **decline** the relief.

## Michigan — done

`data/record-clearing/legal-design-intake/MI.memo.json`

11 source slots → **11 nodes**: 10 `relief_track` + 1 `routing_node` (completed
deferrals, per the adopted memorandum). 0 deferred. Strategies:
`official_pdf_fill` 4, `process_guidance` 7. **0 build blockers**, 10 release
blockers across 6 tracks. No composed tracks.

Two corrections to the source review, recorded with provenance:

- **`mi_setaside_trafficking` is packet-capable.** The review classified it
  `process_guidance` with attorney handoff; the adopted memorandum controls and
  directs `official_pdf_fill` on MC 227b. LegalEase completes neutral
  identifiers, conviction data and contact information and formats the
  participant's own factual statement; attorney review is a *packet instruction*
  that expressly creates no upload, staff-review, proof-of-review or generation
  gate.
- **Four "missing" forms are already in the corpus.** The review's section 2.8
  lists MC 227a, MC 227b, MC 228 and MC 262 as missing and marks their currency
  a **build blocker** (open question 8). The Batch 2 import supplied all four —
  MC 227a and MC 227b at rev 07/2024, MC 228 at rev 03/2023, MC 262 at rev
  06/2019. This unblocks the marihuana route, which the review calls "the single
  best relief in Michigan" while noting "we do not have the form." Only RI-008
  remains unavailable, and that is inherent: it is taken in person.

Seven guidance routes retained, each on a precise ground rather than a
conclusory one — the three automatic set-aside routes and the two
biometric-destruction routes have no participant-facing submission at all; the
pre-2015 CSC-4 route is an express product-scope decision, not a legal gap; and
the deferral node is a `routing_node` whose court record is already nonpublic.

**No participant-facing MSP record-correction form exists.** The challenge
process runs by telephone or email to Michigan State Police and corrections must
be routed to the reporting agency, so no correction packet or supporting-action
node is asserted.

## Not started

**B4–B9 legal-design normalization of the remaining eleven jurisdictions.**

`GA KS LA ME MD MA MI MN MS MO MT` — **3 of 14 normalized** (IL, IA, IN).

Committed bounded groups (operational only; does not change legal precedence):

| # | Group | Slots | Status |
|---|---|---|---|
| 1 | **Illinois, Iowa and Indiana all done** | 16 + 7 + 10 = 33 | **complete** |
| 2 | **Maryland, Massachusetts and Michigan done**, Minnesota | 11 + 8 + 11 + 12 = 42 | **3 of 4** |
| 3 | Georgia, Kansas, Louisiana, Maine | 13 + 7 + 10 + 6 = 36 | not started |
| 4 | Mississippi, Missouri, Montana | 9 + 10 + 6 = 25 | not started |

### Measured size of Group 1, for the next session's planning

| Jurisdiction | Review source | Slots | Projected memo |
|---|---|---|---|
| Illinois | 692 lines / 10,756 words | 16 (+1 split = 17 nodes) | ~135 KB |
| Iowa | 537 lines / 8,094 words | 7 | ~55 KB |
| Indiana | 350 lines / 6,214 words | 10 | ~80 KB |

Batch 1 memos average roughly 8 KB of validated JSON per track (Alabama: 11
tracks, 88 KB). Budget accordingly: a single jurisdiction is a substantial
authoring pass, and the schema rejects an incomplete memo outright rather than
importing it partially. **Author one jurisdiction per pass and commit it before
starting the next.**

### What authoring a memo requires

Each `<CODE>.memo.json` must carry **all eighteen** required elements per
proposed relief track. A memo missing any one is *rejected*, not partially
imported — see `data/record-clearing/legal-design-intake/README.md`. Limitations
are classified objects, not strings; unresolved questions carry an `impact` and
an `affectedElement`; guidance tracks carry `guidanceRationales`. Batch 1 memos
run 60–168 KB each.

Do not infer legal substance. Where the controlling sources do not answer a
substantive question, preserve the exact statement, create one precise counsel
question, classify its impact only where the source supports it, and keep the
affected unit disabled.

Per group: exact source-slot reconciliation → report-only intake → strict
intake → Batch 2 delta → composed-unit approvals guard → focused verifier →
clean commit and push.

## Inputs, already staged and verified

`/workspaces/legalease-legal-review-import/batch-2/`

- `LegalEase_Batch_2_Legal_Research_Resolution_Memo_ADOPTED.md` — controlling
  where it expressly changes track structure, output strategy, packet
  capability, blocker treatment, product scope, geography, or supporting-document
  treatment. Otherwise the original jurisdiction review controls.
- `LEGALEASE_BATCH_2_COMBINED_SOURCE.md` — original jurisdiction reviews.
- `LEGALEASE_BATCH_2_STATE_SUMMARY.csv`
- `extracted/review-clean/` — 14 per-jurisdiction review files.
- `extracted/missing-forms-v3/` — the imported source package.

## Carry-forward rules for the next session

- 136 source slots; ~140 normalized nodes and ~135 substantive relief mechanisms
  expected. **Generate actual counts from the corpus — these are expectations,
  not constants.**
- Georgia correction is controlling: `GA-FO-SENTENCING-POST2026`,
  `GA-FO-ACTIVE-PRE2026`, `GA-FO-DISCHARGED-PRE2026`; `GA-RFO` separate and
  unchanged. L-2 and L-3 are notice-based, no prosecutor consent, not
  opposition/hearing branches. `GA-RFO` under § 42-8-66 requires advance
  prosecuting-attorney consent. **No old-M-to-new-L mapping.**
- Renderer strategies are only `custom_pleading`, `official_pdf_fill`,
  `process_guidance`. Sequential/alternative/mixed are composition modes.
- Import when mechanism and packet identity are known, even with a missing form,
  unverified revision, open fee/service rule or pending output approval — keep
  those as source/build/release gates and the route runtime-disabled.
- Defer under `legal_research_required` only for the six listed unresolved
  questions. A deferred item gets no invented strategy.
- Do not infer legal substance. Preserve exact source statements and raise one
  precise counsel question.
- Georgia and Mississippi received zero source files; absent forms are **open
  source questions**, not "not required".

## Invariants that must still hold at every checkpoint

Batch 1 unchanged · every imported Batch 2 route `runtime_disabled` · every
deferred route unregistered and unreachable · zero Batch 2 tracks
`packet_ready` · zero jurisdictions enabled · launch gate red · PR #87 and #89
unmerged · #89 draft · Phase 48 unapplied · nothing deployed · no Batch 1
promotion branch · no Batch 2 PR to main before #87 merges with a merge commit.

## Platform lane status — for awareness only, do not act on it here

R7 is resolved and committed on the held Phase 48 branch, `e5a0d46`:
artifact identity is now `unique (document_packet_id, component_id)`, with
`kind` retained as coarse non-unique metadata so several `court` artifacts may
coexist in one packet. PR #89 remains a held draft and Phase 48 remains
unapplied.

Still not started on the platform lane: canonical write-path rewiring,
component-to-artifact application mapping, download-route identity, the
`packets/store` production treatment, correcting the repository that references
`rcap_packet_fulfillments` and `rcap_packet_artifacts`, and the database-backed
acceptance proof.

## Out of scope for this branch

The platform storage-unification correction belongs on the PR #87 platform-core
lane. **Do not edit platform storage code or the Phase 48 migration here.**
