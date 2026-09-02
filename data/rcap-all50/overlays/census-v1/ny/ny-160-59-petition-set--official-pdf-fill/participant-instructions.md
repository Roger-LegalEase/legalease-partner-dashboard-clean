# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:track-pathway:NY:ny_160_59_petition:discretionary-conviction-sealing-by-petition-under-cpl-160-59`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, filing destination, local procedures, attachments, and proposed-order requirements before filing. Cost and Who must be served are each answered in their own section below.

## What it costs to file

**The CPL 160.59 sealing application carries no separate filing fee.** The compiled New York profile this route is built from — `src/lib/rcap-engine/compiled/profiles/NY-new-york.json`, named as a required source for discretionary conviction sealing by petition under CPL 160.59 — records it directly: *CPL 160.59 sealing application — No separate filing fee — Court motion; notarization needed*. The profile's own summary says the same thing in full sentences: the 160.59 motion "carries no separate filing fee", and the near-certain costs are the certificate of disposition and any DCJS record-review fee. Neither of this packet's two application sources — the Notice of Motion and Affidavit in Support of Sealing under CPL 160.59, nor the CPL 160.59 Pro Se Sealing Application Packet and Instructions — prints a fee on its face, and that silence is consistent with the rule rather than a gap in it.

**What you should still expect to pay, and what you should not.** The application itself is free to file, so no fee waiver is needed for it. The Criminal Certificate of Disposition Request Form states its own fee on its face: five dollars ($5) in courts located outside New York City, or ten dollars ($10) in courts located in New York City's five boroughs, and it tells you to contact the court to ask what payment methods are accepted. You need a certificate of disposition for each conviction you are applying to seal, so budget that amount per case. The profile also records a DCJS fee if you order a review of your own record to confirm what is on it. Your application must be notarized, and a notary may charge for that.

**Free help exists, and the profile names it.** The compiled profile records that legal-aid organizations and county district attorney sealing units assist pro se applicants at no cost. If the clerk's office of the court where you were convicted and sentenced tells you something different about cost from what this section says, follow the clerk — that office is the one that takes the filing — and the pro se packet already sends you to it: contact "the clerk's office of the court where you will apply to seal your case, which is the court where you were convicted and sentenced", and file "by mail or in person at the clerk's office of the appropriate courthouse".

## Who must be served

**The District Attorney must be served, and serving is your step.** A copy of the Notice of Motion and every supporting document goes to the District Attorney of each county where a conviction you are asking to seal was entered. Where the Attorney General or the Special Narcotics Prosecutor prosecuted the case, that office is served instead. If your two convictions were entered in different counties, each of those prosecutors is served separately.

**Serve before you file, and prove it.** The pro se packet's step 4 tells you to serve first, either in person - taking a copy to the prosecutor's office and having your own copy stamped *received* - or by mail. The application's Affidavit of Service (page 3 of the application, page 4 of the pro se packet) is the sworn proof, and it must be notarized. If more than one prosecutor's office was served, the pro se packet requires a separate Affidavit of Service for each. Step 5 tells you to attach the original affidavits when you file. Only a copy stamped *received* in person excuses the affidavit; a mailed copy never does.

**Complete the service blanks only after service has actually happened.** The name and address of the person serving, the date of service, the county and address of each District Attorney, and the choice between mailing and personal delivery are all listed among the blanks below. They record something that has occurred. A date written before you serve would be false, and the affidavit is sworn under penalty of perjury.

