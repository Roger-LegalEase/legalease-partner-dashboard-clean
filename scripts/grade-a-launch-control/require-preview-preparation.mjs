// A HELD tuple can create only its acceptance Preview. It is not CURRENT and
// cannot authorize production, acceptance writes, payments, or worker claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
import {CANDIDATE} from './verify-pinned-worker-successor.mjs';
export function requireHeldPreviewAdmission(root,inputs){
 const candidate=JSON.parse(fs.readFileSync(root+'/'+CANDIDATE));
 const fields=['schemaVersion','status','applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha','publication','readOnlyImageAcceptance','runtimeAccepted','workerRebuildRequired','previewExecution','resume','productionAuthorized','productionAuthorization','deploymentAuthorized','clinicDispatchReady','hostedAdmission','releaseBaseSha','supersededRecord','supersededRecordSha256'];
 assert.deepEqual(Object.keys(candidate).sort(),fields.sort(),'exact HELD Preview record; unknown permissions refused');
 assert.equal(candidate.status,'FORWARD_BOUND_HOSTED_PENDING','exact HELD Preview state');
 assert.equal(inputs.phase,'replace_preview','HELD permission is Preview creation only');
 assert.equal(candidate.productionAuthorized,false);assert.equal(candidate.productionAuthorization,null);assert.equal(candidate.deploymentAuthorized,false);assert.equal(candidate.hostedAdmission,null);
 assert.equal(candidate.runtimeAccepted,true);assert.equal(candidate.workerRebuildRequired,false);
 for(const key of ['applicationSha','workerSourceSha','workerDigest','toolsSha'])assert.equal(inputs[key],candidate[key],'exact Preview '+key);
 const result=verifyReleaseCandidateBinding(root,candidate);
 assert.equal(result.current,false);assert.equal(result.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(result.bindingVerified,true,JSON.stringify(result));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 assert.equal(inputs.workflowSourceSha,git(['rev-parse','HEAD']));git(['merge-base','--is-ancestor',candidate.toolsSha,inputs.workflowSourceSha]);assert.equal(git(['diff','--name-only',candidate.toolsSha,inputs.workflowSourceSha,'--','scripts','.github']),'','Preview executes exact frozen controls');
 // Return only Preview identity, never the record or inherited permissions.
 return Object.freeze({...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(key=>[key,candidate[key]])),current:false,previewOnly:true,productionAuthorized:false,deploymentAuthorized:false});
}
export const requirePreviewPreparation=requireHeldPreviewAdmission;
// The transport serves existing CURRENT Preview operations as well. Only the
// exact pending state may use the separate HELD gate; other states retain the
// normal CURRENT requirement, including its real-time freshness check.
export function loadPreviewTransportIdentity(root){
 const candidate=JSON.parse(fs.readFileSync(root+'/'+CANDIDATE));
 if(candidate.status!=='FORWARD_BOUND_HOSTED_PENDING')return requireCurrentReleaseCandidate(root);
 const env=process.env;
 const supplied=env.PHASE_INPUT!==undefined;
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 return requireHeldPreviewAdmission(root,{phase:supplied?env.PHASE_INPUT:'replace_preview',applicationSha:supplied?env.APPLICATION_SHA_INPUT:candidate.applicationSha,workerSourceSha:supplied?env.WORKER_SOURCE_SHA_INPUT:candidate.workerSourceSha,workerDigest:supplied?env.WORKER_DIGEST_INPUT:candidate.workerDigest,toolsSha:supplied?env.TOOLS_SHA_INPUT:candidate.toolsSha,workflowSourceSha:supplied?env.GITHUB_SHA:git(['rev-parse','HEAD'])});
}
if(process.argv[1]?.endsWith('/require-preview-preparation.mjs')){
 const result=requirePreviewPreparation(process.cwd(),{phase:process.env.PHASE_INPUT,applicationSha:process.env.APPLICATION_SHA_INPUT,workerSourceSha:process.env.WORKER_SOURCE_SHA_INPUT,workerDigest:process.env.WORKER_DIGEST_INPUT,toolsSha:process.env.TOOLS_SHA_INPUT,workflowSourceSha:process.env.GITHUB_SHA});
 console.log(JSON.stringify({applicationSha:result.applicationSha,workerSourceSha:result.workerSourceSha,workerDigest:result.workerDigest,toolsSha:result.toolsSha,current:result.current,previewOnly:result.previewOnly,productionAuthorized:result.productionAuthorized}));
}
