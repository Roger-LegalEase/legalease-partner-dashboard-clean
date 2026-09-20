#!/usr/bin/env node
// Calls the existing unmodified auditFamily, including every conditional map.
// Author checks of that reader are not independent acceptance or runtime proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {ROOT,OUT,FAMILY,json} from './md-cannabis.mjs';
const base=path.join(ROOT,OUT),read=f=>JSON.parse(fs.readFileSync(path.join(base,f),'utf8'));
const allMap=read('production-field-map.json'),index=read('reports/rendered-artifacts.json'),actual=read('reports/actual-writes.json'),receipt=read('source-receipt.json');
const dir=path.join(ROOT,'data/rcap-grade-a/chat-parallel-2026-09-07/chat5-build');fs.mkdirSync(dir,{recursive:true});const tmp=fs.mkdtempSync(path.join(dir,'.md-cannabis-importer-'));
const results=[],branches=[];
function check(name,fn){try{fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.stack});}}
function context(fixture,name){
 const out=path.join(tmp,name);fs.mkdirSync(path.join(out,'reports'),{recursive:true});
 const artifact=index.pdfs.find(a=>a.fixture===fixture),map=allMap.conditionalMaps[fixture],ids=new Set(artifact.documents.map(d=>d.documentId));
 const put=(p,v)=>fs.writeFileSync(path.join(out,p),json(v));
 put('production-field-map.json',map);put('source-receipt.json',{...receipt,sources:receipt.sources.filter(s=>ids.has(s.documentId))});
 put('reports/rendered-artifacts.json',{...index,pdfs:[artifact],artifacts:[artifact]});
 put('reports/actual-writes.json',{...actual,documents:actual.documents.filter(d=>d.fixture===fixture),artifacts:actual.artifacts.filter(a=>a.fixture===fixture)});
 fs.copyFileSync(path.join(base,'instructions',fixture+'.md'),path.join(out,'participant-instructions.md'));
 return out;
}
const audit=folder=>auditFamily(path.relative(ROOT,folder),FAMILY);
function mutate(name,fixture,change,verify){check(name,()=>{const folder=context(fixture,'mutant-'+results.length);const edit=(p,fn)=>{const file=path.join(folder,p),v=JSON.parse(fs.readFileSync(file));fn(v);fs.writeFileSync(file,json(v));};change(edit,folder);verify(audit(folder));});}
try{
 check('default real reader imports canonical paid packet',()=>{const r=auditFamily(OUT,FAMILY);assert.equal(r.auditable,true);assert.equal(r.result,'PASS_COMPLETE');assert.equal(r.totals.terminalFields,38);});
 for(const [fixture,map] of Object.entries(allMap.conditionalMaps)){
  const r=audit(context(fixture,'fixture-'+branches.length));branches.push({fixture,allKnownFactsPrepared:map.allKnownFactsPrepared,...r});
  check('real reader actual field map '+fixture,()=>{
   assert.equal(r.auditable,true);assert.equal(r.sourceCurrentness,'EXACT');assert.equal(r.totals.terminalFields,map.writes.length+map.refusals.length);
   if(map.allKnownFactsPrepared)assert.equal(r.result,'PASS_COMPLETE',JSON.stringify(r.findings));
   else assert.equal(map.allKnownFactsPrepared,false); // Diagnostic result retained, never declared filing-ready.
  });
 }
 mutate('known applicant name may not disappear','canonical',edit=>edit('production-field-map.json',m=>{const w=m.writes.find(w=>w.field==='Defendant Name');assert(w);m.writes=m.writes.filter(x=>x!==w);m.refusals.push({...w,requiredBeforeFiling:true,completenessDisposition:'REQUIRED_BEFORE_FILING',reason:'Missing value'});}),r=>assert(r.counters.knownRequiredFieldsMissing>0));
 mutate('forged signature declaration detected','canonical',edit=>edit('production-field-map.json',m=>m.writes.push({field:'Signature of Defendant',sourceLabel:'Defendant signature',documentId:'CC-DC-CR-072D',value:'SIGNED'})),r=>assert(r.counters.protectedWrites>0));
 mutate('invented judicial order detected','selectable/possession-waiver',edit=>edit('production-field-map.json',m=>m.writes.push({field:'Judge Signature',sourceLabel:'Judge signature',documentId:'CC-DC-089',value:'SIGNED'})),r=>assert(r.counters.protectedWrites>0));
 mutate('missing component inventory fails','selectable/possession-waiver',edit=>edit('reports/rendered-artifacts.json',m=>m.packets=[{documents:[]}]),r=>assert(r.counters.requiredComponentsMissing>0));
 mutate('no actual appearance evidence fails','canonical',edit=>edit('reports/actual-writes.json',m=>m.artifacts.forEach(a=>a.flattenedWidgetAppearancesReadFromOutputBytes=0)),r=>assert(r.counters.invisibleWrites>0));
 mutate('reported protected ink is not ignored','selectable/possession-waiver',edit=>edit('reports/actual-writes.json',m=>m.artifacts[0].refusedFieldsWithInk=['Judge Signature']),r=>assert(r.counters.protectedWrites>0));
 mutate('source drift is not approved','canonical',edit=>edit('source-receipt.json',m=>m.allSourcesExact=false),r=>assert.equal(r.sourceCurrentness,'NOT_EXACT'));
 mutate('omitted financial disclosure is detected','diagnostic/waiver-missing-financial',(_edit,folder)=>fs.writeFileSync(path.join(folder,'participant-instructions.md'),'No financial instructions.'),r=>assert(r.counters.requiredFactsNotCollected>0));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
const report={familyId:FAMILY,scope:'AUTHOR_REAL_IMPORTER_TESTS_NOT_INDEPENDENT_APPROVAL',reader:'scripts/rcap-packet-completeness/verify-packet-completeness.mjs',sharedReaderModified:false,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,results,branches,diagnosticCaution:'A PASS from this static reader is not a declaration of filing readiness for unresolved-predicate or unknown-financial diagnostics; allKnownFactsPrepared and full disclosures remain authoritative for those candidate outputs.',runtimeApproval:false};
if(process.argv[2])fs.writeFileSync(process.argv[2],json(report));console.log(json(report));if(report.failed)process.exitCode=1;
