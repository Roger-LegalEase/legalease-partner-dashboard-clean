// Existing isolated GoTrue + PostgREST + PostgreSQL + actual Next application.
// This script refuses hosted targets and never uses practice credentials remotely.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
const origin=process.env.RCAP_ACCEPTANCE_BASE_URL??'http://127.0.0.1:3100';
for(const url of [origin,process.env.NEXT_PUBLIC_SUPABASE_URL])assert.equal(new URL(url).hostname,'127.0.0.1');
assert.notEqual(process.env.VERCEL_ENV,'production');
const access=JSON.parse(fs.readFileSync(process.env.RCAP_TEST_ACCESS_FILE??'/workspaces/training-modules-09-10/output/rcap-practice-access.json','utf8'));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const slug=process.env.RCAP_TEST_PARTNER_SLUG??'practice-create-webkit-mv1a358g';
const out='artifacts/rcap-operating-authority';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(60000);
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
async function mutation(button,suffix){if(suffix==='/configuration')console.log('Save form',await page.locator('#configure-program form').evaluate(f=>({valid:f.checkValidity(),invalid:Array.from(f.elements).filter(e=>e.validity&&!e.validity.valid).map(e=>e.getAttribute('aria-label')??e.name),spanish:f.querySelector('[aria-label="Enable Spanish"]')?.checked})));const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(suffix));await page.getByRole('button',{name:button,exact:true}).click();const response=await pending;const body=await response.json();assert.equal(response.status(),200,JSON.stringify(body));return body;}
try{
 await check('Platform Admin signs in with the actual authorized local account',async()=>{
  await page.goto(`${origin}/sign-in?next=${encodeURIComponent(`/internal/partners/onboarding/${slug}`)}`);
  await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);await page.getByRole('button',{name:/^sign in$/i}).click();
  await page.waitForURL(u=>u.pathname===`/internal/partners/onboarding/${slug}`);await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
 });
 const state=async()=>{const r=await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`);assert.equal(r.status(),200);return (await r.json()).configuration;};
 const before=await state();
 const protectedState=async()=>{const reads=await Promise.all(['partner_onboarding_agreements','rcap_commercial_authorizations'].map(t=>db.from(t).select('*').eq('workspace_id',before.workspaceId).order('id')));for(const r of reads)assert.equal(r.error,null);return reads.map(r=>r.data);};
 const immutableBefore=await protectedState();
 await check('One normal operating interface contains no legacy approval machinery',async()=>{
  const text=await page.locator('main').first().textContent();assert.doesNotMatch(text,/Approve section|Waive section|Prefill|Service authority and agreements|Authorization expires|Record limited-service authority|partner confirmation pending/i);
 });
 if(!process.env.RCAP_TEST_EXISTING_LIVE){
 if(!process.env.RCAP_TEST_PREVIEW_ONLY){
 await check('Select LegalEase-managed, MD/DC/VA and Spanish through controls; one save and reload persist',async()=>{
  await page.getByLabel('Public program name',{exact:true}).fill(`LegalEase operating acceptance ${Date.now()}`);
  await page.getByLabel('Program operator',{exact:true}).selectOption('legalease_managed');
  await page.getByLabel('How people participate',{exact:true}).selectOption('both');
  await page.getByLabel('Jurisdictions',{exact:true}).selectOption(['MD','DC','VA']);
  await page.getByLabel('Service area description',{exact:true}).fill('District of Columbia, Maryland, Virginia');
  await page.getByLabel('Enable Spanish',{exact:true}).check();
  if(process.env.RCAP_TEST_STANDARD_SPANISH){
   const name=await page.getByLabel('Public organization name',{exact:true}).inputValue();
   for(const [label,value] of Object.entries({'Target population':'People in the program service area','Program headline':'Explore your record-clearing options','Program subheadline':'Answer clear questions to understand possible next steps.','Approved organization description':`A record-clearing access program from ${name}.`,'Primary action label':'Start free screening','Participant support copy':'Contact program support if you need help getting started.'})) await page.getByLabel(label,{exact:true}).fill(value);
   for(const label of ['Spanish headline','Spanish supporting line','Spanish organization description','Spanish action label','Spanish support instructions','Spanish service area','Spanish audience description']){const control=page.getByLabel(label,{exact:true});if(await control.count())await control.fill('');}
  }
  await page.getByLabel('Program services',{exact:true}).selectOption('screening_only');
  await page.getByLabel('Participant access model',{exact:true}).selectOption('optional_code');
  await page.getByLabel('External agreement',{exact:true}).selectOption('not_applicable');
  const r=await mutation('Save program','/configuration');assert.equal(r.configuration.operatingModel,'legalease_managed');assert.deepEqual(r.configuration.data.geography_audience_language_accessibility.jurisdictions,['DC','MD','VA']);
  await page.reload();assert.equal(await page.getByLabel('Enable Spanish',{exact:true}).isChecked(),true);assert.deepEqual(await page.getByLabel('Jurisdictions',{exact:true}).evaluate(e=>Array.from(e.selectedOptions,x=>x.value)),['DC','MD','VA']);
  assert.deepEqual(await protectedState(),immutableBefore);
 });
 }
 let prepared;
 await check('Stale canonical save returns a conflict promptly without retrying forever',async()=>{
  const configuration=await state(),started=Date.now();
  const response=await context.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`,{timeout:10000,headers:{origin},data:{patches:[],expectedVersion:configuration.version-1,requestId:crypto.randomUUID()}});
  assert.equal(response.status(),409);assert.equal((await response.json()).code,'revision_conflict');assert.ok(Date.now()-started<10000);
 });
 await check('Generate actual materials without contract or partner review',async()=>{
  prepared=await mutation('Generate and preview materials','/program');
  assert.equal(prepared.operations.view.materials.length,2,JSON.stringify(prepared.operations.view.decision));
  fs.writeFileSync(`${out}/preflight.json`,JSON.stringify({decision:prepared.operations.launchDecision,preflight:prepared.operations.preflight?.heldReason,issues:prepared.operations.issues},null,2));
  await page.locator('[aria-label="Current program preview"]').waitFor();
  if(process.env.RCAP_TEST_STANDARD_SPANISH)assert.equal(prepared.operations.view.materials.find(m=>m.type==='co_branded_page_configuration').document.pagePreview.spanish.headline,'Explore sus opciones para eliminar antecedentes');
 });
 if(!process.env.RCAP_TEST_PREVIEW_ONLY){
 await check('Spanish preview renders the current saved translation; disabling preserves English and translations',async()=>{
  await page.getByRole('button',{name:'Español',exact:true}).click();await page.getByRole('heading',{name:prepared.operations.view.materials.find(m=>m.type==='co_branded_page_configuration').document.pagePreview.spanish.headline,exact:true}).waitFor();
  await page.getByRole('button',{name:'English',exact:true}).click();
  const english=prepared.operations.view.materials.find(m=>m.type==='co_branded_page_configuration').document.pagePreview.headline.value;
  const translationsBefore=(await state()).data.brand_public_page;
  await page.getByLabel('Enable Spanish',{exact:true}).uncheck();await mutation('Save program','/configuration');await page.reload();assert.equal(await page.getByLabel('Enable Spanish',{exact:true}).isChecked(),false);
  prepared=await mutation('Generate and preview materials','/program');
  const preview=prepared.operations.view.materials.find(m=>m.type==='co_branded_page_configuration').document.pagePreview;assert.equal(preview.headline.value,english);assert.equal(preview.spanishEnabled,false);const translationsAfter=(await state()).data.brand_public_page;for(const key of Object.keys(translationsBefore).filter(k=>k.endsWith('_es')))assert.deepEqual(translationsAfter[key],translationsBefore[key]);assert.equal(await page.getByRole('button',{name:'Español',exact:true}).count(),0);
 });
 }
 if(process.env.RCAP_TEST_STANDARD_SPANISH){
  assert.equal(prepared.operations.canStart,true,'English operation remains ready');
  await page.getByLabel('Enable Spanish',{exact:true}).check();await mutation('Save program','/configuration');await page.reload();prepared=await mutation('Generate and preview materials','/program');
 }
 await check('One final authenticated confirmation starts the real protected publication pathway',async()=>{
  assert.equal(prepared.operations.canStart,true,JSON.stringify(prepared.operations.launchDecision));
  await page.getByLabel('Confirm operating scope and current materials',{exact:true}).check();
  const started=await mutation('Start Program','/program');assert.equal(started.operations.view.decision.live,true);
  const workspace=await db.from('partner_onboarding').select('status,operating_model,rcap_launch_operation_id').eq('id',before.workspaceId).single();assert.equal(workspace.error,null);assert.equal(workspace.data.status,'live');
  const receipts=await db.from('rcap_launch_operation_events').select('step,evidence').eq('operation_id',workspace.data.rcap_launch_operation_id).order('created_at');assert.equal(receipts.error,null);assert.equal(receipts.data.at(-1).step,'complete');assert.deepEqual(receipts.data.at(-1).evidence.intakeJurisdictions,['DC','MD','VA']);
  const approvals=await db.from('partner_onboarding_launch_approvals').select('approval_type,policy_details').eq('workspace_id',before.workspaceId);assert.equal(approvals.error,null);assert.equal(approvals.data.some(a=>a.approval_type==='partner_launch_approval'),false);
  assert.deepEqual(await protectedState(),immutableBefore);
  fs.writeFileSync(`${out}/launch-evidence.json`,JSON.stringify({workspace:workspace.data,receipts:receipts.data,approvals:approvals.data},null,2));
 });
 }
 if(process.env.RCAP_TEST_STANDARD_SPANISH) await check('Published Spanish page and participant jurisdiction selection follow the saved setting',async()=>{
  await page.goto(`${origin}/p/${slug}`);await page.getByRole('button',{name:'Español',exact:true}).click();await page.getByRole('heading',{name:'Explore sus opciones para eliminar antecedentes',exact:true}).waitFor();
  await page.goto(`${origin}/intake/${slug}`);await page.getByRole('heading',{name:'Elija dónde se encuentra su expediente',exact:true}).waitFor();await page.getByRole('button',{name:'English',exact:true}).click();
 });
 await check('Published MD, DC and VA each create their own authorized screening through actual browser controls',async()=>{
  for(const jurisdiction of ['MD','DC','VA']){
   await page.goto(`${origin}/intake/${slug}`);
   await page.getByLabel('Screening jurisdiction',{exact:true}).selectOption(jurisdiction);
   await page.getByRole('button',{name:'Continue',exact:true}).click();
   await page.getByRole('button',{name:'Start your record-clearing screening',exact:false}).click();
   await page.waitForURL(u=>u.pathname===`/expungement-ai/screening/${jurisdiction.toLowerCase()}`);
   const sessionId=new URL(page.url()).searchParams.get('session');assert.ok(sessionId);
   const session=await db.from('screening_sessions').select('jurisdiction,partner_slug,flow_mode,partner_benefit_active').eq('session_id',sessionId).single();
   assert.equal(session.error,null);assert.equal(session.data.jurisdiction,jurisdiction);assert.equal(session.data.partner_slug,slug);assert.equal(session.data.flow_mode,'rcap');
   fs.writeFileSync(`${out}/screening-${jurisdiction}.json`,JSON.stringify({sessionId,...session.data},null,2));
  }
 });
 await check('An unauthorized fourth state is refused by server action without creating a benefited session',async()=>{
  const count=async()=>{const r=await db.from('screening_sessions').select('session_id',{count:'exact',head:true}).eq('partner_slug',slug);assert.equal(r.error,null);return r.count;};
  const beforeCount=await count();
  await page.goto(`${origin}/intake/${slug}?jurisdiction=NY`);assert.equal(await page.getByRole('button',{name:'Start your record-clearing screening',exact:false}).count(),0);
  await page.goto(`${origin}/intake/${slug}?jurisdiction=MD`);
  await page.locator('input[name=jurisdiction]').evaluate(e=>{e.value='NY';});
  await page.getByRole('button',{name:'Start your record-clearing screening',exact:false}).click();
  await page.waitForURL(u=>u.searchParams.get('status')==='inactive');assert.equal(await count(),beforeCount);
 });
 await check('Integrated Clinic controls preserve all three states and refuse unfunded sponsorship',async()=>{
  await page.goto(`${origin}/internal/clinic?partner=${slug}`);await page.getByRole('heading',{name:'Nationwide Clinic Mode',exact:true}).waitFor();
  assert.deepEqual(await page.locator('select[name=jurisdiction] option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean)),['DC','MD','VA']);
  await page.locator('input[name=name]').fill(`Operating acceptance ${Date.now()}`);
  const start=new Date(Date.now()+86400000).toISOString().slice(0,16),end=new Date(Date.now()+90000000).toISOString().slice(0,16);
  await page.locator('input[name=startsAt]').fill(start);await page.locator('input[name=endsAt]').fill(end);
  await page.locator('input[name=locationName]').fill('Authorized local acceptance fixture');await page.locator('input[name=capacity]').fill('5');
  await page.locator('select[name=jurisdiction]').selectOption('MD');
  await page.getByText('Event sponsorship limit (optional)',{exact:true}).click();await page.locator('input[name=sponsorshipAllocation]').fill('1');
  let pending=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/clinic/events');
  await page.getByRole('button',{name:'Create clinic event',exact:true}).click();let r=await pending;assert.ok(r.status()>=400,'screening-only Clinic cannot acquire sponsorship');
  await page.locator('input[name=sponsorshipAllocation]').fill('0');pending=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/clinic/events');
  await page.getByRole('button',{name:'Create clinic event',exact:true}).click();r=await pending;assert.equal(r.status(),201);
  await page.waitForURL(u=>/^\/internal\/clinic\/[0-9a-f-]+$/.test(u.pathname));const body={eventId:new URL(page.url()).pathname.split('/').at(-1)};
  pending=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname===`/api/clinic/events/${body.eventId}`);
  await page.getByRole('button',{name:'Open clinic',exact:true}).click();r=await pending;assert.equal(r.status(),200,JSON.stringify(await r.json()));
  const event=await db.from('clinic_events').select('public_slug,jurisdiction,status,sponsorship_allocation').eq('id',body.eventId).single();assert.equal(event.error,null);assert.equal(event.data.jurisdiction,'MD');assert.equal(event.data.status,'published');assert.equal(event.data.sponsorship_allocation,0);
  // Reuse an existing isolated test identity for staffing; authorization itself is exercised in the UI.
  const users=await db.auth.admin.listUsers({page:1,perPage:1000});assert.equal(users.error,null);
  const existingMemberships=await db.from('partner_users').select('auth_user_id,partner_slug');assert.equal(existingMemberships.error,null);
  const staffUser=users.data.users.find(u=>u.email?.endsWith('.test')&&u.email!==access.owner.email&&(!existingMemberships.data.some(m=>m.auth_user_id===u.id)||existingMemberships.data.some(m=>m.auth_user_id===u.id&&m.partner_slug===slug)));assert.ok(staffUser,'existing unassigned local test identity for staffing');
  let member=await db.from('partner_users').select('id').eq('auth_user_id',staffUser.id).eq('partner_slug',slug).maybeSingle();assert.equal(member.error,null);
  if(!member.data){member=await db.from('partner_users').insert({auth_user_id:staffUser.id,partner_slug:slug,role:'partner_staff',status:'active',invited_email:staffUser.email}).select('id').single();assert.equal(member.error,null);}
  const staffDisplay=await db.from('partner_users').update({invited_email:staffUser.email}).eq('id',member.data.id).eq('partner_slug',slug);assert.equal(staffDisplay.error,null);
  await page.reload();await page.getByLabel('Staff email',{exact:true}).selectOption(member.data.id);
  pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/staff'));await page.getByRole('button',{name:'Save staff authorization',exact:true}).click();r=await pending;assert.equal(r.status(),200);const staffId=(await r.json()).staffId;
  pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/access-codes'));await page.getByRole('button',{name:'Generate event access code',exact:true}).click();r=await pending;assert.equal(r.status(),201);const accessCode=(await r.json()).accessCode.code;
  await page.goto(`${origin}/clinic/${event.data.public_slug}`);assert.equal(await page.getByRole('heading').count()>0,true);assert.doesNotMatch(await page.locator('body').innerText(),/Application error|404/);
  await page.locator('input[name=eventCode]').fill(accessCode);await page.getByRole('button',{name:/Continue to participant consent/i}).click();
  await page.waitForURL(u=>u.pathname===`/clinic/${event.data.public_slug}/assist`);await page.locator('select[name=eventStaffId]').selectOption(staffId);await page.locator('input[name=consent]').check();
  pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/assistance/start'));await page.getByRole('button',{name:'Start assisted nationwide screening',exact:true}).click();r=await pending;assert.equal(r.status(),200);
  await page.waitForURL(u=>u.pathname===`/clinic/${event.data.public_slug}/screening/md`);
  const assisted=await db.from('clinic_assisted_sessions').select('screening_session_id,participant_user_id,consent_version').eq('event_id',body.eventId).eq('event_staff_id',staffId).single();assert.equal(assisted.error,null);assert.equal(assisted.data.consent_version,'clinic-assistance-v1');
  const actualSession=await db.from('screening_sessions').select('partner_slug,jurisdiction,flow_mode').eq('session_id',assisted.data.screening_session_id).single();assert.equal(actualSession.error,null);assert.deepEqual(actualSession.data,{partner_slug:slug,jurisdiction:'MD',flow_mode:'rcap'});
  fs.writeFileSync(`${out}/clinic-evidence.json`,JSON.stringify({eventId:body.eventId,...event.data},null,2));
 });
 await check('Existing partner administrator signs in and opens their unchanged program onboarding/dashboard',async()=>{
  const users=await db.auth.admin.listUsers({page:1,perPage:1000});assert.equal(users.error,null);
  let selected;
  for(const user of users.data.users.filter(u=>u.email?.startsWith('rcap-correction-'))){const membership=await db.from('partner_users').select('partner_slug,role,status').eq('auth_user_id',user.id).eq('role','partner_admin').eq('status','active').maybeSingle();if(membership.data){selected={user,membership:membership.data};break;}}
  assert.ok(selected,'existing authorized local partner fixture');
  const partnerWorkspace=await db.from('partner_onboarding').select('*').eq('partner_slug',selected.membership.partner_slug).single();assert.equal(partnerWorkspace.error,null);
  const partnerContext=await browser.newContext(),partnerPage=await partnerContext.newPage();partnerPage.setDefaultTimeout(60000);
  await partnerPage.goto(`${origin}/sign-in?next=%2Fpartner%2Fonboarding`);await partnerPage.locator('input[type=email]').fill(selected.user.email);await partnerPage.locator('input[type=password]').fill(access.owner.password);await partnerPage.getByRole('button',{name:/^sign in$/i}).click();
  await partnerPage.waitForURL(u=>['/partner/dashboard','/partner/onboarding'].includes(u.pathname));
  assert.match(await partnerPage.locator('main').innerText(),/Your program|Program setup|program information/i);
  const after=await db.from('partner_onboarding').select('*').eq('id',partnerWorkspace.data.id).single();assert.deepEqual(after.data,partnerWorkspace.data);
  const denied=await partnerContext.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`);assert.equal(denied.status(),403);
  await partnerPage.screenshot({path:`${out}/partner-entry.png`,fullPage:true});await partnerContext.close();
 });
 assert.deepEqual(errors,[]);await page.screenshot({path:`${out}/dashboard.png`,fullPage:true});
} catch(error){await page.screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});fs.writeFileSync(`${out}/failure-text.txt`,await page.locator('body').innerText().catch(()=>''));throw error;}
finally{fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({results,errors},null,2));await browser.close();}
