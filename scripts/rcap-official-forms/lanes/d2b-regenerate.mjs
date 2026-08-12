// Lane D2B — the reviewed mapping table for New Jersey, Florida, Louisiana and
// New Mexico.
//
// D0's typed binder is fail-closed about *categories*: it refuses anything that
// looks like a court, clerk, prosecutor, agency or signature field. It is not,
// and cannot be, fail-closed about *which participant fact* a writable field
// carries, because that is a reading of the document rather than of the field
// name. Reading these four states' binaries field by field showed that the
// difference matters:
//
//   - NJ CN-10557 names its service-recipient blocks `ProsAddr2`, `WardenAddr2`,
//     `ProbAddr2`, `SuperintendentAddr2`, `MuniCrtsAddr2`. None of those names
//     contains "prosecutor", "warden as an agency" or any other token a protect
//     rule matches, so the generic binder offered to write the participant's
//     own street address into the prosecutor's service block.
//   - The same form's `DefAddrSt`, `DefAddrStr`, `DefBirthDt`, `ExpungeCntyName`
//     and `FamDivName` all match `participant.full_legal_name` first, because
//     that descriptor's `\bdef\b` and `\bname\b` alternatives outrank the more
//     specific state, street, date-of-birth and county descriptors.
//   - FL Duval's `CASE NO_2` .. `CASE NO_6` are the same caption case number
//     repeated on six sub-forms, but the trailing `_2`/`_3` reads as a charge
//     row index, so row 2's case number would land on the affidavit.
//   - NM 4-952 offers `Court of Appeals case number(s)` and `Supreme Court case
//     number(s)` blanks that bind `matter.case_number` — the trial court number
//     stated to a court as the appellate one.
//
// So every write in this lane passes two gates. D0 decides first and is never
// bypassed or weakened; then the field or anchor must also appear in the
// reviewed table below, naming the exact fact it carries. A field that D0 would
// write but this table does not name stays blank and is reported with the
// reason. That direction is always safe: the table can only ever subtract.
//
// `explicitMappings` is the sanctioned escape hatch in the other direction, for
// a field D0 refuses as a sensitive fact that first-hand reading shows is a
// safe participant field. It confirms a descriptor D0 already chose; it cannot
// redirect one.

export const LANE = "D2B";
export const FACTORY_VERSION = "d0-remediated-v1";
export const SOURCE_PACK = {
  name: "RCAP_D_D2_SOURCE_PACK.zip",
  releaseTag: "rcap-d-source-packs-2026-08-12",
  sha256: "8f7ef41b7077105dc0bc23e7e3963cff88104004db0745012bf76e6b47c14557",
  manifestSha256: "75fca7a213c26a88992a93ff4547eed8b5e19dfcedc97474f0c3e35182814e88",
  edition: "Expungement_AI_RCAP_Master_Library_Edition_1"
};

export const STATES = [
  { code: "NJ", slug: "new-jersey", name: "New Jersey", profile: "NJ-new-jersey.json" },
  { code: "FL", slug: "florida", name: "Florida", profile: "FL-florida.json" },
  { code: "LA", slug: "louisiana", name: "Louisiana", profile: "LA-louisiana.json" },
  { code: "NM", slug: "new-mexico", name: "New Mexico", profile: "NM-new-mexico.json" }
];

// Document ownership drives what the factory will even consider writing.
export const OWNERSHIP = {
  PARTICIPANT: "participant_completed",
  COURT_ORDER: "court_issued_order",
  AGENCY: "agency_completed",
  PROSECUTOR: "prosecutor_completed",
  INSTRUCTIONS: "instructional_not_a_filing"
};

const CANONICAL_FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.last_name": "Reyes",
  "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "XX",
  "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142",
  "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County",
  "matter.court": "District Court",
  "matter.case_number": "24-CR-001234",
  "matter.citation_number": "C-889201",
  "matter.charge": "Possession of a controlled substance",
  "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08",
  "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15",
  "deterministic.filing_date": "2026-08-12",
  // One charge, so every unused table row must stay blank in the canonical
  // fixture and a row that fills anyway is a visible defect.
  "matter.charges": [
    {
      case_number: "24-CR-001234", citation_number: "C-889201",
      charge: "Possession of a controlled substance",
      arrest_date: "2019-03-08", offense_date: "2019-03-08",
      conviction_date: "2019-11-02", disposition_date: "2020-01-15"
    }
  ]
};

// Values chosen to exceed every widget in this corpus, so the boundary fixture
// exercises shrink-to-fit, multiline wrapping and the readable-floor refusal
// rather than merely re-rendering the canonical one.
const BOUNDARY_FACTS = {
  ...CANONICAL_FACTS,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999",
  "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    {
      case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Possession of a controlled or counterfeit substance, second degree, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08",
      conviction_date: "2019-11-02", disposition_date: "2020-01-15"
    },
    {
      case_number: "0123-45-2026-CR-900124.00", citation_number: "C-889202",
      charge: "Criminal trespass, third degree",
      arrest_date: "2019-05-19", offense_date: "2019-05-19",
      conviction_date: "2019-12-01", disposition_date: "2020-02-03"
    },
    {
      case_number: "0123-45-2026-CR-900125.00", citation_number: "C-889203",
      charge: "Driving while licence suspended",
      arrest_date: "2019-07-27", offense_date: "2019-07-27",
      conviction_date: "2020-01-06", disposition_date: "2020-03-11"
    }
  ]
};

export const FIXTURE_FACTS = {
  canonical: CANONICAL_FACTS,
  boundary: BOUNDARY_FACTS,
  // The negative fixture supplies nothing, so anything that appears in it was
  // not written from a participant fact.
  negative: {}
};

// --- reviewed anchor rules for flat overlay families -------------------------
//
// Each rule names the fact a blank carries and the exact label, drawn by the
// document itself, that identifies it. `before` matches the text between the
// previous blank on that line and this one; `after` matches the text between
// this blank and the next. Matching the *immediate* label rather than the whole
// preceding line is what keeps `City: ____ State: ____ Zip Code: ____` from
// binding the city fact into all three blanks.
//
// `bindLabel` is what the factory is told the anchor is called, and D0 rechecks
// its protect rules against it. It is always text this document draws.
export const REVIEWED_ANCHOR_RULES = [
  {
    factId: "matter.county",
    before: /^(\d{1,2}\s+)?COUNTY OF:?$/i,
    firstBlankOnLine: true,
    bindLabel: "COUNTY OF",
    note: "Caption county of filing. Required to be the first blank on its line, which is what separates the caption's 'COUNTY OF ____' from a notary jurat's 'STATE OF ____ COUNTY OF ____' -- the New Mexico DPS release prints exactly that jurat, and its county blank must stay blank."
  },
  {
    factId: "participant.full_legal_name",
    before: /^(\d{1,2}\s+)?In re$/i,
    captionRoleWithin: 3,
    bindLabel: "In re Petitioner",
    note: "Caption petitioner name. Bound only when the caption block below the blank names the party 'Petitioner.'; the label passed to the binder joins the document's own 'In re' to that role line."
  },
  {
    factId: "participant.full_legal_name",
    before: /^(\d{1,2}\s*)?$/,
    after: /^,?\s*Petitioner\.?$/i,
    bindLabel: "Petitioner",
    note: "Caption petitioner name where the role word follows the blank on the same line."
  },
  {
    factId: "participant.date_of_birth",
    before: /^(\d{1,2}\s+)?Date of Birth:$/i,
    bindLabel: "Date of Birth:",
    note: "Participant date of birth."
  },
  {
    factId: "participant.street_address",
    before: /^(\d{1,2}\s+)?Current Mailing Address:$/i,
    bindLabel: "Current Mailing Address:",
    note: "Participant mailing address."
  },
  {
    factId: "participant.city",
    before: /^(\d{1,2}\s+)?City:$/i,
    bindLabel: "City:",
    note: "Participant city."
  },
  {
    factId: "participant.state",
    before: /^State:$/i,
    bindLabel: "State:",
    note: "Participant state."
  },
  {
    factId: "participant.zip",
    before: /^Zip Code:$/i,
    bindLabel: "Zip Code:",
    note: "Participant postal code."
  },
  {
    factId: "matter.case_number",
    before: /^(\d{1,2}\s+)?District Court case number\(s\):$/i,
    bindLabel: "District Court case number(s):",
    note: "Trial court case number of the record sought to be expunged. Deliberately not extended to the 'Court of Appeals' or 'Supreme Court' blanks on the same form, which the generic binder also offers and which carry different numbers."
  },
  {
    factId: "participant.full_legal_name",
    before: /^NAME:$/,
    bindLabel: "NAME:",
    note: "Louisiana CCRP defendant-information block. The form prints '(Last, First, MI)' beneath it."
  }
];

// Blanks the generic binder offers on these forms and this lane refuses, with
// the reason. Recorded so a reviewer sees the decision rather than an absence.
export const REVIEWED_ANCHOR_REFUSALS = [
  { match: /JUDICIAL DISTRICT COURT/i, reason: "no_fact_carries_the_judicial_district_ordinal",
    detail: "The blank wants an ordinal ('SECOND'); matter.court carries a court name ('District Court'), so binding it would print a false court designation." },
  { match: /Court of Appeals case number|Supreme Court case number/i, reason: "appellate_case_number_is_not_the_trial_case_number" },
  { match: /expungement case numbers/i, reason: "prior_expungement_docket_is_clerk_assigned_and_not_a_participant_fact" },
  { match: /Name of offense|statute\/ordinance number|Name and statute/i, reason: "offense_name_matched_the_full_legal_name_descriptor" },
  { match: /Information about Petitioner:?$/i, reason: "section_heading_not_a_fill_blank" },
  { match: /Printed name of Petitioner|Petitioner Signature|Print Name\)/i, reason: "signature_block_column_caption_not_a_fill_blank" },
  { match: /Home Phone|Work Phone|Cell #/i, reason: "which_phone_is_ambiguous_across_three_blanks" },
  { match: /^No\.?:?$/i, reason: "caption_docket_number_is_clerk_assigned" },
  { match: /Judicial District[.;]?$/i, reason: "body_judicial_district_is_a_service_routing_election" },
  { match: /insert agency name|arresting agency|Law Enforcement Agency/i, reason: "agency_field" },
  { match: /Case name|Court case name|Name of Court/i, reason: "caption_style_field_not_verified_first_hand_for_this_family" },
  { match: /Name of actual offender/i, reason: "outside_party" },
  { match: /Date of filing/i, reason: "filing_date_is_stamped_by_the_clerk_on_these_forms" },
  { match: /sworn|notar|commission expires|\bseal\b|subscribed/i, reason: "notary_jurat_block" }
];

