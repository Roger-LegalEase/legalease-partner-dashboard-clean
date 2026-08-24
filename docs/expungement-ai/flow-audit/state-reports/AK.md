# Alaska (AK) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-4`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 5 |
| Flow rows | 11 |
| Consumer screens | 12 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 54 |
| Branch edges | 53 |
| Ordered decision rules | 64 |
| Waiting-period rules | 10 |
| Exclusion rules | 25 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40`
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
| 8 | `identity_error` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 9 | `sentence_completion_date` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 10 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 11 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |
| 12 | `state_exclusion_categories` | `multi_select` | yes | `supported_by_escalation` | `criminal_record` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `executive-pardon-backstop` | `paid_packet_intended` | `guidance_only` | closed | no |
| `juvenile-record-sealing-as-47-12-300` | `paid_packet_intended` | `guidance_only` | closed | no |
| `sealing-for-mistaken-identity-or-false-accusation-as-12-62-180` | `paid_packet_intended` | `guidance_only` | closed | no |
| `set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 5 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
| `needs_more_info` | 1 |
| `likely_not_eligible` | 1 |

## Non-remedy terminals

| Probe | Terminal | What it exercises |
| --- | --- | --- |
| `inside_waiting_period` | `guidance_only` | Participant's case resolved inside the shortest timing bucket the state offers. |
| `no_answers_supplied` | `needs_more_info` | Participant lands on the state's first screen and submits nothing. |
| `not_my_own_record` | `hard_stop` | Participant answers the ownership question with someone else's record. |
| `out_of_jurisdiction_case` | `hard_stop` | Participant's case is not a state or local case in this jurisdiction. |
| `state_exclusion_selected` | `likely_not_eligible` | Participant selects a state exclusion category on the exclusion screen. |

## Browser evidence

| Flow | Viewport | Screens walked | Rendered terminal | Matches manifest |
| --- | --- | --- | --- | --- |
| `EXPAI-AK-83c6833031` | desktop-1440x1000 | 12 | `packet_ready_with_caution` | yes |
| `EXPAI-AK-74ce059d8b` | desktop-1440x1000 | 12 | `guidance_only` | yes |
| `EXPAI-AK-83c6833031` | mobile-390x844 | 12 | `packet_ready_with_caution` | yes |
| `EXPAI-AK-74ce059d8b` | mobile-390x844 | 12 | `guidance_only` | yes |

## Issues touching AK

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
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery
- **UX-GLOBAL-018** (P2, `GLOBAL_REVIEW_FORMATTING`, owner `PHASE_2_SHARED`) — packet_ready and packet_ready_with_caution render an eyebrow that differs only by a full stop, under an identical title

## Files a Phase 3 shard may change for AK

```text
src/lib/rcap-engine/compiled/profiles/AK-alaska.json
src/lib/rcap/state-packs/alaska/**
docs/expungement-ai/flow-audit/state-reports/AK.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-4

**Base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` (the Phase 2 product head) · **Branch:** `claude/expai-state-shard-04`

Full record, with every quote and every proposed binding: `data/expungement-ai/flow-audit/shard-results/SHARD-4.json`.

### What changed in Alaska

Nothing. This branch carries no edit to `src/lib/rcap-engine/compiled/profiles/AK-alaska.json` or to `src/lib/rcap/state-packs/`. No flow row, terminal, question node, branch edge or reachability result moves.

That is not because nothing was found. The controlled-data issue (UX-COURT-001) assigned here was built, applied, measured, and then reverted when three separate gates proved a state shard cannot land it. The finished change is in the shard result file as a ready-to-apply payload with its source citations, and the gates are named below.

### Reachability at this base

| Measure | At this base |
| --- | --- |
| Packet-ready reachable from rendered screens only | yes |
| Payment reachable | yes |
| Best terminal found | `packet_ready_with_caution` on `confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` |
| Facts the evaluator uses that the flow never renders | `record_documents` |

The Phase 1 base recorded no unreachable finding for AK, and the regenerated sweep confirms it reaches packet-ready at this base.

Reaching packet-ready is not the same as being release-ready. Every route below that still resolves through the provisional prose fallback is **not** recommended ACTIVE, whatever terminal it returns.

