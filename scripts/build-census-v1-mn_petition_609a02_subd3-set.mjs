#!/usr/bin/env node
// Route-obligation census v1 — packet family `mn_petition_609a02_subd3-set`.
//
//   node scripts/build-census-v1-mn_petition_609a02_subd3-set.mjs [--check] [--no-raster]
//
// Minnesota, the main participant petition to seal a criminal record under
// Minn. Stat. § 609A.02, subd. 3, filed under § 609A.03. Route
// `obligation:track-pathway:MN:mn_petition_609a02_subd3:petition-based-expungement-under-609a-02-03`.
//
// WHY THIS IS AN OFFICIAL-FORM PACKET AND NOT A COMPOSED PLEADING
//
// MASTER_QUEUE.json records this family's implementationStrategy as
// `custom_pleading`. Three committed legal-design records disagree with it and
// they are the controlling ones:
//
//   * the track registry states outputStrategyDeclared "official_pdf_fill" and
//     gives each of the five packet-set components its own officialFormId —
//     EXP102, EXP104, EXP105, EXP101 and FEE102;
//   * the packet-set manifest carries the identical five-component set;
//   * the registry's own scope restriction settles it in words: "The adopted
//     memorandum classifies this expressly as a statewide official-form packet
//     with EXP102, EXP104 and EXP105 as the core packet. A custom pleading
//     would create service and order-content risk without adding value."
//
// So this builds the official forms. The queue row is not edited — it is a
// shared central artifact and this lane owns none of it — and the discrepancy
// is reported instead, in build-findings.json and in the lane return.
//
// HOW A VALUE GETS ONTO A PAGE HERE
//
// All five documents are FLAT: the committed corpus index records
// acroFieldCount 0 and structuralClassObserved "flat_pdf" for every one, and
// loading each with pdf-lib returns an AcroForm with no fields. There is
// therefore no widget rectangle to write into, and a caption position is not a
// rectangle. Every value this build draws sits on a RULE THE FORM ITSELF DREW:
// the cell is declared by that rule's own y, start x and end x, re-measured
// from the pinned bytes before anything is drawn, and the box ceiling is taken
// from the lowest printed baseline above the rule inside its own span so a
// value can never land on the caption above it. A cell that does not measure
// is geometry drift and stops the family rather than being drawn at a guessed
// rectangle.
//
// WHAT THIS BUILD REFUSES TO DECIDE
//
// Item 9 of EXP102 lists eleven qualification options. Three of them are not
// on this route at all and say so on their own face: two send the reader to
// court form EXP106 under § 609A.02, subd. 1 or 2, and one sends the reader to
// EXP107 under the court's inherent authority. Those three are declared
// NOT_APPLICABLE_ON_THIS_ROUTE against a named route condition.
//
// The other eight ARE subdivision 3, and this route is all of subdivision 3.
// Which one applies is decided by the participant's own disposition and by how
// long ago the sentence was discharged — by the CASE, not by the route — and
// the registry records eight statutory disposition clauses each carrying its
// own waiting-period calculation. This build ticks none of them. Each is
// declared required-before-filing with determinedByTheCaseNotTheRoute and the
// reason the route cannot settle it, and every one is printed in
// participant-instructions.md with the record's own waiting period beside it.
// Ticking a qualification box on a petition sworn under penalty of perjury,
// from facts the platform does not hold, is the thing this factory exists to
// prevent.
//
// A built family is a built family. It is not verified, not approved and not
// sellable, and this builder issues no verdict on its own packets.
const FAMILY_ID = "mn_petition_609a02_subd3-set";
const ROUTE_KEY = "obligation:track-pathway:MN:mn_petition_609a02_subd3:petition-based-expungement-under-609a-02-03";

const PETITION = "mn_petition_609a02_subd3-primary-filing-1";
const PROOF_OF_SERVICE = "mn_petition_609a02_subd3-certificate-of-service-2";
const PROPOSED_ORDER = "mn_petition_609a02_subd3-proposed-order-3";
const INSTRUCTION_SHEET = "mn_petition_609a02_subd3-instructions-4";
const FEE_WAIVER = "mn_petition_609a02_subd3-fee-waiver-5";

/* The eight subdivision-3 qualification clauses of EXP102 item 9, in the order
 * the form prints them, each with the waiting period the committed track
 * registry records for it. The reason for this table is that the participant
 * must choose among them and the packet may not choose for them: it is printed
 * into the instructions and into the field map from one place, so the two
 * cannot drift apart. */
const SUBD3_CLAUSES = [
  { id: "qualification_resolved_in_favor", letter: "c", page: 4,
    printed: "A criminal matter was resolved your favor.",
    wait: "The registry records the waiting period for a proceeding resolved in the petitioner's favour as \"As specified by the applicable statutory clause\"." },
  { id: "qualification_diversion_or_stay", letter: "d", page: 4,
    printed: "You successfully completed the terms of a diversion program or stay of adjudication, and you have not been charged with a new crime for at least one year since completion of the diversion program or stay of adjudication.",
    wait: "The registry records this waiting period as 1 year: \"Diversion or stay of adjudication, with the charge dismissed and one year since discharge without a new crime\"." },
  { id: "qualification_petty_or_misdemeanor", letter: "e", page: 4,
    printed: "You were convicted of a petty misdemeanor or misdemeanor, or the sentence imposed was within the limits provided by law for a misdemeanor, and you have not been convicted of a new crime for at least two years since discharge of the sentence for the crime.",
    wait: "The registry records this waiting period as 2 years: \"Petty misdemeanour or misdemeanour conviction, with two years since discharge of the sentence without a new crime\"." },
  { id: "qualification_gross_misdemeanor", letter: "f", page: 4,
    printed: "You were convicted of a gross misdemeanor, or the sentence imposed was within the limits provided by law for a gross misdemeanor, and you have not been convicted of a new crime for at least three years since discharge of the sentence for the crime.",
    wait: "The registry records this waiting period as 3 years: \"Gross misdemeanour conviction, with three years since discharge of the sentence without a new crime\"." },
  { id: "qualification_gross_misdemeanor_deemed_misdemeanor", letter: "g", page: 4,
    printed: "You were convicted of a gross misdemeanor that is deemed to be for a misdemeanor pursuant to Minn. Stat. § 609.13, subd. 2(2), and you have not been convicted of a new crime for at least three years since discharge of the sentence for the crime.",
    wait: "The registry records three years for a gross misdemeanour conviction. Whether § 609.13, subd. 2(2) applies to your sentence is a legal characterisation of your own record." },
  { id: "qualification_felony_152_025", letter: "h", page: 4,
    printed: "You were convicted of a felony violation of Minn. Stat. § 152.025, and you have not been convicted of a new crime for at least four years since discharge of the sentence for the crime.",
    wait: "The registry records four years for an enumerated felony conviction: \"Enumerated felony conviction, with four years since discharge of the sentence without a new crime\"." },
  { id: "qualification_felony_deemed_lesser", letter: "i", page: 5,
    printed: "You were convicted of a felony that is deemed to be for a gross misdemeanor or misdemeanor pursuant to Minn. Stat. § 609.13, subd. 1(2), and have not been convicted of a new crime for at least four years since discharge of the sentence for the crime if the conviction was for an offense listed in Minn. Stat. § 609A.02, subd. 3(b); or five years since discharge of the sentence for the crime if the conviction was for any other offense.",
    wait: "The form itself states the two periods: four years where the conviction was for an offence listed in § 609A.02, subd. 3(b), and five years for any other offence." },
  { id: "qualification_felony_listed_in_subd_3b", letter: "j", page: 5,
    printed: "You were convicted of a felony violation of an offense listed in Minn. Stat. § 609A.02, subd. 3(b), and have not been convicted of a new crime for at least four years since discharge of the sentence for the crime.",
    wait: "The registry records four years for an enumerated felony conviction." }
];