// --- per-family reviewed configuration --------------------------------------
//
// Keyed by `<jurisdiction>:<documentId>:<language>`.
export const FAMILIES = {
  // ---------------------------------------------------------------- NEW JERSEY
  "NJ:CN-10557:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "statewide_expungement_kit_multi_component",
    reviewedFields: {
      // The kit calls the participant the "defendant" throughout.
      DefName: "participant.full_legal_name",
      DefAddrCity: "participant.city",
      DefAddrZip: "participant.zip",
      DefPhone: "participant.phone",
      // Case numbers of the arrests being expunged, supplied by the participant.
      origCaseNums: "matter.case_number"
    },
    heldFields: {
      DefAddrStr: "descriptor_collision: the field name's 'Def' matches participant.full_legal_name ahead of participant.street_address, and an explicit mapping cannot redirect a descriptor D0 already chose",
      DefAddrStr2: "descriptor_collision: same as DefAddrStr",
      DefAddrSt: "descriptor_collision: the state field binds participant.full_legal_name",
      DefBirthDt: "descriptor_collision: the date-of-birth field binds participant.full_legal_name",
      DefAddr2: "address continuation line of unverified meaning; binding the street fact here would duplicate line 1",
      DefAddr3: "address continuation line of unverified meaning",
      ExpungeCntyName: "descriptor_collision: a county dropdown binding participant.full_legal_name",
      SccCntyName: "service recipient (Superior Court Criminal Case Management)",
      ProsCntyName: "service recipient (prosecutor)",
      ProbCntyName: "service recipient (probation)",
      Prob2CntyName: "service recipient (probation)",
      FamDivName: "service recipient (Family Division)",
      IdbCnty: "service recipient",
      ProsAddr2: "service recipient address (prosecutor)",
      ProbAddr2: "service recipient address (probation)",
      Prob2Addr2: "service recipient address (probation)",
      SccAddr2: "service recipient address",
      MuniCrtsAddr2: "service recipient address (municipal courts)",
      WardenAddr2: "service recipient address (warden)",
      SuperintendentAddr2: "service recipient address (superintendent)",
      FamDivAddr2: "service recipient address (Family Division)",
      arrest1CaseNum: "charge table row not indexable from this field name, so every row would receive the same case number",
      arrest2CaseNum: "charge table row not indexable from this field name",
      arrest3CaseNum: "charge table row not indexable from this field name",
      arrest4CaseNum: "charge table row not indexable from this field name",
      arrest5CaseNum: "charge table row not indexable from this field name",
      jdgmntDocket1: "money judgment docket, paired with jdgmntAmt1",
      jdgmntDocket2: "money judgment docket",
      jdgmntDocket3: "money judgment docket",
      fjDocketNums: "final judgment dockets, clerk assigned",
      oweDocket: "outstanding obligation docket, paired with a money field",
      expungDocketNum: "expungement docket, clerk assigned",
      ExpungeDocketNum: "expungement docket, clerk assigned"
    }
  },
  "NJ:BACKGROUND-STEPS:EN": {
    ownership: OWNERSHIP.INSTRUCTIONS,
    componentRole: "participant_instructions_not_a_filing",
    documentAcceptsFill: false,
    reviewedFields: {},
    heldFields: {}
  },

  // ------------------------------------------------------------------- FLORIDA
  "FL:FDLE40-021-EXPUNCTION:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "state_agency_eligibility_application",
    reviewedFields: {},
    heldFields: {}
  },
  "FL:FDLE40-021-SEALING:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "state_agency_eligibility_application",
    reviewedFields: {},
    heldFields: {}
  },
  "FL:FDLE40-026:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "state_agency_eligibility_application",
    reviewedFields: {},
    heldFields: {}
  },
  "FL:FL-4TH-JUDICIAL-CIRCUIT-DUVAL-COUNTY:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "local_circuit_packet_petition_affidavit_and_orders",
    // Two of the six sub-forms in this packet are the judge's orders, and they
    // share one AcroForm with the petitions. Caption-only is therefore applied
    // to the whole binary: every fact this table binds is a caption fact, so
    // nothing is lost and the decretal pages cannot be reached.
    captionOnly: true,
    reviewedFields: {
      Name: "participant.full_legal_name",
      Name_2: "participant.full_legal_name",
      Name_3: "participant.full_legal_name",
      Name_4: "participant.full_legal_name",
      Name_5: "participant.full_legal_name",
      Name_6: "participant.full_legal_name",
      "The Petitioner Name": "participant.full_legal_name",
      "The Petitioner Name_2": "participant.full_legal_name",
      "the petitioner Name": "participant.full_legal_name",
      "the petitioner Name_2": "participant.full_legal_name",
      "whose date of birth is": "participant.date_of_birth",
      "whose date of birth is_2": "participant.date_of_birth",
      "CASE NO": "matter.case_number"
    },
    heldFields: {
      "CASE NO_2": "the trailing _2 reads as a charge row index, so the caption case number repeated on the affidavit would receive charge 2's number",
      "CASE NO_3": "trailing suffix misread as a charge row index",
      "CASE NO_4": "trailing suffix misread as a charge row index",
      "CASE NO_5": "trailing suffix misread as a charge row index",
      "CASE NO_6": "trailing suffix misread as a charge row index",
      "DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 1": "the judge's dating blank on the order",
      "DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 1_2": "the judge's dating blank on the order",
      "DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 2": "the judge's dating blank on the order",
      "DONE AND ORDERED in Chambers at Jacksonville Duval County Florida this 2_2": "the judge's dating blank on the order",
      "of the court concerning the petitioners arrest on the": "arrest date blank matched the full legal name descriptor",
      "records of the court concerning the petitioners arrest on the": "arrest date blank matched the full legal name descriptor"
    }
  },
  "FL:FL-7TH-JUDICIAL-CIRCUIT-ST-JOHNS-COUNTY:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "local_circuit_packet_petition_affidavit_and_orders",
    reviewedFields: {
      DefendantPetitioner: "participant.full_legal_name",
      DefendantPetitioner_2: "participant.full_legal_name",
      DefendantPetitioner_3: "participant.full_legal_name",
      DefendantPetitioner_4: "participant.full_legal_name",
      "The petitioner": "participant.full_legal_name",
      // Page 11's block sits directly beneath "Defendant's Signature", so it is
      // the participant's own contact block rather than counsel's.
      Name: "participant.full_legal_name",
      Address: "participant.street_address",
      "Telephone No": "participant.phone",
      "CASE NO": "matter.case_number"
    },
    heldFields: {
      "CASE NO_2": "trailing suffix misread as a charge row index",
      "CASE NO_3": "trailing suffix misread as a charge row index",
      CityState: "composite city-and-state blank; no single fact carries both",
      "Email Address": "matched the street address descriptor",
      "racesex whose date of birth is": "composite blank carrying race and sex alongside the date of birth",
      "Print type or stamp commissioned name of": "notary name",
      "of St Johns County who will comply with the procedures set forth in section 9430585 Florida": "recites the county in the body of a certification, not a caption county",
      "certain records of the petitioners arrest on 1": "arrest date blank",
      "certain records of the petitioners arrest on 2": "arrest date blank",
      "records of the court concerning the petitioners arrest on": "arrest date blank",
      "date the petitioner": "arrest date blank"
    }
  },

  // ----------------------------------------------------------------- LOUISIANA
  "LA:LA-CCRP-ART-984:EN": {
    ownership: OWNERSHIP.INSTRUCTIONS,
    componentRole: "controlling_statutory_requirements_not_a_filing",
    documentAcceptsFill: false,
    reviewedFields: {}, heldFields: {}
  },
  "LA:LA-CCRP-ART-990:EN": {
    ownership: OWNERSHIP.AGENCY,
    componentRole: "agency_or_district_attorney_response_never_participant_filed",
    documentAcceptsFill: false,
    reviewedFields: {}, heldFields: {}
  },
  "LA:LA-CCRP-ART-993:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "supplemental_sheet_to_a_participant_motion",
    reviewedFields: {}, heldFields: {}
  },
  "LA:LA-CCRP-ART-995:EN": {
    ownership: OWNERSHIP.COURT_ORDER,
    componentRole: "court_order_component_never_participant_filed",
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  },
  "LA:LA-CCRP-ART-998:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "principal_motion",
    reviewedFields: {}, heldFields: {}
  },
  "LA:LA-CCRP-ART-999.1:EN": {
    ownership: OWNERSHIP.COURT_ORDER,
    componentRole: "court_order_component_never_participant_filed",
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  },

  // ---------------------------------------------------------------- NEW MEXICO
  "NM:NM-4-951:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "principal_petition_or_request", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-952:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "principal_petition_or_request", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-953:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "principal_petition_or_request", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-955:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "certificate_of_service_component",
    // A certificate of service records who was served and when. D0 protects the
    // service block by category; nothing else on the form is a participant fact
    // this lane will write.
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-4-956:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "certificate_of_service_component", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-957:EN": {
    ownership: OWNERSHIP.PROSECUTOR,
    componentRole: "objection_filed_by_an_opposing_agency_never_participant_filed",
    documentAcceptsFill: false,
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-4-958:EN": {
    ownership: OWNERSHIP.PROSECUTOR,
    componentRole: "non_objection_filed_by_an_opposing_agency_never_participant_filed",
    documentAcceptsFill: false,
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-4-959:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "notice_component", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-960:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "notice_component", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-960.1:EN": {
    ownership: OWNERSHIP.COURT_ORDER,
    componentRole: "notice_of_hearing_issued_by_the_court",
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-4-960.2:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "affirmation_component", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-960.3:EN": { ownership: OWNERSHIP.PARTICIPANT, componentRole: "affirmation_component", reviewedFields: {}, heldFields: {} },
  "NM:NM-4-222:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "fee_waiver_application_support",
    reviewedFields: {
      "COUNTY OF": "matter.county",
      Petitioner: "participant.full_legal_name",
      // Page 4's block runs Signature / Print Name / Petitioner-Respondent /
      // Pro Se / Street Address / City State Zip Code / Telephone in one column:
      // the applicant's own pro-se contact block.
      "Print Name": "participant.full_legal_name",
      "Street Address": "participant.street_address",
      "City State Zip Code": "participant.city_state_zip",
      Telephone: "participant.phone"
    },
    heldFields: {
      "STATE OF NEW MEXICO": "pre-printed jurisdiction line, not a blank",
      "SIXTH JUDICIAL DISTRICT COURT": "pre-printed court line, not a blank",
      "State of": "notary jurat block",
      "County of": "notary jurat block",
      "County please": "unverified blank",
      "name of applicant": "sits inside the notary jurat recital",
      "Name 1": "financial-disclosure block of unverified meaning",
      "Name 2": "financial-disclosure block of unverified meaning",
      Address: "page 5 block of unverified ownership",
      "City State Zip Code_2": "page 5 block of unverified ownership",
      "TelephoneFax Number": "composite telephone-and-fax blank",
      "My employers name address and phone number is 1": "employer is an outside party",
      "My employers name address and phone number is 2": "employer is an outside party",
      "My employers name address and phone number is 3": "employer is an outside party",
      "My spouses employers name address and phone number is 1": "outside party",
      "My spouses employers name address and phone number is 2": "outside party",
      "My spouses employers name address and phone number is 3": "outside party"
    }
  },
  "NM:NM-DPS-ROI:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "record_request_to_a_state_agency",
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-DPS-ROI:ES": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "record_request_to_a_state_agency",
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-LOCAL-CONVICTION-ORDER:EN": {
    ownership: OWNERSHIP.COURT_ORDER,
    componentRole: "court_order_component_never_participant_filed",
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-LOCAL-IDENTITY-THEFT-ORDER:EN": {
    ownership: OWNERSHIP.COURT_ORDER,
    componentRole: "court_order_component_never_participant_filed",
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  },
  "NM:NM-SAN-JUAN-NONCONVICTION-PACKET:EN": {
    ownership: OWNERSHIP.PARTICIPANT,
    componentRole: "local_district_packet_multi_component",
    // The packet interleaves petitions, affirmations and the judge's orders in
    // one binary, so it is treated as caption-only for the same reason as the
    // Duval packet.
    captionOnly: true,
    reviewedFields: {}, heldFields: {}
  }
};

