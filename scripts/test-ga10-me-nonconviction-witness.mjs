// Original GA10 identity Q-d1feb44d866406e8a2e2; no DB, legal approval or owner claim.
import assert from'node:assert/strict';import fs from'node:fs';import{register}from'node:module';import {pathToFileURL}from'node:url';import ts from'typescript';import React from'react';import {renderToStaticMarkup}from'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);process.env.RCAP_EVALUATOR_TODAY='2026-10-14';
const localizationFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
const localizationSource=ts.transpileModule(fs.readFileSync(localizationFile,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sourceLoader='data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}');
register(sourceLoader,{data:{url:pathToFileURL(localizationFile).href,source:localizationSource}});
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(process.cwd()+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts'),{evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts'),P=await import('../src/lib/expungement-ai/packet-information.ts'),{projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts'),{selectScreeningQuestionIds:select}=await import('../src/lib/rcap-engine/screening-question-selection.ts'),{sanitizeResumedAnswersForQuestionIds:resume}=await import('../src/components/expungement-ai/screening/screens.ts'),{maineNonconvictionQuestionApplies:applies,ME_NONCONVICTION_ROUTE:route}=await import('../src/lib/rcap-engine/maine-nonconviction-facts.ts');
const profile=getProfileByJurisdiction('ME'),pub=projectPublicProfile(profile),memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/ME.memo.json')),track=memo.tracks.find(t=>t.trackId==='me-nonconv'),inventory=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
assert.equal(inventory.originalMissingWitnesses.length,22);assert(inventory.originalMissingWitnesses.some(r=>r.questionRecordId==='Q-d1feb44d866406e8a2e2'&&r.routeKey==='ME:'+route));assert.equal(inventory.currentBatch.routeKey,'KS:drug-registration-relief-coordination');
assert(track.controllingAuthority.citations.includes('16 M.R.S. § 703'));assert(!track.participantInputs.some(i=>/financial|fine|restitution/i.test(i.key)));assert(track.exclusions.some(x=>/not criminally responsible/.test(x)));assert(track.exclusions.some(x=>/deferred disposition/.test(x)));assert.equal(profile.pathways.find(p=>p.id===route).legalAuthority.paymentAuthority,'closed');
const w=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(x=>x.pathwayKey==='ME:adult-conviction-sealing');
const base={...w.finalAnswers,possible_pathway_context:profile.pathways.find(x=>x.id===route).label,case_outcome:'Acquitted or found not guilty',age_at_offense:'30'},item={id:'synthetic-me-ga10',jurisdiction:'ME',artifactRefs:{}},run=answers=>evaluate({jurisdiction:'ME',profileVersion:profile.profileVersion,matterId:item.id,answers});
const question=pub.questions.find(q=>q.id==='financial_obligations');assert.equal(question.prompt,'Have you paid off everything the court charged?');assert.equal(question.translations.es.prompt,'¿Pagó todo lo que cobró el tribunal?');
const rows=[];
for(const hinted of [true,false])for(const age of ['30',{value:'30',unknown:false}])for(const financial of ['Yes','No','I am not sure',undefined]){
 const answers={...base,age_at_offense:age,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;if(!hinted)delete answers.possible_pathway_context;
 const before=JSON.stringify(answers),a=run(answers),e=a.evaluation;assert.equal(e.pathwayId,route);assert.equal(e.resultCode,'guidance_only');assert.equal(e.paymentAllowed,false);assert.deepEqual(e.packetPlan.sourceFormIds,[]);assert(!e.missingQuestionIds?.includes('financial_obligations'));
 const selected=select(profile,pub,answers);assert(!selected.includes('financial_obligations'));assert.deepEqual(resume(pub,answers,selected).financial_obligations,financial);assert.equal(JSON.stringify(answers),before);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'}),record={status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},model=P.protectedPacketInformationModelFor(record);assert(model);assert.equal(model.initialAnswers.financial_obligations,financial);assert(!model.builderQuestions.some(q=>q.id==='financial_obligations'));assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'));
 const restoredQuestion={...answers,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'};assert(select(profile,pub,restoredQuestion).includes('financial_obligations'));assert.equal(resume(pub,restoredQuestion,select(profile,pub,restoredQuestion)).financial_obligations,financial);
 rows.push({hinted,ageShape:typeof age,financial:financial??'absent',result:e.resultCode,financialInactive:true,rawPreserved:true,remainingReviewFinancial:P.reviewEditablePacketInputIds(model).has('financial_obligations')});
}
for(const age of [undefined,null,'',17,'17',{value:'30',unknown:true},{value:'30',unknown:false,extra:'bad'},['30'],true,30.5])assert(applies('ME',route,{...base,age_at_offense:age},'financial_obligations'));
for(const outcome of ['I am not sure','Dismissed, no-billed, nolle prosequi, or not prosecuted','Diversion, deferred disposition, supervision, or similar program','Juvenile adjudication or offense committed as a minor','Other conviction or adjudication'])assert(applies('ME',route,{...base,case_outcome:outcome},'financial_obligations'));
for(const state of ['NE','LA','KS','GA','MS'])assert(applies(state,route,base,'financial_obligations'));for(const p of profile.pathways.filter(p=>p.id!==route))assert(applies('ME',p.id,base,'financial_obligations'));
const explicitSibling={...base,possible_pathway_context:'Adult conviction sealing'};assert(select(profile,pub,explicitSibling).includes('financial_obligations'));assert(applies('ME',route,base,'case_outcome'));
const {packetPlanForPathway}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {isMaineNonconvictionGuidanceWithoutCr218:withoutCr218}=await import('../src/lib/rcap-engine/maine-nonconviction-facts.ts');
const correctedPlan=packetPlanForPathway(profile,route),compiled=profile.packetGenerator.pathways.find(p=>p.pathwayId===route);
assert(withoutCr218(profile,route));assert.equal(correctedPlan.formMappingStatus,'not_required');assert.deepEqual(correctedPlan.sourceFormIds,[]);assert.deepEqual(correctedPlan.sourceRuleRefs,compiled.sourceRuleRefs);
const plannerGuards=[];
for(const [name,change]of [
 ['state',p=>p.jurisdiction.code='LA'],['version',p=>p.profileVersion='wrong'],['source',p=>p.source.sourceCorpusSha256='wrong'],
 ...Object.entries({decisionId:'wrong',ruleId:'wrong',outcomeMode:'packet_assembly',paymentAuthority:'open'}).map(([key,value])=>['authority '+key,p=>{p.pathways.find(p=>p.id===route).legalAuthority[key]=value}]),
 ['filing',p=>p.pathways.find(p=>p.id===route).filingRequired=true],['route type',p=>p.pathways.find(p=>p.id===route).routeType='court_filing'],
 ['rule refs',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).sourceRuleRefs=['other']],
 ['form bytes',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates[0].sha256='changed'],
 ['other form',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates[0].relativePath='LegalEase Maine/MJB-Form-cr-289.pdf'],
 ['added form',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates.push({...p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates[0],relativePath:'another.pdf'})]
]){
 const altered=structuredClone(profile);change(altered);assert.equal(withoutCr218(altered,route),false,name);const candidate=altered.packetGenerator.pathways.find(p=>p.pathwayId===route);assert.equal(packetPlanForPathway(altered,route).sourceFormIds.length,candidate.formCandidates.length,name);plannerGuards.push(name);
}
for(const sibling of profile.packetGenerator.pathways.filter(p=>p.pathwayId!==route)){assert.equal(withoutCr218(profile,sibling.pathwayId),false);assert.deepEqual(packetPlanForPathway(profile,sibling.pathwayId).sourceFormIds,sibling.formCandidates.map(f=>'ME:'+f.relativePath+':'+f.sha256));}
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const recordFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:run(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);return {status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot}};
const present=record=>decorate({consumerAuthUserId:'synthetic-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:runRequest=>evaluate(runRequest),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
// Keep actual matter page and conditionals; replace only server transports/font shell.
const pageFile=process.cwd()+'/src/app/briefcase/[packetId]/page.tsx';let source=fs.readFileSync(pageFile,'utf8');
source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/, 'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(source.includes(original));source=source.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__meTransport.'+binding+'(...args);')}
const compiledPage=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(pageFile).href,source:compiledPage}});
const {default:Page}=await import(pathToFileURL(pageFile).href);
function nodes(e,out=[]){if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out}if(e.props){out.push(e);nodes(e.props.children,out)}return out}
async function ownerMatter(record){const view=await present(record);assert.equal(view.resultCode,'guidance_only');assert.equal(view.authorityStatus,'protected_draft');assert.notEqual(view.verificationStatus,'verified');assert.equal(Object.values(view.commercialActions).some(Boolean),false);globalThis.__meTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};const tree=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(tree.some(e=>e.props['data-briefcase-matter-id']===item.id),'actual owner matter remains available');assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'),'actual offered owner correction entry');return view;}
// Execute the original HTTP handlers with only authenticated/storage transport
// seams. This verifies the handler contract; it is not authenticated acceptance.
const apiFile=process.cwd()+'/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';
let apiSource=fs.readFileSync(apiFile,'utf8');
for(const [bindings,module] of [
 [['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],
 [['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],
 [['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],
 [['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');
 assert(pattern.test(apiSource),module);
 apiSource=apiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__meApiTransport.'+binding+'(...args);').join('\n'));
}
const apiCompiled=ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:apiCompiled}});
const API=await import(pathToFileURL(apiFile).href);let stored=recordFor(base),writeCount=0;
globalThis.__meApiTransport={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-owner',userEmail:'owner@example.test'}),getBriefcaseItem:async()=>item,
 readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:async()=>present(stored),
 persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writeCount++;stored=JSON.parse(JSON.stringify(transition.nextVerification));return {ok:true,value:stored}},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw new Error('no trusted seed substitution')},readTrustedBriefcasePresentationSource:()=>{throw new Error('no trusted source substitution')}};
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=async body=>API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),context);
// Actual correction page + original handler lifecycle, no database transport.
const correctionFile=process.cwd()+'/src/app/briefcase/[packetId]/packet-information/page.tsx';let correctionSource=fs.readFileSync(correctionFile,'utf8');
correctionSource=correctionSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(correctionSource.includes(original));correctionSource=correctionSource.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__meTransport.'+binding+'(...args);');
}
register(sourceLoader,{data:{url:pathToFileURL(correctionFile).href,source:ts.transpileModule(correctionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const {default:CorrectionPage}=await import(pathToFileURL(correctionFile).href);
async function correctionFor(record,edit="case_outcome"){
 const view=await present(record);assert.equal(view.authorityStatus,'protected_draft');assert.equal(Object.values(view.commercialActions).some(Boolean),false);
 globalThis.__meTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};
 const matter=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(matter.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'));
 const tree=nodes(await CorrectionPage({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit})}));
 assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information?edit=case_outcome'));
 const builder=tree.find(e=>e.type?.name==='PacketInformationBuilder');assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),[edit]);assert.equal(builder.props.initialRouteChanged,false);assert.equal(builder.props.returnToMatterAfterCorrection,true);
 for(const locale of ['en','es']){
  const localized={locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(s,options)=>resolveRuntimeText(locale,s,options)};
  const markup=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(LocalizationContext.Provider,{value:localized},builder)));
  if(edit==='case_outcome')assert(markup.includes(locale==='es'?'¿Cómo terminó el caso?':'How did the case end?'));
  assert(markup.includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));
  if(edit!=='financial_obligations')assert(!markup.includes('data-packet-question="financial_obligations"'));
  assert(!markup.includes('Your saved answers changed which packet path')&&!markup.includes('Sus respuestas guardadas cambiaron la vía'));
 }
 return view;
}

