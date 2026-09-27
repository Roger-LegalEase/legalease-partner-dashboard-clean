import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import http from 'node:http';import {once} from 'node:events';import {execFileSync} from 'node:child_process';import ts from 'typescript';import {chromium} from 'playwright';
import {handleResumeRequest,readResumeCaptchaPolicy,TURNSTILE_LOADER,SIGN_IN_NEXT_PATHS,createNetworkEvidence} from './rcap-clinic-resume-network-policy.mjs';
import {plantParticipantState,storageInventory,serverReset,runShippedDeviceReset,assertDeviceClean,applyAnalyticsOptOut,finishResume,resumeFailureRecord,writeResumeFailureRecord} from './rcap-clinic-resume-browser-reset.mjs';
const frontend={clientCaptchaRequired:false,widgetSiteKeyConfigured:true};
const base='658d2368fe54d0b369edc7768985ab8a74783262';
const previous=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',base+':scripts/rcap-clinic-resume-network-policy.mjs'],{encoding:'utf8'})).toString('base64'));
const helperSource=fs.readFileSync('src/lib/clinic-mode/device-reset.mjs','utf8');
const captchaSource=fs.readFileSync('src/lib/auth/captcha.ts','utf8'),widgetSource=fs.readFileSync('src/components/auth/TurnstileWidget.tsx','utf8');
assert.ok(widgetSource.includes(TURNSTILE_LOADER));
function widgetBundle(required='false'){
 const options={compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}};
 const captcha=ts.transpileModule(captchaSource,options).outputText,widget=ts.transpileModule(widgetSource,options).outputText;
 return `(()=>{const process={env:{NODE_ENV:'production',NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED:${JSON.stringify(required)},NEXT_PUBLIC_TURNSTILE_SITE_KEY:'synthetic-site-key'}};const mods={captcha:{exports:{}},widget:{exports:{}}};function require(id){if(id==='react')return {useEffect:f=>f(),useRef:()=>({current:document.createElement('div')})};if(id==='react/jsx-runtime')return {jsx:()=>null};if(id==='@/lib/auth/captcha')return mods.captcha.exports;throw Error('unexpected module');}new Function('exports','require','process',${JSON.stringify(captcha)})(mods.captcha.exports,require,process);new Function('exports','require','process',${JSON.stringify(widget)})(mods.widget.exports,require,process);window.captchaRequirement=mods.captcha.exports.isAuthCaptchaRequired();mods.widget.exports.TurnstileWidget({onTokenChange:()=>{}});window.widgetEffectObserved=true;})();`;
}
async function site(){
 const received=[];let documents=0,config=false;
 const server=http.createServer((req,res)=>{
  received.push({url:req.url,method:req.method,bypass:req.headers['x-vercel-protection-bypass'],toolbar:req.headers['x-vercel-skip-toolbar']});
  if(req.url==='/config'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({security_captcha_enabled:config}));}
  if(req.url==='/api/clinic/session/reset'){res.setHeader('Set-Cookie','sb-review=; Path=/; Max-Age=0; HttpOnly');res.setHeader('Clear-Site-Data','"cache", "cookies", "storage"');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({success:true,signOutConfirmed:true}));}
  if(req.url==='/redirect'){res.writeHead(302,{location:'https://external.invalid/credential-leak'});return res.end();}
  const inject=++documents<=12&&req.headers['x-vercel-skip-toolbar']!=='1';
  res.setHeader('Content-Type','text/html');res.end(`<!doctype html><body><h1>${req.url.startsWith('/briefcase')?'fixture-item':'clean'}</h1><script>setTimeout(()=>{${inject?"const t=document.createElement('script');t.src='https://vercel.live/_next-live/feedback/feedback.js';document.head.append(t);":''}window.feedbackObserved=true;},30);${req.url.startsWith('/expungement-ai/sign-in')?`setTimeout(()=>{${widgetBundle()}},80);`:''}</script></body>`);
 });server.listen(0,'127.0.0.1');await once(server,'listening');return {origin:`http://127.0.0.1:${server.address().port}`,received,setConfig:x=>{config=x;},close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
async function configuration(server){return readResumeCaptchaPolicy({frontend,project:'hyflxnlhpmiqxvvcoiia',token:'synthetic-read-only',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.supabase.com/v1/projects/hyflxnlhpmiqxvvcoiia/config/auth');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');return fetch(server.origin+'/config',options);}});}
async function rehearse(handler){
 const server=await site();let browser;try{
  const captchaPolicy=await configuration(server),network=createNetworkEvidence(),violations=[],external=[];
  browser=await chromium.launch({headless:true});const owner=await browser.newContext();await applyAnalyticsOptOut(owner);
  await owner.route('**/*',route=>{if(new URL(route.request().url()).origin!==server.origin)external.push(route.request().url());return handler(route,{origin:server.origin,bypass:'synthetic-bypass',violations,captchaPolicy,network});});
  const page=await owner.newPage();
  // Twelve document loads and five real widget effects, matching the measured
  // feedback/loader counts. Loads are delayed and span later navigations.
  for(let i=0;i<11;i++){
   const pathname=i%2===0&&i<9?`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(SIGN_IN_NEXT_PATHS[i%3===0?1:0])}`:'/briefcase';
   await page.goto(server.origin+pathname);await page.waitForFunction(()=>window.feedbackObserved===true);
   if(pathname.startsWith('/expungement'))await page.waitForFunction(()=>window.widgetEffectObserved===true);
  }
  await owner.addCookies([{name:'sb-review',value:'synthetic-owner',url:server.origin,httpOnly:true}]);await plantParticipantState(page);const priorState=await storageInventory(page);await serverReset(page);
  const cleanup=await runShippedDeviceReset({page,owner,helperSource,cleanEntryPath:'/clinic/mississippi-volunteer-lawyers-demo',itemId:'fixture-item',priorState});await page.waitForFunction(()=>window.feedbackObserved===true);assertDeviceClean(cleanup);
  return {violations,network,external,cleanup,received:server.received};
 }finally{await browser?.close();await server.close();}
}
test('measured 12 feedback + 5 real Turnstile widget attempts fail the baseline; corrected policy and actual reset adapter pass without forwarding either external resource',async()=>{
 const old=await rehearse(previous.handleResumeRequest);assert.equal(old.external.filter(u=>u.startsWith('https://vercel.live/')).length,12);assert.equal(old.external.filter(u=>u===TURNSTILE_LOADER).length,5);assert.equal(old.violations.length,17);assert.throws(()=>assert.deepEqual(old.violations,[]));
 const fixed=await rehearse(handleResumeRequest);assert.deepEqual(fixed.violations,[]);assert.equal(fixed.external.filter(u=>u.startsWith('https://vercel.live/')).length,0);assert.equal(fixed.external.filter(u=>u===TURNSTILE_LOADER).length,5);assert.equal(fixed.network.counts['expected_block:optional_sign_in_turnstile_loader'],5);assert.ok(fixed.received.filter(r=>r.url!=='/config').every(r=>r.toolbar==='1'&&r.bypass==='synthetic-bypass'));assert.deepEqual(fixed.cleanup.storage,{localStorage:0,sessionStorage:0,indexedDB:0,caches:0,serviceWorkers:0});
});
test('required, missing, malformed and unavailable CAPTCHA configuration refuse; no settings write or successful verification is fabricated',async()=>{
 const server=await site();try{server.setConfig(true);await assert.rejects(configuration(server),/CAPTCHA/);for(const body of [{},null,{security_captcha_enabled:'false'}])await assert.rejects(readResumeCaptchaPolicy({frontend,project:'hyflxnlhpmiqxvvcoiia',token:'synthetic',fetchImpl:async()=>new Response(JSON.stringify(body))}));for(const status of [401,500])await assert.rejects(readResumeCaptchaPolicy({frontend,project:'hyflxnlhpmiqxvvcoiia',token:'synthetic',fetchImpl:async()=>new Response('{}',{status})}));assert.ok(server.received.every(r=>r.method==='GET'));}finally{await server.close();}
});
test('actual client requirement still refuses a missing CAPTCHA token even when a widget can mount independently',async()=>{
 const form=fs.readFileSync('src/components/expungement-ai/ConsumerSignInForm.tsx','utf8');const start=form.indexOf('    if (isAuthCaptchaRequired() && !captchaToken.trim()) {'),end=form.indexOf('    const supabase =',start);assert.ok(start>=0&&end>start);
 const js=ts.transpileModule(captchaSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const required of ['true','false']){const exports={};new Function('exports','process',js)(exports,{env:{NODE_ENV:'production',NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED:required,NEXT_PUBLIC_TURNSTILE_SITE_KEY:'synthetic-site-key'}});let attempts=0,error;new Function('isAuthCaptchaRequired','captchaToken','setErrorMessage','setIsSubmitting','authCaptchaFailureMessage','authAttempt',form.slice(start,end)+'authAttempt();')(exports.isAuthCaptchaRequired,'',e=>{error=e;},()=>{},exports.authCaptchaFailureMessage,()=>{attempts++;});assert.equal(attempts,required==='true'?0:1);if(required==='true')assert.equal(error,exports.authCaptchaFailureMessage);}
});
test('only the exact GET script, query and sign-in context can be an expected block; lookalikes, other paths/methods/types and absent policy refuse',async()=>{
 const origin='https://preview.vercel.app',valid={frontend,project:'hyflxnlhpmiqxvvcoiia',serverCaptchaRequired:false,syntheticProfile:'bounded no-analytics Clinic resume'};
 const variants=[{}, {url:TURNSTILE_LOADER+'&unexpected=secret'}, {url:TURNSTILE_LOADER.replace('challenges.cloudflare.com','challenges.cloudflare.com.evil.test')},{url:TURNSTILE_LOADER.replace('/api.js','/other.js')},{url:'https://vercel.live/_next-live/feedback/other.js'},{url:'https://external.invalid/secret?token=hidden'},{method:'POST'},{method:'HEAD'},{type:'fetch'},{frame:origin+'/briefcase'},{frame:'https://other.invalid/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase'},{frame:origin+'/expungement-ai/sign-in?mode=create&next=%2Fbriefcase'},{policy:null},{policy:{...valid,serverCaptchaRequired:true}},{policy:{...valid,frontend:undefined}},{policy:{...valid,frontend:{...frontend,clientCaptchaRequired:true}}}];
 for(const [i,v]of variants.entries()){let aborted=0;const violations=[],network=createNetworkEvidence();await handleResumeRequest({request:()=>({url:()=>v.url??TURNSTILE_LOADER,method:()=>v.method??'GET',resourceType:()=>v.type??'script',frame:()=>({url:()=>v.frame??origin+'/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase'}),headers:()=>({})}),abort:()=>{aborted++;},continue:()=>assert.fail('external resource forwarded'),fulfill:()=>assert.fail('external script replaced')},{origin,bypass:'private-bypass',violations,network,captchaPolicy:'policy'in v?v.policy:valid});assert.equal(aborted,1);assert.equal(violations.length,i===0?0:1);assert.ok(!JSON.stringify(network).includes('secret'));assert.ok(!JSON.stringify(network).includes('hidden'));assert.ok(!JSON.stringify(network).includes('private-bypass'));}
});
test('a real cross-origin redirect is stopped before either Preview-only header can leave the origin',async()=>{
 const server=await site();let browser;try{browser=await chromium.launch({headless:true});const c=await browser.newContext(),violations=[];await c.route('**/*',route=>handleResumeRequest(route,{origin:server.origin,bypass:'synthetic-secret',violations}));const page=await c.newPage();await assert.rejects(page.goto(server.origin+'/redirect'));assert.equal(server.received.length,1);assert.match(violations[0],/cross-origin redirect/);}finally{await browser?.close();await server.close();}
});
test('actual outer failure path retains sanitized dispositions and partial cleanup without claiming acceptance or closure',async()=>{
 const source=fs.readFileSync('scripts/rcap-hosted-clinic-resume.mjs','utf8'),start=source.indexOf('}catch(error){\n try{if(activity)');assert.ok(start>0);const tail=source.slice(start);
 const network=createNetworkEvidence();network.counts['refused:unrecognized_external']=1;const partialBrowser={acceptance:false,deviceCleanup:{cookies:0,storage:{localStorage:0},historySafe:true}},progress=[{stage:'browser_checks_failed'}];const error=Object.assign(new Error('resume attempted a forbidden request'),{resumeStage:'browser_checks_failed'});let output;const scope={error,network,partialBrowser,captchaPolicy:{serverCaptchaRequired:false},progress,phase:'contract',redact:String,resumeFailureRecord,writeResumeFailureRecord,browser:undefined,activity:undefined,fs:{writeFileSync:(p,s)=>{output=JSON.parse(s);}},path:{join:(...parts)=>parts.join('/')},evidenceDir:'/synthetic',console:{error:()=>{}}};const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;await assert.rejects(new AsyncFunction(...Object.keys(scope),'try{throw error;'+tail)(...Object.values(scope)),/forbidden/);assert.equal(output.closureCommitted,false);assert.equal(output.partialBrowser.acceptance,false);assert.equal(output.partialBrowser.deviceCleanup.cookies,0);assert.deepEqual(output.network,network);
});