// Fidelity findings raised when the compiled legal-design profile's legacy
// formInventory disagrees with the Edition 1 pack manifest. Edition 1 wins; the
// profile is read-only to this lane.
export const PROFILE_FIDELITY_BASIS =
  "Edition 1 STATE_MANIFEST.csv is the identity authority. Where the compiled profile's packetGenerator.formInventory records a different sha256 for the same form, the pack manifest wins and the disagreement is recorded here as a state-pack fidelity finding. The profile is not edited by this lane.";

// ============================================================================
// Engine
// ============================================================================

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  finalizeOfficialForm, finalizeFlatOverlay, NonFilingHoldError
} from "../rcap-official-form-finalize.mjs";
import {
  buildContactSheet, visibleTextOfDocument, missingExpectedValues
} from "../rcap-contact-sheet.mjs";
import { decideBinding, protectCategoryOf } from "../rcap-field-semantics.mjs";
import { fitTextToWidget, MIN_READABLE_FONT_SIZE } from "../rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "../rcap-active-content.mjs";
import { extractTextItems, groupIntoLines } from "../rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const {
  PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox,
  PDFRadioGroup, PDFButton, PDFSignature, StandardFonts
} = require("pdf-lib");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../../..");
const OUT_ROOT = path.join(REPO, "data/rcap-all50/overlays/production");
const PROFILE_DIR = path.join(REPO, "src/lib/rcap-engine/compiled/profiles");

const PACK_ROOT = process.env.D2B_PACK_ROOT ?? "/tmp/rcap-source-packs/D2B/extracted";

const NON_FILING_PATTERNS = [
  /do\s*not\s*complete\s*this\s*form\s*for\s*filing/i,
  /not\s*for\s*filing/i,
  /do\s*not\s*file\s*this\s*form/i
];

// --- small helpers -----------------------------------------------------------

const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
};
const kebab = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** RFC 4180 enough for the Edition 1 manifests, which quote embedded commas. */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = []; let row = []; let cur = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i += 1; } else quoted = false; }
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); cur = ""; rows.push(row); row = []; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length > 0) { row.push(cur); rows.push(row); }
  const head = rows.shift();
  return rows
    .filter((r) => r.length > 1 && r.some((v) => v !== ""))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const pdfTypeOf = (f) =>
  f instanceof PDFTextField ? "text"
    : f instanceof PDFDropdown ? "dropdown"
      : f instanceof PDFCheckBox ? "checkbox"
        : f instanceof PDFRadioGroup ? "radio"
          : f instanceof PDFButton ? "button"
            : f instanceof PDFSignature ? "signature"
              : "unknown";

// --- first-hand census -------------------------------------------------------

/**
 * Reads every field out of the binary itself: type, per-widget page and
 * rectangle, declared maximum length, multiline flag and option list.
 *
 * The manifest's field count is treated as a claim to be checked, never as the
 * census. NJ CN-10557 declares 269 and carries 179; NM 4-222 declares 161 and
 * carries 158.
 */
function censusOf(pdfDoc) {
  let fields = [];
  try { fields = pdfDoc.getForm().getFields(); } catch { return { structuralClass: "flat", fields: [] }; }
  if (fields.length === 0) return { structuralClass: "flat", fields: [] };

  const pages = pdfDoc.getPages();
  const pageIndexOf = (widget) => {
    const ref = widget.P();
    const i = pages.findIndex((p) => p.ref === ref);
    return i >= 0 ? i + 1 : null;
  };

  const out = [];
  for (const field of fields) {
    const type = pdfTypeOf(field);
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return {
        page: pageIndexOf(w),
        rect: {
          x: Number(r.x.toFixed(2)), y: Number(r.y.toFixed(2)),
          width: Number(r.width.toFixed(2)), height: Number(r.height.toFixed(2))
        }
      };
    });
    const entry = { name: field.getName(), type, widgets, maxLength: null, multiline: false };
    if (type === "text") {
      try { entry.maxLength = field.getMaxLength() ?? null; } catch { entry.maxLength = null; }
      try { entry.multiline = field.isMultiline() === true; } catch { entry.multiline = false; }
    }
    if (type === "dropdown") {
      try { entry.options = field.getOptions(); } catch { entry.options = []; }
    }
    out.push(entry);
  }
  return { structuralClass: "acroform", fields: out };
}

function pageGeometryOf(pdfDoc) {
  return pdfDoc.getPages().map((p, i) => {
    const { width, height } = p.getSize();
    return {
      page: i + 1,
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      orientation: width > height ? "landscape" : "portrait"
    };
  });
}

// --- anchor discovery for flat forms ----------------------------------------

/**
 * Finds every blank a flat form actually draws, and the labels that sit either
 * side of it.
 *
 * Two shapes count as a blank, and both are measured rather than assumed: a
 * contiguous run of underscore glyphs (a printed rule), and a contiguous run of
 * space glyphs wide enough to be a fill area rather than word spacing. The
 * labels reported are the *immediate* ones -- the text between this blank and
 * the previous one, and between this blank and the next -- because a whole-line
 * label makes `City: ___ State: ___ Zip Code: ___` look like three city blanks.
 */
function discoverBlanks(pdfDoc, { minGapWidth = 40, minRuleWidth = 18 } = {}) {
  const found = [];
  pdfDoc.getPages().forEach((page, pageIndex) => {
    const lines = groupIntoLines(extractTextItems(page));
    lines.forEach((line, lineIndex) => {
      const chars = [...line.chars].sort((a, b) => a.x - b.x);
      if (chars.length === 0) return;

      const segments = [];
      let i = 0;
      while (i < chars.length) {
        const c = chars[i].c;
        if (c === "_" || c === " ") {
          let j = i;
          while (j < chars.length && chars[j].c === c) j += 1;
          segments.push({ kind: c === "_" ? "printed_rule" : "measured_gap", from: i, to: j });
          i = j;
        } else i += 1;
      }

      const textBetween = (from, to) =>
        chars.slice(from, to).map((c) => c.c).join("").replace(/\s+/g, " ").trim();

      // Only a run wide enough to be a fill area counts as a blank, and only a
      // blank breaks a label. Word spacing inside a label is not a boundary:
      // treating the single space in `NAME: ______` as one would leave the rule
      // with an empty label and the participant's name unbound.
      const kept = segments.filter((seg) => {
        const width = (chars[seg.to - 1].x + chars[seg.to - 1].w) - chars[seg.from].x;
        return seg.kind === "printed_rule" ? width >= minRuleWidth : width >= minGapWidth;
      });

      kept.forEach((seg, segIndex) => {
        const x = chars[seg.from].x;
        const x2 = chars[seg.to - 1].x + chars[seg.to - 1].w;
        const width = x2 - x;

        const prev = kept[segIndex - 1];
        const next = kept[segIndex + 1];
        found.push({
          page: pageIndex + 1,
          lineIndex,
          kind: seg.kind,
          baselineY: line.y,
          fontSize: line.size,
          metricsExact: line.metricsExact,
          x: Number(x.toFixed(2)),
          width: Number(width.toFixed(2)),
          labelBefore: textBetween(prev ? prev.to : 0, seg.from),
          labelAfter: textBetween(seg.to, next ? next.from : chars.length),
          blankIndexOnLine: segIndex,
          blanksOnLine: kept.length,
          // Distance to the baseline above, measured off this page. A write box
          // is capped by it so a value never reaches into the line above.
          pitchAbove: lineIndex > 0 ? Number((lines[lineIndex - 1].y - line.y).toFixed(2)) : null,
          lineText: line.text
        });
      });
    });
  });
  return { blanks: found, lineCount: pdfDoc.getPages().reduce((a, p) => a + groupIntoLines(extractTextItems(p)).length, 0) };
}

