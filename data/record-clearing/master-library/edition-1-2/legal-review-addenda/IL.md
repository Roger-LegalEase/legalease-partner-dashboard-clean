# Illinois — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** IL
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/IL/01_LEGAL_REVIEW/IL__LEGAL-REVIEW__STATEWIDE__illinois-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commits:** `6386f01` (Illinois normalization), `c0fd28c` (Group 1 source completion)
**Runtime effect:** none. Every Illinois track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/IL/01_LEGAL_REVIEW/IL__LEGAL-REVIEW__STATEWIDE__illinois-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Illinois and is not counted as
one. It records only supported differences. Settled portions of the retained
review are neither rewritten nor reproduced here.

## Amended statements

### 1. Source Track P is two mechanisms, not one

- **Retained review statement amended:** Track P is presented as a single cannabis relief route.
- **Accepted normalized treatment:** split into `il-prostitution-j-auto` (automatic relief, `process_guidance`) and `il-prostitution-j-vacate` (participant motion to vacate and expunge, `official_pdf_fill`). Different actors, triggers, forms and outcomes must not share one runtime identifier.
- **Controlling source:** adopted Batch 2 legal-research resolution memorandum, priority issue 4, and the counsel-approved crosswalk erratum recorded in `BATCH_2_ADOPTION_CHANGELOG.md`.
- **Normalization commit:** `6386f01`
- **Authority effect:** the Illinois node count is 17 against 16 source slots. Cannabis Tracks N and O were already separate and are unchanged; the statewide cannabis suite maps to `il-cannabis-vacate` only.
- **Runtime effect:** none; both nodes are runtime-disabled.

### 2. `il-immediate-seal` is a custom pleading, not guidance

- **Retained review statement amended:** the § 5.2(g) immediate-sealing route is classified `process_guidance` on the ground that it happens in the courtroom.
- **Accepted normalized treatment:** `custom_pleading` with `localFormOverride: true`. A § 5.2(g) petition and proposed order exist; the courtroom constraint is a delivery restriction, not an absent packet.
- **Controlling source:** 20 ILCS 2630/5.2(g); adopted Batch 2 memorandum guidance re-review.
- **Normalization commit:** `6386f01`
- **Authority effect:** the route no longer counts as a no-filing guidance route.
- **Runtime effect:** none; the track stays runtime-disabled on its release blockers.

### 3. The Prisoner Review Board certificate route is a five-unit composed track, and its forms exist

- **Retained review statement amended:** no Prisoner Review Board application form had been sourced, so the certificate route was held guidance-only at stage 1.
- **Accepted normalized treatment:** `il-prb-cert` is `composed` / `mixed` with five units. The Certificate of Sealing and Certificate of Expungement for Military branches are `official_pdf_fill` and available; only the non-military § 5.2(e-6) branch remains held.
- **Controlling source:** Illinois Prisoner Review Board, *Certificate of Sealing Application*, revised 09/18/2024, and *Certificate of Expungement for Military Application*, v9.18.24, each with its eligibility acknowledgement — acquired directly from `prb.illinois.gov` on 2026-08-02 and hashed on retrieval.
- **Normalization commit:** `c0fd28c`
- **Authority effect:** Edition 1.2 retains all four Prisoner Review Board documents as `source_gated` assets, establishing packet identity. The two published *Guidelines* documents and the sealable-convictions list are retained as reference sources only and are never generation targets.
- **Runtime effect:** none. `generation_allowed` is `no`; the Board's own currentness confirmation is an open release gate.

### 4. Statewide approved-form components remain unmanifested

- **Retained review statement amended:** the review treats the statewide EXP-AD, CXP and juvenile form suites as available sources.
- **Accepted normalized treatment:** those components are `authority_unmanifested_source` against Edition 1.2. Their repository copies carry no official title and no printed revision, so their legal identity is not established and they are held rather than published.
- **Controlling source:** Edition 1.2 `MASTER_ASSET_MANIFEST.csv` and the generated source-acquisition queue.
- **Normalization commit:** `6386f01`
- **Authority effect:** every affected `official_pdf_fill` component is authority-blocked and appears in the source-acquisition queue with its required acquisition.
- **Runtime effect:** none; the tracks were already runtime-disabled.
