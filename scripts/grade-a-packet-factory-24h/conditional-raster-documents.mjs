/** Read explicitly declared selectable packets; an assembled diagnostic PDF
 * does not cover the separate conditional outputs a participant may receive. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { FAMILY as GA_FAMILY, fixtures as gaFixtures, validateGa } from '../rcap-packet-recovery/chat5/ga-pre2013.mjs';
import { alcoholFixtures as ia12346Fixtures, FAMILY as IA12346_FAMILY } from '../rcap-packet-recovery/chat8/ia-12346.mjs';
import { fixtureFacts as ia901c3Fixtures, FAMILY as IA901C3_FAMILY } from '../rcap-packet-recovery/chat8/ia-901c3.mjs';
import { mdConditionalRasterDocuments } from './md-conditional-raster-documents.mjs';


/*
 * Iowa's Chat8 builders emit one complete assembled packet for every fixture
 * variant in `reports/rendered-artifacts.json#packets`. Those are native
 * whole-packet outputs, not conditional branch elections: the builder's
 * fixture function is the contract for the complete set, while the report
 * binds each current file's identity, bytes and page count. Keep this narrow
 * to these two returned families so the established conditional/native readers
 * retain their existing document sets.
 */
const iaWholePacketFixtureContract = familyId => {
  if (familyId === IA12346_FAMILY) return Object.keys(ia12346Fixtures());
  if (familyId === IA901C3_FAMILY) return Object.keys(ia901c3Fixtures());
  return null;
};

