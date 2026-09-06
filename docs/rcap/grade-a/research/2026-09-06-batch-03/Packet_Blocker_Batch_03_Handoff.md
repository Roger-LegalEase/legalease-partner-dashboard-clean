# LegalEase packet blockers: batch 03

**Research date:** September 6, 2026  
**Repository snapshot examined:** `ca6158a5314c277594c63ee0619fd0787163b49a`  
**Repository:** `Roger-LegalEase/legalease-partner-dashboard-clean`  
**Captain:** existing Claude Captain on `claude/legalease-sprint-captain-utucnw`  
**Status:** legal research and proposed implementation content; not counsel approval, a filed pleading, a packet-verification verdict, or release authority.

## Deliverable and scope

This batch addresses four unresolved subjects identified in the current owner-decision package and checkpoint. It does not repeat batches 01 or 02. Apply only missing corrections after comparing them with current Captain work. All four target families were still listed as legal-blocked in the examined checkpoint. The same checkpoint records 160 proven packet families; research completed here must not be added to that count.

| Family | Supported result | Boundary still requiring action |
|---|---|---|
| `ky_felony_expungement_after_pardon-set` | Official-form, paid/IFP, verification, clerk-notice and hearing inputs identified | Adopt the route treatment through existing authority; actual waiver order governs fee relief |
| `composed-treatment:nd-nonconviction-auto-close-verify` | Statutory timing and exclusions established; complete motion procedure identified | Approve the proposed administrative-letter/enforcement design, not merely the clock |
| `composed-treatment:obligation:runtime-only:OK:human-trafficking-survivor-relief` | District-court level, defendant petition, limited statutory remedy, current notice provisions | Confirm county/case docketing for the precise record; do not adopt unenacted HB 3835 |
| `composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708` | Defendant's post-conviction motion in the court that entered conviction | Bind current service/scheduling and sensitive-evidence procedure before filing instructions are released |

**Repository source:** `docs/rcap/grade-a/captain/OWNER_DECISION_PACKAGE_2026-09-05.md`, items B4, B7 and B8; `data/rcap-grade-a/packet-factory-24h/CHECKPOINT.json`, both at the snapshot above. The package's recommendations are not legal authority. Its PF10 reference does not establish the current location or shape of Kentucky's thirteen worklist fields: the current PF10 return read in this session contains other subjects. The thirteen answers below are a proposed content worklist, not a claim to have parsed thirteen current schema keys.

## 1. Kentucky: expungement following a full pardon

### Disposition

Use **AOC-496.3, Application to Vacate and Expunge Felony Conviction**, printed revision **6-23**, with the **full-pardon election only**. Do not replace the official application with a custom motion or require the separate discretionary Class-D rehabilitation showing for this category. [KY1, KY2]

The pardon creates the category under KRS 431.073(1)(c); it is not itself an expungement and does not, merely by its date, supply the waiting-period anchor. Use the current statute's generally applicable completion, five-year history, and pending-case conditions. [KY1]

### Thirteen implementation answers

| Input | Answer |
|---|---|
| 1. Filing vehicle | AOC-496.3, filed as a motion in the original criminal case. [KY1, KY2] |
| 2. Actor | The pardoned person, appearing pro se unless represented. Do not use attorney signature language for a pro-se filer. [KY1, KY2] |
| 3. Court/case | The court of conviction, through that county's Circuit Court Clerk. One operative filing per original criminal case; include related underlying District Court case information where the form requests it. [KY1, KY2, KY3] |
| 4. Eligibility/anchor | Full pardon covering the conviction; five years after sentence completion or successful completion of probation/parole, whichever is later; no felony/misdemeanor conviction during the preceding five years; no pending or newly instituted felony/misdemeanor proceeding. Do not substitute the pardon date without records establishing that it ended the sentence. [KY1] |
| 5. Filing deadline | No special outer deadline running from the pardon was identified in this provision. In the ordinary certification branch, file while the certification remains valid: court guidance says it expires in 30 days. [KY1, KY4] |
| 6. Attachments | Full pardon; current certification for the ordinary paid branch; any needed labeled continuation sheets. Do not combine unrelated case captions or omit charges merely because they were not felonies. [KY2, KY3] |
| 7. Verification | The official application already has the applicant's sworn verification. Sign in the presence of a notary or Circuit Court Clerk as the form directs. A separate duplicative affidavit is not needed just to repeat this verification. [KY2] |
| 8. Cover sheet | No statewide civil cover sheet is identified for this original-case filing. Do not insert one by default; check genuinely applicable local administrative requirements. [KY1–KY3] |
| 9. Proposed order | The statewide clerk workflow uses AOC-496.4. No statewide requirement that the applicant create an additional bespoke proposed order was found in the reviewed materials. Include a proposed order only when the particular court requires it. [KY3] |
| 10. Service/certification | The clerk performs statutory notice to the prosecuting Commonwealth's/county attorney and the county attorney where judgment was entered, as applicable. The prosecutor handles victim notification. Leave AOC-496.3's clerk-use notice certification blank. Do not assign that certification to the applicant. [KY1–KY3] |
| 11. Filing channel | Deliver to the proper clerk by a channel that office accepts. Official guidance permits attorney electronic filing; do not infer universal pro-se eFiling or mail acceptance from that statement. [KY4] |
| 12. Fees and IFP | Ordinary branch: $40 certification, $50 application fee, and $250 upon issuance of relief, subject to the statutory installment mechanism. **IFP branch:** AOC-026 with AOC-496.3 and pardon. The clerk manual expressly permits acceptance without fee or certification when an IFP motion is filed. The judge decides the request. Seek an express ruling concerning the later $250; do not promise it has been waived by submitting the initial motion. [KY1, KY3–KY5] |
| 13. Hearing/post-filing | Track the prosecutor's 60-day response period from service, any extension and the statutory 120-day provisions. The court may grant without a hearing after a no-objection response or after 120 days with no response from prosecutor or victim. This is not automatic relief on day 120. Stop self-help on opposition, disputed pardon/identity, or a contested evidentiary proceeding. Obtain the actual order and complete its payment/waiver and distribution steps. [KY1–KY3; last stop is proposed product policy] |

