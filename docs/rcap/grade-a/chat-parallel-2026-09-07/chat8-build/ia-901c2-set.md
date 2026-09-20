# Chat 8: ia-901c2-set first completed candidate batch

Input/branch parent: `778d1254a1f76f949a6e7de4f940f48c5261d129`.
Only Chat 8 owned paths are changed. No queue, source approval, runtime, shared builder, Captain, payment or production mutation.

## Actual output

Five complete packets, 26 pages total: canonical paper (5), long-field/181-day eFile boundary (5), participant-authored early-waiver statement (6), exact-day-180 eFile (5), and missing-contact paper (5). All 31 generated family files are retained, including 16 PDFs, fixtures, complete write/blank/field records, component coverage and instructions. Official Form 1 pages 1-3 remain intact; page 3 is the embedded service certification, not a missing separate form.

Full field inventory: 56 source terminal fields, 59 widgets, plus one printed participant-signature rule = 57 accounted write areas. Every area is written from an explicit fact or receives a reasoned blank disposition. Actual service dates, signatures, signing dates, attorney block and manual item-1 disposition are never fabricated. The exact-day-180 fixture preserves the distinction between the statutory minimum and the form's more-than-180 wording. Known values are fitted without truncation or sub-8-point text; missing contact facts are explicit completion items.

## Execution, not a preflight

Run from repository root after restoring the checksum-bound source and candidate files:

```sh
node scripts/build-census-v1-ia-901c2-set.mjs
node scripts/build-census-v1-ia-901c2-set.mjs
node --test scripts/rcap-packet-recovery/chat8/ia-901c2.test.mjs
python scripts/rcap-packet-recovery/chat8/verify-ia-901c2-pdfs.py
```

Both full CLI builds exited 0 and every one of the 31 output files was compared: zero mismatches. The test suite executed the real renderer and passed 69 tests with zero failures. The Python reader verified every complete PDF, exact known values inside their widgets, final flattening, a second text importer, and zero added dark pixels in protected signature/date areas at 216 DPI. Author visual review inspected all 26 complete changed pages. Both MuPDF and Poppler rendered all 26 pages. These are author checks, NOT independent verification or central raster admission.

Commands, full stdout/stderr, input identities, all-output hashes, component/page coverage and 26 author raster images are under `data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-901c2-set/` in the retained candidate. `reproducibility.json` binds every family output, not only the combined PDFs. The long-narrative test additionally renders and imports an actual multipage conditional attachment; it is not substituted for the two complete family builds.

## Sources and legal boundaries

Held August-2024 Rule 2.86 Form 1 SHA-256: `c7a6c42baa70cd327ee1567081791682d6a89ea121012fdd5de0b86876bfd0e5`; 1,449,490 bytes. Retained Drive ID: `1Qoz3UfWxzVkA3dQnf2OKTKPGppMKunRO`. All three held pages inspected; current issuer instrument checked by title, edition, requirements and page-3 certification. No claim of byte equality between an issuer download and the retained fillable PDF.

Current official form: https://www.iowacourts.gov/collections/867/files/1962/embedDocument/
Statute: https://www.legis.iowa.gov/docs/code/2026/901C.2.pdf
Rules 2.80, 2.83 and 2.84: https://www.legis.iowa.gov/docs/ACO/CourtRulesChapter/02.pdf
Fee practice: https://studentlegal.uiowa.edu/know-the-law/criminal-law/expungement
Canonical office address: https://www.johnsoncountyiowa.gov/department-of-county-attorney

The unchanged current `IA.memo.json` blob is `2617a0994c1daf51b92189ab99c94f107947d3d4`. The input-identity record separately reconciles each imported shared helper and current lockfile against recovered dependency/source artifacts. The old source-identity file is NOT current whole-file evidence: its current full record was read separately, and relevant Iowa source pins/embedded components agree. No source approval is granted here.

Original-case debt is not an application fee. The guide attributes the no-filing-fee statement to University of Iowa Student Legal Services and includes no invented fee election or waiver form. Chat A retains the fee release question for reconciliation. Court confidentiality is not destruction and is not promised DCI or background-report erasure. DCI-76/77 are a different agency-request product and are not inserted into this court packet.

## Publication and handoff

The first Git commit carries the actual renderer, wrapper, tests, importer, and this handoff. The exact held source, PDFs, output records and full evidence are retained in a checksum-bound candidate archive and a Git binary patch; those paths remain **publication pending** until applied and read back in Git. `publication.json` records the concrete archive/patch custody and hashes. Applying a patch is not raster admission.

Chat 10: independently review the retained complete 26 pages, source identity, 57-area maps and branch-specific notice/fee treatments.
Chat A: reconcile release questions, publish the exact pending bytes, integrate, run central raster and admit only after review. No shared primitive change is requested for this first family; its radio-X appearance correction is narrowly local.

Remaining assigned families are ia-901c3-set, ia-12346-set, ia-12347-set and ia-dci77-set. This first batch makes no completion claim for them and does not expand Chat 8 ownership.
