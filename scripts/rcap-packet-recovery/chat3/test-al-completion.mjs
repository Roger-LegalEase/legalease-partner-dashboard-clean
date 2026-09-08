#!/usr/bin/env node
/** Actual two-host renderer and manual completion-policy regressions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PRIOR_CHOICE_FIELDS, PRIOR_DETAIL_FIELDS, PRO_SE_FIELD, conditionalCompletionRequirements} from './al-completion-contract.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const families=['al-felony-dwop-set','al-felony-nonconviction-90-set'];
const positive=[],negative=[],conditional=[];
for(const prior of [null,false,true])for(const representation of [null,'pro_se','attorney']){
 const p=conditionalCompletionRequirements({previouslyApplied:prior,representation});
 assert.equal(p.previousDetailsRequired,prior===true);
 assert.equal(p.previousDetailsMustRemainBlank,prior===false);
 assert.equal(p.resolvePreviousApplicationStatus,prior===null);
 assert.equal(p.proSeMarkRequired,representation==='pro_se');
 assert.equal(p.proSeMarkForbidden,representation==='attorney');
 assert.deepEqual(p.automaticallyAttestedFields,[]);
 conditional.push({prior,representation,requirements:p});
}
for(const bad of [{previouslyApplied:'yes'},{previouslyApplied:0},{representation:'unknown'}]){
 assert.throws(()=>conditionalCompletionRequirements(bad));negative.push({mutation:'invalid-completion-input',input:bad,rejected:true});
}
for(const family of families){
 const host=await import(`../../build-census-v1-${family}.mjs`);
 const out=path.join(ROOT,`data/rcap-all50/overlays/census-v1/al/${family}--official-pdf-fill`);
 const sources=host.resolveSources();const pins=sources.map(s=>sha(s.bytes));
 for(const [fixture,facts] of Object.entries(host.FIXTURES)){
   const packet=await host.buildPacket(sources,fixture,facts,{familyId:family,...host.FAMILY_CONFIG[family]});
   const expected=fs.readFileSync(path.join(out,'fixtures',fixture+'.pdf'));
   assert.equal(sha(packet.bytes),sha(expected));assert.equal(packet.pageCount,11);
   for(const field of [...PRIOR_CHOICE_FIELDS,...PRIOR_DETAIL_FIELDS,PRO_SE_FIELD]){
     assert.ok(!packet.writes.some(w=>w.fieldId===`CR-65:${field}`),'unknown completion answer auto-written');
     const row=packet.refusals.find(r=>r.fieldId===`CR-65:${field}`);
     assert.ok(row?.requiredBeforeFiling && row.factAvailable===false && !row.routeDetermined);
     assert.equal(row.requiredWhen?.equals??null,PRIOR_DETAIL_FIELDS.includes(field)?true:null);
   }
   assert.ok(!packet.writes.some(w=>w.page===6 && w.documentId==='CR-65' && /signature|attorney|telephone number_2|email address_2|text8|text26|text9|text10/i.test(w.fieldName)));
   assert.ok(!packet.writes.some(w=>['matter.charge','matter.expungement_ground','matter.arresting_agency','matter.detention_agencies'].includes(w.factId)));
   positive.push({family,fixture,sha256:sha(packet.bytes),pages:packet.pageCount,manualCompletionChoicesUnmarked:true});
   // An incorrect route configuration must not bypass these participant-owned choices.
   const injected=await host.buildPacket(sources,fixture,facts,{familyId:family,...host.FAMILY_CONFIG[family],selected:[...host.FAMILY_CONFIG[family].selected,...PRIOR_CHOICE_FIELDS,'Check Box3.0',PRO_SE_FIELD]});
   assert.equal(sha(injected.bytes),sha(packet.bytes),'route injection changed protected completion answers');
   negative.push({family,fixture,mutation:'auto-attest-history-and-pro-se-via-route',blocked:true});
 }
 host.assertRepairInvariants(out);
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'al-completion-'));
 try{
  const map=JSON.parse(fs.readFileSync(path.join(out,'production-field-map.json')));
  const instructions=fs.readFileSync(path.join(out,'participant-instructions.md'),'utf8');
  for(const mutation of ['hide-prior-choice','unconditional-prior-county','unconditional-prior-result','hide-pro-se','force-unknown-attestation','old-unconditional-guide','omit-never-applied-branch','omit-representation-instruction']){
    const m=structuredClone(map);let text=instructions;
    if(mutation==='hide-prior-choice')delete m.refusals.find(r=>r.fieldId==='CR-65:Check Box2.0').requiredBeforeFiling;
    if(mutation==='unconditional-prior-county')delete m.refusals.find(r=>r.fieldName===PRIOR_DETAIL_FIELDS[0]).requiredWhen;
    if(mutation==='unconditional-prior-result')delete m.refusals.find(r=>r.fieldId==='CR-65:Check Box3.0').requiredWhen;
    if(mutation==='hide-pro-se')m.refusals=m.refusals.filter(r=>r.fieldId!==`CR-65:${PRO_SE_FIELD}`);
    if(mutation==='force-unknown-attestation')m.writes.push({fieldId:'CR-65:Check Box2.0'});
    if(mutation==='old-unconditional-guide')text+='\nFill every item below\n';
    if(mutation==='omit-never-applied-branch')text=text.replace('If you tick the first box, leave the previous county, case number, and granted/denied boxes blank.','');
    if(mutation==='omit-representation-instruction')text=text.replace('check "pro se (Not represented by an attorney)" only if','');
    fs.writeFileSync(path.join(temporary,'production-field-map.json'),JSON.stringify(m));
    fs.writeFileSync(path.join(temporary,'participant-instructions.md'),text);
    assert.throws(()=>host.assertRepairInvariants(temporary),undefined,mutation+' was missed');
    negative.push({family,mutation,rejected:true});
  }
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 assert.deepEqual(sources.map(s=>sha(s.bytes)),pins,'sources changed');
}
console.log(JSON.stringify({scope:'author QA, actual two-host full rendering and conditional manual-completion contract',positive,conditionalCases:conditional,negative,negativeCount:negative.length,independentApproval:false},null,2));
