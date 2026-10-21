import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const F = await import('../src/lib/rcap-engine/california-prop64-facts.ts');
const rows = [];
const base = { case_outcome: 'Felony conviction', offense_level: 'Felony', charge: 'HSC 11357', ca_prop64_next_step: 'apply', ca_prop64_branch: 'currently-serving petition', ca_prop64_offense_date: '2000-01-01', ca_prop64_age_at_offense: 21, ca_prop64_court_type: 'adult', ca_prop64_existing_relief: 'none', ca_prop64_substance: 'flower', ca_prop64_flower_grams: 28.5, ca_prop64_possession_context: 'ordinary' };
const priors = { ca_prop64_prior_superstrike: 'No', ca_prop64_prior_290c: 'No', ca_prop64_same_section_priors: 0 };
const cultivation = { ...base, ...priors, charge: 'HSC 11358', ca_prop64_plant_count: 6, ca_prop64_residence_total: 6, ca_prop64_private_residence: 'Yes', ca_prop64_locked: 'Yes', ca_prop64_public_visible: 'No', ca_prop64_local_violation: 'No', ca_prop64_environmental_record: 'No' };
const sale = { ...base, ...priors, charge: 'HSC 11359', ca_prop64_knowing_minor_transaction: 'No', ca_prop64_used_young_person: 'No' };
const transfer = { ...base, ...priors, charge: 'HSC 11360', ca_prop64_knowing_minor_transaction: 'No', ca_prop64_transfer_conduct: 'unpaid_gift', ca_prop64_cross_border: 'none', ca_prop64_recipient_age: 21 };
const check = (name, actual, expected) => rows.push({ name, actual, expected, pass: JSON.stringify(actual) === JSON.stringify(expected) });
function decision(name, answers, status, classification) { const before = JSON.stringify(answers); const r = F.caProp64Facts(answers, '2026-10-12'); check(name, r.status, status); if (classification) check(name+' classification', r.classification, classification); check(name+' preserves raw', JSON.stringify(answers), before); return r; }
// Expected boundaries come from HSC11357–11360 and11362.1, not evaluator output.
for (const [age, grams, c] of [[17,28.5,'infraction'],[18,28.5,'infraction'],[20,28.5,'infraction'],[21,28.5,'no_offense'],[21,28.5001,'misdemeanor']]) decision(`flower age${age} grams${grams}`,{...base,ca_prop64_age_at_offense:age,ca_prop64_flower_grams:grams},'satisfied',c);
for (const [grams,c] of [[7.999,'no_offense'],[8,'no_offense'],[8.001,'misdemeanor']]) decision('concentrate'+grams,{...base,ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:grams},'satisfied',c);
for (const bad of [undefined,'unknown',-1,Infinity,'28.5 grams',{},[]]) decision('invalid grams '+JSON.stringify(bad),{...base,ca_prop64_flower_grams:bad},'missing');
for (const bad of ['2000-02-30','2030-01-01','0000-01-01','unknown']) decision('invalid date '+bad,{...base,ca_prop64_offense_date:bad},'missing');
for (const date of ['2016-11-09','2016-11-10']) decision('later conduct '+date,{...base,ca_prop64_offense_date:date},'review');
decision('last preact day',{...base,ca_prop64_offense_date:'2016-11-08'},'satisfied');
decision('later conviction of old conduct',{...base,conviction_date:'2018-01-01'},'satisfied');
for (const c of [cultivation,{...cultivation,ca_prop64_plant_count:7,ca_prop64_residence_total:7},{...cultivation,ca_prop64_age_at_offense:20},{...cultivation,ca_prop64_locked:'No'}]) decision('cultivation '+JSON.stringify(c),c,'satisfied',c.ca_prop64_plant_count>6?'misdemeanor':c.ca_prop64_age_at_offense<21||c.ca_prop64_locked==='No'?'infraction':'no_offense');
decision('minor cultivation 100 plants',{...cultivation,ca_prop64_plant_count:100,ca_prop64_age_at_offense:17},'satisfied','infraction');
decision('adult sale',sale,'satisfied','misdemeanor');
decision('minor sale',{...sale,ca_prop64_age_at_offense:17},'satisfied','infraction');
decision('adult gift',transfer,'satisfied','no_offense');
decision('adult sale is not lawful',{...transfer,ca_prop64_transfer_conduct:'sale'},'satisfied','misdemeanor');
decision('gift to20',{...transfer,ca_prop64_recipient_age:20},'satisfied','infraction');
for (const fact of ['ca_prop64_prior_superstrike','ca_prop64_prior_290c']) { decision('possession not globally barred '+fact,{...base,[fact]:'Yes'},'satisfied','no_offense'); decision('large cultivation exception '+fact,{...cultivation,ca_prop64_plant_count:7,[fact]:'Yes'},'review'); decision('sales exception '+fact,{...sale,[fact]:'Yes'},'review'); }
for (const n of [0,1,2]) decision('prior subsection count '+n,{...sale,ca_prop64_same_section_priors:n},n===2?'review':'satisfied');
decision('environmental large grow',{...cultivation,ca_prop64_plant_count:7,ca_prop64_environmental_record:'Yes'},'review');
decision('young worker adult seller',{...sale,ca_prop64_used_young_person:'Yes'},'review');
decision('young worker under21 seller',{...sale,ca_prop64_age_at_offense:20,ca_prop64_used_young_person:'Yes'},'satisfied','misdemeanor');
decision('crossborder above4 concentrate',{...transfer,ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:4.001},'review');
// CA-L02 / GA-19: decimal text must stay on its own side of the adopted 4/8/28.5-gram limits.
for (const [grams, status] of [['3.9999999999999999','satisfied'],['4','satisfied'],['04.0000','satisfied'],['4.0000000000000001','review'],['05','review']]) {
 const input={...transfer,ca_prop64_transfer_conduct:'personal_transport',ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:grams};
 const result=decision('exact interstate concentrate '+grams,input,status,'satisfied'===status?'misdemeanor':undefined);
 if(status==='review')check('interstate exception needs review, not an automatic denial',result.code,'cross_border_exception');
 decision('saved decimal wrapper '+grams,{...input,ca_prop64_concentrate_grams:{value:grams,unknown:false}},status);
 decision('unknown decimal '+grams,{...input,ca_prop64_concentrate_grams:{value:grams,unknown:true}},'missing');
}
for (const [grams,classification] of [['7.9999999999999999','no_offense'],['8.0000','no_offense'],['8.0000000000000001','misdemeanor']])
 decision('exact ordinary concentrate '+grams,{...base,ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:grams},'satisfied',classification);
