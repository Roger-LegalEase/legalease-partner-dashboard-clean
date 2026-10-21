import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordedAppearanceDisposition} from './verify-source-carried-values-are-dispositioned.mjs';
const read = p => JSON.parse(fs.readFileSync(p,'utf8'));
const familyId='nh_conviction_streamlined-set';
const dir='data/rcap-all50/overlays/census-v1/nh/nh-conviction-streamlined-set--official-pdf-fill';
const receipt=read(`${dir}/source-receipt.json`);
const registryFamilies=read('data/rcap-all50/shared/field-appearance-semantics.json').families;
const doc=read(`${dir}/field-census.census-v1.json`).documents.find(d=>d.documentId==='NHJB-2311');
const item={componentId:doc.documentId,sourceSha256:doc.sourceSha256,field:'sig.8',value:'Enter /s/ before name'};
const check = overrides => recordedAppearanceDisposition({familyId,item,receipt,registryFamilies,readReceipt:read,...overrides});
test('current exact-binary recorded placeholder disposition is recognized',()=>{
 const proof=check();assert.equal(proof.disposition,'render_participant_value_only_when_written');
 assert.equal(proof.sourceSha256,item.sourceSha256);
});
test('wrong source, family, missing receipt and ambiguous provenance refuse',()=>{
 assert.equal(check({receipt:null}),null);
 assert.equal(check({familyId:'another-family'}),null);
 assert.equal(check({item:{...item,sourceSha256:'0'.repeat(64)}}),null);
 for(const mutate of [r=>r.appearanceDispositionProvenance.push(r.appearanceDispositionProvenance[0]),r=>r.appearanceDispositionProvenance[0].sha256='0'.repeat(64),r=>r.documents.find(d=>d.formNumber==='NHJB-2311').byteLength++,r=>r.appearanceDispositionProvenance[0].digestProvedBy='../untrusted.json']) {
  const r=structuredClone(receipt);mutate(r);assert.equal(check({receipt:r}),null);
 }
});
test('changed sibling binding, unknown or changed classification and unavailable proof refuse',()=>{
 assert.equal(check({readReceipt:()=>{throw new Error('missing');}}),null);
 assert.equal(check({readReceipt:p=>{const x=read(p);x.documents.find(d=>d.formNumber==='NHJB-2311').sha256='0'.repeat(64);return x;}}),null);
 assert.equal(check({item:{...item,value:'different source text'}}),null);
 const registry=structuredClone(registryFamilies);
 const key=receipt.appearanceDispositionProvenance[0].registryEntry;
 registry[key].fields['sig.8'].disposition='invented';
 assert.equal(check({registryFamilies:registry}),null);
 const r=structuredClone(receipt);r.appearanceDispositionProvenance[0].fields['sig.8']='invented';
 assert.equal(check({receipt:r}),null);
});
