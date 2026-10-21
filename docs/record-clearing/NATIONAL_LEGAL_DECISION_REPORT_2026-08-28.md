# National Record-Clearing Legal Decision Report

**Current through:** August 28, 2026  
**Controlling intake:** `ALL51_CURRENT_LEGAL_QUESTIONS.md`  
**Purpose:** Legal-design decisions for LegalEase / Expungement.ai / RCAP

## Scope and method

The controlling queue states that 53 pathway/track/question tuples collapse to 49 distinct numbered questions. It separately identifies four immediate assignments and nine additional tracks that still require original legal research. This report therefore addresses:

1. the four immediate assignments;
2. every numbered question, Q-001 through Q-049; and
3. all nine additional research tracks.

The analysis prioritizes enacted statutory text, current court rules and official forms, official administrative orders, and reported appellate decisions. A clerk page or practice guide is treated as administrative evidence, not as authority capable of overriding a statute.

Each conclusion is assigned one of these product dispositions:

- **RELEASE — PACKET:** the legal question is sufficiently resolved for a participant-facing filing packet, subject to ordinary quality assurance.
- **RELEASE — GUIDANCE:** no participant filing is initially required; the correct product is process, verification, or implementation guidance.
- **CONDITIONAL — SOURCE GATE:** the merits route is legally supportable, but a clerk, solicitor, or agency instruction must be confirmed before final filing instructions are released.
- **ATTORNEY / PARTNER HANDOFF:** the route or fact pattern requires individualized legal judgment or a contested proceeding.
- **FUTURE EFFECTIVE:** the enacted pathway is not yet legally available.
- **ARTIFACT REVIEW STILL REQUIRED:** the legal design is answered, but the queue correctly requires a rendered candidate and hash before final packet approval.

This is an internal product-design memorandum. It is not a substitute for participant-specific representation, especially where eligibility depends on disputed facts, immigration consequences, firearm consequences, federal records, or contested hearings.

---

# Executive conclusions

## Highest-priority corrections

1. **Georgia § 42-8-66:** approve a distinct, participant-filed post-consent petition stage. Written prosecutorial consent is a filing prerequisite, not the final relief.
2. **Missouri § 311.326:** build the merits petition, but keep a clerk-confirmation gate for the case-opening code, caption, service, and local fee. Do not include municipal convictions merely because the ordinance is similar.
3. **North Dakota automatic nonconviction closure:** use a guidance-and-correction workflow, not a routine petition for post-August 1, 2025 dispositions.
4. **South Carolina PTI:** quote the current $250 solicitor fee, not the rescinded $150 figure, and replace the custom pleading with a solicitor-administered intake workflow.
5. **Louisiana marijuana fee:** the $300 special schedule terminated August 1, 2026. Post-sunset filings revert to the ordinary Article 983 schedule absent another exemption.
6. **Maine survivor sealing:** the statute controls over the defective CR-308 warning. A later conviction does not extinguish a § 2262-A or § 2262-B survivor-sealing order.
7. **West Virginia:** do not use the stale petition embedded in SCA-C900. Use SCA-C906 for current conviction relief, and use the statutory 30-day reply period, not the stale 10-day instruction.
8. **Alaska cannabis restriction:** the new participant-request pathway is enacted but does not take effect until January 1, 2027.
9. **Ohio:** the unresolved route is not an “under-21 drug possession” remedy. It is the new R.C. 2953.321 expungement route for specified pre-March 20, 2026 marijuana and hashish matters, without an age limit.
10. **New York CPL 160.55:** the initial process is automatic and partial. Police, prosecutor, and DCJS records are sealed, but the court file is not.

---

# Part I — Immediate assignments

## LA-IMM-01 — Georgia `ga-rfo`

### Decision

**Approve a distinct post-consent custom petition stage.**

O.C.G.A. § 42-8-66 makes prosecutorial consent a condition that must exist before the individual files. It does not make the prosecutor the final decision-maker. After consent, the individual petitions the court in which the conviction was entered, and the court independently decides whether the statutory eligibility and interests-of-justice showing has been made. A hearing is held if the petitioner or prosecutor requests one, or if the court wants one. The statute does not impose a filing fee.

The correct sequence is:

```text
eligibility screening
→ written prosecutorial consent
→ participant-filed § 42-8-66 petition
→ hearing if requested or ordered
→ judicial order granting or denying retroactive First Offender treatment
→ restriction, sealing, agency distribution, and verification
```

### Filing vehicle

Use a **custom motion or petition in the original criminal matter**, filed in the court of conviction. Preserve the original caption and case number unless the receiving clerk requires an ancillary number.

The packet should include:

- petition for retroactive First Offender treatment, exoneration, and discharge;
- written prosecutor consent, joinder, or signed consent endorsement;
- proposed order;
- hearing-request election;
- certificate of service or local notice document;
- judgment, sentence, and disposition records;
- evidence of original First Offender eligibility;
- evidence supporting the applicable § 42-8-66 branch;
- rehabilitation and interests-of-justice exhibits; and
- post-order restriction, sealing, and verification instructions.

A phone call, unanswered request, prosecutor silence, or “no known objection” is not written consent.

### July 1, 2026 implementation rule

For a retroactive discharge entered on or after July 1, 2026, the proposed order should expressly address the current restriction and court-record sealing duties. Do not generate a redundant merits petition after the court has already granted retroactive treatment. At that point the product becomes implementation and verification guidance.

### Self-help boundary

Stop self-help when consent is absent or disputed; original eligibility is uncertain; prior felony or First Offender history is unclear; the prosecutor withdraws consent; the court requires a contested evidentiary hearing; or immigration, firearm, federal, or licensing consequences require advice.

### Product disposition

```text
LEGAL HOLD: CLEARED
OUTPUT: CUSTOM PARTICIPANT PETITION
PRECONDITION: VERIFIED WRITTEN PROSECUTOR CONSENT
VENUE: COURT OF CONVICTION
DEFAULT DOCKET: ORIGINAL CRIMINAL CASE
NO CONSENT / CONTEST: ATTORNEY OR PROSECUTOR HANDOFF
```

The pathway name should be changed because § 42-8-66 is not limited to youthful offenders. A legally accurate name is `GA:retroactive-first-offender-treatment-under-42-8-66`.

---

## LA-IMM-02 — Missouri `mo-311-326-minor-in-possession`

### A. Filing mechanics

Section 311.326 creates an application to the court in which the person was sentenced but does not prescribe a statewide caption, respondent list, service method, or case-opening code.

The best-supported filing model is a **new miscellaneous civil expungement matter opened through the circuit clerk and linked to the original criminal case**. The petition should identify the original case, judgment, and sentencing division.

FI-05 is a confidential case-filing information sheet, not itself a case-type code. The recommended code hierarchy is:

1. **XG** as the provisional generic criminal/arrest-record expungement code;
2. **never X5** merely by analogy, because the published description ties X5 to § 610.140; and
3. **X1 only if the receiving clerk directs it.**

The absence of a dedicated code does not defeat the statutory remedy. It does prevent LegalEase from releasing universal administrative instructions without a clerk-practice gate.

The configurable default caption may be:

```text
In the Matter of the Application of [Name]
for Expungement Under § 311.326, RSMo
```

The final caption, code, filing category, service documents, and filing fee must be confirmed with the receiving circuit clerk.

### B. Municipal ordinance coverage

Section 311.326 repeatedly refers to a violation of **§ 311.325**. It does not contain the broader language used elsewhere to include substantially similar county or municipal ordinances.

Use this branch:

- judgment expressly under § 311.325: **eligible for the state route**;
- local ordinance expressly adopts the § 311.326 remedy: **separate local-law route**;
- ordinance merely mirrors the substantive offense: **not automatically within § 311.326**; assess § 610.140 or local relief;
- judgment ambiguous: obtain certified disposition and hold for local-law review.

Eligibility must turn on the actual statute or ordinance of conviction, not the shorthand offense label.

### Packet

The standard merits packet may include:

- custom § 311.326 petition;
- FI-05;
- proposed order;
- certified judgment/disposition;
- original docket;
- age and filing-date evidence;
- Missouri criminal-history and driving-record review;
- commercial-driver and commercial-vehicle declarations;
- prior-use declaration;
- record-custodian list; and
- local filing, service, fee, and waiver documents after clerk confirmation.

### Product disposition

```text
SUBSTANTIVE HOLD: CLEARED
OUTPUT: CUSTOM PETITION + LOCAL FILING MODULE
FILING MODEL: NEW MISCELLANEOUS CIVIL MATTER
DEFAULT CODE: XG, PROVISIONAL
X5: PROHIBITED
MUNICIPAL SCOPE: EXPRESS LOCAL ADOPTION REQUIRED
FINAL RELEASE GATE: RECEIVING-CLERK CONFIRMATION
```

---

## LA-IMM-03 — North Dakota `nd-nonconviction-auto-close-verify`

### Decision