for (const [grams,status] of [['28.4999999999999999','satisfied'],['28.5000','satisfied'],['28.5000000000000001','review'],['028.6','review']]) {
 const result=decision('exact interstate flower '+grams,{...transfer,ca_prop64_cross_border:'import',ca_prop64_flower_grams:grams},status,status==='satisfied'?'misdemeanor':undefined);
 if(status==='review')check('flower interstate exception',result.code,'cross_border_exception');
}
decision('nonzero decimal cannot underflow into a zero-quantity conflict',{...base,ca_prop64_flower_grams:'0.'+'0'.repeat(324)+'1'},'satisfied','no_offense');
// CA-L05 / GA-19: distinguish acts and places without assigning an exception from a saved combined answer.
const detail={...base,ca_prop64_possession_context:'public_or_vehicle_use',ca_prop64_possession_act:'possession_only',ca_prop64_possession_place:'public_place'};
decision('public possession alone',detail,'satisfied','no_offense');
decision('public possession under21',{...detail,ca_prop64_age_at_offense:20},'satisfied','infraction');
decision('public possession over limit',{...detail,ca_prop64_flower_grams:28.6},'satisfied','misdemeanor');
decision('completed public possession',{...detail,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:'dismissal/sealing'},'satisfied','no_offense');
const smoking={...detail,ca_prop64_possession_act:'smoking',ca_prop64_school_distance:'outside_1000',ca_prop64_use_authorization:'none'};
const vehicle={...detail,ca_prop64_possession_place:'vehicle',ca_prop64_vehicle_container:'open',ca_prop64_use_authorization:'none'};
for(const [name,patch] of [
 ['public smoking',smoking],['public ingestion',{...detail,ca_prop64_possession_act:'ingestion',ca_prop64_use_authorization:'none'}],
 ['school smoking children',{...smoking,ca_prop64_school_distance:'within_1000',ca_prop64_children_present:'Yes'}],
 ['school smoking no children',{...smoking,ca_prop64_school_distance:'within_1000',ca_prop64_children_present:'No'}],
 ['private medical exception not inferred',{...smoking,ca_prop64_possession_place:'private_residence',ca_prop64_use_authorization:'medical'}],
 ['licensed exception not inferred',{...smoking,ca_prop64_use_authorization:'licensed_location'}],
 ['open container',vehicle],['sealed container historical review',{...vehicle,ca_prop64_vehicle_container:'sealed'}],
 ['driver consumption',{...vehicle,ca_prop64_possession_act:'ingestion',ca_prop64_vehicle_role:'operator'}],
 ['passenger consumption',{...vehicle,ca_prop64_possession_act:'ingestion',ca_prop64_vehicle_role:'passenger'}],
 ...['k12_school','daycare','youth_center'].map(place=>[place,{...detail,ca_prop64_possession_place:place,ca_prop64_children_present:'Yes',ca_prop64_use_authorization:'none'}]),
 ['custody',{...detail,ca_prop64_possession_place:'correctional'}],['other act',{...detail,ca_prop64_possession_act:'other'}],['other place',{...detail,ca_prop64_possession_place:'other'}]
]){const r=decision('distinct '+name,patch,'review');check('distinct '+name+' reason',r.code,'restricted_conduct');check('distinct '+name+' review facts',r.ids,['ca_prop64_possession_context','ca_prop64_possession_act','ca_prop64_possession_place']);}
for(const [name,input,ids] of [
 ['saved combined answer',{...base,ca_prop64_possession_context:'public_or_vehicle_use'},['ca_prop64_possession_act','ca_prop64_possession_place']],
 ['unknown act',{...detail,ca_prop64_possession_act:{value:'possession_only',unknown:true}},['ca_prop64_possession_act']],
 ['unknown place',{...detail,ca_prop64_possession_place:'unknown'},['ca_prop64_possession_place']],
 ['smoking distance',{...smoking,ca_prop64_school_distance:undefined},['ca_prop64_school_distance']],
 ['nearby children',{...smoking,ca_prop64_school_distance:'within_1000',ca_prop64_children_present:'unknown'},['ca_prop64_children_present']],
 ['container',{...vehicle,ca_prop64_vehicle_container:'unknown'},['ca_prop64_vehicle_container']],
 ['passenger or driver',{...vehicle,ca_prop64_possession_act:'ingestion'},['ca_prop64_vehicle_role']],
 ['authorization',{...smoking,ca_prop64_use_authorization:'unknown'},['ca_prop64_use_authorization']]
])check(name+' exact missing facts',decision(name,input,'missing').ids,ids);
// GA-19 / CA-L05 / review Q1: possession alone still needs the applicable place facts.
for(const [name,input,id]of [
 ['vehicle authorization',vehicle,'ca_prop64_use_authorization'],
 ...['k12_school','daycare','youth_center'].map(place=>[place+' children',{...detail,ca_prop64_possession_place:place,ca_prop64_children_present:'Yes',ca_prop64_use_authorization:'none'},'ca_prop64_children_present'])
])for(const value of [undefined,'unknown',{value:input[id],unknown:true}]){
 const saved=JSON.parse(JSON.stringify({...input,[id]:value}));
 check(name+' remains visible',F.caProp64QuestionApplies(saved,id),true);
 check(name+' saved uncertainty '+JSON.stringify(value),decision(name,saved,'missing').ids,[id]);
}
for(const [id,value]of [['ca_prop64_concentrate_grams','05'],['ca_prop64_flower_grams','028.6']]){
 const input={...transfer,ca_prop64_transfer_conduct:'personal_transport',ca_prop64_cross_border:'import',ca_prop64_substance:id==='ca_prop64_concentrate_grams'?'concentrate':'flower',[id]:{value,unknown:false}};
 check('leading-zero saved quantity '+value,decision(value,JSON.parse(JSON.stringify(input)),'review').code,'cross_border_exception');
 decision('leading-zero unknown quantity '+value,{...input,[id]:{value,unknown:true}},'missing');
}
const wrapped=Object.fromEntries(Object.entries(detail).map(([id,value])=>[id,{value,unknown:false}]));decision('wrapped public possession',wrapped,'satisfied','no_offense');
for(const [input,hidden] of [[detail,['ca_prop64_school_distance','ca_prop64_children_present','ca_prop64_vehicle_container','ca_prop64_vehicle_role','ca_prop64_use_authorization']],[smoking,['ca_prop64_children_present','ca_prop64_vehicle_container','ca_prop64_vehicle_role']],[vehicle,['ca_prop64_school_distance','ca_prop64_children_present','ca_prop64_vehicle_role']]])
 for(const id of hidden)check('irrelevant detail stays hidden '+id,F.caProp64QuestionApplies(input,id),false);