### Specific form-mapping corrections

All three pages of AOC-496.3 and AOC-026 were visually inspected in the official web PDFs.

- AOC-496.3's full-pardon category is separate from the discretionary Class-D category. **Section 7's rehabilitation narrative is expressly limited to KRS 431.073(1)(d)**. Do not require a pardoned applicant to complete it solely because it appears on the shared form. Keep the official page, including its other applicable fields.
- Attach the full pardon as the selected category directs. Do not check mutually exclusive alternatives.
- Applicant execution signature/date, notarial attestation, and clerk notice date/signature remain completion fields. The applicant's printed identifying facts may be filled from supplied information.
- AOC-026, revision **10-22**, contains financial information, an affidavit and a proposed ruling. Write only supplied financial values and soundly calculated totals; do not turn missing amounts into sworn zeros. The judge's grant/denial boxes and signature are not participant elections.
- AOC-496.3's ordinary certification instruction must not be erased or falsified. Explain the clerk manual's IFP exception in companion instructions and the branching contract. [KY2, KY3, KY5]

### Proposed participant instruction

> Use the full-pardon selection on the official application and attach your pardon. Do not sign the sworn application in advance. For an ordinary paid filing, include the current certification and application fee. If you are asking to proceed without paying costs, submit AOC-026 with the application and pardon; the clerk's statewide instructions permit acceptance without the fee or certification while that request is considered. Ask for an express ruling on the later expungement fee. Filing a waiver request does not mean the judge has granted it.

**Remaining approval:** adopt the supported branch in the existing legal-design record. The statute consulted is labeled effective until April 30, 2027; do not silently reuse this version for filings governed by a later version. No speculative local objection is a reason to withhold ordinary engineering implementation, but actual conflicting local directions must be resolved before filing. [KY1]

## 2. North Dakota: automatic nonconviction closing, then correction

### Statutory result

For a qualifying order of nonconviction entered **on or after August 1, 2025**, use the **entry date** and the statutory **61-day** period. The definition requires dismissal of all criminal charges in a case or acquittal of all criminal charges; a mixed disposition does not fit by selecting only a favorable count. Earlier dispositions use the separate official petition procedure. [ND1, ND2]

**Correction to the earlier synthesis:** the exclusion says **“The case was appealed.”** It does not say only “an appeal is pending.” Any appeal history must be flagged for legal review under this workflow; do not automatically admit a concluded appeal. The other statutory exclusions cover a dismissal in a plea agreement involving another conviction, unfitness to proceed, and lack-of-criminal-responsibility acquittal. [ND1]

### Computation

Rule 45 applies to a statute without its own computation method. Exclude the entry date; count calendar days; extend a last day that falls on a weekend or legal holiday. The proposed product schedules its first administrative check on the next business day after the adjusted period expires. The extra check-day delay is a product choice, not another statutory waiting period. Do not add mail-service days to an entry-date clock. [ND3; product choice identified]

Calendar examples, computed here, assuming no relevant legal holiday or extraordinary closure:

| Order entered | Day 61 | Adjusted expiration | Proposed first check |
|---|---|---|---|
| August 1, 2025 | October 1, Wednesday | October 1 | October 2 |
| August 4, 2025 | October 4, Saturday | October 6, Monday | October 7 |

An implementation must supply the applicable holiday/calendar data rather than infer it from these examples.

### Product mechanism versus law

