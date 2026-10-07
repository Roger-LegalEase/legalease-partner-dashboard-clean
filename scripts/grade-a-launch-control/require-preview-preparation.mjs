// A HELD tuple can create only its acceptance Preview. It is not CURRENT and
// cannot authorize production, acceptance writes, payments, or worker claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
import {CANDIDATE} from './verify-pinned-worker-successor.mjs';
export function requirePreviewPreparation(root,inputs){
 const candidate=JSON.parse(fs.readFileSync(root+'/'+CANDIDATE));
 const result=verifyReleaseCandidateBinding(root,candidate);
 if(!result.current){assert.equal(inputs.phase,'replace_preview','HELD permission is Preview creation only');assert.equal(result.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(result.bindingVerified,true);assert.equal(candidate.productionAuthorized,false);assert.equal(candidate.productionAuthorization,null);assert.equal(candidate.hostedAdmission,null);}
 else requireCurrentReleaseCandidate(root);
 for(const key of ['applicationSha','workerSourceSha','workerDigest','toolsSha'])assert.equal(inputs[key],candidate[key],'exact Preview '+key);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 assert.equal(inputs.workflowSourceSha,git(['rev-parse','HEAD']));git(['merge-base','--is-ancestor',candidate.toolsSha,inputs.workflowSourceSha]);assert.equal(git(['diff','--name-only',candidate.toolsSha,inputs.workflowSourceSha,'--','scripts','.github']),'','Preview executes exact frozen controls');
 return {...candidate,current:result.current,previewOnly:!result.current};
}
if(process.argv[1]?.endsWith('/require-preview-preparation.mjs')){
 const result=requirePreviewPreparation(process.cwd(),{phase:process.env.PHASE_INPUT,applicationSha:process.env.APPLICATION_SHA_INPUT,workerSourceSha:process.env.WORKER_SOURCE_SHA_INPUT,workerDigest:process.env.WORKER_DIGEST_INPUT,toolsSha:process.env.TOOLS_SHA_INPUT,workflowSourceSha:process.env.GITHUB_SHA});
 console.log(JSON.stringify({applicationSha:result.applicationSha,workerSourceSha:result.workerSourceSha,workerDigest:result.workerDigest,toolsSha:result.toolsSha,current:result.current,previewOnly:result.previewOnly,productionAuthorized:result.productionAuthorized}));
}
