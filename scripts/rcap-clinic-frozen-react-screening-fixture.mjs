import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const SCREENING_APPLICATION_SHA='4feb8e94b3dee4085fe05ea75d78853fe21e5097';
export const FIXTURE_SESSION_ID='11111111-1111-4111-8111-111111111111';
export const FIXTURE_MATTER_ID='22222222-2222-4222-8222-222222222222';
const sha=value=>createHash('sha256').update(value).digest('hex');
const sourceContract=JSON.parse(fs.readFileSync(new URL('./rcap-clinic-frozen-react-source.json',import.meta.url),'utf8'));
assert.equal(sourceContract.application,SCREENING_APPLICATION_SHA);

// Runtime transpilation only: original TSX/React renders every question and result.
export function frozenScreeningRuntime({repo=process.cwd()}={}) {
 const nativeRequire=createRequire(path.join(repo,'package.json'));
 const ts=nativeRequire('typescript'),sourceCache=new Map(),nodeCache=new Map(),pins=new Map();
 const read=relative=>{
  assert.match(relative,/\.(?:ts|tsx|js|mjs|json)$/,'Frozen dependency must be a source file, not a Git tree');
  if(!sourceCache.has(relative)) {
   // The workflow has a shallow checkout; pin its blobs instead of requiring an unavailable ancestor.
   const body=execFileSync('git',['show',`HEAD:${relative}`],{cwd:repo,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
   assert.equal(sha(body),sourceContract.files[relative],`Frozen application source mismatch: ${relative}`);
   sourceCache.set(relative,body);pins.set(relative,sha(body));
  }
  return sourceCache.get(relative);
 };
 const locate=relative=>{
  for(const suffix of ['', '.ts','.tsx','.js','.mjs','.json','/index.ts','/index.tsx']) {
   const candidate=relative+suffix;
   try {read(candidate);return candidate;}catch{}
  }
  throw Error(`Frozen dependency unavailable: ${relative}`);
 };
 const resolveSource=(specifier,parent)=>specifier.startsWith('@/')?locate(path.posix.normalize('src/'+specifier.slice(2))):
  specifier.startsWith('.')?locate(path.posix.normalize(path.posix.join(path.posix.dirname(parent),specifier))):null;
 const transpile=(body,filename)=>ts.transpileModule(body.replace(/^#![^\n]*(?:\n|$)/,''),{fileName:filename.replace(/\.mjs$/,'.ts'),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const sideEffects={databaseCalls:0,cookieCalls:0};
 const registryPath='src/lib/rcap-engine/profile-registry.ts';
 const registryFs={
  readdirSync:directory=>{
   const relative=path.relative(repo,directory).split(path.sep).join('/');
   assert.equal(relative,'src/lib/rcap-engine/compiled/profiles');
   return execFileSync('git',['ls-tree','--name-only',`HEAD:${relative}`],{cwd:repo,encoding:'utf8'}).trim().split('\n');
  },
  readFileSync:(filename,encoding)=>{
   assert.equal(encoding,'utf8');const relative=path.relative(repo,filename).split(path.sep).join('/');
   assert.ok(relative.startsWith('src/lib/rcap-engine/compiled/'),'Registry reads must stay in frozen compiled sources');return read(relative);
  }
 };
 const frozenProcess=Object.create(process);frozenProcess.cwd=()=>repo;
 const authorityReads=[],authorityReadFailures=[],authorityBlobs=new Map();
 const readonlyFs={
  statSync:filename=>{
   const relative=path.relative(repo,filename).split(path.sep).join('/');
   assert.ok(!relative.startsWith('..'),'Frozen reads must stay in repository');
   const type=execFileSync('git',['cat-file','-t',`HEAD:${relative}`],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
   return {isDirectory:()=>type==='tree'};
  },
  existsSync:filename=>{
   const relative=path.relative(repo,filename).split(path.sep).join('/');
   if(relative.startsWith('..'))return false;
   try{execFileSync('git',['cat-file','-e',`HEAD:${relative}`],{cwd:repo,stdio:'ignore'});return true;}catch{return false;}
  },
  readFileSync:(filename,encoding)=>{
   const relative=path.relative(repo,filename).split(path.sep).join('/');
   try {
    if(!authorityBlobs.has(relative)) {
     const bytes=execFileSync('git',['show',`HEAD:${relative}`],{cwd:repo,maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});
     assert.equal(sha(bytes),sourceContract.files[relative],`Frozen authority source mismatch: ${relative}`);
     authorityBlobs.set(relative,bytes);pins.set(relative,sha(bytes));
    }
    authorityReads.push(relative);const bytes=authorityBlobs.get(relative),format=typeof encoding==='string'?encoding:encoding?.encoding;
    return format?bytes.toString(format):Buffer.from(bytes);
   }catch(error){authorityReadFailures.push(relative);throw error;}
  },
  readdirSync:directory=>{
   const relative=path.relative(repo,directory).split(path.sep).join('/');
   assert.ok(!relative.startsWith('..'),'Frozen reads must stay in repository');
   return execFileSync('git',['ls-tree','--name-only',`HEAD:${relative}`],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean);
  }
 };
 const load=relative=>{
  if(nodeCache.has(relative))return nodeCache.get(relative).exports;
  const module={exports:{}};nodeCache.set(relative,module);
  if(relative.endsWith('.json'))module.exports=JSON.parse(read(relative));
  else new Function('require','module','exports','process',transpile(read(relative),relative))(
   specifier=>{
    if(specifier==='server-only')return {};
    if(relative===registryPath&&specifier==='node:fs')return registryFs;
    if(specifier==='node:fs')return readonlyFs;
    if(specifier==='next/headers')return {cookies:()=>{sideEffects.cookieCalls++;throw Error('Read-only handler attempted cookie access');}};
    const dependency=resolveSource(specifier,relative);return dependency?load(dependency):nativeRequire(specifier);
   },module,module.exports,frozenProcess);
  if(relative==='src/lib/supabase/server.ts')module.exports.getSupabaseAdminClient=()=>{sideEffects.databaseCalls++;throw Error('Read-only handler attempted database access');};
  return module.exports;
 };
 const registry=load(registryPath),profile=registry.getProfileByJurisdiction('MS');
 assert.ok(profile);
 const profileGET=load('src/app/api/expungement-ai/profiles/[state]/route.ts').GET;
 const progressPOST=load('src/app/api/expungement-ai/screening/progress/route.ts').POST;
 const evaluatePOST=load('src/app/api/expungement-ai/evaluate/route.ts').POST;
 const screeningAnswers=load('scripts/lib/rcap-ms-nonconviction-fixture.mjs').MS_NONCONVICTION_SCREENING_ANSWERS;
 const publicProfile=load('src/lib/rcap-engine/public-profile-projection.ts').projectPublicProfile(profile);
 const selection=load('src/lib/rcap-engine/screening-question-selection.ts').selectScreeningQuestionIds;
 const evaluate=load('src/lib/expungement-ai/authoritative-screening-result.ts').evaluateAuthoritativeScreeningResult;
 const nextVersion=JSON.parse(read('package-lock.json')).packages['node_modules/next'].version;
 assert.equal(nativeRequire('next/package.json').version,nextVersion,'Installed Next must match the frozen application lock');
 const announcerModule='next/dist/client/components/app-router-announcer.js';
 const announcerSha256='70aac21e21d9acbfa4086f98742e44aa6e601ee018b6db643e421bd5ec870615';
 assert.equal(sha(fs.readFileSync(nativeRequire.resolve(announcerModule))),announcerSha256,'Installed Next announcer source changed');
 const frameworkPins={nextVersion,announcerModule,announcerSha256};
 const browserBundles=new Map();
 const buildBrowserBundle=({publicMode=false}={})=>{
  if(browserBundles.has(publicMode))return browserBundles.get(publicMode);
  const modules=[],ids=new Map();
  const stubs={
   'next/navigation':`exports.useRouter=()=>({push:target=>{window.__screeningFixture.navigation=target;history.pushState({},'',target);},replace:target=>{window.__screeningFixture.navigation=target;history.replaceState({},'',target);},back:()=>history.back()});exports.usePathname=()=>location.pathname;exports.useSearchParams=()=>new URLSearchParams(location.search);`,
   'next/link':`const R=require('react');module.exports=function Link({href,children,...props}){return R.createElement('a',{...props,href},children);};`,
   'next/image':`const R=require('react');module.exports=function Image(props){return R.createElement('img',props);};`,
   'lucide-react':`const R=require('react');module.exports=new Proxy({},{get:(_t,name)=>name==='__esModule'?false:function Icon(props){return R.createElement('svg',{'aria-hidden':true,...props});}});`,
   '@/components/expungement-ai/WilmaBubble':`exports.WilmaBubble=()=>null;`,
   '@/lib/analytics/client':`exports.trackFunnelEvent=()=>{};`,
   'server-only':``
  };
  const entry=`const R=require('react');const{createRoot}=require('react-dom/client');const{LocalizationProvider}=require('@/components/expungement-ai/LocalizationProvider');const{ScreeningFlow}=require('@/components/expungement-ai/screening/ScreeningFlow');const{AppRouterAnnouncer}=require('next/dist/client/components/app-router-announcer.js');window.__screeningFixture={navigation:null};createRoot(document.getElementById('root')).render(R.createElement(R.Fragment,null,R.createElement(AppRouterAnnouncer,{tree:[]}),R.createElement(LocalizationProvider,null,R.createElement(ScreeningFlow,{state:'MS',${publicMode?'':`initialSessionId:${JSON.stringify(FIXTURE_SESSION_ID)},partnerDisplayName:'Synthetic Clinic fixture'`}}))));`;
  const add=(key,body,relative=null,packageFile=null)=>{
   if(ids.has(key))return ids.get(key);
   const id=modules.length;ids.set(key,id);modules.push(null);
   const code=relative?transpile(body,relative):body,deps={};
   for(const match of code.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
    const specifier=match[1];if(Object.hasOwn(deps,specifier))continue;
    if(Object.hasOwn(stubs,specifier))deps[specifier]=add('stub:'+specifier,stubs[specifier]);
    else if(specifier.startsWith('@/')||relative&&specifier.startsWith('.')) {
     const target=resolveSource(specifier,relative??'src/_next/static/chunks/clinic-fixture.js');
     deps[specifier]=target.endsWith('.json')?add(target,'module.exports='+read(target)+';'):add(target,read(target),target);
    } else {
     assert.ok(!specifier.startsWith('node:'),'Node dependency cannot enter browser fixture');
     const requireAt=packageFile?createRequire(packageFile):nativeRequire;
     const target=requireAt.resolve(specifier);
     const bytes=fs.readFileSync(target,'utf8');
     if(specifier===announcerModule)assert.equal(sha(bytes),announcerSha256);
     deps[specifier]=add(target,target.endsWith('.json')?'module.exports='+bytes+';':bytes,null,target);
    }
   }
   modules[id]={code,deps};return id;
  };
  const entryId=add('fixture-entry',entry);
  const browserBundle=`(function(){const process={env:{NODE_ENV:'production'}};const definitions={${modules.map((m,i)=>`${i}:[function(module,exports,require){\n${m.code}\n},${JSON.stringify(m.deps)}]`).join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;const[run,deps]=definitions[id];run(module,module.exports,name=>{if(!Object.hasOwn(deps,name))throw Error('Unmapped browser dependency '+name);return load(deps[name]);});return module.exports;}load(${entryId});})();`;
  browserBundles.set(publicMode,browserBundle);return browserBundle;
 };
 return {frameworkPins,authorityReads,authorityReadFailures,profile,publicProfile,profileGET,progressPOST,evaluatePOST,screeningAnswers,sideEffects,select:answers=>selection(profile,publicProfile,answers),evaluate,buildBrowserBundle,
  sourcePins:()=>Object.fromEntries(pins),boundaries:['Original frozen profile registry with read-only Git-backed compiled source files; actual profile GET/progress POST handlers and Response passthrough','Database/cookie seams throw and count unexpected use by read-only handlers','Installed frozen-lock-version Next AppRouterAnnouncer with pinned source; Next router navigation port','Next Link/Image rendering ports','Frozen optional badge uppercase CSS included; remaining production Tailwind layout omitted; decorative icons/Wilma omitted; analytics disabled','Original evaluate POST with Git-backed pinned read-only fulfillment registry; computed availability grants no entitlement','Pending/claim storage is an explicit HTTP double; no Postgres or ownership proof']};
}

export async function startFrozenReactScreeningSite({runtime,planMode='engine',claimRefused=false,progressFault=null,initialProgressGate=null,queryAssets=false,assetFault=false,publicMode=false,evaluationFault=null}={}) {
 assert.ok(evaluationFault===null||evaluationFault==='non_packet_result');
 assert.ok(runtime);assert.ok(['engine','omit_optional','early_result','reverse_timing'].includes(planMode));
 assert.ok(progressFault===null||['invalid_version_after_initial','invalid_version_react_initial'].includes(progressFault));
 const state={requests:[],plans:[],progressResponses:[],progressCalls:0,evaluations:[],pendingCalls:0,claimCalls:0,savedMatter:null};
 let notifyInitialProgress;
 const initialProgressRequested=new Promise(resolve=>{notifyInitialProgress=resolve;});
 const bundle=runtime.buildBrowserBundle({publicMode});
 const assetQuery=queryAssets?'?dpl=fixture-immutable-token':'';
 const font=fs.readFileSync(path.join(path.dirname(createRequire(import.meta.url).resolve('next/package.json')),'dist/compiled/@vercel/og/Geist-Regular.ttf'));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZT0AAAAASUVORK5CYII=','base64');
 const send=(response,status,body)=>{response.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});response.end(JSON.stringify(body));};
 const forward=async(response,actual)=>{response.writeHead(actual.status,Object.fromEntries(actual.headers));response.end(Buffer.from(await actual.arrayBuffer()));};
 const server=http.createServer(async(request,response)=>{
  try {
   const url=new URL(request.url,`http://${request.headers.host}`);
   if(url.pathname==='/_next/static/chunks/clinic-fixture.css'){if(assetFault){response.writeHead(403,{'content-type':'text/plain'});return response.end('fixture private response must not be recorded');}response.writeHead(200,{'content-type':'text/css'});return response.end(`@font-face{font-family:Clinic;src:url('/_next/static/media/fixture.ttf${assetQuery}')}body{font-family:Clinic;color:rgb(11,19,32)}`);}
   if(url.pathname==='/_next/static/media/fixture.ttf'){response.writeHead(200,{'content-type':'font/ttf'});return response.end(font);}
   if(['/expungement-ai/favicon.ico','/expungement-ai/icon-192.png','/_next/image'].includes(url.pathname)){response.writeHead(200,{'content-type':'image/png'});return response.end(png);}
   if(url.pathname==='/_next/static/chunks/clinic-fixture.js'){response.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return response.end(bundle);}
   if(request.method==='GET'&&url.pathname.startsWith('/api/expungement-ai/profiles/'))return forward(response,await runtime.profileGET(new Request(url),{params:Promise.resolve({state:decodeURIComponent(url.pathname.split('/').at(-1))})}));
   if(request.method==='GET') {response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return response.end(`<!doctype html><html lang="en"><head><style>.uppercase{text-transform:uppercase}</style>${queryAssets?`<link rel="stylesheet" href="/_next/static/chunks/clinic-fixture.css${assetQuery}"><link rel="preload" as="font" type="font/ttf" crossorigin href="/_next/static/media/fixture.ttf${assetQuery}"><link rel="icon" href="/expungement-ai/favicon.ico"><link rel="icon" href="/expungement-ai/icon-192.png">`:''}</head><body><div id="root"></div>${queryAssets?'<img alt="Fixture guide image" src="/_next/image?url=%2Fexpungement-ai%2Fwilma-avatar.png&amp;w=48&amp;q=75">':''}<script src="/_next/static/chunks/clinic-fixture.js${assetQuery}"></script></body></html>`);}
   assert.equal(request.method,'POST');let raw='';for await(const chunk of request)raw+=chunk;
   let body;try{body=JSON.parse(raw);}catch{body=null;}
   state.requests.push({path:url.pathname,method:request.method,answerIds:body?.answers&&typeof body.answers==='object'?Object.keys(body.answers):[]});
   if(url.pathname==='/api/expungement-ai/screening/progress') {
    state.progressCalls++;
    if(state.progressCalls===1){notifyInitialProgress();if(initialProgressGate)await initialProgressGate;}
    // Explicit malformed-request test port; the original handler owns its refusal.
    const handlerBody=progressFault&&state.progressCalls>(progressFault==='invalid_version_react_initial'?9:1)?JSON.stringify({...body,profileVersion:'fixture-invalid-version'}):raw;
    const actual=await runtime.progressPOST(new Request(url,{method:'POST',headers:request.headers,body:handlerBody}));
    const payload=await actual.clone().json().catch(()=>null);
    state.progressResponses.push({httpStatus:actual.status,error:payload?.error??null});
    if(actual.status!==200)return forward(response,actual);
    let questionIds=payload.questionIds;
    assert.ok(Array.isArray(questionIds));
    // Explicit response-plan mutation cases exercise conditional UI handling, not engine policy.
    if(planMode==='omit_optional')questionIds=questionIds.filter(id=>id!=='possible_pathway_context');
    if(planMode==='early_result')questionIds=questionIds.filter(id=>id!=='court_requirements_completed');
    if(planMode==='reverse_timing') {
     const special=questionIds.filter(id=>['resolved_timing_bucket','court_requirements_completed'].includes(id));
     questionIds=[...questionIds.filter(id=>!special.includes(id)),...special.sort((a,b)=>a==='court_requirements_completed'?-1:1)];
    }
    state.plans.push({questionIds:[...questionIds],answerIds:Object.keys(body.answers)});
    if(planMode==='engine')return forward(response,actual);
    return forward(response,new Response(JSON.stringify({...payload,questionIds}),{status:actual.status,headers:actual.headers}));
   }
   if(url.pathname==='/api/expungement-ai/evaluate') {
    const actual=await runtime.evaluatePOST(new Request(url,{method:'POST',headers:request.headers,body:raw}));
    const value=await actual.clone().json();
    state.evaluations.push({httpStatus:actual.status,resultCode:value.resultCode??null,answerIds:Object.keys(body?.answers??{}),matterId:body?.matterId});
    // Deliberately contradictory public response proves final validation cannot trust a positive heading alone.
    if(evaluationFault&&actual.status===200)return forward(response,new Response(JSON.stringify({...value,resultCode:'guidance_only',userLabel:'A path may be available'}),{status:actual.status,headers:actual.headers}));
    return forward(response,actual);
   }
   if(url.pathname==='/api/expungement-ai/screening/complete')return send(response,200,{ok:true});
   if(url.pathname==='/api/expungement-ai/screening/pending') {
    state.pendingCalls++;assert.equal(state.pendingCalls,1,'Fixture refuses a second pending creation');
    return send(response,200,{ok:true,claimToken:'local_fixture_opaque_claim_token_1234567890'});
   }
   if(url.pathname==='/api/expungement-ai/screening/pending/claim') {
    state.claimCalls++;assert.equal(state.claimCalls,1,'Fixture refuses a second claim');
    if(claimRefused)return send(response,409,{ok:false,error:'claim_rejected'});
    state.savedMatter={id:FIXTURE_MATTER_ID,fixtureOnly:true};
    return send(response,200,{ok:true,matterId:FIXTURE_MATTER_ID,redirectTo:`/briefcase/matters/${FIXTURE_MATTER_ID}`});
   }
   return send(response,404,{error:'fixture_boundary_denied'});
  }catch(error){return send(response,500,{error:'fixture_handler_failure'});}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const origin=`http://127.0.0.1:${server.address().port}`;
 return {origin,state,initialProgressRequested,sourcePins:runtime.sourcePins,boundaries:runtime.boundaries,
  async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
