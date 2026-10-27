import {clinicClarificationResponse} from './rcap-hosted-clinic-clarification-response.mjs';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {CLINIC,admitClinic,hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {assertConsumerPurposeRelease} from './rcap-hosted-consumer-purpose-release.mjs';
import {planClinicUnverifiedSave,assertClinicUnverifiedReadback} from './rcap-hosted-clinic-unverified-save-plan.mjs';
const PACKET=`/api/expungement-ai/briefcase/${CLINIC.item}/packet-information`;
const EDITING='?editingFact=social_security_number';
const AUTH=`https://${CLINIC.project}.supabase.co/auth/v1/token?grant_type=password`;
const safeErrors=new Set(['revision_conflict','save_unavailable','saved_state_unavailable','invalid_request','not_authenticated','not_found','forbidden','packet_information_unavailable']);
export function clinicSaveRequestAllowed(config,url,method,{sensitiveReadback=false}={}){
 const u=new URL(url);if(u.username||u.password||u.hash)return false;
 if(method==='POST'&&u.href===AUTH)return true;
 if(u.origin!==config.origin)return false;
 if(method==='GET')return (u.pathname==='/api/rcap/release'&&!u.search)||(u.pathname===PACKET&&(!u.search||(sensitiveReadback&&u.search===EDITING)));
 return method==='POST'&&u.pathname===PACKET&&!u.search;
}
export function createClinicUnverifiedSaveRuntime(config,env,{fetcher=fetch,checkpoint}={}){
 assert.equal(typeof checkpoint,'function');for(const k of ['VERCEL_AUTOMATION_BYPASS_SECRET','SUPABASE_ANON_KEY','HOSTED_CLINIC_DEMO_PASSWORD'])assert(env[k]?.trim());
 let cookies='',authPosts=0,writeAttempts=0,model,sensitiveReadback=false;
 async function request(url,method,body,phase){
  assert(clinicSaveRequestAllowed(config,url,method,{sensitiveReadback}));const app=new URL(url).origin===config.origin;
  const r=await fetcher(url,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:app?{'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET,...(cookies?{Cookie:cookies}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{})}:{apikey:env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const text=await r.text();let json;try{json=JSON.parse(text);}catch{}
  await checkpoint({phase,observedHttpStatus:r.status,authPosts,customerWriteAttempts:writeAttempts,errorCode:safeErrors.has(json?.error)?json.error:null,errorCodeSha256:typeof json?.error==='string'?hash(json.error):null});return {status:r.status,json};
 }
 return {
  release:()=>request(new URL('/api/rcap/release',config.origin).href,'GET',undefined,'release_get'),
  async login(){assert.equal(++authPosts,1);const r=await request(AUTH,'POST',{email:'mvl-demo-participant-a@rcap-acceptance.test',password:env.HOSTED_CLINIC_DEMO_PASSWORD},'normal_owner_auth');assert.equal(r.status,200);assert.equal(r.json?.user?.id,CLINIC.owner);assert(typeof r.json.access_token==='string'&&r.json.access_token);const encoded='base64-'+Buffer.from(JSON.stringify(r.json)).toString('base64');cookies=encoded.match(/.{1,3180}/g).map((v,i,a)=>`sb-${CLINIC.project}-auth-token${a.length>1?'.'+i:''}=${v}`).join('; ');},
  async read({recovery=false}={}){assert(cookies);if(recovery)assert.equal(writeAttempts,1);const query=recovery&&sensitiveReadback?EDITING:'';const r=await request(new URL(PACKET+query,config.origin).href,'GET',undefined,recovery?'draft_recovery_get':'current_packet_get');assert.equal(r.status,200);assert.equal(r.json?.ok,true);if(!recovery){assert.equal(writeAttempts,0);model=structuredClone(r.json);}return r.json;},
  async save(body){assert(cookies&&model);assert.equal(writeAttempts,0,'no replay after any attempted save');const plan=planClinicUnverifiedSave(model);assert(isDeepStrictEqual(body,plan.body),'only current exact fixture/CAS body');writeAttempts=1;
   await checkpoint({phase:'before_unverified_save',expectedRevision:model.revision,payloadSha256:plan.payloadSha256,questionIdsSha256:plan.questionIdsSha256,newAnswerCount:plan.newAnswerCount,originalPrefillCount:Object.keys(plan.prefills).length,verify:false,customerWriteAttempts:1});
   sensitiveReadback=body.editingFact==='social_security_number';const r=await request(new URL(PACKET,config.origin).href,'POST',body,'unverified_save_response');assert.equal(r.status,200);assert.equal(r.json?.ok,true);assertClinicUnverifiedReadback(model,plan,r.json);return r.json;
  }
 };
}
export async function saveExistingClinicDraft(config,native,io){
 admitClinic(config,native);assertConsumerPurposeRelease(await io.release(),'clinic_deploy');await io.login();const before=await io.read();const plan=planClinicUnverifiedSave(before);await io.save(plan.body);const after=await io.read({recovery:true});return {schema:'saved-clinic-unverified-draft-save/v1',status:'DRAFT_SAVED_OWNER_RECOVERED_STOP_BEFORE_VERIFICATION',applicationSha:CLINIC.app,workerDigest:CLINIC.digest,normalOwnerExact:true,...assertClinicUnverifiedReadback(before,plan,after),payloadSha256:plan.payloadSha256,questionIdsSha256:plan.questionIdsSha256,customerWriteAttempts:1,finalVerification:false,funding:false,enqueue:false,checkout:false,recordClarification:clinicClarificationResponse(after)};
}
