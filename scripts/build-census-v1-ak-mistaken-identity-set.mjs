#!/usr/bin/env node
/**
 * FABLE-PD official-form packet family — Alaska, sealing criminal justice
 * information for MISTAKEN IDENTITY or FALSE ACCUSATION under AS 12.62.180.
 *
 *   node scripts/build-census-v1-ak-mistaken-identity-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy, one route:
 *
 *   obligation:track-pathway:AK:ak-mistaken-identity:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180
 *
 * WHAT KIND OF FAMILY THIS IS
 *
 * An OFFICIAL-FORM packet family with exactly one component, which is what the
 * committed packet-set manifest gives it: the Department of Public Safety's own
 * six-page application, Form Seal Req 2-04, bound by exact SHA-256 and
 * delivered as DPS publishes it. It is an application to an agency rather than
 * a court filing -- AS 12.62.180(b) is a written request to the head of the
 * agency that maintains the information -- and nothing here is styled as a
 * pleading.
 *
 * WHERE THE VALUES GO, AND HOW THE BOXES ARE FOUND
 *
 * The form carries no AcroForm: the corpus index records 0 fields on it. PART
 * II, its person-and-case block on page 3, is a fully ruled table, and every
 * write box is four strokes read from the page content stream -- the rule
 * above, the rule below, and the vertical divider on each side -- re-checked
 * against the pinned binary before anything is drawn. Twenty-five cells are
 * measured; eight carry a fact.
 *
 * THREE BLANKS THAT WOULD TAKE THE PARTICIPANT'S OWN NAME
 *
 * The shared binder falls back to a blank's printed caption when its name says
 * nothing, and on a flat overlay the caption IS the name. Three captions on
 * page 3 resolve to participant.full_legal_name and must never be anchored:
 *
 *   NAME OF ARRESTING OFFICER    -> participant.full_legal_name
 *   NAME OF TRIAL COURT          -> participant.full_legal_name
 *   NAME OF APPELLATE COURT      -> participant.full_legal_name
 *
 * This is the same family of defect as the Arkansas MONTH blank that took a
 * participant's name into an arrest date. None is given a fact here, so none is
 * anchored and none can be written; the refusal is recorded per blank rather
 * than left to the reader to notice.
 *
 * WHAT THE PARTICIPANT CANNOT DO ALONE, AND THE PACKET SAYS SO
 *
 * PART IV requires the ARRESTING OR CITING OFFICER (or that officer's superior)
 * and, where charges were referred, the PROSECUTOR (or their superior) each to
 * read the application and sign a statement saying whether they agree that the
 * charges resulted from mistaken identity or false accusation, beyond a
 * reasonable doubt. The committed packet-set manifest carries the same thing as
 * a requirement before filing and says in terms that LegalEase does not obtain
 * or validate it. A participant who cannot get those signatures cannot file
 * this application, and the instructions lead with it.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */

