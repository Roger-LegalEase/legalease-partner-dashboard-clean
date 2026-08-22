# Gate B numbered-session dispatch

The eleven assignment files are unchanged. This names the session that owns each and pins the remote tip it continues from; no asset id, family id, allowed path, prohibited path or denominator membership is altered here.

## Wave A — base `1b8a8cdd`

Superseding `da902cbab36b` (superseded_by_current_wave_base). Session 7 pushed 1b8a8cdd on top of it before either evidence leg was built, so evidence from da902cba would describe bytes the reviewer would not be looking at.

Measured path by path between the two bases rather than inferred from the commit subject. Exactly two paths moved: field-classification.json on the two AOC-CR-287 families, which gained the completeness counters. Source records, source receipts, overlay profiles and their derived forms, field censuses, canonical and boundary artifacts, contact sheets and provenance sidecars are byte-identical across all four. The provenance sidecars name no classification digest, so none went stale behind the change.

Frozen for the life of the wave: AK:tf-810-form-en, NC:aoc-cr-287-form-es, NC:aoc-cr-287-form-vi, NC:aoc-cr-288-form-es.

| session | role | assignment | assets | continuing from |
| ---: | --- | --- | ---: | --- |
| 1 | captain / integration | — | 0 | — |
| 2 | independent review | `reviewer-a.json` | 0 | — |
| 3 | independent review | `reviewer-b.json` | 0 | — |
| 4 | independent review | `reviewer-c.json` | 0 | — |
| 5 | independent review | `reviewer-d.json` | 0 | — |
| 6 | shared code and source-pack factory | — | 0 | `c5c60eb00693` |
| 7 | family rerender | `family-rerender-1.json` | 19 | `32f6e39a3bf4` |
| 8 | family rerender | `family-rerender-2.json` | 19 | `af9c0107a29c` |
| 9 | provenance sidecars | `evidence-sidecars.json` | 38 | `818c0ddc63cc` |
| 10 | all-page visual evidence | `evidence-visual.json` | 38 | `ac91c7d0a1b5` |
| 11 | source acquisition | `source-direct.json` | 11 | `6f9e87374063` |
| 12 | source resolution | `source-resolution.json` | 11 | `c8528c411827` |
| 13 | retirement and repoint | `retirement-repoint.json` | 9 | `f005a0eb1b40` |
