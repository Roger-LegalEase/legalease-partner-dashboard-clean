# Pennsylvania (PA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-5`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 11 |
| Flow rows | 16 |
| Consumer screens | 6 |
| Packet-information builder questions | 12 |
| Question nodes in the public payload | 51 |
| Branch edges | 38 |
| Ordered decision rules | 102 |
| Waiting-period rules | 17 |
| Exclusion rules | 10 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `needs_more_info` on `path-a-non-conviction-expungement`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `path-a-non-conviction-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-b-complete-acquittal-not-guilty-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-c-summary-conviction-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-d-ard-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-e-age-70-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-f-deceased-person-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-g-underage-drinking-conviction-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-h-pardon-based-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-i-petition-for-limited-access` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-j-clean-slate-automatic-limited-access` | `non_filing_guidance` | `guidance_only` | closed | — |
| `path-k-human-trafficking-vacatur-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 10 |
| `needs_review` | 3 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `needs_review` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `needs_review` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-PA-43328528f5` | desktop-1440x1000 | 6 | `needs_review` | yes |
| `EXPAI-PA-c27ec3c395` | desktop-1440x1000 | 6 | `hard_stop` | yes |

## Issues touching PA

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-GLOBAL-013** (P0, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The automatic waiting-rule selector cannot choose a rule the profile already contains, closing 13 jurisdictions that are otherwise reachable and payable
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for PA

```text
src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json
src/lib/rcap/state-packs/pennsylvania/**
docs/expungement-ai/flow-audit/state-reports/PA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

# Phase 3 — SHARD-5 sign-off

Built from `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head). Evaluator clock pinned to `2026-07-01`.
Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-5.json`.

## What changed for PA

| File | Change |
| --- | --- |
| `src/lib/rcap/state-packs/pennsylvania/county-court-directory.ts` | **New.** The controlled county and court dataset for Pennsylvania: all 67 counties, 3 court options each carrying the verbatim quote from this repository that supports it, and the two clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. |
| `src/lib/rcap/state-packs/pennsylvania/index.ts` | Re-exports the new module. |
| `src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json` | **Unchanged**, deliberately. See below. |

No waiting rule, exclusion rule, ordered decision rule, packet family, form mapping, payment clamp or `operationallySellable` value was changed. No question was deleted. No terminal moved.

## Why the compiled profile is unchanged

The county and court selector this issue asks for **was written for PA, measured, and reverted**. Two independent reasons, either sufficient:

1. **It would have been invisible.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` builds the public profile from `src/lib/rcap-engine/compiled/all51.json`, not from the per-state compiled profile, whenever the jurisdiction is present there — and all 51 are. The audit's own manifest already records this: `runtimeConsumerQuestionAuthority` is `all51.json`; `runtimeEligibilityAuthority` is `compiled/profiles/*.json`. This shard owns the second and not the first. Measured: with the binding applied, re-projecting PA returned the unchanged question.
2. **It would have failed this shard's own acceptance test.** `scripts/verify-expungement-plain-language-values.mjs` fails on a changed question type, option list, prompt, order or count unless the change is recorded in `data/expungement-ai/screening-parity-approved-deltas.json`, which is a prohibited path for this shard.

The exact question objects are preserved in the shard result under `proposedCompiledProfileQuestions`, and the option lists are re-derivable from the state pack, so the integration captain can land them without re-deriving anything.

## Reachability at this base

| Measure | Phase 1 artifact | This base | Explanation |
| --- | --- | --- | --- |
| Rendered consumer screens | 6 | 12 | allowlist `shared-facts-rendered` |
| Best terminal from rendered screens only | `needs_more_info / payment not reachable` | `packet_ready_with_caution / payment reachable` | recovered by Phase 2 (allowlist `ui-reachability-recovered`) |

Every difference is explained by `data/expungement-ai/phase2/correction-allowlist.json`. None is caused by this shard.

## Waiting-rule dispositions

10 of this shard's 41 fallback-dependent routes are PA's. Each resolves through the provisional prose selector kept in the evaluator, and each is dispositioned rather than bound: `waiting-rule-bindings.json` and `evaluator.ts` are prohibited paths, so a shard proposes and the integration captain binds.

| Route | Disposition | Rule |
| --- | --- | --- |
| `path-b-complete-acquittal-not-guilty-expungement` | `EXPLICIT_BINDING_PROPOSED` | wait-01 |
| `path-c-summary-conviction-expungement` | `EXPLICIT_BINDING_PROPOSED` | wait-02 |
| `path-d-ard-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |
| `path-e-age-70-expungement` | `EXPLICIT_BINDING_PROPOSED` | wait-06 |
| `path-f-deceased-person-expungement` | `EXPLICIT_BINDING_PROPOSED` | wait-07 |
| `path-g-underage-drinking-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |
| `path-h-pardon-based-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-13 |
| `path-i-petition-for-limited-access` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | Misdemeanor → wait-08; Felony → wait-09 |
| `path-j-clean-slate-automatic-limited-access` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-04, wait-15 |
| `path-k-human-trafficking-vacatur-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |

4 × `EXPLICIT_BINDING_PROPOSED` · 5 × `LEGAL_OWNER_DECISION_REQUIRED` · 1 × `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` · **0 recommended active.**

No duration in any proposal was written by this shard. Every one is quoted from the duration Pennsylvania's own compiled profile already publishes, with its rule id.

## Findings and open questions

- Pennsylvania was reopened by Phase 2 and this shard was asked to confirm it, not re-investigate it. **Confirmed at this base**: Path A returns `packet_ready_with_caution` with `paymentAllowed` true for the same participant, and the bounded sweep finds Pennsylvania reaching packet-ready and payment from rendered screens only.
- **Pennsylvania is where this shard's waiting-rule work landed**: four explicit binding proposals (paths B, C, E, F) and this shard's only conditional proposal (path I), all from rules the Pennsylvania profile already publishes, with no duration authored.
- **A defect that would impose a seventy-year waiting period.** PA rule `wait-05` carries `duration: {value: 70, unit: "years"}` because the compiler read the age threshold — "the person is 70 years of age or older" — as a duration. The real period is 10 years and `wait-06` and `wait-16` both publish it correctly. Every authored binding in `waiting-rule-bindings.json` disambiguates by `longest_bound_duration`, so a binding over the age-70 route that included `wait-05` would select 70 years. The proposal for path E names `wait-06` explicitly and excludes `wait-05` for that reason (`WAIT-DATA-001`). A second rule, `wait-13`, is a bucket enumeration — `[Immediate / 5 years / 7 years / 10 years / …]` — compiled as a rule with a zero duration, so a shortest-duration disambiguation would read it as "no waiting period" (`WAIT-DATA-002`).
- **Ten of the eleven routes are marked guidance-only by counsel for this release** (`pa.lawrence_hold_guidance_only`). Four of them now have a repository-supported waiting rule proposed. Lifting a counsel hold is counsel's decision; none is recommended active (`PA-LEGAL-001`).

## County and court datasets

- Counties: **67**, complete for Pennsylvania, no duplicate. PA is one of UX-COUNTY-001's four assigned jurisdictions for this shard.
- Courts: **3**, not exhaustive by design. A court this repository does not name is absent rather than invented, which is why the manual-entry fallback is part of the contract and not a nicety.
  - `Court of Common Pleas` — "File petition-based Pennsylvania court relief in the Court of Common Pleas in the county where the case was heard." (`src/lib/rcap/state-packs/pennsylvania/filing-instructions.ts; PA-pennsylvania.json#questions source_question_06_court-of-common-pleas`)
  - `Magisterial District Court` — "Magisterial District Court" (`PA-pennsylvania.json#questions source_question_04_magisterial-district-court`)
  - `Philadelphia Municipal Court` — "Philadelphia Municipal Court" (`PA-pennsylvania.json#questions source_question_05_philadelphia-municipal-court`)
