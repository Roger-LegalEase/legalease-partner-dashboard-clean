import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {completeHostedCheckout} from './rcap-saved-dtc-stripe-checkout-browser.mjs';
import {safeCheckoutSubmitObstruction} from './rcap-checkout-submit-obstruction.mjs';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';

test('NoPay structural DIV identity is bounded; normal preparation never clicks; genuine OTP is classified and never answered',async()=>{
 const saved={launch:chromium.launch,document:globalThis.document,style:globalThis.getComputedStyle,width:globalThis.innerWidth,height:globalThis.innerHeight,input:globalThis.HTMLInputElement};
 try{for(const challenge of [false,true]){
  let clicks=0,scrolls=0,blurs=0,guards=0,closed=0;const checkpoints=[];
  class Element{
   constructor(tag,attributes={},position='static',r={x:0,y:0,width:1280,height:720}){this.tagName=tag;this.attributes=attributes;this.children=[];this.parentElement=null;this.style={display:'block',visibility:'visible',pointerEvents:'auto',position,zIndex:'2147483647'};this.r=r;}
   get childElementCount(){return this.children.length;}
   get className(){throw Error('Forbidden raw class read');}
   getAttribute(key){assert(!['class','id','value','src','title'].includes(key));return this.attributes[key]??null;}
   hasAttribute(key){return Object.hasOwn(this.attributes,key);}
   getBoundingClientRect(){const r=this.r;return{...r,left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height};}
   contains(other){for(let el=other;el;el=el.parentElement)if(el===this)return true;return false;}
   matches(selector){return selector===':modal'?this.attributes.modal===true:selector===':popover-open'?false:false;}
  }
  class Input extends Element{constructor(){super('INPUT',{name:challenge?'one-time-code':'billingPostalCode',autocomplete:challenge?'one-time-code':'postal-code'});this.type='text';this.name=challenge?'one-time-code':'billingPostalCode';this.id='';}blur(){blurs++;document.activeElement=body;}}
  const html=new Element('HTML'),body=new Element('BODY'),form=new Element('FORM'),button=new Element('BUTTON',{},'relative',{x:713,y:580,width:380,height:55}),mask=new Element('DIV',{role:'presentation','aria-modal':'true'},'fixed'),hit=new Element('DIV',{role:'PRIVATE_ROLE'},'absolute',{x:600,y:500,width:600,height:220}),input=new Input();
  const append=(parent,child)=>{parent.children.push(child);child.parentElement=parent;};append(html,body);append(body,form);append(form,input);append(form,button);append(body,mask);append(mask,hit);
  globalThis.document={activeElement:input,elementFromPoint:()=>hit,elementsFromPoint:()=>[hit,mask,button,form],querySelectorAll:selector=>selector.startsWith('dialog')?[mask]:selector.startsWith('input')&&challenge?[input]:[]};
  globalThis.getComputedStyle=el=>el.style;globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.HTMLInputElement=Input;
  const main={url:()=>checkout};let checkout='https://checkout.stripe.com/c/pay/FIXTURE_ONLY';
  const submit={first(){return this;},isVisible:async()=>true,isDisabled:async()=>false,evaluate:async fn=>fn(button),scrollIntoViewIfNeeded:async options=>{assert.deepEqual(options,{timeout:20000});scrolls++;},click:async()=>{clicks++;throw Error('Neither trial nor real click is allowed');}};
  const empty={first(){return this;},isVisible:async()=>false,all:async()=>[]};const email={first(){return this;},isVisible:async()=>true,click:async()=>{},fill:async()=>{}};
  const page={frames:()=>[main],mainFrame:()=>main,url:()=>checkout,goto:async url=>{checkout=url;},waitForTimeout:async()=>{},evaluate:async(fn,arg)=>fn(arg),on:()=>{},off:()=>{},locator:selector=>selector==='body'?{innerText:async()=>'$0.00'}:selector==='input[autocomplete="one-time-code"]'?{first(){return this;},isVisible:async()=>challenge}:selector==='input[name="email"]'?email:selector.startsWith('button')?submit:empty};
  const health=DTC.origin+'/api/health',response={url:()=>health,status:()=>200,dispose:async()=>{},json:async()=>({ok:true,checks:{db:'ok'},timestamp:'fixture'})};
  const context={newPage:async()=>page,cookies:async()=>[{name:'_vercel_jwt',domain:new URL(DTC.origin).hostname,path:'/',secure:true,value:'PRIVATE_COOKIE'}],request:{get:async()=>response},close:async()=>{closed++;}};
  chromium.launch=async()=>({newContext:async()=>context,close:async()=>{closed++;}});
  const result=await completeHostedCheckout({checkoutUrl:checkout,expectedReturnUrl:DTC.origin+'/briefcase/'+DTC.item,previewProtectionBypassSecret:'PRIVATE_BYPASS',email:'fixture@rcap-acceptance.test',submitObstructionOnly:true,providerExpectedAmountCents:0,beforeFinalPay:async()=>{guards++;},onSubmitCheckpoint:async value=>{assert.equal(value.diagnosticOnly,true);assert.equal(value.trial,false);assert.equal(value.realSubmitAttempted,false);checkpoints.push(value);}});
  assert.equal(result.submitAttempted,false);assert.equal(result.completed,false);assert.equal(clicks,0);assert.equal(closed,2);
  const after=result.submitObstruction.after;assert.equal(after.status,'inspected');assert.equal(after.challengeClass,challenge?'one_time_code':'unknown_modal');
  if(challenge){assert.equal(result.humanInteractionRequired,true);assert.equal(result.failureReason,'provider_challenge');assert.equal(scrolls,0);assert.equal(blurs,0);assert.equal(guards,0);assert.equal(checkpoints.length,1);}
  else{assert.equal(scrolls,1);assert.equal(blurs,1);assert.equal(guards,1);assert.equal(checkpoints.length,2);assert.equal(after.hitAncestors[0].tag,'div');assert.equal(after.hitAncestors[0].role,'unknown');assert.equal(after.hitAncestors[1].ariaModal,true);assert.equal(after.hitAncestors[1].position,'fixed');assert.equal(after.hitAncestors[1].zIndex,2147483647);assert.equal(after.hitAncestors[1].coversViewport,true);assert.equal(after.visibleModalSurfaces[0].hitRelation,'ancestor');assert.equal(after.ancestorsTruncated,false);assert.equal(after.hitAncestors[0].siblingIndex,0);assert.equal(result.submitObstruction.before.focus,'billing');assert.equal(after.focus,'body');}
  assert(!/PRIVATE|https?:|className|cookie|\"value\"|message|</i.test(JSON.stringify({after,checkpoints})));
  const hostile=safeCheckoutSubmitObstruction({status:'inspected',focus:'PRIVATE',hitAncestors:Array(20).fill({tag:'PRIVATE',role:'PRIVATE',position:'PRIVATE',className:'PRIVATE',zIndex:'PRIVATE',rect:{x:'PRIVATE'}}),hitStack:[],signals:{oneTimeCode:true},url:'PRIVATE'});
  assert.equal(hostile.hitAncestors.length,8);assert.equal(hostile.challengeClass,'one_time_code');assert(!JSON.stringify(hostile).includes('PRIVATE'));
 }}finally{chromium.launch=saved.launch;globalThis.document=saved.document;globalThis.getComputedStyle=saved.style;globalThis.innerWidth=saved.width;globalThis.innerHeight=saved.height;globalThis.HTMLInputElement=saved.input;}
});