For a qualifying nonconviction entered on or after August 1, 2025, the court record closes automatically after the statutory 61-day period. There is no initial participant petition.

The participant should verify on **day 62**, or the next court business day, because the statutory duty arises after 61 complete days have expired.

No current statute or Judicial Branch instruction promises individualized mailed or electronic notice of closure.

### Service workflow

```text
expected automatic closure
→ official case-search check on day 62
→ written clerk confirmation if needed
→ clerk implementation/correction request if still public
→ motion to enforce in original case if clerk cannot correct
→ attorney/partner handoff if eligibility is contested
```

The first generated document should be a written **Request to Implement Mandatory Closure and Correct Public-Access Status**, sent to the clerk of the original court. It should identify the case, disposition date, calculated deadline, statutory basis, and evidence of continuing public access.

If the clerk states that judicial action is required or does not correct the record, generate a **Motion to Enforce Mandatory Closure Under N.D.C.C. § 12-60.1-05** in the original criminal case with a proposed order. Because no dedicated statewide enforcement form exists, contested eligibility goes to counsel.

Pre-August 1, 2025 dispositions remain on the official petition route.

Court-record closure does not by itself correct inaccurate Bureau of Criminal Investigation or originating-agency data. Route an inaccurate criminal-history entry through the separate agency challenge process.

### Product disposition

```text
POST-2025-08-01 INITIAL OUTPUT: GUIDANCE
WAIT: 61 COMPLETE DAYS
VERIFY: DAY 62 / NEXT BUSINESS DAY
FIRST CORRECTION: WRITTEN CLERK REQUEST
SECOND CORRECTION: ORIGINAL-CASE ENFORCEMENT MOTION
NOTICE PROMISED: NO
CONTESTED ELIGIBILITY: ATTORNEY HANDOFF
```

---

## LA-IMM-04 — South Carolina `sc_pti_17_22_150`

### Decision

The governing solicitor administrative fee is **$250**, not $150.

The $150 amount came from a 2005 Supreme Court administrative order. The Supreme Court expressly rescinded that order in 2009 after the Legislature enacted the statutory statewide process. Current S.C. Code § 17-22-940(A) sets a $250 administrative fee per individual order. Subsection (G) allows one applicable set of fees when eligible § 17-1-40 or PTI charges from one incident are combined.

For an ordinary successful PTI completion:

```text
solicitor administrative fee: $250
SLED verification fee:        $0
clerk filing fee:             $35 when applicable
ordinary expected total:      $285
```

The packet should advise the participant to confirm the payee, acceptable certified checks or money orders, whether separate instruments are required, and any donated-fee assistance. It should not imply that the statutory $250 figure itself is uncertain.

### Output correction

South Carolina’s ordinary expungement process is administered by the circuit solicitor. The participant does not create and file an independent custom petition with the clerk. Retire `rcap-sc-custom-pleading` for this route and replace it with:

```text
solicitor intake guidance
+ local application prefill where allowed
+ certified-disposition checklist
+ fee/payee instructions
+ status and completion tracking
```

If the solicitor finds the matter ineligible or refuses consent, retained counsel may seek a judicial eligibility determination. That is an attorney handoff, not an ordinary self-help pleading.

### Product disposition

```text
LEGAL HOLD: CLEARED
ADMINISTRATIVE FEE: $250
OLD $150 GUIDANCE: RESCINDED
PTI ORDINARY TOTAL: $285
OUTPUT: SOLICITOR-ADMINISTERED INTAKE
CUSTOM PARTICIPANT PLEADING: RETIRE
SOLICITOR DENIAL: ATTORNEY HANDOFF
```

---

# Part II — Answers to Q-001 through Q-049

## Kentucky

### Q-001 — `ky_felony_expungement_after_pardon`

**Holding:** Treat the pardon route as available only when the operative clemency instrument expressly grants a **full pardon** of the conviction or convictions sought to be expunged.

A commutation, reprieve, remission of fine, restoration of civil rights, or partial/conditional grant is not the same legal instrument. An ambiguous document should not be characterized by participant attestation alone.

**Product rule:**

1. require upload of the complete signed clemency instrument;
2. capture the exact operative grant language and each covered conviction;
3. permit self-help when the instrument facially says “full pardon” and clearly covers the case;
4. route a conditional, partial, ambiguous, or incomplete instrument to counsel.

A conditional pardon is not necessarily categorically useless, but LegalEase should not represent it as a “full pardon” without legal review of the condition and the statute.

**Disposition:** `RELEASE — PACKET` only after a document-review gate; ambiguous instruments are `ATTORNEY / PARTNER HANDOFF`.

---

### Q-002 — `ky_felony_vacatur_expungement`

**Holding:** The statewide statutory payment schedule controls:

- **$50 nonrefundable filing fee when the application is filed**; and
- **$250 expungement fee only after the court grants relief**, payable through the statutory installment mechanism.

A local clerk page that says the entire $300 is due at filing conflicts with KRS 431.073(10)-(11) and the current AOC form. LegalEase should not repeat the conflicting local statement as the legal rule.

**Participant instruction:**

> Bring or submit the $50 filing fee with the application. If the court grants the application, the court will assess the separate $250 expungement fee. The record is not fully expunged until the $250 is paid. If a clerk requests $300 at filing, ask the clerk to confirm the requirement in writing and escalate the discrepancy before abandoning the filing.

The separate AOC expungement-certification charge is not part of the statutory $300 court-fee split and should be itemized separately.

**Disposition:** legal answer complete, but the queue’s `ARTIFACT REVIEW STILL REQUIRED` remains. The rendered packet must display the split correctly.

---

### Q-003 — `ky_nonconviction_expungement`

**Holding:** AOC-497.2’s instruction to “check all that apply” is **disjunctive and charge-specific**.

The listed disposition boxes are alternative statutory bases. A participant is not required to satisfy every box, and the form should not force only one box when different charges in the same case ended differently.

**Field logic:**

1. determine the qualifying disposition of each charge;
2. map each charge to its applicable statutory branch;
3. check every branch that applies to at least one charge in the application;
4. do not check a branch merely because it is generally available;
5. attach a charge/disposition schedule when the form does not make the mapping clear.

**Disposition:** legal answer complete; `ARTIFACT REVIEW STILL REQUIRED` for the final field map and rendered AOC-497.2.

---

## Louisiana

### Q-004 — `la-977d-marijuana-first-offense`

**Holding:** Article 983(M)’s special **$300** first-offense marijuana fee schedule became “null, void, and without effect” on **August 1, 2026**. A motion filed after that date is governed by the ordinary Article 983 schedule unless another statutory exemption, fee waiver, or in-forma-pauperis mechanism applies.

The ordinary statutory ceiling is $550:

- Bureau of Criminal Identification and Information: up to $250;
- sheriff: $50;
- district attorney: $50; and
- clerk: up to $200.

A parish cannot continue the $300 schedule merely because an old packet or webpage remains online. Local acquisition is still required for current payees, acceptable instruments, filing location, copies, and any parish-specific waiver workflow.

**Disposition:** `CONDITIONAL — SOURCE GATE`. The legal fee is resolved; current parish filing instructions remain to be acquired. Do not display $300 after August 1, 2026.

---

### Q-005 — `la-978-felony-conviction`

**Holding:** More than one felony conviction may be expunged within a single ten-year period when **each conviction independently satisfies Article 978**.

Article 978(F) defeats a product rule that would impose a universal one-felony-per-decade cap. The unit of analysis remains each conviction.

For every felony, the engine must independently determine:

- whether the offense is excluded;
- whether the sentence and supervision are complete;
- whether the applicable waiting period or exception is satisfied;
- whether there are disqualifying intervening convictions or pending matters;
- whether the applicant has the required certification and disposition records; and
- whether the conviction is part of the same case or requires a separate motion.

**Disposition:** `RELEASE — PACKET`. Do not impose a one-felony-per-ten-years limitation.

---

### Q-006 — `la-985-3-immediate-expungement`

**Holding:** The better reading is that Article 985.3 authorizes discretionary **immediate expungement upon successful completion** of the qualifying court-ordered probation or alternative sentencing program and therefore displaces the ordinary five- and ten-year waiting clocks.

Requiring the applicant to complete the ordinary waiting period would deprive “immediate” of practical meaning. “Otherwise eligible” should preserve the substantive offense, person, and record requirements rather than reinsert the timing rule that the immediate-completion provision was enacted to bypass.

This remains a reasoned statutory interpretation. No controlling appellate decision squarely interpreting the phrase was located.

**Product rule:**

- create an immediate-completion branch;
- retain all substantive exclusions and record requirements;
- state that relief is discretionary;
- use only the Article 992 order as Article 985.3 directs; and
- route an objection or judicial disagreement over the waiting period to counsel.

**Disposition:** `RELEASE — PACKET`, with a moderate-confidence legal note and attorney escalation for contested timing.

---

### Q-007 — `la-985-expungement-by-redaction`

