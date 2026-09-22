# #63 acceptance boundary

Read before integrating any #63 correction. Established by Captain by reading
the code and measuring the compiled profiles, independently of whatever Codex
reports.

**This revision corrects four counting defects in the first version.** The
original instrument transcribed only 2 of the 15 production
`UNIVERSAL_PREPAY_FACT_IDS`, so it counted legitimate universal facts as foreign
injection and materially overstated the blast radius. The numbers below are the
corrected measurement. Wherever this document and the first version disagree,
this one is right.

## The defect, exactly

`routeDecidingFactIds` in `src/lib/rcap-engine/route-fact-relevance.ts` scopes
decision rules properly:

```js
for (const rule of orderedDecisionRules) {
  const candidates = rule.candidatePathwayIds ?? [];
  if (candidates.length === 0 || candidates.includes(pathway.id)) collectFieldIds(rule, deciding);
}
```

and then does not scope the next two lines at all:

```js
collectFieldIds(profile.exclusionRules, deciding);
collectFieldIds(profile.waitingPeriodRules, deciding);
```

The sibling `pathwayRelevantFactIds` sweeps the same way on purpose and its own
comment says so. That function answers a different question and is out of scope.
A correction that changes it has exceeded the task.

## Deciding-set size is not foreign-fact count

`routeDecidingFactIds` returns a **set of fact IDs**, not a set of rules. A rule
that has nothing to do with a route but references a fact the route already
holds — universal, its own pathway clauses, a decision rule naming it, or its
escalation entry — adds **nothing** to the returned set. Sweeping is not the
same as injecting.

Measured across all 344 routes, the sweep touches 3,645 (route, fact) pairs.
Only **669 of them are genuinely foreign**. The rest are already held:

| basis | pairs | meaning |
|---|---|---|
| universal | 1,874 | in `UNIVERSAL_PREPAY_FACT_IDS`; blocking on every route anyway |
| **foreign** | **669** | **present only because of the unscoped sweep — the #63 defect** |
| pathway | 659 | already named by the route's own compiled clauses |
| decision | 442 | already named by a decision rule that names this route |
| escalation | 1 | already named by `ROUTE_ESCALATION_FACT_IDS` for this route |
| prose | 0 | free text admitted as an ID (none present; see rule shapes below) |

### Worked reconciliation — ND:first-offense-possession-sealing

This route was earlier observed with 52 entries. That number is the **size of
the returned deciding set**, and it is not a count of foreign facts.

| | |
|---|---|
| deciding set without the sweep | 51 |
| deciding set with the sweep (what the function returns) | **52** |
| facts the sweep touches | 9 |
| of those: universal | 5 — `case_outcome`, `offense_level`, `charge`, `pardon_status`, `criminal_history` |
| of those: pathway | 2 — `offense_category`, `record_type` |
| of those: decision | 1 — `court` |
| of those: escalation | 0 |
| of those: prose | 0 |
| **genuinely foreign** | **1 — `county`** |

So the sweep costs this route exactly one fact. The correct statement is "52
deciding facts, of which one is there only because of the unscoped sweep", not
"52 foreign facts".

## The real population — what completeness means

| | |
|---|---|
| jurisdictions | 51 |
| routes | 344 |
| **routes carrying genuinely foreign facts** | **250** |
| **jurisdictions with at least one affected route** | **45** |
| jurisdictions clean | 6 |
| median foreign facts on an affected route | 2 |
| worst single route | 10 |

Worst affected are eight Mississippi routes at 10 foreign facts each.

## Rule-shape inventory — the evidence for "nothing carries scoping"

Measured, not inferred from prose:

