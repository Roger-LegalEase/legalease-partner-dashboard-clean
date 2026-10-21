# Participant and reviewer instructions

These files are deterministic review fixtures made from exact held official sources. They are not approved filing packets.

- Route scope: `obligation:unit:NY:ny_mrta_marijuana:ny-mrta-destruction-request`

## Required participant/local completion

- Review every page, choose only legally applicable elections, and complete every required signature and date yourself.
- Complete service certificates only after service actually occurs.
- Court, judge, prosecutor, clerk, law-enforcement, agency, notary, hearing, and post-order fields remain for their proper owners.
- Confirm current revision, local procedures, attachments, and proposed-order requirements before filing. Where to file, Cost and Who must be served are each answered in their own section below.

## What it costs to file

**There is no application fee.** The form states it on its own face, in the same printed instruction that tells you where to submit it: *Submit your application to the Court where you were convicted. (NOTE: There is no application fee.)* The committed New York track record for this route says the same thing and records no fee waiver, because there is no fee to waive.

**One cost that is not this application.** If you order a DCJS Record Review to confirm what is on your own record - which you may want before you apply, or after, to see what the destruction changed - that review carries its own fee. It is a separate request to a separate agency and it is not a charge for this application.

**A notary may charge.** If you submit through EDDS or by mail rather than in person, the application must be notarized, and a notary may charge for that. Nothing in the held sources sets that figure; it is not a court fee.

## Where to file

**Submit your application to the court where you were convicted.** That is the form's own first printed instruction, and there is no statewide address, mailbox or portal for it: the Office of Court Administration publishes this application but does not receive it. An application sent to any other court cannot be processed.

**One application per court.** If you have eligible marijuana or cannabis convictions in more than one New York court, you submit a separate application to each of them. A single application cannot cover convictions entered in two different courts.

**Three ways to submit it.** Through that court's Electronic Document Delivery System (EDDS), by regular first-class mail, or in person. If you submit in person, the form tells you to bring a valid government-issued photo ID proving you were the defendant in the case. If you send it through EDDS or by mail, the application has to be notarized instead - notarization is the identity proof, and which one you need follows how you submit, not what you are asking for.

## Who must be served

**You do not serve anyone.** Nothing in this route requires the participant to serve, mail or deliver a copy to a prosecutor, to a police agency, or to the Division of Criminal Justice Services. The committed New York track record for this route records notice as "none by the participant" and service as "none".

**The court distributes it, and the form says so.** Item 6 of the processing checklist printed below the form's COURT USE ONLY line reads *Copies of application sent to prosecutor, law enforcement agencies and DCJS as applicable for further processing.* That is the court's step, not yours, and it is why there is no certificate of service on this form and none in this packet.

**What you should get back.** The court returns an Acknowledgement of Application to Destroy Expunged Marihuana Conviction Record, and where you were fingerprinted, DCJS writes separately to confirm destruction. If nothing reaches you, the office to ask is the clerk of the court of conviction that received your application - the same court you submitted it to. No other office can tell you where it is.

## Exact facts still required before filing

The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.

- Village Court, Village of (source field: `Village_Court_Specify`)
- CJTN/Criminal Justice Tracking Number (NOTE: If you were not fingerprinted in this case, write NONE.) (source field: `CJTN`)
- NYSID/New York State Identification Number (NOTE: If you were not fingerprinted in this case, write NONE.) (source field: `NYSID`)
- Town Court, Town of (source field: `Town_Court_Specify`)
- Unknown - CJTN/Criminal Justice Tracking Number (source field: `CJTN_Unknown`)
- Aliases (if any) (source field: `Aliases`)
- City Court, City of (source field: `City_Court_Specify`)
- Unknown - NYSID/New York State Identification Number (source field: `NYSID_Unknown`)
- Unknown - Court Docket/Case Number (source field: `Docket_Case_Number_Unknown`)
- Court where convicted (Check one only) (source field: `Conviction_Court`)

## Where self-help ends

**This packet is not legal advice, and no lawyer has reviewed your case in preparing it.** It is a prepared copy of the Office of Court Administration's Application to Destroy Marijuana Conviction Record for you to read, complete, sign, have notarized where the form requires it, and submit yourself. It is not submitted for you, and it does not decide whether your conviction was expunged or whether the record will be destroyed.

**Stop and get help before you sign or send this application if any of the following is true of your case.** Each one below is carried word for word from this route's own committed track record — `data/record-clearing/legal-design-track-registry.json`, track `ny_mrta_marijuana`, `selfHelpStopConditions` — and each is a point where this packet stops being enough. A few of them name the step LegalEase or this packet's implementation owner takes rather than one you take; they are stated here unchanged so you can see the whole of what is not settled.