### Waiting-rule dispositions

5 of this jurisdiction's routes depend on the provisional fallback. Each gets exactly one Phase 3 disposition. These are proposals and evidence, not changes: `src/lib/rcap-engine/waiting-rule-bindings.json` is a prohibited path and no duration here was written by this shard — every one is quoted from a rule this jurisdiction's own compiled profile already publishes.

| Route | Disposition | Evidence |
| --- | --- | --- |
| `confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40` | `EXPLICIT_BINDING_PROPOSED` | `wait-05, wait-01, wait-08, wait-10` — 60 days |
| `executive-pardon-backstop` | `LEGAL_OWNER_DECISION_REQUIRED` | no published rule names this route |
| `juvenile-record-sealing-as-47-12-300` | `EXPLICIT_BINDING_PROPOSED` | `wait-06` — 30 days |
| `sealing-for-mistaken-identity-or-false-accusation-as-12-62-180` | `EXPLICIT_BINDING_PROPOSED` | `wait-09` — no ordinary waiting period |
| `set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085` | `LEGAL_OWNER_DECISION_REQUIRED` | candidates disagree: 1 year |

Counts: EXPLICIT_BINDING_PROPOSED 3, LEGAL_OWNER_DECISION_REQUIRED 2. Recommended ACTIVE: none.

### Release-critical issues assigned here

- **UX-COURT-001** (P1) — blocked, see below
- **UX-CONTENT-001** (P3) — not release-critical this phase; recorded, not implemented

#### Why the court selector is not in this branch

A state-aware selector for `court` was built from Alaska's own repository content — every option quoted from this jurisdiction's compiled profile or state pack — with a clearly-labelled "not listed" fallback, and applied to the compiled profile. With it applied, all four audit generators regenerated byte-identical and every green verifier stayed green. Three gates then refused it:

1. **The screening-parity gate.** `scripts/verify-expungement-plain-language-values.mjs` diffs every compiled profile against `origin/main` and asserts equality on `type` and `options` for every question. It failed with `AK:court changed type.` and `AK:court changed option values/order.` The only escape is a reviewed delta in `data/expungement-ai/screening-parity-approved-deltas.json`, which carries `authorization.authorizedBy: "Roger"` and is a prohibited path for this shard.
2. **The served payload is not this file.** `buildProfileDraft` in `src/lib/rcap-engine/public-profile-projection.ts` takes `questions` from `getDesignerPublicProfiles()[code]` — the shared all-51 fixture `src/lib/rcap-engine/compiled/all51.json` — and never from the compiled engine profile when a fixture exists. All 51 have one. With the change applied, `projectPublicProfile` still returned `court` as `text` with no options.
3. **The renderer has no manual-entry-plus-list input.** `QuestionField.tsx` renders `single_choice` through `OptionGroup`, which has no free-text affordance, and `text_or_unknown` as a text box with no list. The expectation's "clearly-labelled manual entry fallback" needs an "Other — please specify" branch there and a matching allowance in `validatePacketAnswer`. Both files are prohibited paths.

None of this is a AK problem. UX-COURT-001 names all 51 jurisdictions and the parity gate compares all 51 profiles, so every Phase 3 state shard carrying this issue meets the same walls.

### Open legal questions

- `executive-pardon-backstop` — No rule in Alaska's published waitingPeriodRules addresses executive pardon. There is nothing in the repository to bind, and choosing a period would be authoring legal content.
- `set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085` — The only rule naming this route states the trigger as an event, not a period, and expressly qualifies the period as approximate: "On successful completion of the SIS probation AS 12.55.085(e) period (clean for the term, often ≈ 1 year+)". wait-04 carries the same approximate sentence with a structured one-year duration. Binding one year would turn an explicit approximation into a waiting period Alaska law does not state.
  - What would settle it: Counsel must say whether AS 12.55.085(e) relief is gated on completion of probation alone (no ordinary waiting period) or on a stated period.

### Before and after

No flow ID in AK changed its terminal. Terminals moved: **0**. Evaluator output differences proposed for the correction allowlist: **none** — this branch changes no evaluator input.
