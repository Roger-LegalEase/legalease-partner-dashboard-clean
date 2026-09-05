#!/usr/bin/env node
/**
 * FABLE-PC census-v1 builder — Wisconsin certificate-of-discharge follow-up.
 *
 *   node "scripts/build-census-v1-rcap-wi-custom-pleading.mjs" [--check] [--no-raster]
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS, AND WHY IT IS NOT A
 * PETITION FOR EXPUNGEMENT
 *
 * This route is a FOLLOW-UP, not an application. The expungement was already
 * ORDERED by the sentencing court; what has not happened is the certificate
 * of discharge that the supervising or detaining authority issues and that
 * triggers the ordered expungement. The committed specifications record two
 * components, and the second one is the tell: a STATUS REQUEST whose recorded
 * venue is 'Not a court filing' and whose addressee is the supervising or
 * detaining authority for the participant's own case — the Department of
 * Corrections in most probation cases, or the detaining authority where the
 * sentence included confinement.
 *
 * Both request pages go to the supervising or detaining authority, never to a
 * court. They are alternatives: the primary letter asks the authority to issue
 * and forward the certificate, while the conditional status page is used only
 * when the participant wants to know whether that has already happened.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "rcap-wi-custom-pleading",
  "worklistGroupId": "rcap-wi-custom-pleading",
  "buildScript": "scripts/build-census-v1-rcap-wi-custom-pleading.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wi/rcap-wi-custom-pleading--custom-pleading",
  "jurisdiction": "WI",
  "legalName": "Wisconsin Certificate-of-Discharge Follow-Up for an Ordered Expungement",
  "routeName": "following up on a Wisconsin expungement the sentencing court already ordered, where the certificate of discharge that triggers it has not reached the court",
  "statutes": [
    "Wis. Stat. § 973.015(1m)",
    "Wis. Stat. § 973.015(1m)(b)"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup"
    }
  ],
  "records": [
    {
      "recordId": "legal-design-track-registry:wi_exp_certificate_of_discharge_followup",
      "path": "data/record-clearing/legal-design-track-registry.json",
      "role": "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its packet instructions and its self-help stop conditions",
      "mustContain": [
        "\"trackId\": \"wi_exp_certificate_of_discharge_followup\"",
        "Participant Request that the Supervising or Detaining Authority Issue and Forward the Certificate of Discharge (Wis. Stat. § 973.015(1m)(b))",
        "Section 973.015(1m)(b) makes issuance mandatory rather than discretionary: upon successful completion of the sentence th",
        "Not a court filing. The request is addressed to the supervising or detaining authority for the participant's own case, w",
        "Wis. Stat. § 973.015(1m)",
        "Wis. Stat. § 973.015(1m)(b)",
        "What is your full legal name, and any other name the case was under?",
        "What is your date of birth?",
        "What postal address, phone number or email should the authority use to reply to you?",
        "What is the case number, and which Wisconsin county was the case in?",
        "What is your Department of Corrections or offender identification number, if you have one?",
        "Which agency supervised your probation, or which facility held you?",
        "Do you know the name of your probation agent or the office that supervised you?",
        "On what date did you finish your sentence, including any probation?",
        "Did the judge order at your sentencing that the record would be expunged once you completed your sentence?",
        "Have you asked the clerk of court whether they received a certificate of discharge, and what did they say?",
        "Do you want to ask the authority to issue and forward the certificate, or only to tell you whether it has already been done?",
        "Used where the participant wants only to know whether the certificate has issued, rather than to ask that it be issued.",
        "none",
        "none. Ordinary mail or the authority's stated correspondence channel is sufficient; there is no service requirement.",
        "Not a court filing. Send the written request to the supervising or detaining authority. Confirm with the clerk of circui"
      ]
    },
    {
      "recordId": "legal-design-specifications:wi_exp_certificate_of_discharge_followup",
      "path": "data/record-clearing/legal-design-specifications.json",
      "role": "the committed custom-pleading specifications: the component set this packet must contain, and the participant actions the record requires before filing",
      "mustContain": [
        "\"componentId\": \"wi_exp_certificate_of_discharge_followup-primary-filing-1\"",
        "\"componentId\": \"wi_exp_certificate_of_discharge_followup-status-request-2\"",
        "The current mailing address of the supervising authority — Request letter, addressee block."
      ]
    },
    {
      "recordId": "route-obligation-census:1-route(s)",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: the exact route keys this family serves, their statutory authority and their recorded destinations",
      "mustContain": [
        "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup"
      ]
    }
  ],
  "components": [
    {
      "id": "wi_exp_certificate_of_discharge_followup-primary-filing-1",
      "routeKey": "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup",
      "title": "Request to the supervising or detaining authority - Ask for the certificate that completes your expungement",
      "role": "primary_filing",
      "description": "the composed request letter to the supervising or detaining authority, on this route's own statutory ground (Ask for the certificate that completes your expungement)",
      "condition": null,
      "body": [
        "TO: The detaining or probationary authority that supervised the participant, with the clerk of circuit court as the certificate's destination",
        "{{DOTS}}",
        "(Write that office's name and address on the line above. The committed record for this route reads \"Not a court filing. Send the written request to the supervising or detaining authority.\" This page is a letter to that office. It is not filed with any court, no court assigns it a case number, and it asks no court for anything.)",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "",
        "PARTICIPANT REQUEST THAT THE SUPERVISING OR DETAINING AUTHORITY ISSUE AND FORWARD THE CERTIFICATE OF DISCHARGE (WIS. STAT. § 973.015(1M)(B))",
        "",
        "I am writing to the office named above under Wis. Stat. § 973.015(1m); Wis. Stat. § 973.015(1m)(b), and I state:",
        "",
        "A. WHAT THIS REQUEST ASKS FOR, AS THE COMMITTED RECORD STATES IT",
        "",
        "Section 973.015(1m)(b) makes issuance mandatory rather than discretionary: upon successful completion of the sentence the detaining or probationary authority SHALL issue a certificate of discharge, which shall be forwarded to the court of record and which shall have the effect of expunging the record. The triggering event is successful completion — no subsequent conviction and, where the person was on probation, no revocation and satisfied conditions. Where that mandatory certificate was not issued, or was issued but never forwarded to the clerk, the participant may write to the supervising or detaining authority asking that it be issued and forwarded. No statute or rule prescribes the contents of that request and Wisconsin publishes no official participant form for it, so the correspondence is drafted. The letter supports implementation of an expungement the court already ordered; it does not itself change legal status, and the certificate remains the authority's document.",
        "",
        "B. WHO IS ASKING - THE THREE THINGS THE PLATFORM ALREADY HOLDS",
        "",
        "The committed record requires a full legal name, a date of birth and return contact details before this request can be generated. The platform holds all three from your own record and has printed them here, so none of them is a blank you have to fill. Read each one against your own papers and correct it in writing if it is wrong.",
        "",
        "Full legal name: {{participant.full_legal_name}}",
        "(If the case was under any other name, write that name beside this line.)",
        "Date of birth: {{participant.date_of_birth}}",
        "Reply address: {{participant.street_address}}",
        "Reply telephone: {{participant.phone}}",
        "Reply email: {{participant.email}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH YOU SUPPLY FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself.",
        "",
        "[C1 - case number and county] What is the case number, and which Wisconsin county was the case in?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - supervision identifier] What is your Department of Corrections or offender identification number, if you have one?",
        "(Asked where the sentence included probation or confinement, because it is how the supervising authority locates the file.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - supervising authority] Which agency supervised your probation, or which facility held you?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - supervising agent name] Do you know the name of your probation agent or the office that supervised you?",
        "(Asked where the sentence included probation; it helps the authority route the request.)",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - sentence completion date] On what date did you finish your sentence, including any probation?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - expungement ordered at sentencing] Did the judge order at your sentencing that the record would be expunged once you completed your sentence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - court office confirmation that the certificate was not received] Have you asked the clerk of court whether they received a certificate of discharge, and what did they say?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - request type] Do you want to ask the authority to issue and forward the certificate, or only to tell you whether it has already been done?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "I ask the office named above to issue the certificate of discharge under Wis. Stat. § 973.015(1m)(b) and to forward it to the clerk of the circuit court of the county where the case was heard, and to confirm to me when that has been done. This request asks nothing of any court.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:36}}",
        "",
        "(The person named above signs and dates this request personally. Nothing on this page is signed or dated for them.)"
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person sending this request, in the FROM block and in section B",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "date_of_birth",
          "label": "Date of birth of the person sending this request, in section B",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Reply postal address in the FROM block and in section B",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Reply telephone number in the FROM block and in section B",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Reply email address in the FROM block and in section B",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "addressee_detail",
          "label": "The current office and postal address of the supervising or detaining authority",
          "supply": "the current name and postal address of the supervising or detaining authority you are sending this request to, confirmed with that office",
          "why": "the committed specification requires the current mailing address of the supervising authority before sending, and which office holds the participant's matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "fact_caseNumberAndCounty",
          "label": "Item C1 - case number and county",
          "supply": "What is the case number, and which Wisconsin county was the case in?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_supervisionIdentifier",
          "label": "Item C2 - supervision identifier",
          "supply": "What is your Department of Corrections or offender identification number, if you have one? (Asked where the sentence included probation or confinement, because it is how the supervising authority locates the file.)",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_supervisingAuthority",
          "label": "Item C3 - supervising authority",
          "supply": "Which agency supervised your probation, or which facility held you?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_supervisingAgentName",
          "label": "Item C4 - supervising agent name",
          "supply": "Do you know the name of your probation agent or the office that supervised you? (Asked where the sentence included probation; it helps the authority route the request.)",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_sentenceCompletionDate",
          "label": "Item C5 - sentence completion date",
          "supply": "On what date did you finish your sentence, including any probation?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_expungementOrderedAtSentencing",
          "label": "Item C6 - expungement ordered at sentencing",
          "supply": "Did the judge order at your sentencing that the record would be expunged once you completed your sentence?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_clerkConfirmedNotReceived",
          "label": "Item C7 - court office confirmation that the certificate was not received",
          "supply": "Have you asked the clerk of court whether they received a certificate of discharge, and what did they say?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_requestType",
          "label": "Item C8 - request type",
          "supply": "Do you want to ask the authority to issue and forward the certificate, or only to tell you whether it has already been done?",
          "why": "the committed track registry records this as a required generation input for wi_exp_certificate_of_discharge_followup, and the platform holds no value for it"
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
      "id": "wi_exp_certificate_of_discharge_followup-status-request-2",
      "routeKey": "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup",
      "title": "Status Request - Ask for the certificate that completes your expungement",
      "role": "status_request",
      "description": "the written status request to the supervising or detaining authority (Ask for the certificate that completes your expungement)",
      "condition": "Used where the participant wants only to know whether the certificate has issued, rather than to ask that it be issued.",
      "body": [
        "TO: The detaining or probationary authority that supervised the participant, with the clerk of circuit court as the certificate's destination",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "STATUS REQUEST",
        "",
        "I am asking the office named above for the current status of my own case, and for the document the record says that office issues.",
        "",
        "The matter this request concerns:",
        "",
        "Court or office that handled the matter:",
        "{{DOTS}}",
        "",
        "Case or docket number:",
        "{{DOTS}}",
        "",
        "Date of the disposition:",
        "{{DOTS}}",
        "",
        "What I am asking for:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally.)"
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
          "id": "addressee_detail",
          "label": "The exact office and postal address of the recipient of this request",
          "supply": "the exact office and postal address you are sending this to, confirmed with that office",
          "why": "which office holds the participant's own matter is a fact of that matter"
        },
        {
          "kind": "rbf",
          "id": "req_court",
          "label": "Court or office that handled the matter",
          "supply": "the court or office that handled your matter, exactly as the record names it",
          "why": "no court identity is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_case_number",
          "label": "Case or docket number of the matter this request concerns",
          "supply": "the case or docket number, copied from the record",
          "why": "no case identifier is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_disposition_date",
          "label": "Date of the disposition of the matter this request concerns",
          "supply": "the date of the disposition, copied from the record",
          "why": "no disposition date is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "req_ask",
          "label": "What the person making this request is asking the office to do",
          "supply": "what you are asking that office to do, in your own words",
          "why": "the platform never writes a participant's own request for them"
        },
        {
          "kind": "protected",
          "id": "request_signature",
          "label": "Signature of the person named in the caption, on the request",
          "why": "the participant signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "request_signature_date",
          "label": "Date beside the signature on the request",
          "why": "a date written before the document is signed would be false"
        }
      ]
    },
    {
      "id": "wi_exp_certificate_of_discharge_followup-filing-instructions-3",
      "routeKey": "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup",
      "role": "filing_instructions",
      "title": "Filing Instructions - Ask for the certificate that completes your expungement",
      "description": "what this set is, where it goes, what it costs, who must be served, and when to stop (Ask for the certificate that completes your expungement)",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "WHAT THIS SET OF PAPERS IS",
        "",
        "Participant Request that the Supervising or Detaining Authority Issue and Forward the Certificate of Discharge (Wis. Stat. § 973.015(1m)(b)).",
        "",
        "Section 973.015(1m)(b) makes issuance mandatory rather than discretionary: upon successful completion of the sentence the detaining or probationary authority SHALL issue a certificate of discharge, which shall be forwarded to the court of record and which shall have the effect of expunging the record. The triggering event is successful completion — no subsequent conviction and, where the person was on probation, no revocation and satisfied conditions. Where that mandatory certificate was not issued, or was issued but never forwarded to the clerk, the participant may write to the supervising or detaining authority asking that it be issued and forwarded. No statute or rule prescribes the contents of that request and Wisconsin publishes no official participant form for it, so the correspondence is drafted. The letter supports implementation of an expungement the court already ordered; it does not itself change legal status, and the certificate remains the authority's document.",
        "",
        "WHERE IT GOES",
        "",
        "The detaining or probationary authority that supervised the participant, with the clerk of circuit court as the certificate's destination",
        "The letter goes to the supervising or detaining authority, because § 973.015(1m)(b) places the issuing and forwarding duty on it. It asks that the certificate of discharge be issued and forwarded to the clerk of the circuit court of conviction, and asks the authority to confirm when that has been done. A copy to the clerk of circuit court is appropriate where the participant has already confirmed with the clerk that nothing was received.",
        "Venue: Not a court filing. The request is addressed to the supervising or detaining authority for the participant's own case, which is statewide in scope: the Department of Corrections in most probation cases, or the detaining authority where the sentence included confinement.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Fee as recorded: none Fee waiver as recorded: none",
        "",
        "WHO MUST BE SERVED",
        "",
        "Service as recorded: none. Ordinary mail or the authority's stated correspondence channel is sufficient; there is no service requirement. Notice as recorded: none. No notice to any other party is required, and no hearing arises from the request.",
        "",
        "WHAT THE RECORD SAYS YOU MUST KNOW",
        "",
        "- Confirm with the clerk of circuit court that no certificate of discharge was received before sending the request, and re-check Wisconsin Circuit Court Access afterwards to see whether the record left public access.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD OF FILING",
        "",
        "- The judge did not order expungement at sentencing. There is no certificate owed and the request would be pointless.",
        "- Any dispute about whether completion was successful, particularly a revocation or a subsequent conviction, because those are the two facts that destroy the expungement entirely.",
        "- The supervising authority declines to issue the certificate, or asserts that completion was not successful.",
        "- The authority does not respond, or responds that it has issued and forwarded the certificate while the clerk says nothing was received.",
        "- Any request to argue entitlement, allege agency fault or press the authority beyond a neutral request. That is individualized advocacy and outside self-help.",
        "- Immigration consequences.",
        "- Federal, tribal or out-of-state records.",
        "- Neutral request only. Do not draft accusations of agency misconduct, assertions of legal entitlement that would require document review, or any individualized advocacy. Where the authority declines or disputes completion, refer to a lawyer.",
        "- After the participant sends the request, issuance and forwarding are the supervising authority's acts and the sealing follows from the certificate reaching the clerk. The packet ends at the letter and the follow-up checklist.",
        "",
        "THE PAGES IN THIS SET",
        "",
        "- wi_exp_certificate_of_discharge_followup-primary-filing-1: the composed request letter to the supervising or detaining authority, on this route's own statutory ground (Ask for the certificate that completes your expungement)",
        "- wi_exp_certificate_of_discharge_followup-status-request-2: the written status request to the supervising or detaining authority. Use it only where the participant wants to know whether the certificate has issued, rather than to ask that it be issued."
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
      "routeKey": "obligation:track-only:WI:wi_exp_certificate_of_discharge_followup",
      "statute": "Wis. Stat. § 973.015(1m); Wis. Stat. § 973.015(1m)(b)",
      "instrument": "primary_filing: wi_exp_certificate_of_discharge_followup-primary-filing-1; status_request: wi_exp_certificate_of_discharge_followup-status-request-2; filing_instructions: wi_exp_certificate_of_discharge_followup-filing-instructions-3",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "The committed track registry records the destination as **The detaining or probationary authority that supervised the participant, with the clerk of circuit court as the certificate's destination**. The letter goes to the supervising or detaining authority, because § 973.015(1m)(b) places the issuing and forwarding duty on it. It asks that the certificate of discharge be issued and forwarded to the clerk of the circuit court of conviction, and asks the authority to confirm when that has been done. A copy to the clerk of circuit court is appropriate where the participant has already confirmed with the clerk that nothing was received. Venue as recorded: Not a court filing. The request is addressed to the supervising or detaining authority for the participant's own case, which is statewide in scope: the Department of Corrections in most probation cases, or the detaining authority where the sentence included confinement. Filing as recorded: Not a court filing. Send the written request to the supervising or detaining authority. Confirm with the clerk of circuit court first that no certificate was received, and keep a copy and a record of the date sent."
    ],
    [
      "FEE_AND_WAIVER",
      "Fee as recorded: none Fee waiver as recorded: none"
    ],
    [
      "SERVICE",
      "Service as recorded: none. Ordinary mail or the authority's stated correspondence channel is sufficient; there is no service requirement. Notice as recorded: none. No notice to any other party is required, and no hearing arises from the request."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** The judge did not order expungement at sentencing. There is no certificate owed and the request would be pointless. **Stop and get help if:** Any dispute about whether completion was successful, particularly a revocation or a subsequent conviction, because those are the two facts that destroy the expungement entirely. **Stop and get help if:** The supervising authority declines to issue the certificate, or asserts that completion was not successful. **Stop and get help if:** The authority does not respond, or responds that it has issued and forwarded the certificate while the clerk says nothing was received. **Stop and get help if:** Any request to argue entitlement, allege agency fault or press the authority beyond a neutral request. That is individualized advocacy and outside self-help. **Stop and get help if:** Immigration consequences. **Stop and get help if:** Federal, tribal or out-of-state records. **Stop and get help if:** Neutral request only. Do not draft accusations of agency misconduct, assertions of legal entitlement that would require document review, or any individualized advocacy. Where the authority declines or disputes completion, refer to a lawyer. **Stop and get help if:** After the participant sends the request, issuance and forwarding are the supervising authority's acts and the sealing follows from the certificate reaching the clerk. The packet ends at the letter and the follow-up checklist."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official statewide participant form for this route.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": null,
  "documentsToObtain": [
    [
      "Obtain Judgment of conviction, or the sentencing transcript or minutes. Ask the clerk of circuit court for the judgment of conviction and, where it is silent, the sentencing transcript or minutes.",
      "Clerk of circuit court for the county of conviction"
    ],
    [
      "Obtain Proof of discharge from probation or confinement. Ask the supervising agent or the detaining authority for the discharge documentation showing the sentence terms were completed.",
      "The Department of Corrections or the detaining authority"
    ]
  ],
  "documentsHeading": "Documents that may help before you send the request",
  "steps": [
    "**Read the instructions page.** This is not a court filing. It names the supervising or detaining authority this goes to, states that there is no filing fee or service requirement, and tells you when to stop.",
    "**Choose the request that matches what you want.** Use the primary letter to ask the authority to issue and forward the certificate. Use the conditional status request only when you want to know whether the certificate has already issued.",
    "**Fill every labelled dotted blank on the request you choose**, from the record itself. Confirm the current name and mailing address of the supervising or detaining authority; do not guess a date, case number or office name.",
    "**Sign and date the request you choose, personally.** The platform never signs for you and never dates a signing line.",
    "**Send the request you choose to the supervising or detaining authority** by ordinary mail or that authority's stated correspondence channel. Keep a copy and a record of the date sent.",
    "**Re-check with the clerk of circuit court afterwards** to learn whether the certificate reached the court and the record left public access."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**The current recipient address and the case details on the request you use.** These are facts of your own matter that you copy from the office and case records before sending; no court assigns them at filing."
  ],
  "recordSays": [
    [
      "The committed track registry",
      "Confirm with the clerk of circuit court that no certificate of discharge was received before sending the request, and re-check Wisconsin Circuit Court Access afterwards to see whether the record left public access."
    ]
  ],
  "notTold": [],
  "stopConditions": [
    "The judge did not order expungement at sentencing. There is no certificate owed and the request would be pointless.",
    "Any dispute about whether completion was successful, particularly a revocation or a subsequent conviction, because those are the two facts that destroy the expungement entirely.",
    "The supervising authority declines to issue the certificate, or asserts that completion was not successful.",
    "The authority does not respond, or responds that it has issued and forwarded the certificate while the clerk says nothing was received.",
    "Any request to argue entitlement, allege agency fault or press the authority beyond a neutral request. That is individualized advocacy and outside self-help.",
    "Immigration consequences.",
    "Federal, tribal or out-of-state records.",
    "Neutral request only. Do not draft accusations of agency misconduct, assertions of legal entitlement that would require document review, or any individualized advocacy. Where the authority declines or disputes completion, refer to a lawyer.",
    "After the participant sends the request, issuance and forwarding are the supervising authority's acts and the sealing follows from the certificate reaching the clerk. The packet ends at the letter and the follow-up checklist."
  ],
  "whatThisIsNot": "This is a prepared set of composed pleadings. It is not an official WI form — no committed record names one for this route — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any particular record meets this route's recorded conditions",
    "that any expungement was in fact ordered at sentencing, which the committed generation requirements make a participant fact to confirm from the record"
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
      "finding": "The committed specifications record the second component's venue as 'Not a court filing': the status request is addressed to the supervising or detaining authority, which is the Department of Corrections in most probation cases.",
      "consequence": "The status request is composed as a letter to that authority rather than as a court filing, and the filing instructions page states which page goes where. The relief itself was already ordered by the sentencing court; this packet chases the certificate that triggers it."
    }
  ],
  "counselQuestions": [
    "The composed pages assert this route's statutory ground in the committed records' own words. Confirm the composed instrument is sufficient where no official form is named for this route.",
    "Where the committed records record an express non-statement about fee, waiver, notice or service, the packet names the office that answers it. Confirm the delegation or supply the content."
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

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
  lines.push("", `Route: ${c.routeKey}`);
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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
  out.push(`# What you must do before you send this request — ${SPEC.routeName}`, "");
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
  for (const c of SPEC.components) {
    const condition = c.condition ? ` **Only use this component when:** ${c.condition}` : "";
    out.push(`| \`${c.id}\` | ${c.description}${condition} |`);
  }
  out.push("");

  out.push("## Where this request goes, what it costs, and whether service is required", "");
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

  out.push("## When to stop and get help before sending", "");
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
    const primaryId = "wi_exp_certificate_of_discharge_followup-primary-filing-1";
    const statusId = "wi_exp_certificate_of_discharge_followup-status-request-2";
    const primary = COMPONENT[primaryId];
    const status = COMPONENT[statusId];
    const instructions = participantInstructions(maps, requiredBeforeFilingItems(maps));
    assert.equal(status.condition,
      "Used where the participant wants only to know whether the certificate has issued, rather than to ask that it be issued.",
      "the status request must preserve the registry's only-if condition");
    assert.ok(primary.blanks.some((b) => b.kind === "rbf" && b.id === "addressee_detail"),
      "the primary request must inventory the supervising authority mailing-address blank");
    assert.ok(!primary.blanks.some((b) => b.id === "case_number"),
      "the non-court primary request must not invent a court-assigned case number");
    assert.match(instructions, /Only use this component when:.*wants only to know whether the certificate has issued/i,
      "the component table must disclose the status request's only-if condition");
    assert.doesNotMatch(instructions, /File the pages for your route/i,
      "instructions must not tell the participant to file an administrative request");
    assert.doesNotMatch(instructions, /Every case number in every caption/i,
      "instructions must not describe a nonexistent court caption or court-assigned number");
    assert.match(instructions, /send the request you choose to the supervising or detaining authority/i,
      "instructions must direct the selected request to the registry's administrative destination");
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
      const composedBytes = await renderComposedPdf(body, COMPONENT[componentId].title);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
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
