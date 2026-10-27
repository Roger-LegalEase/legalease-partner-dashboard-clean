// Read-only DOM. Text/accessible labels stay in page memory; only closed classifications leave it.
import {safeCheckoutButtonGeometry} from './rcap-checkout-browser-diagnostic.mjs';
const tags=['div','iframe','dialog','button','input','select','ul','li','span','form','section','body','html','other'];
const roles=['dialog','alertdialog','alert','status','listbox','option','combobox','menu','menuitem','tooltip','presentation','none','unknown'];
const positions=['static','relative','absolute','fixed','sticky','unknown'];
const modalStates=['native_modal','open_dialog','aria_modal','dialog_role','popover','none','unknown'];
const choose=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
const number=value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=10000000?Math.round(value):null;
const bool=value=>typeof value==='boolean'?value:null;
const rect=value=>Object.fromEntries(['x','y','width','height'].map(key=>[key,number(value?.[key])]));
function node(value){return{tag:choose(value?.tag,tags,'other'),role:choose(value?.role,roles,'unknown'),ariaModal:bool(value?.ariaModal),modalState:choose(value?.modalState,modalStates,'unknown'),position:choose(value?.position,positions,'unknown'),pointerEvents:choose(value?.pointerEvents,['auto','none','other'],'other'),zIndex:typeof value?.zIndex==='number'&&Number.isInteger(value.zIndex)&&Math.abs(value.zIndex)<=2147483648?value.zIndex:null,rect:rect(value?.rect),coversViewport:bool(value?.coversViewport),submitRelation:choose(value?.submitRelation,['self','child','ancestor','unrelated','none'],'none'),hitRelation:choose(value?.hitRelation,['self','child','ancestor','unrelated','none'],'none'),focusRelation:choose(value?.focusRelation,['self','contains_focus','inside_focus','unrelated','none'],'none'),siblingIndex:number(value?.siblingIndex),childCount:number(value?.childCount)};}
const controlCategories=['pay_without_link','use_different_payment_method','close','verify','continue','other'];
function safeSemantics(value){
 const dialogPresent=bool(value?.dialogPresent),linkBranding=bool(value?.linkBranding),linkAccountDialog=bool(value?.linkAccountDialog);
 return{dialogPresent,linkBranding,linkAccountDialog,identity:dialogPresent===true?(linkBranding===true||linkAccountDialog===true?'link_dialog':'unknown_dialog'):dialogPresent===false?'no_visible_dialog':'unavailable',offeredControls:Array.isArray(value?.offeredControls)?[...new Set(value.offeredControls.filter(x=>controlCategories.includes(x)))].slice(0,6):[],testModeCueVisible:bool(value?.testModeCueVisible),testAuthCueVisible:bool(value?.testAuthCueVisible)};
}
export function safeCheckoutSubmitObstruction(value){
 const signals=Object.fromEntries(['oneTimeCode','challengeFrame','captchaFrame','visibleModal'].map(key=>[key,bool(value?.signals?.[key])]));
 return{status:value?.status==='inspected'?'inspected':'unavailable',...(Object.hasOwn(value??{},'semantics')?{semantics:safeSemantics(value.semantics)}:{}),buttonGeometry:safeCheckoutButtonGeometry(value?.buttonGeometry),focus:choose(value?.focus,['billing','card','email','one_time_code','submit','other_control','body','none','unknown'],'unknown'),signals,challengeClass:signals.oneTimeCode?'one_time_code':signals.captchaFrame?'captcha_frame':signals.challengeFrame?'challenge_frame':signals.visibleModal?'unknown_modal':Object.values(signals).every(x=>x===false)?'none':'unknown',hitStackTruncated:bool(value?.hitStackTruncated),ancestorsTruncated:bool(value?.ancestorsTruncated),hitStack:Array.isArray(value?.hitStack)?value.hitStack.slice(0,4).map(node):[],hitAncestors:Array.isArray(value?.hitAncestors)?value.hitAncestors.slice(0,8).map(node):[],visibleModalSurfaces:Array.isArray(value?.visibleModalSurfaces)?value.visibleModalSurfaces.slice(0,3).map(node):[]};
}
function capture(submit){
 const allowedTags=['div','iframe','dialog','button','input','select','ul','li','span','form','section','body','html'];
 const allowedRoles=['dialog','alertdialog','alert','status','listbox','option','combobox','menu','menuitem','tooltip','presentation'];
 const active=document.activeElement;let hitTarget=null;
 const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse';};
 const matches=(el,selector)=>{try{return el.matches(selector);}catch{return false;}};
 const describe=el=>{
  const r=el.getBoundingClientRect(),s=getComputedStyle(el),rawRole=el.getAttribute('role'),aria=el.getAttribute('aria-modal');
  const role=!rawRole?'none':allowedRoles.includes(rawRole)?rawRole:'unknown';
  const modalState=matches(el,':modal')?'native_modal':el.tagName==='DIALOG'&&el.hasAttribute('open')?'open_dialog':aria==='true'?'aria_modal':['dialog','alertdialog'].includes(role)?'dialog_role':matches(el,':popover-open')?'popover':'none';
  return{tag:allowedTags.includes(el.tagName.toLowerCase())?el.tagName.toLowerCase():'other',role,ariaModal:aria==='true'?true:aria==='false'?false:null,modalState,position:['static','relative','absolute','fixed','sticky'].includes(s.position)?s.position:'unknown',pointerEvents:['auto','none'].includes(s.pointerEvents)?s.pointerEvents:'other',zIndex:/^-?\d+$/.test(s.zIndex)?Number(s.zIndex):null,rect:{x:r.x,y:r.y,width:r.width,height:r.height},coversViewport:r.left<=0&&r.top<=0&&r.right>=innerWidth&&r.bottom>=innerHeight,submitRelation:!submit?'none':el===submit?'self':submit.contains(el)?'child':el.contains(submit)?'ancestor':'unrelated',hitRelation:!hitTarget?'none':el===hitTarget?'self':el.contains(hitTarget)?'ancestor':hitTarget.contains(el)?'child':'unrelated',focusRelation:!active?'none':el===active?'self':el.contains(active)?'contains_focus':active.contains(el)?'inside_focus':'unrelated',siblingIndex:el.parentElement?Array.prototype.indexOf.call(el.parentElement.children,el):null,childCount:el.childElementCount};
 };
 const r=submit?.getBoundingClientRect(),x=r?r.left+r.width/2:null,y=r?r.top+r.height/2:null;
 const top=r?document.elementFromPoint(x,y):null;hitTarget=top;
 const stack=r?document.elementsFromPoint(x,y):[],hitStack=stack.slice(0,4).map(describe);
 const hitAncestors=[];let ancestor=top;for(;ancestor&&hitAncestors.length<8;ancestor=ancestor.parentElement)hitAncestors.push(describe(ancestor));
 const modals=Array.from(document.querySelectorAll('dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"]')).filter(visible);
 const dialogs=modals.filter(el=>el.tagName==='DIALOG'||['dialog','alertdialog'].includes(el.getAttribute('role')));
 const dialog=dialogs.find(el=>el.contains(active))??dialogs.find(el=>top&&el.contains(top))??dialogs[0]??null;
 const normalize=text=>String(text??'').slice(0,16000).replace(/\s+/g,' ').trim().toLowerCase();
 const dialogLabel=normalize(dialog?.getAttribute('aria-label'));
 const headingTexts=dialog?Array.from(dialog.querySelectorAll('h1,h2,h3,[role="heading"]')).filter(visible).slice(0,6).map(n=>n.innerText??n.textContent??''):[];
 const labelText=dialog?(dialog.getAttribute('aria-labelledby')??'').split(/\s+/).filter(Boolean).slice(0,4).map(id=>dialog.ownerDocument.getElementById(id)?.textContent??'').join(' '):'';
 const dialogText=normalize([dialogLabel,labelText,...headingTexts].join(' '));
 const brandNodes=dialog?Array.from(dialog.querySelectorAll('img,svg,[role="img"],h1,h2,h3,[role="heading"]')).filter(visible).slice(0,24):[];
 const linkBranding=brandNodes.some(el=>[el.getAttribute('aria-label'),el.getAttribute('alt'),el.tagName.toLowerCase()==='svg'?el.querySelector('title')?.textContent:null,/^h[123]$/i.test(el.tagName)||el.getAttribute('role')==='heading'?el.innerText??el.textContent:null].some(text=>/^(?:link|link by stripe|link logo|pay with link)$/.test(normalize(text))));
 const linkAccountDialog=Boolean(dialog)&&(/\b(?:log in to link|sign in to link|your link account|verify with link|link verification|link authentication)\b/.test(dialogText)||/^(?:link|link account|verify with link|log in to link|sign in to link|link verification|link authentication)$/.test(dialogLabel));
 const offeredControls=[];for(const el of dialog?Array.from(dialog.querySelectorAll('button,[role="button"],a')).filter(visible).slice(0,16):[]){
  const labels=[el.getAttribute('aria-label'),el.getAttribute('title'),el.innerText??el.textContent].map(normalize);
  const category=labels.some(x=>['pay without link','continue without link','checkout without link'].includes(x))?'pay_without_link':labels.some(x=>['use a different payment method','use another payment method','choose a different payment method'].includes(x))?'use_different_payment_method':labels.some(x=>['close','close dialog','close modal','dismiss'].includes(x))?'close':labels.some(x=>['verify','verify code','verify and continue'].includes(x))?'verify':labels.includes('continue')?'continue':'other';if(!offeredControls.includes(category))offeredControls.push(category);
 }
 const testModeCueVisible=Array.from(document.querySelectorAll('[role="status"],[role="note"],h1,h2,h3')).filter(visible).slice(0,24).some(n=>/^(?:test mode|test environment|sandbox|sandbox mode)$/.test(normalize(n.innerText??n.textContent)));
 const testAuthCueVisible=/\b(?:test mode|sandbox|when testing)\b/.test(dialogText)&&/\b(?:verification code|authentication code|test code|one-time code|any six-digit code|any 6-digit code)\b/.test(dialogText);
 const semantics={dialogPresent:Boolean(dialog),linkBranding,linkAccountDialog,offeredControls,testModeCueVisible,testAuthCueVisible};
 const present=selector=>Array.from(document.querySelectorAll(selector)).some(visible);
 const name=active?.getAttribute('name'),autocomplete=active?.getAttribute('autocomplete');
 const focus=!active?'none':active===submit?'submit':active.tagName==='BODY'?'body':autocomplete==='one-time-code'||name==='one-time-code'?'one_time_code':['cardNumber','cardExpiry','cardCvc'].includes(name)?'card':['billingName','billingPostalCode','billingAddressLine1','billingAddressLine2','billingLocality','billingAdministrativeArea','billingCountry'].includes(name)?'billing':name==='email'||autocomplete==='email'?'email':'other_control';
 return{status:'inspected',semantics,buttonGeometry:r?{rect:{x:r.x,y:r.y,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},intersectsViewport:r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight,centerHitRelation:top===submit?'self':submit.contains(top)?'child':top?'other':'none',nativeDisabled:submit.disabled===true,ariaDisabled:submit.getAttribute('aria-disabled')==='true'}:null,focus,signals:{oneTimeCode:present('input[autocomplete="one-time-code"],input[name="one-time-code"],input[id*="one-time-code" i]'),challengeFrame:present('iframe[title*="challenge" i]'),captchaFrame:present('iframe[title*="captcha" i]'),visibleModal:modals.length>0},hitStackTruncated:stack.length>4,ancestorsTruncated:Boolean(ancestor),hitStack,hitAncestors,visibleModalSurfaces:modals.slice(0,3).map(describe)};
}
export async function readCheckoutSubmitObstruction(page,submit){
 try{return safeCheckoutSubmitObstruction(submit?await submit.evaluate(capture):await page.evaluate(capture,null));}catch{return safeCheckoutSubmitObstruction(null);}
}
