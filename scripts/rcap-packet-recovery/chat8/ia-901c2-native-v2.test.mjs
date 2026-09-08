import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {buildNativeReports,EVIDENCE} from './ia-901c2-native-v2.mjs';
import {ROOT,OUTPUT,FAMILY,read,write,snapshot} from './ia-901c2-compatibility.mjs';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const measurements=read(`${EVIDENCE}/byte-measurements.json`);
const sandbox=`${EVIDENCE}/test-sandbox`;
const before=snapshot(path.join(ROOT,OUTPUT));const cases=[];
const clean=()=>{fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});fs.cpSync(path.join(ROOT,OUTPUT),path.join(ROOT,sandbox),{recursive:true});};
async function setup(fixtures=null) {clean();return buildNativeReports({measurements,outDir:sandbox,fixtures});}
for(const fixture of ['canonical','boundary','good-cause-waiver','exact-day-180','missing-contact'])test(`${fixture}: real full native import with separate input facts`,async()=>{
 const r=await setup([fixture]);assert.equal(r.result.totals.terminalFields,57);assert.equal(r.readiness.length,1);
 assert.equal(r.result.result,fixture==='exact-day-180'?'FAIL_ROUTE_SELECTION':'PASS_COMPLETE');
 assert.equal(r.readiness[0].filingReady,false);
 assert.equal(r.readiness[0].classification,['exact-day-180','missing-contact'].includes(fixture)?'DIAGNOSTIC_NOT_FILING_POSITIVE':'SUPPORTED_UNEXECUTED_DRAFT');
 const map=read(`${sandbox}/production-field-map.json`);
 assert.ok(Object.keys(map.availableFacts).every(k=>k.startsWith(fixture+':')));
 if(fixture==='missing-contact'){assert.equal(r.readiness[0].missingParticipantControlAreas,12);assert.equal(r.readiness[0].missingParticipantFacts,11);}
 if(fixture==='exact-day-180')assert.equal(r.result.counters.requiredOptionsMissing,2);
 cases.push({fixture,result:r.result,readiness:r.readiness});
});
for(const field of ['cap.01','cap.04','sig.a.11','cert.06'])test(`held ${field} omitted everywhere cannot be laundered as unknown`,async()=>{
 await setup(['canonical']);const m=read(`${sandbox}/production-field-map.json`),a=read(`${sandbox}/reports/actual-writes.json`);
 const row=m.writes.find(r=>r.field===`2.86-1.${field}`);assert.ok(row);
 m.writes=m.writes.filter(r=>r!==row);m.refusals.push({...row,completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,reason:'Explicitly unknown; supply before filing.'});
 for(const d of a.documents)d.actualWrites=d.actualWrites.filter(r=>r.field!==row.field);
 write(`${sandbox}/production-field-map.json`,m);write(`${sandbox}/reports/actual-writes.json`,a);
 fs.appendFileSync(path.join(ROOT,sandbox,'participant-instructions.md'),'\n'+row.fieldId+' must be supplied.\n');
 const r=auditFamily(sandbox,FAMILY);assert.ok(r.counters.knownRequiredFieldsMissing>0);cases.push({negative:'held fact omitted everywhere',field,result:r});
});
test('canonical known address does not satisfy missing-contact address',async()=>{
 const r=await setup();assert.equal(r.result.totals.terminalFields,285);
 const m=read(`${sandbox}/production-field-map.json`);
 assert.equal(m.availableFacts['canonical:address'],'100 Example Lane');assert.equal(m.availableFacts['missing-contact:address'],null);
 const b=read(`${sandbox}/reports/blank-dispositions.json`).blanks.find(r=>r.fieldId==='missing-contact:2.86-1.sig.a.05');
 assert.equal(b.importerDisposition,'REQUIRED_BEFORE_FILING');assert.equal(r.result.counters.knownRequiredFieldsMissing,0);
});
test('intended-recipient facts stay separate from participant address',async()=>{
 await setup(['canonical']);const b=read(`${sandbox}/reports/fixture-input-facts.json`).bindings;
 assert.equal(b.find(r=>r.fieldId==='canonical:2.86-1.cert.06').factId,'canonical:countyAttorney.address');
 assert.notEqual(b.find(r=>r.fieldId==='canonical:2.86-1.cert.06').value,b.find(r=>r.fieldId==='canonical:2.86-1.sig.a.05').value);
});
test('eFile paper certificate does not inherit known participant identity',async()=>{
 await setup(['boundary']);const b=read(`${sandbox}/reports/blank-dispositions.json`).blanks.filter(r=>r.field.startsWith('2.86-1.cert.'));
 assert.equal(b.length,9);assert.ok(b.every(r=>r.importerDisposition==='NOT_APPLICABLE_ON_THIS_ROUTE'&&r.factId===null));
});
test('native input known-value injection catches the source of a missing-field claim',async()=>{
 await setup(['missing-contact']);const m=read(`${sandbox}/production-field-map.json`);
 m.availableFacts['missing-contact:countyAttorney.name']='Held recipient';write(`${sandbox}/production-field-map.json`,m);
 const r=auditFamily(sandbox,FAMILY);assert.ok(r.counters.knownRequiredFieldsMissing>0);cases.push({negative:'held recipient silently omitted',result:r});
});
test('wrong fixture prefix is an observable known-fact mix, not a positive case',async()=>{
 await setup();const m=read(`${sandbox}/production-field-map.json`),b=m.refusals.find(r=>r.fieldId==='missing-contact:2.86-1.sig.a.05');
 b.factId='canonical:address';write(`${sandbox}/production-field-map.json`,m);
 assert.ok(auditFamily(sandbox,FAMILY).counters.knownRequiredFieldsMissing>0);
});
test('a modified held fact cannot be rebound to different unchanged PDF text',async()=>{
 const rel=`${OUTPUT}/fixtures/canonical.json`,original=fs.readFileSync(path.join(ROOT,rel));
 try {const f=JSON.parse(original);f.caseNumber='DIFFERENT';write(rel,f);await assert.rejects(setup(['canonical']),/Printed fact disagrees/);}
 finally{fs.writeFileSync(path.join(ROOT,rel),original);}
});
test('two report-only runs are identical, without a renderer',async()=>{
 await setup();const a=snapshot(path.join(ROOT,sandbox));await buildNativeReports({measurements,outDir:sandbox});assert.deepEqual(snapshot(path.join(ROOT,sandbox)),a);
});
test('all nine counters still reject meaningful negative controls',async()=>{
 const mutations={
  requiredFactsNotCollected:m=>m.refusals.push({fieldId:'new-undisclosed',label:'Required undisclosed residence',completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true}),
  unclassifiedBlanks:m=>{m.refusals[0].completenessDisposition='NOT_A_REAL_DISPOSITION';},
  incompleteRows:m=>{m.writes.push({fieldId:'x.a',fieldName:'Item9[0].Row7[0].CaseNo[0]',label:'Case number'});m.refusals.push({fieldId:'x.b',fieldName:'Item9[0].Row7[0].Section[0]',label:'Section'});},
  requiredOptionsMissing:m=>m.refusals.push({fieldId:'route-x',label:'Required route choice',isSelectionControl:true,routeDetermined:true}),
  requiredComponentsMissing:m=>m.writes.push({fieldId:'comp-x',label:'Case number',documentId:'ABSENT'}),
  invisibleWrites:(m,a)=>{a.artifacts[0].addedGlyphsReadFromOutputBytes=0;a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes=0;},
  protectedWrites:m=>m.writes.push({fieldId:'sign-x',label:'Participant signature'}),
  visualDefects:(m,a)=>{a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;},
 };
 for(const [counter,mutate] of Object.entries(mutations)){
  await setup(['canonical']);const m=read(`${sandbox}/production-field-map.json`),a=read(`${sandbox}/reports/actual-writes.json`);mutate(m,a);write(`${sandbox}/production-field-map.json`,m);write(`${sandbox}/reports/actual-writes.json`,a);
  const result=auditFamily(sandbox,FAMILY);assert.ok(result.counters[counter]>0,counter);cases.push({negative:counter,result});
 }
 // knownRequiredFieldsMissing exercised by five above controls.
});
test('zero changes to preserved source family, not only the five combined PDFs',()=>{
 assert.deepEqual(snapshot(path.join(ROOT,OUTPUT)),before);fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});
 write(`${EVIDENCE}/native-input-controls.json`,{authorImplementationQA:true,sourcePacketUnchanged:true,rendererInvoked:false,cases});
});
