import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {ROOT,FAMILY,OUTPUT,EVIDENCE,sha256} from './ia-dci77.mjs';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const sandbox=`${EVIDENCE}/importer-test-sandbox`,results=[];
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const write=(p,x)=>fs.writeFileSync(path.join(ROOT,p),JSON.stringify(x,null,2)+'\n');
function snapshot(dir){const out={};const walk=p=>{for(const f of fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const q=path.join(p,f.name);if(f.isDirectory())walk(q);else out[path.relative(dir,q)]=sha256(fs.readFileSync(q));}};walk(dir);return out;}
const before=snapshot(path.join(ROOT,OUTPUT));
function setup(){fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});fs.cpSync(path.join(ROOT,OUTPUT),path.join(ROOT,sandbox),{recursive:true});}
test('real unchanged importer reads every source-control occurrence, not zero fields',()=>{
 setup();const r=auditFamily(sandbox,FAMILY);assert.equal(r.totals.terminalFields,659);assert.equal(r.totals.written,302);assert.equal(r.totals.blank,357);assert.equal(r.result,'PASS_COMPLETE');
 assert.equal(r.totals.blanksByDisposition.REQUIRED_BEFORE_FILING,10);results.push({case:'intact',result:r});
});
test('raw structural success does not promote unknown or unsigned submissions',()=>{
 const x=read(`${OUTPUT}/reports/packet-level-readiness.json`);assert.equal(x.fixtures.length,12);assert.equal(x.acquisitionOnly,true);assert.equal(x.externalRecordIncluded,false);
 for(const f of x.fixtures){assert.equal(f.submissionReady,false);assert.ok(f.pendingActions.length);}
 for(const key of ['unknown-gender','missing-required'])assert.equal(x.fixtures.find(f=>f.fixture===key).candidateClass,'DIAGNOSTIC_NOT_SUBMISSION_READY');
 assert.equal(x.fixtures.find(f=>f.fixture==='portal-two-names').candidateClass,'GUIDANCE_ONLY_NOT_SUBMITTED');
});
test('per-fixture identity binds withheld versus supplied gender without data leakage',()=>{
 const m=read(`${OUTPUT}/production-field-map.json`);assert.equal(m.availableFacts['canonical:gender'],'Other');assert.equal(m.availableFacts['unknown-gender:gender'],null);
 const b=m.refusals.find(f=>f.fieldId==='unknown-gender:request-1:Gender');assert.equal(b.factId,'unknown-gender:gender');assert.ok(b.requiredBeforeSubmission);assert.equal(b.completenessDisposition,'REQUIRED_BEFORE_FILING');
});
test('optional identifiers never masquerade as a returned criminal history report',()=>{
 const m=read(`${OUTPUT}/route-contract.json`);assert.equal(m.nodeType,'supporting_action');assert.equal(m.relief,false);assert.equal(m.commercialClearingMechanism,false);
 const r=read(`${OUTPUT}/reports/rendered-artifacts.json`);assert.equal(r.packets.some(p=>p.documents.some(d=>d.id==='returned-dci-history')),false);
});
const mutations={
 knownRequiredFieldsMissing:(m,a)=>{
  const w=m.writes.find(x=>x.fieldId==='canonical:request-1:First_Name2');assert.ok(w);m.writes=m.writes.filter(x=>x!==w);
  m.refusals.push({...w,completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,requiredBeforeSubmission:true,reason:'Supply unknown first name.'});
  for(const d of a.documents)d.actualWrites=d.actualWrites.filter(x=>x.fieldId!==w.fieldId);
  fs.appendFileSync(path.join(ROOT,sandbox,'participant-instructions.md'),'\n'+w.fieldId+' must be provided.\n');
 },
 requiredFactsNotCollected:m=>m.refusals.push({fieldId:'new-required-unmentioned',label:'Subject required undisclosed residence',completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true}),
 unclassifiedBlanks:m=>{m.refusals[0].completenessDisposition='FAKE_DISPOSITION';},
 incompleteRows:m=>{m.writes.push({fieldId:'row-x-a',fieldName:'Item9[0].Row7[0].CaseNo[0]',label:'Case number'});m.refusals.push({fieldId:'row-x-b',fieldName:'Item9[0].Row7[0].Section[0]',label:'Section'});},
 requiredOptionsMissing:m=>m.refusals.push({fieldId:'required-option',label:'Required route choice',isSelectionControl:true,routeDetermined:true}),
 requiredComponentsMissing:m=>m.writes.push({fieldId:'missing-doc-x',label:'First name',documentId:'NOT_DELIVERED'}),
 invisibleWrites:(m,a)=>{a.artifacts[0].addedGlyphsReadFromOutputBytes=0;a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes=0;},
 protectedWrites:m=>m.writes.push({fieldId:'invented-signature-x',label:'Participant signature'}),
 visualDefects:(m,a)=>{a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;},
};
for(const [counter,mutate] of Object.entries(mutations))test(`${counter}: actual failure-producing native control`,()=>{
 setup();const m=read(`${sandbox}/production-field-map.json`),a=read(`${sandbox}/reports/actual-writes.json`);mutate(m,a);write(`${sandbox}/production-field-map.json`,m);write(`${sandbox}/reports/actual-writes.json`,a);
 const r=auditFamily(sandbox,FAMILY);assert.ok(r.counters[counter]>0,counter);results.push({case:counter,result:r});
});
test('one request cannot borrow a subject name from a different surname request',()=>{
 setup();const m=read(`${sandbox}/production-field-map.json`),a=read(`${sandbox}/reports/actual-writes.json`),id='boundary:request-2:Last_Name2';
 const w=m.writes.find(x=>x.fieldId===id);assert.equal(w.factId,'boundary:names.1.last');m.writes=m.writes.filter(x=>x!==w);m.refusals.push({...w,completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,reason:'Missing surname.'});
 for(const d of a.documents)d.actualWrites=d.actualWrites.filter(x=>x.fieldId!==id);
 fs.appendFileSync(path.join(ROOT,sandbox,'participant-instructions.md'),'\n'+id+' is required.\n');write(`${sandbox}/production-field-map.json`,m);write(`${sandbox}/reports/actual-writes.json`,a);
 const r=auditFamily(sandbox,FAMILY);assert.ok(r.counters.knownRequiredFieldsMissing>0);results.push({case:'second surname omitted',result:r});
});
test('unsupported presentation claim still leaves ten required-before-submission areas',()=>{
 setup();const m=read(`${sandbox}/production-field-map.json`),b=m.refusals.find(x=>x.fieldId==='missing-required:billing:Payment');b.completenessDisposition='NON_FILING_SOURCE_ELEMENT';write(`${sandbox}/production-field-map.json`,m);
 const r=auditFamily(sandbox,FAMILY);assert.equal(r.totals.blanksByDisposition.REQUIRED_BEFORE_FILING,10);assert.equal(r.totals.blanksByDisposition.NON_FILING_SOURCE_ELEMENT??0,0);results.push({case:'false presentation claim not accepted; valid disclosed-missing fallback retained',result:r});
});
after(()=>{
 assert.deepEqual(snapshot(path.join(ROOT,OUTPUT)),before);fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});write(`${EVIDENCE}/importer-test-cases.json`,{authorNativeQA:true,sharedReaderUnmodified:true,wholeCandidateUnchanged:true,results});
});
