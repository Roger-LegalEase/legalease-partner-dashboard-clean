import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {register,createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const root=process.cwd(),require=createRequire(import.meta.url),out=process.env.MD_JUVENILE_UI_EVIDENCE;
assert(out && path.isAbsolute(out) && !fs.existsSync(out),'fresh external evidence directory');fs.mkdirSync(out,{recursive:true});
register('./lib/ts-esm-loader.mjs',import.meta.url);
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const load=p=>import(pathToFileURL(root+'/'+p));
const compile=(file,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(file).toString('hex'),{data:{url:pathToFileURL(file).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=root+'/src/components/expungement-ai/LocalizationProvider.tsx';compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc));
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(root+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')));
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const original = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', offense_level: 'Misdemeanor', possible_pathway_context: 'Juvenile expungement', age_at_offense: '30', prior_relief: 'Yes', pardon_status: 'No', sentence_completion_date: 'Yes', financial_obligations: 'Yes', pending_cases: 'No', resolved_timing_bucket: 'gt_10_years', state_exclusion_categories: ['None of these'] };
const owner='synthetic-md-ui-owner',item={id:'synthetic-md-ui-matter',jurisdiction:'MD',artifactRefs:{}},profile=getProfileByJurisdiction('MD');
const authoritative=evaluate({jurisdiction:'MD',profileVersion:profile.profileVersion,matterId:item.id,answers:original});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:original,packetAnswers:{},dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-19T00:00:00.000Z'});
let stored={status:'unverified',reason:'synthetic-md-ui',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot,hash:null,snapshot:null};
const initial=structuredClone(stored);let requestOwner=owner,casConflict=false;const http=[],checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const present=()=>decorate({consumerAuthUserId:owner,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MD',profileVersion:profile.profileVersion,matterId:item.id,answers:original,product:'expungement_ai_dtc',sourceSessionId:'synthetic-md-ui-source',claimedAt:'2026-10-19T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__mdUi={requireConsumerBriefcaseSession:async()=>({userId:requestOwner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:requestOwner}),getBriefcaseItem:async(user,id)=>user===owner&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{if(casConflict)return{ok:false,reason:'protected_verification_transition_refused'};assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored};},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substituted seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substituted authority')}};
const substitute=(source,bindings,module)=>{const re=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(re.test(source),module);return source.replace(re,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mdUi.'+b+'(...args);').join('\n'));};
async function page(file){let source=fs.readFileSync(root+'/'+file,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";').replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(root+'/'+file,source);return(await load(file)).default;}
const Matter=await page('src/app/briefcase/[packetId]/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx');
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const params={params:Promise.resolve({packetId:item.id})},matter=await Matter(params);
const parentObservation={hasPreparationLink:html(matter,'en').includes('?preparation=md-juvenile'),recordUnchanged:JSON.stringify(stored)===JSON.stringify(initial)};fs.writeFileSync(out+'/matter-observation.json',JSON.stringify(parentObservation,null,2)+'\n');
check('MD preparation reachable from actual matter',()=>assert(parentObservation.hasPreparationLink));
const menu=await Edit({...params,searchParams:Promise.resolve({preparation:'md-juvenile'})});
for(const locale of ['en','es']){const markup=html(menu,locale);fs.writeFileSync(out+'/menu-'+locale+'.html',markup);check('all exact document questions reachable '+locale,()=>{for(const q of P.mdJuvenilePreparationModelFor(stored).questions)assert(markup.includes('edit='+q.id),q.id);});}
const edit=await Edit({...params,searchParams:Promise.resolve({preparation:'md-juvenile',edit:'md_juvenile_case_number'})});
const props=nodes(edit).find(n=>n.props.itemId===item.id&&Array.isArray(n.props.questions))?.props;
check('actual page forwards only MD preparation mode',()=>{assert(props?.mdJuvenilePreparation);assert.equal(props.gaPardonPreparation,false);assert.equal(props.mtDeferredPreparation,false);assert.equal(props.caJuvenilePreparation,false);assert.deepEqual(props.questions.map(q=>q.id),['md_juvenile_case_number']);});
check('page reads preserve whole protected record',()=>assert.deepEqual(stored,initial));
const apiFile='src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';let apiSource=fs.readFileSync(root+'/'+apiFile,'utf8');
for(const[bindings,module]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,bindings,module);
compile(root+'/'+apiFile,apiSource);const API=await load(apiFile),apiContext={params:Promise.resolve({itemId:item.id})};
const {webpack}=require('next/dist/compiled/webpack/webpack'),{chromium}=require('playwright');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'md-preparation-ui-'));
let browser;
async function currentProps(id='md_juvenile_case_number') {
  const tree=await Edit({...params,searchParams:Promise.resolve({preparation:'md-juvenile',edit:id})});
  return nodes(tree).find(n=>n.props.itemId===item.id&&Array.isArray(n.props.questions))?.props;
}
try {
  fs.writeFileSync(temp+'/loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
  fs.writeFileSync(temp+'/entry.tsx',`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{AppRouterContext}from'next/dist/shared/lib/app-router-context.shared-runtime';import{PacketInformationBuilder}from ${JSON.stringify(root+'/src/components/expungement-ai/PacketInformationBuilder.tsx')};import{LocalizationProvider,useLocalization}from ${JSON.stringify(root+'/src/components/expungement-ai/LocalizationProvider.tsx')};const router={push:p=>window.__navigation.push(p),replace:p=>window.__navigation.push(p),refresh:()=>{}};window.__navigation=[];function Case(){const{setLocale,locale}=useLocalization();const[state,setState]=useState(null);window.__mount=(props,language)=>{setLocale(language);setState({props,key:Math.random()})};return <><output data-locale>{locale}</output>{state?<PacketInformationBuilder key={state.key} {...state.props}/>:null}</>};createRoot(document.getElementById('root')).render(<AppRouterContext.Provider value={router}><LocalizationProvider><Case/></LocalizationProvider></AppRouterContext.Provider>);`);
  await new Promise((resolve,reject)=>{
    const compiler=webpack({mode:'none',devtool:false,entry:temp+'/entry.tsx',target:'web',output:{path:temp,filename:'browser.js'},resolve:{extensions:['.tsx','.ts','.js','.json'],alias:{'@':root+'/src'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:temp+'/loader.cjs'}]},plugins:[new webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development'),'process.env':JSON.stringify({NODE_ENV:'development'})})],optimization:{minimize:false}});
    compiler.run((error,stats)=>compiler.close(close=>error||close||stats.hasErrors()?reject(error||close||Error(stats.toString({all:false,errors:true}))):resolve()));
  });
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(req.url()==='https://md-juvenile-ui.invalid/')return route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>'});
    if(url.origin==='https://md-juvenile-ui.invalid'&&url.pathname===`/api/expungement-ai/briefcase/${item.id}/packet-information`){
      const method=req.method(),response=await API[method](new Request(req.url(),{method,headers:{'content-type':'application/json'},...(method==='POST'?{body:req.postData()}: {})}),apiContext),value=await response.json();
      http.push({method,url:req.url(),status:response.status,input:method==='POST'?req.postDataJSON():null,value});
      return route.fulfill({status:response.status,contentType:'application/json',body:JSON.stringify(value)});
    }
    errors.push('unexpected network '+req.url());return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>{errors.push(String(error));fs.writeFileSync(out+'/browser-errors.json',JSON.stringify(errors));});
  await page.goto('https://md-juvenile-ui.invalid/');await page.addScriptTag({content:fs.readFileSync(temp+'/browser.js','utf8')});
  await page.waitForFunction(()=>typeof window.__mount==='function');
  async function mount(locale,id='md_juvenile_case_number') {
    await page.evaluate(({props,locale})=>window.__mount(props,locale),{props:await currentProps(id),locale});
    await page.waitForFunction(locale=>document.querySelector('output[data-locale]')?.textContent===locale,locale);
    await page.locator(`[data-packet-question="${id}"]`).waitFor();
  }
  async function save(locale,status=200) {
    const response=page.waitForResponse(r=>r.request().method()==='POST');
    await page.getByRole('button',{name:locale==='es'?'Guardar':'Save',exact:true}).click();
    const r=await response;assert.equal(r.status(),status,JSON.stringify(await r.json()));
    await page.getByRole('button',{name:locale==='es'?'Guardar':'Save',exact:true}).isEnabled();
    await page.waitForFunction(()=>![...document.querySelectorAll('button')].some(b=>b.textContent==='Saving...'||b.textContent==='Guardando...'));
  }
  for(const locale of ['en','es']) {
    await mount(locale);
    const input=page.locator('[data-packet-question="md_juvenile_case_number"] input[type=text]'),value='J-2020-01234-'+locale;
    assert((await page.locator('[data-packet-question="md_juvenile_case_number"] h3').innerText()).includes(locale==='es'?props.questions[0].translations.es.prompt:props.questions[0].prompt));
    await input.fill(value);await save(locale);
    check('browser saves through MD mode '+locale,()=>{assert.deepEqual(stored.draftSnapshot.packetAnswers.md_juvenile_case_number,{value,unknown:false});assert(http.at(-1).url.endsWith('?preparation=md-juvenile'));assert.deepEqual(stored.draftSnapshot.screeningAnswers,initial.draftSnapshot.screeningAnswers);assert.equal(stored.status,'unverified');assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.equal(stored.draftSnapshot.resultCode,'not_covered_yet');assert.deepEqual(http.at(-1).value.commercialActions,{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false});});
    await mount(locale);assert.equal(await input.inputValue(),value);const before=structuredClone(stored);await save(locale);
    check('saved answer reload/no-op preserves complete record '+locale,()=>assert.deepEqual(stored,before));
    await input.fill(value+'-unsaved');casConflict=true;await save(locale,409);
    check('conflict preserves stored answer '+locale,()=>assert.deepEqual(stored,before));
    const recovery=page.waitForResponse(r=>r.request().method()==='GET');
    await page.getByRole('button',{name:locale==='es'?'Comparar con las respuestas guardadas':'Compare with saved answers',exact:true}).click();
    assert.equal((await recovery).status(),200);await page.getByRole('region',{name:locale==='es'?'Comparar respuestas':'Compare answers',exact:true}).waitFor();
    check('recovery retains MD mode and unsaved draft '+locale,()=>{assert(http.at(-1).url.endsWith('?preparation=md-juvenile'));assert.equal(http.at(-1).method,'GET');assert.deepEqual(stored,before);});
    assert.equal(await input.inputValue(),value+'-unsaved');
    await page.getByRole('button',{name:locale==='es'?'Descartar mi borrador y usar las respuestas guardadas':'Discard my draft and use saved answers',exact:true}).click();
    assert.equal(await input.inputValue(),value);casConflict=false;
    fs.writeFileSync(out+'/builder-'+locale+'.html',await page.content());
  }
  for(const value of ['Yes','No','unknown']) {
    await mount('es','md_juvenile_at_least_18');
    await page.locator(`[data-packet-question="md_juvenile_at_least_18"] input[type=radio][value="${value}"]`).check();
    await save('es');
    check('explicit declaration preserved without authority '+value,()=>{assert.equal(stored.draftSnapshot.packetAnswers.md_juvenile_at_least_18,value);assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.equal(http.at(-1).value.readyToGenerate,false);});
  }
  const beforeForeign=structuredClone(stored);await mount('en');requestOwner='synthetic-other-owner';
  await page.locator('[data-packet-question="md_juvenile_case_number"] input[type=text]').fill('MUST-NOT-SAVE');await save('en',404);
  check('wrong owner refused without record mutation',()=>assert.deepEqual(stored,beforeForeign));requestOwner=owner;
  check('browser has no runtime errors or external requests',()=>assert.deepEqual(errors,[]));
  await context.close();
  fs.writeFileSync(out+'/http.json',JSON.stringify(http,null,2)+'\n');
  fs.writeFileSync(out+'/final-protected-record.json',JSON.stringify(stored,null,2)+'\n');
  const result={status:'PASS',checks:checks.length,names:checks,http:http.length,scope:'Actual matter/edit SSR, actual browser builder and protected API/model; synthetic owner/storage/CAS transport only. No deployed application, database or delivery proof.'};
  fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally {await browser?.close();fs.rmSync(temp,{recursive:true,force:true});}
