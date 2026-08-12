# LegalEase Nationwide Record-Clearing Review — Batch 2

## Research Resolution Memorandum — Adopted for Legal-Design Normalization

**Status:** Adopted by counsel  
**Version:** 1.0  
**Adoption date:** July 31, 2026  
**Research current through:** July 31, 2026  
**Distribution:** Confidential — LegalEase legal team and authorized reviewers  
**Purpose:** Resolve the legal-design questions identified in the supplied Batch 2 analysis and convert them into a controlling normalization and release framework. This is not final approval of any generated packet and is not consumer-facing legal advice.

## Controlling precedence

1. This adopted memorandum controls where it expressly changes a track's structure, output strategy, packet capability, scope treatment, blocker treatment, or node classification.
2. The original jurisdiction review remains controlling for all legal conclusions not expressly changed here.
3. Current official primary sources and official forms control source currency and runtime release.
4. Historical internal LegalEase references are reference-only and may not override this memorandum or the jurisdiction reviews.
5. The Georgia First Offender determination adopted on July 31, 2026 is incorporated into this memorandum and controls the Georgia L/M crosswalk.

## Executive conclusion
The Batch 2 research is usable. The principal defects are classification and product-model defects, not a need to discard or re-research all fourteen jurisdictions. This memorandum resolves the twelve priority issues, adds a controlling packet-only amendment, and converts remaining implementation uncertainties into specific release gates.
No Batch 2 route should be enabled merely because this memorandum approves its legal design. Each route remains disabled until the current primary source, form mapping, completed-output legal review, technical proof, and visual review pass.

## Priority issue resolution matrix
### 1. Louisiana — Track D — felony-conviction expungement omitted from the state memo’s final decision
**Resolution:** APPROVE WITH LIMITATIONS. The ordinary felony route is a participant-filed expungement proceeding under La. Code Crim. Proc. art. 978 and belongs in the build. Use Louisiana’s statutory/uniform expungement form set rather than a LegalEase-authored substitute. Treat eligibility exclusions, the completion date, intervening felonies, and any pending felony charge as routing or handoff issues. Do not tie this route to the separate automated-expungement project.
**Output strategy:** official_pdf_fill, with staged filing and agency-response instructions
**Implementation status:** Buildable; release gated on current uniform forms, exclusion mapping, fee/waiver rules, and completed-output review
**Primary authority:** La. Code Crim. Proc. arts. 978, 980–987; current Louisiana district-court expungement forms and instructions.
### 2. Minnesota — Track 11 — no explicit track-level legal-design decision
**Resolution:** APPROVE WITH LIMITATIONS. Track 11 is the main participant petition under Minn. Stat. §§ 609A.02, subd. 3, and 609A.03. It should be expressly classified as a statewide official-form packet. EXP102, EXP104, and EXP105 form the core packet. A custom pleading would create service and order-content risk without adding value.
**Output strategy:** official_pdf_fill
**Implementation status:** Buildable; attorney handoff for objections, contested hearings, disputed dispositions, registration, violence/firearm issues, crime-victim nexus theories, immigration, or requests to reach specially protected agencies
**Primary authority:** Minn. Stat. §§ 609A.02, subd. 3; 609A.03; Minnesota Judicial Branch forms EXP101–EXP105.
### 3. Indiana — Track 8 — output conflict for TRACK 8 - COLLATERAL ACTION EXPUNGEMENT
**Resolution:** RESOLVE TO CUSTOM_PLEADING FOR THE CURRENT BUILD. The official-form label should not be carried forward unless the actual current statewide form for this specific mechanism is acquired and verified. The governing law supplies the legal route; absence of a prescribed form does not eliminate the route. Use a statute-based petition with a local-form override. If a current Indiana Judicial Branch form is later verified, the renderer may be changed to official_pdf_fill without changing the track’s legal identity.
**Output strategy:** custom_pleading now; official_pdf_fill only after source verification
**Implementation status:** Buildable after counsel approves the specimen pleading and local filing instructions; no inference from a missing or secondary-source form reference
**Primary authority:** I.C. 35-38-9-0.5 and I.C. 35-38-9-9.5; Indiana Judicial Branch official forms/self-help catalog and current trial-court filing guidance.
### 4. Illinois — Track P — automatic cannabis relief and a participant motion were combined
**Resolution:** SPLIT INTO TWO RUNTIME TRACKS. Track P-A is the automatic cannabis-expungement process and produces guidance/status verification, not a paid court packet. Track P-B is the participant motion to vacate and expunge an eligible cannabis conviction and uses the Illinois Supreme Court-approved cannabis form suite. The mechanisms have different actors, triggers, forms, and outcomes and must not share one runtime ID.
**Output strategy:** P-A process_guidance; P-B official_pdf_fill
**Implementation status:** Approved. Run automatic/status verification before offering P-B.
**Primary authority:** 20 ILCS 2630/5.2(i); 410 ILCS 705/10-5; Illinois Supreme Court-approved Motion to Vacate and Expunge Eligible Cannabis Convictions forms.
### 5. Georgia — First Offender track structure and the separate retroactive-award route
**Resolution:** ADOPT FOUR DISTINCT MECHANISMS. Existing Track M remains separate from the three L-family mechanisms and is not superseded or mapped to a new L ID. The decisive routing question is: “Were you actually sentenced under Georgia's First Offender Act in the original case?”

