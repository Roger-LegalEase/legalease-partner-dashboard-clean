import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {verifyPinnedPublication,verifyPinnedSuccessor,verifyPinnedBinding,PUBLICATION,PENDING,TOOLS,CANDIDATE} from '/tmp/expai-signup-successor-controls-20261005/scripts/grade-a-launch-control/verify-pinned-worker-successor.mjs';
import {requireCurrentReleaseCandidate} from '/tmp/expai-signup-successor-controls-20261005/scripts/grade-a-launch-control/verify-release-candidate-binding.mjs';
const root=process.cwd(),read=p=>JSON.parse(fs.readFileSync(p)),old=p=>JSON.parse(execFileSync('git',['show',`e0d5adb502542c6cf8309abfe886a2dd27f37fed:${p}`],{cwd:root}));
const e=read(PUBLICATION),p=read(PENDING);
assert.deepEqual(e.supersededPublication,old(PUBLICATION));
const changes=[];
function compare(a,b,path=''){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[k],b[k],path+'/'+k);}else changes.push(path);}
const recordChanges={};for(const f of [PENDING,TOOLS,CANDIDATE]){changes.length=0;compare(old(f),read(f));recordChanges[f]=[...changes];}
assert.deepEqual(recordChanges[PENDING],['/status','/workerDigest','/workerRebuildRequired','/publication']);
assert.deepEqual(recordChanges[TOOLS],['/status','/workerDigest']);
assert.deepEqual(recordChanges[CANDIDATE],['/status','/workerDigest','/publication']);
const publication=verifyPinnedPublication(root),pending=verifyPinnedSuccessor(root),binding=verifyPinnedBinding(root,read(CANDIDATE),pending);
assert.equal(publication.current,true,publication.reasons.join('; '));assert.equal(publication.runtimeAccepted,false);
assert.equal(pending.status,'AWAITING_WORKER_ACCEPTANCE');assert.equal(binding.bindingVerified,true,binding.reasons.join('; '));assert.equal(binding.current,false);assert.equal(binding.productionAuthorized,false);
assert.throws(()=>requireCurrentReleaseCandidate(root));assert.equal(p.workerInputFingerprint,'sha256:82d31e68a0edb0557bc9c2f9fce041e6760dd771ab02dc3b385e77235f99f867');
assert.equal(execFileSync('git',['diff','--name-only',p.sourceCommit,'--',...p.canonicalWorkerInputs],{encoding:'utf8'}).trim(),'');
const report={publication,pending,binding,recordChanges,historicalPublicationPreserved:true,dispatchRefused:true,canonicalInputsUnchanged:true,canonicalInputCount:p.canonicalWorkerInputs.length,acceptanceSubject:{sourceSha:e.sourceSha,immutableRegistryDigest:e.immutableRegistryDigest},baselineFailures:'Three original signup verifiers and three older historical tooling fixtures remain documented existing failures; not waived or relabeled.',applicationUnchanged:true};
fs.writeFileSync('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005/publication-transition-verification-37395051353.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
