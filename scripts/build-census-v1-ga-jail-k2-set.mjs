#!/usr/bin/env node
/**
 * The Georgia jail booking-record restriction request packet family builder.
 *
 *   node scripts/build-census-v1-ga-jail-k2-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   ga-jail-k2   Written Request to a County or Municipal Jail or Detention
 *                Center to Restrict Records of an Already-Restricted Offense,
 *                O.C.G.A. § 35-3-37(k)(2)
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/GA.memo.json, track ga-jail-k2,
 * reviewedAsOf 2026-08-02) reclassified the route from process_guidance to
 * custom_pleading: § 35-3-37(k)(2) authorises the participant to submit a
 * WRITTEN REQUEST to the facility, the recipient is identified by statute,
 * the contents and relief are definite, and correspondence rather than a
 * court filing is not a reason to withhold a packet. No official form
 * exists; the route carries localFormOverride, so a facility's own published
 * form governs where one exists.
 *
 * This family is built SELF-CONTAINED. The b6 lane's shared Georgia host was
 * in progress at build time and is not touched or imported.
 *
 * TERMINOLOGY, PER THE RECORD: Georgia says "restrict" and, separately,
 * "seal" — not "expungement" — and neither remedy destroys the record.
 * The packet never tells a participant they may state the record does not
 * exist: § 35-3-37(u) expressly permits a restriction or sealing to be used
 * to disqualify a person from employment or office in the same manner as a
 * first offender discharge under § 42-8-63.1, and does not supersede
 * disclosure required by federal law.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — the facility, the arrest and booking,
 * the restricted offense, the proof of restriction — lives on records the
 * platform has not seen, so each is a labelled dotted blank declared
 * REQUIRED_BEFORE_FILING (here, before sending) and disclosed in
 * participant-instructions.md.
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

const FAMILY_ID = "ga-jail-k2-set";
const OUT = "data/rcap-all50/overlays/census-v1/ga/ga-jail-k2-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ga-jail-k2-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "GA",
  routeKeys: ["obligation:track-only:GA:ga-jail-k2"],
  primaryRouteKey: "obligation:track-only:GA:ga-jail-k2",
  routeSelectionId: "ga-jail-k2-composed-set",
  legalName: "Written Request to a County or Municipal Jail or Detention Center to Restrict Records of an Already-Restricted Offense (O.C.G.A. § 35-3-37(k)(2))",
  routeName: "asking the Georgia jail or detention center that booked you to restrict its own records of an offense that has already been restricted under O.C.G.A. § 35-3-37",
  statute: "O.C.G.A. § 35-3-37(k)(2)"
});

const COMPONENTS = ["primary_filing", "attachment", "process_guidance"];

const COMPOSED_TITLES = {
  primary_filing: "Written Request to Restrict Jail and Detention Center Records Under O.C.G.A. Sec. 35-3-37(k)(2)",
  attachment: "Proof of Restriction Enclosure Page",
  process_guidance: "Process Guidance"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/GA.memo.json, track ga-jail-k2, "
  + "reviewedAsOf 2026-08-02) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, ga-jail-k2-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Peachtree Lane, Macon, GA 31201",
    "participant.phone": "478-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Savannah, Georgia 31401-2214",
    "participant.phone": "(912) 555-0199 ext. 4417",
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
    L.push("THIS IS A WRITTEN REQUEST TO A GOVERNMENT FACILITY. It is not a court filing; no court, prosecutor or court office receives it.", "");
    L.push(`From: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("To (the facility that booked you, at its records-unit intake route - confirm the destination with that facility before sending; intake routes vary and are never guessed):");
    L.push("Facility: " + DOTS(64));
    L.push("County or municipality where the facility is located:");
    L.push(DOTS(), "");
    L.push("Postal destination or records-unit intake route confirmed with the facility:");
    L.push(DOTS(), "");
    L.push("RE: REQUEST TO RESTRICT RECORDS UNDER O.C.G.A. Sec. 35-3-37(k)(2)", "");
    L.push(`1. I, ${name}, was booked at your facility, and criminal history record information for the offense identified below has been RESTRICTED pursuant to O.C.G.A. Sec. 35-3-37. Under Sec. 35-3-37(k)(2), I request that all records for that offense maintained by your facility be restricted. The statute gives the facility 30 days from this request to do so.`, "");
    L.push("2. The booking and the restricted offense (copied from my records; nothing on these lines is written for me):", "");
    L.push("Date of arrest and booking at the facility:");
    L.push(DOTS(), "");
    L.push("Offense whose criminal history record information has already been restricted under O.C.G.A. Sec. 35-3-37, worded as the record states it:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Date the record was restricted, as far as the record shows:");
    L.push(DOTS(), "");
    L.push("Booking number at the facility, if known (the request is effective without it; add it if the facility asks):");
    L.push(DOTS(), "");
    L.push("Case number of the offense in court, if there was one:");
    L.push(DOTS(), "");
    L.push("3. Enclosed is proof that the offense is already restricted - my Georgia criminal history report showing the cycle as restricted, or the court order restricting the record - as the enclosure page describes.", "");
    L.push("4. Please restrict all records for this offense maintained by your facility, including booking records and any booking photograph, within 30 days as O.C.G.A. Sec. 35-3-37(k)(2) provides, and confirm to me in writing at the mailing address above.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(52), "");
    L.push("(You sign and date this request yourself, when you actually send it. Nothing on this page is signed or dated for you.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "attachment") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Prior restriction is the statutory precondition of this request: Sec. 35-3-37(k)(2) applies to an individual who HAS HAD criminal history record information restricted pursuant to Sec. 35-3-37. Enclose a COPY of one of the following with the request, and keep the original. This packet never receives, inspects or authenticates it.", "");
    L.push("OPTION ONE. Your own Georgia criminal history report showing the cycle for this offense as RESTRICTED. Obtainable from most Georgia sheriff's offices and police departments, or through the Georgia Crime Information Center.", "");
    L.push("OPTION TWO. A copy of the court order restricting the record, where the restriction was ordered by a court. Obtainable from the office of the court that entered the order.", "");
    L.push("IF THE OFFENSE HAS NOT IN FACT BEEN RESTRICTED, STOP. A restriction route comes first, and this request cannot help until it is done.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHY THIS STEP EXISTS. Restriction at the Georgia Crime Information Center and sealing at the court do not automatically reach the jail's own records. County jail booking records and booking photographs are a major real-world harm surface, and Sec. 35-3-37(k)(2) gives you a direct written request to the facility itself, with a 30-day compliance period.", "");
    L.push("SAY RESTRICT, NOT EXPUNGE. Georgia law uses two remedies: RECORD RESTRICTION (limiting who may see criminal history record information) and SEALING (closing the court's file). Neither destroys the record, and Georgia has not used the word expungement in this statute since 1 July 2013.", "");
    L.push("WHAT YOU DO, IN ORDER.");
    L.push("STEP ONE. Confirm the offense is already restricted - get your Georgia criminal history report, or the restricting order, per the enclosure page.");
    L.push("STEP TWO. Identify the facility that booked you and the county or municipality it belongs to.");
    L.push("STEP THREE. Contact the facility and ask two things: where a records-restriction request should be sent, and whether the facility publishes its own request form. IF THE FACILITY HAS ITS OWN FORM, THAT FORM GOVERNS and you use it instead of this letter.");
    L.push("STEP FOUR. On timing: the text of Sec. 35-3-37(k)(2) imposes no waiting period, but county prosecutor guidance describes sending the request 30 days after the record has been restricted - after the Sec. 35-3-37(k)(1) period for the center to notify the arresting agency has run. Both readings are stated here because the question is recorded as unresolved; if your restriction is very recent, waiting 30 days costs little and avoids the question.");
    L.push("STEP FIVE. Fill in every dotted blank, sign the request, enclose the proof of restriction, and send it. Certified mail is recommended so you have a record of the date - the facility's 30-day compliance period runs from the request.");
    L.push("STEP SIX. FOLLOW UP AT DAY 31 if you have no confirmation.", "");
    L.push("MONEY. No fee is identified for this request anywhere in the records this packet is built from.", "");
    L.push("WHAT THIS REQUEST NEVER REACHES. Private mugshot publishers and background-check vendors that already hold the data. Records of any entity that is not a county or municipal jail or detention center. Federal and out-of-state records.", "");
    L.push("A CAUTION THE LAW REQUIRES. A restriction or sealing may still be used to disqualify you from employment or office in the same manner as a first offender discharge under O.C.G.A. Sec. 42-8-63.1, and does not supersede disclosure required by federal law. Do not state that the record does not exist.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD.");
    L.push("- The facility refuses the request or does not respond within 30 days. Follow up once at day 31, then take the packet to a Georgia records-restriction desk.");
    L.push("- The offense has not in fact been restricted under Sec. 35-3-37 - a restriction route comes first.");
    L.push("- The records you are worried about are held by a private mugshot publisher or background-check vendor, which this route does not reach.", "");
    L.push("WHERE TO GO WHEN SELF-HELP STOPS. The records-restriction desks the Judicial Council of Georgia's Access to Justice resources name: Georgia Justice Project; the Cobb County Second Chance Desk; the Henry County Records Restriction Desk; and Middle Georgia Justice, The Desk.");
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
    w("requester_name", "Person making the request, named at the head of the letter", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the person making the request", "participant.date_of_birth");
    w("mailing_address", "Mailing address at the head of the letter", "participant.street_address");
    w("telephone", "Telephone number at the head of the letter", "participant.phone");
    w("email", "Email address at the head of the letter", "participant.email");
    rbf("facility_name", "Facility the request is addressed to - the county or municipal jail or detention center that booked you",
      "the name of the jail or detention center that booked you for the restricted offense",
      "which facility holds the booking records is a case fact the platform has not seen");
    rbf("facility_county", "County or municipality where the facility is located",
      "the Georgia county or municipality the facility belongs to",
      "the facility's location is a case fact the platform has not seen");
    rbf("facility_intake_route", "Postal destination or records-unit intake route confirmed with the facility",
      "where the facility told you to send a records-restriction request - facility intake routes vary and must be confirmed with that facility, never guessed",
      "the platform holds no intake address for any facility and the legal-design record forbids guessing one");
    rbf("booking_date", "Date of arrest and booking at the facility",
      "the date you were arrested and booked, from your records",
      "no booking fact is held for a record the platform has not seen");
    rbf("restricted_offense", "Offense already restricted under O.C.G.A. Sec. 35-3-37, worded as the record states it",
      "the restricted offense, worded exactly as your criminal history report or the restricting order states it",
      "no offense fact is held for a record the platform has not seen");
    rbf("restriction_date", "Date the record was restricted, as far as the record shows",
      "the restriction date, as your report or the order shows it",
      "no restriction fact is held for a record the platform has not seen");
    rbf("booking_number", "Booking number at the facility, if known",
      "your booking number if you know it - the request is effective without it, and you add it if the facility asks",
      "no booking identifier is held for a record the platform has not seen");
    rbf("court_case_number", "Case number of the offense in court, if there was one",
      "the court case number, if the offense had one, copied from the record",
      "no case identifier is held for a record the platform has not seen");
    prot("signature", "Signature on the written request", "the request is the participant's own and is signed when actually sent");
    prot("signature_date", "Date beside the signature on the request", "a date written before the request is actually sent would be false");
  } else if (componentId === "attachment") {
    w("participant_name", "Person the enclosure page is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the process guidance is prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/GA.memo.json", track: "ga-jail-k2", reviewedAsOf: "2026-08-02" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ga-jail-k2-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "O.C.G.A. § 35-3-37 (Official Code of Georgia Annotated, free public access)", url: "https://www.lexisnexis.com/hottopics/gacode/", retrievedOn: "2026-08-02" },
    { title: "Georgia Criminal History Record Restrictions (GBI)", url: "https://gbi.georgia.gov/services/georgia-criminal-history-record-restrictions", retrievedOn: "2026-08-02" },
    { title: "Record Restrictions/Expungement — Judicial Council of Georgia AOC, Access to Justice self-help resources", url: "https://georgiacourts.gov/a2j/self-help-resources/record-restrictions-expungement/", retrievedOn: "2026-08-02" }
  ],
  formIdentityNote:
    "No official form exists for a § 35-3-37(k)(2) request. The legal-design record reclassified the route from "
    + "process_guidance to custom_pleading: the statute authorises a written request, names the recipient class, "
    + "and fixes the relief and the 30-day compliance period, and correspondence rather than a court filing is "
    + "not a reason to withhold a packet. The MASTER_QUEUE row agrees: officialFormFamily NONE, "
    + "implementationStrategy custom_pleading, forms [], boundCount 0. The route carries localFormOverride — a "
    + "facility's own published form governs where one exists, and the guidance directs the participant to ask "
    + "the facility. Built self-contained; the b6 lane's shared Georgia host was in progress and is not touched.",
  whatThisReceiptDoesNotEstablish: [
    "that no Georgia facility publishes its own required form or intake route (localFormOverride: the participant asks the facility first)",
    "that any output is approved for participant delivery",
    "that any offense is in fact restricted under O.C.G.A. § 35-3-37 — prior restriction is the statutory precondition and the participant proves it by enclosure",
    "whether the request may be sent immediately upon restriction or only after the § 35-3-37(k)(1) 30-day agency-notification period — recorded as unresolved and stated both ways in the guidance"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the request's own face: a § 35-3-37(k)(2) written request to the booking facility. No "
    + "election control is rendered. The unresolved timing question — immediately upon restriction versus after "
    + "the § 35-3-37(k)(1) 30-day period — is not an election the packet makes or asks the participant to make "
    + "blind: the guidance states both recorded readings and the cheap conservative course."
};

const INSTRUCTIONS = {
  title: `What you must do before you send — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "This is a **written request to a government facility, not a court filing**. No official form exists for it; where the facility publishes its own request form, **that form governs** — ask the facility first.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on records the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "**Georgia says \"restrict\" and \"seal\", not \"expunge\"**, and neither remedy destroys the record. A restriction or sealing may still be used to disqualify you from employment or office in the same manner as a first offender discharge under § 42-8-63.1, and does not supersede disclosure required by federal law — never state that the record does not exist."
  ],
  componentBlurbs: {
    primary_filing: "the participant-signed written request under § 35-3-37(k)(2), with the 30-day compliance period stated",
    attachment: "the proof-of-restriction enclosure page — the statutory precondition, proved by your criminal history report or the restricting order",
    process_guidance: "why this step exists, the timing question, certified mail, the day-31 follow-up, and where to go when self-help stops"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your Georgia criminal history report showing the cycle as RESTRICTED — or — a copy of the court order restricting the record | most Georgia sheriff's offices and police departments, or the Georgia Crime Information Center; or the office of the court that entered the restricting order |"
  ],
  stepsLines: [
    "1. **Confirm the offense is already restricted** — prior restriction is the statutory precondition, and if it has not happened a restriction route comes first.",
    "2. **Identify the facility** that booked you and its county or municipality.",
    "3. **Ask the facility** where a records-restriction request should be sent and whether it has its own form. A published facility form governs over this letter.",
    "4. **Mind the timing question.** The statutory text imposes no waiting period; county prosecutor guidance describes sending 30 days after restriction. Both are stated in the guidance because the question is recorded as unresolved; if your restriction is very recent, waiting 30 days costs little.",
    "5. **Fill in every dotted blank, sign, enclose the proof, and send** — certified mail recommended, because the facility's 30-day compliance period runs from the request.",
    "6. **Follow up at day 31** if you have no written confirmation."
  ],
  blanksLines: [
    "- **Your signature and the date beside it.** The request is yours, signed when you actually send it.",
    "- **The facility's postal destination or intake route.** Facility intake routes vary and must be confirmed with that facility — never guessed.",
    "- **The booking number, where you do not know it.** The request is effective without it; add it if the facility asks."
  ],
  stopsLines: [
    "- the facility refuses the request or does not respond within 30 days (follow up once at day 31, then get help);",
    "- the offense has not in fact been restricted under § 35-3-37 — a restriction route comes first;",
    "- the records you are worried about are held by a private mugshot publisher or background-check vendor, which this route does not reach.",
    "",
    "Where self-help stops, the Georgia records-restriction desks are: Georgia Justice Project; the Cobb County Second Chance Desk; the Henry County Records Restriction Desk; and Middle Georgia Justice, \"The Desk\"."
  ],
  notLines: [
    "This is a prepared written request and its process pages. It is not a court filing, it is not legal advice, it is not sent for you, and it does not reach private vendors, mugshot publishers, federal records or out-of-state records. Restriction limits who may see the record; it does not destroy it, and it may still be used in the ways § 35-3-37(u) permits."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the legal-design record reclassified this route from "
      + "process_guidance to custom_pleading: § 35-3-37(k)(2) authorises a written request with a statutory "
      + "recipient class, definite contents and a 30-day compliance period.",
    consequence:
      "The primary component is a composed request letter stating the statutory basis and the 30-day period on "
      + "its own face. No form was substituted and none was invented; a facility's own published form governs "
      + "where one exists (localFormOverride), and the guidance directs the participant to ask the facility first."
  },
  {
    finding:
      "Whether the request may be sent immediately upon restriction or only after the § 35-3-37(k)(1) 30-day "
      + "agency-notification period is recorded as unresolved: the text of (k)(2) imposes no waiting period, "
      + "while county prosecutor guidance describes sending 30 days after restriction.",
    consequence:
      "The guidance states both recorded readings, attributes each, and notes the cheap conservative course "
      + "(waiting 30 days where the restriction is recent). The packet decides nothing the record leaves open, "
      + "and the question travels to counsel in approval-request.json."
  },
  {
    finding:
      "The legal-design record flags a consumer-harm-grade error to avoid: nothing in § 35-3-37 gives a person "
      + "the right to deny a restricted arrest or conviction, and § 35-3-37(u) expressly permits a restriction or "
      + "sealing to be used for first-offender-discharge-style disqualification and preserves federally required "
      + "disclosure.",
    consequence:
      "The § 35-3-37(u) caution is printed in both the process guidance and the instructions, the packet uses "
      + "'restrict' and 'seal' rather than 'expunge' in participant-facing copy, and no page tells the "
      + "participant the record does not exist or is destroyed."
  },
  {
    finding:
      "Prior restriction is the statutory precondition, proved by records the platform has not seen, and the "
      + "facility's intake route varies and is not published anywhere the record binds.",
    consequence:
      "The proof of restriction is a required-before-sending enclosure with both proof options and their issuing "
      + "offices named; the intake route is a labelled blank the participant confirms with the facility itself, "
      + "never guessed; and the four Judicial Council-named records-restriction desks are wired in as the "
      + "referral destinations for every stop condition."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Is the generated participant-signed § 35-3-37(k)(2) request letter the controlling output statewide, or must it yield to a facility's own published form where one exists? The route is modelled with localFormOverride and an ask-the-facility-first instruction.",
    "May the (k)(2) request be sent as soon as the record is restricted, or only after the (k)(1) 30-day agency-notification period has run? The guidance states both recorded readings and takes no position.",
    "Confirm the request's scope phrase — all records for the restricted offense maintained by the facility, including booking records and any booking photograph — matches the statutory reach.",
    "Confirm the § 35-3-37(u) caution as printed is sufficient to prevent the record's known consumer-harm error (participants being told they may deny the record exists)."
  ],
  mattersForTheReviewersAttention: [
    "Participant-facing copy says 'restrict' and 'seal', never 'expunge', per the record's terminology correction.",
    "The four Georgia records-restriction desks are named as referral destinations for every stop condition.",
    "Every case fact is required-before-sending; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the request."
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
