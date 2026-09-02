# Codespace 2 — Lean Captain dispatch after e3f9952

Each section below is one independent, ready-to-paste worker prompt. Run each in
its own Codespace 2 worktree. Do not run any worker in the Captain checkout.
The minimum dispatch commit is
`84218d2dae40d561591a65ae382adbe658c53fb0`.

## Prompt 1 — VF29 Mississippi and composed-route verification

You are `CODEX-CS2-VF29`, an independent verification worker. Work only on
branch `codex/cs2-vf29` in a new worktree `/workspaces/cs2vf29`, based on
`origin/claude/legalease-sprint-captain-utucnw`. Require commit
`84218d2dae40d561591a65ae382adbe658c53fb0` as an ancestor. Stop if the target
worktree or branch has unexplained changes. Never work in the Captain checkout,
force-push, merge to Captain or main, open a PR, or touch Production.

Verify exactly these seven `VERIFY_PENDING` families:

- `composed-treatment:obligation:runtime-only:MS:intervention-court-dismissal-only-nonconviction-expungement-99-19-71-4`
- `composed-treatment:obligation:runtime-only:MS:nonadjudication-under-99-15-26`
- `composed-treatment:obligation:runtime-only:MS:uncharged-misdemeanor-immediate-dismissal-branch-99-15-59`
- `composed-treatment:obligation:runtime-only:MS:uncharged-or-unprosecuted-misdemeanor-after-12-months-99-15-59`
- `rcap-ms-custom-pleading`
- `rcap-nv-custom-pleading`
- `rcap-ok-custom-pleading`

Before reading a family's artifacts, require this to succeed:

`node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF29 '<familyId>'`

A refusal is `BLOCKED_BEFORE_CLAIM` for that row; do not read it. Do not release
claims; only Captain changes the central ledger.

For every claimed family independently measure all fifteen obligations by these
exact names: `ROUTE_IDENTITY`, `SOURCE_IDENTITY`, `COMPONENT_SET`,
`KNOWN_PREFILLS`, `REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`, `REPEATING_ROWS`,
`PROTECTED_FIELDS`, `ARTIFACTS`, `PAGE_ORDER`, `CLIPPING_AND_OVERLAP`,
`FILING_DESTINATION`, `FEE_AND_WAIVER`, `SERVICE`, `SELF_HELP_STOP`.

Read the actual canonical and boundary PDFs and current rasters. Recompute
artifact and source hashes. Explicitly measure clipping and overlap; do not infer
visual approval. A `PASS_COMPLETE_INDEPENDENT` requires all fifteen measured and
all nine completeness counters independently zero. Otherwise return exactly
`FAIL_REPAIR_REQUIRED`, `BLOCKED_SOURCE`, or `BLOCKED_LEGAL_INPUT`, with exact
evidence. Do not edit or repair any packet, build script, source, central record,
queue, assignment, route, or ledger.

Write only:

- `data/rcap-grade-a/packet-factory-24h/vf29/rows.json`
- `data/rcap-grade-a/packet-factory-24h/vf29/repair-assignments.json`

Run the focused completeness verifier once per family. Validate both JSON files,
run `git diff --check`, stage only those two exact files, commit, and push
`codex/cs2-vf29` normally. Report the commit, seven row outcomes, fifteen
obligations measured per row, overlay directories modified `0`, claims released
`0`, routes opened `0`, and `Production touched: NO`.

## Prompt 2 — VF30 official-form verification

You are `CODEX-CS2-VF30`, an independent verification worker. Work only on
branch `codex/cs2-vf30` in `/workspaces/cs2vf30`, based on the canonical Captain
branch and containing dispatch commit
`84218d2dae40d561591a65ae382adbe658c53fb0`. Stop on dirty or unexplained state.
Never work in the Captain checkout, force-push, merge to Captain or main, open a
PR, or touch Production.

Verify exactly:

