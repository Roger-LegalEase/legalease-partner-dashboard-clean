// GA-12 Q-2d80a89dd926657a1873 / QD-bd6b15fff22cbe1501cb only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 precedence:['evaluator.ts','georgiaSb288Context(profile, evaluated.pathwayId) && evaluated.reasons.some(r => r.code === "ga.waiting_rule_not_executed")','georgiaSb288Context(profile, selectPathway(profile, request.answers)?.id)'],
 paragraphs:['georgia-sb288-facts.ts','c.subsection?.startsWith(subsection)','c.subsection === subsection'],
 translation:['reviewed-result-copy.ts','if (draft)','if (false)'],

 resume:['screens.ts','...GA_SB288_FACT_IDS, ...GA_FIRST_OFFENDER_FACT_IDS','...GA_FIRST_OFFENDER_FACT_IDS'],
 multiline:['public-profile-projection.ts','{ ...question, multiline: true }','question'],
 age:['georgia-sb288-facts.ts','known(a.ga_sb288_under21_at_arrest) === "No"','known(a.age_at_offense) === "21 or older"'],
 count:['georgia-sb288-facts.ts','parsed.length !== Number(count)','false'],
 later:['georgia-sb288-facts.ts','known(a.ga_sb288_convictions_before_filing) === "Yes"','false'],
 consumer:['evaluator.ts','georgiaSb288Context(profile, evaluated.pathwayId)','false'],
 history:['packet-collection.ts','const gaSb288CategoryHistory = gaSb288CategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const gaSb288CategoryHistory = false;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const {createElement}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {QuestionField}=await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const {LocalizationProvider}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const G=await import('../src/lib/rcap-engine/georgia-sb288-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {gaSb288CategoryIsHistory:history,resolvePacketCollection}=await import('../src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await import('../src/lib/rcap/grade-a/packet-specification.ts');
const F=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const route='sb-288-misdemeanor-conviction-restriction-and-sealing',key='GA:'+route;
assert.equal(G.GA_SB288_ROUTE,route);
const profile=getProfileByJurisdiction('GA'),pub=projectPublicProfile(profile),spec=packetSpecificationFor(key);
const parsedProfile=parseJurisdictionProfile(pub);assert(parsedProfile.ok);
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===key);
const base={...witness.answers,case_outcome:'Misdemeanor conviction',ga_sb288_conviction_count:'1',ga_sb288_final_citations:'16-8-14',ga_sb288_convictions_before_filing:'No'};
let checks=0;const check=(name,fn)=>{try{fn();checks++;}catch(e){console.error(JSON.stringify({failedCheck:name,passedChecks:checks}));throw e;}};
const evalFor=answers=>evaluate({jurisdiction:'GA',profileVersion:profile.profileVersion,matterId:'TEST-sb288',answers});
const modelFor=answers=>{
 const authoritative=evalFor(answers);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});
 assert(seed);return {status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
};
const decision=(patch,code)=>{
 const a={...base,...patch},before=structuredClone(a);assert.equal(G.georgiaSb288Facts(a).code,code);assert.deepEqual(a,before);
 const r=evalFor(a).evaluation;assert.equal(r.pathwayId,route);assert.equal(r.reasons[0].code,'ga.sb288_'+code);assert(r.reasons.some(x=>x.code==='ga.waiting_rule_not_executed'));assert.equal(r.paymentAllowed,false);assert(!r.resultCode.startsWith('packet_ready'));
 assert.deepEqual(r.nextSteps,[G.GA_SB288_COPY[code][0]]);
};
// Captured against immutable pre-SB288 evaluator 9a4313ed8; full before/after evidence accompanies S1.
for(const [patch, resultCode, reasonCode] of [
 [{state_exclusion_categories:['DUI/DWI or serious traffic']},'likely_not_eligible','ga.state_exclusion_selected'],
 [{state_exclusion_categories:['Other named excluded offense']},'likely_not_eligible','ga.state_exclusion_selected'],
 [{resolved_timing_bucket:'still_open'},'not_yet','ga.case_still_open'],
 [{court_requirements_completed:'no'},'not_yet','ga.timing_or_completion_blocker'],
 [{new_convictions_during_waiting_period:'Yes'},'not_yet','ga.timing_or_completion_blocker']
]) check('pre-SB288 adverse outcome and reason equality/'+JSON.stringify(patch),()=>{
 const r=evalFor({...base,...patch}).evaluation;
 assert.equal(r.resultCode,resultCode);assert.deepEqual(r.reasons.map(x=>x.code),[reasonCode]);assert.equal(r.paymentAllowed,false);
 const unknown=evalFor({...base,ga_sb288_convictions_before_filing:'I am not sure',...patch}).evaluation;
 assert.equal(unknown.resultCode,resultCode);assert.deepEqual(unknown.reasons.map(x=>x.code),[reasonCode]);
});
check('original waiting source references retained',()=>{
 for(const [answers,sourceRef] of [[witness.answers,'waiting_periods:116-150'],[base,'pathways:68-115']]) {
  assert.equal(evalFor(answers).evaluation.reasons.find(r=>r.code==='ga.waiting_rule_not_executed').sourceRef,sourceRef);
 }
});
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
for(const [code,[en,es]] of Object.entries(G.GA_SB288_COPY)) check('result display EN/ES/'+code,()=>{
 assert(es&&es!==en);assert.deepEqual(reviewedResultText(en),{en,es});
 assert.equal(resolveRuntimeText('es',en),es);assert.equal(resolveRuntimeText('en',en),en);
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'available',summary:en}),{en,es});
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'unavailable',summary:en}),{en});
});
check('original witness retained separately from synthetic conviction probes',()=>{
 assert.notEqual(witness.answers.case_outcome,'Misdemeanor conviction');
 // The pinned dismissed witness must settle; only conviction probes enter record review.
 const before=structuredClone(witness),r=evalFor(witness.answers).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.reasons.map(r=>r.code),['ga.waiting_rule_not_executed']);assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);assert.deepEqual(witness,before);
});
check('record review holds even when exact facts are complete',()=>decision({},'record_review'));
check('numeric count uses the same factual contract without rewriting raw',()=>decision({ga_sb288_conviction_count:1},'record_review'));
for(const value of [undefined,'I am not sure'])check('distinct prefiling fact/'+value,()=>decision({ga_sb288_convictions_before_filing:value},'missing'));
check('four years before filing is consumed',()=>decision({ga_sb288_convictions_before_filing:'Yes'},'later_conviction_review'));
check('old timing answer cannot supply or replace new fact',()=>{
 assert.equal(evalFor({...base,new_convictions_during_waiting_period:'Yes'}).evaluation.resultCode,'not_yet');
 decision({new_convictions_during_waiting_period:'No',ga_sb288_convictions_before_filing:undefined},'missing');
});
for(const citation of ['16-5-20(d)','16-5-23(f)','16-5-23.1(f)','16-5-20(d)(1)','16-5-23(f)(1)','16-5-23.1(f)(1)']) {
 check(citation+'/arrest age required',()=>decision({ga_sb288_final_citations:citation},'missing'));
 check(citation+'/21 or older at arrest',()=>decision({ga_sb288_final_citations:citation,ga_sb288_under21_at_arrest:'No'},'offense_review'));
 check(citation+'/under21 arrest never proves eligibility',()=>decision({ga_sb288_final_citations:citation,ga_sb288_under21_at_arrest:'Yes'},'record_review'));
}
for(const citation of ['16-5-95','16-6-4','16-6-5','16-6-5.1','16-6-8(b)','16-6-10','16-6-11','16-6-12','16-6-22.1','16-10-24.3','16-11-61'])check('listed exclusion/'+citation,()=>{
 decision({ga_sb288_final_citations:citation,ga_sb288_under21_at_arrest:'Yes'},'offense_review');
 assert(!G.georgiaSb288QuestionApplies(profile,route,{...base,ga_sb288_final_citations:citation},'ga_sb288_under21_at_arrest'));
});
check('legacy offense age never supplies arrest age',()=>{
 for(const age of ['under21','21 or older','20','21']) {
  const a={...base,ga_sb288_final_citations:'16-5-20(d)',age_at_offense:age};
  assert(G.georgiaSb288Facts(a).ids.includes('ga_sb288_under21_at_arrest'));
  assert.equal(G.georgiaSb288Facts({...a,ga_sb288_under21_at_arrest:'No'}).code,'offense_review');
 }
});
check('stalking family violence is a separate fact',()=>{
 decision({ga_sb288_final_citations:'16-5-90'},'missing');
 decision({ga_sb288_final_citations:'16-5-90',ga_sb288_stalking_family_violence:'Yes',ga_sb288_under21_at_arrest:'Yes'},'offense_review');
 decision({ga_sb288_final_citations:'16-5-90',ga_sb288_stalking_family_violence:'No'},'record_review');
});
for(const citation of ['16-5-20','16-5-23','16-5-23.1','16-6-8','16-8-2','16-8-999'])check('section/exception review/'+citation,()=>decision({ga_sb288_final_citations:citation},'exception_review'));
for(const citation of ['16-8-14','16-8-14.1','40-6-391','16-12-100'])check('remaining statutory review/'+citation,()=>decision({ga_sb288_final_citations:citation},'record_review'));
for(const value of ['shoplifting','Count 1: 16-8-14','16-5-95 amended to 16-8-14','16-8-14;16-5-95','attempted 16-8-14'])check('unparsed citation/'+value,()=>decision({ga_sb288_final_citations:value},'citation_review'));
check('count mismatch refused',()=>decision({ga_sb288_conviction_count:'2',ga_sb288_single_incident:'Yes'},'citation_review'));
check('multiple counts each consumed',()=>{
 decision({ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-8-14\n16-5-95',ga_sb288_single_incident:'Yes'},'offense_review');
 decision({ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-8-14\n16-8-14',ga_sb288_single_incident:'Yes'},'record_review');
 decision({ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-8-14\n16-8-14',ga_sb288_single_incident:'No'},'incident_review');
});
for(const id of ['ga_sb288_conviction_count','ga_sb288_final_citations','ga_sb288_convictions_before_filing'])for(const raw of [undefined,null,[],{},true,{value:base[id],unknown:true},{value:base[id]}])check('unknown/malformed/'+id+'/'+JSON.stringify(raw),()=>{
 const d=G.georgiaSb288Facts({...base,[id]:raw});assert.notEqual(d.code,'record_review');assert(d.ids.includes(id));
});
check('known wrappers preserve source meaning',()=>assert.equal(G.georgiaSb288Facts(Object.fromEntries(Object.entries(base).map(([k,v])=>[k,{value:v,unknown:false}]))).code,'record_review'));
for(const q of G.GA_SB288_QUESTIONS)check('public and protected correction surface/'+q.id,()=>{
 assert(pub.questions.some(x=>x.id===q.id));assert(q.translations.es.prompt);
 const a={...base,ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-5-20(d)\n16-5-90',ga_sb288_single_incident:'Yes',ga_sb288_under21_at_arrest:'No',ga_sb288_stalking_family_violence:'Yes'};
 assert(selectScreeningQuestionIds(profile,pub,a).includes(q.id));
 assert(P.factualPathwayCorrectionIds('GA',route,a).includes(q.id));
 assert(!P.factualPathwayCorrectionIds('GA','restriction-and-sealing-of-a-pardoned-felony',a).includes(q.id));
});
check('source/category guard fails closed',()=>{
 assert(history(profile,route,spec));assert(!history(profile,'different',spec));assert(!history(profile,route,null));
 for(const edit of [p=>p.profileVersion='changed',p=>p.source.sourceCorpusSha256='changed',p=>p.pathways.find(r=>r.id===route).triggerFields.push('offense_category')]){const p=structuredClone(profile);edit(p);assert(!history(p,route,spec));}
 for(const edit of [s=>s.specificationSha256='changed',s=>s.requiredFacts.push({factId:'offense_category'}),s=>s.routeKey='GA:other']){const s=structuredClone(spec);edit(s);assert(!history(profile,route,s));}
});
check('category is not a new collection gate',()=>{
 const input={jurisdiction:'GA',pathwayId:route,requiredInputIds:['offense_category','charge'],serverFacts:{},screeningAnswers:base,savedAnswers:{},specification:spec,questionById:new Map()};
 const c=resolvePacketCollection(input);const f=c.facts.find(f=>f.factId==='offense_category');assert.equal(f.active,false);assert.equal(f.optional,true);assert.equal(f.source,'ga_sb288_category_history');assert.equal(c.derivedFacts.offense_category,undefined);
 assert.notEqual(resolvePacketCollection({...input,recordOwnQuestionIds:new Set(['offense_category'])}).facts.find(f=>f.factId==='offense_category').source,'ga_sb288_category_history');
});
for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const raw of ['Old broad category','Count 1 theft; count 2 amended',null,{value:'Old category',unknown:true},['Legacy shape']])check('saved history/'+map+'/'+JSON.stringify(raw),()=>{
 const record=modelFor(base);record.draftSnapshot[map].offense_category=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
 const m=P.protectedPacketInformationModelFor(record);assert(!m.missingInputIds.includes('offense_category'));assert.equal(m.questions.find(q=>q.id==='offense_category')?.required,false);
 const patch=P.packetInformationPatch({protectedVerification:record,answers:{}});assert(patch);assert.deepEqual(patch.protectedTransition.nextVerification,before);assert.deepEqual(record,before);
});
check('missing protected citations render a multiline record control',()=>{
 const missing=modelFor({...base,ga_sb288_final_citations:undefined});
 const q=P.protectedPacketInformationModelFor(missing).questions.find(q=>q.id==='ga_sb288_final_citations');assert(q);assert.equal(q.multiline,true);
 const html=renderToStaticMarkup(createElement(LocalizationProvider,null,createElement(QuestionField,{question:q,stateCode:'GA',value:{value:'16-8-14\n16-5-95',unknown:false},onChange:()=>{}})));assert(html.includes('<textarea'));assert(html.includes('16-8-14\n16-5-95'));
});
check('amended counts use final citation and archive literal old answer',()=>{
 const original=modelFor({...base,ga_sb288_final_citations:'16-5-95'});const other=modelFor(base),otherBefore=structuredClone(other);
 original.draftSnapshot.prefilledAnswers.offense_category='Original broad category';original.draftHash=P.protectedPacketDraftHash(original.draftSnapshot);
 const patch=P.packetInformationPatch({protectedVerification:original,answers:{ga_sb288_final_citations:{value:'16-8-14',unknown:false}}});assert(patch);
 const next=patch.protectedTransition.nextVerification;
 assert.deepEqual(next.draftSnapshot.packetAnswers.ga_sb288_final_citations,{value:'16-8-14',unknown:false});
 assert.equal(next.draftSnapshot.prefilledAnswers.offense_category,'Original broad category');
 const r=P.evaluateProtectedPacketFacts(next.draftSnapshot);assert.equal(r.evaluation.reasons[0].code,'ga.sb288_record_review');
 assert(JSON.stringify(next.draftSnapshot.dependencies.semanticAnswerHistory).includes('16-5-95'));
 assert.deepEqual(other,otherBefore);
 const unknown=P.packetInformationPatch({protectedVerification:next,answers:{ga_sb288_final_citations:{value:'16-8-14',unknown:true}}});assert(unknown);
 assert.notEqual(P.evaluateProtectedPacketFacts(unknown.protectedTransition.nextVerification.draftSnapshot).evaluation.reasons[0].code,'ga.sb288_record_review');
});
check('exact authority refusal and price remain',()=>{
 const snapshot=modelFor(base).draftSnapshot;
 const f=F.packetFulfillmentAuthority('GA',route,'checkout creation',{trackId:snapshot.selectedTrackId});assert.equal(f.allowed,false);assert.equal(f.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
 const price=createConsumerPaymentPlaceholder({...snapshot,state:'GA'},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
});
for(const q of G.GA_SB288_QUESTIONS)check('inactive/resumed raw preservation/'+q.id,()=>{
 const a={...base,ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-5-20(d)\n16-5-90',ga_sb288_single_incident:'Yes',ga_sb288_under21_at_arrest:'No',ga_sb288_stalking_family_violence:'Yes'};
 assert.deepEqual(sanitizeResumedAnswersForQuestionIds(parsedProfile.data,a,['ownership_scope'])[q.id],a[q.id]);
});
console.log(JSON.stringify({status:'PASS',checks,originalId:'Q-2d80a89dd926657a1873',route:key,liveCalls:0,limits:['Review-only factual consumer; no legal eligibility finding or route promotion.','Independent timing/authority and adopted packet stops remain; no output regeneration.','Supplemental EN/ES copy requires qualified review.']}));
