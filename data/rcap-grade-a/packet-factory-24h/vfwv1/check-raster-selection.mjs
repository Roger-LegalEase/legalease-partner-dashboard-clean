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
const dir = path.join(root, 'data/rcap-all50/overlays/census-v1/wv/wv-nc-diversion-deferred-set--official-pdf-fill');
const found = fixturesOf(dir);
assert.deepEqual(found.pdfs, ['boundary.pdf', 'canonical.pdf']);
const documents = await documentSet(dir, found.root, found.pdfs);
const expected = [
  ['canonical', 'canonical.pdf', 12, 'bf993e6a3aad738b1519eb3a3b4440c5bfaecfc67f8e488919c8f4e8d9192438'],
  ['boundary', 'boundary.pdf', 13, '11ad1b8683d33e2b12214e13cc34788286081a5f8c8448228cb80a12d4f64abe'],
];
assert.deepEqual(documents.map(d => [d.role, d.name, d.pageCount, d.sha256]), expected);
assert.equal(documents.reduce((sum, d) => sum + d.pageCount, 0), 25);
const receipt = {
  schemaVersion: 'wv-native-raster-selection-review/v1',
  familyId: 'wv_nc_diversion_deferred-set', result: 'PASS',
  selector: path.relative(root, sourcePath),
  selectorSha256: crypto.createHash('sha256').update(source).digest('hex'),
  scope: 'Existing fixturesOf and documentSet executed on WV alone; no national queue generation, emissions, or PDF mutations.',
  documentCount: documents.length, pageCount: 25, documents,
  enrollmentHelperNeeded: false, visualReviewPerformed: false,
};
fs.writeFileSync(new URL('./raster-selection-evidence.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
console.log('PASS: existing native WV selector enrolls exactly two current PDFs, 25 pages.');
