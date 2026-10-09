// Actual hydrated Admin journey against disposable loopback Auth/Storage/Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {register} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const origin='http://localhost:3100';
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,'127.0.0.1');
assert.notEqual(process.env.VERCEL_ENV,'production');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {provisionPartner}=await import('../src/lib/partners/partner-provisioning-service.ts');
const {LAUNCH_CHECK_DEFINITIONS}=await import('../src/lib/partners/onboarding/launch-readiness.ts');
const {generateArtifactVersion}=await import('../src/lib/partners/onboarding/artifact-service.ts');
const {getInternalLaunchReadiness}=await import('../src/lib/partners/onboarding/launch-readiness-service.ts');
const run=Date.now().toString(36),slug=`fsn-agreement-${run}`,otherSlug=`agreement-other-${run}`,password=`Synthetic-${randomBytes(12).toString('hex')}!7`,results=[];
const output=process.env.RCAP_AGREEMENT_EVIDENCE_DIR??'/tmp/rcap256-browser';fs.mkdirSync(output,{recursive:true});
async function ok(result){assert.equal(result.error,null,JSON.stringify(result.error));return result.data;}
async function user(prefix){const x=await ok(await db.auth.admin.createUser({email:`${prefix}-${run}@example.test`,password,email_confirm:true}));return x.user;}
const admin=await user('agreement-admin'),foreign=await user('agreement-foreign');
await ok(await db.from('partner_users').insert({auth_user_id:admin.id,partner_slug:null,role:'internal_admin',status:'active'}));
for(const partnerSlug of [slug,otherSlug])await provisionPartner({operatorUserId:admin.id,values:{partnerSlug,organizationName:partnerSlug===slug?'Fresh Start Network regression fixture':'Other isolated partner',legalOrganizationName:'Disposable acceptance only LLC',programName:'Agreement regression fixture',programPurpose:'Non-production Fresh Start conflicting-state regression.',administratorName:'Synthetic Admin',administratorEmail:admin.email,clearanceReason:'Owner-authorized isolated regression fixture; no real funding or launch.',idempotencyKey:randomUUID()}});
await ok(await db.from('partner_users').insert({auth_user_id:foreign.id,partner_slug:otherSlug,role:'partner_admin',status:'active'}));
const partner=await ok(await db.from('partner_records').select('id,payment_status,provisioning_status').eq('partner_slug',slug).single());
let workspace=await ok(await db.from('partner_onboarding').select('*').eq('partner_slug',slug).single());
await ok(await db.from('partner_onboarding').update({commercial_gate_status:'cleared_by_authorized_internal_override',commercial_gate_override_reason:'Existing local override fixture only; not execution or funding evidence.',status:'setup_in_progress'}).eq('id',workspace.id));
const originalId=randomUUID(),originalPath=`partners/${partner.id}/onboarding/${workspace.id}/procurement_document/${originalId}.pdf`;
const draft=await PDFDocument.create();draft.addPage().drawText('SYNTHETIC APPROVED ORDER FORM - NOT EXECUTED');const originalBytes=Buffer.from(await draft.save());
await ok(await db.storage.from('rcap-partner-onboarding-private').upload(originalPath,originalBytes,{contentType:'application/pdf'}));
await ok(await db.from('partner_onboarding_assets').insert({id:originalId,workspace_id:workspace.id,partner_record_id:partner.id,category:'procurement_document',object_path:originalPath,original_filename:'approved-order-form.pdf',safe_filename:'approved-order-form.pdf',media_type:'application/pdf',file_extension:'pdf',byte_size:originalBytes.length,sha256_hex:createHash('sha256').update(originalBytes).digest('hex'),lifecycle_status:'active',review_status:'approved',uploaded_by:admin.id}));
await ok(await db.from('partner_onboarding_agreements').insert([{workspace_id:workspace.id,agreement_type:'order_form',status:'approved',is_required:true,finalized_asset_id:originalId,partner_safe_detail:'Approved terms; execution not yet verified',recorded_by:admin.id,recorded_at:new Date().toISOString()},{workspace_id:workspace.id,agreement_type:'master_services_agreement',status:'not_required',is_required:false,recorded_by:admin.id,recorded_at:new Date().toISOString()}]));
for(const key of ['staff_training_completed','communications_approved','legalease_final_review_complete','partner_launch_approval_received']){const def=LAUNCH_CHECK_DEFINITIONS.find(x=>x.key===key);await ok(await db.from('partner_onboarding_launch_checks').insert({workspace_id:workspace.id,partner_record_id:partner.id,check_key:key,category:def.category,owner_type:def.owner,determination:def.determination,blocking:def.blocking,status:'passing',evidence_summary:'Independent isolated fixture evidence retained',checked_at:new Date().toISOString(),checked_by:admin.id,request_id:randomUUID()}));}
const context={role:'internal_admin',authUserId:admin.id,partnerSlug:slug};
const foreignBefore=await ok(await db.from('partner_onboarding').select('*').eq('partner_slug',otherSlug).single());
await getInternalLaunchReadiness(context);
const generated=await generateArtifactVersion(context,{artifactType:'implementation_brief',requestId:randomUUID()});
await ok(await db.from('partner_onboarding_artifact_versions').update({approval_status:'approved'}).eq('id',generated.versionId));
const initial=await getInternalLaunchReadiness(context);assert.equal(initial.readiness.checks.find(c=>c.key==='agreements_and_procurement_recorded').status,'failing');
const browser=await chromium.launch({headless:true}),ctx=await browser.newContext();
async function check(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
async function signIn(page,u,next){await page.goto(`${origin}/sign-in?next=${encodeURIComponent(next)}`);await page.waitForFunction(()=>{const f=document.querySelector('form');return f&&Object.keys(f).some(k=>k.startsWith('__reactProps$')&&typeof f[k]?.onSubmit==='function');});await page.locator('input[type=email]').fill(u.email);await page.locator('input[type=password]').fill(password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>!u.pathname.startsWith('/sign-in'),{timeout:60000});}
const page=await ctx.newPage(),path=`/internal/partners/onboarding/${slug}`;
try{
await check('verified Platform Admin login and Fresh Start conflicting-state blocker',async()=>{await signIn(page,admin,path);await page.getByRole('tab',{name:'Review & launch',exact:true}).click();await page.getByRole('link',{name:'Review program funding and terms',exact:true}).first().waitFor();assert.equal((await ok(await db.from('partner_onboarding').select('agreement_status').eq('id',workspace.id).single())).agreement_status,'not_sent');});
await check('top Review & launch navigation scrolls to the mounted panel',async()=>{
 await page.goto(`${origin}${path}`);
 const nav=page.getByRole('navigation',{name:'Launch Studio tasks'});
 await nav.getByRole('link',{name:'Review & launch',exact:true}).click();
 await page.waitForFunction(()=>{
  const anchor=document.getElementById('launch-prep-area-launch_readiness');
  const tab=document.getElementById('launch-prep-tab-launch_readiness');
  const panel=document.getElementById('launch-prep-panel-launch_readiness');
  return !!anchor && !!panel && tab?.getAttribute('aria-selected')==='true'
    && anchor.getBoundingClientRect().top>=0 && anchor.getBoundingClientRect().top<200;
 });
 assert.equal(await page.getByRole('tab',{name:'Review & launch',exact:true}).getAttribute('aria-selected'),'true');
 await page.reload();
 await page.waitForFunction(()=>{
  const tab=document.getElementById('launch-prep-tab-launch_readiness');
  return tab?.getAttribute('aria-selected')==='true'
    && !!document.getElementById('launch-prep-panel-launch_readiness');
 });
});
const card=page.locator('#internal-operation-agreement');
await check('first blocker click expands, scrolls and focuses the actual agreement control',async()=>{await page.getByRole('link',{name:'Review program funding and terms',exact:true}).first().click();await card.waitFor({state:'visible'});await page.waitForFunction(()=>Boolean(document.activeElement?.closest('#internal-operation-agreement')));assert.equal(await page.locator('#setup-review').evaluate(d=>d.open),true);assert.equal(await card.getByLabel(/^Status/).inputValue(),'approved');await page.screenshot({path:`${output}/agreement-open.png`,fullPage:true});});
await check('same-hash repeat, refresh and direct URL reveal the editable control',async()=>{await page.getByRole('tab',{name:'Review & launch',exact:true}).click();await page.locator('#setup-review').evaluate(d=>d.open=false);await page.getByRole('link',{name:'Review program funding and terms',exact:true}).first().click();await card.waitFor({state:'visible'});await page.waitForURL(u=>u.hash==='#internal-operation-agreement');await page.reload();await card.waitFor({state:'visible'});await page.waitForFunction(()=>Boolean(document.activeElement?.closest('#internal-operation-agreement')));await page.goto(origin+path+'#internal-operation-agreement');await card.waitFor({state:'visible'});});
const executed=await PDFDocument.create();const sheet=executed.addPage();sheet.drawText('DISPOSABLE EXECUTED AGREEMENT - NO REAL PARTNER');sheet.drawText('Synthetic partner execution: Test Partner',{x:30,y:650});sheet.drawText('Synthetic LegalEase execution: Test Admin',{x:30,y:620});const signedBytes=Buffer.from(await executed.save());
await check('authorized Admin records actual inspected private executed-copy evidence',async()=>{await card.getByLabel(/^Status/).selectOption('executed');await page.locator('#signed-agreement-file').setInputFiles({name:'executed-fixture.pdf',mimeType:'application/pdf',buffer:signedBytes});await card.getByLabel(/^Effective date/).fill('2026-10-01');await card.getByLabel('Reviewer evidence note').fill('Inspected both synthetic executed signatures and correct fixture partner identity.');await card.getByRole('checkbox',{name:/I personally inspected/}).check();await page.route('**/signed-agreement',async route=>{const committed=await route.fetch();assert.equal(committed.status(),200,await committed.text());await route.abort('failed');});
await card.getByRole('button',{name:'Record verified signed agreement'}).click();
await card.getByText('Confirmation was interrupted. Retry the unchanged form to reuse its request ID.').waitFor();
await page.unroute('**/signed-agreement');
const committedReceipt=await ok(await db.from('rcap_signed_agreement_receipts').select('asset_id').eq('workspace_id',workspace.id).single());
const committedAsset=await ok(await db.from('partner_onboarding_assets').select('object_path').eq('id',committedReceipt.asset_id).single());
await ok(await db.storage.from('rcap-partner-onboarding-private').download(committedAsset.object_path));
const responsePromise=page.waitForResponse(r=>r.url().endsWith('/signed-agreement')&&r.request().method()==='POST');await card.getByRole('button',{name:'Record verified signed agreement'}).click();const response=await responsePromise;const responseBody=await response.json();assert.equal(response.status(),200,JSON.stringify(responseBody));assert.equal(responseBody.duplicate,true);await card.getByText('Executed signed agreement recorded with immutable document evidence.').waitFor();});
await check('refresh aligns canonical state, readiness and real-launch preflight',async()=>{await page.reload();workspace=await ok(await db.from('partner_onboarding').select('*').eq('id',workspace.id).single());assert.equal(workspace.agreement_status,'signed');const agreement=await ok(await db.from('partner_onboarding_agreements').select('*').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());assert.equal(agreement.status,'executed');assert.equal(agreement.partner_safe_detail,'Executed agreement verified by LegalEase');assert(agreement.signed_receipt_id);const readiness=await getInternalLaunchReadiness(context);assert.equal(readiness.readiness.checks.find(c=>c.key==='agreements_and_procurement_recorded').status,'passing');const response=await ctx.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/launch`);assert.equal(response.status(),200);const pre=(await response.json()).preflight;assert.equal(pre.realAuthorityRequirements.find(x=>x.label==='Reviewed executed signed agreement').passing,true);assert.equal(pre.commercialValid,false);assert.equal(pre.canLaunch,false);await page.screenshot({path:`${output}/agreement-persisted.png`,fullPage:true});});
await check('original evidence, unrelated checks and other tenant remain intact',async()=>{const original=await ok(await db.from('partner_onboarding_assets').select('lifecycle_status,object_path').eq('id',originalId).single());assert.equal(original.lifecycle_status,'superseded');await ok(await db.storage.from('rcap-partner-onboarding-private').download(original.object_path));const receipt=await ok(await db.from('rcap_signed_agreement_receipts').select('*').eq('workspace_id',workspace.id).single());assert.equal(receipt.previous_agreement.status,'approved');assert.equal(receipt.previous_agreement.finalized_asset_id,originalId);const checks=await ok(await db.from('partner_onboarding_launch_checks').select('check_key,invalidated_at').eq('workspace_id',workspace.id));for(const key of ['staff_training_completed','communications_approved'])assert.equal(checks.find(x=>x.check_key===key).invalidated_at,null);for(const key of ['legalease_final_review_complete','partner_launch_approval_received'])assert(checks.find(x=>x.check_key===key).invalidated_at);assert.deepEqual(await ok(await db.from('partner_onboarding').select('*').eq('partner_slug',otherSlug).single()),foreignBefore);assert.equal((await ok(await db.from('partner_records').select('payment_status').eq('id',partner.id).single())).payment_status,partner.payment_status);});
await check('missing evidence and another tenant cannot record execution',async()=>{const response=await ctx.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/signed-agreement`,{headers:{origin},multipart:{requestId:randomUUID(),expectedWorkspaceVersion:String(workspace.aggregate_version),agreementType:'order_form',effectiveDate:'2026-10-01',reviewReason:'No actual document provided',confirmed:'true'}});assert.equal(response.status(),400);const foreignCtx=await browser.newContext();const foreignPage=await foreignCtx.newPage();await signIn(foreignPage,foreign,'/partner/onboarding');assert.equal(await foreignPage.getByText('Program setup is not available for this account.',{exact:false}).count(),0,'existing partner portal must still load');assert.equal((await foreignCtx.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/signed-agreement`,{headers:{origin},multipart:{requestId:randomUUID()}})).status(),403);const leaked=await foreignCtx.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}`);assert.equal(leaked.status(),403);await foreignCtx.close();});
await check('related commercial blocker reveals the current editable authority control',async()=>{
 await page.goto(`${origin}${path}#launch-commercial-authority`);
 const authorityControl=page.locator('#launch-commercial-authority');
 await authorityControl.locator('select').first().waitFor();
 assert.equal(await authorityControl.evaluate(x=>x.open),true);
 await page.waitForFunction(()=>Boolean(document.activeElement?.closest('#launch-commercial-authority')));
 assert.equal(await authorityControl.getByRole('button',{name:'Record documented commercial authority'}).isDisabled(),true);
});
await check('existing private execution copy is reread without resetting unchanged approvals',async()=>{
 const agreement=await ok(await db.from('partner_onboarding_agreements').select('*').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());
 await ok(await db.from('partner_onboarding_launch_checks').update({invalidated_at:null,invalidated_reason:null}).eq('workspace_id',workspace.id).in('check_key',['legalease_final_review_complete','partner_launch_approval_received']));
 const requestId=randomUUID();
 const response=await ctx.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/signed-agreement`,{headers:{origin},multipart:{requestId,expectedWorkspaceVersion:String(workspace.aggregate_version),agreementType:'order_form',effectiveDate:'2026-10-01',existingAssetId:agreement.finalized_asset_id,reviewReason:'Reinspected the same synthetic executed private copy; contractual contents unchanged.',confirmed:'true'}});
 assert.equal(response.status(),200,await response.text());
 const current=await ok(await db.from('partner_onboarding_agreements').select('signed_receipt_id').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());
 assert.equal(current.signed_receipt_id,requestId);
 const checks=await ok(await db.from('partner_onboarding_launch_checks').select('check_key,invalidated_at').eq('workspace_id',workspace.id));
 for(const key of ['legalease_final_review_complete','partner_launch_approval_received','staff_training_completed','communications_approved'])assert.equal(checks.find(x=>x.check_key===key).invalidated_at,null);
 assert.equal((await ok(await db.from('rcap_signed_agreement_receipts').select('id').eq('workspace_id',workspace.id))).length,2);
});
await check('withdrawn private custody blocks readiness and preflight with unchanged legacy signed state',async()=>{
 const agreement=await ok(await db.from('partner_onboarding_agreements').select('finalized_asset_id').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());
 const asset=await ok(await db.from('partner_onboarding_assets').select('object_path').eq('id',agreement.finalized_asset_id).single());
 await ok(await db.storage.from('rcap-partner-onboarding-private').remove([asset.object_path]));
 const readiness=await getInternalLaunchReadiness(context);
 assert.equal(readiness.readiness.checks.find(c=>c.key==='agreements_and_procurement_recorded').status,'failing');
 assert.equal((await ok(await db.rpc('rcap_agreement_clearance',{p_workspace:workspace.id}))),false);
 const response=await ctx.request.get(`${origin}/api/internal/partners/onboarding/phase1/${slug}/launch`);
 assert.equal(response.status(),200);const pre=(await response.json()).preflight;
 assert.equal(pre.realAuthorityRequirements.find(x=>x.label==='Reviewed executed signed agreement').passing,false);
 assert.equal(pre.canLaunch,false);
 assert.equal((await ok(await db.from('partner_onboarding').select('agreement_status').eq('id',workspace.id).single())).agreement_status,'signed');
 await ok(await db.storage.from('rcap-partner-onboarding-private').upload(asset.object_path,signedBytes,{contentType:'application/pdf',upsert:false}));
 assert.equal(await ok(await db.rpc('rcap_agreement_clearance',{p_workspace:workspace.id})),true);
});
await check('concurrent submissions commit one current version and retain its private document',async()=>{
 const current=await ok(await db.from('partner_onboarding').select('aggregate_version').eq('id',workspace.id).single());
 const submit=()=>ctx.request.post(`${origin}/api/internal/partners/onboarding/phase1/${slug}/signed-agreement`,{headers:{origin},multipart:{requestId:randomUUID(),expectedWorkspaceVersion:String(current.aggregate_version),agreementType:'order_form',effectiveDate:'2026-10-01',reviewReason:'Inspected current synthetic signed copy for concurrent submission regression.',confirmed:'true',file:{name:'executed-fixture.pdf',mimeType:'application/pdf',buffer:signedBytes}}});
 const responses=await Promise.all([submit(),submit()]);assert.deepEqual(responses.map(x=>x.status()).sort(),[200,409]);
 assert.equal((await ok(await db.from('partner_onboarding').select('aggregate_version').eq('id',workspace.id).single())).aggregate_version,current.aggregate_version+1);
 const agreement=await ok(await db.from('partner_onboarding_agreements').select('finalized_asset_id').eq('workspace_id',workspace.id).eq('agreement_type','order_form').single());
 const asset=await ok(await db.from('partner_onboarding_assets').select('object_path').eq('id',agreement.finalized_asset_id).single());
 await ok(await db.storage.from('rcap-partner-onboarding-private').download(asset.object_path));
 assert.equal(await ok(await db.rpc('rcap_agreement_clearance',{p_workspace:workspace.id})),true);
});
fs.writeFileSync(`${output}/results.json`,JSON.stringify({passed:true,fixture:'Fresh Start Network observed conflict, disposable loopback only',results,noRealPartnerLaunch:true,noProductionMutation:true},null,2));console.log(`${results.length} browser journey checks PASS`);
}finally{await browser.close();}
