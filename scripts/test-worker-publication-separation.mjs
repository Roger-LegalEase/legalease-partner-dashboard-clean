import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createStaticWorkerAuthority, STATIC_AUTHORITY_PATH} from './lib/worker-static-authority.mjs';
import {createWorkerInputPlan,CANONICAL_WORKER_INPUTS,FIXED_FILE_INPUTS} from './rcap-hosted-acceptance-worker-input-plan.mjs';
const registry=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-registry.json'));
const observation=JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-observation-snapshot.json'));
const before=createStaticWorkerAuthority(registry,observation);
const r=structuredClone(registry),o=structuredClone(observation);
for(const record of r.records) {
 record.version+=1; record.history.push({syntheticPublicationOnly:true}); record.provider.imageDigest='sha256:'+'b'.repeat(64);
 if(record.evidenceBindings?.providerPublication) Object.assign(record.evidenceBindings.providerPublication,{publishedSourceSha:'2'.repeat(40),historicalImmutableRegistryDigest:record.provider.imageDigest,currentInputsEquivalent:true,state:'published_input_equivalent'});
 if(record.evidenceBindings?.provider) Object.assign(record.evidenceBindings.provider,{deliveryProviderEvidenceSha256:'c'.repeat(64),deliveryProvider:record.provider});
 o.routes[record.routeId].provider.imageDigest=record.provider.imageDigest;
 o.routes[record.routeId].externalPublication={sourceSha:'2'.repeat(40),evidenceSha256:'c'.repeat(64),immutableRegistryDigest:record.provider.imageDigest,workflowConclusion:'success'};
}
const after=createStaticWorkerAuthority(r,o); assert.deepEqual(after,before,'publication-only facts cannot change static worker authority');
const rootDir=fs.mkdtempSync(path.join(os.tmpdir(),'worker-publication-boundary-'));
try {
 const git=(...args)=>execFileSync('git',args,{cwd:rootDir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const write=(f,bytes)=>{fs.mkdirSync(path.dirname(path.join(rootDir,f)),{recursive:true});fs.writeFileSync(path.join(rootDir,f),bytes);};
 /*
  * The synthetic tree has to carry every CANONICAL_WORKER_INPUT.
  *
  * A canonical input the candidate does not have is a difference, so a fixture
  * missing one has `rebuildRequired` pinned true and every assertion below it
  * stops measuring anything. That is what happened when §7's supplemental
  * guides and the brand asset were added to the canonical list and this fixture
  * was not: the control went on running and stopped asking.
  *
  * Built from the list rather than restated, so the next input added to the
  * product appears here too instead of silently disabling this file again.
  */
 const files={'package.json':'{}','package-lock.json':'{}','tsconfig.json':'{}','scripts/rcap-render-worker.mjs':'export {};','scripts/lib/runtime.mjs':'export {};','src/runtime.ts':'export {};','deploy/rcap-render-worker/Dockerfile':`FROM node:22-slim\nCOPY ${STATIC_AUTHORITY_PATH} data/rcap-grade-a/\n`};
 for(const input of CANONICAL_WORKER_INPUTS) {
  if(Object.keys(files).some(f=>f===input||f.startsWith(input+'/')))continue;
  // A tree input needs a file inside it; a file input is itself. Which one it
  // is comes from the product's own FIXED_FILE_INPUTS, not from guessing at
  // the path's shape.
  files[FIXED_FILE_INPUTS.has(input)?input:`${input}/synthetic-input`]='synthetic\n';
 }
 for(const [f,bytes] of Object.entries(files))write(f,bytes);
 write(STATIC_AUTHORITY_PATH,JSON.stringify(before));
 git('init','--quiet');git('config','user.name','Synthetic boundary test');git('config','user.email','test@example.invalid');
 git('add','--',...Object.keys(files),STATIC_AUTHORITY_PATH);git('commit','--quiet','-m','pre-publication');const acceptedSourceSha=git('rev-parse','HEAD');
 const plan=()=>createWorkerInputPlan({rootDir,acceptedSourceSha,acceptedDigest:'sha256:'+'a'.repeat(64),candidateSha:git('rev-parse','HEAD')});
 const initial=plan();
 for(const kind of ['publication','acceptance']) {
  write(`data/rcap-render/${kind}.json`,JSON.stringify({syntheticReceipt:kind}));write(STATIC_AUTHORITY_PATH,JSON.stringify(after));
  git('add','--',`data/rcap-render/${kind}.json`,STATIC_AUTHORITY_PATH);git('commit','--quiet','-m',kind);
  assert.equal(plan().aggregateInputSha256,initial.aggregateInputSha256);assert.equal(plan().rebuildRequired,false);
 }
 const receiptFingerprint=plan().aggregateInputSha256;
 for(const f of ['src/runtime.ts','scripts/lib/runtime.mjs',STATIC_AUTHORITY_PATH]) {
  fs.appendFileSync(path.join(rootDir,f),'\n');git('add','--',f);git('commit','--quiet','-m','genuine runtime input changed');
  assert.equal(plan().rebuildRequired,true);assert.notEqual(plan().aggregateInputSha256,initial.aggregateInputSha256);
 }
 console.log(JSON.stringify({circularity:'PASS',syntheticFixtureFingerprintBefore:initial.aggregateInputSha256,syntheticFixtureFingerprintAfterPublicationAndAcceptance:receiptFingerprint,genuineRuntimeMutationsCaught:3}));
} finally {fs.rmSync(rootDir,{recursive:true,force:true});}
const docker=fs.readFileSync('deploy/rcap-render-worker/Dockerfile','utf8');
assert(docker.includes('COPY '+STATIC_AUTHORITY_PATH));
for(const f of ['worker-publication-evidence.json','fulfillment-authority-registry.json','fulfillment-observation-snapshot.json'])assert(!docker.split('\n').filter(l=>l.startsWith('COPY ')).join('\n').includes(f));
console.log('Actual Docker COPY excludes external publication, registry and observation; static authority retained.');
