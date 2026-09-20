/*
 * VF01: read an AcroForm-filled family's artifacts back through pdf-lib and
 * compare what the paper carries against what the field map decided.
 *
 *   node data/rcap-grade-a/packet-factory-24h/vf01/tools/acroform-readback.mjs <familyDirectory>
 *
 * Families that fill live widgets leave no page-content ink, so the word-box
 * battery sees nothing to measure. This reads the widget values instead, on the
 * blank source and on each artifact, and reports the difference.
 */
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const DIR = process.argv[2];
const ML = process.env.MASTER_LIBRARY_SOURCE_DIR;
const j = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const receipt = j(`${DIR}/source-receipt.json`);
const fmap = j(`${DIR}/production-field-map.json`);
const rendered = j(`${DIR}/reports/rendered-artifacts.json`);

const valuesOf = async (file) => {
  const pdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const m = new Map();
  for (const f of pdf.getForm().getFields()) {
    let v = null;
    try {
      if (typeof f.getText === "function") v = f.getText();
      else if (typeof f.isChecked === "function") v = f.isChecked() ? "[X]" : "";
      else if (typeof f.getSelected === "function") v = (f.getSelected() ?? []).join(",");
    } catch { v = "<unreadable>"; }
    m.set(f.getName(), { value: v ?? "", type: f.constructor.name, widgets: f.acroField.getWidgets().length });
  }
  return { pdf, values: m };
};

const srcPath = path.join(ML, receipt.documents[0].pathInArchive);
const src = await valuesOf(srcPath);
console.log(`SOURCE ${receipt.documents[0].documentId}: ${src.pdf.getPageCount()} pages, ${src.values.size} fields`);
const nonEmptySource = [...src.values].filter(([, v]) => String(v.value).trim() !== "").map(([k]) => k);
console.log("  fields already carrying a value in the blank source:", nonEmptySource.length, nonEmptySource.slice(0, 8));

const fields = fmap.documents[0].fields ?? fmap.documents[0];
const decision = new Map(fields.map((f) => [f.field, f]));
const written = fields.filter((f) => f.decision === "write").map((f) => f.field);
const refused = fields.filter((f) => f.decision !== "write").map((f) => f.field);
console.log(`FIELD MAP: ${fields.length} fields, ${written.length} write, ${refused.length} refuse`);
const inMapNotInPdf = fields.map((f) => f.field).filter((n) => !src.values.has(n));
const inPdfNotInMap = [...src.values.keys()].filter((n) => !decision.has(n));
console.log("  in map not in source:", inMapNotInPdf, "| in source not in map:", inPdfNotInMap);

for (const art of rendered.artifacts ?? rendered.pdfs ?? []) {
  const a = await valuesOf(art.file);
  const filled = [...a.values].filter(([k, v]) => String(v.value).trim() !== "" && !nonEmptySource.includes(k)).map(([k, v]) => [k, String(v.value)]);
  const filledNames = filled.map(([k]) => k);
  console.log(`\n=== ${art.fixture} ${a.pdf.getPageCount()} pages, ${a.values.size} fields`);
  console.log("  fields carrying a value:", filled.length, "(builder reports", art.fieldsWritten, ")");
  console.log("  carrying a value but REFUSED by the map:", filledNames.filter((n) => refused.includes(n)));
  console.log("  declared write but EMPTY on the paper:", written.filter((n) => !filledNames.includes(n)));
  for (const [k, v] of filled) console.log(`    ${k} = ${JSON.stringify(v.slice(0, 90))}`);
}
