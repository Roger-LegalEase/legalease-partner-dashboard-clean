import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareGuardedCheckoutSubmit} from './rcap-checkout-submit-actionability.mjs';

test('normal billing blur and scroll precede trial; failure, ambiguity and obstruction cannot authorize Pay',async()=>{
 for(const scenario of ['pass','timeout','overlay','ambiguous','unknown_focus','authorization_refused']){
  const events=[], records=[];
  class Input {constructor(){this.type='text';this.name=scenario==='unknown_focus'?'unknown':'billingPostalCode';this.id='';}blur(){events.push('blur');}}
  const oldDocument=globalThis.document,oldInput=globalThis.HTMLInputElement;
  globalThis.document={activeElement:new Input()};globalThis.HTMLInputElement=Input;
  let realClicks=0;
  const submit={
   evaluate:async fn=>fn.toString().includes('intersectsViewport')?{rect:{x:1,y:2,width:100,height:30},viewport:{width:1280,height:720},intersectsViewport:true,centerHitRelation:'self',nativeDisabled:false,ariaDisabled:false}:{blockerClass:scenario==='overlay'?'other_element':'submit_or_child',tag:scenario==='overlay'?'div':'button',connected:true,disabled:false},
   scrollIntoViewIfNeeded:async options=>{assert.deepEqual(options,{timeout:20000});events.push('scroll');},
   click:async options=>{if(options.trial!==true){realClicks++;events.push('pay');return;}assert.deepEqual(options,{trial:true,timeout:20000});events.push('trial');if(scenario==='timeout'){const error=new Error('<div class="PRIVATE"> intercepts pointer events');error.name='TimeoutError';throw error;}}
  };
  const page={locator:()=>({count:async()=>scenario==='ambiguous'?2:1}),evaluate:async fn=>fn()};
  try{
   const result=await prepareGuardedCheckoutSubmit({page,submit,selectedIndex:0,checkpoint:async x=>records.push(x),authorize:async()=>{events.push('fresh_guard');if(scenario==='authorization_refused')throw new Error('guard refused');}});
   if(result.status==='passed')await submit.click({timeout:20000});
   assert.equal(realClicks,['pass','unknown_focus'].includes(scenario)?1:0);
   if(scenario==='pass')assert.deepEqual(events,['blur','scroll','trial','fresh_guard','pay']);
   if(scenario==='unknown_focus')assert.deepEqual(events,['scroll','trial','fresh_guard','pay']);
   if(scenario==='timeout')assert.equal(result.trial.actionabilityFailure.reason,'pointer_events_intercepted');
   if(['timeout','overlay','ambiguous'].includes(scenario))assert(!events.includes('fresh_guard'));
   assert.equal(JSON.stringify(records).includes('PRIVATE'),false);
  }catch(error){assert.equal(scenario,'authorization_refused');assert.equal(error.message,'guard refused');assert.equal(realClicks,0);}
  finally{globalThis.document=oldDocument;globalThis.HTMLInputElement=oldInput;}
 }
 const browser=fs.readFileSync(new URL('./rcap-saved-dtc-stripe-checkout-browser.mjs',import.meta.url),'utf8');
 assert(browser.includes('if (prepareSubmitActionability && !submitActionabilityOnly)'));
 assert(browser.indexOf("if (preparation.status !== 'passed') return")<browser.indexOf('await checkpointSubmit("provider_checkout_submit_before_forward")'));
 assert(browser.includes('authorize:authorizeFinalPay'));
 const runtime=fs.readFileSync(new URL('./rcap-hosted-saved-dtc-runtime.mjs',import.meta.url),'utf8');
 assert(runtime.includes('prepareSubmitActionability:existing'));
});
