// Actual Next application + loopback GoTrue/PostgREST. Never use on a hosted target.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import { chromium } from 'playwright';
import {createClient} from '@supabase/supabase-js';
const access=JSON.parse(fs.readFileSync(process.env.RCAP_TEST_ACCESS_FILE??'/workspaces/training-modules-09-10/output/rcap-practice-access.json','utf8'));
const origin=process.env.RCAP_ACCEPTANCE_BASE_URL??'http://127.0.0.1:3100';
const backend=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const url of [origin,backend])assert.equal(new URL(url).hostname,'127.0.0.1','Loopback fixture infrastructure only');
assert.notEqual(process.env.VERCEL_ENV,'production');
const out='artifacts/rcap2-functional-correction-20261010';fs.mkdirSync(out,{recursive:true});
const db=createClient(backend,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const slug=process.env.RCAP_TEST_PARTNER_SLUG??'practice-create-webkit-mv19x7cm';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(90000);
const failures=[];page.on('pageerror',e=>failures.push(e.message));
const results=[];
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
try{
 await check('Platform Admin authenticates through actual sign-in form',async()=>{
  await page.goto(`${origin}/sign-in?next=${encodeURIComponent(`/internal/partners/onboarding/${slug}`)}`,{waitUntil:"domcontentloaded"});
  await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);
  await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(url=>url.pathname===`/internal/partners/onboarding/${slug}`);
  await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
 });
 const response=await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`);assert.equal(response.status(),200);
 const before=(await response.json()).configuration;
 const tables=['partner_onboarding_launch_approvals','partner_onboarding_agreements','rcap_commercial_authorizations'];
 const protectedState=async()=>Promise.all(tables.map(async table=>{const r=await db.from(table).select('*').eq('workspace_id',before.workspaceId).order('id');assert.equal(r.error,null);return r.data;}));
 const protectedBefore=await protectedState();fs.writeFileSync('/tmp/rcap-functional-fixture-before.json',JSON.stringify(before),{mode:0o600});
 const expectedMode=before.data.program_goals?.participation_mode==='both'?'clinics':'both';
 const expectedJurisdiction=before.data.geography_audience_language_accessibility?.jurisdictions?.[0]==='MD'?'MS':'MD';
 const expectedArea=expectedJurisdiction==='MD'?'Baltimore and nearby Maryland communities':'Jackson and nearby Mississippi communities';
 await check(`${before.policyVersion} workspace opens without automatic policy conversion`,async()=>assert.ok(['legacy','rcap2.2'].includes(before.policyVersion)));
 await check('Ordinary workspace has no legacy review or prefill panels, including hidden content',async()=>{
  const text=await page.locator('main').first().textContent();assert.doesNotMatch(text,/Phase 1|Approve section|Waive section|Advanced source history|Preparation history|Prefill|Mark ready for launch/i);
  assert.equal(await page.getByRole('button',{name:'Start program',exact:true}).count(),1);
 });
 await page.screenshot({path:`${out}/admin-before.png`,fullPage:true,caret:"initial"});
 await check('One browser save persists participation mode and service geography',async()=>{
  const posts=[];page.on('request',r=>{if(r.method()==='POST'&&/configuration|prefill/.test(r.url()))posts.push(r.url());});
  await page.getByLabel('How people participate',{exact:true}).selectOption(expectedMode);
  await page.getByLabel('Jurisdictions',{exact:false}).fill(expectedJurisdiction==='MD'?'Maryland':'Mississippi');
  await page.getByLabel('Service area description',{exact:true}).fill(expectedArea);
  const responsePromise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/configuration'));
  await page.getByRole('button',{name:'Save program',exact:true}).click();
  const response=await responsePromise;const body=await response.json();assert.equal(response.status(),200,JSON.stringify(body));
  assert.equal(posts.length,1);assert.equal(posts.some(url=>url.includes('/prefill')),false);
  for(const [section,values] of Object.entries(before.data))for(const [key,value] of Object.entries(values))if(!['participation_mode','jurisdictions','service_area_description'].includes(key))assert.deepEqual(body.configuration.data[section][key],value,`Unchanged ${section}.${key}`);
  await page.reload();await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
  assert.equal(await page.getByLabel('How people participate',{exact:true}).inputValue(),expectedMode);
  assert.equal(await page.getByLabel('Jurisdictions',{exact:false}).inputValue(),expectedJurisdiction);
  assert.equal(await page.getByLabel('Service area description',{exact:true}).inputValue(),expectedArea);
 });
 await page.screenshot({path:`${out}/admin-after-reload.png`,fullPage:true,caret:"initial"});

 await check('Saved legacy configuration preserves policy, agreements and approval history',async()=>{
  const fresh=await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`);assert.equal((await fresh.json()).configuration.policyVersion,before.policyVersion);assert.deepEqual(await protectedState(),protectedBefore);
 });
 async function action(buttonName){assert.equal(await page.getByRole('button',{name:buttonName,exact:true}).isEnabled(),true,buttonName+' must be enabled');const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/program'));await page.getByRole('button',{name:buttonName,exact:true}).click();const r=await pending;const b=await r.json();assert.equal(r.status(),200,JSON.stringify(b));await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();return b;}
 if(before.policyVersion==='legacy')await check('Explicit policy choice advances the same workspace without the section approval maze',async()=>{
  await action('Use five-step setup');assert.equal(await page.getByRole('button',{name:'Use five-step setup',exact:true}).count(),0);assert.deepEqual(await protectedState(),protectedBefore);
 });
 await check('Administrator prepares current materials from the saved configuration',async()=>{
  const result=await action('Prepare with saved facts and standard defaults');assert.equal(result.operations.view.decision.configurationComplete,true);assert.equal(result.operations.view.materials.length,2);
  await page.getByLabel('Program status').getByText('Program details complete; partner confirmation pending',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Start program',exact:true}).isDisabled(),true);
  await action('View current program materials');
 });
 await page.screenshot({path:`${out}/admin-materials.png`,fullPage:true,caret:"initial"});
 // Existing auth test infrastructure: a new loopback-only fixture identity, using
 // the already supplied local practice credential, never a Production account.
 const email=`rcap-correction-${Date.now()}@example.test`;
 const user=await db.auth.admin.createUser({email,password:access.owner.password,email_confirm:true});assert.equal(user.error,null);
 assert.equal((await db.from('partner_users').insert({auth_user_id:user.data.user.id,partner_slug:slug,role:'partner_admin',status:'active'})).error,null);
 const membership=await db.from('partner_users').select('partner_slug,role,status').eq('auth_user_id',user.data.user.id).single();assert.equal(membership.data.partner_slug,slug);assert.equal(membership.data.role,'partner_admin');assert.equal(membership.data.status,'active');
 const partnerContext=await browser.newContext(),partnerPage=await partnerContext.newPage();partnerPage.setDefaultTimeout(90000);partnerPage.on('pageerror',e=>failures.push(e.message));
 await check('Partner signs in through the actual form and sees the same saved program',async()=>{
  await partnerPage.goto(`${origin}/sign-in?next=${encodeURIComponent('/partner/onboarding?step=program')}`,{waitUntil:'domcontentloaded'});
  await partnerPage.locator('input[type=email]').fill(email);await partnerPage.locator('input[type=password]').fill(access.owner.password);await partnerPage.getByRole('button',{name:/^sign in$/i}).click();await partnerPage.waitForURL(u=>u.pathname==='/partner/onboarding');
  assert.equal(await partnerPage.getByRole('combobox',{name:'How will people participate?'}).inputValue(),expectedMode);
  assert.equal(await partnerPage.getByRole('combobox',{name:'Where will you help people?'}).inputValue(),expectedJurisdiction);
  assert.equal(await partnerPage.getByRole('textbox',{name:'Service area',exact:false}).inputValue(),expectedArea);
 });
 await check('Partner completes the genuine next review action through five-step onboarding',async()=>{
  await partnerPage.getByRole('button',{name:'Continue',exact:true}).click();await partnerPage.getByRole('heading',{name:'Anyone else helping run your program?',exact:true}).waitFor();
  const reviewResponse=partnerPage.waitForResponse(r=>r.request().method()==="POST"&&r.url().endsWith("/program"));await partnerPage.getByRole('button',{name:"I'll do this later",exact:true}).click();const reviewResult=await reviewResponse;assert.equal(reviewResult.status(),200,JSON.stringify(await reviewResult.json()));await partnerPage.getByRole('heading',{name:'Review your program.',exact:true}).waitFor();
  await partnerPage.getByRole('checkbox',{name:/I confirm that the organization/}).check();
  const pending=partnerPage.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/program'));await partnerPage.getByRole('button',{name:'Confirm my program',exact:true}).click();const r=await pending;const b=await r.json();assert.equal(r.status(),200,JSON.stringify(b));assert.equal(b.view.decision.setupComplete,true);assert.equal(b.view.decision.live,false);
  await partnerPage.waitForURL(u=>u.pathname==='/partner/dashboard');await partnerPage.reload({waitUntil:'domcontentloaded'});await partnerPage.getByRole('heading',{level:1}).waitFor();
 });
 await check('Unauthorised publication stays held while confirmed setup remains accessible',async()=>{
  await page.reload({waitUntil:'domcontentloaded'});await page.getByLabel('Program status').getByText('Partner setup confirmed',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Start program',exact:true}).isDisabled(),true);
  await page.getByLabel('Program status').getByText('Current service authority required',{exact:true}).waitFor();await page.getByLabel('Program status').getByText('Unavailable under current program authority',{exact:true}).waitFor();
 });

 async function authorize(){
  await page.waitForLoadState("networkidle");
  await page.getByLabel('Specific authority or decision basis',{exact:true}).fill('Authorized disposable functional acceptance for this program; no real commercial activity.');
  await page.getByLabel('Authorization expires',{exact:true}).fill(new Date(Date.now()+7*86400000).toISOString().slice(0,16));
  await page.getByRole('checkbox',{name:/I reviewed this program and its actual authority/}).check();
 }
 async function postByClick(name,suffix){const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(suffix));await page.getByRole('button',{name,exact:true}).click();const r=await pending;const b=await r.json();assert.equal(r.status(),200,JSON.stringify(b));await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();return b;}
 await check('Qualification is recorded from the consolidated workspace',async()=>{
  if(await page.getByRole('button',{name:'Confirm partner qualification',exact:true}).count()){await authorize();await postByClick('Confirm partner qualification','/admin-action');}
  assert.equal(await page.getByRole('button',{name:'Confirm partner qualification',exact:true}).count(),0);
 });
 await check('Executed fixture document is recorded through the existing protected agreement operation',async()=>{
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);const sheet=pdf.addPage();sheet.drawText('LOCAL ACCEPTANCE FIXTURE - NO REAL CONTRACT',{x:40,y:780,size:14,font});sheet.drawText(`Disposable program: ${slug}`,{x:40,y:750,size:10,font});sheet.drawText('Test parties: Synthetic LegalEase and Synthetic Community Partner.',{x:40,y:725,size:10,font});sheet.drawText('Fixture signatures: Test Operator / Test Partner. Screening only; no payment.',{x:40,y:700,size:10,font});
  await page.getByText('Service authority and agreements',{exact:true}).click();await page.getByText('Record an executed agreement',{exact:true}).click();
  await page.locator('input[name=file]').setInputFiles({name:'local-executed-fixture.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
  await page.locator('input[name=effectiveDate]').fill(new Date().toISOString().slice(0,10));await page.locator('textarea[name=reviewReason]').fill('Inspected the authorized disposable fixture document and fixture signatures; no real contract.');await page.locator('input[name=confirmed]').check();
  await postByClick('Record executed agreement','/signed-agreement');
 });
 await check('Screening-only authority is recorded without payment or packet entitlement',async()=>{
  await authorize();await page.getByText('Service authority and agreements',{exact:true}).click();
  await page.getByLabel('Policy or authority reference',{exact:true}).fill('Owner-authorized isolated application acceptance fixture.');await page.getByLabel('Effective conditions',{exact:true}).fill('Local screening program only; no money and no real participants.');await page.getByLabel('Termination or revocation rule',{exact:true}).fill('Authority ends when this disposable acceptance exercise ends.');await page.getByLabel('Documented screening allowance',{exact:true}).fill('100');await page.getByRole('checkbox',{name:/I reviewed this program and its actual authority/}).check();
  await action('Record limited-service authority');await page.getByLabel('Program status').getByText('Current screening-only authority',{exact:true}).waitFor();
  const r=await db.from('partner_records').select('payment_status').eq('partner_slug',slug).single();assert.equal(r.data.payment_status,'unpaid');
  await action('View current program materials');
 });
 await check('Partner reviews materials after authority changes and confirms the actual current scope',async()=>{
  await partnerPage.goto(`${origin}/partner/onboarding?step=start`,{waitUntil:'domcontentloaded'});await partnerPage.getByRole('checkbox',{name:/I confirm that the organization/}).check();const pending=partnerPage.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/program'));await partnerPage.getByRole('button',{name:'Confirm my program',exact:true}).click();const r=await pending;const b=await r.json();assert.equal(r.status(),200,JSON.stringify(b));assert.equal(b.view.decision.setupComplete,true);await partnerPage.waitForURL(u=>u.pathname==='/partner/dashboard');
 });
 await check('One authorized Start program interaction publishes and verifies the disposable program',async()=>{
  await page.reload({waitUntil:'domcontentloaded'});await authorize();assert.equal(await page.getByRole('button',{name:'Start program',exact:true}).isEnabled(),true);
  const b=await action('Start program');assert.equal(b.operations.view.decision.live,true);await page.getByLabel('Program status').getByText('Live and verified',{exact:true}).waitFor();
  await partnerPage.goto(`${origin}/partner/onboarding`,{waitUntil:'domcontentloaded'});await partnerPage.waitForURL(u=>u.pathname==='/partner/dashboard');await partnerPage.getByRole('heading',{name:'Your program is live.',exact:true}).waitFor();
  await partnerPage.getByRole('link',{name:'Open participant page',exact:true}).click();await partnerPage.locator(`[data-rcap-partner="${slug}"]`).waitFor();
 });
 await check('Clinic navigation opens the actual authenticated program scope and returns to the workspace',async()=>{
  await page.getByRole('link',{name:'Manage program clinics',exact:true}).click();await page.getByRole('heading',{name:'Nationwide Clinic Mode',exact:true}).waitFor();
  assert.equal(await page.locator('select[name=partnerSlug]').inputValue(),slug);
  const eventName=`Local RCAP acceptance ${Date.now()}`;
  await page.locator('input[name=name]').fill(eventName);await page.locator('input[name=startsAt]').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));await page.locator('input[name=endsAt]').fill(new Date(Date.now()+90000000).toISOString().slice(0,16));await page.locator('input[name=locationName]').fill('Local fixture event room');await page.locator('input[name=capacity]').fill('10');
  const created=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/clinic/events'));await page.getByRole('button',{name:'Create clinic event',exact:true}).click();const result=await created;assert.ok(result.ok(),JSON.stringify(await result.json()));
  await page.getByRole('heading',{name:eventName,exact:true}).waitFor();
  const eventPath=new URL(page.url()).pathname,eventId=eventPath.split('/').at(-1);
  const opened=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().endsWith(`/api/clinic/events/${eventId}`));await page.getByRole('button',{name:'Open clinic',exact:true}).click();const openedResult=await opened;assert.equal(openedResult.status(),200,JSON.stringify(await openedResult.json()));await page.getByRole('button',{name:'Pause event',exact:true}).waitFor();
  await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Pause event',exact:true}).waitFor();
  await page.getByRole('link',{name:'Reporting',exact:true}).click();await page.getByRole('heading',{name:`${eventName} reporting`,exact:true}).waitFor();await page.getByRole('link',{name:'Back to internal event controls',exact:true}).click();await page.getByRole('link',{name:'Back to program',exact:true}).click();await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
  await partnerPage.goto(`${origin}/partner/clinic`,{waitUntil:'domcontentloaded'});await partnerPage.getByRole('heading',{name:'Clinic Mode administration',exact:true}).waitFor();await partnerPage.getByRole('link',{name:'Back to program',exact:true}).click();await partnerPage.waitForURL(u=>u.pathname==='/partner/dashboard');
 });
 await check('Anonymous and partner access cannot open the internal workspace',async()=>{
  const anon=await browser.newContext(),p=await anon.newPage();await p.goto(`${origin}/internal/partners/onboarding/${slug}`,{waitUntil:'domcontentloaded'});assert.equal(new URL(p.url()).pathname,'/sign-in');await anon.close();
  await partnerPage.goto(`${origin}/internal/partners/onboarding/${slug}`,{waitUntil:'domcontentloaded'});await partnerPage.getByRole('heading',{name:'Internal admin access denied',exact:true}).waitFor();assert.equal(await partnerPage.getByRole('heading',{name:'Configure program',exact:true}).count(),0);
 });
 assert.deepEqual(failures,[], 'No unhandled application errors');
 await partnerContext.close();
 fs.writeFileSync(`${out}/browser-acceptance.json`,JSON.stringify({status:'PASS',sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),environment:'Existing isolated loopback application and actual GoTrue sessions; not hosted staging or Production',origin,slug,results,failures,configuration:{participationMode:expectedMode,jurisdictions:[expectedJurisdiction],serviceArea:expectedArea}},null,2));
 console.log('PASS integrated browser acceptance: configuration, partner review, authority, publication and Clinic navigation.');

}catch(e){fs.writeFileSync(`${out}/browser-acceptance.json`,JSON.stringify({status:'FAILED',origin,slug,results,failure:String(e),pageErrors:failures},null,2));await page.screenshot({path:`${out}/browser-failure.png`,fullPage:true,caret:"initial"});throw e;}
finally{await browser.close();}
