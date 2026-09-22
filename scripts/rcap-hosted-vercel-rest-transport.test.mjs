import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createPreviewRequest, createRestPreview, FROZEN_APPLICATION_SHA, CREATE_PREVIEW_URL} from './rcap-hosted-vercel-rest-transport.mjs';
import {resolveHostedVercelIdentity, HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID, HOSTED_VERCEL_PROJECT_NAME, expectedHostedReturnOrigin} from './rcap-hosted-acceptance-vercel-identity.mjs';
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
  return {identity,token:'synthetic-token',applicationSha:FROZEN_APPLICATION_SHA,...JSON.parse(env),meta:{rcapApplicationSha:FROZEN_APPLICATION_SHA,rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapStripeConfigured:'true',rcapRouteState:route||'disabled',rcapReturnOrigin:context.RETURN_ORIGIN,rcapClinicDemoMode:'none',rcapStagingScopeSha256:'a'.repeat(64)}};
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
// The old invariant read the publication receipt out of the FROZEN TREE and
// required it to name the accepted worker. That is unsatisfiable for any
// release whose worker is built FROM the freeze: the receipt is produced by a
// run that happens after the application is frozen, so the frozen commit can
// never contain it. It held only while the worker predated the application,
// and the correct repair is the real lifecycle, not a newer application SHA.
//
//   frozen application  ->  worker published FROM it  ->  receipt committed after
//
// Held as data so the negative controls below mutate one fact and re-run the
// same checks, rather than asserting the happy path and hoping.
function frozenReleaseWorld(){
  const root=new URL('..',import.meta.url);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  return {
    git,
    frozen:FROZEN_APPLICATION_SHA,
    head:git(['rev-parse','HEAD']),
    evidence:JSON.parse(fs.readFileSync(new URL('./data/rcap-render/worker-publication-evidence.json',root),'utf8')),
    rootDir:new URL('.',root).pathname.replace(/\/$/,'')
  };
}

async function frozenReleaseProblems(w){
  const out=[];
  const fail=(ok,message)=>{ if(!ok) out.push(message); };
  const e=w.evidence;
  fail(/^[0-9a-f]{40}$/.test(w.frozen),'the frozen application pin is not an exact 40-character SHA');
  fail((()=>{ try{ return w.git(['cat-file','-t',w.frozen])==='commit'; }catch{ return false; } })(),'the frozen application pin is not a commit in this repository');

  // The committed receipt must be for THIS application, and must be real.
  fail(e.sourceSha===w.frozen,`the publication evidence names ${e.sourceSha}, not the frozen application ${w.frozen}`);
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
  if(e.imageAcceptance){
    fail(e.imageAcceptance.digest===e.immutableRegistryDigest,
      'the recorded image acceptance is for a different digest than the publication evidence');
    fail(e.imageAcceptance.conclusion==='success','the recorded image acceptance did not succeed');
  }

  // The worker was built from the freeze, so the published source and the
  // application are the same commit and no rebuild can be outstanding.
  const {createWorkerInputPlan}=await import('./rcap-hosted-acceptance-worker-input-plan.mjs');
  let plan=null;
  try{
    plan=createWorkerInputPlan({rootDir:w.rootDir,candidateSha:w.frozen,
      acceptedSourceSha:e.sourceSha,acceptedDigest:e.immutableRegistryDigest});
  }catch(error){ fail(false,`the published source to frozen application plan could not be computed: ${error.message}`); }
  if(plan) fail(plan.rebuildRequired===false,`the published worker source does not match the frozen application on canonical inputs: ${plan.changedPaths.join(', ')}`);

  // A later commit may carry the receipt; it does not become the candidate.
  fail((()=>{ try{ w.git(['merge-base','--is-ancestor',w.frozen,w.head]); return true; }catch{ return false; } })(),
    'the frozen application is not an ancestor of HEAD');
  let headPlan=null;
  try{
    headPlan=createWorkerInputPlan({rootDir:w.rootDir,candidateSha:w.head,
      acceptedSourceSha:w.frozen,acceptedDigest:e.immutableRegistryDigest});
  }catch(error){ fail(false,`the frozen application to HEAD plan could not be computed: ${error.message}`); }
  if(headPlan) fail(headPlan.changedPaths.length===0,`canonical worker inputs moved after the freeze: ${headPlan.changedPaths.join(', ')}`);
  return out;
}

test('the frozen application pin is the source the accepted worker was published from',async()=>{
  const base=frozenReleaseWorld();
  assert.deepEqual(await frozenReleaseProblems(base),[]);

  // Negative controls. Each must be refused; a check that cannot fail is not a check.
  const clone=()=>({...base,evidence:JSON.parse(JSON.stringify(base.evidence))});
  const refusals=[
    ['publication evidence for another source',w=>{ w.evidence.sourceSha='0'.repeat(40); }],
    ['another digest',w=>{ w.evidence.immutableRegistryDigest='sha256:'+'0'.repeat(64); }],
    ['a malformed digest',w=>{ w.evidence.immutableRegistryDigest='latest'; }],
    ['a failed publication',w=>{ w.evidence.workflowConclusion='failure'; }],
    ['no exact publication run',w=>{ w.evidence.workflowRunId=null; }],
    ['a tag that is not the source SHA',w=>{ w.evidence.imageTag='latest'; }],
    ['a mutable latest tag',w=>{ w.evidence.mutableLatestTagCreated=true; }],
    ['another application SHA',w=>{ w.frozen='0'.repeat(40); }]
  ];
  for(const [label,mutate] of refusals){
    const w=clone(); mutate(w);
    assert.ok((await frozenReleaseProblems(w)).length>0,`${label}: must be refused`);
  }
});
test('the frozen application pin is the application this tree releases, not an older one',async()=>{
  // The checks above are satisfied by any commit that carries a matching
  // receipt, so an older pin passes them while refusing the real candidate --
  // which is how 884ad51d0 survived past the freeze. These two say the pin is
  // THIS release: it is on the authoritative history leading to HEAD, and no
  // application byte moved between it and HEAD. Only release tooling may.
  const root=new URL('..',import.meta.url);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git(['merge-base','--is-ancestor',FROZEN_APPLICATION_SHA,'HEAD']);
  // The canonical closure, read from the plan rather than hand-listed, so a
  // newly canonical input is covered here the day it is added.
  const {createWorkerInputPlan}=await import('./rcap-hosted-acceptance-worker-input-plan.mjs');
  const head=git(['rev-parse','HEAD']);
  const plan=createWorkerInputPlan({rootDir:new URL('.',root).pathname.replace(/\/$/,''),candidateSha:head,
    acceptedSourceSha:FROZEN_APPLICATION_SHA,acceptedDigest:'sha256:'+'0'.repeat(64)});
  assert.deepEqual(plan.changedPaths,[],
    `application inputs moved after the frozen pin: ${plan.changedPaths.join(', ')}`);
  const moved=git(['diff','--name-only','--no-renames',FROZEN_APPLICATION_SHA,head,'--','src','public','supabase'])
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
test('reuse, metadata inputs, snapshots and post-probes preserved; alias gated after identity',()=>{
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
  for(const [a,b] of [['async function findReusableDeployment()','// Resolve the acceptance'],['const runtimeEnv =','const deploymentMeta ='],['// --- 0. Before-picture','// --- 0b.'],['// --- 2b.','// --- verdict']]) {
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