- Any marijuana offence outside the two covered categories. LegalEase does not decide whether an uncovered offence qualifies. Next step: a New York criminal defence lawyer or a public defender record-clearing project, and check the CPL § 160.59 discretionary sealing route separately.

- Mixed cases with non-marijuana charges. The marijuana remedy does not reach the other counts. Next step: the same referral, and check the CPL § 160.59 route for the counts this section leaves in place.

- Verification that destruction actually occurred, which by definition leaves nothing to point to. LegalEase cannot confirm that anything was destroyed. Next step: tell the participant what an absence in a DCJS Record Review does and does not prove, and direct any status question about their own application to the court of conviction that received it, which is also the court that issues the acknowledgement.

- Immigration exposure. Sealing does not remove immigration consequences and sealed records remain reachable by immigration authorities. Next step: a New York immigration attorney, before any request is signed or sent.

- Firearms licensing goals. Next step: a New York firearms-licensing attorney; the marijuana expungement does not answer the licensing question.

- Federal and out-of-state convictions, which New York sealing does not reach. Next step: counsel in the convicting jurisdiction.

- Any dispute about whether the conviction is one CPL § 160.50(3)(k) reaches, or about whether the case has in fact been expunged. LegalEase does not determine eligibility and does not certify that the automatic expungement happened. Next step: the participant confirms from their own record, and where the dispute survives that, a New York criminal defence lawyer or a public defender record-clearing project.

- The participant cannot identify the court, docket number or charge for the case. A request cannot name a record that has not been identified. Next step: request a DCJS Record Review, or ask the clerk of the court of conviction for the case identifiers, before the request is prepared.

- Currency of the official application. Its identity is now established — the printed title, the absence of any issuer form number, and the March 2025 edition dated from document metadata — but no live fetch of the issuer's binary was obtained, so an edition published since cannot be ruled out, and LegalEase does not substitute a local or unofficial form. Next step: the official-PDF implementation owner confirms the current binary against the recorded digest before any participant copy exists.

- A request for anything other than destruction of an expunged New York marijuana conviction record — resentencing, vacatur of a conviction the automatic route does not reach, or relief on a federal, out-of-state, military or tribal record. Next step: a New York criminal defence lawyer, or counsel in the convicting jurisdiction.

- The court of conviction denies the destruction request, does not respond, or returns it. CPL § 160.50(5) sets no timeline, names no remedy for non-response and gives no appeal route for the request. Next step: a New York criminal defence lawyer or a public defender record-clearing project. Do not re-send the application as though a remedy had been established, and do not send it to a different court, which cannot process it.

- Court records for the case cannot be located, or the vacatur, dismissal and expungement has not been reflected. This is the CPL § 160.50(5)(b)(ii)(B) route and not the destruction request. Next step: the participant or their attorney presents a DCJS fingerprint record, a copy of a court disposition record or other relevant court record to an appropriate court employee, after which the chief administrator of the courts or their designee must assure completion promptly and in any event within thirty days.

- The participant wants someone else to sign the application for them. CPL § 160.50(5)(b)(i) permits a designated agent to make the request, but the current official form provides a defendant signature line only, and whether a court will accept an agent-signed application is not answered by the form. Stop: LegalEase does not produce an agent-signed version. Next step: the participant signs it themselves, or asks the court of conviction, or an attorney submits the participant-signed application with the notarization the instructions require.

- The participant has eligible convictions in more than one New York court and wants one application to cover them. Stop: the issuer's instructions require a separate application to each court of conviction, and an application sent to the wrong court cannot be processed. Next step: prepare one application per court, each signed and dated.

**If you are not a United States citizen, the immigration condition above is a hard stop, not a caveat.** Ask a New York immigration attorney before this request is signed or sent. Destruction of a New York marijuana conviction record does not remove immigration consequences, and this packet does not tell you what any immigration authority already holds or will do.

**Who to ask, for what.** The clerk of the court of conviction — the same court this application is submitted to — answers procedural questions: whether it arrived, how that court takes EDDS submissions, and what its acknowledgement looks like. Only a lawyer admitted in New York can advise you on eligibility, on whether a conviction is one this remedy reaches, or on what to do if the court denies the request or does not answer. A public defender office or a legal aid record-clearing project in the county of conviction is where to ask for that help at no cost. The clerk cannot give legal advice and this packet does not stand in for one.
- This artifact covers only an explicitly requested irreversible-destruction branch and grants no runtime permission to select it.
- Every control below the form's COURT USE ONLY line and every affirmation/signature date remains blank. The three checklist controls this build once listed as participant blanks - Application_Complete, File_Copy and Copies_Sent - are refused as court-owned, which is what the form's own COURT USE ONLY rule makes them.
