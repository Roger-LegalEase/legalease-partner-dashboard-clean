/**
 * Consume CHAT10-CONTRACT-MO-01 and CHAT10-CONTRACT-MI-01 narrowly.
 * No packet/source byte, eligibility, component set or release status changes.
 * The current source review is in PR233, e62388c165e581fa3ef48436bc2baf1e48c364f6.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TRACKS = Object.freeze([
  'mo-art-xiv-marijuana', 'mi_setaside_application', 'mi_setaside_first_owi'
]);
export const MO_OLD_ITEM = 'The full date of birth on CR375';
export const MO_NEW_ITEM = 'The year of birth only on CR375';
const MO_WHERE = 'CR375 page 1, year of birth field';
const itemDescription = item => `${item} — ${MO_WHERE}.`;
export const MI_TASKS = Object.freeze([
  Object.freeze({
    item:'Proof of Service',
    before:'Proof of Service — MC 227 page 3.',
    after:'After actual mailing, complete and sign the Proof of Service on MC 227 page 3 using the actual service facts. File or mail the completed proof to the court and keep the remaining copy. Do not certify service before it occurs.'
  }),
  Object.freeze({
    item:'Notice of Hearing',
    before:'Notice of Hearing — MC 227 page 3.',
    after:'Use only hearing information supplied by the court for the Notice of Hearing on MC 227 page 3. Depending on local practice, the clerk may complete it at filing. Leave unassigned hearing information blank; do not invent a date, time, location or judge.'
  })
]);
const one = (rows,predicate,label) => {
  assert.ok(Array.isArray(rows), `${label}: expected an array`);
  const matches=rows.filter(predicate);
  assert.equal(matches.length,1,`${label}: missing or duplicate target; reconcile current work`);
  return matches[0];
};
const getTrack=(registry,id)=>one(registry.tracks,t=>t.trackId===id,id);
const count=(rows,value)=>rows.filter(v=>v===value).length;

/** Validate fixed semantics independently from the mutation routine. */
export function assertSourceContractCorrections(registry) {
  const mo=getTrack(registry,TRACKS[0]);
  const manual=one(mo.manualCompletionItems,m=>m.whereInPacket===MO_WHERE,'CR375 birth field');
  assert.equal(manual.item,MO_NEW_ITEM);
  assert.match(manual.why,/year of birth only/);
  assert.match(manual.why,/full date belongs on the confidential FI-05/);
  const action=one(mo.packetSet.participantActionRequired,a=>a.description===itemDescription(MO_NEW_ITEM),'CR375 year action');
  assert.equal(action.kind,'complete_field');
  assert.equal(action.requirement,'required');
  assert.equal(action.requiredBeforeFiling,true);
  assert.equal(count(mo.packetSet.requiredBeforeFiling,itemDescription(MO_NEW_ITEM)),1);
  assert.ok(!JSON.stringify([mo.manualCompletionItems,mo.packetSet.participantActionRequired,mo.packetSet.requiredBeforeFiling]).includes(MO_OLD_ITEM),'Full DOB must not leak into CR375 task projections');
  for(const id of TRACKS.slice(1)) {
    const track=getTrack(registry,id);
    for(const task of MI_TASKS) {
      const m=one(track.manualCompletionItems,m=>m.item===task.item,`${id} manual ${task.item}`);
      assert.equal(m.whereInPacket,'MC 227 page 3');
      const action=one(track.packetSet.participantActionRequired,a=>a.description===task.after,`${id} action ${task.item}`);
      assert.equal(action.kind,'complete_field');
      assert.equal(action.requirement,'required','The eventual act is not erased');
      assert.equal(action.requiredBeforeFiling,false,'Later execution cannot gate initial filing');
      assert.equal(count(track.packetSet.requiredBeforeFiling,task.before),0);
      assert.equal(count(track.packetSet.requiredBeforeFiling,task.after),0);
    }
    // Keep the embedded service component, authentic execution and source scope.
    const service=one(track.packetSet.components,c=>c.role==='certificate_of_service',`${id} service component`);
    assert.equal(service.requirement,'required');
    assert.equal(service.officialFormId,'MC 227 page 3 Proof of Service');
    const oath=one(track.packetSet.participantActionRequired,a=>a.kind==='complete_field'&&a.description.startsWith('Verification, subscribed and sworn'),`${id} oath`);
    assert.equal(oath.requiredBeforeFiling,true);
    assert.equal(oath.requirement,'required');
  }
  return true;
}

