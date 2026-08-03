# Minnesota — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MN
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MN/01_LEGAL_REVIEW/MN__LEGAL-REVIEW__STATEWIDE__minnesota-record-clearing-legal-review__ASOF-2026-07-30__ES.md`
**Normalization commit:** `31c517c`
**Runtime effect:** none. Every Minnesota track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MN/01_LEGAL_REVIEW/MN__LEGAL-REVIEW__STATEWIDE__minnesota-record-clearing-legal-review__ASOF-2026-07-30__ES.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Minnesota and is not counted as one.

## Amended statements

### 1. The § 299C.11 arrest-record route is a custom pleading, not guidance

- **Retained review statement amended:** Track 6 is classified guidance because relief runs on correspondence rather than a court filing.
- **Accepted normalized treatment:** `mn_299c11_arrest_demand` is `custom_pleading`. Relief runs on written demands the participant submits, and the Judicial Branch publishes six sample letters. The packet generates the participant-signed demands for the custodians that may hold the arrest data — the Bureau of Criminal Apprehension, police department, county sheriff, city attorney, county attorney and county department of corrections. Correspondence rather than a court filing is not a reason to withhold a packet.
- **Controlling source:** Minn. Stat. § 299C.11; Minnesota Judicial Branch published sample demand letters.
- **Normalization commit:** `31c517c`
- **Authority effect:** agency addresses are manual-completion items; signature, disposition documentation, mailing and the certified-mail recommendation are participant actions; refusal or nonresponse is a post-generation handoff.
- **Runtime effect:** none.

### 2. The prosecutor-agreement route is one statewide mechanism with county implementation

- **Retained review statement amended:** the prosecutor-agreement route is presented as county-specific relief.
- **Accepted normalized treatment:** `mn_prosecutor_agreed` is `composed` / `mixed` with four units and `localFormOverride: true`, scoped `county` over Hennepin, Ramsey and Washington. The request stage is a `custom_pleading` parent with two nested children — a portal-or-contact-only county route as `process_guidance`, and a supported written request to the county or city attorney as `custom_pleading` — and the court-sealing stage is `process_guidance` because the participant files no petition once the prosecutor agrees.
- **Controlling source:** Minn. Stat. § 609A.025.
- **Normalization commit:** `31c517c`
- **Authority effect:** **no per-county relief nodes were created.** Nothing represents that LegalEase obtains agreement, negotiates, or advises whether approaching the prosecutor is strategically preferable.
- **Runtime effect:** none.

### 3. The EXP form suite is the mapped source, and Edition 1.1 did not retain it in English

- **Retained review statement amended:** the review does not record the retained source position of the EXP suite.
- **Accepted normalized treatment:** Track 11 is `official_pdf_fill` on EXP102 + EXP104 + EXP105; Tracks 9 and 10 are `official_pdf_fill` on EXP102 + EXP104 + EXP106. EXP102 is the statewide *Petition for Expungement of Criminal Records*; EXP104 is proof of service; EXP105 and EXP106 are the proposed orders for the § 609A.02 subd. 3 and § 152.18 routes respectively; EXP101 is the official instruction set.
- **Controlling source:** Minnesota Judicial Branch published EXP form suite, as held in the repository source corpus. Edition 1.1 retained only EXP101 in Spanish, Hmong and Somali plus FEE102 and FEE103; the English EXP forms were not in the edition.
- **Normalization commit:** `31c517c`
- **Authority effect:** Edition 1.2 retains EXP101, EXP102, EXP104, EXP105 and EXP106 in English as `source_gated` assets, establishing packet identity. `mncourts.gov` returns HTTP 403 to automated retrieval, so the printed revisions could not be re-confirmed against the publisher; that is an access result, not a finding that the forms are stale.
- **Runtime effect:** none. `generation_allowed` is `no`.

### 4. EXP107 currentness is unresolved, and Track 12 is a delivery-scope decision

- **Retained review statement amended:** the inherent-authority route is treated as unavailable for want of a packet.
- **Accepted normalized treatment:** `mn_inherent_authority` records the packet framework — EXP102 as the petition vehicle whose item 9 final checkbox routes to inherent authority, EXP104 as proof of service, EXP107 as the published proposed order — and records **delivery** as `process_guidance` with rationale `individualized_advocacy`. The record does not say no packet exists. The exact blocking fields are named: EXP107 ¶¶ 2 and 3 require case-specific conclusions of law, and ¶¶ 6, 8 and 9 are open-ended legal-argument fields including the clear-and-convincing balancing.
- **Controlling source:** Minnesota Judicial Branch form EXP107; the corpus copy is Rev 01/15.
- **Normalization commit:** `31c517c`
- **Authority effect:** EXP107 currentness stays a **release blocker**. Minnesota is not held for it: Track 12 is outside direct self-help delivery either way.
- **Runtime effect:** none.

### 5. Laws 2026, ch. 70, § 5 is resolved on the merits

- **Retained review statement amended:** the 2026 amendment is left as an open currency question.
- **Accepted normalized treatment:** section 5 adds Minn. Stat. § 609A.015, subd. 5(f), under which the Bureau of Criminal Apprehension unseals a record and notifies the judicial branch if it later determines the record did not qualify, deciding **only** from a record in its criminal history system; following paragraphs are renumbered (g)–(j). It does **not** alter BCA identification duties, the court-sealing window or victim notice. Chapter 70 states an effective date only for section 4 (1 January 2027), so section 5 falls to the default in Minn. Stat. § 645.02.
- **Controlling source:** Minnesota Revisor of Statutes, Laws 2026, ch. 70, retrieved 2026-08-02.
- **Normalization commit:** `31c517c`
- **Authority effect:** this changes a participant-facing warning, not packet identity, so it remains a **release blocker** on Track 1 and is stated as a packet instruction.
- **Runtime effect:** none.

### 6. EXP103 is not a participant packet component

- **Retained review statement amended:** EXP103 is listed among the expungement forms without a role distinction.
- **Accepted normalized treatment:** EXP103 is a prosecutor- and court-side victim-notice form, not a participant packet component. Its absence from the corpus is correct and generates no source-acquisition row.
- **Controlling source:** Minnesota Judicial Branch form EXP103.
- **Normalization commit:** `31c517c`
- **Authority effect:** the form is excluded from the participant packet set by role, not held as a gap.
- **Runtime effect:** none.
