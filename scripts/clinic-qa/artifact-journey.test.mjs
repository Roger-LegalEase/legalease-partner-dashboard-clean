import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {CANONICAL_WORKER_INPUTS,FIXED_FILE_INPUTS,createWorkerInputPlan} from '../rcap-hosted-acceptance-worker-input-plan.mjs';
import {keepDeliveredPdf,artifactCases,startArtifactEvidence,protectedArtifactPath,alteredGrantPath,exactArtifactResponse,privateDenialResponse,artifactDenial,artifactAfterDeviceReset,artifactCleanupIds,sponsoredArtifactPath,applyArtifactMode,acceptRealArtifact,artifactGrantAndRevisionCases,artifactActorCases,shouldAwaitArtifactStatus} from './artifact-journey.mjs';
import {assertApplicationBindingsEqual,assertArtifactWorkerBinding,artifactWorkerBinding} from './source-bindings.mjs';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';

// Harness predicate tests only. These do not constitute authenticated artifact
// acceptance and do not populate the live journey report with successful cases.
const bytes=Buffer.from('%PDF-1.7\nSynthetic harness bytes, never fulfillment proof.');
const expected={byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const headers={'cache-control':'private, no-store, max-age=0','content-type':'application/pdf'};
const sourceSha='b'.repeat(40),workerDigest='sha256:'+'c'.repeat(64),fingerprint='sha256:'+'d'.repeat(64);
function workerFixture() {
  const publication={sourceSha,immutableRegistryDigest:workerDigest,imageRepository:'ghcr.io/roger-legalease/rcap-render-worker',
    workflowConclusion:'success',runtimeAccepted:true,workerInputFingerprint:fingerprint,
    imageAcceptance:{runId:1,conclusion:'success',readOnly:true,sourceSha,tag:sourceSha,digest:workerDigest}};
  const publicationBytes=Buffer.from(JSON.stringify(publication));
  return {publicationBytes,job:{container_digest:workerDigest,renderer_kind:'packet_document_v1',renderer_version:'1.0.0'},
    observation:{externalPublication:{sourceSha,immutableRegistryDigest:workerDigest,workflowConclusion:'success',currentInputsEquivalent:true,
      evidenceSha256:createHash('sha256').update(publicationBytes).digest('hex')},
      provider:{providerId:publication.imageRepository,imageDigest:workerDigest,rendererKind:'packet_document_v1',rendererVersion:'1.0.0'}},
    plan:{acceptedSourceSha:sourceSha,acceptedDigest:workerDigest,candidateSha:'e'.repeat(40),rebuildRequired:false,
      changedPaths:[],missingCanonicalInputs:[],aggregateInputSha256:fingerprint}};
}
test('worker provenance accepts a later application commit only with equal canonical published inputs',()=>{
  const binding=assertArtifactWorkerBinding(workerFixture());
  assert.equal(binding.sourceSha,sourceSha);assert.equal(binding.containerDigest,workerDigest);
  assert.equal(binding.workerInputFingerprint,fingerprint);
});
for(const [name,mutate] of [
  ['missing finalized digest',x=>delete x.job.container_digest],
  ['local uncontainerized worker',x=>x.job.container_digest='local:fixture'],
  ['different published image',x=>x.job.container_digest='sha256:'+'a'.repeat(64)],
  ['wrong renderer kind',x=>x.job.renderer_kind='official_pdf_overlay_v1'],
  ['wrong renderer version',x=>x.job.renderer_version='0.0.0'],
  ['missing route observation',x=>x.observation=null],
  ['different receipt bytes',x=>x.publicationBytes=Buffer.concat([x.publicationBytes,Buffer.from('\n')])],
  ['unaccepted current inputs',x=>x.observation.externalPublication.currentInputsEquivalent=false],
  ['different observed source',x=>x.observation.externalPublication.sourceSha='a'.repeat(40)],
  ['different observed digest',x=>x.observation.externalPublication.immutableRegistryDigest='sha256:'+'a'.repeat(64)],
  ['different provider digest',x=>x.observation.provider.imageDigest='sha256:'+'a'.repeat(64)],
  ['different provider identity',x=>x.observation.provider.providerId='unreviewed'],
  ['different recomputed source',x=>x.plan.acceptedSourceSha='a'.repeat(40)],
  ['different recomputed digest',x=>x.plan.acceptedDigest='sha256:'+'a'.repeat(64)],
  ['rebuild required',x=>x.plan.rebuildRequired=true],
  ['changed canonical input',x=>x.plan.changedPaths=['src/changed.ts']],
  ['missing canonical input',x=>x.plan.missingCanonicalInputs=['src']],
  ['changed source fingerprint',x=>x.plan.aggregateInputSha256='sha256:'+'a'.repeat(64)]
])test(`worker provenance refuses ${name}`,()=>{const fixture=workerFixture();mutate(fixture);assert.throws(()=>assertArtifactWorkerBinding(fixture));});
for(const [name,mutate] of [
  ['failed publication',p=>p.workflowConclusion='failure'],
  ['image not accepted',p=>p.runtimeAccepted=false],
  ['missing image acceptance',p=>delete p.imageAcceptance],
  ['failed image acceptance',p=>p.imageAcceptance.conclusion='failure'],
  ['other accepted source',p=>p.imageAcceptance.sourceSha='a'.repeat(40)],
  ['other accepted digest',p=>p.imageAcceptance.digest='sha256:'+'a'.repeat(64)],
  ['other accepted tag',p=>p.imageAcceptance.tag='latest'],
  ['missing acceptance run',p=>delete p.imageAcceptance.runId]
])test(`worker provenance refuses ${name} even with rehashed observation`,()=>{
  const fixture=workerFixture(),publication=JSON.parse(fixture.publicationBytes);mutate(publication);
  fixture.publicationBytes=Buffer.from(JSON.stringify(publication));
  fixture.observation.externalPublication.evidenceSha256=createHash('sha256').update(fixture.publicationBytes).digest('hex');
  assert.throws(()=>assertArtifactWorkerBinding(fixture));
});
test('unavailable real artifact leaves every original artifact obligation explicitly NOT_RUN',()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');
  assert.equal(evidence.status,'NOT_RUN');assert.equal(evidence.cases.length,22);
  assert.deepEqual(evidence.cases.map(row=>row.id),artifactCases);
  assert(evidence.cases.every(row=>row.status==='NOT_RUN'));
  assert(!JSON.stringify(report).includes('PASS'));
});
test('exact bytes and private PDF response satisfy only the response predicate',()=>{
  assert.equal(exactArtifactResponse(200,headers,bytes,expected),true);
});
for(const [name,status,actualHeaders,body,identity] of [
  ['arbitrary successful HTTP',201,headers,bytes,expected],
  ['wrong bytes same length',200,headers,Buffer.from(bytes.toString().replace('Synthetic','Different')),expected],
  ['wrong length',200,headers,bytes,{...expected,byteLength:bytes.length+1}],
  ['different pinned hash',200,headers,bytes,{...expected,sha256:'0'.repeat(64)}],
  ['HTML instead of PDF',200,headers,Buffer.from('<html>sign in</html>'),expected],
  ['cacheable response',200,{...headers,'cache-control':'private, max-age=60'},bytes,expected],
  ['public response',200,{...headers,'cache-control':'public, no-store'},bytes,expected],
  ['wrong MIME type',200,{...headers,'content-type':'text/html'},bytes,expected]
])test(`owner artifact rejects ${name}`,()=>assert.equal(exactArtifactResponse(status,actualHeaders,body,identity),false));
const item='11111111-1111-4111-8111-111111111111',token='a'.repeat(43);
const owner='22222222-2222-4222-8222-222222222222',derivedMatter='33333333-3333-4333-8333-333333333333',jobId='44444444-4444-4444-8444-444444444444';
const provenance={render_job_id:jobId,matter_id:derivedMatter,consumer_auth_user_id:owner};
const job={consumer_auth_user_id:owner,consumer_briefcase_item_id:item,matter_id:derivedMatter,output_sha256:expected.sha256,
  output_storage_path:`packet-artifacts/consumer/${derivedMatter}/${jobId}/${expected.sha256}.pdf`};
