// Original GA10 identity Q-a2be4b53e78457449f53. Pure consumers, no owner/closure claim.
import assert from'node:assert/strict';import fs from'node:fs';import{register}from'node:module';import {pathToFileURL}from'node:url';import ts from'typescript';import React from'react';import {renderToStaticMarkup}from'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);process.env.RCAP_EVALUATOR_TODAY='2026-10-14';
const localizationFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
const localizationSource=ts.transpileModule(fs.readFileSync(localizationFile,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sourceLoader='data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}');
register(sourceLoader,{data:{url:pathToFileURL(localizationFile).href,source:localizationSource}});
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(process.cwd()+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts'),{evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts'),P=await import('../src/lib/expungement-ai/packet-information.ts'),{projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts'),{selectScreeningQuestionIds:select}=await import('../src/lib/rcap-engine/screening-question-selection.ts'),{sanitizeResumedAnswersForQuestionIds:resume}=await import('../src/components/expungement-ai/screening/screens.ts'),{missouriClosedRecordQuestionApplies:rawApplies,MO_CLOSED_RECORD_ROUTE:route,isMissouriClosureGuidanceWithoutIdentityForm:withoutForm}=await import('../src/lib/rcap-engine/missouri-closed-record-facts.ts'),{packetPlanForPathway:planFor}=await import('../src/lib/rcap-engine/packet-planner.ts');
const profile=getProfileByJurisdiction('MO'),pub=projectPublicProfile(profile),memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json')).tracks.find(t=>t.trackId==='mo-610-105-automatic-closure'),inventory=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
const applies=(state,path,answers,id,source=profile)=>rawApplies(state,path,answers,id,source);
assert.equal(inventory.originalMissingWitnesses.length,22);assert(inventory.originalMissingWitnesses.some(r=>r.questionRecordId==='Q-a2be4b53e78457449f53'&&r.routeKey==='MO:'+route));assert.equal(inventory.currentBatch.routeKey,'KS:drug-registration-relief-coordination');
assert(memo.controllingAuthority.citations.includes('Mo. Rev. Stat. § 610.105'));assert(!memo.participantInputs.some(i=>/financial|fine|restitution/i.test(i.key)));assert.equal(memo.outputStrategy,'process_guidance');assert(memo.guidanceRationales.includes('no_participant_filing_exists'));assert.equal(profile.pathways.find(p=>p.id===route).legalAuthority.paymentAuthority,'closed');assert(memo.exclusions.some(s=>s.includes('finally terminated')));assert(memo.exclusions.some(s=>s.includes('suspended execution')));
const original=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(x=>x.pathwayKey==='MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140');
const base={...original.finalAnswers,possible_pathway_context:profile.pathways.find(p=>p.id===route).label,case_outcome:'Acquitted or found not guilty',identity_error:'No'},run=answers=>evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:'synthetic-mo-ga10-before',answers});
const q=pub.questions.find(q=>q.id==='financial_obligations');assert.equal(q.prompt,'Have you paid off everything the court charged?');assert.equal(q.translations.es.prompt,'¿Pagó todo lo que cobró el tribunal?');
const rows=[];for(const outcome of ['Acquitted or found not guilty','Dismissed, no-billed, nolle prosequi, or not prosecuted'])for(const financial of['Yes','No','I am not sure',undefined]){
 const answers={...base,case_outcome:outcome,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;const before=JSON.stringify(answers),a=run(answers),e=a.evaluation;assert.equal(e.pathwayId,route);assert.equal(e.resultCode,'guidance_only');assert.equal(e.paymentAllowed,false);assert.deepEqual(e.packetPlan.sourceFormIds,[]);assert(!e.missingQuestionIds.includes('financial_obligations'));assert(!select(profile,pub,answers).includes('financial_obligations'));assert.equal(resume(pub,answers,select(profile,pub,answers)).financial_obligations,financial);assert.equal(JSON.stringify(answers),before);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'}),record={status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},model=P.protectedPacketInformationModelFor(record);assert(model);assert.equal(model.initialAnswers.financial_obligations,financial);assert(!model.builderQuestions.some(q=>q.id==='financial_obligations'));assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'));
 const requestedExpungement={...answers,possible_pathway_context:original.finalAnswers.possible_pathway_context};assert(select(profile,pub,requestedExpungement).includes('financial_obligations'));assert.equal(resume(pub,requestedExpungement,select(profile,pub,requestedExpungement)).financial_obligations,financial);
 rows.push({outcome,financial:financial??'absent',result:e.resultCode,financialInactive:true,rawPreserved:true,remainingReviewFinancial:P.reviewEditablePacketInputIds(model).has('financial_obligations')});
}
for(const outcome of['I am not sure','Dismissed, no-billed, nolle prosequi, or not prosecuted','Diversion, deferred disposition, supervision, or similar program','Juvenile adjudication or offense committed as a minor','Other conviction or adjudication',''])assert.equal(applies('MO',route,{...base,case_outcome:outcome},'financial_obligations'),false);
for(const state of['NE','ME','LA','KS','GA','MS'])assert(applies(state,route,base,'financial_obligations'));for(const p of profile.pathways.filter(p=>p.id!==route))assert(applies('MO',p.id,base,'financial_obligations'));assert(applies('MO',route,base,'case_outcome'));
const compiled=profile.packetGenerator.pathways.find(p=>p.pathwayId===route),plan=planFor(profile,route);assert(withoutForm(profile,route));assert.deepEqual(plan.sourceFormIds,[]);assert.equal(plan.formMappingStatus,'not_required');assert.deepEqual(plan.sourceRuleRefs,compiled.sourceRuleRefs);
const guards=[];for(const[name,change]of [
 ['state',p=>p.jurisdiction.code='ME'],['version',p=>p.profileVersion='wrong'],['source',p=>p.source.sourceCorpusSha256='wrong'],
 ...Object.entries({decisionId:'wrong',ruleId:'wrong',outcomeMode:'packet_assembly',paymentAuthority:'open'}).map(([key,value])=>['authority '+key,p=>{p.pathways.find(p=>p.id===route).legalAuthority[key]=value}]),
 ['filing',p=>p.pathways.find(p=>p.id===route).filingRequired=true],['route type',p=>p.pathways.find(p=>p.id===route).routeType='court_filing'],['source refs',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).sourceRuleRefs=['other']],['form bytes',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates[0].sha256='changed'],['other form',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates[0].relativePath='other.pdf'],['added form',p=>p.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates.push({...compiled.formCandidates[0],relativePath:'another.pdf'})]
]){const altered=structuredClone(profile);change(altered);assert.equal(withoutForm(altered,route),false,name);assert.equal(applies('MO',route,base,'financial_obligations',altered),true,name);assert.equal(planFor(altered,route).sourceFormIds.length,altered.packetGenerator.pathways.find(p=>p.pathwayId===route).formCandidates.length,name);guards.push(name)}
for(const sibling of profile.packetGenerator.pathways.filter(p=>p.pathwayId!==route)){assert(!withoutForm(profile,sibling.pathwayId));assert.deepEqual(planFor(profile,sibling.pathwayId).sourceFormIds,sibling.formCandidates.map(f=>'MO:'+f.relativePath+':'+f.sha256));}
const noHint=[];for(const financial of['Yes','No','I am not sure',undefined]){const answers={...base,financial_obligations:financial};delete answers.possible_pathway_context;if(financial===undefined)delete answers.financial_obligations;const e=run(answers).evaluation;assert(select(profile,pub,answers).includes('financial_obligations'));assert.equal(e.pathwayId??null,financial===undefined?null:'general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140');assert.equal(e.resultCode,financial===undefined?'needs_more_info':financial==='Yes'?'packet_ready_with_caution':'needs_review');assert.equal(e.paymentAllowed,financial==='Yes');noHint.push({financial:financial??'absent',path:e.pathwayId??null,result:e.resultCode,payment:e.paymentAllowed,scope:'Existing selection unchanged; not a new routing or readiness approval'});}
const sub=inventory.additionalSubgroups.find(x=>x.id==='MO-610105-status-financial-witness-20261014'),beforeCapture=sub.freshBaselineReproduction,historical=structuredClone(beforeCapture.rows.find(row=>row.hinted&&row.financial==='I am not sure').record);
const item={id:'synthetic-mo-610105',jurisdiction:'MO',artifactRefs:{}};
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const recordFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:run(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);return {status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot}};
const present=record=>decorate({consumerAuthUserId:'synthetic-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:runRequest=>evaluate(runRequest),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
// Keep actual matter page and conditionals; replace only server transports/font shell.
const pageFile=process.cwd()+'/src/app/briefcase/[packetId]/page.tsx';let source=fs.readFileSync(pageFile,'utf8');
source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/, 'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(source.includes(original));source=source.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moTransport.'+binding+'(...args);')}
const compiledPage=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(pageFile).href,source:compiledPage}});
const {default:Page}=await import(pathToFileURL(pageFile).href);
function nodes(e,out=[]){if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out}if(e.props){out.push(e);nodes(e.props.children,out)}return out}
async function ownerMatter(record){const view=await present(record);assert.equal(view.resultCode,'guidance_only');assert.equal(view.authorityStatus,'protected_draft');assert.notEqual(view.verificationStatus,'verified');assert.equal(Object.values(view.commercialActions).some(Boolean),false);globalThis.__moTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};const tree=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(tree.some(e=>e.props['data-briefcase-matter-id']===item.id),'actual owner matter remains available');assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'),'actual offered owner correction entry');return view;}
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
 apiSource=apiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moApiTransport.'+binding+'(...args);').join('\n'));
}
const apiCompiled=ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:apiCompiled}});
const API=await import(pathToFileURL(apiFile).href);let stored=structuredClone(historical),writeCount=0;
globalThis.__moApiTransport={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-owner',userEmail:'owner@example.test'}),getBriefcaseItem:async()=>item,
 readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:async()=>present(stored),
 persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writeCount++;stored=JSON.parse(JSON.stringify(transition.nextVerification));return {ok:true,value:stored}},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw new Error('no trusted seed substitution')},readTrustedBriefcasePresentationSource:()=>{throw new Error('no trusted source substitution')}};
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=async body=>API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),context);
// Actual correction page + original handler lifecycle, no database transport.
const correctionFile=process.cwd()+'/src/app/briefcase/[packetId]/packet-information/page.tsx';let correctionSource=fs.readFileSync(correctionFile,'utf8');
correctionSource=correctionSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(correctionSource.includes(original));correctionSource=correctionSource.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moTransport.'+binding+'(...args);');
}
register(sourceLoader,{data:{url:pathToFileURL(correctionFile).href,source:ts.transpileModule(correctionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const {default:CorrectionPage}=await import(pathToFileURL(correctionFile).href);
async function correctionFor(record){
 const view=await present(record);assert.equal(view.authorityStatus,'protected_draft');assert.equal(Object.values(view.commercialActions).some(Boolean),false);
 globalThis.__moTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};
 const matter=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(matter.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'));
 const tree=nodes(await CorrectionPage({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'case_outcome'})}));
 assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information?edit=case_outcome'));
 const builder=tree.find(e=>e.type?.name==='PacketInformationBuilder');assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),['case_outcome']);assert.equal(builder.props.initialRouteChanged,false);assert.equal(builder.props.returnToMatterAfterCorrection,true);
 for(const locale of ['en','es']){
  const localized={locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(s,options)=>resolveRuntimeText(locale,s,options)};
  const markup=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(LocalizationContext.Provider,{value:localized},builder)));
  assert(markup.includes(locale==='es'?'¿Cómo terminó el caso?':'How did the case end?'));
  assert(markup.includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));
  assert(!markup.includes('data-packet-question="financial_obligations"'));
  assert(!markup.includes('Your saved answers changed which packet path')&&!markup.includes('Sus respuestas guardadas cambiaron la vía'));
 }
 return view;
}
const ownerSequences=[];let clearedRecord;
for(const financial of ['No','I am not sure',undefined]){
 const answers={...base,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;
 for(const initial of [recordFor(answers),...(financial==='I am not sure'?[historical]:[])]){
  stored=structuredClone(initial);await correctionFor(stored);
  for(const [label,value,result,path] of [['material','Dismissed, no-billed, nolle prosequi, or not prosecuted','guidance_only',route],['unsure','I am not sure','needs_review',route],['cleared','','needs_more_info',null]]){
   const before=structuredClone(stored);const response=await post({expectedRevision:stored.revision,answers:{case_outcome:value}});assert.equal(response.status,200,label);const body=await response.json();
   assert.equal(body.answers.case_outcome,value,label+' is an actual applied edit');assert.equal(body.readyToGenerate,false);assert.equal(Object.values(body.commercialActions).some(Boolean),false);
   assert.equal(stored.draftSnapshot.resultCode,result);assert.equal(stored.draftSnapshot.pathwayId,path);assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.notEqual(stored.status,'verified');
   assert.equal(P.protectedPacketInformationModelFor(stored).initialAnswers.financial_obligations,financial);
   for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,raw]of Object.entries(before.draftSnapshot[map]))if(id!=='case_outcome')assert.deepEqual(stored.draftSnapshot[map][id],raw);
   if(path===null){assert.deepEqual(P.protectedPacketInformationModelFor(stored).heldFactualCorrectionIds,['case_outcome']);clearedRecord=structuredClone(stored);}
   await correctionFor(stored);
   if(label!=='material'){const bytes=JSON.stringify(stored);const denied=await post({expectedRevision:stored.revision,answers:{},verify:true});assert.equal(denied.status,422);assert.equal(JSON.stringify(stored),bytes);}
   const restored=await post({expectedRevision:stored.revision,answers:{case_outcome:base.case_outcome}});assert.equal(restored.status,200);const restoredBody=await restored.json();assert.equal(restoredBody.answers.case_outcome,base.case_outcome);assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.equal(stored.draftSnapshot.pathwayId,route);await correctionFor(stored);
   ownerSequences.push({financial:financial??'absent',historical:initial===historical,label,actualHandlerRestore:true,actualPageBuilder:true,ENES:true});
  }
 }
}

