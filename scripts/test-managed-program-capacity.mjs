import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url), ts=require('typescript');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const route=path.join(root,'src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/launch-capacity/route.ts');
class InputError extends Error { constructor(code,message){super(message);this.code=code;} }
function fixture({managed=true,mode='sponsored_packets',authorized=true,status='setup_in_progress'}={}){
 const records=new Map(),calls=[],bytes=Buffer.from('approved fixture procurement bytes');
 const workspace={id:'11111111-1111-4111-8111-111111111111',status,landing_page_ready:false,aggregate_version:4,
  agreement_status:managed?'not_sent':'signed',operating_model:managed?'legalease_managed':'partner_managed',rcap_policy_version:'rcap2.2'};
 const asset={id:'22222222-2222-4222-8222-222222222222',bucket_id:'private',object_path:'fixture',sha256_hex:createHash('sha256').update(bytes).digest('hex')};
 const db={from(table){calls.push(['read',table]);const result={data:table==='partner_onboarding'?workspace:table==='partner_onboarding_sections'?{response_data:{service_mode:mode,operator_authority_reference:'Authorized internal operating basis'}}:table==='partner_onboarding_assets'?asset:[],error:null};
  const chain={select(){return chain;},eq(){return chain;},single:async()=>result,maybeSingle:async()=>result,then(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};return chain;},
  storage:{from(){return {download:async()=>{calls.push(['download']);return {data:new Blob([bytes]),error:null};}};}},
  async rpc(name,args){calls.push(['rpc',name,args]);
   const binding=JSON.stringify(Object.fromEntries(Object.entries(args).filter(([key])=>key!=='p_version')));
   if(records.has(args.p_request))return records.get(args.p_request)===binding?{data:true,error:null}:{data:null,error:{code:'23505'}};
   if(args.p_version!==workspace.aggregate_version)return {data:null,error:{code:'40001'}};
   records.set(args.p_request,binding);workspace.aggregate_version++;return {data:true,error:null};}};
 const mocks={
  '@/lib/supabase/server':{getSupabaseAdminClient:()=>db},
  '@/lib/partners/onboarding/auth-context':{requireInternalOnboardingContext:async()=>{if(!authorized)throw new InputError('forbidden','Internal administrator required');return {partnerSlug:'fixture-managed',authUserId:'361d0746-6e49-430c-9ac2-afa39ea5bdff',role:'internal_admin'};}},
  '@/lib/partners/onboarding/http':{onboardingJson:body=>({status:200,body}),onboardingHttpError:error=>({status:error.code==='forbidden'?403:400,body:{code:error.code,error:error.message}})},
  '@/lib/partners/onboarding/request-security':{assertSameOrigin(){},readBoundedJson:r=>r.json(),requireRequestId:id=>id},
  '@/lib/partners/onboarding/errors':{Phase1OnboardingError:InputError}
 };
 const m=new Module(route);m.filename=route;m.paths=Module._nodeModulePaths(root);m.require=id=>mocks[id]??require(id);
 m._compile(ts.transpileModule(fs.readFileSync(route,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,route);
 const body={confirmed:true,screeningsAllowed:1,packetCap:1,authorityReference:'Authorized internal test allocation',workspaceVersion:4,requestId:'33333333-3333-4333-8333-333333333333',...(!managed?{documentId:asset.id}:{})};
 return {calls,records,workspace,asset,body,post:()=>m.exports.POST({json:async()=>body},{params:Promise.resolve({partnerSlug:'fixture-managed'})})};
}
test('managed administrator allocates sponsored access with an attributable internal event, without partner agreement or document',async()=>{
 const f=fixture(),r=await f.post();assert.equal(r.status,200,JSON.stringify(r.body));
 const writes=f.calls.filter(c=>c[0]==='rpc');assert.equal(writes.length,1);
 assert.equal(writes[0][1],'rcap_service_configure_launch_capacity');
 assert.equal(writes[0][2].p_actor,'361d0746-6e49-430c-9ac2-afa39ea5bdff');
 assert.equal(writes[0][2].p_document,null);assert.equal(writes[0][2].p_hash,null);
 assert.equal(writes[0][2].p_packets,1);assert.equal(writes[0][2].p_reference,f.body.authorityReference);
 assert(!f.calls.some(c=>c[0]==='download'||c[1]==='partner_onboarding_assets'));
});
test('partner-managed allocation still requires signed agreement and verified procurement bytes',async()=>{
 const f=fixture({managed:false});assert.equal((await f.post()).status,200);
 const write=f.calls.find(c=>c[0]==='rpc');assert.match(write[2].p_document,/^[a-f0-9-]+$/);assert.match(write[2].p_hash,/^[a-f0-9]{64}$/);assert(f.calls.some(c=>c[0]==='download'));
 const refused=fixture({managed:false});refused.workspace.agreement_status='not_sent';assert.notEqual((await refused.post()).status,200);assert(!refused.calls.some(c=>c[0]==='rpc'));
});
for(const [name,options,change] of [
 ['non-admin',{authorized:false},()=>{}],['screening-only program',{mode:'screening_only'},()=>{}],
 ['live program',{status:'live'},()=>{}],['unconfirmed allocation',{},f=>{f.body.confirmed=false;}],
 ['missing current version',{},f=>{delete f.body.workspaceVersion;}],['zero packet cap',{},f=>{f.body.packetCap=0;}],
 ['missing partner version',{managed:false},f=>{delete f.body.workspaceVersion;}],
 ['unavailable workspace version',{},f=>{delete f.workspace.aggregate_version;}],
 ['unverified partner document',{managed:false},f=>{f.asset.sha256_hex='0'.repeat(64);}],
 ['client-forged managed model',{managed:false},f=>{f.workspace.agreement_status='not_sent';f.body.operatingModel='legalease_managed';}]
])test(`refuses ${name} before capacity RPC`,async()=>{const f=fixture(options);change(f);assert.notEqual((await f.post()).status,200);assert(!f.calls.some(c=>c[0]==='rpc'));});

test('same-request retry confirms the recorded allocation after its response was lost',async()=>{
 const f=fixture();assert.equal((await f.post()).status,200);assert.equal(f.workspace.aggregate_version,5);
 // Discard the first response: the client retains request ID and original version four.
 assert.equal((await f.post()).status,200);assert.equal(f.records.size,1);assert.equal(f.workspace.aggregate_version,5);
 assert.equal(f.calls.filter(c=>c[0]==='rpc').length,2);
});
test('stale new request reaches SQL authority and is refused without an allocation',async()=>{
 const f=fixture();f.workspace.aggregate_version=5;assert.notEqual((await f.post()).status,200);
 assert.equal(f.calls.filter(c=>c[0]==='rpc').length,1);assert.equal(f.records.size,0);
});
test('changed allocation binding cannot replay an existing request',async()=>{
 const f=fixture();assert.equal((await f.post()).status,200);f.body.packetCap=2;
 assert.notEqual((await f.post()).status,200);assert.equal(f.records.size,1);
});
