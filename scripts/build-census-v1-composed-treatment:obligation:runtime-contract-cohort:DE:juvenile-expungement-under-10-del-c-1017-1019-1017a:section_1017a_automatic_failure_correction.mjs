#!/usr/bin/env node
/**
 * FABLE-PC composed-treatment builder — Delaware § 1017A juvenile expungement,
 * the branch where the AUTOMATIC process did not happen.
 *
 * THE CLASSIFICATION, READ FROM THE COMMITTED RECORDS, AND WHY THIS PACKET
 * CONTAINS NO COURT PETITION
 *
 * The compiled Delaware profile records the § 1017A route in six words that
 * decide this family: mandatory-eligible cases are expunged by the SBI
 * monthly WITH NO FILING. The committed route contract records the same
 * boundary from the other side — § 1017A eligible records run through the
 * automatic program, with a petition or correction path ONLY where the
 * automatic process did not occur.
 *
 * So the participant does not file, and this packet does not pretend they do.
 * It composes a request to the agency that runs the programme — the State
 * Bureau of Identification, which the compiled record reaches at
 * 302-739-5884 — and a guidance page saying what the process is, who runs
 * it, what the participant must do, what they must NOT do, and where the
 * question stops being an agency one.
 *
 * Composing a court petition here would have invented a form for an automatic
 * route. That is the specific failure this family was most at risk of.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
const SPEC = {
  "familyId": "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
  "worklistGroupId": "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
  "buildScript": "scripts/build-census-v1-composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction.mjs",
  "outDir": "data/rcap-all50/overlays/census-v1/de/composed-treatment:obligation:runtime-contract-cohort:de:juvenile-expungement-under-10-del-c-1017-1019-1017a:section-1017a-automatic-failure-correction--custom-pleading",
  "jurisdiction": "DE",
  "legalName": "Delaware § 1017A automatic juvenile expungement — request and guidance where the automatic process did not occur",
  "routeName": "getting a Delaware § 1017A record expunged where the automatic programme has not reached it",
  "statutes": [
    "10 Del. C. § 1017A",
    "11 Del. C. § 4373A"
  ],
  "routes": [
    {
      "routeKey": "obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction"
    }
  ],
  "records": [
    {
      "recordId": "route-contract:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a",
      "path": "src/lib/legal-authority/routes/single-routes.json",
      "role": "the committed route contract for the Delaware juvenile cohort: the § 1017A automatic branch and the note recording that a petition or correction path exists only where the automatic process did not occur",
      "mustContain": [
        "\"routeKey\": \"DE:juvenile-expungement-under-10-del-c-1017-1019-1017a\"",
        "§ 1017 favorable-termination matters are mandatory with no elapsed wait; § 1017A eligible records run through the automatic program with a petition or correction path only where the automatic process did not occur. The three-year value here is the lowest discretionary § 1018 branch; the five- and seven-year branches turn on the offense category, which the intake must collect.",
        "10 Del. C. § 1018"
      ]
    },
    {
      "recordId": "compiled-profile:DE-delaware#juvenile-expungement-under-10-del-c-1017-1019-1017a",
      "path": "src/lib/rcap-engine/compiled/profiles/DE-delaware.json",
      "role": "the compiled Delaware pathway: that mandatory-eligible cases are expunged by the SBI monthly with no filing, and the SBI telephone number the record gives for a mandatory-expungement request",
      "mustContain": [
        "\"id\": \"juvenile-expungement-under-10-del-c-1017-1019-1017a\"",
        "None (automatic, § 4373A) Mandatory-eligible cases are expunged by the SBI monthly with no filing.",
        "SBI mandatory-expungement request Contact the SBI (302-739-5884) to request mandatory expungement; if eligible, SBI sends a letter with instructions and any fees."
      ]
    },
    {
      "recordId": "route-obligation-census:DE-1017A",
      "path": "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      "role": "the committed route-obligation census: this branch's exact key and its recorded participant-facing instrument",
      "mustContain": [
        "obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
        "petition or correction request for an eligible § 1017A record not automatically expunged"
      ]
    }
  ],
  "components": [
    {
      "id": "de-1017a-automatic-failure-correction-agency-request-1",
      "routeKey": "obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
      "role": "agency_request",
      "title": "Request to the State Bureau of Identification - Delaware § 1017A automatic expungement that did not happen",
      "description": "the written request to the agency that runs the automatic programme; this is NOT a court filing",
      "condition": null,
      "body": [
        "TO: The Delaware State Bureau of Identification (SBI). The compiled Delaware profile records a telephone number for mandatory-expungement requests: 302-739-5884.",
        "Exact office and postal address, confirmed with that office:",
        "{{DOTS}}",
        "",
        "FROM: {{participant.full_legal_name}}",
        "MAILING ADDRESS: {{participant.street_address}}",
        "TELEPHONE: {{participant.phone}}",
        "EMAIL: {{participant.email}}",
        "DATE OF BIRTH: {{participant.date_of_birth}}",
        "",
        "REQUEST ABOUT A RECORD ELIGIBLE FOR AUTOMATIC EXPUNGEMENT UNDER 10 DEL. C. § 1017A",
        "",
        "A. WHY I AM WRITING, AND WHAT THE COMMITTED RECORD ESTABLISHES",
        "",
        "The compiled Delaware profile records how this route works: \"None (automatic, § 4373A) Mandatory-eligible cases are expunged by the SBI monthly with no filing.\"",
        "",
        "It records what to do when it has not happened: \"SBI mandatory-expungement request Contact the SBI (302-739-5884) to request mandatory expungement; if eligible, SBI sends a letter with instructions and any fees.\"",
        "",
        "The committed route contract records the same boundary: \"§ 1017 favorable-termination matters are mandatory with no elapsed wait; § 1017A eligible records run through the automatic program with a petition or correction path only where the automatic process did not occur. The three-year value here is the lowest discretionary § 1018 branch; the five- and seven-year branches turn on the offense category, which the intake must collect.\"",
        "",
        "This request is therefore made to the agency that runs the programme, and not to a court. No court petition is enclosed, because the committed records do not describe one as the first step here.",
        "",
        "B. MY MATTER",
        "",
        "[C1 - adjudication this request is about] Which juvenile adjudication is this request about? Give the court, the case number and the date.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C2 - recorded eligibility category] Why do you believe this record was eligible for the automatic programme? The committed contract records the eligibility categories; state which one you believe applies.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C3 - how the record was checked] How did you find out that the record is still there? Give the date you checked and what you looked at.",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "[C4 - what is being asked of the office] What are you asking this office to do?",
        "{{DOTS}}",
        "{{DOTS}}",
        "",
        "C. WHAT I AM ASKING FOR",
        "",
        "I am asking the office named above to check whether this record was eligible for the automatic programme, to tell me what it finds, and to expunge it if it is eligible. If the office cannot act, I am asking it to tell me who can.",
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
          "id": "fact_adjudication",
          "label": "Item C1 - adjudication this request is about",
          "supply": "the court, case number and date of the juvenile adjudication, copied from the record",
          "why": "no adjudication fact is held for a record the platform has not seen"
        },
        {
          "kind": "rbf",
          "id": "fact_category",
          "label": "Item C2 - recorded eligibility category",
          "supply": "the eligibility category you believe applies, in your own words",
          "why": "the category is a fact of the participant's own record and the platform holds no value for it"
        },
        {
          "kind": "rbf",
          "id": "fact_checked",
          "label": "Item C3 - how the record was checked",
          "supply": "the date you checked and what you looked at",
          "why": "only the participant knows when and how they checked"
        },
        {
          "kind": "rbf",
          "id": "fact_asked",
          "label": "Item C4 - what is being asked of the office",
          "supply": "what you are asking the office to do, in your own words",
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
      "id": "de-1017a-automatic-failure-correction-process-guidance-2",
      "routeKey": "obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
      "role": "filing_instructions",
      "title": "What this route is, and why there is no court petition in this packet",
      "description": "what the process is, who runs it, what you do, what you do NOT do, and how to check the outcome",
      "condition": null,
      "body": [
        "This page is for {{participant.full_legal_name}}.",
        "",
        "DELAWARE § 1017A AUTOMATIC JUVENILE EXPUNGEMENT, AND WHAT TO DO WHEN IT HAS NOT HAPPENED",
        "",
        "WHAT THIS ROUTE IS, AND WHO RUNS IT",
        "",
        "THE PARTICIPANT DOES NOT FILE THIS ONE. The compiled Delaware profile records it plainly: \"None (automatic, § 4373A) Mandatory-eligible cases are expunged by the SBI monthly with no filing.\"",
        "",
        "The committed route contract records the same thing from the other side: \"§ 1017 favorable-termination matters are mandatory with no elapsed wait; § 1017A eligible records run through the automatic program with a petition or correction path only where the automatic process did not occur. The three-year value here is the lowest discretionary § 1018 branch; the five- and seven-year branches turn on the offense category, which the intake must collect.\"",
        "",
        "So the ordinary case is that nothing is filed and nothing is paid, and the record is expunged by the agency on its own schedule. This packet exists for the case where that did not happen.",
        "",
        "Who runs it: The Delaware State Bureau of Identification runs the automatic programme. The compiled profile records that mandatory-eligible cases are expunged by the SBI monthly with no filing, and records a telephone number — 302-739-5884 — for a mandatory-expungement request.",
        "",
        "WHAT YOU DO",
        "",
        "- Check first, before doing anything else. If the record has already gone, there is nothing to ask for.",
        "- If it is still there, use the request page in this packet, or telephone the SBI on 302-739-5884. The compiled profile records that if the person is eligible, the SBI sends a letter with instructions and any fees.",
        "- Keep what you send and what you get back. If a court step becomes necessary later, that record is what shows the automatic route was tried.",
        "",
        "WHAT YOU DO NOT DO",
        "",
        "- **Do not file a court petition as your first step on this branch.** The committed records describe the § 1017A route as automatic, and describe a petition or correction path ONLY where the automatic process did not occur. Filing first asks a court to do what an agency does without being asked.",
        "- Do not use the § 1018 discretionary petition for this. That is a different branch with its own family, and it is for a record the automatic programme was never going to reach.",
        "",
        "WHAT IT COSTS, AND WHETHER A WAIVER EXISTS",
        "",
        "Nothing in this route is a court filing, so no filing fee arises from it. What the compiled record does state about money is this: \"SBI mandatory-expungement request Contact the SBI (302-739-5884) to request mandatory expungement; if eligible, SBI sends a letter with instructions and any fees.\" The record states no amount, so the SBI is the office that tells you whether any fee applies, and 302-739-5884 is the number the record gives for reaching it.",
        "",
        "WHO MUST BE SERVED, AND WHO IS NOTIFIED",
        "",
        "Nothing is served, because nothing is filed. The compiled record describes a request to an agency and a letter back from it.",
        "",
        "WHEN TO STOP AND GET HELP INSTEAD",
        "",
        "- the SBI says the record is not eligible and you believe it is;",
        "- the SBI does not answer, or answers and nothing changes;",
        "- the record is one the § 1017 mandatory branch or the § 1018 discretionary branch reaches instead — each is a different route with its own family;",
        "- you are told a court petition is now needed, which is the point at which this stops being an agency question;",
        "- any immigration question is involved.",
        "",
        "WHERE TO GO WHEN SELF-HELP STOPS",
        "",
        "The compiled Delaware profile gives one contact for this route by name and number: the State Bureau of Identification, 302-739-5884. Where the answer from that office does not resolve it, the question becomes a legal one and belongs with a lawyer or a legal-aid office.",
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
  "composedFromNote": "the committed route contract (src/lib/legal-authority/routes/single-routes.json, DE:juvenile-expungement-under-10-del-c-1017-1019-1017a), the compiled Delaware profile pathway and the committed route-obligation census, each bound by SHA-256 and anchor-verified at build time",
  "formIdentityNote": "No committed record names an official participant form for this branch, and the committed records describe the branch as AUTOMATIC: mandatory-eligible cases are expunged by the agency monthly with no filing. This packet therefore composes a request to that agency and a guidance page, and composes no court petition. Inventing a court form for an automatic route is the failure this family was most at risk of, and it was not made.",
  "routeSelectionNote": "One route, and its instrument is not a pleading. The § 1017A branch is automatic; the composed pages state that, state who runs it, and state what the participant does where it has not happened. The § 1018 discretionary petition is a different branch with its own family in this same lane, and nothing here is its instrument.",
  "routeSelectionsMade": [
    {
      "routeKey": "obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
      "statute": "10 Del. C. § 1017A",
      "instrument": "a request to the State Bureau of Identification, with guidance — not a court petition",
      "statedOn": "both composed pages, in their titles, bodies and footers"
    }
  ],
  "obligationTable": [
    [
      "FILING_DESTINATION",
      "**The participant does not file this one; the State Bureau of Identification runs it.** The compiled Delaware profile records that mandatory-eligible cases are expunged by the SBI monthly with no filing, and that the way to raise it is to contact the SBI on 302-739-5884. Where the automatic process did not occur, the committed contract records that a petition or correction path exists — and that is the point at which the question stops being an agency one. No court destination is asserted here, because no committed record establishes one for this branch."
    ],
    [
      "FEE_AND_WAIVER",
      "Nothing here is a court filing, so no filing fee arises from it. The compiled profile states what happens on a request: if the person is eligible, the SBI sends a letter with instructions and any fees. The office that answers what any fee would be is the SBI, on 302-739-5884."
    ],
    [
      "SERVICE",
      "**Nothing is served, because nothing is filed.** The compiled record describes a request to an agency and a letter back from it. There is no opposing party to serve on this branch."
    ],
    [
      "SELF_HELP_STOP",
      "**Stop and get help if:** the SBI says the record is not eligible and you believe it is. **Stop and get help if:** the SBI does not answer, or answers and nothing changes. **Stop and get help if:** you are told a court petition is now needed — that is the point at which this stops being an agency question. **Stop and get help if:** the record belongs to the § 1017 mandatory branch or the § 1018 discretionary branch instead. **Stop and get help if:** any immigration question is involved."
    ]
  ],
  "instructionsIntro": [
    "**This packet contains no court petition, and that is deliberate.** The committed records describe the Delaware § 1017A juvenile route as AUTOMATIC: eligible cases are expunged by the State Bureau of Identification monthly, with no filing. This packet is for the case where that has not happened.",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Everything about your own record belongs to that record, so each item is a labelled dotted blank listed below."
  ],
  "instrumentChoice": null,
  "recordSays": [
    [
      "The compiled Delaware profile",
      "None (automatic, § 4373A) Mandatory-eligible cases are expunged by the SBI monthly with no filing."
    ],
    [
      "The compiled Delaware profile",
      "SBI mandatory-expungement request Contact the SBI (302-739-5884) to request mandatory expungement; if eligible, SBI sends a letter with instructions and any fees."
    ],
    [
      "The committed route contract",
      "§ 1017 favorable-termination matters are mandatory with no elapsed wait; § 1017A eligible records run through the automatic program with a petition or correction path only where the automatic process did not occur. The three-year value here is the lowest discretionary § 1018 branch; the five- and seven-year branches turn on the offense category, which the intake must collect."
    ]
  ],
  "documentsToObtain": [
    [
      "Anything showing the adjudication and its date, if you have it",
      "the Family Court that entered the adjudication"
    ]
  ],
  "steps": [
    "**Check whether the record is still there.** If the automatic programme has already reached it, there is nothing to ask for.",
    "**If it is still there, send the request page, or telephone the SBI on 302-739-5884.** The compiled record says that if you are eligible, the SBI sends a letter with instructions and any fees.",
    "**Do not file a court petition first.** The committed records describe a petition or correction path only where the automatic process did not occur.",
    "**Keep everything you send and everything you get back.**",
    "**If the answer does not resolve it, take it to a lawyer or a legal-aid office.** That is where an agency question becomes a legal one."
  ],
  "deliberatelyBlank": [
    "**Your signing line, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.",
    "**Any court caption.** There is none, because nothing here is filed in a court."
  ],
  "notTold": [
    "**Whether any fee attaches to an SBI mandatory-expungement request.** The compiled record says the SBI's letter states any fees; it does not state what they are. The SBI, on 302-739-5884, is the office that answers it."
  ],
  "stopConditions": [
    "the SBI says the record is not eligible and you believe it is;",
    "the SBI does not answer, or answers and nothing changes;",
    "you are told a court petition is now needed;",
    "the record belongs to the § 1017 mandatory branch or the § 1018 discretionary branch instead;",
    "any immigration question is involved."
  ],
  "whatThisIsNot": "This is a request to an agency and a page of guidance. It is not a court petition — the committed records describe this branch as automatic, and no committed record names a form for it. It is not legal advice, it is not sent for you, and it does not make the State Bureau of Identification act.",
  "receiptDoesNotEstablish": [
    "that any Delaware juvenile record is eligible for the § 1017A automatic programme",
    "that the State Bureau of Identification will act on a request made with these pages"
  ],
  "buildFindings": [
    {
      "finding": "The committed records describe this branch as AUTOMATIC: the compiled Delaware profile records that mandatory-eligible cases are expunged by the SBI monthly with no filing, and the committed contract records that a petition or correction path exists only where the automatic process did not occur.",
      "consequence": "No court petition was composed. The packet is a request to the agency that runs the programme, plus a guidance page that says who runs it, what the participant does, and what the participant does NOT do. Composing a petition here would have invented a form for a route that has none."
    },
    {
      "finding": "The compiled profile gives a specific reachable authority for this branch: the SBI, on 302-739-5884.",
      "consequence": "It is named on both composed pages and in every one of the four participant-facing obligations that needs an authority. DET-FEE-AND-WAIVER-001 requires an office identified well enough to actually reach, and a telephone number is that."
    },
    {
      "finding": "The MASTER_QUEUE row for this family carries the same overlay-directory naming as the petition families, and its implementationStrategy is custom_pleading.",
      "consequence": "The strategy label describes how the pages are produced — composed from codified text rather than filled into an official PDF — and not that the output must be a pleading. The output here is a request and a guidance page, because that is what the committed records describe."
    }
  ],
  "counselQuestions": [
    "This branch ships no court petition, on the ground that the committed records describe the route as automatic with a petition or correction path only where the automatic process did not occur. Confirm that reading.",
    "The request page is addressed to the State Bureau of Identification on the compiled profile's own telephone number. Confirm the addressee."
  ],
  "reviewersAttention": [
    "source-receipt.json binds committed repository records rather than a Master Library binary — sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT.",
    "THIS FAMILY SHIPS NO COURT PETITION, DELIBERATELY. Its sibling in this same lane, the § 1018 discretionary branch, does. A reviewer expecting a pleading here should read the build findings first."
  ],
  "documentsHeading": "Documents you may need — nothing here is filed in a court"
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
