import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADAPTERS, compareAnchors, recoverBytesByDigest, sha256} from './repin-lapsed-source-identities.mjs';
const recordPath='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json';
const adapter=ADAPTERS.get(recordPath);
const current=JSON.parse(fs.readFileSync(recordPath));
const pinned='9816a479e532017f630e8847e23e709a1b3efc2e554e211edb11cc2ebc0743c1';
const recovered=recoverBytesByDigest(recordPath,pinned);
assert.ok(recovered.bytes,recovered.why);assert.equal(sha256(recovered.bytes),pinned);
const historical=JSON.parse(recovered.bytes);
const routeKey=current.routes.find(r=>historical.routes.some(h=>h.routeKey===r.routeKey&&JSON.stringify(h)===JSON.stringify(r))).routeKey;
const receipt={familyId:'test-family',routeKeys:[routeKey]};
const compare=(a,b,r=receipt)=>compareAnchors({adapter,oldDoc:a,currentDoc:b,scope:adapter.scopeFrom({receipt:r,pin:{},currentDoc:b})});
test('an actual historical drift with this route unchanged compares identical',()=>{
  const result=compare(historical,current);
  assert.deepEqual(result.differing,[]);
  assert.deepEqual(result.anchorNames,['censusSharedMetadata',`route:${routeKey}`]);
  assert.notEqual(historical.metadata.sourceFingerprint===current.metadata.sourceFingerprint&&JSON.stringify(historical.counts)===JSON.stringify(current.counts),true);
});
test('a change to the family route or to shared metadata is a difference',()=>{
  for(const change of [
    d=>{d.routes.find(r=>r.routeKey===routeKey).destination='changed';},
    d=>{d.routes.find(r=>r.routeKey===routeKey).currentCommercialState='changed';},
    d=>{d.metadata.asOf='2099-01-01';},
    d=>{d.metadata.createsApproval=true;}
  ]){const next=structuredClone(current);change(next);assert.ok(compare(current,next).differing.length,'expected a difference');}
});
test('the input fingerprint, whole-universe counts and other routes moving are not a difference',()=>{
  const next=structuredClone(current);next.metadata.sourceFingerprint='sha256:'+'0'.repeat(64);next.counts.totalRuntimeRoutes+=1;
  next.routes.find(r=>r.routeKey!==routeKey).destination='changed';next.routes.push({...current.routes[0],routeKey:'obligation:test:new-route'});
  assert.deepEqual(compare(current,next).differing,[]);
});
test('no routeKeys, an absent route, a duplicate route, an unknown key or schema refuse',()=>{
  assert.throws(()=>compare(current,current,{familyId:'x'}),/names no routeKeys/);
  assert.throws(()=>compare(current,current,{familyId:'x',routeKeys:['obligation:none:XX:nothing']}),/does not carry/);
  const dup=structuredClone(current);dup.routes.push(dup.routes.find(r=>r.routeKey===routeKey));assert.throws(()=>compare(current,dup),/duplicate route/);
  const extra=structuredClone(current);extra.newSection={};assert.throws(()=>compare(current,extra),/not the shape/);
  const schema=structuredClone(current);schema.metadata.schemaVersion='v2';assert.throws(()=>compare(current,schema),/not the shape/);
  const gone=structuredClone(current);gone.routes=gone.routes.filter(r=>r.routeKey!==routeKey);
  assert.throws(()=>compareAnchors({adapter,oldDoc:current,currentDoc:gone,scope:adapter.scopeFrom({receipt,pin:{},currentDoc:current})}),/absent from the current census/);
});
