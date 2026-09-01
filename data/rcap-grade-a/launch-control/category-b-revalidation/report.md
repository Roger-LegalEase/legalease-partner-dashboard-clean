# Category B Medium-Confidence Revalidation — 55-Row Hidden Participant Branch Audit

**Research current through:** August 30, 2026  
**Assignment commit:** `583e3d72581bd09f6a9d79b8dcc4ab631e1f952e`  
**Source snapshot:** `1b0ce4de0c56ce88853e53bbed42016e33a91227`  
**Source ledger blob:** `0673c2e3ca934ff7e20fd5abc3214eebf7bb6148`  

Only the 55 assigned route keys were reviewed. No unresolved legal-review queue, GPT synthesis, true-counsel queue, old Captain mapping queue, or guessed route was used.

## Executive conclusion

- **CONFIRM_B:** 3
- **CONVERT_ALL_TO_A:** 3
- **SPLIT_B_STAGE_AND_A_BRANCH:** 49
- **NEEDS_LEGAL_DECISION:** 0

The dominant defect is stage collapse: a genuine automatic or controlled stage was treated as the entire legal route even though current law preserves a participant petition, motion, agency application, correction, objection, hearing request, response, appeal, judicial review, or enforcement fallback.

## Classification rules applied

- A participant agency application is Category A even when the agency decides it.
- A participant court petition is Category A even when a judge decides it.
- A routine uncontested hearing does not make the route unsuitable for self-help.
- The contested branch stops at opposition, disputed facts, individualized advocacy, mandatory professional appearance, or appeal.
- Missing forms, unproven source identity, incomplete packets, unwired routes, unknown fees, missing court data, or incomplete testing are implementation defects, not Category B reasons.

## Row-by-row determinations

### 1. AK — Agency Confidentiality Of Non-Conviction Records

