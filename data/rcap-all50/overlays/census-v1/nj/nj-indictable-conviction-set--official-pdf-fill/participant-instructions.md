# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:track-only:NJ:nj_indictable_conviction`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, local procedures, fees, attachments, and proposed-order requirements before filing. Where to file and Who must be served are each answered in their own section below.

## Values this platform holds but did not print

The blanks below are not blanks the platform has no fact for. It holds each of these values and could not put it on the paper, so it left the box **empty** rather than print something a court could not read, or leave a row half filled. **Write each one in by hand before you file.** Which of them bites on a real packet depends on how long that participant's own name, charge or docket number is; the fixtures a row was measured on are named in the last column.

| Source field | The fact | Why it is not printed | Measured on |
| --- | --- | --- | --- |
| `arrest1CaseNum` | `matter.case_number` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrest1Dt` | `matter.arrest_date` | another cell of the same row (arrest1Statute) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `arrestOff1` | `matter.charge` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `ExpungeCntyName` | `matter.county` | this blank is a chooser the form fills from its own list of options, not a free-text line, and the held value is not one of those options | canonical, boundary |
| `guilty` | the election this row states on the printed form | this box is the election for that row, and another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, so the election is withdrawn with the row: a row is completed or left untouched, and a marked election over an empty row is a half-written row | canonical, boundary |
| `guiltyCrt` | `matter.court` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `guiltyDt` | `matter.conviction_date` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `guiltyOff1` | `matter.charge` | another cell of the same row (guiltyStatute, guiltyFinal1, guiltyTimeType, guiltyDocCmpltDt, guiltyProbDt, guiltyFineDt) could not be printed, and a row is completed or left untouched | canonical, boundary |
| `origCaseNums` | `matter.case_number` | another cell of the same row (arrestStatute, arrestMuni) could not be printed, and a row is completed or left untouched | canonical, boundary |

## Records to gather before you file

Every line below is carried word for word from this route's own committed record — `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `participantFilingRequirements`. None of them is a statutory attachment to the petition; they are what the petition's own facts are checked against, and the agency list the signed order is later served on comes out of the first one.

- **New Jersey State Police State Bureau of Identification criminal history record** — obtained from New Jersey State Police. Required. Request the fingerprint-based SBI criminal history and pay the State Police fee. It is not a statutory attachment, but it produces the offence count that decides the route, the case identifiers the petition needs, and the agency list the signed order must later be served on.
- **Court records and dispositions for any matter the SBI record does not show** — obtained from The Superior Court or Municipal Court that handled the matter. Conditional — Where the SBI history is incomplete or a disposition is missing. Ask the clerk of the court that handled the matter for the disposition and the complaint, indictment or docket number.
- **FBI Identity History Summary** — obtained from Federal Bureau of Investigation. Conditional — Where out-of-state or federal records may exist. Request an Identity History Summary from the FBI. Those records cannot be expunged in New Jersey, but they count toward eligibility and toward the offence counts, so the analysis is wrong without them.

The State Police fee named above is a charge for the record. It is not the court's filing fee: the enclosed kit states the court's own position in a running footer on four of its delivered pages — *Kit updated 06/2020 to remove the filing fee, CN 10557*.

## Where to file, and the e-filing route

**Venue.** The Superior Court in the county in which the person resides, or a county in which one or more of the person's convictions were adjudged. This is a real choice and is surfaced to the participant. The venue language was read in the official bill text of A5826, which amends N.J.S.2C:52-2 by striking "most recent conviction for a crime was" and inserting the residence-or-conviction-county rule; the 2019 enacted text of P.L.2019, c.269 carried the earlier formulation.

**Destination.** Superior Court, Criminal Division. Filed in the county of residence or a county where a conviction was adjudged, through the eCourts Expungement System or on the Judiciary kit forms. No vicinage variation identified.

**The e-filing route.** The Judiciary's eCourts Expungement System is the other way to file, and this route's committed record describes it in its own words: "The system assembles the petition and order from entered data, and the Judiciary may require the participant's own account. LegalEase prepares the answers; the participant submits." It is recorded there as an item the participant completes. This packet is the kit-forms route; it submits nothing for you, and you do not file the same petition both ways.

**On paper.** The enclosed kit names the office that receives a mailed package on its own delivered pages 10 and 11 — the Criminal Case Management Office of the county you are filing in, whose list and telephone numbers the kit prints at its end.

Venue, destination and the e-filing item are carried from `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `venue`, `destination` and `manualCompletionItems`.

## Who must be served, and what an objection is

**Nobody is served until the court hands filed copies back.** The enclosed kit sets the whole service step out on its own delivered pages 10 and 11: who receives a copy, that each is mailed by certified mail return receipt requested, and that mailing happens within five (5) days from the date the Order for Hearing was signed. Those pages are bound into this packet; read the list there rather than from any summary of it.

**Serving the signed order is a second, later step.** This route's committed record states why it matters, word for word: "An agency that is not served keeps its copy, which is the single most common way a granted expungement fails to take effect." — `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `manualCompletionItems`.

**Objections.** This route's committed record names prosecutor objection among the points where self-help ends — `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `selfHelpStopConditions`. No objection period is stated in this packet, because no held record establishes one. The Criminal Case Management Office that holds your expungement docket number is the office that can tell you.

## After the order is signed