/** Text of the lines just below a given line, used to read a caption block. */
function linesBelow(pdfDoc, pageNumber, lineIndex, count) {
  const lines = groupIntoLines(extractTextItems(pdfDoc.getPages()[pageNumber - 1]));
  return lines.slice(lineIndex + 1, lineIndex + 1 + count).map((l) => l.text);
}

/**
 * Applies the lane's reviewed rules to the discovered blanks.
 *
 * A blank becomes an anchor only when a reviewed rule names the fact it
 * carries. Everything else is returned as a refusal carrying its reason, so the
 * package records the decision rather than an absence.
 */
function reviewAnchors(pdfDoc, blanks) {
  const anchors = [];
  const refusals = [];
  const takenByFact = new Set();

  for (const blank of blanks) {
    const bothSides = `${blank.labelBefore} ${blank.labelAfter}`;

    // A protect rule matching *either* side refuses the blank, before any
    // reviewed rule is consulted. A rule may only ever subtract.
    const protectedAs = protectCategoryOf(blank.labelBefore) ?? protectCategoryOf(blank.labelAfter);
    if (protectedAs) {
      refusals.push({ ...blankRef(blank), reason: "protected_category", category: protectedAs });
      continue;
    }

    // Refusal patterns are tested against the whole line as well as the two
    // immediate labels. A jurat names itself a line or two away from the blank
    // it governs, and refusing on that evidence only ever subtracts a write.
    const declined = REVIEWED_ANCHOR_REFUSALS.find((r) => r.match.test(bothSides) || r.match.test(blank.lineText));
    if (declined) {
      refusals.push({ ...blankRef(blank), reason: declined.reason, detail: declined.detail ?? null });
      continue;
    }

    const rule = REVIEWED_ANCHOR_RULES.find((r) => {
      if (r.before && !r.before.test(blank.labelBefore)) return false;
      if (r.after && !r.after.test(blank.labelAfter)) return false;
      if (r.firstBlankOnLine && blank.blankIndexOnLine !== 0) return false;
      if (r.captionRoleWithin) {
        const below = linesBelow(pdfDoc, blank.page, blank.lineIndex, r.captionRoleWithin);
        if (!below.some((t) => /^\s*(\d{1,2}\s+)?Petitioner\.?\s*$/i.test(t))) return false;
      }
      return true;
    });

    if (!rule) {
      refusals.push({ ...blankRef(blank), reason: "not_on_the_reviewed_anchor_allowlist" });
      continue;
    }

    // One anchor per fact per page: a form that prints the same labelled blank
    // twice on a page is a continuation, not a second value.
    const key = `${blank.page}:${rule.factId}`;
    if (takenByFact.has(key)) {
      refusals.push({ ...blankRef(blank), reason: "fact_already_anchored_on_this_page", factId: rule.factId });
      continue;
    }

    // Values are drawn with the factory's own embedded Helvetica, so the write
    // box is sized from the measured blank and the line's own font size. Its
    // height is capped by the measured distance to the baseline above: a taller
    // box overlaps the line above, which the placement check catches and which
    // is a real defect on tightly-led forms like the San Juan packet.
    const inset = blank.kind === "printed_rule" ? 1.5 : 2;
    const size = blank.fontSize || 11;
    const ceiling = blank.pitchAbove ? blank.pitchAbove - 0.5 : size + 3;
    takenByFact.add(key);
    anchors.push({
      page: blank.page,
      label: rule.bindLabel,
      factId: rule.factId,
      fontSize: Math.min(size, 11),
      writeBox: {
        x: Number((blank.x + inset).toFixed(2)),
        y: Number(blank.baselineY.toFixed(2)),
        width: Number((blank.width - inset * 2).toFixed(2)),
        height: Number(Math.max(size + 1.2, Math.min(size + 3, ceiling)).toFixed(2))
      },
      evidence: {
        blankKind: blank.kind,
        measuredFrom: "this binary's own page content stream",
        metricsExact: blank.metricsExact,
        labelBefore: blank.labelBefore,
        labelAfter: blank.labelAfter,
        lineText: blank.lineText,
        bindLabelBasis: rule.note,
        writeBoxDerivation: blank.kind === "printed_rule"
          ? "x and width are the measured extent of the printed underscore rule; y is the line's own baseline"
          : "x and width are the measured extent of the drawn space run between two labels; y is the line's own baseline"
      }
    });
  }
  return { anchors, refusals };
}

const blankRef = (b) => ({
  page: b.page, kind: b.kind, x: b.x, width: b.width,
  labelBefore: b.labelBefore, labelAfter: b.labelAfter,
  blankIndexOnLine: b.blankIndexOnLine, blanksOnLine: b.blanksOnLine,
  lineText: b.lineText
});

// --- classification ----------------------------------------------------------

const NEVER_WRITE_CATEGORIES = new Set([
  "money", "race", "responsible_official", "signature", "notarization",
  "service_block", "licensing_board", "agency", "court", "clerk",
  "prosecutor", "attorney", "outside_party", "disposition_or_hearing"
]);

function classifyFields(census, config) {
  const reviewed = config.reviewedFields ?? {};
  const held = config.heldFields ?? {};
  const entries = [];
  for (const field of census) {
    const decision = decideBinding(
      { name: field.name, pdfType: field.type },
      {
        explicitMappings: config.explicitMappings ?? {},
        captionOnly: config.captionOnly === true,
        availableChargeRows: 3,
        documentAcceptsFill: config.documentAcceptsFill !== false
      }
    );
    let klass;
    let reason = null;
    if (Object.prototype.hasOwnProperty.call(reviewed, field.name) && decision.writable) {
      klass = "participant";
    } else if (Object.prototype.hasOwnProperty.call(held, field.name)) {
      klass = "held_by_lane_review";
      reason = held[field.name];
    } else if (!decision.writable && NEVER_WRITE_CATEGORIES.has(decision.category)) {
      klass = "protected";
      reason = `${decision.reason}:${decision.category}`;
    } else if (!decision.writable) {
      klass = "manual";
      reason = decision.reason;
    } else {
      klass = "held_by_lane_review";
      reason = "writable under D0 but not named by the lane's reviewed mapping table";
    }
    entries.push({
      name: field.name, type: field.type, class: klass,
      factId: klass === "participant" ? reviewed[field.name] : null,
      d0Decision: decision.writable ? { writable: true, factId: decision.factId } : { writable: false, reason: decision.reason, category: decision.category ?? null },
      reason
    });
  }
  return entries;
}

// --- the per-family pipeline -------------------------------------------------

