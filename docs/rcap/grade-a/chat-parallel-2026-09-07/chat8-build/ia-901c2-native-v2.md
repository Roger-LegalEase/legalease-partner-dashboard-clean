# Form 1 native input binding v2

Parent examined: a72e336390ee5d5ce26667407c98493778733960, PR234.
Twenty-chat ownership: Chat8 native reports; Chat11 unchanged shared importer; Chat10 independent review; Chat12 exact-byte publication; A final admission.

## Measured defect and correction

The actual v1 importer accepted a deliberately corrupted canonical native report as PASS_COMPLETE after a held case number was removed from both write lists and represented as unknown. This was a report-only negative control, not a claim that the reviewed PDF was missing its case number. v1 supplied no complete held-input availability map.

v2 reuses the existing compatibility writer and unmodified verifier, adds fixture-scoped availableFacts derived from each actual fixture JSON, and binds 73 active identity/contact/control occurrences to those five immutable input snapshots. The parser now rejects omission of a held county, case number, email or recipient address, while genuinely unknown values remain required-before-filing. Inactive eFile paper-service fields do not inherit the participant's known name. Participant and intended-recipient addresses remain distinct. Printed values cannot be rebound to different input facts.

Missing-contact has 12 required control areas representing 11 distinct facts, because a telephone number occupies two controls. The report now distinguishes these quantities. No field was filled, no source clause changed, and no signature or event was invented.

## Actual results

The unmodified reader inspects 285 areas: 106 writes and 179 blanks. Aggregate FAIL_ROUTE_SELECTION retains two requiredOptionsMissing, both the exact-day180 source-wording diagnostic. All other defect counters are measured zero. Canonical, boundary and waiver imports have no structural-counter failure but remain unexecuted drafts. Exact-day180 and missing-contact are explicitly diagnostic, never filing-positive. Source/fee, independent acceptance, private runtime delivery and central admission are not asserted.

18 new tests pass, including actual positive/diagnostic auditFamily calls, held facts omitted everywhere, cross-fixture contamination, input/PDF mismatch, and controls triggering every one of the nine counters. The prior 22 compatibility tests also pass as regression evidence, not 22 new tests. The prior 69 renderer tests were not rerun or relabeled as new work.

Fresh source/final glyph, selection-interior, blank-interior and Poppler measurements completed without rendering new PDFs. Two report-only generations match all 41 family files. All 16 PDF files match the original candidate exactly, preserving five combined PDFs/26 reviewed pages. No complete-page content was changed; the prior independent full-page review stays bound to these exact bytes. No new independent visual approval is claimed.

Commands from repository root:

```sh
python scripts/rcap-packet-recovery/chat8/measure-ia-901c2-compatibility.py
node --test scripts/rcap-packet-recovery/chat8/ia-901c2-compatibility.test.mjs
node --test scripts/rcap-packet-recovery/chat8/ia-901c2-native-v2.test.mjs
node scripts/rcap-packet-recovery/chat8/ia-901c2-native-v2.mjs
node scripts/rcap-packet-recovery/chat8/ia-901c2-native-v2.mjs
```

The measurement script writes its v1 evidence destination; copy those measured bytes to the v2 evidence directory as byte-measurements.json before running v2. Every command above actually exited0. Machine evidence retains input identities, counter results, original-PDF preservation and all-file comparison.

## Publication

The archive contains the full current Form1 family, exact blank, needed Chat8 code, new evidence and a manifest. native-reports-after-v1.patch applies only after the verified original+compatibility-v1 family has been installed. It alters native text reports only, not PDFs. new-code-and-evidence.patch contains only new owned files and must not be applied twice after their Git publication. Both patches have isolated apply-check/application and exact result-byte proofs.

Chat11: use the native availableFacts and fixture-input-facts.json as the report contract; no shared-reader edit requested here. Chat10: close only the matched native evidence scope, keeping diagnostics and source residuals. Chat12: preserve exact reviewed PDFs and install expected-preimage reports; reject other concurrent versions. A retains final admission. This is author implementation evidence, not self-approval.
