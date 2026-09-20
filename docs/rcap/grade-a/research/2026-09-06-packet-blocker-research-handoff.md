# LegalEase: fee, service, and verification blocker research

**Research date:** September 6, 2026  
**Repository snapshot reviewed:** `738dade9124e46dc2196fdfde0b3eba020930a5b`  
**Branch:** `claude/legalease-sprint-captain-utucnw`  
**Prepared by:** ChatGPT, research and implementation analysis; not counsel of record.

## Result and authority boundary

Three substantive dispositions are supported for consideration in six families: Rhode Island's Superior Court fee answer (four), Vermont's DUI fee/waiver treatment (one), and the already-recorded Mississippi notarized-verification product requirement (one). The seventh family's New Hampshire question is substantially narrowed, but its court/filing-channel fit and criminal fee-waiver service treatment still require confirmation.

This handoff does not grant counsel approval, amend a specification, change a family state, renew an artifact pin, or authorize delivery. No repository writes or Production changes were made. Use the existing approval and integration mechanisms. Do not convert recommendations into a statement that Lawrence approved them.

The controlling issue inventory is `docs/rcap/grade-a/captain/OWNER_DECISION_PACKAGE_2026-09-05.md` at the snapshot above. Its historical assertions about other obligations passing are not a fresh acceptance review of today's PDFs.

## RI — Superior Court expungement filing fee

**Families:** `ri_deferred_sentence-set`, `ri_first_offender_felony-set`, `ri_first_offender_misdemeanor-set`, `ri_multiple_misdemeanors-set`.

**Research disposition:** Use a $0 expungement filing fee for the identified Superior Court routes. The court's own expungement FAQ expressly says the process requires no fee. Treat underlying case obligations separately under the applicable statutory branch. This conclusion is court-specific; it is not a national fee rule or a ruling that every ancillary expense disappears. [RI1–RI2]

**Proposed participant text:**

> The Rhode Island Superior Court does not charge an expungement filing fee. This is separate from fines, costs, restitution, or other obligations already ordered in your case. Follow the requirements for your particular expungement route concerning any remaining obligations. A no-fee filing does not cancel an unpaid court obligation.

**Engineering effect:** Bind the exact FAQ answer as the fee source. Do not attribute a dollar amount to Superior-55 without locating that text in the actual form. Update only the affected fee instructions and their authoritative inputs. A filing-fee-waiver application is not required solely to waive a $0 filing fee; retain any distinct process addressing underlying obligations where the route requires it. Do not reopen the previously answered proposed-order decision.

**Limits:** Do not generalize a first-offender reduction/waiver rule to every deferred-sentence or multiple-misdemeanor requirement. Do not use other, potentially older eligibility descriptions elsewhere on the FAQ to replace the current statute. The court-specific fee answer and statutory eligibility conditions are separate sources.

## VT — DUI sealing fee and correct waiver form

**Family:** `vt_seal_dui-set`.

**Research disposition:** The current Judiciary fee schedule lists $90 for a motion to seal a conviction under 23 V.S.A. § 1201(a) pursuant to 13 V.S.A. § 7602 and cites **32 V.S.A. § 1431(e)**. The Judiciary's post-2025 expungement guidance describes the fee exception for offenses committed at age 25 or older. The court offers a waiver application. [VT1–VT3]

**Proposed participant text for that fee-bearing route:**

> The filing fee for this DUI-sealing petition is $90. If you cannot afford the fee, file an Application to Waive Filing Fees and Service Costs with your petition. The judge decides whether to waive the fee; submitting the application does not mean it has been granted.

**Important form correction:** The dedicated waiver page and its actual two-page PDF identify **600-00228, Application to Waive Filing Fees & Service Costs, revision 04/2026**. The criminal-record webpage still refers to 600-00229 in its explanatory prose. Use the actual form identity, not that inconsistent prose number. Both PDF pages were visually inspected. [VT2–VT4]

**Engineering effect:** Key the fee to the actual relief route and offense facts. Do not use the applicant's age today as the age-at-offense test, and do not apply $90 to every Vermont sealing family. Preserve the separate under-25 route where applicable. Acquire/bind the current 600-00228 if the delivered waiver component is obsolete, keeping its actual printed revision. Use the form's own declaration and signature treatment rather than introducing notarization.