- `ar-cs-possession-seal-set`
- `ca-prop64-set`
- `id_isp_expungement-set`
- `nd-nonconviction-close-petition-set`
- `nj_arrest_no_conviction-set`
- `oh_marijuana_expungement-set`
- `pa_pardon_expungement-set`

Assert each family before reading it with
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF30 '<familyId>'`.
Do not release claims. A failed assertion is a row-level
`BLOCKED_BEFORE_CLAIM` and prohibits reading that family.

Independently measure the actual participant bytes, source bytes, current
rasters, field map, instructions, and manifests against all fifteen exact
obligations: `ROUTE_IDENTITY`, `SOURCE_IDENTITY`, `COMPONENT_SET`,
`KNOWN_PREFILLS`, `REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`, `REPEATING_ROWS`,
`PROTECTED_FIELDS`, `ARTIFACTS`, `PAGE_ORDER`, `CLIPPING_AND_OVERLAP`,
`FILING_DESTINATION`, `FEE_AND_WAIVER`, `SERVICE`, `SELF_HELP_STOP`.
Explicitly measure clipping and overlap. Do not infer visual approval. A pass
requires every obligation measured plus all nine counters independently zero.
You did not build these and may not repair them.

Write only `data/rcap-grade-a/packet-factory-24h/vf30/rows.json` and
`data/rcap-grade-a/packet-factory-24h/vf30/repair-assignments.json`. Do not edit
overlays, build scripts, sources, central state, routes, or the ledger. Run only
the family-focused completeness checks. Validate JSON, run `git diff --check`,
stage the two exact return files, commit, push `codex/cs2-vf30`, and report the
commit and exact verdict totals; claims released `0`, routes opened `0`,
Production touched `NO`.

## Prompt 3 — VF31 western official-form verification

You are `CODEX-CS2-VF31`, an independent verification worker. Create/use only
`/workspaces/cs2vf31` on branch `codex/cs2-vf31`, based on the canonical Captain
branch with dispatch commit `84218d2dae40d561591a65ae382adbe658c53fb0` as an
ancestor. Stop on dirty or unexplained state. Do not use the Captain checkout.

Verify exactly:

- `tx_exp_acquittal-set`
- `ut_pet_acquittal-set`
- `ut_pet_dismissed_with_prejudice-set`
- `ut_pet_no_charges-set`
- `vt_exp_decriminalized-set`
- `vt_seal_nonconviction-set`
- `wv_conv_multiple_misdemeanors-set`

Before reading each family, require
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF31 '<familyId>'`.
Do not release claims. Measure, do not edit. Read canonical and boundary output
bytes and rasters, recompute hashes, and independently score all exact
obligations: `ROUTE_IDENTITY`, `SOURCE_IDENTITY`, `COMPONENT_SET`,
`KNOWN_PREFILLS`, `REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`, `REPEATING_ROWS`,
`PROTECTED_FIELDS`, `ARTIFACTS`, `PAGE_ORDER`, `CLIPPING_AND_OVERLAP`,
`FILING_DESTINATION`, `FEE_AND_WAIVER`, `SERVICE`, `SELF_HELP_STOP`.

`CLIPPING_AND_OVERLAP` must be measured from bytes/rasters, not inferred.
`PASS_COMPLETE_INDEPENDENT` requires all fifteen measured and all nine counters
zero. Record exact evidence for every failure or block. Never repair your own
finding.

Write only `data/rcap-grade-a/packet-factory-24h/vf31/rows.json` and
`data/rcap-grade-a/packet-factory-24h/vf31/repair-assignments.json`. Validate,
run focused family checks and `git diff --check`, commit only those files, push
`codex/cs2-vf31` normally, and report commit and outcomes. No force push, PR,
Captain/main merge, route opening, ledger edit, or Production access.

## Prompt 4 — VF32 composed and agency-route verification

You are `CODEX-CS2-VF32`, an independent verification worker. Work in a new
`/workspaces/cs2vf32` worktree on `codex/cs2-vf32`, based on the canonical
Captain with `84218d2dae40d561591a65ae382adbe658c53fb0` in its ancestry. Stop on
dirty or unexplained state; do not work in the Captain checkout.

