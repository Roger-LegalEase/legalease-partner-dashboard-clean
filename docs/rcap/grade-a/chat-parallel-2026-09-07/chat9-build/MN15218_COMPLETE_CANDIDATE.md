# Chat 9: Minnesota 152.18 complete candidate

## Deliverable and publication boundary

The first Minnesota family, `mn_petition_15218-set`, has actually been built and tested. Seven complete synthetic bundles cover 165 page instances. Canonical is 20 pages; the long-identity/history/narrative boundary is 21 pages. The optional-service/known-hearing branch is 20 pages; four explicit fee selections are 26 pages each.

The required pleading/service/order set is EXP102, EXP104 and EXP106. EXP101 is supporting instructions. FEE102 appears only for an explicit supported fee request. EXP105 is not substituted for this route. The combined review bundle is not the service set: serve the personally signed petition and relevant attachments plus the unsigned proposed order. File the completed service proof only after mailing; keep confidential fee material separate.

Complete candidate: Drive `1RcAxDeAGcDtBCHvE_sXCfEhIRLWG7o1m`, `CHAT9_MN_15218_COMPLETE_CANDIDATE_2026-09-07.zip`, 64,607,465 bytes, SHA256 `5be2f8402fd72fa2b9714e03fac0df737e5034273bc1f57589220a24049ae16a`. Connected upload and download-back were completed, and the returned archive was rehashed successfully.

This PR commit publishes the receipt and handoff. It does **not** assert that the archived renderer, forms, output PDFs, maps or raster evidence are installed in the repository. All 176 exact candidate paths, including the implementation and 84 generated family files, are retained in `CANDIDATE_MANIFEST.json` and `candidate.patch`. Patch: 42,400,870 bytes, SHA256 `3ac495b8952f630993b5ca28d505d77d707848960d2148fb7042e291e78b2d0b`. Both `git apply --check` and actual `git apply` exited 0 in a clean isolated scratch repository; all 176 resulting file hashes matched. No fonts, dependency tree, private corpus, other worker paths or global registry is included.

A: install exact candidate bytes, not a substitute rebuild. Check the current destination first, skip only identical existing paths, and refuse conflicts. Read back installed hashes before treating repository paths as this candidate. The patch is all-new relative to Michigan commit `9b323ee43ef6b55cc9f28345bd05bffe63000081` and contains no Michigan modifications.

## Executed commands

Run from the reconciled isolated scaffold root:

```sh
node scripts/build-census-v1-mn_petition_15218-set.mjs
node scripts/build-census-v1-mn_petition_15218-set.mjs
node --test scripts/rcap-packet-recovery/chat9/test-mn15218.mjs
node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family mn_petition_15218-set
python scripts/rcap-packet-recovery/chat9/audit-mn15218.py --root . --out /mnt/data/chat9-mn-release-audit
python scripts/rcap-packet-recovery/chat9/mutate-mn15218.py
```

All listed commands exited 0 in the final individual runs. `repeat-mn15218.py` executes the first four commands and records their real exit codes, log hashes, all input hashes and every generated family-file hash. Both full renderer runs matched all 84 family files. There were 96 passing Node tests, zero failing tests. The existing unmodified completeness importer returned PASS_COMPLETE; its current Git blob `3ab462615ff43376856dc2fc591207cb550efb50` matches the executed local file. That is an author-run structural result, not independent acceptance.

The complete-PDF audit checked 543 visible text writes, 66 unchanged protected regions, every retained source word, all declared-versus-undeclared ink regions, and component-to-bundle page pixel equality. Full-page author inspection covered 57 distinct complete PNGs and all 165 page instances through exact aliases. Thirty font-bounding-box advisories for EXP104 address lines were retained and visually examined; they are not reported as zero findings or independent approval.

Six deliberately corrupted complete bundles were rejected after refreshing component and whole-PDF hashes and recombining the full packets. Controls cover an invented applicant signature, an invented judicial finding, an extra wrong-route mark, visually covered but still extractable identity text, a covered required mark, and an omitted order component. An intact recombined bundle passed. All 84 original family files remained unchanged.

A combined shell invocation timed out during a later mutation repeat after its full-build and audit phases had completed. The mutation command was rerun separately and exited 0. Earlier development failures and the fee-checkbox visual defect were corrected before the final run; no claim is made that every exploratory invocation passed.

## Source and semantic limits

Exact retained source inputs:

- EXP101, 7 pages, 7/24: `0ccdc99ec3cbb86300b00f5d93bf724d795541d426709f4e97708119d1b1c5de`.
- EXP102, 6 pages, 7/24: `c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541`.
- EXP104, 2 pages, 1/25: `0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c`.
- EXP106, 3 pages, 1/24: `da7080f9c0b0135a79b537545e5448da438b63ae0de5d69c25e2513f1170bd85`.
- FEE102, 6 pages, 07/24: `b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8`.

Current official Minnesota form index and statutory text were checked. Exact current remote PDF byte equality/source approval is not claimed. The historical source/dependency archives restored execution inputs only; current relevant shared module and lockfile blob identities were reconciled separately. The scaffold is not represented as a current checkout. Existing shared fitting, sanitation and metadata primitives are reused unchanged.

The participant's possession/discharge/dismissal and complete-history answers must be explicit. Ordinary conviction and juvenile-as-adult inputs are refused by this family. Optional recipients require explicit applicability reasons; fee public-assistance and lawyer answers cannot be silently inferred from a selected income branch. No certified disposition, BCA history, protective-order copy or fee proof is invented. Unknown hearing data remain later court-assigned information. EXP104 contains a prepared recipient plan, not executed mailing. All EXP106 body findings and decisions remain judicial blanks. The unknown-spouse-income variant stops before fee filing and supplies neither a zero income nor an invented poverty comparison.

A full-page check caught extended FEE102 checkmarks caused by tall source-font bounds. The final profile uses the actual connected square glyph, and regression tests now reject nonsquare mark regions. The final boundary email and narrative are coherent with its synthetic identity and history.

Whole bundles: canonical `5becdcba3de69c4855de6be3b0387871891f25a9984af57dcfc2d777f11b3fac`; boundary `b0cffedbe89f91168e82e8d2d79d520536d30c561e136acb5414db3adf84c40a`.

## Remaining ownership

Chat10 independently reviews the exact candidate archive. A owns publication, current source/contract integration, central raster admission, runtime binding and terminal accounting. No source approval, licensed-counsel decision, independent pass, commercial opening or terminal delta is asserted. Michigan's existing ten variants/44 pages and artifact remain preserved. Next build is `mn_petition_609a02_subd3-set`, followed by `mn_petition_juvenile_as_adult-set`.
