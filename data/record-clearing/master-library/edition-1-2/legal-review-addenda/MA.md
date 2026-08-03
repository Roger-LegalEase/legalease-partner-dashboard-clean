# Massachusetts — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MA
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MA/01_LEGAL_REVIEW/MA__LEGAL-REVIEW__STATEWIDE__massachusetts-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `369e3f9`
**Runtime effect:** none. Every Massachusetts track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MA/01_LEGAL_REVIEW/MA__LEGAL-REVIEW__STATEWIDE__massachusetts-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Massachusetts and is not counted as one.

## Amended statements

### 1. Three of the four "staged or hybrid" tracks are not composed

- **Retained review statement amended:** Tracks 4, 5, 6 and 8 are each presented as staged or hybrid routes.
- **Accepted normalized treatment:** Tracks 4, 6 and 8 stage a *product workflow*, not legally distinct units. The review's stage 2 is the participant's own narrative, which the product model supports through structured prompts, and stage 3 is filing and hearing attendance, a `post_generation_handoff`. Tracks 4 and 6 are single `official_pdf_fill` routes; Track 8 is a single `custom_pleading`. **Only Track 5 is genuinely composed** — the Commissioner of Probation certifies eligibility under §§ 100I/100J before the matter reaches a judge, so the agency and court stages have different destinations.
- **Controlling source:** G.L. c. 276, §§ 100I and 100J; adopted Batch 2 memorandum on composition.
- **Normalization commit:** `369e3f9`
- **Authority effect:** composed-unit approvals cover one Massachusetts track, not four.
- **Runtime effect:** none.

### 2. Track 8 has no published Boston Municipal Court form

- **Retained review statement amended:** the Boston Municipal Court consolidated procedure is left unresolved pending a form.
- **Accepted normalized treatment:** `custom_pleading` with `localFormOverride: true` against the Standing Order's required contents, scope-restricted to three or more records across two or more BMC divisions. The adopted memorandum authorises the fallback directly.
- **Controlling source:** Boston Municipal Court Standing Order; adopted Batch 2 memorandum.
- **Normalization commit:** `369e3f9`
- **Authority effect:** recorded as a release blocker, not a build blocker. The absence of a local form is not a source gap for a custom pleading.
- **Runtime effect:** none.

### 3. `ma-autoseal` is guidance because the only participant form declines the relief

- **Retained review statement amended:** the automatic sealing route is treated as agency-controlled.
- **Accepted normalized treatment:** `process_guidance` on a precise ground — G.L. c. 276, § 100C ¶ 1 seals by operation of law, and the sole participant-facing form, OCPS004, exists only to **decline** the relief.
- **Controlling source:** G.L. c. 276, § 100C ¶ 1; Office of the Commissioner of Probation form OCPS004.
- **Normalization commit:** `369e3f9`
- **Authority effect:** the guidance classification rests on a no-filing conclusion, not on a missing form.
- **Runtime effect:** none.

### 4. Three petition forms are in the corpus and now carry packet identity

- **Retained review statement amended:** the review does not establish the retained source position of the Massachusetts petition forms.
- **Accepted normalized treatment:** the § 100K expungement petition (Trial Court of Massachusetts, Rev. 12.20.18, eight ground checkboxes, instructions on the reverse), TC0057 (*Petition to Seal Criminal Records for Nolle Prosequi or Dismissal*, standardised across four court departments, nine narrative questions mapping onto the six *Pon* factors) and the Commissioner of Probation *Petition to Seal* are the mapped sources.
- **Controlling source:** Massachusetts Trial Court and Office of the Commissioner of Probation published forms, as held in the repository source corpus.
- **Normalization commit:** `369e3f9`
- **Authority effect:** Edition 1.2 retains the § 100K petition and TC0057 as `source_gated` assets. Their printed revisions could not be re-confirmed against the publisher in this pass; identity is established, currentness is not.
- **Runtime effect:** none. `generation_allowed` is `no`.
