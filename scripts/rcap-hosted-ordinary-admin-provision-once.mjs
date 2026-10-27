import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ORIGIN,readPinnedAdminCredentials,requestAllowed,blockedRequestClass,summarizeReadback} from './rcap-hosted-ordinary-admin-readonly.mjs';
export {ORIGIN};
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const UID='6574d21e-5e0a-4567-b14e-01447c162f37';
const TARGET='/internal/partners/onboarding/legalease-ordinary-qa-20261024';
const API='/api/internal/partners/onboarding/phase1/legalease-ordinary-qa-20261024';
const PROVISION='/api/internal/partners/provisioning';
// Minimal existing internal-QA operation data only; no private approval or participant record.
export const PROVISION_BODY=Object.freeze({
  "operatingModel": "legalease_managed",
  "organizationName": "LegalEase",
  "legalOrganizationName": "LegalEase",
  "partnerSlug": "legalease-ordinary-qa-20261024",
  "programName": "LegalEase ordinary RCAP QA",
  "programPurpose": "Authorized acceptance test of normal ordinary record-clearing access and one sponsored packet.",
  "administratorName": "",
  "administratorEmail": "",
  "clearanceReason": "User-authorized Platform Admin internal RCAP program and one test packet allocation; no external agreement or partner review applies.",
  "jurisdictions": [
    "MS"
  ],
  "enableSpanish": false,
  "website": "",
  "template": "screening-standard-v1",
  "idempotencyKey": "f148c913-f2ec-457e-967b-c425e5945268"
});
Object.freeze(PROVISION_BODY.jurisdictions);
export const bodyHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const PROVISION_BODY_HASH='8b1f1fa43e8ef1fc6721cbef7d6cfcebaee515e9fed61978b3bc713346000632';
export function assertProvisionBody(value){assert.deepEqual(value,PROVISION_BODY);assert.equal(bodyHash(PROVISION_BODY),PROVISION_BODY_HASH);}
const CODES=new Set(['feature_disabled','workspace_not_found','unauthenticated','forbidden','persistence_failed','storage_failed','invalid_input','revision_conflict','request_in_progress','duplicate_request','invalid_transition','commercially_blocked','required_asset_missing','not_configured','slug_conflict','ambiguous_existing_records','idempotency_conflict','write_failed']);
export function safeCode(body){return CODES.has(body?.code)?body.code:null;}
export function provisionRequestAllowed(url,method,body,{authPosts,provisionPosts,admitted,exactAdmin,missing,originHeader}){
 if(requestAllowed(url,method,authPosts))return true;
 if(!admitted||!exactAdmin||!missing||provisionPosts!==0||method!=='POST'||originHeader!==ORIGIN)return false;
 let u;try{u=new URL(url);}catch{return false;}
 if(u.href!==ORIGIN+PROVISION)return false;
 try{assertProvisionBody(body);return true;}catch{return false;}
}
export function absentReadbacks(rows){return rows.length===2&&rows.every(r=>r.status===404&&r.code==='workspace_not_found');}
export function summarizeProvision(status,body){
 const r=body?.result;
 return {status,code:safeCode(body),ok:body?.ok===true,created:r?.created===true,replayed:r?.replayed===true,targetPartner:r?.partnerSlug===PROVISION_BODY.partnerSlug,expectedOrganization:r?.organizationName===PROVISION_BODY.organizationName,expectedProgram:r?.programName===PROVISION_BODY.programName,administratorBlank:r?.administratorName===''&&r?.administratorEmail==='',private:r?.publicationState==='private',inactive:r?.programActivationState==='inactive'&&r?.participantIntakeState==='inactive',noAllocation:r?.allocationState==='absent',noBilling:r?.billingState==='absent',noAccessCode:r?.accessCodeState==='absent',noLaunch:r?.launchedAt===null,noAuthCreated:r?.authUserCreated===false,noMembership:r?.membershipCreated===false,noInvitation:r?.invitationCreated===false};
}
export async function provisionOrdinaryOnce({context,admit,checkpoint,bypass,credentialReader=readPinnedAdminCredentials,body=PROVISION_BODY}){
 assertProvisionBody(body);assert.equal(typeof checkpoint,'function');assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));
 const admission=await admit({applicationSha:'c0052e13d9801d24080275aab02c70c6ea213fa3',origin:ORIGIN,operation:'normal-admin-provision-once',bodyHash:PROVISION_BODY_HASH});assert.equal(admission?.confirmedAbsent,true);
 let authPosts=0,provisionPosts=0,blocked=0,missing=false,exactExistingAdmin=null,credentials,phase='release_get',observedHttpStatus=null;const blockedRequests={},httpStatuses={};
 const mark=(name,status=null)=>{phase=name;observedHttpStatus=status;if(status!==null)httpStatuses[name]=status;};
 const guard=async route=>{const r=route.request();let requestBody=null;try{requestBody=r.postDataJSON();}catch{}
  if(!provisionRequestAllowed(r.url(),r.method(),requestBody,{authPosts,provisionPosts,admitted:true,exactAdmin:exactExistingAdmin===true,missing,originHeader:r.headers().origin})){blocked++;const k=blockedRequestClass(r.url(),r.method());blockedRequests[k]=(blockedRequests[k]??0)+1;await route.abort();return;}
  if(r.method()==='POST'){if(new URL(r.url()).origin===AUTH)authPosts++;else provisionPosts++;}
  const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(r.url()).origin===ORIGIN){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}await route.continue({headers});};
 await context.route('**/*',guard);
 await context.addInitScript(()=>window.addEventListener('submit',event=>{const f=event.target;if(location.pathname==='/expungement-ai/sign-in'&&f instanceof HTMLFormElement&&f.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
 const page=await context.newPage();
 const state=()=>({phase,observedHttpStatus,httpStatuses,exactExistingAdmin,authPosts,provisionPosts,blocked,blockedRequests,bodyHash:PROVISION_BODY_HASH});
 const read=async label=>{const rows=[];for(const [kind,url]of [['configuration',API+'/configuration'],['program',API+'/program']]){mark(label+'_'+kind+'_get');const r=await page.evaluate(async path=>{const response=await fetch(path,{cache:'no-store',redirect:'manual'});let body=null;try{body=await response.json();}catch{}return{status:response.status,body};},url);mark(label+'_'+kind+'_get',r.status);const v=kind==='configuration'?r.body?.configuration?.version:r.body?.operations?.identity?.version;rows.push({...summarizeReadback(kind,r.status,r.body),code:safeCode(r.body),sourceVersion:Number.isSafeInteger(v)&&v>=0?v:null});}return rows;};
 try{
  const releaseResponse=await page.goto(ORIGIN+'/api/rcap/release',{waitUntil:'domcontentloaded'});mark('release_get',releaseResponse.status());assert.equal(releaseResponse.status(),200);const release=await releaseResponse.json();assert.equal(release.application,'RCAP 2.0');assert.equal(release.policyVersion,'rcap2.2');assert.equal(release.buildSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(release.runtimeSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(release.sourceBound,true);
  mark('sign_in_page');const login=await page.goto(`${ORIGIN}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`,{waitUntil:'domcontentloaded'});mark('sign_in_page',login?.status()??null);mark('sign_in_handler_ready');await page.locator('form[data-handler-ready="true"]').waitFor({state:'attached'});
  mark('credential_input');credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;
  mark('sign_in_submit');const token=page.waitForResponse(r=>r.url().startsWith(`${AUTH}/auth/v1/token?`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await token;mark('auth_grant',response.status());assert.equal(response.status(),200);const authBody=await response.json();exactExistingAdmin=authBody.user?.id===UID;assert.equal(exactExistingAdmin,true);
  mark('briefcase_redirect');await page.waitForURL(u=>u.origin===ORIGIN&&u.pathname==='/briefcase');
  const before=await read('before');missing=absentReadbacks(before);
  if(!missing){await checkpoint({stage:'ordinary_provision_readonly_stop',...state(),before,customerWrites:0});return{outcome:'readonly_reconcile',before};}
  await checkpoint({stage:'ordinary_provision_submission_pending',...state(),before,customerWrites:0});
  mark('provision_post');const observed=await page.evaluate(async input=>{const response=await fetch(input.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input.body),redirect:'manual'});let body=null;try{body=await response.json();}catch{}return{status:response.status,body};},{path:PROVISION,body});mark('provision_post',observed.status);
  const provision=summarizeProvision(observed.status,observed.body);await checkpoint({stage:'ordinary_provision_response',...state(),provision,customerWrites:provisionPosts});
  if(observed.status!==200||!provision.ok||!provision.targetPartner||!provision.expectedOrganization||!provision.expectedProgram||!provision.administratorBlank||!provision.private||!provision.inactive||!provision.noAllocation||!provision.noBilling||!provision.noAccessCode||!provision.noLaunch||!provision.noAuthCreated||!provision.noMembership||!provision.noInvitation||!provision.created||provision.replayed){await checkpoint({stage:'ordinary_provision_reconcile',...state(),provision,customerWrites:provisionPosts});return{outcome:'provision_reconcile',provision};}
  const after=await read('after');await checkpoint({stage:'ordinary_provision_readback',...state(),provision,after,customerWrites:provisionPosts});return{outcome:'provisioned_readback',provision,after};
 }catch(error){await checkpoint({stage:'ordinary_provision_failed',...state(),errorClass:error?.name??'Error',customerWrites:provisionPosts});throw new Error('Ordinary provisioning attempt stopped; reconcile its fixed request before any continuation.');}
 finally{credentials=null;await context.close();}
}