L-1 — GA-FO-SENTENCING-POST2026: First Offender restriction and sealing at sentencing on or after July 1, 2026, governed by O.C.G.A. § 42-8-62.1(b). This occurs inside the active criminal case and is process_guidance / outside the ordinary LegalEase self-help packet scope.

L-2 — GA-FO-ACTIVE-PRE2026: The person was already sentenced under the First Offender Act before July 1, 2026; First Offender status was not revoked and there was no adjudication of guilt; the case is operationally active or the person has not yet been discharged. Governed by O.C.G.A. § 42-8-62.1(c)–(d). The prosecutor receives notice, not a request for consent. The statute directs the court to enter the restriction-and-sealing order within 90 days and does not create an objection-triggered hearing branch. Output strategy: custom_pleading.

L-3 — GA-FO-DISCHARGED-PRE2026: The person was already sentenced under the First Offender Act and was exonerated and discharged before July 1, 2026. Governed by O.C.G.A. § 42-8-62.2(c)–(f). The prosecutor receives notice, not a request for consent. The statute directs the court to enter the sealing order within 90 days and does not establish a contested-hearing branch. Output strategy: custom_pleading.

M — GA-RFO: The person received an ordinary conviction because First Offender treatment was never imposed, but asserts that they were eligible and not informed, or falls within the special 1968–1982 category. Governed by O.C.G.A. § 42-8-66. Advance prosecuting-attorney consent is a threshold requirement to file. Prosecutor silence is not consent. A hearing may occur only after a valid, consented-to petition is filed. Current product treatment: process_guidance with attorney or legal-aid handoff for the advance-consent process. No old-M-to-new-L mapping exists.

**Output strategy:** L-1 process_guidance/out of self-help; L-2 and L-3 custom_pleading; M remains a separate process_guidance/consent route unless counsel later approves a distinct post-consent packet stage.
**Implementation status:** Approved with the exact routing, notice, consent, and handoff rules above. A prosecutor objection on L-2 or L-3 may trigger the general LegalEase handoff policy, but does not create a different statutory relief track or an opposition/hearing branch.
**Primary authority:** O.C.G.A. §§ 42-8-62.1(b)–(d), 42-8-62.2(c)–(f), and 42-8-66; 2026 Georgia Laws, Act 403 (HB 162).
**Normalized IDs:** GA-FO-SENTENCING-POST2026; GA-FO-ACTIVE-PRE2026; GA-FO-DISCHARGED-PRE2026; GA-RFO unchanged.

