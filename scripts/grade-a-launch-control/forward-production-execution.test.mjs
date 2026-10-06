import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertFrozenForwardExecution} from './forward-production-execution.mjs';
import {assertForwardOwner,assertForwardPhase,forwardOwnerNote,forwardAuthorization,FORWARD_PHASES} from './verify-forward-production-successor.mjs';
import {requireProductionReleaseTuple} from '../rcap-production-migration-contract.mjs';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-execution-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 git('init','-q');git('config','user.email','offline@example.invalid');git('config','user.name','offline fixture');
 const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),typeof v==='string'?v:JSON.stringify(v));};
 const commit=()=>{git('add','--','scripts','.github','src','data','hosted-acceptance-evidence');git('commit','-qm','offline fixture');return git('rev-parse','HEAD');};
 write('scripts/control.mjs','frozen');write('.github/workflows/control.yml','frozen');write('src/application.ts','frozen');write('hosted-acceptance-evidence/successor-closure/123/admission.json',{});
 const held={applicationSha:'a'.repeat(40),workerSourceSha:'b'.repeat(40),workerDigest:'sha256:'+'c'.repeat(64),workerInputFingerprint:'sha256:'+'d'.repeat(64),productionAuthorized:false,productionAuthorization:null,hostedAdmission:{deploymentId:'dpl_Staged',productionRollback:'dpl_Rollback',runId:123,capturedAt:new Date(Date.now()-60000).toISOString(),productionAliases:[],files:[{path:'hosted-acceptance-evidence/successor-closure/123/admission.json'}]}};
 const record='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';write(record,held);const toolsSha=commit();held.toolsSha=toolsSha;
 const owner={schemaVersion:'rcap-forward-owner-authorization/v1',authorized:true,recordedBy:'Roger Roman',recordedAt:new Date(Date.now()-1000).toISOString(),productionProjectRef:'wwtwtsmywnckfkdaqqeg',...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,held[k]])),stagedDeploymentId:'dpl_Staged',rollbackDeploymentId:'dpl_Rollback',productionAliases:[],hostedRunId:123,phases:FORWARD_PHASES,maxActivationAttempts:1,maxPublicVerificationAttempts:1,note:forwardOwnerNote(held)};
 const ownerPath='data/rcap-grade-a/launch-control/forward-owner/offline.json';write(ownerPath,owner);
 const candidate={...held,productionAuthorized:true,productionProjectRef:owner.productionProjectRef,forwardProduction:{ownerPath,owner,receipts:{},states:{activation:'authorized_not_executed',publicVerification:'authorized_not_executed'}},productionAuthorization:forwardAuthorization(owner)};
 write(record,candidate);const executionSha=commit();git('update-ref','refs/remotes/origin/captain-release',executionSha);
 const check=(c=candidate,e={toolsSha,executionSha})=>assertFrozenForwardExecution(root,c,e);
 return {root,git,write,commit,held,candidate,toolsSha,executionSha,check,owner,record,ownerPath};
}
test('later committed owner execution reads exact phase authority without redefining admitted tooling',t=>{const f=fixture(t);assert.notEqual(f.toolsSha,f.executionSha);assert.deepEqual(f.check().controlDrift,[]);const c=JSON.parse(fs.readFileSync(path.join(f.root,f.record)));assertForwardOwner(c.forwardProduction.owner,f.held);assertForwardPhase(c,f.held,'smoke');requireProductionReleaseTuple(c,c,{RCAP_APPLICATION_SHA:c.applicationSha,RCAP_WORKER_SOURCE_SHA:c.workerSourceSha,RCAP_WORKER_DIGEST:c.workerDigest,RCAP_PRODUCTION_PROJECT_REF:c.productionProjectRef,RCAP_TOOLS_SHA:f.toolsSha,GITHUB_SHA:f.executionSha});});
for(const rel of ['.github/workflows/control.yml','scripts/control.mjs','scripts/new-control.mjs','src/application.ts','data/unrelated.json','data/record-clearing/legal-decisions/unapproved.json'])test(`execution refuses post-freeze ${rel}`,t=>{const f=fixture(t);f.write(rel,'changed');const e=f.commit();f.git('update-ref','refs/remotes/origin/captain-release',e);assert.throws(()=>f.check(f.candidate,{toolsSha:f.toolsSha,executionSha:e}));});
test('execution refuses nonancestor tools',t=>{const f=fixture(t);f.git('checkout','--orphan','unrelated');f.write('scripts/control.mjs','unrelated');const other=f.commit();f.git('checkout','--detach',f.executionSha);const c=structuredClone(f.candidate);c.toolsSha=other;c.forwardProduction.owner.toolsSha=other;assert.throws(()=>f.check(c,{toolsSha:other,executionSha:f.executionSha}));});
test('execution refuses outside captain ancestry',t=>{const f=fixture(t);f.git('update-ref','refs/remotes/origin/captain-release',f.toolsSha);assert.throws(()=>f.check());});
test('execution refuses missing owner',t=>{const f=fixture(t);const c=structuredClone(f.candidate);delete c.forwardProduction;assert.throws(()=>f.check(c));});
test('execution refuses wrong tooling and execution identities',t=>{const f=fixture(t);assert.throws(()=>f.check(f.candidate,{toolsSha:f.executionSha,executionSha:f.executionSha}));assert.throws(()=>f.check(f.candidate,{toolsSha:f.toolsSha,executionSha:f.toolsSha}));assert.throws(()=>f.check(f.candidate,{toolsSha:'bad',executionSha:f.executionSha}));});
test('execution refuses reused historical owner decision',t=>{const f=fixture(t);const c=structuredClone(f.candidate);c.forwardProduction.owner.recordedAt='2026-09-20T00:00:00.000Z';assert.throws(()=>assertForwardOwner(c.forwardProduction.owner,f.held));});
for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint'])test(`execution phase refuses changed ${key}`,t=>{const f=fixture(t);const c=structuredClone(f.candidate);c.forwardProduction.owner[key]='wrong';assert.throws(()=>assertForwardPhase(c,f.held,'smoke'));});
test('historical release retains tools/execution equality',t=>{const f=fixture(t);const c={...f.candidate};delete c.forwardProduction;assert.throws(()=>requireProductionReleaseTuple(c,c,{RCAP_APPLICATION_SHA:c.applicationSha,RCAP_WORKER_SOURCE_SHA:c.workerSourceSha,RCAP_WORKER_DIGEST:c.workerDigest,RCAP_PRODUCTION_PROJECT_REF:c.productionProjectRef,RCAP_TOOLS_SHA:f.toolsSha,GITHUB_SHA:f.executionSha}));});

test('execution refuses authorization absent from actual committed checkout',t=>{const f=fixture(t);fs.unlinkSync(path.join(f.root,f.ownerPath));const e=f.commit();f.git('update-ref','refs/remotes/origin/captain-release',e);assert.throws(()=>f.check(f.candidate,{toolsSha:f.toolsSha,executionSha:e}));});
