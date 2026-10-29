import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { evaluateMassachusettsAdultSealing: evaluate, MASSACHUSETTS_ADULT_SEALING_ROUTE: route, massachusettsAdultSealingQuestions: questions, massachusettsAdultSealingDocumentManifest: manifest } = await import('../src/lib/rcap-engine/massachusetts-adult-sealing-facts.ts');
const predecessorCases = JSON.parse(fs.readFileSync(new URL('./fixtures/ma-adult-sealing-extraction.json',import.meta.url),'utf8')).cases;
const facts = {ma_100a_whole_record_reviewed:true,ma_100a_all_record_classifications_confirmed:true,ma_100a_all_dispositions_description:'All Massachusetts entries: Boston Municipal Court20-CR-00102 misdemeanor conviction; latest court/disposition/custody end2023-10-29; no other Massachusetts entries.',ma_100a_latest_misdemeanor_event:'2023-10-29',ma_100a_latest_felony_event:'none',ma_100a_latest_sex_offense_completion:'none',ma_100a_excluded_firearms_or_public_integrity_record:false,ma_100a_recent_finding_three_years:false,ma_100a_recent_custody_three_years:false,ma_100a_recent_finding_seven_years:false,ma_100a_recent_custody_seven_years:false};
let count=0;
const test=(name,run)=>{run();count++;console.log('PASS '+name);};
const check=(name,patch,status,asOf='2026-10-29',eligibleOn)=>test(name,()=>{const input={...facts,...patch};const actual=evaluate(route,input,asOf);assert.equal(actual.status,status);if(eligibleOn)assert.equal(actual.eligibleOn,eligibleOn);assert.ok(actual.reasonEs && actual.reasonEs!==actual.reason);const previous=predecessorCases.find(row=>row.name===name);if(previous)assert.deepEqual(actual,previous.expected);});
check('3year inclusive anniversary',{},'qualifying','2026-10-29','2026-10-29');
check('day before misdemeanor anniversary',{},'not_yet','2026-10-28','2026-10-29');
check('7year felony inclusive anniversary',{ma_100a_latest_misdemeanor_event:'none',ma_100a_latest_felony_event:'2019-10-29'},'qualifying','2026-10-29','2026-10-29');
check('day before felony anniversary',{ma_100a_latest_misdemeanor_event:'none',ma_100a_latest_felony_event:'2019-10-29'},'not_yet','2026-10-28','2026-10-29');
check('sex15year plus national history',{ma_100a_latest_misdemeanor_event:'none',ma_100a_latest_felony_event:'2011-10-29',ma_100a_latest_sex_offense_completion:'2011-10-29',ma_100a_ever_sex_level_two_or_three:false,ma_100a_sex_registration_duty:false},'qualifying','2026-10-29','2026-10-29');
check('sex15year day before',{ma_100a_latest_misdemeanor_event:'none',ma_100a_latest_felony_event:'2011-10-29',ma_100a_latest_sex_offense_completion:'2011-10-29',ma_100a_ever_sex_level_two_or_three:false,ma_100a_sex_registration_duty:false},'not_yet','2026-10-28','2026-10-29');
check('firearm/publicintegrity exclusion',{ma_100a_excluded_firearms_or_public_integrity_record:'Yes'},'excluded');
check('canonical No answers qualify',Object.fromEntries(Object.entries(facts).map(([id,v])=>[id,v===false?'No':v])),'qualifying');
check('recent finding',{ma_100a_recent_finding_three_years:'Yes'},'not_yet');
check('custody clock uses actual latest event',{ma_100a_latest_misdemeanor_event:'2025-10-29'},'not_yet','2026-10-29','2028-10-29');
check('unknown event not none',{ma_100a_latest_felony_event:'unknown'},'unknown');
check('Spanish unknown not none',{ma_100a_latest_felony_event:'no sé'},'unknown');
check('canonical Spanish none',{ma_100a_latest_felony_event:'no se aplicó'},'qualifying');
check('explicit empty record',{ma_100a_latest_misdemeanor_event:'none'},'needs_review');
check('contradictory 3year/7year histories',{ma_100a_latest_felony_event:'2019-01-01',ma_100a_recent_finding_three_years:true},'unknown');
check('future completion',{ma_100a_latest_misdemeanor_event:'2027-01-01'},'unknown');
check('UTC leap rollover prior day',{ma_100a_latest_misdemeanor_event:'2024-02-29'},'not_yet','2027-02-28','2027-03-01');
check('UTC leap rollover anniversary',{ma_100a_latest_misdemeanor_event:'2024-02-29'},'qualifying','2027-03-01','2027-03-01');
for(const id of ['ma_100a_latest_misdemeanor_event','ma_100a_latest_felony_event','ma_100a_latest_sex_offense_completion','ma_100a_excluded_firearms_or_public_integrity_record','ma_100a_recent_finding_three_years','ma_100a_recent_custody_three_years']) {
 for(const value of [undefined,'Unsure',[],{unknown:true,value:facts[id]}])check(id+' materialunknown '+JSON.stringify(value),{[id]:value},'unknown');
}
for(const id of ['ma_100a_whole_record_reviewed','ma_100a_all_record_classifications_confirmed','ma_100a_all_dispositions_description']) {
 for(const value of [undefined,'Unsure',[],{unknown:true,value:facts[id]}])check(id+' new materialunknown '+JSON.stringify(value),{[id]:value},'unknown');
}
for(const sentinel of ["I am not sure","I'm not sure","not_sure","no se","  NO SÉ  ","\tI AM \n NOT   SURE "," i’M NOT sure ","not sure","I do not know","I don't know","no estoy seguro","no estoy segura"]) {
 for(const value of [sentinel,{unknown:false,value:sentinel},{unknown:true,value:sentinel}])test('whole-answer uncertain inventory '+JSON.stringify(value),()=>{const result=evaluate(route,{...facts,ma_100a_all_dispositions_description:value},'2026-10-29');assert.equal(result.status,'unknown');assert.ok(result.missingFactIds.includes('ma_100a_all_dispositions_description'));});
}
for(const narrative of ["Boston Municipal Court20-CR-00102 misdemeanor conviction; latest event2023-10-29; no other Massachusetts entries. Prior document title: 'I am not sure'.","Boston Municipal Court20-CR-00102 misdemeanor conviction; latest event2023-10-29. The record label includes 'unknown'; there are no other entries."])check('uncertainty words within actual narrative '+narrative,{ma_100a_all_dispositions_description:narrative},'qualifying');
check('single-case-only cannot qualify',{ma_100a_whole_record_reviewed:'No'},'needs_review');
check('uncertain classification cannot use misdemeanor default',{ma_100a_all_record_classifications_confirmed:'No'},'needs_review');
check('sex level2ever excluded',{ma_100a_latest_sex_offense_completion:'2010-01-01',ma_100a_ever_sex_level_two_or_three:'Yes',ma_100a_sex_registration_duty:'No'},'excluded');
check('continuing registration after15years',{ma_100a_latest_sex_offense_completion:'2010-01-01',ma_100a_ever_sex_level_two_or_three:'No',ma_100a_sex_registration_duty:'Yes'},'not_yet');
for(const id of ['ma_100a_ever_sex_level_two_or_three','ma_100a_sex_registration_duty'])check('unknown sex fact '+id,{ma_100a_latest_sex_offense_completion:'2010-01-01',ma_100a_ever_sex_level_two_or_three:false,ma_100a_sex_registration_duty:false,[id]:{unknown:true,value:false}},'unknown');
check('sexcompletion alone cannot infer underlyingclass',{ma_100a_latest_misdemeanor_event:'none',ma_100a_latest_felony_event:'none',ma_100a_latest_sex_offense_completion:'2010-01-01',ma_100a_ever_sex_level_two_or_three:false,ma_100a_sex_registration_duty:false},'unknown');
test('explicit missing whole-record intake is unknown',()=>{const input={...facts};delete input.ma_100a_whole_record_reviewed;const result=evaluate(route,input,'2026-10-29');assert.equal(result.status,'unknown');assert.ok(result.missingFactIds.includes('ma_100a_whole_record_reviewed'));});
test('CORI remains external before-filing task, never required upload',()=>{const doc=manifest(route);assert.ok(doc.external.includes('participant_obtains_own_DCJIS_CORI_before_filing_without_LegalEase_collection_or_inspection'));assert.ok(!questions(route).some(q=>/upload/i.test(q.prompt) && !/Do not upload/.test(q.prompt)));});
test('exact scope returns null and empty questions/manifest',()=>{for(const other of [route+'-suffix','MA:juvenile-record-sealing-under-100b','']){assert.equal(evaluate(other,facts,'2026-10-29'),null);assert.deepEqual(questions(other),[]);assert.equal(manifest(other),null);}});
test('intake and official agency components',()=>{assert.equal(new Set(questions(route).map(q=>q.id)).size,13);for(const q of questions(route))assert.ok(q.prompt && q.promptEs);assert.equal(manifest(route).forum,'Commissioner_of_Probation');assert.equal(manifest(route).filingReady,false);assert.deepEqual(manifest(route).required,['official_MA_Petition_to_Seal_Section100A','corresponding_adult_perjury_affidavit','participant_submission_instructions']);});
console.log(`${count}/${count} R038 leaf checks passed; equivalence is extraction evidence, not a substitute for independent source or packet review.`);
