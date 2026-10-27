import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const authority='src/lib/rcap/fulfillment/sponsored-channel-authority.ts';
const route='src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/program/route.ts';
const read=p=>fs.readFileSync(p,'utf8');
const grant=JSON.parse(read('data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json'));
const clinic=JSON.parse(read('data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json'));
const env={VERCEL_ENV:'preview',SUPABASE_URL:`https://${grant.acceptanceProjectRef}.supabase.co`,NEXT_PUBLIC_SUPABASE_URL:`https://${grant.acceptanceProjectRef}.supabase.co`,RCAP_SPONSORED_PREVIEW_CHANNEL:grant.channel,RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'staging_scoped',RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:grant.participantUserIds.join(',')};
let fault=null,reads=[];
const fakeFs={readFileSync(path){reads.push(path);if(fault?.path===path){if(fault.code)throw Object.assign(new Error('PRIVATE ERROR'),{code:fault.code});return Buffer.from('wrong');}return fs.readFileSync(path);}};
function load(source,imports,extra={}){
 const module={exports:{}};
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,process:{env:{...env}},require(name){if(Object.hasOwn(imports,name))return imports[name];throw new Error('Unexpected import '+name);},...extra});
 return module.exports;
}
const imports={'server-only':{},'node:fs':fakeFs,'node:crypto':{createHash},'@/lib/server-runtime-environment':{resolveDeploymentEnvironment:()=> 'preview'},'@/../data/record-clearing/legal-decisions/2026-10-23-ms-nonconv-sponsored-preview.json':clinic,'@/../data/record-clearing/legal-decisions/2026-10-24-ms-nonconv-ordinary-internal-qa.json':grant};
const current=load(read(authority),imports);
const original=load(execFileSync('git',['show','9aadacd0c5a7fac90a1662f1928b7b86f8685c7a:'+authority],{encoding:'utf8'}),imports);
const plain=x=>JSON.parse(JSON.stringify(x));
for(const overrides of [{},{VERCEL_ENV:'production'},{RCAP_SPONSORED_PREVIEW_CHANNEL:'wrong'},{RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:'private-extra'}, {NEXT_PUBLIC_SUPABASE_URL:'wrong'}]){
 for(const jurisdictions of [['MS'],[],['MS','VA'],['VA']]){
  reads=[];const before=original.prepareOrdinarySponsoredRouteRegistration(grant.partnerSlug,jurisdictions,{...env,...overrides});const priorReads=[...reads];
  reads=[];const after=current.prepareOrdinarySponsoredRouteRegistration(grant.partnerSlug,jurisdictions,{...env,...overrides});
  assert.deepEqual(plain(after),plain(before));assert.deepEqual(reads,priorReads);
 }
}
let result=plain(current.diagnoseOrdinarySponsoredRouteRegistration(grant.partnerSlug,['MS']));
assert.equal(result.passed,true);assert.equal(Object.keys(result.predicates).length,19);assert.ok(Object.values(result.predicates).every(x=>x===true));assert.equal(result.artifacts.length,3);assert.ok(result.artifacts.every(x=>x.readable&&x.hashMatches));
result=plain(current.diagnoseOrdinarySponsoredRouteRegistration('wrong', ['MS']));assert.equal(result.predicates.grant_found,false);assert.equal(result.predicates.grant_digest,null);assert.ok(result.artifacts.every(x=>x.readable===null));
for(const code of ['ENOENT','EACCES','SECRET_CODE',null]){
 fault={path:grant.artifacts[1].path,code};reads=[];const before=original.prepareOrdinarySponsoredRouteRegistration(grant.partnerSlug,['MS'],env);const beforeReads=[...reads];
 reads=[];result=plain(current.diagnoseOrdinarySponsoredRouteRegistration(grant.partnerSlug,['MS']));assert.equal(before,null);assert.equal(result.passed,false);assert.deepEqual(reads,beforeReads);
 assert.equal(result.artifacts[0].hashMatches,true);assert.equal(result.artifacts[2].readable,null);
 assert.equal(result.artifacts[1].readable,!code);assert.equal(result.artifacts[1].hashMatches,code?null:false);assert.equal(result.artifacts[1].filesystemCode,code?(code==='SECRET_CODE'?'OTHER':code):null);
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.ok(!JSON.stringify(result).includes(grant.participantUserIds[0]));assert.ok(!JSON.stringify(result).includes(grant.artifacts[1].path));
}
fault=null;
// Execute actual preflight with read-only loaders and query builders that reject writes.
const preflightPath='src/lib/partners/onboarding/program-launch-preflight.ts';
let readOnlyLoads=0;
const entries=['implementation_brief','co_branded_page_configuration'].map(artifactType=>({artifactType,sourceFreshness:'current',currentVersion:{id:artifactType,snapshotHash:'hash'}}));
const decision={operatingModel:'legalease_managed',authorityId:'id',scopeHash:'scope',materialsHash:'materials',workspaceId:'workspace',sourceVersion:5,requirements:[],blockers:[],allowed:true,canAuthorizeStart:true,status:'ready'};
function query(){return new Proxy({}, {get(_t,key){if(key==='then')return resolve=>resolve({data:null,error:null});if(['select','eq','order','limit','maybeSingle','single','is'].includes(key))return ()=>query();throw new Error('Write/unexpected query: '+String(key));}});}
const preflight=load(read(preflightPath),{'server-only':{},'node:crypto':{createHash},'@/lib/supabase/server':{getSupabaseAdminClient:()=>({from:()=>query()})},'./artifact-generator':{programPageIssues:()=>[]},'./artifact-service':{loadInternalArtifactBoardWithSource:async(_c,options)=>{assert.equal(options.readOnly,true);readOnlyLoads++;return {board:{entries},source:{data:{geography_audience_language_accessibility:{jurisdictions:['MS']},program_goals:{}}}};}},'./program-experience-service':{programDecision:async()=>decision},'./program-presentation':{resolveProgramPresentation:()=>({})},'./real-launch-security':{realLaunchOrigin:()=> 'https://example.test'},'./workspace-loading':{workspaceReadError:()=>new Error('read failed')}});
let context={role:'internal_admin',partnerSlug:grant.partnerSlug,authUserId:'admin'},binding=true,authorized=true,operationsCalls=0,preflightCalls=0,authFailure=false;
const routeImports={ '@/lib/partners/onboarding/auth-context':{requireInternalOnboardingContext:async()=>{if(authFailure)throw new Error('auth');return context;}},'@/lib/partners/onboarding/http':{onboardingJson:body=>({status:200,body}),onboardingHttpError:()=>({status:403})},'@/lib/partners/onboarding/request-security':{},'@/lib/partners/onboarding/program-operations-service':{getProgramOperations:async()=>{operationsCalls++;return {};},runProgramOperation:()=>{throw new Error('WRITE');}},'@/lib/rcap/fulfillment/sponsored-channel-authority':current,'@/lib/partners/onboarding/launch-preflight':{getLaunchPreflight:async c=>{preflightCalls++;return preflight.getProgramLaunchPreflight(c);}},'@/lib/partners/onboarding/real-launch-security':{acceptancePreviewLaunchBinding:()=>binding?{}:null,realLaunchOrigin:()=>authorized?'https://example.test':null},'@/lib/partners/onboarding/errors':{Phase1OnboardingError:class extends Error{}}};
const endpoint=load(read(route),routeImports);const params={params:Promise.resolve({partnerSlug:grant.partnerSlug})};
const request={nextUrl:new URL('https://example.test/?ordinaryGuardDiagnostic=1')};
let response=await endpoint.GET(request,params);assert.equal(response.body.diagnostic.passed,true);assert.equal(readOnlyLoads,1);assert.equal(operationsCalls,0);
for(const deny of ['auth','role','partner','binding','origin']){
 const prior=preflightCalls;authFailure=deny==='auth';context={role:deny==='role'?'partner_admin':'internal_admin',partnerSlug:deny==='partner'?'wrong':grant.partnerSlug,authUserId:'admin'};binding=deny!=='binding';authorized=deny!=='origin';
 response=await endpoint.GET(request,params);assert.equal(response.status,403);assert.equal(preflightCalls,prior);
}
authFailure=false;binding=authorized=true;context={role:'internal_admin',partnerSlug:grant.partnerSlug,authUserId:'admin'};
await endpoint.GET({nextUrl:new URL('https://example.test/')},params);assert.equal(operationsCalls,1);
const originalRoute=execFileSync('git',['show','9aadacd0c5a7fac90a1662f1928b7b86f8685c7a:'+route],{encoding:'utf8'});
assert.equal(read(route).split('export async function POST')[1],originalRoute.split('export async function POST')[1]);
assert.match(read('src/lib/partners/onboarding/request-security.ts'),/Cache-Control.*no-store/i);
console.log('PASS: original guard returns/read order; 19+3 closed observations; filesystem failures/privacy; authenticated GET; actual readonly preflight; denied access; unchanged POST.');
