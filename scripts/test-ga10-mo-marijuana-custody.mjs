// Original GA10 Q-0e8995bbf2169178cd18. Source and actual consumer contracts;
// no database/authenticated owner acceptance or qualified language claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const localizationFile=process.cwd()+'/src/components/expungement-ai/LocalizationProvider.tsx';
const localizationSource=ts.transpileModule(fs.readFileSync(localizationFile,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const sourceLoader='data:text/javascript,'+encodeURIComponent('let d;export function initialize(data){d=data}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}');
register(sourceLoader,{data:{url:pathToFileURL(localizationFile).href,source:localizationSource}});
const {LocalizationContext}=await import(pathToFileURL(localizationFile).href);
const {t,resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(process.cwd()+'/node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js').href);
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { MO_MARIJUANA_STATUS_ROUTE: route, MO_MARIJUANA_CUSTODY_FACT: fact, MO_MARIJUANA_STATUS_QUESTIONS: questions,
  isMissouriMarijuanaStatusContract: contract, missouriMarijuanaCustodyContext: context,
  missouriMarijuanaStatusQuestionApplies: applies, missouriMarijuanaStatusDecision: decide, missouriMarijuanaFactApplies: factApplies } = await import('../src/lib/rcap-engine/missouri-marijuana-status-facts.ts');
const profile = getProfileByJurisdiction('MO');
const inventory = JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json'));
assert(inventory.originalMissingWitnesses.some(row => row.questionRecordId === 'Q-0e8995bbf2169178cd18' && row.routeKey === 'MO:' + route));
const memo = JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MO.memo.json')).tracks.find(t => t.trackId === 'mo-art-xiv-marijuana');
assert(memo.controllingAuthority.citations.includes('Mo. Const. art. XIV, § 2'));
assert.equal(memo.outputStrategy, 'composed');
assert(memo.participantInputs.find(q => q.key === 'custodyPosture').question.includes('three situations'));
for (const key of ['weight', 'offenseGrade', 'exclusionScreen', 'alreadyExpunged', 'currentLawEquivalent']) assert(memo.participantInputs.some(q => q.key === key));
assert(!memo.participantInputs.some(q => /financial|fine|restitution/i.test(q.key)));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('Mandatory attorney handoff') && x.statement.includes('under supervision')));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('must not represent that relief already occurred')));
assert(memo.legalDesignDecision.limitations.some(x => x.statement.includes('never asserted by LegalEase')));
assert(contract(profile, route));

