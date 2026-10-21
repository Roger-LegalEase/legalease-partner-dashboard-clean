# C5_SPLIT_POST_ORDER_ENFORCEMENT

**Archetype:** Post-order correction, omitted record, custodian enforcement and failed implementation
**Lane:** category-b-implementation
**Worker branch:** `codex/c5-split-post-order-enforcement`
**Branch from:** `227f095d5d1493feca56779cf60c6f177caebd61` (the control baseline — branch from exactly this commit)
**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean

## Mission

An order or disposition was already entered and the record did not follow. The participant's branch enforces or corrects it against a named custodian. Build the branch identity and name the custodian.

## Your exact scope — 10 routes

| Route key | Reuse decision | Why |
| --- | --- | --- |
| `obligation:track-only:KY:ky_diversion_disposition_routing` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:KY:ky_nonconviction_expungement:nonconviction-431076); crosswalk it rather than creating a second route |
| `obligation:track-only:MD:md_10104_pre_service` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105); crosswalk it rather than creating a second route |
| `obligation:track-only:ME:me-deferred` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:MI:mi_auto_misd92` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MI:mi_setaside_application:set-aside-by-application-under-mcl-780-621, obligation:track-pathway:MI:mi_setaside_first_owi:first-offense-owi-set-aside-by-application, obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e, obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application); crosswalk it rather than creating a second route |
| `obligation:track-only:MI:mi_auto_misd93` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MI:mi_setaside_application:set-aside-by-application-under-mcl-780-621, obligation:track-pathway:MI:mi_setaside_first_owi:first-offense-owi-set-aside-by-application, obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e, obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application); crosswalk it rather than creating a second route |
| `obligation:track-only:MI:mi_deferral_status` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MI:mi_setaside_application:set-aside-by-application-under-mcl-780-621, obligation:track-pathway:MI:mi_setaside_first_owi:first-offense-owi-set-aside-by-application, obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e, obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application); crosswalk it rather than creating a second route |
| `obligation:track-only:VA:va_auto_seal_without_order` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:VT:vt_diversion_post_charge` | NO_EXISTING_WORK | the instrument names no form number, so no form-level crosswalk could be attempted; this is 'no match attempted', not 'no match exists' |
| `obligation:track-only:WI:wi_exp_certificate_of_discharge` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-only:WI:wi_exp_cr266); crosswalk it rather than creating a second route |
| `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g` | REUSE_AS_IS | an existing Category A route already requires this instrument (obligation:track-pathway:MI:mi_setaside_application:set-aside-by-application-under-mcl-780-621, obligation:track-pathway:MI:mi_setaside_first_owi:first-offense-owi-set-aside-by-application, obligation:track-pathway:MI:mi_setaside_marihuana:misdemeanor-marijuana-set-aside-under-mcl-780-621e, obligation:track-pathway:MI:mi_setaside_trafficking:human-trafficking-related-set-aside-application); crosswalk it rather than creating a second route |

## Packet families implicated

These families are NAMED by this lane and created by nobody in this wave. A jurisdiction's family is shared across archetypes, so three lanes each creating it would produce three conflicting families for one jurisdiction.

- `rcap-ky-official-pdf-fill`
- `rcap-md-official-pdf-fill`
- `rcap-me-custom-pleading`
- `rcap-mi-official-pdf-fill`
- `rcap-va-custom-pleading`
- `rcap-vt-custom-pleading`
- `rcap-wi-official-pdf-fill`

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

- `data/rcap-grade-a/category-b-integration/c5-split-post-order-enforcement/**`

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

- data/rcap-grade-a/category-b-integration/c5-split-post-order-enforcement/branch-identities.json — one record per assigned route: the retained B stage, the participant A branch, and for each the selector, output strategy, product outcome and commercial treatment, stated as four different things
- data/rcap-grade-a/category-b-integration/c5-split-post-order-enforcement/crosswalks.json — for every route whose reuse decision is REUSE_AS_IS, the existing Category A route it binds to and the evidence for the binding
- data/rcap-grade-a/category-b-integration/c5-split-post-order-enforcement/README.md — what each branch files, where it goes, what triggers it and what the deadline is

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
git checkout -b codex/c5-split-post-order-enforcement 227f095d5d1493feca56779cf60c6f177caebd61
npm ci --cache /tmp/legalease-npm-cache
```

Commit your work and `git push -u origin codex/c5-split-post-order-enforcement`.
