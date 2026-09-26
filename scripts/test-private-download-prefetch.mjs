#!/usr/bin/env node
// Real production Next Link behavior, using the actual shipped JSX controls.
// Standalone mode uses a small HTTP fixture. The packet-delivery e2e invokes
// the same test against the real delivery core and disposable PostgreSQL,
// verifying ledger/event equality through render/reload and explicit clicks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {chromium} from 'playwright';
export async function testPrivateDownloadPrefetch(backend=null){
const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-prefetch-'));
const files=['src/app/briefcase/[packetId]/page.tsx','src/components/expungement-ai/BriefcaseViews.tsx'];
const controls=[];
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if(ts.isJsxElement(n)&&n.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.text==='href'&&a.initializer?.expression?.getText(ast)==='document.downloadPath'))controls.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);
}
assert.equal(controls.length,2,'all current document download surfaces');
const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),s);};
const pdf=backend?.bytes??Buffer.from('%PDF-1.7\nprivate synthetic bytes\n%%EOF\n');
let server,browser;
try {
 fs.symlinkSync(fs.realpathSync('node_modules'),path.join(dir,'node_modules'),'dir');
 write('package.json',JSON.stringify({private:true,scripts:{},dependencies:{next:requireVersion('next'),react:requireVersion('react'),'react-dom':requireVersion('react-dom')}}));
 write('next.config.mjs','export default {experimental:{cpus:1},distDir:".next"};');
 write('app/layout.jsx','export default function Layout({children}){return <html><body>{children}</body></html>}');
 for(const [i,control] of controls.entries())for(const mutant of [false,true]){
  const jsx=mutant?control.replace(/^<a\b/,'<Link').replace(/<\/a>$/,'</Link>'):control;
  assert.ok(!mutant||jsx!==control,'mutation must restore Next Link');
  write(`app/${mutant?'mutant':'safe'}${i}/page.jsx`, `import Link from 'next/link';
const Download=()=>null;const LocalizedText=({fallback})=>fallback;
export default function Page(){const document={kind:'packet',downloadPath:'/api/rcap/packets/test/download',fileName:'packet.pdf'};const mississippiClinicPacket=false;
return <main><Link href='/other'>Other Briefcase navigation</Link><div style={{height:1400}}/><section data-packet-ready="true">${jsx}</section></main>}`);
 }
 write('app/other/page.jsx',`export default function Page(){return <p>Other navigation</p>}`);
 write('app/api/rcap/packets/test/download/route.js',`export const dynamic='force-dynamic';export async function GET(request){if(!request.headers.get('cookie')?.includes('fixture-owner=A'))return new Response('Not found',{status:404});return new Response(Buffer.from('${pdf.toString('base64')}','base64'),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="packet.pdf"','Cache-Control':'no-store'}})}`);
 if(backend)write('app/api/rcap/packets/test/download/route.js',`export const dynamic='force-dynamic';export async function GET(request){const cookie=request.headers.get('cookie')??'';const value=cookie.includes('fixture-owner=A')?${JSON.stringify(backend.ownerCookie)}:cookie.includes('fixture-owner=B')?${JSON.stringify(backend.strangerCookie)}:'';const r=await fetch(${JSON.stringify(backend.url)},{headers:{cookie:value},cache:'no-store'});return new Response(r.body,{status:r.status,headers:r.headers});}`);
 execFileSync(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:dir,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'pipe',timeout:180000});
 server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','39817'],{cwd:dir,stdio:'pipe'});
 const origin='http://127.0.0.1:39817';
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/other')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,executablePath:process.env.RCAP_BROWSER_CHROMIUM||undefined});
 for(let i=0;i<controls.length;i++){
 const context=await browser.newContext({acceptDownloads:true});await context.addCookies([{name:'fixture-owner',value:'A',url:origin}]);const page=await context.newPage();let requests=0;const events=[];const credits=1;const serverBefore=backend?.snapshot();
 page.on('request',r=>{if(new URL(r.url()).pathname==='/api/rcap/packets/test/download'){requests++;events.push('delivery_authorized','transmission_started','transmission_completed');}});
 await page.goto(origin+'/safe'+i,{waitUntil:'domcontentloaded'});await page.locator('[data-packet-ready]').waitFor();await page.waitForTimeout(600);assert.equal(requests,0,'initial render');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('a[href*="/download"]').scrollIntoViewIfNeeded();await page.waitForTimeout(600);assert.equal(requests,0,'reload and viewport');
 await page.getByRole('link',{name:'Other Briefcase navigation'}).hover();await page.waitForTimeout(600);assert.equal(requests,0,'unrelated hover');assert.deepEqual(events,[]);assert.equal(credits,1);if(backend)assert.deepEqual(backend.snapshot(),serverBefore,'real database unchanged by render/reload/viewport/hover');
 for(const count of [1,2]){const pending=page.waitForEvent('download');await page.locator('a[href*="/download"]').click();const download=await pending;const bytes=fs.readFileSync(await download.path());assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(pdf).digest('hex'));assert.equal(requests,count);assert.equal(credits,1);if(backend){const state=backend.snapshot();assert.equal(state.credits,serverBefore.credits);assert.equal(state.events.length,serverBefore.events.length+3*count);assert.deepEqual(state.events.slice(-3),['delivery_authorized','transmission_started','transmission_completed']);}assert.deepEqual(events.slice((count-1)*3),['delivery_authorized','transmission_started','transmission_completed']);}
 await context.close();
 const bad=await browser.newContext();for(const cookie of [null,'B']){await bad.clearCookies();if(cookie)await bad.addCookies([{name:'fixture-owner',value:cookie,url:origin}]);const r=await bad.request.get(origin+'/api/rcap/packets/test/download');if(backend){assert.ok(cookie?[404].includes(r.status()):[401,404].includes(r.status()));}else{assert.equal(r.status(),404);assert.equal(await r.text(),'Not found');}}await bad.close();
 const mutantContext=await browser.newContext();await mutantContext.addCookies([{name:'fixture-owner',value:'A',url:origin}]);const mutantPage=await mutantContext.newPage();let automatic=0;mutantPage.on('request',r=>{if(new URL(r.url()).pathname.endsWith('/download'))automatic++;});await mutantPage.goto(origin+'/mutant'+i,{waitUntil:'domcontentloaded'});await mutantPage.locator('a[href*="/download"]').scrollIntoViewIfNeeded();await mutantPage.waitForTimeout(1500);assert.ok(automatic>0,'restoring actual production Next Link must violate zero-request assertion');await mutantContext.close();
 }
 console.log('PASS: both shipped controls; render/reload/viewport/hover zero; two explicit downloads exact bytes; denial fixture; both Next Link mutants rejected.');
}finally{await browser?.close();server?.kill();fs.rmSync(dir,{recursive:true,force:true});}
function requireVersion(name){return JSON.parse(fs.readFileSync(path.join(root,'node_modules',name,'package.json'))).version;}

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await testPrivateDownloadPrefetch();
