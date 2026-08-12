# Handoff — Sealing After A Pardon (ar-pardon-seal)

## Authority

- A.C.A. § 16-90-1411
- ACIC Petition and Order to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender

## Mechanism

The existence of an official ACIC pardoned-offender petition and order pair means the sealing stage is not guidance-only. Obtaining the pardon remains guidance.

Venue recorded: Statewide Arkansas consequence of a pardon; sealing follows through the court/ACIC process after the pardon is granted.
Destination recorded: The court handling the sealing after the pardon (The pardon itself is a prerequisite event. The later sealing filing is a participant packet.)

## Route decision

Composed route, sequential. Two registry stages, expressed as 4 units: one participant-instruction unit, two official-form-dependency units for the ACIC petition-and-order pair, and one official-form-dependency unit for the conditional ACIC criminal-history authorization.

No pleading_document unit is drafted. Scope restriction on this track: "The ACIC uniform petition and order pair governs. Do not substitute a custom pleading where ACIC forms control."

Stage 1 stays guidance. Scope restriction on this track: "The prerequisite event may remain guidance, while the later participant filing is a packet product."

## Open counsel flags

- **ar-pardon-seal-official-form-not-acquired** — The ACIC Petition and Order to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender has not been acquired. Any missing current ACIC form pair is a source-release gate.
  - Must confirm: Acquire the current official ACIC petition-and-order pair named in the track authority before any document is produced for this route.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].releaseBlockers[0]
- **ar-pardon-seal-objection-window** — Registry rules.notice for this track states a single 30-day prosecutor objection window; the profile filing instructions state 30 days for a misdemeanor and 90 days for a felony. This track covers conviction records, including youthful felony offender adjudications, so the applicable window must be confirmed before any participant-facing deadline is published.
  - Must confirm: Which prosecutor objection window applies to this track's record types.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].rules.notice; profile:sourceSections[6] 'Filing instructions' lines 263-285
- **ar-pardon-seal-filing-fee-conflict** — The track rules state: “The source review does not state a filing fee for this petition.” The compiled profile states that Act 1460 eliminated sealing filing fees and lists the sealing petition filing fee as $0. No fee amount is asserted anywhere in this route; the conflict must be resolved before any fee statement is shown to a participant.
  - Must confirm: Whether a filing fee exists for this specific petition, and whether the Act 1460 fee elimination reaches this route.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].rules.fees; profile:packetGenerator.feeRules
- **ar-pardon-seal-fee-waiver-unstated** — The track rules state: “The source review does not address a fee waiver.” No fee-waiver procedure is asserted in this route.
  - Must confirm: Whether a fee waiver exists and what it requires, if a fee exists at all.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].rules.feeWaiver
- **ar-pardon-seal-notarization-conflict** — The track rules state: “The source review does not state a notarization requirement.” The same registry entry nevertheless lists a participant action of kind ‘notarize’ marked required before filing. No notarization instruction is asserted in this route until the conflict is resolved.
  - Must confirm: Whether the ACIC petition for this route must be notarized.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].rules.notarization; registry@3b6f4c1:tracks[ar-pardon-seal].packetSet.participantActionRequired[kind=notarize]
- **ar-pardon-seal-venue-and-court-identity** — Court name, county, division, docket number, judge and prosecuting attorney are left null in this route. The only sourced venue rule is: “Sealing is filed in the court that handled the case; a person with cases in several courts files in each. Venue is the court that handled the case — file separately in each county where the person has records.” The destination recorded for this track is “The court handling the sealing after the pardon”.
  - Must confirm: That the participant's screening answers supply the court that handled the case, and that no court identity is prefilled from any other source.
  - Source: profile:sourceSections[6] 'Filing instructions' lines 263-285; registry@3b6f4c1:tracks[ar-pardon-seal].destination
- **ar-pardon-seal-legal-status** — Track legalStatus is ‘legal_review_pending’ and legalDesignStatus is ‘legal_design_approved_with_limitations’. Runtime is disabled: “Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.”
  - Must confirm: Output review, visual review and technical proof before this route leaves internal review.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].legalStatus / .legalDesignStatus / .runtimeDisabledReason
- **ar-pardon-seal-pardon-prerequisite** — Self-help boundary on this track: “The participant has not yet obtained a pardon.” The route asserts nothing about how a pardon is obtained and prepares no pardon application.
  - Must confirm: That screening confirms a granted pardon and its date before the sealing filing is offered.
  - Source: registry@3b6f4c1:tracks[ar-pardon-seal].selfHelpBoundaries

## Blocked dependencies (mandatory official-form handoffs)

- ACIC Petition and Order to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender — petition and proposed order. Not acquired. Exact missing source: current official PDF pair from the ACIC criminal-history forms index (https://dps.arkansas.gov/crime-info-support/arkansas-crime-information-center/forms/criminal-history/).
- ACIC Authorization for Review of Criminal History Information. Not acquired. Same index.

## F-review pointers

- Registry implementationQueue: F_source_problem
- Registry legalStatus: legal_review_pending; legalDesignStatus: legal_design_approved_with_limitations
- Runtime disabled reason: Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.
- Registry blockers:
  - [output_review_gate] Output review pending: counsel approved the design, not the produced document.
  - [visual_review_gate] Visual review not started.
  - [technical_proof_gate] Technical proof not started.
  - [release_blocker] Open question blocks release (correct_form): The ACIC Petition and Order to Seal Records of a Pardoned Offender or Pardoned Youthful Felony Offender has not been acquired. Any missing current ACIC form pair is a source-release gate.
  - [source_gate] One or more official sources have no recorded SHA-256, so staleness cannot be detected.

## Provenance

- Registry pin: 3b6f4c103d2f97249b45acc0ea3fb889ff8787e5 (data/record-clearing/legal-design-track-registry.json :: tracks[trackId=ar-pardon-seal])
- Compiled profile: src/lib/rcap-engine/compiled/profiles/AR-arkansas.json (sha256 2472302ba06713eab793ae06fc9fd9af8627993ce1b10bfba57a6e3894b9c9d3)
- State pack: src/lib/rcap/state-packs/arkansas/index.ts, src/lib/rcap/state-packs/arkansas/all50-build-metadata.ts
- Registry reviewedAsOf: 2026-07-30