const WHY_THE_ROUTE_CANNOT_DETERMINE_THE_CLAUSE =
  "This family serves the whole of Minn. Stat. § 609A.02, subd. 3, and the committed track registry records "
  + "EIGHT statutory disposition clauses under it, each with its own waiting-period calculation. Which clause "
  + "applies is decided by how this particular case ended and by how long ago the sentence was discharged - "
  + "facts of the record, not facts of the route. The route settles that the petition proceeds under "
  + "subdivision 3 and asks for the EXP105 order, and the packet states that on its own face; it does not "
  + "settle which of subdivision 3's clauses the petitioner qualifies under, and this petition is sworn under "
  + "penalty of perjury under Minn. Stat. § 358.116.";

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  buildScript: "scripts/build-census-v1-mn_petition_609a02_subd3-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading",
  jurisdiction: "MN",
  custodyClass: "SOURCE_ALREADY_HELD",
  implementationStrategy: "official_pdf_fill",
  assembledPacketRole: "assembled_packet_of_official_minnesota_court_forms",
  legalName: "Petition for Expungement of Certain Criminal Proceedings under Minn. Stat. § 609A.02, subd. 3",
  routeName: "petitioning a Minnesota district court to seal a criminal record under Minn. Stat. § 609A.02, subd. 3",
  statutes: ["Minn. Stat. § 609A.02, subd. 3", "Minn. Stat. § 609A.02, subd. 4", "Minn. Stat. § 609A.03", "Minn. Stat. § 358.116"],
  routes: [{ routeKey: ROUTE_KEY }],

  records: [
    {
      recordId: "legal-design-track-registry:mn_petition_609a02_subd3",
      path: "data/record-clearing/legal-design-track-registry.json",
      role: "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, fee-waiver, notice and service rules, its required generation inputs, its manual completion items, its packet instructions, its scope restrictions and its self-help stop conditions",
      mustContain: [
        "\"trackId\": \"mn_petition_609a02_subd3\"",
        "Petition for Expungement of Certain Criminal Proceedings under Minn. Stat. § 609A.02, subd. 3",
        "The district court in the county where the case was decided.",
        "District court administrator in the county of the case",
        "File EXP102 with the district court administrator in the county where the case was decided, with the applicable supporting forms.",
        "A district court filing fee applies unless a statutory fee waiver or a granted FEE102 waiver applies.",
        "FEE102 Affidavit to Request Fee Waiver, with FEE103 where the court requests further detail.",
        "The prosecuting authority and each agency holding records receive notice and may object. The court holds a hearing.",
        "The participant serves the agencies and the prosecuting authority and files EXP104 as proof.",
        "Required where the form calls for a notarised signature.",
        "The adopted memorandum classifies this expressly as a statewide official-form packet with EXP102, EXP104 and EXP105 as the core packet.",
        "Do not generate EXP103.",
        "Run the automatic routes first.",
        "Agency service addresses are looked up by the participant before service and inserted into the service list.",
        "The predatory-offender registration bar under § 609A.02, subd. 4.",
        "Diversion or stay of adjudication, with the charge dismissed and one year since discharge without a new crime",
        "Petty misdemeanour or misdemeanour conviction, with two years since discharge of the sentence without a new crime",
        "Gross misdemeanour conviction, with three years since discharge of the sentence without a new crime",
        "Enumerated felony conviction, with four years since discharge of the sentence without a new crime",
        "The prosecuting authority or an agency objects.",
        "Predatory-offender registration is required.",
        "The participant advances a crime-victim nexus theory."
      ]
    },
    {
      recordId: "legal-design-packet-set-manifests:mn_petition_609a02_subd3-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role: "the committed packet-set manifest: the five components of this packet, the official form assigned to each, which of them is conditional, and the participant actions the record requires before filing",
      mustContain: [
        "\"packetSetId\": \"mn_petition_609a02_subd3-set\"",
        "\"componentId\": \"mn_petition_609a02_subd3-primary-filing-1\"",
        "\"componentId\": \"mn_petition_609a02_subd3-certificate-of-service-2\"",
        "\"componentId\": \"mn_petition_609a02_subd3-proposed-order-3\"",
        "\"componentId\": \"mn_petition_609a02_subd3-instructions-4\"",
        "\"componentId\": \"mn_petition_609a02_subd3-fee-waiver-5\"",
        "Where the participant cannot pay the filing fee and no statutory waiver applies."
      ]
    },
    {
      recordId: "route-obligation-census:mn_petition_609a02_subd3",
      path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      role: "the committed route-obligation census: the exact route key this family serves",
      mustContain: [ROUTE_KEY]
    }
  ],

  /* Every one bound by exact SHA-256 through the committed corpus index, which
   * is queried BY DIGEST rather than by form number or by filename: a name-based
   * lookup has returned the wrong file in this factory before. Each is flat -
   * acroFieldCount 0, structuralClassObserved "flat_pdf" in the index - so every
   * write is a measured overlay onto a rule the form drew. */
  officialComponents: {
    [PETITION]: {
      sourceId: "official-form:EXP102",
      documentId: "EXP102",
      formNumber: "EXP102",
      officialTitle: "Notice of Hearing and Petition for Expungement (EXP102)",
      revision: "REV-2024-07",
      instrumentKind: "primary_filing",
      sha256: "c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541",
      acroform: false
    },
    [PROOF_OF_SERVICE]: {
      sourceId: "official-form:EXP104",
      documentId: "EXP104",
      formNumber: "EXP104",
      officialTitle: "Proof of Service (EXP104)",
      revision: "REV-2025-01",
      instrumentKind: "certificate_of_service",
      sha256: "0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c",
      acroform: false
    },
    [PROPOSED_ORDER]: {
      sourceId: "official-form:EXP105",
      documentId: "EXP105",
      formNumber: "EXP105",
      officialTitle: "Order Concerning Sealing/Expunging of Records (EXP105), Minn. Stat. § 609A.02, subd. 3",
      revision: "REV-2024-07",
      instrumentKind: "proposed_order",
      sha256: "754cd7a55b07409fe8752906d38dcccc45ab6a13cda5a3d7d061a689b837b4a0",
      acroform: false
    },
    [INSTRUCTION_SHEET]: {
      sourceId: "official-form:EXP101",
      documentId: "EXP101",
      formNumber: "EXP101",
      officialTitle: "Instructions for Expungement (EXP101)",
      revision: "REV-2024-07",
      instrumentKind: "instructions",
      sha256: "0ccdc99ec3cbb86300b00f5d93bf724d795541d426709f4e97708119d1b1c5de",
      acroform: false
    },
    [FEE_WAIVER]: {
      sourceId: "official-form:FEE102",
      documentId: "FEE102",
      formNumber: "FEE102",
      officialTitle: "Affidavit to Request Fee Waiver (FEE102), Minn. Stat. § 563.01",
      revision: "REV-2024-07",
      instrumentKind: "fee_waiver",
      sha256: "b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8",
      acroform: false
    }
  },

  /* ---- the measured cells ------------------------------------------------------
   * Every entry names a rule this form drew, by its own y, start x and end x as
   * read from the page content stream of the pinned bytes. `fact` is set only
   * where the platform holds the value AND the shared binder resolves this
   * caption to that value. A cell whose rule is not found at those coordinates
   * in the pinned bytes is geometry drift and stops the family.
   *
   * EXP101 has no cells at all: it is the court's seven-page instruction sheet
   * and is delivered exactly as Minnesota publishes it.
   */
  officialCells: {
    [PETITION]: [
      { key: "caption_defendant", page: 1, ruleY: 535.2, ruleFromX: 72, ruleToX: 270.4,
        label: "Defendant", fact: "participant.full_legal_name" },
      { key: "name_first", page: 2, ruleY: 648, ruleFromX: 135.2, ruleToX: 540,
        label: "First name", fact: "participant.first_name" },
      { key: "name_middle", page: 2, ruleY: 624.8, ruleFromX: 148, ruleToX: 540,
        label: "Middle name", fact: "participant.middle_name" },
      { key: "name_last", page: 2, ruleY: 600.8, ruleFromX: 133.6, ruleToX: 540,
        label: "Last name", fact: "participant.last_name" },
      { key: "date_of_birth", page: 2, ruleY: 521.6, ruleFromX: 201.6, ruleToX: 540,
        label: "Date of birth", fact: "participant.date_of_birth" },
      { key: "current_street_address", page: 2, ruleY: 473.6, ruleFromX: 204.8, ruleToX: 540,
        label: "Street Address", fact: "participant.street_address" },
      { key: "current_city_state_zip", page: 2, ruleY: 450.4, ruleFromX: 202.4, ruleToX: 540,
        label: "City, State, Zip", fact: "participant.city_state_zip" },
      { key: "declaration_printed_name", page: 6, ruleY: 129.6, ruleFromX: 282.4, ruleToX: 540,
        label: "Printed name", fact: "participant.full_legal_name" },
      { key: "declaration_address", page: 6, ruleY: 114.4, ruleFromX: 292.8, ruleToX: 540,
        label: "Address", fact: "participant.street_address" },
      { key: "declaration_city_state_zip", page: 6, ruleY: 99.2, ruleFromX: 316, ruleToX: 540,
        label: "City/State/Zip", fact: "participant.city_state_zip" },
      { key: "declaration_phone", page: 6, ruleY: 84, ruleFromX: 285.6, ruleToX: 540,
        label: "Phone", fact: "participant.phone" },
      { key: "declaration_email", page: 6, ruleY: 68.8, ruleFromX: 277.6, ruleToX: 540,
        label: "Email", fact: "participant.email" }
    ],
    [PROOF_OF_SERVICE]: [
      { key: "caption_defendant", page: 1, ruleY: 578.64, ruleFromX: 67.56, ruleToX: 283.56,
        label: "Defendant", fact: "participant.full_legal_name" }
    ],
    [PROPOSED_ORDER]: [
      { key: "caption_defendant", page: 1, ruleY: 560, ruleFromX: 72, ruleToX: 288,
        label: "Defendant", fact: "participant.full_legal_name", captionOnly: true },
      { key: "caption_date_of_birth", page: 1, ruleY: 521.6, ruleFromX: 140, ruleToX: 288,
        label: "Date of Birth", fact: "participant.date_of_birth", captionOnly: true }
    ],
    [FEE_WAIVER]: [
      { key: "caption_defendant_respondent", page: 1, ruleY: 545.4, ruleFromX: 72, ruleToX: 270,
        label: "Defendant", fact: "participant.full_legal_name" },
      { key: "declaration_printed_name", page: 6, ruleY: 397.44, ruleFromX: 106.98, ruleToX: 432,
        label: "Printed name", fact: "participant.full_legal_name" },
      { key: "declaration_address", page: 6, ruleY: 381.66, ruleFromX: 117, ruleToX: 432,
        label: "Address", fact: "participant.street_address" },
      { key: "declaration_city_state_zip", page: 6, ruleY: 365.82, ruleFromX: 147.9, ruleToX: 432,
        label: "City, State, Zip", fact: "participant.city_state_zip" },
      { key: "declaration_phone", page: 6, ruleY: 350.04, ruleFromX: 109.02, ruleToX: 432,
        label: "Phone", fact: "participant.phone" },
      { key: "declaration_email", page: 6, ruleY: 334.26, ruleFromX: 104.64, ruleToX: 432,
        label: "Email", fact: "participant.email" }
    ]
  },

  components: [PETITION, PROOF_OF_SERVICE, PROPOSED_ORDER, INSTRUCTION_SHEET, FEE_WAIVER],
  componentTitles: {
    [PETITION]: "EXP102 — Notice of Hearing and Petition for Expungement",
    [PROOF_OF_SERVICE]: "EXP104 — Proof of Service",
    [PROPOSED_ORDER]: "EXP105 — Order Concerning Sealing/Expunging of Records",
    [INSTRUCTION_SHEET]: "EXP101 — Instructions for Expungement",
    [FEE_WAIVER]: "FEE102 — Affidavit to Request Fee Waiver"
  },
  componentConditions: {
    [FEE_WAIVER]: "Where the participant cannot pay the filing fee and no statutory waiver applies."
  },
  componentDescriptions: {
    [PETITION]: "the petition itself and the notice of hearing that goes on top of it — the caption, your name and address, your criminal record, the qualification clause you rely on, the offence you want sealed, the victim and no-contact-order questions, your rehabilitation and the mitigating and aggravating factors, and the declaration you sign under penalty of perjury",
    [PROOF_OF_SERVICE]: "the proof of service you file AFTER you have mailed the papers, with the fifteen-box service list of the agencies and the prosecuting authority",
    [PROPOSED_ORDER]: "the order you give the court to sign — every finding, every election and the signature on it are the judge's, and none of them is yours or this platform's",
    [INSTRUCTION_SHEET]: "the Minnesota Judicial Branch's own seven-page instructions for this petition, delivered exactly as it publishes them",
    [FEE_WAIVER]: "the affidavit that asks the court to waive the filing fee, if you cannot pay it"
  },

  fixtures: {
    canonical: {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.first_name": "Jordan",
      "participant.middle_name": "Avery",
      "participant.last_name": "Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Larkspur Street",
      "participant.city_state_zip": "Duluth, MN 55802",
      "participant.phone": "218-555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    boundary: {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.first_name": "Maria-Alejandra",
      "participant.middle_name": "Bernadette-Consuelo",
      "participant.last_name": "O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B",
      "participant.city_state_zip": "Fort Saint Clairsville, MN 56501-2214",
      "participant.phone": "(218) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },

  composedFromNote: null,

  formIdentityNote:
    "All five documents are the Minnesota Judicial Branch's own published forms — EXP102, EXP104, EXP105, "
    + "EXP101 and FEE102 — each bound by exact SHA-256 through the committed corpus index, resolved BY DIGEST "
    + "rather than by form number or filename, and delivered as Minnesota publishes them. Nothing is composed, "
    + "substituted or invented, and EXP103 is deliberately absent: the committed track registry instructs "
    + "\"Do not generate EXP103. It is a prosecutor and court-side victim-notice form, not a participant packet "
    + "component.\"",

  agencyTreatmentNote: null,

  routeSelectionNote:
    "The ROUTE is stated on the face of the packet three times over: EXP102's title block prints \"Minn. Stat. "
    + "§ 609A.03 or Inherent Authority\" and the packet carries the subdivision-3 order, EXP105, whose own title "
    + "block prints \"Minn. Stat. § 609A.02, subd. 3\"; and the three item-9 options that are NOT subdivision 3 "
    + "are declared not applicable on this route against a named condition, each of them directing the reader to "
    + "a different court form (EXP106 for subdivision 1 or 2, EXP107 for the court's inherent authority). What "
    + "the route does not decide, and what this build therefore does not tick, is WHICH of subdivision 3's eight "
    + "clauses the petitioner qualifies under: the registry records eight clauses each with its own waiting "
    + "period, and the answer is a fact of the case rather than of the route.",

  routeSelectionsMade: [
    {
      selection: "statutory route",
      value: "Minn. Stat. § 609A.02, subd. 3, petitioned under § 609A.03",
      determinedBy:
        "the committed route-obligation census route key "
        + "obligation:track-pathway:MN:mn_petition_609a02_subd3:petition-based-expungement-under-609a-02-03, "
        + "and the packet-set manifest's assignment of EXP105 - the subdivision 3 order - as the proposed order"
    },
    {
      selection: "instrument set",
      value: "EXP102 petition, EXP104 proof of service, EXP105 proposed order, EXP101 instructions, FEE102 fee waiver where the participant cannot pay",
      determinedBy:
        "the committed packet-set manifest's five components and their officialFormIds, and the registry's scope "
        + "restriction: \"The adopted memorandum classifies this expressly as a statewide official-form packet "
        + "with EXP102, EXP104 and EXP105 as the core packet.\""
    }
  ],

  instructionsHeading: "What to do — petitioning a Minnesota district court to seal your record under Minn. Stat. § 609A.02, subd. 3",

  instructionsIntro: [
    "This packet is the Minnesota Judicial Branch's own forms, filled in with what the platform holds about you and left blank everywhere it does not.",
    "**Before you pay for anything, check whether an automatic route already covers you.** The committed record's first packet instruction for this route is: \"Run the automatic routes first. A participant already covered by Clean Slate, automatic cannabis expungement or a Cannabis Expungement Board action should not pay for a petition.\"",
    "The platform filled in your name, your date of birth, your address, your telephone number and your email, on each form that asks for them. Every fact about your case — the county, the court file number, the charges, the dates, which statutory clause you qualify under — is yours to fill from the record itself, never from memory.",
    "**Get your own records first.** The committed record makes this a required step before filing: \"Request your own criminal history from the BCA and look your cases up on Minnesota Court Records Online. LegalEase never collects, inspects or authenticates them.\" Item 7 of the petition requires the FULL record of all your convictions and charges, from Minnesota and from any other state, federal court or foreign country."
  ],

  whoDecides: [
    "A judge of the district court, after a hearing. The committed record: \"The prosecuting authority and each agency holding records receive notice and may object. The court holds a hearing.\"",
    "EXP102's own printed notice sets the objection window: \"Notice to Law Enforcement / Government Agency / Prosecutor: Any objection to an expungement in this case shall be filed with the court as soon as possible, and within 60 days.\"",
    "EXP105 carries the burden-of-proof branch. Where you were CONVICTED — subdivision 3(a)(3)-(8) — the court must find that you established by clear and convincing evidence that expunging the record benefits you commensurately with the disadvantages to the public and the burden on the court."
  ],

  filingDestination: [
    "The district court administrator in the county of the case. Venue, as the committed record records it: \"The district court in the county where the case was decided.\"",
    "Filing, in the record's own words: \"File EXP102 with the district court administrator in the county where the case was decided, with the applicable supporting forms. Serve the agencies holding the records and the prosecuting authority, then file EXP104 as proof of service.\""
  ],

  feeAndWaiver: [
    "The committed record states the fee rule and does not state a figure: \"A district court filing fee applies unless a statutory fee waiver or a granted FEE102 waiver applies.\" Ask the district court administrator in the county of your case what it charges before you go.",
    "The waiver, in the record's own words: \"FEE102 Affidavit to Request Fee Waiver, with FEE103 where the court requests further detail. A statutory fee waiver applies to certain petitions.\" FEE102 is in this packet. FEE103 is not, and you only need it if the court asks for more detail.",
    "FEE102 is marked CONFIDENTIAL on every page. It is a financial affidavit sworn under penalty of perjury and none of what it asks for is held by the platform."
  ],

  service: [
    "You serve, and you serve BEFORE you file EXP104: \"The participant serves the agencies and the prosecuting authority and files EXP104 as proof.\"",
    "The service list is EXP104's fifteen numbered boxes. SIX of them are marked (Required) on the form itself and you serve all six: box 1 MN Bureau of Criminal Apprehension, box 2 Office of the MN Attorney General, box 3 MN Dept. of Corrections, box 4 ______ County Attorney's Office, box 5 ______ County Dept. of Corrections (Probation), and box 6 ______ County Sheriff's Office. Box 4 is the prosecuting authority, and the committed record requires it be served. Boxes 1, 2 and 3 already carry their addresses printed on the form; boxes 4, 5 and 6 are Required but print blank rules, so you write in the county and the address yourself.",
    "The other NINE boxes -- 7 ______ Police Dept., 8 ______ City Attorney's Office (Prosecutor), 9 MN Dept. of Human Services / Office of Inspector General, 10 MN Dept. of Health, 11 MN Dept. of Natural Resources, 12 MN Driver and Vehicle Services, 13 MN State Patrol, and the two unlabelled boxes 14 and 15 -- each print \"(check box & use if related to your case)\". Those you check and complete only where they hold records from your case. Note that the MN Department of Human Services / Office of Inspector General is box 9 and is one of these nine, not one of the six Required.",
    "The addresses that are NOT printed are yours to look up. The committed record makes this an instruction rather than a blocker: \"Agency service addresses are looked up by the participant before service and inserted into the service list. An instruction, not a generation blocker.\"",
    "**Nothing on EXP104 is filled in by this platform except the caption.** A proof of service certifies a mailing that has not happened yet, and the person who mails the papers is not known until they are mailed. Sign and date it after you have mailed, never before.",
    "Notarization, as the record records it: \"Required where the form calls for a notarised signature.\" EXP102's declaration is signed under penalty of perjury under Minn. Stat. § 358.116 rather than notarised; check any form the court hands you locally."
  ],

  documentsToObtain: [
    ["Your own Minnesota criminal history from the Bureau of Criminal Apprehension", "Request it from the BCA. You need it for item 7, which requires the full record of every conviction and charge. The platform never collects, inspects or authenticates it."],
    ["Your case history from Minnesota Court Records Online (MCRO)", "Look your cases up on MCRO. The committed record makes checking your court file number against it a required step before filing."],
    ["Copies of any Order for Protection, Restraining Order or No-Contact Order", "From the court that issued it. EXP102 item 12 says in its own words: \"[Include copies of any orders with this Petition.]\""],
    ["Proof of your household income, if you are asking for a fee waiver", "FEE102 says: \"Examples of proof include most recent tax returns, pay stubs of all household members with income, etc.\""]
  ],

  steps: [
    "**Check the automatic routes first.** If Clean Slate, automatic cannabis expungement or the Cannabis Expungement Board already covers your case, you should not be paying for a petition at all.",
    "**Get your BCA criminal history and your MCRO case history**, and check the court file number on them against what you write in the caption.",
    "**Fill every blank listed in the table below**, on the form and page it names, from those records — never from memory.",
    "**Choose your qualification clause at item 9 of EXP102 yourself.** The eight subdivision-3 clauses and the waiting period the record gives for each are listed below. This packet ticks none of them, because which one applies is a fact of your case and this petition is sworn under penalty of perjury.",
    "**Ask the district court administrator in the county of your case what the filing fee is.** If you cannot pay it, fill in FEE102 and file it with the petition.",
    "**File EXP102, the proposed order EXP105, and FEE102 if you are using it, with the district court administrator in the county where the case was decided.** Ask the administrator for the hearing date, time and courtroom, and for the Zoom details if the hearing is remote, and write them onto the Hearing Information block on page 1 of EXP102 before you serve anybody.",
    "**Serve the agencies and the prosecuting authority** with the notice of hearing, the petition and the proposed order.",
    "**Only then** complete, sign, date and file EXP104 as proof of the service you have actually carried out.",
    "**Leave every page and every block that belongs to the judge blank.** All of EXP105 below the caption is the court's."
  ],

  deliberatelyBlank: [
    "**Your signature and the date beside it, on EXP102 and on FEE102.** A signature is yours alone and a date written before you sign would be false. Both are sworn under penalty of perjury under Minn. Stat. § 358.116.",
    "**Everything on EXP104 except the caption.** It certifies a mailing that has not happened, and the person who mails the papers is not known until they are mailed.",
    "**Every finding, every election and the signature on EXP105.** It is a PROPOSED order: the findings are the judge's to make and the order is the judge's to sign. This platform writes nothing on it but the caption.",
    "**Every qualification box at item 9 of EXP102.** See the section above on choosing your clause.",
    "**The Hearing Information block on page 1 of EXP102.** The court sets the hearing; you write in what it gives you before you serve anyone."
  ],

  notTold: [
    "Which of subdivision 3's eight clauses you qualify under. The record establishes the eight clauses and their waiting periods; it does not establish which one fits your case, and the platform holds no disposition or discharge date for you.",
    "Whether the § 609A.02, subd. 4 predatory-offender registration bar applies to you. The committed record names it as an exclusion and asks the question; it is not answered here.",
    "What the district court filing fee is. The committed record states that a fee applies and states no figure.",
    "Whether the court will grant the petition. Where you were convicted, EXP105 requires the court to find that you established a clear-and-convincing case, and no packet can establish that for you."
  ],

  stopConditions: [
    "The prosecuting authority or an agency objects.",
    "The court sets a contested hearing.",
    "The disposition is disputed.",
    "Predatory-offender registration is required.",
    "Crime-of-violence or firearm issues arise.",
    "The participant advances a crime-victim nexus theory.",
    "Immigration consequences are in play.",
    "Specially protected agencies are involved.",
    "The participant asks for individualized legal advocacy."
  ],

  whatThisIsNot:
    "This is a set of the Minnesota Judicial Branch's own forms, filled in with what the platform holds and left "
    + "blank everywhere it does not. It is not legal advice, it is not filed for you, it does not choose your "
    + "statutory clause, and it does not decide whether the court will grant what it asks for. Note what EXP105 "
    + "itself says even after an order is signed: \"This order is stayed for 60 days, during any appeal, and "
    + "until any remaining restitution or other financial obligation on the case is paid in full. Records will "
    + "not be sealed until after this time.\"",

  receiptDoesNotEstablish: [
    "that any record meets any clause of Minn. Stat. § 609A.02, subd. 3",
    "that the § 609A.02, subd. 4 predatory-offender registration bar does or does not apply",
    "that any agency named on the EXP104 service list is the right agency for this case"
  ],

  buildFindings: [
    {
      finding:
        "MASTER_QUEUE.json records this family's implementationStrategy as `custom_pleading`. The committed "
        + "legal-design track registry records outputStrategyDeclared `official_pdf_fill`, gives all five "
        + "packet-set components an officialFormId, and carries an express scope restriction: \"The adopted "
        + "memorandum classifies this expressly as a statewide official-form packet with EXP102, EXP104 and "
        + "EXP105 as the core packet. A custom pleading would create service and order-content risk without "
        + "adding value.\" The packet-set manifest agrees with the registry.",
      consequence:
        "The packet was built as an official-form packet, which is what the controlling records require. "
        + "MASTER_QUEUE.json was NOT edited - it is a shared central artifact and this lane owns none of it - so "
        + "the queue row and the overlay directory name still carry the word `custom-pleading` while the field "
        + "map, the source receipt and the build status all record official_pdf_fill. The Captain owns the "
        + "reconciliation."
    },
    {
      finding:
        "All five official forms are FLAT. The committed corpus index records acroFieldCount 0 and "
        + "structuralClassObserved \"flat_pdf\" for every one, and loading each with pdf-lib returns an AcroForm "
        + "carrying no fields, so there is no widget rectangle anywhere in this packet.",
      consequence:
        "Every value is drawn onto a rule the form itself drew, declared by that rule's own y, start x and end "
        + "x, re-measured from the pinned bytes at build time, with the box ceiling taken from the lowest "
        + "printed baseline above the rule inside its own span. Twenty-one cells measure; none is a constant "
        + "offset from a caption, and a cell that failed to measure would have stopped the family."
    },
    {
      finding:
        "EXP102 item 9 offers eleven qualification options. Three of them are not on this route and say so on "
        + "their own face - two direct the reader to court form EXP106 under Minn. Stat. § 609A.02, subd. 1 or "
        + "2, and one directs the reader to EXP107 under the court's inherent authority. The remaining eight "
        + "are subdivision 3, which is the whole of this route.",
      consequence:
        "The three off-route options are declared NOT_APPLICABLE_ON_THIS_ROUTE against a named route condition. "
        + "The eight subdivision-3 clauses are declared required-before-filing with "
        + "determinedByTheCaseNotTheRoute, and every one of them is printed in participant-instructions.md with "
        + "the waiting period the committed registry records for it. No box is ticked."
    },
    {
      finding:
        "EXP104 is a proof of service and this packet has not been served. EXP105 is a proposed order and no "
        + "judge has seen it.",
      consequence:
        "Nothing is written on EXP104 but the caption, and nothing on EXP105 but the caption and the date of "
        + "birth. The certificate block, the mailing city, the server's name and every finding, election and "
        + "signature on the order are left blank, and the participant instructions say when each may be "
        + "completed."
    },
    {
      finding:
        "The committed registry instructs \"Do not generate EXP103. It is a prosecutor and court-side "
        + "victim-notice form, not a participant packet component.\"",
      consequence: "EXP103 is absent from the packet, from the component set and from the source receipt."
    },
    {
      finding:
        "TWO DEFECTS IN THE SHARED BUILD HOST, FOUND BY THIS FAMILY AND FIXED IN THIS FAMILY'S OWN COPY OF IT. "
        + "First, the host's self-count of the nine counters dropped three declared channels on the way to "
        + "classifyBlank: routeConditionThatMakesItInapplicable, determinedByTheCaseNotTheRoute and "
        + "whyTheRouteCannotDetermineIt. Every row using either channel was therefore self-counted as if it had "
        + "declared nothing - eleven rows on EXP102 item 9 alone - while verify-packet-completeness.mjs, which "
        + "forwards all three, reads the identical field map correctly. Second, the host sorted the "
        + "required-before-filing disclosure list alphabetically by field id, which is the exact defect the "
        + "composed-pleading host's own comment warns about; here it printed a sixty-item table with item 16 "
        + "above item 10 and item 9's eight options in the order d, h, i, j, f, g, e, c.",
      consequence:
        "Both are repaired in scripts/build-census-v1-mn_petition_609a02_subd3-set.mjs, which this family owns "
        + "exclusively. NOTHING was changed in any other family's script and no shared file was touched, so no "
        + "other family's bytes move. Both defects are still present in the host this family copied "
        + "(scripts/build-census-v1-ak-mistaken-identity-set.mjs) and in any other family copied from it: the "
        + "first can only report defects a family does not have, and the second reorders a participant-facing "
        + "disclosure table. That is a finding for the Captain, not a change this lane may make."
    }
  ],

  counselQuestions: [
    "Item 9's eight subdivision-3 clauses are left for the participant with the registry's waiting periods printed beside them. Confirm that leaving the clause unticked is preferable to a runtime that selects it from a held disposition, and confirm the waiting-period wording carried into the instructions.",
    "FEE102's caption plaintiff line and case-type line are left blank with the exact text to write given in the instructions, rather than written from EXP102's own printed caption. Confirm which the reviewer prefers.",
    "The § 609A.02, subd. 4 predatory-offender registration bar is carried to the participant as a question and a stop condition and is not screened for here. Confirm that placement.",
    "The packet delivers FEE102 unconditionally in both fixtures although the manifest marks it conditional. Confirm that shipping the waiver affidavit to every participant is preferable to omitting it from packets where no waiver is sought."
  ],

  reviewersAttention: [
    "Every write box is measured from the form's own rule strokes; the basis is recorded per cell in production-field-map.json under measuredCells, including the exact rule y, start x and end x that bounded it.",
    "Please check the raster shows EXP105 carrying ONLY a defendant name and a date of birth in its caption, and nothing anywhere else on its four pages.",
    "Please check the raster shows EXP104 carrying ONLY a defendant name in its caption, and no ink anywhere in the fifteen-box service list or the declaration block.",
    "Item 7's criminal-record table on EXP102 page 3 is declared as SIX row-level required-before-filing blanks rather than as thirty-six individual cells. Each row entry names all six columns the row asks for. That is a deliberate granularity choice and it is stated here rather than left to be discovered.",
    "The BOUNDARY fixture carries a 56-character email address and a 52-character street address to exercise the fitter on the narrowest declaration lines; the canonical fixture shows ordinary values.",
    "EXP101, the court's instruction sheet, is delivered with no writes at all and is declared with no blanks: it is reference material, not a filing blank.",
    "Two labels on EXP105 were rewritten during this build and the reason is worth checking. \"...whether the agency has or has not established...\" and \"...send a copy to each affected agency\" both classified as AGENCY_FACT, because the shared contract refuses the court-owned refusal class on an agency field - correctly, since an arresting agency name is a participant fact. Neither of these blanks holds an agency name: one is the court's has/has-not election on a subd. 5(b) finding and the other is the order paragraph directing the court administrator. The labels now name the blank rather than the sentence around it, and the full printed sentence is carried in each row's `why` so nothing is lost.",
    "Four EXP102 elections were relabelled for the same kind of reason: their labels ended \"- Yes or No\", which matches the contract's ROUTE_ELECTION pattern written for California CR-180's Penal Code § 17 wobbler cells. Items 8, 11, 14 and 15 are participant questions, not route elections. Each label is now the form's own printed question."
  ],

  composedBody() {
    throw new Error("this family composes no pages: all five components are official Minnesota court forms");
  },

  /* ---- field maps ------------------------------------------------------------- */
  mapFor(componentId, h) {
    const notOnThisRoute = (id, label, condition, why, page) => ({
      ...h.optional(id, label, why, page),
      isSelectionControl: true, kind: "selection_control",
      reason: `not applicable on this route: ${condition}`,
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable: condition,
      routeDetermined: false
    });
    const caseDetermined = (id, label, what, why, page) => ({
      ...h.rbf(id, label, what, why, page),
      isSelectionControl: true, kind: "selection_control",
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: WHY_THE_ROUTE_CANNOT_DETERMINE_THE_CLAUSE
    });

    if (componentId === PETITION) {
      const writes = [
        h.write("caption_defendant", "Defendant, on the caption of the petition", "participant.full_legal_name", 1),
        h.write("name_first", "Item 1 first name", "participant.first_name", 2),
        h.write("name_middle", "Item 1 middle name", "participant.middle_name", 2),
        h.write("name_last", "Item 1 last name", "participant.last_name", 2),
        h.write("date_of_birth", "Item 3 date of birth", "participant.date_of_birth", 2),
        h.write("current_street_address", "Item 4 current street address", "participant.street_address", 2),
        h.write("current_city_state_zip", "Item 4 current city, state, zip", "participant.city_state_zip", 2),
        h.write("declaration_printed_name", "Declaration block printed name", "participant.full_legal_name", 6),
        h.write("declaration_address", "Declaration block address", "participant.street_address", 6),
        h.write("declaration_city_state_zip", "Declaration block city, state, zip", "participant.city_state_zip", 6),
        h.write("declaration_phone", "Declaration block phone", "participant.phone", 6),
        h.write("declaration_email", "Declaration block email", "participant.email", 6)
      ];
      const refusals = [
        h.rbf("caption_county", "Caption - County of",
          "the Minnesota county whose district court decided the case, which is the county you file in",
          "the platform holds no county for this matter; the committed registry records venue as \"The district court in the county where the case was decided\" and does not choose a county for you", 1),
        h.rbf("caption_court_file_number", "Caption - Court File Number",
          "the court file number of the criminal case you want sealed, taken from your MCRO case history and checked against your BCA record",
          "the committed record makes this a fact the participant confirms against their own records before filing, and the platform holds no court file number", 1),
        h.rbf("caption_judicial_district", "Caption - Judicial District",
          "the judicial district of that county's district court; the court administrator will tell you if you are not sure",
          "the platform holds no judicial district for this matter", 1),
        h.agencyBlank("hearing_date", "Hearing Information - the hearing date the court sets",
          "the court sets the hearing; the committed record records this as \"Supplied by the court after filing. Left as clear blanks with instructions.\"", 1),
        h.agencyBlank("hearing_time", "Hearing Information - the hearing time and whether it is a.m. or p.m.",
          "the court sets the hearing time", 1),
        h.agencyBlank("hearing_format", "Hearing Information - whether the hearing is remote using Zoom or in person",
          "the court decides how it will hear the matter", 1),
        h.agencyBlank("hearing_zoom_meeting_id", "Hearing Information - Zoom meeting ID",
          "the court issues its own Zoom credentials", 1),
        h.agencyBlank("hearing_zoom_passcode", "Hearing Information - Zoom passcode",
          "the court issues its own Zoom credentials", 1),
        h.agencyBlank("hearing_courthouse_address", "Hearing Information - courthouse address",
          "the court states where it will sit", 1),
        h.agencyBlank("hearing_courtroom_number", "Hearing Information - courtroom number",
          "the court assigns the courtroom", 1),
        h.rbf("other_names_or_aliases", "Item 2 other legal names or aliases",
          "every other legal name or alias you have been known by; write None if there are none",
          "the platform holds one legal name and writing it here would assert an alias that may not exist", 2),
        h.rbf("prior_addresses", "Item 5 all other addresses you have lived at since the date of the offense",
          "the street address, city and state of every other place you have lived since the date of the offence - or tick the box on the form if you have only ever lived at the address in item 4",
          "the platform holds one current address and no address history", 2),
        h.rbf("reasons_for_this_request", "Item 6 reasons for this request",
          "why you are asking for an expungement. The form requires three things in this answer: whether you are asking for employment, housing or licensure reasons; the statutory or other legal authority you are seeking expungement under; and why an expungement should be granted, with specific details",
          "this is a sworn narrative about the participant's own life and nobody can write it for them", 2),
        ...[1, 2, 3, 4, 5, 6].map((n) => h.rbf(`criminal_record_row_${n}`, `Item 7 criminal record table - row ${n}`,
          "for this row: the Case #, the County-State, the Type of Charge, whether it was a Conviction Yes/No, the Date of Offense, and the Date of Conviction if Yes. Item 7 requires the FULL record of all your convictions for misdemeanors, gross misdemeanors or felonies and all your criminal charges, including those continued for dismissal, stayed for adjudication or subject to pretrial diversion, from Minnesota and from any other state, federal court or foreign country - and all pending charges. Add another sheet if six rows are not enough",
          "the platform holds no criminal-record history for this participant, and item 7 is sworn under penalty of perjury", 3)),
        h.election("past_requests_yes_no", "Item 8 past requests - have you ever asked for an expungement, pardon, or sealing of a criminal record before",
          "only the participant knows whether they have asked before, and the route does not determine it", 3),
        h.rbf("past_requests_detail", "Item 8 list of each earlier expungement, pardon or sealing request",
          "if you answered Yes at item 8, each earlier request for an expungement, pardon or sealing of a criminal record that you have made, whether it was granted or not",
          "the platform holds no history of earlier requests", 3),
        notOnThisRoute("qualification_152_18_discharge", "Item 9 qualification option (a) - controlled substance case dismissed and discharged under Minn. Stat. § 152.18",
          "this packet is built for the Minn. Stat. § 609A.02, subd. 3 petition route and carries the subdivision 3 order, EXP105. Option (a) is the subdivision 1 or 2 branch, and the form's own bracket directs the reader to a different order: \"[Use Order Concerning Sealing/Expunging of Record - Minn. Stat. § 609A.02, subd. 1 or 2 (court form EXP106).]\"",
          "an option whose own printed text sends the reader to EXP106 under subdivisions 1 or 2 is not on the subdivision 3 route this packet is built for", 4),
        notOnThisRoute("qualification_certified_as_adult_for_juvenile_crime", "Item 9 qualification option (b) - certified or referenced for prosecution as an adult for a crime committed as a juvenile",
          "this packet is built for the Minn. Stat. § 609A.02, subd. 3 petition route and carries the subdivision 3 order, EXP105. Option (b) is the subdivision 1 or 2 branch, and the form's own bracket directs the reader to a different order: \"[Use Order Concerning Sealing/Expunging of Record - Minn. Stat. § 609A.02, subd. 1 or 2 (court form EXP106).]\"",
          "an option whose own printed text sends the reader to EXP106 under subdivisions 1 or 2 is not on the subdivision 3 route this packet is built for", 4),
        ...SUBD3_CLAUSES.map((c) => caseDetermined(c.id,
          `Item 9 qualification option (${c.letter}) - Minn. Stat. § 609A.02, subd. 3`,
          `tick this option only if it is true of your case. The form states it as: "${c.printed}" ${c.wait}`,
          "the platform holds no disposition, no sentence-discharge date and no new-conviction history for this participant, so it cannot know which subdivision 3 clause applies",
          c.page)),
        notOnThisRoute("qualification_inherent_authority", "Item 9 qualification option (k) - the offence does not qualify under subd. 3 but you believe you have rehabilitated yourself",
          "this packet is built for the Minn. Stat. § 609A.02, subd. 3 petition route and carries the subdivision 3 order, EXP105. Option (k) is the court's inherent authority, and the form's own bracket directs the reader to a different order: \"[Use Findings of Fact, Conclusions of Law and Order to Seal/Expunge Judicial Records Only (court form EXP107).]\"",
          "an option whose own printed text sends the reader to EXP107 under the court's inherent authority is not on the subdivision 3 statutory route this packet is built for", 5),
        h.rbf("offense_case_number", "Item 10 offence details - Case #",
          "the court file number of the offence you want expunged, from your MCRO case history",
          "the platform holds no case number for this matter", 5),
        h.rbf("offense_jurisdiction_city", "Item 10 offence details - Jurisdiction/City where the offense occurred",
          "the jurisdiction or city where the offence happened",
          "the platform holds no offence location for this matter", 5),
        h.rbf("offense_type", "Item 10 offence details - Type of offense",
          "the offence you want expunged, worded as it appears on your court record",
          "the platform holds no charge for this matter, and wording an offence differently from the record is how a petition gets denied", 5),
        h.rbf("offense_date", "Item 10 offence details - Date of offense",
          "the date the offence happened, from your court record",
          "the platform holds no offence date for this matter", 5),
        h.election("victims_yes_no", "Item 11 victims - were there any identifiable victims in this case",
          "whether the case had identifiable victims is a fact of the record and a legal characterisation the participant makes; the route does not determine it", 5),
        h.rbf("victim_names", "Item 11 names of the victims",
          "if you answered Yes at item 11, the names of the victims",
          "the platform holds no victim identity for this matter, and it would never write one", 5),
        h.election("protection_order_election", "Item 12 - is there now, or has there ever been, an Order for Protection, Restraining Order or other No-Contact Order prohibiting you from contacting the victims",
          "only the participant knows, and the form's own Yes branch requires copies of the orders to be included with the petition; the route does not determine it", 5),
        h.rbf("personal_rehabilitation", "Item 13 personal rehabilitation",
          "what steps you have taken since the time of the offence toward personal rehabilitation, including treatment, work, or other personal history that demonstrates rehabilitation",
          "this is a sworn narrative about the participant's own life and nobody can write it for them", 5),
        h.election("seal_private_data_election", "Item 14 - do you want to ask the court to seal any private or confidential data submitted by the responding jurisdictions",
          "a request the participant chooses to make or not make under Minn. Stat. § 609A.03, subd. 3(d); the route does not determine it", 6),
        h.election("confirmation_letter_election", "Item 15 - do you want each recipient of the order to send you a letter confirming receipt and that the record has been expunged",
          "a request the participant chooses to make or not make under Minn. Stat. § 609A.03, subd. 8(b); the route does not determine it", 6),
        h.rbf("mitigating_or_aggravating_factors", "Item 16 mitigating or aggravating factors",
          "any mitigating or aggravating factors relating to the underlying crime, including your level of participation, the context and circumstances of the crime, and what risk, if any, you pose to individuals or society",
          "this is a sworn narrative about the participant's own case and nobody can write it for them", 6),
        h.protectedBlank("declaration_date", "Declaration block date beside the signature",
          "a date written before the document is signed would be false; the declaration is sworn under penalty of perjury under Minn. Stat. § 358.116", 6),
        h.protectedBlank("declaration_signature", "Declaration block signature",
          "the participant signs personally; this build never signs for anyone", 6),
        h.rbf("declaration_county_and_state_where_signed", "Declaration block county and state where signed",
          "the county and state you are physically in when you sign the petition",
          "where the participant is standing when they sign is not known until they sign, and Minn. Stat. § 358.116 makes it part of the sworn declaration", 6)
      ];
      return { writes, refusals };
    }

    if (componentId === PROOF_OF_SERVICE) {
      const writes = [
        h.write("caption_defendant", "Defendant, on the caption of the proof of service", "participant.full_legal_name", 1)
      ];
      const refusals = [
        h.rbf("caption_county", "Caption - County", "the same county as the caption of the petition", "the platform holds no county for this matter", 1),
        h.rbf("caption_judicial_district", "Caption - Judicial District", "the same judicial district as the caption of the petition", "the platform holds no judicial district for this matter", 1),
        h.rbf("caption_court_file_number", "Caption - Court File Number", "the same court file number as the caption of the petition", "the platform holds no court file number for this matter", 1),
        h.protectedBlank("server_name", "Name of the person who mailed the documents",
          "this certifies a mailing that has not happened; who mails the papers is not known until they are mailed, and this build never completes a certificate of service before service", 1),
        h.protectedBlank("service_date", "Date the documents were served",
          "a service date written before service would be false", 1),
        h.protectedBlank("mailing_city", "The city in which the envelopes were put in the U.S. Mail",
          "where the envelopes were posted is not known until they are posted", 1),
        h.election("service_list_selection", "Service list - which of the fifteen boxes are checked",
          "the form marks six boxes (Required) -- 1 MN Bureau of Criminal Apprehension, 2 Office of the MN Attorney General, 3 MN Dept. of Corrections, 4 ______ County Attorney's Office, 5 ______ County Dept. of Corrections (Probation) and 6 ______ County Sheriff's Office -- and all six are served; the remaining nine, boxes 7 to 15, each say \"check box & use if related to your case\", and which of those agencies hold records from a particular case is the participant's to determine", 1),
        h.rbf("service_county_attorney", "Service list box 4 - ______ County Attorney's Office name and address",
          "the county attorney's office that prosecuted the case, and its address. This is box 4, it is marked (Required) on the form, and it is the prosecuting authority the committed record requires you to serve",
          "the committed record records agency service addresses as looked up by the participant before service", 1),
        h.rbf("service_county_corrections", "Service list box 5 - ______ County Dept. of Corrections (Probation) name and address",
          "the county whose Department of Corrections (Probation) holds records from your case, and its address, looked up before you serve. Box 5 is marked (Required) on the form",
          "the committed record records agency service addresses as looked up by the participant before service; the platform holds none of them", 1),
        h.rbf("service_county_sheriff", "Service list box 6 - ______ County Sheriff's Office name and address",
          "the county sheriff's office that holds records from your case, and its address. Box 6 is marked (Required) on the form",
          "the committed record records agency service addresses as looked up by the participant before service", 1),
        h.rbf("service_police_department", "Service list box 7 - ______ Police Dept. name and address",
          "the police department that holds records from your case, and its address. Box 7 is one of the conditional boxes -- \"check box & use if related to your case\" -- not one of the six marked (Required)",
          "the committed record records agency service addresses as looked up by the participant before service", 1),
        h.rbf("service_city_attorney", "Service list box 8 - ______ City Attorney's Office (Prosecutor) name and address",
          "the city attorney's office that prosecuted the case, if a city attorney rather than a county attorney did, and its address. This is box 8 and it is one of the conditional boxes -- \"check box & use if related to your case\" -- not one of the six marked (Required)",
          "the committed record records agency service addresses as looked up by the participant before service", 1),
        h.rbf("service_additional_agency_14", "Service list box 14 - additional agency name and address",
          "any further agency that holds records from your case, with its address; leave it empty if there is none. Boxes 14 and 15 are the only two boxes on the whole service list with no agency printed in them",
          "the platform holds no list of the agencies that hold records from this case", 2),
        h.rbf("service_additional_agency_15", "Service list box 15 - additional agency name and address",
          "any further agency that holds records from your case, with its address; leave it empty if there is none. Boxes 14 and 15 are the only two boxes on the whole service list with no agency printed in them",
          "the platform holds no list of the agencies that hold records from this case", 2),
        h.protectedBlank("certificate_date", "Certificate block - Date", "a certificate of mailing may not be dated before the mailing", 2),
        h.protectedBlank("certificate_signature", "Certificate block - Signature (person who mailed the papers)", "the person who mails the papers signs personally, after mailing", 2),
        h.protectedBlank("certificate_printed_name", "Certificate block - Printed Name", "the person who mails the papers identifies themselves; who that is is not known until the papers are mailed", 2),
        h.protectedBlank("certificate_county_and_state_where_signed", "Certificate block - County and state where signed", "part of a declaration under Minn. Stat. § 358.116 that has not been made yet", 2),
        h.protectedBlank("certificate_address", "Certificate block - Address", "the address of the person who mailed the papers, who is not known until they are mailed", 2),
        h.protectedBlank("certificate_city_state_zip", "Certificate block - City/State/Zip", "the address of the person who mailed the papers, who is not known until they are mailed", 2),
        h.protectedBlank("certificate_telephone", "Certificate block - Telephone", "the telephone number of the person who mailed the papers, who is not known until they are mailed", 2)
      ];
      return { writes, refusals };
    }

    if (componentId === PROPOSED_ORDER) {
      const writes = [
        h.write("caption_defendant", "Defendant, on the caption of the proposed order", "participant.full_legal_name", 1),
        h.write("caption_date_of_birth", "Caption - Date of Birth", "participant.date_of_birth", 1)
      ];
      const refusals = [
        h.rbf("caption_county", "Caption - County of", "the same county as the caption of the petition", "the platform holds no county for this matter", 1),
        h.rbf("caption_court_file_number", "Caption - Court File Number", "the same court file number as the caption of the petition", "the platform holds no court file number for this matter", 1),
        h.rbf("caption_judicial_district", "Caption - Judicial District", "the same judicial district as the caption of the petition", "the platform holds no judicial district for this matter", 1),
        h.agencyBlank("consideration_date", "The date the Court considered the Petition", "the court states when it considered the petition", 1),
        h.agencyBlank("appearances_block", "Appearances were - the Petitioner, the Prosecuting Authority, Other, or Waived", "the court records who appeared before it", 1),
        h.agencyBlank("finding_1_charges", "Finding 1 - the crime(s) the Petitioner was charged with", "a finding of the court, on the court's own order", 1),
        h.agencyBlank("finding_2_clause_election", "Finding 2 - which clause of Minn. Stat. § 609A.02, subd. 3 the court finds applies", "the clause the court finds is a judicial finding, and this build never makes one", 1),
        h.agencyBlank("finding_2_listed_offense", "Finding 2 - the offense listed in Minn. Stat. § 609A.02, subd. 3(b)", "part of the same judicial finding", 2),
        h.agencyBlank("finding_6_notice_election", "Finding 6 - proper notice has / has not been given, including notice to any victim if required", "whether notice was proper is the court's to find", 2),
        h.agencyBlank("finding_7_clear_and_convincing_election", "Finding 7 - the Petitioner has / has not established by clear and convincing evidence that expunging the record would yield a commensurate benefit", "the burden-of-proof finding under Minn. Stat. § 609A.03, subd. 5(a) is the court's", 2),
        h.agencyBlank("finding_7_reasons", "Finding 7 - the court's reasons", "the court's own words", 2),
        h.agencyBlank("finding_5b_agency_election_and_reasons", "The alternative finding under Minn. Stat. § 609A.03, subd. 5(b) - the court's has / has not election on that finding, and the court's reasons for it", "the election and the reasons are the court's; the printed sentence asks whether the law enforcement agency, government agency or jurisdiction whose records would be affected established by clear and convincing evidence that the interests of the public and public safety outweigh the disadvantages to the Petitioner of not sealing the record", 3),
        h.agencyBlank("finding_8_victim_nexus_election", "Finding 8 - there is / is not a nexus between the criminal record and the Petitioner's status as a crime victim", "a judicial finding; the committed record also makes a crime-victim nexus theory a self-help stop condition", 3),
        h.agencyBlank("order_granted_or_denied_election", "IT IS ORDERED 1 and 2 - whether the request is denied or granted", "the decision is the court's", 3),
        h.agencyBlank("order_3_identification_data_election", "IT IS ORDERED 3 - sealing of fingerprints, photographs and other identification data", "the order is the court's", 3),
        h.agencyBlank("order_4_agencies_election", "IT IS ORDERED 4 - which agencies this order applies to", "which agencies the order binds is the court's to order", 3),
        h.agencyBlank("order_4_agency_write_ins", "IT IS ORDERED 4 - the County Sheriff, County Attorney, Police Dept., City Attorney and Probation/Court Services Dept. name lines", "written on the court's own order, by the court", 3),
        h.agencyBlank("order_5_victim_nexus", "IT IS ORDERED 5 - the crime-victim nexus paragraph restoring the Petitioner to their prior status", "the order is the court's", 4),
        h.agencyBlank("order_6_administrator_distribution", "IT IS ORDERED 6 - the distribution paragraph the court administrator carries out", "the order is the court's and directs its own administrator: the printed paragraph orders the court administrator to send a copy of the expungement order to each agency and jurisdiction whose records are affected, and to send a copy to the Petitioner with notice identifying each recipient", 4),
        h.agencyBlank("order_8_other", "IT IS ORDERED 8 - Other", "the court's own additional terms", 4),
        h.protectedBlank("order_dated", "Dated", "the judge dates the order", 4),
        h.protectedBlank("order_judge_signature", "Judge of District Court signature", "the order is signed by the judge, and this build never signs for anyone", 4)
      ];
      return { writes, refusals };
    }

    if (componentId === INSTRUCTION_SHEET) {
      /* EXP101 is the court's own instruction sheet. It carries no filing blank
       * for anyone, so it carries no map row: it is delivered exactly as
       * Minnesota publishes it and nothing is written on any of its seven
       * pages. */
      return { writes: [], refusals: [] };
    }

    if (componentId === FEE_WAIVER) {
      const writes = [
        h.write("caption_defendant_respondent", "Defendant/Respondent, on the caption of the fee-waiver affidavit", "participant.full_legal_name", 1),
        h.write("declaration_printed_name", "Declaration block name", "participant.full_legal_name", 6),
        h.write("declaration_address", "Declaration block address", "participant.street_address", 6),
        h.write("declaration_city_state_zip", "Declaration block city, state, zip", "participant.city_state_zip", 6),
        h.write("declaration_phone", "Declaration block phone", "participant.phone", 6),
        h.write("declaration_email", "Declaration block email", "participant.email", 6)
      ];
      const refusals = [
        h.rbf("caption_county", "Caption - County of", "the same county as the caption of the petition", "the platform holds no county for this matter", 1),
        h.rbf("caption_court_file_number", "Caption - Court File Number", "the same court file number as the caption of the petition, if the court has assigned one", "the platform holds no court file number for this matter", 1),
        h.rbf("caption_judicial_district", "Caption - Judicial District", "the same judicial district as the caption of the petition", "the platform holds no judicial district for this matter", 1),
        h.rbf("caption_case_type", "Caption - Case Type",
          "write Criminal. The petition form EXP102 prints \"Case Type: Criminal\" in the same caption for this same proceeding",
          "this build does not assert a case caption for a case it has not read; the exact word to write is given to the participant instead", 1),
        h.rbf("caption_plaintiff_petitioner", "Caption - Plaintiff/Petitioner",
          "write State of Minnesota. The petition form EXP102 prints \"State of Minnesota\" as the plaintiff in the same caption for this same proceeding",
          "this build does not assert a case caption for a case it has not read; the exact words to write are given to the participant instead", 1),
        h.election("pleadings_or_copy_fees_election", "Item 2 choose one - I am including my pleadings with this Affidavit, or I only want copy fees waived",
          "which of the two the participant is asking for is theirs to choose", 1),
        h.election("civil_legal_services_election", "Item 3 - the box stating that you have a lawyer through a civil legal services program or volunteer program",
          "whether the participant has a legal-services lawyer is a fact only they hold, and the route does not determine it. If the box is ticked the form tells the reader to skip to the end and sign the last page", 1),
        h.rbf("civil_legal_services_lawyer_name", "Item 3 - the name of your legal-services lawyer",
          "the name of the lawyer you have through a civil legal services program or volunteer program, if you ticked item 3",
          "the platform holds no representation fact for this participant", 1),
        h.rbf("civil_legal_services_lawyer_organisation", "Item 3 - the program your legal-services lawyer works or volunteers for",
          "the program that lawyer works or volunteers for, if you ticked item 3",
          "the platform holds no representation fact for this participant", 1),
        h.rbf("public_assistance", "Item 4 and 5 - whether you receive public assistance, and under which programs",
          "whether you receive public assistance and, if so, which of the programs listed on the form",
          "the platform holds no public-assistance fact for this participant", 2),
        h.rbf("household_members", "Item 5 household members - Name, Age and Relationship to you",
          "each family member or dependant living with you: name, age and relationship",
          "the platform holds no household composition for this participant", 3),
        h.rbf("income_sources_and_amount", "Item 6 - the sources of your income and your total or average monthly income before taxes and deductions",
          "which of the listed sources your income comes from, and your total monthly income - or your average monthly income over the last six months if it varies a lot. The form explains both calculations",
          "the platform holds no income fact for this participant", 3),
        h.rbf("marital_status_and_spouse_income", "Item 7 - whether you are married, separated or getting a divorce, and your spouse's monthly income and its source",
          "your marital status, and if you are married your spouse's total monthly income before taxes and deductions and where it comes from - or why you do not know it",
          "the platform holds no marital or spousal income fact for this participant", 3),
        h.rbf("other_household_income", "Item 8 - other family members or dependants living with you who have income",
          "for each: name, net monthly income and source of income",
          "the platform holds no household income fact for this participant", 4),
        h.rbf("household_yearly_income_and_poverty_line", "Item 9 - your household's total yearly income and whether it is above or below 125% of the Federal Poverty Line for your household size",
          "your household's total yearly income before taxes and deductions, your household size, and whether that income is less or more than 125% of the Federal Poverty Line. The Federal Poverty Guidelines are in the Fee Waiver Instructions (FEE101). If your income is less than 125% of the line the form tells you to skip to the end and sign the last page",
          "the platform holds no income fact for this participant and does not calculate a poverty-line comparison", 4),
        h.rbf("monthly_expenses", "Item 10 - your monthly expenses",
          "rent or mortgage, utilities, food, car payments, car insurance, spousal support, child support, childcare, medical insurance, cell phone and any other expense. The form says to list $0 where you do not have the expense",
          "the platform holds no expense fact for this participant", 5),
        h.rbf("money_and_property", "Items 11 to 13 - the money and property you have",
          "the money and property the form asks you to list, including the house you live in, other real estate and other personal property such as jewelry, stocks and bonds",
          "the platform holds no asset fact for this participant", 5),
        h.rbf("other_reasons", "Item 14 - other reasons why you cannot afford to pay the court fees",
          "unusual medical expenses, emergencies, credit card payments, student loans, reasons the listed money is not available to you, or other circumstances that would help the judicial officer understand your situation",
          "this is a narrative about the participant's own circumstances and nobody can write it for them", 6),
        h.protectedBlank("declaration_date", "Declaration block date beside the signature", "a date written before the document is signed would be false; the affidavit is sworn under penalty of perjury under Minn. Stat. § 358.116", 6),
        h.protectedBlank("declaration_signature", "Declaration block signature", "the participant signs personally; this build never signs for anyone", 6),
        h.rbf("declaration_county_and_state_where_signed", "Declaration block county and state where signed",
          "the county and state you are physically in when you sign the affidavit",
          "where the participant is standing when they sign is not known until they sign", 6)
      ];
      return { writes, refusals };
    }

    throw new Error(`no field map declared for component ${componentId}`);
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
      /*
       * THE THREE DECLARED CHANNELS THIS BUILDER'S OWN COUNT USED TO DROP.
       *
       * `classifyBlank` reaches NOT_APPLICABLE_ON_THIS_ROUTE only when a named
       * `routeConditionThatMakesItInapplicable` arrives, and it reaches
       * REQUIRED_BEFORE_FILING on a selection control only when
       * `determinedByTheCaseNotTheRoute` arrives with the reason beside it.
       * The shared build core this family copied forwarded neither, so every
       * row using either channel was classified here as if it had declared
       * nothing -- eleven of them on EXP102 item 9 alone -- while
       * verify-packet-completeness.mjs, which forwards all three, would read
       * exactly the same field map correctly.
       *
       * That is the same defect the repository verifier's own comments record
       * twice ("this reader has silently dropped a key the contract decides
       * on"), arriving in a builder's self-count instead. A self-count that
       * cannot see a declaration the contract honours reports defects a family
       * does not have, and the temptation is then to reword the packet until
       * the wrong reader agrees. Forwarded verbatim; nothing is decided here.
       */
      ...(Object.hasOwn(r, "routeConditionThatMakesItInapplicable")
        ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null } : {}),
      ...(Object.hasOwn(r, "determinedByTheCaseNotTheRoute")
        ? { determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true } : {}),
      ...(Object.hasOwn(r, "whyTheRouteCannotDetermineIt")
        ? { whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null } : {}),
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

/*
 * The required-before-filing list, IN THE ORDER THE PARTICIPANT MEETS THE
 * BLANKS: component by component, then page by page, then in the order this
 * family declares them on the page.
 *
 * The build host this family copied sorted the second key with
 * `a.field.localeCompare(b.field)`, which is the exact defect the composed
 * host's own comment warns about one lane over: "Sorting these alphabetically
 * would print item C10 above item C2 on a page where they are numbered in
 * sequence." On a one-document family it is nearly invisible. On this one it
 * printed a sixty-item disclosure table with item 16 above item 10, item 2
 * below both, and the eight qualification options of item 9 in the order
 * d, h, i, j, f, g, e, c -- a table a participant reads top to bottom while
 * working through a petition numbered 1 to 16.
 *
 * Page comes before declaration index because the page is the thing the
 * participant is holding. Within a page the declaration order is this family's
 * own, and it follows the printed item numbers.
 */
function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.components.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.documentRole, documentId: m.documentId, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document])
      || ((a.page ?? 0) - (b.page ?? 0))
      || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
}

