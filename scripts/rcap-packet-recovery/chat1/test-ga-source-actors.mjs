#!/usr/bin/env node
// Real shared reader; sources and complete outputs are copied unchanged.
// No author verdict is overwritten and no aggregate runtime intake claim is made.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {createGaPre2013ActorVerifier} from '../../rcap-packet-completeness/ga-pre2013-source-actors.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const DIR='data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill', FAMILY='ga-nonconv-pre2013-set';
const base=path.join(ROOT,DIR), results=[],sha=b=>createHash('sha256').update(b).digest('hex');
const tree=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true}).filter(n=>fs.statSync(path.join(dir,n)).isFile()).sort().map(n=>[n,sha(fs.readFileSync(path.join(dir,n)))]));
const before=tree(base);let actual;
function test(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
const temp=fs.mkdtempSync(path.join(ROOT,'data/rcap-grade-a/.chat1-ga-actor-'));
function mutate(name,edit,check){test(name,()=>{const dir=path.join(temp,String(results.length));fs.cpSync(base,dir,{recursive:true});const change=(rel,fn)=>{const p=path.join(dir,rel),d=JSON.parse(fs.readFileSync(p));fn(d);fs.writeFileSync(p,JSON.stringify(d));};edit(change,dir);check(auditFamily(path.relative(ROOT,dir),FAMILY));});}
const findings=r=>r.findings.map(x=>x.field);
const refuseActor=r=>assert(r.counters.knownRequiredFieldsMissing>0 || r.counters.unclassifiedBlanks>0);
try{
 test('all four official fields reconcile through actual reader; 30 complete official pages compared',()=>{actual=auditFamily(DIR,FAMILY);assert.equal(actual.result,'PASS_COMPLETE');assert.equal(actual.totals.terminalFields,52);assert.equal(actual.totals.written,13);assert(Object.values(actual.counters).every(x=>x===0));assert.equal(actual.sourceActorMeasurements[0].completeOutputPagesCompared,30);});
 for(const id of ['agency.3','agency.4','prosecutor.2','prosecutor.9']){
  for(const [key,val] of [['page',2],['owner','applicant'],['sourceActorEvidence','Completed by Applicant'],['label','Different field']])
   mutate(`${id}: forged ${key} cannot receive source protection`,change=>change('production-field-map.json',m=>{m.refusals.find(r=>r.fieldId===id)[key]=val;}),refuseActor);
 }
 mutate('blank applicant Section One agency remains missing even with forged official ownership',change=>change('production-field-map.json',m=>{const i=m.writes.findIndex(w=>w.fieldId==='case.arrestingAgency');const [w]=m.writes.splice(i,1);m.refusals.push({...w,owner:'arresting agency official',sourceActorEvidence:'SECTION TWO - ARREST INFORMATION (Completed by Arresting Agency)',refusalClass:'court_prosecutor_clerk_or_agency_owned',reason:'Forged official ownership',verified:true});}),r=>assert(findings(r).includes('case.arrestingAgency')));
 for(const file of ['source-receipt.json','field-census.census-v1.json','production-field-map.json'])
  mutate(`stale source binding in ${file} is refused`,change=>change(file,m=>{if(file==='source-receipt.json')m.documents[0].sha256='0'.repeat(64);else m.sourceSha256='0'.repeat(64);}),refuseActor);
 mutate('wrong route cannot use actor reconciliation',change=>change('production-field-map.json',m=>m.routeKeys=['wrong-route']),refuseActor);
 mutate('missing census field cannot use actor reconciliation',change=>change('field-census.census-v1.json',m=>m.documents[0].officialFields=m.documents[0].officialFields.filter(r=>r.fieldId!=='agency.3')),refuseActor);
 mutate('duplicated census field is not independent source evidence',change=>change('field-census.census-v1.json',m=>m.documents[0].officialFields.push(m.documents[0].officialFields.find(r=>r.fieldId==='agency.3'))),refuseActor);
 mutate('missing protected whole-page region refuses reconciliation',change=>change('production-field-map.json',m=>m.protectedRegions=m.protectedRegions.filter(r=>r.page!==3)),refuseActor);
 mutate('missing artifact refuses reconciliation',(_change,dir)=>fs.unlinkSync(path.join(dir,'fixtures/canonical.pdf')),refuseActor);
 mutate('wrong output checksum refuses reconciliation',change=>change('reports/rendered-artifacts.json',m=>m.artifacts[0].sha256='0'.repeat(64)),refuseActor);
 mutate('missing fixture/report binding refuses reconciliation',change=>change('production-field-map.json',m=>m.fixtureReports.pop()),refuseActor);
 mutate('coherently shortened metadata cannot omit a retained full PDF',change=>{let fixture;change('reports/rendered-artifacts.json',m=>fixture=m.artifacts.pop().fixture);change('production-field-map.json',m=>m.fixtureReports=m.fixtureReports.filter(p=>p!=='reports/'+fixture+'.json'));},refuseActor);
 mutate('official field changed into claimed write remains protected',change=>change('production-field-map.json',m=>{const i=m.refusals.findIndex(r=>r.fieldId==='agency.3');m.writes.push({...m.refusals.splice(i,1)[0],value:'FORGED'});}),r=>assert(r.counters.protectedWrites>0));
 mutate('omitting official field does not avoid the partition',change=>change('production-field-map.json',m=>m.refusals=m.refusals.filter(r=>r.fieldId!=='agency.3')),r=>assert(r.counters.unclassifiedBlanks>0));
 mutate('manual SSN disclosure remains required',(_change,dir)=>{const p=path.join(dir,'participant-instructions.md');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replaceAll('Social Security Number','private field'));},r=>assert(r.counters.requiredFactsNotCollected>0));
 mutate('glyphless finalizer writes remain failures',change=>change('reports/actual-writes.json',m=>m.artifacts.forEach(x=>x.addedGlyphsReadFromOutputBytes=0)),r=>assert(r.counters.invisibleWrites>0));
 mutate('reported protected ink remains a failure',change=>change('reports/actual-writes.json',m=>m.artifacts[0].refusedFieldsWithInk=['prosecutor.9']),r=>assert(r.counters.protectedWrites>0));
 mutate('actual official-page injection fails even after all output checksums are updated', (change,dir)=>{
  const pdf=path.join(dir,'fixtures/canonical.pdf');
  execFileSync('python',['-c',"import fitz,sys,os; p=sys.argv[1]; d=fitz.open(p); d[2].insert_text((330,199),'INJECTED OFFICIAL',fontsize=12); d.save(p+'.tmp'); d.close(); os.replace(p+'.tmp',p)",pdf]);
  const bytes=fs.readFileSync(pdf),hash=sha(bytes);
  change('reports/rendered-artifacts.json',m=>{m.artifacts.find(a=>a.fixture==='canonical').sha256=hash;m.artifacts.find(a=>a.fixture==='canonical').byteLength=bytes.length;});
  change('reports/canonical.json',m=>{m.output.sha256=hash;m.output.byteLength=bytes.length;});
 },refuseActor);
 test('held source bytes are checked, not merely receipt booleans',()=>{
  const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'chat1-ga-source-'));
  try{
   const load=n=>JSON.parse(fs.readFileSync(path.join(base,n)));const source='reference/chat-parallel-2026-09-07/chat5/GCIC-pre2013-restriction.pdf';fs.mkdirSync(path.dirname(path.join(scratch,source)),{recursive:true});fs.writeFileSync(path.join(scratch,source),'%PDF-forged');
   const map=load('production-field-map.json'),r=map.refusals.find(r=>r.fieldId==='agency.3');
   const verify=createGaPre2013ActorVerifier({root:scratch,directory:DIR,familyId:FAMILY,fieldMap:map,census:load('field-census.census-v1.json'),receipt:load('source-receipt.json'),rendered:load('reports/rendered-artifacts.json')});
   const result=verify({...r,id:r.fieldId,document:r.documentId,declared:{},verified:true});assert.equal(result.verified,false);assert.match(result.failure,/held source bytes/);
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
 });
 test('source-bound changes do not claim the separately failed guide is repaired',()=>{
  const source=fs.readFileSync(path.join(base,'participant-instructions.md'),'utf8');assert(!/42-8-63\.1/.test(source));assert.deepEqual(tree(base),before);
 });
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const report={scope:'shared static importer and exact-source actor correction, not independent packet review or runtime intake',passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,tests:results,actualCandidateResult:actual,candidateFilesUnchanged:JSON.stringify(tree(base))===JSON.stringify(before),remainingIndependentFailure:'CHAT4-GA-01: employment/office warning',terminalPromotions:0,productionTouched:false};
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
