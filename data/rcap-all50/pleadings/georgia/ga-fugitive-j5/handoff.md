# Handoff — ga-fugitive-j5 (Lane C2)

## Authority

`O.C.G.A. § 35-3-37(j)(5)`, `O.C.G.A. § 17-13-4` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/GA-georgia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Mechanism

Where an individual was arrested on a fugitive from justice warrant as provided in O.C.G.A. § 17-13-4, the individual may petition the superior court in the county where the arrest occurred to restrict access to criminal history record information for that warrant. Notice goes to the arresting law enforcement agency and the prosecuting attorney, a hearing is held within 90 days if requested, and the court shall grant the order if it determines the circumstances warrant restriction and the harm otherwise resulting to the individual clearly outweighs the public's interest in the information being publicly available.

## Route decision

Petition rendered through the shared custom-pleading renderer, captioned to the superior court of the county of arrest — the one route in this jurisdiction where the statute names the court expressly, so the caption fixes SUPERIOR COURT and brackets only the county. Proposed order and certificate of service included; the certificate names both the arresting agency and the prosecuting attorney.

## Track-specific findings

No waiting period is stated by the subsection. The packet states that Georgia restriction reaches Georgia records only and does not touch the demanding state's records or the FBI Identity History Summary. Extradition posture is not analysed.

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
6. This route names the superior court of the county of arrest expressly, unlike the routes that follow the accusing or convicting court.
7. Georgia restriction reaches Georgia records only. It does not touch the demanding state's records or the FBI Identity History Summary, and the packet says so.
8. LegalEase does not analyse the extradition posture, does not advise on the demanding state's case, and does not act on out-of-state records.
9. Attorney review is recommended before filing where the underlying extradition posture is unresolved. The recommendation is a participant-facing instruction and creates no upload, staff review, proof-of-review field or generation gate.
10. The certificate of service must name both the arresting law enforcement agency and the prosecuting attorney.
11. LegalEase prompts for and formats the participant's own account of what has changed and how the record has been a barrier. It does not write the interests-of-justice or privacy-harm narrative, does not assert that the participant is eligible or likely to succeed, and does not assert that a record will be erased, destroyed, deleted or expunged.
12. The source requires the proposed order to name the OTN and the arrest date, name GCIC and the county agencies by category, name the clerk and court, and limit disclosure to what the statute permits; an order that does not name GCIC is not actionable. The shared custom-pleading renderer emits a fixed order body that names the custodians but cannot carry the OTN, the arrest date or the disclosure limits, and renderer changes fall outside this lane's owned paths. Recorded as a blocked component.
13. The shared renderer's order preamble ("AND NOW, this ______ day of ...") and its fixed section heading "VI. VERIFICATION" are Pennsylvania-derived artefacts of the frozen renderer contract, not Georgia drafting choices. Both are visual- and counsel-review items.
14. No statutory filing fee is identified for a motion or petition filed in an existing Georgia criminal case, and whether any clerk charges one is county-specific and unresolved. No figure is quoted anywhere in this packet and the fee field is left null.
15. Whether the Georgia pauper's affidavit practice reaches a filing made in a criminal case is unresolved, so no fee-waiver instrument is included and the fee-waiver field is left null.
16. The source records no verification and no notarization requirement ("The petitioner signs. No verification or notarization is required by statute"; notarization: none), so verificationStatute.citation is left null. The signature block renders as an unsworn signed statement of truth carrying no penalty citation.
17. Self-help stop conditions: The prosecuting attorney opposes the filing. The court sets a contested hearing or takes evidence on disputed facts. Any immigration consequence is in play. The participant wants to attack the underlying conviction or charge itself. Venue is unclear because the trial court no longer exists or the records cannot be located. The underlying out-of-state matter is unresolved or the demanding state still seeks the participant. The participant is subject to a pending extradition demand. The out-of-state record itself is the participant's real concern, which Georgia restriction does not reach. Where self-help stops, route the participant to a Georgia record-clearing desk named by the Judicial Council's Access to Justice page.
18. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Unresolved questions carried from the pin

- (release_blocker, filing_process) Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- release_blocker: Open question blocks release (filing_process): Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
