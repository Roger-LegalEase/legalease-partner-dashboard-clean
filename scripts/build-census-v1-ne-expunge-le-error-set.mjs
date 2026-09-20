#!/usr/bin/env node
/**
 * The Nebraska law-enforcement-error expungement family — `ne-expunge-le-error-set`.
 *
 *   node scripts/build-census-v1-ne-expunge-le-error-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading, composed from CODIFIED TEXT:
 * the MASTER_QUEUE row binds no source bytes (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []). The ground is three
 * committed records, verified by SHA-256 and content assertion on every build:
 *
 *   [MEMO]      data/record-clearing/legal-design-intake/NE.memo.json,
 *               track ne-expunge-le-error (Neb. Rev. Stat. § 29-3523(9),
 *               reviewed 2026-08-06). No official form exists: the memo records
 *               that an exhaustive search of the Master Forms List returns no
 *               form whose title contains Expunge.
 *   [MANIFEST]  data/record-clearing/legal-design-packet-set-manifests.json,
 *               packetSetId ne-expunge-le-error-set (three components)
 *   [DECISIONS] data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json,
 *               questions Q-023, Q-024, Q-025 for this track. Q-023 settles
 *               venue: the district court of the county in which the arrest
 *               occurred, implemented as a new civil petition in that court.
 *               Q-024 settles the respondent and service: the county attorney
 *               is the respondent and the petition must be served as a new
 *               civil action — a courtesy copy alone is not formal service.
 *               Q-025 (packet components beyond the petition) remains
 *               ARTIFACT_LEGAL_REVIEW_REQUIRED and is carried, not resolved.
 *
 * A RECORDED DISCREPANCY, STATED RATHER THAN SMOOTHED OVER: the MASTER_QUEUE
 * row's instrumentKinds names a "Nebraska § 29-3523(6) Error Petition", while
 * the memo, the counsel decisions and the statute citation they carry all say
 * § 29-3523(9). This build follows the memo and the counsel decisions and
 * records the queue-row discrepancy in build-findings.json.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes only the
 * participant's own identity and contact facts. Every case fact — the county
 * of arrest, the arrest date, the arresting agency, the participant's own
 * account of the agency's error, any case number — is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed in
 * participant-instructions.md, with the clerk of the district court and the
 * Nebraska State Patrol named as the checkable authorities. The petition never
 * asserts that the error occurred as a legal conclusion, never characterises
 * the evidence as clear and convincing, and never predicts the outcome — the
 * memo forbids all three. No signature, signature date, judicial, clerk or
 * court-date field is written.
 *
 * TERMINOLOGY: this is the only Nebraska adult route that EXPUNGES. Every
 * other Nebraska route seals or sets aside, and the memo directs that the
 * words must not be mixed; the byte proof asserts the other words absent.
 *
 * The open questions the records carry — the filing fee (not established),
 * the exact local service mechanics (vary by county), and the Q-025 component
 * list — travel with the family into review via approval-request.json.
 *
 * No raster in this container: rasterState is BUILT_RASTER_PENDING.
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

const FAMILY_ID = "ne-expunge-le-error-set";
const OUT = "data/rcap-all50/overlays/census-v1/ne/ne-expunge-le-error-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ne-expunge-le-error-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/NE.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const DECISIONS_PATH = "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";
const TRACK_ID = "ne-expunge-le-error";

const ROUTE = Object.freeze({
  jurisdiction: "NE",
  routeKeys: [
    "obligation:track-pathway:NE:ne-expunge-le-error:law-enforcement-error-expungement"
  ],
  legalName: "Petition to Expunge Criminal History Record Information After an Arrest Made in Error, Neb. Rev. Stat. § 29-3523(9)",
  routeName: "asking a Nebraska district court to expunge the record of an arrest made due to the error of a law enforcement agency, under Neb. Rev. Stat. § 29-3523(9)",
  statute: "Neb. Rev. Stat. § 29-3523(9)",
  feeWaiverStatute: "Neb. Rev. Stat. § 25-2301.01"
});

const COMPONENTS = [
  "ne-expunge-le-error-primary-filing-1",
  "ne-expunge-le-error-service-instructions-2",
  "ne-expunge-le-error-attorney-review-recommendation-3"
];

const COMPONENT_CONDITIONS = {};

const COMPOSED_TITLES = {
  "ne-expunge-le-error-primary-filing-1": "Petition to Expunge Criminal History Record Information (Neb. Rev. Stat. Sec. 29-3523(9))",
  "ne-expunge-le-error-service-instructions-2": "Serving the County Attorney",
  "ne-expunge-le-error-attorney-review-recommendation-3": "Why You Should Have an Attorney Look at This Before Filing"
};

/* Facts this build RELIES ON, verified against the committed records before
 * anything is composed — the codified-text analogue of reading a bound form's
 * face. The build refuses if any is no longer recorded. */
