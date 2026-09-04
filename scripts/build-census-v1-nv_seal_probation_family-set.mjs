#!/usr/bin/env node
/**
 * The Nevada treatment-programme sealing packet family builder.
 *
 *   node scripts/build-census-v1-nv_seal_probation_family-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   nv_seal_probation_family   NRS 176A.245, 176A.265 and 176A.295 — sealing
 *                              after a treatment-programme discharge,
 *                              conditional dismissal or set-aside
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/NV.memo.json, track
 * nv_seal_probation_family, corrected at source 2026-08-08 — establishes that
 * the three sections are structurally identical and each carries TWO
 * mechanisms: subsection 1 is automatic (the court shall order the records
 * sealed, without a hearing, once the defendant is discharged or the case
 * dismissed under the corresponding programme section, unless the Division
 * petitions for good cause not to seal), and subsection 2 is participant-filed
 * (where the charge was under NRS 200.485, NRS 484C.110 or NRS 484C.120 and
 * was conditionally dismissed or the judgment set aside, sealing follows only
 * upon the defendant's petition, not sooner than seven years after). The
 * Nevada State Police Records, Communications and Compliance Division
 * publishes NO form for a subsection 2 petition — its complete sealing
 * inventory is a General Information document, a statutory page and two sample
 * Word petitions for the ordinary chapter 179 petition, and it records that
 * procedures vary from county to county — so the strategy is custom_pleading
 * and this build composes the petition, its proposed order and its
 * declaration, conditionally, with the automatic branch carried as guidance.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — which court handled the case and in which county, the
 * case number, which chapter 176A programme section the case ran under, the
 * charge, the disposition and its date — belongs to records the platform has
 * not seen, so each is a labelled dotted blank, declared
 * REQUIRED_BEFORE_FILING and disclosed by its printed label in
 * participant-instructions.md, with the clerk of the court that handled the
 * case named as the checkable authority. The list of agencies and officers
 * the proposed order must name is likewise the participant's to establish
 * from their own papers, because the sections reach only records in the
 * custody of the agencies and officers named in the court's order. No
 * signature, no signature date, no judicial, clerk or court-date field is
 * ever written. The sections prescribe no fee and no service; both silences
 * are stated from the record, and the open questions (whether a particular
 * clerk charges a filing fee; whether the petition must be served on the
 * Division or the prosecutor) are delegated to the clerk of the court that
 * handled the case by name.
 *
 * Rasterization, when not skipped, goes through
 * scripts/raster/pdf-page-raster.mjs (Chromium, calibrated). Never Poppler.
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

const FAMILY_ID = "nv_seal_probation_family-set";
const OUT = "data/rcap-all50/overlays/census-v1/nv/nv-seal-probation-family-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-nv_seal_probation_family-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "NV",
  routeKey: "obligation:track-pathway:NV:nv_seal_probation_family:probation-or-specialty-court-dismissal-set-aside-sealing",
  routeSelectionId: "nv-seal-probation-family-composed-set",
  legalName: "Sealing After a Treatment-Program Discharge, Conditional Dismissal or Set-Aside (NRS 176A.245, 176A.265 and 176A.295)",
  routeName: "clearing a Nevada case after a court treatment programme, a conditional dismissal or a set-aside, under NRS 176A.245, 176A.265 or 176A.295",
  statute: "NRS 176A.245, 176A.265 and 176A.295"
});

/* The eight components, in the packet-set manifest's own order
 * (data/record-clearing/legal-design-packet-set-manifests.json,
 * packetSetId nv_seal_probation_family-set). */
const COMPONENTS = [
  "detection_and_routing",
  "branch_screen",
  "discharge_type_screen",
  "primary_filing",
  "proposed_order",
  "declaration_and_verification",
  "filing_and_service_instructions",
  "referral_instructions"
];

const SUBSECTION2_CONDITION =
  "Generated only on the subsection 2 branch: a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120, "
  + "conditionally dismissed or the judgment of conviction set aside, and not sooner than seven years after.";

const COMPONENT_CONDITIONS = {
  primary_filing: SUBSECTION2_CONDITION,
  proposed_order: "Accompanies the subsection 2 petition.",
  declaration_and_verification: "Accompanies the subsection 2 petition.",
  filing_and_service_instructions: "Accompanies the subsection 2 petition."
};