async function buildFamily({ state, record, config, bytes, familyDir, profileFinding }) {
  const observedSha = sha256(bytes);
  const findings = [];
  const holds = [];

  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const geometry = pageGeometryOf(pdfDoc);
  const { structuralClass, fields: census } = censusOf(pdfDoc);
  const visibleText = visibleTextOfDocument(pdfDoc);

  // 22 -- a form that says on its face it must not be completed for filing is
  // refused rather than flagged. None of this lane's 31 sources carries such a
  // notice; the refusal path is exercised by the mutation suite regardless.
  const nonFilingLine = visibleText
    .split("\n")
    .find((l) => NON_FILING_PATTERNS.some((re) => re.test(l))) ?? null;

  // 23 -- every lifecycle, currentness, legal-design, counsel, adoption and
  // product-scope hold the manifest and README carry is preserved verbatim.
  if (record.generation_allowed !== "yes") holds.push({ hold: "state_manifest_generation_allowed_no", source: "STATE_MANIFEST.csv", value: record.generation_allowed });
  if (record.runtime_status !== "runtime_enabled") holds.push({ hold: "edition_1_runtime_disabled", source: "STATE_MANIFEST.csv", value: record.runtime_status });
  if (record.freshness_status) holds.push({ hold: `freshness:${record.freshness_status}`, source: "STATE_MANIFEST.csv", value: record.freshness_status });
  if (record.source_status) holds.push({ hold: `source:${record.source_status}`, source: "STATE_MANIFEST.csv", value: record.source_status });
  if (record.legal_review_mapping_status) holds.push({ hold: `legal_review_mapping:${record.legal_review_mapping_status}`, source: "STATE_MANIFEST.csv", value: record.legal_review_mapping_status });
  const libraryFolder = record.canonical_relative_path.split("/")[2];
  if (libraryFolder === "05_SOURCE_GATED") holds.push({ hold: "source_gated_never_runtime_selectable", source: "Edition 1 folder placement", value: libraryFolder });
  for (const h of state.readmeHolds ?? []) holds.push(h);
  holds.push({ hold: "f_independent_visual_review_required", source: "lane D2B status rule" });

  const structuralAgrees = (record.structural_class === "acroform_pdf") === (structuralClass === "acroform");
  const declaredFieldCount = record.field_count === "" ? null : Number(record.field_count);
  if (declaredFieldCount !== null && declaredFieldCount !== census.length) {
    findings.push({
      check: "declared_field_count_disagrees_with_first_hand_census",
      declared: declaredFieldCount, observed: census.length,
      note: "The census is the binary's own field list. The manifest count is recorded but not relied on."
    });
  }
  if (!structuralAgrees) {
    findings.push({ check: "declared_structural_class_disagrees_with_observation", declared: record.structural_class, observed: structuralClass });
  }
  if (profileFinding) findings.push(profileFinding);

  const captionOnly = config.captionOnly === true;
  const documentAcceptsFill = config.documentAcceptsFill !== false;

  // --- map ------------------------------------------------------------------
  let classification = [];
  let anchors = [];
  let anchorRefusals = [];
  let blankCount = 0;
  let mapKind;

  if (structuralClass === "acroform") {
    mapKind = "acroform";
    classification = classifyFields(census, config);
  } else {
    mapKind = "flat_overlay";
    const discovered = discoverBlanks(pdfDoc);
    blankCount = discovered.blanks.length;
    if (documentAcceptsFill) {
      const reviewed = reviewAnchors(pdfDoc, discovered.blanks);
      anchors = reviewed.anchors;
      anchorRefusals = reviewed.refusals;
    } else {
      anchorRefusals = discovered.blanks.map((b) => ({ ...blankRef(b), reason: "document_does_not_accept_fill" }));
    }
    if (blankCount === 0) {
      findings.push({
        check: "no_measurable_write_rule_in_page_content",
        note: "This form draws its blanks as table rules or cell borders in the graphics stream rather than as text, so no anchor can be measured from the page's own drawn strings. Nothing is placed by inference."
      });
    }
  }

  // The census the factory iterates is narrowed to the reviewed fields. D0
  // still decides each one independently and can still refuse; narrowing can
  // only ever remove a write, never add one.
  const reviewedNames = new Set(Object.keys(config.reviewedFields ?? {}));
  const factoryCensus = documentAcceptsFill ? census.filter((f) => reviewedNames.has(f.name)) : [];

  const renderable = documentAcceptsFill && (mapKind === "acroform" ? factoryCensus.length > 0 : anchors.length > 0);

  // --- fixtures -------------------------------------------------------------
  const rendered = {};
  const overflow = [];
  let unfittableCount = 0;

  const renderOnce = async (facts, notice = null, sourceOverride = null) => {
    const src = sourceOverride ?? bytes;
    const expected = sourceOverride ? null : observedSha;
    return mapKind === "acroform"
      ? finalizeOfficialForm({
        sourceBytes: src, expectedSha256: expected, census: factoryCensus, facts,
        explicitMappings: config.explicitMappings ?? {},
        captionOnly, documentAcceptsFill, nonFilingNotice: notice,
        title: `${record.jurisdiction_code} ${record.document_id}`
      })
      : finalizeFlatOverlay({
        sourceBytes: src, expectedSha256: expected, anchors, facts,
        nonFilingNotice: notice, title: `${record.jurisdiction_code} ${record.document_id}`
      });
  };

  if (renderable) {
    for (const name of ["canonical", "boundary", "negative"]) {
      const result = await renderOnce(FIXTURE_FACTS[name], nonFilingLine);
      fs.mkdirSync(path.join(familyDir, "fixtures"), { recursive: true });
      fs.writeFileSync(path.join(familyDir, "fixtures", `${name}-filled.pdf`), result.bytes);
      rendered[name] = result;
      for (const u of result.report.unfittable) {
        unfittableCount += 1;
        overflow.push({
          fixture: name, field: u.field ?? u.anchor, check: "refused_below_readable_floor",
          reason: u.reason, minFontSize: u.minFontSize ?? MIN_READABLE_FONT_SIZE,
          requiredWidthAtMin: u.requiredWidthAtMin ?? null,
          requiredHeightAtMin: u.requiredHeightAtMin ?? null,
          handling: "left blank for a human rather than stamped illegibly"
        });
      }
      for (const w of result.report.written) {
        if (w.outcome === "shrunk") {
          overflow.push({ fixture: name, field: w.field ?? w.anchor, check: "shrink_to_fit_applied", fontSize: w.fontSize, lines: w.lines ?? 1 });
        }
      }
    }
  }

  // 21 -- no two values may be drawn into the same place, and no fact may be
  // drawn twice on one page. Both are checked geometrically against the boxes
  // the values were actually written into rather than asserted.
  const placement = [];
  if (renderable) {
    const written = new Set(rendered.canonical.report.written.map((w) => w.field ?? w.anchor));
    const boxes = mapKind === "acroform"
      ? census.filter((f) => written.has(f.name)).flatMap((f) => f.widgets.map((w) => ({ id: f.name, page: w.page, ...w.rect })))
      : anchors.filter((a) => written.has(a.label)).map((a) => ({ id: a.label, page: a.page, ...a.writeBox }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]; const b = boxes[j];
        if (a.page !== b.page) continue;
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width
          && a.y < b.y + b.height && b.y < a.y + a.height;
        if (overlaps) placement.push({ check: "write_boxes_overlap", page: a.page, a: a.id, b: b.id });
      }
    }
    const perPageFact = new Map();
    for (const w of rendered.canonical.report.written) {
      const target = mapKind === "acroform"
        ? census.find((f) => f.name === w.field)?.widgets?.[0]?.page
        : anchors.find((a) => a.label === w.anchor)?.page;
      const key = `${target}:${w.factId}`;
      if (perPageFact.has(key) && mapKind === "flat_overlay") {
        placement.push({ check: "fact_written_twice_on_one_page", page: target, factId: w.factId });
      }
      perPageFact.set(key, true);
    }
    for (const p of placement) findings.push({ ...p, severity: "blocker" });
  }

  // 20 / 26 -- the negative fixture must write nothing, and the canonical one
  // must reproduce byte for byte.
  const negativeWrote = rendered.negative ? rendered.negative.report.written.length : 0;
  if (negativeWrote > 0) {
    findings.push({ check: "negative_fixture_wrote_values", count: negativeWrote, severity: "blocker" });
  }

  let determinism = { checked: false };
  if (renderable) {
    const again = await renderOnce(FIXTURE_FACTS.canonical, nonFilingLine);
    determinism = {
      checked: true,
      firstSha256: rendered.canonical.report.outputSha256,
      secondSha256: again.report.outputSha256,
      identical: rendered.canonical.report.outputSha256 === again.report.outputSha256
    };
    if (!determinism.identical) findings.push({ check: "render_is_not_deterministic", severity: "blocker" });
  }

  // --- contact sheet --------------------------------------------------------
  let contactSheetProof = null;
  if (renderable && rendered.canonical.report.expectedValues.length > 0) {
    const sheet = await buildContactSheet({
      blankBytes: bytes,
      finalizedBytes: rendered.canonical.bytes,
      expectedValues: rendered.canonical.report.expectedValues,
      heading: `${record.jurisdiction_code} ${record.document_id} — blank (left) vs finalized fill (right)`
    });
    fs.mkdirSync(path.join(familyDir, "contact-sheet"), { recursive: true });
    fs.writeFileSync(path.join(familyDir, "contact-sheet", "blank-vs-filled.pdf"), sheet.bytes);
    contactSheetProof = sheet.proof;
  }

  // 19 / 21 -- the proof is re-run here against the artifact on disk, so the
  // package's own claim is checkable without re-rendering.
  let visibilityProof = null;
  if (renderable && rendered.canonical.report.expectedValues.length > 0) {
    const finalized = await PDFDocument.load(
      fs.readFileSync(path.join(familyDir, "fixtures", "canonical-filled.pdf")), { ignoreEncryption: true }
    );
    const finalText = visibleTextOfDocument(finalized);
    const missing = missingExpectedValues(finalText, rendered.canonical.report.expectedValues);
    const blankText = visibleTextOfDocument(await PDFDocument.load(bytes, { ignoreEncryption: true }));
    const strayInBlank = missingExpectedValues(blankText, rendered.canonical.report.expectedValues);
    visibilityProof = {
      basis: "canonical-filled.pdf re-read from disk, decoded through flattened appearance XObjects",
      expectedValueCount: [...new Set(rendered.canonical.report.expectedValues)].length,
      missingExpectedValues: missing.length,
      missing,
      panelsDiffer: strayInBlank.length === [...new Set(rendered.canonical.report.expectedValues)].length,
      valuesAbsentFromUntouchedSource: strayInBlank.length
    };
    if (missing.length > 0) findings.push({ check: "expected_values_not_visible_in_finalized_artifact", missing, severity: "blocker" });
  }

  // --- protected-field scan -------------------------------------------------
  // Every field the lane refused must be blank in the canonical artifact, and
  // no participant value may appear anywhere the source did not already draw it
  // twice over.
  let protectedScan = null;
  if (renderable && mapKind === "acroform") {
    const finalizedDoc = await PDFDocument.load(
      fs.readFileSync(path.join(familyDir, "fixtures", "canonical-filled.pdf")), { ignoreEncryption: true }
    );
    const finalText = visibleTextOfDocument(finalizedDoc);
    const sourceText = visibleTextOfDocument(await PDFDocument.load(bytes, { ignoreEncryption: true }));
    const norm = (s) => String(s).replace(/\s+/g, "").toLowerCase();
    const written = new Set(rendered.canonical.report.written.map((w) => w.field));
    const violations = [];
    for (const entry of classification) {
      if (entry.class === "participant") continue;
      if (written.has(entry.name)) violations.push({ field: entry.name, class: entry.class, issue: "refused_field_received_a_value" });
    }
    protectedScan = {
      scanBasis: "canonical fixture diffed against the untouched source binary",
      refusedFieldsChecked: classification.filter((c) => c.class !== "participant").length,
      violations,
      newVisibleTextIsOnlyExpectedValues:
        [...new Set(rendered.canonical.report.expectedValues)].every((v) => norm(finalText).includes(norm(v)) && !norm(sourceText).includes(norm(v))),
      pass: violations.length === 0
    };
    if (violations.length > 0) findings.push({ check: "refused_field_received_a_value", violations, severity: "blocker" });
  }

  // --- mutation and drift suite --------------------------------------------
  const mutations = [];

  // 25 -- perturbing the source must be refused, not silently rendered.
  {
    const perturbed = Buffer.from(bytes);
    perturbed[Math.floor(perturbed.length / 2)] ^= 0xff;
    let refused = false; let message = null;
    try {
      await (mapKind === "acroform"
        ? finalizeOfficialForm({ sourceBytes: perturbed, expectedSha256: observedSha, census: factoryCensus, facts: FIXTURE_FACTS.canonical, explicitMappings: config.explicitMappings ?? {}, captionOnly, documentAcceptsFill })
        : finalizeFlatOverlay({ sourceBytes: perturbed, expectedSha256: observedSha, anchors, facts: FIXTURE_FACTS.canonical }));
    } catch (e) { refused = true; message = e.message.slice(0, 120); }
    mutations.push({ mutation: "source_byte_perturbed", expected: "refusal", refused, message });
    if (!refused) findings.push({ check: "source_drift_not_detected", severity: "blocker" });
  }

  // 22 -- the non-filing notice is a refusal, not a flag a caller may ignore.
  {
    let held = false; let type = null;
    try {
      await renderOnce(FIXTURE_FACTS.canonical, "DO NOT COMPLETE THIS FORM FOR FILING");
    } catch (e) { held = e instanceof NonFilingHoldError; type = e.name; }
    mutations.push({ mutation: "non_filing_notice_injected", expected: "NonFilingHoldError", held, errorName: type });
    if (!held) findings.push({ check: "non_filing_hold_not_enforced", severity: "blocker" });
  }

  // The contact sheet's visibility proof is load-bearing: handed the untouched
  // source in place of the finalized artifact it must refuse.
  if (renderable && rendered.canonical.report.expectedValues.length > 0) {
    let refused = false; let name = null;
    try {
      await buildContactSheet({ blankBytes: bytes, finalizedBytes: bytes, expectedValues: rendered.canonical.report.expectedValues });
    } catch (e) { refused = true; name = e.name; }
    mutations.push({ mutation: "contact_sheet_fed_the_unfilled_source", expected: "ContactSheetProofError", refused, errorName: name });
    if (!refused) findings.push({ check: "contact_sheet_visibility_proof_is_not_load_bearing", severity: "blocker" });
  }

  // A protected field named through explicitMappings must still be refused:
  // the escape hatch may confirm a descriptor, never override a protect rule.
  {
    const probeTarget = classification.find((c) => c.class === "protected" && c.type === "text");
    if (probeTarget) {
      const decision = decideBinding(
        { name: probeTarget.name, pdfType: probeTarget.type },
        { explicitMappings: { [probeTarget.name]: "participant.full_legal_name" }, availableChargeRows: 3 }
      );
      mutations.push({ mutation: "protected_field_named_through_explicit_mappings", field: probeTarget.name, expected: "still refused", refused: decision.writable !== true, reason: decision.reason });
      if (decision.writable) findings.push({ check: "explicit_mapping_overrode_a_protect_rule", severity: "blocker" });
    }
  }

  // A charge row with no charge behind it must stay blank.
  {
    const decision = decideBinding({ name: "ChargeDescription7", pdfType: "text" }, { explicitMappings: { ChargeDescription7: "matter.charge" }, availableChargeRows: 1 });
    mutations.push({ mutation: "charge_row_7_requested_with_one_charge_supplied", expected: "refused", refused: decision.writable !== true, reason: decision.reason });
    if (decision.writable) findings.push({ check: "unindexed_charge_row_was_writable", severity: "blocker" });
  }

  // The readable floor: a value that cannot be drawn at 6pt is refused rather
  // than shrunk into illegibility.
  {
    const probe = await PDFDocument.create();
    const font = await probe.embedFont(StandardFonts.Helvetica);
    const fit = fitTextToWidget({
      font, text: FIXTURE_FACTS.boundary["matter.charge"],
      rect: { x: 0, y: 0, width: 40, height: 12 }, multiline: false
    });
    mutations.push({ mutation: "oversized_value_into_a_40pt_widget", expected: "refused", refused: fit.outcome === "refused", reason: fit.reason ?? null, minFontSize: MIN_READABLE_FONT_SIZE });
    if (fit.outcome !== "refused") findings.push({ check: "readable_floor_not_enforced", severity: "blocker" });
  }

  // --- active content -------------------------------------------------------
  const sourceResidue = scanBytesForActiveContent(bytes);
  const activeContent = {
    source: { inspectable: sourceResidue.inspectable, hits: sourceResidue.hits },
    finalized: renderable ? rendered.canonical.report.activeContentScan : null,
    sanitation: renderable ? rendered.canonical.report.sanitation : null,
    policy: "Output is refused when residue survives; the document is rebuilt from its flattened pages so orphaned objects are left behind."
  };

  // --- package --------------------------------------------------------------
  const participantEntries = classification.filter((c) => c.class === "participant");
  const heldEntries = classification.filter((c) => c.class === "held_by_lane_review");
  const protectedEntries = classification.filter((c) => c.class === "protected");
  const manualEntries = classification.filter((c) => c.class === "manual");

  writeJson(path.join(familyDir, "source-record.json"), {
    schemaVersion: "rcap-official-form-source-record/v2-verified-binary",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: record.jurisdiction_code,
    documentId: record.document_id,
    documentRole: record.document_role,
    officialTitle: record.official_title,
    revision: record.revision,
    language: record.language,
    workflowKey: record.workflow_key,
    canonicalBundlePath: `${SOURCE_PACK.edition}/${record.canonical_relative_path}`,
    sourcePack: SOURCE_PACK.name,
    sourcePackSha256: SOURCE_PACK.sha256,
    sha256: observedSha,
    sha256VerifiedAgainstBundleManifest: observedSha === record.sha256,
    manifestDeclaredSha256: record.sha256,
    byteLength: bytes.length,
    bundleDeclaredBytes: Number(record.bytes),
    byteLengthMatches: bytes.length === Number(record.bytes),
    sourceUrl: record.source_url || null,
    sourceStatus: record.source_status,
    freshnessStatus: record.freshness_status,
    libraryFolder,
    binaryPresent: true,
    lifecycleClassification: record.eligibility_role,
    structuralClassObserved: structuralClass,
    structuralClassDeclared: record.structural_class,
    structuralClassAgrees: structuralAgrees,
    declaredFieldCount,
    observedAcroFieldCount: census.length,
    pageGeometry: geometry,
    declaredPages: record.pages === "" ? null : Number(record.pages),
    pageCountAgrees: record.pages === "" ? null : Number(record.pages) === geometry.length,
    renderStrategy: mapKind === "acroform" ? "acroform_fill" : "flat_overlay_measured_anchors",
    participantFillable: renderable,
    generationAllowed: false,
    productionHolds: holds.map((h) => h.hold),
    ownershipDetermination: ownershipNarrative(config.ownership),
    coBrandingRule: "No LegalEase or partner branding may be added to the official form.",
    implementationStatus: "implementation_complete_pending_independent_review",
    censusBasis: "first_hand_inspection_of_verified_binary",
    documentOwnership: config.ownership,
    componentRole: config.componentRole
  });

  writeJson(path.join(familyDir, "field-census.json"), {
    schemaVersion: "rcap-field-census/v3-first-hand",
    censusBasis: "first_hand_inspection_of_verified_binary",
    sha256: observedSha,
    structuralClass,
    fieldCount: census.length,
    declaredFieldCount,
    pageGeometry: geometry,
    fields: census,
    flatFormBlanks: mapKind === "flat_overlay" ? { measuredBlankCount: blankCount, basis: "underscore rules and drawn space runs read from this binary's page content streams" } : null
  });

  writeJson(path.join(familyDir, "field-classification.json"), {
    schemaVersion: "rcap-field-classification/v4-nine-class",
    documentOwnership: config.ownership,
    ownershipBasis: "document role, canonical filename, official title and the printed face of the document, re-checked field by field",
    classCounts: {
      participant: participantEntries.length,
      held_by_lane_review: heldEntries.length,
      protected: protectedEntries.length,
      manual: manualEntries.length
    },
    entries: classification
  });

  writeJson(path.join(familyDir, "field-classification-policy.json"), {
    schemaVersion: "rcap-field-classification-policy/v2-two-gate",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    gates: [
      { order: 1, gate: "D0 typed fail-closed binder", module: "scripts/rcap-official-forms/rcap-field-semantics.mjs", note: "Never bypassed, never weakened. Every field starts protected." },
      { order: 2, gate: "lane D2B reviewed mapping table", note: "A field D0 would write is written only when this lane's table names the exact fact it carries. The table can only subtract." }
    ],
    reviewedFields: config.reviewedFields ?? {},
    heldFields: config.heldFields ?? {},
    explicitMappings: config.explicitMappings ?? {},
    captionOnly,
    documentAcceptsFill,
    neverWriteCategories: [...NEVER_WRITE_CATEGORIES]
  });

  const mapFile = mapKind === "acroform" ? "production-field-map.json" : "overlay-profile.json";
  writeJson(path.join(familyDir, mapFile), {
    schemaVersion: `rcap-${mapKind}-map/v5`,
    family: path.basename(familyDir),
    factoryVersion: FACTORY_VERSION,
    documentOwnership: config.ownership,
    sha256: observedSha,
    pageGeometry: geometry,
    captionOnly,
    bindingBasis: "typed fail-closed binder (scripts/rcap-official-forms/rcap-field-semantics.mjs), narrowed by the lane D2B reviewed mapping table",
    bindings: mapKind === "acroform"
      ? participantEntries.map((e) => ({ field: e.name, class: "participant", factId: e.factId }))
      : anchors.map((a) => ({ anchor: a.label, factId: a.factId, page: a.page, writeBox: a.writeBox })),
    bindingRefusals: mapKind === "acroform"
      ? classification.filter((c) => c.class !== "participant").map((c) => ({ field: c.name, class: c.class, reason: c.reason }))
      : anchorRefusals,
    unwritableFields: protectedEntries.map((c) => ({ field: c.name, class: c.class, reason: c.reason })),
    manualFields: manualEntries.map((c) => c.name),
    anchorCapture: mapKind === "flat_overlay"
      ? {
        basis: "text drawn by this exact sha256, read from the page content streams",
        measuredBlankCount: blankCount,
        anchorCount: anchors.length,
        anchors,
        refusedBlankCount: anchorRefusals.length
      }
      : null,
    overflowPolicy: { longText: "shrink_to_fit_then_refuse_below_6pt", multiline: "wrap_within_widget_rect" }
  });

  writeJson(path.join(familyDir, "reports/populated-fields.json"),
    renderable
      ? rendered.canonical.report.written.map((w) => ({ field: w.field ?? w.anchor, factId: w.factId, kind: w.kind ?? "overlay", fontSize: w.fontSize ?? null, outcome: w.outcome ?? null }))
      : []);

  writeJson(path.join(familyDir, "reports/protected-fields.json"), {
    documentOwnership: config.ownership,
    wholeDocumentUnwritable: !documentAcceptsFill,
    unwritableFields: protectedEntries.map((c) => ({ field: c.name, class: c.class, reason: c.reason })),
    heldByLaneReview: heldEntries.map((c) => ({ field: c.name, reason: c.reason, d0WouldHaveWritten: c.d0Decision.writable === true, d0FactId: c.d0Decision.factId ?? null })),
    manualFields: manualEntries.map((c) => c.name)
  });

  if (protectedScan) writeJson(path.join(familyDir, "reports/protected-fields-scan.json"), protectedScan);

  writeJson(path.join(familyDir, "reports/overflow-and-clipping.json"), {
    schemaVersion: "rcap-overflow-report/v2",
    boundaryFixtureApplied: renderable,
    readableFloor: MIN_READABLE_FONT_SIZE,
    unfittableCount,
    findings: overflow,
    placement: {
      checked: renderable,
      overlappingWriteBoxes: placement.filter((p) => p.check === "write_boxes_overlap").length,
      factsWrittenTwiceOnOnePage: placement.filter((p) => p.check === "fact_written_twice_on_one_page").length,
      detail: placement
    },
    assertion: "No value is drawn below the readable floor: a value that cannot fit is left blank and reported, so clipping and truncation cannot occur. Every pair of write boxes on a page was compared for intersection, and no fact is drawn twice on one page, so overlap and duplication are checked rather than assumed."
  });

  writeJson(path.join(familyDir, "fixtures/negative.json"), {
    schemaVersion: "rcap-negative-fixture/v3",
    assertion: "With no participant facts supplied the renderer writes nothing. Every field starts protected: money, race, arrest and disposition dates without an explicit mapping, agency and licensing-board blocks, court, clerk, prosecutor and attorney fields, responsible officials, signatures, notarization, service blocks, outside parties, non-text controls and unindexed charge rows are refused by construction rather than by a deny pattern.",
    rendered: Boolean(rendered.negative),
    valuesWritten: negativeWrote,
    refusals: rendered.negative ? rendered.negative.report.refused : [],
    unwritableFields: protectedEntries.map((c) => ({ field: c.name, class: c.class }))
  });

  const artifacts = {};
  for (const rel of ["fixtures/canonical-filled.pdf", "fixtures/boundary-filled.pdf", "fixtures/negative-filled.pdf", "contact-sheet/blank-vs-filled.pdf"]) {
    const abs = path.join(familyDir, rel);
    if (!fs.existsSync(abs)) continue;
    const buf = fs.readFileSync(abs);
    artifacts[rel] = { sha256: sha256(buf), bytes: buf.length };
  }
  writeJson(path.join(familyDir, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1",
    sourceSha256: observedSha,
    renderer: "scripts/rcap-official-forms/lanes/d2b-regenerate.mjs",
    reproducible: "Creation and modification dates are pinned to a fixed instant, so re-rendering from the same source binary and the same facts reproduces these hashes byte for byte.",
    determinism,
    artifacts
  });

  writeJson(path.join(familyDir, "reports/contact-sheet-proof.json"), {
    schemaVersion: "rcap-contact-sheet-proof/v2",
    built: contactSheetProof !== null,
    proof: contactSheetProof,
    reRead: visibilityProof
  });

  writeJson(path.join(familyDir, "reports/mutation.json"), {
    schemaVersion: "rcap-mutation-suite/v1",
    basis: "Each mutation removes one guarantee and confirms the pipeline refuses. No shared D0 module is modified; every mutation is applied to inputs.",
    mutations,
    allRefusedAsExpected: mutations.every((m) => m.refused === true || m.held === true)
  });

  writeJson(path.join(familyDir, "reports/active-content.json"), {
    schemaVersion: "rcap-active-content/v1",
    ...activeContent
  });

  writeJson(path.join(familyDir, "reports/holds.json"), {
    schemaVersion: "rcap-holds/v1",
    assertion: "Every lifecycle, currentness, legal-design, counsel, adoption and product-scope hold carried by the Edition 1 manifest and STATE_README is preserved. A technically clean render does not clear a hold, and no held form becomes a sellable route because it renders.",
    holds,
    nonFilingNoticeDetected: nonFilingLine,
    findings
  });

  fs.writeFileSync(path.join(familyDir, "handoff.md"), handoffMarkdown({
    record, config, structuralClass, census, classification, anchors, anchorRefusals,
    holds, findings, renderable, rendered, determinism, contactSheetProof, visibilityProof,
    mutations, observedSha, mapKind, blankCount
  }));

  return {
    familySlug: path.basename(familyDir),
    documentId: record.document_id,
    language: record.language,
    componentRole: config.componentRole,
    documentOwnership: config.ownership,
    structuralClass,
    renderStrategy: mapKind,
    sha256: observedSha,
    sha256MatchesManifest: observedSha === record.sha256,
    fieldsInventoried: census.length,
    measuredBlanks: blankCount,
    fieldsBound: mapKind === "acroform" ? participantEntries.length : anchors.length,
    valuesWritten: renderable ? rendered.canonical.report.written.length : 0,
    protectedOrRefused: mapKind === "acroform"
      ? classification.filter((c) => c.class !== "participant").length
      : anchorRefusals.length,
    unfittable: unfittableCount,
    contactSheet: contactSheetProof !== null,
    deterministic: determinism.identical ?? null,
    holds: holds.map((h) => h.hold),
    findings,
    status: renderable
      ? "implementation_complete_pending_independent_review"
      : (documentAcceptsFill ? "no_reviewed_participant_binding_available" : "whole_document_unwritable_by_ownership")
  };
}