Verify exactly:

- `agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission`
- `az_wrongful_arrest_clearance-set`
- `composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement`
- `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708`
- `rcap-oh-custom-pleading-clean-tracks`
- `rcap-tx-custom-pleading`
- `rcap-wa-custom-pleading-clean-tracks`

Assert each row before reading:
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF32 '<familyId>'`.
Do not release claims. Read the delivered artifacts and independently measure
all fifteen exact obligations: `ROUTE_IDENTITY`, `SOURCE_IDENTITY`,
`COMPONENT_SET`, `KNOWN_PREFILLS`, `REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`,
`REPEATING_ROWS`, `PROTECTED_FIELDS`, `ARTIFACTS`, `PAGE_ORDER`,
`CLIPPING_AND_OVERLAP`, `FILING_DESTINATION`, `FEE_AND_WAIVER`, `SERVICE`,
`SELF_HELP_STOP`. Explicitly measure clipping and overlap. No unmeasured item may
pass; all nine counters must be independently zero. Do not edit packet content
or repair a finding.

Write only `data/rcap-grade-a/packet-factory-24h/vf32/rows.json` and
`data/rcap-grade-a/packet-factory-24h/vf32/repair-assignments.json`. Run focused
checks only, validate JSON, run `git diff --check`, stage exact return files,
commit, and push `codex/cs2-vf32`. Do not modify central state, the ledger,
routes, Captain/main, PR #219, or Production.

## Prompt 5 — FIX12 western official-form repair

You are `CODEX-CS2-FIX12`, a focused repair worker. Work only in
`/workspaces/cs2fix12` on branch `codex/cs2-fix12`, based on the canonical
Captain with dispatch commit `84218d2dae40d561591a65ae382adbe658c53fb0` as an
ancestor. Stop on dirty or unexplained state. Do not use the Captain checkout.

Assert every family before reading or changing it:
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX12 '<familyId>'`.
Do not release claims; Captain owns the ledger. Repair only the defects below.
Do no new legal research, adjacent cleanup, refactor, architecture work, source
change, route change, or unrelated review fix.

1. `az_marijuana_expungement_arrest_no_charges-set` — `SELF_HELP_STOP`.
   `participant-instructions.md` has no self-help-stop section. It omits 11 of
   the route's 13 recorded conditions, including prosecuting-agency opposition,
   a court-set hearing, immigration consequences, and conduct on/after July 12,
   2021. Repair only that participant instruction from the committed track
   registry. Current artifacts: canonical
   `6dad189b1cdb575dfc7ef7e0647c077440cd4e331a7e2bf389a522773099c5d3`;
   boundary `8f041f1d4fd898a176746d1dd5aed7b5967c20b51b14609b7529b6056f9646a5`.

2. `ca-1203-41-set` — `SERVICE`, `SELF_HELP_STOP`. The packet includes CR-106
   but tells the participant that who/how to serve is unknown. Correct that
   contradiction only from held records. Its instructions omit all six recorded
   stops, including prosecutor opposition, contested hearing, non-citizen
   immigration posture, serious/violent/registerable offenses, and a showing
   requiring argument. Primary CR-180 hashes: canonical
   `87899cabff3d6c6c960d922c1baa88271a89d3aafde33d393f637eb92519f971`;
   boundary `ff1177fde3dcc417fb9d1618828cd6a46690f3d6fbf5b4e60f3e0c77c39ae037`.

3. `ca-1203-42-set` — `REQUIRED_BEFORE_FILING`, `SELF_HELP_STOP`. On MC-031
   page 1, `NoticeHeader1` and `NoticeFooter1` are read-only `/Ff 4097` viewer
   notices but are listed as participant filing blanks. Seven `FillText*` rows
   and both notice rows expose internal field names instead of printed captions.
   Classify the notice controls `NOT_A_FILING_FACT`, use the existing measured
   captions for the real fields, and add the five recorded route stops. Primary
   hashes: canonical
   `0547db60c97d5549ddb78c13c6ec637a5f01673684b412f03b19d8006311194d`;
   boundary `541b58c83e96d41ffe549df40e394914ba8530282d3c1690532007ac34cb8bdf`.

