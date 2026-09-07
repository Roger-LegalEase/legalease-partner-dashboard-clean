# Chat 9: Minnesota subdivision 3 complete candidate

## Exact complete deliverable

`mn_petition_609a02_subd3-set` has 18 complete synthetic variants, 420 bundle page instances and 194 generated family files. Canonical and boundary are 22 pages each. All eight clauses of 609A.02 subdivision 3(a) are exercised, including both four- and five-year reduced-felony alternatives, the long identity/multiple-charge boundary, optional recipients, required and additional unknown service addresses, four requested fee variants, and unpaid obligations.

Each bundle contains the preparation guide, EXP101 instructions, EXP102 petition with its applicable continuation, EXP104 prepared service proof and **EXP105** proposed order. Selected FEE102 adds six pages only for an explicit fee request. The favorable-resolution statutory fee branch includes no unnecessary FEE102. No EXP106, EXP107 or FEE103 is substituted. The review bundle is not a mailing set: serve the signed petition/continuations and relevant attachments plus unsigned proposed order; later execute/file service proof. Keep confidential fee material separate.

Archive: Drive `1d40hH2ZkcSt1zrh35Z7xgTsV_YUo19v7`, `CHAT9_MN_SUBD3_COMPLETE_CANDIDATE_2026-09-07.tar.xz`, 64,767,472 bytes, SHA256 `16ef23da683243fe9af7ba4f3369e96f8f564d3c7c9996f2b348300faf60ecf0`. Connected upload and download-back succeeded. The complete returned archive and all 336 candidate members were rehashed successfully. No fonts, dependency tree, private corpus, unrelated families, shared primitive changes or global registries are included.

Canonical SHA256 `083a5874de441b51a0e6b4598acf13b28c442cde3291b4fb5e85cf55336e6622`; boundary `ed0af540533e3af111e3eedf315eca830adb6d1ff668c94fedc75b7ef13be427`.

## Publication is not yet repository installation

These PR commits publish the receipt and handoff. The actual code/tests, PDFs, retained sources, maps and complete evidence are in the archive, not yet installed at their GitHub paths. A should consume those exact bytes rather than author a replacement build.

`CANDIDATE_MANIFEST.json` records every path/hash and the expected old hash for modified Chat9-owned inputs. `candidate.patch` is 90,799,342 bytes, SHA256 `5556b119750ef9a5acbd00475208a0f0ebe5a380697e3ab650562cfc95403bfc`. Actual isolated `git apply --check` and `git apply` both exited 0; all 336 resulting hashes matched.

The patch baseline is the exact overlapping source/helper inputs from the earlier MN15218 archive, Drive `1RcAxDeAGcDtBCHvE_sXCfEhIRLWG7o1m`, SHA256 `5be2f8402fd72fa2b9714e03fac0df737e5034273bc1f57589220a24049ae16a`. That archive is not assumed already installed. Install/check that baseline first, skip only already-identical paths, replace only expected-old hashes, and refuse other conflicts. Three earlier Chat9 helpers are extended: `mn15218.mjs`, `audit-mn15218.py` and `mutate-mn15218.py`. They are not shared framework files. Their before/after hashes are in the receipt. Earlier Michigan and MN15218 archives and outputs remain unchanged.

## Executed checks

```sh
python scripts/rcap-packet-recovery/chat9/repeat-mn-family.py mn_petition_609a02_subd3-set
node scripts/build-census-v1-mn_petition_609a02_subd3-set.mjs
node --test scripts/rcap-packet-recovery/chat9/test-mn-subd3.mjs
node --test scripts/rcap-packet-recovery/chat9/test-mn15218.mjs
node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family mn_petition_609a02_subd3-set
python scripts/rcap-packet-recovery/chat9/audit-mn15218.py --root . --family-dir data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--official-pdf-fill --variants <six-exact-variant-IDs> --out <shard-directory>
python scripts/rcap-packet-recovery/chat9/mutate-mn15218.py --family mn_petition_609a02_subd3-set
```

