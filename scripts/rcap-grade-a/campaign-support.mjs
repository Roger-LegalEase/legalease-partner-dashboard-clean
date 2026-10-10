import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium,webkit} from 'playwright';
import {createClient} from '@supabase/supabase-js';

export const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const trackedDiff=execFileSync('git',['diff','HEAD','--','src','supabase/migrations'],{encoding:'utf8'});
const applicationFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','src','supabase/migrations'],{encoding:'utf8'}).trim().split('\n').filter(file=>file&&fs.existsSync(file)).sort();
const applicationTreeSha256=createHash('sha256').update(JSON.stringify(applicationFiles.map(file=>[file,createHash('sha256').update(fs.readFileSync(file)).digest('hex')]))).digest('hex');
export const sourceIdentity={baseSha:sha,applicationTreeSha256,trackedWorktreeDeltaSha256:trackedDiff?createHash('sha256').update(trackedDiff).digest('hex'):null,cleanTrackedApplication:!trackedDiff};
export const root=process.env.RCAP_CAMPAIGN_DIR??`artifacts/rcap-grade-a-final/${sha}`;
export const development='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395';
export const origin='http://127.0.0.1:3100';
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
assert.notEqual(process.env.VERCEL_ENV,'production');
assert.equal(JSON.parse(fs.readFileSync(`${root}/manifest.json`)).baselineSha,sha);
export const owner=JSON.parse(fs.readFileSync('/workspaces/training-modules-09-10/output/rcap-practice-access.json')).owner;
export const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
export const checked=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
export const fixture=name=>JSON.parse(fs.readFileSync(`${development}/server/${name}.json`));
export const write=(file,data)=>{fs.mkdirSync(path.dirname(`${root}/${file}`),{recursive:true});fs.writeFileSync(`${root}/${file}`,JSON.stringify(data,null,2));};
export async function actorBrowser(role,account=owner,{engine='chromium',width=1280}={}) {
 const browser=await ({chromium,webkit}[engine]).launch();const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(45000);
 const errors=[];page.on('pageerror',e=>errors.push({kind:'browser',message:e.message.slice(0,250)}));
 if(account){await page.goto(`${origin}/sign-in?next=/internal`);await page.locator('input[type=email]').fill(account.email);await page.locator('input[type=password]').fill(account.password);await page.getByRole('button',{name:/^sign in$/i}).click();await page.waitForURL(u=>u.pathname!=='/sign-in');}
 return {browser,context,page,role,engine,width,errors};
}
export async function record(actor,ids,actions,observed,readback={},status='PASS') {
 assert.ok(['PASS','FAIL','BLOCKED','CONDITIONAL_NOT_OFFERED'].includes(status));assert.ok(actions.length);assert.ok(observed);
 const {page,role,engine,width}=actor;const tag=ids.join('_');const evidence=`journeys/${role}/${tag}.json`;
 const controls=await page.locator('button,a[href],input,select,textarea,summary').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({tag:e.tagName,type:e.getAttribute('type'),name:e.getAttribute('aria-label')||[...e.labels??[]].map(l=>l.innerText).join(' ').trim()||(e.tagName==='SELECT'?'':e.innerText?.trim())||e.getAttribute('title')||'',href:e.getAttribute('href'),disabled:e.disabled===true})));
 const image=`journeys/${role}/${tag}.png`;fs.mkdirSync(path.dirname(`${root}/${image}`),{recursive:true});await page.screenshot({path:`${root}/${image}`,fullPage:true});
 write(evidence,{sourceSha:sha,sourceIdentity,time:new Date().toISOString(),role,browser:engine,viewport:{width,height:900},route:new URL(page.url()).pathname,actions,observed,readback,status,controls,browserErrors:actor.errors});
 const ledgerLock=`${root}/.acceptance-ledger-lock`;for(;;){try{fs.mkdirSync(ledgerLock);break;}catch(error){if(error.code!=='EEXIST')throw error;await new Promise(resolve=>setTimeout(resolve,50));}}
 try {
 const rows=fs.readFileSync(`${root}/acceptance-ledger.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
 for(const id of ids){const row=rows.find(r=>r.caseId===id);assert.ok(row,id);Object.assign(row,{actor:role,fixture:readback.fixture??null,initialServerState:readback.initial??'Recorded in journey receipt',browser:engine,viewport:{width,height:900},locale:'en',actions,observed,evidence:[evidence,image],readback,result:status,issue:status==='PASS'?null:readback.issue??observed,sourceSha:sha});}
 fs.writeFileSync(`${root}/acceptance-ledger.jsonl`,rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 } finally {fs.rmdirSync(ledgerLock);}
 console.log(JSON.stringify({cases:ids,result:status,observed}));
}
export async function save(page){const promise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/configuration'));await page.getByRole('button',{name:'Save program',exact:true}).click();const response=await promise,body=await response.json();assert.equal(response.status(),200,body.error);await page.getByRole('button',{name:'Save program',exact:true}).waitFor({state:'visible'});return body;}
export const materialIds=operations=>operations.view.materials.map(({id,type,version,hash})=>({id,type,version,hash}));
