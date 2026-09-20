// JDF 612 — Motion to Seal Conviction Records (District or County Court
// Conviction). C.R.S. §§ 24-72-703, 706 and 707. Revision of August 7, 2024.
// Five pages, 63 AcroForm fields.
//
// Fifty-eight fields are written from participant facts, participant elections
// or facts the document establishes about itself. Five are the execution
// block: the participant's signature and its date, counsel's signature, and
// counsel's "Esq." attestation and registration number. None is written.
//
// Two of this form's readings need stating because the page does not read the
// way its field order does. Section 7(c) prints "No." above "Yes.", the
// reverse of every other yes/no pair on the form, so its options are pinned by
// geometry. And the form's text layer is drawn with a transposed encoding —
// "Sheriff's Department" decodes as "Sheriff¶s De Sartment" — so each
// entry carries a reviewed label and, separately, the machine-read evidence.
import type { AuthoredFormSpec } from "./authoring";

const YES_NO = [
  { label: "Yes.", value: "yes" },
  { label: "No.", value: "no" },
] as const;

export const JDF_612_AUTHORED: AuthoredFormSpec = {
  specVersion: "co-jdf-612-binding/2026-08-29.1",
  family: "jdf-612-form-motion-en",
  documentId: "JDF-612",
  documentRole: "MOTION",
  revision: "REV-2024-08-07",
  fields: [
    // ---- 1. Court --------------------------------------------------------
    {
      field: "Group_CourtType",
      section: "1. Court",
      label: "District or County",
      fieldClass: "election_control",
      rationale: "Which Colorado trial court entered the conviction.",
      factId: "matter.court_type",
      choices: [
        { label: "District", value: "district" },
        { label: "County", value: "county" },
      ],
      required: true,
    },
    {
      field: "County",
      section: "1. Court",
      label: "Colorado County:",
      fieldClass: "participant",
      rationale: "The county whose court the motion is filed in.",
      factId: "matter.county",
      required: true,
    },
    {
      field: "Court Address",
      section: "1. Court",
      label: "Court Address",
      fieldClass: "participant",
      rationale:
        "The filing destination: the street address of the court the motion goes to. Given its own fact id so a participant address descriptor can never reach it, which is why review withheld it before.",
      factId: "filing.court_address",
      required: true,
    },

    // ---- 2. Parties / 3. Case Details ------------------------------------
    {
      field: "∆",
      section: "2. Parties to the Case",
      label: "Defendant",
      fieldClass: "participant",
      rationale:
        "The caption defendant. The same field is drawn again on page 5 as 'Print Your Name', so one binding fills both; a printed name is not a signature.",
      factId: "participant.full_legal_name",
      required: true,
    },
    {
      field: "Case Number",
      section: "3. Case Details",
      label: "Number",
      fieldClass: "participant",
      rationale: "The case number the conviction was entered under.",
      factId: "matter.case_number",
      required: true,
    },
    {
      field: "Division",
      section: "3. Case Details",
      label: "Division",
      fieldClass: "participant",
      rationale: "The division already assigned to the case, when the participant has it.",
      factId: "matter.division",
    },
    {
      field: "Courtroom",
      section: "3. Case Details",
      label: "Courtroom",
      fieldClass: "participant",
      rationale: "The courtroom already assigned to the case, when the participant has it.",
      factId: "matter.courtroom",
    },

    // ---- 5. My Information -----------------------------------------------
    {
      field: "∆ DoB",
      section: "5. My Information (the Defendant)",
      label: "Date of Birth:",
      fieldClass: "participant",
      rationale: "The defendant's date of birth.",
      factId: "participant.date_of_birth",
      required: true,
    },
    {
      field: "Address",
      section: "5. My Information (the Defendant)",
      label: "Mailing Address (with city/state/zip)",
      fieldClass: "participant",
      rationale:
        "The label asks for the address with city, state and ZIP and the widget is drawn 278 points wide to hold them. The earlier binding wrote the street line alone, leaving a filed address with no city, state or ZIP.",
      factId: "participant.mailing_address_full",
      required: true,
    },
    {
      field: "Phone",
      section: "5. My Information (the Defendant)",
      label: "Phone:",
      fieldClass: "participant",
      rationale: "The defendant's telephone number.",
      factId: "participant.phone",
      required: true,
    },
    {
      field: "Email",
      section: "5. My Information (the Defendant)",
      label: "Email",
      fieldClass: "participant",
      rationale: "The defendant's email address.",
      factId: "participant.email",
      required: true,
    },

    // ---- 6. Records to be Sealed — agencies -------------------------------
    {
      field: "6A.0",
      section: "6. Records to be Sealed",
      label: "District or County Court, Case Number",
      fieldClass: "election_control",
      rationale: "Whether the court's own records are among those to be sealed.",
      factId: "service.court_records_included",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "6A.1",
      section: "6. Records to be Sealed",
      label: "District or County Court, Case Number",
      fieldClass: "participant",
      rationale: "The court case number whose records are to be sealed.",
      factId: "matter.case_number",
      condition: { factId: "service.court_records_included", equals: "yes" },
    },
    {
      field: "6B.0",
      section: "6. Records to be Sealed",
      label: "Prosecuting Attorney",
      fieldClass: "election_control",
      rationale:
        "Whether the prosecuting attorney is served. The box records the participant's election; it is not a field the prosecutor completes.",
      factId: "service.prosecuting_attorney_served",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "6C.0",
      section: "6. Records to be Sealed",
      label: "Sheriff's Department",
      fieldClass: "election_control",
      rationale: "Whether the sheriff's department is served.",
      factId: "service.sheriff_served",
      checkedWhen: "yes",
    },
    {
      field: "6C.1",
      section: "6. Records to be Sealed",
      label: "Mailing Address",
      fieldClass: "participant",
      rationale: "The sheriff's mailing address, written only on the sheriff election.",
      factId: "service.sheriff_mailing_address",
      condition: { factId: "service.sheriff_served", equals: "yes" },
    },
    {
      field: "6D.0",
      section: "6. Records to be Sealed",
      label: "Colorado Bureau of Investigation (Required)",
      fieldClass: "derived",
      rationale:
        "The form prints '(Required)' beside this box and prints the Bureau's address for the participant. The tick follows the document's own statement.",
      factId: "derived.cbi_required",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "6E.0",
      section: "6. Records to be Sealed",
      label: "Law Enforcement: (Name)",
      fieldClass: "election_control",
      rationale: "Whether a first law enforcement agency is served.",
      factId: "service.law_enforcement_1_served",
      checkedWhen: "yes",
    },
    {
      field: "6E.1",
      section: "6. Records to be Sealed",
      label: "Law Enforcement: (Name)",
      fieldClass: "participant",
      rationale: "The first law enforcement agency's name.",
      factId: "service.law_enforcement_1_name",
      condition: { factId: "service.law_enforcement_1_served", equals: "yes" },
    },
    {
      field: "6E.2",
      section: "6. Records to be Sealed",
      label: "Case Number:",
      fieldClass: "participant",
      rationale: "The first law enforcement agency's own case number.",
      factId: "service.law_enforcement_1_case_number",
      condition: { factId: "service.law_enforcement_1_served", equals: "yes" },
    },
    {
      field: "6E.3",
      section: "6. Records to be Sealed",
      label: "Mailing Address",
      fieldClass: "participant",
      rationale: "The first law enforcement agency's mailing address.",
      factId: "service.law_enforcement_1_address",
      condition: { factId: "service.law_enforcement_1_served", equals: "yes" },
    },
    {
      field: "6F.0",
      section: "6. Records to be Sealed",
      label: "Law Enforcement: (Name)",
      fieldClass: "election_control",
      rationale: "Whether a second law enforcement agency is served.",
      factId: "service.law_enforcement_2_served",
      checkedWhen: "yes",
    },
    {
      field: "6F.1",
      section: "6. Records to be Sealed",
      label: "Law Enforcement: (Name)",
      fieldClass: "participant",
      rationale: "The second law enforcement agency's name.",
      factId: "service.law_enforcement_2_name",
      condition: { factId: "service.law_enforcement_2_served", equals: "yes" },
    },
    {
      field: "6F.2",
      section: "6. Records to be Sealed",
      label: "Case Number:",
      fieldClass: "participant",
      rationale: "The second law enforcement agency's own case number.",
      factId: "service.law_enforcement_2_case_number",
      condition: { factId: "service.law_enforcement_2_served", equals: "yes" },
    },
    {
      field: "6F.3",
      section: "6. Records to be Sealed",
      label: "Mailing Address",
      fieldClass: "participant",
      rationale: "The second law enforcement agency's mailing address.",
      factId: "service.law_enforcement_2_address",
      condition: { factId: "service.law_enforcement_2_served", equals: "yes" },
    },
    {
      field: "6G.0",
      section: "6. Records to be Sealed",
      label: "Other",
      fieldClass: "election_control",
      rationale: "Whether a first further agency is served.",
      factId: "service.other_agency_1_served",
      checkedWhen: "yes",
    },
    {
      field: "6G.1",
      section: "6. Records to be Sealed",
      label: "Other",
      fieldClass: "participant",
      rationale: "The first further agency's name.",
      factId: "service.other_agency_1_name",
      condition: { factId: "service.other_agency_1_served", equals: "yes" },
    },
    {
      field: "6G.2",
      section: "6. Records to be Sealed",
      label: "Mailing Address",
      fieldClass: "participant",
      rationale: "The first further agency's mailing address.",
      factId: "service.other_agency_1_address",
      condition: { factId: "service.other_agency_1_served", equals: "yes" },
    },
    {
      field: "6H.0",
      section: "6. Records to be Sealed",
      label: "Other",
      fieldClass: "election_control",
      rationale: "Whether a second further agency is served.",
      factId: "service.other_agency_2_served",
      checkedWhen: "yes",
    },
    {
      field: "6H.1",
      section: "6. Records to be Sealed",
      label: "Other",
      fieldClass: "participant",
      rationale: "The second further agency's name.",
      factId: "service.other_agency_2_name",
      condition: { factId: "service.other_agency_2_served", equals: "yes" },
    },
    {
      field: "6H.2",
      section: "6. Records to be Sealed",
      label: "Mailing Address",
      fieldClass: "participant",
      rationale: "The second further agency's mailing address.",
      factId: "service.other_agency_2_address",
      condition: { factId: "service.other_agency_2_served", equals: "yes" },
    },

    // ---- 7. Offense Information -------------------------------------------
    {
      field: "7A.0",
      section: "7. Offense Information",
      label: "Petty Offense(s) of",
      fieldClass: "election_control",
      rationale: "Whether the case includes a petty offence conviction.",
      factId: "conviction.petty_offenses_present",
      checkedWhen: "yes",
    },
    {
      field: "7A.1",
      section: "7. Offense Information",
      label: "Petty Offense(s) of",
      fieldClass: "participant",
      rationale: "The petty offences, written only when that box is ticked.",
      factId: "conviction.petty_offenses",
      condition: { factId: "conviction.petty_offenses_present", equals: "yes" },
    },
    {
      field: "7B.0",
      section: "7. Offense Information",
      label: "Misdemeanor Offense(s) of",
      fieldClass: "election_control",
      rationale: "Whether the case includes a misdemeanour conviction.",
      factId: "conviction.misdemeanor_offenses_present",
      checkedWhen: "yes",
      required: true,
    },
    {
      field: "7B.1",
      section: "7. Offense Information",
      label: "Misdemeanor Offense(s) of",
      fieldClass: "participant",
      rationale: "The misdemeanour offences, written only when that box is ticked.",
      factId: "conviction.misdemeanor_offenses",
      condition: { factId: "conviction.misdemeanor_offenses_present", equals: "yes" },
      required: true,
    },
    {
      field: "7C.0",
      section: "7. Offense Information",
      label: "Felony Offense(s) of",
      fieldClass: "election_control",
      rationale: "Whether the case includes a felony conviction.",
      factId: "conviction.felony_offenses_present",
      checkedWhen: "yes",
    },
    {
      field: "7C.1",
      section: "7. Offense Information",
      label: "Felony Offense(s) of",
      fieldClass: "participant",
      rationale: "The felony offences, written only when that box is ticked.",
      factId: "conviction.felony_offenses",
      condition: { factId: "conviction.felony_offenses_present", equals: "yes" },
    },
    {
      field: "7D",
      section: "7. Offense Information",
      label: "Date Sentenced:",
      fieldClass: "participant",
      rationale: "The date sentence was imposed.",
      factId: "conviction.sentence_date",
      required: true,
    },
    {
      field: "7E",
      section: "7. Offense Information",
      label: "Probation/Parole Supervision Termination Date:",
      fieldClass: "participant",
      rationale:
        "The date supervision ended. The waiting period under C.R.S. § 24-72-706 runs from it, so it is the fact the court measures eligibility against.",
      factId: "conviction.supervision_termination_date",
      required: true,
    },
    {
      field: "Group_7A",
      section: "7. Offense Information — a) Drug Offenses",
      label: "Were any of these drug offenses committed before October 1, 2013?",
      fieldClass: "election_control",
      rationale:
        "A qualification election. The note beside it reserves the eligibility decision to the court, so the product records the answer and nothing more.",
      factId: "election.drug_offense_before_2013_10_01",
      choices: [...YES_NO],
      required: true,
    },
    {
      field: "Group_7B",
      section: "7. Offense Information — b) Psilocybin Offenses",
      label:
        "Do the charges involve psilocybin or psilocyn and the listed statutes, and is the act no longer unlawful?",
      fieldClass: "election_control",
      rationale: "A qualification election under the psilocybin provisions.",
      factId: "election.psilocybin_conduct_no_longer_unlawful",
      choices: [...YES_NO],
      required: true,
    },
    {
      field: "Group_7C",
      section: "7. Offense Information — c) Victim of Human Trafficking",
      label:
        "Were you a victim of human trafficking and you committed the offense as a result of the trafficking?",
      fieldClass: "election_control",
      rationale:
        "A qualification election under C.R.S. § 24-72-707. This pair alone prints No above Yes, so the options are pinned in the order the page draws them.",
      factId: "election.human_trafficking_victim",
      choices: [
        { label: "No.", value: "no" },
        { label: "Yes. Eligibility under C.R.S. § 24-72-707", value: "yes" },
      ],
      required: true,
    },

    // ---- 8. Eligibility ---------------------------------------------------
    {
      field: "Group_8B",
      section: "8. Eligibility — b) My Eligibility",
      label: "I qualify to have my conviction records sealed because my conviction:",
      fieldClass: "election_control",
      rationale: "Which of the two eligibility grounds the participant relies on.",
      factId: "election.eligibility_ground",
      choices: [
        { label: "Is eligible for sealing under C.R.S. §§ 24-72-706 or 707.", value: "eligible_706_or_707" },
        {
          label: "A misdemeanor offense that is not eligible for sealing under C.R.S. § 24-72-706.",
          value: "misdemeanor_not_eligible_706",
        },
      ],
      required: true,
    },
    {
      field: "Group_8B_1",
      section: "8. Eligibility — b) My Eligibility",
      label: "Check one:",
      fieldClass: "election_control",
      rationale:
        "The district attorney's position, which decides whether the motion proceeds on consent, on a hearing, or on the clear-and-convincing showing. An objection stop, and the participant's own account of it.",
      factId: "election.district_attorney_position",
      condition: { factId: "election.eligibility_ground", equals: "misdemeanor_not_eligible_706" },
      choices: [
        { label: "The district attorney consents to the sealing.", value: "consents" },
        {
          label: "I request a hearing to determine if the district attorney consents to the sealing.",
          value: "hearing_requested",
        },
        { label: "The district attorney does not consent to the sealing.", value: "does_not_consent" },
      ],
    },
    {
      field: "8B.2",
      section: "8. Eligibility — b) My Eligibility",
      label:
        "If the District Attorney does not consent, show by clear and convincing evidence that ...",
      fieldClass: "narrative",
      rationale:
        "The participant's own showing. Transcribed verbatim and written only where the district attorney does not consent; the product never composes this argument.",
      factId: "narrative.clear_and_convincing_showing",
      condition: { factId: "election.district_attorney_position", equals: "does_not_consent" },
    },

    // ---- 9. Case Process ---------------------------------------------------
    {
      field: "Group_9A",
      section: "9. Case Process — a) Automatic Sealing",
      label:
        "Do you believe the Court should have already sealed this case automatically under C.R.S. § 13-3-117?",
      fieldClass: "election_control",
      rationale: "A qualification election about the automatic-sealing route.",
      factId: "election.believes_automatic_sealing_applies",
      choices: [...YES_NO],
      required: true,
    },
    {
      field: "Group_9B",
      section: "9. Case Process — b) Appeals",
      label: "Was this case appealed?",
      fieldClass: "election_control",
      rationale: "Whether an appeal was taken; it governs the four appeal fields beneath it.",
      factId: "election.case_appealed",
      choices: [...YES_NO],
      required: true,
    },
    {
      field: "9B.1",
      section: "9. Case Process — b) Appeals",
      label: "Appeal Case Number:",
      fieldClass: "participant",
      rationale: "The appeal's case number, written only where an appeal was taken.",
      factId: "appeal.case_number",
      condition: { factId: "election.case_appealed", equals: "yes" },
    },
    {
      field: "9B.2",
      section: "9. Case Process — b) Appeals",
      label: "Appellate Court:",
      fieldClass: "election_control",
      rationale: "Which court heard the appeal, from the three the form offers.",
      factId: "appeal.court",
      condition: { factId: "election.case_appealed", equals: "yes" },
      dropdown: [
        { option: "District Court", value: "district_court" },
        { option: "Colorado Court of Appeals", value: "court_of_appeals" },
        { option: "Colorado Supreme Court", value: "supreme_court" },
      ],
    },
    {
      field: "9B.3",
      section: "9. Case Process — b) Appeals",
      label: "Result:",
      fieldClass: "participant",
      rationale: "The appeal's result, in the participant's words.",
      factId: "appeal.result",
      condition: { factId: "election.case_appealed", equals: "yes" },
    },
    {
      field: "9B.4",
      section: "9. Case Process — b) Appeals",
      label: "Date:",
      fieldClass: "participant",
      rationale:
        "The date of the appellate result. Outside the execution block, so it is an ordinary case fact.",
      factId: "appeal.result_date",
      condition: { factId: "election.case_appealed", equals: "yes" },
    },
    {
      field: "Group_9C",
      section: "9. Case Process — c) Restitution",
      label: "Do you still owe restitution?",
      fieldClass: "election_control",
      rationale:
        "An objection stop: outstanding restitution is a ground on which sealing is refused.",
      factId: "election.restitution_outstanding",
      choices: [...YES_NO],
      required: true,
    },

    // ---- 10. Criminal Record ------------------------------------------------
    {
      field: "Group_10",
      section: "10. Criminal Record",
      label:
        "Is a verified copy of your criminal history record (dated within the last 20 days) attached?",
      fieldClass: "election_control",
      rationale:
        "A filing requirement the form makes conditional. Answering No starts the ten-day clock the section prints, so the answer is the participant's and is recorded as given.",
      factId: "election.criminal_history_attached",
      choices: [...YES_NO],
      required: true,
    },

    // ---- 11. Harm or Adverse Consequences -----------------------------------
    {
      field: "11.1",
      section: "11. Harm or Adverse Consequences",
      label:
        "Show that your privacy or the danger of unwarranted adverse consequences outweighs the public interest in retaining the records.",
      fieldClass: "narrative",
      rationale:
        "The participant's own showing, transcribed verbatim. The product does not compose it and does not supply one when the participant has not written one.",
      factId: "narrative.harm_or_adverse_consequences",
    },

    // ---- 12. Certificate of Service ------------------------------------------
    {
      field: "CoS_Date",
      section: "12. Certificate of Service",
      label: "On (enter service date)",
      fieldClass: "participant",
      rationale:
        "The date the participant served the prosecuting attorney. The participant's own act; the certificate is unusable without it.",
      factId: "service.service_date",
      required: true,
    },
    {
      field: "Group_CoS",
      section: "12. Certificate of Service",
      label: "I certify that I sent a copy of this document to the prosecuting attorney by:",
      fieldClass: "election_control",
      rationale: "How service was made.",
      factId: "service.method",
      choices: [
        { label: "Colorado Courts E-Filing. (only available to lawyers)", value: "e_filing" },
        { label: "Regular Mail, addressed to:", value: "regular_mail" },
        { label: "Other: (explain)", value: "other" },
      ],
      required: true,
    },
    {
      field: "CoS_Mail",
      section: "12. Certificate of Service",
      label: "Name & full address:",
      fieldClass: "participant",
      rationale:
        "The name and address the copy was mailed to — the served recipient, written only where regular mail is the elected method.",
      factId: "service.mail_recipient_name_and_address",
      condition: { factId: "service.method", equals: "regular_mail" },
    },
    {
      field: "CoS_Other",
      section: "12. Certificate of Service",
      label: "Other: (explain)",
      fieldClass: "narrative",
      rationale:
        "The participant's own explanation of a service method the form does not list, transcribed verbatim.",
      factId: "service.other_method_explanation",
      condition: { factId: "service.method", equals: "other" },
    },

    // ---- 13. Sign & Date -----------------------------------------------------
    {
      field: "Sig1_Signature",
      section: "13. Sign & Date",
      label: "Signature:",
      fieldClass: "protected",
      protectedCategory: "participant_signature",
      rationale: "The participant executes this personally.",
    },
    {
      field: "Sig1_Date",
      section: "13. Sign & Date",
      label: "Date:",
      fieldClass: "protected",
      protectedCategory: "participant_execution_date",
      rationale:
        "The date inside the execution block. A date here asserts when the participant signed, and they have not.",
    },
    {
      field: "Sig_LawyerSignature",
      section: "13. Sign & Date",
      label: "Counsel Signature: (if any)",
      fieldClass: "protected",
      protectedCategory: "counsel_signature",
      rationale: "Counsel executes this personally.",
    },
    {
      field: "Sig_Esq",
      section: "13. Sign & Date",
      label: "Esq.",
      fieldClass: "protected",
      protectedCategory: "counsel_attestation",
      rationale:
        "Counsel's attestation that they are admitted. The product is not counsel and may not assert an admission.",
    },
    {
      field: "Sig_Bar",
      section: "13. Sign & Date",
      label: "Reg No.",
      fieldClass: "protected",
      protectedCategory: "counsel_attestation",
      rationale: "Counsel's attorney registration number, which only counsel may state.",
    },
  ],
};
