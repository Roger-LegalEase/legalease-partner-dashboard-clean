import test from 'node:test';
import assert from 'node:assert/strict';
import {readCheckoutSubmitObstruction,safeCheckoutSubmitObstruction} from './rcap-checkout-submit-obstruction.mjs';

test('fixed Link identity differs from generic OTP/link text; controls and test cues retain no private labels',async()=>{
 const saved={document:globalThis.document,style:globalThis.getComputedStyle,width:globalThis.innerWidth,height:globalThis.innerHeight};
 try{for(const link of [true,false]){
  let interactions=0;
  class Element{
   constructor(tag,attrs={},text=''){this.tagName=tag;this.attrs=attrs;this.innerText=text;this.textContent=text;this.parentElement=null;this.children=[];}
   get innerHTML(){throw Error('Forbidden HTML read');}get outerHTML(){throw Error('Forbidden HTML read');}get value(){throw Error('Forbidden input value read');}
   get childElementCount(){return this.children.length;}getAttribute(key){assert(!['id','class','value','src'].includes(key));return this.attrs[key]??null;}
   hasAttribute(key){return Object.hasOwn(this.attrs,key);}getBoundingClientRect(){return{x:10,y:10,width:400,height:500,left:10,top:10,right:410,bottom:510};}
   contains(node){for(let n=node;n;n=n.parentElement)if(n===this)return true;return false;}matches(){return false;}
   querySelector(selector){return selector==='title'?{textContent:'Link'}:null;}
   querySelectorAll(selector){if(selector.startsWith('img,'))return this===dialog&&link?[logo]:[];if(selector.startsWith('button,'))return this===dialog?controls:[];return[];}
   click(){interactions++;throw Error('No clicks allowed');}focus(){interactions++;throw Error('No focus allowed');}
  }
  const privateText='PRIVATE_EMAIL@example.invalid PRIVATE_PHONE 5551239876 PRIVATE_CODE 913489';
  const body=new Element('BODY',{},'Test mode\nLink\n'+privateText),mask=new Element('DIV',{'aria-modal':'true'}),dialog=new Element('DIV',{role:'dialog','aria-label':link?'Link verification':'Verification'},(link?'Verify with Link. ':'Follow the link in your email. ')+'When testing, use any six-digit code. '+privateText),otp=new Element('INPUT',{name:'one-time-code',autocomplete:'one-time-code'}),logo=new Element('svg',{'aria-label':'Link'});
  const controls=link?[new Element('BUTTON',{},'Pay without Link'),new Element('BUTTON',{},'Use a different payment method'),new Element('BUTTON',{'aria-label':'Close dialog'}),new Element('BUTTON',{},'Verify'),new Element('BUTTON',{},privateText)]:[new Element('BUTTON',{},'Verify'),new Element('BUTTON',{'aria-label':'Close'})];
  const append=(p,c)=>{p.children.push(c);c.parentElement=p;};append(body,mask);append(mask,dialog);append(dialog,otp);for(const c of controls)append(dialog,c);
  globalThis.document={body,activeElement:otp,querySelectorAll:selector=>selector.startsWith('dialog')?[mask,dialog]:selector.startsWith('input')?[otp]:[]};
  globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',position:'fixed',pointerEvents:'auto',zIndex:'15'});globalThis.innerWidth=1280;globalThis.innerHeight=720;
  const result=await readCheckoutSubmitObstruction({evaluate:async(fn,arg)=>fn(arg)},null);
  assert.equal(result.status,'inspected');assert.equal(result.challengeClass,'one_time_code');assert.equal(result.semantics.identity,link?'link_dialog':'unknown_dialog');assert.equal(result.semantics.linkBranding,link);assert.equal(result.semantics.linkAccountDialog,link);
  assert.equal(result.semantics.testModeCueVisible,true);assert.equal(result.semantics.testAuthCueVisible,true);assert.equal(interactions,0);
  assert.deepEqual(result.semantics.offeredControls,link?['pay_without_link','use_different_payment_method','close','verify','other']:['verify','close']);
  assert(!/PRIVATE|example|5551239876|913489|https?:|<|aria-label/i.test(JSON.stringify(result)));
  const hostile=safeCheckoutSubmitObstruction({status:'inspected',semantics:{...result.semantics,identity:'PRIVATE',offeredControls:['PRIVATE','verify','verify'],message:privateText,email:privateText,phone:privateText,code:'913489',html:'<PRIVATE>',ids:privateText,values:privateText,url:'https://private.invalid'}});
  assert.deepEqual(hostile.semantics.offeredControls,['verify']);assert.equal(hostile.semantics.identity,link?'link_dialog':'unknown_dialog');assert(!/PRIVATE|913489|https?:|</.test(JSON.stringify(hostile)));
 }}finally{globalThis.document=saved.document;globalThis.getComputedStyle=saved.style;globalThis.innerWidth=saved.width;globalThis.innerHeight=saved.height;}
});
