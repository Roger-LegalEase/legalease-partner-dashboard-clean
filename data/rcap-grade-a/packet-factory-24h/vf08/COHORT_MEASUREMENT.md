# VF08 cohort read: the synthesized off-state square, measured on 26 proven families

Independent reading at base `942cab9b5`, branch `vf08-cohort-read`. Read-only over everything it measures.

**The question.** The shared flattening step calls `form.updateFieldAppearances()` before `flatten()`. pdf-lib regenerates an appearance for any check box or radio widget whose current `/AS` state has no entry in `/AP /N`, and its default provider paints a stroked square the size of the widget rectangle, which flatten then stamps onto the page. ISO 32000-1 12.5.5 says a viewer draws the stream named by `/AS`; where there is none it paints nothing. So the square is ink the official form does not carry. VF02 proved it on Vermont and VF03 on Virginia. This read asks which of the 26 families the cohort still counts as COMPLETE_PACKET_PROVEN actually deliver it on a page.

## Answer

- **24 of 26 deliver a synthesized square on a delivered page**, in canonical and in boundary alike. Each has a `FAIL_REPAIR_REQUIRED` row appended to `rows.json` with `failedObligationNames: ["CLIPPING_AND_OVERLAP"]`.
- **2 measure clean** and no verdict row is written for them.
- 0 blocked before claim, 0 not measurable here.
- 1234 of 1254 widget readings deliver the square. All nine completeness counters are zero for all 24 failing families: the counters do not see this.

## Method

Claim asserted per family before any artifact of it was opened. Every bound document resolved by the SHA-256 its receipt pins, against mounted custody indexed by content — never by a declared path. For each pinned source, two zero-write runs of the repository's own `sanitizeAndFlatten`: one with `suppressSynthesizedAppearances` **off**, which is the baseline the FIX50 test builds for case A and the one VF02 used, and one with it **on**. The pixels the first paints and the second does not are the synthesized square itself, at that widget's own geometry. Both, and the pinned source, and the delivered fixture, rasterised at 150 dpi with `pdftoppm` into `/tmp` and read pixel-for-pixel at every selection-widget rect. Delivered pages were matched to source pages by ink overlap, never by a declared page manifest, and each rect licensed again by a local coverage check. Rasters deleted after measuring.

Not counted as the defect: a widget the family writes, whose mark is intended; a widget shipping its own appearance for its current state, which RI-OFF-APPEARANCE settles is the court's own; and a widget whose square falls entirely on ink the form already prints, which is reported separately.

## The 26

| Family | Jurisdiction | Widget readings | Delivering a square | Adds no ink | Delivered pages affected | Verdict |
| --- | --- | ---: | ---: | ---: | --- | --- |
| ak-tf800-set | AK | 20 | 16 | 4 | tf800-canonical-filled.pdf p1,2; tf800-boundary-filled.pdf p1,2 | FAIL_REPAIR_REQUIRED |
| ak-tf805-set | AK | 10 | 10 | 0 | tf805-canonical-filled.pdf p1,2; tf805-boundary-filled.pdf p1,2 | FAIL_REPAIR_REQUIRED |
| co_motion_seal_nonconviction-set | CO | 24 | 14 | 10 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| ct-cleanslate-petition-set | CT | 4 | 0 | 4 | — | NO_ROW_MEASURED_CLEAN |
| me-seal-prost-set | ME | 6 | 6 | 0 | cr289-canonical-filled.pdf p1; cr289-boundary-filled.pdf p1 | FAIL_REPAIR_REQUIRED |
| nc_146_dismissal_petition-set | NC | 76 | 74 | 2 | canonical.pdf p1,2,4,5; boundary.pdf p1,2,4,5 | FAIL_REPAIR_REQUIRED |
| nd-nonconviction-close-petition-set | ND | 10 | 10 | 0 | packet-canonical-filled.pdf p3,5; packet-boundary-filled.pdf p3,5 | FAIL_REPAIR_REQUIRED |
| nh_petition_nonconviction_pre2019-set | NH | 38 | 38 | 0 | canonical.pdf p2,6,8; boundary.pdf p2,6,8 | FAIL_REPAIR_REQUIRED |
| nj_disorderly_persons-set | NJ | 44 | 44 | 0 | cn-10557-canonical.pdf p18,19,20,21,22,24,30,32; cn-10557-boundary.pdf p18,19,20,21,22,24,30,32 | FAIL_REPAIR_REQUIRED |
| nj_indictable_conviction-set | NJ | 44 | 44 | 0 | cn-10557-canonical.pdf p18,19,20,21,22,24,30,32; cn-10557-boundary.pdf p18,19,20,21,22,24,30,32 | FAIL_REPAIR_REQUIRED |
| nj_ordinance-set | NJ | 44 | 44 | 0 | cn-10557-canonical.pdf p18,19,20,21,22,24,30,32; cn-10557-boundary.pdf p18,19,20,21,22,24,30,32 | FAIL_REPAIR_REQUIRED |
| pa_490_nonconviction-set | PA | 10 | 10 | 0 | rule-490-order-canonical.pdf p1; rule-490-petition-canonical.pdf p1; rule-490-order-boundary.pdf p1; rule-490-petition-boundary.pdf p1 | FAIL_REPAIR_REQUIRED |
| ri_decriminalized-set | RI | 74 | 74 | 0 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| ri_deferred_sentence-set | RI | 66 | 66 | 0 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| ri_first_offender_felony-set | RI | 66 | 66 | 0 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| ri_first_offender_misdemeanor-set | RI | 74 | 74 | 0 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| ri_multiple_misdemeanors-set | RI | 74 | 74 | 0 | canonical.pdf p2,3,4; boundary.pdf p2,3,4 | FAIL_REPAIR_REQUIRED |
| va_exp_identity_used_by_another-set | VA | 0 | 0 | 0 | — | NO_ROW_MEASURED_CLEAN |
| va_seal_ancillary_matter_only-set | VA | 152 | 152 | 0 | canonical.pdf p1,2,3,4,5,6; boundary.pdf p1,2,3,4,5,6 | FAIL_REPAIR_REQUIRED |
| va_seal_enumerated_seven_year-set | VA | 152 | 152 | 0 | canonical.pdf p1,2,3,4,5,6; boundary.pdf p1,2,3,4,5,6 | FAIL_REPAIR_REQUIRED |
| va_seal_petition_felony-set | VA | 126 | 126 | 0 | canonical.pdf p1,2,3,4; boundary.pdf p1,2,3,4 | FAIL_REPAIR_REQUIRED |
| vt_seal_18_to_21-set | VT | 28 | 28 | 0 | canonical.pdf p1,2,3; boundary.pdf p1,2,3 | FAIL_REPAIR_REQUIRED |
| vt_seal_dui-set | VT | 28 | 28 | 0 | canonical.pdf p1,2,3; boundary.pdf p1,2,3 | FAIL_REPAIR_REQUIRED |
| vt_seal_felony-set | VT | 28 | 28 | 0 | canonical.pdf p1,2,3; boundary.pdf p1,2,3 | FAIL_REPAIR_REQUIRED |
| vt_seal_misdemeanor-set | VT | 28 | 28 | 0 | canonical.pdf p1,2,3; boundary.pdf p1,2,3 | FAIL_REPAIR_REQUIRED |
| vt_seal_pardon-set | VT | 28 | 28 | 0 | canonical.pdf p1,2,3; boundary.pdf p1,2,3 | FAIL_REPAIR_REQUIRED |

