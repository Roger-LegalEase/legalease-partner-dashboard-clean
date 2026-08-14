# Handoff — Drug Court (ar-drug-court)

## Authority

- A.C.A. § 16-98-303
- ACIC drug court pre-adjudication and post-adjudication petition and order pairs

## Mechanism

Prosecutor concurrence or program completion is a prerequisite, not a reason to suppress the participant-facing filing.

Venue recorded: Statewide Arkansas program-specific process in the underlying criminal court; local program and prosecutor concurrence requirements may apply.
Destination recorded: The underlying criminal court (Local program and prosecutor concurrence requirements may apply at admission.)

## Route decision

Composed route, sequential. Two registry stages, expressed as 4 units: one participant-instruction unit, two official-form-dependency units for the ACIC petition-and-order pair, and one official-form-dependency unit for the conditional ACIC criminal-history authorization.

No pleading_document unit is drafted. Scope restriction on this track: "The ACIC uniform petition and order pair governs. Do not substitute a custom pleading where ACIC forms control."

Stage 1 stays guidance. Scope restriction on this track: "The prerequisite event may remain guidance, while the later participant filing is a packet product."

## Open counsel flags

- **ar-drug-court-official-form-not-acquired** — The ACIC drug court pre-adjudication and post-adjudication petition and order pairs has not been acquired. Any missing current ACIC form pair is a source-release gate.
  - Must confirm: Acquire the current official ACIC petition-and-order pair named in the track authority before any document is produced for this route.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].releaseBlockers[0]
- **ar-drug-court-objection-window** — Registry rules.notice for this track states a single 30-day prosecutor objection window; the profile filing instructions state 30 days for a misdemeanor and 90 days for a felony. This track covers both charge and conviction records, so the applicable window must be confirmed per record before any participant-facing deadline is published.
  - Must confirm: Which prosecutor objection window applies to this track's record types.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].rules.notice; profile:sourceSections[6] 'Filing instructions' lines 263-285
- **ar-drug-court-filing-fee-conflict** — The track rules state: “The source review does not state a filing fee for this petition.” The compiled profile states that Act 1460 eliminated sealing filing fees and lists the sealing petition filing fee as $0. No fee amount is asserted anywhere in this route; the conflict must be resolved before any fee statement is shown to a participant.
  - Must confirm: Whether a filing fee exists for this specific petition, and whether the Act 1460 fee elimination reaches this route.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].rules.fees; profile:packetGenerator.feeRules
- **ar-drug-court-fee-waiver-unstated** — The track rules state: “The source review does not address a fee waiver.” No fee-waiver procedure is asserted in this route.
  - Must confirm: Whether a fee waiver exists and what it requires, if a fee exists at all.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].rules.feeWaiver
- **ar-drug-court-notarization-conflict** — The track rules state: “The source review does not state a notarization requirement.” The same registry entry nevertheless lists a participant action of kind ‘notarize’ marked required before filing. No notarization instruction is asserted in this route until the conflict is resolved.
  - Must confirm: Whether the ACIC petition for this route must be notarized.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].rules.notarization; registry@3b6f4c1:tracks[ar-drug-court].packetSet.participantActionRequired[kind=notarize]
- **ar-drug-court-venue-and-court-identity** — Court name, county, division, docket number, judge and prosecuting attorney are left null in this route. The only sourced venue rule is: “Sealing is filed in the court that handled the case; a person with cases in several courts files in each. Venue is the court that handled the case — file separately in each county where the person has records.” The destination recorded for this track is “The underlying criminal court”.
  - Must confirm: That the participant's screening answers supply the court that handled the case, and that no court identity is prefilled from any other source.
  - Source: profile:sourceSections[6] 'Filing instructions' lines 263-285; registry@3b6f4c1:tracks[ar-drug-court].destination
- **ar-drug-court-legal-status** — Track legalStatus is ‘legal_review_pending’ and legalDesignStatus is ‘legal_design_approved_with_limitations’. Runtime is disabled: “Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.”
  - Must confirm: Output review, visual review and technical proof before this route leaves internal review.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].legalStatus / .legalDesignStatus / .runtimeDisabledReason
- **ar-drug-court-pair-selection** — Two different official pairs are named for this track (pre-adjudication and post-adjudication). The compiled profile's Required forms table lists only a ‘Pre-Adjudication Drug Court dismiss-and-seal’ pair. Pair selection turns entirely on the participant's answer to “Were you in drug court before adjudication, or after?”
  - Must confirm: Whether a distinct post-adjudication drug court pair exists and what it is called.
  - Source: registry@3b6f4c1:tracks[ar-drug-court].authority[1]; profile:sourceSections[5] 'Required forms' lines 220-262

## Blocked dependencies (mandatory official-form handoffs)

- ACIC drug court pre-adjudication and post-adjudication petition and order pairs — petition and proposed order. Not acquired. Exact missing source: current official PDF pair from the ACIC criminal-history forms index (https://dps.arkansas.gov/crime-info-support/arkansas-crime-information-center/forms/criminal-history/).
- ACIC Authorization for Review of Criminal History Information. Not acquired. Same index.

## F-review pointers

- Registry implementationQueue: F_source_problem
- Registry legalStatus: legal_review_pending; legalDesignStatus: legal_design_approved_with_limitations
- Runtime disabled reason: Imported from a legal-design memo. Output review, visual review and technical proof are all outstanding.
- Registry blockers:
  - [output_review_gate] Output review pending: counsel approved the design, not the produced document.
  - [visual_review_gate] Visual review not started.
  - [technical_proof_gate] Technical proof not started.
  - [release_blocker] Open question blocks release (correct_form): The ACIC drug court pre-adjudication and post-adjudication petition and order pairs has not been acquired. Any missing current ACIC form pair is a source-release gate.
  - [source_gate] One or more official sources have no recorded SHA-256, so staleness cannot be detected.

## Provenance

- Registry pin: 3b6f4c103d2f97249b45acc0ea3fb889ff8787e5 (data/record-clearing/legal-design-track-registry.json :: tracks[trackId=ar-drug-court])
- Compiled profile: src/lib/rcap-engine/compiled/profiles/AR-arkansas.json (sha256 2472302ba06713eab793ae06fc9fd9af8627993ce1b10bfba57a6e3894b9c9d3)
- State pack: src/lib/rcap/state-packs/arkansas/index.ts, src/lib/rcap/state-packs/arkansas/all50-build-metadata.ts
- Registry reviewedAsOf: 2026-07-30

## Dependency deferral correction candidate

- Candidate disposition: `exact_supported_deferral` for `ar-drug-court-records-authorization-0`, `ar-drug-court-primary-filing-2`, and `ar-drug-court-proposed-order-3`.
- Candidate data: each component directory contains `deferral-treatment.json` and `fixtures/canonical.json`, pinned to its dependency record and the correction assignment.
- Review marker: `candidate_ready_for_independent_review` applies only if the dependency-deferral verifier passes all three assigned components. This marker records correction-candidate readiness only.
