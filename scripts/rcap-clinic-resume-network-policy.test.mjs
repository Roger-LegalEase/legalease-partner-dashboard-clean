import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import ts from 'typescript';
import {chromium} from 'playwright';
import {handleResumeRequest} from './rcap-clinic-resume-network-policy.mjs';
const origin='https://successor.vercel.app',auth='https://hyflxnlhpmiqxvvcoiia.supabase.co';
async function request(method,url,handler=handleResumeRequest){
 const actions=[],violations=[];
 const route={request:()=>({method:()=>method,url:()=>url,headers:()=>({'x-test':'preserved'})}),continue:options=>actions.push({action:'continue',options}),fulfill:options=>actions.push({action:'fulfill',options}),abort:()=>actions.push({action:'abort'})};
 await handler(route,{origin,bypass:'synthetic-bypass',violations});assert.equal(actions.length,1);return {action:actions[0],violations};
}
async function analyticsContract(handler=handleResumeRequest){
 const r=await request('POST',origin+'/api/analytics/web',handler);
 assert.deepEqual(r,{action:{action:'fulfill',options:{status:204}},violations:[]});
}
test('analytics POST is locally fulfilled 204, never forwarded or counted as a violation',()=>analyticsContract());
for(const [method,url]of [['POST','/api/clinic/session/reset'],['GET','/briefcase'],['HEAD','/briefcase'],['GET','/api/rcap/packets/existing/download']])test(`${method} ${url} continues with bypass and existing headers`,async()=>{
 const r=await request(method,origin+url);assert.deepEqual(r,{action:{action:'continue',options:{headers:{'x-test':'preserved','x-vercel-protection-bypass':'synthetic-bypass'}}},violations:[]});
});
for(const [method,url]of [['POST',origin+'/api/unexpected'],['PUT',origin+'/api/unexpected'],['PATCH',origin+'/api/analytics/web'],['DELETE',origin+'/api/clinic/session/reset'],['POST',origin+'/api/analytics/web/other'],['POST',auth+'/rest/v1/anything'],['POST',auth+'/auth/v10/token'],['GET','https://third-party.example/asset'],['POST','https://third-party.example/api/analytics/web']])test(`${method} ${url} aborts with one violation`,async()=>{
 const r=await request(method,url);assert.equal(r.action.action,'abort');assert.equal(r.violations.length,1);
});
for(const method of ['GET','POST','PUT','PATCH','DELETE'])test(`Acceptance auth ${method} continues without leaking the Vercel bypass`,async()=>{
 assert.deepEqual(await request(method,auth+'/auth/v1/token'),{action:{action:'continue',options:undefined},violations:[]});
});
test('mutation control: deleting the exact analytics exception fails the same regression',async()=>{
 const source=fs.readFileSync(new URL('./rcap-clinic-resume-network-policy.mjs',import.meta.url),'utf8');
 const mutant=source.replace("  if(method==='POST'&&url.pathname==='/api/analytics/web')return route.fulfill({status:204});\n",'');assert.notEqual(mutant,source);
 const {handleResumeRequest:handler}=await import('data:text/javascript;base64,'+Buffer.from(mutant).toString('base64'));
 await assert.rejects(analyticsContract(handler));
});
test('root tracker really emits analytics POSTs: actual beacon and fetch fallback are suppressed in Chromium',async()=>{
 const root=fs.readFileSync('src/app/layout.tsx','utf8');assert.match(root,/import \{ WebAnalyticsTracker \} from "@\/components\/analytics\/WebAnalyticsTracker"/);assert.match(root,/<WebAnalyticsTracker\s*\/>/);
 const resume=fs.readFileSync('scripts/rcap-hosted-clinic-resume.mjs','utf8');assert.match(resume,/c\.route\('\*\*\/\*',route=>handleResumeRequest\(route,\{origin,bypass,violations\}\)\)/);assert.match(resume,/assert\.deepEqual\(violations,\[\]/);
 // Transpile the shipped component and its real analytics dependencies. Only
 // React's effect scheduler and Next's pathname hook are supplied by the fixture.
 const modules={},entry='@/components/analytics/WebAnalyticsTracker',queue=[entry];
 while(queue.length){const id=queue.pop();if(modules[id])continue;const stem=path.join('src',id.slice(2));const file=fs.existsSync(stem+'.tsx')?stem+'.tsx':stem+'.ts';const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;modules[id]=code;for(const [,dep]of code.matchAll(/require\("(@\/[^\"]+)"\)/g))queue.push(dep);}
 const bundle=`const modules=${JSON.stringify(modules)},cache={};function require(id){if(id==='react')return {useEffect:fn=>fn()};if(id==='next/navigation')return {usePathname:()=>location.pathname};if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;new Function('require','module','exports',modules[id])(require,module,module.exports);return module.exports;}require(${JSON.stringify(entry)}).WebAnalyticsTracker();`;
 const received=[];const server=http.createServer((req,res)=>{received.push({method:req.method,path:req.url,bypass:req.headers['x-vercel-protection-bypass']});res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Resume fixture</title>');});server.listen(0,'127.0.0.1');await once(server,'listening');
 let browser;try{
  browser=await chromium.launch({headless:true});const localOrigin=`http://127.0.0.1:${server.address().port}`;
  for(const fallback of [false,true]){
   const c=await browser.newContext(),violations=[],analytics=[];await c.route('**/*',route=>{const r=route.request();if(new URL(r.url()).pathname==='/api/analytics/web')analytics.push({method:r.method(),body:r.postDataJSON()});return handleResumeRequest(route,{origin:localOrigin,bypass:'synthetic-bypass',violations});});const page=await c.newPage();await page.goto(localOrigin+'/briefcase');
   // Exercise both navigator.sendBeacon and the shipped fetch keepalive fallback.
   await page.evaluate(fallback=>{window.process={env:{}};if(fallback)navigator.sendBeacon=()=>false;},fallback);
   const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/analytics/web');await page.addScriptTag({content:bundle});assert.equal((await response).status(),204);
   assert.equal(analytics.length,1);assert.equal(analytics[0].method,'POST');assert.equal(analytics[0].body.path,'/briefcase');assert.deepEqual(violations,[]);await c.close();
  }
  assert.equal(received.filter(r=>r.path==='/api/analytics/web').length,0,'analytics never reaches application');assert.ok(received.every(r=>r.bypass==='synthetic-bypass'));
 }finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
