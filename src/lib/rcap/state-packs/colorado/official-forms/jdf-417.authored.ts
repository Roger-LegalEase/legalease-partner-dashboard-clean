// JDF 417 — Petition to Seal Arrest and Criminal Records, No Charges Filed.
// C.R.S. § 24-72-704. Revision of July 1, 2025. Three pages, 62 AcroForm fields.
//
// Every field on the form is named below exactly once. Fifty-nine are written
// from participant facts, participant elections or facts the document itself
// establishes; three are the execution block and are never written.
//
// The form has no judge, clerk, prosecutor or agency widget: its only
// court-use region is the case-event-code box at the top right of page 1,
// which is printed text with no field behind it. That is a finding about this
// document, not an assumption — the census lists 62 fields and each one is
// accounted for here.
import type { AuthoredFormSpec } from "./authoring";

/** The nine offence rows on page 2, each a description and a grade. */
const OFFENCE_ROWS = Array.from({ length: 9 }, (_, i) => {
  const row = i + 1;
  return [
    {
      field: `4A.${row}A`,
      section: "4. Offenses — a) List of Offenses",
      label: `Listed Offense, row ${row}`,
      fieldClass: "participant" as const,
      rationale:
        "The offence as it is written in the criminal records to be sealed. Bound only when the participant supplied a charge in this row.",
      factId: "matter.charges[].charge",
      repeatIndex: i,
      required: row <= 2,
    },
    {
      field: `4A.${row}B`,
      section: "4. Offenses — a) List of Offenses",
      label: `Misdemeanor or Felony, row ${row}`,
      fieldClass: "election_control" as const,
      rationale:
        "The grade the record gives the offence in this row. Bound only when the participant supplied both a charge and its grade.",
      factId: "matter.charges[].grade",
      repeatIndex: i,
      dropdown: [
        { option: "Misdemeanor", value: "Misdemeanor" },
        { option: "Felony", value: "Felony" },
      ],
      required: row <= 2,
    },
  ];
}).flat();

