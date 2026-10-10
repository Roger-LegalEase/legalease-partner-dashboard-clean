// Real authenticated loopback application only; preserves the failed fixture for the corrected run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';

const origin=process.env.RCAP_ACCEPTANCE_BASE_URL??'http://127.0.0.1:3100';
for(const url of [origin,process.env.NEXT_PUBLIC_SUPABASE_URL])assert.equal(new URL(url).hostname,'127.0.0.1');
assert.notEqual(process.env.VERCEL_ENV,'production');
const out=process.env.RCAP_RIGHTS_EVIDENCE_DIR??'artifacts/rcap-operating-rights-correction';
fs.mkdirSync(out,{recursive:true});
const access=JSON.parse(fs.readFileSync(process.env.RCAP_TEST_ACCESS_FILE??'/workspaces/training-modules-09-10/output/rcap-practice-access.json','utf8'));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const checked=async result=>{assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
let fixture;
if(fs.existsSync(`${out}/fixture.json`))fixture=JSON.parse(fs.readFileSync(`${out}/fixture.json`,'utf8'));
else{
 const actor=(await checked(await db.from('partner_users').select('auth_user_id').eq('role','internal_admin').eq('status','active').is('partner_slug',null).limit(1).single())).auth_user_id;
 const slug=`operating-rights-${Date.now().toString(36)}`;
 const partner=await checked(await db.from('partner_records').insert({partner_id:slug,partner_slug:slug,partner_name:'Fictional operating responsibility acceptance',organization_name:'Fictional operating responsibility acceptance',program_tier:'community',payment_status:'unpaid'}).select('id').single());
 const created=await checked(await db.rpc('rcap_service_create_onboarding_workspace',{p_partner_slug:slug,p_actor_user_id:actor,p_request_id:randomUUID(),p_target_launch_date:null,p_schema_version:'rcap-partner-onboarding-v1',p_payload_hash:'a'.repeat(64)}));
 const workspaceId=created[0].workspace_id;
 const data={
  organization_contacts:{legal_organization_name:'Fictional operating responsibility acceptance',public_organization_name:'Fictional operating responsibility acceptance',public_program_name:'Fictional screening program',partner_slug_preference:slug},
  program_goals:{participation_mode:'online',target_population:'People in the program service area'},
  geography_audience_language_accessibility:{jurisdictions:['MD'],service_area_description:'Maryland',primary_language:'English',enable_spanish:false},
  access_sponsorship_capacity:{participant_access_model:'open'},
  support_referrals_reporting:{participant_support_email:'support@example.test',referral_arrangement:'no_referrals',contested_matter_procedure:'Stop the self-help process for contested matters and contact program support. LegalEase does not provide representation.'}
 };
 for(const [section,response_data] of Object.entries(data)){
  const row=await checked(await db.from('partner_onboarding_sections').select('revision').eq('workspace_id',workspaceId).eq('section_key',section).single());
  await checked(await db.from('partner_onboarding_sections').update({response_data,revision:row.revision+1}).eq('workspace_id',workspaceId).eq('section_key',section));
 }
 const user=await checked(await db.auth.admin.createUser({email:`${slug}@example.test`,password:access.owner.password,email_confirm:true}));
 await checked(await db.from('partner_users').insert({auth_user_id:user.user.id,partner_slug:slug,role:'partner_admin',status:'active'}));
 await checked(await db.from('partner_onboarding_agreements').insert(['order_form','master_services_agreement'].map(agreement_type=>({workspace_id:workspaceId,agreement_type,status:'not_required',is_required:false,recorded_by:actor,recorded_at:new Date().toISOString()}))));
 fixture={slug,workspaceId,partnerId:partner.id,actor,member:user.user.id};
 fs.writeFileSync(`${out}/fixture.json`,JSON.stringify(fixture,null,2));
}
if(process.env.RCAP_RIGHTS_SEED_ONLY==='true'){console.log('Created isolated rights-regression fixture',fixture.slug);process.exit(0);}
const {slug,workspaceId,member}=fixture;
const users=await checked(await db.auth.admin.listUsers({perPage:1000}));
const signedInActor=users.users.find(user=>user.email===access.owner.email)?.id;
assert.ok(signedInActor);
const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();
page.setDefaultTimeout(60000);
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();results.push({name,status:'PASS'});console.log('PASS',name);};
const state=async()=>{const response=await context.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`);assert.equal(response.status(),200);return (await response.json()).configuration;};
async function protectedState(){
 const result={};
 for(const table of ['partner_onboarding_agreements','partner_onboarding_launch_approvals','rcap_commercial_authorizations'])result[table]=await checked(await db.from(table).select('*').eq('workspace_id',workspaceId).order('id'));
 result.memberships=await checked(await db.from('partner_users').select('*').eq('partner_slug',slug).order('id'));
 result.record=await checked(await db.from('partner_records').select('*').eq('partner_slug',slug).single());
 result.screenings=await checked(await db.from('partner_entitlement').select('*').eq('partner_slug',slug));
 result.packets=await checked(await db.from('partner_packet_entitlement').select('*').eq('partner_id',fixture.partnerId));
 return result;
}
async function clickMutation(name,suffix){const [response]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(suffix)),page.getByRole('button',{name,exact:true}).click()]);return {status:response.status(),body:await response.json(),request:response.request().postDataJSON()};}
try{
 await check('Platform Admin signs in through the actual local authentication form',async()=>{
  await page.goto(`${origin}/sign-in?next=${encodeURIComponent(`/internal/partners/onboarding/${slug}`)}`);
  await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);
  await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname===`/internal/partners/onboarding/${slug}`);
  await page.getByRole('heading',{name:'Configure program',exact:true}).waitFor();
 });
 const before=await state(),protectedBefore=await protectedState();
 await check('Existing workspace reproduces an active partner administrator and two recorded Not Required agreements without execution evidence',async()=>{
  assert.equal(before.operatingModel,'partner_managed');
  assert.equal(protectedBefore.memberships.find(m=>m.auth_user_id===member).status,'active');
  const agreements=protectedBefore.partner_onboarding_agreements.filter(a=>a.recorded_by);
  assert.equal(agreements.length,2);
  for(const a of agreements){assert.equal(a.status,'not_required');assert.equal(a.finalized_asset_id,null);assert.equal(a.signed_receipt_id,null);}
 });
 await page.getByLabel('Program operator',{exact:true}).selectOption('legalease_managed');
 await page.getByLabel('Operating responsibility',{exact:true}).fill('Owner-designated fictional test organization. LegalEase operates this program; no independent third-party operating rights exist.');
 await page.getByLabel('External agreement',{exact:true}).selectOption('not_applicable');
 await page.getByLabel('Program services',{exact:true}).selectOption('screening_only');
 await page.getByLabel('How people participate',{exact:true}).selectOption('both');
 await page.getByLabel('Jurisdictions',{exact:true}).selectOption(['MD','DC','VA']);
 await page.getByLabel('Service area description',{exact:true}).fill('District of Columbia, Maryland, Virginia');
 await page.getByLabel('Participant access model',{exact:true}).selectOption('open');
 const saved=await clickMutation('Save program','/configuration');
 if(process.env.RCAP_RIGHTS_EXPECT_BASELINE_FAILURE==='true'){
  assert.equal(saved.status,403,JSON.stringify(saved.body));assert.equal(saved.body.code,'forbidden');assert.equal((await state()).operatingModel,'partner_managed');
  assert.deepEqual(await protectedState(),protectedBefore);
  fs.writeFileSync(`${out}/baseline.json`,JSON.stringify({status:saved.status,error:saved.body.error,unchanged:true,fixture},null,2));
  console.log('PASS baseline reproduces false external-rights refusal through authenticated Program Setup');
 }else{
  await check('One save establishes LegalEase responsibility and preserves memberships, agreements, approvals and financial rows',async()=>{
   assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.configuration.operatingModel,'legalease_managed');
   assert.equal(saved.body.configuration.policyVersion,'rcap2.2');assert.deepEqual(await protectedState(),protectedBefore);
  });
  await check('Refresh persists the operating model, Not Required applicability and Screening Only without legacy launch actions',async()=>{
   await page.reload();assert.equal(await page.getByLabel('Program operator',{exact:true}).inputValue(),'legalease_managed');
   assert.equal(await page.getByLabel('External agreement',{exact:true}).inputValue(),'not_applicable');
   assert.equal(await page.getByLabel('Program services',{exact:true}).inputValue(),'screening_only');
   assert.doesNotMatch(await page.locator('main').first().textContent(),/Record the actual agreement|Record limited-service authority|partner confirmation pending|Service authority and agreements/);
  });
  await check('Save has one auditable operating-responsibility decision and retry does not duplicate it',async()=>{
   const events=await checked(await db.from('partner_events').select('id,event_payload').eq('id',saved.request.requestId));
   assert.equal(events.length,1);const decision=events[0].event_payload.operatingResponsibilityDecision;
   assert.equal(decision.actor,signedInActor);assert.equal(decision.from,'partner_managed');assert.equal(decision.to,'legalease_managed');assert.deepEqual(decision.externalRights,[]);
   assert.match(decision.basis,/fictional test organization/);
   const retry=await context.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/configuration`,{headers:{origin},data:saved.request});assert.equal(retry.status(),200);
  });
  await check('Authenticated Program Setup refuses a workspace with verified signatures and external authority and explains why',async()=>{
   const candidates=await checked(await db.from('partner_onboarding').select('id,partner_slug').eq('operating_model','partner_managed').not('status','in','(live,paused,closed)'));
   let target;
   for(const candidate of candidates){const rights=await checked(await db.rpc('rcap_program_external_rights_evidence',{p_workspace:candidate.id}));if(rights.some(r=>r.receiptId)){target=candidate;break;}}
   assert.ok(target,'existing isolated signed-agreement fixture required');
   const endpoint=`${origin}/api/internal/partners/onboarding/phase1/${target.partner_slug}/configuration`;
   const beforeResponse=await context.request.get(endpoint);const targetBefore=(await beforeResponse.json()).configuration;
   const agreementsBefore=await checked(await db.from('partner_onboarding_agreements').select('*').eq('workspace_id',target.id).order('id'));
   const other=await context.newPage();other.setDefaultTimeout(60000);
   try{
    await other.goto(`${origin}/internal/partners/onboarding/${target.partner_slug}`);
    await other.getByLabel('Program operator',{exact:true}).selectOption('legalease_managed');
    const pending=other.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/configuration'));
    await other.getByRole('button',{name:'Save program',exact:true}).click();const refusal=await pending,body=await refusal.json();
    assert.equal(refusal.status(),403,JSON.stringify(body));assert.match(body.error,/Operating responsibility was not changed/);assert.match(body.error,/agreement evidence/);
    await other.getByRole('status').filter({hasText:'Operating responsibility was not changed'}).waitFor();
    const afterResponse=await context.request.get(endpoint);assert.deepEqual((await afterResponse.json()).configuration,targetBefore);
    assert.deepEqual(await checked(await db.from('partner_onboarding_agreements').select('*').eq('workspace_id',target.id).order('id')),agreementsBefore);
   }finally{await other.close();await page.bringToFront();await page.reload();}
  });
  let prepared;
  await check('Converted program generates current materials and displays the actual preview without partner review',async()=>{
   const result=await clickMutation(/^(Generate|Update) Materials$/,'/program');assert.equal(result.status,200,JSON.stringify(result.body));prepared=result.body.operations;
   assert.equal(prepared.view.materials.length,2);assert.equal(prepared.canStart,true,JSON.stringify(prepared.launchDecision));
   await page.locator('[aria-label="Current program preview"]').waitFor();
   assert.equal(prepared.launchDecision.operatingModel,'legalease_managed');
   assert.ok(prepared.launchDecision.requirements.find(r=>r.key==='agreements_and_procurement_recorded').effective);
   assert.ok(prepared.launchDecision.requirements.find(r=>r.key==='partner_launch_approval_received').effective);
  });
  await check('One Platform Admin confirmation launches through the real protected pathway with no packet funding',async()=>{
   await page.getByLabel('Confirm operating scope and current materials',{exact:true}).check();
   const result=await clickMutation('Start Program','/program');assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.operations.view.decision.live,true);
   const workspace=await checked(await db.from('partner_onboarding').select('status,operating_model,rcap_launch_operation_id').eq('id',workspaceId).single());assert.equal(workspace.status,'live');
   const receipts=await checked(await db.from('rcap_launch_operation_events').select('step').eq('operation_id',workspace.rcap_launch_operation_id).order('created_at'));
   assert.deepEqual(receipts.map(r=>r.step),['prepared','publication_staged','public_verified','complete']);
   const after=await protectedState();const approvals=after.partner_onboarding_launch_approvals;
   assert.equal(approvals.length,protectedBefore.partner_onboarding_launch_approvals.length+1);assert.equal(approvals.at(0).approval_type,'legalease_final_review');
   delete after.partner_onboarding_launch_approvals;const expected={...protectedBefore};delete expected.partner_onboarding_launch_approvals;
   // Publication updates onboarding presentation timestamps, never money or entitlement.
   for(const key of ['onboarding_status','onboarding_completed_at','updated_at']){delete after.record[key];delete expected.record[key];}
   assert.deepEqual(after,expected);
   assert.equal(result.body.operations.view.capabilities.issue_sponsored_packet,false);
   fs.writeFileSync(`${out}/launch.json`,JSON.stringify({workspace,receipts,decision:result.body.operations.view.decision},null,2));
  });
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/converted-program.png`,fullPage:true});
  fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({results,errors,fixture},null,2));
 }
}catch(error){await page.screenshot({path:`${out}/failure-${Date.now()}.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser.close();}
