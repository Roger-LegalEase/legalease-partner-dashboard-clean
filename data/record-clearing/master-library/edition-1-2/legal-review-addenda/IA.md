# Iowa — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** IA
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/IA/01_LEGAL_REVIEW/IA__LEGAL-REVIEW__STATEWIDE__iowa-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commits:** `fb6741e` (Iowa normalization), `c0fd28c` (Group 1 source completion)
**Runtime effect:** none. Every Iowa track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/IA/01_LEGAL_REVIEW/IA__LEGAL-REVIEW__STATEWIDE__iowa-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Iowa and is not counted as one.
It records only supported differences.

## Amended statements

### 1. The criminal-history check is a supporting action with a packet, not a guidance route

- **Retained review statement amended:** the DCI criminal-history check is treated as a route with no participant-completed form available.
- **Accepted normalized treatment:** `ia-dci77` is a `supporting_action` node whose output strategy is `official_pdf_fill`. DCI-77 is a participant-completed request carrying the participant's own release authorization signature; DCI-76 is the billing form published in the same packet.
- **Controlling source:** Iowa Department of Public Safety, *Criminal History Billing and Request Forms* (combined fillable packet, 3 pages, 45 fields), acquired from `dps.iowa.gov` on 2026-08-02 and hashed on retrieval. The form states that DCI-77 is the only approved release authorization form for this purpose.
- **Normalization commit:** `c0fd28c`
- **Authority effect:** Edition 1.2 retains the packet as a `source_gated` asset, establishing packet identity. A criminal-history check retrieves and verifies records and alters none, so the node is not a paid relief mechanism.
- **Runtime effect:** none. `generation_allowed` is `no`.

### 2. The 2021 Rule 2.86 order revision is superseded

- **Retained review statement amended:** the January 2021 Rule 2.86 order is presented without a currency qualification.
- **Accepted normalized treatment:** the August 2024 Rule 2.86 Form 4 is the mapped source; the January 2021 revision is `historical_obsolete` and is never runtime-selectable.
- **Controlling source:** Iowa Rules of Criminal Procedure, r. 2.86, August 2024 forms release.
- **Normalization commit:** `fb6741e`
- **Authority effect:** Edition 1.2 records the 2021 revision in the exclusion log as superseded, with its hash. The evidence is preserved; its treatment is recorded.
- **Runtime effect:** none.

### 3. The pre-July-2013 deferred-judgment branch has no identified filing vehicle

- **Retained review statement amended:** the deferred-judgment route is presented as one mechanism.
- **Accepted normalized treatment:** `ia-9079` is a composed **alternative**. The post-July-2013 branch is genuinely nothing to file. The pre-2013 branch contemplates a participant application but has no form, no rule and thin statutory mechanics; that unit is unavailable and carries the single Iowa build blocker.
- **Controlling source:** Iowa Code § 907.9 and the 2013 amendment; no Judicial Branch form or rule prescribes the pre-2013 vehicle.
- **Normalization commit:** `fb6741e`
- **Authority effect:** the build blocker is preserved exactly. Edition 1.2 did not redo Iowa's legal design and did not silently amend the memo; the source-acquisition queue carries the open identification question.
- **Runtime effect:** the unit is unavailable and the track fails closed.

### 4. Rule 2.86 Forms 1, 2 and 3 remain unmanifested

- **Retained review statement amended:** the review treats the Rule 2.86 form set as available.
- **Accepted normalized treatment:** the Forms 1, 2 and 3 components, and the certification of service by mailing or delivery, are `authority_unmanifested_source` against Edition 1.2.
- **Controlling source:** Edition 1.2 `MASTER_ASSET_MANIFEST.csv` and the generated source-acquisition queue.
- **Normalization commit:** `fb6741e`
- **Authority effect:** each is authority-blocked with a stated required acquisition.
- **Runtime effect:** none; the tracks were already runtime-disabled.
