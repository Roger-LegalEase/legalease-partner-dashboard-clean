#!/usr/bin/env node
// Executes the real source-aware renderer and real export/CLI refusal path.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {FAMILY,ROOT,SOURCE,ROUTE,OUT,json,cannabisFixtures,validateMdCannabis,renderMdCannabis,runMdCannabis} from './md-cannabis.mjs';
const rows=[],fixtures=cannabisFixtures(),clone=x=>structuredClone(x);
async function test(name,fn){try{await fn();rows.push({name,passed:true});}catch(e){rows.push({name,passed:false,error:e.stack});}}
const altered=fn=>{const f=clone(fixtures.canonical);fn(f);return f;};
const fail=(name,fn,pattern)=>test(name,()=>assert.throws(()=>validateMdCannabis(altered(fn)),pattern));
for(const [key,f]of Object.entries(fixtures))await test('actual complete renderer '+key,async()=>{
 const r=await renderMdCannabis(f);const d=await PDFDocument.load(r.bytes);
 assert.deepEqual(r.bytes,fs.readFileSync(path.join(ROOT,OUT,'fixtures',key+'.pdf')),'Retained whole packet changed: '+key);
 assert.equal(r.pageCount,d.getPageCount());assert.equal(d.getForm().getFields().length,0);assert.equal(r.components[0].documentId,'CC-DC-CR-072D');assert.equal(r.components[0].pageCount,1);
 assert.deepEqual(r.components.map(c=>c.documentId),f.options.feeTreatment==='paid'?['CC-DC-CR-072D']:['CC-DC-CR-072D','CC-DC-089','MDJ-008']);
 if(f.options.feeTreatment==='waiver')assert.equal(r.components[1].pageCount,3);
 assert.equal(r.allKnownFactsPrepared,!key.startsWith('diagnostic/'));assert.equal(r.pageManifest.length,r.pageCount);
 assert(!r.components.some(c=>c.writes.some(w=>/signature|Date_[12]|Judge Signature/i.test(w.field))));
 if(key.includes('missing-completion')||key.includes('unknown-other')||key.includes('record-status'))assert.equal(r.mayMarkBasis,false);
});
for(const [name,completion,accept]of [['before-three-years','2023-09-08',false],['equal-three-years','2023-09-07',true],['after-three-years','2023-09-06',true]])await test(name,()=>{const f=clone(fixtures['selectable/pwid-paid']);f.case.completionDate=completion;if(accept)assert.equal(validateMdCannabis(f).mayMarkBasis,true);else assert.throws(()=>validateMdCannabis(f),/WAITING_PERIOD/);});
await test('possession same-day completion accepted without extra wait',()=>assert.equal(validateMdCannabis(fixtures['selectable/possession-paid']).earliest,'2026-09-07'));
await test('no-longer-crime ground adds no sentence completion prerequisite',()=>assert.equal(validateMdCannabis(fixtures.canonical).mayMarkBasis,true));
for(const key of ['case.convictionDate','case.completionDate','case.otherOffenses'])for(const v of [undefined,null,''])await test('unknown '+key+' '+String(v),()=>{const f=clone(fixtures['selectable/possession-paid']);const [a,b]=key.split('.');f[a][b]=v;if(b==='convictionDate')f.case.charges[0].convictionDate=v;const r=validateMdCannabis(f);assert.equal(r.mayMarkBasis,false);assert(r.missing.some(m=>m.factId===key));});
await fail('wrong route does not enter another source',f=>f.routeKey='obligation:other',/WRONG_ROUTE/);
await fail('no nonconviction substitution',f=>f.case.charges[0].disposition='dismissed',/NOT_A_CONVICTION/);
await fail('no noncannabis substitution',f=>f.case.charges[0].substance='cocaine',/NOT_CANNABIS/);
await fail('pardon is not a D basis',f=>f.case.basis='pardon',/WRONG_072D/);
await fail('wrong statute refused',f=>f.case.charges[0].statute='CR 5-619',/WRONG_STATUTE/);
await fail('no general release inferred',f=>f.options.generalRelease=true,/PROTECTED_OR/);
await fail('signature injection refused',f=>f.person.signature='SIGNED',/PROTECTED_OR/);
await fail('court order injection refused',f=>f.court.order='GRANTED',/PROTECTED_OR/);
await fail('notarial act refused',f=>f.notary={name:'Invented'},/PROTECTED_OR/);
await fail('date order: event after conviction',f=>f.case.eventDate='2020-01-01',/EVENT_AFTER/);
await fail('date order: completion before conviction',f=>f.case.completionDate='2017-01-01',/COMPLETION_BEFORE/);
await fail('date order: future completion',f=>f.case.completionDate='2027-01-01',/FUTURE_CASE/);
await fail('malformed leap date rejected',f=>f.case.eventDate='2018-02-30',/INVALID_DATE/);
await fail('not an automatic-relief duplicate',f=>f.records.courtRecordStatus='already_expunged',/ALREADY_EXPUNGED/);
await test('missing Case Search result does not mean expunged',()=>{const f=clone(fixtures.canonical);assert.equal(f.records.caseSearchResult,'not_shown');assert.equal(validateMdCannabis(f).mayMarkBasis,true);});
await fail('pending criminal proceeding refused',f=>f.confirmations.pendingCriminalProceeding=true,/CONDITION_NOT_MET/);
await fail('real objection handoff',f=>f.confirmations.actualObjection=true,/CONTESTED/);
await fail('unknown/missing entire charge list refused',f=>f.case.charges=[],/ALL_CHARGES/);
await fail('invented other-offenses false refused',f=>f.case.charges.push({id:'2',description:'Theft',statute:'CR 7-104',disposition:'guilty',requested:false}),/INVENTORY_MISMATCH/);
await fail('duplicate charge identity refused',f=>f.case.charges.push(clone(f.case.charges[0])),/DUPLICATE/);
await fail('wrong court option refused',f=>f.court.option='Carroll County (CC)',/COURT_OPTION_LEVEL/);
await test('possession carve-out keeps ineligible other charge separate',()=>assert.equal(validateMdCannabis(fixtures['selectable/possession-separate-from-ineligible-unit']).mayMarkBasis,true));
await test('PWID does not inherit possession carve-out',()=>{const f=clone(fixtures['selectable/pwid-paid']);f.case.otherOffenses=true;f.case.charges.push({id:'2',description:'First-degree assault',statute:'CR 3-202',disposition:'guilty',requested:false});assert.throws(()=>validateMdCannabis(f),/OTHER_UNIT_CHARGE/);});
await test('PWID intervening conviction not yet eligible refused',()=>{const f=clone(fixtures['selectable/pwid-new-conviction-now-eligible']);f.confirmations.newConvictionNowEligible=false;assert.throws(()=>validateMdCannabis(f),/CONDITION_NOT_MET/);});
await test('PWID unknown intervening conviction blocks mark',()=>{const f=clone(fixtures['selectable/pwid-paid']);delete f.confirmations.newCrimeDuringWaiting;assert.equal(validateMdCannabis(f).mayMarkBasis,false);});
await test('exact source bytes gate',async()=>{const raw=fs.readFileSync(path.join(ROOT,SOURCE.path));raw[200]^=1;await assert.rejects(()=>renderMdCannabis(fixtures.canonical,{'CC-DC-CR-072D':raw}),/SOURCE_HASH/);});
await test('missing source bytes gate',async()=>await assert.rejects(()=>renderMdCannabis(fixtures.canonical,{'CC-DC-CR-072D':Buffer.alloc(0)}),/SOURCE_LENGTH/));
await test('wrong actual combo option refused',async()=>{const f=clone(fixtures.canonical);f.court.option='Imaginary County (DC)';await assert.rejects(()=>renderMdCannabis(f),/UNKNOWN_OFFICIAL_COURT_OPTION/);});
await test('known overlong name disclosed not truncated',async()=>{const f=clone(fixtures.canonical);f.person.name='Alexandria '.repeat(40).trim();const r=await renderMdCannabis(f);assert(!r.allKnownFactsPrepared);assert(r.missing.some(m=>m.field==='Defendant Name'&&m.value===f.person.name));assert(!r.components[0].writes.some(w=>w.field==='Defendant Name'));});
await test('unsupported glyph cannot silently disappear',async()=>{const f=clone(fixtures.canonical);f.person.name='Jordan 🐱';await assert.rejects(()=>renderMdCannabis(f),/UNSUPPORTED_TEXT_ENCODING/);});
for(const [name,change,pattern]of [
 ['financial on paid',f=>f.financial={},/WAIVER_INPUT/],
 ['unrequested waiver',f=>delete f.options.prepaidWaiverRequested,/EXPLICIT_WAIVER/],
 ['unknown final election',f=>delete f.options.finalOpenCostsRequested,/EXPLICIT_FINAL/],
 ['negative income',f=>f.financial.income.wages=-1,/INVALID_CENTS/],
 ['decimal cents',f=>f.financial.income.wages=0.5,/INVALID_CENTS/],
 ['inconsistent total',f=>f.financial.totalCents=1,/TOTAL_MISMATCH/],
 ['SNAP income category',f=>f.financial.income.snap=10000,/UNKNOWN_INCOME/],
 ['property exclusion not confirmed',f=>f.financial.excludedHomeVehiclePersonalItems=false,/PROPERTY_EXCLUSIONS/],
 ['SNAP exclusion not confirmed',f=>f.financial.snapExcluded=false,/SNAP_EXCLUSION/]
 ])await test(name,()=>{const f=clone(name==='financial on paid'?fixtures.canonical:fixtures['selectable/possession-waiver']);change(f);assert.throws(()=>validateMdCannabis(f),pattern);});
