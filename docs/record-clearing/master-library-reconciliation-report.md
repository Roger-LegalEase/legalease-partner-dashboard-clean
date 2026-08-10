# RCAP Master Library Reconciliation Report

Reconciled on 2026-08-10 against `origin/feat/record-clearing-production-integration`
(tip `3b6f4c10`, "chore(record-clearing): refreeze the Massachusetts wave at the current tip").

## Correction to an earlier claim made on main

An earlier audit in this session (`docs/record-clearing/state-pack-substance-audit.md`)
reported that 23 jurisdictions carried no legal content. That audit measured the
TypeScript state packs under `src/lib/rcap/state-packs/` on `main` and nothing else.
It was then stated as a coverage claim about the research itself. That was wrong.

The audit's measurement is accurate for what it measured. The inference drawn from it
was not, because `main` is not the research universe. The governed Master Library is
not stored on `main`, so a search restricted to `main` cannot see it and must not be
used to make coverage claims.

## Legal-review coverage: complete

From `data/record-clearing/master-library/reconciliation.json` on the integration branch:

| Measure | Value |
| --- | ---: |
| Jurisdictions | 51 |
| Jurisdictions with retained assets | 51 |
| **Jurisdictions with a statewide legal review** | **51** |
| **Jurisdictions missing a legal review** | **0** |

Corroborated independently by `track-source-audit.json`, which audits every packet
component across all jurisdictions and reports `tracksWithoutRetainedLegalReview: 0`.

Two independent records in the governed library agree: statewide legal review coverage
is complete for all 51 jurisdictions.

## True track count: 497

`track-source-audit.json`, authority edition 1.2:

| Measure | Value |
| --- | ---: |
| Jurisdictions audited | 51 |
| **Tracks audited** | **497** |
| Tracks cleared | 142 |
| Tracks blocked | 355 |
| Tracks without a retained legal review | 0 |
| Components audited | 1,785 |
| Official-PDF components | 730 |
| Custom-pleading components | 361 |
| Process-guidance components | 694 |
| Composed tracks / units | 51 / 113 |

### Reconciling the competing track numbers

The figures in circulation are different snapshots, not contradictions:

| Figure | What it counts | Source |
| ---: | --- | --- |
| 117 | Batch 1 expected track IDs — the first 12 jurisdictions only | `reconciliation.json` → `batch_1_expected_track_ids` |
| 250 | Tracks audited under the Edition 1.2 normalization pass (26 jurisdictions) | `reconciliation.json` → `normalized_tracks_audited` |
| **497** | **Full nationwide track registry, all 51 jurisdictions** | `track-source-audit.json` → `totals.tracksAudited` |

**497 is the nationwide number.** 117 is batch one. 250 is the Edition 1.2 normalization
subset.

A figure of 324 was raised as "what main can see." It does not appear in any governance
JSON under `data/record-clearing/master-library/` on the integration branch; a scan of
every such file for a value of 324 returned nothing. It may originate outside the
branch, in an Edition 1.3 artifact not committed to git, or in a superseded count. It is
unverified here and should not be quoted until its source is identified.

## Retained assets: 443 at Edition 1.3

| Asset class | Count |
| --- | ---: |
| Legal review | 51 |
| Legal review addendum | 14 |
| Instructions | 51 |
| Packet form | 194 |
| Source-gated | 96 |
| Supporting process | 37 |
| **Total retained** | **443** |

The often-quoted 394 is Edition 1.1's inherited asset count. Edition 1.2 added 14 legal
review addenda plus 35 non-review assets, reaching 443. Edition 1.3 is a
metadata-correction tranche that adds no bytes: `addedAssets: 0`, `retiredAssets: 0`,
`retainedAssets: 443`.

Integrity at publication: 591 files, 590 checksum lines, 590 verified, zero mismatches,
zero missing, zero uncovered files.

## Edition lineage

| Edition | Published | Assets | Note |
| --- | --- | ---: | --- |
| 1.1 | 2026-08-03 | 394 | Published container lost; content retained on a verified substitute (`edition-1-1-container-loss-determination.json`) |
| 1.2 | 2026-08-03 | 443 | 14 Batch 2 legal-review addenda; Louisiana art. 986 statutory forms acquired |
| 1.3 | 2026-08-09 | 443 | Metadata-correction tranche: 3 admitted, 33 deferred, 0 new bytes |

Edition 1.3 corrections: Delaware FORM-281E re-roled from `PETITION` to
`CONTINUATION_SHEET`; Massachusetts stale source index URL replaced; Florida
`FL-RULE-3.989-CONTINUATION` recorded as an identity naming no official document,
closing a release blocker held open against a phantom.

## The actual blocker

The library archive is **not in git**. `edition-1-3/publication.json` records
`committedToGit: false` and `sourceBinaryCommittedToGit: false`. The archive lives at:

```
/workspaces/legalease-attorney-review-packages/Expungement_AI_RCAP_Master_Library_Edition_1_3.zip
sha256 6aa35646ef4f168612175251af45d9e1904f3ba1ad9749bae7a09d786ab38eac
156,252,118 bytes / 591 files
```

`/workspaces/` is a GitHub Codespace path, and the archive sits in a *different*
workspace (`legalease-attorney-review-packages`) from this repository. Only the
governance metadata is committed to the integration branch.

### Materialization is specified and staged, not missing

`data/record-clearing/production-factory/legal-review-materialization-contract.json`
defines 24 materialization jobs — KY, NC, ND, NE, NH, NJ, NM, NV, NY, OH, OK, OR, RI,
SC, SD, TN, TX, UT, VA, VT, WA, WI, WV, WY. Each pins an exact archive-relative path,
an exact expected SHA-256, a destination, a receipt path, and a focused verifier.

All 24 carry the same status:

```
blocked_external_archive_and_verified_receipt_required
```

Nine of them — KY, NC, NE, NJ, NY, OR, TN, TX, VA — are jurisdictions whose state packs
on `main` are metadata-only. Those packs are empty because their materialization jobs
are blocked on the archive, not because the research was never done.

## Correct statement of the gap

- **Legal research:** complete. 51 of 51 jurisdictions, twice governed, checksummed.
- **Materialization into the build:** blocked. The archive is not reachable from git,
  and 24 pinned jobs are waiting on it.
- **Runtime:** deliberately disabled. `generationAllowedRows: 0`,
  `generationAllowedNoRows: 443`, `launchGate: red`, `counselAdopted: false`,
  `productionEnabled: false`. No packet, route, or gate is affected by any edition.

The distance between the library and the build is a transport and receipt problem, not a
research problem.

## Known gaps, per the library's own ledger

34 missing-and-source-gap rows: 9 build blockers, 12 release blockers, 6 requiring
jurisdiction input, 4 resolved, 1 monitoring, 1 non-blocking research note, 1 not-missing
by design. 33 candidates remain in the successor backlog with exact unmet criteria,
including Hawaii HCJDC 159(b), which is measured exactly but whose bytes are not
retrievable in the publishing environment.

The library records where it is incomplete rather than concealing it.

## Method

Every figure above was read from committed JSON on
`origin/feat/record-clearing-production-integration` via `git show`. No figure is
inferred from `main`, and no legal conclusion is drawn or changed here. Edition 1.1 was
not consulted: editions are frozen, and 1.3 is the reconciliation target.