const partnerId='55555555-5555-4555-8555-555555555555',eventId='66666666-6666-4666-8666-666666666666',sessionId='77777777-7777-4777-8777-777777777777';
const sponsoredJob={...job,partner_id:partnerId,consumer_auth_user_id:null,consumer_briefcase_item_id:null,
  container_digest:workerDigest,renderer_kind:'packet_document_v1',renderer_version:'1.0.0',
  sponsored_consumer_auth_user_id:owner,sponsored_consumer_briefcase_item_id:item,
  sponsored_verification_hash:'a'.repeat(64),route_id:'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
  sponsored_route_key:'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',sponsored_session_id:sessionId,sponsored_clinic_event_id:eventId,
  status:'artifact_validated',delivery_eligibility:'eligible',accounting_result:'consumed',output_byte_count:bytes.length,
  output_storage_path:`packet-artifacts/${partnerId}/${derivedMatter}/${jobId}/${expected.sha256}.pdf`};
const sponsoredPath=`/api/rcap/packets/${jobId}/download`;
const sponsoredProvenance={...provenance,revision:1,verification_hash:'a'.repeat(64),entitlement_source:'partner_sponsorship',
  artifact:{provider:'rcap_grade_a_composer_v1',source:'grade_a_packet_specification',renderJobId:jobId,
    artifactSha256:expected.sha256,storagePath:sponsoredJob.output_storage_path,downloadPath:sponsoredPath}};
