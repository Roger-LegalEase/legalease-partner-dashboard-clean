// Real changed React controls, deterministic local HTTP/provider boundaries.
// Actual layout/API/database coverage is in the Legal Aid E2E and cap SQL tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {webpack}=require('next/dist/compiled/webpack/webpack');
import { chromium } from 'playwright';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sponsor-cap-browser-'));
const write=(name,text)=>{const file=path.join(temp,name);fs.writeFileSync(file,text);return file;};
const entry=write('entry.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';
import {PacketVerificationAction} from '${process.cwd()}/src/components/expungement-ai/PacketVerificationAction';
import {PacketGenerateButton} from '${process.cwd()}/src/components/expungement-ai/PacketGenerateButton';
import {ClinicAssistanceClient} from '${process.cwd()}/src/components/clinic-mode/ClinicAssistanceClient';
import {SponsorCapacityNotice} from '${process.cwd()}/src/components/expungement-ai/SponsorCapacityNotice';
const root=createRoot(document.getElementById('root'));
window.refresh=async()=>{const s=await (await fetch('/state')).json();root.render(<main>
{s.entry==='clinic'?<ClinicAssistanceClient event={{publicSlug:'mvlp',jurisdiction:'MS'}} staff={[{id:'10000000-0000-4000-8000-000000000001',label:'Approved staff 1'}]}/>:<>
{s.dtc&&<SponsorCapacityNotice/>}
{s.entry==='matter'?<PacketGenerateButton briefcaseItemId={s.item} mode="sponsored_sync"/>:
<PacketVerificationAction key={s.dtc?'dtc':'sponsored'} itemId={s.item} initiallyVerified={s.verified} canVerify={true} packetReady={s.ready} verificationAnswers={{known:'preserved'}} mode={s.dtc?'consumer':'sponsored'} commercialActions={{fulfillmentAvailable:true,checkoutAllowed:s.dtc,generationAllowed:!s.dtc}}/>}
</>}
</main>)};window.refresh();`);
const router=write('router.js',`export const useRouter=()=>({refresh:()=>window.refresh(),push:p=>{history.pushState({},'',p);window.refresh()}});`);
const link=write('link.js',`import React from 'react';export default p=>React.createElement('a',p);`);
const locale=write('locale.js',`import {EXPUNGEMENT_COPY} from '${process.cwd()}/src/lib/expungement-ai/localization';const copy=Object.entries(EXPUNGEMENT_COPY).filter(([k])=>k.startsWith('clinic.cap.')).map(([,v])=>v);const locale=new URLSearchParams(location.search).get('lang')||'en';export const useLocalization=()=>({locale,text:x=>locale==='es'?(copy.find(v=>v.en===x)?.es||x):x,t:(k,f)=>f});`);
const analytics=write('analytics.js',`export const trackFunnelEvent=()=>{};`);
const loader=write('loader.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
const bundle=await new Promise((resolve,reject)=>webpack({mode:'production',target:'web',entry,output:{path:temp,filename:'bundle.js'},optimization:{minimize:false},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.resolve('node_modules'),'node_modules'],alias:{'@/lib/analytics/client':analytics,'@':path.resolve('src'),'next/navigation':router,'next/link':link}},module:{rules:[{test:/\.tsx?$/,use:loader}]},plugins:[new webpack.NormalModuleReplacementPlugin(/LocalizationProvider$/,r=>{r.request=locale;})]},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve(fs.readFileSync(path.join(temp,'bundle.js'),'utf8'))));
fs.rmSync(temp,{recursive:true,force:true});

async function site({capacity=true,verified=true,entry='review',lostResponse=false}={}){
 const state={dtc:false,ready:false,verified,entry,item:'same-verified-matter'};const requests=[];
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;requests.push({path:req.url,body});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(bundle);}
  if(req.url==='/api/clinic/assistance/start')return res.end(JSON.stringify({success:true,outcome:'sponsor_capacity_exhausted',consumerUrl:'/expungement-ai/screening/ms?source=clinic%3Amvlp'}));
  if(req.url==='/state')return res.end(JSON.stringify(state));
  if(req.url.includes('/packet-information')){assert.deepEqual(JSON.parse(body),{answers:{known:'preserved'},verify:true});state.verified=true;return res.end(JSON.stringify({readyToGenerate:true,commercialActions:{fulfillmentAvailable:true,generationAllowed:true,checkoutAllowed:false}}));}
  if(req.url==='/api/expungement-ai/packet/generate'){
   assert.deepEqual(JSON.parse(body),{briefcaseItemId:state.item});
   if(capacity){state.ready=true;return res.end('{"packetStatus":"ready"}');}
   state.dtc=true;state.entry='review';
   if(lostResponse){lostResponse=false;return req.socket.destroy();}
   res.statusCode=409;return res.end('{"outcome":"sponsor_capacity_exhausted","checkoutRequired":true}');
  }
  if(req.url==='/api/expungement-ai/checkout'){assert.equal(state.dtc,true);assert.deepEqual(JSON.parse(body),{briefcaseItemId:state.item});return res.end('{"checkoutUrl":"/synthetic-stripe-checkout"}');}
  if(req.url==='/synthetic-stripe-checkout'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<h1>Synthetic provider</h1>');}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><div id="root"></div><script src="/bundle.js"></script>');
 });server.listen(0,'127.0.0.1');await once(server,'listening');
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM});const page=await browser.newPage();page.setDefaultTimeout(10000);
 const base=`http://127.0.0.1:${server.address().port}`;
 return {page,base,requests,state,close:async()=>{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
for(const verified of [true,false])test(`sponsored capacity available: verified=${verified}, no Checkout request, CTA or navigation`,async()=>{
 const s=await site({verified});try{
  await s.page.goto(s.base);await s.page.getByRole('button',{name:verified?'Prepare clinic packet':'Verify and prepare clinic packet',exact:true}).click();
  await s.page.getByRole('link',{name:'Open my packet'}).waitFor();
  assert.equal(await s.page.getByRole('button',{name:/Pay \$|checkout/i}).count(),0);
  assert.equal(s.requests.some(r=>/checkout|stripe/i.test(r.path)),false);
 }finally{await s.close();}
});
for(const lang of ['en','es'])for(const entry of ['review','matter'])test(`cap exhausted: ${lang} ${entry}, explicit notice and same-matter Checkout without repeated intake`,async()=>{
 const s=await site({capacity:false,entry});try{
  await s.page.goto(s.base+'/?lang='+lang);
  await s.page.getByRole('button',{name:entry==='review'?'Prepare clinic packet':'Generate my packet',exact:true}).click();
  await s.page.locator('[data-sponsor-capacity=exhausted]').waitFor();
  assert.match(await s.page.locator('[data-sponsor-capacity]').innerText(),/sponsor will not pay|patrocinador no pagará/);
  assert.equal(s.requests.some(r=>/checkout/.test(r.path)),false,'no automatic charge or Checkout');
  await s.page.getByRole('button',{name:'Pay $50 and generate my packet'}).click();await s.page.waitForURL('**/synthetic-stripe-checkout');
  assert.equal(s.requests.filter(r=>r.path==='/api/expungement-ai/checkout').length,1);
  assert.equal(s.requests.filter(r=>/packet-information|screening/.test(r.path)).length,0);
 }finally{await s.close();}
});
test('lost cap response preserves decision; reload returns to same verified review and explicit Checkout',async()=>{
 const s=await site({capacity:false,lostResponse:true});try{
  await s.page.goto(s.base);await s.page.getByRole('button',{name:'Prepare clinic packet',exact:true}).click();
  await s.page.waitForFunction(()=>document.querySelector('[role=alert]')||document.querySelector('[data-sponsor-capacity=exhausted]'));await s.page.reload();
  await s.page.locator('[data-sponsor-capacity=exhausted]').waitFor();
  assert.equal(s.state.verified,true);assert.equal(s.state.item,'same-verified-matter');
  assert.equal(s.requests.some(r=>/checkout|packet-information|screening/.test(r.path)),false);
 }finally{await s.close();}
});

for(const lang of ['en','es'])test(`pre-matter Clinic / MVLP entry ${lang}: truthful consumer continuation and no automatic Stripe`,async()=>{
 const s=await site({capacity:false,entry:'clinic'});try{
  await s.page.goto(s.base+'/?lang='+lang);await s.page.locator('select[name=eventStaffId]').selectOption('10000000-0000-4000-8000-000000000001');
  await s.page.locator('input[name=consent]').check();await s.page.getByRole('button',{name:'Start assisted nationwide screening'}).click();
  await s.page.getByRole('heading',{name:lang==='es'?'La cobertura del patrocinador no está disponible':'Sponsored coverage is unavailable'}).waitFor();
  assert.match(await s.page.getByRole('status').innerText(),/sponsor will not pay|patrocinador no pagará/);
  assert.equal(await s.page.getByRole('link',{name:lang==='es'?'Continuar con el servicio habitual para consumidores':'Continue with standard consumer service'}).getAttribute('href'),'/expungement-ai/screening/ms?source=clinic%3Amvlp');
  assert.equal(s.requests.some(r=>/checkout|packet-information|\/screening\//.test(r.path)),false);
 }finally{await s.close();}
});
