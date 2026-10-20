import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADAPTERS, compareAnchors, planFamily, recoverBytesByDigest, sha256} from './repin-lapsed-source-identities.mjs';
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
test('the census bytes on disk are the ones VF06 read, and the pin is the one it named',()=>{
  assert.equal(receipt.committedRecords.find(r=>r.pathInRepository===recordPath).sha256,PINNED);
  assert.notEqual(PINNED,sha256(fs.readFileSync(recordPath)));
  const row=JSON.stringify(JSON.parse(fs.readFileSync(vf06.evidencePath)).rows.find(r=>r.itemId===familyId&&r.verifiedAtBase===vf06.verifiedAtBase));
  assert.ok(row.includes(sha256(fs.readFileSync(recordPath))));assert.ok(row.includes(PINNED.slice(0,8)));
});
test('end to end: the live drifted pin plans REFRESHABLE with the admission recorded on the record',()=>{
  const plan=planFamily({familyId,directory});
  assert.equal(plan.outcome,'REFRESHABLE',plan.why);
  const record=plan.records.find(r=>r.path===recordPath);
  assert.equal(record.anchorsCompared,6);assert.equal(record.anchorsIdentical,6);
  assert.deepEqual(record.measuredRowAdmission,admit().admission);
});
