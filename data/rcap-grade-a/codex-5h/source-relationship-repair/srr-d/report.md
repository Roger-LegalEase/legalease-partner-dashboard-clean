# SRR-D source-relationship repair report

## Scope

Rows SRR-091 through SRR-120 were re-measured against the current checkout and mounted private Master Library corpus. No live claim was asserted or released, and no canonical registry was changed.

## Results

- `READY_TO_APPLY`: 0
- `STOPPED_IDENTITY`: 0
- `STOPPED_CURRENTNESS`: 15
- `STOPPED_SCOPE_OR_VARIANT`: 2
- `STOPPED_FAMILY_MAPPING`: 2
- `STOPPED_MISSING_BYTES`: 8
- `DEFERRED_ACTIVE_OWNER`: 3
- Held candidate hashes recomputed from bytes: 25

## Row ledger

| Row | Artifact | Verdict | Recomputed hashes |
|---|---|---:|---:|
| SRR-091 | `AOCCRSL1F-050825` | `STOPPED_CURRENTNESS` | 1 |
| SRR-092 | `AOCCRSL2F-050825` | `STOPPED_CURRENTNESS` | 1 |
| SRR-093 | `JDF-417` | `DEFERRED_ACTIVE_OWNER` | 1 |
| SRR-094 | `JDF-683` | `STOPPED_FAMILY_MAPPING` | 1 |
| SRR-095 | `JDF-684` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-096 | `FORM-281` | `DEFERRED_ACTIVE_OWNER` | 0 |
| SRR-097 | `FORM-281E` | `STOPPED_CURRENTNESS` | 1 |
| SRR-098 | `CCA-XP-0220-7008` | `STOPPED_CURRENTNESS` | 1 |
| SRR-099 | `CCA-XP-0220-7009` | `STOPPED_CURRENTNESS` | 1 |
| SRR-100 | `CCA-XP-0220-7010` | `STOPPED_CURRENTNESS` | 1 |
| SRR-101 | `CC-DC-CR-072A` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-102 | `CC-DC-CR-072C` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-103 | `CC-DC-CR-072D` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-104 | `CC-DC-CR-078` | `STOPPED_FAMILY_MAPPING` | 1 |
| SRR-105 | `CR-218` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-106 | `CR-307` | `STOPPED_CURRENTNESS` | 1 |
| SRR-107 | `CR-308` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-108 | `EXP101` | `STOPPED_SCOPE_OR_VARIANT` | 3 |
| SRR-109 | `EXP105` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-110 | `NHJB-3124-DS` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-111 | `4-951` | `STOPPED_CURRENTNESS` | 1 |
| SRR-112 | `4-952` | `STOPPED_CURRENTNESS` | 1 |
| SRR-113 | `4-953` | `STOPPED_CURRENTNESS` | 1 |
| SRR-114 | `4-955` | `STOPPED_CURRENTNESS` | 1 |
| SRR-115 | `4-959` | `STOPPED_CURRENTNESS` | 1 |
| SRR-116 | `4-960` | `STOPPED_SCOPE_OR_VARIANT` | 4 |
| SRR-117 | `4-960.2` | `STOPPED_CURRENTNESS` | 1 |
| SRR-118 | `1003EX` | `STOPPED_CURRENTNESS` | 1 |
| SRR-119 | `1023EX` | `STOPPED_MISSING_BYTES` | 0 |
| SRR-120 | `SCA-C906` | `STOPPED_CURRENTNESS` | 1 |

## Safety

The payload is evidence-only. Registry URLs were copied only as locators from committed evidence and were not independently treated as proof of currentness. Statutes were not treated as forms, bundle components were not emitted as standalone sources, and all writes are confined to the SRR-D sidecar directory.
