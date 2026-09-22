# #63 — shared route-deciding fact scope: Captain handoff

Base: `c594babcf880f4eab38eaff4fa8ef04adb3e53ab`, fetched from origin and checked out directly before mutation. This is internal work item #63, not GitHub Issue #63. Implementation is ready for Captain integration; no release, deployment, legal approval, or new route authority is asserted.

## Root cause and measured inventory

The old route-deciding collector traversed every exclusion and waiting rule, treated unscoped ordered rules as universally applicable, and admitted every string encountered in arrays. That included rule prose, outcome values, source references, and pathway IDs. Total set size therefore was not a count of foreign participant facts. The provisional 282/344 acceptance figure was not used.

Measured all 51 compiled profiles, before editing:

| Structure | Actual shape / ownership |
| --- | --- |
| 2,923 ordered rules | 2,656 have nonempty `candidatePathwayIds`; 51 have empty lists; 216 omit the list. 343 also have `when.backendPathwayId`. |
| Scoped ordered rules | Includes 405 `timing_and_completion` and 230 `exclusion_screen` rules. These authored candidate bindings survive. |
| 704 top-level exclusions | Objects with `id`, `ruleText`, `fieldsReferenced`, `suggestedResultCode`; none has an explicit pathway binding. |
| 822 top-level waits | Objects with `id`, `ruleText`, `fieldsReferenced`, `duration`, `anchor`; none has an explicit pathway binding. `anchor` here is descriptive text, not a fact-ID property. |
| Lifecycle | All 51 profiles have the envelope; 8 have populated `routeConsumers`, covering 22 question IDs: CA, DC, HI, IN, MD, MO, NY, WI. |
| 344 pathways | All have `triggerFields` and prose `ruleClauses`. `waitingRules` and `exclusionRules` are prose arrays. 149 have authored `screeningFactIds`; 69 have `anchorFactId`; 17 have nonempty `anchorAlternates`. `requiredFacts` is descriptive, not a fact-ID array. |
| Escalation | Existing `ROUTE_ESCALATION_FACT_IDS` bindings remain authoritative and unchanged. Tests exercise every existing binding, including one without a duplicate profile field. |

Unscoped ordered/exclusion/wait objects respectively contain: 151/112/111 empty field lists; 73/271/367 lists containing only universal facts; 43/321/344 lists requiring non-universal consumer resolution. Those counts classify field references, not the legal applicability of prose.

## Exact shared change

`routeDecidingFactScope()` derives ownership from the existing profile and escalation bindings; it does not create another authored registry. Explicit rule candidate/pathway IDs take precedence for that rule; lifecycle consumers constrain direct pathway fields; direct pathway fields and existing escalation bindings establish other consumers. Unscoped rules cannot manufacture additional consumers. Universal facts remain present regardless of route.

The new collector accepts strings only from field-bearing schema properties (`fields`, `fieldIds`, `fieldsReferenced`, `triggerFields`, `requiredFields`, `requiredInputIds`, `questionIds`, `screeningFactIds`, timing-anchor arrays and typed scalar fact/anchor properties). Prose arrays, source references, outcomes and candidate IDs are not fact arrays.

`routeDecidingFactIds()` returns the scoped IDs. Its companion scope result reports unresolved rule IDs, sections and fields. Production `packetCollectionFor()` now uses that scoped result for confirmation classification. If a required packet fact has no established route consumer, collection reports `unresolved_route_rule_scope`, retains the existing participant gate, and does not infer an answer. Exact known answers still carry forward. Packet requirements, specification/external-actor ownership and existing overrides remain authoritative.

The prior broad `pathwayRelevantFactIds()` result remains unchanged and separately protects materialization: a smaller confirmation set cannot suddenly synthesize a new evaluator input from an alias or derivation. This separation is necessary to preserve the accepted route-drift safeguard; it does not reclassify broad ambiguity inputs as narrower route identity facts.

