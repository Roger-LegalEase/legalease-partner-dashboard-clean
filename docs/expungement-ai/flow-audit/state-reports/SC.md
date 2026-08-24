# South Carolina (SC) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-3`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 12 |
| Consumer screens | 14 |
| Packet-information builder questions | 4 |
| Question nodes in the public payload | 54 |
| Branch edges | 61 |
| Ordered decision rules | 39 |
| Waiting-period rules | 16 |
| Exclusion rules | 6 |

## Reachability from the rendered screens only

- Packet-ready reachable: **no**
- Payment reachable: **no**
- Best terminal found: `not_yet` on `summary-court-non-conviction-expungement`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed`

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
| 12 | `pending_cases` | `yes_no_unsure` | yes | `supported_by_escalation` | `criminal_record` | yes |
| 13 | `resolved_timing_bucket` | `single_choice` | yes | `supported_by_eligibility_rule` | `low` | yes |
| 14 | `court_requirements_completed` | `single_choice` | yes | `supported_by_eligibility_rule` | `court_identity` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `diversion-or-program-completion-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `eligible-conviction-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `general-sessions-non-conviction-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `human-trafficking-survivor-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `juvenile-expungement` | `paid_packet_intended` | `needs_review` | closed | no |
| `pardon-guidance-for-otherwise-ineligible-convictions` | `paid_packet_intended` | `guidance_only` | closed | no |
| `summary-court-non-conviction-expungement` | `paid_packet_intended` | `needs_review` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 6 |
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
| `EXPAI-SC-0ff3f4bcbb` | desktop-1440x1000 | 14 | `needs_review` | yes |
| `EXPAI-SC-3d93a2d9d3` | desktop-1440x1000 | 14 | `hard_stop` | yes |

## Issues touching SC

- **UX-GLOBAL-002** (P1, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Save this matter and continue performs two sequential network calls with no pending state on the button
- **UX-GLOBAL-003** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — Save this matter and continue always lands on the Briefcase list rather than on the saved matter's next step
- **UX-GLOBAL-005** (P1, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Contact information is collected as one free-text field that asks for a mailing address, a phone number and an email at once
- **UX-COURT-001** (P1, `COURT_DATA`, owner `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`) — Court is collected as free text with no state-aware selector and no controlled dataset behind it
- **UX-GLOBAL-006** (P2, `GLOBAL_FACT_MODEL`, owner `PHASE_2_SHARED`) — Full legal name is collected once, as a single text field, and only after the result and the save
- **UX-GLOBAL-011** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — Wilma receives a page-level context only; the current question, its prompt and its help copy are never passed
- **UX-GLOBAL-012** (P1, `GLOBAL_HELP`, owner `PHASE_2_SHARED`) — 3 sensitive question id(s) are asked with no helper text and no stated reason
- **UX-GLOBAL-013** (P0, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The automatic waiting-rule selector cannot choose a rule the profile already contains, closing 13 jurisdictions that are otherwise reachable and payable
- **UX-STATELAW-001** (P1, `STATE_LEGAL_LOGIC`, owner `LEGAL_REVIEW_THEN_PHASE_3_STATE_SHARD`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-CONTENT-001** (P3, `CONTENT_ONLY`, owner `PHASE_2_SHARED`) — 5 question id(s) are served in the public profile payload with no eligibility, form, packet-selection or escalation consumer
- **UX-GLOBAL-015** (P3, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — Every jurisdiction's public profile carries other states' state-prefixed questions (51 jurisdictions affected)
- **UX-GLOBAL-016** (P2, `GLOBAL_SHARED_COMPONENT`, owner `PHASE_2_SHARED`) — The frontend contract states a contextOnly question never selects the pathway; the evaluator selects the pathway from one
- **UX-GLOBAL-017** (P1, `GLOBAL_NAVIGATION`, owner `PHASE_2_SHARED`) — A browser refresh discards every screening answer and restarts the flow at question one, with no warning and no recovery

## Files a Phase 3 shard may change for SC

```text
src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json
src/lib/rcap/state-packs/south-carolina/**
docs/expungement-ai/flow-audit/state-reports/SC.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-3 sign-off

**Phase 2 product head / base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-03` · **Evaluator clock:** `2026-07-01`

South Carolina's diversion and trafficking-survivor routes resolve to explicit no-waiting-period bindings; its conviction route cannot resolve at all, because South Carolina has five conviction waits and the flow never asks which offence it was.

### What changed

- `controlledDataBindings` added to `SC-south-carolina.json` for the `court` question.
- `src/lib/rcap/state-packs/south-carolina/controlled-filing-dataset.ts` added, covering both summary courts, General Sessions, Family Court, and the Solicitor / Clerk of Court / SLED destinations the pack names.

### What deliberately did not change

- No terminal, reason code, pathway, packet family, form mapping, payment clamp or `operationallySellable` value. All 12 South Carolina flow rows return the same terminal at this head as at the product base.
- No question was added, removed or reordered; no option value, type, `required` flag, `contextOnly` flag or stage moved. Screening parity against `main` holds byte-for-byte.
- South Carolina's payment clamp. Packet-ready is reachable from the rendered screens and payment is not; Phase 2 recorded that the clamp was not its correction's to move, and it is not this shard's either.

### Terminals, before and after

| Measure | Value |
| --- | --- |
| Flow rows owned | 12 |
| Flow rows whose terminal moved | **0** |
| Terminal distribution at this head | `needs_review` ×3, `hard_stop` ×2, `guidance_only` ×6, `needs_more_info` ×1 |

The distribution above is the distribution at the base. Nothing in this shard moved a terminal, so there is no before-and-after table to write: the before and the after are the same row.

### Waiting-rule dispositions (6 fallback-dependent routes)

2 `EXPLICIT_BINDING_PROPOSED` · 4 `LEGAL_OWNER_DECISION_REQUIRED`

| Route | Disposition | Rule(s) proposed | Duration as the profile states it |
| --- | --- | --- | --- |
| `diversion-or-program-completion-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-16` (`no_waiting_period`) | no ordinary waiting period |
| `human-trafficking-survivor-expungement` | `EXPLICIT_BINDING_PROPOSED` | `wait-15` (`no_waiting_period`) | no ordinary waiting period |
| `eligible-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `general-sessions-non-conviction-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `juvenile-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `pardon-guidance-for-otherwise-ineligible-convictions` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |

Every rule id above is published by this jurisdiction's own compiled profile, and every duration is quoted from that rule as the profile already states it. No waiting period was authored here, no binding was added — `src/lib/rcap-engine/waiting-rule-bindings.json` is a shared path this shard may not touch — and no route is recommended ACTIVE. The full rationale, the quoted source text for every rule, and the candidate rules considered and rejected are in `data/expungement-ai/flow-audit/shard-results/SHARD-3.json` under `waitingRuleDispositions`.

### Legal questions still open

- **UX-STATELAW-001 — confirmed reopened at this base.** South Carolina reaches a packet-ready outcome from the rendered screens only, via `summary-court-non-conviction-expungement`, with payment still closed by South Carolina's preserved clamp. That is the same route `remedy-context-replay-after.json` records, so Phase 2's correction still holds here. Nothing further is asked of counsel for South Carolina on this issue.

### Release-critical issues worked here

- **UX-COURT-001** (P1, release-critical) — the state-binding half is built: `src/lib/rcap/state-packs/south-carolina/controlled-filing-dataset.ts` publishes a controlled court and filing-destination list in which every row is quoted from this repository, plus a clearly-labelled manual-entry fallback, and `SC-south-carolina.json` now names it. The selector itself is Phase 2's half and is still outstanding: the renderer has no selector branch for a controlled-list question, and `toPublicQuestion` in `public-profile-projection.ts` is a strict allowlist, so a compiled profile cannot publish a dataset reference to the browser until that mapper names one. Both are prohibited shared paths for this shard.
- **UX-COUNTY-001** — not assigned to this jurisdiction in this shard (it assigns IN and MS only), so no South Carolina filing-location list is authored here. The dataset records that explicitly rather than leaving an empty field to be misread as "none exist".
- **UX-CONTENT-001** (P3, not release-critical this phase) — recorded and left alone. The five purpose-not-found ids are published by `postPaymentPacketCompletion` in the shared projection, so this is not a per-state change.

#### UX-COUNTY-001 / UX-COURT-001 — classified `SHARED_PHASE2_BLOCKER`

Confirmed programme-wide: shards 4 and 6 hit the same blocker independently, and one bounded state-configuration attempt here reproduced it exactly. The state-binding half is done and ready to apply; the rest cannot be built from any state shard, because every control that would turn the dataset into a selector sits on a prohibited shared path:

| Shared path | The control it holds |
| --- | --- |
| `src/lib/rcap-engine/public-profile-projection.ts` | `toPublicQuestion` is a strict allowlist; a field it does not name never reaches the browser. It must name a controlled-dataset field before any compiled profile can publish one. Its own comment says `PublicJurisdictionProfile` and the approved key set in `verify-public-profile-projection.mjs` must change with it. |
| `src/components/expungement-ai/screening/QuestionField.tsx` | No selector branch exists for a controlled-list question — UX-COURT-001's own evidence cites line 167, `case "text_or_unknown"`, a text box plus an unknown checkbox. |
| `src/lib/expungement-ai/packet-information.ts` | Line 451 re-asks `court` as `text_or_unknown` after payment, so a screening-side selector alone would still let a free-text value reach the packet. |
| `data/expungement-ai/screening-parity-approved-deltas.json` | Turning the question into a controlled list changes its `type` and `options`, which `verify-expungement-plain-language-values` compares against `main`. That needs a reviewed parity delta, and the approval file is prohibited to every shard by name. |
| `data/expungement-ai/phase2/correction-allowlist.json` | Any change that moves an evaluator output needs an entry here before `build-phase2-record.mjs` will still report `unexplainedDifferences: 0`. |

No shared projection, renderer, parity approval file or fixture was modified. The datasets and the profile declarations are inert and additive, so once the projection names a controlled-dataset field and the renderer grows a selector branch, this jurisdiction binds with no further state-side work.

### Files this shard changed for SC

```text
src/lib/rcap-engine/compiled/profiles/SC-south-carolina.json
src/lib/rcap/state-packs/south-carolina/controlled-filing-dataset.ts
src/lib/rcap/state-packs/south-carolina/index.ts
docs/expungement-ai/flow-audit/state-reports/SC.md
```

No shared path, no other jurisdiction, and no file under `data/expungement-ai/phase2/`, `data/rcap-ledger/` or `src/lib/rcap-engine/waiting-rule-bindings.json` was modified.
