import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const records=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>`data/rcap-grade-a/launch-control/${n}.json`);
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
export const FROZEN_CONTROL_SURFACE=['scripts','.github'];
export function forwardExecutionPaths(candidate){
 const h=candidate.hostedAdmission,f=candidate.forwardProduction;
 return new Set([...records,...(h?.files??[]).map(r=>r.path),...(f?[f.ownerPath,...(f.owner.refusedAttempt?.files??[]).map(r=>r.path),...Object.values(f.receipts).flatMap(r=>r.files.map(x=>x.path))]:[])]);
}
// Current binding/owner validators remain mandatory at callers. This check
// additionally proves custody of all executable controls and bounded later data.
export function assertFrozenForwardExecution(root,candidate,{toolsSha,executionSha,requireOwner=true}){
 for(const sha of [toolsSha,executionSha])assert.match(sha??'',/^[a-f0-9]{40}$/,'exact tooling and execution SHAs');
 assert.equal(toolsSha,candidate.toolsSha,'frozen tooling identity');
 assert.equal(git(root,['rev-parse','HEAD']),executionSha,'actual workflow execution checkout');
 git(root,['merge-base','--is-ancestor',toolsSha,executionSha]);
 git(root,['merge-base','--is-ancestor',executionSha,'refs/remotes/origin/captain-release']);
 assert.equal(git(root,['diff','--name-only',toolsSha,executionSha,'--',...FROZEN_CONTROL_SURFACE]),'','zero frozen control drift');
 const allowed=forwardExecutionPaths(candidate);
 for(const rel of git(root,['diff','--name-only',toolsSha,executionSha]).split('\n').filter(Boolean))assert(allowed.has(rel),`unapproved execution path: ${rel}`);
 assert.equal(git(root,['diff','--name-only','HEAD','--',...FROZEN_CONTROL_SURFACE]),'','no uncommitted executable changes');
 const changed=git(root,['diff','--name-only','HEAD']).split('\n').filter(Boolean);assert.deepEqual(changed,[],'execution records must be committed');
 if(requireOwner){const f=candidate.forwardProduction;assert(f?.owner?.authorized===true,'current forward owner required');assert.equal(f.owner.toolsSha,toolsSha);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,f.ownerPath))),f.owner,'owner visible in actual execution checkout');}
 return {frozenToolsSha:toolsSha,workflowExecutionSha:executionSha,controlDrift:[]};
}
