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

- offense(s)) (source field: `arrestOff2`)
- in violation of N.J.S.A. (statute(s)) (source field: `arrestStatute`)
- (original indict (source field: `arrestMuni`)
- contOwe (source field: `contOwe`)
- Original (source field: `oweDocket`)
- in the amount of $ (source field: `oweAmt`)
- cnt (source field: `cnt`)
- . I was arrested/taken into custody on (dat (source field: `contArrestDt`)
- . I was arre (source field: `contOffense1`)
- contOffense2 (source field: `contOffense2`)
- in violation of N.J.S.A. (statute(s)) (source field: `contStatute`)
- (municipalities (source field: `contArrestMuni`)
- (original indictment/accusation/summons/war (source field: `contOrigNums`)
- a (source field: `contDsmissOff2`)
- seek5yrs (source field: `seek5yrs`)
- seek34degree (source field: `seek34degree`)
- conviction. The compelling circumstances for the Court to gr (source field: `seek5yrsDetails`)
- 3 (source field: `seekJuvNever`)
- changeName (source field: `changeName`)
- , (source field: `orderHearYr`)
- an Order of (source field: `hearDay`)
- at (source field: `hearTime`)
- at        o'clock (source field: `hearTimeM`)
- sigHearJdg (source field: `sigHearJdg`)
- gradDC (source field: `gradDC`)
- marijuana (source field: `marijuana`)
- cleanSlate (source field: `cleanSlate`)
- IT IS ORDERED this (source field: `orderFinalDay`)
- The administrator(s) of the (source field: `MuniCrts`)
- The (source field: `probDivCntys`)
- (statute) (source field: `arrest1Statute`)
- (statu (source field: `arrest2Dt`)
- (statute (source field: `arrest2Statute`)
- summons/warrant/ complaint/FJ or FO docket number) (source field: `arrest2CaseNum`)
- (statu (source field: `arrest3Dt`)
- summons/warrant/ complaint/FJ or FO docket number) (source field: `arrest3CaseNum`)
- (statut (source field: `arrest4Dt`)
- summons/warrant/ complaint/FJ or FO docket number) (source field: `arrest4CaseNum`)
- (statu (source field: `arrest5Dt`)
- summons/warrant/ complaint/FJ or FO docket number) (source field: `arrest5CaseNum`)
- If applicable, including the following Family Par (source field: `fjDocketNums`)
- jdmnt (source field: `jdmnt`)
- jdgmntDocket1 (source field: `jdgmntDocket1`)
- in the amount of $ (source field: `jdgmntAmt1`)
- jdgmntDocket2 (source field: `jdgmntDocket2`)
- in the amount of $ (source field: `jdgmntAmt2`)
- jdgmntDocket3 (source field: `jdgmntDocket3`)
- in the amount of $ (source field: `jdgmntAmt3`)
- jdgmntDocket4 (source field: `jdgmntDocket4`)
- in the amount of $ (source field: `jdgmntAmt4`)
- sigFinalJdg (source field: `sigFinalJdg`)
- CoverLtrDDt (source field: `CoverLtrDDt`)
- (county) (source field: `SccCntyName`)
- (address) (source field: `SccAddrStr`)
- (city, state, zip code) (source field: `SccAddr2`)
- Kit up (source field: `enc`)
- CoverLtrEDt (source field: `CoverLtrEDt`)
- Re: Expungement Hearing (source field: `CoverLtrEHearDt`)
- at (source field: `CoverLtrEHearTime`)
- Docket Number (source field: `expungDocketNum`)
- sigNoticeDt (source field: `sigNoticeDt`)
- Cover Letter – Notice Expungement Granted (Form G) (source field: `CoverLtrGDt`)
- (address) (address) (source field: `ProsAddr2`)
- County Probation (source field: `ProbCntyName`)
- ProbAddrStr (source field: `ProbAddrStr`)
- (address) (address) (source field: `ProbAddr2`)
- MuniCrtsAddrStr (source field: `MuniCrtsAddrStr`)
- (city, state, zip code) (source field: `MuniCrtsAddr2`)
- County Probatio (source field: `Prob2CntyName`)
- (use in Transfer Cases only) (source field: `Prob2AddrStr`)
- (city, state, zip code) (source field: `Prob2Addr2`)
- (name of institution for juvenile only) (source field: `IdbCnty`)
- IdbAddrStr (source field: `IdbAddrStr`)
- Records and Identification Unit (source field: `FamDivName`)
- Records and Identification Unit (source field: `FamDivAddrStr`)
- (address) (address) (source field: `FamDivAddr2`)
- The administrator(s) of the (source field: `AdminMuniCts`)
- The measured conviction control is marked; degree and statutory eligibility remain unselected.
- The shared 43-page kit's signature, date, notary, service, court, prosecutor, clerk, agency, and post-order fields are expressly refused.
