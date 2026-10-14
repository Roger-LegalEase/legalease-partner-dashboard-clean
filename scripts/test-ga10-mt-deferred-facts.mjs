// Original Q-881219f601f85edb6881: source facts and actual pure consumers.
// Transport seams are stubbed; no authenticated owner, generated form or closure claim.
import assert from 'node:assert/strict';import fs from 'node:fs';import{register}from'node:module';import{pathToFileURL}from'node:url';import ts from'typescript';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const localizationFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
const localizationSource=ts.transpileModule(fs.readFileSync(localizationFile,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sourceLoader='data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}');
register(sourceLoader,{data:{url:pathToFileURL(localizationFile).href,source:localizationSource}});
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(process.cwd()+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);

const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {MT_DEFERRED_ROUTE:route,MT_DEFERRED_QUESTIONS:questions,MT_DEFERRED_FACT_IDS:ids,isMontanaDeferredContract:contract,montanaDeferredFactApplies:applies,montanaDeferredFacts:facts}=await import('../src/lib/rcap-engine/montana-deferred-facts.ts');
const profile=getProfileByJurisdiction('MT'),memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MT.memo.json')).tracks.find(t=>t.trackId==='mt_deferred_dismissal');
assert(JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json')).originalMissingWitnesses.some(x=>x.questionRecordId==='Q-881219f601f85edb6881'&&x.routeKey==='MT:'+route));
assert(memo.controllingAuthority.citations.includes('Mont. Code Ann. § 46-18-204'));assert.equal(memo.outputStrategy,'composed');
for(const id of ['deferredNotSuspended','deferralPeriodExpired','conditionsCompleted','revocationPetitionFiled','clerkContacted'])assert(memo.participantInputs.some(q=>q.key===id));
assert(memo.controllingAuthority.summary.includes('SHALL')&&memo.controllingAuthority.summary.includes('MAY'));assert(memo.participantInputs.find(q=>q.key==='conditionsCompleted').question.includes('fines and fees'));
assert(memo.legalDesignDecision.limitations.some(x=>x.statement.includes('DS-100')&&x.statement.includes('never generated')));
const recordFacts={mt_deferred_order_type:'deferred',mt_deferred_offense_grade:'felony',mt_deferred_term_status:'expired',mt_deferred_conditions_status:'yes',mt_deferred_financial_order_status:'paid',mt_deferred_revocation_petition:'no',mt_deferred_dismissal_order:'no',mt_deferred_court_record_status:'not_checked',mt_deferred_criss_record_status:'not_checked',financial_obligations:'No',court_requirements_completed:'no'};
assert.equal(facts(profile,route,recordFacts).context,'felony_statutory_request_context');
const cases=[
 ['felony full term',{mt_deferred_term_status:'expired'},'felony_statutory_request_context'],
 ['felony court termination',{mt_deferred_term_status:'terminated_by_order'},'felony_statutory_request_context'],
 ['misdemeanor discretionary',{mt_deferred_offense_grade:'misdemeanor'},'misdemeanor_discretionary_request_context'],
 ['misdemeanor revocation does not invent mandatory test',{mt_deferred_offense_grade:'misdemeanor',mt_deferred_revocation_petition:'yes'},'misdemeanor_discretionary_request_context'],
 ['felony revocation petition',{mt_deferred_revocation_petition:'yes'},'mandatory_limb_unavailable'],
 ['suspended sentence',{mt_deferred_order_type:'suspended'},'outside_deferred_mechanism'],
 ['other sentence',{mt_deferred_order_type:'other'},'outside_deferred_mechanism'],
 ['ongoing term',{mt_deferred_term_status:'still_running'},'term_not_terminated'],
 ['uncompleted conditions',{mt_deferred_conditions_status:'no'},'conditions_need_review'],
 ['actual remaining balance',{mt_deferred_financial_order_status:'balance_remaining'},'conditions_need_review'],
 ['explicit written waiver',{mt_deferred_financial_order_status:'waived_by_order'},'felony_statutory_request_context'],
 ['none ordered',{mt_deferred_financial_order_status:'none_ordered'},'felony_statutory_request_context'],
 ['unknown actual balance',{mt_deferred_financial_order_status:'unknown'},'facts_unresolved'],
 ['no actual order fact',{mt_deferred_order_type:undefined},'facts_unresolved'],
 ['confidential court does not prove CRISS updated',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'confidential',mt_deferred_criss_record_status:'not_updated'},'existing_order_followup'],
 ['updated CRISS does not prove court confidential',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'public',mt_deferred_criss_record_status:'updated'},'existing_order_followup'],
 ['dismissal status unknown',{mt_deferred_dismissal_order:'unknown'},'facts_unresolved'],
 ['existing order with unknown repository',{mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:'confidential',mt_deferred_criss_record_status:'unknown'},'existing_order_followup']
];
for(const[name,patch,context]of cases){const answers={...recordFacts,...patch},original=structuredClone(answers);assert.equal(facts(profile,route,answers).context,context,name);assert.deepEqual(answers,original);}
for(const finance of ['Yes','No','I am not sure',undefined])for(const generic of ['yes','no','unknown']){
 const answers={financial_obligations:finance,court_requirements_completed:generic,possible_pathway_context:profile.pathways.find(p=>p.id===route).label};assert.deepEqual(facts(profile,route,answers),{context:'facts_unresolved',ids:['mt_deferred_order_type']});
 const complete={...recordFacts,financial_obligations:finance,court_requirements_completed:generic};assert.equal(facts(profile,route,complete).context,'felony_statutory_request_context');assert(applies(profile,route,complete,'financial_obligations'));
}
for(const q of questions){assert(q.prompt&&q.translations.es.prompt);assert(q.doesNotSelectPathway);for(const option of q.options)assert(q.optionDisplay[option].label&&q.optionDisplay[option].translations.es.label);
 for(const value of [undefined,'',[],[recordFacts[q.id]],{}, {value:recordFacts[q.id],unknown:false},'unknown']){
  const statusQuestion=['mt_deferred_court_record_status','mt_deferred_criss_record_status'].includes(q.id);
  const answers={...recordFacts,...(statusQuestion?{mt_deferred_dismissal_order:'yes'}:{}),[q.id]:value};
  assert.equal(facts(profile,route,answers).context,statusQuestion?'existing_order_followup':'facts_unresolved',q.id+JSON.stringify(value));
 }

}
assert(!applies(profile,route,{...recordFacts,mt_deferred_offense_grade:'misdemeanor'},'mt_deferred_revocation_petition'));
assert.equal(ids.length,9);assert.equal(new Set(ids).size,9);
assert(!applies(profile,route,recordFacts,'mt_deferred_criss_record_status'));assert(applies(profile,route,{...recordFacts,mt_deferred_dismissal_order:'yes'},'mt_deferred_criss_record_status'));
for(const[name,mutate]of [['state',p=>p.jurisdiction.code='MO'],['version',p=>p.profileVersion='other'],['source',p=>p.source.sourceCorpusSha256='other'],...Object.entries({decisionId:'other',ruleId:'other',stage:'petition',outcomeMode:'packet_assembly',paymentAuthority:'open'}).map(([key,value])=>[key,p=>p.pathways.find(p=>p.id===route).legalAuthority[key]=value])]){
 const p=structuredClone(profile);mutate(p);assert(!contract(p,route),name);assert.equal(facts(p,route,recordFacts).context,'not_applicable');assert(!applies(p,route,recordFacts,ids[0]));
}
for(const sibling of profile.pathways.filter(p=>p.id!==route)){assert(!contract(profile,sibling.id));assert.equal(facts(profile,sibling.id,recordFacts).context,'not_applicable');assert(applies(profile,sibling.id,recordFacts,'financial_obligations'));}