const cases = [
  ['incarcerated', 'incarcerated_attorney_handoff', true],
  ['probation_or_parole', 'supervision_attorney_handoff', false],
  ['incarceration_and_supervision_complete', 'completed_status_check', false],
  ['unknown', 'unknown', true], [undefined, 'unknown', true], ['', 'unknown', true],
  ['Yes', 'unknown', true], ['No', 'unknown', true],
  [{ value: 'incarceration_and_supervision_complete', unknown: false }, 'unknown', true],
  [['incarceration_and_supervision_complete'], 'unknown', true]
];
for (const [value, expected, financialApplies] of cases) {
  for (const financial of ['Yes', 'No', 'I am not sure', undefined]) {
    // Unrelated legacy/raw facts remain exactly supplied; none becomes a
    // quantity, exclusion, custody, eligibility or completed-relief answer.
    const answers = { sentence_completion_date: 'Yes', possible_pathway_context: profile.pathways.find(p => p.id === route).label,
      financial_obligations: financial, [fact]: value, charge: { value: '', unknown: true },
      state_exclusion_categories: ['I am not sure'], record_documents: 'I am not sure',
      historicalCustodyProse: 'Finished a case long ago; details not confirmed' };
    if (value === undefined) delete answers[fact];
    if (financial === undefined) delete answers.financial_obligations;
    const before = structuredClone(answers);
    assert.equal(context(profile, route, answers), expected);
    assert.equal(applies('MO', route, answers, 'financial_obligations', profile), financialApplies);
    for (const id of [fact, 'charge', 'state_exclusion_categories', 'record_documents', 'sentence_completion_date', 'offense_level']) {
      assert.equal(applies('MO', route, answers, id, profile), true);
    }
    assert.deepEqual(answers, before);
  }
}
const completed = { [fact]: 'incarceration_and_supervision_complete' };
for (const state of ['KS', 'LA', 'ME', 'NE', 'GA']) assert(applies(state, route, completed, 'financial_obligations', profile));
assert(applies('MO', route, completed, 'financial_obligations'));
for (const other of profile.pathways.filter(p => p.id !== route)) {
  assert.equal(context(profile, other.id, completed), 'not_applicable');
  assert(applies('MO', other.id, completed, 'financial_obligations', profile));
}
for (const path of [null, undefined, 'incarcerated-marijuana-petition']) assert(applies('MO', path, completed, 'financial_obligations', profile));
const guards = [
  ['jurisdiction', p => p.jurisdiction.code = 'GA'], ['version', p => p.profileVersion = 'changed'],
  ['source', p => p.source.sourceCorpusSha256 = 'changed'],
  ...Object.entries({ decisionId: 'changed', ruleId: 'changed', stage: 'petition', outcomeMode: 'packet_assembly', paymentAuthority: 'open' })
    .map(([key, value]) => [key, p => p.pathways.find(v => v.id === route).legalAuthority[key] = value]),
  ['filing', p => p.pathways.find(v => v.id === route).filingRequired = true],
  ['route type', p => p.pathways.find(v => v.id === route).routeType = 'court_filing'],
  ['mode', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).mode = 'court_packet'],
  ['mapping', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).formMappingStatus = 'source_candidate_identified'],
  ['source refs', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).sourceRuleRefs.push('other')],
  ['petition form', p => p.packetGenerator.pathways.find(v => v.pathwayId === route).formCandidates.push({ relativePath: 'CR375.pdf', sha256: 'other' })]
];
for (const [name, mutate] of guards) {
  const altered = structuredClone(profile); mutate(altered);
  assert.equal(contract(altered, route), false, name);
  assert.equal(context(altered, route, completed), 'not_applicable', name);
  assert.equal(applies('MO', route, completed, 'financial_obligations', altered), true, name);
}
assert.equal(questions.find(q=>q.id==='mo_marijuana_minor_distribution').prompt,'Did this offense involve distribution or delivery of marijuana to someone under 21?');
assert.equal(questions.find(q=>q.id==='mo_marijuana_minor_distribution').translations.es.prompt,'¿Este delito involucró distribución o entrega de marihuana a una persona menor de 21 años?');
assert.equal(questions.length, 11); const question = questions[0];
assert.equal(question.id, fact); assert.equal(question.doesNotSelectPathway, true);
assert.deepEqual(question.options, ['incarcerated', 'probation_or_parole', 'incarceration_and_supervision_complete', 'unknown']);
for (const value of question.options) assert(question.optionDisplay[value].label && question.optionDisplay[value].translations.es.label);
assert(question.prompt.includes('for this') || question.prompt.includes('For this'));
assert(question.helperText.includes('does not establish eligibility'));
assert(question.translations.es.helperText.includes('no establece'));
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { sanitizeResumedAnswersForQuestionIds, sanitizeAnswersForQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const pub = projectPublicProfile(profile), supplied = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local',
  case_outcome: 'Misdemeanor conviction', possible_pathway_context: profile.pathways.find(p=>p.id===route).label,
  financial_obligations: 'I am not sure', [fact]: 'incarceration_and_supervision_complete',
  mo_marijuana_record_is_marijuana: 'yes', mo_marijuana_record_offense: 'Possession of marijuana, RSMo 195.202',
  mo_marijuana_offense_date: {value:'2010-01-01',unknown:false}, mo_marijuana_record_grade: 'misdemeanor',
  mo_marijuana_minor_distribution:'no', mo_marijuana_violence:'no', mo_marijuana_impaired_driving:'no',
  mo_marijuana_commercial_vehicle:'no', mo_marijuana_record_status:'record_remains', mo_marijuana_pounds:{value:'2.5',unknown:false} };
