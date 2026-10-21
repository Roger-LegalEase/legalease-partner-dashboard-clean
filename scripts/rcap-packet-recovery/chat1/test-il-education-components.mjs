#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {IL_TRACK,IL_DENY,IL_FEE_ORDER,IL_FEE_CONDITION,applyIlEducationComponents,assertIlEducationComponents,ilEducationComponentsFor} from './il-education-components.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const relative='data/record-clearing/legal-design-track-registry.json';
const originalBytes=fs.readFileSync(path.join(root,relative)),original=JSON.parse(originalBytes);
const get=r=>r.tracks.find(t=>t.trackId===IL_TRACK);
function beforeFixture(r){const x=structuredClone(r),t=get(x);t.packetSet.components=t.packetSet.components.filter(c=>![IL_DENY.officialFormId,IL_FEE_ORDER.officialFormId].includes(c.officialFormId));const app=t.packetSet.components.find(c=>c.officialFormId==='FW-CIV-APPLICATION');app.order=4;app.conditionDescription='Only where the participant cannot pay the county filing fee.';return x;}
const before=beforeFixture(original),beforeString=JSON.stringify(before),result=applyIlEducationComponents(before),fixed=result.registry;
let positives=0,negatives=0,cliChecks=0;const cases=[];
const pass=(name,fn)=>{fn();positives++;cases.push({name,result:'PASS'});};
const reject=(name,fn)=>{assert.throws(fn,{name:'AssertionError'},name);negatives++;cases.push({name,result:'REJECTED'});};
reject('Original four-component set is incomplete',()=>assertIlEducationComponents(get(before)));
pass('Both missing order components included',()=>assertIlEducationComponents(get(fixed)));
pass('No source object mutation',()=>assert.equal(JSON.stringify(before),beforeString));
pass('Idempotent correction',()=>{const r=applyIlEducationComponents(fixed);assert.equal(r.changed,false);assert.deepEqual(r.registry,fixed);});
pass('Four required forms without a fee request',()=>{const r=ilEducationComponentsFor(get(fixed),{requestFeeWaiver:false});assert.equal(r.components.length,4);assert.ok(r.components.some(c=>c.officialFormId===IL_DENY.officialFormId));assert.ok(!r.components.some(c=>c.officialFormId.startsWith('FW-CIV')));assert.equal(r.deliveryAuthorized,false);});
pass('Both fee forms only in requested-waiver branch',()=>{const r=ilEducationComponentsFor(get(fixed),{requestFeeWaiver:true});assert.equal(r.components.length,6);assert.equal(r.components.filter(c=>c.officialFormId.startsWith('FW-CIV')).length,2);assert.equal(r.waiverApproved,false);assert.equal(r.judicialExecutionPermitted,false);});
pass('Only component contract changed within Illinois track',()=>{const a=structuredClone(get(before)),b=structuredClone(get(fixed));delete a.packetSet.components;delete b.packetSet.components;assert.deepEqual(a,b);});
pass('All other registry tracks and top-level values preserved',()=>{for(const k of Object.keys(before))if(k!=='tracks')assert.deepEqual(before[k],fixed[k]);for(let i=0;i<before.tracks.length;i++)if(before.tracks[i].trackId!==IL_TRACK)assert.deepEqual(before.tracks[i],fixed.tracks[i]);});
pass('Existing component identifiers preserved',()=>{for(const c of get(before).packetSet.components)assert.ok(get(fixed).packetSet.components.some(n=>n.componentId===c.componentId&&n.officialFormId===c.officialFormId));});
for(const request of [undefined,null,'yes',0,1])reject(`Non-boolean fee decision ${String(request)}`,()=>ilEducationComponentsFor(get(fixed),{requestFeeWaiver:request}));
for(const [name,change] of [
 ['Denying Order omitted',t=>{t.packetSet.components=t.packetSet.components.filter(c=>c.officialFormId!==IL_DENY.officialFormId);}],
 ['Fee Order omitted',t=>{t.packetSet.components=t.packetSet.components.filter(c=>c.officialFormId!==IL_FEE_ORDER.officialFormId);}],
 ['Denying Order mislabeled conditional',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_DENY.officialFormId).requirement='conditional';}],
 ['Fee Order unconditionally required',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_FEE_ORDER.officialFormId).requirement='required';}],
 ['Fee application unconditionally required',t=>{t.packetSet.components.find(c=>c.officialFormId==='FW-CIV-APPLICATION').requirement='required';}],
 ['Different fee-order selection condition',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_FEE_ORDER.officialFormId).conditionDescription='Any sponsored participant';}],
 ['Denying Order judicial protection removed',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_DENY.officialFormId).notes='Prefill denial';}],
 ['Fee Order judicial protection removed',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_FEE_ORDER.officialFormId).notes='Grant waiver';}],
 ['Wrong official order source',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_FEE_ORDER.officialFormId).officialSourceUrl='https://example.invalid/other.pdf';}],
 ['Duplicate order component',t=>{t.packetSet.components.push(structuredClone(IL_DENY));}],
 ['Reordered duplicate ordinal',t=>{t.packetSet.components.find(c=>c.officialFormId===IL_FEE_ORDER.officialFormId).order=4;}]
]){const t=structuredClone(get(fixed));change(t);reject(name,()=>assertIlEducationComponents(t));}
for(const [name,change] of [
 ['Unknown existing component preserved by refusing overwrite',r=>{get(r).packetSet.components.push({officialFormId:'independently-added-form'});}],
 ['Different existing Denying Order contract requires reconciliation',r=>{get(r).packetSet.components.push({...IL_DENY,notes:'another worker\'s contract'});}],
 ['Independent waiver condition requires reconciliation',r=>{get(r).packetSet.components.find(c=>c.officialFormId==='FW-CIV-APPLICATION').conditionDescription='Other controlled rule';}]
]){const r=structuredClone(before);change(r);const beforeCopy=JSON.stringify(r);reject(name,()=>applyIlEducationComponents(r));assert.equal(JSON.stringify(r),beforeCopy);}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chat1-il-components-'));
try {
 const dir='scripts/rcap-packet-recovery/chat1';fs.mkdirSync(path.join(temp,dir),{recursive:true});
 for(const n of ['il-education-components.mjs','source-contract-corrections.mjs'])fs.copyFileSync(path.join(root,dir,n),path.join(temp,dir,n));
 const file=path.join(temp,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(before,null,2)+'\n');
 const run=(...args)=>spawnSync(process.execPath,[path.join(temp,dir,'il-education-components.mjs'),...args],{encoding:'utf8'});
 let prior=fs.readFileSync(file),r=run('--check');assert.equal(r.status,1,r.stderr);assert.ok(fs.readFileSync(file).equals(prior));cliChecks++;
 r=run('--apply');assert.equal(r.status,0,r.stderr);assertIlEducationComponents(get(JSON.parse(fs.readFileSync(file))));cliChecks++;
 prior=fs.readFileSync(file);r=run('--check');assert.equal(r.status,0,r.stderr);assert.ok(fs.readFileSync(file).equals(prior));cliChecks++;
 r=run('--apply');assert.equal(r.status,0,r.stderr);assert.ok(fs.readFileSync(file).equals(prior));cliChecks++;
 r=run('--apply','--check');assert.notEqual(r.status,0);assert.ok(fs.readFileSync(file).equals(prior));cliChecks++;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.ok(fs.readFileSync(path.join(root,relative)).equals(originalBytes));
console.log(JSON.stringify({positiveCases:positives,rejectedCases:negatives,actualCliChecks:cliChecks,targetTrack:IL_TRACK,sourceBytesAcquired:0,packetRebuilds:0,packetAcceptance:false,terminalPromotions:0,realInputUnchanged:true,results:cases},null,2));
