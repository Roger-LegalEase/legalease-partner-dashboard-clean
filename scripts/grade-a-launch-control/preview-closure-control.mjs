// A bounded, explicitly authorized closure-only correction. Release identities
// and original HELD/predecessor records are retained, never regenerated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const CLOSURE_CONTROL_PATHS=[
 '.github/workflows/rcap-f1-ephemeral-staging.yml',
 'scripts/rcap-successor-nonproduction-closure.mjs',
 'scripts/grade-a-launch-control/verify-pinned-worker-successor.mjs',
 'scripts/grade-a-launch-control/preview-closure-contract.mjs',
 'scripts/grade-a-launch-control/preview-closure-contract.test.mjs',
 'scripts/grade-a-launch-control/preview-closure-control.mjs',
 'scripts/grade-a-launch-control/preview-closure-binding.test.mjs',
];
const records=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>`data/rcap-grade-a/launch-control/${n}.json`);
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const blob=(root,sha,rel)=>execFileSync('git',['show',`${sha}:${rel}`],{cwd:root,maxBuffer:64*1024*1024});
export function prepareClosureControl(root,{predecessorSha,sourceSha}){
 for(const sha of [predecessorSha,sourceSha])assert.match(sha,/^[a-f0-9]{40}$/);
 git(root,['merge-base','--is-ancestor',predecessorSha,sourceSha]);
 const changed=git(root,['diff','--name-only',predecessorSha,sourceSha]).split('\n').filter(Boolean);assert(changed.length>0&&changed.every(p=>CLOSURE_CONTROL_PATHS.includes(p)),'only authorized closure control correction');
 return {schemaVersion:'rcap-preview-closure-control/v1',predecessorSha,sourceSha,files:Object.fromEntries(changed.map(p=>[p,hash(blob(root,sourceSha,p))])),predecessorRecordHashes:Object.fromEntries(records.map(p=>[p,hash(blob(root,predecessorSha,p))]))};
}
export function verifyClosureControl(root,current){
 const c=current.closureControl;if(!c)return new Set();
 assert.deepEqual(c,prepareClosureControl(root,c),'exact closure control manifest');git(root,['merge-base','--is-ancestor',c.sourceSha,'HEAD']);
 for(const rel of records){const prior=JSON.parse(blob(root,c.predecessorSha,rel));const now=JSON.parse(fs.readFileSync(path.join(root,rel)));assert.equal(prior.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(prior.hostedAdmission,null);assert.equal(prior.productionAuthorized,false);assert.deepEqual(now,{...prior,closureControl:c,hostedAdmission:current.hostedAdmission},'only closure evidence added to exact existing HELD records');}
 assert.equal(git(root,['diff','--name-only',c.sourceSha,'--','scripts','.github']),'','no later closure-control drift');
 for(const [rel,digest]of Object.entries(c.files))assert.equal(hash(fs.readFileSync(path.join(root,rel))),digest,'frozen corrected control '+rel);
 return new Set(Object.keys(c.files));
}
