import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import {ownedMatterReadonlyDecision} from './rcap-clinic-owned-matter-readonly.mjs';
import {publicReactResourcePolicy} from './rcap-clinic-live-screening-progress.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
import {projectOriginalResponse,originalResponseOperation,createOriginalResponseObserver,requireOriginalResponse,matchesOriginalResponse} from './rcap-clinic-original-response.mjs';
const ts=createRequire(import.meta.url)('typescript');
const {chromium}=createRequire(import.meta.url)('playwright');
const {createServer}=await import('node:http');
const {answerBuilderStep}=await import('./rcap-packet-builder-filler.mjs');
const {MISSISSIPPI_SYNTHETIC_ROUTE}=await import('./rcap-ms-nonconviction-synthetic-facts.mjs');
const source=fs.readFileSync(new URL('./verify-rcap-commercial-browser.mjs',import.meta.url),'utf8');
const ast=ts.createSourceFile('caller.mjs',source,ts.ScriptTarget.Latest,true);
assert.equal(ast.parseDiagnostics.length,0);
const CLINIC_SETUP={owner:'e7c1d76e-dcf2-4d41-b585-ba164806f391',email:'mvl-demo-participant-a@rcap-acceptance.test',app:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',project:'hyflxnlhpmiqxvvcoiia',event:'77000000-0000-4000-8000-000000000055',slug:'mississippi-volunteer-lawyers-demo',origin:'https://legalease-rcap-4feb8e94b3de-roger947s-projects.vercel.app'};
const names=['assertExistingClinicContinuationInput','requireExistingClinicPacketExecution','readExistingClinicReadonlyRows','clinicTargetJobs','existingClinicContinuationRequestDecision','openExistingClinicMatter','existingClinicGeneratedJob','validUuid'];
const declarations=names.map(name=>{const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1);return nodes[0].getText(ast);}).join('\n');
const constant=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='EXISTING_CLINIC_MATTER')).getText(ast);
const base='https://legalease-rcap-clinic-4feb8e94b3de-roger947s-projects.vercel.app';
const item='6765fcb9-586d-4abe-bc60-9f77f6a11e16', session='56f6cbfa-3dd2-44b1-95bf-84c800396519';
const dependencyNames=['inspector_readonly','rpc_source_and_grants','registered_specification','protected_sponsor_identity','current_funded_scope','existing_active_entitlement','no_existing_target_job'];
const preview={previewVerified:true,routeState:'staging_scoped',clinicDemoMode:'mississippi_preview',stripeConfigured:false};
const config={origin:base,authOrigin:'https://hyflxnlhpmiqxvvcoiia.supabase.co',existingClinicMatterId:item};
function harness(extra={}){
 const ctx=vm.createContext({assert,crypto,URL,AbortSignal,ownedMatterReadonlyDecision,CLINIC_SETUP,baseUrl:base,email:CLINIC_SETUP.email,password:'fixture-only',result:{},environmentClassification:{...preview},required:()=> 'fixture-token',assertExistingClinicPreviewCreation:()=>({runId:'40299999999',deploymentId:'dpl_Synthetic'}),readExistingClinicFrontendCaptcha:async()=>({clientCaptchaRequired:false,widgetSiteKeyConfigured:true,deploymentId:'dpl_Synthetic',applicationSha:CLINIC_SETUP.app}),readResumeCaptchaPolicy:async({frontend})=>({project:CLINIC_SETUP.project,serverCaptchaRequired:false,frontend}),readOwnedMatterDatabase:async()=>({checks:Array.from({length:14},(_,i)=>({id:String(i),ok:true}))}),fetch:async(_url,options)=>({status:201,json:async()=>JSON.parse(options.body).query.includes('select j.id')?[job()]:[{existing_packet_prerequisites:Object.fromEntries(dependencyNames.map(k=>[k,true]))}]}),bypassHeaders:()=>({}),...extra});
 vm.runInContext(`let participantUserId=null,screeningSessionId=null,existingClinicRevision=null;const existingClinicResourcePolicies=[]; ${constant}\n${declarations}\nglobalThis.api={${names.join(',')},state:()=>({participantUserId,screeningSessionId,existingClinicRevision}),setRevision:v=>existingClinicRevision=v};`,ctx);
 return ctx;
}
function input(){return {RCAP_BROWSER_EXISTING_CLINIC_MATTER_ID:item,RCAP_BROWSER_EMAIL:CLINIC_SETUP.email,RCAP_BROWSER_APPLICATION_SHA:CLINIC_SETUP.app,RCAP_BROWSER_ACCEPTANCE_PROJECT_REF:CLINIC_SETUP.project,RCAP_BROWSER_WORKER_SOURCE_SHA:'16908485a94f475448657cea90583a4d352da9a3',RCAP_BROWSER_WORKER_DIGEST:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',RCAP_BROWSER_PARTNER_SLUG:'mvl-demo',RCAP_BROWSER_CLINIC_EVENT_ID:CLINIC_SETUP.event,RCAP_BROWSER_CLINIC_EVENT_SLUG:CLINIC_SETUP.slug,RCAP_BROWSER_CLINIC_EVENT_NAME:'Mississippi Volunteer Lawyers Clinic Mode Demo',RCAP_BROWSER_ALLOW_MUTATION:'1',RCAP_BROWSER_BASE_URL:base,RCAP_BROWSER_PREVIEW_CREATION_RUN_ID:'40299999999',RCAP_BROWSER_PREVIEW_CREATION_EVIDENCE_DIR:'/fixture/native',RCAP_BROWSER_EXPECTED_SCOPE_SHA256:crypto.createHash('sha256').update(CLINIC_SETUP.owner+',255998e1-eb69-4239-b151-0f8b8935a539').digest('hex')};}
function request(path,method='GET',body={},origin=base){return {url:()=>new URL(path,origin).href,method:()=>method,postDataJSON:()=>body,headers:()=>({}),resourceType:()=> 'fetch',isNavigationRequest:()=>false};}
function job(){return {id:'00000000-0000-4000-8000-000000000001',briefcase_item_id:item,sponsored_consumer_briefcase_item_id:item,sponsored_consumer_auth_user_id:CLINIC_SETUP.owner,sponsored_session_id:session,sponsored_clinic_event_id:CLINIC_SETUP.event,matter_id:'e6450851-89e2-4d77-9ff2-938ec0edaa39',partner_id:'bc1ed720-681e-4da5-9964-acb2affd5b12',route_id:'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',sponsored_route_key:'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',renderer_kind:'packet_document_v1',status:'queued',attempt_count:0,sponsored_verification_hash:'a'.repeat(64),current_verification_hash:'a'.repeat(64)};}
const generation={httpStatus:200,packetStatus:'generating',briefcaseItemId:item};
test('exact saved-matter inputs refuse old disabled Preview, wrong tuple, code and spent fresh-attempt paths',()=>{
 const {api}=harness();api.assertExistingClinicContinuationInput(input());
 for(const patch of [{RCAP_BROWSER_EXISTING_CLINIC_MATTER_ID:'d13233f6-d9c7-41e1-9bb5-8a454d747503'},{RCAP_BROWSER_BASE_URL:CLINIC_SETUP.origin},{RCAP_BROWSER_APPLICATION_SHA:'0'.repeat(40)},{RCAP_BROWSER_EXPECTED_SCOPE_SHA256:'0'.repeat(64)},{RCAP_BROWSER_CLINIC_SETUP_ONLY:'1'},{RCAP_BROWSER_ISSUE_CLINIC_CODE:'1'},{RCAP_BROWSER_CLINIC_ACCESS_CODE:'never-redeem'},{RCAP_BROWSER_GUIDANCE_ITEM_ID:item}])assert.throws(()=>api.assertExistingClinicContinuationInput({...input(),...patch}));
 api.assertExistingClinicContinuationInput({...input(),RCAP_BROWSER_CLINIC_ATTEMPT_ID:'spent-ignored'});
});
test('actual preflight composes current owner structure and exact dependencies; missing checks or old runtime refuse',async()=>{
 const good=harness();await good.api.requireExistingClinicPacketExecution();assert.equal(good.result.packetPrerequisites.httpStatus,201);
 for(const missing of dependencyNames){const ctx=harness({fetch:async()=>({status:201,json:async()=>[{existing_packet_prerequisites:Object.fromEntries(dependencyNames.map(k=>[k,k!==missing]))}]})});await assert.rejects(ctx.api.requireExistingClinicPacketExecution());}
 await assert.rejects(harness({environmentClassification:{...preview,routeState:'disabled'}}).api.requireExistingClinicPacketExecution());
 await assert.rejects(harness({readOwnedMatterDatabase:async()=>({checks:[{ok:false}]})}).api.requireExistingClinicPacketExecution());
});
test('normal owner signs in once directly to saved packet information, pins actual revision and skips fresh acquisition branch',async()=>{
 const visits=[],calls=[];const page={goto:async url=>visits.push(url),waitForURL:async predicate=>assert.equal(predicate(new URL(`/briefcase/${item}/packet-information`,base)),true)};
 const context={cookies:async()=>[{name:'sb-project-auth-token'}],request:{get:async url=>{calls.push(url);return {status:()=>200,json:async()=>({ok:true,revision:3,reviewPath:`/briefcase/${item}/review`,nextAction:'continue_packet',answers:{private:'do-not-copy'}})}}}};
 let signs=0;const ctx=harness({signIn:async()=>{signs++;return {user:{id:CLINIC_SETUP.owner}}},page,context,existingClinicContinuation:true});
 const journey=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='runJourney');let branch;function visit(n){if(ts.isIfStatement(n)&&n.expression.getText(ast)==='existingClinicContinuation'&&n.thenStatement.getText(ast).includes('await openExistingClinicMatter'))branch=n;ts.forEachChild(n,visit);}visit(journey);assert.ok(branch);
 await vm.runInContext(`(async()=>{let packetItemId; ${branch.getText(ast)};return packetItemId;})()`,ctx);
 assert.equal(signs,1);assert.equal(visits.length,1);assert.equal(new URL(visits[0]).searchParams.get('next'),`/briefcase/${item}/packet-information`);assert.equal(calls.length,1);assert.equal(ctx.api.state().screeningSessionId,session);assert.equal(ctx.api.state().existingClinicRevision,3);assert.equal(JSON.stringify(ctx.result).includes('do-not-copy'),false);
});
test('failed prerequisite, wrong owner and stale owner draft all refuse before packet writes',async()=>{
 let visits=0,gets=0;const page={goto:async()=>visits++,waitForURL:async()=>{}};const context={cookies:async()=>[{name:'sb-fixture-auth-token'}],request:{get:async()=>{gets++;return {status:()=>409,json:async()=>({})}}}};
 await assert.rejects(harness({readOwnedMatterDatabase:async()=>({checks:[]})}).api.openExistingClinicMatter(page,context));assert.equal(visits,0);
 await assert.rejects(harness({signIn:async()=>({user:{id:'wrong-owner'}})}).api.openExistingClinicMatter(page,context));assert.equal(gets,0);
 await assert.rejects(harness({signIn:async()=>({user:{id:CLINIC_SETUP.owner}})}).api.openExistingClinicMatter(page,context));assert.equal(gets,1);
});
test('request boundary forbids entry, consent, screening, pending, claim, reset, wrong matter/revision, Stripe and unknown writes',()=>{
 const {api}=harness();api.setRevision(3);
 assert.equal(api.existingClinicContinuationRequestDecision(request(`/api/expungement-ai/briefcase/${item}/packet-information`,'POST',{expectedRevision:3}),config),'allowed');
 assert.equal(api.existingClinicContinuationRequestDecision(request('/api/expungement-ai/packet/generate','POST',{briefcaseItemId:item}),config),'allowed');
 assert.equal(api.existingClinicContinuationRequestDecision(request('/auth/v1/token?grant_type=password','POST',{},config.authOrigin),config),'allowed');
 assert.equal(api.existingClinicContinuationRequestDecision(request('/api/analytics/web','POST'),config),'readonly_telemetry_suppressed');
 for(const req of [request('/unknown-api'),request('/api/unknown'),request(`/briefcase/${item}/review?extra=1`),request('/auth/v1/token?grant_type=password&extra=1','POST',{},config.authOrigin),request('/api/analytics/web?extra=1','POST'),request('/clinic/demo'),request('/intake/mvl-demo'),...['/api/clinic/entry','/api/clinic/assistance/start','/api/clinic/session/reset','/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim','/api/expungement-ai/evaluate','/api/checkout','/unknown'].map(p=>request(p,'POST')),request(`/api/expungement-ai/briefcase/${item}/packet-information`,'POST',{expectedRevision:2}),request('/api/expungement-ai/packet/generate','POST',{briefcaseItemId:'wrong'}),request('/briefcase/00000000-0000-4000-8000-000000000001/packet-information'),request('/api/rcap/packets/00000000-0000-4000-8000-000000000001/download')])assert.notEqual(api.existingClinicContinuationRequestDecision(req,config),'allowed',req.url());
});
test('original response capture consumes each verification/generation POST once, keeps safe revision and HTTP200 status',async()=>{
 for(const [operation,path,shape,body] of [['packet_information',`/api/expungement-ai/briefcase/${item}/packet-information`,{expectedRevision:3,verify:true},{ok:true,itemId:item,revision:4,readyToGenerate:true,answers:{secret:'never-retain'}}],['generation','/api/expungement-ai/packet/generate',{briefcaseItemId:item},{briefcaseItemId:item,packetStatus:'generating'}]]){
  let fetches=0,reads=0,fulfills=0;const req=request(path,'POST',shape);const response={status:()=>200,body:async()=>{reads++;return Buffer.from(JSON.stringify(body))}};
  await createOriginalResponseObserver(config)({request:()=>req,fetch:async()=>{fetches++;return response},fulfill:async()=>fulfills++,fallback:async()=>assert.fail('unexpected fallback'),abort:async()=>assert.fail('unexpected abort')});
  const observed=requireOriginalResponse({request:()=>req,status:()=>200},operation);assert.equal(fetches,1);assert.equal(reads,1);assert.equal(fulfills,1);assert.equal(JSON.stringify(observed).includes('never-retain'),false);
  if(operation==='packet_information')assert.equal(observed.revision,4);else assert.equal(observed.packetStatus,'generating');
 }
 assert.equal(originalResponseOperation(request(`/api/expungement-ai/briefcase/${item}/packet-information`,'POST'),{origin:base,authOrigin:config.authOrigin}),null);
 assert.equal(projectOriginalResponse('packet_information',200,{ok:true,itemId:item,revision:4,readyToGenerate:false},config,{expectedRevision:3,verify:true}).accepted,false);
 assert.equal(projectOriginalResponse('packet_information',409,{ok:false},config,{expectedRevision:3}).accepted,false);
 assert.equal(projectOriginalResponse('generation',202,{briefcaseItemId:item,packetStatus:'generating'},config).accepted,false);
});
test('genuine protected queued job binding refuses wrong owner, route, verification or fabricated job identity',()=>{
 const {api}=harness();assert.equal(api.existingClinicGeneratedJob([job()],generation).id,job().id);
 for(const patch of [{sponsored_consumer_auth_user_id:'wrong'},{route_id:'MS:other'},{sponsored_session_id:'wrong'},{current_verification_hash:'b'.repeat(64)},{id:'fake'},{status:'delivered'},{attempt_count:1}])assert.throws(()=>api.existingClinicGeneratedJob([{...job(),...patch}],generation));
 assert.throws(()=>api.existingClinicGeneratedJob([],generation));assert.throws(()=>api.existingClinicGeneratedJob([job()],{...generation,httpStatus:202}));
});
test('actual existing-matter completion branch binds job then stops without invoking worker, reset or private delivery',async()=>{
 const ctx=harness({page:{waitForURL:async()=>{},waitForLoadState:async()=>{}},participantGuard:{assertNoCritical(){}},browserErrors:[],failures:[],generationResponseBody:generation,packetItemId:item,participantUserId:CLINIC_SETUP.owner,screeningSessionId:session,evidenceDir:'/fixture',writeClinicReceipt:()=>{},process:{exitCode:0},path:{join:(...a)=>a.join('/')},fs:{writeFileSync:()=>{}},clinicDeliveryPorts:async()=>({targetJobs:async()=>[job()],receipt:async()=>{},runOneCycle:async()=>assert.fail('worker must not run')})});
 const journey=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='runJourney');let block;function visit(n){if(ts.isIfStatement(n)&&n.expression.getText(ast)==='existingClinicContinuation'&&n.thenStatement.getText(ast).includes("'existing_matter_waiting_for_exclusive_worker'"))block=n.thenStatement;ts.forEachChild(n,visit);}visit(journey);assert.ok(block);assert.equal(block.getText(ast).includes('runClinicTargetCycle'),false);
 await vm.runInContext(`(async()=>${block.getText(ast)})()`,ctx);assert.equal(ctx.result.generatedJob.id,job().id);assert.equal(ctx.result.workerInvoked,false);assert.equal(ctx.result.fullHostedJourneyCompleted,false);assert.equal(ctx.result.passed,true);assert.equal(ctx.result.enqueued,true);assert.equal(ctx.process.exitCode,0);
});

