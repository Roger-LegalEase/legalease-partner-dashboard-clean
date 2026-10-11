import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {chromium} from 'playwright';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
const dir='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395';
const owner=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json')).owner;
const {slug}=JSON.parse(fs.readFileSync(`${dir}/server/creation-development-check.json`));
const origin='http://127.0.0.1:3100',email=`integrated-staff-${Date.now().toString(36)}@example.test`,password=`Isolated!9-${randomUUID()}`;
const browser=await chromium.launch(),admin=await browser.newContext(),page=await admin.newPage();page.setDefaultTimeout(45000);
const result={kind:'DEVELOPMENT_CHECK_NOT_FINAL_ACCEPTANCE',slug,stages:[],result:'RUNNING'};let active=page;
try{
 await page.goto(origin+`/sign-in?next=/internal/partners/onboarding/${slug}%23program-team`);await page.locator('input[type=email]').fill(owner.email);await page.locator('input[type=password]').fill(owner.password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname===`/internal/partners/onboarding/${slug}`);
 await page.getByRole('link',{name:'Team & access',exact:true}).click();await page.getByText('Invite program staff',{exact:true}).first().click();
 await page.getByLabel('Contact email',{exact:true}).fill(email);await page.getByLabel('Name / label',{exact:true}).fill('Isolated Clinic Staff');
 const response=page.waitForResponse(r=>r.url().endsWith('/internal/partner-users/invite')&&r.request().method()==='POST');await page.getByRole('button',{name:'Invite program staff',exact:true}).click();const r=await response;const body=await r.json();assert.equal(r.status(),200,JSON.stringify(body));assert.equal(body.ok,true);
 result.stages.push('Actual scoped staff invitation submitted through program Team & access');
 const mailbox=await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json();const mail=mailbox.messages.find(m=>m.To.some(to=>to.Address===email));assert.ok(mail,'Staff invite received by local SMTP');const full=await(await fetch(`http://127.0.0.1:54324/api/v1/message/${mail.ID}`)).json();
 const links=[...full.HTML.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&'));const link=links.find(l=>l.includes('/verify?'));assert.ok(link);assert.equal(new URL(link).hostname,'127.0.0.1');
 const staff=await browser.newContext();active=await staff.newPage();active.setDefaultTimeout(45000);await active.goto(link);await active.getByLabel('New password',{exact:true}).fill(password);await active.getByLabel('Confirm password',{exact:true}).fill(password);await active.getByRole('button',{name:'Set password',exact:true}).click();await active.waitForURL(u=>u.pathname==='/partner/dashboard');
 fs.writeFileSync(`${dir}/server/staff-development-access.private.json`,JSON.stringify({email,password,slug}),{mode:0o600});
 assert.equal(await active.getByRole('navigation',{name:'Program navigation'}).getByRole('link',{name:'Team',exact:true}).count(),0);assert.equal(await active.getByRole('link',{name:'Settings',exact:true}).count(),0);
 await active.getByRole('navigation',{name:'Program navigation'}).getByRole('link',{name:'Clinics',exact:true}).click();await active.getByText('No clinics are assigned to you. Ask your program administrator for an event assignment.',{exact:true}).waitFor();assert.equal(await active.getByRole('button',{name:'Create clinic event',exact:true}).count(),0);
 const denied=await active.evaluate(async slug=>{const r=await fetch(`/api/partners/access-codes?partnerSlug=${slug}`);return {status:r.status};},slug);assert.equal(denied.status,403);
 result.stages.push('Invitation claimed with real password flow; unassigned staff has no event, code management, Team or Settings controls');result.result='PASS';
}catch(error){result.result='FAIL';result.error=error.message.split('\n')[0];result.path=new URL(active.url()).pathname;result.visibleText=(await active.locator('body').innerText()).slice(-6000);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/server/staff-invitation-development.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,stages:result.stages,error:result.error,path:result.path}));await browser.close();}
