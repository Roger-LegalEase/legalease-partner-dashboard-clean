import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {artifactCases,startArtifactEvidence,protectedArtifactPath,alteredGrantPath,exactArtifactResponse,privateDenialResponse,artifactDenial,artifactAfterDeviceReset,artifactCleanupIds} from './artifact-journey.mjs';
import {assertApplicationBindingsEqual} from './source-bindings.mjs';

// Harness predicate tests only. These do not constitute authenticated artifact
// acceptance and do not populate the live journey report with successful cases.
const bytes=Buffer.from('%PDF-1.7\nSynthetic harness bytes, never fulfillment proof.');
const expected={byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
const headers={'cache-control':'private, no-store, max-age=0','content-type':'application/pdf'};
test('unavailable real artifact leaves every original artifact obligation explicitly NOT_RUN',()=>{
  const report={};const evidence=startArtifactEvidence(report,'en');
  assert.equal(evidence.status,'NOT_RUN');assert.equal(evidence.cases.length,20);
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
test('exact owner/job provenance supplies derived IDs needed by existing object cleanup',()=>{
  assert.deepEqual(artifactCleanupIds({ownerId:owner,matterId:item,provenance,job}),[derivedMatter,jobId]);
});
for(const [name,changed] of [['other owner',{consumer_auth_user_id:item}],['other item',{consumer_briefcase_item_id:owner}],
  ['other matter',{matter_id:owner}],['other storage path',{output_storage_path:'packet-artifacts/consumer/unrelated.pdf'}]])
  test(`cleanup ownership rejects ${name}`,()=>assert.throws(()=>artifactCleanupIds({ownerId:owner,matterId:item,provenance,job:{...job,...changed}})));
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
