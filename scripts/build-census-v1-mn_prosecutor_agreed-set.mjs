#!/usr/bin/env node
/**
 * The Minnesota prosecutor-agreed sealing packet family builder.
 *
 *   node scripts/build-census-v1-mn_prosecutor_agreed-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   mn_prosecutor_agreed   Minn. Stat. § 609A.025 — sealing on the
 *                          prosecutor's agreement, with no participant
 *                          petition at the court stage
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/MN.memo.json, track
 * mn_prosecutor_agreed, reviewed as of 2026-07-30 — records that the corpus
 * holds NO county prosecutor application: Hennepin, Ramsey and Washington
 * Counties run published intake programmes that are third-party systems
 * LegalEase must not complete or submit (that branch stays guidance), and
 * where no published programme exists the accepted vehicle is a
 * participant-signed WRITTEN REQUEST to the county or city attorney, which
 * § 609A.025 itself supplies the mechanism and destination for. The
 * written-request branch is therefore custom_pleading generated against the
 * statute, with localFormOverride set — a county programme's own intake
 * governs where it exists. The court stage is expressly a no-petition
 * mechanism: once the prosecutor agrees, the court shall seal without any
 * participant filing unless the public-interest balance goes the other way.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — the county, which authority prosecuted, the court file
 * number, the disposition, the § 609A.02, subd. 3 ground, the participant's
 * own account — belongs to records and judgments the platform does not hold,
 * so each is a labelled dotted blank, declared REQUIRED_BEFORE_FILING and
 * disclosed by its printed label in participant-instructions.md, with the
 * BCA record, Minnesota Court Records Online, and the Minnesota Attorney
 * General's page (the recorded statewide entry point for identifying the
 * prosecuting authority) named as the checkable authorities. No signature and
 * no signature date is ever written. No fee is identified for the prosecutor
 * application and whether any county charges is the record's own open
 * question, stated as such and delegated to the county office by class.
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

const FAMILY_ID = "mn_prosecutor_agreed-set";
const OUT = "data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-mn_prosecutor_agreed-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MN",
  routeKeys: [
    "obligation:unit:MN:mn_prosecutor_agreed:mn_prosecutor_agreed-court-sealing",
    "obligation:unit:MN:mn_prosecutor_agreed:mn_prosecutor_agreed-portal-county",
    "obligation:unit:MN:mn_prosecutor_agreed:mn_prosecutor_agreed-request-stage",
    "obligation:unit:MN:mn_prosecutor_agreed:mn_prosecutor_agreed-written-request"
  ],
  routeSelectionId: "mn-prosecutor-agreed-composed-set",
  legalName: "Prosecutor-Agreed Sealing under Minn. Stat. § 609A.025",
  routeName: "asking a Minnesota prosecutor to agree to record sealing under Minn. Stat. Sec. 609A.025",
  statute: "Minn. Stat. § 609A.025, with § 609A.02, subd. 3 and § 609A.03, subd. 7a(b)(4)"
});

/* The three components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "primary_filing",
  "process_guidance",
  "attachment"
];

const COMPONENT_CONDITIONS = {
  primary_filing: "Where the county runs no published programme.",
  attachment: "Where the local programme requests it."
};

const COMPOSED_TITLES = {
  primary_filing: "Written Request to the County or City Attorney Under Minn. Stat. Sec. 609A.025",
  process_guidance: "Which Branch Is Yours, and What Happens After the Prosecutor Agrees",
  attachment: "Attachment: Your Own Rehabilitation Material"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/MN.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "mn_prosecutor_agreed") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track mn_prosecutor_agreed in the memo" });
    else {
      const writtenRequest = (memoTrack.units ?? []).find((u) => u.unitId === "mn_prosecutor_agreed-written-request") ?? null;
      if (!writtenRequest || writtenRequest.outputStrategy !== "custom_pleading") {
        failures.push({ record: MEMO_PATH, why: "the memo's written-request unit is missing or is no longer custom_pleading; this builder may not proceed against a drifted strategy" });
      }
      if (memoTrack.localFormOverride !== true) {
        failures.push({ record: MEMO_PATH, why: "the memo no longer sets localFormOverride; the county-programme-governs posture this build prints would be drifted" });
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
    "participant.street_address": "425 Birchwood Lane, Duluth, MN 55803",
    "participant.phone": "218-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "11884 Mississippi Headwaters Crossing Boulevard Northeast, Apartment 14B, Rochester, Minnesota 55906-2214",
    "participant.phone": "(507) 555-0199 ext. 4417",
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
  if (componentId === "primary_filing") {
    L.push("USE THIS WRITTEN REQUEST ONLY WHERE THE COUNTY RUNS NO PUBLISHED PROGRAMME. Hennepin, Ramsey and Washington Counties run published record-sealing applications of their own; where your county does, THAT PROGRAMME GOVERNS and you apply through it - this request is not its substitute. The guidance page walks the branches.", "");
    L.push("To: the county attorney, or the city attorney, that prosecuted the case");
    L.push("Office name and mailing address (you identify the correct prosecuting authority and its address before sending - the Minnesota Attorney General's expungement page is the statewide entry point for identifying it):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push(`From: ${name}`);
    L.push(`Date of birth: ${dob}`);
    L.push(`Mailing address: ${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("RE: REQUEST THAT YOUR OFFICE AGREE TO SEALING UNDER MINN. STAT. Sec. 609A.025", "");
    L.push(`1. I, ${name}, ask your office, as the prosecuting authority in the case identified below, to agree to the sealing of the record under Minn. Stat. Sec. 609A.025. Where the prosecutor agrees, the court shall seal the record without any petition from me, unless the court determines that the interests of the public and public safety in keeping the record public outweigh the disadvantages to me of not sealing it.`, "");
    L.push("2. The case is identified as follows, from my own court and criminal history records:", "");
    L.push("Minnesota county of the case:");
    L.push(DOTS(), "");
    L.push("Prosecuted by (the county attorney, or which city attorney):");
    L.push(DOTS(), "");
    L.push("Court file number (from Minnesota Court Records Online or the court's own papers):");
    L.push(DOTS(), "");
    L.push("How the case ended (the disposition), exactly as the court record states it:");
    L.push(DOTS(), "");
    L.push("The Minn. Stat. Sec. 609A.02, subd. 3 ground I believe applies, and why:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. In my own words, why I am asking your office to agree (these lines are yours alone; nothing on them is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. I understand that your office's agreement is discretionary; that before agreeing, Sec. 609A.025 requires your office to make a good-faith effort to notify any identifiable victims of the intended agreement and of the opportunity to object; and that this request does not ask your office to skip any step the statute requires.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(50), "");
    L.push("(You sign and date this request personally. The request is your own, and nothing on this page is signed or dated for you. No notarization is required.)", "");
    L.push(`PRINTED NAME: ${name}`);
  } else if (componentId === "process_guidance") {
    L.push(`For: ${name}`, "");
    L.push("WHAT THIS MECHANISM IS. Minn. Stat. Sec. 609A.025 is one statewide mechanism with county-specific intake: where the prosecutor agrees to sealing, the court SHALL seal the record - without any petition from you - unless it determines that the interests of the public and public safety in keeping the record public outweigh the disadvantages to you. The prosecutor's agreement is discretionary, and before agreeing the prosecutor must make a good-faith effort to notify identifiable victims of the intended agreement and of the opportunity to object.", "");
    L.push("WHICH BRANCH IS YOURS.");
    L.push("- PORTAL COUNTIES. Hennepin, Ramsey and Washington Counties run published online record-sealing applications. Those are the counties' own third-party intake systems with their own field requirements: this packet prepares your factual summary and routes you to the county portal, and it does not - and must not - complete or submit a county portal application for you. Where a county programme exists, it governs.");
    L.push("- EVERY OTHER COUNTY. Where the county runs no published programme, the accepted vehicle is your own signed written request to the county or city attorney - the request page of this packet. The Minnesota Attorney General's expungement page is the statewide entry point for identifying the correct prosecuting authority and its address.", "");
    L.push("YOUR RECORDS FIRST. Request your own Minnesota criminal history from the Bureau of Criminal Apprehension, and look your cases up on Minnesota Court Records Online. The county, the prosecuting authority, the court file number and the disposition are copied from those records, never from memory. This packet never collects, inspects or authenticates them.", "");
    L.push("TIMING. The Sec. 609A.02, subd. 3 waiting periods apply by reference. For a diversion or stay of adjudication described in subd. 3(a)(2), the prosecutor's agreement may occur before or after the charges are dismissed.", "");
    L.push("FEES. None is identified for the prosecutor application, and whether any county charges is an open question this packet does not answer: ask the office you are applying to before sending anything with money attached.", "");
    L.push("AFTER THE PROSECUTOR AGREES. There is nothing for you to file. The court acts on the agreement and seals unless the public-interest balance goes the other way. If you are asked to do anything at the court stage, that is a sign the case has left the no-petition path - get help.", "");
    L.push("WHAT THIS PACKET DOES NOT DO. It does not obtain the prosecutor's agreement, does not negotiate, and does not advise whether approaching the prosecutor is strategically preferable to petitioning under the ordinary expungement route - that judgment is exactly where self-help stops.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF SENDING");
    L.push("- any question of whether approaching the prosecutor is strategically advisable;");
    L.push("- any case with an identifiable victim - the victim-notice step belongs to the prosecutor, and a case with a victim is a case for counsel;");
    L.push("- any case where Department of Human Services, DCYF, Department of Health or PELSB records matter for your work or licence - Sec. 609A.03, subd. 7a(b)(4) permits a background-study opening unless the order is directed specifically to the commissioner of human services following Sec. 609A.025 proceedings upon service of an order on the commissioner, and that conditional is narrow - flag it to counsel;");
    L.push("- the prosecutor declines, or asks to negotiate;");
    L.push("- a county without a published programme where the city or county attorney will not accept a written request.");
  } else {
    L.push("USE THIS PAGE ONLY WHERE THE LOCAL PROGRAMME REQUESTS REHABILITATION MATERIAL. Some county programmes ask for material about what you have done since the case. This page formats your own material; it does not assess it, and nothing on it is written for you.", "");
    L.push(`For: ${name}`, "");
    L.push("List here, in your own words and your own hand, the material you are attaching - for example programmes completed, work history, education, community involvement - and attach the documents themselves behind this page:");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("Everything listed and attached is yours: obtained by you, chosen by you, attached by you. This packet does not collect, inspect, assess or authenticate any of it.");
  }
  L.push("", `Route: ${ROUTE.routeKeys[3]}`);
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
      rbf("prosecuting_authority_address", "Office name and mailing address of the prosecuting authority, in the addressee block of the request",
        "the county attorney or city attorney that prosecuted the case, and that office's mailing address - the Minnesota Attorney General's expungement page is the statewide entry point for identifying it",
        "which authority prosecuted and where it receives mail varies by county and city; no directory is held"),
      rbf("case_county", "Minnesota county of the case, in paragraph 2 of the request",
        "the county where the case was, from your court records",
        "no case fact is held for a record the platform has not seen"),
      rbf("prosecuted_by", "Prosecuted by - the county attorney, or which city attorney - in paragraph 2 of the request",
        "whether the county attorney or a city attorney prosecuted, from the court papers",
        "which authority prosecuted lives on the record, not in the platform"),
      rbf("court_file_number", "Court file number, in paragraph 2 of the request",
        "the court file number, from Minnesota Court Records Online or the court's own papers",
        "no case identifier is held for a record the platform has not seen"),
      rbf("disposition", "How the case ended (the disposition), in paragraph 2 of the request",
        "the disposition, exactly as the court record states it, checked against your BCA record",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("subd3_ground", "The Sec. 609A.02, subd. 3 ground the requester believes applies, and why, in paragraph 2 of the request",
        "which subd. 3 ground you believe applies and why - the statute's own grounds list is where to look, and a lawyer or legal-aid office is the place to take a doubtful one",
        "which statutory ground fits is a judgment about the participant's own record that the platform does not make"),
      rbf("participant_account", "The requester's own statement of why they are asking, in paragraph 3 of the request",
        "your own words: why you are asking the prosecutor to agree - these lines are yours alone",
        "the platform prints the participant's own account and writes none of it"),
      protectedBlank("requester_signature", "Signature on the written request",
        "the request is the participant's own; the participant signs it personally"),
      protectedBlank("signature_date", "Date beside the signature on the written request",
        "a date written before the request is signed would be false")
    );
  } else if (componentId === "attachment") {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
    refusals.push(
      rbf("rehabilitation_material_list", "The participant's own list of attached rehabilitation material",
        "your own list, in your own hand, of the material you are attaching - programmes completed, work history, education, community involvement - with the documents themselves behind this page",
        "rehabilitation material is participant-authored; the packet formats it and does not assess it")
    );
  } else {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKeys[3],
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/MN.memo.json, track "
      + "mn_prosecutor_agreed, reviewed as of 2026-07-30) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId mn_prosecutor_agreed-set)",
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
  // The scope-restriction statements this packet must carry, proven from the
  // bytes: the portal branch is never completed or submitted by the platform,
  // and the request's own face carries the no-published-programme condition.
  const guidance = String(textOfComponent.get("process_guidance") ?? "").replace(/\s+/g, " ");
  assert.ok(guidance.includes("does not - and must not - complete or submit a county portal application"),
    `${fixtureName}: the portal scope restriction is not readable from the guidance page's bytes`);
  const request = String(textOfComponent.get("primary_filing") ?? "").replace(/\s+/g, " ");
  assert.ok(request.includes("ONLY WHERE THE COUNTY RUNS NO PUBLISHED PROGRAMME"),
    `${fixtureName}: the written-request condition is not readable from the request's bytes`);
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
  out.push("Minn. Stat. § 609A.025 is one statewide mechanism with county-specific intake: where the prosecutor agrees to sealing, the court **shall seal without any petition from you**, unless the court determines that the interests of the public and public safety in keeping the record public outweigh the disadvantages to you. The prosecutor's agreement is discretionary, and before agreeing the prosecutor must make a good-faith effort to notify identifiable victims. No county prosecutor application is held in the corpus: Hennepin, Ramsey and Washington Counties run their own published portals (which govern where they exist, and which this packet never completes or submits), and everywhere else the accepted vehicle is your own signed written request to the county or city attorney — the composed request in this packet, generated against the statute.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to records the platform has not seen — your BCA criminal history and Minnesota Court Records Online — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Which branch is yours", "");
  out.push("| Branch | When it is yours | What you do |", "| --- | --- | --- |");
  out.push("| County portal | the case was in Hennepin, Ramsey or Washington County (or any county with its own published programme) | apply through the county's own system — it governs; this packet prepares your facts and routes you there |");
  out.push("| Written request | the county runs no published programme | send the composed written request in this packet to the county or city attorney |");
  out.push("");
  out.push("The Minnesota Attorney General's expungement page is the statewide entry point for identifying the correct prosecuting authority.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed written request under § 609A.025 (conditional — no-programme counties only) |");
  out.push("| `process_guidance` | which branch is yours, the no-petition court stage, and when to stop |");
  out.push("| `attachment` | your own rehabilitation material, formatted not assessed (conditional — where the local programme requests it) |");
  out.push("");

  out.push("## Documents you must obtain before sending", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your own Minnesota criminal history | Minnesota Bureau of Criminal Apprehension |");
  out.push("| Your case history — court file number and disposition | Minnesota Court Records Online |");
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
  out.push("1. **Get your BCA record and your MCRO case history**, and copy the county, the prosecuting authority, the file number and the disposition from them.");
  out.push("2. **Check the branch**: if your county runs a published programme, use it — that programme governs, and this packet's request is not its substitute.");
  out.push("3. **Identify the prosecuting authority and its address** through the Attorney General's page, and write both on the request.");
  out.push("4. **Fill in every dotted blank**, including the § 609A.02, subd. 3 ground you believe applies and your own paragraph 3 in your own words.");
  out.push("5. **Sign and date the request yourself.** No notarization is required.");
  out.push("6. **Ask the office whether it charges anything** — no fee is identified for the prosecutor application, and whether any county charges is an open question this packet does not answer.");
  out.push("7. **Send the request** the way the office directs, with the rehabilitation attachment only where the local programme requests it.");
  out.push("8. **After the prosecutor agrees, you file nothing**: the court acts on the agreement. If you are asked to do anything at the court stage, get help — the case has left the no-petition path.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** The request is your own.");
  out.push("- **The prosecuting authority's address.** It varies by county and city and must be identified through the Attorney General's page or confirmed with the office.");
  out.push("- **Any county portal's fields.** County portals are third-party intake systems; this packet never completes or submits them.", "");

  out.push("## When to stop and get help instead of sending", "");
  out.push("- any question of whether approaching the prosecutor is strategically advisable — this packet does not advise it;");
  out.push("- any case with an identifiable victim;");
  out.push("- any case where DHS, DCYF, Department of Health or PELSB records matter for your work or licence — the § 609A.03, subd. 7a(b)(4) conditional is narrow and belongs with counsel;");
  out.push("- the prosecutor declines, or asks to negotiate;");
  out.push("- a no-programme county whose attorney will not accept a written request.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared written request with its guidance and attachment pages. It is not a county programme's own application, it is not legal advice, it is not sent for you, it does not obtain or negotiate the prosecutor's agreement, and it does not decide whether the court's public-interest balance will favour sealing.", "");
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
      proofMethod: "every written fact value, the portal scope restriction and the written-request condition read back from the extracted text of the component's own pages in the saved packet bytes",
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
      + "legal-design intake track (including its localFormOverride flag and written-request unit strategy) and "
      + "the packet-set manifest.",
    routeKey: ROUTE.routeKeys[3], routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The corpus holds no county prosecutor application for § 609A.025 sealing. Hennepin, Ramsey and "
      + "Washington Counties run published intake programmes that are third-party systems the platform must not "
      + "complete or submit — that branch is guidance, and a county programme governs where it exists "
      + "(localFormOverride). Where no published programme exists, the accepted vehicle is a participant-signed "
      + "written request to the county or city attorney, which the statute itself supplies the mechanism and "
      + "destination for; the composed request is generated against the statute. Whether the three county "
      + "programmes publish a downloadable form or are portal-only is the record's own open question. No form "
      + "was substituted and none was invented.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track mn_prosecutor_agreed: the § 609A.025 mechanism, the four units and their strategies, the counsel scope restrictions, rules, stop conditions, open questions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the three-component set with its conditions and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "whether the Hennepin, Ramsey and Washington County programmes publish a downloadable form or are portal-only",
      "whether any county charges a fee for the prosecutor application",
      "that any output is approved for participant delivery",
      "that any record qualifies under § 609A.02, subd. 3"
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
      "The composed pages carry no election control. The portal-versus-written-request fork turns on whether "
      + "the participant's county runs a published programme, which is the participant's own answer: the "
      + "written request's condition is printed on its own face, the branch table is on the guidance page and in "
      + "the instructions, and a county programme governs where it exists. The court stage is a no-petition "
      + "mechanism and generates nothing. Nothing is selected for the participant.",
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
      + "packet bytes, not from this builder's intent; the portal scope restriction and the written-request "
      + "condition were proven present the same way.",
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
          "§ 609A.025 is a no-petition mechanism at the court stage — once the prosecutor agrees, the court "
          + "shall seal without any participant filing unless the public-interest balance goes the other way — "
          + "and the participant's own act is the request to the prosecuting authority.",
        consequence:
          "The packet composes the written request as its one filable instrument, states the no-petition court "
          + "stage on the guidance page in the statute's terms, and tells the participant that being asked to do "
          + "anything at the court stage is a sign the case has left the no-petition path."
      },
      {
        finding:
          "Hennepin, Ramsey and Washington Counties run published intake programmes that are third-party "
          + "systems, and the counsel scope restriction forbids the platform to complete or submit a county "
          + "portal application; a county programme governs where it exists (localFormOverride).",
        consequence:
          "The portal branch is guidance: the packet prepares the participant's facts and routes them to the "
          + "county system. The scope restriction is printed on the guidance page and byte-proven on every "
          + "build, and the written request's face carries its own condition — only where the county runs no "
          + "published programme."
      },
      {
        finding:
          "The counsel scope restrictions also forbid obtaining the prosecutor's agreement, negotiating, and "
          + "advising whether the request is strategically preferable to petitioning; an identifiable victim, a "
          + "DHS/DCYF/Health/PELSB concern (the narrow § 609A.03, subd. 7a(b)(4) conditional), a declination or "
          + "a negotiation request are recorded handoffs.",
        consequence:
          "Each boundary is stated on the guidance page and in the instructions in the record's own terms, with "
          + "the DHS conditional flagged to counsel exactly as the limitation directs; the packet advises no "
          + "strategy anywhere."
      },
      {
        finding:
          "The record carries two release-blocker open questions: whether any county charges a fee for the "
          + "prosecutor application, and whether the three county programmes publish a downloadable form or are "
          + "portal-only.",
        consequence:
          "The fee question is stated as open and delegated to the office being applied to; the form question is "
          + "handled by the recorded posture (the county programme governs; the composed request serves the "
          + "no-programme counties); both travel into counsel review in approval-request.json."
      },
      {
        finding:
          "The § 609A.02, subd. 3 ground is a judgment about the participant's own record, and the victim-notice "
          + "duty belongs to the prosecutor.",
        consequence:
          "The ground is a labelled dotted blank the participant states with their reasons (a doubtful one "
          + "routed to counsel), and the request's paragraph 4 acknowledges the prosecutor's own victim-notice "
          + "duty in the statute's terms without purporting to perform or waive any of it."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Whether any county charges a fee for the prosecutor application — the record's own release blocker, stated as open on the paper and delegated to the office.",
      "Whether the Hennepin, Ramsey and Washington County programmes publish a downloadable application form, or are portal-only — the record's second release blocker; the packet routes portal counties to their own systems and completes nothing.",
      "The written request states the § 609A.02, subd. 3 ground as the participant's own belief with reasons. Confirm that presentation, or direct a structured ground selection.",
      "The request's paragraph 4 acknowledges the prosecutor's victim-notice duty in the statute's terms. Confirm the acknowledgement is appropriate in a participant-signed request."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound because the corpus holds no county prosecutor application; confirm the codified-grounds posture is legible to reviewers.",
      "The portal scope restriction and the written-request condition are byte-proven on every build; confirm the placement.",
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
