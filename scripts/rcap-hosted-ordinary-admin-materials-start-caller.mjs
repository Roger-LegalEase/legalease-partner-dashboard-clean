import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ORIGIN,readPinnedAdminCredentials,requestAllowed,blockedRequestClass,summarizeReadback} from './rcap-hosted-ordinary-admin-readonly.mjs';
import {APP,SLUG,ROOT,ALLOCATION_REQUEST} from './rcap-hosted-ordinary-admin-postprovision.mjs';
import {nextMaterialsStartStep,createMaterialsStartGate} from './rcap-hosted-ordinary-admin-materials-start.mjs';
export {ORIGIN};
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const UID='6574d21e-5e0a-4567-b14e-01447c162f37';
const TARGET='/internal/partners/onboarding/'+SLUG;
const CODES=new Set(['feature_disabled','workspace_not_found','unauthenticated','forbidden','persistence_failed','storage_failed','invalid_input','revision_conflict','request_in_progress','duplicate_request','invalid_transition','commercially_blocked','required_asset_missing']);
export const safeCode=body=>CODES.has(body?.code)?body.code:null;
export const safeApiError=(status,body)=>{const errorPresent=Boolean(body?.code||body?.error||body?.message||body?.preparationError);return{errorClass:status>=500?'server_failure':status>=400?'request_refused':errorPresent?'application_error':'none',code:safeCode(body),errorPresent,errorFingerprint:errorPresent||status>=400?createHash('sha256').update(JSON.stringify({code:body?.code??null,error:body?.error??null,message:body?.message??null,preparationError:body?.preparationError??null})).digest('hex'):null};};
export function qualifyConfigureReceipt(bundle){
 const {result,allocationBefore,allocationResponse,allocationState}=bundle;
 for(const r of [result,allocationBefore,allocationResponse,allocationState]){assert.equal(r.applicationSha,APP);assert.equal(r.deploymentId,'dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF');assert.equal(r.exactExistingAdmin,true);}
 assert.equal(result.stage,'ordinary_configure_capacity_stop');assert.equal(result.forwards.configuration_save,1);assert.equal(result.forwards.allocation,1);assert.equal(result.customerWrites,2);assert.equal(result.authPosts,1);
 assert.equal(allocationBefore.stage,'allocation_before_forward');assert.equal(allocationBefore.request.stage,'allocation');assert.equal(allocationBefore.request.requestId,ALLOCATION_REQUEST);assert.ok(Number.isSafeInteger(allocationBefore.request.expectedVersion)&&allocationBefore.request.expectedVersion>=1);assert.equal(allocationBefore.capacityProofKind,'fresh_provision_no_allocation');assert.equal(allocationBefore.receiptRun,'40433891473');
 assert.equal(allocationResponse.stage,'allocation_response');assert.equal(allocationResponse.observedHttpStatus,200);assert.equal(allocationResponse.allocationConfirmed,true);assert.equal(allocationResponse.requestGuardRefused,false);
 assert.equal(allocationState.stage,'allocation_actual_readback');assert.deepEqual(result.lastRead,allocationState.lastRead);
 const c=result.lastRead.find(x=>x.kind==='configuration'),p=result.lastRead.find(x=>x.kind==='program');
 assert.equal(c.status,200);assert.equal(p.status,200);for(const key of ['configurationPresent','expectedPartner','managed','policyCurrent','sponsoredPackets','online','openAccess'])assert.equal(c[key],true);assert.equal(p.operationsPresent,true);assert.equal(p.expectedPartner,true);assert.equal(p.live,false);assert.equal(p.screenings,1);assert.equal(p.packets,1);assert.ok(Number.isSafeInteger(c.sourceVersion)&&c.sourceVersion>=1);assert.equal(p.sourceVersion,c.sourceVersion);return c.sourceVersion;
}
/** Actual later operations only, gated by the completed current Configure/capacity receipts. */
export async function materialsStart({context,admit,checkpoint,bypass,configureReceipts,credentialReader=readPinnedAdminCredentials}){
 const initialVersion=qualifyConfigureReceipt(configureReceipts);await admit({applicationSha:APP,origin:ORIGIN,operation:'normal-admin-materials-start',configureRun:'40438747490'});assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));
 let authPosts=0,blocked=0,phase='release_get',observedHttpStatus=null,exactExistingAdmin=null,active=null,lastRead=null,credentials;const blockedRequests={},httpStatuses={},forwards={};let materialAssetPaths=new Set();
 const mark=(name,status=null)=>{phase=name;observedHttpStatus=status;if(status!==null)httpStatuses[name]=status;};
 const state=()=>({phase,observedHttpStatus,httpStatuses,exactExistingAdmin,authPosts,forwards:{...forwards},blocked,blockedRequests,lastRead,customerWrites:Object.values(forwards).reduce((a,b)=>a+b,0)});
 const guard=async route=>{const r=route.request();let allowed=requestAllowed(r.url(),r.method(),authPosts);const u=new URL(r.url());if(allowed&&['GET','HEAD'].includes(r.method())&&u.origin===ORIGIN&&u.pathname.startsWith(ROOT+'/assets/'))allowed=materialAssetPaths.has(u.pathname)&&u.search==='';
  if(!allowed&&active&&r.method()==='POST'&&r.url()===ORIGIN+active.plan.endpoint){
   try{const body=r.postDataJSON();await active.gate({url:r.url(),method:r.method(),body,originHeader:r.headers().origin});forwards[active.plan.stage]=(forwards[active.plan.stage]??0)+1;allowed=true;}catch{active.refused=true;}
  }
  if(!allowed){blocked++;const k=blockedRequestClass(r.url(),r.method());blockedRequests[k]=(blockedRequests[k]??0)+1;await route.abort();return;}
  if(r.method()==='POST'&&new URL(r.url()).origin===AUTH)authPosts++;
  const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];if(new URL(r.url()).origin===ORIGIN){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}await route.continue({headers});};
 await context.route('**/*',guard);
 await context.addInitScript(()=>window.addEventListener('submit',event=>{const f=event.target;if(location.pathname==='/expungement-ai/sign-in'&&f instanceof HTMLFormElement&&f.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
 const page=await context.newPage();
 const read=async label=>{const rows={},typed=[];for(const kind of ['configuration','program']){mark(label+'_'+kind+'_get');const r=await page.evaluate(async path=>{const response=await fetch(path,{cache:'no-store',redirect:'manual'});let body=null;try{body=await response.json();}catch{}return{status:response.status,body};},ROOT+'/'+kind);mark(label+'_'+kind+'_get',r.status);const v=kind==='configuration'?r.body?.configuration?.version:r.body?.operations?.identity?.version;typed.push({...summarizeReadback(kind,r.status,r.body),code:safeCode(r.body),sourceVersion:Number.isSafeInteger(v)?v:null});rows[kind]=r;}lastRead=typed;for(const r of Object.values(rows))assert.equal(r.status,200);const snapshot={configuration:rows.configuration.body.configuration,operations:rows.program.body.operations};materialAssetPaths=new Set((snapshot.operations?.view?.materials??[]).map(m=>m.document?.pagePreview?.logo?.assetId).filter(id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id)).map(id=>ROOT+'/assets/'+id));return snapshot;};
 const finish=async(reason,nextStage)=>{await checkpoint('result.json',{stage:'ordinary_materials_start_stop',reason,nextStage:nextStage??null,...state(),participantVerificationAllowed:false});return{reason,nextStage};};
 try{
  const releaseResponse=await page.goto(ORIGIN+'/api/rcap/release',{waitUntil:'domcontentloaded'});mark('release_get',releaseResponse.status());assert.equal(releaseResponse.status(),200);const release=await releaseResponse.json();assert.equal(release.application,'RCAP 2.0');assert.equal(release.policyVersion,'rcap2.2');assert.equal(release.buildSha,APP);assert.equal(release.runtimeSha,APP);assert.equal(release.sourceBound,true);
  mark('sign_in_page');const login=await page.goto(`${ORIGIN}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`,{waitUntil:'domcontentloaded'});mark('sign_in_page',login?.status()??null);mark('sign_in_handler_ready');await page.locator('form[data-handler-ready="true"]').waitFor({state:'attached'});
  mark('credential_input');credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;
  mark('sign_in_submit');const token=page.waitForResponse(r=>r.url().startsWith(`${AUTH}/auth/v1/token?`)&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const auth=await token;mark('auth_grant',auth.status());assert.equal(auth.status(),200);const session=await auth.json();exactExistingAdmin=session.user?.id===UID;assert.equal(exactExistingAdmin,true);await page.waitForURL(u=>u.origin===ORIGIN&&u.pathname==='/briefcase');
  let snapshot=await read('initial');assert.equal(snapshot.configuration.version,initialVersion);assert.equal(snapshot.operations.identity.version,initialVersion);
  await checkpoint('initial.json',{stage:'ordinary_materials_start_initial',...state(),initialVersion,receiptRun:'40438747490',participantVerificationAllowed:false});
  const proof={kind:'original_one_plus_one_confirmed',partnerSlug:SLUG,workspaceId:snapshot.configuration.workspaceId,requestId:ALLOCATION_REQUEST,confirmed:true,screeningsAllowed:1,packetCap:1,noInterveningCapacityStep:true};
  for(let count=0;count<3;count++){
   let plan=nextMaterialsStartStep({...snapshot,capacityProof:proof});
   if(plan.kind!=='operation'&&plan.kind!=='read_current_materials')return await finish(plan.reason??plan.kind,plan.stage);
   const stage=plan.kind==='read_current_materials'?'start':plan.stage;if(!['materials_prepare','start'].includes(stage))return await finish('unexpected_prior_stage',stage);
   if(forwards[stage])return await finish('same_stage_not_satisfied_after_forward',stage);
   mark(stage+'_dom_load');const nav=await page.goto(ORIGIN+TARGET,{waitUntil:'domcontentloaded'});mark(stage+'_dom_load',nav?.status()??null);assert.equal(nav?.status(),200);
   let review;
   if(stage==='start'){
    mark('actual_material_dom_review');const rows=[];
    for(const m of plan.materials){const node=page.locator(`[data-material-id="${m.id}"]`);await node.waitFor({state:'visible'});const text=(await node.innerText()).trim();rows.push({id:await node.getAttribute('data-material-id'),attributeVersion:Number(await node.getAttribute('data-material-version')),attributeHash:await node.getAttribute('data-material-hash'),visible:await node.isVisible(),textLength:text.length,textSha256:createHash('sha256').update(text).digest('hex')});}
    review={actualContentRead:true,sourceVersion:snapshot.operations.view.version,scopeHash:snapshot.operations.view.decision.scopeHash,reviewToken:snapshot.operations.view.reviewToken,rows};
    plan=nextMaterialsStartStep({...snapshot,capacityProof:proof},review);assert.equal(plan.kind,'operation');assert.equal(plan.stage,'start');await checkpoint('material-review.json',{stage:'actual_current_material_dom_review',...state(),review:plan.reviewSummary,participantVerificationAllowed:false});
   }
   const admitted=createMaterialsStartGate({...snapshot,capacityProof:proof},review,{checkpoint:async witness=>checkpoint(stage+'-before.json',{stage:stage+'_before_forward',...state(),request:witness,receiptRun:'40438747490',participantVerificationAllowed:false})});
   active={plan:admitted.plan,refused:false,gate:admitted.gate};plan=admitted.plan;
   mark(stage+'_request_id');const requestId=await page.evaluate(()=>crypto.randomUUID());
   mark(stage+'_submit');const response=await page.evaluate(async input=>{const r=await fetch(input.path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input.body),redirect:'manual'});let body=null;try{body=await r.json();}catch{}return{status:r.status,body};},{path:plan.endpoint,body:{...plan.body,requestId}});
   mark(stage+'_response',response.status);const refused=active.refused;active=null;
   await checkpoint(stage+'-response.json',{stage:stage+'_response',...state(),...safeApiError(response.status,response.body),operationsPresent:Boolean(response.body?.operations),reportedLive:response.body?.operations?.view?.decision?.live===true,requestGuardRefused:refused,participantVerificationAllowed:false});
   if(refused||forwards[stage]!==1||response.status!==200||safeApiError(response.status,response.body).errorClass!=='none'||!response.body?.operations)return await finish('operation_response_requires_reconciliation',stage);
   snapshot=await read('after_'+stage);await checkpoint(stage+'-state.json',{stage:stage+'_actual_readback',...state(),participantVerificationAllowed:false});
  }
  return await finish('bounded_stage_limit_stop');
 }catch(error){active=null;await checkpoint('result.json',{stage:'ordinary_materials_start_failed',...state(),errorClass:error?.name??'Error',participantVerificationAllowed:false});throw new Error('Ordinary materials/Start stopped; reconcile persisted exact requests before continuation.');}
 finally{credentials=null;await context.close();}
}
