# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:track-pathway:NJ:nj_arrest_no_conviction:arrest-dismissal-and-other-non-conviction-expungement-under-n-j-s-a-2c-52-6`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, local procedures, attachments, and proposed-order requirements before filing. Where to file, Cost and Who must be served are each answered in their own section below.

## What it costs to file

**There is no court filing fee.** The kit bound into this packet says so on its own face: the running footer on four of its pages reads *Kit updated 06/2020 to remove the filing fee, CN 10557*. The committed New Jersey record for this route says the same — no court filing fee for any expungement petition, New Jersey Courts states "It's free", and the kit was updated in June 2020 specifically to remove the fee.

**There is nothing to waive, and so no waiver form in this packet.** The committed record puts it in terms: a fee waiver is *not applicable to the court filing. There is no filing fee to waive.* If an office asks you for a filing fee on an expungement petition, that is worth questioning before you pay it.

**Two costs that are not the filing fee.** The State Police charge for the SBI criminal history record, which is a separate request to a separate agency; and the Verification page of the Petition must be signed in front of a notary, who may charge for that. Neither is a court fee and no held source sets either figure, so none is stated here.

**One condition that is about money but is not a fee.** The committed record for this route records that outstanding court-ordered financial assessments must be paid, subject to the statute's failure-to-pay provisions. Whether that reaches your case is not something this packet decides; it is listed among the points below where self-help ends.

## Where to file

**File in the county where you were arrested or taken into custody, or where you were prosecuted or adjudicated.** That is the New Jersey Judiciary's own instruction, printed at page 9 of the kit bound into this packet, and the committed record for this route says the same: the destination is the Superior Court, Criminal Division, of the vicinage. New Jersey is one statewide court system with fifteen vicinages, and no local form variation was identified for this route.

**The office that receives it is the Criminal Case Management Office of that county.** Page 10 of the enclosed kit says to mail the package there, or to file it in person if you prefer, and the list of those offices with their telephone numbers is printed at the end of the same kit. Do not look for a statewide filing address; there is not one.

**If your cases are in more than one county**, the kit tells you to contact the Criminal Case Management Office in either county and ask whether they will let you file for expungement of your entire record in that county, and then to file the whole package with the office that agreed. This packet does not choose the county for you and does not make that call for you.

**What to send with it.** Make three copies of the notarized Petition (Form A), the Order for Hearing (Form B) and the proposed Expungement Order (Form C). The original and two copies are filed; keep one of each. Attach the Cover Letter for Filing (Form D), and enclose two large self-addressed envelopes with postage on each — those are what the court uses to send your filed copies back.

**There is also an online route.** The Judiciary's eCourts Expungement System assembles the petition and the proposed order from data you enter, instead of from these forms. This packet is the kit-forms route. Nothing here prevents you using eCourts instead; if you do, you do not file these papers as well.

## Who must be served

**Nobody is served until the court gives you filed copies back.** One copy each of the Petition, the Order for Hearing and the proposed Expungement Order comes back to you marked *Filed*, with an Expungement Docket Number, and the Order for Hearing will carry the date and time of your hearing. Service starts then, and not before. This is page 10 of the enclosed kit.

**Then make at least seven copies of those three papers and mail one set to each agency involved in your case, by certified mail, return receipt requested.** The kit names them at pages 10 and 11: the Attorney General of New Jersey; the Superintendent of State Police, Expungement Unit; the County Prosecutor; the administrator of the municipal court if a municipal court heard the matter; the Chief of Police or other head of the police department where the offence was committed or the arrest was made; the chief law-enforcement officer of any other State law-enforcement agency that took part in the arrest; the Warden or superintendent of any institution you were held in; and the County Probation Division if you had a conditional discharge or conditional dismissal, were in PTI or a juvenile diversion programme, had a deferred disposition, performed community service, owed fines or restitution, or served probation — and, if supervision was transferred, both the original county probation office and the one it went to. The Division of Criminal Justice, Records and Identification Unit is added if your case went through the State Grand Jury.

