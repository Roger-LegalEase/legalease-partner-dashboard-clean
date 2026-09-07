/** Read explicitly declared selectable packets; an assembled diagnostic PDF
 * does not cover the separate conditional outputs a participant may receive. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function conditionalPacketDocuments({ report, fixtures, root }) {
  const declared = (report?.pdfs ?? []).filter(d => d?.role === 'conditional_assembled_packet');
  const selected = [];
  const seen = new Set();
  const pairs = new Set();
  const home = fs.realpathSync(fixtures);
  for (const d of declared) {
    assert.ok(['canonical', 'boundary'].includes(d.baseFixture), 'Conditional packet has no exact base fixture');
    assert.ok(typeof d.branch === 'string' && /^[a-z0-9_]+$/.test(d.branch), 'Conditional packet has no exact branch');
    assert.ok(typeof d.file === 'string' && !path.isAbsolute(d.file), 'Conditional packet path must be repository-relative');
    assert.ok(/^[a-f0-9]{64}$/.test(d.sha256), 'Conditional packet needs its SHA-256');
    assert.ok(Number.isSafeInteger(d.byteLength) && d.byteLength > 0, 'Conditional packet needs its byte length');
    assert.ok(Number.isSafeInteger(d.pageCount) && d.pageCount > 0, 'Conditional packet needs its page count');
    const target = path.resolve(root, d.file);
    const real = fs.realpathSync(target);
    assert.ok(real.startsWith(home + path.sep), 'Conditional packet lies outside its fixture directory');
    const name = path.relative(home, real).split(path.sep).join('/');
    assert.ok(name.endsWith('.pdf') && !seen.has(name), 'Duplicate or non-PDF conditional packet');
    const pair = `${d.baseFixture}:${d.branch}`;
    assert.ok(!pairs.has(pair), 'Duplicate fixture/branch election');
    const bytes = fs.readFileSync(real);
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'Conditional output is not PDF');
    assert.equal(bytes.length, d.byteLength, 'Conditional packet byte length drift');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), d.sha256, 'Conditional packet digest drift');
    seen.add(name); pairs.add(pair);
    selected.push({ role: d.baseFixture, name, declaredPageCount: d.pageCount, branch: d.branch });
  }
  // This directory is the existing selectable-packet layout, not a new
  // synthetic fixture convention. An unlisted selectable output must not hide
  // behind an assembled canonical PDF.
  const branchDir = path.join(home, 'branches');
  if (fs.existsSync(branchDir)) {
    const files = fs.readdirSync(branchDir).filter(n => n.endsWith('.pdf')).map(n => `branches/${n}`);
    assert.ok(files.every(n => seen.has(n)), 'A selectable branch PDF is absent from the declaration');
  }
  for (const d of selected) {
    const other = d.role === 'canonical' ? 'boundary' : 'canonical';
    assert.ok(pairs.has(`${other}:${d.branch}`), 'Conditional branch lacks its other fixture');
  }
  return selected.sort((a,b) => a.name.localeCompare(b.name, 'en'));
}