**Holding:** Use the official Article 989 motion **plus a supplemental redaction election**, rather than replacing the statewide motion with an entirely custom pleading.

Article 985 authorizes a person to petition for redaction. The Article 989 motion does not supply a clear redaction election, while the Article 992 order contains the redaction disposition. Article 986 permits supplemental material that complies with the statutory forms framework.

The packet should contain:

- Article 989 motion;
- a supplemental “Election and Particularized Request for Redaction Under Article 985”;
- the exact name, date of birth, identifying data, page, entry, and docket location to be redacted;
- supporting records;
- Article 992 proposed order with the redaction paragraph completed;
- service documents under Article 982; and
- a warning that the clerk is not responsible for redacting information or locations not identified in the order.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

## Maine

### Q-008 — `me-nonconv`

**Holding:** Successful completion of a deferred disposition does **not automatically establish that the entire criminal-history record is confidential**.

Section 703(2)(G) distinguishes:

- a charge dismissed with prejudice by the court; and
- a charge dismissed with finality by a prosecutor outside a plea agreement.

A deferred disposition arises from a written agreement with the State, and § 1903 directs the State to dismiss with prejudice on compliance. That does not safely fit the prosecutor-dismissal branch’s “outside a plea agreement” condition. *Gordon v. Cheskin* also rejects treating the entire prior proceeding as confidential merely because the deferred disposition ended in dismissal.

The result may differ if the actual final docket or order reflects a **court dismissal with prejudice**. The product must inspect the final instrument rather than classify from the label “deferred disposition.”

**Product rule:**

- do not promise confidentiality from the disposition label;
- obtain the final docket, dismissal, and SBI record;
- treat a court dismissal with prejudice as a separate branch;
- use a correction request only when the record is demonstrably inaccurate;
- route unresolved classification to counsel.

**Disposition:** `RELEASE — GUIDANCE` with fail-closed verification; no automatic confidentiality promise.

---

### Q-009 — `me-seal-gen`

**Holding:** The motion is filed in the underlying criminal case and the prosecutorial office that represented the State is entitled to notice. Current statute and forms do not clearly state that the clerk performs every initial service act.

The absence of a certificate-of-service block on CR-218, CR-289, or CR-307 does not create a safe basis for telling a participant that no delivery to the prosecutor is required.

**Safe statewide packet:**

- file the motion with the court of conviction;
- provide the prosecutorial office a filed copy by the method accepted by that court;
- include a certificate or record of delivery, or an explicit instruction to obtain the clerk’s written direction;
- let the clerk schedule the hearing and issue court-generated notices.

**Disposition:** `CONDITIONAL — SOURCE GATE`. The prosecutor-notice requirement is clear; the exact clerk/service workflow must remain configurable.

---

### Q-010 — `me-seal-survivor`

**Holding:** The statute controls. A later conviction does **not** extinguish a sealing order entered under § 2262-A or § 2262-B.

The warning on page 2 of current form CR-308 conflicts with § 2264(7), as amended by P.L. 2025, chapter 513, which expressly exempts those survivor-sealing orders from the new-conviction extinguishment rule.

**Product treatment:**

- continue using the official form only if required;
- do not reproduce the defective warning as LegalEase advice;
- add a prominent statutory correction notice;
- preserve an escalation identifying the official-form conflict;
- do not tell a participant that a new conviction automatically reopens the survivor-sealed matter.

**Disposition:** legal answer clear, but release remains `CONDITIONAL` until the form-conflict treatment is accepted or the Judicial Branch corrects CR-308.

---

### Q-011 — `me-seal-survivor`

**Holding:** Apply the same service rule as Q-009. The prosecutorial office is entitled to notice, and the current official materials do not justify promising that the court completes all participant-side service.

**Disposition:** `CONDITIONAL — SOURCE GATE`. Include documented prosecutor delivery or clerk-confirmed instructions.

---

## Missouri

### Q-012 — `mo-610-130-first-intoxication`

**Holding:** Section 610.130 sends the application to the court in which the person pleaded guilty or was sentenced, but the published case-type list provides no section-specific code.

Use:

- **XG** as a provisional generic expungement code;
- **not X5**, because X5 is expressly associated with § 610.140; and
- **X1 only if the clerk directs.**

This is an administrative gap, not a substantive bar.

The petition/application, original judgment, driving record, criminal-history support, proposed order, and FI-05 may be standardized. The case-opening code, caption, service, fee, and summons treatment must be confirmed with the receiving clerk.

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-013 — `mo-610-140-conviction`

**Holding:** LegalEase should not promise that one circuit court can expunge unrelated cases from multiple Missouri counties.

The statutory instruction to list all crimes does not expressly grant a selected circuit statewide authority over records and cases of other circuits. Published Missouri practice has historically treated separate counties as requiring separate filings, and no controlling appellate decision authorizing one statewide petition was located.

**Product rule:**

- one county: ordinary participant petition;
- multiple cases in the same county: include all required matters under the statute;
- multiple counties: coordinated multi-packet workflow or attorney/partner handoff;
- do not charge for a “complete statewide” single petition;
- preserve the once/lifetime and numerical limits across the coordinated filings.

**Disposition:** multi-county facts are `ATTORNEY / PARTNER HANDOFF` unless a verified local multi-packet process is built. Confidence is moderate because the statutory wording is not perfectly explicit.

---

### Q-014 — `mo-610-145-mistaken-identity`

**Holding:** Failure by the prosecutor or judicial officer to provide subdivision (2)’s required notice does not eliminate the participant’s independent subdivision (1) remedy.

The participant may file the subdivision (1) petition or written motion in the court where the charge was last pending. An informal request to the prosecutor or clerk may be a useful preliminary correction step, but the statute does not make it a mandatory exhaustion requirement.

**Product flow:**

```text
missing automatic notice/order
→ optional written request to prosecutor/clerk
→ subdivision (1) petition or motion if no order issues
→ contested identity or record dispute to counsel
```

**Disposition:** `RELEASE — PACKET`.

---

## North Dakota

### Q-015 — `nd-dui-record-seal`

**Holding:** Participant copy must accurately separate the statute from the Judicial Branch procedure.

Section 39-08-01.6 says the court shall seal when the conditions are met but does not expressly say “upon petition.” The official North Dakota Courts research guide nevertheless instructs the person to file a written petition in the existing DUI case and states that a hearing is unnecessary unless the judge orders one.

**Correct instruction:**

> North Dakota law creates the sealing entitlement, and the Judicial Branch directs an eligible person to request it by written petition in the existing impaired-driving case.

Do not say that the petition trigger appears in the statutory text itself.

**Disposition:** `RELEASE — PACKET` using a custom petition in the original case.

---

### Q-016 — `nd-dui-record-seal`

**Holding:** Route impaired-driving convictions exclusively through § 39-08-01.6.

Chapter 12-60.1 does not contain an express DUI exclusion in its enumerated exclusions. The operational basis is instead:

1. § 39-08-01.6 is the specific statute enacted for impaired-driving records; and
2. the Judicial Branch expressly directs users not to use the general chapter for DUI.

The product should preserve that explanation and should not falsely quote a nonexistent express exclusion.

**Disposition:** `RELEASE — PACKET` under the DUI-specific route; no general Chapter 12-60.1 alternative.

---

## Nebraska

### Q-017 — `ne-expunge-le-error`

**Holding:** Venue is the **district court of the county in which the arrest occurred**.

Section 29-3523(9) should be implemented as a new civil petition in that district court, not as a filing in any Nebraska district court.

**Disposition:** `RELEASE — PACKET`.

---

### Q-018 — `ne-expunge-le-error`

**Holding:** The county attorney is the respondent, and the petition must be served as a new civil action.

The correct packet should identify the county attorney for the county of arrest and use the summons/service mechanism applicable to a political subdivision or public officer under Nebraska civil procedure. A courtesy copy alone is not a substitute for formal service when a new civil case has been opened.

Because local e-filing, summons issuance, and sheriff/service practices can vary, the final administrative instructions need district-court confirmation.

**Disposition:** legal party/service decision complete; `CONDITIONAL — SOURCE GATE` for local mechanics.

---

### Q-019 — `ne-expunge-le-error`

**Holding:** The candidate packet should contain more than the petition.

Required components should include:

- petition under § 29-3523(9);
- civil case-opening cover sheet;
- summons and praecipe/request for issuance;
- service instructions for the county attorney;
- proposed expungement order;
- certified arrest/case records;
- law-enforcement finding or evidence establishing mistaken identity;
- no-charge disposition evidence;
- custodian/distribution list; and
- confidentiality/redaction documents required by the court.

**Disposition:** legal component list complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

### Q-020 — `ne-seal-pardoned`

**Holding:** No statewide source establishes a filing fee for the motion filed in the existing Nebraska criminal case.

The statewide fee schedule contains no specific post-judgment criminal-motion line, and the official motion does not state an amount. LegalEase should not invent a fee or convert the motion into a new civil case merely to find a fee category.

