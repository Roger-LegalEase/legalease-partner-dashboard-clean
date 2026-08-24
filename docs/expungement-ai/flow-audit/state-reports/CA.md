# California (CA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-1`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 15 |
| Consumer screens | 15 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 52 |
| Branch edges | 63 |
| Ordered decision rules | 87 |
| Waiting-period rules | 13 |
| Exclusion rules | 25 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `needs_review`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

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
| 9 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `ca_prop64_qualifying_marijuana_offense` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 11 | `ca_prop64_lesser_or_no_offense` | `yes_no_unsure` | no | `supported_by_escalation` | `criminal_record` | yes |
| 12 | `ca_prop64_branch` | `text_or_unknown` | no | `supported_by_escalation` | `low` | yes |
| 13 | `ca_prop64_relief_requested` | `text_or_unknown` | no | `supported_by_escalation` | `criminal_record` | yes |
| 14 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 15 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `prop-64-completed-sentence-application-11361-8` | `paid_packet_intended` | `likely_not_eligible` | closed | no |
| `prop-64-currently-serving-petition-11361-8` | `paid_packet_intended` | `likely_not_eligible` | closed | no |
| `tool-1-dismissal-set-aside` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `tool-2-automatic-relief` | `non_filing_guidance` | `guidance_only` | closed | — |
| `tool-3-petition-based-felony-sealing` | `paid_packet_intended` | `needs_review` | closed | no |
| `tool-4-arrest-record-sealing` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `tool-5-proposition-64-marijuana-relief` | `product_scope_exclusion` | `guidance_only` | closed | — |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `packet_not_deliverable` | 4 |
| `likely_not_eligible` | 3 |
| `packet_ready_with_caution` | 2 |
| `hard_stop` | 2 |
| `guidance_only` | 2 |
| `needs_more_info` | 1 |
| `needs_review` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `inside_waiting_period` | `packet_ready_with_caution` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-CA-e7b9a19891` | desktop-1440x1000 | 15 | `packet_ready_with_caution` | yes |
| `EXPAI-CA-820d8cab8d` | desktop-1440x1000 | 15 | `needs_review` | **no** |
| `EXPAI-CA-c36b60d263` | desktop-1440x1000 | 15 | `guidance_only` | yes |
| `EXPAI-CA-820d8cab8d` | mobile-390x844 | 15 | `needs_review` | **no** |

## Issues touching CA

- **UX-GLOBAL-001** (P0, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Open matter and Complete packet information loop for any packet-ready matter whose paymentAllowed is false or whose commercialFlow cannot be reconstructed
- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-004** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Facts already answered during screening are rendered again in the packet-information questionnaire, and the carry-forward is name-matched rather than guaranteed
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COUNTY-001** (P1, `COUNTY_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — County is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-007** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Current city duplicates the address already requested inside contact information
- **UX-GLOBAL-008** (P1, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — The accuracy review page formats exactly three internal values and prints every other snake_case answer verbatim
- **UX-GLOBAL-009** (P1, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — No discount-code entry exists anywhere before checkout, and the only code the product accepts is a partner access code that grants a free packet
- **UX-GLOBAL-010** (P2, `GLOBAL_PAYMENT`, owner `PHASE_2_SHARED`) — Sponsorship is a server-side session property with no consumer entry point, so it cannot be distinguished from a discount by anyone using the product
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-STATECFG-001** (P2, `STATE_CONFIGURATION`, owner `PHASE_3_STATE_SHARD`) — Route-specific facts are asked of every participant in the state before the route is known
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title
- **UX-GLOBAL-019** (P0, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — The evaluator consumes facts before it will open a packet that the flow never asks for, so a browser cannot reproduce the repository's own recorded witnesses

## Files a Phase 3 shard may change for CA

```text
src/lib/rcap-engine/compiled/profiles/CA-california.json
src/lib/rcap/state-packs/california/**
docs/expungement-ai/flow-audit/state-reports/CA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

## Phase 3 — SHARD-1

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-01` · **Hold status:** `HELD_FOR_CORRECTION`

Full sign-off packet: `data/expungement-ai/flow-audit/shard-results/SHARD-1.json`.

### What changed

- Added src/lib/rcap/state-packs/california/county-court-instructions.ts — the UX-COURT-001 and UX-COUNTY-001 state binding: the Superior Court venue rule quoted from the profile, the court designation set, the county slot marked awaiting_owner_supplied_source, and both manual-entry fallback labels.
- Exported it from src/lib/rcap/state-packs/california/index.ts.

### What was deliberately not changed

- src/lib/rcap-engine/compiled/profiles/CA-california.json — untouched, as the hold requires. California's pre-correction behaviour is preserved exactly.
- The four ca_prop64_* questions keep their current classification, even though this shard proved they are what closes every California route.
- All six fallback-dependent California routes are dispositioned HELD_FOR_CORRECTION rather than proposed.

### Reachability re-measured at this base

| Measure | Value |
| --- | --- |
| Rendered screens | 17 |
| Packet-ready reachable from rendered screens only | **no** |
| Payment reachable from rendered screens only | **no** |
| Best terminal found | `needs_review` |
| Best pathway | none matched |
| Facts the evaluator uses that this flow never renders | `record_documents` |

### Fallback-dependent routes and their Phase 3 disposition

| Route | Disposition | Why, in short |
| --- | --- | --- |
| `prop-64-completed-sentence-application-11361-8` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |
| `tool-1-dismissal-set-aside` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |
| `tool-2-automatic-relief` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |
| `tool-3-petition-based-felony-sealing` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |
| `tool-4-arrest-record-sealing` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |
| `tool-5-proposition-64-marijuana-relief` | `HELD_FOR_CORRECTION` | the jurisdiction is held; a binding is not meaningful until the correction lands |

None is recommended ACTIVE. Every one still resolves through the provisional prose selector kept in the shared evaluator, and a proposal is evidence, not a binding.

### Terminals

15 flow row(s) belong to this jurisdiction in SHARD-1. **0** moved.

This shard changed no compiled profile, no question, no decision rule and no waiting rule, so no terminal moved and no entry is proposed for the Phase 2 correction allowlist.

### Legal questions left open

- Are the four ca_prop64_* facts legal preconditions for Tools 1 through 4, or route-specific to the two HSC § 11361.8 routes? (UX-STATELAW-001)
- Does the exclusion list in CA-california.json#exclusionRules bind the non-conviction routes? (UX-LEGAL-001)
- Does any waiting-period rule bind those non-conviction routes, such that the shortest timing bucket should not return packet-ready? (UX-LEGAL-001)
- What waiting rule governs tool-3-petition-based-felony-sealing, which returns ca.waiting_rule_not_executed once the Proposition 64 gate is cleared?

### County and court — `SHARED_PHASE2_BLOCKER`

`UX-COURT-001` and `UX-COUNTY-001` cannot be completed inside a Phase 3 shard, and Shards 4 and 6 reproduced the
same blocker independently. One bounded state-configuration attempt was made and reverted:
rebinding `AZ:court` from `text` to a controlled `single_choice` list fails
`scripts/verify-expungement-plain-language-values.mjs` with *"changed type"* and
*"changed option values/order"*. The assertion is structural and applies to every question in
every one of the 51 compiled profiles, so it was not retried per state.

What this shard preserved instead is the source-backed state half, ready to apply:
`src/lib/rcap/state-packs/california/county-court-instructions.ts`.

The shared paths and controls the rebind needs — the parity approval record, the selector branch
in the shared question renderer, and the owner-supplied `TEST_COUNTY_AND_COURT_DATA_SOURCE` that was never supplied — are listed in
`SHARD-1.json#sharedPhase2Blocker`, together with the exact steps and option lists to apply once
the shared half lands.