| Normalized ID | Original First Offender status | Governing authority | Prosecutor role | Current output treatment |
|---|---|---|---|---|
| `GA-FO-SENTENCING-POST2026` | First Offender treatment imposed at sentencing on/after July 1, 2026 | § 42-8-62.1(b) | Active-case process | `process_guidance` / outside ordinary self-help |
| `GA-FO-ACTIVE-PRE2026` | First Offender treatment already imposed; pre-July 2026; active/not discharged | § 42-8-62.1(c)–(d) | Notice only | `custom_pleading` |
| `GA-FO-DISCHARGED-PRE2026` | First Offender treatment already imposed; pre-July 2026; discharged | § 42-8-62.2(c)–(f) | Notice only | `custom_pleading` |
| `GA-RFO` | First Offender treatment was never imposed; ordinary conviction | § 42-8-66 | Advance consent to filing required | `process_guidance` / attorney or legal-aid handoff |
### 6. Michigan — Track 4 — whether MC 227b is a packet product despite evidentiary complexity
**Resolution:** YES — PACKET-CAPABLE WITH A PARTICIPANT-FACING REVIEW INSTRUCTION AND HANDOFF LAYER. MC 227b is the participant's official application and establishes packet identity. LegalEase may complete neutral identifiers, conviction data, contact information, and a participant-authored factual statement. It must not invent the trafficking nexus, select disputed legal conclusions, draft advocacy to satisfy the burden of proof, or decide whether the narrative is sufficient.
**Output strategy:** official_pdf_fill
**Packet instruction:** The participant should have the trafficking-related factual narrative reviewed by an attorney or qualified advocate before filing.
**Scope restriction:** LegalEase does not write, assess, or approve the trafficking nexus or burden-of-proof argument.
**Post-generation handoff:** disputed victim status, opposition, an evidentiary or contested hearing, or a request for individualized advocacy.
**Generation treatment:** The review instruction does not create a document-upload requirement, LegalEase staff review, proof-of-review field, staff-approval status, or generation blocker.
**Implementation status:** Packet identified; product scope may be limited without relabeling the track as guidance-only.
**Primary authority:** MCL 780.621(3), 780.621d; SCAO forms MC 227b and MC 228b.
### 7. Montana — Track 3 — whether OCA Form A is a packet product while the participant is still serving the sentence
**Resolution:** YES — STAGED OFFICIAL-FORM PACKET. OCA MMRTA Form A is expressly designed for the currently-serving posture. That posture is a scope restriction and a substantive-choice warning, not a reason to downgrade the mechanism to guidance. LegalEase must not choose between expungement, misdemeanor resentencing, and civil-infraction resentencing or author a public-safety argument. After an expungement outcome, the participant must complete the separate DOJ CRISS stage.
**Output strategy:** staged/hybrid: official_pdf_fill for Form A, then process guidance/CRISS submission if expungement is granted
**Implementation status:** Approved; release gated on obtaining the current OCA certificate of service and proposed order and validating the offense taxonomy
**Primary authority:** Mont. Code Ann. § 16-12-113; Montana Supreme Court AF 22-0129; OCA MMRTA Form A (Rev. 12/21).
### 8. Kansas — Tracks D, E, and F — no settled output strategy; Track A branch structure
**Resolution:** THE SECOND PASS CLOSES THE LEGAL-DESIGN GAP. Track D (district-court arrest-record expungement under K.S.A. 22-2410) is a participant petition. Track E (municipal conviction/diversion expungement under K.S.A. 12-4516) and Track F (municipal arrest/nonconviction expungement under K.S.A. 12-4516a) are also participant petitions. Use custom pleadings where no current local form exists and yield to a court’s current local form when one is published. Separately split Track A into conviction and diversion runtime tracks because the triggering events and waiting-period logic differ even where the document suite overlaps.
**Output strategy:** D custom_pleading; E and F custom_pleading with local-form override; split A into two governed tracks
**Implementation status:** Kansas moves from jurisdiction-wide research hold to approved with limitations. Current Kansas Judicial Council forms, granting order, fees, and municipal local practice remain release gates.
**Primary authority:** K.S.A. 21-6614, 22-2410, 12-4516, and 12-4516a; current Kansas Judicial Council expungement forms.
### 9. Mississippi — Track 3 and Tracks 4–9 — HB 1546 and special statutory routes
**Resolution:** APPROVE THE CURRENT STATUTORY ROUTES; REPLACE THE PRE-HB 1546 LOGIC. HB 1546 amended Miss. Code § 99-19-71 effective July 1, 2026, so filings after that date must be screened against the amended text. First-offense DUI, controlled-substance conditional discharge, underage-alcohol relief, municipal/justice-court relief, nonadjudication, dismissal/nolle prosequi, and acquittal each have identifiable statutory paths. Most are custom-pleading or staged custom-pleading routes. Intervention-court relief is ordinarily court-administered at graduation and should begin as verification/process guidance rather than a default new petition.
**Output strategy:** custom_pleading for court-petition routes; staged for conditional discharge/nonadjudication; process_guidance for intervention-court implementation unless a local motion is required
**Implementation status:** Approved with limitations. Retire the Fourth Judicial District forms as statewide templates; use them only as local references.
**Primary authority:** 2026 Miss. Laws, HB 1546; Miss. Code §§ 99-19-71, 99-15-26, 21-23-7, 41-29-150, 63-11-30, Title 9 ch. 23, and the applicable underage-alcohol provisions.
### 10. Missouri — Track 8 — participant-facing output for identity-theft record correction
**Resolution:** OFFICIAL_PDF_FILL. CR300 is the statewide participant petition for correction of arrest/court records created through identity theft. It is distinct from CR301, which addresses mistaken identity. Keep the two routes separate, use the form matching the factual mechanism, and do not substitute a general § 610.140 expungement petition.
**Output strategy:** official_pdf_fill using current CR300; CR301 remains a separate official-form track
**Implementation status:** Approved; obtain and field-map the current OSCA PDFs before release
**Primary authority:** Mo. Rev. Stat. § 610.145; Missouri Courts forms CR300 and CR301.
### 11. Iowa — Track G — DCI criminal-history check listed as a relief track
**Resolution:** REMOVE FROM THE RELIEF-TRACK REGISTRY. A DCI criminal-history check retrieves and verifies records; it does not itself alter, seal, expunge, or correct a record. Retain it as a shared prerequisite/readiness action and as a post-relief verification step.
**Output strategy:** supporting process action, not a relief output strategy
**Implementation status:** Approved registry correction
**Primary authority:** Iowa Department of Public Safety, Division of Criminal Investigation criminal-history record-check process; governing Iowa relief statutes identified in the state review.
### 12. Maryland — Tracks 6 and 10 — form identity conflated with scope and geography
**Resolution:** TRACK 6: official statewide shielding packet using CC-DC-CR-148 with MDJ-008 and current instructions; the narrow eligible-offense list, lifetime petition rule, and court-of-conviction venue are scope/routing fields, not reasons to deny packet identity. TRACK 10: staged official-form route for police-record expungement. The participant first uses the agency process under Crim. Proc. § 10-103; when the statutory court application is available, DC-CR-071 is the District Court form. “DC” denotes Maryland District Court, not a District of Columbia geographic limitation. The route is statewide in authority but District-Court/agency specific in venue.
**Output strategy:** Track 6 official_pdf_fill; Track 10 staged process plus official_pdf_fill
**Implementation status:** Both packets identified. Product scope may remain narrow; verify current filing fee, revision dates, and the exact agency-denial/nonresponse trigger before release.
**Primary authority:** Md. Code, Crim. Proc. §§ 10-103, 10-103.1, 10-301–10-306; Md. Rules 4-503.3 and 4-503.4; forms CC-DC-CR-148, MDJ-008, and DC-CR-071.
## Controlling Batch 2 packet-only amendment
### Packet generation is not conditioned on third-party records
A criminal-history report, certified disposition, fingerprint card, prosecutor response, court certification, or agency approval is ordinarily a required-before-filing item or later process step. It is not a reason to suppress a paid packet unless the missing fact is indispensable to selecting the correct legal route and cannot responsibly be supplied by the participant.
### Participant facts may be captured; legal advocacy may not be invented
LegalEase may ask for and format the participant’s own facts. It may not create an interests-of-justice argument, rehabilitation claim, trafficking nexus, public-safety analysis, constitutional claim, or other case-specific legal conclusion.
### Third-party blocks remain blank
Judge, clerk, prosecutor, process-server, notary, law-enforcement, and agency blocks must remain blank unless the form expressly assigns the field to the participant.
### Packet identity is separate from product scope
The registry must separately store whether a participant-facing packet exists and whether LegalEase currently offers it. Specialized, high-risk, low-volume, or geographically narrow routes may be identified but disabled.
### Scope restrictions and handoffs do not erase packet identity
An active sentence, required hearing, discretionary standard, evidentiary burden, local filing practice, or likely objection is represented as a scope restriction, packet instruction, or handoff condition—not automatically as process_guidance.
### Automatic relief runs first
Where relief is automatic, agency-driven, or already completed by a one-time sweep, the system checks that status before offering a paid petition.
### Local forms override custom templates
A counsel-approved custom pleading is the statewide fallback only where the law permits a participant petition and no current mandatory or controlling local form is identified.
### All tracks default disabled
Approval of legal design is not release approval. Promotion requires the release gates in this memorandum.
## Additional issues resolved
### Louisiana automated-expungement implementation
The enabling law and ordinary motion routes can be described, but no paid or “automatic request” workflow should launch until an official Louisiana Supreme Court, Louisiana State Police, or administering-agency source confirms that the funded system is accepting and processing requests. Classify this as an operational release gate, not an unanswered question about the existence of Article 978 relief.
### Maine deferred disposition
Do not model successful deferred disposition as a standalone sealing remedy. It is a disposition-status/routing node. If the case ends in a reduced conviction, evaluate that conviction under Maine’s sealing statutes. If it ends in dismissal, do not promise confidentiality merely from the label “deferred disposition”; verify the final docket and the 16 M.R.S. § 703 classification.
### Massachusetts BMC consolidated filing
Treat the BMC multi-record procedure under Amended Standing Order 1-09 as a local packet variant of the ordinary G.L. c. 276, § 100C judicial-sealing track, not a separate statewide remedy. If no current BMC form is published, a counsel-approved custom consolidated petition may be used only for qualifying BMC records; otherwise use TC0057 per case.
### Missouri proposed automatic drug-expungement track
Do not release a track based on a passed bill, sponsor statement, or implementation projection. Require an official signed-act/chapter citation, current codified text, effective date, and administering-agency implementation notice. Until those are in the source bundle, keep the node disabled as legislative monitoring, not participant-facing relief.
### Packet identity versus commercial scope
For Maryland Track 10, Georgia Track M, Michigan Track 5, and similar specialized routes, store packet identity and product enablement as separate fields. A form or lawful pleading can be identifiable even when LegalEase elects not to sell or generate it.
## State-level disposition
Georgia: Approved with structural amendment. Split Track L into GA-FO-SENTENCING-POST2026, GA-FO-ACTIVE-PRE2026, and GA-FO-DISCHARGED-PRE2026; retain GA-RFO as a separate § 42-8-66 advance-consent route. L-2 and L-3 are notice-based, not consent- or opposition-hearing branches.
Illinois: Approved with structural amendment. Split Track P into automatic and participant-motion branches; use current statewide forms.
Indiana: Approved with source/output amendment. Track 8 defaults to custom pleading until a current track-specific statewide form is verified.
Iowa: Approved. Remove DCI check from relief count; retain as prerequisite/verification action.
Kansas: Approved with limitations. D–F now have packet strategies; split Track A; form/fee/local-practice checks remain release gates.
Louisiana: Approved with mixed release status. Approve ordinary felony route; keep unconfirmed automated implementation disabled.
Maine: Approved with registry correction. Deferred disposition is a status/routing node, not an independent relief track.
Maryland: Approved with scope/geography corrections. Track 6 and Track 10 are packet-identifiable; distinguish statewide authority from court/agency venue.
Massachusetts: Approved with local-variant correction. BMC consolidation is a local variant, not a new statewide remedy.
Michigan: Approved with packet/handoff correction. Track 4 is packet-capable; evidentiary complexity belongs in review/handoff fields.
Minnesota: Approved. Track 11 expressly approved as official-form packet; automatic routes run first.
Mississippi: Approved with current-law amendment. Apply HB 1546 effective July 1, 2026; special routes mapped; local Fourth District forms not statewide.
Missouri: Approved with one legislative hold. Track 8 is CR300 official form; proposed automatic-drug track stays disabled until enacted and implemented.
Montana: Approved with staged packet correction. Track 3 uses Form A; current-sentence posture is a scope restriction; obtain companion OCA forms.
## Proposed registry reconciliation
The supplied count of 136 source slots is not controlling. If counsel adopts the Illinois, Georgia, and Kansas splits, the normalized inventory contains 140 nodes. Five are best treated as supporting, local-variant, completed/verification, or routing nodes rather than live relief mechanisms, yielding a proposed 135 substantive relief mechanisms. The exact runtime count should be generated from the normalized registry, not hard-coded from the source memoranda.
Each normalized node must carry one of these node types: relief_track, supporting_action, routing_node, local_variant, or completed_or_verification. Only relief_track nodes count as substantive live relief mechanisms or paid-packet candidates.
The Georgia determination does not change the 140-node / 135-substantive-mechanism arithmetic: the original 136 source slots already included both Track L and Track M; splitting L adds two nodes, while GA-RFO remains separate and unchanged.
Illinois Track P: Split one source slot into two legal mechanisms (+1).
Georgia Track L: Split one source slot into three legal mechanisms (+2).
Kansas Track A: Split conviction and diversion branches (+1).
Iowa Track G: Reclassify as supporting record-retrieval/readiness node (non-relief).
Maine deferred-disposition track: Reclassify as disposition-status/routing node (non-relief).
Massachusetts Track 8: Reclassify as BMC local variant of ordinary judicial sealing (variant).
Maryland one-time cannabis sweep: Retain as completed/verification node rather than live participant relief (retired/verification).
Michigan completed-deferral status track: Retain as routing/disclosure node rather than new relief (non-relief).
## Mandatory release gates
Primary-source snapshot: Save the current statute/rule/bill and official form for the track, record the access date, and retain a checksum or immutable copy.
Form freshness: Confirm the revision printed on every participant-facing form on the date the track is promoted.
Eligibility map: Counsel approves the offense, disposition, waiting-period, completion, exclusion, prior-record, and pending-charge branches.
Packet field map: Every form field is classified as system-filled, participant-entered, manually completed later, or prohibited from automation.
Local-practice layer: Venue, filing method, fee, copy count, local addendum, e-filing availability, and clerk contact instructions are verified.
Completed-output legal review: Counsel reviews at least one clean sample and each high-risk fact pattern, not merely the blank source form.
Self-help stop test: Objection, contested hearing, disputed facts, immigration, registration, victim-nexus, and other handoff triggers are tested.
Technical/visual proof: PDF field placement, overflow, signatures, blank third-party blocks, pagination, attachments, and download integrity pass.
Version monitoring: The source is assigned an owner and a recheck cadence; legislation and official-form pages are monitored.
## Primary-authority index
All sources were researched or rechecked on official legislative, judicial, or agency sites through July 31, 2026. Secondary sources were not used to resolve a legal-design question where a primary source was available.
Georgia: Georgia General Assembly, HB 162 (2025–2026), Act 403; current O.C.G.A. §§ 42-8-62.1(b)–(d), 42-8-62.2(c)–(f), and 42-8-66; Georgia Courts/GCIC implementation materials.
Illinois: Illinois General Assembly, 20 ILCS 2630/5.2 and 410 ILCS 705/10-5; Illinois Courts approved cannabis expungement forms.
Indiana: I.C. 35-38-9-0.5 and I.C. 35-38-9-9.5; Indiana Judicial Branch expungement/self-help forms catalog and trial-court filing guidance.
Iowa: Iowa Department of Public Safety, Division of Criminal Investigation criminal-history record-check materials; current Iowa relief statutes/forms identified in the state review.
Kansas: Kansas Revisor of Statutes, K.S.A. 21-6614, 22-2410, 12-4516, 12-4516a; Kansas Judicial Council expungement forms.
Louisiana: Louisiana Legislature, Code of Criminal Procedure arts. 978 and 980–987; Louisiana Supreme Court/district-court uniform expungement forms; Louisiana State Police expungement materials.
Maine: Maine Office of the Revisor of Statutes, 16 M.R.S. § 703 and 15 M.R.S. ch. 310-A; Maine Judicial Branch forms and instructions.
Maryland: Maryland General Assembly, Criminal Procedure §§ 10-103, 10-103.1, and 10-301–10-306; Maryland Rules 4-503.3/4-503.4; Maryland Judiciary forms CC-DC-CR-148, MDJ-008, DC-CR-071.
Massachusetts: G.L. c. 276, § 100C; Commonwealth v. Pon, 469 Mass. 296 (2014); TC0057; Boston Municipal Court Amended Standing Order 1-09.
Michigan: Michigan Legislature, MCL 780.621 and 780.621d; Michigan SCAO forms MC 227b and MC 228b.
Minnesota: Minnesota Revisor of Statutes, §§ 609A.02 and 609A.03; Minnesota Judicial Branch forms EXP101–EXP105 and fee-waiver forms.
Mississippi: Mississippi Legislature 2026 HB 1546 signed/enrolled text; current Mississippi Code provisions cited in the Mississippi resolution; Mississippi court/agency guidance where available.
Missouri: Missouri Revisor of Statutes, § 610.145; Missouri Courts forms CR300 and CR301; official General Assembly bill-status materials for any proposed automatic-drug relief.
Montana: Montana Code Annotated § 16-12-113; Montana Supreme Court AF 22-0129; OCA MMRTA Form A and companion materials; DOJ CRISS instructions.
## Counsel adoption and implementation directive
Counsel adopts the controlling packet-only amendment and the twelve issue resolutions, subject to the corrected Georgia L/M structure incorporated above.
Counsel approves the specialized-route treatment for Michigan trafficking relief and Montana currently-serving participants, with Michigan review treated as a participant-facing instruction rather than a LegalEase verification workflow.
Counsel approves the Indiana Track 8 custom-pleading default and the Kansas local-form override.
Counsel confirms that Louisiana automated relief and any proposed Missouri automatic-drug route remain disabled until official operational authority is in the source bundle.
Implementation is directed to produce jurisdiction-specific normalized records and completed sample outputs for a second legal review. This adoption is legal-design approval, not packet readiness or runtime approval.
## Source-memo identification notes
Indiana Track 8 parsed identity: TRACK 8 - COLLATERAL ACTION EXPUNGEMENT. Controlling authority: I.C. 35-38-9-0.5 and I.C. 35-38-9-9.5.
Mississippi Track 1: Clearing a case that did not end in a conviction; authority: Miss. Code Ann. § 99-19-71(4). Parallel authority at § 99-15-26(5) for cases dismissed after nonadjudication..
Mississippi Track 2: Clearing a first misdemeanor conviction; authority: Miss. Code Ann. § 99-19-71(1)..
Mississippi Track 3: Clearing one felony conviction; authority: Miss. Code Ann. § 99-19-71(2)(a) and (2)(c). Restructured by 2019 HB 1352 (Laws 2019, ch. 466, § 34), which replaced a narrow seven-offense list with a general rule plus an exclusion list..
Mississippi Track 4: Clearing additional misdemeanors in city or justice court; authority: Miss. Code Ann. § 9-11-15(3) (justice court) and § 21-23-7(6) (municipal court)..
Mississippi Track 5: Cases where the court withheld your guilty plea; authority: Miss. Code Ann. § 99-15-26, with expungement at § 99-15-26(5)..
Mississippi Track 6: Clearing a first DUI; authority: Miss. Code Ann. § 63-11-30, first-offense DUI expungement provision..
Mississippi Track 7: Cases you resolved through a program; authority: Miss. Code Ann. § 99-15-123 (pretrial intervention) and § 9-23-23 (intervention courts, being drug courts, mental health courts, veterans courts, and other problem-solving courts as reorganized by 2019 HB 1352, § 9-23-5(c))..
Mississippi Track 8: First-time drug possession cases; authority: Miss. Code Ann. § 41-29-150, in particular the conditional discharge and expungement provisions..
Mississippi Track 9: Underage drinking charges; authority: Miss. Code Ann. § 67-3-70..
---

**End of adopted counsel review memorandum.**
