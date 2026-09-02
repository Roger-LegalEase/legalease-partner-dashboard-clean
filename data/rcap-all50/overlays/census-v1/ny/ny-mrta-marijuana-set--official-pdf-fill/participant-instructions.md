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
- This artifact covers only an explicitly requested irreversible-destruction branch and grants no runtime permission to select it.
- Every control below the form's COURT USE ONLY line and every affirmation/signature date remains blank. The three checklist controls this build once listed as participant blanks - Application_Complete, File_Copy and Copies_Sent - are refused as court-owned, which is what the form's own COURT USE ONLY rule makes them.
