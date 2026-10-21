# CB07 raster queue and artifact hash audit

## Scope and result

CB07 audited the committed central raster queue without dispatching a workflow, rendering a page, modifying a packet PDF, or editing queue state. All 25 rows were inspected. SHA-256 was recomputed from both referenced artifacts, page counts were read from the PDF bytes, and path, expected-page, scale, builder-assignment, packet-commit, and receipt bindings were checked.

| Measure | Result |
| --- | ---: |
| Queue rows audited | 25 |
| Exact artifact hashes recomputed | 50 |
| Valid hash-bound rows | 15 |
| Rows with valid bytes but no builder assignment | 10 |
| Stale queue rows | 0 |
| Completed artifacts missing exact queue binding | 18 PDFs / 9 families |
| Matching committed `RASTER_PASS` receipts | 0 |
| False `RASTER_PASS` rows | 0 |
| Canary families | 15 |

## Findings

Every queue-referenced canonical and boundary path exists, all 50 recomputed hashes match, canonical and boundary page counts agree with each row's `expectedPages`, every scale is 2.5, and the pinned packet commit is present and ancestral to the audited checkout. Ten otherwise byte-valid rows have a null `builderAssignment`; they are excluded from the canary because CB07 treats assignment verification as required rather than inferred.

Nine completed Washington families contain a second canonical/boundary component pair not named by any queue row. The 18 exact artifact paths, hashes, roles, and page counts are recorded in `missing-queue-entries.json`. This is missing coverage, not a stale row: the first component pair currently named by each affected queue row still exists and still matches its pinned hash.

No committed raster runtime receipt was found in the raster evidence/result locations. The queue itself contains zero `RASTER_PASS` states, so there are no false pass rows. Absence of a receipt is not treated as a pass.

## Canary and reachability

`canary-manifest.json` contains exactly the 15 rows for which paths, hashes, expected pages, scale, current builder assignment, and packet commit all verify. It is an audit manifest only and explicitly grants no dispatch authority.

Default-branch reachability is confirmed only from committed evidence: the queue records that the workflow landed on `main` as `3fa877b46afda8299fcdc6ed6e4f15d64801a3d0` via PR #169 and that a dispatch returned HTTP 204. This checkout has no local `main` or remote ref, and CB07 performed no network operation, so it does not claim an independent live re-verification.

## Safety invariants

- Packet PDFs modified: 0.
- Raster queue modified: 0.
- Workflows dispatched: 0.
- Commercial routes opened: 0.
- Production touched: no.
- `PASS_COMPLETE` asserted or altered: no.
