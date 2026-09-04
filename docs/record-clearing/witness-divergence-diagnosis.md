# Witness divergence diagnosis

All **262** intended-paid pathways from Session A's canonical graph (`99425ad54d2658ce…`).

| Outcome | Pathways |
|---|---|
| `correct_pathway` | 262 |
| `wrong_path` | 0 |
| `non_converging` | 0 |

## The baseline was wrong about itself

The committed witness answered `resolved_timing_bucket` with the **first** option,
`lt_1_year` — the least clearable value in a list ordered shortest to longest. Every route
carrying a waiting period therefore failed closed on an anchor it could never satisfy.

**0** pathways move from wrong-path to correct once the witness answers like a
genuinely clearable record. Those were never runtime defects, and reporting them as such
would have sent Session A after patches that do not exist.

## Shared defect clusters

What survives the corrected pass, grouped by cause. One correction per cluster.

Each pathway belongs to exactly one cluster, so the counts add up to the failing set and
a cluster means "fix this and these are done".

| Cluster | Pathways | Jurisdictions |
|---|---|---|

## Fixtures

`data/rcap-ledger/public-witness-fixtures.json` carries **262** replayable fixtures — every
pathway the existing runtime already reaches, with the exact answers and the terminal
result each must produce. A regression shows up as a fixture failure rather than a lost route.

Regenerate with `node scripts/generate-rcap-witness-divergence-diagnosis.mjs`.
