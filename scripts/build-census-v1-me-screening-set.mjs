#!/usr/bin/env node
/**
 * The Maine business-screening-service dispute packet family builder.
 *
 *   node scripts/build-census-v1-me-screening-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one supporting action:
 *
 *   me-screening   Business Screening Service Dispute for Correction or
 *                  Deletion of Criminal History Record Information,
 *                  10 M.R.S. c. 239, § 1500-CC
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/ME.memo.json, track me-screening,
 * reviewedAsOf 2026-08-03) records that no official form exists and none
 * could: the § 1500-CC duty runs against a PRIVATE COMPANY, not an agency or
 * a court. The primary component is therefore a controlled dispute LETTER —
 * correspondence to a private company, never characterised as a court
 * pleading — whose contents, destination and requested relief the statute
 * itself fixes: investigation without charge, correction of a record that
 * does not accurately reflect the official State Bureau of Identification
 * record, and PROMPT DELETION where the disputed record is found to be
 * sealed or the subject of a pardon (§ 1500-CC(2)), with the thirty-day
 * results notice of § 1500-CC(4).
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every dispute fact — the vendor, its dispute address,
 * the report, the record as the vendor printed it, the sealing order or
 * pardon — lives on documents the platform has not seen, so each is a
 * labelled dotted blank declared REQUIRED_BEFORE_FILING (here,
 * before sending) and disclosed in participant-instructions.md. The letter
 * demands no § 1500-EE(3) statutory penalty, no damages, no costs or
 * attorney's fees, threatens no litigation and asserts no FCRA claim — all
 * expressly outside self-help per the legal-design record.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
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

const FAMILY_ID = "me-screening-set";
const OUT = "data/rcap-all50/overlays/census-v1/me/me-screening-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-me-screening-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "ME",
  routeKeys: ["obligation:track-only:ME:me-screening"],
  primaryRouteKey: "obligation:track-only:ME:me-screening",
  routeSelectionId: "me-screening-composed-set",
  legalName: "Business Screening Service Dispute for Correction or Deletion of Criminal History Record Information (10 M.R.S. c. 239, § 1500-CC)",
  routeName: "getting a sealed or pardoned Maine record corrected or deleted from a private background-check company's database under 10 M.R.S. § 1500-CC",
  statute: "10 M.R.S. § 1500-CC"
});

const COMPONENTS = ["primary_filing", "attachment", "instructions"];

const COMPOSED_TITLES = {
  primary_filing: "Dispute Letter to a Business Screening Service Under 10 M.R.S. Sec. 1500-CC",
  attachment: "Enclosure Checklist",
  instructions: "Participant Instructions"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/ME.memo.json, track me-screening, "
  + "reviewedAsOf 2026-08-03) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, me-screening-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Birch Street, Portland, ME 04101",
    "participant.phone": "207-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Presque Isle, Maine 04769-2214",
    "participant.phone": "(207) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "primary_filing") {
    L.push("THIS IS A LETTER TO A PRIVATE COMPANY. It is not a court pleading, it is not filed anywhere, and no court is involved at this stage.", "");
    L.push(`From: ${name}`);
    L.push(`Reply address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("To (the screening company, at the dispute address it publishes - usually on the report itself or on the company's website; if you cannot find it, get it from the report or the website before sending, and do not guess):");
    L.push("Company: " + DOTS(64));
    L.push("Dispute mailing address published by the screening company:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("RE: DISPUTE OF CRIMINAL HISTORY RECORD INFORMATION UNDER 10 M.R.S. Sec. 1500-CC", "");
    L.push(`1. I, ${name}, date of birth ${dob}, dispute the completeness and accuracy of criminal history record information about me that your company reported. I am the subject of the record.`, "");
    L.push("2. The report and the record. Your company reported the record in a background-check report, identified as follows (copied from the report itself; nothing on these lines is written for me):", "");
    L.push("Date of the background-check report the record appeared on:");
    L.push(DOTS(), "");
    L.push("Reference, file or confirmation number printed on the report, if any:");
    L.push(DOTS(), "");
    L.push("The record exactly as your company reported it - the charge, the court, the case number and the disposition as printed on the report:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. The correct status. The record does not accurately reflect the official record maintained by the Maine State Bureau of Identification, in that (write the true status, from your order or pardon):", "");
    L.push("The correct status of the record - sealed by court order, or the subject of a pardon, as the enclosed document states:");
    L.push(DOTS(), "");
    L.push("Date of the sealing order or of the pardon:");
    L.push(DOTS(), "");
    L.push("Court that signed the sealing order, or the authority that granted the pardon:");
    L.push(DOTS(), "");
    L.push("Anything else about the entry that is wrong - wrong person, wrong charge, wrong outcome, wrong date - as shown by the enclosed official record, if any:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. What 10 M.R.S. Sec. 1500-CC requires of you. You must investigate this dispute WITHOUT CHARGE; you must review and consider all relevant information I submit and determine whether your record accurately reflects the official record maintained by the State Bureau of Identification (Sec. 1500-CC(1)); you must correct a record that does not accurately reflect the official record; and if the disputed record is found to be sealed or the subject of a pardon, you SHALL PROMPTLY DELETE the record (Sec. 1500-CC(2)). Within thirty days of receiving notice of this dispute you must notify me of the results of your investigation, including whether it was completed or terminated and what records were corrected or deleted (Sec. 1500-CC(4)).", "");
    L.push("5. Enclosures. Copies of the documents listed on the enclosure checklist accompany this letter. They are copies; I keep the originals.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(52), "");
    L.push("(You sign and date this letter yourself, when you actually send it. Nothing on this page is signed or dated for you.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "attachment") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Enclose COPIES with the dispute letter. Keep every original. This packet never receives, inspects or authenticates any of these documents.", "");
    L.push("ENCLOSURE ONE - THE DOCUMENT THE WHOLE LETTER TURNS ON. A copy of the court's written sealing order, or of the pardon. Obtained from the office of the court that signed the sealing order, or from the Department of Corrections and the Governor's office for a pardon. Sec. 1500-CC(2) makes prompt deletion mandatory where the disputed record is found to be sealed or the subject of a pardon, so this document must be in hand before the letter is sent.", "");
    L.push("ENCLOSURE TWO - THE STATUTORY BENCHMARK, STRONGLY ADVISED. A copy of your own official Maine criminal history record from the Maine State Police, State Bureau of Identification. Sec. 1500-CC(1) directs the screening service to compare its record against the official record maintained by the Bureau, so the Bureau record is the benchmark the statute names. It is effectively necessary wherever the vendor's entry is wrong on facts other than sealing status, and enclosing it also protects against a frivolousness determination under Sec. 1500-CC(3), which lets a service terminate an investigation where the subject fails to provide sufficient information.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHAT THIS ROUTE IS, AND IS NOT. 10 M.R.S. c. 239 binds BUSINESS SCREENING SERVICES only - private companies regularly in the business of collecting, assembling, evaluating or disseminating Maine criminal history record information about specific individuals for a fee (Sec. 1500-AA), excluding government entities and the news media. It does not reach the State Bureau of Identification record, the court record, or any criminal justice agency. If the entity that reported your record is arguably not a business screening service, stop and get advice before sending.", "");
    L.push("WHAT YOU DO, IN ORDER.");
    L.push("STEP ONE. Identify the company and confirm it fits the Sec. 1500-AA definition.");
    L.push("STEP TWO. Find the company's published dispute address - usually on the report itself or on the company's website.");
    L.push("STEP THREE. Obtain the sealing order or pardon copy, and your Bureau record where advisable, per the enclosure checklist.");
    L.push("STEP FOUR. Fill in every dotted blank on the letter from the report and the enclosed documents, sign and date it, and send it WITH copies of the enclosures, in a way that lets you evidence receipt - the thirty-day clock runs from the company's RECEIPT of the dispute.");
    L.push("STEP FIVE. Calendar thirty days from the date the company received the letter.");
    L.push("STEP SIX. Read the response. Three outcomes are possible: correction; deletion (mandatory and prompt where the record is found sealed or pardoned); or a determination that the dispute is frivolous, which the company may make only with specific reasons stated and a description of the information it needs (Sec. 1500-CC(3)).", "");
    L.push("MONEY. The investigation is WITHOUT CHARGE - Sec. 1500-CC requires it. You may pay a Bureau fee for your own criminal history record and a court-office copy fee for the sealing order; neither is a fee for this dispute.", "");
    L.push("A COMPLIANT REPORT'S OWN NOTICE. A service disseminating records collected on or after 1 July 2010 must include the collection date and a notice that the information may include records that have since been sealed or become inaccessible (Sec. 1500-DD).", "");
    L.push("NO TIMELINE PROMISES. Chapter 239 took effect on 29 July 2026 and has no practice history. This packet does not promise deletion timelines beyond what the statute says.", "");
    L.push("WHEN TO STOP AND GET A LAWYER INSTEAD.");
    L.push("- The company does not respond within thirty days of receiving the dispute.");
    L.push("- The company declares the dispute frivolous and you disagree.");
    L.push("- You want to pursue the statutory remedy - $1,000 or actual damages, costs and fees under Sec. 1500-EE(3). That is litigation, it is outside self-help, and this packet neither pleads nor threatens it.");
    L.push("- The dispute involves a national vendor and a federal Fair Credit Reporting Act claim may be stronger or may overlap - that comparison is a lawyer's analysis.");
    L.push("- The record was never sealed and you are disputing accuracy in a way that requires establishing what the true record is.");
    L.push("- The entity is arguably not a business screening service within Sec. 1500-AA, or is a government entity or the news media.");
  }
  L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));

  if (componentId === "primary_filing") {
    w("subject_name", "Person disputing the record, named at the head of the letter", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the person disputing the record", "participant.date_of_birth");
    w("reply_address", "Reply mailing address at the head of the letter", "participant.street_address");
    w("telephone", "Telephone number at the head of the letter", "participant.phone");
    w("email", "Email address at the head of the letter", "participant.email");
    rbf("vendor_name", "Screening company the letter is addressed to",
      "the name of the background-check company that reported the record, from the report itself",
      "which company reported the record is a fact on a report the platform has not seen");
    rbf("vendor_dispute_address", "Dispute mailing address published by the screening company",
      "the dispute address the company publishes - usually on the report itself or on the company's website; never guessed",
      "the address is published by the vendor and varies, and the platform holds no address for it");
    rbf("report_date", "Date of the background-check report the record appeared on",
      "the report date, copied from the report",
      "no report fact is held for a document the platform has not seen");
    rbf("report_reference", "Reference, file or confirmation number printed on the report, if any",
      "the reference number, copied from the report if it shows one - it speeds the company's lookup",
      "no report identifier is held for a document the platform has not seen");
    rbf("record_as_reported", "The record exactly as the company reported it, with the charge, the case number and the disposition as printed",
      "the entry exactly as printed on the report - the charge, the court, the case number and the disposition",
      "the vendor's own printing is the thing disputed, and the platform has not seen it");
    rbf("correct_status", "The correct status of the record - sealed by court order, or the subject of a pardon, as the enclosed document states",
      "whether the record is sealed by a Maine court order or is the subject of a pardon, exactly as your enclosed order or pardon states",
      "the true status lives on the sealing order or pardon, which the participant obtains and the platform never inspects");
    rbf("order_date", "Date of the sealing order or of the pardon",
      "the date the court signed the sealing order, or the date the pardon was granted, from the document itself",
      "no order fact is held for a document the platform has not seen");
    rbf("order_authority", "Court that signed the sealing order, or the authority that granted the pardon",
      "the court that signed the sealing order (or the pardoning authority), copied from the document",
      "which court signed the order is a fact on a document the platform has not seen");
    rbf("other_inaccuracy", "Anything else about the entry that is wrong, as shown by the enclosed official record, if any",
      "any other error - wrong person, wrong charge, wrong outcome, wrong date - as shown by your official Bureau record, or left empty where there is none",
      "accuracy against the official record is measured by the Bureau record the participant obtains, which the platform has not seen");
    prot("signature", "Signature on the dispute letter", "the letter is the participant's own communication to a private company and is signed when actually sent");
    prot("signature_date", "Date beside the signature on the letter", "a date written before the letter is actually sent would be false");
  } else if (componentId === "attachment") {
    w("participant_name", "Person the enclosure checklist is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/ME.memo.json", track: "me-screening", reviewedAsOf: "2026-08-03" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "me-screening-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Public Law 2025, c. 513, § 1 — enacting 10 M.R.S. c. 239, §§ 1500-AA to 1500-EE", url: "https://legislature.maine.gov/legis/bills/getPDF.asp?paper=SP0741&item=3&snum=132", retrievedOn: "2026-08-03" },
    { title: "Maine Criminal History Record and Juvenile Crime Information Request — Maine State Police, State Bureau of Identification", url: "https://www.maine.gov/dps/msp/investigations/state-bureau-identification", retrievedOn: "2026-08-03" }
  ],
  formIdentityNote:
    "No official form exists for a § 1500-CC dispute and none could: the duty runs against a private business "
    + "screening service, not an agency or a court. The primary component is a controlled dispute LETTER — "
    + "correspondence to a private company, described that way in terms on its own face, and never characterised "
    + "as a court pleading. The MASTER_QUEUE row agrees: officialFormFamily NONE, implementationStrategy "
    + "custom_pleading, forms [], boundCount 0. The Revisor has not yet published 10 M.R.S. c. 239 in the online "
    + "codified statutes; the controlling text is the chaptered law PDF of PL 2025, c. 513, and every § 1500 "
    + "citation is re-verified against the codified text once published.",
  whatThisReceiptDoesNotEstablish: [
    "that the codified text of 10 M.R.S. c. 239, once the Revisor publishes it, matches the chaptered law the intake record read",
    "that any output is approved for participant delivery",
    "that any particular entity is a business screening service within § 1500-AA",
    "any deletion timeline beyond the statute's own thirty-day results notice"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the letter's own face: a § 1500-CC dispute to a business screening service. No "
    + "election control is rendered. The sealed-versus-pardoned status is not a route election — it is the "
    + "participant's case fact, copied from the order or pardon they enclose — and the letter demands only the "
    + "statutory remedies (correction, or prompt deletion where sealed or pardoned), never the § 1500-EE(3) "
    + "penalty, damages, costs, fees or any FCRA claim, which the legal-design record places outside self-help."
};

const INSTRUCTIONS = {
  title: `What you must do before you send — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "This is **correspondence to a private company, not a court filing**. No official form exists for it and none could: the § 1500-CC duty runs against the business screening service itself. Nothing is filed with any court.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your reply address, your telephone number and your email. Every dispute fact lives on the vendor's report, your sealing order or pardon, or your official Bureau record — documents the platform has not seen — so every one of them is a labelled dotted blank listed below, and you fill it from the document itself, never from memory.",
    "",
    "The letter asks for exactly what the statute commands: investigation without charge, correction of an inaccurate record, and **prompt deletion where the record is found to be sealed or the subject of a pardon** (§ 1500-CC(2)). It demands no money and threatens nothing — the § 1500-EE(3) statutory remedy is litigation and is outside this packet."
  ],
  componentBlurbs: {
    primary_filing: "the participant-signed dispute letter under § 1500-CC — a letter to a private company, and the packet says so in terms",
    attachment: "the enclosure checklist — the sealing order or pardon copy the deletion remedy turns on, and the Bureau record the statute names as the comparison benchmark",
    instructions: "how to identify the vendor, how to send so receipt can be evidenced, the thirty-day clock, the three possible outcomes, and where self-help ends"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Copy of the court's written sealing order, or of the pardon — § 1500-CC(2) makes prompt deletion mandatory where the record is found sealed or pardoned, so this is the document the whole letter turns on; enclose a copy, never the original | office of the court that signed the sealing order; or the Department of Corrections and the Governor's office for a pardon |",
    "| Copy of your official Maine criminal history record — the § 1500-CC(1) comparison benchmark; effectively necessary where the entry is wrong on facts other than sealing status | Maine State Police, State Bureau of Identification |"
  ],
  stepsLines: [
    "1. **Identify the company** and confirm it fits the § 1500-AA definition — a person regularly in the business of collecting, assembling, evaluating or disseminating Maine criminal history record information for a fee, excluding government entities and the news media.",
    "2. **Find the published dispute address** — usually on the report itself or the company's website. Do not guess it.",
    "3. **Obtain the enclosures** the checklist names.",
    "4. **Fill in every dotted blank** from the report and the enclosed documents, sign and date the letter yourself, and **send it so receipt can be evidenced** — the thirty-day clock runs from the company's receipt.",
    "5. **Calendar thirty days** from receipt.",
    "6. **Read the response against the statute**: correction, deletion, or a frivolousness determination that must state specific reasons and describe the information the company needs (§ 1500-CC(3))."
  ],
  blanksLines: [
    "- **Your signature and the date beside it.** The letter is your own communication, signed when you actually send it.",
    "- **The vendor's dispute address, where you cannot locate it.** It is published by the vendor; get it from the report or the website rather than guessing.",
    "- **Any demand for the statutory penalty, damages, costs or fees.** Deliberately absent from the whole packet — that is litigation and outside self-help."
  ],
  stopsLines: [
    "- the company does not respond within thirty days of receiving the dispute;",
    "- the company declares the dispute frivolous and you disagree;",
    "- you want to pursue the $1,000-or-actual-damages remedy under § 1500-EE(3);",
    "- a federal Fair Credit Reporting Act claim may be stronger or may overlap — a lawyer's comparison;",
    "- the record was never sealed and the dispute requires establishing what the true record is;",
    "- the entity is arguably not a business screening service under § 1500-AA, or is a government entity or the news media."
  ],
  notLines: [
    "This is a prepared dispute letter and its process pages. It is not a court pleading, it is not legal advice, it is not sent for you, and it does not reach the State Bureau of Identification record, the court record, or any criminal justice agency — chapter 239 binds business screening services only. It promises no deletion timeline beyond the statute's own thirty-day results notice."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the legal-design record resolves the strategy to "
      + "custom_pleading because a § 1500-CC dispute is a written demand whose contents, destination and relief "
      + "the statute fixes, running against a private company for which no official form exists or could exist.",
    consequence:
      "The primary component is a controlled letter that states on its own face that it is correspondence to a "
      + "private company and not a court pleading. No form was substituted and none was invented."
  },
  {
    finding:
      "The legal-design record places the § 1500-EE(3) statutory remedy ($1,000 or actual damages, costs and "
      + "attorney's fees), any litigation threat, and any FCRA claim outside self-help.",
    consequence:
      "The letter demands only the statutory investigation, correction and deletion remedies, and the "
      + "penalty/damages demand is recorded as deliberately absent from the packet in the instructions and the "
      + "blanks report. Vendor non-response, a disputed frivolousness determination, any damages interest and any "
      + "FCRA question are printed stop conditions."
  },
  {
    finding:
      "Whether a subject must first obtain the official Bureau record before the service is obliged to "
      + "investigate is recorded as unresolved: § 1500-CC(1) suggests not, but the § 1500-CC(3) frivolousness "
      + "provision cuts the other way.",
    consequence:
      "The packet fails closed exactly as the record directs: the Bureau record is named as the statutory "
      + "benchmark on the enclosure checklist, advised in every case, and marked effectively necessary wherever "
      + "the dispute is about accuracy rather than sealing status."
  },
  {
    finding:
      "Chapter 239 took effect on 29 July 2026, days before the intake normalization; there is no practice "
      + "history, no implementing guidance located, and the Revisor has not yet published the codified text — the "
      + "controlling text is the chaptered law PDF of PL 2025, c. 513.",
    consequence:
      "The packet promises no deletion timeline beyond the statute's own thirty-day notice, and the "
      + "recodification check travels to counsel in approval-request.json."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Re-verify every § 1500 citation against the codified 10 M.R.S. c. 239 once the Revisor publishes it — the intake record read the chaptered law PDF of PL 2025, c. 513.",
    "Whether a participant must first obtain the official SBI record before the service is obliged to investigate is unresolved (§ 1500-CC(1) versus the § 1500-CC(3) frivolousness provision). The packet advises enclosing it; confirm that fail-closed posture.",
    "Confirm the letter's statement of the § 1500-CC duties (without-charge investigation, correction, prompt deletion where sealed or pardoned, thirty-day results notice) is complete and correctly bounded for a layperson's signature.",
    "This supporting action is built as a post-relief step, not a standalone entry point, per the record. Confirm that framing survives into any consumer surface."
  ],
  mattersForTheReviewersAttention: [
    "The letter never demands the statutory penalty, damages, costs, fees, or pleads FCRA — deliberate, per the record's scope restrictions.",
    "The thirty-day clock runs from the vendor's RECEIPT; the instructions require an evidenced delivery method for exactly that reason.",
    "Every dispute fact is required-before-sending; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the letter."
  ]
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — shared census-v1 zero-bound-source composed-pleading machinery.
 *
 * This section is deliberately identical across the FABLE-B9 family builders
 * (each script stays self-contained because every family's MASTER_QUEUE row is
 * exclusiveScript with no shared build host). The family-specific facts live
 * entirely above this line. The machinery follows the proven working pattern
 * of scripts/build-census-v1-va_exp_identity_used_by_another-set.mjs, minus
 * the bound-source resolution and face reading, because this family's
 * MASTER_QUEUE row binds ZERO sources (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundCount 0): there are no source
 * bytes to verify, and the grounding records are the legal-design intake
 * track and the packet-set manifest named in the spec above.
 * ════════════════════════════════════════════════════════════════════════════ */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- field-map row helpers (maps-with-canonical-and-boundary shape) --------- */
