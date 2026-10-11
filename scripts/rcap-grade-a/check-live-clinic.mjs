// Real local workflow investigation, explicitly separate from final acceptance.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin='http://127.0.0.1:3100';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
assert.notEqual(process.env.VERCEL_ENV,'production');
const folder='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395';
const {slug}=JSON.parse(fs.readFileSync(`${folder}/server/creation-development-check.json`));
const access=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json'));
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();
page.setDefaultTimeout(60000);
const receipt={kind:'DEVELOPMENT_CHECK_NOT_FINAL_ACCEPTANCE',slug,stages:[],result:'RUNNING'};
const configPath=`/api/internal/partners/onboarding/phase1/${slug}/configuration`;
const programPath=`/api/internal/partners/onboarding/phase1/${slug}/program`;
const workspace=`/internal/partners/onboarding/${slug}`;
async function config(){return page.evaluate(async path=>{const r=await fetch(path);return (await r.json()).configuration;},configPath);}
async function save(){const read=page.waitForResponse(r=>r.url().endsWith(configPath)&&r.request().method()==='POST');await page.getByRole('button',{name:'Save program',exact:true}).click();const r=await read;const body=await r.json();assert.equal(r.status(),200,JSON.stringify(body));assert.equal(body.preparationError,null);return body;}
async function start(){await page.getByRole('checkbox',{name:'Confirm operating scope and current materials',exact:true}).check();const read=page.waitForResponse(r=>r.url().endsWith(programPath)&&r.request().method()==='POST');await page.getByRole('button',{name:'Start Program',exact:true}).click();const r=await read;const body=await r.json();assert.equal(r.status(),200,JSON.stringify(body));assert.equal(body.operations.view.decision.live,true);await page.getByRole('heading',{name:'Program dashboard',exact:true}).waitFor();return body.operations;}
try {
 await page.goto(`${origin}/sign-in?next=${workspace}`);await page.locator('input[type=email]').fill(access.owner.email);await page.locator('input[type=password]').fill(access.owner.password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname===workspace);
 const initial=await config();
 page.on('dialog',dialog=>dialog.accept());
 if(process.env.RCAP_CHECK_CLINIC_ONLY!=="true") {
 await page.getByRole('link',{name:'Configure',exact:true}).click();
 if(initial.data.program_goals.participation_mode!=='both'){await page.getByLabel('How people participate',{exact:true}).selectOption('both');await save();}
 if((await config()).status!=='live')await start();
 receipt.stages.push('Actual protected Start Program completed and public routing verified');
 const publicBefore=await context.request.get(`${origin}/p/${slug}`);assert.equal(publicBefore.status(),200);
 await page.reload();await page.getByRole('heading',{name:'Program dashboard',exact:true}).waitFor();
 await page.getByRole('link',{name:'Configure',exact:true}).click();
 const before=await config();
 const direct=await page.evaluate(async({path,c})=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedVersion:c.version,requestId:crypto.randomUUID(),patches:[{section:'organization_contacts',base:c.data.organization_contacts,values:{website:'https://must-not-write.example.test'}}]})});return {status:r.status,body:await r.json()};},{path:configPath,c:before});
 assert.equal(direct.status,409,JSON.stringify(direct));assert.equal((await config()).version,before.version);
 receipt.stages.push('Live write without explicit hold acknowledgment denied without changing configuration');
 await page.getByText('More organization details',{exact:true}).click();
 await page.getByLabel('Organization website',{exact:true}).fill(`https://updated-${Date.now().toString(36)}.example.test`);
 const saved=await save();assert.equal(saved.configuration.status,'ready_to_launch');assert.equal(saved.operations.view.decision.live,false);
 assert.equal((await context.request.get(`${origin}/p/${slug}`)).status(),404);
 assert.equal(saved.operations.view.materials.length,2);
 receipt.stages.push('Confirmed live edit held public entry atomically and returned current materials for one review');
 await start();
 assert.equal((await context.request.get(`${origin}/p/${slug}`)).status(),200);
 receipt.stages.push('Updated program republished through the existing final confirmation and protected launch');
 }
 let result;
 if(process.env.RCAP_EXISTING_CLINIC){assert.match(process.env.RCAP_EXISTING_CLINIC,/^[0-9a-f-]{36}$/);result={eventId:process.env.RCAP_EXISTING_CLINIC};await page.goto(`${origin}/internal/clinic/${result.eventId}`);}else {
 await page.getByRole('link',{name:'Manage program clinics',exact:true}).first().click();
 await page.waitForURL(u=>u.pathname==='/internal/clinic'&&u.searchParams.get('partner')===slug);
 await page.getByLabel('Event name',{exact:true}).fill('Integrated Isolated Clinic');
 await page.getByLabel('Timezone',{exact:false}).selectOption('UTC');
 const from=new Date(Date.now()-5*60000).toISOString().slice(0,16),to=new Date(Date.now()+86400000).toISOString().slice(0,16);
 await page.locator('[name=startsAt]').fill(from);await page.locator('[name=endsAt]').fill(to);
 await page.getByLabel('Location',{exact:true}).fill('Isolated online practice');
 await page.getByLabel('Participant state',{exact:false}).selectOption('CA');
 await page.getByLabel('Capacity',{exact:true}).fill('5');
 assert.equal(await page.locator('[name=sponsorshipAllocation]').count(),0);
 const created=page.waitForResponse(r=>r.url().endsWith('/api/clinic/events')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Create clinic event',exact:true}).click();
 const response=await created;result=await response.json();assert.equal(response.status(),201,JSON.stringify(result));
 await page.waitForURL(u=>u.pathname===`/internal/clinic/${result.eventId}`);
 }
 receipt.eventId=result.eventId;
 assert.equal(await page.getByText('Participant entry is unavailable until this clinic is open.',{exact:true}).count(),1);
 assert.equal(await page.locator('img[alt^="QR code for"]').count(),0);
 receipt.stages.push('Screening-only clinic created as an unpublished CA draft without funding input or public entry');
 const opened=page.waitForResponse(r=>r.url().endsWith(`/api/clinic/events/${result.eventId}`)&&r.request().method()==='PATCH');
 await page.getByRole('button',{name:'Open clinic',exact:true}).click();const openedResponse=await opened;assert.equal(openedResponse.status(),200,JSON.stringify(await openedResponse.json()));
 await page.getByRole('button',{name:'Pause event',exact:true}).waitFor();assert.equal(await page.locator('img[alt^="QR code for"]').count(),1);
 receipt.stages.push('Open clinic made the authorized event entry visible');
 receipt.result='PASS';
}catch(error){receipt.result='FAIL';receipt.error=error.message.split('\n')[0];receipt.path=new URL(page.url()).pathname;receipt.visibleText=(await page.locator('body').innerText()).slice(-10000);process.exitCode=1;}
finally{fs.writeFileSync(`${folder}/server/live-clinic-development.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify({result:receipt.result,slug,stages:receipt.stages,error:receipt.error,path:receipt.path}));await browser.close();}
