import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADAPTERS, compareAnchors, recoverBytesByDigest, sha256} from './repin-lapsed-source-identities.mjs';
const recordPath='data/record-clearing/legal-design-intake/MS.memo.json';
const adapter=ADAPTERS.get(recordPath);
const current=JSON.parse(fs.readFileSync(recordPath));
const pinned='6982ae0c'+(fs.readFileSync('data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/source-receipt.json','utf8').match(/"6982ae0c([0-9a-f]{56})"/)[1]);
const recovered=recoverBytesByDigest(recordPath,pinned);
assert.ok(recovered.bytes,recovered.why);assert.equal(sha256(recovered.bytes),pinned);
const historical=JSON.parse(recovered.bytes);
const receipt=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/ms/ms-misd-1st-set--custom-pleading/source-receipt.json'));
const compare=(a,b,r=receipt,pin={})=>compareAnchors({adapter,oldDoc:a,currentDoc:b,scope:adapter.scopeFrom({receipt:r,pin,currentDoc:b})});
test('the actual MS drift 6982ae0c -> current leaves ms-misd-1st and the memo metadata identical',()=>{
  const result=compare(historical,current);
  assert.deepEqual(result.differing,[]);
  assert.deepEqual(result.anchorNames,['memoMetadata','track:ms-misd-1st']);
  const moved=current.tracks.filter(t=>JSON.stringify(t)!==JSON.stringify(historical.tracks.find(h=>h.trackId===t.trackId))).map(t=>t.trackId);
  assert.deepEqual(moved,['ms-nonconv']);
});
test('the family track, memo metadata or a review block changing is a difference; another track is not',()=>{
  for(const change of [d=>{d.tracks.find(t=>t.trackId==='ms-misd-1st').exclusions=['changed'];},d=>{d.memoVersion='changed';},d=>{d._newReview={changed:true};}]){
    const next=structuredClone(current);change(next);assert.ok(compare(current,next).differing.length,'expected a difference');}
  const other=structuredClone(current);other.tracks.find(t=>t.trackId==='ms-nonconv').exclusions=['changed'];
  assert.deepEqual(compare(current,other).differing,[]);
});
test('recordId names its track; malformed or absent ids, no track in scope, duplicates and bad shape refuse',()=>{
  assert.deepEqual(adapter.scopeFrom({receipt:{routeKeys:[]},pin:{recordId:'legal-design-intake:MS#ms-misd-1st'},currentDoc:current}).anchorIds,['ms-misd-1st']);
  assert.throws(()=>adapter.scopeFrom({receipt:{routeKeys:[]},pin:{recordId:'legal-design-intake:MS#no-such'},currentDoc:current}),/does not carry/);
  assert.throws(()=>adapter.scopeFrom({receipt:{routeKeys:[]},pin:{recordId:'memo:ms-misd-1st'},currentDoc:current}),/is not legal-design-intake/);
  assert.throws(()=>adapter.scopeFrom({receipt:{routeKeys:[]},pin:{recordId:'legal-design-intake:VT#ms-misd-1st'},currentDoc:current}),/names jurisdiction VT, but this memo is MS/);
  assert.throws(()=>adapter.scopeFrom({receipt:{routeKeys:['obligation:research-decision-route:MS:not-a-track']},pin:{},currentDoc:current}),/name no track/);
  assert.throws(()=>adapter.scopeFrom({receipt:{routeKeys:['obligation:track-only:VT:ms-misd-1st']},pin:{},currentDoc:current}),/name no track/);
  const dup=structuredClone(current);dup.tracks.push(dup.tracks[0]);assert.throws(()=>compare(current,dup),/duplicate track/);
  const shape=structuredClone(current);shape.schemaVersion=2;assert.throws(()=>compare(current,shape),/not the shape/);
});
test('the scope names the measured re-verification rows that record the current memo digest',()=>{
  const scope=adapter.scopeFrom({receipt,pin:{},currentDoc:current});
  assert.ok(Array.isArray(scope.derivation.measuredReVerification));
  assert.ok(scope.derivation.measuredReVerification.some(m=>m.lane==='VF06'&&m.evidencePath.includes('20261019-reverify')),'expected the VF06 re-verification row');
});
