import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {completeHostedCheckout} from './rcap-saved-dtc-stripe-checkout-browser.mjs';
import {createSavedCheckoutBrowser} from './rcap-hosted-saved-dtc-checkout-port.mjs';
import {safeSavedCheckoutBrowserResult} from './rcap-hosted-saved-dtc-fulfillment.mjs';
import {safeCheckoutBrowserDiagnostic} from './rcap-checkout-browser-diagnostic.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';

// Exercise the real browser flow and checkout port through in-memory Playwright ports: no browser/network/provider.
for (const scenario of ['actionable','covered','detached_frame','navigation_during_submit','provider_refusal']) {
 test(scenario,{concurrency:false},async()=>{
  const originalLaunch=chromium.launch,originalNow=Date.now,originalFetch=globalThis.fetch;
  let now=originalNow(),current='about:blank',realClicks=0,trials=0,guards=0,waitForCommit=0,closed=0,detached=false;
  const events=[],checkpoints=[];const expected=DTC.origin+'/briefcase/'+DTC.item+'?fixture=PRIVATE_SESSION';
  const main={url:()=>current};let navigationObserver=null;
  const geometry={rect:{x:20,y:30,width:140,height:40},viewport:{width:1280,height:720},intersectsViewport:true,centerHitRelation:scenario==='covered'?'other':'self',nativeDisabled:false,ariaDisabled:false,untrusted:'PRIVATE_CARD_COOKIE_URL'};
  const submit={
   first(){return this;},count:async()=>1,isVisible:async()=>true,isDisabled:async()=>false,
   evaluate:async fn=>{
    if(detached)throw Error('frame was detached PRIVATE_MESSAGE https://private.invalid/card');
    return fn.toString().includes('intersectsViewport')?geometry:{blockerClass:scenario==='covered'?'other_element':'submit_or_child',tag:scenario==='covered'?'div':'button',connected:true,disabled:false};
   },
   scrollIntoViewIfNeeded:async options=>{assert.deepEqual(options,{timeout:20000});events.push('scroll');},
   click:async options=>{
    if(options.trial===true){assert.deepEqual(options,{trial:true,timeout:20000});trials++;events.push('trial');if(scenario==='covered'){const error=Error('<div class="PRIVATE_CLASS"> intercepts pointer events PRIVATE_MESSAGE');error.name='TimeoutError';throw error;}return;}
    assert.deepEqual(options,{timeout:20000});realClicks++;events.push('click');
    if(scenario==='detached_frame'){detached=true;throw Error('frame was detached PRIVATE_MESSAGE');}
    if(scenario==='navigation_during_submit'){current='https://checkout.stripe.com/processing?PRIVATE_SESSION=PRIVATE_CARD';throw Error('Execution context was destroyed PRIVATE_MESSAGE');}
    if(scenario==='actionable'){current=expected;navigationObserver?.(main);}
   }
  };
  const empty={first(){return this;},isVisible:async()=>false,all:async()=>[],count:async()=>0,allInnerTexts:async()=>{throw Error('Raw provider refusal text must not be read');}};
  const email={first(){return this;},isVisible:async()=>true,click:async()=>{},fill:async()=>{}};
  const page={
   frames:()=>[main],mainFrame:()=>main,url:()=>current,
   locator:selector=>selector==='body'?{innerText:async()=>'$0.00'}:selector==='input[name="email"]'?email:selector==='[role="alert"]'?{...empty,isVisible:async()=>scenario==='provider_refusal'&&realClicks===1}:selector.startsWith('button')?submit:empty,
   goto:async url=>{current=url;},waitForTimeout:async ms=>{now+=ms;},waitForLoadState:async()=>{},
   waitForURL:async()=>{waitForCommit++;throw Error('fixture has no expected committed return');},
   evaluate:async()=>false,on:(event,fn)=>{assert.equal(event,'framenavigated');navigationObserver=fn;},off:()=>{navigationObserver=null;}
  };
  const health=DTC.origin+'/api/health';const response={url:()=>health,status:()=>200,dispose:async()=>{},json:async()=>({ok:true,checks:{db:'ok'},timestamp:'fixture'})};
  const context={newPage:async()=>page,addCookies:async()=>{},cookies:async()=>[{name:'_vercel_jwt',value:'PRIVATE_COOKIE',domain:new URL(DTC.origin).hostname,path:'/',secure:true}],request:{get:async()=>response},close:async()=>{closed++;}};
  chromium.launch=async()=>({newContext:async()=>context,close:async()=>{closed++;}});Date.now=()=>now;
  globalThis.fetch=async()=>{throw Error('No remote requests permitted');};
  try{
   const complete=createSavedCheckoutBrowser({completeHostedCheckout:args=>completeHostedCheckout({...args,prepareSubmitActionability:true,onSubmitCheckpoint:async value=>checkpoints.push(value)}),ownerAuthUserId:DTC.owner,ownerEmail:'fixture@rcap-acceptance.test',sessionCookies:[{domain:new URL(DTC.origin).hostname,name:'sb-'+DTC.project+'-auth-token',secure:true}],previewProtectionBypassSecret:'PRIVATE_BYPASS',beforeFinalPay:async inspection=>{assert.equal(inspection.inspectionComplete,true);guards++;events.push('fresh_guard');}});
   const raw=await complete({checkoutUrl:'https://checkout.stripe.com/c/pay/FIXTURE_ONLY',expectedReturnUrl:expected});
   const result=safeSavedCheckoutBrowserResult(raw);
   assert.equal(trials,1);assert.equal(closed,2);
   assert.equal(realClicks,scenario==='covered'?0:1);assert.equal(guards,scenario==='covered'?0:1);
   assert.equal(result.submitAttempted,scenario!=='covered');
   assert.equal(result.completed,scenario==='actionable');
   const forward=checkpoints.filter(x=>x.phase==='provider_checkout_submit_before_forward');const after=checkpoints.filter(x=>x.phase==='provider_checkout_submit_after_attempt');
   assert.equal(forward.length,scenario==='covered'?0:1);assert.equal(after.length,scenario==='covered'?0:1);
   if(after.length){assert.equal(forward[0].submitAttempted,false);assert.equal(after[0].submitAttempted,true);assert.deepEqual(events,['scroll','trial','fresh_guard','click']);}
   if(scenario==='covered'){assert.equal(result.failureReason,'submit_actionability_failed');assert.equal(result.diagnostic.errorClass,'TimeoutError');assert.equal(result.diagnostic.buttonGeometry.centerHitRelation,'other');}
   if(scenario==='detached_frame'){assert.equal(result.failureReason,'browser_operation_failed');assert.equal(result.diagnostic.phase,'submit_click');assert.equal(result.diagnostic.errorClass,'Error');assert.equal(result.diagnostic.buttonGeometry,null);assert.equal(waitForCommit,1);}
   if(scenario==='navigation_during_submit'){assert.equal(result.failureReason,'browser_operation_failed');assert.equal(result.diagnostic.phase,'submit_click');assert.equal(result.diagnostic.navigation,'provider_checkout');assert.equal(waitForCommit,1);}
   if(scenario==='provider_refusal'){assert.equal(await page.locator('[role="alert"]').isVisible(),true);assert.equal(result.failureReason,'return_not_observed');assert.equal(result.diagnostic.phase,'return_diagnostics');assert.equal(result.diagnostic.errorClass,'None');assert.equal(result.diagnostic.navigation,'provider_checkout');assert(!raw.notes.some(x=>x.includes('PRIVATE')));}
   const retained=JSON.stringify({result,checkpoints});assert(!/PRIVATE|https?:|cardNumber|cookie|stack|message/i.test(retained));
   const hostile=safeCheckoutBrowserDiagnostic({phase:'PRIVATE_PHASE',errorClass:'PRIVATE_CLASS',navigation:'PRIVATE_URL',buttonGeometry:{...geometry,rect:{x:Infinity,y:'PRIVATE',width:140,height:40}},message:'PRIVATE_MESSAGE',stack:'PRIVATE_STACK'});
   assert.equal(hostile.phase,'unclassified_phase');assert.equal(hostile.errorClass,'UnknownError');assert.equal(hostile.navigation,'unknown');assert.equal(hostile.buttonGeometry.rect.x,null);assert.equal(hostile.buttonGeometry.rect.y,null);assert(!JSON.stringify(hostile).includes('PRIVATE'));
  }finally{chromium.launch=originalLaunch;Date.now=originalNow;globalThis.fetch=originalFetch;}
 });
}
