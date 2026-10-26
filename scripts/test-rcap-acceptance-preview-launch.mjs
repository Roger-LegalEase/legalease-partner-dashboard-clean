import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const security=await import('../src/lib/partners/onboarding/real-launch-security.ts');
const routeAuthority=await import('../src/lib/rcap/fulfillment/sponsored-channel-authority.ts');
const grant=routeAuthority.sponsoredChannelDecisions.find(g=>g.decisionId==='MS-NONCONV-ORDINARY-INTERNAL-QA-20261024');
const {isRcap2Enabled}=await import('../src/lib/partners/onboarding/feature.ts');
const {Phase1OnboardingError}=await import('../src/lib/partners/onboarding/errors.ts');
const read=p=>fs.readFileSync(p,'utf8');
function declarations(file,names){
 const ast=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 return names.map(name=>{const nodes=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1,name);return nodes[0].getText(ast).replace(/^export /,'');}).join('\n');
}
const base='src/lib/partners/onboarding/';
const actualSource=[declarations(base+'program-operations-service.ts',['childRequest','runProgramOperation']),declarations(base+'program-experience-service.ts',['recordProgramDecision']),declarations(base+'launch-preflight.ts',['getLaunchPreflight']),declarations(base+'program-launch-preflight.ts',['getProgramLaunchPreflight']),declarations(base+'synthetic-launch-service.ts',['executeRealLaunch','executeLaunch'])].join('\n');
const actual=ts.transpileModule(actualSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const binding={schema:'rcap-partner-acceptance-launch/v1',applicationSha:'a'.repeat(40),projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',supabaseProjectRef:'hyflxnlhpmiqxvvcoiia',partnerSlug:'legalease-ordinary-qa-20261024',adminAuthUserId:'11111111-1111-4111-8111-111111111111'};
const context={role:'internal_admin',authUserId:binding.adminAuthUserId,partnerSlug:binding.partnerSlug};
const environment={RCAP_SPONSORED_PREVIEW_CHANNEL:grant.channel,RCAP_CONSUMER_DELIVERY_ROUTE_STATE:grant.routeState,RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:grant.participantUserIds.join(','),RCAP_PARTNER_ONBOARDING_ENABLED:'true',RCAP_2_0_ENABLED:'true',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:binding.projectId,VERCEL_DEPLOYMENT_ID:'dpl_SyntheticPreviewA',VERCEL_URL:'synthetic-start-preview.vercel.app',VERCEL_GIT_COMMIT_SHA:binding.applicationSha,NEXT_PUBLIC_RCAP_BUILD_SHA:binding.applicationSha,SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',RCAP_PARTNER_LAUNCH_ENABLED:'true',RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION:JSON.stringify(binding),RCAP_PARTNER_LAUNCH_PUBLIC_ORIGIN:'',VERCEL_AUTOMATION_BYPASS_SECRET:'synthetic-existing-private-bypass',SUPABASE_SERVICE_ROLE_KEY:'synthetic-existing-service-key'};
const originalEnv=Object.fromEntries(Object.keys(environment).map(key=>[key,process.env[key]]));
const checks=[];
async function check(name,fn){Object.assign(process.env,environment);await fn();checks.push(name);console.log('PASS '+name);}
function fixture(options={}){
 const state={review:false,publicVerified:false,operation:null,journal:[],rpc:[],fetches:[]};
 const workspace={id:'33333333-3333-4333-8333-333333333333',partner_slug:context.partnerSlug,aggregate_version:7,rcap_policy_version:'rcap2.2',status:'ready',landing_page_ready:false,internal_approved_at:null,launched_at:null};
 const activation={id:'44444444-4444-4444-8444-444444444444',partner_slug:context.partnerSlug,payment_status:'unpaid',qualification_status:'qualified',provisioning_status:'active',access_mode:'open',onboarding_status:'in_progress',onboarding_completed_at:null};
 const capacity={partner_slug:context.partnerSlug,screenings_allowed:1,screenings_used:0};
 const immutable=JSON.stringify({activation,capacity});
 const assetId='55555555-5555-4555-8555-555555555555',assetBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXmUAAAAASUVORK5CYII=','base64');
 const types=['implementation_brief','co_branded_page_configuration'];
 const versions=types.map((artifactType,i)=>({artifactType,sourceFreshness:options.staleMaterials?'stale':'current',currentVersion:{id:'artifact-'+i,snapshotHash:String(i+1).repeat(64),approvalStatus:'approved',partnerReviewStatus:'not_required',document:{}}}));
 const source={data:{program_goals:{operator_authority_reference:'SYNTHETIC existing managed authority',service_mode:'sponsored_packets',participation_mode:'screening_only'},geography_audience_language_accessibility:{jurisdictions:['MS'],enable_spanish:false},access_sponsorship_capacity:{participant_access_model:'open'}}};
 const decision=()=>({workspaceId:workspace.id,partnerSlug:context.partnerSlug,policyVersion:'rcap2.2',sourceVersion:7,scopeHash:'scope-hash',materialsHash:'materials-hash',operatingModel:'legalease_managed',authorityId:'existing-managed-decision',allowed:state.review&&!options.policyBlocked,canAuthorizeStart:!options.policyBlocked,setupComplete:true,live:workspace.status==='live',status:workspace.status,requirements:[{key:'legalease_final_review_complete',label:'Current final review',owner_domain:'legalease',passing:state.review,effective:state.review,default_applied:false}],blockers:state.review?[]:[{key:'legalease_final_review_complete',label:'Current final review'}],primaryNextAction:'Review current materials'});
 function rows(table){
  if(table==='partner_onboarding')return [workspace];
  if(table==='partner_records')return [activation];
  if(table==='partner_entitlement')return [capacity];
  if(table==='partner_packet_entitlement')return [{id:'existing-one-unit',partner_id:activation.id,packet_cap:1}];
  if(table==='rcap_launch_operation_events')return [...state.journal].reverse();
  if(table==='partner_onboarding_assets')return [{id:assetId,workspace_id:workspace.id,category:'logo',review_status:'approved',lifecycle_status:'active',deleted_at:null,sha256_hex:createHash('sha256').update(assetBytes).digest('hex')}];
  if(table==='rcap_commercial_authorizations'||table==='partner_onboarding_launch_approvals')return [];
  if(table==='partner_onboarding_artifact_versions')return [{id:'artifact-1',workspace_id:workspace.id,rendered_content:{pagePreview:{publicName:{value:'Synthetic Program'},headline:{value:'Synthetic Headline'},primaryActionLabel:{value:'Start screening'}}}}];
  throw Error('Unexpected read table '+table);
 }
 class Query{
  constructor(table){this.table=table;this.filters=[];this.limitCount=null;}
  select(){return this;}eq(key,value){this.filters.push([key,value]);return this;}is(key,value){return this.eq(key,value);}order(){return this;}limit(n){this.limitCount=n;return this;}
  result(single=false){let data=rows(this.table).filter(row=>this.filters.every(([key,value])=>row[key]===value));if(this.limitCount)data=data.slice(0,this.limitCount);return {data:structuredClone(single?(data[0]??null):data),error:null};}
  single(){return Promise.resolve(this.result(true));}maybeSingle(){return Promise.resolve(this.result(true));}then(resolve,reject){return Promise.resolve(this.result()).then(resolve,reject);}
  insert(row){assert.equal(this.table,'rcap_launch_operation_events');state.journal.push(structuredClone({...row,created_at:new Date().toISOString()}));if(row.step==='public_verified')state.publicVerified=true;return Promise.resolve({data:null,error:null});}
 }
 const db={from:table=>new Query(table),rpc:async(name,args)=>{
  state.rpc.push({name,args:structuredClone(args)});assert.equal(args.p_slug,context.partnerSlug);assert.equal(args.p_actor,context.authUserId);
  if(name==='rcap_service_record_program_decision'){if(options.decisionRefused)return {error:{code:'PT409'}};assert.equal(args.p_type,'legalease_final_review');assert.equal(args.p_details.materials_hash,'materials-hash');state.review=true;return {data:'existing-managed-decision',error:null};}
  if(name==='rcap_service_stage_real_launch'){assert.equal(args.p_authority,'existing-managed-decision');assert.equal(state.review,true);assert.equal(args.p_versions.length,2);if(options.stageRefused)return {error:{code:'PT409'}};state.operation=args.p_operation;workspace.status='live';workspace.landing_page_ready=true;const prepared=state.journal.find(row=>row.step==='prepared'&&row.operation_id===args.p_operation);assert.ok(prepared);state.journal.push({...structuredClone(prepared),step:'publication_staged',created_at:new Date().toISOString(),evidence:{mode:'real',operatingDecisionId:args.p_authority,commercialAuthorityId:null,workspaceVersion:args.p_version,policyVersion:'rcap2.2'}});return {data:true,error:null};}
  if(name==='rcap_service_compensate_real_launch'){workspace.status='ready';workspace.landing_page_ready=false;return {data:true,error:null};}
  throw Error('Unexpected mutation '+name);
 }};
 const fetchImpl=async(url,init)=>{
  assert.equal(url.origin,`https://${process.env.VERCEL_URL}`,'Private headers remain on this exact immutable Preview');
  assert.equal(init.method,'GET');assert.equal(init.redirect,'manual');assert.equal(init.cache,'no-store');
  assert.equal(init.headers['x-vercel-protection-bypass'],environment.VERCEL_AUTOMATION_BYPASS_SECRET);assert.equal(init.headers['x-vercel-skip-toolbar'],'1');
  assert.equal(url.searchParams.has('x-vercel-protection-bypass'),false);assert.equal(init.headers.cookie,undefined);assert.equal(init.headers.authorization,undefined);
  state.fetches.push({url:url.href,headers:{...init.headers}});
  if(url.pathname.includes('/assets/')){
   assert.equal(url.pathname,`/api/partners/public-page/${context.partnerSlug}/assets/${assetId}`);
   const token=init.headers['x-rcap-synthetic-verification'];if(token)assert.equal(security.acceptsRealVerification(context.partnerSlug,state.operation,token),true);else assert.equal(state.publicVerified,true);
   if(options.redirectAsset)return new Response('',{status:302,headers:{location:'https://unrelated.example/never-follow'}});
   return new Response(options.badAsset?Buffer.from('altered-bytes'):assetBytes,{headers:{'content-type':'image/png'}});
  }
  if(url.pathname.startsWith('/intake/'))return new Response(`<main data-rcap-intake-partner="${context.partnerSlug}" data-rcap-access="open" data-rcap-jurisdiction="MS"></main>`);
  assert.equal(url.pathname,'/p/'+context.partnerSlug);
  const token=init.headers['x-rcap-synthetic-verification'];
  if(!token&&!state.publicVerified)return new Response('Not public',{status:404});
  if(token)assert.equal(security.acceptsRealVerification(context.partnerSlug,state.operation,token),true);
  if(options.redirectReadback)return new Response('',{status:302,headers:{location:'https://unrelated.example/never-follow'}});
  const partner=options.wrongPage?'another-tenant':context.partnerSlug;
  return new Response(`<main data-rcap-partner="${partner}" data-rcap-asset="${assetId}" data-rcap-access="open" data-rcap-operation="${state.operation}" data-rcap-page-hash="${'2'.repeat(64)}">Synthetic Program Synthetic Headline Start screening <a href="/intake/${partner}">Intake</a></main>`);
 };
 const ports={...security,prepareOrdinarySponsoredRouteRegistration:routeAuthority.prepareOrdinarySponsoredRouteRegistration,isRcap2Enabled,Phase1OnboardingError,createHash,randomUUID,AbortSignal,URL,Buffer,
  getSupabaseAdminClient:()=>db,db:()=>db,programDecision:async()=>decision(),
  getProgramWorkspaceIdentity:async()=>({workspaceId:workspace.id,partnerSlug:context.partnerSlug,version:7,policyVersion:'rcap2.2'}),
  getProgramExperience:async()=>({data:source.data,reviewToken:'current-review-token',materials:versions.map((v,i)=>({type:types[i],id:v.currentVersion.id,hash:v.currentVersion.snapshotHash,version:1}))}),
  loadInternalArtifactBoardWithSource:async()=>({board:{entries:versions},source}),programPageIssues:()=>[],resolveProgramPresentation:()=>({access:{configured:'open'}}),getProfileByJurisdiction:code=>({profileVersion:'synthetic-existing-'+code}),
  workspaceReadError:(_where,_error,message)=>new Error(message),diagnoseWorkspaceLoad:()=>{},fetch:fetchImpl,
  isDisposableLaunchEnvironment:()=>false,syntheticVerificationToken:()=>{throw Error('No synthetic launch fallback');},getLegacyLaunchPreflight:()=>{throw Error('No legacy branch in this managed fixture');}};
 const code=new Function(...Object.keys(ports),actual+'\nreturn {runProgramOperation,getLaunchPreflight,executeRealLaunch};')(...Object.values(ports));
 const requestId=randomUUID(),body={action:'start',confirmed:true,version:7,scopeHash:'scope-hash',reviewToken:'current-review-token'};
 return {state,body,requestId,run:(patch={},actor=context,id=requestId)=>code.runProgramOperation(actor,{...body,...patch},id),resume:()=>code.executeRealLaunch(context,{requestId,snapshotHash:state.journal.find(row=>row.step==='publication_staged').snapshot_hash,confirmed:true}),assertImmutable:()=>assert.equal(JSON.stringify({activation,capacity}),immutable)};
}
try{
 await check('normal prepared receipt contains only exact source-approved ordinary registration scope',async()=>{
  const f=fixture();await f.run();const prepared=f.state.journal.find(row=>row.step==='prepared');
  assert.deepEqual(prepared.evidence.ordinarySponsoredRoute,{
   schema:'rcap-ordinary-sponsored-route-registration/v1',decisionId:grant.decisionId,
   decisionSha256:createHash('sha256').update(JSON.stringify(grant)).digest('hex'),routeKey:grant.routeId,
   packetSpecificationSha256:grant.packetSpecificationSha256,participantScopeSha256:grant.participantScopeSha256,partnerSlug:grant.partnerSlug
  });
  assert.equal(prepared.evidence.previewRelease.applicationSha,binding.applicationSha);
  assert.equal(prepared.evidence.previewRelease.adminAuthUserId,context.authUserId);
  console.log('ACTUAL_APP_SYNTHETIC_PORTS_PREPARED_RECEIPT '+JSON.stringify(prepared));
 });
 await check('registration preparation refuses wrong scope, source, partner or deployment without inventing participant context',async()=>{
  const project='https://hyflxnlhpmiqxvvcoiia.supabase.co';
  for(const patch of [{VERCEL_ENV:'production'},{SUPABASE_URL:'https://other.supabase.co'},{NEXT_PUBLIC_SUPABASE_URL:'https://other.supabase.co'},{RCAP_SPONSORED_PREVIEW_CHANNEL:'other'},{RCAP_CONSUMER_DELIVERY_ROUTE_STATE:'disabled'},{RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:''},{RCAP_CONSUMER_DELIVERY_STAGING_SCOPE:grant.participantUserIds[0]+',other'}]) {
   assert.equal(routeAuthority.prepareOrdinarySponsoredRouteRegistration(context.partnerSlug,['MS'],{...environment,...patch}),null);
  }
  assert.equal(routeAuthority.prepareOrdinarySponsoredRouteRegistration('another-program',['MS'],environment),null);
  assert.equal(routeAuthority.prepareOrdinarySponsoredRouteRegistration(context.partnerSlug,['MS','GA'],environment),null);
  assert.equal(routeAuthority.prepareOrdinarySponsoredRouteRegistration(context.partnerSlug,['GA'],environment),null);
  process.env.RCAP_SPONSORED_PREVIEW_CHANNEL='wrong-channel';const f=fixture();await assert.rejects(f.run());
  assert.equal(f.state.journal.length,0);assert.equal(f.state.rpc.some(call=>call.name==='rcap_service_stage_real_launch'),false);f.assertImmutable();
 });
 await check('actual managed Start records current review, stages, verifies protected own-origin readbacks and completes once',async()=>{
  const f=fixture();await f.run().catch(error=>{throw new Error(f.state.journal.at(-1)?.evidence.message??error.message,{cause:error});});f.assertImmutable();assert.deepEqual(f.state.journal.map(r=>r.step),['prepared','publication_staged','public_verified','complete']);
  assert.equal(f.state.rpc.filter(r=>r.name==='rcap_service_stage_real_launch').length,1);
  for(const receipt of f.state.journal){if(receipt.step==='publication_staged'){assert.equal(receipt.evidence.previewRelease,undefined,'Actual SQL stage receipt does not carry JS release metadata');continue;}assert.equal(receipt.evidence.previewRelease.deploymentId,environment.VERCEL_DEPLOYMENT_ID);assert.equal(receipt.evidence.previewRelease.adminAuthUserId,context.authUserId);assert.equal(receipt.evidence.operatingDecisionId,'existing-managed-decision');assert.equal(JSON.stringify(receipt).includes(environment.VERCEL_AUTOMATION_BYPASS_SECRET),false);assert.equal(JSON.stringify(receipt).includes(environment.SUPABASE_SERVICE_ROLE_KEY),false);}
  assert.ok(f.state.fetches.some(r=>r.headers['x-rcap-synthetic-verification']));assert.ok(f.state.fetches.some(r=>!r.headers['x-rcap-synthetic-verification']));assert.ok(f.state.fetches.some(r=>r.url.includes('/intake/')));assert.ok(f.state.fetches.some(r=>r.url.includes('/assets/')&&r.headers['x-rcap-synthetic-verification']));assert.ok(f.state.fetches.some(r=>r.url.includes('/assets/')&&!r.headers['x-rcap-synthetic-verification']));
  const mutations=f.state.rpc.length;await f.run();assert.equal(f.state.rpc.length,mutations,'Duplicate Start rechecks receipt/readbacks without staging or review writes');
 });
 await check('wrong administrator, tenant, role and missing release binding cannot mutate or read back',async()=>{
  for(const actor of [{...context,authUserId:'22222222-2222-4222-8222-222222222222'},{...context,partnerSlug:'another-tenant'},{...context,role:'partner_admin'}]){
   const f=fixture();await assert.rejects(f.run({},actor));assert.equal(f.state.rpc.length,0);assert.equal(f.state.fetches.length,0);f.assertImmutable();
  }
  process.env.RCAP_PARTNER_LAUNCH_RELEASE_AUTHORIZATION='';const f=fixture();await assert.rejects(f.run());assert.equal(f.state.rpc.length,0);assert.equal(f.state.fetches.length,0);
 });
 await check('normal confirmation, version, scope, material freshness, review and database policy refusals remain',async()=>{
  for(const patch of [{confirmed:false},{version:6},{scopeHash:'stale'},{reviewToken:'stale'}]){const f=fixture();await assert.rejects(f.run(patch));assert.equal(f.state.rpc.length,0);f.assertImmutable();}
  for(const options of [{staleMaterials:true},{policyBlocked:true},{decisionRefused:true}]){const f=fixture(options);await assert.rejects(f.run());assert.equal(f.state.rpc.some(r=>r.name==='rcap_service_stage_real_launch'),false);assert.equal(f.state.fetches.length,0);f.assertImmutable();}
 });
 await check('failed staging and wrong or redirected readback compensate without following or leaking private headers',async()=>{
  for(const options of [{stageRefused:true},{wrongPage:true},{redirectReadback:true},{badAsset:true},{redirectAsset:true}]){const f=fixture(options);await assert.rejects(f.run());assert.equal(f.state.rpc.filter(r=>r.name==='rcap_service_compensate_real_launch').length,1);assert.equal(f.state.journal.at(-1).step,'failed');f.assertImmutable();}
 });
 await check('a completed operation cannot replay into another Preview deployment or mutate its journal',async()=>{
  const f=fixture();await f.run();const before=JSON.stringify(f.state.journal),mutations=f.state.rpc.length,fetches=f.state.fetches.length;
  process.env.VERCEL_DEPLOYMENT_ID='dpl_SyntheticPreviewB';process.env.VERCEL_URL='different-owned-preview.vercel.app';
  await assert.rejects(f.run(),/different Preview release/);assert.equal(f.state.rpc.length,mutations);assert.equal(f.state.fetches.length,fetches);assert.equal(JSON.stringify(f.state.journal),before);f.assertImmutable();
 });
 await check('SQL-shaped interrupted stage keeps the normal fresh lease and expired compensation behavior',async()=>{
  for(const expired of [false,true]){
   const f=fixture();await f.run();f.state.journal=f.state.journal.filter(row=>['prepared','publication_staged'].includes(row.step));f.state.publicVerified=false;
   for(const row of f.state.journal)row.created_at=new Date(Date.now()-(expired?16*60*1000:60*1000)).toISOString();
   const mutations=f.state.rpc.length;
   await assert.rejects(f.run(),error=>error.code===(expired?'invalid_transition':'request_in_progress'));
   assert.equal(f.state.rpc.length,mutations+(expired?1:0));assert.equal(f.state.rpc.filter(row=>row.name==='rcap_service_stage_real_launch').length,1);
   if(expired){assert.equal(f.state.rpc.at(-1).name,'rcap_service_compensate_real_launch');assert.equal(f.state.journal.at(-1).step,'failed');const count=f.state.rpc.length;await assert.rejects(f.run(),error=>error.code==='invalid_transition');assert.equal(f.state.rpc.length,count,'Failed operation is not compensated repeatedly');}
   else assert.equal(f.state.journal.at(-1).step,'publication_staged');
   f.assertImmutable();
  }
 });
 await check('interrupted stage rejects cross-Preview replay and mismatched prepared operation, actor, request, workspace, tenant or snapshot',async()=>{
  for(const field of ['operation_id','actor_auth_user_id','request_id','workspace_id','partner_slug','snapshot_hash','different_preview']){
   Object.assign(process.env,environment);const f=fixture();await f.run();f.state.journal=f.state.journal.filter(row=>['prepared','publication_staged'].includes(row.step));
   for(const row of f.state.journal)row.created_at=new Date(Date.now()-16*60*1000).toISOString();
   if(field==='different_preview'){process.env.VERCEL_DEPLOYMENT_ID='dpl_SyntheticPreviewB';process.env.VERCEL_URL='different-owned-preview.vercel.app';}
   else f.state.journal.find(row=>row.step==='prepared')[field]='mismatched';
   const mutations=f.state.rpc.length,fetches=f.state.fetches.length;
   await assert.rejects(f.resume(),/different Preview release/);assert.equal(f.state.rpc.length,mutations);assert.equal(f.state.fetches.length,fetches);f.assertImmutable();
  }
 });
 await check('every mutation/preflight origin check supplies the authenticated context; release endpoint only reports source binding',async()=>{
  for(const file of [base+'launch-preflight.ts',base+'program-launch-preflight.ts',base+'synthetic-launch-service.ts','src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/launch/route.ts']){
   const source=read(file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),calls=[];function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='realLaunchOrigin')calls.push(node);ts.forEachChild(node,visit);}visit(ast);assert.ok(calls.length,file);for(const call of calls)assert.deepEqual(call.arguments.map(a=>a.getText(ast)),['process.env','context'],file);
  }
  assert.ok(read('src/app/api/rcap/release/route.ts').includes('realLaunchSourceBound()'));
  assert.equal((read(base+'synthetic-launch-service.ts').match(/\bfetch\(/g)??[]).length,1,'All readbacks share the exact-origin guarded transport');
 });
}finally{for(const [key,value]of Object.entries(originalEnv))if(value===undefined)delete process.env[key];else process.env[key]=value;}
console.log(JSON.stringify({qualification:'Actual managed Start/preflight/decision/launch controller functions executed without behavioral rewriting, with real changed security helpers; synthetic Auth/DB/policy/material/provider ports only. No hosted session, real SQL, permission grant or delivery claim.',passed:checks.length,failed:0,checks},null,2));
