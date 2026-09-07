# Chat 5: complete Maryland conviction candidate

Family: `md_10110_conviction-set`. Baseline publication parent: `9ed7923a7e2008633e2f5ca1a44cfb6861099511`. The earlier Maryland favorable chronology repair, Kentucky nonconviction and Georgia candidates are preserved. The other session's active Maryland-early files were not touched.

## Measured deliverable

Twenty-five complete PDFs, 170 pages, 107 generated family files. Three actual full renderer executions, including two isolated output directories, are byte-identical for every generated file. This is not a --check result. The held 072B source is used as the petition. The paid branch contains no waiver-only form. An explicit prepaid-cost waiver request adds ALL THREE CC-DC-089 pages, including its court-order page, and MDJ-008. The final-open-cost election is separate and explicit. Every execution and judicial finding remains blank.

Eight distinct printed grounds are exercised with and without a waiver: eligible misdemeanor, assault/battery, eligible other felony, first/second-degree burglary or felony theft, domestically related crime, listed nuisance offense, repealed conduct and the special repealed-sexual-offense exclusions. Cannabis, pardon and nonconviction are not substituted. The adapter requires actual charge-to-statute inputs; it is not a new eligibility engine. Unlike disposition/date/basis units are refused rather than collapsed.

The retained source's agency widget overlaps its printed Date caption. Only the agency write rectangle is narrowed to begin at x292; the official source text/rule is preserved, and the measured adjustment is recorded. The current printed recitals control over obsolete internal AcroForm checkbox names. A missing-completion diagnostic expressly says the waiting period cannot be verified, not that no waiting period applies.

## Actual tests and complete-page inspection

142 real renderer tests pass. The existing unmodified auditFamily is exercised against the default and every conditional map, with 34 behavior controls. It reports PASS_COMPLETE for the 23 prepared branches, author-run only. The missing-financial diagnostic remains FAIL_MISSING_PREFILLS; missing completion remains FAIL_MISSING_REQUIRED_FACTS. Both retain allKnownFactsPrepared:false and participant disclosures. No missing counter was zeroed to obtain an approval.

The complete-PDF audit matched 890 text writes, 1,200 selection-region checks, 638 protected regions and 35,112 source-word positions. All eleven deliberately defective complete PDFs were rejected, including the agency-caption collision, absent waiver-order or notice pages, forged execution/judicial ink and missing/incorrect values. Sixty distinct COMPLETE page images were visually inspected; 110 page instances are exact PNG-byte aliases. Final four changed images were inspected after the final disclosure/fixture correction; the other 166 page instances remained pixel-identical. This is AUTHOR QA, not Chat4's independent review or a central raster result.

## Commands

From the repository root, with the retained exact sources and locked dependencies present:

```sh
node scripts/rcap-packet-recovery/chat5/test-md-conviction.mjs /mnt/data/md-conviction-tests.json
node scripts/build-census-v1-md_10110_conviction-set.mjs --out /mnt/data/md-conviction-final-pass1
node scripts/build-census-v1-md_10110_conviction-set.mjs --out /mnt/data/md-conviction-final-pass2
node scripts/build-census-v1-md_10110_conviction-set.mjs
node scripts/rcap-packet-recovery/chat5/test-md-conviction-importer.mjs /mnt/data/md-conviction-importer-tests.json
python scripts/rcap-packet-recovery/chat5/audit-md-conviction.py --root . --evidence /mnt/data/md-conviction-final-qa
```

The actual execution logs, test JSON, transitive input vector, route reconciliation and every generated output hash are retained inside the archive. Custom facts require the wrapper's `--input FACTS.json --out ISOLATED_DIR`. All selected inputs are validated and rendered before any destination write. Invalid input, actual contested matters and source drift do not emit an artifact. Diagnostic missing values remain disclosed rather than silently passing.

Canonical five-page SHA256: `5456086653a6f033d2708d534e89593d1065ed6b0e58950664cdcd8418d0b571`.
Boundary nine-page SHA256: `cda8eebad0799ed6924cb10846b1723a734f3929594eec0fc2d440c659f82297`.
Input-vector SHA256: `99edd9dfd5873061bd339408b9032dd7b88f4296ae51d0017022bf779aae398e`.
All-output equivalence SHA256: `10b09e41bf525d7d97a3e83c5ba4b9239a363df99a07723514da62694cf85cd6`.

## Accessible exact-byte publication

Drive file: `1EDhxNYSXq2hWr5YXaFspJroSq0qv-XvK`.
Archive: `CHAT5_MD_CONVICTION_COMPLETE_CANDIDATE_2026-09-07.zip`.
Size: 66,677,328 bytes. SHA256: `a071ebc0a73057bbca87dc042db89fbe3c3e08866a9ac31b3065f1832b8658d9`.
Uploaded, downloaded again, rehashed identically; all 193 manifest-bound entries verified (194 ZIP entries including the manifest). Includes sources, outputs, executable code/tests, complete logs/maps/disclosures and complete-page evidence. No raw fonts, dependencies, private corpus or secrets are included.

The standard binary patch is under this family's `chat5-build` evidence directory in the archive. SHA256 `204fb2eeafd767ec2c71831e0a49d46a93c9bec3b1136dc29abfee67d0c15c20`, 44,203,214 bytes, 110 NEW paths: 107 family files and three retained source PDFs. It was applied in an isolated empty repository and every byte matched. Git reported nonfatal trailing-space warnings in generated Markdown; no apply failure or byte difference occurred.

**PDF/source paths are not installed in GitHub by this code commit.** A must inspect current destination paths and publish these exact existing bytes, preserving any newer work. This is not a request for A to author or redo the build. Chat4 reviews the actual complete candidate, not stale repository PDFs. A retains the MDJ-008 conditional global relationship correction, central raster/admission, exact artifact binding and runtime installation. No terminal, independent or production approval is claimed.
