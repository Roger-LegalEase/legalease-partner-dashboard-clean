# IV-B — Independent verification superlane report

## Outcome

IV-B attempted all three assigned Utah petition families exactly once. Each current queue row is `RASTER_PASS`; each receipt binds a successful job and canary dependency to the exact recomputed canonical and boundary hashes, and both PDFs have the expected 19 pages. Nevertheless, all three families receive `FAIL_REPAIR_REQUIRED` because the packet's participant guidance is only a required-facts checklist, not usable filing-and-timing instructions.

| Family | Verdict | Canonical SHA-256 | Boundary SHA-256 | Pages |
| --- | --- | --- | --- | ---: |
| `ut_pet_acquittal-set` | `FAIL_REPAIR_REQUIRED` | `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6` | `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765` | 19 |
| `ut_pet_conviction-set` | `FAIL_REPAIR_REQUIRED` | `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6` | `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765` | 19 |
| `ut_pet_limitations-set` | `FAIL_REPAIR_REQUIRED` | `ad594f0a40750195b67e36916f3628df5b96d337e4955c9063b415747d6e36d6` | `b3ba83a65754f96fe58083de62a3ce879654d6362170e11bae2f043e4c39a765` | 19 |

## Independent checks

- The cloud packet preflight passed 14/14 for each family with the assignment's minimum ancestor.
- All nine official source bytes per family were independently SHA-256 hashed from the mounted corpus and matched the source receipt and byte length.
- The packet completeness verifier independently returned `PASS_COMPLETE` and family-level zero counters for all three families (38/444 writes each).
- The component manifests agree on nine official documents, including proposed order 1020EX; protected, repeating-row, route-option, and later-completion checks pass.
- Direct reading of each `participant-instructions.md` found no filing sequence, destination directions, fee/waiver procedure, service/notice procedure, timing/deadline guidance, or self-help stop. This independent defect controls the verdict notwithstanding completeness and raster passes.

## Raster artifact phase

Artifact retrieval was attempted using repository-authorized access only. No authorized credential was present, so the remote receipt JSON and PNG sets were not directly inspected. This egress/access result is recorded separately and is not treated as a packet defect.

## Guardrails

No packet, overlay, builder, source receipt, legal decision, claim, queue, launch-authority, commercial-route, or Production file was modified. Repairs are specified but were not applied.
