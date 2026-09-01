#!/usr/bin/env node
/**
 * The Boston Municipal Court consolidated multi-record sealing packet family builder.
 *
 *   node scripts/build-census-v1-ma-bmc-multi-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, one strategy: custom_pleading.
 *
 *   ma-bmc-multi   G.L. c. 276, § 100C with BMC Amended Standing Order
 *                  No. 1-09 and Commonwealth v. Pon — a consolidated petition
 *                  to seal three or more records from two or more BMC
 *                  divisions
 *
 * WHY THERE IS NO BOUND SOURCE, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing: sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE, forms [],
 * boundSources []. That is not an omission. The family's own legal-design
 * record — data/record-clearing/legal-design-intake/MA.memo.json, track
 * ma-bmc-multi, reviewed as of 2026-07-30 — records that the Standing Order
 * prescribes contents and procedure but no published BMC form for the
 * consolidated multi-record petition was established, and the adopted Batch 2
 * resolution directs that where no current BMC form is published, a
 * counsel-approved custom consolidated petition may be used, only for
 * qualifying BMC records. The node is a local_variant of the ordinary § 100C
 * judicial-sealing remedy with localFormOverride set — the consolidated
 * petition SUPPLEMENTS rather than replaces the statewide per-case form — and
 * the strategy is custom_pleading against the Standing Order's required
 * contents. This build composes exactly that: the consolidated petition and
 * its threshold-and-venue instructions, nothing more.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those: name, date of birth, mailing address, telephone, email.
 * Every case fact — each BMC case with its division, docket number and
 * disposition, the venue division, the good-cause narrative against the Pon
 * factors — belongs to records and judgments the platform does not hold, so
 * each is a labelled dotted blank, declared REQUIRED_BEFORE_FILING and
 * disclosed by its printed label in participant-instructions.md, with the
 * participant's own CORI from DCJIS and the division clerks named as the
 * checkable authorities. The good-cause narrative is participant-authored
 * against the Pon factors, as the memo's manual-completion record directs. No
 * signature and no signature date is ever written. The review identified no
 * fee and no waiver; that is stated as what the review identified, not as
 * "free", and the clerk of the venue division is named for anything the
 * review did not establish.
 *
 * TERMINOLOGY, FROM THE COUNSEL LIMITATION: sealing and expungement are never
 * used interchangeably in Massachusetts copy — sealing does not destroy the
 * record; expungement does. This packet is about SEALING only.
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

const FAMILY_ID = "ma-bmc-multi-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-bmc-multi-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-bmc-multi-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "MA",
  routeKey: "obligation:track-only:MA:ma-bmc-multi",
  routeSelectionId: "ma-bmc-multi-composed-set",
  legalName: "Consolidated Multi-Record Sealing Petition in the Boston Municipal Court Department",
  routeName: "sealing several dismissed Boston Municipal Court cases at once, under G.L. c. 276, Sec. 100C and BMC Amended Standing Order No. 1-09",
  statute: "G.L. c. 276, § 100C; BMC Amended Standing Order No. 1-09; Commonwealth v. Pon, 469 Mass. 296 (2014)"
});

/* The two components, in the packet-set manifest's own order. */
const COMPONENTS = [
  "primary_filing",
  "instructions"
];

