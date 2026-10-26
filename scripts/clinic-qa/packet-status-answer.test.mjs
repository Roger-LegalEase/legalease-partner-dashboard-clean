import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ownerPacketStatusAnswered} from './packet-journey.mjs';
import {startArtifactEvidence} from './artifact-journey.mjs';

const refusal=()=>({status:403,generationStatus:403,generationResultCode:'fulfillment_not_proven',cacheControl:'private, no-store',
  body:{resultCode:'fulfillment_not_proven',error:'A packet is not available for this route yet. Your saved information remains available.'}});

test('adopted R5 refusal answers status while both locales retain all 44 artifact obligations',()=>{
  const report={};
  for(const locale of ['en','es']){
    const evidence=startArtifactEvidence(report,locale);
    assert.equal(ownerPacketStatusAnswered(refusal()),true);
    assert.equal(evidence.status,'NOT_RUN');
    assert.equal(evidence.reason,'REAL_PROTECTED_ARTIFACT_UNAVAILABLE');
  }
  const cases=report.artifactAcceptance.flatMap(e=>e.cases);
  assert.equal(cases.length,44);assert(cases.every(c=>c.status==='NOT_RUN'));
});

for(const [name,change] of [
  ['original 500',r=>r.status=500],['unrelated 401',r=>r.status=401],
  ['wrong refusal code',r=>r.body.resultCode='verification_required'],
  ['wrong public message',r=>r.body.error='private proof detail'],
  ['missing message',r=>delete r.body.error],['non-JSON or absent body',r=>r.body=null],
  ['array body',r=>r.body=[]],['string body',r=>r.body='fulfillment_not_proven'],
  ['internal proof field',r=>r.body.proof='private detail'],
  ['false download authority',r=>r.body.canDownload=true],
  ['false checkout authority',r=>r.body.checkoutRequired=true],
  ['false sponsorship state',r=>r.body.sponsoredPaused=true],
  ['missing cache header',r=>r.cacheControl=undefined],['private only',r=>r.cacheControl='private'],
  ['no-store only',r=>r.cacheControl='no-store'],['public caching',r=>r.cacheControl='public, no-store'],
  ['cacheable response',r=>r.cacheControl='private, max-age=60'],
  ['unexpected refusal after generation success',r=>r.generationStatus=200],
  ['different generation refusal',r=>r.generationResultCode='payment_required']
])test(`reject ${name}`,()=>{const r=refusal();change(r);assert.equal(ownerPacketStatusAnswered(r),false);});

test('normal 200 status handling stays available to the existing artifact assertions',()=>{
  for(const body of [{packetStatus:'queued',canDownload:false},{packetStatus:'ready',canDownload:true,artifact:{downloadPath:'/protected'}},
    {packetStatus:'failed',canDownload:false}])assert.equal(ownerPacketStatusAnswered({status:200,body}),true);
});
