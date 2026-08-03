# Mississippi — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MS
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MS/01_LEGAL_REVIEW/MS__LEGAL-REVIEW__STATEWIDE__mississippi-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `9083e29`
**Runtime effect:** none. Every Mississippi track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MS/01_LEGAL_REVIEW/MS__LEGAL-REVIEW__STATEWIDE__mississippi-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Mississippi and is not counted as one.

## Amended statements

### 1. HB 1546 is enacted, and the three-year felony waiting period is correct

- **Retained review statement amended:** the review's headline finding is that a three-year felony waiting period had been live in the product on an unverified basis and that the surrounding evidence pointed the other way.
- **Accepted normalized treatment:** 2026 HB 1546 is **Chapter 430, Laws of 2026**, approved by the Governor 30 March 2026, effective 1 July 2026. The amendment markup is unambiguous — five struck, three inserted. It amends **§ 99-19-71, § 97-3-54.1 and § 97-3-54.6 together**, not § 97-3-54.6 alone as the review suspected, and adds felony procuring prostitution and promoting prostitution, both § 97-29-51, as new exclusions. **SECTION 4 is the only temporal provision and carries no applicability clause.**
- **Controlling source:** enrolled HB 1546 as sent to the Governor, and the Legislature's official bill-history record (`DISPOSITION: Law`, `EFFECTIVEDATE: July 1, 2026`, `CHAPNUM: 430`), retrieved from `billstatus.ls.state.ms.us` on 2026-08-03.
- **Normalization commit:** `9083e29`
- **Authority effect:** the live three-year rule is **correct**; no product-rule correction was required and no re-screening obligation arises. The compiled Mississippi profile cites LegiScan for the rule; the enrolled text should replace that citation whenever the profile is next regenerated.
- **Runtime effect:** none.

### 2. Three further review questions closed on the enrolled text

- **Retained review statement amended:** the review leaves the definition of "one conviction", the location of the district-attorney notice, and the first-offender effect of a prior expunged conviction open.
- **Accepted normalized treatment:** "one (1) conviction" and "one (1) felony expunction" are defined to include all convictions arising from a common nucleus of operative facts as determined in the court's discretion. The ten-day district-attorney notice sits at **§ 99-19-71(2)(b)**. § 99-19-71(3) provides that the Criminal Information Center keeps a nonpublic record *"solely for the purpose of determining whether, in subsequent proceedings, the person is a first offender"*, and the perjury protection is expressly disapplied for that determination — **a prior expunged conviction does defeat first-offender status.**
- **Controlling source:** enrolled HB 1546 / Miss. Code Ann. § 99-19-71 as amended.
- **Normalization commit:** `9083e29`
- **Authority effect:** the Track 2 blocker is closed on primary authority.
- **Runtime effect:** none.

### 3. Every petition route is a custom pleading, and the local models are reference only

- **Retained review statement amended:** the review treats the four archived Mississippi PDFs as usable forms.
- **Accepted normalized treatment:** Mississippi has **no statewide expungement form** — confirmed against the Judiciary and Administrative Office of Courts, which publish none. The four archived PDFs are **Fourth Circuit Court District models** for Leflore, Sunflower and Washington counties: hardcoded three-county fields, the Greenville district attorney's address, 2020 dates, a certificate of service captioned for the wrong document, a mandatory grand-jury allegation, and a § 99-15-26 / § 99-19-71 dual citation that conflates two different tracks. Every petition track is `custom_pleading` with `localFormOverride: true`, and court, county and prosecuting authority are participant data.
- **Controlling source:** Mississippi Judiciary and Administrative Office of Courts published form indexes; the Fourth Circuit Court District materials themselves.
- **Normalization commit:** `9083e29`
- **Authority effect:** Edition 1.2 logs all four local models as reference-only sources with their hashes. **No official Mississippi form was invented**, and none is asserted. They are drafting references and are never generated.
- **Runtime effect:** none.

### 4. Track 7 is a composed alternative, not a verification node

- **Retained review statement amended:** post-intervention expungement reads as a completed-or-verification guidance node.
- **Accepted normalized treatment:** § 99-15-123(3) makes expungement after pretrial intervention available *"Upon petition therefor"* — a genuine participant request for relief — while § 9-23-23 states its result with no petition, application, fee, hearing, notice or waiting period anywhere in the section. Final treatment: `relief_track`, `composed`, `alternative`, two units — a `custom_pleading` § 99-15-123(3) petition branch and a `process_guidance` verification branch for intervention court. The programme itself is still not counted as paid relief.
- **Controlling source:** Miss. Code Ann. §§ 99-15-123(3) and 9-23-23, from the enrolled 2019 HB 1352.
- **Normalization commit:** `9083e29`
- **Authority effect:** the node type changed on retrieved text, not on inference.
- **Runtime effect:** none.

### 5. Three citation corrections, and the fee question stays open by design

- **Retained review statement amended:** the review cites § 63-11-30(14) for the DUI expungement provision, relies on a secondary clearinghouse source for § 67-3-70(6), and states a fee.
- **Accepted normalized treatment:** **§ 63-11-30's expungement provision is subsection (13)**, not (14) — (14) is Nonadjudication. **§ 67-3-70(6)'s one-year period is now primary-authority supported.** **§ 9-11-15(3) and § 21-23-7(6) are word-for-word identical** on every operative element, which confirms one node with venue branches rather than a split. On fees: § 99-19-72 levies $150 on *"each petition to expunge an offense under Section 99-19-71"* collected by the circuit clerk, which neither plainly reaches a subsection (4) non-conviction petition nor maps onto a justice or municipal court filing. **No fee amount is published on any Mississippi track**; the participant confirms with the clerk.
- **Controlling source:** enrolled 2022 SB 2095 (§ 63-11-30(13)), 2020 HB 917 (§ 67-3-70(6)), 2021 HB 354 (§ 21-23-7(6)); Miss. Code Ann. § 99-19-72.
- **Normalization commit:** `9083e29`
- **Authority effect:** each correction rests on an enrolled act rather than on a secondary source.
- **Runtime effect:** none.
