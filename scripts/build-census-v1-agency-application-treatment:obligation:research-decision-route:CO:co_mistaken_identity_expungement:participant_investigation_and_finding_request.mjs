#!/usr/bin/env node
/**
 * FABLE-PD agency-application treatment — Colorado mistaken-identity
 * expungement, the participant's written REQUEST TO THE ARRESTING AGENCY for
 * an investigation and a mistaken-identity finding.
 *
 *   node "scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request
 *
 * WHAT KIND OF FAMILY THIS IS, AND WHY
 *
 * MASTER_QUEUE gives this family implementationStrategy
 * `participant_agency_application`. That is not a bookkeeping label: this
 * route is NOT a court filing and must not be dressed as one. The controlling
 * 2026-08-28 research-track decision for `co_mistaken_identity_expungement`
 * records that C.R.S. Sec. 24-72-702 "creates a mandatory agency-first
 * procedure", that the duty to petition the district court belongs to the
 * ARRESTING AGENCY, and — for this route exactly — that "If there is no agency
 * finding, the first output should be a written request for investigation and
 * finding, not the court petition."
 *
 * So the deliverable here is the request, addressed to the agency, plus a
 * route sheet that says what the agency is, what it requires, how the
 * participant reaches it, what it costs so far as the repository establishes,
 * and what the participant does NOT have to file. Its sibling family
 * `...:participant_court_petition_after_90_days` carries the court petition;
 * nothing of that petition is repeated here, and a participant who has no
 * agency finding is told, in terms, that the petition is not their instrument
 * yet.
 *
 * NO FORM IS INVENTED. The decision records that "No dedicated statewide JDF
 * form was located" for this track at all. Colorado publishes no application
 * form for a mistaken-identity investigation request, and this build does not
 * manufacture one that looks official: the request is plainly a letter the
 * participant signs, and it says so on its face.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/co/agency-application-treatment:obligation:research-decision-route:co:co-mistaken-identity-expungement:participant-investigation-and-finding-request--official-pdf-fill",
  jurisdiction: "CO",
  custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT",
  legalName: "Written Request to the Arresting Agency for an Investigation and a Mistaken-Identity Finding Under C.R.S. Sec. 24-72-702",
  routeName: "asking the law-enforcement agency that arrested you to investigate and find that the arrest was a mistaken-identity arrest, under C.R.S. Sec. 24-72-702",
  statutes: ["C.R.S. § 24-72-702"],
  routes: [
    { routeKey: "obligation:research-decision-route:CO:co_mistaken_identity_expungement:participant_investigation_and_finding_request" }
  ],

  records: [
    {
      recordId: "legal-decision:2026-08-28:research-track:co_mistaken_identity_expungement",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role:
        "the controlling research-track decision: the agency-first mechanism, the agency's own 90-day duty, the "
        + "no-fee rule for the expungement, the precondition of an actual agency finding, and the recorded rule "
        + "that where there is no finding the FIRST OUTPUT is a written request for investigation and finding",
      mustContain: [
        "C.R.S. § 24-72-702 creates a mandatory agency-first procedure.",
        "No later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, the arresting agency must petition the district court in the judicial district where the arrest occurred.",
        "If the arresting agency fails to file within that period, the person may file the petition in the same district court. No filing fee or other expungement cost may be charged.",
        "This route depends on an actual agency finding of mistaken identity. It is not a general vehicle for litigating innocence where the agency has never made that determination.",
        "No dedicated statewide JDF form was located.",
        "If there is no agency finding, the first output should be a written request for investigation and finding, not the court petition.",
        "NO FINDING / DISPUTE: AGENCY REQUEST, THEN ATTORNEY HANDOFF"
      ]
    }
  ],

  officialComponents: {},
  officialCells: {},

  components: ["agency_request", "agency_route_sheet"],
  componentTitles: {
    agency_request: "Request to the Arresting Agency for an Investigation and a Mistaken-Identity Finding",
    agency_route_sheet: "Where This Goes, What It Costs, and What You Do Not File"
  },
  componentConditions: {},
  componentDescriptions: {
    agency_request:
      "the written request you sign and send to the law-enforcement agency that arrested you, asking it to "
      + "investigate and to find that the arrest was a mistaken-identity arrest — the recorded first output on "
      + "this route",
    agency_route_sheet:
      "the agency this goes to, what the agency does with it, what the recorded rule says it costs, what you do "
      + "NOT file, and what happens next whichever way the agency answers"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Denver, CO 80202",
      "participant.phone": "303-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Uncompahgre Crossing Road, Apartment 14B, Grand Junction, Colorado 81501-2214",
      "participant.phone": "(970) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling 2026-08-28 research-track decision for co_mistaken_identity_expungement "
    + "(data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json), bound by SHA-256 and "
    + "anchor-verified at build time",

  formIdentityNote:
    "The controlling decision records that no dedicated statewide JDF form was located for a Sec. 24-72-702 "
    + "mistaken-identity matter, and Colorado publishes no application form for an investigation request. Both "
    + "pages are therefore authored by this build from that committed decision. Nothing here is styled as an "
    + "official Colorado form, no JDF number appears on any page, and no form was substituted or invented.",

  agencyTreatmentNote:
    "This is an AGENCY APPLICATION, not a court filing. The participant sends a written request to the "
    + "law-enforcement agency that arrested them; no petition, motion or proposed order is filed with any court "
    + "on this route, and the packet says so on the face of both pages. The court petition under the same statute "
    + "is a different route and a different family.",

  routeSelectionNote:
    "One route, one instrument. The request states, in the committed decision's own terms, that it is the "
    + "no-finding first output and not the court petition, so nothing about which instrument this is remains for "
    + "the participant to elect. The two forks that follow — the agency makes a finding, or it does not — are "
    + "route boundaries handled by the route sheet and by the stop conditions, not elections on any page here.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "written request to the arresting agency for investigation and finding",
      determinedBy:
        "the controlling decision: \"If there is no agency finding, the first output should be a written request "
        + "for investigation and finding, not the court petition.\""
    }
  ],

  instructionsHeading: "What to do — asking the arresting agency to investigate a mistaken-identity arrest (C.R.S. Sec. 24-72-702)",

  instructionsIntro: [
    "**This is not a court filing.** The recorded Colorado rule this packet is built on is that C.R.S. § 24-72-702 creates a *mandatory agency-first procedure*: no later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, **the arresting agency** must petition the district court in the judicial district where the arrest occurred. The petition is the agency's duty first, not yours.",
    "**That whole machinery starts with a finding, and you may not have one.** The controlling decision records the precondition exactly: this route depends on an actual agency finding of mistaken identity, and it is *not* a general vehicle for litigating innocence where the agency has never made that determination. Where there is no finding, the recorded first output is **a written request for investigation and finding, not the court petition** — and that request is what this packet is.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Everything about the arrest itself lives on the arrest record, so every one of those is a labelled blank listed below, and you fill it from the paperwork, never from memory."
  ],

  whoDecides: [
    "**The agency decides, not you and not a court.** You are asking the law-enforcement agency that arrested you to investigate its own record of the arrest and to find that you were arrested because of mistaken identity. Whether it investigates, and what it finds, is the agency's decision.",
    "**You do not file a petition, a motion, or a proposed order anywhere on this route.** Under the recorded rule the arresting agency is the one that petitions the district court, and it has 90 days from its finding to do it. If it makes a finding and then lets those 90 days pass without petitioning, the statute lets you file the petition yourself in the same district court — but that is a different instrument in a different packet, and it is not available to you until there is a finding and the 90 days have run.",
    "**You do not pay a court anything on this route, because you are not in court on this route.**"
  ],

  filingDestination: [
    "**Send this request to the law-enforcement agency that arrested you** — its records unit, or the office that agency names for record enquiries. That is where the request belongs, because under the recorded rule it is that agency that investigates and that agency that must petition the court if it finds mistaken identity.",
    "**The repository does not hold the name, address or contact details of the agency that arrested you**, and no held record could: which agency arrested you is a fact of your own arrest. Your arrest paperwork, citation or booking record names the arresting agency; **the records unit of that agency is the office to ask** where a written record-correction request is received and in what form it wants it.",
    "**Nothing is filed with a court.** The court that would ever see this matter is the district court of the judicial district where the arrest occurred, and the recorded rule is that the arresting agency petitions it — not you, and not yet."
  ],

  feeAndWaiver: [
    "**No held source states any charge for making this request to the agency, and this packet asks you to pay nothing.** A written request to a law-enforcement agency to look at its own record is not a court filing and carries no filing fee.",
    "**What the recorded rule does say about cost is about the expungement itself:** \"No filing fee or other expungement cost may be charged.\" That sentence is from the controlling decision's statement of C.R.S. § 24-72-702 and it governs the expungement this route eventually leads to. It does not, on its own terms, price this request — because the request is not the expungement.",
    "**If the agency tells you it charges for a records search or for copies, that is that agency's own schedule and not a fee for this request.** Ask the records unit of the agency that arrested you what its charge is for and get the answer before you pay: that office is the one that publishes it, and it is the office this request is going to anyway.",
    "**Colorado's published sealing fee schedule does not answer this question, and this packet does not borrow it.** The compiled Colorado profile carries filing fees for petition sealing on the JDF 417 and JDF 612 forms. Those are a different statutory scheme with different forms, and a figure keyed to a JDF 612 conviction-sealing petition is not the price of anything on this route."
  ],

  service: [
    "**There is nobody to serve.** This is a request to an agency, not a proceeding: there is no opposing party, no district attorney to notify and no certificate of service, and no held record states any service requirement for it.",
    "**Send it to one place — the arresting agency — and keep proof that you did.** Send it by a method that gives you a dated receipt, and keep a copy of everything you sent. If the agency later says it never received the request, that receipt is what you have.",
    "**If the agency tells you it wants a copy sent somewhere else as well** — its own legal unit, a county records office, or the district attorney — do what it asks and keep proof of that too. The records unit of the arresting agency is the office that can tell you, and it is the only office the held record points to."
  ],

  documentsToObtain: [
    ["Your arrest paperwork — the citation, booking sheet or arrest report, showing the arrest date, the agency, the case or incident number, and the identifiers the arrest was recorded under", "the arresting agency, or the court where the case was opened if one was"],
    ["Whatever shows the arrest was of the wrong person — an identity document, a record of where you actually were, the name of the person you were mistaken for, if you know it", "you; nothing in the repository holds it, and the agency will be deciding on what you give it"],
    ["Anything showing that no charges were filed arising from the arrest", "the district attorney's office for that judicial district, or the court — the arresting agency can tell you where the no-charge status is recorded"]
  ],

  steps: [
    "**Work out which agency arrested you** and find its records unit. Your arrest paperwork names the agency; the agency's records unit is where a written request about its own records is received.",
    "**Fill in every labelled blank on the request** from the arrest paperwork itself. Each one is listed in the table above with what belongs in it.",
    "**Attach what you have.** The agency is deciding whether you were arrested in mistake for someone else, and it decides on what you put in front of it. Attach the identity evidence and, if you have it, anything showing no charges were filed.",
    "**Sign and date the request yourself.** The platform never signs for you and never dates a signature.",
    "**Send it to the agency's records unit** by a method that gives you a dated receipt, and keep a full copy.",
    "**Wait for the agency's answer, and keep the date.** If the agency makes a mistaken-identity finding, the recorded rule gives it 90 days from that finding to petition the district court of the judicial district where the arrest occurred. Write down the date of the finding; the 90 days runs from it.",
    "**If the 90 days pass and the agency has not petitioned**, the statute lets you file the petition yourself in the same district court. That is a different instrument and is not in this packet — ask for the Colorado mistaken-identity court-petition packet, which is built for exactly that.",
    "**If the agency refuses to investigate, finds against you, or disputes what you have sent, stop and take it to a lawyer.** The recorded escalation for a no-finding or a dispute is an attorney handoff, not a self-help filing."
  ],

  deliberatelyBlank: [
    "**Your signature, and the date beside it.** A signature is yours alone, and a date written before you sign it would be false.",
    "**The agency's answer, its finding, and anything the agency writes.** The whole point of the request is that the agency decides; nothing on this packet decides it for them.",
    "**Every fact about the arrest.** The platform holds no arrest record for you and does not guess at one."
  ],

  notTold: [
    "**The name and address of the agency that arrested you.** No held record establishes it, because it is a fact of your own arrest. Your arrest paperwork names the agency, and the records unit of that agency is the office to ask for the address a written request should go to.",
    "**How long the agency has to answer your request.** The recorded rule sets a 90-day clock on the agency's duty to PETITION once it has made a finding. Nothing held sets a deadline for the agency to answer a request in the first place. Ask the records unit of the arresting agency what its own turnaround is.",
    "**Whether the agency charges for a records search.** That is that agency's schedule, and its records unit publishes it — see *What it costs* above."
  ],

  stopConditions: [
    "the agency refuses to investigate, or investigates and finds against you — the recorded escalation is an attorney handoff, not a self-help filing;",
    "the agency, the district attorney or anyone else disputes what you say about the arrest — the recorded escalation for a dispute is a lawyer;",
    "charges were filed arising from the arrest — the recorded precondition for this whole route is an arrest with no charges filed, and a charged case is a different matter entirely;",
    "you are trying to establish that you are innocent of something you were actually arrested for — the recorded rule is that this route is not a general vehicle for litigating innocence;",
    "the agency HAS made a mistaken-identity finding — then this request is not what you need: if the 90 days have not run, the duty to petition is the agency's, and if they have, the court-petition packet is the instrument;",
    "any immigration question is involved."
  ],

  whatThisIsNot:
    "This is a written request to a law-enforcement agency, authored from one recorded branch of C.R.S. "
    + "Sec. 24-72-702. It is not a Colorado JDF form — the controlling decision records that none was located for "
    + "this track — it is not a court filing, it is not the district-court petition that a different packet "
    + "carries, it is not legal advice, it is not sent for you, and it is not a promise that the agency will "
    + "investigate or find anything. No fee is asked anywhere in it.",

  receiptDoesNotEstablish: [
    "that any Colorado law-enforcement agency has made, or will make, a mistaken-identity finding in any particular case",
    "that no charges were filed arising from any particular arrest",
    "the identity, address or record-request procedure of the agency that arrested any particular participant"
  ],

  buildFindings: [
    {
      finding:
        "MASTER_QUEUE classifies this family participant_agency_application and binds no document source. That is "
        + "the recorded design, not a gap: the controlling decision records that no dedicated statewide JDF form "
        + "was located for this track, and Colorado publishes no application form for an investigation request.",
      consequence:
        "The deliverable is a written request the participant signs and sends to the arresting agency, plus a "
        + "route sheet. Both pages are authored by this build from the committed decision, anchor-verified before "
        + "composing. No form was substituted, none was invented, and no page is styled to look like an official "
        + "Colorado form."
    },
    {
      finding:
        "The route is an agency application and not a court filing, and the same statute's COURT petition is a "
        + "separate route already carried by composed-treatment:...:participant_court_petition_after_90_days.",
      consequence:
        "Nothing here is a petition, a motion, a proposed order or a certificate of service. The packet states on "
        + "both pages that the participant files nothing in court on this route, explains that the duty to "
        + "petition is the agency's for 90 days after a finding, and names the sibling packet rather than "
        + "duplicating its instrument."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against DETERMINATION_FEE_AND_WAIVER_STANDARD A1-A3. The compiled Colorado "
        + "profile carries a fee table, but every line in it is keyed to petition sealing on JDF 417 or JDF 612 "
        + "under a different statutory scheme. Under A3 holding is per FACT and per ROUTE, so that table does not "
        + "establish the cost of a Sec. 24-72-702 agency request.",
      consequence:
        "The packet states that no held source establishes any charge for this request and that it asks the "
        + "participant to pay nothing; it quotes the statute's own no-cost rule and says precisely what that "
        + "sentence covers; it names the records unit of the arresting agency as the office that answers any "
        + "search or copy charge; and it says in terms that Colorado's JDF sealing fee schedule is not borrowed."
    },
    {
      finding:
        "SERVICE. No held record states any service requirement for an agency request under this statute, and an "
        + "agency request has no opposing party.",
      consequence:
        "The packet states there is nobody to serve and why, tells the participant to keep dated proof of what "
        + "was sent, and names the records unit of the arresting agency as the office to ask if it wants a copy "
        + "sent anywhere else."
    },
    {
      finding:
        "The whole route turns on facts of one arrest — which agency, when, under what identifiers, what case or "
        + "incident number — and no committed record holds any of them for any participant.",
      consequence:
        "Each is a labelled required-before-filing blank on the request, declared as typed data on the field-map "
        + "row and disclosed by name in participant-instructions.md, with what to write and where to get it."
    }
  ],

  counselQuestions: [
    "The deliverable is an unstyled signed letter to the arresting agency rather than any official form, because the controlling decision records that no statewide JDF form was located for this track. Confirm that a plain written request is the right participant-facing instrument for a Sec. 24-72-702 investigation request, or supply the form if one exists.",
    "The packet tells the participant that the statute's \"No filing fee or other expungement cost may be charged\" governs the expungement rather than pricing the agency request, and that any agency search or copy charge is the agency's own. Confirm that reading, or say that the no-cost rule reaches the request as well.",
    "The packet tells a participant WITH a finding whose 90 days have run to obtain the sibling court-petition packet. Confirm the handoff boundary between the two families is stated correctly.",
    "The request asks the agency to investigate and to make a finding, and attaches the participant's own identity evidence. Confirm the wording does not overstate what a person may demand of a law-enforcement agency under Sec. 24-72-702."
  ],

  reviewersAttention: [
    "This is an AGENCY-APPLICATION treatment. It carries no petition, no proposed order and no certificate of service by design; a reviewer expecting a court packet is reviewing the wrong shape.",
    "source-receipt.json binds a committed repository record rather than a Master Library binary — custodyClass CUSTOM_PLEADING_FROM_CODIFIED_TEXT and zero bound official documents; confirm that is legible.",
    "The family's own compiled state profile is deliberately NOT used for the fee answer. The reasoning is recorded in build-findings.json against DETERMINATION_FEE_AND_WAIVER_STANDARD amendment A3."
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
    if (componentId === "agency_request") {
      L.push("THIS IS A WRITTEN REQUEST TO A LAW-ENFORCEMENT AGENCY. IT IS NOT A COURT FILING, AND NOTHING ON THIS PAGE IS FILED WITH ANY COURT.", "");
      L.push("TO: THE RECORDS UNIT OF THE LAW-ENFORCEMENT AGENCY NAMED BELOW", "");
      L.push("Name of the agency that made the arrest, from the arrest paperwork:");
      L.push(DOTS(), "");
      L.push("Address the agency receives written record requests at:");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push(`FROM: ${name}`);
      L.push(`Date of birth: ${dob}`);
      L.push(`Mailing address: ${address}`);
      L.push(`Telephone: ${phone}`);
      L.push(`Email: ${email}`, "");
      L.push("RE: REQUEST FOR AN INVESTIGATION AND A MISTAKEN-IDENTITY FINDING UNDER C.R.S. Sec. 24-72-702", "");
      L.push(`1. I, ${name}, am the person named in the arrest record described below. I am writing to ask this agency to investigate that arrest and to find that I was arrested because of mistaken identity.`, "");
      L.push("2. The arrest, as the arrest record states it:", "");
      L.push("Date of the arrest:");
      L.push(DOTS(), "");
      L.push("Case or incident number of the arrest:");
      L.push(DOTS(), "");
      L.push("Identifiers the arrest was recorded under (the name and any other identifiers on the arrest record):");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("What I was accused of:");
      L.push(DOTS(), "");
      L.push("3. Why the arrest was of the wrong person. What I know, and what I am attaching:", "");
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("4. Name and any description of the person I believe I was mistaken for, if I know it:");
      L.push(DOTS(), "");
      L.push("5. So far as I am aware, no charges were filed arising from this arrest. What shows that, and where it is recorded:");
      L.push(DOTS(), "");
      L.push("6. WHAT I AM ASKING THIS AGENCY TO DO. Investigate this arrest, and if the investigation finds that I was arrested because of mistaken identity and that no charges were filed, make that finding and petition the district court of the judicial district where the arrest occurred to expunge the records of the arrest, as C.R.S. Sec. 24-72-702 requires the arresting agency to do within 90 days of such a finding. Please tell me in writing what the agency decides, and on what date.", "");
      L.push("7. I am not asking any court for anything by this request, and I am not asking this agency to decide whether I am innocent of anything I was actually arrested for. I am asking it to establish whether the person arrested was me.", "");
      L.push("DATE " + DOTS(28) + "   SIGNATURE OF REQUESTER " + DOTS(36), "");
      L.push("(The requester signs and dates this request personally. Nothing on this page is signed or dated for the requester.)", "");
      L.push(`PRINTED NAME: ${name}`);
      L.push(`MAILING ADDRESS: ${address}`);
      L.push(`TELEPHONE: ${phone}`);
      L.push(`EMAIL: ${email}`);
      L.push("", "ATTACHED: the identity evidence and any no-charge record listed at paragraphs 3 and 5.");
    } else {
      L.push(`Prepared for: ${name}`, "");
      L.push("WHAT THIS IS, IN ONE LINE", "");
      L.push("A written request to the law-enforcement agency that arrested you, asking it to investigate and to find that the arrest was a mistaken-identity arrest. It is not a court filing.", "");
      L.push("WHO DECIDES, AND WHAT YOU DO NOT FILE", "");
      L.push("The recorded Colorado rule: C.R.S. Sec. 24-72-702 creates a mandatory agency-first procedure. No later than 90 days after a law-enforcement investigation finds that a person was arrested because of mistaken identity and no charges were filed, THE ARRESTING AGENCY must petition the district court in the judicial district where the arrest occurred.");
      L.push("So on this route you file NOTHING with any court. No petition, no motion, no proposed order, no certificate of service. The agency investigates, the agency finds, and the agency petitions.");
      L.push("The recorded precondition is exact: this route depends on an ACTUAL AGENCY FINDING of mistaken identity, and it is not a general vehicle for litigating innocence where the agency has never made that determination. Where there is no finding, the recorded first output is a written request for investigation and finding - which is the other page of this packet.", "");
      L.push("WHERE IT GOES", "");
      L.push("To the records unit of the agency that arrested you, or whatever office that agency names for written record enquiries. Your arrest paperwork names the agency; that agency's records unit is the office to ask for the address, and it is the office this request goes to.");
      L.push("Nothing held in the repository names the agency that arrested you, because that is a fact of your own arrest.", "");
      L.push("WHAT IT COSTS", "");
      L.push("Nothing is asked of you anywhere in this packet, and no held source states any charge for making this request. A written request to an agency to look at its own record is not a court filing and carries no filing fee.");
      L.push("The recorded no-cost rule in the statute - \"No filing fee or other expungement cost may be charged\" - is about the expungement this route eventually leads to, not about this request.");
      L.push("If the agency says it charges for a records search or for copies, that is the agency's own schedule. Ask its records unit what the charge is for before you pay it.");
      L.push("Colorado's published petition-sealing fees on forms JDF 417 and JDF 612 belong to a different statutory scheme and are not the price of anything here.", "");
      L.push("WHO ELSE HAS TO BE TOLD", "");
      L.push("Nobody. There is no opposing party, no district attorney to notify and no certificate of service, and no held record states any service requirement for this request. Send it to one place and keep dated proof that you did.", "");
      L.push("WHAT HAPPENS NEXT, EITHER WAY", "");
      L.push("IF THE AGENCY MAKES A FINDING: write down the date of the finding. The recorded rule gives the agency 90 days from that date to petition the district court itself. If it does, the matter is in court and it got there without you filing anything.");
      L.push("IF THE 90 DAYS PASS AND THE AGENCY HAS NOT PETITIONED: the statute lets you file the petition yourself, in the same district court, and the recorded rule is that no filing fee or other expungement cost may be charged. That petition is a different instrument in a different packet; ask for the Colorado mistaken-identity court-petition packet.");
      L.push("IF THE AGENCY REFUSES, FINDS AGAINST YOU, OR DISPUTES WHAT YOU SENT: stop. The recorded escalation for a no-finding or a dispute is a lawyer, not a self-help filing.", "");
      L.push("WHEN TO STOP AND GET HELP", "");
      L.push("- the agency refuses to investigate or finds against you;");
      L.push("- anyone disputes what you say about the arrest;");
      L.push("- charges were filed arising from the arrest;");
      L.push("- you are trying to establish innocence of something you were actually arrested for;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("A written request to an agency, authored from one recorded branch of C.R.S. Sec. 24-72-702. It is not a Colorado JDF form - the controlling decision records that none was located for this track - not a court filing, not the district-court petition another packet carries, not legal advice, not sent for you, and not a promise that the agency will investigate or find anything.");
    }
    L.push("", `Route: ${this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "agency_request") {
      writes.push(
        h.write("requester_name", "Requester named at the head of this request", "participant.full_legal_name"),
        h.write("date_of_birth", "Date of birth of the requester, in the FROM block of this request", "participant.date_of_birth"),
        h.write("mailing_address", "Mailing address of the requester, in the FROM block of this request", "participant.street_address"),
        h.write("telephone", "Telephone number of the requester, in the FROM block of this request", "participant.phone"),
        h.write("email", "Email address of the requester, in the FROM block of this request", "participant.email")
      );
      refusals.push(
        h.rbf("agency_name", "Name of the agency that made the arrest",
          "the name of the law-enforcement agency that arrested you, copied from your arrest paperwork",
          "which agency made an arrest is a fact of the participant's own record and no committed record holds it"),
        h.rbf("agency_address", "Address the agency receives written record requests at",
          "the postal address that agency's records unit receives written record requests at - ask its records unit if the arrest paperwork does not print it",
          "no committed record holds the address of any particular Colorado law-enforcement agency"),
        h.rbf("arrest_date", "Date of the arrest",
          "the date of the arrest, copied exactly from the arrest paperwork",
          "no arrest fact is held for a record the platform has not seen"),
        h.rbf("case_incident_number", "Case or incident number of the arrest",
          "the case or incident number the agency recorded the arrest under, from the arrest paperwork",
          "no record identifier is held for a record the platform has not seen"),
        h.rbf("identifiers_used", "Identifiers the arrest was recorded under",
          "the name and any other identifiers printed on the arrest record - these are what the agency will search on",
          "what identifiers an arrest was recorded under lives on a record the platform has not seen"),
        h.rbf("what_i_was_accused_of", "What I was accused of",
          "what the arrest paperwork says you were arrested for, copied from it",
          "no charge fact is held for a record the platform has not seen"),
        h.rbf("why_wrong_person", "Why the arrest was of the wrong person, and what I am attaching",
          "your own account of why the person arrested was not you, and a list of what you are attaching to show it - this is the substance the agency decides on",
          "this is the participant's own account and the platform neither holds it nor writes it"),
        h.rbf("person_mistaken_for", "Name and any description of the person I believe I was mistaken for",
          "the name and any description of the person you believe you were mistaken for, if you know it; write that you do not know if you do not",
          "the identity of another person is not a fact the platform holds"),
        h.rbf("no_charges_basis", "What shows no charges were filed, and where it is recorded",
          "what shows that no charges were filed arising from this arrest, and where that is recorded - the district attorney's office for that judicial district, or the court, if one was involved",
          "whether charges were filed on a particular arrest lives on records the platform has not seen"),
        h.protectedBlank("requester_signature", "Signature of the requester on this request",
          "the requester signs the request personally"),
        h.protectedBlank("signature_date", "Date beside the requester's signature on this request",
          "a date written before the request is signed would be false")
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
import { finalizeFlatOverlay, finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { resolveFact } from "./rcap-official-forms/rcap-field-semantics.mjs";
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

const STRATEGY = SPEC.implementationStrategy ?? "participant_agency_application";
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

/*
 * The second measured shape: a RULED BLANK.
 *
 * Not every official form draws a cell grid. Alaska's DPS CRI-103 draws a
 * printed caption followed by a single horizontal stroke, and there is no
 * vertical divider on either side of it — so the four-stroke cell test above
 * finds nothing and would report the whole form as geometry drift. The stroke
 * IS the measurement here: its own x and endX give the horizontal extent the
 * form intends for the value, and the value sits on it, which is why the
 * finalizer's protected-rule test is expressed in the same terms.
 *
 * The ceiling is still measured rather than assumed: the box stops a fixed
 * clearance below the lowest printed baseline that sits above this stroke
 * inside its own span, so a value can never be drawn over the caption of the
 * line above. Where nothing is printed above inside the span, the box takes
 * the maximum height and the fitter decides the rest.
 */
