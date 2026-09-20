# National build audit — 2026-08-27

A read-only sweep of the whole repository before resuming the nationwide build,
run because this repository has a specific failure mode: the newer, better
version of an artifact repeatedly turns out to live on a branch nobody merged,
while the mainline looks unfinished. That has now been confirmed three times.

Nothing here was inferred from a status document. Every number is measured from
current bytes, trees, or generator output.

## The headline

```text
states with official-form packages reachable from the checkpoint : 10
states with official-form packages somewhere in the repository   : 27
```

**Seventeen states are already built and unreachable from the mainline.** The
remaining national delta is not 41 states of work. It is 17 states to port and
24 to build.

## Branch reality

617 remote branches. 482 carry commits the checkpoint does not.

Ancestry is a weak signal here because squash-merges leave a branch tip
unreachable even when its content landed, so every finding below is by content.

## Where the 27 states live

| Lane | States it alone carries |
|---|---|
| `rcap-d1a` / `rcap-d1c` | alabama, vermont, wisconsin |
| `rcap-d2a-approval-evidence-v2` | arizona, minnesota, washington |
| `rcap-d2b-approval-evidence-v2` | florida, louisiana, new-jersey, new-mexico |
| `rcap-d3a-corrections-v3` | colorado (ported), missouri, new-hampshire, texas |
| `rcap-d3b-approval-evidence-v2` | iowa, massachusetts, oregon, utah |
| `rcap-terminalize-d2` / `-d3` | illinois, kansas, north-dakota |
| `wave-c-review-corrections` | a better nebraska than the checkpoint's |
| `rcap-gate-b-sidecars-lane1-wave-a` | a better north-carolina than the checkpoint's |

Several are substantial: texas 410 files, utah 412, new-mexico 342,
washington 276, new-hampshire 203.

### These cannot be merged wholesale

Every lane branch carries its own copy of the shared base states, and every one
differs from the checkpoint:

```text
                                    alaska  arkansas  kentucky  virginia
rcap-d3a-corrections-v3             DIFFERS  DIFFERS   DIFFERS   DIFFERS
rcap-d2a-approval-evidence-v2       DIFFERS  DIFFERS   DIFFERS   DIFFERS
rcap-d2b-approval-evidence-v2       DIFFERS  DIFFERS   DIFFERS   DIFFERS
rcap-d3b-approval-evidence-v2       DIFFERS  DIFFERS   DIFFERS   DIFFERS
```

Merging a lane would overwrite the checkpoint's base states with that lane's
older copies. Each state must be ported **path-scoped**, exactly as Colorado was
in `9a755faf`, and re-verified against its own recorded artifact hashes on
landing.

## What the sweep cleared

These paths are already at their maximum in the checkpoint. No hidden work:

```text
compiled engine profiles      51    state packs                52
guidance packets              34    terminalization treatments 39
source packs                  19    pdf source receipts        13
pleadings                     24    review artifacts           19
legal-design-track-registry.json    track-pathway-crosswalk.json
all-state-build-manifest.json       track-family-map.json
```

**The compiled profiles needed care.** The checkpoint is 39 KB *smaller* than
main, which reads as a regression until you look: all 51 profiles changed, 20
shrank and 31 grew. That is the fine-tune pruning exact dates, court and case
identifiers and cross-route leaks out of free screening while adding route
logic — the sprint's stated purpose. A pre-fine-tune branch
(`expai-flow-verification-p4`, 2026-08-24) is larger still. Bigger is older
here, not better.

## The two-layer contradiction

The platform reports itself finished at the state layer and barely started at
the artifact layer:

```text
state-promotion-manifest.ts, 51 jurisdictions
  promotionStatus live = 51      approvedForLive true = 51
  qa / attorney / source reviews passed = 51      blockers = 0

official-form families with a source record : 167
  participant-fillable                      :  80
  generationAllowed = true                  :   1
```

One family platform-wide is authorized to generate.
`track-family-map.json` agrees independently: 0 production-packet candidates
across 67 lane-D tracks, 60 held on source or design.

State promotion and family generation authority are separate gates. Only the
first has been driven to completion. Treating the manifest as evidence of a
finished platform is the error this audit exists to prevent.

## The gate that blocks everything downstream

All 167 families carry `f_independent_visual_review_required`.
`platformReadyVerdict` in `scripts/rcap-official-forms/rcap-platform-ready.mjs`
reads `independentReview` from `overlay-profile.json` only, and an AcroForm-fill
family carries `production-field-map.json`, which has no such field. The
repository already records the scope: **26 of 27 AcroForm families cannot record
an approval however clean their review comes back.**

Every state, ported or built, passes through this gate. Building states before
it exists is building into a funnel with no outlet.

## National CAS

The reported "unresolved first legitimate checkout" defect is not unresolved. It
is unmerged. `wip/20260827-national-cas-paused` carries
`initializeProtectedPacketVerification()` and the RPC
`initialize_consumer_packet_verification`; neither is in the tree, along with
the CAS migration and all three CAS tests.

## Ordered plan

1. **Approval channel for AcroForm-fill families.** Small, and it unblocks 26
   families at once. Everything else queues behind it.
2. **Port the 17 states**, path-scoped per state, hashes re-verified on landing.
   Take the better nebraska and north-carolina at the same time.
3. **Port the CAS boundary** from the WIP by reviewing its exact diff (32 files,
   +3004/−127) rather than merging the branch, which is non-release and never
   received an aggregate review.
4. **Settle one hold vocabulary.** Colorado is the only lane-D3A state; the other
   ten are D1. Colorado's four substantive holds are referenced by no verifier,
   generator or gate in the repository, so `partitionHolds` classifies them as
   substantive by default rather than by determination. The remaining 24 states
   must not arrive in a third dialect.
5. **Build the 24 states with no packages at all.**
6. **Participant data rights (P0).** The authenticated Privacy and Data area —
   export, per-matter deletion, account deletion — specified in §12A of
   `docs/PRODUCT_CONTRACT.md`. Searched across all 617 branches: no deletion,
   privacy-request, export or purge implementation exists anywhere. Unlike every
   other gap in this audit, this is unbuilt rather than unmerged, so it cannot be
   scheduled as a port. It does not block items 1 to 5, but it must land before
   any Grade-A or SOC 2 claim, and it is worth building alongside the data-model
   work rather than after it: a deletion job that is hard to write is evidence
   the model has drifted.

7. **97/97 paid-route metadata**, then the currentness sweep, full chain,
   candidate freeze, Lane J, Lane K.

## Exact external blockers

- The 97/97 derivation is uncommitted on the Mac; the 4,190,658-byte patch
  (SHA-256 `6c5f6d10…`) is not reachable from this container and is not on the
  WIP branch.
- `scripts/rcap-official-forms/lanes/d3a-regenerate.mjs`, the renderer every
  Colorado `rendered-artifacts.json` names, is absent. Artifacts verify against
  their own bytes but cannot be re-rendered.
- The source bundle and `STATE_MANIFEST.csv` are read from `RCAP_BUNDLE_EXTRACT`
  outside the repository. 493 of 583 corpus files are recovered and verified;
  90 remain, none of them canonical Colorado forms.
