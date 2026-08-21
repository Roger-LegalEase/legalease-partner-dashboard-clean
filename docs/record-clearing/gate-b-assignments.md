# Gate B assignments

Cut from `data/rcap-all50/gate-b-81-terminalization-queue.json` at base `fae25fc9a3d1`.

| assignment | lane | assets | expected output |
| --- | --- | ---: | --- |
| `reviewer-a` | LANE-REVIEW | 0 | one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned fa |
| `reviewer-b` | LANE-REVIEW | 0 | one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned fa |
| `reviewer-c` | LANE-REVIEW | 0 | one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned fa |
| `reviewer-d` | LANE-REVIEW | 0 | one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned fa |
| `family-rerender-1` | LANE-RERENDER | 20 | the D1 driver emitting classifiedFieldsOrAnchors and discoveredFieldsOrAnchors, every assigned family re-deriv |
| `family-rerender-2` | LANE-RERENDER | 19 | every assigned family re-derived and re-rendered against the corrected binder rerender-shard-a lands, with rep |
| `evidence-sidecars` | LANE-EVIDENCE | 39 | a conformant provenance sidecar for every re-rendered family, every field non-null, bound by hash to the artif |
| `evidence-visual` | LANE-EVIDENCE | 39 | one rasterised page per page carrying a field, for every re-rendered family, each bound to the current contact |
| `source-direct` | LANE-SOURCE | 15 | for each assigned asset: the official binary acquired and its SHA-256 recorded against the publisher of record |
| `source-resolution` | LANE-SOURCE | 16 | for each assigned asset: the official binary acquired and its SHA-256 recorded against the publisher of record |
| `retirement-repoint` | LANE-RETIRE | 11 | for each assigned asset: a retirement marker written by the canonical retirement script with every operational |

## `reviewer-a`

- **base** `fae25fc9a3d1`
- **assets** 0
- **expected output** one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned family, with every referenced hash recomputed from disk and the official source SHA-256 recomputed from the mounted Edition 1 bytes
- **focused verifier** `node scripts/verify-rcap-pdf-independent-review-records.mjs`
- **stop condition** no input: every assigned family is waiting on a rerender. Do not review anything until a rerender shard lands new bytes and the captain re-cuts this assignment.

## `reviewer-b`

- **base** `fae25fc9a3d1`
- **assets** 0
- **expected output** one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned family, with every referenced hash recomputed from disk and the official source SHA-256 recomputed from the mounted Edition 1 bytes
- **focused verifier** `node scripts/verify-rcap-pdf-independent-review-records.mjs`
- **stop condition** no input: every assigned family is waiting on a rerender. Do not review anything until a rerender shard lands new bytes and the captain re-cuts this assignment.

## `reviewer-c`

- **base** `fae25fc9a3d1`
- **assets** 0
- **expected output** one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned family, with every referenced hash recomputed from disk and the official source SHA-256 recomputed from the mounted Edition 1 bytes
- **focused verifier** `node scripts/verify-rcap-pdf-independent-review-records.mjs`
- **stop condition** no input: every assigned family is waiting on a rerender. Do not review anything until a rerender shard lands new bytes and the captain re-cuts this assignment.

## `reviewer-d`

- **base** `fae25fc9a3d1`
- **assets** 0
- **expected output** one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned family, with every referenced hash recomputed from disk and the official source SHA-256 recomputed from the mounted Edition 1 bytes
- **focused verifier** `node scripts/verify-rcap-pdf-independent-review-records.mjs`
- **stop condition** no input: every assigned family is waiting on a rerender. Do not review anything until a rerender shard lands new bytes and the captain re-cuts this assignment.

## `family-rerender-1`

- **base** `fae25fc9a3d1`
- **assets** 20
- **expected output** the D1 driver emitting classifiedFieldsOrAnchors and discoveredFieldsOrAnchors, every assigned family re-derived and re-rendered from the mounted source, and each family's reports regenerated
- **focused verifier** `node scripts/verify-rcap-official-forms-d1.mjs && node scripts/verify-rcap-evidence-contract-controls.mjs`
- **stop condition** every assigned family's classification carries the two counters, the D1 verifier passes, and the driver reproduces byte-for-byte on a second run

## `family-rerender-2`

- **base** `fae25fc9a3d1`
- **assets** 19
- **expected output** every assigned family re-derived and re-rendered against the corrected binder rerender-shard-a lands, with reports regenerated
- **focused verifier** `node scripts/verify-rcap-official-forms-d1.mjs`
- **stop condition** every assigned family re-renders clean against the corrected binder and the D1 verifier passes; blocked until family-rerender-1 lands the binder change

## `evidence-sidecars`

- **base** `fae25fc9a3d1`
- **assets** 39
- **expected output** a conformant provenance sidecar for every re-rendered family, every field non-null, bound by hash to the artifacts it describes
- **focused verifier** `node scripts/generate-rcap-gate-b-evidence-completion.mjs --check`
- **stop condition** every re-rendered family carries a complete sidecar that hashes to its current artifacts; blocked on each family until its rerender lands

## `evidence-visual`

- **base** `fae25fc9a3d1`
- **assets** 39
- **expected output** one rasterised page per page carrying a field, for every re-rendered family, each bound to the current contact-sheet hash
- **focused verifier** `node scripts/verify-rcap-evidence-contract-controls.mjs`
- **stop condition** every re-rendered family's raster coverage is complete and no manifest names a superseded artifact hash

## `source-direct`

- **base** `fae25fc9a3d1`
- **assets** 15
- **expected output** for each assigned asset: the official binary acquired and its SHA-256 recorded against the publisher of record, or a recorded finding that no official source exists
- **focused verifier** `node scripts/generate-rcap-source-resolution.mjs --check`
- **stop condition** every assigned asset carries either an acquired source with a receipt, or a recorded no-official-source finding naming what was searched

## `source-resolution`

- **base** `fae25fc9a3d1`
- **assets** 16
- **expected output** for each assigned asset: the official binary acquired and its SHA-256 recorded against the publisher of record, or a recorded finding that no official source exists
- **focused verifier** `node scripts/generate-rcap-source-resolution.mjs --check`
- **stop condition** every assigned asset carries either an acquired source with a receipt, or a recorded no-official-source finding naming what was searched

## `retirement-repoint`

- **base** `fae25fc9a3d1`
- **assets** 11
- **expected output** for each assigned asset: a retirement marker written by the canonical retirement script with every operational reference proven absent, or a recorded repoint to the canonical asset
- **focused verifier** `node scripts/verify-rcap-binary-identity-rules.mjs && node scripts/generate-rcap-retirement-adjudication.mjs --check`
- **stop condition** every assigned asset is either retired with its seventh condition satisfied or carries a recorded repoint; no asset with a surviving operational dependency is retired
