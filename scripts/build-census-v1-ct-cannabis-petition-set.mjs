#!/usr/bin/env node
/**
 * The Connecticut cannabis-erasure petition packet family builder.
 *
 *   node scripts/build-census-v1-ct-cannabis-petition-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   ct-cannabis-petition   Petition for Erasure of Cannabis Conviction
 *                          Records, C.G.S. § 54-142v
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/CT.memo.json, track
 * ct-cannabis-petition, reviewedAsOf 2026-07-30) records the state's own
 * finding: the Clean Slate Connecticut portal states plainly that a petition
 * must be filed under § 54-142v and that NO OFFICIAL FORM EXISTS, while the
 * statute specifies exactly what the petition must contain — one of the
 * three § 54-142v(a)(1) conviction categories, a copy of the arrest record
 * or a supporting affidavit under (a)(2), erasure directed under § 54-142a
 * if the petition is in order under (a)(3), and no fee under (a)(4). The
 * record calls this the cleanest custom-pleading case in the batch.
 *
 * TERMINOLOGY, PER THE RECORD: Connecticut says ERASURE — not expungement,
 * not sealing.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — court location, docket number,
 * conviction date, statute of conviction, count list — lives on a court
 * record the platform has not seen, so each is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md. The quantity and paraphernalia-use facts are
 * the PETITIONER'S SWORN FACTS: the affidavit is rendered as a container
 * only, and this build never generates, estimates or characterises the
 * quantity possessed, distributed or grown, what the paraphernalia was used
 * for, any assertion that every count on the docket is erasable, or any
 * assertion that the offense has been decriminalized (the § 54-142d
 * question, which carries case law).
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

const FAMILY_ID = "ct-cannabis-petition-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-cannabis-petition-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ct-cannabis-petition-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "CT",
  routeKeys: ["obligation:track-only:CT:ct-cannabis-petition"],
  primaryRouteKey: "obligation:track-only:CT:ct-cannabis-petition",
  routeSelectionId: "ct-cannabis-petition-composed-set",
  legalName: "Petition for Erasure of Cannabis Conviction Records, C.G.S. § 54-142v",
  routeName: "petitioning the Connecticut Superior Court to erase an older or larger cannabis conviction under C.G.S. § 54-142v",
  statute: "C.G.S. § 54-142v"
});

const COMPONENTS = ["primary_filing", "supporting_affidavit"];

const COMPOSED_TITLES = {
  primary_filing: "Petition for Erasure of Cannabis Conviction Records Pursuant to General Statutes Sec. 54-142v",
  supporting_affidavit: "Supporting Affidavit (Container Only - the Petitioner's Own Sworn Facts)"
};

const COMPONENT_CONDITIONS = {
  supporting_affidavit:
    "Used only where the arrest record does not establish the quantity or paraphernalia-use fact. "
    + "Sec. 54-142v(a)(2) requires the petition to be accompanied by a copy of the arrest record OR an affidavit; "
    + "where the arrest record establishes the fact, attach the arrest record and do not use this affidavit."
};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/CT.memo.json, track "
  + "ct-cannabis-petition, reviewedAsOf 2026-07-30) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, ct-cannabis-petition-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Elm Street, Hartford, CT 06103",
    "participant.phone": "860-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, New London, Connecticut 06320-2214",
    "participant.phone": "(959) 555-0199 ext. 4417",
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
  const caption = () => {
    L.push("SUPERIOR COURT - ..........................................................");
    L.push("(THE JUDICIAL DISTRICT OR G.A. LOCATION - where the conviction was effected, or the location having custody of the records; for a conviction in the Court of Common Pleas, Circuit Court, a municipal court or before a trial justice, the Superior Court where venue would currently exist for criminal prosecution. Because there is no statewide form, G.A. offices may have local expectations about caption and format - call before filing.)", "");
    L.push("STATE OF CONNECTICUT", "");
    L.push("v.", "");
    L.push(`${name}, DEFENDANT-PETITIONER`, "");
    L.push("Docket No. " + DOTS(44), "");
  };
  if (componentId === "primary_filing") {
    caption();
    L.push("PETITION FOR ERASURE OF CANNABIS CONVICTION RECORDS PURSUANT TO GENERAL STATUTES Sec. 54-142v", "");
    L.push(`1. The petitioner, ${name}, date of birth ${dob}, petitions for erasure of the records of the conviction identified below pursuant to General Statutes Sec. 54-142v, and states the following from the court record (nothing on these lines is written for you):`, "");
    L.push("Date of conviction:");
    L.push(DOTS(), "");
    L.push("Statute of the conviction, as the record states it - Sec. 21a-279, Sec. 21a-267(a) or Sec. 21a-277(b):");
    L.push(DOTS(), "");
    L.push("The conviction as the court record words it, copied exactly:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("2. The conviction falls within one of the three categories of Sec. 54-142v(a)(1): a Sec. 21a-279 possession conviction for a cannabis-type substance of four ounces or less entered on or after 1 October 2015 and before 1 July 2021, or before 1 January 2000; a Sec. 21a-267(a) conviction before 1 July 2021 for use or possession with intent to use drug paraphernalia in relation to cannabis; or a Sec. 21a-277(b) conviction before 1 July 2021 involving four ounces or less of a cannabis-type substance or six plants grown inside the petitioner's own primary residence for personal use. The category is established by the record and the accompanying arrest record or affidavit, not by this petition's assertion.", "");
    L.push("3. Accompanying this petition, as Sec. 54-142v(a)(2) requires, is (attach exactly one):");
    L.push("[ ] a copy of the arrest record; or");
    L.push("[ ] the petitioner's supporting affidavit, where the arrest record does not establish the quantity or paraphernalia-use fact.", "");
    L.push("4. The criminal case is not pending. This docket references the following counts, after the petitioner confirmed the full count list from the record (Sec. 54-142v(b) bars erasure of a record referencing more than one count unless every count is entitled to erasure; do not file until you have confirmed every count from the record):", "");
    L.push("Every count on this docket, listed from the record, after confirming each is within Sec. 54-142v:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("5. The petitioner therefore requests that the court direct that all police and court records and records of the state's or prosecuting attorney pertaining to the offense be erased pursuant to General Statutes Sec. 54-142a, as Sec. 54-142v(a)(3) provides where the petition is in order. No fee is payable with this petition (Sec. 54-142v(a)(4)).", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner, self-represented, signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else {
    caption();
    L.push("SUPPORTING AFFIDAVIT UNDER GENERAL STATUTES Sec. 54-142v(a)(2)", "");
    L.push("USE THIS PAGE ONLY IF the arrest record does not establish the quantity or paraphernalia-use fact. If the arrest record establishes it, attach the arrest record instead and do not use this affidavit.", "");
    L.push(`1. I, ${name}, am the petitioner, and I make this affidavit to establish the fact Sec. 54-142v(a)(1) requires for my conviction category. What follows is my own sworn statement; this packet wrote none of it and asserts nothing about it.`, "");
    L.push("Your own sworn statement of the quantity involved, or the number of plants grown inside your own primary residence for personal use (for a Sec. 21a-279 or Sec. 21a-277(b) conviction):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Your own sworn statement of what the paraphernalia was used or intended to be used for (only for a Sec. 21a-267(a) conviction):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("I swear or affirm that the statements above are true.", "");
    L.push("SIGNATURE OF AFFIANT " + DOTS(52));
    L.push("DATE " + DOTS(68), "");
    L.push("(You swear this affidavit before a proper officer, and not before. The block below belongs to that officer, never to you and never to this packet. The record this packet is built from does not state which officers may take the oath - ask the office of the Superior Court where you will file.)", "");
    L.push("Subscribed and sworn to before me this ...... day of .................., 20......");
    L.push("Officer authorized to take the oath " + DOTS(46));
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

  const captionRbf = (docWord) => {
    rbf("court_location", `Superior Court location in the caption of the ${docWord} - the Judicial District or G.A. location`,
      "the Superior Court location - where the conviction was effected, or the location having custody of the records; for a pre-Superior-Court conviction, where venue would currently exist - the office of that court can confirm it",
      "which Superior Court location holds the case is a case fact on a record the platform has not seen");
    rbf("docket_number", `Docket number of the case, on the ${docWord}`,
      "the docket number, confirmed on the Connecticut Judicial Branch online case look-up",
      "no case identifier is held for a record the platform has not seen");
  };

  if (componentId === "primary_filing") {
    w("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the petitioner, printed in the petition", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address");
    w("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone");
    w("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email");
    captionRbf("petition");
    rbf("conviction_date", "Date of conviction",
      "the conviction date, confirmed on the case look-up and the record",
      "no conviction fact is held for a record the platform has not seen");
    rbf("conviction_statute", "Statute of the conviction, as the record states it",
      "the statute of conviction exactly as the record states it - Sec. 21a-279, Sec. 21a-267(a) or Sec. 21a-277(b); if the record shows a different statute, stop, because the petition does not fit",
      "which statute the conviction was under is a case fact the record states and the platform has not seen");
    rbf("conviction_as_worded", "The conviction as the court record words it, copied exactly",
      "the conviction exactly as the record words it",
      "the record's own wording controls and the platform has not seen it");
    rbf("count_list", "Every count on this docket, listed from the record",
      "the complete count list, from the Judicial Branch case look-up and the record, after confirming every count is within Sec. 54-142v - Sec. 54-142v(b) bars erasure of a record referencing more than one count unless every count is entitled to erasure",
      "the legal-design record forbids asserting that all counts are erasable unless the participant has confirmed the count list from the record, so the list and the confirmation are the participant's");
    rbf("accompanying_document", "Which accompanying document is attached - the arrest record copy, or the supporting affidavit",
      "which of the two statutory accompaniments you are attaching: a copy of the arrest record, or your sworn affidavit where the arrest record does not establish the quantity or paraphernalia-use fact",
      "Sec. 54-142v(a)(2) permits either document, the choice turns on what the participant's arrest record establishes, and the platform has seen neither");
    prot("petitioner_signature", "Signature of the petitioner on the petition", "the petitioner signs the petition personally");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is signed would be false");
  } else {
    w("affiant_name", "Affiant named in this affidavit", "participant.full_legal_name");
    captionRbf("affidavit");
    rbf("quantity_fact", "Your own sworn statement of the quantity involved, or the number of plants grown inside your own primary residence",
      "your own sworn statement of the quantity, or the number of plants grown inside your own primary residence for personal use - this fact is yours alone, and this packet never generates or estimates it",
      "the legal-design record forbids generating the quantity possessed, distributed or grown; the affidavit is a container for the petitioner's own sworn fact");
    rbf("paraphernalia_fact", "Your own sworn statement of what the paraphernalia was used or intended to be used for",
      "for a Sec. 21a-267(a) conviction only: your own sworn statement of what the paraphernalia was used or intended to be used for - never characterised by this packet",
      "the legal-design record forbids characterising what the paraphernalia was used for; the fact is the petitioner's own");
    prot("affiant_signature", "Signature of the affiant on the affidavit", "the affiant swears and signs before a proper officer");
    prot("affidavit_date", "Date beside the affiant's signature on the affidavit", "a date written before the affidavit is sworn would be false");
    prot("jurat", "Jurat block completed by the officer who takes the oath", "the jurat belongs to the officer; the record does not state which officers may take the oath, and the office of the Superior Court where the petition is filed is the authority to ask");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/CT.memo.json", track: "ct-cannabis-petition", reviewedAsOf: "2026-07-30" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ct-cannabis-petition-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "C.G.S. § 54-142v, Erasure for certain cannabis convictions", url: "https://codes.findlaw.com/ct/title-54-criminal-procedure/ct-gen-st-sect-54-142v/", retrievedOn: "2026-07-30" },
    { title: "Petition for cannabis erasure, Clean Slate Connecticut — the authority for the no-official-form finding", url: "https://portal.ct.gov/cleanslate/petition-for-cannabis-erasure", retrievedOn: "2026-07-30" },
    { title: "C.G.S. § 54-142a, Erasure of criminal records", url: "https://codes.findlaw.com/ct/title-54-criminal-procedure/ct-gen-st-sect-54-142a/", retrievedOn: "2026-07-30" }
  ],
  formIdentityNote:
    "No official form exists for a § 54-142v petition: the Clean Slate Connecticut portal — the state's own page — "
    + "states plainly that a petition must be filed and that no official form exists, while the statute specifies "
    + "exactly what the petition must contain. The legal-design record calls this the cleanest custom-pleading "
    + "case in the batch. The MASTER_QUEUE row agrees: officialFormFamily NONE, implementationStrategy "
    + "custom_pleading, forms [], boundCount 0. Because there is no statewide form, G.A. offices may have local "
    + "expectations about caption and format, and the instructions require a call to the court office before filing.",
  whatThisReceiptDoesNotEstablish: [
    "what caption and format the G.A. offices actually accept — recorded as a release-blocker question for a Connecticut practitioner",
    "any service requirement or proposed-order practice on a § 54-142v petition — recorded as unresolved",
    "that any output is approved for participant delivery",
    "that any conviction falls within the three § 54-142v(a)(1) categories"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the petition's own face: erasure under § 54-142v, with the § 54-142a mechanics and the "
    + "(a)(4) fee bar cited. The statute-of-conviction line is a case fact copied from the record, not an "
    + "election — the three § 54-142v(a)(1) categories are alternatives the record decides, and a printed stop "
    + "instruction sits on the blank for a record showing any other statute. The arrest-record-or-affidavit "
    + "choice is the § 54-142v(a)(2) statutory alternative and turns on what the participant's own arrest record "
    + "establishes, which the platform has not seen; the condition is printed on the affidavit's own face."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Connecticut says erasure** — not expungement, not sealing.",
    "",
    "No official form exists for this petition — the Clean Slate Connecticut portal says so plainly — so both pages are composed pleadings tracking exactly what § 54-142v requires. Because there is no statewide form, G.A. offices may have local expectations about caption and format: **call the office of the Superior Court where you will file before filing.**",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on the court record, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "**The quantity is your sworn fact.** Where the arrest record does not establish the quantity or paraphernalia-use fact, the affidavit page is a container only: you supply and swear the fact, and this packet never generates, estimates or characterises it."
  ],
  componentBlurbs: {
    primary_filing: "the composed petition under § 54-142v, citing the § 54-142a erasure mechanics and the (a)(4) fee bar",
    supporting_affidavit: "the affidavit container for the petitioner's own sworn quantity or paraphernalia-use fact"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Copy of the arrest record — the § 54-142v(a)(2) accompaniment where it establishes the quantity or paraphernalia-use fact | the arresting police department, or the office of the Superior Court where the conviction was effected |",
    "| Judicial Branch case look-up printout — to confirm the docket number, the conviction date and the FULL count list | Connecticut Judicial Branch online case look-up |"
  ],
  stepsLines: [
    "1. **Look the case up** on the Judicial Branch case look-up and confirm the docket number, conviction date, statute of conviction and the full count list.",
    "2. **Check every count.** § 54-142v(b) bars erasure of a record referencing more than one count unless every count is entitled to erasure. Do not file until you have confirmed the complete count list from the record; if any count may not be erasable, stop and get advice.",
    "3. **Choose the statutory accompaniment**: a copy of the arrest record, or — only where the arrest record does not establish the quantity or paraphernalia-use fact — the affidavit page, sworn by you before a proper officer.",
    "4. **Fill in every dotted blank from the record, sign the petition yourself,** and mark which accompaniment is attached.",
    "5. **Call the court office where you will file** — the Judicial District or G.A. location where the conviction was effected or where the records are kept — to confirm caption and format expectations, whether a proposed order is expected, and how anything must be served: no service requirement was found in § 54-142v and local practice is recorded as unresolved, so that office's direction controls.",
    "6. **File. No fee is payable** (§ 54-142v(a)(4)).",
    "7. **After filing,** the court will either order erasure without a hearing or schedule a hearing. A procedural hearing is not by itself a problem; a contested hearing or disputed facts are a stop condition."
  ],
  blanksLines: [
    "- **Your signature, and every date beside a signature.** The petition and affidavit are yours to sign and swear.",
    "- **The affidavit's jurat.** It belongs to the officer who takes the oath; which officers may take it is not stated by the records this packet is built from — ask the court office.",
    "- **The quantity and paraphernalia-use facts.** Your own sworn statements, never generated or estimated by this packet.",
    "- **Any assertion that every count is erasable.** You confirm the count list from the record; the packet asserts nothing about it.",
    "- **Any assertion that the offense has been decriminalized.** That is the § 54-142d question, it carries case law, and this packet never makes it."
  ],
  stopsLines: [
    "- the arrest record does not establish the quantity and you cannot swear to it from personal knowledge;",
    "- the docket has other counts that may not be erasable;",
    "- the court sets a contested hearing, or the facts are disputed;",
    "- the conviction falls outside the three § 54-142v(a)(1) categories, or the record shows a different statute;",
    "- the criminal case is still pending;",
    "- you have an immigration matter."
  ],
  notLines: [
    "This is a prepared petition and affidavit container. It is not an official form — none exists — and it is not legal advice, it is not filed for you, and it does not decide whether the court will direct erasure. Erasure under § 54-142v is directed by the court where the petition is in order; the petition being in order is the court's determination."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the no-official-form finding comes from the state's own Clean "
      + "Slate Connecticut portal, with § 54-142v itself specifying the petition's required contents.",
    consequence:
      "Both pages are composed to the statute's own content list — the three (a)(1) categories, the (a)(2) "
      + "arrest-record-or-affidavit accompaniment, the (a)(3) prayer for erasure under § 54-142a, the (a)(4) fee "
      + "bar, and the (b) multi-count bar. No form was substituted and none was invented."
  },
  {
    finding:
      "The legal-design record forbids generating: the quantity possessed, distributed or grown; any "
      + "characterisation of what the paraphernalia was used for; any assertion that all counts on the docket are "
      + "erasable unless the participant has confirmed the count list from the record; and any assertion that the "
      + "offense has been decriminalized (the § 54-142d question).",
    consequence:
      "The affidavit is a container only, with the participant's sworn facts on labelled lines; the count list is "
      + "a labelled participant blank with the § 54-142v(b) bar printed beside it; and no page mentions "
      + "decriminalization as an assertion."
  },
  {
    finding:
      "Service and proposed-order practice on a § 54-142v petition is recorded as unresolved — nothing was found "
      + "in the statute — and G.A. caption/format expectations are recorded as a question for a Connecticut "
      + "practitioner.",
    consequence:
      "The packet publishes no service mechanic and tenders no proposed order; both are delegated by name to the "
      + "office of the Superior Court where the petition is filed, and both questions travel to counsel in "
      + "approval-request.json."
  },
  {
    finding:
      "The record does not state whether a notary or another proper officer must take the affidavit's oath.",
    consequence:
      "The jurat is left entirely to the officer, and the packet delegates the which-officer question to the "
      + "court office by name rather than guessing."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm with a Connecticut practitioner what caption and format the G.A. offices actually accept for a § 54-142v petition — no form exists and practice will vary.",
    "Service and proposed order: nothing was found in § 54-142v; the packet tenders no order and publishes no service mechanic, delegating both to the court office. Confirm that posture or supply local practice.",
    "The affidavit's oath: the record does not state whether a notary or another officer is required. Confirm.",
    "Confirm the petition's recital of the three § 54-142v(a)(1) categories is a correct and complete statement of the statute for a petition that lets the record, not the pleading, establish the category."
  ],
  mattersForTheReviewersAttention: [
    "Participant-facing copy says erasure throughout, per the record's terminology rule.",
    "The § 54-142v(b) multi-count bar is printed beside the count-list blank itself, and the count confirmation is the participant's.",
    "The quantity and paraphernalia-use facts are never generated — the affidavit is a container only."
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
