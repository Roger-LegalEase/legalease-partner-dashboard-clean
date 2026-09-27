import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {integrationVerdict} from './verify-rcap-hosted-integration-verdict.mjs';
import {verifierOutput,oneEvidence,relationshipQuery} from './rcap-hosted-legal-aid-prerequisite.mjs';
import {assertOneRemainingSlot,observeFunding} from './rcap-sponsored-funding-contract.mjs';
const workflow=parse(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8'));
const entry=parse(fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8'));
const steps=workflow.jobs.preflight.steps,step=id=>steps.find(s=>s.id===id);
const evaluate=(text,inputs,states,secrets={})=>new Function('inputs','steps','secrets','always','success',`return (${String(text).replace(/^\$\{\{|\}\}$/g,'')})`)(inputs,states,secrets,()=>true,()=>true);
const context={applicationSha:'a'.repeat(40),project:'hyflxnlhpmiqxvvcoiia',deploymentId:'dpl_Test',hostname:'exact.vercel.app'};
function phase(name){
 const inputs={phase:name,mode:`hosted_${name}`,preview_hostname:context.hostname,preview_deployment_id:context.deploymentId};
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b-contract-'));
 try{const out=path.join(temp,'out');const r=spawnSync('bash',['-c',step('contract').run.replace(/\$\{\{ inputs\.(\w+) \}\}/g,(_,k)=>inputs[k]??'')],{encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_OUTPUT:out}});assert.equal(r.status,0,r.stdout+r.stderr);
 return {inputs,states:Object.fromEntries(steps.filter(s=>s.id).map(s=>[s.id,{outcome:'skipped',outputs:s.id==='contract'?Object.fromEntries(fs.readFileSync(out,'utf8').trim().split('\n').map(l=>l.split('='))):{}}]))};
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
const legalEvidence=()=>({...Object.fromEntries(['prerequisite','preservation','relationships'].map(boundary=>[`legal-aid/${boundary}.json`,{status:'PASS',boundary,...context,native:{result:'PASS',historicalCheckpointUnchanged:true}}])),
 'legal-aid/seed.json':{passed:true,applicationSha:context.applicationSha,previewDeploymentId:context.deploymentId},
 'legal-aid/browser.json':{passed:true,applicationSha:context.applicationSha,previewDeploymentId:context.deploymentId,acceptanceProjectRef:context.project,cases:{retained_browser_cases:{passed:true}},checkoutCreated:false,paymentCompleted:false,stripeTouched:false,workerRun:false,migrationApplied:false,emailDelivery:{mode:'not_configured'}}});
test('Legal Aid uses exact Preview, independent of Clinic replay and Stripe',()=>{
 const {inputs,states}=phase('legal_aid_browser');
 for(const k of ['deploy','matrix','gate','retarget','clinic','dtc'])assert.equal(states.contract.outputs[k],'false',k);
 assert.equal(states.contract.outputs.legal_aid,'true');
 for(const id of ['stripe_fixtures','stripe_retarget','clinic_seed','clinic_journey','clinic_audit','payment_journey','checkout_gate'])assert.equal(Boolean(evaluate(step(id).if,inputs,states)),false,id);
 assert.match(step('legal_aid_seed').if,/legal_aid_prerequisite.outcome == 'success'/);
 assert(steps.indexOf(step('legal_aid_prerequisite'))<steps.indexOf(step('legal_aid_seed')));
 assert.match(step('legal_aid_preservation').if,/always\(\)/);
 for(const id of ['legal_aid_prerequisite','legal_aid_seed','legal_aid_browser','legal_aid_preservation','legal_aid_relationships'])assert(!Object.keys(step(id).env).some(k=>k.includes('STRIPE')));
});
test('channel scheduling: only observed DTC exhaustion schedules existing payment machinery',()=>{
 const {inputs,states}=phase('sponsor_cap');states.sponsor_outcome.outcome='success';
 for(const dtc of ['false','true']){
 states.sponsor_outcome.outputs.dtc=dtc;states.cap_stripe_fixtures.outcome='success';states.cap_dtc_gate.outcome='success';for(const id of ['cap_browser','verify_harness','payment_database','registry_login'])states[id].outcome='success';
 for(const id of ['cap_stripe_fixtures','cap_dtc_gate','cap_payment'])assert.equal(Boolean(evaluate(step(id).if,inputs,states)),dtc==='true',id);
 for(const id of ['stripe_fixtures','stripe_retarget','checkout_gate','payment_journey'])assert.equal(Boolean(evaluate(step(id).if,inputs,states)),false,id);
 }
 for(const value of ['',undefined,'slot_reserved','pausedAtCap','409']){states.sponsor_outcome.outputs.dtc=value;assert.equal(Boolean(evaluate(step('cap_stripe_fixtures').if,inputs,states)),false);}
});
test('ordinary DTC payment phase retains matrix and Stripe fixture scheduling',()=>{const {inputs,states}=phase('payment');assert.equal(states.contract.outputs.matrix,'true');assert.equal(states.contract.outputs.dtc,'true');assert.equal(evaluate(step('stripe_fixtures').if,inputs,states),true);});
test('caller propagates sponsor case and exact existing item inputs',()=>{const caller=Object.values(entry.jobs).find(j=>j.uses==='./.github/workflows/rcap-hosted-acceptance-staging.yml');for(const k of ['sponsor_case','sponsor_items']){assert.equal(caller.with[k],`\${{ inputs.${k} }}`);assert.equal(workflow.on.workflow_call.inputs[k].type,'string');}assert.equal(evaluate(caller.with.phase,{mode:'hosted_sponsor_cap'},{}),'sponsor_cap');});
test('native Legal Aid evidence is required; every missing or failed boundary refuses',()=>{
 const e=legalEvidence();assert.equal(integrationVerdict('legal-aid',n=>e[n],context).status,'PASS');
 for(const n of Object.keys(e).filter(n=>!/(seed|browser)\.json/.test(n)))for(const mutation of ['missing','failed','native','source','preservation']){
 const bad=structuredClone(e);if(mutation==='missing')delete bad[n];if(mutation==='failed')bad[n].status='FAIL';if(mutation==='native')bad[n].native.result='INCOMPLETE';if(mutation==='source')bad[n].applicationSha='b'.repeat(40);if(mutation==='preservation'){if(!n.includes('preservation'))continue;bad[n].native.historicalCheckpointUnchanged=false;}
 assert.throws(()=>integrationVerdict('legal-aid',name=>bad[name],context),`${n} ${mutation}`);
 }
});
test('actual Bash anti-skip rejects skipped, failed, cancelled and missing Legal Aid boundaries',()=>{
 const {inputs,states}=phase('legal_aid_browser');states.contract.outcome='success';
 const required=['resolve_preview','gate_deps','verify_legal_aid_browser','legal_aid_suites','legal_aid_prerequisite','legal_aid_seed','legal_aid_browser','legal_aid_preservation','legal_aid_relationships','checkout_browser'];required.forEach(id=>states[id].outcome='success');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b-verdict-'));try{
 fs.symlinkSync(path.resolve('scripts'),path.join(temp,'scripts'),'dir');fs.mkdirSync(path.join(temp,'hosted-acceptance-evidence/legal-aid'),{recursive:true});for(const[n,e]of Object.entries(legalEvidence()))fs.writeFileSync(path.join(temp,'hosted-acceptance-evidence',n),JSON.stringify(e));
 const env=Object.fromEntries(Object.entries(step('antiskip').env).map(([k,v])=>[k,String(evaluate(v,{...inputs,application_sha:context.applicationSha,supabase_project_ref:context.project},states))]));
 Object.assign(env,{HOSTED_APPLICATION_SHA:context.applicationSha,ACCEPTANCE_SUPABASE_PROJECT_REF:context.project,HOSTED_PREVIEW_DEPLOYMENT_ID:context.deploymentId,HOSTED_PREVIEW_HOSTNAME:context.hostname});
 const run=patch=>spawnSync('bash',['-c',step('antiskip').run],{cwd:temp,encoding:'utf8',env:{PATH:process.env.PATH,...env,...patch}});
 const good=run({});assert.equal(good.status,0,good.stdout+good.stderr);
 assert.notEqual(run({RUNS_LEGAL_AID:'false'}).status,0);assert.notEqual(run({RUNS_SPONSOR_CAP:'true'}).status,0);
 const keys=['O_LEGAL_AID_PREREQUISITE','O_LEGAL_AID_PRESERVATION','O_LEGAL_AID_RELATIONSHIPS','O_LEGAL_AID_SEED','O_LEGAL_AID_BROWSER','O_LEGAL_AID_SUITES'];
 for(const k of keys)for(const v of ['skipped','failure','cancelled',''])assert.notEqual(run({[k]:v}).status,0,`${k} ${v}`);
 for(const k of ['O_CLINIC_SEED','O_CLINIC_JOURNEY','O_CLINIC_AUDIT','O_STRIPE_FIXTURES','O_STRIPE_RETARGET','O_PAYMENT'])assert.notEqual(run({[k]:'success'}).status,0,k);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('prerequisite rejects verifier failure/missing output and ambiguous checkpoint; relationship query has exact joins',()=>{
 assert.throws(()=>verifierOutput([],()=>({status:1,stdout:'{"result":"PASS"}'})));assert.throws(()=>verifierOutput([],()=>({status:0,stdout:''})));
 for(const e of [[],[{evidence:{}} ,{evidence:{}}],[{}]])assert.throws(()=>oneEvidence(e));
 const sql=relationshipQuery();assert.match(sql,/begin transaction read only/);assert.match(sql,/unsigned_render_job_id=/);assert.match(sql,/registration_id=r.id/);assert.doesNotMatch(sql,/order by|limit 1/i);
});
test('final-slot precondition refuses unrelated capacity, missing counters or exhausted fixture',()=>{
 const a={event:'event',partner:'partner',packetEntitlement:'allowance',eventRemaining:1,partnerRemaining:3,packetRemaining:3};assertOneRemainingSlot([a,a]);
 for(const patch of [{eventRemaining:2},{eventRemaining:0},{eventRemaining:undefined},{event:'other',partner:'other',packetEntitlement:'other'}])assert.throws(()=>assertOneRemainingSlot([a,{...a,...patch}]));
});

test('ordinary deploy catalog and replacement read-only catalog retain existing behavior',()=>{for(const name of ['deploy','replace_preview']){const {inputs,states}=phase(name);assert.equal(states.contract.outputs.dtc,'true');assert.equal(evaluate(step('stripe_fixtures').if,inputs,states),name==='deploy');assert.equal(evaluate(step('preview_catalog').if,inputs,states),name==='replace_preview');}});

import vm from 'node:vm';
test('actual resolver readiness predicates ignore Stripe only for sponsored execution',()=>{
 const source=fs.readFileSync('scripts/rcap-hosted-resolve-preview.mjs','utf8');
 const body=source.slice(source.indexOf('\n(!REQUIRE_DTC_READINESS || meta.rcapStripeConfigured'),source.indexOf('if (CLINIC_DEMO_MODE === "mississippi_preview")',source.indexOf('\n(!REQUIRE_DTC_READINESS || meta.rcapStripeConfigured')));
 for(const required of [false,true])for(const configured of ['true','false']){
  const verdicts=[];vm.runInNewContext(body,{REQUIRE_DTC_READINESS:required,meta:{rcapStripeConfigured:configured,rcapCatalogProduct:'inline'},EXPECTED_STRIPE_CONFIGURED:'true',EXPECTED_CATALOG_PRODUCT:'prod_expected',ok:id=>verdicts.push([id,true]),bad:id=>verdicts.push([id,false])});
  assert.equal(verdicts.length,2);assert.equal(verdicts[0][1],!required||configured==='true');assert.equal(verdicts[1][1],!required);
 }
});
