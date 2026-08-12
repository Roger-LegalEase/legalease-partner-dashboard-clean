# Handoff — ga-fo-discharged-pre2026 (Lane C2)

## Authority

`O.C.G.A. § 42-8-62.2(c)`, `O.C.G.A. § 42-8-62.2(d)`, `O.C.G.A. § 42-8-62.2(b)`, `O.C.G.A. § 42-8-62.2(e)`, `O.C.G.A. § 42-8-62.2(f)`, `O.C.G.A. § 42-8-62.2(g)`, `O.C.G.A. § 42-8-60 et seq.`, `2026 Ga. Laws Act 403 (HB 162), § 4` — taken verbatim from the pinned registry entry at `3b6f4c103d2f97249b45acc0ea3fb889ff8787e5` and carried in `provenance.registryAuthority`. The compiled profile `src/lib/rcap-engine/compiled/profiles/GA-georgia.json` is pinned by sha256 in `provenance.fingerprint`. legalDesignStatus is `legal_design_approved_with_limitations`; legalStatus is `legal_review_pending`.

## Mechanism

Section 42-8-62.2, enacted by Act 403 and effective July 1, 2026, provides at (b) that at the time a defendant sentenced under the article has been exonerated and discharged without court adjudication of guilt, the court records shall be restricted. Subsection (c) provides that an individual who was exonerated of guilt and discharged, as a matter of law or pursuant to a court order, prior to July 1, 2026 may petition the court that granted such discharge for an order to seal and make unavailable to the public the criminal file, docket books, criminal minutes, final record, all other records of the court and the defendant's criminal history record information in the custody of the clerk of court, including within any index. Notice of the petition shall be sent to the clerk of court and the prosecuting attorney, and notice by registered or certified mail or statutory overnight delivery is sufficient. Under (d) the court shall order sealing within 90 days of the filing, with no findings required. The clerk seals within 60 days under (e), and under (f) the court shall also order law enforcement agencies, jails and detention centers to restrict, with compliance within 30 days.

## Route decision

Petition rendered through the shared custom-pleading renderer as a criminal petition in the existing case in the court that granted the discharge. Proposed order and certificate of service included; notice runs to the clerk of court and the prosecuting attorney.

## Track-specific findings

Relief is mandatory and no findings are required. The relief clause carries the statutory record list verbatim (criminal file, docket books, criminal minutes, final record, all other records of the court and the criminal history record information in the custody of the clerk of court, including within any index). The boundary fixture exercises the discharged-as-a-matter-of-law case where no discharge order exists to attach.

## Blocked components

