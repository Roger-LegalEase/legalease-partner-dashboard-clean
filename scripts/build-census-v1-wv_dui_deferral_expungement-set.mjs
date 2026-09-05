#!/usr/bin/env node
/**
 * The West Virginia first-offence DUI deferral dismissal-and-expungement
 * packet family builder.
 *
 *   node scripts/build-census-v1-wv_dui_deferral_expungement-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, TWO statutory units:
 *
 *   wv-dui-deferral-unit-1-motion-to-dismiss        W. Va. Code § 17C-5-2b(c)
 *   wv-dui-deferral-unit-2-application-to-expunge   W. Va. Code § 17C-5-2b(g)
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/WV.memo.json, track
 * wv_dui_deferral_expungement, read at source 2026-08-06) states in terms
 * that the West Virginia Judiciary Court Forms index publishes exactly five
 * expungement forms — SCA-C900, SCA-C903, SCA-C906, SCA-C907, SCA-C912 —
 * and none of them is a § 17C-5-2b filing. Both units are therefore composed
 * pleadings, exactly as the packet-set manifest
 * (data/record-clearing/legal-design-packet-set-manifests.json,
 * wv_dui_deferral_expungement-set) directs with seven components, none an
 * official form fill. No form was substituted and none was invented.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — the deferred case's court and number,
 * the arrest, the deferral order, the probation term and its expiry, the
 * program completion, the dismissal — lives on a court record the platform
 * has not seen, so each is a labelled dotted blank declared
 * REQUIRED_BEFORE_FILING and disclosed in participant-instructions.md, with
 * the clerk of the court that deferred the proceedings, the Division of Motor
 * Vehicles, or the supervising probation office named as the checkable
 * authority. No signature, no signature date, no jurat, no judicial or
 * clerk field is ever written.
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
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "wv_dui_deferral_expungement-set";
const OUT = "data/rcap-all50/overlays/census-v1/wv/wv-dui-deferral-expungement-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-wv_dui_deferral_expungement-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "WV",
  routeKeys: [
    "obligation:unit:WV:wv_dui_deferral_expungement:wv-dui-deferral-unit-1-motion-to-dismiss",
    "obligation:unit:WV:wv_dui_deferral_expungement:wv-dui-deferral-unit-2-application-to-expunge"
  ],
  primaryRouteKey: "obligation:unit:WV:wv_dui_deferral_expungement:wv-dui-deferral-unit-1-motion-to-dismiss",
  routeSelectionId: "wv-dui-deferral-expungement-composed-set",
  legalName: "Motion to Dismiss the Charges and Application to Expunge After a First-Offence DUI Deferral, W. Va. Code § 17C-5-2b(c) and (g)",
  routeName: "clearing a West Virginia first-offence DUI that was deferred and dismissed after the Motor Vehicle Alcohol Test and Lock Program, under W. Va. Code § 17C-5-2b(c) and (g)",
  statute: "W. Va. Code § 17C-5-2b"
});

const COMPONENTS = [
  "primary_filing",
  "supporting_affidavit",
  "secondary_filing",
  "supporting_timeline",
  "certificate_of_service",
  "records_checklist",
  "filing_instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Motion for an Order Dismissing the Charges Under W. Va. Code Sec. 17C-5-2b(c)",
  supporting_affidavit: "Defendant's Affidavit in Support of the Motion to Dismiss",
  secondary_filing: "Application for an Order Expunging Records Under W. Va. Code Sec. 17C-5-2b(g)",
  supporting_timeline: "Supporting Timeline for the Application to Expunge",
  certificate_of_service: "Certificate of Service on the Prosecuting Attorney",
  records_checklist: "Records Checklist",
  filing_instructions: "Filing Instructions"
};

const COMPONENT_CONDITIONS = {
  secondary_filing:
    "Filed only at the second stage: after the Sec. 17C-5-2b(c) dismissal and discharge has been entered, and no "
    + "sooner than one year after the probation term expired. Sec. 17C-5-2b(g)(1) bars this application outright "
    + "to anyone previously convicted of a felony.",
  supporting_timeline:
    "Filed with the second-stage application to expunge, whose one-year clock it computes from the expiration of "
    + "the probation term.",
  certificate_of_service:
    "Completed and filed separately for EACH unit, because each unit carries its own 30-day prosecutor objection "
    + "window running from service."
};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/WV.memo.json, track "
  + "wv_dui_deferral_expungement, read at source 2026-08-06) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, wv_dui_deferral_expungement-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Charleston, WV 25301",
    "participant.phone": "304-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Morgantown, West Virginia 26501-2214",
    "participant.phone": "(681) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

/* The affiant's own signature line opens the closing execution unit; the two
 * lines the notary or other authorized officer completes close it. Both are
 * matched on the composed source line, and both are used by composedBody (to
 * place the trailer above the unit) and by renderComposedPdf (to keep the unit
 * whole on one page). */
