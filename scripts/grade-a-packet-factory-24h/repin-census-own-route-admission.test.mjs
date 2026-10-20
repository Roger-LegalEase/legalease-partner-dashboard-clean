import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ADAPTERS, compareAnchors, composeRefreshedReceipt, driftedPinsOf, planReceipt, recoverBytesByDigest, sha256} from './repin-lapsed-source-identities.mjs';
// The real case: rcap-nd-custom-pleading's census pin f6fc0814 against the census on disk, and VF06's read at bf02d8073.
const recordPath='data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json';
const adapter=ADAPTERS.get(recordPath);
const familyId='rcap-nd-custom-pleading';
const directory='data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading';
const receipt=JSON.parse(fs.readFileSync(`${directory}/source-receipt.json`));
// The census digest the receipt pinned before the re-pin (78f5c5083), so the plan is reproduced whatever the live pin says.
const PINNED='f6fc081419eadf6001fb0b7fa943eaf1175650127bac9cb149c4ff5b593c4a81';
const recovered=recoverBytesByDigest(recordPath,PINNED);
assert.ok(recovered.bytes,recovered.why);
const historical=JSON.parse(recovered.bytes);
const current=JSON.parse(fs.readFileSync(recordPath));
const routeKey='obligation:track-pathway:ND:nd-marijuana-first-offense-seal:first-offense-possession-sealing';
const vf06={evidencePath:'data/rcap-grade-a/packet-factory-24h/vf06/rows-vf06-20261020-reverify-bf02d8073.json',lane:'VF06',verifiedAtBase:'bf02d807328f4edfe1ff2541127563bb8b371086'};
const scope=adapter.scopeFrom({receipt,pin:{sha256:PINNED},currentDoc:current});
const admit=(cur=current,{rows=[vf06],differing=[`route:${routeKey}`]}={})=>adapter.measuredRowAdmission({receipt,oldDoc:historical,currentDoc:cur,scope,differing,measuredRows:rows});
const entry=(doc)=>doc.routes.find(r=>r.routeKey===routeKey);

