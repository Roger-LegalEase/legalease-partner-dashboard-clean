# SRR-A source-relationship repair report

## Scope

This sidecar re-measures `30` of the assigned 30 rows (`SRR-001` through `SRR-030`) against the current checkout. It does not alter canonical registries, claims, source bodies, packet files, routes, or production.

## Result

- Rows attempted: **30**
- Ready to apply: **0**
- Stopped missing bytes: **30**
- Deferred active owner: **0**
- Held hashes recomputed: **0**

The exact wave-nominated private paths and every named candidate were checked. None of the attempted held files is mounted, so the shard stops those rows at `STOPPED_MISSING_BYTES` rather than copying snapshot hashes or guessing identity, currentness, scope, variant, permission, or family relationships. Plausible candidates are retained as candidates only.

## Collision guard

The current shift and claim ledger were read. Unreleased claim subjects and their derived lane/family path patterns are recorded in `collision-guard.json`. No assigned family intersects an unreleased claim at this measurement. This sidecar asserted and released no claim.

## Evidence and safety

Each row cites the committed wave and committed files containing its nominated artifact ID. Private corpus paths are observation locations, not committed source evidence. No URL was invented, no statute was treated as a form, and no bundle component was promoted as a standalone source.
