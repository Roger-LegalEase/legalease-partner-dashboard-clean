# Massachusetts (MA) — flow audit

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529` · **Profile version:** `2026-06-19-source-conversion-1` · **Phase 3 shard:** `SHARD-3`
**Promotion status:** `live` · **Expungement.ai channel approved:** yes

## Shape

| Measure | Count |
| --- | --- |
| Compiled pathways | 7 |
| Flow rows | 13 |
| Consumer screens | 9 |
| Packet-information builder questions | 5 |
| Question nodes in the public payload | 51 |
| Branch edges | 43 |
| Ordered decision rules | 32 |
| Waiting-period rules | 21 |
| Exclusion rules | 3 |

## Reachability from the rendered screens only

- Packet-ready reachable: **yes**
- Payment reachable: **yes**
- Best terminal found: `packet_ready_with_caution` on `adult-conviction-sealing-under-m-g-l-c-276-100a`
- Facts the evaluator consumes that this state never asks: `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed`

## Consumer screens, in order

| # | Question id | Type | Required | Purpose | Sensitivity | Help |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ownership_scope` | `single_choice` | yes | `supported_by_escalation` | `low` | **none** |
| 2 | `jurisdiction_scope` | `single_choice` | yes | `supported_by_escalation` | `court_identity` | **none** |
| 3 | `case_outcome` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 4 | `offense_level` | `single_choice` | yes | `supported_by_escalation` | `criminal_record` | **none** |
| 5 | `possible_pathway_context` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |
| 6 | `age_at_offense` | `number_or_range` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 7 | `identity_error` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | **none** |
| 8 | `financial_obligations` | `yes_no_unsure` | yes | `supported_by_eligibility_rule` | `criminal_record` | yes |
| 9 | `resolved_timing_bucket` | `single_choice` | no | `supported_by_eligibility_rule` | `low` | yes |

## Remedies and their terminals

| Pathway | Category | Terminal | Payment | Launch-sellable |
| --- | --- | --- | --- | --- |
| `adult-conviction-sealing-under-m-g-l-c-276-100a` | `paid_packet_intended` | `packet_not_deliverable` | allowed at evaluator | no |
| `automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c` | `non_filing_guidance` | `guidance_only` | closed | — |
| `court-requested-sealing-for-dismissal-or-nolle-prosequi-100c` | `paid_packet_intended` | `guidance_only` | closed | no |
| `juvenile-record-sealing-under-100b` | `paid_packet_intended` | `guidance_only` | closed | no |
| `marijuana-only-expungement` | `paid_packet_intended` | `guidance_only` | closed | no |
| `non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k` | `paid_packet_intended` | `guidance_only` | closed | no |
| `time-based-expungement-under-100f-100j` | `paid_packet_intended` | `guidance_only` | closed | no |

### Terminal distribution across this jurisdiction's flow rows

| Terminal | Flows |
| --- | --- |
| `guidance_only` | 8 |
| `hard_stop` | 2 |
| `packet_not_deliverable` | 2 |
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
| `EXPAI-MA-1b8b8b38fd` | desktop-1440x1000 | 9 | `packet_ready_with_caution` | yes |
| `EXPAI-MA-f235419311` | desktop-1440x1000 | 9 | `guidance_only` | yes |

## Issues touching MA

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

## Files a Phase 3 shard may change for MA

```text
src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json
src/lib/rcap/state-packs/massachusetts/**
docs/expungement-ai/flow-audit/state-reports/MA.md
```

Shared paths are Phase 2's and are listed in `data/expungement-ai/flow-audit/shard-assignment.json` under `prohibitedSharedPaths`.

---

## Phase 3 — SHARD-3 sign-off

**Phase 2 product head / base SHA:** `93e05e945a52cfa1cdd2ab590636290875a48f68` · **Branch:** `claude/expai-state-shard-03` · **Evaluator clock:** `2026-07-01`

Massachusetts is the cleanest waiting-rule story in this shard: two of its six fallback routes resolve to a two-branch binding the profile states in prose as well as in rules.

### What changed

- `controlledDataBindings` added to `MA-massachusetts.json` for the `court` question.
- `src/lib/rcap/state-packs/massachusetts/controlled-filing-dataset.ts` added, quoting the four filing destinations the Massachusetts pack names.

### What deliberately did not change

