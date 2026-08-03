# Maryland — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MD
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MD/01_LEGAL_REVIEW/MD__LEGAL-REVIEW__STATEWIDE__maryland-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `41c0aed`
**Runtime effect:** none. Every Maryland track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MD/01_LEGAL_REVIEW/MD__LEGAL-REVIEW__STATEWIDE__maryland-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Maryland and is not counted as one.

## Amended statements

### 1. Second-chance shielding is packet-capable

- **Retained review statement amended:** the review recommends guidance only for second-chance shielding.
- **Accepted normalized treatment:** `md_second_chance_shielding` is `official_pdf_fill` on CC-DC-CR-148 with MDJ-008. The once-per-lifetime, one-court and one-county rules are scope and routing fields, not a bar to generating a packet. The review's multi-court hard block is retained as the scope restriction.
- **Controlling source:** adopted Batch 2 memorandum, which expressly directs this treatment; Md. Code, Crim. Proc. § 10-303.
- **Normalization commit:** `41c0aed`
- **Authority effect:** the track carries a packet identity and is authority-audited as an official-form route.
- **Runtime effect:** none; the track remains runtime-disabled.

### 2. The § 10-103 legacy police-record route is not composed — its entry window has closed

- **Retained review statement amended:** the review, and the memorandum's default, treat § 10-103 as a staged official-form route.
- **Accepted normalized treatment:** `md_10103_legacy_police` is `process_guidance` on a closed-window scope restriction. § 10-103 requires the request within eight years of an incident that must predate 1 October 2007, so the entry window closed no later than October 2015 and neither stage is reachable. A composed route requires at least one available unit.
- **Controlling source:** Md. Code, Crim. Proc. § 10-103.
- **Normalization commit:** `41c0aed`
- **Authority effect:** the memorandum's actual correction is preserved — DC-CR-071 is the **Maryland District Court** form, not a District of Columbia limitation.
- **Runtime effect:** none.

### 3. § 10-104 is resolved from primary authority

- **Retained review statement amended:** the review leaves § 10-104 open, recording that the full text was not pulled.
- **Accepted normalized treatment:** § 10-104 empowers the District Court to order expungement on the State's nolle prosequi before service unless the State objects, and bars costs against the defendant. No participant filing exists, so `md_10104_pre_service` is `process_guidance` on a precise ground.
- **Controlling source:** Md. Code, Crim. Proc. § 10-104, current text.
- **Normalization commit:** `41c0aed`
- **Authority effect:** an open review question is closed on primary authority rather than deferred.
- **Runtime effect:** none.

### 4. The five forms the review recorded as missing are in the corpus

- **Retained review statement amended:** five Maryland expungement forms are listed as missing.
- **Accepted normalized treatment:** the Batch 2 import supplied all five. Maryland is source-complete and carries **zero** build blockers.
- **Controlling source:** Maryland Judiciary District Court forms CC-DC-CR-072A (*Petition for Expungement of Records*, Rev. 09/2025), CC-DC-CR-072B (*Petition for Expungement*, Rev. 10/01/2025-2, which also covers the § 10-105 act-no-longer-a-crime, § 10-105(a-1), nuisance-crime and gubernatorial-pardon routes), CC-DC-CR-072C (*Petition for Expungement with General Waiver and Release*, Rev. 01/2025, printing Rules Form 4-503.2 on its face) and CC-DC-CR-072D (*Petition for Expungement of Cannabis Records*, Rev. 10/2025).
- **Normalization commit:** `41c0aed`
- **Authority effect:** Edition 1.2 retains all four CC-DC-CR-072 petitions as `source_gated` assets, establishing packet identity. Their printed revisions could not be re-confirmed against the publisher in this pass, which is why they are source-gated rather than packet-form candidates.
- **Runtime effect:** none. `generation_allowed` is `no`.
