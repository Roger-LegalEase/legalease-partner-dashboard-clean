# LANE-SOURCE — source-resolution handoff

Assignment: `data/rcap-all50/gate-b-assignments/source-resolution.json` (19 assets)
Findings: `source-resolution-findings.json`
Generator: `scripts/generate-rcap-gate-b-source-resolution-handoff.mjs` (deterministic; zero diff on a second pass)

Denominated on the **assigned asset population** — one row per assigned asset id.
No alias grouping is used and no alias-group denominator appears here.

## Outcome against the assignment's stop condition

The stop condition is that every assigned asset carries either an acquired
source with a receipt, or a recorded no-official-source finding naming what was
searched. **No asset could be acquired**, so all 19 carry a recorded finding
naming the five places searched.

| Disposition | Assets |
| --- | ---: |
| `official_landing_page_resolved` | 14 |
| `official_direct_url_resolved_acquisition_blocked` | 2 |
| `genuinely_no_official_source_identified` | 2 |
| `wrong_identity_offered` | 1 |

17 of 19 resolve to a host on the jurisdiction's own official host list.
`acquiredHere: 0` and `sha256RecomputedHere: 0` — every hash in this artifact is
read back from a committed record, never recomputed from bytes.

## Two blockers, both external

1. **Publishers of record unreachable.** The egress gateway answered `403` to
   `CONNECT` for `www.vtcourts.gov`, `www.nccourts.gov`,
   `supremecourt.nebraska.gov` and `www.vacourts.gov`.
2. **Corpus not mounted.** The assignment's own focused verifier exits with
   `FAIL source resolution — the corpus is not mounted at
   private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1`, so no
   SHA-256 could be recomputed and no acquisition receipt could be issued.

Every row carries an exact operator action naming the host, the URL and the
comparison to perform.

## Defect found in the acquisition queue

`scripts/generate-rcap-source-acquisition-queue.mjs` sliced
`docs/record-clearing/problematic-pdf-master-list.csv` on bare commas, so for
three assigned assets the `url` field holds the `officialSourceUrl` column plus
**every column after it** — publisher, retrieval date, revision, sha256, and the
git-ignored corpus path. Those strings are not URLs and must not be fetched or
repinned as they stand.

The recovery is provable rather than guessed: splitting on commas puts the
pinned sha256 at index 4, exactly where the CSV column order predicts, and that
alignment is **confirmed by the pinned sha for both assets that have one**
(VT 200-00131, VT 200-00631). The third, NC `cr297.pdf`, pins no sha at all, so
its recovery is recorded as unverified rather than confirmed.

## Findings needing an owner

- **NC `cr297.pdf` — wrong identity.** Resolves to a slug that names the
  *nonviolent felonies instructions* resource, not a filing form. This is the
  same crossing already recorded for the AOC-CR-297/298 pair.
- **11 of 19 assets collide on a generic index URL.** `/documents/forms`
  (4 NC assets), `/criminal/expungement` (3 VT assets),
  `/courts/circuit/resources/forms/` (2 VA assets) and `/media/10142`
  (VT 200-00132 and 200-00132A, two distinct filings on one media id). An index
  URL cannot distinguish the assets pinned to it; each needs a form-level PDF.
- **NE `CC-6-11.pdf` and `CC-6-11-2.pdf` — no official URL in any committed
  index.** `CC-6-11-2`'s pinned sha256 *is* present in the archive index at
  `STATES/NE/02_PACKET_FORMS/NE__FORM__CC-6-11.2__…__REV-2020-12__EN.pdf`, so a
  binary exists without a recorded official URL. `CC-6-11` pins no sha and
  appears in neither the archive index nor the unmatched-source reconciliation.
  A `.../sites/default/files/CC-6-11.pdf` URL matching the sibling CC-6-12
  pattern is an **unverified pattern candidate to probe**, not a resolution, and
  is deliberately not recorded as one.