**Source limitation:** The official Legislature endpoints for § 1431 and the Act 60 PDF did not return usable text in this session. This disposition relies on the current official court fee schedule, post-2025 court guidance, and the actual waiver form. It is not represented as an independently retrieved reading of the Act 60 enactment text.

## MS — mandatory notarized verification is already in the product record

**Family:** `ms-nonconv-set`.

**Record-based disposition:** Preserve the mandatory verification/jurat. The September 3 revision design expressly ranks Roger's mandatory-notarization direction first among its controlling inputs. The current specification, version 2.0.0, expressly requires notarized verification. The older memo's unresolved research question should not be treated as permission to omit it. [MS-R1–MS-R2]

**Existing records to use, not replace with a new legal theory:**

- `docs/rcap/grade-a/MS_CLINIC_DEMO_LAWRENCE_REVISION_DESIGN.md`
- `data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json` (internal specificationVersion: 2.0.0)
- `data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/product-wiring.json`

The design identifies the owner direction by SHA-256 `88497978c1411950ea3977a7ae32087e29fc375017cadc87b20d700c60623866` and uses Lawrence's submitted petition only as a formatting/structure guide, not a source of another person's facts or attorney representation.

**Proposed participant text, consistent with that direction:**

> Do not sign the Petition or Verification in advance. Complete and check the factual information first. Bring the packet and satisfactory identification to a notary. Take the oath or affirmation and sign in the notary's presence. Have the notary complete the certificate and affix the official stamp. Keep the verification attached to the petition. The packet is not ready for filing until the required signatures and notarial act are complete.

**Legal support for the chosen execution method:** The Secretary of State's published Rule 6.3 requires personal appearance, identification, signing before the notary, and an oath or affirmation for a verification. Section 25-34-31 addresses the certificate, seal, timing, and attachment to the record. A mere acknowledgment is not the same notarial act. [MS1–MS2]

**Engineering effect:** Render/preserve the existing specification's verification and certificate fields: venue, participant signature, notary signature/name, commission details, and seal space. Leave signatures and the actual notarial date uncompleted until execution; do not infer the notarial venue from residence. Retain the chosen notary-page layout and keep it clearly associated with the petition. Apply only the existing requirement; do not invent a new certificate that creates another review cycle.

**Limits:** This research does not claim § 99-19-71(4) independently mandates a separate notary page. The obligation being resolved is LegalEase's recorded output requirement. Existing artifact-specific approvals are not extended to different bytes. The Clinic Demo remains within its existing scope and other holds. If an actual court rule conflicts, route that concrete conflict for review; a memo saying “unresolved” is not itself such a contrary rule.

## NH — the financial statement contains service text, but is an e-filing variant

**Family:** `nh_petition_vacated-set`.

**Verified source findings:**

- NHJB-2311-Se (07/01/2018) is the **Motion for Waiver of Filing Fee**. It says a Statement of Assets and Liabilities accompanies it. [NH1]
- The exact held financial statement is **NHJB-2328-DFPe* (01/01/2018)**, three pages. Its first page says **For e-Filing only**. Its filename/receipt had left the revision unknown; the printed revision is now established. [NH2]
- Its third page contains a service certification: electronic distribution through the court system to attorneys and parties with entered electronic service contacts, and mailed/hand-delivered copies to other interested parties. This is service text, not evidence that service has already occurred. [NH2]

The recovered original is 66,063 bytes. SHA-256 was recomputed locally and exactly matches the current family receipt:

`b4384b41efb472951c28b1289e46b05dfcc9463147aa490597f541f5291ce919`

The original came from the known Drive file, not a fresh successful download from the court website. All three pages were visually inspected. [NH2–NH3]

**Statutory distinction:** RSA 651:5, IX assigns the court transmission of the annulment petition to the underlying prosecutor and requires a court-supplied form for the filing-fee-waiver request. That does not expressly settle service of the separate financial statement. [NH4]

**What can be implemented without guessing:** Correct the source's printed revision and distinguish the motion from the statement. Preserve the service certification without prechecking it, dating it, or signing it. Do not say that the held statement has no service instruction. Do not transplant an e-service representation into a paper filing or a different court workflow without confirmation.

**Remaining narrow question:** Confirm the appropriate statement version and the service treatment for the criminal annulment fee-waiver request in the relevant Circuit/District or Superior Court channel. This is not a reason to reacquire the whole New Hampshire corpus.

**Question ready for Lawrence or the appropriate clerk:**

