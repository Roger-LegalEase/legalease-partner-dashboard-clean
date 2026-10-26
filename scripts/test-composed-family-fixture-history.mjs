import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { FAMILY } from './build-census-v1-ms-nonconv-set.mjs';
import { runComposedFamily } from './rcap-custom-pleading/composed-family-host.mjs';

// VF16 / RI-12: exercise the shared host with actual saved PDF evidence.
const directory = process.env.MS_HOST_EVIDENCE;
assert(directory && path.isAbsolute(directory) && !fs.existsSync(directory), 'fresh external evidence directory');
fs.mkdirSync(directory, { recursive: true });
const original = { outDir: FAMILY.outDir, fixtures: FAMILY.fixtures, maps: FAMILY.maps, body: FAMILY.composedBody, settled: FAMILY.counselQuestionsSettled };
const historical = JSON.parse(execFileSync('git', ['show', 'db7de53323e5ec89775750ba3af80b3bc148460b:' + FAMILY.outDir + '/approval-request.json'], { encoding: 'utf8' }));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const checks = [], outputs = [];
function check(name, fn) { fn(); checks.push(name); }
async function build(name) {
  FAMILY.outDir = path.relative(process.cwd(), path.join(directory, name));
  const before = structuredClone(FAMILY.fixtures);
  const result = await runComposedFamily(FAMILY, []);
  assert.deepEqual(FAMILY.fixtures, before, 'host preserves input facts');
  assert.equal(result.status, 'COMPLETED', JSON.stringify(result));
  const output = path.join(directory, name);
  outputs.push({ name, result }); return output;
}
try {
  const output = await build('settled-history');
  check('entire existing approval history survives regeneration', () => assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'approval-request.json'))), historical));
  const baselineHashes = Object.fromEntries(['canonical', 'boundary'].map(f => [f, digest(fs.readFileSync(path.join(output, 'fixtures', f + '.pdf')))]));
  delete FAMILY.counselQuestionsSettled;
  const absent = await build('absent-settled-history');
  check('absent settled history remains absent', () => assert(!Object.hasOwn(JSON.parse(fs.readFileSync(path.join(absent, 'approval-request.json'))), 'counselQuestionsSettled')));
  check('history emission cannot change PDF bytes', () => { for (const f of ['canonical', 'boundary']) assert.equal(digest(fs.readFileSync(path.join(absent, 'fixtures', f + '.pdf'))), baselineHashes[f]); });
  FAMILY.counselQuestionsSettled = original.settled;
  FAMILY.maps = () => original.maps().map(map => { const copy = { ...map }; delete copy.boundaryWrites; return copy; });
  const fallback = await build('legacy-missing-boundary-map');
  check('legacy absent-boundary fallback still proves every canonical write', () => {
    const proof = JSON.parse(fs.readFileSync(path.join(fallback, 'reports/actual-writes.json')));
    const docs = proof.documents; assert(docs.some(d => d.fixture === 'boundary'));
    for (const f of ['canonical', 'boundary']) assert.equal(digest(fs.readFileSync(path.join(fallback, 'fixtures', f + '.pdf'))), baselineHashes[f]);
    assert.deepEqual(docs.find(d => d.fixture === 'boundary').actualWrites.map(w => [w.document, w.field, w.factId]), docs.find(d => d.fixture === 'canonical').actualWrites.map(w => [w.document, w.field, w.factId]));
  });
  FAMILY.maps = original.maps;
  const narrative = 'This synthetic participant statement belongs only to the boundary fixture.';
  FAMILY.fixtures = {
    canonical: { ...original.fixtures.canonical, personal_impact_confirmed: 'No', personal_impact_statement: narrative },
    boundary: { ...original.fixtures.boundary, personal_impact_confirmed: 'Yes', personal_impact_statement: narrative }
  };
  const reverse = await build('boundary-only-statement');
  check('boundary-owned positive write is actually verified', () => {
    const proof = JSON.parse(fs.readFileSync(path.join(reverse, 'reports/actual-writes.json')));
    for (const f of ['canonical', 'boundary']) {
      const text = execFileSync('pdftotext', ['-layout', path.join(reverse, 'fixtures', f + '.pdf'), '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
      assert.equal(text.includes(narrative), f === 'boundary');
      assert.equal(proof.documents.find(d => d.fixture === f).actualWrites.some(w => w.factId === 'personal_impact_statement'), f === 'boundary');
    }
  });
  FAMILY.composedBody = (id, facts) => original.body(id, facts).replace(narrative, '');
  FAMILY.outDir = path.relative(process.cwd(), path.join(directory, 'missing-boundary-promised-write'));
  await assert.rejects(runComposedFamily(FAMILY, []), /boundary .*personal_impact_statement.*not readable from the output bytes/);
  checks.push('missing boundary-promised write fails on actual saved bytes');
  FAMILY.fixtures = { canonical: { ...original.fixtures.canonical, personal_impact_confirmed: 'Yes', personal_impact_statement: narrative }, boundary: original.fixtures.boundary };
  FAMILY.outDir = path.relative(process.cwd(), path.join(directory, 'missing-canonical-promised-write'));
  await assert.rejects(runComposedFamily(FAMILY, []), /canonical .*personal_impact_statement.*not readable from the output bytes/);
  checks.push('canonical missing-write protection remains exact');
} finally {
  FAMILY.outDir = original.outDir; FAMILY.fixtures = original.fixtures; FAMILY.maps = original.maps;
  FAMILY.composedBody = original.body; FAMILY.counselQuestionsSettled = original.settled;
}
const result = { status: 'PASS', checks, outputs };
fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, successfulBuilds: outputs.length }));
