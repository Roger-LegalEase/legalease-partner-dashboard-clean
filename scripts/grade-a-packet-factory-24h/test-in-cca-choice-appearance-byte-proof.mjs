#!/usr/bin/env node
// Byte-level IN2 guard: every source dropdown/option-list widget must survive
// flattening at its own source rectangle. This deliberately does not rasterize.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { PDFDocument, PDFDropdown, PDFOptionList, PDFName, PDFDict, decodePDFRawStream } from 'pdf-lib';
import crypto from 'node:crypto';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const families = ['in-arrest-no-charges-set', 'in-section1-petition-set'];
const sourceRoot = path.join(root, 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1');

function isSourceChoiceField(field) {
  return field instanceof PDFDropdown || field instanceof PDFOptionList;
}

// Exercise both pdf-lib choice classes even when today's pinned sources carry
// only dropdowns, so a future option list cannot silently fall out of scope.
const choiceTypeProbe = await PDFDocument.create();
const choiceTypeProbeForm = choiceTypeProbe.getForm();
assert.equal(isSourceChoiceField(choiceTypeProbeForm.createDropdown('__proof_dropdown__')), true);
assert.equal(isSourceChoiceField(choiceTypeProbeForm.createOptionList('__proof_option_list__')), true);

function sourcePath(doc) { return path.join(sourceRoot, doc.pathInArchive); }
function runClassifier(delivered, source) {
  const json = path.join(os.tmpdir(), `in2-choice-proof-${process.pid}-${Math.random()}.json`);
  try {
    execFileSync(process.execPath, [
      path.join(root, 'scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs'),
      delivered, '--source', source, '--json', json
    ], { cwd: root, stdio: 'ignore' });
    return JSON.parse(fs.readFileSync(json));
  } finally { fs.rmSync(json, { force: true }); }
}
async function sourceChoiceWidgets(source) {
  const pdf = await PDFDocument.load(fs.readFileSync(source), { ignoreEncryption: true, updateMetadata: false });
  const pageNumbers = new Map(pdf.getPages().map((page, i) => [page.ref.tag, i + 1]));
  const rows = [];
  for (const field of pdf.getForm().getFields()) {
    if (!isSourceChoiceField(field)) continue;
    const widgetRows = field.acroField.getWidgets().map((w) => {
      const ap = w.dict.lookup(PDFName.of('AP'), PDFDict);
      const state = w.dict.get(PDFName.of('AS'));
      const normal = ap?.lookup(PDFName.of('N'));
      const stream = normal instanceof PDFDict && state ? normal.lookup(state) : normal;
      const bytes = stream ? Buffer.from(decodePDFRawStream(stream).decode()) : Buffer.alloc(0);
      const text = bytes.toString('latin1');
      const hasPaint = /(?:^|\s)(?:S|s|f|F|f\*|B|B\*|b|b\*|sh)(?:\s|$)/.test(text);
      const rect = w.getRectangle();
      return { hasPaint, apPresent: Boolean(stream), page: pageNumbers.get(w.dict.get(PDFName.of('P'))?.tag),
        rect: { x0: Math.min(rect.x, rect.x + rect.width), y0: Math.min(rect.y, rect.y + rect.height),
          x1: Math.max(rect.x, rect.x + rect.width), y1: Math.max(rect.y, rect.y + rect.height) },
        apSha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    });
    const apCount = widgetRows.filter((w) => w.apPresent).length;
    assert.equal(apCount, field.acroField.getWidgets().length, `source ${field.getName()} lacks authored AP`);
    rows.push({ field: field.getName(), fieldType: field.constructor.name, widgets: widgetRows.length,
      authoredAppearances: apCount,
      sourcePaintedWidgets: widgetRows.filter((w) => w.hasPaint).length, widgetRows });
  }
  return rows;
}
async function checkCoverage(result, sourceRows, delivered) {
  assert.equal(result.summary.appearancesNotPlacedAtTheirOwnSourceWidget, 0);
  const byField = new Map();
  for (const a of result.appearances) {
    if (!a.sourceWidgetField) continue;
    byField.set(a.sourceWidgetField, (byField.get(a.sourceWidgetField) ?? 0) + 1);
    assert.equal(a.placedAtItsOwnSourceWidget, true, `misplaced ${a.sourceWidgetField}`);
  }
  for (const row of sourceRows) assert.equal(byField.get(row.field), row.widgets,
    `source choice ${row.field}: missing preserved widget appearance`);
  for (const row of sourceRows) {
    const outputPainted = result.appearances.filter((a) => a.sourceWidgetField === row.field
      && a.paintingOperators?.length > 0).length;
    assert.equal(outputPainted, row.sourcePaintedWidgets,
      `source choice ${row.field}: delivered paint does not match source AP paint`);
  }
  const outputPdf = await PDFDocument.load(fs.readFileSync(delivered), { ignoreEncryption: true, updateMetadata: false });
  const outputStreams = new Map();
  for (const [pageIndex, page] of outputPdf.getPages().entries()) {
    const resources = page.node.Resources();
    const xobjectRef = resources?.get(PDFName.of('XObject'));
    const xobjects = xobjectRef ? outputPdf.context.lookup(xobjectRef, PDFDict) : null;
    if (!xobjects) continue;
    for (const [name, ref] of xobjects.entries()) {
      if (!name.asString().startsWith('/FlatWidget-')) continue;
      const stream = outputPdf.context.lookup(ref);
      outputStreams.set(`${pageIndex + 1}:${name.asString()}`, crypto.createHash('sha256')
        .update(Buffer.from(decodePDFRawStream(stream).decode())).digest('hex'));
    }
  }
  for (const row of sourceRows) for (const sourceWidget of row.widgetRows) {
    const candidate = result.appearances.find((a) => a.sourceWidgetField === row.field
      && a.page === sourceWidget.page
      && Math.abs(a.placedRect.x0 - sourceWidget.rect.x0) <= 0.01
      && Math.abs(a.placedRect.y0 - sourceWidget.rect.y0) <= 0.01);
    assert.ok(candidate, `source choice ${row.field}: source widget not matched by page/rect`);
    assert.equal(outputStreams.get(`${candidate.page}:${candidate.name}`), sourceWidget.apSha256,
      `source choice ${row.field}: delivered AP bytes differ from source AP bytes`);
  }
  return byField;
}
async function sourceSizedDeliveries(delivered, source) {
  const [output, sourcePdf] = await Promise.all([
    PDFDocument.load(fs.readFileSync(delivered), { ignoreEncryption: true, updateMetadata: false }),
    PDFDocument.load(fs.readFileSync(source), { ignoreEncryption: true, updateMetadata: false })
  ]);
  const sourcePages = sourcePdf.getPageCount();
  assert.equal(output.getPageCount() % sourcePages, 0, `${delivered}: output is not a whole number of source sets`);
  if (output.getPageCount() === sourcePages) return [{ path: delivered, setIndex: 0, temporary: false }];
  const slices = [];
  for (let setIndex = 0; setIndex < output.getPageCount() / sourcePages; setIndex++) {
    const one = await PDFDocument.create();
    const indices = Array.from({ length: sourcePages }, (_, i) => setIndex * sourcePages + i);
    const pages = await one.copyPages(output, indices);
    pages.forEach((page) => one.addPage(page));
    const target = path.join(os.tmpdir(), `in2-choice-set-${process.pid}-${setIndex}-${Math.random()}.pdf`);
    fs.writeFileSync(target, await one.save({ useObjectStreams: false, updateMetadata: false }));
    slices.push({ path: target, setIndex, temporary: true });
  }
  return slices;
}
async function mutateOneOutputAppearance(delivered, appearance) {
  const pdf = await PDFDocument.load(fs.readFileSync(delivered), { ignoreEncryption: true, updateMetadata: false });
  const page = pdf.getPages()[appearance.page - 1];
  const resources = page.node.Resources();
  const xobjects = resources?.get(PDFName.of('XObject'))
    ? pdf.context.lookup(resources.get(PDFName.of('XObject')), PDFDict) : null;
  assert.ok(xobjects);
  const ref = [...xobjects.entries()].find(([name]) => name.asString() === appearance.name)?.[1];
  assert.ok(ref);
  const stream = pdf.context.lookup(ref);
  // Mutate the actual saved appearance stream, leaving the page and source
  // inputs intact. The subsequent source-byte hash comparison must reject it.
  const decoded = Buffer.from(decodePDFRawStream(stream).decode());
  stream.contents = deflateSync(Buffer.concat([decoded, Buffer.from('\n% exact-byte negative control\n')]));
  const target = path.join(os.tmpdir(), `in2-choice-proof-mutated-${process.pid}.pdf`);
  fs.writeFileSync(target, await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  return target;
}

const proof = [];
const negativeControls = [];
for (const family of families) {
  const out = path.join(root, 'data/rcap-all50/overlays/census-v1/in', `${family}--official-pdf-fill`);
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'source-receipt.json')));
  const docs = receipt.documents;
  for (const [index, doc] of docs.entries()) {
    const source = sourcePath(doc);
    const sourceRows = await sourceChoiceWidgets(source);
    const choiceWidgets = sourceRows.reduce((n, row) => n + row.widgets, 0);
    for (const fixture of ['canonical', 'boundary']) {
      const delivered = path.join(out, 'fixtures', index === 0
        ? `packet-${fixture}-filled.pdf` : `inserts-${fixture}-filled.pdf`);
      const slices = await sourceSizedDeliveries(delivered, source);
      try {
        for (const slice of slices) {
          const result = runClassifier(slice.path, source);
          await checkCoverage(result, sourceRows, slice.path);
          proof.push({ family, documentId: doc.documentId, fixture, sourceSetIndex: slice.setIndex,
            sourceChoiceWidgets: choiceWidgets, sourceChoiceFields: sourceRows.length,
            sourceDropdownFields: sourceRows.filter((row) => row.fieldType === 'PDFDropdown').length,
            sourceOptionListFields: sourceRows.filter((row) => row.fieldType === 'PDFOptionList').length,
            flattenedAppearances: result.summary.flattenedAppearances,
            placementMismatches: result.summary.appearancesNotPlacedAtTheirOwnSourceWidget,
            exactSourceAppearanceStreamHashesMatched: choiceWidgets });
        }
      } finally {
        for (const slice of slices) if (slice.temporary) fs.rmSync(slice.path, { force: true });
      }
    }
  }

  // Durable negative controls for each family: removing one measured appearance
  // must fail per-widget coverage, and changing its stream bytes must fail the
  // exact source-AP hash comparison.
  const insertSource = sourcePath(docs[1]);
  const insertSourceRows = await sourceChoiceWidgets(insertSource);
  const insertDelivered = path.join(out, 'fixtures', 'inserts-canonical-filled.pdf');
  const cleanInsert = runClassifier(insertDelivered, insertSource);
  assert.ok(insertSourceRows.length > 0);
  const removed = structuredClone(cleanInsert);
  const removedIndex = removed.appearances.findIndex((a) => a.sourceWidgetField === insertSourceRows[0].field);
  assert.ok(removedIndex >= 0);
  removed.appearances.splice(removedIndex, 1);
  removed.summary.flattenedAppearances -= 1;
  await assert.rejects(() => checkCoverage(removed, insertSourceRows, insertDelivered),
    /missing preserved widget appearance/);
  negativeControls.push({ family, control: 'one-source-appearance-removed', result: 'REJECTED' });

  const targetAppearance = cleanInsert.appearances
    .find((a) => a.sourceWidgetField === insertSourceRows[0].field);
  assert.ok(targetAppearance);
  const mutatedPath = await mutateOneOutputAppearance(insertDelivered, targetAppearance);
  try {
    const mutated = runClassifier(mutatedPath, insertSource);
    await assert.rejects(() => checkCoverage(mutated, insertSourceRows, mutatedPath),
      /delivered AP bytes differ from source AP bytes/);
    negativeControls.push({ family, control: 'one-source-appearance-stream-mutated', result: 'REJECTED' });
  } finally { fs.rmSync(mutatedPath, { force: true }); }
}
assert.equal(proof.length, 12);
assert.equal(negativeControls.length, 4);
console.log(JSON.stringify({ result: 'PASS', families,
  choiceFieldClassesExercised: ['PDFDropdown', 'PDFOptionList'],
  sourceChoiceWidgetsChecked: proof.reduce((n, row) => n + row.sourceChoiceWidgets, 0),
  artifactsChecked: proof.length, negativeControls, noRaster: true, proof }));
