#!/usr/bin/env node
/**
 * The Wyoming felony-conviction expungement packet family builder.
 *
 *   node scripts/build-census-v1-wy_fel_1502-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading, one track:
 *
 *   wy_fel_1502   Petition for Expungement of Records of Conviction of Certain
 *                 Felonies, Wyo. Stat. § 7-13-1502
 *
 * WHY EVERY PAGE IS COMPOSED, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds ZERO source binaries: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundCount 0. The compiled Wyoming profile records why
 * (packetGenerator.sourceFormStatements[0]): the statewide self-help page
 * "does not appear to provide one complete mandatory petition packet"; it
 * lists an Expungement Handout and explains that the person PREPARES a
 * Petition for Expungement and, if granted, an Order for Expungement for the
 * judge's signature. There is no official form to fill, and none was invented:
 * every page is composed from the committed legal-design record and the
 * codified text it quotes.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 * All four participant-facing obligations are HELD for this route, on two
 * independent committed shelves that agree:
 *
 *   FILING DESTINATION  the clerk of the convicting court.
 *                       WY.memo track wy_fel_1502 rules.filing and
 *                       destination.detail; compiled profile
 *                       packetGenerator.filingDestinationRules[2].
 *   FEE                 $300 per petition.
 *                       WY.memo rules.fees ("$300 filing fee per petition")
 *                       and the manifest pay_fee entry; compiled profile
 *                       packetGenerator.feeRules[2], keyed by section:
 *                       "Adult felony conviction under 7-13-1502 $300".
 *   WAIVER              WY.memo rules.feeWaiver is "none" — no waiver
 *                       procedure is established for this section, so the
 *                       clerk of the convicting court is named as the
 *                       authority who answers it.
 *   SERVICE             the prosecuting attorney AND the Division of Criminal
 *                       Investigation, with proof of service filed.
 *                       WY.memo rules.service and the manifest serve_party
 *                       entry; compiled profile filingDestinationRules[2].
 *
 * A3 DISCIPLINE. The compiled profile carries a fee table covering several
 * Wyoming routes at once. Its $100 line is keyed to § 7-13-1501 (adult
 * MISDEMEANOR conviction) and its $0 lines to § 7-13-1401 and § 14-6-241.
 * Section 7-13-1501 is not 7-13-1502, so those lines answer a different
 * statute's question and are not read onto this route. Only
 * "Adult felony conviction under 7-13-1502 $300" addresses this one.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts and
 * writes only those. Every case fact — the convicting court and county, the
 * docket number, the offense as the judgment words it, the sentence-expiry
 * date, the restitution satisfaction — lives on records the platform has not
 * seen, so each is a labelled dotted blank declared REQUIRED_BEFORE_FILING
 * and disclosed in participant-instructions.md.
 *
 * THREE ELIGIBILITY ALLEGATIONS ARE DELIBERATELY NOT PLEADED. The committed
 * record lists them as manual completion items: that the petitioner is not a
 * substantial danger (a discretionary judicial finding the court makes and the
 * platform must not assert), that the felony is not on the § 7-13-1502
 * exclusion list (long, statute-specific, not encoded), and that the
 * petitioner has no other felony anywhere (the bar looks at the entire record,
 * which the platform cannot see). Each is a declared blank, not a silent
 * omission.
 *
 * ONE THING THIS PACKET DELIBERATELY DOES NOT SAY. Section 7-13-1502(m)
 * restores rights removed as a result of the conviction. It does NOT give the
 * participant an entitlement to answer an inquiry as though the conviction did
 * not occur — that entitlement lives in § 7-13-1401(f), which confines itself
 * to the non-conviction route by its own words, and the committed
 * reconciliation record states so in terms. The packet therefore states the
 * restoration of rights, stays silent on answer-as-if, and never tells the
 * participant the conviction may be denied.
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

const FAMILY_ID = "wy_fel_1502-set";
const OUT = "data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-wy_fel_1502-set.mjs";
const IMPLEMENTATION_STRATEGY = "custom_pleading";

const ROUTE = Object.freeze({
  jurisdiction: "WY",
  routeKeys: ["obligation:track-pathway:WY:wy_fel_1502:felony-conviction-expungement-w-s-7-13-1502"],
  primaryRouteKey: "obligation:track-pathway:WY:wy_fel_1502:felony-conviction-expungement-w-s-7-13-1502",
  routeSelectionId: "wy_fel_1502-composed-set",
  legalName: "Petition for Expungement of Records of Conviction of Certain Felonies (Wyo. Stat. § 7-13-1502)",
  routeName: "asking the Wyoming court that convicted you to expunge the records of that felony conviction under Wyo. Stat. § 7-13-1502",
  statute: "Wyo. Stat. § 7-13-1502"
});

const COMPONENTS = [
  "wy_fel_1502-primary-filing-1",
  "wy_fel_1502-proposed-order-2",
  "wy_fel_1502-verification-3",
  "wy_fel_1502-certificate-of-service-4",
  "wy_fel_1502-filing-instructions-5"
];

const COMPOSED_TITLES = {
  "wy_fel_1502-primary-filing-1": "Verified Petition for Expungement of Records of Conviction (W.S. Sec. 7-13-1502)",
  "wy_fel_1502-proposed-order-2": "Proposed Order for Expungement",
  "wy_fel_1502-verification-3": "Verification of Petitioner",
  "wy_fel_1502-certificate-of-service-4": "Certificate of Service",
  "wy_fel_1502-filing-instructions-5": "Filing Instructions"
};

const COMPONENT_CONDITIONS = {};

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/WY.memo.json, track wy_fel_1502) "
  + "and the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, wy_fel_1502-set), "
  + "with the filing destination, the $300 fee and the two service recipients corroborated against the compiled "
  + "Wyoming profile (src/lib/rcap-engine/compiled/profiles/WY-wyoming.json, filingDestinationRules[2], feeRules[2])";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1984-04-17",
    "participant.street_address": "42 Bighorn Avenue, Casper, WY 82601",
    "participant.phone": "307-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1962-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Cheyenne, Wyoming 82009-2214",
    "participant.phone": "(307) 555-0199 ext. 4417",
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

  if (componentId === "wy_fel_1502-primary-filing-1") {
    L.push("IN THE DISTRICT COURT OF THE ................ JUDICIAL DISTRICT");
    L.push("COUNTY OF " + DOTS(40) + ", STATE OF WYOMING", "");
    L.push("(Caption this petition for the court that convicted you. The convicting court, its judicial district, its county and the docket number are copied from your judgment and sentence; nothing on those lines is written for you.)", "");
    L.push("Docket / Criminal Case No.: " + DOTS(44), "");
    L.push("IN THE MATTER OF THE EXPUNGEMENT OF THE RECORDS OF CONVICTION OF:", "");
    L.push(`Petitioner: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("VERIFIED PETITION FOR EXPUNGEMENT OF RECORDS OF CONVICTION", "");
    L.push(`1. Petitioner ${name} petitions this Court under Wyo. Stat. Sec. 7-13-1502 to expunge the records of the felony conviction identified below, entered in this Court.`, "");
    L.push("2. THE CONVICTION. Copied from the judgment and sentence:", "");
    L.push("Felony offense, worded exactly as the judgment and sentence states it:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Wyoming statute section of conviction, as the judgment states it:");
    L.push(DOTS(), "");
    L.push("Date of conviction / date judgment and sentence entered:");
    L.push(DOTS(), "");
    L.push("Where more than one felony is included, state that they arose out of the same occurrence or the same related course of events, and identify each:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. THE TEN-YEAR PERIOD. Section 7-13-1502 requires that at least ten (10) years have passed since the expiration of the terms of the sentence, including any period of probation.", "");
    L.push("Date all terms of the sentence expired, including any probation:");
    L.push(DOTS(), "");
    L.push("4. PROGRAMS AND RESTITUTION. Any court-ordered program is complete and any court-ordered restitution has been paid in full.", "");
    L.push("Date any court-ordered program was completed (or state that none was ordered):");
    L.push(DOTS(), "");
    L.push("Restitution ordered, and the date it was paid in full (or state that none was ordered):");
    L.push(DOTS(), "");
    L.push("5. ELIGIBILITY ALLEGATIONS PETITIONER MUST MAKE PERSONALLY.", "");
    L.push("These three are left for you and, where you have one, your attorney. The platform does not assert them, because each depends on your whole record or on a judgment reserved to the Court.", "");
    L.push("(a) That Petitioner has not previously pled guilty or nolo contendere to, and has not been convicted of, any felony other than the felony or felonies in this petition, anywhere:");
    L.push(DOTS(), "");
    L.push("(b) That the felony is not an offense excluded from expungement by Sec. 7-13-1502:");
    L.push(DOTS(), "");
    L.push("(c) That Petitioner does not represent a substantial danger to himself or herself, to any identifiable victim, or to society:");
    L.push(DOTS(), "");
    L.push("(d) That Petitioner has not previously received an expungement of records of conviction under Sec. 7-13-1502, which permits one in a lifetime:");
    L.push(DOTS(), "");
    L.push("6. RELIEF REQUESTED. Petitioner asks the Court to enter an Order for Expungement of the records of conviction identified above, directing that the court files be sealed and available for inspection only by order of the Court, and directing that a certified copy of the Order be transmitted to the Wyoming Division of Criminal Investigation.", "");
    L.push("7. This petition is verified by Petitioner as Sec. 7-13-1502 requires. The Verification page accompanies it.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(40), "");
    L.push("(You sign and date this petition yourself. Nothing on this page is signed or dated for you.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}    EMAIL: ${email}`);
  } else if (componentId === "wy_fel_1502-proposed-order-2") {
    L.push("IN THE DISTRICT COURT OF THE ................ JUDICIAL DISTRICT");
    L.push("COUNTY OF " + DOTS(40) + ", STATE OF WYOMING", "");
    L.push("Docket / Criminal Case No.: " + DOTS(44), "");
    L.push(`IN THE MATTER OF THE EXPUNGEMENT OF THE RECORDS OF CONVICTION OF ${name}`, "");
    L.push("ORDER FOR EXPUNGEMENT", "");
    L.push("THIS DOCUMENT IS A PROPOSED ORDER. It is unexecuted. It records no finding the Court has made, and nothing in it asserts that the Court has acted. It is prepared so that it is available to the Court for signature if the Court grants the petition.", "");
    L.push(`THIS MATTER came before the Court on the verified Petition of ${name} for expungement of the records of conviction under Wyo. Stat. Sec. 7-13-1502.`, "");
    L.push("THE COURT FINDS (findings to be made by the Court):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("IT IS THEREFORE ORDERED that the records of conviction identified in the Petition are expunged under Wyo. Stat. Sec. 7-13-1502.", "");
    L.push("IT IS FURTHER ORDERED that the files and records of this Court in this matter be SEALED, and be available for inspection only upon order of this Court.", "");
    L.push("IT IS FURTHER ORDERED that the Clerk transmit a certified copy of this Order to the Wyoming Division of Criminal Investigation.", "");
    L.push("IT IS FURTHER ORDERED that, as Wyo. Stat. Sec. 7-13-1502(m) provides, this expungement restores to Petitioner any rights that were removed as a result of the conviction.", "");
    L.push("DATED this " + DOTS(12) + " day of " + DOTS(20) + ", 20" + DOTS(4) + ".", "");
    L.push("" + DOTS(50));
    L.push("DISTRICT JUDGE", "");
    L.push("(The date of entry and the judge's signature are the Court's. They are left blank.)");
  } else if (componentId === "wy_fel_1502-verification-3") {
    L.push("Docket / Criminal Case No.: " + DOTS(44), "");
    L.push("VERIFICATION", "");
    L.push("Wyoming Statute Sec. 7-13-1502 requires the petition to be VERIFIED by the petitioner. This page is that verification. It is not signed for you.", "");
    L.push("STATE OF " + DOTS(30));
    L.push("COUNTY OF " + DOTS(30), "");
    L.push(`I, ${name}, being first duly sworn, state that I am the Petitioner in this matter; that I have read the foregoing Verified Petition for Expungement of Records of Conviction; and that the matters stated in it are true and correct to the best of my knowledge, information and belief.`, "");
    L.push("" + DOTS(50));
    L.push(`${name}, Petitioner`, "");
    L.push("SUBSCRIBED AND SWORN TO before me this " + DOTS(12) + " day of " + DOTS(20) + ", 20" + DOTS(4) + ".", "");
    L.push("" + DOTS(50));
    L.push("Notary Public / Officer authorized to administer oaths", "");
    L.push("My commission expires: " + DOTS(30), "");
    L.push("ASK THE CLERK FIRST. Verification is required by statute. Whether THIS court requires the verification to be sworn before a notary is that court's practice, and the committed record does not settle it. Ask the clerk of the convicting court before you sign.");
  } else if (componentId === "wy_fel_1502-certificate-of-service-4") {
    L.push("Docket / Criminal Case No.: " + DOTS(44), "");
    L.push("CERTIFICATE OF SERVICE", "");
    L.push("Section 7-13-1502 requires the verified petition to be SERVED ON TWO RECIPIENTS and proof of service filed: the prosecuting attorney, and the Wyoming Division of Criminal Investigation. The 90-day objection window runs from service on the prosecuting attorney.", "");
    L.push(`I, ${name}, certify that I served a true and correct copy of the Verified Petition for Expungement of Records of Conviction as follows:`, "");
    L.push("1. ON THE PROSECUTING ATTORNEY", "");
    L.push("Name and office of the prosecuting attorney (the county and prosecuting attorney for the county of conviction):");
    L.push(DOTS(), "");
    L.push("Address served:");
    L.push(DOTS(), "");
    L.push("Manner of service: " + DOTS(40));
    L.push("Date served: " + DOTS(30), "");
    L.push("2. ON THE WYOMING DIVISION OF CRIMINAL INVESTIGATION", "");
    L.push("Address served (confirm the current address for service with the Division before sending):");
    L.push(DOTS(), "");
    L.push("Manner of service: " + DOTS(40));
    L.push("Date served: " + DOTS(30), "");
    L.push("" + DOTS(50));
    L.push(`${name}, Petitioner`);
    L.push("Date: " + DOTS(30), "");
    L.push("(The service dates are written when service is actually made. Nothing on this page is dated for you. File this certificate with the court as your proof of service.)");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push(`Prepared for: ${name}`, "");
    L.push("WHERE THIS IS FILED. File the verified Petition and the proposed Order for Expungement with the CLERK OF THE CONVICTING COURT — the court that entered your felony judgment and sentence. That is the destination the committed Wyoming record and the compiled Wyoming profile both state for a Sec. 7-13-1502 petition.", "");
    L.push("WHAT IT COSTS. The filing fee is $300.00 per petition. That figure is stated for this exact route by the committed Wyoming legal-design record and, keyed to the section, by the compiled Wyoming profile: 'Adult felony conviction under 7-13-1502 $300'. Where you are asking to expunge more than one petition's worth of records, the fee is per petition.", "");
    L.push("ABOUT A FEE WAIVER. No fee-waiver procedure is established for Sec. 7-13-1502 in the records this packet is built from. That is not the same as there being none. ASK THE CLERK OF THE CONVICTING COURT — the same clerk who takes the filing — whether that court has an indigency or fee-waiver procedure, before you pay.", "");
    L.push("WHO YOU SERVE. Two recipients, and proof of service is filed with the court:", "");
    L.push("  (1) THE PROSECUTING ATTORNEY for the county of conviction; and");
    L.push("  (2) THE WYOMING DIVISION OF CRIMINAL INVESTIGATION.", "");
    L.push("The prosecuting attorney — not you — notifies any identifiable victims.", "");
    L.push("THE 90-DAY WINDOW. The prosecuting attorney has NINETY (90) DAYS to object, and no order may be granted before that window closes. The window runs from service on the prosecuting attorney, which is why the date of service matters and why you fill it in on the certificate of service when service is actually made. If no objection is filed, the court may enter the order summarily on finding eligibility.", "");
    L.push("WHAT THE ORDER DOES. On a grant the court seals its file, and a certified copy of the order is transmitted to the Division of Criminal Investigation. Under Sec. 7-13-1502(m) the expungement restores any rights that were removed as a result of the conviction.", "");
    L.push("WHAT THIS PACKET WILL NOT TELL YOU, AND WHY. It does not tell you that you may answer an inquiry as though the conviction did not occur. That entitlement appears in Wyo. Stat. Sec. 7-13-1401(f), which by its own words is confined to the NON-CONVICTION route, and it does not appear in Sec. 7-13-1502. The committed record says so in terms. Do not state that the conviction did not happen.", "");
    L.push("ONE IN A LIFETIME. Section 7-13-1502 permits one expungement of records of conviction in a lifetime. Spend it deliberately.", "");
    L.push("VERIFICATION. The petition must be verified by you. Ask the clerk of the convicting court whether that court requires the verification sworn before a notary; the committed record does not settle it.", "");
    L.push("WYOMING'S OWN SELF-HELP PAGE. The Wyoming Judicial Branch publishes an expungement page and an Expungement Handout at wyocourts.gov (Legal Help by Topic — Expungements). It does not publish a complete mandatory petition packet, which is why this petition is drafted rather than filled.", "");
    L.push("WHEN TO STOP AND GET A LAWYER INSTEAD.");
    L.push("- The felony may be on the Sec. 7-13-1502 exclusion list. The list is long and statute-specific and is not encoded here; have it checked.");
    L.push("- You have any other felony plea, nolo plea or conviction anywhere. The other-felony bar looks at your entire record.");
    L.push("- Any firearm use or attempted use, including where you believe a Title 23 carve-out applies.");
    L.push("- Any offense subject to sex offender registration under Secs. 7-19-302(g) through (j).");
    L.push("- You have already received one expungement under Sec. 7-13-1502.");
    L.push("- You completed a felony DEFERRAL rather than being convicted. There is no Wyoming expungement route for that, and this packet will not pretend otherwise: Sec. 7-13-1401(a)(i) is barred by the deferral disposition itself, Sec. 7-13-1502 requires a conviction you do not have, and Sec. 7-13-307 forbids construing Secs. 7-13-301 through 7-13-306 to authorize expunging the record. Where the Division of Criminal Investigation record misdescribes the disposition, a W.S. Sec. 7-19-109 application to purge, modify or supplement inaccurate or incomplete criminal history record information is the only thing available. It corrects the record to say what actually happened; it is not expungement, and it is not a route this packet offers.");
    L.push("- The prosecuting attorney files an objection, or the court sets a contested hearing.");
    L.push("- An identifiable victim is likely to object.");
    L.push("- Facts indicating human trafficking or coercion, which route to the Sec. 6-2-708 vacatur outside this track.");
    L.push("- Immigration consequences.");
    L.push("- Federal, tribal or out-of-state records, which Wyoming relief does not reach.", "");
    L.push("DOCUMENTS TO OBTAIN BEFORE YOU FILE, AND WHO HAS THEM.");
    L.push("- Certified judgment and sentence for the felony conviction — the clerk of the convicting court.");
    L.push("- Proof that probation and any court-ordered program were completed, showing the date the terms of sentence expired — the supervising probation office, or the clerk of the convicting court. The ten-year clock runs from that date.");
    L.push("- Proof that court-ordered restitution was paid in full — the clerk of the convicting court.");
    L.push("- Your Wyoming DCI criminal history record — the Wyoming Division of Criminal Investigation, Criminal Records Unit. It is the only reliable way to check the other-felony bar against your whole record.");
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

  if (componentId === "wy_fel_1502-primary-filing-1") {
    w("petitioner_name", "Petitioner named in the caption and body of the petition", "participant.full_legal_name");
    w("date_of_birth", "Date of birth of the petitioner", "participant.date_of_birth");
    w("mailing_address", "Mailing address of the petitioner", "participant.street_address");
    w("telephone", "Telephone number of the petitioner", "participant.phone");
    w("email", "Email address of the petitioner", "participant.email");
    rbf("judicial_district", "Judicial district of the convicting court, in the caption",
      "the judicial district of the court that convicted you, copied from your judgment and sentence",
      "which court convicted the participant is a case fact the platform has not seen");
    rbf("county_of_conviction", "County of the convicting court, in the caption",
      "the Wyoming county of the convicting court, copied from your judgment and sentence",
      "the county of conviction is a case fact the platform has not seen");
    rbf("docket_number", "Docket or criminal case number, in the caption",
      "the docket or criminal case number, copied from your judgment and sentence",
      "no docket identifier is held for a record the platform has not seen");
    rbf("felony_offense", "Felony offense worded exactly as the judgment and sentence states it",
      "the felony offense, worded exactly as your judgment and sentence states it",
      "no offense fact is held for a record the platform has not seen");
    rbf("statute_of_conviction", "Wyoming statute section of conviction, as the judgment states it",
      "the Wyoming statute section of conviction, as your judgment states it",
      "no statute-of-conviction fact is held for a record the platform has not seen");
    rbf("conviction_date", "Date of conviction, or date the judgment and sentence was entered",
      "the date of conviction, or the date the judgment and sentence was entered, from the court record",
      "no conviction-date fact is held for a record the platform has not seen");
    rbf("same_occurrence_felonies", "Where more than one felony is included, the statement that they arose out of the same occurrence or related course of events",
      "each additional felony and the statement that they arose out of the same occurrence or the same related course of events",
      "whether multiple felonies arose from one occurrence is a case fact the platform has not seen");
    rbf("sentence_expiry_date", "Date all terms of the sentence expired, including any probation",
      "the date all terms of your sentence expired, including any probation, from your discharge or completion documentation - the ten-year clock runs from this date",
      "no sentence-completion fact is held for a record the platform has not seen");
    rbf("program_completion", "Date any court-ordered program was completed, or a statement that none was ordered",
      "the date any court-ordered program was completed, or a statement that none was ordered",
      "no program-completion fact is held for a record the platform has not seen");
    rbf("restitution_satisfaction", "Restitution ordered and the date it was paid in full, or a statement that none was ordered",
      "the restitution ordered and the date it was paid in full, from the clerk's payoff or satisfaction record, or a statement that none was ordered",
      "no restitution fact is held for a record the platform has not seen");
    rbf("no_other_felony_allegation", "Eligibility allegation (a): that petitioner has no other felony plea, nolo plea or conviction anywhere",
      "your own statement that you have no other felony plea, nolo contendere plea or conviction anywhere - the bar looks at your entire record",
      "the other-felony bar looks at the participant's entire record, which the platform cannot see; the committed record lists this as a manual completion item");
    rbf("not_excluded_allegation", "Eligibility allegation (b): that the felony is not on the Sec. 7-13-1502 exclusion list",
      "your own statement, checked with a lawyer where you are unsure, that the felony is not on the Sec. 7-13-1502 exclusion list",
      "the exclusion list is long and statute-specific and is not encoded; the committed record reserves this characterisation for attorney review");
    rbf("not_substantial_danger_allegation", "Eligibility allegation (c): that petitioner does not represent a substantial danger",
      "your own statement that you do not represent a substantial danger to yourself, to any identifiable victim, or to society",
      "this is a discretionary judicial finding the court makes; the committed record forbids the platform asserting it");
    rbf("no_prior_1502_allegation", "Eligibility allegation (d): that petitioner has not previously received a Sec. 7-13-1502 expungement",
      "your own statement that you have not previously received an expungement of records of conviction under Sec. 7-13-1502, which permits one in a lifetime",
      "whether the participant has already spent the one lifetime expungement is a record fact the platform has not seen");
    prot("signature", "Signature of the petitioner on the petition", "the petition is the participant's own and is signed when actually filed");
    prot("signature_date", "Date beside the petitioner's signature on the petition", "a date written before the petition is actually signed would be false");
  } else if (componentId === "wy_fel_1502-proposed-order-2") {
    w("petitioner_name", "Petitioner named in the caption and body of the proposed order", "participant.full_legal_name");
    rbf("order_judicial_district", "Judicial district of the convicting court, in the proposed order caption",
      "the judicial district of the convicting court, copied from your judgment and sentence",
      "which court convicted the participant is a case fact the platform has not seen");
    rbf("order_county", "County of the convicting court, in the proposed order caption",
      "the Wyoming county of the convicting court, copied from your judgment and sentence",
      "the county of conviction is a case fact the platform has not seen");
    rbf("order_docket_number", "Docket or criminal case number, in the proposed order caption",
      "the docket or criminal case number, copied from your judgment and sentence",
      "no docket identifier is held for a record the platform has not seen");
    court("order_findings", "The Court's findings paragraph in the proposed order", "the findings are the Court's to make; the committed record lists them as completed by the court");
    court("order_entry_date", "Date of entry of the proposed order", "the date of entry is the Court's");
    court("judge_signature", "District judge's signature on the proposed order", "only the judge signs the order");
  } else if (componentId === "wy_fel_1502-verification-3") {
    w("verifying_petitioner_name", "Petitioner named in the verification", "participant.full_legal_name");
    rbf("verification_docket_number", "Docket or criminal case number on the verification page",
      "the docket or criminal case number, copied from your judgment and sentence",
      "no docket identifier is held for a record the platform has not seen");
    rbf("verification_state", "State in the verification jurat",
      "the state where you sign the verification",
      "where the participant will sign is not a fact the platform holds");
    rbf("verification_county", "County in the verification jurat",
      "the county where you sign the verification",
      "where the participant will sign is not a fact the platform holds");
    prot("verification_signature", "Petitioner's signature on the verification", "the verification is sworn by the participant and is never prefilled");
    court("notary_block", "Notary or authorized officer jurat, signature and commission expiry", "the jurat is completed by the notary or officer administering the oath");
  } else if (componentId === "wy_fel_1502-certificate-of-service-4") {
    w("certifying_petitioner_name", "Petitioner named as the person certifying service", "participant.full_legal_name");
    rbf("cos_docket_number", "Docket or criminal case number on the certificate of service",
      "the docket or criminal case number, copied from your judgment and sentence",
      "no docket identifier is held for a record the platform has not seen");
    rbf("prosecutor_identity", "Name and office of the prosecuting attorney served",
      "the name and office of the prosecuting attorney for the county of conviction",
      "the platform holds no prosecuting-attorney identity for any Wyoming county and does not guess one");
    rbf("prosecutor_address", "Address at which the prosecuting attorney was served",
      "the address at which you served the prosecuting attorney",
      "the platform holds no service address for any prosecuting attorney and does not guess one");
    rbf("prosecutor_service_manner", "Manner of service on the prosecuting attorney",
      "how you served the prosecuting attorney",
      "how service was actually made is known only after it happens");
    rbf("prosecutor_service_date", "Date of service on the prosecuting attorney",
      "the date you served the prosecuting attorney - the 90-day objection window runs from this date",
      "the date of service is known only when service is actually made");
    rbf("dci_address", "Address at which the Division of Criminal Investigation was served",
      "the address at which you served the Wyoming Division of Criminal Investigation, confirmed with the Division before sending",
      "the platform holds no current service address for the Division and does not guess one");
    rbf("dci_service_manner", "Manner of service on the Division of Criminal Investigation",
      "how you served the Division of Criminal Investigation",
      "how service was actually made is known only after it happens");
    rbf("dci_service_date", "Date of service on the Division of Criminal Investigation",
      "the date you served the Division of Criminal Investigation",
      "the date of service is known only when service is actually made");
    prot("cos_signature", "Petitioner's signature on the certificate of service", "the certificate is the participant's own and is signed when service has actually been made");
    prot("cos_signature_date", "Date beside the petitioner's signature on the certificate of service", "a certificate of service dated before service happened would be false");
  } else {
    w("participant_name", "Person the filing instructions are prepared for", "participant.full_legal_name");
  }
  return composedMapShell(componentId, writes, refusals);
}

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/WY.memo.json", track: "wy_fel_1502" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "wy_fel_1502-set" },
    { record: "src/lib/rcap-engine/compiled/profiles/WY-wyoming.json", read: "packetGenerator.filingDestinationRules[2] and packetGenerator.feeRules[2], both keyed to section 7-13-1502" },
    { record: "data/record-clearing/production-factory/legal-design-decisions/rcap-wy-eligibility-waiting-period-and-effect-reconciliation.json", read: "the answer-as-if asymmetry: it exists on 7-13-1401 and not on 7-13-1502" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Wyo. Stat. Title 7, Chapter 13, Article 15 — Expungement of Records of Convictions (official statute text)", url: "https://wyoleg.gov/statutes/compress/title07.pdf", retrievedOn: "2026-08-05" },
    { title: "2011 SF0088 — creates W.S. 7-13-1502; effective July 1, 2011", url: "https://wyoleg.gov/2011/Enroll/SF0088.pdf", retrievedOn: "2026-08-05" },
    { title: "2014 HB0006, Enrolled Act No. 9 — amends W.S. 7-13-1502(a)(iv)(E); effective July 1, 2014", url: "https://wyoleg.gov/2014/Enroll/HB0006.pdf", retrievedOn: "2026-08-05" },
    { title: "Expungements — Wyoming Judicial Branch self-help page", url: "https://www.wyocourts.gov/legal-help-by-topic/expungements/", retrievedOn: "2026-08-01" },
    { title: "2026 HB0044, House Enrolled Act No. 40, Session Laws of Wyoming 2026 ch. 98 — Revisor's bill; amends W.S. 7-13-1401(h), 7-13-1501(j) and 7-13-1502(j); effective July 1, 2026", url: "https://www.wyoleg.gov/2026/Enroll/HB0044.pdf", retrievedOn: "2026-08-08" }
  ],
  formIdentityNote:
    "No official form exists for a W.S. § 7-13-1502 petition. The compiled Wyoming profile records that the "
    + "statewide self-help page does not provide one complete mandatory petition packet and that the person "
    + "prepares a Petition for Expungement and, if granted, an Order for Expungement for the judge's signature. "
    + "The MASTER_QUEUE row agrees: officialFormFamily NONE, implementationStrategy custom_pleading, forms [], "
    + "boundCount 0. No form was substituted and none was invented.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "that this participant is eligible under § 7-13-1502 — the exclusion list, the other-felony bar and the substantial-danger finding are not encoded and are left to the participant, counsel and the court",
    "whether the convicting court requires the statutory verification to be sworn before a notary — the committed record does not settle it and the packet directs the participant to the clerk",
    "the current service address of the Wyoming Division of Criminal Investigation, which the participant confirms with the Division"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the petition's own face: a W.S. § 7-13-1502 petition to expunge records of a felony "
    + "conviction, filed in the convicting court. No election control is rendered. The four eligibility allegations "
    + "are NOT route elections and are not selected by the build: three of them are listed in the committed record "
    + "as manual completion items reserved to the participant, counsel or the court, and the fourth (one expungement "
    + "in a lifetime) turns on a record the platform has not seen."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "Wyoming publishes **no statewide petition form** for this route. The Wyoming Judicial Branch self-help page lists an Expungement Handout and explains that the person prepares a Petition for Expungement and, if it is granted, an Order for Expungement for the judge's signature. So these pages are drafted to the statute rather than filled in on a form.",
    "",
    "The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact lives on records the platform has not seen, so each is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.",
    "",
    "**Three eligibility allegations are deliberately left for you.** That you have no other felony anywhere, that the felony is not on the § 7-13-1502 exclusion list, and that you do not represent a substantial danger. The first looks at your whole record, the second is long and statute-specific, and the third is a finding reserved to the court. The platform asserts none of them.",
    "",
    "**This packet will not tell you that you may answer an inquiry as though the conviction did not occur.** That entitlement is in § 7-13-1401(f), which by its own words covers the non-conviction route, and it is not in § 7-13-1502. Section 7-13-1502(m) restores rights removed as a result of the conviction, which is a different thing. Do not state that the conviction did not happen."
  ],
  componentBlurbs: {
    "wy_fel_1502-primary-filing-1": "the verified petition under § 7-13-1502, with the ten-year period, the program and restitution allegations, and the four eligibility allegations left for you",
    "wy_fel_1502-proposed-order-2": "the proposed Order for Expungement for the judge's signature — sealing, transmission to DCI, and the § 7-13-1502(m) restoration of rights. It is unexecuted and asserts no finding the court has made",
    "wy_fel_1502-verification-3": "the statutory verification — § 7-13-1502 requires the petition to be verified by you",
    "wy_fel_1502-certificate-of-service-4": "the certificate of service on both required recipients, which is your proof of service",
    "wy_fel_1502-filing-instructions-5": "where to file, the $300 fee, who to serve, the 90-day objection window, and where self-help stops"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Certified judgment and sentence for the felony conviction | Clerk of the convicting court |",
    "| Proof that probation and any court-ordered program were completed, showing the date the terms of sentence expired | The supervising probation office, or the clerk of the convicting court |",
    "| Proof that court-ordered restitution was paid in full | Clerk of the convicting court |",
    "| Your Wyoming DCI criminal history record | Wyoming Division of Criminal Investigation, Criminal Records Unit |"
  ],
  stepsLines: [
    "1. **Obtain the four documents above** before you write anything. The ten-year clock runs from the date the terms of your sentence expired, and that date comes from the discharge documentation, not from memory.",
    "2. **Fill every dotted blank** on the petition, the verification and the certificate of service, from the record itself.",
    "3. **Make the four eligibility allegations yourself.** Where you are unsure about the exclusion list or the other-felony bar, stop and get a lawyer before you file.",
    "4. **Verify the petition.** § 7-13-1502 requires it. Ask the clerk of the convicting court whether that court requires the verification sworn before a notary — the committed record does not settle it.",
    "5. **File the verified petition and the proposed order with the clerk of the convicting court**, and pay the **$300.00** filing fee, which is per petition.",
    "6. **Serve both recipients** — the prosecuting attorney for the county of conviction, and the Wyoming Division of Criminal Investigation — and **file the certificate of service** as your proof.",
    "7. **Wait out the 90 days.** The prosecuting attorney has ninety days to object and no order may be granted before that window closes. It runs from service on the prosecuting attorney. If no objection is filed the court may enter the order summarily on finding eligibility."
  ],
  blanksLines: [
    "- **Your signature and the dates beside it**, on the petition, the verification and the certificate of service. You sign when you actually file and serve.",
    "- **The court's findings, the date of entry and the judge's signature** on the proposed order. The order is proposed, and nothing in it asserts the court has acted.",
    "- **The notary or officer jurat** on the verification, which the officer administering the oath completes.",
    "- **The three eligibility allegations** that depend on your whole record or on a judgment reserved to the court.",
    "- **The prosecuting attorney's identity and address, and the Division of Criminal Investigation's service address.** The platform holds neither and does not guess. Confirm the Division's current address with the Division before sending."
  ],
  stopsLines: [
    "- the felony may be on the § 7-13-1502 exclusion list — the list is long and statute-specific and is not encoded here;",
    "- you have any other felony plea, nolo plea or conviction anywhere, since the bar looks at your entire record;",
    "- any firearm use or attempted use, including where you believe a Title 23 carve-out applies;",
    "- any offense subject to sex offender registration under §§ 7-19-302(g) through (j);",
    "- you have already received one expungement under § 7-13-1502, which permits one in a lifetime;",
    "- you completed a felony **deferral** rather than being convicted. There is no Wyoming expungement route for that and this packet will not pretend otherwise. § 7-13-1401(a)(i) is barred by the deferral disposition itself, § 7-13-1502 requires a conviction you do not have, and § 7-13-307 forbids construing §§ 7-13-301 through 7-13-306 to authorize expunging the record. Where the DCI record misdescribes the disposition, a W.S. § 7-19-109 application to purge, modify or supplement inaccurate or incomplete criminal history record information is the only thing available — it corrects the record to say what actually happened, it is not expungement, and it is not a route this packet offers;",
    "- the prosecuting attorney files an objection, or the court sets a contested hearing;",
    "- an identifiable victim is likely to object;",
    "- facts indicating human trafficking or coercion, which route to the § 6-2-708 vacatur outside this track;",
    "- immigration consequences;",
    "- federal, tribal or out-of-state records, which Wyoming relief does not reach.",
    "",
    "Where self-help stops, the Wyoming Judicial Branch publishes its expungement page and Expungement Handout at wyocourts.gov (Legal Help by Topic — Expungements), and the clerk of the convicting court answers filing mechanics."
  ],
  notLines: [
    "This is a prepared petition, a proposed order, a verification, a certificate of service and their filing instructions. It is not legal advice, it is not filed or served for you, and it does not decide whether you are eligible. It does not reach federal, tribal or out-of-state records. It does not tell you that you may answer an inquiry as though the conviction did not occur, because § 7-13-1502 does not give that entitlement."
  ]
};

const FINDINGS = [
  {
    finding:
      "The MASTER_QUEUE row binds zero source binaries, and the compiled Wyoming profile records why: the "
      + "statewide self-help page does not provide one complete mandatory petition packet, and the person prepares "
      + "the petition and the proposed order.",
    consequence:
      "Every page is composed from the committed legal-design record and the codified text it quotes. No form was "
      + "substituted and none was invented."
  },
  {
    finding:
      "All four participant-facing obligations are established for this route on two independent committed shelves "
      + "that agree: the clerk of the convicting court, a $300 fee per petition, service on the prosecuting attorney "
      + "and on the Division of Criminal Investigation, and a 90-day objection window.",
    consequence:
      "The filing instructions state each of them outright rather than naming an authority to ask, because the "
      + "repository holds the answers. The one thing not established — a fee-waiver procedure for § 7-13-1502 — is "
      + "stated as not established, with the clerk of the convicting court named as the authority who answers it."
  },
  {
    finding:
      "The compiled Wyoming profile carries a fee table covering several routes at once, including a $100 line keyed "
      + "to § 7-13-1501 and $0 lines keyed to § 7-13-1401 and § 14-6-241.",
    consequence:
      "Only the line keyed to § 7-13-1502 was read onto this route. A sibling section's figure is not this route's "
      + "answer however close the sibling looks, and the $100 misdemeanour figure is not published anywhere in this "
      + "packet."
  },
  {
    finding:
      "The committed reconciliation record establishes an asymmetry: the entitlement to answer an inquiry as though "
      + "the matter did not occur exists on the non-conviction route under § 7-13-1401(f) and does NOT exist on "
      + "§ 7-13-1502. Subsection (m) restores rights removed as a result of the conviction, which is a different thing.",
    consequence:
      "The packet states the restoration of rights, stays silent on answer-as-if, and tells the participant in terms "
      + "not to state that the conviction did not happen. This is a consumer-harm-grade error the record names, and "
      + "the silence is deliberate rather than an omission."
  },
  {
    finding:
      "Three eligibility allegations are listed in the committed record as manual completion items: the "
      + "substantial-danger finding (discretionary and judicial), the exclusion-list characterisation (long, "
      + "statute-specific, not encoded, reserved for attorney review) and the other-felony bar (looks at the whole "
      + "record).",
    consequence:
      "Each is a labelled dotted blank declared REQUIRED_BEFORE_FILING and disclosed in participant-instructions.md, "
      + "and each is a named stop condition. The platform asserts none of them."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm that stating the $300 filing fee outright on this route is right, given the compiled profile keys it to § 7-13-1502 by section and the legal-design record states it as '$300 filing fee per petition'.",
    "The legal-design record records feeWaiver as 'none' for § 7-13-1502. Confirm that means no waiver procedure is ESTABLISHED rather than that waiver is unavailable, which is how the packet states it while naming the clerk of the convicting court as the authority.",
    "Confirm the packet is right to stay silent on any entitlement to answer an inquiry as though the conviction did not occur. The reconciliation record confines that entitlement to § 7-13-1401(f), and the unresolved question in the intake record notes that whether some other Wyoming provision supplies it has not been searched and is not asserted in either direction.",
    "Confirm the four eligibility allegations are correctly left to the participant and counsel rather than pleaded, and that the petition's wording of each invites the allegation without suggesting its answer.",
    "Confirm the proposed order's recitals — sealing, availability only by order of the court, transmission of a certified copy to DCI, and the subsection (m) restoration of rights — match the statutory reach."
  ],
  mattersForTheReviewersAttention: [
    "The proposed order is generated unexecuted: its findings paragraph, its date of entry and the judge's signature block are all declared blanks, and nothing in it asserts that the court has acted.",
    "The 90-day objection window runs from service on the prosecuting attorney, which is why the service date on the certificate of service is a required-before-filing blank rather than a formality.",
    "Neither the prosecuting attorney's identity nor the Division of Criminal Investigation's service address is held by the platform, and neither is guessed. Both are required-before-filing blanks.",
    "The completed-deferral stop condition is stated at length and in terms, because the committed record directs saying plainly that there is no route rather than offering either section."
  ]
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — census-v1 zero-bound-source composed-pleading machinery.
 *
 * This section is deliberately identical across the FABLE-PB composed-pleading
 * family builders. Each script stays self-contained because every one of these
 * families' MASTER_QUEUE rows is exclusiveScript with sharedBuildHost null, and
 * because a shared host shared with families outside this lane's grant could not
 * be changed without moving their bytes. The family-specific facts live entirely
 * above this line; nothing below it knows which family it is building.
 *
 * The machinery is the proven pattern already in service in this factory
 * (scripts/build-census-v1-ga-jail-k2-set.mjs and its siblings), carried over
 * unchanged so that a reader who has verified it once does not have to verify it
 * again. Determinism comes from stampDeterministic(): pdf-lib stamps the wall
 * clock into a document created with PDFDocument.create(), and every assembled
 * document here is created that way, so both the per-component documents and the
 * assembled packet are pinned to the factory's single fixed date. Without it two
 * builds of identical inputs differ and the family's hash-bound raster receipt is
 * silently invalidated.
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