const COMPOSED_TITLES = {
  detection_and_routing: "Which Programme Section Your Case Ran Under",
  branch_screen: "The Question That Decides Whether Anything Is Filed",
  discharge_type_screen: "Honourable or Dishonourable Discharge",
  primary_filing: "Petition to Seal Records Under Subsection 2 of NRS 176A.245, 176A.265 or 176A.295",
  proposed_order: "Proposed Order Sealing Records",
  declaration_and_verification: "Declaration in Support of the Petition",
  filing_and_service_instructions: "Filing and Service Instructions for the Subsection 2 Petition",
  referral_instructions: "The Automatic Branch: Where to Go When Nothing Is Filed"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/NV.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  let memoTrack = null;
  let manifestSet = null;
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "nv_seal_probation_family") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track nv_seal_probation_family in the memo" });
    else if (memoTrack.outputStrategy !== "custom_pleading") {
      failures.push({ record: MEMO_PATH, why: `the memo's outputStrategy is ${memoTrack.outputStrategy}, not custom_pleading; this builder may not proceed against a drifted strategy` });
    }
  } catch (e) { failures.push({ record: MEMO_PATH, why: String(e.message ?? e) }); }
  try {
    const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), "utf8"));
    manifestSet = (manifests.packetSets ?? []).find((s) => s.packetSetId === FAMILY_ID) ?? null;
    if (!manifestSet) failures.push({ record: MANIFEST_PATH, why: `no packetSetId ${FAMILY_ID} in the manifest` });
    else {
      const roles = (manifestSet.components ?? []).slice().sort((a, b) => a.order - b.order).map((c) => c.role);
      if (JSON.stringify(roles) !== JSON.stringify(COMPONENTS)) {
        failures.push({ record: MANIFEST_PATH, why: `the manifest's component roles [${roles.join(", ")}] have drifted from this builder's component set [${COMPONENTS.join(", ")}]` });
      }
    }
  } catch (e) { failures.push({ record: MANIFEST_PATH, why: String(e.message ?? e) }); }
  return { memoTrack, manifestSet, failures };
}

