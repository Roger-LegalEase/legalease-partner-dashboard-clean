import { sha, sourceIdentity, root as campaignRoot } from './campaign-support.mjs';
// Actual isolated application controls. This development run is not final acceptance.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
const dir=campaignRoot;
const owner=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json')).owner;
const staff=JSON.parse(fs.readFileSync(`${dir}/server/staff-development-access.private.json`));
const {slug}=JSON.parse(fs.readFileSync(`${dir}/server/creation-development-check.json`));
let eventId;
const origin='http://127.0.0.1:3100';
const browser=await chromium.launch();const adminContext=await browser.newContext(),staffContext=await browser.newContext(),participantContext=await browser.newContext();
const admin=await adminContext.newPage(),worker=await staffContext.newPage(),participant=await participantContext.newPage();
for(const p of [admin,worker,participant])p.setDefaultTimeout(45000);
const result={kind:'INTEGRATED_CAMPAIGN_REPLAY',eventId,stages:[],result:'RUNNING'};let current=admin;
async function login(p,account,next){await p.goto(origin+'/sign-in?next='+encodeURIComponent(next));await p.locator('input[type=email]').fill(account.email);await p.locator('input[type=password]').fill(account.password);await p.getByRole('button',{name:/^sign in$/i}).click();await p.waitForURL(u=>u.pathname===next);}
async function clickRequest(p,label,path,method='POST'){const waiting=p.waitForResponse(r=>r.url().endsWith(path)&&r.request().method()===method);await p.getByRole('button',{name:label,exact:true}).click();const r=await waiting;assert.equal(r.status(),200,JSON.stringify(await r.json()));}
async function assign(permissions){await admin.getByLabel('Staff email',{exact:true}).selectOption({label:staff.email});await admin.getByLabel('Staff status',{exact:true}).selectOption('approved');for(const box of await admin.locator('input[name=permissions]').all())await box.setChecked(permissions.includes(await box.inputValue()));await clickRequest(admin,'Save staff authorization',`/api/clinic/events/${eventId}/staff`);await admin.getByText('Approved event staff updated.',{exact:true}).waitFor();}
try{
 await login(admin,owner,`/internal/clinic?partner=${slug}`.split('?')[0]);
 await admin.goto(origin+`/internal/clinic?partner=${slug}`);
 await admin.getByLabel('Event name',{exact:true}).fill('Integrated Reset Clinic '+Date.now().toString(36));
 await admin.getByLabel('Timezone',{exact:false}).selectOption('UTC');
 await admin.locator('[name=startsAt]').fill(new Date(Date.now()-5*60000).toISOString().slice(0,16));
 await admin.locator('[name=endsAt]').fill(new Date(Date.now()+86400000).toISOString().slice(0,16));
 await admin.getByLabel('Location',{exact:true}).fill('Isolated shared-device test');
 await admin.getByLabel('Participant state',{exact:false}).selectOption('CA');
 await admin.getByLabel('Capacity',{exact:true}).fill('3');
 const creation=admin.waitForResponse(r=>r.url().endsWith('/api/clinic/events')&&r.request().method()==='POST');
 await admin.getByRole('button',{name:'Create clinic event',exact:true}).click();const created=await creation;const event=await created.json();assert.equal(created.status(),201,JSON.stringify(event));eventId=event.eventId;result.eventId=eventId;
 await admin.waitForURL(u=>u.pathname===`/internal/clinic/${eventId}`);
 assert.equal(await admin.getByRole('button',{name:'Open clinic',exact:true}).count(),0);
 await captureStage('Fresh CA-only draft created through authorized controls; opening is unavailable until real staff and code prerequisites exist');
 await assign(['assist']);
 await login(worker,staff,'/partner/clinic');current=worker;
 for(const tail of ['queue','reporting','follow-ups']){const status=await worker.evaluate(async path=>(await fetch(path)).status,`/api/clinic/events/${eventId}/${tail}`);assert.equal(status,403,tail);}
 await worker.goto(origin+`/clinic/staff/${eventId}/queue`);await worker.getByText('Clinic queue unavailable',{exact:true}).waitFor();
 await captureStage('Assist-only assignment does not grant queue, reporting, follow-up or event administration');
 current=admin;await assign(['assist','queue','follow_up','reporting']);
 await admin.getByText('Optional code limits and schedule',{exact:true}).click();await admin.getByLabel('Maximum uses',{exact:true}).fill('2');
 const codeResponse=admin.waitForResponse(r=>r.url().endsWith(`/api/clinic/events/${eventId}/access-codes`)&&r.request().method()==='POST');await admin.getByRole('button',{name:'Generate event access code',exact:true}).click();const codeBody=await(await codeResponse).json();assert.ok(codeBody.accessCode?.code);const code=codeBody.accessCode.code;fs.writeFileSync(`${dir}/server/clinic-reset-code.private.json`,JSON.stringify({eventId,code}),{mode:0o600});
 await admin.getByText(code,{exact:true}).waitFor();await admin.reload();assert.equal(await admin.getByText(code,{exact:true}).count(),0);
 await clickRequest(admin,'Open clinic',`/api/clinic/events/${eventId}`,'PATCH');
 const entry=admin.locator(`a[href*='/clinic/']`).filter({hasText:origin+'/clinic/'});await entry.waitFor();const entryUrl=await entry.getAttribute('href');assert.ok(entryUrl.startsWith(origin));
 await captureStage('Event code revealed once; staff and code prerequisites resolve before real Open clinic');
 current=participant;await participant.goto(entryUrl);await participant.getByLabel('Event access code',{exact:true}).fill(code);
 let entryRequest;participant.once('request',()=>{});const entryWait=participant.waitForRequest(r=>r.url().endsWith('/api/clinic/entry')&&r.method()==='POST');
 await participant.getByRole('button',{name:'Continue to participant consent',exact:true}).click();entryRequest=await entryWait;await participant.waitForURL(u=>u.pathname==='/expungement-ai/sign-in');
 const repeat=await participant.evaluate(async payload=>{const r=await fetch('/api/clinic/entry',{method:'POST',headers:{'content-type':'application/json'},body:payload});return {status:r.status,body:await r.json()};},entryRequest.postData());assert.equal(repeat.status,200);
 const previousAccess=`${dir}/server/clinic-participant-development-access.private.json`;if(fs.existsSync(previousAccess))fs.copyFileSync(previousAccess,`${dir}/server/clinic-participant-prior-${Date.now()}.private.json`);
 const account={email:`integrated-participant-${Date.now().toString(36)}@example.test`,password:`Isolated!9-${randomUUID()}`};
 fs.writeFileSync(`${dir}/server/clinic-participant-development-access.private.json`,JSON.stringify({...account,eventId,entryUrl}),{mode:0o600});
 await participant.getByLabel('Email',{exact:true}).fill(account.email);await participant.getByLabel('Password',{exact:true}).fill(account.password);await participant.getByRole('button',{name:'Create account and continue',exact:true}).click();
 await participant.getByRole('status').filter({hasText:/email/i}).waitFor();
 const inbox=await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json();const mail=inbox.messages.find(m=>m.To.some(to=>to.Address===account.email));assert.ok(mail,'Actual signup verification mail');const full=await(await fetch(`http://127.0.0.1:54324/api/v1/message/${mail.ID}`)).json();const link=[...full.HTML.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).find(l=>l.includes('/verify?'));assert.ok(link);assert.equal(new URL(link).hostname,'127.0.0.1');await participant.goto(link);
 if(new URL(participant.url()).pathname==='/expungement-ai/sign-in'){await participant.getByLabel('Email',{exact:true}).fill(account.email);await participant.getByLabel('Password',{exact:true}).fill(account.password);await participant.getByRole('button',{name:'Sign in',exact:true}).click();}
 await participant.getByRole('heading',{name:'Consent to Clinic staff assistance',exact:true}).waitFor();fs.writeFileSync(`${dir}/server/clinic-participant-development-access.private.json`,JSON.stringify({...account,eventId,entryUrl}),{mode:0o600});
 assert.equal(await participant.locator('select[name=jurisdiction]').count(),0);assert.equal(await participant.locator('input[name=jurisdiction]').inputValue(),'CA');
 await participant.getByLabel('Assisting staff member',{exact:true}).selectOption({index:1});
 const untouched=await participant.evaluate(async()=>{const r=await fetch('/api/clinic/assistance/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventSlug:location.pathname.split('/')[2],eventStaffId:document.querySelector('select[name=eventStaffId]').value,jurisdiction:'CA',consent:false,requestId:crypto.randomUUID()})});return r.status;});assert.equal(untouched,400);
 await participant.getByRole('checkbox').check();const consentRequest=participant.waitForRequest(r=>r.url().endsWith('/api/clinic/assistance/start')&&r.method()==='POST');await participant.getByRole('button',{name:'Start screening with assistance',exact:true}).click();const consent=await consentRequest;await participant.waitForURL(u=>u.pathname.endsWith('/screening/ca'));
 const consentReplay=await participant.evaluate(async payload=>{const r=await fetch('/api/clinic/assistance/start',{method:'POST',headers:{'content-type':'application/json'},body:payload});return {status:r.status,body:await r.json()};},consent.postData());assert.equal(consentReplay.status,200,JSON.stringify(consentReplay));
 await captureStage('Real code entry and verification email lead to participant consent; CA-only assistance starts and replays idempotently');
 current=worker;await worker.goto(origin+`/clinic/staff/${eventId}/queue`);const select=worker.getByRole('combobox').filter({visible:true}).first();await select.waitFor();assert.equal(await select.locator('option[value=packet_ready]').isDisabled(),true);assert.equal(await select.locator('option[value=in_progress]').isDisabled(),true);
 await select.selectOption('attorney_review');await worker.getByText('Queue status updated.',{exact:true}).waitFor();await worker.reload();assert.equal(await worker.getByRole('combobox').filter({visible:true}).first().inputValue(),'attorney_review');
 const forgery=await worker.evaluate(async id=>{const cases=await(await fetch(`/api/clinic/events/${id}/queue`)).json();const r=await fetch(`/api/clinic/events/${id}/queue`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({caseId:cases.cases[0].id,queueStatus:'packet_ready'})});return {status:r.status,body:await r.json()};},eventId);assert.equal(forgery.status,409,JSON.stringify(forgery));
 await captureStage('Queue shows actual participant case; attorney review persists; forged packet preparation is denied');
 result.result='PASS';
}catch(error){result.result='FAIL';result.error=error.message.split('\n')[0];result.callsite=error.stack?.split('\n').filter(line=>line.includes('scripts/rcap-grade-a/')).join('\n');result.path=new URL(current.url()).pathname;result.visibleText=(await current.locator('body').innerText()).slice(-6500);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/server/clinic-integration-development.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,stages:result.stages,error:result.error,path:result.path}));await participantContext.storageState({path:`${dir}/server/clinic-participant-browser.private.json`});fs.chmodSync(`${dir}/server/clinic-participant-browser.private.json`,0o600);await browser.close();}

async function captureStage(observed){result.stages.push(observed);const number=result.stages.length;const stagePage=current;const dir=`${campaignRoot}/journeys/clinic-integration`;fs.mkdirSync(dir,{recursive:true});await stagePage.screenshot({path:dir+'/'+number+'.png',fullPage:true});const controls=await stagePage.locator('button,a[href],input,select,textarea,summary').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,name:e.getAttribute('aria-label')||[...e.labels??[]].map(l=>l.innerText).join(' ').trim()||(e.tagName==='SELECT'?'':e.innerText?.trim())||'',href:e.getAttribute('href'),disabled:e.disabled===true})));fs.writeFileSync(dir+'/'+number+'.json',JSON.stringify({sourceSha:sha,sourceIdentity,observed,route:new URL(stagePage.url()).pathname,controls},null,2));}
