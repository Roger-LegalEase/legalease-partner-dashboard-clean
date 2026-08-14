# Handoff — Petition to Expunge an Identity Theft or Wrong-Person Record (22 O.S. § 18 identity-theft category, with § 19a)

## Authority

- 22 O.S. § 18
- 22 O.S. § 19
- 22 O.S. § 19a
- 22 O.S. § 60.18
- 22 O.S. § 991c
- Senate Bill 2030 (2026)

## Mechanism

Where a record was created in the participant's name through identity theft, or otherwise identifies the wrong person, the Section 18 identity-theft category with § 19a provides the route. The petition is filed in the district court of the county where the arrest information is located; the court sets a hearing with 30 days' notice to the prosecuting agency, the arresting agency, OSBI, and any other relevant agency, and may seal records under the § 19 balancing test. Oklahoma says expungement but means sealing (full versus partial sealing is a material outcome difference); § 19 does not authorize physical destruction.

## Route decision

Custom pleading (controlled pleading, lane C). The controlling review identified no standard statewide or district petition form, so the pleading is generated to the statutory content requirements. The pre-existing Oklahoma runtime configs (src/lib/record-clearing/oklahoma-config.ts: okSection1819ExpungementConfig, ok991cDeferredExpungementConfig, verifier scripts/verify-ok-pleading-state.mjs) cover the general Section 18/19 and 991(c) tracks, not this ledger track, so this config is authored fresh from the Oklahoma state pack following the committed okPresentation pattern (movant-first caption). Certificate of service is deliberately absent: § 19 notice is the court's act, and the proposed order must identify every agency to which it applies.

## Open counsel flags

- Registry build blocker: the enrolled text of 22 O.S. §§ 18 and 19 as amended by SB 2030 (2026) was not obtained; Section 18 was amended by Chapter 259 O.S.L. 2024 and Section 19 by Chapter 292 O.S.L. 2025 before SB 2030 amended both again. The category screen runs on the category description, never a paragraph number, until the amended text is read.
- Registry release blocker: whether the participant is reached by the SB 2030 sealing-without-petition route must be screened before any paid petition (the free-route screen precedes generation).
- Registry release blocker: the district court filing fee is unresolved and cannot be stated; only the OSBI-published figures ($0 court record, $150 arrest record, cashier's check or money order only) may be surfaced.
- Registry build blocker (form existence): whether any standard Oklahoma petition form exists, statewide or by district, is an open question recorded by the review; if one is later identified, the mandatory-form question routes to lane D/E.
- The source establishes signature-and-verification but no notarization requirement and no verification statute (citation null).
- Tribal records are a live post-McGirt issue and an explicit escalation; identity disputes and contested hearings end self-help.
