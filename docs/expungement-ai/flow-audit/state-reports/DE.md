# Delaware (DE) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 4 |
| Flow rows | 10 |
| Consumer screens | 10 |
| Packet-information builder questions | 3 |
| Question nodes in the public payload | 49 |
| Branch edges | 42 |
| Ordered decision rules | 56 |
| Waiting-period rules | 10 |
| Exclusion rules | 16 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready` on `discretionary-court-expungement-under-11-del-c-4374`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 7 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 10 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `discretionary-court-expungement-under-11-del-c-4374` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `juvenile-expungement-under-10-del-c-1017-1019-1017a` | `paid_packet_intended` | `guidance_only` | closed | no |
| `mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a` | `non_filing_guidance` | `guidance_only` | closed | — |
| `pardon-based-discretionary-expungement-under-11-del-c-4375` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 3 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
| `not_yet` | 1 |
| `needs_more_info` | 1 |
| `likely_not_eligible` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `not_yet` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-DE-72bbc41cea` | desktop-1440x1000 | 10 | `packet_ready_with_caution` | **no** |
| `EXPAI-DE-17e8aad244` | desktop-1440x1000 | 10 | `guidance_only` | yes |
| `EXPAI-DE-72bbc41cea` | mobile-390x844 | 10 | `packet_ready_with_caution` | **no** |

## Issues touching DE

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title
- **UX-GLOBAL-019** (P0, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — The evaluator consumes facts before it will open a packet that the flow never asks for, so a browser cannot reproduce the repository's own recorded witnesses

## Files a Phase 3 shard may change for DE

```text
src/lib/rcap-engine/compiled/profiles/DE-delaware.json
src/lib/rcap/state-packs/delaware/**
docs/expungement-ai/flow-audit/state-reports/DE.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/delaware/record-clearing-filing-locations.ts: the three counties, the four courts and the SBI, and a labelled manual-entry fallback.
- Exported it from the Delaware state pack index.

### Deliberately not changed

- DE-delaware.json is byte-identical to the base.
- The § 4373 / § 4373A tier table was not rewritten, even though its two None rows carry no rule id of their own. Publishing them would move evaluator output.

### Terminals

No flow row moved. All 10 Delaware flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **13**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready` on `discretionary-court-expungement-under-11-del-c-4374`

Delaware already reaches packet_ready with payment open from rendered screens only, on discretionary-court-expungement-under-11-del-c-4374 from the years_3_to_5 bucket upward. Not a UX-STATELAW-001 jurisdiction.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `discretionary-court-expungement-under-11-del-c-4374` | legal owner decision required | `wait-06`, `wait-07`, `wait-08`, `wait-09` |
| `juvenile-expungement-under-10-del-c-1017-1019-1017a` | legal owner decision required | `wait-01` |
| `mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a` | legal owner decision required | `wait-03`, `wait-04`, `wait-05`, `wait-10` |
| `pardon-based-discretionary-expungement-under-11-del-c-4375` | explicit binding proposed (`no_waiting_period`) | none |

4 fallback-dependent route(s): 1 explicit binding proposed, 0 conditional binding proposed, 3 legal owner decision required, 0 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/delaware/record-clearing-filing-locations.ts` — 3 counties, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- Which felonies are the "certain eligible felonies" that carry the mandatory ten-year tier, and whether a misdemeanor is listed in § 4373(b) — neither fact is asked, and both select between periods that range from none to ten years.
