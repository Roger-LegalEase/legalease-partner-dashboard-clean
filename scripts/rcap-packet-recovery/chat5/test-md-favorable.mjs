#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { AS_OF, ROOT, OUT, SOURCE, SOURCE_SHA, BASIS_FIELDS, fixtures, withBasis, validateMdFavorable, renderMdFavorable, sha256 } from './md-favorable.mjs';
const results = [];
async function test(name, fn) { await fn(); results.push({ name, result: 'PASS' }); }
const clone = structuredClone;
const fxs = fixtures(), canonical = fxs.canonical;
const mutate = (fn, f = canonical) => { const v = clone(f); fn(v); return v; };
const source = fs.readFileSync(path.join(ROOT, SOURCE));
await test('pinned retained 072A source digest', () => assert.equal(sha256(source), SOURCE_SHA));
for (const [id, f] of Object.entries(fxs)) {
  await test(`complete positive render ${id}`, async () => {
    const r = await renderMdFavorable(f);
    assert.equal(r.pageCount, 4); assert.deepEqual(r.selectedComponents, ['CC-DC-CR-072A']);
    const pdf = await PDFDocument.load(r.bytes, { updateMetadata: false });
    assert.equal(pdf.getForm().getFields().length, 0); assert.equal(r.activeContentScan.hits.length, 0);
    assert.equal(r.writes.filter(w => Object.values(BASIS_FIELDS).includes(w.field)).length, 1);
    assert.equal(r.writes.filter(w => w.kind === 'explicit_selection').length, f.court.transfer === 'adult' ? 4 : 3);
    assert(r.writes.some(w => w.field === BASIS_FIELDS[f.case.basis]));
    assert.equal(r.writes.filter(w => w.factId === 'participant.fullName').length, 2);
    assert(!r.writes.some(w => /signature|attorney|signed/i.test(w.field)));
    assert(r.writes.filter(w => w.kind === 'held_text').every(w => w.fontSize >= 7));
    assert.equal(r.blanks.filter(b => b.requiredBeforeFiling).length, id === 'boundary' ? 1 : 0);
    if (id === 'boundary') assert(r.guide.flat(2).join(' ').includes('Law Enforcement Agency:'));
  });
}
const bad = [
  ['wrong route', x => x.routeKey = 'md_cannabis_petition', /WRONG_ROUTE/],
  ['conviction cannot use 072A', x => x.case.basis = 'conviction', /WRONG_INSTRUMENT/],
  ['pardon cannot use 072A', x => x.case.basis = 'pardon', /WRONG_INSTRUMENT/],
  ['early C cannot use 072A', x => x.case.basis = 'early', /WRONG_INSTRUMENT/],
  ['general release not silently attached', x => x.options = {generalWaiverRequested:true}, /CONDITIONAL_SOURCE_REQUIRED/],
  ['unknown October law version', x => x.asOf = '2026-10-01', /LAW_VERSION_REVIEW/],
  ['invalid calendar date', x => x.participant.dob = '1991-02-30', /INVALID_DATE/],
  ['future disposition', x => {x.case.dispositionDate='2026-09-08';x.case.chargesInIncident[0].dispositionDate='2026-09-08';}, /FUTURE_CASE_FACT/],
  ['arrest after disposition', x => x.case.arrestOrServiceDate = '2021-01-10', /INCONSISTENT_CASE_DATES/],
  ['birth after arrest', x => x.participant.dob = '2021-01-01', /INCONSISTENT_DOB/],
  ['wrong court option level', x => x.court.level = 'circuit', /COURT_OPTION_LEVEL_MISMATCH/],
  ['unsupported court', x => x.court.level = 'federal', /COURT_LEVEL_NOT_SUPPORTED/],
  ['unknown service event', x => x.case.event = 'assumed_arrest', /EVENT_NOT_SUPPORTED/],
  ['zero charges', x => x.case.chargesInIncident = [], /ALL_INCIDENT_CHARGES_REQUIRED/],
  ['instructional charge is not a case fact', x => x.case.chargesInIncident[0].description = 'See instructions for the charge', /CHARGE_PLACEHOLDER_NOT_FACT/],
  ['blank charge', x => x.case.chargesInIncident[0].description = ' ', /CHARGE_DESCRIPTION_REQUIRED/],
  ['unlike disposition not collapsed', x => x.case.chargesInIncident.push({description:'Other charge',basis:'stet',dispositionDate:'2020-04-02'}), /MULTI_DISPOSITION_SOURCE_LAYOUT_REVIEW/],
  ['unlike date not collapsed', x => x.case.chargesInIncident.push({description:'Other charge',basis:'dismissal',dispositionDate:'2020-04-03'}), /MULTI_DISPOSITION_SOURCE_LAYOUT_REVIEW/],
  ['pending prosecution', x => x.confirmations.pendingCriminalProceeding = true, /CONDITION_NOT_MET/],
  ['ineligible unit', x => x.confirmations.unitEligible = false, /CONDITION_NOT_MET/],
  ['unaccounted incident charge', x => x.confirmations.allIncidentChargesAccounted = false, /CONDITION_NOT_MET/],
  ['unconfirmed source recital', x => x.confirmations.selectedStatementTrue = false, /CONDITION_NOT_MET/],
  ['nonincarcerable traffic only', x => x.confirmations.nonIncarcerableTrafficOnly = true, /CONDITION_NOT_MET/],
  ['invented signature', x => x.participant.signature = 'signed', /PROTECTED_EXECUTION_INPUT/],
  ['invented signing date', x => x.participant.signatureDate = AS_OF, /PROTECTED_EXECUTION_INPUT/],
  ['invented notarial act', x => x.notary = {}, /PROTECTED_EXECUTION_INPUT/],
  ['invented judicial finding', x => x.judicialFindings = {}, /PROTECTED_EXECUTION_INPUT/],
];
for (const [name, fn, re] of bad) await test(name, () => assert.throws(() => validateMdFavorable(mutate(fn)), re));
await test('one day before ordinary threshold fails', () => assert.throws(() => validateMdFavorable(withBasis('dismissal', {dispositionDate:'2023-09-08'})), /TIMING_NOT_MET/));
await test('ordinary threshold exact day passes', () => assert.equal(validateMdFavorable(withBasis('dismissal',{dispositionDate:'2023-09-07'})).earliest,'2026-09-07'));
await test('PBJ later discharge controls', () => assert.equal(validateMdFavorable(fxs.boundary).earliest,'2026-09-07'));
await test('DUI fifteen-year threshold exact day', () => assert.equal(validateMdFavorable(fxs['selectable/pbj-dui']).earliest,'2026-09-07'));
await test('DUI one day before fifteen-year threshold fails', () => assert.throws(() => validateMdFavorable(mutate(x => x.case.probationDischargeDate = '2011-09-08',fxs['selectable/pbj-dui'])), /TIMING_NOT_MET/));
await test('treatment without actual completion leaves recital blank', async () => {
 const r = await renderMdFavorable(mutate(x => x.case.treatmentCompletionDate = null,fxs['selectable/stet-treatment']));
 assert(!r.writes.some(w => w.field === BASIS_FIELDS.stet));
 assert(r.guide.flat(2).join(' ').includes('Treatment completion date:'));
});
await test('unknown eligibility is disclosed not guessed', async () => {
 const r = await renderMdFavorable(mutate(x => delete x.confirmations.unitEligible));
 assert(!r.writes.some(w => Object.values(BASIS_FIELDS).includes(w.field)));
 assert(r.guide.flat(2).join(' ').includes('Disposition checkbox:'));
});
await test('oversize held name remains complete in disclosure, never clipped', async () => {
 const name = 'Alexandria '.repeat(30).trim();
 const r = await renderMdFavorable(mutate(x => x.participant.fullName = name));
 assert.equal(r.writes.filter(w => w.factId === 'participant.fullName').length,0);
 assert.equal(r.blanks.filter(b => b.value === name).length,2);
 assert(r.guide.flat(2).join(' ').includes(name));
});
await test('unsupported character stops whole render without transliteration', async () => {
 await assert.rejects(renderMdFavorable(mutate(x => x.participant.fullName = 'Renée 李')),/UNSUPPORTED_TEXT_ENCODING/);
});
await test('oversize incident does not drop words', async () => {
 const narrative='The complete supplied statement has a long incident description. '.repeat(30).trim();
 const r=await renderMdFavorable(mutate(x => x.case.incidentNarrative=narrative));
 assert(!r.writes.some(w => w.factId==='case.incidentNarrative'));
 assert(r.blanks.some(b=>b.value===narrative));
});
await test('source-byte corruption fails before rendering', async () => {const s=Buffer.from(source);s[100]^=1;await assert.rejects(renderMdFavorable(canonical,s),/SOURCE_HASH_DRIFT/);});
await test('source-byte truncation fails before rendering', async () => assert.rejects(renderMdFavorable(canonical,source.subarray(1)),/SOURCE_LENGTH_DRIFT/));
await test('source option not supplied by official PDF fails', async () => assert.rejects(renderMdFavorable(mutate(x=>x.court.sourceOption='Invented County (DC)')),/COURT_OPTION_NOT_IN_SOURCE/));
await test('wrapper importer is side-effect free', () => {
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chat5-import-'));
 try { execFileSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify('file://'+path.join(ROOT,'scripts/build-census-v1-md_10105_favorable-set.mjs'))});if(typeof m.runFamily!=='function')throw Error('missing export');`],{cwd:tmp});assert.deepEqual(fs.readdirSync(tmp),[]); } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
await test('check option is explicitly not claimed as regeneration',()=>assert.throws(()=>execFileSync(process.execPath,[path.join(ROOT,'scripts/build-census-v1-md_10105_favorable-set.mjs'),'--check'],{stdio:'pipe'})));
const target=process.argv[2]; if(target){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({familyId:'md_10105_favorable-set',kind:'AUTHOR_QA_NOT_INDEPENDENT_REVIEW',tests:results,passed:results.length,failed:0},null,2)+'\n');}
console.log(JSON.stringify({passed:results.length,failed:0,tests:results},null,2));