function mapBase(componentId, id, label) {
  return {
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  };
}
function mapWrite(componentId, id, label, factId) {
  return { ...mapBase(componentId, id, label), factId, kind: "composed_text", document: componentId };
}
function mapProtected(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapCourtOwned(componentId, id, label, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  };
}
function mapRbf(componentId, id, label, what, why) {
  return {
    ...mapBase(componentId, id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  };
}
function composedMapShell(componentId, writes, refusals) {
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- deterministic PDF rendering ------------------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
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

/* ---- byte proof of the composed writes -------------------------------------- *
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

/* ---- the builder's own count of the nine counters ---------------------------- */
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

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the document you are using, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const maps = COMPONENTS.map((c) => composedMap(c));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 0, components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
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
      documents, components: COMPONENTS
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
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound: the MASTER_QUEUE row for this family binds zero sources (sourceStatus "
      + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundCount 0, officialFormFamily NONE, forms []). Every composed "
      + "page is grounded on the committed legal-design records named in groundingRecords, and nothing else.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    allSourcesExactNote:
      "true vacuously: this family binds zero source binaries, so there is no source that is not bound by exact "
      + "SHA-256. No official form exists for this route per the legal-design record, and none was invented.",
    documents: [],
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundSources: [],
    boundSourcesNote: "this family binds zero source binaries; every page is composed by this build",
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent.",
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
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
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
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: 0,
    components: COMPONENTS,
    documents: COMPONENTS,
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