**Then the prosecutor has 45 days.** The application states it on its own face: the District Attorney has 45 days after being served to consent to the sealing or to oppose it. If they oppose, the court holds a hearing. The statewide list of District Attorney offices and addresses is published by the New York State District Attorneys Association, and the clerk's office of the court where you will file can also tell you which office to serve.

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- AKA(s) (source field: `Applicant_AKA`)
- NYSID (source field: `NYSID`)
- Motorist ID # (VTL Crimes) (source field: `Motorist_ID`)
- Docket, Indictment, or SCI Number - second case row (source field: `Docket_Indictment_SCI_Number_2`)
- Court Name - second case row (source field: `Court_Name_2`)
- Conviction Charge Description - second case row (source field: `Conviction_Charge_2`)
- Conviction Charge Law/Section/Subsection - second case row (source field: `Law_Section_Subsection_2`)
- Conviction Charge Law/Section/Subsection - first case row (source field: `Law_Section_Subsection_1`)
- Sentence Date - first case row (source field: `Sentence_Date_1`)
- Sentence Term - first case row (source field: `Sentence_Term_1`)
- Sentence Term - second case row (source field: `Sentence_Term_2`)
- Release Date from any incarceration - first case row (source field: `Release_Date_1`)
- Release Date from any incarceration - second case row (source field: `Release_Date_2`)
- Attachments, numbered line 4 (source field: `Attachment_4`)
- Attachments, numbered line 5 (source field: `Attachment_5`)
- Attachments, numbered line 6 (source field: `Attachment_6`)
- Attachments, numbered line 7 (source field: `Attachment_7`)
- Attachments, numbered line 8 (source field: `Attachment_8`)
- Attachments, numbered line 9 (source field: `Attachment_9`)
- Attachments, numbered line 10 (source field: `Attachment_10`)
- Conviction Date - second case row (source field: `Conviction_Date_2`)
- Sentence Date - second case row (source field: `Sentence_Date_2`)
- Court Name - the conviction you intend to ask to have sealed in a later application (source field: `Court_Name`)
- Conviction Date - the conviction you intend to ask to have sealed in a later application (source field: `Conviction_Date`)
- Sentence Date - the conviction you intend to ask to have sealed in a later application (source field: `Sentence_Date`)
- COUNTY OF (source field: `County_of`)
- [address of person serving/mailing] (source field: `Address_of_Person_Serving`)
- [date of service/mailing] (source field: `Date_of_Service`)
- the supporting documents served with the Notice of Motion and Affidavit in Support of Sealing Pursuant to CPL 160.59 (source field: `Documents_in_Support`)
- at the following address(es) (source field: `Address_of_DA_1`)
- at the following address(es) - second line (source field: `Address_of_DA_2`)
- Street Address (source field: `CourtAddress`)
- City, State & Zip (source field: `CourtCityStateZip`)
- IDV Number (source field: `IDVNumber`)
- Arrest Number (source field: `ArrestNumber`)
- Order of Protection Number (source field: `OrderofProtectionNumber`)
- Certificate of Disposition Number (source field: `CertificateofDispositionNumber`)
- Criminal Justice Tracking Number (CJTN) (source field: `CriminalJusticeTrackingNumber(CJTN)`)
- Complaint Number (source field: `ComplaintNumber`)
- Ticket Number (source field: `TicketNumber`)
- NYSID Number (source field: `NYSIDNumber`)
- Partial Docket Number (source field: `PartialDocketNumber`)
- Driver’Licenses  or Non-Driver ID Number (source field: `DMVIDNumber`)
- Arrest Date - OR Date Range, the second box (source field: `ArrestDateRangeEnd`)
- Incident Date - OR Date Range, the second box (source field: `IncidentDateRangeEnd`)
- Other: (source field: `Other`)
- AKA(s) (source field: `AKAs`)
- Complete the affidavit of service (source field: `Complete the affidavit of service`)
- Keep copies for your records (source field: `Keep copies for your records`)
- Case Number (Docket, Indictment, or SCI Number) - the conviction you intend to ask to have sealed in a later application (source field: `Case Number 3`)
- Court Name - the conviction you intend to ask to have sealed in a later application (source field: `Court Name 3`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 3 (source field: `Document 3`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 4 (source field: `Document 4`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 5 (source field: `Document 5`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 6 (source field: `Document 6`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 7 (source field: `Document 7`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 8 (source field: `Document 8`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 9 (source field: `Document 9`)
- REQUIRED AND ADDITIONAL DOCUMENTS, numbered line 10 (source field: `Document 10`)
- Case Number (Docket, Indictment, or SCI Number) - second row (source field: `Case Number 2`)
- Court Name - second row (source field: `Court Name 2`)
- Select one (source field: `Type of Service`)
- (Name of Person Serving/Mailing) (source field: `Server Name`)
- (Address of Person Serving/Mailing) (source field: `Server Address`)
- (Date of Service/Mailing) (source field: `Service Date`)

## Where self-help ends

**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared set of official New York forms for you to read, complete, sign, have notarized, serve and file yourself. It is not filed for you, and it does not decide whether your conviction can be sealed - that decision is the court's, and it is discretionary.

Stop and get a lawyer's help before you file if any of these is true of your case. Each one is recorded in this route's own track record as a point where self-help ends:

- any conviction that might fall on the exclusion list, including any attempt or conspiracy whose target offence has to be analysed;

- any class A felony, which is excluded here even where it would qualify under Clean Slate - the two lists are opposites and this is where the routing error happens;

- any argument that several crimes arose from a single criminal transaction and should count as one;

- District Attorney objection, which turns this into a contested hearing;

- any pending or open criminal charge;

- more than two convictions, or more than one felony;

- the rehabilitation and interests-of-justice showing, which is the heart of a discretionary application and is not a form-filling exercise;

- immigration exposure. Sealing does not remove immigration consequences and sealed records remain reachable by immigration authorities. Ask an immigration attorney before you sign anything;

- firearms licensing goals, because sealed records remain available for firearms licensing;

- federal and out-of-state convictions, which New York sealing does not reach at all.

**Who to ask, for what.** The clerk's office of the court where you were convicted and sentenced answers procedural questions - what to file, where, and what the court needs. Only a lawyer admitted in New York can advise you on eligibility, on what to argue, or at a hearing. The compiled New York profile records that legal-aid organisations and county district attorney sealing units assist pro se applicants at no cost, and some county district attorney offices run sealing units that publish their own instructions.
- Prior-application elections, reasons, sworn dates, service facts, prosecutor information, and notary fields remain blank.
- The post-order seal-verification document is source-custody evidence only; form currency and the proposed-order branch remain release blockers. The fee is no longer among them: this packet's fee-and-waiver section states the answer the compiled New York profile holds — the CPL 160.59 application carries no separate filing fee — together with the certificate-of-disposition, DCJS and notary costs it does carry. Nor is service: the who, the when, the proof and the 45-day consideration period are stated from the committed track registry, the route census and the delivered forms' own faces.
