import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readPinnedAdminCredentials,requestAllowed,ORIGIN as AUTH_READER_ORIGIN} from './rcap-hosted-ordinary-admin-readonly.mjs';
import {assertStartOnlyPrestate,qualifyRetainedStartProof} from './rcap-hosted-ordinary-admin-start-only.mjs';
import {protectedStartOnlyReader,privateStartOnlyCheckpoint,POSTSTATE_SQL_SHA256} from './rcap-hosted-ordinary-admin-start-only-entry.mjs';
export const GUARD_TARGET=Object.freeze({app:'b8b980c5b95b3342420b63c60ba3f36d3f7bf85f',origin:'https://legalease-rcap-managed-b8b980c5b95b-roger947s-projects.vercel.app',admin:'6574d21e-5e0a-4567-b14e-01447c162f37',partner:'legalease-ordinary-qa-20261024'});
const ROOT='/api/internal/partners/onboarding/phase1/'+GUARD_TARGET.partner;
export const GUARD_PATH=ROOT+'/program?ordinaryGuardDiagnostic=1';
const AUTH='https://hyflxnlhpmiqxvvcoiia.supabase.co';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=v=>sha(JSON.stringify(v));
const predicateKeys=['preview_env','single_jurisdiction','grant_found','grant_digest','approved','production_closed','public_closed','payment_closed','hosted_full_closed','event_id_null','event_name_null','jurisdiction_matches','project_url','public_url_matches','channel','runtime_route_state','grant_route_state','scope_exact','scope_digest'];
const exact=(object,keys)=>assert.deepEqual(Object.keys(object??{}).sort(),[...keys].sort());
export function projectOrdinaryGuard(body){
 exact(body,['diagnostic']);const d=body.diagnostic;exact(d,['schema','passed','predicates','artifacts']);assert.equal(d.schema,'ordinary-sponsored-guard-diagnostic/v1');assert.equal(typeof d.passed,'boolean');exact(d.predicates,predicateKeys);
 const predicates=Object.fromEntries(predicateKeys.map(k=>{const v=d.predicates[k];assert.ok(v===null||typeof v==='boolean');return[k,v];}));
 assert.ok(Array.isArray(d.artifacts)&&d.artifacts.length===3);
 const artifacts=d.artifacts.map(a=>{exact(a,['readable','hashMatches','filesystemCode']);for(const k of ['readable','hashMatches'])assert.ok(a[k]===null||typeof a[k]==='boolean');assert.ok([null,'ENOENT','EACCES','EPERM','EISDIR','ENOTDIR','EIO','OTHER'].includes(a.filesystemCode));return{readable:a.readable,hashMatches:a.hashMatches,filesystemCode:a.filesystemCode};});
 if(d.passed)assert.ok(Object.values(predicates).every(x=>x===true)&&artifacts.every(a=>a.readable===true&&a.hashMatches===true&&a.filesystemCode===null));
 else assert.ok(Object.values(predicates).includes(false)||artifacts.some(a=>a.readable===false||a.hashMatches===false));
 return{schema:d.schema,passed:d.passed,predicates,artifacts};
}
export function requireGuardDispatch(env){
 for(const[k,v]of Object.entries({GITHUB_ACTIONS:'true',GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026'}))assert.equal(env[k],v);
 assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_WORKFLOW_SHA,env.GITHUB_SHA);
 const input=JSON.parse(env.DISPATCH_INPUTS);const expected={mode:'ordinary_admin_launch_preflight_readonly',application_sha:GUARD_TARGET.app,worker_source_sha:'HELD',worker_digest:'HELD',supabase_project_ref:'hyflxnlhpmiqxvvcoiia'};
 for(const[k,v]of Object.entries(expected))assert.equal(input[k],v);assert.match(input.tools_sha??'',/^[a-f0-9]{40}$/);
 for(const[k,v]of Object.entries(input))if(!Object.hasOwn(expected,k)&&k!=='tools_sha')assert.ok(v===''||v===false||v==='false'||v==='[]','Unexpected dispatch input');
 return input;
}
export function admitOrdinaryGuardTarget({binding,creatorBytes,creatorRunBytes,cAcceptanceBytes},executionToolsSha){
 // Unknown actual identity is a hard stop before browser, credentials or Auth.
 for(const k of ['nativeSha256','creatorRunSha256','cAcceptanceSha256'])assert.match(binding[k]??'',/^[a-f0-9]{64}$/,'BEFORE_AUTH_HOLD:'+k);
 assert.match(binding.carrierSha??'',/^[a-f0-9]{40}$/,'BEFORE_AUTH_HOLD:carrier');assert.ok(Number.isSafeInteger(binding.runId)&&binding.runId>0,'BEFORE_AUTH_HOLD:run');assert.match(binding.deploymentId??'',/^dpl_[A-Za-z0-9]+$/,'BEFORE_AUTH_HOLD:deployment');assert.equal(binding.executionToolsSha,executionToolsSha);
 assert.equal(sha(creatorBytes),binding.nativeSha256);assert.equal(sha(creatorRunBytes),binding.creatorRunSha256);assert.equal(sha(cAcceptanceBytes),binding.cAcceptanceSha256);
 const n=JSON.parse(creatorBytes),run=JSON.parse(creatorRunBytes);
 for(const[k,v]of Object.entries({id:binding.runId,workflow_id:332448793,head_sha:binding.carrierSha,head_branch:'codex/f-vercel-raw-readonly-20261026',run_attempt:1,event:'workflow_dispatch',status:'completed',conclusion:'success'}))assert.equal(run[k],v);
 assert.equal(run.repository?.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(n.passed,true);assert.deepEqual(n.failedCases,[]);assert.equal(n.neverPassedProdFlag,true);assert.equal(n.neverWroteProjectLevelEnv,true);assert.equal(n.applicationSha,GUARD_TARGET.app);assert.equal(n.acceptanceProjectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(n.previewUrl,GUARD_TARGET.origin);
 for(const[k,v]of Object.entries({phase:'managed_start_source_successor',carrierSha:binding.carrierSha,carrierWorkflowSha:binding.carrierSha,controllerSha:'6b0ba981ea4f4bbd3061553c0062d324dcf8c741',toolsSha:'298780eb0db01c3292d53267233489244561a213',runId:String(binding.runId),runAttempt:'1'}))assert.equal(n.purposeSource?.[k],v);
 const d=n.deployment;assert.equal(d?.id,binding.deploymentId);assert.equal(d.readyState,'READY');assert.equal(d.target,null);assert.equal(d.gitSourceSha,GUARD_TARGET.app);assert.equal(d.projectId,'prj_cdgwGzFqIHgEUlzEburSLaZETdQV');
 for(const[k,v]of Object.entries({rcapApplicationSha:GUARD_TARGET.app,rcapWorkerState:'HELD',rcapWorkerCompatibility:'UNQUALIFIED',rcapReturnOrigin:GUARD_TARGET.origin,rcapPreviewPurpose:'managed_start'}))assert.equal(d.metadata?.[k],v);
 for(const k of ['rcapWorkerSourceSha','rcapWorkerDigest','rcapWorkerInputFingerprint'])assert.ok(!Object.hasOwn(d.metadata,k));
 assert.equal(n.restCreation.creationCalls,1);assert.equal(n.restCreation.creationPostCount,1);assert.equal(n.restCreation.id,d.id);assert.equal(n.restCreation.readyState,'READY');assert.equal(n.aliasAssignment.passed,true);assert.equal(n.aliasAssignment.deploymentId,d.id);assert.equal(n.aliasAssignment.hostname,new URL(GUARD_TARGET.origin).hostname);assert.equal(n.aliasAssignment.target,null);assert.ok(n.sourceSuccessorProtectedBefore);assert.deepEqual(n.sourceSuccessorProtectedAfter,n.sourceSuccessorProtectedBefore);assert.equal(n.sourceSuccessorAliasInverse?.performed,false);assert.notEqual(n.sourceSuccessorAliasInverse?.blocked,true);
 return{applicationSha:GUARD_TARGET.app,origin:GUARD_TARGET.origin,deploymentId:d.id,nativeCreatorVerified:true};
}
export function guardRequestAllowed(url,method,authPosts,deploymentId){
 let u;try{u=new URL(url);}catch{return false;}
 if(u.origin===AUTH)return requestAllowed(url,method,authPosts);
 if(u.origin!==GUARD_TARGET.origin||u.username||u.password||u.hash||!['GET','HEAD'].includes(method))return false;
 if(u.pathname.startsWith('/api/'))return method==='GET'&&(u.pathname+u.search===GUARD_PATH||u.pathname+u.search==='/api/rcap/release');
 if(u.searchParams.has('dpl'))return u.search==='?dpl='+deploymentId&&/^\/_next\/static\/chunks\/[A-Za-z0-9_.~/-]+\.(?:js|css)$/.test(u.pathname);
 if(!['/expungement-ai/sign-in','/briefcase','/favicon.ico'].includes(u.pathname)&&!u.pathname.startsWith('/_next/static/'))return false;
 return requestAllowed(AUTH_READER_ORIGIN+u.pathname+u.search,method,authPosts);
}
export async function observeOrdinaryGuard(input,io){
 const target=await io.admitSourceTarget();assert.equal(target.applicationSha,GUARD_TARGET.app);assert.equal(target.origin,GUARD_TARGET.origin);assert.equal(target.nativeCreatorVerified,true);assert.equal(target.sourceBound,true);
 assert.equal(await io.signInExistingAdminOnce(),GUARD_TARGET.admin);let before,after;
 try{before=await io.readProtectedPoststate();assertStartOnlyPrestate(before,input.retained);const diagnostic=projectOrdinaryGuard(await io.readGuard());await io.checkpoint('result.json',{applicationSha:GUARD_TARGET.app,deploymentId:target.deploymentId,stage:'ordinary_guard_readonly',diagnostic,applicationPosts:0,workerAllowed:false,participantVerificationAllowed:false});return diagnostic;}
 finally{after=await io.readProtectedPoststate();assert.equal(after.readOnly,'on');const unchanged=Boolean(before&&hash({...before,observedAt:null})===hash({...after,observedAt:null}));await io.checkpoint('start-only-poststate.json',{applicationSha:GUARD_TARGET.app,stage:'ordinary_guard_state_comparison',beforeSha256:before?hash(before):null,afterSha256:hash(after),unchangedExcludingObservation:unchanged,applicationPosts:0});if(before)assert.equal(unchanged,true,'Protected state changed; reconcile without retry.');}
}
async function readInputs(env,input){
 const bindingBytes=await fs.readFile(env.RCAP_GUARD_BINDING_FILE);assert.match(env.RCAP_GUARD_BINDING_SHA256??'',/^[a-f0-9]{64}$/);assert.equal(sha(bindingBytes),env.RCAP_GUARD_BINDING_SHA256);const binding=JSON.parse(bindingBytes);
 // Validate unknown fields before trying to open as-yet nonexistent native files.
 for(const k of ['nativeSha256','creatorRunSha256','cAcceptanceSha256'])assert.match(binding[k]??'',/^[a-f0-9]{64}$/,'BEFORE_AUTH_HOLD:'+k);
 const target=admitOrdinaryGuardTarget({binding,creatorBytes:await fs.readFile(env.RCAP_GUARD_CREATOR_FILE),creatorRunBytes:await fs.readFile(env.RCAP_GUARD_CREATOR_RUN_FILE),cAcceptanceBytes:await fs.readFile(env.RCAP_GUARD_C_ACCEPTANCE_FILE)},input.tools_sha);
 const retained={};for(const[k,pin]of Object.entries({before:'1bfc58296afe4af56f3b48caddf28b70f4fcbf08cefa2243efffb382094eddd6',review:'a1ea765968b128fc7ab35dfcc91cf14d3ec7fae8addd57e1472a182131f14900',poststate:'f064919f47268121cc394b75c362f804f1b4a51c6127360bae7c62db00d66a09'})){const b=await fs.readFile(env['RCAP_START_RETAINED_'+k.toUpperCase()+'_FILE']);assert.equal(sha(b),pin);retained[k]=JSON.parse(b);}const baseline=qualifyRetainedStartProof(retained);
 const sql=await fs.readFile(env.RCAP_START_POSTSTATE_SQL_FILE,'utf8');assert.equal(sha(sql),POSTSTATE_SQL_SHA256);return{target,retained:baseline,sql};
}
export async function createGuardBrowserIo({context,target,reader,checkpoint,bypass,credentialReader=readPinnedAdminCredentials}){
 assert.ok(typeof bypass==='string'&&bypass.trim()&&!/[\r\n]/.test(bypass));let page,authPosts=0,guardReads=0;
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url());if(!guardRequestAllowed(r.url(),r.method(),authPosts,target.deploymentId))return route.abort('blockedbyclient');if(r.method()==='POST')authPosts++;if(u.origin===GUARD_TARGET.origin&&u.pathname+u.search===GUARD_PATH&&++guardReads!==1)return route.abort('blockedbyclient');const headers={...r.headers()};delete headers['x-vercel-protection-bypass'];if(u.origin===GUARD_TARGET.origin){headers['x-vercel-protection-bypass']=bypass;headers['x-vercel-skip-toolbar']='1';}return route.continue({headers});});
 await context.addInitScript(()=>window.addEventListener('submit',event=>{if(location.pathname==='/expungement-ai/sign-in'&&event.target instanceof HTMLFormElement&&event.target.querySelector('input[name="password"]')&&!event.defaultPrevented)event.preventDefault();}));
 return{admitSourceTarget:async()=>{page=await context.newPage();const r=await page.goto(GUARD_TARGET.origin+'/api/rcap/release',{waitUntil:'domcontentloaded'});assert.equal(r.status(),200);const body=await r.json();assert.equal(body.buildSha,GUARD_TARGET.app);assert.equal(body.runtimeSha,GUARD_TARGET.app);assert.equal(body.sourceBound,true);return{...target,sourceBound:true};},signInExistingAdminOnce:async()=>{assert.equal(authPosts,0);await page.goto(GUARD_TARGET.origin+'/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase',{waitUntil:'domcontentloaded'});await page.locator('form[data-handler-ready="true"]').waitFor({state:'attached'});let credentials=credentialReader();await page.locator('input[name="email"]').fill(credentials.email);await page.locator('input[name="password"]').fill(credentials.password);credentials=null;const token=page.waitForResponse(r=>r.url().startsWith(AUTH+'/auth/v1/token?')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sign in',exact:true}).click();const response=await token;assert.equal(response.status(),200);const session=await response.json();assert.equal(session.user?.id,GUARD_TARGET.admin);assert.equal(authPosts,1);await page.waitForURL(u=>u.origin===GUARD_TARGET.origin&&u.pathname==='/briefcase');return session.user.id;},readProtectedPoststate:reader,checkpoint,readGuard:async()=>{const r=await page.evaluate(async p=>{const response=await fetch(p,{cache:'no-store',redirect:'manual'});return{status:response.status,body:await response.json()};},GUARD_PATH);assert.equal(r.status,200);return r.body;}};
}
export async function main(args=process.argv.slice(2),env=process.env){
 assert.ok(args.length===0||(args.length===1&&args[0]==='--verify'));const dispatch=requireGuardDispatch(env);const input=await readInputs(env,dispatch);if(args[0]==='--verify'){console.log('Guard reader identity verified; zero network/Auth operations.');return;}
 const checkpoint=await privateStartOnlyCheckpoint(env.RCAP_START_EVIDENCE_DIR);const reader=protectedStartOnlyReader(input.sql,env.SUPABASE_ACCESS_TOKEN);const{chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');await fs.access('/usr/bin/google-chrome');let browser,context;
 try{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);await context.routeWebSocket('**/*',ws=>ws.close());const io=await createGuardBrowserIo({context,target:input.target,reader,checkpoint,bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET});await observeOrdinaryGuard(input,io);}finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Guard readonly held/stopped; inspect private evidence. No Start attempted.');process.exitCode=1;});
