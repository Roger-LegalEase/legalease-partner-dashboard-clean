#!/usr/bin/env node
/**
 * The Indiana infraction non-disclosure family — `in_infraction_nondisclosure-set`.
 *
 *   node scripts/build-census-v1-in_infraction_nondisclosure-set.mjs [--check]
 *
 * One census-v1 family, strategy custom_pleading on its queue row — AND THE
 * PLEADING IS DELIBERATELY NOT DRAFTED. This is the load-bearing decision of
 * this build, and it comes from the family's own records, not from this
 * builder's preference:
 *
 *   [MEMO]       data/record-clearing/legal-design-intake/IN.memo.json,
 *                track in_infraction_nondisclosure (I.C. 34-28-5-15, reviewed
 *                2026-07-30). Unit stage-2 — the verified petition — carries
 *                available:false with the recorded reason: "No statewide form
 *                has been identified and county handling of the MC case-type
 *                assignment is unconfirmed, so the unit stays unavailable
 *                pending those release gates." Its scope restriction adds:
 *                "no form mapping is asserted."
 *   [MANIFEST]   data/record-clearing/legal-design-packet-set-manifests.json,
 *                packetSetId in_infraction_nondisclosure-set. The
 *                primary_filing component is CONDITIONAL, and its condition
 *                includes "once the form and MC case-type gates close" —
 *                which they have not.
 *   [DEPENDENCY] data/rcap-all50/composed-routes/indiana/in_infraction_nondisclosure/
 *                components/in_infraction_nondisclosure-primary-filing-2/dependency.json,
 *                the component's own terminalized record: drafted false,
 *                dependencyKind unresolved_form_question, with
 *                draftingProhibitedBecause quoting the registry, and the
 *                missing determination assigned to the source-acquisition
 *                lanes (lane-D/E), not to a packet builder.
 *
 * So this family is built as what its design makes available TODAY: the
 * stage-1 process-guidance instrument — the statute requires the court to act
 * on its own in the non-prosecution, dismissal, not-committed and vacatur
 * situations, so the participant first checks whether that happened — with
 * the stage-2 petition's absence stated on the paper, in the instructions,
 * and in approval-request.json, never papered over. AGENTS.md's build-first
 * model names this exactly: where a verified official form path is lacking,
 * produce a guidance packet fallback and mark the review status for
 * post-build QA.
 *
 * TERMINOLOGY: never say records are destroyed — in Indiana expungement means
 * records are sealed or restricted under § 35-38-9-1(k), and the byte proof
 * asserts "destroy" absent from every page.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES. The platform writes the
 * participant's own name. The stage-1 check needs case facts the platform has
 * not seen — the county, the cause number, how the matter ended and when,
 * whether prosecution was deferred, and the answer from the court's records
 * office about whether a non-disclosure order was already entered — so each
 * is a labelled worksheet blank declared REQUIRED_BEFORE_FILING and disclosed
 * with its checkable authority named (the clerk of the court where the
 * infraction was handled). Nothing is signed: stage 1 files nothing.
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

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "in_infraction_nondisclosure-set";
const OUT = "data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-in_infraction_nondisclosure-set.mjs";

const MEMO_PATH = "data/record-clearing/legal-design-intake/IN.memo.json";
const MANIFEST_PATH = "data/record-clearing/legal-design-packet-set-manifests.json";
const DEPENDENCY_PATH = "data/rcap-all50/composed-routes/indiana/in_infraction_nondisclosure/components/in_infraction_nondisclosure-primary-filing-2/dependency.json";
const TRACK_ID = "in_infraction_nondisclosure";

const ROUTE = Object.freeze({
  jurisdiction: "IN",
  routeKeys: [
    "obligation:unit:IN:in_infraction_nondisclosure:in_infraction_nondisclosure-stage-1",
    "obligation:unit:IN:in_infraction_nondisclosure:in_infraction_nondisclosure-stage-2"
  ],
  legalName: "Infraction Non-Disclosure under I.C. 34-28-5-15",
  routeName: "keeping an Indiana infraction off background checks under I.C. 34-28-5-15",
  statute: "I.C. 34-28-5-15"
});

/* Only the stage-1 guidance instrument is rendered. The stage-2 petition
 * component (in_infraction_nondisclosure-primary-filing-2) is conditional in
 * the manifest, its gates are open, and its own dependency record prohibits
 * drafting it — so it is ABSENT from this packet by design, and the absence
 * is disclosed rather than papered over. */
