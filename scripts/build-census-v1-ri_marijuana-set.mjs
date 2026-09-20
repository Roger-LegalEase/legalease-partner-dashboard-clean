#!/usr/bin/env node
/**
 * The Rhode Island marijuana automatic-expungement family — `ri_marijuana-set`.
 *
 *   node scripts/build-census-v1-ri_marijuana-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading, composed from CODIFIED TEXT:
 * the MASTER_QUEUE row binds no source bytes (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []). The ground is two
 * committed records, verified by SHA-256 and content assertion on every build:
 *
 *   [MEMO]     data/record-clearing/legal-design-intake/RI.memo.json,
 *              track ri_marijuana (R.I. Gen. Laws § 12-1.3-5, reviewed
 *              2026-08-01; statute read at source 2026-08-05)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              packetSetId ri_marijuana-set (five components)
 *
 * THIS IS A VERIFICATION TRACK FIRST, AND THE DESIGN INSISTS ON IT. Rhode
 * Island completed more than 23,000 marijuana possession expungements in June
 * 2023 — 3,015 in Superior Court, 9,952 in the Traffic Tribunal, 10,650 in
 * District Court — more than a year before the statutory 1 July 2024
 * deadline. A participant with an eligible record should be told it has
 * almost certainly already been expunged and asked to VERIFY from their own
 * BCI criminal history; the memo's rule is blunt: never sell a marijuana
 * expungement motion in Rhode Island where the record has cleared — the work
 * is done and the statute makes it free. The expedited written request is the
 * CONDITIONAL stage, reached only where the participant confirms from their
 * own BCI record that the automatic action did not reach the case, and
 * LegalEase never certifies that the automatic relief failed — the
 * confirmation is the participant's, from their own record.
 *
 * THE REQUEST IS NEUTRAL AND ITS CONTENTS ARE CONTROLLED, per the memo: the
 * addressee and caption for the court in which the marijuana case was heard,
 * the participant's identity, the case identifiers, a statement that the
 * request is made under the § 12-1.3-5 expedited procedure, the
 * participant-supplied qualifying facts (possession only, and the amount
 * where the record states one), the relief requested, and a signature
 * instruction. It does not certify that the automatic relief failed, decide
 * disputed eligibility, invent supporting evidence, seek agency agreement,
 * promise expedited treatment or argue the case.
 *
 * MONEY AND DELIVERY, FROM THE RECORD: no fee — eligible marijuana-related
 * fines, fees and costs are waived, and under § 12-1.3-5(e) anyone
 * incarcerated for misdemeanor or felony marijuana possession has all court
 * costs waived with respect to expungement. Under § 12-1.3-5(f) the COURT
 * sends the order to the Attorney General, the arresting agency and any
 * other agency known to hold records — the participant does not distribute
 * anything on this track, which is the opposite of the general Chapter
 * 12-1.3 rule and is stated so the wrong instruction cannot creep in.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes only the
 * participant's own identity and contact facts. Every case fact — which
 * court heard the case, the case or citation number, the year, how it ended,
 * the amount where the record states one — is a labelled dotted blank
 * declared REQUIRED_BEFORE_FILING and disclosed with its checkable authority
 * named (the Attorney General's Bureau of Criminal Identification for the
 * BCI record). The byte proof asserts that no page claims all marijuana
 * cases are automatically expunged — possession-only and decriminalized are
 * the conditions, and the memo forbids the overstatement.
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

const FAMILY_ID = "ri_marijuana-set";
const OUT = "data/rcap-all50/overlays/census-v1/ri/ri-marijuana-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ri_marijuana-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/RI.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "ri_marijuana";

const ROUTE = Object.freeze({
  jurisdiction: "RI",
  routeKeys: [
    "obligation:unit:RI:ri_marijuana:ri-marijuana-automatic-verification",
    "obligation:unit:RI:ri_marijuana:ri-marijuana-expedited-written-request"
  ],
  legalName: "Automatic Expungement of Marijuana Possession Records, R.I. Gen. Laws § 12-1.3-5",
  routeName: "checking that an old Rhode Island marijuana possession record has been cleared, and asking the court in writing where it has not, under R.I. Gen. Laws § 12-1.3-5",
  statute: "R.I. Gen. Laws § 12-1.3-5"
});

const COMPONENTS = [
  "ri_marijuana-status-verification-instructions-1",
  "ri_marijuana-legal-effect-explanation-2",
  "ri_marijuana-expedited-request-instructions-3",
  "ri_marijuana-primary-filing-4",
  "ri_marijuana-filing-instructions-5"
];

const COMPONENT_CONDITIONS = {
  "ri_marijuana-expedited-request-instructions-3":
    "Applies only where verification shows the record has not cleared.",
  "ri_marijuana-primary-filing-4":
    "Generated only where the verification stage establishes that the automatic § 12-1.3-5 expungement did not "
    + "reach the record, on the participant's own confirmation from their BCI criminal history. Never offered at "
    + "the outset, and never sold where the record has cleared.",
  "ri_marijuana-filing-instructions-5":
    "Accompanies the expedited written request."
};

const COMPOSED_TITLES = {
  "ri_marijuana-status-verification-instructions-1": "Step One, Always: Check Your BCI Record — the Expungement Was Probably Already Done",
  "ri_marijuana-legal-effect-explanation-2": "What Section 12-1.3-5 Does, Exactly",
  "ri_marijuana-expedited-request-instructions-3": "Only If the Record Did Not Clear: the Expedited Written Request Stage",
  "ri_marijuana-primary-filing-4": "Expedited Written Request for Expungement Under R.I. Gen. Laws Sec. 12-1.3-5",
  "ri_marijuana-filing-instructions-5": "Sending the Request, and What Happens After"
};

const RECORD_ANCHORS = {
  memo: [
    "R.I. Gen. Laws § 12-1.3-5",
    "ri-marijuana-automatic-verification",
    "ri-marijuana-expedited-written-request",
    "Never sell a marijuana expungement motion in Rhode Island",
    "the participant confirms from their own BCI record",
    "23,000 marijuana possession expungements",
    "Where the amount is not stated in the record the court presumes two ounces or less",
    "the court sends a copy of the order to the Attorney General, the arresting agency and any other agency known to hold records",
    "Rhode Island Department of Attorney General, Bureau of Criminal Identification",
    "That all marijuana cases are automatically expunged. Possession-only and decriminalized are the conditions.",
    "The statute identifies no remedy and no appeal route for the expedited procedure, so escalate rather than re-filing.",
    "None in the ordinary case. The expedited written request is signed by the participant."
  ],
  manifest: [
    "ri_marijuana-status-verification-instructions-1",
    "ri_marijuana-legal-effect-explanation-2",
    "ri_marijuana-expedited-request-instructions-3",
    "ri_marijuana-primary-filing-4",
    "ri_marijuana-filing-instructions-5"
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "42 Maple Street, Providence, RI 02903",
    "participant.phone": "401-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Woonsocket, Rhode Island 02895-2214",
    "participant.phone": "(401) 555-0199 ext. 4417",
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
  if (componentId === "ri_marijuana-status-verification-instructions-1") {
    L.push(`Prepared for: ${name}`, "");
    L.push("THE WORK IS PROBABLY ALREADY DONE. Section 12-1.3-5 entitles a person with a prior civil violation, misdemeanor conviction or felony conviction for POSSESSION ONLY of a marijuana offence since decriminalized to automatic expungement. Rhode Island completed the initial statewide effort in June 2023 - more than 23,000 records, being 3,015 in Superior Court, 9,952 in the Traffic Tribunal and 10,650 in District Court - over a year ahead of the statutory 1 July 2024 deadline. Nothing is filed and nothing is paid in the ordinary case.", "");
    L.push("SO THE FIRST STEP IS TO CHECK, NOT TO FILE. Request your criminal history record from the Rhode Island Department of Attorney General, Bureau of Criminal Identification (BCI). Then look for the marijuana case:", "");
    L.push("- IF THE CASE NO LONGER APPEARS: the expungement reached it. You are done, and nothing in this packet is for sending.");
    L.push("- IF THE CASE STILL APPEARS: go to the expedited-request pages of this packet. Only your own BCI record can establish this - this packet does not certify that the automatic relief failed, and neither does anyone else on your behalf.", "");
    L.push("THE CONDITIONS, STATED HONESTLY. Possession only, and since decriminalized, are the conditions. Possession with intent to distribute and distribution charges are not covered. Non-marijuana counts in the same case are not cleared by this section, though they do not block expungement of the eligible marijuana count. Federal, out-of-state, military and tribal records are not reached.", "");
    L.push("ONE DEFINITION THAT REACHES MORE PEOPLE THAN THE WORD SUGGESTS. The section's definition of conviction includes a plea of nolo contendere with a jail or suspended jail sentence, and a deferred sentence agreement with the Attorney General whose period of deferment has not been completed. If either is your situation, you are inside this section even if you would not call yourself convicted.");
  } else if (componentId === "ri_marijuana-legal-effect-explanation-2") {
    L.push(`Prepared for: ${name}`, "");
    L.push("THE AMOUNT. Where the record does not state how much marijuana was involved, the court presumes two ounces or less.", "");
    L.push("WHAT DOES NOT BLOCK THE RELIEF. Pending cases, prior convictions and violent convictions do not block it. Outstanding fines, fees and costs do not block it, and eligible marijuana-related amounts are waived.", "");
    L.push("MONEY. No fee. Eligible marijuana-related fines, fees and costs are waived, and under Sec. 12-1.3-5(e) anyone who was incarcerated for misdemeanor or felony marijuana possession has ALL court costs waived with respect to expungement.", "");
    L.push("OTHER COUNTS. Other, non-marijuana counts in the same case are unaffected: they neither block the marijuana count's expungement nor get cleared by it.", "");
    L.push("LATER SENTENCING. A marijuana expungement under this section is not treated as a prior conviction or civil adjudication for sentencing on a later offence.", "");
    L.push("WHO DELIVERS THE ORDER. Under Sec. 12-1.3-5(f) the COURT sends a copy of the expungement order to the Attorney General, the arresting agency and any other agency known to hold records. You do not deliver certified copies on this track - that duty belongs to other Rhode Island routes, not this one.", "");
    L.push("WHO MAY LEARN THE RECORDS EXIST. Under Sec. 12-1.3-5(m), custodians may not disclose the existence of the records on inquiry from any source, except from you yourself, a bar admission or character and fitness or disciplinary body, the commissioner of elementary and secondary education, or a law enforcement agency where the nature of a new charge would be affected.");
  } else if (componentId === "ri_marijuana-expedited-request-instructions-3") {
    L.push(`Prepared for: ${name}`, "");
    L.push("USE THESE PAGES ONLY IF your own BCI criminal history shows the marijuana case still appears. The statute makes an expedited procedure available on written request, so the request page of this packet is a signed letter to the court in which the marijuana case was heard.", "");
    L.push("BEFORE YOU SIGN IT, CONFIRM FROM YOUR OWN BCI RECORD that the case still appears and has not been expunged. The request states that confirmation as YOUR statement, from your record - not as anyone's certification on your behalf.", "");
    L.push("WHAT THE REQUEST DOES NOT DO. It does not decide disputed eligibility, invent supporting evidence, seek anyone's agreement, promise expedited treatment, or argue your case. If possession-only status or the amount is disputed, stop and get help instead of sending it.");
  } else if (componentId === "ri_marijuana-primary-filing-4") {
    L.push("(Send this request ONLY where your own BCI criminal history shows the marijuana case still appears. If it has cleared, the work is done and there is nothing to send.)", "");
    L.push("TO: the " + DOTS(44));
    L.push("(name the court in which the marijuana case was heard - Superior Court, District Court, or the Traffic Tribunal)", "");
    L.push(`FROM: ${name}`);
    L.push(`${address}`);
    L.push(`Telephone: ${phone}`);
    L.push(`Email: ${email}`, "");
    L.push("RE: EXPEDITED WRITTEN REQUEST FOR EXPUNGEMENT UNDER R.I. GEN. LAWS Sec. 12-1.3-5", "");
    L.push("To the court:", "");
    L.push(`1. I, ${name}, make this request under the expedited procedure R.I. Gen. Laws Sec. 12-1.3-5 makes available on written request.`, "");
    L.push("2. The marijuana case this request concerns:", "");
    L.push("Case number or citation number, as it appears on your records, if one appears:");
    L.push(DOTS(), "");
    L.push("Year of the case, approximately:");
    L.push(DOTS(), "");
    L.push("How the case ended - a civil violation, a conviction, a plea of nolo contendere with a jail or suspended jail sentence, or a deferred sentence agreement whose period of deferment has not been completed:");
    L.push(DOTS(), "");
    L.push("Amount of marijuana stated in the record, if the record states one (where it does not, Sec. 12-1.3-5 presumes two ounces or less):");
    L.push(DOTS(), "");
    L.push("3. The charge was possession of marijuana only. (If that is not true of your charge, do not send this request - possession with intent to distribute and distribution charges are outside Sec. 12-1.3-5.)", "");
    L.push("4. I have checked my criminal history record from the Bureau of Criminal Identification and the case identified above still appears on it. (Sign only if you have actually checked; your signature makes this your own statement from your own record.)", "");
    L.push("5. I therefore request that the record of the eligible marijuana possession matter identified above be expunged as Sec. 12-1.3-5 provides.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE " + DOTS(48), "");
    L.push(`PRINTED NAME: ${name}`, "");
    L.push("(You sign and date this request personally. Nothing on this page is signed or dated for you. No fee is enclosed and none is owed: eligible marijuana-related fines, fees and costs are waived under the section.)");
  } else {
    L.push(`Prepared for: ${name}`, "");
    L.push("HOW TO SEND IT. Sign and date the request yourself, keep a copy of everything, and send the request to the court in which the marijuana case was heard - the same court you named at the top of the request page.", "");
    L.push("NOTHING TO PAY. No fee accompanies the request: eligible marijuana-related fines, fees and costs are waived, and anyone who was incarcerated for marijuana possession has all court costs waived with respect to expungement under Sec. 12-1.3-5(e).", "");
    L.push("AFTER THE COURT ACTS. Under Sec. 12-1.3-5(f) the court sends a copy of any resulting order to the Attorney General, the arresting agency and any other agency known to hold records. You do not deliver certified copies on this track.", "");
    L.push("IF THE COURT DENIES THE REQUEST, OR DOES NOT ANSWER. Stop. The statute identifies no remedy and no appeal route for the expedited procedure, so escalate to a lawyer or a legal-aid office rather than re-filing.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD:");
    L.push("- the case had non-marijuana counts you also want cleared - this section reaches only the eligible marijuana count;");
    L.push("- the charge was possession with intent to distribute, or distribution;");
    L.push("- there is any dispute about whether the offence was possession only, or about the amount involved;");
    L.push("- the record is federal, out-of-state, military or tribal.");
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
  if (componentId === "ri_marijuana-primary-filing-4") {
    writes.push(
      write("requester_name", "Person making this request, named in the FROM block and printed under the signing line", "participant.full_legal_name"),
      write("mailing_address", "Mailing address in the FROM block, where the court replies", "participant.street_address"),
      write("telephone", "Telephone number in the FROM block", "participant.phone"),
      write("email", "Email address in the FROM block", "participant.email")
    );
    refusals.push(
      rbf("addressed_court", "The tribunal this request is addressed to, written at the top - the one in which the marijuana case was heard",
        "which tribunal heard the marijuana case - Superior Court, District Court, or the Traffic Tribunal - written at the top of the request; your BCI record or your old papers show it",
        "which tribunal heard the case is a case fact the platform has not seen"),
      rbf("case_or_citation_number", "Case number or citation number, as it appears on your records, if one appears",
        "the case number or citation number as it appears on your BCI record or court papers, if one appears - if none does, write none",
        "no case identifier is held for a record the platform has not seen"),
      rbf("case_year", "Year of the case, approximately",
        "roughly what year the case was",
        "no case fact is held for a record the platform has not seen"),
      rbf("disposition_form", "How the case ended - a civil violation, a conviction, a plea of nolo contendere with a jail or suspended jail sentence, or a deferred sentence agreement whose period of deferment has not been completed",
        "how the case ended, in the section's own categories - note that the section's definition of conviction includes a nolo plea with a jail or suspended jail sentence and an incomplete deferred sentence agreement",
        "no disposition fact is held for a record the platform has not seen"),
      rbf("stated_amount", "Amount of marijuana stated in the record, if the record states one",
        "the amount the record states, if it states one - where it does not, the section presumes two ounces or less, and you write nothing",
        "no case fact is held for a record the platform has not seen"),
      protectedBlank("requester_signature", "Signature on the request",
        "you sign the request personally, and only after actually checking your BCI record - your signature makes the request's statements your own"),
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
      "the legal-design intake record (data/record-clearing/legal-design-intake/RI.memo.json, track ri_marijuana) "
      + "and the packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json)",
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
  // The memo's forbidden overstatement, checked in the output bytes: never
  // say all marijuana cases are automatically expunged.
  for (const [i, t] of textOfPage.entries()) {
    assert.ok(!/all marijuana cases/i.test(t),
      `packet page ${i + 1} generalises about all marijuana cases; possession-only and decriminalized are the conditions and the memo forbids the overstatement`);
  }
  // And the verification-first rule: the request page itself must carry its
  // own condition, so it cannot circulate detached from the check.
  const requestText = String(textOfComponent.get("ri_marijuana-primary-filing-4") ?? "");
  assert.ok(requestText.includes("ONLY where your own BCI criminal history shows the marijuana case still appears"),
    "the request page no longer carries its own send-only-if-not-cleared condition");
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
  out.push("**Verify first, always.** Rhode Island completed more than 23,000 marijuana possession expungements in June 2023, over a year ahead of the statutory deadline, so an eligible record has almost certainly already been cleared. The first step is to pull your own BCI criminal history and look — never to file. The expedited written request in this packet is for the one situation where your own record shows the case still appears.", "");
  out.push("The conditions are **possession only** and **since decriminalized** — not every marijuana case. The section's definition of conviction also reaches a nolo plea with a jail or suspended jail sentence and an incomplete deferred sentence agreement with the Attorney General.", "");

  out.push("## The stages, in order", "");
  out.push("| Stage | What happens |", "| --- | --- |");
  out.push("| Verification (`ri_marijuana-status-verification-instructions-1`) | request your BCI record from the Attorney General's Bureau of Criminal Identification and check whether the marijuana case still appears; if it has cleared, you are done |");
  out.push("| Legal effect (`ri_marijuana-legal-effect-explanation-2`) | what the section does: the two-ounce presumption, what does not block relief, the waivers, the court's own delivery duty, and the non-disclosure rule |");
  out.push("| Expedited request (`ri_marijuana-expedited-request-instructions-3`, `ri_marijuana-primary-filing-4`, `ri_marijuana-filing-instructions-5`) | only where your BCI record shows the case did not clear: the signed written request to the court in which the case was heard |");
  out.push("");

  out.push("## Documents you must obtain", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your Rhode Island BCI criminal history record — the whole route turns on what it shows | Rhode Island Department of Attorney General, Bureau of Criminal Identification |");
  out.push("");

  out.push("## The items you must supply (request stage only)", "");
  out.push("Each is printed on the request as a labelled dotted blank.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order (request stage)", "");
  out.push("1. **Confirm from your own BCI record** that the marijuana case still appears. This packet does not certify that the automatic relief failed — the confirmation is yours, from your record.");
  out.push("2. **Fill in every dotted blank** from your BCI record and old papers. Do not guess.");
  out.push("3. **Sign and date the request yourself** — and only after actually checking, because your signature makes its statements your own.");
  out.push("4. **Send the request to the court in which the marijuana case was heard**, and keep a copy of everything. **Nothing is paid**: eligible marijuana-related fines, fees and costs are waived, and all court costs are waived for anyone who was incarcerated for marijuana possession.");
  out.push("5. **After the court acts, the court delivers the order** to the Attorney General, the arresting agency and any other agency known to hold records — not you.");
  out.push("6. **If the court denies the request or does not answer**: stop and escalate to a lawyer or legal-aid office. The statute identifies no remedy and no appeal route for the expedited procedure, so do not re-file.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and its date.** Yours alone, and only after the BCI check.");
  out.push("- **Every case fact.** Your BCI record and old papers hold them; the packet holds none of them.", "");

  out.push("## When to stop and get help instead", "");
  out.push("- the case had non-marijuana counts you also want cleared;");
  out.push("- the charge was possession with intent to distribute, or distribution;");
  out.push("- any dispute about possession-only status or the amount;");
  out.push("- the record is federal, out-of-state, military or tribal;");
  out.push("- the court denies or does not answer the expedited request.", "");

  out.push("## What this packet is not", "");
  out.push("Verification guidance plus a prepared written request. There is no official Rhode Island form for the request — that is why it is composed — and this is not legal advice, nothing is sent for you, and nothing here decides eligibility. Where the record has already cleared, nothing in this packet is for sending at all.", "");
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the forbidden all-marijuana-cases overstatement, and the request page asserted to carry its own send-only-if-not-cleared condition",
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
      "that R.I. Gen. Laws § 12-1.3-5 as recorded in the memo (statute read at source 2026-08-05) is the current text",
      "whether the § 12-1.3-5 expedited-request procedure remains open now that the initial statewide effort is complete (a recorded research note)",
      "what follows a denied or unanswered expedited request (a recorded release blocker; the packet says stop and escalate)",
      "that any output is approved for participant delivery",
      "that any record is eligible under § 12-1.3-5"
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
      "The two stages are sequential, not elective: verification always runs first, and the expedited request "
      + "applies only where the participant's own BCI record shows the case did not clear. That condition is "
      + "printed on the request's own face and repeated in the stage instructions, and the packet never selects "
      + "the request stage for the participant — their own record does.",
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
      + "packet bytes, not from this builder's intent; every page was asserted free of the forbidden "
      + "all-marijuana-cases overstatement, and the request page asserted to carry its own send-only-if-not-cleared "
      + "condition.",
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
          "The memo insists this is a verification track first: the initial statewide effort completed in June 2023 "
          + "(23,000+ records), and the rule is never to sell a marijuana expungement motion where the record has "
          + "cleared.",
        consequence:
          "Verification is the packet's first page and the request's own face carries the send-only-if-not-cleared "
          + "condition, byte-proof enforced, so the request cannot circulate detached from the check. The "
          + "participant's own BCI record — never this packet — establishes that the automatic action missed the "
          + "case, and the request states that as the participant's confirmation."
      },
      {
        finding:
          "The memo controls the request's contents: addressee and caption for the court that heard the case, "
          + "identity, case identifiers, the expedited-procedure statement, the participant-supplied qualifying "
          + "facts (possession only; the amount where the record states one), the relief, and a signature "
          + "instruction — and nothing more.",
        consequence:
          "The composed request carries exactly that list. It does not certify failure of the automatic relief, "
          + "decide disputed eligibility, invent evidence, seek agreement, promise expedited treatment, or argue."
      },
      {
        finding:
          "Recorded money and delivery rules: no fee (waivers under the section, including all court costs for "
          + "anyone incarcerated for marijuana possession under (e)); and under (f) the court, not the participant, "
          + "distributes the order.",
        consequence:
          "Both are stated on the legal-effect and filing-instruction pages, the request encloses nothing, and the "
          + "opposite (general Chapter 12-1.3) delivery instruction appears nowhere."
      },
      {
        finding:
          "The memo records as a release blocker that the statute names no remedy and no appeal route where an "
          + "expedited request is denied or unanswered.",
        consequence:
          "The filing-instructions page says stop and escalate rather than re-file, and the open question travels "
          + "to counsel in approval-request.json."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Where an expedited § 12-1.3-5 request is denied or unanswered, should the packet direct the participant to the general Chapter 12-1.3 motion route, to counsel, or elsewhere? (Recorded release blocker; the packet currently says stop and escalate.)",
      "Does the § 12-1.3-5 expedited-request procedure remain open now that the initial statewide effort is complete? (Recorded research note.)",
      "Does the P.L. 2022 ch. 234 art. 2 § 4 amendment, effective 28 June 2022, change anything in this track's design? (Recorded counsel question.)",
      "Confirm the expedited written request is a stage of the same § 12-1.3-5 mechanism rather than an independent remedy, and that the sequential presentation states it correctly. (Recorded counsel question.)"
    ],
    mattersForTheReviewersAttention: [
      "The request page carries its own send-only-if-not-cleared condition, byte-proof enforced; confirm that presentation.",
      "No page generalises about all marijuana cases (byte-proof enforced); possession-only and decriminalized are stated as the conditions throughout.",
      "The court's own (f) delivery duty is stated and the general Chapter 12-1.3 delivery instruction appears nowhere — the memo warns the general rule would be wrong here.",
      "Every case fact is required-before-filing and disclosed; the BCI unit is the named checkable authority."
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
