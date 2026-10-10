import {root,record,write,fixture} from './campaign-support.mjs';
import {randomUUID} from 'node:crypto';
// Anonymous public entry through authenticated exact-result claim, using real local services.
import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
const dir=root,origin='http://127.0.0.1:3100';const {slug}=fixture('creation-development-check');
const account={email:`grade-a-claim-${Date.now().toString(36)}@example.test`,password:`Isolated!9-${randomUUID()}`};fs.writeFileSync(`${root}/server/new-participant-claim.private.json`,JSON.stringify(account),{mode:0o600});
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const browser=await chromium.launch(),context=await browser.newContext(),p=await context.newPage();p.setDefaultTimeout(45000);
const result={kind:'AUTHENTICATED_APPLICATION_CAMPAIGN',slug,stages:[],questions:[],result:'RUNNING'};let current=p;const financial=[];
p.on('request',r=>{if(r.method()==='POST'&&/checkout|entitlement|generate.*packet/.test(new URL(r.url()).pathname))financial.push(new URL(r.url()).pathname);});
try{
 await p.goto(`${origin}/p/${slug}`);await p.getByRole('link',{name:'Start free screening',exact:true}).first().click();await p.getByRole('combobox',{name:'Screening jurisdiction',exact:true}).selectOption('CA');await p.getByRole('button',{name:'Continue',exact:true}).click();await p.getByRole('button',{name:'Start free screening',exact:true}).click();await p.waitForURL(u=>u.pathname==='/expungement-ai/screening/ca');
 const sessionId=new URL(p.url()).searchParams.get('session');assert.ok(sessionId);
 await p.locator('input[type=radio],input[type=checkbox]').first().waitFor();
 const answers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Tool 4 — Arrest-record sealing (PC 851.91; factual innocence PC 851.8)',resolved_timing_bucket:'gt_10_years',court_requirements_completed:'yes',pardon_status:'No',sentence_completion_date:'Yes',state_exclusion_categories:'None of these',pending_cases:'No',financial_obligations:'Yes',criminal_history:'No',record_documents:'Yes'};
 for(let step=0;step<16;step++){
  await p.locator('input[type=radio],input[type=checkbox]').or(p.getByRole('button',{name:'Save to my Briefcase and continue',exact:true})).first().waitFor();
  if(await p.getByRole('button',{name:'Save to my Briefcase and continue',exact:true}).count())break;
  const input=p.locator('input[type=radio],input[type=checkbox]').first();await input.waitFor();const name=await input.getAttribute('name');const id=name.replace(/^q-/,'');const options=await p.locator('input[type=radio],input[type=checkbox]').evaluateAll(inputs=>inputs.map(i=>i.value));assert.ok(answers[id],JSON.stringify({unmappedQuestion:id,options}));assert.ok(options.includes(answers[id]),JSON.stringify({id,options,wanted:answers[id]}));
  await p.locator(`input[value=${JSON.stringify(answers[id])}]`).check();result.questions.push(id);await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForFunction(old=>document.querySelector('input[type=radio],input[type=checkbox]')?.getAttribute('name')!==old,name);
 }
 await p.getByRole('button',{name:'Save to my Briefcase and continue',exact:true}).waitFor();assert.deepEqual(financial,[]);assert.equal((await context.cookies()).some(c=>c.name.startsWith('sb-')),false);
 const pre=await db.from('consumer_briefcase_items').select('id',{count:'exact',head:true}).eq('source_session_id',sessionId);assert.equal(pre.error,null);assert.equal(pre.count,0);result.stages.push('Authorized CA preliminary screening completed anonymously without a durable matter or financial request');
 const claimPath='/api/expungement-ai/screening/pending/claim';await p.getByRole('button',{name:'Save to my Briefcase and continue',exact:true}).click();await p.waitForURL(u=>u.pathname==='/expungement-ai/sign-in');
 const continuation=p.url();fs.writeFileSync(`${root}/server/new-participant-continuation.private.json`,JSON.stringify({continuation,sessionId}),{mode:0o600});
 await p.goto(origin+'/terms');await p.goBack();await p.waitForURL(u=>u.pathname==='/expungement-ai/sign-in');assert.equal(p.url(),continuation);
 await p.getByLabel('Email',{exact:true}).fill(account.email);await p.getByLabel('Password',{exact:true}).fill(account.password);await p.getByRole('button',{name:'Create account and continue',exact:true}).click();
 await p.getByRole('status').filter({hasText:/check your inbox/i}).waitFor();let mail;for(let attempt=0;attempt<20&&!mail;attempt++){const box=await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json();mail=box.messages.find(m=>m.To.some(t=>t.Address===account.email));if(!mail)await new Promise(r=>setTimeout(r,500));}assert.ok(mail,'Actual signup verification email');
 const full=await(await fetch('http://127.0.0.1:54324/api/v1/message/'+mail.ID)).json();const link=/href="([^"]*\/auth\/v1\/verify[^"]+)"/.exec(full.HTML)?.[1]?.replaceAll('&amp;','&');assert.ok(link);assert.equal(new URL(link).hostname,'127.0.0.1');
 const claimResponse=p.waitForResponse(r=>r.url().endsWith(claimPath)&&r.request().method()==='POST');await p.goto(link);const claim=await claimResponse;assert.equal(claim.status(),200);await p.waitForURL(u=>/^\/briefcase\/matters\/[a-f0-9-]{36}$/.test(u.pathname));const itemId=new URL(p.url()).pathname.split('/')[3];
 const request=claim.request();const replay=await p.evaluate(async({path,payload})=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:payload});return {status:r.status,body:await r.json()};},{path:claimPath,payload:request.postData()});assert.equal(replay.status,200);assert.equal(replay.body.matterId,itemId);
 const rows=await db.from('consumer_briefcase_items').select('id,user_id,source_session_id').eq('source_session_id',sessionId);assert.equal(rows.error,null);assert.deepEqual(rows.data.map(m=>m.id),[itemId]);assert.deepEqual(financial,[]);
 await p.reload();await p.locator(`[data-briefcase-matter-id="${itemId}"]`).waitFor();
 result.stages.push('Real participant sign-in resumed the exact result; repeated protected claim produced one owned matter and refresh preserved it');
 const itemReadback=await db.from('consumer_briefcase_items').select('id,user_id,source_session_id,payment_status').eq('id',itemId).single();assert.equal(itemReadback.error,null);const item=itemReadback.data;assert.ok(item);
 result.itemId=itemId;result.sessionId=sessionId;result.result='PASS';
 await record({page:p,role:'participant',engine:'chromium',width:1280,errors:[]},['U-T08','U-T10'],['Complete actual anonymous screening','Save the exact preliminary result','Leave and return to the authentication continuation','Create a new account','Open actual verification email','Claim the exact result','Replay the claim and refresh'], 'Actual account creation and email verification recover the exact pending screening result as one owned matter after interrupted authentication.',{fixture:slug,item,claimReplayStatus:replay.status});
 write('server/new-participant-claim.json',{slug,itemId,sessionId,userId:item.user_id,result:'PASS'});
}catch(error){result.result='FAIL';result.error=error.message.split('\n')[0];result.callsite=error.stack?.split('\n').filter(l=>l.includes('scripts/rcap-grade-a/')).join('\n');result.path=new URL(current.url()).pathname;result.visibleText=(await current.locator('body').innerText()).slice(-7000);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/server/new-participant-claim-journey.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,stages:result.stages,questions:result.questions,error:result.error,path:result.path}));await browser.close();}
