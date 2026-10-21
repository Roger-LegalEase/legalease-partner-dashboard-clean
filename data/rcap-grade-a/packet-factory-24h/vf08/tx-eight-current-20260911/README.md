# VF08 current Texas independent review

Base: `7f04efd687f94b2bdd19a98f78f356480da5ee8f`. All eight candidates remain `FAIL_REPAIR_REQUIRED`: **109 PASS / 11 FAIL / 0 unmeasured obligations**, all 120 reviewed.

| Family | Failed obligations |
| --- | --- |
| `tx_exp_acquittal-set` | ROUTE_IDENTITY |
| `tx_nd_conviction_no_supervision-set` | ROUTE_IDENTITY |
| `tx_nd_dwi_deferred-set` | ROUTE_IDENTITY |
| `tx_nd_probation_misdemeanor-set` | ROUTE_IDENTITY |
| `tx_nd_deferred_other-set` | KNOWN_PREFILLS |
| `tx_nd_dwi_probation-set` | KNOWN_PREFILLS, REQUIRED_BEFORE_FILING |
| `tx_nd_veterans_court-set` | KNOWN_PREFILLS, REQUIRED_BEFORE_FILING |
| `tx_nd_veterans_reemployment-set` | KNOWN_PREFILLS, REQUIRED_BEFORE_FILING |

The four FIX07 candidates retain internal route trailers. The four FIX06 candidates retain an ISO DOB beneath the Statement’s Month Day Year instruction. Three of those four also omit the Option 1 DOB completion tasks and falsely classify the three birth-date boxes as protected signing-date fields. Deferred-other has the correct completion disclosure.

All 546 stroke-only appearances exactly match held raw source streams; no stripped or unmatched current appearance remains. All 16 current PDFs match manifests, current VF90 primary evidence and original raster bindings at run `34644046027`, immutable pin `3c799170ea5f0bdf4bdc75338b5defb364cec9b1`. All 384 original page PNGs and the original ZIP/log hashes were verified. Direct inspection covered 41 unique original PNGs representing 70 changed or defective pages; valid unchanged prior source/raster/legal evidence was retained with dependency bindings. Canvas: 2448×3168; paper: 2040×2640.

Eight production `--check` entrypoints and eight read-only completeness checks exited 0; focused date tests passed 11/11. These tests do not detect the remaining cohort defects. Initial build-environment preflight was 10/14: inherited private symlink/ignore/corpus-environment/index issues, recorded without mutation; each exact held family source binds and root authorized read-only continuation.

Read `review.json` for the full verdict, `obligation-rows-120.json` for individual obligations, `repair-assignments.json` for the complete repair batch, `dob-disclosure-audit.json` for the three omitted DOB lines, and `evidence-bindings.json`, `current-measurements.json`, `stream-measurements.json`, `visual-review.json`, and `commands.json` for measurements and custody. The earlier reports remain historical evidence, not current approval.

Reproduce the read-only measurements with `node <this-directory>/measure-streams.mjs`, `python3 <this-directory>/measure-current.py`, `python3 <this-directory>/bind-evidence.py`, and validate with `python3 <this-directory>/validate-review.py`. No local raster, packet changes, source changes, central record mutation, route promotion or commercial approval occurred.
