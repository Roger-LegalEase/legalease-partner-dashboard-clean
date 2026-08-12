// Full-corpus execution queue for nationwide packet delivery.
//
// Builds one machine-readable record per inventoried official form across all
// 50 states plus DC, by opening the real source PDF rather than trusting the
// field-map drafts. That distinction matters: the drafts misclassify. The Iowa
// PAULA form is recorded with 8 acroFields and actually has 35; the Mississippi
// petitions are labelled `scanned_pdf` and are flat text/vector with no raster
// content at all.
//
// Everything here is measured:
//   * structural class      - from the PDF's own catalog
//   * geographic scope      - from text that hardcodes a county, court,
//                             prosecutor or service office
//   * render strategy       - derived from the structural class
//   * source hash           - computed, then checked against the inventory
//
// Writes artifacts/packet-delivery/form-corpus.json.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { PDFDocument, PDFName } from "pdf-lib";

const root = process.cwd();
const SOURCE_ROOT = path.join(root, "private/Nationwide Record Clearing");
const DRAFT_DIR = path.join(root, "docs/record-clearing/field-map-drafts/all50");
const INVENTORY = path.join(root, "data/rcap-all50/nationwide-source-inventory.json");

// Text that ties a form to a place. A form containing any of these cannot be
// served statewide: it would name a county, court or prosecutor the
// participant has no connection to. This is the Mississippi Fourth Circuit
// defect expressed as a detector.
const LOCAL_MARKERS = [
  { id: "named_county_list", re: /\(([A-Z][a-z]+,\s*)+or\s+[A-Z][a-z]+\)\s*Count/ },
  { id: "named_grand_jury", re: /[A-Z][a-z]+\s+County\s+Grand\s+Jury/ },
  { id: "named_prosecutor_district", re: /District\s+Attorney'?s?\s+Office,\s*\w+\s+District/i },
  { id: "service_po_box", re: /P\.?\s?O\.?\s?Box\s+\d{2,}/i },
  { id: "service_city_state_zip", re: /\b[A-Z][a-z]+,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\s+\d{5}\b/ }
];

const inventory = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
const inventoryByPath = new Map();
for (const state of inventory.states) {
  for (const file of state.files) {
    inventoryByPath.set(file.relativePath, { ...file, code: state.code });
  }
}

const drafts = new Map();
if (fs.existsSync(DRAFT_DIR)) {
  for (const name of fs.readdirSync(DRAFT_DIR)) {
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, name), "utf8"));
    if (draft.sourcePdf) drafts.set(draft.sourcePdf, draft);
  }
}

const sourcePresent = fs.existsSync(SOURCE_ROOT);
const records = [];

