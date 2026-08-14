# Handoff — ga-deaddocket-j3 (Lane C2)

## Authority

`O.C.G.A. § 35-3-37(j)(3)` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/GA-georgia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Mechanism

Where an individual's charged offence has remained on the dead docket for more than 12 months, the individual may petition the court in which the charged offence is pending to restrict access to criminal history record information for that charged offence. The court gives due consideration to the reason the offence was dead docketed, and shall not grant the petition if an active warrant is pending for the individual.

## Route decision

Petition rendered through the shared custom-pleading renderer in the pending criminal case in the court where the charge is pending. Proposed order and certificate of service included; notice to the prosecuting attorney.

## Track-specific findings

An active warrant is an absolute statutory bar ("the court shall not grant") and is asked directly and carried into the participant instructions as a stop condition. The instructions state expressly that a dead docket is not a dismissal and the case remains pending. The reason for the dead docketing is pleaded as the participant's own understanding; the packet does not supply or argue it.

## Blocked components

- **proposed_order_statutory_content — BLOCKED.** The source requires the order to also carry the OTN, the arrest date and the disclosure limits the statute permits. The shared custom-pleading renderer (src/lib/record-clearing/renderers/custom-pleading-renderer.ts) emits a fixed order body and cannot carry them; src/** is outside lane C2's owned paths. Exact missing capability: renderer support for order-level OTN, arrest-date and disclosure-limit clauses. Dependency lane: renderer contract change, not an official form. An order that does not name GCIC is not actionable; GCIC is named. The OTN and arrest date remain manual-completion items.

## Absent components (recorded, not omitted)

- **verification** — No verification and no notarization is required by statute on this route (registry rules.participantSignature and rules.notarization: none). The renderer's fixed section heading reads VERIFICATION but the body is an unsworn signed statement of truth with no penalty citation.

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The petitioner signs. No verification or notarization is required by statute. Notarization: none." No verification statute exists to cite on this route, so the field stays null and the signature block renders without a penalty citation.
- **filingFee** — source says: "No statutory filing fee is identified. Because the relief is a motion or petition in an existing criminal case rather than a new civil action, the leading Georgia pro se practice does not budget one. Unresolved and county-specific; no figure is quoted." No figure is recorded by the source and none is quoted in the pleading or the participant instructions; the field stays null.
- **feeWaiver** — source says: "Unresolved. The pauper's affidavit route under O.C.G.A. § 9-15-2 is designed for civil actions and its application to a filing in a criminal case is unresolved." No fee-waiver instrument is included because whether the civil pauper's affidavit practice reaches a criminal-case filing is unresolved; the field stays null.

## Negative fixture

The negative fixture asserts real invention, not a template-grade trip. It fabricates 6 distinct signals — invention:court_finding, invention:prosecutor_position, invention:fee_amount, invention:service_completed, invention:unsourced_citation, protected_field:populated — and the verifier requires each to fire. This is the lane C1 finding: `runPleadingQa` checks relief vocabulary, template grade, the required footer and seal markers, and **passes** a document containing invented findings, fees, prosecutor positions and completed service. QA alone is not a negative.

## Open counsel flags

1. Georgia does not use "expungement" in the statute and has not since July 1, 2013. The two remedies are record restriction and sealing, and neither destroys the record. The packet must never tell a participant they may state the record does not exist.
2. A restriction or sealing may still be used to disqualify the participant from employment or office in the same manner as a first offender discharge, and does not supersede disclosure required by federal law.
3. The court level is participant data and must never default to Superior Court: a state-law offence may have been tried in a State, Superior, Magistrate, Probate or Municipal court. The caption therefore carries a confirm bracket rather than a court name.
4. The filing is made in the existing criminal case under the existing case number, styled State of Georgia v. Defendant, in the court that handled the case. It is not a new civil action, is not captioned IN RE, and does not carry a Civil Action No.
5. No statewide Georgia judiciary form exists for this relief. Local courts control their own filing and e-filing practice, some clerks resist accepting motions in closed criminal cases, and some judges have standing preferences on proposed orders, so the packet instructs the participant to confirm the filing method with the clerk before filing.
6. An active warrant pending for the individual is an absolute statutory bar: the court shall not grant the petition. The packet asks the question directly and stops self-help where a warrant may be outstanding.
7. The case is still pending and has not been resolved. A participant who believes a dead docket is the same as a dismissal is wrong, and the packet copy says so.
8. The participant obtains the docket showing the date the charge was placed on the dead docket, which is what starts the 12 months.
9. The court gives due consideration to the reason the offence was dead docketed; LegalEase does not supply or argue that reason.
10. LegalEase prompts for and formats the participant's own account of what has changed and how the record has been a barrier. It does not write the interests-of-justice or privacy-harm narrative, does not assert that the participant is eligible or likely to succeed, and does not assert that a record will be erased, destroyed, deleted or expunged.
11. The source requires the proposed order to name the OTN and the arrest date, name GCIC and the county agencies by category, name the clerk and court, and limit disclosure to what the statute permits; an order that does not name GCIC is not actionable. The shared custom-pleading renderer emits a fixed order body that names the custodians but cannot carry the OTN, the arrest date or the disclosure limits, and renderer changes fall outside this lane's owned paths. Recorded as a blocked component.
12. The shared renderer's order preamble ("AND NOW, this ______ day of ...") and its fixed section heading "VI. VERIFICATION" are Pennsylvania-derived artefacts of the frozen renderer contract, not Georgia drafting choices. Both are visual- and counsel-review items.
13. No statutory filing fee is identified for a motion or petition filed in an existing Georgia criminal case, and whether any clerk charges one is county-specific and unresolved. No figure is quoted anywhere in this packet and the fee field is left null.
14. Whether the Georgia pauper's affidavit practice reaches a filing made in a criminal case is unresolved, so no fee-waiver instrument is included and the fee-waiver field is left null.
15. The source records no verification and no notarization requirement ("The petitioner signs. No verification or notarization is required by statute"; notarization: none), so verificationStatute.citation is left null. The signature block renders as an unsworn signed statement of truth carrying no penalty citation.
16. Self-help stop conditions: The prosecuting attorney opposes the filing. The court sets a contested hearing or takes evidence on disputed facts. Any immigration consequence is in play. The participant wants to attack the underlying conviction or charge itself. Venue is unclear because the trial court no longer exists or the records cannot be located. A warrant may be outstanding for the participant. The participant does not know why the case was dead docketed. The prosecuting attorney signals an intent to revive the case. Where self-help stops, route the participant to a Georgia record-clearing desk named by the Judicial Council's Access to Justice page.
17. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Unresolved questions carried from the pin

- (release_blocker, filing_process) Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- release_blocker: Open question blocks release (filing_process): Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
