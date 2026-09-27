import test from 'node:test';
import assert from 'node:assert/strict';
import { fundingOutcome, stripeScheduled, assertAccounting, assertContinuity, assertFinalSlot, observeFunding } from './rcap-sponsored-funding-contract.mjs';
import { currentCapPaymentMatter } from './rcap-hosted-cap-payment-context.mjs';
export function observation(reason='slot_reserved',suffix='1') {
  const item={id:`item-${suffix}`,user_id:`owner-${suffix}`,source_session_id:`screening-${suffix}`,source_pending_result_id:`pending-${suffix}`,jurisdiction:'IL',pathway_label:'reviewed-route',artifact_refs_json:{attribution:{campaignName:'clinic:mvlp',product:'rcap_partner'}}};
  const verification={briefcase_item_id:item.id,consumer_auth_user_id:item.user_id,matter_id:`canonical-${suffix}`,verification_hash:'a'.repeat(64),status:'verified',snapshot:{jurisdiction:'IL',pathwayId:'reviewed-route'}};
  const source={pending_id:item.source_pending_result_id,claimed_user_id:item.user_id,claimed_matter_id:item.id,anonymous_session_id:item.source_session_id,product:'rcap_partner',status:'CLAIMED',event_id:'event',partner_slug:'sponsor'};
  const before={item,verification,source,funding:[],matterCount:1,sponsoredConsumed:0,sponsoredEntitlements:0,dtcEntitlements:0,overageConsumed:0,orphanJobs:0,checkoutSessions:0,paymentCount:0};
  const after=structuredClone(before),sponsored=reason==='slot_reserved';
  after.funding=[{briefcase_item_id:item.id,consumer_auth_user_id:item.user_id,source_session_id:item.source_session_id,event_id:source.event_id,partner_slug:source.partner_slug,initial_verification_hash:verification.verification_hash,route_key:`${verification.snapshot.jurisdiction}:${verification.snapshot.pathwayId}`,funding_mode:sponsored?'sponsored':'dtc',reason}];
  after.sponsoredEntitlements=sponsored?1:0;after.sponsoredConsumed=sponsored?1:0;
  return {before,after,outcome:reason,response:sponsored?{status:200,json:{packetStatus:'ready'}}:{status:409,json:{outcome:'sponsor_capacity_exhausted',checkoutRequired:true}}};
}
for(const reason of ['slot_reserved','event_cap_exhausted','partner_cap_exhausted'])test(`exact funding ${reason}`,()=>{
 const o=observation(reason);assert.equal(fundingOutcome(o.response,o.before,o.after),reason);assert.equal(stripeScheduled(reason),reason!=='slot_reserved');assertAccounting(reason,o.after);
});
for(const code of ['fulfillment_stale','fulfillment_no_record','wrong_tenant','wrong_event','wrong_partner','wrong_track','authority_unavailable'])test(`mutation: ${code} never opens Checkout`,()=>{
 const o=observation('event_cap_exhausted');o.response.json={resultCode:code,sponsoredPaused:true};assert.throws(()=>fundingOutcome(o.response,o.before,o.after));
});
for(const [name,mutate] of [
 ['generic 409',o=>o.response.json={}],['pausedAtCap',o=>o.response.json={pausedAtCap:true}],
 ['missing funding',o=>o.after.funding=[]],['forged funding reason',o=>o.after.funding[0].reason='wrong_event'],
 ['no checkoutRequired',o=>delete o.response.json.checkoutRequired],['wrong owner',o=>o.after.item.user_id='other'],
 ['different matter',o=>o.after.verification.matter_id='new'],['different verification',o=>o.after.verification.verification_hash='b'.repeat(64)],
 ['different route',o=>o.after.verification.snapshot.pathwayId='other'],['source relabeled consumer',o=>o.after.item.artifact_refs_json.attribution.campaignName='consumer'],
 ['sponsored entitlement on loser',o=>o.after.sponsoredEntitlements=1],['credit on loser',o=>o.after.sponsoredConsumed=1],
 ['refusal with exhaustion text',o=>o.response.json.resultCode='fulfillment_stale'],
])test(`mutation: ${name}`,()=>{const o=observation('partner_cap_exhausted');mutate(o);assert.throws(()=>fundingOutcome(o.response,o.before,o.after));});
test('exhaustion response need not echo an item or matter',()=>{const o=observation('event_cap_exhausted');assert.equal(Object.hasOwn(o.response.json,'briefcaseItemId'),false);assert.equal(fundingOutcome(o.response,o.before,o.after),o.outcome);});
test('attribution is not funding authority',()=>{const o=observation('event_cap_exhausted');o.after.funding=[];o.after.item.artifact_refs_json.attribution={campaignName:'legal_aid',sponsored:true,paid:true};assert.throws(()=>fundingOutcome(o.response,o.before,o.after));});
test('funding immutable across refill; source remains Clinic',()=>{const o=observation('event_cap_exhausted');const after=structuredClone(o.after);after.funding[0].funding_mode='sponsored';assert.throws(()=>assertContinuity(o.after,after));assert.equal(o.after.item.artifact_refs_json.attribution.campaignName,'clinic:mvlp');});
for(const key of ['sponsoredEntitlements','sponsoredConsumed','overageConsumed','orphanJobs'])test(`mutation: paid DTC ${key}`,()=>{const o=observation('event_cap_exhausted');o.after.dtcEntitlements=1;o.after.paymentCount=1;o.after[key]=1;assert.throws(()=>assertAccounting(o.outcome,o.after,{paid:true}));});
test('paid DTC has only DTC entitlement, no sponsor count',()=>{const o=observation('event_cap_exhausted');o.after.dtcEntitlements=1;o.after.paymentCount=1;assertAccounting(o.outcome,o.after,{paid:true});});
for(const key of ['checkoutSessions','paymentCount','dtcEntitlements'])test(`mutation: sponsored success ${key}`,()=>{const o=observation();o.after[key]=1;assert.throws(()=>assertAccounting(o.outcome,o.after));});
test('cancellation remains unpaid and retry uses the identical matter/verification',async()=>{
 const o=observation('event_cap_exhausted'),input={observation:o};const calls=[];
 const adapters={userId:o.before.item.user_id,readSnapshot:async id=>{calls.push(id);return o.after;},getItem:async(owner,id)=>({id}),verify:async()=>({hash:o.after.verification.verification_hash,snapshot:o.after.verification.snapshot}),canonicalMatterId:()=>o.after.verification.matter_id};
 assertAccounting(o.outcome,o.after);await currentCapPaymentMatter(input,adapters);await currentCapPaymentMatter(input,adapters);
 assert.deepEqual(calls,[o.before.item.id,o.before.item.id]);assertAccounting(o.outcome,o.after);
});
test('final slot launches both requests before either completes, without retry',async()=>{
 const rows=[observation(),observation('event_cap_exhausted','2')];let entered=0,release;const barrier=new Promise(r=>release=r);
 const read=async id=>{const o=rows.find(r=>r.before.item.id===id);return entered<2?o.before:o.after;};
 const result=await observeFunding({itemIds:rows.map(o=>o.before.item.id),read,generate:async id=>{if(++entered===2)release();await barrier;return rows.find(o=>o.before.item.id===id).response;}});
 assert.equal(entered,2);assertFinalSlot(result);
});
test('mutation: final-slot double winner',()=>assert.throws(()=>assertFinalSlot([observation(),observation('slot_reserved','2')])));
test('mutation: duplicate matter in race',()=>assert.throws(()=>assertFinalSlot([observation(),observation('event_cap_exhausted')])));
test('mutation: historical Applicant A cannot be a funding fixture',()=>{const o=observation();o.before.item.id='6e7a0013-f372-438d-9454-6ba6451b290c';assert.throws(()=>fundingOutcome(o.response,o.before,o.after));});

