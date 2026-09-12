# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Packet route: **New Jersey disorderly-persons conviction petition**

## Required participant/local completion

- Review the complete court-record facts and the fact-derived item (d) mark. Do not add another disposition or eligibility selection unless your verified record and the form instructions require it.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, local procedures, attachments, and proposed-order requirements before filing. Where to file, cost, and who must be served are each answered in their own section below.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `arrest1CaseNum` | `matter.case_number` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrest1Dt` | `matter.arrest_date` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrestOff1` | `matter.charge` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `origCaseNums` | `matter.case_number` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |

## Records to gather before you file

Every line below is carried word for word from this route's own committed record — `data/record-clearing/legal-design-track-registry.json`, track `nj_disorderly_persons`, `participantFilingRequirements`. None of them is a statutory attachment to the petition; they are what the petition's own facts are checked against, and the agency list the signed order is later served on comes out of the first one.

- **New Jersey State Police State Bureau of Identification criminal history record** — obtained from New Jersey State Police. Required. Request the fingerprint-based SBI criminal history and pay the State Police fee. It produces the offence count that decides the route, the case identifiers the petition needs, and the agency list the signed order must later be served on.
- **Court records and dispositions for any matter the SBI record does not show** — obtained from The Superior Court or Municipal Court that handled the matter. Conditional — Where the SBI history is incomplete or a disposition is missing. Ask the clerk of the court that handled the matter for the disposition and the complaint, indictment or docket number.

The State Police fee named above is a charge for the record. It is not the court's filing fee: the enclosed kit states the court's own position in a running footer on four of its delivered pages — *Kit updated 06/2020 to remove the filing fee, CN 10557*.

## After the order is signed

- **Serving a certified copy of the signed order on every record-holding agency** — The service checklist built from the SBI history. An agency that is not served keeps its copy.
- **Use the letter the kit provides for that mailing.** Cover Letter — Notice Expungement Granted (Form G) is bound into this packet at delivered pages 41 to 43, and the Proof of Notice (Form F) at pages 39 and 40 is where the kit puts proof of the earlier mailing.
- **Leave the docket number and the signature to their owners.** The kit captions the Expungement Docket Number "(leave blank - clerk will fill in)", and the judge signs the order.

This route's own recorded notes on what follows, carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `nj_disorderly_persons`, `packetInstructions`:

- Serving the signed order on every record-holding agency
- Six to twelve month timeline expectation
- SBI criminal history is the practical prerequisite

The first item is carried from `data/record-clearing/legal-design-track-registry.json`, track `nj_disorderly_persons`, `manualCompletionItems`.

## Transcripts you are not required to produce

The statute expressly provides that a person shall not be required to provide plea or sentencing transcripts or presentence reports with the application or any other filing. That is a useful, concrete thing to tell participants who fear a document hunt.

Carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `nj_disorderly_persons`, `packetInstructions`. Nothing is added to it here: if a court or an office asks you for something this statement covers, that is a question to raise rather than a document to go and buy.

## Facts that control this packet route

You do not choose a legal route or diagnose which statutory branch applies. Supply and verify the factual answers below from the SBI history and court records. The rules engine uses those facts to decide whether Form A item (d) is supported. If an answer is missing, inconsistent, or reaches a self-help stop, packet generation stops without marking the box.

- What is your full legal name, and have you used any other names?
- What is your date of birth?
- Which New Jersey county do you live in?
- For each matter: the county, the court and its level, the complaint or indictment number, the docket number, the offence and statute, the disposition and its date.
- List every conviction you have anywhere, including other states and federal court, with the grading and the date.
- Is any charge pending against you now, anywhere?
- Have you ever had a New Jersey record expunged before?
- Were any of these matters motor vehicle charges, including DWI?
- Have you paid every fine, fee, penalty and restitution ordered in these cases, and if not, why not?
- When did you finish probation or parole, or get released from custody, on each matter?
- Have you ever been convicted of a crime — an indictable offence in New Jersey or a felony anywhere else?
- How many disorderly persons and petty disorderly persons offences are on your record?
- Were any of these convictions entered on the same day?
- Did any of these offences happen as part of one connected sequence of events over a short period?
- Did any conviction involve marijuana or hashish, or drug paraphernalia used with them?

Item (d) is marked only when all nine cells in its conviction paragraph can be completed from the same verified matter. The generated canonical and boundary examples use clearly synthetic case facts to test that rule; they are not participant answers or an eligibility finding.

## What it costs to file

There is **no court filing fee**. New Jersey Courts states **"It's free"**, and the Judiciary kit was updated in June 2020 to remove the filing fee. Because there is no court filing fee, there is no court filing fee to waive and no court-fee waiver form is needed for this petition.

The New Jersey State Police separately charges for the SBI criminal history record. That record charge is not a court filing fee and is not waived by the no-court-fee treatment above.

