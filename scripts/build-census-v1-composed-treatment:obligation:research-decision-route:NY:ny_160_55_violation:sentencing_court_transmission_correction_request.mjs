#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — New York CPL § 160.55 sentencing-court
 * transmission or correction request.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS, AND WHY THIS PACKET
 * CONTAINS NO PETITION
 *
 * The controlling committed legal decision for this research track states the
 * product disposition in four lines, and two of them decide this family:
 *
 *     OUTPUT: GUIDANCE + CORRECTION REQUEST
 *     INITIAL PETITION: NONE FOR ORDINARY MODERN CASE
 *
 * and the mechanism section says it again in prose: for a post-November 1,
 * 1991 qualifying disposition the participant ordinarily files nothing, and
 * the clerk notifies DCJS and the appropriate law-enforcement agencies.
 *
 * So this packet composes the two things the decision names — a request to
 * the sentencing court, and a guidance page — and composes no petition.
 *
 * ONE MORE THING THE RECORD IS CAREFUL ABOUT, AND SO IS THE PACKET. The seal
 * is PARTIAL. It reaches fingerprints, booking photographs, DCJS records,
 * police records and prosecutor records, and it does NOT reach the court
 * file. A participant who is not told that will believe the courthouse file
 * closed when the decision records that it stays publicly inspectable.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
  "worklistGroupId": "composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/ny/composed-treatment:obligation:research-decision-route:ny:ny-160-55-violation:sentencing-court-transmission-correction-request--custom-pleading",
  "jurisdiction": "NY",
  "legalName": "New York CPL § 160.55 sealing — sentencing-court transmission or correction request, with process guidance",
  "routeName": "getting a New York CPL § 160.55 partial seal transmitted or corrected when the automatic seal has not shown up",
  "statutes": [
    "N.Y. Crim. Proc. Law § 160.55",
    "N.Y. Crim. Proc. Law § 160.50",
    "N.Y. Crim. Proc. Law § 160.57(1)(a)"
  ],
  "routes": [
    {
      "routeKey": "obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request"
    }
  ],
  "records": [
    {
      "recordId": "legal-decision:2026-08-28-national#ny_160_55_violation",
      "path": "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json",
      "role": "the controlling committed legal decision for this research track: that § 160.55 sealing is automatic, that the participant ordinarily files nothing, what the partial seal reaches and does not reach, the correction workflow this request belongs to, and the recorded product disposition",
      "mustContain": [
        "\"trackId\": \"ny_160_55_violation\"",
        "CPL § 160.55 provides **automatic partial sealing** when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise.",
        "For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies.",
        "It does **not seal the court file**. Current New York Courts guidance and appellate authority expressly distinguish § 160.55 from the full court-record sealing language in § 160.50.",
        "OUTPUT: GUIDANCE + CORRECTION REQUEST",
        "INITIAL PETITION: NONE FOR ORDINARY MODERN CASE",
        "ask sentencing court to transmit/correct sealing notice",
        "send certified disposition to DCJS for correction"
      ]
    },
    {
      "recordId": "route-obligation-census:NY-160-55-transmission-correction",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this branch's exact key, its recorded destination and its recorded participant-facing instrument",
      "mustContain": [
        "obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
        "written request asking the sentencing court to transmit or correct the § 160.55 sealing notice",
        "sentencing court"
      ]
    }
  ],
  "components": [
    {
      "id": "ny-160-55-sentencing-court-correction-request-1",
      "routeKey": "obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
      "role": "correction_request",
      "title": "Request to the sentencing court to transmit or correct a CPL § 160.55 sealing notice",
      "description": "the written request to the sentencing court; it asks the court to transmit or correct a notice, and it is not a petition for relief",
      "condition": null,
      "body": [
        "TO: The clerk of the New York court that sentenced you in this case",
        "Exact office and postal address, confirmed with that office:",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST TO TRANSMIT OR CORRECT A SEALING NOTICE UNDER CPL § 160.55",
        "",
        "A. WHY I AM WRITING, AND WHAT THE COMMITTED RECORD ESTABLISHES",
        "",
        "The controlling committed legal decision records the mechanism as follows. CPL § 160.55 provides **automatic partial sealing** when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise.",
        "",
        "It records what the participant does in the ordinary case: \"For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies.\"",
        "",
        "It records the workflow this request belongs to: expected automatic partial seal; obtain certificate of disposition; check official criminal-history result; ask the sentencing court to transmit or correct the sealing notice; send certified disposition to DCJS for correction; motion or counsel if the court previously entered an interests-of-justice nonsealing order.",
        "",
        "This page is the fourth step of that workflow. It is not a petition for sealing, because the committed decision records that no initial petition arises in an ordinary modern case.",
        "",
        "B. MY MATTER",
        "",
        "[C1 - case this request is about] Which case is this about? Give the court, the docket number and the date the case ended.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - recorded outcome of the case] How did the case end? The route this request belongs to is for a case that ended in a non-criminal violation or a traffic-infraction conviction.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - what the criminal-history result showed] What did the official criminal-history result you obtained actually show, and on what date did you obtain it?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - what is being asked of the court] What are you asking the court to transmit or correct?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "C. WHAT I AM ASKING FOR",
        "",
        "I am asking the court to transmit the sealing notice this case should have produced, or to correct it if it was transmitted wrongly. I enclose my certificate of disposition. If the court has previously entered an order that this case not be sealed in the interests of justice, please tell me, because the committed guidance I am working from says that changes what I must do.",
        "",
        "DATE {{DOTS:30}}   SIGNATURE {{DOTS:44}}",
        "",
        "(The person named above signs and dates this request personally. Nothing on this page is signed or dated for them.)"
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
          "id": "fact_case",
          "label": "Item C1 - case this request is about",
          "supply": "the court, docket number and disposition date, copied from your certificate of disposition",
          "why": "no case fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "fact_outcome",
          "label": "Item C2 - recorded outcome of the case",
          "supply": "how the case ended, in the words your certificate of disposition uses",
          "why": "the outcome is the fact that decides whether this route applies, and it belongs to the participant's own record"
        },
        {
          "kind": "rbf",
          "id": "fact_result",
          "label": "Item C3 - what the criminal-history result showed",
          "supply": "what the criminal-history result showed and the date you obtained it",
          "why": "only the participant holds their own criminal-history result"
        },
        {
          "kind": "rbf",
          "id": "fact_ask",
          "label": "Item C4 - what is being asked of the court",
          "supply": "what you are asking the court to transmit or correct, in your own words",
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
      "id": "ny-160-55-process-guidance-2",
      "routeKey": "obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
      "role": "filing_instructions",
      "title": "What CPL § 160.55 does, who does it, and what it does not reach",
      "description": "what the process is, who runs it, what you do and do not do, what it costs, and how you check the outcome",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "NEW YORK CPL § 160.55: AUTOMATIC PARTIAL SEALING, AND WHAT TO DO WHEN IT HAS NOT SHOWN UP",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "THE PARTICIPANT ORDINARILY FILES NOTHING. The controlling committed legal decision says it in terms: \"For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies.\"",
        "",
        "CPL § 160.55 provides automatic partial sealing when a criminal action terminates in a qualifying violation or traffic-infraction conviction, unless the prosecutor or court timely establishes that the interests of justice require otherwise.",
        "",
        "WHAT THE SEAL REACHES, AND WHAT IT LEAVES. The committed decision lists what the partial seal reaches: fingerprints and palmprints; booking photographs; DCJS records; police records; and prosecutor records.",
        "",
        "AND WHAT IT DOES NOT. It does not seal the court file. Current New York Courts guidance and appellate authority expressly distinguish § 160.55 from the full court-record sealing language in § 160.50.",
        "",
        "The consequence the committed decision draws is one a participant needs before they start: a qualifying violation may disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable.",
        "",
        "Who runs it: The court and the agencies. The committed decision records that the clerk notifies DCJS and the appropriate law-enforcement agencies. Nothing in the ordinary case is initiated by the participant.",
        "",
        "WHAT YOU DO",
        "",
        "- Obtain your certificate of disposition. That is step two of the committed workflow, and everything after it depends on it.",
        "- Check your official criminal-history result. That is step three, and it is how you find out whether the seal actually happened.",
        "- If it did not, ask the sentencing court to transmit or correct the sealing notice — the request page in this packet is that step.",
        "- Send your certified disposition to DCJS for correction. That is the next step in the committed workflow.",
        "- Check the criminal-history result again. That is how you know whether it worked.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- **Do not file a sealing petition as your first step.** The committed decision records: INITIAL PETITION: NONE FOR ORDINARY MODERN CASE. Filing one asks a court to order what the statute already did at disposition.",
        "- **Do not expect the courthouse file to close.** The committed decision records that § 160.55 does not seal the court file, and expressly distinguishes it from § 160.50.",
        "- **Do not treat Clean Slate as part of this.** The committed decision records that CPL § 160.57 Clean Slate is separate, and warns against promising that ordinary § 160.55 violations will receive full court-file sealing through § 160.55.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Nothing in the ordinary § 160.55 route is a participant filing, so no filing fee arises from it. Two things you may have to pay for are not filing fees: the certificate of disposition, and the criminal-history result. No committed record this packet binds states what either costs. The offices that answer are the clerk of the court that sentenced you, for the certificate, and the New York State Division of Criminal Justice Services, for the criminal-history result.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "**Nothing is served, because in the ordinary case nothing is filed.** The committed decision records that the CLERK notifies DCJS and the appropriate law-enforcement agencies. The request page in this packet is a letter to the sentencing court, not a pleading served on an opposing party.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- the court previously entered an INTERESTS-OF-JUSTICE NONSEALING ORDER — the committed decision records that this is the point at which the route becomes a motion, or counsel;",
        "- the case is a pre-November 1, 1991 qualifying case, which the committed decision records may require a motion under the statute's legacy branch;",
        "- the matter is a DWAI, which engages the separate CPL § 160.57(1)(a) three-year rule as well;",
        "- what you actually need is the courthouse file closed, which the committed decision records that § 160.55 does not do;",
        "- any immigration question is involved.",
        "",
        "WHERE TO GO WHEN SELF-HELP STOPS",
        "",
        "For the criminal-history result, the New York State Division of Criminal Justice Services is the office named in the committed workflow. For a nonsealing order, a legacy pre-1991 case, or a DWAI, the committed decision routes the matter to a motion or to counsel.",
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
  "composedFromNote": "the controlling committed legal decision (data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json, researchTrackDecisions#ny_160_55_violation) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), both bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route, and none should: the controlling committed legal decision records the product disposition as GUIDANCE + CORRECTION REQUEST, with INITIAL PETITION: NONE FOR ORDINARY MODERN CASE. This packet composes exactly those two things and composes no petition.",
  "routeSelectionNote": "One branch of one research-decision route: the sentencing-court transmission or correction request. The committed decision records other branches — a legacy motion for a pre-November 1, 1991 case, and counsel where the court entered an interests-of-justice nonsealing order — and this packet names both as stop conditions rather than printing an election for the participant to make.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request",
      "statute": "N.Y. Crim. Proc. Law § 160.55",
      "instrument": "a written request to the sentencing court, with process guidance — not a petition",
      "statedOn": "both composed pages, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**In the ordinary case the participant files nothing at all.** The controlling committed legal decision records that for a post-November 1, 1991 qualifying disposition the participant ordinarily files nothing, and that the CLERK notifies DCJS and the appropriate law-enforcement agencies. Where the seal has not shown up, the committed workflow's own step is a request to the SENTENCING COURT, which is the destination of the request page in this packet, and the census records the same destination in one word: sentencing court."
    ],
    [
      "FEE_AND_WAIVER",
      "No participant filing arises in the ordinary case, so no filing fee does either. Two costs that are not filing fees may arise from the committed workflow's own steps: the certificate of disposition and the official criminal-history result. No committed record this packet binds states what either costs. The offices that answer are the clerk of the court that sentenced the participant, and the New York State Division of Criminal Justice Services."
    ],
    [
      "SERVICE",
      "**Nothing is served, because nothing is filed.** The controlling committed decision records that the clerk notifies DCJS and the appropriate law-enforcement agencies. The request page is a letter to the sentencing court and not a pleading on an opposing party. The committed workflow's own next step — sending the certified disposition to DCJS for correction — is likewise a transmission, not service."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** the court previously entered an interests-of-justice nonsealing order — the committed decision records that as the point where the route becomes a motion or counsel. **Stop and get help if:** the case is a pre-November 1, 1991 qualifying case, which the decision records may require a motion under the statute's legacy branch. **Stop and get help if:** the matter is a DWAI, which engages the separate CPL § 160.57(1)(a) three-year rule. **Stop and get help if:** what you need is the courthouse file closed, which § 160.55 does not do. **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "**This packet contains no petition, and that is what the record requires.** The controlling committed legal decision for this route records its product disposition as GUIDANCE + CORRECTION REQUEST, and records INITIAL PETITION: NONE FOR ORDINARY MODERN CASE. CPL § 160.55 sealing happens automatically at disposition; this packet is for the case where it has not shown up on your criminal-history result.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Everything about your own case belongs to your certificate of disposition and your criminal-history result, so each item is a labelled dotted blank listed below."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The controlling committed legal decision",
      "For a post-November 1, 1991 qualifying disposition, the participant ordinarily files nothing. The clerk notifies DCJS and appropriate law-enforcement agencies."
    ],
    [
      "The controlling committed legal decision",
      "It does not seal the court file. Current New York Courts guidance and appellate authority expressly distinguish § 160.55 from the full court-record sealing language in § 160.50."
    ],
    [
      "The controlling committed legal decision",
      "Qualifying violations may therefore disappear from common DCJS-based criminal-history results while the courthouse file remains publicly inspectable."
    ],
    [
      "The controlling committed legal decision",
      "CPL § 160.57 Clean Slate is separate. Do not promise that ordinary § 160.55 violations will receive full court-file sealing through § 160.55."
    ]
  ],
  "documentsToObtain": [
    [
      "Your certificate of disposition — step two of the committed workflow",
      "the clerk of the court that sentenced you"
    ],
    [
      "Your official criminal-history result — step three of the committed workflow, and how you find out whether the seal happened",
      "the New York State Division of Criminal Justice Services"
    ]
  ],
  "steps": [
    "**Obtain your certificate of disposition.**",
    "**Check your official criminal-history result.** If the partial seal is there, you are done: the committed decision records that in the ordinary case nothing is filed.",
    "**If it is not there, complete the request page** and send it to the clerk of the court that sentenced you, with your certificate of disposition.",
    "**Send your certified disposition to DCJS for correction**, which is the committed workflow's next step.",
    "**Check the criminal-history result again**, which is how you confirm the outcome.",
    "**If the court had already ordered that the case not be sealed, stop.** The committed decision routes that to a motion or to counsel."
  ],
  "deliberatelyBlank": [
    "**Your signing line, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.",
    "**Any court caption.** The request page is a letter, not a pleading, and it carries no caption because nothing is being filed in a case."
  ],
  "notTold": [
    "**What a certificate of disposition or a criminal-history result costs.** Neither is a filing fee and neither is stated by any committed record this packet binds. The clerk of the sentencing court answers the first; the New York State Division of Criminal Justice Services answers the second.",
    "**Exactly which records CPL § 160.55 reaches beyond the five the committed decision lists.** The committed decision lists fingerprints and palmprints, booking photographs, DCJS records, police records and prosecutor records, and states that the court file is not among them. It does not enumerate further, and this packet does not either."
  ],
  "stopConditions": [
    "the court previously entered an interests-of-justice nonsealing order;",
    "the case is a pre-November 1, 1991 qualifying case, which may require a motion under the statute's legacy branch;",
    "the matter is a DWAI, which engages the separate CPL § 160.57(1)(a) three-year rule;",
    "what you need is the courthouse file closed, which § 160.55 does not do;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is guidance and a written request. It is not a sealing petition — the controlling committed legal decision records that no initial petition arises in an ordinary modern case — it is not legal advice, it is not sent for you, and it does not seal anything by itself. It is also not Clean Slate: the committed decision records CPL § 160.57 as separate and warns against promising full court-file sealing through § 160.55.",
  "receiptDoesNotEstablish": [
    "that any New York case terminated in a qualifying non-criminal violation or traffic infraction",
    "that the automatic partial seal did or did not occur in any particular case",
    "what the full text of CPL § 160.55 provides — the committed intake memo records that the section's text was not read at source, which is why this packet states only what the controlling legal decision establishes and no more"
  ],
  "buildFindings": [
    {
      "finding": "The controlling committed legal decision records the product disposition for this route as GUIDANCE + CORRECTION REQUEST with INITIAL PETITION: NONE FOR ORDINARY MODERN CASE, and records that the participant ordinarily files nothing while the clerk notifies DCJS and law-enforcement agencies.",
      "consequence": "No petition was composed. The packet is a request to the sentencing court plus a guidance page, which is exactly the two things the decision names."
    },
    {
      "finding": "The committed New York intake memo records the § 160.55 track as legal_research_required with two build-blocking open questions: the section's full text was not read at source, and which records it seals is exactly what is unknown.",
      "consequence": "The packet states ONLY what the later controlling legal decision establishes — the five categories the partial seal reaches, and that the court file is not among them — and states expressly that it does not enumerate further. It asserts no scope beyond the decision, which is what the memo warned against."
    },
    {
      "finding": "The committed decision warns that CPL § 160.57 Clean Slate is separate and that ordinary § 160.55 violations must not be promised full court-file sealing through § 160.55.",
      "consequence": "Both statements are carried to the participant, and the packet's own 'what this is not' section repeats them."
    }
  ],
  "counselQuestions": [
    "The committed New York intake memo records the § 160.55 track as legal_research_required with build blockers, while the later national legal decision states the mechanism, what is sealed and the correction workflow. This packet builds on the decision and states nothing beyond it. Confirm that the decision supersedes the memo's block for this branch.",
    "The request page asks the sentencing court to transmit or correct the sealing notice. Confirm the addressee and the form of the request."
  ],
  "reviewersAttention": [
    "source-receipt.json binds a committed legal decision and the census, not a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "THIS FAMILY SHIPS NO PETITION, BECAUSE ITS CONTROLLING RECORD SAYS THERE IS NONE. A reviewer expecting a pleading should read the build findings first."
  ],
  "documentsHeading": "Documents you must obtain — nothing here is filed, and these are the committed workflow’s own steps"
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
  return text.replaceAll("**", "").replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
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