const BASELINE_ABOVE_RULE = 2;

function measureRuledBlank(page, cell) {
  const candidates = page.horizontal
    .filter((r) => Math.abs(r.y - cell.ruleY) <= RULE_TOLERANCE
      && Math.abs(r.x - cell.ruleFromX) <= RULE_TOLERANCE
      && Math.abs(r.endX - cell.ruleToX) <= RULE_TOLERANCE)
    .sort((a, b) => Math.abs(a.y - cell.ruleY) - Math.abs(b.y - cell.ruleY));
  const rule = candidates[0];
  if (!rule) return null;
  const boxBottom = rule.y + BASELINE_ABOVE_RULE;
  const above = page.items
    .filter((t) => String(t.text).trim() && t.x >= rule.x - 2 && t.x <= rule.endX + 2 && t.y > boxBottom + 2)
    .map((t) => t.y);
  const ceiling = above.length > 0 ? Math.min(...above) - CAPTION_CLEARANCE : boxBottom + MAX_WRITE_BOX_HEIGHT;
  const height = Number(Math.min(MAX_WRITE_BOX_HEIGHT, ceiling - boxBottom).toFixed(2));
  const writeBox = {
    x: Number((rule.x + CELL_INSET).toFixed(2)),
    y: Number(boxBottom.toFixed(2)),
    width: Number((rule.endX - rule.x - CELL_INSET * 2).toFixed(2)),
    height: Math.max(0, height)
  };
  return {
    writeBox,
    tooShallowToWriteIn: height < MIN_WRITE_BOX_HEIGHT,
    rectBasis:
      "measured_ruled_blank: one horizontal stroke read from the page content stream — the rule the value is "
      + "written on — matched on its own y, start x and end x against the pinned binary, with the box ceiling "
      + "taken from the lowest printed baseline above it inside its own span",
    measuredCell: {
      ruleY: rule.y, ruleFromX: rule.x, ruleToX: rule.endX,
      ruleThickness: rule.height ?? null,
      lowestPrintedBaselineAboveInsideSpan: above.length > 0 ? Math.min(...above) : null
    }
  };
}

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
    if (Object.hasOwn(cell, "ruleY")) {
      const ruled = measureRuledBlank(here, cell);
      if (!ruled) {
        drift.push({
          cell: cell.key, page: cell.page, shape: "ruled_blank",
          expected: { ruleY: cell.ruleY, ruleFromX: cell.ruleFromX, ruleToX: cell.ruleToX },
          nearest: here.horizontal
            .filter((r) => Math.abs(r.y - cell.ruleY) <= 6)
            .map((r) => ({ y: r.y, x: r.x, endX: r.endX })).slice(0, 4)
        });
        continue;
      }
      measured.push({ ...cell, ...ruled, rect: ruled.writeBox });
      continue;
    }
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
    /*
     * Where in a measured cell the value sits.
     *
     * By default it sits on the cell's bottom rule, which is where a person
     * writing on paper puts it: the caption is printed at the top of the cell
     * and the line beneath is the line you write on.
     *
     * `writeUnderCaption` is for a TALL cell -- Alaska's DPS mailing-address
     * box is 80 points deep because it expects two or three lines -- where the
     * default would leave a single-line value floating sixty points below its
     * own caption. It places the box directly under the lowest printed line
     * inside the cell instead. BOTH rules are still measured, and the box is
     * still required to sit above the cell's own bottom rule; the flag moves
     * the value inside a measured cell and can never move it out of one.
     */
    const floor = bottom.y + WRITE_BOX_LIFT;
    const ceiling = lowestPrintedLine === null ? top.y - CAPTION_CLEARANCE : lowestPrintedLine - CAPTION_CLEARANCE;
    const boxBottom = cell.writeUnderCaption === true
      ? Math.max(floor, ceiling - MAX_WRITE_BOX_HEIGHT)
      : floor;
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
      placedUnderCaption: cell.writeUnderCaption === true,
      sitsAboveTheCellsOwnBottomRule: boxBottom >= bottom.y,
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

