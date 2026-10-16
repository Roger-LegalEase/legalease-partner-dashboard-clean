import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {register} from 'node:module';
import ts from 'typescript';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const root=process.cwd(),file=p=>path.join(root,p),load=p=>import(pathToFileURL(file(p)).href);
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#binding-'+Buffer.from(name).toString('hex'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {LocalizationContext}=await import(pathToFileURL(loc).href);

const baseline=process.argv.includes('--baseline'),receiptPath=process.env.RCAP_MN_CANNABIS_LOCATION_RECEIPT;
if(receiptPath)assert(!fs.existsSync(receiptPath),'Optional receipt path must be fresh');
if(baseline&&process.env.RCAP_MN_CANNABIS_LOCATION_PREIMAGES)for(const relative of ['src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts'])compile(file(relative),fs.readFileSync(path.join(process.env.RCAP_MN_CANNABIS_LOCATION_PREIMAGES,relative),'utf8'));

const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {packetPlanForPathway}=await load('src/lib/rcap-engine/packet-planner.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const profile=getProfileByJurisdiction('MN'),route='cannabis-automatic-or-board-reviewed-expungement-under-609a-055-06';
assert(profile);const plan=packetPlanForPathway(profile,route);assert(plan);
// Narrow immutable comparisons from the actual preserved predecessor replay at
// 38fed884. No private record, rendered page, or participant-like map is published.
const frozenBefore={
  "head": "38fed8840d46ba9f01aa1857802cf9435fc82604",
  "receiptSha256": "bfcc64c379ceca2d28a401f2a359b4321b517e0ed61c3bd5cbf2ed29420be663",
  "plan": "933f03e3a050e3b63a049c346d059af7be8cdb68eaee008c662dcffeec8cd5fb",
  "siblings": {
    "arrest-identification-data-destruction-when-no-charges-were-filed-minn-stat-299c-11": "dc6c089b250f3d22d07b5a07cc6aebb557ab1b4925a6c13903b3d4f375f3fb2a",
    "automatic-mistaken-identity-expungement-under-609a-017": "f41dd2f1e19bcf31f66cac3f975d47483416cefabe18059ff93594c60af5234b",
    "automatic-clean-slate-expungement-under-609a-015": "591ee0d730083cb66ac93576d85896bcb43d9edd4692412c9fb8980f9719450c",
    "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025": "470d5428a6184372d2b41497ffafafece429b4467923901bd2eb21c72028b61b",
    "petition-based-expungement-under-609a-02-03": "bcf6ffeef84ed648fc230b9f5787de38b1f49eaeb93b6ead225b484d3bc769be"
  },
  "court": {
    "known": "7aaafe3cd77b2e613892e1bbe285adf04187bb4d4bc735b5cff963452f91178b",
    "absent": "7aaafe3cd77b2e613892e1bbe285adf04187bb4d4bc735b5cff963452f91178b",
    "unknown": "7aaafe3cd77b2e613892e1bbe285adf04187bb4d4bc735b5cff963452f91178b"
  }
};
const comparisonHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Accepted MN2 required-collection successor only (43dd1675, TARGET-v7 SHA4135ecf7).
// Preserve every original full sibling hash; assert exact added facts/indices,
// then restore only those additions in a clone. No fixture/old-prefix transplant.
const mn2AcceptedAppends = {"petition-based-expungement-under-609a-02-03":{"facts":[{"factId":"mn_deciding_case_county","collection":"render_required","phase":"render","group":"court_and_case_number","active":true,"source":"mn_two_county_source_fact","reason":"MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs; collection for review only, not an authority directory, source-stage selection, prosecutor agreement or document mapping"}],"activeIds":["mn_deciding_case_county"]},"prosecutor-agreed-sealing-without-a-full-petition-under-609a-025":{"facts":[{"factId":"mn_prosecuted_case_county","collection":"render_required","phase":"render","group":"court_and_case_number","active":true,"source":"mn_two_county_source_fact","reason":"MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs; collection for review only, not an authority directory, source-stage selection, prosecutor agreement or document mapping"},{"factId":"mn_prosecuted_by","collection":"render_required","phase":"render","group":"court_and_case_number","active":true,"source":"mn_two_county_source_fact","reason":"MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs; collection for review only, not an authority directory, source-stage selection, prosecutor agreement or document mapping"},{"factId":"mn_prosecuting_city","collection":"conditional","phase":"known","group":null,"active":false,"source":"mn_two_county_source_fact","reason":"MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs; collection for review only, not an authority directory, source-stage selection, prosecutor agreement or document mapping"}],"activeIds":["mn_prosecuted_case_county","mn_prosecuted_by"]}};
const assertMn2PredecessorHash=(collection,routeId)=>{
 const delta=mn2AcceptedAppends[routeId];assert(delta,'Only two exact MN2 sibling routes');
 assert.equal(collection.routeKey,'MN:'+routeId);assert.equal(collection.pathwayId,routeId);
 const addedIds=delta.facts.map(f=>f.factId),count=delta.facts.length;
 assert.deepEqual(collection.facts.slice(-count),delta.facts,'Exact accepted ordered MN2 new fact objects required');
 assert.deepEqual(collection.facts.filter(f=>addedIds.includes(f.factId)),delta.facts,'No duplicated/reordered MN2 fact');
 assert.deepEqual(collection.renderQuestions.filter(id=>addedIds.includes(id)),delta.activeIds,'Only active MN2 facts render; inactive city never renders');
 assert.deepEqual(collection.renderQuestions.slice(-delta.activeIds.length),delta.activeIds,'Exact MN2 render tail/order required');
 const sections=collection.groupedParticipantSections.filter(s=>s.id==='court_and_case_number');assert.equal(sections.length,1);
 assert.deepEqual(sections[0].factIds.filter(id=>addedIds.includes(id)),delta.activeIds,'Exact MN2 court section membership');
 assert.deepEqual(sections[0].factIds.slice(-delta.activeIds.length),delta.activeIds,'Exact MN2 court section tail/order');
 for(const section of collection.groupedParticipantSections)if(section.id!=='court_and_case_number')assert(!section.factIds.some(id=>addedIds.includes(id)),'No MN2 fact in unrelated section');
 for(const key of ['knownFacts','derivedFacts'])for(const id of addedIds)assert(!Object.hasOwn(collection[key],id),'No new MN2 known/derived value on this unchanged original sibling fixture');
 for(const key of ['prepayQuestions','conditionalQuestions','filingReadinessItems','externalActorFields','unresolvedRequiredFacts','pendingDerivations','hardBlockers'])assert(!addedIds.some(id=>JSON.stringify(collection[key]).includes(id)),'No unapproved MN2 index change: '+key);
 const clone=structuredClone(collection);clone.facts.splice(-count,count);clone.renderQuestions.splice(-delta.activeIds.length,delta.activeIds.length);
 clone.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.splice(-delta.activeIds.length,delta.activeIds.length);
 assert.equal(comparisonHash(clone),frozenBefore.siblings[routeId],'Every unrelated MN2 sibling byte must retain ORIGINAL full frozen hash');
 return clone;
};
// Accepted target-origin successor (623493132): the original no-charge
// sibling inputs remain unchanged. Only the new explicit confirmation fact and
// its two asked indices are reversed before the existing county-only inverse.
// Protected-stage additions are not accepted by this predecessor comparison.
const mnOriginConfirmationFact={factId:'jurisdiction_scope',collection:'prepay_confirmation',phase:'prepay_confirmation',group:'court_and_case_number',source:'distinct_record_question_contract',reason:'the original record question has a distinct meaning; preserve its answer and require scoped review when its source changes'};
const restoreExactMnOriginPredecessor=(collection,routeId)=>{
 assert(Object.hasOwn(mn2AcceptedAppends,routeId),'Only the exact two reviewed MN2 routes');
 assert.equal(collection.routeKey,'MN:'+routeId);assert.equal(collection.pathwayId,routeId);
 assert(!collection.facts.some(f=>f.source==='mn_protected_source_stage_fact'),'Unaccepted stage facts cannot be normalized away');
 const id='jurisdiction_scope';
 assert.deepEqual(collection.facts.filter(f=>f.factId===id),[mnOriginConfirmationFact],'Exact single target-origin fact required');
 assert.deepEqual(collection.facts.at(-1),mnOriginConfirmationFact,'Exact target-origin appended fact position required');
 assert.deepEqual(collection.prepayQuestions.filter(factId=>factId===id),[id],'Exact single origin prepay index required');
 assert.equal(collection.prepayQuestions.at(-1),id,'Exact origin prepay index position required');
 const sections=collection.groupedParticipantSections.filter(s=>s.id==='court_and_case_number');assert.equal(sections.length,1);
 assert.deepEqual(sections[0].factIds.filter(factId=>factId===id),[id],'Exact single origin section index required');
 assert.equal(sections[0].factIds.at(-1),id,'Exact origin section index position required');
 for(const section of collection.groupedParticipantSections)if(section.id!=='court_and_case_number')assert(!section.factIds.includes(id),'Origin cannot enter another section');
 for(const key of ['knownFacts','derivedFacts'])assert(!Object.hasOwn(collection[key],id),'Historical scalar cannot become confirmed origin');
 for(const key of ['renderQuestions','conditionalQuestions','filingReadinessItems','externalActorFields','unresolvedRequiredFacts','pendingDerivations','hardBlockers'])assert(!JSON.stringify(collection[key]).includes(id),'No other origin index change: '+key);
 const clone=structuredClone(collection);clone.facts.pop();clone.prepayQuestions.pop();
 clone.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.pop();
 return clone;
};
const assertMnOriginSuccessorPredecessorHash=(collection,routeId)=>assertMn2PredecessorHash(restoreExactMnOriginPredecessor(collection,routeId),routeId);
const mnOriginSuccessorMutations=[
 ['wrong-origin-source',c=>{c.facts.at(-1).source='forged';}],
 ['wrong-origin-group',c=>{c.facts.at(-1).group='about_you';}],
 ['invented-origin-value',c=>{c.facts.at(-1).value='State or local';}],
 ['invented-origin-active',c=>{c.facts.at(-1).active=true;}],
 ['omitted-origin-fact',c=>{c.facts.pop();}],
 ['duplicated-origin-fact',c=>{c.facts.push(structuredClone(c.facts.at(-1)));}],
 ['reordered-origin-fact',c=>{const a=c.facts;[a[a.length-1],a[a.length-2]]=[a[a.length-2],a[a.length-1]];}],
 ['omitted-origin-prepay-index',c=>{c.prepayQuestions.pop();}],
 ['duplicated-origin-prepay-index',c=>{c.prepayQuestions.push('jurisdiction_scope');}],
 ['reordered-origin-prepay-index',c=>{c.prepayQuestions.pop();c.prepayQuestions.unshift('jurisdiction_scope');}],
 ['omitted-origin-section-index',c=>{c.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.pop();}],
 ['duplicated-origin-section-index',c=>{c.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.push('jurisdiction_scope');}],
 ['reordered-origin-section-index',c=>{const a=c.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds;a.pop();a.unshift('jurisdiction_scope');}],
 ['origin-in-other-section',c=>{c.groupedParticipantSections.find(s=>s.id!=='court_and_case_number').factIds.push('jurisdiction_scope');}],
 ['origin-rendered',c=>{c.renderQuestions.push('jurisdiction_scope');}],
 ['origin-marked-known',c=>{c.knownFacts.jurisdiction_scope='State or local';}],
 ['origin-derived',c=>{c.derivedFacts.jurisdiction_scope='State or local';}],
 ['origin-unresolved-index',c=>{c.unresolvedRequiredFacts.push('jurisdiction_scope');}],
 ['unaccepted-stage-fact',c=>{c.facts.unshift({factId:'mn_sentence_discharge_date',source:'mn_protected_source_stage_fact'});}],
 ['unrelated-byte-drift',c=>{c.knownFacts.unrelated_fact='forged';}]
];
const mn2SiblingPredecessors=siblings=>{
 const compared={...siblings};
 for(const routeId of Object.keys(mn2AcceptedAppends)){
  const originPredecessor=restoreExactMnOriginPredecessor(siblings[routeId],routeId);
  compared[routeId]=assertMn2PredecessorHash(originPredecessor,routeId);
  for(const[name,mutate]of mnOriginSuccessorMutations){const changed=structuredClone(siblings[routeId]);mutate(changed);assert.notDeepEqual(changed,siblings[routeId],name+' must actually mutate original vector');assert.throws(()=>assertMnOriginSuccessorPredecessorHash(changed,routeId),undefined,name+' must refuse');check('MN-origin-successor-refuses-'+routeId+'-'+name,true,true);}
  const corruptions=[
   ['wrong-new-source',c=>{c.facts.at(-1).source='forged';}],
   ['wrong-new-active',c=>{c.facts.at(-1).active=!c.facts.at(-1).active;}],
   ['omitted-new-fact',c=>{c.facts.pop();}],
   ['duplicated-new-fact',c=>{c.facts.push(structuredClone(c.facts.at(-1)));}],
   ['wrong-new-placement',c=>{[c.facts[c.facts.length-1],c.facts[c.facts.length-2]]=[c.facts[c.facts.length-2],c.facts[c.facts.length-1]];}],
   ['omitted-render-index',c=>{c.renderQuestions.pop();}],
   ['extra-render-index',c=>{c.renderQuestions.push('unrelated-extra');}],
   ['omitted-section-index',c=>{c.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.pop();}],
   ['extra-section-index',c=>{c.groupedParticipantSections.find(s=>s.id==='court_and_case_number').factIds.push('unrelated-extra');}],
   ['unrelated-known-drift',c=>{c.knownFacts.unrelated_fact='forged';}],
   ['unresolved-origin-changed',c=>{c.unresolvedRequiredFacts.push('unrelated-extra');}]
  ];
  if(routeId.includes('prosecutor-agreed'))corruptions.push(['inactive-city-rendered',c=>{c.renderQuestions.push('mn_prosecuting_city');}]);
  for(const[name,mutate]of corruptions){const changed=structuredClone(originPredecessor);mutate(changed);assert.notDeepEqual(changed,originPredecessor,name+' must actually mutate original vector');assert.throws(()=>assertMn2PredecessorHash(changed,routeId),undefined,name+' must refuse');check('MN2-successor-refuses-'+routeId+'-'+name,true,true);}
 }
 return compared;
};

const checks=[],rows=[],check=(name,actual,expected)=>checks.push({name,pass:isDeepStrictEqual(actual,expected),actual,expected});
// Exact retained original /routes/139/scenarios/B. This is an intentional
// negative, not a qualifying cannabis record or route projection.
// Original archive SHA3173bbec9a9cd51ef2abd6cd05e68c1830585d833cd45157dbb7f31fe3dedcc1.
const original={"ownership_scope":"Yes","jurisdiction_scope":"State or local","case_outcome":"Arrest or citation with no charge filed","offense_level":"Misdemeanor","possible_pathway_context":"Cannabis automatic or board-reviewed expungement under §§ 609A.055–.06","identity_error":"Yes","pending_cases":"No","resolved_timing_bucket":"gt_10_years","court_requirements_completed":"yes"};
// Direct collection calls reproduce the original exact source-consumer contract.
// They do not claim an offered current owner model or select a route by label.
for(const [variant,value]of [['known','Earlier Minnesota location'],['absent',undefined],['unknown','I am not sure']]){
 const answers={...original},savedAnswers=value===undefined?{}:{residency_or_location:value};
 const before=structuredClone({answers,savedAnswers}),resolution=P.packetCollectionFor({jurisdiction:'MN',pathwayId:route,requiredInputIds:plan.requiredInputIds,serverFacts:{jurisdiction:'MN',pathway_id:route},screeningAnswers:answers,prefilledAnswers:{},savedAnswers});
 assert(resolution);const fact=resolution.facts.find(f=>f.factId==='residency_or_location');assert(fact);
 check(variant+'/raw-answers-unchanged',{answers,savedAnswers},before);
 check(variant+'/plan-retained',packetPlanForPathway(profile,route),plan);
 check(variant+'/null-spec',packetSpecificationFor('MN:'+route),undefined);
 check(variant+'/inactive-location',fact.active===false,!baseline);
 if(!baseline)check(variant+'/source-owned-context',fact.source,'mn_cannabis_location_retained_context');
 // Preserve the observed original outcome; a route change must fail this test.
 // No requested-route override or qualifying-case inference is used.
 const authoritative=evaluate({jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:'synthetic-mn-location',answers});
 check(variant+'/original-held-review',authoritative.evaluation.resultCode,'needs_review');check(variant+'/original-exact-route',authoritative.evaluation.pathwayId,route);check(variant+'/original-payment-closed',authoritative.evaluation.paymentAllowed,false);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{commercialFlowVersion:1},capturedAt:'2026-10-16T00:00:00Z'});
 if(value!==undefined){
  seed.snapshot.packetAnswers.residency_or_location=value;
  seed.snapshot.dependencies.semanticAnswerHistory=[{factId:'residency_or_location',value,source:'packetAnswers',meaning:'prior_answer_for_shape_clarification',routeKey:'MN:'+route,profileVersion:seed.snapshot.profileVersion,profileSourceFingerprint:seed.snapshot.profileSourceFingerprint,profileAuthorityFingerprint:seed.snapshot.profileAuthorityFingerprint}];
 }
 const record={status:'unverified',reason:'source-synthetic-not-authenticated-owner',revision:0,draftHash:P.protectedPacketDraftHash(seed.snapshot),draftSnapshot:seed.snapshot};
 const recordBefore=structuredClone(record),model=P.protectedPacketInformationModelFor(record);
 check(variant+'/read-preserves-raw-history',record,recordBefore);
 check(variant+'/no-actor-intake-invented',model.questions.some(q=>['cannabisOffenceLevel','felonyCannabis','convictionDate','recordStillAppears'].includes(q.id)),false);check(variant+'/no-held-editor-invented',[...P.heldPacketCorrectionInputIds(model,model.resultCode)],[]);
 check(variant+'/no-saved-location-actor-alias',['court','cannabisOffenceLevel','felonyCannabis','convictionDate','recordStillAppears'].some(id=>Object.hasOwn(model.initialAnswers,id)),false);
 check(variant+'/actual-protected-model-exact-route',model?.pathwayId,route);
 if(!baseline){
  const question=model.questions.find(q=>q.id==='residency_or_location');check(variant+'/offered-current-location-optional',question?.required,false);check(variant+'/offered-current-location-context',question?.contextOnly,true);check(variant+'/offered-current-no-location-gate',model.missingInputIds.includes('residency_or_location'),false);check(variant+'/offered-current-no-location-builder',model.builderQuestions.some(q=>q.id==='residency_or_location'),false);
 }
 rows.push({variant,answers,savedAnswers,fact,resolution,authoritative,record,actualModel:model,exactRouteModelOffered:model?.pathwayId===route});
}
const siblings=Object.fromEntries(profile.pathways.filter(p=>p.id!==route).map(p=>[p.id,P.packetCollectionFor({jurisdiction:'MN',pathwayId:p.id,requiredInputIds:packetPlanForPathway(profile,p.id)?.requiredInputIds??[],serverFacts:{jurisdiction:'MN',pathway_id:p.id},screeningAnswers:original,prefilledAnswers:{},savedAnswers:{}})]));
if(!baseline){
 check('exact-five-sibling-identities',Object.keys(siblings),Object.keys(frozenBefore.siblings));
 const comparedSiblings=mn2SiblingPredecessors(siblings);
 for(const [id,expected]of Object.entries(frozenBefore.siblings))check('independent-frozen-sibling-'+id,comparisonHash(comparedSiblings[id]),expected);
 check('independent-frozen-source-plan',comparisonHash(plan),frozenBefore.plan);
 for(const row of rows)check(row.variant+'/independent-frozen-court',comparisonHash(row.resolution.facts.find(f=>f.factId==='court')),frozenBefore.court[row.variant]);
 const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/MN.memo.json','utf8'));
 for(const id of ['mn_auto_cannabis_nonfelony','mn_ceb_felony_cannabis']){
  const sourceTrack=memo.tracks.find(t=>t.trackId===id);
  check(id+'/source-no-participant-filing',sourceTrack.rules.filing,'There is no participant filing on this track.');
  check(id+'/source-no-venue',sourceTrack.geography.venue,'No venue. There is no participant filing on this track.');
  check(id+'/source-no-location-input',sourceTrack.participantInputs.some(i=>['residency_or_location','county','court'].includes(i.key)),false);
 }
 check('merged-review-posture-preserved',Object.fromEntries(['automatic','filingRequired','routeType'].map(k=>[k,profile.pathways.find(p=>p.id===route)[k]])),{automatic:false,filingRequired:false,routeType:'review'});
 check('merged-referral-authority-preserved',profile.pathways.find(p=>p.id===route).legalAuthority.outcomeMode,'referral');
 check('merged-custom-mapping-preserved',plan.formMappingStatus,'custom_or_manual_mapping_required');
 check('source-referral-hold-preserved',rows.every(row=>row.authoritative.evaluation.reasons.some(r=>r.code==='mn.legal_authority_referral_required')),true);
 // Optional author comparison retains complete independent raw equality.
 if(process.env.RCAP_MN_CANNABIS_LOCATION_BASELINE){
  const before=JSON.parse(fs.readFileSync(process.env.RCAP_MN_CANNABIS_LOCATION_BASELINE,'utf8'));assert(before.mode==='baseline');check('all-five-sibling-collections-raw-equal',comparedSiblings,before.siblings);check('source-plan-byte-meaning-unchanged',plan,before.plan);
  for(const [index,row]of rows.entries())check(row.variant+'/independent-court-consumer-unchanged',row.resolution.facts.find(f=>f.factId==='court'),before.rows[index].resolution.facts.find(f=>f.factId==='court'));
 }
 const H=await load('src/lib/expungement-ai/mn-cannabis-location-context.ts');check('exact-source-guard',H.mnCannabisLocationIsContext(profile,route,null),true);
 for(const [name,p,r,s,current]of [['wrong-state',{...profile,jurisdiction:{...profile.jurisdiction,code:'MO'}},route,null,{}],['profile-drift',{...profile,profileVersion:'changed'},route,null,{}],['source-drift',{...profile,source:{...profile.source,sourceCorpusSha256:'0'.repeat(64)}},route,null,{}],['route',profile,profile.pathways[0].id,null,{}],['specification',profile,route,{},{}],['memo',profile,route,null,{memo:{}}],['proof',profile,route,null,{proof:{}}],['family',profile,route,null,{family:{}}]])check('guard-denies-'+name,H.mnCannabisLocationIsContext(p,r,s,current),false);
 const q={id:'residency_or_location',stage:'packet_information',prompt:'What city or location belongs with this matter?',type:'text_or_unknown',options:null,required:true,contextOnly:false,lifecyclePhase:'postpay_packet_field'};
 check('descriptor-exact-only',H.mnCannabisLocationContextQuestion(q,profile,route,null),{...q,required:false,contextOnly:true,lifecyclePhase:'guidance_only'});
 for(const sibling of profile.pathways.filter(p=>p.id!==route))check('sibling-descriptor-unchanged-'+sibling.id,H.mnCannabisLocationContextQuestion(q,profile,sibling.id,null),q);
 for(const changed of [{...q,id:'court'},{...q,prompt:'Which filing county?'},{...q,type:'single_choice'}])check('different-purpose-unchanged-'+changed.id+'-'+changed.type,H.mnCannabisLocationContextQuestion(changed,profile,route,null),changed);
 for(const override of [{needsHumanClassification:['residency_or_location']},{classes:{residency_or_location:'render_required'}}]){
  const result=resolvePacketCollection({jurisdiction:'MN',pathwayId:route,requiredInputIds:['residency_or_location'],serverFacts:{},screeningAnswers:{},prefilledAnswers:{},savedAnswers:{},questionById:new Map([[q.id,q]]),specification:null,override});check('explicit-other-requirement-preserved-'+JSON.stringify(override),result.facts[0].source==='mn_cannabis_location_retained_context',false);
 }
}
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
let stored,sourceAnswers,owner='synthetic-mn-owner';const item={id:'synthetic-mn-cannabis-location',jurisdiction:'MN',artifactRefs:{}};
const present=()=>decorate({consumerAuthUserId:'synthetic-mn-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'MN',profileVersion:profile.profileVersion,matterId:item.id,answers:sourceAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-16T00:00:00Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__mnLocationTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-mn-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__mnLocationTransport.'+b+'(...args);').join('\n'));};
const pageFile=file('src/app/briefcase/[packetId]/packet-information/page.tsx');let pageSource=fs.readFileSync(pageFile,'utf8');pageSource=pageSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');pageSource=pageSource.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])pageSource=substitute(pageSource,[b],'@/lib/expungement-ai/'+m);compile(pageFile,pageSource);const Edit=(await import(pathToFileURL(pageFile).href)).default;
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let apiSource=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])apiSource=substitute(apiSource,b,m);compile(apiFile,apiSource);const API=await import(pathToFileURL(apiFile).href);
const context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information',post=(answers,extra={})=>API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const surfaces=[];
for(const row of rows){
 stored=structuredClone(row.record);sourceAnswers=row.answers;const before=structuredClone(stored),get=await API.GET(new Request(url),context),body=await get.json();check(row.variant+'/actual-GET200',get.status,200);
 check(row.variant+'/GET-current-builder-IDs',body.questions?.map(q=>q.id),row.actualModel.builderQuestions.map(q=>q.id));
 const tree=await Edit({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({})}),builders=nodes(tree).filter(n=>n.type?.name==='PacketInformationBuilder'),builderIds=builders.flatMap(n=>n.props.questions.map(q=>q.id));
 check(row.variant+'/no-page-builder-on-this-held-nonfiling-route',builderIds,[]);
 const pages=[];for(const locale of ['en','es']){const markup=html(tree,locale);check(row.variant+'/'+locale+'/no-offered-location-control',markup.includes('data-packet-question="residency_or_location"')||markup.includes('value="residency_or_location"'),false);pages.push({locale,markup});}
 surfaces.push({variant:row.variant,getStatus:get.status,body,builderIds,pages});check(row.variant+'/GET-keeps-exact-record',stored,before);
 const response=await post({}),receipt=await response.json();check(row.variant+'/actual-noop-status',response.status,200);check(row.variant+'/actual-strict-noop-receipt',isPacketSaveReceipt(receipt),true);check(row.variant+'/noop-raw-history-unchanged',stored,before);check(row.variant+'/no-verification-authority',receipt.readyToGenerate,false);for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/commerce-'+key,receipt.commercialActions?.[key],false);
 const wrongBefore=structuredClone(stored);owner='wrong-owner';const wrong=await post({});owner='synthetic-mn-owner';check(row.variant+'/wrong-owner-denied',wrong.status,404);check(row.variant+'/wrong-owner-atomic',stored,wrongBefore);
 const model=P.protectedPacketInformationModelFor(stored);check(row.variant+'/resume-stays-unsafe',model.reviewSafety.safe,false);check(row.variant+'/resume-preserves-raw-history',stored,before);
 {
  // Existing handler permits explicit optional-context persistence. Absence
  // from the ordinary held page does not make its historical raw field immutable.
  const change=await post({residency_or_location:'Explicit saved context'}),receipt=await change.json();
  check(row.variant+'/explicit-context-save200',change.status,200);check(row.variant+'/explicit-context-strict-receipt',isPacketSaveReceipt(receipt),true);
  check(row.variant+'/explicit-context-raw',stored.draftSnapshot.packetAnswers.residency_or_location,'Explicit saved context');
  check(row.variant+'/explicit-context-screening-unchanged',stored.draftSnapshot.screeningAnswers,before.draftSnapshot.screeningAnswers);
  check(row.variant+'/explicit-context-history-preserved',stored.draftSnapshot.dependencies.semanticAnswerHistory,before.draftSnapshot.dependencies.semanticAnswerHistory);
  check(row.variant+'/explicit-context-payment-closed',stored.draftSnapshot.paymentAllowed,false);check(row.variant+'/explicit-context-no-readiness',receipt.readyToGenerate,false);
  for(const key of ['fulfillmentAvailable','checkoutAllowed','generationAllowed'])check(row.variant+'/explicit-context-commerce-'+key,receipt.commercialActions?.[key],false);
  const changed=structuredClone(stored),again=await post({});check(row.variant+'/post-change-noop200',again.status,200);check(row.variant+'/post-change-noop-preserves-record',stored,changed);
  const reentry=await API.GET(new Request(url),context);check(row.variant+'/post-change-reentry200',reentry.status,200);check(row.variant+'/post-change-reentry-keeps-record',stored,changed);
  const foreign=await post({unowned_foreign_fact:'value'});check(row.variant+'/unknown-foreign-field-denied',foreign.status,422);
  const stale=await API.POST(new Request(url,{method:'POST',body:JSON.stringify({expectedRevision:0,answers:{}})}),context);check(row.variant+'/stale-CAS-denied',stale.status,409);
  const malformed=await API.POST(new Request(url,{method:'POST',body:'{'}),context);check(row.variant+'/malformed-denied',malformed.status,400);check(row.variant+'/denials-atomic',stored,changed);

 }
}

const result={surfaces,mode:baseline?'baseline':'after',originalMember:'GA14 / Q-ba282e26d07f75ee6899',plan,rows,siblings,checks,remainingAcceptance:['Actual held page offers no builder on this nonfiling route; protected GET model applicability is measured without opening a new owner workflow.','No authenticated owner, DB/browser, qualification, court-purpose or sibling closure claim.'],failed:checks.filter(c=>!c.pass)};
if(receiptPath)fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({checks:checks.length,failed:result.failed.map(c=>c.name),exactRouteModels:rows.filter(r=>r.exactRouteModelOffered).length,acceptanceComplete:false}));assert.equal(result.failed.length,0);
