// Executes the actual consumer page -> ScreeningFlow -> pending POST boundary.
// Synthetic one-question profile/evaluation isolate attribution from legal rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {chromium} from 'playwright';
import {loadTsWithMocks} from '../test-expungement-checkout-guards.mjs';
const require=createRequire(import.meta.url),{webpack}=require('next/dist/compiled/webpack/webpack');
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-browser-acquisition';
const acquisition=loadTsWithMocks('src/lib/expungement-ai/claim/clinic-acquisition.ts',{});
const continuation=acquisition.clinicConsumerContinuation('owner','MS','clinic:mvlp');
const receipt=new URL(continuation,'http://localhost').searchParams.get('acquisition');
const pageModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/app/expungement-ai/screening/[state]/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
 if(name==='react/jsx-runtime')return require(name);
 if(name.endsWith('/ConsumerPageShell'))return {ConsumerPageShell:'main'};
 if(name.endsWith('/ScreeningFlow'))return {ScreeningFlow:'flow'};
 if(name.endsWith('/partner-session'))return {isSafeSessionId:()=>false};
 if(name.endsWith('/briefcase'))return {isRcapPartnerScreeningSession:()=>{throw Error('receipt must not request sponsor authority');}};
 throw Error(name);
},pageModule,pageModule.exports);
const element=await pageModule.exports.default({params:Promise.resolve({state:'ms'}),searchParams:Promise.resolve({acquisition:receipt})});
assert.equal(element.props.children.props.acquisitionReceipt,receipt);
assert.equal(element.props.children.props.initialSessionId,undefined);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'acquisition-browser-'));
const write=(n,s)=>{const p=path.join(temp,n);fs.writeFileSync(p,s);return p;};
const profile={jurisdiction:{code:'MS',name:'Mississippi'},profileVersion:'synthetic',flowStages:[{id:'screening',order:1}],questions:[{id:'known',stage:'screening',type:'text',prompt:'Known fact',required:true}]};
const entry=write('entry.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {ScreeningFlow} from '${process.cwd()}/src/components/expungement-ai/screening/ScreeningFlow';createRoot(document.getElementById('root')).render(<ScreeningFlow {...${JSON.stringify(element.props.children.props)}}/>);`);
const profileModule=write('profile.js',`export const loadJurisdictionProfile=async()=>({ok:true,data:${JSON.stringify(profile)}});export const listAvailableStateKeys=()=>['MS'];export const normalizeStateKey=s=>s.toUpperCase();`);
const evaluator=write('evaluate.js',`export const evaluateScreening=async()=>({ok:true,data:{resultCode:'packet_ready',paymentAllowed:true}});`);
const router=write('router.js',`export const useRouter=()=>({push:p=>{window.destination=p;},refresh:()=>{}});`);
const locale=write('locale.js',`export const useLocalization=()=>({locale:'en',t:(k,f)=>f,text:s=>s});`);
const widgets=write('widgets.tsx',`import React from 'react';export const WilmaBubble=()=>null;export const ProgressRail=()=>null;export const EvaluatingState=()=>null;export const EvaluationErrorState=()=>null;export const QuestionField=({value,onChange})=><input aria-label="Known fact" value={value||''} onChange={e=>onChange(e.target.value)}/>;export const ScreeningResult=({onPacketAction,hasScreeningSession})=><button data-sponsored={hasScreeningSession} onClick={onPacketAction}>Save result</button>;`);
const analytics=write('analytics.js',`export const trackFunnelEvent=()=>{};`);
const loader=write('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
let bundle;
try{bundle=await new Promise((resolve,reject)=>webpack({mode:'production',target:'web',entry,output:{path:temp,filename:'bundle.js'},optimization:{minimize:false},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.resolve('node_modules'),'node_modules'],alias:{'@/lib/expungement-ai/frontend/profile-loader':profileModule,'@/lib/expungement-ai/frontend/evaluate':evaluator,'@/lib/analytics/client':analytics,'@':path.resolve('src'),'next/navigation':router}},module:{rules:[{test:/\.tsx?$/,use:loader}]},plugins:[new webpack.NormalModuleReplacementPlugin(/LocalizationProvider$/,r=>{r.request=locale;}),new webpack.NormalModuleReplacementPlugin(/\/(WilmaBubble|ProgressRail|QuestionField|ScreeningResult)$/,r=>{r.request=widgets;})]},(e,s)=>e?reject(e):s.hasErrors()?reject(Error(s.toString({all:false,errors:true}))):resolve(fs.readFileSync(path.join(temp,'bundle.js'),'utf8'))));}finally{fs.rmSync(temp,{recursive:true,force:true});}
test('R-5.1 actual consumer page and flow preserve signed attribution through reload and pending request without sponsor mode',async()=>{
 let pendingBody,claims=0;
 const server=http.createServer(async(req,res)=>{let body='';for await(const c of req)body+=c;res.setHeader('Content-Type','application/json');
 if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle);}
 if(req.url==='/api/expungement-ai/screening/progress')return res.end('{"questionIds":["known"]}');
 if(req.url==='/api/expungement-ai/screening/pending'){pendingBody=JSON.parse(body);return res.end(JSON.stringify({claimToken:'a'.repeat(43)}));}
 if(req.url.includes('/claim')){claims++;return res.end(JSON.stringify({ok:true,redirectTo:'/briefcase/matters/00000000-0000-4000-8000-000000000001'}));}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<div id="root"></div><script src="/bundle.js"></script>');});server.listen(0,'127.0.0.1');await once(server,'listening');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM});
 try{const page=await browser.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}${continuation}`);await page.reload();await page.getByRole('textbox',{name:'Known fact'}).fill('preserved answer');await page.getByRole('button',{name:'Continue'}).click();
 const save=page.getByRole('button',{name:'Save result'});await save.waitFor();assert.equal(await save.getAttribute('data-sponsored'),'false');await save.click();await page.waitForFunction(()=>window.destination);
 assert.deepEqual(errors,[]);assert.equal(pendingBody.acquisitionReceipt,receipt);assert.equal(acquisition.readClinicAcquisition(pendingBody.acquisitionReceipt,'owner'),'clinic:mvlp');assert.equal(pendingBody.anonymousSessionId,undefined);assert.deepEqual(pendingBody.answers,{known:'preserved answer'});assert.equal(claims,1);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