test('exact owner/job provenance supplies derived IDs needed by existing object cleanup',()=>{
  assert.deepEqual(artifactCleanupIds({ownerId:owner,matterId:item,provenance,job}),[derivedMatter,jobId]);
});
for(const [name,changed] of [['other owner',{consumer_auth_user_id:item}],['other item',{consumer_briefcase_item_id:owner}],
  ['other matter',{matter_id:owner}],['other storage path',{output_storage_path:'packet-artifacts/consumer/unrelated.pdf'}]])
  test(`cleanup ownership rejects ${name}`,()=>assert.throws(()=>artifactCleanupIds({ownerId:owner,matterId:item,provenance,job:{...job,...changed}})));
test('sponsored cleanup uses exact run program namespace and sponsored owner/item fields',()=>{
  assert.deepEqual(artifactCleanupIds({ownerId:owner,matterId:item,provenance,job:sponsoredJob,partnerId}),[derivedMatter,jobId]);
});
test('cleanup paths match the actual job-contract builder for both identity modes',()=>{
  const contract=loadTsWithMocks('src/lib/rcap/render/job-contract.ts',{
    '@/lib/rcap/documents/packet-route-resolver':{},'@/lib/rcap/documents/packet-document-renderer':{},
    '@/lib/rcap-engine/profile-registry':{},'@/../data/record-clearing/legal-decisions/route-ratification-registry.json':{routes:[]}
  });
  for(const actual of [job,sponsoredJob])assert.equal(contract.buildArtifactStoragePath({partnerId:actual.partner_id??null,
    matterId:derivedMatter,jobId,outputSha256:expected.sha256}),actual.output_storage_path);
});
for(const [name,changed] of [['wrong partner',{partner_id:owner}],['consumer path',{output_storage_path:job.output_storage_path}],
  ['wrong sponsored owner',{sponsored_consumer_auth_user_id:item}],['wrong sponsored item',{sponsored_consumer_briefcase_item_id:owner}],
  ['mixed identity modes',{consumer_auth_user_id:owner}]])
  test(`sponsored cleanup rejects ${name}`,()=>assert.throws(()=>artifactCleanupIds({ownerId:owner,matterId:item,provenance,job:{...sponsoredJob,...changed},partnerId})));
