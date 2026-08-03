# Indiana — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** IN
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/IN/01_LEGAL_REVIEW/IN__LEGAL-REVIEW__STATEWIDE__indiana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commits:** `08cdcc2` (Indiana normalization), `c0fd28c` (Group 1 source completion)
**Runtime effect:** none. Every Indiana track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/IN/01_LEGAL_REVIEW/IN__LEGAL-REVIEW__STATEWIDE__indiana-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Indiana and is not counted as one.

## Amended statements

### 1. There is no Coalition for Court Access "Section 5" insert to acquire

- **Retained review statement amended:** the serious-felony conviction packet is held on the ground that the Section 5 conviction insert is absent from the corpus and must be obtained.
- **Accepted normalized treatment:** the Coalition publishes inserts for Sections 2, 3 and 4 only. The corpus was already complete; `in_conviction_serious_felony` needed a statutory custom pleading, not a form hunt, and is `custom_pleading` with `localFormOverride: true`.
- **Controlling source:** Coalition for Court Access published expungement form set; Ind. Code § 35-38-9.
- **Normalization commit:** `c0fd28c`
- **Authority effect:** the Indiana build blocker recorded on this route is closed. Absence of a form that was never published is not a source gap.
- **Runtime effect:** none; the track remains runtime-disabled on its release blockers.

### 2. The IPDC copy of Ind. Code ch. 35-38-9 is not a current source

- **Retained review statement amended:** the review relies on a copy of the expungement chapter labelled "Indiana Code 2016", with amendment history ending at P.L.142-2015.
- **Accepted normalized treatment:** the Office of Judicial Administration publication, updated 7/1/2026, controls the current statutory text and is in the corpus.
- **Controlling source:** Indiana Office of Judicial Administration, *Detailed Information on Criminal Case Expungement*, updated 7/1/2026.
- **Normalization commit:** `08cdcc2`
- **Authority effect:** Edition 1.2 logs the Office of Judicial Administration publication as a reference source with its hash. It is an official explanatory source, not a generation target, and is never resolver-selectable. `iga.in.gov` is a JavaScript application shell and cannot serve statutory text to automated retrieval; that is an access finding, not a currency finding.
- **Runtime effect:** none.

### 3. Two routes are custom pleadings on the memorandum's authority

- **Retained review statement amended:** `in_collateral_action` and `in_supplemental_order` are presented as official-form routes.
- **Accepted normalized treatment:** `in_collateral_action` takes `custom_pleading` from the adopted memorandum, which is controlling — the official-form label is not carried forward until the statewide form is verified. `in_supplemental_order` is `custom_pleading` because § 35-38-9-9(l) describes a petition on its face.
- **Controlling source:** adopted Batch 2 memorandum; Ind. Code § 35-38-9-9(l).
- **Normalization commit:** `08cdcc2`
- **Authority effect:** neither route is failed for lacking an official binary; a custom-pleading component requires controlling authority and specifications, not a form.
- **Runtime effect:** none.

### 4. Automatic expungement is the only standalone guidance route

- **Retained review statement amended:** several Indiana routes are treated as agency-controlled guidance.
- **Accepted normalized treatment:** `in_auto_expungement` is the only standalone guidance route, because § 35-38-9-1(b) expressly requires no petition. `in_infraction_nondisclosure` is composed sequential: check whether the court already acted, then a verified petition held unavailable pending the form and case-type questions.
- **Controlling source:** Ind. Code § 35-38-9-1(b).
- **Normalization commit:** `08cdcc2`
- **Authority effect:** a guidance classification now rests on a stated no-filing ground rather than on agency control.
- **Runtime effect:** none.
