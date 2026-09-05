#!/usr/bin/env node
/**
 * The Connecticut pardon-erasure packet family builder — `ct-pardon-erasure-set`.
 *
 *   node scripts/build-census-v1-ct-pardon-erasure-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading, composed from CODIFIED TEXT:
 * the MASTER_QUEUE row binds no source bytes (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []), and the build's ground
 * is the family's own committed legal-design records, verified by SHA-256 and
 * by content assertion before anything is composed:
 *
 *   [MEMO]     data/record-clearing/legal-design-intake/CT.memo.json,
 *              track ct-pardon-erasure (C.G.S. § 54-142a(d), reviewed 2026-07-30)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId ct-pardon-erasure-set
 *
 * TWO BRANCHES, SELECTED BY THE PARDON DATE, NEVER BY THIS PACKET.
 *
 * C.G.S. § 54-142a(d) splits on 1 October 1974. An absolute pardon received
 * BEFORE that date requires a petition to the Superior Court, which shall
 * direct erasure — no official form was located, so the petition is composed.
 * An absolute pardon received ON OR AFTER that date results in erasure without
 * any petition: such records shall be erased. The memo records in terms that
 * the pardon-date answer selects the branch and LegalEase does not choose one
 * for the participant, so both instruments are rendered with their conditions
 * printed on their own faces and neither is selected here.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES.
 *
 * The platform writes only the participant's own identity and contact facts.
 * Every case fact — the pardon date, the court, docket number and date of the
 * pardoned conviction — belongs to records the platform has not seen (the
 * Board of Pardons and Paroles decision; the court record), so each is a
 * labelled dotted blank declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md with its checkable authority named. No
 * signature, signature date, judicial, clerk or court-date field is written.
 *
 * CONNECTICUT SAYS ERASURE. Not expungement, not sealing — the memo carries
 * that as a scope restriction and this build's participant-facing text obeys
 * it. No fee: § 54-142a(k) says no fee shall be charged in any court with
 * respect to any petition under § 54-142a, and the record states it.
 *
 * The memo's release blockers — the caption and format G.A. clerks accept for
 * the pre-1974 petition must be confirmed with a Connecticut practitioner, and
 * C.G.S. §§ 54-130a to 54-130e were not read — travel with the family into
 * counsel review via approval-request.json. Nothing here resolves them, and
 * the petition tells the participant to call the clerk before filing, exactly
 * as the manifest's component note directs.
 *
 * No raster in this container: rasterState is BUILT_RASTER_PENDING and the
 * central workflow renders the pinned bytes.
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

const FAMILY_ID = "ct-pardon-erasure-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-pardon-erasure-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ct-pardon-erasure-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/CT.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "ct-pardon-erasure";

const ROUTE = Object.freeze({
  jurisdiction: "CT",
  routeKeys: [
    "obligation:unit:CT:ct-pardon-erasure:ct-pardon-erasure-branch-pre-1974-petition",
    "obligation:unit:CT:ct-pardon-erasure:ct-pardon-erasure-branch-post-1974-automatic"
  ],
  legalName: "Erasure After an Absolute Pardon, C.G.S. § 54-142a(d)",
  routeName: "erasure of Connecticut records after an absolute pardon, under C.G.S. § 54-142a(d)",
  statute: "C.G.S. § 54-142a(d)",
  feeStatute: "C.G.S. § 54-142a(k)"
});

/* The two components, in the packet-set manifest's own order and under the
 * manifest's own component ids. */
const COMPONENTS = [
  "ct-pardon-erasure-primary-filing-1",
  "ct-pardon-erasure-process-guidance-2"
];

const COMPONENT_CONDITIONS = {
  "ct-pardon-erasure-primary-filing-1":
    "Only on the pre-1 October 1974 branch, where a petition is required. The pardon-date answer selects "
    + "the branch; this packet never selects it for the participant.",
  "ct-pardon-erasure-process-guidance-2":
    "Only on the on-or-after 1 October 1974 branch, where erasure happens without a petition."
};

