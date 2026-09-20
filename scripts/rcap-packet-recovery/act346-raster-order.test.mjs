import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { retainAct346RasterOrder as retain } from './ri-nonconviction-raster-order.mjs';
const base = 'data/rcap-grade-a/packet-factory-24h/';
const read = p => JSON.parse(fs.readFileSync(base + p));
const family = 'ar-act346-set';
const receipt = read('raster-runs/34732930032/ar-act346-set.verdict.json');
const manifest = read('fix112/ar-act346-current-raster-manifest-20260912.json').rows.find(r => r.familyId === family);
const custody = read('raster-runs/34732930032/ORIGINAL_EVIDENCE_VERIFIED.json');
const docs = read('RASTER_QUEUE.json').rows.find(r => r.familyId === family).documents;
const digest = ds => crypto.createHash('sha256').update(JSON.stringify(ds.map(d => [d.role,d.path,d.sha256]))).digest('hex');
const current = [1,0,3,2].map(i => ({...manifest.documents[i], pageCountEvidence:{method:'current measurement',pageCount:manifest.documents[i].pageCount}}));
const run = (d=current,r=receipt,m=manifest,c=custody,f=family) => retain(f,d,r,m,c);
test('exact Act346 permutation recovers original digest and returns current objects without mutation',()=>{
 const before=JSON.stringify([current,receipt,manifest,custody]);
 assert.equal(digest(current),'bc02aba95c4383ee07973c15b91b08342d7468c773c8cfd93d80954d99cb44f8');
 const result=run();assert.equal(digest(result),'e206ca4b449e53b752ec4d7aaeff712efa45ff06f3b8776708f27f13e3be7a8a');
 result.forEach(d=>assert.equal(d,current.find(c=>c.path===d.path)));
 assert.equal(JSON.stringify([current,receipt,manifest,custody]),before);
 for(const d of docs)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(d.path)).digest('hex'),d.sha256);
});
test('already-correct order and unrelated families preserve their objects',()=>{
 const ordered=run();assert.deepEqual(run(ordered),ordered);
 assert.equal(run(current,receipt,manifest,custody,'unrelated'),current);
});
for(const [name,mutate] of [
 ['hash',d=>d[0].sha256='0'.repeat(64)],['path',d=>d[0].path+='x'],['role',d=>d[0].role='other'],
 ['missing',d=>d.pop()],['added',d=>d.push({...d[0],path:'extra'})]
])test(`changed ${name} cannot retain original enumeration`,()=>{
 const changed=structuredClone(current);mutate(changed);assert.equal(run(changed),changed);assert.notEqual(digest(changed),receipt.documentsDigest);
});
test('duplicate current or original members are refused',()=>{
 const d=structuredClone(current);d[1]=d[0];assert.throws(()=>run(d),/Duplicate current/);
 const r=structuredClone(receipt),m=structuredClone(manifest);r.documentsRendered[1]=r.documentsRendered[0];m.documents[1]=m.documents[0];
 r.documentsDigest=m.documentsDigest=digest(m.documents);assert.throws(()=>run(current,r,m),/Duplicate original/);
});
for(const [name,patch] of [['family',{familyId:'other'}],['run',{workflowRunId:'1'}],['non-PASS',{verdict:'RASTER_FAIL'}]])
 test(`wrong ${name} cannot authorize retention`,()=>assert.equal(run(current,{...receipt,...patch}),current));
test('corrupt digest and manifest disagreement are refused',()=>{
 assert.throws(()=>run(current,{...receipt,documentsDigest:'0'.repeat(64)}));
 const r={...receipt,documentsDigest:'0'.repeat(64)},m={...manifest,documentsDigest:r.documentsDigest};assert.throws(()=>run(current,r,m),/ordered digest/);
 const m2=structuredClone(manifest);m2.documents[0].sha256='0'.repeat(64);assert.throws(()=>run(current,receipt,m2));
});
test('unclean or unbound evidence is refused',()=>{
 for(const key of ['problems','environmentProblems'])assert.throws(()=>run(current,{...receipt,[key]:['failure']}));
 for(const mutate of [c=>c.runId=1,c=>c.conclusion='failure',c=>c.families[0].originalPngBytesVerified=false,c=>c.families[0].archiveSha256='wrong',c=>c.families[0].packetCommit='wrong']){
  const c=structuredClone(custody);mutate(c);assert.throws(()=>run(current,receipt,manifest,c));
 }
});

test('modified packet evidence cannot authorize retention',()=>{
 for(const value of [1, undefined, null])assert.throws(()=>run(current,{...receipt,packetPdfsModified:value}));
});
test('primary path and hash bindings must agree with manifest and rendered identities',()=>{
 for(const role of ['canonical','boundary'])for(const key of ['path','pinned']){
  const r=structuredClone(receipt);r.hashesBound[role][key]='wrong';assert.throws(()=>run(current,r));
 }
 const r=structuredClone(receipt);delete r.hashesBound;assert.throws(()=>run(current,r));
});

test('exact original dispatch and full-run custody cannot drift',()=>{
 for(const key of ['family_batch','raster_manifest_path','requested_scale','commit_sha']){
  const c=structuredClone(custody);c.inputs[key]='different';assert.throws(()=>run(current,receipt,manifest,c));
 }
 for(const [key,value] of [['selectedFamiliesConclusion','failure'],['partialRunAdmission',true],['excludedJobFailures',['failed']],['selectedFamilies',[family,'extra']]]){
  const c=structuredClone(custody);c[key]=value;assert.throws(()=>run(current,receipt,manifest,c));
 }
});