A nonfiled clerk-correction request is a proposed administrative step. A five-business-day interval after confirmed receipt is an optional **LegalEase cure interval**, not a statutory prerequisite. An express refusal or instruction to seek a judicial order may allow the product to advance earlier. The statute does not prescribe that letter, interval, or a specially named enforcement motion. Counsel/design adoption is still required for that custom escalation strategy.

The proposed escalation is a **motion in the original case requesting performance of the statutory closing duty**, not a new discretionary conviction-sealing petition or an appellate challenge. Restrict the requested relief to court-controlled records. Do not promise removal of prosecutor, police, federal or private database records. [ND1, ND2; custom vehicle is analysis]

### Complete the procedural packet, not just the motion

An approved enforcement design should include the original caption, motion, **notice of motion and short supporting brief**, factual declaration/exhibits where needed, proposed order, and proof of service. Rule of Court 3.2 requires notice and a brief; its note allows a liberal understanding of what constitutes a brief. A concise legal-grounds section is not a reason to create an unnecessary long memorandum. [ND4]

Rule 47(c) generally requires a written motion and hearing notice **at least 21 days before a hearing**, unless another rule or court order sets a different time. Do not hardcode an automatic 21-day delay for a motion submitted on briefs, or assume the five-day administrative interval satisfies hearing notice. [ND5]

Rule 3.2 supplies a 14-day answer-brief period and seven-day reply period and allows requests for a hearing. Rule 49 requires service on the other parties, ordinarily through the prosecuting attorney, using permitted methods and filing proof. Rule of Court 1.1 applies these rules, consistently with jurisdiction, to the state's trial courts. [ND4, ND6, ND7]

### Existing official form is not the custom escalation form

The official six-page packet inspected, **Rev. April 2026**, is principally the petition/order package for pre-August-2025 nonconvictions; its instructions separately describe automatic closing of later orders. Do not populate its earlier-case petition as though it were the post-period administrative letter. Do not import its instruction about a judge possibly requiring a prosecutor copy into a Rule 49-governed enforcement motion. [ND2]

### Remaining exact decision

> Adopt a nonfiled clerk request followed, after the stated product trigger, by a bounded original-case enforcement motion with Rule 3.2 notice/brief and Rule 47/49 service and hearing treatment? Confirm handling of any appeal history under the exclusion before admitting the case.

The separate `North_Dakota_Clerk_Request_Draft.md` supplies administrative correspondence for adoption. It is not a pre-signed declaration and does not purport to be an official court form.

## 3. Oklahoma: trafficking-related expungement is not generic conviction vacatur

### What the primary evidence supports

The published §19c text authorizes the court, on its own motion **or the defendant's petition**, to grant expungement for good cause for a prostitution-related charge or conviction resulting from trafficking. It specifies public sealing while preserving law-enforcement access and requires the order to identify §19c. It is not a promise that every trafficking-related offense is covered or that the conviction is vacated. [OK1]

**Court level:** Title 22 §4A expressly defines “court” as the Oklahoma district court unless a contrary intention appears. Thus “court of conviction” is not a complete universal destination instruction, particularly for a municipal record or a charge with no conviction. [OK2]

**Recommended ordinary venue:** district court for the district/county holding the relevant arrest information, consistent with §19(A). Section 19c expressly incorporates §19(B)–(M), not §19(A), so that venue conclusion is an interpretation of the combined statutory structure, not a quotation from §19c. A municipal-origin record, records spanning counties, or disputed docketing requires court/counsel confirmation of the district filing and case type. It does not justify calling the entire destination unknown. [OK2, OK3; inference stated]

### Current notice rule and effect

The enacted 2026 **SB 2030** amended §19 and renumbered its notice provision to **subsection B**. The court sets the hearing and provides **30 days' notice** to the prosecuting agency, arresting agency, OSBI, and other relevant persons/agencies. Use the current subsection, not an obsolete letter from an older code PDF. Ask the clerk how the court-directed notice is carried out; do not certify that notice occurred before it did. [OK3]

A proposed packet should include identified records/offenses, participant-provided trafficking and causal facts, good-cause grounds, the agency list, supporting evidence, and a proposed §19c order with public-sealing/law-enforcement-access limits. Sensitive evidence requires the applicable protected-filing mechanism; do not promise a closed hearing or confidential petition merely because the subject is trafficking. These are proposed drafting components, not an official statewide form inventory. [OK1, OK3; drafting recommendation]

### Do not implement HB 3835 as current law

The official 2026 HB 3835 history inspected records passage in the House and Senate committee referral, not enactment. The last published version is engrossed. Its proposed provisions broaden offense coverage, remove good cause, mandate waived fees and closed hearings, and change proof/relief rules. **None of those proposed provisions is established as operative law by that record.** Its printed future effective date is not evidence of enactment. [OK4, OK5]

Contrast this with SB 2030, whose official history records gubernatorial approval and whose enrolled text supplies the operative §19 amendment. [OK3, OK6]

