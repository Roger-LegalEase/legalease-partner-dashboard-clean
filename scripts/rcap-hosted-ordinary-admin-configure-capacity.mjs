import assert from 'node:assert/strict';
import {ORIGIN,readPinnedAdminCredentials,requestAllowed,blockedRequestClass,summarizeReadback} from './rcap-hosted-ordinary-admin-readonly.mjs';
import {APP,SLUG,ROOT,AUTHORITY,ALLOCATION_REQUEST,nextPostProvisionStep,createStepRequestGate} from './rcap-hosted-ordinary-admin-postprovision.mjs';
export {ORIGIN};
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const UID='6574d21e-5e0a-4567-b14e-01447c162f37';
const TARGET='/internal/partners/onboarding/'+SLUG;
const CODES=new Set(['feature_disabled','workspace_not_found','unauthenticated','forbidden','persistence_failed','storage_failed','invalid_input','revision_conflict','request_in_progress','duplicate_request','invalid_transition','commercially_blocked','required_asset_missing']);
export const safeCode=body=>CODES.has(body?.code)?body.code:null;
export function qualifyProvisionReceipt(r){
 assert.equal(r.applicationSha,APP);assert.equal(r.deploymentId,'dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF');assert.equal(r.stage,'ordinary_provision_readback');assert.equal(r.exactExistingAdmin,true);assert.equal(r.provisionPosts,1);assert.equal(r.bodyHash,'8b1f1fa43e8ef1fc6721cbef7d6cfcebaee515e9fed61978b3bc713346000632');
 for(const key of ['ok','created','targetPartner','administratorBlank','private','inactive','noAllocation','noBilling','noAccessCode','noLaunch','noAuthCreated','noMembership','noInvitation'])assert.equal(r.provision[key],true);assert.equal(r.provision.replayed,false);
 const c=r.after.find(x=>x.kind==='configuration'),p=r.after.find(x=>x.kind==='program');assert.equal(c.status,200);assert.equal(p.status,200);assert.equal(c.sourceVersion,3);assert.equal(p.sourceVersion,3);assert.equal(c.sponsoredPackets,false);assert.equal(p.live,false);return c.sourceVersion;
}
/** Current carrier stops after Configure/Save and the original 1+1 allocation. */
export async function configureCapacity({context,admit,checkpoint,bypass,provisionResult,credentialReader=readPinnedAdminCredentials}){
 const initialVersion=qualifyProvisionReceipt(provisionResult);await admit({applicationSha:APP,origin:ORIGIN,operation:'normal-admin-configure-capacity',provisionRun:'40433891473'});assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));
 let authPosts=0,blocked=0,phase='release_get',observedHttpStatus=null,exactExistingAdmin=null,active=null,lastRead=null,credentials;const blockedRequests={},httpStatuses={},forwards={};
 const mark=(name,status=null)=>{phase=name;observedHttpStatus=status;if(status!==null)httpStatuses[name]=status;};
 const state=()=>({phase,observedHttpStatus,httpStatuses,exactExistingAdmin,authPosts,forwards:{...forwards},blocked,blockedRequests,lastRead,customerWrites:Object.values(forwards).reduce((a,b)=>a+b,0)});
 const guard=async route=>{const r=route.request();let allowed=requestAllowed(r.url(),r.method(),authPosts);
  if(!allowed&&active&&r.method()==='POST'&&r.url()===ORIGIN+active.plan.endpoint){
   try{const body=r.postDataJSON();await active.gate({url:r.url(),method:r.method(),body,originHeader:r.headers().origin});forwards[active.plan.stage]=(forwards[active.plan.stage]??0)+1;allowed=true;}catch{active.refused=true;}
  }
  if(!allowed){blocked++;const k=blockedRequestClass(r.url(),r.method());blockedRequests[k]=(blockedRequests[k]??0)+1;await route.abort();return;}
  if(r.method()==='POST'&&new URL(r.url()).origin===AUTH)authPosts++;
  const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(r.url()).origin===ORIGIN){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}await route.continue({headers});};
 await context.route('**/*',guard);
 await context.addInitScript(()=>window.addEventListener('submit',event=>{const f=event.target;if(location.pathname==='/expungement-ai/sign-in'&&f instanceof HTMLFormElement&&f.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
 const page=await context.newPage();
 const read=async label=>{const rows={},typed=[];for(const kind of ['configuration','program']){mark(label+'_'+kind+'_get');const r=await page.evaluate(async path=>{const response=await fetch(path,{cache:'no-store',redirect:'manual'});let body=null;try{body=await response.json();}catch{}return{status:response.status,body};},ROOT+'/'+kind);mark(label+'_'+kind+'_get',r.status);const v=kind==='configuration'?r.body?.configuration?.version:r.body?.operations?.identity?.version;typed.push({...summarizeReadback(kind,r.status,r.body),code:safeCode(r.body),sourceVersion:Number.isSafeInteger(v)?v:null});rows[kind]=r;}lastRead=typed;for(const r of Object.values(rows))assert.equal(r.status,200);return{configuration:rows.configuration.body.configuration,operations:rows.program.body.operations};};
 const finish=async(reason,nextStage)=>{await checkpoint('result.json',{stage:'ordinary_configure_capacity_stop',reason,nextStage:nextStage??null,...state(),participantVerificationAllowed:false});return{reason,nextStage};};
 try{
  const releaseResponse=await page.goto(ORIGIN+'/api/rcap/release',{waitUntil:'domcontentloaded'});mark('release_get',releaseResponse.status());assert.equal(releaseResponse.status(),200);const release=await releaseResponse.json();assert.equal(release.application,'RCAP 2.0');assert.equal(release.policyVersion,'rcap2.2');assert.equal(release.buildSha,APP);assert.equal(release.runtimeSha,APP);assert.equal(release.sourceBound,true);
  mark('sign_in_page');const login=await page.goto(`${ORIGIN}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`,{waitUntil:'domcontentloaded'});mark('sign_in_page',login?.status()??null);mark('sign_in_handler_ready');await page.locator('form[data-handler-ready="true"]').waitFor({state:'attached'});
  mark('credential_input');credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;
  mark('sign_in_submit');const token=page.waitForResponse(r=>r.url().startsWith(`${AUTH}/auth/v1/token?`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const auth=await token;mark('auth_grant',auth.status());assert.equal(auth.status(),200);const session=await auth.json();exactExistingAdmin=session.user?.id===UID;assert.equal(exactExistingAdmin,true);await page.waitForURL(u=>u.origin===ORIGIN&&u.pathname==='/briefcase');
  let snapshot=await read('initial');assert.equal(snapshot.configuration.version,initialVersion);assert.equal(snapshot.operations.identity.version,initialVersion);
  await checkpoint('initial.json',{stage:'ordinary_configure_capacity_initial',...state(),initialVersion,receiptRun:'40433891473',participantVerificationAllowed:false});
  let proof={kind:'fresh_provision_no_allocation',partnerSlug:SLUG,workspaceId:snapshot.configuration.workspaceId,created:provisionResult.provision.created,noAllocation:provisionResult.provision.noAllocation,noInterveningCapacityStep:true};
  for(let count=0;count<3;count++){
   const plan=nextPostProvisionStep({...snapshot,capacityProof:proof});
   if(plan.kind!=='operation')return await finish(plan.reason??plan.kind,plan.stage);
   if(!['configuration_save','allocation'].includes(plan.stage))return await finish('configure_and_capacity_complete_stop_before_materials_start',plan.stage);
   if(forwards[plan.stage])return await finish('same_stage_not_satisfied_after_forward',plan.stage);
   mark(plan.stage+'_ui_load');const nav=await page.goto(ORIGIN+TARGET,{waitUntil:'domcontentloaded'});mark(plan.stage+'_ui_load',nav?.status()??null);assert.equal(nav?.status(),200);
   active={plan,refused:false,gate:createStepRequestGate(plan,{checkpoint:async witness=>checkpoint(plan.stage+'-before.json',{stage:plan.stage+'_before_forward',...state(),request:witness,capacityProofKind:proof.kind,receiptRun:'40433891473',participantVerificationAllowed:false})})};
   let response;
   if(plan.stage==='configuration_save'){
    mark('configuration_request_id');const requestId=await page.evaluate(()=>crypto.randomUUID());
    mark('configuration_save_submit');response=await page.evaluate(async input=>{const r=await fetch(input.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input.body),redirect:'manual'});let body=null;try{body=await r.json();}catch{}return{status:r.status,body};},{path:plan.endpoint,body:{...plan.body,requestId}});
   }else{
    assert.equal(plan.body.requestId,ALLOCATION_REQUEST);mark('allocation_submit');response=await page.evaluate(async input=>{const r=await fetch(input.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input.body),redirect:'manual'});let body=null;try{body=await r.json();}catch{}return{status:r.status,body};},{path:plan.endpoint,body:plan.body});
   }
   mark(plan.stage+'_response',response.status);const refused=active.refused;active=null;
   await checkpoint(plan.stage+'-response.json',{stage:plan.stage+'_response',...state(),code:safeCode(response.body),configurationPresent:Boolean(response.body?.configuration),allocationConfirmed:response.body?.success===true,preparationErrorPresent:Boolean(response.body?.preparationError),requestGuardRefused:refused,participantVerificationAllowed:false});
   if(refused||forwards[plan.stage]!==1||response.status!==200||(plan.stage==='configuration_save'?!response.body?.configuration:response.body?.success!==true))return await finish('operation_response_requires_reconciliation',plan.stage);
   snapshot=await read('after_'+plan.stage);await checkpoint(plan.stage+'-state.json',{stage:plan.stage+'_actual_readback',...state(),participantVerificationAllowed:false});
   if(plan.stage==='allocation')proof={kind:'original_one_plus_one_confirmed',partnerSlug:SLUG,workspaceId:snapshot.configuration.workspaceId,requestId:ALLOCATION_REQUEST,confirmed:true,screeningsAllowed:1,packetCap:1,noInterveningCapacityStep:true};
  }
  return await finish('bounded_stage_limit_stop');
 }catch(error){active=null;await checkpoint('result.json',{stage:'ordinary_configure_capacity_failed',...state(),errorClass:error?.name??'Error',participantVerificationAllowed:false});throw new Error('Ordinary configuration/capacity stopped; reconcile persisted exact requests before continuation.');}
 finally{credentials=null;await context.close();}
}
