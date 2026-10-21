#!/usr/bin/env node
/**
 * The Connecticut nolle-erasure packet family builder.
 *
 *   node scripts/build-census-v1-ct-nolle-auto-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family: ct-nolle-auto — erasure thirteen months after a
 * nolle under C.G.S. § 54-142a(c), with the § 54-142a(c)(2) motion branch
 * explained but NOT generated.
 *
 * WHY THIS PACKET GENERATES NO MOTION, READ FROM THE RECORDS
 *
 * The MASTER_QUEUE row binds nothing (sourceStatus
 * CUSTOM_PLEADING_FROM_CODIFIED_TEXT, boundSources []), and the family's own
 * legal-design record — data/record-clearing/legal-design-intake/CT.memo.json,
 * track ct-nolle-auto, reviewed as of 2026-07-30 — marks the
 * § 54-142a(c)(2) motion branch UNAVAILABLE with a legal_design_blocker: the
 * motion is potentially custom_pleading and not inherently guidance-only,
 * but no form was located and the current caption, venue, service and clerk
 * practice have not been approved, so no statewide custom pleading may be
 * enabled for it. The packet-set manifest accordingly names exactly ONE
 * component, process_guidance, and the memo's own component note says in
 * terms: "It does not generate that motion." This build honours both
 * records: it composes the guidance page — the thirteen-month erasure clock,
 * the confirmation steps, and an honest statement of the motion right whose
 * vehicle is not settled — and it composes no motion, no caption and no
 * filing instrument of any kind. The blocker is PINNED: if the memo's motion
 * branch later becomes available, this builder refuses to run, so the family
 * is rebuilt deliberately rather than silently outgrowing its record.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity facts and writes only
 * the participant's name onto the guidance page. The worksheet blanks — the
 * branch answer, the nolle date, the continuance date, whether any
 * prosecution or other disposition followed — are the participant's to fill
 * from the Judicial Branch case look-up, declared REQUIRED_BEFORE_FILING and
 * disclosed in participant-instructions.md. Nothing is signed: the automatic
 * branch has no participant filing and no signature, and no signature line
 * is printed anywhere.
 *
 * TERMINOLOGY, FROM THE COUNSEL LIMITATION: Connecticut says ERASURE — not
 * expungement, not sealing — and this packet says erasure throughout.
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

const FAMILY_ID = "ct-nolle-auto-set";
const OUT = "data/rcap-all50/overlays/census-v1/ct/ct-nolle-auto-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-ct-nolle-auto-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "CT",
  routeKeys: [
    "obligation:unit:CT:ct-nolle-auto:ct-nolle-auto-branch-automatic-erasure",
    "obligation:unit:CT:ct-nolle-auto:ct-nolle-auto-branch-motion-to-nolle"
  ],
  routeSelectionId: "ct-nolle-auto-composed-set",
  legalName: "Erasure After a Nolle, and Motion to Nolle a Continued Charge, C.G.S. § 54-142a(c)",
  routeName: "understanding when Connecticut records are erased after a nolle, under C.G.S. Sec. 54-142a(c)",
  statute: "C.G.S. § 54-142a(c), (c)(2), (g)(2) and (k)"
});

/* The one component, exactly as the packet-set manifest names it. */
const COMPONENTS = [
  "process_guidance"
];

