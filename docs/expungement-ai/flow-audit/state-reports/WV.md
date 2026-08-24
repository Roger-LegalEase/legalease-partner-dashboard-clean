# West Virginia (WV) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-5`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 12 |
| Consumer screens | 13 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 55 |
| Branch edges | 58 |
| Ordered decision rules | 53 |
| Waiting-period rules | 17 |
| Exclusion rules | 11 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **no**
- Best terminal found: `packet_ready_with_caution` on `juvenile-record-relief`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `prior_relief` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 8 | `trafficking_status` | `yes_no_prefer_not_to_say` | yes | `supported_by_eligibility_rule` | `special_category` | **none** |
| 9 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 10 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 12 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 13 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a` | `paid_packet_intended` | `needs_review` | closed | no |
| `eligible-conviction-expungement-under-w-va-code-61-11-26` | `paid_packet_intended` | `guidance_only` | closed | no |
| `first-offense-drug-possession-conditional-discharge-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `juvenile-record-relief` | `paid_packet_intended` | `needs_review` | closed | no |
| `no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication` | `paid_packet_intended` | `needs_review` | closed | no |
| `pardon-based-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `sex-trafficking-victim-vacatur-and-expungement` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 8 |
| `hard_stop` | 2 |
| `needs_more_info` | 1 |
| `guidance_only` | 1 |

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
| `EXPAI-WV-c9745beada` | desktop-1440x1000 | 13 | `needs_review` | yes |
| `EXPAI-WV-c3147fe072` | desktop-1440x1000 | 13 | `hard_stop` | yes |

## Issues touching WV

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for WV

```text
src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json
src/lib/rcap/state-packs/west-virginia/**
docs/expungement-ai/flow-audit/state-reports/WV.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

# Phase 3 — SHARD-5 sign-off

Built from `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head). Evaluator clock pinned to `2026-07-01`.
Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-5.json`.

## What changed for WV

| File | Change |
| --- | --- |
| `src/lib/rcap/state-packs/west-virginia/county-court-directory.ts` | **New.** The controlled county and court dataset for West Virginia: all 55 counties, 1 court option each carrying the verbatim quote from this repository that supports it, and the two clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. |
| `src/lib/rcap/state-packs/west-virginia/index.ts` | Re-exports the new module. |
| `src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json` | **Unchanged**, deliberately. See below. |

No waiting rule, exclusion rule, ordered decision rule, packet family, form mapping, payment clamp or `operationallySellable` value was changed. No question was deleted. No terminal moved.

## Why the compiled profile is unchanged

The county and court selector this issue asks for **was written for WV, measured, and reverted**. Two independent reasons, either sufficient:

1. **It would have been invisible.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` builds the public profile from `src/lib/rcap-engine/compiled/all51.json`, not from the per-state compiled profile, whenever the jurisdiction is present there — and all 51 are. The audit's own manifest already records this: `runtimeConsumerQuestionAuthority` is `all51.json`; `runtimeEligibilityAuthority` is `compiled/profiles/*.json`. This shard owns the second and not the first. Measured: with the binding applied, re-projecting WV returned the unchanged question.
2. **It would have failed this shard's own acceptance test.** `scripts/verify-expungement-plain-language-values.mjs` fails on a changed question type, option list, prompt, order or count unless the change is recorded in `data/expungement-ai/screening-parity-approved-deltas.json`, which is a prohibited path for this shard.

The exact question objects are preserved in the shard result under `proposedCompiledProfileQuestions`, and the option lists are re-derivable from the state pack, so the integration captain can land them without re-deriving anything.

## Reachability at this base

| Measure | Phase 1 artifact | This base | Explanation |
| --- | --- | --- | --- |
| Rendered consumer screens | 13 | 17 | allowlist `shared-facts-rendered` |
| Best terminal from rendered screens only | `packet_ready_with_caution / payment not reachable` | `not_yet / payment not reachable` | allowlist `wv-waiting-rule-now-reached`; payment was already closed |

Every difference is explained by `data/expungement-ai/phase2/correction-allowlist.json`. None is caused by this shard.

## Waiting-rule dispositions

7 of this shard's 41 fallback-dependent routes are WV's. Each resolves through the provisional prose selector kept in the evaluator, and each is dispositioned rather than bound: `waiting-rule-bindings.json` and `evaluator.ts` are prohibited paths, so a shard proposes and the integration captain binds.

| Route | Disposition | Rule |
| --- | --- | --- |
| `no-conviction-expungement-for-acquittal-dismissal-diversion-or-deferred-adjudication` | `EXPLICIT_BINDING_PROPOSED` | wait-01 |
| `eligible-conviction-expungement-under-w-va-code-61-11-26` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-12, wait-13, wait-14 |
| `accelerated-treatment-recovery-job-readiness-expungement-under-61-11-26a` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-05, wait-06, wait-07 |
| `first-offense-drug-possession-conditional-discharge-relief` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-11, wait-15, wait-16 |
| `juvenile-record-relief` | `EXPLICIT_BINDING_PROPOSED` | wait-10 |
| `pardon-based-expungement` | `EXPLICIT_BINDING_PROPOSED` | wait-09 |
| `sex-trafficking-victim-vacatur-and-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |

3 × `EXPLICIT_BINDING_PROPOSED` · 4 × `LEGAL_OWNER_DECISION_REQUIRED` · **0 recommended active.**

No duration in any proposal was written by this shard. Every one is quoted from the duration West Virginia's own compiled profile already publishes, with its rule id.

## Hold

PAYMENT_CLAMP_PRESERVED — preserved exactly. Terminal `needs_review` → `needs_review`; payment false → false.

## Findings and open questions

- **West Virginia's payment clamp is held, and this shard preserved it exactly.** `paymentAllowed` was false at the product base and is false now.
- **Three of this shard's eight explicit binding proposals are West Virginia's**, and each is the only rule the profile publishes for its route: `wait-01` (60 days after the order of acquittal or dismissal, § 61-11-25), `wait-09` (one year after the pardon, § 5-1-16a) and `wait-10` (one year after the juvenile's 18th birthday or after jurisdiction ends, § 49-5-104). `juvenile-record-relief` is the route the Phase 2 allowlist entry `wv-waiting-rule-now-reached` names as unable to execute its waiting rule now that `disposition_date` is asked, so that proposal is the direct answer to the recorded gap.
- **Two compilation gaps recorded with the proposals.** `wait-09` is conjunctive — one year after the pardon **and** five years after discharge — but only the one-year limb is compiled as structured data, with the five-year limb surviving inside the anchor string, so an evaluator reading the duration applies the shorter limb (`WAIT-DATA-003`). And three West Virginia entries are not rules at all: `wait-11` is a table header, `wait-15` a truncated citation, `wait-16` the bare reason code `not_eligible_yet_waiting_period` — which is why the § 60A-4-407 six-month period that West Virginia's own filing instructions describe has no compiled home and its route cannot be bound (`WAIT-DATA-004`).
- **One shared change would unlock two more West Virginia routes.** § 61-11-26(b) and § 61-11-26a both publish their periods as a three-row table keyed on single misdemeanor / multiple misdemeanors / nonviolent felony. `offense_level` supplies the third row and nothing supplies the first two. One rendered single-versus-multiple conviction-count question makes both routes bindable from rules the profile already publishes, with no duration authored (`SHARED-PROPOSAL-001`).

## County and court datasets

- Counties: **55**, complete for West Virginia, no duplicate. WV is one of UX-COUNTY-001's four assigned jurisdictions for this shard.
- Courts: **1**, not exhaustive by design. A court this repository does not name is absent rather than invented, which is why the manual-entry fallback is part of the contract and not a nicety.
  - `Circuit Court` — "No-conviction expungement (§ 61-11-25): file a civil petition in the circuit court where the charges were filed, no sooner than 60 days after the acquittal/dismissal order" (`src/lib/rcap/state-packs/west-virginia/filing-instructions.ts; WV-west-virginia.json#waitingPeriodRules wait-01`)
