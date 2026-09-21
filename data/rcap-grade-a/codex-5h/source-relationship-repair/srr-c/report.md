# SRR-C source-relationship repair report

## Scope

Re-measured exactly **SRR-061 through SRR-090** (30 rows) against the current checkout. This is a sidecar payload only; no canonical registry, claim, packet, route, source body, or production system was modified.

## Outcome

- `READY_TO_APPLY`: **0**
- `STOPPED_IDENTITY`: **0**
- `STOPPED_CURRENTNESS`: **13**
- `STOPPED_SCOPE_OR_VARIANT`: **2**
- `STOPPED_FAMILY_MAPPING`: **0**
- `STOPPED_MISSING_BYTES`: **7**
- `DEFERRED_ACTIVE_OWNER`: **8**

The mounted checkout does not contain `private/Nationwide Record Clearing/`; therefore the seven rows that name held New Mexico, Utah, or West Virginia files could not have their SHA-256 values recomputed. No committed digest was copied as a substitute. Eight rows collided with unreleased Claude claims and were deferred rather than touched.

## Row ledger

| Row | Artifact | Verdict | Held hashes recomputed |
|---|---|---|---:|
| SRR-061 | `4-955` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-062 | `4-959` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-063 | `4-960` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-064 | `4-960.2` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-065 | `1003EX` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-066 | `1023EX` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-067 | `SCA-C906` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-068 | `CCA-GF-0120-3016` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-069 | `CCA-XP-0120-7002 Form ACR` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-070 | `Confidential Information Form` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-071 | `NHJB-2311` | `STOPPED_SCOPE_OR_VARIANT` | 0 |
| SRR-072 | `NHJB-2328` | `STOPPED_SCOPE_OR_VARIANT` | 0 |
| SRR-073 | `FL-RULE-3.989-ORDER` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-074 | `FL-RULE-3.989-PETITION` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-075 | `CC-DC-089` | `STOPPED_CURRENTNESS` | 0 |
| SRR-076 | `EXP102` | `STOPPED_CURRENTNESS` | 0 |
| SRR-077 | `EXP104` | `STOPPED_CURRENTNESS` | 0 |
| SRR-078 | `FEE102` | `STOPPED_CURRENTNESS` | 0 |
| SRR-079 | `NHJB-2317-DSe` | `STOPPED_CURRENTNESS` | 0 |
| SRR-080 | `4-960.1` | `STOPPED_CURRENTNESS` | 0 |
| SRR-081 | `CCA Section 1 non-conviction expungement petition` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-082 | `CC-DC-CR-072B` | `STOPPED_CURRENTNESS` | 0 |
| SRR-083 | `EXP106` | `STOPPED_CURRENTNESS` | 0 |
| SRR-084 | `MT-OCA-MMRTA` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-085 | `CC-6-12` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-086 | `NHJB-3057-DSe` | `STOPPED_CURRENTNESS` | 0 |
| SRR-087 | `SCA-C907` | `STOPPED_CURRENTNESS` | 0 |
| SRR-088 | `ACIC-ORDER-TO-SEAL-ARREST` | `STOPPED_CURRENTNESS` | 0 |
| SRR-089 | `ACIC-PETITION-TO-SEAL-ARREST` | `STOPPED_CURRENTNESS` | 0 |
| SRR-090 | `AOC-CREM2F-071221` | `STOPPED_CURRENTNESS` | 0 |

## Application payload

No row reached `READY_TO_APPLY`; `apply-ready-payload.json` is intentionally empty. Each stopped row remains closed with an explicit reason and committed evidence locator in `rows.json` and `stopped.json`.
