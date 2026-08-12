# Lane B — authority coverage for partition B1

Owner: Terminal B (guidance, exclusions and exact deferrals)
Base: `df3d8607e8a0c723e23c346f1cd725c17a2c22b0`
Scope: partition B1 (AK, CA, GA, IL, IN, MD, MI, NC, ND, NH, UT) — 24 tracks

## Correction to the first version of this record

The first version of this file reported that five B1 tracks had no committed
authority and were blocked on operator source: `IN:in_auto_expungement`,
`MD:md_10104_pre_service`, `MI:mi_arrest_acquittal_dismissal`,
`MI:mi_arrest_no_charge` and `MI:mi_deferral_status`.

That finding was scoped to the compiled profiles under
`src/lib/rcap-engine/compiled/profiles/`, and for those files it was accurate —
none of the five has a pathway or source section there. The inference drawn from
it was wrong, because the compiled profiles are not the authority universe.

The governed **Master Library** carries a per-track legal design memo for every
one of them, at `data/record-clearing/legal-design-intake/<ST>.memo.json` on
`feat/record-clearing-production-integration` at the pinned tip `3b6f4c10` — the
same tip every lane-B job already names in its `sourceDependency`. The memos are
keyed by exact `trackId`.

Measured coverage, all 51 states have a memo, and for B1:

| State | B1 tracks | Covered by memo |
|---|---:|---:|
| AK | 2 | 2 |
| CA | 1 | 1 |
| GA | 2 | 2 |
| IL | 1 | 1 |
| IN | 1 | 1 |
| MD | 3 | 3 |
| MI | 6 | 6 |
| NC | 1 | 1 |
| ND | 4 | 4 |
| NH | 1 | 1 |
| UT | 2 | 2 |
| **Total** | **24** | **24** |

**No B1 track is blocked on operator source.** There is no evidence gap in this
partition.

## What each memo carries

Per track: `legalName`, `publicName`, `controllingAuthority` (statutory citation
list plus a summary), `destination` (kind, name, detail), `outputStrategy`,
`eligibleRecordTypes`, `eligibleDispositions`, `exclusions`, `waitingPeriods`,
`components`, `participantInputs`, `supportingDocuments`,
`manualCompletionItems`, `selfHelpStopConditions`, `unresolvedQuestions`,
`officialSources`, and `legalDesignDecision` with its status, rationale and
limitations.

That is the committed legal design, and it is richer than the compiled runtime.
`MI:mi_deferral_status` is the clearest example of the earlier error: the
compiled profile has no mention of deferrals at all, while the memo classifies
it as a non-relief routing node with ten citations — MCL 333.7411, 762.11 to
762.15, 769.4a, 436.1703, 600.1070, 600.1209, 750.350a, 750.430, 780.621(2) and
780.621d(7)(d) — and explains that the court record is already nonpublic by
operation of the deferral statute, that the arrest record is handled by the
biometric-destruction routes, and that the disposition still counts as a
misdemeanour conviction for set-aside eligibility.

## Standing constraints these memos impose

Two kinds of memo content are binding on participant copy and are followed
rather than summarised away:

- `legalDesignDecision.limitations` — for example, Michigan's addendum requires
  "set aside", not "expunge", in generated material.
- `selfHelpStopConditions` — the points at which a self-help route must stop.

Where a memo marks `destination.name` as "Not applicable" because the node
explains a disposition rather than granting relief, the participant is told what
the disposition means for them and routed to the mechanism that does apply. That
is a complete treatment, not a gap, and it is written without the internal
vocabulary used in this record.

## What the participant is told

Nothing in this record reaches a participant. It exists so the authority basis
for each track is visible and auditable.
