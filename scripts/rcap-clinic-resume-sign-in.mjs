import assert from 'node:assert/strict';
import {ACCEPTANCE_ORIGIN,SIGN_IN_NEXT_PATHS,observedTokenIdentity} from './rcap-clinic-resume-network-policy.mjs';
const submissions=new WeakMap();
// Install before application scripts in every replacement document. This does
// not submit, intercept React, fabricate auth, or repair the shipped form.
// A native fallback must never serialize password fields into a navigation.
export async function installSignInSafety(context){
 const pages=new WeakMap();submissions.set(context,pages);
 await context.exposeBinding('__rcapReportSignInSubmit',({page},event)=>{const events=pages.get(page)??[];if(events.length<10)events.push({...Object.fromEntries(['handledByApplication','nativeFallbackBlocked','emailPresent','passwordPresent'].map(k=>[k,event?.[k]===true])),readyDocument:typeof event?.readyDocument==='string'?event.readyDocument:null});pages.set(page,events);});
 await context.addInitScript(()=>{
  const events=[];Object.defineProperty(window,'__rcapSignInSafety',{value:events});
  window.addEventListener('submit',event=>{
   const form=event.target;
   if(location.pathname!=='/expungement-ai/sign-in'||!(form instanceof HTMLFormElement)||!form.querySelector('input[name="password"]'))return;
   const handled=event.defaultPrevented;
   if(!handled)event.preventDefault();
   const result={handledByApplication:handled,nativeFallbackBlocked:!handled,emailPresent:Boolean(form.querySelector('input[name="email"]')?.value),passwordPresent:Boolean(form.querySelector('input[name="password"]')?.value)};
   if(events.length<10)events.push(result);
   void window.__rcapReportSignInSubmit({...result,readyDocument:window.rcapSignInReadyDocument??null}).catch(()=>{});
  });
 });
}
export async function signInWithRealForm({context,origin,email,password,next,observe=()=>{}}){
 assert.ok(SIGN_IN_NEXT_PATHS.includes(next),'exact sign-in destination required');
 assert.ok(submissions.has(context),'pre-document sign-in safety required');
 const page=await context.newPage();const started=Date.now();const proof={acceptance:false,stage:'opening',interactive:false,inputPresence:false,authRequestObserved:false,authResponseObserved:false,scriptErrors:0,documentRequests:0,queryNames:[],submitEvents:[]};
 const publish=()=>observe({...proof,elapsedMs:Date.now()-started,queryNames:[...proof.queryNames],submitEvents:[...proof.submitEvents]});
 const tokenRequest=r=>{const u=new URL(r.url());return u.origin===ACCEPTANCE_ORIGIN&&u.pathname==='/auth/v1/token'&&r.method()==='POST';};
 page.on('pageerror',()=>{proof.scriptErrors++;});
 page.on('request',r=>{const u=new URL(r.url());if(r.isNavigationRequest()&&r.frame()===page.mainFrame()){proof.documentRequests++;proof.queryNames=[...u.searchParams.keys()].map(k=>['mode','next','email','password'].includes(k)?k:'other');}if(tokenRequest(r))proof.authRequestObserved=true;});
 try{
  await page.goto(`${origin}/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(next)}`,{waitUntil:'domcontentloaded'});
  const readyDocument=await page.evaluate(()=>{const id=crypto.randomUUID();window.rcapSignInReadyDocument=id;return id;});
  const sameDocument=async()=>assert.equal(await page.evaluate(()=>window.rcapSignInReadyDocument??null),readyDocument,'sign-in document changed after readiness');
  proof.stage='waiting_component';publish();
  // React attaches props before this observable interaction. Wait for that
  // attachment without a timer; then prove the REAL component state changes.
  // This is only a locked-runtime readiness locator, not the acceptance proof.
  await page.waitForFunction(()=>{const input=document.querySelector('input[name="password"]');const b=input?.parentElement?.querySelector('button[type="button"]');return b&&Object.keys(b).some(k=>k.startsWith('__reactProps$')&&typeof b[k]?.onClick==='function');});
  proof.stage='proving_interactivity';publish();
  const emailInput=page.locator('input[name="email"]'),passwordInput=page.locator('input[name="password"]');
  assert.equal(await emailInput.inputValue(),'','readiness occurs before credentials');assert.equal(await passwordInput.inputValue(),'','readiness occurs before credentials');
  await page.getByRole('button',{name:'Show password',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('input[name="password"]')?.type==='text');
  await page.getByRole('button',{name:'Hide password',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('input[name="password"]')?.type==='password');
  await sameDocument();
  assert.equal(proof.scriptErrors,0,'client script failed before credential entry');
  proof.interactive=true;publish();
  proof.stage='filling';publish();
  await sameDocument();
  await emailInput.fill(email);await passwordInput.fill(password);
  assert.equal(await emailInput.inputValue(),email,'email input changed during initialization');assert.equal(await passwordInput.inputValue(),password,'password input changed during initialization');
  await sameDocument();
  proof.inputPresence=true;publish();
  proof.stage='submitting';publish();
  // Arm once and consume the rejection immediately even if click itself fails.
  const response=page.waitForResponse(r=>tokenRequest(r.request())).then(value=>({value}),()=>({failed:true}));
  await sameDocument();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const result=await response;
  const submitted=[...(submissions.get(context).get(page)??[])];
  proof.submitEvents=submitted.map(({readyDocument,...flags})=>flags);proof.submittedOnReadyDocument=submitted.length===1&&submitted[0].readyDocument===readyDocument;publish();
  assert.equal(proof.submittedOnReadyDocument,true,'readiness must belong to the submitted document');
  assert.ok(proof.submitEvents.length===1&&proof.submitEvents[0].handledByApplication&&!proof.submitEvents[0].nativeFallbackBlocked,'sign-in submit was not handled exactly once by the application');assert.ok(!result.failed,'sign-in auth response not observed');const r=result.value;proof.authResponseObserved=true;proof.authResponseCategory=r.status()===200?'success':'refused';proof.stage='auth_response';publish();
  assert.equal(r.status(),200,'sign-in authentication refused');const identity=observedTokenIdentity(r.request());assert.equal(identity?.status,200,'network must retain returned identity before navigation');
  proof.stage='navigation';publish();
  await page.waitForURL(u=>u.origin===origin&&u.pathname===next);
  proof.stage='complete';publish();return {p:page,id:identity.id};
 }catch{
  // No raw Playwright error/call log: it can contain a credential-bearing URL
  // or a fill value. Diagnostics contain only fixed categories and booleans.
  publish();throw new Error('Clinic sign-in failed; see sanitized sign-in diagnostics');
 }
}
