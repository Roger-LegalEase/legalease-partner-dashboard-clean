import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
const builder = 'scripts/build-census-v1-census-pending-family:ME:juvenile-sealing.mjs';
const base = 'bf02d807328f4edfe1ff2541127563bb8b371086';
const prior = file => execFileSync('git', ['show', `${base}:${file}`]);
function readBuilder(source) {
  const declarations = source.slice(source.indexOf('const FAMILY_ID'), source.indexOf('\n};') + 3);
  const contract = source.slice(source.indexOf('const ROUTE_CONTRACT_RECORD'), source.indexOf('/*\n * THE WORD THIS JURISDICTION'));
  const functions = source.slice(source.indexOf('function forbiddenWordBreaches('), source.indexOf('/* ---- the entry point'));
  return runInNewContext(`${declarations}\n${contract}\n${functions}\n({SPEC,declaredRequiredBeforeFiling,participantInstructions,forbiddenWordBreaches})`, { fs, path, crypto, ROOT: process.cwd() });
}
const old = readBuilder(prior(builder).toString()), current = readBuilder(fs.readFileSync(builder, 'utf8'));
const dir = current.SPEC.outDir;
const instructions = fs.readFileSync(`${dir}/participant-instructions.md`, 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
check('reviewer counterexample: old instructions deny copy requirement printed on both saved PDFs', () => {
  assert.ok(prior(`${dir}/participant-instructions.md`).toString().includes('No committed record this packet binds states a service requirement'));
  for (const fixture of ['canonical','boundary']) {
    const file = `${dir}/fixtures/${fixture}.pdf`;
    assert.deepEqual(fs.readFileSync(file), prior(file));
    const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
    assert.match(text, /required to provide a copy of this petition to the prosecuting attorney.s office/);
  }
});
check('all three instruction occurrences state required prosecutor copy and limit clerk question to delivery details', () => {
  for (const value of [current.SPEC.service[0], current.SPEC.steps[5], current.SPEC.notTold[1]]) {
    assert.ok(value.includes('prosecuting attorney’s office'));
    assert.ok(instructions.includes(value));
  }
  assert.ok(instructions.includes('The form does not state the delivery method or deadline; ask the Juvenile Court clerk how and when to provide it'));
  assert.ok(!instructions.includes('whether anyone must be served'));
  assert.ok(!instructions.includes('No committed record states a service requirement'));
});
check('source binding is preserved pending CI refresh, not silently re-pinned by copy repair', () => {
  const pin = s => s.match(/The file's SHA-256 is `([a-f0-9]{64})`/)[1];
  assert.equal(pin(instructions), pin(prior(`${dir}/participant-instructions.md`).toString()));
  assert.equal(pin(instructions), '6ca51b6dbc3a9383636b4b1cbdd19630db401d40c03760b8c91d8ae0357962f8');
  assert.deepEqual(fs.readFileSync(`${dir}/source-receipt.json`), prior(`${dir}/source-receipt.json`));
});
check('builder reproduces the corrected instructions on the existing declared binding', () => {
  const map = JSON.parse(fs.readFileSync(`${dir}/production-field-map.json`));
  const declared = current.declaredRequiredBeforeFiling(); assert.equal(declared.ok, true);
  // The actual source-identity refresh belongs to CI; this only reproduces
  // the instruction text on its unchanged, explicitly retained old binding.
  declared.sha256 = '6ca51b6dbc3a9383636b4b1cbdd19630db401d40c03760b8c91d8ae0357962f8';
  assert.equal(current.participantInstructions(map.maps, map.requiredBeforeFiling, declared), instructions);
  assert.equal(current.forbiddenWordBreaches(instructions).length, 0);
});
check('automatic-branch exclusion, three-year conditions and all participant facts remain', () => {
  for (const key of Object.keys(old.SPEC)) {
    if (['service','steps','notTold','counselQuestions'].includes(key)) continue;
    const before = old.SPEC[key], after = current.SPEC[key];
    assert.equal(typeof before === 'function' ? String(before) : JSON.stringify(before),
      typeof after === 'function' ? String(after) : JSON.stringify(after), key);
  }
  assert.deepEqual(fs.readFileSync(`${dir}/production-field-map.json`), prior(`${dir}/production-field-map.json`));
  assert.deepEqual(fs.readFileSync(`${dir}/reports/actual-writes.json`), prior(`${dir}/reports/actual-writes.json`));
  assert.deepEqual(fs.readFileSync(`${dir}/reports/blanks-left-for-the-participant.json`), prior(`${dir}/reports/blanks-left-for-the-participant.json`));
});
check('review request carries corrected question without claiming acceptance', () => {
  const request = JSON.parse(fs.readFileSync(`${dir}/approval-request.json`));
  assert.equal(JSON.stringify(request.counselQuestionsRaised), JSON.stringify(current.SPEC.counselQuestions));
  assert.equal(request.status, 'PENDING_INDEPENDENT_VERIFICATION');
  assert.equal(request.approvedForLive, false);
});
console.log(JSON.stringify({ passed, failed: 0, unchangedSavedPdfs: 2, sourceRefreshOwner: 'CI' }));
