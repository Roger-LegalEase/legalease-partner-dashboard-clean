import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

// Public Briefcase surfaces must not show a raw engine token (result code, care state or status value), in EN or ES:
// not in visible text, not in assistive attributes, not in any attribute value. Found by the GA17 render probe at
// c6c715713: PaymentsView printed "Packet: ready" / "not ready" (also in ES), and the review page's unavailable branch
// carried data-result-code. --mutation=<name> restores one exposure (or adds a raw code) and must fail.
const root=process.cwd(),require=createRequire(root+'/package.json'),ts=require('typescript');
register('./lib/ts-esm-loader.mjs',import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-13';
const VIEWS=root+'/src/components/expungement-ai/BriefcaseViews.tsx',REVIEW=root+'/src/app/briefcase/[packetId]/review/page.tsx';
const READY_LINE='{item.artifact.status === "ready" ? <LocalizedText k="packet.display.RCOPY-28a386a1003aa04eb354" fallback="Packet ready" /> : <LocalizedText k="commercial.unavailable" fallback="Packet not available yet" />}';
const MUTATIONS={
  payments_raw_status:[VIEWS,READY_LINE,'<LocalizedText k="briefcase.packet_label" fallback="Packet" />: {item.artifact.status === "ready" ? "ready" : "not ready"}'],
  payments_raw_result_code:[VIEWS,READY_LINE,READY_LINE+' {item.resultCode}'],
  review_data_result_code:[REVIEW,'data-authority-status={item ? item.authorityStatus : "no_item"}','data-authority-status={item ? item.authorityStatus : "no_item"}\n          data-result-code={item?.resultCode ?? ""}']
};
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
if(mutation)assert(MUTATIONS[mutation],'unknown mutation');
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#rawtokens'+Buffer.from(name).toString('hex'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const mutate=(file,source)=>{if(!mutation||MUTATIONS[mutation][0]!==file)return source;const [,from,to]=MUTATIONS[mutation];assert(source.includes(from),'mutation target absent');console.error(JSON.stringify({appliedMutation:mutation}));return source.replace(from,to);};
const localizationFile=root+'/src/components/expungement-ai/LocalizationProvider.tsx';
compile(localizationFile,fs.readFileSync(localizationFile,'utf8')+'\nexport {LocalizationContext};');
compile(VIEWS,mutate(VIEWS,fs.readFileSync(VIEWS,'utf8')));
let review=mutate(REVIEW,fs.readFileSync(REVIEW,'utf8'));
for(const[from,to]of [['import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";','const requireConsumerBriefcaseSession=async()=>({userId:"synthetic-raw-tokens"});'],
 ['import { getBriefcaseItem } from "@/lib/expungement-ai/briefcase";','const getBriefcaseItem=async()=>({id:"synthetic-raw-tokens",state:"MS"});'],
 ['import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";','const decorateBriefcaseItemForPresentation=async()=>(globalThis as any).__rawTokensView;'],
 ['import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;']]){assert(review.includes(from),from);review=review.replace(from,to);}
compile(REVIEW,review);
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {PaymentsView}=await import(pathToFileURL(VIEWS).href);
const Review=(await import(pathToFileURL(REVIEW).href)).default;
const {resolveRuntimeText,t}=await import('../src/lib/expungement-ai/localization.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(root+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')).href);
const renderIn=(locale,tree)=>render(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){},prefetch(){},back(){},forward(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(k,f,v)=>t(locale,k,f,v),text:(x,o)=>resolveRuntimeText(locale,x,o)}},tree)));

