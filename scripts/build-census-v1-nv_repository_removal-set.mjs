#!/usr/bin/env node
/**
 * The Nevada repository-removal packet family builder.
 *
 *   node scripts/build-census-v1-nv_repository_removal-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   nv_repository_removal   NRS 179A.160 — removal of a record from the
 *                           Central Repository, and from the record-holding
 *                           agency's files, after a favourable disposition
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/NV.memo.json, track
 * nv_repository_removal, corrected at source 2026-08-08 — establishes that
 * NRS 179A.160(1) gives the person who is the subject of the record an
 * express WRITTEN APPLICATION, to TWO recipients — the Central Repository for
 * Nevada Records of Criminal History AND the agency which maintains the
 * record — available at any time after the dismissal, acquittal or favourable
 * disposition is final; subsection 2 makes removal mandatory ("shall remove
 * the record unless") subject to five stated exclusions. No official form
 * exists: the Records, Communications and Compliance Division's complete
 * published sealing inventory addresses only the ordinary chapter 179 court
 * petition, and the section prescribes no form. The strategy is therefore
 * custom_pleading: two copies of one composed written application, with the
 * explanation, parallel court-petition screen, exclusion screen and referral
 * carried as guidance.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * It also states, from the record, the Central Repository's own identity and
 * address as the legal-design record states it. Every case fact — the
 * arresting or citing agency, the date, the case or event number, the
 * disposition and the date it became final, any former names — belongs to
 * records the platform has not seen, so each is a labelled dotted blank,
 * declared REQUIRED_BEFORE_FILING and disclosed by its printed label in
 * participant-instructions.md, with the court that handled the case and the
 * participant's own criminal history record named as the checkable
 * authorities. The mailing address of the agency which maintains the record
 * is likewise the participant's to supply. No signature and no signature date
 * is ever written. The section prescribes no fee, no notice and no service
 * method; each silence is stated from the record, and the open delivery
 * question is answered the way the record classifies it — as filing
 * instruction, recommending proof of delivery without asserting a legal
 * requirement.
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

const FAMILY_ID = "nv_repository_removal-set";
const OUT = "data/rcap-all50/overlays/census-v1/nv/nv-repository-removal-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-nv_repository_removal-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "NV",
  routeKey: "obligation:track-only:NV:nv_repository_removal",
  routeSelectionId: "nv-repository-removal-composed-set",
  legalName: "Removal of a Record from the Central Repository After a Favourable Disposition (NRS 179A.160)",
  routeName: "getting a Nevada arrest off the state repository, and off the record-holding agency's files, after a favourable outcome, under NRS 179A.160",
  statute: "NRS 179A.160"
});

/* The Central Repository's identity and address, stated from the legal-design
 * record's own destination text — the one address fact that IS held. */
const REPOSITORY_NAME = "The Central Repository for Nevada Records of Criminal History";
const REPOSITORY_ADMIN = "Nevada State Police, Records, Communications and Compliance Division";
const REPOSITORY_ADDRESS = "333 West Nye Lane, Suite 100, Carson City, Nevada 89706";

