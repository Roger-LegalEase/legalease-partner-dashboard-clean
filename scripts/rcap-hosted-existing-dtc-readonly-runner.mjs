#!/usr/bin/env node
// Saved-case reconciliation only. No purchase, verification, enqueue or worker port exists.
import assert from 'node:assert/strict';
import {RECOVERY,admitDtcRecoveryChain} from './rcap-hosted-configured-recovery-admission.mjs';
import {assertConsumerPurposeRelease} from './rcap-hosted-consumer-purpose-release.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {DTC as ORIGINAL_DTC,assertMatter,matterQuery} from './rcap-hosted-existing-dtc-continuation.mjs';
export const SAVED_DTC=Object.freeze({...ORIGINAL_DTC,app:RECOVERY.app,worker:RECOVERY.worker,digest:RECOVERY.digest});
const DTC=SAVED_DTC;
async function managementSingleRow(response){assert(response.status===200||response.status===201);const rows=await response.json();assert(Array.isArray(rows)&&rows.length===1&&rows[0]!==null&&typeof rows[0]==='object'&&!Array.isArray(rows[0]));return rows[0];}
const sha=x=>createHash('sha256').update(x).digest('hex');
export const PINS=Object.freeze({app:'c0052e13d9801d24080275aab02c70c6ea213fa3',tools:'987d0c9df170641a9abe40f0d5ec450e740abaa1',controller:'3bcfda1b814b7499d29cfa2817af2373493b68b6',creationRun:40441747499});
export function admit(config,native){
 assert.equal(config.creationRun,PINS.creationRun);assert.equal(config.toolsSha,PINS.tools);assert.equal(config.controllerSha,PINS.controller);
 const u=new URL(config.origin);assert.equal(u.origin,config.origin);assert.equal(u.protocol,'https:');assert(u.hostname.endsWith('.vercel.app'));
 const d=native.deployment;assert.equal(native.schemaVersion,'saved-dtc-accepted-recovery-view/v1');assert.equal(native.creatorFailed,true);assert.equal(native.recoveryPassed,true);assert.equal(native.creationRun,40441747499);assert.equal(native.recoveryRun,40446715593);assert.equal(native.recoveryReceiptSha256,config.recoveryBinding.recoverySha256);assert.match(native.recoveryReceiptSha256,/^[a-f0-9]{64}$/);assert.equal(native.applicationSha,PINS.app);assert.equal(native.acceptanceProjectRef,DTC.project);
 assert.equal(native.previewUrl,config.origin);assert.equal(native.aliasAssignment?.hostname,u.hostname);assert.equal(native.aliasAssignment?.deploymentId,config.deploymentId);assert.equal(native.aliasAssignment?.passed,true);assert(native.aliasAssignment.target===null||native.aliasAssignment.target==='preview');assert.equal(d.id,config.deploymentId);assert.match(d.id,/^dpl_[A-Za-z0-9]+$/);assert.notEqual(d.id,DTC.closedDeployment);
 assert.equal(d.readyState,'READY');assert(d.target===null||d.target==='preview');assert.equal(d.gitSourceSha,PINS.app);
 const m=d.metadata;for(const [k,v]of Object.entries({rcapApplicationSha:PINS.app,rcapWorkerSourceSha:DTC.worker,rcapWorkerDigest:DTC.digest,rcapAcceptanceProjectRef:DTC.project,rcapStripeConfigured:'true',rcapCatalogProduct:DTC.product,rcapRouteState:'staging_scoped',rcapStagingScopeSha256:sha(DTC.owner),rcapReturnOrigin:config.origin,rcapConfiguredSandbox:'true',rcapClinicDemoMode:'none'}))assert.equal(m[k],v,k);
 assert.equal(config.savedCaseSha256,sha(DTC.item));
}
export function allowedRequest(config,url,method){
 const u=new URL(url);if(u.username||u.password||u.hash)return false;
 if(method==='POST')return u.origin===`https://${DTC.project}.supabase.co`&&u.pathname==='/auth/v1/token'&&u.search==='?grant_type=password';
 if(method!=='GET'||u.origin!==config.origin)return false;
 return (u.pathname==='/api/rcap/release'&&!u.search)||(u.pathname===`/api/expungement-ai/briefcase/${DTC.item}/packet-information`&&!u.search);
}
export async function reconcile(config,native,io){
 admit(config,native);await io.checkpoint({phase:'admitted',creationRun:PINS.creationRun,customerWrites:0});
 const release=await io.get('/api/rcap/release');assertConsumerPurposeRelease(release,'configured_sandbox_preview');
 await io.checkpoint({phase:'owner_login',releaseHttp:release.status,customerWrites:0});await io.login();await io.checkpoint({phase:'packet_information_get',customerWrites:0});const info=await io.get(`/api/expungement-ai/briefcase/${DTC.item}/packet-information`);assert.equal(info.status,200);assert.equal(info.json.ok,true);assert.equal(info.json.revision,8);
 await io.checkpoint({phase:'exact_saved_state_read',packetInformationHttp:info.status,customerWrites:0});const state=await io.readMatter();const baseline={item:DTC.item,owner:DTC.owner,revision:8,verificationHash:state.verification_hash,route:{pathwayId:state.route?.pathwayId,jurisdiction:state.route?.jurisdiction,profileVersion:state.route?.profileVersion,selectedTrackId:state.route?.selectedTrackId}};assert.equal(sha(JSON.stringify(baseline)),'8d77d260e07c810584cc23976aaaaf598452ca6002e399f24fa8bcfc80fb5e73','original exact rev8 baseline binding');assertMatter(state,baseline);
 const payment=['unpaid','paid','not_applicable'].includes(state.payment_status)?state.payment_status:'other';
 assert(Number.isInteger(state.job_count)&&state.job_count>=0);
 const prior=await io.priorReceipts();assert(Array.isArray(prior)&&prior.every(x=>['checkout-created','provider-paid','queued'].includes(x)));
 const result={phase:'reconciled_stop',releaseHttp:release.status,ordinaryAdminSourceBound:false,creationRun:PINS.creationRun,creatorConclusion:'failure',recoveryRun:40446715593,recoveryReceiptSha256:native.recoveryReceiptSha256,applicationSha:PINS.app,toolsSha:PINS.tools,workerDigest:DTC.digest,matterQuerySha256:sha(matterQuery()),ownerExact:true,savedCaseExact:true,revision:8,verificationHashMatches:true,routeMatches:true,packetInformationHttp:info.status,answerCount:Object.keys(info.json.answers??{}).length,paymentState:payment,checkoutSessionPresent:typeof state.checkout_session_id==='string'&&state.checkout_session_id.length>0,providerEventPresent:typeof state.provider_event_id==='string'&&state.provider_event_id.length>0,jobCount:state.job_count,priorReceiptLabels:prior,requiresExistingObjectRecovery:payment==='paid'||!!state.checkout_session_id||state.job_count>0||prior.length>0,checkoutAllowed:false,customerWrites:0};
 await io.checkpoint(result);return result;
}
export async function runtime(config,env,checkpoint,fetcher=fetch){
 let authPosts=0;let cookies='';
 const request=async(url,method='GET',body)=>{
  assert(allowedRequest(config,url,method),'request outside read-only boundary');
  if(method==='POST')assert.equal(++authPosts,1,'one normal owner login only');
  const u=new URL(url);const app=u.origin===config.origin;
  const r=await fetcher(url,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:app?{'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET,...(cookies?{Cookie:cookies}:{})}:{apikey:env.SUPABASE_ANON_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,json:await r.json()};
 };
 for(const key of ['VERCEL_AUTOMATION_BYPASS_SECRET','SUPABASE_ANON_KEY','SUPABASE_ACCESS_TOKEN','DTC_OWNER_EMAIL','DTC_OWNER_PASSWORD'])assert(env[key]?.trim(),key+' missing from existing custody');
 return {checkpoint,get:p=>request(new URL(p,config.origin).href),async login(){
  const r=await request(`https://${DTC.project}.supabase.co/auth/v1/token?grant_type=password`,'POST',{email:env.DTC_OWNER_EMAIL,password:env.DTC_OWNER_PASSWORD});assert.equal(r.status,200);assert.equal(r.json.user?.id,DTC.owner);
  const value='base64-'+Buffer.from(JSON.stringify(r.json)).toString('base64');cookies=value.match(/.{1,3180}/g).map((v,i,a)=>`sb-${DTC.project}-auth-token${a.length>1?'.'+i:''}=${v}`).join('; ');
 },async readMatter(){
  // Exact original accepted SQL read port; never use owner service impersonation.
  const r=await fetcher(`https://api.supabase.com/v1/projects/${DTC.project}/database/query`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:matterQuery()})});return managementSingleRow(r);
 },async priorReceipts(){const raw=await fs.readFile(config.priorReceiptInventoryFile);assert.equal(sha(raw),config.priorReceiptInventorySha256);const inventory=JSON.parse(raw);assert.equal(inventory.schema,'saved-dtc-local-receipt-inventory/v1');assert.equal(inventory.savedCaseSha256,sha(DTC.item));return inventory.receiptLabels;}};
}
export async function loadRecoveryView(config){return admitDtcRecoveryChain({binding:config.recoveryBinding,creatorBytes:await fs.readFile(config.creatorNativeFile),creatorRun:JSON.parse(await fs.readFile(config.creatorRunFile)),recoveryBytes:await fs.readFile(config.recoveryFile),recoveryRun:JSON.parse(await fs.readFile(config.recoveryRunFile))});}
export async function main(argv=process.argv.slice(2),env=process.env){
 assert.equal(argv.length,1);assert.equal((await fs.stat(argv[0])).mode&0o777,0o600);const bytes=await fs.readFile(argv[0]);const config=JSON.parse(bytes);assert(path.isAbsolute(config.evidenceFile));assert.equal((await fs.stat(path.dirname(config.evidenceFile))).mode&0o777,0o700);const native=await loadRecoveryView(config);admit(config,native);
 // Output is explicitly typed; raw config, native, response, session and PDF never leave memory.
 const checkpoint=async value=>{const file=await fs.open(config.evidenceFile,'wx',0o600);try{await file.writeFile(JSON.stringify(value)+'\n');}finally{await file.close();}};
 let last={phase:'before_admission',customerWrites:0};const io=await runtime(config,env,async v=>{last=v;});
 try{const result=await reconcile(config,native,io);await checkpoint(result);return result;}catch(e){await checkpoint({phase:last.phase,status:'held',errorClass:['AssertionError','TimeoutError','TypeError'].includes(e.name)?e.name:'Error',customerWrites:0});throw new Error('Saved DTC read-only reconciliation held');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(()=>console.log('Saved DTC read-only checkpoint written.')).catch(()=>{console.error('Saved DTC read-only reconciliation held; preserve typed checkpoint.');process.exitCode=1;});
