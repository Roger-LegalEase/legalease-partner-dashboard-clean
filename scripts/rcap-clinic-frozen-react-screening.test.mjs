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
const runtime=frozenScreeningRuntime({repo:dependencyRoot});
const proof={application:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',hostedJourneyCompleted:false,actualDatabaseProof:false,
 boundaries:runtime.boundaries,cases:[]};

async function withFixture(options,run) {
 const site=await startFrozenReactScreeningSite({runtime,...options});
 const launch={headless:true};if(process.env.RCAP_BROWSER_CHROMIUM)launch.executablePath=process.env.RCAP_BROWSER_CHROMIUM;
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
  await page.getByRole('heading',{name:'Are you asking about your own record?',exact:true}).waitFor();
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
 console.log(JSON.stringify({...proof,sourcePins:runtime.sourcePins()}));
});