assert.equal(decide(profile,route,supplied).status,'guidance');
const sourceCases=[];
for(const [name,patch,status,code] of [
 ['malformed disposition array',{case_outcome:['Misdemeanor conviction']},'review','record_facts_missing'],
 ['misdemeanor versus Class D conflict',{mo_marijuana_record_grade:'class_d',mo_marijuana_pounds:'2'},'review','record_facts_missing'],
 ['misdemeanor versus Class E conflict',{mo_marijuana_record_grade:'class_e'},'review','record_facts_missing'],
 ['felony versus misdemeanor conflict',{case_outcome:'Felony conviction'},'review','record_facts_missing'],
 ['current incarceration',{[fact]:'incarcerated'},'review','incarcerated_referral'],
 ['current supervision',{[fact]:'probation_or_parole'},'review','supervision_referral'],
 ['unknown custody',{[fact]:'unknown'},'review','custody_missing'],
 ['cleared custody',{[fact]:''},'missing','custody_missing'],
 ['unknown offense',{mo_marijuana_record_offense:{unknown:true}},'review','record_facts_missing'],
 ['unknown grade',{mo_marijuana_record_grade:'unknown'},'review','record_facts_missing'],
 ['unknown quantity',{mo_marijuana_record_grade:'class_d',mo_marijuana_pounds:{unknown:true}},'review','record_facts_missing'],
 ['completed Class ABC source-supported status lookup',{case_outcome:'Felony conviction',mo_marijuana_record_grade:'class_abc'},'guidance','status_check'],
 ['known Class D three pounds',{case_outcome:'Felony conviction',mo_marijuana_record_grade:'class_d',mo_marijuana_pounds:{value:'3',unknown:false}},'guidance','status_check'],
 ['Class D over three pounds source boundary',{case_outcome:'Felony conviction',mo_marijuana_record_grade:'class_d',mo_marijuana_pounds:{value:'3.001',unknown:false}},'review','source_boundary_review'],
 ['unknown exclusion',{mo_marijuana_violence:'unknown'},'review','record_facts_missing'],
 ['record not checked',{mo_marijuana_record_status:'not_checked'},'review','record_facts_missing'],
 ['unknown record status',{mo_marijuana_record_status:'unknown'},'review','record_facts_missing'],
 ['found order is status checking not completed relief',{mo_marijuana_record_status:'order_found'},'guidance','status_check'],
 ['post-amendment conduct',{mo_marijuana_offense_date:'2023-01-01'},'review','source_boundary_review'],
 ['not marijuana',{mo_marijuana_record_is_marijuana:'no'},'review','source_boundary_review'],
 ...['mo_marijuana_minor_distribution','mo_marijuana_violence','mo_marijuana_impaired_driving','mo_marijuana_commercial_vehicle'].map(id=>[id,{[id]:'yes'},'review','exclusion_review'])
]){const answers={...supplied,...patch},before=structuredClone(answers),decision=decide(profile,route,answers);assert.equal(decision.status,status,name);assert.equal(decision.code,code,name);assert.deepEqual(answers,before);sourceCases.push(name);}
for(const [value,expectedFactCount] of [['incarceration_and_supervision_complete',10],['incarcerated',1],['probation_or_parole',1],['unknown',1]]){
 const answers={...supplied,[fact]:value},ids=selectScreeningQuestionIds(profile,pub,answers),facts=questions.filter(q=>ids.includes(q.id));
 assert.equal(facts.length,expectedFactCount,value);assert(facts.every(q=>factApplies(profile,route,answers,q.id)));
 const resumed=sanitizeResumedAnswersForQuestionIds(pub,answers,ids);assert.deepEqual(resumed.mo_marijuana_pounds,supplied.mo_marijuana_pounds);assert.equal(resumed.financial_obligations,'I am not sure');
 if(value==='incarceration_and_supervision_complete')assert(!ids.includes('financial_obligations'));
}
const conditionalHistory={...supplied,mo_marijuana_pounds:{value:'2.5',unknown:false},mo_marijuana_unknown_injected:{value:'never',unknown:false}};
for(const patch of [{mo_marijuana_record_grade:'class_d'}, {[fact]:'incarcerated'}, {mo_marijuana_record_grade:'misdemeanor',mo_marijuana_offense_date:{unknown:true}}]){
 const answers={...conditionalHistory,...patch},ids=selectScreeningQuestionIds(profile,pub,answers),resumed=sanitizeResumedAnswersForQuestionIds(pub,answers,ids);
 assert.deepEqual(resumed.mo_marijuana_pounds,conditionalHistory.mo_marijuana_pounds);assert.deepEqual(resumed.mo_marijuana_offense_date,answers.mo_marijuana_offense_date);assert.deepEqual(resumed.mo_marijuana_unknown_injected,conditionalHistory.mo_marijuana_unknown_injected);assert(!Object.hasOwn(sanitizeAnswersForQuestionIds(answers,['mo_marijuana_unknown_injected'],ids,pub),'mo_marijuana_unknown_injected'));
}
for(const q of questions){const projected=pub.questions.find(x=>x.id===q.id);assert(projected);assert.equal(projected.prompt,q.prompt);assert.equal(projected.translations.es.prompt,q.translations.es.prompt);}
const siblingAnswers={...supplied,possible_pathway_context:profile.pathways.find(p=>p.id==='general-arrest-charge-plea-trial-or-conviction-expungement-under-rsmo-610-140').label};
assert(!selectScreeningQuestionIds(profile,pub,siblingAnswers).some(id=>questions.some(q=>q.id===id)));
assert(selectScreeningQuestionIds(profile,pub,siblingAnswers).includes('financial_obligations'));
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const subgroup=JSON.parse(fs.readFileSync('data/rcap-grade-a/question-corrections/ga10-missing-witnesses-20261013.json')).additionalSubgroups.find(x=>x.id==='MO-article-xiv-custody-financial-witness-20261014');
const base={...subgroup.freshBaselineReproduction.base,...supplied};
const run=answers=>evaluate({jurisdiction:'MO',profileVersion:profile.profileVersion,matterId:'synthetic-mo-xiv-consumer',answers});
const recordFor=answers=>{const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:run(answers),screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-14T00:00:00Z'});assert(seed);return{revision:0,status:'unverified',draftSnapshot:seed.snapshot,draftHash:seed.hash}};
const contextGuards=[];
for(const id of ['ownership_scope','jurisdiction_scope'])for(const value of [undefined,'',{},[],[id==='ownership_scope'?'Yes':'State or local'],{value:id==='ownership_scope'?'Yes':'State or local',unknown:false},'I am not sure'])for(const custodyValue of [undefined,'unknown','incarceration_and_supervision_complete']){
 const answers={...base,[id]:value,[fact]:custodyValue};if(value===undefined)delete answers[id];if(custodyValue===undefined)delete answers[fact];
 const a=run(answers).evaluation;assert(['needs_more_info','needs_review'].includes(a.resultCode),id+JSON.stringify(value));assert.equal(a.paymentAllowed,false);assert.equal(a.packetPlan,undefined);assert.equal(a.pathwayId,undefined);assert(a.missingQuestionIds.includes(id));contextGuards.push({id,value,custodyValue,result:a.resultCode});
}
const current=[];
for(const financial of ['Yes','No','I am not sure',undefined])for(const custody of ['incarceration_and_supervision_complete','incarcerated','probation_or_parole','unknown','']){
 const answers={...base,[fact]:custody,financial_obligations:financial};if(financial===undefined)delete answers.financial_obligations;
 const a=run(answers),expected=decide(profile,route,answers);assert.equal(a.evaluation.resultCode,expected.status==='guidance'?'guidance_only':expected.status==='missing'?'needs_more_info':'needs_review');assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.paymentAllowed,false);
 const record=recordFor(answers),model=P.protectedPacketInformationModelFor(record);assert(model);assert(P.heldPacketCorrectionInputIds(model,model.resultCode).has(fact));assert.equal(model.initialAnswers.financial_obligations,financial);
 assert.equal(model.stage==='ready_to_generate',false);if(custody==='incarceration_and_supervision_complete')assert(!P.reviewEditablePacketInputIds(model).has('financial_obligations'));
 current.push({financial:financial??'absent',custody,result:model.resultCode});
}
const historical=[];
for(const row of subgroup.freshBaselineReproduction.rows.filter(x=>x.hinted)){
 const record=structuredClone(row.record),original=structuredClone(record),model=P.protectedPacketInformationModelFor(record);assert(model,'historical '+row.financial);assert.equal(model.resultCode,'needs_more_info');assert.equal(model.pathwayId,route);assert.deepEqual(record,original);
 assert(P.heldPacketCorrectionInputIds(model,model.resultCode).has(fact));
 const noop=P.packetInformationPatch({existingItem:{id:'synthetic-mo-xiv-consumer',jurisdiction:'MO',artifactRefs:{}},protectedVerification:record,answers:{}});assert(noop);assert.deepEqual(noop.protectedTransition.nextVerification,record);
 const patch=P.packetInformationPatch({existingItem:{id:'synthetic-mo-xiv-consumer',jurisdiction:'MO',artifactRefs:{}},protectedVerification:record,answers:{[fact]:'incarceration_and_supervision_complete'}});assert(patch);const next=patch.protectedTransition.nextVerification,m=P.protectedPacketInformationModelFor(next);assert(m);assert.equal(m.initialAnswers[fact],'incarceration_and_supervision_complete');assert.equal(m.resultCode,'needs_more_info');assert.equal(m.initialAnswers.financial_obligations,model.initialAnswers.financial_obligations);
 historical.push({financial:row.financial,readonly:true,noopPreserved:true,materialSaved:true});
}
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await import('../src/lib/expungement-ai/briefcase-presentation-authority.ts');
const item={id:'synthetic-mo-xiv-consumer',jurisdiction:'MO',artifactRefs:{}};
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

