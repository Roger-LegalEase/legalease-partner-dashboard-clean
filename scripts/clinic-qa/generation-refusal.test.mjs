import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
const authority=loadTsWithMocks('src/lib/expungement-ai/packet-fulfillment-authority.ts',{});
test('actual generation handler preserves incomplete fulfillment refusal without leaking internal proof details',async()=>{
  const failure=new authority.PacketFulfillmentNotProvenError('MS:private-route',['private proof detail'],'packet generation');
  let generationCalls=0;
  const route=loadTsWithMocks('src/app/api/expungement-ai/packet/generate/route.ts',{
    '@/lib/expungement-ai/packet-fulfillment-authority':authority,
    '@/lib/expungement-ai/auth':{requireConsumerBriefcaseSession:async()=>({userId:'synthetic'})},
    '@/lib/expungement-ai/packet-generation':{generatePaidConsumerPacket:async()=>{generationCalls++;throw failure;},ConsumerPacketPaymentRequiredError:class extends Error{}}
  });
  const result=await route.POST(new NextRequest('http://localhost/api/expungement-ai/packet/generate',{method:'POST',body:JSON.stringify({briefcaseItemId:'synthetic'})}));
  assert.equal(result.status,403);assert.equal(generationCalls,1);
  assert.match(result.headers.get('cache-control'),/no-store/);
  const body=await result.json();assert.equal(body.resultCode,'fulfillment_not_proven');
  assert.doesNotMatch(JSON.stringify(body),/private-route|private proof|checkoutRequired|sponsoredPaused|canDownload/);
});
