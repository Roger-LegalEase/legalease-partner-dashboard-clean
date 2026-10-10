import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');assert.notEqual(process.env.VERCEL_ENV,'production');
const dir='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395',origin='http://127.0.0.1:3100';const {slug}=JSON.parse(fs.readFileSync(`${dir}/server/creation-development-check.json`));
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const b=await chromium.launch(),c=await b.newContext(),p=await c.newPage();p.setDefaultTimeout(45000);
const result={kind:'DEVELOPMENT_CHECK_NOT_FINAL_ACCEPTANCE',slug,stages:[],result:'RUNNING'};
try{
 await p.goto(`${origin}/p/${slug}`);await p.getByRole('link',{name:'Start free screening',exact:true}).first().click();await p.waitForURL(u=>u.pathname===`/intake/${slug}`);
 assert.deepEqual(await p.locator('[name=jurisdiction] option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean)),['CA','DC','VA']);
 await p.getByRole('combobox',{name:'Screening jurisdiction',exact:true}).selectOption('CA');await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForURL(u=>u.searchParams.get('jurisdiction')==='CA');
 assert.equal(await p.getByRole('heading',{name:'Create your free Briefcase',exact:true}).count(),0);
 const requestId=await p.locator('input[name=requestId]').inputValue();assert.ok(requestId);
 const post=p.waitForRequest(r=>r.method()==='POST'&&new URL(r.url()).pathname===`/intake/${slug}`);
 await p.getByRole('button',{name:'Start free screening',exact:true}).click();const sent=await post;await p.waitForURL(u=>u.pathname==='/expungement-ai/screening/ca');
 const sessionId=new URL(p.url()).searchParams.get('session');assert.ok(sessionId);
 const session=await db.from('screening_sessions').select('session_id,partner_slug,jurisdiction,entry_request_hash,partner_benefit_active').eq('session_id',sessionId).single();assert.equal(session.error,null);assert.equal(session.data.partner_slug,slug);assert.equal(session.data.jurisdiction,'CA');assert.equal(session.data.partner_benefit_active,true);assert.match(session.data.entry_request_hash,/^[a-f0-9]{64}$/);
 assert.equal((await c.cookies()).some(cookie=>cookie.name.startsWith('sb-')),false);
 result.stages.push('Public program → exact authorized state → anonymous screening through actual controls, no account gate');
 const headers=await sent.allHeaders();delete headers.cookie;delete headers['content-length'];
 const replay=await c.request.post(sent.url(),{data:sent.postDataBuffer(),headers,maxRedirects:0});assert.ok([200,303].includes(replay.status()),String(replay.status()));
 const same=await db.from('screening_sessions').select('session_id').eq('entry_request_hash',session.data.entry_request_hash);assert.equal(same.error,null);assert.deepEqual(same.data.map(s=>s.session_id),[sessionId]);
 const matters=await db.from('consumer_briefcase_items').select('id',{count:'exact',head:true}).eq('source_session_id',sessionId);assert.equal(matters.error,null);assert.equal(matters.count,0);
 result.stages.push('Identical server-action replay reused one temporary screening and created no durable matter');
 await p.goto(`${origin}/intake/${slug}?jurisdiction=TX`);assert.equal(await p.getByRole('button',{name:'Start free screening',exact:true}).count(),0);
 result.stages.push('Unsupported state has no program start action');result.result='PASS';
}catch(error){result.result='FAIL';result.error=error.message.split('\n')[0];result.path=new URL(p.url()).pathname;result.visibleText=(await p.locator('body').innerText()).slice(-7000);process.exitCode=1;}
finally{fs.writeFileSync(`${dir}/server/participant-entry-development.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({result:result.result,stages:result.stages,error:result.error,path:result.path}));await b.close();}
