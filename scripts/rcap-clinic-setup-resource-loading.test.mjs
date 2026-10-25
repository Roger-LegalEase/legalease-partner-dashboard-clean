import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
import {TOOLBAR_LOADER,TURNSTILE_LOADER} from './rcap-clinic-resume-network-policy.mjs';
import {createClinicRequestGuard} from './rcap-clinic-setup-request-guard.mjs';
test('real browser in-memory fixtures: both contexts suppress exact optional scripts and complete a permitted read without network',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
 try {
  for(const actor of ['admin','participant']) {
   const context=await browser.newContext();const events=[],failures=[],forwards=[];
   const captchaPolicy={project:CLINIC_SETUP.project,serverCaptchaRequired:false,frontend:{applicationSha:CLINIC_SETUP.app,
    deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}};
   const guard=createClinicRequestGuard({actor,captchaPolicy,env:{},stage:()=> 'fixture_read',events,requestFailures:failures});
   const endpoint=`/api/clinic/events/${CLINIC_SETUP.event}`;
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    assert.equal(url.origin,CLINIC_SETUP.origin,'fixture must not forward any network request');
    return route.fulfill({status:200,contentType:url.pathname===endpoint?'application/json':'text/html',body:url.pathname===endpoint?'{}':
     `<!doctype html><h1>In-memory fixture only</h1><script>setTimeout(()=>{for(const address of ${JSON.stringify([TOOLBAR_LOADER,TURNSTILE_LOADER])}){const node=document.createElement('script');node.src=address;document.head.append(node);}setTimeout(async()=>{const r=await fetch('${endpoint}');window.fixtureRead=r.status===200;},80);},20);</script>`});
   });
   await context.route('**/*',route=>guard.route({request:()=>route.request(),abort:reason=>route.abort(reason),fallback:()=>route.fallback(),
    continue:async()=>{forwards.push('external_forward_forbidden');await route.abort();}}));
   const page=await context.newPage();page.on('requestfailed',guard.requestFailed);page.on('console',guard.consoleError);page.on('pageerror',guard.pageError);
   const next=actor==='admin'?`/partner/clinic/${CLINIC_SETUP.event}`:`/clinic/${CLINIC_SETUP.slug}`;
   await page.goto(CLINIC_SETUP.origin+'/expungement-ai/sign-in?mode=signin&next='+encodeURIComponent(next));
   await page.waitForFunction(()=>window.fixtureRead===true);
   guard.assertNoCritical();assert.equal(forwards.length,0);assert.equal(failures.length,2);
   assert.ok(failures.every(f=>f.outcome==='optional_request_failed'));await context.close();
  }
 } finally {await browser.close();}
});