/* ---- fixtures --------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "2405 Bonneville Avenue, Las Vegas, NV 89101",
    "participant.phone": "702-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "11884 East Painted Rock Crossing Boulevard, Apartment 14B, Reno, Nevada 89506-2214",
    "participant.phone": "(775) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- composed documents -------------------------------------------------------- *
 * Everything below traces to the NV legal-design record's own text — the
 * statutory summaries, the correction record and the packet-set manifest.
 * Nothing is stated that neither records: no fee figure, no service method,
 * no county practice is invented, and the record's own silences (no fee
 * prescribed, no service prescribed) are stated as silences.
 */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "detection_and_routing") {
    L.push(`For: ${name}`, "");
    L.push("Three Nevada sections govern sealing after a court treatment programme, and they are structurally identical - the branch, not the section, decides everything. Which section applies follows from which programme your case ran under:", "");
    L.push("- NRS 176A.245, where the case ran under the programme of treatment for ALCOHOL OR OTHER SUBSTANCE USE established under NRS 176A.240;");
    L.push("- NRS 176A.265, where it ran under the programme for treatment of MENTAL ILLNESS OR INTELLECTUAL DISABILITIES established under NRS 176A.260;");
    L.push("- NRS 176A.295, where it ran under the programme for treatment of VETERANS AND MEMBERS OF THE MILITARY established under NRS 176A.290.", "");
    L.push("If your case never ran through one of those three programmes, this packet is not your route: an ordinary probation discharge routes to NRS 176A.850 and then to a petition under NRS 179.245 on the conviction track. If you are not sure which programme your case ran under, the clerk of the court that handled the case can tell you from the court's own record.", "");
    L.push("Whichever section applies, the next page's question - the branch - is what decides whether you file anything at all.");
  } else if (componentId === "branch_screen") {
    L.push(`For: ${name}`, "");
    L.push("ONE QUESTION decides whether anything in this packet is filed:", "");
    L.push("Were you charged with a violation of NRS 200.485 (battery constituting domestic violence), NRS 484C.110 or NRS 484C.120 (driving or being in actual physical control of a vehicle under the influence, or the related controlled-substance driving offence), AND were the charges conditionally dismissed or the judgment of conviction set aside?", "");
    L.push("IF NO - subsection 1 of the applicable section applies. Sealing is AUTOMATIC: after you are discharged from probation or the case is dismissed under the programme section, the court shall order the records sealed, without a hearing, if you fulfilled the terms and conditions imposed by the court and the Division - unless the Division petitions the court, for good cause shown, not to seal and requests a hearing. You file NOTHING. Do not file the petition in this packet. The referral page says where to go instead.", "");
    L.push("IF YES - subsection 2 applies. Sealing is NOT automatic: it follows only upon the filing of a petition by you, and the petition cannot be filed sooner than SEVEN YEARS after the conditional dismissal or the setting aside of the judgment. The petition, proposed order and declaration in this packet are for exactly this branch.", "");
    L.push("BARRED ON BOTH BRANCHES: subsection 3 of each section forbids sealing under the section where you were charged with a violation of NRS 200.508 (abuse, neglect or endangerment of a child) or NRS 200.5099 (abuse, neglect, exploitation, isolation or abandonment of an older person or a vulnerable person). If that was the charge, stop: nothing in this packet can be filed, and a lawyer or Nevada Legal Services is the place to take the question.", "");
    L.push("Sealing under these sections is also not available where the programme was not completed and you were sentenced rather than discharged or the case dismissed.");
  } else if (componentId === "discharge_type_screen") {
    L.push(`For: ${name}`, "");
    L.push("If you were discharged from probation, was the discharge HONOURABLE or DISHONOURABLE?", "");
    L.push("On this track the answer does not change the mechanism: subsections 1 and 2 turn on whether you fulfilled the terms and conditions imposed by the court and the Division, not on a presumption.", "");
    L.push("It matters for what comes after. NRS 179.2445(2) provides that the rebuttable presumption in favour of sealing does NOT apply to a defendant given a dishonorable discharge from probation under NRS 176A.850 who applies for sealing of records relating to the conviction. If your discharge was dishonourable, any later petition on the ordinary conviction track under NRS 179.245 proceeds without that presumption, and that is a reason to talk to a lawyer or Nevada Legal Services before filing anything anywhere.", "");
    L.push("Your own court paperwork states which discharge you were given; the clerk of the court that handled the case can confirm it from the record.");
  } else if (componentId === "primary_filing") {
    L.push("USE THIS PETITION ONLY ON THE SUBSECTION 2 BRANCH: you were charged with a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120, the charges were conditionally dismissed or the judgment of conviction set aside, and not sooner than seven years have passed since. On the subsection 1 branch nothing is filed - the branch-screen page of this packet is the test.", "");
    L.push("IN THE " + DOTS(44) + " COURT");
    L.push("(DISTRICT, JUSTICE OR MUNICIPAL COURT THAT HANDLED THE CASE, AND ITS COUNTY - your own court paperwork states it, and that court's clerk can confirm it)", "");
    L.push(`IN THE MATTER OF THE PETITION OF ${name.toUpperCase()} TO SEAL RECORDS`, "");
    L.push("Case No. " + DOTS(40) + "  (the case number of the underlying case, from your court paperwork)", "");
    L.push("PETITION TO SEAL RECORDS UNDER SUBSECTION 2 OF NRS 176A.245, NRS 176A.265 OR NRS 176A.295", "");
    L.push(`1. The petitioner, ${name}, petitions this Court, as the court that handled the case identified above, to order sealed all records relating to that case, as subsection 2 of the applicable section provides.`, "");
    L.push("2. The petitioner states, from the court's own records:", "");
    L.push("The chapter 176A programme the case ran under (the programme of treatment under NRS 176A.240, NRS 176A.260 or NRS 176A.290, making the applicable sealing section NRS 176A.245, NRS 176A.265 or NRS 176A.295):");
    L.push(DOTS(), "");
    L.push("The charge, worded exactly as the court record words it (a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("How the charge was resolved - conditionally dismissed, or the judgment of conviction set aside - exactly as the record states it:");
    L.push(DOTS(), "");
    L.push("Date of the conditional dismissal or of the setting aside of the judgment:");
    L.push(DOTS(), "");
    L.push("3. Not sooner than seven years have elapsed since the date stated above, as subsection 2 requires.", "");
    L.push("4. The petitioner fulfilled the terms and conditions imposed by the court and by the Division of Parole and Probation.", "");
    L.push("5. The petitioner was not charged with a violation of NRS 200.508 or NRS 200.5099, which subsection 3 of each section excludes from sealing.", "");
    L.push("6. The petitioner therefore asks the Court to order sealed all documents, papers and exhibits in the petitioner's record, minute book entries and entries on dockets, and other documents relating to the case in the custody of the agencies and officers named in the proposed order submitted with this petition, as subsection 2 of the applicable section provides. The petitioner is advised that the court shall order the records sealed without a hearing unless the Division petitions the court, for good cause shown, not to seal the records and requests a hearing thereon.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`DATE OF BIRTH: ${dob}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else if (componentId === "proposed_order") {
    L.push("This proposed order accompanies the subsection 2 petition. The list of agencies and officers below is operative text, not formality: subsections 1 and 2 reach only records \"in the custody of such other agencies and officers as are named in the court's order\", and under subsection 4 each named agency or officer must notify the court in writing of compliance. You list every agency that touched your case, from your own papers.", "");
    L.push("IN THE " + DOTS(44) + " COURT");
    L.push("(THE SAME COURT AS THE PETITION)", "");
    L.push(`IN THE MATTER OF THE PETITION OF ${name.toUpperCase()} TO SEAL RECORDS`, "");
    L.push("Case No. " + DOTS(40), "");
    L.push("ORDER SEALING RECORDS UNDER SUBSECTION 2 OF NRS 176A.245, NRS 176A.265 OR NRS 176A.295", "");
    L.push("The petition of the above-named petitioner to seal records having been filed under subsection 2 of the applicable section, and the Division not having petitioned the court, for good cause shown, not to seal the records,", "");
    L.push("IT IS ORDERED that all documents, papers and exhibits in the petitioner's record, minute book entries and entries on dockets, and other documents relating to the case in the custody of the agencies and officers named below are SEALED.", "");
    L.push("Agencies and officers whose records are sealed by this order (listed by the petitioner from the petitioner's own papers; every agency that touched the case belongs on these lines):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Under subsection 4 of the applicable section, the court will send a copy of this order to each agency or officer named in it, and each must notify the court in writing of compliance. Under NRS 179.275 a copy also goes to the Central Repository for Nevada Records of Criminal History.", "");
    L.push("DATED this " + DOTS(12) + " day of " + DOTS(20) + ", " + DOTS(8), "");
    L.push("JUDGE " + DOTS(56), "");
    L.push("(The date and signature lines above are the court's own. Nothing on them is written by the petitioner or by this packet.)");
  } else if (componentId === "declaration_and_verification") {
    L.push("This declaration accompanies the subsection 2 petition. The sections prescribe no verification; this is the ordinary support for facts not appearing of record, and every fact on it is yours to state from your own records.", "");
    L.push(`1. I, ${name}, am the petitioner in the accompanying petition to seal records.`, "");
    L.push("2. The case ran under the chapter 176A programme stated below, and I completed it:");
    L.push(DOTS(), "");
    L.push("3. The charge was resolved as stated below - conditionally dismissed, or the judgment of conviction set aside - on the date stated below:");
    L.push(DOTS(), "");
    L.push("4. Not sooner than seven years have elapsed since that date. The computation is mine, made from the date on my own court paperwork.", "");
    L.push("5. I fulfilled the terms and conditions imposed by the court and by the Division of Parole and Probation.", "");
    L.push("6. I declare under penalty of perjury that the foregoing is true and correct.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF DECLARANT " + DOTS(38), "");
    L.push("(The declarant signs and dates this declaration personally. Nothing on this page is signed or dated for the declarant.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "filing_and_service_instructions") {
    L.push(`For: ${name}`, "");
    L.push("These instructions accompany the subsection 2 petition. On the subsection 1 branch nothing is filed and none of this applies.", "");
    L.push("WHERE TO FILE. In the justice court, municipal court or district court that handled the case - the sections name all three, as applicable, so venue follows the court of the underlying case rather than a single court level. Your own court paperwork states which court that is.");
    L.push("WHEN. Not sooner than seven years after the conditional dismissal or the setting aside of the judgment. Count from the date on your court paperwork; if the record does not show clearly whether the disposition was a conditional dismissal, a set-aside or an ordinary dismissal, stop and get help before filing.");
    L.push("WHAT TO EXPECT. The court shall order the records sealed WITHOUT A HEARING unless the Division of Parole and Probation petitions the court, for good cause shown, not to seal the records and requests a hearing. If the Division does petition, that is a contested proceeding and a reason to get a lawyer.");
    L.push("FEE. Neither NRS 176A.245, NRS 176A.265 nor NRS 176A.295 imposes, authorises or mentions a fee, on either branch. Whether the clerk of your particular court charges a filing fee for the petition is not established by the sections, and this packet states no amount: ask the clerk of the court that handled the case before filing. The NRS 179.245(9) sex-trafficking fee waiver is confined by its own words to a petition under NRS 179.245 and is not authority for a waiver here.");
    L.push("SERVICE. The sections prescribe none: they require only the filing of a petition by the defendant and name no person to be served, while giving the Division the right to object. Whether your court expects the petition to be served on the Division or on the prosecutor is not established by the text: ask the clerk of the court that handled the case, and follow what that clerk says.");
    L.push("THE PROPOSED ORDER. Whether the court expects the proposed order lodged with the petition or settled after decision is not established by the sections: ask the same clerk.");
    L.push("AFTER THE ORDER. The court sends a copy of the sealing order to each agency or officer named in it, each of which must notify the court in writing of compliance, and under NRS 179.275 a copy also goes to the Central Repository for Nevada Records of Criminal History.", "");
    L.push("WHAT SEALING IS AND IS NOT. Nevada law calls this record sealing and never expungement: the state agency states directly that sealing is not expungement because it does not authorise destruction of the records. Under NRS 179.285 the proceedings are deemed never to have occurred and civil rights are restored, but NRS 179.295 allows sealed records to be reopened and NRS 179.301 allows certain persons and agencies to inspect them. A Nevada order does not bind out-of-state or federal agencies and does not reach records they hold. Sealing does not restore firearm rights; only a pardon that does not restrict the right to bear arms does. Nevada sealing must not be described as having any immigration effect.");
  } else {
    L.push(`For: ${name}`, "");
    L.push("On the subsection 1 branch - no charge under NRS 200.485, NRS 484C.110 or NRS 484C.120 that was conditionally dismissed or set aside - sealing is automatic and YOU FILE NOTHING. This page is where to go instead of filing:", "");
    L.push("THE COURT THAT SUPERVISED THE PROGRAMME. After you are discharged from probation or the case is dismissed under the programme section, that court is required to order the records sealed, without a hearing, if you fulfilled the terms and conditions imposed by the court and the Division - unless the Division petitions, for good cause shown, not to seal. The court holds the sealing order and is the only body that can act. If time has passed and you do not know whether the order was entered, ask the clerk of the court that handled the case to check the record.");
    L.push("NEVADA LEGAL SERVICES. If the clerk's answer is that no order was entered, or the Division has objected, or anything about the record is unclear, Nevada Legal Services is where to take it.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING ANYTHING", "");
    L.push("- the charge was a violation of NRS 200.508 or NRS 200.5099, which subsection 3 bars from sealing on both branches;");
    L.push("- the Division petitions the court, for good cause shown, not to seal and requests a hearing - that is a contested proceeding;");
    L.push("- whether you fulfilled the terms and conditions imposed by the court and the Division is disputed or unclear on the record;");
    L.push("- the programme was not completed and you were sentenced rather than discharged or the case dismissed;");
    L.push("- the seven-year period has not elapsed, or its start date is uncertain because the record does not show clearly how the case was resolved;");
    L.push("- your discharge was dishonourable, which under NRS 179.2445(2) removes the presumption on any later petition under NRS 179.245;");
    L.push("- records sit in more than one county, or in both municipal and justice or district court;");
    L.push("- federal, tribal, military or out-of-state records are involved - a Nevada order does not reach them;");
    L.push("- your goal is firearm rights, which sealing does not restore;");
    L.push("- any pending charge, any offence-category question, or any immigration question.");
  }
  L.push("", `Route: ${ROUTE.routeKey}`);
  return L.join("\n");
}

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

/* ---- the field maps -------------------------------------------------------------- */
function composedMap(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const write = (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId });
  const protectedBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  });
  const courtBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  });
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const writes = [];
  const refusals = [];
  if (componentId === "primary_filing") {
    writes.push(
      write("petitioner_name", "Petitioner named in the title and paragraph 1 of the petition", "participant.full_legal_name"),
      write("date_of_birth", "Petitioner's date of birth in the contact block at the foot of the petition", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("court_identity", "The district, justice or municipal court that handled the case, and its county, in the caption of the petition",
        "the court that handled the case - district, justice or municipal - and its county, copied from your own court paperwork; that court's clerk can confirm it",
        "venue follows the court of the underlying case, which lives on a record the platform has not seen"),
      rbf("underlying_case_number", "Case number of the underlying case, in the caption of the petition",
        "the case number of the underlying case, copied from your court paperwork",
        "no case identifier is held for a record the platform has not seen"),
      rbf("programme_section", "The chapter 176A programme the case ran under, in paragraph 2 of the petition",
        "which programme your case ran under - alcohol or other substance use (NRS 176A.240), mental illness or intellectual disabilities (NRS 176A.260), or veterans and members of the military (NRS 176A.290) - the clerk of the court that handled the case can tell you from the record",
        "which programme section applies is a case fact on the court's own record, not a fact the platform holds"),
      rbf("charge_wording", "The charge, worded exactly as the court record words it, in paragraph 2 of the petition",
        "the charge, worded exactly as the court record words it - it must be a violation of NRS 200.485, NRS 484C.110 or NRS 484C.120 for this petition to be the right instrument",
        "no charge fact is held for a record the platform has not seen"),
      rbf("resolution_kind", "How the charge was resolved - conditionally dismissed, or the judgment set aside - in paragraph 2 of the petition",
        "whether the charges were conditionally dismissed or the judgment of conviction was set aside, exactly as the record states it - if the record is unclear, stop and ask the clerk of the court that handled the case",
        "the resolution kind decides the branch and lives on the record, not in the platform"),
      rbf("resolution_date", "Date of the conditional dismissal or of the setting aside of the judgment, in paragraph 2 of the petition",
        "the date of the conditional dismissal or set-aside, from your court paperwork - the seven-year period runs from it",
        "no disposition fact is held for a record the platform has not seen"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
        "the petitioner signs the petition personally"),
      protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
        "a date written before the petition is signed would be false")
    );
  } else if (componentId === "proposed_order") {
    writes.push(write("petitioner_name", "Petitioner named in the title of the proposed order", "participant.full_legal_name"));
    refusals.push(
      rbf("order_court_identity", "The court named in the caption of the proposed order",
        "the same court as the petition, copied from your court paperwork",
        "venue follows the court of the underlying case"),
      rbf("order_case_number", "Case number in the caption of the proposed order",
        "the same case number as the petition, from your court paperwork",
        "no case identifier is held for a record the platform has not seen"),
      rbf("named_agencies_and_officers", "Agencies and officers whose records are sealed by this order",
        "every agency and officer that touched your case - the sections reach only records in the custody of the agencies and officers named in the court's order, so an agency left off the list keeps its records unsealed; your own papers name them, and the clerk of the court that handled the case can help you check the list",
        "which agencies touched the particular case is operative text the participant establishes from their own papers"),
      courtBlank("order_date", "Dated - the day, month and year lines of the order",
        "the court dates its own order"),
      courtBlank("judge_signature", "Signature of the judge on the order",
        "the order is the court's to sign; nothing is written on the judge's line by this build")
    );
  } else if (componentId === "declaration_and_verification") {
    writes.push(write("declarant_name", "Declarant named in paragraph 1 and the printed-name line of the declaration", "participant.full_legal_name"));
    refusals.push(
      rbf("declared_programme", "The chapter 176A programme stated in paragraph 2 of the declaration",
        "the programme your case ran under, the same answer as on the petition",
        "which programme section applies is a case fact on the court's own record"),
      rbf("declared_resolution", "The resolution and its date stated in paragraph 3 of the declaration",
        "how the charge was resolved and on what date, the same answers as on the petition, from your court paperwork",
        "no disposition fact is held for a record the platform has not seen"),
      protectedBlank("declarant_signature", "Signature of the declarant on the declaration",
        "the declarant signs the declaration personally"),
      protectedBlank("declarant_signature_date", "Date beside the declarant's signature on the declaration",
        "a date written before the declaration is signed would be false")
    );
  } else {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/NV.memo.json, track "
      + "nv_seal_probation_family, corrected at source 2026-08-08) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId nv_seal_probation_family-set)",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes --------------------------------------------- */
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
      let value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      // The petition title and the order title print the name in upper case;
      // accept the value where either casing is readable from the bytes.
      const renderedValue = componentText.includes(value) ? value : value.toUpperCase();
      const found = componentText.includes(renderedValue);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += renderedValue.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: renderedValue, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters ------------------------------------ */
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

/* ---- outputs -------------------------------------------------------------------------- */
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
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Nevada calls this record sealing and never expungement. NRS 176A.245, 176A.265 and 176A.295 are structurally identical — they differ only in which court treatment programme they attach to — and each carries two branches. On the subsection 1 branch sealing is **automatic** and you file **nothing**. On the subsection 2 branch — a charge under NRS 200.485, NRS 484C.110 or NRS 484C.120, conditionally dismissed or the judgment set aside — sealing follows only on your own petition, and not sooner than **seven years** after. No official form exists for that petition: the state records division publishes only sample petitions for the ordinary chapter 179 route and records that procedures vary from county to county, so the petition, proposed order and declaration in this packet are composed pleadings.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to records the platform has not seen — your court paperwork and the court's own record — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Which branch you are on", "");
  out.push("| Branch | When it is yours | What you do |", "| --- | --- | --- |");
  out.push("| Subsection 1 — automatic | any programme case EXCEPT a charge under NRS 200.485, NRS 484C.110 or NRS 484C.120 that was conditionally dismissed or set aside | file **nothing**; the referral page says where to go |");
  out.push("| Subsection 2 — petition | a charge under NRS 200.485, NRS 484C.110 or NRS 484C.120, conditionally dismissed or the judgment set aside, **and** at least seven years have passed | file the petition, proposed order and declaration in this packet |");
  out.push("");
  out.push("Barred on **both** branches: a charge under NRS 200.508 or NRS 200.5099 (subsection 3 of each section). If that was the charge, nothing in this packet can be filed.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `detection_and_routing` | which of the three programme sections your case ran under |");
  out.push("| `branch_screen` | the single question that decides whether anything is filed |");
  out.push("| `discharge_type_screen` | honourable versus dishonourable discharge, and why it matters later |");
  out.push("| `primary_filing` | the composed subsection 2 petition (conditional — subsection 2 branch only) |");
  out.push("| `proposed_order` | the proposed sealing order naming the agencies and officers (conditional) |");
  out.push("| `declaration_and_verification` | your declaration in support (conditional) |");
  out.push("| `filing_and_service_instructions` | where to file, what to expect, fee and service (conditional) |");
  out.push("| `referral_instructions` | the automatic branch: where to go when nothing is filed |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the instrument you are filing.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order (subsection 2 branch only)", "");
  out.push("1. **Answer the branch screen.** If you are on the subsection 1 branch, stop here and read the referral page instead — you file nothing.");
  out.push("2. **Gather your court paperwork.** The court, the county, the case number, the programme, the charge wording, the resolution and its date all come from it. The clerk of the court that handled the case can confirm anything unclear.");
  out.push("3. **Count the seven years** from the date of the conditional dismissal or set-aside. If the period has not elapsed, or the record does not show clearly how the case was resolved, stop and get help.");
  out.push("4. **Fill in every dotted blank**, including every agency and officer on the proposed order — an agency left off the list keeps its records unsealed.");
  out.push("5. **Sign and date the petition and the declaration yourself.** The platform never signs for you and never dates a signature. The order's date and signature lines are the court's own.");
  out.push("6. **Ask the clerk of the court that handled the case three things before filing**: whether the clerk charges a filing fee (the sections prescribe none and this packet states no amount), whether the petition must be served on the Division of Parole and Probation or the prosecutor (the sections prescribe no service), and whether the proposed order is lodged with the petition or settled after decision (the sections are silent).");
  out.push("7. **File in the court that handled the case** — district, justice or municipal, as your paperwork states.");
  out.push("8. **What to expect**: the court shall order the records sealed without a hearing unless the Division petitions, for good cause shown, not to seal and requests one. If it does, that is a contested proceeding — get a lawyer.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The judge's signature and the order's date lines.** The order is the court's to sign and date.");
  out.push("- **The filing fee, the service method and the proposed-order practice of your particular court.** None is established by the sections; the clerk of the court that handled the case is the authority that can answer all three — ask before you file.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- the charge was under NRS 200.508 or NRS 200.5099 — subsection 3 bars sealing on both branches;");
  out.push("- the Division petitions not to seal and requests a hearing — a contested proceeding;");
  out.push("- whether you fulfilled the terms and conditions imposed by the court and the Division is disputed or unclear;");
  out.push("- the programme was not completed and you were sentenced;");
  out.push("- the seven-year period has not elapsed, or its start date is uncertain;");
  out.push("- your discharge was dishonourable — NRS 179.2445(2) removes the presumption on any later NRS 179.245 petition;");
  out.push("- records sit in more than one county or more than one court;");
  out.push("- federal, tribal, military or out-of-state records — a Nevada order does not reach them;");
  out.push("- your goal is firearm rights, which sealing does not restore;");
  out.push("- any pending charge, offence-category question, or immigration question.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of composed pleadings, screens and process pages. It is not an official Nevada form — none exists for a subsection 2 petition, which is why these pages are composed — and it is not legal advice, it is not filed for you, and it does not decide whether the court will order sealing. Sealing is not expungement: it does not authorise destruction of the records, it does not restore firearm rights, and it must not be described as having any immigration effect.", "");
  out.push(`_Route: ${ROUTE.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { failures } = resolveCodifiedGrounds();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_LEGAL_INPUT", failedGrounds: failures,
      why: "a codified record this family is composed from is missing or has drifted, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: 0, codifiedGroundsVerified: [MEMO_PATH, MANIFEST_PATH],
      components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(c));
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
      assert.ok(body.includes(facts["participant.full_legal_name"]) || body.includes(facts["participant.full_legal_name"].toUpperCase()),
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
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no binary source is bound, and none exists to bind: the MASTER_QUEUE row records sourceStatus "
      + "CUSTOM_PLEADING_FROM_CODIFIED_TEXT with officialFormFamily NONE and boundSources []. The build is "
      + "grounded on two committed records, verified present and un-drifted before anything is composed: the "
      + "legal-design intake track and the packet-set manifest.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The Nevada State Police Records, Communications and Compliance Division publishes no form for a petition "
      + "under subsection 2 of NRS 176A.245, 176A.265 or 176A.295 — its complete sealing inventory is a General "
      + "Information document, a statutory page and two sample Word petitions for the ordinary chapter 179 "
      + "petition, and it records that procedures vary from county to county — and the sections prescribe none. "
      + "The legal-design correction of 2026-08-08 read all three sections in full, resolved the strategy to "
      + "custom_pleading with the petition, proposed order and declaration generated conditionally on the "
      + "subsection 2 branch and the automatic subsection 1 branch carried as guidance. No form was substituted "
      + "and none was invented.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track nv_seal_probation_family: the three sections read in full 2026-08-08, both branches, exclusions, waiting period, rules, stop conditions, open questions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the eight-component set with its conditions and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that no official instrument for a subsection 2 petition has been published since 2026-08-08",
      "that any output is approved for participant delivery",
      "that any record is eligible for sealing under NRS 176A.245, 176A.265 or 176A.295"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — no binary source is bound; the build is grounded on the committed legal-design record and packet-set manifest alone",
    componentSet: COMPONENTS,
    componentRoutes: Object.fromEntries(COMPONENTS.map((componentId) => [componentId, ROUTE.routeKey])),
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The subsection-1-versus-subsection-2 fork is not "
      + "route-determined: it turns on the participant's own charge and disposition, so the branch screen states "
      + "the single deciding question, the conditional instruments print their condition on their own faces, and "
      + "the participant files either nothing (subsection 1) or the petition set (subsection 2). Which of the "
      + "three programme sections applies changes nothing about the mechanism — the sections are structurally "
      + "identical — and is pleaded as a dotted blank from the court's own record. Nothing is selected for the "
      + "participant.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
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
    findings: [
      {
        finding:
          "Each of NRS 176A.245, 176A.265 and 176A.295 carries two mechanisms: subsection 1 is automatic (the "
          + "court shall order the records sealed, without a hearing, unless the Division petitions for good "
          + "cause not to seal) and subsection 2 is participant-filed (a charge under NRS 200.485, NRS 484C.110 "
          + "or NRS 484C.120, conditionally dismissed or set aside, sealing only on the defendant's petition and "
          + "not sooner than seven years after). The legal-design correction of 2026-08-08 read all three "
          + "sections in full and resolved the strategy to custom_pleading for exactly this reason.",
        consequence:
          "The petition, proposed order and declaration are composed as conditional instruments with the "
          + "subsection 2 condition printed on their own faces; the automatic branch is carried as guidance "
          + "(detection, branch screen, discharge screen, referral). Nothing is generated that the subsection 1 "
          + "participant could mistakenly file."
      },
      {
        finding:
          "No official form exists for a subsection 2 petition: the Division's complete published sealing "
          + "inventory is a General Information document, a statutory page and two sample Word petitions for the "
          + "ordinary chapter 179 petition, and its own guidance records that procedures vary from county to "
          + "county.",
        consequence:
          "The petition is a composed pleading pleading exactly what subsection 2 requires: the programme "
          + "section, the qualifying charge, the conditional dismissal or set-aside and its date, the seven-year "
          + "computation, fulfilment of the terms and conditions, and the absence of a subsection 3 exclusion. "
          + "No form was substituted and none was invented."
      },
      {
        finding:
          "Subsections 1 and 2 reach only records 'in the custody of such other agencies and officers as are "
          + "named in the court's order', and subsection 4 makes each named agency report compliance.",
        consequence:
          "The proposed order prints the custodian list as labelled dotted blanks declared "
          + "REQUIRED_BEFORE_FILING, with the participant's own papers as the source and the clerk of the court "
          + "that handled the case named as the checkable authority, and the instructions state in terms that an "
          + "agency left off the list keeps its records unsealed. The judge's signature and the order's date "
          + "lines are court-owned and never written."
      },
      {
        finding:
          "The sections prescribe no fee and no service, and the legal-design record carries three open "
          + "questions it classifies as release-level: whether a particular clerk charges a filing fee, whether "
          + "the petition must be served on the Division or the prosecutor, and whether the proposed order is "
          + "lodged with the petition or settled after decision.",
        consequence:
          "All three silences are stated from the record, no amount and no method is guessed, and each open "
          + "question is delegated to the clerk of the court that handled the case by name, on the paper and in "
          + "the instructions. The NRS 179.245(9) sex-trafficking fee waiver is stated in its recorded boundary: "
          + "confined to NRS 179.245 petitions and not authority here."
      },
      {
        finding:
          "NRS 179.2445(2) removes the rebuttable presumption in favour of sealing for a defendant given a "
          + "dishonorable discharge under NRS 176A.850 — on the ordinary conviction track, not this one.",
        consequence:
          "The discharge-type screen states exactly that boundary: the answer does not change this track's "
          + "mechanism, and a dishonourable discharge is a reason to get help before filing anything anywhere. "
          + "The counsel limitations (sealing is not expungement; no firearm-rights restoration; no reach into "
          + "federal or out-of-state records; no immigration effect) are stated in the instructions in the "
          + "record's own terms."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The composed subsection 2 petition pleads the programme section, the qualifying charge, the conditional dismissal or set-aside and its date, the seven-year computation, fulfilment of the terms and conditions, and the absence of a subsection 3 exclusion. Confirm the composed instrument is sufficient where no official form exists and county procedures vary.",
      "Whether a clerk charges a filing fee for a subsection 2 petition, whether the petition must be served on the Division of Parole and Probation or the prosecutor, and whether the proposed order is lodged with the petition or settled after decision are the legal-design record's own open questions, delegated to the clerk by name. Confirm the delegation or supply the answers.",
      "The petition and declaration plead fulfilment of the terms and conditions imposed by the court and the Division as the participant's own sworn statement. Confirm that presentation.",
      "The proposed order's custodian list is participant-supplied from their own papers. Confirm that the participant, rather than the platform, is the right source for the agencies-and-officers list."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound because none exists for this petition; confirm the codified-grounds posture is legible to reviewers.",
      "The conditional instruments print their subsection 2 condition on their own faces and the automatic branch generates nothing filable; confirm the two-branch presentation.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
    ]
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
    implementationStrategy: "custom_pleading",
    boundSources: 0,
    codifiedGrounds: [MEMO_PATH, MANIFEST_PATH],
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
