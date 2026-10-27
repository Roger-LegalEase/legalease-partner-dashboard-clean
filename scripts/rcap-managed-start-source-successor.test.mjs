import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifyQualifiedWorkerForwardBinding} from './grade-a-launch-control/verify-qualified-worker-forward-binding.mjs';
import {requireManagedStartSourceSuccessorAdmission} from './grade-a-launch-control/require-preview-preparation.mjs';
import {SOURCE_SUCCESSOR_APP,SOURCE_SUCCESSOR_ALIAS,SOURCE_SUCCESSOR_PREDECESSOR,SOURCE_SUCCESSOR_PROTECTED,assertProtectedSourceDeployment,sourceSuccessorMetadata} from './rcap-managed-start-source-successor-contract.mjs';
const root=process.cwd(),head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
// Exact safe metadata retained from accepted687 creator native receipt cb3c58a30a6a43f7d1fce7521fba33ef6d3295446ba59912e6601fdba3212f35.
const native687={"id":"dpl_AnzeHuNodZ2MLanBbEfCWnPzhgpD","projectId":"prj_cdgwGzFqIHgEUlzEburSLaZETdQV","url":"legalease-partner-dashboard-clean-od4pzr02r-roger947s-projects.vercel.app","gitSource":{"sha":"68784f1d89c1f2120a7f4c385569f8918d1492d1"},"target":null,"readyState":"READY","meta":{"rcapWorkerSourceSha":"84a75b6e65dc69e6c371afac44f1284e0debf722","rcapWorkerDigest":"sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1","rcapWorkerInputFingerprint":"sha256:6d082ab7f7f07745a0e69a886fb59e9d396e3aa29233422a072b16edbd794cc2","rcapApplicationSha":"68784f1d89c1f2120a7f4c385569f8918d1492d1","rcapAcceptanceProjectRef":"hyflxnlhpmiqxvvcoiia","rcapPreviewPurpose":"managed_start","rcapClinicDemoMode":"none","rcapRouteState":"staging_scoped","rcapStagingScopeSha256":"da8d2556ebe1c462a3892d4f17799458724ab301a94323c1e1eccaca48aae038","rcapReturnOrigin":"https://legalease-rcap-managed-68784f1d89c1-roger947s-projects.vercel.app","rcapStripeConfigured":"false","rcapCatalogProduct":"inline","rcapOrdinaryGrantSha256":"9db1864b330945e3307a430a013328f9ec5a00ccfb2dee2bfec68dab8a780e40","rcapSponsoredChannel":"mississippi_preview","rcapManagedSourceSuccessor":"ordinary-program-native-trace-v2","rcapSourcePredecessor":"dpl_5F4mUgNDVuuooxcMou46C6SJPipX","rcapOnboardingLaunchPrepEnabled":"true","rcapLaunchStudioEnabled":"false"}};
test('source-qualified Preview binding is valid but grants no customer, worker or Production operation',()=>{
 const bound=verifyQualifiedWorkerForwardBinding(root,candidate);assert.equal(bound.bindingVerified,true,JSON.stringify(bound));assert.equal(bound.current,false);
 const args={phase:'managed_start_source_successor',applicationSha:SOURCE_SUCCESSOR_APP,toolsSha:candidate.toolsSha,workerSourceSha:candidate.workerSourceSha,workerDigest:candidate.workerDigest,workflowSourceSha:head};
 const admitted=requireManagedStartSourceSuccessorAdmission(root,args);assert.equal(admitted.previewOnly,true);assert.equal(admitted.current,false);assert.equal(admitted.productionAuthorized,false);assert.equal(admitted.deploymentAuthorized,false);
 assert.throws(()=>requireManagedStartSourceSuccessorAdmission(root,{...args,phase:'production'}));assert.throws(()=>requireManagedStartSourceSuccessorAdmission(root,{...args,workerDigest:'sha256:'+'0'.repeat(64)}));
});
test('all eight existing targets remain protected; actual687 metadata cannot be rewritten as the new Preview',()=>{
 assert.equal(SOURCE_SUCCESSOR_PROTECTED.length,8);assert.equal(new Set(SOURCE_SUCCESSOR_PROTECTED.map(v=>v.id)).size,8);assert(SOURCE_SUCCESSOR_PROTECTED.some(v=>v.id==='dpl_5F4mUgNDVuuooxcMou46C6SJPipX'));
 const known=SOURCE_SUCCESSOR_PROTECTED.find(v=>v.id===native687.id);assert(known);assert.equal(SOURCE_SUCCESSOR_PREDECESSOR.id,native687.id);assertProtectedSourceDeployment(native687,known,()=>native687.meta.rcapReturnOrigin);
 for(const patch of [{target:'production'},{meta:{...native687.meta,rcapWorkerDigest:'sha256:'+'0'.repeat(64)}},{gitSource:{sha:SOURCE_SUCCESSOR_APP}}])assert.throws(()=>assertProtectedSourceDeployment({...native687,...patch},known,()=>''));
 assert.notEqual(SOURCE_SUCCESSOR_ALIAS,new URL(native687.meta.rcapReturnOrigin).hostname);const meta=sourceSuccessorMetadata('https://'+SOURCE_SUCCESSOR_ALIAS);assert.equal(meta.rcapSourcePredecessor,native687.id);assert.equal(meta.rcapWorkerDigest,native687.meta.rcapWorkerDigest);assert.equal(meta.rcapStripeConfigured,'false');
});
test('altered publication compatibility evidence is refused by exact source-bound controls',()=>{
 const file='data/rcap-grade-a/launch-control/QUALIFIED_WORKER_PUBLICATION_COMPATIBILITY.json',original=fs.readFileSync(file);
 try{const altered=JSON.parse(original);altered.staticWorkerAuthority.sha256='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(altered));assert.equal(verifyQualifiedWorkerForwardBinding(root,candidate).bindingVerified,false);}finally{fs.writeFileSync(file,original);}
 assert.equal(verifyQualifiedWorkerForwardBinding(root,candidate).bindingVerified,true);
});
