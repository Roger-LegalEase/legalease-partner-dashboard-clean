# RQC-B — Raster queue missing-artifact completion

## Scope and result

RQC-B re-measured RQC-011 through RQC-028 at `e6fb360f41f621abcc904419e8f750afa404a84e`. The 18 unique artifact rows still reconcile to nine packet families. All nine companion canonical/boundary pairs are **READY_TO_APPLY**. No raster was rendered and the controlling queue was not modified.

## Measurement method

- Read the assigned rows from `RASTER_QUEUE_COMPLETION_WAVE.json`; selected only RQC-011–RQC-028.
- Recomputed every PDF SHA-256 from current-head bytes and parsed every PDF with `pdf-lib` to recompute its page count.
- Read each PDF back from packet commit `c055f20fc63b12c5cd998fa2171cda0519c6a6f1`, rehashed those committed bytes, and confirmed both files in every pair are unchanged at current head.
- Confirmed each artifact's last-touch commit is the same exact packet commit. Its recorded provenance is `P2_WA_VACATUR_COMPLETENESS`, committed as `fix(rcap): complete Washington vacatur packets` by Roger-LegalEase and cherry-picked from `ba1d0501d8fab684f7b5498f9242fdd121596536`.
- Checked each family's source receipt, build findings, build status, and controlling assignment posture. Each has held source binding, no blocking artifact finding, deterministic fixture rebuild evidence, and no active rebuild dispatch.

## Family results

| Family | Canonical | Boundary | Pages each | Verdict |
|---|---|---|---:|---|
| `wa_vac_cannabis-set` | `05e54d039621b60c26af09cfc106485a17289ebfbc998774c013d1a2380dedbc` | `73a23e0f22cebf5cde9af115504e81118b22ac1f688f0482646159627d758e4e` | 2 | READY_TO_APPLY |
| `wa_vac_domestic_violence-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |
| `wa_vac_felony-set` | `1c715d2be4cfa5398a82fad6999570e1502a607a3f939061f01710f443d5e6eb` | `e5014e2e979599132c6232fae1b94fe8dd271eef6a63c113e42a886377840721` | 3 | READY_TO_APPLY |
| `wa_vac_homicide_victim_prostitution-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |
| `wa_vac_misdemeanor_ordinary-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |
| `wa_vac_substance_use_disorder-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |
| `wa_vac_survivor_felony-set` | `1c715d2be4cfa5398a82fad6999570e1502a607a3f939061f01710f443d5e6eb` | `e5014e2e979599132c6232fae1b94fe8dd271eef6a63c113e42a886377840721` | 3 | READY_TO_APPLY |
| `wa_vac_survivor_misdemeanor-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |
| `wa_vac_treaty_fishing-set` | `3abc2475b78da8cff2445a99a78fa7aa18641d4c27f17d0c5eea3d6f07e40ce7` | `4d844aece78a8ae1c1e97407edd305f45dbdaa2c509f8e55ef51fef03bcb3a55` | 6 | READY_TO_APPLY |

## Queue collision reconciliation

All nine family IDs already occur in the current queue, but those rows bind the families' other document pairs and their existing RASTER_PASS receipts. The 18 assigned artifacts remain missing exact queue bindings. The apply delta therefore describes nine **companion artifact-pair additions** and explicitly forbids overwriting the existing rows. Applying it requires an applier that preserves multiple exact artifact-pair bindings per family.

## Verdict counts

- READY_TO_APPLY: 9
- STOPPED_MISSING_ARTIFACT: 0
- STOPPED_NONVISUAL_INCOMPLETE: 0
- STOPPED_SOURCE: 0
- STOPPED_LEGAL_INPUT: 0
- DEFERRED_ACTIVE_OWNER: 0
- STALE_ARTIFACT: 0
- Hashes recomputed: 18

## Safety

This shard changes only the five required files below its owned path. It does not modify `RASTER_QUEUE.json`, PDFs, workflows, claims, active lanes, commercial routes, or production. The delta authorizes no render or promotion.