const COMPONENTS = [
  "in_infraction_nondisclosure-process-guidance-1"
];

const BLOCKED_COMPONENT = {
  componentId: "in_infraction_nondisclosure-primary-filing-2",
  unitId: "in_infraction_nondisclosure-stage-2",
  whyAbsent:
    "The manifest makes this component conditional on 'once the form and MC case-type gates close', and they have "
    + "not: the memo records the unit unavailable ('No statewide form has been identified and county handling of "
    + "the MC case-type assignment is unconfirmed'), and the component's own dependency record states drafted "
    + "false, dependencyKind unresolved_form_question, with the missing determination assigned to the "
    + "source-acquisition lanes. Drafting it here would override the family's own controlling records.",
  dependencyRecord: DEPENDENCY_PATH
};

const COMPONENT_CONDITIONS = {
  "in_infraction_nondisclosure-process-guidance-1":
    "Stage 1, always applicable: check whether the court already ordered non-disclosure before anything else."
};

const COMPOSED_TITLES = {
  "in_infraction_nondisclosure-process-guidance-1": "Checking Whether the Court Already Ordered Non-Disclosure of Your Infraction (I.C. 34-28-5-15)"
};

const RECORD_ANCHORS = {
  memo: [
    "I.C. 34-28-5-15",
    "in_infraction_nondisclosure-stage-1",
    "in_infraction_nondisclosure-stage-2",
    "No statewide form has been identified and county handling of the MC case-type assignment is unconfirmed, so the unit stays unavailable pending those release gates.",
    "This does not apply where prosecution was deferred.",
    "Never say records are destroyed.",
    "Service on the prosecuting attorney, who has thirty days to file a notice in opposition.",
    "30 days after judgment",
    "2 years after the conduct",
    "Not applicable. There is no fee.",
    "Clerk of the court where the infraction was handled"
  ],
  manifest: [
    "in_infraction_nondisclosure-process-guidance-1",
    "in_infraction_nondisclosure-primary-filing-2",
    "once the form and MC case-type gates close"
  ],
  dependency: [
    "unresolved_form_question",
    "No statewide form has been identified",
    "in_infraction_nondisclosure-primary-filing-2"
  ]
};

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield"
  }
};

