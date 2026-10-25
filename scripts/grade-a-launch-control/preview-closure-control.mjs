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
 'scripts/rcap-worker-identity-readonly.mjs',
 'scripts/rcap-worker-identity-readonly.test.mjs',
 'vercel.json',
 'scripts/grade-a-launch-control/require-preview-preparation.mjs',
 'scripts/rcap-hosted-acceptance-deploy.mjs',
 'scripts/rcap-hosted-acceptance-vercel-identity.mjs',
 'scripts/rcap-hosted-vercel-rest-transport.mjs',
 'scripts/rcap-hosted-vercel-rest-transport.test.mjs',
 'scripts/rcap-isolated-clinic-environment.test.mjs',
 'scripts/rcap-configured-sandbox-preview-contract.mjs',
 'scripts/rcap-configured-sandbox-preview.mjs',
 'scripts/rcap-configured-sandbox-preview.test.mjs',
 'scripts/rcap-hosted-existing-dtc-continuation.mjs',
 'scripts/rcap-hosted-existing-dtc-continuation.test.mjs',
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
// This correction changes executable verification only; the native admission
// remains evidence for its original control and never claims to test new bytes.
export const VERIFIER_CORRECTION_BASE='ad9c26cc9a4b34a04abc3d204a2c687e375cce57';
export const VERIFIER_CORRECTION_PATHS=[
 'scripts/verify-rcap-hosted-ms-clinic-preview.mjs',
 'scripts/grade-a-launch-control/preview-closure-control.mjs',
 'scripts/grade-a-launch-control/preview-verifier-correction.test.mjs',
];
export function prepareVerifierCorrection(root,{predecessorSha,sourceSha}){
 assert.equal(predecessorSha,VERIFIER_CORRECTION_BASE,'exact admitted verifier predecessor');
 assert.match(sourceSha,/^[a-f0-9]{40}$/);
 git(root,['merge-base','--is-ancestor',predecessorSha,sourceSha]);
 const changed=git(root,['diff','--no-renames','--name-only',predecessorSha,sourceSha]).split('\n').filter(Boolean).sort();
 assert.deepEqual(changed,[...VERIFIER_CORRECTION_PATHS].sort(),'exact three verification-only correction paths');
 const file=(sha,rel)=>{
  const entry=git(root,['ls-tree',sha,'--',rel]);
  if(!entry)return null;
  const mode=entry.split(' ')[0];assert.equal(mode,'100644','verification correction file mode');
  return {mode,sha256:hash(blob(root,sha,rel))};
 };
 const priorRecords=Object.fromEntries(records.map(rel=>[rel,hash(blob(root,predecessorSha,rel))]));
 for(const rel of records)assert.equal(hash(blob(root,sourceSha,rel)),priorRecords[rel],'source correction preserves complete predecessor records');
 return {schemaVersion:'rcap-clinic-verifier-correction/v1',predecessorSha,sourceSha,
  evidenceScope:'source-and-executable-verification-only; original native admission unchanged',
  predecessorRecordHashes:priorRecords,
  files:Object.fromEntries(changed.map(rel=>[rel,{before:file(predecessorSha,rel),after:file(sourceSha,rel)}]))};
}
function verifyVerifierCorrection(root,current){
 const v=current.verifierCorrection;if(!v)return new Set();
 assert.deepEqual(v,prepareVerifierCorrection(root,v),'exact verifier correction manifest');
 git(root,['merge-base','--is-ancestor',v.sourceSha,'HEAD']);
 for(const rel of records){
  const prior=JSON.parse(blob(root,v.predecessorSha,rel));
  assert.equal(prior.verifierCorrection,undefined,'one bounded verifier correction');
  assert.equal(prior.hostedAdmission?.runId,40236198602,'preserve original native admission');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,rel))),{...prior,verifierCorrection:v},'only verified correction appended to immutable predecessor records');
 }
 const allowed=new Set([...records,...VERIFIER_CORRECTION_PATHS]);
 const post=git(root,['diff','--no-renames','--name-only',v.predecessorSha,'HEAD']).split('\n').filter(Boolean);
 assert(post.every(rel=>allowed.has(rel)),'no unrelated committed corrective controller changes');
 assert.equal(git(root,['diff','--name-only','HEAD']),'','all corrective controller tracked inputs match HEAD');
 const untracked=git(root,['ls-files','--others','--exclude-standard','--','scripts','.github','src','data','hosted-acceptance-evidence']).split('\n').filter(Boolean);
 assert(untracked.length===0,'no untracked corrective controller inputs');
 assert.equal(git(root,['diff','--name-only',v.sourceSha,'HEAD','--',...VERIFIER_CORRECTION_PATHS]),'','corrected verifier HEAD remains frozen');
 assert.equal(git(root,['diff','--name-only','HEAD','--',...VERIFIER_CORRECTION_PATHS]),'','corrected verifier working bytes remain frozen');
 for(const rel of VERIFIER_CORRECTION_PATHS){
  assert.equal(fs.statSync(path.join(root,rel)).mode&0o111,0,'corrected verifier working mode');
  assert.equal(hash(fs.readFileSync(path.join(root,rel))),v.files[rel].after.sha256,'corrected verifier byte hash');
  assert.equal(git(root,['ls-tree','HEAD','--',rel]).split(' ')[0],v.files[rel].after.mode,'corrected verifier HEAD mode');
 }
 return new Set(VERIFIER_CORRECTION_PATHS);
}
export function verifyClosureControl(root,current){
 const c=current.closureControl;if(!c){assert.equal(current.verifierCorrection,undefined,'verifier correction requires original closure');return new Set();}
 const verified=verifyVerifierCorrection(root,current);
 assert.deepEqual(c,prepareClosureControl(root,c),'exact closure control manifest');git(root,['merge-base','--is-ancestor',c.sourceSha,'HEAD']);
 for(const rel of records){const prior=JSON.parse(blob(root,c.predecessorSha,rel));const now=JSON.parse(fs.readFileSync(path.join(root,rel)));assert.equal(prior.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(prior.hostedAdmission,null);assert.equal(prior.productionAuthorized,false);assert.deepEqual(now,{...prior,closureControl:c,hostedAdmission:current.hostedAdmission,...(current.verifierCorrection?{verifierCorrection:current.verifierCorrection}:{})},'only closure evidence and verified correction added to exact existing HELD records');}
 const drift=git(root,['diff','--name-only',c.sourceSha,'--','scripts','.github']).split('\n').filter(Boolean);
 assert(drift.every(rel=>verified.has(rel)),'no later unbound closure-control drift');
 for(const [rel,digest]of Object.entries(c.files))if(!verified.has(rel))assert.equal(hash(fs.readFileSync(path.join(root,rel))),digest,'frozen corrected control '+rel);
 return new Set([...Object.keys(c.files),...verified]);
}