**routeKey:** `obligation:track-only:AK:ak-nonconviction-confidential`  
**jurisdiction:** AK  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** Alaska Stat. §§ 12.62.160(b)(8), 12.62.170, 12.62.180; 13 AAC 68.200 and 13 AAC 68.310.  
**officialProcessSource:**
- [Alaska Department of Public Safety — Background Checks and criminal-history correction](https://dps.alaska.gov/Statewide/Background-Checks/)
- [Alaska Legislature — Title 12 statutes](https://www.akleg.gov/basis/statutes.asp#12.62)
- [Alaska Legislature — 13 AAC 68 regulations](https://www.akleg.gov/basis/aac.asp#13.68)

**participantActionFound:** YES  
**participantInstrument:** Request to Correct Criminal Justice Information; Request for Final Administrative Decision after denial; and, for mistaken identity or false accusation, Request to Seal Criminal Justice Record.  
**filingActor:** The record subject.  
**destination:** Alaska Department of Public Safety, Criminal Records and Identification Bureau/Quality Assurance Unit; DPS forwards the request to the responsible contributing agency when needed.  
**trigger:** A nonconviction entry is inaccurate, incomplete, lacks the disposition that makes it confidential, remains publicly disseminated, or belongs to the person only because of mistaken identity or false accusation.  
**deadline:** No deadline for the initial correction or sealing request. A request for the commissioner’s final administrative decision must be made within 30 days after the repository’s written denial.  
**requiredComponents:** Identity and contact information; each disputed record item; the correction requested; case/arrest identifiers; signed attestation; supporting court or agency disposition; and proof of identity.  
**serviceOrNotice:** No adversarial service. DPS must decide or forward the request and give written notice of denial and review rights.  
**feeOrWaiver:** No correction or sealing filing fee is stated. A separate fee may apply to obtain a record copy.  
**selfHelpStop:** Stop after a final administrative denial, when identity or false-accusation facts are disputed, or when judicial review or damages are sought.  
**automaticOrControlledStage:** The confidentiality restriction follows the qualifying disposition and is implemented by DPS and other criminal-justice custodians without a petition.  
**participantFiledBranch:** A participant may affirmatively correct the record, seek final agency review, and request targeted sealing for mistaken identity or false accusation.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The confidentiality stage is legitimately agency-controlled, but the row suppresses a formal participant correction and review process. The automatic/controlled stage should remain B and the correction/sealing request should be a separate A branch.  

---

### 2. CA — Check whether your conviction was already relieved

**routeKey:** `obligation:track-only:CA:ca-auto-conviction`  
**jurisdiction:** CA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Cal. Penal Code § 1203.425; Cal. Penal Code §§ 11120–11127; applicable participant remedies including §§ 1203.4, 1203.4a, 1203.41 and 1203.42.  
**officialProcessSource:**
- [California DOJ — Automatic Record Relief](https://oag.ca.gov/fingerprints/automatic-record-relief-penal-code-sections-851.93-and-1203.425)
- [California DOJ — Record Review and BCIA 8706 correction](https://oag.ca.gov/fingerprints/record-review)
- [California Courts — Clean Your Record](https://selfhelp.courts.ca.gov/clean-your-record)

**participantActionFound:** YES  
**participantInstrument:** BCIA 8706 Claim of Alleged Inaccuracy or Incompleteness after DOJ record review; and the applicable superior-court petition for dismissal, reduction, sealing, or other relief.  
**filingActor:** The person whose record is involved, or counsel.  
**destination:** BCIA 8706 goes to the California DOJ Record Review Unit; court relief goes to the superior court that handled the conviction.  
**trigger:** The § 1203.425 notation is missing or wrong, or the person seeks broader relief than the limited automatic notation provides.  
**deadline:** No special limitations period for BCIA 8706. Court-petition timing depends on the selected remedy and sentence-completion requirements.  
**requiredComponents:** DOJ record-review response; BCIA 8706 identifying each disputed item; certified disposition or other proof; and, for court relief, the remedy-specific petition, case information, eligibility facts, and proposed order.  
**serviceOrNotice:** DOJ correction is administrative. Court notice and prosecutor service follow the governing petition statute and official form.  
**feeOrWaiver:** DOJ record review currently has a published fee and waiver route; the correction claim has no separate filing fee. Court fees, if any, are remedy-specific and ordinary fee-waiver procedures apply.  
**selfHelpStop:** Stop for a prosecutor block or opposition, disputed eligibility facts, a contested hearing, resentencing, or immigration/firearm consequences requiring individualized advice.  
**automaticOrControlledStage:** DOJ identifies electronic records and adds § 1203.425 relief notations without a participant petition.  
**participantFiledBranch:** The person may correct omitted or inaccurate DOJ data and may seek broader judicial relief through an applicable petition.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Automatic relief is a valid B stage, but it is not expungement and does not displace correction or court-petition remedies. The row must be split.  

---

### 3. CA — Check whether your arrest was already sealed

**routeKey:** `obligation:track-pathway:CA:ca-auto-arrest:tool-2-automatic-relief`  
**jurisdiction:** CA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Cal. Penal Code §§ 851.91 and 851.93, especially § 851.93(e); Cal. Penal Code §§ 11120–11127.  
**officialProcessSource:**
- [California DOJ — Automatic Record Relief](https://oag.ca.gov/fingerprints/automatic-record-relief-penal-code-sections-851.93-and-1203.425)
- [California Courts — Seal an Arrest](https://selfhelp.courts.ca.gov/clean-your-record/arrests)
- [Judicial Council form CR-409](https://www.courts.ca.gov/documents/cr409.pdf)

**participantActionFound:** YES  
**participantInstrument:** CR-409 Petition to Seal Arrest and Related Records, proposed order CR-410, and BCIA 8706 for a missing or inaccurate DOJ notation.  
**filingActor:** The arrested person, or counsel.  
**destination:** The superior court where the accusatory pleading was filed; if no pleading was filed, the superior court in the county of arrest. BCIA 8706 goes to DOJ.  
**trigger:** Automatic § 851.93 relief did not occur, the state record is inaccurate, or the person seeks the additional benefits of a judicial § 851.91 sealing order.  
**deadline:** No general outside limitations period for an eligible § 851.91 petition; file after the qualifying disposition/no-charge facts exist.  
**requiredComponents:** CR-409 case and arrest information, eligibility facts, declaration, supporting disposition records, proposed CR-410, and any record-review materials for a DOJ correction.  
**serviceOrNotice:** Notice to the prosecuting agency and law-enforcement agency as required by § 851.91 and the Judicial Council instructions; DOJ correction is administrative.  
**feeOrWaiver:** No statewide filing fee is identified for the standard CR-409 self-help route; ordinary fee-waiver procedures apply if a local charge is assessed. DOJ record-review fees have a waiver process.  
**selfHelpStop:** Stop for prosecution opposition, disputed identity or eligibility, multiple jurisdictions, or a contested hearing.  
**automaticOrControlledStage:** DOJ runs the electronic automatic-relief process under § 851.93.  
**participantFiledBranch:** Section 851.93(e) expressly preserves the judicial petition routes, and the participant can also correct DOJ data.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The cited saving clause and official CR-409 process make the hidden A branch explicit. The automatic stage remains B, but the route cannot remain undifferentiated.  

---

### 4. CO — Automatic Sealing, Arrest With No Charges Filed

**routeKey:** `obligation:track-only:CO:co_auto_seal_arrest`  
**jurisdiction:** CO  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Colo. Rev. Stat. §§ 24-72-704(1.5), 24-72-704(2), and related petition provisions in article 72.  
**officialProcessSource:**
- [Colorado Judicial Branch — Seal My Case](https://www.coloradojudicial.gov/self-help/seal-my-case)
- [Colorado Judicial Branch — JDF 417 arrest-record petition packet](https://www.coloradojudicial.gov/self-help/seal-my-case)

**participantActionFound:** YES  
**participantInstrument:** JDF 417 Petition to Seal Arrest Records with proposed JDF 418; JDF 419 is the notice/hearing order and JDF 435 the denial order.  
**filingActor:** The arrested person.  
**destination:** District court in the judicial district where the arrest occurred.  
**trigger:** No charges were filed and the arrest has not been sealed through the automatic process, or the person elects the official petition backstop.  
**deadline:** File when the no-charge waiting event specified by § 24-72-704 has occurred; the exact interval depends on the arrest/disposition facts.  
**requiredComponents:** JDF 417; arresting agency and arrest identifiers; date and location; statement that no charges were filed; eligibility facts; supporting no-filing proof; and proposed JDF 418.  
**serviceOrNotice:** Follow the Judicial Branch packet. The court provides or directs notice to the prosecuting authority and arresting agency and may set a hearing on JDF 419.  
**feeOrWaiver:** The separate civil petition carries the current district-court filing fee; JDF 205/JDF 206 fee-waiver procedures are available.  
**selfHelpStop:** Stop if the prosecutor or agency disputes the no-charge facts, identity or jurisdiction is contested, or a hearing requires factual advocacy.  
**automaticOrControlledStage:** CBI, court administration, prosecutors, and courts exchange data and seal qualifying uncharged arrests without a filing.  
**participantFiledBranch:** Colorado publishes JDF 417 as a participant petition when the automatic process has not delivered the result.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The existing reason is correct only for the automatic stage. The official self-help petition is a distinct Category A branch.  

---

### 5. CO — Automatic Sealing At Disposition, Non-Convictions

**routeKey:** `obligation:track-only:CO:co_auto_seal_nonconviction`  
**jurisdiction:** CO  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Colo. Rev. Stat. § 24-72-705(1) and the simplified-motion provisions in article 72.  
**officialProcessSource:**
- [Colorado Judicial Branch — Seal My Case](https://www.coloradojudicial.gov/self-help/seal-my-case)
- [Colorado Judicial Branch — JDF 477/JDF 478 simplified motion packet](https://www.coloradojudicial.gov/self-help/seal-my-case)

**participantActionFound:** YES  
**participantInstrument:** JDF 477 Motion to Seal Non-Conviction Records with proposed JDF 478; JDF 2363 hearing request when a statutory objection is filed.  
**filingActor:** The defendant or record subject.  
**destination:** The county or district court that handled the criminal case.  
**trigger:** An eligible nonconviction was not sealed at disposition, or the district attorney objected and the defendant must request a hearing.  
**deadline:** JDF 477 is available once the qualifying disposition is final. A JDF 2363 hearing request must be filed by the deadline stated in the objection notice and controlling statute.  
**requiredComponents:** Existing case caption and number; qualifying disposition; JDF 477 and JDF 478; supporting order; and, for JDF 2363, the objection notice and hearing grounds.  
**serviceOrNotice:** Filed in the criminal case. Court/prosecutor notice follows the statute and official forms.  
**feeOrWaiver:** The simplified nonconviction motion is treated as no-fee under the Judicial Branch process; use JDF 205/JDF 206 if a waivable charge is assessed.  
**selfHelpStop:** Stop when the prosecutor’s objection raises disputed facts, the disposition is ambiguous, or a contested hearing is required.  
**automaticOrControlledStage:** The court seals qualifying nonconvictions at disposition through the automatic process.  
**participantFiledBranch:** JDF 477 is the participant backstop, and JDF 2363 is the participant response/hearing branch after an objection.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The row itself references a simplified-motion backstop. It therefore must be split.  

---

### 6. CT — Records erased after a dismissal or a not guilty finding

**routeKey:** `obligation:track-only:CT:ct-nonconviction-auto`  
**jurisdiction:** CT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Conn. Gen. Stat. § 54-142a(a), (b), and (g); related record-correction and review provisions.  
**officialProcessSource:**
- [Connecticut General Assembly — § 54-142a](https://www.cga.ct.gov/current/pub/chap_961a.htm#sec_54-142a)
- [Connecticut Judicial Branch — Criminal Records and Erasure](https://jud.ct.gov/crimrecords.htm)

**participantActionFound:** YES  
**participantInstrument:** Petition under § 54-142a(b) for qualifying pre-October 1, 1969 cases; court-clerk/DESPP record-correction request for a modern erasure that was not implemented.  
**filingActor:** The accused or record subject, or counsel.  
**destination:** The court that disposed of the case and, for repository correction, DESPP/State Police Bureau of Identification.  
**trigger:** A not-guilty or dismissal disposition should be erased but remains public, or the case predates October 1, 1969 and requires a petition.  
**deadline:** No separate outside limitations period is stated for the pre-1969 petition; a correction request may be made when the missed erasure is discovered.  
**requiredComponents:** Case caption and docket; certified dismissal/acquittal; identity information; statutory basis; and the agency record showing the continuing entry.  
**serviceOrNotice:** The court and repository exchange erasure notices. Formal service follows court procedure if a contested petition is required.  
**feeOrWaiver:** No statutory filing fee is stated for the petition or status correction; ordinary indigency procedures apply if a fee is assessed.  
**selfHelpStop:** Stop for disputed disposition, statutory exceptions, mixed-count ambiguity, or judicial review.  
**automaticOrControlledStage:** Post-October 1, 1969 qualifying acquittals and dismissals are erased by operation of law.  
**participantFiledBranch:** Older cases require a petition, and a missed modern erasure can be affirmatively corrected.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The row merges a temporal automatic rule with a participant petition for older cases and a correction branch.  

---

### 7. CT — Clean Slate erasure for offenses from 2000 onward

**routeKey:** `obligation:track-pathway:CT:ct-cleanslate-auto:automatic-clean-slate-erasure-for-eligible-post-2000-convictions`  
**jurisdiction:** CT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Conn. Gen. Stat. §§ 54-142a(e) and 54-142t, as amended.  
**officialProcessSource:**
- [Connecticut Clean Slate — Official Portal](https://portal.ct.gov/cleanslate)
- [Connecticut General Assembly — § 54-142t](https://www.cga.ct.gov/current/pub/chap_961a.htm#sec_54-142t)
- [Connecticut Judicial Branch — JD-CR-202](https://jud.ct.gov/webforms/forms/CR202.pdf)

**participantActionFound:** YES  
**participantInstrument:** Application to DESPP for review of a conviction that should have been automatically erased, with contested-case hearing and judicial review; JD-CR-202 petition for qualifying pre-2000 convictions.  
**filingActor:** The person whose conviction is involved, or counsel.  
**destination:** DESPP/State Police for missed automatic erasure; Superior Court for the pre-2000 petition branch.  
**trigger:** An eligible post-2000 conviction remains unerased or an otherwise eligible conviction predates January 1, 2000.  
**deadline:** The DESPP application is available after the record should have been erased. Agency hearing and decision timing follows § 54-142t. The pre-2000 petition follows its statutory waiting rules.  
**requiredComponents:** Identity and conviction identifiers; explanation of eligibility; sentence-completion and docket information; supporting record; and, for JD-CR-202, all requested convictions and required certifications.  
**serviceOrNotice:** DESPP provides contested-case notice. Court-petition notice follows the Judicial Branch form and applicable prosecutor notice.  
**feeOrWaiver:** No fee is stated for the DESPP review application. Court fees, if any, are subject to Connecticut fee-waiver procedures.  
**selfHelpStop:** Stop for disputed offense classification, sentence completion, multi-count exclusions, contested agency hearing, or appeal.  
**automaticOrControlledStage:** State agencies identify and erase eligible post-2000 convictions through the Clean Slate data process.  
**participantFiledBranch:** Section 54-142t expressly creates a participant application and review route; JD-CR-202 covers the older petition cohort.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Connecticut expressly created an A application and hearing route for automation failures. The B stage cannot stand alone.  

---

### 8. CT — Records erased after finishing a diversionary program

**routeKey:** `obligation:track-pathway:CT:ct-diversion:automatic-non-conviction-erasure-under-conn-gen-stat-54-142a`  
**jurisdiction:** CT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Conn. Gen. Stat. § 54-142a(a) and the applicable diversion statutes, including §§ 54-56e, 46b-38c, 54-56g, and 54-56l.  
**officialProcessSource:**
- [Connecticut General Assembly — § 54-142a](https://www.cga.ct.gov/current/pub/chap_961a.htm#sec_54-142a)
- [Connecticut Judicial Branch — Diversionary Programs](https://jud.ct.gov/criminal/diversion.htm)

**participantActionFound:** YES  
**participantInstrument:** The participant’s program application or motion under the relevant diversion statute; after dismissal, a court/repository correction request if erasure is not implemented.  
**filingActor:** The accused, usually personally or through counsel.  
**destination:** The criminal court administering diversion; after dismissal, the disposing clerk and DESPP/State Police as needed.  
**trigger:** The person seeks admission to diversion, needs a program-related ruling, or completes diversion but the dismissal/erasure is not reflected.  
**deadline:** Program applications must be made at the procedural time fixed by the particular diversion statute, generally before final disposition. Correction follows the missed erasure.  
**requiredComponents:** Program-specific application; eligibility information; proof of successful completion and dismissal; docket/identity data; and documentation of the uncorrected record.  
**serviceOrNotice:** Program statutes govern State/victim notice and hearings. Post-dismissal correction is directed to the court/repository unless a contested proceeding is required.  
**feeOrWaiver:** Program fees vary by statute and may include waiver/indigency provisions. No separate fee is stated for correcting a missed erasure.  
**selfHelpStop:** Stop for opposed admission, victim-safety disputes, alleged program noncompliance, or a contested hearing affecting the criminal disposition.  
**automaticOrControlledStage:** After successful completion produces a qualifying dismissal, § 54-142a erasure is automatic.  
**participantFiledBranch:** The person ordinarily initiates the diversion application and may seek correction when the post-dismissal erasure fails.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The final erasure is automatic, but the route hides the participant application and correction branch.  

---

### 9. DC — Automatic Expungement

**routeKey:** `obligation:track-pathway:DC:dc_auto_expungement:dc_auto_expungement_16_802`  
**jurisdiction:** DC  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** D.C. Code §§ 16-802, 16-803, 16-804, and 16-806.  
**officialProcessSource:**
- [D.C. Code § 16-802](https://code.dccouncil.gov/us/dc/council/code/sections/16-802)
- [D.C. Code § 16-803](https://code.dccouncil.gov/us/dc/council/code/sections/16-803)
- [D.C. Courts — Criminal Records](https://www.dccourts.gov/services/criminal-matters/criminal-records)

**participantActionFound:** YES  
**participantInstrument:** Written motion to expunge on actual-innocence grounds under § 16-803; motion-based sealing under § 16-806 when applicable.  
**filingActor:** The person cited, arrested, or charged, or counsel.  
**destination:** Superior Court of the District of Columbia.  
**trigger:** The person seeks relief before or beyond the automatic process, or qualifies for actual-innocence expungement or motion-based sealing.  
**deadline:** The § 16-802 automatic program has its statutory implementation deadlines; an actual-innocence motion may be filed at any time. Motion-based sealing follows § 16-806 waiting rules.  
**requiredComponents:** Written motion stating the statutory ground and facts; identified records; optional memorandum, affidavits, exhibits, and supporting documents.  
**serviceOrNotice:** Serve the prosecutor. The court may order a response and hearing; deficient motions may be cured within the statutory period.  
**feeOrWaiver:** No filing fee is specified in the cited provisions; ordinary court waiver procedures apply if a charge is assessed.  
**selfHelpStop:** Stop for prosecutor opposition, disputed actual innocence, evidentiary hearing, or appeal.  
**automaticOrControlledStage:** The court must automatically expunge the categories listed in § 16-802.  
**participantFiledBranch:** Sections 16-803 and 16-806 preserve participant motions rather than requiring the person to wait exclusively for automation.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic stage is B, but D.C. separately authorizes participant motions with service, hearing, and appeal rights. A split is required.  

---

### 10. DC — Automatic sealing, non-convictions and 10-year misdemeanor convictions

**routeKey:** `obligation:track-pathway:DC:dc_auto_sealing:dc_auto_sealing_16_805`  
**jurisdiction:** DC  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** D.C. Code §§ 16-805, 16-806, and 16-807.  
**officialProcessSource:**
- [D.C. Code § 16-805](https://code.dccouncil.gov/us/dc/council/code/sections/16-805)
- [D.C. Code § 16-806](https://code.dccouncil.gov/us/dc/council/code/sections/16-806)
- [D.C. Courts — Criminal Records](https://www.dccourts.gov/services/criminal-matters/criminal-records)

**participantActionFound:** YES  
**participantInstrument:** Written motion to seal under D.C. Code § 16-806.  
**filingActor:** The person cited, arrested, charged, or convicted.  
**destination:** Superior Court of the District of Columbia.  
**trigger:** The person seeks earlier, broader, excluded, or missed sealing rather than relying solely on § 16-805 automation.  
**deadline:** Automatic sealing follows § 16-805. A participant motion follows the waiting period and eligibility rules in § 16-806.  
**requiredComponents:** All reasonably known unsealed citations, arrests, charges, and convictions; statutory ground; supporting facts and records.  
**serviceOrNotice:** Serve the prosecutor. The court may order response and hearing; statutory cure, renewal, and appeal procedures apply.  
**feeOrWaiver:** No fee is imposed by the cited statute; ordinary fee-waiver rules apply if the clerk assesses a fee.  
**selfHelpStop:** Stop for contested interests-of-justice findings, disputed history, prosecutor opposition, or appeal.  
**automaticOrControlledStage:** The court automatically seals qualifying nonconvictions and eligible ten-year misdemeanor convictions.  
**participantFiledBranch:** Section 16-806 provides a participant motion for earlier, broader, or missed relief.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The same chapter contains both the B automation stage and an A motion route.  

---

### 11. DE — Automatic Expungement

**routeKey:** `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a`  
**jurisdiction:** DE  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** 11 Del. C. §§ 4372, 4373, 4373A, and 4374.  
**officialProcessSource:**
- [Delaware Code — Title 11, Chapter 43, Subchapter VII](https://delcode.delaware.gov/title11/c043/sc07/)
- [Delaware State Police — Expungements and Pardons](https://dsp.delaware.gov/expungements-pardons/)
- [Delaware Courts — Expungement forms](https://courts.delaware.gov/forms/list.aspx?ag=Superior%20Court&cat=Expungement)

**participantActionFound:** YES  
**participantInstrument:** Mandatory-expungement application to the State Bureau of Identification under § 4373; discretionary-expungement petition to Superior Court or Family Court under § 4374.  
**filingActor:** The person whose record is sought to be expunged.  
**destination:** State Bureau of Identification for mandatory relief; Superior Court if any charge was disposed outside Family Court, otherwise Family Court, for discretionary relief.  
**trigger:** Automatic expungement has not occurred for a mandatory-eligible record, or the person seeks discretionary relief not covered by the automatic program.  
**deadline:** SBI’s monthly automatic process began August 1, 2024. The individual may apply after the applicable statutory eligibility period whenever automation has not occurred.  
**requiredComponents:** SBI application, identity data, case/disposition information, and required criminal-history materials; a § 4374 petition must attach the SBI criminal history and facts supporting manifest injustice.  
**serviceOrNotice:** No adversarial service for the SBI application. A § 4374 petition is served on the Attorney General, who may object and must address victim notice.  
**feeOrWaiver:** SBI and court filing/record fees follow the published schedules; indigency/fee-waiver procedures apply to court charges.  
**selfHelpStop:** Stop for disputed offense classification, multiple-case sequencing, an Attorney General objection, victim issues, manifest-injustice advocacy, or appeal.  
**automaticOrControlledStage:** SBI identifies and expunges mandatory-eligible cases through a monthly automated process.  
**participantFiledBranch:** Section 4373A expressly preserves the individual § 4373 application when automation fails; § 4374 supplies a court-petition branch.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Delaware’s law expressly preserves participant filings. The automatic stage is B, but a participant agency application is Category A.  

---

### 12. IL — Checking whether your old cannabis arrest was already cleared automatically

**routeKey:** `obligation:track-pathway:IL:il-cannabis-auto:cannabis-specific-automatic-or-petition-expungement`  
**jurisdiction:** IL  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** 20 ILCS 2630/5.2(a)(1)(G-5), (a)(2.5), (d), and (i); 410 ILCS 705/5-45 and 10-5.  
**officialProcessSource:**
- [Illinois General Assembly — 20 ILCS 2630/5.2](https://www.ilga.gov/documents/legislation/ilcs/documents/002026300K5.2.htm)
- [Illinois Courts — Expungement and Sealing forms](https://www.illinoiscourts.gov/forms/approved-forms/forms-approved-forms-circuit-court/expungement-sealing/)
- [Illinois State Police — Access and Review](https://isp.illinois.gov/CriminalHistory/IdentityHistorySummaryChecks)

**participantActionFound:** YES  
**participantInstrument:** Statewide Request to Expunge and Impound and/or Seal Criminal Records; ISP Access and Review challenge.  
**filingActor:** The person named in the record, or authorized counsel/legal-aid filer.  
**destination:** Circuit court with jurisdiction over the record; ISP and the originating agency for record correction.  
**trigger:** A qualifying cannabis record was not automatically cleared, falls into a petition-eligible cannabis category, or the person seeks broader court relief.  
**deadline:** No general outside deadline. File after the qualifying disposition and statutory waiting period, if any.  
**requiredComponents:** Approved statewide request; arrest/case/disposition information; identified custodians; notice forms; proposed order; and proof supporting any record challenge.  
**serviceOrNotice:** The clerk gives statutory notice to the State’s Attorney, arresting agency, ISP, and other required custodians. Objections can trigger a hearing.  
**feeOrWaiver:** Cannabis-specific relief may be fee-exempt in covered categories; otherwise circuit fees apply, with the statewide Application for Waiver of Court Fees.  
**selfHelpStop:** Stop for objections, mixed non-cannabis charges, conflicting records, a contested hearing, or appeal.  
**automaticOrControlledStage:** ISP and law-enforcement agencies automatically expunge qualifying minor-cannabis arrest/nonconviction records.  
**participantFiledBranch:** The statute preserves participant petitions and ISP record challenges.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** This row’s own route title says “automatic or petition.” It cannot remain wholly Category B.  

---

### 13. IL — Automatic sealing of Class 4 felony prostitution records by January 2028

**routeKey:** `obligation:track-pathway:IL:il-prostitution-j-auto:felony-prostitution-relief`  
**jurisdiction:** IL  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** 20 ILCS 2630/5.2(j), especially (j)(1)–(3), (j)(6), and (j)(8).  
**officialProcessSource:**
- [Illinois General Assembly — 20 ILCS 2630/5.2](https://www.ilga.gov/documents/legislation/ilcs/documents/002026300K5.2.htm)
- [Illinois Courts — Expungement and Sealing forms](https://www.illinoiscourts.gov/forms/approved-forms/forms-approved-forms-circuit-court/expungement-sealing/)

**participantActionFound:** YES  
**participantInstrument:** Motion to vacate and expunge a Class 4 felony prostitution conviction under § 5.2(j)(3).  
**filingActor:** The individual, counsel, a qualifying civil legal-aid agency, or the State’s Attorney.  
**destination:** The circuit court, Chief Judge, or a circuit judge designated by the Chief Judge.  
**trigger:** The sentence or conditions are complete and the individual seeks relief without waiting for the January 1, 2028 automatic-sealing deadline, or automation missed the record.  
**deadline:** The participant motion may be filed after completion of every sentence or condition. Automatic sealing must be completed by January 1, 2028.  
**requiredComponents:** Qualifying conviction, proof of sentence completion, age and age at offense, elapsed time, adverse consequences, and supporting rehabilitation/record information.  
**serviceOrNotice:** The State’s Attorney may object with supporting evidence within 60 days; the court may hold a hearing.  
**feeOrWaiver:** Ordinary circuit fees apply unless the clerk treats the statutory motion as fee-exempt; the statewide fee-waiver form is available.  
**selfHelpStop:** Stop for objection, offense-identity disputes, evidentiary hearing, or appeal.  
**automaticOrControlledStage:** ISP, local law enforcement, and circuit clerks must automatically seal eligible records by January 1, 2028.  
**participantFiledBranch:** The individual may move now to vacate and expunge after sentence completion.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The law creates both a future automatic branch and a present participant motion. Split.  

---

### 14. IN — Automatic clearing of a case that ended without a conviction

**routeKey:** `obligation:track-only:IN:in_auto_expungement`  
**jurisdiction:** IN  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Ind. Code § 35-38-9-1.  
**officialProcessSource:**
- [Indiana General Assembly — Title 35, Article 38, Chapter 9](https://iga.in.gov/laws/2026/ic/titles/35#35-38-9)
- [Indiana Legal Help — Expungement forms](https://indianalegalhelp.org/court-forms/forms-expungement/)

**participantActionFound:** YES  
**participantInstrument:** Verified petition for expungement under Ind. Code § 35-38-9-1.  
**filingActor:** The arrested or charged person.  
**destination:** The court where charges were filed; if no charge was filed, a court with criminal jurisdiction in the county of arrest.  
**trigger:** At least one year has elapsed after arrest/charge and no conviction resulted, or the automatic process did not clear the record.  
**deadline:** One year after the arrest or charge, unless the prosecuting attorney consents in writing to an earlier filing.  
**requiredComponents:** Verified petition stating the arrest/charge date, agency, court and case number if any, date of birth, identifying information, offenses, and disposition.  
**serviceOrNotice:** Serve the prosecuting attorney and state central repository as directed by statute and court procedure; objection/hearing rules apply.  
**feeOrWaiver:** No filing fee is charged for a petition under § 35-38-9-1; copy or service costs may remain.  
**selfHelpStop:** Stop for disputed disposition, early filing without prosecutor consent, mixed conviction/nonconviction records, or a contested hearing.  
**automaticOrControlledStage:** Qualifying post-June 30, 2022 nonconviction dispositions are expunged by the court without a petition.  
**participantFiledBranch:** The verified petition remains available for older, no-charge, excluded, or missed cases.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Indiana’s automatic duty is not exclusive. The petition branch is Category A.  

---

### 15. KY — Check whether your dismissed or acquitted Kentucky case already cleared itself

**routeKey:** `obligation:track-only:KY:ky_automatic_nonconviction_expungement_verification`  
**jurisdiction:** KY  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** KRS 431.076; Kentucky AOC forms 497.2 and 497.3.  
**officialProcessSource:**
- [Kentucky Court of Justice — Expungement](https://www.kycourts.gov/Legal-Help/Pages/Expungement.aspx)
- [Kentucky Court of Justice — Expungement forms](https://www.kycourts.gov/Legal-Forms/Legal%20Forms/Expungement/Pages/default.aspx)
- [Kentucky Legislature — KRS 431.076](https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50432)

**participantActionFound:** YES  
**participantInstrument:** AOC-497.2 or AOC-497.3 Petition for Expungement of a Non-Conviction; defendant objection to automatic expungement; notice to an agency that failed to comply.  
**filingActor:** The defendant or record subject.  
**destination:** The court where the charge was brought; an omitted agency receives the correction/order notice.  
**trigger:** The case is outside the automatic cohort, automation failed, a felony was not indicted within six months after grand-jury referral, or the defendant wishes to stop automatic expungement.  
**deadline:** Automatic expungement follows the statutory 30-day period for qualifying post-July 15, 2020 dispositions. Objection is due within 30 days. Notice to a noncomplying agency is due within 60 days after discovery. The no-indictment petition is available after six months.  
**requiredComponents:** Correct AOC petition, case and charge information, qualifying disposition or no-indictment proof, identity information, and supporting documentation.  
**serviceOrNotice:** The clerk/court transmits orders to agencies; the participant supplies the order and case identifiers to any omitted custodian.  
**feeOrWaiver:** Official court guidance states no filing fee for qualifying KRS 431.076 nonconviction petitions.  
**selfHelpStop:** Stop for disputed dismissal status, mixed dispositions, prosecutor contest, or a record mismatch that cannot be corrected administratively.  
**automaticOrControlledStage:** The court automatically expunges qualifying post-July 15, 2020 acquittals and dismissals after 30 days unless the defendant objects.  
**participantFiledBranch:** The defendant may petition, object, invoke the no-indictment route, and correct an agency omission.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Kentucky’s automatic scheme contains multiple participant actions. Split.  

---

### 16. KY — Work out what your diverted Kentucky case counts as

**routeKey:** `obligation:track-only:KY:ky_diversion_disposition_routing`  
**jurisdiction:** KY  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** KRS 533.250–533.258, especially KRS 533.258, and KRS 431.076.  
**officialProcessSource:**
- [Kentucky Legislature — KRS 533.258](https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=53212)
- [Kentucky Court of Justice — Expungement](https://www.kycourts.gov/Legal-Help/Pages/Expungement.aspx)

**participantActionFound:** YES  
**participantInstrument:** Motion or request to enforce/correct the successful diversion dismissal, followed by AOC-497.2 or AOC-497.3 when nonconviction expungement did not occur.  
**filingActor:** The diversion participant or counsel.  
**destination:** The court that approved and supervised diversion.  
**trigger:** The person completed diversion but the charge was not dismissed, the disposition is miscoded, or dismissal did not lead to the expected expungement.  
**deadline:** Promptly after the expected dismissal; the KRS 431.076 petition follows the applicable dismissal or no-indictment timing.  
**requiredComponents:** Diversion agreement, completion proof, case/disposition record, motion or written correction request, and the appropriate AOC petition if needed.  
**serviceOrNotice:** Notify/serve the Commonwealth’s Attorney under local criminal-motion practice; the clerk sends corrected orders to agencies.  
**feeOrWaiver:** No separate fee is identified for a corrective motion; qualifying KRS 431.076 nonconviction petitions are fee-free under official guidance.  
**selfHelpStop:** Stop if completion is disputed, the Commonwealth alleges a violation, the agreement is ambiguous, or an evidentiary hearing is required.  
**automaticOrControlledStage:** Upon successful completion, the court dismisses the charge and the case enters the nonconviction process.  
**participantFiledBranch:** The participant can enforce/correct the dismissal and petition if the record remains.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Disposition routing is not a valid reason to suppress the participant’s motion and petition branches.  

---

### 17. MD — Automatic clearing of police records after you were released without being charged

**routeKey:** `obligation:track-only:MD:md_10103_1_automatic`  
**jurisdiction:** MD  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Md. Code, Criminal Procedure §§ 10-103, 10-103.1, 10-106, and 10-107.  
**officialProcessSource:**
- [Maryland Code § 10-103.1](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-103.1)
- [Maryland Code § 10-103](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-103)
- [Maryland Judiciary — Expungement](https://www.mdcourts.gov/legalhelp/expungement)

**participantActionFound:** YES  
**participantInstrument:** Written police-record expungement request for pre-October 1, 2007 incidents under § 10-103; written compliance/correction request for a missed § 10-103.1 purge.  
**filingActor:** The arrested or confined person.  
**destination:** The law-enforcement unit that made the arrest or confinement; related correction may be directed to the Central Repository.  
**trigger:** The person was released without charge and the agency did not purge within 60 days, or the incident predates October 1, 2007.  
**deadline:** Automatic purge is due within 60 days for post-October 1, 2007 incidents. The § 10-103 request for an older incident must generally be submitted within eight years, subject to statutory exceptions.  
**requiredComponents:** Written request identifying the person, date/place, agency, facts showing release without charge, records sought, identity proof, and release/no-charge documentation.  
**serviceOrNotice:** No adversarial service. The agency investigates, expunges if verified, and notifies the Central Repository and known custodians.  
**feeOrWaiver:** No fee is stated for the request or automatic purge.  
**selfHelpStop:** Stop if the agency disputes that no charge was filed, the eight-year rule is contested, or judicial enforcement is required.  
**automaticOrControlledStage:** For post-October 1, 2007 incidents, the law-enforcement unit must purge within 60 days without a filing.  
**participantFiledBranch:** Older incidents require a written request; a missed modern purge can be affirmatively corrected.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The post-2007 stage is automatic, but Maryland retains a participant request/correction branch.  

---

### 18. MD — Clearing a case the State dropped before you were ever served

**routeKey:** `obligation:track-only:MD:md_10104_pre_service`  
**jurisdiction:** MD  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** Md. Code, Criminal Procedure §§ 10-104 and 10-105; Maryland Rule 4-601.  
**officialProcessSource:**
- [Maryland Code § 10-104](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-104)
- [Maryland Judiciary — Expungement](https://www.mdcourts.gov/legalhelp/expungement)
- [CC-DC-CR-072A Petition for Expungement](https://www.mdcourts.gov/sites/default/files/court-forms/ccdccr072a.pdf)

**participantActionFound:** YES  
**participantInstrument:** CC-DC-CR-072A Petition for Expungement and any required General Waiver and Release.  
**filingActor:** The person named as defendant or accused.  
**destination:** The court where the charging document was filed.  
**trigger:** The State entered a pre-service nolle prosequi but the court did not enter the § 10-104 order, or the person seeks relief under § 10-105.  
**deadline:** File after the disposition and any applicable waiting/waiver rule. The § 10-104 court order is not exclusive.  
**requiredComponents:** CC-DC-CR-072A, case/charge and disposition information, identified police/court records, contact information, and any required General Waiver and Release.  
**serviceOrNotice:** The clerk serves the State’s Attorney and relevant agencies under Rule 4-601. An objection can produce a hearing.  
**feeOrWaiver:** Maryland charges no filing fee for a criminal-record expungement petition.  
**selfHelpStop:** Stop for plea-agreement issues, State objection, ineligible companion charges, or disputed waiver consequences.  
**automaticOrControlledStage:** Section 10-104 permits the court to clear a pre-service nolle prosequi without a participant petition.  
**participantFiledBranch:** The accused may independently petition under § 10-105.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Court initiation is one branch, not the whole route.  

---

### 19. MD — Checking whether the one-time cannabis clearing already covered your case

**routeKey:** `obligation:track-only:MD:md_10112_dpscs_cannabis`  
**jurisdiction:** MD  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** Md. Code, Criminal Procedure §§ 10-105 and 10-112; Maryland Rule 4-601.  
**officialProcessSource:**
- [Maryland Code § 10-112](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-112)
- [Maryland Judiciary — Expungement](https://www.mdcourts.gov/legalhelp/expungement)
- [Maryland DPSCS — Criminal Justice Information System](https://dpscs.maryland.gov/publicservs/bgchecks.shtml)

**participantActionFound:** YES  
**participantInstrument:** CC-DC-CR-072A Petition for Expungement under § 10-105; DPSCS/CJIS record-correction request for a missed § 10-112 purge.  
**filingActor:** The person charged or convicted.  
**destination:** The court of disposition for the petition; DPSCS CJIS/Central Repository for correction.  
**trigger:** The cannabis-possession-only case was not removed by the July 1, 2024 purge, is independently eligible under § 10-105, or remains on the state record.  
**deadline:** The agency purge was due by July 1, 2024. A participant petition follows § 10-105 timing; correction should be requested after discovery.  
**requiredComponents:** Case number, charge/disposition, identity information, CC-DC-CR-072A and any waiver/release, plus a copy of the record showing the uncorrected entry.  
**serviceOrNotice:** The clerk gives statutory notice to the State’s Attorney and agencies. Administrative correction is directed to DPSCS.  
**feeOrWaiver:** No court filing fee for the expungement petition; a separate record-copy fee may apply.  
**selfHelpStop:** Stop for mixed charges, disputed eligibility, State objection, or DPSCS refusal requiring court action.  
**automaticOrControlledStage:** DPSCS was required to purge qualifying cannabis-possession-only cases by July 1, 2024.  
**participantFiledBranch:** The individual can petition the court and can correct the Central Repository record.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The one-time agency project does not eliminate ordinary participant relief.  

---

### 20. MD — Automatic clearing of a case that ended without a conviction

**routeKey:** `obligation:track-pathway:MD:md_10105_1_automatic:automatic-expungement-under-crim-proc-10-105-1`  
**jurisdiction:** MD  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Md. Code, Criminal Procedure §§ 10-105, 10-105.1, and 10-105.2; Maryland Rule 4-601.  
**officialProcessSource:**
- [Maryland Code § 10-105.1](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105.1)
- [Maryland Code § 10-105](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105)
- [Maryland Judiciary — Expungement](https://www.mdcourts.gov/legalhelp/expungement)

**participantActionFound:** YES  
**participantInstrument:** CC-DC-CR-072A Petition for Expungement and any required General Waiver and Release.  
**filingActor:** The person charged.  
**destination:** The court where the case was disposed.  
**trigger:** The person does not want to wait for the three-year automatic process, automation was missed, or the case requires the ordinary § 10-105 petition.  
**deadline:** Automatic expungement occurs three years after the covered favorable disposition. A person may petition earlier subject to the applicable waiting period or waiver.  
**requiredComponents:** CC-DC-CR-072A, case and charge details, qualifying disposition, identified custodians, and any required waiver/release.  
**serviceOrNotice:** The clerk serves the State’s Attorney and agencies. An objection may produce a hearing.  
**feeOrWaiver:** No filing fee for a Maryland criminal-record expungement petition.  
**selfHelpStop:** Stop for partial-expungement disputes, waiver consequences, State objection, or a contested hearing.  
**automaticOrControlledStage:** The court automatically expunges specified favorable dispositions after three years.  
**participantFiledBranch:** The person may petition sooner or after a missed automatic event.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The delayed automatic order is only one branch; the participant petition must remain Category A.  

---

### 21. ME — Cases resolved through a deferred disposition

**routeKey:** `obligation:track-only:ME:me-deferred`  
**jurisdiction:** ME  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** 17-A M.R.S. §§ 1901–1904; 15 M.R.S. § 2262(3); 16 M.R.S. § 703.  
**officialProcessSource:**
- [Maine Legislature — 17-A M.R.S. § 1902](https://legislature.maine.gov/statutes/17-a/title17-Asec1902.html)
- [Maine Legislature — 17-A M.R.S. § 1903](https://legislature.maine.gov/statutes/17-a/title17-Asec1903.html)
- [Maine Legislature — 17-A M.R.S. § 1904](https://legislature.maine.gov/statutes/17-a/title17-Asec1904.html)

**participantActionFound:** YES  
**participantInstrument:** Application or motion under § 1902 to modify, add, or obtain relief from deferred-disposition requirements; participation at the § 1903 final hearing; limited appeal under § 1904 after a finding of inexcusable noncompliance.  
**filingActor:** The person granted deferred disposition, personally or through counsel.  
**destination:** The court that ordered the deferred disposition; the Maine Law Court for an authorized appeal.  
**trigger:** A condition becomes impossible or unreasonably burdensome, final disposition is due, the State alleges a violation, or the court imposes sentence for inexcusable noncompliance.  
**deadline:** A motion concerning a condition should be filed during the deferment period. The final hearing occurs at the end of that period or sooner. Any appeal follows Maine appellate deadlines.  
**requiredComponents:** Case caption/docket; deferred-disposition order or agreement; challenged condition; facts showing inability or burden; requested relief; supporting records; and the appealed order/record if applicable.  
**serviceOrNotice:** The court gives notice to the State and participant before modification or final disposition. The participant has rights to evidence, confrontation, and counsel.  
**feeOrWaiver:** No separate statutory fee for a motion in the criminal case. Supervision fees may have been imposed based on ability; ordinary appellate costs and waivers apply.  
**selfHelpStop:** Stop for a contested violation hearing, plea-withdrawal issue, adverse sentencing, or appeal; appointed counsel rights may apply.  
**automaticOrControlledStage:** The court creates the deferred disposition and enters the final disposition upon completion.  
**participantFiledBranch:** The participant has an express statutory motion/application branch and a limited appellate response branch.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The route is not wholly court-initiated. Section 1902 expressly authorizes and sometimes requires participant motion practice.  

---

### 22. MI — Clearing fingerprints and an arrest card after a case ended in your favour

**routeKey:** `obligation:track-only:MI:mi_arrest_acquittal_dismissal`  
**jurisdiction:** MI  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** MCL 28.243(8)–(10), (14); MCL 769.16a.  
**officialProcessSource:**
- [Michigan Legislature — MCL 28.243](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-28-243)
- [Michigan Courts — MC 235](https://www.courts.michigan.gov/4a7f97/siteassets/forms/scao-approved/mc235.pdf)
- [Michigan State Police — Criminal History Record Corrections](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/criminal-history-record-corrections)

**participantActionFound:** YES  
**participantInstrument:** MC 235 Motion for Destruction of Biometric Data and Arrest Card; written correction request to the reporting agency or Michigan State Police.  
**filingActor:** The arrested person, or counsel.  
**destination:** The trial court for MC 235; the arresting/reporting agency and MSP Criminal Justice Information Center for correction.  
**trigger:** A qualifying acquittal, dismissal, or favorable disposition occurred but biometric data, arrest cards, or the criminal-history entry were not destroyed or corrected.  
**deadline:** No short filing deadline is stated; submit promptly after discovery of noncompliance.  
**requiredComponents:** MC 235 or written request; case and arrest identifiers; disposition; identity information; statutory basis; and supporting order/register of actions.  
**serviceOrNotice:** Provide notice to the prosecutor and affected custodian as directed by court/agency procedure. A granted order is transmitted to the agencies.  
**feeOrWaiver:** No separate fee ordinarily for MC 235 in the existing case or an administrative correction request; civil enforcement costs may have fee-waiver options.  
**selfHelpStop:** Stop for disputed disposition, an exclusion, identity conflict, or litigation to compel compliance.  
**automaticOrControlledStage:** Court and agency custodians have ministerial duties to destroy, return, or correct designated data after the qualifying outcome.  
**participantFiledBranch:** The person may file MC 235 and directly challenge an uncorrected criminal-history entry.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The favorable-disposition duty is automatic, but Michigan provides an explicit participant motion and correction path.  

---

### 23. MI — Clearing fingerprints and an arrest card when you were never charged

**routeKey:** `obligation:track-only:MI:mi_arrest_no_charge`  
**jurisdiction:** MI  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** MCL 28.243; MCL 769.16a; Michigan criminal-history correction procedures.  
**officialProcessSource:**
- [Michigan Legislature — MCL 28.243](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-28-243)
- [Michigan State Police — Criminal History Record Corrections](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/criminal-history-record-corrections)
- [Michigan Courts — MC 235](https://www.courts.michigan.gov/4a7f97/siteassets/forms/scao-approved/mc235.pdf)

**participantActionFound:** YES  
**participantInstrument:** Written correction/deletion request to the reporting agency and MSP; MC 235 or other judicial enforcement filing when a court order is required.  
**filingActor:** The person whose arrest record remains.  
**destination:** The arresting/reporting agency and MSP; the appropriate trial/circuit court for judicial enforcement.  
**trigger:** No charge was filed or prosecution was declined, but arrest data remains or is reported inaccurately.  
**deadline:** No short administrative deadline; submit when the no-charge status is established or the stale entry is discovered.  
**requiredComponents:** Identity/contact information; arrest date and agency; incident/tracking number; proof that no charge was filed; copy of the challenged record; fingerprints if needed.  
**serviceOrNotice:** Submit to the contributor and MSP. A court filing must serve the responsible custodian or prosecutor as required.  
**feeOrWaiver:** No fee for a correction request. Record, fingerprint, or civil-action costs may apply; court fee waivers are available.  
**selfHelpStop:** Stop if no-charge status or identity is disputed, the agency refuses correction, or civil enforcement becomes contested.  
**automaticOrControlledStage:** The arresting/reporting agency and MSP perform the statutory destruction or correction.  
**participantFiledBranch:** The person can initiate the correction/deletion request and seek enforcement.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Agency ownership of the data does not make the participant request Category B.  

---

### 24. MI — Lower-level misdemeanours that clear on their own

**routeKey:** `obligation:track-only:MI:mi_auto_misd92`  
**jurisdiction:** MI  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** MCL 780.621g(1), (3), and (5); MCL 780.621h; MCL 780.621 and 780.621d.  
**officialProcessSource:**
- [Michigan Legislature — MCL 780.621g](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-780-621g)
- [Michigan State Police — Automatic Set Asides](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/automatic-set-asides)
- [Michigan Courts — Expungement forms](https://www.courts.michigan.gov/SCAO-forms/expungement-forms/)

**participantActionFound:** YES  
**participantInstrument:** MSP missing-record/correction request; MC 227 Application to Set Aside Conviction when independently eligible.  
**filingActor:** The person convicted.  
**destination:** MSP for automatic-set-aside correction; the convicting court for an application.  
**trigger:** An eligible misdemeanor remains visible or the person seeks application-based relief rather than waiting for automation.  
**deadline:** Automatic timing follows MCL 780.621g. Application timing follows MCL 780.621d; no short correction deadline is stated.  
**requiredComponents:** Correction: identity, case, conviction, disposition, and proof. Application: MC 227, certified conviction record, fingerprints, criminal history, completion proof, and required notices.  
**serviceOrNotice:** Application packets are served on the Attorney General, prosecuting attorney, and MSP as required; objections/hearings may follow.  
**feeOrWaiver:** No charge to report a missed automatic set-aside. Application processing, fingerprints, and certified-copy costs may apply; waiver availability varies by charge.  
**selfHelpStop:** Stop for excluded offenses, disputed waiting period/completion, objection, or contested hearing.  
**automaticOrControlledStage:** The statewide process automatically sets aside eligible lower-level misdemeanors.  
**participantFiledBranch:** The participant can correct missed automation and file the ordinary application.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Automation is only the B stage; participant correction/application branches remain.  

---

### 25. MI — Higher-level misdemeanours that clear on their own

**routeKey:** `obligation:track-only:MI:mi_auto_misd93`  
**jurisdiction:** MI  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** MCL 780.621g(4), (5), and (10); MCL 780.621h; MCL 780.621 and 780.621d.  
**officialProcessSource:**
- [Michigan Legislature — MCL 780.621g](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-780-621g)
- [Michigan State Police — Automatic Set Asides](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/automatic-set-asides)
- [Michigan Courts — Expungement forms](https://www.courts.michigan.gov/SCAO-forms/expungement-forms/)

**participantActionFound:** YES  
**participantInstrument:** MSP correction/missing-case request; MC 227 Application to Set Aside Conviction.  
**filingActor:** The person convicted.  
**destination:** MSP for correction; the court of conviction for application-based relief.  
**trigger:** The automatic system omits an eligible misdemeanor or the participant seeks relief through the application route.  
**deadline:** Automation and application timing follow MCL 780.621g and 780.621d; no short correction deadline.  
**requiredComponents:** Identity and case proof for correction; MC 227 packet, certified record, fingerprints, criminal history, sentence-completion proof, and notices for an application.  
**serviceOrNotice:** Serve the prosecuting attorney, Attorney General, and MSP as required; the prosecutor may object.  
**feeOrWaiver:** No fee for a missed-automation report; statutory MSP, fingerprint, and copy costs may apply to an application.  
**selfHelpStop:** Stop for exclusions, disputed timing/completion, objection, or appeal.  
**automaticOrControlledStage:** The statewide system identifies and sets aside qualifying higher-level misdemeanors.  
**participantFiledBranch:** Correction and judicial application remain available.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The route must be split for the same reason as the lower-level misdemeanor track.  

---

### 26. MI — What a completed deferral means for clearing your record

**routeKey:** `obligation:track-only:MI:mi_deferral_status`  
**jurisdiction:** MI  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** Michigan deferral statutes including MCL 333.7411, 762.11–762.15, 769.4a, 436.1703, 600.1070, 600.1209, 750.350a, and 750.430; MCL 780.621(2), 780.621d(7)(d).  
**officialProcessSource:**
- [Michigan Legislature — MCL search](https://www.legislature.mi.gov/Laws/MCL)
- [Michigan State Police — Record Corrections](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/criminal-history-record-corrections)
- [Michigan Courts — Expungement forms](https://www.courts.michigan.gov/SCAO-forms/expungement-forms/)

**participantActionFound:** YES  
**participantInstrument:** Motion to enforce or correct the promised deferral disposition; administrative criminal-history correction request; MC 227 application if a conviction remains and is eligible.  
**filingActor:** The person who completed the deferral, or counsel.  
**destination:** The sentencing/diversion court; reporting agency/MSP; or court of conviction.  
**trigger:** Completion occurred but dismissal/nonpublic status was not entered or transmitted, or a conviction remains.  
**deadline:** Move promptly after completion or discovery; any MC 227 timing follows MCL 780.621d.  
**requiredComponents:** Deferral statute/agreement, order, completion and payment proof, docket, challenged record, and requested correction.  
**serviceOrNotice:** Notice to the prosecutor and affected custodians; normal application notice rules apply to MC 227.  
**feeOrWaiver:** No separate fee ordinarily for a corrective motion or MSP correction; application processing/fingerprint/copy costs may apply.  
**selfHelpStop:** Stop for disputed completion, alleged violation, plea/consent issues, refusal to correct, or appeal.  
**automaticOrControlledStage:** The court and agencies carry out dismissal, nonpublic status, or other deferral consequences after completion.  
**participantFiledBranch:** The participant can enforce/correct the outcome and seek application relief if necessary.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The controlled disposition stage does not eliminate the participant’s corrective motion and application.  

---

### 27. MI — Felony convictions that clear on their own

**routeKey:** `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g`  
**jurisdiction:** MI  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** MCL 780.621g(2), (5), and (10); MCL 780.621h; MCL 780.621 and 780.621d.  
**officialProcessSource:**
- [Michigan Legislature — MCL 780.621g](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-780-621g)
- [Michigan State Police — Automatic Set Asides](https://www.michigan.gov/msp/services/chr/conviction-set-aside-public-information/automatic-set-asides)
- [Michigan Courts — Expungement forms](https://www.courts.michigan.gov/SCAO-forms/expungement-forms/)

**participantActionFound:** YES  
**participantInstrument:** MSP correction/missing-case submission; MC 227 Application to Set Aside Conviction.  
**filingActor:** The person convicted.  
**destination:** MSP for correction; the convicting court for application relief.  
**trigger:** An eligible felony was not processed automatically, underlying data is wrong, or the participant seeks the application route.  
**deadline:** Automatic felony timing follows MCL 780.621g; application timing follows MCL 780.621d; no short correction deadline.  
**requiredComponents:** Correction proof or the full MC 227 packet with certified conviction, fingerprints, criminal history, completion proof, and notices.  
**serviceOrNotice:** Application notice to prosecutor, Attorney General, and MSP; objection/hearing procedures apply.  
**feeOrWaiver:** No fee for a correction report; application processing, fingerprint, and certified-copy costs may apply.  
**selfHelpStop:** Stop for excluded felonies, numeric-limit disputes, pending charges, disputed completion, objection, or appeal.  
**automaticOrControlledStage:** The state automatically sets aside a limited number of qualifying felony convictions after the statutory period.  
**participantFiledBranch:** A correction request and judicial application remain available.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic felony route must be split from the participant backstops.  

---

### 28. MN — Cannabis Expungement Board review of a felony cannabis record

**routeKey:** `obligation:track-only:MN:mn_ceb_felony_cannabis`  
**jurisdiction:** MN  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Minn. Stat. §§ 609A.055–609A.06; 2023 Minn. Laws ch. 63.  
**officialProcessSource:**
- [Minnesota Cannabis Expungement Board](https://mn.gov/ceb/)
- [Minnesota Cannabis Expungement Board — Case Review Request](https://mn.gov/ceb/case-review-request/)
- [Minnesota Revisor — § 609A.06](https://www.revisor.mn.gov/statutes/cite/609A.06)

**participantActionFound:** YES  
**participantInstrument:** Cannabis Expungement Board Case Review Request; where independently available, a district-court petition under Minn. Stat. § 609A.03.  
**filingActor:** The person with the felony cannabis record, or authorized representative.  
**destination:** Cannabis Expungement Board; district court in the county of disposition for a judicial petition.  
**trigger:** The Board has not reviewed the case, the participant believes the record/eligibility data is wrong, or judicial expungement is independently available.  
**deadline:** No fixed deadline stated for a Case Review Request; a judicial petition follows Chapter 609A timing/notice rules.  
**requiredComponents:** Identity, contact information, court/county, file and conviction details, explanation, and supporting records; statutory petition materials if using court.  
**serviceOrNotice:** The Board obtains information under § 609A.06. A court petition requires statutory notice to agencies and the prosecutor.  
**feeOrWaiver:** No fee for the Board request. A court petition may carry a civil filing fee with a fee-waiver route.  
**selfHelpStop:** Stop for resentencing, public-safety issues, disputed facts, prosecutor objection, or contested hearing.  
**automaticOrControlledStage:** The Board conducts baseline review of eligible felony cannabis records without an application.  
**participantFiledBranch:** The official Board accepts a participant Case Review Request, and Chapter 609A may permit a court petition.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** An agency application is Category A even though the Board makes the decision.  

---

### 29. MN — Destroying fingerprints and photographs taken under someone else's identity

**routeKey:** `obligation:track-only:MN:mn_mistaken_identity_iddata`  
**jurisdiction:** MN  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Minn. Stat. § 299C.11; related BCA record-challenge provisions.  
**officialProcessSource:**
- [Minnesota Revisor — § 299C.11](https://www.revisor.mn.gov/statutes/cite/299C.11)
- [Minnesota BCA — Criminal History](https://dps.mn.gov/divisions/bca/bca-divisions/administrative-services/criminal-history)
- [Minnesota Judicial Branch — Criminal Expungement](https://www.mncourts.gov/Help-Topics/Criminal-Expungement.aspx)

**participantActionFound:** YES  
**participantInstrument:** Written demand under § 299C.11 for return/destruction of identification data; BCA criminal-history challenge; Chapter 609A petition if judicial relief is separately needed.  
**filingActor:** The person whose identity or biometric data was wrongly associated.  
**destination:** The holding law-enforcement agency and BCA; district court for a judicial petition.  
**trigger:** The person was booked under another identity, was not the person charged, or remains linked to the wrong record.  
**deadline:** No short limitations period for the demand or BCA challenge; submit promptly after discovery.  
**requiredComponents:** Written demand, government ID, fingerprints if needed, arrest/case identifiers, proof of mistaken identity, and copy of the challenged record.  
**serviceOrNotice:** Submit to the originating agency and BCA. A court petition requires statutory agency/prosecutor notice.  
**feeOrWaiver:** The statutory identity check/challenge is not a paid expungement application; court fees and waiver rules apply to any separate petition.  
**selfHelpStop:** Stop when identity is disputed, forensic comparison is needed, another person’s privacy is implicated, or contested litigation is required.  
**automaticOrControlledStage:** The agency must destroy or return data once mistaken identity is established.  
**participantFiledBranch:** The affected person can demand action and challenge the BCA record.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The custodian performs deletion, but the participant can initiate it.  

---

### 30. MN — Records that clear automatically after a pardon

**routeKey:** `obligation:track-only:MN:mn_pardon_auto_expungement`  
**jurisdiction:** MN  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Minn. Stat. § 609A.035; Minn. Stat. §§ 638.01–638.18.  
**officialProcessSource:**
- [Minnesota Revisor — § 609A.035](https://www.revisor.mn.gov/statutes/cite/609A.035)
- [Minnesota Board of Pardons](https://mn.gov/pardons/)

**participantActionFound:** NO  
**participantInstrument:** None for the post-pardon expungement stage. The pardon application is a separate antecedent clemency route.  
**filingActor:** No participant filing actor after the qualifying pardon is granted.  
**destination:** The district court and official record custodians identified by the pardon and statutory process.  
**trigger:** The Board of Pardons grants a pardon that receives the statutory post-pardon expungement consequence.  
**deadline:** No participant petition deadline for this stage; responsible officials must implement the post-pardon duties.  
**requiredComponents:** No participant packet. Guidance should tell the person to retain the pardon and sealing/expungement orders and verify each affected case.  
**serviceOrNotice:** Official notice and transmission are handled by the Board, court, and custodians.  
**feeOrWaiver:** No participant filing fee for the post-pardon automatic stage.  
**selfHelpStop:** Handoff if the pardon’s scope is disputed, an agency refuses the order, an omitted case must be litigated, or enforcement becomes necessary.  
**automaticOrControlledStage:** After the qualifying pardon, the statute directs expungement without a petition.  
**participantFiledBranch:** None within this narrowly defined post-pardon stage; keep the separate pardon application route distinct.  
**finalDecision:** `CONFIRM_B`  
**rationale:** The row is expressly scoped to what happens after a pardon. That post-pardon stage is genuinely automatic and should remain Category B with verification/correction guidance.  

---

### 31. MO — Drug records that clear themselves

**routeKey:** `obligation:track-pathway:MO:mo-610-141-automatic-drug:state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141`  
**jurisdiction:** MO  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Mo. Rev. Stat. §§ 610.141, 610.143, and 610.144, enacted by CCS SS SB 1421 (2026); existing petition remedy in § 610.140.  
**officialProcessSource:**
- [Missouri Senate — SB 1421 (2026)](https://www.senate.mo.gov/26info/BTS_Web/Bill.aspx?SessionType=R&BillID=3688195)
- [Missouri Courts — Expungement Forms](https://www.courts.mo.gov/page.jsp?id=172712)
- [Missouri Revisor — Chapter 610](https://revisor.mo.gov/main/OneChapter.aspx?chapter=610)

**participantActionFound:** YES  
**participantInstrument:** Petition for Expungement under § 610.140 using the Missouri approved expungement petition; correction request to the State Highway Patrol/court if a qualifying record is omitted from the automatic program.  
**filingActor:** The person named in the record.  
**destination:** Circuit court in a county where the petitioner was charged or found guilty; record correction to the Missouri State Highway Patrol Criminal Justice Information Services Division and originating court.  
**trigger:** The new automatic system has not processed an eligible drug record, the record data is wrong, or the person elects the existing petition route.  
**deadline:** The new act took effect August 28, 2026; implementing agencies are directed to begin the automated program on the statutory schedule, including the January 1, 2027 operational date identified in the act. Section 610.140 petitions follow that section’s waiting periods.  
**requiredComponents:** Approved petition, all offenses and case numbers, prosecuting agencies and custodians as defendants/recipients, eligibility facts, waiting-period facts, and supporting disposition records.  
**serviceOrNotice:** Name and serve all statutorily required prosecuting and record-keeping entities. Objections and hearings follow § 610.140.  
**feeOrWaiver:** The § 610.140 petition has a statutory surcharge/court cost subject to Missouri indigency procedures; no fee is stated for reporting an automatic-processing error.  
**selfHelpStop:** Stop for disputed offense coding, multiple-jurisdiction defendant lists, prosecutor objection, public-safety findings, or appeal.  
**automaticOrControlledStage:** The 2026 law creates state-initiated identification and expungement of specified drug records.  
**participantFiledBranch:** The preexisting § 610.140 petition remains a participant remedy and is the practical backstop before and after automated implementation.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** This is a temporal split: future/rolling automation is B, while the existing petition and correction routes are A.  

---

### 32. MT — Automatic non-conviction removal

**routeKey:** `obligation:track-only:MT:mt_auto_nonconviction`  
**jurisdiction:** MT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Mont. Code Ann. §§ 44-5-202, 44-5-213, 44-5-214, and 44-5-215.  
**officialProcessSource:**
- [Montana Legislature — Title 44, Chapter 5](https://archive.legmt.gov/bills/mca/title_0440/chapter_0050/parts_index.html)
- [Montana Department of Justice — Criminal Records](https://dojmt.gov/enforcement/background-checks/)

**participantActionFound:** YES  
**participantInstrument:** Written request to inspect and challenge criminal-history record information; request to the originating agency and Montana DOJ to correct, remove, or restrict a nonconviction record.  
**filingActor:** The record subject or authorized representative.  
**destination:** The criminal-justice agency that originated the information and the Montana Department of Justice criminal-history repository.  
**trigger:** A qualifying nonconviction record remains publicly disseminated, is inaccurate, or was not removed/restricted when required.  
**deadline:** No short limitations period for the record challenge; submit after the qualifying disposition or discovery.  
**requiredComponents:** Identity verification, fingerprints if requested, copy of the challenged record, arrest/case identifiers, certified disposition, specific correction sought, and contact information.  
**serviceOrNotice:** Administrative submission to the originating agency and repository; written determination and review follow the record-challenge rules.  
**feeOrWaiver:** No separate fee for challenging inaccurate information; fees may apply to obtain a criminal-history copy.  
**selfHelpStop:** Stop after an adverse final agency determination, where disposition/identity is disputed, or judicial review is needed.  
**automaticOrControlledStage:** The repository and originating agencies remove or restrict designated nonconviction data under the statutory rules.  
**participantFiledBranch:** The record subject can inspect and challenge the record and demand correction.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The agency performs the removal, but participant initiation exists. Split.  

---

### 33. NC — Your dismissed North Carolina case may have cleared itself

**routeKey:** `obligation:track-only:NC:nc_auto_146_a4`  
**jurisdiction:** NC  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** N.C. Gen. Stat. §§ 15A-146(a4), 15A-146(a), 15A-150, 15A-151, and 15A-153.  
**officialProcessSource:**
- [North Carolina General Assembly — § 15A-146](https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_15A/GS_15A-146.html)
- [North Carolina Judicial Branch — Expunctions](https://www.nccourts.gov/help-topics/court-records/expunctions)
- [AOC-CR-287 Petition and Order of Expunction](https://www.nccourts.gov/documents/forms/petition-and-order-of-expunction-under-gs-15a-146a-or-a1)

**participantActionFound:** YES  
**participantInstrument:** AOC-CR-287 Petition and Order of Expunction under G.S. 15A-146(a) or (a1), plus clerk/AOC correction request for a missed automatic event.  
**filingActor:** The person charged, or counsel.  
**destination:** The clerk of superior court in the county where the charge was disposed.  
**trigger:** The dismissal or not-guilty disposition is outside the automatic cohort, automation did not occur, or the participant seeks the petition route.  
**deadline:** Automatic expunction is scheduled after the statutory processing interval. A petition under § 15A-146 may be filed after the qualifying disposition; no general outside deadline.  
**requiredComponents:** AOC-CR-287; all charges/case numbers; qualifying disposition; identifying information; and any supplemental local documentation.  
**serviceOrNotice:** The clerk/court sends the order to the agencies listed in § 15A-150. Prosecutor notice or hearing occurs if required by the applicable subsection.  
**feeOrWaiver:** No filing fee is charged for a qualifying § 15A-146 dismissal/acquittal expunction petition.  
**selfHelpStop:** Stop for excluded companion convictions, identity mismatch, disputed disposition, or a contested hearing.  
**automaticOrControlledStage:** The Administrative Office of the Courts identifies and expunges covered dismissals under § 15A-146(a4).  
**participantFiledBranch:** AOC-CR-287 remains the participant petition and correction backstop.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** North Carolina’s automatic program does not repeal the participant petition.  

---

### 34. NE — Where to go about restoring firearm rights in Nebraska

**routeKey:** `obligation:track-only:NE:ne-firearm-restoration-routing`  
**jurisdiction:** NE  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** Neb. Rev. Stat. § 83-1,130(2); Neb. Rev. Stat. § 29-2264(5)(c) and (6); Nebraska Constitution art. IV, § 13.  
**officialProcessSource:**
- [Nebraska Board of Pardons — Applications and Instructions](https://pardons.nebraska.gov/)
- [Nebraska Legislature — § 83-1,130](https://nebraskalegislature.gov/laws/statutes.php?statute=83-1,130)
- [Nebraska Legislature — § 29-2264](https://nebraskalegislature.gov/laws/statutes.php?statute=29-2264)

**participantActionFound:** YES  
**participantInstrument:** Nebraska Board of Pardons application requesting a pardon and/or restoration of civil rights, including firearm rights where legally available.  
**filingActor:** The convicted person.  
**destination:** Nebraska Board of Pardons.  
**trigger:** A Nebraska conviction continues to impose firearm disability after sentence completion and the person seeks discretionary restoration.  
**deadline:** No fixed filing deadline; Board eligibility and waiting policies in the current application instructions apply.  
**requiredComponents:** Signed Board application, complete conviction history, sentence/discharge records, personal statement, rehabilitation and community evidence, references, and requested-rights specification.  
**serviceOrNotice:** Board staff investigate; the Board gives hearing notice and may require publication or victim/prosecutor input under its rules.  
**feeOrWaiver:** The official application does not identify a court filing fee; applicants bear record, fingerprint, notarization, or publication costs if required.  
**selfHelpStop:** Stop for federal firearm disability analysis, out-of-state convictions, violent/sexual offenses, disputed eligibility, or preparation for a discretionary hearing.  
**automaticOrControlledStage:** None. The Board is the decision-maker, but it acts only on an applicant’s request.  
**participantFiledBranch:** The application is the route itself.  
**finalDecision:** `CONVERT_ALL_TO_A`  
**rationale:** AGENCY_CONTROLLED is not a valid exclusion because a participant application initiates the process. Convert the whole row to Category A.  

---

### 35. NE — Where to go about a record from outside Nebraska

**routeKey:** `obligation:track-only:NE:ne-out-of-jurisdiction-routing`  
**jurisdiction:** NE  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** Neb. Rev. Stat. § 29-3523 and the constitutional/full-faith rules governing foreign judgments.  
**officialProcessSource:**
- [Nebraska Legislature — § 29-3523](https://nebraskalegislature.gov/laws/statutes.php?statute=29-3523)
- [Nebraska State Patrol — Criminal History Record Requests](https://statepatrol.nebraska.gov/services/criminal-history-record-requests)

**participantActionFound:** NO  
**participantInstrument:** No Nebraska sealing or expungement instrument for a criminal case belonging exclusively to another state, tribe, federal court, or foreign jurisdiction.  
**filingActor:** No Nebraska filing actor for the foreign case. The participant must use the originating jurisdiction’s remedy.  
**destination:** Originating court or repository; Nebraska State Patrol only for correcting how a foreign disposition is represented in Nebraska’s repository.  
**trigger:** The underlying arrest, charge, or conviction was not created by a Nebraska court or Nebraska criminal-justice agency.  
**deadline:** Controlled by the originating jurisdiction. A Nebraska data-correction request may be made when an inaccurate Nebraska repository entry is discovered.  
**requiredComponents:** Guidance should identify the originating jurisdiction, case number, custodian, and the correct foreign relief process. For a Nebraska data error, provide identity and the foreign certified disposition.  
**serviceOrNotice:** Follow the originating jurisdiction’s rules; an NSP correction is an administrative submission, not Nebraska expungement.  
**feeOrWaiver:** Controlled by the originating jurisdiction; NSP record-copy fees may apply.  
**selfHelpStop:** Immediate jurisdictional handoff for substantive foreign relief; escalate conflicts between jurisdictions or federal consequences.  
**automaticOrControlledStage:** Nebraska has no legal power under this route to expunge the originating jurisdiction’s record.  
**participantFiledBranch:** None in Nebraska for substantive relief. A repository correction is a distinct data-quality process, not the route represented by this row.  
**finalDecision:** `CONFIRM_B`  
**rationale:** The exclusion is legitimate because the row is pure jurisdictional routing. It should provide complete guidance rather than generate a Nebraska petition.  

---

### 36. NE — Where to go about a Nebraska juvenile record

**routeKey:** `obligation:track-pathway:NE:ne-juvenile-sealing-routing:juvenile-automatic-sealing`  
**jurisdiction:** NE  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Neb. Rev. Stat. §§ 43-2,108.01, 43-2,108.03, and 43-2,108.05.  
**officialProcessSource:**
- [Nebraska Legislature — § 43-2,108.03](https://nebraskalegislature.gov/laws/statutes.php?statute=43-2,108.03)
- [Nebraska Judicial Branch — Juvenile forms](https://supremecourt.nebraska.gov/forms?field_form_category_target_id=All)

**participantActionFound:** YES  
**participantInstrument:** Motion to seal juvenile records under § 43-2,108.03(5) or (6), with proposed order; motion to enforce/correct a missed automatic sealing.  
**filingActor:** The juvenile/young adult subject of the record, parent or guardian when permitted, or counsel.  
**destination:** The juvenile court or county court that handled the matter.  
**trigger:** Automatic sealing was not ordered at dismissal/termination, the case falls in the later-motion cohort, or an agency did not implement the order.  
**deadline:** The motion is available when the statutory conditions are met, including the age/event requirements in § 43-2,108.03; no general outside deadline.  
**requiredComponents:** Case and juvenile identifiers, disposition and termination date, statutory eligibility, rehabilitation/completion facts where required, records to be sealed, and proposed order.  
**serviceOrNotice:** Notice to the county attorney and other persons/agencies required by the juvenile statute; the court may set a hearing.  
**feeOrWaiver:** No separate filing fee is ordinarily charged for a motion in the juvenile case; fee-waiver procedures apply if assessed.  
**selfHelpStop:** Stop for prosecutor objection, disputed completion, public-safety findings, multi-case complexity, or contested hearing.  
**automaticOrControlledStage:** The juvenile court seals designated cases automatically at the statutory disposition or termination event.  
**participantFiledBranch:** The statute expressly permits the juvenile to move for sealing when automation did not or could not occur.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Automatic juvenile sealing and participant motion practice are legally distinct branches.  

---

### 37. NE — Check whether your Nebraska non-conviction record came off the public record

**routeKey:** `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing`  
**jurisdiction:** NE  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Neb. Rev. Stat. §§ 29-3523, 29-3527, and 29-3528; State v. Coble, 299 Neb. 434 (2018).  
**officialProcessSource:**
- [Nebraska Legislature — § 29-3523](https://nebraskalegislature.gov/laws/statutes.php?statute=29-3523)
- [Nebraska Legislature — § 29-3527](https://nebraskalegislature.gov/laws/statutes.php?statute=29-3527)
- [Nebraska Judicial Branch — Court forms](https://supremecourt.nebraska.gov/forms)

**participantActionFound:** YES  
**participantInstrument:** Motion or petition under § 29-3523(6) for qualifying no-charge/nonconviction relief; civil action under §§ 29-3527–29-3528 to enforce accuracy or dissemination limits.  
**filingActor:** The person who is the subject of the criminal-history information.  
**destination:** The court with jurisdiction over the arrest/case; responsible criminal-justice agency or district court for enforcement.  
**trigger:** Automatic public-record removal did not occur, the record falls in a petition-only temporal/category branch, or a custodian disseminates prohibited or inaccurate information.  
**deadline:** File after the statutory nonfiling or disposition event and any waiting period in § 29-3523; enforcement follows discovery of noncompliance.  
**requiredComponents:** Identity, arrest/case number, disposition/no-charge proof, statutory subsection, records/custodians, requested relief, and supporting repository printout.  
**serviceOrNotice:** Serve or notify the prosecuting attorney and affected agencies under the selected motion/civil procedure.  
**feeOrWaiver:** Court filing fees may apply to a new civil action; indigency/fee-waiver procedures are available. Administrative correction may be no-fee.  
**selfHelpStop:** Stop for public-interest disputes, contested dissemination, identity conflict, or civil damages/appeal.  
**automaticOrControlledStage:** Nebraska removes qualifying nonconviction information from public dissemination through court/repository data exchange.  
**participantFiledBranch:** The statutes preserve participant motions and enforcement actions for cases not cured automatically.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic public-record restriction is B; the motion/enforcement branch is A.  

---

### 38. NH — Your vacated New Hampshire conviction should clear itself

**routeKey:** `obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction`  
**jurisdiction:** NH  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** N.H. Rev. Stat. Ann. § 651:5, II-a, X, and XI.  
**officialProcessSource:**
- [New Hampshire General Court — RSA 651:5](https://www.gencourt.state.nh.us/rsa/html/LXII/651/651-5.htm)
- [New Hampshire Judicial Branch — Annulment](https://www.courts.nh.gov/self-help/annulment-criminal-records)
- [NHJB Petition to Annul Record](https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-04/nhjb-2317-d.pdf)

**participantActionFound:** YES  
**participantInstrument:** NHJB-2317-D Petition to Annul Record for a vacated conviction in the petition cohort; clerk/State Police correction request if an automatic post-2019 annulment was not implemented.  
**filingActor:** The person whose conviction was vacated.  
**destination:** The court that vacated or handled the conviction; New Hampshire State Police Criminal Records for implementation correction.  
**trigger:** The conviction was vacated but falls outside the automatic cohort, or the court/repository failed to implement the automatic annulment.  
**deadline:** For cases disposed on or after January 1, 2019, § 651:5, II-a(b) directs automatic annulment upon vacatur. Older cases use the petition under II-a(a); no short outside deadline.  
**requiredComponents:** Petition, case number, vacatur order, conviction information, identity/contact data, and any State Police record showing the continuing entry.  
**serviceOrNotice:** The clerk notifies the prosecutor and agencies; a hearing may be held if eligibility or public-welfare issues arise.  
**feeOrWaiver:** The Judicial Branch publishes annulment fees and an Application for Waiver of Filing Fee and Surcharge.  
**selfHelpStop:** Stop for disputed vacatur scope, multiple cases, prosecutor objection, public-welfare hearing, or appeal.  
**automaticOrControlledStage:** A vacated conviction in the statutory post-2019 cohort is annulled automatically.  
**participantFiledBranch:** Older or missed cases require the official participant petition/correction route.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** This is a clear temporal split, not an across-the-board B exclusion.  

---

### 39. NJ — New Jersey's automatic record clearing, and where it stands

**routeKey:** `obligation:track-only:NJ:nj_automated_clean_slate`  
**jurisdiction:** NJ  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** N.J.S.A. 2C:52-5.3 and 2C:52-5.4; P.L. 2019, c. 269.  
**officialProcessSource:**
- [New Jersey Courts — Expungement](https://www.njcourts.gov/self-help/expungement)
- [New Jersey Legislature — 2C:52-5.3/5.4 search](https://lis.njleg.state.nj.us/nxt/gateway.dll/statutes/1/2999/3256)
- [New Jersey Courts — eCourts Expungement System](https://www.njcourts.gov/public/expungement)

**participantActionFound:** YES  
**participantInstrument:** Electronic clean-slate expungement petition under N.J.S.A. 2C:52-5.3 through the Judiciary’s eCourts Expungement System; correction/support request for an omitted case.  
**filingActor:** The person seeking clean-slate expungement, or counsel.  
**destination:** Superior Court, Law Division, Criminal Part, through eCourts.  
**trigger:** The person satisfies the ten-year clean-slate criteria and automatic/semi-automated relief has not been delivered, or the system omitted/misidentified a record.  
**deadline:** File after the statutory ten-year period and completion/payment criteria. The Legislature authorized an automated process under § 5.4, but participant petitions remain the operative route unless and until full automation processes the case.  
**requiredComponents:** eCourts application, all New Jersey convictions, completion dates, fine/payment information, identity/contact information, and any supporting disposition/correction documents.  
**serviceOrNotice:** The eCourts system transmits notice to prosecutors, State Police, and required agencies; objections may result in review or hearing.  
**feeOrWaiver:** New Jersey Courts states that there is no filing fee for an expungement petition.  
**selfHelpStop:** Stop for disputed ten-year calculation, unpaid-obligation issues, excluded convictions, prosecutor objection, or appeal.  
**automaticOrControlledStage:** Section 2C:52-5.4 authorizes/mandates development of an automated clean-slate process; its implementation status must be stated accurately rather than treated as an already universal result.  
**participantFiledBranch:** Section 2C:52-5.3 and the current eCourts system provide a participant petition now.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The row merges a developing/automated statutory stage with the present participant petition. Split rather than promise automation.  

---

### 40. NY — New York DWAI records and Clean Slate

**routeKey:** `obligation:track-only:NY:ny_clean_slate_dwai`  
**jurisdiction:** NY  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** N.Y. Crim. Proc. Law §§ 160.55 and 160.57(1)(a), (e); N.Y. Veh. & Traf. Law § 1192(1); L. 2023, ch. 631.  
**officialProcessSource:**
- [New York State Unified Court System — Clean Slate](https://www.nycourts.gov/clean-slate/)
- [New York Senate — CPL 160.57](https://www.nysenate.gov/legislation/laws/CPL/160.57)
- [New York DCJS — Criminal History Record Review](https://www.criminaljustice.ny.gov/ojis/recordreview.htm)

**participantActionFound:** YES  
**participantInstrument:** Clean Slate manual-review/correction request under CPL 160.57(e) once the Unified Court System form/process is available; DCJS Record Review challenge; existing CPL 160.55 correction for an eligible noncriminal disposition.  
**filingActor:** The person whose DWAI record is involved, or counsel.  
**destination:** The court of disposition/UCS Clean Slate review process; DCJS Record Review Unit for repository inaccuracies.  
**trigger:** An eligible VTL § 1192(1) violation is not sealed after the three-year clock and statewide implementation, or the criminal-history data is inaccurate.  
**deadline:** Clean Slate took effect November 16, 2024. Statewide implementation may continue through November 16, 2027. A manual review is available after the record should be sealed; DCJS correction has no short limitations period.  
**requiredComponents:** Identity, case/court and disposition, sentence-completion date, three-year calculation, copy of the unsealed record, and requested correction/review.  
**serviceOrNotice:** Administrative/court review notice follows the UCS process; DCJS may contact the court or contributing agency.  
**feeOrWaiver:** No Clean Slate filing fee is specified; DCJS may charge for record review but publishes fee-waiver/indigency options.  
**selfHelpStop:** Stop for disputed sentence completion, pending-charge tolling, offense classification, multiple aliases, or judicial review.  
**automaticOrControlledStage:** Eligible DWAI violations are to be sealed automatically after the statutory period, subject to the statewide implementation window.  
**participantFiledBranch:** The law requires a manual-review mechanism for missed records, and DCJS accepts participant record challenges.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic stage is temporally phased and has a participant review/correction backstop. Split.  

---

### 41. NY — New York Clean Slate

**routeKey:** `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57`  
**jurisdiction:** NY  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** N.Y. Crim. Proc. Law § 160.57, especially subdivisions (1)(b), (3), (4), and (e); L. 2023, ch. 631; Judiciary Law § 212(2)(dd).  
**officialProcessSource:**
- [New York State Unified Court System — Clean Slate](https://www.nycourts.gov/clean-slate/)
- [New York Senate — CPL 160.57](https://www.nysenate.gov/legislation/laws/CPL/160.57)
- [New York DCJS — Criminal History Record Review](https://www.criminaljustice.ny.gov/ojis/recordreview.htm)

**participantActionFound:** YES  
**participantInstrument:** Clean Slate manual-review request under CPL 160.57(e) after implementation; DCJS criminal-history record challenge; and, for separately eligible convictions, the existing CPL 160.59 sealing application.  
**filingActor:** The person convicted, or counsel.  
**destination:** The court of conviction/UCS Clean Slate review process; DCJS Record Review Unit; the superior criminal court for a CPL 160.59 application.  
**trigger:** An eligible conviction remains unsealed after the applicable three- or eight-year clock and implementation, data are wrong, or the person independently qualifies for discretionary sealing.  
**deadline:** The law took effect November 16, 2024 and permits statewide implementation through November 16, 2027. The manual review is used after a record should have been sealed. CPL 160.59 has its own ten-year rule.  
**requiredComponents:** Identity; complete case and conviction data; sentence-release/completion date; pending-charge and registry facts; copy of the unsealed record; and, for CPL 160.59, the statutory application and supporting rehabilitation material.  
**serviceOrNotice:** UCS/DCJS review follows the implementing process. A CPL 160.59 application requires notice to the district attorney and may result in opposition/hearing.  
**feeOrWaiver:** No Clean Slate review fee is specified. DCJS record-review charges have hardship options; court filing charges/waivers follow UCS rules.  
**selfHelpStop:** Stop for disputed time calculations, pending-charge tolling, sex-offender or offense exclusions, prosecutor opposition under CPL 160.59, or appeal.  
**automaticOrControlledStage:** UCS and DCJS must automatically seal eligible convictions on a phased basis within the implementation window.  
**participantFiledBranch:** CPL 160.57(e) requires a participant review mechanism for missed records; DCJS correction and CPL 160.59 remain available.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The row is not purely agency-controlled. It has a legislatively required participant review path and a distinct judicial application route.  

---

### 42. PA — Check whether Clean Slate has sealed your record automatically

**routeKey:** `obligation:track-pathway:PA:pa_9122_2_clean_slate:path-j-clean-slate-automatic-limited-access`  
**jurisdiction:** PA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** 18 Pa.C.S. §§ 9122.1, 9122.2, 9122.3, and 9122.5; Pa.R.Crim.P. 490 and 790.  
**officialProcessSource:**
- [Pennsylvania General Assembly — 18 Pa.C.S. § 9122.2](https://www.legis.state.pa.us/WU01/LI/LI/CT/HTM/18/00.091.022.002..HTM)
- [Pennsylvania Courts — Clean Slate](https://www.pacourts.us/learn/clean-slate-expungement-and-limited-access)
- [Pennsylvania State Police — Criminal History Challenge](https://www.pa.gov/agencies/psp/programs/records/criminal-history-background-check.html)

**participantActionFound:** YES  
**participantInstrument:** Petition for limited access under § 9122.1 and Pa.R.Crim.P. 790; PSP challenge to inaccurate criminal-history information; petition/objection to correct an excluded or missed Clean Slate record.  
**filingActor:** The person who is the subject of the record, or counsel.  
**destination:** Court of common pleas in the county of disposition; Pennsylvania State Police for a repository challenge.  
**trigger:** Automatic limited access did not occur, the case falls outside automatic eligibility but inside petition eligibility, or state data are inaccurate.  
**deadline:** File after the statutory waiting period and satisfaction of financial obligations where required; PSP correction may be initiated after discovery.  
**requiredComponents:** Petition identifying the case and eligible offenses; completion/payment facts; certified docket/disposition if required; proposed order; and record-challenge documentation.  
**serviceOrNotice:** Serve the district attorney under Rule 790; objections can lead to a hearing. The court transmits orders to PSP and other repositories.  
**feeOrWaiver:** County filing fees vary; Pennsylvania in forma pauperis procedures are available. PSP record-review fees may apply.  
**selfHelpStop:** Stop for contested eligibility, unpaid-obligation disputes, objection, hearing, mixed-case analysis, or appeal.  
**automaticOrControlledStage:** AOPC and PSP exchange data and automatically grant limited access to qualifying records under § 9122.2.  
**participantFiledBranch:** Section 9122.1 and Rule 790 provide a participant petition; PSP accepts correction challenges.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Clean Slate automation and petition-based limited access are separate legal routes. Split.  

---

### 43. UT — Utah clears acquittals and dismissals automatically

**routeKey:** `obligation:track-pathway:UT:ut_auto_nonconviction:path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice`  
**jurisdiction:** UT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Utah Code §§ 77-40a-204, 77-40a-206, 77-40a-301 through 77-40a-305, and 77-40a-401.  
**officialProcessSource:**
- [Utah Courts — Expunging Adult Criminal Records](https://www.utcourts.gov/en/self-help/case-categories/criminal-justice/expunge.html)
- [Utah Legislature — Title 77, Chapter 40a](https://le.utah.gov/xcode/Title77/Chapter40A/77-40a.html)
- [Utah BCI — Expungements](https://bci.utah.gov/expungements/)

**participantActionFound:** YES  
**participantInstrument:** BCI certificate-of-eligibility application followed by a district/justice-court Petition to Expunge and proposed order; correction request for a missed automatic expungement.  
**filingActor:** The person whose case was dismissed with prejudice or ended in acquittal.  
**destination:** Utah Bureau of Criminal Identification for the certificate; the court that handled the case for the petition; BCI/court for correction.  
**trigger:** The case was not processed automatically, falls outside the operational automatic cohort, or the participant wants the ordinary expungement order.  
**deadline:** The automatic program resumed for eligible records on the statutory schedule, including January 1, 2026 changes. The petition route may be used when statutory eligibility exists; a BCI certificate generally expires after 90 days.  
**requiredComponents:** BCI application and fingerprints/identification; certificate of eligibility; petition, case number and disposition; prosecutor-response documents if applicable; proposed order.  
**serviceOrNotice:** Serve or provide the petition to the prosecuting agency under Title 77, Chapter 40a. The prosecutor may object; the court may hold a hearing.  
**feeOrWaiver:** BCI certificate and court filing fees apply under current schedules; Utah provides an affidavit/application to waive court fees for indigent filers.  
**selfHelpStop:** Stop for prosecutor objection, inaccurate BCI eligibility determination, mixed dispositions, pending cases, or contested hearing.  
**automaticOrControlledStage:** Courts and BCI identify and expunge qualifying acquittals and dismissals with prejudice without a participant filing.  
**participantFiledBranch:** The traditional BCI certificate plus court petition remains available, as does correction of a missed automatic record.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Automatic relief is valid B only for that stage; Utah retains a participant-filed expungement route.  

---

### 44. UT — Utah deletes old traffic cases automatically

**routeKey:** `obligation:track-pathway:UT:ut_auto_traffic:path-i-traffic-offense-expungement-or-deletion`  
**jurisdiction:** UT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Utah Code §§ 77-40a-101, 77-40a-202, 77-40a-204, and the petition provisions of Title 77, Chapter 40a.  
**officialProcessSource:**
- [Utah Courts — Expunging Adult Criminal Records](https://www.utcourts.gov/en/self-help/case-categories/criminal-justice/expunge.html)
- [Utah Legislature — Title 77, Chapter 40a](https://le.utah.gov/xcode/Title77/Chapter40A/77-40a.html)
- [Utah BCI — Expungements](https://bci.utah.gov/expungements/)

**participantActionFound:** YES  
**participantInstrument:** BCI certificate-of-eligibility application and court Petition to Expunge for petition-eligible traffic offenses; court/BCI correction request when scheduled deletion did not occur.  
**filingActor:** The person cited or convicted.  
**destination:** BCI and the court of record.  
**trigger:** An eligible old traffic case was not deleted, is not in the automatic deletion cohort, or qualifies for petition-based expungement.  
**deadline:** Automatic deletion follows the age and category schedule in § 77-40a-202. Petition timing follows Title 77, Chapter 40a; the BCI certificate has a limited validity period.  
**requiredComponents:** Identity, citation/case number, offense/disposition, BCI certificate, petition, proposed order, and proof of sentence/financial completion.  
**serviceOrNotice:** Prosecutor notice/response follows the petition statute; granted orders must be delivered to BCI and other custodians as directed.  
**feeOrWaiver:** BCI and court fees may apply; Utah court fee-waiver procedures are available.  
**selfHelpStop:** Stop for excluded DUI/traffic offenses, driver-license consequences, prosecutor objection, disputed completion, or hearing.  
**automaticOrControlledStage:** Courts purge or delete designated old traffic records on the statutory schedule.  
**participantFiledBranch:** Other eligible traffic matters, and missed deletions, can be addressed through participant petition/correction.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The traffic deletion stage does not eliminate the participant route. Split.  

---

### 45. VA — A Virginia misdemeanour charge that ended without a conviction, for someone with no other record

**routeKey:** `obligation:track-only:VA:va_auto_seal_clean_record`  
**jurisdiction:** VA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Va. Code §§ 19.2-392.11, 19.2-392.12, 19.2-392.13, and 17.1-502(B1).  
**officialProcessSource:**
- [Virginia Legislative Information System — Record Sealing Chapter](https://law.lis.virginia.gov/vacodefull/title19.2/chapter23.1/)
- [Virginia Judicial System — Expungement/Sealing Forms](https://www.vacourts.gov/forms/district/civil.html)
- [Virginia State Police — Criminal Record Check and Challenge](https://vsp.virginia.gov/services/criminal-background/)

**participantActionFound:** YES  
**participantInstrument:** Petition to seal under Va. Code § 19.2-392.12 when the automatic clean-record rule does not apply or fails; oral/written request or motion to correct the case record; State Police record challenge.  
**filingActor:** The person charged, or counsel.  
**destination:** Court of disposition for sealing/correction; Virginia State Police for repository correction.  
**trigger:** The no-conviction misdemeanor charge is not sealed automatically because data/eligibility are incomplete, or the person falls into a petition route.  
**deadline:** The operative date and phased implementation of Virginia’s sealing chapter must be applied exactly. A participant petition is filed when the statutory petition criteria are met; correction has no short deadline.  
**requiredComponents:** Case and charge information, disposition, complete Virginia criminal-history facts, eligibility/limit calculations, petition or motion, proposed order, and supporting record.  
**serviceOrNotice:** Serve the Commonwealth’s Attorney as required by § 19.2-392.12; VSP and agencies receive the order. Objection can cause hearing.  
**feeOrWaiver:** Petition filing fees and service costs may apply under Virginia schedules; petitioners may seek waiver through the Virginia indigency process.  
**selfHelpStop:** Stop for disputed record-count limits, excluded offenses, Commonwealth objection, public-safety findings, or hearing.  
**automaticOrControlledStage:** The court/AOC/VSP data system seals qualifying no-conviction misdemeanor charges for clean-record individuals without a petition.  
**participantFiledBranch:** The sealing chapter preserves participant petitions and record-correction challenges.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic cohort is B, but the petition/correction backstop is A.  

---

### 46. VA — Virginia charges that ended without a conviction can seal themselves

**routeKey:** `obligation:track-only:VA:va_auto_seal_nonconvictions`  
**jurisdiction:** VA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Va. Code §§ 19.2-392.8, 19.2-392.10, 19.2-392.12, 19.2-392.13, and 19.2-392.2.  
**officialProcessSource:**
- [Virginia LIS — Record Sealing Chapter](https://law.lis.virginia.gov/vacodefull/title19.2/chapter23.1/)
- [Virginia Judicial System — Expungement forms](https://www.vacourts.gov/forms/circuit/civil.html)
- [Virginia State Police — Criminal Record Challenge](https://vsp.virginia.gov/services/criminal-background/)

**participantActionFound:** YES  
**participantInstrument:** Request at disposition where authorized, petition to seal under § 19.2-392.12, traditional expungement petition under § 19.2-392.2 where applicable, and VSP correction challenge.  
**filingActor:** The accused or record subject, or counsel.  
**destination:** Court that disposed of the charge; circuit court under the selected petition statute; VSP for correction.  
**trigger:** Automatic sealing did not occur, the charge is outside the automatic subsection but inside a petition/expungement route, or the repository record is wrong.  
**deadline:** Apply the statute’s operative date and any petition waiting period. Traditional § 19.2-392.2 relief is available after qualifying acquittal/nolle prosequi/dismissal, subject to its terms.  
**requiredComponents:** Petition/request; case and charge data; qualifying disposition; full criminal-history information; proposed order; fingerprints if required; and supporting record.  
**serviceOrNotice:** Serve the Commonwealth’s Attorney. VSP and agencies receive granted orders; objections may lead to hearing.  
**feeOrWaiver:** Court filing/service fees may apply, with indigency waiver procedures.  
**selfHelpStop:** Stop for identity-use objections, manifest-injustice disputes, prosecutor opposition, mixed dispositions, or hearing.  
**automaticOrControlledStage:** Courts and state repositories automatically seal designated nonconvictions under the new sealing framework.  
**participantFiledBranch:** The accused may request or petition under the sealing and expungement statutes and challenge VSP data.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Virginia’s law contains both automatic and participant-filed relief. Split.  

---

### 47. VA — Old Virginia marijuana possession charges and traffic infractions are already sealed

**routeKey:** `obligation:track-only:VA:va_auto_seal_without_order`  
**jurisdiction:** VA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Va. Code §§ 19.2-392.6:1, 19.2-392.12:1(B), 19.2-392.13, and 19.2-392.17.  
**officialProcessSource:**
- [Virginia LIS — Record Sealing Chapter](https://law.lis.virginia.gov/vacodefull/title19.2/chapter23.1/)
- [Virginia State Police — Criminal Record Challenge](https://vsp.virginia.gov/services/criminal-background/)

**participantActionFound:** YES  
**participantInstrument:** VSP/AOC correction request for a record that should already be sealed without order; participant petition under § 19.2-392.12 or § 19.2-392.12:1 for eligible matters not cured by the no-order rule.  
**filingActor:** The person whose record is involved.  
**destination:** Virginia State Police and Office of the Executive Secretary/court clerk for correction; court of conviction/disposition for a petition.  
**trigger:** A legacy marijuana-possession charge or covered traffic infraction remains publicly accessible, or the person seeks petition-based relief beyond the automatic no-order cohort.  
**deadline:** Correction may be requested upon discovery. Petition timing follows the applicable sealing statute and operative date.  
**requiredComponents:** Identity, case/citation, offense and disposition, statutory category, copy of public record showing noncompliance, petition if needed, and proposed order.  
**serviceOrNotice:** Administrative correction to VSP/AOC; petition notice to the Commonwealth’s Attorney and affected agencies.  
**feeOrWaiver:** No fee for reporting an implementation error; court filing/service fees and waiver rules apply to a petition.  
**selfHelpStop:** Stop for disputed offense coding, excluded traffic/controlled-substance conduct, Commonwealth objection, or hearing.  
**automaticOrControlledStage:** The listed legacy records are sealed by operation of law without an individual court order.  
**participantFiledBranch:** The person can seek correction and, where eligible, file under the sealing chapter.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The no-order stage is automatic, but it has participant correction/petition backstops.  

---

### 48. VA — Clearing a Virginia conviction vacated by a writ of actual innocence

**routeKey:** `obligation:track-only:VA:va_exp_actual_innocence`  
**jurisdiction:** VA  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** Va. Code § 19.2-392.2(J) and (K); Va. Code §§ 19.2-327.5 and 19.2-327.13.  
**officialProcessSource:**
- [Virginia LIS — § 19.2-392.2](https://law.lis.virginia.gov/vacode/title19.2/chapter23.1/section19.2-392.2/)
- [Virginia LIS — Writ of Actual Innocence statutes](https://law.lis.virginia.gov/vacodefull/title19.2/chapter19.2/)

**participantActionFound:** NO  
**participantInstrument:** None for the post-writ expungement stage. The petition for a writ of actual innocence is a separate antecedent appellate route and should remain separately modeled.  
**filingActor:** No participant filing is required after the qualifying writ/vacatur order.  
**destination:** The court and clerks/custodians directed by the writ and § 19.2-392.2(J)–(K).  
**trigger:** A court grants a qualifying writ of actual innocence and vacates the conviction.  
**deadline:** The clerk and custodians implement the order under the statute; no participant deadline for this downstream stage.  
**requiredComponents:** No participant packet. Guidance should retain the writ/vacatur order, verify VSP/court records, and identify agencies that received the order.  
**serviceOrNotice:** Official transmission is handled by the court clerk and custodians.  
**feeOrWaiver:** No participant filing fee for the post-writ expungement implementation.  
**selfHelpStop:** Handoff if the writ does not expressly cover a record, an agency refuses implementation, or enforcement/appeal is required.  
**automaticOrControlledStage:** After the writ is granted, expungement follows by court order and ministerial transmission.  
**participantFiledBranch:** None within this narrowly scoped post-writ stage. The writ application itself is a different route.  
**finalDecision:** `CONFIRM_B`  
**rationale:** The current row is legitimately court-initiated after the writ. Do not merge it with the antecedent writ petition, but provide verification and enforcement guidance.  

---

### 49. VA — Some minor Virginia convictions seal themselves after seven clean years

**routeKey:** `obligation:track-pathway:VA:va_auto_seal_convictions:automatic-sealing-no-filing`  
**jurisdiction:** VA  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** Va. Code §§ 19.2-392.6, 19.2-392.7, 19.2-392.12, and 19.2-392.13.  
**officialProcessSource:**
- [Virginia LIS — Record Sealing Chapter](https://law.lis.virginia.gov/vacodefull/title19.2/chapter23.1/)
- [Virginia Judicial System — Forms](https://www.vacourts.gov/forms/home.html)
- [Virginia State Police — Criminal Record Challenge](https://vsp.virginia.gov/services/criminal-background/)

**participantActionFound:** YES  
**participantInstrument:** Petition to seal under § 19.2-392.12 for eligible convictions not automatically sealed; correction request for a missed automatic seal.  
**filingActor:** The person convicted, or counsel.  
**destination:** The court of conviction or the circuit court specified by the sealing statute; VSP/AOC for correction.  
**trigger:** An otherwise eligible minor conviction remains unsealed after the clean-year period or does not fit the automatic cohort but fits petition criteria.  
**deadline:** Automatic sealing follows the seven-year clean period and operative implementation schedule. Petition timing follows § 19.2-392.12.  
**requiredComponents:** Complete conviction history, sentence-completion and clean-period proof, petition, statutory-limit calculations, proposed order, and supporting records.  
**serviceOrNotice:** Serve the Commonwealth’s Attorney; the court may receive an objection and hold a hearing. Orders go to VSP and custodians.  
**feeOrWaiver:** Court filing/service fees may apply; Virginia indigency waiver procedures are available.  
**selfHelpStop:** Stop for excluded offenses, record-count disputes, pending charges, prosecutor objection, contested public-safety findings, or appeal.  
**automaticOrControlledStage:** The state data process seals qualifying minor convictions after the statutory clean period.  
**participantFiledBranch:** The person can petition under § 19.2-392.12 and correct missed automation.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The automatic route coexists with a participant petition. Split.  

---

### 50. VT — Records cleared after completing court diversion on a charge

**routeKey:** `obligation:track-only:VT:vt_diversion_post_charge`  
**jurisdiction:** VT  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** 3 V.S.A. § 164(f); 13 V.S.A. §§ 7601–7607, including § 7603.  
**officialProcessSource:**
- [Vermont Legislature — 3 V.S.A. § 164](https://legislature.vermont.gov/statutes/section/03/007/00164)
- [Vermont Judiciary — Expungement and Sealing](https://www.vermontjudiciary.org/criminal/expungement-and-sealing)
- [Vermont Judiciary — Petition to Expunge or Seal Criminal History](https://www.vermontjudiciary.org/media/1072)

**participantActionFound:** YES  
**participantInstrument:** Application for expungement of qualifying older diversion records under 3 V.S.A. § 164(f)(5); petition under 13 V.S.A. § 7603; correction request after automatic deletion fails.  
**filingActor:** The person who completed diversion, or counsel.  
**destination:** The diversion program/state’s attorney/court as directed by § 164; the criminal division that handled the charge for a Chapter 230 petition.  
**trigger:** The charge was dismissed after diversion but the record was not automatically expunged, predates the automatic cohort, or is independently petition-eligible.  
**deadline:** For modern qualifying post-charge diversion, automatic expungement follows the statutory period, commonly two years after dismissal. Older cases use the participant application; Chapter 230 timing depends on disposition/offense.  
**requiredComponents:** Identity, docket/charge, diversion contract and completion proof, dismissal, application or petition, requested records, and proposed order.  
**serviceOrNotice:** Petition notice goes to the State’s Attorney and agencies under Chapter 230; the court may set a hearing.  
**feeOrWaiver:** Vermont Judiciary states no filing fee for criminal expungement/sealing petitions; copy costs may apply.  
**selfHelpStop:** Stop for disputed completion, excluded charges, State opposition, victim issues, or contested hearing.  
**automaticOrControlledStage:** Modern qualifying diversion dismissals are expunged through court/program data exchange after the statutory period.  
**participantFiledBranch:** Older and missed records have an application/petition branch.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The route contains a temporal participant application and a general petition backstop. Split.  

---

### 51. VT — Records deleted after completing pre-charge diversion

**routeKey:** `obligation:track-only:VT:vt_diversion_pre_charge`  
**jurisdiction:** VT  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** 3 V.S.A. § 164(f)(1) and (4); related correction and Chapter 230 provisions.  
**officialProcessSource:**
- [Vermont Legislature — 3 V.S.A. § 164](https://legislature.vermont.gov/statutes/section/03/007/00164)
- [Vermont Judiciary — Expungement and Sealing](https://www.vermontjudiciary.org/criminal/expungement-and-sealing)
- [Vermont Criminal History Record Check](https://vcic.vermont.gov/ch-information/record-check)

**participantActionFound:** YES  
**participantInstrument:** Written request to the diversion program, State’s Attorney, law-enforcement agency, or Vermont Crime Information Center to correct/delete a pre-charge diversion record; Chapter 230 petition if a court record exists and is eligible.  
**filingActor:** The person who completed pre-charge diversion.  
**destination:** Diversion program, State’s Attorney, arresting agency, VCIC, and, if necessary, the criminal division.  
**trigger:** Successful pre-charge diversion should have produced deletion but arrest/referral information remains or is inaccurate.  
**deadline:** Deletion follows the statutory completion event; correction may be requested when noncompliance is discovered.  
**requiredComponents:** Identity, referral/arrest details, diversion agreement and completion proof, confirmation that no charge was filed, copy of the remaining record, and precise deletion request.  
**serviceOrNotice:** Administrative submission to custodians; any court petition gives notice under Chapter 230.  
**feeOrWaiver:** No fee for a correction/deletion request; no filing fee for Vermont criminal expungement/sealing petitions.  
**selfHelpStop:** Stop if completion or charging status is disputed, multiple agencies refuse correction, or contested judicial enforcement is necessary.  
**automaticOrControlledStage:** Custodians delete qualifying pre-charge diversion records after completion without a petition.  
**participantFiledBranch:** The participant may initiate correction and, where a court record exists, petition.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** Automatic deletion is B, but the correction/enforcement branch is A.  

---

### 52. WI — Complete an expungement the judge already ordered

**routeKey:** `obligation:track-only:WI:wi_exp_certificate_of_discharge`  
**jurisdiction:** WI  
**currentReason:** AGENCY_CONTROLLED  
**currentConfidence:** medium  
**controllingAuthority:** Wis. Stat. § 973.015(1m), especially § 973.015(1m)(b); Wisconsin court form CR-266.  
**officialProcessSource:**
- [Wisconsin Legislature — § 973.015](https://docs.legis.wisconsin.gov/statutes/statutes/973/015)
- [Wisconsin Court System — Expunging Court Records](https://www.wicourts.gov/services/public/selfhelp/expunge.htm)
- [Wisconsin Court Form CR-266](https://www.wicourts.gov/formdisplay/CR-266.pdf?formNumber=CR-266&formType=Form&formatId=2&language=en)

**participantActionFound:** YES  
**participantInstrument:** CR-266 Petition to Expunge Court Record of Conviction where the person was not placed on probation or sentenced to incarceration, and a written request/motion to correct an agency’s missing certificate of discharge.  
**filingActor:** The person for whom expungement was ordered at sentencing; the supervising/corrections agency issues the certificate in supervised cases.  
**destination:** The sentencing court; Department of Corrections or other supervising authority for certificate correction.  
**trigger:** The sentencing judge ordered expungement, the sentence was successfully completed, and either no agency will issue a discharge certificate or the certificate/order was not transmitted.  
**deadline:** File or seek correction promptly after successful completion. Expungement eligibility must have been ordered at sentencing; it cannot normally be added later.  
**requiredComponents:** CR-266, sentencing order/judgment showing expungement eligibility, proof of successful sentence completion, discharge certificate if available, and case identifiers.  
**serviceOrNotice:** File in the criminal case; the court may contact the prosecutor/supervising agency. Granted processing is transmitted to record custodians.  
**feeOrWaiver:** No new civil filing fee is ordinarily charged for CR-266 in the criminal case; copy costs may apply.  
**selfHelpStop:** Stop if successful completion is disputed, the judgment lacks the required sentencing-time order, or the State opposes and a hearing is needed.  
**automaticOrControlledStage:** For probation or incarceration cases, the supervising authority forwards the discharge certificate and the court expunges if the statutory conditions are met.  
**participantFiledBranch:** CR-266 expressly allows the person to petition in the no-probation/no-incarceration situation and supports correction when agency transmission fails.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The agency stage is real but not exclusive. The official participant petition requires a split.  

---

### 53. WV — Before you file: what West Virginia checks on a non-conviction expungement

**routeKey:** `obligation:track-only:WV:wv_common_nc_procedure`  
**jurisdiction:** WV  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** W. Va. Code § 61-11-25(a)–(g).  
**officialProcessSource:**
- [West Virginia Legislature — § 61-11-25](https://code.wvlegislature.gov/61-11-25/)
- [West Virginia Judiciary — Expungement forms and information](https://www.courtswv.gov/public-resources/court-information-by-topic/expungement)

**participantActionFound:** YES  
**participantInstrument:** Civil petition for expungement of a nonconviction record under W. Va. Code § 61-11-25.  
**filingActor:** The person whose criminal charges ended in the qualifying nonconviction disposition.  
**destination:** Circuit court of the county where the criminal charge was filed.  
**trigger:** The person was acquitted or the charge was dismissed, subject to statutory exclusions and waiting requirements.  
**deadline:** Generally 60 days after acquittal or dismissal; if the person waits beyond that period, the court may still accept the petition upon good cause where authorized. Exact subsection timing controls.  
**requiredComponents:** Petition identifying the charge, case, disposition, arresting agency, prosecutor, all record custodians, statutory eligibility, prior expungements, and requested order; supporting certified disposition.  
**serviceOrNotice:** Serve the prosecuting attorney and all agencies/custodians required by § 61-11-25. Objections and hearing procedures apply.  
**feeOrWaiver:** A civil filing fee applies under West Virginia fee statutes; a financial affidavit/fee-waiver process is available for qualifying indigent petitioners.  
**selfHelpStop:** Stop for objections, excluded offenses, civil-action relationship, factual dispute, contested hearing, or appeal.  
**automaticOrControlledStage:** None. Eligibility checks are conditions the court applies after a petition; they are not automatic relief.  
**participantFiledBranch:** The participant’s civil petition is the only initiating mechanism described by § 61-11-25.  
**finalDecision:** `CONVERT_ALL_TO_A`  
**rationale:** The current AUTOMATIC label is legally wrong. This is a participant-filed court petition and must convert entirely to Category A.  

---

### 54. WV — An under-21 first alcohol-driving charge that the court clears itself when you finish the test and lock program

**routeKey:** `obligation:track-only:WV:wv_dui_test_and_lock_dismissal`  
**jurisdiction:** WV  
**currentReason:** AUTOMATIC  
**currentConfidence:** medium  
**controllingAuthority:** W. Va. Code § 17C-5-2(j), including (j)(1) and (j)(3); § 17C-5A-3a; § 61-11-26b.  
**officialProcessSource:**
- [West Virginia Legislature — § 17C-5-2](https://code.wvlegislature.gov/17C-5-2/)
- [West Virginia DMV — Alcohol Test and Lock Program](https://transportation.wv.gov/DMV/Drivers/Pages/Alcohol-Test-and-Lock-Program.aspx)
- [West Virginia Judiciary — Expungement](https://www.courtswv.gov/public-resources/court-information-by-topic/expungement)

**participantActionFound:** YES  
**participantInstrument:** Participant motion/application to enter the under-21 test-and-lock program; motion/request to enforce dismissal and expungement after successful completion; any statutory petition required by § 61-11-26b.  
**filingActor:** The eligible under-21 accused person, or counsel.  
**destination:** The criminal court handling the first-offense charge; DMV/Division of Motor Vehicles for program administration; circuit court if a separate expungement petition is required.  
**trigger:** The person seeks test-and-lock disposition, successfully completes the program but dismissal/expungement is not entered, or a custodian has not complied.  
**deadline:** Entry must be sought while the charge is pending and within the procedural window set by § 17C-5-2(j). Post-completion enforcement should be filed promptly; any § 61-11-26b period controls.  
**requiredComponents:** Motion/application, age and first-offense facts, charge and BAC facts, consent/waivers, proof of program enrollment and completion, DMV compliance, disposition record, and proposed dismissal/expungement order.  
**serviceOrNotice:** Notice to the prosecutor and DMV; the court may conduct a hearing on admission or compliance and sends orders to custodians.  
**feeOrWaiver:** Program, device, testing, and court costs may apply, with statutory indigency/ability-to-pay provisions and court fee-waiver procedures where available.  
**selfHelpStop:** Stop for eligibility disputes, prosecutor opposition, alleged program violation, injury/aggravating facts, or contested hearing.  
**automaticOrControlledStage:** After lawful admission and successful completion, the court has a ministerial dismissal/expungement consequence.  
**participantFiledBranch:** The person must initiate or consent to the program and can move to enforce the promised record relief.  
**finalDecision:** `SPLIT_B_STAGE_AND_A_BRANCH`  
**rationale:** The completion consequence may be automatic, but the route necessarily contains a participant application/motion branch. Split.  

---

### 55. WV — Before you file: West Virginia gives you one conviction expungement, ever

**routeKey:** `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26`  
**jurisdiction:** WV  
**currentReason:** COURT_INITIATED  
**currentConfidence:** medium  
**controllingAuthority:** W. Va. Code § 61-11-26(a)–(p), § 61-11-26a, § 61-11-26b, and § 59-1-11(a)(1).  
**officialProcessSource:**
- [West Virginia Legislature — § 61-11-26](https://code.wvlegislature.gov/61-11-26/)
- [West Virginia Judiciary — Expungement](https://www.courtswv.gov/public-resources/court-information-by-topic/expungement)

**participantActionFound:** YES  
**participantInstrument:** Civil petition for expungement of an eligible misdemeanor or nonviolent felony conviction under W. Va. Code § 61-11-26.  
**filingActor:** The convicted person.  
**destination:** Circuit court of the county where the conviction occurred.  
**trigger:** The person has an eligible conviction, completed all sentence obligations, satisfied the applicable waiting period, and has no disqualifying matters.  
**deadline:** File after the statute’s waiting period measured from sentence/discharge/completion as applicable: generally one year for eligible misdemeanors and longer for eligible nonviolent felonies, subject to the precise subsection and any enhanced rules.  
**requiredComponents:** Verified civil petition; every conviction and charge; sentence-completion and waiting-period facts; criminal-history information; employment/education and rehabilitation facts where requested; all prosecuting and record-keeping agencies; certified records; proposed order.  
**serviceOrNotice:** Serve the prosecuting attorney and all required agencies. The State and victims may receive notice and object; the court may hold a hearing.  
**feeOrWaiver:** A civil filing fee and statutory costs apply; West Virginia indigency/fee-waiver procedures are available.  
**selfHelpStop:** Stop for offense-exclusion ambiguity, multiple convictions, disputed single-use limit, victim/prosecutor objection, hearing, or appeal.  
**automaticOrControlledStage:** None. The court does not initiate the case; it adjudicates only after the participant files.  
**participantFiledBranch:** The civil petition is the entire route.  
**finalDecision:** `CONVERT_ALL_TO_A`  
**rationale:** COURT_INITIATED is incorrect. Judicial decision-making does not make a participant petition court-initiated. Convert entirely to Category A.  

---

## Final reconciliation

- **INPUT ROWS:** 55
- **OUTPUT ROWS:** 55
- **CONFIRM_B:** 3
- **CONVERT_ALL_TO_A:** 3
- **SPLIT_B_STAGE_AND_A_BRANCH:** 49
- **NEEDS_LEGAL_DECISION:** 0
- **DUPLICATE ROUTE KEYS:** 0
- **OMITTED ROUTE KEYS:** 0
- **UNRECOGNIZED ROUTE KEYS:** 0

### CONFIRM_B

- `obligation:track-only:MN:mn_pardon_auto_expungement`
- `obligation:track-only:NE:ne-out-of-jurisdiction-routing`
- `obligation:track-only:VA:va_exp_actual_innocence`

### CONVERT_ALL_TO_A

- `obligation:track-only:NE:ne-firearm-restoration-routing`
- `obligation:track-only:WV:wv_common_nc_procedure`
- `obligation:track-pathway:WV:wv_common_conv_procedure:eligible-conviction-expungement-under-w-va-code-61-11-26`

### SPLIT_B_STAGE_AND_A_BRANCH

- `obligation:track-only:AK:ak-nonconviction-confidential`
- `obligation:track-only:CA:ca-auto-conviction`
- `obligation:track-pathway:CA:ca-auto-arrest:tool-2-automatic-relief`
- `obligation:track-only:CO:co_auto_seal_arrest`
- `obligation:track-only:CO:co_auto_seal_nonconviction`
- `obligation:track-only:CT:ct-nonconviction-auto`
- `obligation:track-pathway:CT:ct-cleanslate-auto:automatic-clean-slate-erasure-for-eligible-post-2000-convictions`
- `obligation:track-pathway:CT:ct-diversion:automatic-non-conviction-erasure-under-conn-gen-stat-54-142a`
- `obligation:track-pathway:DC:dc_auto_expungement:dc_auto_expungement_16_802`
- `obligation:track-pathway:DC:dc_auto_sealing:dc_auto_sealing_16_805`
- `obligation:track-pathway:DE:de_auto_expungement:mandatory-and-automatic-expungement-under-11-del-c-4373-and-4373a`
- `obligation:track-pathway:IL:il-cannabis-auto:cannabis-specific-automatic-or-petition-expungement`
- `obligation:track-pathway:IL:il-prostitution-j-auto:felony-prostitution-relief`
- `obligation:track-only:IN:in_auto_expungement`
- `obligation:track-only:KY:ky_automatic_nonconviction_expungement_verification`
- `obligation:track-only:KY:ky_diversion_disposition_routing`
- `obligation:track-only:MD:md_10103_1_automatic`
- `obligation:track-only:MD:md_10104_pre_service`
- `obligation:track-only:MD:md_10112_dpscs_cannabis`
- `obligation:track-pathway:MD:md_10105_1_automatic:automatic-expungement-under-crim-proc-10-105-1`
- `obligation:track-only:ME:me-deferred`
- `obligation:track-only:MI:mi_arrest_acquittal_dismissal`
- `obligation:track-only:MI:mi_arrest_no_charge`
- `obligation:track-only:MI:mi_auto_misd92`
- `obligation:track-only:MI:mi_auto_misd93`
- `obligation:track-only:MI:mi_deferral_status`
- `obligation:track-pathway:MI:mi_auto_felony:automatic-clean-slate-set-aside-under-mcl-780-621g`
- `obligation:track-only:MN:mn_ceb_felony_cannabis`
- `obligation:track-only:MN:mn_mistaken_identity_iddata`
- `obligation:track-pathway:MO:mo-610-141-automatic-drug:state-initiated-automatic-expungement-of-eligible-drug-offenses-under-610-141`
- `obligation:track-only:MT:mt_auto_nonconviction`
- `obligation:track-only:NC:nc_auto_146_a4`
- `obligation:track-pathway:NE:ne-juvenile-sealing-routing:juvenile-automatic-sealing`
- `obligation:track-pathway:NE:ne-nonconviction-auto:automatic-nonconviction-sealing`
- `obligation:track-pathway:NH:nh_auto_vacated:annulment-of-a-vacated-conviction`
- `obligation:track-only:NJ:nj_automated_clean_slate`
- `obligation:track-only:NY:ny_clean_slate_dwai`
- `obligation:track-pathway:NY:ny_clean_slate_convictions:automatic-clean-slate-sealing-under-cpl-160-57`
- `obligation:track-pathway:PA:pa_9122_2_clean_slate:path-j-clean-slate-automatic-limited-access`
- `obligation:track-pathway:UT:ut_auto_nonconviction:path-b-automatic-expungement-after-acquittal-or-dismissal-with-prejudice`
- `obligation:track-pathway:UT:ut_auto_traffic:path-i-traffic-offense-expungement-or-deletion`
- `obligation:track-only:VA:va_auto_seal_clean_record`
- `obligation:track-only:VA:va_auto_seal_nonconvictions`
- `obligation:track-only:VA:va_auto_seal_without_order`
- `obligation:track-pathway:VA:va_auto_seal_convictions:automatic-sealing-no-filing`
- `obligation:track-only:VT:vt_diversion_post_charge`
- `obligation:track-only:VT:vt_diversion_pre_charge`
- `obligation:track-only:WI:wi_exp_certificate_of_discharge`
- `obligation:track-only:WV:wv_dui_test_and_lock_dismissal`

### NEEDS_LEGAL_DECISION

- None

## Product rule produced by this audit

A route may remain Category B only for the non-participant-initiated stage itself. When law supplies a participant petition, motion, request, application, correction, objection, response, hearing request, appeal, judicial review, or enforcement fallback, that branch is Category A even if an agency, prosecutor, or judge ultimately decides it.

> This report is a legal-design classification audit, not representation in an individual case. Current local fee schedules, unpublished clerk practices, and implementation mechanics should be refreshed when a packet is generated.