test('sponsored endpoint accepts only the exact authenticated job route',()=>{
  assert.equal(sponsoredArtifactPath(sponsoredPath,'http://127.0.0.1:3139',jobId),sponsoredPath);
  for(const wrong of [sponsoredPath+'?grant=unused',sponsoredPath.replace(jobId,owner),'https://example.test'+sponsoredPath])
    assert.throws(()=>sponsoredArtifactPath(wrong,'http://127.0.0.1:3139',jobId));
});
test('sponsored mode records conditional consumer grant cases with contract references while preserving Clinic obligations',()=>{
  const evidence=startArtifactEvidence({},'en');applyArtifactMode(evidence,'sponsored');
  assert.equal(evidence.cases.filter(row=>row.status==='NOT_APPLICABLE').length,5);
  assert(evidence.cases.filter(row=>row.status==='NOT_APPLICABLE').every(row=>row.basis.includes('sponsored-packet.ts')));
  assert.equal(evidence.cases.find(row=>row.id==='wrong-job-denied').status,'NOT_RUN');
  assert.equal(evidence.cases.find(row=>row.id==='stale-verification-denied').status,'NOT_RUN');
});
test('actual sponsored enqueue and not_started status remain pending until real finalized provenance appears',()=>{
  const actualSequence=[{packetStatus:'not_started',canDownload:false},{packetStatus:'not_started',canDownload:false},
    {packetStatus:'ready',canDownload:true,artifact:{downloadPath:sponsoredPath}}];
  assert.deepEqual(actualSequence.map(status=>shouldAwaitArtifactStatus({generationHttp:200,generationPacketStatus:'generating',status,deadlineExpired:false})),[true,true,false]);
});
test('readiness polling never turns refusal, failure or timeout into success',()=>{
  const base={generationHttp:200,generationPacketStatus:'generating',status:{packetStatus:'not_started',canDownload:false},deadlineExpired:false};
  for(const changed of [{generationHttp:403},{generationPacketStatus:null},{status:{packetStatus:'failed',canDownload:false}},{deadlineExpired:true}])
    assert.equal(shouldAwaitArtifactStatus({...base,...changed}),false);
});
test('actual sponsored schema orchestration uses protected job bytes and never invokes consumer grants',async()=>{
  const requests=[];const fixture={actors:[{id:owner}],known:new Set([item]),partnerId,origin:'http://127.0.0.1:3139',program:'qa-synthetic',
    checked:result=>result.data,admin:{from:table=>({select(){return this;},eq(){return this;},single:async()=>({data:table==='packet_render_jobs'?sponsoredJob:sponsoredProvenance})})}};
  let verified=true;
  const context={request:{get:async path=>{
    requests.push(path);
    if(path===`/api/expungement-ai/briefcase/${item}/packet-information`)return {status:()=>200,json:async()=>({revision:1})};
    assert.equal(path.split('?')[0],sponsoredPath,'Only the actual sponsored download path is used');
    return {status:()=>verified?200:409,headers:()=>headers,body:async()=>verified?bytes:Buffer.from('{"code":"verification_not_current"}')};
  },post:async path=>{assert.equal(path,`/api/expungement-ai/briefcase/${item}/packet-information`);verified=false;return {status:()=>200,json:async()=>({readyToGenerate:false})};}}};
  const evidence=startArtifactEvidence({},'en');const artifact=await acceptRealArtifact({fixture,context,matterId:item,ownerId:owner,
    downloadPath:sponsoredPath,session:{screening_session_id:sessionId,event_id:eventId},evidence,check:(_id,pass)=>assert(pass),
    readWorkerBinding:actual=>assertArtifactWorkerBinding({...workerFixture(),job:actual})});
  assert.equal(artifact.mode,'sponsored');assert(fixture.known.has(jobId));assert(fixture.known.has(derivedMatter));
  await artifactGrantAndRevisionCases({fixture,item:{matterId:item,actor:{id:owner},api:`/api/expungement-ai/briefcase/${item}/packet-information`,context,artifact},check:(_id,pass)=>assert(pass)});
  assert(requests.every(path=>!path.includes('download-link')&&!path.includes('grant=')));
  assert.equal(evidence.cases.find(row=>row.id==='stale-verification-denied').status,'PASS');
});
test('wrong finalized worker blocks owner acceptance while retaining exact cleanup ownership',async()=>{
  const actual={...sponsoredJob,container_digest:'local:unpublished'};
  const fixture={actors:[{id:owner}],known:new Set([item]),partnerId,origin:'http://127.0.0.1:3139',program:'qa-synthetic',
    checked:result=>result.data,admin:{from:table=>({select(){return this;},eq(){return this;},single:async()=>({data:table==='packet_render_jobs'?actual:sponsoredProvenance})})}};
  let requests=0;const evidence=startArtifactEvidence({},'en');
  await assert.rejects(acceptRealArtifact({fixture,context:{request:{get(){requests++;throw Error('No owner fetch permitted');}}},
    matterId:item,ownerId:owner,downloadPath:sponsoredPath,session:{screening_session_id:sessionId,event_id:eventId},evidence,
    check:()=>{},readWorkerBinding:job=>assertArtifactWorkerBinding({...workerFixture(),job})}),/current accepted worker digest/);
  assert.equal(requests,0);assert(fixture.known.has(jobId)&&fixture.known.has(derivedMatter));
  assert.equal(evidence.cases.find(row=>row.id==='current-worker-source-provenance').status,'FAIL');
  assert.equal(evidence.cases.find(row=>row.id==='owner-provenance-and-exact-bytes').status,'NOT_RUN');
});
test('wrong sponsored job denial proves that exact job through its own owner immediately beforehand',async()=>{
  const otherJob='88888888-8888-4888-8888-888888888888',otherPath=`/api/rcap/packets/${otherJob}/download`;
  const order=[];
  const actorContext=(label,ownPath)=>({request:{get:async path=>{
    const ok=path.split('?')[0]===ownPath;order.push({label,path,status:ok?200:404});
    return {status:()=>ok?200:404,headers:()=>headers,body:async()=>ok?bytes:Buffer.from('{"error":"not_found"}')};
  }}});
  const contextA=actorContext('A',sponsoredPath),contextB=actorContext('B',otherPath),outsider=actorContext('outsider',null);
  const owned=[{context:contextA,actor:{id:owner},matterId:item,locale:'en',artifact:{mode:'sponsored',target:sponsoredPath,expected,
    evidence:startArtifactEvidence({},'en')}},{context:contextB,actor:{id:owner},matterId:item,locale:'es',artifact:{mode:'sponsored',target:otherPath,expected,evidence:startArtifactEvidence({},'es')}}];
  await artifactActorCases({owned,outsider:{context:outsider},unauthorized:{context:outsider},queueOnlyContext:outsider,
    browser:{newContext:async()=>({...outsider,close:async()=>{}})},fixture:{origin:'http://127.0.0.1:3139'},check:(_id,pass)=>assert(pass)});
  for(const [label,path,ownerLabel] of [['A',otherPath,'B'],['B',sponsoredPath,'A']]){
    const exactPairs=order.filter((row,index)=>row.label===label&&row.path===path&&row.status===404
      &&order[index-1]?.label===ownerLabel&&order[index-1]?.path===path&&order[index-1]?.status===200);
    assert(exactPairs.length>0,'Target owner positive must immediately precede wrong-job request');
  }
});
for(const [name,changed] of [['wrong event',{sponsored_clinic_event_id:owner}],['wrong screening session',{sponsored_session_id:owner}],
  ['wrong verification',{sponsored_verification_hash:'b'.repeat(64)}],['wrong route',{sponsored_route_key:'wrong'}]])
  test(`sponsored orchestration refuses ${name} before any owner download`,async()=>{
    const fixture={actors:[{id:owner}],known:new Set([item]),partnerId,origin:'http://127.0.0.1:3139',
      checked:r=>r.data,admin:{from:table=>({select(){return this;},eq(){return this;},single:async()=>({data:table==='packet_render_jobs'?{...sponsoredJob,...changed}:sponsoredProvenance})})}};
    let requests=0;
    await assert.rejects(()=>acceptRealArtifact({fixture,context:{request:{get:async()=>{requests++;throw new Error('No unbound download');}}},
      matterId:item,ownerId:owner,downloadPath:sponsoredPath,session:{screening_session_id:sessionId,event_id:eventId},evidence:startArtifactEvidence({},'en'),check:()=>{}}),/exact program\/owner\/session/);
    assert.equal(requests,0);assert.equal(fixture.known.size,1);
  });
