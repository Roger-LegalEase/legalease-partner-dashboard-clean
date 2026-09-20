import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');

function confinedFile(root, family, relative) {
  assert.equal(typeof relative, 'string', 'Declared anchor path is required');
  assert(!path.isAbsolute(relative) && !relative.includes('\\'), 'Declared anchor must be repository-relative');
  assert(!relative.split('/').some(part => part === '..' || part === '.' || part === ''), 'Declared anchor path is not normalized');
  assert(relative.startsWith(`${family}/`), 'Declared anchor lies outside its family');
  const absoluteRoot = path.resolve(root);
  let cursor = absoluteRoot;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Declared anchor and its directories must not be symlinks');
  }
  assert(fs.statSync(cursor).isFile(), 'Declared anchor must be a regular file');
  assert(fs.realpathSync(cursor).startsWith(`${fs.realpathSync(absoluteRoot)}${path.sep}`), 'Declared anchor escapes repository custody');
  return cursor;
}

function declaredPositiveInteger(value, actual, label) {
  if (value == null) return;
  assert(Number.isSafeInteger(value) && value > 0, `${label} must be a positive integer`);
  assert.equal(value, actual, `${label} does not match the bound artifact`);
}

function parsedPageCount(root, absolute) {
  // The shared review importer is synchronous. Use the already-locked pdf-lib
  // in a bounded child process; no renderer, raster files or new dependency.
  const script = "import fs from 'node:fs'; import {PDFDocument} from 'pdf-lib'; const pdf = await PDFDocument.load(fs.readFileSync(process.argv[1]), {updateMetadata:false}); process.stdout.write(String(pdf.getPageCount()));";
  const result = execFileSync(process.execPath, ['--input-type=module', '-e', script, absolute], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  }).trim();
  assert(/^\d+$/.test(result), 'Declared anchor page count could not be parsed');
  const count = Number(result);
  assert(Number.isSafeInteger(count) && count > 0, 'Declared anchor PDF has no measurable pages');
  return count;
}

/** Read an independently declared whole-output anchor without renaming it.
 * Existing fixtures/<role>.pdf anchors retain their previous import behavior.
 * An alternate file requires exact declared inventory membership, immutable
 * publication of that inventory and output, and current hash/size/page identity.
 * This function grants no approval; its caller still validates the review row.
 */
export function readDeclaredWholeReviewAnchor(root, row, role) {
  assert(['canonical', 'boundary'].includes(role), 'Unknown whole-output anchor role');
  const family = row.familyDirectory;
  assert(typeof family === 'string' && family.startsWith('data/rcap-all50/overlays/'), 'Invalid reviewed family directory');
  assert(!path.isAbsolute(family) && !family.includes('\\') && !family.split('/').some(part => ['..', '.', ''].includes(part)), 'Invalid reviewed family directory');
  const anchor = row.anchors?.[role];
  const standard = `${family}/fixtures/${role}.pdf`;
  const requested = anchor?.file ?? standard;
  if (requested === standard) return fs.readFileSync(path.join(root, standard));

  assert(requested.endsWith('.pdf'), 'Declared whole-output anchor must be a PDF');
  const absolute = confinedFile(root, family, requested);
  const inventoryPath = `${family}/reports/rendered-artifacts.json`;
  const inventoryAbsolute = confinedFile(root, family, inventoryPath);
  const inventoryBytes = fs.readFileSync(inventoryAbsolute);
  const publication = row.packetPublicationCommit;
  assert(/^[0-9a-f]{40}$/.test(publication ?? ''), 'Declared anchor inventory requires immutable publication');
  const publishedInventory = execFileSync('git', ['show', `${publication}:${inventoryPath}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(sha256(inventoryBytes), sha256(publishedInventory), 'Declared anchor inventory differs from its publication');
  if (row.artifactInventory != null) {
    assert.equal(row.artifactInventory.path, inventoryPath, 'Declared inventory reference is outside this family');
    assert.equal(row.artifactInventory.sha256, sha256(inventoryBytes), 'Declared inventory evidence digest mismatch');
  }
  const report = JSON.parse(inventoryBytes);
  assert.equal(report.familyId, row.familyId, 'Declared inventory belongs to another family');
  const entries = report.artifacts ?? report.pdfs ?? report.packets;
  assert(Array.isArray(entries), 'Declared whole-output inventory is missing');
  const matches = entries.filter(entry => entry?.file === requested);
  assert.equal(matches.length, 1, 'Declared anchor must occur exactly once in its output inventory');
  const entry = matches[0];
  assert(new RegExp(`(^|[._/\\-])${role}([._/\\-]|$)`).test(String(entry.fixture ?? '')), 'Declared anchor inventory identifies a different fixture role');
  const bytes = fs.readFileSync(absolute);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'Declared whole-output anchor is not PDF');
  const digest = sha256(bytes);
  assert.equal(entry.sha256, digest, 'Declared inventory output digest mismatch');
  assert.equal(anchor.centralAndInventorySha256, digest, 'Declared review output digest mismatch');
  assert.equal(anchor.gitBlobSha, gitBlob(bytes), 'Declared review Git blob mismatch');
  const publishedBytes = execFileSync('git', ['show', `${publication}:${requested}`], { cwd: root, maxBuffer: Math.max(bytes.length + 1024, 1024 * 1024) });
  assert.equal(sha256(publishedBytes), digest, 'Declared output differs from its publication');
  for (const [label, declaration] of [['Review', anchor], ['Inventory', entry]]) {
    declaredPositiveInteger(declaration.byteLength, bytes.length, `${label} byte length`);
    declaredPositiveInteger(declaration.bytes, bytes.length, `${label} bytes`);
  }
  if ([anchor.pageCount, anchor.pages, entry.pageCount, entry.pages].some(value => value != null)) {
    const count = parsedPageCount(root, absolute);
    for (const [label, declaration] of [['Review', anchor], ['Inventory', entry]]) {
      declaredPositiveInteger(declaration.pageCount, count, `${label} page count`);
      declaredPositiveInteger(declaration.pages, count, `${label} pages`);
    }
  }
  return bytes;
}