Unresolved non-universal fields were found in 14 profiles: AR `residency_or_location`; GA `age_at_offense`, `county`; HI `residency_or_location`; IL `county`; IN `record_type`; MD `county`; MN `residency_or_location`; MO `court`; ND `county`, `prior_relief`; NM `case_number`, `county`; OH `court`; PA `case_number`; TX `arrest_date`; VA `residency_or_location`, `trafficking_status`. These are existing missing ownership relationships, not newly authored rules. They are reported and conservatively collected where required, not silently applied to all routes as legal conditions.

No compiled profile, statutory specification, screening question, commercial authority record, receipt/payment record, or evaluator rule changed. ND quantity, first-offense, two-year and judgment screening-input limitations remain separate; this work does not establish screenability.

## Before/after facts by provenance

Categories below are exclusive in the displayed order. Pathway-owned includes explicit lifecycle consumption. A fact with both pathway and escalation provenance is counted once, under pathway-owned; this does not mean its escalation binding was removed. Non-fact values include outcome values and route/source IDs even when their spelling looks like an identifier.

| Provenance | ND first possession | ND general sealing | ND summary pardon |
| --- | ---: | ---: | ---: |
| Universal (all 15 production IDs) | 15 → 15 | 15 → 15 | 15 → 15 |
| Pathway-owned | 2 → 2 | 3 → 3 | 6 → 6 |
| Scoped ordered-decision rule | 3 → 3 | 2 → 2 | 1 → 1 |
| Route escalation, not already counted | 0 → 0 | 0 → 0 | 0 → 0 |
| Exclusion/wait sweep only | 1 → 0 | 1 → 0 | 1 → 0 |
| Raw prose / non-fact identifier | 30 → 0 | 71 → 0 | 69 → 0 |
| Additional finding: unscoped ordered rule only | 1 → 0 | 1 → 0 | 1 → 0 |
| Total (not a foreign-fact measure) | 52 → 20 | 93 → 20 | 93 → 22 |

First possession retains pathway-owned `offense_category`, `record_type`, and scoped-rule `disposition_date`, `court`, `age_at_offense`, plus the 15 universals. `county` was sweep-only; `prior_relief` came from an unscoped ordered rule. Both lack established ownership rather than being proven conditions of a neighboring route. General sealing retains its authored `residency_or_location`; summary pardon retains its authored `trafficking_status`, `residency_or_location`, age and disposition fields. Neighboring identity is not merged.

The removed prose includes the Chapter 12-60.1 three/five-year statements, clear-and-convincing text, 45-day hearing floor, pardon five-year condition, DUI seven-year text, and descriptive first-possession text itself. Removing prose from a fact-ID set changes neither its legal source nor the packet specification.

Across all 344 routes, exclusive fact-membership counts (a shared fact is counted on each consuming route) are: universal 5,160 → 5,160; pathway-owned 989 → 1,018; scoped ordered 570 → 570; escalation-only 1 → 1; exclusion/wait sweep-only 698 → 0; prose/non-fact values 17,142 → 0; unscoped ordered-only 32 → 0. These are provenance measurements, not an acceptance denominator or an assertion that every removed field was legally foreign. The 29 additional memberships come from previously skipped typed scalar facts/anchors and explicit lifecycle consumption, preventing under-collection.

## Preservation and validation

Reproducible comparison:

```sh
node scripts/test-route-fact-relevance.mjs --mutations
node scripts/verify-route-fact-relevance-preservation.mjs --compare-base c594babcf880f4eab38eaff4fa8ef04adb3e53ab
```

The preservation runner loads exact baseline versions of the three changed production modules in an isolated loader, against the unchanged profile/authority inputs. It does not mutate tracked files. All **344 routes / 688 real evaluator cases** compare identically for full evaluator results, route identities, `paymentAllowed`, packet collection gates and materialized values, subsequent evaluation, ambiguity relevance, commercial status and DTC/sponsored fulfillment decisions. Throws are failures, not credited preservation. Snapshot SHA256: `6e779e51347b48e021a2d02f63641a8ba622c165e6cdc367885e10b0eeca7be3`.