const COMPOSED_TITLES = {
  "ct-pardon-erasure-primary-filing-1": "Petition for Erasure of Records Following an Absolute Pardon (C.G.S. Sec. 54-142a(d))",
  "ct-pardon-erasure-process-guidance-2": "Erasure Without a Petition: the On-or-After 1 October 1974 Branch"
};

/* Facts an assertion in this build RELIES ON, verified against the committed
 * records before anything is composed — the codified-text analogue of reading
 * a bound form's face. The build refuses if any is no longer recorded. */
const RECORD_ANCHORS = {
  memo: [
    "C.G.S. § 54-142a(d)",
    "No fee shall be charged in any court with respect to any petition under § 54-142a. § 54-142a(k).",
    "ct-pardon-erasure-branch-pre-1974-petition",
    "ct-pardon-erasure-branch-post-1974-automatic",
    "The petitioner signs the petition on the pre-1974 branch. No participant signature on the automatic branch.",
    "The source review does not state a notarization requirement.",
    "The source review does not state a service requirement.",
    "Connecticut says erasure. Not expungement, not sealing.",
    "A provisional pardon or a certificate of employability is not an absolute pardon and does not erase anything.",
    "Connecticut Board of Pardons and Paroles",
    "Connecticut Judicial Branch online case look-up"
  ],
  manifest: [
    "ct-pardon-erasure-primary-filing-1",
    "ct-pardon-erasure-process-guidance-2",
    "Only on the pre-1 October 1974 branch, where a petition is required."
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- fixtures --------------------------------------------------------------- *
 * Two participants. The boundary one carries a long hyphenated name with an
 * apostrophe, a long one-line mailing address, a long email and a phone
 * extension, because a value that fits the line is not evidence that every
 * value does. No case fact is held: the pardon decision and the court record
 * are documents the platform has not seen.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Hartford, CT 06103",
    "participant.phone": "860-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, New Haven, Connecticut 06511-2214",
    "participant.phone": "(203) 555-0199 ext. 4417",
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
    if (!entry) { failures.push({ record: name, path: rel, why: `the record no longer carries ${name === "memo" ? TRACK_ID : FAMILY_ID}` }); continue; }
    const flat = JSON.stringify(entry);
    const missing = anchors.filter((a) => !flat.includes(a.replaceAll('"', '\\"')) && !flat.includes(a));
    if (missing.length > 0) { failures.push({ record: name, path: rel, why: `the record no longer states ${missing.length} fact(s) this build relies on`, missing }); continue; }
    records.push({ record: name, path: rel, sha256, byteLength: bytes.length, anchorsVerified: anchors.length });
  }
  return { records, failures };
}

