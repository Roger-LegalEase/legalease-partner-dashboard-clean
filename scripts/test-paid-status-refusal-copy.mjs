// Acceptance R11: actual paid-status polling UI, with synthetic transport and no server/payment access.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
const {webpack}=require('next/dist/compiled/webpack/webpack');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'paid-status-copy-'));
let server,browser;
const copy={en:'Your payment is preserved. A packet is not available for this route yet. Your saved information remains available.',es:'Su pago se conserva. Todavía no hay un paquete disponible para esta ruta. Su información guardada sigue disponible.'};
const item='synthetic matter/é', failures=[];
try {
  const write=async(name,text)=>{const p=path.join(temp,name);await fs.writeFile(p,text);return p;};
  const loader=await write('typescript.cjs',`const ts=require(${JSON.stringify(require.resolve('typescript'))}); module.exports=function(source){return ts.transpileModule(source,{fileName:this.resourcePath,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext}}).outputText;};`);
  const link=await write('link.jsx',`import React from 'react';export default function Link(props){return <a {...props}/>;}`);
  const navigation=await write('navigation.js',`export function useRouter(){return window.router;}`);
  const analytics=await write('analytics.js',`export function trackFunnelEvent(...args){window.analytics.push(args);}`);
  const entry=await write('entry.jsx',`import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';
    import {LocalizationProvider} from '@/components/expungement-ai/LocalizationProvider';
    import {PacketGenerateButton} from '@/components/expungement-ai/PacketGenerateButton';
    function App(){const [answer,setAnswer]=useState(JSON.parse(localStorage.getItem('synthetic-saved-answer')).answer);
      useEffect(()=>{window.mounts++;},[]);return <form onSubmit={e=>{e.preventDefault();window.submissions++;}}>
      <label>Saved answer<input value={answer} onChange={e=>setAnswer(e.target.value)}/></label>
      <section data-packet><PacketGenerateButton briefcaseItemId={window.scenario.item} mode={window.scenario.mode??'paid_durable'} initiallyPreparing={window.scenario.mode!=='sponsored_sync'}/></section></form>;}
    createRoot(document.getElementById('root')).render(<LocalizationProvider><App/></LocalizationProvider>);`);
  await new Promise((resolve,reject)=>{
    const compiler=webpack({mode:'development',devtool:false,entry,output:{path:temp,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.jsx','.js','.json'],modules:[path.join(root,'node_modules')],alias:{'next/link$':link,'next/navigation$':navigation,'@/lib/analytics/client$':analytics,'@':path.join(root,'src')}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:loader}]}});
    compiler.run((error,stats)=>compiler.close(closeError=>error||closeError||stats?.hasErrors()?reject(error??closeError??new Error(stats.toString({all:false,errors:true}))):resolve()));
  });
  const bundle=await fs.readFile(path.join(temp,'bundle.js'));
  server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle:'<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true});
  const scenarios=[
    {name:'permanent',status:403,body:{resultCode:'fulfillment_not_proven',error:'A packet is not available for this route yet. Your saved information remains available.'},support:true},
    {name:'wrong-status',status:500,body:{resultCode:'fulfillment_not_proven'},retry:true},
    {name:'other-refusal',status:403,body:{resultCode:'other'},retry:true},
    {name:'network',network:true,retry:true},
    {name:'retryable-job',status:200,body:{packetStatus:'failed',retryable:true},retry:true},
    {name:'permanent-job',status:200,body:{packetStatus:'failed',retryable:false},support:true},
    {name:'ready',status:200,body:{packetStatus:'ready',canDownload:true},ready:true},
    {name:'sponsored',mode:'sponsored_sync',status:200,body:{}}
  ];
  for(const locale of ['en','es'])for(const scenario of scenarios){
    const context=await browser.newContext(),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({scenario,locale,item})=>{
      window.scenario={...scenario,item};window.requests=[];window.analytics=[];window.pushes=[];window.refreshes=0;window.mounts=0;window.submissions=0;
      window.router={push:path=>window.pushes.push(path),refresh:()=>window.refreshes++};
      localStorage.setItem('exp_lang',locale);localStorage.setItem('synthetic-saved-answer',JSON.stringify({answer:'Legacy answer — José'}));
      window.fetch=async(url,options={})=>{window.requests.push({url,method:options.method??'GET',body:options.body});if(scenario.network)throw Error('Synthetic network failure');return {ok:scenario.status>=200&&scenario.status<300,status:scenario.status,json:async()=>scenario.body};};
    },{scenario,locale,item});
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}/briefcase/synthetic`);
      await page.getByLabel('Saved answer').fill('Unsaved correction — María');
      const saved=await page.evaluate(()=>localStorage.getItem('synthetic-saved-answer'));
      if(scenario.mode==='sponsored_sync'){
        await page.locator('[data-packet] button').click();await page.waitForFunction(()=>window.refreshes===1);
        assert.deepEqual(await page.evaluate(()=>window.requests),[{url:'/api/expungement-ai/packet/generate',method:'POST',body:JSON.stringify({briefcaseItemId:item})}]);
      }else if(scenario.ready){
        await page.waitForFunction(()=>window.pushes.length===1);
        assert.deepEqual(await page.evaluate(()=>window.pushes),[`/briefcase/${encodeURIComponent(item)}`]);assert.equal(await page.evaluate(()=>window.refreshes),1);
      }else{
        await page.getByRole('alert').waitFor();
        if(scenario.name==='permanent')assert.equal(await page.getByRole('alert').textContent(),copy[locale]);
        assert.equal(await page.locator('[data-packet] a').count(),scenario.support?1:0);
        assert.equal(await page.locator('[data-packet] button').count(),scenario.retry?1:0);
        if(scenario.support){assert.equal(await page.locator('[data-packet] a').getAttribute('href'),`/expungement-ai/support?briefcaseItemId=${encodeURIComponent(item)}`);assert.equal(await page.locator('[data-packet] a').textContent(),locale==='en'?'Contact support':'Contactar ayuda');}
        if(scenario.retry)assert.equal(await page.locator('[data-packet] button').isEnabled(),true);
        if(scenario.name==='permanent'){await page.waitForTimeout(2150);assert.equal(await page.evaluate(()=>window.requests.length),1,'Permanent refusal must stop polling');}
        assert.deepEqual(await page.evaluate(()=>window.pushes),[]);
      }
      if(scenario.mode!=='sponsored_sync')assert.ok((await page.evaluate(()=>window.requests)).every(r=>r.method==='GET'&&r.url===`/api/expungement-ai/packet/status?briefcaseItemId=${encodeURIComponent(item)}`),'Polling must never charge or submit generation');
      assert.equal(await page.getByLabel('Saved answer').inputValue(),'Unsaved correction — María');assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-saved-answer')),saved);
      assert.equal(await page.evaluate(()=>window.submissions),0);assert.equal(await page.evaluate(()=>window.mounts),1);assert.deepEqual(errors,[]);
      console.log(`PASS ${locale} ${scenario.name}: native component, transport/action boundary, saved and unsaved answers preserved`);
    }catch(e){failures.push(`${locale} ${scenario.name}: ${e.message}`);console.error(failures.at(-1));}finally{await context.close();}
  }
  assert.deepEqual(failures,[]);
}finally{
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await fs.rm(temp,{recursive:true,force:true});
}
