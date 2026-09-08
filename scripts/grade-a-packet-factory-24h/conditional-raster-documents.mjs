/** Read explicitly declared selectable packets; an assembled diagnostic PDF
 * does not cover the separate conditional outputs a participant may receive. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { FAMILY as GA_FAMILY, fixtures as gaFixtures, validateGa } from '../rcap-packet-recovery/chat5/ga-pre2013.mjs';
import { mdConditionalRasterDocuments } from './md-conditional-raster-documents.mjs';

export function conditionalPacketDocuments({ report, fixtures, root }) {
  if (report?.familyId === 'md_10110_conviction-set') return mdConditionalRasterDocuments({report, fixtures, root});
  const declared = (report?.pdfs ?? []).filter(d => d?.role === 'conditional_assembled_packet');
  const selected = [];
  const seen = new Set();
  const pairs = new Set();
  const home = fs.realpathSync(fixtures);
  // The retained GA builder uses artifacts/packets, not pdfs/selectable.
  // Enumerate its actual fixture contract without rewriting the reviewed report.
  if (report?.familyId === GA_FAMILY) {
    const expected = gaFixtures();
    assert.deepEqual(report.artifacts, report.packets, 'GA whole-packet declarations disagree');
    assert.deepEqual(report.artifacts.map(d => d.fixture).sort(), Object.keys(expected).sort(), 'GA whole-packet fixture inventory changed');
    assert.deepEqual(fs.readdirSync(home).filter(n => n.endsWith('.pdf')).sort(),
      Object.keys(expected).map(n => `${n}.pdf`).sort(), 'GA PDF inventory differs from its builder contract');
    for (const d of report.artifacts) {
      assert.equal(d.path, `fixtures/${d.fixture}.pdf`, 'GA fixture path disagrees with its identity');
      const target = path.join(home, `${d.fixture}.pdf`);
      assert.ok(!fs.lstatSync(target).isSymbolicLink(), 'GA packet must not be a symlink');
      const bytes = fs.readFileSync(target);
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      assert.equal(bytes.length, d.byteLength, 'GA packet byte length drift');
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), d.sha256, 'GA packet digest drift');
      assert.ok(Number.isSafeInteger(d.pageCount) && d.pageCount > 0, 'GA packet needs its page count');
      const facts = JSON.parse(fs.readFileSync(path.join(home, `${d.fixture}.facts.json`)));
      assert.deepEqual(facts, expected[d.fixture], 'GA retained fixture facts differ from the actual builder');
      const validation = validateGa(facts);
      const diagnostic = ['canonical', 'boundary', 'missing-participant-facts'].includes(d.fixture);
      selected.push({ role: diagnostic && d.fixture !== 'canonical' ? 'boundary' : 'canonical',
        name: `${d.fixture}.pdf`, declaredPageCount: d.pageCount, branch: d.fixture,
        selectionKind: diagnostic ? 'diagnostic' : 'conditional_packet_example',
        requiredBeforeFiling: validation.missing.map(item => item.fieldId),
        filingReady: false });
    }
    return selected.sort((a,b) => a.name.localeCompare(b.name, 'en'));
  }
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

  // Native builders declare a complete packet for each selectable fixture.
  // These are independent elections, not paired NC diagnostic branches.
  // Preserve their existing bytes and include every declared whole output.
  const native = (report?.pdfs ?? []).filter(d => typeof d?.fixture === 'string'
    && d.fixture.startsWith('selectable/'));
  for (const d of native) {
    assert.match(d.fixture, /^selectable\/[a-z0-9][a-z0-9_-]*$/, 'Unsafe native fixture identity');
    assert.ok(d.baseFixture == null || ['canonical', 'boundary'].includes(d.baseFixture), 'Invalid native base fixture');
    assert.ok(typeof d.file === 'string' && !path.isAbsolute(d.file), 'Native packet path must be repository-relative');
    assert.ok(!d.file.split(/[\\/]/).includes('..'), 'Native packet path contains traversal');
    assert.match(d.sha256 ?? '', /^[a-f0-9]{64}$/, 'Native packet needs its SHA-256');
    assert.ok(Number.isSafeInteger(d.byteLength) && d.byteLength > 0, 'Native packet needs its byte length');
    assert.ok(Number.isSafeInteger(d.pageCount) && d.pageCount > 0, 'Native packet needs its page count');
    const target = path.resolve(root, d.file);
    const expected = path.join(home, `${d.fixture}.pdf`);
    assert.equal(target, expected, 'Native fixture identity and output path disagree');
    assert.ok(!fs.lstatSync(target).isSymbolicLink(), 'Native packet must not be a symlink');
    assert.equal(fs.realpathSync(target), expected, 'Native packet escapes its fixture directory');
    const name = `${d.fixture}.pdf`;
    assert.ok(!seen.has(name), 'Duplicate native selectable packet');
    const bytes = fs.readFileSync(target);
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', 'Native output is not PDF');
    assert.equal(bytes.length, d.byteLength, 'Native packet byte length drift');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), d.sha256, 'Native packet digest drift');
    seen.add(name);
    selected.push({ role: d.baseFixture ?? 'canonical', name,
      declaredPageCount: d.pageCount, branch: d.fixture });
  }
  const nativeDir = path.join(home, 'selectable');
  const inspectNativeDirectory = dir => {
    assert.ok(!fs.lstatSync(dir).isSymbolicLink(), 'Native fixture directory must not be a symlink');
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      assert.ok(!entry.isSymbolicLink(), 'Native fixture must not be a symlink');
      if (entry.isDirectory()) inspectNativeDirectory(file);
      else if (entry.name.endsWith('.pdf')) {
        const name = path.relative(home, file).split(path.sep).join('/');
        assert.ok(seen.has(name), 'A native selectable PDF is absent from the declaration');
      }
    }
  };
  if (fs.existsSync(nativeDir)) inspectNativeDirectory(nativeDir);
  return selected.sort((a,b) => a.name.localeCompare(b.name, 'en'));
}
