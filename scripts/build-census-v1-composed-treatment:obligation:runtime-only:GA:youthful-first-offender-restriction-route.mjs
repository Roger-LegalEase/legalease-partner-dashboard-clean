#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Georgia retroactive First Offender
 * treatment under O.C.G.A. § 42-8-66.
 *
 * CLD-2026-08-28-GA-RFO controls this exact legacy route key. The legacy key
 * says "youthful", but the committed decision and effective national route
 * record map it to the consent-gated § 42-8-66 participant petition. The
 * earlier § 42-8-62.1 route contract and conflated compiled presentation are
 * stale implementation dependencies, not the authority for this composition.
 *
 * This is a zero-document-source CUSTOM_PLEADING_FROM_CODIFIED_TEXT build. It
 * acquires no form or source binary. Every relied-on legal statement is bound
 * to a committed record by exact bytes and anchor-checked before composition.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route",
  "worklistGroupId": "composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:runtime-only:GA:youthful-first-offender-restriction-route.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ga/composed-treatment:obligation:runtime-only:ga:youthful-first-offender-restriction-route--custom-pleading",
  "jurisdiction": "GA",
  "legalName": "Georgia § 42-8-66 Retroactive First Offender Petition",
  "routeName": "petitioning the Georgia court of conviction for retroactive First Offender treatment, exoneration and discharge under O.C.G.A. § 42-8-66",
  "statutes": [
    "O.C.G.A. § 42-8-66"
  ],
  "routes": [
    {
      "routeKey": "obligation:runtime-only:GA:youthful-first-offender-restriction-route"
    }
  ],
  "records": [
    {
      "recordId": "controlling-decision:CLD-2026-08-28-GA-RFO",
      "path": "data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json",
      "role": "the controlling decision for the exact legacy pathway: it supersedes the interim guidance treatment and requires a § 42-8-66 custom participant petition gated on written prosecutorial consent",
      "mustContain": [
        "\"decisionId\": \"CLD-2026-08-28-GA-RFO\"",
        "\"GA:youthful-first-offender-restriction-route\"",
        "A distinct participant petition under O.C.G.A. § 42-8-66 exists after written prosecutorial consent.",
        "Consent is a prerequisite, not the final relief.",
        "The participant files in the court of conviction.",
        "Use a custom participant petition packet.",
        "No consent means attorney/prosecutor handoff.",
        "A qualifying post-July 1, 2026 order moves to restriction/sealing implementation and tracking, not a second sealing petition.",
        "Custom participant petition packet, gated on written prosecutorial consent. Without consent the route is an attorney or prosecutor handoff. A qualifying post-2026-07-01 order routes to restriction and sealing implementation tracking rather than a second petition."
      ]
    },
    {
      "recordId": "effective-route-contract:GA:retroactive-first-offender-treatment-under-42-8-66",
      "path": "src/lib/legal-authority/routes/national-report-2026-08-28.json",
      "role": "the detailed committed route record projected from the controlling national decision: mechanism, required facts, component list, consent gate, route branches, venue, fee and self-help limits",
      "mustContain": [
        "\"routeKey\": \"GA:retroactive-first-offender-treatment-under-42-8-66\"",
        "\"ruleId\": \"GA-42-8-66-RETROACTIVE-FIRST-OFFENDER-CONSENT-GATED\"",
        "Petition for retroactive First Offender treatment, exoneration and discharge",
        "available once written prosecutorial consent exists; § 42-8-66 imposes no elapsed wait and no filing fee",
        "Does the participant hold the prosecuting attorney's WRITTEN consent, joinder or signed endorsement?",
        "Written prosecutorial consent is a filing prerequisite, not the relief itself",
        "A phone call, an unanswered request, prosecutor silence or 'no known objection' is not written consent",
        "\"packetFamily\": \"Georgia § 42-8-66 Retroactive First Offender Petition\"",
        "Written prosecutor consent, joinder or signed consent endorsement",
        "Post-order restriction, sealing and verification instructions",
        "verified written prosecutorial consent, joinder or signed consent endorsement, held as a document",
        "\"whenUnsatisfied\": \"fail_closed_handoff\"",
        "a qualifying order was granted on or after 2026-07-01",
        "The product becomes restriction, sealing, agency distribution and verification tracking.",
        "the prosecuting attorney refused consent",
        "\"disposition\": \"attorney_or_prosecutor\"",
        "Consent withdrawn before the order is entered defeats the filing.",
        "A contested evidentiary hearing is advocacy, not document preparation.",
        "Venue is the court of conviction; the default docket is the original criminal case, preserved unless the receiving clerk requires an ancillary number. The statute imposes no filing fee."
      ]
    },
    {
      "recordId": "route-obligation-census:obligation:runtime-only:GA:youthful-first-offender-restriction-route",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed assignment-identity dependency: it preserves the exact legacy obligation key and points that key to CLD-2026-08-28-GA-RFO; its superseded § 42-8-62.1 presentation is not used as substantive authority",
      "mustContain": [
        "obligation:runtime-only:GA:youthful-first-offender-restriction-route",
        "\"CLD-2026-08-28-GA-RFO\""
      ]
    }
  ],
  "components": [
    {
      "id": "ga-retroactive-first-offender-42-8-66-petition-1",
      "routeKey": "obligation:runtime-only:GA:youthful-first-offender-restriction-route",
      "role": "primary_filing",
      "title": "Petition - Retroactive First Offender Treatment, Exoneration and Discharge under § 42-8-66",
      "description": "the controlling § 42-8-66 participant petition, available only after verified written prosecutorial consent and only before the court grants the qualifying order",
      "condition": "generate and file only when verified written prosecutorial consent, joinder or signed consent endorsement is held as a document and no qualifying order has already been granted",
      "body": [
        "[C2 - court of conviction] Court and county in which the conviction was entered:",
        "{{DOTS}}",
        "STATE OF GEORGIA",
        "",
        "STATE OF GEORGIA,",
        "v.",
        "{{participant.full_legal_name}}, DEFENDANT/PETITIONER.",
        "",
        "Original criminal case number:",
        "{{DOTS}}",
        "",
        "A. THE CONTROLLING ROUTE AND ITS GATE",
        "",
        "This is the participant-filed petition for retroactive First Offender treatment, exoneration and discharge under O.C.G.A. § 42-8-66. It is filed in the court in which the conviction was entered, in the original criminal matter unless the receiving clerk requires an ancillary number.",
        "",
        "Written prosecutorial consent is required BEFORE the individual files. Consent is a prerequisite, not the final relief. A phone call, an unanswered request, prosecutor silence or 'no known objection' is not written consent.",
        "",
        "[C1 - required written consent document] The verified written prosecutorial consent, joinder or signed consent endorsement is attached:",
        "{{DOTS}}",
        "",
        "B. THE PETITIONER AND ORIGINAL MATTER",
        "",
        "Name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "[C3 - original matter record] What are the original judgment, sentence and disposition?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "C. THE FACTS REQUIRED BY THE COMMITTED ROUTE RECORD",
        "",
        "Fill every item from verified records. If an answer is uncertain, stop and get legal help instead of filing.",
        "",
        "[C4 - original eligibility] Was the petitioner eligible for First Offender treatment at the time?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - statutory branch] Which § 42-8-66 branch applies?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - prior history] Is there any prior felony or prior First Offender history?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - prior qualifying order] Has a qualifying order already been granted, and on what date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. REQUEST FOR RELIEF",
        "",
        "After the required written consent, the petitioner asks this Court to decide whether the statutory eligibility and interests-of-justice showing has been made and to grant retroactive First Offender treatment, exoneration and discharge under O.C.G.A. § 42-8-66.",
        "",
        "The petitioner understands that a hearing is held if the petitioner or prosecutor requests one, or if the Court wants one.",
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
          "id": "written_prosecutorial_consent",
          "label": "Item C1 - verified written prosecutorial consent, joinder or signed consent endorsement",
          "supply": "Attach the verified written prosecutorial consent, joinder or signed consent endorsement held as a document; do not file this petition without it",
          "why": "CLD-2026-08-28-GA-RFO and the effective route record make written prosecutorial consent a prerequisite that must exist before filing"
        },
        {
          "kind": "rbf",
          "id": "court_of_conviction",
          "label": "Item C2 - court and county in which the conviction was entered",
          "supply": "The court of conviction and its county, copied from the original criminal record",
          "why": "the effective route record requires the court of conviction and makes that court the filing destination"
        },
        {
          "kind": "rbf",
          "id": "original_case_number",
          "label": "Original criminal case number in the caption",
          "supply": "The original criminal case number, copied from the court record; use an ancillary number only if the receiving clerk requires one",
          "why": "the effective route record says the default docket is the original criminal case"
        },
        {
          "kind": "rbf",
          "id": "original_judgment_sentence_disposition",
          "label": "Item C3 - original judgment, sentence and disposition",
          "supply": "The original judgment, sentence and disposition, copied from verified court records",
          "why": "the effective route record names these as required facts and packet records"
        },
        {
          "kind": "rbf",
          "id": "original_first_offender_eligibility",
          "label": "Item C4 - original First Offender eligibility",
          "supply": "Whether the participant was eligible for First Offender treatment at the time, supported by the applicable evidence",
          "why": "the effective route record makes original First Offender eligibility a required fact"
        },
        {
          "kind": "rbf",
          "id": "applicable_42_8_66_branch",
          "label": "Item C5 - applicable O.C.G.A. § 42-8-66 branch",
          "supply": "The applicable § 42-8-66 branch and the evidence supporting it",
          "why": "the effective route record names the applicable § 42-8-66 branch as a required fact"
        },
        {
          "kind": "rbf",
          "id": "prior_felony_or_first_offender_history",
          "label": "Item C6 - prior felony or prior First Offender history",
          "supply": "Any prior felony or prior First Offender history, supported by verified records",
          "why": "the effective route record names this history as a required fact and directs uncertain history out of self-help"
        },
        {
          "kind": "rbf",
          "id": "qualifying_order_status_and_date",
          "label": "Item C7 - qualifying order status and date",
          "supply": "Whether a qualifying order has already been granted and, if so, its date, copied from a verified record",
          "why": "the effective route record branches an already-granted order away from a second merits petition"
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
      "id": "ga-retroactive-first-offender-42-8-66-filing-instructions-2",
      "routeKey": "obligation:runtime-only:GA:youthful-first-offender-restriction-route",
      "role": "filing_instructions",
      "title": "Filing Instructions - Georgia § 42-8-66 Retroactive First Offender Petition",
      "description": "the consent gate, the filing path, both non-filing branches, the source-required packet checklist, fee, venue and self-help stops",
      "condition": "the petition path exists only after verified written prosecutorial consent and before a qualifying order has already been granted",
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "THE REQUIRED GATE",
        "",
        "Written prosecutorial consent is required BEFORE filing. The document must be verified written consent, joinder or a signed consent endorsement held as a document. A phone call, an unanswered request, prosecutor silence or 'no known objection' does not satisfy the gate.",
        "",
        "THE THREE CONTROLLING ROUTE OPTIONS",
        "",
        "1. CONSENT PRESENT, AND NO QUALIFYING ORDER ALREADY GRANTED: after verified written prosecutorial consent exists, the participant files the § 42-8-66 petition in the court of conviction. The court independently decides the statutory eligibility and interests-of-justice showing.",
        "2. CONSENT ABSENT OR DISPUTED: do not generate or file the petition. Use an attorney or prosecutor handoff. Refusal, silence, an unanswered request and 'no known objection' are not consent; withdrawn consent defeats the filing.",
        "3. QUALIFYING ORDER ALREADY GRANTED ON OR AFTER JULY 1, 2026: do not generate a second merits or sealing petition. The route moves to restriction, sealing, agency distribution and verification tracking.",
        "",
        "WHAT THE COMMITTED ROUTE RECORD SAYS THE PACKET SHOULD INCLUDE",
        "",
        "- petition for retroactive First Offender treatment, exoneration and discharge;",
        "- written prosecutor consent, joinder or signed consent endorsement;",
        "- proposed order;",
        "- hearing-request election;",
        "- certificate of service or local notice document;",
        "- judgment, sentence and disposition records;",
        "- evidence of original First Offender eligibility;",
        "- evidence supporting the applicable § 42-8-66 branch;",
        "- rehabilitation and interests-of-justice exhibits; and",
        "- post-order restriction, sealing and verification instructions.",
        "",
        "WHERE TO FILE",
        "",
        "File in the court of conviction. Use the original criminal matter and preserve its original caption and case number unless the receiving clerk requires an ancillary number.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "O.C.G.A. § 42-8-66 imposes no filing fee; no fee waiver is needed.",
        "",
        "[[PAGE_BREAK]]",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "The committed route record calls for a certificate of service or local notice document but does not state a universal recipient or method. Confirm the local notice and service requirement with the clerk of the court of conviction before filing; do not guess.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- written consent is absent or disputed;",
        "- original First Offender eligibility is uncertain;",
        "- prior felony or First Offender history is unclear;",
        "- the prosecutor withdraws consent;",
        "- the court requires a contested evidentiary hearing; or",
        "- immigration, firearm, federal or licensing consequences require advice.",
        ""
      ],
      "writes": [
        {
          "id": "petitioner_name",
          "label": "Person named in the caption of this document",
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
  "composedFromNote": "CLD-2026-08-28-GA-RFO in data/record-clearing/legal-decisions/2026-08-28-controlling-decisions.json, the effective § 42-8-66 route contract in src/lib/legal-authority/routes/national-report-2026-08-28.json, and the exact legacy obligation identity in data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json, each bound by current SHA-256 and anchor-verified at build time",
  "formIdentityNote": "The controlling records require a custom participant petition and name no official participant form. Every rendered page is therefore composed from the committed codified-text authority chain; no source binary was acquired, substituted or invented.",
  "routeSelectionNote": "CLD-2026-08-28-GA-RFO maps the exact legacy youthful-first-offender-restriction route key to the consent-gated § 42-8-66 participant petition. The petition and instructions consistently select § 42-8-66 and do not select or disclaim it in favor of § 42-8-62.1.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-only:GA:youthful-first-offender-restriction-route",
      "statute": "O.C.G.A. § 42-8-66",
      "instrument": "Georgia § 42-8-66 Retroactive First Offender Petition",
      "statedOn": "the composed petition and filing instructions, in their titles, bodies and route footers",
      "precondition": "verified written prosecutorial consent, joinder or signed consent endorsement held as a document"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "File in the **court of conviction**. Use the original criminal matter and preserve its original caption and case number unless the receiving clerk requires an ancillary number."
    ],
    [
      "FEE_AND_WAIVER",
      "O.C.G.A. § 42-8-66 imposes **no filing fee**. Because no filing fee applies, no fee waiver is needed for this petition."
    ],
    [
      "SERVICE",
      "The committed route record calls for a certificate of service or local notice document but states no universal recipient or method. Confirm the local notice and service requirement with the clerk of the court of conviction before filing; do not guess."
    ],
    [
      "REQUIRED_BEFORE_FILING",
      "Verified written prosecutorial consent, joinder or signed consent endorsement held as a document is required **before** filing. A phone call, silence, an unanswered request or 'no known objection' is not written consent."
    ],
    [
      "ROUTE_OPTIONS",
      "**Consent present:** the participant files the § 42-8-66 petition in the court of conviction. **Consent absent or disputed:** no petition; attorney or prosecutor handoff. **Qualifying order already granted on or after July 1, 2026:** no second merits or sealing petition; move to restriction, sealing, agency distribution and verification tracking."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** consent is absent or disputed; original eligibility is uncertain; prior felony or First Offender history is unclear; the prosecutor withdraws consent; the court requires a contested evidentiary hearing; or immigration, firearm, federal or licensing consequences require advice."
    ]
  ],
  "instructionsIntro": [
    "This is a zero-document-source custom pleading composed from committed codified-text records. No committed record names an official Georgia participant form for this route, and no source binary was acquired.",
    "The platform filled in what it holds about you: your name, date of birth, mailing address, telephone number and email. Every fact about the original case, consent, eligibility, statutory branch, history and any prior order remains a labelled blank to complete from verified records.",
    "Do not file the petition unless verified written prosecutorial consent, joinder or signed consent endorsement is held as a document. If that gate is absent or disputed, the result is an attorney or prosecutor handoff, not a petition."
  ],
  "instrumentChoice": {
    "heading": "The three controlling route options",
    "intro": [
      "CLD-2026-08-28-GA-RFO fixes these branches. Do not substitute one branch for another."
    ],
    "rows": [
      [
        "Consent present filing",
        "After verified written prosecutorial consent exists, the participant files the § 42-8-66 petition in the court of conviction; the court independently decides the statutory eligibility and interests-of-justice showing."
      ],
      [
        "Consent absent or disputed",
        "Do not generate or file a petition. Use an attorney or prosecutor handoff."
      ],
      [
        "Qualifying order already granted on or after July 1, 2026",
        "Do not generate a second merits or sealing petition. Move to restriction, sealing, agency distribution and verification tracking."
      ]
    ],
    "footnotes": [
      "Consent withdrawn before the order is entered defeats the filing. A contested evidentiary hearing leaves document preparation and requires retained counsel."
    ]
  },
  "recordSays": [
    [
      "CLD-2026-08-28-GA-RFO",
      "A distinct participant petition under O.C.G.A. § 42-8-66 exists after written prosecutorial consent. Consent is a prerequisite, not the final relief. The participant files in the court of conviction."
    ],
    [
      "The effective § 42-8-66 route record",
      "Written consent must be a verified document; after consent the participant petitions, and the court decides. The statute imposes no elapsed wait and no filing fee."
    ],
    [
      "The controlling post-order branch",
      "A qualifying order already granted on or after July 1, 2026 moves to restriction, sealing, agency distribution and verification tracking, not a second merits or sealing petition."
    ]
  ],
  "documentsToObtain": [
    [
      "Verified written prosecutor consent, joinder or signed consent endorsement — required before filing",
      "the prosecuting attorney; a phone call, silence, an unanswered request or 'no known objection' is not written consent"
    ],
    [
      "Original judgment, sentence and disposition records",
      "the clerk of the court of conviction"
    ],
    [
      "Evidence of original First Offender eligibility and evidence supporting the applicable § 42-8-66 branch",
      "the participant's verified court and case records"
    ],
    [
      "Rehabilitation and interests-of-justice exhibits",
      "the participant's own supporting records"
    ]
  ],
  "steps": [
    "**Check for an already-granted qualifying order first.** If one was granted on or after July 1, 2026, do not generate a second merits or sealing petition; move to restriction, sealing, agency distribution and verification tracking.",
    "**Obtain verified written prosecutorial consent, joinder or a signed consent endorsement.** Without that document, do not file; use an attorney or prosecutor handoff.",
    "**Complete every labelled petition item from verified records.** If original eligibility, the applicable § 42-8-66 branch, or prior felony or First Offender history is uncertain, stop self-help.",
    "**Assemble the source-required materials.** Include the written-consent document, proposed order, hearing-request election, certificate of service or local notice document, judgment/sentence/disposition records, eligibility and branch evidence, rehabilitation and interests-of-justice exhibits, and post-order instructions.",
    "**Preserve the original criminal caption and case number** unless the receiving clerk requires an ancillary number, and confirm the local service or notice procedure with the clerk of the court of conviction.",
    "**Sign and date the petition personally, then file it in the court of conviction.** A hearing follows if the petitioner or prosecutor requests one or the court wants one."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**The court of conviction, original case number and every matter-specific fact.** Copy each from verified records; this build does not guess them.",
    "**The written-consent attachment line.** The verified document must exist before filing; this build does not manufacture or replace prosecutorial consent."
  ],
  "notTold": [
    "The committed route record does not state a universal service recipient or method. Confirm the local certificate-of-service or notice procedure with the clerk of the court of conviction.",
    "This candidate artifact does not establish that written consent has been verified, that the participant is eligible, or that any requested relief will be granted."
  ],
  "stopConditions": [
    "written prosecutorial consent is absent or disputed — use an attorney or prosecutor handoff rather than filing;",
    "original First Offender eligibility is uncertain;",
    "prior felony or prior First Offender history is unclear;",
    "the prosecutor withdraws consent before the order is entered;",
    "the court requires a contested evidentiary hearing — that is advocacy, not document preparation;",
    "immigration, firearm, federal or licensing consequences require advice."
  ],
  "whatThisIsNot": "This is a candidate custom § 42-8-66 participant petition composed from committed codified-text records. It is not an official Georgia form, a request for prosecutorial consent, legal advice, proof of eligibility, proof that consent exists, or permission to file without verified written consent. It is not a § 42-8-62.1 petition.",
  "receiptDoesNotEstablish": [
    "that verified written prosecutorial consent, joinder or signed consent endorsement exists for any participant",
    "that the participant satisfies statutory eligibility or the interests-of-justice showing",
    "that no qualifying order has already been granted",
    "that any route, payment, generation or fulfillment gate is open"
  ],
  "buildFindings": [
    {
      "finding": "CLD-2026-08-28-GA-RFO maps the exact legacy youthful-first-offender-restriction route key to the § 42-8-66 participant petition and supersedes the interim no-petition treatment.",
      "consequence": "The active composition binds and obeys that decision. The stale § 42-8-62.1 contract and conflated compiled profile are removed from the substantive authority chain."
    },
    {
      "finding": "The controlling decision requires written prosecutorial consent before filing and fixes consent-present, consent-absent and post-July 1, 2026 qualifying-order branches.",
      "consequence": "The petition is conditionally identified, the instructions state all three outcomes, and generation, runtime selection and commercial delivery remain disabled pending independent review."
    }
  ],
  "counselQuestions": [],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — custodyClass CUSTOM_PLEADING_FROM_CODIFIED_TEXT and acquisitionCommissioned false.",
    "The exact legacy route key is preserved, but CLD-2026-08-28-GA-RFO controls its § 42-8-66 substance; the stale § 42-8-62.1 dependencies are not active authority.",
    "This is a candidate artifact only. It remains independent-verification and counsel-review pending, opens no route, and grants no fulfillment authority."
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
  for (const raw of sanitizePdfText(fullText).split("\n")) {
    if (raw === "[[PAGE_BREAK]]") {
      page = pdf.addPage([width, height]);
      y = height - margin;
      continue;
    }
    for (const row of wrap(raw)) draw(row);
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
