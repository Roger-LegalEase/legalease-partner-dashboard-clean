/** Independent actual declaration review and isolated corruption controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {bindDeclaredGaDelivery,selectDeclaredGaFixture} from '../../../../../../../scripts/grade-a-packet-factory-24h/ga-declared-delivery.mjs';
import {FAMILY,ROUTE,OUT,SOURCE,fixtures} from '../../../../../../../scripts/rcap-packet-recovery/chat5/ga-pre2013.mjs';

const out=path.dirname(new URL(import.meta.url).pathname);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p);
const json=p=>JSON.parse(read(p));
const family={familyId:FAMILY,directory:OUT,routeKeys:[ROUTE]};
const actual=json(`${OUT}/product-wiring.json`);
const raster=json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json').rows.find(r=>r.familyId===FAMILY);
const rebound=bindDeclaredGaDelivery(actual,family,{raster});
assert.deepEqual(rebound,actual);
const pass=raster.rasterReceipt;
assert.equal(actual.binding.acceptanceReceipt.workflowRunId,'34232991361');
assert.equal(actual.binding.acceptanceReceipt.jobId,pass.jobId);
assert.equal(actual.binding.acceptanceReceipt.artifactId,pass.receiptArtifact.id);
for(const key of ['documentsMeasured','pagesMeasured','documentsCovered','documentsDigest','boundToCanonicalSha256','boundToBoundarySha256']) assert.deepEqual(actual.binding.acceptanceReceipt[key],pass[key]);
assert.equal(actual.runtimeInstalled,false);
assert.equal(actual.currentState.runtimeSelectable,false);
assert.equal(actual.binding.generationAllowed,false);
assert.equal(actual.binding.filingPermitted,false);
assert.equal(actual.binding.paymentEligible,false);
assert.equal(actual.binding.sponsorshipEligible,false);
const examples=fixtures();let selected=0,diagnostics=0;
const protectedFiles=new Map([[SOURCE,sha(read(SOURCE))],[`${OUT}/reports/rendered-artifacts.json`,sha(read(`${OUT}/reports/rendered-artifacts.json`))]]);
for(const item of actual.binding.conditionalDelivery.fixtureBindings) {
  for(const p of [item.file,item.input.file,item.guide.file]) protectedFiles.set(p,sha(read(p)));
  assert.equal(sha(read(item.file)),item.sha256);
  assert.equal(sha(execFileSync('git',['show',`774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90:${item.file}`],{maxBuffer:8*1024*1024})),item.sha256);
  assert.equal(item.filingReady,false);
  assert(item.requiredBeforeFiling.some(m=>m.fieldId==='participant.ssn'));
  if(item.selectionKind==='diagnostic') {
    assert.throws(()=>selectDeclaredGaFixture(actual,examples[item.fixture],item.fixture),/DIAGNOSTIC_IS_NOT_A_POSITIVE_SELECTION/);
    diagnostics++;
  } else {
    assert.deepEqual(selectDeclaredGaFixture(actual,examples[item.fixture],item.fixture),item);
    selected++;
  }
}
assert.equal(selected,12);assert.equal(diagnostics,3);
const controls=[];
for(const [name,mutate] of [
  ['runtimeInstalled',r=>{r.runtimeInstalled=true;}],
  ['runtimeSelectable',r=>{r.currentState.runtimeSelectable=true;}],
  ['binding.runtimeInstalled',r=>{r.binding.runtimeInstalled=true;}],
  ['binding.generationAllowed',r=>{r.binding.generationAllowed=true;}],
  ['binding.filingPermitted',r=>{r.binding.filingPermitted=true;}],
]) {
  const changed=structuredClone(actual);mutate(changed);
  assert.throws(()=>selectDeclaredGaFixture(changed,examples['basis-01'],'basis-01'));
  controls.push({name,refused:true});
}
const originalRead=fs.readFileSync;
const target=path.resolve(OUT,'reports/rendered-artifacts.json');
const report=JSON.parse(originalRead(target));
for(const item of report.artifacts) item.documents=item.documents.filter(id=>id!=='participant-instructions');
report.packets=structuredClone(report.artifacts);
try {
  fs.readFileSync=function(file,...args){
    if(path.resolve(String(file))===target)return Buffer.from(JSON.stringify(report));
    return originalRead.call(this,file,...args);
  };
  assert.throws(()=>bindDeclaredGaDelivery(actual,family),/omitted or changed an included component/);
  controls.push({name:'participant guide omitted from top-level component declarations',refused:true});
} finally {fs.readFileSync=originalRead;}
for(const [name,mutate] of [
  ['one whole output absent',r=>{r.documents.pop();}],
  ['one whole page unmeasured',r=>{r.rasterReceipt.pagesMeasured=107;}],
  ['diagnostic relabeled as selectable example',r=>{r.documents.find(d=>d.selectionKind==='diagnostic').selectionKind='conditional_packet_example';}],
  ['required manual SSN removed',r=>{r.documents[0].requiredBeforeFiling=[];}],
]) {
  const changed=structuredClone(raster);mutate(changed);
  assert.throws(()=>bindDeclaredGaDelivery(actual,family,{raster:changed}));
  controls.push({name,refused:true});
}
const noReceipt=bindDeclaredGaDelivery(actual,family);
assert.equal(noReceipt.binding.acceptanceReceipt,null);
for(const [file,digest] of protectedFiles)assert.equal(sha(read(file)),digest);
const paths=['scripts/grade-a-packet-factory-24h/ga-declared-delivery.mjs','scripts/grade-a-packet-factory-24h/test-ga-declared-delivery.mjs','scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs'];
const result={scope:'Independent exact GA declaration/actual accepted receipt binding and in-memory controls',
  reviewedFiles:paths.map(p=>({path:p,sha256:sha(read(p))})),wiringSha256:sha(read(`${OUT}/product-wiring.json`)),
  packetPublicationCommit:'774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90',workflowRunId:pass.workflowRunId,jobId:pass.jobId,artifactId:pass.receiptArtifact.id,
  documents:15,pages:108,conditionalExamplesSelected:selected,diagnosticSelectionsRefused:diagnostics,
  independentControls:controls,independentControlsPassed:controls.length,staleReceiptClearedWithoutAcceptedRaster:true,
  actualReceiptMatchesWiring:true,sourcePdfFactsAndReportFilesUnchanged:protectedFiles.size,
  everyExampleStillRequiresManualSsn:true,allFilingReadyFalse:true,independentAttribution:actual.binding.lastIndependentVerification,
  fixesVerified:['contradictory runtime/generation/filing authority flags rejected and output flags false','whole PDF component declaration must match measured per-fixture components in order'],
  sharedFilesEdited:false,packetRenderInvoked:false,admissionPerformed:false,runtimeInstalled:false,productionChanged:false};
fs.writeFileSync(path.join(out,'final-binding-review.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({documents:15,pages:108,selected,diagnostics,independentControlsPassed:controls.length,actualReceiptMatchesWiring:true,output:path.join(out,'final-binding-review.json')}));
