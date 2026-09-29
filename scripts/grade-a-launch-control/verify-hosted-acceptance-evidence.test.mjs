import {requireProductionPhaseAuthorization,requireProductionDeploymentBinding} from '../rcap-production-migration-contract.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {RECEIPTS,receiptPaths,loadHostedDocuments,validateHostedDocuments,verifyHostedAcceptanceEvidence} from './verify-hosted-acceptance-evidence.mjs';

test('native hosted receipts prove full delivery and supplementary exact browser return',()=>{
 const evidence=verifyHostedAcceptanceEvidence(process.cwd());
 assert.equal(evidence.journeys.length,2);
 assert.equal(evidence.journeys[0].exactBrowserReturn,false,'retain original full-run browser ambiguity');
 assert.equal(evidence.journeys[1].exactBrowserReturn,true);
 assert.equal(evidence.naturalDelivery.targetJobId,'916e559e-5daa-4b38-9a7b-0b9875ff1c59');
 assert.equal(evidence.manualHostedFullReady,false,'acceptance grants no dispatch authority');
});

test('semantic mutations refuse after immutable-byte gate, not merely on hash mismatch',()=>{
 const r=RECEIPTS[1],original=loadHostedDocuments(process.cwd(),r);
 const mutations=[
  ['wrong run',d=>d.run.id++],['failed run',d=>d.run.conclusion='failure'],['incomplete run',d=>d.run.status='in_progress'],
  ['wrong phase',d=>d.run.display_title=d.run.display_title.replace('hosted_payment','hosted_full')],
  ['wrong tools',d=>d.run.head_sha='0'.repeat(40)],['wrong workflow',d=>d.run.path='other.yml'],
  ['artifact ID',d=>d.artifact.id++],['artifact digest',d=>d.artifact.digest='sha256:'+'0'.repeat(64)],
  ['artifact run',d=>d.artifact.workflow_run.id++],['artifact tools',d=>d.artifact.workflow_run.head_sha='0'.repeat(40)],
  ['failed hosted job',d=>d.jobs.jobs.find(j=>j.name.startsWith('Persistent hosted acceptance staging /')).conclusion='failure'],
  ['incomplete payment step',d=>d.jobs.jobs.find(j=>j.name.startsWith('Persistent hosted acceptance staging /')).steps.find(s=>s.number===63).conclusion='skipped'],
  ...[
   ['application',p=>p.applicationSha='0'.repeat(40)],['project',p=>p.acceptanceProjectRef='other'],
   ['payment deployment',p=>p.previewDeploymentId='dpl_other'],['origin',p=>p.previewUrl='https://example.test'],
   ['settled without browser',p=>p.hostedCheckoutCompletion.completed=false],['challenge',p=>p.hostedCheckoutCompletion.humanInteractionRequired=true],
   ['no worker',p=>delete p.worker],['wrong worker digest',p=>p.worker.immutableDigest='sha256:'+'0'.repeat(64)],
   ['wrong target',p=>p.targetJourney.targetJobId='other'],['unfinalized worker',p=>p.worker.cycleResult.outcome='queued'],
   ['invalid PDF',p=>p.worker.validation.ok=false],['no artifact',p=>p.artifactPath=null],
   ['wrong delivery bytes',p=>p.delivery.ownerByteCount++],['wrong PDF hash',p=>p.delivery.ownerSha256='0'.repeat(64)],
   ['no owner delivery',p=>p.delivery.owner=403],['stranger admitted',p=>p.delivery.stranger=200],
   ['anonymous admitted',p=>p.delivery.anonymous=200],['replay moved',p=>p.replay.after.entitlements++],
   ['replay wrong target',p=>p.replay.scopedTo.targetJobId='other'],['duplicate Checkout',p=>p.resumedCompletedOrder.sessionsAfter.total++]
  ].map(([n,f])=>[n,d=>f(d.body['payment.json'])]),
  ...[
   ['deployment',p=>p.deploymentId='dpl_other'],['hostname',p=>p.hostname='example.test'],['not READY',p=>p.readyState='ERROR'],
   ['worker source',p=>p.workerBinding.rcapWorkerSourceSha='0'.repeat(40)],['worker fingerprint',p=>p.workerBinding.rcapWorkerInputFingerprint='sha256:'+'0'.repeat(64)],
   ['preview project',p=>p.acceptanceProjectRef='other']
  ].map(([n,f])=>[n,d=>f(d.body['preview-resolution.json'])]),
  ['missing target worker stdout',d=>d.body['worker-diagnostics.json'].cycles[0].stdout='{}'],
  ['native readback wrong artifact',d=>d.body['worker-diagnostics.json'].cycles[0].targetStateAfter.output_sha256='0'.repeat(64)],
  ['missing capture',d=>d.body['post-payment-copy.json'].captures=[]],
  ...['origin','pathname','search'].map(part=>[`return ${part}`,d=>{const c=d.body['post-payment-copy.json'].captures[0],u=new URL(c.url);if(part==='origin')u.hostname='example.test';else u[part]=part==='search'?'?payment=wrong':'/wrong';c.url=u.href;}]),
  ['missing catalog proof',d=>d.body['packet-database-readback.json'].postconditionCount=0],
  ['golden failure',d=>d.body['matrix.json'].passed=false]
 ];
 for(const [name,change]of mutations){const d=structuredClone(original);change(d);assert.notDeepEqual(d,original,`${name}: non-vacuous`);assert.throws(()=>validateHostedDocuments(r,d),undefined,name);}
 console.log(`hosted semantic refusals: ${mutations.length}`);
});

test('each native receipt rejects byte drift before semantic validation',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-hosted-native-'));
 let refused=0;
 try{
  for(const r of RECEIPTS){
   for(const rel of receiptPaths(r)){fs.mkdirSync(path.dirname(path.join(temp,rel)),{recursive:true});fs.copyFileSync(rel,path.join(temp,rel));}
   assert.doesNotThrow(()=>loadHostedDocuments(temp,r));
   for(const rel of receiptPaths(r)){const file=path.join(temp,rel),before=fs.readFileSync(file);fs.appendFileSync(file,' ');assert.throws(()=>loadHostedDocuments(temp,r),/native receipt bytes/);refused++;fs.writeFileSync(file,before);}
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 assert.equal(refused,8);console.log(`native byte refusals: ${refused}`);
});

// Exercise the existing Production gate without network or runtime execution.
test('hosted acceptance grants no Production phase authority',()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
 assert.equal(candidate.productionAuthorized,false);assert.equal(candidate.productionAuthorization,null);
 for(const phase of ['preflight','clinic_migrate','packet_migrate','worker_deploy','deploy','smoke','activate','public_verify','alias','live_order']){
  assert.throws(()=>requireProductionPhaseAuthorization(candidate,phase),/not_authorized/);
  assert.throws(()=>requireProductionDeploymentBinding(candidate,phase),/not_authorized/);
 }
 console.log('Production authority refusals: 20');
});
