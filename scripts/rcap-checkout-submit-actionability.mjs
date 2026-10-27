import assert from'node:assert/strict';import{safeCheckoutBrowserDiagnostic,safeCheckoutButtonGeometry}from'./rcap-checkout-browser-diagnostic.mjs';
const blockers=new Set(['submit_or_child','dialog','iframe','alert','other_element','outside_viewport','no_element','unavailable']);const tags=new Set(['button','input','iframe','dialog','div','span','other','none']);
async function safeHitTarget(submit){let x;try{x=await submit.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const top=document.elementFromPoint(x,y);const mine=top===el||el.contains(top);return{blockerClass:x<0||y<0||x>innerWidth||y>innerHeight?'outside_viewport':!top?'no_element':mine?'submit_or_child':top.closest('[role="dialog"]')?'dialog':top.tagName==='IFRAME'?'iframe':top.closest('[role="alert"]')?'alert':'other_element',tag:top?['BUTTON','INPUT','IFRAME','DIALOG','DIV','SPAN'].includes(top.tagName)?top.tagName.toLowerCase():'other':'none',connected:el.isConnected,disabled:typeof el.disabled==='boolean'?el.disabled:null};});}catch{x={};}return{blockerClass:blockers.has(x?.blockerClass)?x.blockerClass:'unavailable',tag:tags.has(x?.tag)?x.tag:'other',connected:typeof x?.connected==='boolean'?x.connected:null,disabled:typeof x?.disabled==='boolean'?x.disabled:null};}
export function classifyTrialActionabilityFailure(error){
 const message=typeof error?.message==='string'?error.message:'';const pointer=/intercepts pointer events/i.test(message);const outside=/outside (?:of )?(?:the )?viewport/i.test(message);const hidden=/element is not visible/i.test(message);const unstable=/element is not stable/i.test(message);const disabled=/element is not enabled/i.test(message);const detached=/element was detached|not attached to the DOM|frame was detached/i.test(message);const unique=/strict mode violation/i.test(message);const navigation=/waiting for (?:scheduled )?navigations|navigation interrupted/i.test(message);
 const line=message.split('\n').find(x=>/intercepts pointer events/i.test(x))??'';const tag=/<(button|input|iframe|dialog|div|span)\b/i.exec(line)?.[1]?.toLowerCase()??'unknown';return{reason:pointer?'pointer_events_intercepted':outside?'outside_viewport':hidden?'not_visible':unstable?'not_stable':disabled?'not_enabled':detached?'detached':unique?'locator_not_unique':navigation?'navigation_wait':'unclassified',interceptorTag:tag,subtreeIntercepted:pointer&&/subtree intercepts pointer events/i.test(line),scrolledIntoView:/done scrolling/i.test(message),retryObserved:/retrying click action/i.test(message)};
}
export async function trialCheckoutSubmitActionability({submit,checkpoint}){assert.equal(typeof submit?.click,'function');assert.equal(typeof checkpoint,'function');const hitTargetBefore=await safeHitTarget(submit);await checkpoint({phase:'provider_checkout_submit_actionability_before_trial',trial:true,realSubmitAttempted:false});const started=Date.now();let status='passed',diagnostic=null,actionabilityFailure=null;try{await submit.click({trial:true,timeout:20000});}catch(error){status='failed';actionabilityFailure=classifyTrialActionabilityFailure(error);diagnostic=safeCheckoutBrowserDiagnostic({phase:'submit_click',errorClass:error?.name});}const hitTargetAfter=await safeHitTarget(submit);const result={trial:true,realSubmitAttempted:false,status,diagnostic,actionabilityFailure,hitTargetBefore,hitTargetAfter,elapsedMs:Date.now()-started};await checkpoint({phase:'provider_checkout_submit_actionability_after_trial',...result});return result;}

export const checkoutSubmitSelectors = Object.freeze([
 'button[data-testid="hosted-payment-submit-button"]', 'button:has-text("Pay")',
 'button:has-text("Complete order")', 'button:has-text("Place order")', 'button[type="submit"]'
]);
export async function readCheckoutSubmitGeometry(submit) {
 try{return safeCheckoutButtonGeometry(await submit.evaluate(el => {
  const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
  const top=document.elementFromPoint(x,y);
  const n=v=>Number.isFinite(v)?Math.round(v):null;
  return {rect:{x:n(r.x),y:n(r.y),width:n(r.width),height:n(r.height)},
   viewport:{width:n(innerWidth),height:n(innerHeight)},
   intersectsViewport:r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,
   centerHitRelation:top===el?'self':el.contains(top)?'child':top?'other':'none',
   nativeDisabled:el.disabled===true,ariaDisabled:el.getAttribute('aria-disabled')==='true'};
 }));}catch{return null;}
}
export async function prepareGuardedCheckoutSubmit({page,submit,selectedIndex,checkpoint,authorize}) {
 assert(Number.isInteger(selectedIndex)&&selectedIndex>=0&&selectedIndex<checkoutSubmitSelectors.length);
 const counts=await Promise.all(checkoutSubmitSelectors.map(selector=>page.locator(selector).count()));
 const before=await readCheckoutSubmitGeometry(submit);
 await checkpoint({phase:'provider_checkout_submit_normal_preparation_before',selectedIndex,counts,geometry:before});
 if(counts[selectedIndex]!==1)return {status:'failed',reason:'ambiguous_submit'};
 const {billingBlurred}=await prepareCheckoutSubmitNormally({page,submit});
 const prepared=await readCheckoutSubmitGeometry(submit);
 await checkpoint({phase:'provider_checkout_submit_normal_preparation_after',selectedIndex,counts,billingBlurred,geometry:prepared});
 const trial=await trialCheckoutSubmitActionability({submit,checkpoint});
 if(trial.status!=='passed'||trial.hitTargetAfter.blockerClass!=='submit_or_child')return {status:'failed',reason:'submit_actionability_failed',trial};
 if(await page.locator(checkoutSubmitSelectors[selectedIndex]).count()!==1)return {status:'failed',reason:'ambiguous_submit',trial};
 await authorize();
 return {status:'passed',trial};
}

export async function prepareCheckoutSubmitNormally({page,submit}){
 // Filling does not blur billing inputs; finish that normal UI interaction before scrolling.
 const billingBlurred=await page.evaluate(()=>{
  const el=document.activeElement;
  if(!(el instanceof HTMLInputElement)||!['text','tel'].includes(el.type))return false;
  const billing=['billingName','billingPostalCode','billingAddressLine1','billingAddressLine2','billingLocality','billingAdministrativeArea'];
  if(!billing.includes(el.name)&&!billing.includes(el.id))return false;
  el.blur();return true;
 });
 await submit.scrollIntoViewIfNeeded({timeout:20000});
 return{billingBlurred};
}
