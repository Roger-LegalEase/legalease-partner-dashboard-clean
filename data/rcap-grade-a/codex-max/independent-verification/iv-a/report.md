# IV-A independent verification report

## Scope and collision result

IV-A processed each of the four assigned families exactly once. The collision gate permitted read-only evidence review for Nebraska and both West Virginia families. South Dakota was deferred without reading its packet evidence because VF15 still held an unreleased independent-verification claim.

## Results

| Family | Verdict | Independent finding |
|---|---|---|
| `ne-setaside-custodial-set` | `FAIL_REPAIR_REQUIRED` | Exact PDF hashes, page count, component set, source bytes, successful raster receipt binding, protected fields, and all nine completeness counters passed. Participant instructions omit filing destination, fee/waiver treatment, service/notice directions, and a self-help stop. |
| `sd_arrest_expungement-set` | `DEFERRED_ACTIVE_CLAUDE_OWNER` | VF15 owns an unreleased verification claim. No packet evidence was inspected. |
| `wv_conv_single_misdemeanor-set` | `FAIL_REPAIR_REQUIRED` | Exact PDF hashes, page count, component set, source bytes, successful raster receipt binding, official instruction component, protected fields, and all nine completeness counters passed. Participant instructions omit fee/waiver treatment and a self-help stop. |
| `wv_conv_multiple_misdemeanors-set` | `FAIL_REPAIR_REQUIRED` | Exact PDF hashes, page count, component set, source bytes, successful raster receipt binding, protected fields, and all nine completeness counters passed. Participant instructions omit fee/waiver treatment and a self-help stop. |

No builder or earlier verifier conclusion was inherited. The repository completeness verifier was executed independently for every non-deferred family, and the canonical/boundary hashes and page counts were recomputed from repository bytes. Exact held source binaries were independently hashed and matched every source receipt.

## Raster artifacts

All four queue rows contain `RASTER_PASS`, successful jobs, exact canonical and boundary bindings, receipt artifact IDs/digests, and the successful canary dependency. Direct receipt-JSON and PNG-set retrieval could not be attempted with authenticated GitHub access because no repository-authorized GitHub credential was present. This egress/authentication limitation is recorded separately and is not treated as a packet defect.

## Repair boundary

Three family-specific, instructions-only repair payloads are recorded in `repair-payload.json`. They do not authorize changes to PDF bytes, overlays, builders, sources, decisions, claims, queues, launch authority, production, or commercial routes. Each repair requires a different independent reverifier; the instruction-only corrections do not require a PDF rerender.
