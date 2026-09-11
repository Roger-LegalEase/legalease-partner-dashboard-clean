#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Wyoming human-trafficking victim
 * vacatur motion, Wyo. Stat. § 6-2-708(c).
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * A COMPOSED TREATMENT that IS a court filing, addressed to the court the
 * compiled profile names: the court that entered the conviction, at any time
 * after it.
 *
 * THE RULE THAT SHAPED THE PAGE. Wyoming's compiled pathway carries an
 * express trauma rule — ask only what is necessary, and route to review
 * without requiring graphic details. So the nexus item in this packet is
 * printed in the committed contract's own four-word form and nothing more,
 * no page invites graphic narrative, and the rule is quoted to the participant
 * so that the bounded status and causal-connection fields read as deliberate.
 *
 * Two things the record establishes and a participant would otherwise get
 * wrong: official documentation creates a presumption but is NOT required,
 * and no waiting table from any other Wyoming route may be imported here.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
  "worklistGroupId": "composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wy/composed-treatment:obligation:runtime-only:wy:human-trafficking-victim-vacatur-w-s-6-2-708--custom-pleading",
  "jurisdiction": "WY",
  "legalName": "Motion to Vacate Conviction under W.S. § 6-2-708(c)",
  "routeName": "filing a Motion to Vacate Conviction in the original Wyoming criminal court and case under W.S. § 6-2-708(c)",
  "statutes": [
    "Wyo. Stat. § 6-2-708(c)"
  ],
  "routes": [
    {
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708"
    }
  ],
  "records": [
    {
      "recordId": "route-contract:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "path": "src/lib/legal-authority/routes/single-routes.json",
      "role": "the committed route contract: this route's mechanism, statute, outcome mode, timing anchor, recorded conditions, required facts and packet components",
      "mustContain": [
        "\"routeKey\": \"WY:human-trafficking-victim-vacatur-w-s-6-2-708\"",
        "Human-trafficking-victim vacatur",
        "Wyo. Stat. § 6-2-708(c)",
        "Wyoming Trafficking-Victim Vacatur Petition under § 6-2-708",
        "available at any time after entry of the covered conviction",
        "Participation in the offense resulted from trafficking victimization",
        "Statutory evidentiary and offense requirements satisfied",
        "Petition to vacate",
        "Nexus evidence",
        "Exact conviction?",
        "Conviction date?",
        "Trafficking period?",
        "Causal nexus?",
        "Official documentation if available?",
        "Alternative evidence?",
        "Other counts?",
        "Requested vacatur effect?"
      ]
    },
    {
      "recordId": "compiled-profile:WY-wyoming#human-trafficking-victim-vacatur-w-s-6-2-708",
      "path": "src/lib/rcap-engine/compiled/profiles/WY-wyoming.json",
      "role": "the compiled state profile's own pathway for this route, carrying the recorded substance of the statute and, where it exists, the recorded self-help boundary",
      "mustContain": [
        "Human-trafficking victim vacatur Verify with clerk; statute is a motion route, not a standard expungement filing-fee route",
        "Adult felony conviction under 7-13-1502 $300",
        "\"id\": \"human-trafficking-victim-vacatur-w-s-6-2-708\"",
        "Wyoming has a separate victim/survivor route. A human-trafficking victim is not criminally liable for commercial sex acts or other criminal acts committed as a direct result of, or incident to, being a trafficking victim. At any time after conviction, the court that entered the conviction may vacate it if the person\\u0019s participation in the offense resulted from being a victim. Official documentation creates a presumption, but is not required. (\\\"https://law.justia.com/codes/wyoming/title-6/chapter-2/article-7/section-6-2-708/\\\")",
        "Wilma trauma rule: Ask only what is necessary:",
        "Then route to manual/legal review. Do not require graphic details."
      ]
    },
    {
      "recordId": "route-obligation-census:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this route's exact key, its statutory authority, its recorded destination and its participant-facing instrument",
      "mustContain": [
        "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
        "Wyoming Trafficking-Victim Vacatur Petition under § 6-2-708"
      ]
    },
    {
      "recordId": "legal-decision:WY-TRAFFICKING-VACATUR-6-2-708C",
      "path": "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json",
      "role": "the authoritative additive legal disposition that resolves this route's instrument, original-case identity, declaration, service and sensitive-filing procedure",
      "mustContain": [
        "WY-TRAFFICKING-VACATUR-6-2-708C",
        "Use a Motion to Vacate Conviction under W.S. Section 6-2-708(c) in the original criminal court/case.",
        "Collect a participant declaration/affidavit establishing trafficking-victim status and causal connection.",
        "Official victim documentation creates a presumption when available but its absence is not an automatic stop.",
        "Serve the State/prosecutor under W.R.Cr.P. 49; do not invent a statewide hearing deadline; apply Wyoming redaction/restricted-filing rules to sensitive material."
      ]
    }
  ],
  "components": [
    {
      "id": "wy-6-2-708-vacatur-primary-filing-1",
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "role": "primary_filing",
      "title": "Motion to Vacate Conviction under W.S. § 6-2-708(c)",
      "description": "the motion filed in the original criminal court and case",
      "condition": null,
      "body": [
        "IN THE {{matter.original_criminal_court}}",
        "(the original Wyoming criminal court that entered the conviction)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "MOVANT.",
        "",
        "Original criminal case number: {{matter.original_case_number}}",
        "",
        "MOTION TO VACATE CONVICTION UNDER W.S. § 6-2-708(c)",
        "",
        "A. AUTHORITY AND ROUTE",
        "",
        "This Motion is brought under W.S. § 6-2-708(c) in the original criminal court and case. The authoritative decision for this packet is WY-TRAFFICKING-VACATUR-6-2-708C.",
        "",
        "The compiled Wyoming profile records that a human-trafficking victim is not criminally liable for commercial sex acts or other criminal acts committed as a direct result of, or incident to, being a trafficking victim. At any time after conviction, the court that entered the conviction may vacate it if the person's participation in the offense resulted from being a victim.",
        "",
        "The committed contract records these conditions on the route: Participation in the offense resulted from trafficking victimization; Statutory evidentiary and offense requirements satisfied.",
        "",
        "B. THE MOVANT",
        "",
        "Name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE ORIGINAL CRIMINAL MATTER",
        "",
        "Copy each item below from the court record. Do not infer or reconstruct it from memory.",
        "",
        "[C1 - exact conviction] Exact conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - conviction date] Conviction date?",
        "{{DOTS}}",
        "",
        "[C3 - other counts] Other counts?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - requested vacatur effect] Requested vacatur effect?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. DECLARATION SUPPORT",
        "",
        "The attached Participant Declaration in Support of Motion supplies the movant's trafficking-victim status, the causal connection, and the supporting-evidence route without requiring graphic narrative.",
        "",
        "E. REQUEST",
        "",
        "The movant asks the Court to vacate the conviction identified above under W.S. § 6-2-708(c).",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF MOVANT {{DOTS:36}}",
        "",
        "(The movant signs and dates this Motion personally. Nothing on this page is signed or dated for the movant.)",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}"
      ],
      "writes": [
        { "id": "movant_name", "label": "Movant named in the caption", "factId": "participant.full_legal_name" },
        { "id": "date_of_birth", "label": "Date of birth of the movant", "factId": "participant.date_of_birth" },
        { "id": "original_criminal_court", "label": "Original Wyoming criminal court that entered the conviction", "factId": "matter.original_criminal_court",
          "requiredWhenUnknown": { "supply": "The original Wyoming criminal court exactly as the court record names it", "why": "the Motion must return to the original criminal court, and the platform does not infer a court from geography or charge data" } },
        { "id": "original_case_number", "label": "Original criminal case number", "factId": "matter.original_case_number",
          "requiredWhenUnknown": { "supply": "The original criminal case number exactly as the court record prints it", "why": "this Motion is filed in the existing criminal case; the number is a participant record fact, not a new number assigned at filing" } },
        { "id": "mailing_address", "label": "Mailing address in the contact block", "factId": "participant.street_address" },
        { "id": "telephone", "label": "Telephone number in the contact block", "factId": "participant.phone" },
        { "id": "email", "label": "Email address in the contact block", "factId": "participant.email" }
      ],
      "blanks": [
        { "kind": "rbf", "id": "fact_q1", "label": "Item C1 - exact conviction", "supply": "Exact conviction — copied from the court record", "why": "the route contract records this as a required fact and the platform holds no conviction record for this fixture" },
        { "kind": "rbf", "id": "fact_q2", "label": "Item C2 - conviction date", "supply": "Conviction date — copied from the court record", "why": "the route contract records this as a required fact and the platform does not infer it" },
        { "kind": "rbf", "id": "fact_q7", "label": "Item C3 - other counts", "supply": "Other counts in the original criminal matter — copied from the court record", "why": "the route contract records other counts as a required fact and the platform does not infer them" },
        { "kind": "rbf", "id": "fact_q8", "label": "Item C4 - requested vacatur effect", "supply": "Requested vacatur effect", "why": "the route contract records the requested effect as a required participant fact" },
        { "kind": "protected", "id": "motion_signature", "label": "Signature of the movant on the Motion", "why": "the participant signs personally; this build never signs for anyone" },
        { "kind": "protected", "id": "motion_signature_date", "label": "Date beside the movant's signature on the Motion", "why": "a date written before the document is signed would be false" }
      ]
    },
    {
      "id": "wy-6-2-708-vacatur-participant-declaration-2",
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "role": "participant_declaration",
      "title": "Participant Declaration in Support of Motion",
      "description": "the participant's signed personal-knowledge declaration of trafficking-victim status and causal connection",
      "condition": null,
      "body": [
        "IN THE {{matter.original_criminal_court}}",
        "Original criminal case number: {{matter.original_case_number}}",
        "",
        "IN RE: {{participant.full_legal_name}}, MOVANT.",
        "",
        "PARTICIPANT DECLARATION IN SUPPORT OF MOTION",
        "",
        "Complete this declaration from your personal knowledge. State only what is needed to establish status and causal connection. Do not include graphic details.",
        "",
        "1. TRAFFICKING-VICTIM STATUS",
        "",
        "I state from my personal knowledge that I was a victim of human trafficking. Relevant period:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "2. CAUSAL CONNECTION",
        "",
        "I state from my personal knowledge that my participation in the offense of conviction resulted from that trafficking victimization. Brief non-graphic facts establishing that causal connection:",
        "{{DOTS}}",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "3. SUPPORTING EVIDENCE",
        "",
        "Identify official victim documentation if available. Official documentation creates a presumption, but its absence does not stop this Motion. If none is available, identify alternative evidence supporting status or causal connection:",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "PERSONAL-KNOWLEDGE ATTESTATION",
        "",
        "I have reviewed this declaration and state that the facts written above are true to the best of my personal knowledge.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE OF DECLARANT {{DOTS:36}}",
        "",
        "PRINTED NAME: {{participant.full_legal_name}}"
      ],
      "writes": [
        { "id": "declarant_name", "label": "Participant making the declaration", "factId": "participant.full_legal_name" },
        { "id": "original_criminal_court", "label": "Original Wyoming criminal court on the declaration", "factId": "matter.original_criminal_court",
          "requiredWhenUnknown": { "supply": "The same original Wyoming criminal court printed on the Motion", "why": "the declaration belongs to the original criminal case and the platform does not infer its court" } },
        { "id": "original_case_number", "label": "Original criminal case number on the declaration", "factId": "matter.original_case_number",
          "requiredWhenUnknown": { "supply": "The same original criminal case number printed on the Motion", "why": "the declaration belongs to the existing criminal case, and this is not a newly assigned filing number" } }
      ],
      "blanks": [
        { "kind": "rbf", "id": "trafficking_victim_status", "label": "Declaration item 1 - trafficking-victim status and relevant period", "supply": "Your trafficking-victim status and relevant period, stated briefly from personal knowledge without graphic details", "why": "the controlling decision requires a participant declaration establishing trafficking-victim status" },
        { "kind": "rbf", "id": "causal_connection", "label": "Declaration item 2 - causal connection", "supply": "Brief non-graphic facts showing that participation in the offense resulted from trafficking victimization", "why": "the controlling decision requires a participant declaration establishing the causal connection" },
        { "kind": "rbf", "id": "supporting_evidence", "label": "Declaration item 3 - official documentation if available, otherwise alternative evidence", "supply": "Official victim documentation if available; otherwise the alternative evidence supporting status or causal connection", "why": "official documentation may create a presumption but is optional, so the packet preserves an alternative-evidence route" },
        { "kind": "protected", "id": "declaration_signature", "label": "Signature of the participant making the declaration", "why": "the participant signs the personal-knowledge declaration; this build never signs for anyone" },
        { "kind": "protected", "id": "declaration_signature_date", "label": "Date beside the declaration signature", "why": "a date written before the declaration is signed would be false" }
      ]
    },
    {
      "id": "wy-6-2-708-vacatur-filing-instructions-3",
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "role": "filing_instructions",
      "title": "Filing Instructions - Motion to Vacate Conviction under W.S. § 6-2-708(c)",
      "description": "where the Motion goes, how to handle sensitive material, whom to serve and when to stop",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "FILING INSTRUCTIONS - MOTION TO VACATE CONVICTION UNDER W.S. § 6-2-708(c)",
        "",
        "ORIGINAL COURT AND CASE",
        "",
        "File this Motion in the original Wyoming criminal court and case. Copy the court name and case number exactly from the participant's court record. These are existing-case facts; do not treat the case number as a blank for a new court assignment and do not infer either value.",
        "",
        "DECLARATION AND EVIDENCE",
        "",
        "Complete and personally sign and date the Participant Declaration in Support of Motion. It asks for trafficking-victim status and the causal connection from personal knowledge without requiring graphic detail.",
        "",
        "Official victim documentation creates a presumption when available, but its absence alone does not stop this route. If official documentation is unavailable, identify alternative evidence in declaration item 3.",
        "",
        "SERVICE",
        "",
        "Serve the State/prosecutor under W.R.Cr.P. 49. The controlling decision supplies no statewide hearing deadline, service mode, or certificate requirement, so this packet adds none.",
        "",
        "SENSITIVE MATERIAL BEFORE FILING",
        "",
        "Before filing, review every public copy and redact sensitive material under Wyoming's applicable rules. Where sensitive material must be provided, use the original criminal court's Wyoming restricted-filing procedure where applicable. Ask that original court how to use its restricted-filing procedure before submitting sensitive material. Filing this Motion does not automatically seal the Motion, declaration, or attachments.",
        "",
        "FEE",
        "",
        "The compiled Wyoming profile states: Human-trafficking victim vacatur - Verify with clerk; statute is a motion route, not a standard expungement filing-fee route. It establishes no amount or waiver for this route. Ask the clerk of the original criminal court before filing; do not import a fee from another Wyoming route.",
        "",
        "WHEN TO STOP AND GET HELP",
        "",
        "- Stop if the court record does not establish the exact original court, case number, conviction, date, or other counts.",
        "- Do not include graphic detail. State only the facts needed for trafficking-victim status and causal connection.",
        "- Stop if safety, another case or count, immigration consequences, or disputed procedure requires legal help."
      ],
      "writes": [
        { "id": "participant_name", "label": "Participant for whom these instructions were prepared", "factId": "participant.full_legal_name" }
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
      "participant.email": "jordan.reyes@example.org",
      "matter.original_criminal_court": "Example County District Court (synthetic fixture)",
      "matter.original_case_number": "CR-EXAMPLE-2020-001 (synthetic fixture)"
    },
    "boundary": {
      "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
      "participant.date_of_birth": "1968-12-31",
      "participant.street_address": "1188 Upper Tallahatchie Crossing Road, Apartment 14B, Fort Saint Clairsville 39501-2214",
      "participant.phone": "(228) 555-0199 ext. 4417",
      "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
    }
  },
  "composedFromNote": "the committed route contract, compiled Wyoming profile, route-obligation census and authoritative decision WY-TRAFFICKING-VACATUR-6-2-708C, each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route. The authoritative decision requires a Motion to Vacate Conviction, participant declaration, service under W.R.Cr.P. 49 and Wyoming sensitive-material handling. Every page is composed from those bound records; no official form was substituted or invented.",
  "routeSelectionNote": "One route, one Motion and declaration set: the Motion states this route's statutory ground in its title, body and footer, and no election control exists on any composed page.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "statute": "Wyo. Stat. § 6-2-708(c)",
      "instrument": "Motion to Vacate Conviction under W.S. § 6-2-708(c)",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "File in the original Wyoming criminal court and case. Collect the exact court name and original case number from the participant's court record; do not infer them or treat the case number as a new assignment."
    ],
    [
      "FEE_AND_WAIVER",
      "The compiled Wyoming profile says to verify the fee with the clerk because this is a motion route, not a standard expungement-fee route. No amount or waiver is established for this route. Ask the clerk of the original criminal court before filing and do not import a fee from another Wyoming route."
    ],
    [
      "SERVICE",
      "Serve the State/prosecutor under W.R.Cr.P. 49. The authoritative decision establishes no statewide hearing deadline, service mode, or certificate requirement, and this packet invents none."
    ],
    [
      "SENSITIVE_MATERIAL_HANDLING",
      "Before filing, review and redact public copies under applicable Wyoming rules and use the original criminal court's Wyoming restricted-filing procedure where applicable. Filing does not automatically seal the Motion, declaration, or attachments."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** **this is the first thing the committed record says about this route:** the compiled Wyoming profile's own handling rule is to ask only what is necessary and then \"route to manual/legal review. Do not require graphic details.\"; **Stop and get help if:** the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you; **Stop and get help if:** your own safety is in question, now or once a filing becomes a public court record; **Stop and get help if:** there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect; **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "This packet is a composed Motion and participant declaration; no committed record names an official Wyoming participant form for this route.",
    "The canonical fixture demonstrates known original-court and original-case prefills with values explicitly marked synthetic. If either value is unavailable, the boundary fixture leaves a required labelled blank. In a participant packet, copy each from the court record and never infer it."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The compiled Wyoming profile",
      "Wilma trauma rule: Ask only what is necessary: Then route to manual/legal review. Do not require graphic details."
    ],
    [
      "The compiled Wyoming profile",
      "A human-trafficking victim is not criminally liable for commercial sex acts or other criminal acts committed as a direct result of, or incident to, being a trafficking victim."
    ],
    [
      "The committed route contract",
      "Statutory documentation creates the stated evidentiary effect but is not the only possible proof; the intake must permit alternative nexus evidence. No nonconviction, misdemeanor, felony or juvenile waiting table may be imported."
    ]
  ],
  "documentsToObtain": [
    [
      "Nexus evidence — the committed contract names it as a component of this packet, and records that official documentation is not the only possible proof",
      "whoever holds it; official documentation creates the recorded presumption but the record says it is not required"
    ]
  ],
  "steps": [
    "**Read the filing instructions page.** It states the original-case, declaration, service and sensitive-material steps bound by the current decision.",
    "**Check the original criminal court and case number against the court record.** If either is blank, copy it exactly before filing; never infer it.",
    "**Complete the Motion and declaration from the court record and personal knowledge.** Do not add graphic detail.",
    "**Sign and date both participant signature blocks personally.** The platform never signs or dates them.",
    "**Review and redact public copies and use the original court's Wyoming restricted-filing procedure where applicable.** Filing is not automatically sealed.",
    "**File in the original criminal court and serve the State/prosecutor under W.R.Cr.P. 49.** This packet states no statewide hearing deadline, service mode, or certificate requirement."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**The original court and case number only when unavailable to the platform.** They are required participant record facts copied from the existing criminal case, never a future court-assigned number."
  ],
  "notTold": [],
  "stopConditions": [
    "**this is the first thing the committed record says about this route:** the compiled Wyoming profile's own handling rule is to ask only what is necessary and then \"route to manual/legal review. Do not require graphic details.\";",
    "the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you;",
    "your own safety is in question, now or once a filing becomes a public court record;",
    "there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is a composed Motion and declaration on one Wyoming route. It is not an official Wyoming form, legal advice, an automatic sealed filing, or a court decision.",
  "receiptDoesNotEstablish": [
    "that any Wyoming conviction resulted from being a victim of trafficking"
  ],
  "buildFindings": [
    {
      "finding": "The compiled Wyoming pathway carries an express trauma rule: ask only what is necessary, and route to manual or legal review without requiring graphic details.",
      "consequence": "It governs the page design here. The declaration collects only a bounded status statement and brief non-graphic causal-connection facts; no page asks for graphic narrative."
    },
    {
      "finding": "The compiled profile records that official documentation creates a presumption but is not required, and the committed contract records that alternative nexus evidence must be permitted.",
      "consequence": "The packet states both, so a participant without official documentation is not turned away from a route the record says is open to them."
    },
    {
      "finding": "The committed contract records that no nonconviction, misdemeanor, felony or juvenile waiting table may be imported into this route, and that relief is available at any time after the covered conviction.",
      "consequence": "No waiting period appears anywhere in this packet, and the timing statement is quoted from the contract."
    },
    {
      "finding": "Decision WY-TRAFFICKING-VACATUR-6-2-708C establishes the Motion label, original criminal court/case, participant declaration, State/prosecutor service under W.R.Cr.P. 49 and Wyoming sensitive-material handling.",
      "consequence": "Those resolved procedures are bound into the source receipt and carried consistently through the components, field map and participant instructions without adding a hearing deadline, service mode, certificate requirement, filing-seal promise or local redaction mechanics."
    }
  ],
  "counselQuestions": [],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "Wyoming's trauma rule shapes the declaration: bounded status and causal-connection facts are collected without asking for graphic details.",
    "The prior procedural questions are resolved by decision WY-TRAFFICKING-VACATUR-6-2-708C; fresh review must assess the rebuilt bytes against that decision rather than revive the historical legal hold."
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
