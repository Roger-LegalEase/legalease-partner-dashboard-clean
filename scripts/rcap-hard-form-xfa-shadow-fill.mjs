#!/usr/bin/env node
// Lane E — Tier 1 hybrid XFA/AcroForm shadow fill.
//
// The California Judicial Council forms are LiveCycle Designer XFA documents
// that also carry a complete AcroForm widget shadow. Adobe renders the XFA
// view; every other consumer renders the widget shadow. A packet that shipped
// the XFA package would render differently in different viewers and would
// require Adobe Reader, so this converter does the opposite of preserving it:
//
//   1. load the decrypted derivative of the pinned official source;
//   2. delete the /XFA key from the AcroForm dictionary, so no XFA view can be
//      selected by any viewer (neutralization, proven by re-read);
//   3. fill ONLY participant and deterministic values into the widget shadow;
//   4. flatten the form, so the output carries no interactive fields at all;
//   5. strip document-level active content (/OpenAction, /AA, /Names/JavaScript)
//      and refuse to emit if any widget-level action survives.
//
// Protected fields — court use, judge, clerk, prosecuting agency, order
// dispositions, service blocks and signatures the participant may not pre-sign
// — are never populated. They are asserted blank in the output proof.
//
// This never invents a value: a binding whose fact is absent leaves the field
// blank rather than guessing, exactly as the packet renderer does.
//
// Usage:
//   node scripts/rcap-hard-form-xfa-shadow-fill.mjs <profile.json> <facts.json> <out.pdf>

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PDFDocument, PDFName, PDFDict, PDFArray, rgb, StandardFonts } from "pdf-lib";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const ACTIVE_CONTENT_KEYS = ["JavaScript", "JS", "Launch", "SubmitForm", "ImportData", "GoToR", "GoToE", "Rendition", "Movie", "Sound", "RichMedia"];

export function neutralizeXfa(pdfDoc) {
  const acro = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  let removed = false;
  if (acro && acro.get(PDFName.of("XFA")) !== undefined) {
    acro.delete(PDFName.of("XFA"));
    removed = true;
  }
  // NeedAppearances forces a viewer to regenerate field appearances; a flattened
  // document has no fields, so leaving it set is meaningless at best.
  if (acro) acro.delete(PDFName.of("NeedAppearances"));
  return removed;
}

export function stripDocumentActions(pdfDoc) {
  const cat = pdfDoc.catalog;
  const stripped = [];
  for (const key of ["OpenAction", "AA"]) {
    if (cat.get(PDFName.of(key)) !== undefined) {
      cat.delete(PDFName.of(key));
      stripped.push(key);
    }
  }
  const names = cat.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (names && names.get(PDFName.of("JavaScript")) !== undefined) {
    names.delete(PDFName.of("JavaScript"));
    stripped.push("Names/JavaScript");
  }
  return stripped;
}

/**
 * Removes link annotations that carry a URI (or any other) action.
 *
 * Official forms print help URLs such as courts.ca.gov and wrap them in Link
 * annotations. The printed text is part of the official layout and stays; the
 * clickable action is a network action, which a participant packet may not
 * carry, so only the annotation is dropped. Returns the number removed.
 */
export function stripLinkAnnotations(pdfDoc) {
  let removed = 0;
  for (const page of pdfDoc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = annots.size() - 1; i >= 0; i -= 1) {
      const annot = annots.lookup(i, PDFDict);
      if (!annot) continue;
      const subtype = annot.get(PDFName.of("Subtype"));
      const action = annot.lookupMaybe(PDFName.of("A"), PDFDict);
      const actionType = action ? String(action.get(PDFName.of("S")) ?? "").replace("/", "") : "";
      const isLink = String(subtype ?? "") === "/Link";
      if (isLink || actionType === "URI" || annot.get(PDFName.of("AA")) !== undefined) {
        annots.remove(i);
        removed += 1;
      }
    }
  }
  return removed;
}

/** Scans every page annotation for residual actions. Returns offending entries. */
export function scanAnnotationActions(pdfDoc) {
  const hits = [];
  for (const [pageIndex, page] of pdfDoc.getPages().entries()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i += 1) {
      const annot = annots.lookup(i, PDFDict);
      if (!annot) continue;
      const a = annot.lookupMaybe(PDFName.of("A"), PDFDict);
      const aa = annot.get(PDFName.of("AA"));
      if (aa !== undefined) hits.push({ page: pageIndex, kind: "AA" });
      if (a) {
        const s = a.get(PDFName.of("S"));
        const sName = s ? String(s).replace("/", "") : "";
        if (ACTIVE_CONTENT_KEYS.includes(sName) || sName === "URI") {
          hits.push({ page: pageIndex, kind: sName });
        }
      }
    }
  }
  return hits;
}