const historicalRows=[];
for(const row of beforeCapture.rows.filter(row=>row.hinted)){
 stored=structuredClone(row.record);const bytes=JSON.stringify(stored);await correctionFor(stored);const get=await API.GET(new Request(url),context);assert.equal(get.status,200);assert.equal(JSON.stringify(stored),bytes);const noop=await post({expectedRevision:stored.revision,answers:{}});assert.equal(noop.status,200);assert.equal(JSON.stringify(stored),bytes);
 const response=await post({expectedRevision:stored.revision,answers:{case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'}});assert.equal(response.status,200);const body=await response.json();assert.equal(body.answers.case_outcome,'Dismissed, no-billed, nolle prosequi, or not prosecuted');assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.deepEqual(stored.draftSnapshot.packetPlan.sourceFormIds,[]);assert.equal(stored.draftSnapshot.paymentAllowed,false);await correctionFor(stored);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(row.record.draftSnapshot[map]))if(id!=='case_outcome')assert.deepEqual(stored.draftSnapshot[map][id],raw);
 historicalRows.push({financial:row.financial,historicalProjection:true,noOpExact:true,materialCurrent:true,rawPreserved:true});
}
const preservedNoHint=[];
for(const row of beforeCapture.rows.filter(row=>!row.hinted)){
 const answers={...base,financial_obligations:row.financial};delete answers.possible_pathway_context;if(row.financial==='absent')delete answers.financial_obligations;
 assert.deepEqual(recordFor(answers),row.record,'genuine no-hint protected record unchanged');const model=P.protectedPacketInformationModelFor(row.record);assert(model);assert.equal(P.isMissouriClosureGuidanceCorrection(model,model.resultCode),false);assert.equal(model.heldFactualCorrectionIds,undefined);preservedNoHint.push(row.financial);
}
const rejectedCorrectionHistory=[];
for(const [name,change]of [
 ['absent history',s=>{delete s.dependencies.semanticAnswerHistory}],['empty history',s=>s.dependencies.semanticAnswerHistory=[]],
 ...Object.entries({routeKey:'MO:general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140',profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',meaning:'legacy',factId:'financial_obligations',source:'serverFacts',value:{unknown:false,extra:'malformed'}}).map(([key,value])=>['wrong prior '+key,s=>{s.dependencies.semanticAnswerHistory=s.dependencies.semanticAnswerHistory.map(e=>({...e,[key]:value}))}]),
 ...['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint'].map(key=>['wrong current '+key,s=>{s[key]='wrong'}])
]){
 const altered=structuredClone(clearedRecord);change(altered.draftSnapshot);altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);
 const model=P.protectedPacketInformationModelFor(altered);assert.equal(model?.heldFactualCorrectionIds?.length??0,0,name);if(model)assert.equal(P.heldPacketCorrectionInputIds(model,model.resultCode).size,0,name);
 const view=await present(altered);assert.equal(Object.values(view.commercialActions).some(Boolean),false);assert.notEqual(view.verificationStatus,'verified');
 rejectedCorrectionHistory.push(name);
}
const correctModel=P.protectedPacketInformationModelFor(recordFor(base));
for(const patch of [{stateCode:'NE'},{pathwayId:'general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140'},{packetPlan:null},{packetPlan:{...correctModel.packetPlan,sourceFormIds:['invented']}}])assert.equal(P.isMissouriClosureGuidanceCorrection({...correctModel,...patch},'guidance_only'),false);
assert.equal(P.isMissouriClosureGuidanceCorrection(correctModel,'packet_ready'),false);
const badHash=structuredClone(clearedRecord);badHash.draftHash='changed';assert.equal(P.protectedPacketInformationModelFor(badHash),null);
const historicalNegativeGuards=[];
for(const row of beforeCapture.rows.filter(row=>row.hinted)){
 for(const[name,change]of [
 ['state',s=>s.jurisdiction='LA'],['route',s=>s.pathwayId='general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140'],['version',s=>s.profileVersion='wrong'],['source',s=>s.profileSourceFingerprint='wrong'],['authority',s=>s.profileAuthorityFingerprint='wrong'],['payment',s=>s.paymentAllowed=true],['schema',s=>s.schemaVersion='expungement-ai/packet-verification/v1'],['track',s=>s.selectedTrackId='invented'],['server',s=>s.serverFacts.jurisdiction='LA'],['family',s=>s.packetFamilyIdentifiers.sourceFormIds=['invented']],['inputs',s=>s.requiredInputIds.push('invented')],['result',s=>s.resultCode='not_yet'],['no selected closure intent',s=>{delete s.screeningAnswers.possible_pathway_context;delete s.prefilledAnswers.possible_pathway_context;delete s.packetAnswers.possible_pathway_context}],
 ...(row.record.draftSnapshot.packetPlan?[['source refs',s=>s.packetPlan.sourceRuleRefs.push('invented')],['readiness',s=>s.packetPlan.packetReadyWhen=['true']],['added form',s=>s.packetPlan.sourceFormIds.push('invented')],['changed form',s=>s.packetPlan.sourceFormIds[0]='MO:other']]:[['known payment hold',s=>s.packetAnswers.financial_obligations='No']])
 ]){const snapshot=structuredClone(row.record.draftSnapshot);change(snapshot);const authority=run(P.protectedPacketScreeningAnswers(snapshot)??{});assert.equal(P.missouriClosureDraftSuccessor(snapshot,authority),null,name+' '+row.financial);historicalNegativeGuards.push({financial:row.financial,name})}
 const bad=structuredClone(row.record);bad.draftHash='changed';assert.equal(P.protectedPacketInformationModelFor(bad),null);
}
const sourceCases=[];
for(const[label,patch,result,reason]of [
 ['federal scope',{jurisdiction_scope:'Federal'},'hard_stop','mo.federal_or_out_of_scope'],['another person',{ownership_scope:'No'},'hard_stop','mo.ownership_scope_hard_stop'],
 ['uncertain disposition',{case_outcome:'I am not sure'},'needs_review','mo.source_fact_unknown'],['uncertain program completion',{case_outcome:'Diversion, deferred disposition, supervision, or similar program',sentence_completion_date:'I am not sure'},'needs_review','mo.source_fact_unknown'],['uncertain pending case',{pending_cases:'I am not sure'},'needs_review','mo.source_fact_unknown']
]){const e=run({...base,...patch,financial_obligations:'I am not sure'}).evaluation;assert.equal(e.resultCode,result);assert.equal(e.reasons[0].code,reason);assert.equal(e.paymentAllowed,false);assert.equal(e.packetPlan,undefined);sourceCases.push({label,result,reason,notFinancialHold:true})}
// Existing exact selected status guidance is not an eligibility determination:
// neither an incomplete program nor a conviction establishes statutory closure.
for(const[label,patch]of [['incomplete program',{case_outcome:'Diversion, deferred disposition, supervision, or similar program',sentence_completion_date:'No'}],['nonqualifying conviction',{case_outcome:'Other conviction or adjudication'}]]){
 const answers={...base,...patch,financial_obligations:'I am not sure'},e=run(answers).evaluation;assert.equal(e.resultCode,'guidance_only');assert.equal(e.paymentAllowed,false);assert.deepEqual(e.packetPlan.sourceFormIds,[]);assert.equal(e.reasons[0].code,'mo.lawrence_hold_guidance_only');const record=recordFor(answers),model=P.protectedPacketInformationModelFor(record);assert(model);assert.equal(model.initialAnswers.case_outcome,answers.case_outcome);assert.equal(model.initialAnswers.sentence_completion_date,answers.sentence_completion_date);const view=await present(record);assert.equal(Object.values(view.commercialActions).some(Boolean),false);
 assert.deepEqual(e.nextSteps,['Review the state-specific guidance.','Verify the record status with the listed source.','Do not pay for a filing packet for this route.']);
 globalThis.__moTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};
 const matterTree=await Page({params:Promise.resolve({packetId:item.id})});const actualPresentation=[];
 for(const locale of ['en','es']){const localized={locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(s,options)=>resolveRuntimeText(locale,s,options)};
  const markup=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(LocalizationContext.Provider,{value:localized},matterTree)));
  assert(markup.includes('data-briefcase-matter-id="'+item.id+'"'));assert(!/your (?:case|records?) (?:is|are|has been|have been) closed|sus registros (?:están|han sido) cerrados|su caso (?:está|ha sido) cerrado/i.test(markup));actualPresentation.push({locale,noCompletedClosureClaim:true,text:markup.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()});
 }
 sourceCases.push({label,result:e.resultCode,actualReason:e.reasons[0].text,actualNextSteps:e.nextSteps,actualPresentation,scope:'Existing status guidance only; no completed-closure or SIS/SES qualification asserted'});
}
const report={status:'PASS_MO_SELECTED_STATUS_PURE_CONSUMERS',identity:'Q-a2be4b53e78457449f53',rows,guards,noHint,ownerSequences,historicalRows,preservedNoHint,rejectedCorrectionHistory,historicalNegativeGuards,sourceCases,remaining:['Independent source/consumer verification','Authenticated acceptance'],notClaimed:['Completed closure','SIS/SES equivalence','General610.140 readiness approval','New participant filing','Qualified legal/language approval']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:rows.length,ownerSequences:ownerSequences.length,historicalRows:historicalRows.length}));
