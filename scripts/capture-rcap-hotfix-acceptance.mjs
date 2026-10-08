// Real Next.js routes and loopback GoTrue/PostgREST only. No Production target.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {chromium,webkit} from 'playwright';
import {artifactSourceFixture} from './lib/rcap-onboarding-artifact-fixture.mjs';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const origin=process.env.RCAP_ACCEPTANCE_BASE_URL ?? 'http://127.0.0.1:3100';
const backend=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const url of [origin,backend]) assert.ok(url && new URL(url).hostname==='127.0.0.1','Loopback-only acceptance');
const db=createClient(backend,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {provisionPartner}=await import('../src/lib/partners/partner-provisioning-service.ts');
const out=process.env.RCAP_HOTFIX_CAPTURE_DIR ?? '/workspaces/training-modules-09-10/output/rcap-hotfix-evidence-20261008';
fs.mkdirSync(out,{recursive:true});
const run=Date.now().toString(36),password=`Synthetic-${randomBytes(12).toString('hex')}!7`;
const registerResults=[],shots=[];
async function check(name,fn){await fn();registerResults.push({name,status:'PASS'});console.log('PASS',name);}
async function newUser(label){const result=await db.auth.admin.createUser({email:`${label}-${run}@example.test`,password,email_confirm:true});assert.equal(result.error,null);return result.data.user;}
const operator=await newUser('operator'),partner=await newUser('partner'),other=await newUser('other');
assert.equal((await db.from('partner_users').insert({auth_user_id:operator.id,partner_slug:null,role:'internal_admin',status:'active'})).error,null);
const slug=`rcap-self-${run}`,managedSlug=`rcap-managed-${run}`,otherSlug=`rcap-other-${run}`;
const values=target=>({organizationName:`Synthetic ${target}`,legalOrganizationName:`Synthetic ${target} LLC`,partnerSlug:target,programName:'Synthetic community program',programPurpose:'Isolated RCAP hotfix acceptance fixture.',administratorName:'Synthetic Administrator',administratorEmail:partner.email,clearanceReason:'Authorized isolated acceptance fixture; no real invitation or launch.',idempotencyKey:randomUUID()});
for(const target of [slug,otherSlug]) await provisionPartner({operatorUserId:operator.id,values:values(target)});
assert.equal((await db.from('partner_users').insert([{auth_user_id:partner.id,partner_slug:slug,role:'partner_admin',status:'active'},{auth_user_id:other.id,partner_slug:otherSlug,role:'partner_admin',status:'active'}])).error,null);
// Preserve one explicit policy hold. A commercial override is not a payment.
assert.equal((await db.from('partner_onboarding').update({status:'setup_in_progress',commercial_gate_status:'cleared_by_authorized_internal_override',commercial_gate_override_reason:'Synthetic fixture of existing authorized internal clearance; never proof of payment.',commercial_gate_changed_by:operator.id,commercial_gate_changed_at:new Date().toISOString()}).eq('partner_slug',slug)).error,null);
// This publication fixture is pre-seeded for rendering parity. It is not a successful launch operation.
const publicSlug=`rcap-public-${run}`,publicReviewer=await newUser('public-reviewer');
await provisionPartner({operatorUserId:operator.id,values:values(publicSlug)});
assert.equal((await db.from('partner_users').insert({auth_user_id:publicReviewer.id,partner_slug:publicSlug,role:'partner_admin',status:'active'})).error,null);
const fixture=artifactSourceFixture();
fixture.data.organization_contacts.public_organization_name='Synthetic Multi-state Community Partner';
fixture.data.organization_contacts.public_program_name='Synthetic Fresh Start';
fixture.data.geography_audience_language_accessibility.jurisdictions=['MS','MD','DC'];
fixture.data.geography_audience_language_accessibility.service_area_description='Mississippi, Maryland, and the District of Columbia';
fixture.data.brand_public_page.program_headline='A clear path to your next opportunity';
assert.equal((await db.from('partner_records').update({payment_status:'demo_paid',qualification_status:'qualified',provisioning_status:'active',access_mode:fixture.data.access_sponsorship_capacity.participant_access_model}).eq('partner_slug',publicSlug)).error,null);
assert.equal((await db.from('partner_onboarding').update({status:'live',commercial_gate_status:'cleared_by_paid_invoice',commercial_gate_evidence_reference:'SYNTHETIC-ONLY',commercial_gate_changed_by:operator.id,commercial_gate_changed_at:new Date().toISOString(),show_partner_logo:false,support_instructions:'Contact your own program for participant help. LegalEase provides technical self-help support.',landing_page_ready:true,internal_approved_at:new Date().toISOString(),launched_at:new Date().toISOString()}).eq('partner_slug',publicSlug)).error,null);
const workspace=(await db.from('partner_onboarding').select('id').eq('partner_slug',publicSlug).single()).data;
const fixtureSql = Object.entries(fixture.data).map(([key,data])=>`update public.partner_onboarding_sections set revision=revision+1,response_data='${JSON.stringify(data).replaceAll("'","''")}'::jsonb where workspace_id='${workspace.id}' and section_key='${key}';`).join('\n');
execFileSync('docker',['exec','-i','rcap-master-hotfix-synthetic-20261008-db-1','psql','-h','127.0.0.1','-p','55432','-U','postgres','-d','rcap','-v','ON_ERROR_STOP=1'],{input:fixtureSql,stdio:['pipe','pipe','pipe']});
const {generateArtifactVersion,reviewArtifactVersion,getInternalArtifactBoard}=await import('../src/lib/partners/onboarding/artifact-service.ts');
const originalFetch=globalThis.fetch;globalThis.fetch=async (...args)=>{const result=await originalFetch(...args);if(result.status>=400 && String(args[0]).includes('/rpc/'))console.log('Synthetic RPC failure',result.status,await result.clone().text());return result;};
await getInternalArtifactBoard({role:'internal_admin',authUserId:operator.id,partnerSlug:publicSlug});
const generated=await generateArtifactVersion({role:'internal_admin',authUserId:operator.id,partnerSlug:publicSlug},{artifactType:'co_branded_page_configuration',requestId:randomUUID()});
for(const [role,authUserId,reviewerType] of [['internal_admin',operator.id,'legalease'],['partner_admin',publicReviewer.id,'partner']])await reviewArtifactVersion({role,authUserId,partnerSlug:publicSlug},{reviewerType,artifactVersionId:generated.versionId,decision:'approve',comments:'Synthetic local rendering acceptance receipt.',requestId:randomUUID()});
async function signIn(page,user,next){await page.goto(`${origin}/sign-in?next=${encodeURIComponent(next)}`);await page.locator('input[type=email]').fill(user.email);await page.locator('input[type=password]').fill(password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(url=>!url.pathname.startsWith('/sign-in'),{timeout:45000});}
async function shot(page,name){const file=`${name}.png`;await page.screenshot({path:path.join(out,file),fullPage:true});shots.push({file,url:page.url(),viewport:page.viewportSize(),capturedAt:new Date().toISOString()});}
try {
 for(const [browserName,browserType] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await browserType.launch({headless:true});
  try {
   const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();
   page.setDefaultTimeout(30000);
   await check(`${browserName}: real internal sign-in reaches Command Center`,async()=>{await signIn(page,operator,'/internal');await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor();assert.equal(await page.locator('nav[aria-label="Command Center destinations"] a').count(),8);await shot(page,`${browserName}-command-center-desktop`);});
   await check(`${browserName}: managed create/resume uses existing atomic provisioner`,async()=>{
    if(browserName==='chromium'){
     await page.getByRole('heading',{name:'RCAP Partner Launch Studio'}).click();await page.getByRole('link',{name:'Create partner',exact:true}).click();
     await page.getByRole('button',{name:'Review what will be created'}).click();assert.ok(await page.getByRole('alert').count()>0,'visible required-input error');
     for(const [key,value] of Object.entries(values(managedSlug)).filter(([key])=>key!=='idempotencyKey'))await page.locator(`[name="${key}"]`).fill(value);
     await page.getByRole('button',{name:'Review what will be created'}).click();await page.getByRole('button',{name:'Provision partner',exact:true}).click();await page.getByRole('button',{name:'Continue to program setup'}).click();
    }else await page.goto(`${origin}/internal/partners/onboarding/${managedSlug}`);
    await page.getByRole('heading',{name:'Prepare your partner program',exact:true}).waitFor();await shot(page,`${browserName}-managed-studio-desktop`);
    const launch=await ctx.request.post(`${origin}/api/internal/partners/onboarding/phase1/${managedSlug}/launch`,{headers:{origin},data:{requestId:randomUUID()}});assert.equal(launch.status(),404);assert.equal((await launch.json()).code,'feature_disabled');
    for(const action of ['mark_payment_complete','activate_partner'])assert.equal((await ctx.request.post(`${origin}/api/internal/partners/admin-action`,{headers:{origin},data:{partnerSlug:managedSlug,action}})).status(),403);
    assert.equal((await ctx.request.post(`${origin}/api/internal/partners/onboarding/${managedSlug}`,{headers:{origin},data:{action:'go_live',payload:{}}})).status(),410);
    const state=await db.from('partner_records').select('payment_status,provisioning_status').eq('partner_slug',managedSlug).single();assert.equal(state.data.payment_status,'unpaid');assert.equal(state.data.provisioning_status,'blocked_payment_required');
   });
   await check(`${browserName}: private approved co-brand preview uses own multi-state configuration`,async()=>{await page.goto(`${origin}/internal/partners/onboarding/${publicSlug}#launch-prep-area-co_branded_page`);await page.locator('[data-preview-variant=desktop]').getByText('A clear path to your next opportunity',{exact:true}).waitFor();await shot(page,`${browserName}-co-brand-preview-desktop-en`);await page.setViewportSize({width:390,height:844});await shot(page,`${browserName}-co-brand-preview-mobile-en`);await page.setViewportSize({width:1440,height:1000});});
   await page.goto(`${origin}/internal/partners/admin/${slug}`);await shot(page,`${browserName}-existing-admin-desktop`);assert.equal(await page.getByRole('button',{name:/mark payment complete|activate partner/i}).count(),0);
   await ctx.close();
   const partnerCtx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),partnerPage=await partnerCtx.newPage();partnerPage.setDefaultTimeout(30000);partnerPage.on('response',async response=>{if(response.url().includes('/api/partners/onboarding/sections/') && response.status()>=400)console.log('Save denial',response.status(),await response.text());});
   await check(`${browserName}: self-service sign-in, focused task, real save and resume`,async()=>{
    await signIn(partnerPage,partner,'/partner/onboarding/organization_contacts?step=public-identity');await partnerPage.locator('[data-guided-field="public_program_name"] input').fill(`Synthetic saved program ${browserName}`);
    for(const [field,value] of Object.entries({public_organization_name:'Synthetic Community Partner',website:'https://synthetic.example.test',main_phone:'202-555-0101',partner_slug_preference:slug}))await partnerPage.locator(`[data-guided-field="${field}"] input`).fill(value);
    await partnerPage.getByRole('button',{name:'Save and Continue',exact:true}).click();await partnerPage.waitForURL(url=>url.searchParams.get('step')!=='public-identity',{timeout:15000}).catch(async error=>{await shot(partnerPage,`${browserName}-self-service-save-failure`);throw new Error(`${error.message}\n${await partnerPage.locator('body').innerText()}`);});
    await partnerPage.goto(`${origin}/partner/onboarding/organization_contacts?step=public-identity`);assert.equal(await partnerPage.locator('[data-guided-field="public_program_name"] input').inputValue(),`Synthetic saved program ${browserName}`);await shot(partnerPage,`${browserName}-self-service-desktop-en`);
   });
   await check(`${browserName}: role and tenant denials use actual application APIs`,async()=>{
    const denied=await partnerCtx.request.get(`${origin}/api/internal/partners/onboarding/phase1/${otherSlug}/artifacts`);assert.equal(denied.status(),403);
    for(const kind of ['weekly','final'])assert.equal((await partnerCtx.request.post(`${origin}/api/partner-reports/${kind}`,{data:{partnerId:otherSlug}})).status(),403);
    assert.equal((await partnerCtx.request.get(`${origin}/p/${slug}`)).status(),404);
    await partnerPage.goto(`${origin}/internal`);assert.ok((await partnerPage.locator('body').innerText()).includes('Internal admin access denied'));
   });
   await check(`${browserName}: mobile Spanish navigation, keyboard focus and 200 percent scale`,async()=>{
    await partnerPage.setViewportSize({width:390,height:844});await partnerPage.goto(`${origin}/partner/onboarding/organization_contacts?step=public-identity`);
    await partnerPage.getByRole('button',{name:'Español',exact:true}).click();await partnerPage.getByRole('link',{name:'Inicio',exact:true}).waitFor();await shot(partnerPage,`${browserName}-self-service-mobile-es`);await partnerPage.setViewportSize({width:1440,height:1000});await shot(partnerPage,`${browserName}-self-service-desktop-es`);await partnerPage.setViewportSize({width:390,height:844});
    await partnerPage.keyboard.press('Tab');assert.ok(await partnerPage.evaluate(()=>document.activeElement!==document.body));assert.ok(await partnerPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await partnerPage.addStyleTag({content:'html {font-size:200%}'});await shot(partnerPage,`${browserName}-self-service-mobile-es-200-percent`);
   });
   await partnerCtx.close();
   const anon=await browser.newContext({viewport:{width:1440,height:1000}}),publicPage=await anon.newPage();
   await check(`${browserName}: approved synthetic public page matches preview and preserves geography`,async()=>{const response=await publicPage.goto(`${origin}/p/${publicSlug}`);assert.equal(response.status(),200);await publicPage.getByText('A clear path to your next opportunity',{exact:true}).waitFor();assert.ok((await publicPage.locator('body').innerText()).includes('Mississippi, Maryland, and the District of Columbia'));await shot(publicPage,`${browserName}-co-brand-public-desktop-en`);await publicPage.setViewportSize({width:390,height:844});await shot(publicPage,`${browserName}-co-brand-public-mobile-en`);await publicPage.getByRole('button',{name:'Español',exact:true}).click();await publicPage.getByRole('heading',{name:'Pasos claros para continuar'}).waitFor();await shot(publicPage,`${browserName}-co-brand-public-mobile-es`);await publicPage.setViewportSize({width:1440,height:1000});await shot(publicPage,`${browserName}-co-brand-public-desktop-es`);await publicPage.getByRole('button',{name:'English',exact:true}).click();assert.ok(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));});
   await check(`${browserName}: existing We Must Vote benchmark stays reachable`,async()=>{await publicPage.goto(`${origin}/wemustvote-landing.html`);await shot(publicPage,`${browserName}-we-must-vote-desktop`);await publicPage.setViewportSize({width:390,height:844});await shot(publicPage,`${browserName}-we-must-vote-mobile`);});
   const icon=await anon.request.get(`${origin}/favicon.ico`,{headers:{host:'legaleasepartner.com'}});assert.equal(createHash('sha256').update(await icon.body()).digest('hex'),createHash('sha256').update(fs.readFileSync('public/expungement-ai/favicon.ico')).digest('hex'));registerResults.push({name:`${browserName}: partner-host favicon exact bytes`,status:'PASS'});
   await anon.close();
  }finally{await browser.close();}
 }
} catch(error){registerResults.push({name:'Browser acceptance interrupted',status:'FAIL',reason:error.stack});throw error;}
finally{fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHasUncommittedChanges:execFileSync('git',['diff','HEAD','--name-only'],{encoding:'utf8'}).trim().length>0,run,shots,results:registerResults,limits:['No synthetic launch success: operation remains held.','Publication fixture is pre-seeded demo_paid data, not launch success; uploaded private asset integration and full EN/ES form translation remain unverified.','No new PSM session/RLS grants; policy fixture tests only.']},null,2));}