4. `ca-1203-43-set` — `SELF_HELP_STOP`. Add only the four held stop conditions:
   non-citizen/immigration posture routes to counsel, prosecutor opposition,
   contested hearing, and inability to establish program completion/dismissal.
   Primary hashes: canonical
   `6f811f3fb3bb95da3bc85ed771ca9ea140ad03d76091a69110ae77d8269e66fe`;
   boundary `b3e72daa4d9fe48d21d0b0baf8a266da4111c6710ebe4acb924cdb6f38ed248e`.

5. `ca-1203-4a-set` — `REQUIRED_BEFORE_FILING`, `SELF_HELP_STOP`. Apply the
   same exact MC-031 page-1 viewer-control/caption repair as 1203.42. Add only
   the five held stops: opposition, contested hearing, discretionary argument,
   non-citizen posture, and inability to establish that probation was not
   granted. Primary hashes: canonical
   `9402db025221368d7bcc6705f8243aa358760fe2a59926bd72c16a1d98f69a5b`;
   boundary `290d86703effd616724299f039e81ec5103a27de8d94c4eecee4d926f926dc65`.

6. `ca-851-91-set` — current defect is only `REQUIRED_BEFORE_FILING`. Apply the
   exact MC-031 page-1 viewer-control/caption repair; do not reopen superseded
   findings. CR-409 hashes are canonical
   `371d8890ba43c6b6036d725ab2ef6cfa418bb7b3b78847b943804211662c7502`
   and boundary
   `89d6a489f5ba01bdaa34a3968e7f7d7aec83590580343eee80782b08e43bfa6c`.

Shared unchanged companion hashes where present: CR-181
`f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504`,
CR-106 `f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a`,
MC-031 `defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075`,
and CR-410
`d94bd94bad3da9d05d71b1b154a440db1864b9441e2972c84b7854e1538604f9`.
Before editing, recompute every artifact hash and require agreement with each
family's `reports/rendered-artifacts.json`.

Writable paths are exactly:

- `data/rcap-all50/overlays/census-v1/az/az-marijuana-expungement-arrest-no-charges-set--official-pdf-fill/**`
- `scripts/build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-41-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-41-set.mjs`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-42-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-42-set.mjs`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-43-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-43-set.mjs`
- `data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-1203-4a-set.mjs`
- `data/rcap-all50/overlays/census-v1/ca/ca-851-91-set--official-pdf-fill/**`
- `scripts/build-census-v1-ca-851-91-set.mjs`
- `data/rcap-grade-a/codex-cloud/fix12-west-official-form-repair/**`

Prohibited paths are `data/rcap-grade-a/packet-factory-24h/**`, every other
`data/rcap-all50/overlays/census-v1/**` family, every other
`scripts/build-census-v1-*.mjs`, `src/lib/rcap/**`, `private/**` except read-only
source access, and all source records/bodies, route runtime, Captain/main, PR
#219, and Production.

Rebuild only affected families. Compare pre/post hashes. Reraster only changed
bytes and preserve byte-identical receipts. Run focused family checks. Write a
return under `data/rcap-grade-a/codex-cloud/fix12-west-official-form-repair/**`
with old/new hashes, exact files changed, focused check results, and the required
next verifier (not this worker). Validate JSON, `git diff --check`, stage only
the enumerated family paths/scripts and return path, commit, push
`codex/cs2-fix12`, and report. Do not self-verify or award a pass.

## Prompt 6 — FIX13 participant-instruction repair