async function localHttpFixture(scenario){
 const counts={signin:0,save:0,verify:0,generation:0,unexpected:0};let revision=3;let origin,authOrigin;
 const json=(res,status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(JSON.stringify(body));};
 const auth=createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method==='POST'&&req.url==='/auth/v1/token?grant_type=password'){counts.signin++;for await(const _ of req){}json(res,200,{user:{id:CLINIC_SETUP.owner}},{'Set-Cookie':'sb-fixture-auth-token=synthetic; Path=/; HttpOnly; SameSite=Lax'});return;}
  counts.unexpected++;json(res,404,{});
 });
 await new Promise(resolve=>auth.listen(0,'127.0.0.1',resolve));authOrigin=`http://127.0.0.1:${auth.address().port}`;
 const app=createServer(async(req,res)=>{
  const address=new URL(req.url,'http://fixture');
  if(req.method==='GET'&&address.pathname==='/expungement-ai/sign-in'){
   res.writeHead(200,{'Content-Type':'text/html'});res.end(`<link rel="icon" href="/favicon.ico"><script src="/_next/static/chunks/fixture.js"></script><main><form><input name="email"><input name="password" type="password"><button>Sign in</button></form></main><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const r=await fetch('${authOrigin}/auth/v1/token?grant_type=password',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'fixture',password:'fixture'})});await r.json();if(r.ok)location.assign(new URL(location.href).searchParams.get('next'));};</script>`);return;
  }
  if(req.method==='GET'&&address.pathname===`/api/expungement-ai/briefcase/${item}/packet-information`){json(res,200,{ok:true,revision,reviewPath:`/briefcase/${item}/review`,nextAction:'continue_packet'});return;}
  if(req.method==='GET'&&address.pathname===`/briefcase/${item}/packet-information`){
   res.writeHead(200,{'Content-Type':'text/html'});res.end(`<link rel="icon" href="/favicon.ico"><script src="/_next/static/chunks/fixture.js"></script><main><h1>Complete packet information</h1><div data-packet-information-builder="active"><h2 id="q-participant_full_legal_name-prompt">Full legal name</h2><input id="q-participant_full_legal_name" name="q-participant_full_legal_name" type="text"><button type="button" id="save">Review packet facts</button></div></main><script>document.getElementById('save').onclick=async()=>{try{const r=await fetch('${scenario==='guard_denial'?'/api/clinic/session/reset':`/api/expungement-ai/briefcase/${item}/packet-information`}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:${revision},answers:{participant_full_legal_name:document.querySelector('input').value}})});const b=await r.json();if(r.ok&&b.ok)location.assign('/briefcase/${item}/review');}catch{document.body.dataset.error='save_failed';}};</script>`);return;
  }
  if(req.method==='GET'&&address.pathname===`/briefcase/${item}/review`){
   res.writeHead(200,{'Content-Type':'text/html'});res.end(`<link rel="icon" href="/favicon.ico"><script src="/_next/static/chunks/fixture.js"></script><nav>Saved matter</nav><main><h1>Review and confirm</h1><div data-packet-verification-state="unverified">Review your saved facts</div><button id="verify">Verify and prepare clinic packet</button></main><script>document.getElementById('verify').onclick=async()=>{try{const v=await fetch('/api/expungement-ai/briefcase/${item}/packet-information',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:${revision},answers:{},verify:true})});await v.json();if(!v.ok)return;const g=await fetch('/api/expungement-ai/packet/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({briefcaseItemId:'${item}'})});await g.json();if(g.ok)location.assign('/briefcase/${item}');}catch{document.body.dataset.error='generation_failed';}};</script>`);return;
  }
  if(req.method==='GET'&&address.pathname===`/briefcase/${item}`){res.writeHead(200,{'Content-Type':'text/html'});res.end('<link rel="icon" href="/favicon.ico"><script src="/_next/static/chunks/fixture.js"></script><main>Packet generation requested</main>');return;}
  if(req.method==='POST'&&address.pathname===`/api/expungement-ai/briefcase/${item}/packet-information`){let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);if(body.verify)counts.verify++;else counts.save++;if(scenario==='verify_refusal'&&body.verify){json(res,409,{ok:false,error:'revision_conflict'});return;}
   if(body.expectedRevision!==revision){json(res,409,{ok:false,error:'revision_conflict'});return;}
   revision++;json(res,200,{ok:true,itemId:item,revision:scenario==='wrong_revision'&&!body.verify?revision+1:revision,readyToGenerate:body.verify===true,answers:{private:'never-record'}});return;
  }
  if(req.method==='POST'&&address.pathname==='/api/expungement-ai/packet/generate'){counts.generation++;for await(const _ of req){}if(scenario==='lost_response'){req.socket.destroy();return;}json(res,scenario==='non200'?202:200,{briefcaseItemId:item,packetStatus:'generating'});return;}
  if(address.pathname==='/_next/static/chunks/fixture.js'){res.writeHead(200,{'Content-Type':'application/javascript'});res.end('/* synthetic local resource */');return;}
  if(address.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  counts.unexpected++;json(res,404,{});
 });
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${app.address().port}`;
 return {origin,authOrigin,counts,close:async()=>{await Promise.all([new Promise(resolve=>app.close(resolve)),new Promise(resolve=>auth.close(resolve))]);}};
}
const nativeFunctionNames=['runJourney','answerCurrentBuilderQuestion','packetInformationResponse','expectText','signIn','attachBypass','writeClinicReceipt','safeRequestPath','check','assertNoCommercialCopy'];
const nativeDeclarations=nativeFunctionNames.map(name=>{const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(n);return n.getText(ast);}).join('\n');
test('synthetic LOCAL HTTP: actual caller and accepted filler save/verify/generate original responses and STOP; no hosted claim',{timeout:60000},async t=>{
 for(const scenario of ['success','wrong_revision','non200','lost_response','verify_refusal','disabled','guard_denial'])await t.test(scenario,async()=>{
  const fixture=await localHttpFixture(scenario);let launched,jobReads=0,workerCalls=0;
  const ctx=harness({baseUrl:fixture.origin,responseConfig:{origin:fixture.origin,authOrigin:fixture.authOrigin,existingClinicMatterId:item},
   environmentClassification:scenario==='disabled'?{...preview,routeState:'disabled'}:{...preview},
   clinicGate:null,clinicMode:true,clinicSetupOnly:false,issueClinicCode:false,existingClinicContinuation:true,existingClinicMatterId:item,
   partnerSlug:'mvl-demo',clinicEventId:CLINIC_SETUP.event,clinicEventSlug:CLINIC_SETUP.slug,clinicEventName:'Mississippi Volunteer Lawyers Clinic Mode Demo',
   browser:null,bypassSecret:'',browserErrors:[],requestFailures:[],generationRequests:[],stripeRequests:[],packetDownloadRequests:[],failures:[],guidanceItemId:null,
   process:{env:{RCAP_BROWSER_CHROMIUM:process.env.RCAP_BROWSER_CHROMIUM},exitCode:0},console,evidenceDir:'/fixture',
   path:{join:(...v)=>v.join('/')},fs:{writeFileSync:()=>{}},
   result:{responseStages:[],responseObservations:[],guardEvents:[],stageResults:[]},
   screenshotPair:async()=>{},matchesOriginalResponse,requireOriginalResponse,createOriginalResponseObserver,publicReactResourcePolicy,createClinicRequestGuard,answerBuilderStep,MISSISSIPPI_SYNTHETIC_ROUTE,
   fetch:async(_url,options)=>({status:201,json:async()=>{if(JSON.parse(options.body).query.includes('select j.id')){jobReads++;assert.equal(fixture.counts.generation,1);return [job()];}return [{existing_packet_prerequisites:Object.fromEntries(dependencyNames.map(k=>[k,true]))}];}}),
   clinicDeliveryPorts:async()=>{workerCalls++;assert.fail('legacy credential/worker ports forbidden')},
   chromium:{launch:async options=>{launched=await chromium.launch(options);const originalContext=launched.newContext.bind(launched);launched.newContext=async options=>{const context=await originalContext(options);const newPage=context.newPage.bind(context);context.newPage=async()=>{const page=await newPage();const wait=page.waitForResponse.bind(page);page.waitForResponse=(predicate,options={})=>wait(predicate,{...options,timeout:Math.min(options.timeout??1500,1500)});const waitUrl=page.waitForURL.bind(page);page.waitForURL=(predicate,options={})=>waitUrl(predicate,{...options,timeout:Math.min(options.timeout??1500,1500)});return page;};return context;};return launched;}}
  });
  vm.runInContext(nativeDeclarations+'\nglobalThis.nativeJourney=runJourney;',ctx);
  try{
   if(scenario==='success'){await ctx.nativeJourney();assert.equal(ctx.result.stage,'existing_matter_waiting_for_exclusive_worker');assert.equal(ctx.result.generatedJob.id,job().id);assert.equal(ctx.result.fullHostedJourneyCompleted,false);assert.deepEqual(fixture.counts,{signin:1,save:1,verify:1,generation:1,unexpected:0});assert.equal(jobReads,1);assert.equal(ctx.generationRequests.length,1);assert.equal(ctx.result.workerInvoked,false);assert.equal(JSON.stringify(ctx.result).includes('never-record'),false);}
   else {await assert.rejects(ctx.nativeJourney(),scenario==='wrong_revision'?/packet_information/:scenario==='non200'?/generation/:['lost_response','verify_refusal'].includes(scenario)?/Timeout|generation/:scenario==='guard_denial'?/Timeout|guard|request/:undefined);assert.equal(jobReads,0);assert.equal(fixture.counts.unexpected,0);if(scenario==='disabled')assert.equal(fixture.counts.signin,0);if(['lost_response','non200'].includes(scenario))assert.equal(fixture.counts.generation,1);if(scenario==='verify_refusal'){assert.equal(fixture.counts.verify,1);assert.equal(fixture.counts.generation,0);}if(scenario==='wrong_revision'){assert.equal(fixture.counts.save,1);assert.equal(fixture.counts.verify,0);assert.equal(fixture.counts.generation,0);}if(scenario==='guard_denial'){assert.equal(fixture.counts.save,0);assert.equal(fixture.counts.generation,0);assert.ok(ctx.browserErrors.includes('existing_matter_request_refused'));}}
   assert.equal(workerCalls,0);
  }finally{await launched?.close();await fixture.close();}
 });
});

test('fresh staged frontend collector reads only the exact new sign-in bundle and records deployment-specific CAPTCHA proof',async()=>{
 const seen=[];const ctx=harness({environmentClassification:{...preview,hostname:new URL(base).hostname,deploymentId:'dpl_New'},
  fetch:async url=>{seen.push(url);return {status:200,text:async()=>url.includes('/expungement-ai/sign-in')?'<script src="/_next/static/chunks/signin.js"></script>':'synthetic-shipped-chunk'};},
  inspectShippedCaptcha:chunks=>{assert.equal(chunks[0].body,'synthetic-shipped-chunk');return {clientCaptchaRequired:false,widgetSiteKeyConfigured:true};}});
 const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='readExistingClinicFrontendCaptcha');vm.runInContext(n.getText(ast)+';globalThis.frontendRead=readExistingClinicFrontendCaptcha;',ctx);
 const proof=await ctx.frontendRead();assert.equal(proof.deploymentId,'dpl_New');assert.equal(proof.applicationSha,CLINIC_SETUP.app);assert.equal(seen.length,2);assert.ok(seen.every(url=>new URL(url).origin===base));
 ctx.environmentClassification.hostname='wrong.vercel.app';await assert.rejects(ctx.frontendRead());assert.equal(seen.length,2);
 const blocked=harness({readResumeCaptchaPolicy:async()=>{throw new Error('Required or unknown CAPTCHA');}});await assert.rejects(blocked.api.requireExistingClinicPacketExecution(),/CAPTCHA/);
});

test('private read failures retain HTTP and SQLSTATE without retaining provider error text',async()=>{
 const ctx=harness({fetch:async()=>({status:403,json:async()=>({code:'42501',message:'private-do-not-retain'})})});
 await assert.rejects(ctx.api.readExistingClinicReadonlyRows('select 1','probe'));
 assert.equal(ctx.result.probe.httpStatus,403);assert.equal(ctx.result.probe.sqlstate,'42501');assert.equal(JSON.stringify(ctx.result).includes('private-do-not-retain'),false);
});
test('native creation artifact validates the separate live target and refuses ordinary/other-target receipts',()=>{
 const live={...preview,deploymentId:'dpl_New',hostname:new URL(base).hostname,projectId:'prj_Synthetic',workerSourceSha:'16908485a94f475448657cea90583a4d352da9a3',workerDigest:'sha256:'+'a'.repeat(64),stagingScopeSha256:'b'.repeat(64)};
 const metadata={rcapApplicationSha:CLINIC_SETUP.app,rcapWorkerSourceSha:live.workerSourceSha,rcapWorkerDigest:live.workerDigest,rcapAcceptanceProjectRef:CLINIC_SETUP.project,rcapPreviewPurpose:'mississippi_clinic',rcapClinicDemoMode:'mississippi_preview',rcapRouteState:'staging_scoped',rcapStagingScopeSha256:live.stagingScopeSha256,rcapStripeConfigured:'false'};
 const deploy={schemaVersion:'rcap-hosted-acceptance-deploy/v1',passed:true,acceptanceProjectRef:CLINIC_SETUP.project,neverPassedProdFlag:true,neverWroteProjectLevelEnv:true,failedCases:[],requiredCases:['deployed_to_preview_not_production','deployment_carries_the_final_application_sha','deployment_carries_the_accepted_worker_binding','bound_to_the_acceptance_supabase_project_only','production_aliases_unchanged','production_environment_variables_unchanged','clinic_scope_and_purpose_exact'],deployment:{id:live.deploymentId,immutableHostname:live.hostname,projectId:live.projectId,gitSourceSha:CLINIC_SETUP.app,readyState:'READY',target:'preview',metadata}};
 const ctx=harness({environmentClassification:live,path:{join:(...a)=>a.join('/')},fs:{readFileSync:path=>JSON.stringify(path.endsWith('deploy.json')?deploy:{schemaVersion:'rcap-hosted-acceptance-preflight/v1',passed:true,acceptanceProjectRef:CLINIC_SETUP.project})},required:key=>key.endsWith('RUN_ID')?'40299999999':'/fixture/native'});
 const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='assertExistingClinicPreviewCreation');vm.runInContext(n.getText(ast)+';globalThis.creationCheck=assertExistingClinicPreviewCreation;',ctx);
 // Native JSON parsing and checks occur in the actual VM realm.
 assert.equal(ctx.creationCheck().deploymentId,live.deploymentId);
 deploy.deployment.id='dpl_Other';assert.throws(ctx.creationCheck);deploy.deployment.id=live.deploymentId;deploy.deployment.metadata.rcapRouteState='disabled';assert.throws(ctx.creationCheck);
 ctx.required=key=>key.endsWith('RUN_ID')?'40057159400':'/fixture/native';assert.throws(ctx.creationCheck);
});