/*
 * The choices the FORMS make the participant make, which this packet does not
 * make for them -- and, until this repair, did not name either.
 *
 * The mechanism: participantInstructions() prints its per-document tables from
 * requiredBeforeFilingItems(), which selects refusals carrying
 * requiredBeforeFiling === true. h.election() sets requiredBeforeFiling false
 * by design, because an election is not a fact the participant supplies. The
 * consequence was that FEE102 page 1 item 2 -- which the court's own form
 * heads "Choose one:" -- was named nowhere in participant copy at all: the
 * words "pleadings", "copy fee" and "Choose one" returned zero hits in the
 * delivered guide, and the FEE102 table listed items 3 through 14 and the
 * declaration block, every printed item except item 2. The affidavit went out
 * with the choose-one unanswered and the participant untold.
 *
 * No counter sees this. requiredOptionsMissing is computed over the
 * required-before-filing set, and an election is not in it.
 *
 * The lines quoted below are FEE102's own printed words. They are re-read out
 * of the DELIVERED bytes on every build by assertFee102ChooseOneIsPrinted().
 */
const FEE102_CHOOSE_ONE = {
  component: "mn_petition_609a02_subd3-fee-waiver-5",
  field: "pleadings_or_copy_fees_election",
  printed: [
    "2. I believe that I have good reasons for making this request.",
    "Choose one:",
    "I am including my pleadings with this Affidavit (or I have already filed my pleadings but have not yet paid the filing fee).",
    "OR",
    "I only want to have copy fees waived. I do not have any pleadings to file at this time."
  ]
};