const historicalHandler=[];
for(const row of subgroup.freshBaselineReproduction.rows.filter(x=>x.hinted)){
 stored=structuredClone(row.record);const original=structuredClone(stored);
 let response=await API.GET(new Request(url),apiContext);assert.equal(response.status,200);assert.deepEqual(stored,original);await correctionFor(stored);
 response=await post({expectedRevision:stored.revision,answers:{}});assert.equal(response.status,200);assert.deepEqual(stored,original);
 response=await post({expectedRevision:stored.revision,answers:{[fact]:base[fact]}});assert.equal(response.status,200);assert.deepEqual((await response.json()).answers[fact],base[fact]);
 const currentModel=P.protectedPacketInformationModelFor(stored);assert(currentModel);assert.equal(currentModel.resultCode,'needs_more_info');await correctionFor(stored,'mo_marijuana_record_grade');
 const relevant=Object.fromEntries(questions.filter(q=>factApplies(profile,route,base,q.id)&&q.id!==fact).map(q=>[q.id,base[q.id]]));
 response=await post({expectedRevision:stored.revision,answers:relevant});assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert.equal(P.protectedPacketInformationModelFor(stored).resultCode,'guidance_only');await ownerMatter(stored);
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [id,value]of Object.entries(original.draftSnapshot[map]))assert.deepEqual(stored.draftSnapshot[map][id],value,map+':'+id);
 historicalHandler.push(row.financial);
}
const rejectedHistorical=[];
const historicalSample=subgroup.freshBaselineReproduction.rows.find(x=>x.hinted&&x.financial==='I am not sure').record.draftSnapshot;
const historicalAuthority=run(P.protectedPacketScreeningAnswers(historicalSample));
assert(P.missouriMarijuanaDraftSuccessor(historicalSample,historicalAuthority));
for(const [name,mutate]of [
 ['state',s=>s.jurisdiction='ME'],['version',s=>s.profileVersion='changed'],['source',s=>s.profileSourceFingerprint='changed'],
 ['authority',s=>s.profileAuthorityFingerprint='changed'],['payment',s=>s.paymentAllowed=true],['track',s=>s.selectedTrackId='other'],
 ['type',s=>s.packetType='court_packet'],['inputs',s=>s.requiredInputIds=['county']],['family',s=>s.packetFamilyIdentifiers.sourceFormIds=['CR375']],
 ['supplied custody',s=>s.packetAnswers[fact]='unknown'],['known financial hold',s=>{s.screeningAnswers.financial_obligations='Yes';s.packetAnswers.financial_obligations='Yes';}],
 ['no route intent',s=>{delete s.screeningAnswers.possible_pathway_context;delete s.packetAnswers.possible_pathway_context;delete s.prefilledAnswers.possible_pathway_context;}]
]){
 const altered=structuredClone(historicalSample);mutate(altered);const authoritative=run({...altered.screeningAnswers,...altered.prefilledAnswers,...altered.packetAnswers});assert.equal(P.missouriMarijuanaDraftSuccessor(altered,authoritative),null,name);rejectedHistorical.push(name);
}
for(const row of subgroup.freshBaselineReproduction.rows.filter(x=>!x.hinted)){
 const answers=P.protectedPacketScreeningAnswers(row.record.draftSnapshot),actual=run(answers).evaluation;
 assert.deepEqual({result:actual.resultCode,path:actual.pathwayId??null,missing:actual.missingQuestionIds,payment:actual.paymentAllowed,reasons:actual.reasons,sourceForms:actual.packetPlan?.sourceFormIds??[]},
 {result:row.result,path:row.path,missing:row.missing,payment:row.payment,reasons:row.reasons,sourceForms:row.sourceForms??[]},'unchanged no-hint before '+row.financial);
}

