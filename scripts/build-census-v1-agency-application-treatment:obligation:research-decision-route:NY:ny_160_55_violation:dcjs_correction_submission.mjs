#!/usr/bin/env node
/**
 * FABLE-PD agency-application treatment — New York CPL Sec. 160.55 automatic
 * partial sealing, the participant's CORRECTION SUBMISSION when the seal does
 * not appear on the record.
 *
 *   node "scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission
 *
 * WHAT KIND OF FAMILY THIS IS, AND WHY
 *
 * MASTER_QUEUE gives this family implementationStrategy
 * `participant_agency_application`, and the controlling 2026-08-28
 * research-track decision for `ny_160_55_violation` explains why in one line:
 * "For a post-November 1, 1991 qualifying disposition, the participant
 * ordinarily files nothing. The clerk notifies DCJS and appropriate
 * law-enforcement agencies." There is no petition on this route and there is
 * no court application. CPL Sec. 160.55 seals automatically.
 *
 * This family exists for the case where the automatic seal did not take
 * effect on the record. The decision records that workflow exactly:
 *
 *   expected automatic partial seal -> obtain certificate of disposition ->
 *   check official criminal-history result -> ask sentencing court to
 *   transmit/correct sealing notice -> send certified disposition to DCJS for
 *   correction -> motion or counsel if court previously entered an
 *   interests-of-justice nonsealing order
 *
 * The deliverable is therefore two pieces of correspondence — one to the
 * sentencing court, one to DCJS — and a route sheet saying what each office
 * is, what it needs, what it costs, and what the participant does NOT file.
 * Neither piece is a motion, a petition or an application, and neither is
 * styled as one.
 *
 * NO FORM IS INVENTED. Neither DCJS nor OCA publishes a Sec. 160.55
 * correction form and the decision names none; the correspondence is plainly
 * a letter the participant signs, and says so on its face.
 *
 * THE PROMISE THIS PACKET IS FORBIDDEN TO MAKE. The decision is explicit:
 * Sec. 160.55 "does not seal the court file", and "Do not promise that
 * ordinary Sec. 160.55 violations will receive full court-file sealing through
 * Sec. 160.55." Both composed pages and the instructions say so in terms.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ny/agency-application-treatment:obligation:research-decision-route:ny:ny-160-55-violation:dcjs-correction-submission--official-pdf-fill",
  jurisdiction: "NY",
  custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT",
  legalName: "Correction Submission for an Automatic Partial Seal Under CPL Sec. 160.55 That Did Not Reach the Record",
  routeName: "getting an automatic CPL Sec. 160.55 partial seal onto the record when the official criminal-history result still shows the case",
  statutes: ["N.Y. Crim. Proc. Law § 160.55"],
  routes: [
    { routeKey: "obligation:research-decision-route:NY:ny_160_55_violation:dcjs_correction_submission" }
  ],

  records: [
    {
      recordId: "legal-decision:2026-08-28:research-track:ny_160_55_violation",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role:
        "the controlling research-track decision: that Sec. 160.55 seals automatically and the participant "
        + "ordinarily files nothing, the recorded correction workflow this family implements step for step, what "
        + "the partial seal does and does not reach, and the recorded escalation for a contested non-sealing order",
      mustContain: [
        "CPL § 160.55 provides **automatic partial sealing** when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise.",
        "For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies.",
        "It does **not seal the court file**.",
        "Qualifying violations may therefore disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable.",
        "→ obtain certificate of disposition",
        "→ ask sentencing court to transmit/correct sealing notice",
        "→ send certified disposition to DCJS for correction",
        "A pre-November 1, 1991 qualifying case may require a motion under the statute’s legacy branch.",
        "Do not promise that ordinary § 160.55 violations will receive full court-file sealing through § 160.55.",
        "OUTPUT: GUIDANCE + CORRECTION REQUEST",
        "INITIAL PETITION: NONE FOR ORDINARY MODERN CASE",
        "CONTESTED NONSEALING: ATTORNEY HANDOFF"
      ]
    },
    {
      recordId: "compiled-profile:NY-new-york",
      path: "src/lib/rcap-engine/compiled/profiles/NY-new-york.json",
      role:
        "the compiled New York profile, which under DETERMINATION_FEE_AND_WAIVER_STANDARD amendment A2 is a held "
        + "source for this jurisdiction: it answers what the automatic seal costs, what a certificate of "
        + "disposition costs, and that a DCJS record review carries a DCJS fee whose amount it does not state",
      mustContain: [
        "Automatic sealing (160.50/160.55/Clean Slate) $0 No filing",
        "Certificate of Disposition (outside NYC) $5 per case",
        "Certificate of Disposition (within NYC) $10 per case",
        "DCJS record review (your own record) DCJS fee To confirm record / sealing status",
        "obtain a certificate of disposition, check the official criminal-history result, ask the sentencing court to transmit or correct the sealing notice, and send the certified disposition to DCJS for correction",
        "for a post-1991-11-01 qualifying disposition the participant ordinarily files nothing and the clerk notifies DCJS and the appropriate law-enforcement agencies"
      ]
    }
  ],

  officialComponents: {},
  officialCells: {},

  components: ["court_transmission_correction_request", "dcjs_correction_submission", "agency_route_sheet"],
  componentTitles: {
    court_transmission_correction_request: "Request to the Sentencing Court to Transmit or Correct the Sealing Notice",
    dcjs_correction_submission: "Correction Submission to the Division of Criminal Justice Services",
    agency_route_sheet: "Who Holds What, What It Costs, and What You Do Not File"
  },
  componentConditions: {
    court_transmission_correction_request:
      "Sent first. The recorded workflow asks the sentencing court to transmit or correct the sealing notice "
      + "before the certified disposition goes to DCJS, because the court is the office that originates the notice."
  },
  componentDescriptions: {
    court_transmission_correction_request:
      "the letter you sign and send to the court that disposed of your case, asking it to transmit or correct the "
      + "sealing notice for a disposition that seals automatically under CPL Sec. 160.55",
    dcjs_correction_submission:
      "the letter you sign and send to DCJS with your certified disposition, asking it to correct its record so "
      + "that the automatic partial seal appears on it",
    agency_route_sheet:
      "which office holds which record, what the partial seal does and does not reach, what each step costs so "
      + "far as the repository establishes, and what you do NOT file"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Brooklyn, NY 11201",
      "participant.phone": "718-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Chenango Bridge Crossing Road, Apartment 14B, Binghamton, New York 13901-2214",
      "participant.phone": "(607) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling 2026-08-28 research-track decision for ny_160_55_violation and the compiled New York profile "
    + "(src/lib/rcap-engine/compiled/profiles/NY-new-york.json), both bound by SHA-256 and anchor-verified at "
    + "build time",

  formIdentityNote:
    "Neither the Office of Court Administration nor DCJS publishes a CPL Sec. 160.55 correction form, and the "
    + "controlling decision names none. Both pieces of correspondence are therefore authored by this build from "
    + "the committed records. Nothing here carries a court index number block, a notice of motion, an "
    + "affirmation or any other filing furniture, no OCA or DCJS form number appears on any page, and no form "
    + "was substituted or invented.",

  agencyTreatmentNote:
    "This is an AGENCY APPLICATION, not a court filing. CPL Sec. 160.55 seals automatically and, on the recorded "
    + "rule, a participant with a post-1991 qualifying disposition ordinarily files nothing at all. The two "
    + "instruments here are letters asking two record-holding offices to correct their own records. No motion, "
    + "petition, application or proposed order is filed with any court on this route.",

  routeSelectionNote:
    "One route, one pair of instruments, and the route itself states which branch of Sec. 160.55 it is: the "
    + "post-November 1, 1991 automatic branch, whose correction workflow the committed decision sets out step for "
    + "step. The pre-1991 legacy branch, which the same decision records may require a motion, is a route "
    + "boundary and a stop condition here rather than an election on any page. The participant is never asked to "
    + "choose an instrument.",

  routeSelectionsMade: [
    {
      selection: "statutory branch",
      value: "post-November 1, 1991 automatic partial sealing under CPL Sec. 160.55",
      determinedBy:
        "the controlling decision: \"For a post-November 1, 1991 qualifying disposition, the participant "
        + "ordinarily files nothing\", and \"A pre-November 1, 1991 qualifying case may require a motion under the "
        + "statute's legacy branch.\""
    },
    {
      selection: "instrument",
      value: "correspondence to the sentencing court and to DCJS, in that order",
      determinedBy:
        "the recorded correction workflow: ask the sentencing court to transmit or correct the sealing notice, "
        + "then send the certified disposition to DCJS for correction"
    }
  ],

  instructionsHeading: "What to do — an automatic CPL Sec. 160.55 partial seal that has not reached your record",

  instructionsIntro: [
    "**You do not file anything in court on this route, and there is nothing to apply for.** The recorded New York rule is that CPL § 160.55 provides **automatic partial sealing** when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise. For a post-November 1, 1991 qualifying disposition, **the participant ordinarily files nothing** — the clerk of the court notifies DCJS and the appropriate law-enforcement agencies.",
    "**This packet is for the case where that did not happen.** The seal is supposed to be automatic; sometimes the record does not show it. The recorded correction workflow is: obtain a certificate of disposition, check the official criminal-history result, ask the sentencing court to transmit or correct the sealing notice, and send the certified disposition to DCJS for correction. The two letters in this packet are the third and fourth of those steps.",
    "**Read this before you start, because it decides whether this packet is any use to you at all.** A § 160.55 partial seal does **not seal the court file**. The recorded rule is exact about it, and about what follows: qualifying violations may disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable. Nobody may promise you that an ordinary § 160.55 violation will receive full court-file sealing through § 160.55, and this packet does not.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Everything about your case lives on the court's record and on your criminal-history result, so each of those is a labelled blank listed below, and you copy it from the document, never from memory."
  ],

  whoDecides: [
    "**Two offices hold two different records, and each corrects only its own.** The court that disposed of your case holds the court record and originates the sealing notice. DCJS holds the statewide criminal-history record that most background checks are run against. Asking one to fix the other's record does not work, which is why the recorded workflow goes to both, in order.",
    "**You file no motion, no petition and no application.** On the recorded rule, the participant with a post-1991 qualifying disposition ordinarily files nothing; the seal is the law's doing and the clerk's, not yours. Both instruments here are letters asking a record-holder to correct its own record.",
    "**Neither office is deciding whether you qualify.** The seal either applied at disposition or it did not. What you are asking for is that the record show what the statute already did — which is why the certified disposition is the whole of your evidence.",
    "**One situation is not a correction at all, and you must know it before you write.** If the court previously entered an interests-of-justice order that your case would NOT be sealed, then nothing failed to happen: the seal was withheld on purpose. The recorded escalation for that is a motion or counsel, and it is not in this packet."
  ],

  filingDestination: [
    "**Letter one goes to the court that disposed of your case** — the criminal court, city, town or village court, or the county court, whichever entered the disposition. Its own records office is where a request to transmit or correct a sealing notice is received, because that court is where the notice originates.",
    "**Letter two goes to the New York State Division of Criminal Justice Services, to its Record Review Unit** — the office within DCJS that handles a person's request about their own criminal-history record. That is where a certified disposition is sent for correction under the recorded workflow.",
    "**The repository does not hold either office's street address**, and the address a court's records office publishes changes. **The two authorities are named, and both can be reached:** the records office of the court printed on your certificate of disposition — that certificate names the court that issued it — and the DCJS Record Review Unit, which publishes the address it receives record-review and correction correspondence at. Ask each for its current address before you send.",
    "**Nothing goes to a district attorney, and nothing is filed anywhere.** There is no proceeding on this route to file into."
  ],

  feeAndWaiver: [
    "**The sealing itself costs nothing, and there is no filing fee, because there is no filing.** The compiled New York profile this route is built on states it in its own fee table: \"Automatic sealing (160.50/160.55/Clean Slate) $0 No filing\". That line names § 160.55 and it is this route's statute.",
    "**The certificate of disposition is the one near-certain charge, and the amount is published: $5 per case outside New York City, $10 per case within the five boroughs.** The same compiled profile records both figures, and the recorded correction workflow makes the certificate the document you must obtain. Note where those figures sit: the profile's fee table annotates them \"Required for each 160.59 case\" — the charge is the court's price for issuing the certificate rather than a fee attached to any one statute, and the same certificate is what this route needs. **Ask the records office of the court that will issue yours what it charges today**, since a court's own schedule is the thing that changes and the certificate is issued by that office.",
    "**A DCJS record review carries a DCJS fee, and no held source states the amount.** The compiled profile records the item — \"DCJS record review (your own record) DCJS fee To confirm record / sealing status\" — and records no figure for it. **The DCJS Record Review Unit is the office that publishes what its own record review costs; ask it before you order one.** You need a record review only to check whether the seal has reached the record, or to confirm it afterwards.",
    "**There is no fee waiver on this route, because there is no fee to waive.** No filing fee exists to be waived, and neither the certificate charge nor a DCJS record-review fee is a court filing fee. If you cannot pay the certificate charge, ask the court's records office what it does for a person who cannot pay; the profile records that legal-aid organisations and county district-attorney sealing units assist at no cost."
  ],

  service: [
    "**There is nobody to serve.** This is correspondence with two record-holding offices, not a proceeding: there is no opposing party, no district attorney to notify, no affidavit of service and no return date. No held record states any service requirement for either letter.",
    "**Send each letter to its own office and keep dated proof.** Use a method that gives you a receipt and keep a full copy of everything, including the certified disposition you enclose. If either office later says nothing arrived, that receipt is what you have.",
    "**Send the court letter first and the DCJS letter second.** That is the recorded order — the court transmits or corrects the notice, and the certified disposition then goes to DCJS — and sending them the other way round asks DCJS to correct a record on a notice the court has not sent."
  ],

  documentsToObtain: [
    ["A certificate of disposition for the case, from the court that disposed of it — the recorded workflow's first step, and the document you enclose with the DCJS letter", "the records office of the court that disposed of the case; $5 per case outside New York City, $10 within the five boroughs, per the compiled New York profile"],
    ["Your official criminal-history result, showing that the case still appears — the recorded workflow's second step, and what shows the seal has not reached the record", "a DCJS record review of your own record; the DCJS Record Review Unit publishes what it charges"],
    ["Anything the court gave you at disposition showing the case ended in a violation or a traffic infraction", "the records office of the court that disposed of the case"]
  ],

  steps: [
    "**Check first that the seal really has not applied.** Obtain your certificate of disposition and an official criminal-history result, and look at what the criminal-history result shows for this case. If the case no longer appears there, the automatic seal has worked and there is nothing to correct.",
    "**Check that the case is a post-November 1, 1991 disposition.** The recorded rule is that a pre-November 1, 1991 qualifying case may require a motion under the statute's legacy branch, which is a different instrument and is not in this packet.",
    "**Check that no interests-of-justice non-sealing order was entered.** If the court decided your case would not be sealed, nothing failed and this packet is the wrong instrument — see *When to stop and get help*.",
    "**Fill in every labelled blank on both letters** from the certificate of disposition and the criminal-history result. Each is listed in the table above with what belongs in it.",
    "**Sign and date each letter yourself.** The platform never signs for you and never dates a signature.",
    "**Send the court letter first**, to the records office of the court that disposed of the case, by a method that gives you a dated receipt.",
    "**Then send the DCJS letter**, with the certified disposition enclosed, to the DCJS Record Review Unit, again with a dated receipt.",
    "**Check the record afterwards.** Order another record review after a reasonable interval and see whether the case has gone from the criminal-history result. Keep both results — the one that showed the case and the one that does not.",
    "**Expect the court file to stay public.** The partial seal does not reach the courthouse file, and a corrected criminal-history result does not change that."
  ],

  deliberatelyBlank: [
    "**Your signature on each letter, and the date beside it.** A signature is yours alone, and a date written before you sign it would be false.",
    "**Every fact about your case.** The platform holds no court record and no criminal-history result for you, and does not guess at either.",
    "**The addresses of the two offices.** The repository holds neither, and both change; each office publishes its own."
  ],

  notTold: [
    "**The street address of the court that disposed of your case, and of the DCJS Record Review Unit.** No held record establishes either. The court is named on your certificate of disposition and its records office publishes its address; the DCJS Record Review Unit publishes the address it receives record correspondence at. Ask each before you send.",
    "**How long either office takes to act.** No held record states a turnaround for a sealing-notice correction or for a DCJS record correction. The office you wrote to is the one that can tell you.",
    "**What a DCJS record review costs.** The compiled profile records that a DCJS fee applies and records no amount. The DCJS Record Review Unit publishes it.",
    "**Whether your particular disposition qualifies under Sec. 160.55.** This packet does not decide eligibility; it prepares correspondence for a case the participant already has reason to believe seals automatically."
  ],

  stopConditions: [
    "the court previously entered an interests-of-justice order that the case would NOT be sealed — the recorded escalation for a contested non-sealing is a motion or counsel, and neither is in this packet;",
    "the disposition is from before November 1, 1991 — the recorded rule is that such a case may require a motion under the statute's legacy branch, which is a different instrument;",
    "what you actually want is the courthouse file sealed — Sec. 160.55 does not seal the court file, and nothing in this packet will make it do so;",
    "the case ended in something other than a violation or a traffic infraction — a different section of CPL Sec. 160.50 to Sec. 160.59 governs, and CPL Sec. 160.57 Clean Slate is separate again and is not reached through this route;",
    "either office answers that it will not correct the record — that is a dispute, and a dispute needs a lawyer rather than another letter;",
    "any immigration question is involved — a sealed New York record is not invisible to every process, and this is not the packet that answers what it means."
  ],

  whatThisIsNot:
    "This is two pieces of correspondence to two record-holding offices, authored from one recorded branch of "
    + "CPL Sec. 160.55. It is not an OCA or DCJS form — neither office publishes one for this — it is not a "
    + "motion, a petition or an application, it is not filed anywhere, it is not legal advice, it is not sent for "
    + "you, and it is not a promise that either office will correct anything. It is emphatically not a promise "
    + "that an ordinary Sec. 160.55 violation will receive full court-file sealing through Sec. 160.55, because "
    + "the recorded rule is that it will not.",

  receiptDoesNotEstablish: [
    "that any particular disposition qualifies for automatic partial sealing under CPL Sec. 160.55",
    "that the automatic seal has or has not reached any particular participant's record",
    "that no interests-of-justice non-sealing order was entered in any particular case",
    "the street address or current charges of any New York court records office or of the DCJS Record Review Unit"
  ],

  buildFindings: [
    {
      finding:
        "MASTER_QUEUE classifies this family participant_agency_application and binds no document source. That is "
        + "the recorded design: the controlling decision records that on this route the participant ordinarily "
        + "files nothing, and neither OCA nor DCJS publishes a Sec. 160.55 correction form.",
      consequence:
        "The deliverable is two signed letters and a route sheet, authored from the committed decision and the "
        + "compiled New York profile, both anchor-verified before composing. No form was substituted, none was "
        + "invented, and no page carries filing furniture that would make correspondence read as a motion."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against DETERMINATION_FEE_AND_WAIVER_STANDARD A1-A4. The compiled New York "
        + "profile is a held source under A2 and it answers this route's fee question directly: its fee table "
        + "carries \"Automatic sealing (160.50/160.55/Clean Slate) $0 No filing\", keyed to Sec. 160.55 by name, "
        + "so A1 forbids substituting a named authority for an answer the repository holds.",
      consequence:
        "The packet states the $0 answer and its source rather than sending the participant to ask. It also "
        + "states the certificate-of-disposition charges the same profile publishes, $5 outside New York City "
        + "and $10 within the five boroughs, and discloses that the profile's table annotates that line to a "
        + "Sec. 160.59 case - the charge is the issuing court's price for the certificate, and the same "
        + "certificate is what the recorded workflow for THIS route requires. The court's own records office is "
        + "named for the current figure."
    },
    {
      finding:
        "A4 internal consistency. The delivered pages print $0, $5 and $10, so nothing in this packet may say "
        + "that it does not state an amount.",
      consequence:
        "participant-instructions.md and the composed route sheet both state the figures and both attribute "
        + "them. The only cost the packet declines to state is the DCJS record-review fee, which the compiled "
        + "profile records as existing without an amount; there the packet names the DCJS Record Review Unit as "
        + "the office that publishes it, and says so where the money is discussed rather than elsewhere."
    },
    {
      finding:
        "FILING_DESTINATION is a does-not-apply, not a gap: the recorded rule is that the participant ordinarily "
        + "FILES NOTHING and the clerk notifies DCJS and law-enforcement agencies.",
      consequence:
        "The packet states that in terms - who does it instead of the participant - and then names the two "
        + "offices the two letters actually go to: the records office of the court that disposed of the case, "
        + "and the DCJS Record Review Unit. Neither address is held by the repository, and the packet says so "
        + "and names each office rather than gesturing at one."
    },
    {
      finding:
        "The decision forbids one specific promise: \"Do not promise that ordinary Sec. 160.55 violations will "
        + "receive full court-file sealing through Sec. 160.55.\"",
      consequence:
        "The limit is stated on the route sheet, in the instructions introduction, in the stop conditions and in "
        + "the what-this-is-not paragraph, in the decision's own terms: the partial seal does not reach the court "
        + "file, and the courthouse file remains publicly inspectable."
    },
    {
      finding:
        "The correction workflow has an order, and reversing it asks DCJS to correct a record on a notice the "
        + "court has not yet sent.",
      consequence:
        "The court letter is component one and the DCJS letter component two; the order is stated in the "
        + "component condition, in the service section and in the steps."
    }
  ],

  counselQuestions: [
    "The deliverable is two unstyled signed letters rather than any form, because neither OCA nor DCJS publishes one for a Sec. 160.55 correction and the controlling decision names none. Confirm that correspondence is the right participant-facing instrument, or supply the form.",
    "The packet publishes the certificate-of-disposition charges ($5 outside NYC, $10 within the five boroughs) from the compiled profile, whose table annotates that line to a Sec. 160.59 case. Confirm that the charge is the issuing court's price for the certificate and therefore the same for this route, or say that the figure may not be carried across.",
    "The packet names the DCJS Record Review Unit as the office that receives a correction submission about a person's own criminal-history record. Confirm that is the correct unit, or name the office that is.",
    "The packet tells a participant with an interests-of-justice non-sealing order to stop and take it to counsel, and carries no motion. Confirm that boundary.",
    "The packet states repeatedly that Sec. 160.55 does not seal the court file. Confirm the wording is strong enough to prevent the promise the decision forbids."
  ],

  reviewersAttention: [
    "This is an AGENCY-APPLICATION treatment. It carries no motion, no petition, no proposed order and no affidavit of service by design; a reviewer expecting a court packet is reviewing the wrong shape.",
    "The packet prints dollar figures. They come from the compiled New York profile, which is bound by SHA-256 and anchor-verified in source-receipt.json; the reasoning for carrying the certificate charge across is recorded in build-findings.json against amendment A3.",
    "The single most important participant-facing statement in this family is a negative one: Sec. 160.55 does not seal the court file. Please check that it is unmissable."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const dob = facts["participant.date_of_birth"];
    const address = facts["participant.street_address"];
    const phone = facts["participant.phone"];
    const email = facts["participant.email"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "court_transmission_correction_request") {
      L.push("THIS IS A LETTER TO A COURT'S RECORDS OFFICE. IT IS NOT A MOTION, A PETITION OR AN APPLICATION, AND IT IS NOT FILED.", "");
      L.push("TO: THE RECORDS OFFICE OF THE COURT THAT DISPOSED OF THE CASE NAMED BELOW", "");
      L.push("Name of that court, as it is printed on the certificate of disposition:");
      L.push(DOTS(), "");
      L.push("Address that court's records office receives correspondence at:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push(`FROM: ${name}`);
      L.push(`Date of birth: ${dob}`);
      L.push(`Mailing address: ${address}`);
      L.push(`Telephone: ${phone}`);
      L.push(`Email: ${email}`, "");
      L.push("RE: SEALING NOTICE UNDER CPL Sec. 160.55 - REQUEST TO TRANSMIT OR CORRECT", "");
      L.push("Docket or case number of the case, as printed on the certificate of disposition:");
      L.push(DOTS(), "");
      L.push("Date of the disposition, as printed on the certificate of disposition:");
      L.push(DOTS(), "");
      L.push("How the case was disposed of, as printed on the certificate of disposition:");
      L.push(DOTS(), "");
      L.push(`1. I, ${name}, am the defendant in the case identified above. It was disposed of on the date shown, and the disposition is one that CPL Sec. 160.55 seals automatically.`, "");
      L.push("2. My official criminal-history result still shows this case. What it shows, and the date of the result:", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. WHAT I AM ASKING THIS OFFICE TO DO. Transmit the sealing notice for this case to the Division of Criminal Justice Services and to the appropriate law-enforcement agencies, or correct the notice already transmitted, so that the automatic partial seal under CPL Sec. 160.55 is reflected on the criminal-history record. I am not asking the court to decide anything, and I am not asking it to seal the court file, which I understand Sec. 160.55 does not reach.", "");
      L.push("4. Please tell me in writing what was transmitted or corrected, and on what date.", "");
      L.push("DATE " + DOTS(28) + "   SIGNATURE OF WRITER " + DOTS(38), "");
      L.push("(The writer signs and dates this letter personally. Nothing on this page is signed or dated for the writer.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push("", "ENCLOSED: a copy of the certificate of disposition.");
    } else if (componentId === "dcjs_correction_submission") {
      L.push("THIS IS A LETTER TO A STATE AGENCY ABOUT ITS OWN RECORD. IT IS NOT A MOTION, A PETITION OR AN APPLICATION, AND IT IS NOT FILED WITH ANY COURT.", "");
      L.push("TO: NEW YORK STATE DIVISION OF CRIMINAL JUSTICE SERVICES - RECORD REVIEW UNIT", "");
      L.push("Address the Record Review Unit receives record correspondence at:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push(`FROM: ${name}`);
      L.push(`Date of birth: ${dob}`);
      L.push(`Mailing address: ${address}`);
      L.push(`Telephone: ${phone}`);
      L.push(`Email: ${email}`, "");
      L.push("RE: CORRECTION OF A CRIMINAL-HISTORY RECORD - AUTOMATIC PARTIAL SEALING UNDER CPL Sec. 160.55", "");
      L.push("Docket or case number of the case, as printed on the certificate of disposition:");
      L.push(DOTS(), "");
      L.push("Name of the court that disposed of the case:");
      L.push(DOTS(), "");
      L.push("Date of the disposition:");
      L.push(DOTS(), "");
      L.push(`1. I, ${name}, am the subject of the criminal-history record. Enclosed is a certified disposition for the case identified above. The disposition is one that CPL Sec. 160.55 seals automatically.`, "");
      L.push("2. My criminal-history result still shows this case. What it shows, and the date of the result:", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. WHAT I AM ASKING DCJS TO DO. Correct the criminal-history record so that it reflects the automatic partial sealing of this case under CPL Sec. 160.55.", "");
      L.push("4. Please tell me in writing what was corrected, and on what date.", "");
      L.push("DATE " + DOTS(28) + "   SIGNATURE OF WRITER " + DOTS(38), "");
      L.push("(The writer signs and dates this letter personally. Nothing on this page is signed or dated for the writer.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push("", "ENCLOSED: the certified disposition for the case identified above.");
    } else {
      L.push(`Prepared for: ${name}`, "");
      L.push("THE ONE THING TO READ FIRST", "");
      L.push("CPL Sec. 160.55 DOES NOT SEAL THE COURT FILE. The recorded rule is that qualifying violations may disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable. Nobody may promise you that an ordinary Sec. 160.55 violation will receive full court-file sealing through Sec. 160.55, and this packet does not.", "");
      L.push("WHAT THIS IS, AND WHAT YOU DO NOT FILE", "");
      L.push("CPL Sec. 160.55 provides automatic partial sealing when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise. For a post-November 1, 1991 qualifying disposition the participant ordinarily FILES NOTHING; the clerk notifies DCJS and the appropriate law-enforcement agencies.");
      L.push("So you file no motion, no petition, no application and no proposed order. This packet is two letters, for the case where the automatic seal did not reach the record.", "");
      L.push("WHO HOLDS WHAT", "");
      L.push("The court that disposed of your case holds the court record and originates the sealing notice. DCJS holds the statewide criminal-history record that most background checks run against. Each corrects only its own record, which is why the recorded workflow goes to both, in this order: obtain a certificate of disposition, check the official criminal-history result, ask the sentencing court to transmit or correct the sealing notice, then send the certified disposition to DCJS for correction.", "");
      L.push("WHAT IT COSTS", "");
      L.push("The sealing itself: $0, and no filing, because there is no filing. The compiled New York profile this route is built on states it in its own fee table - \"Automatic sealing (160.50/160.55/Clean Slate) $0 No filing\".");
      L.push("Certificate of disposition: $5 per case outside New York City, $10 per case within the five boroughs, from the same profile. That is the issuing court's price for the certificate. Ask the records office of the court that will issue yours what it charges today.");
      L.push("DCJS record review: a DCJS fee applies and the profile records no amount for it. The DCJS Record Review Unit publishes what its own record review costs; ask it before you order one.");
      L.push("There is no fee waiver here because there is no filing fee to waive. If you cannot pay the certificate charge, ask the court's records office what it does for a person who cannot pay; legal-aid organisations and county district-attorney sealing units assist at no cost.", "");
      L.push("WHO ELSE HAS TO BE TOLD", "");
      L.push("Nobody. There is no opposing party, no district attorney to notify and no affidavit of service. Send each letter to its own office, keep dated proof, and send the court letter first.", "");
      L.push("WHEN TO STOP AND GET HELP", "");
      L.push("- the court previously entered an interests-of-justice order that the case would NOT be sealed - the recorded escalation is a motion or counsel;");
      L.push("- the disposition is from before November 1, 1991 - it may require a motion under the statute's legacy branch;");
      L.push("- what you want is the courthouse file sealed - Sec. 160.55 does not reach it;");
      L.push("- the case ended in something other than a violation or traffic infraction; CPL Sec. 160.57 Clean Slate is separate and is not reached through this route;");
      L.push("- either office refuses to correct the record;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("Two letters to two record-holding offices, authored from one recorded branch of CPL Sec. 160.55. Not an OCA or DCJS form - neither publishes one for this - not a motion, petition or application, not filed anywhere, not legal advice, not sent for you, and not a promise that either office will correct anything.");
    }
    L.push("", `Route: ${this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "court_transmission_correction_request") {
      writes.push(
        h.write("writer_name", "Writer named at the head of this letter", "participant.full_legal_name"),
        h.write("date_of_birth", "Date of birth of the writer, in the FROM block of this letter", "participant.date_of_birth"),
        h.write("mailing_address", "Mailing address of the writer, in the FROM block of this letter", "participant.street_address"),
        h.write("telephone", "Telephone number of the writer, in the FROM block of this letter", "participant.phone"),
        h.write("email", "Email address of the writer, in the FROM block of this letter", "participant.email")
      );
      refusals.push(
        h.rbf("court_identity", "Name of that court, as it is printed on the certificate of disposition",
          "the name of the court that disposed of your case, copied from the certificate of disposition",
          "which court disposed of a particular case is a fact of the participant's own record"),
        h.rbf("court_records_address", "Address that court's records office receives correspondence at",
          "the postal address that court's records office receives correspondence at - ask that office, since the repository holds no court address and they change",
          "no committed record holds the address of any particular New York court records office"),
        h.rbf("docket_number", "Docket or case number of the case, as printed on the certificate of disposition",
          "the docket or case number, copied exactly from the certificate of disposition",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("disposition_date", "Date of the disposition, as printed on the certificate of disposition",
          "the date of the disposition, copied exactly from the certificate of disposition",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("how_disposed", "How the case was disposed of, as printed on the certificate of disposition",
          "how the case ended, copied exactly from the certificate of disposition - this is what makes the case one Sec. 160.55 seals automatically",
          "how a particular case ended lives on the court's own record"),
        h.rbf("criminal_history_shows", "What the criminal-history result shows for this case, and the date of the result",
          "what your official criminal-history result still shows for this case, and the date printed on that result",
          "the platform has not seen and does not hold any participant's criminal-history result"),
        h.protectedBlank("writer_signature", "Signature of the writer on this letter",
          "the writer signs the letter personally"),
        h.protectedBlank("signature_date", "Date beside the writer's signature on this letter",
          "a date written before the letter is signed would be false")
      );
    } else if (componentId === "dcjs_correction_submission") {
      writes.push(
        h.write("subject_name", "Subject named at the head of this submission", "participant.full_legal_name"),
        h.write("subject_date_of_birth", "Date of birth of the subject, in the FROM block of this submission", "participant.date_of_birth"),
        h.write("subject_mailing_address", "Mailing address of the subject, in the FROM block of this submission", "participant.street_address"),
        h.write("subject_telephone", "Telephone number of the subject, in the FROM block of this submission", "participant.phone"),
        h.write("subject_email", "Email address of the subject, in the FROM block of this submission", "participant.email")
      );
      refusals.push(
        h.rbf("dcjs_address", "Address the Record Review Unit receives record correspondence at",
          "the postal address the DCJS Record Review Unit receives record correspondence at - that unit publishes it, and the repository does not hold it",
          "no committed record holds the DCJS Record Review Unit's postal address"),
        h.rbf("submission_docket_number", "Docket or case number of the case, as printed on the certificate of disposition",
          "the docket or case number, copied exactly from the certificate of disposition",
          "no case identifier is held for a record the platform has not seen"),
        h.rbf("submission_court_identity", "Name of the court that disposed of the case",
          "the name of the court that disposed of the case, copied from the certificate of disposition",
          "which court disposed of a particular case is a fact of the participant's own record"),
        h.rbf("submission_disposition_date", "Date of the disposition",
          "the date of the disposition, copied exactly from the certificate of disposition",
          "no disposition fact is held for a record the platform has not seen"),
        h.rbf("submission_criminal_history_shows", "What the criminal-history result shows, and the date of the result",
          "what your official criminal-history result still shows for this case, and the date printed on that result",
          "the platform has not seen and does not hold any participant's criminal-history result"),
        h.protectedBlank("submission_signature", "Signature of the writer on this submission",
          "the writer signs the submission personally"),
        h.protectedBlank("submission_signature_date", "Date beside the writer's signature on this submission",
          "a date written before the submission is signed would be false")
      );
    } else {
      writes.push(h.write("prepared_for", "Person this route sheet is prepared for", "participant.full_legal_name"));
    }
    return { writes, refusals };
  }
};

/* ============================================================================
 * SHARED AGENCY-APPLICATION / COMPOSED BUILD CORE.
 *
 * Everything above this line is the family's own: its committed-record
 * bindings, its official-document bindings, its composed bodies, its field
 * maps and its instructions content. Everything below is family-independent
 * plumbing: deterministic rendering, byte proof, the builder's own count of
 * the nine completeness counters, and the census-v1 output records.
 *
 * It is a direct descendant of the composed-treatment core proven by the
 * FABLE-B12 builders, with ONE addition: a component may be an OFFICIAL
 * AGENCY DOCUMENT rather than a composed page. An agency application is not a
 * court filing, and the participant applies on the agency's own published
 * form; so where the agency publishes one, this core binds it by exact
 * SHA-256, writes only into measured boxes read from the document's own rule
 * strokes, and copies its pages into the packet. Where the agency publishes
 * none, no form is invented and the deliverable is the composed route sheet.
 *
 * DETERMINISM. Every PDFDocument.create() here is stamped through
 * stampDeterministic before it is saved, because pdf-lib writes the wall clock
 * into a created document and save({updateMetadata:false}) does not remove a
 * stamp that is already there. An overlaid official document keeps the source
 * document's own dates through carryDates() inside the finalizer. Two builds
 * of this family from the same inputs are therefore byte-identical, which is
 * what a hash-bound raster receipt depends on.
 * ========================================================================== */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const MASTER_LIBRARY = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
