import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {NORMAL_RECOVERY as P,admitActualNormalRecovery,requireNormalRecoveryAdmission,ordinaryProfileApplication} from './ordinary-normal-recovery-profile.mjs';
import {QUALIFIED_WORKER_IMAGE as Q} from './worker-once-preparation/qualified-worker-image.mjs';
import {ORDINARY,requireOriginalStartSourceReady} from './rcap-hosted-ordinary-full-admission.mjs';
import {assertOrdinaryAdmission} from './rcap-hosted-ordinary-participant.mjs';
import {validateTarget} from './worker-once-preparation/ordinary-worker-once.mjs';
import {createOrdinaryWorkerBinding} from './worker-once-preparation/ordinary-worker-binding.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=x=>Buffer.from(JSON.stringify(x));
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
test('closed normal recovery profile: synthetic outcome witnesses, historical failure/identity/forged proof refusals; no provider operations',async()=>{
 const binding=JSON.parse(execFileSync('git',['show','cd32bb9b2fa7156c7bebe10190e051774d85b233:scripts/ordinary-full-normal-recovery-binding.json']));
 assert.equal(binding.actualNormalRecoverySucceeded,null);assert.throws(()=>admitActualNormalRecovery({binding,files:{}}));const current=JSON.parse(fs.readFileSync(new URL('./ordinary-full-normal-recovery-binding.json',import.meta.url)));if(current.actualNormalRecoverySucceeded===true)assert.equal(ORDINARY,P);else{assert.throws(requireOriginalStartSourceReady);assert.equal(ORDINARY.app,'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a');}
 const proofFile=name=>execFileSync('git',['show',`899724a07cd33566a1e0dc104a052a273eb68b04:data/rcap-grade-a/launch-control/ordinary-normal-launch-recovery/${name}`]);
 const files={baselinePoststate:proofFile('baseline-poststate.json'),baselineJournal:proofFile('baseline-journal.json'),previewC:proofFile('preview-c.json'),compatibilityC:proofFile('worker-compatibility-c.json')};
 const old=JSON.parse(files.baselinePoststate).poststate,now=structuredClone(old);Object.assign(now,{workspace:{...old.workspace,status:'live',launched:true},launchPreparedCount:2,launchReceiptCount:7,launchCompleteCount:1});
 const spent='d8a07a4e-3f5c-49fb-b8ad-5e2c892ce38c',snapshotHash='a'.repeat(64),common={applicationSha:P.app,requestId:P.requestId,participantVerificationAllowed:false};
 Object.assign(files,{
  before:bytes({...common,stage:'new_normal_launch_before_forward',spentOriginalRequestId:spent,snapshotHash,payloadHash:sha(bytes({requestId:P.requestId,snapshotHash,confirmed:true})),originalJournalSha256:sha(bytes(stable(JSON.parse(files.baselineJournal))))}),
  response:bytes({...common,stage:'new_normal_launch_response',httpStatus:200,success:true,complete:true,operationId:'11111111-1111-4111-8111-111111111111'}),
  poststate:bytes({...common,stage:'new_normal_launch_poststate',poststate:now,poststateReadSucceeded:true,originalJournalReadSucceeded:true,originalJournalUnchanged:true}),
  result:bytes({...common,status:'normal_launch_recovery_complete_stop',spentOriginalRequestId:spent,deploymentId:P.deploymentId}),
  run:bytes({workflow_id:332448793,head_sha:'b'.repeat(40),head_branch:'codex/f-vercel-raw-readonly-20261026',event:'workflow_dispatch',run_attempt:1,status:'completed',conclusion:'success',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},id:123}),
  outcomeC:bytes({mockOnly:true,actualRuntimeAuthority:false})
 });
 Object.assign(binding,{actualNormalRecoverySucceeded:true,recoveryRunId:123,recoveryCarrierSha:'b'.repeat(40),actualNormalRecoveryCAcceptanceSha256:sha(files.outcomeC)});for(const[k,v]of Object.entries(files))binding.files[k].sha256=sha(v);
 const admission=admitActualNormalRecovery({binding,files});assert.equal(requireNormalRecoveryAdmission(admission),admission);assertOrdinaryAdmission(admission,P.origin,P);assert.equal(ordinaryProfileApplication(Q,P),P.app);assert.equal(ordinaryProfileApplication(Q), 'ed8d0902a99c5326f75987a942eb507b6cfb16cf');assert.equal(ordinaryProfileApplication(),'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a');
 const checkMutation=(key,mutate)=>{const f={...files},v=JSON.parse(f[key]);mutate(v);f[key]=bytes(v);const b=structuredClone(binding);b.files[key].sha256=sha(f[key]);assert.throws(()=>admitActualNormalRecovery({binding:b,files:f}));};
 checkMutation('response',v=>v.httpStatus=503);checkMutation('before',v=>v.requestId=spent);checkMutation('before',v=>v.snapshotHash='c'.repeat(64));checkMutation('poststate',v=>v.originalJournalUnchanged=false);checkMutation('poststate',v=>v.poststate.launchPreparedCount=1);checkMutation('poststate',v=>v.poststate.ordinaryRegistrationCount=2);checkMutation('run',v=>v.head_sha='c'.repeat(40));
 const scope=proofFile('recovery-admission-c.json'),b=structuredClone(binding);b.files.outcomeC.sha256=b.actualNormalRecoveryCAcceptanceSha256=sha(scope);assert.throws(()=>admitActualNormalRecovery({binding:b,files:{...files,outcomeC:scope}}));
 assert.throws(()=>requireNormalRecoveryAdmission({...admission}));assert.throws(()=>assertOrdinaryAdmission({...admission},P.origin,P));assert.throws(()=>ordinaryProfileApplication(Q,{...P}));assert.throws(()=>ordinaryProfileApplication(undefined,P));
 const UUID='11111111-1111-4111-8111-111111111111',target={...Object.fromEntries(['jobId','packetId','itemId','ownerId','sessionId','personId','matterId','entitlementId'].map(k=>[k,UUID])),verificationHash:snapshotHash,inputHash:snapshotHash,protectedReceiptSha256:snapshotHash,packetNamespace:'expungement-ai-consumer',partnerSlug:P.slug,clinicEventId:null,acquisitionMode:'partner',applicationSha:P.app,rendererKind:'packet_document_v1'};
 validateTarget(target,Q,P);assert.throws(()=>validateTarget(target,Q));assert.throws(()=>validateTarget(target,undefined,P));
 let commands=0;const worker=createOrdinaryWorkerBinding({env:{},runId:'123',identity:Q,profile:P,assertSourceTarget:async()=>({...admission}),assertContinuousWindow:async()=>{},queryRows:async()=>{throw Error('NO_QUERY');},checkpoint:async()=>{},runCommand:()=>{commands++;throw Error('NO_DOCKER');}});await assert.rejects(worker.verifyPreparedImageBeforeVerify());assert.equal(commands,0);
});