import http from 'node:http';
import {once} from 'node:events';
import {createOriginalResponseObserver,originalResponse,originalResponseOperation,requireOriginalResponse,projectOriginalResponse} from './rcap-clinic-original-response.mjs';
import {captureClinicEntryResponse} from './rcap-clinic-setup-only-boundary.mjs';
const nativeId='11111111-1111-4111-8111-111111111111';
async function localServer(handler) {
 const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 return {origin:`http://127.0.0.1:${server.address().port}`,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
const browserOptions=()=>({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM??'/usr/bin/google-chrome'});
const fixtureBody=(operation,slug)=>({
 signin:{user:{id:nativeId},access_token:'private-fixture-token'},entry:{success:true,next:`/clinic/${slug}/assist`},
 assistance:{success:true,screeningUrl:`/clinic/${slug}/screening/ms`},completion:{ok:true},pending:{ok:true,claimToken:'private-fixture-claim'},
 claim:{ok:true,matterId:nativeId,redirectTo:`/briefcase/matters/${nativeId}`},
 evaluation:{jurisdiction:'MS',profileVersion:'fixture',matterId:nativeId,resultCode:'packet_ready',paymentAllowed:false,consumerPacketAvailable:false,sponsoredPacketAvailable:true,missingQuestionIds:[]},
 progress:{jurisdiction:'MS',profileVersion:'fixture',questionIds:['fixture-question']},
 reset_prepare:{success:false,prepared:true,signOutConfirmed:false},reset_close:{success:true,revocationConfirmed:true,signOutConfirmed:true},
 reset_complete:{success:true,revocationConfirmed:true,signOutConfirmed:true,cleanEntryPath:`/clinic/${slug}`}
})[operation];
const nativePaths={signin:'/auth/v1/token?grant_type=password',entry:'/api/clinic/entry',assistance:'/api/clinic/assistance/start',completion:'/api/expungement-ai/screening/complete',pending:'/api/expungement-ai/screening/pending',claim:'/api/expungement-ai/screening/pending/claim',evaluation:'/api/expungement-ai/evaluate',progress:'/api/expungement-ai/screening/progress',reset_prepare:'/api/clinic/session/reset',reset_close:'/api/clinic/session/reset',reset_complete:'/api/clinic/session/reset'};

test('native HTTP/browser original POST survives immediate navigation and document disposal with original body and cookies',async()=>{
 let operation,posts=0,receivedPayload=null,cookieAtDestination='';const slug='fixture-clinic';
 const service=await localServer(async(req,res)=>{
  if(req.method==='POST') {
   posts++;let raw='';for await(const chunk of req)raw+=chunk;receivedPayload=JSON.parse(raw);
   res.writeHead(200,{'content-type':'application/json','set-cookie':['original_a=one; HttpOnly; Path=/','original_b=two; HttpOnly; Path=/'],'cache-control':'no-store'});
   return res.end(JSON.stringify(fixtureBody(operation,slug)));
  }
  if(req.url.startsWith('/after')){cookieAtDestination=req.headers.cookie??'';res.end('<h1>Destination</h1>');return;}
  const payload={action:operation.replace('reset_',''),jurisdiction:'MS',profileVersion:'fixture',matterId:nativeId};
  res.setHeader('content-type','text/html');res.end(`<button id="go">Submit</button><script>go.onclick=async()=>{const r=await fetch(${JSON.stringify(nativePaths[operation])},{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(${JSON.stringify(payload)})});sessionStorage.setItem('originalBody',await r.text());location.href='/after';};</script>`);
 });
 const browser=await chromium.launch(browserOptions());
 try {
  for(operation of Object.keys(nativePaths)) {
   posts=0;cookieAtDestination='';const context=await browser.newContext(),evidence=[];
   const config={origin:service.origin,authOrigin:service.origin,clinicSlug:slug};
   await context.route('**/*',createOriginalResponseObserver(config,{onObservation:value=>evidence.push(value)}));
   const page=await context.newPage();await page.goto(service.origin);
   const responsePromise=page.waitForResponse(r=>originalResponseOperation(r.request(),config)===operation);
   await page.click('#go');await page.waitForURL(service.origin+'/after');const response=await responsePromise;
   assert.deepEqual(JSON.parse(await page.evaluate(()=>sessionStorage.getItem('originalBody'))),fixtureBody(operation,slug));
   // Chromium's routed Response omits Set-Cookie; verify actual cookie storage and the next request.
   assert.deepEqual((await context.cookies()).map(c=>({name:c.name,httpOnly:c.httpOnly})).sort((a,b)=>a.name.localeCompare(b.name)),[{name:'original_a',httpOnly:true},{name:'original_b',httpOnly:true}]);
   assert.match(cookieAtDestination,/original_a=one/);assert.match(cookieAtDestination,/original_b=two/);
   await page.close();await assert.rejects(response.json());assert.equal(requireOriginalResponse(response,operation).accepted,true);
   if(operation==='entry')assert.equal((await captureClinicEntryResponse(response)).accepted,true);
   assert.equal(posts,1);assert.equal(receivedPayload.profileVersion,'fixture');
   assert(!JSON.stringify(evidence).includes('private-fixture'));assert.equal(evidence.length,1);await context.close();
  }
 } finally {await browser.close();await service.close();}
});

test('native HTTP failures cannot become success merely because the page navigates to the expected destination',async()=>{
 let status=200,body='',posts=0;
 const service=await localServer(async(req,res)=>{
  if(req.method==='POST'){posts++;for await(const _ of req){}res.writeHead(status,{'content-type':'application/json'});res.end(body);return;}
  res.setHeader('content-type','text/html');res.end(req.url==='/after'?'<h1>Destination</h1>':`<button id="go">Submit</button><script>go.onclick=async()=>{const r=await fetch('/api/clinic/entry',{method:'POST',body:'{}'});await r.text();location.href='/after';};</script>`);
 });
 const browser=await chromium.launch(browserOptions());
 try {
  for(const item of [[403,JSON.stringify({success:false,error:'private-fixture-denial'}),'application_refusal'],[503,'private-upstream','application_refusal'],[200,'not JSON','malformed_response'],[200,'null','malformed_response'],[200,JSON.stringify({success:true,next:'https://outside.invalid/clinic/fixture/assist'}),'contract_mismatch'],[200,JSON.stringify({success:false}),'application_refusal']]) {
   [status,body]=item;posts=0;const context=await browser.newContext(),config={origin:service.origin,authOrigin:service.origin,clinicSlug:'fixture'};
   await context.route('**/*',createOriginalResponseObserver(config));const page=await context.newPage();await page.goto(service.origin);
   const responsePromise=page.waitForResponse(r=>originalResponseOperation(r.request(),config)==='entry');await page.click('#go');await page.waitForURL(service.origin+'/after');
   const response=await responsePromise;assert.equal(originalResponse(response,'entry').outcome,item[2]);assert.throws(()=>requireOriginalResponse(response,'entry'));assert.equal(posts,1);await context.close();
  }
 } finally {await browser.close();await service.close();}
});

test('native lost response preserves the consumed single-use effect and transport never retries the POST',async()=>{
 let posts=0,uses=0;
 const service=await localServer(async(req,res)=>{
  if(req.method==='POST') {posts++;for await(const _ of req){}if(uses===0){uses++;req.socket.destroy();return;}res.writeHead(409,{'content-type':'application/json'});res.end(JSON.stringify({success:false}));return;}
  res.setHeader('content-type','text/html');res.end(`<button id="go">Submit</button><script>go.onclick=async()=>{try{await fetch('/api/clinic/entry',{method:'POST',body:'{}'});}catch{}document.body.dataset.finished='yes';};</script>`);
 });
 const browser=await chromium.launch(browserOptions());
 try {
  const context=await browser.newContext(),evidence=[],config={origin:service.origin,authOrigin:service.origin,clinicSlug:'fixture'};
  await context.route('**/*',createOriginalResponseObserver(config,{onObservation:v=>evidence.push(v)}));const page=await context.newPage();await page.goto(service.origin);await page.click('#go');await page.waitForSelector('body[data-finished="yes"]');
  assert.equal(posts,1);assert.equal(uses,1);assert.equal(evidence[0].outcome,'transport_failure');
  // Local negative fixture only: an explicit second attempt meets the already-consumed state.
  await page.goto(service.origin);await page.click('#go');await page.waitForSelector('body[data-finished="yes"]');
  assert.equal(posts,2);assert.equal(uses,1);assert.equal(evidence[1].outcome,'application_refusal');await context.close();
 } finally {await browser.close();await service.close();}
});

test('original-response matcher refuses other origins, verbs, query strings and wrong reset phases',()=>{
 const config={origin:CLINIC_SETUP.origin,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:CLINIC_SETUP.slug};
 const request=(url,method='POST',body={})=>({url:()=>url,method:()=>method,postDataJSON:()=>body});
 for(const r of [request('https://outside.invalid/api/clinic/entry'),request(CLINIC_SETUP.origin+'/api/clinic/entry','GET'),request(CLINIC_SETUP.origin+'/api/clinic/entry?retry=1')])assert.equal(originalResponseOperation(r,config),null);
 assert.equal(originalResponseOperation(request(config.authOrigin+'/auth/v1/token?grant_type=password'),config),'signin');
 assert.equal(originalResponseOperation(request(config.authOrigin+'/auth/v1/token?grant_type=password&extra=1'),config),null);
 for(const action of ['prepare','close','complete'])assert.equal(originalResponseOperation(request(config.origin+'/api/clinic/session/reset','POST',{action}),config),'reset_'+action);
 assert.equal(projectOriginalResponse('reset_complete',200,{prepared:true,success:false},config).accepted,false);
});

test('body read failure remains distinct and never fabricates or retries a successful response',async()=>{
 let fetches=0,aborts=0,fulfills=0;const evidence=[],config={origin:CLINIC_SETUP.origin,authOrigin:'https://auth.invalid',clinicSlug:CLINIC_SETUP.slug};
 const request={url:()=>config.origin+'/api/clinic/entry',method:()=> 'POST',headers:()=>({}),postDataJSON:()=>({})};
 await createOriginalResponseObserver(config,{onObservation:v=>evidence.push(v)})({request:()=>request,fetch:async options=>{fetches++;assert.equal(options.maxRetries,0);assert.equal(options.maxRedirects,0);return {status:()=>200,body:async()=>{throw Error('private-body-read-error');}};},abort:()=>{aborts++;},fulfill:()=>{fulfills++;}});
 assert.equal(fetches,1);assert.equal(aborts,1);assert.equal(fulfills,0);assert.equal(evidence[0].outcome,'body_read_failure');assert(!JSON.stringify(evidence).includes('private-body'));
});

test('native redirects cannot replay the original POST at same-origin or external destinations',async()=>{
 let posts=0,redirectPosts=0,status=307,destination;
 const external=await localServer((req,res)=>{if(req.method==='POST')redirectPosts++;res.end('{}');});
 const service=await localServer(async(req,res)=>{
  if(req.method==='POST'){for await(const _ of req){}if(req.url==='/api/clinic/entry'){posts++;res.writeHead(status,{location:destination});}else redirectPosts++;res.end('{}');return;}
  res.setHeader('content-type','text/html');res.end(`<button id="go">Submit</button><script>go.onclick=async()=>{try{await fetch('/api/clinic/entry',{method:'POST',body:'{}'});}catch{}document.body.dataset.finished='yes';};</script>`);
 });
 const browser=await chromium.launch(browserOptions());
 try {
  for(status of [307,308])for(destination of [service.origin+'/api/clinic/assistance/start',external.origin+'/api/clinic/entry']) {
   posts=0;redirectPosts=0;const context=await browser.newContext(),evidence=[];
   await context.route('**/*',createOriginalResponseObserver({origin:service.origin,authOrigin:service.origin,clinicSlug:'fixture'},{onObservation:v=>evidence.push(v)}));
   const page=await context.newPage();await page.goto(service.origin);await page.click('#go');await page.waitForSelector('body[data-finished="yes"]');
   assert.equal(posts,1);assert.equal(redirectPosts,0);assert.deepEqual(evidence,[{operation:'entry',httpStatus:status,bodyState:'not_read',outcome:'redirect_refused',accepted:false}]);await context.close();
  }
 } finally {await browser.close();await service.close();await external.close();}
});

test('native guard permits the original observer once, confines bypass to Preview, and blocks downstream mutations',async()=>{
 const received=[];
 const service=await localServer(async(req,res)=>{
  for await(const _ of req){}received.push({path:req.url,bypass:req.headers['x-vercel-protection-bypass']??null,cookie:req.headers.cookie??''});
  res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':CLINIC_SETUP.origin,'access-control-allow-credentials':'true',
   'set-cookie':['original_a=one; HttpOnly; Secure; SameSite=None; Path=/','original_b=two; HttpOnly; Secure; SameSite=None; Path=/']});
  res.end(JSON.stringify(req.url.startsWith('/auth/')?fixtureBody('signin',CLINIC_SETUP.slug):fixtureBody('entry',CLINIC_SETUP.slug)));
 });
 const browser=await chromium.launch(browserOptions());
 try {
  const context=await browser.newContext(),events=[],failures=[],evidence=[];
  const config={origin:CLINIC_SETUP.origin,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:CLINIC_SETUP.slug};
  const guard=createClinicRequestGuard({actor:'participant',captchaPolicy:null,env:{},stage:()=> 'participant_code_redemption',events,requestFailures:failures});
  await context.route('**/*',async route=>{
   assert.equal(route.request().method(),'GET','unexpected request escaped observer/guard');
   await route.fulfill({status:200,contentType:'text/html',body:`<button id="go">Submit</button><script>go.onclick=async()=>{for(const target of ${JSON.stringify([config.authOrigin+'/auth/v1/token?grant_type=password',config.origin+'/api/clinic/entry',config.origin+'/api/clinic/session/reset'])}){try{await fetch(target,{method:'POST',body:'{}',credentials:'include'});}catch{}}document.body.dataset.finished='yes';};</script>`});
  });
  const observer=createOriginalResponseObserver(config,{bypass:'fixture-preview-bypass',onObservation:v=>evidence.push(v)});
  // Keep native browser requests and the actual guard; only route the provider to a loopback HTTP fixture.
  await context.route('**/*',route=>observer({request:()=>route.request(),fallback:()=>route.fallback(),abort:reason=>route.abort(reason),fulfill:options=>route.fulfill(options),
   fetch:async options=>{const url=new URL(route.request().url());const response=await route.fetch({...options,url:service.origin+url.pathname+url.search});assert.equal(response.headersArray().filter(h=>h.name.toLowerCase()==='set-cookie').length,2);return response;}}));
  await context.route('**/*',guard.route);
  const page=await context.newPage();page.on('response',guard.response);page.on('requestfailed',guard.requestFailed);
  await page.goto(config.origin+'/clinic/'+CLINIC_SETUP.slug);await page.click('#go');await page.waitForSelector('body[data-finished="yes"]');
  assert.deepEqual(received.map(r=>({path:r.path,bypass:r.bypass})),[{path:'/auth/v1/token?grant_type=password',bypass:null},{path:'/api/clinic/entry',bypass:'fixture-preview-bypass'}]);
  assert.deepEqual(evidence.map(v=>v.operation),['signin','entry']);assert(evidence.every(v=>v.accepted));
  assert.throws(()=>guard.assertNoCritical());assert(events.some(v=>v.outcome==='critical_blocked'));
  await context.close();
 } finally {await browser.close();await service.close();}
});

test('original response contracts reject wrong identities, result versions, continuation paths and incomplete reset',()=>{
 const config={origin:CLINIC_SETUP.origin,authOrigin:`https://${CLINIC_SETUP.project}.supabase.co`,clinicSlug:CLINIC_SETUP.slug};
 const shape={jurisdiction:'MS',profileVersion:'fixture',matterId:nativeId};
 for(const [operation,patch] of [['signin',{user:{id:'not-an-id'}}],['assistance',{screeningUrl:'/clinic/other/screening/ms'}],['evaluation',{resultCode:'invented'}],['evaluation',{profileVersion:'stale'}],['progress',{jurisdiction:'OTHER'}],['pending',{claimToken:null}],['claim',{redirectTo:'/briefcase/matters/22222222-2222-4222-8222-222222222222'}],['reset_complete',{signOutConfirmed:false}]]) {
  const value=projectOriginalResponse(operation,200,{...fixtureBody(operation,CLINIC_SETUP.slug),...patch},config,shape);
  assert.equal(value.accepted,false,operation);assert.equal(value.outcome,'contract_mismatch');
 }
});