for (const state of inventory.states) {
  const pdfs = state.files.filter((file) => file.extension === ".pdf");

  if (pdfs.length === 0) {
    records.push({
      jurisdiction: state.code,
      jurisdictionName: state.name,
      formId: null,
      sourcePath: null,
      sourceSha256: null,
      sourceState: "no_source_material",
      structuralClass: null,
      geographicScope: null,
      renderStrategy: "unsupported_pending_conversion",
      mappingState: "no_source",
      wiringState: "not_wired",
      visualReview: "not_started",
      counselReview: "not_started",
      packetReady: false,
      blocker: "No official source material has been ingested for this jurisdiction.",
      nextAction: "Acquire official record-clearing forms for this jurisdiction."
    });
    continue;
  }

  for (const file of pdfs) {
    const absolute = path.join(SOURCE_ROOT, file.relativePath);
    const draft = drafts.get(file.relativePath);
    const base = {
      jurisdiction: state.code,
      jurisdictionName: state.name,
      formId: slug(file.fileName),
      formName: file.fileName,
      sourcePath: `private/Nationwide Record Clearing/${file.relativePath}`,
      sourceSha256: file.sha256,
      draftClassification: draft?.classification ?? null,
      visualReview: draft?.lifecycle === "visual_review_pending" ? "pending" : "not_started",
      counselReview: "pending",
      packetReady: false
    };

    if (!sourcePresent || !fs.existsSync(absolute)) {
      records.push({
        ...base,
        sourceState: "source_absent",
        structuralClass: null,
        geographicScope: null,
        renderStrategy: "unsupported_pending_conversion",
        mappingState: "blocked_source_absent",
        wiringState: "not_wired",
        blocker: "Source PDF is not present in this environment.",
        nextAction: "Restore the nationwide source inventory, then re-run this builder."
      });
      continue;
    }

    let measured;
    try {
      measured = await measure(absolute);
    } catch (error) {
      records.push({
        ...base,
        sourceState: "unreadable",
        structuralClass: "unreadable",
        geographicScope: null,
        renderStrategy: "unsupported_pending_conversion",
        mappingState: "blocked_unreadable",
        wiringState: "not_wired",
        blocker: `Source could not be parsed: ${String(error?.message ?? error).slice(0, 120)}`,
        nextAction: "Repair or re-acquire this source document."
      });
      continue;
    }

    const hashMatches = measured.sha256 === file.sha256;
    const strategy = strategyFor(measured.structuralClass);

    records.push({
      ...base,
      sourceState: hashMatches ? "verified" : "hash_mismatch",
      sourceSha256: measured.sha256,
      inventorySha256: file.sha256,
      pageCount: measured.pageCount,
      acroFieldCount: measured.acroFieldCount,
      hasRasterPages: measured.hasRaster,
      structuralClass: measured.structuralClass,
      geographicScope: measured.scope,
      geographicMarkers: measured.markers,
      renderStrategy: strategy,
      mappingState: "unmapped",
      wiringState: "not_wired",
      blocker: blockerFor(measured, hashMatches),
      nextAction: nextActionFor(measured, strategy, hashMatches)
    });
  }
}

const byJurisdiction = new Map();
for (const record of records) {
  const bucket = byJurisdiction.get(record.jurisdiction) ?? [];
  bucket.push(record);
  byJurisdiction.set(record.jurisdiction, bucket);
}

const corpus = {
  schemaVersion: 1,
  sourceInventory: path.relative(root, INVENTORY),
  sourcePresent,
  jurisdictionCount: byJurisdiction.size,
  formCount: records.filter((r) => r.formId).length,
  totals: {
    byStructuralClass: tally(records, "structuralClass"),
    byRenderStrategy: tally(records, "renderStrategy"),
    byGeographicScope: tally(records, "geographicScope"),
    bySourceState: tally(records, "sourceState"),
    packetReady: records.filter((r) => r.packetReady).length
  },
  batches: {
    clean_acroform: records.filter((r) => r.structuralClass === "clean_acroform").length,
    dirty_acroform: records.filter((r) => r.structuralClass === "dirty_acroform").length,
    statewide_flat: records.filter(
      (r) => r.renderStrategy === "coordinate_overlay" && r.geographicScope === "statewide"
    ).length,
    local_restricted: records.filter(
      (r) => r.geographicScope && r.geographicScope !== "statewide"
    ).length,
    encrypted_or_xfa: records.filter((r) =>
      ["encrypted", "xfa"].includes(r.structuralClass)
    ).length,
    no_source: records.filter((r) => r.sourceState === "no_source_material").length
  },
  jurisdictions: [...byJurisdiction.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, forms]) => ({
      jurisdiction: code,
      jurisdictionName: forms[0].jurisdictionName,
      formCount: forms.filter((f) => f.formId).length,
      packetReadyForms: forms.filter((f) => f.packetReady).length,
      forms
    }))
};

const outDir = path.join(root, "artifacts", "packet-delivery");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "form-corpus.json");
fs.writeFileSync(outPath, `${JSON.stringify(corpus, null, 2)}\n`);

console.log("RCAP nationwide form corpus built.");
console.log(`1. ${corpus.jurisdictionCount} jurisdictions, ${corpus.formCount} official forms measured from source.`);
console.log(`2. Structural class: ${fmt(corpus.totals.byStructuralClass)}`);
console.log(`3. Render strategy: ${fmt(corpus.totals.byRenderStrategy)}`);
console.log(`4. Geographic scope: ${fmt(corpus.totals.byGeographicScope)}`);
console.log(`5. Source state: ${fmt(corpus.totals.bySourceState)}`);
console.log(`6. Batches: ${fmt(corpus.batches)}`);
console.log(`7. Packet-ready forms: ${corpus.totals.packetReady}.`);
console.log(`8. Written to ${path.relative(root, outPath)}`);