- **proposed_order_statutory_content — BLOCKED.** The source requires the order to also carry the OTN, the arrest date and the disclosure limits the statute permits. The shared custom-pleading renderer (src/lib/record-clearing/renderers/custom-pleading-renderer.ts) emits a fixed order body and cannot carry them; src/** is outside lane C2's owned paths. Exact missing capability: renderer support for order-level OTN, arrest-date and disclosure-limit clauses. Dependency lane: renderer contract change, not an official form. An order that does not name GCIC is not actionable; GCIC is named. The OTN and arrest date remain manual-completion items.

## Absent components (recorded, not omitted)

- **verification** — No verification and no notarization is required by statute on this route (registry rules.participantSignature and rules.notarization: none). The renderer's fixed section heading reads VERIFICATION but the body is an unsworn signed statement of truth with no penalty citation.

## Recorded source silences

Every null below is a silence in the source, not a gap in the build. Each carries a quoted source statement and a counselFlag that also appears verbatim in `config.counselFlags`.

- **verificationStatute.citation** — source says: "The defendant signs the petition and the certificate of service. No verification or notarization is required by statute. Notarization: none." No verification statute exists to cite on this route, so the field stays null and the signature block renders without a penalty citation.
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
6. The prosecuting attorney receives notice of the petition. Notice is not a request for consent, there is no advance-consent gate on this route, and the packet must not describe one.
7. No objection-triggered statutory hearing branch is modelled, because current law does not create one. A prosecutor objection may trigger the general handoff policy, but it does not create a different statutory relief track or an opposition branch.
8. No privacy-harm or interests-of-justice narrative is generated or requested for this route: no findings are required and the order is mandatory within 90 days of a properly filed petition.
9. The packet states that the court shall order sealing within 90 days of filing, that the clerk then seals every document in its custody within 60 days, and that the court shall also order law enforcement agencies, jails and detention centers to restrict, with 30 days to comply after they receive a copy.
10. The Georgia Justice Project model petitions are a structural reference only. This is an independently drafted instrument, not a copy, and it is not represented as an official form.
11. Recorded non-blocking research note from the pin: the two First Offender petition sections overlap textually for a person already exonerated and discharged. The adopted memorandum allocates the discharged population to this route and the active or not-yet-discharged population to the other.
12. LegalEase prompts for and formats the participant's own account of what has changed and how the record has been a barrier. It does not write the interests-of-justice or privacy-harm narrative, does not assert that the participant is eligible or likely to succeed, and does not assert that a record will be erased, destroyed, deleted or expunged.
13. The source requires the proposed order to name the OTN and the arrest date, name GCIC and the county agencies by category, name the clerk and court, and limit disclosure to what the statute permits; an order that does not name GCIC is not actionable. The shared custom-pleading renderer emits a fixed order body that names the custodians but cannot carry the OTN, the arrest date or the disclosure limits, and renderer changes fall outside this lane's owned paths. Recorded as a blocked component.
14. The shared renderer's order preamble ("AND NOW, this ______ day of ...") and its fixed section heading "VI. VERIFICATION" are Pennsylvania-derived artefacts of the frozen renderer contract, not Georgia drafting choices. Both are visual- and counsel-review items.
15. No statutory filing fee is identified for a motion or petition filed in an existing Georgia criminal case, and whether any clerk charges one is county-specific and unresolved. No figure is quoted anywhere in this packet and the fee field is left null.
16. Whether the Georgia pauper's affidavit practice reaches a filing made in a criminal case is unresolved, so no fee-waiver instrument is included and the fee-waiver field is left null.
17. The source records no verification and no notarization requirement ("The petitioner signs. No verification or notarization is required by statute"; notarization: none), so verificationStatute.citation is left null. The signature block renders as an unsworn signed statement of truth carrying no penalty citation.
18. Self-help stop conditions: First Offender status was revoked and an adjudication of guilt was entered, so no exoneration and discharge occurred. No discharge was entered despite completed probation and the participant is unsure whether they were discharged as a matter of law. The participant is unsure whether they were sentenced as a first offender at all. The prosecuting attorney opposes the petition. The court sets a contested or evidentiary hearing. Any immigration consequence is in play. Where self-help stops, route the participant to a Georgia record-clearing desk named by the Judicial Council's Access to Justice page.
19. legalStatus is legal_review_pending and the pinned registry records output review, visual review and technical proof as outstanding. This packet is build output for review, not live routing.

## Unresolved questions carried from the pin

- (release_blocker, filing_process) Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.
- (nonblocking_research_note, eligibility_branch) As amended, § 42-8-62.1(c) reads on its face on anyone sentenced under the article before July 1, 2026 whose sentence was not revoked and adjudicated guilty, which textually includes a person already exonerated and discharged, while § 42-8-62.2(c) provides a petition specifically for a person exonerated and discharged before that date. The adopted memorandum allocates the discharged population to § 42-8-62.2 and the active or not-yet-discharged population to § 42-8-62.1(c), and the Georgia Justice Project publishes two separate model petitions on exactly that split.

## Review gates still open

- output_review_gate: Output review pending: counsel approved the design, not the produced document.
- visual_review_gate: Visual review not started.
- technical_proof_gate: Technical proof not started.
- release_blocker: Open question blocks release (filing_process): Whether a Georgia clerk charges a filing fee for a motion or petition filed in an existing criminal case, whether the O.C.G.A. § 9-15-2 pauper's affidavit practice reaches such a filing, and whether e-filing is available for a filing in a closed or pending criminal case. All three are county-specific and unresolved, and no figure may be quoted until they close.
- source_gate: One or more official sources have no recorded SHA-256, so staleness cannot be detected.
