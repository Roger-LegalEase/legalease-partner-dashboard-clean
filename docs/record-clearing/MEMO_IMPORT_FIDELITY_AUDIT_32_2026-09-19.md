# 32 — is the memo stale, or did the repository drift away from it?

`verify-legal-design-memo-import.mjs` asserts every file in
`data/record-clearing/legal-design-intake` is byte-for-byte identical to
`origin/feat/record-clearing-production-integration` @ `3b6f4c10`. Eighteen are
not.

## Classification

**`STALE_CONTROL_UNRECORDED_SUPERSESSION`.** Held red.

Neither half of the question is the whole answer. The memos moved forward on
authorized, sourced findings, so the byte-identity assertion is stale. But the
move was made by the mechanism the import manifest forbids, and nothing in the
repository records the supersession — so the control cannot be made green
without either re-importing or replacing what it proves.

**Correction to the frozen inventory.** It recorded *"PA, RI, VA, VT"*. That
was four names transcribed from a truncated log tail. The real set is
**eighteen**: CO, DE, HI, KY, LA, MA, MS, NC, ND, NE, NH, OK, PA, RI, VA, VT,
WA, WY. The frozen inventory is left unedited; this is the corrected set.

## The drift is fully accounted for

Twelve commits have ever touched the memo directory: the import itself, a
manifest-only commit, and **ten** corrections. The union of memos those ten
touched is exactly the eighteen the verifier names — no memo moved outside a
named commit, and no named commit moved a memo it does not claim.

| Commit | Date | Memos | Cited source |
|---|---|---|---|
| `2f2e5f27` | 09-06 | MS NH RI VT | `legal-decisions/2026-09-06-owner-relayed-research-four-holds.json` |
| `6a000b40` | 09-06 | MS NH RI VT | `research/2026-09-06-packet-blocker-research-handoff.md` |
| `ac5ca876` | 09-06 | DE HI LA NE WA | `research/2026-09-06-batch-02` |
| `6aea851c` | 09-06 | KY ND OK WY | `research/2026-09-06-batch-03` |
| `0489cca0` | 09-06 | MA NC PA VA | `research/2026-09-06-batch-04` + `legal-decisions/2026-09-06-owner-relayed-research-batch-04.json` |
| `2940142d` | 09-08 | KY | supplied `executedchecks.json`, scope recorded on the track |
| `f06f33bc` | 09-08 | CO | FIX96, JDF 611 read at source |
| `1784eec3` `bebf8763` `d4984cbc` | 09-09 | RI ×3 | `chat-parallel-2026-09-07/review/ri-independent-findings.json` |

Every cited record is present in the tree. Each research commit records
`createsApproval: false` and states in terms that it is research, not counsel
approval and not packet acceptance.

## The edits sharpen; they do not weaken

Measured across the eighteen, import → current:

| | |
|---|---|
| Leaves | 35 780 → 36 461 (**+681**, overwhelmingly additive) |
| Changed leaves | 155 |
| Release blockers | **270 → 267** |
| Superseded questions moved to `researchResolvedQuestions` | **12**, all **12 verbatim-preserved** from the import |
| Self-help stop conditions | 1 091 → 1 092 |
| Import text values not present anywhere in the current memo | 25 — of which **7 are the old assertion extended in place**, kept verbatim inside a longer one |

Three blockers net cleared, each on a named decision record. Two were cleared
and then **reopened more narrowly**: RI-B-07 re-scoped the Superior Court fee
answer, which does not reach the two District Court tracks, and reinstated the
blocker in `releaseBlockers` and `blockers` on both — with
`clearsReleaseBlockerForThisTrack: false` and an explicit
`doesNotReachThisTrackBecause` on the preserved resolution. Those are the same
two questions step 33 is holding for want of an owner mapping.

The two edits that look most like a weakening are not:

