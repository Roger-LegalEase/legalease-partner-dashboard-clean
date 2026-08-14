# Handoff — ga-jail-k2 (Lane C2)

## Authority

`O.C.G.A. § 35-3-37(k)(2)`, `O.C.G.A. § 35-3-37(k)(1)` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/GA-georgia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Mechanism

An individual who has had criminal history record information restricted pursuant to § 35-3-37 may submit a written request to the appropriate county or municipal jail or detention center to have all records for the restricted offence maintained by that jail or detention center restricted. The facility must act within 30 days. Restriction at GCIC and sealing at the clerk do not reach the jail's own records, so this is a distinct submission to a distinct recipient.

## Route decision

Correspondence, not a pleading. Composed deterministically through the verifier's correspondence composer (documentForm: correspondence) because the registry route is a written request to a custodial facility with no court, no prosecutor, no clerk, no proposed order and no certificate of service. It still passes runPleadingQa, the placeholder scan, the protected-field scan and the invention detectors.

## Track-specific findings

Prior restriction of the offence is the statutory precondition and is delivered as a required-before-submission enclosure, not a generation gate. The facility's 30-day compliance clock runs from the request, so the instructions require a dated sending method and a day-31 follow-up. Scope is limited expressly to county and municipal jail and detention center records; private mugshot publishers and background-check vendors are named as out of reach.

## Blocked components

- **facility_published_request_form — BLOCKED.** Whether any Georgia county or municipal jail or detention center publishes its own required form or intake route for a restriction request under this subsection — which would govern over this generated letter — is recorded in the pin as a release-blocking open question against affectedElement correct_form. Exact missing source: a facility-published restriction-request form or written intake procedure. Issuing body: the county or municipal jail or detention center that holds the booking records. Where published: that facility's own records-unit publications; the pinned registry records no officialFormId and no officialSourceUrl for this component. Lane C2 does not draft official-form replicas; dependency lane D/E (official_pdf_fill) if such a form is located. Until it is resolved, the generated letter is the only available instrument and the instructions tell the sender to ask the facility whether it requires its own form.

## Absent components (recorded, not omitted)

- **verification** — No statutory wet-signature rule applies and notarization is none; the letter carries an ordinary signature block instead.
- **proposed_order** — No court is involved on this route. The request goes directly to the facility and no order is sought.
- **certificate_of_service** — No statutory service method exists and no court, prosecutor or clerk receives notice; certified mail is recommended in the instructions only so the sender has a record of the date.

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The participant signs the request. No statutory wet-signature rule applies. Notarization: none." No verification statute exists to cite for a written request to a facility, so the field stays null.
- **filingFee** — source says: "None identified." The source identifies no fee and quotes no figure; the field stays null and no figure appears in the letter or the participant instructions.
- **feeWaiver** — source says: "none — no fee is identified" No fee is identified, so no fee-waiver route exists to record; the field stays null.
- **waitingPeriod** — source says: "none stated in § 35-3-37(k)(2) — see the unresolved question on whether the request may be sent immediately or only after the § 35-3-37(k)(1) 30-day agency notification period has run" The subsection states no waiting period and the question of whether one applies in practice is an unresolved release blocker. The letter asserts no waiting period and the field stays null.

## Negative fixture

The negative fixture asserts real invention, not a template-grade trip. It fabricates 6 distinct signals — invention:court_finding, invention:prosecutor_position, invention:fee_amount, invention:service_completed, invention:unsourced_citation, protected_field:populated — and the verifier requires each to fire. This is the lane C1 finding: `runPleadingQa` checks relief vocabulary, template grade, the required footer and seal markers, and **passes** a document containing invented findings, fees, prosecutor positions and completed service. QA alone is not a negative.

## Open counsel flags

1. Georgia does not use "expungement" in the statute and has not since July 1, 2013. The two remedies are record restriction and sealing, and neither destroys the record. The packet must never tell a participant they may state the record does not exist.
2. A restriction or sealing may still be used to disqualify the participant from employment or office in the same manner as a first offender discharge, and does not supersede disclosure required by federal law.
3. This is correspondence to a custodial facility, not a court filing. No court, prosecutor or clerk receives notice, there is no proposed order and there is no certificate of service.
4. Prior restriction of the offence is the statutory precondition of the request. It is a required-before-submission item the participant proves by enclosure, not a condition of generating the letter, and the packet says so.
5. The facility must restrict access within 30 days of the request, so the packet tells the participant to follow up at day 31 and to send the request by a method that records the date.
6. The request reaches county and municipal jail and detention center records only. It does not reach private mugshot publishers or background-check vendors that already hold the data.
7. Whether any Georgia county or municipal jail or detention center publishes its own required form or intake route for this request — which would govern over this generated letter — is an unresolved release-blocking question. Recorded as a blocked component.
8. Offer this route as a standard follow-on step after the restriction and sealing routes: restriction at the Georgia Crime Information Center and sealing at the clerk do not automatically reach the jail's own records.
9. The source records the fee for this written request as "None identified." No figure is quoted anywhere in this packet and the fee field is left null.
10. The source records no fee-waiver route because no fee is identified; the fee-waiver field is left null.
11. The source records "The participant signs the request. No statutory wet-signature rule applies" and notarization: none, so verificationStatute.citation is left null and the letter carries an ordinary signature block.
12. Whether the written request may be sent as soon as the record is restricted, or only after the 30-day period for the record centre to notify the arresting agency has run, is an unresolved release-blocking question: the text imposes no waiting period while county prosecutor guidance describes sending the request 30 days after restriction. No waiting period is asserted in the letter and the field is left null.
13. Self-help stop conditions: The facility refuses the request or does not respond within 30 days. The offence has not in fact been restricted under § 35-3-37, in which case a restriction route comes first. The records the participant is concerned about are held by a private mugshot publisher or background-check vendor, which this route does not reach.
14. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Unresolved questions carried from the pin

- (release_blocker, waiting_period) Whether the § 35-3-37(k)(2) written request may be sent as soon as the criminal history record information is restricted, or only after the 30-day period in § 35-3-37(k)(1) for the center to notify the arresting agency has run. The text of (k)(2) imposes no waiting period; county prosecutor guidance describes sending the request 30 days after the record has been restricted.
- (release_blocker, correct_form) Whether any Georgia county or municipal jail or detention center publishes its own required form or intake route for a § 35-3-37(k)(2) restriction request, which would govern over the generated letter.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- release_blocker: Open question blocks release (waiting_period): Whether the § 35-3-37(k)(2) written request may be sent as soon as the criminal history record information is restricted, or only after the 30-day period in § 35-3-37(k)(1) for the center to notify the arresting agency has run. The text of (k)(2) imposes no waiting period; county prosecutor guidance describes sending the request 30 days after the record has been restricted.
- release_blocker: Open question blocks release (correct_form): Whether any Georgia county or municipal jail or detention center publishes its own required form or intake route for a § 35-3-37(k)(2) restriction request, which would govern over the generated letter.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
