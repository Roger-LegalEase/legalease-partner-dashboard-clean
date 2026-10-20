import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { FAMILY } from './build-census-v1-agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement.mjs';
const base = 'bf02d807328f4edfe1ff2541127563bb8b371086';
const prior = file => execFileSync('git', ['show', `${base}:${file}`]);
const normalize = s => s.replace(/\s+/g, ' ').trim();
const pdfText = input => normalize(execFileSync('pdftotext', ['-layout', '-', '-'], { input, encoding: 'utf8' }));
const instructions = fs.readFileSync(`${FAMILY.outDir}/participant-instructions.md`, 'utf8');
const stop = instructions.split('\n').find(s => s.startsWith('The legal review behind this guide'));
const service = instructions.split('\n').find(s => s.startsWith('This preparation guide is not served'));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
check('both new disclosures match the held source boundary', () => {
  const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/NM.memo.json'));
  const track = memo.tracks.find(t => t.trackId === 'nm_dna_expungement');
  assert.equal(track.rules.service, 'Not determined.');
  assert.equal(track.rules.notice, 'Not determined.');
  assert.ok(track.selfHelpStopConditions.includes('Every matter under this section, until the statutory text is read at an official channel and the receiving agency and request format are established.'));
  assert.ok(stop.includes('has not verified Section 29-16-10 at an official New Mexico source'));
  assert.ok(stop.includes('Stop before applying until the statutory text has been checked at an official source and the receiving agency and request format are established'));
  assert.ok(service.includes('held sources do not establish a service or notice rule'));
  assert.ok(service.includes('ask the New Mexico Department of Public Safety whether anyone besides the receiving agency must receive a copy or notice and how'));
});
check('instructions change only by the two assigned disclosures', () => {
  assert.equal(instructions.replace(stop + '\n', '').replace(service + '\n', ''), prior(`${FAMILY.outDir}/participant-instructions.md`).toString());
});
for (const [fixture, facts] of Object.entries(FAMILY.fixtures)) {
  const file = `${FAMILY.outDir}/fixtures/${fixture}.pdf`;
  // Current adopted host removes the internal route footer on regeneration.
  const old = pdfText(prior(file)).replace(` Route: ${FAMILY.route.routeKeys[0]}`, '');
  const current = pdfText(fs.readFileSync(file));
  check(`${fixture}: rejected candidate lacks both required disclosures`, () => {
    assert.ok(!old.includes('has not verified Section 29-16-10'));
    assert.ok(!old.includes('must receive a copy or notice'));
  });
  check(`${fixture}: saved bytes add exactly the stop and service disclosure`, () => {
    assert.ok(current.includes(stop)); assert.ok(current.includes(service));
    assert.equal(normalize(current.replace('STOP BEFORE APPLYING: STATUTORY TEXT AND RECEIVING OFFICE', '')
      .replace(stop, '').replace('WHO MUST RECEIVE A COPY OR NOTICE?', '').replace(service, '')), old);
  });
  check(`${fixture}: prior-felony exclusion and no-felony-charge branch boundaries preserved`, () => {
    assert.ok(current.includes('Relief is unavailable where the person has a prior felony conviction or a pending felony charge for which DNA collection is authorized'));
    assert.ok(current.includes('one-year condition is a substantive lookback only for the no-felony-charge branch, not a universal wait'));
    assert.ok(current.includes('certified documentation or a sworn affirmation'));
    assert.ok(instructions.includes('post-request processing periods, never prefiling waits'));
  });
  check(`${fixture}: saved/owned facts unchanged`, () => {
    const saved = JSON.stringify(facts), body = FAMILY.composedBody(FAMILY.components[0].id, facts);
    for (const value of Object.values(facts)) assert.ok(body.includes(value));
    assert.equal(JSON.stringify(facts), saved);
    const currentWrites = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/reports/actual-writes.json`));
    const oldWrites = JSON.parse(prior(`${FAMILY.outDir}/reports/actual-writes.json`));
    assert.deepEqual(currentWrites.documents.find(d => d.fixture === fixture).actualWrites,
      oldWrites.documents.find(d => d.fixture === fixture).actualWrites);
  });
}
check('field map and all six required fact obligations unchanged', () => {
  for (const file of ['production-field-map.json', 'reports/blanks-left-for-the-participant.json'])
    assert.deepEqual(fs.readFileSync(`${FAMILY.outDir}/${file}`), prior(`${FAMILY.outDir}/${file}`));
});
check('nine measured counters zero; review and delivery gates retained', () => {
  const counts = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/reports/completeness-counters.json`)).counters;
  assert.equal(Object.keys(counts).length, 9); for (const count of Object.values(counts)) assert.equal(count, 0);
  const status = JSON.parse(fs.readFileSync(`${FAMILY.outDir}/build-status.json`));
  assert.equal(status.generationAllowed, false); assert.equal(status.independentVerificationStatus, 'PENDING');
});
console.log(JSON.stringify({ passed, failed: 0 }));