The repeat driver ran TWO actual full subdivision-3 renderers, both exit 0, matching every one of 194 family files. The new suite passed 131 tests, zero failures, exit 0. The previous 15218 suite passed 96 tests, and two full 15218 renderers using the extended adapter reproduced all 84 earlier family files byte-for-byte. The unchanged existing completeness importer returned exit 0/PASS_COMPLETE. This is author-run structural evidence, not independent acceptance.

Final complete-PDF coverage used three exhaustive six-variant invocations of the same auditor, all exit 0. Every one of 18 variants is covered exactly once, with 1,332 visible text checks and 183 protected-region pixel comparisons. All source words retain their positions; undeclared ink, component/bundle mismatch and protected-field changes are checked. Author visual review covers 97 distinct complete final page images and all 420 page instances through exact raster aliases. Seventy-two source-font bounding-box advisories were retained and examined, not erased or mislabeled zero warnings.

After refreshing component/whole-PDF hashes and recombining complete bundles, six deliberately corrupted complete packets were rejected: fabricated applicant signature, fabricated judicial finding, wrong-route mark, covered required mark, visually covered but still extractable identity text, and omitted order. An intact recombined bundle passed. All 194 originals remained unchanged.

Commands, actual exit codes, log hashes, input hashes, all output hashes, complete shard reports, mutation controls and full-page images are retained under the family's `chat9-build` evidence directory. Several monolithic audit invocations timed out and are not claimed successful; the three final exhaustive shard invocations completed. The original 138 MB ZIP upload reference failed; the smaller tar.xz preserves the same candidate members and was uploaded/downloaded/rehashed successfully.

## Facts, source and procedure boundaries

Diversion/stay of adjudication tests require no new **charges** during the one-year interval. Conviction clauses require no new **convictions** during their applicable interval. Calendar anniversaries and just-before boundaries are tested. Reduction orders, disposition classes, all-charge coverage, registration exclusion, automatic-status checks, optional recipients and protected fields require explicit facts. Listing paragraph identities and conditional qualification facts are not a general legal eligibility classifier or independent source approval.

A participant requesting paragraph 20 relief must explicitly identify its sentencing provision. Other offenses sentenced under 609.52 subdivision 3(3)(a) are not incorrectly rejected merely because their own offense number is not 609.52. No sentencing provision is guessed from a dollar amount.

Hearing and actual service/execution remain later acts. Unknown required and additional service addresses stop mailing without fake addresses. Unknown spouse income stops fee filing without a zero amount or unsupported poverty calculation. Missing court balance, criminal history, disposition, no-contact order and fee proof remain external record tasks, never fabricated attachments. Unpaid obligations are disclosed, preserving the official order's financial-obligation treatment. All four EXP105 judicial-body pages remain unfilled; prepared captions are not decisions. Review flags produce a bounded professional handoff rather than a fabricated safe result.

EXP105 held source: 195,876 bytes, four pages, revision 7/24, SHA256 `754cd7a55b07409fe8752906d38dcccc45ab6a13cda5a3d7d061a689b837b4a0`. Other source hashes are retained in the archive. Current primary statute and official form index were checked separately from held-source custody. Fresh remote PDF byte equality and source approval are not asserted. Recovered dependencies were reconciled to current relevant shared blobs and lockfile; the execution scaffold is not represented as a current full checkout.

Primary references: https://www.revisor.mn.gov/statutes/cite/609A.02 ; https://www.revisor.mn.gov/statutes/cite/609A.03 ; https://www.revisor.mn.gov/statutes/cite/609.525 ; https://mncourts.gov/getforms/criminal-expungement .

## Remaining work

Chat10 independent review, A exact-byte publication, current contract/source reconciliation, central raster, runtime binding and terminal accounting remain pending. Generation/runtime remain disabled. No counsel approval or terminal delta is asserted. The next and last Chat9 family is `mn_petition_juvenile_as_adult-set`, under its own certification/commitment/discharge contract and EXP106, not an unrelated juvenile-court route or inherited subdivision-3 waiting period.
