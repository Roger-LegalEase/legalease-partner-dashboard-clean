# Utah (UT) — flow audit

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
| Branch edges | 39 |
| Ordered decision rules | 102 |
| Waiting-period rules | 36 |
| Exclusion rules | 8 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `needs_more_info` on `path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility`
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
| `path-a-automatic-clean-slate-expungement` | `non_filing_guidance` | `guidance_only` | closed | — |
| `path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice` | `non_filing_guidance` | `guidance_only` | closed | — |
| `path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals` | `non_filing_guidance` | `guidance_only` | closed | — |
| `path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-e-petition-based-non-conviction-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-f-petition-based-conviction-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-i-traffic-offense-expungement-or-deletion` | `paid_packet_intended` | `needs_review` | closed | no |
| `path-j-cannabis-possession-petition-without-a-bci-certificate` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-k-pardon-based-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-l-vacatur-human-trafficking-related-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `path-m-juvenile-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |

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
| `inside_waiting_period` | `guidance_only` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `guidance_only` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-UT-1b160fd585` | desktop-1440x1000 | 6 | `guidance_only` | yes |
| `EXPAI-UT-6d3f70791a` | desktop-1440x1000 | 6 | `hard_stop` | yes |

## Issues touching UT

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for UT

```text
src/lib/rcap-engine/compiled/profiles/UT-utah.json
src/lib/rcap/state-packs/utah/**
docs/expungement-ai/flow-audit/state-reports/UT.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

# Phase 3 — SHARD-5 sign-off

Built from `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head). Evaluator clock pinned to `2026-07-01`.
Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-5.json`.

## What changed for UT

| File | Change |
| --- | --- |
| `src/lib/rcap/state-packs/utah/county-court-directory.ts` | **New.** The controlled county and court dataset for Utah: all 29 counties, 2 court options each carrying the verbatim quote from this repository that supports it, and the two clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. |
| `src/lib/rcap/state-packs/utah/index.ts` | Re-exports the new module. |
| `src/lib/rcap-engine/compiled/profiles/UT-utah.json` | **Unchanged**, deliberately. See below. |

No waiting rule, exclusion rule, ordered decision rule, packet family, form mapping, payment clamp or `operationallySellable` value was changed. No question was deleted. No terminal moved.

## Why the compiled profile is unchanged

The county and court selector this issue asks for **was written for UT, measured, and reverted**. Two independent reasons, either sufficient:

1. **It would have been invisible.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` builds the public profile from `src/lib/rcap-engine/compiled/all51.json`, not from the per-state compiled profile, whenever the jurisdiction is present there — and all 51 are. The audit's own manifest already records this: `runtimeConsumerQuestionAuthority` is `all51.json`; `runtimeEligibilityAuthority` is `compiled/profiles/*.json`. This shard owns the second and not the first. Measured: with the binding applied, re-projecting UT returned the unchanged question.
2. **It would have failed this shard's own acceptance test.** `scripts/verify-expungement-plain-language-values.mjs` fails on a changed question type, option list, prompt, order or count unless the change is recorded in `data/expungement-ai/screening-parity-approved-deltas.json`, which is a prohibited path for this shard.

The exact question objects are preserved in the shard result under `proposedCompiledProfileQuestions`, and the option lists are re-derivable from the state pack, so the integration captain can land them without re-deriving anything.

## Reachability at this base

| Measure | Phase 1 artifact | This base | Explanation |
| --- | --- | --- | --- |
| Rendered consumer screens | 6 | 12 | allowlist `shared-facts-rendered` |
| Best terminal from rendered screens only | `needs_more_info / payment not reachable` | `needs_more_info / payment not reachable` | unchanged; held |

Every difference is explained by `data/expungement-ai/phase2/correction-allowlist.json`. None is caused by this shard.

## Waiting-rule dispositions

11 of this shard's 41 fallback-dependent routes are UT's. Each resolves through the provisional prose selector kept in the evaluator, and each is dispositioned rather than bound: `waiting-rule-bindings.json` and `evaluator.ts` are prohibited paths, so a shard proposes and the integration captain binds.

