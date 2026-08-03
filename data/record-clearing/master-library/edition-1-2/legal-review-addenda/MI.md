# Michigan — Edition 1.2 controlling legal-review addendum

**Jurisdiction:** MI
**Edition:** 1.2
**As of:** 2026-08-03
**Amends:** `STATES/MI/01_LEGAL_REVIEW/MI__LEGAL-REVIEW__STATEWIDE__michigan-record-clearing-legal-review__ASOF-2026-07-30__EN.md`
**Normalization commit:** `7b9ce91`
**Runtime effect:** none. Every Michigan track remains `runtime_disabled`.

## Precedence

1. This addendum, for the statements listed below and for nothing else.
2. `00_GOVERNANCE/ADOPTED_BATCH_2_LEGAL_RESEARCH_RESOLUTION.md`.
3. The retained review `STATES/MI/01_LEGAL_REVIEW/MI__LEGAL-REVIEW__STATEWIDE__michigan-record-clearing-legal-review__ASOF-2026-07-30__EN.md`, for every conclusion this addendum does not amend.

This addendum is not a second legal review for Michigan and is not counted as one.

## Amended statements

### 1. The trafficking set-aside route is packet-capable

- **Retained review statement amended:** `mi_setaside_trafficking` is classified `process_guidance` with attorney handoff.
- **Accepted normalized treatment:** `official_pdf_fill` on MC 227b. LegalEase completes neutral identifiers, conviction data and contact information and formats the participant's own factual statement. Attorney review is a **packet instruction** that expressly creates no upload, staff-review, proof-of-review or generation gate.
- **Controlling source:** adopted Batch 2 memorandum, which expressly directs this treatment; MCL 780.621d.
- **Normalization commit:** `7b9ce91`
- **Authority effect:** the route is audited as an official-form route rather than as guidance.
- **Runtime effect:** none.

### 2. Four forms the review records as missing are in the corpus, with a build-blocker consequence

- **Retained review statement amended:** section 2.8 lists MC 227a, MC 227b, MC 228 and MC 262 as missing and marks their currency a build blocker (open question 8).
- **Accepted normalized treatment:** the Batch 2 import supplied all four — MC 227a and MC 227b at rev 07/2024, MC 228 at rev 03/2023, MC 262 at rev 06/2019. This unblocks the marihuana route, which the review calls "the single best relief in Michigan" while noting "we do not have the form."
- **Controlling source:** State Court Administrative Office approved forms MC 227a, MC 227b, MC 228 and MC 262 as held in the repository source corpus.
- **Normalization commit:** `7b9ce91`
- **Authority effect:** open question 8 is closed and Michigan carries **zero** build blockers. RI-008 remains unavailable, and that is inherent — it is taken in person, not published.
- **Runtime effect:** none.

### 3. MC 227 is one form, and its proof of service is part of it

- **Retained review statement amended:** the review does not settle whether the proof of service is a separate document.
- **Accepted normalized treatment:** MC 227, *Application to Set Aside Conviction(s)*, is SCAO-approved and its content is dictated by MCL 780.621d(7) — invalid unless it contains seven enumerated categories and is signed under oath. Item 2.c and the page 3 proof of service are components of the same form.
- **Controlling source:** MCL 780.621d(7); SCAO form MC 227.
- **Normalization commit:** `7b9ce91`
- **Authority effect:** Edition 1.2 retains MC 227 as a `source_gated` asset, establishing packet identity. Its printed revision could not be re-confirmed against the publisher in this pass.
- **Runtime effect:** none. `generation_allowed` is `no`.

### 4. No participant-facing Michigan State Police record-correction form exists

- **Retained review statement amended:** the review implies a correction packet or supporting-action node.
- **Accepted normalized treatment:** the challenge process runs by telephone or email to Michigan State Police, and corrections must be routed to the reporting agency. No correction packet and no supporting-action node is asserted.
- **Controlling source:** Michigan State Police published record-challenge process.
- **Normalization commit:** `7b9ce91`
- **Authority effect:** the absence is a conclusion, not a gap, and generates no source-acquisition row.
- **Runtime effect:** none.
