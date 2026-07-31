# Batch 2 legal-design normalization — queued, not started

**Status:** the adopted memorandum is committed. No Batch 2 memo JSON exists and
none was created. No Batch 2 node is in any registry, resolver, or queue.

## Why it is queued

### 1. The sequencing boundary applies

Batch 1 is still actively being normalized in this worktree.

| Batch 1 | |
|---|---|
| Expected tracks | 117 |
| Imported | 53 |
| Deferred under `legal_research_required` | 3 |
| **Total accounted** | **56** |
| Outstanding | 61, across AL, CO, AR, CA, CT |

The Batch 1 checkpoint is committed and the worktree is clean, but five
jurisdictions remain un-normalized. The controlling instruction for that state is
to commit only the adopted Batch 2 memorandum and stop before creating Batch 2
memo JSON, so that a half-finished Batch 1 lane and an unfinished Batch 2 lane
never share a worktree.

This is an auditability boundary, not a readiness one. It does not wait on Batch 1
tracks becoming packet-ready, and it does not hold up source or renderer work.

### 2. Three of the four required inputs are absent

| Input | Present |
|---|---|
| `LegalEase_Batch_2_Legal_Research_Resolution_Memo_ADOPTED.md` | **yes**, SHA-256 verified |
| `LegalEase_Nationwide_Legal_Review_Second_Batch_Clean.zip` | no |
| `LEGALEASE_BATCH_2_COMBINED_SOURCE.md` | no |
| `LEGALEASE_BATCH_2_STATE_SUMMARY.csv` | no |

The adopted memorandum is the controlling amendment, but it amends the fourteen
jurisdiction reviews rather than replacing them. Without those reviews there is
no expected-node crosswalk to build and no per-track legal design to normalize —
only the twelve issue resolutions and the state-level dispositions.

Normalizing from the memorandum alone would mean inventing the track structure
the memorandum assumes, which is exactly the substantive inference this pipeline
refuses.

## What was verified

`sha256sum -c BATCH_2_ADOPTED_SHA256SUMS.txt` — 3 of 3 OK, 0 failures, covering
the adopted memorandum, the adoption changelog, and the normalization prompt.

## Expected reconciliation, recorded but not yet generated

From the adopted memorandum, to be regenerated from the normalized registry
rather than hard-coded:

```
136 source slots
  + 1  Illinois Track P split
  + 2  Georgia Track L split
  + 1  Kansas Track A split
  = 140 normalized nodes
  -  5 non-relief / variant / verification / routing nodes
  = 135 proposed substantive relief mechanisms
```

The memorandum states the supplied count of 136 is not controlling and that any
difference must be explained by old ID, new ID, node type and controlling source.

## Georgia crosswalk, recorded ahead of normalization

The superseded draft language must not be used. The adopted IDs are
`GA-FO-SENTENCING-POST2026` (§ 42-8-62.1(b), process guidance),
`GA-FO-ACTIVE-PRE2026` (§ 42-8-62.1(c)-(d), custom pleading, prosecutor notice
only), `GA-FO-DISCHARGED-PRE2026` (§ 42-8-62.2(c)-(f), custom pleading,
prosecutor notice only) and `GA-RFO` (§ 42-8-66, advance prosecuting-attorney
consent as a threshold filing requirement).

`GA-RFO` remains separate. There is no old-M-to-new-L mapping.

## To start Batch 2

1. Supply the three missing inputs under `/workspaces/legalease-legal-review-import/batch-2/`.
2. Finish Batch 1 — AL, CO, AR, CA, CT — or accept the lane split explicitly.
3. Branch `feat/record-clearing-batch-2-legal-design` from a clean checkpoint.

## Runtime effect

None. No Batch 2 node exists in any executable path. Batch 1 status is unchanged:
all imported tracks remain `runtime_disabled`, tracks deferred under
`legal_research_required` remain absent from runtime resolution and unreachable,
0 tracks are `packet_ready`, and the launch gate stays red.
