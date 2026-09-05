#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — West Virginia sex-trafficking-victim
 * vacatur and expungement, W. Va. Code § 61-14-9.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS
 *
 * A COMPOSED TREATMENT that IS a court filing, and one whose destination the
 * repository holds: the compiled profile records that the person may petition
 * the CIRCUIT COURT in the county of conviction or juvenile adjudication.
 *
 * THE FEE TRAP THAT SITS TWO SECTIONS AWAY. DET-FEE-AND-WAIVER-001-A4
 * records that West Virginia's compiled profile carries no-fee lines keyed to
 * § 61-11-25 beside a § 61-11-26 petition that costs $200. This route is
 * § 61-14-9. No figure was taken from either, and the packet says so, so that
 * the silence reads as a decision rather than as an omission.
 *
 * The compiled profile's own instruction — route this to legal aid or an
 * attorney — is the packet's first stop condition.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
  "worklistGroupId": "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/wv/composed-treatment:obligation:runtime-only:wv:sex-trafficking-victim-vacatur-and-expungement--custom-pleading",
  "jurisdiction": "WV",
  "legalName": "West Virginia § 61-14-9 Vacatur and Expungement Petition",
  "routeName": "asking the West Virginia circuit court in the county of conviction or juvenile adjudication to vacate and expunge under § 61-14-9",
  "statutes": [
    "W. Va. Code § 61-14-9"
  ],
  "routes": [
    {
      "routeKey": "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement"
    }
  ],
  "records": [
    {
      "recordId": "route-contract:WV:sex-trafficking-victim-vacatur-and-expungement",
      "path": "src/lib/legal-authority/routes/single-routes.json",
      "role": "the committed route contract: this route's mechanism, statute, outcome mode, timing anchor, recorded conditions, required facts and packet components",
      "mustContain": [
        "\"routeKey\": \"WV:sex-trafficking-victim-vacatur-and-expungement\"",
        "Sex-trafficking-victim vacatur and expungement",
        "W. Va. Code § 61-14-9",
        "West Virginia § 61-14-9 Vacatur and Expungement Petition",
        "no fixed elapsed waiting period; the petition follows a covered conviction or adjudication plus facts establishing the direct-result trafficking nexus",
        "Covered prostitution-related conviction or juvenile adjudication",
        "Direct result of sex trafficking",
        "Statutory proof conditions satisfied",
        "Petition under § 61-14-9",
        "Direct-result nexus evidence",
        "Exact offense/statute?",
        "Conviction/adjudication?",
        "Trafficking period?",
        "Direct-result evidence?",
        "Supporting records?",
        "Other counts?",
        "Requested vacatur and expungement?"
      ]
    },
    {
      "recordId": "compiled-profile:WV-west-virginia#sex-trafficking-victim-vacatur-and-expungement",
      "path": "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json",
      "role": "the compiled state profile's own pathway for this route, carrying the recorded substance of the statute and, where it exists, the recorded self-help boundary",
      "mustContain": [
        "For 61-11-26 conviction expungement, the circuit clerk charges the same fee as filing a civil action, and a person who receives an expungement order must pay a $100 West Virginia State Police processing fee.",
        "\"id\": \"sex-trafficking-victim-vacatur-and-expungement\"",
        "A person convicted of prostitution, or adjudicated delinquent, as a direct result of being a trafficking victim may petition the circuit court in the county of conviction or juvenile adjudication to vacate the conviction/adjudication and expunge the record. The court may grant relief if it finds the person\\u0019s participation in the offense was a direct result of being trafficked. No rehabilitation requirement is imposed for this trafficking-victim expungement route. (\\\"https://code.wvlegislature.gov/61-14-9/\\\")",
        "West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney.",
        "rehabilitation_not_required_61_14_9"
      ]
    },
    {
      "recordId": "route-obligation-census:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this route's exact key, its statutory authority, its recorded destination and its participant-facing instrument",
      "mustContain": [
        "the § 59-1-11(a)(1) civil-action filing fee of $200",
        "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
        "West Virginia § 61-14-9 Vacatur and Expungement Petition"
      ]
    }
  ],
  "components": [
    {
      "id": "wv-61-14-9-vacatur-primary-filing-1",
      "routeKey": "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
      "role": "primary_filing",
      "title": "Petition - West Virginia § 61-14-9 Vacatur and Expungement Petition",
      "description": "the composed petition, on this route's own statutory ground",
      "condition": null,
      "body": [
        "IN THE CIRCUIT COURT OF ................................ COUNTY, WEST VIRGINIA",
        "(enter the county of conviction or juvenile adjudication from the court record)",
        "",
        "IN RE: {{participant.full_legal_name}},",
        "PETITIONER.",
        "",
        "Case number, if the court assigns one at filing:",
        "{{DOTS}}",
        "",
        "WEST VIRGINIA § 61-14-9 VACATUR AND EXPUNGEMENT PETITION",
        "",
        "A. WHAT THE COMMITTED RECORD ESTABLISHES ABOUT THIS ROUTE",
        "",
        "This petition is brought on the route the committed route contract records as \"Sex-trafficking-victim vacatur and expungement\", under W. Va. Code § 61-14-9.",
        "",
        "The compiled West Virginia profile records the substance of this route as follows. A person convicted of prostitution, or adjudicated delinquent, as a direct result of being a trafficking victim may petition the circuit court in the county of conviction or juvenile adjudication to vacate the conviction/adjudication and expunge the record. The court may grant relief if it finds the person's participation in the offense was a direct result of being trafficked. No rehabilitation requirement is imposed for this trafficking-victim expungement route. (\"https://code.wvlegislature.gov/61-14-9/\")",
        "",
        "The committed contract records the timing of this route as: no fixed elapsed waiting period; the petition follows a covered conviction or adjudication plus facts establishing the direct-result trafficking nexus.",
        "",
        "The committed contract records these conditions on the route: Covered prostitution-related conviction or juvenile adjudication; Direct result of sex trafficking; Statutory proof conditions satisfied.",
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
        "[C1 - exact offense/statute] Exact offense/statute?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - conviction/adjudication] Conviction/adjudication?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - trafficking period] Trafficking period?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - direct-result evidence] Direct-result evidence?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C5 - supporting records] Supporting records?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C6 - other counts] Other counts?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C7 - requested vacatur and expungement] Requested vacatur and expungement?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "D. THE REQUEST",
        "",
        "The petitioner asks the Court to vacate the conviction or adjudication described above and expunge the record, under W. Va. Code § 61-14-9.",
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
          "id": "court_caption_county",
          "label": "County in the Circuit Court caption",
          "supply": "the county of conviction or juvenile adjudication, copied from the court record",
          "why": "the committed profile fixes the court class as Circuit Court but the participant's record supplies which county"
        },
        {
          "kind": "rbf",
          "id": "fact_q1",
          "label": "Item C1 - exact offense/statute",
          "supply": "Exact offense/statute — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q2",
          "label": "Item C2 - conviction/adjudication",
          "supply": "Conviction/adjudication — copied from the record itself, not from memory",
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
          "label": "Item C4 - direct-result evidence",
          "supply": "Direct-result evidence — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q5",
          "label": "Item C5 - supporting records",
          "supply": "Supporting records — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q6",
          "label": "Item C6 - other counts",
          "supply": "Other counts — copied from the record itself, not from memory",
          "why": "the committed route contract records this as a required fact of the participant's own matter, and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_q7",
          "label": "Item C7 - requested vacatur and expungement",
          "supply": "Requested vacatur and expungement — copied from the record itself, not from memory",
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
      "id": "wv-61-14-9-vacatur-filing-instructions-2",
      "routeKey": "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
      "role": "filing_instructions",
      "title": "Filing Instructions - West Virginia § 61-14-9 Vacatur and Expungement Petition",
      "description": "what this set is, where it goes, what it costs, who is notified, and when to stop",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "FILING INSTRUCTIONS - WEST VIRGINIA § 61-14-9 VACATUR AND EXPUNGEMENT PETITION",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "The committed route contract records this route as \"Sex-trafficking-victim vacatur and expungement\", under W. Va. Code § 61-14-9, with outcome mode \"participant_packet\".",
        "",
        "The committed contract names the packet components for this route as: Petition under § 61-14-9; Direct-result nexus evidence. This packet composes the filing pages; anything on that list that is a RECORD rather than a pleading is a document you obtain and file with the petition.",
        "",
        "Who runs it: The participant petitions the circuit court and the court decides — the compiled profile records that the court \"may grant relief if it finds the person's participation in the offense was a direct result of being trafficked\". Its instruction about how to get there comes first: \"West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney.\"",
        "",
        "WHAT YOU DO",
        "",
        "- Read the stop conditions before anything else.",
        "- If you go on, obtain the direct-result nexus evidence the committed contract names as a component of this packet.",
        "- Fill only the labelled items. Nothing on any page asks for an account of what happened to you.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- Do not write an account of what was done to you on any page of this packet. Nothing here asks for one, and the compiled record's own instruction is that this route goes to legal aid or an attorney.",
        "- Do not file anything before you have thought about what becomes public when you do. A court file is a public record unless something makes it otherwise, and nothing in this packet makes it otherwise.",
        "- Do not expect a rehabilitation showing to be required here. The compiled profile records in terms that no rehabilitation requirement is imposed for this route — which is not true of West Virginia's ordinary conviction-expungement routes.",
        "- Do not treat this as covering every trafficking-related West Virginia conviction. The committed contract records that it is limited to the statute's covered prostitution-related offence and that broader offences require referral rather than an invented rule.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "No committed record this packet binds states a filing fee, or a fee waiver, for this route. The office that answers both is the office of the clerk of the West Virginia circuit court in the county of conviction or juvenile adjudication. Ask before you go, because a filing you cannot pay for is a filing you cannot make. This packet takes NO fee figure from West Virginia's other expungement sections. The compiled profile carries no-fee lines keyed to W. Va. Code § 61-11-25, and for § 61-11-26 it records that the circuit clerk charges the same fee as filing a civil action and that a person who receives an expungement order must pay a $100 West Virginia State Police processing fee; the committed route-obligation census records that civil-action fee as the § 59-1-11(a)(1) fee of $200. This route is § 61-14-9 and is none of those sections, so this packet takes no figure from any of them.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the clerk of the West Virginia circuit court in the county of conviction or juvenile adjudication.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- **this is the first thing the committed record says about this route:** West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney.",
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
  "composedFromNote": "the committed route contract (src/lib/legal-authority/routes/single-routes.json, WV:sex-trafficking-victim-vacatur-and-expungement), the compiled West Virginia profile pathway (src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json#sex-trafficking-victim-vacatur-and-expungement) and the committed route-obligation census (data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json), each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this route, and the committed contract's own packet components are a composed petition together with records the participant obtains. Every page in this packet is therefore composed by this build from the committed records; no official form was substituted and none was invented.",
  "routeSelectionNote": "One route, one instrument set: the petition states this route's statutory ground in its own title, body and footer, and no election control exists on any composed page. Where a neighbouring section of the same statute is a different route, the packet says so and tells the participant to stop rather than printing a box to tick.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
      "statute": "W. Va. Code § 61-14-9",
      "instrument": "West Virginia § 61-14-9 Vacatur and Expungement Petition",
      "statedOn": "the composed pages for this route, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**The repository establishes this one.** The compiled West Virginia profile records that the person \"may petition the circuit court in the county of conviction or juvenile adjudication\". That is the destination this packet states. The census records the route's own destination field as not recorded; the compiled profile answers it for this section, and DET-FEE-AND-WAIVER-001-A2 makes the compiled profile part of the repository this packet must ask first."
    ],
    [
      "FEE_AND_WAIVER",
      "No committed record this packet binds states a filing fee, or a fee waiver, for this route. The office that answers both is the office of the clerk of the West Virginia circuit court in the county of conviction or juvenile adjudication. Ask before you go, because a filing you cannot pay for is a filing you cannot make. This packet takes NO fee figure from West Virginia's other expungement sections. The compiled profile carries no-fee lines keyed to W. Va. Code § 61-11-25, and for § 61-11-26 it records that the circuit clerk charges the same fee as filing a civil action and that a person who receives an expungement order must pay a $100 West Virginia State Police processing fee; the committed route-obligation census records that civil-action fee as the § 59-1-11(a)(1) fee of $200. This route is § 61-14-9 and is none of those sections, so this packet takes no figure from any of them."
    ],
    [
      "SERVICE",
      "No committed record this packet binds states who must be served on this route, or how. The office that answers it is the office of the clerk of the West Virginia circuit court in the county of conviction or juvenile adjudication."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** **this is the first thing the committed record says about this route:** West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney. **Stop and get help if:** the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you; **Stop and get help if:** your own safety is in question, now or once a filing becomes a public court record; **Stop and get help if:** there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect; **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "This packet is composed from committed repository records, not from an official form: no committed record names an official West Virginia participant form for this route.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every fact about your own case belongs to the record itself, so each one is a labelled dotted blank listed below, and you fill it from the record, never from memory."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The compiled West Virginia profile",
      "West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney."
    ],
    [
      "The compiled West Virginia profile",
      "No rehabilitation requirement is imposed for this trafficking-victim expungement route."
    ],
    [
      "The committed route contract",
      "Limited to the statute's covered prostitution-related offense. Broader trafficking-related offenses require referral rather than an invented rule, and the route must not be labelled as covering every trafficking-related West Virginia conviction."
    ]
  ],
  "documentsToObtain": [
    [
      "Direct-result nexus evidence — the committed contract names it as a component of this packet",
      "whoever holds it; the committed record's own recommendation is to take that question to legal aid or an attorney"
    ]
  ],
  "steps": [
    "**Read the filing instructions page.** It says what this route is, who runs it, what the record establishes about cost and notice, and when to stop.",
    "**Fill every labelled item on the petition** from the record itself. Do not guess a date, an offence wording, a case number or an office name.",
    "**Obtain every document the filing instructions page lists**, and file them with the petition.",
    "**Sign and date the petition personally.** The platform never signs for you and never dates a signing line.",
    "**File it with the office of the clerk of the West Virginia circuit court in the county of conviction or juvenile adjudication**, and ask that office what it charges and how it accepts filings before you go."
  ],
  "deliberatelyBlank": [
    "**Your signing lines, and every date beside one.** A signature is yours alone, and a date written before you sign would be false.",
    "**Every case number in every caption.** If the court assigns one, it does so at filing, and the pages in this set are filed together before any number exists."
  ],
  "notTold": [],
  "stopConditions": [
    "**this is the first thing the committed record says about this route:** West Virginia has a special relief route for prostitution records caused by sex trafficking. This can involve vacating the conviction or juvenile adjudication, so it should be routed to legal aid or an attorney.",
    "the facts that establish the connection are yours to tell and yours alone. No page in this packet asks for an account of what was done to you, and nothing here should be written out for anyone who has not been engaged to act for you;",
    "your own safety is in question, now or once a filing becomes a public court record;",
    "there are other counts on the same case, or other cases — every committed contract in this group records other counts as a fact the route must collect;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is a composed petition on one West Virginia route. It is not an official West Virginia form — no committed record names one for this route — it is not legal advice, it is not filed for you, and it does not decide whether the court will grant what it asks for.",
  "receiptDoesNotEstablish": [
    "that any West Virginia conviction or adjudication was a direct result of being trafficked",
    "that a fee rule recorded for W. Va. Code § 61-11-25 or § 61-11-26 applies to a § 61-14-9 petition — this build takes nothing from either"
  ],
  "buildFindings": [
    {
      "finding": "The compiled West Virginia pathway records that this route 'should be routed to legal aid or an attorney', and separately that no rehabilitation requirement is imposed for it.",
      "consequence": "The first is quoted as the packet's first stop condition. The second is carried because a participant who assumes West Virginia's ordinary rehabilitation showing applies may not file at all."
    },
    {
      "finding": "DET-FEE-AND-WAIVER-001-A4 records a West Virginia sibling trap: three 'no filing fees or costs are charged' lines keyed to § 61-11-25 sitting beside a § 61-11-26 petition that costs $200.",
      "consequence": "This route is § 61-14-9 and no figure was taken from either. The packet says so in terms, so a reader can see the omission is deliberate rather than a gap."
    },
    {
      "finding": "The committed contract limits this route to the statute's covered prostitution-related offence and records that broader trafficking-related offences require referral rather than an invented rule.",
      "consequence": "The packet states that limit rather than presenting itself as the instrument for every trafficking-related West Virginia conviction."
    }
  ],
  "counselQuestions": [
    "The petition is addressed to the circuit court in the county of conviction or juvenile adjudication, from the compiled profile's own words. Confirm.",
    "The compiled profile routes this fact pattern to legal aid or an attorney. Confirm a composed draft is the right deliverable here at all."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "The West Virginia fee sibling trap recorded in DET-FEE-AND-WAIVER-001-A4 was walked around deliberately, and the packet says so."
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
import { stripMarkdownEmphasis, assertNoMarkdownDelimitersOnDeliveredPages } from "./rcap-custom-pleading/composed-page-markdown.mjs";

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
 * asterisks on a composed page. The one shared rule lives in
 * scripts/rcap-custom-pleading/composed-page-markdown.mjs, imported rather than
 * copied, because a page printing markup is a defect of the renderer and not of
 * any one family. A string carrying no closed emphasis pair passes through
 * unchanged, so no family whose pages carry no markup moves a byte. */
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

  const primary = COMPONENT["wv-61-14-9-vacatur-primary-filing-1"];
  assert.ok(primary.body[0].startsWith("IN THE CIRCUIT COURT OF "),
    "the filing must identify the recorded circuit-court class rather than leave the court type blank");
  assert.ok(primary.blanks.some((blank) => blank.id === "court_caption_county" && blank.kind === "rbf"),
    "the authored caption blank must be inventoried as required before filing");

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
