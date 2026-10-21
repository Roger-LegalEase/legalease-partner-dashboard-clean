import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { requireMasterLibraryEnvironment } from '../../../../scripts/lib/corpus-index-paths.mjs';
import { conditionalPacketDocuments } from '../../../../scripts/grade-a-packet-factory-24h/conditional-raster-documents.mjs';

// Exercise the production selector functions without running its national queue
// loop or emitter. The normal corpus environment guard remains active.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const sourcePath = path.join(root, 'scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs');
const source = fs.readFileSync(sourcePath, 'utf8');
assert.ok(source.includes('const previous = '), 'Production selector boundary changed');
let prefix = source.slice(0, source.indexOf('const previous = '));
prefix = prefix.replace(/^#!.*\n/, '').replace(/^import .*;\n/gm, '')
  .replace('const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");', `const ROOT = ${JSON.stringify(root)};`)
  .replace('await import("pdf-lib")', `await import(${JSON.stringify(pathToFileURL(createRequire(import.meta.url).resolve('pdf-lib')).href)})`);
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const select = new AsyncFunction('fs', 'path', 'crypto', 'execFileSync', 'spawnSync', 'conditionalPacketDocuments', 'requireMasterLibraryEnvironment',
  prefix + '\nreturn { fixturesOf, documentSet };');
const { fixturesOf, documentSet } = await select(fs, path, crypto, execFileSync, spawnSync, conditionalPacketDocuments, requireMasterLibraryEnvironment);
const dir = path.join(root, 'data/rcap-all50/overlays/census-v1/or/or-contempt-setaside-set--official-pdf-fill');
const found = fixturesOf(dir);
assert.deepEqual(found.pdfs, ['boundary.pdf', 'canonical.pdf']);
const documents = await documentSet(dir, found.root, found.pdfs);
const expected = [["canonical", "canonical.pdf", 11, "97fe8040cc15111755377ed53061814dd5ab7d1f126281fba890277b726b2c4a"], ["boundary", "boundary.pdf", 12, "0c39c4b6eac5580a2c41ec49412464d10c553419da682ee9802c5482d50ab627"]];
assert.deepEqual(documents.map(d => [d.role, d.name, d.pageCount, d.sha256]), expected);
assert.equal(documents.reduce((sum, d) => sum + d.pageCount, 0), 23);
const receipt = {
  schemaVersion: 'or-native-raster-selection-review/v1',
  familyId: 'or_contempt_setaside-set', result: 'PASS',
  selector: path.relative(root, sourcePath),
  selectorSha256: crypto.createHash('sha256').update(source).digest('hex'),
  scope: 'Existing fixturesOf and documentSet executed on OR alone; no national queue generation, emissions, or PDF mutations.',
  documentCount: documents.length, pageCount: 23, documents,
  enrollmentHelperNeeded: false, visualReviewPerformed: false,
};
fs.writeFileSync(new URL('./raster-selection-evidence.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log('PASS: existing native OR selector enrolls exactly two current PDFs, 23 pages.');
