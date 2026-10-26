/** The four retained, adopted ND first-offense components. No new legal text.
 * Shared by the existing census builder and the participant composition adapter.
 * Record blanks, judicial spaces and signatures remain exactly source-owned.
 */
/** @template T @param {T} value @returns {T} */
function freezeSource(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezeSource(child);
    Object.freeze(value);
  }
  return value;
}

export const ND_FIRST_OFFENSE_COMPONENTS = freezeSource([
  {
    "id": "nd-marijuana-first-offense-seal-primary-filing-1",
    "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
    "title": "Petition - Ask a North Dakota court to seal a first marijuana possession conviction",
    "role": "primary_filing",
    "description": "the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a first marijuana possession conviction)",
    "condition": null,
    "body": [
      "IN THE ............................................................ COURT",
      "(Clerk of Court of the court holding the criminal case - see the filing instructions in this packet)",
      "",
      "IN RE: {{participant.full_legal_name}},",
      "PETITIONER.",
      "",
      "Case number, if the court assigns one at filing:",
      "{{DOTS}}",
      "",
      "MOTION TO SEAL A FIRST MARIJUANA OR THC POSSESSION CONVICTION (N.D.C.C. § 19-03.1-23(9))",
      "",
      "The petitioner, {{participant.full_legal_name}}, applies to this court under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1 and states:",
      "",
      "A. THE RELIEF THIS PETITION ASKS FOR, AS THE COMMITTED RECORD STATES IT",
      "",
      "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter. Relief is mandatory on the elements, and once sealed the record may not be opened even by order of the court, which makes this seal stronger than Chapter 12-60.1 sealing.",
      "",
      "B. THE PETITIONER",
      "",
      "Date of birth: {{participant.date_of_birth}}",
      "",
      "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
      "",
      "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
      "",
      "[C1 - mj judgment date] On what date did the court enter the judgment of guilt?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C2 - mj offence date] On what date did the offence occur?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C3 - mj substance] Was the charge marijuana or tetrahydrocannabinol?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C4 - mj quantity] What quantity was charged?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C5 - mj first offence] Was this your first offence of this kind?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C6 - mj subsequent conviction] Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C7 - mj other charges] Were there any other charges in the same case besides the marijuana or THC possession?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C8 - mj case number] What is the case number?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C9 - mj county] Which North Dakota county?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "[C10 - mj court type] Was the case in district court or municipal court?",
      "{{DOTS}}",
      "{{DOTS}}",
      "",
      "D. THE REQUEST",
      "",
      "The petitioner asks the court to grant the relief described in paragraph A, under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1.",
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
      }
    ],
    "blanks": [
      {
        "kind": "rbf",
        "id": "fact_mjJudgmentDate",
        "label": "Item C1 - mj judgment date",
        "supply": "On what date did the court enter the judgment of guilt?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjOffenceDate",
        "label": "Item C2 - mj offence date",
        "supply": "On what date did the offence occur?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjSubstance",
        "label": "Item C3 - mj substance",
        "supply": "Was the charge marijuana or tetrahydrocannabinol?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjQuantity",
        "label": "Item C4 - mj quantity",
        "supply": "What quantity was charged?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjFirstOffence",
        "label": "Item C5 - mj first offence",
        "supply": "Was this your first offence of this kind?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjSubsequentConviction",
        "label": "Item C6 - mj subsequent conviction",
        "supply": "Have you been convicted of any further violation of North Dakota's controlled substances chapter since, and if so when?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjOtherCharges",
        "label": "Item C7 - mj other charges",
        "supply": "Were there any other charges in the same case besides the marijuana or THC possession?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjCaseNumber",
        "label": "Item C8 - mj case number",
        "supply": "What is the case number?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjCounty",
        "label": "Item C9 - mj county",
        "supply": "Which North Dakota county?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "rbf",
        "id": "fact_mjCourtType",
        "label": "Item C10 - mj court type",
        "supply": "Was the case in district court or municipal court?",
        "why": "the committed track registry records this as a required generation input for nd-marijuana-first-offense-seal, and the platform holds no value for it"
      },
      {
        "kind": "court",
        "id": "case_number",
        "label": "Case number of this filing, if the court assigns one at filing",
        "why": "if a number is assigned, the court assigns it at filing"
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
    "id": "nd-marijuana-first-offense-seal-proposed-order-2",
    "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
    "title": "Proposed Order - Ask a North Dakota court to seal a first marijuana possession conviction",
    "role": "proposed_order",
    "description": "the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a first marijuana possession conviction)",
    "condition": null,
    "body": [
      "IN THE ............................................................ COURT",
      "(Clerk of Court of the court holding the criminal case)",
      "",
      "IN RE: {{participant.full_legal_name}},",
      "PETITIONER.",
      "",
      "Case number, if one was assigned:",
      "{{DOTS}}",
      "",
      "PROPOSED ORDER",
      "",
      "This matter came before the Court on the petition of the petitioner under N.D.C.C. § 19-03.1-23(9); N.D.C.C. ch. 19-03.1. The Court, having considered the petition and anything filed with it,",
      "",
      "ORDERS that {{DOTS:56}}",
      "",
      "(EVERY DECISION ON THIS PAGE IS THE COURT'S. This proposed order travels with the petition for the Court's convenience; nothing on it is completed, decided, signed or dated by the petitioner or by this packet.)",
      "",
      "DATED {{DOTS:30}}",
      "",
      "{{DOTS:50}}",
      "(The court signs here if, and only if, it grants the petition.)"
    ],
    "writes": [
      {
        "id": "petitioner_name",
        "label": "Person named in the caption of this document",
        "factId": "participant.full_legal_name"
      }
    ],
    "blanks": [
      {
        "kind": "court",
        "id": "order_case_number",
        "label": "Case number in the caption of the proposed order, if the court assigns one at filing",
        "why": "the proposed order is filed with the petition, before any number exists"
      },
      {
        "kind": "court",
        "id": "order_decision",
        "label": "The decision line of the proposed order, decided by the court",
        "why": "every decision on the proposed order is the court's"
      },
      {
        "kind": "court",
        "id": "order_signing_line",
        "label": "Signing line of the proposed order, for the court",
        "why": "the court signs the order if, and only if, it grants the petition"
      },
      {
        "kind": "court",
        "id": "order_date",
        "label": "Date line of the proposed order, for the court",
        "why": "the court dates the order when it decides"
      }
    ]
  },
  {
    "id": "nd-marijuana-first-offense-seal-legal-effect-explanation-3",
    "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
    "role": "legal_effect_explanation",
    "title": "What sealing does, and what it does not do",
    "description": "what a sealing order under chapter 19-03.1 does, what it does not reach, and why the general sealing chapter's waiting periods and burden do not apply (Ask a North Dakota court to seal a first marijuana possession conviction)",
    "condition": null,
    "body": [
      "This page is for {{participant.full_legal_name}}.",
      "",
      "WHAT THE ORDER DOES",
      "",
      "A sealing order under chapter 19-03.1 seals the court record in this case. The statute is unusually strong on this point: once sealed, the court record may not be opened even by court order.",
      "",
      "WHAT IT DOES NOT REACH",
      "",
      "The order is directed at the court record. It does not by itself change records held by other agencies, and it is not a pardon. If you need a criminal-history record corrected as well, that is a separate request to the agency that holds it.",
      "",
      "THIS IS NOT THE GENERAL SEALING CHAPTER",
      "",
      "North Dakota's general criminal-record sealing chapter, 12-60.1, uses waiting periods of three years for a misdemeanor and five for a felony, a clear-and-convincing burden, and a hearing no earlier than forty-five days after filing. None of that applies here. Chapter 19-03.1 makes sealing mandatory on motion when its own conditions are met."
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
    "id": "nd-marijuana-first-offense-seal-filing-instructions-4",
    "routeKey": "obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing",
    "role": "filing_instructions",
    "title": "Filing Instructions - Ask a North Dakota court to seal a first marijuana possession conviction",
    "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask a North Dakota court to seal a first marijuana possession conviction)",
    "condition": null,
    "body": [
      "This page is for {{participant.full_legal_name}}.",
      "",
      "WHAT THIS SET OF PAPERS IS",
      "",
      "Motion to Seal a First Marijuana or THC Possession Conviction (N.D.C.C. § 19-03.1-23(9)).",
      "",
      "Where a person pleads guilty or is found guilty of a first offence of possessing one ounce or less of marijuana or two grams or less of tetrahydrocannabinol and a judgment of guilt is entered, the court shall, upon motion, seal the court record of that conviction if the person is not subsequently convicted within two years of a further violation of the chapter. Relief is mandatory on the elements, and once sealed the record may not be opened even by order of the court, which makes this seal stronger than Chapter 12-60.1 sealing.",
      "",
      "WHERE IT GOES",
      "",
      "Clerk of Court of the court holding the criminal case",
      "Filed as a motion in the existing case. The subsection states no service requirement and no hearing requirement.",
      "Venue: The existing criminal case in the court that entered the judgment.",
      "",
      "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
      "",
      "Fee as recorded: none identified. The statewide fee schedule carries no line item for a motion in an existing criminal case. Fee waiver as recorded: not applicable; no fee is identified.",
      "",
      "WHO MUST BE SERVED",
      "",
      "Service as recorded: None stated by the subsection. Notice as recorded: None stated by the subsection.",
      "",
      "WHAT THE RECORD SAYS YOU MUST KNOW",
      "",
      "- This seal is irreversible: once sealed the court record may not be opened even by order of the court. The participant should keep their own copies of anything they may later need.",
      "",
      "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
      "",
      "- Any uncertainty whether this was a first offence.",
      "- Any uncertainty about the quantity charged.",
      "- A subsequent controlled-substance conviction.",
      "- Other charges in the same case, which the subsection does not reach.",
      "- A participant confusing this with the executive marijuana pardon, which is an entirely separate process.",
      "",
      "THE PAGES IN THIS SET",
      "",
      "- nd-marijuana-first-offense-seal-primary-filing-1: the composed petition, on this route's own statutory ground (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "- nd-marijuana-first-offense-seal-proposed-order-2: the proposed order the court may sign; every decision line is the court's and is left blank (Ask a North Dakota court to seal a first marijuana possession conviction)",
      "- nd-marijuana-first-offense-seal-legal-effect-explanation-3: what the sealing order does, what it does not reach, and why the general sealing chapter does not apply (Ask a North Dakota court to seal a first marijuana possession conviction)"
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
]);

export const ND_FIRST_OFFENSE_COMPONENT_IDS = Object.freeze(ND_FIRST_OFFENSE_COMPONENTS.map(component => component.id));

export function ndFirstOffenseBody(componentId, facts) {
  const component = ND_FIRST_OFFENSE_COMPONENTS.find(item => item.id === componentId);
  if (!component) throw new Error(`Unknown ND first-offense component: ${componentId}`);
  const lines = [component.title.toUpperCase(), ""];
  for (const raw of component.body) {
    lines.push(raw.replace(/\{\{([A-Za-z0-9_.:]+)\}\}/g, (_match, token) => {
      if (token === "DOTS") return ".".repeat(84);
      if (token.startsWith("DOTS:")) return ".".repeat(Number(token.slice(5)));
      if (!Object.hasOwn(facts, token) || typeof facts[token] !== "string")
        throw new Error(`${componentId}: missing exact participant fact ${token}`);
      return facts[token];
    }));
  }
  lines.push("", `Route: ${component.routeKey}`);
  return lines.join("\n");
}
