// Development check using genuine isolated accounts; not final acceptance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
const dir='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395';
const credentials=JSON.parse(fs.readFileSync(`${dir}/server/partner-development-access.private.json`));
const origin='http://127.0.0.1:3100';
const browser=await chromium.launch();const context=await browser.newContext();const p=await context.newPage();p.setDefaultTimeout(45000);
const result={kind:'DEVELOPMENT_CHECK_NOT_FINAL_ACCEPTANCE',slug:credentials.slug,stages:[],result:'RUNNING'};
const read=()=>p.evaluate(async()=>{const r=await fetch('/api/partners/onboarding/program');return (await r.json()).view;});
async function saved(){await p.getByRole('status').filter({hasText:/^Saved$/}).waitFor();}
try{
 await p.goto(origin+'/sign-in?next=/partner/settings?step=program');await p.locator('input[type=email]').fill(credentials.email);await p.locator('input[type=password]').fill(credentials.password);await p.getByRole('button',{name:/^sign in$/i}).click();await p.waitForURL(u=>u.pathname==='/partner/settings');
 const before=await read();assert.equal(before.partnerSlug,credentials.slug);
 await p.getByText('Participant page content',{exact:true}).click();
 assert.equal(await p.getByLabel('Headline',{exact:true}).inputValue(),before.data.brand_public_page.program_headline);
 assert.equal(await p.getByLabel(/Spanish headline/).count(),0);
 result.stages.push('Existing English source editable; no seven-field Spanish assignment');
 const a=await context.newPage();a.setDefaultTimeout(45000);await a.goto(origin+'/partner/settings?step=organization');
 await p.getByRole('button',{name:/^2\s*Organization$/}).click();
 const website1='https://first-'+Date.now().toString(36)+'.example.test',website2='https://second-'+Date.now().toString(36)+'.example.test';
 await a.getByLabel('Website (optional)',{exact:true}).fill(website1);await a.getByRole('status').filter({hasText:/^Saved$/}).waitFor();
 await p.getByLabel('Website (optional)',{exact:true}).fill(website2);await p.getByRole('button',{name:'Review saved changes',exact:true}).waitFor();
 assert.equal(await p.getByLabel('Website (optional)',{exact:true}).inputValue(),website2);
 await p.getByRole('button',{name:'Review saved changes',exact:true}).click();await p.getByRole('button',{name:'Keep my edit',exact:true}).click();await p.getByRole('button',{name:'Save reviewed changes',exact:true}).click();await saved();
 assert.equal((await read()).data.organization_contacts.website,website2);
 await p.reload();assert.equal(await p.getByLabel('Website (optional)',{exact:true}).inputValue(),website2);
 result.stages.push('Concurrent same-field conflict preserved draft and saved explicit reviewed choice');
 await p.getByRole('button',{name:/^3\s*Program$/}).click();await p.getByText('Participant page content',{exact:true}).click();
 await p.getByLabel('Headline',{exact:true}).fill('Synthetic customized community screening information');await saved();
 const changed=await read();assert.equal(changed.data.brand_public_page.program_headline,'Synthetic customized community screening information');
 await p.getByRole('button',{name:/^5\s*Start$/}).click();await p.getByRole('heading',{name:'Final review & program confirmation',exact:true}).waitFor();
 await p.getByRole('alert').filter({hasText:/Spanish preparation could not be completed/}).waitFor();
 assert.equal(await p.getByRole('button',{name:'Confirm my program',exact:true}).count(),0);
 const failed=await read();assert.equal(failed.materials.some(m=>m.type==='co_branded_page_configuration'),false);
 result.stages.push('Unavailable provider kept custom source saved, showed truthful failure and blocked stale confirmation');
 await p.getByRole('button',{name:/^3\s*Program$/}).click();await p.getByText('Participant page content',{exact:true}).click();await p.getByLabel('Headline',{exact:true}).fill('Explore your record-clearing options');await saved();
 await p.getByRole('button',{name:/^5\s*Start$/}).click();await p.getByRole('button',{name:'Confirm my program',exact:true}).waitFor();
 const restored=await read();result.restored={setupComplete:restored.decision.setupComplete,materialTypes:restored.materials.map(m=>m.type),draftTypes:restored.draftMaterials.map(m=>m.type),hasReview:!!restored.reviewToken};assert.equal(restored.materials.length,2);assert.deepEqual(restored.materials.find(m=>m.type==='co_branded_page_configuration').document.pagePreview.missing,[]);
 await p.getByRole('checkbox').filter({visible:true}).last().check();await p.getByRole('button',{name:'Confirm my program',exact:true}).click();await p.waitForURL(u=>u.pathname==='/partner/dashboard');
 result.stages.push('Restored standard source completed both materials; affected summary required a current version confirmation and returned to dashboard');
 result.result='PASS';
}catch(error){result.result='FAIL';result.error=error.message.split('\n')[0];result.callsite=error.stack?.split('\n').filter(line=>line.includes('scripts/rcap-grade-a/')).join('\n');result.visibleText=(await p.locator('body').innerText()).slice(-9000);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/server/partner-settings-development.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,stages:result.stages,error:result.error}));await browser.close();}
