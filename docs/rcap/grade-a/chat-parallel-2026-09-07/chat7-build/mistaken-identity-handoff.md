# Chat 7: Missouri mistaken-identity candidate, 2026-09-07

Implementation commit: `48fb4ea228b20fab01af4b4055ea6e00b7f072d5` on `chatgpt/extra-build-mo-20260907`, targeting `chatgpt/launch-recovery-20260906`.

**BUILT CANDIDATE. BINARY REPOSITORY PUBLICATION PENDING. NOT TERMINAL.**

This is actual CR301 / conditional FI-05 / conditional CR311 packet code, not a queue-only change. It reuses the shared fitting, flattening/sanitation and deterministic-date primitives without editing shared code. The held CR301 was recovered and its checksum verified; do not reopen its old acquisition hold.

## Exact execution

```sh
node --test scripts/rcap-packet-recovery/chat7/mistaken-identity.test.mjs
python scripts/rcap-packet-recovery/chat7/verify-pdf-content.py
```

Node: exit 0, 36 tests, 36 pass, zero fail/skip/cancel. Test 36 executes this complete renderer twice, with more than one second between runs:

```sh
node scripts/build-census-v1-mo-610-145-mistaken-identity-set.mjs --no-raster
```

Both render exits were 0. Exact filenames and SHA-256 of all 33 generated family files matched. The committed `mistaken-identity-determinism.json` contains every output hash and both renderer outputs. This is not a `--check` claim.

Python: exit 0. All nine variants / 57 pages checked; every mapped text value found in its own component, no surviving widgets/annotations, all page-text bounds checked. CR301 signature region, CR311 entire judicial body/execution region and FI-05 official code pages matched the blank-source diagnostic pixels. Builder visually inspected all 27 unique complete page images accounting for all 57 variant pages. These are PyMuPDF diagnostics, not calibrated Chromium raster admission or independent review.

## Component coverage

For each canonical/boundary fixture:

| Case / order selection | Components | Pages |
| --- | --- | ---: |
| Existing case, no proposed order | CR301 + 3 instruction pages | 4 |
| Existing case, proposed order requested | CR301 + CR311 + instructions | 5 |
| New case, no proposed order | CR301 + FI-05 + instructions | 9 |
| New case, proposed order requested | CR301 + FI-05 + CR311 + instructions | 10 |

FI-05 includes two copies of its official first page for five named parties, then official pages 2-4 once. A seven-party regression exercises three copies of page 1. The ninth variant is one-page automatic-notice guidance only, not a disguised petition.

Canonical full packet SHA-256: `152147a5a425c2f8f0e71af814164977047b6f3eafca8f746159eb09427d8b29`.

Boundary full packet SHA-256: `63c6dc7aa18c69f2deea8e8ea4b3d2b04d3f8f39bed2ce048bb72e9703ac0ed0`.

## Exact retained candidate bytes

Conversation artifact `chat7-mistaken-identity-candidate-20260907.zip`: 5,532,236 bytes, SHA-256 `17a10e612bf2430af70a3da697903d9b20131c4504438f57142ebe592168ca06`. It contains all 33 generated family files, the six implementation/test/fixture files, all three held source PDFs and detailed test/inspection/hash evidence (47 files total). No node_modules, shared renderer copies or standalone font files are included.

Complete new-file patch `chat7-mistaken-identity-complete-candidate.patch`: SHA-256 `c37cd1d4bd7e052035f9ad336d80226d2c77969c420ecf9c8145c4885966ca47`.

Binary-only patch `chat7-mistaken-identity-binaries.patch`: SHA-256 `6166f868a0955d019d575df89da133f58854d8197cb4ebb38aec635835b7351e`.

The full patch was applied in isolated empty staging and all 47 files compared byte-for-byte. Do not blindly apply its implementation additions after cherry-picking the implementation commit; use the archive for missing paths or the binary-only patch, then rebuild reports. Native Git transport in this runtime failed with `Could not resolve host: github.com`. Connected GitHub published the text implementation and this evidence; the large PDF payload has not been written to the repository. A sandbox artifact filename is not a durable GitHub download URL.

## Scope and remaining requirements

Identity-theft section 575.120, ordinary arrest section 610.122, arrest/conviction section 610.140 and marijuana routes are not treated as interchangeable. The importer refuses mixed cases, contradictory disposition/identity confirmations, invalid date order, unsupported source sex choices, unknown component choices and protected execution inputs. No signature, notarial act, judicial finding/date or completed service is invented. CR311 receives caption/record-holder labels only. FI-05 case-type and party-type codes remain disclosed clerk-confirmation items, not guessed codes.

The three actual source hashes, editions, dependency artifact/hash, reconciled shared-code blobs and remaining requirements are recorded in `data/rcap-grade-a/chat-parallel-2026-09-07/chat7-build/mistaken-identity-publication.json`.

Remaining: repository PDF publication; reconciliation of the current whole packet-set manifest rather than claiming the recovered archive is current; source-edition acceptance; central verifier-compatible reporting with closed-vocabulary per-field blank dispositions and actual nine completeness counters; Chat 10 independent review; Chat A calibrated raster admission and integration. No `PASS_COMPLETE`, terminal transition or zero completeness-counter claim is made. Other five assigned families are not completed by this handoff. No shared builder, runtime, registry, generated queue, workflow, production/main/Captain or live auth/payment changes were made.
