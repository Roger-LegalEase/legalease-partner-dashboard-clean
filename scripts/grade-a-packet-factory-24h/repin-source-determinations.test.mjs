import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {acceptedAcquisitionIdentity, ADAPTERS, compareAnchors, planReceipt, composeRefreshedReceipt, readsAsUnmoved, sha256} from './repin-lapsed-source-identities.mjs';
const recordPath='data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const adapter=ADAPTERS.get(recordPath);
const current=JSON.parse(fs.readFileSync(recordPath));
const historical=JSON.parse(execFileSync('git',['show',`d70e5995e^:${recordPath}`],{maxBuffer:4e6}));
const directory='data/rcap-all50/overlays/census-v1/az/az-certificate-second-chance-set--official-pdf-fill';
const beforeText=execFileSync('git',['show',`f3609fb6a:${directory}/source-receipt.json`],{encoding:'utf8',maxBuffer:4e6});
const receipt=JSON.parse(beforeText);
const pin=receipt.committedRecords.find(p=>p.pathInRepository===recordPath);
const compare=(a,b,r=receipt,p=pin)=>compareAnchors({adapter,oldDoc:a,currentDoc:b,scope:adapter.scopeFrom({receipt:r,pin:p,currentDoc:b})});
test('actual unrelated DE adoption preserves all AZ and shared source dependencies',()=>{
  const result=compare(historical,current);assert.deepEqual(result.differing,[]);
  const scope=adapter.scopeFrom({receipt,pin,currentDoc:current});
  const proof=scope.derivation.excludedAcquisitionEvidence.find(p=>p.itemId==='de_discretionary_family_court-set::official-form:FORM-283');
  assert.ok(proof);assert.equal(proof.sha256,sha256(fs.readFileSync(proof.path)));
});
test('changed family reconciliation, determination, or shared binding invalidates',()=>{
  for(const change of [d=>{d.reconciliation42.families.find(r=>r.familyId===receipt.familyId).disposition='SOURCE_BLOCKED';},d=>{d.determinations.find(r=>r.id.includes('AZ-SECOND-CHANCE')).determination='changed';},d=>{d.reconciliation42.sharedExactBindings.push({changed:true});}]){
    const next=structuredClone(current);change(next);assert.ok(compare(current,next).differing.length);
  }
});
test('unavailable or ambiguous evidence is retained as a shared dependency and refuses a refresh',()=>{
  const next=structuredClone(current);next.reconciliation42.acquisitionEvidencePaths.push('unavailable-proof.json');
  assert.ok(compare(current,next).differing.includes('sourceDeterminationSharedMetadata'));
  assert.throws(()=>compare(historical,current,receipt,{recordId:'unknown:scope'}));
  const duplicate=structuredClone(current);duplicate.reconciliation42.families.push(duplicate.reconciliation42.families.find(r=>r.familyId===receipt.familyId));
  assert.throws(()=>compare(current,duplicate));
  const ambiguous=structuredClone(current);ambiguous.reconciliation42.families.find(r=>r.familyId===receipt.familyId).dependsOn='another-family';
  assert.throws(()=>compare(current,ambiguous));
  const sharedDefault=structuredClone(current);sharedDefault.reconciliation42.defaultFamily='another-family';
  assert.throws(()=>compare(sharedDefault,sharedDefault));
});
test('a family cannot exclude its own newly added acquisition evidence',()=>{
  const family='de_discretionary_family_court-set';const a=structuredClone(historical),b=structuredClone(current);
  for(const d of [a,b]){
    d.determinations.push({id:'TEST-DE',families:[family]});
    d.reconciliation42.families=d.reconciliation42.families.map(r=>r.familyId===family?{familyId:family,group:'B',disposition:'SOURCE_READY',exactNextAction:'Build'}:r);
  }
  assert.ok(compare(a,b,{familyId:family},{recordId:'captain-source-identity-determination:TEST-DE'}).differing.length);
});
test('native planner preserves source binaries and doctrine while refreshing actual AZ metadata',()=>{
  const plan=planReceipt({familyId:receipt.familyId,directory,receiptPath:`${directory}/source-receipt.json`,beforeText});
  assert.equal(plan.outcome,'REFRESHABLE',plan.why);const {text}=composeRefreshedReceipt(plan);
  assert.equal(readsAsUnmoved(beforeText,text).ok,true);
  const before=structuredClone(receipt),after=JSON.parse(text);
  delete before.committedRecords;delete after.committedRecords;
  assert.deepEqual(after,before);
});

test('excluded acquisition requires an accepted, complete source identity',()=>{
  const valid={result:'PASS',sha256:'a'.repeat(64),byteLength:1,heldCorpusPath:'held/source.pdf'};
  assert.equal(acceptedAcquisitionIdentity(valid),true);
  for(const change of [{result:'FAIL'},{sha256:'bad'},{byteLength:1.5},{byteLength:0},{heldCorpusPath:''},{heldCorpusPath:null}])
    assert.equal(acceptedAcquisitionIdentity({...valid,...change}),false);
});
test('prior exclusion proof continuity is enforced before another comparison',()=>{
  const scope=adapter.scopeFrom({receipt,pin,currentDoc:current});
  const nextPin={...pin,identityRefresh:{anchorScope:structuredClone(scope)}};
  assert.doesNotThrow(()=>adapter.scopeFrom({receipt,pin:nextPin,currentDoc:current}));
  nextPin.identityRefresh.anchorScope.derivation.excludedAcquisitionEvidence[0].sha256='0'.repeat(64);
  assert.throws(()=>adapter.scopeFrom({receipt,pin:nextPin,currentDoc:current}),/prior excluded acquisition evidence changed/);
});