| | |
|---|---|
| exclusion rules | 704 |
| waiting-period rules | 822 |
| total | 1,526 |
| object rules | 1,526 |
| raw-string rules | 0 |
| with `candidatePathwayIds` | **0** |
| with `pathwayId` / `pathwayIds` | **0** |
| with `routeId` / `routeIds` | **0** |
| with any machine-readable ownership | **0** |
| with no machine-readable ownership | **1,526** |
| profiles carrying a populated `questionLifecycle.routeConsumers` | 8 of 51 |
| unowned rules living in those 8 profiles | 228 |
| of those, fully recoverable via `routeConsumers` | 0 |
| of those, partially recoverable | 2 |

Note on that last block: the `routeConsumers` key exists on all 51 profiles but
is an empty object on 43 of them. Empty is no data, so only populated maps are
counted — otherwise "51 of 51" would read as coverage that does not exist.

The zeros are the load-bearing figures. No exclusion or waiting rule in any
jurisdiction carries pathway scoping today, and route ownership is not
recoverable from `routeConsumers` for any of them. The correction must
introduce or derive that scoping. It cannot read it.

## What under-collection would look like

- A correction demonstrated on Mississippi, or on the worst-count states, and
  presented as closing #63. 250 routes across 45 jurisdictions are affected.
- Scoping added only to the easily classified rules, with the residue unstated.
- Assuming the 6 clean jurisdictions rather than proving they stayed clean.
- Counting rules touched instead of routes changed. 1,526 rules and 344 routes
  are different denominators, and 3,645 swept pairs is a third.

## The direction that matters more than the count

Over-inclusion — today's defect — asks a participant for a fact that does not
decide their route. That is friction.

Under-inclusion drops a rule that *does* decide the route. An exclusion exists
to stop a sale. Removing one that genuinely reaches a route lets the product
offer that route to someone the exclusion should have stopped. That failure does
not appear as a red check; it appears as a smaller, cleaner-looking number.

So a shrinking deciding set is not by itself evidence of correctness. Every
removal of an exclusion-derived fact needs a stated basis for why that exclusion
does not reach that route. A count is not a basis.

## How to check it

```
node scripts/measure-route-deciding-fact-scope.mjs
node scripts/measure-route-deciding-fact-scope.mjs --route ND:first-offense-possession-sealing
node scripts/measure-route-deciding-fact-scope.mjs --ledger data/rcap-grade-a/mission-lock/task63-acceptance
node scripts/measure-route-deciding-fact-scope.mjs --baseline \
  data/rcap-grade-a/mission-lock/task63-acceptance/deciding-fact-census-a1329224b.json
```

`--ledger` writes `deciding-fact-ledger.json`: **every** (route, fact) pair the
sweep contributes — 3,645 rows — each carrying jurisdiction, pathway, fact,
`fromExclusionRules`, `fromWaitingRules`, `retainedByOtherAuthority` and
`basis`. The console summarises; the ledger is what the review reads. Console
truncation is never the evidence.

Exit codes: `1` regression present, do not integrate; `2` partial, confirm the
residue is a stated boundary and not under-collection; `0` complete on coverage,
with per-route correctness still to be read; `3` instrument drift.

### Drift protection

The universal set is transcribed in the instrument so that a regression in the
module under test cannot make the measurement agree with it by construction. A
duplicated list rots, so the transcription is not trusted on its own: the
production constant is parsed out of `route-fact-relevance.ts` and asserted
identical to the transcription on every run. Any mismatch exits `3` and names
the differing IDs, because every number below it would be wrong. This is the
check that would have caught the original 2-of-15 error immediately.

## Not part of #63

Keep separate and do not let a #63 correction absorb any of them: #60 (stale
commercial projections on the retired Oregon route — verified NOT corrected by
#52), #55 (IL felony-prostitution-relief missing one Grade-A fulfillment
proof), #49 (external PostgreSQL/hosted evidence), #42, #58 (CC-1472
currentness), #61 and #62 (Connecticut), and the two reproduced baseline
verifier failures: the stale MS non-conviction manifest proof, and the WY
error-prefix mismatch in `test-wy-unchanged-track-authority`, which fails
identically at the pre-#53 baseline `16aaf5ea0`.
