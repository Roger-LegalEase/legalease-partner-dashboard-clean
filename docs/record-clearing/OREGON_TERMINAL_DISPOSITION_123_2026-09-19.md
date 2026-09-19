# 123 — Oregon's position, and the check that was not about Oregon

`verify-rcap-oregon-decision-alternatives` reported one problem out of fifteen
checks:

```
FAIL it is not commercially eligible and is not proven:
     INCOMPLETE / not_commercially_eligible / eligible 6
```

## Two answers, because there were two questions

**Oregon's own position: `CORRECT_FAIL_CLOSED`.** Not a source gap, not a
legal-design gap, not an implementation gap.

**The failing check: `STALE_VERIFIER_ASSUMPTION`.** Repaired and mutation-tested
here. It was never measuring Oregon.

## Oregon is fail-closed on the human gates, and says so exactly

Three Oregon routes carry a Grade-A record at `recordVersion: 15`. All three are
`INCOMPLETE` / `not_commercially_eligible`, with `stalenessReasons: []` — nothing
has gone stale; the proofs were never completed.

| Route | Missing proof |
|---|---|
| `OR:set-aside-of-eligible-convictions-under-ors-137-225-1-a` | `final_verification` unbound; `output_legal_approval` pending |
| `OR:marijuana-specific-set-aside-redesignation` | the same two, plus a deterministic fixture and its hash |
| `OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c` | the same two, plus the fixture, plus six `packet_completeness` fields — `copyRequirements`, `feeAndWaiverInstructions`, `filingDestination`, `hearingAndObjectionStopConditions`, `postFilingSteps`, `serviceAndNotice` |

`final_verification` and `output_legal_approval` are the two human gates
AGENTS.md names as blocking `approved_for_live` and `live`. Oregon is refused
because nobody has run them, which is the rule working.

Everything below those gates is done and green: the official-PDF Grade-A check,
Lane C, both generators under `--check`, and the disposition-configuration
verifier's 28 checks — three distinct disposition identities, each refusing the
others' dispositions, all six legal sections bound, no fee stated, the superseded
route recorded as superseded and absent from the launch graph, *"every
configuration is commercially closed"*. The `OR:marijuana-specific-set-aside-redesignation`
row is also one of step 41's six unadjudicated pathways; that decision is held
there, not here.

## The check was asking a nationwide question under an Oregon title

The failing conjunct was not about the Oregon route. Of its four terms, the two
Oregon-specific ones **pass**:

```js
selectedProjection?.commercialStatus === "not_commercially_eligible"   // true
selectedProjection?.state !== "COMPLETE_PACKET_PROVEN"                 // true
projection.counters.commerciallyEligible === 0                         // 6
projection.counters.completePacketProven === 0                         // 6
```

Written 2026-08-29, when no route anywhere held a Grade-A fulfillment record.
Then "the global counter is zero" and "no Oregon route is sellable" were the
same sentence. They stopped being the same sentence when six routes earned
records — `DC:dc_actual_innocence_expungement_16_803`,
`IL:felony-prostitution-relief`, three Mississippi routes and
`WY:felony-conviction-expungement-w-s-7-13-1502`. **None is in Oregon.** Whether
those six may sell is `verify-rcap-grade-a-fulfillment-authority`'s question —
green, including `--mutations` — and Lane F's, not this file's.

**Pre-existing, proven against the baseline.** The projection at the accepted
Production baseline `8682bd00731e247a4fe93f39075c532476eb5c74` already reads
`commerciallyEligible: 6, completePacketProven: 6`. This check was red when
Production was accepted.

## The repair, and why it is stronger rather than weaker

The two global conjuncts are replaced by an Oregon-scoped pair: no route in the
projection whose id starts `OR:` may be `commercially_eligible` or
`COMPLETE_PACKET_PROVEN`, and the Oregon set may not be empty.

Six mutations against the live projection:

| | Mutation | Result |
|---|---|---|
| M1 | a non-selected Oregon route → `commercially_eligible` | **FAIL**, names the route |
| M2 | a non-selected Oregon route → `COMPLETE_PACKET_PROVEN` | **FAIL**, names the route |
| M3 | the selected route → `commercially_eligible` | **FAIL** |
| M4 | the selected route → `COMPLETE_PACKET_PROVEN` | **FAIL** |
| M5 | every Oregon route removed | **FAIL** — no vacuous pass |
| M6 | a non-Oregon route gains authority, counter to 99 | **ok** — correctly not this file's question |

Run against the old check in the world it was written for — counters forced to
zero — **M1 and M2 pass**. The old global counter could not see an Oregon route
going sellable unless the generator happened to recompute the national total, so
the repair catches two failures the original missed, and declines one it wrongly
claimed. The projection was restored byte-for-byte after each mutation.

## What must not be done

- Do not clear Oregon's `final_verification` or `output_legal_approval`. They are
  the human gates, and no verifier change reaches them.
- Do not read this repair as Oregon moving. No Oregon byte changed; all three
  routes remain `INCOMPLETE` / `not_commercially_eligible`.
- Do not generalise the repair into removing the national-counter assertion
  elsewhere. Where a check genuinely owns the nationwide commercial surface, that
  assertion is the point.

## Gate

`scripts/verify-rcap-oregon-decision-alternatives.mjs` is not among the 30
compared inputs. `comparedInputs: 30`, `changedPaths: []`,
`rebuildRequired: false`.