async function measure(absolute) {
  const bytes = fs.readFileSync(absolute);
  const latin = bytes.toString("latin1");
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

  const encrypted = /\/Encrypt\b/.test(latin);
  const xfa = /\/XFA\b/.test(latin);

  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (error) {
    if (encrypted) {
      return { sha256, structuralClass: "encrypted", pageCount: null, acroFieldCount: 0, hasRaster: null, scope: null, markers: [] };
    }
    throw error;
  }

  if (xfa) {
    return { sha256, structuralClass: "xfa", pageCount: doc.getPageCount(), acroFieldCount: 0, hasRaster: null, scope: null, markers: [] };
  }
  if (encrypted) {
    return { sha256, structuralClass: "encrypted", pageCount: doc.getPageCount(), acroFieldCount: 0, hasRaster: null, scope: null, markers: [] };
  }

  let acroFieldCount = 0;
  try {
    // Buttons are controls, not data: a save/print/clear button is not a
    // fillable field and must not make a form look supportable.
    acroFieldCount = doc
      .getForm()
      .getFields()
      .filter((field) => field.constructor.name !== "PDFButton").length;
  } catch {
    acroFieldCount = 0;
  }

  let hasRaster = false;
  for (let i = 0; i < doc.getPageCount(); i += 1) {
    const resources = doc.getPage(i).node.Resources();
    const xobjects = resources?.lookup?.(PDFName.of("XObject"));
    if (xobjects && xobjects.keys().length > 0) {
      hasRaster = true;
      break;
    }
  }

  let text = "";
  try {
    text = execFileSync("pdftotext", [absolute, "-"], { encoding: "utf8", maxBuffer: 2e7 });
  } catch {
    text = "";
  }

  const markers = LOCAL_MARKERS.filter((marker) => marker.re.test(text)).map((m) => m.id);
  const scope = text.trim().length === 0
    ? "unknown_no_text_layer"
    : markers.length > 0
      ? "locally_restricted"
      : "statewide";

  const structuralClass =
    acroFieldCount >= 5 ? "clean_acroform"
      : acroFieldCount > 0 ? "dirty_acroform"
        : hasRaster ? "scanned_pdf"
          : "flat_pdf";

  return { sha256, structuralClass, pageCount: doc.getPageCount(), acroFieldCount, hasRaster, scope, markers };
}

function strategyFor(structuralClass) {
  if (structuralClass === "clean_acroform" || structuralClass === "dirty_acroform") return "acroform_fill";
  if (structuralClass === "flat_pdf" || structuralClass === "scanned_pdf") return "coordinate_overlay";
  return "unsupported_pending_conversion";
}

function blockerFor(measured, hashMatches) {
  if (!hashMatches) return "Source hash does not match the inventory record.";
  if (measured.structuralClass === "encrypted") return "Source is encrypted and cannot be processed.";
  if (measured.structuralClass === "xfa") return "Source is XFA and cannot be processed by pdf-lib.";
  if (measured.scope === "locally_restricted") {
    return `Form hardcodes local venue or service details (${measured.markers.join(", ")}); it is not valid outside that area.`;
  }
  if (measured.scope === "unknown_no_text_layer") return "No extractable text layer; scope cannot be established without visual review.";
  return null;
}

function nextActionFor(measured, strategy, hashMatches) {
  if (!hashMatches) return "Re-acquire the source and reconcile the inventory hash.";
  if (strategy === "unsupported_pending_conversion") return "Remediate the source (decrypt or convert from XFA) before mapping.";
  if (measured.scope === "locally_restricted") return "Confirm the correct geographic scope, then map only within it.";
  if (strategy === "acroform_fill") return "Map participant inputs to the named AcroForm fields, then visually confirm.";
  return "Derive overlay coordinates from the text layer and visually confirm every field.";
}

function tally(records, key) {
  return records.reduce((counts, record) => {
    const value = record[key] ?? "none";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function fmt(object) {
  return Object.entries(object).map(([k, v]) => `${k}=${v}`).join(", ");
}

function slug(fileName) {
  return fileName
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}