const COMPOSED_TITLES = {
  process_guidance: "Erasure After a Nolle: The Thirteen-Month Clock, and the Motion This Packet Does Not Generate"
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/* ---- the codified records this build is grounded on ---------------------------- */
const MEMO_PATH = "data/record-clearing/legal-design-intake/CT.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";

function resolveCodifiedGrounds() {
  const failures = [];
  try {
    const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO_PATH), "utf8"));
    const memoTrack = (memo.tracks ?? []).find((t) => t.trackId === "ct-nolle-auto") ?? null;
    if (!memoTrack) failures.push({ record: MEMO_PATH, why: "no track ct-nolle-auto in the memo" });
    else {
      const motion = (memoTrack.units ?? []).find((u) => u.unitId === "ct-nolle-auto-branch-motion-to-nolle") ?? null;
      if (!motion) failures.push({ record: MEMO_PATH, why: "the memo no longer carries the motion branch unit; this builder's guidance is composed against it" });
      else if (motion.available !== false) {
        failures.push({
          record: MEMO_PATH,
          why: "the memo's motion branch is no longer marked unavailable. This build deliberately generates no "
            + "motion because the branch carries a legal_design_blocker (no settled filing vehicle); if the "
            + "branch has opened, the family must be rebuilt deliberately against the new record, not by this "
            + "guidance-only builder running unchanged"
        });
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
    "participant.full_legal_name": "Jordan Avery Reyes"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`For: ${name}`, "");
  L.push("WORDS FIRST. Connecticut says ERASURE - not expungement, not sealing - and that is the word this page uses throughout.", "");
  L.push("THE TWO BRANCHES. Which one is yours turns on one answer you give from your own records, and this packet does not choose for you:", "");
  L.push("Was the charge NOLLED, or is it still being CONTINUED at the prosecutor's request?");
  L.push(DOTS(), "");
  L.push("BRANCH ONE - THE CHARGE WAS NOLLED: AUTOMATIC ERASURE, NOTHING TO FILE.");
  L.push("Under C.G.S. Sec. 54-142a(c), where a charge has been nolled, the police and court records and the records of any state's attorney pertaining to the charge SHALL be erased once THIRTEEN MONTHS have elapsed since the nolle. There is no application, no petition and no fee - Sec. 54-142a(k) provides that no court fee is charged in any court with respect to any petition under Sec. 54-142a - and you file nothing.", "");
  L.push("Your worksheet for this branch, filled from the Judicial Branch online case look-up, never from memory:");
  L.push("Date the charge was nolled:");
  L.push(DOTS(), "");
  L.push("The date thirteen months after that date (your own computation from the line above):");
  L.push(DOTS(), "");
  L.push("HOW TO CONFIRM THE ERASURE HAPPENED. Look the case up on the Judicial Branch online case look-up after the thirteen months have run: an erased case will not appear. If the case still appears after the clock has plainly run, the record was not erased when it should have been - that is a different problem on a different route, and a lawyer or legal-aid office is where to take it. This packet does not obtain, receive or inspect your look-up.", "");
  L.push("OLDER NOLLES. Nolles entered before April 1, 1972 in the listed older courts are deemed erased by operation of law, and the arrested person or an heir may petition, in which case the records shall be erased.", "");
  L.push("BRANCH TWO - THE CHARGE IS STILL BEING CONTINUED: A MOTION RIGHT THIS PACKET DOES NOT GENERATE.");
  L.push("Under C.G.S. Sec. 54-142a(c)(2), where a charge was continued at the prosecutor's request and THIRTEEN MONTHS have passed with no prosecution or other disposition, the charge SHALL be nolled upon motion of the arrested person, and erasure then follows the nolle rules. That motion is an affirmative filing you are entitled to make - and this packet does not generate it, because no form was located and the current caption, venue, service and clerk practice for the motion have not been approved. A motion drafted against an unsettled vehicle could be refused at the counter or worse, so none is drafted here.", "");
  L.push("Your worksheet for this branch, from the case look-up:");
  L.push("Date the charge was continued at the prosecutor's request:");
  L.push(DOTS(), "");
  L.push("Any prosecution or other disposition since that date (write NONE if none):");
  L.push(DOTS(), "");
  L.push("If this branch is yours and the thirteen months have run, take this page and your look-up to the clerk of the Superior Court where the case is pending, or to a lawyer or legal-aid office: the clerk's office can say how that court takes a Sec. 54-142a(c)(2) motion today, and that is the question this packet cannot answer for you.", "");
  L.push("WHAT ERASURE MEANS. Sec. 54-142a(g)(2) states the legal effect of erasure. It is Connecticut's own remedy with Connecticut's own boundaries, and nothing on this page describes any effect on federal or out-of-state records.", "");
  L.push("WHEN TO STOP AND GET HELP");
  L.push("- you need the Sec. 54-142a(c)(2) motion - its filing vehicle is not settled, and the clerk or a lawyer is the path;");
  L.push("- the thirteen months have not yet elapsed on either branch;");
  L.push("- the record was not erased when it should have been;");
  L.push("- any immigration matter - any participant with an immigration matter goes to counsel.");
  L.push("", `Routes: ${ROUTE.routeKeys.join(" | ")}`);
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
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const writes = [
    write("participant_name", "Participant named on the guidance page", "participant.full_legal_name")
  ];
  const refusals = [
    rbf("branch_answer", "Whether the charge was nolled, or is still being continued at the prosecutor's request",
      "your own answer, from the Judicial Branch case look-up: nolled, or still continued at the prosecutor's request - it selects the branch, and this packet does not choose for you",
      "which branch applies turns on the participant's own record, and the memo directs that the platform does not choose one"),
    rbf("nolle_date", "Date the charge was nolled (branch one worksheet)",
      "the date of the nolle, from the Judicial Branch case look-up - an erased case will not appear",
      "no case fact is held for a record the platform has not seen"),
    rbf("thirteen_month_date", "The date thirteen months after the nolle (branch one worksheet)",
      "your own computation of the date thirteen months after the nolle date - the erasure clock runs from it",
      "the computation runs from a date on the participant's own record"),
    rbf("continuance_date", "Date the charge was continued at the prosecutor's request (branch two worksheet)",
      "the date of the continuance at the prosecutor's request, from the case look-up",
      "no case fact is held for a record the platform has not seen"),
    rbf("prosecution_since", "Any prosecution or other disposition since the continuance, or NONE (branch two worksheet)",
      "whether there has been any prosecution or other disposition since the continuance, or NONE - Sec. 54-142a(c)(2) turns on thirteen months with none",
      "what happened since the continuance lives on the participant's own record")
  ];
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKeys[0] },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/CT.memo.json, track "
      + "ct-nolle-auto, reviewed as of 2026-07-30) and the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json, packetSetId ct-nolle-auto-set)",
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
  // Proven from the bytes: the erasure terminology rule, the statement that no
  // motion is generated, and the absence of any signature line or caption -
  // this packet must not contain a filable instrument.
  const guidance = String(textOfComponent.get("process_guidance") ?? "").replace(/\s+/g, " ");
  assert.ok(guidance.includes("Connecticut says ERASURE - not expungement, not sealing"),
    `${fixtureName}: the erasure terminology rule is not readable from the guidance page's bytes`);
  assert.ok(guidance.includes("this packet does not generate it"),
    `${fixtureName}: the no-motion-generated statement is not readable from the guidance page's bytes`);
  const flat = textOfPage.join(" ").toUpperCase();
  assert.ok(!flat.includes("SIGNATURE"),
    `${fixtureName}: the guidance packet must carry no signature line; it contains no filable instrument`);
  assert.ok(!/\bMOTION TO NOLLE\b.*\bIT IS ORDERED\b/.test(flat) && !flat.includes("SUPERIOR COURT, JUDICIAL DISTRICT OF"),
    `${fixtureName}: the guidance packet must not carry a captioned pleading`);
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
  out.push(`# What this packet is, and what you fill in — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("Connecticut says **erasure** — not expungement, not sealing. Under C.G.S. § 54-142a(c), where a charge has been nolled, the records shall be erased once **thirteen months** have elapsed since the nolle: no application, no petition, no fee (§ 54-142a(k)), nothing to file. Separately, § 54-142a(c)(2) gives a person whose charge was continued at the prosecutor's request, with no prosecution or other disposition for thirteen months, the right to have the charge **nolled on their own motion** — and this packet **does not generate that motion**, because no form was located and the current caption, venue, service and clerk practice for it have not been approved. The one page in this packet is guidance: the two branches, the worksheets, and where to go when the motion branch is yours.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `process_guidance` | the two branches of § 54-142a(c), the thirteen-month worksheets, the confirmation steps, and the honest boundary around the ungenerated motion |");
  out.push("");

  out.push("## The record you check against", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Judicial Branch case look-up — confirms the nolle date or the continuance; an erased case will not appear; this packet never obtains, receives or inspects it | Connecticut Judicial Branch online case look-up |");
  out.push("");

  out.push("## The items you fill in on the worksheet", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the page | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do", "");
  out.push("1. **Answer the branch question** from the case look-up: nolled, or still continued at the prosecutor's request. The packet does not choose for you.");
  out.push("2. **Branch one (nolled)**: write the nolle date, compute the date thirteen months later, and after that date look the case up again — an erased case will not appear. Nothing is filed and nothing is paid.");
  out.push("3. **Branch two (still continued)**: write the continuance date and whether anything has happened since. If thirteen months have run with no prosecution or other disposition, the charge shall be nolled on your motion — and because the motion's filing vehicle is not settled, take the page and your look-up to the clerk of the Superior Court where the case is pending, or to a lawyer or legal-aid office.");
  out.push("");

  out.push("## When to stop and get help", "");
  out.push("- you need the § 54-142a(c)(2) motion — its filing vehicle is not settled, and this packet does not draft it;");
  out.push("- the thirteen months have not yet elapsed on either branch;");
  out.push("- the record was not erased when it should have been — a different problem on a different route;");
  out.push("- any immigration matter — any participant with an immigration matter goes to counsel.", "");

  out.push("## What this packet is not", "");
  out.push("This is a guidance page with worksheets. It contains no filable instrument, no caption and no signature line; it is not legal advice; and it does not decide which branch is yours or whether the thirteen months have run. Erasure is Connecticut's own remedy, and nothing here describes any effect on federal or out-of-state records.", "");
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
      proofMethod: "every written fact value, the erasure terminology rule and the no-motion-generated statement read back from the saved packet bytes; the absence of any signature line or captioned pleading asserted from the same bytes",
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
      + "legal-design intake track (whose motion-branch unavailability is pinned) and the packet-set manifest "
      + "(one process_guidance component).",
    routeKey: ROUTE.routeKeys[0], routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The § 54-142a(c)(2) motion branch carries the legal-design record's own legal_design_blocker: the motion "
      + "is potentially custom_pleading and not inherently guidance-only, but no form was located and the "
      + "current caption, venue, service and clerk practice have not been approved, so no statewide custom "
      + "pleading may be enabled for it. The manifest names one process_guidance component, and the memo's "
      + "component note says in terms that it does not generate that motion. This build composes the guidance "
      + "page and no filable instrument of any kind; the absence of any signature line or captioned pleading is "
      + "asserted from the output bytes on every build, and the motion-branch unavailability is pinned so an "
      + "opened branch forces a deliberate rebuild.",
    codifiedGrounds: [
      { record: MEMO_PATH, what: "track ct-nolle-auto: the two branches, the thirteen-month clocks, the motion-branch legal_design_blocker (available: false, pinned), the erasure terminology rule, § 54-142a(k), stop conditions" },
      { record: MANIFEST_PATH, what: `packetSetId ${FAMILY_ID}: the single process_guidance component and the required-before-filing items` }
    ],
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "the filing vehicle, caption, venue, service or clerk practice for a § 54-142a(c)(2) motion",
      "that any output is approved for participant delivery",
      "that any record has been or will be erased under § 54-142a(c)"
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
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The composed page carries no election control. The branch question — nolled, or still continued at the "
      + "prosecutor's request — is the participant's own answer from their own record, printed as a worksheet "
      + "blank; the memo directs that the platform does not choose a branch, and it does not. The motion branch "
      + "generates nothing because its filing vehicle is unapproved (legal_design_blocker), which is stated on "
      + "the paper rather than hidden.",
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
      "Every written fact value was read back from the extracted text of the saved packet bytes, not from this "
      + "builder's intent; the erasure terminology rule and the no-motion-generated statement were proven "
      + "present, and the absence of any signature line or captioned pleading was asserted from the same bytes, "
      + "because this packet must not contain a filable instrument.",
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
          "The § 54-142a(c)(2) motion branch is marked unavailable in the legal-design record with a "
          + "legal_design_blocker: the motion is potentially custom_pleading, but no form was located and the "
          + "current caption, venue, service and clerk practice have not been approved. The manifest names one "
          + "process_guidance component and the memo's component note says it does not generate that motion.",
        consequence:
          "The packet is guidance only: no motion, no caption, no signature line and no filable instrument is "
          + "composed, and their absence is asserted from the output bytes on every build. The motion right is "
          + "stated honestly on the paper — the charge shall be nolled on the arrested person's motion — with "
          + "the Superior Court clerk and counsel as the path, and the reason no motion is drafted stated in "
          + "terms. The branch's unavailability is pinned: if the memo opens it, this builder refuses and the "
          + "family is rebuilt deliberately."
      },
      {
        finding:
          "The automatic branch is a no-filing mechanism: records shall be erased thirteen months after the "
          + "nolle, with no fee under § 54-142a(k), and an erased case will not appear on the Judicial Branch "
          + "case look-up.",
        consequence:
          "The guidance page walks the clock as a worksheet (nolle date; the participant's own thirteen-month "
          + "computation), states the no-fee rule from the statute, and gives the look-up as the confirmation "
          + "step; a case still visible after the clock has plainly run is routed to help as a "
          + "different-route problem."
      },
      {
        finding:
          "The counsel limitations require 'erasure' — never expungement or sealing — and record the pre-1972 "
          + "deemed-erasure rule and the immigration handoff.",
        consequence:
          "The terminology rule is printed on the page and byte-proven on every build; the pre-April-1972 rule "
          + "and the immigration stop are stated in the record's own terms."
      },
      {
        finding:
          "Which branch applies turns on the participant's own record, and the memo directs that the platform "
          + "does not choose a branch.",
        consequence:
          "The branch question is a worksheet blank the participant answers from the case look-up, declared "
          + "REQUIRED_BEFORE_FILING and disclosed; nothing is selected for them."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The § 54-142a(c)(2) motion branch's filing vehicle, caption, venue, service and clerk practice — the record's own legal_design_blocker. Approving them is what would open the motion branch; until then this family generates no motion, and the guidance routes the participant to the Superior Court clerk or counsel.",
      "The guidance states the motion right in the statute's terms while declining to draft it, and says why on the paper. Confirm that presentation.",
      "The MASTER_QUEUE row's instrument list names the (c)(2) motion as a custom_pleading instrument while the manifest and memo carry a guidance-only component set with the motion branch unavailable. This build followed the manifest and memo; confirm the queue row's instrument vocabulary should be reconciled to them."
    ],
    mattersForTheReviewersAttention: [
      "source-receipt.json — the motion-branch unavailability is pinned by the builder, so an opened branch forces a deliberate rebuild rather than a silent drift.",
      "The packet's guidance-only character is byte-proven: no signature line and no captioned pleading exist in the output.",
      "The worksheet items are required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
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