const FAMILY_ID = "ak-mistaken-identity-set";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-ak-mistaken-identity-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill",
  jurisdiction: "AK",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_forms",
  legalName: "Request to Seal Criminal Justice Information for Mistaken Identity or False Accusation (AS 12.62.180)",
  routeName: "asking the agency that holds the record to seal Alaska criminal justice information that resulted, beyond a reasonable doubt, from mistaken identity or false accusation",
  statutes: ["AS 12.62.180", "13 AAC 68.205", "AS 12.62.180(b)", "AS 12.62.180(c)"],
  routes: [{ routeKey: "obligation:track-pathway:AK:ak-mistaken-identity:sealing-for-mistaken-identity-or-false-accusation-as-12-62-180" }],

  records: [
    {
      recordId: "packet-set-manifest:ak-mistaken-identity-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role:
        "the committed packet-set manifest for this exact packet set. Under DETERMINATION_FEE_AND_WAIVER_"
        + "STANDARD amendment A2 its participantActionRequired entries are a held source, and here they settle "
        + "the officer and prosecutor verification the participant must obtain, the court documentation, the "
        + "fee position, the waiver position and the service position",
      mustContain: [
        "Obtain Officer or prosecutor verification. Ask the arresting agency or prosecutor to complete the verification section. LegalEase does not obtain or validate it.",
        "Obtain Court documentation. Ask the clerk for the court documentation the application requires.",
        "Officer or prosecutor verification fields — DPS application, verification section.",
        "The source review does not state a fee for this application.",
        "The source review does not address a fee waiver.",
        "The source review does not state a service requirement.",
        "Submit the DPS application with the verification and court documentation."
      ]
    },
    {
      recordId: "compiled-profile:AK-alaska",
      path: "src/lib/rcap-engine/compiled/profiles/AK-alaska.json",
      role:
        "the compiled Alaska profile, named by the route obligation census as a required source for this exact "
        + "route and a held source under amendment A2. Its fee table answers this route directly, because the "
        + "line is keyed to an AS 12.62.180(b) sealing request -- this route's own subsection -- rather than to "
        + "a sibling remedy",
      mustContain: [
        "AS 12.62.180(b) sealing request Agency-dependent Written request to the record-holding agency",
        "DPS criminal history record DPS fee To confirm what records exist",
        "A mistaken-identity sealing request under AS 12.62.180(b) goes to",
        "Sealing (12.62.180) is essentially limited to mistaken identity / false accusation proven beyond a reasonable doubt — not a route for clearing valid records."
      ]
    }
  ],

  officialComponents: {
    dps_seal_application: {
      sourceId: "official-form:DPS-REQUEST-TO-SEAL-CRIM-INFO",
      documentId: "DPS-SEAL-REQ-2-04",
      formNumber: "DPS-SEAL-REQ-2-04",
      officialTitle: "State of Alaska Department of Public Safety — Request to Seal Criminal Justice Information",
      revision: "REV-2004-02",
      instrumentKind: "primary_filing",
      sha256: "1fb64733f46c397beb69d1da8d72a1f1462669f8dfb7611e86a833c45aa5c80a",
      acroform: false
    }
  },

  /* PART II, page 3. Every cell is four measured strokes. `fact` is set only
   * where the platform holds the value AND the shared binder resolves this
   * caption to that value; every other cell is measured and left alone. */
  officialCells: {
    dps_seal_application: [
      { key: "full_name", page: 3, top: 690.84, bottom: 653.10, left: 31.86, right: 570.42,
        label: "FULL NAME (Last) (First) (Middle) (Suffix)", fact: "participant.full_legal_name" },
      { key: "former_or_other_names", page: 3, top: 653.10, bottom: 615.48, left: 31.86, right: 570.42,
        label: "FORMER OR OTHER NAMES/ALIASES", fact: null },
      { key: "mailing_address", page: 3, top: 577.02, bottom: 496.50, left: 31.86, right: 292.14,
        label: "MAILING ADDRESS", fact: "participant.street_address", writeUnderCaption: true },
      { key: "phone_numbers", page: 3, top: 577.02, bottom: 543.78, left: 292.14, right: 570.42,
        label: "PHONE NUMBER(S)", fact: "participant.phone" },
      { key: "social_security_number", page: 3, top: 543.78, bottom: 496.50, left: 292.14, right: 570.42,
        label: "SOCIAL SECURITY #", fact: null },
      { key: "date_of_birth", page: 3, top: 496.50, bottom: 449.22, left: 31.86, right: 292.14,
        label: "DATE OF BIRTH", fact: "participant.date_of_birth" },
      { key: "drivers_license_or_state_id", page: 3, top: 496.50, bottom: 449.22, left: 292.14, right: 570.42,
        label: "ALASKA DRIVERS LICENSE # OR STATE ID #", fact: null },
      { key: "arrest_tracking_number", page: 3, top: 449.22, bottom: 397.56, left: 31.86, right: 211.14,
        label: "ARREST TRACKING NUMBER", fact: null },
      { key: "date_of_arrest", page: 3, top: 449.22, bottom: 397.56, left: 211.14, right: 385.14,
        label: "DATE OF ARREST", fact: "matter.arrest_date" },
      { key: "date_of_offense", page: 3, top: 449.22, bottom: 397.56, left: 385.14, right: 570.42,
        label: "DATE OF OFFENSE", fact: "matter.offense_date" },
      { key: "police_agency_case_number", page: 3, top: 397.56, bottom: 359.88, left: 31.86, right: 211.14,
        label: "POLICE AGENCY CASE #", fact: null },
      { key: "name_of_arresting_agency", page: 3, top: 397.56, bottom: 359.88, left: 211.14, right: 385.14,
        label: "NAME OF ARRESTING AGENCY", fact: null },
      { key: "name_of_arresting_officer", page: 3, top: 397.56, bottom: 359.88, left: 385.14, right: 570.42,
        label: "NAME OF ARRESTING OFFICER", fact: null },
      { key: "prosecution_case_number", page: 3, top: 359.88, bottom: 322.20, left: 31.86, right: 211.14,
        label: "PROSECUTION CASE #", fact: null },
      { key: "name_of_prosecuting_agency", page: 3, top: 359.88, bottom: 322.20, left: 211.14, right: 385.14,
        label: "NAME OF PROSECUTING AGENCY", fact: null },
      { key: "name_of_prosecutor", page: 3, top: 359.88, bottom: 322.20, left: 385.14, right: 570.42,
        label: "NAME OF PROSECUTOR", fact: null },
      { key: "trial_court_case_number", page: 3, top: 322.20, bottom: 284.52, left: 31.86, right: 292.14,
        label: "TRIAL COURT CASE #", fact: "matter.case_number" },
      { key: "name_of_trial_court", page: 3, top: 322.20, bottom: 284.52, left: 292.14, right: 570.42,
        label: "NAME OF TRIAL COURT", fact: null },
      { key: "appellate_court_case_number", page: 3, top: 284.52, bottom: 246.84, left: 31.86, right: 292.14,
        label: "APPELLATE COURT CASE #", fact: null },
      { key: "name_of_appellate_court", page: 3, top: 284.52, bottom: 246.84, left: 292.14, right: 570.42,
        label: "NAME OF APPELLATE COURT", fact: null },
      { key: "charge_statute_or_ordinance", page: 3, top: 246.84, bottom: 195.12, left: 31.86, right: 292.14,
        label: "CHARGE(S): STATUTE/ORDINANCE #", fact: null },
      { key: "name_of_offenses", page: 3, top: 246.84, bottom: 195.12, left: 292.14, right: 570.42,
        label: "NAME OF OFFENSE(S)", fact: "matter.charge" },
      { key: "date_charge_dismissed", page: 3, top: 195.12, bottom: 157.44, left: 31.86, right: 292.14,
        label: "DATE CHARGE DISMISSED", fact: null },
      { key: "agency_that_dismissed", page: 3, top: 195.12, bottom: 157.44, left: 292.14, right: 570.42,
        label: "AGENCY THAT DISMISSED", fact: null },
      { key: "date_acquitted", page: 3, top: 157.44, bottom: 124.26, left: 31.86, right: 292.14,
        label: "DATE ACQUITTED", fact: null },
      { key: "date_sentenced", page: 3, top: 157.44, bottom: 124.26, left: 292.14, right: 570.42,
        label: "DATE SENTENCED", fact: null },
      { key: "date_conviction_reversed_or_vacated", page: 3, top: 124.26, bottom: 86.52, left: 31.86, right: 292.14,
        label: "DATE CONVICTION REVERSED OR VACATED", fact: null },
      { key: "date_pardoned", page: 3, top: 124.26, bottom: 86.52, left: 292.14, right: 570.42,
        label: "DATE PARDONED", fact: null }
    ]
  },

  components: ["dps_seal_application"],
  componentTitles: {
    dps_seal_application: "DPS Form Seal Req 2-04 — Request to Seal Criminal Justice Information"
  },
  componentConditions: {},
  componentDescriptions: {
    dps_seal_application:
      "the Department of Public Safety's own six-page application: instructions, the statute and regulation, "
      + "the person-and-case block, your explanation, the officer and prosecutor verification sections, and "
      + "the two parts the Bureau and the Commissioner complete"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street, Anchorage, AK 99501",
      "participant.phone": "907-555-0142",
      "matter.case_number": "3AN-19-01184CR",
      "matter.arrest_date": "2019-06-14",
      "matter.offense_date": "2019-06-13",
      "matter.charge": "Theft in the fourth degree"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Kuskokwim Crossing Road, Apartment 14B, Ketchikan Gateway Borough, Alaska 99901-2214",
      "participant.phone": "(907) 555-0199 ext. 4417",
      "matter.case_number": "1KE-2004-000000118844CR-A",
      "matter.arrest_date": "2004-02-29",
      "matter.offense_date": "2004-02-28",
      "matter.charge": "Criminal trespass in the second degree, and criminal mischief in the fifth degree"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "The single document is the Alaska Department of Public Safety's own published application, Form Seal Req "
    + "2-04, bound by exact SHA-256 through the committed corpus index and delivered as DPS issues it, all six "
    + "pages of it including the Bureau's and the Commissioner's own parts. Nothing is composed, substituted or "
    + "invented.",

  agencyTreatmentNote:
    "This is an application to an AGENCY, not a court filing: AS 12.62.180(b) is a written request to the head "
    + "of the agency responsible for maintaining the information, and its own subsection (b) makes that head's "
    + "decision the final administrative decision. Nothing here is a petition or a motion and no court is "
    + "involved unless the applicant appeals under subsection (c).",

  routeSelectionNote:
    "The ROUTE is stated by the instrument and by the form's own PART III, which requires the applicant's "
    + "explanation to show, beyond a reasonable doubt, that the charge or charges resulted from mistaken "
    + "identity or false accusation. There is no election anywhere on this form: PART IV's I AGREE / I DO NOT "
    + "AGREE boxes are not the applicant's at all -- they belong to the arresting or citing officer and to the "
    + "prosecutor, who complete and sign those sections themselves. They are recorded as third-party blanks "
    + "rather than as participant elections, because a participant may not tick either one.",

  routeSelectionsMade: [
    {
      selection: "instrument",
      value: "DPS Form Seal Req 2-04, the Request to Seal Criminal Justice Information",
      determinedBy:
        "the committed packet-set manifest's single component, officialFormId DPS-REQUEST-TO-SEAL-CRIM-INFO, "
        + "and the compiled Alaska profile: \"for mistaken identity, it's a written sealing request to the "
        + "record-holding agency\""
    }
  ],

  instructionsHeading: "What to do — asking Alaska DPS to seal a record that came from mistaken identity or false accusation (AS 12.62.180)",

  instructionsIntro: [
    "**Read this first, because it decides whether you can use this application at all.** PART IV of the form requires the **arresting or citing officer** (or that officer's superior) to read your application and sign a statement saying whether they agree, beyond a reasonable doubt, that the charges resulted from mistaken identity or false accusation. If the charges were referred to a prosecutor, the **prosecutor** (or their superior) must do the same. The committed packet-set manifest records both as requirements before filing and says in terms that **LegalEase does not obtain or validate them**. Nobody can sign those sections for you, and an application without them is incomplete.",
    "**This is not a court filing.** AS 12.62.180(b) is a written request to the head of the agency responsible for maintaining the information. The form's own PART I prints the statute: \"A person may submit a written request to the head of the agency responsible for maintaining past conviction or current offender information, asking the agency to seal such information about the person that, beyond a reasonable doubt, resulted from mistaken identity or false accusation. The decision of the head of the agency is the final administrative decision on the request.\"",
    "**And it reaches only Alaska records.** PART I also prints: \"a criminal justice agency may seal only the information that the agency is responsible for maintaining\", and the form's own instructions say the Commissioner of Public Safety cannot seal criminal records from other states or the federal government, only records that originated in this state.",
    "The platform filled eight things in PART II from what it holds: your full name, your mailing address, your phone number, your date of birth, the trial court case number, the date of arrest, the date of the offence, and the name of the offence. Every other blank on the form is listed below.",
    "**Three blanks on PART II are refused deliberately and it is worth saying why.** NAME OF ARRESTING OFFICER, NAME OF TRIAL COURT and NAME OF APPELLATE COURT each resolve, under the shared naming rules, to the applicant's own name. Writing there would put *your* name where the form asks for an officer's or a court's. They are left empty and they are yours to complete."
  ],

  whoDecides: [
    "**The head of the agency decides, and that decision is final as an administrative matter.** The form prints AS 12.62.180(b) in full on page 2, and that is what it says.",
    "**Two people who are not you must sign before it is complete.** The arresting or citing officer, and the prosecutor if charges were referred. Each states I AGREE or I DO NOT AGREE that, beyond a reasonable doubt, the charges resulted from mistaken identity or false accusation, and each may add comments. Those boxes are not yours to tick.",
    "**The Bureau completes PART V and may ask you for more.** The form says so: the Records and Identification Bureau may contact you for additional information, including a request for a full set of fingerprints if necessary to process the request.",
    "**The Commissioner completes PART VI**, and the form says the whole application packet will be returned to you showing the Commissioner's decision.",
    "**If the decision goes against you, the appeal is a court appeal and it is not self-help.** AS 12.62.180(c), printed on page 2 of the form: the person may appeal an adverse decision to the court under the applicable rules of procedure for appealing an administrative agency decision, and **the appellant bears the burden on appeal of showing that the agency decision was clearly mistaken**. The same subsection says such an appeal may not collaterally attack a court judgment, or a decision by prison, probation or parole authorities, or any other action that is or could have been subject to appeal, post-conviction relief or another administrative remedy. Nothing in this packet prepares that appeal."
  ],

  filingDestination: [
    "**Send the completed application to the Chief of the Criminal Records and Identification Bureau.** The form prints the destination on its own first page: *SEND TO: CHIEF, CRIMINAL RECORDS AND IDENTIFICATION BUREAU, 5700 E. TUDOR ROAD, ANCHORAGE, AK 99507.*",
    "**Or to the agency that holds the record, if that is a different agency.** The compiled Alaska profile records the rule: a mistaken-identity sealing request under AS 12.62.180(b) goes to the agency that holds the record. The statute is the reason — an agency may seal only the information it is responsible for maintaining — so if a police department holds the record you want sealed, that department is the one that can seal it.",
    "**Nothing is filed with any court on this route**, and there is no case number to obtain."
  ],

  feeAndWaiver: [
    "**No held source states a fee for this application, and this packet asks you to pay nothing.** The committed packet-set manifest says it directly: \"The source review does not state a fee for this application.\" The form prints no amount anywhere on its six pages.",
    "**What the repository does record is that the cost depends on the agency.** The compiled Alaska profile's fee table carries the line for this exact subsection: *\"AS 12.62.180(b) sealing request — Agency-dependent — Written request to the record-holding agency.\"* Agency-dependent means there is no statewide figure to state, not that it is free.",
    "**So ask the office the application is going to.** The Criminal Records and Identification Bureau, 5700 E. Tudor Road, Anchorage, AK 99507 — the address printed on the form's own first page — is the office that answers what, if anything, it charges. Ask before you send if you want certainty.",
    "**One further cost is recorded and is not a fee for this application.** The same profile carries *\"DPS criminal history record — DPS fee — To confirm what records exist\"*, with no amount. You will generally want that record in order to describe the entry you are asking to have sealed. The same Bureau publishes what it charges for it.",
    "**There is no fee waiver.** The manifest records that the source review does not address one, and an agency request is not a court filing, so no filing-fee waiver reaches it."
  ],

  service: [
    "**Nobody is served.** The committed packet-set manifest records it: \"The source review does not state a service requirement.\" There is no opposing party, no certificate of service and no return date, and nothing on the form asks for any.",
    "**Two people do have to receive the application before you send it, and that is not service.** The arresting or citing officer and the prosecutor each have to READ the application and complete their own verification section in PART IV. That is a step you take before the packet is finished, not service of a filed document.",
    "**Send it once, to one office, and keep a full copy.** Keep every attachment you send with it, and use a method that gives you a dated receipt: the form's own instructions warn that incomplete applications will be returned to you indicating what additional information is required."
  ],

  documentsToObtain: [
    ["The arresting or citing officer's completed and signed PART IV section A — the officer, or that officer's superior, states whether they agree beyond a reasonable doubt that the charges resulted from mistaken identity or false accusation", "the arresting agency. The committed manifest records that LegalEase does not obtain or validate it"],
    ["The prosecutor's completed and signed PART IV section B, if the charges were referred to a prosecutor", "the prosecutor's office, or that prosecutor's superior"],
    ["The court documentation the application requires — under PART IV section C, a court order or judgment showing dismissal, acquittal or a finding of not guilty", "the clerk of the court that handled the case"],
    ["If you were convicted: either a court judgment or order overturning the conviction, or a Governor's Pardon — PART IV section D requires one or the other", "the court that overturned it, or the Office of the Governor"],
    ["Your Alaska criminal history record from DPS, so that you can describe the entry accurately", "the Criminal Records and Identification Bureau. The compiled Alaska profile records that a DPS fee applies and states no amount"]
  ],

  steps: [
    "**Read the whole application packet before filling anything in.** That is the form's own first instruction, and it is there because incomplete forms are returned.",
    "**Check that the record originated in Alaska.** The Commissioner cannot seal records from other states or the federal government.",
    "**Check that your case is one of the two PART IV situations**: the charge was dismissed or you were acquitted because it resulted from mistaken identity or false accusation, OR you were convicted and the conviction has been overturned or you have been pardoned for that reason.",
    "**Complete every blank in PART II that the platform left empty**, from your own records. Each is listed in the table below. The form says to fill out ALL items and to write N/A where an item does not apply to you or your case, and not to write in the check boxes.",
    "**Write your explanation in PART III.** It must show, beyond a reasonable doubt, that the charges resulted from mistaken identity or false accusation. If it was mistaken identity, give the name and descriptive information of the person you were mistaken for, if you know it; if it was a false accusation, give the name and descriptive information of the person who made it, if you know it. Use additional sheets if you need them — the form says so.",
    "**Take or send the application to the arresting or citing officer** and ask them, or their superior, to read it and complete and sign PART IV section A.",
    "**If the charges were referred to a prosecutor, do the same for PART IV section B.**",
    "**Attach the court documents** PART IV sections C and D require for your situation.",
    "**Send it to the Chief, Criminal Records and Identification Bureau, 5700 E. Tudor Road, Anchorage, AK 99507**, or to the agency that holds the record if that is a different agency. Keep a full copy and a dated receipt.",
    "**Expect the Bureau to come back to you.** It may ask for more information, including a full set of fingerprints.",
    "**If the decision is adverse, take it to a lawyer.** The appeal under AS 12.62.180(c) is a court appeal in which you bear the burden of showing the agency was clearly mistaken, and it is not an ordinary self-help step."
  ],

  deliberatelyBlank: [
    "**The whole of PART IV.** Sections A and B belong to the arresting or citing officer and to the prosecutor; sections C and D are lists of documents you attach. No part of it is the platform's to complete.",
    "**PART V and PART VI in full.** The form says PART V is completed by the Records and Identification Bureau and PART VI by the Commissioner of Public Safety.",
    "**PART III, your explanation.** It is a statement about your own case that must satisfy a beyond-a-reasonable-doubt standard, and nobody can write it for you.",
    "**NAME OF ARRESTING OFFICER, NAME OF TRIAL COURT and NAME OF APPELLATE COURT.** Each resolves under the shared naming rules to the applicant's own name, so anchoring any of them would print your name where an officer's or a court's belongs.",
    "**Your Social Security number and your Alaska driver's licence or state ID number.** The shared rules refuse a government identifier on any form.",
    "**Every agency name, every agency case number, and the prosecutor's name.** Those are the record's own facts and the platform does not write an agency name onto a form.",
    "**Every disposition date except the arrest and offence dates** — dismissal, acquittal, sentencing, reversal, pardon. The platform holds none of them for this matter."
  ],

  notTold: [
    "**What, if anything, DPS charges for this application.** The compiled profile records the cost as agency-dependent and the manifest records that the source review states no fee. The Criminal Records and Identification Bureau, 5700 E. Tudor Road, Anchorage, AK 99507, is the office that answers it.",
    "**What a DPS criminal history record costs.** The same profile records that a DPS fee applies and states no amount; the same Bureau publishes it.",
    "**How long the Bureau takes**, or whether it will ask you for fingerprints. The form says it may; it sets no timetable.",
    "**Whether the arresting officer or the prosecutor will agree.** That is theirs to decide, and the form provides for both answers."
  ],

  stopConditions: [
    "you cannot get the arresting or citing officer, or the prosecutor, to complete and sign PART IV — the application is not complete without it and nobody can supply it for you;",
    "the record you want sealed did not originate in Alaska — the Commissioner cannot reach another state's or the federal government's records;",
    "the charge was a valid one and what you want is a clean record rather than a correction of a mistake — the compiled profile records that sealing under 12.62.180 is essentially limited to mistaken identity or false accusation proven beyond a reasonable doubt, and is not a route for clearing valid records;",
    "you were convicted and the conviction has NOT been overturned and you have NOT been pardoned — PART IV section D requires one or the other;",
    "the agency decides against you — the appeal under AS 12.62.180(c) is a court appeal in which you carry the burden of showing the agency was clearly mistaken, and it is not a self-help step;",
    "somebody else used your identity and you do not know what else was done in your name;",
    "any immigration question is involved."
  ],

  whatThisIsNot:
    "This is the Alaska Department of Public Safety's own published application, Form Seal Req 2-04, delivered "
    + "as DPS issues it. It is not a court filing, not a petition, not a set-aside after a suspended imposition "
    + "of sentence, not a Courtview exclusion on Form TF-810, and not the administrative appeal that may follow "
    + "an adverse decision. It is not legal advice, it is not sent for you, and it is not a promise that any "
    + "agency will seal anything.",

  receiptDoesNotEstablish: [
    "that this is the current edition of DPS Form Seal Req 2-04, or that the Department has not revised it since the archive was assembled",
    "that any particular Alaska charge resulted from mistaken identity or false accusation",
    "that any officer or prosecutor will complete the PART IV verification"
  ],

  buildFindings: [
    {
      finding:
        "THREE captions on PART II resolve, through the shared printed-label fallback, to "
        + "participant.full_legal_name: NAME OF ARRESTING OFFICER, NAME OF TRIAL COURT and NAME OF APPELLATE "
        + "COURT. On a flat overlay the caption IS the field name, so a builder that anchored any of them would "
        + "print the applicant's own name where an officer's or a court's belongs. This is the same defect "
        + "family as the Arkansas MONTH blank that took a participant's name into an arrest date.",
      consequence:
        "None is given a fact, so none is anchored and none can be written. Each is declared "
        + "required-before-filing with the reason stated, and the instructions tell the participant why those "
        + "three boxes are empty rather than leaving a reader to guess."
    },
    {
      finding:
        "Two more captions would take the WRONG case number if anchored: POLICE AGENCY CASE # and PROSECUTION "
        + "CASE # both resolve to matter.case_number, which is the TRIAL COURT number the platform holds. The "
        + "police, the prosecutor and the court number the same matter differently.",
      consequence:
        "Only TRIAL COURT CASE # is anchored. The other two are declared required-before-filing, with the "
        + "disclosure saying which number belongs in each."
    },
    {
      finding:
        "DATE CHARGE DISMISSED resolves to matter.charge, not to a date: its caption carries the word CHARGE and "
        + "the charge descriptor requires an explicit mapping rather than refusing outright.",
      consequence:
        "It is not anchored. Anchoring it would have printed the name of the offence into a date box."
    },
    {
      finding:
        "The form carries no AcroForm -- the corpus index records 0 fields -- so there is no widget rectangle to "
        + "write into. PART II is a fully ruled table and its geometry is entirely derivable.",
      consequence:
        "Twenty-eight cells are measured from four strokes each and eight carry a fact. The mailing-address "
        + "cell is 80 points deep because it expects several lines, so its value is placed directly under its "
        + "own caption rather than on the floor of the cell; both rules are still measured and the box is "
        + "recorded as sitting above the cell's own bottom rule."
    },
    {
      finding:
        "FEE_AND_WAIVER, tested against DETERMINATION_FEE_AND_WAIVER_STANDARD A1-A3. The compiled Alaska "
        + "profile is named by the route obligation census as a required source for THIS route, and its fee line "
        + "is keyed to an AS 12.62.180(b) sealing request -- this route's own subsection -- so A3 is satisfied "
        + "rather than strained. What it establishes is that the cost is agency-dependent, which is a real "
        + "answer and not a figure.",
      consequence:
        "The packet states that no held source gives an amount, states that the profile records the cost as "
        + "agency-dependent, and names the Criminal Records and Identification Bureau with the street address "
        + "the form prints on its own first page. It also states the DPS record-check fee the same profile "
        + "records without an amount, and says there is no waiver because there is no filing fee."
    },
    {
      finding:
        "PART IV's I AGREE / I DO NOT AGREE boxes are not the participant's election. They belong to the "
        + "arresting or citing officer and to the prosecutor, each of whom completes and signs their own section.",
      consequence:
        "They are recorded as third-party blanks rather than as participant elections, because a participant "
        + "may not tick either one, and the requirement leads the instructions rather than sitting at the end "
        + "of them: an applicant who cannot obtain those signatures cannot complete this application."
    },
    {
      finding:
        "THE BOUNDARY FIXTURE REFUSES THE MAILING ADDRESS, and that is the correct outcome rather than a "
        + "defect in this family. The boundary participant's address is 94 characters and needs 281.7 points "
        + "at the minimum legible font; the measured cell is 255.72 points wide. The shared flat-overlay path "
        + "writes a single line -- it passes multiline: false -- so the value is refused as unfittable rather "
        + "than drawn over the form or clipped.",
      consequence:
        "Nothing is drawn there in the boundary fixture and reports/actual-writes.json records the refusal "
        + "with the measured width and the width required. The canonical fixture fits at 10 point. WORTH A "
        + "SECOND LOOK BY WHOEVER OWNS THE FLAT-OVERLAY PATH: this cell is 80 points deep because the form "
        + "expects an address over two or three lines, and a multiline write would fit where a single-line "
        + "one cannot. Changing that is a shared-host change and is not this lane's to make."
    }
  ],

  counselQuestions: [
    "PART II is filled with eight facts and the rest left to the applicant, on a form whose own instruction is to fill out ALL items and write N/A where an item does not apply. Confirm that a part-filled PART II with every remaining blank disclosed is right, or direct that the form ship empty.",
    "The mailing-address value is placed under its caption rather than on the floor of an 80-point cell. Confirm on the raster that the placement reads correctly.",
    "The packet leads with the officer and prosecutor verification requirement and tells an applicant who cannot obtain it to stop. Confirm that is the right prominence for it.",
    "The packet states the cost as agency-dependent from the compiled profile and names the Bureau. Confirm, or supply a figure.",
    "The six-page application includes PART V and PART VI, which the Bureau and the Commissioner complete. Confirm that delivering the agency's own internal pages inside a participant packet is appropriate."
  ],

  reviewersAttention: [
    "Three PART II captions would take the applicant's own name if anchored. None is. Please check the raster shows all three empty: NAME OF ARRESTING OFFICER, NAME OF TRIAL COURT, NAME OF APPELLATE COURT.",
    "Every write box is measured from the form's own strokes; the measurement basis is recorded per cell in production-field-map.json under measuredCells, including which rule and which divider bounded it.",
    "PART IV, PART V and PART VI are deliberately untouched in full. PART IV belongs to two people who are not the applicant.",
    "The single most important participant-facing statement in this family is that an applicant who cannot get an officer's and a prosecutor's signature cannot file at all.",
    "The BOUNDARY fixture deliberately carries no mailing address: at 94 characters it does not fit the measured cell on one line and is refused rather than clipped. The canonical fixture shows the cell filled."
  ],

  composedBody() {
    throw new Error("this family composes no pages: its only component is the DPS application");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const writes = [
      h.write("full_name", "PART II - FULL NAME (Last) (First) (Middle) (Suffix)", "participant.full_legal_name", 3),
      h.write("mailing_address", "PART II - MAILING ADDRESS", "participant.street_address", 3),
      h.write("phone_numbers", "PART II - PHONE NUMBER(S)", "participant.phone", 3),
      h.write("date_of_birth", "PART II - DATE OF BIRTH", "participant.date_of_birth", 3),
      h.write("trial_court_case_number", "PART II - TRIAL COURT CASE #", "matter.case_number", 3),
      h.write("date_of_arrest", "PART II - DATE OF ARREST", "matter.arrest_date", 3),
      h.write("date_of_offense", "PART II - DATE OF OFFENSE", "matter.offense_date", 3),
      h.write("name_of_offenses", "PART II - NAME OF OFFENSE(S)", "matter.charge", 3)
    ];
    const refusals = [
      h.rbf("former_or_other_names", "PART II - FORMER OR OTHER NAMES/ALIASES",
        "any prior name, nickname or alias your records might be held under; write N/A if there are none",
        "the platform holds no alias fact, and writing the legal name here would assert an alias that may not exist", 3),
      h.rbf("social_security_number", "PART II - SOCIAL SECURITY #",
        "your Social Security number, as the form asks",
        "the shared semantics refuse a government identifier on any form", 3),
      h.rbf("drivers_license_or_state_id", "PART II - ALASKA DRIVERS LICENSE # OR STATE ID #",
        "your Alaska driver's licence or state ID number",
        "the shared semantics refuse a government identifier on any form", 3),
      h.rbf("arrest_tracking_number", "PART II - ARREST TRACKING NUMBER",
        "the ATN, from your arrest paperwork or your DPS criminal history record; write N/A if you do not have one",
        "the ATN is assigned by the agency when an arrest is processed and identifies it through a system the platform has no knowledge of", 3),
      h.rbf("police_agency_case_number", "PART II - POLICE AGENCY CASE #",
        "the POLICE department's own case number, which is not the court's number. The platform holds the trial court number and writes that one, three rows below",
        "this caption resolves to the same fact as the trial court's case number, so anchoring it would print the court's number where the police department's belongs", 3),
      h.rbf("name_of_arresting_agency", "PART II - NAME OF ARRESTING AGENCY",
        "the name of the agency that arrested or cited you",
        "the shared semantics refuse an agency name on any form, so the platform cannot write one here whatever it holds", 3),
      h.rbf("name_of_arresting_officer", "PART II - NAME OF ARRESTING OFFICER",
        "the name of the officer who arrested or cited you - the same officer whose signature PART IV section A needs",
        "this caption resolves under the shared naming rules to the APPLICANT'S OWN NAME, so it is never anchored: writing here would print your name where the officer's belongs", 3),
      h.rbf("prosecution_case_number", "PART II - PROSECUTION CASE #",
        "the PROSECUTOR's own case number, which is not the court's number and not the police department's",
        "this caption resolves to the same fact as the trial court's case number, so anchoring it would print the court's number where the prosecutor's belongs", 3),
      h.rbf("name_of_prosecuting_agency", "PART II - NAME OF PROSECUTING AGENCY",
        "the name of the office that prosecuted, or would have prosecuted, the case; write N/A if the charges were never referred",
        "the shared semantics refuse an agency name on any form", 3),
      h.rbf("name_of_prosecutor", "PART II - NAME OF PROSECUTOR",
        "the name of the prosecutor - the same person whose signature PART IV section B needs if charges were referred",
        "a prosecutor's name is a court-and-prosecutor fact the platform does not hold", 3),
      h.rbf("name_of_trial_court", "PART II - NAME OF TRIAL COURT",
        "the name of the court that handled the case",
        "this caption resolves under the shared naming rules to the APPLICANT'S OWN NAME, so it is never anchored: writing here would print your name where the court's belongs", 3),
      h.rbf("appellate_court_case_number", "PART II - APPELLATE COURT CASE #",
        "the APPELLATE court's case number, if there was an appeal; write N/A if there was not",
        "an appellate number is a different number from the trial court's, and the platform holds only the trial court's", 3),
      h.rbf("name_of_appellate_court", "PART II - NAME OF APPELLATE COURT",
        "the name of the appellate court, if there was an appeal; write N/A if there was not",
        "this caption resolves under the shared naming rules to the APPLICANT'S OWN NAME, so it is never anchored", 3),
      h.rbf("charge_statute_or_ordinance", "PART II - CHARGE(S): STATUTE/ORDINANCE # (e.g., AS 11.46.120)",
        "the Alaska statute or ordinance number of the charge, from your paperwork or your DPS record; the name of the offence beside it is already filled",
        "the platform holds the name of the offence and holds no statute-section fact for it", 3),
      h.rbf("date_charge_dismissed", "PART II - DATE CHARGE DISMISSED",
        "the date the charge was dismissed, if it was; write N/A if it was not",
        "this caption carries the word CHARGE and resolves to the name of the offence rather than to a date, so anchoring it would print an offence name into a date box; and the platform holds no dismissal date for this matter", 3),
      h.rbf("agency_that_dismissed", "PART II - AGENCY THAT DISMISSED",
        "the agency or court that dismissed the charge, if it was dismissed",
        "the shared semantics refuse an agency name on any form", 3),
      h.rbf("date_acquitted", "PART II - DATE ACQUITTED",
        "the date you were acquitted, if you were; write N/A if you were not",
        "the platform holds no acquittal date for this matter", 3),
      h.rbf("date_sentenced", "PART II - DATE SENTENCED",
        "the date you were sentenced, if you were; write N/A if you were not",
        "the platform holds no sentencing date for this matter", 3),
      h.rbf("date_conviction_reversed_or_vacated", "PART II - DATE CONVICTION REVERSED OR VACATED",
        "the date the conviction was reversed or vacated, if it was - PART IV section D requires the court order that did it",
        "the platform holds no reversal date for this matter", 3),
      h.rbf("date_pardoned", "PART II - DATE PARDONED",
        "the date you were pardoned, if you were - PART IV section D requires the Governor's Pardon itself",
        "the platform holds no pardon fact for this matter", 3),
      h.rbf("part_iii_explanation", "PART III - explanation of mistaken identity or false accusation",
        "your own account of the circumstances, which must show beyond a reasonable doubt that the charge(s) resulted from mistaken identity or false accusation. If it was mistaken identity, give the name and description of the person you were mistaken for, if known; if it was a false accusation, give the name and description of the person who made it, if known. Use additional sheets if you need them",
        "this is a sworn narrative to a beyond-a-reasonable-doubt standard about the participant's own case, and nobody can write it for them", 4),
      h.agencyBlank("part_iv_a_officer_agreement", "PART IV section A - the arresting or citing officer's I AGREE / I DO NOT AGREE statement",
        "the arresting or citing officer, or that officer's superior, completes and signs this section personally; it is not the applicant's to tick and not the platform's to fill", 5),
      h.agencyBlank("part_iv_a_officer_comments", "PART IV section A - the officer's COMMENTS",
        "the officer's own words", 5),
      h.agencyBlank("part_iv_a_officer_name_title", "PART IV section A - NAME/TITLE (PRINTED)",
        "the officer identifies themselves", 5),
      h.agencyBlank("part_iv_a_officer_signature", "PART IV section A - SIGNATURE",
        "the officer signs their own statement", 5),
      h.agencyBlank("part_iv_a_officer_agency_phone_date", "PART IV section A - AGENCY, PHONE NUMBER and DATE",
        "the officer's own agency, telephone number and the date they sign", 5),
      h.agencyBlank("part_iv_b_prosecutor_agreement", "PART IV section B - the prosecutor's I AGREE / I DO NOT AGREE statement",
        "the prosecutor to whom the charges were referred, or that prosecutor's superior, completes and signs this section personally", 5),
      h.agencyBlank("part_iv_b_prosecutor_comments", "PART IV section B - the prosecutor's COMMENTS",
        "the prosecutor's own words", 5),
      h.agencyBlank("part_iv_b_prosecutor_name_title", "PART IV section B - NAME/TITLE (PRINTED)",
        "the prosecutor identifies themselves", 5),
      h.agencyBlank("part_iv_b_prosecutor_signature", "PART IV section B - SIGNATURE",
        "the prosecutor signs their own statement", 5),
      h.agencyBlank("part_iv_b_prosecutor_agency_phone_date", "PART IV section B - AGENCY, PHONE NUMBER and DATE",
        "the prosecutor's own office, telephone number and the date they sign", 5),
      h.agencyBlank("part_v_bureau_block", "PART V - to be completed by the Records and Identification Bureau",
        "the form says so on its own face: APSIN #, FBI # and every verification line in PART V are the Bureau's", 6),
      h.agencyBlank("part_vi_commissioner_block", "PART VI - to be completed by the Commissioner of Public Safety",
        "the form says PART VI will be completed by the Commissioner and the packet returned to the applicant showing the decision", 6)
    ];
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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