const ownerSequences=[];
for(const finance of ['No','I am not sure',undefined]){
 const answers={...base,financial_obligations:finance};if(finance===undefined)delete answers.financial_obligations;
 stored=recordFor(answers);
 for(const [id,value] of [
  [fact,'incarcerated'],[fact,'probation_or_parole'],[fact,'unknown'],[fact,''],
  ['mo_marijuana_record_grade','class_d'],['mo_marijuana_offense_date',{unknown:true}],['mo_marijuana_offense_date',{value:'',unknown:false}],
  ['mo_marijuana_violence','unknown'],['mo_marijuana_record_status','unknown'],['case_outcome','I am not sure'],['case_outcome','']
 ]){
  const originalRecord=structuredClone(stored),before=P.protectedPacketInformationModelFor(stored);assert(before);await correctionFor(stored,id);
  let response=await post({expectedRevision:before.revision,answers:{[id]:value}});assert.equal(response.status,200,id);let body=await response.json();assert.deepEqual(body.answers[id],value,id+' actual saved value');assert.equal(body.readyToGenerate,false);
  await correctionFor(stored,id);const updated=P.protectedPacketInformationModelFor(stored);assert(updated);assert.equal(updated.initialAnswers.financial_obligations,finance);
  if(updated.resultCode!=='guidance_only'){const held=structuredClone(stored),deny=await post({expectedRevision:updated.revision,answers:{},verify:true});assert.equal(deny.status,422);assert.deepEqual(stored,held);}
  response=await post({expectedRevision:updated.revision,answers:{[id]:answers[id]}});assert.equal(response.status,200);body=await response.json();assert.deepEqual(body.answers[id],answers[id],id+' actual restore');const restored=P.protectedPacketInformationModelFor(stored);assert(restored);assert.equal(restored.resultCode,'guidance_only');assert.equal(restored.initialAnswers.financial_obligations,finance);await correctionFor(stored,id);
  for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [key,val]of Object.entries(originalRecord.draftSnapshot[map]))if(key!==id)assert.deepEqual(stored.draftSnapshot[map][key],val,map+':'+key);
  ownerSequences.push({finance:finance??'absent',id,value,ENES:true,actualHandlerRestore:true});
 }
}
console.log(JSON.stringify({status:'PASS_MO_ARTICLE_XIV_CONSUMERS',current,historical,ownerSequences:ownerSequences.length,contextGuards:contextGuards.length,historicalHandler,rejectedHistorical,sourceCases,remaining:['Independent acceptance','Authenticated owner acceptance','Qualified language acceptance']}));
