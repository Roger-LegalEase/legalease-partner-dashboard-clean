# #63 acceptance boundary

Read before integrating any #63 correction. Established by Captain at
`c594babcf880f4eab38eaff4fa8ef04adb3e53ab` by reading the code and measuring the
compiled profiles, independently of whatever Codex reports.

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

Every exclusion and waiting rule in a jurisdiction therefore lands in every
route's deciding set. Because this set decides which facts a participant must
supply before a route can be sold, a rule that decides one route becomes a
payment gate on routes it has nothing to do with.

The sibling function `pathwayRelevantFactIds` sweeps the same way on purpose,
and its own comment says so. That one answers a different question and is not
in scope here. A correction that changes it has exceeded the task.

## The real population — what completeness means

Measured across all 51 compiled profiles:

| | |
|---|---|
| jurisdictions | 51 |
| jurisdictions with exclusion or waiting rules | 51 |
| jurisdictions with more than one pathway, where the sweep can leak | 51 |
| exclusion rules | 704 |
| waiting-period rules | 822 |
| **of those 1,526 rules, carrying any pathway scoping today** | **0** |
| routes | 344 |
| **routes carrying facts injected by the sweep** | **282** |
| jurisdictions with no affected route | 2 of 51 |
| median injected facts on an affected route | 3 |
| worst single route | 14 |

Worst affected routes are Mississippi's, at 14 injected facts each, including
`arrest_date`, `county`, `court` and `court_requirements_completed`.

The zero in that table is the important number. No exclusion or waiting rule in
any jurisdiction currently carries pathway scoping, so this cannot be fixed by
reading scoping data that already exists. The correction must either introduce
that scoping across 1,526 rules, or derive the scope some other way. Either
path is a 51-jurisdiction change, and a proof that covers a handful of states
has not shown the defect closed.

## What under-collection would look like

- A correction demonstrated on Mississippi, or on the states with the worst
  counts, presented as closing #63. 282 routes are affected across 49
  jurisdictions; the loud ones are not the boundary.
- Scoping added only to rules that were easy to classify, leaving the ambiguous
  ones swept, with the residue unstated.
- A per-jurisdiction fix that silently leaves the two already-clean
  jurisdictions unexamined, so their cleanliness is assumed rather than proved.
- Evidence counted in rules touched rather than in routes whose deciding set
  actually changed. Rules and routes are not the same denominator.

## The direction that matters more than the count

Over-inclusion and under-inclusion are not symmetric here.

Over-inclusion — today's defect — asks a participant for a fact that does not
decide their route. That is friction, and it is what #63 exists to fix.

Under-inclusion drops a rule that *does* decide the route. An exclusion exists
to stop a sale. Removing one from a route's deciding set where it genuinely
reaches that route means the product can offer the route to someone the
exclusion should have stopped. That is a worse failure than the one being
fixed, and it would not show up as a red check — it would show up as a
smaller, cleaner-looking number.

So a shrinking deciding set is not by itself evidence of correctness. Every
removal of an exclusion-derived fact needs a stated basis for why that
exclusion does not reach that route. The instrument lists these individually
rather than counting them as progress.

## How to check it

```
node scripts/measure-route-deciding-fact-scope.mjs
node scripts/measure-route-deciding-fact-scope.mjs --baseline \
  data/rcap-grade-a/mission-lock/task63-acceptance/deciding-fact-census-c594babcf.json
```

The census pinned in this directory was taken at `c594babcf`. Review mode
reports routes improved, routes still affected, routes that got worse, routes
that appeared or disappeared, the jurisdictions still sweeping unscoped, and
every exclusion-derived removal for reading.

Exit codes: `1` regression present, do not integrate; `2` partial, confirm the
residue is a stated boundary and not under-collection; `0` complete on
coverage, with per-route correctness still to be read.

The instrument transcribes `collectFieldIds` rather than importing it, so that
a regression in the module under test cannot make the measurement agree with
it by construction.

## Not part of #63

Keep separate and do not let a #63 correction absorb any of them: #60 (stale
commercial projections on the retired Oregon route — verified NOT corrected by
#52), #55 (IL felony-prostitution-relief missing one Grade-A fulfillment
proof), #49 (external PostgreSQL/hosted evidence), #42, #58 (CC-1472
currentness), #61 and #62 (Connecticut), and the two reproduced baseline
verifier failures: the stale MS non-conviction manifest proof, and the WY
error-prefix mismatch in `test-wy-unchanged-track-authority`, which fails
identically at the pre-#53 baseline `16aaf5ea0`.
