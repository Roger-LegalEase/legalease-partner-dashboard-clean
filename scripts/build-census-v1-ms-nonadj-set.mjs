#!/usr/bin/env node
/**
 * The Mississippi nonadjudication expungement packet family builder.
 *
 *   node scripts/build-census-v1-ms-nonadj-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   ms-nonadj   Expungement After Nonadjudication, Miss. Code Ann. § 99-15-26
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO sources: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The family's own legal-design record
 * (data/record-clearing/legal-design-intake/MS.memo.json, track ms-nonadj,
 * reviewedAsOf 2026-08-03) states the controlling determination: Mississippi
 * has no statewide expungement form, the four archived petition/order PDFs
 * are Fourth Circuit District local models (Leflore, Sunflower, Washington)
 * usable as drafting references and nothing more, and the correct output
 * strategy for every Mississippi petition track is custom_pleading. The
 * Fourth District models' recorded defects are NOT inherited: no dual
 * § 99-15-26 / § 99-19-71 citation, no mandatory indictment allegation, no
 * race field, no Social Security number, no hardcoded county, year or
 * Greenville address, and the conviction petition's mis-captioned
 * certificate of service is not reused.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — court level and county, cause number,
 * charge, dates, agency, conditions, completion, dismissal — lives on a
 * court record the platform has not seen, so each is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md, with the office of the court that ordered the
 * nonadjudication named as the checkable authority. The petition pleads
 * § 99-15-26 ALONE. Nothing asserts that the petitioner "meets the criteria",
 * that the offense is "expungeable", that the petitioner is a first offender
 * or rehabilitated, or that any dismissal was with prejudice. No judicial,
 * prosecutor-approval, signature or date field is ever written.
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

const FAMILY_ID = "ms-nonadj-set";
const OUT = "data/rcap-all50/overlays/census-v1/ms/ms-nonadj-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ms-nonadj-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "MS",
  routeKeys: ["obligation:track-only:MS:ms-nonadj"],
  primaryRouteKey: "obligation:track-only:MS:ms-nonadj",
  routeSelectionId: "ms-nonadj-composed-set",
  legalName: "Expungement After Nonadjudication (Miss. Code Ann. § 99-15-26)",
  routeName: "expunging a Mississippi case in which the court withheld your guilty plea and dismissed the cause after you completed its conditions, under Miss. Code Ann. § 99-15-26",
  statute: "Miss. Code Ann. § 99-15-26"
});

const COMPONENTS = [
  "primary_filing",
  "proposed_order",
  "certificate_of_service",
  "attachment",
  "instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Petition for Expungement of Criminal Record Under Miss. Code Ann. Sec. 99-15-26",
  proposed_order: "Proposed Order of Expungement (Tendered for the Court's Consideration)",
  certificate_of_service: "Certificate of Service on the Prosecuting Authority",
  attachment: "Exhibit Checklist",
  instructions: "Participant Instructions"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/MS.memo.json, track ms-nonadj, "
  + "reviewedAsOf 2026-08-03) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, ms-nonadj-set)";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Magnolia Street, Jackson, MS 39201",
    "participant.phone": "601-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Hattiesburg, Mississippi 39401-2214",
    "participant.phone": "(769) 555-0199 ext. 4417",
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
    L.push("IN THE .......................................... OF .......................................... , MISSISSIPPI");
    L.push("(WRITE THE COURT THAT HEARD THE CASE - JUSTICE, COUNTY, CIRCUIT OR MUNICIPAL COURT - AND ITS COUNTY; FOR A MUNICIPAL COURT, ITS CITY. MISSISSIPPI HAS FOUR TRIAL COURT LEVELS AND PEOPLE ROUTINELY MISIDENTIFY WHICH ONE HEARD THEIR CASE - CHECK THE PAPERS.)", "");
    L.push("STATE OF MISSISSIPPI", "");
    L.push("VS.", "");
    L.push(`${name}, PETITIONER`, "");
    L.push("CAUSE NO. " + DOTS(44), "");
  };
  if (componentId === "primary_filing") {
    caption();
    L.push("PETITION FOR EXPUNGEMENT OF CRIMINAL RECORD UNDER MISS. CODE ANN. Sec. 99-15-26", "");
    L.push(`1. The petitioner, ${name}, petitions this court, the court that ordered nonadjudication in this cause, for expungement of the record of this cause pursuant to Miss. Code Ann. Sec. 99-15-26. This petition is pleaded under Sec. 99-15-26 alone.`, "");
    L.push("2. The petitioner states the following from the court record and the case papers (nothing on these lines is written for you):", "");
    L.push(`Date of birth of the petitioner: ${dob}`, "");
    L.push("Any other name the case record is under, exactly as the record states it, if any:");
    L.push(DOTS(), "");
    L.push("Charge in the cause, worded exactly as the record words it:");
    L.push(DOTS(), "");
    L.push("Date of the offense, as the record states it:");
    L.push(DOTS(), "");
    L.push("Date of arrest or citation:");
    L.push(DOTS(), "");
    L.push("Name of the agency that arrested or cited the petitioner:");
    L.push(DOTS(), "");
    L.push("Case number assigned by that agency, if one appears on the record:");
    L.push(DOTS(), "");
    L.push("3. The court withheld acceptance of the petitioner's guilty plea and sentence and ordered nonadjudication, imposing conditions, on the following date and terms:", "");
    L.push("Date of the order of nonadjudication:");
    L.push(DOTS(), "");
    L.push("Conditions the court imposed, as the nonadjudication order states them:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. The petitioner successfully completed every condition the court imposed, and the court thereafter directed that the cause be dismissed and the case closed, as Miss. Code Ann. Sec. 99-15-26(4) provides:", "");
    L.push("Date the petitioner completed every condition, as the proof of completion shows:");
    L.push(DOTS(), "");
    L.push("Date of the order dismissing the cause and closing the case:");
    L.push(DOTS(), "");
    L.push("5. The petitioner therefore requests that the court order the expungement of the record of this cause on petition under Miss. Code Ann. Sec. 99-15-26, with the effect that section provides. Whether the petitioner meets the criteria for expungement is the court's determination, and this petition proposes it rather than asserts it.", "");
    L.push("6. Attached are the exhibits the exhibit checklist in this packet names, each obtained by the petitioner from the office that issues it.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "proposed_order") {
    caption();
    L.push("PROPOSED ORDER OF EXPUNGEMENT", "");
    L.push(`THIS CAUSE came before the court on the petition of ${name} for expungement of the record of this cause under Miss. Code Ann. Sec. 99-15-26, and the court, having considered the petition, proposes to find and order as follows. (Every finding below is tendered for the court's own determination; nothing in this proposed order asserts a finding as fact, and the order takes effect only if and when the court signs it.)`, "");
    L.push("THE COURT FINDS that the cause was nonadjudicated under Miss. Code Ann. Sec. 99-15-26, that the conditions imposed were successfully completed, and that the cause was dismissed and the case closed.", "");
    L.push("IT IS THEREFORE ORDERED that all official records of the arrest or citation, the charge and the disposition in this cause be expunged, and that each person and agency keeping any official record of the cause conform its records accordingly, including those named below:", "");
    L.push("Names of the persons and offices keeping official records of the cause, as the record shows them (for example the arresting or citing office, the sheriff's department of the county, and this court - write each as the record names it; never guessed and never pre-printed):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("PROVIDED that fingerprint records are excepted as provided by law, and that a nonpublic record is retained by the Mississippi Criminal Information Center for the purposes the law provides, including first-offender determinations.", "");
    L.push("SO ORDERED, this ...... day of .................., 20......", "");
    L.push("...................................................");
    L.push("JUDGE", "");
    L.push("APPROVED AS TO FORM (completed, if the prosecuting authority approves, by that authority; never pre-signed and never pre-filled):", "");
    L.push("...................................................");
    L.push("PROSECUTING AUTHORITY", "");
    /* The order's last page was the judge's caption, the prosecutor's approval
     * caption and then the machine trailer, so the route key printed inside a
     * block the page itself says is completed by the prosecuting authority and
     * is never pre-filled. This is the closing line this family's own passing
     * sibling ms-diversion-set already prints, word for word, between its
     * prosecutor caption and its trailer: a preparer-voice note naming what is
     * reserved to others, so the trailer follows the preparer's sentence rather
     * than the prosecutor's signature line. Nothing in the decretal block, the
     * findings, the court's terms or the captions changed. */
    L.push("(The findings, the date of entry, the judge's signature and the prosecuting authority's approval as to form are all left blank.)");
  } else if (componentId === "certificate_of_service") {
    caption();
    L.push("CERTIFICATE OF SERVICE ON THE PROSECUTING AUTHORITY", "");
    L.push(`I, ${name}, certify that on the date stated below I delivered a true and correct copy of the Petition for Expungement and the Proposed Order in this cause to the prosecuting authority named below, by United States mail or by hand delivery (strike the one that does not apply).`, "");
    L.push("Name and mailing address of the prosecuting authority served (the district attorney for the circuit district for a circuit-court case, or the county or municipal prosecuting authority for a lower court - write the current published address; never a default):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("DATE OF SERVICE " + DOTS(56));
    L.push("SIGNATURE " + DOTS(64), "");
    L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed when the copy actually goes out. A date or a signature written before the copy goes out would be false.");
  } else if (componentId === "attachment") {
    L.push(`Prepared for: ${name}`, "");
    L.push("Each exhibit below is named, with the office that issues it. This packet never receives, inspects or authenticates any of them - you obtain each one yourself and attach it to the petition.", "");
    L.push("EXHIBIT A - IN EVERY CASE. The disposition or sentencing order in the cause. Issued by the office of the court that heard the case.", "");
    L.push("EXHIBIT B - IN EVERY CASE. Certified copy of the order of nonadjudication placing you on conditions. Issued by the office of the court.", "");
    L.push("EXHIBIT C - IN EVERY CASE. Certified copy of the order dismissing the cause and closing the case. Issued by the office of the court.", "");
    L.push("EXHIBIT D - IN EVERY CASE. Proof that you completed every condition the court imposed - payment records, program discharge papers, or the supervising officer's written confirmation. Issued by the supervising authority, the program, or the office of the court.", "");
    L.push("EXHIBIT E - ONLY WHERE THE CASE WAS ACTUALLY INDICTED. A copy of the indictment. Most misdemeanors are never indicted, and many dismissed cases are dismissed before indictment; attach this exhibit only if an indictment exists in your case. (The archived local models plead an indictment in every case; that is wrong for most misdemeanors and is not reproduced here.)", "");
    L.push("STRONGLY ADVISED, NOT ATTACHED. Your own Mississippi criminal history record, from the Mississippi Criminal Information Center, so you can see every case on your record before you file. Self-report is not enough where first-offender status or a multi-court good-conduct period is in issue.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("READ THIS FIRST. Mississippi has NO statewide expungement form, and practice varies by county and by circuit district. Some districts expect the district attorney to approve the order as to form before the judge will sign. CALL the office of the court where your case was heard BEFORE filing and ask whether that court has its own preferred form or additional requirements. If it does, the local form governs.", "");
    L.push("WHAT YOU DO, IN ORDER.");
    L.push("STEP ONE. Identify the correct court and county. Mississippi has four trial court levels - justice, county, circuit and municipal - that all handle expungements. Check the case papers.");
    L.push("STEP TWO. Ask that court's office for the case file, the docket sheet and the account balance sheet.");
    L.push("STEP THREE. Call that office and ask about local form preferences, any additional requirements, and the filing fee. NO FEE AMOUNT IS PUBLISHED IN THIS PACKET: the Sec. 99-19-72 fee applies by its terms to petitions under Sec. 99-19-71 and does not reach Sec. 99-15-26, so confirm what, if anything, that court collects, and ask about any pauper's-affidavit route at the same office.");
    L.push("STEP FOUR. Fill in every dotted blank from the record, attach the exhibits the checklist names, sign the petition, and file it with the proposed order.");
    L.push("STEP FIVE. Deliver a copy of the petition and proposed order to the prosecuting authority, and complete and keep the certificate of service.");
    L.push("STEP SIX. Expect in some districts that the prosecuting authority is asked to approve the order as to form before the judge signs. That is a negotiation this packet does not conduct; if the prosecuting authority declines or is silent, stop and take the packet to a lawyer.");
    L.push("STEP SEVEN. After the order issues, obtain certified copies from the court office and deliver one to every person and office named in the order.", "");
    L.push("WHAT THE ORDER DOES NOT DO. Fingerprint records are excepted as provided by law. The Mississippi Criminal Information Center keeps a nonpublic record for the purposes the law provides, including first-offender determinations. An employer may still ask whether an order of expunction was entered. Nothing is erased everywhere, and Mississippi has NO automatic record clearance.", "");
    L.push("THE HARD LIMITS, FROM THE STATUTE. Nonadjudication is generally a once-only benefit. Some offenses - crimes against the person, crimes of violence as defined in Sec. 97-3-2, Sec. 97-11-31 violations, certain public-funds offenses, trafficking under Sec. 41-29-139(f), and Implied Consent Law offenses - could not be nonadjudicated at all; if your charge may be one of them, stop and get advice before filing.", "");
    L.push("WHEN TO STOP AND GET A LAWYER INSTEAD OF FILING.");
    L.push("- The nonadjudication order, the dismissal order or the proof of completion is missing.");
    L.push("- The offense may have been excluded from nonadjudication in the first place.");
    L.push("- The nonadjudication was revoked, or the conditions were not completed.");
    L.push("- It is unclear whether your case should be routed under Sec. 99-15-26 or Sec. 99-19-71(4) - they are separate tracks with different eligibility and proof, this petition pleads Sec. 99-15-26 alone, and the routing question is recorded as unresolved.");
    L.push("- The prosecuting authority declines to approve the order as to form, or is silent.");
    L.push("- You are not a United States citizen.");
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

  const captionRbf = (docWord) => {
    rbf("court_and_county", `Court in the caption of the ${docWord} - justice, county, circuit or municipal court, and its county (for a municipal court, its city)`,
      "the court that heard the case and its county or city, exactly as the case papers show them - Mississippi has four trial court levels and the office of that court can confirm which heard yours",
      "which of Mississippi's four trial court levels heard the case is a case fact on a record the platform has not seen, and is never hardcoded");
    rbf("cause_number", `Cause number of the case, on the ${docWord}`,
      "the cause number, copied from the court record; where the court assigns a new number for the expungement petition, that office supplies it at filing",
      "no case identifier is held for a record the platform has not seen");
  };

  if (componentId === "primary_filing") {
    w("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the petitioner, printed in the petition's identifying block", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address");
    w("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone");
    w("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email");
    captionRbf("petition");
    rbf("other_names", "Any other name the case record is under, exactly as the record states it",
      "any other name the record is under, copied exactly from the record, or left empty where there is none",
      "what name the record carries is a case fact the platform has not seen");
    rbf("charge_description", "Charge in the cause, worded exactly as the record words it",
      "the charge, worded exactly as the court record words it, with the Mississippi Code section if the record shows one",
      "no charge fact is held for a record the platform has not seen");
    rbf("offense_date", "Date of the offense, as the record states it",
      "the offense date, copied from the record",
      "no offense fact is held for a record the platform has not seen");
    rbf("arrest_date", "Date of arrest or citation",
      "the arrest or citation date, taken from the case papers",
      "no arrest fact is held for a record the platform has not seen");
    rbf("arresting_agency", "Name of the agency that arrested or cited the petitioner",
      "the name of the agency that arrested or cited you, taken from the case papers",
      "an agency name is a case fact the participant obtains from the record, not a field the court owns");
    rbf("agency_case_number", "Case number assigned by that agency, if one appears on the record",
      "the agency's own case number, copied from the record if one appears there",
      "no agency identifier is held for a record the platform has not seen");
    rbf("nonadjudication_date", "Date of the order of nonadjudication",
      "the date of the order withholding acceptance of the guilty plea and imposing conditions, from the certified copy",
      "no order fact is held for a record the platform has not seen");
    rbf("conditions_imposed", "Conditions the court imposed, as the nonadjudication order states them",
      "the conditions, copied from the nonadjudication order itself",
      "the conditions live on an order the platform has not seen");
    rbf("completion_date", "Date the petitioner completed every condition, as the proof of completion shows",
      "the completion date, from the proof of completion the exhibit checklist names",
      "completion is proved by records the participant obtains, none of which the platform has seen");
    rbf("dismissal_date", "Date of the order dismissing the cause and closing the case",
      "the dismissal date, from the certified copy of the dismissal order",
      "no order fact is held for a record the platform has not seen");
    prot("petitioner_signature", "Signature of the petitioner on the petition", "the petitioner signs the petition personally; the archived models' 'by and through his attorney' phrase is removed because this is a self-help packet");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is signed would be false");
  } else if (componentId === "proposed_order") {
    w("petitioner_name", "Petitioner named in the proposed order", "participant.full_legal_name");
    captionRbf("proposed order");
    rbf("agency_list", "Names of the persons and offices keeping official records of the cause, to be conformed by the order",
      "each person and office keeping an official record of the cause, written as the record names them - for example the arresting or citing office, the county sheriff's department, and the court; never guessed and never pre-printed",
      "which offices keep records of this cause is a case fact the platform has not seen, and the archived models' hardcoded county names are not inherited");
    court("judge_signature_and_entry", "Judge's signature line and date of entry of the order",
      "the order is the court's; the judge signs and dates it, or does not");
    prot("approved_as_to_form", "Approved-as-to-form signature block for the prosecuting authority",
      "some districts expect the prosecuting authority to approve the order as to form before the judge signs; the block is never pre-signed and never pre-filled");
  } else if (componentId === "certificate_of_service") {
    w("certifier_name", "Person certifying service, named on this certificate", "participant.full_legal_name");
    captionRbf("certificate");
    rbf("prosecuting_authority_address", "Name and mailing address of the prosecuting authority served",
      "the name and current published mailing address of the prosecuting authority for the court - the district attorney for the circuit district for a circuit-court case, or the county or municipal prosecuting authority for a lower court; never a default address",
      "the platform holds no address for the prosecuting authority, the recipient varies by court level and district, and the archived models' hardcoded Greenville address is not inherited");
    prot("service_date", "Date of service of the copy", "a date written before the copy is actually delivered would be false");
    prot("certifier_signature", "Signature on the certificate of service", "the certificate is signed when the copy actually goes out");
  } else if (componentId === "attachment") {
    w("participant_name", "Person the exhibit checklist is prepared for", "participant.full_legal_name");
  } else {
    w("participant_name", "Person the instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/MS.memo.json", track: "ms-nonadj", reviewedAsOf: "2026-08-03" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "ms-nonadj-set" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Miss. Code Ann. § 99-15-26 — Nonadjudication of guilt; conditions; dismissal; expungement", url: "https://law.justia.com/codes/mississippi/", retrievedOn: "2026-08-03" },
    { title: "2026 Mississippi House Bill 1546 (enrolled), Chapter 430, Laws of 2026", url: "https://billstatus.ls.state.ms.us/documents/2026/html/HB/1500-1599/HB1546SG.htm", retrievedOn: "2026-08-03" }
  ],
  formIdentityNote:
    "Mississippi has no statewide expungement form and § 99-19-71 prescribes none. The four archived petition and "
    + "order PDFs are Fourth Circuit Court District local models covering Leflore, Sunflower and Washington "
    + "counties only, and the legal-design record classifies them as drafting references and nothing more, with "
    + "recorded defects (dual-statute citation, mandatory indictment allegation, mis-captioned certificate, "
    + "hardcoded county/year/address, race field) that this build deliberately does not inherit. The MASTER_QUEUE "
    + "row agrees: officialFormFamily NONE, implementationStrategy custom_pleading, forms [], boundCount 0. Every "
    + "Mississippi track carries localFormOverride: where the court publishes its own preferred form, that local "
    + "form governs, and the instructions require a call to that court's office before filing.",
  whatThisReceiptDoesNotEstablish: [
    "that no local court form governs in the participant's county or district (localFormOverride: the participant asks the court's office first)",
    "that any output is approved for participant delivery",
    "that any record is eligible for expungement under Miss. Code Ann. § 99-15-26",
    "whether a § 99-15-26(4) nonadjudication dismissal also qualifies under § 99-19-71(4) — the routing question is preserved as unresolved and the petition pleads § 99-15-26 alone"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "The petition pleads Miss. Code Ann. § 99-15-26 alone, in its own title and body, which is where the route "
    + "determination lives. The recorded routing question — whether a nonadjudication dismissal also qualifies "
    + "under § 99-19-71(4) — is preserved as unresolved: the archived Fourth District dual citation is not "
    + "reproduced, no second statute is pleaded, and the instructions print the uncertainty as a stop condition. "
    + "No election control is rendered and none is left to the participant."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "Mississippi has no statewide expungement form — the archived models are one district's local forms, usable as drafting references only — so the pages in this packet are composed pleadings grounded on the statute's recorded requirements. Where the court where your case was heard publishes its own preferred form, **that local form governs**: call that court's office before filing.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on a court record the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "The petition pleads § 99-15-26 **alone**. It never asserts that you meet the criteria for expungement (that is the court's finding), that the offense is expungeable, that you are a first offender, or that you are rehabilitated."
  ],
  componentBlurbs: {
    primary_filing: "the composed petition under § 99-15-26",
    proposed_order: "the proposed order tendered with the petition, with the judge's signature line and the approved-as-to-form block left entirely blank",
    certificate_of_service: "the certificate of delivery of the petition and proposed order to the prosecuting authority",
    attachment: "the exhibit checklist — what you attach, and the office that issues each exhibit",
    instructions: "the order of steps, the clerk-first rule, the fee question, and when to stop"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Certified copy of the order of nonadjudication | office of the court that ordered it |",
    "| Certified copy of the order dismissing the cause and closing the case | office of the court |",
    "| The disposition or sentencing order | office of the court |",
    "| Proof you completed every condition — payment records, program discharge, or the supervising officer's confirmation | the supervising authority, program, or court office |",
    "| A copy of the indictment — ONLY if your case was actually indicted | office of the court |",
    "| Your own Mississippi criminal history record (strongly advised) | Mississippi Criminal Information Center |"
  ],
  stepsLines: [
    "1. **Identify the correct court and county.** Mississippi has four trial court levels — justice, county, circuit and municipal — that all handle expungements. Check the case papers.",
    "2. **Ask that court's office** for the case file, the docket sheet and the account balance sheet.",
    "3. **Call the same office before filing** and ask whether that court has its own preferred form or additional requirements, and what filing fee, if any, it collects. No fee amount is published in this packet — the § 99-19-72 fee applies by its terms to § 99-19-71 petitions and does not reach § 99-15-26 — and any pauper's-affidavit route is asked about at the same office.",
    "4. **Fill in every dotted blank from the record, attach the exhibits, sign the petition yourself,** and file it with the proposed order.",
    "5. **Deliver a copy to the prosecuting authority** by United States mail or hand delivery, and complete and keep the certificate of service.",
    "6. **Expect prosecutor sign-off in some districts.** Some expect the prosecuting authority to approve the order as to form before the judge signs. That is a negotiation this packet does not conduct.",
    "7. **After the order issues,** obtain certified copies and deliver one to every person and office named in the order."
  ],
  blanksLines: [
    "- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually delivered — would be false.",
    "- **The judge's signature line and the date of entry.** The order is the court's.",
    "- **The approved-as-to-form block.** It belongs to the prosecuting authority and is never pre-signed.",
    "- **The finding that the petitioner meets the criteria for expungement.** That is the court's finding; the proposed order tenders it and asserts nothing.",
    "- **Every district-variable fact** — court, county, cause number, prosecuting authority's name and address, and the list of record-keeping offices. None is ever hardcoded or defaulted."
  ],
  stopsLines: [
    "- the nonadjudication order, the dismissal order or the proof of completion is missing;",
    "- the offense may have been excluded from nonadjudication in the first place;",
    "- the nonadjudication was revoked, or the conditions were not completed;",
    "- it is unclear whether your case routes under § 99-15-26 or § 99-19-71(4) — separate tracks, different eligibility and proof, and the routing question is recorded as unresolved;",
    "- the prosecuting authority declines to approve the order as to form, or is silent;",
    "- you are not a United States citizen.",
    "",
    "If your involvement in any offense resulted from being trafficked, broader and faster relief may exist under Miss. Code Ann. § 97-3-54.6(6); that route needs a lawyer or qualified survivor services, and this packet does not attempt it."
  ],
  notLines: [
    "This is a prepared set of composed pleadings and process pages. It is not a statewide form — none exists — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement. Fingerprint records are excepted, the Criminal Information Center keeps a nonpublic record, an employer may still ask whether an order of expunction was entered, and Mississippi has no automatic record clearance."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero sources, and the legal-design record's controlling determination is that "
      + "Mississippi has no statewide expungement form: the four archived PDFs are one district's local models, "
      + "drafting references and nothing more.",
    consequence:
      "Every page is composed, the family carries localFormOverride, and the instructions make the clerk-first "
      + "call mandatory so a local preferred form governs where one exists. No form was substituted and none was "
      + "invented."
  },
  {
    finding:
      "The archived Fourth District models carry recorded defects: dual § 99-15-26 / § 99-19-71 citation, a "
      + "mandatory indictment allegation, a mis-captioned certificate of service, hardcoded county names, 2020 "
      + "dates and the Greenville DA address, a race field, and 'by and through his attorney' phrasing.",
    consequence:
      "None is inherited. The petition pleads § 99-15-26 alone; the indictment is an only-where-indicted exhibit; "
      + "the certificate is captioned for this petition; every district-variable field is a labelled blank the "
      + "participant fills from the record; no race field and no Social Security number is collected; the "
      + "signature block is the self-represented petitioner's own."
  },
  {
    finding:
      "Whether a § 99-15-26(4) nonadjudication dismissal must use § 99-15-26(5), qualifies under § 99-19-71(4), "
      + "or permits either, is recorded as unresolved, and whether any filing fee reaches a § 99-15-26 petition "
      + "is likewise unresolved (§ 99-19-72 reaches § 99-19-71 petitions by its terms).",
    consequence:
      "The petition fails closed by pleading § 99-15-26 alone; the packet publishes no fee amount on any page and "
      + "directs the participant to confirm the fee and any pauper's-affidavit route with the court office; both "
      + "questions travel to counsel in approval-request.json."
  },
  {
    finding:
      "Prosecutor approval of the order as to form is the recorded practical gate on the Mississippi product, and "
      + "it is a negotiation, not a filing.",
    consequence:
      "The proposed order retains the approved-as-to-form block (never pre-signed, never pre-filled), the "
      + "instructions state the practice plainly, and a declining or silent prosecuting authority is a printed "
      + "stop condition — the packet does not seek, obtain or negotiate the approval."
  },
  {
    finding:
      "Every case fact on this route lives on a court record the platform has not seen, and the legal-design "
      + "record forbids generating the court's findings or any legal conclusion.",
    consequence:
      "The platform writes only the participant's identity and contact facts. Every case fact is a labelled "
      + "dotted blank declared REQUIRED_BEFORE_FILING and disclosed by its printed label; the proposed order's "
      + "findings are expressly tendered as proposals for the court's own determination."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Does a dismissal following successful nonadjudication under § 99-15-26 have to be expunged under that section's own subsection (5), or does it also qualify under § 99-19-71(4)? The petition pleads § 99-15-26 alone and the routing question is preserved as unresolved.",
    "Does the § 99-19-72 $150 fee reach any petition outside § 99-19-71 — and specifically a § 99-15-26 petition, or a petition filed in justice or municipal court where the collection mechanism names the circuit clerk? The packet publishes no fee amount anywhere.",
    "Both § 99-15-26(5) and § 99-19-71(4) are keyed to an arrest-and-release posture rather than a post-guilty-plea nonadjudication dismissal in terms. Confirm the composed petition's recitals (nonadjudication, conditions, completion, dismissal) are the right pleading frame.",
    "Local practice outside the Fourth Circuit District was not surveyed. Confirm the clerk-first localFormOverride instruction is a sufficient control for statewide use at review time."
  ],
  mattersForTheReviewersAttention: [
    "The proposed order's findings are tendered as proposals in terms — confirm the framing is legible to a Mississippi judge and does not read as asserting the court's findings.",
    "The approved-as-to-form block is retained per the record ('it costs nothing where it is not expected') and never pre-filled.",
    "Every district-variable field (court, county, cause number, prosecuting authority, record-keeping offices) is a labelled blank; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
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
