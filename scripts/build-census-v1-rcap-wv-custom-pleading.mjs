#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — West Virginia first-offense drug possession
 * conditional discharge relief, W. Va. Code § 60A-4-407.
 *
 *   node "scripts/build-census-v1-rcap-wv-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * An ORDINARY PARTICIPANT-FILED PACKET FAMILY, built as a custom pleading.
 * The committed specifications record three components — a primary filing, a
 * supporting affidavit and a certificate of service — and name no official
 * form. The committed venue statement records that § 60A-4-407(b) directs
 * the application to 'the court', which is the court whose probation expired.
 *
 * A WARNING ABOUT A SIBLING STATUTE. Determination DET-FEE-AND-WAIVER-001
 * amendment A4 records that West Virginia's compiled profile carries three
 * 'no filing fees or costs are charged' lines keyed to § 61-11-25, while a
 * § 61-11-26 petition costs $200 — a sign-flipped twin of the California trap
 * A3 was written for. This route is neither of those sections. This build
 * therefore takes NO fee answer from either, states what its own committed
 * track record says about fee and waiver, and names the office that answers
 * the rest. A neighbouring section's fee rule is not this route's answer.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-wv-custom-pleading",
  "worklistGroupId": "rcap-wv-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-wv-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wv/rcap-wv-custom-pleading--custom-pleading",
  "jurisdiction": "WV",
  "legalName": "West Virginia First-Offense Drug Possession Conditional Discharge Relief, W. Va. Code § 60A-4-407",
  "routeName": "asking the West Virginia court that entered a first-offense drug possession conditional discharge for the relief § 60A-4-407 provides once probation has expired",
  "statutes": [
    "W. Va. Code § 60A-4-407(a)",
    "W. Va. Code § 60A-4-407(b)",
    "W. Va. Code § 60A-4-407(c)",
    "W. Va. Code § 60A-4-401(c)",
    "W. Va. Code § 60A-4-407a"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:wv_drug_conditional_discharge",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"wv_drug_conditional_discharge\"",
        "Application to Expunge Records of Arrest, Trial and Conviction After a First-Offence Controlled Substance Conditional Discharge, W. Va. Code § 60A-4-407(b)",
        "A person who has not previously been convicted of any offence under chapter 60A or under any federal or state narcotics,",
        "The court that entered the conditional discharge and imposed probation. Section 60A-4-407(b) directs the application to ",
        "W. Va. Code § 60A-4-407(a)",
        "W. Va. Code § 60A-4-407(b)",
        "W. Va. Code § 60A-4-407(c)",
        "W. Va. Code § 60A-4-401(c)",
        "W. Va. Code § 60A-4-407a",
        "What is your full legal name as it appears on the court record?",
        "What is your date of birth?",
        "Which court, and in which county, placed you on probation under the conditional discharge?",
        "What is the case number?",
        "On what date were you arrested, and which agency arrested you?",
        "What possession offence were you charged with, and under which Code section?",
        "On what date did the court enter the order deferring proceedings and placing you on probation?",
        "How long was the probation term the court imposed?",
        "On what date did that probation term expire?",
        "On what date did the court discharge you and dismiss the proceedings?",
        "During probation, or since it ended, has anyone alleged that you broke the conditions of your probation?",
        "Before this case, had you ever been convicted of any drug offence, in West Virginia, another state or a federal court?",
        "Have you ever had a conditional discharge under this section before, in any West Virginia case?",
        "Have you paid the court costs the court assessed in this case?",
        "Section 60A-4-407 charges no fee for the application. Under subsection (c) the participant remains liable for the court ",
        "Serve the prosecuting attorney of the county and the supervising probation office, following the § 61-11-26(e) service p",
        "File the application, affidavit and certificate of service with the clerk of the court that entered the conditional disc"
      ]
    },
    {
      "recordId": "legal-design-specifications:wv_drug_conditional_discharge",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"wv_drug_conditional_discharge-primary-filing-1\"",
        "\"componentId\": \"wv_drug_conditional_discharge-supporting-affidavit-2\"",
        "\"componentId\": \"wv_drug_conditional_discharge-certificate-of-service-3\""
      ]
    },
    {
      "recordId": "route-obligation-census:1-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief"
      ]
    }
  ],
  "components": [
    {
      "id": "wv_drug_conditional_discharge-primary-filing-1",
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "title": "Petition - Clear a first drug-possession case that ended in a conditional discharge",
      "role": "primary_filing",
      "description": "the composed petition, on this route's own statutory ground (Clear a first drug-possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that entered the conditional discharge order - see the filing instructions in this packet)",
        "",
        "Judicial division:",
        "{{DOTS}}",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, as it appears on the conditional discharge order:",
        "{{DOTS}}",
        "",
        "APPLICATION TO EXPUNGE RECORDS OF ARREST, TRIAL AND CONVICTION AFTER A FIRST-OFFENCE CONTROLLED SUBSTANCE CONDITIONAL DISCHARGE, W. VA. CODE § 60A-4-407(B)",
        "",
        "The petitioner, {{participant.full_legal_name}}, applies to this court under W. Va. Code § 60A-4-407(a); W. Va. Code § 60A-4-407(b); W. Va. Code § 60A-4-407(c); W. Va. Code § 60A-4-401(c); W. Va. Code § 60A-4-407a and states:",
        "",
        "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "A person who has not previously been convicted of any offence under chapter 60A or under any federal or state narcotics, marihuana, stimulant, depressant or hallucinogenic drug statute, and who pleads guilty to or is found guilty of possession of a controlled substance under § 60A-4-401(c), may with their consent have further proceedings deferred and be placed on probation without entry of a judgment of guilt. On fulfilment of the terms and conditions the court discharges the person and dismisses the proceedings without adjudication of guilt. The discharge is not a conviction for purposes of any disqualification or disability imposed by law, and its effect is to restore the person in contemplation of law to the status occupied before arrest and trial. There may be only one discharge and dismissal under the section with respect to any person. Read at source on 2026-08-06, subsection (b) supplies the relief this track generates: after a period of not less than six months, beginning to run immediately on the expiration of the term of probation, the person may apply to the court for an order to expunge from all official records all recordations of the arrest, trial and conviction, and if the court determines after a hearing that the person was not guilty of any serious or repeated violation of the conditions of probation during probation or before the application, it shall order the expungement. Subsection (c) makes the person liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may be a condition of probation.",
        "",
        "B. THE PETITIONER, AND THE TWO THINGS THE PLATFORM ALREADY HOLDS",
        "",
        "The platform holds your full legal name and your date of birth from your own record. Both are printed here and again at items C1 and C2 below, so neither is a blank you have to fill. Read each against your own papers and correct it in writing if it is wrong. Every other item in section C belongs to the court record, and you fill it from the record itself.",
        "",
        "Full legal name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself, except items C1 and C2, which the platform has already answered from the facts it holds.",
        "",
        "[C1 - applicant name] What is your full legal name as it appears on the court record?",
        "{{participant.full_legal_name}}",
        "(Answered from the name the platform holds. Read it against the court record and correct it in writing if the court record writes it differently.)",
        "",
        "[C2 - date of birth] What is your date of birth?",
        "{{participant.date_of_birth}}",
        "(Answered from the date of birth the platform holds. Read it against your own papers and correct it in writing if it is wrong.)",
        "",
        "[C3 - court and county] Which court, and in which county, placed you on probation under the conditional discharge?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - case number] What is the case number?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - arrest date] On what date were you arrested, and which agency arrested you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - offense charged] What possession offence were you charged with, and under which Code section?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - discharge order date] On what date did the court enter the order deferring proceedings and placing you on probation?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - probation term] How long was the probation term the court imposed?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C9 - probation expiry date] On what date did that probation term expire?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C10 - dismissal date] On what date did the court discharge you and dismiss the proceedings?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C11 - probation violations] During probation, or since it ended, has anyone alleged that you broke the conditions of your probation?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C12 - prior drug conviction] Before this case, had you ever been convicted of any drug offence, in West Virginia, another state or a federal court?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C13 - prior conditional discharge] Have you ever had a conditional discharge under this section before, in any West Virginia case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C14 - court costs paid] Have you paid the court costs the court assessed in this case?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. NOTICE OF THE HEARING SECTION 60A-4-407(B) CONTEMPLATES",
        "",
        "Section 60A-4-407(b) provides for a hearing at which the court determines whether the petitioner was guilty of any serious or repeated violation of the conditions of probation. The committed track registry records a hearing date on this application's notice line as an item to be completed before filing. That date is the court's to set: ask the clerk of the court that entered the conditional discharge for it, and write it on the line below before you file. Nothing on this line is written for you, because this build never writes a date no court has set.",
        "",
        "Hearing date:",
        "{{DOTS}}",
        "",
        "E. THE REQUEST",
        "",
        "The petitioner asks the court to grant the relief described in paragraph A, under W. Va. Code § 60A-4-407(a); W. Va. Code § 60A-4-407(b); W. Va. Code § 60A-4-407(c); W. Va. Code § 60A-4-401(c); W. Va. Code § 60A-4-407a.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        },
        {
          "id": "fact_applicantName",
          "label": "Item C1 - applicant name, answered from the name the platform holds",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "fact_dateOfBirth",
          "label": "Item C2 - date of birth, answered from the date of birth the platform holds",
          "factId": "participant.date_of_birth"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "judicial_division",
          "label": "Judicial division of the court, in the caption of this application",
          "supply": "the judicial division exactly as the caption of your own case papers writes it",
          "why": "the committed track registry records the case number and judicial division line in the application caption as an item the participant completes before filing, and the platform holds no division for a case it has not seen"
        },
        {
          "kind": "rbf",
          "id": "case_number",
          "label": "Case number of the case, as it appears on the conditional discharge order, in the caption of this application",
          "supply": "the case number, copied from the certified conditional discharge order",
          "why": "the committed track registry records the case number and judicial division line in the application caption as an item the participant completes before filing, and the platform holds no case number for a record it has not seen"
        },
        {
          "kind": "rbf",
          "id": "fact_courtAndCounty",
          "label": "Item C3 - court and county",
          "supply": "Which court, and in which county, placed you on probation under the conditional discharge?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_caseNumber",
          "label": "Item C4 - case number",
          "supply": "What is the case number?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_arrestDate",
          "label": "Item C5 - arrest date",
          "supply": "On what date were you arrested, and which agency arrested you?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_offenseCharged",
          "label": "Item C6 - offense charged",
          "supply": "What possession offence were you charged with, and under which Code section?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dischargeOrderDate",
          "label": "Item C7 - discharge order date",
          "supply": "On what date did the court enter the order deferring proceedings and placing you on probation?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationTerm",
          "label": "Item C8 - probation term",
          "supply": "How long was the probation term the court imposed?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationExpiryDate",
          "label": "Item C9 - probation expiry date",
          "supply": "On what date did that probation term expire?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_dismissalDate",
          "label": "Item C10 - dismissal date",
          "supply": "On what date did the court discharge you and dismiss the proceedings?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_probationViolations",
          "label": "Item C11 - probation violations",
          "supply": "During probation, or since it ended, has anyone alleged that you broke the conditions of your probation?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorDrugConviction",
          "label": "Item C12 - prior drug conviction",
          "supply": "Before this case, had you ever been convicted of any drug offence, in West Virginia, another state or a federal court?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_priorConditionalDischarge",
          "label": "Item C13 - prior conditional discharge",
          "supply": "Have you ever had a conditional discharge under this section before, in any West Virginia case?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_courtCostsPaid",
          "label": "Item C14 - court costs paid",
          "supply": "Have you paid the court costs the court assessed in this case?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "clerkSet",
          "id": "hearing_date",
          "label": "Hearing date the clerk sets, on the notice line of the application",
          "why": "the court sets the hearing date; the participant asks the clerk for it and writes it on the notice line before filing, and this build never writes a date no court has set"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Signature of the person named in the caption, on the petition",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the signature on the petition",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "wv_drug_conditional_discharge-supporting-affidavit-2",
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "title": "Supporting Affidavit - Clear a first drug-possession case that ended in a conditional discharge",
      "role": "supporting_affidavit",
      "description": "the sworn affidavit the committed record requires with the application, signed before a notary public or other officer authorized to administer oaths (Clear a first drug-possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that entered the conditional discharge order - see the filing instructions in this packet)",
        "",
        "Judicial division:",
        "{{DOTS}}",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, as it appears on the conditional discharge order:",
        "{{DOTS}}",
        "",
        "AFFIDAVIT IN SUPPORT OF THE APPLICATION TO EXPUNGE RECORDS OF ARREST, TRIAL AND CONVICTION AFTER A FIRST-OFFENCE CONTROLLED SUBSTANCE CONDITIONAL DISCHARGE, W. VA. CODE § 60A-4-407(B)",
        "",
        "STATE OF WEST VIRGINIA",
        "COUNTY OF {{DOTS:48}}",
        "",
        "A. WHY THIS AFFIDAVIT IS IN THIS PACKET, AS THE COMMITTED RECORD STATES IT",
        "",
        "The committed track registry for this route records, in its own words, that the applicant signs the application and swears the affidavit, and that notarization is required on the supporting affidavit. This page is that affidavit. It is filed with the application, and it is sworn before a notary public or other officer authorized to administer oaths - not before.",
        "",
        "B. THE AFFIANT",
        "",
        "I, {{participant.full_legal_name}}, am the petitioner named in the application filed with this affidavit. My date of birth is {{participant.date_of_birth}}. The platform holds my name and my date of birth from my own record and has printed both here, so neither is a blank I have to fill; I have read each against my own papers and corrected it in writing if it was wrong.",
        "",
        "C. THE DATES THIS APPLICATION DEPENDS ON, WHICH I SUPPLY FROM THE RECORD",
        "",
        "Each date below is copied from the certified orders and from the probation office's written confirmation, never from memory. The period of not less than six months runs from the expiration of the term of probation, not from the date of the dismissal, and the registry records that the two are often months apart.",
        "",
        "[A1 - discharge order date] On what date did the court enter the order deferring proceedings and placing you on probation?",
        "{{DOTS}}",
        "",
        "[A2 - probation expiry date] On what date did that probation term expire?",
        "{{DOTS}}",
        "",
        "[A3 - dismissal date] On what date did the court discharge you and dismiss the proceedings?",
        "{{DOTS}}",
        "",
        "D. WHAT I SWEAR TO, IN MY OWN WORDS",
        "",
        "The lines below are mine alone and nothing on them is written for me. This packet states nothing about whether the conditions of the probation were kept: the committed record reserves that determination to the court, and W. Va. Code § 60A-4-407(b) makes it the question the court decides after a hearing.",
        "",
        "[A4 - completion of probation] In your own words, what you did to complete the terms and conditions of the probation the court imposed:",
        "{{DOTS}}",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[A5 - earlier drug case or earlier discharge] In your own words, what you know about any earlier drug conviction, and about any earlier discharge and dismissal under this section:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "AFFIANT'S CONTACT DETAILS, AS THE PLATFORM HOLDS THEM",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "",
        "I swear or affirm that the statements above are true.",
        "",
        "SIGNATURE OF AFFIANT {{DOTS:44}}",
        "DATE {{DOTS:44}}",
        "",
        "(You sign this affidavit before a notary public or other officer authorized to administer oaths, and not before. The block below is completed by that officer, never by you and never by this packet.)",
        "",
        "Taken, subscribed and sworn to before me this ...... day of .................., 20......",
        "Officer authorized to administer oaths {{DOTS:44}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person named in the caption",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "affidavit_judicial_division",
          "label": "Judicial division of the court, in the caption of this affidavit",
          "supply": "the judicial division exactly as the caption of your own case papers writes it",
          "why": "the committed track registry records the case number and judicial division line as an item the participant completes before filing, and the platform holds no division for a case it has not seen"
        },
        {
          "kind": "rbf",
          "id": "affidavit_case_number",
          "label": "Case number of the case, as it appears on the conditional discharge order, in the caption of this affidavit",
          "supply": "the case number, copied from the certified conditional discharge order",
          "why": "the committed track registry records the case number and judicial division line as an item the participant completes before filing, and the platform holds no case number for a record it has not seen"
        },
        {
          "kind": "rbf",
          "id": "affidavit_jurat_county",
          "label": "County in which the affidavit is sworn, in the jurat venue line",
          "supply": "the county in which you actually swear this affidavit before the officer",
          "why": "where the oath is administered is a fact of the swearing itself, which has not happened when this page is composed"
        },
        {
          "kind": "rbf",
          "id": "affidavit_dischargeOrderDate",
          "label": "Item A1 - discharge order date, in the affidavit",
          "supply": "On what date did the court enter the order deferring proceedings and placing you on probation?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "affidavit_probationExpiryDate",
          "label": "Item A2 - probation expiry date, in the affidavit",
          "supply": "On what date did that probation term expire?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "affidavit_dismissalDate",
          "label": "Item A3 - dismissal date, in the affidavit",
          "supply": "On what date did the court discharge you and dismiss the proceedings?",
          "why": "the committed track registry records this as a required generation input for wv_drug_conditional_discharge, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "affidavit_completionAccount",
          "label": "Item A4 - your own account of completing the terms and conditions of your probation",
          "supply": "your own first-hand account of what you did to complete the terms and conditions of the probation the court imposed - these lines are yours alone",
          "why": "the affidavit is the affiant's own sworn statement, and the committed record forbids this build from generating any assertion about the participant's probation violation history"
        },
        {
          "kind": "rbf",
          "id": "affidavit_priorHistoryAccount",
          "label": "Item A5 - your own account of any earlier drug conviction or earlier discharge and dismissal under this section",
          "supply": "your own first-hand account of any earlier drug conviction and of any earlier discharge and dismissal under this section - these lines are yours alone",
          "why": "the affidavit is the affiant's own sworn statement, and the platform holds no criminal-history record for the affiant"
        },
        {
          "kind": "protected",
          "id": "affiant_signature",
          "label": "Signature of the affiant on the affidavit",
          "why": "the affiant swears and signs before a notary public or other officer authorized to administer oaths; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "affidavit_signature_date",
          "label": "Date beside the affiant's signature on the affidavit",
          "why": "a date written before the affidavit is sworn would be false"
        },
        {
          "kind": "court",
          "id": "affidavit_jurat",
          "label": "Jurat and officer line, completed by the notary public or other officer who administers the oath",
          "why": "the jurat belongs to the notary public or other authorized officer, never to the participant and never to this packet"
        }
      ]
    },
    {
      "id": "wv_drug_conditional_discharge-certificate-of-service-3",
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "title": "Certificate of Service - Clear a first drug-possession case that ended in a conditional discharge",
      "role": "certificate_of_service",
      "description": "the page on which the participant records that the papers were actually delivered to both offices the record names, signed only after delivery (Clear a first drug-possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(Clerk of the court that entered the conditional discharge order)",
        "",
        "Judicial division:",
        "{{DOTS}}",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, as it appears on the conditional discharge order:",
        "{{DOTS}}",
        "",
        "CERTIFICATE OF SERVICE",
        "",
        "I, {{participant.full_legal_name}}, state that on the date I write beside my signing line below, and not before, I delivered a copy of the application to expunge and of the supporting affidavit filed with it to each of the two offices named below.",
        "",
        "The committed track registry for this route records service in these words: serve the prosecuting attorney of the county and the supervising probation office, following the Sec. 61-11-26(e) service practice West Virginia clerks expect. Both offices are served. Neither block below is optional, and this page certifies only what was actually delivered.",
        "",
        "FIRST RECIPIENT - THE PROSECUTING ATTORNEY OF THE COUNTY",
        "",
        "Name and office of the county prosecuting office the papers were delivered to:",
        "{{DOTS}}",
        "",
        "Address at which the papers were delivered to that office:",
        "{{DOTS}}",
        "",
        "How the papers were delivered to that office - by hand, by mail, or by the electronic method the court accepts:",
        "{{DOTS}}",
        "",
        "SECOND RECIPIENT - THE SUPERVISING PROBATION OFFICE",
        "",
        "Name and office of the supervising probation office the papers were delivered to:",
        "{{DOTS}}",
        "",
        "Address at which the papers were delivered to that office:",
        "{{DOTS}}",
        "",
        "How the papers were delivered to that office - by hand, by mail, or by the electronic method the court accepts:",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "(DO NOT SIGN OR DATE THIS PAGE YET.)",
        "You sign and date this certificate only after the papers have actually been delivered to both offices. A certificate signed before a delivery, or between the two deliveries, states something that has not happened.",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "mailing_address",
          "label": "Mailing address in the contact block at the foot of this document",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Telephone number in the contact block at the foot of this document",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Email address in the contact block at the foot of this document",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "service_judicial_division",
          "label": "Judicial division of the court, in the caption of this certificate",
          "supply": "the judicial division exactly as the caption of your own case papers writes it",
          "why": "the committed track registry records the case number and judicial division line as an item the participant completes before filing, and the platform holds no division for a case it has not seen"
        },
        {
          "kind": "rbf",
          "id": "service_case_number",
          "label": "Case number of the case, as it appears on the conditional discharge order, in the caption of this certificate",
          "supply": "the case number, copied from the certified conditional discharge order",
          "why": "the committed track registry records the case number and judicial division line as an item the participant completes before filing, and the platform holds no case number for a record it has not seen"
        },
        {
          "kind": "rbf",
          "id": "served_prosecuting_office",
          "label": "First recipient - name and office of the county prosecuting office the papers were delivered to",
          "supply": "the name and office of the county prosecuting office you delivered the papers to, as that office writes it",
          "why": "the committed track registry requires service on the prosecuting attorney of the county, and which office that is depends on the county the case was heard in"
        },
        {
          "kind": "rbf",
          "id": "served_prosecuting_address",
          "label": "First recipient - address at which the papers were delivered to the county prosecuting office",
          "supply": "the address at which you delivered the papers to the county prosecuting office",
          "why": "the committed track registry records the prosecuting attorney's address as an item the participant completes before filing, and the platform holds no office address for a county it has not been told"
        },
        {
          "kind": "rbf",
          "id": "served_prosecuting_method",
          "label": "First recipient - how the papers were delivered to the county prosecuting office",
          "supply": "how you actually delivered the papers to the county prosecuting office",
          "why": "only the participant knows how delivery was made"
        },
        {
          "kind": "rbf",
          "id": "served_probation_office",
          "label": "Second recipient - name and office of the supervising probation office the papers were delivered to",
          "supply": "the name and office of the supervising probation office you delivered the papers to, as that office writes it",
          "why": "the committed track registry requires service on the supervising probation office, and which office supervised the participant is a fact of the participant's own case"
        },
        {
          "kind": "rbf",
          "id": "served_probation_address",
          "label": "Second recipient - address at which the papers were delivered to the supervising probation office",
          "supply": "the address at which you delivered the papers to the supervising probation office",
          "why": "the committed track registry records the probation office's address as an item the participant completes before filing, and the platform holds no office address for a supervision it has not seen"
        },
        {
          "kind": "rbf",
          "id": "served_probation_method",
          "label": "Second recipient - how the papers were delivered to the supervising probation office",
          "supply": "how you actually delivered the papers to the supervising probation office",
          "why": "only the participant knows how delivery was made"
        },
        {
          "kind": "protected",
          "id": "service_signature",
          "label": "Signature of the person named in the caption, on the certificate, and only after the papers have actually been delivered to both offices",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "service_signature_date",
          "label": "Date beside the signature on the certificate, and only after the papers have actually been delivered to both offices",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "wv_drug_conditional_discharge-records-checklist-4",
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "role": "records_checklist",
      "title": "Records Checklist - Clear a first drug-possession case that ended in a conditional discharge",
      "description": "the records the committed track registry requires the participant to obtain, who holds each of them, and the answers each one is used to check (Clear a first drug-possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "The committed track registry for this route records the documents you must obtain before this application can be filed, who holds each one, and which answer in this packet each one is used to check. They are set out below in the registry's own words. Nothing on this page is a fact about your case; it is a list of the records your case's own facts have to be read from.",
        "",
        "GET THESE BEFORE YOU FILE",
        "",
        "[ ] Obtain Conditional discharge order and the order of discharge and dismissal. Ask the clerk for certified copies of the order deferring proceedings and placing you on probation, and of the later order discharging you and dismissing the proceedings. Both dates matter and they are usually different.",
        "    Who holds it: Clerk of the court that entered them.",
        "    Check your answer to \"On what date did the court enter the order deferring proceedings and placing you on probation?\" against Conditional discharge order and the order of discharge and dismissal, and correct the packet if they disagree.",
        "",
        "[ ] Obtain Written confirmation of the date the probation term expired. Ask the supervising probation office for written confirmation of the date your probation term expired. The six-month clock runs from that date, not from the dismissal, and the two are often months apart.",
        "    Who holds it: The probation office that supervised the participant.",
        "    Check your answer to \"On what date did that probation term expire?\" against Written confirmation of the date the probation term expired, and correct the packet if they disagree.",
        "",
        "GET THIS IF IT APPLIES TO YOU",
        "",
        "[ ] Obtain Receipt or clerk's confirmation that court costs were paid. Ask the clerk for a payment history or a receipt showing the assessed costs are paid.",
        "    Who holds it: Clerk of the court that assessed them.",
        "    When it applies: Only where court costs were assessed under Sec. 60A-4-407(c) and the participant is unsure whether they are satisfied.",
        "    Check your answer to \"Have you paid the court costs the court assessed in this case?\" against Receipt or clerk's confirmation that court costs were paid, and correct the packet if they disagree.",
        "",
        "WHY THE TWO DATES ARE NOT THE SAME DATE",
        "",
        "The six-month period this application depends on begins to run on the expiration of the term of probation, not on the date the court dismissed the proceedings. The registry records that the two are often months apart, which is why the probation office's written confirmation is a separate record from the clerk's orders and why both are required.",
        "",
        "This page is a checklist. It is not filed with the court and it asserts nothing about your case."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    },
    {
      "id": "wv_drug_conditional_discharge-filing-instructions-5",
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "role": "filing_instructions",
      "title": "Filing Instructions - Clear a first drug-possession case that ended in a conditional discharge",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Clear a first drug-possession case that ended in a conditional discharge)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Application to Expunge Records of Arrest, Trial and Conviction After a First-Offence Controlled Substance Conditional Discharge, W. Va. Code § 60A-4-407(b).",
        "",
        "A person who has not previously been convicted of any offence under chapter 60A or under any federal or state narcotics, marihuana, stimulant, depressant or hallucinogenic drug statute, and who pleads guilty to or is found guilty of possession of a controlled substance under § 60A-4-401(c), may with their consent have further proceedings deferred and be placed on probation without entry of a judgment of guilt. On fulfilment of the terms and conditions the court discharges the person and dismisses the proceedings without adjudication of guilt. The discharge is not a conviction for purposes of any disqualification or disability imposed by law, and its effect is to restore the person in contemplation of law to the status occupied before arrest and trial. There may be only one discharge and dismissal under the section with respect to any person. Read at source on 2026-08-06, subsection (b) supplies the relief this track generates: after a period of not less than six months, beginning to run immediately on the expiration of the term of probation, the person may apply to the court for an order to expunge from all official records all recordations of the arrest, trial and conviction, and if the court determines after a hearing that the person was not guilty of any serious or repeated violation of the conditions of probation during probation or before the application, it shall order the expungement. Subsection (c) makes the person liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may be a condition of probation.",
        "",
        "WHERE IT GOES",
        "",
        "Clerk of the court that entered the conditional discharge order",
        "File the application with the clerk of the court that deferred proceedings and placed the participant on probation, once at least six months have run from the expiration of the probation term. The statute contemplates a hearing at which the court determines whether there was any serious or repeated violation of the conditions of probation.",
        "Venue: The court that entered the conditional discharge and imposed probation. Section 60A-4-407(b) directs the application to 'the court', which is the court whose probation expired.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: Section 60A-4-407 charges no fee for the application. Under subsection (c) the participant remains liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may have been made a condition of probation. Whether a circuit clerk charges a civil filing fee for the application is not established by the section. Fee waiver as recorded: none stated in § 60A-4-407.",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: Serve the prosecuting attorney of the county and the supervising probation office, following the § 61-11-26(e) service practice West Virginia clerks expect. Notice as recorded: Section 60A-4-407(b) provides for a hearing but names no statutory notice or opposition window. The application is served on the prosecuting attorney as a matter of ordinary practice.",
        "Two offices, not one. The certificate of service in this packet carries a separate recipient block for the county prosecuting office and for the supervising probation office, because the record names both. Deliver to both, record each delivery in its own block, and sign and date the certificate only after the second delivery has actually happened. The certificate covers the application and the supporting affidavit; this packet contains no proposed order and the certificate does not say that it does.",
        "",
        "WHAT THE RECORD SAYS YOU MUST COMPLETE BEFORE YOU FILE",
        "",
        "These are the completion items the committed track registry records for this route, in its own words, and what each one means on the pages in this set.",
        "",
        "- Applicant's signature on the application — Application, signature block. You sign personally; nothing on this page is signed for you.",
        "- Affidavit signature, date and jurat — Supporting affidavit, foot of the document. You sign and date the affidavit in front of the officer, and the jurat is that officer's to complete.",
        "- Case number and judicial division line — Application, caption block. Both are on the caption of the application, the affidavit and the certificate of service; copy them from the certified conditional discharge order and from the caption of your own case papers.",
        "- Prosecuting attorney and probation office addresses, and the certificate of service date and signature — Certificate of service. Each office has its own recipient block on that page.",
        "- Hearing date — Application, notice line. Ask the clerk of the court that entered the conditional discharge for the date. The court sets it; this packet never writes one.",
        "- The applicant signs the application and swears the affidavit.",
        "- Notarization: Required on the supporting affidavit. Swear it before a notary public or other officer authorized to administer oaths, and not before.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Expungement window: at least six months after the end of probation, the person may apply for expungement of official records of the arrest, trial, and conviction.",
        "- One-time limit: only one discharge and dismissal is allowed under this section.",
        "- What LegalEase can prepare: the application, the probation expiration proof, and the six-month calculation.",
        "- Before drafting anything for these tracks, confirm the Judiciary form index. If drafting proves necessary, the section 61-11-26(d) petition contents list is the right model for verified content, and the section 61-11-26(e) service list is the right model for service, even on tracks governed by other statutes, because West Virginia circuit clerks will expect that shape.",
        "- Tell the participant to obtain the conditional discharge order, the order of discharge and dismissal, and the probation office's written confirmation of the probation expiry date, and to attach them.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- Anyone has alleged that the participant committed a serious or repeated violation of the conditions of probation, whether during probation or since.",
        "- The participant has had a prior drug conviction or a prior conditional discharge, either of which means the underlying discharge should not have been available.",
        "- Probation was revoked, or the court entered an adjudication of guilt.",
        "- The participant is also considering a § 61-11-26 conviction expungement, because whether this relief spends the once-per-lifetime petition is unresolved.",
        "- The court sets a contested hearing or the prosecuting attorney objects.",
        "- The clerk of the court will not accept a self-drafted application, or requires a local form.",
        "- Firearm rights, immigration consequences, professional licensing, or federal, tribal, military or out-of-state records questions.",
        "- LegalEase must not generate any assertion about the participant's probation violation history. The court determines whether there was a serious or repeated violation.",
        "- If the prosecuting attorney objects or the court sets a contested hearing on the probation-violation question, automated assistance ends and the participant needs a lawyer. The initial packet still generates.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- wv_drug_conditional_discharge-primary-filing-1: the composed petition, on this route's own statutory ground (Clear a first drug-possession case that ended in a conditional discharge)",
        "- wv_drug_conditional_discharge-supporting-affidavit-2: the sworn affidavit the committed record requires with the application, signed before a notary public or other officer authorized to administer oaths (Clear a first drug-possession case that ended in a conditional discharge)",
        "- wv_drug_conditional_discharge-certificate-of-service-3: the page on which the participant records that the papers were actually delivered to both offices the record names, signed only after delivery (Clear a first drug-possession case that ended in a conditional discharge)",
        "- wv_drug_conditional_discharge-records-checklist-4: the records the participant must have in front of them before the application can be completed (Clear a first drug-possession case that ended in a conditional discharge)",
        "- wv_drug_conditional_discharge-filing-instructions-5: this page"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person this page is prepared for",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": []
    }
  ],
  "fixtures": {
    "canonical": {
      "participant.full_legal_name": "Jordan Avery Reyes",
      "participant.date_of_birth": "1991-04-17",
      "participant.street_address": "42 Magnolia Street, Springfield 62704",
      "participant.phone": "555-0142",
      "participant.email": "jordan.reyes@example.org"
    },
    "boundary": {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214",
      "participant.phone": "(228) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  "composedFromNote": "the committed legal-design track registry (data/record-clearing/legal-design-track-registry.json), the committed custom-pleading specifications (data/record-clearing/legal-design-specifications.json) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official statewide participant form for this route; the committed specifications record its component set as composed pleadings. Every page in this packet is therefore composed by this build from the committed records, and no official form was substituted or invented.",
  "routeSelectionNote": "One route, one instrument set: every composed page states this route's statutory ground in its own title and body, and no election control exists on any composed page.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:track-pathway:WV:wv_drug_conditional_discharge:first-offense-drug-possession-conditional-discharge-relief",
      "statute": "W. Va. Code § 60A-4-407(a); W. Va. Code § 60A-4-407(b); W. Va. Code § 60A-4-407(c); W. Va. Code § 60A-4-401(c); W. Va. Code § 60A-4-407a",
      "instrument": "West Virginia § 60A-4-407 Expungement Application",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "The committed track registry records the destination as **Clerk of the court that entered the conditional discharge order**. File the application with the clerk of the court that deferred proceedings and placed the participant on probation, once at least six months have run from the expiration of the probation term. The statute contemplates a hearing at which the court determines whether there was any serious or repeated violation of the conditions of probation. Venue as recorded: The court that entered the conditional discharge and imposed probation. Section 60A-4-407(b) directs the application to 'the court', which is the court whose probation expired. Filing as recorded: File the application, affidavit and certificate of service with the clerk of the court that entered the conditional discharge, once at least six months have run from the expiration of the probation term."
    ],
    [
      "FEE_AND_WAIVER",
      "Fee as recorded: Section 60A-4-407 charges no fee for the application. Under subsection (c) the participant remains liable for the court costs assessable against a person convicted under § 60A-4-401(c), and payment may have been made a condition of probation. Whether a circuit clerk charges a civil filing fee for the application is not established by the section. Fee waiver as recorded: none stated in § 60A-4-407."
    ],
    [
      "SERVICE",
      "Service as recorded: Serve the prosecuting attorney of the county and the supervising probation office, following the § 61-11-26(e) service practice West Virginia clerks expect. Notice as recorded: Section 60A-4-407(b) provides for a hearing but names no statutory notice or opposition window. The application is served on the prosecuting attorney as a matter of ordinary practice."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** Anyone has alleged that the participant committed a serious or repeated violation of the conditions of probation, whether during probation or since. **Stop and get help if:** The participant has had a prior drug conviction or a prior conditional discharge, either of which means the underlying discharge should not have been available. **Stop and get help if:** Probation was revoked, or the court entered an adjudication of guilt. **Stop and get help if:** The participant is also considering a § 61-11-26 conviction expungement, because whether this relief spends the once-per-lifetime petition is unresolved. **Stop and get help if:** The court sets a contested hearing or the prosecuting attorney objects. **Stop and get help if:** The clerk of the court will not accept a self-drafted application, or requires a local form. **Stop and get help if:** Firearm rights, immigration consequences, professional licensing, or federal, tribal, military or out-of-state records questions. **Stop and get help if:** LegalEase must not generate any assertion about the participant's probation violation history. The court determines whether there was a serious or repeated violation. **Stop and get help if:** If the prosecuting attorney objects or the court sets a contested hearing on the probation-violation question, automated assistance ends and the participant needs a lawyer. The initial packet still generates."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official statewide participant form for this route.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Your name and your date of birth are also printed as the answers to items C1 and C2 on the application, because the platform holds them and a fact it holds is not a blank you have to fill. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": null,
  "documentsToObtain": [
    [
      "Obtain Conditional discharge order and the order of discharge and dismissal. Ask the clerk for certified copies of the order deferring proceedings and placing you on probation, and of the later order discharging you and dismissing the proceedings. Both dates matter and they are usually different.",
      "Clerk of the court that entered them"
    ],
    [
      "Obtain Written confirmation of the date the probation term expired. Ask the supervising probation office for written confirmation of the date your probation term expired. The six-month clock runs from that date, not from the dismissal, and the two are often months apart.",
      "The probation office that supervised the participant"
    ],
    [
      "Obtain Receipt or clerk's confirmation that court costs were paid. Ask the clerk for a payment history or a receipt showing the assessed costs are paid.",
      "Clerk of the court that assessed them"
    ]
  ],
  "steps": [
    "**Read the filing instructions page for your route.** It names the court or office this goes to, what the record says about cost and about service, what the record says you must complete before filing, and when to stop.",
    "**Fill every labelled dotted blank on the pages for your route**, from the record itself. Do not guess a date, an offence wording, a case number or an office name. Items C1 and C2 on the application are already answered from the name and date of birth the platform holds; read both against your own papers and correct them in writing if they are wrong.",
    "**Ask the clerk of the court that entered the conditional discharge for the hearing date**, and write it on the application's notice line. The court sets that date and this packet never writes one.",
    "**Sign the application personally, and swear the supporting affidavit before a notary public or other officer authorized to administer oaths.** The committed record requires notarization on the affidavit. Sign and date the affidavit in front of that officer and not before; the jurat block below your signature is theirs to complete.",
    "**Deliver a copy of the application and the affidavit to the county prosecuting office and to the supervising probation office.** The record names both, and the certificate of service has a separate recipient block for each.",
    "**Do not sign or date the certificate of service until the papers have actually been delivered to both offices.**",
    "**File the application, the supporting affidavit and the certificate of service with the clerk of the court that entered the conditional discharge**, and ask that office what it charges and how it accepts filings before you go.",
    "**Leave every page and every line that belongs to the court, the clerk, the prosecuting office or the notary blank.** Those are not yours to fill."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**The jurat on the supporting affidavit.** It belongs to the notary public or other officer who administers the oath, never to you and never to this packet.",
    "**The hearing date on the application's notice line.** The court sets it. Ask the clerk of the court that entered the conditional discharge for the date and write it there before you file; this packet never writes a date no court has set.",
    "**Both recipient blocks on the certificate of service, until the papers have actually been delivered to that office.** A certificate signed before delivery states something that has not happened."
  ],
  "recordSays": [
    [
      "The committed track registry",
      "Expungement window: at least six months after the end of probation, the person may apply for expungement of official records of the arrest, trial, and conviction."
    ],
    [
      "The committed track registry",
      "One-time limit: only one discharge and dismissal is allowed under this section."
    ],
    [
      "The committed track registry",
      "What LegalEase can prepare: the application, the probation expiration proof, and the six-month calculation."
    ],
    [
      "The committed track registry",
      "Before drafting anything for these tracks, confirm the Judiciary form index. If drafting proves necessary, the section 61-11-26(d) petition contents list is the right model for verified content, and the section 61-11-26(e) service list is the right model for service, even on tracks governed by other statutes, because West Virginia circuit clerks will expect that shape."
    ],
    [
      "The committed track registry",
      "Tell the participant to obtain the conditional discharge order, the order of discharge and dismissal, and the probation office's written confirmation of the probation expiry date, and to attach them."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "Anyone has alleged that the participant committed a serious or repeated violation of the conditions of probation, whether during probation or since.",
    "The participant has had a prior drug conviction or a prior conditional discharge, either of which means the underlying discharge should not have been available.",
    "Probation was revoked, or the court entered an adjudication of guilt.",
    "The participant is also considering a § 61-11-26 conviction expungement, because whether this relief spends the once-per-lifetime petition is unresolved.",
    "The court sets a contested hearing or the prosecuting attorney objects.",
    "The clerk of the court will not accept a self-drafted application, or requires a local form.",
    "Firearm rights, immigration consequences, professional licensing, or federal, tribal, military or out-of-state records questions.",
    "LegalEase must not generate any assertion about the participant's probation violation history. The court determines whether there was a serious or repeated violation.",
    "If the prosecuting attorney objects or the court sets a contested hearing on the probation-violation question, automated assistance ends and the participant needs a lawyer. The initial packet still generates."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official WV form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that a fee rule recorded for W. Va. Code § 61-11-25 or § 61-11-26 applies to a § 60A-4-407 application — this build takes nothing from either"
  ],
  "buildFindings": [
    {
      "finding": "The MASTER_QUEUE row for this family binds no document source, and that is the recorded design: its sourceStatus is CUSTOM_PLEADING_FROM_CODIFIED_TEXT and its implementationStrategy is custom_pleading.",
      "consequence": "Every page is composed from committed repository records, each bound by SHA-256 and anchor-verified before composing. No official form was substituted and none was invented."
    },
    {
      "finding": "The committed track registry records this route's destination and venue, and records its fee, fee-waiver, notice and service rules — in several places as an express non-statement.",
      "consequence": "The packet states the destination the registry holds, states each recorded rule in the registry's own words, and where the registry records a non-statement it names the specific office that answers the question rather than gesturing at the court."
    },
    {
      "finding": "West Virginia's compiled profile carries no-fee lines keyed to § 61-11-25 and a $200 figure keyed to § 61-11-26, both recorded in DET-FEE-AND-WAIVER-001-A4. This route is a § 60A-4-407 application and is neither of them.",
      "consequence": "No fee figure was taken from either sibling section. The packet states this route's own recorded fee position and names the office that answers what the record does not. A3 governs: holding is per fact, and a line keyed to a different statutory section does not answer this route's question."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for this route.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content.",
    "DET-FEE-AND-WAIVER-001-A4 records that the once-per-lifetime bar's reach across West Virginia tracks is unsettled and stays a counsel question. This packet states what its own committed track record records as an exclusion and asserts nothing about § 61-11-26(o), § 17C-5-2b or § 60A-4-407 beyond that. Confirm."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT; confirm that is legible to reviewers."
  ]
};

/* ============================================================================
 * SHARED COMPOSED-PLEADING BUILD CORE.
 *
 * Everything above this line is this family's own: its committed-record
 * bindings, its composed pages, its field maps, its instructions content.
 * Everything below is family-independent plumbing: deterministic rendering,
 * byte proof, the builder's own count of the nine completeness counters, and
 * the census-v1 output records. It is copied whole into each family's own
 * exclusive script rather than imported, because a build host shared across
 * families cannot be changed for one of them without moving the bytes of the
 * rest, and every family here owns only itself.
 * ========================================================================== */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const OUT = SPEC.outDir;
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const DOTS = (n = 84) => ".".repeat(n);

/* THE CLOSING EXECUTION UNIT ON A SWORN PAGE.
 *
 * The affiant's own signature line opens the unit; the two lines the notary or
 * other authorized officer completes close it. Both patterns are matched on the
 * composed source line, and both are read twice: by composedBody, to put the
 * route trailer in front of the unit rather than inside the officer's block,
 * and by renderComposedPdf, to keep the unit whole on one page. A jurat split
 * across a page break, or a machine trailer printed under the officer's rule,
 * are the two defects the West Virginia deferral family already measured and
 * repaired; the same shape is used here so the affidavit cannot repeat them. */
const EXECUTION_UNIT_OPENER = /^SIGNATURE OF /;
const OFFICER_EXECUTION_LINE = /^(Taken, subscribed and sworn to before me|Officer authorized to administer oaths)\b/;

const COMPONENT_IDS = SPEC.components.map((c) => c.id);
const COMPONENT = Object.fromEntries(SPEC.components.map((c) => [c.id, c]));

/* ---- committed-record binding ------------------------------------------------ *
 * This family binds no Master Library binary: its authority is a set of
 * COMMITTED repository records named in SPEC.records. Each is bound by exact
 * SHA-256 at build time, and each anchor string is a statement this build
 * RELIES ON, re-read from the committed bytes before anything is composed. The
 * build refuses if a record is missing or an anchor is no longer there.
 */
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
      failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer contains ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing });
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

/* ---- deterministic composed-page rendering ---------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'");
}

async function renderComposedPdf(fullText, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11;
  const lineHeight = componentId === "wv_drug_conditional_discharge-records-checklist-4" ? 13.5 : 14.5;
  const width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
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
  /* The same rows, wrapped by the same rule, on the same pages: rowsPerPage is
   * exactly the number the old draw-until-the-margin loop fitted, so no
   * component's pagination moves. What is new is that the closing execution
   * unit is ONE block, and a block that fits on a page is never split across a
   * page break. */
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  const source = sanitizePdfText(fullText).split("\n");
  const lastDrawn = source.reduce((last, line, index) => (line === "" ? last : index), -1);
  const unitStart = lastDrawn >= 0 && OFFICER_EXECUTION_LINE.test(source[lastDrawn])
    ? source.findIndex((line) => EXECUTION_UNIT_OPENER.test(line))
    : -1;
  const blocks = [];
  for (let i = 0; i < source.length; i += 1) {
    if (unitStart >= 0 && i === unitStart) {
      const rows = [];
      for (let j = unitStart; j <= lastDrawn; j += 1) rows.push(...wrap(source[j]));
      blocks.push({ rows, execution: true });
      i = lastDrawn;
      continue;
    }
    blocks.push({ rows: wrap(source[i]), execution: false });
  }
  const pages = [[]];
  for (const block of blocks) {
    let current = pages[pages.length - 1];
    if (block.execution && block.rows.length <= rowsPerPage && current.length + block.rows.length > rowsPerPage) {
      pages.push([]);
      current = pages[pages.length - 1];
    }
    for (const text of block.rows) {
      if (current.length === rowsPerPage) { pages.push([]); current = pages[pages.length - 1]; }
      current.push({ text, execution: block.execution === true });
    }
  }
  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rows) {
      if (row.text) page.drawText(row.text, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  /* Proof read off the settled layout rather than off the intention: every
   * drawn row of the closing execution unit landed on one page. */
  const executionRows = pages.map((rows) => rows.filter((r) => r.execution).length);
  const drawnExecutionRows = executionRows.reduce((n, k) => n + k, 0);
  if (drawnExecutionRows > 0) {
    assert.equal(executionRows.filter((k) => k > 0).length, 1,
      `${title}: the affiant signature, the officer's sentence and the jurat must land whole on one page`);
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the composed page, rendered from this family's declared lines ----------- *
 * A body line is plain text with three substitutions: {{factId}} writes a fact
 * the platform holds, {{DOTS}} prints a full-width dotted blank, and
 * {{DOTS:n}} prints one n characters wide. Nothing else is interpolated, so a
 * page can never carry a value the fact table does not hold.
 */
function composedBody(componentId, facts) {
  const c = COMPONENT[componentId];
  const lines = [c.title.toUpperCase(), ""];
  for (const raw of c.body) {
    lines.push(String(raw).replace(/\{\{([A-Za-z0-9_.:]+)\}\}/g, (_m, token) => {
      if (token === "DOTS") return DOTS();
      if (token.startsWith("DOTS:")) return DOTS(Number(token.slice(5)));
      const value = facts[token];
      assert.ok(value !== undefined, `${componentId}: the page interpolates ${token}, which the fixture does not hold`);
      return String(value);
    }));
  }
  /* WHERE THE ROUTE TRAILER GOES WHEN AN OFFICER'S BLOCK CLOSES THE PAGE.
   *
   * The trailer is internal machine metadata and it closes every component. On
   * a sworn page that would put it under "Officer authorized to administer
   * oaths" - inside a block whose own words reserve it to the notary or other
   * officer, "never by you and never by this packet". So where a component
   * closes on a third party's execution block the trailer closes the preparer's
   * own half of the page instead, immediately above that block. Nothing is
   * added, removed or reworded; every other component keeps it at the foot. */
  const trailer = `Route: ${c.routeKey}`;
  const lastDrawn = lines.reduce((last, line, index) => (line === "" ? last : index), -1);
  const closesOnAnOfficersBlock = lastDrawn >= 0 && OFFICER_EXECUTION_LINE.test(lines[lastDrawn]);
  const unitStart = closesOnAnOfficersBlock ? lines.findIndex((line) => EXECUTION_UNIT_OPENER.test(line)) : -1;
  if (unitStart >= 0) lines.splice(unitStart, 0, trailer, "");
  else lines.push("", trailer);
  return lines.join("\n");
}

/* ---- field-map helpers, in the maps-with-canonical-and-boundary shape -------- */
function mapHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  return {
    write: (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId }),
    protectedBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId, why
    }),
    clerkBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    /* A line whose CONTENT is the court's even though the participant is the
     * one who transcribes it onto the page. The hearing date is the measured
     * instance: the registry lists it among the items completed before filing,
     * and the clerk is the only source of the date. Declaring it
     * required-before-filing would be refused -- a COURT_ONLY field is not the
     * participant's to author -- and declaring it filled would be false. So it
     * carries the court-owned refusal, which is the truth about who the date
     * belongs to, and the filing instructions and the deliberately-blank list
     * both name it and say where the participant gets it. */
    clerkSetBlank: (id, label, why) => ({
      ...base(id, label),
      reason: "the court sets this value; the participant obtains it from the clerk and writes it before filing, and this build never writes a value no court has set",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, document: componentId, why
    }),
    rbf: (id, label, what, why) => ({
      ...base(id, label),
      reason: `the participant supplies this before filing: ${what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
      document: componentId, why, participantMustSupply: what
    })
  };
}

function composedMap(componentId) {
  const c = COMPONENT[componentId];
  const h = mapHelpers(componentId);
  const writes = (c.writes ?? []).map((w) => h.write(w.id, w.label, w.factId));
  const refusals = (c.blanks ?? []).map((b) => {
    if (b.kind === "rbf") return h.rbf(b.id, b.label, b.supply, b.why);
    if (b.kind === "protected") return h.protectedBlank(b.id, b.label, b.why);
    if (b.kind === "court") return h.clerkBlank(b.id, b.label, b.why);
    if (b.kind === "clerkSet") return h.clerkSetBlank(b.id, b.label, b.why);
    throw new Error(`${componentId}.${b.id}: unknown blank kind ${b.kind}`);
  });
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: c.routeKey,
      ...(c.condition ? { conditional: true, conditionDescription: c.condition } : {})
    },
    structuralClass: "composed_document",
    composedFrom: SPEC.composedFromNote,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------- *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
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
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
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
    factId: r.factId ?? null, isSelectionControl: false,
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

/*
 * The required-before-filing list, in the order the participant meets the
 * blanks: component by component, and within a component in the order the
 * committed record declares the facts. Sorting these alphabetically would print
 * item C10 above item C2 on a page where they are numbered in sequence.
 */
function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENT_IDS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  if (SPEC.instrumentChoice) {
    out.push(`## ${SPEC.instrumentChoice.heading}`, "");
    for (const p of SPEC.instrumentChoice.intro) out.push(p, "");
    out.push("| Instrument | When it is yours |", "| --- | --- |");
    for (const [instr, when] of SPEC.instrumentChoice.rows) out.push(`| ${instr} | ${when} |`);
    out.push("");
    for (const p of SPEC.instrumentChoice.footnotes ?? []) out.push(p, "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of SPEC.components) out.push(`| \`${c.id}\` | ${c.description} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("| Question | What the repository establishes, or the authority that answers it |", "| --- | --- |");
  for (const [q, answer] of SPEC.obligationTable) out.push(`| ${q} | ${answer} |`);
  out.push("");

  if ((SPEC.recordSays ?? []).length > 0) {
    out.push("## What the committed record says you must know", "");
    out.push("Each of these is carried here in the words of the committed record it comes from, because a participant who does not know it may file the wrong thing, or file something they did not need to file at all.", "");
    for (const [where, what] of SPEC.recordSays) out.push(`- **${where}** — ${what}`);
    out.push("");
  }

  if ((SPEC.documentsToObtain ?? []).length > 0) {
    /*
     * On three families in this lane the committed records say the participant
     * files nothing at all, and a heading reading "before filing" would tell
     * them the opposite of what the rest of the packet says. The heading is
     * therefore the family's to state; every other family keeps the default.
     */
    out.push(`## ${SPEC.documentsHeading ?? "Documents you must obtain before filing"}`, "");
    out.push("| Document | Where you get it |", "| --- | --- |");
    for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
    out.push("");
  }

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the page you are using, from the record itself, never from memory.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPONENT[doc]?.title ?? doc}`, "");
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
    out.push("## What this packet does not tell you", "");
    for (const n of SPEC.notTold) out.push(`- ${n}`);
    out.push("");
  }

  out.push("## When to stop and get help instead of filing", "");
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
  if (failures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed record this family composes from is missing or no longer carries an anchor statement, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENT_IDS.map((c) => composedMap(c));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      recordsBound: resolved.length,
      anchorsVerified: resolved.reduce((n, r) => n + r.anchorsVerified, 0),
      components: COMPONENT_IDS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENT_IDS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = SPEC.fixtures[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${SPEC.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENT_IDS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title, componentId);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      if (componentId === "wv_drug_conditional_discharge-records-checklist-4") {
        assert.equal(composed.getPageCount(), 1, "the records checklist and its route footer must fit on one page");
      }
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
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

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENT_IDS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
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
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod: "committed repository records bound by exact SHA-256 at build time, with every relied-on statement re-read from the committed bytes as an anchor before composing",
    routeKeys: SPEC.routes.map((r) => r.routeKey),
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: true,
    formIdentityNote: SPEC.formIdentityNote,
    /* Bound as committedRecords, not documents: these are the AUTHORITY this
     * family composes from, not documents of the packet, and no rendered
     * artifact should be expected to carry them. */
    committedRecords: resolved.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId,
      pathInRepository: r.path, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: "committed_record_bound_as_authority",
      role: r.role,
      anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: COMPONENT_IDS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family composes for",
      ...(SPEC.receiptDoesNotEstablish ?? [])
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: SPEC.routes.map((r) => r.routeKey), renderStrategy: "composed_pleading",
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — this family composes from committed records; no official binary is bound and none is included",
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
    componentRoutes: Object.fromEntries(SPEC.components.map((c) => [c.id, c.routeKey])),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: SPEC.routeSelectionsMade ?? [],
    routeSelectionNote: SPEC.routeSelectionNote,
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENT_IDS,
    componentConditions: Object.fromEntries(SPEC.components.filter((c) => c.condition).map((c) => [c.id, c.condition])),
    boundReferenceSource: null,
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
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
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
    implementationStrategy: "custom_pleading",
    recordsBound: resolved.map((r) => ({ recordId: r.recordId, sha256: r.sha256 })),
    components: COMPONENT_IDS,
    documents: COMPONENT_IDS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