const EXECUTION_UNIT_OPENER = /^SIGNATURE OF /;
const OFFICER_EXECUTION_LINE = /^(Taken, subscribed and sworn to before me|Officer authorized to administer oaths)\b/;

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  const caption = (partyLabel) => {
    L.push("IN THE ............................................................ OF ..........................................................");
    L.push("(NAME OF THE COURT THAT DEFERRED THE PROCEEDINGS AND IMPOSED PROBATION, AND ITS COUNTY)", "");
    L.push("STATE OF WEST VIRGINIA,", "");
    L.push("v.", "");
    L.push(`${name},`);
    L.push(`${partyLabel}.`, "");
    L.push("Case No. " + DOTS(48), "");
  };
  if (componentId === "primary_filing") {
    caption("DEFENDANT");
    L.push("MOTION FOR AN ORDER DISMISSING THE CHARGES UNDER W. VA. CODE Sec. 17C-5-2b(c)", "");
    L.push(`1. The defendant, ${name}, was charged with a first offence under W. Va. Code Sec. 17C-5-2(e) in this case, notified the court of the intention to participate in the deferral, and was placed on probation under W. Va. Code Sec. 17C-5-2b without entry of a judgment of guilt, conditioned on successful completion of the Motor Vehicle Alcohol Test and Lock Program under W. Va. Code Sec. 17C-5A-3a.`, "");
    L.push("2. The defendant states the following from the court record and the Division of Motor Vehicles record (nothing on these lines is written for you):", "");
    L.push("Date of arrest on the deferred charge:");
    L.push(DOTS(), "");
    L.push("Name of the agency that made the arrest:");
    L.push(DOTS(), "");
    L.push("Date of the order deferring proceedings and imposing probation:");
    L.push(DOTS(), "");
    L.push("Length of the probation term the court imposed:");
    L.push(DOTS(), "");
    L.push("Date of successful completion of the Motor Vehicle Alcohol Test and Lock Program:");
    L.push(DOTS(), "");
    L.push("3. The defendant has satisfactorily completed the Motor Vehicle Alcohol Test and Lock Program and has complied with all of the conditions of the program, as W. Va. Code Sec. 17C-5-2b(c) requires. Filed in support of this motion are the defendant's affidavit and the certification of the Division of Motor Vehicles that the program was successfully completed.", "");
    L.push("4. The defendant therefore moves the court for an order dismissing the charges. Under W. Va. Code Sec. 17C-5-2b(c), the prosecuting attorney has 30 days after service of this motion to advise the judge of any objections; in the absence of objections within that period, the court shall dismiss.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF DEFENDANT " + DOTS(38), "");
    L.push("(The defendant signs and dates this motion personally. Nothing on this page is signed or dated for the defendant.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`DATE OF BIRTH: ${dob}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "supporting_affidavit") {
    caption("DEFENDANT");
    L.push("DEFENDANT'S AFFIDAVIT IN SUPPORT OF THE MOTION TO DISMISS", "");
    L.push(`1. I, ${name}, am the defendant in this case and make this affidavit in support of my motion for an order dismissing the charges under W. Va. Code Sec. 17C-5-2b(c), which requires the motion to be supported by the defendant's affidavit.`, "");
    L.push("2. I successfully completed the Motor Vehicle Alcohol Test and Lock Program on the date stated below, and I complied with the conditions of the program:", "");
    L.push("Date of successful completion of the program, as the Division of Motor Vehicles certification states it:");
    L.push(DOTS(), "");
    L.push("3. Your own statement of your completion of the program and your compliance with its conditions, in your own words (state only what you know first-hand; nothing on these lines is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("I swear or affirm that the statements above are true.", "");
    L.push("SIGNATURE OF AFFIANT " + DOTS(52));
    L.push("DATE " + DOTS(68), "");
    L.push("(You sign this affidavit before a notary public or other officer authorized to administer oaths, and not before. The block below is completed by that officer, never by you and never by this packet.)", "");
    L.push("Taken, subscribed and sworn to before me this ...... day of .................., 20......");
    L.push("Officer authorized to administer oaths " + DOTS(44));
  } else if (componentId === "secondary_filing") {
    caption("DEFENDANT");
    L.push("APPLICATION FOR AN ORDER EXPUNGING ALL OFFICIAL RECORDS OF THE ARREST, TRIAL AND CONVICTION UNDER W. VA. CODE Sec. 17C-5-2b(g)", "");
    L.push(`1. The applicant, ${name}, was placed on probation under W. Va. Code Sec. 17C-5-2b in this case, and the charges were dismissed and discharged under Sec. 17C-5-2b(c) without adjudication of guilt.`, "");
    L.push("2. The applicant states the following from the court record (nothing on these lines is written for you):", "");
    L.push("Date of the order of dismissal and discharge:");
    L.push(DOTS(), "");
    L.push("Date the probation term expired, as the court or the supervising probation office confirms it:");
    L.push(DOTS(), "");
    L.push("3. Not less than one year has elapsed since the expiration of the term of probation, which is the period W. Va. Code Sec. 17C-5-2b(g)(1) requires. The clock runs from the expiration of probation, not from the dismissal; the supporting timeline filed with this application sets out the computation.", "");
    L.push("4. The applicant has not previously been convicted of a felony in any jurisdiction. (Sign this application only if that is true: Sec. 17C-5-2b(g)(1) bars this motion outright to any person previously convicted of a felony.)", "");
    L.push("5. The applicant therefore applies for an order expunging all official records of the arrest, trial and conviction in this matter, EXCEPT those records maintained by the Division of Motor Vehicles, which W. Va. Code Sec. 17C-5-2b(g) and Sec. 61-11-25(a) expressly place beyond the reach of this order. No Division of Motor Vehicles record is sought or reached.", "");
    L.push("6. Under W. Va. Code Sec. 17C-5-2b(g), objections may be filed within 30 days after service of this application. If objections are filed, the court holds a hearing; if the court determines the applicant was not guilty of any serious or repeated violation of the conditions of probation, it shall order the expungement.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF APPLICANT " + DOTS(38), "");
    L.push("(The applicant signs and dates this application personally.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`DATE OF BIRTH: ${dob}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "supporting_timeline") {
    L.push(`Filed with the application of ${name} for an order under W. Va. Code Sec. 17C-5-2b(g).`, "");
    L.push("This timeline sets out the sequence the statute fixes and the one computation the application turns on. Every date is copied from the court record or the probation office's written confirmation, never from memory, and nothing on these lines is written for you.", "");
    L.push("Date of the order deferring proceedings and imposing probation:");
    L.push(DOTS(), "");
    L.push("Length of the probation term the court imposed:");
    L.push(DOTS(), "");
    L.push("Date the probation term expired:");
    L.push(DOTS(), "");
    L.push("Date of the order of dismissal and discharge under Sec. 17C-5-2b(c):");
    L.push(DOTS(), "");
    L.push("Earliest date the application to expunge may be filed - one year after the probation term expired:");
    L.push(DOTS(), "");
    L.push("THE COMPUTATION THAT MATTERS. W. Va. Code Sec. 17C-5-2b(g)(1) makes the one-year period begin to run immediately upon the expiration of the term of probation. It does not run from the dismissal. If the two dates differ, use the probation expiry date.");
  } else if (componentId === "certificate_of_service") {
    caption("DEFENDANT");
    L.push("CERTIFICATE OF SERVICE ON THE PROSECUTING ATTORNEY", "");
    L.push(`I, ${name}, certify that on the date stated below I served a true copy of the filing named below, with its supporting papers, on the prosecuting attorney named below.`, "");
    L.push("Title of the filing served with this certificate (the Sec. 17C-5-2b(c) motion, or the Sec. 17C-5-2b(g) application - a separate certificate is completed for each):");
    L.push(DOTS(), "");
    L.push("Name and office mailing address of the prosecuting attorney served:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("DATE OF SERVICE " + DOTS(56));
    L.push("SIGNATURE " + DOTS(64), "");
    L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed when the copy actually goes out. A date or a signature written before the copy goes out would be false. The 30-day objection window on each unit runs from service, so keep a copy of the completed certificate.");
  } else if (componentId === "records_checklist") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Each document below is named, with the office that issues it. This packet never receives, inspects or authenticates any of them - you obtain each one yourself and attach or keep it as stated.", "");
    L.push("ONE. Certification of the Division of Motor Vehicles that you successfully completed the Motor Vehicle Alcohol Test and Lock Program. Issued by the West Virginia Division of Motor Vehicles. W. Va. Code Sec. 17C-5-2b(c) requires the motion to dismiss to be supported by this certification, so it must be in hand and attached BEFORE the motion is filed.", "");
    L.push("TWO. Certified copy of the order deferring proceedings and imposing probation. Issued by the office of the court that entered it. It carries the probation term the one-year expungement clock is measured from.", "");
    L.push("THREE. Certified copy of the order of dismissal and discharge. Issued by the office of the court that entered it. Needed at the second stage, where the dismissal has already been entered.", "");
    L.push("FOUR. Written confirmation of the date your probation term expired. Issued by the supervising probation office, or by the office of the court. This date, not the dismissal date, starts the one-year period for the application to expunge.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("THE SEQUENCE, AND ITS TWO CLOCKS", "");
    L.push("This route has two stages, filed in the same court - the court that deferred the proceedings and imposed probation - and the second cannot be reached until the first has taken effect:");
    L.push("STAGE ONE. Once you have satisfactorily completed the Motor Vehicle Alcohol Test and Lock Program, file the MOTION TO DISMISS with your affidavit and the Division of Motor Vehicles certification, and serve a copy on the prosecuting attorney. The prosecuting attorney has 30 days after service to advise the judge of objections; if none are filed, the court shall dismiss. The dismissal and discharge is without adjudication of guilt and is not a conviction for purposes of disqualifications or disabilities.");
    L.push("STAGE TWO. No sooner than ONE YEAR after your probation term EXPIRED - measured from the probation expiry, not from the dismissal - file the APPLICATION TO EXPUNGE with the supporting timeline, and serve a copy on the prosecuting attorney. Objections may be filed within 30 days after service; the court holds a hearing only if objections are filed.", "");
    L.push("WHAT THE ORDER NEVER REACHES. No Division of Motor Vehicles record may be expunged by virtue of an order entered under this section (W. Va. Code Sec. 61-11-25(a)). The criminal record can be cleared; the driving record cannot. If the driving record is your chief concern, this route will not help it.", "");
    L.push("THE HARD LIMITS, FROM THE STATUTE.");
    L.push("- Only one discharge and dismissal is available under Sec. 17C-5-2b, ever (Sec. 17C-5-2b(e)).");
    L.push("- A person previously convicted of a felony may not make the Sec. 17C-5-2b(g) expungement motion at all.");
    L.push("- Under Sec. 17C-5-2b(h), a person whose case is disposed of under the section must pay the court costs that could be assessed against a person convicted of the offence, and payment may have been made a condition of probation.");
    L.push("- Sec. 17C-5-2b charges no fee for either motion. Whether the court's office collects any filing cost on these papers is not stated by any record this packet is built from - ask the office of the court that deferred the proceedings before filing.", "");
    L.push("DISCLOSURE PROTECTION. After dismissal and discharge, you are not guilty of perjury or false swearing by reason of failing to disclose the arrest or trial, EXCEPT in response to an inquiry made in connection with a subsequent offence under W. Va. Code Sec. 17C-5-2.", "");
    L.push("WHEN TO STOP AND GET A LAWYER INSTEAD OF FILING", "");
    L.push("- The charge is live and you have not yet notified the court of an intention to participate in a deferral: that 30-day window is charge-stage criminal defence, it closes quickly, and it is outside this packet entirely.");
    L.push("- You hold a commercial driver's licence or operate commercial motor vehicles.");
    L.push("- A court entered an order finding that you refused the secondary chemical test.");
    L.push("- Your licence had previously been revoked for a same-elements offence in any jurisdiction.");
    L.push("- Any other offence under the serious traffic offences article was charged in the same prosecution.");
    L.push("- You have any prior felony conviction.");
    L.push("- Anyone has alleged a serious or repeated violation of your probation conditions, or the prosecutor objects and the court sets a hearing.");
    L.push("- You did not complete, or were removed from, the test and lock program.");
    L.push("- You completed the program years ago but no order of dismissal was ever entered: whether the Sec. 17C-5-2b(c) motion is still the right vehicle for a stale file is an unresolved question this packet does not answer.");
    L.push("- Firearm rights, immigration, professional licensing, commercial driving, or federal, tribal, military or out-of-state records questions.");
  }
  /* WHERE THE ROUTE TRAILER GOES WHEN AN OFFICER'S BLOCK CLOSES THE PAGE.
   *
   * The trailer is internal machine metadata, and it closes every component.
   * On the affidavit that put it under "Officer authorized to administer oaths"
   * - inside a block the page's own words reserve to the notary or other
   * officer, "completed by that officer, never by you and never by this
   * packet". VF07 read it off the delivered bytes and named the limb: machine
   * text inside another's block.
   *
   * So where a component closes on a third party's execution block, the trailer
   * closes the preparer's own half of the page instead, immediately above that
   * block. This is where the repaired Rhode Island order and the Mississippi
   * families that pass place it. Nothing is added, removed or reworded: the
   * same trailer, the same separator row, in front of the execution unit rather
   * than behind it. Every other component keeps it at the foot, unchanged. */
  const trailer = `Route: ${ROUTE.routeKeys.join(" ; ")}`;
  const lastDrawn = L.reduce((last, line, index) => (line === "" ? last : index), -1);
  const closesOnAnOfficersBlock = lastDrawn >= 0 && OFFICER_EXECUTION_LINE.test(L[lastDrawn]);
  const unitStart = closesOnAnOfficersBlock ? L.findIndex((line) => EXECUTION_UNIT_OPENER.test(line)) : -1;
  if (unitStart >= 0) L.splice(unitStart, 0, trailer, "");
  else L.push("", trailer);
  return L.join("\n");
}

function composedMap(componentId) {
  const writes = [];
  const refusals = [];
  const w = (id, label, factId) => writes.push(mapWrite(componentId, id, label, factId));
  const rbf = (id, label, what, why) => refusals.push(mapRbf(componentId, id, label, what, why));
  const prot = (id, label, why) => refusals.push(mapProtected(componentId, id, label, why));

  const captionRbf = () => {
    rbf("deferral_court", "Court in the caption - the court that deferred the proceedings and imposed probation, and its county",
      "the name of the court that deferred your proceedings and imposed probation, and its county - the office of that court can confirm both",
      "which court entered the deferral is a case fact on a record the platform has not seen");
    rbf("case_number", "Case number of the deferred charge",
      "the case number of the deferred DUI charge, copied from the court record",
      "no case identifier is held for a record the platform has not seen");
  };

  if (componentId === "primary_filing") {
    w("defendant_name", "Defendant named in the caption of this motion", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the defendant in the contact block at the foot of the motion", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the defendant in the contact block at the foot of the motion", "participant.street_address");
    w("telephone", "Telephone number of the defendant in the contact block at the foot of the motion", "participant.phone");
    w("email", "Email address of the defendant in the contact block at the foot of the motion", "participant.email");
    captionRbf();
    rbf("arrest_date", "Date of arrest on the deferred charge",
      "the date of the arrest, taken from the case papers",
      "no arrest fact is held for a record the platform has not seen");
    rbf("arresting_agency", "Name of the agency that made the arrest",
      "the name of the agency that made the arrest, taken from the case papers",
      "an agency name is a case fact the participant obtains from the record, not a field the court owns");
    rbf("deferral_order_date", "Date of the order deferring proceedings and imposing probation",
      "the date of the deferral order, copied from the certified copy the records checklist names",
      "no order fact is held for a record the platform has not seen");
    rbf("probation_term", "Length of the probation term the court imposed",
      "the probation term, copied from the deferral order",
      "no probation fact is held for a record the platform has not seen");
    rbf("program_completion_date", "Date of successful completion of the Motor Vehicle Alcohol Test and Lock Program",
      "the completion date, exactly as the Division of Motor Vehicles certification states it",
      "the completion date belongs to the Division of Motor Vehicles certification, which the participant obtains");
    prot("defendant_signature", "Signature of the defendant on the motion", "the defendant signs the motion personally");
    prot("signature_date", "Date beside the defendant's signature on the motion", "a date written before the motion is signed would be false");
  } else if (componentId === "supporting_affidavit") {
    w("affiant_name", "Affiant named in this affidavit", "participant.full_legal_name");
    rbf("deferral_court", "Court in the caption of the affidavit - the court that deferred the proceedings, and its county",
      "the same court and county as on the motion this affidavit supports",
      "which court entered the deferral is a case fact on a record the platform has not seen");
    rbf("case_number", "Case number of the deferred charge, on the affidavit caption",
      "the same case number as on the motion",
      "no case identifier is held for a record the platform has not seen");
    rbf("program_completion_date", "Date of successful completion of the program, as the certification states it",
      "the completion date, exactly as the Division of Motor Vehicles certification states it",
      "the completion date belongs to the certification the participant obtains");
    rbf("compliance_statement", "Your own statement of your completion of the program and your compliance with its conditions",
      "your own first-hand account of completing the program and complying with its conditions - these lines are yours alone",
      "the affidavit is the defendant's own sworn statement, which Sec. 17C-5-2b(c) requires, and the platform writes none of it");
    prot("affiant_signature", "Signature of the affiant on the affidavit", "the affiant swears and signs before a notary public or other authorized officer");
    prot("affidavit_date", "Date beside the affiant's signature on the affidavit", "a date written before the affidavit is sworn would be false");
    prot("jurat", "Jurat block completed by the officer who administers the oath", "the jurat belongs to the notary public or other authorized officer, never to the participant or this packet");
  } else if (componentId === "secondary_filing") {
    w("applicant_name", "Applicant named in the caption of this application", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the applicant in the contact block at the foot of the application", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the applicant in the contact block at the foot of the application", "participant.street_address");
    w("telephone", "Telephone number of the applicant in the contact block at the foot of the application", "participant.phone");
    w("email", "Email address of the applicant in the contact block at the foot of the application", "participant.email");
    captionRbf();
    rbf("dismissal_date", "Date of the order of dismissal and discharge",
      "the date of the dismissal and discharge order, copied from the certified copy",
      "no order fact is held for a record the platform has not seen");
    rbf("probation_expiry_date", "Date the probation term expired, as confirmed in writing",
      "the date your probation term expired, from the supervising probation office's or the court office's written confirmation - the one-year clock runs from this date, not from the dismissal",
      "the probation expiry lives on a record the platform has not seen, and the statute measures the one-year period from it");
    prot("applicant_signature", "Signature of the applicant on the application", "the applicant signs the application personally");
    prot("application_date", "Date beside the applicant's signature on the application", "a date written before the application is signed would be false");
  } else if (componentId === "supporting_timeline") {
    w("applicant_name", "Applicant named on the timeline", "participant.full_legal_name");
    rbf("deferral_order_date", "Date of the order deferring proceedings and imposing probation, on the timeline",
      "the deferral order date, copied from the certified copy",
      "no order fact is held for a record the platform has not seen");
    rbf("probation_term", "Length of the probation term, on the timeline",
      "the probation term, copied from the deferral order",
      "no probation fact is held for a record the platform has not seen");
    rbf("probation_expiry_date", "Date the probation term expired, on the timeline",
      "the probation expiry date, from the written confirmation the records checklist names",
      "the probation expiry lives on a record the platform has not seen");
    rbf("dismissal_date", "Date of the dismissal and discharge order, on the timeline",
      "the dismissal order date, copied from the certified copy",
      "no order fact is held for a record the platform has not seen");
    rbf("earliest_filing_date", "Earliest date the application may be filed - one year after the probation term expired",
      "the probation expiry date plus one year, computed from the confirmed expiry date",
      "the computation depends on a date the platform does not hold, so the participant computes it from the confirmed record");
  } else if (componentId === "certificate_of_service") {
    w("certifier_name", "Person certifying service, named on this certificate", "participant.full_legal_name");
    rbf("filing_served", "Title of the filing served with this certificate",
      "which of the two filings this certificate accompanies - the Sec. 17C-5-2b(c) motion or the Sec. 17C-5-2b(g) application; complete a separate certificate for each",
      "which unit is being served depends on which stage the participant has reached, which the platform does not know");
    rbf("prosecutor_address", "Name and office mailing address of the prosecuting attorney served",
      "the name and current office mailing address of the prosecuting attorney of the county where the case is pending - the office of the court that deferred the proceedings can provide it",
      "the platform holds no address for the prosecuting attorney and the participant writes it from the current published address before service");
    prot("service_date", "Date of service of the copy", "a date written before the copy is actually served would be false");
    prot("certifier_signature", "Signature on the certificate of service", "the certificate is signed when the copy actually goes out");
  } else if (componentId === "records_checklist") {
    w("participant_name", "Person the checklist is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the filing instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/WV.memo.json", track: "wv_dui_deferral_expungement", readAtSource: "2026-08-06" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "wv_dui_deferral_expungement-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "W. Va. Code § 17C-5-2b", url: "https://code.wvlegislature.gov/17C-5-2b/", retrievedOn: "2026-08-06" },
    { title: "W. Va. Code § 17C-5-2", url: "https://code.wvlegislature.gov/17C-5-2/", retrievedOn: "2026-08-06" },
    { title: "W. Va. Code § 61-11-25", url: "https://code.wvlegislature.gov/61-11-25/", retrievedOn: "2026-08-06" },
    { title: "West Virginia Judiciary — Court Forms index", url: "https://www.courtswv.gov/public-resources/court-forms", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "No West Virginia Judiciary form exists for either the § 17C-5-2b(c) motion to dismiss or the § 17C-5-2b(g) "
    + "application to expunge. The legal-design record reads the Court Forms index at source on 2026-08-06: it "
    + "publishes exactly five expungement forms (SCA-C900, SCA-C903, SCA-C906, SCA-C907, SCA-C912), none a "
    + "§ 17C-5-2b filing. Both units are therefore composed pleadings, and the MASTER_QUEUE row agrees: "
    + "officialFormFamily NONE, implementationStrategy custom_pleading, forms [], boundCount 0. Whether an "
    + "unpublished local form is used in some courts was not tested and travels as a counsel question.",
  whatThisReceiptDoesNotEstablish: [
    "that no unpublished local form is used in any West Virginia court for a § 17C-5-2b filing",
    "that any output is approved for participant delivery",
    "that any record is eligible for relief under W. Va. Code § 17C-5-2b"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "The two units of this composed family are both rendered, each naming its own statutory subsection in its "
    + "title and body — the motion names § 17C-5-2b(c), the application names § 17C-5-2b(g) — which is where the "
    + "route determination lives. The sequence between them is fixed by statute, not elected: the application "
    + "cannot be filed until the dismissal has been entered and a year has run from the probation expiry, and the "
    + "instructions state that sequence rather than asking the participant to choose."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "No West Virginia Judiciary form exists for either filing — the Court Forms index publishes five expungement forms and none of them is a § 17C-5-2b filing — so every page in this packet is a composed pleading grounded on the statute's recorded requirements.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on a court record, a Division of Motor Vehicles certification, or a probation office confirmation the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "**The sequence matters.** Stage one is the motion to dismiss (with your affidavit and the DMV certification). Stage two is the application to expunge, and it cannot be filed until the dismissal has been entered AND one year has run from the date your probation term EXPIRED — from the probation expiry, not from the dismissal."
  ],
  componentBlurbs: {
    primary_filing: "the composed stage-one motion to dismiss the charges under § 17C-5-2b(c)",
    supporting_affidavit: "the defendant's affidavit § 17C-5-2b(c) expressly requires, left unsworn for you to swear before a notary public or other authorized officer",
    secondary_filing: "the composed stage-two application to expunge under § 17C-5-2b(g)",
    supporting_timeline: "the timeline computing the one-year period from the expiration of the probation term",
    certificate_of_service: "the certificate of service on the prosecuting attorney — one completed for each stage",
    records_checklist: "the four records you must obtain, each with the office that issues it",
    filing_instructions: "the sequence, its two clocks, the hard limits, and when to stop"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Division of Motor Vehicles certification of successful completion of the Motor Vehicle Alcohol Test and Lock Program — § 17C-5-2b(c) requires the motion to be supported by it, so it is attached before you file stage one | West Virginia Division of Motor Vehicles |",
    "| Certified copy of the order deferring proceedings and imposing probation | office of the court that entered it |",
    "| Certified copy of the order of dismissal and discharge (stage two) | office of the court that entered it |",
    "| Written confirmation of the date your probation term expired (stage two) | the supervising probation office, or the office of the court |"
  ],
  stepsLines: [
    "1. **Gather the records** the records checklist names.",
    "2. **Fill in every dotted blank** for the stage you are filing. Do not guess a date.",
    "3. **Stage one:** sign the motion, swear the affidavit before a notary public or other authorized officer, attach the DMV certification, file with the court that deferred the proceedings, and serve a copy on the prosecuting attorney using a certificate of service. The prosecuting attorney has 30 days after service to object; in the absence of objections the court shall dismiss.",
    "4. **Stage two, no sooner than one year after your probation term expired:** sign the application, attach the supporting timeline, file with the same court, and serve a copy on the prosecuting attorney with a fresh certificate of service. Objections may be filed within 30 days after service; a hearing happens only if objections are filed.",
    "5. **Money.** § 17C-5-2b charges no fee for either motion. Under § 17C-5-2b(h) court costs are payable as though on conviction and may have been a condition of probation. Whether any filing cost is collected on these papers is not stated by any record this packet is built from — ask the office of the court that deferred the proceedings before filing."
  ],
  blanksLines: [
    "- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually served — would be false.",
    "- **The affidavit's jurat.** It belongs to the notary public or other officer who administers the oath.",
    "- **Every line of your compliance statement.** The affidavit is your own sworn account.",
    "- **The prosecuting attorney's office address.** You write it from the current published address; the office of the court that deferred the proceedings can provide it."
  ],
  stopsLines: [
    "- the charge is live and you have not yet notified the court of an intention to participate in a deferral — that 30-day window is charge-stage criminal defence and closes quickly;",
    "- you hold a commercial driver's licence or operate commercial motor vehicles;",
    "- a court entered an order finding you refused the secondary chemical test;",
    "- your licence had previously been revoked for a same-elements offence anywhere;",
    "- any other serious-traffic-article offence was charged in the same prosecution;",
    "- you have any prior felony conviction, which bars the stage-two application outright;",
    "- anyone has alleged a serious or repeated probation violation, or the prosecutor objects and a hearing is set;",
    "- you did not complete, or were removed from, the test and lock program;",
    "- your file is stale — the program was completed years ago and no dismissal order was ever entered;",
    "- your chief concern is the driving record, which this route never clears;",
    "- firearm rights, immigration, professional licensing, or federal, tribal, military or out-of-state records questions."
  ],
  notLines: [
    "This is a prepared set of composed pleadings and process pages. It is not an official West Virginia Judiciary form — none exists for § 17C-5-2b, which is why these pages are composed — and it is not legal advice, it is not filed for you, and it does not decide whether the court will dismiss or expunge. The Division of Motor Vehicles record is never expunged by an order under this section."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources and the legal-design record establishes, from the Court Forms "
      + "index read at source on 2026-08-06, that no West Virginia Judiciary form exists for either § 17C-5-2b "
      + "unit: the index publishes exactly five expungement forms and none is a § 17C-5-2b filing.",
    consequence:
      "Both units are composed pleadings, exactly as the packet-set manifest and the MASTER_QUEUE row direct "
      + "(implementationStrategy custom_pleading, officialFormFamily NONE). No form was substituted and none was "
      + "invented; whether an unpublished local form exists in some courts travels as a counsel question."
  },
  {
    finding:
      "Section 17C-5-2b creates two separate participant-facing submissions with different required contents, "
      + "different objection windows and different legal effects, and the second — the § 17C-5-2b(g) application — "
      + "cannot be filed until a year has run from the EXPIRATION OF PROBATION, not from the dismissal, and is "
      + "barred outright to anyone previously convicted of a felony.",
    consequence:
      "The packet renders both units with the sequence and both 30-day windows stated, the supporting timeline "
      + "computes the one-year period from the probation expiry, the felony bar is printed on the application's own "
      + "face beside the signature instruction, and a separate certificate of service is completed for each unit."
  },
  {
    finding:
      "No Division of Motor Vehicles record may be expunged by virtue of an order entered pursuant to "
      + "§ 17C-5-2b (W. Va. Code § 61-11-25(a)), a hard limit the legal-design record requires to be disclosed.",
    consequence:
      "The application states expressly that no DMV record is sought or reached, and the filing instructions "
      + "state that the criminal record can be cleared while the driving record cannot, with a stop condition for "
      + "participants whose chief concern is the driving record."
  },
  {
    finding:
      "Every case fact on this route lives on a court record, a DMV certification or a probation office "
      + "confirmation the platform has not seen.",
    consequence:
      "The platform writes only the participant's own identity and contact facts. Every case fact is a labelled "
      + "dotted blank declared REQUIRED_BEFORE_FILING, disclosed by its printed label, with the issuing office "
      + "named as the checkable authority in the records checklist."
  },
  {
    finding:
      "Three questions the legal-design record marks unresolved: whether the § 17C-5-2b(c) motion is still the "
      + "right vehicle for a stale file where no dismissal order was ever entered; whether relief under "
      + "§ 17C-5-2b counts against the § 61-11-26(o) once-per-lifetime limit; and whether any unpublished local "
      + "form exists.",
    consequence:
      "None is answered by this build. The stale-file condition is a printed stop condition, the once-per-lifetime "
      + "question travels to counsel in approval-request.json, and the packet asserts nothing about either."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "No Judiciary form exists for either § 17C-5-2b unit per the Court Forms index read 2026-08-06. Confirm the composed motion and application are sufficient, and whether any unpublished local form is used in some courts.",
    "Where a participant completed the test and lock program years ago but no order of dismissal was ever entered, is the § 17C-5-2b(c) motion still the correct vehicle, or does a stale file require counsel? The packet prints this as a stop condition.",
    "Does relief under § 17C-5-2b count against the once-per-lifetime limit in § 61-11-26(o)? The textual reading is that they are separate limits, but a participant deciding whether to spend their one lifetime petition needs a settled answer.",
    "Confirm that the § 17C-5-2b(g)(1) prior-felony bar is screened as a threshold question and bars only the subsection (g) expungement, not the subsection (c) dismissal — the packet prints the bar on the application's face."
  ],
  mattersForTheReviewersAttention: [
    "The one-year clock is computed from the expiration of probation, not the dismissal — the supporting timeline exists to force that computation onto the confirmed record.",
    "The DMV-record hard limit is disclosed in the application body and the filing instructions; confirm the disclosure is legible.",
    "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
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
  /* The same 45 rows a page this composer has always drawn: the old loop broke
   * when the next baseline fell below the bottom margin, and this is that count
   * stated once instead of rediscovered per page. */
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  /* The one separator-aware splitter, shared, in place of the private
   * character-accumulating copy this builder carried. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
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

  /* The route trailer is internal machine metadata rather than pleading text,
   * and it must never be the only thing on a delivered page: the affidavit
   * ended on a sheet carrying the second half of the wrapped trailer -
   * "obligation:unit:WV:wv_dui_deferral_expungement:wv-dui-deferral-unit-2-application-to-expunge"
   * - and nothing else, a bare machine identifier with not even the "Route:"
   * label to say what it was. The layout is settled first so that page can be
   * caught while it is still a plan, and whole blocks are pulled down until the
   * last page carries something a reader can read. This is the sole-occupant
   * pull-down scripts/build-census-v1-rcap-ok-custom-pleading.mjs already
   * carries, moved onto this composer's own row-by-row pagination rather than a
   * new scheme: where the rows fall is unchanged, blocks move whole or not at
   * all, and a move that would not fit is refused. */
  const TRAILER_LINE = /^Route: /;
  /* THE CLOSING EXECUTION UNIT IS ONE BLOCK, AND IT IS NEVER SPLIT.
   *
   * The pull-down above moves whole blocks, and a block was one source line, so
   * the notary's own execution line was a block of its own and the pull-down
   * elected it as the trailer's companion. VF07 read the result off the
   * delivered bytes: page 3 ended on "Taken, subscribed and sworn to before me
   * this ...... day of .................., 20......" with three row slots still
   * free, and page 4 was a bare sheet carrying the officer's signature rule and
   * the route trailer under it - no caption, no case number, no affiant.
   *
   * A third party's execution line is never a companion now, because it is no
   * longer a block that can be moved on its own: the affiant's signature line,
   * the date line, the sentence saying the block below belongs to the officer,
   * the jurat and the officer's rule are one block, and a block that fits on a
   * page is not split across a page break. The unit moves whole or stays where
   * it is. This is the block boundary the Oklahoma composer already keeps
   * (Rule 1b there); the pagination underneath it is untouched - the same rows,
   * wrapped by the same rule, on the same 45-row pages. */
  const source = sanitizePdfText(fullText).split("\n");
  const lastDrawn = source.reduce((last, line, index) => (line === "" ? last : index), -1);
  const unitStart = lastDrawn >= 0 && OFFICER_EXECUTION_LINE.test(source[lastDrawn])
    ? source.findIndex((line) => EXECUTION_UNIT_OPENER.test(line))
    : -1;
  const blocks = [];
  for (let i = 0; i < source.length; i++) {
    if (i === unitStart) {
      const rows = [];
      for (let j = unitStart; j <= lastDrawn; j++) rows.push(...wrap(source[j]));
      blocks.push({ index: blocks.length, rows, trailer: false, execution: true });
      i = lastDrawn;
      continue;
    }
    blocks.push({ index: blocks.length, rows: wrap(source[i]), trailer: TRAILER_LINE.test(source[i]), execution: false });
  }
  const pages = [[]];
  for (const block of blocks) {
    let page = pages[pages.length - 1];
    if (block.execution && block.rows.length <= rowsPerPage && page.length + block.rows.length > rowsPerPage) {
      pages.push([]); page = pages[pages.length - 1];
    }
    for (const text of block.rows) {
      if (page.length === rowsPerPage) { pages.push([]); page = pages[pages.length - 1]; }
      page.push({ text, block: block.index, trailer: block.trailer });
    }
  }
  const soleOccupant = (rows) => rows.length > 0 && rows.every((r) => r.trailer || r.text === "");
  for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
    const last = pages[pages.length - 1];
    const previous = pages[pages.length - 2];
    const moving = previous[previous.length - 1].block;
    const moved = [];
    while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
    if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
    last.unshift(...moved);
    if (previous.length === 0) pages.splice(pages.length - 2, 1);
  }
  assert.equal(soleOccupant(pages[pages.length - 1]), false,
    `${title}: the delivered packet still ends on a page carrying only the route trailer`);
  /* Proof, not intention, read off the settled layout: every drawn row of the
   * closing execution unit landed on one page, and no machine text was drawn on
   * that page at all. */
  const executionBlock = blocks.find((block) => block.execution);
  if (executionBlock && executionBlock.rows.length <= rowsPerPage) {
    const onPages = pages.flatMap((rows, index) => rows
      .filter((r) => r.block === executionBlock.index && r.text !== "").map(() => index));
    for (const index of onPages) {
      assert.equal(index, onPages[0],
        `${title}: the closing execution unit was split across a page break`);
    }
    assert.equal(pages[onPages[0]].some((r) => r.trailer), false,
      `${title}: the route trailer was drawn on the page that carries the officer's execution block`);
  }

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rows) {
      if (row.text) page.drawText(row.text, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  /* Nothing in this family's text is long enough to need chopping, and the
   * assertion says so rather than assuming it: a future route key with no
   * separator to break on fails the build instead of shipping unreadable. */
  assert.equal(splitToken.hardSplits, 0, `${title}: a token was hard-split with no separator to break on`);
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