> For an RSA 651:5 annulment filing, is the held NHJB-2328-DFPe* (01/01/2018), marked “For e-Filing only,” the accepted financial statement for the relevant court and filing channel? If yes, must the applicant serve the underlying prosecutor with both NHJB-2311 and the complete NHJB-2328, using the form's electronic-service/mail-or-delivery treatment, or is the fee-waiver submission handled ex parte or under another rule? Please identify the authority and any redaction/confidential-filing treatment. If that version is unsuitable, identify the accepted version and service instructions. The statute's court transmission of the annulment petition should not be assumed to answer this separate question.

**Interim text is not final SERVICE acceptance:** The two identified papers may be described as the waiver request and its supporting statement, but this handoff does not certify a universal paper/Superior Court service rule. Live NH court-rule and form requests were access-blocked; secondary rule reproductions were not substituted for current primary procedural authority.

## Captain integration note

Use these findings through the existing source/legal-decision mechanism with their true provenance. Preserve any required authorized adoption; do not record ChatGPT as Lawrence. Address only the affected fee, service, and jurat obligations. Keep unrelated source, legal, current-byte, and delivery holds intact.

For Rhode Island and Vermont, bind the cited official court sources and amend the affected instructions. For Mississippi, reconcile the older open question with the explicit route-specific owner direction; do not request a new decision about whether Roger wants notarization. For New Hampshire, record the resolved form identity/service text and seek only the outstanding court/channel confirmation.

Rebuild changed outputs, reuse still-valid evidence for unchanged artifacts, and complete the required independent acceptance. Do not report six or seven new proven families merely because this memo exists.

## Source locations

All online sources below were inspected on September 6, 2026. URLs identify provenance, not a claim that every original file was downloaded into this package.

**RI1** Rhode Island Superior Court FAQ, “Is there a fee associated with my expungement?”  
https://www.courts.ri.gov/Courts/superiorcourt/Pages/FAQs.aspx

**RI2** Rhode Island General Laws § 12-1.3-3, current legislative site.  
https://webserver.rilegislature.gov/Statutes/TITLE12/12-1.3/12-1.3-3.htm

**VT1** Vermont Judiciary fee schedule, Criminal Division and no-fee exceptions.  
https://www.vtcourts.gov/fees

**VT2** Vermont Judiciary, Expunging and Sealing Criminal Records, post-July 2025 guidance.  
https://www.vtcourts.gov/criminal/expungement

**VT3** Vermont Judiciary waiver instructions and correct form identity.  
https://www.vtcourts.gov/self-help/application-waive-filing-fees-and-service-costs

**VT4** Actual 600-00228 application, revision 04/2026, two pages.  
https://www.vtcourts.gov/media/47

**MS1** Mississippi Secretary of State, Revised Notary Rules, Rule 6.3, printed page 16.  
https://www.sos.ms.gov/sites/default/files/regulation-enforcement/Notary%20Rules%20-%20PDF.pdf

**MS2** Mississippi Secretary of State, Revised Mississippi Law on Notarial Acts, §§ 25-34-11, 25-34-15, 25-34-31.  
https://www.sos.ms.gov/sites/default/files/regulation-enforcement/Revised%20Mississippi%20Law%20on%20Notarial%20Acts.pdf

**MS-R1** Current route-specific revision design, at the reviewed commit.  
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/738dade9124e46dc2196fdfde0b3eba020930a5b/docs/rcap/grade-a/MS_CLINIC_DEMO_LAWRENCE_REVISION_DESIGN.md

**MS-R2** Current specification, internal version 2.0.0.  
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/738dade9124e46dc2196fdfde0b3eba020930a5b/data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json

**NH1** Held NHJB-2311-Se, read from the known Drive original.  
https://drive.google.com/file/d/1h26WShRTqxkGtT1T5Inlw0actgOaGHI2/view

**NH2** Held NHJB-2328-DFPe*, original downloaded, hashed and visually inspected.  
https://drive.google.com/file/d/1qVF9UThhFRsr58iudTRjZpIHzD2646yZ/view

**NH3** Current family source receipt identifying the exact original.  
https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/blob/738dade9124e46dc2196fdfde0b3eba020930a5b/data/rcap-all50/overlays/census-v1/nh/nh-petition-vacated-set--official-pdf-fill/source-receipt.json

**NH4** New Hampshire General Court, RSA 651:5, IX.  
https://gc.nh.gov/rsa/html/LXII/651/651-5.htm