/* ---- composed documents -------------------------------------------------------- *
 * Everything below is traceable to the memo or the manifest, named inline.
 * Nothing is stated that neither records: no caption format is asserted (the
 * memo carries the accepted caption as an open release blocker), no service
 * or notarization rule is asserted (the source review states neither), and no
 * figure of any kind is invented.
 */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const address = facts["participant.street_address"];
  const phone = facts["participant.phone"];
  const email = facts["participant.email"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  if (componentId === "ct-pardon-erasure-primary-filing-1") {
    L.push("USE THIS PAGE ONLY IF you received the absolute pardon BEFORE 1 October 1974. On that branch, C.G.S. Sec. 54-142a(d) requires a petition to the Superior Court, which shall direct erasure. If your absolute pardon was received on or after 1 October 1974, do not file anything: erasure happens without a petition, and the other page of this packet explains how to confirm it.", "");
    L.push("STATE OF CONNECTICUT");
    L.push("SUPERIOR COURT");
    L.push("Judicial district or court location: " + DOTS(48));
    L.push("(No source this packet is built from states the caption or format Superior Court clerks accept for this petition. Before filing, call the clerk's office of the Superior Court and ask how this petition should be captioned and where it should be filed; write what the clerk tells you on the lines above.)", "");
    L.push(`IN RE: ${name},`);
    L.push("PETITIONER.", "");
    L.push("Docket number of this petition: " + DOTS(36) + "  (the clerk assigns it at filing)", "");
    L.push("PETITION FOR ERASURE OF RECORDS FOLLOWING AN ABSOLUTE PARDON");
    L.push("(C.G.S. Sec. 54-142a(d) - pardon received before 1 October 1974)", "");
    L.push(`1. The petitioner, ${name}, states that the petitioner received an absolute pardon for the conviction identified below, and that the pardon was received before 1 October 1974. An absolute pardon is not a provisional pardon and not a certificate of employability; neither of those erases anything, and this petition is not for them.`, "");
    L.push("Date the absolute pardon was received:");
    L.push(DOTS(), "");
    L.push("2. The conviction for which the absolute pardon was received is:", "");
    L.push("Court in which the conviction was entered:");
    L.push(DOTS(), "");
    L.push("Docket number of the pardoned conviction:");
    L.push(DOTS(), "");
    L.push("Date of the pardoned conviction:");
    L.push(DOTS(), "");
    L.push("3. The petitioner therefore petitions the Superior Court, pursuant to C.G.S. Sec. 54-142a(d), to direct the erasure of the records of the conviction identified above.", "");
    L.push("4. No fee is payable with this petition: C.G.S. Sec. 54-142a(k) provides that no fee shall be charged in any court with respect to any petition under Sec. 54-142a.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner. The source review states no notarization requirement and no service requirement; ask the clerk whether either applies locally when you call about the caption.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("USE THIS PAGE ONLY IF you received the absolute pardon ON OR AFTER 1 October 1974. On that branch there is nothing to file: C.G.S. Sec. 54-142a(d) provides that such records shall be erased, without a petition.", "");
    L.push("WHAT ERASURE MEANS HERE. Connecticut law says erasure, and that is the only word this packet uses for the relief - it is the statute's own. The words other states use for record relief belong to other states' statutes, and using them in Connecticut invites the wrong questions.", "");
    L.push("STEP ONE - CONFIRM WHAT KIND OF PARDON YOU RECEIVED. Only an absolute pardon reaches erasure. A provisional pardon or a certificate of employability is not an absolute pardon and does not erase anything. If you are not certain which you received, ask the Connecticut Board of Pardons and Paroles for a copy of the pardon decision showing what was granted and the date it was granted.", "");
    L.push("STEP TWO - CONFIRM THE PARDON DATE. The date decides the branch. Received before 1 October 1974: the petition page of this packet applies instead of this one. Received on or after 1 October 1974: this page applies and there is nothing to file.", "");
    L.push("STEP THREE - CONFIRM THE ERASURE HAPPENED. Look the case up in the Connecticut Judicial Branch online case look-up. An erased case will not appear. If the case still appears after the absolute pardon, contact the clerk of the Superior Court and ask about the status of the erasure; take a copy of the pardon decision with you.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD:");
    L.push("- the pardon was provisional rather than absolute, which erases nothing;");
    L.push("- the pardon date cannot be established, so the branch cannot be selected;");
    L.push("- the court sets a hearing on the pre-1974 petition;");
    L.push("- you have an immigration matter.");
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
  const clerkBlank = (id, label, why) => ({
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
  if (componentId === "ct-pardon-erasure-primary-filing-1") {
    writes.push(
      write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
      write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("court_location", "Judicial district or court location in the caption of the petition",
        "the Superior Court location where this petition should be filed, and how the caption should read - no source this packet is built from states either, so call the clerk's office of the Superior Court and write what the clerk tells you",
        "the accepted caption and format for this petition are an open question the memo records as a release blocker; the clerk is the checkable authority the manifest names"),
      rbf("pardon_date", "Date the absolute pardon was received",
        "the date the absolute pardon was granted, checked against the pardon decision from the Connecticut Board of Pardons and Paroles - correct the packet if they disagree",
        "the pardon decision is a Board record the platform has not seen; the date also decides which branch of Sec. 54-142a(d) applies, and that selection is the participant's"),
      rbf("conviction_court", "Court in which the conviction was entered",
        "the court that entered the pardoned conviction, checked against the Judicial Branch case look-up - note that an erased case will not appear",
        "no conviction fact is held for a record the platform has not seen"),
      rbf("conviction_docket", "Docket number of the pardoned conviction",
        "the docket number of the pardoned conviction, checked against the Judicial Branch case look-up",
        "no case identifier is held for a record the platform has not seen"),
      rbf("conviction_date", "Date of the pardoned conviction",
        "the date of the pardoned conviction, checked against the Judicial Branch case look-up",
        "no conviction fact is held for a record the platform has not seen"),
      clerkBlank("docket_number", "Docket number of this petition, assigned by the clerk at filing",
        "the clerk assigns the number at filing"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
        "the petitioner signs the petition personally; the memo records no participant signature on the automatic branch and the petitioner's own signature on this one"),
      protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
        "a date written before the petition is signed would be false")
    );
  } else {
    writes.push(write("participant_name", "Person this guidance page is prepared for", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId]
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/CT.memo.json, track "
      + "ct-pardon-erasure) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, ct-pardon-erasure-set)",
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
  // Terminology guard, read from the output bytes rather than from intent:
  // Connecticut says erasure, and no participant-facing page of this packet may
  // use the other states' words for it.
  for (const [i, t] of textOfPage.entries()) {
    for (const banned of ["expungement", "expunge", "sealing", " sealed"]) {
      assert.ok(!t.toLowerCase().includes(banned),
        `packet page ${i + 1} uses "${banned.trim()}"; Connecticut says erasure and the memo forbids the other terms`);
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
  out.push("Connecticut law says **erasure**. Not the words other states use — using those invites the wrong questions, so this packet does not use them.", "");
  out.push("The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact belongs to a record the platform has not seen — the pardon decision and the court record — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Which page applies to you", "");
  out.push("The date you received the absolute pardon decides the branch, and only you can establish it:", "");
  out.push("| Page | When it is yours |", "| --- | --- |");
  out.push("| `ct-pardon-erasure-primary-filing-1` — the petition | the absolute pardon was received **before 1 October 1974**: erasure requires a petition to the Superior Court, which shall direct erasure |");
  out.push("| `ct-pardon-erasure-process-guidance-2` — the no-filing page | the absolute pardon was received **on or after 1 October 1974**: such records shall be erased without a petition, and there is nothing to file |");
  out.push("");
  out.push("Only an **absolute pardon** reaches erasure. A provisional pardon or a certificate of employability is not an absolute pardon and does not erase anything.", "");

  out.push("## Documents you must obtain", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| The absolute pardon decision, showing what was granted and the date it was granted | Connecticut Board of Pardons and Paroles — ask for a copy; the platform does not obtain, receive or inspect it |");
  out.push("| Judicial Branch case look-up printout for the pardoned conviction | Connecticut Judicial Branch online case look-up — note that an erased case will not appear |");
  out.push("");

  out.push("## The items you must supply (petition branch only)", "");
  out.push("Each is printed on the petition as a labelled dotted blank.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order (petition branch)", "");
  out.push("1. **Confirm the pardon type and date** against the Board of Pardons and Paroles decision.");
  out.push("2. **Call the clerk's office of the Superior Court** and ask how this petition should be captioned, where it should be filed, and whether any notarization or service applies locally — no source this packet is built from states any of those, and the clerk is the authority that can. Write the caption answer on the petition's dotted lines.");
  out.push("3. **Fill in every dotted blank** from the records listed above. Do not guess a date or a docket number.");
  out.push("4. **Sign and date the petition yourself.** The platform never signs for you and never dates a signature.");
  out.push("5. **File with the Superior Court.** **No fee is payable**: C.G.S. § 54-142a(k) provides that no fee shall be charged in any court with respect to any petition under § 54-142a, so a fee waiver does not arise.");
  out.push("");

  out.push("## What you do (automatic branch)", "");
  out.push("Nothing is filed. Confirm the erasure through the Judicial Branch case look-up — an erased case will not appear — and if the case still appears, contact the clerk of the Superior Court about the status of the erasure, taking a copy of the pardon decision.", "");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The docket number of the petition itself.** The clerk assigns it at filing.");
  out.push("- **The caption and court location.** The accepted caption and format for this petition are an open question this family carries to counsel review; until it is answered, the clerk's own instruction is the only safe source, so the petition tells you to call and write what the clerk says.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- the pardon was provisional rather than absolute, which erases nothing;");
  out.push("- the pardon date cannot be established, so the branch cannot be selected;");
  out.push("- the court sets a hearing on the pre-1974 petition;");
  out.push("- you have an immigration matter.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared petition and process page. There is no official Connecticut form for this petition — that is why it is composed — and it is not legal advice, it is not filed for you, and it does not decide whether the court will direct erasure.", "");
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the terminology the memo forbids",
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
      "that C.G.S. § 54-142a as recorded in the memo (reviewed 2026-07-30) is the current text of the statute",
      "the caption and format Superior Court clerks accept for the pre-1974 petition (an open release blocker)",
      "that any output is approved for participant delivery",
      "that any record is eligible for erasure under C.G.S. § 54-142a(d)"
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
      "The composed pages carry no election control. The branch fork — petition before 1 October 1974, automatic "
      + "erasure on or after — turns on the participant's own pardon date, which the memo says selects the branch "
      + "and which LegalEase does not choose. Each instrument prints its condition on its own face, and neither is "
      + "selected for the participant.",
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
      + "packet bytes, not from this builder's intent; every page was asserted free of the terminology the memo "
      + "forbids (Connecticut says erasure).",
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
          "The family binds no source bytes: sourceStatus is CUSTOM_PLEADING_FROM_CODIFIED_TEXT with an empty "
          + "boundSources list, and the memo records that no official form was located for the pre-1974 petition.",
        consequence:
          "The petition is composed from the family's committed legal-design records, each verified by SHA-256 and "
          + "content assertion on every build. Nothing not stated by those records is asserted: no caption format, "
          + "no notarization rule, no service rule, no figure."
      },
      {
        finding:
          "The memo records as a release blocker that the caption and format G.A. clerks accept for the pre-1974 "
          + "petition must be confirmed with a Connecticut practitioner, and the manifest's component note directs "
          + "that the packet tell the participant to call the clerk before filing.",
        consequence:
          "The petition's caption carries a labelled dotted blank for the court location with the clerk's office of "
          + "the Superior Court named as the checkable authority, and both the petition and the instructions direct "
          + "the participant to call the clerk before filing. The blocker travels to counsel review unresolved."
      },
      {
        finding:
          "The § 54-142a(d) branch fork turns on the pardon date, which the memo says selects the branch and which "
          + "LegalEase does not choose for the participant.",
        consequence:
          "Both instruments are rendered with their conditions printed on their own faces; neither is selected. The "
          + "fork is not route-determined."
      },
      {
        finding:
          "The source review states no notarization requirement and no service requirement, which is not the same "
          + "as stating that neither exists.",
        consequence:
          "Neither is asserted either way. The petition and instructions tell the participant to ask the Superior "
          + "Court clerk whether either applies locally when calling about the caption."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The memo's release blocker: no official form was located for the pre-1 October 1974 petition, so the caption and format that clerks accept must be confirmed with a Connecticut practitioner. The composed petition carries the caption as a participant-completed blank on the clerk's instruction — confirm that presentation, or supply the accepted format.",
      "The memo's release blocker: the Board of Pardons and Paroles governing statutes, C.G.S. §§ 54-130a to 54-130e, were not read in the source pass. Confirm nothing in them changes the design of this track.",
      "The source review states no notarization requirement and no service requirement for the petition. The packet asserts neither and directs the participant to ask the clerk. Confirm that treatment.",
      "The rendered petition asserts the § 54-142a(d) pre-1974 ground in the memo's recorded words and cites § 54-142a(k) for the no-fee statement. Confirm the composed instrument is sufficient where no official form exists."
    ],
    mattersForTheReviewersAttention: [
      "Terminology: every participant-facing page says erasure and the byte proof asserts the other terms absent, per the memo's scope restriction.",
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
