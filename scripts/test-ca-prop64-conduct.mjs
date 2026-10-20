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
for (const [grams, status] of [['3.9999999999999999','satisfied'],['4','satisfied'],['04.0000','satisfied'],['4.0000000000000001','review']]) {
 const input={...transfer,ca_prop64_transfer_conduct:'personal_transport',ca_prop64_cross_border:'import',ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:grams};
 const result=decision('exact interstate concentrate '+grams,input,status,'satisfied'===status?'misdemeanor':undefined);
 if(status==='review')check('interstate exception needs review, not an automatic denial',result.code,'cross_border_exception');
 decision('saved decimal wrapper '+grams,{...input,ca_prop64_concentrate_grams:{value:grams,unknown:false}},status);
 decision('unknown decimal '+grams,{...input,ca_prop64_concentrate_grams:{value:grams,unknown:true}},'missing');
}
for (const [grams,classification] of [['7.9999999999999999','no_offense'],['8.0000','no_offense'],['8.0000000000000001','misdemeanor']])
 decision('exact ordinary concentrate '+grams,{...base,ca_prop64_substance:'concentrate',ca_prop64_concentrate_grams:grams},'satisfied',classification);
for (const [grams,status] of [['28.4999999999999999','satisfied'],['28.5000','satisfied'],['28.5000000000000001','review']]) {
 const result=decision('exact interstate flower '+grams,{...transfer,ca_prop64_cross_border:'import',ca_prop64_flower_grams:grams},status,status==='satisfied'?'misdemeanor':undefined);
 if(status==='review')check('flower interstate exception',result.code,'cross_border_exception');
}
decision('nonzero decimal cannot underflow into a zero-quantity conflict',{...base,ca_prop64_flower_grams:'0.'+'0'.repeat(324)+'1'},'satisfied','no_offense');
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
decision('unsafe plant count',{...cultivation,ca_prop64_plant_count:Number.MAX_SAFE_INTEGER+1},'missing');
decision('unsafe residence count',{...cultivation,ca_prop64_residence_total:Number.MAX_SAFE_INTEGER+1},'review');
decision('unsafe prior count',{...sale,ca_prop64_same_section_priors:Number.MAX_SAFE_INTEGER+1},'missing');
decision('juvenile needs its forms',{...base,ca_prop64_age_at_offense:17,ca_prop64_court_type:'juvenile'},'review');
for(const prior of ['reduced','dismissed','dismissed_sealed'])decision('prior relief '+prior,{...base,ca_prop64_existing_relief:prior,ca_prop64_additional_benefit:'sealing'},'review');
for(const a of [base,cultivation,sale,transfer])for(const q of F.CA_PROP64_FACT_QUESTIONS){check('EN/ES '+q.id,Boolean(q.prompt&&q.translations?.es?.prompt),true);if(Array.isArray(q.options))for(const o of q.options)check('option EN/ES '+q.id+o,Boolean(q.optionDisplay?.[o]?.label&&q.optionDisplay?.[o]?.translations?.es?.label),true);check('conditional '+q.id,F.caProp64QuestionApplies(a,q.id),F.caProp64ActiveFactIds(a).includes(q.id));}
console.log(JSON.stringify({status:rows.every(r=>r.pass)?'PASS':'FAIL',checks:rows.length,failures:rows.filter(r=>!r.pass),rows},null,2));
assert.ok(rows.every(r=>r.pass),'California conduct expectations failed');