import {integrationVerdict} from './verify-rcap-hosted-integration-verdict.mjs';
const context={applicationSha:'a'.repeat(40),project:'local',deploymentId:'dpl_Test',hostname:'exact.vercel.app'};
function capEvidence(reason='slot_reserved'){
 const o=observation(reason),dtc=reason!=='slot_reserved',after=structuredClone(o.after);
 if(dtc){after.dtcEntitlements=1;after.paymentCount=1;}
 return {'sponsor-cap/outcome.json':{status:'PASS',...context,case:dtc?'exhausted':'sponsored',dtc,observations:[o]},
 'sponsor-cap/accounting.json':{status:'PASS',...context,after:[after]},
 'sponsor-cap/payment.json':{status:'PASS',...context,item:o.before.item.id},
 'payment.json':{passed:true,requiredCases:['native-required-case'],failedCases:[],missingCases:[],cases:{'native-required-case':{passed:true}}}};
}
for(const reason of ['slot_reserved','event_cap_exhausted'])test(`native verdict ${reason} requires applicable accounting/payment artifacts`,()=>{
 const e=capEvidence(reason);assert.equal(integrationVerdict('sponsor-cap',n=>e[n],context).status,'PASS');
 for(const name of ['sponsor-cap/outcome.json','sponsor-cap/accounting.json',...(reason==='slot_reserved'?[]:['sponsor-cap/payment.json','payment.json'])]){const bad=structuredClone(e);delete bad[name];assert.throws(()=>integrationVerdict('sponsor-cap',n=>bad[n],context),name);}
});
for(const [name,mutate]of[
 ['scheduling Stripe for sponsor',e=>e['sponsor-cap/outcome.json'].dtc=true],
 ['relabeling native outcome',e=>e['sponsor-cap/outcome.json'].observations[0].outcome='event_cap_exhausted'],
 ['dual authority',e=>e['sponsor-cap/accounting.json'].after[0].dtcEntitlements=1],
 ['different matter at accounting',e=>e['sponsor-cap/accounting.json'].after[0].item.id='changed']
])test(`verdict mutation: ${name}`,()=>{const e=capEvidence();mutate(e);assert.throws(()=>integrationVerdict('sponsor-cap',n=>e[n],context));});
for(const [name,mutate]of[
 ['suppressing DTC',e=>e['sponsor-cap/outcome.json'].dtc=false],
 ['paid loser counted sponsored',e=>e['sponsor-cap/accounting.json'].after[0].sponsoredConsumed=1],
 ['missing native payment case',e=>e['payment.json'].cases={}],
 ['payment from another source',e=>e['sponsor-cap/payment.json'].applicationSha='b'.repeat(40)]
])test(`verdict mutation: ${name}`,()=>{const e=capEvidence('event_cap_exhausted');mutate(e);assert.throws(()=>integrationVerdict('sponsor-cap',n=>e[n],context));});
test('refusal persists native response and post-state before refusing, never retries',async()=>{
 const o=observation('event_cap_exhausted');let reads=0,calls=0,saved;
 await assert.rejects(observeFunding({itemIds:[o.before.item.id],read:async()=>++reads===1?o.before:o.after,generate:async()=>{calls++;return{status:409,json:{resultCode:'fulfillment_stale'}};},persist:rows=>{saved=rows;}}));
 assert.equal(calls,1);assert.equal(saved[0].response.json.resultCode,'fulfillment_stale');assert.deepEqual(saved[0].after,o.after);
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
test('actual sponsor anti-skip enforces channel-specific required and forbidden outcomes',()=>{
 const gate=parse(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8')).jobs.preflight.steps.find(s=>s.id==='antiskip');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b-cap-antiskip-'));
 try{
 fs.symlinkSync(path.resolve('scripts'),path.join(temp,'scripts'),'dir');fs.mkdirSync(path.join(temp,'hosted-acceptance-evidence/sponsor-cap'),{recursive:true});
 for(const reason of ['slot_reserved','event_cap_exhausted']){
  const e=capEvidence(reason);for(const[n,v]of Object.entries(e))fs.writeFileSync(path.join(temp,'hosted-acceptance-evidence',n),JSON.stringify(v));
  const env=Object.fromEntries(Object.keys(gate.env).map(k=>[k,k.startsWith('RUNS_')?'false':'skipped']));
  Object.assign(env,{PHASE:'sponsor_cap',O_CONTRACT:'success',RUNS_SPONSOR_CAP:'true',CAP_DTC:String(reason!=='slot_reserved'),O_RESOLVE:'success',O_DEPS:'success',O_SPONSOR_OUTCOME:'success',O_SPONSOR_ACCOUNTING:'success',HOSTED_APPLICATION_SHA:context.applicationSha,ACCEPTANCE_SUPABASE_PROJECT_REF:context.project,HOSTED_PREVIEW_DEPLOYMENT_ID:context.deploymentId,HOSTED_PREVIEW_HOSTNAME:context.hostname});
  const required=['O_SPONSOR_OUTCOME','O_SPONSOR_ACCOUNTING'];
  if(reason!=='slot_reserved')for(const key of ['O_CAP_STRIPE_FIXTURES','O_CAP_DTC_GATE','O_CAP_PAYMENT','O_CAP_BROWSER','O_VERIFY_HARNESS','O_PAYMENT_DATABASE','O_REGISTRY_LOGIN']){env[key]='success';required.push(key);}
  const run=patch=>spawnSync('bash',['-c',gate.run],{cwd:temp,encoding:'utf8',env:{PATH:process.env.PATH,...env,...patch}});
  const good=run({});assert.equal(good.status,0,good.stdout+good.stderr);
  assert.notEqual(run({RUNS_SPONSOR_CAP:'false'}).status,0);assert.notEqual(run({RUNS_LEGAL_AID:'true'}).status,0);
  for(const key of required)for(const value of ['skipped','failure','cancelled',''])assert.notEqual(run({[key]:value}).status,0,`${reason} ${key} ${value}`);
  if(reason==='slot_reserved')for(const key of ['O_CAP_STRIPE_FIXTURES','O_CAP_PAYMENT','O_STRIPE_RETARGET'])assert.notEqual(run({[key]:'success'}).status,0);
 }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('mutation: Applicant A owner cannot supply even a new cap item',()=>{const o=observation();o.before.item.user_id='e7c1d76e-dcf2-4d41-b585-ba164806f391';assert.throws(()=>fundingOutcome(o.response,o.before,o.after));});
