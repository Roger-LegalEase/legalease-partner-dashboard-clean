// One original GA10 witness; pure current consumers, no DB or authenticated claim.
import assert from 'node:assert/strict';import fs from 'node:fs';import {register}from'node:module';import {pathToFileURL}from'node:url';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);process.env.RCAP_EVALUATOR_TODAY='2026-10-14';
const localizationFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
const localizationSource=ts.transpileModule(fs.readFileSync(localizationFile,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sourceLoader='data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}');
register(sourceLoader,{data:{url:pathToFileURL(localizationFile).href,source:localizationSource}});
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(process.cwd()+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {louisianaAutomationStatusQuestionApplies:applies,LA_AUTOMATION_STATUS_ROUTE:route}=await import('../src/lib/rcap-engine/louisiana-automation-status.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const p=getProfileByJurisdiction('LA'),pub=projectPublicProfile(p),inventory=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
const sub=inventory.additionalSubgroups.find(x=>x.id==='LA-9852-status-financial-witness-20261014'),historical=structuredClone(sub.freshBaselineReproduction.record),base=sub.freshBaselineReproduction.answers;
assert.equal(inventory.originalMissingWitnesses.length,22);assert.equal(inventory.currentBatch.routeKey,'KS:drug-registration-relief-coordination');
assert.equal(inventory.originalMissingWitnesses.find(x=>x.questionRecordId===sub.originalQuestionRecordIds[0]).status,'NOT_RUN_NO_RETAINED_PUBLIC_WITNESS');
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/LA.memo.json')).tracks.find(t=>t.trackId==='la-985-2-automated-expungement');
assert.equal(memo.outputStrategy,'process_guidance');assert(memo.legalDesignDecision.limitations.some(x=>x.statement.includes('remain disabled')));
assert(!memo.participantInputs.some(x=>/financial|fine|restitution/.test(x.key)));assert(memo.controllingAuthority.citations.includes('La. C.Cr.P. art. 985.2'));
assert.equal(p.pathways.find(x=>x.id===route).legalAuthority.paymentAuthority,'closed');
const financialQuestion=pub.questions.find(q=>q.id==='financial_obligations');
assert.equal(financialQuestion.prompt,'Have you paid off everything the court charged?');assert.equal(financialQuestion.translations.es.prompt,'¿Pagó todo lo que cobró el tribunal?');
const item={id:'synthetic-la9852-status',jurisdiction:'LA',artifactRefs:{}};
const run=answers=>evaluate({jurisdiction:'LA',profileVersion:p.profileVersion,matterId:item.id,answers});
const recordFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:run(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);return {status:'unverified',reason:'synthetic',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot}};
const present=record=>decorate({consumerAuthUserId:'synthetic-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:runRequest=>evaluate(runRequest),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
// Keep actual matter page and conditionals; replace only server transports/font shell.
const pageFile=process.cwd()+'/src/app/briefcase/[packetId]/page.tsx';let source=fs.readFileSync(pageFile,'utf8');
source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/, 'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(source.includes(original));source=source.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__laTransport.'+binding+'(...args);')}
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(pageFile).href,source:compiled}});
const {default:Page}=await import(pathToFileURL(pageFile).href);
function nodes(e,out=[]){if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out}if(e.props){out.push(e);nodes(e.props.children,out)}return out}
async function ownerMatter(record){const view=await present(record);assert.equal(view.resultCode,'guidance_only');assert.equal(view.authorityStatus,'protected_draft');assert.notEqual(view.verificationStatus,'verified');assert.equal(Object.values(view.commercialActions).some(Boolean),false);globalThis.__laTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};const tree=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(tree.some(e=>e.props['data-briefcase-matter-id']===item.id),'actual owner matter remains available');assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'),'actual offered owner correction entry');return view;}
const rows=[];
for(const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted','Acquitted or found not guilty','Other conviction or adjudication'])for(const financial of ['Yes','No','I am not sure',undefined]){
 const answers={...base,case_outcome:outcome,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;
 const original=JSON.stringify(answers),a=run(answers);assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.resultCode,'guidance_only');assert.equal(a.evaluation.paymentAllowed,false);assert.equal(a.evaluation.packetPlan.sourceFormIds.length,0);
 const selected=selectScreeningQuestionIds(p,pub,answers);assert(!selected.includes('financial_obligations'));const resumed=sanitizeResumedAnswersForQuestionIds(pub,answers,selected);assert.equal(resumed.financial_obligations,financial);assert.equal(JSON.stringify(answers),original);
 const record=recordFor(answers),model=P.protectedPacketInformationModelFor(record);assert(model);assert.equal(model.initialAnswers.financial_obligations,financial);assert(!model.builderQuestions.some(q=>q.id==='financial_obligations'));assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'));assert.deepEqual([...P.heldPacketCorrectionInputIds(model,model.resultCode)],['case_outcome']);
 const view=await ownerMatter(record);const noop=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{}});assert.deepEqual(noop.protectedTransition.nextVerification,record);assert.equal(noop.readyToGenerate,false);
 // Returning to the ordinary court route restores the independent saved control.
 const sibling={...resumed,possible_pathway_context:'Non-conviction arrest expungement'};assert(selectScreeningQuestionIds(p,pub,sibling).includes('financial_obligations'));assert.equal(sanitizeResumedAnswersForQuestionIds(pub,sibling,selectScreeningQuestionIds(p,pub,sibling)).financial_obligations,financial);
 rows.push({outcome,financial:financial??'absent',result:view.resultCode,nonpayable:true,financialInactive:true,rawPreserved:true,ownerMatterAvailable:true});
}
const oldBytes=JSON.stringify(historical),model=P.protectedPacketInformationModelFor(historical);assert(model);assert.equal(model.resultCode,'guidance_only');await ownerMatter(historical);
const noop=P.packetInformationPatch({existingItem:item,protectedVerification:historical,answers:{}});assert.equal(noop.reviewReason,'semantic_noop_preserved');assert.deepEqual(noop.protectedTransition.nextVerification,historical);
const material=[];for(const financial of ['No','Yes']){const patch=P.packetInformationPatch({existingItem:item,protectedVerification:historical,answers:{financial_obligations:financial}});assert(patch);assert.equal(patch.protectedTransition.nextVerification.draftSnapshot.resultCode,'guidance_only');assert.equal(patch.protectedTransition.nextVerification.draftSnapshot.paymentAllowed,false);assert.equal(patch.readyToGenerate,false);const m=P.protectedPacketInformationModelFor(patch.protectedTransition.nextVerification);assert.equal(m.initialAnswers.financial_obligations,financial);await ownerMatter(patch.protectedTransition.nextVerification);material.push(financial)}assert.equal(JSON.stringify(historical),oldBytes);
const authority=run(base),negative=[];
for(const [name,change]of [['state',s=>s.jurisdiction='NE'],['route',s=>s.pathwayId='non-conviction-arrest-expungement'],['version',s=>s.profileVersion='wrong'],['source',s=>s.profileSourceFingerprint='wrong'],['authority',s=>s.profileAuthorityFingerprint='wrong'],['result',s=>s.resultCode='not_yet'],['payment',s=>s.paymentAllowed=true],['type',s=>s.packetType='custom_pleading'],['plan',s=>s.packetPlan=authority.evaluation.packetPlan],['inputs',s=>s.requiredInputIds=['financial_obligations']],['family',s=>s.packetFamilyIdentifiers.sourceFormIds=['invented']],['server',s=>s.serverFacts.pathway_id='wrong'],['known payment',s=>s.screeningAnswers.financial_obligations='Yes']]){const x=structuredClone(historical.draftSnapshot);change(x);assert.equal(P.louisianaAutomationStatusHeldSuccessor(x,authority),null,name);negative.push(name)}
for(const state of ['NE','KS','GA','MS'])assert(applies(state,route,'financial_obligations'));for(const path of p.pathways.filter(x=>x.id!==route))assert(applies('LA',path.id,'financial_obligations'));assert(applies('LA',null,'financial_obligations'));assert(applies('LA',route,'case_outcome'));
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
 apiSource=apiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__laApiTransport.'+binding+'(...args);').join('\n'));
}
const apiCompiled=ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:apiCompiled}});
const API=await import(pathToFileURL(apiFile).href);let stored=structuredClone(historical),writeCount=0;
globalThis.__laApiTransport={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-owner',userEmail:'owner@example.test'}),getBriefcaseItem:async()=>item,
 readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:async()=>present(stored),
 persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writeCount++;stored=JSON.parse(JSON.stringify(transition.nextVerification));return {ok:true,value:stored}},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw new Error('no trusted seed substitution')},readTrustedBriefcasePresentationSource:()=>{throw new Error('no trusted source substitution')}};
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const get=await API.GET(new Request(url),context);assert.equal(get.status,200);const getBody=await get.json();assert.equal(writeCount,0);assert.equal(getBody.answers.financial_obligations,'I am not sure');assert(!getBody.questions.some(q=>q.id==='financial_obligations'));assert.equal(JSON.stringify(stored),oldBytes);
const post=async body=>API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),context);
const saved=await post({expectedRevision:stored.revision,answers:{}});assert.equal(saved.status,200);assert.equal(JSON.stringify(stored),oldBytes,'actual handler no-op forwards exact historical draft');
const edited=await post({expectedRevision:stored.revision,answers:{financial_obligations:'No'}});assert.equal(edited.status,200);const editBody=await edited.json();assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.equal(editBody.answers.financial_obligations,'No');assert.equal(editBody.readyToGenerate,false);assert.equal(Object.values(editBody.commercialActions).some(Boolean),false);
const stale=await post({expectedRevision:stored.revision+99,answers:{financial_obligations:'Yes'}});assert.equal(stale.status,409);assert.equal(P.protectedPacketInformationModelFor(stored).initialAnswers.financial_obligations,'No');
const independentUnknown={...base,pending_cases:'I am not sure'};assert.notEqual(run(independentUnknown).evaluation.resultCode,'guidance_only','other unknown factual predicates remain unresolved');
const siblingUnknown={...base,possible_pathway_context:'Non-conviction arrest expungement',financial_obligations:'I am not sure'};assert.equal(run(siblingUnknown).evaluation.resultCode,'needs_review');assert(run(siblingUnknown).evaluation.missingQuestionIds.includes('financial_obligations'));
// Actual correction page + original handler lifecycle, no database transport.
const correctionFile=process.cwd()+'/src/app/briefcase/[packetId]/packet-information/page.tsx';let correctionSource=fs.readFileSync(correctionFile,'utf8');
correctionSource=correctionSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(correctionSource.includes(original));correctionSource=correctionSource.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__laTransport.'+binding+'(...args);');
}
register(sourceLoader,{data:{url:pathToFileURL(correctionFile).href,source:ts.transpileModule(correctionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const {default:CorrectionPage}=await import(pathToFileURL(correctionFile).href);
async function correctionFor(record){
 const view=await present(record);assert.equal(view.authorityStatus,'protected_draft');assert.equal(Object.values(view.commercialActions).some(Boolean),false);
 globalThis.__laTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};
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
  for(const [label,value,result,path] of [['material','Acquitted or found not guilty','guidance_only',route],['unsure','I am not sure','needs_review',route],['cleared','','needs_more_info',null]]){
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
// Hints alone never create historical correction authority. Current sibling and
// genuinely absent-hint routes remain outside this bounded owner correction.
const noHint={...base};delete noHint.possible_pathway_context;const noHintRecord=recordFor(noHint),noHintModel=P.protectedPacketInformationModelFor(noHintRecord);
assert.notEqual(noHintModel.pathwayId,route);assert.equal(P.isLouisianaAutomationStatusGuidanceCorrection(noHintModel,noHintModel.resultCode),false);assert.equal(noHintModel.heldFactualCorrectionIds,undefined);
const rejectedCorrectionHistory=[];
for(const [name,change]of [
 ['absent history',s=>{delete s.dependencies.semanticAnswerHistory}],['empty history',s=>s.dependencies.semanticAnswerHistory=[]],
 ...Object.entries({routeKey:'LA:non-conviction-arrest-expungement',profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',meaning:'legacy',factId:'financial_obligations',source:'serverFacts',value:{unknown:false,extra:'malformed'}}).map(([key,value])=>['wrong prior '+key,s=>{s.dependencies.semanticAnswerHistory=s.dependencies.semanticAnswerHistory.map(e=>({...e,[key]:value}))}]),
 ...['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint'].map(key=>['wrong current '+key,s=>{s[key]='wrong'}])
]){
 const altered=structuredClone(clearedRecord);change(altered.draftSnapshot);altered.draftHash=P.protectedPacketDraftHash(altered.draftSnapshot);
 const model=P.protectedPacketInformationModelFor(altered);assert.equal(model?.heldFactualCorrectionIds?.length??0,0,name);if(model)assert.equal(P.heldPacketCorrectionInputIds(model,model.resultCode).size,0,name);
 const view=await present(altered);assert.equal(Object.values(view.commercialActions).some(Boolean),false);assert.notEqual(view.verificationStatus,'verified');
 rejectedCorrectionHistory.push(name);
}
const correctModel=P.protectedPacketInformationModelFor(recordFor(base));
for(const patch of [{stateCode:'NE'},{pathwayId:'non-conviction-arrest-expungement'},{packetPlan:null},{packetPlan:{...correctModel.packetPlan,sourceFormIds:['invented']}}])assert.equal(P.isLouisianaAutomationStatusGuidanceCorrection({...correctModel,...patch},'guidance_only'),false);
assert.equal(P.isLouisianaAutomationStatusGuidanceCorrection(correctModel,'packet_ready'),false);
const badHash=structuredClone(clearedRecord);badHash.draftHash='changed';assert.equal(P.protectedPacketInformationModelFor(badHash),null);
const receipt={identity:sub.originalQuestionRecordIds[0],status:'PASS_BOUNDED_PURE_CONSUMERS',rows,materialHistoricalEdits:material,historicalNoOpPreserved:true,historicalNegativeGuards:negative,ENESPaymentQuestionUnchanged:true,ownerSequences,rejectedCorrectionHistory,actualHandlerTransportContract:'GET no rewrite, POST no-op exact, material edit source-matched guidance, stale refusal',notClaimed:['authenticated acceptance','automated request or operational authority','underlying Articles976–978 eligibility','paid workflow','independent legal/language approval']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(receipt,null,2)+'\n');console.log('PASS: exact LA status guidance financial relevance, saved raw answers, siblings, historical no-op/material edit, actual owner matter and EN/ES meaning');