const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts'),{selectScreeningQuestionIds:select}=await import('../src/lib/rcap-engine/screening-question-selection.ts'),{sanitizeResumedAnswersForQuestionIds:resume}=await import('../src/components/expungement-ai/screening/screens.ts'),{packetPlanForPathway:planFor}=await import('../src/lib/rcap-engine/packet-planner.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts'),P=await import('../src/lib/expungement-ai/packet-information.ts');
const subgroup=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json')).additionalSubgroups.find(g=>g.id==='MT-deferred-order-financial-witness-20261014');
const base={...subgroup.freshBaselineReproduction.base,...recordFacts,offense_level:"Felony"},fact='mt_deferred_order_type',pub=projectPublicProfile(profile);
const run=answers=>evaluate({jurisdiction:'MT',profileVersion:profile.profileVersion,matterId:'synthetic-mt-deferred-consumer',answers});
const recordFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:run(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);return{revision:0,status:'unverified',draftSnapshot:seed.snapshot,draftHash:seed.hash}};
const current=[];
for(const finance of ['Yes','No','I am not sure',undefined])for(const money of ['paid','waived_by_order','none_ordered','balance_remaining','unknown']){
 const answers={...base,financial_obligations:finance,mt_deferred_financial_order_status:money};if(finance===undefined)delete answers.financial_obligations;
 const a=run(answers).evaluation;assert.equal(a.resultCode,['paid','waived_by_order','none_ordered'].includes(money)?'guidance_only':'needs_review');assert.equal(a.pathwayId,route);assert.equal(a.paymentAllowed,false);assert.deepEqual(a.packetPlan?.sourceFormIds??[],[]);
 const selected=select(profile,pub,answers);assert(selected.includes('mt_deferred_financial_order_status'));assert(!selected.includes('financial_obligations'));assert.equal(resume(pub,answers,selected).financial_obligations,finance);
 const m=P.protectedPacketInformationModelFor(recordFor(answers));assert(m);assert.equal(m.initialAnswers.financial_obligations,finance);assert(!m.builderQuestions.some(q=>q.id==='financial_obligations'));assert(!P.reviewEditablePacketInputIds(m).has('financial_obligations'));assert(P.heldPacketCorrectionInputIds(m,m.resultCode).has('mt_deferred_financial_order_status'));
 current.push({finance:finance??'absent',money,result:a.resultCode});
}
for(const status of ['unknown','not_checked',undefined]){
 const answers={...base,mt_deferred_dismissal_order:'yes',mt_deferred_court_record_status:status,mt_deferred_criss_record_status:status,mt_deferred_financial_order_status:'unknown'};
 assert.equal(run(answers).evaluation.resultCode,'guidance_only');assert(!select(profile,pub,answers).includes('mt_deferred_financial_order_status'));const resumed=resume(pub,answers,select(profile,pub,answers));assert.equal(resumed.mt_deferred_financial_order_status,'unknown');
}
for(const row of subgroup.freshBaselineReproduction.rows.filter(r=>!r.hinted)){
 const a=run(P.protectedPacketScreeningAnswers(row.record.draftSnapshot)).evaluation;
 assert.deepEqual({result:a.resultCode,path:a.pathwayId??null,payment:a.paymentAllowed,reasons:a.reasons,missing:a.missingQuestionIds,forms:a.packetPlan?.sourceFormIds??[]},{result:row.result,path:row.path,payment:row.payment,reasons:row.reasons,missing:row.missing,forms:row.sourceForms??[]});
}
const historical=[];
for(const row of subgroup.freshBaselineReproduction.rows.filter(r=>r.hinted)){
 const original=structuredClone(row.record),m=P.protectedPacketInformationModelFor(original);assert(m,row.financial);assert.equal(m.resultCode,'needs_more_info');assert.equal(m.pathwayId,route);assert.deepEqual(original,row.record);
 const noop=P.packetInformationPatch({existingItem:{id:'synthetic-mt-deferred-consumer',jurisdiction:'MT',artifactRefs:{}},protectedVerification:original,answers:{}});assert(noop);assert.deepEqual(noop.protectedTransition.nextVerification,original);
 historical.push(row.financial);
}
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const item={id:'synthetic-mt-deferred-consumer',jurisdiction:'MT',artifactRefs:{}};
const present=record=>decorate({consumerAuthUserId:'synthetic-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:record}),readTrustedPendingSource:async()=>({ok:false,reason:'synthetic_absent'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:runRequest=>evaluate(runRequest),readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
// Keep actual matter page and conditionals; replace only server transports/font shell.
const pageFile=process.cwd()+'/src/app/briefcase/[packetId]/page.tsx';let source=fs.readFileSync(pageFile,'utf8');
source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/, 'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');
source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(source.includes(original));source=source.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moXivTransport.'+binding+'(...args);')}
const compiledPage=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(pageFile).href,source:compiledPage}});
const {default:Page}=await import(pathToFileURL(pageFile).href);
function nodes(e,out=[]){if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out}if(e.props){out.push(e);nodes(e.props.children,out)}return out}
async function ownerMatter(record){const view=await present(record);assert.equal(view.resultCode,'guidance_only');assert.equal(view.authorityStatus,'protected_draft');assert.notEqual(view.verificationStatus,'verified');assert.equal(Object.values(view.commercialActions).some(Boolean),false);globalThis.__moXivTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};const tree=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(tree.some(e=>e.props['data-briefcase-matter-id']===item.id),'actual owner matter remains available');assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'),'actual offered owner correction entry');return view;}
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
 apiSource=apiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moXivApiTransport.'+binding+'(...args);').join('\n'));
}
const apiCompiled=ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(apiFile).href,source:apiCompiled}});
const API=await import(pathToFileURL(apiFile).href);let stored=recordFor(base),writeCount=0;
globalThis.__moXivApiTransport={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-owner',userEmail:'owner@example.test'}),getBriefcaseItem:async()=>item,
 readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:async()=>present(stored),
 persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);writeCount++;stored=JSON.parse(JSON.stringify(transition.nextVerification));return {ok:true,value:stored}},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw new Error('no trusted seed substitution')},readTrustedBriefcasePresentationSource:()=>{throw new Error('no trusted source substitution')}};
