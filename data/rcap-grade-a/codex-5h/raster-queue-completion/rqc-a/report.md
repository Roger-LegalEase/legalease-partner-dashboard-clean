# RQC-A — Exact builder attribution for RQC-001–RQC-010

Measured at `e6fb360f41f621abcc904419e8f750afa404a84e`. The required captain ancestor `71894f3f2dde0f5af34818a2fa8dc8bce84e0d24` is present.

## Result

| Row | Family | Verdict | Builder assignment | Integrated builder commit |
|---|---|---|---|---|
| RQC-001 | `sd_arrest_expungement-set` | READY_TO_APPLY | `P4_NE_SD_SETASIDE_COMPLETENESS` | `23353d3c2feb3b76f77c4788f0de2250b6de0088` |
| RQC-002 | `wa_vac_cannabis-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-003 | `wa_vac_domestic_violence-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-004 | `wa_vac_felony-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-005 | `wa_vac_homicide_victim_prostitution-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-006 | `wa_vac_misdemeanor_ordinary-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-007 | `wa_vac_substance_use_disorder-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-008 | `wa_vac_survivor_felony-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-009 | `wa_vac_survivor_misdemeanor-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |
| RQC-010 | `wa_vac_treaty_fishing-set` | READY_TO_APPLY | `P2_WA_VACATUR_COMPLETENESS` | `c055f20fc63b12c5cd998fa2171cda0519c6a6f1` |

## Provenance finding

The current South Dakota bytes were rendered by the assigned `P4_NE_SD_SETASIDE_COMPLETENESS` worker and integrated in `23353d3c2feb3b76f77c4788f0de2250b6de0088`. The current Washington bytes were rendered by the assigned `P2_WA_VACATUR_COMPLETENESS` worker and integrated in `c055f20fc63b12c5cd998fa2171cda0519c6a6f1`. Git history shows those commits are the last commits that changed both named PDFs for each row.

The later independent-verification, raster-verification, and packet-repair work is not attributed as the builder. `C11_PACKET_FACTORY_ACCELERATOR` built earlier bytes, but the completeness-repair assignments explicitly required canonical and boundary re-renders and their integrated commits changed the PDFs; therefore C11 is not the producer of the current bytes.

The queue snapshot commit `1d88410129d4f2240bb6dbd242e63884fe01e7e2` contains every currently named byte pair and remains the queue binding. The delta changes only each null `builderAssignment`; it conditionally matches commit, paths, hashes, and the null assignment so drift causes refusal rather than a plausible attribution.

## Measurements

All 20 PDF SHA-256 values were recomputed from the current worktree and match both the assigned wave and current raster queue. Each of the ten families occurs exactly once in the current queue. All ten rows are `READY_TO_APPLY`; no builder provenance is stopped, no artifact is stale, and no active owner requires deferral.

## Safety

`RASTER_QUEUE.json` and all packet PDFs are read-only inputs to this shard. No PDF was rendered, no commercial route was opened, and production was not touched.