**Product instruction:**

> No statewide fee amount is published for this existing-case motion. Confirm with the clerk of the court holding the case before obtaining payment.

The likely practical result is no new-case filing fee, but that should not be advertised as a statewide guarantee until at least county- and district-court practice is verified.

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-021 — `ne-seal-pardoned`

**Holding:** Nebraska’s in-forma-pauperis statute applies to civil or criminal cases, but the available official application forms do not fit an existing criminal case cleanly.

Use a **custom affidavit and application to proceed in forma pauperis under §§ 25-2301 to 25-2310**, together with the appropriate proposed order. Do not mislabel the matter as a new civil, name-change, or emancipation case merely to fit a checkbox.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

### Q-022 — `ne-setaside-custodial`

**Holding:** The same fee conclusion as Q-020 applies. The petition is filed in the sentencing criminal case, and no statewide published amount is established.

**Disposition:** `CONDITIONAL — SOURCE GATE`; do not display a fee until clerk practice is acquired.

---

### Q-023 — `ne-setaside-custodial`

**Holding:** Use the custom criminal-case in-forma-pauperis application described in Q-021, not a mis-scoped civil checkbox form.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

### Q-024 — `ne-setaside-custodial`

**Holding:** A conviction entered under a Nebraska Rules of the Road statute falls within the custodial-route mandatory-denial provision. A municipal ordinance conviction is not automatically a conviction “under” the state Rules merely because the local ordinance is substantively similar.

Use this branch:

- judgment cites a state Rules of the Road section: excluded;
- municipal ordinance expressly incorporates the cited state provision: high-risk/excluded or counsel review;
- municipal ordinance only resembles the state rule: do not automatically apply the exclusion;
- judgment or incorporation status unclear: local-law review.

Because no controlling Nebraska appellate decision squarely resolves the ordinance issue, do not create broad statewide eligibility for ambiguous municipal traffic judgments.

**Disposition:** state-code cases are clear; ordinance cases are `ATTORNEY / PARTNER HANDOFF`.

---

### Q-025 — `ne-setaside-noncustodial`

**Holding:** Same as Q-020 and Q-022. No statewide fee figure is established for the existing-case petition.

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-026 — `ne-setaside-noncustodial`

**Holding:** Same as Q-021 and Q-023. Use a custom criminal-case in-forma-pauperis affidavit/application and proposed order.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

## South Carolina

### Statewide process rule for Q-027 through Q-036

Except for the automatic summary-court branch addressed in Q-029, South Carolina’s ordinary expungement process is administered through the **circuit solicitor’s office for the circuit in which the offense occurred**. The solicitor screens eligibility, uses the solicitor-approved application, coordinates SLED and judicial signatures, files the completed order, and distributes it to record custodians.

LegalEase should therefore provide:

```text
solicitor intake/application assistance
+ certified-disposition checklist
+ fee and payee instructions
+ local delivery instructions
+ status tracking
+ attorney escalation if the solicitor denies eligibility
```

It should not represent an independently drafted petition as the ordinary filing vehicle.

The current standard fee components are:

- solicitor administrative fee: $250 per individual order, subject to statutory exemptions or donated-fee assistance;
- SLED verification fee: $25 when applicable; and
- clerk filing fee: $35 when applicable.

The old $150 administrative order was rescinded and cannot control current packets.

---

### Q-027 — `sc_17_1_40_general_sessions`

**Holding:** Route the participant to the circuit solicitor for the General Sessions nonconviction application.

Ordinary dismissals, nolle prosequi dispositions, no-bills, discharges, and acquittals under § 17-1-40 generally carry:

```text
administrative fee: $0
SLED fee:            $0
clerk fee:           $0
```

If the dismissal, discharge, or nolle prosequi was part of a plea arrangement in which the participant was convicted and sentenced on another charge, the administrative-fee exemption does not apply, and the expected administrative fee is $250. The § 17-1-40 SLED and clerk exemptions remain.

A same-incident grouping under § 17-22-940(G) uses one applicable fee set; it does not resurrect the rescinded $150 amount.

**Disposition:** `CONDITIONAL — SOURCE GATE` for circuit-specific application, payee, and delivery details. The legal fee rule is cleared.

---

### Q-028 — `sc_17_1_65_handgun`

**Holding:** Use the solicitor-administered application in the circuit of the offense. Section 17-1-65 is not one of the ordinary fee exemptions in § 17-22-940.

Expected standard fees, absent an applicable waiver or donated-fee subsidy:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

The single-incident one-fee rule in subsection (G) does not generally authorize consolidation for this offense.

**Disposition:** `CONDITIONAL — SOURCE GATE` for local solicitor instructions.

---

### Q-029 — `sc_17_22_950_summary`

**Holding:** For a fingerprinted summary-court matter within § 17-22-950(A), the statute places a mandatory duty on the summary court. SCCA 223E is the subsection (B) application for the non-fingerprinted branch and should not be repurposed when the court simply failed to enter the automatic order.

Use this escalation:

```text
confirm eligibility and statutory deadline
→ written implementation request to summary-court clerk/judge
→ motion in original summary case to enforce § 17-22-950(A)
→ attorney handoff for mandamus or disputed eligibility
```

