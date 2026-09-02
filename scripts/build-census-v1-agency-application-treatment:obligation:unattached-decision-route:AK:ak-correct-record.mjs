#!/usr/bin/env node
/**
 * FABLE-PD agency-application treatment — Alaska AS 12.62.170, correcting
 * inaccurate or incomplete criminal justice information in APSIN.
 *
 *   node "scripts/build-census-v1-agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record.mjs" [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:unattached-decision-route:AK:ak-correct-record
 *
 * WHAT KIND OF FAMILY THIS IS, AND WHY
 *
 * MASTER_QUEUE gives this family implementationStrategy
 * `participant_agency_application`, and the controlling 2026-08-28 decision
 * says so in terms: AS 12.62.170 "creates an administrative correction process
 * for inaccurate or incomplete criminal justice information", and "The
 * participant first challenges the record through the Department of Public
 * Safety or the agency responsible for the disputed data, using the published
 * **Request to Correct Criminal Justice Information** form". Its recorded
 * product disposition is "INITIAL OUTPUT: OFFICIAL AGENCY CORRECTION FORM +
 * EVIDENCE CHECKLIST".
 *
 * So unlike the two other agency treatments in this lane, Alaska DOES publish
 * a form — DPS Form CRI-103 — and the family binds it by exact SHA-256. It is
 * not a court filing and nothing here is styled as one: no caption, no case
 * number, no proposed order, no certificate of service. The participant
 * applies on the agency's own published form, and the packet adds the evidence
 * checklist the decision names.
 *
 * WHAT IS WRITTEN ON THE FORM, AND WHAT IS NOT
 *
 * CRI-103 is a flat page: no AcroForm, no widget rectangles. Every value this
 * build draws sits on a ruled blank the form itself strokes, measured from the
 * page content stream by its own y, start x and end x. Six identity and
 * contact facts are written. Everything else on the page is refused, and each
 * refusal is a real one rather than a policy: the driver's licence number and
 * the SSN are refused by the shared semantics as government identifiers, the
 * five reason boxes are the participant's own election about their own record,
 * the whole right-hand column applies only where the record was used to deny a
 * right or privilege, and the signature, its date and the DPS decision block
 * belong to the requester and to the Bureau.
 *
 * THE BOUNDARY THE DECISION DRAWS, AND WHY IT MATTERS HERE
 *
 * "A disagreement about whether an accurate event should be sealed or expunged
 * is not a correction claim." A participant who wants a true record hidden is
 * at the wrong route, and the form's own page carries the same distinction in
 * its five reasons. The packet says so plainly rather than letting a
 * participant discover it from a refusal.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-agency-application-treatment:obligation:unattached-decision-route:AK:ak-correct-record.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ak/agency-application-treatment:obligation:unattached-decision-route:ak:ak-correct-record--official-pdf-fill",
  jurisdiction: "AK",
  custodyClass: "SOURCE_ALREADY_HELD",
  legalName: "Request to Correct Criminal Justice Information in the Alaska Public Safety Information Network (AS 12.62.170)",
  routeName: "correcting an inaccurate or incomplete entry in your Alaska criminal justice information under AS 12.62.170",
  statutes: ["AS 12.62.170", "13 AAC 68.200"],
  routes: [
    { routeKey: "obligation:unattached-decision-route:AK:ak-correct-record" }
  ],

  records: [
    {
      recordId: "legal-decision:2026-08-28:research-track:ak-correct-record",
      path: "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      role:
        "the controlling decision: that AS 12.62.170 is an administrative correction process, that the challenge "
        + "goes first to DPS or the agency responsible for the disputed data on the published form, what the "
        + "challenge must identify, the boundary between a correction claim and a sealing request, and the "
        + "recorded escalation on a final adverse decision",
      mustContain: [
        "AS 12.62.170 creates an administrative correction process for inaccurate or incomplete criminal justice information.",
        "using the published **Request to Correct Criminal Justice Information** form and supporting documentation",
        "the precise entry;",
        "why it is inaccurate or incomplete;",
        "the correct disposition or data;",
        "the originating agency and case;",
        "certified disposition, identity documents, and fingerprints where required; and",
        "the correction requested.",
        "A disagreement about whether an accurate event should be sealed or expunged is not a correction claim.",
        "If the agency issues a final adverse decision, judicial review proceeds through an administrative appeal to the Alaska Superior Court under the applicable appellate rules. That appeal is not an ordinary self-help record-clearing packet.",
        "INITIAL OUTPUT: OFFICIAL AGENCY CORRECTION FORM + EVIDENCE CHECKLIST",
        "INITIAL DESTINATION: DPS / RESPONSIBLE ORIGINATING AGENCY",
        "ADVERSE FINAL DECISION: SUPERIOR-COURT ADMINISTRATIVE APPEAL",
        "APPEAL: ATTORNEY HANDOFF"
      ]
    },
    {
      recordId: "compiled-profile:AK-alaska",
      path: "src/lib/rcap-engine/compiled/profiles/AK-alaska.json",
      role:
        "the compiled Alaska profile, a held source for this jurisdiction under "
        + "DETERMINATION_FEE_AND_WAIVER_STANDARD amendment A2. Its fee table is read narrowly under amendment "
        + "A3: it prices a TF-810 Courtview exclusion, an SIS set-aside motion, an AS 12.62.180(b) SEALING "
        + "request and a DPS criminal history record, and none of those is an AS 12.62.170 correction. What it "
        + "does answer for this route is the cost of the DPS criminal history record the participant needs in "
        + "order to identify the entry.",
      mustContain: [
        "Form TF-810 (Courtview exclusion) Typically $0 Administrative request to the court",
        "AS 12.62.180(b) sealing request Agency-dependent Written request to the record-holding agency",
        "DPS criminal history record DPS fee To confirm what records exist"
      ]
    }
  ],

  officialComponents: {
    dps_correction_request: {
      sourceId: "official-form:Request to Correct Criminal Justice Information",
      documentId: "DPS-CRI-103",
      formNumber: "DPS-CRI-103",
      officialTitle: "Request to Correct Criminal Justice Information in the Alaska Public Safety Information Network (APSIN)",
      revision: "REV-2022-07-25",
      instrumentKind: "participant_agency_application_form",
      sha256: "b1de812543a259e425318011dbc5e2bc8b4badf0692da9d12188087ec0e4a259"
    }
  },

  /* Every write box on CRI-103, measured from the form's own strokes. Six carry
   * a fact; the rest are measured and left alone so the field map can state
   * where each refused blank actually is on the page. */
  officialCells: {
    dps_correction_request: [
      { key: "requester_name", page: 1, ruleY: 604.32, ruleFromX: 169.68, ruleToX: 335.52, label: "Requester Name (if not subject)", fact: null },
      { key: "subject_name", page: 1, ruleY: 587.04, ruleFromX: 111.24, ruleToX: 335.52, label: "Subject Name", fact: "participant.full_legal_name" },
      { key: "maiden_alias_name", page: 1, ruleY: 569.76, ruleFromX: 117.6, ruleToX: 335.52, label: "Maiden/Alias name", fact: null },
      { key: "mailing_address", page: 1, ruleY: 552.48, ruleFromX: 111.24, ruleToX: 335.52, label: "Mailing Address", fact: "participant.street_address" },
      { key: "city_state_zip", page: 1, ruleY: 535.2, ruleFromX: 111.24, ruleToX: 335.52, label: "City/State/Zip", fact: "participant.city_state_zip" },
      { key: "drivers_license", page: 1, ruleY: 517.92, ruleFromX: 169.68, ruleToX: 335.52, label: "Drivers License State / #", fact: null },
      { key: "date_of_birth", page: 1, ruleY: 500.64, ruleFromX: 95.52, ruleToX: 193.44, label: "Date of Birth", fact: "participant.date_of_birth" },
      { key: "ssn", page: 1, ruleY: 500.64, ruleFromX: 239.04, ruleToX: 335.52, label: "SSN", fact: null },
      { key: "telephone", page: 1, ruleY: 483.36, ruleFromX: 95.52, ruleToX: 193.44, label: "Telephone #", fact: "participant.phone" },
      { key: "fax", page: 1, ruleY: 483.36, ruleFromX: 239.04, ruleToX: 335.52, label: "Fax #", fact: null },
      { key: "email", page: 1, ruleY: 466.08, ruleFromX: 67.08, ruleToX: 335.52, label: "Email", fact: "participant.email" },
      { key: "other_contact", page: 1, ruleY: 448.8, ruleFromX: 169.68, ruleToX: 317.28, label: "Other (cell or message #)", fact: null }
    ]
  },

  components: ["agency_route_sheet", "dps_correction_request", "evidence_checklist"],
  componentTitles: {
    agency_route_sheet: "Where This Goes, What It Costs, and What You Do Not File",
    dps_correction_request: "DPS Form CRI-103 — Request to Correct Criminal Justice Information",
    evidence_checklist: "Evidence Checklist — What the Challenge Must Identify and What to Attach"
  },
  componentConditions: {},
  componentDescriptions: {
    agency_route_sheet:
      "the agency this goes to with its own printed address, telephone, fax and email; what the correction "
      + "process is and is not; what it costs so far as the repository establishes; and what you do NOT file",
    dps_correction_request:
      "the State of Alaska Department of Public Safety's own published form CRI-103, filled with what the "
      + "platform holds about you and left alone everywhere else",
    evidence_checklist:
      "the six things the recorded decision says a challenge must identify, each with space to write it and a "
      + "note on what to attach — the evidence checklist the recorded product disposition names"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street",
      "participant.city_state_zip": "Anchorage, AK 99501",
      "participant.phone": "907-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Kuskokwim Crossing Road, Apartment 14B",
      "participant.city_state_zip": "Ketchikan Gateway Borough, Alaska 99901-2214",
      "participant.phone": "(907) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote:
    "the controlling 2026-08-28 decision for ak-correct-record and the compiled Alaska profile "
    + "(src/lib/rcap-engine/compiled/profiles/AK-alaska.json), both bound by SHA-256 and anchor-verified at "
    + "build time",

  formIdentityNote:
    "Alaska publishes the form this route uses and the controlling decision names it in terms: the Request to "
    + "Correct Criminal Justice Information, DPS Form CRI-103 (Rev. 07/25/22). It is bound by exact SHA-256 and "
    + "delivered as the agency issues it, with values drawn only onto blanks the form itself strokes. Nothing "
    + "was substituted and nothing was invented; the two composed pages beside it are plainly a route sheet and "
    + "a checklist and carry no form number of their own.",

  agencyTreatmentNote:
    "This is an AGENCY APPLICATION, not a court filing. The participant submits DPS Form CRI-103 to the "
    + "Department of Public Safety, or to the agency responsible for the disputed data, and no court is involved "
    + "at this stage. The recorded escalation on a final adverse decision is an administrative appeal to the "
    + "Alaska Superior Court, which the decision says is expressly NOT an ordinary self-help record-clearing "
    + "packet, and which nothing here prepares.",

  routeSelectionNote:
    "One route, one instrument, and the route does not determine the form's own election. CRI-103 offers five "
    + "reasons a record may be wrong — mistaken identity or false accusation, personal descriptors in error, "
    + "charge information in error, missing or wrong disposition information, and set-aside information missing "
    + "— and which of them is true is a fact about the participant's own record rather than something this "
    + "route decides. They are therefore recorded as genuine participant elections, not as route-determined "
    + "selections left unmade. What the route DOES determine is the instrument, and no page asks the "
    + "participant to choose it.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "DPS Form CRI-103, Request to Correct Criminal Justice Information",
      determinedBy:
        "the controlling decision: the participant challenges the record \"using the published **Request to "
        + "Correct Criminal Justice Information** form\", and the recorded initial output is \"OFFICIAL AGENCY "
        + "CORRECTION FORM + EVIDENCE CHECKLIST\""
    },
    {
      selection: "destination",
      value: "Department of Public Safety, Criminal Records and Identification Bureau, or the responsible originating agency",
      determinedBy:
        "the recorded initial destination \"DPS / RESPONSIBLE ORIGINATING AGENCY\", and the address the bound "
        + "form prints on its own face"
    }
  ],

  instructionsHeading: "What to do — correcting an Alaska criminal justice information entry (AS 12.62.170)",

  instructionsIntro: [
    "**This is not a court filing.** AS 12.62.170 creates an *administrative correction process* for inaccurate or incomplete criminal justice information. The recorded rule is that you challenge the record first through the Department of Public Safety, or through the agency responsible for the disputed data, on the published **Request to Correct Criminal Justice Information** form. There is no petition, no case number and no hearing at this stage.",
    "**Know the boundary before you start, because it decides whether this is your route at all.** The recorded rule is exact: *a disagreement about whether an accurate event should be sealed or expunged is not a correction claim.* This route is for a record that is **wrong** — the arrest was not yours, a descriptor is incorrect, the charge is recorded incorrectly, the disposition is missing or wrong, or a set-aside is not shown. It is not a way to remove a record that is right.",
    "**The form is the agency's own.** DPS Form CRI-103 (Rev. 07/25/22) is delivered exactly as the Department publishes it. The platform wrote six things onto it — your name, your mailing address, your city, state and ZIP, your date of birth, your telephone number and your email — each onto the ruled blank the form draws for it. Every other blank on that page is listed below and is yours.",
    "**Two things the form itself will not let the platform fill.** Your driver's licence number and your Social Security number are government identifiers, and the platform refuses to write either onto any form. Both blanks are yours."
  ],

  whoDecides: [
    "**The Department of Public Safety decides, or the agency that owns the disputed data does.** You are asking the holder of the record to correct its own record. Nothing about that is a court proceeding and nothing on this route is filed.",
    "**If DPS does not hold the information, DPS forwards it — you do not.** The bound form's own decision block records that step on its face: *DPS does not have information; forwarded to: ___ on ___ Due: ___*, and then *Based on response received or lack of response by deadline, request Approved / Denied*. So you send to one place, and the Department chases the originating agency itself.",
    "**Nobody is deciding whether your record should be sealed.** That is a different question under a different statute, and the recorded rule is that it is not a correction claim at all.",
    "**If the request is denied, the appeal is not a self-help filing.** The form itself prints the first step — *Per 13 AAC 68.200, you may appeal a denial to the Commissioner of Public Safety* — and the recorded decision names what follows a final adverse decision: judicial review by administrative appeal to the Alaska Superior Court, which it says in terms is **not** an ordinary self-help record-clearing packet. Nothing here prepares that appeal."
  ],

  filingDestination: [
    "**Send the completed form to the Department of Public Safety's Criminal Records and Identification Bureau.** The bound form prints the destination on its own face, with four ways to reach it: *Submit forms to: Criminal Records and Identification Bureau, 5700 East Tudor Road, Anchorage, Alaska 99507. Telephone: (907) 375-6410. Fax: (907) 269-0363. Email: dps.chri@alaska.gov.*",
    "**Or send it to the agency responsible for the disputed data**, if the wrong entry belongs to another agency's record rather than to the APSIN entry itself. The recorded initial destination is \"DPS / RESPONSIBLE ORIGINATING AGENCY\", and the Bureau's own telephone number above is the place to ask which of the two yours is.",
    "**Nothing is filed with any court, and there is no court to file it in on this route.**"
  ],

  feeAndWaiver: [
    "**No held source states any charge for submitting this correction request, and this packet asks you to pay nothing.** The bound form prints no fee anywhere on its face. **The Bureau publishes what it charges, and the form gives you four ways to ask it: (907) 375-6410, fax (907) 269-0363, dps.chri@alaska.gov, or 5700 East Tudor Road, Anchorage, Alaska 99507.** Ask before you send if you want certainty.",
    "**One cost on this route IS recorded, and it is not a fee for the request.** You will generally need your own Alaska criminal history record in order to identify the precise entry that is wrong. The compiled Alaska profile this route is built on records the item and not a figure — *\"DPS criminal history record — DPS fee — To confirm what records exist\"* — so a DPS fee applies and the amount is the Bureau's to state. Ask it at the same number.",
    "**Alaska's other published record-clearing charges are not this route's charges, and this packet does not borrow them.** The same compiled profile prices a TF-810 Courtview exclusion (\"Typically $0\"), an SIS set-aside motion, and an AS 12.62.180(b) *sealing* request (\"Agency-dependent\"). None of those is an AS 12.62.170 correction: they are different statutes and different instruments, and a figure keyed to one of them is not the price of this.",
    "**There is no fee waiver, because there is no filing fee.** An administrative correction request is not a court filing and carries no filing fee for a waiver to reach. If a records charge is a barrier for you, ask the Bureau at the number above what it does for a person who cannot pay."
  ],

  service: [
    "**There is nobody to serve.** This is a request to a record-holding agency, not a proceeding: there is no opposing party, no prosecutor to notify, no certificate of service and no return date. No held record states any service requirement for it.",
    "**Send it once, to one office, and keep dated proof.** The form gives you post, fax and email; whichever you use, keep a copy of everything you sent, including every attachment. If the Bureau later says nothing arrived, that copy and that receipt are what you have.",
    "**If DPS has to reach another agency, that is DPS's step, not yours.** The form's own decision block records the Department forwarding the request to the originating agency and setting that agency a due date. Do not send duplicate requests to the other agency unless the Bureau tells you to."
  ],

  documentsToObtain: [
    ["Your Alaska criminal history record from DPS — the document that shows the precise entry you say is wrong", "the Criminal Records and Identification Bureau at the address, telephone, fax or email printed on the form; the compiled Alaska profile records that a DPS fee applies and states no amount"],
    ["A certified disposition for the case, where the entry you are correcting is a court disposition", "the court that handled the case; the recorded decision lists certified disposition among the supporting documentation a challenge carries"],
    ["Identity documents, where the entry is a personal descriptor or the arrest was not yours", "you; the recorded decision lists identity documents among the supporting documentation"],
    ["Court documents supporting the correction, where any exist", "the court that handled the case — the form's own instruction is that if court documents are available they must be attached"],
    ["Fingerprints, where the reason is mistaken identity or false accusation", "the Bureau; the form's own instruction on that reason is to make arrangements through that office to have your fingerprints taken"]
  ],

  steps: [
    "**Check first that this is a correction and not a sealing request.** The recorded rule is that a disagreement about whether an accurate event should be sealed or expunged is not a correction claim. If the record is right and you want it hidden, this is the wrong route.",
    "**Get your Alaska criminal history record from DPS** so that you can point at the precise entry rather than describing it. A DPS fee applies; the Bureau states it.",
    "**Mark the one reason on the form that matches your record.** The form offers five, they are facts about your own record, and this packet marks none of them for you: mistaken identity or false accusation; personal descriptors in error; charge information in error; missing or wrong court or prosecutor disposition information; set-aside information missing.",
    "**Write the problem out on the form, and use the back of the form if you need more room** — that is the form's own instruction. Say which entry is wrong, why it is inaccurate or incomplete, what the correct data is, and what correction you are asking for. The evidence checklist page in this packet has each of those as a heading.",
    "**Attach the documents.** The form's own instruction is that if court documents are available they must be attached. Attach the certified disposition and the identity documents that support the correction.",
    "**If your reason is mistaken identity or false accusation, arrange fingerprints.** The form's own instruction on that reason is to make arrangements through the Bureau to have your fingerprints taken, and to provide the name of the person using your identity if you know it.",
    "**Fill in the blanks that are yours** — the driver's licence, the SSN, any maiden or alias name, a fax number or other contact number if you have one — each listed in the table above.",
    "**Complete the right-hand column only if the record was used to deny you a right or a privilege.** If it was not, that whole column stays empty.",
    "**Sign and date the form yourself**, under the unsworn falsification statement it carries: you certify under penalty of unsworn falsification (AS 11.56.210) that what you supply is true and correct. Nothing on this packet signs or dates for you.",
    "**Send it to the Bureau, and keep dated proof.** Post, fax or email, all printed on the form's face.",
    "**If the request is denied, the form's own next step is an appeal to the Commissioner of Public Safety under 13 AAC 68.200.** Beyond that, the recorded escalation is an administrative appeal to the Alaska Superior Court — and the recorded decision says in terms that this is not an ordinary self-help matter. Take it to a lawyer."
  ],

  deliberatelyBlank: [
    "**Your signature on the form and the date beside it.** The form carries an unsworn falsification statement under AS 11.56.210 above that line; the certification is yours to make.",
    "**Your driver's licence number and your Social Security number.** The shared semantics refuse a government identifier on any form, and the refusal is deliberate rather than a gap.",
    "**Every one of the five reason boxes.** Which one is true is a fact about your own record, and marking one for you would be asserting something the platform does not know.",
    "**The whole right-hand column.** It applies only where the record was or will be used to deny you a right or a privilege, and the platform does not know whether it was.",
    "**The DPS decision block at the foot of the page.** The Bureau completes it."
  ],

  notTold: [
    "**What a DPS criminal history record costs.** The compiled Alaska profile records that a DPS fee applies and records no amount. The Criminal Records and Identification Bureau publishes it: (907) 375-6410, or dps.chri@alaska.gov.",
    "**Whether your particular entry belongs to DPS or to another agency.** The recorded destination is DPS or the responsible originating agency, and which yours is depends on whose data is wrong. The Bureau can tell you at the same number.",
    "**How long the Bureau takes.** The form sets a due date for an agency it forwards to, and states no turnaround for itself. Ask the Bureau.",
    "**Whether a correction will change what a background check shows.** This packet does not promise any outcome from any record-holder."
  ],

  stopConditions: [
    "the record is accurate and what you actually want is for it to be sealed or expunged — the recorded rule is that this is not a correction claim, and Alaska's sealing route under AS 12.62.180 is a different instrument in a different packet;",
    "the Bureau denies the request — the form's own next step is an appeal to the Commissioner of Public Safety under 13 AAC 68.200, and the recorded escalation after a final adverse decision is an administrative appeal to the Alaska Superior Court, which the decision says in terms is not an ordinary self-help matter;",
    "you are asked to prove identity by fingerprints and are unsure what that means for you;",
    "the entry you want corrected came from another state or from a federal agency — Alaska's Commissioner cannot reach records that did not originate in this state;",
    "somebody else has been using your identity and you do not know what else was done in your name;",
    "any immigration question is involved."
  ],

  whatThisIsNot:
    "This is the Department of Public Safety's own published form CRI-103, delivered as the Department issues it, "
    + "with a route sheet and an evidence checklist. It is not a court filing, not a petition, not a sealing or "
    + "expungement request, not the appeal to the Commissioner and not the Superior Court appeal that may follow "
    + "one. It is not legal advice, it is not sent for you, and it is not a promise that the Department will "
    + "correct anything.",

  receiptDoesNotEstablish: [
    "that this is the current edition of DPS Form CRI-103, or that the Department has not revised it since the archive was assembled",
    "that any particular APSIN entry is inaccurate or incomplete",
    "what the Department of Public Safety charges for a criminal history record"
  ],

  buildFindings: [
    {
      finding:
        "MASTER_QUEUE classifies this family participant_agency_application, and unlike the other two agency "
        + "treatments in this lane it binds a real document: the controlling decision names \"the published "
        + "Request to Correct Criminal Justice Information form\" and the census names it as this route's "
        + "requiredSourceId.",
      consequence:
        "DPS Form CRI-103 is bound by exact SHA-256 through the committed corpus index and delivered as the "
        + "Department issues it. No form was invented for this route, and the route was not left in a "
        + "missing-PDF state."
    },
    {
      finding:
        "CRI-103 is a flat page: the corpus index records 0 AcroForm fields on it, so there is no widget "
        + "rectangle to write into and no appearance to flatten.",
      consequence:
        "Every write box is measured from the form's own content stream — one horizontal stroke, matched on its "
        + "y, its start x and its end x, with the box ceiling taken from the lowest printed baseline above it "
        + "inside its own span. Twelve blanks are measured; six carry a fact. A blank that failed to measure "
        + "would stop the family rather than be drawn at a guessed rectangle."
    },
    {
      finding:
        "Two blanks the platform could technically fill are refused by the shared semantics as government "
        + "identifiers: the driver's licence number and the SSN.",
      consequence:
        "Both are declared required-before-filing, disclosed by name in participant-instructions.md, and the "
        + "refusal is explained to the participant rather than presented as an oversight."
    },
    {
      finding:
        "The form's five reasons are an election, and the route does not determine which is true.",
      consequence:
        "Each is recorded as a genuine participant election rather than as a route-determined selection left "
        + "unmade, with the reason stated in routeSelectionNote. Nothing is marked on the form."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against DETERMINATION_FEE_AND_WAIVER_STANDARD A1-A3. The compiled Alaska profile "
        + "is a held source under A2, and its fee table prices a TF-810 Courtview exclusion, an SIS set-aside "
        + "motion, an AS 12.62.180(b) SEALING request and a DPS criminal history record. Under A3, none of the "
        + "first three answers an AS 12.62.170 correction — they are different statutes and different "
        + "instruments — while the fourth answers a document this route genuinely needs.",
      consequence:
        "The packet states that no held source establishes a charge for the request itself and names the "
        + "Criminal Records and Identification Bureau with the address, telephone, fax and email the bound form "
        + "prints on its own face; states that the DPS criminal history record carries a DPS fee whose amount "
        + "the profile does not give, and names the same office for it; and says in terms that the TF-810, "
        + "set-aside and sealing figures are not borrowed."
    },
    {
      finding:
        "SELF_HELP_STOP has two recorded limbs and they must not be collapsed. The decision draws a substantive "
        + "boundary — a disagreement about whether an ACCURATE event should be sealed is not a correction claim "
        + "— and a procedural one — a final adverse decision goes to the Superior Court by administrative "
        + "appeal, which is expressly not an ordinary self-help packet. The bound form adds a third step the "
        + "decision does not mention: an appeal to the Commissioner of Public Safety under 13 AAC 68.200.",
      consequence:
        "All three are stated, each attributed to the record it came from, and the packet prepares none of the "
        + "appeals."
    }
  ],

  counselQuestions: [
    "The packet delivers CRI-103 with six identity and contact facts drawn onto measured ruled blanks and everything else left to the participant. Confirm that filling those six on an agency correction form is appropriate, given that the form carries an unsworn falsification certification over the whole of what is supplied.",
    "The five reason boxes are treated as genuine participant elections that the route does not determine, so none is marked. Confirm that, or say that the route ought to determine one.",
    "The packet states that no held source establishes a charge for the request and names the Bureau with the contact details the form prints. Confirm that reading, or supply the figure.",
    "The packet tells a participant whose record is accurate that this is not their route and points at AS 12.62.180 sealing without carrying it. Confirm the boundary is stated correctly.",
    "The packet states the Commissioner appeal under 13 AAC 68.200 from the form's own face, and the Superior Court administrative appeal from the decision, and prepares neither. Confirm that is the right stopping point."
  ],

  reviewersAttention: [
    "This is an AGENCY-APPLICATION treatment that DOES bind an official form. It carries no caption, case number, proposed order or certificate of service by design.",
    "Every value on the official page is drawn onto a measured ruled blank rather than into a widget, because the form has no AcroForm. The measurement basis is recorded per cell in production-field-map.json under measuredCells.",
    "The DPS decision block at the foot of the page is deliberately untouched and is recorded as agency-owned; please check on the raster that nothing has landed in it."
  ],

  /* ---- composed bodies ------------------------------------------------------- */
  composedBody(componentId, facts) {
    const name = facts["participant.full_legal_name"];
    const L = [];
    L.push(this.componentTitles[componentId].toUpperCase(), "");
    if (componentId === "agency_route_sheet") {
      L.push(`Prepared for: ${name}`, "");
      L.push("WHAT THIS IS, IN ONE LINE", "");
      L.push("An administrative request asking the Alaska Department of Public Safety, or the agency that owns the disputed data, to correct an inaccurate or incomplete entry in your criminal justice information under AS 12.62.170. It is not a court filing.", "");
      L.push("THE BOUNDARY - READ THIS BEFORE ANYTHING ELSE", "");
      L.push("The recorded rule is exact: a disagreement about whether an ACCURATE event should be sealed or expunged is NOT a correction claim. This route is for a record that is WRONG. If your record is right and you want it hidden, this is the wrong instrument, and Alaska's sealing route under AS 12.62.180 is a different packet.", "");
      L.push("WHERE IT GOES", "");
      L.push("The form prints its own destination: Submit forms to: Criminal Records and Identification Bureau, 5700 East Tudor Road, Anchorage, Alaska 99507. Telephone: (907) 375-6410. Fax: (907) 269-0363. Email: dps.chri@alaska.gov.");
      L.push("The recorded initial destination is DPS or the responsible originating agency. If the wrong entry belongs to another agency's record, that agency is the destination; the Bureau's own number above is where to ask which yours is.");
      L.push("If DPS does not hold the information, DPS forwards the request itself and sets that agency a due date - the form's own decision block records that step on its face. You do not chase the other agency.", "");
      L.push("WHAT YOU DO NOT FILE", "");
      L.push("No petition. No motion. No proposed order. No certificate of service. No case number, because there is no case. Nothing on this route goes to a court.", "");
      L.push("WHAT IT COSTS", "");
      L.push("Nothing is asked of you in this packet, and no held source states a charge for submitting the request. The form prints no fee. The Bureau publishes what it charges and the form gives you four ways to ask: (907) 375-6410, fax (907) 269-0363, dps.chri@alaska.gov, or 5700 East Tudor Road, Anchorage, Alaska 99507.");
      L.push("One recorded cost is real and is not a fee for the request: you will generally need your own Alaska criminal history record to point at the entry, and the compiled Alaska profile records \"DPS criminal history record - DPS fee - To confirm what records exist\" without an amount. Ask the Bureau.");
      L.push("Alaska's other published charges are not this route's charges. The same profile prices a TF-810 Courtview exclusion at typically $0, an SIS set-aside motion, and an AS 12.62.180(b) SEALING request as agency-dependent. Those are different statutes and different instruments, and this packet does not borrow their figures.");
      L.push("There is no fee waiver because there is no filing fee.", "");
      L.push("WHO ELSE HAS TO BE TOLD", "");
      L.push("Nobody. There is no opposing party and no certificate of service. Send it once, keep dated proof, and let DPS forward it if it has to.", "");
      L.push("IF IT IS DENIED", "");
      L.push("The form's own footer: Per 13 AAC 68.200, you may appeal a denial to the Commissioner of Public Safety.");
      L.push("After a final adverse decision, the recorded route is judicial review by administrative appeal to the Alaska Superior Court under the applicable appellate rules - and the recorded decision says in terms that that appeal is NOT an ordinary self-help record-clearing packet. Take it to a lawyer. Nothing here prepares either appeal.", "");
      L.push("WHEN TO STOP AND GET HELP", "");
      L.push("- the record is accurate and you want it sealed rather than corrected;");
      L.push("- the request is denied;");
      L.push("- the entry came from another state or from a federal agency - the Commissioner cannot reach records that did not originate in Alaska;");
      L.push("- somebody has been using your identity and you do not know what else was done in your name;");
      L.push("- any immigration question is involved.", "");
      L.push("WHAT THIS PACKET IS NOT", "");
      L.push("The Department's own form CRI-103 delivered as issued, plus this route sheet and an evidence checklist. Not a court filing, not a petition, not a sealing request, not either appeal, not legal advice, not sent for you, and not a promise that the Department will correct anything.");
    } else {
      L.push(`Prepared for: ${name}`, "");
      L.push("The recorded decision says a challenge under AS 12.62.170 should identify six things. Write each one out here, then copy or attach it to the form. The form's own instruction is: \"What is the problem with your criminal history? Be specific. Use the back of form to explain. If court documents are available they must be attached.\"", "");
      L.push("1. THE PRECISE ENTRY. Which entry in your criminal justice information is wrong. Identify it exactly as your DPS criminal history record prints it, not by description.", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("2. WHY IT IS INACCURATE OR INCOMPLETE. What specifically is wrong with it, or what is missing from it.", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("3. THE CORRECT DISPOSITION OR DATA. What the entry should say instead.", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("4. THE ORIGINATING AGENCY AND CASE. Which agency created the entry, and the case or incident number it belongs to.", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("5. SUPPORTING DOCUMENTATION. The recorded list is: certified disposition, identity documents, and fingerprints where required. Tick what you are attaching and name each document.", "");
      L.push("   [ ] Certified disposition from the court that handled the case");
      L.push("   [ ] Identity documents");
      L.push("   [ ] Fingerprints - required by the form itself if your reason is mistaken identity or false accusation; make arrangements through the Bureau to have them taken");
      L.push("   [ ] Other court documents - the form requires these to be attached if they are available", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("6. THE CORRECTION REQUESTED. State plainly what you are asking the record-holder to do.", "");
      L.push(DOTS());
      L.push(DOTS(), "");
      L.push("AND ONE THING THE FORM ADDS. If your reason is mistaken identity or false accusation, the form asks for the name of the person using your identity, if known.", "");
      L.push(DOTS(), "");
      L.push("A REMINDER ABOUT WHAT YOU ARE SIGNING. The form carries an unsworn falsification statement: you certify under penalty of unsworn falsification (AS 11.56.210) that the information you supply on and with the form is true and correct. Everything you write above travels under that certification.");
    }
    L.push("", `Route: ${this.routes[0].routeKey}`);
    return L.join("\n");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [];
    const refusals = [];
    if (componentId === "dps_correction_request") {
      writes.push(
        h.write("subject_name", "Subject Name", "participant.full_legal_name"),
        h.write("mailing_address", "Mailing Address", "participant.street_address"),
        h.write("city_state_zip", "City/State/Zip", "participant.city_state_zip"),
        h.write("date_of_birth", "Date of Birth", "participant.date_of_birth"),
        h.write("telephone", "Telephone #", "participant.phone"),
        h.write("email", "Email", "participant.email")
      );
      refusals.push(
        h.rbf("requester_name", "Requester Name (if not subject)",
          "nothing, if the record you are correcting is your own - the form asks for this only where the person making the request is someone other than the subject of the record. If you are making the request for someone else, put your own name here",
          "the form itself makes this blank conditional on the requester not being the subject, and the platform holds no fact about anyone else"),
        h.rbf("maiden_alias_name", "Maiden/Alias name",
          "any maiden name or alias your record might be held under; the agency searches on these",
          "the platform holds no alias fact, and binding the participant's legal name into an alias blank would assert an alias that may not exist"),
        h.rbf("drivers_license", "Drivers License State / #",
          "your driver's licence issuing state and number, from the licence itself",
          "the shared semantics refuse a government identifier on any form, so the platform will not write a licence number even where it holds one"),
        h.rbf("ssn", "SSN",
          "your Social Security number, if you choose to give it",
          "the shared semantics refuse a government identifier on any form, so the platform will not write a Social Security number"),
        h.rbf("fax", "Fax #",
          "a fax number the agency can reach you on, if you have one; leave it empty if you do not",
          "the platform holds no fax fact"),
        h.rbf("other_contact", "Other (cell or message #)",
          "a mobile or message number the agency can reach you on, if you want to give one that is not your main telephone number",
          "the platform holds one telephone fact and writes it to the telephone blank; a second number is one it does not hold"),
        h.rbf("problem_description", "What is the problem with your criminal history",
          "the precise entry that is wrong, why it is inaccurate or incomplete, the correct data, the originating agency and case, and the correction you are asking for - use the back of the form if you need more room, as the form instructs. The evidence checklist page in this packet has each of those as a heading",
          "the account of what is wrong with a record is the participant's own and the substance the agency decides on; the platform has not seen the record"),
        h.rbf("person_using_identity", "Name of the person using your identity",
          "the name of the person using your identity, if you know it - the form asks for this only where your reason is mistaken identity or false accusation",
          "the identity of another person is not a fact the platform holds"),
        h.rbf("right_or_privilege", "Right or privilege granted or denied",
          "the right or privilege that was or will be denied because of the record - only if that has happened; leave the whole right-hand column empty if it has not",
          "the whole right-hand column is conditional on the record having been used to deny a right or privilege, which the platform does not know"),
        h.rbf("date_and_time_granted_or_denied", "Date and time granted / denied",
          "the date and time the right or privilege was granted or denied - only if the right-hand column applies to you",
          "conditional on a denial the platform does not know about"),
        h.rbf("responsible_person_name", "Name of the person responsible for granting or denying the privilege",
          "the name of the person who granted or denied it - only if the right-hand column applies to you",
          "the identity of a third party is not a fact the platform holds"),
        h.rbf("responsible_person_title", "Title of the person responsible for granting or denying the privilege",
          "that person's job title - only if the right-hand column applies to you",
          "the details of a third party are not facts the platform holds"),
        h.rbf("responsible_person_mailing_address", "Mailing address of the person responsible for granting or denying the privilege",
          "that person's postal address - only if the right-hand column applies to you",
          "a third party's address is not a fact the platform holds, and the participant's own address belongs in the left-hand column"),
        h.rbf("responsible_person_telephone", "Telephone number of the person responsible for granting or denying the privilege",
          "that person's telephone number - only if the right-hand column applies to you",
          "a third party's telephone number is not a fact the platform holds"),
        h.election("reason_mistaken_identity", "Reason box: MISTAKEN IDENTITY / FALSELY ACCUSED",
          "which of the form's five reasons is true is a fact about the participant's own record; the route does not determine it, and this reason additionally requires the participant to arrange fingerprints through the Bureau"),
        h.election("reason_personal_descriptors", "Reason box: PERSONAL DESCRIPTORS IN ERROR",
          "which of the form's five reasons is true is a fact about the participant's own record and the route does not determine it"),
        h.election("reason_charge_information", "Reason box: CHARGE INFORMATION IN ERROR",
          "which of the form's five reasons is true is a fact about the participant's own record and the route does not determine it"),
        h.election("reason_missing_disposition", "Reason box: MISSING OR WRONG COURT OR PROSECUTOR DISPOSITION INFORMATION",
          "which of the form's five reasons is true is a fact about the participant's own record and the route does not determine it"),
        h.election("reason_set_aside_missing", "Reason box: SET ASIDE INFORMATION IS MISSING",
          "which of the form's five reasons is true is a fact about the participant's own record and the route does not determine it"),
        h.protectedBlank("record_subject_signature", "Record Subject's Signature",
          "the form carries an unsworn falsification certification under AS 11.56.210 over this line; the requester signs it personally"),
        h.protectedBlank("signature_date", "Date beside the Record Subject's Signature",
          "a date written before the form is signed would be false"),
        h.agencyBlank("dps_decision_block", "Bureau use only - the decision block at the foot of the form",
          "DPS Received, DPS has information, Approved, Denied, the forwarding line and its due date are all completed by the Criminal Records and Identification Bureau")
      );
    } else if (componentId === "evidence_checklist") {
      writes.push(h.write("checklist_prepared_for", "Person this evidence checklist is prepared for", "participant.full_legal_name"));
      refusals.push(
        h.rbf("precise_entry", "The precise entry that is inaccurate or incomplete",
          "the entry exactly as your DPS criminal history record prints it, not a description of it",
          "the platform has not seen any participant's Alaska criminal history record"),
        h.rbf("why_inaccurate", "Why the entry is inaccurate or incomplete",
          "what specifically is wrong with the entry, or what is missing from it",
          "this is the participant's own account of their own record"),
        h.rbf("correct_data", "The correct disposition or data",
          "what the entry should say instead",
          "the correct value for a record the platform has not seen is not a fact it holds"),
        h.rbf("originating_agency_and_case", "The originating agency and case",
          "which agency created the entry, and the case or incident number it belongs to",
          "which agency originated a particular entry lives on the record itself"),
        h.rbf("supporting_documentation", "The supporting documentation being attached",
          "which of the certified disposition, identity documents, fingerprints and other court documents you are attaching, and the name of each",
          "what a participant holds and attaches is not a fact the platform can know"),
        h.rbf("correction_requested", "The correction requested",
          "what you are asking the record-holder to do, stated plainly",
          "the relief a participant asks for on their own record is theirs to state"),
        h.rbf("checklist_person_using_identity", "The name of the person using your identity, if known",
          "the name of the person using your identity, if you know it - the form asks for this where the reason is mistaken identity or false accusation",
          "the identity of another person is not a fact the platform holds")
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
