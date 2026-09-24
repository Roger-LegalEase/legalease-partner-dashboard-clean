import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {CANDIDATE_PATH, verifyReleaseCandidateBinding} from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import {assertPreviewResponse, createPreviewRequest, createRestPreview, FROZEN_APPLICATION_SHA, FROZEN_WORKER_METADATA, CREATE_PREVIEW_URL} from './rcap-hosted-vercel-rest-transport.mjs';
import {hostedVercelScopedUrl, resolveHostedVercelIdentity, HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID, HOSTED_VERCEL_PROJECT_NAME, expectedHostedReturnOrigin} from './rcap-hosted-acceptance-vercel-identity.mjs';
const identity={teamId:HOSTED_VERCEL_TEAM_ID,projectId:HOSTED_VERCEL_PROJECT_ID,projectName:HOSTED_VERCEL_PROJECT_NAME};
const source=fs.readFileSync(new URL('./rcap-hosted-acceptance-deploy.mjs',import.meta.url),'utf8');
function fixture(route='',{catalog='prod_synthetic',email=null}={}) {
  // Evaluate the actual unchanged env construction, including every env/build-env
  // value. Every free name the block reads must be supplied here: when the
  // deployment env grew CATALOG_PRODUCT_ID, LEGAL_AID_EMAIL and
  // acceptanceServerSecret and this context did not, every test below stopped
  // running on `CATALOG_PRODUCT_ID is not defined` rather than on a contract.
  const context={RETURN_ORIGIN:expectedHostedReturnOrigin(FROZEN_APPLICATION_SHA),SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',keys:{anon:'synthetic-anon',service:'synthetic-service'},ROUTE_STATE:route,SCOPE_IDS:route?'synthetic-id':'',CATALOG_PRODUCT_ID:catalog,LEGAL_AID_EMAIL:email,acceptanceServerSecret:(purpose,bytes)=>Buffer.alloc(bytes,7),Buffer,process:{env:{HOSTED_STRIPE_TEST_SECRET:'sk_test_synthetic',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'whsec_synthetic'}}};
  const env=vm.runInNewContext(source.slice(source.indexOf('const runtimeEnv ='),source.indexOf('// A live Stripe key'))+'\nJSON.stringify({runtimeEnv,buildEnv});',context);
  return {identity,token:'synthetic-token',applicationSha:FROZEN_APPLICATION_SHA,...JSON.parse(env),meta:{...FROZEN_WORKER_METADATA,rcapApplicationSha:FROZEN_APPLICATION_SHA,rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapStripeConfigured:'true',rcapRouteState:route||'disabled',rcapReturnOrigin:context.RETURN_ORIGIN,rcapClinicDemoMode:'none',rcapStagingScopeSha256:'a'.repeat(64)}};
}
function response(o,changes={}) {return {id:'dpl_Synthetic123',url:'synthetic-preview.vercel.app',target:null,projectId:HOSTED_VERCEL_PROJECT_ID,gitSource:{sha:FROZEN_APPLICATION_SHA},meta:o.meta,readyState:'READY',...changes};}
function mock(o,{status=200,changes={}}={}) {
  const calls=[];return {calls,fetchImpl:async(url,init)=>{calls.push({url,init});return {ok:status>=200&&status<300,status,json:async()=>response(o,changes)};}};
}
test('exact team/project/SHA and per-deployment runtime/build values; no production override',async()=>{
  // Both optional branches of the deployment env are exercised: the catalog
  // Product that the Checkout path needs, and the nonproduction email provider
  // that only the Legal Aid phase supplies.
  for(const [route,options] of [['',{}],['staging_scoped',{}],['',{catalog:''}],['staging_scoped',{email:{apiKey:'synthetic-resend',from:'synthetic@example.test'}}]]) {
    const o=fixture(route,options);const m=mock(o);await createRestPreview({...o,target:'production',projectSettings:{},env:{VERCEL_ENV:'production'}},m);
    assert.equal(Object.hasOwn(o.runtimeEnv,'STRIPE_CONSUMER_PACKET_PRODUCT_ID'),Boolean(options.catalog??'prod_synthetic'));
    assert.equal(Object.hasOwn(o.runtimeEnv,'RESEND_API_KEY'),Boolean(options.email));
    assert.equal(m.calls.length,1);assert.equal(m.calls[0].url,`https://api.vercel.com/v13/deployments?teamId=${HOSTED_VERCEL_TEAM_ID}`);
    const b=JSON.parse(m.calls[0].init.body);assert.equal(b.project,HOSTED_VERCEL_PROJECT_ID);assert.equal(b.name,HOSTED_VERCEL_PROJECT_NAME);
    assert.deepEqual(b.gitSource,{type:'github',repoId:'1248656766',ref:FROZEN_APPLICATION_SHA,sha:FROZEN_APPLICATION_SHA});
    assert.deepEqual(b.env,o.runtimeEnv);assert.deepEqual(b.build.env,o.buildEnv);assert.deepEqual(b.meta,o.meta);
    for(const key of ['target','customEnvironmentSlugOrId','withLatestCommit','projectSettings','deploymentId'])assert.equal(Object.hasOwn(b,key),false,key);
    assert.equal(m.calls[0].init.redirect,'error');
  }
});
test('wrong team, project, project name, SHA, acceptance project and live Stripe refuse before HTTP',async()=>{
  for(const patch of [{identity:{...identity,teamId:'team_wrong'}},{identity:{...identity,projectId:'prj_wrong'}},{identity:{...identity,projectName:'wrong'}},{applicationSha:'0'.repeat(40)},{meta:{...fixture().meta,rcapAcceptanceProjectRef:'wrong'}},{runtimeEnv:{...fixture().runtimeEnv,STRIPE_SECRET_KEY:'sk_live_never'}},{buildEnv:{...fixture().buildEnv,VERCEL_ENV:'production'}}]) {
    const o={...fixture(),...patch};const m=mock(o);await assert.rejects(createRestPreview(o,m));assert.equal(m.calls.length,0);
  }
});
test('every accepted worker identity is required in request and remote readback',async()=>{
  for(const key of Object.keys(FROZEN_WORKER_METADATA)) for(const value of [undefined,'wrong']) {
    const o=fixture();o.meta[key]=value;const m=mock(o);
    await assert.rejects(createRestPreview(o,m),/REST_ACCEPTED_WORKER_MISMATCH/);
    assert.equal(m.calls.length,0);
    const valid=fixture();const remote=mock(valid,{changes:{meta:{...valid.meta,[key]:value}}});
    await assert.rejects(createRestPreview(valid,remote),/REST_ACCEPTED_WORKER_MISMATCH/);
    assert.equal(remote.calls.length,1);
  }
});
test('REST identity resolves pinned name, ID and owner and refuses wrong owners before creation',async()=>{
  for(const [patch,valid] of [[{},true],[{id:'prj_wrong'},false],[{accountId:'team_wrong'},false],[{name:'wrong'},false]]) {
    const calls=[];const promise=resolveHostedVercelIdentity({token:'synthetic',fetchImpl:async(url,init)=>{calls.push(url);assert.equal(init.method,undefined);return {ok:true,text:async()=>JSON.stringify({id:identity.projectId,name:identity.projectName,accountId:identity.teamId,...patch})};}});
    if(valid)assert.deepEqual(await promise,{...identity,teamSlug:'roger947s-projects'});else await assert.rejects(promise);
    assert.equal(calls[0],`https://api.vercel.com/v9/projects/${HOSTED_VERCEL_PROJECT_NAME}?teamId=${HOSTED_VERCEL_TEAM_ID}`);
  }
});
for(const status of [401,403,429,500])test(`creation HTTP ${status} fails closed with one POST`,async()=>{
  const o=fixture(),m=mock(o,{status});await assert.rejects(createRestPreview(o,m),new RegExp(`REST_CREATE_HTTP_${status}`));assert.equal(m.calls.length,1);
});
for(const changes of [{id:null},{id:'wrong'},{target:'production'},{target:undefined},{url:'evil.example'},{projectId:'prj_wrong'},{gitSource:{sha:'0'.repeat(40)}},{meta:{}},{readyState:'ERROR'}])test(`invalid creation response refuses ${JSON.stringify(changes)}`,async()=>{
  const o=fixture(),m=mock(o,{changes});await assert.rejects(createRestPreview(o,m));assert.equal(m.calls.length,1);
});
// The controlling binding names the application and accepted worker separately.
// Publication proves the worker source/digest; input equivalence permits that
// worker to serve a later bound application. Neither publication nor tools
// history substitutes for application authority.
function frozenReleaseWorld(){
  const root=new URL('..',import.meta.url);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  return {
    git,
    frozen:FROZEN_APPLICATION_SHA,
    candidate:JSON.parse(fs.readFileSync(new URL(CANDIDATE_PATH,root),'utf8')),
    head:git(['rev-parse','HEAD']),
    evidence:JSON.parse(fs.readFileSync(new URL('./data/rcap-render/worker-publication-evidence.json',root),'utf8')),
    rootDir:new URL('.',root).pathname.replace(/\/$/,'')
  };
}

async function frozenReleaseProblems(w){
  const out=[];
  const fail=(ok,message)=>{ if(!ok) out.push(message); };
  const e=w.evidence;
  const candidate=w.candidate;
  const currentness=verifyReleaseCandidateBinding(w.rootDir,candidate,candidate.participantReceiptPaths??[]);
  fail(currentness.current===true && currentness.status==='CURRENT',`the release binding is not current: ${currentness.reasons.join('; ')}`);
  fail(w.frozen===candidate.applicationSha,'the transport does not name the bound application');
  fail(/^[0-9a-f]{40}$/.test(w.frozen),'the frozen application pin is not an exact 40-character SHA');
  fail((()=>{ try{ return w.git(['cat-file','-t',w.frozen])==='commit'; }catch{ return false; } })(),'the frozen application pin is not a commit in this repository');

  // The committed receipt must name the bound WORKER, and must be real.
  fail(e.sourceSha===candidate.workerSourceSha,`the publication evidence names ${e.sourceSha}, not the bound worker ${candidate.workerSourceSha}`);
  fail(e.immutableRegistryDigest===candidate.workerDigest,'the publication digest is not the bound worker digest');
  fail(e.workflowConclusion==='success','the publication evidence does not record a successful publication');
  fail(/^sha256:[0-9a-f]{64}$/.test(String(e.immutableRegistryDigest)),'the publication evidence carries no well-formed immutable digest');
  fail(Number.isInteger(e.workflowRunId)&&e.workflowRunId>0,'the publication evidence names no exact publication run');
  fail(e.imageTag===e.sourceSha,'the published tag is not the full source SHA');
  fail(e.mutableLatestTagCreated===false,'the publication created a mutable latest tag');
  // The digest must be the one the rest of the record is about. Shape alone
  // accepts any well-formed value, so a wrong-but-valid digest would otherwise
  // pass every check here; these tie it to the reference and to the acceptance.
  fail(String(e.digestPinnedReference).endsWith(`@${e.immutableRegistryDigest}`),
    `the digest-pinned reference ${e.digestPinnedReference} does not name ${e.immutableRegistryDigest}`);
  fail(String(e.imageReference)===`${e.imageRepository}:${e.imageTag}`,'the image reference does not name the repository and tag');
  fail(e.runtimeAccepted===true,'the published worker is not runtime accepted');
  fail(Boolean(e.imageAcceptance),'the publication has no image acceptance');
  if(e.imageAcceptance){
    fail(e.imageAcceptance.digest===e.immutableRegistryDigest,
      'the recorded image acceptance is for a different digest than the publication evidence');
    fail(e.imageAcceptance.conclusion==='success','the recorded image acceptance did not succeed');
    fail(e.imageAcceptance.tag===candidate.workerSourceSha,'the image acceptance names another worker source');
    fail(e.imageAcceptance.readOnly===true,'the image acceptance is not read-only');
  }

  // The accepted worker may precede the application, but it must be an
  // ancestor with identical canonical inputs.
  fail((()=>{ try{ w.git(['merge-base','--is-ancestor',e.sourceSha,w.frozen]); return true; }catch{ return false; } })(),
    'the accepted worker source is not an ancestor of the application');
  const {createWorkerInputPlan}=await import('./rcap-hosted-acceptance-worker-input-plan.mjs');
  let plan=null;
  try{
    plan=createWorkerInputPlan({rootDir:w.rootDir,candidateSha:w.frozen,
      acceptedSourceSha:e.sourceSha,acceptedDigest:e.immutableRegistryDigest});
  }catch(error){ fail(false,`the published source to frozen application plan could not be computed: ${error.message}`); }
  if(plan) {
    fail(plan.rebuildRequired===false,`the published worker source does not match the frozen application on canonical inputs: ${plan.changedPaths.join(', ')}`);
    fail(plan.aggregateInputSha256===candidate.workerInputFingerprint,'the application worker-input fingerprint differs from the binding');
  }

  // A later commit may carry the receipt; it does not become the candidate.
  fail((()=>{ try{ w.git(['merge-base','--is-ancestor',w.frozen,w.head]); return true; }catch{ return false; } })(),
    'the frozen application is not an ancestor of HEAD');
  let headPlan=null;
  try{
    headPlan=createWorkerInputPlan({rootDir:w.rootDir,candidateSha:w.head,
      acceptedSourceSha:e.sourceSha,acceptedDigest:e.immutableRegistryDigest});
  }catch(error){ fail(false,`the accepted worker source to HEAD plan could not be computed: ${error.message}`); }
  if(headPlan) fail(headPlan.changedPaths.length===0,`canonical worker inputs moved after the freeze: ${headPlan.changedPaths.join(', ')}`);
  return out;
}

test('the bound application reuses its independently accepted worker source and digest',async()=>{
  const base=frozenReleaseWorld();
  assert.deepEqual(await frozenReleaseProblems(base),[]);

  // Negative controls. Each must be refused; a check that cannot fail is not a check.
  const clone=()=>({...base,candidate:JSON.parse(JSON.stringify(base.candidate)),evidence:JSON.parse(JSON.stringify(base.evidence))});
  const refusals=[
    ['publication evidence for another source',w=>{ w.evidence.sourceSha='0'.repeat(40); }],
    ['another digest',w=>{ w.evidence.immutableRegistryDigest='sha256:'+'0'.repeat(64); }],
    ['a malformed digest',w=>{ w.evidence.immutableRegistryDigest='latest'; }],
    ['a failed publication',w=>{ w.evidence.workflowConclusion='failure'; }],
    ['no exact publication run',w=>{ w.evidence.workflowRunId=null; }],
    ['a tag that is not the source SHA',w=>{ w.evidence.imageTag='latest'; }],
    ['a mutable latest tag',w=>{ w.evidence.mutableLatestTagCreated=true; }],
    ['another application SHA',w=>{ w.frozen='0'.repeat(40); }],
    ...(base.candidate.workerSourceSha!==base.frozen ? [['worker source substituted for application',w=>{ w.frozen=w.candidate.workerSourceSha; }]] : []),
    ...(base.head!==base.frozen ? [['tools head substituted for application',w=>{ w.frozen=w.head; }]] : []),
    ['forged application binding',w=>{ w.candidate.applicationSha='0'.repeat(40); }],
    ['changed worker source binding',w=>{ w.candidate.workerSourceSha='0'.repeat(40); }],
    ['missing runtime acceptance',w=>{ w.evidence.runtimeAccepted=false; }],
    ['missing image acceptance',w=>{ w.evidence.imageAcceptance=null; }]
  ];
  for(const [label,mutate] of refusals){
    const w=clone(); mutate(w);
    assert.ok((await frozenReleaseProblems(w)).length>0,`${label}: must be refused`);
  }
});
test('the frozen application pin is the application this tree releases, not an older one',async()=>{
  // Retain the explicit application freeze as well as binding validation:
  // the bound application is on the history leading to HEAD, and no frozen
  // application byte moved after it. A reusable worker source is independent.
  const root=new URL('..',import.meta.url);
  const candidate=JSON.parse(fs.readFileSync(new URL(CANDIDATE_PATH,root),'utf8'));
  assert.equal(FROZEN_APPLICATION_SHA,candidate.applicationSha);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(['merge-base','--is-ancestor',FROZEN_APPLICATION_SHA,'HEAD']);
  // The canonical closure, read from the plan rather than hand-listed, so a
  // newly canonical input is covered here the day it is added.
  const {createWorkerInputPlan}=await import('./rcap-hosted-acceptance-worker-input-plan.mjs');
  const head=git(['rev-parse','HEAD']);
  const plan=createWorkerInputPlan({rootDir:new URL('.',root).pathname.replace(/\/$/,''),candidateSha:head,
    acceptedSourceSha:candidate.workerSourceSha,acceptedDigest:candidate.workerDigest});
  assert.deepEqual(plan.changedPaths,[],
    `canonical worker inputs moved after the bound worker source: ${plan.changedPaths.join(', ')}`);
  const moved=git(['diff','--name-only','--no-renames',FROZEN_APPLICATION_SHA,head,'--','src','public','supabase','package.json','package-lock.json','tsconfig.json','next.config.ts','postcss.config.mjs','tailwind.config.ts','docs/record-clearing/field-map-drafts'])
    .split('\n').filter(Boolean);
  assert.deepEqual(moved,[],`application paths moved after the frozen pin: ${moved.join(', ')}`);
});
test('ambiguous network response is never retried',async()=>{
  let calls=0;await assert.rejects(createRestPreview(fixture(),{fetchImpl:async()=>{calls++;throw Error('network');}}));assert.equal(calls,1);
});
test('build polling is GET-only, exact ID-bound, and never creates twice',async()=>{
  const o=fixture(),calls=[];
  const r=await createRestPreview(o,{sleep:async()=>{},fetchImpl:async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>response(o,{readyState:calls.length===1?'BUILDING':'READY'})};}});
  assert.equal(r.creationCalls,1);assert.deepEqual(calls.map(c=>c.init.method),['POST','GET']);assert.match(calls[1].url,/\/dpl_Synthetic123\?teamId=team_/);
  const m=mock(o,{changes:{readyState:'BUILDING'}});await assert.rejects(createRestPreview(o,{...m,maxPolls:0}),/REST_BUILD_TIMEOUT_NO_RETRY/);assert.equal(m.calls.length,1);
});
test('unchanged runtime environment and probes preserved; alias gated after exact identity',()=>{
  // Re-pinned from 6a0217b024c to 7d606f90a, the commit that owns these
  // segments today. Two of the four had legitimately moved forward since
  // 6a0217b: findReusableDeployment gained the rcapCatalogProduct
  // discriminator, so a Preview built for a different catalog Product is no
  // longer reusable, and the deployment env gained the catalog Product, the
  // Legal Aid email provider and the per-acceptance server secrets. Both are
  // deliberate product moves the older pin could not describe -- and it never
  // reported them, because the whole suite was failing to evaluate first.
  // Re-pinning is the mechanism; the end marker is now the same on both sides
  // rather than two different ones that only happened to align at 6a0217b.
  const baseline=execFileSync('git',['show','7d606f90ac9f750f94d2c7b99a3bb2c38f2fb2a3:scripts/rcap-hosted-acceptance-deploy.mjs'],{encoding:'utf8'});
  const segment=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
  // Reuse and before/after snapshots now bind the accepted worker and require
  // successful readback. Their new behavior is executed below; the unchanged
  // application environment and remote probe bodies retain the historical check.
  for(const [a,b] of [['const runtimeEnv =','const deploymentMeta ='],['// --- 4. Probe','// --- verdict']]) {
    assert.notEqual(segment(source,a,b),'',a);
    assert.equal(segment(source,a,b),segment(baseline,a,b));
  }
  assert(source.indexOf('await resolveHostedVercelIdentity')<source.indexOf('await createRestPreview'));
  assert(source.indexOf('if (reusable)')<source.indexOf('await createRestPreview'));
  const aliasGuard='if (deploymentId && verdicts.get("deployed_to_preview_not_production")?.passed && verdicts.get("deployment_carries_the_final_application_sha")?.passed)';
  assert(source.includes(aliasGuard));assert(source.indexOf(aliasGuard)<source.indexOf('/aliases`, {'));
  assert.doesNotMatch(source,/spawn\(|"--prod"|args\.push/);
  const transport=fs.readFileSync(new URL('./rcap-hosted-vercel-rest-transport.mjs',import.meta.url),'utf8');assert.doesNotMatch(transport,/\/projects\/.*\/env/);
  assert.equal((transport.match(/method:'POST'/g)||[]).length,1);
});

test('terminal state-specific failures preserve hostname, errors, timestamps and one creation count',async()=>{
  for(const state of ['ERROR','CANCELED','CANCELLED','PAUSED','BLOCKED']) {
    const o=fixture(),receipts=[];const m=mock(o,{changes:{readyState:state,errorCode:'BUILD_FAILED',errorStep:'build',errorMessage:'Build command exited 1',stateReason:'test failure',readyStateReason:'The deployment failed because of an internal Vercel error.',createdAt:123,buildingAt:456,readyStateAt:789,build:{env:{PRIVATE_KEY:'synthetic-private-value'},command:'npm run build'}}});
    await assert.rejects(createRestPreview(o,{...m,onState:r=>receipts.push(r)}),new RegExp(`REST_BUILD_${state}$`));
    const last=receipts.at(-1);assert.equal(last.id,'dpl_Synthetic123');assert.equal(last.url,'synthetic-preview.vercel.app');assert.equal(last.readyState,state);assert.equal(last.errorCode,'BUILD_FAILED');assert.equal(last.errorStep,'build');assert.equal(last.stateReason,'test failure');assert.equal(last.readyStateReason,'The deployment failed because of an internal Vercel error.');assert.equal(last.createdAt,123);assert.equal(last.buildingAt,456);assert.equal(last.creationPostCount,1);assert.equal(last.creationHttpStatus,200);assert(last.observedAt);assert.equal(last.build.env,'[REDACTED]');assert.equal(m.calls.length,1);
  }
});
test('poll failure retains last observed exact deployment and creation receipt',async()=>{
  const o=fixture(),receipts=[];let n=0;
  await assert.rejects(createRestPreview(o,{sleep:async()=>{},onState:r=>receipts.push(r),fetchImpl:async()=>{n++;return {ok:n===1,status:n===1?200:403,json:async()=>response(o,{readyState:'BUILDING',createdAt:100})};}}),/REST_POLL_HTTP_403/);
  const last=receipts.at(-1);assert.equal(last.id,'dpl_Synthetic123');assert.equal(last.url,'synthetic-preview.vercel.app');assert.equal(last.readyState,'BUILDING');assert.equal(last.creationHttpStatus,200);assert.equal(last.pollHttpStatus,403);assert.equal(last.creationPostCount,1);
});
test('diagnosis makes only exact bounded GETs and redacts secrets before receipt',async()=>{
  const {diagnoseFailedPreview,FAILED_PREVIEW_ID,FAILED_PREVIEW_SOURCE_SHA}=await import('./rcap-hosted-vercel-diagnostics.mjs');
  // The audited deployment is the historical failed Preview, not today's frozen candidate.
  assert.notEqual(FAILED_PREVIEW_SOURCE_SHA,FROZEN_APPLICATION_SHA);
  const calls=[],saved=[];
  const result=await diagnoseFailedPreview({token:'synthetic-private-token',onReceipt:r=>saved.push(r),fetchImpl:async(url,init)=>{
    calls.push({url,init});const data=calls.length===1?{...response(fixture()),id:FAILED_PREVIEW_ID,gitSource:{sha:FAILED_PREVIEW_SOURCE_SHA},build:{env:{SECRET:'synthetic-hidden-env'},command:'npm run build'},errorMessage:'synthetic-private-token synthetic-hidden-env'}:[{type:'stderr',text:'sk_live_secretvalue'}];
    return {ok:true,status:200,text:async()=>JSON.stringify(data)};
  }});
  assert.equal(result.passed,true);assert.equal(calls.length,2);assert(calls.every(c=>c.init.method==='GET'&&c.init.redirect==='error'));
  assert.equal(calls[0].url,`https://api.vercel.com/v13/deployments/${FAILED_PREVIEW_ID}?teamId=${HOSTED_VERCEL_TEAM_ID}`);
  const events=new URL(calls[1].url);assert.equal(events.pathname,`/v3/deployments/${FAILED_PREVIEW_ID}/events`);assert.equal(events.searchParams.get('follow'),'0');assert.equal(events.searchParams.get('limit'),'2000');assert.equal(events.searchParams.get('builds'),'1');assert.equal(events.searchParams.get('teamId'),HOSTED_VERCEL_TEAM_ID);
  assert.doesNotMatch(JSON.stringify(saved),/synthetic-private-token|synthetic-hidden-env|sk_live_secretvalue/);
});
test('state fallback, ambiguous creation and timeouts keep distinct evidence',async()=>{
  const o=fixture(),saved=[];const m=mock(o,{changes:{readyState:undefined,state:'ERROR'}});
  await assert.rejects(createRestPreview(o,{...m,onState:r=>saved.push(r)}),/REST_BUILD_ERROR/);assert.equal(saved.at(-1).state,'ERROR');
  const ambiguous=[];await assert.rejects(createRestPreview(o,{onState:r=>ambiguous.push(r),fetchImpl:async()=>{throw Error('network');}}));assert.equal(ambiguous.at(-1).creationPostCount,1);assert.equal(ambiguous.at(-1).creationHttpStatus,null);assert.equal(ambiguous.at(-1).phase,'CREATE_ATTEMPTED');
  const timeout=[];await assert.rejects(createRestPreview(o,{...mock(o,{changes:{readyState:'BUILDING'}}),onState:r=>timeout.push(r),maxPolls:0}),/REST_BUILD_TIMEOUT_NO_RETRY/);assert.equal(timeout.at(-1).readyState,'BUILDING');assert.equal(timeout.at(-1).pollTimedOut,true);
});

// Execute the actual deploy/resolver program and REST transport with provider
// responses at the fetch boundary. No deployment, Auth or queue call is real.
async function executePreviewProgram(name, {missingOwner=false, boundaryStatus=200, afterEnvChanged=false, reused=false, remotePatch={}, receiptFailure=false}={}) {
  const calls=[], writes=new Map(); let deployment=null, aliasBound=reused, envReads=0;
  const owner='b6dc86a3-12bb-490d-b130-48d95d426a1e';
  const origin=expectedHostedReturnOrigin(FROZEN_APPLICATION_SHA);
  const meta={...fixture('staging_scoped').meta,rcapCatalogProduct:'prod_synthetic',rcapStagingScopeSha256:crypto.createHash('sha256').update(owner).digest('hex')};
  const remote=()=>({...response({meta}),...remotePatch});
  if(reused) deployment=remote();
  const fetchImpl=async(input,init={})=>{
    const url=new URL(input); const method=init.method??'GET';calls.push({url:String(url),method,body:init.body});
    const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
    if(url.pathname.endsWith('/env')) {
      envReads++;return reply({envs:[{key:'PRODUCTION_SENTINEL',target:['production'],updatedAt:afterEnvChanged&&envReads>1?2:1}]},boundaryStatus);
    }
    if(url.pathname.startsWith('/v9/projects/'))return reply({...identity,id:identity.projectId,name:identity.projectName,accountId:identity.teamId,alias:[{target:'PRODUCTION',domain:'production.example.test'}]});
    if(url.pathname.endsWith('/api-keys')) return reply([{name:'anon',api_key:'synthetic-anon'},{name:'service_role',api_key:'synthetic-service'}]);
    if(url.pathname.endsWith('/database/query')) return reply(missingOwner?[]:[{id:owner}]);
    if(url.pathname==='/v6/deployments') return reply({deployments:deployment?[{...deployment,uid:deployment.id}]:[]});
    if(url.pathname==='/v13/deployments'&&method==='POST') {
      const body=JSON.parse(init.body);deployment={...response({meta:body.meta}),...remotePatch};return reply(deployment);
    }
    if(url.pathname.endsWith('/aliases')) {
      if(method==='POST'){assert.equal(JSON.parse(init.body).alias,new URL(origin).host);aliasBound=true;return reply({});}
      return reply({aliases:[]});
    }
    if(url.pathname.startsWith('/v13/deployments/')) {
      if(url.pathname.endsWith(new URL(origin).host)&&!aliasBound)return reply({},404);
      return deployment?reply(deployment):reply({},404);
    }
    if(url.pathname==='/api/health')return reply({checks:{database:'ok'}});
    if(url.pathname==='/api/expungement-ai/packet/render')return reply({error:'unauthorized'},401);
    throw new Error(`unexpected provider call ${method} ${url.pathname}`);
  };
  const env={VERCEL_TOKEN:'synthetic-token',SUPABASE_ACCESS_TOKEN:'synthetic-access',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',HOSTED_APPLICATION_SHA:FROZEN_APPLICATION_SHA,HOSTED_ROUTE_STATE:'staging_scoped',HOSTED_EXISTING_PARTICIPANT_ONLY:'true',HOSTED_REQUIRE_STAGING_SCOPED:'true',HOSTED_STRIPE_TEST_SECRET:'sk_test_synthetic',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'whsec_synthetic',HOSTED_STRIPE_CATALOG_PRODUCT_ID:'prod_synthetic'};
  if(name==='rcap-hosted-resolve-preview.mjs')env.HOSTED_PREVIEW_DEPLOYMENT_ID='dpl_Synthetic123';
  const program=fs.readFileSync(new URL(`./${name}`,import.meta.url),'utf8').replace(/^#![^\n]*\n/,'').replace(/^import[\s\S]*?;\n/gm,'').replaceAll('import.meta.url',JSON.stringify(new URL(`./${name}`,import.meta.url).href));
  let exitCode=0,error=null;
  const context={crypto,createHash:crypto.createHash,path,fileURLToPath,Buffer,URL,console:{log(){},error(){}},process:{env,cwd:()=>process.cwd(),exit:code=>{throw Object.assign(new Error('PROGRAM_EXIT'),{exitCode:code});}},fs:{mkdirSync(){},writeFileSync:(p,data)=>{if(receiptFailure&&deployment)throw new Error('RECEIPT_WRITE_FAILED');writes.set(path.basename(p),JSON.parse(data));}},prepareHostedAcceptanceEvidenceLayout:()=>({root:'/synthetic-evidence'}),resolveHostedVercelIdentity:options=>resolveHostedVercelIdentity({...options,fetchImpl}),hostedVercelScopedUrl,expectedHostedReturnOrigin,FROZEN_APPLICATION_SHA,FROZEN_WORKER_METADATA,assertPreviewResponse,createRestPreview:options=>createRestPreview(options,{fetchImpl,sleep:async()=>{}}),fetch:fetchImpl};
  try {await vm.runInNewContext(`(async()=>{${program}\n})()`,context);} catch(e){exitCode=e.exitCode??1;error=e.message;}
  return {exitCode,error,calls,writes,meta};
}

test('actual replacement Preview loop creates once, preserves Production and uses the existing owner',async()=>{
  const r=await executePreviewProgram('rcap-hosted-acceptance-deploy.mjs');
  assert.equal(r.exitCode,0,r.error);
  const e=r.writes.get('deploy.json');assert.equal(e.passed,true);
  assert.equal(e.deployment.target,null);assert.equal(e.deployment.readyState,'READY');assert.equal(e.deployment.gitSourceSha,FROZEN_APPLICATION_SHA);
  for(const [key,value] of Object.entries(FROZEN_WORKER_METADATA))assert.equal(e.deployment.metadata[key],value);
  assert.deepEqual(e.productionBefore,e.productionAfter);
  assert.deepEqual(e.syntheticConsumerBootstrap,['reused_acceptance-consumer-a']);
  assert.equal(r.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname==='/v13/deployments').length,1);
  assert.equal(r.calls.some(c=>c.url.includes('/auth/v1/admin')),false);
  assert.equal(r.calls.some(c=>c.method!=='GET'&&c.url.includes('/projects/')&&!c.url.includes('/database/query')),false);
});

test('actual replacement Preview refuses missing existing owner and unreadable boundary before create',async()=>{
  for(const options of [{missingOwner:true},{boundaryStatus:403}]) {
    const r=await executePreviewProgram('rcap-hosted-acceptance-deploy.mjs',options);
    assert.equal(r.exitCode,1);
    assert.equal(r.calls.some(c=>c.method==='POST'&&new URL(c.url).pathname==='/v13/deployments'),false);
    assert.equal(r.calls.some(c=>c.url.includes('/auth/v1/admin')),false);
  }
});

test('actual Preview rejects source/worker/target drift before aliasing and never repeats a creation',async()=>{
  for(const remotePatch of [{target:'production'},{gitSource:{sha:'0'.repeat(40)}},{meta:{...fixture().meta,rcapWorkerDigest:'sha256:'+'0'.repeat(64)}}]) {
    const r=await executePreviewProgram('rcap-hosted-acceptance-deploy.mjs',{remotePatch});assert.equal(r.exitCode,1);
    assert.equal(r.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname==='/v13/deployments').length,1);
    assert.equal(r.calls.some(c=>c.method==='POST'&&c.url.includes('/aliases')),false);
  }
  const receipt=await executePreviewProgram('rcap-hosted-acceptance-deploy.mjs',{receiptFailure:true});
  assert.equal(receipt.exitCode,1);assert.equal(receipt.error,'RECEIPT_WRITE_FAILED');
  assert.equal(receipt.calls.filter(c=>c.method==='POST'&&new URL(c.url).pathname==='/v13/deployments').length,1);
  assert.equal(receipt.calls.some(c=>c.method==='POST'&&c.url.includes('/aliases')),false);
  const changed=await executePreviewProgram('rcap-hosted-acceptance-deploy.mjs',{afterEnvChanged:true});
  assert.equal(changed.exitCode,1);assert.equal(changed.writes.get('deploy.json').passed,false);
  assert(changed.writes.get('deploy.json').failedCases.includes('production_environment_variables_unchanged'));
});

test('actual resolver accepts exact READY Preview and rejects wrong worker, source, project and target without writes',async()=>{
  for(const remotePatch of [{},{target:'production'},{gitSource:{sha:'0'.repeat(40)}},{projectId:'prj_wrong'},{meta:{...fixture().meta,rcapWorkerDigest:'sha256:'+'0'.repeat(64)}}]) {
    const r=await executePreviewProgram('rcap-hosted-resolve-preview.mjs',{reused:true,remotePatch});
    assert.equal(r.exitCode,Object.keys(remotePatch).length?1:0,r.error);
    assert.equal(r.writes.get('preview-resolution.json')?.outcome,Object.keys(remotePatch).length?'refused_no_exact_preview':'reused_exact_ready_preview');
    assert.equal(r.calls.some(c=>c.method!=='GET'&&new URL(c.url).hostname==='api.vercel.com'),false);
  }
});