test('the ND census pin is admitted 6/6 on VF06\'s row, the only measured row at the current digest',()=>{
  assert.deepEqual(scope.derivation.measuredReVerification,[vf06]);
  const verdict=admit(current,{rows:scope.derivation.measuredReVerification});
  assert.equal(verdict.ok,true,verdict.why);
  assert.deepEqual(verdict.admission.measuredReVerification,[vf06]);
  assert.deepEqual(verdict.admission.admittedAdditions[routeKey].added,entry(current).requiredSourceIds.filter(id=>!entry(historical).requiredSourceIds.includes(id)));
  assert.equal(verdict.admission.admittedAdditions[routeKey].added.length,4);
  assert.deepEqual(verdict.admission.withoutAdmission,{anchorsCompared:6,anchorsIdentical:5,differing:[`route:${routeKey}`],outcome:'REFUSED'});
  const narrowed={...scope,derivation:{...scope.derivation,measuredRowAdmission:verdict.admission}};
  const result=compareAnchors({adapter,oldDoc:historical,currentDoc:current,scope:narrowed});
  assert.equal(result.anchorsCompared,6);assert.equal(result.anchorsIdentical,6);
});
test('without the admission the route differs; with it every anchor is identical',()=>{
  assert.deepEqual(compareAnchors({adapter,oldDoc:historical,currentDoc:current,scope}).differing,[`route:${routeKey}`]);
  const verdict=admit();assert.equal(verdict.ok,true,verdict.why);
  const narrowed={...scope,derivation:{...scope.derivation,measuredRowAdmission:verdict.admission}};
  assert.deepEqual(compareAnchors({adapter,oldDoc:historical,currentDoc:current,scope:narrowed}).differing,[]);
});
test('each admission condition refuses on its own',()=>{
  const mutate=(change)=>{const d=structuredClone(current);change(entry(d));return d;};
  assert.match(admit(current,{rows:[]}).why,/no PASS_COMPLETE_INDEPENDENT row/);
  assert.match(admit(current,{differing:['censusSharedMetadata',`route:${routeKey}`]}).why,/other than this family's routes/);
  assert.match(admit(current,{rows:[{...vf06,verifiedAtBase:'a3ca119bd26536cdde7a1b325f7ac3e3594e75c8'}]}).why,/census bytes are the current ones/);
  assert.match(admit(mutate(e=>{e.requiredSourceIds=e.requiredSourceIds.filter(id=>!id.startsWith('source-url:https://ndlegis'));})).why,/removed requiredSourceIds/);
  assert.match(admit(mutate(e=>{e.destination='changed';})).why,/outside the admitted field list: destination/);
  assert.match(admit(mutate(e=>{e.requiredSourceIds=[...e.requiredSourceIds].reverse();})).why,/reordered/);
  assert.match(admit(mutate(e=>{e.requiredSourceIds=[...e.requiredSourceIds,'packet-spec-source:not-named-by-the-row'];})).why,/names the changed route and every added id.*not-named-by-the-row/);
  assert.match(admit(current,{rows:[{...vf06,evidencePath:'data/rcap-grade-a/packet-factory-24h/vf06/rows-vf06-20261019-reverify-census-5e7fe802c.json'}]}).why,/names the changed route/);
});
test('the census bytes on disk are the ones VF06 read, and the old pin is the one it named',()=>{
  assert.equal(receipt.committedRecords.find(r=>r.pathInRepository===recordPath).sha256,sha256(fs.readFileSync(recordPath)));
  assert.notEqual(PINNED,sha256(fs.readFileSync(recordPath)));
  const row=JSON.stringify(JSON.parse(fs.readFileSync(vf06.evidencePath)).rows.find(r=>r.itemId===familyId&&r.verifiedAtBase===vf06.verifiedAtBase));
  assert.ok(row.includes(sha256(fs.readFileSync(recordPath))));assert.ok(row.includes(PINNED.slice(0,8)));
});
test('the applied block records 6/6, the admission and the superseded block; the census pin no longer drifts',()=>{
  const block=receipt.committedRecords.find(r=>r.pathInRepository===recordPath).identityRefresh;
  assert.equal(block.anchorsCompared,6);assert.equal(block.anchorsIdentical,6);
  assert.deepEqual(block.was,{sha256:PINNED,byteLength:recovered.bytes.length});
  assert.deepEqual(block.measuredRowAdmission,admit().admission);
  assert.ok(block.previousIdentityRefresh&&block.previousIdentityRefresh.anchorsCompared===block.previousIdentityRefresh.anchorsIdentical);
  assert.deepEqual(driftedPinsOf(receipt).filter(d=>(d.pin?.pathInRepository??d.path)===recordPath),[]);
});
// The receipt as pushed at 3c4980d35, before the re-pin (git blob, so a later rebuild of the live receipt cannot move it).
const PRE_APPLY_BLOB='16ba7a9fcb08a2c1ea5d781b56c6a409229cdc8b';
const composeFromPreApply=()=>{
  const beforeText=execFileSync('git',['cat-file','blob',PRE_APPLY_BLOB],{encoding:'utf8'});
  const plan=planReceipt({familyId,directory,receiptPath:`${directory}/source-receipt.json`,beforeText,on:new Date('2026-10-20T05:55:55Z')});
  assert.equal(plan.outcome,'REFRESHABLE',plan.why);
  return composeRefreshedReceipt(plan).text;
};
test('the composed block says the own route moved by the admitted ids, 5/6 without the admission (Acceptance F1)',()=>{
  const block=JSON.parse(composeFromPreApply()).committedRecords.find(r=>r.pathInRepository===recordPath).identityRefresh;
  assert.ok(block.entriesThatMovedInThisRecord.includes(routeKey));
  assert.doesNotMatch(block.why,/anchors no entry that moved/);
  assert.ok(block.why.includes(`One of them is a route this receipt binds: ${routeKey} (4 ids added to requiredSourceIds, nothing removed or reordered)`),block.why);
  assert.ok(block.why.includes(`VF06 at ${vf06.verifiedAtBase} (${vf06.evidencePath})`),block.why);
  assert.match(block.why,/without the admission 5 of 6 were identical and the refresh was refused; with the admitted ids set aside, all 6 were identical\.$/);
  assert.doesNotMatch(block.whatThisDoesNotClaim,/does not bind/);
  assert.match(block.whatThisDoesNotClaim,/lapsed when ids were added to a route this family binds; it is restored only under measuredRowAdmission/);
});
test('the committed receipt is the planner\'s composition from the pre-apply receipt, byte for byte',()=>{
  assert.equal(composeFromPreApply(),fs.readFileSync(`${directory}/source-receipt.json`,'utf8'));
});
