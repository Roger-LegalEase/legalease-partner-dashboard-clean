#!/usr/bin/env node
/**
 * The Georgia post-2013 non-conviction record-restriction packet family builder.
 *
 *   node scripts/build-census-v1-ga-nonconv-post2013-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   ga-nonconv-post2013   O.C.G.A. § 35-3-37(h), (i), (k)(1) — record
 *                         restriction of a non-conviction arrest cycle arising
 *                         from an arrest on or after July 1, 2013
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/GA.memo.json, track
 * ga-nonconv-post2013, reviewed as of 2026-08-02 — establishes that
 * restriction under § 35-3-37(h) is mandatory and automatic: there is no
 * application, no petition and no statewide form. GBI's published restriction
 * form is captioned "Prior to 07/01/2013" and is the WRONG instrument for
 * this route. Where the restriction was never entered, the participant's
 * route is a written request to the prosecuting attorney for the county of
 * arrest, for which no statewide form exists — georgia.gov directs people to
 * ask for "the form provided by the prosecuting attorney's office", so a
 * county office's own intake form GOVERNS where it exists (localFormOverride)
 * and the generated request is the covering request. The track is modelled as
 * two sequential units — the automatic mechanism (guidance) and the written
 * request (custom_pleading) — and this build composes exactly that.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the county of arrest, the arrest date, the arresting
 * agency, the charges, the disposition and its date, the court and case
 * number — belongs to records the platform has not seen, so each is a
 * labelled dotted blank, declared REQUIRED_BEFORE_FILING and disclosed by its
 * printed label in participant-instructions.md, with the participant's own
 * Georgia criminal history report and the clerk of the court that handled the
 * case named as the checkable authorities. The prosecuting attorney office's
 * postal or e-mail destination varies by county and is the participant's to
 * confirm with that office. No signature and no signature date is ever
 * written. The route carries no fee (the $25.00 GCIC processing fee belongs
 * to the pre-July-2013 application route, stated from the record), no notice
 * and no service.
 *
 * TERMINOLOGY, FROM THE COUNSEL LIMITATIONS: Georgia has not used
 * "expungement" in the statute since July 1, 2013. This packet says
 * "restrict" and, separately, "seal", and it NEVER tells a participant they
 * may state the record does not exist — § 35-3-37(u) says expressly that a
 * restriction or sealing may still be used to disqualify a person from
 * employment or office in the same manner as a first offender discharge
 * under § 42-8-63.1, and does not supersede disclosure required by federal
 * law.
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

const FAMILY_ID = "ga-nonconv-post2013-set";
const OUT = "data/rcap-all50/overlays/census-v1/ga/ga-nonconv-post2013-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ga-nonconv-post2013-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "GA",
  routeKeys: [
    "obligation:unit:GA:ga-nonconv-post2013:ga-nonconv-post2013-automatic",
    "obligation:unit:GA:ga-nonconv-post2013:ga-nonconv-post2013-request"
  ],
  routeSelectionId: "ga-nonconv-post2013-composed-set",
  legalName: "Record Restriction of a Non-Conviction Arrest Cycle Arising from an Arrest on or after July 1, 2013",
  routeName: "restricting a Georgia arrest that did not end in a conviction (arrest on or after July 1, 2013), under O.C.G.A. § 35-3-37(h)",
  statute: "O.C.G.A. § 35-3-37(h), (i), (k)(1)"
});

/* The three components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "process_guidance",
  "primary_filing",
  "attachment"
];

const COMPONENT_CONDITIONS = {
  primary_filing: "Only where the criminal history does not already show the arrest cycle as restricted.",
  attachment: "Where the disposition is missing or wrong on the Georgia criminal history."
};

const COMPOSED_TITLES = {
  process_guidance: "How Post-2013 Restriction Works, and How to Read Your Criminal History",
  primary_filing: "Written Request to the Prosecuting Attorney to Enter the Restriction",
  attachment: "Attachment: The Certified Final Disposition"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/GA.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "ga-nonconv-post2013") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track ga-nonconv-post2013 in the memo" });
    else {
      const requestUnit = (memoTrack.units ?? []).find((u) => u.unitId === "ga-nonconv-post2013-request") ?? null;
      if (!requestUnit || requestUnit.outputStrategy !== "custom_pleading") {
        failures.push({ record: MEMO_PATH, why: "the memo's request unit is missing or is no longer custom_pleading; this builder may not proceed against a drifted strategy" });
      }
      if (memoTrack.localFormOverride !== true) {
        failures.push({ record: MEMO_PATH, why: "the memo no longer sets localFormOverride; the covering-request posture this build prints would be drifted" });
      }
    }
  } catch (e) { failures.push({ record: MEMO_PATH, why: String(e.message ?? e) }); }
  try {
    const manifests = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST_PATH), "utf8"));
    const manifestSet = (manifests.packetSets ?? []).find((s) => s.packetSetId === FAMILY_ID) ?? null;
    if (!manifestSet) failures.push({ record: MANIFEST_PATH, why: `no packetSetId ${FAMILY_ID} in the manifest` });
    else {
      const roles = (manifestSet.components ?? []).slice().sort((a, b) => a.order - b.order).map((c) => c.role);
      if (JSON.stringify(roles) !== JSON.stringify(COMPONENTS)) {
        failures.push({ record: MANIFEST_PATH, why: `the manifest's component roles [${roles.join(", ")}] have drifted from this builder's component set [${COMPONENTS.join(", ")}]` });
      }
    }
  } catch (e) { failures.push({ record: MANIFEST_PATH, why: String(e.message ?? e) }); }
  return { failures };
}

/* ---- fixtures --------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "230 Peachtree Court, Macon, GA 31201",
    "participant.phone": "478-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "11884 Chattahoochee River Crossing Parkway, Apartment 14B, Savannah, Georgia 31419-2214",
    "participant.phone": "(912) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "process_guidance") {
    L.push(`For: ${name}`, "");
    L.push("WORDS FIRST. Georgia law does not use \"expungement\" and has not since July 1, 2013. The two remedies are RECORD RESTRICTION (limiting who may see criminal history record information held by the Georgia Crime Information Center) and, separately, SEALING (closing the clerk of court's file). Neither destroys the record. This packet is about restriction only.", "");
    L.push("HOW POST-2013 RESTRICTION WORKS. For an arrest on or after July 1, 2013 that ended in a qualifying non-conviction disposition, O.C.G.A. Sec. 35-3-37(h) says access to the arrest cycle SHALL be restricted. It is mandatory and automatic: the clerk, the arresting agency or the prosecuting attorney reports the qualifying disposition and the center restricts. There is no application, no petition, no statewide form and no fee for the restriction itself. (GBI's published restriction application is captioned \"Prior to 07/01/2013\" - it is the wrong instrument for this route, and the $25.00 GCIC record restriction processing fee on the fee schedule effective January 1, 2025 belongs to that older route, not this one.)", "");
    L.push("STEP ONE - GET YOUR OWN GEORGIA CRIMINAL HISTORY. GBI's guidance says a Georgia criminal history record can be obtained from most sheriff's offices or police departments, that requirements vary by agency, and that the GCIC lobby office is by appointment only. Bring government photo identification and the agency's fee (local agency fees vary).", "");
    L.push("STEP TWO - READ IT, TWICE OVER. For each charge in the arrest cycle: does it show a FINAL DISPOSITION, and is the cycle already marked RESTRICTED?");
    L.push("- Already restricted: stop here. Nothing needs to be sent. The clerk of court's file and jail records are separate remedies on separate routes.");
    L.push("- Not restricted, disposition shown and qualifying: the written request in this packet is your route.");
    L.push("- Disposition missing or wrong: the attachment page explains the certified final disposition, and where the court never transmitted the disposition to GCIC at all, the correction process at Sec. 35-3-37(d) through (g) is the unblocking step.", "");
    L.push("QUALIFYING DISPOSITIONS include: the case closed without referral to the prosecuting attorney; dismissal after referral; two no-bills from the grand jury; all charged offences dismissed or nolle prossed; all charged offences reduced to a local ordinance violation; a conditional discharge under Sec. 16-13-2 or underage alcohol disposition under Sec. 3-3-23.1, completed; a drug, mental health or veterans court completed with dismissal or nolle prosse; acquittal of all charges (after the ten days the prosecuting attorney has under Sec. 35-3-37(h)(2)(E) to defeat restriction).", "");
    L.push("NOT QUALIFYING, EVEN THOUGH THE OUTCOME LOOKS FAVOURABLE (Sec. 35-3-37(i)): a dismissal or nolle prosse entered as part of a plea agreement that resulted in conviction on an offence arising from the same transaction - THE SINGLE MOST COMMON DISQUALIFIER, and it is not visible on a GCIC report; a dismissal because the prosecuting attorney was barred from introducing material evidence, or because the conduct was prosecuted in another jurisdiction, or for diplomatic or consular immunity; a PARTIAL acquittal, where some charges resulted in acquittal and some did not; an acquittal later shown to have resulted from jury tampering or judicial misconduct. If any of these may be your case, stop and get help before sending anything.", "");
    L.push("WHO THE REQUEST GOES TO. The prosecuting attorney for the county of arrest - the Attorney General, a district attorney or a solicitor-general under Sec. 35-3-37(a)(5). Intake format varies by county: some offices publish their own intake form, and georgia.gov tells people to ask for the form provided by the prosecuting attorney's office. WHERE A COUNTY OFFICE HAS ITS OWN FORM, THAT FORM GOVERNS, and the written request in this packet is the covering request. Ask the office how it wants the request delivered before sending.", "");
    L.push("WHAT HAPPENS AFTER. The prosecuting attorney enters the restriction code in the CCH interface or forwards the approved paperwork to GCIC. GCIC notifies the arresting agency within 30 days, and the arresting agency restricts its own records within 30 days (Sec. 35-3-37(k)(1)). Your follow-up schedule: pull your criminal history again after those windows have run, and confirm the cycle shows as restricted.", "");
    L.push("WHAT RESTRICTION DOES NOT DO.");
    L.push("- It does NOT reach the clerk of court's file, which stays public until the separate sealing route.");
    L.push("- It does NOT reach jail and detention centre records until the separate jail request.");
    L.push("- It does NOT reach federal records, out-of-state records, or private background-check vendors and local agencies that already hold the data, which GBI expressly disclaims control over.");
    L.push("- It does NOT let you say the record does not exist. Nothing in Sec. 35-3-37 gives a person the right to deny a restricted arrest, and Sec. 35-3-37(u) says expressly that a restriction or sealing may be used to disqualify a person from employment or office in the same manner as a first offender discharge under Sec. 42-8-63.1, and does not supersede disclosure required by federal law.", "");
    L.push("WHERE TO GET HELP. If any stop condition on these pages is yours, the Judicial Council's Access to Justice page names four Georgia expungement desks: the Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, and Middle Georgia Justice \"The Desk\".");
  } else if (componentId === "primary_filing") {
    L.push("USE THIS REQUEST ONLY IF your Georgia criminal history does NOT already show the arrest cycle as restricted. If it does, nothing needs to be sent. WHERE THE COUNTY PROSECUTING ATTORNEY'S OFFICE PUBLISHES ITS OWN INTAKE FORM, THAT FORM GOVERNS and this request is the covering request that goes with it.", "");
    L.push("To: the prosecuting attorney for the county of arrest (the Attorney General, district attorney or solicitor-general under O.C.G.A. Sec. 35-3-37(a)(5))");
    L.push("Office name and postal or e-mail destination (you confirm both with that office before sending; intake format and destination vary by county):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push(`From: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("RE: REQUEST TO ENTER THE RECORD RESTRICTION REQUIRED BY O.C.G.A. Sec. 35-3-37(h)", "");
    L.push(`1. I, ${name}, was arrested on or after July 1, 2013, and the arrest cycle identified below ended in a disposition for which O.C.G.A. Sec. 35-3-37(h) requires access to be restricted. My Georgia criminal history does not show the cycle as restricted, and I ask your office to enter the restriction in the CCH interface or forward the approved paperwork to the Georgia Crime Information Center.`, "");
    L.push("2. The arrest cycle is identified as follows, from my own Georgia criminal history report and court paperwork:", "");
    L.push("County of arrest:");
    L.push(DOTS(), "");
    L.push("Date of arrest:");
    L.push(DOTS(), "");
    L.push("Arresting law enforcement agency:");
    L.push(DOTS(), "");
    L.push("Offences I was arrested for, as the record states them:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("How the case ended (the disposition), exactly as the court record states it:");
    L.push(DOTS(), "");
    L.push("Date the case ended:");
    L.push(DOTS(), "");
    L.push("Court that handled the case, and its case number:");
    L.push(DOTS(), "");
    L.push("3. In my own words, what I am asking your office to do, and why this record matters to me now (these lines are yours alone; nothing on them is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. If the disposition is missing from or wrong on my criminal history, a certified final disposition from the clerk of the court that handled the case is attached, as the attachment page of this packet describes.", "");
    L.push("5. Under O.C.G.A. Sec. 35-3-37(k)(1), once the restriction is entered the Georgia Crime Information Center notifies the arresting agency within 30 days and the arresting agency restricts its own records within 30 days. I ask that the restriction be entered accordingly.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(50), "");
    L.push("(You sign and date this request personally. It is your own request, and nothing on this page is signed or dated for you. No statutory wet-signature or verification rule applies, and no notarization is required.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else {
    L.push("USE THIS PAGE ONLY IF the disposition is missing from or wrong on your Georgia criminal history. If your report already shows the final qualifying disposition for every charge, no attachment is needed.", "");
    L.push(`For: ${name}`, "");
    L.push("WHAT TO ATTACH. A certified copy of the final disposition, obtained from the clerk of the court that handled the case. Ask the clerk for a certified copy; attach it to the written request. This packet does not collect, inspect or authenticate it - it is yours, obtained by you, attached by you.", "");
    L.push("IF THE COURT NEVER SENT THE DISPOSITION TO GCIC AT ALL. The prosecuting attorney cannot restrict a cycle whose disposition GCIC has never received. Where the court has not transmitted the disposition, the correction process at O.C.G.A. Sec. 35-3-37(d) through (g) is the unblocking step - and disputes about what the record should say are exactly where self-help stops. The four expungement desks named on the guidance page are the place to take a contested or ambiguous disposition.", "");
    L.push("Write here which court issued the certified disposition you are attaching, and the date it bears (from the document itself):");
    L.push(DOTS());
    L.push(DOTS());
  }
  L.push("", `Route: ${ROUTE.routeKeys.join(" | ")}`);
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
      write("requester_name", "Requester named in the From block and paragraph 1 of the written request", "participant.full_legal_name"),
      write("date_of_birth", "Requester's date of birth in the From block of the written request", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the requester in the From block of the written request", "participant.street_address"),
      write("telephone", "Telephone number of the requester in the From block of the written request", "participant.phone"),
      write("email", "Email address of the requester in the From block of the written request", "participant.email")
    );
    refusals.push(
      rbf("prosecutor_office_destination", "Office name and postal or e-mail destination of the prosecuting attorney, in the addressee block of the request",
        "the name of the prosecuting attorney's office for the county of arrest, and the postal or e-mail destination that office directs - intake format and destination vary by county, so confirm both with the office before sending, and ask whether it has its own intake form",
        "intake format and destination vary by county office and must be confirmed with that office; no directory is held"),
      rbf("county_of_arrest", "County of arrest, in paragraph 2 of the request",
        "the Georgia county where you were arrested, from your criminal history report",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arrest_date", "Date of arrest, in paragraph 2 of the request",
        "the date of the arrest, from your criminal history report",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arresting_agency", "Arresting law enforcement agency, in paragraph 2 of the request",
        "the agency that arrested you, from your criminal history report",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("charges", "Offences arrested for, as the record states them, in paragraph 2 of the request",
        "the offences you were arrested for, worded as the record words them",
        "no charge fact is held for a record the platform has not seen"),
      rbf("disposition", "How the case ended (the disposition), exactly as the court record states it, in paragraph 2 of the request",
        "the disposition, exactly as the court record states it - checked against your criminal history report and, where it is missing or wrong there, against the certified final disposition from the clerk",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("disposition_date", "Date the case ended, in paragraph 2 of the request",
        "the date the case ended, from the court record",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("court_and_case_number", "Court that handled the case, and its case number, in paragraph 2 of the request",
        "the court that handled the case and the case number, from your court paperwork - the clerk of that court holds the file",
        "no case identifier is held for a record the platform has not seen"),
      rbf("participant_account", "The requester's own statement of what they are asking the office to do and why the record matters now, in paragraph 3 of the request",
        "your own words: what you are asking the prosecuting attorney's office to do, and why this record matters to you now - these lines are yours alone",
        "the platform prints the participant's own account and writes none of it"),
      protectedBlank("requester_signature", "Signature on the written request",
        "the request is the participant's own; the participant signs it personally"),
      protectedBlank("signature_date", "Date beside the signature on the written request",
        "a date written before the request is signed would be false")
    );
  } else if (componentId === "attachment") {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
    refusals.push(
      rbf("attached_disposition_identity", "Which court issued the certified disposition being attached, and the date it bears",
        "the issuing court and the date on the certified final disposition, copied from the document itself after you obtain it from the clerk of the court that handled the case",
        "the certified disposition is a record the platform never collects, inspects or authenticates")
    );
  } else {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKeys[1],
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/GA.memo.json, track "
      + "ga-nonconv-post2013, reviewed as of 2026-08-02) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId ga-nonconv-post2013-set)",
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
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value) || componentText.toUpperCase().includes(value.toUpperCase());
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  // The counsel-limitation statements this packet must carry, proven from the
  // bytes rather than from intent: the § 35-3-37(u) disqualification statement
  // and the never-say-it-does-not-exist rule live on the guidance page.
  const guidanceText = String(textOfComponent.get("process_guidance") ?? "").replace(/\s+/g, " ");
  assert.ok(guidanceText.includes("does not supersede disclosure required by federal law"),
    `${fixtureName}: the Sec. 35-3-37(u) limitation statement is not readable from the guidance page's bytes`);
  assert.ok(guidanceText.includes("does NOT let you say the record does not exist"),
    `${fixtureName}: the never-deny rule is not readable from the guidance page's bytes`);
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
  out.push(`# What you must do before you send — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Georgia law says **restrict**, and separately **seal** — not \"expungement\" — and neither remedy destroys the record. For an arrest on or after July 1, 2013 that ended in a qualifying non-conviction disposition, restriction under O.C.G.A. § 35-3-37(h) is mandatory and **automatic**: there is no application, no petition, no statewide form and no fee. This packet does two things: it walks you through reading your own criminal history to see whether the restriction already happened, and — only where it did not — it carries a composed written request asking the prosecuting attorney for the county of arrest to enter it. No statewide form exists for that request; **where the county office publishes its own intake form, that form governs** and this request is the covering request.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to records the platform has not seen — your Georgia criminal history report and your court paperwork — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Send the request only if", "");
  out.push("Your Georgia criminal history does **not** already show the arrest cycle as restricted, the disposition qualifies under § 35-3-37(h), and no § 35-3-37(i) exclusion applies. The guidance page walks the qualifying dispositions and the exclusions — including the single most common disqualifier, a dismissal or nolle prosse that was part of a plea agreement with a conviction arising from the same transaction, which is **not visible on a GCIC report**.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `process_guidance` | how post-2013 restriction works, how to read your criminal history, who the request goes to, the follow-up schedule, and what restriction does not do |");
  out.push("| `primary_filing` | the composed written request to the prosecuting attorney (conditional — only where the cycle is not already restricted) |");
  out.push("| `attachment` | the certified final disposition step (conditional — only where the disposition is missing or wrong on your history) |");
  out.push("");

  out.push("## Documents you must obtain before sending", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your own Georgia criminal history report — read it for whether each charge shows a final disposition and whether the cycle is already marked restricted, and correct your answers if they disagree | most Georgia sheriff's offices and police departments, or GCIC (photo ID and the agency's fee; the GCIC lobby office is by appointment only) |");
  out.push("| Certified final disposition — only where the disposition is missing or wrong on your history | clerk of the court that handled the case |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one that belongs to the pages you are sending.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Get your own Georgia criminal history report** and read it as the guidance page directs.");
  out.push("2. **If the cycle already shows as restricted, stop.** Nothing needs to be sent; the clerk's file and jail records are separate routes.");
  out.push("3. **Check the exclusions.** If the dismissal may have been part of a plea agreement arising from the same transaction, or the acquittal was partial, or any other § 35-3-37(i) ground may apply, stop and take it to one of the four expungement desks named on the guidance page.");
  out.push("4. **Identify the prosecuting attorney's office for the county of arrest** and confirm with that office how it takes restriction requests — including whether it has its own intake form, which governs if it exists.");
  out.push("5. **Fill in every dotted blank** on the request, and write your own paragraph 3 in your own words.");
  out.push("6. **Sign and date the request yourself.** No notarization is required.");
  out.push("7. **Send it the way the office directs**, with the certified disposition attached where your history is missing or wrong.");
  out.push("8. **Follow up**: after the § 35-3-37(k)(1) windows run (GCIC notifies the arresting agency within 30 days; the agency restricts within 30 days), pull your criminal history again and confirm the cycle shows as restricted.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** The request is your own.");
  out.push("- **The prosecuting attorney office's destination.** Intake format and destination vary by county and must be confirmed with that office.");
  out.push("- **Any county intake form's fields.** Where a county office publishes its own form, that form governs and this packet does not complete it.", "");

  out.push("## What restriction does not do", "");
  out.push("- It does not reach the clerk of court's file (separate sealing route), jail and detention centre records (separate jail request), federal records, out-of-state records, or private background-check vendors that already hold the data.");
  out.push("- It does **not** let you say the record does not exist. § 35-3-37(u) says expressly that a restriction or sealing may be used to disqualify a person from employment or office in the same manner as a first offender discharge under § 42-8-63.1, and does not supersede disclosure required by federal law.", "");

  out.push("## When to stop and get help instead of sending", "");
  out.push("- the prosecuting attorney declines — the route from a declination is a civil action under § 35-3-37(n)(3) or (l), which is outside self-help;");
  out.push("- the disposition is contested or ambiguous, or may have been part of a plea bargain arising from the same transaction;");
  out.push("- the case is a partial acquittal, or the acquittal is inside the prosecutor's ten-day window under § 35-3-37(h)(2)(E);");
  out.push("- an accountability court exit that may have been a conviction rather than a dismissal;");
  out.push("- the disposition was a reduction to a local ordinance violation — whether it qualifies in a given county's charging practice is an open question this packet does not decide;");
  out.push("- you want to attack the underlying case, or any immigration consequence is in play.");
  out.push("");
  out.push("Where self-help stops, the four Georgia expungement desks are: the Georgia Justice Project, the Cobb County Second Chance Desk, the Henry County Records Restriction Desk, and Middle Georgia Justice \"The Desk\".", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared written request with its guidance and attachment pages. It is not an official form — no statewide form exists for this route, and GBI's published form is for pre-July-2013 arrests — and it is not legal advice, it is not sent for you, it does not enter anything in the GCIC CCH interface, it does not obtain the prosecuting attorney's decision, and it does not complete any county office's own intake form.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(", ")}_`);
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
      proofMethod: "every written fact value, and the counsel-limitation statements the packet must carry, read back from the extracted text of the component's own pages in the saved packet bytes",
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
      + "legal-design intake track (including its localFormOverride flag and request unit strategy) and the "
      + "packet-set manifest.",
    routeKey: ROUTE.routeKeys[1], routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "No statewide form exists for a post-2013 restriction request. GBI's published restriction application is "
      + "captioned 'Prior to 07/01/2013' and is the wrong instrument for this route; georgia.gov directs "
      + "participants to ask for the form provided by the prosecuting attorney's office. The legal-design record "
      + "sets localFormOverride: where a county office publishes its own intake form, that form governs and the "
      + "composed request is the covering request. No form was substituted, none was invented, and the wrong "
      + "(pre-2013) instrument was not bound.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track ga-nonconv-post2013: § 35-3-37(h)/(i)/(k)(1) mechanism, the two sequential units, exclusions, counsel limitations (restrict/seal terminology, § 35-3-37(u), referral desks), rules, open questions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the three-component set with its conditions and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "which county prosecuting attorney offices require their own local intake form, or what those forms require",
      "that any output is approved for participant delivery",
      "that any arrest cycle qualifies for restriction under § 35-3-37(h)"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: null,
    boundReferenceRole: "none — no binary source is bound; the build is grounded on the committed legal-design record and packet-set manifest alone",
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. The track's two units are sequential, not alternatives: the "
      + "automatic unit is guidance (read your criminal history; if the cycle is already restricted, stop), and "
      + "the request unit's condition — the cycle is NOT already restricted — is printed on the request's own "
      + "face. The attachment's condition (disposition missing or wrong on the history) is likewise printed on "
      + "its face. Nothing is selected for the participant.",
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
      + "packet bytes, not from this builder's intent; the § 35-3-37(u) limitation statement and the never-deny "
      + "rule were proven present on the guidance page the same way.",
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
          "Restriction under § 35-3-37(h) is mandatory and automatic — no application, no petition, no statewide "
          + "form, no fee — and GBI's published restriction application is captioned 'Prior to 07/01/2013', the "
          + "wrong instrument for this route. The participant filing that exists is the written request to the "
          + "prosecuting attorney where the restriction was never entered, and the legal-design decision models "
          + "the track as two sequential units for exactly that reason.",
        consequence:
          "The packet composes the request as a conditional covering instrument (only where the history does not "
          + "show the cycle restricted), sets out the automatic mechanism as guidance, and never binds or "
          + "imitates the pre-2013 form. Where a county office publishes its own intake form, the packet states "
          + "on the request's own face that the local form governs (localFormOverride), and completes none of it."
      },
      {
        finding:
          "The single most common disqualifier — a dismissal or nolle prosse entered as part of a plea agreement "
          + "with a conviction arising from the same transaction — is not visible on a GCIC report, and the "
          + "§ 35-3-37(i) exclusions include partial acquittals and the prosecutor's ten-day acquittal window.",
        consequence:
          "The guidance page walks every exclusion with the plea-agreement trap called out in terms, and the "
          + "instructions make checking them a numbered step before anything is sent, with the four Judicial "
          + "Council expungement desks (Georgia Justice Project, Cobb County Second Chance Desk, Henry County "
          + "Records Restriction Desk, Middle Georgia Justice 'The Desk') as the destination when a stop "
          + "condition is live."
      },
      {
        finding:
          "The counsel limitations require the packet to say 'restrict' and 'seal' rather than 'expungement', to "
          + "state that a restriction may still be used to disqualify from employment or office under "
          + "§ 35-3-37(u) in the same manner as a first offender discharge under § 42-8-63.1 and does not "
          + "supersede federal disclosure law, and never to tell a participant they may state the record does "
          + "not exist.",
        consequence:
          "The terminology rule is followed throughout, the § 35-3-37(u) statement and the never-deny rule are "
          + "printed on the guidance page and asserted from the output bytes on every build, and the "
          + "what-restriction-does-not-reach list (clerk's file, jail records, federal and out-of-state records, "
          + "private vendors) is stated in the record's own terms."
      },
      {
        finding:
          "The legal-design record carries two release-blocker open questions: whether a reduction to a local "
          + "ordinance violation qualifies in a given county's charging practice, and which county offices "
          + "require their own intake form.",
        consequence:
          "The ordinance-reduction question is carried as a stop condition rather than answered, the local-form "
          + "question is handled by the recorded localFormOverride posture (ask the office; its form governs), "
          + "and both travel with the family into counsel review in approval-request.json."
      },
      {
        finding:
          "If the prosecuting attorney declines, the route from a declination is a civil action under "
          + "§ 35-3-37(n)(3) or (l), which the record places outside self-help.",
        consequence:
          "The instructions state the boundary in terms and route a declination to the expungement desks; the "
          + "packet does not draft or describe the civil action."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Whether a reduction to a local ordinance violation qualifies as a restrictable disposition in a given county's charging practice — the record's own release blocker, carried here as a stop condition.",
      "Which county prosecuting attorney offices require their own local intake form for a restriction request, and what those forms require — the record's second release blocker, handled by the localFormOverride covering-request posture. Confirm the posture or supply the county inventory.",
      "The request states the statutory ground in the participant's own adopted words with the case facts as dotted blanks. Confirm the composed covering request is the right instrument where no county form exists.",
      "The packet states the § 35-3-37(u) employment-disqualification limitation and the never-deny rule verbatim from the counsel limitations. Confirm the placement (guidance page and instructions) is sufficient."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound; GBI's pre-2013 form was deliberately not bound because it is the wrong instrument. Confirm that is legible to reviewers.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper.",
      "Terminology: the packet says 'restrict' and 'seal' throughout and never 'expungement' in consumer-facing copy, per the counsel limitation."
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