You are `CODEX-CS2-FIX13`, a focused repair worker. Work only in
`/workspaces/cs2fix13` on `codex/cs2-fix13`, from the canonical Captain with
dispatch commit `84218d2dae40d561591a65ae382adbe658c53fb0`. Stop on dirty or
unexplained state. Assert each family with
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert FIX13 '<familyId>'`
before reading it. Do not release claims.

Repair only these measured defects:

1. `nj_disorderly_persons-set`: `KNOWN_PREFILLS`, `REQUIRED_BEFORE_FILING`,
   `FILING_DESTINATION`, `FEE_AND_WAIVER`, `SERVICE`, `SELF_HELP_STOP`.
   `ExpungeCntyName` is held but blank on pages 18, 27, 30 and 40; disclose or
   write it consistently. `arrest3Statute`, `arrest4Statute`, and
   `arrest5Statute` are participant arrest-table cells misclassified as
   signature/date fields. Instructions omit the held Superior Court/eCourts
   destination, no-court-fee treatment plus SBI record charge, service on the
   prosecutor/AG/State Police/courts/arresting agency/probation/municipal court,
   and all 29 held self-help stops. Current PDFs: canonical
   `343407a30f38beffccde4c51b8060065bd6eed27356a999d8e321e01a1baca33`;
   boundary `6256ba7f621c25a8f8a501c0a9af0191c151074fc8d3b2bb6ff2ef36354788ea`.

2. `sd_arrest_expungement-set`: `REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`,
   `FEE_AND_WAIVER`, `SELF_HELP_STOP`. Instructions omit obtaining dismissal/
   acquittal/no-accusatory-instrument proof, checking the entire-case result
   against the docket, checking the number of arrests against criminal history,
   and indigency waiver. Packet page 3 selects the no-accusatory-instrument basis
   while instructions say no basis was chosen; make the disclosure truthful
   without changing the selected route. State the held $72 fee and indigency
   waiver. Carry all ten held stops rather than four. Current PDFs: canonical
   `627e6502e0340f5d6d75ae855314cad53160d92acab710a1d43add2341dbe47d`;
   boundary `79b2e9ac4ca0cfadba32a9896f39fe82ae7d0dc543d3a7a42d2a338bf318a8ed`.

3. `ut_pet_dismissed_without_prejudice-set`: current defect is only
   `REQUIRED_BEFORE_FILING`. In `production-field-map.json`, packet page 18
   `UT-BCI-EXP-APPLICATION` field `MAILING ADDRESS` is both written and refused
   as required, and `1020EX` field `Email` is both written and refused optional.
   The PDF and participant instructions are already correct; remove only these
   contradictory field-map dispositions. Current PDFs: canonical
   `c29dec5d606bdb248e7f00f07a76eb0d846b5fa1896bac7b711e08283fe93952`;
   boundary `682f7b6d42bcc670d936e14d637ed9dfff3854f56a3c6f9e1684f2d43f86cdf7`.

4. `wa_vac_homicide_victim_prostitution-set`: current defect is only
   `SELF_HELP_STOP`. Its instruction section does not carry all four exact held
   conditions: applicant is not a qualifying family member, conviction may not
   be RCW 9A.88.030 prostitution, the person is living (use survivor routes),
   or applicant is distressed and needs a person rather than a packet. Repair
   only that section. Current PDFs: CRRLJ 09.0100 canonical
   `846360e75578ce6233dba77b03b25545a529b50cd553ad31f88d3008b429a6ad`,
   boundary `75fac347051d6b710015ef5bbcc10b43df0a1de59078195ede75a744f4c42b77`;
   CRRLJ 09.0200 canonical
   `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7`,
   boundary `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55`.

Writable paths are exactly:

- `data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill/**`
- `scripts/build-census-v1-nj_disorderly_persons-set.mjs`
- `data/rcap-all50/overlays/census-v1/sd/sd-arrest-expungement-set--official-pdf-fill/**`
- `scripts/build-census-v1-sd_arrest_expungement-set.mjs`
- `data/rcap-all50/overlays/census-v1/ut/ut-pet-dismissed-without-prejudice-set--official-pdf-fill/**`
- `scripts/build-census-v1-ut_pet_dismissed_without_prejudice-set.mjs`
- `data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill/**`
- `scripts/build-census-v1-wa_vac_homicide_victim_prostitution-set.mjs`
- `data/rcap-grade-a/codex-cloud/fix13-participant-instruction-repair/**`

Prohibited paths are `data/rcap-grade-a/packet-factory-24h/**`, every other
`data/rcap-all50/overlays/census-v1/**` family, every other
`scripts/build-census-v1-*.mjs`, `src/lib/rcap/**`, `private/**` except read-only
source access, and all source records/bodies, routes, Captain/main, PR #219, and
Production.

Recompute hashes before editing; require them to match the current artifact
records. Rebuild only affected families, compare hashes, reraster only changed
bytes, preserve byte-identical raster receipts, and run focused checks. Record
old/new hashes and changed files in the return. Commit only allowed paths and
push `codex/cs2-fix13`. A different verifier must perform the full re-read; do
not self-verify or mark any family passed.

## Prompt 7 — SRC05 owner-only Drive source materialization

You are `CODEX-CS2-SRC05`, the one private-source materialization worker. Work
only in `/workspaces/cs2src05` on `codex/cs2-src05`, based on the canonical
Captain with dispatch commit `84218d2dae40d561591a65ae382adbe658c53fb0` as an
ancestor. Stop on dirty or unexplained state. This is materialization only: do
not acquire, research, redownload from official websites, upload, create a new
receipt, use a new storage provider, or alter identity/currentness conclusions.

Use the existing connected Google Drive custody method. These are stored,
non-native PDFs: read metadata for the exact file ID, then fetch/download the raw
file bytes through authenticated Drive. Never use a public link or change
sharing. For each binary recompute SHA-256 and byte length and require exact
agreement before it may be materialized:

| source obligation | Drive file ID | SHA-256 | bytes |
|---|---|---|---:|
| `official-form:CR-432` | `1PtXCgSbU_i86XEJC7Een4FGo1ZAdhyv8` | `8ef45f07cf9fac15af97addd4f7b7d5f08e2b5ad4b4134cf002484821bc0c43e` | 109666 |
| `official-form:CR-65` | `1WrpqS4NaA310RXXscjJR3iey_mds8TKh` | `c2e0c7bd7abca2c83c469d7da1aa0b80b132e653f8712d0b4ce77c8b160b2a39` | 468056 |
| `official-form:ABPP-3` | `1gtsVBXAjLedr0MzrF6eMNWBw3rw-NVkh` | `874e738a83c3577413a29a92eb0b999e8c9aab36ddf83589191e33d3c63ac327` | 160009 |
| `official-form:CR310` | `1S-dg44ushGUcYAALjEgYBKmjieRl3QsY` | `2592efa5a9cbe170a7a7f19e3e0e13c9687d9ab9c92049998f3685c0183b6509` | 106723 |
| `official-form:CR143` | `1cn8Gu8gAgTWi4pLYqPne4CXvUqWUN85Z` | `e39619185578a4a29ef99e7c91b71c1346309bf91ab2b4670a01711b5a4c1441` | 69818 |
| `official-form:CR370` | `1mcBDDIGVtm05PZraqLUOgmWVo1d8hT_d` | `8a4d32d66d3fc05a41fdcd362a6f744c4536d95a8a600eb9d3d524192de60eb6` | 103658 |
| `official-form:CR311` | `1r45LLdLn0xlMtniVGyHIBGAbkIOa7eG5` | `3ce91ab2c9bbcdb4f20cb72e99ee786a1b2e1979c2bc72831452addaff0eef40` | 97529 |
| `official-form:CC-DC-CR-072B` | `1b5hj3E_trOLabgP_ltdDFo-pjCt7IiW-` | `3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469` | 764936 |
| `official-form:CC-DC-CR-072C` | `1eA0kw5oShaCf8eu0qbG7MSzlGPSbs4Rd` | `9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac` | 888008 |
| `official-form:CC-DC-CR-072D` | `12qn6XUfmp3TWHQbVaC0dcUkUsw5io7yN` | `6a5337a5d142c8ae1cc41845bd4c5efb5598e7a64acbda17c9ab70134773f147` | 166429 |
| `official-form:CC-DC-CR-072A` | `1uAzzy61RUarShj92Z1K482mrUPwT9xE5` | `8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2` | 195791 |
| `official-form:HCJDC-159B` | `1oG8wni0DXXfXVnZDuKehqnlJ0FbD5OlR` | `1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a` | 181711 |
| `official-form:AOC-CR-293` | `1IBHAQ2Dh9IWymWZwI1R7SsAucyBEdy9N` | `37308914289a01649bd5cf009a91902386d6ec9658de8d7a1f99054b31310086` | 271932 |
| `official-form:AOC-CR-293-INSTRUCTIONS` | `1dLzbn4_9v8A3ZcJSRK4_1PANMofHXo6V` | `ae9e161bf5a190b2956662216afe5738f99be4416d5902e66a3c3bea5fe87fe3` | 217181 |
| `official-form:AOC-G-260` | `1Hxui0PCjlfPlsImFv2gnFYDs4Sux4yNQ` | `cf998cecefea090e4b3fce260b330b6f3896d66ae65ab9f9e7a698e6586a1817` | 290429 |
| `official-form:1501CR` | `1hnvPeDSAxw4xvosbP0rxpI0HdFlNIcUP` | `69c37d4da60eeccddd54b174427737f6be092cdcbf759dd27e101eb8d3b1c623` | 175626 |
| `official-form:1501CR-C` | `1YgTrSPRe51ndKjL9vPqD1kdZ-Mo1rwwX` | `25e24089f588bf32121cf01fe0c3a32e5eb576c757670baad163bc4b4f023951` | 177335 |
| `official-form:1502CR` | `1QuYjAhIixVwN14sgbzfCq2KLFDY7hn0V` | `d23d74d35aafbc5eab484a5753aab3b80bf8be93995f72f141a3b9c3926dae27` | 106034 |
| `official-form:1023EX` | `1ern914s2KtuLaHQzaJuY_jVapizF-fnm` | `24868a504130440532dd51f47b212e925815abc91c086a3bf67d5c014b5d002a` | 110830 |
| `official-form:1001EX` | `1sHLFJOcqbdk2Z4Gs-KBP_PSib2rqw7HW` | `0f575aa4c08f9ce0001ea386177f08ed707ff72b55c0036d07d024693dbca1ed` | 112139 |
| `official-form:1021EX` | `1zHmG__sBZ3c41xBQIfBfXotHQ_fwp_Av` | `2b730d0a34f91a69f0316ac8a8e9ce78f559e554c564a9ebcc271533daefc174` | 104276 |

The accepted receipts and dependency lists are only in these four records:

- `data/rcap-grade-a/packet-factory-24h/src01/CODEX_CS1_SRC1_ACQUISITION.json`
- `data/rcap-grade-a/packet-factory-24h/src02/CODEX_CS1_SRC2_ACQUISITION.json`
- `data/rcap-grade-a/packet-factory-24h/src03/CODEX_CS1_SRC3_ACQUISITION.json`
- `data/rcap-grade-a/packet-factory-24h/src04/CODEX_CS1_SRC4_ACQUISITION.json`

Assert all 33 dependent claim item IDs listed by those 21 accepted receipts with
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert SRC05 '<itemId>'`
before reading the relevant family binding. Do not release claims or edit the
ledger.

Place exact bytes only in the existing ignored private source structure rooted
at `private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/`.
Derive each relative destination from the existing family `source-receipt.json`
or existing binding; do not invent a parallel layout or registry. One exact
binary may serve multiple family bindings. Confirm every dependent family can
read every required source using `MASTER_LIBRARY_SOURCE_DIR` before calling it
materialized.

Do not edit central source bindings or family states. Captain will do that from
your return. Write only
`data/rcap-grade-a/packet-factory-24h/src05/SOURCE_MATERIALIZATION_RETURN.json`,
with one row per distinct binary: accepted receipt path, file ID, stored title,
MIME type, source-obligation ID, expected and observed SHA-256, expected and
observed byte length, exact ignored local path, all dependent families and claim
items, readback result, and `shared:false`, `visibility:"owner_only"`. Include a
family summary proving whether all required sources are readable.

Never stage or commit a PDF/source body. Validate the JSON, prove git sees no
private source bytes, run `git diff --check`, stage only the return JSON, commit,
and push `codex/cs2-src05`. If connected Drive retrieval is unavailable, preserve
any already materialized exact files, make no false materialization claim, and
return `DRIVE_CUSTODY_UNAVAILABLE`; do not use another provider or official
website. Production touched `NO`.

## Prompt 8 — dedicated Kansas municipal review

You are `CODEX-CS2-KS-MUNICIPAL`, the dedicated Kansas verification and offline
review-package worker. Work only in `/workspaces/cs2ksmunicipal` on branch
`codex/cs2-ks-municipal-review`, based on the canonical Captain with dispatch
commit `84218d2dae40d561591a65ae382adbe658c53fb0`. Stop on dirty or unexplained
state. Do not use the Captain checkout.

Handle only family `rcap-ks-custom-pleading` and only its two municipal routes:

- `obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516`
- `obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a`

Do not touch the three Kansas Judicial Council routes under issuer-permission
holds. Before reading, require
`node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF05 'rcap-ks-custom-pleading'`.
Do not touch any other live VF05 grant and do not release the claim.

Require the route PDFs to match these exact current hashes and lengths:

- 12-4516 canonical:
  `f79d5b4e82d3ccf22c9b03aa42ad202e0796a13b4de95f3d25b38b2adf22f810`,
  18262 bytes, 6 pages.
- 12-4516 boundary:
  `7b234e970d38bdc0515122916c6f3961f1140e74f12978b6096e6aa34928600f`,
  18886 bytes, 7 pages.
- 12-4516a canonical:
  `8a85bc0f2365938bd8b5e0483585b95abf2550a6cc24a4717b0d72001abd708d`,
  17378 bytes, 6 pages.
- 12-4516a boundary:
  `dd364be7194a5e23643057ba75e5d5ea84950e7cd18b2945db5483761b9f3617`,
  17578 bytes, 6 pages.

Raster every page of those exact four files. Independently review each route's
actual participant deliverable against all fifteen exact obligations:
`ROUTE_IDENTITY`, `SOURCE_IDENTITY`, `COMPONENT_SET`, `KNOWN_PREFILLS`,
`REQUIRED_BEFORE_FILING`, `ROUTE_OPTIONS`, `REPEATING_ROWS`, `PROTECTED_FIELDS`,
`ARTIFACTS`, `PAGE_ORDER`, `CLIPPING_AND_OVERLAP`, `FILING_DESTINATION`,
`FEE_AND_WAIVER`, `SERVICE`, `SELF_HELP_STOP`. Explicitly measure clipping and
overlap on every raster page. No inferred visual approval and no pass with an
unmeasured obligation. Do not edit or repair packet content.

Write only under
`data/rcap-grade-a/codex-cloud/ks-municipal-independent-review/**`. Produce:

- `rows.json` with one family verdict and per-route/per-fixture evidence for all
  fifteen obligations;
- exact-byte route rasters and a raster receipt bound to the four hashes;
- a downloadable offline ZIP containing the four exact route PDFs plus a simple
  review workbook (`.csv` or `.xlsx`) and a concise review report;
- a package receipt listing every contained file's SHA-256 and binding the
  package to the four route hashes;
- clear Roger checkboxes for named visual approval of clipping, overlap,
  readability, route identity and component completeness.

The package is review-only. Do not create fulfillment authority, bind a route,
enable payment, run a canary, modify central raster records, edit the ledger,
open a route, or touch Production. Validate outputs, run only focused checks and
`git diff --check`, stage only the exact worker return path, commit, and push
`codex/cs2-ks-municipal-review`. Report the commit, exact verdict, raster page
count, package path/hash, and `Production touched: NO`.