const RECORD_ANCHORS = {
  memo: [
    "Neb. Rev. Stat. § 29-3523(9)",
    "This is the only Nebraska adult mechanism that uses the word expunge",
    "clear and convincing",
    "LegalEase does not assert that the error occurred as a legal conclusion",
    "Not established. The district court civil filing fee for this petition was not confirmed.",
    "Available in principle under Neb. Rev. Stat. § 25-2301.01.",
    "The petitioner signs the petition.",
    "File the petition as a civil matter with the clerk of the district court.",
    "Nebraska State Patrol",
    "Once the respondent appears and contests, self-help ends."
  ],
  manifest: [
    "ne-expunge-le-error-primary-filing-1",
    "ne-expunge-le-error-service-instructions-2",
    "ne-expunge-le-error-attorney-review-recommendation-3"
  ],
  decisions: [
    "district court of the county in which the arrest occurred",
    "the petition must be served as a new civil action",
    "The candidate packet should contain more than the petition."
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Lincoln, NE 68508",
    "participant.phone": "402-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Scottsbluff, Nebraska 69361-2214",
    "participant.phone": "(308) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

/* ---- record grounding --------------------------------------------------------- */
function groundRecords() {
  const failures = [];
  const records = [];
  for (const [name, rel, anchors, locate] of [
    ["memo", MEMO_PATH, RECORD_ANCHORS.memo, (j) => (j.tracks ?? j.records ?? []).find?.((t) => t.trackId === TRACK_ID) ?? j[TRACK_ID]],
    ["manifest", MANIFEST_PATH, RECORD_ANCHORS.manifest, (j) => (j.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID)],
    ["decisions", DECISIONS_PATH, RECORD_ANCHORS.decisions, (j) => (j.questionDecisions ?? []).filter((d) => d.trackId === TRACK_ID)]
  ]) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push({ record: name, path: rel, why: "the committed record does not exist" }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const json = JSON.parse(bytes.toString("utf8"));
    const entry = locate(json);
    if (!entry || (Array.isArray(entry) && entry.length === 0)) {
      failures.push({ record: name, path: rel, why: `the record no longer carries ${TRACK_ID}` }); continue;
    }
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
  if (componentId === "ne-expunge-le-error-primary-filing-1") {
    L.push("IN THE DISTRICT COURT OF " + DOTS(40) + " COUNTY, NEBRASKA");
    L.push("(the county in which the arrest occurred - the recorded controlling decision for this route sets venue in that county's district court, and this petition is filed as a new civil matter there)", "");
    L.push(`${name},`);
    L.push("PETITIONER,", "");
    L.push("v.", "");
    L.push("THE COUNTY ATTORNEY OF THE COUNTY NAMED ABOVE,");
    L.push("RESPONDENT.", "");
    L.push("Case No. " + DOTS(40) + "  (the clerk assigns it at filing)", "");
    L.push("PETITION TO EXPUNGE CRIMINAL HISTORY RECORD INFORMATION");
    L.push("(NEB. REV. STAT. Sec. 29-3523(9) - ARREST DUE TO LAW ENFORCEMENT AGENCY ERROR)", "");
    L.push(`1. The petitioner, ${name}, files this petition under Neb. Rev. Stat. Sec. 29-3523(9), and states that the petitioner was arrested due to the error of a law enforcement agency.`, "");
    L.push("2. The petitioner further states:", "");
    L.push("Date of the arrest:");
    L.push(DOTS(), "");
    L.push("Agency that made the arrest:");
    L.push(DOTS(), "");
    L.push("Whether charges were ever filed, and the case number if they were:");
    L.push(DOTS(), "");
    L.push("3. In your own words, what the agency got wrong (state only what you know first-hand; nothing on these lines is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. Criminal history record information related to the arrest described above exists.", "");
    L.push("5. Under Neb. Rev. Stat. Sec. 29-3523(9), the court may order the criminal history record information related to the arrest expunged upon a showing, by clear and convincing evidence, that the arrest was due to error by the arresting law enforcement agency. This petition does not characterise the petitioner's evidence; whether that showing is met is for the court.", "");
    L.push("6. WHEREFORE, the petitioner requests that the Court order the criminal history record information related to the arrest described above expunged, pursuant to Neb. Rev. Stat. Sec. 29-3523(9).", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`, "");
    L.push("MONEY. The district court civil filing fee for this petition is not established by any source this packet is built from - ask the clerk of the district court of the county of arrest what fee applies before filing. A fee waiver is available in principle under Neb. Rev. Stat. Sec. 25-2301.01 if you cannot pay it.");
  } else if (componentId === "ne-expunge-le-error-service-instructions-2") {
    L.push(`For: ${name}`, "");
    L.push("WHO IS SERVED. The county attorney of the county of arrest is the respondent to this petition. That is the recorded controlling decision for this route.", "");
    L.push("HOW SERVICE MUST HAPPEN. The recorded controlling decision is that this petition opens a new civil case and must be SERVED as a new civil action, using the summons and service mechanism that applies to a political subdivision or public officer under Nebraska civil procedure. A courtesy copy alone is not a substitute for formal service when a new civil case has been opened.", "");
    L.push("WHAT THIS PAGE DOES NOT TELL YOU. The exact local mechanics - e-filing, how a summons is issued, and sheriff or other service practices - vary by county and are not established by any source this packet is built from. Before you file, ask the clerk of the district court of the county of arrest how a new civil action is served on the county attorney there, and use exactly that method.", "");
    L.push("AFTER SERVICE. The county attorney may respond. If the respondent appears and contests the petition, stop: self-help ends there, and the attorney-review page of this packet explains why.", "");
    L.push("This page is not proof of service and does not say that anything has been served.");
  } else {
    L.push(`For: ${name}`, "");
    L.push("THE BURDEN IS HIGH. Under Neb. Rev. Stat. Sec. 29-3523(9) the court may order the record expunged on clear and convincing evidence that the arrest was due to the error of the arresting agency. Clear and convincing is a demanding standard, the respondent is a public office, and the proceeding is adversarial.", "");
    L.push("THE RECOMMENDATION. Have an attorney review this petition and your evidence BEFORE you file it. That is a strong recommendation and not a gate: the packet is prepared either way, and filing without review is your choice.", "");
    L.push("STOP AND TAKE THIS PACKET TO A LAWYER OR LEGAL-AID OFFICE, INSTEAD OF FILING, IF ANY OF THESE IS TRUE:");
    L.push("- you cannot say, concretely, what the agency got wrong;");
    L.push("- you cannot identify the agency that arrested you;");
    L.push("- the arrest was lawful and simply did not lead to charges - that is a different route (Nebraska's automatic non-conviction treatment), not this petition;");
    L.push("- the real cause was someone else's use of your identity, which is a different problem this petition does not decide;");
    L.push("- the county attorney has appeared and contests the petition;");
    L.push("- the court sets an evidentiary hearing and you would be presenting evidence alone.", "");
    L.push("ONE WORD OF VOCABULARY. This is the only Nebraska adult route that EXPUNGES a record. Every other Nebraska route uses different relief with different words, and mixing them up in a filing invites the wrong questions.");
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
  if (componentId === "ne-expunge-le-error-primary-filing-1") {
    writes.push(
      write("petitioner_name", "Petitioner named in the caption of this petition", "participant.full_legal_name"),
      write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("venue_county", "County named in the caption - the county in which the arrest occurred",
        "the Nebraska county in which the arrest occurred - the recorded controlling decision sets venue in that county's district court, and the respondent is that county's county attorney",
        "the county of arrest is a case fact the participant holds; the platform has not seen the arrest record"),
      rbf("arrest_date", "Date of the arrest",
        "the date of the arrest, checked against your Nebraska State Patrol criminal history report - correct the packet if they disagree",
        "no arrest fact is held for a record the platform has not seen"),
      rbf("arresting_agency", "Agency that made the arrest",
        "the name of the agency that made the arrest - if you cannot identify it, stop and get help instead of filing",
        "an agency name is a case fact the participant can obtain, not a field the court owns"),
      rbf("charges_and_case_number", "Whether charges were ever filed, and the case number if they were",
        "whether charges were ever filed and, if they were, the case number, copied from the court record",
        "no case identifier is held for a record the platform has not seen"),
      rbf("error_statement", "In your own words, what the agency got wrong",
        "your own first-hand account of the agency's mistake - the petition asserts no legal conclusion about it, and nothing on these lines is written for you",
        "the platform prints the participant's own account and does not assert that the error occurred as a legal conclusion"),
      clerkBlank("case_number", "Case number of this petition, assigned by the clerk at filing",
        "the clerk assigns the number at filing"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the petition",
        "the petitioner signs the petition personally"),
      protectedBlank("signature_date", "Date beside the petitioner's signature on the petition",
        "a date written before the petition is signed would be false")
    );
  } else if (componentId === "ne-expunge-le-error-service-instructions-2") {
    writes.push(write("petitioner_name", "Petitioner named on this page", "participant.full_legal_name"));
  } else {
    writes.push(write("petitioner_name", "Petitioner named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/NE.memo.json, track "
      + "ne-expunge-le-error), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the recorded controlling decisions "
      + "for this track (data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json, Q-023/Q-024)",
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
  // Terminology guard: this is the only Nebraska adult route that expunges;
  // the memo directs that the other routes' words never be mixed into it.
  for (const [i, t] of textOfPage.entries()) {
    for (const banned of ["set aside", "set-aside", " seal", "sealing"]) {
      assert.ok(!t.toLowerCase().includes(banned),
        `packet page ${i + 1} uses "${banned.trim()}"; this route expunges, and the memo forbids mixing the other Nebraska relief words into it`);
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
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("There is no official Nebraska form for this petition — the memo this packet is built from records that an exhaustive search of the Master Forms List returns no form whose title contains Expunge — so the petition is a composed pleading grounded on the statute's recorded requirements and the recorded controlling decisions for this route.", "");
  out.push("This is the **only Nebraska adult route that expunges** a record. Every other Nebraska route uses different relief with different words; do not mix them up.", "");
  out.push("The platform filled in what it holds about you: your name, your mailing address, your telephone number and your email. Every case fact is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Where this is filed, and against whom", "");
  out.push("- **Venue**: the district court of the county in which the arrest occurred (the recorded controlling decision for this route). The petition opens a **new civil case** there.");
  out.push("- **Respondent**: the county attorney of that county (the recorded controlling decision). The service page explains how the respondent is served.", "");

  out.push("## Documents you must obtain", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Nebraska State Patrol criminal history report, showing the arrest still appears — check your answers against it and correct the packet if they disagree | Nebraska State Patrol, limited criminal history search through nebraska.gov |");
  out.push("| Anything the agency sent you about the mistake — a correction notice, agency correspondence, identification records — if you hold any | the arresting agency, or your own papers; the platform names these and does not collect, inspect or judge them |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on the petition as a labelled dotted blank. Fill every one.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Have an attorney review the petition and your evidence.** The burden is clear and convincing evidence and the respondent is a public office. This is a strong recommendation, not a gate.");
  out.push("2. **Gather the records** listed above.");
  out.push("3. **Fill in every dotted blank.** Do not guess a date, an agency name or a case number.");
  out.push("4. **Ask the clerk of the district court** of the county of arrest what filing fee applies — no source this packet is built from establishes it — and how a new civil action is served on the county attorney there. A fee waiver is available in principle under Neb. Rev. Stat. § 25-2301.01 if you cannot pay.");
  out.push("5. **Sign and date the petition yourself.**");
  out.push("6. **File with the clerk of the district court** of the county of arrest, as a new civil matter.");
  out.push("7. **Serve the county attorney formally**, in the manner the clerk directs. A courtesy copy alone is not formal service.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The case number of the petition itself.** The clerk assigns it at filing.");
  out.push("- **Every line of your account of the agency's error.** The petition prints your own first-hand account and asserts no legal conclusion about it.");
  out.push("- **The filing fee and the exact service mechanics.** Neither is established by the sources this packet is built from; the clerk of the district court of the county of arrest is the authority that can answer both.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- you cannot say, concretely, what the agency got wrong;");
  out.push("- you cannot identify the arresting agency;");
  out.push("- the arrest was lawful and simply did not lead to charges — that belongs to Nebraska's automatic non-conviction treatment, not this petition;");
  out.push("- the real cause was someone else's use of your identity;");
  out.push("- the county attorney appears and contests, or the court sets an evidentiary hearing.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared composed pleading with process pages. It is not an official form — none exists for this petition — and it is not legal advice, it is not filed for you, and it does not decide whether the court will order the record expunged.", "");
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the other Nebraska relief words the memo forbids mixing in",
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
      + "boundSources []) — so the build grounds on the family's committed legal-design and legal-decision records, "
      + "each verified by SHA-256 and by content assertion (every fact this build relies on must still be stated) "
      + "before composing",
    routeKeys: ROUTE.routeKeys,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    groundingRecords: records,
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that Neb. Rev. Stat. § 29-3523 as recorded in the memo (reviewed 2026-08-06) is the current text of the statute",
      "the district court civil filing fee for this petition (recorded as not established)",
      "the exact local mechanics of serving the county attorney (recorded as varying by county)",
      "that any output is approved for participant delivery",
      "that any record is eligible for expungement under Neb. Rev. Stat. § 29-3523(9)"
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
      "One route, one instrument: the petition states its own statutory ground (Neb. Rev. Stat. § 29-3523(9)) in "
      + "its title and body, which is where this family's route determination lives. No election control exists.",
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
      + "packet bytes, not from this builder's intent; every page was asserted free of the other Nebraska relief "
      + "words the memo forbids mixing into this route.",
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
          "The MASTER_QUEUE row's instrumentKinds names a 'Nebraska § 29-3523(6) Error Petition', while the memo, "
          + "the recorded controlling decisions (Q-023/Q-024/Q-025) and the statute citation they carry all say "
          + "§ 29-3523(9).",
        consequence:
          "This build follows the memo and the decision record — § 29-3523(9) — and records the queue-row "
          + "discrepancy here rather than smoothing it over. The queue text is a label, not a legal record; the "
          + "memo and the counsel decisions are the family's controlling records."
      },
      {
        finding:
          "Recorded controlling decision Q-023 settles venue: the district court of the county in which the arrest "
          + "occurred, implemented as a new civil petition in that court. Q-024 settles the respondent (the county "
          + "attorney) and the service posture (formal service as a new civil action; a courtesy copy is not "
          + "enough).",
        consequence:
          "The caption names that county's district court with the county as a participant-supplied blank, the "
          + "respondent line names the county attorney of the same county, and the service page states the formal "
          + "civil-service rule with the local mechanics delegated to the clerk of that district court by name, "
          + "because the decision record itself notes the local practices vary."
      },
      {
        finding:
          "Recorded decision Q-025 holds that the CANDIDATE packet should contain more than the petition — a civil "
          + "case-opening cover sheet, summons and praecipe, a proposed order and evidence exhibits among them — "
          + "with delivery ARTIFACT_LEGAL_REVIEW_REQUIRED. The packet-set manifest for this family names exactly "
          + "three components: the petition, the service instructions and the attorney-review recommendation.",
        consequence:
          "This build renders the manifest's three components and does not draft the additional instruments: a "
          + "proposed order would invent the court's operative terms, and no held record supplies a Nebraska "
          + "summons, praecipe or cover-sheet format. The Q-025 holding travels to reviewers unresolved in "
          + "approval-request.json, which is exactly what its ARTIFACT_LEGAL_REVIEW_REQUIRED delivery calls for."
      },
      {
        finding:
          "The memo forbids the petition to assert the error as a legal conclusion, to characterise the evidence as "
          + "clear and convincing, or to predict the outcome; and the memo's own unresolved question records that "
          + "the custom-pleading classification overrides the review's process-guidance classification, with the "
          + "override flagged for counsel confirmation.",
        consequence:
          "The petition states the statutory standard as a recital and expressly leaves whether it is met to the "
          + "court; the error narrative is the participant's own words on dotted lines. The classification override "
          + "is raised again in approval-request.json, noting that the recorded controlling decisions (RELEASE — "
          + "PACKET on Q-023) already treat the route as a packet."
      },
      {
        finding:
          "The district court civil filing fee is recorded as not established, and no source states the local "
          + "service mechanics.",
        consequence:
          "The petition and instructions delegate both to the clerk of the district court of the county of arrest "
          + "by name, and state the § 25-2301.01 fee-waiver availability exactly as recorded."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Q-025 (recorded decision, ARTIFACT_LEGAL_REVIEW_REQUIRED): the candidate packet should contain more than the petition — cover sheet, summons/praecipe, service instructions, proposed order, evidence exhibits, custodian list, confidentiality documents. This build renders the manifest's three components only. Determine which additional instruments the packet must carry and supply or approve their formats.",
      "The memo's counsel_classification_required question: confirm that a § 29-3523(9) petition may be generated as a custom pleading, given that the review's grounds for withholding (respondent, service, burden, adversarial posture) are post-filing conditions. The recorded Q-023 decision (RELEASE — PACKET, 'should be implemented as a new civil petition') already treats it as one.",
      "The MASTER_QUEUE row names § 29-3523(6) while every legal record for the family says § 29-3523(9). Confirm § 29-3523(9) and correct the queue label.",
      "The district court civil filing fee is not established. Confirm the fee, or confirm the packet's delegation of it to the clerk.",
      "Final administrative confirmation of local service mechanics on the county attorney (e-filing, summons issuance, sheriff practice), which the Q-024 decision itself leaves to local confirmation."
    ],
    mattersForTheReviewersAttention: [
      "The petition recites the clear-and-convincing standard and expressly leaves whether it is met to the court; confirm that presentation.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper.",
      "Terminology: this is the only Nebraska adult route that expunges; the byte proof asserts the other Nebraska relief words absent."
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
