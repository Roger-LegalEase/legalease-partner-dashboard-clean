# Kansas — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** KS
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/KS/01_LEGAL_REVIEW/KS__LEGAL-REVIEW__STATEWIDE__kansas-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `4aa3450`
**Runtime effect:** none. Every Kansas track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/KS/01_LEGAL_REVIEW/KS__LEGAL-REVIEW__STATEWIDE__kansas-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Kansas and is not counted as one.

## Amended statements

### 1. The Judicial Council's terms prohibit commercial reuse, on the publisher's own words

- **Retained review statement amended:** the review does not settle the licensing position of the Kansas Judicial Council form suite.
- **Accepted normalized treatment:** the source gate stands and is **hardened**, not lifted. The Council publishes, verbatim: *"These forms are for non-commercial use only. These forms are copyrighted by the Kansas Judicial Council and are provided free of charge. These forms cannot be sold, republished, or otherwise transferred from one person to another for compensation or other value without the Kansas Judicial Council's express permission. If you paid a company for these forms, please contact the Attorney General's consumer complaint hotline and the Kansas Judicial Council."*
- **Controlling source:** Kansas Judicial Council, *Legal Forms* and *Expungement (Adult)* pages, terms of use, retrieved 2026-08-03 from an archived capture; `kjc.ks.gov` returns HTTP 403 to direct automated retrieval.
- **Normalization commit:** `4aa3450`
- **Authority effect:** every Kansas Judicial Council form is retained or held as `source_gated` with a `commercial_use` gate, never as a packet-form candidate. **The gate must not be evaded by relabelling a Judicial Council route as a custom pleading**, and Edition 1.2 does not do so.
- **Runtime effect:** none, and none is available: a commercially prohibited source can never become resolver-selectable.

### 2. All five of the review's build blockers are closed

- **Retained review statement amended:** Kansas is returned as "additional research required" with five build blockers.
- **Accepted normalized treatment:** K.S.A. 22-2410 was read in full from 2025 HB 2393 § 5, and K.S.A. 12-4516 and 12-4516a from the Revisor's 2026 Kansas Statutes. The Judicial Council does publish an arrest-record form set and does not publish a municipal set. **The "missing" granting order was already in the corpus** — *Order for Expungement of Conviction or Diversion*, Rev. KSJC 08/2022.
- **Controlling source:** 2025 Kan. Sess. Laws HB 2393 § 5; K.S.A. 12-4516 and 12-4516a, 2026 Kansas Statutes.
- **Normalization commit:** `4aa3450`
- **Authority effect:** Kansas carries zero build blockers. Check the corpus and the issuing authority's current form index before recording a missing-form blocker.
- **Runtime effect:** none.

### 3. Track A is two mechanisms, and Track D is an official-form route

- **Retained review statement amended:** source Track A is one route, and the memorandum's default sends Track D elsewhere.
- **Accepted normalized treatment:** Track A splits into `ks-21-6614-conviction` and `ks-21-6614-diversion`. The conviction node runs from satisfying the sentence or discharge from supervision, is directed to the convicting court by (a)(1), and carries the 3, 5, 7 and 10 year lanes; the diversion node runs from fulfilment of the diversion terms, is directed to the district court by (a)(2), and cannot reach the 10-year or 7-year DUI lanes because (d)(2) speaks only of a sentence or supervision. **Track D is `official_pdf_fill`, overriding the memorandum's default**, because the Judicial Council publishes a statewide *Petition for Expungement of Arrest Record* (KSJC 02/2013) whose four grounds track K.S.A. 22-2410(c) exactly, plus a KBI order cover sheet.
- **Controlling source:** K.S.A. 21-6614 as reproduced in 2026 Senate Bill 430 § 2; K.S.A. 22-2410(b)(3)(B) and (c).
- **Normalization commit:** `4aa3450`
- **Authority effect:** the (a)(2) mandatory category is a prosecutor filing, not a participant one; the (b)(3)(B) fee exemption reaches identity-theft victims **and** anyone whose charges were dismissed for want of probable cause, who was found not guilty, or whose charges were dismissed.
- **Runtime effect:** none.

### 4. Track G is a composed packet, not guidance

- **Retained review statement amended:** the offender-registration relief route is classified guidance for want of a form.
- **Accepted normalized treatment:** K.S.A. 22-4908(d)(3) directs the Judicial Council to develop the petition form and it has, at revision 06/2022. Nine of its ten items are participant facts; only item 10 is a rehabilitation narrative, which is prompted and formatted. The route is `composed` and sequential because relief and expungement are distinct filings with different statutes, venues, notice sets, standards and fees; unit 2 references `ks-21-6614-conviction` rather than duplicating it.
- **Controlling source:** K.S.A. 22-4908(d)(3); Kansas Judicial Council petition, Rev. 06/2022.
- **Normalization commit:** `4aa3450`
- **Authority effect:** the route carries a packet identity behind the same commercial-use gate.
- **Runtime effect:** none.

### 5. Two citation corrections, and no general fee waiver exists

- **Retained review statement amended:** the review attributes K.S.A. 12-4516a's prohibited-ordinance ground to K.S.A. 22-2410, omits 12-4516a(c)(5), and leaves the fee-waiver question open.
- **Accepted normalized treatment:** the prohibited-ordinance ground belongs to K.S.A. 12-4516a, and 12-4516a(c)(5) is carried. **No general poverty-based fee waiver exists** — 2026 HB 2724 and HB 2655 both died — though some district courts publish a poverty affidavit as local practice.
- **Controlling source:** K.S.A. 12-4516a; 2026 Kansas legislative record for HB 2724 and HB 2655.
- **Normalization commit:** `4aa3450`
- **Authority effect:** a fee-waiver component is not asserted on any Kansas track.
- **Runtime effect:** none.
