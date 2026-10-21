#!/usr/bin/env node
// RUN-RCAP-UNASSISTED: one unassisted participant on the existing synthetic sponsored program, loopback only, through
// the real controls: program entry -> screening with an operated EN/ES switch -> sign-in claim -> saved facts ->
// interrupted saves (request lost; response lost, then the builder's own recovery) -> correction -> review ->
// verification -> what the matter offers and what generation does -> denials -> the fixture's exact cleanup.
// No simulated success: sponsored packets are a Clinic-event channel pinned to the hosted preview decision, so here
// B-D5 asserts that nothing is offered and nothing is produced (no job, funding, credit, counter or object).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {createClinicFixture} from './fixture.mjs';
import {answerScreening} from './packet-journey.mjs';
import {MS_NONCONVICTION_SCREENING_ANSWERS,MS_NONCONVICTION_PACKET_ANSWERS} from '../lib/rcap-ms-nonconviction-fixture.mjs';

const output=path.resolve(process.env.CLINIC_QA_OUTPUT ?? 'private/clinic-qa');
const root=process.cwd();
if(output.startsWith(root+path.sep))execFileSync('git',['check-ignore',output],{stdio:'pipe'});
fs.mkdirSync(output,{recursive:true,mode:0o700});
const evidence=path.join(output,`unassisted-${Date.now()}-${randomUUID()}.json`);
const report={schemaVersion:1,run:'RUN-RCAP-UNASSISTED',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:[],cleanup:{status:'NOT_RUN'}};
function check(id,condition,detail){report.checks.push({id,status:condition?'PASS':'FAIL',...(detail===undefined?{}:{detail})});console.log(condition?'PASS':'FAIL',id);return condition;}
const NOT_CONFIRMED=/^(We could not confirm that your changes were saved\.|No pudimos confirmar que se guardaron sus cambios\.)/;
const CHANGED_ELSEWHERE=/^(This matter changed in another session\.|Este caso cambió en otra sesión\.)/;
const SAVE=/^(Save|Guardar)$/;
// Unassisted: the participant owns the screening (the fixture's "Yes"), unlike the Clinic helper wire.
const answers={...MS_NONCONVICTION_SCREENING_ANSWERS,...MS_NONCONVICTION_PACKET_ANSWERS,
  ms_program_order:'no_program_order',state_exclusion_categories:'None of these',criminal_history:'No',record_documents:'Yes',pardon_status:'No'};
const fixture=await createClinicFixture();report.environment=fixture.identity;
assert.equal(fixture.jurisdiction,'MS','The unassisted run uses the MS non-conviction fixture');
const lit=value=>"'"+String(value).replaceAll("'","''")+"'";
// Whole-table totals: the run holds the stack lease, so any new row or object anywhere is this run's.
const effects=()=>JSON.parse(fixture.sql(`select json_build_object('jobs',(select count(*) from packet_render_jobs),
  'funding',(select count(*) from clinic_packet_funding),'credits',(select count(*) from packet_credit_ledger),
  'provenance',(select count(*) from consumer_packet_artifact_provenance),'objects',(select count(*) from storage.objects),
  'screeningsUsed',(select screenings_used from partner_entitlement where partner_slug=${lit(fixture.program)}));`));