**Mail them within five days of the date the Order for Hearing was signed.** The kit states that period at page 11 and tells you to mail at the post office, certified mail return receipt requested, which may be done electronically. Form E, the Cover Letter — Notice of Hearing, is the letter to attach to each set; it is bound into this packet.

**Keep the receipts, and ask before the hearing what the court wants.** After the return receipt cards or the electronic confirmations arrive, the kit tells you to contact the Criminal Case Management Office and ask whether proof of mailing must be submitted at or before the hearing. Form F, the Proof of Notice, is where that proof goes.

**Agencies have a window to object.** The committed record for this route records that they do, and records the exact period as an open question. No number of days is stated here, because none is established; the Criminal Case Management Office that has your docket number is the office that can tell you.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `arrest1CaseNum` | `matter.case_number` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrest1Dt` | `matter.arrest_date` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `dismissOff1` | `matter.charge` | the value does not fit this box at a size a court could read | boundary |

## Records to gather before you file

Every line below is carried word for word from this route's own committed record — `data/record-clearing/legal-design-track-registry.json`, track `nj_arrest_no_conviction`, `participantFilingRequirements`. None of them is a statutory attachment to the petition; they are what the petition's own facts are checked against, and the agency list the signed order is later served on comes out of the first one.

- **New Jersey State Police State Bureau of Identification criminal history record** — obtained from New Jersey State Police. Required. Request the fingerprint-based SBI criminal history and pay the State Police fee. It is not a statutory attachment, but it produces the offence count that decides the route, the case identifiers the petition needs, and the agency list the signed order must later be served on.
- **Court records and dispositions for any matter the SBI record does not show** — obtained from The Superior Court or Municipal Court that handled the matter. Conditional — Where the SBI history is incomplete or a disposition is missing. Ask the clerk of the court that handled the matter for the disposition and the complaint, indictment or docket number.
- **FBI Identity History Summary** — obtained from Federal Bureau of Investigation. Conditional — Where out-of-state or federal records may exist. Request an Identity History Summary from the FBI. Those records cannot be expunged in New Jersey, but they count toward eligibility and toward the offence counts, so the analysis is wrong without them.

The State Police fee named above is a charge for the record. It is not the court's filing fee: the enclosed kit states the court's own position in a running footer on four of its delivered pages — *Kit updated 06/2020 to remove the filing fee, CN 10557*.

## After the order is signed

- **Serving a certified copy of the signed order on every record-holding agency** — The service checklist built from the SBI history. An agency that is not served keeps its copy, which is the single most common way a granted expungement fails to take effect.
- **Use the letter the kit provides for that mailing.** Cover Letter — Notice Expungement Granted (Form G) is bound into this packet at delivered pages 41 to 43, and the Proof of Notice (Form F) at pages 39 and 40 is where the kit puts proof of the earlier mailing.
- **Leave the docket number and the signature to their owners.** The kit captions the Expungement Docket Number "(leave blank - clerk will fill in)", and the judge signs the order.

This route's own recorded notes on what follows, carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `nj_arrest_no_conviction`, `packetInstructions`:

- Service of the signed order on every record-holding agency must ship with the packet as a checklist built from the State Police history.
- Serving the signed order on every record-holding agency
- Six to twelve month timeline expectation
- SBI criminal history is the practical prerequisite

The first item is carried from `data/record-clearing/legal-design-track-registry.json`, track `nj_arrest_no_conviction`, `manualCompletionItems`.

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- “and was charged with (name of offense(s))”, the second line — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestOff2`)
- “in violation of N.J.S.A. (statute(s))” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestStatute`)
- “arising out of (municipalities)” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestMuni`)
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
- “The compelling circumstances for the Court to grant me an expungement are as follows”, both boxes on Form A page 22, and the name-change explanation on the Verification, page 24. One form field serves all three, so one answer appears in all three places (source field: `seek5yrsDetails`)
- County (where you are filing) (source field: `ExpungeCntyName`)
- “The administrator(s) of the ___ Municipal Court(s)” — Order for Hearing (Form B) page 27, Expungement Order (Form C) page 30, Proof of Notice (Form F) page 40, and the Form E and Form G cover letters, pages 37 and 42 (source field: `MuniCrts`)
- “The ___ County(ies) Probation Division” — Order for Hearing (Form B) page 27, Expungement Order (Form C - Continued) page 31, and Proof of Notice (Form F) page 40 (source field: `probDivCntys`)
- “(statute)”, arrest row (1) — Expungement Order (Form C - Continued), page 31 (source field: `arrest1Statute`)
- “(date)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Dt`)
- “(statute)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2Statute`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (2) — Expungement Order (Form C - Continued), page 31 (source field: `arrest2CaseNum`)
- “(date)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3Dt`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (3) — Expungement Order (Form C - Continued), page 31 (source field: `arrest3CaseNum`)
- “(date)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4Dt`)
- “under (original indictment/accusation/summons/warrant/ complaint/FJ or FO docket number)”, arrest row (4) — Expungement Order (Form C - Continued), page 31 (source field: `arrest4CaseNum`)
- “(date)”, arrest row (5) — Expungement Order (Form C - Continued), page 31 (source field: `arrest5Dt`)
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
- “(city, state, zip code)” under “County Identification Bureau” and under “County Family Division” — Cover Letter – Notice Expungement Granted (Form G), page 42; one form field serves both blocks, so one value appears in both (source field: `FamDivAddr2`)
- “The administrator(s) of the ___ Municipal Court(s)” — Expungement Order (Form C - Continued), page 31 (source field: `AdminMuniCts`)