function applyBinding(form, binding, facts, report) {
  const value = binding.factKey ? facts[binding.factKey] : binding.literal;
  if (value === undefined || value === null || value === "") {
    report.skippedNoFact.push(binding.field);
    return;
  }
  try {
    if (binding.kind === "checkbox") {
      const box = form.getCheckBox(binding.field);
      if (value === true || value === binding.onValue) box.check();
      else box.uncheck();
      report.populated.push({ field: binding.field, kind: "checkbox", value: String(value) });
      return;
    }
    const text = form.getTextField(binding.field);
    let out = String(value);
    if (binding.maxLen && out.length > binding.maxLen) {
      report.overflowed.push({ field: binding.field, length: out.length, maxLen: binding.maxLen });
      out = binding.overflow === "truncate_with_addendum" ? `${out.slice(0, binding.maxLen - 20)} — see Attachment A` : out;
    }
    text.setText(out);
    if (binding.fontSize) text.setFontSize(binding.fontSize);
    report.populated.push({ field: binding.field, kind: "text", chars: out.length });
  } catch (error) {
    report.failed.push({ field: binding.field, error: String(error.message).slice(0, 120) });
  }
}

export async function renderHardFormPacket({ profile, facts, sourceBytes }) {
  const sourceSha = crypto.createHash("sha256").update(sourceBytes).digest("hex");
  if (profile.derivedSource.sha256 !== sourceSha) {
    throw new Error(`source drift: expected ${profile.derivedSource.sha256}, read ${sourceSha}`);
  }
  const pdfDoc = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  const report = {
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    sourceSha256: sourceSha,
    populated: [],
    skippedNoFact: [],
    overflowed: [],
    failed: [],
  };

  // Order matters: pdf-lib drops the XFA packet as a side effect of getForm(),
  // so presence must be observed and the key deleted BEFORE the form is
  // touched. Otherwise the neutralization proof would silently read "nothing
  // to remove" on a document that did in fact ship an XFA package.
  const acroBefore = pdfDoc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  report.xfaPresentInInput = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);
  report.xfaRemoved = neutralizeXfa(pdfDoc);

  const form = pdfDoc.getForm();
  const allFields = new Set(form.getFields().map((f) => f.getName()));

  // A protected field may never be bound, even by a mistaken profile.
  const protectedSet = new Set(profile.protectedFields);
  for (const binding of profile.bindings) {
    if (protectedSet.has(binding.field)) {
      throw new Error(`profile binds protected field ${binding.field}`);
    }
    if (!allFields.has(binding.field)) {
      throw new Error(`profile binds unknown field ${binding.field}`);
    }
    applyBinding(form, binding, facts, report);
  }

  report.documentActionsStripped = stripDocumentActions(pdfDoc);

  // Flatten last: after flattening there are no fields left to fill.
  form.flatten();

  report.linkAnnotationsRemoved = stripLinkAnnotations(pdfDoc);

  const residual = scanAnnotationActions(pdfDoc);
  if (residual.length > 0) {
    throw new Error(`residual active content after flatten: ${JSON.stringify(residual)}`);
  }

  // Deleting catalog references is not enough: the JavaScript and XFA stream
  // objects themselves stay in the object table and are written back out, so a
  // raw byte scan of the packet still finds them. Rebuilding the document —
  // copying only the flattened pages into a fresh file — carries page content
  // and resources across and leaves every orphaned object behind. This is the
  // step that makes "no active content" true of the bytes, not just the model.
  const clean = await PDFDocument.create();
  const copied = await clean.copyPages(pdfDoc, pdfDoc.getPageIndices());
  for (const page of copied) clean.addPage(page);
  const rebuiltResidual = scanAnnotationActions(clean);
  if (rebuiltResidual.length > 0) {
    throw new Error(`residual active content after rebuild: ${JSON.stringify(rebuiltResidual)}`);
  }
  report.rebuiltFromFlattenedPages = true;

  clean.setProducer("LegalEase RCAP hard-form renderer (pdf-lib)");
  clean.setCreator("LegalEase RCAP");
  clean.setTitle(`${profile.form.formId} — ${profile.form.officialName}`);
  // A fresh document stamps the wall clock into its info dictionary, which would
  // make every render of the same facts produce different bytes and turn the
  // output fingerprint into noise. The packet's identity comes from the profile,
  // engine and facts — not from when it was rendered — so both dates are pinned.
  const stamp = new Date(profile.deterministicTimestamp ?? "2026-01-01T00:00:00Z");
  clean.setCreationDate(stamp);
  clean.setModificationDate(stamp);
  const out = await clean.save({ useObjectStreams: false });
  report.outputSha256 = crypto.createHash("sha256").update(out).digest("hex");
  report.outputBytes = out.length;
  return { bytes: out, report };
}

if (process.argv[1] && process.argv[1].endsWith("rcap-hard-form-xfa-shadow-fill.mjs")) {
  const [profilePath, factsPath, outPath] = process.argv.slice(2);
  if (!profilePath || !factsPath || !outPath) {
    console.error("usage: rcap-hard-form-xfa-shadow-fill.mjs <profile.json> <facts.json> <out.pdf>");
    process.exit(2);
  }
  const profile = JSON.parse(fs.readFileSync(path.resolve(rootDir, profilePath), "utf8"));
  const facts = JSON.parse(fs.readFileSync(path.resolve(rootDir, factsPath), "utf8"));
  const sourceBytes = fs.readFileSync(path.resolve(rootDir, profile.derivedSource.path));
  const { bytes, report } = await renderHardFormPacket({ profile, facts, sourceBytes });
  fs.mkdirSync(path.dirname(path.resolve(rootDir, outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(rootDir, outPath), bytes);
  console.log(JSON.stringify(report, null, 2));
}