| Route | Disposition | Rule |
| --- | --- | --- |
| `path-a-automatic-clean-slate-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-05, wait-06, wait-07, wait-20, wait-21 |
| `path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-01, wait-02, wait-04, wait-18, wait-19 |
| `path-c-clean-slate-eligible-convictions-and-plea-in-abeyance-dismissals` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-05, wait-06, wait-07, wait-20, wait-21 |
| `path-d-petition-based-expungement-with-a-bci-certificate-of-eligibility` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-08, wait-09, wait-22, wait-23, wait-24, wait-25, wait-26, wait-27, wait-28 |
| `path-e-petition-based-non-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-10 |
| `path-f-petition-based-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-22, wait-23, wait-24, wait-25, wait-26, wait-27 |
| `path-i-traffic-offense-expungement-or-deletion` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates: wait-15, wait-16, wait-34, wait-35 |
| `path-j-cannabis-possession-petition-without-a-bci-certificate` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |
| `path-k-pardon-based-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |
| `path-l-vacatur-human-trafficking-related-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |
| `path-m-juvenile-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | none published |

11 × `LEGAL_OWNER_DECISION_REQUIRED` · **0 recommended active.**

No duration in any proposal was written by this shard. Every one is quoted from the duration Utah's own compiled profile already publishes, with its rule id.

## Hold

HELD_FOR_LEGAL_DECISION — preserved exactly. Terminal `guidance_only` → `guidance_only`; payment false → false.

## Findings and open questions

- **Utah is held, and this shard preserved the hold exactly.** No Utah rule, question, terminal or payment value was changed.
- **Step 2 splits three ways for Utah.** Paths D, E and I reach the timing gate and return `not_yet` with `ut.timing_or_completion_blocker` at every one of the eight timing-bucket values — that is the waiting rule (`UT-LEGAL-001`). Paths A, B and C return `guidance_only`, which is correct: they are `automatic: true` routes a participant does not file. Paths F, J, K, L and M also return `guidance_only`, and that is **not** obviously correct — they are typed `court_filing`, `pardon_then_court`, `special` and `juvenile`, and Utah's own filing instructions describe court filings for several of them. That second branch changes what the product claims, so it is escalated rather than answered (`UT-LEGAL-002`). The classification lives in `isCourtFiledPetitionRoute` in the shared evaluator, which this shard may not touch, and Utah is held, so the shard may not move it from either direction.
- **Path B is the Utah route closest to bindable, and it is deliberately not proposed.** Its own rule `wait-04` publishes two periods for the two outcomes it covers — 60 days after acquittal, 180 days after a qualifying dismissal with prejudice — and `case_outcome` does distinguish those two answers. But `wait-02` carves out "unless dismissed after plea in abeyance", a third branch no rendered Utah screen can express, and the hold says none is authored and none is guessed. Recorded for the legal owner.
- **A harness finding.** The bounded reachability sweep ranks `needs_more_info` above `not_yet`, so on paths D, E and I it deliberately leaves `resolved_timing_bucket` unanswered to keep the better rank — and then records `missingQuestionIds: ["resolved_timing_bucket"]` for a question Utah **does** render as screen 6. That reads as "the flow never asks this", which is the UX-GLOBAL-019 shape, when the true finding is "every answer to it returns `not_yet`". Two defects with two different owners are being reported as one (`SHARED-PROPOSAL-003`).

## Court dataset

- Counties: **29**, complete for Utah, no duplicate. UT is not on UX-COUNTY-001's jurisdiction list — it asks `county_or_filing_location` ("Where in Utah did the case happen?"), which is a location rather than a county, which is why the audit scoped the issue elsewhere. The dataset is shipped anyway because the packet binds a county.
- Courts: **2**, not exhaustive by design. A court this repository does not name is absent rather than invented, which is why the manual-entry fallback is part of the contract and not a nicety.
  - `District Court` — "If charges were never filed, the petition is filed in the district court in the county where the arrest occurred or citation was issued." (`UT-utah.json#packetGenerator.filingDestinationRules; src/lib/rcap/state-packs/utah/filing-instructions.ts`)
  - `Juvenile Court` — "Juvenile matters: use the juvenile court expungement process, not the adult BCI certificate application; the juvenile court requires an adult Utah criminal-history report from BCI." (`src/lib/rcap/state-packs/utah/filing-instructions.ts`)
