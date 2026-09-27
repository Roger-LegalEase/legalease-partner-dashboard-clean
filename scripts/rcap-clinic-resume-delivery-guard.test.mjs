import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {chromium} from 'playwright';
import {startConnectedFixture} from './rcap-clinic-resume-connected-fixture.mjs';
import {handleResumeRequest,browserDeliveryPath} from './rcap-clinic-resume-network-policy.mjs';
import {RESUME} from './rcap-clinic-resume-contract.mjs';
const old=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','658d2368fe54d0b369edc7768985ab8a74783262:scripts/rcap-clinic-resume-network-policy.mjs'])).toString('base64'));
const origin='https://preview.vercel.app',canonical=`/api/rcap/packets/${RESUME.job}/download`,encoded=canonical.replace(RESUME.job,'%62'+RESUME.job.slice(1));
async function run(handler,pathname,method='GET',redirect){const calls=[],violations=[];await handler({request:()=>({url:()=>origin+pathname,method:()=>method,resourceType:()=>method==='HEAD'?'fetch':'document',headers:()=>({purpose:'prefetch','next-router-prefetch':'1'})}),continue:async()=>{calls.push('transport')},fetch:async()=>{calls.push('transport');return{headers:()=>redirect?{location:redirect}:{},status:()=>redirect?302:200}},fulfill:()=>calls.push('fulfill'),abort:()=>calls.push('abort')},{origin,bypass:'synthetic',violations});return{calls,violations}}
test('before/after counterexample: original canonical and encoded delivery forwarded; checkpoint guard blocks BEFORE transport',async()=>{
 const paths=[canonical,encoded,canonical.replace('/rcap/','/%72cap/'),canonical.replace('/download','/%64ownload'),canonical+'/',canonical+'?prefetch=1','/api/expungement-ai/packet/download?briefcaseItemId='+RESUME.item,'/api/expungement-ai/packet/download-link?briefcaseItemId='+RESUME.item,'/api/expungement-ai/packet/artifacts/'+RESUME.item+'?grant=synthetic'];
 for(const p of paths)for(const method of ['GET','HEAD']){const before=await run(old.handleResumeRequest,p,method);assert.ok(before.calls.includes('transport'));const after=await run(handleResumeRequest,p,method);assert.deepEqual(after.calls,['abort']);assert.equal(after.violations.length,1)}
 for(const p of [canonical.replace('%','%25'),'/api/rcap/packets/%2562'+RESUME.job.slice(1)+'/download','/api/rcap/packets/%zz/download','/api//rcap/packets/anything/download','/api%2frcap%2fpackets/'+RESUME.job+'/download']){assert.ok(browserDeliveryPath(p));assert.deepEqual((await run(handleResumeRequest,p)).calls,['abort']);}
 for(const p of ['/briefcase','/_next/static/chunks/real.js'])assert.deepEqual((await run(handleResumeRequest,p)).calls,['transport','fulfill']);
 const redirected=await run(handleResumeRequest,'/safe-looking-link','GET',encoded);assert.deepEqual(redirected.calls,['transport','abort']);assert.equal(redirected.violations.length,1);
});
test('actual locked Next router decodes the same identifier; actual Chromium GET/HEAD/prefetch and redirects reach zero delivery transport calls',async()=>{
 const fixture=await startConnectedFixture(process.env.RCAP_CONNECTED_FIXTURE),browser=await chromium.launch({headless:true});try{
  for(const pathname of [canonical,encoded]){const r=await fetch(fixture.routerOrigin+pathname);assert.equal(r.status,200);assert.equal((await r.json()).jobId,RESUME.job);assert.equal((await fetch(fixture.routerOrigin+pathname,{method:'HEAD'})).status,200)}
  const c=await browser.newContext(),violations=[];let deliveryTransport=0;
  await c.route('**/*',route=>{const wrapped={request:()=>route.request(),abort:()=>route.abort(),fulfill:x=>route.fulfill(x),fetch:async options=>{if(browserDeliveryPath(new URL(route.request().url()).pathname))deliveryTransport++;return route.fetch(options)}};return handleResumeRequest(wrapped,{origin:fixture.origin,bypass:'synthetic',violations})});
  const p=await c.newPage();await p.goto(fixture.origin+'/clinic/mississippi-volunteer-lawyers-demo');for(const pathname of [canonical,encoded])for(const method of ['GET','HEAD'])assert.equal(await p.evaluate(async({pathname,method})=>{try{await fetch(pathname,{method,headers:{purpose:'prefetch'}});return false}catch{return true}},{pathname,method}),true);
  assert.equal(await p.evaluate(async()=>{try{await fetch('/local-redirect');return false}catch{return true}}),true);assert.equal(deliveryTransport,0);assert.equal(fixture.count.denialRequests,0);assert.equal(fixture.count.storageReads,0);assert.equal(violations.length,5);
 }finally{await browser.close();await fixture.close()}
});
