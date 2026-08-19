# Public-witness reachability: the four defects and what each one was

The deterministic public witness drives one participant per intended-paid pathway
through the real public evaluator and records the whole exchange. At the start of
this round, 284 intended-paid pathways produced:

| | before | after |
|---|---|---|
| settle on a terminal evaluation within 24 rounds | 271 | **284** |
| reach their own intended pathway | 132 | **284** |
| terminate reporting some other pathway | 139 | **0** |
| do not settle | 13 | **0** |
| payment allowed at the evaluator | 17 | 31 |

No witness round count was raised, no expected pathway id was forced into a test,
and no impossible answer was manufactured. Four defects were fixed in the shared
runtime; every one of them was a real defect a participant would have hit.

---

## 1 — The evaluator asked for a fact the public profile never offered

**Class: missing public question.** 12 of the 13 non-converging pathways.

The waiting-period gate falls back to `resolved_timing_bucket` — "about how long
ago did this case end?" — whenever it has no exact anchor date, and names that id
in `missingQuestionIds`. The public profile only ever produced that question by
*substitution*, where a `date_or_unknown` question already sat in the prepay
timing gate. In profiles where no date question landed in that phase, the
evaluator asked for a question the participant was never shown.

The exchange then looped exactly as a real participant's would: the client
supplied the id, the request validator rejected it as not a public question, the
evaluator asked again. 24 rounds, no terminal result.

```
{"round":2,"requested":["resolved_timing_bucket"],"supplied":{"resolved_timing_bucket":"No"}}
{"round":3,"droppedAsNotEvaluatorQuestions":["resolved_timing_bucket"]}
{"round":4,"requested":["resolved_timing_bucket"],"supplied":{"resolved_timing_bucket":"No"}}
…
```

Affected: `CT:petitioned-clean-slate-erasure…`, all four Maryland pathways,
`MI:misdemeanor-marijuana-set-aside…`, all three New Jersey pathways,
`OH:human-trafficking-survivor-non-conviction-expungement…`, and both Washington
pathways.

**Fix.** `withBroadTimingBucketGate` in the public profile projection: any profile
that can reach the timing gate publishes the bucket question. It is optional, so
it never blocks a participant who gave an exact date; it exists so the fallback
the evaluator already relies on is answerable. It is applied last, after the
court-requirements gate has run, because that gate infers "this profile is
timing-gated" from the presence of a bucket question and would otherwise have
introduced a newly *required* court-completion question everywhere.

## 2 — The evaluator named an anchor that profile does not publish

**Class: missing public question.** The 13th non-converging pathway.

`IN:non-conviction-arrest-or-criminal-charge-expungement` runs its one-year wait
from `arrest_date`, and Indiana's public profile has no `arrest_date` question.
Same loop as above, different id.

**Fix.** `answerableAnchorIds` in the evaluator filters the anchors it will name
to the ones the profile actually publishes, and falls back to the timing bucket
when none survives. If neither is publishable the result is an explicit
`waiting_anchor_not_publicly_askable` review rather than an unanswerable request.

## 3 — A resolved pathway was dropped on the way out

**Class: the routes never diverged.** 118 of the 121 remaining wrong-pathway
outcomes, plus the 92 that had been reported as `waiting_anchor_not_determined`.

This is the large one, and it was not a routing defect at all. The evaluator
resolved the participant's pathway correctly and then built its result without
`pathwayId` on three branches — the three timing-gate outcomes
(`missing_anchor`, `not_yet`, `needs_review`) and the compiled-route failures
(`selected_pathway_rule_not_matched`, and rules whose own
`suggestedResultCode` is `needs_more_info` or `hard_stop`). Every other branch on
the same path reports it.

For the participant, that means being told "we need one more detail" with no
indication of which remedy they were being screened for. For a reachability
audit, an absent pathway id is indistinguishable from landing somewhere else,
which is why the headline read "terminates on another pathway: 139" when only
three witnesses actually did.

**Fix.** Report the identity that was already resolved. `RouteMatch` carries a
`selectedPathwayId` on its failure variant, and all four sites report the pathway
and its packet plan. No result code changes, no eligibility conclusion changes,
and `paymentAllowed: false` stays exactly as it was on every one of these
branches.

A related refusal was removed in the same gate: where a compiled rule phrases its
anchor in words the anchor chooser does not match, the gate returned
`waiting_anchor_not_determined` even though the participant had already answered
the timing bucket and the duration was known. It now runs the wait against the
bucket, which is the same computation used everywhere else an exact anchor is
missing.

## 4 — Four routes could not be named in the public route splitter

**Class: missing differentiating question.** The last 4 wrong-pathway outcomes,
and the only genuine route divergences in the set.

`possible_pathway_context` is where a participant says which remedy they believe
applies, and pathway selection matches it exactly before falling back to token
heuristics over `case_outcome`. Four intended-paid pathways were missing from the
curated option list, so the answer that would have identified them could not be
given, and the heuristics chose a neighbour:

| intended | actually reached | why |
|---|---|---|
| `AK:confidentiality-of-acquittals-and-dismissals…` | `sealing-for-mistaken-identity-or-false-accusation…` | not offered; dismissal tokens matched the neighbour first |
| `CA:prop-64-completed-sentence-application-11361-8` | `tool-1-dismissal-set-aside` | not offered; the classic expungement rule outranked it |
| `CA:prop-64-currently-serving-petition-11361-8` | `tool-1-dismissal-set-aside` | same |
| `MD:pardoned-conviction-expungement…10-105(a)(8)` | `adult-non-conviction-expungement…10-105` | not offered; "pardoned conviction" is a conviction by token, and the non-conviction label matched first |

**Fix.** `withCompletePathwayContextOptions` appends any compiled pathway the
curated list does not already cover, by its own label, before the trailing "none
of these" option. Curated wording is left untouched wherever it already covers a
route. Across all 51 jurisdictions this added exactly these four options.

---

## What was not done

- No witness round limit was raised. The limit is still 24 and every witness now
  settles well inside it.
- No expected pathway id was asserted into a fixture.
- No answer was invented that a real participant could not give. One pinned
  answer was added to the witness's clear-record premise —
  `resolved_timing_bucket: "gt_10_years"` — because the generic single-select
  rule would otherwise pick the first option, `lt_1_year`, and record a clearable
  record as still inside its waiting period, directly contradicting the pinned
  2012-06-01 anchor date the same premise already uses.
- No eligibility rule, remedy, mandatory filing, venue or service party changed.
  Payment remains refused on every branch where it was refused before.

Regenerate with `npm run rcap:generate-public-witness`; `--check` proves the
answer sets reproduce byte for byte.
