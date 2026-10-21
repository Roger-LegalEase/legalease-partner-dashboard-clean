import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const file='src/components/expungement-ai/LocalizationProvider.tsx';
const source=ts.transpileModule(fs.readFileSync(file,'utf8')+'\nexport { LocalizationContext };',{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);} ')}`,{data:{url:pathToFileURL(`${process.cwd()}/${file}`).href,source}});
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const F=await import('../src/lib/rcap-engine/california-prop64-facts.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeResumedAnswersForQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const {POST}=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const {resolveRuntimeText,t}=await import('../src/lib/expungement-ai/localization.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {ScreeningResult}=await import('../src/components/expungement-ai/screening/ScreeningResult.tsx');
const {LocalizationContext}=await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const profile=getProfileByJurisdiction('CA'),pub=projectPublicProfile(profile),checks=[],scenarios=[],renders=[];
function check(name,actual,expected){checks.push({name,actual,expected,pass:JSON.stringify(actual)===JSON.stringify(expected)});}
const facts={charge:'HSC11357',ca_prop64_next_step:'apply',ca_prop64_offense_date:'2000-01-01',ca_prop64_age_at_offense:21,ca_prop64_court_type:'adult',ca_prop64_existing_relief:'none',ca_prop64_substance:'flower',ca_prop64_flower_grams:28.5,ca_prop64_possession_context:'ordinary'};

// Exact returned two-entry Spanish candidates; final qualified language review
// remains pending. English and current source/decision meanings stay unchanged.
const exactCaResultPairs=[{"id":"CA-PROP64-cross_border_conduct","copy":"reason","key":"cross_border_conduct","en":"Review the exact import or export conduct before treating it as lawful possession or a lesser offense.","es":"Revise la conducta exacta de importación o exportación antes de tratarla como posesión legal o un delito de menor gravedad."},{"id":"CA-PROP64-current","copy":"procedure","key":"current","en":"For a sentence still being served, including probation, parole, PRCS or mandatory supervision, the court presumes eligibility unless the opposing party proves otherwise by clear and convincing evidence. The court may deny relief for an unreasonable risk of danger to public safety. These are court decisions, not facts you must certify.","es":"Para una sentencia que aún se cumple, incluidas la libertad a prueba (probation), la libertad condicional (parole), supervisión comunitaria posterior a la liberación (PRCS) o supervisión obligatoria, el tribunal presume la elegibilidad salvo prueba clara y convincente en contrario de la parte opositora. El tribunal puede denegar la reparación por un riesgo irrazonable de peligro para la seguridad pública. Son decisiones judiciales, no hechos que usted deba certificar."}];
const resultCatalog=JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/reviewed-result-display-copy.json'));
for(const pair of exactCaResultPairs){
 const sourcePair=(pair.copy==='reason'?F.CA_PROP64_REASON_COPY:F.CA_PROP64_PROCEDURE_COPY)[pair.key];
 check(pair.id+' exact direct source EN/ES',sourcePair,[pair.en,pair.es]);
 check(pair.id+' actual reviewed consumer',reviewedResultText(pair.en),{en:pair.en,es:pair.es});
 for(const locale of ['en','es'])check(pair.id+' actual runtime consumer '+locale,resolveRuntimeText(locale,pair.en),pair[locale]);
 const matches=resultCatalog.entries.filter(entry=>entry.id===pair.id);
 check(pair.id+' unique unchanged identity/English/review status',matches.map(({id,originalEnglish,en,reviewStatus})=>({id,originalEnglish,en,reviewStatus})),[{id:pair.id,originalEnglish:pair.en,en:pair.en,reviewStatus:'SOURCE_BACKED_DRAFT_INDEPENDENT_LANGUAGE_REVIEW_PENDING'}]);
}
// Reuse the existing conduct test's literal 11360 unpaid-gift facts with the
// retained cross-border 'other' review branch, keeping both procedure branches.
const crossBorderReviewFacts={...facts,charge:'HSC11360',ca_prop64_transfer_conduct:'unpaid_gift',ca_prop64_cross_border:'other',ca_prop64_recipient_age:21,ca_prop64_prior_superstrike:'No',ca_prop64_prior_290c:'No',ca_prop64_same_section_priors:0,ca_prop64_knowing_minor_transaction:'No'};
// CA-L02: retain the precise saved quantity through the actual public and protected consumers.
const crossBorderPrecisionFacts={...crossBorderReviewFacts,ca_prop64_transfer_conduct:'personal_transport',ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:'4.0000000000000001'};
// CA-L05: a saved broad context is not a substitute for distinct conduct/location facts.
const publicPossession={...facts,ca_prop64_possession_context:'public_or_vehicle_use',ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'};
const publicSmoking={...publicPossession,ca_prop64_possession_act:'smoking',ca_prop64_school_distance:'outside_1000',ca_prop64_use_authorization:'none'};
const vehicleUse={...publicPossession,ca_prop64_possession_act:'ingestion',ca_prop64_possession_place:'vehicle',ca_prop64_vehicle_container:'open',ca_prop64_vehicle_role:'operator',ca_prop64_use_authorization:'none'};
const originalConcentrateBenefit={...facts,ca_prop64_age_at_offense:20,ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:8,ca_prop64_relief_requested:'redesignation'};
const evaluateAnswers=answers=>evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-conduct',answers});
for(const name of ['currently-serving','completed']){
 const fixture=JSON.parse(fs.readFileSync(new URL(`./fixtures/ca-prop64-protected-baseline/${name}.json`,import.meta.url)));
 const base=fixture.answers,positive={...base,...facts};
 const target=name==='completed'?'packet_ready':'packet_ready_with_caution';
 const held=evaluateAnswers(base).evaluation;
 check(name+' legacy baseline now held',held.resultCode,'needs_more_info');check(name+' no missing facts payment',held.paymentAllowed,false);
 const legacy=P.caProp64ClarificationModelFor(fixture.record);check(name+' genuine old protected snapshot recoverable',Boolean(legacy),true);
 const wrong=structuredClone(fixture.record);wrong.draftHash='0'.repeat(64);check(name+' invalid source hash denied',P.caProp64ClarificationModelFor(wrong),null);
 const newAnswers={...facts,ca_prop64_record_section:'11357'};
 // New conditional children are collected in successive saves; a hidden child
 // cannot be injected through a different question's correction request.
 let record=fixture.record,iterations=0;
 while(iterations++<8){const m=P.caProp64ClarificationModelFor(record);if(!m)break;const delta=Object.fromEntries(Object.entries(newAnswers).filter(([id,v])=>m.requiredInputIds.includes(id)&&JSON.stringify(m.initialAnswers[id])!==JSON.stringify(v)));if(!Object.keys(delta).length)break;const patch=P.caProp64ClarificationPatch({protectedVerification:record,answers:delta});check(name+' protected factual save '+iterations,Boolean(patch),true);if(!patch)break;record=patch.protectedTransition.nextVerification;}
 const recovered=P.protectedPacketInformationModelFor(record);check(name+' corrected legacy model',Boolean(recovered?.packetPlan),true);check(name+' correction invalidates',record.status,'invalidated');
 for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])check(name+' raw legal conclusion retained '+map,record.draftSnapshot[map].ca_prop64_lesser_or_no_offense,fixture.record.draftSnapshot[map].ca_prop64_lesser_or_no_offense);
 if(recovered){for(const id of F.caProp64ActiveFactIds(positive))check(name+' correction owned '+id,P.editablePacketInputIds(recovered).has(id),true);check(name+' old conclusion no packet requirement',recovered.requiredInputIds.some(id=>F.CA_PROP64_LEGACY_IDS.includes(id)),false);}
 for(const menu of [undefined,'Skip',...profile.pathways.map(p=>p.label)]){const a={...positive,possible_pathway_context:menu};const r=evaluateAnswers(a).evaluation;check(name+' menu invariant '+menu,{result:r.resultCode,route:r.pathwayId},{result:target,route:fixture.pathwayId});}
 for(const apply of ['apply',{value:'apply',unknown:false}])for(const branch of [undefined,'unknown',{value:'unknown',unknown:false}])for(const menu of [undefined,'Skip',...profile.pathways.map(p=>p.label)]){const a={...positive,ca_prop64_next_step:apply,ca_prop64_branch:branch,possible_pathway_context:menu};const r=evaluateAnswers(a).evaluation;const label=name+' unconfirmed branch '+JSON.stringify([apply,branch,menu]);check(label+' held',{result:r.resultCode,branchMissing:r.missingQuestionIds.includes('ca_prop64_branch'),payment:r.paymentAllowed},{result:'needs_more_info',branchMissing:true,payment:false});check(label+' reachable',selectScreeningQuestionIds(profile,pub,a).includes('ca_prop64_branch'),true);}
 for(const [id,value]of [['ca_prop64_qualifying_marijuana_offense','No'],['ca_prop64_lesser_or_no_offense','unknown'],['pending_cases','Yes'],['financial_obligations','No'],['new_convictions_during_waiting_period','Yes'],['state_exclusion_categories',['Sex offense or registration']]]){const a={...positive,[id]:value};check(name+' no imported blanket bar '+id,evaluateAnswers(a).evaluation.resultCode,target);}
 const selected=selectScreeningQuestionIds(profile,pub,positive);for(const id of F.CA_PROP64_LEGACY_IDS)check(name+' legal conclusion not asked '+id,selected.includes(id),false);
 for(const id of F.caProp64ActiveFactIds(positive))check(name+' active fact asked '+id,selected.includes(id),true);
 const hidden={...positive,ca_prop64_plant_count:22,ca_prop64_prior_superstrike:'Yes'};const resumed=sanitizeResumedAnswersForQuestionIds(pub,hidden,selected);for(const id of ['ca_prop64_plant_count','ca_prop64_prior_superstrike',...F.CA_PROP64_LEGACY_IDS])check(name+' hidden raw retained '+id,resumed[id],hidden[id]);
 // GA-20 Q-a2f30c256094d4c00932 / Q-aefb997be1fc93fd1a5d: the two 11361.8 mechanisms use conduct facts, not a pre-route exclusion taxonomy.
 const categories=['None of these','I am not sure','Violent offense','Sex offense or registration','Firearm or weapons','Other named excluded offense'];
 const invalidCategoryValues=[['Domestic violence'],['DUI/DWI or serious traffic'],['None of these','Firearm or weapons']];
 for(const raw of invalidCategoryValues){
  const invalidAnswers={...positive,state_exclusion_categories:raw};
  assert.throws(()=>evaluateAnswers(invalidAnswers),/Unknown question ids: state_exclusion_categories/);
  const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-handler',answers:invalidAnswers})}));
  check(name+' invalid fresh category refused '+JSON.stringify(raw),[response.status,(await response.json()).invalidQuestionIds],[400,['state_exclusion_categories']]);
  for(const patch of [facts,{...facts,ca_prop64_substance:'unknown'},{...facts,ca_prop64_record_section:'11358'}]){
   const a={...base,...patch},authoritative=evaluateAnswers(a),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:a,dependencies:{},capturedAt:'2026-10-20T00:00:00Z'});assert(seed);
   for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers']){
    const snapshot=structuredClone(seed.snapshot);snapshot[map].state_exclusion_categories=raw;
    const saved={status:'unverified',revision:0,draftHash:P.protectedPacketDraftHash(snapshot),draftSnapshot:snapshot},before=structuredClone(saved);
    const actual=P.evaluateProtectedPacketFacts(snapshot,undefined,'synthetic-ca-conduct');assert(actual);
    check(name+'/'+map+' readback of unsupported category does not replace actual facts '+JSON.stringify([raw,patch]),actual.evaluation,authoritative.evaluation);
    check(name+'/'+map+' unsupported raw maps retained during readback '+JSON.stringify([raw,patch]),saved,before);
   }
  }
 }
 const transferFacts={...crossBorderReviewFacts,ca_prop64_cross_border:'none'};
 const conductCases=[
  ['gift',{},target,'dismissal/sealing'],
  ['personal-transport',{ca_prop64_transfer_conduct:'personal_transport'},target,'dismissal/sealing'],
  ['sale-offer-attempt',{ca_prop64_transfer_conduct:'sale'},target,'redesignation'],
  ['transport-for-sale-without-sale',{ca_prop64_transfer_conduct:'transport_for_sale'},target,'redesignation'],
  ['recipient-unknown',{ca_prop64_recipient_age:{value:21,unknown:true}},'needs_more_info','dismissal/sealing'],
  ['disputed-conduct',{ca_prop64_transfer_conduct:'other'},'needs_review','dismissal/sealing'],
  ['import-exact-four',{ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:'4.0000'},target,'redesignation'],
  ['export-above-four',{ca_prop64_cross_border:'export_for_sale',ca_prop64_transfer_conduct:'transport_for_sale',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:{value:'4.0000000000000001',unknown:false}},'needs_review','redesignation'],
  ['sale-qualifying-prior',{ca_prop64_transfer_conduct:'sale',ca_prop64_prior_superstrike:'Yes'},'needs_review','redesignation']
 ].map(([label,patch,expected,remedy])=>['ca-l02-'+label,{...transferFacts,...patch,ca_prop64_relief_requested:remedy},expected]);
 const categoryCases=categories.flatMap(category=>[
  ['ga20-supported/'+category,{...facts,state_exclusion_categories:[category]},target],
  ['ga20-uncertain/'+category,{...facts,ca_prop64_substance:'unknown',state_exclusion_categories:[category]},'needs_more_info'],
  ['ga20-conflicting/'+category,{...facts,ca_prop64_record_section:'11358',state_exclusion_categories:[category]},'needs_review']
 ]);
 for(const [label,patch,expected]of [['legacy',{},'needs_more_info'],['positive',facts,target],['zero',{...facts,ca_prop64_flower_grams:0},'needs_review'],['juvenile',{...facts,ca_prop64_court_type:'juvenile'},'needs_review'],['oldrelief',{...facts,ca_prop64_existing_relief:'dismissed',ca_prop64_additional_benefit:'sealing'},'needs_review'],['school',{...facts,ca_prop64_possession_context:'school_children'},name==='completed'?'needs_review':target],['cross-border-other',crossBorderReviewFacts,'needs_review'],['original-concentrate-benefit',originalConcentrateBenefit,target],['concentrate-already-misdemeanor',{...originalConcentrateBenefit,case_outcome:'Misdemeanor conviction',offense_level:'Misdemeanor'},'needs_review'],['cross-border-above-four',crossBorderPrecisionFacts,'needs_review'],['leading-zero-concentrate',{...crossBorderPrecisionFacts,ca_prop64_concentrate_grams:'05'},'needs_review'],['leading-zero-flower',{...crossBorderPrecisionFacts,ca_prop64_substance:'flower',ca_prop64_flower_grams:{value:'028.6',unknown:false}},'needs_review'],['concentrate-already-infraction',{...originalConcentrateBenefit,case_outcome:'Infraction conviction',offense_level:'Infraction'},'needs_review'],['missing-detail-vehicle-possession-authorization',{...vehicleUse,ca_prop64_possession_act:'possession_only',ca_prop64_use_authorization:undefined},'needs_more_info'],...['k12_school','daycare','youth_center'].map(place=>['missing-detail-'+place+'-children',{...publicPossession,ca_prop64_possession_place:place,ca_prop64_children_present:{value:'Yes',unknown:true},ca_prop64_use_authorization:'none'},'needs_more_info']),['public-possession',publicPossession,target],['public-smoking',publicSmoking,'needs_review'],['vehicle-driver',vehicleUse,'needs_review'],['vehicle-passenger',{...vehicleUse,ca_prop64_vehicle_role:'passenger'},'needs_review'],['legacy-combined',{...facts,ca_prop64_possession_context:'public_or_vehicle_use'},'needs_more_info'],['unknown-act',{...publicPossession,ca_prop64_possession_act:'unknown'},'needs_more_info'],['near-school',{...publicSmoking,ca_prop64_school_distance:'within_1000',ca_prop64_children_present:'Yes'},'needs_review'],['missing-detail-distance',{...publicSmoking,ca_prop64_school_distance:undefined},'needs_more_info'],['missing-detail-children',{...publicSmoking,ca_prop64_school_distance:'within_1000'},'needs_more_info'],['missing-detail-container',{...vehicleUse,ca_prop64_vehicle_container:undefined},'needs_more_info'],['missing-detail-role',{...vehicleUse,ca_prop64_vehicle_role:undefined},'needs_more_info'],['missing-detail-authorization',{...publicSmoking,ca_prop64_use_authorization:undefined},'needs_more_info'],...['PC 32','Penal Code § 182(a)(1)','California PC 4573.6(a)'].map(charge=>['penal-code-'+charge,{...facts,charge},'needs_review']),...categoryCases,...conductCases]){
  const answers={...base,...patch},rawBefore=structuredClone(answers),evaluation=evaluateAnswers(answers).evaluation;scenarios.push({name,label,answers,evaluation});check(name+'/'+label,evaluation.resultCode,expected);
  if(label.startsWith('ca-l02-')){
   const selected=selectScreeningQuestionIds(profile,pub,answers),resumed=sanitizeResumedAnswersForQuestionIds(pub,answers,selected);
   for(const id of ['ca_prop64_transfer_conduct','ca_prop64_recipient_age','ca_prop64_cross_border','ca_prop64_concentrate_grams','ca_prop64_prior_superstrike'])check(name+'/'+label+' saved fact '+id,resumed[id],answers[id]);
   check(name+'/'+label+' conduct question visible',selected.includes('ca_prop64_transfer_conduct'),true);
   const authoritative=evaluateAnswers(answers),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-21T01:00:00Z'});assert(seed);
   const saved={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(saved);
   const noop=P.packetInformationPatch({protectedVerification:saved,answers:{}});assert(noop);
   check(name+'/'+label+' protected no-op preserves source maps',noop.protectedTransition.nextVerification,before);
   check(name+'/'+label+' review or uncertainty remains unpaid',evaluation.paymentAllowed,expected===target);
   if(label==='ca-l02-sale-offer-attempt'){
    const correction=P.packetInformationPatch({protectedVerification:saved,answers:{ca_prop64_transfer_conduct:'unpaid_gift',ca_prop64_relief_requested:'dismissal/sealing'}});assert(correction);
    const next=correction.protectedTransition.nextVerification;
    check(name+'/'+label+' correction preserves exact original conduct in history',next.draftSnapshot.dependencies.semanticAnswerHistory?.some(entry=>entry.factId==='ca_prop64_transfer_conduct'&&entry.source==='screeningAnswers'&&entry.value==='sale'),true);
    check(name+'/'+label+' stale conduct cannot shadow correction',next.draftSnapshot.screeningAnswers.ca_prop64_transfer_conduct,undefined);
    check(name+'/'+label+' original saved snapshot remains unchanged',saved,before);
    check(name+'/'+label+' correction explicitly saves gift',next.draftSnapshot.packetAnswers.ca_prop64_transfer_conduct,'unpaid_gift');
    check(name+'/'+label+' correction cannot verify by itself',[next.status,correction.readyToGenerate],['unverified',false]);
   }
   check(name+'/'+label+' source answers unchanged',answers,rawBefore);
  }
  if(label.startsWith('ga20-')){
   const withoutCategory={...answers};delete withoutCategory.state_exclusion_categories;
   check(name+'/'+label+' factual result and sources invariant',evaluation,evaluateAnswers(withoutCategory).evaluation);
   const authoritative=evaluateAnswers(answers),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-20T00:00:00Z'});assert(seed);
   const saved={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(saved);
   const noop=P.packetInformationPatch({protectedVerification:saved,answers:{}});assert(noop);
   check(name+'/'+label+' original category and all saved facts preserved',noop.protectedTransition.nextVerification,before);
   check(name+'/'+label+' evaluation does not rewrite raw category',answers,rawBefore);
  }
  // GA-19 Q1: fixed expected facts, independent of the active-fact implementation.
  if(label==='missing-detail-vehicle-possession-authorization')check(name+'/'+label+' exact missing fact',F.caProp64Facts(answers,'2026-10-12').ids,['ca_prop64_use_authorization']);
  if(['missing-detail-k12_school-children','missing-detail-daycare-children','missing-detail-youth_center-children'].includes(label))check(name+'/'+label+' exact missing fact',F.caProp64Facts(answers,'2026-10-12').ids,['ca_prop64_children_present']);
  if(['public-smoking','vehicle-driver','vehicle-passenger','near-school'].includes(label))check(name+'/'+label+' exact review facts',F.caProp64Facts(answers,'2026-10-12').ids,['ca_prop64_possession_context','ca_prop64_possession_act','ca_prop64_possession_place']);
  if(label==='cross-border-above-four'||label.startsWith('leading-zero-')){
   check(name+' exact interstate predicate',F.caProp64Facts(answers,'2026-10-12'),{status:'review',code:'cross_border_exception',ids:['ca_prop64_cross_border']});
   check(name+' precision review remains unpaid',evaluation.paymentAllowed,false);
   const authoritative=evaluateAnswers(answers),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-20T00:00:00Z'});
   assert(seed);const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(record);
   const patch=P.packetInformationPatch({protectedVerification:record,answers:{}});assert(patch);
   check(name+' exact decimal saved/no-op preservation',patch.protectedTransition.nextVerification,before);
   check(name+' precision input not rounded',answers,rawBefore);
  }
  if(['public-possession','public-smoking','vehicle-driver','vehicle-passenger','legacy-combined','unknown-act','near-school'].includes(label)||label.startsWith('missing-detail-')||label.startsWith('penal-code-')){
   const ids=selectScreeningQuestionIds(profile,pub,answers);
   for(const id of F.caProp64ActiveFactIds(answers))check(name+'/'+label+' selected '+id,ids.includes(id),true);
   const authoritative=evaluateAnswers(answers),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-20T00:00:00Z'});assert(seed);
   const saved={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(saved);
   const noop=P.packetInformationPatch({protectedVerification:saved,answers:{}});assert(noop);
   check(name+'/'+label+' protected no-op preserves all maps',noop.protectedTransition.nextVerification,before);
   check(name+'/'+label+' raw input unchanged',answers,rawBefore);
   if(expected!==target)check(name+'/'+label+' no payment from restricted or incomplete facts',evaluation.paymentAllowed,false);
   if(label.startsWith('penal-code-'))check(name+'/'+label+' actual final statute review',F.caProp64Facts(answers,'2026-10-12').code,'different_statute');
   if(label==='legacy-combined'){
    check(name+' combined answer cannot verify',P.caProp64ClarificationPatch({protectedVerification:saved,answers:{},verify:true}),null);
    check(name+' hidden vehicle child cannot be injected',P.caProp64ClarificationPatch({protectedVerification:saved,answers:{ca_prop64_vehicle_container:'sealed'}}),null);
    const corrected=P.caProp64ClarificationPatch({protectedVerification:saved,answers:{ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'}});assert(corrected);
    const next=corrected.protectedTransition.nextVerification;
    check(name+' clarified public possession gets existing route',P.protectedPacketInformationModelFor(next)?.pathwayId,fixture.pathwayId);
    check(name+' changed facts invalidate old verification',next.status,'invalidated');
    check(name+' combined raw context retained',next.draftSnapshot.screeningAnswers.ca_prop64_possession_context,'public_or_vehicle_use');
    check(name+' explicit conduct correction saved',next.draftSnapshot.packetAnswers.ca_prop64_possession_act,'possession_only');
   }
   if(label==='vehicle-driver'){
    const correction=P.caProp64ClarificationPatch({protectedVerification:saved,answers:{ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'}});assert(correction);
    const next=correction.protectedTransition.nextVerification,model=P.protectedPacketInformationModelFor(next);assert(model);
    check(name+' former vehicle facts retained',next.draftSnapshot.screeningAnswers.ca_prop64_vehicle_role,'operator');
    check(name+' former vehicle facts hidden after correction',model.questions.some(q=>q.id==='ca_prop64_vehicle_role'),false);
    const resumed=sanitizeResumedAnswersForQuestionIds(pub,{...answers,ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'},selectScreeningQuestionIds(profile,pub,{...answers,ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'}));
    check(name+' resume retains hidden vehicle fact',resumed.ca_prop64_vehicle_role,'operator');
   }
  }
  if(label==='original-concentrate-benefit'||label==='concentrate-already-misdemeanor'||label==='concentrate-already-infraction'){
   check(name+'/'+label+' factual classification',F.caProp64Facts(answers,'2026-10-12'),label==='original-concentrate-benefit'?{status:'satisfied',ids:[],classification:'misdemeanor'}:{status:'review',code:'concentrate_amendment',ids:['ca_prop64_concentrate_grams']});
   const authoritative=evaluateAnswers(answers),seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-20T00:00:00Z'});assert(seed);
   const saved={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},before=structuredClone(saved);
   const noop=P.packetInformationPatch({protectedVerification:saved,answers:{}});assert(noop);
   check(name+'/'+label+' saved no-op retains all original facts',noop.protectedTransition.nextVerification,before);
   check(name+'/'+label+' does not rewrite quantity or requested remedy',answers,rawBefore);
   if(label==='concentrate-already-misdemeanor'||label==='concentrate-already-infraction')check(name+' no automatic later-amendment payment',evaluation.paymentAllowed,false);
  }
  const exactPair=label==='cross-border-other'?exactCaResultPairs[0]:name==='currently-serving'&&label==='positive'?exactCaResultPairs[1]:null;
  if(exactPair){
   const generated=exactPair.copy==='reason'?evaluation.reasons.map(reason=>reason.text):evaluation.cautions;
   check(name+'/'+label+' natural unchanged English branch',generated.filter(text=>text===exactPair.en),[exactPair.en]);
   check(name+'/'+label+' raw answers unchanged',answers,rawBefore);
   check(name+'/'+label+' unchanged conduct decision',F.caProp64Facts(answers,'2026-10-12'),label==='cross-border-other'?{status:'review',code:'cross_border_conduct',ids:['ca_prop64_cross_border']}:{status:'satisfied',ids:[],classification:'no_offense'});
   if(label==='cross-border-other')check(name+'/'+label+' review remains unpaid',evaluation.paymentAllowed,false);
  }

  const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-handler',answers})}));const body=await response.json();check(name+'/'+label+' actual handler',[response.status,body.resultCode],[200,expected]);
  for(const locale of ['en','es']){const value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation,stateName:'California',questionPromptById:Object.fromEntries(pub.questions.map(q=>[q.id,q.prompt])),hasScreeningSession:false,onEditAnswers:()=>{},onPacketAction:()=>{}})));renders.push({name,label,locale,markup});if(exactPair){const exactRendered=renderToStaticMarkup(React.createElement('span',null,exactPair[locale])).slice(6,-7);check(name+'/'+label+'/'+locale+' exact literal generated copy rendered',markup.includes(exactRendered),true);} for(const id of evaluation.missingQuestionIds){const q=F.CA_PROP64_FACT_QUESTIONS.find(q=>q.id===id);if(q&&['ca_prop64_possession_act','ca_prop64_possession_place','ca_prop64_school_distance','ca_prop64_children_present','ca_prop64_vehicle_container','ca_prop64_vehicle_role','ca_prop64_use_authorization'].includes(id)){const expected=locale==='es'?q.translations.es.prompt:q.prompt;check(name+'/'+label+'/'+locale+' missing prompt '+id,markup.includes(renderToStaticMarkup(React.createElement('span',null,expected)).slice(6,-7)),true);}} for(const reason of evaluation.reasons.filter(r=>Object.values(F.CA_PROP64_REASON_COPY).some(([en])=>en===r.text))){const text=resolveRuntimeText(locale,reason.text);check(name+'/'+label+'/'+locale+' reason rendered',markup.includes(renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)),true);if(locale==='es')check(name+'/'+label+' Spanish reason',text!==reason.text,true);}}
 }
}
// Keep the real HTTP validation; substitute only authenticated storage transport.
let procedureRecord;
globalThis.__caProcedureTransport={
 getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:'synthetic-ca-owner'}),
 getBriefcaseItem:async()=>({id:'synthetic-ca-procedure',artifactRefs:{}}),
 readProtectedPacketVerification:async()=>({ok:true,value:procedureRecord}),
 persistProtectedPacketVerification:()=>{throw Error('invalid procedure request reached persistence');},
 decorateBriefcaseItemForPresentation:()=>{throw Error('invalid procedure request reached presentation');},
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('unexpected seed');},
 readTrustedBriefcasePresentationSource:()=>{throw Error('unexpected source');}
};
const procedureApiPath='src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';
let procedureApiSource=fs.readFileSync(procedureApiPath,'utf8');
for(const [bindings,module] of [
 [['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],
 [['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],
 [['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],
 [['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']
]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');
 assert(pattern.test(procedureApiSource),module);
 procedureApiSource=procedureApiSource.replace(pattern,bindings.map(binding=>'const '+binding+'=(...args:unknown[])=>(globalThis as any).__caProcedureTransport.'+binding+'(...args);').join('\n'));
}
const procedureApiUrl=pathToFileURL(`${process.cwd()}/${procedureApiPath}`).href;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);} ')}`,{data:{url:procedureApiUrl,source:ts.transpileModule(procedureApiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const procedureApi=await import(procedureApiUrl);
// CA-L01 §4(b): real consumers keep the independent original benefit and the separate additional request.
const procedureIds=['ca_prop64_additional_infraction_request','ca_prop64_judgment_finality_2017','ca_prop64_later_sentence_order','ca_prop64_pending_appeal'];
for(const name of ['currently-serving','completed'])for(const level of ['Felony','Misdemeanor'])for(const [label,patch,code]of [
 ['final',{},'concentrate_final_judgment'],
 ['nonfinal',{ca_prop64_judgment_finality_2017:'nonfinal'},'concentrate_nonfinal_judgment'],
 ['reopened',{ca_prop64_later_sentence_order:'vacated_or_recalled'},'concentrate_reopened_judgment'],
 ['limited',{ca_prop64_later_sentence_order:'limited_proceeding'},'concentrate_limited_proceeding'],
 ['unknown',{ca_prop64_judgment_finality_2017:{value:'nonfinal',unknown:true}},'concentrate_procedure_unknown'],
 ['pending-appeal',{ca_prop64_pending_appeal:'Yes'},'concentrate_final_judgment']
]){
 const fixture=JSON.parse(fs.readFileSync(new URL(`./fixtures/ca-prop64-protected-baseline/${name}.json`,import.meta.url)));
 const answers={...fixture.answers,...originalConcentrateBenefit,offense_level:level,case_outcome:level+' conviction',ca_prop64_additional_infraction_request:'Yes',ca_prop64_judgment_finality_2017:'final',ca_prop64_later_sentence_order:'none',ca_prop64_pending_appeal:'No',...patch};
 const before=structuredClone(answers),prefix=`CA-L01/${name}/${level}/${label}`,authoritative=evaluateAnswers(answers),evaluation=authoritative.evaluation;
 check(prefix+' original benefit or unpaid additional review',evaluation.resultCode,level==='Felony'?(name==='completed'?'packet_ready':'packet_ready_with_caution'):'needs_review');
 check(prefix+' no new payment entitlement',evaluation.paymentAllowed,level==='Felony');
 const display=[...evaluation.reasons.map(r=>r.text),...evaluation.cautions];
 check(prefix+' actual procedural disposition displayed',display.includes(F.CA_PROP64_REASON_COPY[code][0]),true);
 if(label==='pending-appeal')check(prefix+' petition mechanism not bypassed',display.includes(F.CA_PROP64_REASON_COPY.concentrate_pending_appeal[0]),true);
 const selected=selectScreeningQuestionIds(profile,pub,answers),resumed=sanitizeResumedAnswersForQuestionIds(pub,answers,selected);
 for(const id of procedureIds){check(prefix+' asked '+id,selected.includes(id),true);check(prefix+' literal resume '+id,resumed[id],answers[id]);}
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-21T01:00:00Z'});assert(seed);
 const saved={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot},savedBefore=structuredClone(saved),model=P.protectedPacketInformationModelFor(saved);assert(model);
 const noop=P.packetInformationPatch({protectedVerification:saved,answers:{}});assert(noop);
 check(prefix+' no-op preserves source maps',noop.protectedTransition.nextVerification,savedBefore);
 for(const id of procedureIds)check(prefix+' optional procedure is not a filing gate '+id,model.questions.find(q=>q.id===id)?.required,false);
 if(level==='Misdemeanor'){const clarification=P.caProp64ClarificationModelFor(saved);assert(clarification);for(const id of procedureIds){check(prefix+' recovery preserves optional '+id,clarification.questions.find(q=>q.id===id)?.required,false);check(prefix+' recovery required list excludes optional '+id,clarification.requiredInputIds.includes(id),false);check(prefix+' recovery missing list excludes optional '+id,clarification.missingInputIds.includes(id),false);}}
 const update=P.packetInformationPatch({protectedVerification:saved,answers:{ca_prop64_additional_infraction_request:'No'}});assert(update);
 const next=update.protectedTransition.nextVerification;
 check(prefix+' explicit request correction saved',next.draftSnapshot.packetAnswers.ca_prop64_additional_infraction_request,'No');
 check(prefix+' old request retained in history',next.draftSnapshot.dependencies.semanticAnswerHistory?.some(e=>e.factId==='ca_prop64_additional_infraction_request'&&e.value==='Yes'),true);
 check(prefix+' edited draft stays unverified',[next.status,next.revision,update.readyToGenerate],['unverified',saved.revision+1,false]);
 check(prefix+' hidden procedure facts retained',next.draftSnapshot.screeningAnswers.ca_prop64_judgment_finality_2017,answers.ca_prop64_judgment_finality_2017);
 const retainedEdit=P.packetInformationPatch({protectedVerification:next,answers:{ca_prop64_judgment_finality_2017:'nonfinal'}});assert(retainedEdit);
 const edited=retainedEdit.protectedTransition.nextVerification.draftSnapshot;
 check(prefix+' retained fact correction cannot reelect request',edited.packetAnswers.ca_prop64_additional_infraction_request,'No');
 check(prefix+' no additional procedure from retained facts',F.caProp64ConcentrateProcedure({...edited.screeningAnswers,...edited.prefilledAnswers,...edited.packetAnswers}),null);
 procedureRecord=saved;
 for(const [id,value] of [['ca_prop64_judgment_finality_2017','invented_finality'],['ca_prop64_unrecognized_fact','Yes']]){
  const denied=await procedureApi.POST(new Request('http://localhost/api/expungement-ai/briefcase/synthetic-ca-procedure/packet-information',{method:'POST',body:JSON.stringify({expectedRevision:saved.revision,answers:{[id]:value}})}),{params:Promise.resolve({itemId:'synthetic-ca-procedure'})});
  check(prefix+' HTTP refuses invalid fact '+id,[denied.status,await denied.json()],[422,{ok:false,error:'invalid_packet_answers',invalidFactIds:[id]}]);
  check(prefix+' rejection preserves saved answers '+id,procedureRecord,savedBefore);
 }
 const response=await POST(new Request('http://localhost/api/expungement-ai/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'synthetic-ca-finality',answers})})),body=await response.json();
 check(prefix+' public handler',[response.status,body.resultCode,body.paymentAllowed,body.reasons,body.cautions],[200,evaluation.resultCode,evaluation.paymentAllowed,evaluation.reasons,evaluation.cautions]);
 for(const locale of ['en','es']){
  const value={locale,setLocale:()=>{},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,options)=>resolveRuntimeText(locale,text,options)};
  const markup=renderToStaticMarkup(React.createElement(LocalizationContext.Provider,{value},React.createElement(ScreeningResult,{evaluation,stateName:'California',questionPromptById:Object.fromEntries(pub.questions.map(q=>[q.id,q.prompt])),hasScreeningSession:false,onEditAnswers:()=>{},onPacketAction:()=>{}})));
  for(const key of [code,...(label==='pending-appeal'?['concentrate_pending_appeal']:[])]){
   const text=F.CA_PROP64_REASON_COPY[key][locale==='es'?1:0];
   check(prefix+'/'+locale+' exact reviewed copy '+key,markup.includes(renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)),true);
  }
  renders.push({name:prefix,label,locale,markup});
 }
 check(prefix+' original answers unchanged',answers,before);scenarios.push({name:prefix,label,evaluation});
}
const failed=checks.filter(c=>!c.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,scenarios:scenarios.length,renders:renders.length,failed,details:checks,scenarioDetails:scenarios,renderDetails:renders,limits:['Pure protected transitions and real stateless handlers/SSR; not DB/browser/RLS acceptance or professional approval.']};
const out=process.argv[2];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,scenarios:scenarios.length,renders:renders.length,failed},null,2));assert.equal(failed.length,0);