/* The six components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "primary_filing",
  "duplicate_submission_copy",
  "explanation",
  "parallel_screen",
  "exclusion_screen",
  "referral_instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Written Application Under NRS 179A.160 - Copy for the Central Repository",
  duplicate_submission_copy: "Written Application Under NRS 179A.160 - Copy for the Agency Which Maintains the Record",
  explanation: "What This Remedy Is, and What It Is Not",
  parallel_screen: "The Court Record Is Separate: The Parallel Sealing Petition",
  exclusion_screen: "The Five Conditions That Defeat This Application",
  referral_instructions: "How to Approach the Division and the Agency, and Where to Get Help"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/NV.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "nv_repository_removal") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track nv_repository_removal in the memo" });
    else if (memoTrack.outputStrategy !== "custom_pleading") {
      failures.push({ record: MEMO_PATH, why: `the memo's outputStrategy is ${memoTrack.outputStrategy}, not custom_pleading; this builder may not proceed against a drifted strategy` });
    } else if (!String(memoTrack.destination?.detail ?? "").includes(REPOSITORY_ADDRESS)) {
      failures.push({ record: MEMO_PATH, why: "the memo's destination no longer states the Central Repository address this build prints; refusing to print a drifted address" });
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

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function applicationBody(componentId, facts) {
  // The same written application, twice: NRS 179A.160(1) requires it to go to
  // the Central Repository AND to the agency which maintains the record, and
  // subsection 2 puts the removal duty on both. Only the address block differs.
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  if (componentId === "primary_filing") {
    L.push(`To: ${REPOSITORY_NAME}`);
    L.push(`    ${REPOSITORY_ADMIN}`);
    L.push(`    ${REPOSITORY_ADDRESS}`);
  } else {
    L.push("To: the agency which maintains the record (ordinarily the agency that arrested you, cited you or sought the warrant)");
    L.push("Name and mailing address of the agency (you write it here; the agency's own website or the court that handled the case can confirm the address):");
    L.push(DOTS());
    L.push(DOTS());
  }
  L.push("");
  L.push(`From: ${name}`);
  L.push(`Date of birth: ${dob}`);
  L.push(`Mailing address: ${address}`);
  L.push(`Telephone: ${phone}`);
  L.push(`Email: ${email}`, "");
  L.push("Other names I have used, including any former legal names (the repository indexes by identity, and an application under one name may not reach a record filed under another; write NONE if none):");
  L.push(DOTS(), "");
  L.push("RE: WRITTEN APPLICATION UNDER NRS 179A.160 FOR REMOVAL OF A RECORD OF CRIMINAL HISTORY", "");
  L.push("SEND THIS APPLICATION ONLY IF every answer on the exclusion-screen page of this packet is NO. If any of the five NRS 179A.160(2) conditions applies to you, the Central Repository and the agency are not permitted to remove the record, and sending this application cannot help.", "");
  L.push("1. I am the subject of a record of criminal history relating to an arrest, citation or warrant, and I apply in writing under NRS 179A.160(1) to have that record removed from the files which are available and generally searched for the purpose of responding to inquiries concerning the criminal history of a person.", "");
  L.push("2. The record I ask to have removed is identified as follows, from my own criminal history record and court paperwork:", "");
  L.push("Agency that arrested me, cited me, or sought the warrant:");
  L.push(DOTS(), "");
  L.push("Date of the arrest, citation or warrant:");
  L.push(DOTS(), "");
  L.push("Case or event number the record carries, as my criminal history record or court paperwork states it:");
  L.push(DOTS(), "");
  L.push("3. The charge was dismissed, an acquittal was entered, or the disposition of the charge was otherwise favourable to me, and that disposition is final. The disposition, and the date it became final, exactly as the court record states them:");
  L.push(DOTS());
  L.push(DOTS(), "");
  L.push("4. NRS 179A.160(2) requires the Central Repository and the agency to remove the record unless one of five stated conditions applies. By signing below I state that, to the best of my knowledge, none of them does: I am not a fugitive; the case is not under active prosecution; the disposition was not a deferred prosecution, plea bargain or other similar disposition; I have no prior conviction for a felony or gross misdemeanour in any jurisdiction in the United States; and I have not been arrested for or charged with another crime, other than a minor traffic violation, since the arrest, citation or warrant identified above. The exclusion-screen page of this packet is where I checked each of these before signing.", "");
  L.push("5. I therefore ask that the record be removed from the files which are available and generally searched for the purpose of responding to criminal history inquiries, as NRS 179A.160(2) requires when none of its conditions applies.", "");
  L.push("DATE " + DOTS(30) + "   SIGNATURE OF APPLICANT " + DOTS(38), "");
  L.push("(You sign and date this application personally. Nothing on this page is signed or dated for you. NRS 179A.160 requires no notarization.)", "");
  L.push(`PRINTED NAME: ${name}`);
  return L;
}

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "primary_filing" || componentId === "duplicate_submission_copy") {
    L.push(...applicationBody(componentId, facts));
  } else if (componentId === "explanation") {
    L.push(`For: ${name}`, "");
    L.push("NRS 179A.160 is a REPOSITORY remedy, not a court sealing order. It addresses the state's own criminal history record and the record-holding agency's - not the court's - and it removes the record from the files that are available and generally searched for the purpose of responding to criminal history inquiries, rather than destroying it. Nevada calls its remedies record sealing and never expungement: the state agency states directly that sealing is not expungement because it does not authorise destruction of the records.", "");
    L.push("The application goes to TWO recipients, and this packet carries a copy for each: the Central Repository for Nevada Records of Criminal History, and the agency which maintains the record. Subsection 2 puts the removal duty on both. A single copy sent to the Repository alone leaves the arresting agency's own record untouched - which is exactly the failure this packet exists to prevent.", "");
    L.push("There is no waiting period: the application may be made at any time after the charge is dismissed, acquittal is entered, or the disposition of the charge in your favour is final. Finality, not time, is the condition.", "");
    L.push("NRS 179A.160(3) preserves a court's separate authority to order deletion or modification of a record, so this remedy and the court's coexist - which is why the next page matters.", "");
    L.push("A Nevada removal does not bind out-of-state or federal agencies and does not reach records they hold. It does not restore firearm rights; only a pardon that does not restrict the right to bear arms does. It must not be described as having any immigration effect.");
  } else if (componentId === "parallel_screen") {
    L.push(`For: ${name}`, "");
    L.push("Repository removal alone LEAVES THE COURT RECORD. The court's own record of the case is reached by a separate court sealing petition on the non-conviction sealing track, which is a different filing in a different place, and nothing in this packet files it for you.", "");
    L.push("The two remedies also move at different speeds in the other direction: a court sealing order does not reach the repository at once. The Records, Communications and Compliance Division's own General Information document, rev. 8/2025, records that the sealing process can take up to 6 months to complete once the final seal order is received - so a participant who obtains a court order should not expect the repository to reflect it immediately.", "");
    L.push("If you want both the court record sealed and the repository record removed, both remedies are needed: this packet's application for the repository and the agency, and the separate court petition for the court's record. If you are unsure whether the court sealing petition fits your case, the clerk of the court that handled the case can tell you what the court's record shows, and Nevada Legal Services is where to take the question.");
  } else if (componentId === "exclusion_screen") {
    L.push(`For: ${name}`, "");
    L.push("NRS 179A.160(2) requires the Central Repository and the agency to remove the record UNLESS one of five conditions applies. Check every one before signing the application. If ANY answer is yes, do not send it - removal is not permitted, and the referral page says where to take it.", "");
    L.push("ONE. Are you a fugitive? (NRS 179A.160(2)(a))");
    L.push("TWO. Is the case under active prosecution, according to a current certificate of a prosecuting attorney? (NRS 179A.160(2)(b))");
    L.push("THREE. Was the disposition of the case a DEFERRED PROSECUTION, a PLEA BARGAIN, or any other similar disposition? (NRS 179A.160(2)(c)) This is the condition that most often defeats the route in practice, even though you may rightly describe the outcome as favourable. If your case was resolved by a deferral of judgment, this route is not yours - the deferred-judgment track under NRS 176.211 is where that belongs.");
    L.push("FOUR. Have you EVER been convicted of a felony or a gross misdemeanour ANYWHERE in the United States - not merely in Nevada? (NRS 179A.160(2)(d))");
    L.push("FIVE. Since the arrest, citation or warrant you want removed, have you been arrested for or charged with any other crime, apart from a minor traffic violation? (NRS 179A.160(2)(e))", "");
    L.push("Two of these are easy to get wrong from memory: the deferred-prosecution and plea-bargain condition, and the prior-conviction condition that reaches the whole United States. Check your answers against your own criminal history record and the court paperwork, not against recollection.", "");
    L.push("One more threshold the section does not define: whether your disposition is \"favorable to the person\" at all. Dismissal and acquittal are the section's own examples. If your outcome is anything less clear-cut, whether it qualifies is a legal characterisation - stop and take it to a lawyer or Nevada Legal Services rather than deciding it yourself.");
  } else {
    L.push(`For: ${name}`, "");
    L.push("GETTING YOUR OWN RECORD FIRST. The application identifies the record by agency, date and case or event number, and asks you to check the disposition against your own criminal history record. The Records, Communications and Compliance Division charges a fee for providing a copy of a criminal history record - that is a fee for the copy, a different service, and not a fee for this application, which NRS 179A.160 makes free.", "");
    L.push("SENDING THE APPLICATION. The section prescribes no delivery method. A method that produces proof of delivery is a filing instruction rather than a legal requirement - it is how you will later show that both recipients had the application. Whether the Central Repository wants a criminal history record to accompany the application is likewise not prescribed; the Division can tell you its own practice when you ask.", "");
    L.push("PROOF OF THE DISPOSITION. NRS 179A.160 requires no attachment. But the Repository and the agency have to satisfy themselves that the disposition is favourable and final, and an application that carries the proof is the one that can be acted on. A certified copy of the dismissal, acquittal or other favourable disposition comes from the court that handled the case.", "");
    L.push("BOTH RECIPIENTS, ALWAYS. Send one signed copy to the Central Repository at the address printed on it, and one signed copy to the agency which maintains the record at the address you wrote on it. The removal duty sits on both, and a copy sent to one alone leaves the other's record standing.", "");
    L.push("IF THE ANSWER IS NO, OR NOTHING HAPPENS. The section provides no appeal from a refusal, and a refusal is not something to litigate alone. Take the refusal, or the silence, to a lawyer or to Nevada Legal Services.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF SENDING", "");
    L.push("- any of the five exclusion-screen answers is yes, or you are not sure;");
    L.push("- whether your disposition is favourable is arguable on the record;");
    L.push("- you also need the court record sealed - a separate petition this packet does not file;");
    L.push("- records sit with more than one agency, where a single application will not reach every custodian;");
    L.push("- federal, tribal, military or out-of-state records are involved - a Nevada remedy does not reach them;");
    L.push("- your goal is firearm rights, which removal does not restore;");
    L.push("- any immigration question.");
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
  if (componentId === "primary_filing" || componentId === "duplicate_submission_copy") {
    const copyName = componentId === "primary_filing" ? "the Central Repository copy" : "the agency copy";
    writes.push(
      write("applicant_name", `Applicant named in the From block and paragraph 1 of ${copyName} of the application`, "participant.full_legal_name"),
      write("date_of_birth", `Applicant's date of birth in the From block of ${copyName} of the application`, "participant.date_of_birth"),
      write("mailing_address", `Mailing address of the applicant in the From block of ${copyName} of the application`, "participant.street_address"),
      write("telephone", `Telephone number of the applicant in the From block of ${copyName} of the application`, "participant.phone"),
      write("email", `Email address of the applicant in the From block of ${copyName} of the application`, "participant.email")
    );
    if (componentId === "duplicate_submission_copy") {
      refusals.push(
        rbf("agency_name_and_address", "Name and mailing address of the agency which maintains the record, in the address block of the agency copy",
          "the name and mailing address of the agency that arrested you, cited you or sought the warrant - the agency's own website or the court that handled the case can confirm the address",
          "it varies with the arresting agency and the platform holds no directory of Nevada law-enforcement agency addresses")
      );
    }
    refusals.push(
      rbf("former_names", `Other names the applicant has used, including any former legal names, on ${copyName} of the application`,
        "every other name you have used, including former legal names, or NONE - the repository indexes by identity, and an application under one name may not reach a record filed under another",
        "what other names the participant has used is the participant's own fact, not one the platform holds"),
      rbf("arresting_agency", `Agency that arrested, cited, or sought the warrant, on ${copyName} of the application`,
        "the agency that arrested you, cited you or sought the warrant, from your own criminal history record or court paperwork",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arrest_date", `Date of the arrest, citation or warrant, on ${copyName} of the application`,
        "the date of the arrest, citation or warrant, from your own criminal history record or court paperwork",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("case_or_event_number", `Case or event number the record carries, on ${copyName} of the application`,
        "the case or event number, copied from your own criminal history record or court paperwork",
        "no record identifier is held for a record the platform has not seen"),
      rbf("disposition_and_finality", `The disposition, and the date it became final, on ${copyName} of the application`,
        "how the case ended and the date that outcome became final, exactly as the court record states them - the court that handled the case can provide a certified copy",
        "no disposition fact is held for a record the platform has not seen, and finality is the section's one temporal condition"),
      protectedBlank("applicant_signature", `Signature of the applicant on ${copyName} of the application`,
        "the applicant signs both copies of the application personally"),
      protectedBlank("signature_date", `Date beside the applicant's signature on ${copyName} of the application`,
        "a date written before the application is signed would be false")
    );
  } else {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/NV.memo.json, track "
      + "nv_repository_removal, corrected at source 2026-08-08) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId nv_repository_removal-set)",
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
  // The Repository's printed address on the primary copy is a stated record
  // fact, proven from the bytes like any other statement this build makes.
  const primaryText = String(textOfComponent.get("primary_filing") ?? "").replace(/\s+/g, " ");
  assert.ok(primaryText.includes(REPOSITORY_ADDRESS),
    `${fixtureName}: the Central Repository's recorded address is not readable from the primary copy's bytes`);
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
  out.push("NRS 179A.160(1) lets the person who is the subject of a record apply **in writing** — to the Central Repository for Nevada Records of Criminal History **and** to the agency which maintains the record — to have the record removed from the files that are available and generally searched for criminal history inquiries, at any time after the dismissal, acquittal or other favourable disposition is final. Subsection 2 makes removal mandatory unless one of five stated conditions applies. No official form exists for the application and the section prescribes none, so the two application copies in this packet are composed instruments. This is an agency application, not a court filing: no order issues on it, and it does not reach the court's own record.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email — and, on the Repository copy, the Central Repository's own recorded address. Every case fact belongs to records the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from your own criminal history record or court paperwork, never from memory.", "");

  out.push("## Send only if all five answers are no", "");
  out.push("The exclusion-screen page walks the five NRS 179A.160(2) conditions: fugitive; active prosecution; **deferred prosecution, plea bargain or similar disposition**; **any prior felony or gross-misdemeanour conviction anywhere in the United States**; any later arrest or charge other than a minor traffic violation. If any answer is yes, do not send the application — removal is not permitted, and the referral page says where to take it.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the written application — copy addressed to the Central Repository |");
  out.push("| `duplicate_submission_copy` | the same application — copy addressed to the agency which maintains the record |");
  out.push("| `explanation` | what the repository remedy is and is not |");
  out.push("| `parallel_screen` | the court record is separate: the parallel sealing petition |");
  out.push("| `exclusion_screen` | the five conditions that defeat this application |");
  out.push("| `referral_instructions` | how to approach the Division and the agency, and where to get help |");
  out.push("");

  out.push("## Documents you should have first", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your own Nevada criminal history record — the agency, date, case or event number and disposition are checked against it | Nevada State Police, Records, Communications and Compliance Division (for the fee they charge for the copy — the application itself is free) |");
  out.push("| Proof of the favourable disposition — not required by the section, but an application that carries the proof is the one that can be acted on | the court that handled the case (certified copy) |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one, on **both** copies.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Get your own criminal history record** and, if you can, a certified copy of the favourable disposition from the court.");
  out.push("2. **Work through the exclusion screen.** All five answers must be no, checked against the records rather than memory.");
  out.push("3. **Fill in every dotted blank on both copies**, including the agency's name and mailing address on the agency copy, and your former names (or NONE) on both.");
  out.push("4. **Sign and date both copies yourself.** The platform never signs for you and never dates a signature. No notarization is required.");
  out.push("5. **Send one copy to the Central Repository** at the address printed on it, **and one copy to the agency** at the address you wrote. The removal duty sits on both recipients, and a copy sent to one alone leaves the other's record standing. The section prescribes no delivery method; a method that produces proof of delivery is recommended as a filing instruction, not asserted as a legal requirement.");
  out.push("6. **If you also want the court record sealed**, that is a separate court petition on a different track — the parallel-screen page explains, including the recorded up-to-six-month repository lag after a court order.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature on each copy, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The agency's mailing address.** It varies with the arresting agency and no directory is held; the agency's own website or the court that handled the case can confirm it.", "");

  out.push("## When to stop and get help instead of sending", "");
  out.push("- any of the five exclusion-screen answers is yes, or you are not sure;");
  out.push("- whether your disposition is \"favorable\" is arguable on the record — the section does not define it;");
  out.push("- the Repository or the agency refuses, or nothing happens — the section provides no appeal, and a refusal is not something to litigate alone;");
  out.push("- records sit with more than one agency;");
  out.push("- federal, tribal, military or out-of-state records — a Nevada remedy does not reach them;");
  out.push("- your goal is firearm rights, which removal does not restore;");
  out.push("- any immigration question.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared written application in two copies, with its screens and process pages. It is not an official Nevada form — none exists for a NRS 179A.160 request — and it is not legal advice, it is not sent for you, and it does not decide whether the Repository or the agency will remove the record. Removal is not sealing of the court record, it does not restore firearm rights, and it must not be described as having any immigration effect.", "");
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
      proofMethod: "every written fact value, and the Repository's recorded address, read back from the extracted text of the component's own pages in the saved packet bytes",
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
      + "legal-design intake track (including the Central Repository address the primary copy prints) and the "
      + "packet-set manifest.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "NRS 179A.160 prescribes no form, and the Records, Communications and Compliance Division publishes none "
      + "for a removal request — its complete sealing inventory addresses only the ordinary chapter 179 court "
      + "petition. The legal-design correction of 2026-08-08 read the section in full and resolved the strategy "
      + "to custom_pleading: two copies of one composed written application, to the two recipients subsection 1 "
      + "names, with the removal duty on both under subsection 2. No form was substituted and none was invented.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track nv_repository_removal: the section read in full 2026-08-08, the two-recipient application, the five exclusions, rules, stop conditions, open questions, and the Repository's address" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the six-component set and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that no official instrument for a NRS 179A.160 request has been published since 2026-08-08",
      "that the Central Repository's mailing address is unchanged since the record was read",
      "that any output is approved for participant delivery",
      "that any record qualifies for removal under NRS 179A.160"
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
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed pages carry no election control. There is one instrument in two copies, and its gate — all "
      + "five NRS 179A.160(2) answers no — is printed on the application's own face and walked in full on the "
      + "exclusion-screen page, with the participant's own records as the check. Nothing is selected for the "
      + "participant.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: {},
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
      + "packet bytes, not from this builder's intent; the Central Repository's recorded address was proven "
      + "present on the primary copy the same way.",
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
          "NRS 179A.160(1) directs the written application to TWO recipients — the Central Repository and the "
          + "agency which maintains the record — and subsection 2 puts the mandatory removal duty on both. A "
          + "single copy sent to the Repository alone leaves the arresting agency's record untouched.",
        consequence:
          "The packet renders the application twice, one copy addressed to each recipient, and the instructions "
          + "state in terms that a copy sent to one alone leaves the other's record standing. The Repository "
          + "copy prints the Repository's recorded address, proven from the bytes; the agency copy's address is "
          + "a labelled dotted blank the participant supplies, because no directory of Nevada agency addresses "
          + "is held."
      },
      {
        finding:
          "The five NRS 179A.160(2) exclusions define when removal is refused, and two are easy to get wrong "
          + "from memory: a deferred prosecution or plea bargain defeats the route even though the participant "
          + "will describe the outcome as favourable, and the prior-conviction exclusion reaches every United "
          + "States jurisdiction, not only Nevada.",
        consequence:
          "The exclusion screen walks all five with their statutory cites and the two traps called out, the "
          + "application's face carries the gate ('SEND THIS APPLICATION ONLY IF every answer is NO'), and the "
          + "application's own statement of the five conditions is the applicant's, adopted by their signature "
          + "after the screen — never the platform's assertion of facts it does not hold."
      },
      {
        finding:
          "What makes a disposition 'favorable to the person' is not defined by the section; the legal-design "
          + "record preserves it as a self-help stop rather than a build blocker.",
        consequence:
          "The exclusion screen and the instructions state the boundary in the record's terms — dismissal and "
          + "acquittal are the section's own examples, and anything less clear-cut is a legal characterisation "
          + "to take to a lawyer or Nevada Legal Services rather than decide alone."
      },
      {
        finding:
          "The section prescribes no fee, no notice, no delivery method and no attachment, and the legal-design "
          + "record classifies the delivery and accompanying-record questions as release-level filing "
          + "instruction.",
        consequence:
          "Each silence is stated from the record: the application is free (the Division's fee is for the "
          + "criminal history copy, a different service); proof of delivery is recommended as a filing "
          + "instruction and not asserted as a legal requirement; the disposition proof is named as what makes "
          + "the application actionable while stating the section requires no attachment. The recorded "
          + "six-month repository lag after a court sealing order is attributed to the Division's General "
          + "Information document rev. 8/2025, the record that actually says it."
      },
      {
        finding:
          "Repository removal and the court sealing petition are separate remedies over separate records, and "
          + "NRS 179A.160(3) preserves the court's separate authority.",
        consequence:
          "The parallel screen states both directions of the trap — removal leaves the court record; a court "
          + "order does not reach the repository at once — and routes the court-petition question to the clerk "
          + "of the court that handled the case and Nevada Legal Services. The counsel limitations (sealing is "
          + "not expungement; no firearm-rights restoration; no reach into federal or out-of-state records; no "
          + "immigration effect) are stated in the record's own terms."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The application states the five subsection 2 conditions as the applicant's own adopted statement ('to the best of my knowledge, none of them does'), gated by the exclusion screen and the applicant's signature. Confirm that presentation.",
      "The Repository copy prints the Central Repository's address as the legal-design record states it (333 West Nye Lane, Suite 100, Carson City, Nevada 89706). Confirm currency before any release.",
      "Whether the Central Repository requires a particular delivery method or a criminal history record to accompany the application is the record's own open question, answered here as filing-instruction guidance (proof of delivery recommended; ask the Division its practice). Confirm the treatment.",
      "Whether a disposition is 'favorable to the person' is undefined by the section and is carried as a self-help stop. Confirm that boundary."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound because none exists for this application; confirm the codified-grounds posture is legible to reviewers.",
      "The application is rendered twice by design (two statutory recipients); confirm the duplicate-copy presentation reads as one instrument in two copies.",
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