## Where to file

File with the **Superior Court, Criminal Division**, in the county where the participant resides or a county where one or more convictions were adjudged. File through the **eCourts Expungement System** or on the New Jersey Judiciary kit forms in this packet; do not submit both routes for the same petition.

## Who must be served

Serve the petition as required and, after entry, serve a certified copy of the signed order on every record-holding agency. The held notice list is: **the county prosecutor, the Attorney General, the State Police, the courts involved, the arresting agency, probation, and any relevant municipal court**. Keep the existing rule below: complete service certificates only after service actually occurs.

On objections: the committed track record states, of this route's notice rule, that **"The exact objection window is recorded as an open question."** No held source in this repository establishes how long a prosecutor or any other served party has to object, so this packet states no period and none should be inferred from its silence. Ask the Criminal Division office in the county of filing what the objection window is. "Prosecutor objection." is a held self-help stop condition on this route: if an objection is filed, this packet does not answer it.

## How the offence count works on this route

**The rules engine counts only the factual convictions you supply and verify from the SBI history and court records.** It does not ask you to choose a statutory branch. Missing or disputed offense facts stop packet generation. What follows is the counting rule the engine applies; it is not a final eligibility finding.

### The held counting rule, quoted whole

> Available to a person convicted of one or more disorderly persons or petty disorderly persons offences who has not been convicted of any crime, in this State or any other jurisdiction; a person with any crime conviction uses N.J.S.A. 2C:52-2 instead. Three alternative routes: no more than five disorderly persons offences, no more than five petty disorderly persons offences, or a combination of no more than five; or multiple offences whose convictions were entered on the same day; or multiple offences that were interdependent or closely related in circumstances and committed as part of a sequence of events within a comparatively short period. The same-day and closely-related routes carry no numeric cap. The statute expressly provides that a person shall not be required to provide plea or sentencing transcripts or presentence reports with the application or any other filing. Expungement in New Jersey is defined at N.J.S.A. 2C:52-1 as the extraction and isolation of criminal justice records, not their destruction. In most contexts the person may then answer that the event did not occur. Certain law enforcement, judicial and specified licensing uses survive under N.J.S.A. 2C:52-27. The relief reaches New Jersey records only: federal and out-of-state records are untouched, although out-of-state convictions still count when assessing eligibility. There is no federal immigration effect.

Three things in that rule decide most records, and they are the three worth re-reading. The five-offence line is a **cap of five**, counted across disorderly persons offences, petty disorderly persons offences, or any combination of the two. The **same-day** route and the **interdependent-or-closely-related** route carry **no numeric cap at all**, so a record over five may still qualify under one of them. And any **crime** conviction — an indictable offence in New Jersey, a felony anywhere else — takes the record off this route entirely and onto N.J.S.A. 2C:52-2.

### A published figure that is not this route's figure

The committed record carries this caution about a number you are likely to meet first:

> Whether New Jersey Courts' self-help phrasing, "You can expunge no more than one indictable conviction and up to three disorderly persons offenses or petty disorderly persons offenses", is being read by participants as the cap for all routes when it describes the N.J.S.A. 2C:52-2 route only. This is a presentation risk rather than a legal question, and it was re-confirmed on the official page on 2026-08-06.

So a published "up to three" is the cap for a different route, not for this one. The correction that this route's cap is **five** rather than four is itself a held legal-design item: "Correct the disorderly persons cap from four to five".

### What you will be asked, and where this stops

The intake question this route records for the count is: "How many disorderly persons and petty disorderly persons offences are on your record?"

The ordinary five-offense count is encoded. A disputed count, a same-day or closely-related characterization that the records do not establish, or marijuana/hashish regrading is a self-help stop. Those conditions are listed again under "Where self-help ends" below.

## All 11 actions required before filing

The legal-design track records the following 11 actions. Review every one before filing; do not treat the generated sample values as a substitute for these checks.

- Check your answer to "List every conviction you have anywhere, including other states and federal court, with the grading and the date." against New Jersey State Police State Bureau of Identification criminal history record, and correct the packet if they disagree.
- Check your answer to "For each matter: the county, the court and its level, the complaint or indictment number, the docket number, the offence and statute, the disposition and its date." against Court records and dispositions for any matter the SBI record does not show, and correct the packet if they disagree.
- Verification of the petition — The verified petition under N.J.S.A. 2C:52-7.
- The judge's signature line on the proposed order — Proposed expungement order.
- The monies-owed section of the proposed order — Proposed expungement order.
- Filing through the eCourts Expungement System — The Judiciary's own portal.
- Serving a certified copy of the signed order on every record-holding agency — The service checklist built from the SBI history.
- The petition is duly verified by the participant.
- Verification as the Judiciary kit and the eCourts system require.
- No court filing fee. New Jersey Courts states "It's free", and the Judiciary kit was updated in June 2020 to remove the fee. The State Police charge for the SBI criminal history record.
- not applicable to the court filing. There is no filing fee to waive.

