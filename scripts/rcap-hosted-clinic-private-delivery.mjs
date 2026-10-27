import assert from 'node:assert/strict';
import {CLINIC,hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {RESUME} from './rcap-clinic-resume-contract.mjs';
const EMAIL={owner:'mvl-demo-participant-a@rcap-acceptance.test',stranger:'mvl-demo-participant-b@rcap-acceptance.test'};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function sessionCookie(json){
 const encoded='base64-'+Buffer.from(JSON.stringify(json)).toString('base64');
 return encoded.match(/.{1,3180}/g).map((value,index,all)=>`sb-${CLINIC.project}-auth-token${all.length>1?'.'+index:''}=${value}`).join('; ');
}
// All credentials and PDF bytes stay inside closures; only typed receipts leave them.
export function createClinicPrivateDownloadPorts({config,env,target,ownerCookieHeader,checkpoint,assertContinuousWindow,fetcher=fetch}){
 assert.equal(target.itemId,CLINIC.item);assert.equal(target.ownerId,CLINIC.owner);assert.equal(target.clinicEventId,CLINIC.event);assert.match(target.jobId,UUID);
 assert.equal(config.origin,'https://legalease-rcap-clinic-c0052e13d980-roger947s-projects.vercel.app');
 assert.equal(new URL(config.origin).origin,config.origin);assert.equal(new URL(config.origin).protocol,'https:');assert.equal(config.bypass,env.VERCEL_AUTOMATION_BYPASS_SECRET);assert(config.bypass?.trim());
 assert.equal(typeof ownerCookieHeader,'string');assert(ownerCookieHeader&&!/[\r\n]/.test(ownerCookieHeader));
 for(const value of [checkpoint,assertContinuousWindow])assert.equal(typeof value,'function');
 const path=`/api/rcap/packets/${target.jobId}/download`,used=new Set(),sessions=new Map();
 const record=value=>{assert.equal(checkpoint(value),undefined,'download checkpoint must persist synchronously');};
 const freshSession=actor=>{
  assert(['freshOwner','stranger'].includes(actor));if(sessions.has(actor))return sessions.get(actor);
  const promise=(async()=>{
   await assertContinuousWindow({phase:'during_fulfillment',item:CLINIC.item,owner:CLINIC.owner});
   const expectedId=actor==='freshOwner'?CLINIC.owner:RESUME.stranger,email=actor==='freshOwner'?EMAIL.owner:EMAIL.stranger;
   assert.match(expectedId,UUID);assert.notEqual(RESUME.stranger,CLINIC.owner);assert(env.SUPABASE_ANON_KEY?.trim());assert(env.HOSTED_CLINIC_DEMO_PASSWORD?.trim());
   record({phase:'before_private_access_normal_grant',actor,grantAttempts:1});
   const response=await fetcher(`https://${CLINIC.project}.supabase.co/auth/v1/token?grant_type=password`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{apikey:env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:env.HOSTED_CLINIC_DEMO_PASSWORD})});
   record({phase:'private_access_normal_grant_response',actor,observedHttpStatus:response.status});assert.equal(response.status,200);
   const json=await response.json();assert.equal(json.user?.id,expectedId);assert.equal(json.user?.email,email);assert.equal(typeof json.access_token,'string');assert(json.access_token.length>0);
   record({phase:'private_access_normal_identity_exact',actor,authenticatedUserId:expectedId});return {id:expectedId,email,cookieHeader:sessionCookie(json)};
  })();sessions.set(actor,promise);return promise;
 };
 const download=actor=>async request=>{
  assert.equal(request.path,path);assert([undefined,CLINIC.owner].includes(request.expectedOwnerId));assert(!used.has(actor),'one exact private access per callback; never retry');used.add(actor);
  const auth=actor==='anonymous'?null:['owner','repeatOwner'].includes(actor)?{id:CLINIC.owner,email:EMAIL.owner,cookieHeader:ownerCookieHeader}:await freshSession(actor);
  await assertContinuousWindow({phase:'during_fulfillment',item:CLINIC.item,owner:CLINIC.owner});record({phase:'before_private_access',actor,targetJobSha256:hash(target.jobId)});
  const response=await fetcher(new URL(path,config.origin),{method:'GET',redirect:'manual',signal:AbortSignal.timeout(30000),headers:{'x-vercel-protection-bypass':config.bypass,...(auth?{Cookie:auth.cookieHeader}:{})}});
  record({phase:'private_access_response',actor,observedHttpStatus:response.status});
  const bytes=Buffer.from(await response.arrayBuffer()),contentType=response.headers.get('content-type')??'';
  const protection=response.headers.has('x-vercel-mitigated')||response.headers.has('x-vercel-error')||/Vercel Authentication|Authentication Required/.test(bytes.toString('utf8',0,30000));assert.equal(protection,false,'deployment protection is not an application denial');
  if(['anonymous','stranger'].includes(actor)){
   assert(actor==='anonymous'?[401,403,404].includes(response.status):[403,404].includes(response.status));assert(!/^application\/pdf\b/i.test(contentType));assert.notEqual(bytes.subarray(0,5).toString(),'%PDF-');
   return {status:response.status,fromProtectionLayer:false,...(auth?{authenticatedUserId:auth.id,authenticatedEmail:auth.email}:{})};
  }
  return {status:response.status,contentType,bytes,authenticatedUserId:auth.id,fromProtectionLayer:false};
 };
 return {ownerDownload:download('owner'),repeatOwnerDownload:download('repeatOwner'),freshOwnerDownload:download('freshOwner'),anonymousDownload:download('anonymous'),strangerDownload:download('stranger')};
}
