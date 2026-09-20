# VF08 — appearance-scale cohort, measured on the delivered page

**Lane** VF08 (independent-verification) · **Branch** `vf08-scale-cohort-read` · **Base** `7b3214102` on `claude/legalease-sprint-captain-utucnw`

**Verifier** FABLE-VF08-SCALE-COHORT-READ (independent — built none of these packets, repaired none of them, opted no builder in, and edited nothing it measured)

> Which of the seventeen COMPLETE_PACKET_PROVEN families granted to VF08 actually DELIVER, on a page a participant is handed, the ISO 32000-1 12.5.5 defect FIX61 named: an appearance placed by pdf-lib's flatten with a translation only, so that the BBox-to-Rect mapping is never applied and the appearance is stamped at the wrong size or in the wrong place?

## What FIX61's scan is, and what this is

FIX61's scan counts SOURCE widgets exposed to the behaviour, read from the pinned binaries, and says so itself. It makes no claim that any of them reaches a delivered page. This read opens the delivered packets. The two answers differ for fourteen of the seventeen families, and in one direction only: exposed in the source, clean on the page.

## Result

| | |
|---|---|
| familiesGranted | 17 |
| familiesClaimed | 17 |
| blockedBeforeClaim | 0 |
| fixturesBoundByALiveReceipt | 40 |
| fixtureDigestsEqualToTheirReceipt | 40 |
| boundDocuments | 37 |
| documentsNotMeasurableHere | 0 |
| placementsSwept | 3612 |
| placementsUnmatched | 0 |
| mismatchedPlacementReadings | 102 |
| mismatchedPaintingNothing | 82 |
| mismatchedConfinedToTheirOwnRect | 12 |
| mismatchedRastered | 8 |
| mismatchedDeliveringInkOutsideTheirRect | 8 |
| outsideRectDarkPixelsDelivered | 16040 |
| outsideRectDarkPixelsAConformingBaselineCarries | 8 |
| familiesDeliveringTheDefect | 3 |
| familiesMeasuredClean | 14 |
| verdictRowsWritten | 3 |
| participantWritesMovedOrClipped | 0 |

Three families deliver the defect and carry a `FAIL_REPAIR_REQUIRED` row. Fourteen are measured clean and carry **no row**.

## Method

- **Claim before read.** node scripts/grade-a-packet-factory-24h/claim.mjs --assert VF08 <familyId>, per family, before any artifact of that family was opened. All seventeen returned CLAIM_OK at exit 0 under grant set 0e6be7ba62055e2a. A non-zero exit would have been a full stop for that family, recorded BLOCKED_BEFORE_CLAIM with no row. None occurred.
- **Fixture digests.** every fixture the live RASTER_QUEUE.json receipt binds was re-hashed from the bytes on disk at 7b3214102 and compared to the digest the receipt pins. 40 of 40 fixture digests across the seventeen families equal their receipt.
- **Sources.** every bound document resolved by the SHA-256 its source-receipt pins, against a content-hash index of every mounted custody (999 files, 500 distinct digests, across master_library and human-source-returns). A digest no custody holds would be NOT_MEASURABLE_HERE and no verdict would rest on it. 37 of 37 declared documents resolved.
- **The sweep.** VF02's sweep, generalised to the whole of 12.5.5. For every flattened widget placement in every bound fixture: compose the page-content cm operators, read the placed XObject's /BBox and /Matrix, match the placement to the source widget whose /Rect origin it translates to, and require the transformed BBox, carried through the placement, to land on that /Rect. cmScale x requiredScale is reported per placement exactly as VF02 stated it. The generalisation is necessary and not optional: a translation-only placement of a BBox written in ABSOLUTE page coordinates has a scale product of exactly 1 and is displaced by hundreds of points, so the scale test alone would read the West Virginia case as clean for the wrong reason.
- **Matching.** 3612 placements were swept and every one matched a source widget. A widget whose source ships no /AP is matched too and can never carry this defect: pdf-lib generates its appearance at flatten with BBox [0 0 rectW rectH] and an identity /Matrix.
- **Rasterisation.** pdftoppm, 300 dpi, greyscale, into /tmp; a pixel is ink below 200. Every raster deleted after measuring.
- **The baseline.** scripts/rcap-official-forms/rcap-active-content.mjs sanitizeAndFlatten over the PINNED source bytes, writtenFields empty, fitAppearancesToRect TRUE — what a conforming viewer shows. The same zero-write flatten with the option FALSE is the attribution control, and the pinned source rendered directly by poppler is the corroboration.
- **The measurement.** for each mismatched placement that paints and whose transformed /BBox reaches outside its /Rect, the dark pixels the DELIVERED page carries inside that footprint and OUTSIDE the widget's own /Rect, minus the dark pixels the option-ON baseline carries in the same window. Pixel sets, not counts.
- **Alignment is proved, not assumed.** the delivered page is matched to its source page through the widget's own /P, and the match is then PROVED rather than assumed: at every measured placement the delivered outside-rect dark set is EQUAL to the option-OFF baseline's outside-rect dark set, pixel for pixel and count for count. A misaligned page could not produce that equality.
- **Participant writes.** for every placement that delivers ink outside its rect, the family's reports/actual-writes.json write boxes on that source page were compared against the placed appearance's transformed /BBox, and each such stream was tested for a fill operator.
- **Nine counters.** read read-only for every family a row was written for, from node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <id>. All nine are zero for all three, PASS_COMPLETE, exit 0. The counters do not see this defect; that is why it needs an appearance read.