await test('missing financial information never becomes zeros',async()=>{const r=await renderMdCannabis(fixtures['diagnostic/waiver-missing-financial']);const c=r.components[1];assert(!c.writes.some(w=>['None','No Debt check box','Total Gross Household Income'].includes(w.field)));assert(c.blanks.some(b=>b.requiredBeforeFiling&&b.field==='Total Gross Household Income'));});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'md072d-native-'));
try{
 const bad=path.join(tmp,'invalid.json');fs.writeFileSync(bad,json(altered(f=>f.case.completionDate='2017-01-01')));
 for(const existing of [false,true])for(const mode of ['export','CLI'])await test(`${mode} invalid input emits no files, existing=${existing}`,async()=>{
  const dir=path.join(tmp,`${mode}-${existing}`),sent=Buffer.from('preserve these exact bytes\x00');if(existing){fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'sentinel.bin'),sent);}
  if(mode==='export')await assert.rejects(()=>runMdCannabis({inputFile:bad,outDir:dir}),/COMPLETION_BEFORE/);
  else{const r=spawnSync(process.execPath,['scripts/build-census-v1-md_cannabis_petition-set.mjs','--input',bad,'--out',dir],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/COMPLETION_BEFORE/);}
  if(existing){assert.deepEqual(fs.readdirSync(dir),['sentinel.bin']);assert.deepEqual(fs.readFileSync(path.join(dir,'sentinel.bin')),sent);}else assert(!fs.existsSync(dir));
 });
 await test('check flag not credited as regeneration',()=>{const r=spawnSync(process.execPath,['scripts/build-census-v1-md_cannabis_petition-set.mjs','--check'],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,1);});
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const report={familyId:FAMILY,scope:'AUTHOR_REAL_RENDERER_AND_ENTRY_TESTS',passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,rows,independentApproval:false};if(process.argv[2])fs.writeFileSync(process.argv[2],json(report));console.log(json(report));if(report.failed)process.exitCode=1;
