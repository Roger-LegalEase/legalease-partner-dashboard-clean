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
const caller=await import(pathToFileURL(path.join(runnerRoot,'scripts/rcap-clinic-screening-profile.mjs')).href);
const [chainGuard,chainSetup,chainAttempt]=await Promise.all(['rcap-clinic-setup-request-guard.mjs','rcap-clinic-setup-only-boundary.mjs','rcap-clinic-fresh-attempt.mjs'].map(name=>import(pathToFileURL(path.join(runnerRoot,'scripts',name)).href)));
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
  const profileResponse=page.waitForResponse(response=>transport.matchesOriginalResponse(response,'profile',config));
  const completion=page.waitForResponse(response=>transport.matchesOriginalResponse(response,'completion',config),{timeout:60000}).then(response=>({response}),()=>null);
  await page.goto(site.origin+'/clinic/local-screening-fixture/screening/ms');
  const profile=transport.requireOriginalResponse(await profileResponse,'profile').profile;
  assert.ok(profile,'Original public profile metadata must be captured before answering');
  if(waitForInitialQuestion)await page.getByRole('heading',{name:'Are you asking about your own record?',exact:true}).waitFor();
  await run({site,page,completion,config,profile});
  assert.deepEqual(errors,[],'Real React component emitted page errors');
  await context.close();
 }finally{await browser.close();await site.close();}
}
const choice=id=>{const value=helper.MISSISSIPPI_SCREENING_CHOICES.find(item=>item.id===id);assert.ok(value,`Actual choice missing: ${id}`);return value;};
async function reachOptional(page) {
 for(const id of ['ownership_scope','jurisdiction_scope','case_outcome','offense_level'])await helper.answerMississippiChoice(page,choice(id));
 const optional=page.locator('[data-optional-pathway-help]');await optional.waitFor({state:'visible'});return optional;
}
async function assertUppercaseProgramOrder(page) {
 const prompt=page.locator('#q-ms_program_order-prompt');await prompt.waitFor({state:'visible'});
 const badge=prompt.locator(':scope > span');
 assert.equal(await badge.textContent(),'Optional');
 assert.equal(await badge.evaluate(node=>getComputedStyle(node).textTransform),'uppercase');
 assert.match(await prompt.innerText(),/OPTIONAL$/);
 const rendered=await prompt.innerText();
 assert.throws(()=>assert.match(rendered,/Optional$/),'Legacy rendered-text assertion must fail under shipped badge CSS');
}
async function confirmResult({site,page,completion},observed) {
 assert.ok(site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')),'Normal optional continuation must not invent a program-order answer');
 assert.ok(observed.omittedQuestionIds.includes('ms_program_order'),'Actual engine program-order screen must be traversed without an answer');
 assert.equal(site.state.evaluations.length,1,'Original real evaluator called once');
 assert.ok(['packet_ready','packet_ready_with_caution'].includes(site.state.evaluations[0].resultCode),'Do not manufacture a positive outcome for a UI plan case');
 assert.deepEqual(runtime.authorityReadFailures,[],'Original evaluate must not silently substitute missing source files');
 const result=await completion;assert.ok(result,'Completion response not observed');transport.requireOriginalResponse(result.response,'completion');
 await helper.mississippiResultHeading(page).waitFor({state:'visible'});
 await page.locator('[data-partner-context="saved"]').filter({hasText:/^Your partner program information is saved\. Packet coverage is confirmed before preparation\.$/}).waitFor({state:'visible'});
 await helper.saveScreeningResultButton(page).waitFor({state:'visible'});
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

test('original evaluate POST preserves actual availability, source-owned route identity and refusal statuses',{timeout:120000},async()=>{
 const site=await startFrozenReactScreeningSite({runtime,publicMode:true});
 const input={jurisdiction:'MS',profileVersion:runtime.publicProfile.profileVersion,matterId:'matter-frozen-evaluation-fixture',answers:runtime.screeningAnswers};
 const call=body=>fetch(site.origin+'/api/expungement-ai/evaluate',{method:'POST',headers:{'content-type':'application/json'},body:typeof body==='string'?body:JSON.stringify(body)});
 try {
  const accepted=await call(input);assert.equal(accepted.status,200);const value=await accepted.json();
  assert.equal(value.jurisdiction,'MS');assert.equal(value.profileVersion,input.profileVersion);assert.equal(value.matterId,input.matterId);
  assert.ok(['packet_ready','packet_ready_with_caution'].includes(value.resultCode));
  assert.equal(typeof value.consumerPacketAvailable,'boolean');assert.equal(typeof value.sponsoredPacketAvailable,'boolean');
  assert.ok(runtime.authorityReads.includes('data/rcap-grade-a/fulfillment-authority-registry.json'),'Availability must read the actual pinned registry, not an empty fallback');
  assert.deepEqual(runtime.authorityReadFailures,[],'All actual static reads must resolve to frozen pinned blobs');
  for(const [body,status,error] of [['{',400,'invalid_json'],[{},400,'invalid_request'],[{...input,jurisdiction:'ZZ'},404,'unsupported_jurisdiction'],[{...input,profileVersion:'invalid-fixture-version'},409,'profile_version_mismatch'],[{...input,selectedTrackId:'invented'},400,'route_identity_is_server_owned']]) {
   const refused=await call(body);assert.equal(refused.status,status);assert.equal((await refused.json()).error,error);
  }
  assert.equal(site.state.pendingCalls,0);assert.equal(site.state.claimCalls,0);assert.equal(site.state.savedMatter,null);
  assert.ok(site.state.requests.every(request=>request.path==='/api/expungement-ai/evaluate'));
  assert.deepEqual(runtime.sideEffects,{databaseCalls:0,cookieCalls:0});
  proof.cases.push({id:'actual_evaluate_wrapper',actualHandlers:true,availabilityFromPinnedRegistry:true,refusalStatuses:[400,400,404,409,400],businessWrites:0});
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
   const screening=helper.runMississippiScreening(page,{profile:fixture.profile}).then(value=>({value}),error=>({error})).finally(()=>{settled=true;});
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
  await assert.rejects(helper.runMississippiScreening(fixture.page,{profile:fixture.profile}),/Screening application alert/);
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
  await helper.answerMississippiChoice(fixture.page,choice('possible_pathway_context'));await assertUppercaseProgramOrder(fixture.page);
  const observed=await helper.runMississippiScreening(fixture.page,{profile:fixture.profile});await confirmResult(fixture,observed);await saveAndClaim(fixture);
  assert.deepEqual(observed.answeredQuestionIds,['court_requirements_completed','resolved_timing_bucket']);
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
  await helper.answerMississippiChoice(fixture.page,choice('possible_pathway_context'));await assertUppercaseProgramOrder(fixture.page);
  const observed=await helper.runMississippiScreening(fixture.page,{profile:fixture.profile});await confirmResult(fixture,observed);await saveAndClaim(fixture);
  proof.cases.push({id:'preexpanded_filtered',...observed,plans:fixture.site.state.plans.map(plan=>plan.questionIds)});
 });
});

for(const mutation of ['required','context_only','missing_metadata','wrong_question','missing_badge','misplaced_badge','checked_answer'])test(`program-order omission refuses ${mutation} before Continue without inventing facts`,{timeout:120000},async()=>{
 await withFixture({},async fixture=>{
  const {page,site}=fixture;await reachOptional(page);await helper.answerMississippiChoice(page,choice('possible_pathway_context'));
  await assertUppercaseProgramOrder(page);
  const profile=structuredClone(fixture.profile),question=profile.questions.find(q=>q.id==='ms_program_order');
  assert.ok(question);assert.equal(question.required,false);assert.equal(question.contextOnly,false);
  if(mutation==='required')question.required=true;
  if(mutation==='context_only')question.contextOnly=true;
  if(mutation==='wrong_question')question.id='unreviewed_question';
  if(mutation==='missing_badge')await page.locator('#q-ms_program_order-prompt > span').evaluate(node=>node.remove());
  if(mutation==='misplaced_badge')await page.locator('#q-ms_program_order-prompt > span').evaluate(node=>document.body.appendChild(node));
  if(mutation==='checked_answer')await page.locator('[role="radiogroup"][aria-labelledby="q-ms_program_order-prompt"]').getByRole('radio').first().check();
  const progressCalls=site.state.progressCalls;
  await assert.rejects(helper.answerMississippiChoice(page,choice('ms_program_order'),{profile:mutation==='missing_metadata'?undefined:profile}));
  assert.equal(site.state.progressCalls,progressCalls,'Refused omission must not press Continue');assertNoDownstream(site);
  proof.cases.push({id:'optional_refusal_'+mutation,downstreamEffects:0});
 });
});

for(const planMode of ['omit_optional','early_result','reverse_timing'])test(`frozen actual React conditional plan ${planMode} uses real projected controls and evaluator, without waiting for omitted questions`,{timeout:120000},async()=>{
 await withFixture({planMode},async fixture=>{
  const observed=await helper.runMississippiScreening(fixture.page,{profile:fixture.profile});await confirmResult(fixture,observed);
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
  const observed=await helper.runMississippiScreening(fixture.page,{profile:fixture.profile});await confirmResult(fixture,observed);
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
 assert.equal(installed('next/dist/server/app-render/get-asset-query-string.js').getAssetQueryString({sharedContext:{clientAssetToken:'fixture-immutable-token'}},true),'?dpl=fixture-immutable-token');
 for(const outcome of ['success','refusal','transport_failure','ui_refusal','asset_refusal','final_contract_failure']) {
  const refused=outcome==='refusal';
  const site=await startFrozenReactScreeningSite({runtime,progressFault:refused?'invalid_version_after_initial':outcome==='ui_refusal'?'invalid_version_react_initial':null,queryAssets:true,assetFault:outcome==='asset_refusal',publicMode:true,evaluationFault:outcome==='final_contract_failure'?'non_packet_result':null});
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
      assert.ok(['/api/expungement-ai/profiles/MS','/api/expungement-ai/screening/progress','/api/expungement-ai/evaluate','/expungement-ai/screening/ms','/_next/static/chunks/clinic-fixture.js','/_next/static/chunks/clinic-fixture.css','/_next/static/media/fixture.ttf','/expungement-ai/favicon.ico','/expungement-ai/icon-192.png','/_next/image'].includes(url.pathname));
      requests++;
      if(outcome==='transport_failure'&&requests===3)throw Error('local upstream transport failure');
      return target.fetch({...options,url:site.origin+url.pathname+url.search});
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
   }else if(outcome==='asset_refusal') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,403);assert.equal(result.condition,'React resource HTTP refusal');
    assert.equal(result.observed,'framework_stylesheet: React resource HTTP refusal');
    assert.ok(result.resourceResponses.some(r=>r.category==='framework_stylesheet'&&r.httpStatus===403));
    assert.ok(!JSON.stringify(result).includes('fixture private response'));
   }else if(outcome==='ui_refusal') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,409);assert.equal(result.observed,'application_refusal');
    assert.equal(result.reactInitialization.responseObservations.at(-1).errorCode,'profile_version_mismatch');assert.ok(requests>=17&&requests<=20);
    assert.ok(result.reactInitialization.alertDetails.some(a=>a.source==='application'));
   }else if(outcome==='transport_failure') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.httpStatus,null);assert.equal(result.observed,'transport_failure');
    assert.equal(result.responseObservations.at(-1).httpStatus,null);assert.equal(requests,3);assert.equal(site.state.progressCalls,1);
   }else if(outcome==='final_contract_failure') {
    assert.equal(result.status,'BLOCKED');assert.equal(result.reactInitialization.status,'BLOCKED');
    assert.equal(result.reactInitialization.evaluation.resultCode,'guidance_only');
    assert.deepEqual(result.reactInitialization.screening.omittedQuestionIds,['ms_program_order']);
    assert.deepEqual(result.reactInitialization.screening.evaluationStatuses,[200]);
    assert.equal(site.state.progressCalls,18);assert.equal(site.state.evaluations.length,1);
   }else {diagnostic.assertClinicProgressEvidence(result);assert.ok(requests>=24&&requests<=29);
    assert.equal(result.reactInitialization.evaluation.httpStatus,200);assert.equal(result.reactInitialization.stoppedBeforeSave,true);
    assert.deepEqual(result.reactInitialization.screening.omittedQuestionIds,['ms_program_order']);
    assert.equal(site.state.progressCalls,18);assert.equal(site.state.evaluations.length,1);
    for(const category of ['framework_script','framework_stylesheet','framework_font','image_optimizer'])assert.ok(result.resourceResponses.some(r=>r.category===category&&r.allowed&&r.httpStatus===200));
    assert.ok(result.resourceResponses.filter(r=>r.category.startsWith('framework_')).every(r=>JSON.stringify(r.queryNames)==='["dpl"]'));
    assert.ok(!JSON.stringify(result).includes('fixture-immutable-token'));
    assert.equal(result.reactInitialization.firstQuestionId,'ownership_scope');assert.ok(result.reactInitialization.alertDetails.some(a=>a.source==='next_route_announcer'));}
   if(['success','final_contract_failure'].includes(outcome)) {
    assert.equal(site.state.pendingCalls,0);assert.equal(site.state.claimCalls,0);assert.equal(site.state.savedMatter,null);
    assert.ok(site.state.requests.every(request=>['/api/expungement-ai/screening/progress','/api/expungement-ai/evaluate'].includes(request.path)),'Public diagnostic must never complete, save or claim');
    assert.ok(site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')));
   }else assertNoDownstream(site);
   assert.deepEqual(runtime.sideEffects,{databaseCalls:0,cookieCalls:0});
   assert(!JSON.stringify(result).includes('local-fixture-only'));
   proof.cases.push({id:'full_collector_'+outcome,transportAttempts:requests,httpRequests:outcome==='transport_failure'?requests-1:requests,actualHandlers:true,livePreview:false,downstreamEffects:0});
  }finally{await site.close();}
 }
});


