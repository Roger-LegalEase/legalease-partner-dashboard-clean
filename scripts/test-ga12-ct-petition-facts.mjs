// GA-12 Q-d33e933319baaaaf750b / QD-bd6b15fff22cbe1501cb only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 precedence:['evaluator.ts','ctPetitionContext(profile, evaluated.pathwayId) && evaluated.reasons.some(r => r.code === "ct.waiting_rule_not_executed")','ctPetitionContext(profile, selectPathway(profile, request.answers)?.id)'],
 translation:['reviewed-result-copy.ts','...Object.values(CT_PETITION_COPY)','...[]'],
 resume_scope:['screens.ts','profile.jurisdiction.code !== "CT" || nextQuestionIds.some','true || nextQuestionIds.some'],
 date_selection:['connecticut-clean-slate-petition-facts.ts','return { ...question, lifecyclePhase: "postpay_packet_field", stage: "packet_information",','return { ...question, lifecyclePhase: "prepay_route_splitter", stage: "pathway_routing",'],
 packet_stage:['connecticut-clean-slate-petition-facts.ts','type === "single_choice" ? "prepay_route_splitter" : "postpay_packet_field"','"prepay_route_splitter"'],
 public_missing:['api/expungement-ai/evaluate/route.ts',' && !packetFactIds.has(id)',''],
 retained_progress:['api/expungement-ai/screening/progress/route.ts','!retainedCtRecordIds.has(id)','true'],
 hidden_progress:['api/expungement-ai/screening/progress/route.ts','isDeepStrictEqual(answers[id], draft.row.answers[id])','true'],
 date_editor:['packet-information.ts','questions = questions.map(question => ctPetitionDateQuestion(question, ctPetitionContext(profile, pathwayId)));','questions = questions.map(question => question);'],
 corrections_missing:['packet-information.ts','if (ctPetitionContext(profile, pathway))','if (false)'],
 corrections_leak:['packet-information.ts','if (ctPetitionContext(profile, pathway))','if (true)'],

 count:['connecticut-clean-slate-petition-facts.ts','lines(a[id]).length !== Number(count)','false'],
 date:['connecticut-clean-slate-petition-facts.ts','lines(a.ct_petition_offense_dates).some(d => !date(d))','false'],
 repeat:['connecticut-clean-slate-petition-facts.ts','known(a.ct_petition_repeat_14227a) === "Yes"','false'],
 consumer:['evaluator.ts','ctPetitionContext(profile, evaluated.pathwayId)','false'],
 history:['packet-collection.ts','const ctPetitionCategoryHistory = ctPetitionCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const ctPetitionCategoryHistory = false;'],
 resume:['screens.ts','profile?.jurisdiction.code === "CT" && CT_PETITION_FACT_IDS.includes(questionId)','false'],
 multiline:['public-profile-projection.ts','CT_PETITION_MULTILINE_IDS.includes(questions[index].id)','false']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replaceAll(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const {createElement}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const {LocalizationProvider}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const C=await import('../src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds,screensFromQuestionIds,deriveScreens}=await import('../src/components/expungement-ai/screening/screens.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {ctPetitionCategoryIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const F=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const route='petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202',key='CT:'+route;
assert.equal(C.CT_PETITION_ROUTE,route);
const profile=getProfileByJurisdiction('CT'),pub=projectPublicProfile(profile),spec=packetSpecificationFor(key);
const parsedProfile=parseJurisdictionProfile(pub);assert(parsedProfile.ok);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===key);
const base={...witness.answers,case_outcome:'Misdemeanor conviction',ct_petition_count:'1',ct_petition_citations:'53a-125b',ct_petition_offense_dates:'1995-02-28',ct_petition_historical_classes:'Class C misdemeanor (recorded)',ct_petition_historical_maxima:'3 months (recorded)',last_conviction_date:'2001-01-02',ct_petition_supervision_complete:'Yes',ct_petition_pending_state_charge:'No'};
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,passedChecks:checks}));throw e;}};
const evalFor=answers=>evaluate({jurisdiction:'CT',profileVersion:profile.profileVersion,matterId:'TEST-ct-petition',answers});
const modelFor=answers=>{
 const authoritative=evalFor(answers);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});
 assert(seed);return {status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
};
const decision=(patch,code)=>{
 const a={...base,...patch},before=structuredClone(a);assert.equal(C.ctPetitionFacts(a).code,code);assert.deepEqual(a,before);
 const r=evalFor(a).evaluation;assert.equal(r.pathwayId,route);assert.equal(r.reasons[0].code,'ct.petition_'+code);assert(r.reasons.some(x=>x.code==='ct.waiting_rule_not_executed'));assert.equal(r.paymentAllowed,false);assert.equal(r.resultCode,'needs_review');
 assert.deepEqual(r.nextSteps,[C.CT_PETITION_COPY[code][0]]);
};
// Outcomes captured from immutable pre-petition evaluator 65d2f1712; S1 evidence includes full reasons.
for(const [patch,resultCode,reasonCode] of [
 [{state_exclusion_categories:['Sex offense or registration']},'likely_not_eligible','ct.state_exclusion_selected'],
 [{state_exclusion_categories:['Firearm or weapons']},'likely_not_eligible','ct.state_exclusion_selected'],
 [{state_exclusion_categories:['Other named excluded offense']},'likely_not_eligible','ct.state_exclusion_selected'],
 [{sentence_completion_date:'No'},'not_yet','ct.timing_or_completion_blocker']
]) check('pre-petition adverse outcome and reason equality/'+JSON.stringify(patch),()=>{
 for(const extra of [{},{ct_petition_supervision_complete:'I am not sure'}]) {
  const r=evalFor({...base,...extra,...patch}).evaluation;
  assert.equal(r.resultCode,resultCode);assert.deepEqual(r.reasons.map(r=>r.code),[reasonCode]);assert.equal(r.paymentAllowed,false);
 }
});
check('original waiting source reference retained',()=>{
 for(const a of [witness.answers,base]) assert.equal(evalFor(a).evaluation.reasons.find(r=>r.code==='ct.waiting_rule_not_executed').sourceRef,
  'source:overview; section:75-102; section:48-74; section:163-202; section:239-249; section:323-333; corpus-unit:123; corpus-unit:24');
});
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
for(const [code,[en,es]] of Object.entries(C.CT_PETITION_COPY))check('result display EN/ES/'+code,()=>{
 assert(es&&es!==en);assert.deepEqual(reviewedResultText(en),{en,es});
 assert.equal(resolveRuntimeText('es',en),es);assert.equal(resolveRuntimeText('en',en),en);
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'available',summary:en}),{en,es});
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'unavailable',summary:en}),{en});
});
const siblingCases=[
 ['absolute-pardon-resulting-in-erasure','guidance_only','ct.guidance_only_no_user_filed_court_petition'],
 ['petition-for-erasure-of-cannabis-conviction-records-under-54-142v','needs_review','ct.selected_pathway_rule_not_matched']
];
for(const [sibling,resultCode,reasonCode] of siblingCases) check('sibling pre-petition screening/editor/resume equality/'+sibling,()=>{
 const w=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey==='CT:'+sibling);
 const answers={...w.answers,last_conviction_date:'2001-01-02'};
 const ids=selectScreeningQuestionIds(profile,pub,answers);
 assert.deepEqual(ids,['ownership_scope','jurisdiction_scope','case_outcome','offense_level','possible_pathway_context','pardon_status','sentence_completion_date','financial_obligations','resolved_timing_bucket','state_exclusion_categories']);
 const r=evalFor(answers).evaluation;assert.equal(r.resultCode,resultCode);assert.deepEqual(r.reasons.map(r=>r.code),[reasonCode]);
 assert(!P.protectedPacketInformationModelFor(modelFor(answers)).questions.some(q=>q.id==='last_conviction_date'));
 assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsedProfile.data,answers,['ownership_scope']),{
  new_convictions_during_waiting_period:'No',ownership_scope:'Yes',pending_cases:'No',record_documents:'Yes',special_preconditions_confirmed:'Yes',last_conviction_date:'2001-01-02'
 });
 const positive=P.factualPathwayCorrectionIds('CT',route,base);assert(positive.includes('ct_petition_count'));assert(positive.includes('last_conviction_date'));
 for(const id of C.CT_PETITION_FACT_IDS){
  assert(P.factualPathwayCorrectionIds('CT',route,base,true).includes(id));
  for(const includeInactive of [false,true]) assert(!P.factualPathwayCorrectionIds('CT',sibling,base,includeInactive).includes(id));
 }
});
const packetFactIds=['ct_petition_count','ct_petition_citations','ct_petition_offense_dates','ct_petition_historical_classes','ct_petition_historical_maxima','last_conviction_date'];
check('exact record facts are protected intake, with preserved date meaning and raw resume',()=>{
 const ids=selectScreeningQuestionIds(profile,pub,base);
 for(const id of packetFactIds){
  assert(!ids.includes(id));assert(!deriveScreens(parsedProfile.data).some(q=>q.id===id));
  assert(!screensFromQuestionIds(parsedProfile.data,[...ids,id]).some(q=>q.id===id));
  assert(pub.postPaymentPacketCompletion.requiredPacketCompletionFields.some(q=>q.id===id));
 }
 const q=P.protectedPacketInformationModelFor(modelFor(base)).questions.find(q=>q.id==='last_conviction_date');
 assert(q);assert(q.prompt.includes('for any crime'));assert(q.translations.es.prompt.includes('cualquier delito'));
 assert.equal(q.lifecyclePhase,'postpay_packet_field');assert.equal(q.stage,'packet_information');
 const blank={...base};for(const id of packetFactIds)delete blank[id];
 const protectedModel=P.protectedPacketInformationModelFor(modelFor(blank));assert(protectedModel);
 for(const id of packetFactIds)assert(protectedModel.questions.some(q=>q.id===id));
 const resumed=sanitizeResumedAnswersForQuestionIds(parsedProfile.data,base,ids);
 for(const id of [...packetFactIds,'financial_obligations','sentence_completion_date'])assert.deepEqual(resumed[id],base[id]);
});
check('original witness separate from synthetic record probes',()=>{
 // The pinned dismissed witness must settle; only conviction probes enter record review.
 const before=structuredClone(witness),r=evalFor(witness.answers).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.reasons.map(r=>r.code),['ct.waiting_rule_not_executed']);assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);assert.deepEqual(witness,before);
});
check('complete recorded facts never establish eligibility',()=>decision({},'record_review'));
for(const [patch,code] of [[{ownership_scope:'No'},'ct.ownership_scope_hard_stop'],[{jurisdiction_scope:'Federal'},'ct.federal_or_out_of_scope']])check('existing context safeguard/'+code,()=>{
 const r=evalFor({...base,...patch}).evaluation;assert.equal(r.resultCode,'hard_stop');assert.equal(r.reasons[0].code,code);assert.equal(r.paymentAllowed,false);assert.equal(r.packetPlan,undefined);
});
check('unknown ownership cannot select a packet plan',()=>{
 const r=evalFor({...base,ownership_scope:undefined}).evaluation;assert.equal(r.resultCode,'needs_more_info');assert.deepEqual(r.reasons.map(r=>r.code),['ct.missing_required_facts']);assert(r.missingQuestionIds.includes('ownership_scope'));assert.equal(r.pathwayId,undefined);assert.equal(r.packetPlan,undefined);assert.equal(r.paymentAllowed,false);
});
check('numeric count preserves meaning',()=>decision({ct_petition_count:1},'record_review'));
check('count mismatch needs review',()=>decision({ct_petition_count:2},'count_review'));
for(const raw of ['1995-02-29','1995-13-01','2/28/1995'])check('conduct calendar date/'+raw,()=>decision({ct_petition_offense_dates:raw},'date_review'));
check('most recent judgment date validated independently',()=>decision({last_conviction_date:'2001-02-29'},'date_review'));
for(const id of C.CT_PETITION_FACT_IDS.filter(id=>id!=='ct_petition_repeat_14227a'))for(const raw of [undefined,null,true,[],{},'I am not sure',{value:base[id],unknown:true},{value:base[id]}])check('unknown/malformed/'+id+'/'+JSON.stringify(raw),()=>{
 const a={...base,[id]:raw};const d=C.ctPetitionFacts(a);assert.equal(d.code,'missing');assert(d.ids.includes(id));
});
check('known wrappers do not rewrite saved answers',()=>assert.equal(C.ctPetitionFacts(Object.fromEntries(Object.entries(base).map(([k,v])=>[k,{value:v,unknown:false}]))).code,'record_review'));
for(const raw of ['theft','53a-125b amended from 53a-125a','53a-125b;14-227a','Count 1: 53a-125b'])check('final citation syntax/'+raw,()=>decision({ct_petition_citations:raw},'citation_review'));
check('conduct not conviction and no automatic date routing',()=>{
 decision({ct_petition_offense_dates:undefined,conviction_date:'1990-01-01',sentencing_date:'1990-01-01'},'missing');
 for(const date of ['1999-12-31','2000-01-01','2026-01-01'])decision({ct_petition_offense_dates:date},'record_review');
});
check('historical class/max never inferred from broad current class or sentence',()=>{
 decision({ct_petition_historical_classes:undefined,eligible_conviction_class:'Class C',offense_level:'Misdemeanor'},'missing');
 decision({ct_petition_historical_maxima:undefined,sentence_completion_date:'Yes'},'missing');
 decision({ct_petition_historical_classes:'Unclassified (recorded)',ct_petition_historical_maxima:'20 years (recorded)'},'record_review');
});
check('distinct most recent any-crime judgment reused',()=>{
 decision({last_conviction_date:undefined,conviction_date:'1990-01-01',sentence_completion_actual_date:'1991-01-01',new_convictions_during_waiting_period:'No'},'missing');
 decision({last_conviction_date:'2026-10-01'},'record_review');
 assert.equal(C.CT_PETITION_FACT_IDS.filter(id=>id.includes('conviction_date')).length,1);
});
check('supervision and pending charges consumed independently',()=>{
 decision({ct_petition_supervision_complete:'No'},'completion_review');decision({ct_petition_pending_state_charge:'Yes'},'completion_review');
 decision({ct_petition_supervision_complete:undefined,sentence_completion_date:'Yes',pending_cases:'No'},'missing');
});
for(const citation of ['14-227a','14-227a(a)(1)'])check('repeat DUI is a distinct fact/'+citation,()=>{
 decision({ct_petition_citations:citation},'missing');
 decision({ct_petition_citations:citation,ct_petition_repeat_14227a:'Yes'},'repeat_review');
 decision({ct_petition_citations:citation,ct_petition_repeat_14227a:'No'},'record_review');
 decision({ct_petition_citations:citation,ct_petition_repeat_14227a:'I am not sure',new_convictions_during_waiting_period:'No'},'missing');
});
check('no broad family/sex/firearms exclusion inference',()=>{
 for(const category of ['Family violence','Sex offense','Firearms']){
  const record=modelFor(base);record.draftSnapshot.packetAnswers.offense_category=category;
  const result=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
  assert.equal(result.reasons[0].code,'ct.petition_record_review');assert.equal(result.resultCode,'needs_review');assert.equal(result.paymentAllowed,false);
 }
 for(const citation of ['53a-70','53a-217','53a-999'])decision({ct_petition_citations:citation},'record_review');
});
check('multiple and repeated final counts consume every row',()=>{
 const pair={ct_petition_count:'2',ct_petition_citations:'53a-125b\n53a-125b',ct_petition_offense_dates:'1995-02-28\n1996-02-29',ct_petition_historical_classes:'Class C\nClass C',ct_petition_historical_maxima:'3 months\n3 months'};
 decision(pair,'record_review');
 decision({...pair,ct_petition_offense_dates:'1995-02-28\n1996-02-30'},'date_review');
 decision({...pair,ct_petition_historical_classes:'Class C'},'count_review');
 decision({...pair,ct_petition_historical_maxima:'3 months\nunknown'},'missing');
});
for(const q of C.CT_PETITION_QUESTIONS)check('public/protected correction/'+q.id,()=>{
 assert(pub.questions.some(x=>x.id===q.id));assert(q.translations.es.prompt);
 const a={...base,ct_petition_citations:'14-227a',ct_petition_repeat_14227a:'No'};
 assert.equal(selectScreeningQuestionIds(profile,pub,a).includes(q.id),q.type==='single_choice');assert(P.factualPathwayCorrectionIds('CT',route,a).includes(q.id));
 assert(!P.factualPathwayCorrectionIds('CT','automatic-clean-slate-erasure-for-eligible-post-2000-convictions',a).includes(q.id));
});
check('repeat control is conditional in screening and protected editor',()=>{
 const ids=selectScreeningQuestionIds(profile,pub,base);assert(!ids.includes('ct_petition_repeat_14227a'));
 assert(!ids.includes('last_conviction_date'));
 const protectedIds=P.protectedPacketInformationModelFor(modelFor(base)).questions.map(q=>q.id);
 assert(!protectedIds.includes('ct_petition_repeat_14227a'));
});
check('source/category guard fails closed',()=>{
 assert(history(profile,route,spec));assert(!history(profile,'different',spec));assert(!history(profile,route,null));
 for(const edit of [p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.pathways.find(r=>r.id===route).triggerFields.push('new')]){const p=structuredClone(profile);edit(p);assert(!history(p,route,spec));}
 for(const edit of [s=>s.specificationSha256='changed',s=>s.requiredFacts.push({factId:'offense_category'}),s=>s.routeKey='CT:other']){const s=structuredClone(spec);edit(s);assert(!history(profile,route,s));}
});
// GA-12-M00708: broad saved labels cannot replace final-record facts or an exclusion.
for(const [patch,reason] of [
 [{},'ct.petition_record_review'],
 [{ct_petition_citations:undefined},'ct.petition_missing'],
 [{state_exclusion_categories:['Sex offense or registration']},'ct.state_exclusion_selected']
])check('category values cannot change the actual consumer/'+reason,()=>{
 const answers={...base,...patch},expected=evalFor(answers).evaluation;
 assert.equal(expected.reasons[0].code,reason);
 for(const raw of ['Misdemeanor','Felony','Sex offense','Count 1 theft; count 2 amended', {unknown:true}, {value:'Original charge',unknown:false}]){
  assert.throws(()=>evalFor({...answers,offense_category:raw}),error=>error.invalidQuestionIds?.includes('offense_category'));
  const record=modelFor(answers);record.draftSnapshot.packetAnswers.offense_category=structuredClone(raw);
  const before=structuredClone(record);
  assert.deepEqual(P.evaluateProtectedPacketFacts(record.draftSnapshot,undefined,expected.matterId).evaluation,expected);
  assert.deepEqual(record,before);
 }
});
check('category is not a new collection gate',()=>{
 const input={jurisdiction:'CT',pathwayId:route,requiredInputIds:['offense_category','charge'],serverFacts:{},screeningAnswers:base,savedAnswers:{},specification:spec,questionById:new Map()};
 const c=resolvePacketCollection(input),f=c.facts.find(f=>f.factId==='offense_category');assert.equal(f.active,false);assert.equal(f.optional,true);assert.equal(f.source,'ct_petition_category_history');assert.equal(c.derivedFacts.offense_category,undefined);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['offense_category'])}).facts.find(f=>f.factId==='offense_category').source,'ct_petition_category_history');
});
for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const raw of ['Old category','Original charge amended',null,{value:'Old category',unknown:true},['Legacy shape']])check('raw saved history/'+map+'/'+JSON.stringify(raw),()=>{
 const record=modelFor(base);record.draftSnapshot[map].offense_category=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
 assert.deepEqual(P.evaluateProtectedPacketFacts(record.draftSnapshot,undefined,'TEST-ct-petition').evaluation,evalFor(base).evaluation);
 const m=P.protectedPacketInformationModelFor(record);assert(!m.missingInputIds.includes('offense_category'));assert.equal(m.questions.find(q=>q.id==='offense_category')?.required,false);
 const patch=P.packetInformationPatch({protectedVerification:record,answers:{}});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);assert.deepEqual(record,before);
});
for(const id of C.CT_PETITION_MULTILINE_IDS)check('actual protected multiline/'+id,()=>{
 const missing=modelFor({...base,[id]:undefined}),q=P.protectedPacketInformationModelFor(missing).questions.find(q=>q.id===id);assert(q);assert.equal(q.multiline,true);
 const html=renderToStaticMarkup(createElement(LocalizationProvider,null,createElement(QuestionField,{question:q,stateCode:'CT',value:{value:'first row\nsecond row',unknown:false},onChange:()=>{}})));assert(html.includes('<textarea'));assert(html.includes('first row\nsecond row'));
});
check('actual amended save consumes final record and preserves other docket',()=>{
 const original=modelFor({...base,ct_petition_citations:'14-227a',ct_petition_repeat_14227a:'Yes'}),other=modelFor(base),otherBefore=structuredClone(other);
 original.draftSnapshot.prefilledAnswers.offense_category='Original broad category';original.draftHash=P.protectedPacketDraftHash(original.draftSnapshot);
 const patch=P.packetInformationPatch({protectedVerification:original,answers:{ct_petition_citations:{value:'53a-125b',unknown:false}}});assert(patch);
 const next=patch.protectedTransition.nextVerification;assert.deepEqual(next.draftSnapshot.packetAnswers.ct_petition_citations,{value:'53a-125b',unknown:false});assert.equal(next.draftSnapshot.prefilledAnswers.offense_category,'Original broad category');
 assert.equal(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation.reasons[0].code,'ct.petition_record_review');assert(JSON.stringify(next.draftSnapshot.dependencies.semanticAnswerHistory).includes('14-227a'));assert.deepEqual(other,otherBefore);
 assert.equal(next.draftSnapshot.screeningAnswers.ct_petition_repeat_14227a,'Yes');
 const unknown=P.packetInformationPatch({protectedVerification:next,answers:{ct_petition_citations:{value:'53a-125b',unknown:true}}});assert(unknown);
 assert.equal(P.evaluateProtectedPacketFacts(unknown.protectedTransition.nextVerification.draftSnapshot).evaluation.reasons[0].code,'ct.petition_missing');
});
check('existing known court data reused through save',()=>{
 const record=modelFor(base);record.draftSnapshot.prefilledAnswers.court='Existing sentencing court';record.draftSnapshot.prefilledAnswers.case_number='TEST-DOCKET-ONE';record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
 const before=structuredClone(record);const patch=P.packetInformationPatch({protectedVerification:record,answers:{ct_petition_count:'1'}});assert(patch);
 assert.equal(patch.protectedTransition.nextVerification.draftSnapshot.prefilledAnswers.court,'Existing sentencing court');assert.equal(patch.protectedTransition.nextVerification.draftSnapshot.prefilledAnswers.case_number,'TEST-DOCKET-ONE');assert.deepEqual(record,before);
});
check('exact authority refusal and price stay held',()=>{
 const snapshot=modelFor(base).draftSnapshot,f=F.packetFulfillmentAuthority('CT',route,'checkout creation',{trackId:snapshot.selectedTrackId});assert.equal(f.allowed,false);assert.equal(f.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
 const price=createConsumerPaymentPlaceholder({...snapshot,state:'CT'},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
});
for(const id of C.CT_PETITION_FACT_IDS)check('inactive/resumed raw preservation/'+id,()=>{
 const a={...base,ct_petition_repeat_14227a:{value:'Yes',unknown:true}};assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsedProfile.data,a,['ownership_scope'])[id],a[id]);
});
const records=new Map(['TEST-ct-first','TEST-ct-second'].map(id=>[id,modelFor(base)]));
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'TEST-ct-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'CT', artifactRefs: {} });
globalThis.__ctPetitionTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'TEST-ct-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'TEST-ct-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'TEST-ct-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__ctPetitionTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const id of records.keys()) {
 const otherId=id==='TEST-ct-first'?'TEST-ct-second':'TEST-ct-first',other=structuredClone(records.get(otherId));
 const before=structuredClone(records.get(id));
 let response=await post(id,{});
 check(id+'/HTTP no-op preserves raw',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),before);});
 response=await post(id,{ct_petition_citations:{value:'14-227a',unknown:false},ct_petition_repeat_14227a:'Yes'});
 const premature=await response.json();
 check(id+'/HTTP rejects an unoffered conditional answer',()=>{assert.equal(response.status,422);assert.equal(premature.error,'invalid_packet_answers');assert.deepEqual(records.get(id),before);});
 response=await post(id,{ct_petition_citations:{value:'14-227a',unknown:false}});
 check(id+'/HTTP citation exposes the separate repeat question',()=>{
  assert.equal(response.status,200);const record=records.get(id);assert.equal(P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation.reasons[0].code,'ct.petition_missing');
  assert(P.protectedPacketInformationModelFor(record).questions.some(q=>q.id==='ct_petition_repeat_14227a'));
 });
 response=await post(id,{ct_petition_repeat_14227a:'Yes'});
 check(id+'/HTTP amendment reaches factual consumer',()=>{
  assert.equal(response.status,200);const record=records.get(id);
  assert.deepEqual(record.draftSnapshot.packetAnswers.ct_petition_citations,{value:'14-227a',unknown:false});
  assert.equal(P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation.reasons[0].code,'ct.petition_repeat_review');
  assert(JSON.stringify(record.draftSnapshot.dependencies.semanticAnswerHistory).includes('53a-125b'));
  assert.equal(record.status,'unverified');assert.deepEqual(records.get(otherId),other);
 });
 response=await post(id,{ct_petition_citations:{value:'14-227a',unknown:true}});
 check(id+'/HTTP unknown does not revive old citation',()=>{
  assert.equal(response.status,200);assert.deepEqual(records.get(id).draftSnapshot.packetAnswers.ct_petition_citations,{value:'14-227a',unknown:true});
  const r=P.evaluateProtectedPacketFacts(records.get(id).draftSnapshot).evaluation;assert.equal(r.reasons[0].code,'ct.petition_missing');assert.equal(r.paymentAllowed,false);assert.equal(r.resultCode,'needs_review');
 });
 const saved=structuredClone(records.get(id)),saveCount=saves;
 for(const [kind,status,error] of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'TEST-other-owner':'TEST-ct-owner';
  response=await post(id,{ct_petition_citations:{value:'53a-125b',unknown:false}},kind==='stale'?{expectedRevision:0}:{});const body=await response.json();
  check(id+'/HTTP '+kind+' safeguard',()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),saved);assert.equal(saves,saveCount);assert.deepEqual(records.get(otherId),other);});
 }
 authenticated=true;verified=true;owner='TEST-ct-owner';
}
const publicAPI=await import('../src/app/api/expungement-ai/evaluate/route.ts');
for(const patch of [{},Object.fromEntries(packetFactIds.map(id=>[id,undefined])),{ct_petition_count:'0',last_conviction_date:{unexpected:true}},{ct_petition_historical_classes:'unknown'}]){
 const answers={...base,...patch},before=structuredClone(answers);
 const response=await publicAPI.POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:'CT',profileVersion:profile.profileVersion,matterId:'TEST-ct-prepay',answers})}));
 const result=await response.json();
 check('public result excludes protected correction links '+JSON.stringify(patch),()=>{
  assert.equal(response.status,200);assert.equal(result.resultCode,'needs_review');assert.equal(result.paymentAllowed,false);
  assert(!result.missingQuestionIds.some(id=>packetFactIds.includes(id)));assert.deepEqual(answers,before);
  const internal=evalFor(answers).evaluation;assert.deepEqual(result.reasons,internal.reasons);
  const record=modelFor(answers);assert(P.protectedPacketInformationModelFor(record));
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 });
}
const broad={...base,ct_petition_supervision_complete:undefined};
const broadResponse=await publicAPI.POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:'CT',profileVersion:profile.profileVersion,matterId:'TEST-ct-prepay',answers:broad})}));
check('public result still requests a missing screening predicate',()=>assert((evalFor(broad).evaluation.missingQuestionIds).includes('ct_petition_supervision_complete')));
assert((await broadResponse.json()).missingQuestionIds.includes('ct_petition_supervision_complete'));
// Existing anonymous drafts may retain exact record facts, but cannot insert or edit hidden values.
const progressUrl=pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/screening/progress/route.ts`).href;
let progressSource=fs.readFileSync(new URL(progressUrl),'utf8');
const draftImport='import { RCAP_DRAFT_COOKIE, authorizedRcapDraft, sealRcapDraft, rcapDraftCookieOptions } from "@/lib/expungement-ai/rcap-screening-draft";';
assert(progressSource.includes(draftImport));
progressSource=progressSource.replace(draftImport,`const RCAP_DRAFT_COOKIE='test-draft';
 const authorizedRcapDraft=async()=> (globalThis as any).__ctProgressDraft;
 const sealRcapDraft=()=> 'isolated';const rcapDraftCookieOptions={httpOnly:true};`);
// Apply any relevant in-memory fault before transpilation; no probe writes to this tree.
if(mutation&&mutations[mutation][0]==='api/expungement-ai/screening/progress/route.ts'){
 const [,from,to]=mutations[mutation];assert(progressSource.includes(from));progressSource=progressSource.replaceAll(from,to);
}
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:progressUrl,source:ts.transpileModule(progressSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const progressAPI=await import(progressUrl);
const {NextRequest}=await import('next/server');
const selected=selectScreeningQuestionIds(profile,pub,base);
const saved=Object.fromEntries([...selected,...packetFactIds].filter(id=>Object.hasOwn(base,id)).map(id=>[id,base[id]]));
const draft={row:{session_id:'TEST-ct-progress',jurisdiction:'CT',answers:saved,current_question_id:'ownership_scope',updated_at:'2026-10-18T00:00:00Z'},db:{from:()=>{throw Error('Unexpected draft write');}}};
globalThis.__ctProgressDraft=draft;
for(const [name,answers,status]of [['unchanged retained raw',saved,200],['hidden count edit',{...saved,ct_petition_count:'2'},400],['hidden date edit',{...saved,last_conviction_date:'2002-01-01'},400]]){
 const before=structuredClone(draft.row);
 const response=await progressAPI.PUT(new NextRequest('http://isolated.invalid/api/expungement-ai/screening/progress',{method:'PUT',headers:{host:'isolated.invalid',origin:'http://isolated.invalid','content-type':'application/json'},body:JSON.stringify({sessionId:'TEST-ct-progress',profileVersion:profile.profileVersion,currentQuestionId:'ownership_scope',answers})}));
 check('progress '+name,()=>{assert.equal(response.status,status);assert.deepEqual(draft.row,before);});
}
delete draft.row.answers.ct_petition_count;
const injected=await progressAPI.PUT(new NextRequest('http://isolated.invalid/api/expungement-ai/screening/progress',{method:'PUT',headers:{host:'isolated.invalid',origin:'http://isolated.invalid','content-type':'application/json'},body:JSON.stringify({sessionId:'TEST-ct-progress',profileVersion:profile.profileVersion,currentQuestionId:'ownership_scope',answers:{...draft.row.answers,ct_petition_count:'1'}})}));
check('progress hidden insertion refused',()=>assert.equal(injected.status,400));
delete globalThis.__ctProgressDraft;
delete globalThis.__ctPetitionTransport;
console.log(JSON.stringify({status:'PASS',checks,isolatedHttpCases:27,originalId:'Q-d33e933319baaaaf750b',route:key,liveCalls:0,limits:['Review-only; no historical law classification, date routing or eligibility inference.','Exact authority/timing holds retained; no output regeneration.','Supplemental EN/ES draft pending qualified review.']}));