## Blanks the form prints with no fill-in box

The lines below are printed on delivered pages of this packet and there is no form field over them, so no build can put anything on them and none of them appears in the list above. **Write each one in by hand before you file.**

| Delivered page | What the form prints | What goes there |
| --- | --- | --- |
| 18 | “I was arrested/taken into custody on (date) ______” — Petition for Expungement (Form A), paragraph 1 | The arrest or custody date. This packet holds it and prints it on the proposed Expungement Order at delivered page 31; copy the same date onto this line by hand. There is no fill-in box on this line for any build to write into. |
| 19 | “Was the dismissal a result of a plea bargain? [ ] Yes [ ] No” — Petition for Expungement (Form A), item a | Your own answer. This is an election about your case, not a fact the platform holds, and it is delivered unmarked; mark the box that is true before you sign. |

## Where self-help ends

**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared copy of the New Jersey Judiciary's expungement kit CN-10557 for you to read, complete, sign, have notarized where the kit requires it, file and serve yourself. It is not filed for you, it is not served for you, and it does not decide whether a court will grant expungement.

**Stop and get help before you sign, file or serve anything if any of the following is true of your case.** Each one below is carried word for word from this route's own committed track record — `data/record-clearing/legal-design-track-registry.json`, track `nj_arrest_no_conviction`, `selfHelpStopConditions` — and each is a point where this packet stops being enough.

- Dismissal after pretrial intervention, conditional discharge or another diversion programme.

- Any count still open.

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

**If you are not a United States citizen, the immigration condition above is a hard stop, not a caveat.** Ask a New Jersey immigration attorney before you sign or file. A New Jersey expungement has no federal immigration effect, and this packet does not tell you what any immigration authority already holds or will do.

**Where to ask, and for what.** The kit's own page 3 says it plainly: the court system can be confusing and it is a good idea to get a lawyer. If you cannot afford one, contact the legal services programme in your county to see whether you qualify for free legal services — their number is listed online under Legal Aid or Legal Services. If you do not qualify and need help finding an attorney, your county bar association's lawyer referral service can give you names, and some of those attorneys will consult at a reduced fee. The Criminal Case Management Office can explain how the court works, what the filing requirements are, and what its deadlines are; the kit states in the same place that court staff **cannot** give you legal advice. Only a lawyer can.
- The route election is the measured existing dismissed control on page 18; no box is invented.
- The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused.
