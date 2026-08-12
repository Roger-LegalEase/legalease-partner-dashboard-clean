# Handoff — dc_correct_misattributed_arrest (Lane C2)

## Authority

`D.C. Code § 16-806(g)` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/DC-district-of-columbia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Reuse of the coded DC pleading config

A DC pleading config already exists at `src/lib/record-clearing/dc-config.ts`. It is **reused as the source of these artifacts, not forked**. The generator imports that module and reads out its presentation block, its verification statute, its service note, its court caption and the counsel flags shared by both coded DC motion configs, then writes them into these data artifacts. Nothing from it is retyped, so the two cannot drift apart. `provenance.reusedCodedConfig` records the path, the file's sha256 at build time, and the exact list of reused fields; the build asserts that the coded verification statute is still null before proceeding.

What is **not** taken from it: the two coded configs cover `adult_motion_to_seal` and `adult_motion_to_expunge`, which are different tracks from this job's three. The per-track title, statutory authority, relief term, relief and order verbs, records scope, prohibited vocabulary, component inventory and counsel flags are drafted from this track's own pinned registry entry.

## Mechanism

An arrest attributed to the person who attests under oath that they were incorrectly identified or named, where the agency took no fingerprints at arrest and the arrested person presented no other reliable identification. Correction of publicly available records rather than sealing.

## Route decision

Motion rendered through the shared custom-pleading renderer, captioned to the Superior Court of the District of Columbia, Criminal Division. primaryReliefTerm is 'correction' and the closure vocabulary is prohibited outright, so the rendered motion cannot describe the relief in sealing terms even by way of contrast; that contrast is drawn in the participant instructions instead. The movant's sworn attestation of misidentification is pleaded as the movant's own, never as a supplied conclusion.

## Blocked components

None.

## Absent components (recorded, not omitted)

- **proposed_order** — The pinned packetSet for this track lists a single required component, the primary filing, and no proposed order. The order is the court's own instrument and none is generated.

## Negative fixture

The negative fixture asserts real invention, not a template-grade trip: invention:court_finding, invention:prosecutor_position, invention:fee_amount, invention:service_completed, invention:unsourced_citation, protected_field:populated. The verifier requires each signal to fire. `runPleadingQa` passes this document — it checks relief vocabulary, template grade, the required footer and seal markers, and cannot see a fabricated court finding, the prosecutor's position, an invented fee, completed service or a populated protected field (lane C1 finding 1).

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The movant signs and attests under oath. Notarization: The motion carries a sworn attestation. The source review does not state whether a notary is required in addition." The motion carries a sworn attestation but the source names no verification statute and does not state whether a notary is required in addition. The citation stays null.
- **filingFee** — source says: "The court's instruction sheet states no fee. No statutory or fee-schedule source was located in this review." No figure is recorded and none is quoted in the motion or the participant instructions; the field stays null.
- **feeWaiver** — source says: "The source review does not address a fee waiver." The source review does not address a fee waiver, so none is asserted and the field stays null.

## Open counsel flags

1. Automatic relief caution: DC has automatic record relief for some records, but processing is phased in and may not be complete until October 1, 2027. This workflow should not treat automatic relief as completed record clearing.
2. Prosecutor identity: Serve the correct prosecutor: the U.S. Attorney's Office for DC or the DC Office of the Attorney General, depending on the case.
3. Eligibility exclusions: Master Grid Group 1-3 felony convictions are not eligible for by-motion sealing.
4. Records scope: DC record relief reaches DC records, not federal records or records from other jurisdictions.
5. DC motion verification is a declaration under penalty of perjury; confirm the exact declaration/notarization form with counsel and current Superior Court practice.
6. This route corrects publicly available records; it does not close them. The vocabulary is enforced by qaProhibitedTerms, so the rendered motion cannot describe the relief in closure terms even by way of contrast. The contrast is drawn in the participant instructions instead, where it belongs.
7. The motion turns on a sworn attestation by the movant that they were incorrectly identified or named, together with the facts that the agency took no fingerprints at arrest and the arrested person presented no other reliable identification. The attestation is the movant's own; it is not supplied by the preparer.
8. The source records that the motion carries a sworn attestation but does not state whether a notary is required in addition. The packet directs the movant to confirm with the Criminal Division before filing.
9. Which office prosecutes a given case — the United States Attorney's Office for the District of Columbia or the District of Columbia Office of the Attorney General — and the correct service address for each are recorded in the pin as an unresolved release blocker. The certificate of service carries a confirm bracket rather than an address.
10. Current Criminal Division standing orders and post-March 2025 filing practice must be confirmed before filing; the pin records this as an unresolved release blocker. Clerk intake runs through the Criminal Division's sealing intake team.
11. The pinned packetSet for this track lists a single required component, the primary filing, and no proposed order. None is generated: the order is the court's own instrument and the pin does not place one in the participant's packet.
12. The court's instruction sheet states no fee for this motion and no statutory or fee-schedule source was located, so no figure is quoted and the fee field is left null. The source review does not address a fee waiver.
13. Self-help stop conditions: The prosecutor files an opposition or the court orders a response. The court sets a hearing. The record is federal, military, tribal, or from another jurisdiction. Immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play.
14. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Build blockers carried from the pin

- None.

## Unresolved questions carried from the pin

- (release_blocker, filing_process) Current Chapter 8 standing orders and post-March 1, 2025 filing practice must be confirmed.
- (release_blocker, notice_or_service) The rule for determining whether the U.S. Attorney's Office or the Office of the Attorney General is the prosecuting agency for a given case, and the correct service address for each.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- release_blocker: Open question blocks release (filing_process): Current Chapter 8 standing orders and post-March 1, 2025 filing practice must be confirmed.
- release_blocker: Open question blocks release (notice_or_service): The rule for determining whether the U.S. Attorney's Office or the Office of the Attorney General is the prosecuting agency for a given case, and the correct service address for each.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