- **Serving a certified copy of the signed order on every record-holding agency** — The service checklist built from the SBI history. An agency that is not served keeps its copy, which is the single most common way a granted expungement fails to take effect.
- **Use the letter the kit provides for that mailing.** Cover Letter — Notice Expungement Granted (Form G) is bound into this packet at delivered pages 41 to 43, and the Proof of Notice (Form F) at pages 39 and 40 is where the kit puts proof of the earlier mailing.
- **Leave the docket number and the signature to their owners.** The kit captions the Expungement Docket Number "(leave blank - clerk will fill in)", and the judge signs the order.

This route's own recorded notes on what follows, carried word for word from `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `packetInstructions`:

- Serving the signed order on every record-holding agency
- Six to twelve month timeline expectation
- SBI criminal history is the practical prerequisite

The first item is carried from `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `manualCompletionItems`.

## What this packet does not decide about your eligibility

This packet fills the Judiciary's own kit from facts you supply. **It performs no eligibility analysis**, it makes no statutory characterisation of your record, and nothing in it is a finding that you qualify. This route's committed record names the questions that are open, and each line below is carried from it word for word.

Points where self-help ends — `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `selfHelpStopConditions`:

- Either early pathway, both of which require a compelling-circumstances showing and invite prosecutor objection.
- The N.J.S.A. 2C:52-2(c)(3) drug-crime route.
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

Analyses this route's own record still lists as unencoded — `data/record-clearing/legal-design-track-registry.json`, track `nj_indictable_conviction`, `legalDesignLimitations`:

- Encode the same-day and closely-related bundling routes
- Encode the marijuana and paraphernalia counting rules
- Compelling-circumstances narratives are attorney or assisted work, not template output.
- Read and encode the 2C:52-2(b) and (c) non-expungeable lists

If any of these reaches your case, ask a lawyer or a legal-services office before you sign or file.

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- “and was charged with (name of offense(s))”, the second line — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestOff2`)
- “in violation of N.J.S.A. (statute(s))” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestStatute`)
- “arising out of (municipalities)” — Petition for Expungement (Form A), paragraph 1, page 18 (source field: `arrestMuni`)
- the election box beside “d.” — Petition for Expungement (Form A), item (d), delivered page 19 (source field: `guilty`)
- name of offense(s), continuation line if needed — Form A, item (d), delivered page 19 (source field: `guiltyOff2`)
- in violation of N.J.S.A. (statute(s)) — Form A, item (d), delivered page 19 (source field: `guiltyStatute`)
- final sentence, first line — Form A, item (d), delivered page 19 (source field: `guiltyFinal1`)
- final sentence, continuation line if needed — Form A, item (d), delivered page 19 (source field: `guiltyFinal2`)
- jail/prison/incarceration time — Form A, item (d), delivered page 19 (source field: `guiltyTimeType`)
- date jail/prison/incarceration was completed — Form A, item (d), delivered page 19 (source field: `guiltyDocCmpltDt`)
- date probation was completed — Form A, item (d), delivered page 19 (source field: `guiltyProbDt`)
- date fines were paid — Form A, item (d), delivered page 19 (source field: `guiltyFineDt`)
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
- I am seeking an expungement pursuant to N.J.S.A. 2C:52-2(a)(2) (after four years), or pursuant to N.J.S.A. 2C:52-3(b)(2) (after three years), but less than five years have passed since my most recent conviction, payment of court-ordered financial assessment, satisfactory completion of probation or parole, or release from incarceration, whichever is later, and I have not otherwise been convicted of a crime, disorderly persons offense, or petty disorderly persons offense since the most recent conviction — Petition for Expungement (Form A), page 22 (source field: `seek5yrs`)
- I am seeking an expungement pursuant to N.J.S.A. 2C:52-2(c)(3) of a third or fourth degree controlled dangerous substance crime — Petition for Expungement (Form A), page 22 (source field: `seek34degree`)
- “The compelling circumstances for the Court to grant me an expungement are as follows”, both boxes on Form A page 22, and the name-change explanation on the Verification, page 24. One form field serves all three, so one answer appears in all three places (source field: `seek5yrsDetails`)
- I am seeking expungement of a conviction on a criminal case or an adjudication of delinquency on a juvenile case pursuant to N.J.S.A. 2C:52-2, and I have never been granted an expungement, sealing or similar relief regarding a criminal conviction, by any state or federal court — Verification (Form A), page 24 (source field: `seekJuvNever`)
- I have legally changed my name. I have explained the details of my name change(s) below, included my previous legal name(s), and the date of the court order for the name change(s) — Verification (Form A), page 24 (source field: `changeName`)
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
| 18 | “I was arrested/taken into custody on (date) ______” — Petition for Expungement (Form A), paragraph 1 | The arrest or custody date verified from the court record. Complete this printed line by hand with the rest of paragraph 1. The proposed-order row on page 31 is also withheld when its statutory citation is missing, so it is not a printed source for this date. A blank or incomplete paragraph is not ready to sign or file. |
- The item (d) conviction election on page 19 is withdrawn with the row it states: six of that paragraph's nine cells have no held fact, so the whole row is left untouched and its box is left unmarked rather than swearing to a conviction the paragraph does not identify. The withdrawal is named in the held-but-not-printed table above. Degree and statutory eligibility remain unselected.
- The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused.