/*
 * FEE102's page-1 header points the reader at FEE101, the Fee Waiver
 * Instructions, and this packet does not carry FEE101. Stated so the reader
 * does not go looking through the packet for a form that is not in it.
 */
const FEE_WAIVER_INSTRUCTIONS_FORM = "FEE101";

/*
 * The normalised printed text of one delivered page. The check-box glyphs on
 * these forms are drawn from a symbol font and decode to control codes, so
 * those are replaced by a space before the printed sentences are compared.
 */
function pageTextOf(doc, pageNumber) {
  const page = doc.getPages()[pageNumber - 1];
  assert.ok(page, `the delivered packet has no page ${pageNumber}`);
  return groupIntoLines(extractTextItems(page))
    .map((line) => String(line.text ?? ""))
    .join(" ")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Re-read FEE102's printed choose-one out of the DELIVERED packet, on every
 * fixture, at the packet page the page manifest says FEE102 starts on. A
 * quotation this packet attributes to the court's form must be on the court's
 * form as this packet ships it.
 */
async function assertFee102ChooseOneIsPrinted(artifacts) {
  assert.ok(artifacts.length > 0, "no delivered fixture to read the printed choose-one back out of");
  for (const artifact of artifacts) {
    const entry = (artifact.pageManifest ?? [])
      .find((m) => m.component === FEE102_CHOOSE_ONE.component && m.sourcePage === 1);
    assert.ok(entry, `${artifact.fixture}: the page manifest does not place FEE102 page 1 in the delivered packet`);
    const doc = await PDFDocument.load(fs.readFileSync(path.join(ROOT, artifact.file)), { updateMetadata: false });
    const text = pageTextOf(doc, entry.packetPage);
    for (const line of FEE102_CHOOSE_ONE.printed) {
      assert.ok(text.includes(line),
        `${artifact.fixture} delivered page ${entry.packetPage} does not print the line this guide quotes: ${JSON.stringify(line)}`);
    }
  }
}

function electionsSection(maps) {
  const rows = maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.isSelectionControl === true)
    .map((r) => ({ document: m.documentId ?? m.documentRole, page: r.page, label: r.effectiveLabel, why: r.why })));
  const f = FEE102_CHOOSE_ONE;
  const out = [];
  out.push("## Choices the forms make you make, and this packet has not", "");
  out.push(
    "Every blank in the tables above is a fact you write in. These are different: each is a box a form prints for "
    + "you to TICK. This packet ticks none of them, because the route does not determine them, and they are not in "
    + "those tables because those tables print the items recorded as required before filing and an election is not "
    + "recorded that way. They are still choices the forms make you make.", ""
  );
  out.push("### FEE102 item 2 - the form says choose one", "");
  out.push("FEE102 page 1 prints:", "");
  for (const line of f.printed) out.push(`> ${line}`, "");
  out.push(
    "**Both boxes are blank in this packet, on both fixtures.** Which of the two you tick is recorded in this "
    + "packet's own field map as yours: _\"which of the two the participant is asking for is theirs to choose\"_. "
    + "The affidavit is sworn under penalty of perjury, so tick the one that is true of you, and tick it before you "
    + "sign.", ""
  );
  out.push(
    `The header of that page points you at the Fee Waiver Instructions, ${FEE_WAIVER_INSTRUCTIONS_FORM}. `
    + `${FEE_WAIVER_INSTRUCTIONS_FORM} is **not in this packet** - do not look for it here.`, ""
  );
  out.push("### Every box in this packet that is yours to tick", "");
  out.push("| Document | Page | The box | Why this packet did not tick it |", "| --- | --- | --- | --- |");
  for (const r of rows) out.push(`| ${r.document} | ${r.page} | ${r.label} | ${r.why} |`);
  out.push("");
  return out;
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

  for (const line of electionsSection(maps)) out.push(line);

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

  /*
   * A choice a court form makes the participant make must reach the page the
   * participant reads.
   *
   * Every assertion below fires on the guide this family shipped before this
   * repair: it contained no occurrence of "Choose one", "pleadings" or "copy
   * fee", and no election of any document was named anywhere in it.
   */
  await assertFee102ChooseOneIsPrinted(artifacts);
  for (const line of FEE102_CHOOSE_ONE.printed) {
    assert.ok(instructionsText.includes(line),
      `the guide does not carry the line FEE102 prints: ${JSON.stringify(line)}`);
  }
  const declaredElections = maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.isSelectionControl === true));
  assert.ok(declaredElections.length > 0, "this packet declares no election at all; that is not this family");
  for (const election of declaredElections) {
    assert.ok(instructionsText.includes(election.effectiveLabel),
      `an election the field map records is named nowhere in participant copy: ${election.effectiveLabel}`);
  }
  /*
   * The guide tells the reader FEE101 is not in this packet. Measured against
   * the official document ids actually bound into the delivered fixtures, not
   * against a list that could be empty and make this check unfailable.
   */
  const boundFormIds = Object.values(OFFICIAL).map((o) => o.documentId);
  assert.ok(boundFormIds.length === SPEC.components.length,
    `every component must bind an official form id; ${boundFormIds.length} of ${SPEC.components.length} do`);
  assert.ok(!boundFormIds.includes(FEE_WAIVER_INSTRUCTIONS_FORM),
    `${FEE_WAIVER_INSTRUCTIONS_FORM} is now bound into this packet and the guide still says it is not`);

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
