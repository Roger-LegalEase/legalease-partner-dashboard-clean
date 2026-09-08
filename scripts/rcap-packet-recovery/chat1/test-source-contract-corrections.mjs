#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TRACKS,MI_TASKS,MO_OLD_ITEM,MO_NEW_ITEM,applySourceContractCorrections,assertSourceContractCorrections,replaceTargetTrackBytes} from './source-contract-corrections.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const rel='data/record-clearing/legal-design-track-registry.json';
const originalBytes=fs.readFileSync(path.join(root,rel));
const original=JSON.parse(originalBytes);
const track=(r,id)=>r.tracks.find(t=>t.trackId===id);
// Recover an explicit old-shape fixture from a corrected registry as well, so
// the same tests remain executable after the patch has already been installed.
function beforeFixture(registry) {
 const out=structuredClone(registry),mo=track(out,TRACKS[0]);
 const item=mo.manualCompletionItems.find(m=>m.whereInPacket==='CR375 page 1, year of birth field');item.item=MO_OLD_ITEM;
 const old=`${MO_OLD_ITEM} — CR375 page 1, year of birth field.`,fixed=`${MO_NEW_ITEM} — CR375 page 1, year of birth field.`;
 const a=mo.packetSet.participantActionRequired.find(a=>[old,fixed].includes(a.description));a.description=old;
 mo.packetSet.requiredBeforeFiling=mo.packetSet.requiredBeforeFiling.map(x=>x===fixed?old:x);
 for(const id of TRACKS.slice(1))for(const spec of MI_TASKS){
  const t=track(out,id),a=t.packetSet.participantActionRequired.find(a=>[spec.before,spec.after].includes(a.description));
  a.description=spec.before;a.requiredBeforeFiling=true;
  t.packetSet.requiredBeforeFiling=t.packetSet.requiredBeforeFiling.filter(s=>s!==spec.after);
  if(!t.packetSet.requiredBeforeFiling.includes(spec.before))t.packetSet.requiredBeforeFiling.push(spec.before);
 }
 return out;
}
const before=beforeFixture(original),beforeString=JSON.stringify(before),out=applySourceContractCorrections(before),fixed=out.registry;
let positive=0,negative=0,cliChecks=0;const cases=[];
const pass=(name,fn)=>{fn();positive++;cases.push({name,result:'PASS'});};
const reject=(name,fn)=>{assert.throws(fn,{name:'AssertionError'},name);negative++;cases.push({name,result:'REJECTED'});};
pass('Corrected three-track semantics',()=>assertSourceContractCorrections(fixed));
pass('Input object untouched',()=>assert.equal(JSON.stringify(before),beforeString));
pass('Second application is a no-op',()=>{const twice=applySourceContractCorrections(fixed);assert.deepEqual(twice.registry,fixed);assert.deepEqual(twice.changes,[]);});
pass('Only three exact tracks changed',()=>{const changed=before.tracks.filter((t,i)=>JSON.stringify(t)!==JSON.stringify(fixed.tracks[i])).map(t=>t.trackId);assert.deepEqual(changed.sort(),[...TRACKS].sort());});
pass('All top-level metadata preserved',()=>{for(const k of Object.keys(before))if(k!=='tracks')assert.deepEqual(fixed[k],before[k]);});
pass('All components and source/approval fields preserved',()=>{for(const id of TRACKS){const a=track(before,id),b=track(fixed,id);assert.deepEqual(a.packetSet.components,b.packetSet.components);for(const k of Object.keys(a))if(!['manualCompletionItems','packetSet'].includes(k))assert.deepEqual(a[k],b[k],`${id}/${k}`);}});
pass('No confidential FI-05 birth rule changed',()=>{const m=track(fixed,TRACKS[0]).manualCompletionItems.find(m=>m.item===MO_NEW_ITEM);assert.match(m.why,/full date belongs on the confidential FI-05/);});
pass('Future service/hearing tasks retained but not prefiling',()=>{for(const id of TRACKS.slice(1))for(const spec of MI_TASKS){const t=track(fixed,id),a=t.packetSet.participantActionRequired.find(a=>a.description===spec.after);assert.equal(a.requirement,'required');assert.equal(a.requiredBeforeFiling,false);}});
pass('Known unrelated concurrent edit survives',()=>{const concurrent=structuredClone(before),unrelated=concurrent.tracks.find(t=>!TRACKS.includes(t.trackId));unrelated.chat1TestSentinel='PRESERVE';const r=applySourceContractCorrections(concurrent);assert.equal(track(r.registry,unrelated.trackId).chat1TestSentinel,'PRESERVE');});
pass('Corrected byte replacement has exact semantics',()=>{const text=JSON.stringify(before,null,2)+'\n';assert.deepEqual(JSON.parse(replaceTargetTrackBytes(text,fixed)),fixed);});
for(const [name,mutate] of [
 ['Missing target track',r=>{r.tracks=r.tracks.filter(t=>t.trackId!==TRACKS[0]);}],
 ['Duplicate target track',r=>{r.tracks.push(structuredClone(track(r,TRACKS[0])));}],
 ['Independently changed MO field label',r=>{track(r,TRACKS[0]).manualCompletionItems.find(m=>m.whereInPacket==='CR375 page 1, year of birth field').item='other mapping';}],
 ['MO source rationale differs',r=>{track(r,TRACKS[0]).manualCompletionItems.find(m=>m.whereInPacket==='CR375 page 1, year of birth field').why='Source changed';}],
 ['Missing MO action',r=>{const t=track(r,TRACKS[0]);t.packetSet.participantActionRequired=t.packetSet.participantActionRequired.filter(a=>!a.description.startsWith(MO_OLD_ITEM));}],
 ['Duplicate MO prefiling projection',r=>{const t=track(r,TRACKS[0]);t.packetSet.requiredBeforeFiling.push(t.packetSet.requiredBeforeFiling.find(s=>s.startsWith(MO_OLD_ITEM)));}],
 ['Unknown Michigan manual instruction',r=>{track(r,TRACKS[1]).manualCompletionItems.find(m=>m.item==='Proof of Service').why='Different workflow';}],
 ['Wrong Michigan component page',r=>{track(r,TRACKS[2]).manualCompletionItems.find(m=>m.item==='Notice of Hearing').whereInPacket='Another form';}],
 ['Duplicate Michigan action',r=>{const t=track(r,TRACKS[1]);t.packetSet.participantActionRequired.push(structuredClone(t.packetSet.participantActionRequired.find(a=>a.description===MI_TASKS[0].before)));}],
 ['String instead of prefiling boolean',r=>{track(r,TRACKS[2]).packetSet.participantActionRequired.find(a=>a.description===MI_TASKS[1].before).requiredBeforeFiling='false';}],
 ['Removed service component',r=>{const t=track(r,TRACKS[1]);t.packetSet.components=t.packetSet.components.filter(c=>c.role!=='certificate_of_service');}],
 ['Relaxed oath requirement',r=>{track(r,TRACKS[2]).packetSet.participantActionRequired.find(a=>a.kind==='complete_field'&&a.description.startsWith('Verification, subscribed')).requiredBeforeFiling=false;}]
]){const r=structuredClone(before);mutate(r);const b=JSON.stringify(r);reject(name,()=>applySourceContractCorrections(r));assert.equal(JSON.stringify(r),b);}
for(const [name,mutate] of [
 ['Full DOB restored in manual item',r=>{track(r,TRACKS[0]).manualCompletionItems.find(m=>m.item===MO_NEW_ITEM).item=MO_OLD_ITEM;}],
 ['Full DOB restored in action',r=>{track(r,TRACKS[0]).packetSet.participantActionRequired.find(a=>a.description.startsWith(MO_NEW_ITEM)).description=`${MO_OLD_ITEM} — CR375 page 1, year of birth field.`;}],
 ['Full DOB restored in prefiling list',r=>{const t=track(r,TRACKS[0]);t.packetSet.requiredBeforeFiling=t.packetSet.requiredBeforeFiling.map(s=>s.startsWith(MO_NEW_ITEM)?s.replace(MO_NEW_ITEM,MO_OLD_ITEM):s);}],
 ['Service again gates initial filing',r=>{track(r,TRACKS[1]).packetSet.participantActionRequired.find(a=>a.description===MI_TASKS[0].after).requiredBeforeFiling=true;}],
 ['Hearing again gates initial filing',r=>{track(r,TRACKS[2]).packetSet.participantActionRequired.find(a=>a.description===MI_TASKS[1].after).requiredBeforeFiling=true;}],
 ['Old service task reappears in flat prefiling list',r=>{track(r,TRACKS[2]).packetSet.requiredBeforeFiling.push(MI_TASKS[0].before);}],
 ['Later task deleted instead of deferred',r=>{const t=track(r,TRACKS[1]);t.packetSet.participantActionRequired=t.packetSet.participantActionRequired.filter(a=>a.description!==MI_TASKS[1].after);}],
 ['Embedded service component made optional',r=>{track(r,TRACKS[2]).packetSet.components.find(c=>c.role==='certificate_of_service').requirement='conditional';}]
]){const r=structuredClone(fixed);mutate(r);reject(name,()=>assertSourceContractCorrections(r));}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'chat1-contract-cli-'));
try {
 const script='scripts/rcap-packet-recovery/chat1/source-contract-corrections.mjs',to=path.join(temp,script),file=path.join(temp,rel);
 fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,script),to);
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(before,null,2)+'\n');
 const run=(...args)=>spawnSync(process.execPath,[to,...args],{encoding:'utf8'});
 const initial=fs.readFileSync(file);let x=run('--check');assert.equal(x.status,1,x.stderr);assert.ok(fs.readFileSync(file).equals(initial));cliChecks++;
 x=run('--apply');assert.equal(x.status,0,x.stderr);assertSourceContractCorrections(JSON.parse(fs.readFileSync(file)));cliChecks++;
 const applied=fs.readFileSync(file);x=run('--check');assert.equal(x.status,0,x.stderr);assert.ok(fs.readFileSync(file).equals(applied));cliChecks++;
 x=run('--apply');assert.equal(x.status,0,x.stderr);assert.ok(fs.readFileSync(file).equals(applied));cliChecks++;
 x=run('--unknown');assert.notEqual(x.status,0);assert.ok(fs.readFileSync(file).equals(applied));cliChecks++;
 const conflict=structuredClone(before);track(conflict,TRACKS[2]).manualCompletionItems.find(m=>m.item==='Notice of Hearing').whereInPacket='Unknown current source';fs.writeFileSync(file,JSON.stringify(conflict,null,2)+'\n');const corrupt=fs.readFileSync(file);
 x=run('--apply');assert.notEqual(x.status,0);assert.ok(fs.readFileSync(file).equals(corrupt));cliChecks++;
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.ok(fs.readFileSync(path.join(root,rel)).equals(originalBytes),'Test must not change real registry');
console.log(JSON.stringify({positiveCases:positive,rejectedCases:negative,actualCliChecks:cliChecks,tracksExamined:before.tracks.length,targetTracks:TRACKS,allOtherTracksPreserved:true,packetComponentsPreserved:true,releaseAndApprovalFieldsPreserved:true,realInputSha256:crypto.createHash('sha256').update(originalBytes).digest('hex'),realInputUnchanged:true,packetRebuilds:0,independentReviews:0,terminalPromotions:0,results:cases},null,2));