A mismatched placement is **measured clean** when:

- PAINTS_NOTHING: the placed stream carries no path-painting, text-showing or XObject operator, so no ink reaches the page from it wherever it is placed.
- INK_CONFINED_TO_ITS_OWN_RECT: the appearance is clipped to its transformed /BBox and that box lies inside the widget's own /Rect, so no ink can reach the page outside the rect. These are the UNDERSIZED mis-mappings.
- LANDS WITHIN 0.5pt: treated as the identity, per the assignment.

### Preflight

`node scripts/verify-packet-build-environment.mjs --assignment data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json` → **PACKET_BUILD_ENVIRONMENT_NOT_READY: 10/12 passed, 2 failed, 5 not applicable**. Both failures are conditions of this container and neither touches the bytes measured:

- **private_is_git_ignored** — private/ is NOT git-ignored. this dispatch mounts private/ as a SYMLINK to /home/user/legalease-partner-dashboard-clean/private, and `git check-ignore` refuses a pathspec beyond a symbolic link. Checked directly here: `git check-ignore -q private` exits 0 (ignored, .gitignore line 53) and `git ls-files private/` lists nothing. No source binary is tracked and none was committed. *Effect on this read: none.*
- **corpus_matches_committed_index** — 1 absent, 0 mismatched of 24 sampled. the mounted Master Library carries no 'LegalEase Alabama' subtree, so one sampled index entry cannot be compared in this container. An honest absence, not a corrupted corpus. *Effect on this read: none. No family here is an Alabama family, every source this read measured resolved by content hash from mounted custody, and one that had not would have been recorded NOT_MEASURABLE_HERE rather than counted as a zero..*

Environment: node 22.22.2, pdf-lib 1.17.1, poppler pdftoppm, MASTER_LIBRARY_SOURCE_DIR exported to the mounted Master Library Edition 1, node_modules symlinked from /home/user/captain-worktree, sparse checkout disabled with 0 skip-worktree entries.

## The seventeen, one by one