The request or motion should identify the original docket, disposition, fingerprinted status, statutory deadline, and requested order. Do not open a new solicitor application merely because the summary court missed its duty.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`. Mandamus or a contested refusal is `ATTORNEY / PARTNER HANDOFF`.

---

### Q-030 — `sc_22_5_910`

**Holding:** Use the solicitor-administered application for a first eligible low-level conviction or qualifying third-degree domestic-violence conviction.

Expected ordinary fees:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

Local solicitor payees, payment instruments, application form, and delivery method remain source-acquisition items.

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-031 — `sc_22_5_910`

**Holding:** Section 22-5-910(E)’s same-incident rule affects **eligibility and conviction counting**, not the separate statutory rule governing which charges may be combined on one expungement order and one fee set.

Section 17-22-940(G) expressly allows one combined order and one applicable fee set only for qualifying charges under § 17-1-40 or § 17-22-150(a). It does not list § 22-5-910.

Therefore:

- closely connected offenses sentenced at one proceeding may be treated as one conviction for § 22-5-910 eligibility;
- each charge ordinarily still requires its own solicitor application/order and applicable fees;
- do not promise one application or one $250/$25/$35 set for a § 22-5-910 group;
- obtain solicitor confirmation if a circuit chooses to administratively package the submissions together.

**Disposition:** legal ambiguity resolved; `CONDITIONAL — SOURCE GATE` only for local packaging.

---

### Q-032 — `sc_22_5_920_yoa`

**Holding:** Use the solicitor-administered Youthful Offender Act application in the circuit of the offense.

Expected ordinary fees, absent a statutory exemption or donated-fee subsidy:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-033 — `sc_22_5_930_drug`

**Holding:** Use the solicitor-administered first-offense drug-conviction application.

Expected ordinary fees:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

The fee schedule is distinct from an actual conditional-discharge expungement under § 44-53-450(b), for which the SLED fee is exempt.

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-034 — `sc_22_5_930_drug`

**Holding:** Route by the **actual disposition**, not by the fact that the offense could have received a conditional discharge.

1. **Actual conditional discharge successfully completed:** use § 44-53-450(b). There is no conviction to place on the § 22-5-930 conviction route.
2. **Actual conviction for a charge that would now qualify for conditional discharge:** use § 22-5-930 after its waiting period and eligibility conditions.
3. **Prior actual conditional discharge within the statutory lookback:** § 22-5-930(D) bars the conviction route.
4. **Prior conditional discharge outside the lookback:** it is not the subsection (D) bar, but all other conditions still apply.
5. **Disposition unclear:** obtain certified records before routing.

This avoids treating “would now be eligible” as if the participant had actually received a conditional discharge.

**Disposition:** `RELEASE — GUIDANCE` for branching; the underlying solicitor applications remain source-gated.

---

### Q-035 — `sc_34_11_90e_check`

**Holding:** Use the circuit-solicitor application for the qualifying first-offense fraudulent-check conviction.

Expected standard fees:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

### Q-036 — `sc_56_5_750f`

**Holding:** Use the circuit-solicitor application for the qualifying first-offense failure-to-stop-for-blue-light conviction.

Expected standard fees:

```text
administrative fee: $250
SLED fee:            $25
clerk fee:           $35
expected total:      $310
```

**Disposition:** `CONDITIONAL — SOURCE GATE`.

---

## South Dakota

### Q-037 — `sd_sis_sealing`

**Holding:** Sealing under SDCL § 23A-27-17 is the court’s mandatory duty when a person is discharged and the matter dismissed under § 23A-27-14. There is no ordinary participant motion that triggers the initial sealing.

The correct product is:

```text
expected sealing at discharge/dismissal
→ verify court access status
→ written implementation request in original case
→ motion to enforce § 23A-27-17 if not corrected
→ attorney handoff for refusal or mandamus
```

Do not use a form designed for a separate arrest-expungement statute as a fallback.

The initial written request should attach the discharge/dismissal order and ask the clerk or sentencing judge to enter and implement the statutorily required sealing order. If judicial relief is needed, file in the original criminal docket.

**Disposition:** `RELEASE — GUIDANCE`; an enforcement-motion template may be built, but a contested court refusal is `ATTORNEY / PARTNER HANDOFF`.

---

## Virginia

### Q-038 — `va_exp_absolute_pardon`

**Holding:** An absolute pardon based on innocence is implemented through a mandatory intergovernmental process, not a participant-filed expungement petition.

The Secretary of the Commonwealth transmits the absolute pardon to the circuit court under § 2.2-402. The court then enters the expungement order under § 19.2-392.2. The participant does not need to prove manifest injustice, pay a petition fee, or serve a new civil action.

**Product workflow:**

```text
verify absolute innocence pardon
→ confirm transmission to circuit court
→ track entry of expungement order
→ written clerk/Secretary implementation request if delayed
→ attorney handoff only if the pardon’s scope or implementation is disputed
```

Do not convert this into the ordinary petition route used for nonconvictions.

**Disposition:** `RELEASE — GUIDANCE`.

The Virginia chapter must still be re-read before the December 1, 2026 and July 1, 2027 future-effective amendments.

---

### Q-039 — `va_seal_ancillary_matter_only`

**Holding:** Section 19.2-392.12:1(B) creates a distinct participant petition for an ancillary matter after the underlying criminal charge or conviction has already been sealed by a qualifying mechanism.

The petition is filed in the **circuit court where the underlying criminal matter was disposed of**. No filing fee applies. The Commonwealth is the adverse party, and a copy is delivered or mailed as the statute directs. The participant should obtain and submit the criminal-history material needed to establish the predicate seal. A hearing is discretionary; when the statutory predicate is established, the court shall seal the ancillary matter.

The packet should include:

- petition identifying the ancillary matter;
- underlying sealed case and statutory sealing basis;
- proof/order of underlying sealing;
- criminal-history request/result;
- proposed order;
- Commonwealth notice/certificate; and
- a narrow custodian list.

**Disposition:** `RELEASE — PACKET`, with scheduled statutory re-read dates.

---

## West Virginia

### Q-040 — `wv_acc_treatment_job_readiness`

**Holding:** Job-readiness graduation is an independent alternative to 90 days of treatment or recovery compliance, but the accelerated timing applies only to the statute’s **single-misdemeanor** branch.

Section 61-11-26a(a)(1) uses “or”:

- 90 days of successful compliance with an approved treatment, recovery, and counseling program; **or**
- completion of an approved job-readiness adult training course;

followed by completion of incarceration or supervision, whichever is later. A job-readiness graduate does not also need 90 days in a treatment program.

The conviction-level limits matter:

- **single misdemeanor:** may use the accelerated treatment-or-graduation trigger after sentence/supervision completion;
- **multiple misdemeanors:** still must wait one year after the latest of conviction, incarceration, or supervision;
- **eligible nonviolent felony:** still must wait three years after the latest of conviction, incarceration, or supervision.

The product must not apply the single-misdemeanor acceleration to the multiple-misdemeanor or felony branches.

**Disposition:** `RELEASE — PACKET`. Use an OR branch for treatment versus job readiness, followed by a separate conviction-level timing gate.

---

### Q-041 — `wv_common_conv_procedure`

**Holding:** Current enacted text does not contain a residence-county venue option for multi-county conviction expungement.

The operative statutes point to the circuit court or circuit courts in which the conviction or convictions occurred. The 2020 bill title or purpose statement cannot create venue language absent from the enacted body.

The requirement to group information by circuit court does not identify which single court would possess authority to act on all other circuits’ convictions. LegalEase should not select the participant’s residence county or any one conviction county as a statewide forum.

**Product rule:**

- single-county matters: file in the circuit court of conviction;
- genuine multi-county matters: coordinated separate petitions in each circuit, or attorney/partner handoff;
- do not sell a single “all counties” self-help petition.

**Disposition:** `ATTORNEY / PARTNER HANDOFF` or a deliberately built multi-packet workflow. Do not use residence-county venue.

---

### Q-042 — `wv_conv_multiple_misdemeanors`

**Holding:** The same conclusion as Q-041 applies. The statute supports grouping and disclosure of convictions by circuit court, but it does not name one receiving court for convictions spread across several circuits.

A participant may not safely be told to file the entire group in one selected court. A coordinated filing in each court of conviction is the conservative mechanism.

**Disposition:** multi-county route is `ATTORNEY / PARTNER HANDOFF` until a verified multi-packet design exists.

---

### Q-043 — `wv_conv_multiple_misdemeanors`

**Holding:** An excluded conviction should be omitted or severed rather than allowed to contaminate an otherwise eligible group.

The statute frames eligibility, exclusions, and the petitioner’s burden by “conviction or convictions.” It does not require a petitioner to include an ineligible conviction in the requested relief. The court can deny relief as to a conviction that fails the statutory test without logically transforming every other conviction into an excluded offense.

The practical danger is the once-per-lifetime rule. Before filing, the participant must identify **all eligible convictions they intend to clear**, while leaving ineligible convictions outside the requested order.

Use counsel when:

- the same incident contains potentially violent conduct;
- the excluded offense affects statutory counting;
- facts needed for the “nonviolent” finding are disputed; or
- omission may forfeit a later opportunity.

**Disposition:** `RELEASE — PACKET` for clearly severable eligible convictions; complex groups are `ATTORNEY / PARTNER HANDOFF`.

---

### Q-044 — `wv_conv_nonviolent_felony`

**Holding:** A participant may legally file the published felony petition, but LegalEase cannot certify the central judicial findings in § 61-11-26(p)(5)(C)-(D).

The packet may present those propositions as **findings requested from the court**, not facts established by the software. It should never tell the participant that the offense is definitively “nonviolent” when the statutory test depends on whether the conduct involved actual or potential violence.

Minimum self-help gate:

- exact statute and degree verified;
- offense not on an express exclusion list;
- no victim or conduct facts suggesting violence, intimidation, deadly weapon use, or serious injury;
- no pending disqualifying case;
- all sentence, supervision, restitution, and waiting requirements documented.

Print a conspicuous attorney-referral notice and stop generation when any conduct-based limb is uncertain.

**Disposition:** legal design supports a narrow `RELEASE — PACKET`, but the queue’s `ARTIFACT REVIEW STILL REQUIRED` remains. Counsel may reasonably choose to keep the route referral-only until a review partner exists.

---

### Q-045 — `wv_conv_single_misdemeanor`

**Holding:** Use **SCA-C906**, not the petition embedded in SCA-C900.

SCA-C900’s embedded petition is materially stale. It contains a superseded age range, old conviction restrictions, a 2009 statutory citation, and obsolete subsection references. SCA-C906 tracks the current subsection structure and includes the § 61-11-26a elections.

SCA-C900 may be retained only as an instruction source after every stale statement is removed or corrected. It should not be generated as the operative petition.

**Disposition:** legal form decision complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

### Q-046 — `wv_conv_single_misdemeanor`

**Holding:** The current statute controls over the stale instruction sheet.

The government recipients have 30 days after service to oppose, and the petitioner has **30 days after service of the opposition** to reply. The SCA-C900 statement that the petitioner has ten days is wrong and cites the wrong subsection.

Service must reach the entities required by the current statute, including the State Police, prosecuting attorney for each county of conviction, arresting law-enforcement agency, correctional institution when applicable, and court maintaining the record.

**Participant instruction:**

> The statute permits 30 days to reply after service of an opposition. Filing earlier is prudent, but LegalEase will not state that a ten-day period is legally controlling.

**Disposition:** `RELEASE — PACKET`; local service addresses remain source data, not a legal ambiguity.

---

### Q-047 — `wv_nc_acquittal_dismissal`

**Holding:** SCA-C903 is old but remains a workable official vehicle for a straightforward acquittal or dismissal that satisfies current § 61-11-25.

Its citation and revision date predate multiple amendments, so the packet should add a current-law cover or supplement identifying the present statutory subsection, current waiting rule, same-transaction facts when relevant, and required custodian information.

Do not alter the official PDF’s language invisibly. Add the current supplement and proposed order as distinct packet components.

**Disposition:** legal form choice complete; `ARTIFACT REVIEW STILL REQUIRED`.

---

### Q-048 — `wv_nc_diversion_deferred`

**Holding:** SCA-C903 alone is not the correct complete vehicle for a deferred-adjudication or diversion dismissal.

The current statute calls for a civil petition and contains facts not captured by SCA-C903, including the deferred-adjudication basis, same-transaction or occurrence recital, and the relevant plea/dismissal carve-outs. The official form’s caption “for Reasons Other than Entry of a Plea” also makes it a poor standalone fit for a disposition involving an entered and later withdrawn plea.

Use a **custom civil petition under current § 61-11-25**, or the official form accompanied by a full statutory supplemental petition only if the receiving court confirms that practice. Include:

- underlying case and disposition;
- deferred-adjudication/diversion statute;
- compliance and dismissal records;
- 60-day timing calculation when applicable;
- same-transaction statement;
- statement addressing any plea to another offense;
- proposed order;
- civil service and custodian list.

**Disposition:** legal design complete; `ARTIFACT REVIEW STILL REQUIRED`. A custom petition is preferred.

---

### Q-049 — `wv_pardon_expungement`

**Holding:** Section 5-1-16a(b) does not create a general “the event never occurred” rule or a universal right to deny the record to ordinary employers.

The statute expressly prohibits consideration of the expunged record in:

1. an application to a West Virginia educational institution; and
2. an application for a license required by a West Virginia professional organization.

Unlike §§ 61-11-25 and 61-11-26, it does not state that the proceeding is deemed never to have occurred or provide a broad nondisclosure rule.

**Participant instruction:**

- the public record is expunged as the order directs;
- the statute expressly protects the two listed application contexts;
- do not advise a participant to answer “no” to every ordinary-employment question;
- answer the question exactly as phrased and obtain counsel for federal, security-clearance, firearm, immigration, or profession-specific disclosure duties.

**Disposition:** `RELEASE — GUIDANCE` with a narrow effects statement.

---

# Part III — Nine additional tracks requiring legal research

## Alaska — `ak-set-aside`

### Legal mechanism

A person who received a suspended imposition of sentence under AS 12.55.085 ordinarily should receive the set-aside determination at discharge. If discharge occurred without a set-aside decision, Alaska appellate law permits a belated determination focused on the circumstances that existed when probation was discharged.

The participant-facing vehicle is a **custom motion in the original sentencing criminal case**, not a new civil petition.

### Packet

- Motion for Belated Determination and Set-Aside Under AS 12.55.085(e);
- discharge order and probation-completion record;
- judgment and sentencing documents;
- evidence concerning compliance and rehabilitation as of discharge;
- statement addressing the exclusions in subsection (f);
- prosecutor service;
- proposed order; and
- instructions explaining that a set-aside does not physically erase the historical court file.

The sentencing court is the destination. No Alaska Court System form specific to a post-discharge request was located.

### Self-help boundary

Use counsel where the State alleges probation violations, the court previously denied set-aside relief, the discharge status is disputed, the offense may fall within subsection (f), or the participant seeks to litigate constitutional or collateral consequences beyond the statutory set-aside.

### Product disposition

```text
LEGAL RESEARCH: COMPLETE
OUTPUT: CUSTOM ORIGINAL-CASE MOTION
DESTINATION: SENTENCING COURT
SERVICE: PROSECUTOR
CONTESTED CASE: ATTORNEY HANDOFF
```

---

## Alaska — `ak-cannabis-seal`

### Current legal status

HB 239 became Chapter 9, SLA 2026. The provisions amending AS 12.62.160 and adding subsection (f) take effect **January 1, 2027**. As of August 28, 2026, this participant-request route is not yet legally operative.

The enacted future rule allows a person to request that an agency not release qualifying criminal justice information when the matter involved:

- a conviction under AS 11.71.060 or a municipal ordinance with similar elements;
- less than one ounce of a schedule VIA controlled substance;
- a person who was at least 21;
- no other criminal conviction in the same case; and
- a request to the agency not to release the record.

The temporary request condition is repealed January 1, 2028, after which the statutory nondisclosure becomes automatic for qualifying records.

### Receiving entity and output

The statute is framed as a restriction on the **agency holding and releasing criminal justice information**. It is not a court petition. The initial default destination should be the Department of Public Safety’s central repository, with additional agency-specific requests where another criminal justice agency possesses and releases the record.

“Criminal justice information” under Title 12 does not automatically include the public court file. Alaska CourtView restrictions are governed separately by court-access rules. The product must not promise that the agency request seals the court docket.

No final official HB 239 request form or single statewide submission portal had been published as of this review.

### Product disposition

```text
STATUS: FUTURE EFFECTIVE
LAUNCH DATE: NOT BEFORE 2027-01-01
OUTPUT AFTER EFFECTIVE DATE: AGENCY NONDISCLOSURE REQUEST
COURT PETITION: NO
RECHECK: DPS GUIDANCE AND FORM BEFORE LAUNCH
```

LegalEase may prebuild the request and routing logic, but direct delivery and payment must remain disabled until the effective date and a final agency-source check.

---

## Alaska — `ak-correct-record`

### Legal mechanism

AS 12.62.170 creates an administrative correction process for inaccurate or incomplete criminal justice information.

The participant first challenges the record through the Department of Public Safety or the agency responsible for the disputed data, using the published **Request to Correct Criminal Justice Information** form and supporting documentation.

The challenge should identify:

- the precise entry;
- why it is inaccurate or incomplete;
- the correct disposition or data;
- the originating agency and case;
- certified disposition, identity documents, and fingerprints where required; and
- the correction requested.

A disagreement about whether an accurate event should be sealed or expunged is not a correction claim.

If the agency issues a final adverse decision, judicial review proceeds through an administrative appeal to the Alaska Superior Court under the applicable appellate rules. That appeal is not an ordinary self-help record-clearing packet.

### Product disposition

```text
INITIAL OUTPUT: OFFICIAL AGENCY CORRECTION FORM + EVIDENCE CHECKLIST
INITIAL DESTINATION: DPS / RESPONSIBLE ORIGINATING AGENCY
ADVERSE FINAL DECISION: SUPERIOR-COURT ADMINISTRATIVE APPEAL
APPEAL: ATTORNEY HANDOFF
```

---

## Alabama — `al-olr`

### Destination

The Order of Limited Relief is a civil petition under Ala. Code chapter 12-26.

Use the following venue rules:

- Alabama circuit-court conviction: circuit civil court in the county that imposed the conviction;
- Alabama district- or municipal-court conviction: circuit civil court in the county where the offense occurred;
- qualifying convictions from more than one Alabama circuit: a circuit court in a county that imposed one of the convictions, subject to the statute’s joinder provisions;
- federal conviction: circuit civil court in the Alabama county where the petitioner resides;
- out-of-state or foreign conviction: the petitioner must first obtain the comparable relief available from the convicting jurisdiction, then petition the circuit civil court of Alabama residence.

### Mechanism

Use the official Alabama AOC Order of Limited Relief packet, including the sworn petition and proposed order. The proceeding is civil. A hearing is not invariably required; the court may decide on the record and must rule within the statutory period absent good cause.

The statutory administrative fee is **$100 and is not waivable**, although an indigent petitioner may receive the permitted payment-plan treatment. Ordinary court costs are separate.

### Self-help boundary

Refer to counsel when:

- the collateral consequence is not identified with specificity;
- a prohibited offense or registration consequence may apply;
- an out-of-state jurisdiction has no clear comparable relief;
- multiple counties or jurisdictions create joinder problems;
- an agency contests the requested limitation; or
- the petition asks to eliminate a consequence that chapter 12-26 does not authorize the court to override.

### Product disposition

```text
LEGAL RESEARCH: COMPLETE
OUTPUT: OFFICIAL AOC LIMITED-RELIEF PACKET
FORUM: CIRCUIT CIVIL COURT UNDER § 12-26-3
ADMINISTRATIVE FEE: $100, NONWAIVABLE
COMPLEX / FOREIGN: ATTORNEY HANDOFF
```

---

## Alabama — `al-uncharged-arrest`

### Governing mechanism

Sections 41-9-645 and 41-9-646 provide a process to inspect and correct or supplement inaccurate, incomplete, or misleading criminal justice information. They are not a general expungement remedy for an accurate arrest merely because no charge followed.

The first step is an administrative challenge to ALEA/ACJIC or the originating criminal justice agency under the current record-challenge procedure. The participant supplies identity verification, fingerprints if required, the challenged entry, and certified proof of the correct disposition.

If the agency denies the challenge, the individual may seek de novo review in circuit court within the statutory period. Venue lies in the circuit court of the person’s residence or the county where the agency is located, and notice must be provided in the statutorily prescribed manner. The statute permits the matter to proceed without advance costs or bond.

### Route distinction

- **record is wrong, incomplete, or assigned to the wrong person:** §§ 41-9-645 to -646 correction route;
- **record is accurate, but the participant seeks expungement of an uncharged arrest:** assess the separate Alabama expungement statute in Title 15;
- **identity theft or disputed biometrics:** agency correction first, counsel if unresolved.

### Product disposition

```text
OUTPUT: AGENCY RECORD-CHALLENGE PACKET
COURT OUTPUT: CUSTOM APPEAL ONLY AFTER FINAL DENIAL
ACCURATE UNCHARGED ARREST: SEPARATE EXPUNGEMENT ROUTE
CONTESTED APPEAL: ATTORNEY HANDOFF
```

---

## California — `ca-1203-4b`

### Destination and mechanism

A § 1203.4b petition is filed in the **superior court that entered the conviction**. It is a discretionary petition for dismissal and set-aside for a qualifying person who performed fire-camp or hand-crew service and satisfies the statutory conditions.

California has dedicated Judicial Council forms:

- **CR-430** — petition;
- **CR-431** — cover sheet and required certification material;
- **CR-432** — proposed order;
- **CR-430-INFO** — information sheet; and
- **CR-106** — proof of service when required.

Do not substitute the general CR-180/CR-181 dismissal forms.

### Packet and service

The packet should include the Judicial Council forms, CDCR or county certification of qualifying service, judgment and sentence, restitution/completion information, prosecutor notice and proof of service, and supporting interests-of-justice material.

Relief dismisses and sets aside the conviction; it is not literal erasure, does not restore firearm rights by itself, and does not eliminate all licensing, immigration, or recidivist consequences.

### Self-help boundary

Refer to counsel for an excluded offense, missing or disputed service certification, contested restitution/completion, immigration or firearm consequences, or a prosecutor objection requiring individualized advocacy.

### Product disposition

```text
LEGAL RESEARCH: COMPLETE
OUTPUT: OFFICIAL CR-430 / CR-431 / CR-432 PACKET
VENUE: SENTENCING SUPERIOR COURT
RELIEF: DISCRETIONARY DISMISSAL / SET-ASIDE
```

---

## Colorado — `co_mistaken_identity_expungement`

### Governing mechanism

C.R.S. § 24-72-702 creates a mandatory agency-first procedure.

No later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, the arresting agency must petition the district court in the judicial district where the arrest occurred.

If the arresting agency fails to file within that period, the person may file the petition in the same district court. No filing fee or other expungement cost may be charged.

This route depends on an actual agency finding of mistaken identity. It is not a general vehicle for litigating innocence where the agency has never made that determination.

### Participant-facing output

No dedicated statewide JDF form was located. Use a custom civil petition containing:

- the agency’s mistaken-identity finding;
- proof that no charges were filed;
- arrest date, agency, identifiers, and case/incident number;
- the expired 90-day agency deadline;
- a complete record-custodian list;
- proposed mandatory expungement order; and
- post-order distribution and verification instructions.

If there is no agency finding, the first output should be a written request for investigation and finding, not the court petition.

### Product disposition

```text
LEGAL RESEARCH: COMPLETE
OUTPUT: CUSTOM NO-FEE DISTRICT-COURT PETITION
PRECONDITION: AGENCY MISTAKEN-IDENTITY FINDING + NO CHARGES
VENUE: JUDICIAL DISTRICT OF ARREST
NO FINDING / DISPUTE: AGENCY REQUEST, THEN ATTORNEY HANDOFF
```

---

## New York — `ny_160_55_violation`

### Governing mechanism

CPL § 160.55 provides **automatic partial sealing** when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise.

For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies.

### What is sealed

The partial seal reaches:

- fingerprints and palmprints;
- booking photographs;
- DCJS records;
- police records; and
- prosecutor records.

It does **not seal the court file**. Current New York Courts guidance and appellate authority expressly distinguish § 160.55 from the full court-record sealing language in § 160.50.

Qualifying violations may therefore disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable.

### Correction workflow

```text
expected automatic partial seal
→ obtain certificate of disposition
→ check official criminal-history result
→ ask sentencing court to transmit/correct sealing notice
→ send certified disposition to DCJS for correction
→ motion or counsel if court previously entered an interests-of-justice nonsealing order
```

A pre-November 1, 1991 qualifying case may require a motion under the statute’s legacy branch.

CPL § 160.57 Clean Slate is separate. Do not promise that ordinary § 160.55 violations will receive full court-file sealing through § 160.55.

### Product disposition

```text
OUTPUT: GUIDANCE + CORRECTION REQUEST
INITIAL PETITION: NONE FOR ORDINARY MODERN CASE
EFFECT: PARTIAL SEAL; COURT FILE PUBLIC
CONTESTED NONSEALING: ATTORNEY HANDOFF
```

---

## Ohio — `oh-ls-5`

### Correct legal identity

Rename the track. Current R.C. 2953.321 is **Expungement of Marijuana or Hashish Possession Offenses**. It is not limited to people under 21.

The law took effect March 20, 2026 and applies to specified matters occurring before that date, including:

- R.C. 2925.11(C)(3)(a);
- R.C. 2925.11(C)(7)(a) or (b); and
- R.C. 2925.11(C)(7)(c) or (d) involving no more than 15 grams of hashish.

It covers a qualifying dismissed charge, conviction, or guilty plea.

### Filing mechanism

The person applies to the **sentencing court** at any time on or after March 20, 2026. The application must:

- identify the applicant, offense, date, court, and disposition;
- include evidence of the qualifying statutory subsection, amount when relevant, and pre-effective-date timing; and
- request expungement under R.C. 2953.321.

The court sets a hearing 45 to 90 days after filing, notifies the prosecutor, obtains any required probation inquiry, and balances the applicant’s interests against legitimate governmental needs.

The filing fee is $50 unless the applicant is indigent.

If granted, the court orders destruction, deletion, and erasure of official records and index references. The proceedings are treated as not having occurred to the extent the statute provides.

No statewide Supreme Court form specific to R.C. 2953.321 was located.

### Product disposition

```text
ROUTE NAME: PRE-2026 MARIJUANA / HASHISH EXPUNGEMENT
OUTPUT: CUSTOM APPLICATION + EVIDENCE + PROPOSED ORDER
VENUE: SENTENCING COURT
FEE: $50, INDIGENCY EXCEPTION
AGE LIMIT: NONE
```

---

# Part IV — Implementation matrix

| ID | State | Controlling product decision | Disposition |
|---|---|---|---|
| Q-001 | KY | Full-pardon document review | RELEASE — PACKET, document gate |
| Q-002 | KY | $50 filing / $250 after grant | ARTIFACT REVIEW STILL REQUIRED |
| Q-003 | KY | Charge-level disjunctive checkboxes | ARTIFACT REVIEW STILL REQUIRED |
| Q-004 | LA | Post-sunset ordinary fee schedule | CONDITIONAL — SOURCE GATE |
| Q-005 | LA | Multiple felonies allowed if independently eligible | RELEASE — PACKET |
| Q-006 | LA | Immediate-completion branch | RELEASE — PACKET; contested timing to counsel |
| Q-007 | LA | Official motion + redaction supplement | ARTIFACT REVIEW STILL REQUIRED |
| Q-008 | ME | No automatic confidentiality promise | RELEASE — GUIDANCE |
| Q-009 | ME | Prosecutor notice; local method | CONDITIONAL — SOURCE GATE |
| Q-010 | ME | Statute overrides CR-308 warning | CONDITIONAL — FORM-CONFLICT GATE |
| Q-011 | ME | Prosecutor notice; local method | CONDITIONAL — SOURCE GATE |
| Q-012 | MO | XG provisional; clerk confirmation | CONDITIONAL — SOURCE GATE |
| Q-013 | MO | No promised one-court statewide petition | ATTORNEY / MULTI-PACKET |
| Q-014 | MO | Subdivision (1) filing remains available | RELEASE — PACKET |
| Q-015 | ND | Original-case petition per court guide | RELEASE — PACKET |
| Q-016 | ND | DUI-specific statute only | RELEASE — PACKET |
| Q-017 | NE | District court, county of arrest | RELEASE — PACKET |
| Q-018 | NE | County attorney respondent; civil service | CONDITIONAL — SOURCE GATE |
| Q-019 | NE | Petition + summons/praecipe/order | ARTIFACT REVIEW STILL REQUIRED |
| Q-020 | NE | No statewide existing-case fee published | CONDITIONAL — SOURCE GATE |
| Q-021 | NE | Custom criminal-case IFP papers | ARTIFACT REVIEW STILL REQUIRED |
| Q-022 | NE | No statewide existing-case fee published | CONDITIONAL — SOURCE GATE |
| Q-023 | NE | Custom criminal-case IFP papers | ARTIFACT REVIEW STILL REQUIRED |
| Q-024 | NE | State Rules offense excluded; ordinance review | CONDITIONAL / ATTORNEY |
| Q-025 | NE | No statewide existing-case fee published | CONDITIONAL — SOURCE GATE |
| Q-026 | NE | Custom criminal-case IFP papers | ARTIFACT REVIEW STILL REQUIRED |
| Q-027 | SC | Solicitor process; statutory exemptions | CONDITIONAL — SOURCE GATE |
| Q-028 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-029 | SC | Clerk request → original-case enforcement | ARTIFACT REVIEW STILL REQUIRED |
| Q-030 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-031 | SC | Aggregation affects eligibility, not one order | CONDITIONAL — SOURCE GATE |
| Q-032 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-033 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-034 | SC | Actual disposition controls route | RELEASE — GUIDANCE |
| Q-035 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-036 | SC | Solicitor process; ordinary $310 | CONDITIONAL — SOURCE GATE |
| Q-037 | SD | Automatic sealing; enforcement if missed | RELEASE — GUIDANCE |
| Q-038 | VA | Pardon implementation, no participant petition | RELEASE — GUIDANCE |
| Q-039 | VA | No-fee ancillary-matter petition | RELEASE — PACKET |
| Q-040 | WV | Job-readiness is an OR trigger for single misdemeanor only | RELEASE — PACKET |
| Q-041 | WV | No residence-county venue | ATTORNEY / MULTI-PACKET |
| Q-042 | WV | No single receiving court identified | ATTORNEY / MULTI-PACKET |
| Q-043 | WV | Omit/sever excluded conviction | RELEASE — PACKET; complex group to counsel |
| Q-044 | WV | Narrow felony self-help boundary | ARTIFACT REVIEW STILL REQUIRED |
| Q-045 | WV | Use SCA-C906, not SCA-C900 petition | ARTIFACT REVIEW STILL REQUIRED |
| Q-046 | WV | Current 30-day reply period | RELEASE — PACKET |
| Q-047 | WV | SCA-C903 + current-law supplement | ARTIFACT REVIEW STILL REQUIRED |
| Q-048 | WV | Custom current-law civil petition preferred | ARTIFACT REVIEW STILL REQUIRED |
| Q-049 | WV | Narrow statutory effect; no universal nondisclosure | RELEASE — GUIDANCE |


# Part V — Primary authority index

The links below are the principal public sources used for the legal decisions. Statutory section numbers in the body remain controlling even if an agency later changes its page structure.

## Georgia

- [O.C.G.A. § 42-8-66](https://law.justia.com/codes/georgia/title-42/chapter-8/article-3/section-42-8-66/)
- [Georgia Supreme Court, *Sumrall v. State*, S24A1368 (2024)](https://law.justia.com/cases/georgia/supreme-court/2024/s24a1368.html)
- [Georgia HB 162, 2025–2026 session](https://www.legis.ga.gov/legislation/69600)

## Kentucky

- [KRS 431.073](https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=53904)
- [Kentucky Courts — Expungement Certification Process](https://kycourts.gov/AOC/Information-and-Technology/Pages/Expungement.aspx)
- [AOC-496.3 felony expungement application](https://www.kycourts.gov/Legal-Forms/Legal%20Forms/496.3.pdf)

## Louisiana

- [Code of Criminal Procedure Article 983](https://www.legis.la.gov/legis/Law.aspx?d=919675)
- [Article 985.3](https://legis.la.gov/legis/Law.aspx?d=1386721)
- [Louisiana Legislature law search](https://www.legis.la.gov/legis/LawsContents.aspx)

## Maine

- [16 M.R.S. § 703](https://legislature.maine.gov/statutes/16/title16sec703.html)
- [17-A M.R.S. § 1903](https://legislature.maine.gov/statutes/17-A/title17-Asec1903.html)
- [15 M.R.S. § 2264](https://legislature.maine.gov/statutes/15/title15sec2264.html)
- [Maine Judicial Branch court forms](https://www.courts.maine.gov/forms/index.html)

## Missouri

- [Mo. Rev. Stat. § 311.326](https://revisor.mo.gov/main/OneSection.aspx?section=311.326)
- [Mo. Rev. Stat. § 610.130](https://revisor.mo.gov/main/OneSection.aspx?section=610.130)
- [Mo. Rev. Stat. § 610.140](https://revisor.mo.gov/main/OneSection.aspx?section=610.140)
- [Mo. Rev. Stat. § 610.145](https://revisor.mo.gov/main/OneSection.aspx?section=610.145)
- [FI-05 and Missouri case-filing information](https://stlcountycourts.com/forms/associate-civil/confidential-case-filing-information-sheet/)

## North Dakota

- [N.D.C.C. chapter 12-60.1](https://ndlegis.gov/cencode/t12c60-1.pdf)
- [N.D.C.C. chapter 39-08, including § 39-08-01.6](https://ndlegis.gov/cencode/t39c08.pdf)
- [North Dakota Courts Legal Self Help](https://www.ndcourts.gov/legal-self-help)

## Nebraska

- [Neb. Rev. Stat. § 29-3523](https://nebraskalegislature.gov/laws/statutes.php?statute=29-3523)
- [Neb. Rev. Stat. § 29-2264](https://nebraskalegislature.gov/laws/statutes.php?statute=29-2264)
- [Neb. Rev. Stat. § 25-2301.01](https://nebraskalegislature.gov/laws/statutes.php?statute=25-2301.01)
- [Nebraska Judicial Branch self-help forms](https://supremecourt.nebraska.gov/self-help)

## South Carolina

- [S.C. Code chapter 17-22](https://www.scstatehouse.gov/code/t17c022.php)
- [S.C. Code chapter 22-5](https://www.scstatehouse.gov/code/t22c005.php)
- [South Carolina Courts — General Sessions Expungement Process](https://www.sccourts.org/resources/general-public/expungement-application-process/for-general-sessions/)
- [2009 order rescinding the 2005 Supreme Court fee order](https://www.sccourts.org/courtOrders/displayOrder.cfm?orderNo=2009-07-06-01)

## South Dakota

- [SDCL § 23A-27-17](https://sdlegislature.gov/Statutes/23A-27-17)

## Virginia

- [Virginia Code chapter 23.2](https://law.lis.virginia.gov/vacode/title19.2/chapter23.2/)
- [Virginia Code § 2.2-402](https://law.lis.virginia.gov/vacode/title2.2/chapter4/section2.2-402/)

## West Virginia

- [W. Va. Code § 61-11-25](https://code.wvlegislature.gov/61-11-25/)
- [W. Va. Code § 61-11-26](https://code.wvlegislature.gov/61-11-26/)
- [W. Va. Code § 61-11-26a](https://code.wvlegislature.gov/61-11-26A/)
- [W. Va. Code § 5-1-16a](https://code.wvlegislature.gov/5-1-16A/)
- [West Virginia Judiciary court forms](https://www.courtswv.gov/legal-community/court-forms.html)

## Alaska

- [HB 239, enrolled, 34th Legislature](https://www.akleg.gov/basis/Bill/Text/34?Hsid=HB0239Z)
- [HB 239 bill status](https://www.akleg.gov/basis/Bill/Detail/34?Root=hb+239)
- [Alaska Department of Public Safety background-check forms](https://dps.alaska.gov/Statewide/R-I/Background/Home)

## Alabama

- [Alabama Judicial System forms](https://judicial.alabama.gov/docs/library.cfm)
- [Alabama Legislature bill and code service](https://alison.legislature.state.al.us/)
- [ALEA criminal records and identification services](https://www.alea.gov/sbi/criminal-records-identification-unit)

## California

- [California Judicial Council court forms](https://courts.ca.gov/forms-rules/court-forms)
- [California Courts record-cleaning guidance](https://selfhelp.courts.ca.gov/clean-your-record)
- [California Legislative Information](https://leginfo.legislature.ca.gov/faces/codes.xhtml)

## Colorado

- [HB 24-1133, chapter 384](https://leg.colorado.gov/laws/session-laws/HB24-1133/384/download)
- [Colorado Judicial Branch forms](https://www.coloradojudicial.gov/self-help-forms)

## New York

- [CPL § 160.55](https://www.nysenate.gov/legislation/laws/CPL/160.55)
- [New York Courts — Violations and Traffic Infractions](https://www.nycourts.gov/help/criminal/sealed-records-violations-and-traffic-infractions-cpl-ss-16055)
- [CPL § 160.57](https://www.nysenate.gov/legislation/laws/CPL/160.57)
- [*Kokoska v. Joe Tahan's Furniture Liquidation Centers*, 243 A.D.3d 16 (2025)](https://www.nycourts.gov/reporter/3dseries/2025/2025_04130.htm)

## Ohio

- [R.C. 2953.321](https://codes.ohio.gov/ohio-revised-code/section-2953.321)

---

# Final release instructions

1. **Do not treat source-acquisition rows as unresolved law.** Their legal route is often clear; what remains is the local filing cover, payee, address, service channel, or case code.
2. **Do not send output-first rows to final legal approval without the required rendered artifact and hash.** This report supplies the governing legal design, not the visual/field-level approval that the controlling queue requires.
3. **Keep future-effective and re-read dates in code.** Alaska’s cannabis request cannot launch before January 1, 2027. Virginia requires scheduled re-reads before December 1, 2026 and July 1, 2027.
4. **Preserve uncertainty rather than inventing local practice.** Missouri case codes, Nebraska existing-case fees, Maine prosecutor-service mechanics, and South Carolina circuit-specific solicitor instructions need verified source records.
5. **Treat contested facts as legal handoffs.** A form packet is not an eligibility adjudication where violence, identity, pardon scope, municipal-law equivalence, or prior relief is disputed.