/** Return a corrected copy. Unknown overlapping edits fail before any write. */
export function applySourceContractCorrections(registry) {
  assert.ok(registry&&typeof registry==='object'&&!Array.isArray(registry));
  const out=structuredClone(registry),changes=[];
  const mo=getTrack(out,TRACKS[0]);
  const birth=one(mo.manualCompletionItems,m=>m.whereInPacket===MO_WHERE,'CR375 birth field');
  assert.ok([MO_OLD_ITEM,MO_NEW_ITEM].includes(birth.item),'CR375 birth item was independently changed');
  assert.match(birth.why,/year of birth only/);
  assert.match(birth.why,/full date belongs on the confidential FI-05/);
  const action=one(mo.packetSet.participantActionRequired,a=>[itemDescription(MO_OLD_ITEM),itemDescription(MO_NEW_ITEM)].includes(a.description),'CR375 birth action');
  assert.equal(action.kind,'complete_field');assert.equal(action.requirement,'required');assert.equal(action.requiredBeforeFiling,true);
  const oldCount=count(mo.packetSet.requiredBeforeFiling,itemDescription(MO_OLD_ITEM));
  const newCount=count(mo.packetSet.requiredBeforeFiling,itemDescription(MO_NEW_ITEM));
  assert.equal(oldCount+newCount,1,'Missing/duplicate CR375 prefiling projection');
  if(birth.item!==MO_NEW_ITEM||action.description!==itemDescription(MO_NEW_ITEM)||oldCount)changes.push({trackId:TRACKS[0],finding:'CHAT10-CONTRACT-MO-01'});
  birth.item=MO_NEW_ITEM;action.description=itemDescription(MO_NEW_ITEM);
  mo.packetSet.requiredBeforeFiling=mo.packetSet.requiredBeforeFiling.map(s=>s===itemDescription(MO_OLD_ITEM)?itemDescription(MO_NEW_ITEM):s);
  for(const id of TRACKS.slice(1)) {
    const t=getTrack(out,id);
    for(const task of MI_TASKS) {
      const manual=one(t.manualCompletionItems,m=>m.item===task.item,`${id} manual ${task.item}`);
      assert.equal(manual.whereInPacket,'MC 227 page 3');
      assert.match(manual.why,task.item==='Proof of Service'?/after mailing/:/clerk.*hearing date.*filing/);
      const a=one(t.packetSet.participantActionRequired,a=>[task.before,task.after].includes(a.description),`${id} action ${task.item}`);
      assert.equal(a.kind,'complete_field');assert.equal(a.requirement,'required');
      assert.equal(typeof a.requiredBeforeFiling,'boolean');
      assert.ok(count(t.packetSet.requiredBeforeFiling,task.before)<=1,'Duplicate old prefiling task');
      assert.ok(count(t.packetSet.requiredBeforeFiling,task.after)<=1,'Duplicate new prefiling task');
      if(a.description!==task.after||a.requiredBeforeFiling||t.packetSet.requiredBeforeFiling.some(s=>s===task.before||s===task.after))
        changes.push({trackId:id,finding:'CHAT10-CONTRACT-MI-01',task:task.item});
      a.description=task.after;a.requiredBeforeFiling=false;
      t.packetSet.requiredBeforeFiling=t.packetSet.requiredBeforeFiling.filter(s=>s!==task.before&&s!==task.after);
    }
  }
  assertSourceContractCorrections(out);
  return {registry:out,changes};
}

/** Preserve every byte outside the three exact track objects. */
export function replaceTargetTrackBytes(beforeText, corrected, targetIds=TRACKS) {
  const original=JSON.parse(beforeText);
  let result=beforeText;
  const block=t=>JSON.stringify(t,null,2).split('\n').map(line=>'    '+line).join('\n');
  for(const id of targetIds) {
    const before=block(getTrack(original,id)),after=block(getTrack(corrected,id));
    if(before===after)continue;
    assert.equal(result.split(before).length-1,1,`${id}: source formatting/content differs; reconcile instead of rewriting the whole registry`);
    result=result.replace(before,after);
  }
  assert.deepEqual(JSON.parse(result),corrected,'Unexpected content outside target track replacement');
  return result;
}

function main(args) {
  const apply=args.includes('--apply');
  if(args.some(a=>a!=='--apply'&&a!=='--check')||(apply&&args.includes('--check')))
    throw new Error('Usage: node source-contract-corrections.mjs [--check | --apply]');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
  const file=path.join(root,'data/record-clearing/legal-design-track-registry.json');
  const before=fs.readFileSync(file,'utf8');
  const result=applySourceContractCorrections(JSON.parse(before));
  if(apply&&result.changes.length) {
    // All targets validated before the one write; a failure never partially edits.
    const next=replaceTargetTrackBytes(before,result.registry);
    const temporary=file+'.chat1-'+process.pid+'.tmp';
    try { fs.writeFileSync(temporary,next,{flag:'wx',mode:fs.statSync(file).mode});fs.renameSync(temporary,file); }
    finally { if(fs.existsSync(temporary))fs.unlinkSync(temporary); }
  }
  console.log(JSON.stringify({mode:apply?'apply':'check',changedTaskGroups:result.changes,
    registryWritten:apply&&result.changes.length>0,packetBytesChanged:false,terminalPromotions:0},null,2));
  if(!apply&&result.changes.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2));
