// Real isolated authentication, persistence, artifacts and protected publication.
// Provider-only dependency is deterministic; genuine Vercel provider evidence is separate.
import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {chromium} from 'playwright';import {createClient} from '@supabase/supabase-js';
const out='artifacts/rcap-spanish-launch-recovery',fixture=JSON.parse(fs.readFileSync(`${out}/fixture.json`)),origin=process.env.RCAP_ACCEPTANCE_BASE_URL;
assert.equal(origin,'http://127.0.0.1:3100');assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');assert.notEqual(process.env.VERCEL_ENV,'production');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const access=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json'));
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(60000);
const endpoint=`${origin}/api/internal/partners/onboarding/phase1/${fixture.slug}`,results=process.env.RCAP_SPANISH_RESUME?JSON.parse(fs.readFileSync(`${out}/browser-results.json`)).results:[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const check=async(name,fn)=>{await fn();results.push({name,status:'PASS'});console.log('PASS',name);fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({provider:'dependency-injected deterministic provider; not live OpenAI',results,errors},null,2));};
const state=async()=>{const r=await context.request.get(`${endpoint}/program`);assert.equal(r.status(),200);return(await r.json()).operations;};
const config=async()=>{const r=await context.request.get(`${endpoint}/configuration`);assert.equal(r.status(),200);return(await r.json()).configuration;};
const rows=async(table)=>{const r=await db.from(table).select('*').eq('workspace_id',fixture.workspaceId).order('id');assert.equal(r.error,null);return r.data;};
const counts=async()=>{const r=await db.from('partner_onboarding_artifact_versions').select('artifact_id,id,version_number,rendered_content').eq('workspace_id',fixture.workspaceId);assert.equal(r.error,null);return r.data;};
const mutate=async(name,suffix='/program')=>{const [r]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(suffix)),page.getByRole('button',{name,exact:typeof name==='string'}).click()]);return{status:r.status(),body:await r.json(),request:r.request().postDataJSON()};};
const mode=value=>fs.writeFileSync(`${out}/provider-mode`,value);
try{
 await page.goto(`${origin}/sign-in?next=${encodeURIComponent(`/internal/partners/onboarding/${fixture.slug}`)}`);await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname===`/internal/partners/onboarding/${fixture.slug}`);
 if(process.env.RCAP_SPANISH_RESEED==='true') {
  const c=await config();assert.notEqual(c.status,'live');
  const seed=await context.request.post(`${endpoint}/configuration`,{headers:{origin},data:{requestId:randomUUID(),expectedVersion:c.version,patches:[{section:'geography_audience_language_accessibility',base:c.data.geography_audience_language_accessibility,values:{service_area_description:'Multi-State'}}]}});assert.equal(seed.status(),200);
  for(const artifactType of ['implementation_brief','co_branded_page_configuration']){const r=await context.request.post(`${endpoint}/artifacts`,{headers:{origin},data:{action:'generate',requestId:randomUUID(),payload:{artifactType}}});assert.equal(r.status(),200,await r.text());}
 }
 await page.reload();
 const baseline=await config(),english=Object.fromEntries(Object.entries(baseline.data.brand_public_page).filter(([k])=>!k.endsWith('_es')&&k!=='spanish_preparation'));const versionsBefore=await counts();const preserved={agreements:await rows('partner_onboarding_agreements'),authority:await rows('rcap_commercial_authorizations'),approvals:await rows('partner_onboarding_launch_approvals')};
 if(!process.env.RCAP_SPANISH_RESUME){
 await check('Fresh authenticated load exposes incomplete draft, current Summary, geographic discrepancy and Final Review without generation',async()=>{
  await page.getByRole('heading',{name:'Final Review & Start Program'}).waitFor();assert.match(await page.locator('main').first().textContent(),/Incomplete draft/);assert.match(await page.locator('#configure-program').textContent(),/Multi-State/);assert.equal((await counts()).length,versionsBefore.length);assert.equal(await page.getByLabel('Spanish headline',{exact:true}).count(),0);
 });
 await check('One explicit geography correction preserves selected CA and Save reports a real provider failure',async()=>{
  mode('unavailable');await page.getByRole('button',{name:'Use selected jurisdictions in description'}).click();const r=await mutate('Save program','/configuration');assert.equal(r.status,200);assert.match(r.body.preparationError,/Spanish preparation could not be completed/);assert.deepEqual(r.body.configuration.data.geography_audience_language_accessibility.jurisdictions,['CA']);assert.equal(r.body.configuration.data.geography_audience_language_accessibility.service_area_description,'California');assert.equal((await counts()).length,versionsBefore.length);await page.getByRole('heading',{name:'Final Review & Start Program'}).waitFor();
 });
 for(const failure of ['timeout','malformed'])await check(`Provider ${failure} is actionable and creates no incomplete versions`,async()=>{
  mode(failure);const before=await counts(),r=await mutate(/^(Retry )?Update Materials$/);assert.equal(r.status,503,JSON.stringify(r.body));assert.match(r.body.error,/Spanish preparation could not be completed/);assert.equal((await counts()).length,before.length);assert.equal(r.body.operations.canStart,false);assert.equal(await page.getByRole('button',{name:'Start Program',exact:true}).count(),0);
 });
 }
 let ready=await state();
 let materialIdentity=Object.fromEntries(ready.view.materials.map(m=>[m.type,{id:m.id,version:m.version}]));
 const identity=()=>Object.fromEntries(ready.view.materials.map(m=>[m.type,{id:m.id,version:m.version}]));
 if(process.env.RCAP_SPANISH_RESUME!=="headline"){
 await check('One Update Materials persists source-bound Spanish and produces a complete bilingual page',async()=>{
  mode('success');const r=await mutate(/^(Retry )?Update Materials$/);assert.equal(r.status,200,JSON.stringify(r.body));ready=r.body.operations;assert.equal(ready.view.materials.length,2);assert.equal(ready.canStart,true,JSON.stringify(ready.launchDecision));const c=await config();for(const [key,value]of Object.entries(english))assert.equal(c.data.brand_public_page[key],value);assert.equal(Object.keys(c.data.brand_public_page.spanish_preparation.copy).length,7);assert.ok(Object.values(c.data.brand_public_page.spanish_preparation.copy).every(Boolean));const participant=ready.view.materials.find(m=>m.type==='co_branded_page_configuration');assert.deepEqual(participant.document.pagePreview.missing,[]);assert.equal((await counts()).length,versionsBefore.length+2,'one necessary Summary for corrected geography and one complete Participant Page');
 });
 materialIdentity=identity();
 await check('Both direct View actions focus exact versions and English/Español previews are coherent',async()=>{
  for(const [label,id,type] of [['Program Summary','program-summary-preview','implementation_brief'],['Participant Page','participant-page-preview','co_branded_page_configuration']]){await page.getByRole('link',{name:`View ${label}`,exact:true}).click();await page.waitForFunction(id=>document.activeElement?.id===id,id);assert.equal(await page.locator(`#${id}`).getAttribute('data-material-id'),materialIdentity[type].id);}
  const preview=page.locator('#participant-page-preview');await preview.getByRole('button',{name:'Español',exact:true}).click();assert.match(await preview.textContent(),/Explore su próximo paso con Fictional Recovery/);assert.match(await preview.textContent(),/no garantiza la elegibilidad/);await preview.getByRole('button',{name:'English',exact:true}).click();assert.match(await preview.textContent(),/Explore your next step with Fictional Recovery/);
 });
 await check('Unchanged explicit preparation and fresh reload preserve versions without a provider call',async()=>{
  const before=await counts(),calls=fs.readFileSync(`${out}/provider-calls.jsonl`,'utf8');const current=await state();const r=await context.request.post(`${endpoint}/program`,{headers:{origin},data:{action:'prepare',version:current.view.version,requestId:randomUUID()}});assert.equal(r.status(),200,await r.text());assert.equal((await counts()).length,before.length);assert.equal(fs.readFileSync(`${out}/provider-calls.jsonl`,'utf8'),calls);await page.reload();await page.getByRole('link',{name:'View Program Summary',exact:true}).waitFor();await page.getByRole('link',{name:'View Participant Page',exact:true}).waitFor();assert.equal((await counts()).length,before.length);
 });
 }
 await check('Save one English page edit automatically updates only that translation and Participant Page',async()=>{
  await page.getByLabel('Program headline',{exact:true}).fill('Explore your next step with Fictional Recovery today');const before=await counts(),r=await mutate('Save program','/configuration');assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.preparationError,null);ready=r.body.operations;assert.equal(ready.view.materials.find(m=>m.type==='implementation_brief').id,materialIdentity.implementation_brief.id);assert.equal((await counts()).length,before.length+1);const calls=fs.readFileSync(`${out}/provider-calls.jsonl`,'utf8').trim().split('\n').map(JSON.parse);assert.deepEqual(calls.at(-1).keys,['headline']);assert.match((await config()).data.brand_public_page.program_headline_es,/hoy/);materialIdentity=identity();
 });
 await check('Disabling and re-enabling Spanish preserves reviewed copy without translating again',async()=>{
  const copy=(await config()).data.brand_public_page.spanish_preparation,calls=fs.readFileSync(`${out}/provider-calls.jsonl`,'utf8');for(const enabled of [false,true]){await page.getByLabel('Enable Spanish',{exact:true}).setChecked(enabled);const r=await mutate('Save program','/configuration');assert.equal(r.status,200);assert.equal(r.body.preparationError,null,JSON.stringify(r.body));assert.deepEqual(r.body.configuration.data.brand_public_page.spanish_preparation,copy);}assert.equal(fs.readFileSync(`${out}/provider-calls.jsonl`,'utf8'),calls);ready=await state();materialIdentity=identity();await page.reload();
 });
 await check('Existing agreements, approval history and financial authority remain intact before actual final confirmation',async()=>{assert.deepEqual(await rows('partner_onboarding_agreements'),preserved.agreements);assert.deepEqual(await rows('rcap_commercial_authorizations'),preserved.authority);assert.deepEqual(await rows('partner_onboarding_launch_approvals'),preserved.approvals);});
 let launched;
 await check('One real final confirmation starts the protected program and publication replay is idempotent',async()=>{
  await page.getByRole('heading',{name:'Final Review & Start Program'}).waitFor();await page.getByLabel('Confirm operating scope and current materials',{exact:true}).check();launched=await mutate('Start Program');assert.equal(launched.status,200,JSON.stringify(launched.body));assert.equal(launched.body.operations.view.decision.live,true);assert.equal(launched.body.operations.view.capabilities.issue_sponsored_packet,false);const receipt=await db.from('rcap_launch_operation_events').select('step').eq('workspace_id',fixture.workspaceId).order('created_at');assert.equal(receipt.error,null);assert.deepEqual(receipt.data.map(x=>x.step),['prepared','publication_staged','public_verified','complete']);const replay=await context.request.post(`${endpoint}/program`,{headers:{origin},data:launched.request});assert.equal(replay.status(),200,await replay.text());const after=await db.from('rcap_launch_operation_events').select('id').eq('workspace_id',fixture.workspaceId);assert.equal(after.data.length,4);await page.getByRole('heading',{name:'Program dashboard',exact:true}).waitFor();
 });
 await check('Published bilingual page and refresh retain the exact approved material identities',async()=>{
  const published=await context.newPage();try{await published.goto(`${origin}/p/${fixture.slug}`);await published.getByRole('button',{name:'Español',exact:true}).click();assert.match(await published.locator('body').textContent(),/Explore su próximo paso con Fictional Recovery hoy/);}finally{await published.close();}await page.reload();const live=await state();for(const m of live.view.materials)assert.equal(m.id,materialIdentity[m.type].id);assert.equal(live.view.decision.live,true);assert.deepEqual(errors,[]);
 });
 fs.writeFileSync(`${out}/publication.json`,JSON.stringify({provider:'deterministic dependency; real provider acceptance recorded separately',slug:fixture.slug,materials:materialIdentity,live:true,results},null,2));
}finally{await browser.close();}
