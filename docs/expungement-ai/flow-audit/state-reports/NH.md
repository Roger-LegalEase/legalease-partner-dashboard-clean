# New Hampshire (NH) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 6 |
| Flow rows | 13 |
| Consumer screens | 8 |
| Packet-information builder questions | 8 |
| Question nodes in the public payload | 47 |
| Branch edges | 37 |
| Ordered decision rules | 73 |
| Waiting-period rules | 13 |
| Exclusion rules | 2 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `annulment-after-dismissal-acquittal-or-nonprosecution`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 7 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 8 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `annulment-after-dismissal-acquittal-or-nonprosecution` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `annulment-of-a-vacated-conviction` | `paid_packet_intended` | `packet_ready_with_caution` | closed | no |
| `conviction-annulment-under-rsa-651-5` | `paid_packet_intended` | `needs_review` | closed | no |
| `dwi-dui-annulment` | `paid_packet_intended` | `guidance_only` | closed | no |
| `marijuana-possession-annulment-under-rsa-651-5-b` | `paid_packet_intended` | `needs_review` | closed | no |
| `out-of-state-federal-or-military-record-guidance` | `product_scope_exclusion` | `guidance_only` | closed | — |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `packet_ready_with_caution` | 3 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
| `needs_review` | 2 |
| `guidance_only` | 2 |
| `not_yet` | 1 |
| `needs_more_info` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `not_yet` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |
| `state_exclusion_selected` | `packet_ready_with_caution` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-NH-b2fabe930d` | desktop-1440x1000 | 8 | `packet_ready_with_caution` | yes |
| `EXPAI-NH-2d30a8ab53` | desktop-1440x1000 | 8 | `needs_review` | yes |

## Issues touching NH

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for NH

```text
src/lib/rcap-engine/compiled/profiles/NH-new-hampshire.json
src/lib/rcap/state-packs/new-hampshire/**
docs/expungement-ai/flow-audit/state-reports/NH.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/new-hampshire/record-clearing-filing-locations.ts: the 10 counties, the Circuit Court District and Family Divisions, the Superior Court, the State Police Criminal Records Unit, and a labelled manual-entry fallback.
- Exported it from the New Hampshire state pack index.

### Deliberately not changed

- NH-new-hampshire.json is byte-identical to the base.
- No exclusion or waiting rule was changed, so the UX-LEGAL-001 behaviour is preserved exactly.

### Terminals

No flow row moved. All 13 New Hampshire flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **12**
- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `annulment-after-dismissal-acquittal-or-nonprosecution`

New Hampshire is recorded in the Phase 2 allowlist as notFoundByBoundedSearch rather than closed: the greedy sweep settles in a local optimum now that more screens render, and Phase 1's packet-ready answer set still replays to packet_ready_with_caution. Confirmed at this base — the sweep's best is not_yet on annulment-after-dismissal-acquittal-or-nonprosecution. NH is not one of this shard's two UX-STATELAW-001 jurisdictions and was not re-investigated as one.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `annulment-after-dismissal-acquittal-or-nonprosecution` | legal owner decision required | `wait-10`, `wait-13` |
| `annulment-of-a-vacated-conviction` | legal owner decision required | none |
| `conviction-annulment-under-rsa-651-5` | legal owner decision required | `wait-04`, `wait-05`, `wait-06`, `wait-07`, `wait-09` |
| `dwi-dui-annulment` | legal owner decision required | `wait-02` |
| `marijuana-possession-annulment-under-rsa-651-5-b` | explicit binding proposed (`no_waiting_period`) | none |
| `out-of-state-federal-or-military-record-guidance` | held for correction | none |

6 fallback-dependent route(s): 1 explicit binding proposed, 0 conditional binding proposed, 4 legal owner decision required, 1 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/new-hampshire/record-clearing-filing-locations.ts` — 10 counties, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- UX-LEGAL-001 for NH: recorded, not implemented.
- New Hampshire has no court or county question in its compiled profile at all. UX-COURT-001 lists NH, but court is asked only through free-text source questions, so binding a selector needs a court fact in the profile first — which is a question-model change with a parity approval, both shared.
- The RSA 651:5 offence-class periods (violation 1 year through Class A felony 10 years) are published only inside two concatenated rules whose single structured duration is one year. Binding either would give every conviction a one-year wait.
- Whether a favourable outcome is pre- or post-2019, which moves the annulment between "petition at any time" and 30 days. NH publishes no disposition_date question.