export const DOTS = (n = 84) => ".".repeat(n);

const OFFICIAL = SPEC.officialComponents ?? {};
const isOfficial = (componentId) => Object.hasOwn(OFFICIAL, componentId);

/* ---- committed-record binding ------------------------------------------------ *
 * The authority this family composes from is a set of COMMITTED repository
 * records, each bound by exact SHA-256 at build time, and each anchor string a
 * statement this build RELIES ON, re-read from the committed bytes before
 * anything is composed. The build refuses if a record is missing or an anchor
 * is no longer there. */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) {
      failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" });
      continue;
    }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) {
      failures.push({
        recordId: rec.recordId, path: rec.path,
        why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`,
        missingAnchors: missing
      });
      continue;
    }
    resolved.push({
      recordId: rec.recordId, path: rec.path, role: rec.role,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length
    });
  }
  return { resolved, failures };
}

/* ---- official-document binding ------------------------------------------------ *
 * Resolved through the committed corpus index and its declared custody roots,
 * never by joining a path onto a guessed root: the index carries more than one
 * custody now and every custody but the Master Library writes
 * repository-relative paths. The pinned SHA-256 is what decides these are the
 * document's bytes, and it is re-computed from the file on disk. */
function resolveOfficialDocuments() {
  const bound = [];
  const failures = [];
  if (Object.keys(OFFICIAL).length === 0) return { bound, failures };
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolver = makeCorpusEntryResolver(index, {
    repoRoot: ROOT, masterLibraryRoot: path.join(ROOT, MASTER_LIBRARY)
  });
  for (const [componentId, doc] of Object.entries(OFFICIAL)) {
    const entry = (index.entries ?? []).find((e) => e.sha256 === doc.sha256);
    if (!entry) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, why: "no committed corpus-index entry carries this SHA-256" });
      continue;
    }
    const file = resolver.resolve(entry);
    if (!fs.existsSync(file)) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, path: entry.path, custody: entry.custody, why: "the corpus index names this document but its bytes are not mounted in this checkout" });
      continue;
    }
    const bytes = fs.readFileSync(file);
    const observed = crypto.createHash("sha256").update(bytes).digest("hex");
    if (observed !== doc.sha256) {
      failures.push({ sourceId: doc.sourceId, componentId, sha256: doc.sha256, observed, why: "the bytes on disk do not hash to the pinned SHA-256" });
      continue;
    }
    bound.push({ componentId, doc, bytes, entry, custody: entry.custody, pathInCustody: entry.path });
  }
  return { bound, failures };
}

/* ---- measured write boxes, read from the document's own strokes ---------------- *
 * A write box is four strokes read from the page content stream — the rule
 * above, the rule below, and a vertical divider on each side — and never a
 * constant offset from a caption. The top of the box is measured too: it
 * begins a fixed clearance under the LOWEST printed line inside the cell, so a
 * caption that wraps to two lines cannot have a value drawn over its second
 * line. A cell that does not measure is recorded as geometry drift and nothing
 * is drawn in it. */
const RULE_TOLERANCE = 1.6;
const SPAN_OVERLAP = 0.55;
const CELL_INSET = 3;
const WRITE_BOX_LIFT = 3.5;
const CAPTION_CLEARANCE = 2.5;
const MIN_WRITE_BOX_HEIGHT = 7.5;
const MAX_WRITE_BOX_HEIGHT = 12;

async function measureCells(bytes, cells) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const perPage = new Map();
  for (const [i, page] of pages.entries()) {
    const rules = await rulesOfPage(page);
    perPage.set(i + 1, {
      horizontal: rules.horizontal ?? [], vertical: rules.vertical ?? [],
      items: extractTextItems(page),
      size: page.getSize()
    });
  }
  const measured = [];
  const drift = [];
  for (const cell of cells) {
    const here = perPage.get(cell.page) ?? { horizontal: [], vertical: [], items: [] };
    const cellHeight = cell.top - cell.bottom;
    const overlapOf = (v) => {
      const y0 = Number(v.y);
      const y1 = y0 + Number(v.height ?? 0);
      return Math.max(0, Math.min(y1, cell.top) - Math.max(y0, cell.bottom)) / cellHeight;
    };
    const hRule = (y) => here.horizontal
      .filter((r) => Math.abs(r.y - y) <= RULE_TOLERANCE)
      .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    const vRule = (x) => here.vertical
      .filter((v) => Math.abs(v.x - x) <= RULE_TOLERANCE && overlapOf(v) >= SPAN_OVERLAP)
      .sort((a, b) => overlapOf(b) - overlapOf(a))[0];
    const top = hRule(cell.top);
    const bottom = hRule(cell.bottom);
    const left = vRule(cell.left);
    const right = vRule(cell.right);
    if (!top || !bottom || !left || !right) {
      drift.push({
        cell: cell.key, page: cell.page,
        expected: { top: cell.top, bottom: cell.bottom, left: cell.left, right: cell.right },
        found: { top: top?.y ?? null, bottom: bottom?.y ?? null, left: left?.x ?? null, right: right?.x ?? null }
      });
      continue;
    }
    const printedInCell = here.items
      .filter((t) => String(t.text).trim() && t.x >= left.x - 2 && t.x <= right.x + 2 && t.y >= bottom.y - 1 && t.y <= top.y + 1)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lowestPrintedLine = printedInCell.length > 0 ? Math.min(...printedInCell.map((t) => t.y)) : null;
    const boxBottom = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
    const writeBox = {
      x: Number((left.x + CELL_INSET).toFixed(2)),
      y: Number(boxBottom.toFixed(2)),
      width: Number((right.x - left.x - CELL_INSET * 2).toFixed(2)),
      height: Math.max(0, height)
    };
    measured.push({
      ...cell, writeBox, rect: writeBox,
      tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
      lowestPrintedLineInCell: lowestPrintedLine,
      rectBasis:
        "measured_table_cell: four strokes read from the page content stream — the rule above, the rule below, "
        + "and the vertical divider on each side, each re-checked against the pinned binary",
      measuredCell: {
        topRuleY: top.y, bottomRuleY: bottom.y, leftDividerX: left.x, rightDividerX: right.x,
        leftDividerCoversCell: Number(overlapOf(left).toFixed(4)),
        rightDividerCoversCell: Number(overlapOf(right).toFixed(4)),
        topRuleSpan: [top.x, top.endX], bottomRuleSpan: [bottom.x, bottom.endX]
      },
      printedTextInThisCell: printedInCell.slice(0, 10).map((t) => ({ x: Math.round(t.x), y: Math.round(t.y), extracted: t.text }))
    });
  }
  return { measured, drift, pageCount: pages.length };
}

/* ---- deterministic composed-page rendering ---------------------------------- */
export function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("Φ", "-");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label, page = 1) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: isOfficial(componentId)
      ? "measured_table_cell_read_from_the_official_documents_own_rule_strokes"
      : "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId, page = 1) => ({ ...base(id, label, page), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    agencyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: "court, clerk, prosecutor, agency, or hearing field; the agency completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why, page = 1) => ({
      ...base(id, label, page),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const h = mapHelpers(componentId);
  const { writes, refusals } = SPEC.mapFor(componentId, h);
  return {
    formNumber: OFFICIAL[componentId]?.documentId ?? componentId,
    documentId: OFFICIAL[componentId]?.documentId ?? componentId,
    documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: SPEC.componentRoutes?.[componentId] ?? SPEC.routes[0].routeKey,
      ...(SPEC.componentConditions[componentId] ? { conditional: true, conditionDescription: SPEC.componentConditions[componentId] } : {})
    },
    structuralClass: isOfficial(componentId) ? "official_flat_document_with_measured_overlay" : "composed_document",
    composedFrom: isOfficial(componentId) ? null : SPEC.composedFromNote,
    officialSource: isOfficial(componentId)
      ? { sourceId: OFFICIAL[componentId].sourceId, sha256: OFFICIAL[componentId].sha256 } : null,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the writes ------------------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. For an overlaid official document
 * that is the page's own drawn text, which is where a flat overlay puts it. */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentId = map.documentRole;
    const componentText = String(textOfComponent.get(componentId) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      // An official document's value is what the overlay actually drew, which
      // the fitter may have shrunk but never rewrites; a composed page's value
      // is the fact itself. A field the overlay REFUSED is not asserted here,
      // because the refusal is the record and inventing ink to match it would
      // be the defect this proof exists to catch.
      const drawn = drawnValues.get(`${componentId} ${w.field}`);
      if (isOfficial(componentId) && drawn === undefined) continue;
      const value = sanitizePdfText(String(drawn ?? facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${componentId}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: componentId, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ----------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
  }

  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: r.fieldId ?? r, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.documentRole, documentId: m.documentId, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${SPEC.instructionsHeading}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## Who decides this, and what you do not file", "");
  for (const p of SPEC.whoDecides) out.push(p, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c}\` | ${SPEC.componentDescriptions[c]} |`);
  out.push("");

  out.push("## Where this goes", "");
  for (const p of SPEC.filingDestination) out.push(p, "");

  out.push("## What it costs", "");
  for (const p of SPEC.feeAndWaiver) out.push(p, "");

  out.push("## Who else has to be told", "");
  for (const p of SPEC.service) out.push(p, "");

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    out.push("## Documents you must obtain first", "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is a labelled blank on the page named beside it. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${SPEC.componentTitles[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  if ((SPEC.notTold ?? []).length > 0) {
    out.push("## What this packet does not tell you, and who does", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route(s): ${SPEC.routes.map((r) => r.routeKey).join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------------ */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveRecords();
  const { bound, failures: sourceFailures } = resolveOfficialDocuments();
  if (failures.length > 0 || sourceFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: [...failures, ...sourceFailures],
      why: "a committed record or a bound official document this family builds from is missing, unmounted, or no longer carries what this build relies on; nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }
  const boundByComponent = new Map(bound.map((b) => [b.componentId, b]));

  // Every cell this family writes into is measured from the official
  // document's own strokes before anything is drawn. A cell that does not
  // measure stops the family rather than being drawn at a guessed rectangle.
  const cellsByComponent = new Map();
  const allDrift = [];
  for (const b of bound) {
    const cells = SPEC.officialCells?.[b.componentId] ?? [];
    if (cells.length === 0) { cellsByComponent.set(b.componentId, []); continue; }
    const { measured, drift } = await measureCells(b.bytes, cells);
    cellsByComponent.set(b.componentId, measured);
    for (const d of drift) allDrift.push({ component: b.componentId, ...d });
  }
  if (allDrift.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", geometryDrift: allDrift,
      why: "a write box could not be measured from the official document's own rule strokes; nothing is drawn at a guessed rectangle",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = SPEC.components.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, sha256: b.doc.sha256, custody: b.custody })),
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      cellsMeasured: [...cellsByComponent.values()].reduce((n, c) => n + c.length, 0),
      components: SPEC.components,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  const blocked = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, STALE_BLOCK), "utf8")).hashes ?? []);
  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = SPEC.components.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  const overlayReports = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];
    const drawnValues = new Map();

    for (const componentId of SPEC.components) {
      let componentBytes;
      let sourceSha = null;
      if (isOfficial(componentId)) {
        const b = boundByComponent.get(componentId);
        sourceSha = b.doc.sha256;
        const cells = cellsByComponent.get(componentId) ?? [];
        const writable = cells.filter((c) => c.fact && !c.tooShallowToWriteIn);
        const { bytes, report } = await finalizeFlatOverlay({
          sourceBytes: b.bytes,
          expectedSha256: b.doc.sha256,
          anchors: writable.map((c) => ({
            label: c.bindingLabel ?? c.label, page: c.page, writeBox: c.writeBox,
            factId: c.fact, protectedRules: []
          })),
          explicitMappings: Object.fromEntries(writable.map((c) => [c.bindingLabel ?? c.label, c.fact])),
          facts,
          documentTextLines: [],
          title: `${SPEC.jurisdiction} ${b.doc.documentId}`
        });
        for (const w of report.written) {
          const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
          if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(facts[cell.fact] ?? ""));
        }
        overlayReports.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...report });
        componentBytes = Buffer.from(bytes);
      } else {
        const body = SPEC.composedBody(componentId, facts);
        assert.ok(body.includes(facts["participant.full_legal_name"]),
          `${componentId}: the composed page must carry the participant's name`);
        componentBytes = await renderComposedPdf(body, SPEC.componentTitles[componentId]);
      }
      const component = await PDFDocument.load(componentBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(component, component.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), component: componentId,
          documentId: OFFICIAL[componentId]?.documentId ?? componentId,
          sourcePage: i + 1, sourceSha256: sourceSha
        });
      }
      documents.push(OFFICIAL[componentId]?.documentId ?? componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    if (blocked.has(sha256)) {
      return { familyId: SPEC.familyId, status: "STOPPED", stopClass: "RENDERED_TO_A_BLOCKED_HASH", sha256 };
    }

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName, drawnValues);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_agency_application_packet",
      fixture: fixtureName, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          component: pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.worklistGroupId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "participant_agency_application",
    custodyClass: SPEC.custodyClass, acquisitionCommissioned: false,
    bindingMethod:
      "committed repository records bound by exact SHA-256 at build time with every relied-on statement re-read "
      + "from the committed bytes as an anchor"
      + (bound.length > 0 ? ", and every official agency document bound by exact SHA-256 resolved through the committed corpus index and its declared custody roots" : ""),
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    agencyTreatmentNote: SPEC.agencyTreatmentNote,
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    documents: bound.map((b) => ({
      sourceIds: [b.doc.sourceId], documentId: b.doc.documentId, formNumber: b.doc.formNumber ?? b.doc.documentId,
      officialTitle: b.doc.officialTitle, revision: b.doc.revision ?? null,
      sha256: b.doc.sha256, byteLength: b.bytes.length,
      custody: b.custody, pathInCustody: b.pathInCustody,
      matchedBy: "exact_pinned_sha256_recomputed_from_the_bytes_on_disk",
      corpusIndexAgrees: b.entry.sha256 === b.doc.sha256 && b.entry.byteLength === b.bytes.length,
      pageCount: b.entry.pageCount, acroFieldCount: b.entry.acroFieldCount,
      structuralClassObserved: b.entry.structuralClassObserved,
      instrumentKind: b.doc.instrumentKind ?? "participant_agency_application_form",
      renderStrategy: (SPEC.officialCells?.[b.componentId] ?? []).length > 0 ? "measured_flat_overlay" : "delivered_unmodified"
    })),
    composedComponentsAuthoredByThisBuild: SPEC.components.filter((c) => !isOfficial(c)),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family prepares for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    renderStrategy: bound.length > 0 ? "measured_flat_overlay_and_composed_pages" : "composed_agency_application",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "participant_agency_application",
    agencyTreatmentNote: SPEC.agencyTreatmentNote,
    officialForm: bound.length > 0 ? bound.map((b) => b.doc.documentId) : null,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    measuredCells: Object.fromEntries([...cellsByComponent.entries()].map(([k, v]) => [k, v.map((c) => ({
      key: c.key, page: c.page, label: c.label, fact: c.fact ?? null, rect: c.rect,
      rectBasis: c.rectBasis, measuredCell: c.measuredCell, tooShallowToWriteIn: c.tooShallowToWriteIn
    }))])),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: SPEC.components,
    componentConditions: SPEC.componentConditions,
    boundOfficialDocuments: bound.map((b) => ({ documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every written fact value was read back from the extracted text of its component's own pages in the saved packet bytes, not from this builder's intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    overlayReports: overlayReports.map((r) => ({
      fixture: r.fixture, component: r.component, documentId: r.documentId,
      sourceSha256: r.sourceSha256, outputSha256: r.outputSha256,
      written: r.written, refused: r.refused, unfittable: r.unfittable
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.documentRole, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    implementationStrategy: "participant_agency_application",
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId, blocking: [],
    findings: SPEC.buildFindings
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    implementationStrategy: "participant_agency_application",
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "participant_agency_application",
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    officialDocumentsBound: bound.map((b) => ({ sourceId: b.doc.sourceId, documentId: b.doc.documentId, sha256: b.doc.sha256, custody: b.custody })),
    components: SPEC.components,
    documents: artifacts[0]?.documents ?? [],
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, bytes: a.byteLength, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE") process.exit(1); })
    .catch((e) => { console.error(e); process.exit(1); });
}
