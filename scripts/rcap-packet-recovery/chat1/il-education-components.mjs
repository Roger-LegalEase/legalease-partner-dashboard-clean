/** Consume CHATB-IL-03/06 as an exact component contract, never output approval. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {replaceTargetTrackBytes} from './source-contract-corrections.mjs';
export const IL_TRACK='il-seal-edu';
export const IL_FEE_CONDITION='Only when the participant actually requests a fee waiver and includes FW-CIV-APPLICATION; never infer that request from sponsorship, a missing email address or absent financial data.';
export const IL_DENY=Object.freeze({componentId:'il-seal-edu-proposed-denying-order-5',role:'proposed_order',requirement:'required',conditionDescription:null,outputStrategy:'official_pdf_fill',officialFormId:'EXP-AD Order Denying',officialSourceUrl:'https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/9ee52a9a-dfc9-4a4c-9264-0ecb1ce679d4/EXP-AD%20Order%20Denying.pdf',order:4,notes:'ATJ 2906.6 (06/26), complete one-page official Denying Order. Only permitted caption, identity and recipient-contact fields may be prepared. All denial choices, case decisions, reasons, judge signature and entry date remain blank. Required alongside the Granting Order, not an election of the expected outcome. Raw source-byte custody, actual output and independent acceptance remain separate.'});
export const IL_FEE_ORDER=Object.freeze({componentId:'il-seal-edu-fee-waiver-order-6',role:'proposed_order',requirement:'conditional',conditionDescription:IL_FEE_CONDITION,outputStrategy:'official_pdf_fill',officialFormId:'FW-CIV-ORDER',officialSourceUrl:'https://ilcourtsaudio.blob.core.windows.net/antilles-resources/resources/aeb7187c-60d8-4245-b05c-7610a6745e56/FW-CIV%20Order.pdf',order:6,notes:'ATJ 602.8 (08/25), all three official pages. Prepare only permitted caption/applicant identity. Leave every judicial full/partial/denied/continued election, financial finding, payment term, hearing setting, document demand, judge signature and entry date blank. Include only with the requested fee-waiver application. Raw source-byte custody, actual output and independent acceptance remain separate.'});
const one=(rows,fn,name)=>{const matches=rows.filter(fn);assert.equal(matches.length,1,`${name}: missing or duplicate`);return matches[0];};
const trackOf=r=>one(r.tracks,t=>t.trackId===IL_TRACK,IL_TRACK);
const expectedForms=['EXP-AD Request','EXP-AD Case List','EXP-AD Order Granting','EXP-AD Order Denying','FW-CIV-APPLICATION','FW-CIV-ORDER'];
export function assertIlEducationComponents(track) {
 assert.equal(track.trackId,IL_TRACK);const c=track.packetSet.components;assert.equal(c.length,6);
 assert.deepEqual([...c].sort((a,b)=>a.order-b.order).map(c=>c.officialFormId),expectedForms);
 assert.deepEqual([...c].sort((a,b)=>a.order-b.order).map(c=>c.order),[1,2,3,4,5,6]);
 assert.equal(new Set(c.map(c=>c.componentId)).size,6);
 assert.deepEqual(one(c,c=>c.officialFormId===IL_DENY.officialFormId,'Denying Order'),IL_DENY);
 assert.deepEqual(one(c,c=>c.officialFormId===IL_FEE_ORDER.officialFormId,'Fee Order'),IL_FEE_ORDER);
 const app=one(c,c=>c.officialFormId==='FW-CIV-APPLICATION','Fee application');
 assert.equal(app.requirement,'conditional');assert.equal(app.conditionDescription,IL_FEE_CONDITION);
 for(const form of expectedForms.slice(0,4))assert.equal(one(c,c=>c.officialFormId===form,form).requirement,'required');
 return true;
}
export function applyIlEducationComponents(registry) {
 const out=structuredClone(registry),track=trackOf(out),components=track.packetSet.components;
 const forms=components.map(c=>c.officialFormId);
 assert.ok(forms.every(f=>expectedForms.includes(f)),'An independently changed component set needs reconciliation');
 assert.equal(new Set(forms).size,forms.length,'Duplicate component forms');
 for(const form of ['EXP-AD Request','EXP-AD Case List','EXP-AD Order Granting','FW-CIV-APPLICATION'])one(components,c=>c.officialFormId===form,form);
 const old=JSON.stringify(components);
 const app=one(components,c=>c.officialFormId==='FW-CIV-APPLICATION','Fee application');
 assert.equal(app.requirement,'conditional');
 assert.ok(['Only where the participant cannot pay the county filing fee.',IL_FEE_CONDITION].includes(app.conditionDescription),'Fee-request condition was independently changed');
 assert.ok([4,5].includes(app.order));app.order=5;app.conditionDescription=IL_FEE_CONDITION;
 for(const addition of [IL_DENY,IL_FEE_ORDER]) {
  const found=components.find(c=>c.officialFormId===addition.officialFormId);
  if(found)assert.deepEqual(found,addition,'Do not overwrite another implementation of this component');
  else components.push(structuredClone(addition));
 }
 components.sort((a,b)=>a.order-b.order);assertIlEducationComponents(track);
 return {registry:out,changed:JSON.stringify(components)!==old};
}
/** Component selection only, not eligibility, execution, source or delivery proof. */
export function ilEducationComponentsFor(track,{requestFeeWaiver}={}) {
 assertIlEducationComponents(track);assert.equal(typeof requestFeeWaiver,'boolean','An explicit fee-waiver request/no-request decision is required');
 return {components:structuredClone(track.packetSet.components.filter(c=>c.requirement==='required'||requestFeeWaiver)),requestFeeWaiver,grantsEligibility:false,waiverApproved:false,judicialExecutionPermitted:false,deliveryAuthorized:false};
}
function main(args) {
 const apply=args.includes('--apply');assert.ok(args.every(a=>['--apply','--check'].includes(a))&&!(apply&&args.includes('--check')),'Use --check or --apply');
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
 const file=path.join(root,'data/record-clearing/legal-design-track-registry.json');const before=fs.readFileSync(file,'utf8');
 const result=applyIlEducationComponents(JSON.parse(before));
 if(apply&&result.changed) {
  const next=replaceTargetTrackBytes(before,result.registry,[IL_TRACK]);const temp=file+'.chat1-il-'+process.pid+'.tmp';
  try{fs.writeFileSync(temp,next,{flag:'wx',mode:fs.statSync(file).mode});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
 }
 console.log(JSON.stringify({mode:apply?'apply':'check',trackId:IL_TRACK,componentContractChanged:result.changed,registryWritten:apply&&result.changed,sourceBytesAcquired:0,packetBytesChanged:false,terminalPromotions:0},null,2));
 if(!apply&&result.changed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main(process.argv.slice(2));
