import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUTPUT, EVIDENCE, FAMILY, read, write, snapshot, buildCompatibility } from './ia-901c2-compatibility.mjs';
import { auditFamily } from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
const measurements=read(`${EVIDENCE}/byte-measurements.json`);
const sandbox=`${EVIDENCE}/test-sandbox`;
const clean=()=>{fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});fs.cpSync(path.join(ROOT,OUTPUT),path.join(ROOT,sandbox),{recursive:true});};
const baseline=snapshot(path.join(ROOT,OUTPUT));
const cases=[];
for(const fixture of ['canonical','boundary','good-cause-waiver','exact-day-180','missing-contact'])test(`actual unchanged ${fixture} imports, with explicit readiness`,async()=>{
 clean();const x=await buildCompatibility({measurements,outDir:sandbox,fixtures:[fixture]});
 assert.equal(x.result.totals.terminalFields,57);
 if(fixture==='exact-day-180') {assert.equal(x.result.result,'FAIL_ROUTE_SELECTION');assert.equal(x.result.counters.requiredOptionsMissing,2);assert.equal(x.readiness[0].classification,'DIAGNOSTIC_NOT_FILING_POSITIVE');}
 else assert.equal(x.result.result,'PASS_COMPLETE');
 assert.equal(x.readiness[0].filingReady,false);
 if(fixture==='missing-contact'){assert.equal(x.readiness[0].missingParticipantFacts,12);assert.equal(x.result.totals.blanksByDisposition.REQUIRED_BEFORE_FILING,12);assert.equal(x.readiness[0].classification,'DIAGNOSTIC_NOT_FILING_POSITIVE');}
 cases.push({fixture,result:x.result,readiness:x.readiness});
});
const mutate=async(fn,counter)=>{
 clean();await buildCompatibility({measurements,outDir:sandbox,fixtures:['canonical']});
 const m=read(`${sandbox}/production-field-map.json`),a=read(`${sandbox}/reports/actual-writes.json`);fn(m,a);
 write(`${sandbox}/production-field-map.json`,m);write(`${sandbox}/reports/actual-writes.json`,a);
 const result=auditFamily(sandbox,FAMILY);assert.ok(result.counters[counter]>0,JSON.stringify(result));cases.push({negative:counter,result});
};
test('known supplied name cannot become an unavailable blank',()=>mutate(m=>{
 const row=m.writes.find(x=>x.field==='2.86-1.cap.03');m.writes=m.writes.filter(x=>x!==row);m.refusals.push({...row,completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,reason:'Must complete before filing'});
},'knownRequiredFieldsMissing'));
test('undisclosed required-before-filing value is caught',()=>mutate(m=>m.refusals.push({fieldId:'required.new',label:'Unreported required residence fact',requiredBeforeFiling:true,completenessDisposition:'REQUIRED_BEFORE_FILING',reason:'Explicitly unknown'}),'requiredFactsNotCollected'));
test('unknown disposition is not accepted',()=>mutate(m=>{m.refusals[0].completenessDisposition='MAGIC_PASS';},'unclassifiedBlanks'));
test('incomplete actual row shape is caught',()=>mutate(m=>{m.writes.push({fieldId:'probe.Row1.case',fieldName:'Item9[0].Row7[0].CaseNo[0]',label:'Case number'});m.refusals.push({fieldId:'probe.Row1.statute',fieldName:'Item9[0].Row7[0].Section[0]',label:'Section',reason:'No known value'});},'incompleteRows'));
test('unselected route choice cannot be excused as participant discretion',()=>mutate(m=>m.refusals.push({fieldId:'route-probe',label:'Required route choice',isSelectionControl:true,routeDetermined:true,reason:'Not selected'}),'requiredOptionsMissing'));
test('missing rendered component is caught',()=>mutate(m=>m.writes.push({fieldId:'missing-comp',label:'Case number',documentId:'deliberately-absent-source-component'}),'requiredComponentsMissing'));
test('zero actual ink with declared writes is caught',()=>mutate((m,a)=>{a.artifacts[0].addedGlyphsReadFromOutputBytes=0;a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes=0;},'invisibleWrites'));
test('protected signature write is caught',()=>mutate(m=>m.writes.push({fieldId:'signature-probe',label:'Participant signature'}),'protectedWrites'));
test('measured out-of-box ink is caught',()=>mutate((m,a)=>{a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=1;},'visualDefects'));
test('source presentation must match independently measured census identity',()=>mutate(m=>{m.refusals.find(x=>x.sourcePresentation).sourcePresentation.sourceSha256='0'.repeat(64);},'unclassifiedBlanks'));
test('fake source source-field alias rejected',()=>mutate(m=>{m.refusals.find(x=>x.sourcePresentation).sourcePresentation.sourceField='unrelated-field';},'unclassifiedBlanks'));
test('known contact cannot hide behind unavailable declaration',async()=>{
 clean();await buildCompatibility({measurements,outDir:sandbox,fixtures:['missing-contact']});
 const m=read(`${sandbox}/production-field-map.json`);m.availableFacts={'missing-contact:address':'Known supplied street'};write(`${sandbox}/production-field-map.json`,m);
 const r=auditFamily(sandbox,FAMILY);assert.ok(r.counters.knownRequiredFieldsMissing>0);cases.push({negative:'known-contact-laundering',result:r});
});
test('real measured artifact hash mismatch refuses compatibility',async()=>{
 const m=structuredClone(measurements);m.results[0].sha256='0'.repeat(64);
 clean();await assert.rejects(buildCompatibility({measurements:m,outDir:sandbox,fixtures:['canonical']}),/Unbound measurements/);
});
test('no selected fixture refuses, not an empty pass',async()=>{
 clean();await assert.rejects(buildCompatibility({measurements,outDir:sandbox,fixtures:['no-such-fixture']}),/No real fixtures/);
});
test('report-only regeneration is deterministic and changes no PDF',async()=>{
 clean();await buildCompatibility({measurements,outDir:sandbox});const a=snapshot(path.join(ROOT,sandbox));
 await buildCompatibility({measurements,outDir:sandbox});assert.deepEqual(snapshot(path.join(ROOT,sandbox)),a);
});
test('canonical service recipient is participant-completable, not attorney execution',async()=>{
 clean();await buildCompatibility({measurements,outDir:sandbox,fixtures:['missing-contact']});const b=read(`${sandbox}/reports/blank-dispositions.json`).blanks.find(x=>x.field==='2.86-1.cert.05');assert.equal(b.importerDisposition,'REQUIRED_BEFORE_FILING');assert.match(b.printedLabel,/Name of person/);
});
test('all source and original PDFs stay unchanged through all checks',()=>{
 assert.deepEqual(snapshot(path.join(ROOT,OUTPUT)),baseline);fs.rmSync(path.join(ROOT,sandbox),{recursive:true,force:true});write(`${EVIDENCE}/importer-positive-negative-results.json`,{authorQA:true,cases,originalFamilyUnchanged:true,oldRendererTestsReplayed:false});
});
