#!/usr/bin/env node
/**
 * The Vermont deferred-sentence expungement family — `vt_exp_deferred_sentence-set`.
 *
 *   node scripts/build-census-v1-vt_exp_deferred_sentence-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading, composed from CODIFIED TEXT:
 * the MASTER_QUEUE row binds no source bytes (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []). The ground is two
 * committed records, verified by SHA-256 and content assertion on every build:
 *
 *   [MEMO]     data/record-clearing/legal-design-intake/VT.memo.json,
 *              track vt_exp_deferred_sentence (13 V.S.A. § 7041(e), read at
 *              source 2026-08-06)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId vt_exp_deferred_sentence-set (three components)
 *
 * THE RELIEF IS THE COURT'S DUTY, NOT A PETITION — AND THE DESIGN INSISTS ON
 * IT. On fulfilment of the deferred-sentence terms the court strikes the
 * adjudication of guilt and discharges the person, and § 7041(e) makes
 * expungement follow on discharge, absent a finding of good cause — the
 * participant files nothing to obtain it, and the review's headline warning
 * is that anyone who completed a deferred sentence should not be sold a
 * petition packet. So the first instrument is verification: confirm the
 * discharge and the striking of the adjudication, confirm restitution is
 * paid in full (the statute bars expungement until it is — the fact that
 * most often explains a missing order), and check the record through Form
 * 200-00331. The WRITTEN REQUEST is the conditional instrument, only where
 * the person was discharged, restitution is paid, and the order nevertheless
 * did not issue: a controlled request to the Criminal Division of the
 * Superior Court that entered the deferred sentence, under the existing
 * docket rather than as a new case, identifying the docket, the discharge
 * date and the date restitution was satisfied, citing § 7041(e), and asking
 * the court to enter the order the statute requires. It drafts NO argument
 * about good cause and never asserts that no good cause exists — the memo
 * drafts that out and routes it to an attorney.
 *
 * VOCABULARY, CAREFULLY: after 2025-07-01 Vermont is a sealing state, not an
 * expungement state, and participant copy must not use expungement as the
 * umbrella term. This relief, though, arises under chapter 221 and the
 * statute's own word for it is expunge — so the instruments use the
 * statutory word for THIS relief, and the handoff page carries the recorded
 * sealing-state explanation (expungement removes and destroys; sealing moves
 * records into a confidential file) plus the federal-background-check caveat
 * and the § 7041(h) VCIC special-index exception for registrable sex
 * offences. The byte proof asserts the handoff page still carries the
 * sealing-state note.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes only the
 * participant's own identity and contact facts. Every case fact — the
 * county, the docket number, the discharge date, the date restitution was
 * satisfied — is a labelled dotted blank declared REQUIRED_BEFORE_FILING and
 * disclosed with its checkable authority named (the Criminal Division clerk;
 * the Restitution Unit of the Vermont Center for Crime Victim Services). No
 * signature, signature date, judicial, clerk or court-date field is written.
 * No fee is stated because none exists: § 7041(e) imposes no petition fee
 * and no chapter 230 filing fee applies because this is not a chapter 230
 * petition.
 *
 * No raster in this container: rasterState is BUILT_RASTER_PENDING.
 * (FACTORY_MEMORY's VT corpusRoot() hazard does not arise here: this family
 * binds no corpus bytes, so no env-joined path is ever resolved.)
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
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "vt_exp_deferred_sentence-set";
const OUT = "data/rcap-all50/overlays/census-v1/vt/vt-exp-deferred-sentence-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-vt_exp_deferred_sentence-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/VT.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "vt_exp_deferred_sentence";

const ROUTE = Object.freeze({
  jurisdiction: "VT",
  routeKeys: [
    "obligation:unit:VT:vt_exp_deferred_sentence:vt-deferred-automatic-and-verification",
    "obligation:unit:VT:vt_exp_deferred_sentence:vt-deferred-written-request"
  ],
  legalName: "Expungement on Discharge from a Deferred Sentence, 13 V.S.A. § 7041(e)",
  routeName: "confirming that a completed Vermont deferred sentence was expunged as 13 V.S.A. § 7041(e) requires, and asking the court in writing where the order did not issue",
  statute: "13 V.S.A. § 7041(e)"
});

const COMPONENTS = [
  "vt_exp_deferred_sentence-verification-and-eligibility-guidance-1",
  "vt_exp_deferred_sentence-written-request-to-court-2",
  "vt_exp_deferred_sentence-handoff-instructions-3"
];

const COMPONENT_CONDITIONS = {
  "vt_exp_deferred_sentence-written-request-to-court-2":
    "Only where the person was discharged, restitution is paid, and the expungement order nevertheless did not "
    + "issue. Anyone who completed a deferred sentence should not be sold a petition packet, and this request is "
    + "not one — it asks the court to do what the statute already requires."
};

const COMPOSED_TITLES = {
  "vt_exp_deferred_sentence-verification-and-eligibility-guidance-1": "Step One, Always: Confirm the Discharge, the Restitution, and Whether the Order Issued",
  "vt_exp_deferred_sentence-written-request-to-court-2": "Written Request for Entry of the Expungement Order Under 13 V.S.A. Sec. 7041(e)",
  "vt_exp_deferred_sentence-handoff-instructions-3": "When This Is Not Yours to Finish Alone, and What Vermont's Words Mean Now"
};

const RECORD_ANCHORS = {
  memo: [
    "13 V.S.A. § 7041(e)",
    "vt-deferred-automatic-and-verification",
    "vt-deferred-written-request",
    "The record is not expunged until restitution has been paid in full, however long that takes.",
    "The Restitution Unit of the Vermont Center for Crime Victim Services",
    "Form 200-00331",
    "LegalEase does not draft argument about good cause and does not assert that no good cause exists",
    "under the existing docket rather than as a new case",
    "None. Section 7041(e) provides for a court-issued expungement order and imposes no petition fee, and no chapter 230 filing fee applies because this is not a chapter 230 petition.",
    "Not required.",
    "§ 7041(h)",
    "After 2025-07-01 Vermont is a sealing state, not an expungement state.",
    "Expunged and sealed records may still appear in a federal criminal background check.",
    "Anyone who completed a deferred sentence should not be sold a petition packet."
  ],
  manifest: [
    "vt_exp_deferred_sentence-verification-and-eligibility-guidance-1",
    "vt_exp_deferred_sentence-written-request-to-court-2",
    "vt_exp_deferred_sentence-handoff-instructions-3"
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Burlington, VT 05401",
    "participant.phone": "802-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Brattleboro, Vermont 05301-2214",
    "participant.phone": "(802) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

/* ---- record grounding --------------------------------------------------------- */
function groundRecords() {
  const failures = [];
  const records = [];
  for (const [name, rel, anchors, locate] of [
    ["memo", MEMO_PATH, RECORD_ANCHORS.memo, (j) => (j.tracks ?? j.records ?? []).find?.((t) => t.trackId === TRACK_ID) ?? j[TRACK_ID]],
    ["manifest", MANIFEST_PATH, RECORD_ANCHORS.manifest, (j) => (j.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID)]
  ]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push({ record: name, path: rel, why: "the committed record does not exist" }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const json = JSON.parse(bytes.toString("utf8"));
    const entry = locate(json);
    if (!entry) { failures.push({ record: name, path: rel, why: `the record no longer carries ${TRACK_ID}` }); continue; }
    const flat = JSON.stringify(entry);
    const missing = anchors.filter((a) => !flat.includes(a));
    if (missing.length > 0) { failures.push({ record: name, path: rel, why: `the record no longer states ${missing.length} fact(s) this build relies on`, missing }); continue; }
    records.push({ record: name, path: rel, sha256, byteLength: bytes.length, anchorsVerified: anchors.length });
  }
  return { records, failures };
}

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "vt_exp_deferred_sentence-verification-and-eligibility-guidance-1") {
    L.push(`Prepared for: ${name}`, "");
    L.push("THE COURT OWES YOU THIS - YOU DO NOT PETITION FOR IT. On fulfilment of the terms of probation and of the deferred sentence agreement, the court strikes the adjudication of guilt and discharges you, and 13 V.S.A. Sec. 7041(e) requires the record of the criminal proceedings to be expunged on discharge from probation, absent a finding of good cause by the court. Nothing is filed and nothing is paid: the section imposes no petition fee, and no chapter 230 filing fee applies because this is not a chapter 230 petition.", "");
    L.push("SO THE WORK IS TO CONFIRM, IN THIS ORDER:", "");
    L.push("STEP ONE. Confirm you were DISCHARGED from probation and the adjudication of guilt was STRUCK. Ask the clerk of the Criminal Division of the Superior Court that entered the deferred sentence for the discharge order - it establishes the date the Sec. 7041(e) duty attached.");
    L.push("STEP TWO. Confirm RESTITUTION IS PAID IN FULL. The record is not expunged until restitution has been paid in full, however long that takes - this is a bar in the statute, not a paperwork step, and it is the fact that most often explains a missing order. Ask the Restitution Unit of the Vermont Center for Crime Victim Services for a current balance statement.");
    L.push("STEP THREE. Check whether the expungement order ISSUED. Complete Form 200-00331, Request for Criminal Record Search, and submit it to the Criminal Division of the Superior Court in the county. If the case no longer shows, the order issued and you are done.", "");
    L.push("IF ALL THREE CHECKS PASS AND THE CASE STILL SHOWS: the order may not have issued, and the written-request page of this packet applies. How long courts take in practice to enter the order after discharge is not established by any source this packet is built from - before concluding the order is missing rather than pending, ask the Criminal Division clerk how long entry typically takes.", "");
    L.push("IF THE DEFERRED SENTENCE WAS NOT FULFILLED - you were not discharged, or the adjudication was not struck - this route is not available, and the request page must not be sent.");
  } else if (componentId === "vt_exp_deferred_sentence-written-request-to-court-2") {
    L.push("(Send this request ONLY where all three checks on the verification page passed and the case still shows on the record search. It is submitted under the EXISTING docket of the deferred-sentence case, not as a new case.)", "");
    L.push("TO: The Criminal Division of the Vermont Superior Court,");
    L.push(DOTS(48) + " Unit (county)");
    L.push("(the county whose Criminal Division entered the deferred sentence)", "");
    L.push(`FROM: ${name}`);
    L.push(`${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("Docket number of the deferred-sentence case:");
    L.push(DOTS(), "");
    L.push("RE: WRITTEN REQUEST FOR ENTRY OF THE EXPUNGEMENT ORDER UNDER 13 V.S.A. Sec. 7041(e)", "");
    L.push("To the court:", "");
    L.push(`1. I, ${name}, was the respondent in the deferred-sentence case identified by the docket number above, in which this Court entered a deferred sentence.`, "");
    L.push("2. I was discharged from probation, and the adjudication of guilt was struck, on this date (from the discharge order):");
    L.push(DOTS(), "");
    L.push("3. All restitution has been paid in full. The date restitution was satisfied, from the Restitution Unit's statement:");
    L.push(DOTS(), "");
    L.push("4. I checked my record through a criminal record search (Form 200-00331) with this Court, and the case still appears, so it appears the expungement order has not issued.", "");
    L.push("5. Section 7041(e) of Title 13 provides that the record of the criminal proceedings shall be expunged on discharge from probation, absent a finding of good cause by the court, and that the court shall issue an order to expunge all records and files related to the arrest, citation, investigation, charge, adjudication of guilt, criminal proceedings and probation.", "");
    L.push("6. I therefore request that the Court enter the expungement order Sec. 7041(e) requires. This request makes no argument about good cause and does not assert that no finding of good cause exists; whether to make such a finding is for the Court.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(48), "");
    L.push(`PRINTED NAME: ${name}`, "");
    L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you. No fee is enclosed and none is owed. Notarization is not required.)");
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("STOP AND TAKE THIS TO A LAWYER OR LEGAL-AID OFFICE, INSTEAD OF SENDING THE REQUEST, IF ANY OF THESE IS TRUE:");
    L.push("- the court has made, or signals it will make, a finding of good cause against expungement - this packet drafts no argument about good cause, deliberately, and that conversation needs counsel;");
    L.push("- the offence requires sex offender registration - Sec. 7041(h) requires VCIC to keep a confidential special index of deferred sentences for such offences, accessible only by the VCIC director and one designated staff person for presentence investigation purposes, and that index survives the expungement;");
    L.push("- you were not in fact discharged, or the adjudication of guilt was not struck - the deferred sentence was not fulfilled and this route is not available;");
    L.push("- restitution remains outstanding - the record cannot be expunged until it is paid in full, however long that takes;");
    L.push("- any immigration question is involved.", "");
    L.push("WHAT VERMONT'S WORDS MEAN NOW. After 1 July 2025, Vermont is a sealing state, not an expungement state: sealing moves records into a confidential file without destroying them, while expungement removes records from accessible databases and destroys the paper file, and after Act 60 expungement survives mainly for conduct that is no longer criminal. THIS relief is different: it arises under chapter 221, not chapter 230, and the statute's own word for what the court owes you on discharge from a deferred sentence is expunge - which is why these pages use it for this relief and no other.", "");
    L.push("ONE FEDERAL CAVEAT. Expunged and sealed records may still appear in a federal criminal background check. Vermont relief does not reach federal records, even though VCIC notifies the FBI's National Crime Information Center.", "");
    L.push("AFTER THE ORDER ISSUES. The court sends copies of the expungement order to each agency, department or official named in it - you do not deliver them.");
  }
  L.push("", `Routes: ${ROUTE.routeKeys.join(" ; ")}`);
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
    reason: `the participant supplies this before sending: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const writes = [];
  const refusals = [];
  if (componentId === "vt_exp_deferred_sentence-written-request-to-court-2") {
    writes.push(
      write("requester_name", "Person making this request, named in the FROM block and printed at the foot of the request", "participant.full_legal_name"),
      write("mailing_address", "Mailing address in the FROM block, where the court replies", "participant.street_address"),
      write("telephone", "Telephone number in the FROM block", "participant.phone"),
      write("email", "Email address in the FROM block", "participant.email")
    );
    refusals.push(
      rbf("unit_county", "County written into the address block - the county whose Criminal Division entered the deferred sentence",
        "the county whose Criminal Division of the Superior Court entered the deferred sentence - the request goes back to that same court, under the existing docket",
        "which county's Criminal Division entered the deferred sentence is a case fact the platform has not seen"),
      rbf("docket_number", "Docket number of the deferred-sentence case",
        "the docket number of the deferred-sentence case, copied from your papers or from the discharge order",
        "no case identifier is held for a record the platform has not seen"),
      rbf("discharge_date", "Date of discharge from probation, with the adjudication of guilt struck, from the discharge order",
        "the date you were discharged from probation and the adjudication of guilt was struck - copy it from the discharge order the Criminal Division clerk gives you; it establishes the date the Sec. 7041(e) duty attached",
        "the discharge order is a court record the platform has not seen, and the statute's duty runs from its date"),
      rbf("restitution_satisfied_date", "Date restitution was satisfied, from the Restitution Unit's statement",
        "the date all restitution was paid in full, from the current balance statement of the Restitution Unit of the Vermont Center for Crime Victim Services - the record cannot be expunged until restitution is paid in full, so do not send the request without this",
        "the restitution bar is statutory and only the Restitution Unit's statement establishes the fact"),
      protectedBlank("requester_signature", "Signature on the request",
        "you sign the request personally"),
      protectedBlank("signature_date", "Date beside the signature on the request",
        "a date written before the request is signed would be false")
    );
  } else {
    writes.push(write("participant_name", "Person this page is prepared for", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/VT.memo.json, track "
      + "vt_exp_deferred_sentence) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json)",
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
  // The design's own guardrails, read from the output bytes:
  const requestText = String(textOfComponent.get("vt_exp_deferred_sentence-written-request-to-court-2") ?? "");
  assert.ok(requestText.includes("makes no argument about good cause and does not assert that no finding of good cause exists"),
    "the request page no longer carries its no-good-cause-argument disclaimer");
  assert.ok(requestText.includes("under the EXISTING docket"),
    "the request page no longer states that it travels under the existing docket rather than as a new case");
  const handoffText = String(textOfComponent.get("vt_exp_deferred_sentence-handoff-instructions-3") ?? "");
  assert.ok(handoffText.includes("Vermont is a sealing state, not an expungement state"),
    "the handoff page no longer carries the recorded sealing-state terminology note");
  assert.ok(handoffText.includes("federal criminal background check"),
    "the handoff page no longer carries the federal-background-check caveat");
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
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  /* A hand-written identityRefresh on a source pin this build did not move
   * survives the rebuild; one whose source moved again does not. See
   * scripts/rcap-packet-completeness/identity-refresh.mjs. */
  fs.writeFileSync(absolute, `${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\n`);
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

function participantInstructions(maps, rbfItems) {
  const byDoc = new Map();
  for (const item of rbfItems) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("**You do not petition for this relief — the court owes it.** On discharge from probation after a fulfilled deferred sentence, 13 V.S.A. § 7041(e) requires the record expunged absent a finding of good cause, with no fee of any kind. The first work is to confirm three facts, and only where all three pass and the record still shows does the written request apply.", "");

  out.push("## The three checks, in order", "");
  out.push("| Check | Where |", "| --- | --- |");
  out.push("| You were **discharged from probation** and the **adjudication of guilt was struck** — get the discharge order | the clerk of the Criminal Division of the Superior Court that entered the deferred sentence |");
  out.push("| **Restitution is paid in full** — the record is not expunged until it is, however long that takes | the Restitution Unit of the Vermont Center for Crime Victim Services (current balance statement) |");
  out.push("| Whether the **expungement order issued** — an expunged case will not show | Form 200-00331, Request for Criminal Record Search, submitted to the Criminal Division in the county |");
  out.push("");
  out.push("How long courts take in practice to enter the order after discharge is not established by any source this packet is built from — before concluding the order is missing rather than pending, ask the Criminal Division clerk how long entry typically takes.", "");

  out.push("## The items you must supply (request stage only)", "");
  out.push("Each is printed on the request as a labelled dotted blank.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order (request stage)", "");
  out.push("1. **Run the three checks above.** If the case has cleared, you are done. If you were not discharged or restitution is outstanding, the request must not be sent.");
  out.push("2. **Fill in every dotted blank** from the discharge order and the Restitution Unit statement. Do not guess a date.");
  out.push("3. **Sign and date the request yourself.** Notarization is not required.");
  out.push("4. **Send it to the Criminal Division of the Superior Court that entered the deferred sentence**, under the existing docket — it is not a new case, and nothing is paid.");
  out.push("5. **After the order issues, the court sends copies** to each agency, department or official named in it — not you.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and its date.** Yours alone.");
  out.push("- **Every case fact.** The discharge order, the Restitution Unit statement and the record search hold them; the packet holds none of them.");
  out.push("- **Anything about good cause.** The request makes no argument about good cause and does not assert that none exists — if the court raises it, that conversation needs counsel.", "");

  out.push("## When to stop and get help instead", "");
  out.push("- the court has made, or signals it will make, a finding of good cause against expungement;");
  out.push("- the offence requires sex offender registration — the § 7041(h) confidential VCIC special index survives the expungement;");
  out.push("- you were not discharged, or the adjudication was not struck;");
  out.push("- restitution remains outstanding;");
  out.push("- any immigration question is involved.", "");

  out.push("## Vermont's words, and one federal caveat", "");
  out.push("After 1 July 2025 Vermont is a **sealing** state, and participant copy must not use expungement as the umbrella term — but this relief arises under chapter 221 and the statute's own word for it is expunge, so this packet uses the statutory word for this relief and no other. Expunged and sealed records may still appear in a **federal** criminal background check; Vermont relief does not reach federal records.", "");

  out.push("## What this packet is not", "");
  out.push("Verification guidance plus a prepared written request. There is no Vermont Judiciary form for the request — that is why it is composed — and this is not legal advice, nothing is sent for you, and nothing here decides whether the court will enter the order.", "");
  out.push(`_Routes: ${ROUTE.routeKeys.join(" ; ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const { records, failures } = groundRecords();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a committed governing record no longer states what this build relies on, so nothing may be composed against it",
      overlayDirectoryTouched: false
    };
  }

  if (checkOnly) {
    const maps = COMPONENTS.map((c) => composedMap(c));
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      groundingRecords: records, components: COMPONENTS,
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const maps = COMPONENTS.map((c) => composedMap(c));
  const artifacts = [];
  const writeProofs = [];
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; the request page asserted to carry its no-good-cause-argument disclaimer and its existing-docket statement, and the handoff page its sealing-state note and federal caveat",
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
  }

  const rbfItems = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbfItems);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "CUSTOM_PLEADING_FROM_CODIFIED_TEXT", acquisitionCommissioned: false,
    bindingMethod:
      "no source bytes are bound — the MASTER_QUEUE row binds none (sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, "
      + "boundSources []) — so the build grounds on the family's committed legal-design records, each verified by "
      + "SHA-256 and by content assertion (every fact this build relies on must still be stated) before composing",
    routeKeys: ROUTE.routeKeys,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    groundingRecords: records,
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that 13 V.S.A. § 7041 as recorded in the memo (read at source 2026-08-06) is the current text of the statute",
      "how long after discharge Vermont courts in practice enter the § 7041(e) order (a recorded release blocker; the packet delegates the question to the Criminal Division clerk)",
      "that Form 200-00331 rev. 05/2026 is the current edition of the record-search form",
      "that any output is approved for participant delivery",
      "that any record qualifies for expungement under 13 V.S.A. § 7041(e)"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, renderStrategy: "composed_pleading",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The two units are alternatives and exactly one applies, decided by facts only the participant's records "
      + "hold: either the court did what § 7041(e) requires (verification, nothing to send) or it did not (the "
      + "written request). The request's own face carries its condition, and the packet never selects the unit — "
      + "the three checks do.",
    requiredBeforeFilingCount: rbfItems.length,
    requiredBeforeFiling: rbfItems,
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
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved "
      + "packet bytes, not from this builder's intent; the request page was asserted to carry its "
      + "no-good-cause-argument disclaimer and existing-docket statement, and the handoff page the sealing-state "
      + "terminology note and the federal-background-check caveat.",
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
    requiredBeforeFiling: rbfItems,
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
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
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
          "The review's headline: § 7041(e) relief is court-driven on discharge and requires no petition, and "
          + "anyone who completed a deferred sentence should not be sold a petition packet.",
        consequence:
          "Verification leads the packet and the written request is the conditional instrument, its condition "
          + "printed on its own face (all three checks passed and the case still shows), submitted under the "
          + "existing docket rather than as a new case — byte-proof enforced."
      },
      {
        finding:
          "The restitution bar is statutory: the record is not expunged until restitution has been paid in full, "
          + "however long that takes — the fact that most often explains a missing order.",
        consequence:
          "The bar is stated as an eligibility fact, the Restitution Unit of the Vermont Center for Crime Victim "
          + "Services is the named checkable authority for it, and the request cannot honestly be completed "
          + "without the Unit's statement date."
      },
      {
        finding:
          "The memo drafts the good-cause question out: LegalEase does not draft argument about good cause and "
          + "does not assert that no good cause exists.",
        consequence:
          "The request states exactly that on its face (byte-proof enforced), and a good-cause finding or signal "
          + "is the first attorney-handoff trigger on the handoff page."
      },
      {
        finding:
          "Vermont terminology after Act 60: a sealing state, with expungement surviving mainly for conduct no "
          + "longer criminal — while this chapter-221 relief's own statutory word is expunge. The § 7041(h) VCIC "
          + "special index survives expungement for registrable sex offences, and expunged or sealed records may "
          + "still appear in federal background checks.",
        consequence:
          "The instruments use the statutory word for this relief only, and the handoff page carries the recorded "
          + "sealing-state explanation, the § 7041(h) exception and the federal caveat — all byte-proof enforced."
      },
      {
        finding:
          "The practice interval — how long after discharge courts actually enter the order — is a recorded "
          + "release blocker: the statutory duty is unambiguous but the waiting time is not established.",
        consequence:
          "The verification page tells the participant to ask the Criminal Division clerk how long entry "
          + "typically takes before concluding the order is missing, and the open question travels to counsel."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The recorded release blocker: how long after discharge Vermont courts in practice enter the § 7041(e) order, and therefore when a participant should treat the order as missing rather than pending. The packet currently delegates the question to the Criminal Division clerk.",
      "Confirm the composed written request is the right instrument where the order did not issue — the statute supplies the destination, the court, the operative facts and the relief, and no Judiciary form exists — and that the no-good-cause-argument boundary is drawn correctly.",
      "Confirm the terminology presentation: the statutory word expunge for this chapter-221 relief, with the Act 60 sealing-state explanation confined to the handoff page."
    ],
    mattersForTheReviewersAttention: [
      "The request travels under the existing docket, not as a new case, and encloses no fee — both stated on its face.",
      "The restitution bar is presented as a statutory eligibility fact with the Restitution Unit as the named authority; confirm that presentation.",
      "Every case fact is required-before-filing and disclosed; the discharge order and the Restitution Unit statement are the named sources.",
      "The § 7041(h) VCIC special-index exception and the federal-background-check caveat are stated on the handoff page (byte-proof enforced)."
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
    groundingRecords: records,
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbfItems.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
