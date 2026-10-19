import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADAPTERS, compareAnchors, recoverBytesByDigest, sha256} from './repin-lapsed-source-identities.mjs';
const recordPath='data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json';
const adapter=ADAPTERS.get(recordPath);
const current=JSON.parse(fs.readFileSync(recordPath));
const mtReceipt=fs.readFileSync('data/rcap-all50/overlays/census-v1/mt/mt-misdemeanor-expungement-set--custom-pleading/source-receipt.json','utf8');
const pinned=mtReceipt.match(/"(55f129e4[0-9a-f]{56})"/)[1];
const recovered=recoverBytesByDigest(recordPath,pinned);
assert.ok(recovered.bytes,recovered.why);assert.equal(sha256(recovered.bytes),pinned);
const historical=JSON.parse(recovered.bytes);
const routeKey='obligation:track-only:NC:nc_auto_146_a4_agency_followup';
const receipt={familyId:'test',routeKeys:[routeKey]};
const compare=(a,b,r=receipt)=>compareAnchors({adapter,oldDoc:a,currentDoc:b,scope:adapter.scopeFrom({receipt:r,pin:{},currentDoc:b})});
const entryOf=(d,k)=>d.packetFamilies.find(e=>e.routeKeys.includes(k));
test('an actual historical drift compares by the entry carrying each receipt route',()=>{
  const result=compare(historical,current);
  assert.deepEqual(result.anchorNames,['entryFor:'+routeKey,'worklistSharedFields']);
  assert.equal(result.differing.length===0, JSON.stringify(entryOf(historical,routeKey))===JSON.stringify(entryOf(current,routeKey)));
});
test('the entry or shared schema fields changing is a difference; fingerprint, counts and other entries are not',()=>{
  for(const change of [d=>{entryOf(d,routeKey).workTypes=['changed'];},d=>{d.allowedWorkTypes=[...d.allowedWorkTypes,'NEW'];},d=>{d.deliverableFields=[];},d=>{d.metadata.asOf='2099-01-01';}]){
    const next=structuredClone(current);change(next);assert.ok(compare(current,next).differing.length,'expected a difference');}
  const next=structuredClone(current);next.metadata.sourceFingerprint='sha256:'+'0'.repeat(64);next.counts={};
  next.packetFamilies.find(e=>!e.routeKeys.includes(routeKey)).workTypes=['changed'];
  assert.deepEqual(compare(current,next).differing,[]);
});
test('a route moving to another entry, an absent route, no routeKeys, a route in two entries and a bad shape refuse or differ',()=>{
  const moved=structuredClone(current);const from=entryOf(moved,routeKey);const to=moved.packetFamilies.find(e=>e!==from);
  from.routeKeys=from.routeKeys.filter(k=>k!==routeKey);to.routeKeys=[...to.routeKeys,routeKey];
  assert.ok(compare(current,moved).differing.length);
  assert.throws(()=>compare(current,current,{familyId:'x'}),/names no routeKeys/);
  assert.throws(()=>compare(current,current,{familyId:'x',routeKeys:['obligation:track-only:FL:fl-sealing']}),/does not carry/);
  const dup=structuredClone(current);dup.packetFamilies.push(structuredClone(entryOf(current,routeKey)));assert.throws(()=>compare(current,dup),/more than one entry/);
  const shape=structuredClone(current);shape.extra=1;assert.throws(()=>compare(current,shape),/not the shape/);
});
