// Focused regression for the independently reproduced RCAP refresh defect.
// Uses the existing isolated app, published QA program and genuine QA identity.
import assert from 'node:assert/strict';
import {actorBrowser,origin,root,fixture,db,checked,write,sourceIdentity} from './campaign-support.mjs';

const slug=fixture('creation-development-check').slug;
const account=fixture('clinic-participant-development-access.private');
const a=await actorBrowser('participant',null),p=a.page,proofs=[];
const path='/api/expungement-ai/screening/progress';
// Browser fetch sends the secure cookie on trustworthy loopback; Playwright's
// standalone HTTP client intentionally does not send Secure cookies over HTTP.
const browserRequest=async(method,url,data,headers={})=>{const r=await p.evaluate(async({method,url,data,headers})=>{const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...headers},body:data?JSON.stringify(data):undefined});return {status:r.status,headers:Object.fromEntries(r.headers)};},{method,url,data,headers});return {status:()=>r.status,headers:()=>r.headers};};
let sessionId,lastPut,second;
p.on('request',r=>{if(r.method()==='PUT'&&new URL(r.url()).pathname===path)lastPut=r.postDataJSON();});
const read=async()=>checked(await db.from('screening_sessions').select('answers,current_question_id,updated_at,resume_email_normalized').eq('session_id',sessionId).single());
const current=async()=>p.locator('input[type=radio],input[type=checkbox]').first().getAttribute('name');
async function next(value){const name=await current();await p.locator(`[name="${name}"][value=${JSON.stringify(value)}]`).check();const saved=p.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname===path);await p.getByRole('button',{name:'Continue',exact:true}).click();assert.equal((await saved).status(),200);await p.waitForFunction(old=>document.querySelector('input[type=radio],input[type=checkbox]')?.getAttribute('name')!==old,name);}
try {
 await p.goto(`${origin}/intake/${slug}?jurisdiction=CA`);
 await p.getByRole('button',{name:'Start free screening',exact:true}).click();
 await p.waitForURL(u=>u.pathname==='/expungement-ai/screening/ca');sessionId=new URL(p.url()).searchParams.get('session');assert.ok(sessionId);
 await p.locator('[name=q-ownership_scope]').first().waitFor();
 const cookie=(await a.context.cookies()).find(c=>c.name==='screening_rcap_draft');assert.ok(cookie?.httpOnly);assert.equal(cookie.sameSite,'Strict');
 await next('Yes');await next('State or local');const persisted=await read(),question=await current();assert.equal(Object.keys(persisted.answers).length,2);
 await p.reload();await p.locator(`[name="${question}"]`).first().waitFor();assert.deepEqual(await read(),persisted);
 await p.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await p.locator('[name=q-jurisdiction_scope][value="State or local"]').isChecked(),true);await next('State or local');
 const same=await browserRequest('PUT',path,lastPut);assert.equal(same.status(),200);assert.deepEqual(await read(),persisted);
 proofs.push({behavior:'Continue persists exact answers and next question; refresh and Back restore; GET and exact retry do not write',sessionId,question});

 const clean=await a.browser.newContext();
 assert.equal((await clean.request.get(`${origin}${path}?session=${sessionId}`)).status(),403);
 assert.equal((await clean.request.put(origin+path,{headers:{origin},data:lastPut})).status(),403);
 assert.equal((await clean.request.post(origin+'/api/expungement-ai/screening/save-resume',{headers:{origin},data:{sessionId,jurisdiction:'CA',answers:{},email:'unauthorized@example.test'}})).status(),403);
 await clean.close();
 assert.equal((await a.context.request.put(origin+path,{headers:{origin:'https://untrusted.example',cookie:`${cookie.name}=${cookie.value}`},data:lastPut})).status(),403);
 assert.equal((await browserRequest('GET',`${path}?session=00000000-0000-4000-8000-000000000001`)).status(),403);
 assert.equal((await browserRequest('PUT',path,{...lastPut,version:'stale',answers:{}})).status(),409);
 assert.equal((await browserRequest('PUT',path,{...lastPut,profileVersion:'obsolete'})).status(),409);
 assert.deepEqual(await read(),persisted);
 const loaded=await browserRequest('GET',`${path}?session=${sessionId}`);assert.equal(loaded.status(),200);assert.match(loaded.headers()['cache-control'],/private.*no-store/);
 proofs.push({behavior:'Missing capability, wrong session, cross-origin, stale version/profile and bare UUID resume-email overwrite fail closed; original saved answers unchanged'});

 const inbox=async()=>(await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json()).messages;
 const beforeMail=new Set((await inbox()).map(m=>m.ID));
 const email=`rcap-continuity-${Date.now()}@example.test`;
 await p.getByRole('button',{name:'Save progress',exact:true}).click();await p.getByRole('dialog').getByLabel('Email',{exact:true}).fill(email);
 const sent=p.waitForResponse(r=>r.url().endsWith('/save-resume')&&r.request().method()==='POST');await p.getByRole('button',{name:'Send link',exact:true}).click();assert.equal((await sent).status(),200);
 await p.getByText('Check your email for a saved-progress link.',{exact:true}).waitFor();
 let url;for(let i=0;i<40&&!url;i++){const mail=(await inbox()).find(m=>!beforeMail.has(m.ID)&&m.To.some(t=>t.Address===email));if(mail){const full=await(await fetch('http://127.0.0.1:54324/api/v1/message/'+mail.ID)).json();url=[...full.HTML.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).find(h=>h.includes('/screening/resume?token='));}if(!url)await new Promise(r=>setTimeout(r,250));}assert.ok(url,'Actual local saved-progress email received');assert.equal(new URL(url).origin,origin);
 assert.equal(new URL(url).pathname,'/expungement-ai/screening/resume','Canonical RCAP email must remain on the RCAP deployment without local rewriting');
 second=await a.browser.newContext();const resumed=await second.newPage();await resumed.goto(url);await resumed.getByLabel('Email',{exact:true}).fill(email);await resumed.getByRole('button',{name:'Resume',exact:true}).click();await resumed.waitForURL(u=>u.pathname.toLowerCase()==='/expungement-ai/screening/ca'&&u.searchParams.get('session')===sessionId);await resumed.locator(`[name="${question}"]`).first().waitFor();await resumed.reload();await resumed.locator(`[name="${question}"]`).first().waitFor();
 assert.deepEqual((await read()).answers,persisted.answers);await second.close();second=null;
 await p.getByRole('dialog').getByRole('button',{name:'Continue',exact:true}).click();
 // Save-progress writes the same answer content; its email/telemetry changes do
 // not invalidate the separate draft-content version used by Continue.
 const answers={case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Tool 4 — Arrest-record sealing (PC 851.91; factual innocence PC 851.8)',resolved_timing_bucket:'gt_10_years',court_requirements_completed:'yes',pardon_status:'No',sentence_completion_date:'Yes',state_exclusion_categories:'None of these',pending_cases:'No',financial_obligations:'Yes',criminal_history:'No',record_documents:'Yes'};
 for(let n=0;n<18;n++){await p.locator('input[type=radio],input[type=checkbox]').or(p.getByRole('button',{name:'Save my result and continue',exact:true})).first().waitFor();if(await p.getByRole('button',{name:'Save my result and continue',exact:true}).count())break;const id=(await current()).slice(2);assert.ok(answers[id],id);await next(answers[id]);}
 await p.getByRole('button',{name:'Save my result and continue',exact:true}).waitFor();assert.match(await p.locator('body').innerText(),/Preliminary result/);
 assert.equal(checked(await db.from('consumer_briefcase_items').select('id').eq('source_session_id',sessionId)).length,0);
 await p.screenshot({path:root+'/server/screening-continuity-result.png',fullPage:true});
 proofs.push({behavior:'Real saved-progress email resumes exact RCAP session on a fresh browser and survives refresh; original browser completes preliminary result without false Briefcase claim'});
 await p.getByRole('button',{name:'Save my result and continue',exact:true}).click();await p.waitForURL(u=>u.pathname==='/expungement-ai/sign-in');await p.getByRole('button',{name:'Already have an account? Sign in',exact:true}).click();await p.getByLabel('Email',{exact:true}).fill(account.email);await p.getByLabel('Password',{exact:true}).fill(account.password);const claim=p.waitForResponse(r=>r.url().endsWith('/pending/claim')&&r.request().method()==='POST');await p.getByRole('button',{name:'Sign in',exact:true}).click();assert.equal((await claim).status(),200);await p.waitForURL(u=>/^\/briefcase\/matters\/[a-f0-9-]{36}$/.test(u.pathname));
 const matterId=new URL(p.url()).pathname.split('/').at(-1);const item=checked(await db.from('consumer_briefcase_items').select('id,user_id,source_session_id').eq('id',matterId).single());assert.equal(item.source_session_id,sessionId);assert.equal(item.user_id,account.id??account.userId??'a2cd11d4-aa6b-466c-b336-a1958ff1cb0a');
 assert.equal((await browserRequest('GET',`${path}?session=${sessionId}`)).status(),403);assert.equal((await browserRequest('PUT',path,lastPut)).status(),403);
 await p.reload();await p.locator(`[data-briefcase-matter-id="${matterId}"]`).waitFor();
 proofs.push({behavior:'Actual authentication atomically claims the exact matter; refresh preserves owned matter; temporary draft capability stops reading/writing after claim',matterId});
 write('server/screening-continuity.json',{result:'PASS',sourceIdentity,environment:'loopback app3100 / Supabase54321 isolated QA',proofs,browserErrors:a.errors});console.log(JSON.stringify({result:'PASS',proofs:proofs.length,sessionId,matterId}));
}catch(error){write('server/screening-continuity-failure.json',{sourceIdentity,error:error.message,proofs,sessionId,route:new URL(p.url()).pathname,text:(await p.locator('body').innerText()).slice(-3000)});throw error;}finally{await second?.close();await a.browser.close();}
