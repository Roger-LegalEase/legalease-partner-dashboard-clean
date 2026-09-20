import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { readDeclaredWholeReviewAnchor } from './declared-whole-review-anchor.mjs';

const root = process.cwd();
const evidence = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/mi-mo-closure';
const acceptance = JSON.parse(fs.readFileSync(`${evidence}/mi-mo-session10-static-acceptance.json`));
const mo = acceptance.rows.find(row => row.familyId === 'mo-610-145-mistaken-identity-set');
const mi = acceptance.rows.find(row => row.familyId === 'mi_setaside_application-set');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const originalInventory = fs.readFileSync(`${mo.familyDirectory}/reports/rendered-artifacts.json`);

for (const role of ['canonical', 'boundary']) test(`actual published MO ${role} preserves its selected output identity`, () => {
  const bytes = readDeclaredWholeReviewAnchor(root, mo, role);
  assert.equal(sha(bytes), mo.anchors[role].centralAndInventorySha256);
});

test('existing standard MI anchors keep the fallback with no new inventory/publication obligation', () => {
  const row = structuredClone(mi);
  delete row.packetPublicationCommit;
  delete row.anchors.canonical.file;
  assert.equal(sha(readDeclaredWholeReviewAnchor(root, row, 'canonical')), mi.anchors.canonical.centralAndInventorySha256);
});

for (const [name, change, expected] of [
  ['parent traversal', r => { r.anchors.canonical.file = `${r.familyDirectory}/../other.pdf`; }, /normalized|outside/],
  ['absolute path', r => { r.anchors.canonical.file = path.resolve(r.anchors.canonical.file); }, /repository-relative/],
  ['cross-family path', r => { r.anchors.canonical.file = mi.anchors.canonical.file; }, /outside its family/],
  ['wrong hash', r => { r.anchors.canonical.centralAndInventorySha256 = '0'.repeat(64); }, /review output digest/],
  ['wrong Git blob', r => { r.anchors.canonical.gitBlobSha = '0'.repeat(40); }, /Git blob/],
  ['wrong length', r => { r.anchors.canonical.byteLength++; }, /byte length/],
  ['wrong page count', r => { r.anchors.canonical.pageCount++; }, /page count/],
  ['wrong fixture role', r => { r.anchors.canonical = structuredClone(r.anchors.boundary); }, /different fixture role/],
  ['missing immutable publication', r => { delete r.packetPublicationCommit; }, /immutable publication/],
  ['wrong inventory evidence digest', r => { r.artifactInventory = { path: `${r.familyDirectory}/reports/rendered-artifacts.json`, sha256: '0'.repeat(64) }; }, /inventory evidence digest/],
]) test(`actual importer refuses ${name}`, () => {
  const row = structuredClone(mo); change(row);
  assert.throws(() => readDeclaredWholeReviewAnchor(root, row, 'canonical'), expected);
});

test('unlisted family output is refused before its invented review hashes matter', () => {
  const row = structuredClone(mo);
  row.anchors.canonical.file = `${row.familyDirectory}/source-CR301.pdf`;
  // Use an existing legitimate component path, without inventing a new PDF.
  const components = fs.readdirSync(path.join(root, row.familyDirectory)).filter(name => name.endsWith('.pdf'));
  const listed = new Set(JSON.parse(originalInventory).artifacts.map(entry => path.basename(entry.file)));
  const component = components.find(name => !listed.has(name));
  assert(component, 'The installed bundle has separate official component PDFs');
  row.anchors.canonical.file = `${row.familyDirectory}/${component}`;
  assert.throws(() => readDeclaredWholeReviewAnchor(root, row, 'canonical'), /exactly once/);
});

test('symlink custody is refused without touching retained candidates', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-anchor-symlink-test-'));
  try {
    const familyParent = path.dirname(path.join(temporary, mo.familyDirectory));
    fs.mkdirSync(familyParent, { recursive: true });
    fs.symlinkSync(path.join(root, mo.familyDirectory), path.join(temporary, mo.familyDirectory));
    assert.throws(() => readDeclaredWholeReviewAnchor(temporary, mo, 'canonical'), /symlinks/);
  } finally { fs.rmSync(temporary, { recursive: true }); }
});

test('a changed current inventory cannot borrow the old publication identity', () => {
  const originalReader = fs.readFileSync;
  const inventoryAbsolute = path.resolve(mo.familyDirectory, 'reports/rendered-artifacts.json');
  const changed = JSON.parse(originalInventory);
  changed.artifacts[0].sha256 = '0'.repeat(64);
  try {
    fs.readFileSync = function (file, ...options) {
      if (typeof file === 'string' && path.resolve(file) === inventoryAbsolute) return Buffer.from(JSON.stringify(changed));
      return originalReader.call(this, file, ...options);
    };
    assert.throws(() => readDeclaredWholeReviewAnchor(root, mo, 'canonical'), /inventory differs from its publication/);
  } finally { fs.readFileSync = originalReader; }
});

test('current retained files and published inventory were never mutated by the controls', () => {
  assert.deepEqual(fs.readFileSync(`${mo.familyDirectory}/reports/rendered-artifacts.json`), originalInventory);
  for (const role of ['canonical', 'boundary']) {
    const file = mo.anchors[role].file;
    assert.deepEqual(fs.readFileSync(file), execFileSync('git', ['show', `${mo.packetPublicationCommit}:${file}`], { maxBuffer: 1024 * 1024 }));
  }
});