test('actual same-origin opaque grant path is kept only as an in-memory handle',()=>{
  const path=`/api/expungement-ai/packet/artifacts/${item}?grant=${token}`;
  assert.equal(protectedArtifactPath(path,'http://127.0.0.1:3139',item),path);
});
test('token tampering changes exactly one character while retaining valid opaque token syntax',()=>{
  for(const original of ['a'.repeat(43),'b'.repeat(43)]){
    const path=`/api/expungement-ai/packet/artifacts/${item}?grant=${original}`;
    const changed=new URL(alteredGrantPath(path,'http://127.0.0.1:3139'),'http://127.0.0.1:3139').searchParams.get('grant');
    assert.match(changed,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(changed,original);
    assert.equal(changed.slice(1),original.slice(1));
  }
});
test('source equivalence rejects a served-only file even if a caller supplies the same digest',()=>{
  assert.throws(()=>assertApplicationBindingsEqual({files:['src/a.ts'],sha256:'same'},
    {files:['src/a.ts','src/added.ts'],sha256:'same'}),/file sets differ/);
});
test('source equivalence rejects changed served bytes',()=>{
  assert.throws(()=>assertApplicationBindingsEqual({files:['src/a.ts'],sha256:'before'},
    {files:['src/a.ts'],sha256:'after'}),/source bytes differ/);
});
test('source equivalence accepts exactly equal file sets and byte identity',()=>{
  assertApplicationBindingsEqual({files:['src/a.ts'],sha256:'same'},{files:['src/a.ts'],sha256:'same'});
});
test('a denied owner positive control cannot produce a passing wrong-actor assertion',async()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');let negativeCalls=0;
  const owner={request:{get:async()=>({status:()=>404})}};
  const unauthorized={request:{get:async()=>{negativeCalls++;throw new Error('Must not measure a vacuous denial');}}};
  await assert.rejects(()=>artifactDenial({item:{matterId:item,actor:{id:item},context:owner,
    artifact:{origin:'http://127.0.0.1:3139',evidence,expected}},context:unauthorized,
    id:'wrong-participant-denied',check:()=>{throw new Error('Must not record success');}}),/Current owner authority/);
  assert.equal(negativeCalls,0);assert(evidence.cases.every(row=>row.status==='NOT_RUN'));
});
test('a current grant with wrong owner bytes cannot produce a passing wrong-actor assertion',async()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');let calls=0,negativeCalls=0;
  const owner={request:{get:async()=>++calls===1?{status:()=>303,headers:()=>({location:`/api/expungement-ai/packet/artifacts/${item}?grant=${token}`})}:
    {status:()=>200,headers:()=>headers,body:async()=>Buffer.from('%PDF-wrong')}}};
  const unauthorized={request:{get:async()=>{negativeCalls++;throw new Error('Must not measure a vacuous denial');}}};
  await assert.rejects(()=>artifactDenial({item:{matterId:item,actor:{id:item},context:owner,
    artifact:{origin:'http://127.0.0.1:3139',evidence,expected}},context:unauthorized,
    id:'wrong-participant-denied',check:()=>{throw new Error('Must not record success');}}),/Exact issued grant/);
  assert.equal(negativeCalls,0);assert.deepEqual(evidence.controls,[{forCase:'wrong-participant-denied',status:'FAIL'}]);
  assert(evidence.cases.every(row=>row.status==='NOT_RUN'));
});
test('device-reset artifact replay requires fresh ordinary owner login and current bytes before the signed-out denial',async()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');const order=[];
  const old={request:{get:async()=>{order.push('signed-out-request');return {status:()=>401,headers:()=>headers,body:async()=>Buffer.from('{"code":"not_authenticated"}')};}}};
  let ownerCalls=0;
  const fresh={close:async()=>order.push('fresh-context-closed'),request:{get:async()=>{
    ownerCalls++;
    if(ownerCalls===1){order.push('fresh-owner-grant');return {status:()=>303,headers:()=>({location:`/api/expungement-ai/packet/artifacts/${item}?grant=${token}`})};}
    if(ownerCalls===2){order.push('fresh-owner-bytes');return {status:()=>200,headers:()=>headers,body:async()=>bytes};}
    // Stop this harness-only case after its independently measured reset
    // sequence. The actual later journey must also retain its positive control.
    order.push('later-control-refused');return {status:()=>401};
  }}};
  const actor={id:item};
  await assert.rejects(()=>artifactAfterDeviceReset({item:{matterId:item,actor,locale:'en',context:old,
    selectedHelper:{context:old},artifact:{origin:'http://127.0.0.1:3139',evidence,expected}},fixture:{origin:'http://127.0.0.1:3139'},
    check:()=>{},login:async(receivedActor,locale)=>{assert.equal(receivedActor,actor);assert.equal(locale,'en');order.push('ordinary-login');return {context:fresh};}}),/Current owner authority/);
  assert.deepEqual(order,['ordinary-login','fresh-owner-grant','fresh-owner-bytes','signed-out-request','signed-out-request','later-control-refused','fresh-context-closed']);
  assert.equal(evidence.cases.find(row=>row.id==='reset-signed-out-replay-denied').status,'PASS');
  assert.equal(evidence.cases.find(row=>row.id==='revoked-consent-owner-retains-artifact').status,'NOT_RUN');
});
test('device-reset artifact branch refuses a still-signed-out owner login before measuring any denial',async()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');let deniedCalls=0,closed=false;
  const old={request:{get:async()=>{deniedCalls++;throw new Error('No denial without an owner positive control');}}};
  const fresh={close:async()=>{closed=true;},request:{get:async()=>({status:()=>401})}};
  await assert.rejects(()=>artifactAfterDeviceReset({item:{matterId:item,actor:{id:item},locale:'en',context:old,
    artifact:{origin:'http://127.0.0.1:3139',evidence,expected}},fixture:{},check:()=>{},login:async()=>({context:fresh})}),/Current owner authority/);
  assert.equal(deniedCalls,0);assert.equal(closed,true);assert(evidence.cases.every(row=>row.status==='NOT_RUN'));
});
for(const [name,location] of [
  ['cross-origin redirect',`https://example.test/api/expungement-ai/packet/artifacts/${item}?grant=${token}`],
  ['different item',`/api/expungement-ai/packet/artifacts/22222222-2222-4222-8222-222222222222?grant=${token}`],
  ['missing token',`/api/expungement-ai/packet/artifacts/${item}`],
  ['extra storage locator',`/api/expungement-ai/packet/artifacts/${item}?grant=${token}&storagePath=private`]
])test(`grant redirect rejects ${name}`,()=>assert.throws(()=>protectedArtifactPath(location,'http://127.0.0.1:3139',item)));
test('safe private unavailable response is a denial',()=>{
  assert(privateDenialResponse(404,headers,Buffer.from('{"ok":false,"error":"artifact_unavailable"}')));
});
for(const [name,status,actualHeaders,body] of [
  ['HTTP success',200,headers,Buffer.from('{"ok":false}')],
  ['PDF bytes despite denial status',404,headers,bytes],
  ['redirect to sign in',307,headers,Buffer.from('{}')],
  ['cacheable denial',404,{'cache-control':'private, max-age=60'},Buffer.from('{}')],
  ['private path leak',404,headers,Buffer.from('{"error":"packet-artifacts/consumer/private.pdf"}')],
  ['grant field leak',404,headers,Buffer.from('{"token":"private"}')],
  ['non JSON failure',404,headers,Buffer.from('server failure')]
])test(`artifact denial rejects ${name}`,()=>assert.equal(privateDenialResponse(status,actualHeaders,body),false));

