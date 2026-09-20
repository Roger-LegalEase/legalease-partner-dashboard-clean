import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {recheck} from './rcap-vercel-identity-recheck.mjs';
import {HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID} from './rcap-hosted-acceptance-vercel-identity.mjs';
const project={id:HOSTED_VERCEL_PROJECT_ID,name:'legalease-partner-dashboard-clean',accountId:HOSTED_VERCEL_TEAM_ID};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('scoped PAT identity uses one GET with no team enumeration or body/token output',async()=>{
 const calls=[];
 const r=await recheck({token:'never-print-secret',fetchImpl:async(url,o)=>{
   assert.equal(o.method,'GET');assert.equal(o.redirect,'error');assert.ok(o.signal);calls.push(url);
   if(new URL(url).pathname==='/v2/teams')return response({},403);
   assert.equal(new URL(url).searchParams.get('teamId'),HOSTED_VERCEL_TEAM_ID);
   return response({...project,private:'never-print-body'});
 }});
 assert.equal(r.passed,true);assert.equal(r.teamIdentitySource,'canonical_pin');assert.equal(calls.length,1);assert.ok(Object.values(r.mutations).every(v=>v===false));assert.equal(r.candidateAcceptance,false);assert.doesNotMatch(JSON.stringify(r),/never-print/);
});
test('HTTP failures, network, missing credential and identity mismatches refuse safely',async()=>{
 for(const [status,reason] of [[401,'HTTP_UNAUTHENTICATED'],[403,'HTTP_FORBIDDEN'],[404,'HTTP_NOT_FOUND']]){
  const r=await recheck({token:'secret',fetchImpl:async()=>response({secret:'raw'},status)});assert.equal(r.failure.reason,reason);assert.equal(r.passed,false);
 }
 let r=await recheck({token:'secret',fetchImpl:async()=>{throw new Error('secret raw response');}});assert.equal(r.failure.reason,'READ_FAILED_OR_TIMED_OUT');assert.doesNotMatch(JSON.stringify(r),/secret|raw response/);
 r=await recheck({fetchImpl:()=>{throw new Error('must not call');}});assert.equal(r.failure.reason,'MISSING_CREDENTIAL');
 for(const [patch,reason] of [[{id:'prj_other'},'PINNED_PROJECT_ID_MISMATCH'],[{accountId:undefined},'PINNED_PROJECT_TEAM_MISMATCH'],[{accountId:'team_other'},'PINNED_PROJECT_TEAM_MISMATCH'],[{name:'other'},'PINNED_PROJECT_NAME_MISMATCH']]){
 r=await recheck({token:'secret',fetchImpl:async()=>response({...project,...patch})});assert.equal(r.failure.reason,reason);assert.equal(r.passed,false);
 }
});
test('workflow identity phase has no Supabase preflight and execution flags all false; other phases remain strict',()=>{
 const s=fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8');const caller=fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8');assert.match(caller,/hosted_vercel_identity/);assert.match(caller,/inputs.mode == 'hosted_vercel_identity' && 'vercel_identity'/);
 assert.match(s,/inputs.phase != 'vercel_audit' && inputs.phase != 'vercel_identity'/);const block=s.split('- name: Read only the pinned Vercel')[1].split('- name:')[0];assert.doesNotMatch(block,/SUPABASE|STRIPE/);assert.match(block,/if: inputs.phase == 'vercel_identity'/);
 const contract=s.match(/          case "\$PHASE" in\n([\s\S]*?)          esac/)[0];for(const phase of ['vercel_identity','preflight']){const out=execFileSync('bash',['-c',`PHASE=${phase}\n${contract}\nprintf '%s' "$DEPLOY/$MATRIX/$GATE/$RETARGET/$BROWSER/$CLINIC"`],{encoding:'utf8'});assert.equal(out,'false/false/false/false/false/false');}
 const condition=s.match(/if \[ "\$\{\{ inputs.phase \}\}" != "preflight" \] && \[ "\$\{\{ inputs.phase \}\}" != "vercel_identity" \]; then/)[0];for(const phase of ['deploy','full','accept','vercel_audit','unknown']){const code=condition.replaceAll('${{ inputs.phase }}',phase)+" echo strict; fi";assert.equal(execFileSync('bash',['-c',code],{encoding:'utf8'}).trim(),'strict');}
 assert.match(s,/require "scoped Vercel identity read" "\$O_VERCEL_IDENTITY"/);
});
