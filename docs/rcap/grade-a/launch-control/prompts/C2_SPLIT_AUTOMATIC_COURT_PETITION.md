# C2_SPLIT_AUTOMATIC_COURT_PETITION

**Archetype:** Automatic process plus participant court-petition backstop
**Lane:** category-b-implementation
**Worker branch:** `codex/c2-split-automatic-court-petition`
**Branch from:** `227f095d5d1493feca56779cf60c6f177caebd61` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

The relief runs on its own, and the participant's branch is a court petition or motion filed when it does not. Build the branch identity and name the exact filing; the packet is a later wave.

## Your exact scope — 25 routes

| Route key | Reuse decision | Why |
| --- | --- | --- |
| `obligation:track-only:CO:co_auto_seal_arrest` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:CO:co_petition_seal_arrest:petition-based-non-conviction-sealing-jdf-417-24-72-704); crosswalk it rather than creating a second route |
| `obligation:track-only:CO:co_auto_seal_nonconviction` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-only:CO:co_motion_seal_nonconviction); crosswalk it rather than creating a second route |
| `obligation:track-only:CT:ct-nonconviction-auto` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:IN:in_auto_expungement` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:KY:ky_automatic_nonconviction_expungement_verification` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:KY:ky_nonconviction_expungement:nonconviction-431076); crosswalk it rather than creating a second route |
| `obligation:track-only:MI:mi_arrest_acquittal_dismissal` | NO_EXISTING_WORK | no existing Category A route in this jurisdiction requires any form this instrument names |
| `obligation:track-only:NC:nc_auto_146_a4` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1, obligation:track-only:NC:nc_146_dismissal_petition); crosswalk it rather than creating a second route |
| `obligation:track-only:NJ:nj_automated_clean_slate` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:VA:va_auto_seal_clean_record` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:VA:va_auto_seal_nonconvictions` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:WV:wv_dui_test_and_lock_dismissal` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:CA:ca-auto-arrest:tool-2-automatic-relief` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-only:CA:ca-851-91); crosswalk it rather than creating a second route |
| `obligation:track-pathway:CT:ct-diversion:automatic-non-conviction-erasure-under-conn-gen-stat-54-142a` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:DC:dc_auto_expungement:dc_auto_expungement_16_802` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:DC:dc_auto_sealing:dc_auto_sealing_16_805` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:IL:il-prostitution-j-auto:felony-prostitution-relief` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:MD:md_10105_1_automatic:automatic-expungement-under-crim-proc-10-105-1` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105); crosswalk it rather than creating a second route |
| `obligation:track-pathway:MO:mo-610-141-automatic-drug:state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:NE:ne-juvenile-sealing-routing:juvenile-automatic-sealing` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-only:NH:nh_petition_nonconviction_pre2019, obligation:track-only:NH:nh_petition_vacated, obligation:track-pathway:NH:nh_conviction_standard:conviction-annulment-under-rsa-651-5, obligation:track-pathway:NH:nh_conviction_standard:dwi-dui-annulment); crosswalk it rather than creating a second route |
| `obligation:track-pathway:PA:pa_9122_2_clean_slate:path-j-clean-slate-automatic-limited-access` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:UT:ut_auto_nonconviction:path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:UT:ut_auto_traffic:path-i-traffic-offense-expungement-or-deletion` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-pathway:VA:va_auto_seal_convictions:automatic-sealing-no-filing` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |

## Packet families implicated

These families are NAMED by this lane and created by nobody in this wave. A jurisdiction's family is shared across archetypes, so three lanes each creating it would produce three conflicting families for one jurisdiction.

