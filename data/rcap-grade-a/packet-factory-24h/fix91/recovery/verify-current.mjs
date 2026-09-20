// FIX91 repair evidence only: measure actual text at the five assigned widgets.
// This does not issue an independent verdict or a central raster receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const { PDFDocument, StandardFonts } = require('pdf-lib');
const { extractTextItems } = await import(pathToFileURL(path.join(root,
  'scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs')));
const family = process.argv[2] ?? path.join(root,
  'data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill');
const read = (name) => JSON.parse(fs.readFileSync(path.join(family, name), 'utf8'));
const census = read('field-census.census-v1.json');
const maps = read('production-field-map.json').maps;
const targets = [
  ['CC-6-11', 1, 'defendant', 'name'],
  ['CC-6-11', 1, 'streetaddress', 'street'],
  ['CC-6-11', 1, 'emailaddress', 'email'],
  ['CC-6-11.2', 2, 'defendant', 'name'],
  ['DC-1-15', 4, 'defendant', 'name']
];
const facts = {
  canonical: { name: 'Jordan Avery Reyes', street: '118 Maple Street', email: 'jordan.reyes@example.com' },
  boundary: {
    name: 'Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran Fitzwilliam',
    street: '12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B',
    email: 'alexandrina.montgomery.vandenberg.oyelaran.fitzwilliam@department-of-example.example.gov'
  }
};
const measuringDocument = await PDFDocument.create();
const font = await measuringDocument.embedFont(StandardFonts.Helvetica);
const measurements = [], artifacts = [];
for (const fixture of ['canonical', 'boundary']) {
  const bytes = fs.readFileSync(path.join(family, 'fixtures', fixture + '.pdf'));
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), 5);
  artifacts.push({ fixture, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), pageCount: 5 });
  const text = pdf.getPages().map(extractTextItems);
  for (const [formNumber, page, field, fact] of targets) {
    const record = census.documents.find((x) => x.formNumber === formNumber).fields.find((x) => x.name === field);
    const rect = record.widgets[0].rect;
    const expected = facts[fixture][fact];
    const drawn = text[page - 1].filter((x) => x.text === expected
      && x.x >= rect.x - 0.1 && x.x <= rect.x + rect.width
      && x.y >= rect.y - 0.1 && x.y <= rect.y + rect.height);
    assert.equal(drawn.length, 1, `${fixture}/${formNumber}/${field}: exact whole value absent at its rectangle`);
    const write = maps.find((x) => x.formNumber === formNumber)[fixture + 'Writes'].find((x) => x.field === field);
    assert.ok(write, `${fixture}/${formNumber}/${field}: write missing from map`);
    assert.ok(Math.abs(drawn[0].size - write.fontSize) < 0.01,
      `${fixture}/${formNumber}/${field}: actual size ${drawn[0].size} differs from reported fit ${write.fontSize}`);
    const width = font.widthOfTextAtSize(expected, drawn[0].size);
    assert.ok(width <= rect.width - 4 + 0.01, `${fixture}/${formNumber}/${field}: text exceeds usable width`);
    assert.ok(drawn[0].size >= 6, `${fixture}/${formNumber}/${field}: below readable minimum`);
    measurements.push({ fixture, formNumber, page, field, expected, rect,
      actualFontSize: drawn[0].size, reportedFontSize: write.fontSize,
      actualTextPosition: { x: drawn[0].x, y: drawn[0].y },
      textWidthInRenderedHelvetica: width, usableWidth: Number((rect.width - 4).toFixed(2)) });
  }
}
console.log(JSON.stringify({ status: 'PASS', checks: measurements.length, artifacts, measurements,
  method: 'Actual PDF text operators and font sizes, associated with source widget rectangles; Helvetica metric width. This is distinct from manual 300dpi image inspection.',
  independentVerdict: false, centralRasterReceipt: false }, null, 2));
