import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, INDEX, SOURCES, hash, importSources, verifySource } from './import-co-md-current-sources.mjs';

const original = execFileSync('git', ['show', '97c2ff580f163db03130d2b1231e71ea702092ed:' + INDEX], { cwd: ROOT, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
const before = JSON.parse(original), root = fs.mkdtempSync(path.join(os.tmpdir(), 'co-md-source-index-'));
const indexPath = path.join(root, INDEX);
fs.mkdirSync(path.dirname(indexPath), { recursive: true });
fs.writeFileSync(indexPath, original);
let checks = 0;
try {
  const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rcap-grade-a/source-wave-integration/SOURCE_CO_CURRENT_FORM_ADOPTION_2026-10-21.json')));
  assert.equal(receipt.familyId, 'co_motion_seal_conviction-set'); checks++;
  assert.equal(receipt.documents.length, 2); checks++;
  for (const source of SOURCES.filter(source => source.state === 'CO')) {
    const documents = receipt.documents.filter(row => row.sourceId === `official-form:${source.formNumber}`);
    assert.equal(documents.length, 1); checks++;
    const document = documents[0];
    assert.equal(document.itemId, `${receipt.familyId}::official-form:${source.formNumber}`); checks++;
    assert.equal(document.sha256, source.sha256); checks++;
    assert.equal(document.heldCorpusPath, source.path); checks++;
    assert.equal(document.byteLength, source.byteLength); checks++;
    assert.equal(document.pageCount, source.pageCount); checks++;
    assert.equal(document.result, 'ACQUIRED_CURRENT_OFFICIAL_BINARY'); checks++;
    assert.equal(document.freshIssuerDownloadClaimedHere, false); checks++;
    assert(before.entries.some(row => row.formNumber === source.formNumber && row.sha256 === document.supersedes.sha256)); checks++;
  }
  for (const [file, digest] of [[receipt.custodyProvenance.path, receipt.custodyProvenance.sha256],
    [receipt.custodyProvenance.checksumManifestPath, receipt.custodyProvenance.checksumManifestSha256]]) {
    assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), digest); checks++;
  }
  for (const source of SOURCES) {
    const target = path.join(root, source.path);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(path.join(ROOT, source.path), target);
    const bytes = fs.readFileSync(target);
    verifySource(bytes, source); checks++;
    assert.throws(() => verifySource(bytes.subarray(1), source), /source length/); checks++;
    const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1;
    assert.throws(() => verifySource(changed, source), /source digest/); checks++;
  }
  // Fail on the fourth input after the earlier entries were prepared in memory.
  const last = path.join(root, SOURCES.at(-1).path);
  fs.unlinkSync(last); fs.writeFileSync(last, 'bad test source');
  await assert.rejects(importSources(root), /source length/); checks++;
  assert.equal(fs.readFileSync(indexPath, 'utf8'), original); checks++;
  fs.unlinkSync(last); fs.symlinkSync(path.join(ROOT, SOURCES.at(-1).path), last);
  const result = await importSources(root), afterBytes = fs.readFileSync(indexPath, 'utf8');
  assert.equal(result.changed, true); checks++;
  assert.equal(result.indexSha256, hash(afterBytes)); checks++;
  assert.equal(result.byteLength, Buffer.byteLength(afterBytes)); checks++;
  const after = JSON.parse(afterBytes);
  assert.deepEqual(after.entries.slice(0, before.entries.length), before.entries); checks++;
  assert.deepEqual(after.custodies.slice(0, before.custodies.length), before.custodies); checks++;
  assert.equal(after.entries.length, before.entries.length + 4); checks++;
  assert.equal(after.custodies.length, before.custodies.length + 2); checks++;
  for (const key of ['binariesIndexed', 'pdfsIndexed']) { assert.equal(after.totals[key], before.totals[key] + 4); checks++; }
  assert.equal(after.totals.byAssetFormat.pdf, before.totals.byAssetFormat.pdf + 4); checks++;
  assert.equal(after.totals.byStructure.acroform, before.totals.byStructure.acroform + 4); checks++;
  for (const state of ['CO', 'MD']) { assert.equal(after.byState[state], before.byState[state] + 2); checks++; }
  const unchanged = structuredClone(after);
  unchanged.entries = unchanged.entries.slice(0, before.entries.length);
  unchanged.custodies = unchanged.custodies.slice(0, before.custodies.length);
  unchanged.totals = before.totals; unchanged.byState = before.byState;
  assert.deepEqual(unchanged, before); checks++;
  for (const source of SOURCES) {
    assert.equal(after.totals.byCustody[source.custody], 2); checks++;
    const matches = after.entries.filter(row => row.formNumber === source.formNumber);
    assert(matches.some(row => row.sha256 === source.sha256)); checks++;
    if (source.state === 'MD') { assert.equal(matches.length, 1); checks++; }
    else { assert.equal(new Set(matches.map(row => row.sha256)).size, 2); checks++; }
    verifySource(fs.readFileSync(path.join(ROOT, source.path)), source); checks++;
  }
  assert.equal((await importSources(root)).changed, false); checks++;
  assert.equal(fs.readFileSync(indexPath, 'utf8'), afterBytes); checks++;
  after.entries.at(-1).revision = 'unreviewed';
  const drifted = JSON.stringify(after, null, 2) + '\n'; fs.writeFileSync(indexPath, drifted);
  await assert.rejects(importSources(root), /existing entry drift/); checks++;
  assert.equal(fs.readFileSync(indexPath, 'utf8'), drifted); checks++;
  console.log(JSON.stringify({ status: 'PASS', checks, priorEntriesPreserved: before.entries.length,
    currentSources: 4, limit: 'CO differing revisions still need the assigned exact-binding successor; importing custody alone does not repair factory selection.' }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
