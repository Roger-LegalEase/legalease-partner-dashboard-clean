// Loopback-only real form -> local email -> PKCE -> password -> clean sign-in.
// No traces, screenshots, raw errors, passwords or callback URLs are recorded.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {chromium, webkit} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').trim().split('\n').map(l=>l.split(/=(.*)/s).slice(0,2)));
const base = process.env.JOURNEY_BASE_URL ?? 'http://127.0.0.1:3139';
const mail = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
for(const url of [base,mail,env.NEXT_PUBLIC_SUPABASE_URL]) assert.equal(new URL(url).hostname,'127.0.0.1','Loopback required');
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const baseline=process.argv.includes('--baseline');
const engines=process.argv.includes('--webkit')?[webkit]:[chromium];
function password(){return `Local-${randomBytes(20).toString('hex')}!9`;}
async function membership(id){const r=await svc.from('partner_users').select('*').eq('auth_user_id',id);assert.equal(r.error,null,'Membership read failed');return r.data;}
async function emailLink(address){
 for(let i=0;i<80;i++){
  const list=await (await fetch(`${mail}/api/v1/messages`)).json();
  const item=list.messages?.find(m=>m.To?.some(t=>t.Address===address));
  if(item){const m=await (await fetch(`${mail}/api/v1/message/${item.ID}`)).json();const match=(m.HTML??m.Text).match(/https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/);assert.ok(match,'Local email has verification link');return match[0].replaceAll('&amp;','&');}
  await new Promise(r=>setTimeout(r,250));
 }
 throw new Error('Local recovery email unavailable');
}
for(const engine of engines){
 const browser=await engine.launch(); const users=[];
 try{
  const old=password(),fresh=password(),address=`hotfix-${Date.now()}@example.test`;
  const user=await svc.auth.admin.createUser({email:address,password:old,email_confirm:true});assert.equal(user.error,null,'Synthetic user creation');users.push(user.data.user.id);
  const ins=await svc.from('partner_users').insert({auth_user_id:users[0],partner_slug:null,role:'internal_admin',status:'active'});assert.equal(ins.error,null,'Synthetic membership creation');
  const before=await membership(users[0]);const ctx=await browser.newContext();const page=await ctx.newPage();const exchanges=[];
  page.on('pageerror',e=>console.log('Browser page error:',e.name));
  page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/auth/v1/recover')console.log('Reset redirect configured:',Boolean(u.searchParams.get('redirect_to')));});
  page.on('requestfailed',r=>console.log('Browser request failed:',new URL(r.url()).pathname));
  page.on('response',r=>{if(new URL(r.url()).pathname==='/auth/v1/recover')console.log('Recovery API status:',r.status());if(new URL(r.url()).pathname==='/auth/v1/token'&&r.url().includes('grant_type=pkce'))exchanges.push(r.status());});
  let acceptCalls=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/partners/first-admin/accept')acceptCalls++;});
  console.log('Synthetic user ready; opening reset form');
  await page.goto(`${base}/auth/forgot-password?next=%2Finternal%2Fpartners%2Fprovisioning`);
  await page.waitForLoadState('networkidle');await page.waitForTimeout(1500);console.log('Reset form loaded');
  await page.locator('input[name=email]').fill(address);await page.locator('button[type=submit]').click();
  console.log('Reset submitted');await page.waitForTimeout(1000);console.log('Reset state',{path:new URL(page.url()).pathname,sending:await page.getByText('Sending instructions...').count(),captcha:await page.getByText('Please complete the security check and try again.').count(),invalidEmail:await page.getByText('Enter a valid email address.').count(),inputValid:await page.locator('input[name=email]').evaluate(e=>e.validity.valid),inputRetained:await page.locator('input[name=email]').inputValue().then(v=>v===address)});
  await page.getByText('If an account exists for that email, we sent password reset instructions.').waitFor();
  console.log('Reset form acknowledged');
  let link=await emailLink(address);console.log('Local email captured');
  if(!baseline){
   const other=await browser.newContext();const different=await other.newPage();await different.goto(link);
   await different.getByText('This password reset link cannot be used').waitFor();await different.getByText('Open the reset email in the same browser where you requested it.',{exact:false}).waitFor();assert.equal(await different.locator('#new-password').count(),0);await other.close();
   await page.goto(`${base}/auth/set-password?flow=recovery&code=synthetic-invalid-code`);
   await page.getByText('This password reset link cannot be used').waitFor();assert.equal(await page.locator('#new-password').count(),0);
   await page.goto(`${base}/auth/forgot-password?next=%2Finternal%2Fpartners%2Fprovisioning`);await page.waitForLoadState('networkidle');
   await page.locator('input[name=email]').fill(address);await page.locator('button[type=submit]').click();await page.getByText('If an account exists for that email, we sent password reset instructions.').waitFor();
   // Wait for the newly captured message rather than reusing the consumed one.
   for(let i=0;i<80;i++){const candidate=await emailLink(address);if(candidate!==link){link=candidate;break;}await page.waitForTimeout(250);}
   exchanges.length=0;
  }
  await page.goto(link);await page.waitForFunction(()=>!document.body.innerText.includes('Checking your invite link...')&&!document.body.innerText.includes('Checking your recovery link...'));
  await page.waitForTimeout(1200);console.log('Recovery landing',{host:new URL(page.url()).host,path:new URL(page.url()).pathname,queryKeys:[...new URL(page.url()).searchParams.keys()]});
  if(baseline){
   const invalid=await page.getByText('This account setup link cannot be used').count();
   console.log(JSON.stringify({engine:engine.name(),baselineInvalid:Boolean(invalid),pkceResponseStatuses:exchanges,formVisible:await page.locator('#new-password').count()}));
   assert.equal(invalid,1,'Baseline reproduces recovery failure');assert.deepEqual(exchanges,[200],'SDK completed the original exchange');
   const diagnostic=await page.locator('[data-auth-diagnostic]').textContent().then(JSON.parse);console.log('Baseline application result',{status:diagnostic.status,name:diagnostic.error?.name,code:diagnostic.error?.code});assert.equal(diagnostic.status,'code_exchange_failed');assert.equal(diagnostic.error?.name,'[redacted]','Long error identifiers are redacted');
   await page.goto(`${base}/internal/partners/provisioning`);await page.getByText('Protected administrative workspace').waitFor();console.log('Baseline valid server session with unusable password page confirmed');
  }else{
   assert.equal(exchanges.length,1,'Exactly one callback exchange');assert.equal(exchanges[0],200,'Callback establishes session');
   await page.locator('#new-password').fill(fresh);await page.locator('#confirm-password').fill(`${fresh}mismatch`);await page.locator('button[type=submit]').click();await page.getByText('Passwords do not match.').waitFor();assert.equal(new URL(page.url()).pathname,'/auth/set-password');
   await page.locator('#confirm-password').fill(fresh);
   await page.route('**/auth/v1/user',async route=>{if(route.request().method()==='PUT')await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'weak_password',msg:'Synthetic rejected update'})});else await route.continue();});
   await page.locator('button[type=submit]').click();await page.getByText('We could not save your password. Please try again or request a new reset link.').waitFor();
   assert.equal(await page.locator('#new-password').isEnabled(),true,'Failed update retains usable form');assert.equal(new URL(page.url()).pathname,'/auth/set-password');
   await page.unroute('**/auth/v1/user');await page.locator('button[type=submit]').click();
   await page.waitForURL(`${base}/internal/partners/provisioning`);await page.getByText('Protected administrative workspace').waitFor();
   assert.equal(acceptCalls,0,'Recovery never accepts an invitation');assert.deepEqual(await membership(users[0]),before,'Membership unchanged');
   await page.getByRole('button',{name:'Sign out of LegalEase Internal'}).click();await ctx.close();
   const clean=await browser.newContext();const signIn=await clean.newPage();
   await signIn.goto(`${base}/sign-in?next=%2Finternal%2Fpartners%2Fprovisioning`);await signIn.locator('input[name=email]').fill(address);await signIn.locator('input[name=password]').fill(old);await signIn.locator('button[type=submit]').click();
   await signIn.waitForTimeout(1000);assert.ok(signIn.url().includes('/sign-in'),'Old password stays at sign-in');assert.equal(await signIn.getByText('Protected administrative workspace').count(),0);
   await signIn.locator('input[name=password]').fill(fresh);await signIn.locator('button[type=submit]').click();await signIn.waitForURL(`${base}/internal/partners/provisioning`);await signIn.getByText('Protected administrative workspace').waitFor();
   // Used callbacks and callback-free recovery cannot borrow this valid session.
   await signIn.goto(`${base}/auth/set-password?flow=recovery&next=%2Finternal%2Fpartners%2Fprovisioning`);
   await signIn.getByText('This password reset link cannot be used').waitFor();assert.equal(await signIn.locator('#new-password').count(),0);
   await signIn.goto(`${base}/auth/set-password?flow=recovery&code=synthetic-invalid-code`);
   await signIn.getByText('This password reset link cannot be used').waitFor();await signIn.getByText('Open the reset email in the same browser where you requested it.',{exact:false}).waitFor();
   assert.equal(new URL(signIn.url()).searchParams.has('code'),false,'Invalid callback scrubbed');
   assert.deepEqual(await membership(users[0]),before,'Role/scope/status unchanged after clean sign-in');await clean.close();
   console.log(`${engine.name()}: recovery, one exchange, password update, sign-out, old password denial, clean new-password sign-in, server guard and unchanged membership PASS`);
  }
  await ctx.close().catch(()=>{});
  if(!baseline){
   const consumerAddress=`consumer-${Date.now()}@example.test`, consumerPassword=password(), consumerNew=password();
   const consumer=await svc.auth.admin.createUser({email:consumerAddress,password:consumerPassword,email_confirm:true});assert.equal(consumer.error,null);users.push(consumer.data.user.id);
   const claim=randomBytes(24).toString('base64url');let claims=0;
   const consumerCtx=await browser.newContext();const consumerPage=await consumerCtx.newPage();
   await consumerPage.route('**/api/expungement-ai/screening/pending/claim',async route=>{claims++;assert.equal(route.request().postDataJSON().claimToken,claim);await route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'});});
   await consumerPage.route('**/expungement-ai/sign-in?**',route=>route.fulfill({status:200,contentType:'text/html',body:'<p>Continuation captured</p>'}));
   await consumerPage.goto(`${base}/auth/forgot-password?product=expungement&next=%2Fbriefcase&locale=es&claim=${encodeURIComponent(claim)}`);await consumerPage.waitForLoadState('networkidle');
   await consumerPage.locator('input[name=email]').fill(consumerAddress);await consumerPage.locator('button[type=submit]').click();await consumerPage.getByText('If an account exists for that email, we sent password reset instructions.').waitFor();
   await consumerPage.goto(await emailLink(consumerAddress));await consumerPage.locator('#new-password').waitFor();assert.equal(claims,0,'Recovery cannot claim or skip entry before password save');
   assert.equal(new URL(consumerPage.url()).searchParams.get('locale'),'es');
   await consumerPage.locator('#new-password').fill(consumerNew);await consumerPage.locator('#confirm-password').fill(consumerNew);await consumerPage.locator('button[type=submit]').click();
   await consumerPage.waitForURL('**/expungement-ai/sign-in?**');const continuation=new URL(consumerPage.url());assert.equal(claims,1);assert.equal(continuation.searchParams.get('claimRetry'),'1');assert.equal(continuation.searchParams.get('locale'),'es');assert.equal(continuation.searchParams.get('claim'),claim);assert.deepEqual(await membership(consumer.data.user.id),[]);
   await consumerCtx.close();
   // Real Auth magic-link/session handoff; capture the destination to avoid
   // performing a Clinic reset. Clinic reset's own security suite runs separately.
   const magic=await svc.auth.admin.generateLink({type:'magiclink',email:consumerAddress,options:{redirectTo:`${base}/auth/set-password?next=%2Fclinic%2Freset&flow=signin`}});assert.equal(magic.error,null);
   const clinicCtx=await browser.newContext();const clinicPage=await clinicCtx.newPage();let passwordUpdates=0;
   clinicPage.on('request',r=>{if(new URL(r.url()).pathname==='/auth/v1/user'&&r.method()==='PUT')passwordUpdates++;});
   await clinicPage.route(`${base}/clinic/reset`,route=>route.fulfill({status:200,contentType:'text/html',body:'<p>Clinic continuation captured</p>'}));
   await clinicPage.goto(magic.data.properties.action_link);await clinicPage.waitForURL(`${base}/clinic/reset`);assert.equal(passwordUpdates,0);assert.deepEqual(await membership(consumer.data.user.id),[]);await clinicCtx.close();
   console.log(`${engine.name()}: consumer waits for password save; claim retry/locale preserved; Clinic sign-in continuation and no membership creation PASS (claim failure and destination captured)`);
  }
 }catch(e){console.error(`Journey failed: ${e.name}; details suppressed to protect auth material`);process.exitCode=1;}
 finally{for(const id of users)await svc.auth.admin.deleteUser(id);await browser.close();}
}