There are real positive authority controls: the same five bound DTC fulfillment positives and four sponsored positives survive; MS non-conviction retains its separate sponsored hold. Fulfillment status is not a claim that every participant on those routes is ready to purchase. The existing #52 matter-readiness tests exercise valid and denied final-verification bindings in DTC and sponsored channels. No smaller deciding set grants payment, sponsorship, Grade-A authority or a new route.

The focused matrix covers ND siblings, CA dismissal versus both Proposition 64 remedies, HI non-conviction versus drug/DUI court-order consumers, explicit waiting/exclusion ownership, global metadata consumers, unknown ownership, every universal and escalation binding, every supported fact-array property, and scalar anchors/selectors. A real NY CPL 160.59 case with its escalation questions answered still returns its own route, `not_yet`, `paymentAllowed=false`, reason `ny.timing_bucket_too_recent`.

All 11 requested in-memory mutations were killed by behavioral assertions after successful compilation: all-exclusion sweep; all-wait sweep; prose admission; ignoring candidate IDs; ignoring lifecycle consumers; dropping a universal; dropping a scoped waiting fact; cross-routing an ND general fact; cross-routing an ND pardon fact; cross-routing Prop64 into dismissal; removing escalation. Running the focused test against the exact original relevance module also fails on the original ND deciding set.

Passed:

- `test-route-fact-relevance.mjs --mutations`
- `verify-route-fact-relevance-preservation.mjs --compare-base <base>`
- `verify-nd-first-offense-possession-scope.mjs`
- `verify-packet-collection.mjs`
- `verify-rcap-evaluator-public-ambiguity.mjs`
- `verify-expungement-approximate-timing-screening.mjs`
- `test-commercial-readiness.mjs`
- `verify-expungement-commercial-flow-contract.mjs`
- `test-consumer-checkout-stored-session.mjs`
- `test-briefcase-presentation-authority.mjs`
- `test-expungement-consumer-payment-receipt.mjs`
- `verify-rcap-grade-a-fulfillment-authority.mjs`
- `verify-rcap-prepay-question-gate.mjs`
- `npm run typecheck`, `npm run build`, focused ESLint, `git diff --check`.

Baseline-identical exceptions (full outputs compared byte for byte):

- `test-expungement-checkout-guards.mjs`: its old positive fixture lacks `formSetSha256`, `formSetVersion`, `legalRuleVersion`, and `routeContractVersion`; #52 correctly refuses it with `participant_context_denied`. The current commercial-readiness and commercial-flow tests pass; no binding check was relaxed to rescue this older fixture.
- `verify-rcap-evaluator-rule-driven-safety.mjs`: its Maryland fixture expects `not_yet`/`needs_review` but returns `needs_more_info` with `waiting_anchor_missing` on both versions. Its failure is unchanged; the new NY test separately proves an actual waiting refusal.
- `verify-atomic-sponsored-packet-finalization.mjs` and `test-rcap-sponsored-delivery-binding.mjs`: **NOT RUN**, local PostgreSQL toolchain unavailable in both runs. In-memory commercial/sponsored authority preservation passed; no hosted/PostgreSQL evidence is claimed.

No new implementation defect was detected in this proof. Unresolved source scoping and unaskable ND statutory facts remain explicitly identified above. #60, #55, #42, #49 hosted evidence, #58, #61 and the unrelated MS/WY proof items were not repaired or absorbed.

## Changed symbols and integration boundary

- `src/lib/rcap-engine/route-fact-relevance.ts`: typed deciding-fact collector, explicit rule scope resolution, `RouteFactScope`, `routeDecidingFactScope`, `routeDecidingFactIds`. Existing broad relevance and escalation/universal registries unchanged.
- `src/lib/expungement-ai/packet-information.ts`: `packetCollectionFor` consumes scoped facts and preserves the independent materialization guard for both channels.
- `src/lib/expungement-ai/packet-collection.ts`: `PacketCollectionInput`, `resolvePacketCollection` preserve required unknown-scope inputs without synthesizing facts.
- The two task-specific verification scripts above and this handoff.

Captain should compare the resulting candidate against the corrected independent acceptance ledger, integrate only this bounded change, and recheck the integrated head. No next work item is started on this branch state.