const pdfInfoPageCount = file => {
  const result = spawnSync('pdfinfo', [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(result.status, 0, `Unable to parse native whole-packet PDF with pdfinfo: ${file}`);
  const hit = String(result.stdout ?? '').match(/^Pages:\s+(\d+)\s*$/m);
  const pages = hit ? Number(hit[1]) : 0;
  assert.ok(Number.isSafeInteger(pages) && pages > 0, `Native whole-packet PDF has no positive page count: ${file}`);
  return pages;
};

const iaWholePacketDocuments = ({ report, fixtures, root, expectedFixtures }) => {
  assert.ok(Array.isArray(report?.packets), `${report?.familyId} must declare packets`);
  const home = fs.realpathSync(fixtures);
  const expectedNames = expectedFixtures.map(fixture => `${fixture}.pdf`).sort();
  const allowedNames = new Set(expectedFixtures.flatMap(fixture => [`${fixture}.pdf`, `${fixture}.json`]));
  const entries = fs.readdirSync(home, { withFileTypes: true });
  for (const entry of entries) {
    assert.ok(entry.isFile() && allowedNames.has(entry.name), `${report.familyId} has an unsafe or unknown fixture entry: ${entry.name}`);
  }
  const actualNames = entries.filter(entry => entry.name.endsWith('.pdf')).map(entry => entry.name).sort();
  assert.deepEqual(actualNames, expectedNames, `${report.familyId} fixture PDF inventory differs from its builder contract`);

  const seen = new Set();
  const selected = [];
  for (const packet of report.packets) {
    assert.ok(expectedFixtures.includes(packet?.fixture), `${report.familyId} report declares an unknown fixture`);
    assert.ok(!seen.has(packet.fixture), `${report.familyId} report declares a duplicate fixture`);
    seen.add(packet.fixture);
    assert.equal(typeof packet.path, 'string', `${report.familyId}/${packet.fixture} needs its repository-relative path`);
    assert.equal(typeof packet.relativePath, 'string', `${report.familyId}/${packet.fixture} needs its fixture-relative path`);
    const expectedRelativePath = `fixtures/${packet.fixture}.pdf`;
    assert.equal(packet.relativePath, expectedRelativePath, `${report.familyId}/${packet.fixture} fixture identity drift`);
    const target = path.join(home, `${packet.fixture}.pdf`);
    assert.equal(packet.path, path.relative(root, target).split(path.sep).join('/'), `${report.familyId}/${packet.fixture} packet path must be its exact repository-relative fixture path`);
    assert.equal(path.resolve(root, packet.path), target, `${report.familyId}/${packet.fixture} packet path does not resolve inside its fixture directory`);
    assert.equal(path.relative(home, target), `${packet.fixture}.pdf`, `${report.familyId}/${packet.fixture} packet path is not its exact fixture file`);
    assert.match(packet.sha256 ?? '', /^[a-f0-9]{64}$/, `${report.familyId}/${packet.fixture} packet needs its SHA-256`);
    assert.ok(Number.isSafeInteger(packet.bytes) && packet.bytes > 0, `${report.familyId}/${packet.fixture} packet needs its byte length`);
    assert.ok(Number.isSafeInteger(packet.pageCount) && packet.pageCount > 0, `${report.familyId}/${packet.fixture} packet needs its page count`);
    assert.equal(fs.readFileSync(target).subarray(0, 5).toString(), '%PDF-', `${report.familyId}/${packet.fixture} output is not PDF`);
    const bytes = fs.readFileSync(target);
    assert.equal(bytes.length, packet.bytes, `${report.familyId}/${packet.fixture} packet byte length drift`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), packet.sha256, `${report.familyId}/${packet.fixture} packet digest drift`);
    assert.equal(pdfInfoPageCount(target), packet.pageCount, `${report.familyId}/${packet.fixture} packet page count drift`);
    selected.push({
      role: packet.fixture === 'boundary' ? 'boundary' : 'canonical',
      name: `${packet.fixture}.pdf`, declaredPageCount: packet.pageCount,
      branch: packet.fixture, selectionKind: 'native_complete_fixture',
      filingReady: packet.filingReady === true,
    });
  }
  assert.deepEqual([...seen].sort(), expectedFixtures.slice().sort(), `${report.familyId} report fixture inventory differs from its builder contract`);
  assert.equal(selected.length, expectedFixtures.length, `${report.familyId} must enroll every builder fixture`);
  return selected.sort((a, b) => a.name.localeCompare(b.name, 'en'));
};

export function conditionalPacketDocuments({ report, fixtures, root }) {
  // Each Montana candidate declares three complete diagnostic packets.
  // Preserve the route's own report and enroll its exact saved fixture set.
  if (['mt_deferred_dismissal-set', 'mt_misdemeanor_expungement-set'].includes(report?.familyId)) {
    const names = report.familyId === 'mt_deferred_dismissal-set'
      ? ['boundary', 'canonical', 'verdict-justice'] : ['boundary', 'canonical', 'military'];
    assert.deepEqual(report.artifacts.map(d => d.fixture).sort(), names);
    assert.deepEqual(fs.readdirSync(fixtures).filter(n => n.endsWith('.pdf')).sort(), names.map(n => `${n}.pdf`));
    return report.artifacts.map(d => {
      const file = path.resolve(fixtures, `${d.fixture}.pdf`);
      assert.equal(path.resolve(root, d.file), file);
      assert.ok(!fs.lstatSync(file).isSymbolicLink());
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.length, d.byteLength);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), d.sha256);
      assert.equal(pdfInfoPageCount(file), d.pageCount);
      assert.equal(d.completeFamily, true);
      return { role: d.fixture === 'canonical' ? 'canonical' : 'boundary',
        name: `${d.fixture}.pdf`, declaredPageCount: d.pageCount,
        branch: d.fixture, selectionKind: 'diagnostic', filingReady: false };
    });
  }
  if (['md_10110_conviction-set', 'md_cannabis_petition-set'].includes(report?.familyId)) return mdConditionalRasterDocuments({report, fixtures, root});
  const iaFixtureContract = iaWholePacketFixtureContract(report?.familyId);
  if (iaFixtureContract) return iaWholePacketDocuments({ report, fixtures, root, expectedFixtures: iaFixtureContract });
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