- **VA.** `selfHelpStopConditions[0]` and `exclusions[0]` lost their old
  wording. Both were rewritten to keep the Dotson screen and append one
  statute-cited exception (§ 19.2-298.02(D), all-party agreement, pinned
  CC-1473 Rev. 07/26). Both new texts end by restating that where the agreement
  is absent, ambiguous or disputed, *"the Dotson screen remains a hard gate"*,
  and `legalDesignDecision.limitations[0]` still carries the unaltered
  requirement that it be one.
- **RI.** Three first-offender stops left the multiple-misdemeanor and deferred
  routes. They were imported stops belonging to a different route: the multiple
  route was stopping for exactly the misdemeanors it exists to clear, and the
  deferred route was applying a lookback it has none of. Each was replaced by
  that route's own conditions.

The single removed stop across all eighteen memos is KY's, and `2940142d`
documents why: it required the offence to sit inside the KRS 431.073(1)(a) and
(1)(d) lists in order to use a route whose ground is (1)(c), a full pardon —
ending self-help for the population the route serves.

The corrections did not stay in the memo. RI-B-07 and the VA § 19.2-298.02(D)
exception both propagated to `legal-design-track-registry.json`, and RI-B-07
into the packet-factory rows and claim ledger.

## Why the control still cannot go green

**The manifest forbids exactly what happened.** `IMPORT_MANIFEST.md`:

> **Do not edit these files here.** A correction belongs upstream, in the memo
> lineage, and is then re-imported. Editing in place would create a second legal
> design of record, and the whole point of a hash-bound memo is that there is
> only one.

Ten corrections were applied in place. None was taken upstream and re-imported.

**One record already tells the other story, mechanically.** Step 33's generator
builds `memoManifest` with a hard-coded `sourceCommit: "3b6f4c10"` and the
hard-coded `readOnly` sentence above, and fills `files[]` by hashing the working
tree. Measured: **all 51 recorded hashes match the current bytes and none match
the import.** So the published register states that these files are the import
from `3b6f4c10` while listing 18 hashes no file at `3b6f4c10` has, and will
restate it on every regeneration. That is not a supersession record. It is the
same file asserting a frozen pin and re-measuring past it.

**This is not new, and it is not this session's.** The last memo edit
`d4984cbc` is an ancestor of the accepted Production baseline
`8682bd00731e247a4fe93f39075c532476eb5c74`, and the memo bytes at that baseline
are identical to the current ones. The control was already red when Production
was accepted.

## Terminal remediation

One of two, and the choice is an ownership decision:

1. **Re-import.** Land the ten corrections upstream on
   `feat/record-clearing-production-integration`, re-import, and re-pin
   `SOURCE_COMMIT` in the verifier and `sourceCommit` in the generator to the
   new import. Restores the one-source-of-truth property the manifest claims.
2. **Prove lineage instead of identity.** Make the memo directory a derived
   record: import commit plus an ordered list of authorized correction records,
   with the verifier proving the current bytes are reachable from the import by
   exactly those records and no others. Keeps corrections applicable where the
   evidence lands, at the cost of a real mechanism to build.

Until one of them exists there is no honest green, and the step stays red.

## What must not be done

- Do not re-pin `SOURCE_COMMIT` or `sourceCommit` to a commit that does not
  carry the corrections. No such commit exists, and moving the pin without
  moving the bytes is the quiet edit of an old approval that the manifest and
  AGENTS.md both forbid.
- Do not delete or relax the check. Byte-identity is stale, but nothing weaker
  is true yet either.
- Do not revert the eighteen memos to the import. That would discard twelve
  recorded resolutions, reinstate the KY stop that excludes its own route's
  population, and restore three RI stops that belong to a different route.
- Do not touch the memos to make the check pass. Every factual assertion in them
  is currently supported by a record; the defect is in the provenance chain, not
  in the text.

## Gate

Diagnosis and recording only; no memo byte moved.
`data/record-clearing/legal-design-intake` is not among the 30 compared inputs.
`comparedInputs: 30`, `changedPaths: []`, `rebuildRequired: false`.
