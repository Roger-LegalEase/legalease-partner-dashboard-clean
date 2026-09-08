#!/usr/bin/env node
// Actual source-specific validator, full renderer, and exported/CLI entry tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {PDFDocument} from 'pdf-lib';
import {ROOT,OUT,FAMILY,ROUTE,BASIS,SOURCES,convictionFixtures,withWaiver,validateMdConviction,renderMdConviction,hash} from './md-conviction.mjs';
import {runFamily} from '../../build-census-v1-md_10110_conviction-set.mjs';
const rows=convictionFixtures(),base=rows.canonical,wbase=rows['selectable/misdemeanor-waiver'],results=[];
const altered=(base,fn)=>{const f=structuredClone(base);fn(f);return f;};
async function test(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});}}
for(const [name,f] of Object.entries(rows))await test('complete source-bound render '+name,async()=>{
 const r=await renderMdConviction(f);assert(r.pageCount>=5);assert.equal(hash(r.bytes),r.sha256);assert.equal((await PDFDocument.load(r.bytes)).getForm().getFields().length,0);
 assert.deepEqual(r.bytes,fs.readFileSync(path.join(ROOT,OUT,'fixtures',name+'.pdf')),'Retained whole packet changed: '+name);
 const ids=r.components.map(c=>c.documentId);assert.deepEqual(ids,f.options.feeTreatment==='paid'?['CC-DC-CR-072B']:['CC-DC-CR-072B','CC-DC-089','MDJ-008']);
 assert.equal(r.pageManifest.filter(x=>x.documentId==='CC-DC-089').length,f.options.feeTreatment==='paid'?0:3);
 assert.equal(r.pageManifest.filter(x=>x.documentId==='MDJ-008').length,f.options.feeTreatment==='paid'?0:1);
 assert.equal(r.allKnownFactsPrepared,!name.startsWith('diagnostic/'));
 assert(r.components[0].writes.find(w=>w.field==='Law Enforcement Agency').widgets.every(w=>w.rect.x===292));
 for(const c of r.components){assert.equal(c.writes.length+c.blanks.length,c.census.length);assert.equal(new Set([...c.writes,...c.blanks].map(x=>x.field)).size,c.census.length);assert(!c.writes.some(x=>/Signature|^Date_3$|^Date_4$|Text28|Text29|Date of.*Signature|^Judge|Granted check box|Ordered Fee/.test(x.field)));}
});
for(const basis of ['misdemeanor','assault_battery','felony','burglary_theft','domestic','nuisance']){
 const f=rows[`selectable/${basis}-paid`];
 // Keep the current authority date constant; vary the completion anchor around
 // the source's exact anniversary without fabricating a prior-law opinion.
 const anchor=`${2026-BASIS[basis].years}-09-07`;
 for(const [label,suffix,accept] of [['before','08',false],['equal','07',true],['after','06',true]])await test(`${basis}: ${label} current source clock`,()=>{
  const t=altered(f,x=>x.case.completionDate=anchor.slice(0,-2)+suffix);
  if(accept)assert.equal(validateMdConviction(t).mayMarkBasis,true);else assert.throws(()=>validateMdConviction(t),/WAITING_PERIOD_NOT_MET/);
 });
}
for(const basis of ['no_longer_crime','repealed_sexual'])await test(basis+': no invented sentence-completion waiting period',()=>assert.equal(validateMdConviction(rows[`selectable/${basis}-paid`]).earliest,null));
for(const key of ['case.convictionDate','case.completionDate'])for(const [label,value] of [['absent',undefined],['null',null],['empty','']])await test(`${key}: ${label} remains disclosed`,async()=>{
 const f=altered(base,x=>{const k=key.split('.')[1];if(value===undefined)delete x.case[k];else x.case[k]=value;if(k==='convictionDate')for(const c of x.case.charges){if(value===undefined)delete c.convictionDate;else c.convictionDate=value;}});
 const v=validateMdConviction(f);assert.equal(v.mayMarkBasis,false);assert(v.missing.some(x=>x.factId===key));const r=await renderMdConviction(f);assert.equal(r.allKnownFactsPrepared,false);assert(!r.components[0].writes.some(x=>x.factId==='case.basis'));
});
const rejects=[
 ['wrong route',x=>x.routeKey='obligation:other',/WRONG_ROUTE/],
 ['pardon substitution',x=>x.case.basis='pardon',/WRONG_INSTRUMENT/],
 ['cannabis substitution',x=>x.confirmations.nonCannabis=false,/CONDITION_NOT_MET/],
 ['nonconviction substitution',x=>x.case.charges[0].disposition='dismissed',/MIXED_DISPOSITION/],
 ['missing sections',x=>delete x.person,/MISSING_INPUT/],
 ['invalid ISO date',x=>x.case.eventDate='2020-02-30',/INVALID_DATE/],
 ['future case event',x=>x.case.eventDate='2027-01-01',/FUTURE_CASE_DATE/],
 ['event after disposition',x=>x.case.eventDate='2020-01-01',/EVENT_AFTER_CONVICTION/],
 ['completion before conviction',x=>x.case.completionDate='2017-01-01',/COMPLETION_BEFORE_CONVICTION/],
 ['DOB after event',x=>x.person.dob='2020-01-01',/DOB_AFTER_EVENT/],
 ['future law version',x=>x.asOf='2026-10-01',/LAW_VERSION_REVIEW/],
 ['unsupported legal anniversary',x=>x.case.completionDate='2020-02-29',/LEAP_ANNIVERSARY_REVIEW/],
 ['pending case',x=>x.confirmations.pendingCriminalProceeding=true,/CONDITION_NOT_MET/],
 ['unknown unit is not approved',x=>x.confirmations.unitEligible=false,/CONDITION_NOT_MET/],
 ['incomplete incident unit',x=>x.confirmations.allIncidentChargesListed=false,/CONDITION_NOT_MET/],
 ['false printed recital',x=>x.confirmations.selectedRecitalTrue=false,/CONDITION_NOT_MET/],
 ['unsatisfied sentence',x=>x.confirmations.allSentencesComplete=false,/CONDITION_NOT_MET/],
 ['disqualifying new conviction',x=>x.confirmations.interveningConvictionDisqualifies=true,/CONDITION_NOT_MET/],
 ['nonenumerated charge not eligible',x=>x.case.charges[0].eligibleUnder10_110=false,/INELIGIBLE_CHARGE/],
 ['domestic classification cannot be bypassed',x=>x.case.charges[0].domesticallyRelated=true,/DOMESTIC_CLASSIFICATION/],
 ['wrong misdemeanor grade',x=>x.case.charges[0].grade='felony',/MISDEMEANOR_GRADE/],
 ['assault is not five-year general misdemeanor',x=>x.case.charges[0].statute='CR 3-203',/ASSAULT_SEVEN_YEARS/],
 ['missing exact offense statute',x=>delete x.case.charges[0].statute,/EXACT_CHARGE_STATUTE/],
 ['empty charge unit',x=>x.case.charges=[],/COMPLETE_CHARGE_UNIT/],
 ['placeholder charge description',x=>x.case.charges[0].description='unknown',/PLACEHOLDER_NOT_FACT/],
 ['mixed charge dates',x=>x.case.charges.push({...x.case.charges[0],convictionDate:'2019-01-01'}),/MIXED_DATES/],
 ['mixed charge bases',x=>x.case.charges.push({...x.case.charges[0],basis:'felony'}),/MIXED_BASES/],
 ['unsupported court',x=>x.court.level='supreme',/COURT_LEVEL/],
 ['court option differs from court level',x=>x.court.option='Carroll County (CC)',/COURT_OPTION_LEVEL/],
 ['juvenile transfer not this family',x=>x.court.transfer='juvenile',/TRANSFER_REQUIRES/],
 ['unconfirmed receiving court',x=>{x.court.transfer='adult';x.court.receivingCourtConfirmed=false;},/CONDITION_NOT_MET/],
 ['appeal not invented in district caption',x=>x.court.appealed=true,/APPELLATE_CAPTION/],
 ['invalid event choice',x=>x.case.event='indictment',/EVENT_NOT_SUPPORTED/],
 ['disputed restitution',x=>x.case.restitution.status='disputed',/DISPUTED_RESTITUTION/],
 ['unknown restitution status word',x=>x.case.restitution.status='forgiven',/RESTITUTION_STATUS/],
 ['inability assertion contradicted',x=>x.case.restitution={status:'unable_to_pay',inabilityAsserted:false},/CONDITION_NOT_MET/],
 ['actual objection',x=>x.confirmations.actualObjection=true,/ACTUAL_CONTESTED/],
 ['actual hearing',x=>x.confirmations.hearingScheduled=true,/ACTUAL_CONTESTED/],
 ['omitted fee election',x=>delete x.options.feeTreatment,/EXPLICIT_FEE_CHOICE/],
 ['waiver facts silently put in paid branch',x=>x.financial={},/WAIVER_INPUT_ON_PAID/],
 ['waiver selection silently omitted on paid branch',x=>x.options.prepaidWaiverRequested=true,/WAIVER_INPUT_ON_PAID/],
 ['participant signature input',x=>x.person.signature='Jordan',/PROTECTED_OR_UNSUPPORTED/],
 ['participant execution date input',x=>x.person.signatureDate='2026-09-07',/PROTECTED_OR_UNSUPPORTED/],
 ['judge findings input',x=>x.judicialFindings={eligible:true},/PROTECTED_OR_UNSUPPORTED/],
 ['judge order input',x=>x.court.order='granted',/PROTECTED_OR_UNSUPPORTED/],
 ['notarial act input',x=>x.notary={name:'Person'},/PROTECTED_OR_UNSUPPORTED/],
 ['attorney certification input',x=>x.attorney={name:'Person'},/PROTECTED_OR_UNSUPPORTED/],
 ['claims-release substitution',x=>x.options.generalRelease=true,/PROTECTED_OR_UNSUPPORTED/]
];
for(const [label,fn,re] of rejects)await test(label+' is refused in real renderer',async()=>assert.rejects(renderMdConviction(altered(base,fn)),re));
for(const [basis,fn,re] of [
 ['felony',x=>x.case.charges[0].statute='CR 6-203',/SPECIAL_FELONY_TEN_YEARS/],
 ['burglary_theft',x=>x.case.charges[0].statute='CR 6-204',/SPECIAL_FELONY_STATUTE/],
 ['assault_battery',x=>x.case.charges[0].statute='CR 7-104',/ASSAULT_STATUTE/],
 ['nuisance',x=>x.confirmations.listedNuisanceOffense=false,/CONDITION_NOT_MET/],
 ['repealed_sexual',x=>x.confirmations.all10_105_a1ExclusionsAbsent=false,/CONDITION_NOT_MET/],
 ['no_longer_crime',x=>x.confirmations.all10_105_a1ExclusionsAbsent=false,/CONDITION_NOT_MET/]
])await test(basis+' exact predicate control',async()=>assert.rejects(renderMdConviction(altered(rows[`selectable/${basis}-paid`],fn)),re));
for(const [label,fn,re] of [
 ['request',x=>x.options.prepaidWaiverRequested=false,/EXPLICIT_WAIVER_REQUEST/],
 ['ability',x=>x.options.unableToPrepay=false,/CONDITION_NOT_MET/],
 ['final choice',x=>delete x.options.finalOpenCostsRequested,/EXPLICIT_FINAL_COST/],
 ['final assertion',x=>{x.options.finalOpenCostsRequested=true;x.options.noMaterialChangeAnticipated=false;},/CONDITION_NOT_MET/],
 ['restricted case notice',x=>x.court.restrictedCaseType=true,/CONDITION_NOT_MET/],
 ['negative income',x=>x.financial.income.wages=-1,/INVALID_CENTS/],
 ['unsafe integer',x=>x.financial.totalCents=Number.MAX_SAFE_INTEGER+1,/INVALID_CENTS/],
 ['fraction of cent',x=>x.financial.income.wages=1.1,/INVALID_CENTS/],
 ['wrong total',x=>x.financial.totalCents=85001,/INCOME_TOTAL/],
 ['SNAP added',x=>x.financial.income.snap=10000,/UNKNOWN_INCOME_CATEGORY/],
 ['SNAP confirmation',x=>x.financial.snapExcluded=false,/SNAP_EXCLUSION/],
 ['property exemption',x=>x.financial.excludedHomeVehiclePersonalItems=false,/PROPERTY_EXCLUSIONS/],
 ['home incorrectly in property list',x=>x.financial.property.home={cents:100000},/UNKNOWN_FINANCIAL_CATEGORY/],
 ['bad household',x=>x.financial.householdSize=0,/HOUSEHOLD_SIZE/],
 ['bad period',x=>x.financial.period='day',/INCOME_PERIOD/],
 ['missing debt description',x=>delete x.financial.debts.creditCard.description,/FINANCIAL_DESCRIPTION/],
 ['negative monthly debt payment',x=>x.financial.debts.creditCard.monthlyCents=-1,/INVALID_CENTS/]
])await test('waiver '+label+' refused',async()=>assert.rejects(renderMdConviction(altered(wbase,fn)),re));
for(const key of ['incomeComplete','propertyComplete','debtsComplete'])await test('missing '+key+' explicitly disclosed',async()=>{
 const f=altered(wbase,x=>delete x.financial[key]);const r=await renderMdConviction(f);assert.equal(r.allKnownFactsPrepared,false);assert(r.missing.some(x=>x.factId==='financial.'+key));
});
await test('paid branch does not demand waiver-only restricted-type fact',async()=>assert.equal((await renderMdConviction(altered(base,x=>delete x.court.restrictedCaseType))).allKnownFactsPrepared,true));
await test('unsupported glyph refuses without transliteration',async()=>assert.rejects(renderMdConviction(altered(base,x=>x.person.name='李明')),/UNSUPPORTED_TEXT_ENCODING/));
for(const [id,s] of Object.entries(SOURCES))for(const type of ['length','hash'])await test(`${id}: ${type} drift refuses whole packet`,async()=>{
 const b=Buffer.from(fs.readFileSync(path.join(ROOT,s.path)));if(type==='hash')b[b.length-10]^=1;
 await assert.rejects(renderMdConviction(wbase,{[id]:type==='length'?b.subarray(1):b}),/SOURCE_(LENGTH|HASH)_DRIFT/);
});
await test('paid branch neither requires nor reads waiver-source override',async()=>assert.equal((await renderMdConviction(base,{'CC-DC-089':Buffer.from('bad'),'MDJ-008':Buffer.from('bad')})).components.length,1));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'chat5-conviction-entry-'));
try{
 const file=path.join(tmp,'invalid.json');fs.writeFileSync(file,JSON.stringify(altered(base,x=>x.case.completionDate='2017-01-01')));
 for(const entry of ['export','cli'])for(const existing of [false,true])await test(`${entry} invalid input emits nothing; existing=${existing}`,async()=>{
  const out=path.join(tmp,entry+existing);if(existing){fs.mkdirSync(out);fs.writeFileSync(path.join(out,'existing.bin'),'retained packet bytes');}
  const snapshot=()=>fs.existsSync(out)?fs.readdirSync(out,{recursive:true}).map(n=>[n,hash(fs.readFileSync(path.join(out,n)))]):null;const before=snapshot();
  if(entry==='export')await assert.rejects(runFamily({inputFile:file,outDir:out}),/COMPLETION_BEFORE_CONVICTION/);
  else{const r=spawnSync(process.execPath,['scripts/build-census-v1-md_10110_conviction-set.mjs','--input',file,'--out',out],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/COMPLETION_BEFORE_CONVICTION/);assert(!r.stdout.includes('rendererExecuted'));}assert.deepEqual(snapshot(),before);
 });
 await test('custom input cannot overwrite canonical corpus',async()=>assert.rejects(runFamily({inputFile:file}),/CUSTOM_INPUT_REQUIRES_ISOLATED/));
 await test('actual CLI generates whole paid packet',()=>{const p=path.join(tmp,'valid.json');fs.writeFileSync(p,JSON.stringify(base));const out=path.join(tmp,'valid');const r=spawnSync(process.execPath,['scripts/build-census-v1-md_10110_conviction-set.mjs','--input',p,'--out',out],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).pages,5);assert(fs.existsSync(path.join(out,'fixtures/supplied.pdf')));});
 await test('--check does not masquerade as full regeneration',()=>{const r=spawnSync(process.execPath,['scripts/build-census-v1-md_10110_conviction-set.mjs','--check'],{cwd:ROOT,encoding:'utf8'});assert.equal(r.status,1);assert.match(r.stderr,/not regeneration/);});
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
await test('missing completion disclosure never says no waiting period or repeats obsolete AcroForm clock',async()=>{
 const r=await renderMdConviction(rows['diagnostic/missing-completion']); const text=JSON.stringify(r);
 assert(text.includes('The waiting period cannot be verified until the actual completion date is supplied.'));
 const guide=JSON.stringify(r.sections); assert(!guide.includes('No waiting period is added'));assert(!guide.includes('Ten years have passed'));assert(guide.includes('five years'));
});
const report={familyId:FAMILY,scope:'AUTHOR_QA_ONLY',actualRendererExecuted:true,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