const ownerSequences=[];let clearedRecord;
for(const financial of ['No','I am not sure',undefined]){
 const answers={...base,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;
 stored=recordFor(answers);await correctionFor(stored);await correctionFor(stored,'age_at_offense');
 for(const [label,edit,value]of [['age material','age_at_offense',{value:'31',unknown:false}],['age unknown','age_at_offense',{value:'',unknown:true}],['age cleared','age_at_offense',{value:'',unknown:false}],['outcome unsure','case_outcome','I am not sure'],['outcome cleared','case_outcome',''],['dismissal','case_outcome','Dismissed, no-billed, nolle prosequi, or not prosecuted']]){
  const before=structuredClone(stored);const response=await post({expectedRevision:stored.revision,answers:{[edit]:value}});assert.equal(response.status,200,label);const body=await response.json();assert.deepEqual(body.answers[edit],value,label+' actual applied edit');assert.equal(body.readyToGenerate,false);assert.equal(Object.values(body.commercialActions).some(Boolean),false);
  assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.notEqual(stored.status,'verified');
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(before.draftSnapshot[map]))if(id!==edit)assert.deepEqual(stored.draftSnapshot[map][id],raw);
  const model=P.protectedPacketInformationModelFor(stored);assert(model,label);assert.equal(model.initialAnswers.financial_obligations,financial);await correctionFor(stored,edit);
  if(stored.draftSnapshot.pathwayId===null){clearedRecord=structuredClone(stored);assert.deepEqual(model.heldFactualCorrectionIds,['case_outcome','age_at_offense']);}
  if(label==='dismissal'){assert(P.reviewEditablePacketInputIds(model).has('financial_obligations'));assert(P.heldPacketCorrectionInputIds(model,model.resultCode).has('financial_obligations'));await correctionFor(stored,'financial_obligations');}
  if(stored.draftSnapshot.packetPlan===null){const bytes=JSON.stringify(stored);const denied=await post({expectedRevision:stored.revision,answers:{},verify:true});assert.equal(denied.status,422);assert.equal(JSON.stringify(stored),bytes);}
  const restored=await post({expectedRevision:stored.revision,answers:{[edit]:base[edit]}});assert.equal(restored.status,200,label+' restore');const restoredBody=await restored.json();assert.deepEqual(restoredBody.answers[edit],base[edit]);assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.equal(stored.draftSnapshot.pathwayId,route);await correctionFor(stored);
  ownerSequences.push({financial:financial??'absent',label,actualHandlerRestore:true,actualPageBuilder:true,ENES:true});
 }
}
const beforeCapture=inventory.additionalSubgroups.find(group=>group.id==='ME-adult-acquittal-financial-witness-20261014').freshBaselineReproduction;
const historicalRows=[];
for(const row of [...beforeCapture.rows,...inventory.additionalSubgroups.find(group=>group.id==='ME-adult-acquittal-financial-witness-20261014').planCompatibilityReproduction.rows]){
 const record=structuredClone(row.record),bytes=JSON.stringify(record);stored=record;
 const model=P.protectedPacketInformationModelFor(stored);assert(model,'historical '+row.financial+' '+row.hinted);assert.equal(model.resultCode,'guidance_only');assert.deepEqual(model.packetPlan.sourceFormIds,[]);await correctionFor(stored);
 const oldWrites=writeCount;const get=await API.GET(new Request(url),context);assert.equal(get.status,200);assert.equal(writeCount,oldWrites);assert.equal(JSON.stringify(stored),bytes);
 const noop=await post({expectedRevision:stored.revision,answers:{}});assert.equal(noop.status,200);assert.equal(JSON.stringify(stored),bytes,'historical no-op remains exact');
 const response=await post({expectedRevision:stored.revision,answers:{age_at_offense:{value:'31',unknown:false}}});assert.equal(response.status,200);const body=await response.json();assert.deepEqual(body.answers.age_at_offense,{value:'31',unknown:false});assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.deepEqual(stored.draftSnapshot.packetPlan.sourceFormIds,[]);assert.equal(stored.draftSnapshot.paymentAllowed,false);await correctionFor(stored);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(record.draftSnapshot[map]))if(id!=='age_at_offense')assert.deepEqual(stored.draftSnapshot[map][id],raw);
 const stale=await post({expectedRevision:stored.revision+1,answers:{case_outcome:'I am not sure'}});assert.equal(stale.status,409);
 historicalRows.push({financial:row.financial,hinted:row.hinted,projection:true,noOpExact:true,materialCurrent:true,rawPreserved:true});
}
const historicalNegativeGuards=[];
for(const row of beforeCapture.rows.filter(row=>row.hinted)){
 const original=row.record.draftSnapshot,authority=run({...base,...original.screeningAnswers});
 for(const[name,change]of [
  ['wrong state',s=>s.jurisdiction='NE'],['wrong route',s=>s.pathwayId='adult-conviction-sealing'],['wrong version',s=>s.profileVersion='wrong'],['wrong source',s=>s.profileSourceFingerprint='wrong'],['wrong authority',s=>s.profileAuthorityFingerprint='wrong'],['paid',s=>s.paymentAllowed=true],['verified schema',s=>s.schemaVersion='expungement-ai/packet-verification/v1'],['track',s=>s.selectedTrackId='wrong'],['server',s=>s.serverFacts.jurisdiction='LA'],['family',s=>s.packetFamilyIdentifiers.sourceFormIds=['invented']],['extra required',s=>s.requiredInputIds.push('invented')],['other result',s=>s.resultCode='not_yet'],['unknown age',s=>s.packetAnswers.age_at_offense={value:'30',unknown:true}],...(!original.packetPlan?[['dismissal',s=>s.packetAnswers.case_outcome='Dismissed, no-billed, nolle prosequi, or not prosecuted']]:[]),
  ...(original.packetPlan?[['modified source refs',s=>s.packetPlan.sourceRuleRefs.push('invented')],['modified readiness',s=>s.packetPlan.packetReadyWhen=['true']],['added form',s=>s.packetPlan.sourceFormIds.push('invented')],['changed form',s=>s.packetPlan.sourceFormIds[0]='ME:other']]:[['known financial hold',s=>s.packetAnswers.financial_obligations='No']])
 ]){
  const snapshot=structuredClone(original);change(snapshot);const changedAuthority=run(P.protectedPacketScreeningAnswers(snapshot)??{});assert.equal(P.maineNonconvictionDraftSuccessor(snapshot,changedAuthority),null,name+' '+row.financial);historicalNegativeGuards.push({financial:row.financial,name});
 }
 const wrongAuthority=structuredClone(authority);wrongAuthority.evaluation.paymentAllowed=true;assert.equal(P.maineNonconvictionDraftSuccessor(original,wrongAuthority),null);
 const badHash=structuredClone(row.record);badHash.draftHash='changed';assert.equal(P.protectedPacketInformationModelFor(badHash),null);
}
const rejectedCorrectionHistory=[];
for(const[name,change]of [
 ['absent history',s=>{delete s.dependencies.semanticAnswerHistory}],['empty history',s=>s.dependencies.semanticAnswerHistory=[]],
 ...Object.entries({routeKey:'ME:adult-conviction-sealing',profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',meaning:'legacy',factId:'financial_obligations',source:'serverFacts',value:{unknown:false,extra:'malformed'}}).map(([key,value])=>['wrong prior '+key,s=>{s.dependencies.semanticAnswerHistory=s.dependencies.semanticAnswerHistory.map(e=>({...e,[key]:value}))}]),
 ...['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint'].map(key=>['wrong current '+key,s=>{s[key]='wrong'}])
]){
 const altered=structuredClone(clearedRecord);change(altered.draftSnapshot);altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);const model=P.protectedPacketInformationModelFor(altered);assert.equal(model?.heldFactualCorrectionIds?.length??0,0,name);if(model)assert.equal(P.heldPacketCorrectionInputIds(model,model.resultCode).size,0,name);rejectedCorrectionHistory.push(name);
}
const {maineMissingFinancialCorrectionPathway:missingContext}=await import('../src/lib/rcap-engine/maine-nonconviction-facts.ts');
const dismissal={...base,case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'};
for(const [state,path,answers,missing]of [['NE',route,dismissal,['financial_obligations']],['ME','adult-conviction-sealing',dismissal,['financial_obligations']],['ME',route,{...dismissal,age_at_offense:'17'},['financial_obligations']],['ME',route,{...dismissal,age_at_offense:{value:'30',unknown:true}},['financial_obligations']],['ME',route,base,['financial_obligations']],['ME',route,dismissal,['financial_obligations','case_outcome']]])assert.equal(missingContext(state,path,answers,missing),false);
const report={status:'PASS_ME_PURE_CONSUMERS',identity:'Q-d1feb44d866406e8a2e2',rows,plannerGuards,ownerSequences,historicalRows,historicalNegativeGuards,rejectedCorrectionHistory,remaining:['Independent verification and authenticated acceptance']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:rows.length,ownerSequences:ownerSequences.length}));