/* ---- an AcroForm document's own census, read from the document ---------------- *
 * Every write box is the widget's own /Rect, read from the binary. No box is
 * derived from a caption position; the caption is captured separately and
 * decides only what a blank MEANS, never where it is.
 */
const FIELD_TYPE = (f) => {
  const n = f.constructor?.name ?? "";
  if (n === "PDFTextField") return "text";
  if (n === "PDFCheckBox") return "checkbox";
  if (n === "PDFRadioGroup") return "radio";
  if (n === "PDFDropdown") return "dropdown";
  if (n === "PDFOptionList") return "optionlist";
  return "unknown";
};

async function censusAcroForm(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageIndexOfRef = new Map(pages.map((p, i) => [p.ref, i + 1]));
  const form = doc.getForm();
  const raw = form.getFields().map((f) => {
    const widgets = f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOfRef.get(w.P()) ?? null,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    });
    return {
      name: f.getName(),
      type: FIELD_TYPE(f),
      multiline: (() => { try { return f.isMultiline?.() === true; } catch { return false; } })(),
      maxLength: (() => { try { return f.getMaxLength?.() ?? null; } catch { return null; } })(),
      widgets
    };
  });
  // Captions, page by page, so a widget's printed label comes from the page it
  // actually sits on.
  const byPage = new Map();
  for (const f of raw) for (const w of f.widgets) {
    if (!w.page) continue;
    if (!byPage.has(w.page)) byPage.set(w.page, []);
    byPage.get(w.page).push({ name: f.name, rect: w.rect });
  }
  const labelOf = new Map();
  for (const [pageNo, widgets] of byPage) {
    const context = captureWidgetContext(pages[pageNo - 1], widgets, { isFirstPage: pageNo === 1 });
    for (const c of context) if (!labelOf.has(c.name)) labelOf.set(c.name, c);
  }
  const fields = raw.map((f) => {
    const c = labelOf.get(f.name) ?? {};
    return {
      ...f,
      effectiveLabel: c.effectiveLabel ?? null,
      labelBasis: c.labelBasis ?? null,
      regionHeading: c.regionHeading ?? null,
      regionIsDocumentTitle: c.regionIsDocumentTitle ?? false
    };
  });
  const documentTextLines = pages.flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text));
  return { fields, documentTextLines, pageCount: pages.length };
}