// One real decorated MS matter (display-only seams: no auth, DB or HTTP), varied over every code and status.
const answers=structuredClone(JSON.parse(fs.readFileSync('scripts/lib/ms-exact-timing-pre-calendar-clock-fixtures.json')).rows.find(r=>r.branch==='mip-sentence-no-fine').answers);
const profile=getProfileByJurisdiction('MS'),item={id:'synthetic-raw-tokens',jurisdiction:'MS',state:'MS',createdAt:'2026-10-13T00:00:00Z',artifactRefs:{}};
const base=await decorate({consumerAuthUserId:'synthetic-raw-tokens',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:false,reason:'protected_verification_authority_missing'}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:item.id,answers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-raw-tokens',claimedAt:item.createdAt,partnerBenefitActive:false,partnerSlug:null}}),evaluateAuthoritative:evaluate,readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
const CODES=['packet_ready','packet_ready_with_caution','needs_more_info','not_yet','guidance_only','not_covered_yet','likely_not_eligible','needs_review','hard_stop'];
const RAW=[...CODES,'saved','waiting','needs_attention','completed','denied','trusted_source','unverified','invalidated','facts_complete','in_progress','not_started','sponsored','unpaid','absent','ready','not ready','unavailable','paid','refunded'];
const ready={status:'ready',canDownload:true,source:'source_driven_packet_plan',packetId:'p1',packetPlanId:null,generatedAt:'2026-10-13T00:00:00Z',documents:[{kind:'full',fileName:'packet.pdf'}]};
const absent={status:'absent',canDownload:false,documents:[]};
const history={amountCents:4900,currency:'USD',status:'paid',receipt:null,noCharge:false};
let checks=0;
const check=(name,fn)=>{try{fn();checks++;}catch(error){console.error(name);throw error;}};
const decode=s=>s.replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').trim();
const rawIn=html=>{
  const text=html.replace(/<[^>]+>/g,'\n').split('\n').map(decode).filter(Boolean);
  const attrs=[...html.matchAll(/\s([a-zA-Z-]+)="([^"]*)"/g)].map(([,name,value])=>({name,value:decode(value)}));
  const hits=[];
  for(const s of text)for(const r of RAW)if(new RegExp(`(^|[:(]\\s*)${r}(\\s*[).]?$)`).test(s))hits.push(`text "${s}"`);
  for(const s of text)for(const tok of s.match(/\b[a-z]+(?:_[a-z]+)+\b/g)??[])hits.push(`text token ${tok} in "${s}"`);
  for(const {name,value}of attrs){
    if(name==='data-result-code')hits.push('data-result-code attribute');
    if(CODES.includes(value))hits.push(`${name}="${value}"`);
    if(/^(aria-label|aria-valuetext|title|alt|placeholder)$/.test(name))for(const r of RAW)if(new RegExp(`(^|[:(]\\s*)${r}(\\s*[).]?$)`).test(value))hits.push(`${name}="${value}"`);
  }
  return hits;
};
// The two reviewed pairs the payment row now uses must resolve to Spanish (no English fallback in ES).
check('payment-row packet copy is reviewed EN/ES',()=>{
  assert.deepEqual([t('en','packet.display.RCOPY-28a386a1003aa04eb354','x'),t('es','packet.display.RCOPY-28a386a1003aa04eb354','x')],['Packet ready','Paquete listo']);
  assert.deepEqual([t('en','commercial.unavailable','x'),t('es','commercial.unavailable','x')],['Packet not available yet','Paquete aún no disponible']);
});
for(const resultCode of CODES)for(const [art,artifact]of [['absent',absent],['ready',ready]])for(const paymentState of ['unpaid','paid','sponsored']){
  const view={...base,resultCode,artifact,paymentState,paymentHistory:history};
  for(const locale of ['en','es']){
    const label=t(locale,art==='ready'?'packet.display.RCOPY-28a386a1003aa04eb354':'commercial.unavailable','x'),payments=renderIn(locale,React.createElement(PaymentsView,{items:[view]}));
    check(`PaymentsView ${resultCode}/${art}/${paymentState}/${locale}: reviewed packet copy, no raw token`,()=>{
      assert(decode(payments).includes(label),label);
      assert.deepEqual(rawIn(payments),[]);
    });
    globalThis.__rawTokensView=view;
    const page=renderIn(locale,await Review({params:Promise.resolve({packetId:item.id})}));
    check(`review page ${resultCode}/${art}/${paymentState}/${locale}: no raw token`,()=>assert.deepEqual(rawIn(page),[]));
  }
}
delete globalThis.__rawTokensView;
console.log(JSON.stringify({status:'PASS_BRIEFCASE_RAW_STATUS_TOKENS',checks,mutations:Object.keys(MUTATIONS),
  limits:['SSR of PaymentsView and the review page with display-only seams; no auth, DB, HTTP or browser.','The enumeration across all Briefcase views and the detail page is the GA17 render probe (review-evidence/ga17/raw-codes).']}));
