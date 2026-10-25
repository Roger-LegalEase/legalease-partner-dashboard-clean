import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {frozenScreeningRuntime,startFrozenReactScreeningSite,FIXTURE_MATTER_ID} from './rcap-clinic-frozen-react-screening-fixture.mjs';
const runnerRoot=process.env.RCAP_CLINIC_TEST_RUNNER_ROOT??process.cwd();
const dependencyRoot=process.env.RCAP_SCREENING_REPO??runnerRoot;
const installed=createRequire(path.join(dependencyRoot,'package.json'));
const {chromium}=installed('playwright');
const helper=await import(pathToFileURL(path.join(runnerRoot,'scripts/rcap-ms-screening-browser.mjs')).href);
const transport=await import(pathToFileURL(path.join(runnerRoot,'scripts/rcap-clinic-original-response.mjs')).href);
const diagnostic=await import(pathToFileURL(path.join(runnerRoot,'scripts/rcap-clinic-live-screening-progress.mjs')).href);
const runtime=frozenScreeningRuntime({repo:dependencyRoot});
const proof={application:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',hostedJourneyCompleted:false,actualDatabaseProof:false,
 boundaries:runtime.boundaries,frameworkPins:runtime.frameworkPins,cases:[]};

async function withFixture({waitForInitialQuestion=true,...options},run) {
 const site=await startFrozenReactScreeningSite({runtime,...options});
 const launch={headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'};
 const browser=await chromium.launch(launch).catch(async error=>{await site.close();throw error;});
 try {
  const context=await browser.newContext(),errors=[];
  const config={origin:site.origin,authOrigin:site.origin,clinicSlug:'local-screening-fixture'};
  await context.route('**/*',transport.createOriginalResponseObserver(config));
  // Confine the actual React fixture to its loopback origin, including unanticipated assets.
  await context.route('**/*',route=>new URL(route.request().url()).origin===site.origin?route.fallback():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  const completion=page.waitForResponse(response=>transport.matchesOriginalResponse(response,'completion',config),{timeout:60000}).then(response=>({response}),()=>null);
  await page.goto(site.origin+'/clinic/local-screening-fixture/screening/ms');
  if(waitForInitialQuestion)await page.getByRole('heading',{name:'Are you asking about your own record?',exact:true}).waitFor();
  await run({site,page,completion,config});
  assert.deepEqual(errors,[],'Real React component emitted page errors');
  await context.close();
 }finally{await browser.close();await site.close();}
}
const choice=id=>{const value=helper.MISSISSIPPI_SCREENING_CHOICES.find(item=>item.id===id);assert.ok(value,`Actual choice missing: ${id}`);return value;};
async function reachOptional(page) {
 for(const id of ['ownership_scope','jurisdiction_scope','case_outcome','offense_level'])await helper.answerMississippiChoice(page,choice(id));
 const optional=page.locator('[data-optional-pathway-help]');await optional.waitFor({state:'visible'});return optional;
}
async function confirmResult({site,page,completion},observed) {
 assert.ok(site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')),'Normal optional continuation must not invent a program-order answer');
 assert.ok(observed.omittedQuestionIds.includes('ms_program_order'),'Actual engine program-order screen must be traversed without an answer');
 assert.equal(site.state.evaluations.length,1,'Original real evaluator called once');
 assert.ok(['packet_ready','packet_ready_with_caution'].includes(site.state.evaluations[0].resultCode),'Do not manufacture a positive outcome for a UI plan case');
 const result=await completion;assert.ok(result,'Completion response not observed');transport.requireOriginalResponse(result.response,'completion');
 await helper.mississippiResultHeading(page).waitFor({state:'visible'});
 for(const id of observed.answeredQuestionIds)assert.ok(runtime.publicProfile.questions.some(question=>question.id===id),`Helper reported a non-profile question ID: ${id}`);
}
async function saveAndClaim({site,page,config}) {
 const pending=page.waitForResponse(response=>transport.matchesOriginalResponse(response,'pending',config));
 const claim=page.waitForResponse(response=>transport.matchesOriginalResponse(response,'claim',config));
 const action=helper.saveScreeningResultButton(page);
 await action.click();transport.requireOriginalResponse(await pending,'pending');
 const claimed=transport.requireOriginalResponse(await claim,'claim');assert.equal(claimed.matterId,FIXTURE_MATTER_ID);
 await page.waitForURL(url=>url.pathname===`/briefcase/matters/${FIXTURE_MATTER_ID}`);
 assert.equal(await page.evaluate(()=>window.__screeningFixture.navigation),`/briefcase/matters/${FIXTURE_MATTER_ID}`);
 assert.ok(site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')),'Pending/claim must preserve the absent optional answer');
 assert.equal(site.state.pendingCalls,1);assert.equal(site.state.claimCalls,1);
 assert.ok(site.state.savedMatter?.fixtureOnly,'Storage is explicitly a double, never a DB acceptance receipt');
}

function assertNoDownstream(site) {
 assert.equal(site.state.evaluations.length,0);assert.equal(site.state.pendingCalls,0);assert.equal(site.state.claimCalls,0);assert.equal(site.state.savedMatter,null);
 assert.ok(!site.state.requests.some(request=>['/api/expungement-ai/evaluate','/api/expungement-ai/screening/complete','/api/expungement-ai/screening/pending','/api/expungement-ai/screening/pending/claim'].includes(request.path)));
 assert.deepEqual(runtime.sideEffects,{databaseCalls:0,cookieCalls:0});
}

test('frozen actual profile GET and progress POST preserve their refusals without downstream effects',{timeout:120000},async()=>{
 const site=await startFrozenReactScreeningSite({runtime});
 try {
  const profile=await fetch(site.origin+'/api/expungement-ai/profiles/MS');assert.equal(profile.status,200);assert.match(profile.headers.get('cache-control'),/no-store/);
  const publicProfile=await profile.json();assert.equal(publicProfile.jurisdiction.code,'MS');assert.deepEqual(publicProfile,runtime.publicProfile);
  const missing=await fetch(site.origin+'/api/expungement-ai/profiles/ZZ');assert.equal(missing.status,404);assert.equal((await missing.json()).error,'unsupported_jurisdiction');
  for(const [body,status,error] of [
   ['{',400,'invalid_request'],
   [JSON.stringify({jurisdiction:'MS',profileVersion:publicProfile.profileVersion,answers:[]}),400,'invalid_request'],
   [JSON.stringify({jurisdiction:'ZZ',profileVersion:publicProfile.profileVersion,answers:{}}),404,'unsupported_jurisdiction'],
   [JSON.stringify({jurisdiction:'MS',profileVersion:'fixture-invalid-version',answers:{}}),409,'profile_version_mismatch']
  ]) {
   const response=await fetch(site.origin+'/api/expungement-ai/screening/progress',{method:'POST',headers:{'content-type':'application/json'},body});
   assert.equal(response.status,status);assert.equal((await response.json()).error,error);
  }
  assertNoDownstream(site);proof.cases.push({id:'actual_profile_progress_refusals',statuses:[400,400,404,409],actualHandlers:true,downstreamEffects:0});
 }finally{await site.close();}
});

test('frozen actual progress POST handles empty answers and every existing synthetic prefix deterministically',{timeout:120000},async()=>{
 const site=await startFrozenReactScreeningSite({runtime});
 try {
  const answers={},plans=[];
  const readPlan=async()=>{
   const response=await fetch(site.origin+'/api/expungement-ai/screening/progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jurisdiction:'MS',profileVersion:runtime.publicProfile.profileVersion,answers})});
   assert.equal(response.status,200);const body=await response.json();assert.equal(body.jurisdiction,'MS');assert.equal(body.profileVersion,runtime.publicProfile.profileVersion);
   assert.ok(Array.isArray(body.questionIds)&&body.questionIds.every(id=>typeof id==='string'));assert.equal(body.ok,undefined);assert.equal(body.success,undefined);return body;
  };
  plans.push(await readPlan());assert.deepEqual(await readPlan(),plans.at(-1));
  for(const [id,value] of Object.entries(runtime.screeningAnswers)) {
   assert.notEqual(id,'ms_program_order');answers[id]=value;
   plans.push(await readPlan());assert.deepEqual(await readPlan(),plans.at(-1));
  }
  assert.deepEqual(answers,runtime.screeningAnswers);
  const profileResponse=await fetch(site.origin+'/api/expungement-ai/profiles/MS');assert.equal(profileResponse.status,200);
  const diagnostics=await diagnostic.verifyScreeningProgressPrefixes(await profileResponse.json(),async payload=>{
   const response=await fetch(site.origin+'/api/expungement-ai/screening/progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   return {status:response.status,body:await response.json()};
  });
  assert.ok(diagnostics.length>1&&diagnostics.every(item=>item.httpStatus===200&&item.outcome==='accepted'));
  assert.ok(diagnostics.every(item=>!item.answerIds.includes('ms_program_order')),'Read-only checker must also preserve the omitted program-order fact');
  assertNoDownstream(site);
  proof.cases.push({id:'actual_empty_and_all_synthetic_prefixes',actualHandlers:true,prefixes:plans.length,diagnosticHelperPrefixes:diagnostics.length,plans:plans.map(plan=>plan.questionIds),downstreamEffects:0});
 }finally{await site.close();}
});

test('installed Next announcer reproduces the legacy loading alert failure while the screening helper awaits the real question',{timeout:120000},async()=>{
 let releaseInitialProgress;
 const initialProgressGate=new Promise(resolve=>{releaseInitialProgress=resolve;});
 try {
  await withFixture({initialProgressGate,waitForInitialQuestion:false},async fixture=>{
   const {page,site}=fixture;
   const announcer=page.locator('next-route-announcer').locator('#__next-route-announcer__');
   await announcer.waitFor({state:'visible'});
   assert.equal(await announcer.getAttribute('role'),'alert');
   assert.equal(await announcer.getAttribute('aria-live'),'assertive');
   assert.equal(await announcer.evaluate(node=>node.getRootNode().host.localName),'next-route-announcer');
   assert.equal(await page.getByRole('heading',{name:'Are you asking about your own record?',exact:true}).isVisible(),false);
   const legacyAlertVisible=await page.getByRole('alert').first().isVisible();
   assert.throws(()=>assert.equal(legacyAlertVisible,false,'Screening reported an error; no retry or invented answer'),/Screening reported an error/);
   let settled=false;
   const screening=helper.runMississippiScreening(page).then(value=>({value}),error=>({error})).finally(()=>{settled=true;});
   try {
    await site.initialProgressRequested;
    assert.deepEqual((await helper.screeningAlertDetails(page)).map(alert=>alert.source),['next_route_announcer']);
    assert.equal(settled,false,'Helper must wait during the held initial progress response');
    releaseInitialProgress();
    const result=await screening;if(result.error)throw result.error;
    await confirmResult(fixture,result.value);
    assert.deepEqual(result.value.answeredQuestionIds,['ownership_scope','jurisdiction_scope','case_outcome','offense_level','possible_pathway_context','court_requirements_completed','resolved_timing_bucket']);
    assert.deepEqual(result.value.omittedQuestionIds,['ms_program_order']);
    assert.equal(site.state.pendingCalls,0);assert.equal(site.state.claimCalls,0);
    proof.cases.push({id:'actual_next_announcer_loading_gate',legacyBroadAlertRejected:true,heldInitialProgress:true,actualNextVersion:runtime.frameworkPins.nextVersion,...result.value});
   }finally{releaseInitialProgress();await screening;}
  });
 }finally{releaseInitialProgress();}
});

test('actual React refuses the real progress handler version error before evaluation or saving',{timeout:120000},async()=>{
 await withFixture({progressFault:'invalid_version_after_initial'},async fixture=>{
  await assert.rejects(helper.runMississippiScreening(fixture.page),/Screening application alert/);
  assert.ok((await helper.screeningAlertDetails(fixture.page)).some(alert=>alert.source==='application'));
  await fixture.page.getByRole('alert').filter({hasText:'We could not load the next question.'}).waitFor({state:'visible'});
  assert.equal(fixture.site.state.progressCalls,2,'Initial plan plus one failed Continue; no retry');
  assert.deepEqual(fixture.site.state.progressResponses.at(-1),{httpStatus:409,error:'profile_version_mismatch'});
  assert.equal(await fixture.page.evaluate(()=>window.__screeningFixture.navigation),null);assertNoDownstream(fixture.site);
  proof.cases.push({id:'real_progress_refusal_stops_react',actualHandler:true,httpStatus:409,downstreamEffects:0});
 });
});

test('frozen actual React collapsed optional help connects the shared helper to result and one normal save/claim navigation',{timeout:120000},async()=>{
 await withFixture({},async fixture=>{
  const optional=await reachOptional(fixture.page);
  assert.equal(await optional.getByRole('button',{name:'Show optional help',exact:true}).getAttribute('aria-expanded'),'false');
  assert.equal(await optional.getByRole('radio',{name:choice('possible_pathway_context').option,exact:true}).isVisible(),false);
  const observed=await helper.runMississippiScreening(fixture.page);await confirmResult(fixture,observed);await saveAndClaim(fixture);
  assert.deepEqual(observed.answeredQuestionIds,['possible_pathway_context','court_requirements_completed','resolved_timing_bucket']);
  assert.deepEqual(observed.omittedQuestionIds,['ms_program_order']);
  assert.deepEqual(fixture.site.state.plans.at(-1).questionIds,['ownership_scope','jurisdiction_scope','case_outcome','offense_level','possible_pathway_context','ms_program_order','court_requirements_completed','resolved_timing_bucket']);
  proof.cases.push({id:'collapsed',...observed,plans:fixture.site.state.plans.map(plan=>plan.questionIds),pendingCalls:1,claimCalls:1});
 });
});

test('frozen actual React pre-expanded and filtered optional help stays open and clears only the search before choosing',{timeout:120000},async()=>{
 await withFixture({},async fixture=>{
  const optional=await reachOptional(fixture.page);
  await optional.getByRole('button',{name:'Show optional help',exact:true}).click();
  await optional.getByRole('searchbox',{name:'Find an option',exact:true}).fill('drug');
  assert.ok(!fixture.site.state.plans.at(-1).answerIds.includes('possible_pathway_context'),'Opening/searching must not write an optional answer');
  assert.equal(await optional.getByRole('button',{name:'Hide optional help',exact:true}).getAttribute('aria-expanded'),'true');
  assert.equal(await optional.getByRole('radio',{name:choice('possible_pathway_context').option,exact:true}).isVisible(),false);
  const observed=await helper.runMississippiScreening(fixture.page);await confirmResult(fixture,observed);
  proof.cases.push({id:'preexpanded_filtered',...observed,plans:fixture.site.state.plans.map(plan=>plan.questionIds)});
 });
});

for(const planMode of ['omit_optional','early_result','reverse_timing'])test(`frozen actual React conditional plan ${planMode} uses real projected controls and evaluator, without waiting for omitted questions`,{timeout:120000},async()=>{
 await withFixture({planMode},async fixture=>{
  const observed=await helper.runMississippiScreening(fixture.page);await confirmResult(fixture,observed);
  if(planMode==='omit_optional')assert.ok(!observed.answeredQuestionIds.includes('possible_pathway_context'));
  if(planMode==='early_result')assert.ok(!observed.answeredQuestionIds.includes('court_requirements_completed'));
  if(planMode==='reverse_timing') {
   const projected=runtime.publicProfile.questions.map(question=>question.id);
   assert.ok(projected.includes('resolved_timing_bucket')&&projected.includes('court_requirements_completed'),'Both derived questions must be actual profile controls');
   const planned=fixture.site.state.plans.flatMap(plan=>plan.questionIds);
   for(const id of ['resolved_timing_bucket','court_requirements_completed'])if(planned.includes(id))assert.ok(observed.answeredQuestionIds.includes(id));
  }
  proof.cases.push({id:planMode,...observed,plans:fixture.site.state.plans.map(plan=>plan.questionIds),responsePlanMutation:true});
 });
});

test('frozen actual React save/claim refusal preserves the result and never fabricates a Briefcase destination',{timeout:120000},async()=>{
 await withFixture({claimRefused:true},async fixture=>{
  const observed=await helper.runMississippiScreening(fixture.page);await confirmResult(fixture,observed);
  const claim=fixture.page.waitForResponse(response=>transport.matchesOriginalResponse(response,'claim',fixture.config));
  await helper.saveScreeningResultButton(fixture.page).click();
  const response=await claim;assert.equal(response.status(),409);assert.throws(()=>transport.requireOriginalResponse(response,'claim'));
  await fixture.page.getByText('We could not save this matter right now. Please try again.',{exact:true}).waitFor();
  assert.equal(await fixture.page.evaluate(()=>window.__screeningFixture.navigation),null);
  assert.equal(fixture.site.state.pendingCalls,1);assert.equal(fixture.site.state.claimCalls,1);assert.equal(fixture.site.state.savedMatter,null);
  proof.cases.push({id:'claim_refused_no_navigation',pendingCalls:1,claimCalls:1,actualDatabaseProof:false});
 });
});

test.after(()=>{
 console.log(JSON.stringify({...proof,readOnlyHandlerSideEffects:runtime.sideEffects,sourcePins:runtime.sourcePins()}));
});

test('complete read-only browser collector traverses its real guard and observer against original HTTP handlers, and retains later refusal',{timeout:120000},async()=>{
 for(const outcome of ['success','refusal','transport_failure','ui_refusal']) {
  const refused=outcome==='refusal';
  const site=await startFrozenReactScreeningSite({runtime,progressFault:refused?'invalid_version_after_initial':outcome==='ui_refusal'?'invalid_version_react_initial':null});
  let requests=0;
  const browserType={launch:async options=>{
   const native=await chromium.launch(options);
   return {close:()=>native.close(),newContext:async settings=>{
    const context=await native.newContext(settings),register=context.route.bind(context);
    // Only the network destination is a loopback port; request identity, routing, browser and original handlers remain real.
    context.route=(pattern,handler)=>register(pattern,route=>handler(new Proxy(route,{get(target,key){
     if(key==='fetch')return options=>{
      const url=new URL(target.request().url());
      assert.equal(url.origin,'https://legalease-rcap-4feb8e94b3de-roger947s-projects.vercel.app');
      assert.ok(['/api/expungement-ai/profiles/MS','/api/expungement-ai/screening/progress','/expungement-ai/screening/ms','/_next/static/clinic-fixture.js'].includes(url.pathname));
      requests++;
      if(outcome==='transport_failure'&&requests===3)throw Error('local upstream transport failure');
      return target.fetch({...options,url:site.origin+url.pathname});
     };
     const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }})));
    return context;
   }};
  }};
  try {
   const result=await diagnostic.readClinicLiveScreeningProgress({env:{VERCEL_AUTOMATION_BYPASS_SECRET:'local-fixture-only',RCAP_BROWSER_CHROMIUM:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'},browserType});
   if(refused) {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,409);assert.equal(result.observed,'application_refusal');
    assert.equal(result.responseObservations.at(-1).errorCode,'profile_version_mismatch');assert.equal(requests,3);
   }else if(outcome==='ui_refusal') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,409);assert.equal(result.observed,'application_refusal');
    assert.equal(result.reactInitialization.responseObservations.at(-1).errorCode,'profile_version_mismatch');assert.equal(requests,14);
    assert.ok(result.reactInitialization.alertDetails.some(a=>a.source==='application'));
   }else if(outcome==='transport_failure') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,null);assert.equal(result.observed,'transport_failure');
    assert.equal(result.responseObservations.at(-1).httpStatus,null);assert.equal(requests,3);assert.equal(site.state.progressCalls,1);
   }else {diagnostic.assertClinicProgressEvidence(result);assert.equal(requests,14);assert.equal(result.reactInitialization.firstQuestionId,'ownership_scope');assert.ok(result.reactInitialization.alertDetails.some(a=>a.source==='next_route_announcer'));}
   assertNoDownstream(site);assert.deepEqual(runtime.sideEffects,{databaseCalls:0,cookieCalls:0});
   assert(!JSON.stringify(result).includes('local-fixture-only'));
   proof.cases.push({id:'full_collector_'+outcome,transportAttempts:requests,httpRequests:outcome==='transport_failure'?requests-1:requests,actualHandlers:true,livePreview:false,downstreamEffects:0});
  }finally{await site.close();}
 }
});