let browser;
try{
  report.simulatedAllocation=await fixture.simulatedAllocation();
  const participant=await fixture.user('participant-unassisted');
  const other=await fixture.user('participant-other');
  const staff=await fixture.user('staff','partner_staff');
  browser=await chromium.launch();
  const contextOptions={baseURL:fixture.origin,viewport:{width:1280,height:900}};
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(()=>{if(!localStorage.getItem('exp_lang'))localStorage.setItem('exp_lang','en');});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  page.on('pageerror',error=>{report.browserErrors??=[];report.browserErrors.push({name:error.name,messageSha256:createHash('sha256').update(error.message).digest('hex')});});
  const locale=()=>page.evaluate(()=>localStorage.getItem('exp_lang'));
  const switchTo=async target=>{
    await page.getByRole('button',{name:target==='es'?'Usar español':/^(Use English|Usar inglés)$/}).filter({visible:true}).first().click();
    await page.waitForFunction(value=>localStorage.getItem('exp_lang')===value,target);
  };

  // B1 entry: the program's public page when published (synthetic programs are not), otherwise its intake link.
  const landing=await page.goto(`/p/${fixture.program}`,{waitUntil:'networkidle'});
  report.entry={publicLandingHttp:landing?.status()??null};
  if(landing?.ok())await page.getByRole('link',{name:'Start free screening',exact:true}).first().click();
  else await page.goto(`/intake/${fixture.program}`,{waitUntil:'networkidle'});
  const jurisdiction=page.getByRole('combobox',{name:'Screening jurisdiction'});
  if(await jurisdiction.count()){await jurisdiction.selectOption('MS');await page.getByRole('button',{name:'Continue',exact:true}).click();}
  await page.getByRole('button',{name:'Start free screening',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/expungement-ai/screening/ms');
  const sessionId=new URL(page.url()).searchParams.get('session');assert.match(sessionId??'',/^[0-9a-f-]{36}$/);fixture.known.add(sessionId);
  const session=fixture.checked(await fixture.admin.from('screening_sessions').select('partner_slug,jurisdiction,partner_benefit_active').eq('session_id',sessionId).single());
  check('B1-anonymous-program-entry',session.partner_slug===fixture.program&&session.jurisdiction==='MS'&&session.partner_benefit_active===true
    &&!(await context.cookies()).some(cookie=>cookie.name.startsWith('sb-')),{publicLandingHttp:report.entry.publicLandingHttp});

  // Operated switch: EN -> ES between two screening questions; the same question and session stay on screen.
  const switched={};
  const {saveResult,questionIds}=await answerScreening({page,answers,beforeStep:async step=>{
    if(step!==1)return;
    const shown=()=>page.locator('input[type=radio],input[type=checkbox]').first().getAttribute('name');
    const before=await shown();await switchTo('es');
    switched.kept=await shown()===before&&new URL(page.url()).searchParams.get('session')===sessionId;
  }});
  check('B1-real-screening-controls',questionIds.length>=7&&questionIds.includes('ownership_scope'),{questionIds});
  check('EN-ES-switch-mid-screening-keeps-progress',switched.kept===true&&await locale()==='es');

  // Claim through the real sign-in handoff, still in Spanish.
  await saveResult.click();await page.waitForURL(url=>url.pathname==='/expungement-ai/sign-in');
  await page.getByRole('button',{name:/^(Already have an account\? Sign in|¿Ya tiene una cuenta\? Inicie sesión)$/}).click();
  await page.locator('input[name=email]').fill(participant.email);await page.locator('input[name=password]').fill(participant.password);
  const claim=page.waitForResponse(response=>response.url().endsWith('/screening/pending/claim')&&response.request().method()==='POST');
  await page.locator('button[type=submit]').click();
  assert.equal((await claim).status(),200,'Participant claims the actual browser result');
  await page.waitForURL(url=>/^\/briefcase\/(?:matters\/)?[a-f0-9-]{36}$/.test(url.pathname));
  const matterId=new URL(page.url()).pathname.split('/').at(-1);fixture.known.add(matterId);
  const owned=fixture.checked(await fixture.admin.from('consumer_briefcase_items').select('id,user_id').eq('source_session_id',sessionId));
  check('B1-claim-one-owned-matter',owned.length===1&&owned[0].id===matterId&&owned[0].user_id===participant.id);

  // B2 saved facts through the protected API.
  const api=`/api/expungement-ai/briefcase/${matterId}/packet-information`;
  const read=async()=>{const r=await context.request.get(api);assert.equal(r.status(),200);return r.json();};
  let model=await read();
  const saved=await context.request.post(api,{data:{expectedRevision:model.revision,answers:MS_NONCONVICTION_PACKET_ANSWERS}});
  assert.equal(saved.status(),200,'Real protected answer save');model=await saved.json();
  check('B2-protected-save-not-implicit-verification',model.readyToGenerate===false);

  // Resume in the browser, still Spanish, on the saved value.
  const field=page.locator('[data-packet-question=participant_full_legal_name] input').first();
  await page.goto(`/briefcase/${matterId}/packet-information?edit=participant_full_legal_name`,{waitUntil:'networkidle'});await field.waitFor();
  check('EN-ES-resume-in-spanish-keeps-saved-value',await locale()==='es'&&await field.inputValue()===MS_NONCONVICTION_PACKET_ANSWERS.participant_full_legal_name);

  // B-R1: interrupt exactly one save POST; page loads and the builder's own reads pass through.
  const isApi=url=>new URL(url).pathname===api;
  async function interruptOneSave(handler,value){
    let used=false;
    await page.route(isApi,async route=>{if(used||route.request().method()!=='POST')return route.continue();used=true;await handler(route);});
    await field.fill(value);await page.getByRole('button',{name:SAVE}).click();
    await page.getByRole('alert').filter({hasText:NOT_CONFIRMED}).waitFor();
    await page.unroute(isApi);
  }
  // Mode 1, request lost before the server: the draft stays on the page and the server is unchanged.
  await interruptOneSave(route=>route.abort('failed'),'Synthetic Interrupted Request');
  const afterLost=await read();
  check('B-R1-request-lost-keeps-draft-server-unchanged',await field.inputValue()==='Synthetic Interrupted Request'
    &&afterLost.revision===model.revision&&afterLost.answers.participant_full_legal_name===model.answers.participant_full_legal_name);
  // Mode 2, response lost after the server committed: no loss, no second apply, then the builder's recovery.
  let committed;
  await interruptOneSave(async route=>{committed=await route.fetch();await route.abort('failed');},'Synthetic Interrupted Response');
  const afterCommit=await read();
  const retry=page.waitForResponse(response=>isApi(response.url())&&response.request().method()==='POST');
  await page.getByRole('button',{name:SAVE}).click();const retried=await retry;
  await page.getByRole('alert').filter({hasText:CHANGED_ELSEWHERE}).waitFor();
  const afterRetry=await read();
  await page.getByRole('button',{name:/^(Compare with saved answers|Comparar con las respuestas guardadas)$/}).click();
  await page.getByRole('region',{name:/^(Compare answers|Comparar respuestas)$/}).waitFor();
  await page.getByRole('button',{name:/^(Discard my draft and use saved answers|Descartar mi borrador y usar las respuestas guardadas)$/}).click();
  check('B-R1-response-lost-no-loss-no-double-apply',committed?.status()===200&&afterCommit.revision===model.revision+1
    &&afterCommit.answers.participant_full_legal_name==='Synthetic Interrupted Response'&&retried.status()===409
    &&afterRetry.revision===afterCommit.revision&&await field.inputValue()==='Synthetic Interrupted Response'&&!await page.getByRole('alert').count(),
    {committedHttp:committed?.status()??null,retryHttp:retried.status()});

  // B3 correction in Spanish on the recovered page (its revision must be the recovered one), reload, back to English.
  const corrected='Synthetic Unassisted Corrected';
  await field.fill(corrected);
  const saveResponse=page.waitForResponse(response=>isApi(response.url())&&response.request().method()==='POST');
  await page.getByRole('button',{name:SAVE}).click();
  check('B-R1-recovered-revision-saves',(await saveResponse).status()===200);
  await page.reload({waitUntil:'networkidle'});await field.waitFor();
  const next=await read();
  check('B3-explicit-correction-save-reload',next.answers.participant_full_legal_name===corrected&&next.revision===afterCommit.revision+1&&await field.inputValue()===corrected);
  await switchTo('en');await field.waitFor();
  check('EN-ES-switch-back-keeps-correction',await locale()==='en'&&await field.inputValue()===corrected);
  const stale=await context.request.post(api,{data:{expectedRevision:model.revision,answers:{participant_full_legal_name:'Stale correction'}}});
  check('B3-stale-revision-denied',stale.status()===409);

  // B4 review; B5 verification through the review page's own control; B-D5 offer = fulfilment.
  await page.goto(next.reviewPath,{waitUntil:'networkidle'});
  check('B4-actual-review-shows-corrected-answer',(await page.locator('main').innerText()).includes(corrected));
  const panel=page.locator('[data-packet-verification-state]');
  const before=effects();
  const verifyButton=panel.getByRole('button');
  const verifyLabel=await verifyButton.innerText();
  const verification=page.waitForResponse(response=>isApi(response.url())&&response.request().method()==='POST');
  await verifyButton.click();
  const verifiedResponse=await verification;const verifiedBody=await verifiedResponse.json();
  await page.locator('[data-packet-verification-state=verified]').waitFor();await page.waitForLoadState('networkidle');
  report.verification={http:verifiedResponse.status(),readyToGenerate:verifiedBody.readyToGenerate??null,missingInputIds:verifiedBody.missingInputIds??null,verifyLabel};
  check('B5-final-verification',verifiedResponse.status()===200&&verifiedBody.readyToGenerate===true&&verifiedBody.missingInputIds?.length===0);
  const offer={verifyLabel,unavailableNotice:await panel.getByRole('status').count(),
    actionButtons:await panel.getByRole('button').count(),actionLinks:await panel.getByRole('link').count()};
  const generation=await context.request.post('/api/expungement-ai/packet/generate',{data:{briefcaseItemId:matterId}});
  const generated=await generation.json().catch(()=>null);
  const after=effects();
  report.delivery={offer,generationHttp:generation.status(),resultCode:generated?.resultCode??null,
    cacheControl:generation.headers()['cache-control']??null,before,after,status:'NOT_APPLICABLE_NO_PACKET_OFFERED'};
  check('B-D5-nothing-offered',/^(I verified these packet facts|He verificado estos datos del paquete)$/.test(verifyLabel)
    &&offer.unavailableNotice===1&&offer.actionButtons===0&&offer.actionLinks===0,offer);
  check('B-D5-refusal-typed-fulfillment-not-proven',generation.status()===403&&generated?.resultCode==='fulfillment_not_proven'&&report.delivery.cacheControl==='private, no-store');
  check('B-D5-no-job-funding-credit-counter-or-object',JSON.stringify(after)===JSON.stringify(before),{before,after});
  report.routeProbe='NOT_APPLICABLE: no PDF is produced for this run';

  // Denials: another participant, program staff, and a signed-out request.
  async function login(actor){
    const ctx=await browser.newContext(contextOptions);const p=await ctx.newPage();p.setDefaultTimeout(45000);
    await p.goto('/sign-in?mode=signin&next=%2Fbriefcase',{waitUntil:'networkidle'});
    await p.waitForFunction(()=>[...document.querySelectorAll('form')].some(form=>Object.keys(form).some(key=>key.startsWith('__reactProps')&&typeof form[key]?.onSubmit==='function')));
    await p.locator('input[name=email]').fill(actor.email);await p.locator('input[name=password]').fill(actor.password);
    await p.locator('button[type=submit]').click();await p.waitForURL(url=>!url.pathname.includes('sign-in'));return ctx;
  }
  for(const [id,actor] of [['other-participant',other],['program-staff',staff]]){
    const ctx=await login(actor);const denied=await ctx.request.get(api);
    check(`B-denial-${id}`,denied.status()===404,{http:denied.status()});await ctx.close();
  }
  const anonymous=await browser.newContext(contextOptions);const signedOut=await anonymous.request.get(api,{maxRedirects:0});
  check('B-denial-signed-out',signedOut.status()===401,{http:signedOut.status()});await anonymous.close();
}catch(error){
  report.failure={name:error.name,code:'UNASSISTED_RUN_DID_NOT_COMPLETE'};
  let diagnostic=String(error.message).split('\n')[0];
  for(const actor of fixture.actors)for(const secret of [actor.password,actor.email])diagnostic=diagnostic.replaceAll(secret,'[redacted]');
  report.failure.diagnostic=diagnostic.slice(0,200);
  console.error('Unassisted run failed:',error.name,report.failure.diagnostic);
}finally{
  try{await browser?.close();}catch(error){report.browserClose={status:'FAIL',errorName:error.name};}
  try{report.cleanup=await fixture.cleanup();console.log('PASS exact baseline cleanup');}
  catch(error){report.cleanup={status:'FAIL',errorName:error.name,errorSha256:createHash('sha256').update(String(error.message)).digest('hex')};console.error('Unassisted cleanup needs attention');}
  check('browser-runtime-errors-absent',!report.browserErrors?.length&&!report.browserClose);
  // PARTIAL at best: the sponsored rows this program cannot reach on loopback stay NOT_RUN exclusions.
  report.status=report.failure||report.checks.some(row=>row.status==='FAIL')||report.cleanup.status!=='PASS'?'FAIL':'PARTIAL';
  report.notRun=['B6-B7-unassisted-sponsored-delivery: not offered by design','R4-delayed-generation: rides RUN-DTC','D3-delivered-pages: no PDF'];
  fs.writeFileSync(evidence,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Evidence:',evidence);
}
process.exitCode=report.status==='FAIL'?1:2;
