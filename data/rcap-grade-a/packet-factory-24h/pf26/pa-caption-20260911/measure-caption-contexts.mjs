#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import * as fixed from "../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../../..");
const BASE = "19e0df5789e91ed8569e5ac5779f37c0f369063d";
const CENSUS_PATH =
  "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill/field-census.census-v1.json";
const SOURCE_ROOT = process.env.MASTER_LIBRARY_SOURCE_DIR;
if (!SOURCE_ROOT) throw new Error("MASTER_LIBRARY_SOURCE_DIR is required");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const docs = [
  ["PA-RCRIM-P-490-PETITION", "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-490-PETITION__pa-r-crim-p-490-petition__REV-2009-03__EN.pdf"],
  ["PA-RCRIM-P-490-ORDER", "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-490-ORDER__pa-r-crim-p-490-blank-expungement-order__REV-2006-03__EN.pdf"],
  ["PA-RCRIM-P-790-PETITION", "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-790-PETITION__pa-r-crim-p-790-petition__REV-2009-03__EN.pdf"],
  ["PA-RCRIM-P-790-ORDER", "STATES/PA/02_PACKET_FORMS/PA__FORM__PA-RCRIM-P-790-ORDER__pa-r-crim-p-790-blank-expungement-order__REV-2021-07__EN.pdf"],
];

let faultySource = execFileSync("git", ["show",
  `${BASE}:scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs`], { cwd: ROOT, encoding: "utf8" });
faultySource = faultySource.replace('from "./rcap-standard-14-metrics.mjs";',
  `from "${pathToFileURL(path.join(ROOT, "scripts/rcap-official-forms/rcap-standard-14-metrics.mjs")).href}";`);
faultySource = faultySource.replace("createRequire(import.meta.url)",
  `createRequire("${pathToFileURL(path.join(ROOT, "scripts/rcap-official-forms/base-snapshot.mjs")).href}")`);
const faulty = await import(`data:text/javascript;base64,${Buffer.from(faultySource).toString("base64")}`);

async function contextsFor(module, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const pageByWidget = new Map();
  pages.forEach((page, index) => {
    for (const ref of page.node.Annots()?.asArray?.() ?? []) {
      const annotation = pdf.context.lookup(ref);
      if (annotation) pageByWidget.set(annotation, index + 1);
    }
  });
  const widgetsByPage = new Map();
  for (const field of pdf.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      let page = pageByWidget.get(widget.dict) ?? null;
      const pageRef = widget.P?.();
      if (pageRef) pages.forEach((candidate, index) => {
        if (candidate.ref === pageRef || candidate.ref.toString() === pageRef.toString()) page = index + 1;
      });
      const rect = widget.getRectangle();
      const row = { name: field.getName(), rect: {
        x: +rect.x.toFixed(3), y: +rect.y.toFixed(3),
        width: +rect.width.toFixed(3), height: +rect.height.toFixed(3),
      } };
      if (!widgetsByPage.has(page)) widgetsByPage.set(page, []);
      widgetsByPage.get(page).push(row);
    }
  }
  const contexts = new Map();
  pages.forEach((page, index) => {
    const lines = module.groupIntoLines(module.extractTextItems(page));
    for (const context of module.captureWidgetContext(page, widgetsByPage.get(index + 1) ?? [], {
      precomputedLines: lines, isFirstPage: index === 0,
    })) if (!contexts.has(context.name)) contexts.set(context.name, context);
  });
  return contexts;
}

const committed = JSON.parse(execFileSync("git", ["show", `${BASE}:${CENSUS_PATH}`], {
  cwd: ROOT, encoding: "utf8",
}));
const changedByRepair = [];
const fixedVsCommitted = [];
const sourceIdentities = [];
for (const [documentId, relativePath] of docs) {
  const bytes = fs.readFileSync(path.join(SOURCE_ROOT, relativePath));
  sourceIdentities.push({ documentId, relativePath, sha256: sha256(bytes), byteLength: bytes.length });
  const before = await contextsFor(faulty, bytes);
  const after = await contextsFor(fixed, bytes);
  const committedFields = new Map(committed.documents.find((doc) => doc.documentId === documentId)
    .fields.map((field) => [field.name, field]));
  for (const [widget, prior] of before) {
    const next = after.get(widget);
    if (prior.effectiveLabel !== next.effectiveLabel || prior.labelBasis !== next.labelBasis) {
      changedByRepair.push({ documentId, widget,
        faulty: { effectiveLabel: prior.effectiveLabel, labelBasis: prior.labelBasis, labelGap: prior.labelGap },
        fixed: { effectiveLabel: next.effectiveLabel, labelBasis: next.labelBasis, labelGap: next.labelGap } });
    }
  }
  for (const [widget, next] of after) {
    const expected = committedFields.get(widget);
    if (!expected) continue;
    if (next.effectiveLabel !== (expected.effectiveLabel ?? null)
      || next.labelBasis !== (expected.labelBasis ?? null)) {
      fixedVsCommitted.push({ documentId, widget,
        fixed: { effectiveLabel: next.effectiveLabel, labelBasis: next.labelBasis, labelGap: next.labelGap },
        committed: { effectiveLabel: expected.effectiveLabel ?? null, labelBasis: expected.labelBasis ?? null } });
    }
  }
}
const result = {
  schemaVersion: "pf26-pa-caption-context-measurement/v1",
  familyId: "pa_6308_underage-set",
  baseWithFault: BASE,
  measurement: "decoded text runs and AcroForm widget rectangles read from each exact source PDF",
  sourceIdentities,
  changedByRepairCount: changedByRepair.length,
  changedByRepair,
  fixedVsCommittedCount: fixedVsCommitted.length,
  fixedVsCommitted,
};
if (process.argv.includes("--write")) {
  fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "caption-contexts.json"),
    `${JSON.stringify(result, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
