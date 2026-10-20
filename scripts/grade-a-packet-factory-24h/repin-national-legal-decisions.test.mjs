import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ADAPTERS, compareAnchors, sha256} from './repin-lapsed-source-identities.mjs';
const recordPath='data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json';
const adapter=ADAPTERS.get(recordPath);
const currentBytes=fs.readFileSync(recordPath);
const current=JSON.parse(currentBytes);
const historicalBytes=execFileSync('git',['show',`66be051f4^:${recordPath}`],{maxBuffer:4e6});
assert.equal(sha256(historicalBytes).slice(0,8),'0aad88ef');
const historical=JSON.parse(historicalBytes);
const directory='data/rcap-all50/overlays/census-v1/sc/composed-treatment:sc-17-22-950-summary--custom-pleading';
const receipt=JSON.parse(fs.readFileSync(`${directory}/source-receipt.json`));
const pin=receipt.committedRecords.find(p=>p.pathInRepository===recordPath);
assert.equal(pin.recordId,'legal-decision:2026-08-28:Q-035:sc_17_22_950_summary');
// A lane return recording the current digest for this family, the way a re-verification row does.
const laneReturnRoot=fs.mkdtempSync(path.join(os.tmpdir(),'decisions-rows-'));
fs.mkdirSync(path.join(laneReturnRoot,'vf11'));
fs.writeFileSync(path.join(laneReturnRoot,'vf11','rows-vf11-test.json'),JSON.stringify({lane:'VF11',rows:[{itemId:receipt.familyId,lane:'VF11',verdict:'PASS_COMPLETE_INDEPENDENT',verifiedAtBase:'f3ff92ac2',proofObligations:{SOURCE_IDENTITY:{result:'PASS',detail:`now ${sha256(currentBytes)} / ${currentBytes.length}`}}}]}));
const empty=fs.mkdtempSync(path.join(os.tmpdir(),'decisions-rows-empty-'));
const scopeOf=(doc,p=pin,root=laneReturnRoot,r=receipt)=>adapter.scopeFrom({receipt:r,pin:p,currentDoc:doc,laneReturnRoot:root});
const compare=(a,b,p=pin)=>compareAnchors({adapter,oldDoc:a,currentDoc:b,scope:scopeOf(b,p)});
test('the actual drift 0aad88ef -> current leaves the SC Q-035 decision, its matrix rows and the shared authority identical',()=>{
  const result=compare(historical,current);
  assert.deepEqual(result.differing,[]);
  assert.deepEqual(result.anchorNames,['decisionsSharedAuthority','implementationMatrix:Q-029','question:Q-035:sc_17_22_950_summary']);
  const scope=scopeOf(current);
  assert.deepEqual(scope.derivation.measuredReVerification.map(m=>m.lane),['VF11']);
  const moved=[...new Set([...adapter.index(historical,'h').keys(),...adapter.index(current,'c').keys()])].filter(k=>JSON.stringify(adapter.index(historical,'h').get(k))!==JSON.stringify(adapter.index(current,'c').get(k)));
  assert.ok(moved.length>0&&!moved.includes('question:Q-035:sc_17_22_950_summary'));
});
test('a change to the controlling decision, its memo digest, its matrix row or the shared authority is a difference',()=>{
  for(const change of [
    d=>{d.questionDecisions.find(q=>q.registerQuestionId==='Q-035').holding='changed';},
    d=>{d.questionDecisions.find(q=>q.registerQuestionId==='Q-035').memoSha256='0'.repeat(64);},
    d=>{d.implementationMatrix.find(r=>r.reportQuestionId==='Q-029').reportDisposition='changed';},
    d=>{d.authority.sha256='0'.repeat(64);},
    d=>{d.crosswalk.rows=[];}
  ]){const next=structuredClone(current);change(next);assert.ok(compare(current,next).differing.length,'expected a difference');}
});
test('register bookkeeping moving is not a difference for this family',()=>{
  const next=structuredClone(current);next.scope.registerOpenQuestions=99;next.deliveryCounts.extra=1;next.expected.legallyOpen=99;
  assert.deepEqual(compare(current,next).differing,[]);
});
test('recordId forms: research track, immediate assignment and a bare track id resolve; unknown, ambiguous and missing refuse',()=>{
  assert.deepEqual(scopeOf(current,{recordId:'legal-decision:2026-08-28:research-track:co_mistaken_identity_expungement'}).anchorIds,['research-track:co_mistaken_identity_expungement']);
  assert.deepEqual(scopeOf(current,{recordId:'legal-decision:2026-08-28:LA-IMM-03:nd-nonconviction-auto-close-verify'}).anchorIds,['immediate:LA-IMM-03:nd-nonconviction-auto-close-verify']);
  assert.deepEqual(scopeOf(current,{recordId:'legal-decision:2026-08-28:ak-set-aside'}).anchorIds,['research-track:ak-set-aside']);
  assert.throws(()=>scopeOf(current,{recordId:'legal-decision:2026-08-28:me-seal-survivor'}),/2 decisions/);
  assert.throws(()=>scopeOf(current,{recordId:'legal-decision:2026-08-28:no-such-track'}),/0 decisions/);
  assert.throws(()=>scopeOf(current,{recordId:'legal-decision:2026-08-28:Q-999:sc_17_22_950_summary'}),/no decision/);
  // A pin with no recordId is scoped by the receipt's own routeKeys (SC: sc_17_22_950_summary); without any it refuses (next test).
  assert.deepEqual(scopeOf(current,{path:recordPath,sha256:'0'.repeat(64)}).anchorIds,['question:Q-035:sc_17_22_950_summary']);
  // The NY 160.55 receipt's file-stem form resolves its bare track like the prefix form (repin-recordid-less-scopes.test.mjs covers its refusals).
  assert.deepEqual(scopeOf(current,{recordId:'legal-decision:2026-08-28-national#ny_160_55_violation'}).anchorIds,['research-track:ny_160_55_violation']);
});
test('without a measured re-verification row recording the current digest the scope refuses',()=>{
  assert.throws(()=>scopeOf(current,pin,empty),/no independent re-verification row/);
});
test('a duplicate or id-less decision and an unknown top-level key refuse',()=>{
  const dup=structuredClone(current);dup.questionDecisions.push(dup.questionDecisions.find(q=>q.registerQuestionId==='Q-035'));
  assert.throws(()=>compare(current,dup),/duplicate decision/);
  const idless=structuredClone(current);idless.researchTrackDecisions.push({jurisdiction:'XX'});
  assert.throws(()=>compare(current,idless),/no id/);
  const extra=structuredClone(current);extra.newSection={};
  assert.throws(()=>compare(current,extra),/not the shape/);
  const gone=structuredClone(current);gone.questionDecisions=gone.questionDecisions.filter(q=>q.registerQuestionId!=='Q-035');
  assert.throws(()=>compareAnchors({adapter,oldDoc:current,currentDoc:gone,scope:scopeOf(current)}),/absent from the current record/);
});
test('a recordId-less pin is scoped by the family route keys: receipt first, else product-wiring.json, never both disagreeing',()=>{
  const al=adapter.scopeFrom({receipt:{familyId:receipt.familyId,routeKeys:['obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge']},pin:{},currentDoc:current,laneReturnRoot});
  assert.deepEqual(al.anchorIds,['research-track:al-uncharged-arrest']);assert.equal(al.derivation.fromRouteKeys.from,'receipt');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'decisions-wiring-'));const rel=path.relative(process.cwd(),dir);
  fs.writeFileSync(path.join(dir,'product-wiring.json'),JSON.stringify({routeKeys:['obligation:track-pathway:WV:wv_nc_diversion_deferred:x']}));
  const wv=adapter.scopeFrom({receipt:{familyId:receipt.familyId},pin:{},currentDoc:current,directory:rel,laneReturnRoot});
  assert.deepEqual(wv.anchorIds,['question:Q-055:wv_nc_diversion_deferred']);assert.equal(wv.derivation.fromRouteKeys.from,'product-wiring.json');
  const multi=adapter.scopeFrom({receipt:{familyId:receipt.familyId,routeKeys:['obligation:track-only:ME:me-seal-survivor']},pin:{},currentDoc:current,laneReturnRoot});
  assert.equal(multi.anchorIds.length,2);
  assert.throws(()=>adapter.scopeFrom({receipt:{familyId:receipt.familyId,routeKeys:['obligation:track-only:AL:al-uncharged-arrest']},pin:{},currentDoc:current,directory:rel,laneReturnRoot}),/differ/);
  assert.throws(()=>adapter.scopeFrom({receipt:{familyId:receipt.familyId},pin:{},currentDoc:current,laneReturnRoot}),/name no routeKeys/);
  assert.throws(()=>adapter.scopeFrom({receipt:{familyId:receipt.familyId,routeKeys:['obligation:track-only:XX:no-such-track']},pin:{},currentDoc:current,laneReturnRoot}),/no decision in the current record carries/);
  assert.throws(()=>adapter.scopeFrom({receipt:{familyId:receipt.familyId,routeKeys:['obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge']},pin:{},currentDoc:current,laneReturnRoot:empty}),/no independent re-verification row/);
  fs.rmSync(dir,{recursive:true,force:true});
});
