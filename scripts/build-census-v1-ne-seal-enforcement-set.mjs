#!/usr/bin/env node
/**
 * The Nebraska seal-enforcement packet family builder.
 *
 *   node scripts/build-census-v1-ne-seal-enforcement-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   ne-seal-enforcement   Action to Compel Compliance With the Criminal
 *                         History Record Information Act,
 *                         Neb. Rev. Stat. § 29-3528
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/NE.memo.json, track
 * ne-seal-enforcement, reviewedAsOf 2026-08-06) settles the vehicle and the
 * venue on the statutory text: any person aggrieved by an agency's failure
 * to comply with the act may bring an action, including mandamus, in the
 * district court of any district where the records are located or the
 * district court of Lancaster County — the route State v. Coble, 299 Neb.
 * 434 (2018), identifies as correct in contrast to a motion in the criminal
 * case. The packet LEADS WITH A WRITTEN DEMAND LETTER, the cheaper step that
 * often resolves the matter; the complaint is a CONDITIONAL component used
 * only where the demand does not produce compliance, and the packet strongly
 * recommends attorney review before any action is filed, because Nebraska
 * mandamus procedure and service on a political subdivision were not
 * surveyed.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every enforcement fact — the agency, the arrest or
 * citation, the qualifying disposition, the elapsed § 29-3523(3) period,
 * how the record was verified as still public, the venue election — lives on
 * records and choices the platform does not hold, so each is a labelled
 * dotted blank declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md. Nothing alleges bad faith, characterises any
 * failure as wilful, or pleads damages.
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

const FAMILY_ID = "ne-seal-enforcement-set";
const OUT = "data/rcap-all50/overlays/census-v1/ne/ne-seal-enforcement-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ne-seal-enforcement-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "NE",
  routeKeys: ["obligation:track-only:NE:ne-seal-enforcement"],
  primaryRouteKey: "obligation:track-only:NE:ne-seal-enforcement",
  routeSelectionId: "ne-seal-enforcement-composed-set",
  legalName: "Action to Compel Compliance With the Criminal History Record Information Act (Neb. Rev. Stat. § 29-3528)",
  routeName: "making a Nebraska agency clear a record that should already be sealed under Neb. Rev. Stat. § 29-3523(3), by written demand and, where that fails, an action under Neb. Rev. Stat. § 29-3528",
  statute: "Neb. Rev. Stat. § 29-3528"
});

const COMPONENTS = [
  "informal_demand_letter",
  "primary_filing",
  "venue_election_guidance",
  "attorney_review_recommendation"
];

const COMPOSED_TITLES = {
  informal_demand_letter: "Written Demand That an Agency Conform Its Records Under the Criminal History Record Information Act",
  primary_filing: "Complaint for Mandamus and to Compel Compliance With Neb. Rev. Stat. Sec. 29-3528",
  venue_election_guidance: "Venue Election Guidance",
  attorney_review_recommendation: "Attorney Review Recommendation"
};

const COMPONENT_CONDITIONS = {
  primary_filing:
    "Used only where the written demand does not produce compliance. The packet strongly recommends attorney "
    + "review before this action is filed: Nebraska mandamus procedure and service on a state agency or political "
    + "subdivision were not surveyed."
};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/NE.memo.json, track "
  + "ne-seal-enforcement, reviewedAsOf 2026-08-06) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, ne-seal-enforcement-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Cottonwood Street, Lincoln, NE 68508",
    "participant.phone": "402-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Scottsbluff, Nebraska 69361-2214",
    "participant.phone": "(308) 555-0199 ext. 4417",
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
  if (componentId === "informal_demand_letter") {
    L.push("SEND THIS LETTER FIRST. It costs nothing, it is often enough, and it is the step this packet can complete end to end. The complaint in this packet is used only if this demand does not produce compliance.", "");
    L.push(`From: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("To (the agency whose records have not been conformed):");
    L.push("Agency: " + DOTS(64));
    L.push("Mailing address of the agency:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("RE: DEMAND TO CONFORM RECORDS UNDER THE SECURITY, PRIVACY, AND DISSEMINATION OF CRIMINAL HISTORY INFORMATION ACT", "");
    L.push(`1. I, ${name}, am the subject of the record identified below. Under Neb. Rev. Stat. Sec. 29-3523(3), criminal history record information of the kind described below may not be disseminated after the applicable period has run, and the act's duties on your agency are framed in mandatory terms.`, "");
    L.push("2. The record (copied from my papers and my searches; nothing on these lines is written for me):", "");
    L.push("Date of arrest, citation or referral:");
    L.push(DOTS(), "");
    L.push("How the matter ended - no charges filed, diversion completed, dismissed, or acquitted - and the date it ended:");
    L.push(DOTS(), "");
    L.push("Case or citation number, if there was one:");
    L.push(DOTS(), "");
    L.push("Date on which the period applicable to that kind of disposition ran out, or the event that ended it:");
    L.push(DOTS(), "");
    L.push("How I verified that the record still appears publicly - a Nebraska State Patrol report, a court case search, or a courthouse public-access terminal printout, and the date I checked:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. The applicable period under Neb. Rev. Stat. Sec. 29-3523(3) has elapsed, or its trigger has occurred, and the record described above nonetheless still appears in your agency's publicly available records.", "");
    L.push("4. I therefore ask that your agency conform its records to the act within thirty days of this letter, and confirm to me in writing at the mailing address above. Neb. Rev. Stat. Sec. 29-3528 provides that a person aggrieved by an agency's failure to comply with the act may bring an action, including an action for mandamus, to compel compliance; I would prefer that no action be necessary.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(52), "");
    L.push("(You sign and date this letter yourself, when you actually post it. This letter states no allegation of bad faith and makes no demand for money; it asks only that the records be conformed.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "primary_filing") {
    L.push("USE THIS COMPLAINT ONLY IF THE WRITTEN DEMAND DOES NOT PRODUCE COMPLIANCE, and read the attorney review recommendation in this packet before filing: Nebraska mandamus procedure and service on a public body were not surveyed, and this packet strongly recommends a lawyer's review of this action before it is filed.", "");
    L.push("IN THE DISTRICT COURT OF .......................................... COUNTY, NEBRASKA");
    L.push("(THE DISTRICT WHERE THE RECORDS ARE LOCATED, OR THE DISTRICT COURT OF LANCASTER COUNTY - Neb. Rev. Stat. Sec. 29-3528 lets you choose; the venue election guidance in this packet explains the choice, which is yours)", "");
    L.push(`${name},`);
    L.push("PLAINTIFF,", "");
    L.push("v.", "");
    L.push("Respondent agency or political subdivision named below,");
    L.push("DEFENDANT.", "");
    L.push("Case No. " + DOTS(40) + "  (the court's office assigns it at filing)", "");
    L.push("COMPLAINT FOR MANDAMUS AND TO COMPEL COMPLIANCE WITH NEB. REV. STAT. Sec. 29-3528", "");
    L.push(`1. The plaintiff, ${name}, date of birth ${dob}, brings this action under Neb. Rev. Stat. Sec. 29-3528, which provides that where any officer or employee of the state, its agencies or its political subdivisions, or any state agency or political subdivision, fails to comply with the Security, Privacy, and Dissemination of Criminal History Information Act, any person aggrieved may bring an action, including but not limited to an action for mandamus, to compel compliance. State v. Coble, 299 Neb. 434 (2018), identifies this action, rather than a motion in the criminal case, as the correct vehicle.`, "");
    L.push("2. The defendant is the following agency or political subdivision, whose records have not been conformed:");
    L.push("Name of the agency or political subdivision, and its mailing address:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. The plaintiff states the following from the record (nothing on these lines is written for you):", "");
    L.push("Date of arrest, citation or referral, on the complaint:");
    L.push(DOTS(), "");
    L.push("How the matter ended - no charges filed, diversion completed, dismissed, or acquitted - and the date, on the complaint:");
    L.push(DOTS(), "");
    L.push("Case or citation number, if there was one, on the complaint:");
    L.push(DOTS(), "");
    L.push("Date on which the applicable Sec. 29-3523(3) period ran out, or the event that ended it, on the complaint:");
    L.push(DOTS(), "");
    L.push("How the plaintiff verified the record still appears publicly, and the date checked, on the complaint:");
    L.push(DOTS(), "");
    L.push("Date the written demand was delivered to the defendant, and what response, if any, was received:");
    L.push(DOTS(), "");
    L.push("4. The applicable period under Neb. Rev. Stat. Sec. 29-3523(3) has elapsed or its trigger has occurred; the act's duties are framed in mandatory terms; the plaintiff demanded compliance in writing; and the defendant has not conformed its records.", "");
    L.push("5. The plaintiff therefore asks the court to issue a writ of mandamus, or such other relief as the statute provides, compelling the defendant to comply with the act and conform its records. This complaint alleges no bad faith, characterises no failure as wilful, and pleads no damages.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PLAINTIFF " + DOTS(38), "");
    L.push("(The plaintiff signs and dates this complaint personally.)", "");
    L.push(`PRINTED NAME: ${name}  (self-represented)`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "venue_election_guidance") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Neb. Rev. Stat. Sec. 29-3528 gives you a choice of court, and THE CHOICE IS YOURS:", "");
    L.push("OPTION ONE. The district court of any district in which the records involved are located. Usually the district where the arrest happened or where the agency keeps its records. Filing there keeps the case close to the records and to you, if you live nearby.", "");
    L.push("OPTION TWO. The district court of Lancaster County. The statute makes Lancaster County always available, whatever district the records are in - useful where the records are spread across districts or where the holding agency is a state agency headquartered in Lincoln.", "");
    L.push("Neither option is legally stronger on the statute's face; the statute simply allows both. Practical matters - distance, where the agency is, where the records are - are the sensible deciders. If you cannot decide, that is a good question to bring to the lawyer the attorney review recommendation tells you to see before filing.");
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("READ THIS BEFORE FILING THE COMPLAINT. This packet STRONGLY RECOMMENDS that a Nebraska attorney review the action before it is filed. The demand letter needs no such review - send it. The complaint does, for these recorded reasons:", "");
    L.push("ONE. Nebraska mandamus procedure was not surveyed. Whether an application and affidavit and an alternative writ are required decides what accompanies the complaint, and no record this packet is built from answers it.");
    L.push("TWO. The rule for service on a Nebraska state agency or political subdivision was not surveyed. The respondent is a public body and you effect service; how, exactly, is a question for a lawyer or for the office of the district court where you file.");
    L.push("THREE. Whether relief is mandatory or discretionary once non-compliance is shown was not settled, although the sealing duty in Neb. Rev. Stat. Sec. 29-3523(7) is framed in mandatory terms.");
    L.push("FOUR. An agency that contests will appear through counsel, and an adversarial proceeding against a represented public body is not a self-help setting.", "");
    L.push("WHAT THIS ROUTE CANNOT FIX. A private background-check website or data broker is not reachable by this action - the section reaches the state, its agencies and its political subdivisions. A case that never qualified under Sec. 29-3523(3) cannot be enforced into qualification. Federal and out-of-state agencies are outside the act.", "");
    L.push("MONEY. The demand letter costs nothing. The district court civil filing fee for the action was not established by any record this packet is built from - ask the office of the district court where you file. A fee waiver is available in principle under Neb. Rev. Stat. Sec. 25-2301.01, through that same office.", "");
    L.push("WHEN TO STOP.");
    L.push("- You cannot identify the agency that still shows the record.");
    L.push("- The record is on a private website rather than with a government agency.");
    L.push("- The case never qualified under Sec. 29-3523(3).");
    L.push("- The agency contests and appears through counsel.");
    L.push("- You need representation for any reason. This is exactly what the recommendation above is for.");
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
  const court = (id, label, why) => refusals.push(mapCourtOwned(componentId, id, label, why));

  if (componentId === "informal_demand_letter") {
    w("sender_name", "Person making the demand, named at the head of the letter", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the person making the demand", "participant.date_of_birth");
    w("mailing_address", "Mailing address at the head of the letter", "participant.street_address");
    w("telephone", "Telephone number at the head of the letter", "participant.phone");
    w("email", "Email address at the head of the letter", "participant.email");
    rbf("agency_name", "Agency the demand is addressed to - the agency whose records have not been conformed",
      "the agency that still shows the record - the State Patrol, a county attorney, a court records office, a city attorney, or another; your State Patrol report, court case search or courthouse terminal printout shows which",
      "which agency failed to conform its records is a fact the participant establishes by checking, and the platform has not seen the results");
    rbf("agency_address", "Mailing address of the agency the demand is sent to",
      "the agency's current published mailing address",
      "the platform holds no address for the agency and it is never guessed");
    rbf("arrest_date", "Date of arrest, citation or referral",
      "the date you were arrested, cited or referred, from your papers",
      "no arrest fact is held for a record the platform has not seen");
    rbf("disposition_and_date", "How the matter ended - no charges filed, diversion completed, dismissed, or acquitted - and the date it ended",
      "how the matter ended and on what date, from the court record or your papers - the qualifying dispositions are those Neb. Rev. Stat. Sec. 29-3523(3) lists",
      "no disposition fact is held for a record the platform has not seen");
    rbf("case_number", "Case or citation number, if there was one",
      "the case or citation number, copied from the record if one exists",
      "no case identifier is held for a record the platform has not seen");
    rbf("period_end_date", "Date on which the period applicable to that kind of disposition ran out, or the event that ended it",
      "when the Sec. 29-3523(3) period for your kind of disposition ran out, or the event that ended it, computed from the record",
      "the computation depends on dates the platform does not hold, so the participant computes it from the record");
    rbf("verification_method", "How the record was verified as still publicly appearing, and the date checked",
      "how you checked - a Nebraska State Patrol report, a court case search, or a courthouse public-access terminal printout - and the date you checked",
      "the evidence that the record is still public is the participant's own search, which the platform has not seen");
    prot("signature", "Signature on the demand letter", "the letter is the participant's own and is signed when actually posted");
    prot("signature_date", "Date beside the signature on the letter", "a date written before the letter is actually posted would be false");
  } else if (componentId === "primary_filing") {
    w("plaintiff_name", "Plaintiff named in the caption of this complaint", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the plaintiff, printed in the complaint", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the plaintiff in the contact block at the foot of the complaint", "participant.street_address");
    w("telephone", "Telephone number of the plaintiff in the contact block at the foot of the complaint", "participant.phone");
    w("email", "Email address of the plaintiff in the contact block at the foot of the complaint", "participant.email");
    rbf("venue_county", "County in the caption - the district where the records are located, or Lancaster County, as you elect",
      "the county of the district court you elect - a district where the records are located, or Lancaster County; the statute allows both and the venue election guidance explains the choice, which is yours",
      "Neb. Rev. Stat. Sec. 29-3528 grants a venue choice the route does not determine, and only the participant can make it");
    rbf("defendant_agency", "Name of the agency or political subdivision sued, and its mailing address",
      "the non-compliant agency or political subdivision, named as your searches show it, with its current published mailing address",
      "which public body failed to comply is a fact the participant establishes, and the platform has not seen the searches");
    rbf("arrest_date", "Date of arrest, citation or referral, on the complaint",
      "the same arrest, citation or referral date as on the demand letter",
      "no arrest fact is held for a record the platform has not seen");
    rbf("disposition_and_date", "How the matter ended and the date, on the complaint",
      "the same disposition and date as on the demand letter",
      "no disposition fact is held for a record the platform has not seen");
    rbf("case_number", "Case or citation number, if there was one, on the complaint",
      "the same case or citation number as on the demand letter, if one exists",
      "no case identifier is held for a record the platform has not seen");
    rbf("period_end_date", "Date the applicable Sec. 29-3523(3) period ran out, or its trigger, on the complaint",
      "the same computed date or event as on the demand letter",
      "the computation depends on dates the platform does not hold");
    rbf("verification_method", "How the plaintiff verified the record still appears publicly, on the complaint",
      "the same verification as on the demand letter, updated if you checked again before filing",
      "the evidence is the participant's own search, which the platform has not seen");
    rbf("demand_history", "Date the written demand was delivered, and what response was received",
      "when your demand letter was delivered to the agency and what, if anything, the agency answered - the complaint is conditional on the demand not producing compliance",
      "what happened to the demand is post-generation history only the participant knows");
    court("case_number_assigned", "Case number of this action, assigned at filing",
      "the district court's office assigns the number at filing");
    prot("plaintiff_signature", "Signature of the plaintiff on the complaint", "the plaintiff signs the complaint personally");
    prot("signature_date", "Date beside the plaintiff's signature on the complaint", "a date written before the complaint is signed would be false");
  } else if (componentId === "venue_election_guidance") {
    w("participant_name", "Person the venue guidance is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the recommendation is prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/NE.memo.json", track: "ne-seal-enforcement", reviewedAsOf: "2026-08-06" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ne-seal-enforcement-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Neb. Rev. Stat. § 29-3528, Failure to comply; action to compel", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=29-3528", retrievedOn: "2026-08-06" },
    { title: "Neb. Rev. Stat. § 29-3523, Criminal history record information; confidentiality; sealing", url: "https://nebraskalegislature.gov/laws/statutes.php?statute=29-3523", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "No official form exists for a § 29-3528 demand or action. The legal-design record settles the vehicle (a "
    + "separate civil action, as State v. Coble, 299 Neb. 434 (2018) directs — not a motion in the criminal case) "
    + "and the venue (statutory: any district where the records are located, or Lancaster County), and leads with "
    + "a written demand letter as the cheaper step. The MASTER_QUEUE row agrees: officialFormFamily NONE, "
    + "implementationStrategy custom_pleading, forms [], boundCount 0. The complaint is a conditional component "
    + "used only where the demand fails, with attorney review strongly recommended before filing because "
    + "mandamus procedure and service on a public body were not surveyed.",
  whatThisReceiptDoesNotEstablish: [
    "Nebraska mandamus procedure — whether an application, affidavit and alternative writ must accompany the complaint (recorded as unresolved)",
    "the rule for service on a Nebraska state agency or political subdivision (recorded as unresolved)",
    "whether relief under § 29-3528 is mandatory or discretionary once non-compliance is shown",
    "that any output is approved for participant delivery, or that any record qualifies under § 29-3523(3)",
    "that generating this demand letter and complaint is confirmed by counsel against the controlling review's outside-self-help classification — the override is recorded as requiring counsel confirmation"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on both instruments' faces: enforcement of the act under § 29-3528. The venue choice "
    + "(records district versus Lancaster County) is a genuine statutory election the route does not determine — "
    + "the venue election guidance explains both options and states in terms that the choice is the "
    + "participant's, and the caption blank carries the election. The demand-first sequence is stated as "
    + "instruction, not rendered as a form control."
};

const INSTRUCTIONS = {
  title: `What you must do before you send the demand — and before you ever file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Send the demand letter first.** It costs nothing, it is often enough, and it is the step this packet completes end to end. The complaint is used only where the demand does not produce compliance, and **attorney review is strongly recommended before the complaint is filed** — Nebraska mandamus procedure and service on a public body were not surveyed.",
    "",
    "This route creates no new relief. It enforces the sealing the act already commands under § 29-3523(3), by asking — and, where asking fails, by asking a court to order — an agency to do what the statute already requires. State v. Coble, 299 Neb. 434 (2018), identifies this action, not a motion in the old criminal case, as the correct vehicle.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every enforcement fact lives on records and searches the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory."
  ],
  componentBlurbs: {
    informal_demand_letter: "the written demand to the agency — the first step, no bad-faith allegation, no money demand",
    primary_filing: "the conditional complaint for mandamus under § 29-3528, used only where the demand fails",
    venue_election_guidance: "the statutory venue choice — the records district or Lancaster County — and why it is yours",
    attorney_review_recommendation: "the recorded reasons the action, unlike the letter, wants a lawyer's review before filing"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Nebraska State Patrol criminal history report — evidence the record is still public | Nebraska State Patrol, limited criminal history search through nebraska.gov |",
    "| Court case search result or courthouse terminal printout — shows which office still displays the record | Nebraska Judicial Branch online case search, or the courthouse public-access terminal |"
  ],
  stepsLines: [
    "1. **Check that the record is still public** — the State Patrol report, a court case search, or a courthouse terminal printout — and note the date you checked.",
    "2. **Identify the agency** that still shows the record, and its current published mailing address.",
    "3. **Confirm your disposition qualifies** — no charges filed, diversion completed, dismissed, or acquitted — and compute when the § 29-3523(3) period for it ran out.",
    "4. **Fill in every dotted blank on the demand letter, sign it, and post it yourself.** Keep a copy and note the delivery date.",
    "5. **Give the agency thirty days.** If it conforms its records, you are done.",
    "6. **If the demand fails:** read the venue election guidance, choose your court, complete the complaint's blanks including the demand history, and **take the packet to a Nebraska attorney for review before filing** — mandamus procedure and service on a public body were not surveyed, and the office of the district court where you file can state its filing fee (a waiver is available in principle under § 25-2301.01)."
  ],
  blanksLines: [
    "- **Your signature, and every date beside a signature.** The letter and the complaint are yours alone.",
    "- **The case number of the action.** The district court's office assigns it at filing.",
    "- **Any allegation of bad faith, any characterisation of the failure as wilful, and any damages claim.** Deliberately absent from the whole packet.",
    "- **Service on the agency.** You effect service after filing; the rule for serving a Nebraska public body was not surveyed and is a question for your reviewing attorney or the court office."
  ],
  stopsLines: [
    "- you cannot identify the agency that still shows the record;",
    "- the record is on a private background-check website or data broker, which no order under this section reaches;",
    "- the case never qualified under § 29-3523(3);",
    "- the agency contests and appears through counsel;",
    "- you need representation for any reason — the attorney review recommendation is the packet's own advice."
  ],
  notLines: [
    "This is a prepared demand letter, a conditional complaint, and their process pages. It is not an official form — none exists — and it is not legal advice, it is not sent or filed for you, and it does not decide whether a court will issue mandamus. It creates no new relief: it enforces the sealing § 29-3523(3) already commands, against public bodies only."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the legal-design record settles vehicle and venue on the "
      + "statutory text and State v. Coble: a separate civil action under § 29-3528, in the district court of any "
      + "district where the records are located or of Lancaster County.",
    consequence:
      "The packet leads with the written demand — the step the product completes end to end — and renders the "
      + "complaint as a conditional component with its condition printed on its own face. No form was substituted "
      + "and none was invented."
  },
  {
    finding:
      "Nebraska mandamus procedure and the rule for service on a state agency or political subdivision were not "
      + "surveyed, and whether relief is mandatory once non-compliance is shown was not settled; the legal-design "
      + "override of the controlling review's outside-self-help classification is itself recorded as requiring "
      + "counsel confirmation.",
    consequence:
      "The attorney review recommendation is a full rendered component stating each recorded reason; the "
      + "instructions make attorney review of the action (never the letter) the strong recommendation; and all "
      + "four questions travel to counsel in approval-request.json. The packet decides none of them."
  },
  {
    finding:
      "The § 29-3528 venue choice is a genuine statutory election the route does not determine.",
    consequence:
      "The venue election guidance explains both options without preferring either on the law, states the choice "
      + "is the participant's, and the caption blank carries the election as a required-before-filing item."
  },
  {
    finding:
      "The legal-design record forbids alleging bad faith, characterising the failure as wilful, or pleading "
      + "damages, and places private data brokers, never-qualified cases, and federal or out-of-state agencies "
      + "outside the route.",
    consequence:
      "The letter and complaint state in terms that they allege no bad faith and plead no damages; the "
      + "out-of-reach categories are printed stop conditions in the recommendation and the instructions."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm that a § 29-3528 demand letter and complaint may be generated at all: the legal-design record's override of the controlling review's outside-self-help classification is recorded as requiring counsel confirmation, and this build renders the packet without resolving it.",
    "What procedure governs a mandamus action under § 29-3528 — is an application, affidavit and alternative writ required — and what accompanies the complaint?",
    "How is a Nebraska state agency or political subdivision served in an action to compel compliance?",
    "Is relief under § 29-3528 mandatory once non-compliance is shown, given § 29-3523(7)'s mandatory framing?"
  ],
  mattersForTheReviewersAttention: [
    "The complaint is conditional on demand failure and carries the strong attorney-review recommendation on its own face.",
    "No bad-faith allegation, no wilfulness characterisation, no damages anywhere in the packet — deliberate.",
    "The venue election is the participant's and is disclosed as a required-before-filing item; confirm the guidance's neutral presentation."
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