/* ---- record grounding --------------------------------------------------------- */
function groundRecords() {
  const failures = [];
  const records = [];
  for (const [name, rel, anchors, locate] of [
    ["memo", MEMO_PATH, RECORD_ANCHORS.memo, (j) => (j.tracks ?? j.records ?? []).find?.((t) => t.trackId === TRACK_ID) ?? j[TRACK_ID]],
    ["manifest", MANIFEST_PATH, RECORD_ANCHORS.manifest, (j) => (j.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID)],
    ["dependency", DEPENDENCY_PATH, RECORD_ANCHORS.dependency, (j) => j]
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
  // The one assertion that would CHANGE this build if it flipped: if the
  // dependency record ever says the petition was drafted, this guidance-only
  // shape is stale and must not be rebuilt as-is.
  const dep = JSON.parse(fs.readFileSync(path.join(ROOT, DEPENDENCY_PATH), "utf8"));
  if (dep.drafted !== false) {
    failures.push({
      record: "dependency", path: DEPENDENCY_PATH,
      why: "the stage-2 dependency record no longer states drafted:false; the guidance-only packet shape is stale and this build must be revised, not rerun"
    });
  }
  return { records, failures };
}

/* ---- composed documents -------------------------------------------------------- */
const DOTS = (n = 84) => ".".repeat(n);

function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHY YOU CHECK FIRST. In the situations I.C. 34-28-5-15 covers automatically - the person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is later vacated - the statute requires the COURT to order the clerk and any case management system operator not to disclose the infraction information to non-criminal-justice organisations or individuals. The court is supposed to act on its own. So the first step is never to file anything: it is to find out whether the order was already entered, because where it was, there is nothing to file.", "");
  L.push("ONE EXCLUSION BEFORE ANYTHING ELSE. The automatic rule does not apply where prosecution was DEFERRED. A deferral, or a satisfied judgment, supports a verified petition no earlier than five years after satisfying the conditions - that is the five-year branch, not the automatic one.", "");
  L.push("THE WORKSHEET. Gather these from your own papers, then make the call described below. Nothing on these lines is written for you:", "");
  L.push("County where the infraction was handled:");
  L.push(DOTS(), "");
  L.push("Cause number, if one was assigned:");
  L.push(DOTS(), "");
  L.push("How the matter ended, and on what date (never prosecuted / dismissed / found not to have committed it / adjudication vacated / deferral completed / judgment satisfied):");
  L.push(DOTS(), "");
  L.push("Was prosecution deferred, answered from your own papers:");
  L.push(DOTS(), "");
  L.push("THE CALL. Ask the office of the clerk of the court where the infraction was handled whether the court entered an order under I.C. 34-28-5-15 in your cause. Write down the answer:", "");
  L.push("Answer from the records office of the court where the infraction was handled - was a non-disclosure order under I.C. 34-28-5-15 already entered in your cause:");
  L.push(DOTS(), "");
  L.push("IF THE ORDER WAS ALREADY ENTERED: there is nothing to file. The order runs to the clerk and any case management system operator, restricting disclosure to non-criminal-justice organisations and individuals. Note that in Indiana, record relief restricts access to the records; it does not remove them.", "");
  L.push("IF NO ORDER WAS ENTERED, OR YOUR SITUATION IS A DEFERRAL OR SATISFIED JUDGMENT: the statute provides a verified petition, with these recorded features - it is filed under the original cause number, or as an MC case type where none was assigned, in the court where the charges were brought or the trial was held; there is no fee; it is served on the prosecuting attorney, who has thirty days to file a notice in opposition; and the earliest filing dates are: found not to have committed it - 30 days after judgment; vacatur final or certified - 365 days; conduct not prosecuted - 2 years after the conduct; dismissal with no new action filed - 30 days after dismissal; deferral or judgment satisfied - 5 years.", "");
  L.push("WHY THE PETITION IS NOT IN THIS PACKET. Whether a statewide form exists for an I.C. 34-28-5-15 petition, and how counties handle the MC case-type assignment where no cause number was assigned, are open questions this family's own records carry as release gates - and those records direct that the petition stays undrafted until they close. A petition drafted around an unconfirmed county convention risks being rejected at the counter, which is worse than telling you the truth: the petition is not here yet. Ask the clerk of the court where the infraction was handled what they require for an I.C. 34-28-5-15 petition, or take this packet to a lawyer or legal-aid office to have the petition prepared.", "");
  L.push("WHEN TO STOP AND GET HELP INSTEAD:");
  L.push("- the prosecuting attorney files a notice in opposition;");
  L.push("- the court sets a hearing;");
  L.push("- prosecution was deferred and the five-year clock has not run;");
  L.push("- the county's MC case-type handling is unclear.");
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
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before anything is filed: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });

  const writes = [
    write("participant_name", "Person this worksheet is prepared for", "participant.full_legal_name")
  ];
  const refusals = [
    rbf("county", "County where the infraction was handled",
      "the Indiana county where the infraction was handled, from your own papers",
      "no case fact is held for a record the platform has not seen"),
    rbf("cause_number", "Cause number, if one was assigned",
      "the cause number if one was assigned, copied from your papers - if none was assigned, write none, because that decides the MC case-type question the petition branch turns on",
      "no case identifier is held for a record the platform has not seen"),
    rbf("outcome_and_date", "How the matter ended, and on what date",
      "how the infraction matter ended (never prosecuted, dismissed, found not to have committed it, adjudication vacated, deferral completed, or judgment satisfied) and the date it did - the earliest filing dates run from this",
      "no disposition fact is held for a record the platform has not seen"),
    rbf("deferral_answer", "Was prosecution deferred, answered from your own papers",
      "whether prosecution was deferred - the automatic rule does not apply where it was, and the five-year branch does",
      "the deferral answer routes between the automatic rule and the five-year branch, and only the participant's papers hold it"),
    rbf("order_answer", "Answer from the records office of the court where the infraction was handled - was a non-disclosure order under I.C. 34-28-5-15 already entered in your cause",
      "the answer you are given when you ask the office of the clerk of the court where the infraction was handled whether an order under I.C. 34-28-5-15 was entered in your cause - write it down, because where the order exists there is nothing to file",
      "whether the court already acted is a fact only that court's records hold")
  ];
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: ROUTE.routeKeys,
      conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId]
    },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/IN.memo.json, track "
      + "in_infraction_nondisclosure), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the stage-2 component's own dependency "
      + "record (drafted:false, unresolved_form_question)",
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
  // Terminology guard: never say records are destroyed — Indiana relief
  // restricts access; it does not destroy.
  for (const [i, t] of textOfPage.entries()) {
    assert.ok(!/destro/i.test(t),
      `packet page ${i + 1} says records are destroyed in some form; the memo forbids it — Indiana relief restricts, it does not destroy`);
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

function participantInstructions(maps, rbfItems) {
  const byDoc = new Map();
  for (const item of rbfItems) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push("In Indiana, record relief **restricts access** to records — under § 35-38-9-1(k) records are sealed or restricted, and the Office of Judicial Administration states plainly that court records are not deleted. Nothing in this packet says otherwise.", "");

  out.push("## What this packet is, honestly", "");
  out.push("It is the **stage-1 check**: the statute requires the court to order non-disclosure on its own where the person is not prosecuted, the charge is dismissed, the person is adjudged not to have committed the infraction, or an adjudication is vacated — so the first step is to find out whether that already happened, because where it did there is nothing to file.", "");
  out.push("**The stage-2 verified petition is deliberately not in this packet.** Whether a statewide form exists for an I.C. 34-28-5-15 petition, and how counties handle the MC case-type assignment where no cause number was assigned, are open questions this family's own records carry as release gates — and those records direct that the petition stays undrafted until they close. Where stage 1 shows no order was entered, ask the clerk of the court where the infraction was handled what they require for an I.C. 34-28-5-15 petition, or take this packet to a lawyer or legal-aid office.", "");

  out.push("## The worksheet items you must supply", "");
  out.push("Each is printed on the worksheet as a labelled dotted blank.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Fill in the worksheet** from your own papers. If prosecution was deferred, the automatic rule does not apply — the five-year deferral branch does.");
  out.push("2. **Call or visit the office of the clerk of the court where the infraction was handled** and ask whether the court entered an order under I.C. 34-28-5-15 in your cause. Write down the answer.");
  out.push("3. **If the order was entered**: nothing to file. You are done.");
  out.push("4. **If no order was entered, or yours is a deferral or satisfied judgment**: the statute provides a verified petition — no fee, filed under the original cause number or as an MC case type, served on the prosecuting attorney who has thirty days to oppose, with earliest filing dates that run from how and when your matter ended. That petition is not in this packet for the reasons above; ask the clerk what they require, or get it prepared by a lawyer or legal-aid office.");
  out.push("");

  out.push("## Timing, from the statute's recorded waiting periods", "");
  out.push("| How your matter ended | Earliest petition date |", "| --- | --- |");
  out.push("| Found not to have committed the infraction | 30 days after judgment |");
  out.push("| An order or decision vacating an adjudication becomes final or is certified | 365 days |");
  out.push("| Conduct not prosecuted | 2 years after the conduct |");
  out.push("| Dismissal with no new action filed | 30 days after dismissal |");
  out.push("| Deferral programme or judgment conditions satisfied | 5 years |");
  out.push("");

  out.push("## When to stop and get help instead", "");
  out.push("- the prosecuting attorney files a notice in opposition;");
  out.push("- the court sets a hearing;");
  out.push("- prosecution was deferred and the five-year clock has not run;");
  out.push("- the county's MC case-type handling is unclear.", "");

  out.push("## What this packet is not", "");
  out.push("It is not a petition, not legal advice, and it does not decide whether the court will order non-disclosure. One more recorded disclosure that belongs to Indiana record-relief cases generally: a relief case's file is public until the order is granted.", "");
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
      groundingRecords: records, components: COMPONENTS, blockedComponent: BLOCKED_COMPONENT,
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
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of any claim that records are destroyed",
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
      + "boundSources []) — so the build grounds on the family's committed legal-design records and the stage-2 "
      + "component's own dependency record, each verified by SHA-256 and by content assertion before composing",
    routeKeys: ROUTE.routeKeys,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    groundingRecords: records,
    documents: [],
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    componentDeliberatelyAbsent: BLOCKED_COMPONENT,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that I.C. 34-28-5-15 as recorded in the memo (reviewed 2026-07-30) is the current text of the statute",
      "whether a statewide form exists for the stage-2 petition (the open question that keeps it undrafted)",
      "how counties handle the MC case-type assignment where no cause number was assigned",
      "that any output is approved for participant delivery",
      "that any record qualifies for non-disclosure under I.C. 34-28-5-15"
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
    componentDeliberatelyAbsent: BLOCKED_COMPONENT,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: [],
    routeSelectionNote:
      "The stage-1/stage-2 sequence is not an election this packet makes: stage 1 always runs first (the statute "
      + "requires the court to act on its own, so the participant checks), and stage 2 turns on the answer plus "
      + "release gates that are open, so its instrument is deliberately absent and its absence disclosed.",
    requiredBeforeFilingCount: rbfItems.length,
    requiredBeforeFiling: rbfItems,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    componentDeliberatelyAbsent: BLOCKED_COMPONENT,
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
      + "packet bytes, not from this builder's intent; every page was asserted free of any claim that records are "
      + "destroyed, per the memo's terminology rule.",
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
          "The queue row's implementationStrategy is custom_pleading and its instrumentKinds names the stage-2 "
          + "verified petition, but the family's own records prohibit drafting it: the memo holds the stage-2 unit "
          + "unavailable pending the statewide-form and MC case-type gates, and the component's terminalized "
          + "dependency record states drafted:false with dependencyKind unresolved_form_question, assigning the "
          + "missing determination to the source-acquisition lanes.",
        consequence:
          "This build renders the stage-1 process-guidance instrument only, states the petition's absence and its "
          + "reason on the paper and in the instructions, and carries the gate to review. This is the guidance-"
          + "packet fallback AGENTS.md prescribes where a verified form path is lacking. The build refuses to rerun "
          + "unchanged if the dependency record ever stops saying drafted:false."
      },
      {
        finding:
          "Stage 1 is genuinely nothing-to-file: the statute requires the court to act on its own in the "
          + "non-prosecution, dismissal, not-committed and vacatur situations, and the memo's supporting document "
          + "is the clerk's confirmation of whether an order was entered.",
        consequence:
          "The instrument is a worksheet-and-call page: gather the case facts, ask the clerk of the court where the "
          + "infraction was handled whether an I.C. 34-28-5-15 order was entered in the cause, and write the answer "
          + "down. Where the order exists there is nothing to file, and the packet says so."
      },
      {
        finding:
          "The memo excludes deferred prosecutions from the automatic branch (they use the five-year deferral "
          + "branch), and records earliest filing dates per disposition.",
        consequence:
          "Both are stated verbatim on the guidance page and in the instructions' timing table; the deferral answer "
          + "is a worksheet blank because only the participant's papers hold it."
      },
      {
        finding:
          "The memo's terminology rule: never say records are destroyed — Indiana relief seals or restricts under "
          + "§ 35-38-9-1(k) — and the jurisdiction-wide disclosure that a relief case's file is public until the "
          + "order is granted.",
        consequence:
          "The byte proof asserts no page claims destruction, and the instructions carry the public-file disclosure."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "The stage-2 verified petition is deliberately absent: the release gates (whether a statewide form exists for an I.C. 34-28-5-15 petition; how counties handle the MC case-type assignment) are open and the component's dependency record prohibits drafting until they close. Close the gates — the recorded checkable source is the Coalition for Court Access expungement forms index at in.gov/courts — and the family then needs a second build that adds the petition.",
      "Confirm the guidance-only packet shape is acceptable for this family at state_built, with the petition's absence disclosed on the paper and in the instructions.",
      "Confirm the timing table (the statute's earliest filing dates per disposition) is stated correctly for participant use."
    ],
    mattersForTheReviewersAttention: [
      "The build refuses to rerun unchanged if the stage-2 dependency record stops saying drafted:false, so the guidance-only shape cannot silently outlive its justification.",
      "Terminology: the byte proof asserts no page claims records are destroyed.",
      "Every worksheet item is required-before-filing and disclosed; nothing is signed because stage 1 files nothing."
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
    componentDeliberatelyAbsent: BLOCKED_COMPONENT.componentId,
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
