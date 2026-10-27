import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {START_ONLY,createStartOnlyBrowserIo} from './rcap-hosted-ordinary-admin-start-only.mjs';
import {requireStartOnlyDispatch,readStartOnlyInputs,protectedStartOnlyReader,privateStartOnlyCheckpoint} from './rcap-hosted-ordinary-admin-start-only-entry.mjs';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const keys=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort():[];
const text=v=>typeof v==='string'&&v.length<=240&&!/[\r\n]/.test(v)?v:null;
const requirements=xs=>Array.isArray(xs)?xs.map(r=>({key:text(r?.key),label:text(r?.label),passing:typeof r?.passing==='boolean'?r.passing:null,effective:typeof r?.effective==='boolean'?r.effective:null})):[];
const fixedReasons=new Set(['Program publication is in progress. Check the operation before retrying.','Your program is live.','This application release is not authorized to publish programs.','Review the updated program materials.','Required approvals or operational checks remain incomplete.','Access sources conflict.']);
function decision(d){return{allowed:typeof d?.allowed==='boolean'?d.allowed:null,live:typeof d?.live==='boolean'?d.live:null,canAuthorizeStart:typeof d?.canAuthorizeStart==='boolean'?d.canAuthorizeStart:null,sourceVersion:Number.isSafeInteger(d?.sourceVersion)?d.sourceVersion:null,scopeHash:/^[a-f0-9]{64}$/.test(d?.scopeHash??'')?d.scopeHash:null,materialsHash:/^[a-f0-9]{64}$/.test(d?.materialsHash??'')?d.materialsHash:null,requirements:requirements(d?.requirements),blockers:requirements(d?.blockers)};}
export function projectLaunchPreflight(snapshot){
 const o=snapshot?.operations;assert.ok(o&&typeof o==='object');assert.equal(o.identity?.partnerSlug,'legalease-ordinary-qa-20261024');const p=o.preflight;
 const ds=[decision(o.view?.decision),decision(o.launchDecision)];const labels=new Set(ds.flatMap(d=>[...d.requirements,...d.blockers].map(r=>r.label)).filter(Boolean));
 const held=p?.heldReason;const safeHeld=held==null?null:fixedReasons.has(held)||labels.has(held)?held:'withheld_unclassified_reason';
 return{canStart:typeof o.canStart==='boolean'?o.canStart:null,viewDecision:ds[0],launchDecision:ds[1],preflight:{present:Boolean(p),canAuthorizeStart:typeof p?.canAuthorizeStart==='boolean'?p.canAuthorizeStart:null,canLaunch:typeof p?.canLaunch==='boolean'?p.canLaunch:null,releaseAuthorized:typeof p?.releaseAuthorized==='boolean'?p.releaseAuthorized:null,commercialValid:typeof p?.commercialValid==='boolean'?p.commercialValid:null,workspaceVersion:Number.isSafeInteger(p?.workspaceVersion)?p.workspaceVersion:null,heldReason:safeHeld,heldReasonSha256:typeof held==='string'?hash(held):null,requirements:requirements(p?.realAuthorityRequirements),effective:{ready:typeof p?.effective?.ready==='boolean'?p.effective.ready:null,remainingHardStops:requirements(p?.effective?.remainingHardStops)}},rootKeyShapes:{snapshot:keys(snapshot),configuration:keys(snapshot.configuration),operations:keys(o),view:keys(o.view),viewDecision:keys(o.view?.decision),launchDecision:keys(o.launchDecision),preflight:keys(p)}};
}
export function requireReadOnlyPreflightDispatch(env){const input=JSON.parse(env.DISPATCH_INPUTS);assert.equal(input.mode,'ordinary_admin_launch_preflight_readonly');
 // Only the selector differs; retain the accepted pure identity and extraneous-input checks.
 requireStartOnlyDispatch({...env,DISPATCH_INPUTS:JSON.stringify({...input,mode:'ordinary_admin_start_only'})});}
export async function observeReadOnlyLaunchPreflight(io){
 for(const k of ['admitSourceTarget','signInExistingAdminOnce','readCurrentProgram','readProtectedPoststate','checkpoint'])assert.equal(typeof io[k],'function');
 const t=await io.admitSourceTarget({applicationSha:START_ONLY.app,origin:START_ONLY.origin,phase:'managed_start_source_successor'});assert.equal(t.applicationSha,START_ONLY.app);assert.equal(t.deploymentId,'dpl_DVC1stkcRAySuJ33KxnfqEcKPR1D');assert.equal(t.nativeCreatorVerified,true);assert.equal(t.sourceBound,true);
 assert.equal(await io.signInExistingAdminOnce(),START_ONLY.admin);let before,after,projection;
 try{before=await io.readProtectedPoststate();assert.equal(before.readOnly,'on');projection=projectLaunchPreflight(await io.readCurrentProgram());}
 finally{after=await io.readProtectedPoststate();assert.equal(after.readOnly,'on');await io.checkpoint('start-only-poststate.json',{stage:'readonly_launch_preflight_state_comparison',beforeSha256:before?hash(before):null,afterSha256:hash(after),unchangedExcludingObservation:before?hash({...before,observedAt:null})===hash({...after,observedAt:null}):null,applicationPosts:0});}
 const result={stage:'ordinary_admin_launch_preflight_readonly',applicationSha:START_ONLY.app,deploymentId:t.deploymentId,...projection,applicationPosts:0,participantVerificationAllowed:false};await io.checkpoint('result.json',result);return result;
}
export async function main(args=process.argv.slice(2),env=process.env){assert.ok(args.length===0||(args.length===1&&args[0]==='--verify'));requireReadOnlyPreflightDispatch(env);const input=await readStartOnlyInputs(env);if(args[0]==='--verify'){console.log('Readonly preflight source/native/retained inputs verified; zero provider/Auth operations.');return;}
 const checkpoint=await privateStartOnlyCheckpoint(env.RCAP_START_EVIDENCE_DIR),reader=protectedStartOnlyReader(input.sql,env.SUPABASE_ACCESS_TOKEN);const{chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');await fs.access('/usr/bin/google-chrome');let browser,context;
 try{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);assert.equal(typeof context.routeWebSocket,'function');await context.routeWebSocket('**/*',ws=>ws.close());const io=await createStartOnlyBrowserIo({context,admitSourceTarget:async()=>input.target,readProtectedPoststate:reader,checkpoint,bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET});await observeReadOnlyLaunchPreflight(io);
 }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Readonly launch preflight stopped; inspect safe private evidence. No Start was attempted.');process.exitCode=1;});