export const JDF_417_AUTHORED: AuthoredFormSpec = {
  specVersion: "co-jdf-417-binding/2026-08-29.1",
  family: "jdf-417-form-petition-en",
  documentId: "JDF-417",
  documentRole: "PETITION",
  revision: "REV-2025-07-01",
  fields: [
    // ---- A. Court -------------------------------------------------------
    {
      field: "Title",
      section: "A. Court — heading",
      label: "Petition or Motion",
      fieldClass: "derived",
      rationale:
        "The heading selector. Its value is the role the document's own source record gives it, PETITION, not a choice the participant makes.",
      factId: "derived.document_role_title",
      dropdown: [{ option: "Petition", value: "Petition" }],
      required: true,
    },
    {
      field: "Dropdown1",
      section: "A. Court",
      label: "Type: (ex: County or District)",
      fieldClass: "election_control",
      rationale: "Which Colorado trial court the arrest records sit in.",
      factId: "matter.court_type",
      dropdown: [
        { option: "County Court", value: "county" },
        { option: "District Court", value: "district" },
      ],
      required: true,
    },
    {
      field: "County",
      section: "A. Court",
      label: "Colorado County:",
      fieldClass: "participant",
      rationale: "The county whose court the petition is filed in.",
      factId: "matter.county",
      required: true,
    },
    {
      field: "Court Address",
      section: "A. Court",
      label: "Court Address:",
      fieldClass: "participant",
      rationale:
        "The filing destination: the street address of the court the petition goes to. Given its own fact id so it can never be reached through a participant address descriptor, which is how the earlier binder mis-read it and why review withheld it.",
      factId: "filing.court_address",
      required: true,
    },

    // ---- B. Parties / C. Case Details ------------------------------------
    {
      field: "∆",
      section: "B. Parties to the Case",
      label: "Petitioner (or Defendant):",
      fieldClass: "participant",
      rationale:
        "The caption party: the person whose criminal justice records are the subject of the petition, who is not always the person filing it.",
      factId: "person_in_interest.full_legal_name",
      required: true,
    },
    {
      field: "Case Number",
      section: "C. Case Details",
      label: "Number:",
      fieldClass: "participant",
      rationale: "The existing case number the records sit under.",
      factId: "matter.case_number",
      required: true,
    },
    {
      field: "D/C",
      section: "C. Case Details",
      label: "Division/Courtroom:",
      fieldClass: "participant",
      rationale:
        "The division or courtroom already assigned to the case. Copied from the participant's own case record; blank when they do not have it.",
      factId: "matter.division_or_courtroom",
    },

    // ---- 1. My Information ----------------------------------------------
    {
      field: "1.1",
      section: "1. My Information",
      label: "Name",
      fieldClass: "participant",
      rationale:
        "The filer's name. The same field is drawn again on page 3 as 'Print Your Name', so one binding fills both; a printed name is not a signature.",
      factId: "participant.full_legal_name",
      required: true,
    },
    {
      field: "1.2",
      section: "1. My Information",
      label: "Date of Birth:",
      fieldClass: "participant",
      rationale: "The filer's date of birth.",
      factId: "participant.date_of_birth",
      required: true,
    },
    {
      field: "∆ Street Address",
      section: "1. My Information",
      label: "Mailing Address:",
      fieldClass: "participant",
      rationale: "The filer's mailing street address.",
      factId: "participant.street_address",
      required: true,
    },
    {
      field: "∆ City",
      section: "1. My Information",
      label: "City, State, & Zip:",
      fieldClass: "participant",
      rationale:
        "The label asks for city, state and ZIP together and the widget is drawn 263 points wide to hold all three. The earlier binding wrote the city alone, which left a filed address without a state or a ZIP.",
      factId: "participant.city_state_zip",
      required: true,
    },
    {
      field: "1.5",
      section: "1. My Information",
      label: "Phone:",
      fieldClass: "participant",
      rationale: "The filer's telephone number.",
      factId: "participant.phone",
      required: true,
    },
    {
      field: "1.6",
      section: "1. My Information",
      label: "Email:",
      fieldClass: "participant",
      rationale: "The filer's email address.",
      factId: "participant.email",
      required: true,
    },
    {
      field: "Group1.7",
      section: "1. My Information",
      label: "Do you need an interpreter?",
      fieldClass: "election_control",
      rationale:
        "An access election the participant makes. The 'No' widget is drawn to the left of 'Yes', so the options are pinned in the order the page prints them.",
      factId: "election.interpreter_needed",
      choices: [
        { label: "No", value: "no" },
        { label: "Yes, in (language)", value: "yes" },
      ],
      required: true,
    },
    {
      field: "1.8",
      section: "1. My Information",
      label: "Yes, in (language)",
      fieldClass: "participant",
      rationale:
        "The language requested. Written only when the interpreter election is yes, so a language can never appear beside an unticked box.",
      factId: "election.interpreter_language",
      condition: { factId: "election.interpreter_needed", equals: "yes" },
    },
    {
      field: "Group1.9",
      section: "1. My Information",
      label: "I want to attend court events:",
      fieldClass: "election_control",
      rationale: "How the participant elects to appear.",
      factId: "election.appearance_mode",
      choices: [
        { label: "In-person", value: "in_person" },
        { label: "Virtually (by phone or web video)", value: "virtual" },
      ],
      required: true,
    },

    // ---- 2. I am ---------------------------------------------------------
    {
      field: "Group2.0",
      section: "2. I am (check only one)",
      label: "The capacity in which I file",
      fieldClass: "election_control",
      rationale:
        "Who the filer is in relation to the person in interest. This election governs section 2's four text fields, which are written only when the filer is someone else.",
      factId: "election.filer_capacity",
      choices: [
        { label: "The Person in Interest", value: "person_in_interest" },
        { label: "The designated representative of the Person in Interest", value: "designated_representative" },
        { label: "The parent of the Person in Interest", value: "parent" },
        { label: "The appointed legal representative of the Person in Interest", value: "appointed_legal_representative" },
      ],
      required: true,
    },
    {
      field: "2.1",
      section: "2. I am — person in interest",
      label: "Name:",
      fieldClass: "participant",
      rationale:
        "The person in interest's name, required only when the filer is not that person.",
      factId: "person_in_interest.full_legal_name",
      condition: { factId: "election.filer_is_person_in_interest", equals: "no" },
    },
    {
      field: "2.2",
      section: "2. I am — person in interest",
      label: "Date of Birth:",
      fieldClass: "participant",
      rationale: "The person in interest's date of birth, on the same condition.",
      factId: "person_in_interest.date_of_birth",
      condition: { factId: "election.filer_is_person_in_interest", equals: "no" },
    },
    {
      field: "2.3",
      section: "2. I am — person in interest",
      label: "Mailing Address:",
      fieldClass: "participant",
      rationale: "The person in interest's mailing address, on the same condition.",
      factId: "person_in_interest.mailing_address",
      condition: { factId: "election.filer_is_person_in_interest", equals: "no" },
    },
    {
      field: "2.4",
      section: "2. I am — person in interest",
      label: "Phone:",
      fieldClass: "participant",
      rationale: "The person in interest's telephone number, on the same condition.",
      factId: "person_in_interest.phone",
      condition: { factId: "election.filer_is_person_in_interest", equals: "no" },
    },

    // ---- 3. Records to be Sealed ----------------------------------------
    {
      field: "3A.0",
      section: "3. Records to be Sealed",
      label: "Prosecuting Attorney",
      fieldClass: "election_control",
      rationale:
        "Whether the prosecuting attorney is one of the agencies served. The box records the participant's service election; it is not a field the prosecutor completes.",
      factId: "service.prosecuting_attorney_served",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "3B.0",
      section: "3. Records to be Sealed",
      label: "Sheriff's Department",
      fieldClass: "election_control",
      rationale: "Whether the sheriff's department is served.",
      factId: "service.sheriff_served",
      checkedWhen: "yes",
    },
    {
      field: "3B.1",
      section: "3. Records to be Sealed",
      label: "Mailing Address:",
      fieldClass: "participant",
      rationale:
        "The sheriff's mailing address. Written only when the sheriff is elected for service, so an address never appears beside an unticked agency.",
      factId: "service.sheriff_mailing_address",
      condition: { factId: "service.sheriff_served", equals: "yes" },
    },
    {
      field: "3C",
      section: "3. Records to be Sealed",
      label: "Colorado Bureau of Investigation (Required)",
      fieldClass: "derived",
      rationale:
        "The form prints '(Required)' beside this box and prints the Bureau's address for the participant. The tick follows the document's own statement, not an inference about the participant's case.",
      factId: "derived.cbi_required",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "3D.0",
      section: "3. Records to be Sealed",
      label: "Law Enforcement: (Agency Name)",
      fieldClass: "election_control",
      rationale: "Whether a law enforcement agency is served.",
      factId: "service.law_enforcement_served",
      checkedWhen: "yes",
    },
    {
      field: "3D.1",
      section: "3. Records to be Sealed",
      label: "Law Enforcement: (Agency Name)",
      fieldClass: "participant",
      rationale: "The law enforcement agency's name, on the law-enforcement election.",
      factId: "service.law_enforcement_agency_name",
      condition: { factId: "service.law_enforcement_served", equals: "yes" },
    },
    {
      field: "4D.2",
      section: "3. Records to be Sealed",
      label: "Agency Mailing Address:",
      fieldClass: "participant",
      rationale:
        "The law enforcement agency's mailing address. The field is named 4D.2 but is drawn in section 3 beneath the agency-name row; its rectangle, not its name, decides what it is.",
      factId: "service.law_enforcement_agency_address",
      condition: { factId: "service.law_enforcement_served", equals: "yes" },
    },
    {
      field: "3D.3",
      section: "3. Records to be Sealed",
      label: "Agency Case Number:",
      fieldClass: "participant",
      rationale: "The agency's own case number, on the law-enforcement election.",
      factId: "service.law_enforcement_agency_case_number",
      condition: { factId: "service.law_enforcement_served", equals: "yes" },
    },
    {
      field: "3E.0",
      section: "3. Records to be Sealed",
      label: "Other: (name)",
      fieldClass: "election_control",
      rationale: "Whether a further agency is served.",
      factId: "service.other_agency_served",
      checkedWhen: "yes",
    },
    {
      field: "3E.1",
      section: "3. Records to be Sealed",
      label: "Other: (name)",
      fieldClass: "participant",
      rationale: "The further agency's name, on the other-agency election.",
      factId: "service.other_agency_name",
      condition: { factId: "service.other_agency_served", equals: "yes" },
    },
    {
      field: "3E.2",
      section: "3. Records to be Sealed",
      label: "Mailing Address:",
      fieldClass: "participant",
      rationale: "The further agency's mailing address, on the other-agency election.",
      factId: "service.other_agency_address",
      condition: { factId: "service.other_agency_served", equals: "yes" },
    },
    {
      field: "3F.1",
      section: "3. Records to be Sealed",
      label: "Arrest/Summons Number: (from fingerprint card)",
      fieldClass: "participant",
      rationale: "The arrest or summons number, taken from the fingerprint card.",
      factId: "matter.arrest_or_summons_number",
      required: true,
    },
    {
      field: "3F.2",
      section: "3. Records to be Sealed",
      label: "Date of Arrest/Summons:",
      fieldClass: "participant",
      rationale: "The date of the arrest or summons.",
      factId: "matter.arrest_date",
      required: true,
    },

    // ---- 4. Offenses -----------------------------------------------------
    ...OFFENCE_ROWS,
    {
      field: "4B.0",
      section: "4. Offenses — b)",
      label: "Were charges ever filed in court? (yes or no)",
      fieldClass: "election_control",
      rationale:
        "An eligibility stop. C.R.S. § 24-72-704 is the no-charges-filed route, so this answer decides whether the petition belongs on this form at all.",
      factId: "election.charges_ever_filed",
      dropdown: [
        { option: "Yes.", value: "yes" },
        { option: "No.", value: "no" },
      ],
      required: true,
    },
    {
      field: "4C.0",
      section: "4. Offenses — c)",
      label: "Did you successfully complete a diversion agreement? (yes or no)",
      fieldClass: "election_control",
      rationale: "A qualification election under the same statute.",
      factId: "election.completed_diversion",
      dropdown: [
        { option: "Yes.", value: "yes" },
        { option: "No.", value: "no" },
      ],
      required: true,
    },
    {
      field: "4D.0",
      section: "4. Offenses — d)",
      label: "Has the statute of limitations passed on all these charges? (yes or no)",
      fieldClass: "election_control",
      rationale: "A qualification election under the same statute.",
      factId: "election.statute_of_limitations_passed",
      dropdown: [
        { option: "Yes.", value: "yes" },
        { option: "No.", value: "no" },
      ],
      required: true,
    },
    {
      field: "4E.0",
      section: "4. Offenses — e)",
      label: "Are you still being investigated for these charges? (yes or no)",
      fieldClass: "election_control",
      rationale:
        "An objection stop: an open investigation is the ground on which this petition is refused.",
      factId: "election.still_under_investigation",
      dropdown: [
        { option: "Yes.", value: "yes" },
        { option: "No.", value: "no" },
      ],
      required: true,
    },

    // ---- 5. Certificate of Service ---------------------------------------
    {
      field: "CoS_Date",
      section: "5. Certificate of Service",
      label: "On (enter service date)",
      fieldClass: "participant",
      rationale:
        "The date the participant served the agencies. Review previously withheld it on the ground that the certificate block names the served party rather than the participant — true of the recipient fields, but the service date is the participant's own act and the certificate is unusable without it.",
      factId: "service.service_date",
      required: true,
    },
    {
      field: "GroupCoS",
      section: "5. Certificate of Service",
      label: "I certify that I sent a copy of this document to all the agencies I checked in Section 3 by:",
      fieldClass: "election_control",
      rationale:
        "How service was made. The widgets are stored e-filing, other, regular mail but are drawn e-filing, regular mail, other, so the options are pinned to the printed order.",
      factId: "service.method",
      choices: [
        { label: "Colorado Courts E-Filing. (only available to lawyers)", value: "e_filing" },
        { label: "Regular Mail, using the addresses entered in Section 3.", value: "regular_mail" },
        { label: "Other: (explain)", value: "other" },
      ],
      required: true,
    },
    {
      field: "CoS_Other",
      section: "5. Certificate of Service",
      label: "Other: (explain)",
      fieldClass: "narrative",
      rationale:
        "The participant's own explanation of a service method the form does not list. Transcribed verbatim and written only when 'Other' is the elected method.",
      factId: "service.other_method_explanation",
      condition: { factId: "service.method", equals: "other" },
    },

    // ---- 6. Sign & Date --------------------------------------------------
    {
      field: "Sig",
      section: "6. Sign & Date",
      label: "Signature:",
      fieldClass: "protected",
      protectedCategory: "participant_signature",
      rationale: "The participant executes this personally.",
    },
    {
      field: "Sig_Date",
      section: "6. Sign & Date",
      label: "Date:",
      fieldClass: "protected",
      protectedCategory: "participant_execution_date",
      rationale:
        "The date inside the execution block. A date here asserts when the participant signed, and they have not.",
    },
    {
      field: "Sig_Aty",
      section: "6. Sign & Date",
      label: "Counsel Signature: (if any)",
      fieldClass: "protected",
      protectedCategory: "counsel_signature",
      rationale: "Counsel executes this personally.",
    },
  ],
};
