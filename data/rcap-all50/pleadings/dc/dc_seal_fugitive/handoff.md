# Handoff — dc_seal_fugitive (Lane C2)

## Authority

`D.C. Code § 16-806(a)(2)` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Reuse of the coded DC pleading config

A DC pleading config already exists at `src/lib/record-clearing/dc-config.ts`. It is **reused as the source of these artifacts, not forked**. The generator imports that module and reads out its presentation block, its verification statute, its service note, its court caption and the counsel flags shared by both coded DC motion configs, then writes them into these data artifacts. Nothing from it is retyped, so the two cannot drift apart. `provenance.reusedCodedConfig` records the path, the file's sha256 at build time, and the exact list of reused fields; the build asserts that the coded verification statute is still null before proceeding.

What is **not** taken from it: the two coded configs cover `adult_motion_to_seal` and `adult_motion_to_expunge`, which are different tracks from this job's three. The per-track title, statutory authority, relief term, relief and order verbs, records scope, prohibited vocabulary, component inventory and counsel flags are drafted from this track's own pinned registry entry.

## Mechanism

Arrested in DC as a fugitive, waived extradition under § 23-702(f)(1) and released or detained under (f)(2) or (f)(3), the fugitive case reached final disposition, and the person has appeared before the proper official in the other jurisdiction. The Court shall grant if sealing is in the interests of justice.

## Route decision

Motion rendered through the shared custom-pleading renderer, captioned to the Superior Court of the District of Columbia, Criminal Division. The appearance before the proper official in the originating jurisdiction and the interests-of-justice account are pleaded as the movant's own showing; neither is supplied or argued.

## Blocked components

- **eligibility_branch_confirmation — BLOCKED.** The pin records a build blocker against this track's eligibility branch: what expires on September 11, 2026, and which subsections of the sealing statute revert, is unresolved, on the stated basis that any temporary-law provision whose current applicability changes which motion route, waiting period or deadline applies is a true blocker. Exact missing source: the current applicability of the temporary-law provision and the reverted text of the affected subsections. Issuing body: the Council of the District of Columbia. Where published: the District of Columbia Official Code as amended. Lane C2 does not resolve it and does not guess which subsection governs after that date; the motion is drafted to the subsection the pin names as this track's authority. This is a build blocker on which subsection applies, not on the filing vehicle, which the pin settles. Promotion past pleading_packet_rendered is withheld until it is answered.

## Absent components (recorded, not omitted)

- **proposed_order** — The pinned packetSet for this track lists a single required component, the primary filing, and no proposed order. The order is the court's own instrument and none is generated.

## Negative fixture

The negative fixture asserts real invention, not a template-grade trip: invention:court_finding, invention:prosecutor_position, invention:fee_amount, invention:service_completed, invention:unsourced_citation, protected_field:populated. The verifier requires each signal to fire. `runPleadingQa` passes this document — it checks relief vocabulary, template grade, the required footer and seal markers, and cannot see a fabricated court finding, the prosecutor's position, an invented fee, completed service or a populated protected field (lane C1 finding 1).

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The movant signs their own motion. Notarization: The source review does not state a notarization requirement for this motion." No verification statute is named by the source and no notarization requirement is stated; the citation stays null.
- **filingFee** — source says: "The court's instruction sheet states no fee. No statutory or fee-schedule source was located in this review." No figure is recorded and none is quoted in the motion or the participant instructions; the field stays null.
- **feeWaiver** — source says: "The source review does not address a fee waiver." The source review does not address a fee waiver, so none is asserted and the field stays null.
- **waitingPeriod** — source says: "waitingPeriods: [] — the pinned entry records no waiting period for this route." No waiting period is recorded, so none is pleaded and the field stays null. The one-year bar on refiling after a denial is a separate stop condition, not a waiting period for a first motion.

## Open counsel flags

1. Automatic relief caution: DC has automatic record relief for some records, but processing is phased in and may not be complete until October 1, 2027. This workflow should not treat automatic relief as completed record clearing.
2. Prosecutor identity: Serve the correct prosecutor: the U.S. Attorney's Office for DC or the DC Office of the Attorney General, depending on the case.
3. Eligibility exclusions: Master Grid Group 1-3 felony convictions are not eligible for by-motion sealing.
4. Records scope: DC record relief reaches DC records, not federal records or records from other jurisdictions.
5. DC motion verification is a declaration under penalty of perjury; confirm the exact declaration/notarization form with counsel and current Superior Court practice.
6. BUILD BLOCKER carried from the pin: what expires on September 11, 2026, and which subsections of the sealing statute revert, is unresolved. The pin classifies this as a build blocker against the eligibility branch, on the basis that any temporary-law provision whose current applicability changes which motion route, waiting period or deadline applies is a true blocker. This packet is drafted to the subsection the pin names as this track's authority and must not be promoted past pleading_packet_rendered until that question is answered.
7. The movant must establish appearance before the proper official in the originating jurisdiction. That is the movant's own showing; the packet does not supply or argue it.
8. Sealed-record access nuance carried from the pin: records sealed as fugitive-from-justice arrests are not available to the licensing, school and childcare, and senior government employer entities the statute enumerates.
9. The court decides whether a hearing is required and may order a response; initial review may dismiss or deny. The prosecutor need not respond unless ordered. None of that is asserted in the motion.
10. A prior motion denied inside the one-year window is a self-help stop condition.
11. The pinned entry records no waiting period for this route, so none is pleaded and the waiting-period field is left null. A prior motion denied inside the one-year window is handled as a self-help stop condition, not as a waiting period.
12. Which office prosecutes a given case — the United States Attorney's Office for the District of Columbia or the District of Columbia Office of the Attorney General — and the correct service address for each are recorded in the pin as an unresolved release blocker. The certificate of service carries a confirm bracket rather than an address.
13. Current Criminal Division standing orders and post-March 2025 filing practice must be confirmed before filing; the pin records this as an unresolved release blocker. Clerk intake runs through the Criminal Division's sealing intake team.
14. The pinned packetSet for this track lists a single required component, the primary filing, and no proposed order. None is generated: the order is the court's own instrument and the pin does not place one in the participant's packet.
15. The court's instruction sheet states no fee for this motion and no statutory or fee-schedule source was located, so no figure is quoted and the fee field is left null. The source review does not address a fee waiver.
16. Self-help stop conditions: The prosecutor files an opposition or the court orders a response. The court sets a hearing. A victim submits a statement. The record is federal, military, tribal, or from another jurisdiction. Immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play. A prior motion was denied inside the one-year window.
17. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Build blockers carried from the pin

- (build_blocker, eligibility_branch) What expires on September 11, 2026, and which subsections of § 16-806 revert.

## Unresolved questions carried from the pin

- (build_blocker, eligibility_branch) What expires on September 11, 2026, and which subsections of § 16-806 revert.
- (release_blocker, notice_or_service) The rule for determining whether the U.S. Attorney's Office or the Office of the Attorney General is the prosecuting agency for a given case, and the correct service address for each.
- (release_blocker, filing_process) Current Chapter 8 standing orders and post-March 1, 2025 filing practice must be confirmed.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- legal_design_blocker: Open question blocks the build (eligibility_branch): What expires on September 11, 2026, and which subsections of § 16-806 revert.
- release_blocker: Open question blocks release (notice_or_service): The rule for determining whether the U.S. Attorney's Office or the Office of the Attorney General is the prosecuting agency for a given case, and the correct service address for each.
- release_blocker: Open question blocks release (filing_process): Current Chapter 8 standing orders and post-March 1, 2025 filing practice must be confirmed.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