const apiContext={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=async body=>API.POST(new Request(url,{method:'POST',body:JSON.stringify(body)}),apiContext);
// Actual correction page + original handler lifecycle, no database transport.
const correctionFile=process.cwd()+'/src/app/briefcase/[packetId]/packet-information/page.tsx';let correctionSource=fs.readFileSync(correctionFile,'utf8');
correctionSource=correctionSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const [binding,module] of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority']]){
 const original='import { '+binding+' } from "@/lib/expungement-ai/'+module+'";';assert(correctionSource.includes(original));correctionSource=correctionSource.replace(original,'const '+binding+'=(...args:unknown[])=>(globalThis as any).__moXivTransport.'+binding+'(...args);');
}
register(sourceLoader,{data:{url:pathToFileURL(correctionFile).href,source:ts.transpileModule(correctionSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const {default:CorrectionPage}=await import(pathToFileURL(correctionFile).href);
async function correctionFor(record, editId=fact){
 const view=await present(record);assert.equal(view.authorityStatus,'protected_draft');assert.equal(Object.values(view.commercialActions).some(Boolean),false);
 globalThis.__moXivTransport={requireConsumerBriefcaseSession:async()=>({userId:'synthetic-owner'}),getBriefcaseItem:async()=>item,decorateBriefcaseItemForPresentation:async()=>view};
 const matter=nodes(await Page({params:Promise.resolve({packetId:item.id})}));assert(matter.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information'));
 const tree=nodes(await CorrectionPage({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:editId})}));
 assert(tree.some(e=>e.props.href==='/briefcase/'+item.id+'/packet-information?edit='+editId));
 const builder=tree.find(e=>e.type?.name==='PacketInformationBuilder');assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),[editId]);assert.equal(builder.props.initialRouteChanged,false);assert.equal(builder.props.returnToMatterAfterCorrection,true);
 for(const locale of ['en','es']){
  const localized={locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(s,options)=>resolveRuntimeText(locale,s,options)};
  const markup=renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){}}},React.createElement(LocalizationContext.Provider,{value:localized},builder)));
  const q=questions.find(q=>q.id===editId)??pub.questions.find(q=>q.id===editId);const expectedPrompt=renderToStaticMarkup(React.createElement('span',null,locale==='es'?q.translations.es.prompt:q.prompt)).slice(6,-7);assert(markup.includes(expectedPrompt),editId+':'+locale+' actual prompt');
  assert(markup.includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));
  assert(!markup.includes('data-packet-question="financial_obligations"'));
  assert(!markup.includes('Your saved answers changed which packet path')&&!markup.includes('Sus respuestas guardadas cambiaron la vía'));
 }
 return view;
}


