# Kentucky (KY) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-6`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 11 |
| Consumer screens | 9 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 50 |
| Branch edges | 42 |
| Ordered decision rules | 25 |
| Waiting-period rules | 7 |
| Exclusion rules | 3 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `misdemeanor-violation-traffic-conviction`
- Facts the evaluator consumes that this state never asks: `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `pardon_status` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `low` | **none** |
| 8 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `felony-conviction-431073` | `paid_packet_intended` | `guidance_only` | closed | no |
| `juvenile-automatic-dismissal` | `non_filing_guidance` | `guidance_only` | closed | — |
| `juvenile-petition-610330` | `non_filing_guidance` | `guidance_only` | closed | — |
| `misdemeanor-violation-traffic-conviction` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `nonconviction-431076` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `needs_review` | 3 |
| `guidance_only` | 3 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
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
| `EXPAI-KY-cb8bd49135` | desktop-1440x1000 | 9 | `packet_ready_with_caution` | yes |
| `EXPAI-KY-df375a3e1d` | desktop-1440x1000 | 9 | `guidance_only` | yes |

## Issues touching KY

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
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

## Files a Phase 3 shard may change for KY

```text
src/lib/rcap-engine/compiled/profiles/KY-kentucky.json
src/lib/rcap/state-packs/kentucky/**
docs/expungement-ai/flow-audit/state-reports/KY.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 SHARD-6 — what this shard did

Base `93e05e945a52cfa1cdd2ab590636290875a48f68` (PHASE2_PRODUCT_HEAD). Evaluator clock pinned to `2026-07-01`. Full record: `data/expungement-ai/flow-audit/shard-results/SHARD-6.json`.

### Changed

- Added src/lib/rcap/state-packs/kentucky/record-clearing-filing-locations.ts: all 120 counties, the Circuit and District Courts, the Family Court Division, the AOC expungement-certification step, and a labelled manual-entry fallback. This is the controlled county dataset UX-COUNTY-001 names as missing for Kentucky.
- Exported it from the Kentucky state pack index.

### Deliberately not changed

- KY-kentucky.json is byte-identical to the base; county and court keep type text for the same parity reason as Idaho.
- wait-05 was left in place even though its 60 days is a post-filing procedural window that the provisional selector can reach.

### Terminals

No flow row moved. All 11 Kentucky flow IDs keep the terminal they had at the base, and the compiled profile is byte-identical to it. Proved by re-running the audit's own four generators before and after this diff: the output is byte-identical.

### Reachability from the rendered screens only, at this base

- Rendered screens: **13**
- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `misdemeanor-violation-traffic-conviction`

Kentucky already reaches packet_ready_with_caution with payment open from rendered screens only, on misdemeanor-violation-traffic-conviction from the years_1_to_2 bucket upward. Not a UX-STATELAW-001 jurisdiction.

### Waiting-rule dispositions for this jurisdiction

Every route below still resolves through the provisional prose selector retained in the evaluator. None is recommended ACTIVE. No waiting period is authored here; a proposal names a rule id the compiled profile already publishes and quotes its text.

| Route | Disposition | Rules named |
| --- | --- | --- |
| `felony-conviction-431073` | explicit binding proposed | `wait-04` |
| `juvenile-automatic-dismissal` | legal owner decision required | none |
| `juvenile-petition-610330` | legal owner decision required | none |
| `misdemeanor-violation-traffic-conviction` | explicit binding proposed | `wait-02` |
| `nonconviction-431076` | legal owner decision required | `wait-06`, `wait-07` |

5 fallback-dependent route(s): 2 explicit binding proposed, 0 conditional binding proposed, 3 legal owner decision required, 0 held for correction.

### Controlled filing-location dataset

`src/lib/rcap/state-packs/kentucky/record-clearing-filing-locations.ts` — 120 counties, the courts and agencies that handle record-clearing matters, and a labelled manual-entry fallback. Addresses UX-COUNTY-001 and UX-COURT-001.

Still missing: the selector itself. The renderer has no selector branch for county or court, and changing a compiled question's type or options is locked against origin/main by verify-expungement-plain-language-values unless a reviewed entry exists in data/expungement-ai/screening-parity-approved-deltas.json. Both the renderer and that approval record are prohibited shared paths for this shard, so the dataset is delivered and the binding is proposed.

### Legal questions still open

- Whether a KRS 431.076 dismissal was with or without prejudice. The flow cannot ask it because case_outcome merges dismissal, no-bill, nolle prosequi and non-prosecution, and the answer moves the period between 60 days and three years.
- Which routes are the "named voided first-possession routes" that wait-02 carves out of the five-year rule.
- Kentucky publishes no juvenile waiting-period rule, so neither juvenile route has a candidate.
