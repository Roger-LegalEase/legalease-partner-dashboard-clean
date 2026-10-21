import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { FAMILY_IDS, SOURCE, SOURCE_SHA, familyDir, fixturesFor, nextSteps, readSource, sha256 } from './michigan.mjs';

const evidence = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const archive = 'inputs/session08-mi/CHAT9_MICHIGAN_CORRECTED_CANDIDATES_2026-09-07.tar.xz';
assert.equal(sha256(fs.readFileSync(archive)), 'd005e7b18feb2e700814b193574f5fdaf8f00303865fda820842aef766fb656e');
const manifest = JSON.parse(execFileSync('tar', ['-xOJf', archive, 'CANDIDATE_MANIFEST.json'], { encoding: 'utf8' }));
const changes = new Set(JSON.parse(fs.readFileSync(`${evidence}/mi-citation-delta.json`)).changes.map(row => row.path));
const oldLabel = 'Victim notice, MCL 780.621d(11),';
const newLabel = 'Victim notice, MCL 780.621d(10),';

for (const family of FAMILY_IDS) {
  for (const [fixture, input] of Object.entries(fixturesFor(family))) {
    test(`${family}/${fixture}: exact regenerated guide contains only the bounded citation delta`, () => {
      const file = `${familyDir(family)}/${fixture}-next-steps.md`;
      const actual = fs.readFileSync(file, 'utf8');
      assert.equal(actual, nextSteps(input, fixture));
      assert.equal(actual.split(newLabel).length - 1, 1);
      assert(!actual.includes(oldLabel));
      assert.equal(sha256(Buffer.from(actual.replace(newLabel, oldLabel))), manifest.files.find(row => row.path === file).sha256);
    });
  }
  test(`${family}: participant guide is the exact canonical guide`, () => {
    assert.equal(fs.readFileSync(`${familyDir(family)}/participant-instructions.md`, 'utf8'), nextSteps(fixturesFor(family).canonical, 'canonical'));
  });
}

test('all 177 reviewed payload members are unchanged except the declared 17 pinpoint replacements', () => {
  assert.equal(manifest.files.length, 177);
  assert.equal(changes.size, 17);
  for (const row of manifest.files) {
    const actual = fs.readFileSync(row.path);
    const comparable = changes.has(row.path) ? Buffer.from(actual.toString().replace(newLabel, oldLabel)) : actual;
    assert.equal(sha256(comparable), row.sha256, row.path);
  }
  assert.equal(manifest.files.filter(row => row.path.includes('/overlays/') && row.path.endsWith('.pdf')).length, 14);
});

test('current issuer MC227 bytes match the held accepted source; all 106 fields and 108 widgets remain measurable', async () => {
  assert.equal(sha256(fs.readFileSync(`${evidence}/source-mi-mo/mc227-current.pdf`)), SOURCE_SHA);
  assert.equal(sha256(fs.readFileSync(SOURCE)), SOURCE_SHA);
  const source = await readSource();
  assert.equal(source.doc.getPageCount(), 4);
  assert.equal(source.census.length, 106);
  assert.equal(source.census.reduce((sum, row) => sum + row.widgets.length, 0), 108);
});

test('the actual installed source reader refuses one mutated source byte before rendering', () => {
  const script = `import fs from 'node:fs'; import assert from 'node:assert/strict';
    import { readSource, SOURCE } from './scripts/rcap-packet-recovery/chat9/michigan.mjs';
    const original = fs.readFileSync;
    fs.readFileSync = function(file, ...args) { const data = original.call(this, file, ...args);
      if (String(file).endsWith(SOURCE)) { const changed = Buffer.from(data); changed[100] ^= 1; return changed; } return data; };
    await assert.rejects(readSource(), /MC227 source drift/);`;
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' });
});