const lifecycle=[];
for(const financial of ['No','I am not sure',undefined]){
 const answers={...base,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;
 for(const[id,value,result]of [['mt_deferred_order_type','suspended','needs_review'],['mt_deferred_order_type','unknown','needs_review'],['mt_deferred_order_type','','needs_more_info'],['mt_deferred_dismissal_order','unknown','needs_review'],['mt_deferred_dismissal_order','','needs_more_info'],['mt_deferred_dismissal_order','yes','guidance_only'],['mt_deferred_financial_order_status','balance_remaining','needs_review'],['mt_deferred_financial_order_status','unknown','needs_review'],['mt_deferred_financial_order_status','waived_by_order','guidance_only'],['mt_deferred_term_status','still_running','not_yet'],['mt_deferred_revocation_petition','yes','needs_review'],['case_outcome','Misdemeanor conviction','needs_review']]){
  stored=recordFor(answers);const before=structuredClone(stored);await correctionFor(stored,id);let response=await post({expectedRevision:stored.revision,answers:{[id]:value}});assert.equal(response.status,200,id);let body=await response.json();assert.deepEqual(body.answers[id],value);assert.equal(stored.draftSnapshot.resultCode,result);assert.equal(stored.draftSnapshot.paymentAllowed,false);assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(v=>v===false));await correctionFor(stored,id);
  if(result!=='guidance_only'){const held=structuredClone(stored),deny=await post({expectedRevision:stored.revision,answers:{},verify:true});assert.equal(deny.status,422);assert.deepEqual(stored,held);}
  response=await post({expectedRevision:stored.revision,answers:{[id]:answers[id]}});assert.equal(response.status,200);body=await response.json();assert.equal(body.answers[id],answers[id]);assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.equal(body.answers.financial_obligations,financial);await correctionFor(stored,id);
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[k,v]of Object.entries(before.draftSnapshot[map]))if(k!==id)assert.deepEqual(stored.draftSnapshot[map][k],v);
  const original=structuredClone(stored),get=await API.GET(new Request(url),apiContext);assert.equal(get.status,200);const fresh=await get.json();assert.equal(fresh.answers.financial_obligations,financial);assert.deepEqual(stored,original);lifecycle.push({financial:financial??'absent',id,value});
 }
}
// Transport rejects a new malformed single-choice answer without mutation;
// an invalid synthetic source shape cannot gain protected presentation authority.
stored=recordFor(base);const beforeMalformed=structuredClone(stored);let malformed=await post({expectedRevision:stored.revision,answers:{case_outcome:['Misdemeanor conviction']}});assert.equal(malformed.status,422);assert.deepEqual(stored,beforeMalformed);
stored=recordFor({...base,case_outcome:['Misdemeanor conviction']});assert.equal(stored.draftSnapshot.resultCode,'needs_review');assert.equal((await present(stored)).authorityStatus,'unavailable','invalid synthetic source shape cannot gain protected history authority');
// Exact original Git-pinned records: read/no-op never persist a projection;
// each newly supplied fact must pass through the ordinary owner handler.
const historicalHttp=[];
for(const row of subgroup.freshBaselineReproduction.rows.filter(r=>r.hinted)){
 stored=structuredClone(row.record);const old=structuredClone(stored);
 let response=await API.GET(new Request(url),apiContext);assert.equal(response.status,200);let body=await response.json();assert.deepEqual(stored,old);assert.equal(body.readyToGenerate,false);await correctionFor(stored,fact);
 response=await post({expectedRevision:stored.revision,answers:{}});assert.equal(response.status,200);await response.json();assert.deepEqual(stored,old);
 const historicalFacts={...recordFacts,mt_deferred_offense_grade:'misdemeanor'};
 for(const id of ['mt_deferred_order_type','mt_deferred_dismissal_order','mt_deferred_offense_grade','mt_deferred_term_status','mt_deferred_conditions_status','mt_deferred_financial_order_status']){
  await correctionFor(stored,id);response=await post({expectedRevision:stored.revision,answers:{[id]:historicalFacts[id]}});assert.equal(response.status,200,id);body=await response.json();assert.equal(body.answers[id],historicalFacts[id]);assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(v=>v===false));
 }
 assert.equal(stored.draftSnapshot.resultCode,'guidance_only');assert.deepEqual(stored.draftSnapshot.packetPlan.sourceFormIds,[]);await ownerMatter(stored);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[k,v]of Object.entries(old.draftSnapshot[map]))assert.deepEqual(stored.draftSnapshot[map][k],v,'historical '+row.financial+':'+map+':'+k);
 historicalHttp.push(row.financial);
}
// Inactive factual answers are retained exactly and reappear, never used as
// a source of financial or dismissal authority for a different condition.
const conditional=[];
for(const originalFinance of ['No','I am not sure',undefined]){
 const answers={...base,financial_obligations:originalFinance,mt_deferred_financial_order_status:'waived_by_order',mt_deferred_court_record_status:'public',mt_deferred_criss_record_status:'not_updated'};if(originalFinance===undefined)delete answers.financial_obligations;
 stored=recordFor(answers);const original=structuredClone(stored);
 let response=await post({expectedRevision:stored.revision,answers:{mt_deferred_dismissal_order:'yes'}});assert.equal(response.status,200);let body=await response.json();assert.equal(stored.draftSnapshot.resultCode,'guidance_only');
 let m=P.protectedPacketInformationModelFor(stored);assert(!P.reviewEditablePacketInputIds(m).has('mt_deferred_financial_order_status'));assert.equal(m.initialAnswers.mt_deferred_financial_order_status,'waived_by_order');assert.equal(m.initialAnswers.financial_obligations,originalFinance);await correctionFor(stored,'mt_deferred_criss_record_status');
 response=await post({expectedRevision:stored.revision,answers:{mt_deferred_dismissal_order:'no'}});assert.equal(response.status,200);body=await response.json();m=P.protectedPacketInformationModelFor(stored);assert(P.reviewEditablePacketInputIds(m).has('mt_deferred_financial_order_status'));assert.equal(m.initialAnswers.mt_deferred_financial_order_status,'waived_by_order');assert(!P.reviewEditablePacketInputIds(m).has('mt_deferred_criss_record_status'));assert.equal(m.initialAnswers.mt_deferred_criss_record_status,'not_updated');await correctionFor(stored,'mt_deferred_financial_order_status');
 response=await post({expectedRevision:stored.revision,answers:{mt_deferred_offense_grade:'misdemeanor'}});assert.equal(response.status,200);await response.json();m=P.protectedPacketInformationModelFor(stored);assert(!P.reviewEditablePacketInputIds(m).has('mt_deferred_revocation_petition'));assert.equal(m.initialAnswers.mt_deferred_revocation_petition,'no');
 response=await post({expectedRevision:stored.revision,answers:{mt_deferred_offense_grade:'felony'}});assert.equal(response.status,200);await response.json();m=P.protectedPacketInformationModelFor(stored);assert(P.reviewEditablePacketInputIds(m).has('mt_deferred_revocation_petition'));assert.equal(m.initialAnswers.mt_deferred_revocation_petition,'no');
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[k,v]of Object.entries(original.draftSnapshot[map]))if(!['mt_deferred_dismissal_order','mt_deferred_offense_grade'].includes(k))assert.deepEqual(stored.draftSnapshot[map][k],v,map+':'+k);
 conditional.push(originalFinance??'absent');
}
// Malformed owner/jurisdiction cannot skip the exact new factual mechanism and
// fall through to the former unqualified guidance branch.
for(const id of ['ownership_scope','jurisdiction_scope'])for(const value of [[],['Yes'],{},undefined,'']){
 const answers={...base,[id]:value,mt_deferred_order_type:undefined},a=run(answers).evaluation;assert.notEqual(a.resultCode,'guidance_only');assert.equal(a.pathwayId??null,null);assert.equal(a.paymentAllowed,false);
}
for(const value of [undefined,null,'','I am not sure'])assert.equal(run({...base,case_outcome:value}).evaluation.resultCode,'guidance_only','actual order supplies generic outcome meaning');
// Original charge grade and the final deferred order need not be identical;
// do not demand rewriting an earlier charge after a reduction/amendment.
for(const [originalGrade,orderGrade,context]of [['Felony','misdemeanor','misdemeanor_discretionary_request_context'],['Misdemeanor','felony','felony_statutory_request_context']]){
 const a={...base,offense_level:originalGrade,mt_deferred_offense_grade:orderGrade};assert.equal(facts(profile,route,a).context,context);assert.equal(run(a).evaluation.resultCode,'guidance_only');const model=P.protectedPacketInformationModelFor(recordFor(a));assert.equal(model.initialAnswers.offense_level,originalGrade);assert.equal(model.initialAnswers.mt_deferred_offense_grade,orderGrade);
}
const {isMontanaDeferredWithoutMmrtaForm:withoutWrongForm}=await import('../src/lib/rcap-engine/montana-deferred-facts.ts');
assert(withoutWrongForm(profile,route));assert.deepEqual(planFor(profile,route).sourceFormIds,[]);
for(const mutate of [p=>p.source.sourceCorpusSha256='other',p=>p.profileVersion='other',p=>p.packetGenerator.pathways.find(x=>x.pathwayId===route).sourceRuleRefs.push('other'),p=>p.packetGenerator.pathways.find(x=>x.pathwayId===route).formCandidates[0].sha256='other',p=>p.packetGenerator.pathways.find(x=>x.pathwayId===route).formCandidates.push({relativePath:'another.docx',sha256:'other'})]){
 const p=structuredClone(profile);mutate(p);assert(!withoutWrongForm(p,route));assert(planFor(p,route).sourceFormIds.length>0);
}
const legacy=subgroup.freshBaselineReproduction.rows.find(r=>r.hinted&&r.financial==='Yes').record.draftSnapshot;
const priorAuthoritative=run(P.protectedPacketScreeningAnswers(legacy));assert(P.montanaDeferredDraftSuccessor(legacy,priorAuthoritative));
for(const mutate of [s=>s.jurisdiction='ME',s=>s.profileVersion='other',s=>s.profileSourceFingerprint='other',s=>s.profileAuthorityFingerprint='other',s=>s.paymentAllowed=true,s=>s.selectedTrackId='other',s=>s.serverFacts.extra=true,s=>s.packetPlan.sourceFormIds.push('other'),s=>s.packetPlan.requiredInputIds.push('other'),s=>s.screeningAnswers.mt_deferred_order_type='unknown',s=>s.packetFamilyIdentifiers.mode='other']){
 const altered=structuredClone(legacy);mutate(altered);assert.equal(P.montanaDeferredDraftSuccessor(altered,priorAuthoritative),null);
}
console.log(JSON.stringify({status:'PASS_MT_DEFERRED_SOURCE_AND_CONSUMERS',originalIdentity:'Q-881219f601f85edb6881',current,historical,lifecycleCount:lifecycle.length,historicalHttp,conditional,remaining:['Independent source/current+historical review','Actual authenticated ENES owner acceptance','Applicable document/qualified-language acceptance']}));