For the two record checks, first compare the complete list of convictions against the fingerprint-based State Police SBI history and correct every disagreement. If the SBI history omits a matter or disposition, obtain that court's records and compare and correct the county, court and level, complaint or indictment number, docket number, offence and statute, disposition, and disposition date.

Complete and duly verify the petition before filing. Follow the Judiciary kit and eCourts verification workflow, including notarization when that workflow requires it; the participant must not write in the notary's own execution block. Leave the judge's signature line for the judge, but ensure the proposed order carries the exact monies-owed information the court requires. Post-entry service of the certified signed order occurs only after the judge signs it.

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- “and was charged with (name of offense(s))”, the second line — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestOff2`)
- “in violation of N.J.S.A. (statute(s))” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestStatute`)
- “arising out of (municipalities)” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestMuni`)
- I currently owe restitution, a fine(s) or other court-ordered financial assessment(s) — Petition for Expungement (Form A), paragraph e, delivered pages 19 and 21 (source field: `contOwe`)
- “Original indictment/accusation/summons/warrant/complaint/FO or FJ docket number” — Petition for Expungement (Form A), paragraph e, pages 19 and 21 (source field: `oweDocket`)
- “in the amount of $” — Petition for Expungement (Form A), paragraph e, pages 19 and 21 (source field: `oweAmt`)
- the paragraph number for this additional arrest — Petition for Expungement, Form A – Addendum Page, page 20, which says to number each paragraph starting with 2 (source field: `cnt`)
- “I was arrested/taken into custody on (date)” — Form A – Addendum Page, page 20 (source field: `contArrestDt`)
- “and was charged with (name of offense(s))” — Form A – Addendum Page, page 20 (source field: `contOffense1`)
- “and was charged with (name of offense(s))”, the second line — Form A – Addendum Page, page 20 (source field: `contOffense2`)
- “in violation of N.J.S.A. (statute(s))” — Form A – Addendum Page, page 20 (source field: `contStatute`)
- “arising out of (municipalities)” — Form A – Addendum Page, page 20 (source field: `contArrestMuni`)
- “as set forth in the (original indictment/accusation/summons/warrant/complaint/docket number (include FJ and FO docket number(s) in Family Part matters))” — Form A – Addendum Page, page 20 (source field: `contOrigNums`)
- “the charge(s) of (name of offense(s))”, the second line of item a — Form A – Addendum Page, page 20 (source field: `contDsmissOff2`)
- County (where you are filing) (source field: `ExpungeCntyName`)
- “The administrator(s) of the ___ Municipal Court(s)” — Order for Hearing (Form B) page 27, Expungement Order (Form C) page 30, Proof of Notice (Form F) page 40, and the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrts`)
- “The ___ County(ies) Probation Division” — Order for Hearing (Form B) page 27, Expungement Order (Form C - Continued) page 31, and Proof of Notice (Form F) page 40 (source field: `probDivCntys`)
- “(statute)”, arrest row (1) — Expungement Order (Form C - Continued), page 31 (source field: `arrest1Statute`)
- “(date)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Dt`)
- “(statute)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2CaseNum`)
- “(date)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3Dt`)
- (statute), arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3CaseNum`)
- “(date)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4Dt`)
- (statute), arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4CaseNum`)
- “(date)”, arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5Dt`)
- (statute), arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5CaseNum`)
- “(6) If applicable, including the following Family Part docket numbers in which I am a co-delinquent (FJ docket numbers)” — Expungement Order (Form C - Continued), page 31 (source field: `fjDocketNums`)
- “(date)” — Cover Letter to Court – For Filing (Form D), page 35 (source field: `CoverLtrDDt`)
- “(county)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccCntyName`)
- “(address)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccAddrStr`)
- “(city, state, zip code)”, the court address block — Cover Letter to Court – For Filing (Form D), page 35 (source field: `SccAddr2`)
- “Enc:”, what you are enclosing — Cover Letter to Court – For Filing (Form D), page 35 (source field: `enc`)
- “(date)” — Cover Letter – Notice of Hearing (Form E), page 37; written when Form E is mailed, which is after the signed Order for Hearing comes back (source field: `CoverLtrEDt`)
- “(date)” — Cover Letter – Notice Expungement Granted (Form G), page 42; written when Form G is mailed, which is after the Expungement Order is signed (source field: `CoverLtrGDt`)
- “(city, state, zip code)” under “Prosecutor,” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProsAddr2`)
- “___ County Probation”, Original County — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbCntyName`)
- “(address)” under “County Probation, Original County” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbAddrStr`)
- “(city, state, zip code)” under “County Probation, Original County” — the Form E and Form G cover letters, pages 37 and 42 (source field: `ProbAddr2`)
- “(address)” under “Municipal Court Administrator” — the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrtsAddrStr`)
- “(city, state, zip code)” under “Municipal Court Administrator” — the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrtsAddr2`)
- “___ County Probation”, Transfer County, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2CntyName`)
- “(address)” under “County Probation, Transfer County”, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2AddrStr`)
- “(city, state, zip code)” under “County Probation, Transfer County”, used in transfer cases only — the Form E and Form G cover letters, pages 37 and 42 (source field: `Prob2Addr2`)
- “___ County Identification Bureau,” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `IdbCnty`)
- “(address)” under “County Identification Bureau” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `IdbAddrStr`)
- “___ County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `FamDivName`)
- “(address)” under “County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42 (source field: `FamDivAddrStr`)
- “The administrator(s) of the ___ Municipal Court(s)” — Expungement Order (Form C - Continued), page 31 (source field: `AdminMuniCts`)

## Participant tasks after the initial filing

These fields are not prerequisites to the initial petition filing. Complete each only at the named stage, from the filed or signed court papers and the actual mailing record; never invent a docket number, hearing setting, recipient, address or mailing date.

- **After the Expungement Order is signed, when addressing each applicable agency notice.** (city, state, zip code) under County Identification Bureau and under County Family Division — Cover Letter – Notice Expungement Granted (Form G), page 42; the pinned form reuses one field for both recipient blocks (source field: `FamDivAddr2`) <!-- source-stage: POST_ORDER_SERVICE_FOR_EACH_APPLICABLE_AGENCY --> — after the signed order, enter the city/state/ZIP separately for each applicable County Identification Bureau and County Family Division recipient. The source aliases those two occurrences, so do not type one digital field value into both; print and complete each applicable recipient line from the actual agency address.

## Blanks the form prints with no fill-in box

The lines below are printed on delivered pages of this packet and there is no form field over them, so no build can put anything on them and none of them appears in the list above. **Write each one in by hand before you file.**

| Delivered page | What the form prints | What goes there |
| --- | --- | --- |
| 18 | “I was arrested/taken into custody on (date) ______” — Petition for Expungement (Form A), paragraph 1 | The arrest or custody date verified from the court record. Complete this printed line by hand with the rest of paragraph 1. The proposed-order row on page 31 is also withheld when its statutory citation is missing, so it is not a printed source for this date. A blank or incomplete paragraph is not ready to sign or file. |

## Where self-help ends

The committed track record at `data/record-clearing/legal-design-track-registry.json`, track `nj_disorderly_persons`, exposes two held stop lists. Both are carried below word for word so all 29 held entries remain auditable. Stop and get help from a lawyer or legal-aid office before filing if any entry applies.

### Held `selfHelpBoundaries` (15 entries)

- Counting disputes at the five-offence line.
- Marijuana regrading analysis.
- Early pathway compelling circumstances.
- Prosecutor objection.
- Any conviction that might sit on the N.J.S.A. 2C:52-2(b) or (c) non-expungeable list.
- Any classification or out-of-state equivalency question.
- Any same-day or closely-related bundling argument.
- Prior expungement, which N.J.S.A. 2C:52-14(e) bars except on the Clean Slate route.
- Pending charges.
- Unpaid financial assessments and the willfulness question.
- The participant cannot assemble complete case identifiers.
- Federal, out-of-state or tribal records. They are not reachable, but they count toward eligibility and toward the offense counts.
- Immigration exposure. New Jersey expungement has no federal immigration effect.
- Any Title 39 motor vehicle matter, including DWI, which N.J.S.A. 2C:52-28 puts outside the chapter entirely.
- Compelling-circumstances showings and diversion dismissals

### Held `selfHelpStopConditions` (14 entries)

- Counting disputes at the five-offence line.
- Marijuana regrading analysis.
- Early pathway compelling circumstances.
- Prosecutor objection.
- Any conviction that might sit on the N.J.S.A. 2C:52-2(b) or (c) non-expungeable list.
- Any classification or out-of-state equivalency question.
- Any same-day or closely-related bundling argument.
- Prior expungement, which N.J.S.A. 2C:52-14(e) bars except on the Clean Slate route.
- Pending charges.
- Unpaid financial assessments and the willfulness question.
- The participant cannot assemble complete case identifiers.
- Federal, out-of-state or tribal records. They are not reachable, but they count toward eligibility and toward the offense counts.
- Immigration exposure. New Jersey expungement has no federal immigration effect.
- Any Title 39 motor vehicle matter, including DWI, which N.J.S.A. 2C:52-28 puts outside the chapter entirely.

- Form A item (d) is completed and marked only after the participant's court-record facts fill the entire conviction row and the governed offense-count rules establish this disorderly-persons branch. No clean-slate, marijuana, or court-owned proposed-order election is made.
- The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused.
