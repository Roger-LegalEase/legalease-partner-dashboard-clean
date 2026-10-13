#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import {createClinicFixture} from './fixture.mjs';
import {packetJourney} from './packet-journey.mjs';
import {securityJourney} from './security-journey.mjs';
import {artifactActorCases,artifactAfterDeviceReset} from './artifact-journey.mjs';
import {applicationBinding,assertApplicationBindingsEqual} from './source-bindings.mjs';

const output=path.resolve(process.env.CLINIC_QA_OUTPUT ?? 'private/clinic-qa');
const root=process.cwd();
const applicationRoot=path.resolve(process.env.CLINIC_QA_APPLICATION_ROOT??root);
if(output.startsWith(root+path.sep))execFileSync('git',['check-ignore',output],{stdio:'pipe'});
fs.mkdirSync(output,{recursive:true,mode:0o700});
const evidence=path.join(output,`acceptance-${Date.now()}-${randomUUID()}.json`);
const report={schemaVersion:1,sourceSha:execFileSync('git',['rev-parse','HEAD'],{cwd:applicationRoot,encoding:'utf8'}).trim(),runnerSourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks:[],bindings:{},cleanup:{status:'NOT_RUN'},closure:'NOT_ACCEPTED'};
for(const file of ['src/app/api/expungement-ai/packet/generate/route.ts','supabase/migrations/20260925134704_canonical_consumer_presentation_matter.sql','scripts/clinic-qa/fixture.mjs','scripts/clinic-qa/artifact-journey.mjs','scripts/clinic-qa/source-bindings.mjs','scripts/clinic-qa/sponsored-cleanup.mjs','scripts/clinic-qa/acceptance.mjs','scripts/clinic-qa/packet-journey.mjs','scripts/clinic-qa/security-journey.mjs','src/lib/expungement-ai/frontend/reviewed-question-spanish.json','scripts/clinic-qa/ga22-original-manifestations.json','src/lib/clinic-mode/participant-service.ts','src/app/api/clinic/events/[eventId]/queue/route.ts','supabase/migrations/20261013130000_clinic_participant_consent_scope.sql','src/components/clinic-mode/ClinicAssistanceClient.tsx','src/lib/expungement-ai/frontend/reviewed-assisted-contact-copy.json'])report.bindings[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Bind the actual working application as well as HEAD: retained unrelated drafts
// must never be mistaken for the committed candidate's tested bytes.
const initialApplication=applicationBinding(applicationRoot);
assertApplicationBindingsEqual(applicationBinding(root),initialApplication);
report.applicationTreeSha256=initialApplication.sha256;
report.applicationSourceFileCount=initialApplication.files.length;
for(const file of execFileSync('git',['diff','--name-only','HEAD','--','src'],{encoding:'utf8'}).trim().split('\n').filter(Boolean))report.bindings[file]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function check(id,condition){report.checks.push({id,status:condition?'PASS':'FAIL'});console.log(condition?'PASS':'FAIL',id);return condition;}
const fixture=await createClinicFixture();report.environment=fixture.identity;
let browser;
try{
  report.simulatedAllocation=await fixture.simulatedAllocation();
  browser=await chromium.launch();
  const staff=await fixture.user('staff','partner_staff');
  const unassigned=await fixture.user('unassigned','partner_staff');
  const otherStaff=await fixture.user('other-staff','partner_staff');
  const outsiderActor=await fixture.user('other-program','partner_staff',process.env.CLINIC_QA_OTHER_PROGRAM);
  const queueOnly=await fixture.user('queue-only','partner_staff');
  const participants=[await fixture.user('participant-en'),await fixture.user('participant-es')];
  const event=await fixture.event(staff);
  const otherStaffId=await fixture.assign(event,otherStaff,['assist','queue']);
  await fixture.assign(event,queueOnly,['queue']);
  const contextOptions={baseURL:fixture.origin,viewport:{width:1280,height:900}};
  async function login(actor,locale='en',next='/partner/clinic'){
    const context=await browser.newContext(contextOptions);
    await context.addInitScript(value=>localStorage.setItem('exp_lang',value),locale);
    const page=await context.newPage();page.setDefaultTimeout(45000);
    page.on('framenavigated',frame=>{if(frame===page.mainFrame()){report.navigation??=[];report.navigation.push({actor:actor.label,path:new URL(frame.url()).pathname.replace(/clinic-qa-[a-z0-9-]+/g,'[event]')});}});
    page.on('pageerror',error=>{report.browserErrors??=[];report.browserErrors.push({name:error.name,messageSha256:createHash('sha256').update(error.message).digest('hex')});});
    await page.goto(`/sign-in?mode=signin&next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>[...document.querySelectorAll('form')].some(form=>Object.keys(form).some(key=>key.startsWith('__reactProps')&&typeof form[key]?.onSubmit==='function')));
    await page.locator('input[name=email]').fill(actor.email);
    await page.locator('input[name=password]').fill(actor.password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL(url=>!url.pathname.includes('sign-in'));
    return {context,page};
  }
  async function userDatabase(actor){
    const db=createClient(fixture.supabaseUrl,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await db.auth.signInWithPassword({email:actor.email,password:actor.password});
    assert(!result.error && result.data.user.id===actor.id,'Ordinary user authentication');
    return db;
  }
  const helper=await login(staff);
  const otherHelper=await login(otherStaff,'es');check('staff-ordinary-browser-login',true);
  const staffDb=await userDatabase(staff);
  const identity=await staffDb.from('partner_users').select('partner_slug,role,status').eq('auth_user_id',staff.id).single();
  check('authenticated-staff-program-role',!identity.error&&identity.data.partner_slug===fixture.program&&identity.data.role==='partner_staff'&&identity.data.status==='active');
  const queueOnlyDb=await userDatabase(queueOnly);
  const queueOnlyBrowser=await login(queueOnly);
  const otherStaffDb=await userDatabase(otherStaff);
  const outsider=await login(outsiderActor);
  const outsiderDb=await userDatabase(outsiderActor);
  const unauthorized=await login(unassigned);
  const absent=await unauthorized.context.request.get(`/api/clinic/events/${event.id}/queue`);
  check('unassigned-staff-api-denied',[403,404].includes(absent.status()));
  const owned=[];
  for(const [index,actor] of participants.entries()){
    const locale=index?'es':'en';
    const chosenStaffId=index?otherStaffId:event.staffId;
    const participant=await login(actor,locale,`/clinic/${event.eventSlug}`);
    const {page,context}=participant;
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(()=>{const form=document.querySelector('input[name=eventCode]')?.form;return form&&Object.keys(form).some(key=>key.startsWith('__reactProps')&&typeof form[key]?.onSubmit==='function');});
    await page.locator('input[name=eventCode]').fill(event.code);
    await page.locator('form button').click();
    await page.waitForURL('**/assist');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(()=>[...document.querySelectorAll('form')].some(form=>Object.keys(form).some(key=>key.startsWith('__reactProps')&&typeof form[key]?.onSubmit==='function')));
    check(`${locale}-explicit-consent-unchecked`,!(await page.locator('input[name=consent]').isChecked()));
    const denied=await context.request.post('/api/clinic/assistance/start',{headers:{Origin:fixture.origin},data:{eventSlug:event.eventSlug,eventStaffId:event.staffId,jurisdiction:fixture.jurisdiction,consent:false,requestId:randomUUID()}});
    check(`${locale}-missing-consent-denied`,denied.status()===400);
    await page.locator('select[name=eventStaffId]').selectOption(chosenStaffId);
    await page.locator('input[name=consent]').check();
    const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/clinic/assistance/start')&&response.request().method()==='POST');
    await page.locator('form button').click();
    const response=await responsePromise;
    report.lastStage=locale+'-consent-response-body';
    report.consentResponse={status:response.status()};
    assert(response.ok(),`Assistance start failed (${response.status()})`);
    const expectedScreeningPath=`/clinic/${event.eventSlug}/screening/${fixture.jurisdiction.toLowerCase()}`;
    report.lastStage=locale+'-consent-to-screening-navigation';
    await page.waitForURL(`**/screening/${fixture.jurisdiction.toLowerCase()}`).catch(error=>{report.handoff={httpStatus:response.status(),expectedPath:expectedScreeningPath.replace(event.eventSlug,'[event]'),actualPath:new URL(page.url()).pathname.replace(event.eventSlug,'[event]')};throw error;});
    check(`${locale}-participant-consent-real-screening`,true);
    const session=fixture.checked(await fixture.admin.from('clinic_assisted_sessions').select('id,event_id,screening_session_id,participant_user_id,status,consent_version').eq('event_id',event.id).eq('participant_user_id',actor.id).single());
    const row=fixture.checked(await fixture.admin.from('clinic_cases').select('id').eq('assisted_session_id',session.id).single());
    fixture.known.add(session.screening_session_id);
    owned.push({...participant,actor,session,caseId:row.id,locale,selectedDb:index?otherStaffDb:staffDb,selectedHelper:index?otherHelper:helper});
    check(`${locale}-participant-owned-enrollment`,session.participant_user_id===actor.id&&session.status==='active'&&session.consent_version==='clinic-assistance-v1');
    const authorizedDb=index?otherStaffDb:staffDb;
    const before=await authorizedDb.from('clinic_cases').select('id').eq('id',row.id);
    check(`${locale}-staff-real-rls-authorized`,!before.error&&before.data.length===1);
    const queue=await helper.context.request.get(`/api/clinic/events/${event.id}/queue`);
    const queueBody=await queue.json();
    check(`${locale}-${index?'other-assigned-staff-queue-denied':'staff-real-queue-authorized'}`,queue.ok()&&queueBody.cases.some(c=>c.id===row.id)===!index);
    const unrelated=await (index?staffDb:otherStaffDb).from('clinic_cases').select('id').eq('id',row.id);
    check(`${locale}-other-assigned-staff-rls-denied`,!unrelated.error&&unrelated.data.length===0);
    const noAssist=await queueOnlyDb.from('clinic_cases').select('id').eq('id',row.id);
    check(`${locale}-queue-without-assist-rls-denied`,!noAssist.error&&noAssist.data.length===0);
    check(`${locale}-private-queue-no-store`,/no-store/.test(queue.headers()['cache-control']??''));
    report.lastStage=locale+'-packet-journey';
    const packet=await packetJourney({fixture,participant,session,locale,check,report,helperContext:(index?otherHelper:helper).context});
    Object.assign(owned.at(-1),packet);
    const fresh=await login(actor,locale,`/briefcase/${packet.matterId}/packet-information?edit=participant_full_legal_name`);
    await fresh.page.locator('[data-packet-question=participant_full_legal_name] input').first().waitFor();
    check(`${locale}-fresh-login-recovers-saved-correction`,await fresh.page.locator('[data-packet-question=participant_full_legal_name] input').first().inputValue()==='Synthetic Clinic Corrected');
    await fresh.context.close();
  }
  await artifactActorCases({owned,outsider,unauthorized,queueOnlyContext:queueOnlyBrowser.context,browser,fixture,check});
  await securityJourney({fixture,event,owned,staff,otherStaff,outsider,outsiderDb,check});
  const firstDb=await userDatabase(participants[0]);
  const cross=await firstDb.from('clinic_cases').select('id').eq('id',owned[1].caseId);
  check('cross-participant-rls-denied',!cross.error&&cross.data.length===0);
  for(const item of owned){
    const {page,locale}=item;
    await page.getByRole('button',{name:/End clinic session|Finalizar sesión de la clínica/}).click();
    await page.waitForURL(url=>url.pathname===`/clinic/${event.eventSlug}`||url.pathname==='/clinic');
    check(`${locale}-participant-normal-reset-revokes-consent`,!(await item.context.cookies()).some(cookie=>cookie.name==='clinic_session'));
    const revoked=await item.selectedDb.from('clinic_cases').select('id').eq('id',item.caseId);
    check(`${locale}-revoked-consent-rls-denied`,!revoked.error&&revoked.data.length===0);
    const queue=await item.selectedHelper.context.request.get(`/api/clinic/events/${event.id}/queue`);
    check(`${locale}-revoked-consent-api-denied`,queue.ok()&&!(await queue.json()).cases.some(c=>c.id===item.caseId));
    await artifactAfterDeviceReset({item,fixture,check,login});
  }
}catch(error){
  // Deliberately avoid dumping request bodies, tokens, email addresses or HTML.
  report.failure={name:error.name,stage:'acceptance',code:'ACCEPTANCE_DID_NOT_COMPLETE'};
  let diagnostic=String(error.message).split('\n')[0];
  for(const actor of fixture.actors)for(const secret of [actor.password,actor.email])diagnostic=diagnostic.replaceAll(secret,'[redacted]');
  diagnostic=diagnostic.replace(/([?&]grant=)[^&\s]+/g,'$1[redacted]');
  report.failure.diagnostic=diagnostic.slice(0,200);
  console.error('Clinic QA acceptance failed:',error.name,report.failure.diagnostic);
}finally{
  try{await browser?.close();}
  catch(error){report.browserClose={status:'FAIL',errorName:error.name};}
  try{report.cleanup=await fixture.cleanup();console.log('PASS exact baseline cleanup');}
  catch(error){report.cleanup={status:'FAIL',errorName:error.name,errorSha256:createHash('sha256').update(String(error.message)).digest('hex')};console.error('Clinic QA cleanup needs attention');}
  report.sourceBindingsUnchanged=Object.entries(report.bindings).every(([file,digest])=>createHash('sha256').update(fs.readFileSync(file)).digest('hex')===digest);
  check('source-bindings-stable-through-acceptance',report.sourceBindingsUnchanged&&applicationBinding(applicationRoot).sha256===report.applicationTreeSha256&&applicationBinding(root).sha256===report.applicationTreeSha256);
  check('browser-runtime-errors-absent',!report.browserErrors?.length&&!report.browserClose);
  report.status=report.failure||report.checks.some(check=>check.status==='FAIL')||report.cleanup.status!=='PASS'?'FAIL':'PARTIAL';
  report.remaining=['independent-current-source-acceptance','authenticated-CI-environment-binding'];
  if(report.artifactAcceptance?.length!==2||report.artifactAcceptance.some(item=>item.status!=='PASS'))report.remaining.unshift('owner-positive-private-artifact-denial');
  fs.writeFileSync(evidence,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Evidence:',evidence);
}
process.exitCode=report.status==='FAIL'?1:2;