test('production runner awaits the captured profile in both opening branches and keeps operation waits phase-scoped',()=>{
 const source=installed('node:fs').readFileSync(path.join(runnerRoot,'scripts/verify-rcap-commercial-browser.mjs'),'utf8');
 const check=value=>{
  assert.equal([...value.matchAll(/screeningProfileCapture\s*=\s*await\s+openScreeningWithProfile\(/g)].length,2,'Both actual entry branches must arm before opening');
  assert.match(value,/openScreeningWithProfile\(page,\s*responseConfig,\s*\(\)\s*=>\s*page\.getByRole\("button", \{ name: "Start screening with assistance", exact: true \}\)\.click\(\)/);
  assert.match(value,/openScreeningWithProfile\(page,\s*responseConfig,\s*\(\)\s*=>\s*startButton\.click\(\)/);
  assert.match(value,/await\s+runScreeningFromOriginalProfile\(page,\s*screeningProfileCapture,/);
  assert.ok(!value.includes("profile:result.responseObservations.findLast"),'The failed observations snapshot must not return');
  assert.match(value,/result\.screeningCompletion=\{\.\.\.\(await screeningCompletion\.read\(\)\)\}/);
  assert.match(value,/await saveScreeningAndClaim\(page,responseConfig\)/);
 };
 check(source);
 const reverted=source.replace('await runScreeningFromOriginalProfile(page,screeningProfileCapture,','await runMississippiScreening(page,');
 assert.notEqual(reverted,source);assert.throws(()=>check(reverted),'Reverting only the production caller must fail while helper tests stay unchanged');
});

// Execute the runner's exact completion-report block, including its immutable-receipt boundary.
const callerSource=installed('node:fs').readFileSync(path.join(runnerRoot,'scripts/verify-rcap-commercial-browser.mjs'),'utf8');
const callerTs=installed('typescript'),callerAst=callerTs.createSourceFile('runner.mjs',callerSource,callerTs.ScriptTarget.Latest,true,callerTs.ScriptKind.JS);
const callerJourney=callerAst.statements.find(node=>callerTs.isFunctionDeclaration(node)&&node.name?.text==='runJourney');
const completionReportBranch=callerJourney.body.statements.find(node=>callerTs.isIfStatement(node)&&node.expression.getText(callerAst)==='clinicSetupOnly'&&node.getText(callerAst).includes('screeningCompletion.read()'));
assert.ok(completionReportBranch,'Actual production completion-report branch missing');
async function recordProductionCompletion(captured) {
 let original,guardCalls=0;const result={};
 const scope={clinicSetupOnly:true,result,assert,participantGuard:{assertNoCritical:()=>{guardCalls++;}},screeningCompletion:{read:async()=>{
  original=await captured.read();assert.equal(Object.isFrozen(original),true,'Native observer receipt must remain immutable');return original;
 }}};
 await new Function(...Object.keys(scope),`"use strict";return (async()=>{${completionReportBranch.getText(callerAst)}})()`)(...Object.values(scope));
 assert.equal(guardCalls,1);assert.notEqual(result.screeningCompletion,original);
 assert.equal(result.screeningCompletion.persistenceVerified,false);
 assert.equal(Object.hasOwn(original,'persistenceVerified'),false);assert.equal(Object.isFrozen(original),true);
 return result.screeningCompletion;
}

// The production runner calls these same opening/profile/screening/save functions.
async function withCallerFixture(options,run) {
 const site=await startFrozenReactScreeningSite({runtime,...options});
 const browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
 try {
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(8000);
  const config={origin:site.origin,authOrigin:site.origin,clinicSlug:'local-screening-fixture'},observations=[],stages=[];
  await context.route('**/*',transport.createOriginalResponseObserver(config,{onObservation:value=>observations.push(value),onStage:value=>stages.push(value)}));
  await context.route('**/*',route=>new URL(route.request().url()).origin===site.origin?route.fallback():route.abort());
  await page.goto(site.origin+'/caller-entry');
  const open=(options)=>caller.openScreeningWithProfile(page,config,()=>page.getByRole('link',{name:'Start screening',exact:true}).click(),options);
  const screen=(captured,diagnostics={})=>caller.runScreeningFromOriginalProfile(page,captured,{observations,stages,...diagnostics});
  await run({site,page,config,observations,stages,open,screen});
 }finally{await site.close();await browser.close();}
}
function assertCallerNoSave(site) {
 assert.equal(site.state.pendingCalls,0);assert.equal(site.state.claimCalls,0);assert.equal(site.state.savedMatter,null);
}
for(const mode of ['immediate','delayed_headers','delayed_body'])test(`actual runner caller awaits its original ${mode} profile through all questions without a second GET`,{timeout:120000},async()=>{
 const timing=mode==='delayed_headers'?{headersMs:500}:mode==='delayed_body'?{bodyMs:500}:{};
 await withCallerFixture({responseTiming:{profile:timing}},async({site,page,config,observations,open,screen})=>{
  const complete=caller.captureOriginalResponseOnce(page,'completion',config);
  try {
   const captured=await open();
   const oldSnapshot=observations.findLast(value=>value.operation==='profile'&&value.accepted)?.profile;
   if(mode!=='immediate')assert.equal(oldSnapshot,undefined,'Exercise the exact late-profile snapshot race');
   else await page.getByRole('heading',{name:'Are you asking about your own record?',exact:true}).waitFor();
   const result=await screen(captured);await recordProductionCompletion(complete);
   assert.deepEqual(result.omittedQuestionIds,['ms_program_order']);assert.equal(site.state.progressCalls,9);
   assert.equal(site.state.profileCalls,1);assert.equal(site.state.evaluations.length,1);
   assert.equal(observations.find(value=>value.operation==='profile').profile.profileVersion,runtime.publicProfile.profileVersion);
   const {claimed}=await caller.saveScreeningAndClaim(page,config);
   assert.equal(claimed.matterId,FIXTURE_MATTER_ID);
   await page.waitForURL(url=>url.origin===site.origin&&url.pathname===`/briefcase/matters/${FIXTURE_MATTER_ID}`&&!url.search&&!url.hash);
   assert.equal(new URL(page.url()).pathname,`/briefcase/matters/${FIXTURE_MATTER_ID}`);
   assert.equal(await page.evaluate(()=>window.__screeningFixture.navigation),`/briefcase/matters/${FIXTURE_MATTER_ID}`);
   assert.equal(site.state.pendingCalls,1);assert.equal(site.state.claimCalls,1);
   assert.ok(site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')));
   proof.cases.push({id:'actual_caller_profile_'+mode,profileGets:1,omittedQuestionIds:result.omittedQuestionIds,localStorageDouble:true,hostedJourneyCompleted:false});
  }finally{complete.dispose();}
 });
});
for(const fault of ['refusal','malformed','missing','required_question','stale_version'])test(`actual runner caller stops on original profile ${fault} without cached-profile substitution`,{timeout:120000},async()=>{
 await withCallerFixture({responseFaults:{profile:fault}},async({site,observations,open,screen})=>{
  const captured=await open({timeout:1000});
  // An explicit decoy only in negative cases proves the failed original is never replaced.
  await assert.rejects(screen(captured,{profile:runtime.publicProfile}),error=>{
   if(fault==='refusal')assert.match(error.message,/profile: application_refusal \(HTTP 403\)/);
   if(fault==='malformed')assert.match(error.message,/profile: malformed_response/);
   if(fault==='missing')assert.match(error.message,/profile: original response missing or timed out/);
   if(fault==='stale_version')assert.match(error.message,/Screening application alert/);
   return true;
  });
  assert.equal(site.state.profileCalls,1);assertCallerNoSave(site);assert.equal(site.state.evaluations.length,0);
  if(fault==='stale_version')assert.ok(observations.some(value=>value.operation==='progress'&&value.httpStatus===409&&value.errorCode==='profile_version_mismatch'));
  proof.cases.push({id:'actual_caller_profile_refusal_'+fault,profileGets:1,noCachedFallback:true,pendingCalls:0,claimCalls:0});
 });
});
test('actual caller profile wait does not expire during the preceding UI action',{timeout:120000},async()=>{
 await withCallerFixture({callerDelayMs:1500},async({site,page,config,observations,stages})=>{
  const captured=await caller.openScreeningWithProfile(page,config,async()=>{
   await page.request.get(site.origin+'/caller-delay');
   await page.getByRole('link',{name:'Start screening',exact:true}).click();
  },{timeout:1000});
  const result=await caller.runScreeningFromOriginalProfile(page,captured,{observations,stages});
  assert.deepEqual(result.omittedQuestionIds,['ms_program_order']);assert.equal(site.state.profileCalls,1);assertCallerNoSave(site);
  proof.cases.push({id:'actual_caller_slow_preceding_profile_phase',profileGets:1});
 });
});
test('actual caller completion wait starts after a slow questionnaire, and claim wait starts after slow pending creation',{timeout:120000},async()=>{
 await withCallerFixture({responseTiming:{progress:{headersMs:100},completion:{bodyMs:100},pending:{bodyMs:1300},claim:{bodyMs:100}}},async({site,page,config,open,screen})=>{
  const completion=caller.captureOriginalResponseOnce(page,'completion',config,{timeout:800});
  try {
   const captured=await open(),started=Date.now();await screen(captured);
   assert.ok(Date.now()-started>=800,'Actual questionnaire must exceed the former early completion timer');
   const receipt=await recordProductionCompletion(completion);assert.equal(receipt.operation,'completion');assert.equal(receipt.accepted,true);
   const {claimed}=await caller.saveScreeningAndClaim(page,config,{pendingTimeout:3000,claimTimeout:800});
   assert.equal(claimed.matterId,FIXTURE_MATTER_ID);assert.equal(site.state.pendingCalls,1);assert.equal(site.state.claimCalls,1);
   proof.cases.push({id:'actual_caller_slow_completion_pending_claim_phases',completionAccepted:true,pendingCalls:1,claimCalls:1});
  }finally{completion.dispose();}
 });
});
for(const operation of ['completion','pending','claim'])for(const fault of ['refusal','malformed','missing'])test(`actual caller preserves original ${operation} ${fault} and never retries`,{timeout:120000},async()=>{
 await withCallerFixture({responseFaults:{[operation]:fault}},async({site,page,config,open,screen})=>{
  const completion=caller.captureOriginalResponseOnce(page,'completion',config,{timeout:800});
  try {
   const captured=await open();await screen(captured);
   const action=async()=>{
    await recordProductionCompletion(completion);
    return caller.saveScreeningAndClaim(page,config,{pendingTimeout:800,claimTimeout:800});
   };
   await assert.rejects(action(),error=>{
    assert.match(error.message,new RegExp('^'+operation+':'));
    if(fault==='refusal')assert.match(error.message,/application_refusal \(HTTP 403\)/);
    if(fault==='malformed')assert.match(error.message,/malformed_response/);
    if(fault==='missing')assert.match(error.message,/missing or timed out/);
    return true;
   });
   assert.equal(site.state.requests.filter(request=>request.path==='/api/expungement-ai/screening/complete').length,1);
   assert.equal(site.state.pendingCalls,operation==='completion'?0:1);
   assert.equal(site.state.claimCalls,operation==='claim'?1:0);
   assert.equal(await page.evaluate(()=>window.__screeningFixture.navigation),null,'Failed claim must not fabricate navigation');
   proof.cases.push({id:'actual_caller_'+operation+'_'+fault,originalFailureRetained:true,noRetry:true,localStorageDouble:true});
  }finally{completion.dispose();}
 });
});


// Preserve one continuous production region; only external auth/storage and evidence sinks are ports.
const orchestrationStatements=callerJourney.body.statements;
const orchestrationStart=orchestrationStatements.find(node=>node.getText(callerAst).startsWith("result.stage='participant_screening'"));
const orchestrationStop=orchestrationStatements.find(node=>callerTs.isIfStatement(node)&&node.expression.getText(callerAst)==='clinicSetupOnly'&&node.getText(callerAst).includes("stopReason='new_owned_screening_claimed_before_packet_builder_funding_render_worker'"));
assert.ok(orchestrationStart&&orchestrationStop);
assert.ok(orchestrationStop.end<callerSource.indexOf('const builderLink'));
const productionOrchestration=callerSource.slice(orchestrationStart.getStart(callerAst),orchestrationStop.end);
const productionRequestListener=orchestrationStatements.find(node=>callerTs.isExpressionStatement(node)&&callerTs.isCallExpression(node.expression)&&node.expression.expression.getText(callerAst)==='page.on'&&node.expression.arguments[0]?.text==='request');
assert.ok(productionRequestListener);
const productionSupport=['validUuid','exactBriefcaseItemId','expectText','assertNoCommercialCopy','check'].map(name=>{
 const declaration=callerAst.statements.find(node=>callerTs.isFunctionDeclaration(node)&&node.name?.text===name);
 assert.ok(declaration,`Actual production validator missing: ${name}`);return declaration.getText(callerAst);
}).join('\n');
async function runContiguousProduction(fixture,captured,sink,{guardRefusal=false}={}) {
 const {page,site,config,observations,stages}=fixture;
 const result=sink.result={responseObservations:observations,responseStages:stages};
 sink.guardCalls=0;sink.screenshots=[];
 const guard=chainGuard.createClinicRequestGuard({actor:'participant',captchaPolicy:{},env:{},stage:()=>result.stage,events:[],requestFailures:[]});
 const realAssert=guard.assertNoCritical;
 guard.assertNoCritical=()=>{sink.guardCalls++;return realAssert();};
 page.on('pageerror',guard.pageError);
 page.on('response',response=>{
  if(transport.matchesOriginalResponse(response,'completion',config))sink.originalCompletion=transport.originalResponse(response,'completion');
 });
 const scope={clinicSetupOnly:true,page,result,responseConfig:config,screeningProfileCapture:captured,
  captureOriginalResponseOnce:caller.captureOriginalResponseOnce,runScreeningFromOriginalProfile:caller.runScreeningFromOriginalProfile,
  saveScreeningAndClaim:caller.saveScreeningAndClaim,participantGuard:guard,assert,baseUrl:site.origin,
  failures:[],browserErrors:[],generationRequests:[],stripeRequests:[],packetDownloadRequests:[],
  participantUserId:chainSetup.CLINIC_SETUP.owner,CLINIC_SETUP:chainSetup.CLINIC_SETUP,CLINIC_FRESH_ATTEMPT:chainAttempt.CLINIC_FRESH_ATTEMPT,
  path,evidenceDir:'/fixture-evidence',fs:{writeFileSync:(target,body)=>{
   assert.equal(target,'/fixture-evidence/clinic-setup-only-result.json');sink.savedReport=JSON.parse(body);
  }},
  screenshotPair:async(_page,stem)=>{
   sink.screenshots.push(stem);
   if(guardRefusal&&stem==='01-partner-covered-result') {
    const error=page.waitForEvent('pageerror');
    await page.evaluate(()=>{setTimeout(()=>{throw Error('Controlled native guard refusal');},0);});await error;
   }
  }};
 await new Function(...Object.keys(scope),`"use strict";return (async()=>{let screeningSessionId=null;${productionSupport}\n${productionRequestListener.getText(callerAst)}\n${productionOrchestration}})()`)(...Object.values(scope));
}
for(const mode of ['immediate','delayed'])test(`contiguous production completion-to-canonical orchestration ${mode} preserves frozen evidence and saves once`,{timeout:120000},async()=>{
 await withCallerFixture({matterPage:true,...(mode==='delayed'?{responseTiming:{profile:{bodyMs:300},completion:{bodyMs:100},pending:{bodyMs:300},claim:{bodyMs:100}}}:{})},async fixture=>{
  const captured=await fixture.open(),sink={};
  await runContiguousProduction(fixture,captured,sink);
  assert.equal(Object.isFrozen(sink.originalCompletion),true);assert.equal(Object.hasOwn(sink.originalCompletion,'persistenceVerified'),false);
  assert.notEqual(sink.result.screeningCompletion,sink.originalCompletion);assert.equal(sink.result.screeningCompletion.persistenceVerified,false);
  assert.equal(sink.guardCalls,3);assert.equal(sink.savedReport.stage,'setup_complete');assert.equal(sink.savedReport.passed,true);
  assert.equal(sink.savedReport.itemId,FIXTURE_MATTER_ID);assert.equal(sink.savedReport.fullHostedJourneyCompleted,false);
  assert.equal(fixture.site.state.pendingCalls,1);assert.equal(fixture.site.state.claimCalls,1);assert.equal(fixture.site.state.canonicalMatterReads,1);
  assert.equal(new URL(fixture.page.url()).pathname,`/briefcase/matters/${FIXTURE_MATTER_ID}`);
  assert.deepEqual(sink.screenshots,['01-partner-covered-result','02-partner-covered-briefcase-matter']);
  assert.ok(fixture.site.state.requests.every(request=>!request.answerIds.includes('ms_program_order')));
  proof.cases.push({id:'contiguous_production_'+mode,actualProductionSlice:true,canonicalVerified:true,pendingCalls:1,claimCalls:1,externalAuthStorageAndEvidencePorts:true,actualDatabaseProof:false,hostedJourneyCompleted:false});
 });
});
test('contiguous production actual guard refuses after completion and before Save',{timeout:120000},async()=>{
 await withCallerFixture({matterPage:true},async fixture=>{
  const captured=await fixture.open(),sink={};
  await assert.rejects(runContiguousProduction(fixture,captured,sink,{guardRefusal:true}),/Clinic context encountered a critical boundary or application failure/);
  assert.equal(sink.result.screeningCompletion.accepted,true);assert.equal(sink.result.screeningCompletion.persistenceVerified,false);
  assert.equal(Object.isFrozen(sink.originalCompletion),true);assert.equal(Object.hasOwn(sink.originalCompletion,'persistenceVerified'),false);
  assert.equal(sink.guardCalls,1);assert.equal(sink.result.stage,'participant_screening');assert.equal(sink.savedReport,undefined);
  assertCallerNoSave(fixture.site);assert.equal(fixture.site.state.canonicalMatterReads,0);
  proof.cases.push({id:'contiguous_production_guard_refusal',actualGuard:true,pendingCalls:0,claimCalls:0,hostedJourneyCompleted:false});
 });
});
test('contiguous production rejects an accepted claim landing on a noncanonical alias',{timeout:120000},async()=>{
 await withCallerFixture({matterPage:true,canonicalAlias:true},async fixture=>{
  const captured=await fixture.open(),sink={};
  await assert.rejects(runContiguousProduction(fixture,captured,sink),/Clinic must land on the canonical matter page/);
  assert.equal(fixture.site.state.pendingCalls,1);assert.equal(fixture.site.state.claimCalls,1);assert.equal(fixture.site.state.canonicalMatterReads,1);
  assert.equal(sink.savedReport,undefined);assert.notEqual(sink.result.passed,true);
  assert.equal(new URL(fixture.page.url()).pathname,`/briefcase/${FIXTURE_MATTER_ID}`);
  proof.cases.push({id:'contiguous_production_canonical_refusal',claimAccepted:true,canonicalVerified:false,externalStorageDouble:true,hostedJourneyCompleted:false});
 });
});
test('contiguous production refuses the original completion response before guard or Save',{timeout:120000},async()=>{
 await withCallerFixture({matterPage:true,responseFaults:{completion:'refusal'}},async fixture=>{
  const captured=await fixture.open(),sink={};
  await assert.rejects(runContiguousProduction(fixture,captured,sink),/completion: application_refusal \(HTTP 403\)/);
  assert.equal(sink.guardCalls,0);assert.equal(sink.savedReport,undefined);assertCallerNoSave(fixture.site);
  proof.cases.push({id:'contiguous_production_completion_refusal',httpStatus:403,pendingCalls:0,claimCalls:0,hostedJourneyCompleted:false});
 });
});
