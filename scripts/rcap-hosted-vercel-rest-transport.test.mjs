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
test('the frozen application pin names a tree that carries the accepted worker publication receipt',()=>{
  // The pin is what tells Vercel which commit to build, so it is only truthful
  // while the tree it names carries the receipt for the worker the deployment
  // will run beside. Nothing asserted that before: when the accepted worker
  // moved to a descendant of the pin, the pin and the entry workflow's
  // "worker source is an ancestor of the application" guard became jointly
  // unsatisfiable, and the contradiction surfaced only as a REST refusal in a
  // dispatched acceptance run. This is that check, made locally and cheaply.
  const root=new URL('..',import.meta.url);
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  const accepted=JSON.parse(fs.readFileSync(new URL('./data/rcap-render/worker-publication-evidence.json',root),'utf8'));
  assert.match(accepted.sourceSha,/^[0-9a-f]{40}$/);
  assert.equal(accepted.workflowConclusion,'success');
  assert.match(FROZEN_APPLICATION_SHA,/^[0-9a-f]{40}$/);
  assert.equal(git(['cat-file','-t',FROZEN_APPLICATION_SHA]),'commit');
  // The accepted worker source must already be in the pinned tree's history,
  // which is exactly what rcap-f1-ephemeral-staging.yml independently requires.
  git(['merge-base','--is-ancestor',accepted.sourceSha,FROZEN_APPLICATION_SHA]);
  const pinned=JSON.parse(git(['show',`${FROZEN_APPLICATION_SHA}:data/rcap-render/worker-publication-evidence.json`]));
  assert.equal(pinned.sourceSha,accepted.sourceSha);
  assert.equal(pinned.immutableRegistryDigest,accepted.immutableRegistryDigest);
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
