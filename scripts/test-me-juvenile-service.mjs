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
check('source binding differs only by the independently reviewed CI refresh', () => {
  const pin = s => s.match(/The file's SHA-256 is `([a-f0-9]{64})`/)[1];
  assert.equal(pin(instructions), pin(prior(`${dir}/participant-instructions.md`).toString()));
  assert.equal(pin(instructions), '6ca51b6dbc3a9383636b4b1cbdd19630db401d40c03760b8c91d8ae0357962f8');
  const previousReceipt = prior(`${dir}/source-receipt.json`);
  const previous = JSON.parse(previousReceipt);
  const assertPreserved = value => {
    const receipt = structuredClone(value);
    const census = receipt.committedRecords[0];
    assert.deepEqual(census.identityRefresh.was, { sha256: previous.committedRecords[0].sha256, byteLength: previous.committedRecords[0].byteLength });
    assert.equal(census.identityRefresh.anchorsCompared, 2);
    assert.equal(census.identityRefresh.anchorsIdentical, 2);
    // Only CI's reviewed 2409a9ef3 JV-043 correction and 1617d7de3 census refresh may differ.
    const approvedChanges = [
      ["committedRecords", 0, "sha256", "eeabd8b97786dd3eb5cb9a9d65e26d0a158602f9e88971fd1d11b6d1355eb8e9"],
      ["committedRecords", 0, "byteLength", 2635434],
      ["committedRecords", 0, "identityRefresh", {"approvedAnnotationSha256": "3860d79b4798f38bb431cb0de9990f9a9fb3e43330f0b988e133fecbe01c979e"}],
      ["documents", 0, "byteLength", 173449],
      ["documents", 0, "corpusIndexAgrees", true],
      ["documents", 0, "byteLengthCorrection", {"approvedAnnotationSha256": "1776eb3a48c0893e32730faade993ad41e164e686f47ce46646d5bb316dde068"}]
    ];
    for (const [group, index, key, expected] of approvedChanges) {
      const actual = receipt[group][index][key];
      if (expected && typeof expected === 'object') {
        assert.equal(crypto.createHash('sha256').update(JSON.stringify(actual)).digest('hex'), expected.approvedAnnotationSha256, key);
      } else assert.deepEqual(actual, expected, key);
      if (Object.hasOwn(previous[group][index], key)) receipt[group][index][key] = previous[group][index][key];
      else delete receipt[group][index][key];
    }
    assert.deepEqual(Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`), previousReceipt);
  };
  const receipt = JSON.parse(fs.readFileSync(`${dir}/source-receipt.json`, 'utf8'));
  assertPreserved(receipt);
  for (const [group, key] of [['committedRecords', 'sha256'], ['committedRecords', 'byteLength'], ['committedRecords', 'identityRefresh'],
    ['documents', 'byteLength'], ['documents', 'corpusIndexAgrees'], ['documents', 'byteLengthCorrection'], ['documents', 'sha256']]) {
    const altered = structuredClone(receipt); altered[group][0][key] = null;
    assert.throws(() => assertPreserved(altered), `${group}.${key} must not drift`);
  }
  for (const key of ['sha256', 'role']) {
    const altered = structuredClone(receipt); altered.committedRecords[1][key] = 'unrelated change';
    assert.throws(() => assertPreserved(altered), `unrelated ${key} must not drift`);
  }
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