/* ---- what the official page actually carries, read from its own bytes -------- *
 * The finalizer's report says what this build BELIEVES it wrote. This says what
 * the paper shows, and it is the only channel that can catch the two failures
 * the report structurally cannot: ink that landed outside every box this family
 * measured, and ink sitting on a blank the map refused.
 *
 * The source's own printed text is subtracted first, by position and content,
 * because an official form prints captions inside and beside the very boxes it
 * strokes — counting those as our ink would report every form as defective.
 * What remains is exactly what this build added.
 */
const INK_TOLERANCE = 2.5;

async function itemsOfDocument(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().map((page) => extractTextItems(page).map((t) => ({
    x: t.x, y: t.y, text: String(t.text ?? ""), width: t.width ?? 0
  })));
}

const inkKey = (t) => `${Math.round(t.x)}|${Math.round(t.y)}|${t.text}`;
const insideBox = (t, box) =>
  t.x >= box.x - INK_TOLERANCE && t.x <= box.x + box.width + INK_TOLERANCE
  && t.y >= box.y - INK_TOLERANCE && t.y <= box.y + box.height + INK_TOLERANCE;

async function auditOfficialInk(sourceBytes, outputBytes, boxes) {
  const source = await itemsOfDocument(sourceBytes);
  const output = await itemsOfDocument(outputBytes);
  const added = [];
  for (const [i, page] of output.entries()) {
    const before = new Map();
    for (const t of source[i] ?? []) before.set(inkKey(t), (before.get(inkKey(t)) ?? 0) + 1);
    for (const t of page) {
      const key = inkKey(t);
      const seen = before.get(key) ?? 0;
      if (seen > 0) { before.set(key, seen - 1); continue; }
      added.push({ page: i + 1, ...t });
    }
  }
  let glyphsOutsideMeasuredWriteBoxes = 0;
  const refusedFieldsWithInk = [];
  const written = boxes.filter((b) => b.written);
  const refused = boxes.filter((b) => !b.written);
  for (const t of added) {
    const glyphs = t.text.replace(/\s+/g, "").length;
    if (glyphs === 0) continue;
    /*
     * Ink is attributed to a WRITTEN box first, and ink a written box
     * accounts for is never also charged to a neighbour.
     *
     * AOC-CR-287 is why. Its petitioner block stacks four widgets 13pt tall
     * at 12pt intervals, so PetitionerAddr1 (y 667-680) and PetitionerAddr2
     * (y 655-668) OVERLAP by a point, and the street address drawn correctly
     * on line one has its origin inside line two's rectangle as well. Charged
     * to both, that reported a refused field carrying ink on a page where
     * nothing had gone wrong -- a false protected-write on a correct build,
     * which is the worst kind of finding because it teaches a reader to
     * distrust the counter.
     *
     * The real defect this test exists for survives the change intact: ink on
     * a refused blank that NO written box explains is still ink nobody
     * accounted for, and is still reported.
     */
    const explainedBy = written.filter((b) => b.page === t.page && insideBox(t, b.rect));
    if (explainedBy.length > 0) continue;
    glyphsOutsideMeasuredWriteBoxes += glyphs;
    for (const b of refused) {
      if (b.page === t.page && b.rect && insideBox(t, b.rect)) {
        refusedFieldsWithInk.push({ fieldId: b.key, drawnText: t.text, page: t.page });
      }
    }
  }
  return {
    addedTextItems: added.length,
    addedGlyphs: added.reduce((n, t) => n + t.text.replace(/\s+/g, "").length, 0),
    glyphsOutsideMeasuredWriteBoxes,
    refusedFieldsWithInk,
    method:
      "every text item of the finished document compared against the pinned source document's own items by "
      + "position and content; what remains is what this build added, and each added item is tested against "
      + "every measured box"
  };
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
  /* The shared separator-aware splitter, in place of this file's own
   * character-accumulating splitToken. A route key too long for the 468pt
   * column now breaks only after one of its own separators (colon,
   * underscore, slash, dot, hyphen) and never mid-word. hardSplits counts
   * any run with no separator to break on; the assertion below makes that a
   * build failure rather than a shipped split. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
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
  assert.equal(splitToken.hardSplits, 0,
    `composed document "${title}" needed ${splitToken.hardSplits} hard split(s): a token had no separator to break on inside the column. Refusing to ship a mid-word split.`);
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
    /*
     * A control the reader marks, which THIS ROUTE does not determine.
     *
     * Only ever for an election that is genuinely the participant's: a route
     * that determines its own election must state it, and a packet built for
     * one statutory route may never hand that choice back. Every use of this
     * helper carries the reason the route leaves the choice open.
     */
    election: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      isSelectionControl: true, kind: "selection_control",
      reason: "a sworn assertion or legal election the route does not determine",
      category: "participant_sworn_narrative_or_legal_election",
      completenessClass: "participant_sworn_narrative_or_legal_election",
      class: "participant_sworn_narrative_or_legal_election",
      requiredBeforeFiling: false, routeDetermined: false, document: componentId, why
    }),
    /*
     * An ATTORNEY block on a form a self-represented participant files.
     * The platform holds no representation fact, and writing participant
     * data into a block the court reads as counsel's would tell the court
     * something untrue about who is appearing.
     */
    attorneyBlank: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `attorney-only, and no representation fact is held for this participant: ${why}`,
      category: null, completenessClass: null, class: null,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /*
     * A blank the FORM ITSELF marks optional or conditional: a second address
     * line, a second offence rule, a number the form prints "(if known)".
     * Never for a blank the filing needs — that is a required fact wearing a
     * softer word, and the reason it may stay empty is the form's own, stated
     * here so a reader can check it against the printed page.
     */
    optional: (id, label, why, page = 1) => ({
      ...base(id, label, page),
      reason: `optional participant-authored content, and the platform does not invent it: ${why}`,
      category: null, completenessClass: null, class: null,
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
      const drawn = drawnValues.get(`${componentId} ${w.field}`);
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
  // An AcroForm document is censused once, from the document itself, and the
  // census is reused for both fixtures: the geometry is a property of the form,
  // not of the facts written onto it.
  const censusByComponent = new Map();
  for (const b of bound) {
    if (b.doc.acroform === true) censusByComponent.set(b.componentId, await censusAcroForm(b.bytes));
  }

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

  /*
   * Every censused field of every AcroForm document appears in the field map
   * exactly once, as a write or as a classified blank.
   *
   * The completeness audit reads the MAP, not the form: a field left out of
   * the map is a field nothing asks about, and a hundred and nineteen-field
   * petition could pass on nine declared rows. So the map is checked against
   * the document's own census before anything is rendered, and a family that
   * does not cover its own form stops rather than shipping a partial audit.
   */
  const coverageFailures = [];
  for (const b of bound) {
    if (b.doc.acroform !== true) continue;
    const census = censusByComponent.get(b.componentId);
    const { writes, refusals } = SPEC.mapFor(b.componentId, mapHelpers(b.componentId));
    const prefix = `${b.componentId}.`;
    const declared = [...writes, ...refusals].map((r) => String(r.field).slice(prefix.length));
    const seen = new Set();
    const twice = [];
    for (const d of declared) { if (seen.has(d)) twice.push(d); seen.add(d); }
    const censused = new Set(census.fields.map((f) => f.name));
    const missing = [...censused].filter((n) => !seen.has(n));
    const unknown = [...seen].filter((n) => !censused.has(n));
    if (missing.length || unknown.length || twice.length) {
      coverageFailures.push({
        component: b.componentId, documentId: b.doc.documentId,
        censusedFields: censused.size, declaredRows: declared.length,
        censusedButNotDeclared: missing, declaredButNotOnTheForm: unknown, declaredTwice: twice
      });
    }
  }
  if (coverageFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "STOPPED", stopClass: "FIELD_MAP_DOES_NOT_COVER_THE_FORM",
      why:
        "the completeness audit reads the field map rather than the form, so a censused field missing from "
        + "the map is a blank nothing asks about; this family does not cover its own document and nothing was "
        + "rendered",
      coverageFailures, overlayDirectoryTouched: false
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
  const inkAudits = [];

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
        let bytes;
        let report;
        let boxes;
        if (b.doc.acroform === true) {
          // An AcroForm document. Every decision about what MAY be written is
          // the shared semantics'; this supplies only the family's own explicit
          // mappings and its role classification, and then proves the result
          // from the artifact bytes rather than from the finalizer's report.
          const census = censusByComponent.get(componentId);
          const result = await finalizeOfficialForm({
            sourceBytes: b.bytes,
            expectedSha256: b.doc.sha256,
            census: census.fields,
            facts,
            explicitMappings: b.doc.explicitMappings ?? {},
            unwritableFields: (b.doc.unwritable ?? []).map((u) => ({ field: u.field, class: u.class })),
            captionOnly: b.doc.captionOnly === true,
            documentTextLines: census.documentTextLines,
            evaluateDeclaredMinimumSize: true,
            alignWidgetFontSizeToFit: true,
            title: `${SPEC.jurisdiction} ${b.doc.documentId}`
          });
          bytes = result.bytes;
          report = result.report;
          const writtenNames = new Set(report.written.map((w) => w.field));
          boxes = census.fields.flatMap((f) => (f.widgets ?? []).map((w) => ({
            key: f.name, page: w.page, rect: w.rect, written: writtenNames.has(f.name)
          })));
          for (const w of report.written) {
            const value = resolveFact(facts, w.factId);
            if (value !== undefined && value !== null && String(value) !== "") {
              drawnValues.set(`${componentId} ${componentId}.${w.field}`, String(value));
            }
          }
        } else {
          // A flat document. Every value sits on a stroke the form itself drew.
          const cells = cellsByComponent.get(componentId) ?? [];
          const writable = cells.filter((c) => c.fact && !c.tooShallowToWriteIn);
          const result = await finalizeFlatOverlay({
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
          bytes = result.bytes;
          report = result.report;
          const writtenAnchors = new Set(report.written.map((w) => w.anchor));
          for (const w of report.written) {
            const cell = writable.find((c) => (c.bindingLabel ?? c.label) === w.anchor);
            if (cell) drawnValues.set(`${componentId} ${componentId}.${cell.key}`, String(facts[cell.fact] ?? ""));
          }
          boxes = cells.map((c) => ({
            key: c.key, page: c.page, rect: c.writeBox,
            written: writtenAnchors.has(c.bindingLabel ?? c.label)
          }));
        }
        const ink = await auditOfficialInk(b.bytes, bytes, boxes);
        inkAudits.push({ fixture: fixtureName, component: componentId, documentId: b.doc.documentId, ...ink });
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
    // The ink audit is per OFFICIAL document and is the only channel that can
    // see ink outside a measured box, or ink sitting on a blank the map
    // refused. A composed page raises no such question: this build authored
    // every mark on it.
    const inkHere = inkAudits.filter((a) => a.fixture === fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      proofMethod:
        "every written fact value read back from the extracted text of its component's own pages in the saved "
        + "packet bytes, and every official document's finished text compared item by item against the pinned "
        + "source document's own text so that only what this build added is measured",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      flattenedWidgetNote:
        "zero by construction rather than by failure: an AcroForm document is flattened into page content "
        + "before it is copied into the packet, and a flat overlay draws into page content to begin with, so "
        + "every mark this family makes is counted as a glyph in the column beside this one",
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
        inkHere.reduce((n, a) => n + a.glyphsOutsideMeasuredWriteBoxes, 0),
      refusedFieldsWithInk: inkHere.flatMap((a) => a.refusedFieldsWithInk.map((r) => ({ ...r, documentId: a.documentId }))),
      officialInkAudits: inkHere,
      actualWrites: proof.actualWrites
    });

    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: SPEC.components
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: SPEC.assembledPacketRole ?? "assembled_agency_application_packet",
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
    jurisdiction: SPEC.jurisdiction, implementationStrategy: STRATEGY,
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
    implementationStrategy: STRATEGY,
    agencyTreatmentNote: SPEC.agencyTreatmentNote ?? null,
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
    implementationStrategy: STRATEGY,
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
    implementationStrategy: STRATEGY,
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
    implementationStrategy: STRATEGY,
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