const COMPOSED_TITLES = {
  primary_filing: "Consolidated Petition to Seal Multiple Criminal Records (BMC Amended Standing Order No. 1-09)",
  instructions: "Threshold, Venue and What Follows Filing"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/MA.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "ma-bmc-multi") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track ma-bmc-multi in the memo" });
    else {
      if (memoTrack.outputStrategy !== "custom_pleading") {
        failures.push({ record: MEMO_PATH, why: `the memo's outputStrategy is ${memoTrack.outputStrategy}, not custom_pleading; this builder may not proceed against a drifted strategy` });
      }
      if (memoTrack.localFormOverride !== true) {
        failures.push({ record: MEMO_PATH, why: "the memo no longer sets localFormOverride; the supplements-not-replaces posture this build prints would be drifted" });
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
    "participant.street_address": "77 Meridian Street, East Boston, MA 02128",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Commonwealth Harbourside Crossing Avenue, Apartment 14B, Dorchester, Massachusetts 02124-2214",
    "participant.phone": "(617) 555-0199 ext. 4417",
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
    L.push("USE THIS CONSOLIDATED PETITION ONLY IF you are asking to seal THREE OR MORE criminal records from TWO OR MORE divisions of the Boston Municipal Court Department. Below that threshold, the ordinary judicial sealing route applies, with the statewide form filed once per case. This petition SUPPLEMENTS the statewide per-case form in the BMC; it does not replace it.", "");
    L.push("COMMONWEALTH OF MASSACHUSETTS");
    L.push("BOSTON MUNICIPAL COURT DEPARTMENT");
    L.push(DOTS(44) + " DIVISION");
    L.push("(THE DIVISION THE STANDING ORDER'S VENUE RULE IDENTIFIES - the division in whose territorial jurisdiction you live or, if you no longer live in BMC territory, the division your most recent eligible record is from; the instructions page walks the rule)", "");
    L.push(`IN THE MATTER OF THE PETITION OF ${name.toUpperCase()} TO SEAL MULTIPLE CRIMINAL RECORDS`, "");
    L.push("CONSOLIDATED PETITION TO SEAL MULTIPLE CRIMINAL RECORDS UNDER G.L. c. 276, Sec. 100C AND BMC AMENDED STANDING ORDER No. 1-09", "");
    L.push(`1. The petitioner, ${name}, petitions under G.L. c. 276, Sec. 100C and Boston Municipal Court Department Amended Standing Order No. 1-09 to seal the criminal records listed below, each of which is a Boston Municipal Court Department record that ended in a dismissal, a nolle prosequi, a finding of no probable cause, or a not-guilty finding.`, "");
    L.push("2. The records to be sealed - every one listed with its BMC division, its docket number, and how it ended, copied from the petitioner's own CORI and court paperwork (three or more records from two or more divisions are required; continue on an attached sheet if needed):", "");
    L.push("Record 1 - division, docket number, disposition:");
    L.push(DOTS(), "");
    L.push("Record 2 - division, docket number, disposition:");
    L.push(DOTS(), "");
    L.push("Record 3 - division, docket number, disposition:");
    L.push(DOTS(), "");
    L.push("Further records, if any - division, docket number, disposition for each:");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("3. Good cause exists to seal the listed records under the standard of Commonwealth v. Pon, 469 Mass. 296 (2014). The petitioner's own statement of the specific disadvantages these records have caused, and of what the petitioner has done since the cases ended, follows (these lines are yours alone, written against the questions the instructions page sets out; nothing on them is written for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. The petitioner understands that the judge may request additional information or documents about the listed cases from the Clerk-Magistrate or the Probation Department, and that a preliminary hearing, public notice and a final hearing follow under the Standing Order.", "");
    L.push("5. The petitioner asks that each record listed above be sealed under G.L. c. 276, Sec. 100C.", "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF PETITIONER " + DOTS(38), "");
    L.push("(The petitioner signs and dates this petition personally. Nothing on this page is signed or dated for the petitioner.)", "");
    L.push(`PRINTED NAME: ${name}`);
    L.push(`DATE OF BIRTH: ${dob}`);
    L.push(`MAILING ADDRESS: ${address}`);
    L.push(`TELEPHONE: ${phone}`);
    L.push(`EMAIL: ${email}`);
  } else {
    L.push(`For: ${name}`, "");
    L.push("WORDS FIRST. In Massachusetts, SEALING and EXPUNGEMENT are different remedies and are never interchangeable: sealing does not destroy the record; expungement does. This packet is about sealing only.", "");
    L.push("THE THRESHOLD. This consolidated route exists only for THREE OR MORE criminal records from TWO OR MORE divisions of the Boston Municipal Court Department, and only for BMC records - it does not reach District Court, Juvenile Court or Superior Court records. Below the threshold, or for non-BMC records, the ordinary judicial sealing route applies, with the statewide form filed once per case. Count your qualifying records against your own CORI before anything is filed.", "");
    L.push("WHAT QUALIFIES. Records that ended in a dismissal, a nolle prosequi, a finding of no probable cause, or a not-guilty finding, with no waiting period - the same as the ordinary judicial sealing route.", "");
    L.push("THE VENUE RULE. The Standing Order keys venue to residence: file in the BMC division in whose territorial jurisdiction you live. If you no longer live in BMC territory, file in the division your most recent eligible record is from. The instructions on the petition's caption line follow this rule.", "");
    L.push("SUPPLEMENTS, NOT REPLACES. In the BMC, the consolidated petition supplements rather than replaces the statewide per-case sealing form. Ask the clerk of the venue division how the division wants the statewide form presented alongside this petition, and whether the division uses any form of its own for the consolidated procedure - whether the BMC publishes one is an open question this packet does not decide.", "");
    L.push("YOUR CORI FIRST. Request your own CORI from the Massachusetts Department of Criminal Justice Information Services before completing the petition. Every record you list - division, docket number, disposition - is copied from it and from your court paperwork, never from memory. This packet never collects, inspects or authenticates your CORI.", "");
    L.push("THE GOOD-CAUSE NARRATIVE. Commonwealth v. Pon sets the standard, and the narrative is yours to write. Answer, in your own words, on the petition's dotted lines:");
    L.push("- What specific problems have these records caused you - in work, housing, licensing or elsewhere?");
    L.push("- What have you done since the cases ended?", "");
    L.push("WHAT FOLLOWS FILING. Under the Standing Order: a preliminary hearing, public notice, and a final hearing. The judge may request additional information or documents about the listed cases from the Clerk-Magistrate or the Probation Department. A hearing is where self-help stops - if one is set, or the judge asks for more, take the papers to a lawyer or a court service center rather than answering alone.", "");
    L.push("FEES. The controlling review identified no filing fee and no waiver for this route. This packet asserts neither; the clerk of the venue division can say whether anything is charged.", "");
    L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING");
    L.push("- the three-record, two-division threshold is not met - the ordinary route with one form per case is yours instead;");
    L.push("- any record is outside the Boston Municipal Court Department;");
    L.push("- the judge requests additional information about the listed cases;");
    L.push("- a hearing is set.");
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
  if (componentId === "primary_filing") {
    writes.push(
      write("petitioner_name", "Petitioner named in the title and paragraph 1 of the consolidated petition", "participant.full_legal_name"),
      write("date_of_birth", "Petitioner's date of birth in the contact block at the foot of the petition", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the petitioner in the contact block at the foot of the petition", "participant.street_address"),
      write("telephone", "Telephone number of the petitioner in the contact block at the foot of the petition", "participant.phone"),
      write("email", "Email address of the petitioner in the contact block at the foot of the petition", "participant.email")
    );
    refusals.push(
      rbf("venue_division", "The BMC division named in the caption of the petition",
        "the division the Standing Order's venue rule identifies - where you live if you live in BMC territory, otherwise the division your most recent eligible record is from; the clerk of that division can confirm it",
        "venue turns on where the participant lives and where their records sit, neither of which the platform holds"),
      rbf("record_1", "Record 1 - division, docket number and disposition, in paragraph 2 of the petition",
        "the first record's BMC division, docket number, and how the case ended, copied from your own CORI and court paperwork",
        "no case fact is held for records the platform has not seen"),
      rbf("record_2", "Record 2 - division, docket number and disposition, in paragraph 2 of the petition",
        "the second record's BMC division, docket number, and how the case ended, from the same records",
        "no case fact is held for records the platform has not seen"),
      rbf("record_3", "Record 3 - division, docket number and disposition, in paragraph 2 of the petition",
        "the third record's BMC division, docket number, and how the case ended - three records from two divisions are the threshold of this route",
        "no case fact is held for records the platform has not seen"),
      rbf("further_records", "Further records, if any - division, docket number and disposition for each, in paragraph 2 of the petition",
        "every further qualifying BMC record, one per line, or leave blank if the three above are all",
        "no case fact is held for records the platform has not seen"),
      rbf("good_cause_narrative", "The petitioner's own good-cause statement in paragraph 3 of the petition",
        "your own words, against the Pon-standard questions on the instructions page: the specific problems these records have caused you, and what you have done since the cases ended",
        "the memo's manual-completion record makes the good-cause narrative participant-authored through structured prompts against the Pon factors"),
      protectedBlank("petitioner_signature", "Signature of the petitioner on the consolidated petition",
        "the petitioner signs the petition personally"),
      protectedBlank("signature_date", "Date beside the petitioner's signature on the consolidated petition",
        "a date written before the petition is signed would be false")
    );
  } else {
    writes.push(write("participant_name", "Participant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/MA.memo.json, track "
      + "ma-bmc-multi, reviewed as of 2026-07-30) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId ma-bmc-multi-set)",
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
  // bytes: the sealing-is-not-expungement rule and the supplements-not-replaces
  // posture.
  const instructionsPage = String(textOfComponent.get("instructions") ?? "").replace(/\s+/g, " ");
  assert.ok(instructionsPage.includes("sealing does not destroy the record; expungement does"),
    `${fixtureName}: the sealing-versus-expungement rule is not readable from the instructions page's bytes`);
  const petitionPage = String(textOfComponent.get("primary_filing") ?? "").replace(/\s+/g, " ");
  assert.ok(petitionPage.includes("SUPPLEMENTS the statewide per-case form"),
    `${fixtureName}: the supplements-not-replaces statement is not readable from the petition's bytes`);
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
  out.push("In Massachusetts, **sealing** and **expungement** are different remedies and are never interchangeable — sealing does not destroy the record; expungement does. This packet is about sealing only. The Boston Municipal Court Department permits a single consolidated petition to seal **three or more** criminal records from **two or more** BMC divisions, under Amended Standing Order No. 1-09 and the Commonwealth v. Pon standard. No published BMC form for the consolidated petition was established, so the petition in this packet is a composed pleading drafted against the Standing Order's required contents — and in the BMC it **supplements rather than replaces** the statewide per-case sealing form.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email. Every case fact belongs to records the platform has not seen — your own CORI from DCJIS and your court paperwork — so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  out.push("## Use this packet only if", "");
  out.push("You are sealing **three or more** BMC records from **two or more** BMC divisions, each of which ended in a dismissal, a nolle prosequi, a finding of no probable cause, or a not-guilty finding (no waiting period applies). Below that threshold, or for any record outside the Boston Municipal Court Department, the ordinary judicial sealing route applies with one statewide form per case.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | the composed consolidated petition under § 100C and Standing Order 1-09 |");
  out.push("| `instructions` | the threshold, the venue rule, the supplements-not-replaces posture, and what follows filing |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your own CORI — every record you list is copied from it and your court paperwork; this packet never collects, inspects or authenticates it | Massachusetts Department of Criminal Justice Information Services |");
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one before you file.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Get your own CORI** from DCJIS and count your qualifying BMC records against it.");
  out.push("2. **Check the threshold**: three or more records, two or more BMC divisions, every one a qualifying disposition. If not met, stop — the ordinary route with one form per case is yours.");
  out.push("3. **Work out the venue division**: where you live if you live in BMC territory; otherwise the division of your most recent eligible record. The clerk of that division can confirm it.");
  out.push("4. **Fill in every dotted blank**, listing each record's division, docket number and disposition from your CORI and court paperwork.");
  out.push("5. **Write the good-cause narrative in your own words**, against the Pon-standard questions on the instructions page: what specific problems the records have caused you, and what you have done since the cases ended.");
  out.push("6. **Sign and date the petition yourself.**");
  out.push("7. **Ask the clerk of the venue division** how the division wants the statewide per-case form presented alongside this petition, whether the division uses any form of its own for the consolidated procedure, and whether anything is charged — the controlling review identified no fee, and this packet asserts none.");
  out.push("8. **File in the venue division.** A preliminary hearing, public notice and a final hearing follow under the Standing Order, and the judge may request additional information from the Clerk-Magistrate or the Probation Department.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and the date beside it.** The petition is your own.");
  out.push("- **The good-cause narrative.** It is participant-authored against the Pon factors; the packet prompts, and writes none of it.", "");

  out.push("## When to stop and get help instead of filing", "");
  out.push("- the three-record, two-division threshold is not met;");
  out.push("- any record is outside the Boston Municipal Court Department;");
  out.push("- the judge requests additional information about the listed cases;");
  out.push("- a hearing is set.", "");

  out.push("## What this packet is not", "");
  out.push("This is a prepared consolidated pleading with its instructions. It is not an official BMC form — whether the BMC publishes one for this procedure is an open question this packet does not decide — and it is not legal advice, it is not filed for you, and it does not decide whether the court will seal any record. Sealing does not destroy the record; expungement does, and this packet is not an expungement.", "");
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
      proofMethod: "every written fact value, the sealing-versus-expungement rule and the supplements-not-replaces statement read back from the extracted text of the component's own pages in the saved packet bytes",
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
      + "legal-design intake track (including its localFormOverride flag) and the packet-set manifest.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "BMC Amended Standing Order No. 1-09 prescribes the consolidated procedure's contents but no published BMC "
      + "form for the consolidated multi-record petition was established; the adopted Batch 2 resolution directs "
      + "that where no current BMC form is published, a counsel-approved custom consolidated petition may be "
      + "used, only for qualifying BMC records, and that the consolidated petition supplements rather than "
      + "replaces the statewide per-case form. The composed petition is drafted against the Standing Order's "
      + "required contents and the Pon standard. No form was substituted and none was invented.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track ma-bmc-multi: the Standing Order procedure, the three-record two-division threshold, the venue rule, the counsel limitations, the open form question" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the two-component set and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "whether the Boston Municipal Court publishes a dedicated form for the consolidated multi-record petition",
      "that any output is approved for participant delivery",
      "that any record qualifies for sealing under G.L. c. 276, § 100C"
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
      "The composed pages carry no election control. The route's gate — three or more records from two or more "
      + "BMC divisions, every one a qualifying disposition — is printed on the petition's own face and walked on "
      + "the instructions page, and the venue rule (residence division, or the most-recent-record division for a "
      + "participant outside BMC territory) is stated with the clerk named to confirm. Nothing is selected for "
      + "the participant.",
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
      + "packet bytes, not from this builder's intent; the sealing-versus-expungement rule and the "
      + "supplements-not-replaces statement were proven present the same way.",
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
          "The BMC consolidated multi-record procedure is a local implementation of the ordinary § 100C "
          + "judicial-sealing remedy under Amended Standing Order No. 1-09, available only for three or more "
          + "records from two or more BMC divisions, and no published BMC form for it was established.",
        consequence:
          "The petition is a composed pleading drafted against the Standing Order's required contents and the "
          + "Pon standard, with the threshold printed on its own face, and the packet exists as a local variant "
          + "that never double-counts the underlying relief. Below the threshold the instructions route to the "
          + "ordinary per-case route rather than adapting this instrument."
      },
      {
        finding:
          "The adopted Batch 2 resolution directs that the consolidated petition supplements rather than "
          + "replaces the statewide per-case form in the BMC, and that a counsel-approved custom consolidated "
          + "petition may be used only for qualifying BMC records.",
        consequence:
          "The supplements-not-replaces statement is printed on the petition's face and byte-proven on every "
          + "build; the instructions direct the participant to ask the venue division's clerk how the statewide "
          + "form is presented alongside it, and the counsel-approval posture travels into review — nothing here "
          + "asserts approval."
      },
      {
        finding:
          "The counsel limitation forbids using sealing and expungement interchangeably in Massachusetts copy: "
          + "sealing does not destroy the record; expungement does.",
        consequence:
          "The rule is printed on the instructions page and byte-proven on every build, and the packet describes "
          + "itself as a sealing instrument throughout."
      },
      {
        finding:
          "The good-cause narrative rests on the Pon factors and the participant's own life, and the memo's "
          + "manual-completion record makes it participant-authored through structured prompts.",
        consequence:
          "Paragraph 3 is dotted lines the participant writes, with the Pon-standard questions stated on the "
          + "instructions page; the platform prompts and writes none of the narrative."
      },
      {
        finding:
          "The review identified no filing fee and no waiver, and hearings (preliminary, public notice, final) "
          + "with possible judicial requests for more information are the recorded post-filing process.",
        consequence:
          "The fee position is stated as what the review identified rather than as 'free', with the venue "
          + "division's clerk named for the actual answer; a set hearing or a judicial information request is a "
          + "printed stop condition, because the record classifies hearings as post-generation handoffs."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Whether the Boston Municipal Court publishes a dedicated form for the consolidated multi-record petition — the record's own release blocker on correct_form. If one exists, it governs (localFormOverride) and this composed petition becomes the covering instrument or is withdrawn.",
      "The Batch 2 resolution permits 'a counsel-approved custom consolidated petition'. This composed petition is the candidate for that approval; nothing here asserts it. Approve, amend or reject the instrument.",
      "The petition's paragraph 2 lists records in a three-plus-continuation layout. Confirm the layout satisfies the Standing Order's required contents.",
      "The review identified no filing fee; the packet asserts none and delegates to the venue division's clerk. Confirm the treatment."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — no binary source is bound because no published BMC form was established; confirm the codified-grounds posture is legible to reviewers.",
      "The sealing-versus-expungement rule and the supplements-not-replaces statement are byte-proven on every build; confirm the placement.",
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