- `rcap-ca-official-pdf-fill`
- `rcap-co-official-pdf-fill`
- `rcap-ct-custom-pleading`
- `rcap-dc-custom-pleading`
- `rcap-il-custom-pleading`
- `rcap-in-custom-pleading`
- `rcap-ky-official-pdf-fill`
- `rcap-md-official-pdf-fill`
- `rcap-mi-official-pdf-fill`
- `rcap-mo-custom-pleading`
- `rcap-nc-official-pdf-fill`
- `rcap-ne-custom-pleading`
- `rcap-nh-official-pdf-fill`
- `rcap-nj-custom-pleading`
- `rcap-pa-custom-pleading`
- `rcap-ut-custom-pleading`
- `rcap-va-custom-pleading`
- `rcap-wv-custom-pleading`

Nothing outside this scope belongs to you. Every row here is allocated to you and to no other lane; the dispatch refuses to generate if two lanes claim one row.

## Required inputs

- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json`
- `data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md`
- `data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json`
- `data/rcap-grade-a/launch-control/ACTIVE_CODEX_ASSIGNMENTS.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`
- `data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`
- `data/rcap-grade-a/launch-control/category-b-revalidation/report.md`

## Owned paths — write only here

- `data/rcap-grade-a/category-b-integration/c2-split-automatic-court-petition/**`

## Prohibited paths — never write here

- `data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json`
- `docs/rcap/grade-a/route-obligation-census/CATEGORY_B_MEDIUM_CONFIDENCE_REVALIDATION.md`
- `data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json`
- `data/rcap-grade-a/route-obligation-census-v1/FREEZE.json`
- `data/rcap-grade-a/launch-control/**`
- `data/rcap-ledger/**`
- `supabase/migrations/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/**`

## Required outputs

- data/rcap-grade-a/category-b-integration/c2-split-automatic-court-petition/branch-identities.json — one record per assigned route: the retained B stage, the participant A branch, and for each the selector, output strategy, product outcome and commercial treatment, stated as four different things
- data/rcap-grade-a/category-b-integration/c2-split-automatic-court-petition/crosswalks.json — for every route whose reuse decision is REUSE_AS_IS, the existing Category A route it binds to and the evidence for the binding
- data/rcap-grade-a/category-b-integration/c2-split-automatic-court-petition/README.md — what each branch files, where it goes, what triggers it and what the deadline is

## Focused tests

- `node scripts/grade-a-launch-control/generate-category-b-integration-delta.mjs --check`
- `node scripts/grade-a-launch-control/verify-launch-control.mjs`
- `npm run typecheck`

Do not run a broad tracked-file mutation suite: other workers are active, and a mutation harness that leaves a tracked file altered fails their runs, not only yours.

## Stop conditions

- A route whose participant instrument names no document you can identify from a committed record stops and is reported unresolved. Naming a form you have not seen sends a participant to file the wrong thing.
- A route whose reuse decision is REUSE_AS_IS and whose crosswalk you cannot confirm stops. Reporting a crosswalk that does not hold silently drops a participant branch nothing else covers.
- A B stage and its A branch that would end up sharing a selector, an output strategy, a product outcome or a commercial treatment stops. They are two different things; if they collapse into one, the automatic stage becomes purchasable.

Stopping with an honest account of what is missing is a complete return. A result reported as done on evidence nobody opened is not.

## Return format

```text
ASSIGNMENT:
WORKER BRANCH:
BASE SHA:
COMMIT:
ROUTES COMPLETED:
CROSSWALKS CONFIRMED:
NEW BRANCH IDENTITIES CREATED:
PACKET FAMILIES NAMED (not created):
STOPPED AND REPORTED:
COMMERCIAL ROUTES OPENED: 0
PRODUCTION TOUCHED: NO
```

## What finishing does not do

Completing this assignment opens no commercial route, proves no packet and approves no output. Commercial authority comes from a Grade-A fulfilment record keyed to an exact route and packet family, and from nothing else.

## Setup

```sh
git fetch origin --prune
git checkout -b codex/c2-split-automatic-court-petition 227f095d5d1493feca56779cf60c6f177caebd61
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/c2-split-automatic-court-petition`.