test('actual Git input comparison permits receipt successors and refuses committed, dirty, staged and untracked runtime drift',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-worker-binding-'));
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
  const write=(file,bytes)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),bytes);};
  const commit=()=>git('-c','user.name=Clinic QA','-c','user.email=clinic-qa@example.test','commit','-m','Synthetic binding fixture');
  try {
    git('init');
    for(const input of CANONICAL_WORKER_INPUTS)write(FIXED_FILE_INPUTS.has(input)?input:input+'/fixture.txt','synthetic\n');
    write('deploy/rcap-render-worker/Dockerfile','FROM scratch\nCOPY src /src\n');
    git('add','--',...CANONICAL_WORKER_INPUTS);commit();
    const sourceSha=git('rev-parse','HEAD'),digest='sha256:'+'c'.repeat(64),route='MS:synthetic-test';
    const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:sourceSha,acceptedDigest:digest,candidateSha:sourceSha});
    const publication={sourceSha,immutableRegistryDigest:digest,imageRepository:'ghcr.io/roger-legalease/rcap-render-worker',
      workflowConclusion:'success',runtimeAccepted:true,workerInputFingerprint:plan.aggregateInputSha256,
      imageAcceptance:{runId:1,conclusion:'success',readOnly:true,sourceSha,tag:sourceSha,digest}};
    const publicationBytes=JSON.stringify(publication);
    const observation={externalPublication:{sourceSha,immutableRegistryDigest:digest,workflowConclusion:'success',currentInputsEquivalent:true,
      evidenceSha256:createHash('sha256').update(publicationBytes).digest('hex')},
      provider:{providerId:publication.imageRepository,imageDigest:digest,rendererKind:'packet_document_v1',rendererVersion:'1.0.0'}};
    const publicationPath='data/rcap-render/worker-publication-evidence.json',observationPath='data/rcap-grade-a/fulfillment-observation-snapshot.json';
    write(publicationPath,publicationBytes);write(observationPath,JSON.stringify({routes:{[route]:observation}}));
    git('add','--',publicationPath,observationPath);commit();
    assert.notEqual(git('rev-parse','HEAD'),sourceSha,'Receipt commit intentionally follows image source');
    const job={route_id:route,container_digest:digest,renderer_kind:'packet_document_v1',renderer_version:'1.0.0'};
    assert.equal(artifactWorkerBinding(job,root).sourceSha,sourceSha);
    write('src/fixture.txt','changed\n');
    assert.throws(()=>artifactWorkerBinding(job,root),/Uncommitted worker input changes/);
    git('add','--','src/fixture.txt');
    assert.throws(()=>artifactWorkerBinding(job,root),/Uncommitted worker input changes/);
    write('src/fixture.txt','synthetic\n');git('add','--','src/fixture.txt');
    write('src/addition.txt','new runtime input\n');
    assert.throws(()=>artifactWorkerBinding(job,root),/Untracked worker inputs/);
    git('add','--','src/addition.txt');commit();
    assert.throws(()=>artifactWorkerBinding(job,root),/Published worker inputs differ/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('keepDeliveredPdf keeps verified bytes privately, once, only under an absolute directory', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-delivered-'));
  try {
    const bytes=Buffer.from('%PDF-1.7 probe'),sha=createHash('sha256').update(bytes).digest('hex'),dir=path.join(root,'delivered');
    const file=keepDeliveredPdf(dir,sha,bytes);
    assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(fs.statSync(file).mode&0o777,0o600);assert.equal(fs.statSync(dir).mode&0o777,0o700);
    assert.throws(()=>keepDeliveredPdf(dir,sha,bytes),/EEXIST/);
    assert.throws(()=>keepDeliveredPdf('relative/dir',sha,bytes),/absolute/);
    assert.throws(()=>keepDeliveredPdf(dir,'../escape',bytes));
    const repo=path.join(root,'repo');execFileSync('git',['init','-q',repo]);fs.symlinkSync(repo,path.join(root,'link'));
    // Reviewer2 P1: a '..' through a missing directory must not let the ancestor walk climb outside the worktree.
    for(const inside of [path.join(repo,'private','delivered'),path.join(root,'link','not-yet','delivered'),`${root}/missing/../repo/kept`])
      assert.throws(()=>keepDeliveredPdf(inside,sha,bytes),/outside every git worktree/);
    assert.equal(fs.existsSync(path.join(root,'missing')),false);
    // Reviewer2 P4: when git itself cannot answer, the keep is refused rather than treated as outside.
    const previousPath=process.env.PATH;process.env.PATH=path.join(root,'no-git-here');
    try { assert.throws(()=>keepDeliveredPdf(path.join(repo,'private','kept'),sha,bytes),/ENOENT/); }
    finally { process.env.PATH=previousPath; }
    assert.deepEqual(fs.readdirSync(repo),['.git']);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test('a delivered body that fails verification is never kept, even with CLINIC_QA_DELIVERED_PDF_DIR set',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-unverified-')),dir=path.join(root,'delivered'),previous=process.env.CLINIC_QA_DELIVERED_PDF_DIR;
  const fixture={actors:[{id:owner}],known:new Set([item]),partnerId,origin:'http://127.0.0.1:3139',program:'qa-synthetic',
    checked:result=>result.data,admin:{from:table=>({select(){return this;},eq(){return this;},single:async()=>({data:table==='packet_render_jobs'?sponsoredJob:sponsoredProvenance})})}};
  const wrong=Buffer.from(bytes);wrong[wrong.length-1]^=1;
  const context={request:{get:async()=>({status:()=>200,headers:()=>headers,body:async()=>wrong})}};
  process.env.CLINIC_QA_DELIVERED_PDF_DIR=dir;
  try {
    await assert.rejects(acceptRealArtifact({fixture,context,matterId:item,ownerId:owner,downloadPath:sponsoredPath,
      session:{screening_session_id:sessionId,event_id:eventId},evidence:startArtifactEvidence({},'en'),check:()=>{},
      readWorkerBinding:actual=>assertArtifactWorkerBinding({...workerFixture(),job:actual})}),/Actual owner PDF must match/);
    assert.equal(fs.existsSync(dir),false);
  } finally {
    if(previous===undefined)delete process.env.CLINIC_QA_DELIVERED_PDF_DIR;else process.env.CLINIC_QA_DELIVERED_PDF_DIR=previous;
    fs.rmSync(root,{recursive:true,force:true});
  }
});
