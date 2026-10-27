import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {START_ONLY,FINAL_START_ONLY,startOnlyProfile,admitStartOnlyTarget,qualifyRetainedStartProof,createStartOnlyBrowserIo,runOrdinaryStartOnly} from './rcap-hosted-ordinary-admin-start-only.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export const POSTSTATE_SQL_SHA256='940f73ee4d2782381a0ea378f1735e5afb77409c222994783dadb2974f3e9469';
const retainedPins={before:'1bfc58296afe4af56f3b48caddf28b70f4fcbf08cefa2243efffb382094eddd6',review:'a1ea765968b128fc7ab35dfcc91cf14d3ec7fae8addd57e1472a182131f14900',poststate:'f064919f47268121cc394b75c362f804f1b4a51c6127360bae7c62db00d66a09'};
export function requireStartOnlyDispatch(env){
 assert.equal(env.GITHUB_ACTIONS,'true');assert.equal(env.GITHUB_REPOSITORY,'Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(env.GITHUB_EVENT_NAME,'workflow_dispatch');assert.equal(env.GITHUB_RUN_ATTEMPT,'1');assert.equal(env.GITHUB_REF_NAME,'codex/f-vercel-raw-readonly-20261026');assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(env.GITHUB_WORKFLOW_SHA,env.GITHUB_SHA);
 const input=JSON.parse(env.DISPATCH_INPUTS);const profile=startOnlyProfile(input.application_sha),final=profile===FINAL_START_ONLY;const expected={mode:'ordinary_admin_start_only',application_sha:profile.app,worker_source_sha:final?'84a75b6e65dc69e6c371afac44f1284e0debf722':'32499751569359315248c2048fa111064a47c67f',worker_digest:final?'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1':'sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494',supabase_project_ref:'hyflxnlhpmiqxvvcoiia'};
 for(const[k,v]of Object.entries(expected))assert.equal(input[k],v);
 assert.match(input.tools_sha??'',/^[a-f0-9]{40}$/);
 for(const[k,v]of Object.entries(input))if(!Object.hasOwn(expected,k)&&k!=='tools_sha')assert.ok(v===''||v===false||v==='false'||v==='[]','Unexpected dispatch input '+k);
}
export function admitFinalStartGuard({binding,guardBytes,guardRunBytes,cAcceptanceBytes}){
 for(const[k,b]of Object.entries({guardSha256:guardBytes,guardRunSha256:guardRunBytes,guardCAcceptanceSha256:cAcceptanceBytes})){assert.match(binding[k]??'',/^[a-f0-9]{64}$/,'BEFORE_AUTH_HOLD:'+k);assert.equal(sha(b),binding[k]);}
 const g=JSON.parse(guardBytes),run=JSON.parse(guardRunBytes),c=JSON.parse(cAcceptanceBytes);
 assert.equal(g.applicationSha,FINAL_START_ONLY.app);assert.equal(g.deploymentId,'dpl_5F4mUgNDVuuooxcMou46C6SJPipX');assert.equal(g.stage,'ordinary_guard_readonly');assert.equal(g.applicationPosts,0);assert.equal(g.diagnostic.passed,true);assert.equal(Object.keys(g.diagnostic.predicates).length,19);assert(Object.values(g.diagnostic.predicates).every(v=>v===true));assert.equal(g.diagnostic.artifacts.length,3);assert(g.diagnostic.artifacts.every(a=>a.readable===true&&a.hashMatches===true&&a.filesystemCode===null));
 for(const[k,v]of Object.entries({id:40524995570,workflow_id:332448793,head_sha:'9a9f5034c675bf7c786ecc2e7a98179383faca71',head_branch:'codex/f-vercel-raw-readonly-20261026',run_attempt:1,event:'workflow_dispatch',status:'completed',conclusion:'success'}))assert.equal(run[k],v);assert.equal(run.repository?.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 assert.equal(c.schema,'codex-c-acceptance/v1');assert.equal(c.decision,'ACCEPTED_ACTUAL_FINAL_ORDINARY_GUARD_ALL19_AND_ARTIFACTS_ALL3_PASS');assert.equal(c.actualRun,run.id);assert.equal(c.application,FINAL_START_ONLY.app);assert.equal(c.preview,g.deploymentId);assert(Object.values(c.proofFiles).includes(binding.guardSha256));assert(Object.values(c.proofFiles).includes(binding.guardRunSha256));return true;
}
export async function readStartOnlyInputs(env){
 const read=async key=>{assert.ok(env[key],key);return fs.readFile(env[key]);};
 const profile=startOnlyProfile(JSON.parse(env.DISPATCH_INPUTS).application_sha);
 const bindingBytes=await read('RCAP_START_BINDING_FILE');assert.match(env.RCAP_START_BINDING_SHA256??'',/^[a-f0-9]{64}$/);assert.equal(sha(bindingBytes),env.RCAP_START_BINDING_SHA256);
 const binding=JSON.parse(bindingBytes);assert.equal(binding.executionToolsSha,JSON.parse(env.DISPATCH_INPUTS).tools_sha);const creatorBytes=await read('RCAP_START_CREATOR_FILE'),creatorRun=JSON.parse(await read('RCAP_START_CREATOR_RUN_FILE'));
 const target=admitStartOnlyTarget({binding,creatorBytes,creatorRun,...(profile===FINAL_START_ONLY?{creatorRunBytes:await read('RCAP_START_CREATOR_RUN_FILE'),cAcceptanceBytes:await read('RCAP_START_CREATOR_C_ACCEPTANCE_FILE')}:{})},profile);
 if(profile===FINAL_START_ONLY)admitFinalStartGuard({binding,guardBytes:await read('RCAP_START_GUARD_FILE'),guardRunBytes:await read('RCAP_START_GUARD_RUN_FILE'),cAcceptanceBytes:await read('RCAP_START_GUARD_C_ACCEPTANCE_FILE')});
 const retained={};for(const[key,digest]of Object.entries(retainedPins)){const b=await read('RCAP_START_RETAINED_'+key.toUpperCase()+'_FILE');assert.equal(sha(b),digest);retained[key]=JSON.parse(b);}qualifyRetainedStartProof(retained);
 const sqlBytes=await read('RCAP_START_POSTSTATE_SQL_FILE');assert.equal(sha(sqlBytes),POSTSTATE_SQL_SHA256);const sql=sqlBytes.toString();assert.ok(sql.includes('BEGIN READ ONLY;')&&sql.includes("SET LOCAL statement_timeout='15s';")&&sql.trimEnd().endsWith('COMMIT;'));
 return{target,retained,sql,profile};
}
export function protectedStartOnlyReader(sql,token,fetcher=fetch){
 assert.equal(sha(sql),POSTSTATE_SQL_SHA256);assert.ok(typeof token==='string'&&token.trim());
 return async()=>{const r=await fetcher('https://api.supabase.com/v1/projects/hyflxnlhpmiqxvvcoiia/database/query',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});assert.ok([200,201].includes(r.status),'Protected read failed');const rows=await r.json();assert.ok(Array.isArray(rows)&&rows.length===1);const p=rows[0].ordinary_start_404538_poststate;assert.equal(p?.readOnly,'on');return p;};
}
export async function privateStartOnlyCheckpoint(output,profile=START_ONLY){
 assert(profile===START_ONLY||profile===FINAL_START_ONLY);
 assert.ok(path.isAbsolute(output)&&!output.startsWith('/tmp/'),'Durable carrier evidence directory required');await fs.mkdir(output,{recursive:true,mode:0o700});await fs.chmod(output,0o700);
 const allowed=new Set(['start-only-before.json','start-only-response.json','start-only-uncertain.json','start-only-poststate.json','result.json']);
 return async(name,data)=>{assert.ok(allowed.has(name));const f=await fs.open(path.join(output,name),'wx',0o600);try{await f.writeFile(JSON.stringify({schema:'rcap-ordinary-start-only/v1',applicationSha:profile.app,...data},null,2)+'\n');await f.sync();}finally{await f.close();}const dir=await fs.open(output,'r');try{await dir.sync();}finally{await dir.close();}};
}
export async function main(args=process.argv.slice(2),env=process.env){
 assert.ok(args.length===0||(args.length===1&&args[0]==='--verify'));requireStartOnlyDispatch(env);const input=await readStartOnlyInputs(env);
 if(args[0]==='--verify'){console.log('Actual creator, retained history and exact readonly query admitted; zero browser/Auth/SQL operations.');return;}
 const checkpoint=await privateStartOnlyCheckpoint(env.RCAP_START_EVIDENCE_DIR,input.profile);
 const reader=protectedStartOnlyReader(input.sql,env.SUPABASE_ACCESS_TOKEN);
 const {chromium}=createRequire(path.join(process.cwd(),'package.json'))('playwright');await fs.access('/usr/bin/google-chrome');let browser,context;
 try{browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false});context.setDefaultTimeout(30000);context.setDefaultNavigationTimeout(45000);assert.equal(typeof context.routeWebSocket,'function');await context.routeWebSocket('**/*',ws=>ws.close());
 const io=await createStartOnlyBrowserIo({context,admitSourceTarget:async()=>input.target,readProtectedPoststate:reader,checkpoint,bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,profile:input.profile});const result=await runOrdinaryStartOnly({retained:input.retained,profile:input.profile},io);await checkpoint('result.json',result);
 }finally{if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Start-only stopped; preserve private checkpoints and reconcile without retry.');process.exitCode=1;});
