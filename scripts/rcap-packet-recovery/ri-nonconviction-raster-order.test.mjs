import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {retainRiNonconvictionRasterOrder as retain} from './ri-nonconviction-raster-order.mjs';
const family = 'ri_nonconviction_sealing-set';
const receipt = JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/raster-runs/34602562081/ri_nonconviction_sealing-set.verdict.json'));
const documents = JSON.parse(fs.readFileSync('data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/pa-ri-ky-raster-manifest-20260911.json')).rows.find(r=>r.familyId===family).documents;
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
test('actual current RI bytes retain the original ordered digest without changing receipt',()=>{
 const before=JSON.stringify(receipt);
 for(const d of documents) assert.equal(hash(fs.readFileSync(d.path)),d.sha256);
 const result=retain(family,documents,receipt);
 assert.equal(hash(JSON.stringify(result.map(d=>[d.role,d.path,d.sha256]))),receipt.documentsDigest);
 assert.equal(JSON.stringify(receipt),before);
 assert.equal(new Set(result).size,documents.length);
});
for(const [name,mutate] of [
 ['hash',d=>{d[0].sha256='0'.repeat(64)}],
 ['path',d=>{d[0].path+='-different'}],
 ['role',d=>{d[0].role='different'}],
 ['missing',d=>{d.pop()}],
 ['additional',d=>{d.push({...d[0],path:d[0].path+'-additional'})}],
])test(`changed ${name} follows normal invalidation, not original-order reuse`,()=>{
 const changed=structuredClone(documents);mutate(changed);
 assert.equal(retain(family,changed,receipt),changed);
});
test('unrelated families retain their exact input order',()=>assert.equal(retain('pa_6308_underage-set',documents,receipt),documents));
test('missing or failed original receipt cannot supply order',()=>{
 assert.equal(retain(family,documents,null),documents);
 assert.equal(retain(family,documents,{...receipt,verdict:'RASTER_FAIL'}),documents);
});
test('a contradictory original digest is refused',()=>assert.throws(()=>retain(family,documents,{...receipt,documentsDigest:'0'.repeat(64)}),/Original RI ordered digest/));
test('duplicate current members are refused',()=>assert.throws(()=>retain(family,[documents[0],documents[0]],receipt),/Duplicate current/));
