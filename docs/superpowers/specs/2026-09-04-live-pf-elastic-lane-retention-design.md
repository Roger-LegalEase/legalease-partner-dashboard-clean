# Live PF Elastic Lane Retention Design

## Problem

The packet-factory generator derives the build-lane count only from the current `SOURCE_READY` queue size. When that queue fell below the elastic threshold, the generated roster shrank from 24 to 16 lanes even though five live packet-build grants still belonged to `PF17`. The packer correctly treated those grants as pinned, but silently skipped them because `PF17` no longer existed. Factory checks then reported five executable families idle and one lower-numbered lane empty.

## Decision

Retain the existing queue-threshold calculation as the baseline. Before constructing PF buckets, inspect unreleased packet-family claims whose operation is `packet-build` and whose lane matches `PF<number>`. Set the effective PF lane count to the greater of:

1. the threshold-derived lane count; and
2. the highest numbered lane holding one of those live grants.

This keeps an owned lane materialized for exactly as long as its live grant requires it. Once every grant on a high lane is released, normal regeneration may shrink the roster again.

## Rejected Alternatives

- Always emit all 24 PF lanes. This avoids the defect but permanently provisions empty lanes and defeats the existing elastic policy.
- Retire the high lane and transfer its grants during regeneration. This changes active ownership and creates avoidable claim-revocation and stale-worker risk.

## Data Flow and Boundaries

The claim ledger remains the sole authority for live ownership. The change affects only PF roster sizing inside `generate.mjs`; it does not alter family state, source custody, packet bytes, verification verdicts, raster receipts, legal decisions, commercial routes, or Production configuration.

Malformed or unrelated lanes do not affect sizing. Released claims are historical and do not retain lanes. Existing claim-pinning and claim-ledger reconciliation continue unchanged.

## Verification

A focused regression must prove both sides of the rule:

- with a below-threshold build queue and a live `PF17` packet-build grant, regeneration emits `PF17` and keeps the granted family on it;
- with the same claim released, regeneration returns to the threshold-derived roster and does not retain `PF17`.

After the focused test passes, regenerate the source conveyor, factory state, and raster queue in their established order. Then require all factory, source-conveyor, lane-contract, claim-ledger, and existing claim-regression checks to pass. A second regeneration must not produce a new semantic change.

## Success Criteria

- No source-ready family is left idle.
- No live packet-build grant names a lane absent from the dispatch.
- No live grant changes lanes.
- Released high-lane claims do not prevent roster shrinkage.
- The 14 completed Alabama and Illinois builds can be published into the independent-verification and raster pipelines without weakening any gate.