function ownershipNarrative(ownership) {
  switch (ownership) {
    case OWNERSHIP.COURT_ORDER:
      return "Court-issued order. Only caption facts are bound; no decretal or dispositional field is ever written.";
    case OWNERSHIP.AGENCY:
      return "Completed by an agency rather than the participant. The whole document is unwritable.";
    case OWNERSHIP.PROSECUTOR:
      return "Filed by the prosecuting authority in opposition or non-opposition. The whole document is unwritable.";
    case OWNERSHIP.INSTRUCTIONS:
      return "Instructional material rather than a filing. Nothing is written.";
    default:
      return "Participant-completed filing. Participant and deterministic fields named by the lane's reviewed mapping table are bound; every other class is unwritable.";
  }
}

function handoffMarkdown(ctx) {
  const {
    record, config, structuralClass, census, classification, anchors, anchorRefusals,
    holds, findings, renderable, rendered, determinism, contactSheetProof, visibilityProof,
    mutations, observedSha, mapKind, blankCount
  } = ctx;
  const bound = mapKind === "acroform"
    ? classification.filter((c) => c.class === "participant")
    : anchors.map((a) => ({ name: a.label, factId: a.factId }));
  const lines = [];
  lines.push(`# ${record.jurisdiction_code} ${record.document_id} — ${record.official_title}`);
  lines.push("");
  lines.push(`**Lane** D2B · **Factory** ${FACTORY_VERSION} · **Revision** ${record.revision} · **Language** ${record.language}`);
  lines.push("");
  lines.push(`**Source** \`${record.canonical_relative_path}\``);
  lines.push(`**sha256** \`${observedSha}\` — ${observedSha === record.sha256 ? "matches the Edition 1 manifest" : "**disagrees with the Edition 1 manifest**"}`);
  lines.push("");
  lines.push("## What this document is");
  lines.push("");
  lines.push(`${ownershipNarrative(config.ownership)} Component role: \`${config.componentRole}\`.`);
  lines.push("");
  lines.push("## What was read");
  lines.push("");
  lines.push(structuralClass === "acroform"
    ? `The binary carries an AcroForm with ${census.length} fields. Every field's type, per-widget page and rectangle, declared maximum length and multiline flag was read from the binary rather than taken from the manifest.`
    : `The binary is flat. ${blankCount} blanks were measured from the page content streams — printed underscore rules and drawn space runs — and each one's immediate labels were read either side of it.`);
  lines.push("");
  lines.push("## What is written");
  lines.push("");
  if (bound.length === 0) {
    lines.push("Nothing. No blank on this document is a participant fact this lane will bind, so the artifact ships as a census and a set of refusals rather than a fill.");
  } else {
    lines.push("| target | fact |");
    lines.push("| --- | --- |");
    for (const b of bound) lines.push(`| \`${b.name}\` | \`${b.factId}\` |`);
  }
  lines.push("");
  lines.push("## What is deliberately left blank");
  lines.push("");
  const held = mapKind === "acroform"
    ? classification.filter((c) => c.class === "held_by_lane_review" && c.d0Decision.writable === true)
    : [];
  if (held.length > 0) {
    lines.push("D0's typed binder would have written these; the lane's reviewed mapping table refused them after reading the document:");
    lines.push("");
    for (const h of held) lines.push(`- \`${h.name}\` — D0 offered \`${h.d0Decision.factId}\`. ${h.reason}`);
  } else if (anchorRefusals.length > 0) {
    const grouped = new Map();
    for (const r of anchorRefusals) grouped.set(r.reason, (grouped.get(r.reason) ?? 0) + 1);
    lines.push("Blanks measured on the page and refused, by reason:");
    lines.push("");
    for (const [reason, n] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) lines.push(`- \`${reason}\` — ${n}`);
  } else {
    lines.push("Every field is refused by D0's own category rules; the lane added nothing.");
  }
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  if (renderable) {
    lines.push(`- Canonical, boundary and negative fixtures are finalized artifacts: values materialized into appearances, flattened, sanitized of active content, byte-reproducible.`);
    lines.push(`- The negative fixture wrote ${rendered.negative.report.written.length} values.`);
    lines.push(`- Rendering the canonical fixture twice produced ${determinism.identical ? "identical bytes" : "**different bytes**"}.`);
    if (visibilityProof) {
      lines.push(`- ${visibilityProof.expectedValueCount} expected values, ${visibilityProof.missingExpectedValues} missing from the finalized artifact when re-read from disk.`);
      lines.push(`- None of those values appears in the untouched source, so the blank and filled panels provably differ.`);
    }
    lines.push(`- Contact sheet ${contactSheetProof ? "built from the finalized artifact" : "not built"}.`);
  } else {
    lines.push("- No fill was rendered, so there is no fixture to review. The census, classification and refusal list are the deliverable.");
  }
  lines.push(`- Mutation suite: ${mutations.length} mutations, ${mutations.filter((m) => m.refused === true || m.held === true).length} refused as expected.`);
  lines.push("");
  lines.push("## Holds carried forward");
  lines.push("");
  for (const h of holds) lines.push(`- \`${h.hold}\`${h.value ? ` (${h.value})` : ""} — ${h.source}`);
  lines.push("");
  lines.push("These are preserved, not cleared. A technically clean render does not make this form a sellable route.");
  if (findings.length > 0) {
    lines.push("");
    lines.push("## Findings for independent review");
    lines.push("");
    for (const f of findings) lines.push(`- \`${f.check}\` — ${JSON.stringify(f)}`);
  }
  lines.push("");
  return lines.join("\n");
}