- No terminal, reason code, pathway, packet family, form mapping, payment clamp or `operationallySellable` value. All 13 Massachusetts flow rows return the same terminal at this head as at the product base.
- No question was added, removed or reordered; no option value, type, `required` flag, `contextOnly` flag or stage moved. Screening parity against `main` holds byte-for-byte.
- The existing binding `MA:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k` → `wait-08`, which binds a no-new-record condition to a route whose name is *non-time-based*. It is recorded as a binding defect and left alone; the bindings file is shared.

### Terminals, before and after

| Measure | Value |
| --- | --- |
| Flow rows owned | 13 |
| Flow rows whose terminal moved | **0** |
| Terminal distribution at this head | `hard_stop` ×2, `guidance_only` ×8, `packet_ready_with_caution` ×2, `needs_more_info` ×1 |

The distribution above is the distribution at the base. Nothing in this shard moved a terminal, so there is no before-and-after table to write: the before and the after are the same row.

### Waiting-rule dispositions (6 fallback-dependent routes)

1 `EXPLICIT_BINDING_PROPOSED` · 2 `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` · 3 `LEGAL_OWNER_DECISION_REQUIRED`

| Route | Disposition | Rule(s) proposed | Duration as the profile states it |
| --- | --- | --- | --- |
| `juvenile-record-sealing-under-100b` | `EXPLICIT_BINDING_PROPOSED` | `wait-16` | 3 years |
| `adult-conviction-sealing-under-m-g-l-c-276-100a` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | `wait-13` if `offense_level` = "Misdemeanor"; `wait-14` if `offense_level` = "Felony" | 3 years / 7 years |
| `time-based-expungement-under-100f-100j` | `EXPLICIT_CONDITIONAL_BINDING_PROPOSED` | `wait-17` if `offense_level` = "Misdemeanor"; `wait-18` if `offense_level` = "Felony" | 3 years / 7 years |
| `automatic-non-conviction-sealing-for-not-guilty-no-bill-or-no-probable-cause-outcomes-100c` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `court-requested-sealing-for-dismissal-or-nolle-prosequi-100c` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |
| `marijuana-only-expungement` | `LEGAL_OWNER_DECISION_REQUIRED` | — | — |

Every rule id above is published by this jurisdiction's own compiled profile, and every duration is quoted from that rule as the profile already states it. No waiting period was authored here, no binding was added — `src/lib/rcap-engine/waiting-rule-bindings.json` is a shared path this shard may not touch — and no route is recommended ACTIVE. The full rationale, the quoted source text for every rule, and the candidate rules considered and rejected are in `data/expungement-ai/flow-audit/shard-results/SHARD-3.json` under `waitingRuleDispositions`.

### Legal questions still open

- **An existing binding needs counsel's eye.** `MA:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k` is bound to `wait-08`, a no-new-record condition, on a route whose name is *non-time-based*. Whether § 100K carries any waiting period at all is counsel's call.
- **The sex-offence branch of § 100A.** The proposed misdemeanour/felony conditional binding does not carry `wait-15` (15 years, or the registration-duty period, whichever is longer), because it keys on `offense_category` / `charge`, which this flow does not put to the participant. Counsel to confirm whether the two-branch binding may ship without it.

### Release-critical issues worked here

- **UX-COURT-001** (P1, release-critical) — the state-binding half is built: `src/lib/rcap/state-packs/massachusetts/controlled-filing-dataset.ts` publishes a controlled court and filing-destination list in which every row is quoted from this repository, plus a clearly-labelled manual-entry fallback, and `MA-massachusetts.json` now names it. The selector itself is Phase 2's half and is still outstanding: the renderer has no selector branch for a controlled-list question, and `toPublicQuestion` in `public-profile-projection.ts` is a strict allowlist, so a compiled profile cannot publish a dataset reference to the browser until that mapper names one. Both are prohibited shared paths for this shard.
- **UX-COUNTY-001** — not assigned to this jurisdiction in this shard (it assigns IN and MS only), so no Massachusetts filing-location list is authored here. The dataset records that explicitly rather than leaving an empty field to be misread as "none exist".
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

### Files this shard changed for MA

```text
src/lib/rcap-engine/compiled/profiles/MA-massachusetts.json
src/lib/rcap/state-packs/massachusetts/controlled-filing-dataset.ts
src/lib/rcap/state-packs/massachusetts/index.ts
docs/expungement-ai/flow-audit/state-reports/MA.md
```

No shared path, no other jurisdiction, and no file under `data/expungement-ai/phase2/`, `data/rcap-ledger/` or `src/lib/rcap-engine/waiting-rule-bindings.json` was modified.
