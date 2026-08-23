# Human review required

**Base SHA:** `dd93579871962260b12918e54c44cf9bf1e81529`

Phase 1 does not decide any of the questions below. Each one needs a person — counsel for the legal items, the product owner for the scope items — before Phase 2 or Phase 3 touches the code it names.

## 1. Jurisdictions where no packet-ready outcome is reachable from the rendered screens

19 jurisdictions: `AZ`, `CA`, `CT`, `DC`, `FL`, `GA`, `IA`, `IN`, `KS`, `MI`, `MT`, `NJ`, `NM`, `OK`, `PA`, `RI`, `SC`, `SD`, `UT`.

Each is marked `live` with the Expungement.ai channel approved in `src/lib/rcap/state-promotion-manifest.ts`. The bounded search in `data/expungement-ai/flow-audit/ui-reachability.json` found no answer set, drawn only from the rendered screens, that produces `packet_ready` or `packet_ready_with_caution`.

**The question for each state:** is the missing fact a legal precondition that genuinely must be established before a packet, in which case the flow must ask for it prepay — or is the route not actually available to a self-help participant in that state, in which case the promotion manifest is claiming more than the product does?

| Jurisdiction | Best terminal from rendered screens | Rendered screens | Compiled pathways | Facts the evaluator uses that the flow never asks |
| --- | --- | --- | --- | --- |
| `AZ` | `not_yet` | 9 | 3 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `CA` | `needs_review` | 15 | 7 | `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `CT` | `not_yet` | 10 | 5 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed` |
| `DC` | `not_yet` | 11 | 7 | `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed` |
| `FL` | `not_yet` | 13 | 8 | `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed` |
| `GA` | `not_yet` | 12 | 5 | `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `IA` | `not_yet` | 9 | 5 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `IN` | `needs_more_info` | 8 | 4 | `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `KS` | `not_yet` | 7 | 4 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `MI` | `not_yet` | 10 | 5 | `financial_obligations`, `new_convictions_during_waiting_period`, `record_documents`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `MT` | `not_yet` | 13 | 5 | `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `NJ` | `not_yet` | 14 | 4 | `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `NM` | `not_yet` | 12 | 5 | `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `OK` | `not_yet` | 12 | 18 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed` |
| `PA` | `needs_more_info` | 6 | 11 | `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `RI` | `needs_more_info` | 6 | 8 | `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed` |
| `SC` | `not_yet` | 14 | 7 | `new_convictions_during_waiting_period`, `record_documents`, `special_preconditions_confirmed` |
| `SD` | `not_yet` | 12 | 8 | `new_convictions_during_waiting_period`, `pending_cases`, `record_documents`, `special_preconditions_confirmed` |
| `UT` | `needs_more_info` | 6 | 11 | `financial_obligations`, `new_convictions_during_waiting_period`, `pending_cases`, `sentence_completion_date`, `special_preconditions_confirmed` |

## 2. Exclusion and timing answers that do not change a packet-ready outcome

Two deterministic probes hold a clear record and change exactly one answer. Selecting the first non-'None of these' state exclusion category still returns packet_ready_with_caution in 5 jurisdiction(s); choosing the shortest timing bucket still returns packet_ready_with_caution in 5. Both land on non-conviction routes, where an exclusion category or a waiting period may genuinely not apply. This is recorded as a legal question, not asserted as a bug: whether the exclusion list and the timing rule are meant to bind those routes is a source-law decision the audit cannot make.

**Exclusion category selected, still packet-ready:**

| Jurisdiction | Pathway |
| --- | --- |
| `HI` | `nonconviction-arrest-expungement` |
| `LA` | `non-conviction-arrest-expungement` |
| `MS` | `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` |
| `NH` | `annulment-after-dismissal-acquittal-or-nonprosecution` |
| `OH` | `adult-non-conviction-sealing-or-expungement-under-2953-33` |

**Shortest timing bucket selected, still packet-ready:**

| Jurisdiction | Pathway |
| --- | --- |
| `CA` | `tool-1-dismissal-set-aside` |
| `HI` | `nonconviction-arrest-expungement` |
| `IL` | `adult-non-conviction-expungement` |
| `LA` | `non-conviction-arrest-expungement` |
| `MS` | `non-conviction-expungement-for-dismissal-no-disposition-or-acquittal` |

**The question:** on a non-conviction route, is the state exclusion list meant to bind at all, and is a waiting period meant to run? If the answer is no for both, these are correct outcomes and the audit should record them as such. If the answer is yes for either, the rule is wrong and the fix belongs to a state shard.

## 3. Questions with no discoverable purpose

- `case_identifier`
- `county_or_filing_location`
- `last_conviction_date`
- `probation_parole_supervision_end_date`
- `record_documents`

None is removed by this phase, per governance rule 8. Each is served in the public profile payload, is not in any pathway's `requiredInputIds` so the packet-information builder never renders it, and is read by no compiled rule, waiting rule, exclusion rule, timing anchor, or evaluator branch. `record_documents`'s only named consumer anywhere in `src` is the drop-point nudge email's question-to-copy map.

**The question:** was each of these meant to be asked and wired, or meant to be dropped from the payload?

## 4. The pre-rebuild legacy-matter fixture

The redirect-cycle canary (`UX-GLOBAL-001`) is established from source, not from a browser, because no database exists in this session (blocker `ENV-005`). To reproduce it in one staging pass, insert a single synthetic matter shaped like this:

```json
{
  "state": "MS",
  "resultCode": "packet_ready_with_caution",
  "paymentAllowed": false,
  "pathwayLabel": "a label that does NOT string-match any packetGenerator pathwayLabel",
  "artifactRefs": {}
}
```

Either condition alone is sufficient: `paymentAllowed: false` trips the guard mismatch between the two pages, and an unmatched `pathwayLabel` with no `artifactRefs.commercialFlow` makes `commercialFlowForItem` return null on both pages. Then open `/briefcase/{id}`, click **Complete packet information**, and observe the refusal screen whose only action returns to `/briefcase/{id}`.

**The question for the owner:** does a matter in either state exist in production today? The audit cannot see production data and does not want to.

## 5. Scope decisions the audit deliberately did not make

- **County and court datasets do not exist.** `UX-COUNTY-001` and `UX-COURT-001` name the gap, not a source. Choosing the county and court data source is a product decision with licensing and freshness consequences; the master plan lists `TEST_COUNTY_AND_COURT_DATA_SOURCE` as an owner-supplied input and none was supplied.
- **Discount codes.** `UX-GLOBAL-009` records that no discount entry exists and that the only code concept in the product is a partner sponsorship grant. Whether Expungement.ai should accept discount codes at all is a commercial decision.
- **The `contextOnly` contradiction.** The frontend contract says a `contextOnly` question never selects the pathway; `selectPathway` reads `possible_pathway_context` first. Changing either side changes behaviour, so Phase 1 only records it.

## 6. Issues already marked legal-review-required in the register

- **UX-STATELAW-001** (P0, `STATE_LEGAL_LOGIC`) — 19 jurisdictions reach no packet-ready outcome when the audit answers only the screens the flow renders
- **UX-LEGAL-001** (P1, `REQUIRES_LEGAL_REVIEW`) — Selecting a state exclusion category still returns packet-ready in some jurisdictions, and so does the shortest timing bucket
