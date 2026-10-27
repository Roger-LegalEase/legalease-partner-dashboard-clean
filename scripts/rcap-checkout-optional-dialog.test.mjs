import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {completeHostedCheckout} from './rcap-saved-dtc-stripe-checkout-browser.mjs';
import {safeOptionalDialogReport} from './rcap-checkout-optional-dialog.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';

test('resolved redacted identity permits unique optional nonfinancial close plus one trial; mandatory/unknown/ambiguous/covered states stop',async()=>{
 const saved={launch:chromium.launch,document:globalThis.document,style:globalThis.getComputedStyle,input:globalThis.HTMLInputElement,w:globalThis.innerWidth,h:globalThis.innerHeight};
 try{for(const scenario of ['optional','unknown_close_only','mandatory','ambiguous','backdrop_remains']){
  let modalVisible=true,backdropVisible=true,closeClicks=0,trials=0,realPay=0,fresh=0,closed=0;const checkpoints=[];
  class Element{
   constructor(tag,attrs={},text=''){this.tagName=tag;this.attrs=attrs;this.textContent=text;this.innerText=text;this.children=[];this.parentElement=null;this.type=tag==='BUTTON'?'button':'text';}
   get value(){throw Error('OTP value must never be read');}get innerHTML(){throw Error('HTML must never be read');}get outerHTML(){throw Error('HTML must never be read');}
   get childElementCount(){return this.children.length;}getAttribute(key){assert(!['class','value','src'].includes(key));return this.attrs[key]??null;}
   hasAttribute(key){return Object.hasOwn(this.attrs,key);}getBoundingClientRect(){return{x:100,y:100,width:400,height:100,left:100,top:100,right:500,bottom:200};}
   contains(other){for(let n=other;n;n=n.parentElement)if(n===this)return true;return false;}matches(selector){return selector.startsWith('input')?this.tagName==='INPUT':false;}
   querySelector(selector){return selector==='title'?{textContent:'Link'}:null;}
   querySelectorAll(selector){if(selector.startsWith('h1'))return[heading];if(selector.startsWith('img'))return[logo];if(selector.startsWith('button'))return controls;return[];}
  }
  class Input extends Element{}
  const secretText='PRIVATE@example.invalid +1-555-123-9876 code: 913489 secret: AlphaSecret https://private.invalid';
  const heading=new Element('H2',{},(scenario==='mandatory'?'3D Secure verification required':scenario==='unknown_close_only'?'Verify your identity':'Sign in to Link')+' '+secretText),dialog=new Element('DIV',{role:'dialog','aria-labelledby':'private-heading-id'}),body=new Element('BODY'),mask=new Element('DIV'),otp=new Input('INPUT',{name:'one-time-code',autocomplete:'one-time-code'}),logo=new Element('svg',{'aria-label':'Link'}),button=new Element('BUTTON');
  const closeNode=new Element('BUTTON',{'aria-label':'Close'},'Close');const controls=[closeNode,...(scenario==='unknown_close_only'?[]:[new Element('BUTTON',{},'Pay as guest')])];
  const document={activeElement:otp,get cookie(){throw Error('Cookie inspection forbidden');},getElementById:id=>id==='private-heading-id'?heading:null,elementFromPoint:()=>backdropVisible?mask:button,elementsFromPoint:()=>backdropVisible?[mask,button]:[button],querySelectorAll:selector=>selector.startsWith('dialog')?(modalVisible?[dialog]:[]):selector.startsWith('input')?(modalVisible?[otp]:[]):[]};
  Object.defineProperty(body,'innerText',{get(){throw Error('Raw body inspection forbidden');}});document.body=body;dialog.ownerDocument=document;
  const append=(p,c)=>{p.children.push(c);c.parentElement=p;};append(body,mask);append(mask,dialog);append(dialog,heading);append(dialog,otp);for(const c of controls)append(dialog,c);append(body,button);
  globalThis.document=document;globalThis.HTMLInputElement=Input;globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',position:'fixed',pointerEvents:'auto',zIndex:'15'});
  const close={isVisible:async()=>modalVisible,evaluate:async fn=>fn(closeNode),click:async options=>{assert.deepEqual(options,{timeout:5000});closeClicks++;modalVisible=false;backdropVisible=scenario==='backdrop_remains';document.activeElement=body;}};
  const dialogLocator={isVisible:async()=>modalVisible,evaluate:async fn=>fn(dialog),getByRole:()=>({all:async()=>scenario==='ambiguous'?[close,close]:[close]}),waitFor:async options=>{assert.deepEqual(options,{state:'hidden',timeout:5000});assert(!modalVisible);}};
  const empty={first(){return this;},isVisible:async()=>false,all:async()=>[]};
  const submit={first(){return this;},count:async()=>1,isVisible:async()=>true,isDisabled:async()=>false,evaluate:async fn=>fn(button),scrollIntoViewIfNeeded:async options=>assert.deepEqual(options,{timeout:20000}),click:async options=>{if(options.trial!==true){realPay++;throw Error('No real Pay');}assert.deepEqual(options,{trial:true,timeout:20000});trials++;}};
  let url='https://checkout.stripe.com/c/pay/FIXTURE_ONLY';const main={url:()=>url};
  const page={frames:()=>[main],mainFrame:()=>main,url:()=>url,goto:async value=>{url=value;},waitForTimeout:async()=>{},on:()=>{},off:()=>{},evaluate:async(fn,arg)=>fn(arg),locator:selector=>selector==='dialog,[role="dialog"],[role="alertdialog"]'?{all:async()=>modalVisible?[dialogLocator]:[]}:selector==='input[autocomplete="one-time-code"]'?{first(){return this;},isVisible:async()=>modalVisible}:selector.startsWith('button')?submit:empty};
  const health=DTC.origin+'/api/health',response={url:()=>health,status:()=>200,dispose:async()=>{},json:async()=>({ok:true,checks:{db:'ok'},timestamp:'fixture'})};
  const context={newPage:async()=>page,cookies:async()=>[{name:'_vercel_jwt',domain:new URL(DTC.origin).hostname,path:'/',secure:true}],request:{get:async()=>response},close:async()=>{closed++;}};
  chromium.launch=async()=>({newContext:async()=>context,close:async()=>{closed++;}});
  const r=await completeHostedCheckout({checkoutUrl:url,expectedReturnUrl:DTC.origin+'/briefcase/'+DTC.item,previewProtectionBypassSecret:'PRIVATE_BYPASS',submitObstructionOnly:true,providerExpectedAmountCents:5000,beforeDialogInteraction:async()=>{fresh++;},beforeFinalPay:async()=>{fresh++;},onSubmitCheckpoint:async value=>{assert(!value.submitAttempted);assert.equal(value.realSubmitAttempted,false);checkpoints.push(value);}});
  assert.equal(realPay,0);assert.equal(r.submitAttempted,false);assert.equal(r.completed,false);assert.equal(closed,2);
  const optional=scenario==='optional'||scenario==='backdrop_remains';assert.equal(closeClicks,optional?1:0);assert.equal(trials,scenario==='optional'?1:0);assert.equal(fresh,scenario==='optional'?2:optional?1:0);
  assert(r.optionalDialog.labelledbyText.includes('[email]'));assert(!/PRIVATE|555|913489|AlphaSecret|https?:|private-heading-id/.test(JSON.stringify({report:r.optionalDialog,checkpoints})));
  assert.equal(checkpoints.filter(x=>x.phase==='provider_checkout_submit_actionability_before_trial').length,scenario==='optional'?1:0);
  if(scenario==='mandatory')assert.equal(r.optionalDialog.decision,'mandatory');if(scenario==='unknown_close_only')assert.equal(r.optionalDialog.decision,'unknown');
  const hostile=safeOptionalDialogReport({...r.optionalDialog,accessibleName:secretText,ariaLabel:'sk_test_secretmaterial123456789012345',headings:[secretText],cookie:'PRIVATE',value:'913489'});assert(!/PRIVATE|555|913489|AlphaSecret|https?:|sk_test_/.test(JSON.stringify(hostile)));
 }}finally{chromium.launch=saved.launch;globalThis.document=saved.document;globalThis.getComputedStyle=saved.style;globalThis.HTMLInputElement=saved.input;globalThis.innerWidth=saved.w;globalThis.innerHeight=saved.h;}
});
