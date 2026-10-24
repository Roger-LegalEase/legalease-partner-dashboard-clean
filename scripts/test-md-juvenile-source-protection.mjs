import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as current from './rcap-official-forms/rcap-field-semantics.mjs';
const baseline = execFileSync('git', ['show', '3d5df5e337949c703747a730dd211f7a76f1da49:scripts/rcap-official-forms/rcap-field-semantics.mjs'], { encoding: 'utf8' });
const load = source => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const before = await load(baseline), source = fs.readFileSync('scripts/rcap-official-forms/rcap-field-semantics.mjs', 'utf8');
const context = { sourceSha256: '24fcb98eb0af35906252a424011a00d14ed393ed5451b01219ed5653c4c10a92' };
const subjects = ['The States Attorney entered a nolle prosequi', 'The court in a disposition hearing found that I did not require guidance treatment or', 'The court in a disposition hearing found that I did require guidance treatment or', 'I have not subsequently been convicted of any offense', 'I have fully paid any monetary restitution ordered by the court in the delinquency', 'Law Enforcement Agency'];
function boundaries(mod) {
  for (const name of subjects) {
    assert.notEqual(before.protectCategoryOf(name), null);
    assert.equal(mod.protectCategoryOf(name, context), null);
    for (const scope of [undefined, { sourceSha256: '0'.repeat(64) }]) assert.equal(mod.protectCategoryOf(name, scope), before.protectCategoryOf(name));
    for (const variant of [name + ' ', name + ' Signature']) assert.equal(mod.protectCategoryOf(variant, context), before.protectCategoryOf(variant));
  }
  for (const name of ['Signature', 'Certificate of Service', 'Jurat', 'Signing Date', 'constructor', '__proto__', 'toString']) assert.equal(mod.protectCategoryOf(name, context), before.protectCategoryOf(name));
  for (const field of [
    { name: 'Signature', effectiveLabel: 'Law Enforcement Agency' },
    { name: 'Law Enforcement Agency', effectiveLabel: 'Signature' },
    { name: 'Name', effectiveLabel: 'Law Enforcement Agency', regionHeading: 'Certificate of Service' }
  ]) assert.deepEqual(mod.decideBinding({ ...field, pdfType: 'text' }, context), current.decideBinding({ ...field, pdfType: 'text' }, context));
}
boundaries(current);
const mutations = [
  ['remove source guard', source.replace(/sourceSha256 === "24fcb98e[^"]*" && /, '')],
  ['remove name protection', source.replace(' ?? protectCategoryOf(name, options)', '')],
  ['remove printed-label protection', source.replace('protectCategoryOf(subject, options) ?? ', '')],
  ['widen to whitespace variants', source.replaceAll('MD_JUVENILE_PARTICIPANT_SUBJECTS, name)', 'MD_JUVENILE_PARTICIPANT_SUBJECTS, String(name).trim())').replaceAll('MD_JUVENILE_PARTICIPANT_SUBJECTS[name]', 'MD_JUVENILE_PARTICIPANT_SUBJECTS[String(name).trim()]')],
  ['drop secondary attorney exemption', source.replace('["prosecutor", "attorney"]', '["prosecutor"]')]
];
for (const [name, mutant] of mutations) { assert.notEqual(mutant, source, name); const mod = await load(mutant); assert.throws(() => boundaries(mod), undefined, name); }
const files = execFileSync('git', ['ls-files', 'data/rcap-all50/overlays/census-v1'], { encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('/production-field-map.json'));
const rows = []; let fields = 0;
for (const file of files) {
  const names = new Set();
  const walk = value => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
    if (['field', 'fieldName', 'name', 'effectiveLabel', 'printedLabel', 'label'].includes(key) && typeof entry === 'string') names.add(entry);
    else if (entry && typeof entry === 'object') walk(entry);
  } };
  walk(JSON.parse(fs.readFileSync(file, 'utf8')));
  const result = [...names].sort().map(name => { const old = before.protectCategoryOf(name); assert.equal(current.protectCategoryOf(name), old); assert.equal(current.protectCategoryOf(name, { sourceSha256: '0'.repeat(64) }), old); return [name, old]; });
  fields += result.length; rows.push({ file, subjects: result.length, classificationSha256: createHash('sha256').update(JSON.stringify(result)).digest('hex') });
}
const result = { status: 'PASS', mutantsDetected: mutations.map(([name]) => name), families: files.length, fields, rows };
if (process.env.MD_SOURCE_PROTECTION_EVIDENCE) fs.writeFileSync(process.env.MD_SOURCE_PROTECTION_EVIDENCE, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, mutantsDetected: mutations.length, families: files.length, fields }));