const stale={...detail,ca_prop64_vehicle_role:'operator',ca_prop64_children_present:'Yes',ca_prop64_use_authorization:'medical'};
decision('hidden saved facts do not rewrite public possession',stale,'satisfied','no_offense');
// CA-L01 / GA-19, adopted v3 section4: original Prop64 benefit survives the AB133 dispute.
const historicalConcentrate={...base,ca_prop64_age_at_offense:20,ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:8};
for(const age of [18,19,20])for(const grams of ["4.0000000000000001",4.0001,7.9999,8]){
 const input={...historicalConcentrate,ca_prop64_age_at_offense:age,ca_prop64_concentrate_grams:grams};
 decision('original misdemeanor benefit '+age+'/'+grams,input,'satisfied','misdemeanor');
 decision('completed original benefit '+age+'/'+grams,{...input,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:'redesignation'},'satisfied','misdemeanor');
 decision('no unsupported dismissal '+age+'/'+grams,{...input,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:'dismissal/sealing'},'review');
 const alreadyReduced={...input,case_outcome:'Misdemeanor conviction',offense_level:'Misdemeanor'};
 check('no automatic AB133 infraction '+age+'/'+grams,decision('already misdemeanor',alreadyReduced,'review').code,'concentrate_amendment');
 const infraction={...input,case_outcome:'Infraction conviction',offense_level:'Infraction'};
 check('Q1 Infraction does not establish felony benefit '+age+'/'+grams,decision('already infraction',infraction,'review').code,'concentrate_amendment');
 check('Q1 saved Infraction stays held '+age+'/'+grams,decision('saved infraction',JSON.parse(JSON.stringify(infraction)),'review').ids,['ca_prop64_concentrate_grams']);
}
// CA-L01 §4(b): relevant-time finality and actual later orders change the additional review, never the original benefit.
const additionalInfraction={...historicalConcentrate,ca_prop64_additional_infraction_request:'Yes',ca_prop64_judgment_finality_2017:'final',ca_prop64_later_sentence_order:'none',ca_prop64_pending_appeal:'No'};
const proceduralCases=[
 ['final',{},'concentrate_final_judgment'],
 ['nonfinal-at-amendment',{ca_prop64_judgment_finality_2017:'nonfinal'},'concentrate_nonfinal_judgment'],
 ['valid-reopening',{ca_prop64_later_sentence_order:'vacated_or_recalled'},'concentrate_reopened_judgment'],
 ['limited-proceeding',{ca_prop64_later_sentence_order:'limited_proceeding'},'concentrate_limited_proceeding'],
 ['unknown-finality',{ca_prop64_judgment_finality_2017:'unknown'},'concentrate_procedure_unknown'],
 ['unknown-order',{ca_prop64_later_sentence_order:{value:'vacated_or_recalled',unknown:true}},'concentrate_procedure_unknown'],
 ['pending-appeal',{ca_prop64_pending_appeal:'Yes'},'concentrate_final_judgment']
];
for(const [name,patch,code]of proceduralCases){
 const answers={...additionalInfraction,...patch};
 const procedure=F.caProp64ConcentrateProcedure(answers);
 check(name+' actual procedural review',procedure?.code,code);
 check(name+' pending appeal is distinct from finality in2017',procedure?.pendingAppeal,patch.ca_prop64_pending_appeal==='Yes');
 for(const id of ['ca_prop64_additional_infraction_request','ca_prop64_judgment_finality_2017','ca_prop64_later_sentence_order','ca_prop64_pending_appeal'])check(name+' fact remains available '+id,F.caProp64QuestionApplies(answers,id),true);
 decision(name+' supported original benefit',answers,'satisfied','misdemeanor');
 decision(name+' completed original benefit',{...answers,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:'redesignation'},'satisfied','misdemeanor');
 const misdemeanor={...answers,offense_level:'Misdemeanor',case_outcome:'Misdemeanor conviction'};
 check(name+' no automatic additional entitlement',decision(name+' existing misdemeanor',misdemeanor,'review').code,code);
 check(name+' saved request and procedure retained',F.caProp64ConcentrateProcedure(JSON.parse(JSON.stringify(answers))),procedure);
}
for(const value of [undefined,'No','unknown',{value:'Yes',unknown:true}]){
 const answers={...additionalInfraction,ca_prop64_additional_infraction_request:value};
 decision('optional extra request cannot withdraw original '+JSON.stringify(value),answers,'satisfied','misdemeanor');
 check('no inferred additional election '+JSON.stringify(value),F.caProp64ConcentrateProcedure(answers),null);
 check('unrequested procedure hidden '+JSON.stringify(value),F.caProp64QuestionApplies(answers,'ca_prop64_judgment_finality_2017'),false);
}
for(const patch of [{ca_prop64_concentrate_grams:4},{ca_prop64_concentrate_grams:'8.0000000000000001'},{ca_prop64_age_at_offense:21},{ca_prop64_offense_date:'2016-11-09'},{ca_prop64_substance:'flower'},{ca_prop64_possession_context:'school_children'},{ca_prop64_existing_relief:'reduced'}]){
 const answers={...additionalInfraction,...patch};
 check('outside adopted amendment scenario '+JSON.stringify(patch),F.caProp64ConcentrateProcedure(answers),null);
 check('outside scenario hides request '+JSON.stringify(patch),F.caProp64QuestionApplies(answers,'ca_prop64_additional_infraction_request'),false);
}
decision('exactly4 remains original infraction',{...historicalConcentrate,ca_prop64_concentrate_grams:4},'satisfied','infraction');
decision('adult21 exactly8 lawful',{...historicalConcentrate,ca_prop64_age_at_offense:21},'satisfied','no_offense');
decision('under18 retains own rule',{...historicalConcentrate,ca_prop64_age_at_offense:17},'satisfied','infraction');
decision('postinitiative conduct not historical branch',{...historicalConcentrate,ca_prop64_offense_date:'2016-11-09'},'review');
for(const [id,value]of [['ca_prop64_age_at_offense','unknown'],['ca_prop64_concentrate_grams',{value:8,unknown:true}]])decision('uncertainty does not establish reduction '+id,{...historicalConcentrate,[id]:value},'missing');
check('conflicting conviction levels not promoted',decision('conflicting conviction',{...historicalConcentrate,case_outcome:'Misdemeanor conviction'},'review').code,'record_conflict');
for(const currentAge of [21,50])decision('age at conduct, not current age '+currentAge,{...historicalConcentrate,age:currentAge},'satisfied','misdemeanor');
for (const a of [base,sale]) { const cls=a===base?'no_offense':'misdemeanor'; const remedy=a===base?'dismissal/sealing':'redesignation'; decision('completed '+cls,{...a,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:remedy},'satisfied',cls); decision('wrong remedy '+cls,{...a,ca_prop64_branch:'completed-sentence application',ca_prop64_relief_requested:remedy==='redesignation'?'dismissal/sealing':'redesignation'},'review'); }
for(const value of ['Yes','No','unknown',undefined])decision('legacy is not evidence '+value,{...base,ca_prop64_qualifying_marijuana_offense:value,ca_prop64_lesser_or_no_offense:value},'satisfied');
decision('legacy only never opens',{ca_prop64_qualifying_marijuana_offense:'Yes',ca_prop64_lesser_or_no_offense:'Yes'},'missing');
decision('decimal sibling',{...base,charge:'HSC11357.5'},'review');
decision('multiple charges',{...base,charge:'HSC 11357 and 11359'},'review');
decision('citation conflict',{...base,ca_prop64_record_section:'11358'},'review');
for (const charge of ['HSC11357','HSC §11357(a)','H&S11357','Health and Safety Code 11357','California HSC11357']) decision('exact citation '+charge,{...base,charge},'satisfied');
for (const charge of ['11357','Case number 11357','Not HSC11357','Cannabis conviction']) decision('prose needs explicit section '+charge,{...base,charge},'missing');
for (const charge of ['PC11357','Penal Code §11357','HSC11357 and PC459','HSC11357 and 11359']) decision('different or multiple laws '+charge,{...base,charge,ca_prop64_record_section:'11357'},'review');
decision('explicit section with generic prose',{...base,charge:'Cannabis conviction',ca_prop64_record_section:'11357'},'satisfied');
// CA-L05 controlling cases concern separate Penal Code convictions: Boatwright/accessory,
// Medina/conspiracy, and Supreme Court Raybon (2021)/prison possession. No case-date eligibility cutoff.
for(const [caseName,charge]of [['Boatwright','PC 32'],['Medina','Penal Code § 182(a)(1)'],['Raybon (2021)','California PC 4573.6(a)']]){
 for(const conviction_date of ['2000-01-01','2018-01-01','2019-01-01','2021-01-01']){
  const input={...base,charge,conviction_date};check(caseName+' final statute preserved '+conviction_date,F.caProp64Section(input),'other');
  check(caseName+' separate review '+conviction_date,decision(caseName,input,'review'),{status:'review',code:'different_statute',ids:['ca_prop64_record_section']});
 }
 for(const explicit of ['other','unknown'])check(caseName+' consistent answer '+explicit,F.caProp64Facts({...base,charge,ca_prop64_record_section:explicit},'2026-10-12').code,'different_statute');
 check(caseName+' contradictory HSC answer remains conflict',F.caProp64Facts({...base,charge,ca_prop64_record_section:'11357'},'2026-10-12').code,'record_conflict');
 decision(caseName+' wrapped citation',{...base,charge:{value:charge,unknown:false}},'review');
}
for(const charge of ['PC 32 and HSC 11357','PC 182(a)(1) and HSC 11360'])check('mixed laws remain conflict '+charge,F.caProp64Facts({...base,charge},'2026-10-12').code,'record_conflict');
for(const charge of ['Case number 4573.6','Possibly PC 32','32'])decision('unconfirmed citation stays missing '+charge,{...base,charge},'missing');
decision('unsafe plant count',{...cultivation,ca_prop64_plant_count:Number.MAX_SAFE_INTEGER+1},'missing');
decision('unsafe residence count',{...cultivation,ca_prop64_residence_total:Number.MAX_SAFE_INTEGER+1},'review');
decision('unsafe prior count',{...sale,ca_prop64_same_section_priors:Number.MAX_SAFE_INTEGER+1},'missing');
decision('juvenile needs its forms',{...base,ca_prop64_age_at_offense:17,ca_prop64_court_type:'juvenile'},'review');
for(const prior of ['reduced','dismissed','dismissed_sealed'])decision('prior relief '+prior,{...base,ca_prop64_existing_relief:prior,ca_prop64_additional_benefit:'sealing'},'review');
for(const a of [base,cultivation,sale,transfer])for(const q of F.CA_PROP64_FACT_QUESTIONS){check('EN/ES '+q.id,Boolean(q.prompt&&q.translations?.es?.prompt),true);if(Array.isArray(q.options))for(const o of q.options)check('option EN/ES '+q.id+o,Boolean(q.optionDisplay?.[o]?.label&&q.optionDisplay?.[o]?.translations?.es?.label),true);check('conditional '+q.id,F.caProp64QuestionApplies(a,q.id),F.caProp64ActiveFactIds(a).includes(q.id));}
// GA-19 / CA-L02 / O43: adopted CA-02 conduct contract, including saved wrappers.
const saleChoice=F.CA_PROP64_FACT_QUESTIONS.find(q=>q.id==='ca_prop64_transfer_conduct').optionDisplay.sale;
check('CA-02 explicit attempt choice EN/ES',[saleChoice.label,saleChoice.translations.es.label],['Sale, offer or attempt to sell','Venta, oferta o intento de venta']);
for(const [name,patch,status,classification]of [
 ['adult-unpaid-gift',{},'satisfied','no_offense'],
 ['personal-transport',{ca_prop64_transfer_conduct:'personal_transport'},'satisfied','no_offense'],
 ['actual-sale-not-lawful',{ca_prop64_transfer_conduct:'sale'},'satisfied','misdemeanor'],
 ['transport-for-sale-no-completed-sale',{ca_prop64_transfer_conduct:'transport_for_sale'},'satisfied','infraction'],
 ['gift-recipient20',{ca_prop64_recipient_age:20},'satisfied','infraction'],
 ['recipient-uncertain',{ca_prop64_recipient_age:'unknown'},'missing'],
 ['conduct-uncertain',{ca_prop64_transfer_conduct:'unknown'},'missing'],
 ['disputed-or-mixed-conduct',{ca_prop64_transfer_conduct:'other'},'review'],
 ['import-at-flower-limit',{ca_prop64_cross_border:'import'},'satisfied','misdemeanor'],
 ['import-above-flower-limit',{ca_prop64_cross_border:'import',ca_prop64_flower_grams:'28.5000000000000001'},'review'],
 ['export-for-sale-at-flower-limit',{ca_prop64_cross_border:'export_for_sale',ca_prop64_transfer_conduct:'transport_for_sale'},'satisfied','infraction'],
 ['export-contrary-personal-transport',{ca_prop64_cross_border:'export_for_sale',ca_prop64_transfer_conduct:'personal_transport'},'review'],
 ['import-at-concentrate-limit',{ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:4},'satisfied','misdemeanor'],
 ['import-above-concentrate-limit',{ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:'4.0000000000000001'},'review'],
 ['export-at-concentrate-limit',{ca_prop64_cross_border:'export_for_sale',ca_prop64_transfer_conduct:'transport_for_sale',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:4},'satisfied','misdemeanor'],
 ['export-above-concentrate-limit',{ca_prop64_cross_border:'export_for_sale',ca_prop64_transfer_conduct:'transport_for_sale',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:'4.0000000000000001'},'review'],
 ['ordinary-concentrate-gift-at8',{ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:8},'satisfied','no_offense'],
 ['concentrate-gift-recipient20',{ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:8,ca_prop64_recipient_age:20},'satisfied','misdemeanor'],
 ['concentrate-transport-for-sale',{ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:4,ca_prop64_transfer_conduct:'transport_for_sale'},'satisfied','misdemeanor'],
 ['sale-qualifying-prior',{ca_prop64_transfer_conduct:'sale',ca_prop64_prior_superstrike:'Yes'},'review'],
 ['sale-registration-prior',{ca_prop64_transfer_conduct:'sale',ca_prop64_prior_290c:'Yes'},'review'],
 ['sale-two-exact-subsection-priors',{ca_prop64_transfer_conduct:'sale',ca_prop64_same_section_priors:2},'review'],
 ['sale-knowing-minor',{ca_prop64_transfer_conduct:'sale',ca_prop64_knowing_minor_transaction:'Yes'},'review'],
 ['sale-minor-knowledge-unknown',{ca_prop64_transfer_conduct:'sale',ca_prop64_knowing_minor_transaction:'unknown'},'missing'],
 ['offense-date-version',{ca_prop64_offense_date:'2016-11-09'},'review']
])for(const wrapped of [false,true]){
 const raw={...transfer,...patch};
 const answers=wrapped?Object.fromEntries(Object.entries(raw).map(([id,value])=>[id,{value,unknown:false}])):raw;
 decision('CA-02 '+name+' saved='+wrapped,answers,status,classification);
}
console.log(JSON.stringify({status:rows.every(r=>r.pass)?'PASS':'FAIL',checks:rows.length,failures:rows.filter(r=>!r.pass),rows},null,2));
assert.ok(rows.every(r=>r.pass),'California conduct expectations failed');