// --- state driver ------------------------------------------------------------

function readmeHoldsFor(readme, stateCode) {
  const holds = [];
  if (/Legal review:\s*missing/i.test(readme)) {
    holds.push({ hold: "state_legal_review_missing_release_blocker", source: `STATES/${stateCode}/STATE_README.md`, value: "release_blocker" });
  }
  const openItems = readme.match(/^- \*\*(.+?)\*\* — `(.+?)` \/ `(.+?)`$/gm) ?? [];
  for (const item of openItems) {
    const m = /^- \*\*(.+?)\*\* — `(.+?)` \/ `(.+?)`$/.exec(item);
    if (m) holds.push({ hold: `open_item:${kebab(m[1])}`, source: `STATES/${stateCode}/STATE_README.md`, value: `${m[2]} / ${m[3]}` });
  }
  if (/Runtime status:\*\*\s*`runtime_disabled`/.test(readme)) {
    holds.push({ hold: "state_runtime_disabled", source: `STATES/${stateCode}/STATE_README.md`, value: "runtime_disabled" });
  }
  return holds;
}

function profileFidelity(stateCode, profileFile, records) {
  const abs = path.join(PROFILE_DIR, profileFile);
  if (!fs.existsSync(abs)) return { findings: [], byDocumentId: new Map() };
  const profile = JSON.parse(fs.readFileSync(abs, "utf8"));
  const inventory = profile?.packetGenerator?.formInventory ?? [];
  const packHashes = new Set(records.map((r) => r.sha256));
  const findings = [];
  for (const entry of inventory) {
    if (entry.extension !== ".pdf") continue;
    if (packHashes.has(entry.sha256)) continue;
    findings.push({
      finding: "state_pack_fidelity",
      jurisdiction: stateCode,
      profileFile,
      legacyFileName: entry.fileName,
      legacySha256: entry.sha256,
      resolution: "Edition 1 pack manifest wins; the compiled profile is read-only to this lane and is not edited.",
      detail: "The compiled legal-design profile's legacy formInventory records a PDF whose sha256 appears nowhere in this state's Edition 1 manifest."
    });
  }
  // The other direction, which matters more for this lane: an Edition 1 binary
  // the compiled profile has never heard of. Florida's profile carries no PDF
  // inventory at all and Louisiana's formInventory is empty, so every binary in
  // those states' packs is new to the profile.
  const legacyHashes = new Set(inventory.filter((e) => e.extension === ".pdf").map((e) => e.sha256));
  for (const record of records) {
    if (legacyHashes.has(record.sha256)) continue;
    findings.push({
      finding: "state_pack_fidelity",
      jurisdiction: stateCode,
      profileFile,
      editionOneDocumentId: record.document_id,
      editionOneSha256: record.sha256,
      resolution: "Edition 1 pack manifest wins; the compiled profile is read-only to this lane and is not edited.",
      detail: "This Edition 1 binary's sha256 appears nowhere in the compiled profile's legacy packetGenerator.formInventory."
    });
  }
  const matched = inventory.filter((e) => e.extension === ".pdf" && packHashes.has(e.sha256)).length;
  return { findings, matched, legacyPdfCount: inventory.filter((e) => e.extension === ".pdf").length };
}