| family | jurisdiction | source scan (FIX61) | placements swept | mismatched readings | paints nothing | ink confined to its rect | rastered | outside-rect px delivered | outside-rect px, option ON | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| `wv_conv_multiple_misdemeanors-set` | WV | 13 widget(s), worst 682.719pt | 26 | 0 | 0 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `wv_conv_single_misdemeanor-set` | WV | 13 widget(s), worst 682.719pt | 26 | 0 | 0 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `rcap-tx-custom-pleading` | TX | 5 widget(s), worst 277.038pt | 276 | 10 | 10 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_exp_acquittal-set` | TX | 5 widget(s), worst 277.038pt | 276 | 10 | 10 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_nd_conviction_no_supervision-set` | TX | 6 widget(s), worst 277.038pt | 346 | 12 | 12 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_nd_dwi_deferred-set` | TX | 5 widget(s), worst 277.038pt | 332 | 10 | 10 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_nd_dwi_probation-set` | TX | 5 widget(s), worst 277.038pt | 336 | 10 | 10 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_nd_probation_misdemeanor-set` | TX | 6 widget(s), worst 277.038pt | 356 | 12 | 12 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `tx_nd_veterans_court-set` | TX | 5 widget(s), worst 277.038pt | 334 | 10 | 10 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `co_decriminalized_conduct_seal-set` | CO | 12 widget(s), worst 220.959pt | 162 | 8 | 0 | 4 | 4 | 10642 | 8 | **FAIL_REPAIR_REQUIRED** |
| `co_multiple_conviction_seal-set` | CO | 10 widget(s), worst 47.587pt | 282 | 8 | 0 | 6 | 2 | 2358 | 0 | **FAIL_REPAIR_REQUIRED** |
| `ne-setaside-custodial-set` | NE | 6 widget(s), worst 92.036pt | 158 | 4 | 0 | 2 | 2 | 3040 | 0 | **FAIL_REPAIR_REQUIRED** |
| `id_isp_expungement-set` | ID | 2 widget(s), worst 38.337pt | 34 | 2 | 2 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `ar-cs-possession-seal-set` | AR | 1 widget(s), worst 35.689pt | 140 | 2 | 2 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `id_clean_slate_shield-set` | ID | 1 widget(s), worst 6.545pt | 26 | 2 | 2 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `ar-nonconviction-seal-set` | AR | 1 widget(s), worst 3.163pt | 158 | 2 | 2 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |
| `ny_160_59_petition-set` | NY | 2 widget(s), worst 0.389pt | 344 | 0 | 0 | 0 | 0 | 0 | 0 | MEASURED_CLEAN |

### wv_conv_multiple_misdemeanors-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 wv_conv_multiple_misdemeanors-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33791677725, rendered at 88d688b8b6910f0c501cab0d72633554220d822b. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — SCA-C906 `43b5606c9faf…`
- **Sweep** 26 placement(s) across 2 fixture(s), 0 unmatched, **0 mismatched reading(s)**.
- **Why it reads as it does.** Its builder already applies the 12.5.5 mapping itself. scripts/build-census-v1-<family>.mjs calls normalizeWidgetAppearancePlacement (scripts/rcap-official-forms/rcap-widget-appearance-placement.mjs) before sanitizeAndFlatten, which folds A x translate(-Rect.x,-Rect.y) into each appearance's own /Matrix. Read back from the delivered bytes, every one of the 13 exposed SCA-C906 checkbox appearances is placed with a /Matrix of [1 0 0 1 -Rect.x -Rect.y] against a BBox written in absolute page coordinates, so each lands on its own /Rect at a maximum corner displacement of 0.0000pt. FIX61's 682.719pt is a reading of the pinned SOURCE, which is exposed; the delivered packet is not.

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### wv_conv_single_misdemeanor-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 wv_conv_single_misdemeanor-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33935771571, rendered at 6dccfe697a8caf4c8b330f3db93d668cb8476521. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — SCA-C906 `43b5606c9faf…`
- **Sweep** 26 placement(s) across 2 fixture(s), 0 unmatched, **0 mismatched reading(s)**.
- **Why it reads as it does.** Its builder already applies the 12.5.5 mapping itself. scripts/build-census-v1-<family>.mjs calls normalizeWidgetAppearancePlacement (scripts/rcap-official-forms/rcap-widget-appearance-placement.mjs) before sanitizeAndFlatten, which folds A x translate(-Rect.x,-Rect.y) into each appearance's own /Matrix. Read back from the delivered bytes, every one of the 13 exposed SCA-C906 checkbox appearances is placed with a /Matrix of [1 0 0 1 -Rect.x -Rect.y] against a BBox written in absolute page coordinates, so each lands on its own /Rect at a maximum corner displacement of 0.0000pt. FIX61's 682.719pt is a reading of the pinned SOURCE, which is exposed; the delivered packet is not.

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### rcap-tx-custom-pleading — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/rcap-tx-custom-pleading--custom-pleading` · **strategy** custom_pleading · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 rcap-tx-custom-pleading (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33965687102, rendered at 97be5bcdace3cb50c420b0ccece06c439168def0. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 276 placement(s) across 2 fixture(s), 0 unmatched, **10 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 10 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 1 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 5 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 11 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 1 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 5 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 11 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_exp_acquittal-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-exp-acquittal-set--custom-pleading` · **strategy** custom_pleading · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_exp_acquittal-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33943027165, rendered at e8079978db30ca94921b19f5bdfaa529253fd93f. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 276 placement(s) across 2 fixture(s), 0 unmatched, **10 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 10 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 8 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 18 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 19 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 19 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 8 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 12 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 18 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 19 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 19 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_nd_conviction_no_supervision-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_nd_conviction_no_supervision-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33977913138, rendered at 90c56dd7b77e97586fb6977529c91c642e348c2c. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 3 bound, 3 resolved by content hash, 0 not measurable here — TX-GC-411.0735-PETITION `da0bd63c66a6…`, TX-GC-411.0725-073-0735-ORDER `6a60f72ac40a…`, TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 346 placement(s) across 2 fixture(s), 0 unmatched, **12 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 12 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 7 | TX-GC-411.0725-073-0735-ORDER / `County2` | 72.00,444.36–208.76,467.04 | 72.00,444.36–207.96,467.04 | 0.803pt | 1.005906 × 1 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 7 | TX-GC-411.0725-073-0735-ORDER / `County2` | 72.00,444.36–208.76,467.04 | 72.00,444.36–207.96,467.04 | 0.803pt | 1.005906 × 1 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_nd_dwi_deferred-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-deferred-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_nd_dwi_deferred-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33979005853, rendered at d30d4f1149b1347d8d4100b69a2db80b121dec52. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 3 bound, 3 resolved by content hash, 0 not measurable here — TX-GC-411.0726-PETITION `0ef70a8afe25…`, TX-GC-411.0726-ORDER `c2b4c3ecf003…`, TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 332 placement(s) across 2 fixture(s), 0 unmatched, **10 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 10 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_nd_dwi_probation-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-nd-dwi-probation-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_nd_dwi_probation-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33950997948, rendered at 428d4d616da87f4a298535c43d3f11f90c50b47b. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 3 bound, 3 resolved by content hash, 0 not measurable here — TX-GC-411.0731-PETITION `51f747e27d6f…`, TX-GC-411.0731-ORDER `f085cd5c03ed…`, TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 336 placement(s) across 2 fixture(s), 0 unmatched, **10 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 10 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_nd_probation_misdemeanor-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-nd-probation-misdemeanor-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_nd_probation_misdemeanor-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33950997948, rendered at 428d4d616da87f4a298535c43d3f11f90c50b47b. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 3 bound, 3 resolved by content hash, 0 not measurable here — TX-GC-411.073-PETITION `0f60ff4c10f3…`, TX-GC-411.0725-073-0735-ORDER `6a60f72ac40a…`, TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 356 placement(s) across 2 fixture(s), 0 unmatched, **12 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 12 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 7 | TX-GC-411.0725-073-0735-ORDER / `County2` | 72.00,444.36–208.76,467.04 | 72.00,444.36–207.96,467.04 | 0.803pt | 1.005906 × 1 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 7 | TX-GC-411.0725-073-0735-ORDER / `County2` | 72.00,444.36–208.76,467.04 | 72.00,444.36–207.96,467.04 | 0.803pt | 1.005906 × 1 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 10 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 14 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 20 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### tx_nd_veterans_court-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-court-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 tx_nd_veterans_court-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33939441038, rendered at 9f98bcfb5397ce1f84d910b699caf12e62ef476f. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 3 bound, 3 resolved by content hash, 0 not measurable here — TX-GC-411.0727-PETITION `7c34e5f5aeee…`, TX-GC-411.0727-ORDER `2c9500206f03…`, TX-SCT-22-9090-STATEMENT-OF-INABILITY `bd17a3fe43d6…`
- **Sweep** 334 placement(s) across 2 fixture(s), 0 unmatched, **10 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 10 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n", "% DSBlank\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 11 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 15 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 22 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| canonical.pdf | 22 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 11 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `County / Condado` | 77.40,153.56–257.64,178.08 | 77.40,153.56–257.64,169.67 | 8.4087pt | 1 × 1.521848 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 15 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `compañía o jefe` | 113.64,528.80–240.48,555.80 | 113.64,528.80–240.48,545.72 | 10.08pt | 1 × 1.595745 | 0pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 21 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature` | 95.64,366.16–462.72,390.88 | 95.64,366.16–195.64,466.16 | 267.08pt | 3.6708 × 0.2472 | 75.28pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 22 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature12` | 132.44,489.71–509.48,515.41 | 132.44,489.71–232.44,589.71 | 277.038pt | 3.77038 × 0.25694 | 74.306pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 22 | TX-SCT-22-9090-STATEMENT-OF-INABILITY / `Signature13` | 128.94,356.68–491.96,379.57 | 128.94,356.68–228.94,456.68 | 263.022pt | 3.63022 × 0.22891 | 77.109pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### co_decriminalized_conduct_seal-set — **FAIL_REPAIR_REQUIRED**

- **Directory** `data/rcap-all50/overlays/census-v1/co/co-decriminalized-conduct-seal-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 co_decriminalized_conduct_seal-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33931424370, rendered at 7814ede52916a26acc84e80337a1fda498dba90e. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 2 bound, 2 resolved by content hash, 0 not measurable here — JDF-2371 `642558b85e3f…`, JDF-2374 `36a7ad4767ac…`
- **Sweep** 162 placement(s) across 2 fixture(s), 0 unmatched, **8 mismatched reading(s)**.
- **Why it reads as it does.** 4 placement reading(s) put the form's own stroked rule or box outside the widget it belongs to, on a page a participant is handed. 4 further mis-mapped placement(s) in this family are undersized rather than oversized: their ink is clipped to a transformed /BBox lying inside their own /Rect, so they add no ink outside it and are measured clean.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 2 | JDF-2371 / `3J.1` | 268.39,437.89–448.39,453.01 | 268.39,437.89–491.18,453.01 | 42.79pt | 0.807936 × 1 | 42.79pt | 716 | 4 | **DELIVERS THE DEFECT** (712 px) |
| canonical.pdf | 2 | JDF-2371 / `3J.2` | 173.81,420.59–317.81,435.71 | 173.81,420.59–538.77,435.71 | 220.959pt | 0.394565 × 1 | 220.959pt | 4605 | 0 | **DELIVERS THE DEFECT** (4605 px) |
| canonical.pdf | 3 | JDF-2371 / `CoS_Date` | 203.04,439.05–347.04,454.17 | 203.04,439.05–340.41,454.17 | 6.628pt | 1.048249 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| canonical.pdf | 5 | JDF-2374 / `4D.1` | 126.00,134.12–540.00,210.46 | 126.00,134.12–522.00,210.46 | 18pt | 1.045455 × 0.999993 | 0.0005pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 2 | JDF-2371 / `3J.1` | 268.39,437.89–448.39,453.01 | 268.39,437.89–491.18,453.01 | 42.79pt | 0.807936 × 1 | 42.79pt | 716 | 4 | **DELIVERS THE DEFECT** (712 px) |
| boundary.pdf | 2 | JDF-2371 / `3J.2` | 173.81,420.59–317.81,435.71 | 173.81,420.59–538.77,435.71 | 220.959pt | 0.394565 × 1 | 220.959pt | 4605 | 0 | **DELIVERS THE DEFECT** (4605 px) |
| boundary.pdf | 3 | JDF-2371 / `CoS_Date` | 203.04,439.05–347.04,454.17 | 203.04,439.05–340.41,454.17 | 6.628pt | 1.048249 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 5 | JDF-2374 / `4D.1` | 126.00,134.12–540.00,210.46 | 126.00,134.12–522.00,210.46 | 18pt | 1.045455 × 0.999993 | 0.0005pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |

- **Participant writes.** No participant write is moved, overlapped or clipped. The defect here is ink the packet adds outside a widget's own /Rect, and it falls on the form's own white space rather than on a write.

- **Repair named.** Opt this family's builder (or the host it calls) into fitAppearancesToRect at its finalizeOfficialForm / sanitizeAndFlatten call site, rebuild the fixtures, re-raster them through the central acceptance workflow, and re-read this obligation. VF08 does not make the change and does not touch the shared default.

### co_multiple_conviction_seal-set — **FAIL_REPAIR_REQUIRED**

- **Directory** `data/rcap-all50/overlays/census-v1/co/co-multiple-conviction-seal-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 co_multiple_conviction_seal-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33495068504, rendered at 5f144ec10d2bf7404faf0811e98418e0b13f06ba. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 2 bound, 2 resolved by content hash, 0 not measurable here — JDF-641 `6ad1d7c43b45…`, JDF-642 `584708616e98…`
- **Sweep** 282 placement(s) across 2 fixture(s), 0 unmatched, **8 mismatched reading(s)**.
- **Why it reads as it does.** 2 placement reading(s) put the form's own stroked rule or box outside the widget it belongs to, on a page a participant is handed. 6 further mis-mapped placement(s) in this family are undersized rather than oversized: their ink is clipped to a transformed /BBox lying inside their own /Rect, so they add no ink outside it and are measured clean.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 2 | JDF-641 / `3J.1` | 269.62,490.55–540.00,505.67 | 269.62,490.55–492.41,505.67 | 47.587pt | 1.213596 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| canonical.pdf | 5 | JDF-641 / `11.1` | 147.60,488.65–540.00,553.33 | 147.60,488.65–543.60,553.33 | 3.6pt | 0.990909 × 1.000009 | 3.6pt | 1179 | 0 | **DELIVERS THE DEFECT** (1179 px) |
| canonical.pdf | 5 | JDF-641 / `CoS_Date` | 203.04,438.39–347.04,453.51 | 203.04,438.39–340.41,453.51 | 6.628pt | 1.048249 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| canonical.pdf | 5 | JDF-641 / `Sig_Date` | 133.26,242.76–277.26,257.88 | 133.26,242.76–270.64,257.88 | 6.628pt | 1.048249 × 0.999934 | 0.001pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 2 | JDF-641 / `3J.1` | 269.62,490.55–540.00,505.67 | 269.62,490.55–492.41,505.67 | 47.587pt | 1.213596 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 5 | JDF-641 / `11.1` | 147.60,488.65–540.00,553.33 | 147.60,488.65–543.60,553.33 | 3.6pt | 0.990909 × 1.000009 | 3.6pt | 1179 | 0 | **DELIVERS THE DEFECT** (1179 px) |
| boundary.pdf | 5 | JDF-641 / `CoS_Date` | 203.04,438.39–347.04,453.51 | 203.04,438.39–340.41,453.51 | 6.628pt | 1.048249 × 1 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 5 | JDF-641 / `Sig_Date` | 133.26,242.76–277.26,257.88 | 133.26,242.76–270.64,257.88 | 6.628pt | 1.048249 × 0.999934 | 0.001pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |

- **Participant writes.** No participant write is moved, overlapped or clipped. The defect here is ink the packet adds outside a widget's own /Rect, and it falls on the form's own white space rather than on a write.

- **Repair named.** Opt this family's builder (or the host it calls) into fitAppearancesToRect at its finalizeOfficialForm / sanitizeAndFlatten call site, rebuild the fixtures, re-raster them through the central acceptance workflow, and re-read this obligation. VF08 does not make the change and does not touch the shared default.

### ne-setaside-custodial-set — **FAIL_REPAIR_REQUIRED**

- **Directory** `data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 ne-setaside-custodial-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33596784162, rendered at 92239810a4b96c6cffb87929a45cf56d8a20cbf5. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 4 bound, 4 resolved by content hash, 0 not measurable here — CC-6-11 `c0dcc5c09379…`, CC-6-11.2 `8bfa884d66c2…`, CC-6-11A `615c64b428d5…`, DC-1-15 `43675986d4b7…`
- **Sweep** 158 placement(s) across 2 fixture(s), 0 unmatched, **4 mismatched reading(s)**.
- **Why it reads as it does.** 2 placement reading(s) put the form's own stroked rule or box outside the widget it belongs to, on a page a participant is handed. 2 further mis-mapped placement(s) in this family are undersized rather than oversized: their ink is clipped to a transformed /BBox lying inside their own /Rect, so they add no ink outside it and are measured clean.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 1 | CC-6-11 / `Check Box7` | 105.38,128.03–123.38,146.03 | 105.38,128.03–115.46,138.11 | 7.92pt | 1.785714 × 1.785714 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| canonical.pdf | 5 | DC-1-15 / `Text60.0` | 282.91,504.10–504.00,523.36 | 282.91,504.10–596.04,523.36 | 92.036pt | 0.706076 × 1 | 92.036pt | 1520 | 0 | **DELIVERS THE DEFECT** (1520 px) |
| boundary.pdf | 1 | CC-6-11 / `Check Box7` | 105.38,128.03–123.38,146.03 | 105.38,128.03–115.46,138.11 | 7.92pt | 1.785714 × 1.785714 | 0pt | — | — | INK_CONFINED_TO_ITS_OWN_RECT |
| boundary.pdf | 5 | DC-1-15 / `Text60.0` | 282.91,504.10–504.00,523.36 | 282.91,504.10–596.04,523.36 | 92.036pt | 0.706076 × 1 | 92.036pt | 1520 | 0 | **DELIVERS THE DEFECT** (1520 px) |

- **Participant writes.** No participant write is moved, overlapped or clipped. The defect here is ink the packet adds outside a widget's own /Rect, and it falls on the form's own white space rather than on a write.

- **Repair named.** Opt this family's builder (or the host it calls) into fitAppearancesToRect at its finalizeOfficialForm / sanitizeAndFlatten call site, rebuild the fixtures, re-raster them through the central acceptance workflow, and re-read this obligation. VF08 does not make the change and does not touch the shared default.

### id_isp_expungement-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/id/id-isp-expungement-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 id_isp_expungement-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33605354695, rendered at 7edb05f621e6209c3660c66fd60e4f4b283faf1f. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — (unnamed) `7442267d7799…`
- **Sweep** 34 placement(s) across 2 fixture(s), 0 unmatched, **2 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 2 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC\nEMC\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| application-canonical-filled.pdf | 2 | — / `Date` | 380.76,360.36–530.28,377.61 | 380.76,360.36–530.28,389.16 | 11.547pt | 1 × 0.599062 | 11.547pt | — | — | PAINTS_NOTHING |
| application-boundary-filled.pdf | 2 | — / `Date` | 380.76,360.36–530.28,377.61 | 380.76,360.36–530.28,389.16 | 11.547pt | 1 × 0.599062 | 11.547pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### ar-cs-possession-seal-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/ar/ar-cs-possession-seal-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 ar-cs-possession-seal-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33605354695, rendered at 7edb05f621e6209c3660c66fd60e4f4b283faf1f. Every one of the 4 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 2 bound, 2 resolved by content hash, 0 not measurable here — (unnamed) `015c7246ffd5…`, (unnamed) `b347754fd115…`
- **Sweep** 140 placement(s) across 4 fixture(s), 0 unmatched, **2 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 2 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC\nEMC\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| order-canonical-filled.pdf | 2 | — / `Defendant  IS or  IS NOT required to register as a sex` | 108.31,409.80–497.28,426.60 | 108.31,409.80–461.59,426.60 | 35.689pt | 1.101022 × 1 | 0pt | — | — | PAINTS_NOTHING |
| order-boundary-filled.pdf | 2 | — / `Defendant  IS or  IS NOT required to register as a sex` | 108.31,409.80–497.28,426.60 | 108.31,409.80–461.59,426.60 | 35.689pt | 1.101022 × 1 | 0pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### id_clean_slate_shield-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/id/id-clean-slate-shield-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 id_clean_slate_shield-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33605354695, rendered at 7edb05f621e6209c3660c66fd60e4f4b283faf1f. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 1 bound, 1 resolved by content hash, 0 not measurable here — (unnamed) `91130b903672…`
- **Sweep** 26 placement(s) across 2 fixture(s), 0 unmatched, **2 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 2 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC\nEMC\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| petition-canonical-filled.pdf | 2 | — / `Petitioner  Defendant_2` | 324.00,469.52–504.12,491.77 | 324.00,469.52–504.12,498.32 | 6.545pt | 1 × 0.772743 | 6.545pt | — | — | PAINTS_NOTHING |
| petition-boundary-filled.pdf | 2 | — / `Petitioner  Defendant_2` | 324.00,469.52–504.12,491.77 | 324.00,469.52–504.12,498.32 | 6.545pt | 1 × 0.772743 | 6.545pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### ar-nonconviction-seal-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 ar-nonconviction-seal-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33608483853, rendered at 84045d06c9f14b29c8fb822343e0f390d5be98c3. Every one of the 2 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 2 bound, 2 resolved by content hash, 0 not measurable here — AR-ACIC-PETITION-TO-SEAL-NONCONVICTION `09f323174881…`, AR-ACIC-ORDER-TO-SEAL-NONCONVICTION `4ca0a57a56f7…`
- **Sweep** 158 placement(s) across 2 fixture(s), 0 unmatched, **2 mismatched reading(s)**.
- **Why it reads as it does.** Every mis-mapped placement here is an EMPTY appearance. 2 placement reading(s) across the family's fixtures fail the 12.5.5 test, and each one's stream carries no path-painting, text-showing or XObject operator at all ("/Tx BMC \nEMC\n"). A stream that paints nothing paints nothing wherever it is placed, so the mis-mapping reaches no pixel of the delivered page. This is a real exposure in the bytes and a clean reading on the page, and it stops being clean the moment any of these fields is given a value.

| fixture | page | form/field | /Rect | placed extent | displacement | scale product | overhang beyond rect | ink outside rect, delivered | ink outside rect, option ON | verdict for this placement |
|---|---|---|---|---|---|---|---|---|---|---|
| canonical.pdf | 3 | AR-ACIC-PETITION-TO-SEAL-NONCONVICTION / `DAY 2` | 323.32,466.20–515.52,489.60 | 323.32,466.20–518.68,489.60 | 3.163pt | 0.983809 × 1 | 3.163pt | — | — | PAINTS_NOTHING |
| boundary.pdf | 3 | AR-ACIC-PETITION-TO-SEAL-NONCONVICTION / `DAY 2` | 323.32,466.20–515.52,489.60 | 323.32,466.20–518.68,489.60 | 3.163pt | 0.983809 × 1 | 3.163pt | — | — | PAINTS_NOTHING |

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

### ny_160_59_petition-set — MEASURED_CLEAN

- **Directory** `data/rcap-all50/overlays/census-v1/ny/ny-160-59-petition-set--official-pdf-fill` · **strategy** official_pdf_fill · **queue state** COMPLETE_PACKET_PROVEN · **builder opts into fitAppearancesToRect** false
- **Claim** `CLAIM_OK VF08 ny_160_59_petition-set (independent-verification, grant set 0e6be7ba62055e2a)`, exit 0
- **Raster receipt** RASTER_PASS, run 33598433649, rendered at c48412dc91d12e613526e9881021d92ee39a6069. Every one of the 6 fixture digests the receipt pins recomputes byte-exact from the bytes on disk at 7b3214102: **true**.
- **Sources** 4 bound, 4 resolved by content hash, 0 not measurable here — (unnamed) `73a5eeaf73ed…`, (unnamed) `68b14570db22…`, (unnamed) `cf22b8ea0cb8…`, (unnamed) `76c0c54ed0a8…`
- **Sweep** 344 placement(s) across 6 fixture(s), 0 unmatched, **0 mismatched reading(s)**.
- **Why it reads as it does.** No flattened widget placement in either fixture fails the 12.5.5 test at all: every placed appearance lands on its own /Rect within 0.5pt, so there is nothing for the option to change on these bytes.

- **Participant writes.** No mis-mapped placement in this family delivers ink outside its own /Rect, so none can move, overlap or clip a participant write. Every placement measured is either an appearance that paints nothing at all or one whose ink is clipped to a transformed /BBox lying inside the widget's own /Rect.

## What this is not

A measurement, not a repair and not a promotion. No overlay directory, builder, shared script, master queue, raster queue or legal-decision record was opened for writing, and the claim ledger is not committed by this lane.

An independent reading proves what a packet is. It approves no output, opens no commercial route, and promotes no family.