### Proposed participant wording

> This route asks an Oklahoma district court to expunge specified prostitution-related records connected to human trafficking. It does not cover every offense simply because trafficking occurred, and relief is not automatic. The court must arrange the required agency notice and decides the request. An order under this route seals records from public access but does not make them unavailable to law enforcement.

Keep fees separately sourced. OSBI distinguishes its arrest-record processing charge from court-record processing; that does not establish a universal $0 clerk filing fee. This batch does not adopt a route-specific fee waiver without enacted authority or an actual order. [OK7]

### Evidence qualification and remaining decision

The live OSCN §19c endpoint failed decoding in this session. Its text was read from the **official 2019 Senate code PDF**, corroborated as the existing section targeted by the official 2026 proposed amendment; no change to §19c was identified in SB 2030. This is a disclosed currency chain, not a claim to have fetched the live §19c page successfully. Confirm no later enactment before recording legal adoption. County/docketing and protected-filing procedure remain the exact local inputs.

## 4. Wyoming: participant motion to vacate in the court that entered conviction

### Disposition

Wyo. Stat. §6-2-708(c) expressly allows a motion **at any time after entry of conviction** in **the court where the conviction was entered**. It concerns the defendant's participation resulting from trafficking. The court **may** vacate; do not write mandatory “shall” relief. Government documentation of trafficking status creates a presumption but is not mandatory. [WY1]

**Instrument recommended:** custom “Motion to Vacate Conviction under Wyo. Stat. §6-2-708(c)” by the person convicted, under the original case caption. A custom title implements the statutory motion; it is not a claim that Wyoming publishes a form with that title. [WY1; drafting recommendation]

### Correct route boundaries

The defendant/movant is not the trafficker being prosecuted. The requested relief is **vacatur of that defendant's conviction**, not a request that a prosecutor initiate a trafficking prosecution. The subsection does not itself add sentence completion, an extra waiting period, a conviction of the trafficker, automatic record destruction, a $300 filing fee, or the 90-day/DCI-notice process from the separate felony-expungement route. [WY1; distinctions based on the subsection's text]

The subsection (a) defense to criminal liability, subsection (b) treatment of minors, and subsection (c) post-conviction motion are distinct. Do not route an unresolved pending charge into a conviction-vacatur instrument. [WY1]

### Proposed drafting outline

1. Copy the original court caption and case number.
2. Identify the precise conviction and entry date from the record.
3. State the statutory ground; collect the defendant's own facts explaining trafficking status and its connection to participation in that offense.
4. Attach identified supporting materials where available; do not require a government certificate as the only evidentiary route.
5. Request vacatur of the specifically identified conviction, not erasure of every record held by every agency.
6. Use an execution-compliant supporting affidavit/declaration and any required hearing/service documents after confirming the applicable rules. A proposed order may be supplied if locally requested; its execution belongs to the court.

These are drafting instructions for legal/design adoption, not completed allegations or statewide filing certification.

### Proposed participant wording

> File the motion in the court that entered the conviction. Explain, using your own facts and available evidence, how your participation in the offense resulted from trafficking. Government documentation can assist, but the statute does not make it mandatory. The judge decides whether to vacate the conviction. Do not assume this motion also seals all court and law-enforcement records.

### Narrow remaining check

The official Wyoming rules index was retrieved, but its large criminal-rule PDF download failed through the available web path. **This batch does not claim that current Rule 47/49 service language was inspected.** Bind the actual court's current service/scheduling and sensitive-evidence procedure before issuing completed filing instructions. Use the prosecutor/current party list supported by that procedure, not the separate §7-13-1502 expungement service list. A rules-download failure does not leave the statute's explicit destination or filing actor unknown. [WY2]

## Integration: no new management layer

Research here changes no repository file. The Captain should reuse current assignments, recover existing sources where available, record only actual authorized legal adoption, implement the bounded change, and complete current-output acceptance. Existing independent technical and legal approvals remain distinct. No count may increase on the basis of this memo alone.

**Exact reviewer questions, only where needed:** Kentucky: adopt the official full-pardon/IFP branch and confirm actual later-fee order treatment. North Dakota: approve the custom letter/enforcement design and appeal exclusion handling. Oklahoma: confirm district venue/docketing for the precise record and statutory currency, excluding HB 3835 proposals. Wyoming: approve the statutory-motion structure and supply current local service/sensitive-evidence treatment.

## Sources and access record

Source IDs resolve in `SOURCE_INDEX.md`. Official forms were read and, where noted, visually inspected through web page images. Original PDF downloads into this working container failed because name resolution was unavailable. This deliverable therefore contains **no newly acquired issuer PDFs and no issuer-file hashes**. `source-download-attempts.json` preserves the failed attempts. Package checksums identify these newly authored research files only.