async function buildState(state) {
  const stateRoot = path.join(PACK_ROOT, "STATES", state.code);
  const records = parseCsv(fs.readFileSync(path.join(stateRoot, "STATE_MANIFEST.csv"), "utf8"));
  const readme = fs.readFileSync(path.join(stateRoot, "STATE_README.md"), "utf8");
  state.readmeHolds = readmeHoldsFor(readme, state.code);

  const pdfRecords = records.filter((r) => r.canonical_relative_path.toLowerCase().endsWith(".pdf"));
  const fidelity = profileFidelity(state.code, state.profile, pdfRecords);

  // Rebuilt from scratch each run. A family that stops binding must stop
  // shipping a fixture too: a stale canonical-filled.pdf left behind by an
  // earlier pass is an artifact nothing in this package still stands behind.
  const outDir = path.join(OUT_ROOT, state.slug);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const families = [];
  for (const record of pdfRecords) {
    const key = `${record.jurisdiction_code}:${record.document_id}:${record.language}`;
    const config = FAMILIES[key];
    if (!config) throw new Error(`no reviewed configuration for ${key}`);

    const abs = path.join(PACK_ROOT, record.canonical_relative_path);
    const bytes = fs.readFileSync(abs);
    const observed = sha256(bytes);
    if (observed !== record.sha256) {
      // 1 / failure handling -- an identity mismatch blocks this family only.
      families.push({
        familySlug: kebab(`${record.document_id}-${record.language}`),
        documentId: record.document_id, language: record.language,
        status: "blocked_source_identity_mismatch",
        sha256: observed, sha256MatchesManifest: false,
        findings: [{ check: "source_sha256_disagrees_with_manifest", declared: record.sha256, observed, severity: "blocker" }]
      });
      continue;
    }

    const familySlug = kebab(`${record.document_id}-${record.language}`);
    const familyDir = path.join(outDir, familySlug);
    fs.mkdirSync(familyDir, { recursive: true });

    const summary = await buildFamily({
      state, record, config, bytes, familyDir,
      profileFinding: null
    });
    families.push(summary);
    process.stdout.write(`  ${state.code} ${record.document_id.padEnd(38)} ${summary.structuralClass.padEnd(9)} bound=${String(summary.fieldsBound).padStart(3)} written=${String(summary.valuesWritten).padStart(3)} refused=${String(summary.protectedOrRefused).padStart(4)} sheet=${summary.contactSheet ? "yes" : "no "} det=${summary.deterministic === null ? "n/a" : summary.deterministic}\n`);
  }

  const totals = families.reduce((acc, f) => ({
    fieldsInventoried: acc.fieldsInventoried + (f.fieldsInventoried ?? 0),
    measuredBlanks: acc.measuredBlanks + (f.measuredBlanks ?? 0),
    fieldsBound: acc.fieldsBound + (f.fieldsBound ?? 0),
    valuesWritten: acc.valuesWritten + (f.valuesWritten ?? 0),
    protectedOrRefused: acc.protectedOrRefused + (f.protectedOrRefused ?? 0),
    unfittable: acc.unfittable + (f.unfittable ?? 0),
    contactSheets: acc.contactSheets + (f.contactSheet ? 1 : 0)
  }), { fieldsInventoried: 0, measuredBlanks: 0, fieldsBound: 0, valuesWritten: 0, protectedOrRefused: 0, unfittable: 0, contactSheets: 0 });

  writeJson(path.join(outDir, "jurisdiction-summary.json"), {
    schemaVersion: "rcap-official-forms-jurisdiction-summary/v1",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jobId: `T-D2B-${state.code}-production-packet`,
    jurisdiction: state.code,
    jurisdictionName: state.name,
    edition: SOURCE_PACK.edition,
    sourcePack: SOURCE_PACK.name,
    sourcePackSha256: SOURCE_PACK.sha256,
    families: families.map((f) => ({
      familySlug: f.familySlug, documentId: f.documentId, language: f.language,
      componentRole: f.componentRole ?? null, documentOwnership: f.documentOwnership ?? null,
      structuralClass: f.structuralClass ?? null, status: f.status
    })),
    totals,
    stateHolds: state.readmeHolds,
    statePackFidelity: {
      basis: PROFILE_FIDELITY_BASIS,
      compiledProfile: `src/lib/rcap-engine/compiled/profiles/${state.profile}`,
      legacyPdfEntries: fidelity.legacyPdfCount ?? 0,
      matchedEditionOneBinaries: fidelity.matched ?? 0,
      findings: fidelity.findings
    },
    reviewStatus: "qa_review_pending",
    buildStatus: "state_built",
    note: "Build status and review status are tracked separately. Nothing here is approved for live."
  });

  // The lane-scoped index. The two shared indexes under
  // data/rcap-all50/overlays/production/ are written by the captain at import;
  // seven lanes run concurrently and would collide on them.
  writeJson(path.join(outDir, "state-index.json"), {
    schemaVersion: "rcap-lane-state-index/v1",
    lane: LANE,
    factoryVersion: FACTORY_VERSION,
    jurisdiction: state.code,
    jurisdictionSlug: state.slug,
    mergeTarget: [
      "data/rcap-all50/overlays/production/verified-binary-index.json",
      "data/rcap-all50/overlays/production/implementation-index.json"
    ],
    mergeNote: "Written lane-scoped on purpose. The captain merges these entries into the two shared indexes at import; this lane never writes them.",
    sourcePack: SOURCE_PACK,
    verifiedBinaries: families.map((f) => ({
      familySlug: f.familySlug,
      documentId: f.documentId,
      language: f.language,
      sha256: f.sha256 ?? null,
      sha256MatchesManifest: f.sha256MatchesManifest ?? false,
      structuralClass: f.structuralClass ?? null,
      renderStrategy: f.renderStrategy ?? null,
      packagePath: `data/rcap-all50/overlays/production/${state.slug}/${f.familySlug}`,
      implementationStatus: f.status,
      generationAllowed: false,
      holds: f.holds ?? [],
      findings: f.findings ?? []
    })),
    totals
  });

  return { state, families, totals, fidelity };
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = only.length > 0 ? STATES.filter((s) => only.includes(s.code) || only.includes(s.slug)) : STATES;
  const results = [];
  for (const state of targets) {
    process.stdout.write(`\n=== ${state.name} (${state.code}) ===\n`);
    results.push(await buildState(state));
  }

  process.stdout.write("\n=== lane totals ===\n");
  const grand = results.reduce((a, r) => ({
    families: a.families + r.families.length,
    fieldsInventoried: a.fieldsInventoried + r.totals.fieldsInventoried,
    measuredBlanks: a.measuredBlanks + r.totals.measuredBlanks,
    fieldsBound: a.fieldsBound + r.totals.fieldsBound,
    valuesWritten: a.valuesWritten + r.totals.valuesWritten,
    protectedOrRefused: a.protectedOrRefused + r.totals.protectedOrRefused,
    unfittable: a.unfittable + r.totals.unfittable,
    contactSheets: a.contactSheets + r.totals.contactSheets
  }), { families: 0, fieldsInventoried: 0, measuredBlanks: 0, fieldsBound: 0, valuesWritten: 0, protectedOrRefused: 0, unfittable: 0, contactSheets: 0 });
  process.stdout.write(`${JSON.stringify(grand, null, 2)}\n`);
}

await main();
