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
 const transpile=(body,filename)=>ts.transpileModule(body,{fileName:filename.replace(/\.mjs$/,'.ts'),compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const profile=JSON.parse(read('src/lib/rcap-engine/compiled/profiles/MS-mississippi.json'));
 const registry={getProfileByJurisdiction:state=>state?.toUpperCase()==='MS'?profile:undefined,
  getAllJurisdictionProfiles:()=>[profile],normalizeJurisdictionCode:state=>state.trim().toUpperCase(),
  getDesignerPublicProfiles:()=>JSON.parse(read('src/lib/rcap-engine/compiled/all51.json')),
  assertProfileVersion:(p,v)=>p.profileVersion===v?{ok:true}:{ok:false,currentProfileVersion:p.profileVersion}};
 const load=relative=>{
  if(relative==='src/lib/rcap-engine/profile-registry.ts')return registry;
  if(nodeCache.has(relative))return nodeCache.get(relative).exports;
  const module={exports:{}};nodeCache.set(relative,module);
  if(relative.endsWith('.json'))module.exports=JSON.parse(read(relative));
  else new Function('require','module','exports','process',transpile(read(relative),relative))(
   specifier=>specifier==='server-only'?{}:resolveSource(specifier,relative)?load(resolveSource(specifier,relative)):nativeRequire(specifier),module,module.exports,process);
  return module.exports;
 };
 const publicProfile=load('src/lib/rcap-engine/public-profile-projection.ts').projectPublicProfile(profile);
 const selection=load('src/lib/rcap-engine/screening-question-selection.ts').selectScreeningQuestionIds;
 const evaluate=load('src/lib/expungement-ai/authoritative-screening-result.ts').evaluateAuthoritativeScreeningResult;
 let browserBundle;
 const buildBrowserBundle=()=>{
  if(browserBundle)return browserBundle;
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
  const entry=`const R=require('react');const{createRoot}=require('react-dom/client');const{LocalizationProvider}=require('@/components/expungement-ai/LocalizationProvider');const{ScreeningFlow}=require('@/components/expungement-ai/screening/ScreeningFlow');window.__screeningFixture={navigation:null};createRoot(document.getElementById('root')).render(R.createElement(LocalizationProvider,null,R.createElement(ScreeningFlow,{state:'MS',initialSessionId:${JSON.stringify(FIXTURE_SESSION_ID)},partnerDisplayName:'Synthetic Clinic fixture'})));`;
  const add=(key,body,relative=null,packageFile=null)=>{
   if(ids.has(key))return ids.get(key);
   const id=modules.length;ids.set(key,id);modules.push(null);
   const code=relative?transpile(body,relative):body,deps={};
   for(const match of code.matchAll(/\brequire\(["']([^"']+)["']\)/g)) {
    const specifier=match[1];if(Object.hasOwn(deps,specifier))continue;
    if(Object.hasOwn(stubs,specifier))deps[specifier]=add('stub:'+specifier,stubs[specifier]);
    else if(specifier.startsWith('@/')||relative&&specifier.startsWith('.')) {
     const target=resolveSource(specifier,relative??'src/fixture.js');
     deps[specifier]=target.endsWith('.json')?add(target,'module.exports='+read(target)+';'):add(target,read(target),target);
    } else {
     assert.ok(!specifier.startsWith('node:'),'Node dependency cannot enter browser fixture');
     const requireAt=packageFile?createRequire(packageFile):nativeRequire;
     const target=requireAt.resolve(specifier);
     const bytes=fs.readFileSync(target,'utf8');
     deps[specifier]=add(target,target.endsWith('.json')?'module.exports='+bytes+';':bytes,null,target);
    }
   }
   modules[id]={code,deps};return id;
  };
  const entryId=add('fixture-entry',entry);
  return browserBundle=`(function(){const process={env:{NODE_ENV:'production'}};const definitions={${modules.map((m,i)=>`${i}:[function(module,exports,require){\n${m.code}\n},${JSON.stringify(m.deps)}]`).join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;const[run,deps]=definitions[id];run(module,module.exports,name=>{if(!Object.hasOwn(deps,name))throw Error('Unmapped browser dependency '+name);return load(deps[name]);});return module.exports;}load(${entryId});})();`;
 };
 return {profile,publicProfile,select:answers=>selection(profile,publicProfile,answers),evaluate,buildBrowserBundle,
  sourcePins:()=>Object.fromEntries(pins),boundaries:['MS-only frozen registry; exact original MS JSON/public projector/selection/evaluator','Next router navigation port','Next Link/Image rendering ports','Decorative icons and Wilma omitted; analytics disabled','Packet availability flags fixed false: fixture cannot grant fulfillment','Pending/claim storage is an explicit HTTP double; no Postgres or ownership proof']};
}

export async function startFrozenReactScreeningSite({runtime,planMode='engine',claimRefused=false}={}) {
 assert.ok(runtime);assert.ok(['engine','omit_optional','early_result','reverse_timing'].includes(planMode));
 const state={requests:[],plans:[],evaluations:[],pendingCalls:0,claimCalls:0,savedMatter:null};
 const bundle=runtime.buildBrowserBundle();
 const send=(response,status,body)=>{response.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});response.end(JSON.stringify(body));};
 const server=http.createServer(async(request,response)=>{
  try {
   const url=new URL(request.url,'http://127.0.0.1');
   if(url.pathname==='/fixture.js'){response.writeHead(200,{'content-type':'application/javascript','cache-control':'no-store'});return response.end(bundle);}
   if(request.method==='GET'&&url.pathname==='/api/expungement-ai/profiles/MS')return send(response,200,runtime.publicProfile);
   if(request.method==='GET') {response.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});return response.end('<!doctype html><html lang="en"><body><div id="root"></div><script src="/fixture.js"></script></body></html>');}
   assert.equal(request.method,'POST');let raw='';for await(const chunk of request)raw+=chunk;
   const body=JSON.parse(raw);state.requests.push({path:url.pathname,method:request.method,answerIds:body.answers?Object.keys(body.answers):[]});
   if(url.pathname==='/api/expungement-ai/screening/progress') {
    let questionIds=runtime.select(body.answers);
    // Explicit response-plan mutation cases exercise conditional UI handling, not engine policy.
    if(planMode==='omit_optional')questionIds=questionIds.filter(id=>id!=='possible_pathway_context');
    if(planMode==='early_result')questionIds=questionIds.filter(id=>id!=='court_requirements_completed');
    if(planMode==='reverse_timing') {
     const special=questionIds.filter(id=>['resolved_timing_bucket','court_requirements_completed'].includes(id));
     questionIds=[...questionIds.filter(id=>!special.includes(id)),...special.sort((a,b)=>a==='court_requirements_completed'?-1:1)];
    }
    state.plans.push({questionIds:[...questionIds],answerIds:Object.keys(body.answers)});
    return send(response,200,{jurisdiction:'MS',profileVersion:runtime.publicProfile.profileVersion,questionIds});
   }
   if(url.pathname==='/api/expungement-ai/evaluate') {
    const value=runtime.evaluate(body).evaluation;
    state.evaluations.push({resultCode:value.resultCode,answerIds:Object.keys(body.answers),matterId:body.matterId});
    return send(response,200,{...value,consumerPacketAvailable:false,sponsoredPacketAvailable:false});
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
 return {origin,state,sourcePins:runtime.sourcePins,boundaries:runtime.boundaries,
  async close(){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
