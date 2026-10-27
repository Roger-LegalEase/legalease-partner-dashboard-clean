import test from 'node:test';import assert from 'node:assert/strict';
import{constructionFetchAllowed,sanitizedConstructionFailure,diagnoseOrdinaryConstruction}from'./ordinary-construction-diagnostic.mjs';
import{ORDINARY}from'./rcap-hosted-ordinary-full-admission.mjs';
import{ORDINARY_CONSTRUCTION_STATE_SQL}from'./rcap-hosted-ordinary-full-runtime.mjs';
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
test('constructor-only diagnostic permits existing stranger Auth once, refuses customer/worker ports, and emits no raw error details (mock ports only)',async()=>{
 assert(constructionFetchAllowed(ORDINARY.origin+'/api/rcap/release'));assert(constructionFetchAllowed('https://api.supabase.com/v1/projects/'+ORDINARY.project+'/api-keys'));
 const endpoint='https://api.supabase.com/v1/projects/'+ORDINARY.project+'/database/query';assert(constructionFetchAllowed(endpoint,{method:'POST',body:JSON.stringify({query:ORDINARY_CONSTRUCTION_STATE_SQL})}));
 for(const query of["UPDATE a SET b=1;","BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SELECT jsonb_build_object('live',true); COMMIT; DELETE FROM a; COMMIT;"]){assert.equal(constructionFetchAllowed(endpoint,{method:'POST',body:JSON.stringify({query})}),false);}
 for(const path of['/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim','/api/expungement-ai/packet/generate','/api/internal/partners/onboarding/phase1/'+ORDINARY.slug+'/launch','/intake/'+ORDINARY.slug])assert.equal(constructionFetchAllowed(ORDINARY.origin+path,{method:'POST'}),false);
 assert.equal(constructionFetchAllowed('https://other.example/api/rcap/release'),false);assert.equal(constructionFetchAllowed(AUTH+'/auth/v1/token?grant_type=password',{method:'POST'}),true);
 const error=Object.assign(new Error('PRIVATE_SECRET'),{code:'PRIVATE_SECRET'});error.stack='PRIVATE_SECRET\n at /home/runner/work/repo/scripts/rcap-hosted-ordinary-full-runtime.mjs:17:3';const safe=sanitizedConstructionFailure(error,'browser_launch');assert.equal(safe.sourcePath,'scripts/rcap-hosted-ordinary-full-runtime.mjs');assert.equal(safe.sourceLine,17);assert.equal(safe.errorCode,null);assert.equal(JSON.stringify(safe).includes('PRIVATE_SECRET'),false);
 const old=globalThis.fetch;let forwards=0,closed=0,participant=0,worker=0;globalThis.fetch=async()=>{forwards++;return new Response('{}');};
 try{
 const createRuntime=async({onConstructionPhase})=>{await onConstructionPhase('stranger_auth');await fetch(AUTH+'/auth/v1/token?grant_type=password',{method:'POST'});await onConstructionPhase('constructed_before_participant');return{participant:()=>{participant++;},worker:{prepare:()=>{worker++;}},close:async()=>{closed++;}};};
 const r=await diagnoseOrdinaryConstruction({checkpoint:async()=>{},createRuntime});assert.equal(r.phase,'CONSTRUCTION_COMPLETE_STOP_BEFORE_PARTICIPANT');assert.equal(r.existingStrangerAuthPosts,1);assert.equal(forwards,1);assert.equal(closed,1);assert.equal(participant,0);assert.equal(worker,0);
 const twice=await diagnoseOrdinaryConstruction({checkpoint:async()=>{},createRuntime:async({onConstructionPhase})=>{await onConstructionPhase('stranger_auth');await fetch(AUTH+'/auth/v1/token?grant_type=password',{method:'POST'});await fetch(AUTH+'/auth/v1/token?grant_type=password',{method:'POST'});}});assert.equal(twice.phase,'CONSTRUCTION_FAILED_STOP_NO_RETRY');assert.equal(forwards,2);assert.equal(twice.existingStrangerAuthPosts,1);assert.equal(twice.errorClass,'AssertionError');
 const early=await diagnoseOrdinaryConstruction({checkpoint:async()=>{},createRuntime:async({onConstructionPhase})=>{await onConstructionPhase('browser_module');await fetch(AUTH+'/auth/v1/token?grant_type=password',{method:'POST'});}});assert.equal(early.constructionPhase,'browser_module');assert.equal(early.existingStrangerAuthPosts,0);assert.equal(forwards,2);
 }finally{globalThis.fetch=old;}
});