## The two that measure clean

**ct-cleanslate-petition-set.** JD-CR-202 carries two exposed widgets and the option does install an empty appearance for both — so the control is live in the bytes. It changes **zero rendered pixels anywhere on the document**. Read directly at both rects, the pinned source, the option-off baseline, the option-on baseline and the delivered fixture carry identical ink (85/85/85/85 and 119/119/119/119 on page 1; 82 and 84 on page 2). No square reaches a delivered page. Clean, and clean for a reason that is measured rather than assumed.

**va_exp_identity_used_by_another-set.** CC-1473 resolves by hash and carries 17 exposed widgets, and the option changes 1,512 pixels on it, so the measurement is not dead. But CC-1473 is a bound *reference* instrument: the family's own `rendered-artifacts.json` says it is "read for structure and procedure; not included in any rendered artifact", and matching by ink confirms it — no page of either fixture reproduces either of its pages (best coverage 0.08). Its widgets reach no delivered page, so no square can be delivered. Clean.

## What a row says and does not say

Each `FAIL_REPAIR_REQUIRED` row measures one obligation, CLIPPING_AND_OVERLAP, fresh. The other fourteen are carried at `PASS` from the family's standing independent reading, named by lane, base and evidence path, and carried only because the committed fixture bytes are byte-identical to the bytes that reading rests on — every fixture digest recomputes byte-exact from disk and equals the digest the live `RASTER_PASS` receipt pins. Nothing in a standing row was re-derived here.

One family, `vt_seal_pardon-set`, carries a `standingContest` block: MASTER_QUEUE selects vf02's PASS and this row carries the fourteen from it, but a later VF08 row records FILING_DESTINATION, FEE_AND_WAIVER and SERVICE as FAIL at a different base. That contest is not resolved here; it is named so the carried PASS is not read as clearing it.

## The repair

Per family, not per state and not in the shared sanitizer: opt the family's builder into `suppressSynthesizedAppearances` at its `sanitizeAndFlatten` call site, rebuild the fixtures, re-raster them through the central acceptance workflow, and re-read this obligation. The option's default stays off — a lane holding one family does not decide what another family's next rebuild produces — and this lane changed no builder, no overlay directory, no shared record and no claim ledger.

## Preflight

`PACKET_BUILD_ENVIRONMENT_NOT_READY: 11/12 passed, 1 failed, 5 not applicable`. The one failure is `corpus_matches_committed_index`: 1 absent of 24 sampled, the entry `LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf`, because this container's Master Library mount holds no `LegalEase Alabama` subtree at all. No family in this cohort is an Alabama family; every source measured here resolved by content hash from mounted custody, and one that had not would have been recorded NOT_MEASURABLE_HERE rather than counted as a zero.

---

A measurement authorizes no rebuild, no route change and no promotion. No family is repaired by being listed here, and none is proven by being absent.
