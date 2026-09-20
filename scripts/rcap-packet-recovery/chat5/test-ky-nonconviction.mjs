#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {ROOT,SOURCES,FAMILY,fixtures,kyFixture,validateKy,renderKy,sha256,BASIS_FIELDS} from './ky-nonconviction.mjs';
const results=[];async function test(name,fn){await fn();results.push({name,result:'PASS'});}
const mutate=(f,fn)=>{const x=structuredClone(f);fn(x);return x;};
const base=kyFixture();
for(const [fixture,f]of Object.entries(fixtures()))await test('complete positive '+fixture,async()=>{
 const r=await renderKy(f),d=await PDFDocument.load(r.bytes,{updateMetadata:false});
 assert.equal(d.getForm().getFields().length,0);assert.equal(r.activeContentScan.hits.length,0);
 assert.equal(r.pageCount,f.options.includeProposedOrder?8:6);
 assert.deepEqual(r.selectedBases,[...new Set(f.charges.map(x=>x.basis))]);
 assert.equal(r.componentPages.some(x=>x.documentId==='AOC-497'),f.options.includeProposedOrder);
 assert(r.schedule.flat(2).join(' ').includes(f.charges.at(-1).description));
 assert(r.guide.flat(2).join(' ').includes('Filing fee: $0'));
 assert(r.guide.flat(2).join(' ').includes('notary or the Circuit Court Clerk'));
 assert(!r.writes.some(x=>x.documentId==='AOC-497'&&x.kind==='explicit_selection'));
 assert(!r.writes.some(x=>/signature|ssn|check denied|other charges|2_2|undefined_2/i.test(x.field)));
 assert(r.writes.filter(x=>x.kind==='held_text').every(x=>x.fontSize>=7));
 const all=r.writes.filter(x=>x.kind==='explicit_selection');assert.equal(all.length,r.selectedBases.length);
 for(const c of f.charges)assert(all.find(x=>x.field===BASIS_FIELDS[c.basis]).chargeCounts.includes(c.count));
 if(fixture==='boundary'){assert.equal(all.length,3);assert(r.writes.some(x=>x.field==='CHARGE_6'&&x.value.includes('Counts 6 onward')));assert(r.guide.flat(2).join(' ').includes('phone number:'));}
});
const rejects=[
 ['wrong route',x=>x.routeKey='conviction',/WRONG_ROUTE/],
 ['wrong court',x=>x.court.level='Family',/COURT_LEVEL/],
 ['component must be explicit',x=>delete x.options.includeProposedOrder,/ELECTION/],
 ['conditional order not assumed',x=>x.options.includeProposedOrder=true,/ORDER_CONDITION/],
 ['another case cannot be merged',x=>x.charges[0].caseNumber='other',/SEPARATE_PETITION/],
 ['unlisted predicate not marked',x=>x.charges[0].basis='conviction',/WRONG_INSTRUMENT/],
 ['count required',x=>x.charges[0].count='',/UNIQUE_CHARGE/],
 ['duplicate count rejected',x=>x.charges.push(structuredClone(x.charges[0])),/UNIQUE_CHARGE/],
 ['zero charges',x=>x.charges=[],/CHARGES_REQUIRED/],
 ['charge placeholder not a fact',x=>x.charges[0].description='See attached',/ACTUAL_CHARGE/],
 ['charge class required',x=>x.charges[0].chargeClass='guess',/CHARGE_CLASS/],
 ['guilty plea exchange excluded',x=>x.charges[0].pleaExchange=true,/CONDITION_NOT_MET/],
 ['already expunged not refiled',x=>x.charges[0].alreadyExpunged=true,/CONDITION_NOT_MET/],
 ['unknown court facts not attested false',x=>x.confirmations.venueConfirmed=false,/CONDITION_NOT_MET/],
 ['signing date not invented',x=>x.participant.signatureDate=x.asOf,/PROTECTED_EXECUTION/],
 ['notary act not invented',x=>x.notary={},/PROTECTED_EXECUTION/],
 ['judicial finding not invented',x=>x.judicialFindings={},/PROTECTED_EXECUTION/],
 ['clerk service not invented',x=>x.clerkService={},/PROTECTED_EXECUTION/],
 ['agency compliance not invented',x=>x.agencyCertification={},/PROTECTED_EXECUTION/],
 ['private full SSN not casually stored',x=>x.participant.ssn='000-00-0000',/PRIVATE_IDENTIFIER/],
 ['birth after arrest',x=>x.participant.dob='2020-01-01',/INCONSISTENT_DOB/],
 ['invalid calendar date',x=>x.participant.dob='2000-02-30',/INVALID_DATE/],
 ['future disposition',x=>x.charges[0].dispositionDate='2026-09-08',/FUTURE_CASE_FACT/],
 ['arrest after disposition',x=>x.case.arrestDate='2020-01-01',/ARREST_AFTER_DISPOSITION/],
 ['ambiguous dismissal stop',x=>x.confirmations.ambiguousDismissal=true,/SELF_HELP_STOP/],
 ['appellate motion is different instrument',x=>x.confirmations.wantsAppellateSealing=true,/SELF_HELP_STOP/],
 ['DCBS not included',x=>x.confirmations.expectsDcbsExpungement=true,/SELF_HELP_STOP/],
 ['authority date requires revalidation',x=>x.asOf='2026-09-08',/AUTHORITY_REVALIDATION/]
];
for(const [name,fn,re]of rejects)await test(name,()=>assert.throws(()=>validateKy(mutate(base,fn)),re));
for(const [basis,date,key]of [['acquittal','2026-07-09','dispositionDate'],['dismissed_with_prejudice','2026-07-09','dispositionDate'],['felony_without_prejudice','2023-09-07','dispositionDate'],['misdemeanor_without_prejudice','2025-09-07','dispositionDate'],['no_indictment','2026-03-07','grandJuryHoldDate']]){
 const f=kyFixture(basis);f.charges[0][key]=date;f.charges[0].automaticStatusChecked=true;
 await test(basis+' exact threshold passes',()=>assert.equal(validateKy(f).eligibility[0].firstOrdinaryFilingDate,'2026-09-07'));
 await test(basis+' one day short fails',()=>{const n=new Date(date+'T00:00:00Z');n.setUTCDate(n.getUTCDate()+1);assert.throws(()=>validateKy(mutate(f,x=>x.charges[0][key]=n.toISOString().slice(0,10))),/WAIT_NOT_MET/);});
}
for(const key of ['indictmentIssued','informationFiled'])await test('no-indictment fails if '+key,()=>assert.throws(()=>validateKy(mutate(kyFixture('no_indictment'),x=>x.charges[0][key]=true)),/CONDITION_NOT_MET/));
await test('no indictment cannot use Circuit',()=>assert.throws(()=>validateKy(mutate(kyFixture('no_indictment'),x=>x.court.level='Circuit')),/DISTRICT_FELONY_ONLY/));
await test('unknown recital leaves ALL choices blank and discloses',async()=>{const r=await renderKy(mutate(base,x=>delete x.charges[0].pleaExchange));assert.equal(r.selectedBases.length,0);assert(r.guide.flat(2).join(' ').includes('No eligibility checkbox was marked'));});
await test('unknown agency address disclosed, not fabricated',async()=>{const r=await renderKy(mutate(base,x=>delete x.agencies[0].address));assert(r.schedule.flat(2).join(' ').includes('MAILING ADDRESS NOT SUPPLIED'));assert(r.blanks.some(x=>x.field==='Agency 1 address'));});
await test('overflow charge gets complete filing continuation, not refusal',async()=>{const v='Criminal trespass described in the supplied charging document '.repeat(7).trim();const r=await renderKy(mutate(base,x=>x.charges[0].description=v));assert(r.schedule.flat(2).join(' ').includes(v));assert(r.writes.some(x=>x.field==='CHARGE'&&x.value==='Count 1: see attached schedule'));});
await test('unreadable full name disclosed, no clipped text',async()=>{const v='Alexandria '.repeat(40);const r=await renderKy(mutate(base,x=>x.participant.fullName=v));assert(!r.writes.some(x=>x.field==='NAME'));assert(r.blanks.some(x=>x.heldValue===v));});
await test('unsupported glyph stops complete render',async()=>assert.rejects(renderKy(mutate(base,x=>x.participant.fullName='李 Reyes')),/UNSUPPORTED_TEXT_ENCODING/));
await test('bad county option rejected',async()=>assert.rejects(renderKy(mutate(base,x=>x.court.county='Made up County')),/COUNTY_NOT_IN_OFFICIAL_FORM/));
for(const [id,s]of Object.entries(SOURCES))await test('corrupt source rejected '+id,async()=>{const b=Buffer.from(fs.readFileSync(path.join(ROOT,s.path)));b[100]^=1;await assert.rejects(renderKy(kyFixture('acquittal',true),{[id]:b}),/SOURCE_HASH_DRIFT/);});
await test('wrapper importer has no side effects',()=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'ky-import-'));try{execFileSync(process.execPath,['--input-type=module','-e',`const m=await import(${JSON.stringify('file://'+path.join(ROOT,'scripts/build-census-v1-ky_nonconviction_expungement-set.mjs'))});if(typeof m.runFamily!=='function')throw Error('no export');`],{cwd:p});assert.deepEqual(fs.readdirSync(p),[]);}finally{fs.rmSync(p,{recursive:true,force:true});}});
const result={familyId:FAMILY,kind:'AUTHOR_QA_NOT_INDEPENDENT_REVIEW',passed:results.length,failed:0,tests:results};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
