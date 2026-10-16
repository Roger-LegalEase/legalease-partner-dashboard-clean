import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),load=p=>import(pathToFileURL(path.join(root,p)).href);
const baseline=process.argv.includes('--baseline'),out=process.env.RCAP_MN_TWO_RECEIPT;
if(out)assert(!fs.existsSync(out),'Receipt must be fresh');
if(baseline){
  assert(process.env.RCAP_MN_TWO_PREIMAGES);
  for(const relative of ['src/lib/rcap-engine/packet-planner.ts','src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts']){
    const url=pathToFileURL(path.join(root,relative)).href;
    const source=ts.transpileModule(fs.readFileSync(path.join(process.env.RCAP_MN_TWO_PREIMAGES,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(relative).toString('hex'),{data:{url,source}});
  }
}
const H=await load('src/lib/expungement-ai/mn-two-county-source-facts.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {selectComposedRoute}=await load('src/lib/rcap-engine/composed-route-selector.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('MN'),routes=[H.MN_PETITION_ROUTE,H.MN_PROSECUTOR_ROUTE];
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const rows=[],observations=[],transportObservations=[],ssrEvidence=[];const test=(name,fn)=>{try{fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.message,stack:e.stack});}};
const clone=x=>structuredClone(x);
const collect=(route,screeningAnswers={},savedAnswers={},extra={})=>resolvePacketCollection({jurisdiction:'MN',pathwayId:route,
 requiredInputIds:packetPlanForPathway(profile,route).requiredInputIds,serverFacts:{},screeningAnswers,savedAnswers,
 questionById:new Map(H.mnTwoCountyQuestions(route).map(q=>[q.id,q])),specification:packetSpecificationFor('MN:'+route),...extra});
const fixtureFor=route=>fixtures.find(f=>f.pathwayKey==='MN:'+route);
for(const route of routes){
 const plan=packetPlanForPathway(profile,route),ids=H.mnTwoCountyFactIds(route);
 test(route+' exact adopted tuple',()=>assert(H.mnTwoCountySourceContract(profile,route,null)));
 test(route+' distinct required plan inputs',()=>{for(const id of ids)assert(plan.requiredInputIds.includes(id),id);});
 const collection=collect(route,{residency_or_location:'Minnesota residence, not case county',county:'Ramsey',city:'Saint Paul'});
 observations.push({route,plan,collection});
 test(route+' generic answer never fills new facts',()=>{for(const id of ids)assert.equal(collection.knownFacts[id],undefined);});
 test(route+' source required facts replace legacy purpose',()=>{assert.equal(collection.facts.find(f=>f.factId==='residency_or_location').source,'mn_two_county_legacy_context');for(const id of ids)assert.equal(collection.facts.find(f=>f.factId===id).source,'mn_two_county_source_fact');});
 test(route+' explicit required source facts are actually grouped',()=>{for(const id of ids.filter(id=>id!==H.MN_PROSECUTING_CITY))assert(collection.groupedParticipantSections.some(s=>s.factIds.includes(id)));});
 test(route+' wrong source/memo/map/wiring/spec/route refuse',()=>{
  for(const patch of [{memo:{}},{map:{}},{wiring:{}}])assert.equal(H.mnTwoCountySourceContract(profile,route,null,patch),false);
  for(const patch of [p=>p.profileVersion+='x',p=>p.source.sourceCorpusSha256+='x',p=>p.pathways.find(x=>x.id===route).legalAuthority.ruleId+='x']){const changed=clone(profile);patch(changed);assert.equal(H.mnTwoCountySourceContract(changed,route,null),false);}
  assert.equal(H.mnTwoCountySourceContract(profile,route,{}),false);assert.equal(H.mnTwoCountySourceContract(profile,'other',null),false);
 });
 test(route+' explicit route/human/override responsibility is not waived',()=>{
  for(const extra of [{routeDecidingFactIds:new Set(['residency_or_location'])},{unresolvedRouteFactIds:new Set(['residency_or_location'])},{override:{needsHumanClassification:['residency_or_location']}},{override:{classes:{residency_or_location:'render_required'},note:'Exact explicit consumer'}}]){
   const c=collect(route,{}, {},extra);assert.notEqual(c.facts.find(f=>f.factId==='residency_or_location').source,'mn_two_county_legacy_context');
  }
 });
 test(route+' caller-unresolved source inputs retain original scope guard',()=>{
  for(const id of ids){const c=collect(route,{}, {},{unresolvedRouteFactIds:new Set([id])});const f=c.facts.find(f=>f.factId===id);assert.equal(f.collection,'unresolved');assert.equal(f.source,'unresolved_route_rule_scope');assert(c.unresolvedRequiredFacts.includes(id));}
 });
 test(route+' no composed route/authority inference',()=>assert.deepEqual(selectComposedRoute({jurisdiction:'MN',pathwayId:route}),{status:'no_composed_route',trackId:null}));
 test(route+' ENES exact source meanings available',()=>{for(const q of H.mnTwoCountyQuestions(route)){assert(q.required);assert(q.translations.es.prompt);assert(q.translations.es.helperText);}});
 for(const value of [undefined,{unknown:true},'',{value:'',unknown:false}])test(route+' unknown/cleared fresh county never falls back '+JSON.stringify(value),()=>{
  const id=ids[0],saved=value===undefined?{}:{[id]:value};const c=collect(route,{residency_or_location:'Hennepin',county:'Ramsey'},saved);assert.equal(c.knownFacts[id],undefined);assert(c.renderQuestions.includes(id));
 });
 test(route+' fresh fact is same-ID only; saved remains editable',()=>{const id=ids[0],c=collect(route,{[id]:'Ramsey'});assert.equal(c.knownFacts[id],'Ramsey');assert.equal(c.derivedFacts[id],undefined);const saved=collect(route,{}, {[id]:'Ramsey'});assert(saved.renderQuestions.includes(id));});
 const fixture=fixtureFor(route);assert(fixture,route);const answers=clone(fixture.answers);
 test(route+' original B counterexample preserves observed source outcome, not entitlement',()=>{
  const answers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Arrest or citation with no charge filed',offense_level:'Misdemeanor',possible_pathway_context:profile.pathways.find(p=>p.id===route).label,identity_error:'Yes',pending_cases:'No',resolved_timing_bucket:'gt_10_years',court_requirements_completed:'yes'};
  const observed=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
  assert.equal(observed.evaluation.pathwayId,route);assert.equal(observed.evaluation.resultCode,route===H.MN_PETITION_ROUTE?'packet_ready_with_caution':'guidance_only');assert.equal(observed.evaluation.paymentAllowed,route===H.MN_PETITION_ROUTE);assert.equal(observed.selectedTrackId,null);
 });
 test(route+' retained diagnostic is not entitled by collection',()=>{
  const before=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
  assert.throws(()=>evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers:{...answers,[ids[0]]:'Ramsey'}}),/Unknown question ids/);
  assert.equal(before.evaluation.pathwayId,route);
 });
 const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'mn-source-test',answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seed);
 seed.snapshot.packetAnswers.residency_or_location={value:'Original raw location',unknown:false};
 seed.snapshot.dependencies.semanticAnswerHistory=[{factId:'residency_or_location',value:'Older original location',source:'packetAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MN:'+route,profileVersion:profile.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
 let record={status:'unverified',reason:'synthetic-source-test',revision:3,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};
 const original=clone(record),model=P.protectedPacketInformationModelFor(record);
 test(route+' plain model offers the same exact source descriptors',()=>{
  const m=P.packetInformationModelFor({id:'mn-source-test',state:'MN',resultCode:'packet_ready_with_caution',pathwayLabel:profile.pathways.find(p=>p.id===route).label,artifactRefs:{}});
  assert(m);for(const id of ids){assert(m.requiredInputIds.includes(id));assert.deepEqual(m.questions.find(q=>q.id===id),model.questions.find(q=>q.id===id));}
 });
 test(route+' old exact plan is recoverable without raw read mutation',()=>{
  if(!record.draftSnapshot.packetPlan)return;
  const old=clone(record);old.draftSnapshot.packetPlan.requiredInputIds=old.draftSnapshot.packetPlan.requiredInputIds.filter(id=>!ids.includes(id));
  old.draftSnapshot.requiredInputIds=old.draftSnapshot.packetPlan.requiredInputIds;
  old.draftHash=P.protectedPacketDraftHash(old.draftSnapshot);const before=clone(old);
  const recovered=P.protectedPacketInformationModelFor(old);assert(recovered);for(const id of ids)assert(recovered.requiredInputIds.includes(id));assert.deepEqual(old,before);
  assert(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'unverified'));
  assert(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'invalidated'));
  assert.equal(P.mnTwoCountyDraftSuccessor(old.draftSnapshot,authoritative,'verified'),null);
  assert.equal(P.mnTwoCountyDraftSuccessor({...old.draftSnapshot,packetPlan:null,requiredInputIds:[],packetFamilyIdentifiers:{mode:null,sourceFormIds:[]}},authoritative,'unverified'),null,'A genuinely absent plan is never manufactured');
  assert.equal(P.mnTwoCountyDraftSuccessor({...old.draftSnapshot,schemaVersion:'expungement-ai/final-verification/v1'},authoritative,'unverified'),null);
  for(const change of [x=>x.serverFacts.injected='x',x=>x.profileSourceFingerprint+='x',x=>x.profileAuthorityFingerprint+='x',x=>x.profileVersion+='x',x=>x.paymentAllowed=!x.paymentAllowed,x=>x.resultCode='likely_not_eligible',x=>x.selectedTrackId='invented',x=>x.packetFamilyIdentifiers.mode='invented',x=>x.packetPlan.formMappingStatus='invented',x=>x.requiredInputIds.push('invented')]){
    const altered=clone(old.draftSnapshot);change(altered);assert.notDeepEqual(altered,old.draftSnapshot,'Every negative control must actually mutate the preimage');assert.equal(P.mnTwoCountyDraftSuccessor(altered,authoritative,'unverified'),null);
  }

 });
 test(route+' protected source questions and legacy view',()=>{assert(model);for(const id of ids){assert(model.requiredInputIds.includes(id));assert(model.questions.some(q=>q.id===id));assert(P.editablePacketInputIds(model,true).has(id));}assert.equal(model.questions.find(q=>q.id==='residency_or_location').required,true,'Actual unresolved record-origin rule is not waived by a new county fact');const c=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:model.requiredInputIds,serverFacts:model.serverFacts,screeningAnswers:model.screeningAnswers,prefilledAnswers:model.prefilledAnswers,savedAnswers:model.packetAnswers});assert.equal(c.facts.find(f=>f.factId==='residency_or_location').source,'unresolved_route_rule_scope');assert.deepEqual(record,original);});
 const item={id:'mn-source-test',state:'MN',jurisdiction:'MN',artifactRefs:{},resultCode:authoritative.evaluation.resultCode,pathwayLabel:authoritative.evaluation.pathwayLabel};
 test(route+' ordinary read/noop retains exact maps/history',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{},protectedVerification:record});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,record);assert.equal(patch.protectedTransition.expectedPriorRevision,3);});
 test(route+' exact fresh fact can be saved without commerce/legacy loss',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:'Ramsey'},protectedVerification:record});assert(patch);record=patch.protectedTransition.nextVerification;assert.notEqual(record.status,'verified');assert.deepEqual(record.draftSnapshot.packetAnswers.residency_or_location,original.draftSnapshot.packetAnswers.residency_or_location);assert.deepEqual(record.draftSnapshot.dependencies.semanticAnswerHistory,original.draftSnapshot.dependencies.semanticAnswerHistory);assert.equal(record.draftSnapshot.packetAnswers[ids[0]],'Ramsey');assert.equal(record.draftSnapshot.paymentAllowed,original.draftSnapshot.paymentAllowed);assert.equal(record.draftSnapshot.resultCode,original.draftSnapshot.resultCode);assert.equal(record.draftSnapshot.selectedTrackId,original.draftSnapshot.selectedTrackId);assert.equal(P.protectedPacketInformationModelFor(record).reviewSafety.safe,false);});
 test(route+' unknown explicit save retains literal and cannot refill',()=>{const patch=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:{unknown:true}},protectedVerification:record});assert(patch);const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers[ids[0]],{unknown:true});const m=P.protectedPacketInformationModelFor(next);const c=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:m.requiredInputIds,serverFacts:m.serverFacts,screeningAnswers:m.screeningAnswers,prefilledAnswers:m.prefilledAnswers,savedAnswers:m.packetAnswers});assert(c.renderQuestions.includes(ids[0]));assert.equal(c.knownFacts[ids[0]],undefined);});
 test(route+' unknown county cannot produce verified acceptance',()=>{
  const unknown=P.packetInformationPatch({existingItem:item,answers:{[ids[0]]:{unknown:true}},protectedVerification:record});assert(unknown);
  const attempted=P.packetInformationPatch({existingItem:item,answers:{},verify:true,protectedVerification:unknown.protectedTransition.nextVerification});
  assert(!attempted||attempted.protectedTransition.nextVerification.status!=='verified');
 });
 test(route+' source tamper does not grant correction entry',()=>{const altered=clone(record);altered.draftSnapshot.profileSourceFingerprint+='x';altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);const m=P.protectedPacketInformationModelFor(altered);assert.equal(m,null);assert.equal(H.mnTwoCountySourceContract({...profile,profileVersion:'wrong'},route,null),false);assert.equal(P.factualPathwayCorrectionIds('OH',route,{}).some(id=>ids.includes(id)),false);});
}
for(const kind of ['county_attorney','city_attorney','unknown','',undefined])test('prosecuting city depends only on explicit kind '+kind,()=>{const c=collect(H.MN_PROSECUTOR_ROUTE,{[H.MN_PROSECUTOR_KIND]:'city_attorney',[H.MN_PROSECUTING_CITY]:'Saint Paul'},{[H.MN_PROSECUTOR_KIND]:kind});const f=c.facts.find(f=>f.factId===H.MN_PROSECUTING_CITY);assert.equal(f.active,kind==='city_attorney');});
// Exact four accepted MN sibling collections/plans are compared to the
// preserved preimage execution, not re-approved or run as four owner suites.
const siblings=profile.pathways.filter(p=>!routes.includes(p.id)).map(p=>({route:p.id,
  plan:packetPlanForPathway(profile,p.id),collection:collect(p.id,{residency_or_location:'Original retained location'})}));
