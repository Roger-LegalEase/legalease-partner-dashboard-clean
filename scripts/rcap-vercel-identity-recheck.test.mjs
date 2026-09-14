import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {recheck} from './rcap-vercel-identity-recheck.mjs';
const team={id:'team_test',slug:'roger947s-projects'}, project={id:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',name:'legalease-partner-dashboard-clean',accountId:'team_test'};
const response=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('later page resolves exact project through GET only and emits no body/token',async()=>{
 let calls=0;const r=await recheck({token:'never-print-secret',fetchImpl:async(url,o)=>{assert.equal(o.method,'GET');assert.equal(o.redirect,'error');assert.ok(o.signal);calls++;if(calls===1)return response({teams:[],pagination:{next:100},private:'never-print-body'});if(calls===2){assert.ok(url.endsWith('until=100'));return response({teams:[team],pagination:{next:null}});}return response(project);}});assert.equal(r.passed,true);assert.equal(r.teamPaginationExhausted,true);assert.equal(calls,3);assert.ok(Object.values(r.mutations).every(v=>v===false));assert.equal(r.candidateAcceptance,false);assert.doesNotMatch(JSON.stringify(r),/never-print/);
});
test('exhaustion required before missing-team determination',async()=>{
 const r=await recheck({token:'secret',fetchImpl:async()=>response({teams:[],pagination:{next:null}})});assert.equal(r.failure.reason,'PINNED_TEAM_NOT_VISIBLE');assert.equal(r.teamPaginationExhausted,true);assert.equal(r.reads.length,1);
});
test('401, network failure, missing credential, loop and wrong immutable project refuse safely',async()=>{
 let r=await recheck({token:'secret',fetchImpl:async()=>response({secret:'raw'},401)});assert.equal(r.failure.reason,'HTTP_UNAUTHENTICATED');assert.equal(r.teamPaginationExhausted,false);
 r=await recheck({token:'secret',fetchImpl:async()=>{throw new Error('secret raw response');}});assert.equal(r.failure.reason,'READ_FAILED_OR_TIMED_OUT');assert.doesNotMatch(JSON.stringify(r),/secret|raw response/);
 r=await recheck({fetchImpl:()=>{throw new Error('must not call');}});assert.equal(r.failure.reason,'MISSING_CREDENTIAL');
 r=await recheck({token:'secret',fetchImpl:async()=>response({teams:[],pagination:{next:100}})});assert.equal(r.failure.reason,'TEAM_PAGINATION_CURSOR_LOOP');
 r=await recheck({token:'secret',fetchImpl:async u=>u.includes('/teams?')?response({teams:[team],pagination:{next:null}}):response({...project,id:'prj_other'})});assert.equal(r.failure.reason,'PINNED_PROJECT_ID_MISMATCH');assert.equal(r.passed,false);
});
test('workflow identity phase has no Supabase preflight and execution flags all false; other phases remain strict',()=>{
 const s=fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8');const caller=fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8');assert.match(caller,/hosted_vercel_identity/);assert.match(caller,/inputs.mode == 'hosted_vercel_identity' && 'vercel_identity'/);
 assert.match(s,/inputs.phase != 'vercel_audit' && inputs.phase != 'vercel_identity'/);const block=s.split('- name: Read only the pinned Vercel')[1].split('- name:')[0];assert.doesNotMatch(block,/SUPABASE|STRIPE/);assert.match(block,/if: inputs.phase == 'vercel_identity'/);
 const contract=s.match(/          case "\$PHASE" in\n([\s\S]*?)          esac/)[0];for(const phase of ['vercel_identity','preflight']){const out=execFileSync('bash',['-c',`PHASE=${phase}\n${contract}\nprintf '%s' "$DEPLOY/$MATRIX/$GATE/$RETARGET/$BROWSER/$CLINIC"`],{encoding:'utf8'});assert.equal(out,'false/false/false/false/false/false');}
 const condition=s.match(/if \[ "\$\{\{ inputs.phase \}\}" != "preflight" \] && \[ "\$\{\{ inputs.phase \}\}" != "vercel_identity" \]; then/)[0];for(const phase of ['deploy','full','accept','vercel_audit','unknown']){const code=condition.replaceAll('${{ inputs.phase }}',phase)+" echo strict; fi";assert.equal(execFileSync('bash',['-c',code],{encoding:'utf8'}).trim(),'strict');}
 assert.match(s,/require "scoped Vercel identity read" "\$O_VERCEL_IDENTITY"/);
});
