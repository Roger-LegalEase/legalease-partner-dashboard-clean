import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { FAMILY } from './build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs';
const base = 'bf02d807328f4edfe1ff2541127563bb8b371086';
const prior = file => execFileSync('git', ['show', `${base}:${file}`]);
const normalize = s => s.replace(/\s+/g, ' ').trim();
const text = input => execFileSync('pdftotext', ['-layout', '-', '-'], { input, encoding: 'utf8' });
const instruction = fs.readFileSync(`${FAMILY.outDir}/participant-instructions.md`, 'utf8');
const disclosure = instruction.split('\n').find(s => s.startsWith('Nothing in this preparation guide is served'));
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS ${name}`); }
check('source-supported service uncertainty remains explicit', () => {
  const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/AL.memo.json'));
  assert.equal(memo.tracks.find(t => t.trackId === 'al-uncharged-arrest').rules.service, 'Unresolved.');
  assert.ok(disclosure.includes('held sources do not establish who must receive a copy or notice'));
  assert.ok(disclosure.includes("ask that agency's records unit whether anyone else must receive a copy or notice and how"));
  assert.ok(disclosure.includes("ALEA/ACJIC's or the originating agency's"));
});
check('participant instructions add only the bounded disclosure', () => {
  assert.equal(instruction.replace(disclosure + '\n', ''), prior(`${FAMILY.outDir}/participant-instructions.md`).toString());
});
for (const [fixture, facts] of Object.entries(FAMILY.fixtures)) {
  const file = `${FAMILY.outDir}/fixtures/${fixture}.pdf`;
  // The already-adopted host omits the internal route footer on regeneration.
  const old = normalize(text(prior(file))).replace(` Route: ${FAMILY.route.routeKeys[0]}`, '');
  const current = normalize(text(fs.readFileSync(file)));
  check(`${fixture}: counterexample lacks a service answer`, () => {
    assert.ok(!old.includes('Nothing in this preparation guide is served'));
    assert.ok(!old.includes('whether you must send a copy or notice'));
  });
  check(`${fixture}: saved output gives mechanism, unresolved boundary and named office`, () => {
    assert.ok(current.includes(disclosure));
    assert.equal(normalize(current.replace('WHO MUST RECEIVE A COPY OR NOTICE?', '').replace(disclosure, '')), old);
  });
  check(`${fixture}: actual exclusion and attorney handoff remain`, () => {
    assert.ok(current.includes('If the record is accurate and the goal is expungement, stop'));
    assert.ok(instruction.includes('A disputed material fact or a final agency denial is an attorney handoff'));
  });
  check(`${fixture}: all five owned facts preserved without mutation`, () => {
    const saved = JSON.stringify(facts);
    const body = FAMILY.composedBody(FAMILY.components[0].id, facts);
    for (const value of Object.values(facts)) assert.ok(body.includes(value));
    assert.equal(JSON.stringify(facts), saved);
    const writes = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/reports/actual-writes.json`));
    const oldWrites = JSON.parse(prior(`${FAMILY.outDir}/reports/actual-writes.json`));
    assert.deepEqual(writes.documents.find(d => d.fixture === fixture).actualWrites,
      oldWrites.documents.find(d => d.fixture === fixture).actualWrites);
  });
}
check('field map and protected/required blanks unchanged', () => {
  for (const file of ['production-field-map.json', 'reports/blanks-left-for-the-participant.json'])
    assert.deepEqual(fs.readFileSync(`${FAMILY.outDir}/${file}`), prior(`${FAMILY.outDir}/${file}`));
});
check('all measured counters remain zero and no delivery authority created', () => {
  const report = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/reports/completeness-counters.json`));
  assert.equal(Object.keys(report.counters).length, 9);
  for (const count of Object.values(report.counters)) assert.equal(count, 0);
  const status = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/build-status.json`));
  assert.equal(status.generationAllowed, false);
  assert.equal(status.independentVerificationStatus, 'PENDING');
});
console.log(JSON.stringify({ passed, failed: 0 }));
