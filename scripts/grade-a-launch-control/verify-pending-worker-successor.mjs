// A commit cannot contain its own SHA. The source pointer is the exact Git
// commit which introduced this pending record, resolved through Git history;
// the recorded parent, exact delta and fingerprints make it non-floating.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createWorkerInputPlan,aggregateCanonicalInputs} from '../rcap-hosted-acceptance-worker-input-plan.mjs';
export const PENDING='data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json';
export function verifyPendingWorkerSuccessor(root){
 const file=path.join(root,PENDING);if(!fs.existsSync(file))return null;
 const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
 const p=JSON.parse(fs.readFileSync(file));assert.equal(p.status,'AWAITING_WORKER_PUBLICATION');assert.equal(p.sourceCommit,'commit-introducing-this-record');assert.equal(p.parent,'dc5124f99565baac004f1260e351209a4518ccf1');assert.equal(p.workerRebuildRequired,true);assert.equal(p.publication,'pending');assert.equal(p.acceptance,'pending');assert.equal(p.previewExecution,'held');assert.equal(p.productionAuthorized,false);assert.equal(p.workerDigest,null);
 const source=git(['log','-1','--format=%H','--',PENDING]);
 const committed=Boolean(source);if(committed){assert.equal(git(['rev-parse',`${source}^`]),p.parent);assert.equal(git(['rev-parse','HEAD']),source,'pending source must be exact HEAD');assert.equal(git(['status','--porcelain']), '','pending source must remain clean');assert.equal(git(['show',`${source}:${PENDING}`]),fs.readFileSync(file,'utf8').trim());}
 else assert.equal(git(['rev-parse','HEAD']),p.parent);
 for(const [rel,digest]of Object.entries(p.files)){assert.match(rel,/^(src\/|scripts\/)/);assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),digest,rel);}
 const changes=git(['diff','--name-only',p.parent]).split('\n').filter(Boolean);const untracked=git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);const committedChanges=committed?git(['diff','--name-only',p.parent,source]).split('\n').filter(Boolean):[];
 const expected=[...Object.keys(p.files),PENDING].sort();assert.deepEqual([...new Set([...changes,...untracked,...committedChanges])].sort(),expected,'exact pending change set');
 assert.equal(p.historicalWorker.sourceSha,'6ebacdcde8afdf8aa706f16b38e0646babcbdc49');assert.equal(p.historicalWorker.digest,'sha256:74b82e11aac7fa1f850ca52ba1344ca7853fa09120374a83ddb5bbc019f8cdd7');assert.equal(p.historicalWorker.fingerprint,'sha256:c202ebba08c34ce3665f69269fb913078b02188519c5196af7f3639da84dd0d8');
 const historical=createWorkerInputPlan({rootDir:root,acceptedSourceSha:p.historicalWorker.sourceSha,acceptedDigest:p.historicalWorker.digest,candidateSha:p.historicalWorker.sourceSha});assert.equal(historical.canonicalInputs.length,39);assert.deepEqual(p.canonicalWorkerInputs,historical.canonicalInputs);assert.equal(historical.aggregateInputSha256,p.historicalWorker.fingerprint);
 const tree=committed?source:git(['write-tree']);const fingerprint=aggregateCanonicalInputs(root,tree,historical.canonicalInputs);assert.equal(fingerprint,p.workerInputFingerprint);
 const workerChanged=git(['diff','--name-only',p.historicalWorker.sourceSha,tree,'--',...historical.canonicalInputs]).split('\n').filter(Boolean).sort();assert.deepEqual(workerChanged,p.workerChangedPaths);assert.deepEqual(workerChanged,['src/app/briefcase/[packetId]/page.tsx','src/components/expungement-ai/BriefcaseViews.tsx','src/lib/rcap/render/packet-delivery.ts']);
 const appChanged=git(['diff','--name-only',p.parent,tree,'--','src']).split('\n').filter(Boolean).sort();assert.deepEqual(appChanged,['src/app/briefcase/[packetId]/page.tsx','src/components/expungement-ai/BriefcaseViews.tsx','src/lib/rcap/render/packet-delivery.ts']);
 if(committed){const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:p.historicalWorker.sourceSha,acceptedDigest:p.historicalWorker.digest,candidateSha:source});assert.equal(plan.aggregateInputSha256,p.workerInputFingerprint);assert.equal(plan.rebuildRequired,true);}
 return {current:false,status:committed?'AWAITING_WORKER_PUBLICATION':'LOCAL_SUCCESSOR_AWAITING_COMMIT',applicationSha:source||null,workerSourceSha:source||null,workerInputFingerprint:fingerprint,workerRebuildRequired:true,workerDigest:null,reasons:['Successor source requires its own publication and read-only image acceptance. Preview/resume execution held. Historical candidate and digest are prior evidence only.']};
 }catch(e){return {current:false,status:'INVALID_PENDING_PUBLICATION',reasons:[e.message]};}
}