if(!baseline&&process.env.RCAP_MN_TWO_BASELINE){
 const predecessor=JSON.parse(fs.readFileSync(process.env.RCAP_MN_TWO_BASELINE));
 test('all four accepted MN siblings remain exact',()=>assert.deepEqual(siblings,predecessor.siblings));
}

if(!baseline){
 const compile=(relative,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(relative).toString('hex'),{data:{url:pathToFileURL(path.join(root,relative)).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
 const localization='src/components/expungement-ai/LocalizationProvider.tsx';compile(localization,fs.readFileSync(localization,'utf8')+'\nexport {LocalizationContext};');
 const {LocalizationContext}=await load(localization),React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
 const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
 const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js')).href);
 const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
 let stored,sourceAnswers,owner='synthetic-mn-owner';const item={id:'synthetic-mn-source-bridge',state:'MN',jurisdiction:'MN',artifactRefs:{}};
 const presentation=()=>decorate({consumerAuthUserId:owner,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
 globalThis.__mnTwoTransport={requireConsumerBriefcaseSession:async()=>({userId:owner,userEmail:'synthetic@example.invalid'}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mn-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:presentation,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=clone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
 const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mnTwoTransport.'+b+'(...args);').join('\n'));};
 for(const relative of ['src/app/briefcase/[packetId]/page.tsx','src/app/briefcase/[packetId]/packet-information/page.tsx']){
  let source=fs.readFileSync(relative,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
  source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
  for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])source=substitute(source,[b],'@/lib/expungement-ai/'+m);
  compile(relative,source);
 }
 const Matter=(await load('src/app/briefcase/[packetId]/page.tsx')).default,Editor=(await load('src/app/briefcase/[packetId]/packet-information/page.tsx')).default;
 const apiRelative='src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';let apiSource=fs.readFileSync(apiRelative,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiRelative,apiSource);const API=await load(apiRelative);
 const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
 const url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',context={params:Promise.resolve({itemId:item.id})};
 const post=async(answers,extra={})=>{const before=clone(stored),body={expectedRevision:stored.revision,answers,...extra};const response=await API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),context);transportObservations.push({route:before.draftSnapshot.pathwayId,request:body,status:response.status,body:await response.clone().json(),before,after:clone(stored)});return response;};
 const asyncTest=async(name,fn)=>{try{await fn();rows.push({name,pass:true});}catch(e){rows.push({name,pass:false,error:e.message,stack:e.stack});}};
 for(const route of routes){
  sourceAnswers=clone(fixtureFor(route).answers);const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});assert(seed);
  if(seed.snapshot.packetPlan){seed.snapshot.packetPlan.requiredInputIds=seed.snapshot.packetPlan.requiredInputIds.filter(id=>!H.mnTwoCountyFactIds(route).includes(id));seed.snapshot.requiredInputIds=seed.snapshot.packetPlan.requiredInputIds;}
  seed.snapshot.packetAnswers.residency_or_location={value:'Exact old raw location',unknown:false};
  stored={status:'unverified',reason:'old-synthetic-draft',revision:7,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};const old=clone(stored);
  for(const locale of ['en','es'])await asyncTest(route+' actual old matter/editor entry '+locale,async()=>{
   const matter=html(await Matter({params:Promise.resolve({packetId:item.id})}),locale);assert(matter.includes('/briefcase/'+item.id+'/packet-information'));assert(!matter.includes('Details unavailable'));assert(!matter.includes('Detalles no disponibles'));
   const page=html(await Editor({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:H.mnTwoCountyFactIds(route)[0]})}),locale);const prompt=H.mnTwoCountyQuestions(route)[0].translations?.[locale]?.prompt??H.mnTwoCountyQuestions(route)[0].prompt;assert(page.includes(renderToStaticMarkup(React.createElement('span',null,prompt)).slice(6,-7)));assert.deepEqual(stored,old);if(out){for(const [kind,markup]of [['matter',matter],['editor',page]]){const file=out.replace(/\.json$/,'.'+(route===H.MN_PETITION_ROUTE?'petition':'prosecutor')+'.'+kind+'.'+locale+'.html');fs.writeFileSync(file,markup,{flag:'wx'});ssrEvidence.push({route,kind,locale,file,bytes:Buffer.byteLength(markup)});}}
  });
  await asyncTest(route+' protected actual GET exposes required source IDs/commercial flags',async()=>{const response=await API.GET(new Request(url),context);assert.equal(response.status,200);const body=await response.json();for(const id of H.mnTwoCountyFactIds(route))assert(JSON.stringify(body).includes(id));const present=await presentation();assert.equal(present.commercialActions.fulfillmentAvailable,false);assert.equal(present.commercialActions.checkoutAllowed,false);assert.equal(present.commercialActions.generationAllowed,false);assert.deepEqual(stored,old);});
  await asyncTest(route+' protected actual noop preserves exact old record',async()=>{const response=await post({});assert.equal(response.status,200);assert.deepEqual(stored,old);});
  await asyncTest(route+' protected actual source-fact material save preserves raw',async()=>{const response=await post({[H.mnTwoCountyFactIds(route)[0]]:'Ramsey'});assert.equal(response.status,200);assert.deepEqual(stored.draftSnapshot.packetAnswers.residency_or_location,old.draftSnapshot.packetAnswers.residency_or_location);assert.equal(stored.draftSnapshot.packetAnswers[H.mnTwoCountyFactIds(route)[0]],'Ramsey');assert.notEqual(stored.status,'verified');if(!old.draftSnapshot.packetPlan)assert.equal(stored.draftSnapshot.packetPlan,null);});
  await asyncTest(route+' posted-field owner/CAS/verify controls remain',async()=>{const revision=stored.revision;assert.equal((await post({unowned_fact:'x'})).status,422);assert.equal((await post({},{expectedRevision:revision-1})).status,409);owner='wrong-owner';assert.equal((await post({})).status,404);owner='synthetic-mn-owner';const verify=await post({},{verify:true});assert.equal(verify.status,200,'The existing API saves a truthful unverified draft; HTTP200 is not verification');const verifiedBody=await verify.json();assert.equal(verifiedBody.ok,true);assert.equal(verifiedBody.readyToGenerate,false);assert.equal(verifiedBody.reviewReason,'packet_information_incomplete');assert.equal(stored.status,'invalidated');assert.equal(stored.reason,'packet_information_incomplete');assert.equal(stored.snapshot,undefined);assert.equal(stored.hash,undefined);assert.equal(stored.revision,revision+1);const present=await presentation();assert.equal(present.commercialActions.checkoutAllowed,false);assert.equal(present.commercialActions.generationAllowed,false);});
 }
}
const result={status:rows.some(x=>!x.pass)?'FAIL':'PASS',baseline,passed:rows.filter(x=>x.pass).length,failed:rows.filter(x=>!x.pass),observations,siblings,transportObservations,ssrEvidence,limits:'Pure local source/collector/model/transition checks only; no DB/browser/owner/document mapping/eligibility or commercial authority.'};
if(out)fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,baseline,passed:result.passed,failed:result.failed},null,2));if(result.status==='FAIL')process.exitCode=1;
