# Witness divergence diagnosis

All **284** intended-paid pathways from Session A's canonical graph (`25601ca0b07b0d1e…`).

| Outcome | Pathways |
|---|---|
| `correct_pathway` | 151 |
| `wrong_path` | 124 |
| `non_converging` | 9 |

## The baseline was wrong about itself

The committed witness answered `resolved_timing_bucket` with the **first** option,
`lt_1_year` — the least clearable value in a list ordered shortest to longest. Every route
carrying a waiting period therefore failed closed on an anchor it could never satisfy.

**19** pathways move from wrong-path to correct once the witness answers like a
genuinely clearable record. Those were never runtime defects, and reporting them as such
would have sent Session A after patches that do not exist.

## Shared defect clusters

What survives the corrected pass, grouped by cause. One correction per cluster.

Each pathway belongs to exactly one cluster, so the counts add up to the failing set and
a cluster means "fix this and these are done".

| Cluster | Pathways | Jurisdictions |
|---|---|---|
| `waiting_anchor_never_determined` | 109 | 36 |
| `requested_question_not_projected` | 18 | 8 |
| `compiled_rule_matched_another_route` | 3 | 2 |
| `waiting_rule_not_executed` | 2 | 2 |
| `guidance_only_route` | 1 | 1 |

### `waiting_anchor_never_determined` — 109 pathway(s)

**Cause.** The public intake asks whether the sentence is complete but never asks WHEN, so no anchor date exists and every route carrying a waiting period fails closed.

**Exact shared runtime correction.** One evaluator/projection correction: supply a waiting-period anchor date from the public intake — an anchor-date question, or accept resolved_timing_bucket as the anchor — so specialRouteTiming can execute instead of failing closed. It is one correction for the whole class, not one per route.

### `requested_question_not_projected` — 18 pathway(s)

**Cause.** The evaluator asks for a question id the public profile projection never renders, so a real participant is asked for a fact the guided check has no question for and the exchange cannot complete.

**Exact shared runtime correction.** One projection correction: render these question ids in projectPublicProfile for the affected jurisdictions, or stop the evaluator requesting them there. Measured corpus-wide it is resolved_timing_bucket in CT, MD, MI, NJ, OH and WA and arrest_date in IN — six jurisdictions and one question, plus one more.

### `compiled_rule_matched_another_route` — 3 pathway(s)

**Cause.** A compiled rule matched and selected a different route than the one the participant named.

**Exact shared runtime correction.** A pathway-priority decision: either the matched rule should not outrank the named route, or the named route is genuinely unreachable on these facts and Session A should say so.

### `waiting_rule_not_executed` — 2 pathway(s)

**Cause.** A waiting rule exists for the route but never runs on the supplied facts.

**Exact shared runtime correction.** Same class as the anchor defect: execute the route's waiting rule once an anchor is available, rather than returning needs_review.

### `guidance_only_route` — 1 pathway(s)

**Cause.** The evaluator classifies the route as guidance with no participant filing.

**Exact shared runtime correction.** A classification question for Session A and counsel, not an evaluator patch.

## Fixtures

`data/rcap-ledger/public-witness-fixtures.json` carries **151** replayable fixtures — every
pathway the existing runtime already reaches, with the exact answers and the terminal
result each must produce. A regression shows up as a fixture failure rather than a lost route.

Regenerate with `node scripts/generate-rcap-witness-divergence-diagnosis.mjs`.
