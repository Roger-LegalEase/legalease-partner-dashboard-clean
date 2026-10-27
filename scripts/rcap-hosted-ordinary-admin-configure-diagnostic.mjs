import {ORIGIN,requestAllowed} from './rcap-hosted-ordinary-admin-readonly.mjs';
const TARGET='/internal/partners/onboarding/legalease-ordinary-qa-20261024';
const DPL='dpl_7dmD2g1xZccLiTbkJL9Xp3wCrWyF';
/** Only static source-code asset metadata; never serialize other URL query values. */
export function safeStaticAsset(url){
 let u;try{u=new URL(url,ORIGIN);}catch{return null;}
 if(u.origin!==ORIGIN||u.protocol!=='https:'||u.username||u.password||u.hash||!u.pathname.startsWith('/_next/static/')||u.pathname.length>1024)return null;
 const dpl=u.searchParams.get('dpl');return{pathname:u.pathname,queryNames:[...new Set([...u.searchParams.keys()].map(k=>['dpl','v','_rsc'].includes(k)?k:'other'))],dplCount:u.searchParams.getAll('dpl').length,dplPresent:dpl!==null,dplMatchesExpected:dpl===DPL,deploymentValue:dpl===DPL?DPL:null,currentGuardWouldAllow:requestAllowed(u.href,'GET',0)};
}
export async function collectConfigureDiagnostic(context,failedStatic){
 const page=context.pages().find(p=>{try{const u=new URL(p.url());return u.origin===ORIGIN&&u.pathname===TARGET&&!u.username&&!u.password&&!u.hash;}catch{return false;}});
 if(!page)return{available:false,reason:'exact_QA_onboarding_page_not_current'};
 const raw=await page.evaluate(()=>{
  const box=document.querySelector('#configure-program');const form=box?.querySelector('form');const buttons=[...(form?.querySelectorAll('button')??[])];const save=buttons.find(b=>b.type==='submit'&&b.textContent?.trim()==='Save program');
  const service=document.querySelector('#program-field-service_mode select');const authority=document.querySelector('#program-field-operator_authority_reference textarea, #program-field-operator_authority_reference input');
  const visible=n=>Boolean(n&&n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none');
  const reacts=n=>n?Object.getOwnPropertyNames(n).find(k=>k.startsWith('__reactProps$')):null;const formProps=reacts(form),serviceProps=reacts(service);
  const controls=(node,label)=>({present:Boolean(node),visible:visible(node),enabled:Boolean(node&&!node.matches(':disabled')),nameAbsent:!node?.getAttribute('name'),labelMatchesSource:node?.getAttribute('aria-label')===label,valid:Boolean(node?.matches(':valid'))});
  return{assetUrls:[...document.querySelectorAll('script[src],link[href]')].map(n=>n.tagName==='SCRIPT'?n.src:n.href).slice(0,128),editor:{present:Boolean(box),formPresent:Boolean(form),formValid:Boolean(form?.matches(':valid')),invalidControlCount:form?[...form.querySelectorAll('input,select,textarea')].filter(n=>n.matches(':invalid')).length:null,reactSubmitHandlerPresent:Boolean(formProps&&typeof form[formProps]?.onSubmit==='function')},save:{present:Boolean(save),visible:visible(save),enabled:Boolean(save&&!save.matches(':disabled')),labelMatchesSource:save?.textContent?.trim()==='Save program'},service:{...controls(service,'Program services'),equalsScreeningOnly:service?.value==='screening_only',equalsSponsoredPackets:service?.value==='sponsored_packets',reactChangeHandlerPresent:Boolean(serviceProps&&typeof service[serviceProps]?.onChange==='function')},authority:{...controls(authority,'Operating responsibility'),nonempty:Boolean(authority?.value?.trim()),equalsInitialReference:authority?.value==='LegalEase operates this program under its own internal business and publication authority.',equalsAuthorizedTestReference:authority?.value==='User-authorized internal RCAP acceptance allocation: one screening and one sponsored packet; no external charge.'}};
 });
 const assets=raw.assetUrls.map(safeStaticAsset).filter(Boolean);return{available:true,scope:'exact_QA_current_DOM_and_static_source_metadata_only',editor:raw.editor,save:raw.save,service:raw.service,authority:raw.authority,staticAssets:assets,staticAssetEntryCount:assets.length,failedStaticRequests:failedStatic.slice(0,64),actionsPerformed:0,customerWrites:0};
}
