import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {completeHostedCheckout} from './rcap-saved-dtc-stripe-checkout-browser.mjs';
import {createSavedCheckoutBrowser} from './rcap-hosted-saved-dtc-checkout-port.mjs';
import {assertReadyExistingCheckout} from './rcap-dtc-existing-fulfillment.mjs';
import {safeSavedCheckoutBrowserResult} from './rcap-hosted-saved-dtc-fulfillment.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';

// Real browser flow/owner checkout port, in-memory DOM and Playwright ports; no browser, provider, or worker.
for(const scenario of ['success','email_prompt','no_prompt','not_enabled','mandatory','unknown','close_refused','ambiguous_close','backdrop_remains','no_card','before_close_state_changed','after_close_state_changed','trial_covered','final_guard_failed','forward_checkpoint_failed','real_click_uncertain','second_prompt','captcha','after_trial_prompt','after_trial_prompt_unknown','after_trial_prompt_state_changed','after_trial_prompt_retrial_failed'])test(scenario,{concurrency:false},async()=>{
 const saved={launch:chromium.launch,document:globalThis.document,style:globalThis.getComputedStyle,input:globalThis.HTMLInputElement,w:globalThis.innerWidth,h:globalThis.innerHeight,fetch:globalThis.fetch};
 let latePromptOpened=false;
 let modal=!scenario.startsWith('after_trial_prompt')&&scenario!=='no_prompt'&&scenario!=='email_prompt',mask=modal,closeClicks=0,payClicks=0,trials=0,closed=0;
 let current='about:blank',observer=null;const events=[],checkpoints=[];
 const expected=DTC.origin+'/briefcase/'+DTC.item+'?payment=return&session_id=PRIVATE_SESSION';
 class Element{
  constructor(tag,attrs={},text=''){this.tagName=tag;this.attrs=attrs;this.innerText=this.textContent=text;this.type=tag==='BUTTON'?'button':'text';this.children=[];this.parentElement=null;this.isConnected=true;this.disabled=false;this.validity={valid:true};}
  get value(){if(this.attrs.autocomplete==='one-time-code')throw Error('OTP read forbidden');return 'SYNTHETIC';}get innerHTML(){throw Error('HTML read forbidden');}get outerHTML(){throw Error('HTML read forbidden');}
  get childElementCount(){return this.children.length;}getAttribute(k){assert(!['src','class','value'].includes(k));return this.attrs[k]??null;}hasAttribute(k){return Object.hasOwn(this.attrs,k);}
  getBoundingClientRect(){return{x:20,y:30,width:140,height:40,left:20,top:30,right:160,bottom:70};}
  contains(n){for(;n;n=n.parentElement)if(n===this)return true;return false;}matches(s){return s.startsWith('input')&&this.attrs.autocomplete==='one-time-code';}closest(){return null;}
  querySelectorAll(s){return s.startsWith('h1')?headings:s.startsWith('button')?controls:[];}
 }
 class Input extends Element{}
 const body=new Element('BODY'),dialog=new Element('DIV',{role:'dialog'}),backdrop=new Element('DIV'),pay=new Element('BUTTON'),otp=new Input('INPUT',{autocomplete:'one-time-code',name:'one-time-code'}),card=new Input('INPUT',{name:'cardNumber',required:''}),closeNode=new Element('BUTTON',{'aria-label':'Close'});
 const controls=[new Element('BUTTON',{},(scenario==='unknown'||scenario==='after_trial_prompt_unknown')?'Other provider':'Link'),closeNode,new Element('BUTTON',{},'Send code PRIVATE@example.invalid')],headings=scenario==='mandatory'?[new Element('H2',{},'3D Secure verification required')]:[];
 const append=(p,n)=>{p.children.push(n);n.parentElement=p;};append(body,backdrop);append(backdrop,dialog);append(dialog,otp);append(body,pay);
 const document={activeElement:otp,get cookie(){throw Error('Cookie read forbidden');},getElementById:()=>null,elementFromPoint:()=>mask?backdrop:pay,elementsFromPoint:()=>mask?[backdrop,pay]:[pay],querySelectorAll:s=>s.startsWith('dialog')?(modal?[dialog]:[]):s.startsWith('input')?(modal?[otp]:[]):s.includes('iframe')&&s.includes('captcha')&&scenario==='captcha'?[pay]:[]};dialog.ownerDocument=document;
 const empty={first(){return this;},all:async()=>[],count:async()=>0,isVisible:async()=>false};
 const field={first(){return this;},all:async()=>[field],isVisible:async()=>!modal&&scenario!=='no_card',isDisabled:async()=>false,evaluate:async fn=>fn(card),click:async()=>{assert(!modal);},fill:async()=>{assert(!modal);}};
 const email={...field,fill:async()=>{if(['email_prompt','second_prompt'].includes(scenario)){modal=true;mask=true;document.activeElement=otp;}}};
 const close={isVisible:async()=>modal,isEnabled:async()=>true,evaluate:async fn=>fn(closeNode),click:async o=>{assert.deepEqual(o,{timeout:5000});closeClicks++;events.push('close');if(scenario==='close_refused')throw Error('Close refused');modal=false;mask=scenario==='backdrop_remains';document.activeElement=body;}};
 const dl={isVisible:async()=>modal,evaluate:async fn=>fn(dialog),getByRole:()=>({all:async()=>scenario==='ambiguous_close'?[close,close]:[close]}),waitFor:async o=>{assert.deepEqual(o,{state:'hidden',timeout:5000});assert(!modal);}};
 const submit={first(){return this;},count:async()=>{if(scenario.startsWith('after_trial_prompt')&&trials===1&&!latePromptOpened){latePromptOpened=true;modal=true;mask=true;document.activeElement=otp;}return 1;},isVisible:async()=>true,isDisabled:async()=>false,evaluate:async fn=>fn(pay),scrollIntoViewIfNeeded:async o=>{assert.deepEqual(o,{timeout:20000});events.push('scroll');},click:async o=>{
  if(o.trial===true){assert.deepEqual(o,{trial:true,timeout:20000});trials++;events.push('trial');if(scenario==='trial_covered'||scenario==='after_trial_prompt_retrial_failed'&&trials===2)throw Object.assign(Error('<div> intercepts pointer events'),{name:'TimeoutError'});return;}
  assert.deepEqual(o,{timeout:20000});payClicks++;events.push('pay');if(scenario==='real_click_uncertain')throw Error('Provider click interrupted');current=expected;observer?.(main);
 }};
 const main={url:()=>current};
 const page={mainFrame:()=>main,frames:()=>[main],url:()=>current,goto:async u=>{current=u;},waitForTimeout:async()=>{},waitForLoadState:async()=>{},on:(_,fn)=>{observer=fn;},off:()=>{},evaluate:async(fn,arg)=>fn(arg),locator:s=>s==='dialog,[role="dialog"],[role="alertdialog"]'?{all:async()=>modal?[dl]:[]}:s==='body'?{innerText:async()=>'$50.00'}:s==='input[autocomplete="one-time-code"]'?{...empty,isVisible:async()=>modal}:s==='input:not([type=hidden]), select'?{all:async()=>[field]}:s==='input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select'?empty:s==='input[name="email"]'?email:s.startsWith('input[name="card')||s==='input[name="billingPostalCode"]'||s==='input[autocomplete="cc-number"]'?field:s.startsWith('button')?submit:empty};
 const health=DTC.origin+'/api/health',response={url:()=>health,status:()=>200,dispose:async()=>{},json:async()=>({ok:true,checks:{db:'ok'},timestamp:'fixture'})};
 const context={newPage:async()=>page,addCookies:async()=>{},cookies:async()=>[{name:'_vercel_jwt',domain:new URL(DTC.origin).hostname,path:'/',secure:true}],request:{get:async()=>response},close:async()=>{closed++;}};
 try{
  globalThis.document=document;globalThis.HTMLInputElement=Input;globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',position:'fixed',pointerEvents:'auto',zIndex:'15'});globalThis.fetch=async()=>{throw Error('Network forbidden');};chromium.launch=async()=>({newContext:async()=>context,close:async()=>{closed++;}});
  const complete=createSavedCheckoutBrowser({completeHostedCheckout:args=>completeHostedCheckout({...args,prepareSubmitActionability:true,continueObservedLinkCard:scenario!=='not_enabled',beforeDialogInteraction:async phase=>{events.push(phase);if(phase==='before_link_dialog_close'&&['before_close_state_changed','after_trial_prompt_state_changed'].includes(scenario)||phase==='after_link_dialog_close'&&scenario==='after_close_state_changed')throw Error('Current own state changed');},onSubmitCheckpoint:async v=>{checkpoints.push(v);if(v.phase==='provider_checkout_submit_before_forward'&&scenario==='forward_checkpoint_failed')throw Error('Durable marker failed');}}),ownerAuthUserId:DTC.owner,ownerEmail:'fixture@rcap-acceptance.test',sessionCookies:[{domain:new URL(DTC.origin).hostname,name:'sb-'+DTC.project+'-auth-token',secure:true}],previewProtectionBypassSecret:'PRIVATE_BYPASS',beforeFinalPay:async inspection=>{assertReadyExistingCheckout(inspection);events.push('final_fresh_guard');if(scenario==='final_guard_failed')throw Error('Window or own provider state changed');}});
  const raw=await complete({checkoutUrl:'https://checkout.stripe.com/c/pay/FIXTURE_ONLY',expectedReturnUrl:expected}),safe=safeSavedCheckoutBrowserResult(raw);
  const pays=['success','email_prompt','no_prompt','real_click_uncertain','after_trial_prompt'].includes(scenario),trial=['success','email_prompt','no_prompt','trial_covered','final_guard_failed','forward_checkpoint_failed','real_click_uncertain','after_trial_prompt','after_trial_prompt_unknown','after_trial_prompt_state_changed','after_trial_prompt_retrial_failed'].includes(scenario);
  assert.equal(payClicks,pays?1:0);assert.equal(trials,scenario==='after_trial_prompt'||scenario==='after_trial_prompt_retrial_failed'?2:trial?1:0);assert(closeClicks<=1);assert.equal(closed,2);assert.equal(safe.submitAttempted,pays);assert.equal(safe.completed,['success','email_prompt','no_prompt','after_trial_prompt'].includes(scenario));
  if(scenario==='after_trial_prompt')assert.deepEqual(events,['scroll','trial','before_link_dialog_close','close','after_link_dialog_close','scroll','trial','final_fresh_guard','pay']);
  if(scenario==='success'||scenario==='email_prompt')assert.deepEqual(events,['before_link_dialog_close','close','after_link_dialog_close','scroll','trial','final_fresh_guard','pay']);
  if(scenario==='second_prompt')assert.equal(closeClicks,1);if(scenario==='before_close_state_changed')assert.equal(closeClicks,0);if(scenario==='after_close_state_changed')assert.equal(closeClicks,1);
  const after=checkpoints.filter(v=>v.phase==='provider_checkout_submit_after_attempt');assert.equal(after.length,pays?1:0);if(after.length)assert.equal(after[0].submitAttempted,true);
  for(const v of checkpoints.filter(v=>v.optionalDialog)){assert.equal(v.optionalDialog.decision,['mandatory','captcha'].includes(scenario)?'mandatory':'unknown');assert.equal(v.optionalDialog.actionBasis,['mandatory','captcha','unknown','after_trial_prompt_unknown'].includes(scenario)?'none':'observed_link_card_continuation');}
  assert(!/PRIVATE|https?:|secret|password/i.test(JSON.stringify({safe,checkpoints})));
 }finally{chromium.launch=saved.launch;globalThis.document=saved.document;globalThis.getComputedStyle=saved.style;globalThis.HTMLInputElement=saved.input;globalThis.innerWidth=saved.w;globalThis.innerHeight=saved.h;globalThis.fetch=saved.fetch;}
});
