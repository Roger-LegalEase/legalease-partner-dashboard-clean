import assert from 'node:assert/strict';
import {CLINIC} from './rcap-hosted-existing-clinic-readonly.mjs';
import {RESUME} from './rcap-clinic-resume-contract.mjs';
import {createClinicPrivateDownloadPorts} from './rcap-hosted-clinic-private-delivery.mjs';
const config={origin:'https://legalease-rcap-clinic-c0052e13d980-roger947s-projects.vercel.app',bypass:'private-mock-bypass'};
const env={VERCEL_AUTOMATION_BYPASS_SECRET:config.bypass,SUPABASE_ANON_KEY:'mock-only',HOSTED_CLINIC_DEMO_PASSWORD:'private-mock-password'};
const target={itemId:CLINIC.item,ownerId:CLINIC.owner,clinicEventId:CLINIC.event,jobId:'11111111-1111-4111-8111-111111111111'};
const path=`/api/rcap/packets/${target.jobId}/download`,input={path,expectedOwnerId:CLINIC.owner};
const pdf=Buffer.from('%PDF-fixture-only-not-a-real-document');let checks=0;const check=fn=>{fn();checks++;};
function fixture({wrongGrant=false,protection=false,pdfDenial=false,windowFailure=false}={}){
 const calls=[],records=[];let windows=0;
 const fetcher=async(url,options)=>{
  url=String(url);calls.push({url,method:options.method,headers:options.headers});
  if(new URL(url).origin!==config.origin){
   assert.equal(url,`https://${CLINIC.project}.supabase.co/auth/v1/token?grant_type=password`);assert.equal(options.method,'POST');assert(!options.headers['x-vercel-protection-bypass']);
   const body=JSON.parse(options.body),stranger=body.email==='mvl-demo-participant-b@rcap-acceptance.test';
   assert.equal(body.password,env.HOSTED_CLINIC_DEMO_PASSWORD);assert([body.email==='mvl-demo-participant-a@rcap-acceptance.test',stranger].some(Boolean));
   return new Response(JSON.stringify({user:{id:wrongGrant?'22222222-2222-4222-8222-222222222222':stranger?RESUME.stranger:CLINIC.owner,email:body.email},access_token:'private-mock-token'}));
  }
  assert.equal(url,config.origin+path);assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.headers['x-vercel-protection-bypass'],config.bypass);
  const cookie=options.headers.Cookie;let userId;
  if(cookie==='original-owner-cookie')userId=CLINIC.owner;
  else if(cookie){const value=cookie.slice(cookie.indexOf('=')+1);assert(value.startsWith('base64-'));userId=JSON.parse(Buffer.from(value.slice(7),'base64')).user.id;}
  if(userId===CLINIC.owner)return new Response(pdf,{headers:{'Content-Type':'application/pdf'}});
  return new Response(pdfDenial?pdf:'{"error":"auth_required"}',{status:userId?404:401,headers:{'Content-Type':pdfDenial?'application/pdf':'application/json',...(protection?{'x-vercel-mitigated':'challenge'}:{})}});
 };
 const ports=createClinicPrivateDownloadPorts({config,env,target,ownerCookieHeader:'original-owner-cookie',checkpoint:value=>{records.push(value);},assertContinuousWindow:async()=>{windows++;if(windowFailure)throw Error('window-held');},fetcher});
 return {ports,calls,records,windowCount:()=>windows};
}
const success=fixture();
for(const name of ['ownerDownload','repeatOwnerDownload','freshOwnerDownload']){
 const response=await success.ports[name](input);check(()=>assert.equal(response.authenticatedUserId,CLINIC.owner));check(()=>assert.deepEqual(response.bytes,pdf));
}
const anon=await success.ports.anonymousDownload(input),stranger=await success.ports.strangerDownload(input);
check(()=>assert.equal(anon.status,401));check(()=>assert.equal(stranger.status,404));check(()=>assert.equal(stranger.authenticatedUserId,RESUME.stranger));
check(()=>assert.equal(stranger.authenticatedEmail,'mvl-demo-participant-b@rcap-acceptance.test'));
check(()=>assert.equal(success.calls.length,7));check(()=>assert.equal(success.calls.filter(c=>c.method==='POST').length,2));
check(()=>assert.equal(success.calls.filter(c=>new URL(c.url).origin===config.origin&&c.method==='POST').length,0));
check(()=>assert.equal(success.windowCount(),7));check(()=>assert.equal(JSON.stringify(success.ports),'{}'));
check(()=>assert(!/private-mock|%PDF-|original-owner-cookie/.test(JSON.stringify(success.records))));
await assert.rejects(()=>success.ports.freshOwnerDownload(input));checks++;check(()=>assert.equal(success.calls.length,7));
const wrongPath=fixture();await assert.rejects(()=>wrongPath.ports.strangerDownload({...input,path:path+'?other=1'}));checks++;check(()=>assert.equal(wrongPath.calls.length,0));
const wrong=fixture({wrongGrant:true});await assert.rejects(()=>wrong.ports.strangerDownload(input));checks++;await assert.rejects(()=>wrong.ports.strangerDownload(input));checks++;check(()=>assert.equal(wrong.calls.length,1));
for(const options of [{protection:true},{pdfDenial:true}]){const f=fixture(options);await assert.rejects(()=>f.ports.anonymousDownload(input));checks++;}
const stopped=fixture({windowFailure:true});await assert.rejects(()=>stopped.ports.freshOwnerDownload(input));checks++;check(()=>assert.equal(stopped.calls.length,0));
check(()=>assert.throws(()=>createClinicPrivateDownloadPorts({config:{...config,origin:'https://foreign.test'},env,target,ownerCookieHeader:'mock',checkpoint:()=>{},assertContinuousWindow:async()=>{}})));
console.log(`${checks} focused Clinic same/repeat/fresh owner, existing stranger, application denial, exact path, custody and privacy checks PASS; mock Auth/PDF only, no live calls.`);
