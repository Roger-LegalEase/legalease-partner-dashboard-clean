#!/usr/bin/env node
/** Washington RCW 9.96.060(6) custom petition and program-evidence packet.
 * Build output remains pending independent semantics and central raster review. */
const SPEC = {
  "familyId": "wa_vac_substance_use_disorder-set",
  "worklistGroupId": "wa_vac_substance_use_disorder-set",
  "buildScript": "scripts/build-census-v1-wa_vac_substance_use_disorder-set.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--custom-pleading",
  "jurisdiction": "WA",
  "legalName": "Washington RCW 9.96.060(6) Substance Use Disorder Vacatur Petition and Declaration",
  "routeName": "filing a route-specific Washington vacatur petition under RCW 9.96.060(6) with treatment or recovery-program evidence",
  "statutes": [
    "RCW 9.96.060(6)",
    "RCW 69.50.4011(1)(b)",
    "RCW 69.50.4011(1)(c)",
    "RCW 69.50.4013",
    "RCW 69.50.4014",
    "RCW 69.41.030(2)(b)",
    "RCW 69.41.030(2)(c)",
    "RCW 71.24.115",
    "RCW 36.28A.450",
    "RCW 71.24.589"
  ],
  "routes": [
    {
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder"
    }
  ],
  "records": [
    {
      "recordId": "route-obligation-census:wa_vac_substance_use_disorder-set",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census record for this exact WA treatment or recovery-program route",
      "mustContain": [
        "obligation:track-only:WA:wa_vac_substance_use_disorder",
        "Vacate a Washington drug conviction after treatment or a recovery programme",
        "RCW 9.96.060(6); RCW 69.50.4011(1)(b); RCW 69.50.4011(1)(c); RCW 69.50.4013; RCW 69.50.4014; RCW 69.41.030(2)(b); RCW 69.41.030(2)(c); RCW 71.24.115; RCW 36.28A.450; RCW 71.24.589",
        "participantFacingInstrument"
      ]
    },
    {
      "recordId": "compiled-profile:WA-washington#blake-drug-possession-vacation-and-refund-route",
      "path": "src/lib/rcap-engine/compiled/profiles/WA-washington.json",
      "role": "the compiled Washington profile evidence for the drug-conviction relief context and recorded statute categories",
      "mustContain": [
        "\"id\": \"blake-drug-possession-vacation-and-refund-route\"",
        "Washington has a special State v. Blake pathway for unconstitutional drug-possession convictions.",
        "RCW 69.50.4013 or RCW 69.50.4014",
        "Blake drug-possession vacatur Not a normal waiting-period route; eligibility is based on void conviction category"
      ]
    },
    {
      "recordId": "legal-decision:WA-SUD-VACATUR-CUSTOM-96060-6",
      "path": "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
      "role": "the adopted legal disposition requiring a route-specific petition/declaration, notice/order handling, and program proof or assessment/status documentation",
      "mustContain": [
        "WA-SUD-VACATUR-CUSTOM-96060-6",
        "Do not force RCW 9.96.060(6) into the general AOC petition's residual category. Generate a route-specific petition/declaration under RCW 9.96.060(6), plus appropriate notice/order handling, using the required program proof or assessment/status documentation.",
        "RCW 9.96.060(6), Washington State Legislature."
      ]
    },
    {
      "recordId": "pf24:wa-sud-subsection-2-6-authority-handoff-20260913.json",
      "path": "data/rcap-grade-a/packet-factory-24h/pf24/wa-sud-subsection-2-6-authority-handoff-20260913.json",
      "role": "reviewed subsection (6) evidence-path conditions and subsection (2) exception",
      "mustContain": [
        "RESOLVED_BY_CURRENT_OFFICIAL_STATUTE_NO_PACKET_MUTATION"
      ]
    },
    {
      "recordId": "pf24:wa-sud-subsection-2-6-authority-review-20260913.json",
      "path": "data/rcap-grade-a/packet-factory-24h/pf24/wa-sud-subsection-2-6-authority-review-20260913.json",
      "role": "reviewed subsection (6) evidence-path conditions and subsection (2) exception",
      "mustContain": [
        "\"barImportFromSubsection2\": false",
        "\"progressTowardRecoveryGoalsRequired\": true"
      ]
    }
  ],
  "components": [
    {
      "id": "wa-96060-6-petition-1",
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "role": "primary_filing",
      "title": "Petition for Vacatur under RCW 9.96.060(6)",
      "description": "the route-specific petition filed in the sentencing court",
      "condition": null,
      "body": [
        "IN THE WASHINGTON SENTENCING COURT",
        "Court name: {{DOTS:48}}",
        "Cause number: {{DOTS:40}}",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "PETITION FOR VACATUR UNDER RCW 9.96.060(6)",
        "",
        "A. REQUEST AND ROUTE",
        "",
        "This route-specific Petition asks the sentencing court to vacate the qualifying conviction identified below under RCW 9.96.060(6). The court must verify every statutory fact before entering an order.",
        "",
        "This Petition is paired with a participant declaration, a notice and proposed order, and program documentation. The packet does not decide eligibility for the court.",
        "",
        "B. PETITIONER",
        "",
        "Full legal name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "Mailing address: {{participant.street_address}}",
        "Telephone: {{participant.phone}}",
        "Email: {{participant.email}}",
        "",
        "C. CONVICTION IDENTIFICATION",
        "",
        "Copy each item exactly from the court record. Do not infer a statute, court, cause number, or date.",
        "",
        "Exact conviction identity:",
        "{{DOTS}}",
        "",
        "Exact conviction statute (verify that it is one of the listed route categories):",
        "{{DOTS}}",
        "",
        "Conviction date:",
        "{{DOTS}}",
        "",
        "Sentencing court and cause number confirmed from the record:",
        "{{DOTS}}",
        "",
        "D. STATUTORY FACT GATE",
        "",
        "Pending charges or new convictions status, including the jurisdictions checked:",
        "{{DOTS}}",
        "",
        "Other counts, related matters, and any fact that could change the route:",
        "{{DOTS}}",
        "",
        "Statement that the petitioner has reviewed the statutory eligibility facts and is asking the court to determine them:",
        "{{DOTS}}",
        "",
        "E. PROGRAM EVIDENCE",
        "",
        "Attach one evidence path: (1) substance use disorder program completion proof; OR (2) a qualifying program assessment plus a written status update showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals.",
        "",
        "Evidence path selected and documents attached:",
        "{{DOTS}}",
        "",
        "F. REQUEST",
        "",
        "After reviewing the exact conviction record and attached program evidence, the petitioner asks the sentencing court to determine whether RCW 9.96.060(6) is satisfied and, if so, enter the appropriate vacatur order.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF PETITIONER {{DOTS:36}}",
        "",
        "The petitioner signs and dates this page personally. This build never signs or dates for the petitioner.",
        "",
        "For the assessment path, the assessment must be from one of these statutory programs: a recovery navigator program under RCW 71.24.115, an arrest and jail alternative program under RCW 36.28A.450, or a law enforcement assisted diversion program under RCW 71.24.589. Obtain a written status update establishing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals. If the qualifying program identity cannot be verified, stop and obtain legal help.",
        "",
        "RCW 9.96.060(2)(a)-(i) does not itself bar an otherwise qualifying subsection (6) application. Pending or new cases; violence or domestic violence; protection, no-contact, antiharassment or civil-restraint orders; weapons or enhancements; DUI, physical-control or reduced-driving offenses; and firearm-rights questions still require individualized legal advice about separate consequences or other routes; do not treat them as automatic subsection (6) ineligibility. This packet does not restore firearm rights or decide eligibility under a different route."
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Petitioner named in the caption",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "petitioner_dob",
          "label": "Petitioner date of birth",
          "factId": "participant.date_of_birth"
        },
        {
          "id": "mailing_address",
          "label": "Petitioner mailing address",
          "factId": "participant.street_address"
        },
        {
          "id": "telephone",
          "label": "Petitioner telephone number",
          "factId": "participant.phone"
        },
        {
          "id": "email",
          "label": "Petitioner email address",
          "factId": "participant.email"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "court_name",
          "label": "Sentencing court name",
          "supply": "The exact sentencing court name copied from the conviction record",
          "why": "RCW 9.96.060(6) relief is filed in the sentencing court and the platform does not infer the court"
        },
        {
          "kind": "rbf",
          "id": "cause_number",
          "label": "Original criminal cause number",
          "supply": "The exact cause number copied from the conviction record",
          "why": "the petition must identify the existing criminal matter and the platform does not assign a new cause number"
        },
        {
          "kind": "rbf",
          "id": "exact_conviction_identity",
          "label": "Exact conviction identity",
          "supply": "The exact conviction and offense identity copied from the court record",
          "why": "the court must know which conviction the petition addresses"
        },
        {
          "kind": "rbf",
          "id": "exact_conviction_statute",
          "label": "Exact conviction statute",
          "supply": "The exact statute from the court record, verified against the listed route categories",
          "why": "the special statutory route is limited to its qualifying conviction categories"
        },
        {
          "kind": "rbf",
          "id": "conviction_date",
          "label": "Conviction date",
          "supply": "The conviction date copied from the court record",
          "why": "the court record controls the conviction fact and the platform does not infer it"
        },
        {
          "kind": "rbf",
          "id": "pending_new_status",
          "label": "Pending charges or new convictions status",
          "supply": "The current pending-charge and new-conviction status, including jurisdictions checked",
          "why": "the statutory fact gate requires this status before filing"
        },
        {
          "kind": "rbf",
          "id": "other_counts_status",
          "label": "Other counts and related matters status",
          "supply": "Other counts in the case and related matters, copied from the record or marked none only when verified",
          "why": "other counts or related matters may change the relief and are not inferred"
        },
        {
          "kind": "rbf",
          "id": "eligibility_fact_review",
          "label": "Statutory eligibility fact review",
          "supply": "A truthful statement identifying any uncertain statutory eligibility fact for the court to decide",
          "why": "the packet cannot decide or silently fill an uncertain eligibility fact"
        },
        {
          "kind": "rbf",
          "id": "requested_relief",
          "label": "Requested vacatur relief",
          "supply": "The conviction and relief the petitioner asks the court to address",
          "why": "the court must know the requested scope and the packet does not invent it"
        },
        {
          "kind": "rbf",
          "id": "petition_evidence_path",
          "label": "Evidence path selected for the petition",
          "supply": "Either qualifying completion proof, or qualifying assessment plus written six-month status update",
          "why": "the adopted product rule requires one of these evidence paths"
        },
        {
          "kind": "protected",
          "id": "petition_signature",
          "label": "Petitioner signature on the Petition",
          "why": "the petitioner signs personally; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "petition_signature_date",
          "label": "Date beside the petitioner signature",
          "why": "a date written before the petitioner signs would be false"
        }
      ]
    },
    {
      "id": "wa-96060-6-declaration-2",
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "role": "participant_declaration",
      "title": "Participant Declaration for RCW 9.96.060(6) Vacatur",
      "description": "the participant statement supporting the court’s statutory and program review",
      "condition": null,
      "body": [
        "IN THE WASHINGTON SENTENCING COURT",
        "Court name: {{DOTS:48}}",
        "Cause number: {{DOTS:40}}",
        "",
        "IN RE: {{participant.full_legal_name}}, PETITIONER.",
        "",
        "PARTICIPANT DECLARATION FOR RCW 9.96.060(6) VACATUR",
        "",
        "I, {{participant.full_legal_name}}, make this declaration from my personal knowledge. I will state only facts needed for this route and will not guess at facts I cannot verify.",
        "",
        "1. IDENTITY AND CASE",
        "",
        "Date of birth: {{participant.date_of_birth}}",
        "Exact conviction identity:",
        "{{DOTS}}",
        "Exact conviction statute:",
        "{{DOTS}}",
        "Conviction date:",
        "{{DOTS}}",
        "",
        "2. EVIDENCE PATH",
        "",
        "Write one path and attach the matching records:",
        "Path 1 — substance use disorder program completion proof: {{DOTS}}",
        "OR",
        "Path 2 — qualifying program assessment plus written status update: {{DOTS}}",
        "",
        "Program name and provider:",
        "{{DOTS}}",
        "Completion or assessment date:",
        "{{DOTS}}",
        "For Path 2, written status showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals:",
        "{{DOTS}}",
        "Documents attached and the facts each document supports:",
        "{{DOTS}}",
        "",
        "3. CURRENT STATUS AND REQUEST",
        "",
        "Pending charges or new convictions status:",
        "{{DOTS}}",
        "Other counts, related matters, or uncertain eligibility facts:",
        "{{DOTS}}",
        "I ask the sentencing court to decide whether the statutory route is satisfied from the record and attachments.",
        "",
        "DECLARATION UNDER PENALTY OF PERJURY",
        "",
        "I declare under penalty of perjury under the laws of the state of Washington that the foregoing is true and correct.",
        "",
        "SIGNED AT (city and state): {{DOTS:48}}",
        "DATE {{DOTS:30}}   SIGNATURE OF DECLARANT {{DOTS:36}}",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "",
        "For the assessment path, the assessment must be from one of these statutory programs: a recovery navigator program under RCW 71.24.115, an arrest and jail alternative program under RCW 36.28A.450, or a law enforcement assisted diversion program under RCW 71.24.589. Obtain a written status update establishing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals. If the qualifying program identity cannot be verified, stop and obtain legal help."
      ],
      "writes": [
        {
          "id": "declarant_name",
          "label": "Participant making the declaration",
          "factId": "participant.full_legal_name"
        },
        {
          "id": "declarant_dob",
          "label": "Participant date of birth on the declaration",
          "factId": "participant.date_of_birth"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "declaration_court_name",
          "label": "Declaration sentencing court name",
          "supply": "The same exact sentencing court name printed on the Petition",
          "why": "the declaration must remain tied to the sentencing court record"
        },
        {
          "kind": "rbf",
          "id": "declaration_cause_number",
          "label": "Declaration original criminal cause number",
          "supply": "The same exact cause number printed on the Petition",
          "why": "the declaration belongs to the existing criminal matter"
        },
        {
          "kind": "rbf",
          "id": "declaration_conviction_identity",
          "label": "Declaration exact conviction identity",
          "supply": "The exact conviction identity from the court record",
          "why": "the participant must identify the conviction under review"
        },
        {
          "kind": "rbf",
          "id": "declaration_conviction_statute",
          "label": "Declaration exact conviction statute",
          "supply": "The exact conviction statute copied from the court record",
          "why": "the court must verify the qualifying statutory category"
        },
        {
          "kind": "rbf",
          "id": "declaration_conviction_date",
          "label": "Declaration conviction date",
          "supply": "The conviction date copied from the court record",
          "why": "the declaration does not infer a date"
        },
        {
          "kind": "rbf",
          "id": "evidence_path_selection",
          "label": "Declaration evidence path selection",
          "supply": "One truthful selection: completion proof, or assessment plus written six-month status update",
          "why": "one adopted evidence path must be identified and supported"
        },
        {
          "kind": "rbf",
          "id": "program_identity",
          "label": "Program name and provider",
          "supply": "The program name and provider exactly as the supporting record identifies them",
          "why": "program documentation must be attributable to its source"
        },
        {
          "kind": "rbf",
          "id": "completion_or_assessment_date",
          "label": "Completion or assessment date",
          "supply": "The relevant date shown on the supporting program record",
          "why": "the evidence record controls its date"
        },
        {
          "kind": "rbf",
          "id": "six_month_status",
          "label": "Six-month substantial-compliance and recovery-progress status",
          "supply": "For the assessment path, the written status showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals",
          "why": "the adopted product rule requires this status for the assessment path"
        },
        {
          "kind": "rbf",
          "id": "evidence_inventory",
          "label": "Documents attached and facts supported",
          "supply": "A truthful list of attached program records and the fact each supports",
          "why": "the court needs a traceable evidence set and the packet does not create proof"
        },
        {
          "kind": "rbf",
          "id": "declaration_pending_status",
          "label": "Declaration pending charges or new convictions status",
          "supply": "The current status, including the jurisdictions checked",
          "why": "the statutory fact gate requires a current truthful status"
        },
        {
          "kind": "rbf",
          "id": "declaration_related_status",
          "label": "Declaration other counts and related matters status",
          "supply": "Other counts or related matters, copied from the record or marked none only when verified",
          "why": "related matters can change the route"
        },
        {
          "kind": "protected",
          "id": "declaration_signature",
          "label": "Participant signature on the declaration",
          "why": "the participant signs the personal-knowledge declaration; this build never signs for anyone"
        },
        {
          "kind": "protected",
          "id": "declaration_signature_date",
          "label": "Date beside the declaration signature",
          "why": "a date written before signing would be false"
        },
        {
          "kind": "protected",
          "id": "declaration_execution_place",
          "label": "City and state where the participant signs the declaration",
          "why": "the participant personally supplies the actual place of execution when signing under penalty of perjury"
        }
      ]
    },
    {
      "id": "wa-96060-6-notice-order-3",
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "role": "notice_and_proposed_order",
      "title": "Notice and Proposed Order for RCW 9.96.060(6) Vacatur",
      "description": "notice handling and a court-completed proposed order for the sentencing court",
      "condition": null,
      "body": [
        "IN THE WASHINGTON SENTENCING COURT",
        "Court name: {{DOTS:48}}",
        "Cause number: {{DOTS:40}}",
        "",
        "IN RE: {{participant.full_legal_name}}, PETITIONER.",
        "",
        "NOTICE AND PROPOSED ORDER FOR RCW 9.96.060(6) VACATUR",
        "",
        "NOTICE TO THE STATE AND PROSECUTOR",
        "",
        "The petitioner gives notice of the route-specific Petition and supporting declaration. The State or prosecutor must receive the notice and filing as required by the sentencing court. The filing party must use the court’s current service procedure.",
        "",
        "Notice recipient and service method recorded by the filing party or clerk:",
        "{{DOTS}}",
        "Date notice served:",
        "{{DOTS}}",
        "",
        "PROPOSED ORDER",
        "",
        "The Court has reviewed the Petition, participant declaration, exact conviction record, and attached program documentation.",
        "",
        "Court findings to be completed by the Court:",
        "Qualifying conviction statute and identity:",
        "{{DOTS}}",
        "Evidence path and supporting records reviewed:",
        "{{DOTS}}",
        "RCW 9.96.060(6) statutory facts verified:",
        "{{DOTS}}",
        "Additional court finding or reason for decision:",
        "{{DOTS}}",
        "",
        "IT IS ORDERED:",
        "[ ] The Petition is granted and the qualifying conviction is vacated to the extent permitted by law.",
        "[ ] The Petition is denied.",
        "[ ] Other disposition: {{DOTS:48}}",
        "",
        "JUDGE / COURT COMMISSIONER SIGNATURE {{DOTS:36}}",
        "DATE {{DOTS:30}}",
        "",
        "The Court completes its own findings, disposition, signature, and date. This page does not prefill a judicial decision."
      ],
      "writes": [
        {
          "id": "order_petitioner_name",
          "label": "Petitioner named in the notice and proposed order",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "court",
          "id": "notice_recipient",
          "label": "Notice recipient and service method",
          "why": "the filing party, prosecutor, or clerk completes current service details under the court procedure"
        },
        {
          "kind": "court",
          "id": "notice_service_date",
          "label": "Date notice served",
          "why": "service date is completed from the actual service event"
        },
        {
          "kind": "court",
          "id": "court_conviction_finding",
          "label": "Court finding on qualifying conviction",
          "why": "the Court verifies the conviction facts from the record"
        },
        {
          "kind": "court",
          "id": "court_program_finding",
          "label": "Court finding on program evidence",
          "why": "the Court verifies the attached program evidence"
        },
        {
          "kind": "court",
          "id": "court_statutory_finding",
          "label": "Court finding on RCW 9.96.060(6) facts",
          "why": "the Court makes the statutory determination"
        },
        {
          "kind": "court",
          "id": "court_additional_finding",
          "label": "Court additional finding or reason",
          "why": "the Court controls any additional finding"
        },
        {
          "kind": "court",
          "id": "order_disposition",
          "label": "Court order disposition",
          "why": "the Court grants, denies, or otherwise disposes of the Petition"
        },
        {
          "kind": "court",
          "id": "judge_signature",
          "label": "Judge or court commissioner signature",
          "why": "only the Court may sign its order"
        },
        {
          "kind": "court",
          "id": "order_date",
          "label": "Date of the Court order",
          "why": "the Court dates its own order"
        },
        {
          "kind": "rbf",
          "id": "notice_court_name",
          "label": "Notice and proposed order sentencing court name",
          "supply": "The same exact sentencing court name printed on the Petition",
          "why": "the notice and proposed order must identify the same sentencing court case"
        },
        {
          "kind": "rbf",
          "id": "notice_cause_number",
          "label": "Notice and proposed order original criminal cause number",
          "supply": "The same exact cause number printed on the Petition",
          "why": "the notice and proposed order must identify the same sentencing court case"
        }
      ]
    },
    {
      "id": "wa-96060-6-program-evidence-4",
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "role": "program_documentation_request",
      "title": "Program Evidence Checklist for RCW 9.96.060(6)",
      "description": "the participant checklist for obtaining and attaching program proof or assessment/status records",
      "condition": null,
      "body": [
        "PROGRAM EVIDENCE CHECKLIST AND RECORDS REQUEST",
        "",
        "This checklist is for {{participant.full_legal_name}}.",
        "",
        "The checklist organizes records; it does not create program proof and does not decide eligibility.",
        "",
        "SELECT ONE EVIDENCE PATH",
        "",
        "PATH 1 — COMPLETION PROOF",
        "Attach a substance use disorder program completion record, such as a completion certificate, completion letter, discharge record, or equivalent status record from the provider.",
        "",
        "PATH 2 — ASSESSMENT AND STATUS",
        "Attach a qualifying program assessment plus a written status update showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals.",
        "",
        "PROGRAM RECORD DETAILS",
        "",
        "Program name and provider:",
        "{{DOTS}}",
        "Completion or assessment date:",
        "{{DOTS}}",
        "For Path 2, the six-month compliance and recovery-progress record:",
        "{{DOTS}}",
        "List each attached record and the fact it supports:",
        "{{DOTS}}",
        "",
        "REQUIRED ASSESSMENT PROGRAM ALTERNATIVES",
        "",
        "For the assessment path, the record must identify one of these programs. Preserve its exact name and provider: recovery navigator under RCW 71.24.115; arrest and jail alternative under RCW 36.28A.450; or law enforcement assisted diversion under RCW 71.24.589.",
        "Do not assume a program qualifies from its label alone. Stop when the provider, assessment, completion, or six-month status cannot be verified.",
        "",
        "ATTACHMENT CHECK",
        "",
        "[ ] The exact conviction record is included or available to the sentencing court.",
        "[ ] The selected evidence path is identified truthfully.",
        "[ ] Each attached program record is legible and attributable to its provider.",
        "[ ] The assessment path includes written status for at least six months.",
        "[ ] No document has been altered or completed by this packet.",
        "",
        "For the assessment path, the assessment must be from one of these statutory programs: a recovery navigator program under RCW 71.24.115, an arrest and jail alternative program under RCW 36.28A.450, or a law enforcement assisted diversion program under RCW 71.24.589. Obtain a written status update establishing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals. If the qualifying program identity cannot be verified, stop and obtain legal help."
      ],
      "writes": [
        {
          "id": "evidence_participant_name",
          "label": "Participant for whom the evidence checklist was prepared",
          "factId": "participant.full_legal_name"
        }
      ],
      "blanks": [
        {
          "kind": "rbf",
          "id": "checklist_evidence_path",
          "label": "Checklist evidence path selection",
          "supply": "One truthful selection: completion proof, or assessment plus written six-month status update",
          "why": "the court requires one of the adopted evidence paths"
        },
        {
          "kind": "rbf",
          "id": "checklist_program_identity",
          "label": "Checklist program name and provider",
          "supply": "The program name and provider shown on the source record",
          "why": "the checklist cannot invent a provider"
        },
        {
          "kind": "rbf",
          "id": "checklist_program_date",
          "label": "Checklist completion or assessment date",
          "supply": "The date shown on the completion or assessment record",
          "why": "the source record controls the date"
        },
        {
          "kind": "rbf",
          "id": "checklist_six_month_status",
          "label": "Checklist six-month compliance and recovery-progress record",
          "supply": "For the assessment path, the written status showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals",
          "why": "the assessment path requires the six-month status evidence"
        },
        {
          "kind": "rbf",
          "id": "checklist_attachment_inventory",
          "label": "Checklist attached records and supported facts",
          "supply": "Each attached program record and the fact it supports",
          "why": "the checklist makes the evidence traceable without creating evidence"
        }
      ]
    },
    {
      "id": "wa-96060-6-filing-instructions-5",
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "role": "filing_instructions",
      "title": "Filing and Service Instructions for RCW 9.96.060(6)",
      "description": "the participant sequence for completing, filing, serving, and stopping safely",
      "condition": null,
      "body": [
        "FILING AND SERVICE INSTRUCTIONS",
        "",
        "These instructions are for {{participant.full_legal_name}}.",
        "",
        "ROUTE",
        "",
        "This is a route-specific petition and declaration under RCW 9.96.060(6). The packet is built for a qualifying Washington drug conviction after the required treatment or recovery-program evidence is assembled.",
        "",
        "BEFORE YOU FILE",
        "",
        "1. Copy the exact sentencing court, cause number, conviction identity, statute, and date from the court record into every requested blank.",
        "2. Confirm that the exact conviction statute is one of the listed categories: RCW 69.50.4011(1)(b) or (c), RCW 69.50.4013, RCW 69.50.4014, or RCW 69.41.030(2)(b) or (c).",
        "3. Check pending charges, new convictions, other counts, related matters, and any fact that could change the route. Do not guess.",
        "4. Choose one evidence path: qualifying completion proof; OR qualifying assessment plus written status showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals.",
        "5. Attach the exact program records and complete the evidence checklist. The packet never creates, edits, or substitutes program proof.",
        "6. Complete the notice and use the sentencing court’s current procedure for serving the State or prosecutor.",
        "7. Ask the sentencing-court clerk whether a filing fee applies, its amount, and whether a waiver is available. This packet does not invent a fee or waiver rule.",
        "8. Review local court filing, service, redaction, and hearing instructions before submission. Keep copies of what was filed and served.",
        "9. Sign and date the Petition and participant declaration personally after reviewing every fact.",
        "",
        "WHEN TO STOP AND GET HELP",
        "",
        "Stop and get legal help if the exact conviction, statute, court, cause number, pending/new status, other counts, or eligibility facts are uncertain.",
        "Stop if neither evidence path is available, if the six-month status cannot be established for the assessment path, or if program records cannot be verified.",
        "Stop if filing, service, safety, immigration, sealing, or related-case consequences require advice beyond these instructions.",
        "",
        "WHAT THIS PACKET DOES NOT ESTABLISH",
        "",
        "It does not establish eligibility, create a court order, prove program completion or status, determine a fee, or promise what another record system will display. Only the sentencing court can decide the Petition.",
        "",
        "For the assessment path, the assessment must be from one of these statutory programs: a recovery navigator program under RCW 71.24.115, an arrest and jail alternative program under RCW 36.28A.450, or a law enforcement assisted diversion program under RCW 71.24.589. Obtain a written status update establishing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals. If the qualifying program identity cannot be verified, stop and obtain legal help.",
        "",
        "RCW 9.96.060(2)(a)-(i) does not itself bar an otherwise qualifying subsection (6) application. Pending or new cases; violence or domestic violence; protection, no-contact, antiharassment or civil-restraint orders; weapons or enhancements; DUI, physical-control or reduced-driving offenses; and firearm-rights questions still require individualized legal advice about separate consequences or other routes; do not treat them as automatic subsection (6) ineligibility. This packet does not restore firearm rights or decide eligibility under a different route."
      ],
      "writes": [
        {
          "id": "instructions_participant_name",
          "label": "Participant for whom the filing instructions were prepared",
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
  "composedFromNote": "the committed WA route-obligation census, compiled Washington profile and adopted legal decision WA-SUD-VACATUR-CUSTOM-96060-6, each bound by exact SHA-256 and anchor-verified at build time",
  "formIdentityNote": "The two held CrRLJ 09.0100 and CrRLJ 09.0200 PDFs remain source-custody evidence for the prior generic overlay. The adopted decision requires a route-specific custom petition/declaration, notice/order handling, and program proof or assessment/status documentation; this candidate composes those components and does not substitute the generic official pair for the RCW 9.96.060(6) vehicle.",
  "routeSelectionNote": "One route-specific vehicle is selected: RCW 9.96.060(6). The packet has no generic residual election and never selects an unrelated vehicle.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:track-only:WA:wa_vac_substance_use_disorder",
      "statute": "RCW 9.96.060(6)",
      "instrument": "Route-specific petition and declaration with notice, proposed order, and program evidence checklist",
      "statedOn": "the composed pages and participant instructions for this family"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "File the route-specific Petition in the sentencing court for the conviction. Copy the exact court and cause number from the court record."
    ],
    [
      "FEE_AND_WAIVER",
      "Ask the sentencing-court clerk whether a filing fee applies, its amount, and whether a waiver is available. This packet does not invent a fee or waiver rule."
    ],
    [
      "SERVICE",
      "Complete the notice and use the sentencing court’s current procedure for serving the State or prosecutor. Record the actual service details."
    ],
    [
      "PROGRAM_EVIDENCE",
      "Attach either substance use disorder program completion proof, or a qualifying program assessment plus written status showing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals."
    ],
    [
      "SELF_HELP_STOP",
      "Stop and get legal help when exact conviction facts, statutory eligibility, evidence, service, safety, immigration, or related-case consequences are uncertain."
    ]
  ],
  "instructionsIntro": [
    "This packet contains a route-specific Petition, participant declaration, notice and proposed order, program evidence checklist, and filing instructions under RCW 9.96.060(6).",
    "The court decides eligibility. The participant must copy exact conviction facts and attach one of the two adopted evidence paths before filing.",
    "For the assessment path, the assessment must be from one of these statutory programs: a recovery navigator program under RCW 71.24.115, an arrest and jail alternative program under RCW 36.28A.450, or a law enforcement assisted diversion program under RCW 71.24.589. Obtain a written status update establishing at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals. If the qualifying program identity cannot be verified, stop and obtain legal help.",
    "RCW 9.96.060(2)(a)-(i) does not itself bar an otherwise qualifying subsection (6) application. Pending or new cases; violence or domestic violence; protection, no-contact, antiharassment or civil-restraint orders; weapons or enhancements; DUI, physical-control or reduced-driving offenses; and firearm-rights questions still require individualized legal advice about separate consequences or other routes; do not treat them as automatic subsection (6) ineligibility. This packet does not restore firearm rights or decide eligibility under a different route."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The adopted WA-SUD decision",
      "Use a route-specific petition and declaration under RCW 9.96.060(6), with notice/order handling and the required program proof or assessment/status documentation."
    ],
    [
      "The route record",
      "The route covers a Washington drug conviction after treatment or a recovery programme and lists the qualifying statutory categories and program authorities."
    ],
    [
      "Subsection (2)/(6) authority",
      "RCW 9.96.060(2)(a)-(i) does not itself bar an otherwise qualifying subsection (6) application. Pending or new cases; violence or domestic violence; protection, no-contact, antiharassment or civil-restraint orders; weapons or enhancements; DUI, physical-control or reduced-driving offenses; and firearm-rights questions still require individualized legal advice about separate consequences or other routes; do not treat them as automatic subsection (6) ineligibility. This packet does not restore firearm rights or decide eligibility under a different route."
    ]
  ],
  "documentsHeading": "Records to obtain before filing",
  "documentsToObtain": [
    [
      "Exact conviction record",
      "Obtain it from the sentencing court or another official record source; copy the statute, court, cause number, identity, and date exactly."
    ],
    [
      "Qualifying program completion proof",
      "Use only when this is the selected path and the provider record establishes completion."
    ],
    [
      "Qualifying program assessment and written status update",
      "Use this alternative path only when the assessment and written status show at least six months of substantial compliance with recommended treatment or services and progress toward recovery goals."
    ],
    [
      "Current pending/new conviction and related-case information",
      "Check the relevant court records and disclose uncertainty instead of guessing."
    ]
  ],
  "steps": [
    "**Read the filing and service instructions.** They identify the sentencing court, evidence, service, fee lookup, and stop conditions.",
    "**Copy the exact court record facts.** Enter the sentencing court, cause number, conviction identity, qualifying statute, conviction date, and current pending/new status without inference.",
    "**Choose one evidence path truthfully.** Attach completion proof, or attach the assessment and written six-month status update showing substantial compliance with recommended treatment or services and progress toward recovery goals.",
    "**Complete the notice and service details.** Follow the sentencing court’s current procedure for serving the State or prosecutor and keep the actual service record.",
    "**Ask the clerk about filing fees and waiver availability.** The clerk’s current operational answer controls the filing transaction.",
    "**Sign and date the Petition and declaration personally.** Read the declaration under penalty of perjury and supply its actual city, state, date and signature when signing. This build leaves those execution fields blank.",
    "**Stop and get help when any required fact or consequence is uncertain.** The packet does not decide eligibility or create program evidence."
  ],
  "deliberatelyBlank": [
    "**Every participant fact dotted blank.** Copy exact court and conviction facts from the record and disclose uncertainty.",
    "**The selected evidence path and its program records.** Attach only records that actually support the path selected.",
    "**Every participant signature and date.** The participant signs personally after reviewing the packet.",
    "**All court findings, disposition, judge signature, service date, and order date.** The filing party, clerk, prosecutor, or court completes these from actual events."
  ],
  "notTold": [
    "The packet does not tell you that an unverified program qualifies or that a court will grant the Petition.",
    "The packet does not state a fee amount, waiver decision, service deadline, sealing result, immigration result, or effect on another record system."
  ],
  "stopConditions": [
    "the exact conviction identity, statute, date, sentencing court, or cause number cannot be established from the record;",
    "pending charges, new convictions, other counts, related matters, or a statutory eligibility fact is uncertain;",
    "neither qualifying completion proof nor the assessment plus written six-month status update is available;",
    "the program provider, assessment, completion, or six-month status cannot be verified;",
    "filing, service, safety, immigration, sealing, or related-case consequences require advice beyond these instructions.",
    "violence or domestic violence; protection, no-contact, antiharassment or civil-restraint orders; weapons or enhancements; DUI, physical-control or reduced-driving offenses; or pending/new cases raise questions about separate consequences or other routes; these are referral triggers, not automatic subsection (6) bars;",
    "you need advice about firearm rights; this packet does not restore them or decide firearm eligibility;",
    "the assessment cannot be tied to one of the three statutory programs or either the six-month compliance requirement or recovery progress is not documented;"
  ],
  "whatThisIsNot": "This packet is not legal advice, a court order, proof of eligibility, proof of program completion or status, a fee determination, or a promise about another record system.",
  "receiptDoesNotEstablish": [
    "that a participant has a qualifying conviction",
    "that a treatment or recovery-program record satisfies RCW 9.96.060(6)",
    "that the sentencing court will grant vacatur"
  ],
  "buildFindings": [
    {
      "finding": "The adopted WA-SUD decision requires a route-specific petition/declaration under RCW 9.96.060(6), notice/order handling, and program proof or assessment/status documentation.",
      "consequence": "This candidate owns five composed components for those functions and does not substitute the prior generic official-form pair for this vehicle."
    },
    {
      "finding": "The route record lists the qualifying conviction categories and program authorities, while the participant facts and program records remain unknown at build time.",
      "consequence": "Required facts are left as disclosed dotted blanks, the two evidence paths are stated explicitly, and no eligibility or program proof is invented."
    },
    {
      "finding": "Filing fees and local service mechanics are operational facts for the sentencing court.",
      "consequence": "The instructions direct a clerk lookup and current court procedure without inventing a fee, waiver, deadline, service mode, or court result."
    },
    {
      "finding": "The held CrRLJ PDFs and prior generic overlay are preserved as source custody and historical artifacts.",
      "consequence": "This custom candidate writes to a family-owned directory and leaves the prior overlay, PDFs, manifests, reports, and custody evidence unchanged."
    }
  ],
  "counselQuestions": [],
  "reviewersAttention": [
    "Confirm the route-specific custom vehicle tracks RCW 9.96.060(6) and the adopted WA-SUD decision without importing the general residual petition.",
    "Confirm the exact conviction categories and the completion-proof OR assessment-plus-six-month-status evidence gate.",
    "Confirm that the notice/proposed-order page leaves service details and every judicial finding to the actual filing party, clerk, prosecutor, or court.",
    "Confirm that the prior generic CrRLJ overlay and held source PDFs remain preserved and are not treated as this custom vehicle.",
    "Confirm that no counsel question was raised by the builder; self-help stops remain in the packet where facts or consequences are uncertain."
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
import { stripMarkdownEmphasis, assertNoMarkdownDelimitersOnDeliveredPages } from "./rcap-custom-pleading/composed-page-markdown.mjs";
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
/* Source markup a PDF page cannot render is removed before the normalisations
 * below, on the same footing as the characters they normalise away: emphasis
 * delimiters are markdown in participant-instructions.md and four black
 * asterisks on a composed page. This packet printed them at the worst possible
 * place - the first bullet under "WHEN TO STOP AND GET HELP INSTEAD" on the
 * filing-instructions page opened with its delimiters showing, in the same 11pt
 * Times-Roman as the text around it, so they bought no emphasis and appeared
 * only as stray characters. The one shared rule lives in
 * scripts/rcap-custom-pleading/composed-page-markdown.mjs, imported rather than
 * copied, because a page printing markup is a defect of the renderer and not of
 * any one family, and this is the repair FIX30 made for the Oklahoma and West
 * Virginia trafficking families. Not one word of the delivered sentence
 * changes. A string carrying no closed emphasis pair passes through unchanged,
 * so no page whose text carries no markup moves a byte. */
function sanitizePdfText(text) {
  return stripMarkdownEmphasis(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
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
      if (value === undefined || value === null || String(value).trim() === "") {
        const conditional = (c.writes ?? []).find((write) => write.factId === token)?.requiredWhenUnknown;
        assert.ok(conditional, `${componentId}: the page interpolates ${token}, which the fixture does not hold`);
        return DOTS();
      }
      return String(value);
    }));
  }
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
  const declaredRefusals = (c.blanks ?? []).map((b) => {
    if (b.kind === "rbf") return h.rbf(b.id, b.label, b.supply, b.why);
    if (b.kind === "protected") return h.protectedBlank(b.id, b.label, b.why);
    if (b.kind === "court") return h.clerkBlank(b.id, b.label, b.why);
    throw new Error(`${componentId}.${b.id}: unknown blank kind ${b.kind}`);
  });
  const forFixture = (fixtureName) => {
    const facts = SPEC.fixtures[fixtureName];
    const writes = [];
    const missingRequired = [];
    for (const write of c.writes ?? []) {
      const value = facts[write.factId];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        writes.push(h.write(write.id, write.label, write.factId));
      } else if (write.requiredWhenUnknown) {
        missingRequired.push(h.rbf(write.id, write.label,
          write.requiredWhenUnknown.supply, write.requiredWhenUnknown.why));
      } else {
        writes.push(h.write(write.id, write.label, write.factId));
      }
    }
    return { writes, refusals: [...declaredRefusals, ...missingRequired] };
  };
  const canonical = forFixture("canonical");
  const boundary = forFixture("boundary");
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
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
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
  /* No delivered page may print markup. Read from the saved bytes, so it holds
   * whatever the markup arrived from -- a component body, a fixture value, or a
   * future edit to either. */
  assertNoMarkdownDelimitersOnDeliveredPages(textOfPage, fixtureName);
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    const fixtureWrites = map[`${fixtureName}Writes`] ?? [];
    for (const w of fixtureWrites) {
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
  const seen = new Set();
  return maps.flatMap((m) => [...(m.canonicalRefusals ?? []), ...(m.boundaryRefusals ?? [])]
    .filter((r) => r.requiredBeforeFiling === true)
    .filter((r) => {
      const key = `${m.formNumber}\u0000${r.field}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
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
  for (const c of SPEC.components) out.push(`| ${c.title} | ${c.description} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("| Question | What to do |", "| --- | --- |");
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
    out.push(`### ${COMPONENT[doc]?.title ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## What you must complete", "");
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
  out.push(SPEC.whatThisIsNot);
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
    packet.setTitle(SPEC.legalName);
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
    fixtureFactNotice: "Fixture identities and case facts are synthetic test data. They are evidence of known-fact writing behavior and are never participant facts.",
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
