#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Wyoming human-trafficking victim
 * vacatur, Wyo. Stat. § 6-2-708.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * A COMPOSED TREATMENT that IS a court filing, addressed to the court the
 * compiled profile names: the court that entered the conviction, at any time
 * after it.
 *
 * THE RULE THAT SHAPED THE PAGE. Wyoming's compiled pathway carries an
 * express trauma rule — ask only what is necessary, and route to review
 * without requiring graphic details. So the nexus item on this petition is
 * printed in the committed contract's own four-word form and nothing more,
 * no page invites a narrative, and the rule is quoted to the participant so
 * that the absence of a narrative field reads as deliberate.
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
  "legalName": "Wyoming Trafficking-Victim Vacatur Petition under Wyo. Stat. § 6-2-708",
  "routeName": "asking the Wyoming court that entered the conviction to vacate it under § 6-2-708",
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
    }
  ],
  "components": [
    {
      "id": "wy-6-2-708-vacatur-primary-filing-1",
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "role": "primary_filing",
      "title": "Petition - Wyoming Trafficking-Victim Vacatur Petition under § 6-2-708",
      "description": "the composed petition, on this route's own statutory ground",
      "condition": null,
      "body": [
        "IN THE ............................................................ COURT",
        "(the Wyoming court that entered the conviction)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "WYOMING TRAFFICKING-VICTIM VACATUR PETITION UNDER § 6-2-708",
        "",
        "A. WHAT THE COMMITTED RECORD ESTABLISHES ABOUT THIS ROUTE",
        "",
        "This petition is brought on the route the committed route contract records as \"Human-trafficking-victim vacatur\", under Wyo. Stat. § 6-2-708(c).",
        "",
        "The compiled Wyoming profile records the substance of this route as follows. Wyoming has a separate victim/survivor route. A human-trafficking victim is not criminally liable for commercial sex acts or other criminal acts committed as a direct result of, or incident to, being a trafficking victim. At any time after conviction, the court that entered the conviction may vacate it if the person's participation in the offense resulted from being a victim. Official documentation creates a presumption, but is not required. (\"https://law.justia.com/codes/wyoming/title-6/chapter-2/article-7/section-6-2-708/\")",
        "",
        "The committed contract records the timing of this route as: available at any time after entry of the covered conviction.",
        "",
        "The committed contract records these conditions on the route: Participation in the offense resulted from trafficking victimization; Statutory evidentiary and offense requirements satisfied.",
        "",
        "B. THE PETITIONER",
        "",
        "Name: {{participant.full_legal_name}}",
        "Date of birth: {{participant.date_of_birth}}",
        "",
        "C. THE FACTS OF THIS MATTER, WHICH THE PETITIONER SUPPLIES FROM THE RECORD",
        "",
        "Each item below is printed in the words the committed record uses for it. Fill each one from the record itself, never from memory.",
        "",
        "[C1 - exact conviction] Exact conviction?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - conviction date] Conviction date?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - trafficking period] Trafficking period?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - causal nexus] Causal nexus?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - official documentation if available] Official documentation if available?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - alternative evidence] Alternative evidence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - other counts] Other counts?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C8 - requested vacatur effect] Requested vacatur effect?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the Court to vacate the conviction described above under Wyo. Stat. § 6-2-708.",
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
          "id": "fact_q1",
          "label": "Item C1 - exact conviction",
          "supply": "Exact conviction — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q2",
          "label": "Item C2 - conviction date",
          "supply": "Conviction date — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q3",
          "label": "Item C3 - trafficking period",
          "supply": "Trafficking period — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q4",
          "label": "Item C4 - causal nexus",
          "supply": "Causal nexus — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q5",
          "label": "Item C5 - official documentation if available",
          "supply": "Official documentation if available — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q6",
          "label": "Item C6 - alternative evidence",
          "supply": "Alternative evidence — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q7",
          "label": "Item C7 - other counts",
          "supply": "Other counts — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q8",
          "label": "Item C8 - requested vacatur effect",
          "supply": "Requested vacatur effect — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
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
      "id": "wy-6-2-708-vacatur-filing-instructions-2",
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "role": "filing_instructions",
      "title": "Filing Instructions - Wyoming Trafficking-Victim Vacatur Petition under § 6-2-708",
      "description": "what this set is, where it goes, what it costs, who is notified, and when to stop",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "FILING INSTRUCTIONS - WYOMING TRAFFICKING-VICTIM VACATUR PETITION UNDER § 6-2-708",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "The committed route contract records this route as \"Human-trafficking-victim vacatur\", under Wyo. Stat. § 6-2-708(c), with outcome mode \"participant_packet\".",
        "",
        "The committed contract names the packet components for this route as: Petition to vacate; Nexus evidence. This packet composes the filing pages; anything on that list that is a RECORD rather than a pleading is a document you obtain and file with the petition.",
        "",
        "Who runs it: The participant petitions the court that entered the conviction, and that court decides. The compiled profile records the timing plainly — \"At any time after conviction\" — and records a handling rule this packet follows to the letter: \"Wilma trauma rule: Ask only what is necessary:\" and \"Then route to manual/legal review. Do not require graphic details.\"",
        "",
        "WHAT YOU DO",
        "",
        "- Read the stop conditions before anything else.",
        "- If you have official documentation, the compiled profile records that it creates a presumption — but the same record says it is NOT required, and the committed contract says the intake must permit alternative nexus evidence.",
        "- Fill only the labelled items. Nothing on any page asks for graphic detail, and the compiled record's own rule is that none should be required.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- Do not write an account of what was done to you on any page of this packet. Nothing here asks for one, and the compiled record's own instruction is that this route goes to legal aid or an attorney.",
        "- Do not file anything before you have thought about what becomes public when you do. A court file is a public record unless something makes it otherwise, and nothing in this packet makes it otherwise.",
        "- Do not assume you need official documentation. The compiled profile records that it creates a presumption but is not required, and the committed contract records that alternative nexus evidence must be permitted.",
        "- Do not import a waiting table from another Wyoming route. The committed contract says in terms that no nonconviction, misdemeanor, felony or juvenile waiting table may be imported here, and that relief is available at any time after the conviction.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "The compiled Wyoming profile this packet binds carries a Route/Fee table, and this route has its own line in it: \"Human-trafficking victim vacatur — Verify with clerk; statute is a motion route, not a standard expungement filing-fee route.\" So no amount is established for this route, and the reason no amount is established is recorded: this is a motion in the court that entered the conviction, not one of Wyoming's standard expungement filings. The other four lines of that table are keyed to other sections — W.S. 7-13-1401 at $0, 7-13-1501 at $100, 7-13-1502 at $300 and 14-6-241 at $0 — and none of them is this route, so this packet takes no figure from any of them. If a clerk quotes you the $300 felony-expungement fee, this petition is not a 7-13-1502 expungement. No committed record this packet binds states a fee waiver for this route. The office that answers both questions is the office of the clerk of the Wyoming court that entered the conviction. Ask before you go, because a filing you cannot pay for is a filing you cannot make.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the clerk of the Wyoming court that entered the conviction.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- **this is the first thing the committed record says about this route:** the compiled Wyoming profile's own handling rule is to ask only what is necessary and then \"route to manual/legal review. Do not require graphic details.\";",
        "- the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you;",
        "- your own safety is in question, now or once a filing becomes a public court record;",
        "- there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect;",
        "- any immigration question is involved.",
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
  "composedFromNote": "the committed route contract (src/lib/legal-authority/routes/single-routes.json, WY:human-trafficking-victim-vacatur-w-s-6-2-708), the compiled Wyoming profile pathway (src/lib/rcap-engine/compiled/profiles/WY-wyoming.json#human-trafficking-victim-vacatur-w-s-6-2-708) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route, and the committed contract's own packet components are a composed petition together with records the participant obtains. Every page in this packet is therefore composed by this build from the committed records; no official form was substituted and none was invented.",
  "routeSelectionNote": "One route, one instrument set: the petition states this route's statutory ground in its own title, body and footer, and no election control exists on any composed page. Where a neighbouring section of the same statute is a different route, the packet says so and tells the participant to stop rather than printing a box to tick.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708",
      "statute": "Wyo. Stat. § 6-2-708(c)",
      "instrument": "Wyoming Trafficking-Victim Vacatur Petition under § 6-2-708",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**The repository establishes this one.** The compiled Wyoming profile records that \"the court that entered the conviction may vacate it\". That is the destination this packet states. The census records the route's own destination field as not recorded; the compiled profile answers it for this section."
    ],
    [
      "FEE_AND_WAIVER",
      "The compiled Wyoming profile this packet binds carries a Route/Fee table, and this route has its own line in it: \"Human-trafficking victim vacatur — Verify with clerk; statute is a motion route, not a standard expungement filing-fee route.\" So no amount is established for this route, and the reason no amount is established is recorded: this is a motion in the court that entered the conviction, not one of Wyoming's standard expungement filings. The other four lines of that table are keyed to other sections — W.S. 7-13-1401 at $0, 7-13-1501 at $100, 7-13-1502 at $300 and 14-6-241 at $0 — and none of them is this route, so this packet takes no figure from any of them. If a clerk quotes you the $300 felony-expungement fee, this petition is not a 7-13-1502 expungement. No committed record this packet binds states a fee waiver for this route. The office that answers both questions is the office of the clerk of the Wyoming court that entered the conviction. Ask before you go, because a filing you cannot pay for is a filing you cannot make."
    ],
    [
      "SERVICE",
      "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the clerk of the Wyoming court that entered the conviction."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** **this is the first thing the committed record says about this route:** the compiled Wyoming profile's own handling rule is to ask only what is necessary and then \"route to manual/legal review. Do not require graphic details.\"; **Stop and get help if:** the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you; **Stop and get help if:** your own safety is in question, now or once a filing becomes a public court record; **Stop and get help if:** there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect; **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official Wyoming participant form for this route.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
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
    "**Read the filing instructions page.** It says what this route is, who runs it, what the record establishes about cost and notice, and when to stop.",
    "**Fill every labelled item on the petition** from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Obtain every document the filing instructions page lists**, and file them with the petition.",
    "**Sign and date the petition personally.** The platform never signs for you and never dates a signing line.",
    "**File it with the office of the clerk of the Wyoming court that entered the conviction**, and ask that office what it charges and how it accepts filings before you go."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "notTold": [],
  "stopConditions": [
    "**this is the first thing the committed record says about this route:** the compiled Wyoming profile's own handling rule is to ask only what is necessary and then \"route to manual/legal review. Do not require graphic details.\";",
    "the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you;",
    "your own safety is in question, now or once a filing becomes a public court record;",
    "there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is a composed petition on one Wyoming route. It is not an official Wyoming form — no committed record names one for this route — it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any Wyoming conviction resulted from being a victim of trafficking"
  ],
  "buildFindings": [
    {
      "finding": "The compiled Wyoming pathway carries an express trauma rule: ask only what is necessary, and route to manual or legal review without requiring graphic details.",
      "consequence": "It governs the page design here. The nexus item is printed in the committed contract's own four-word form and nothing more, no page invites a narrative account, and the rule itself is quoted to the participant so they know the packet is not withholding something they were meant to write."
    },
    {
      "finding": "The compiled profile records that official documentation creates a presumption but is not required, and the committed contract records that alternative nexus evidence must be permitted.",
      "consequence": "The packet states both, so a participant without official documentation is not turned away from a route the record says is open to them."
    },
    {
      "finding": "The committed contract records that no nonconviction, misdemeanor, felony or juvenile waiting table may be imported into this route, and that relief is available at any time after the covered conviction.",
      "consequence": "No waiting period appears anywhere in this packet, and the timing statement is quoted from the contract."
    }
  ],
  "counselQuestions": [
    "The packet composes a petition to the court that entered the conviction, from the compiled profile's own words, with no waiting period and with alternative nexus evidence permitted. Confirm.",
    "The compiled profile routes this to manual or legal review. Confirm a composed draft is the right deliverable here at all."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "Wyoming's compiled record carries the only express TRAUMA RULE in this lane's six trafficking routes. It shaped the page: no narrative field exists anywhere in this packet."
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
