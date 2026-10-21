// FIX91 repair evidence. No independent acceptance or central raster receipt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const { PDFDocument, PDFName, StandardFonts } = require('pdf-lib');
const { extractTextItems } = await import(pathToFileURL(path.join(root, 'scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs')));
const family = process.argv[2] ?? path.join(root, 'data/rcap-all50/overlays/census-v1/ne/ne-setaside-custodial-set--official-pdf-fill');
const sourceRoot = process.env.MASTER_LIBRARY_SOURCE_DIR;
assert.ok(sourceRoot, 'MASTER_LIBRARY_SOURCE_DIR must name the exact recovered source tree');
const read = name => JSON.parse(fs.readFileSync(path.join(family, name), 'utf8'));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceReceipt = read('source-receipt.json');
const census = read('field-census.census-v1.json');
const map = read('production-field-map.json');
const targets = [['CC-6-11', 1], ['CC-6-11.2', 2], ['DC-1-15', 4]];
const evidence = { sourceChecks: [], courtWrites: [], artifacts: [], sourcePrintControls: [], independentVerdict: false, centralRasterReceipt: false };
for (const source of sourceReceipt.documents) {
  const bytes = fs.readFileSync(path.join(sourceRoot, source.pathInArchive));
  assert.equal(sha(bytes), source.sha256); assert.equal(bytes.length, source.byteLength);
  evidence.sourceChecks.push({ form: source.formNumber, sha256: sha(bytes), bytes: bytes.length, exact: true });
  if (!targets.some(([name]) => name === source.formNumber)) continue;
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const choice = pdf.getForm().getField('TYPEOFCOURTDROPDOWN');
  assert.equal(choice.isReadOnly(), false);
  const district = choice.acroField.getOptions().filter(row => row.display?.decodeText() === 'DISTRICT');
  assert.equal(district.length, 1); assert.equal(district[0].value.decodeText(), 'IN THE DISTRICT COURT OF');
  const county = pdf.getForm().getField('DROPDOWNCOUNTY2').getOptions();
  for (const held of ['Example County', 'Saint Bartholomew and the Northern Reaches County']) {
    assert.ok(!county.some(option => option.toLowerCase() === held.replace(/ county$/i, '').toLowerCase()));
  }
  if (source.formNumber === 'DC-1-15') {
    for (const name of ['Text20', 'Text24', 'divorce', 'Group27', 'Text4', 'Text12', 'emancipation', 'Text2', 'Text19', 'Button63.0']) {
      const field = pdf.getForm().getField(name);
      const flags = field.acroField.getWidgets().map(widget => widget.dict.get(PDFName.of('F'))?.asNumber?.() ?? 0);
      assert.ok(flags.every(flag => Boolean(flag & 4) === (name === 'Button63.0')));
      evidence.sourcePrintControls.push({ field: name, annotationFlags: flags, sourcePrintBit: name === 'Button63.0' });
    }
  }
}
const measuring = await PDFDocument.create(); const font = await measuring.embedFont(StandardFonts.Helvetica);
for (const fixture of ['canonical', 'boundary']) {
  const bytes = fs.readFileSync(path.join(family, 'fixtures', fixture + '.pdf'));
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), 5); assert.equal(pdf.getForm().getFields().length, 0);
  const text = pdf.getPages().map(extractTextItems);
  for (const [form, page] of targets) {
    const field = census.documents.find(row => row.formNumber === form).fields.find(row => row.name === 'TYPEOFCOURTRESULTS');
    const rect = field.widgets[0].rect; const expected = 'IN THE DISTRICT COURT OF';
    const actual = text[page - 1].filter(row => row.text === expected && row.x >= rect.x && row.y >= rect.y && row.y < rect.y + rect.height);
    assert.equal(actual.length, 1, `${fixture}/${form}: exact court caption missing from printed rectangle`);
    const write = map.maps.find(row => row.formNumber === form)[fixture + 'Writes'].find(row => row.field === field.name);
    assert.ok(write && write.factId === 'matter.court');
    const width = font.widthOfTextAtSize(expected, actual[0].size);
    assert.ok(actual[0].size >= 6 && width <= rect.width - 4 + 0.01);
    evidence.courtWrites.push({ fixture, form, packetPage: page, field: field.name, expected, rect,
      actualFontSize: actual[0].size, actualPosition: { x: actual[0].x, y: actual[0].y }, actualWidth: width });
  }
  const notice = text[3].map(row => row.text).join(' ');
  assert.ok(!notice.includes('will NOT print'), 'nonprinting source panel leaked');
  // The original source appearance uses an embedded font encoding which the
  // small overlay text reader does not decode. Read that preserved source text
  // with Poppler; the separate 300dpi crop test checks its complete appearance.
  const printedNotice = execFileSync('pdftotext', ['-f', '4', '-l', '4', '-layout', path.join(family, 'fixtures', fixture + '.pdf'), '-'], { encoding: 'utf8' });
  assert.ok(printedNotice.includes('Add next person'), 'source-printable button lost');
  const fullText = text.flat().map(row => row.text).join(' ');
  assert.ok(!fullText.includes('Example County') && !fullText.includes('Saint Bartholomew'));
  const refusals = map.maps.filter(row => ['CC-6-11', 'CC-6-11.2', 'DC-1-15'].includes(row.formNumber));
  if (fixture === 'boundary') for (const entry of refusals) assert.ok(entry.boundaryRefusals.some(row => row.factId === 'matter.case_number' && /fit|overflow|too/i.test(JSON.stringify(row))), `${entry.formNumber}: overlong case must remain refused`);
  evidence.artifacts.push({ fixture, sha256: sha(bytes), byteLength: bytes.length, pages: 5, finalAcroFields: 0, countyNotInvented: true, printPanelAbsent: true, sourcePrintButtonPreserved: true });
}
const guide = fs.readFileSync(path.join(family, 'participant-instructions.md'), 'utf8');
assert.equal(map.requiredBeforeFiling.some(row => row.document === 'CC-6-11A'), false);
assert.ok(!guide.includes('## CC-6-11A'));
assert.ok(!guide.includes('Choose the value from the list in a PDF viewer'));
assert.ok(!guide.includes('both blanks are yours to'));
assert.ok(!map.requiredBeforeFiling.some(row => /^Button63\./.test(row.field ?? '')));
assert.ok(!map.requiredBeforeFiling.some(row => row.field === 'datesigned'
  || (row.document === 'CC-6-11.2' && row.field === 'Text4')), 'protected execution dates must not be in the pre-filing blank checklist');
assert.ok(guide.includes('no\ninteractive form fields'));
assert.ok(guide.includes('DC 6:7.1'), 'existing fee-waiver mismatch must remain disclosed');
evidence.requiredBeforeFilingCount = map.requiredBeforeFiling.length;
evidence.instructionFragmentsExcluded = true;
evidence.status = 'PASS';
console.log(JSON.stringify(evidence, null, 2));
