import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateAlcoholFacts,iowaAlcoholQuestions,iowaAlcoholFactsFromAnswers,evaluateIowaAlcoholPreparation,IOWA_ALCOHOL_FACT_IDS,IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS} from '../src/lib/rcap-engine/iowa-alcohol-native.mjs';

const nativePath='scripts/rcap-packet-recovery/chat8/ia-12346.mjs';
const original=execFileSync('git',['show','92392fb0650690edd9f7aa6b21d48fc10a338684:'+nativePath],{encoding:'utf8'});
const helpers=original.slice(original.indexOf('function text('),original.indexOf('const STAMP ='));
const shape=original.slice(original.indexOf('export function exact('),original.indexOf('const monthNames='));
const rules=original.slice(original.indexOf('export function validateAlcoholFacts('),original.indexOf('export function alcoholFixtures('));
const oracle=await import('data:text/javascript;base64,'+Buffer.from(helpers+shape+rules).toString('base64'));
const context={synthetic:true,filingDate:'2026-09-07'};
let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
const outcome=(fn,input,section)=>{try{return{value:fn(input,section)}}catch(e){return{error:e.message}}};
check('all existing native rules are verbatim and no corpus/render dependency enters the leaf',()=>{
 const leaf=fs.readFileSync('src/lib/rcap-engine/iowa-alcohol-native.mjs','utf8');
 assert(leaf.includes(helpers.replace('function text(','export function text(').replace('function dateValue(','export function dateValue(')+shape+rules));
 assert(!/^import\s/m.test(leaf));
});
check('Form3 writer/source/bindings/instructions/fixtures are unchanged except pure imports',()=>{
 const stripped=original.replace(helpers,'').replace(shape,'').replace(rules,'');
 const pos=stripped.indexOf('\nconst ROOT =');
 const imp="import {dateValue, exact, validateAlcoholFacts, validateFacts} from '../../../src/lib/rcap-engine/iowa-alcohol-native.mjs';\nexport {exact, validateAlcoholFacts, validateFacts};\n";
 assert.equal(fs.readFileSync(nativePath,'utf8'),stripped.slice(0,pos)+'\n'+imp+stripped.slice(pos));
});
check('Form4 existing writer remains byte-identical and all eight retained artifacts keep exact hashes',()=>{
 const p='scripts/build-census-v1-ia-12347-set.mjs';assert.equal(fs.readFileSync(p,'utf8'),execFileSync('git',['show','92392fb0650690edd9f7aa6b21d48fc10a338684:'+p],{encoding:'utf8'}));
 for(const family of ['ia-12346-set','ia-12347-set']){
  const r=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/ia/'+family+'--official-pdf-fill/reports/rendered-artifacts.json'));
  const rows=r.packets??r.artifacts;assert.equal(rows.length,family==='ia-12346-set'?6:2);
  for(const row of rows)assert.equal(createHash('sha256').update(fs.readFileSync(row.path??row.file)).digest('hex'),row.sha256);
 }
});
for(const name of ['canonical','boundary','permitted-traffic','later-conviction','local-ordinance','missing-contact'])check('original retained Form3 input preserves native output '+name,()=>{
 const f=JSON.parse(fs.readFileSync('data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill/fixtures/'+name+'.json'));
 assert.deepEqual(validateAlcoholFacts(f,'123.46'),oracle.validateAlcoholFacts(f,'123.46'));
});
const frozen={synthetic:true,name:'Avery Jordan Example',county:'Johnson',caseNumber:'EXAMPLE-INT-100001',plaintiff:'State of Iowa',
 convictionDate:'2022-01-15',filingDate:'2026-09-07',disposition:'conviction',proceeding:'district_court',
 offense:{kind:'statute',citation:'123.46(2)',equivalentTo:'123.46',confirmation:true},laterConvictions:[],
 historyComplete:true,selfRepresented:true,convictionStatementConfirmed:true,cleanPeriodStatementConfirmed:true,
 acknowledgedCopy:true,acknowledgedConfidential:true,courtDebtBalanceStatus:'unpaid',filingMethod:'paper',
 countyAttorney:{name:'Johnson County Attorney',address:'500 S. Clinton Street, Suite 400',city:'Iowa City',state:'IA',zip:'52244-2450'},
 address:'100 Example Lane',city:'Iowa City',state:'IA',zip:'52240',phone:'3195550101',email:'avery.example@example.org'};
const answers={participant_full_legal_name:'Avery Jordan Example',county:'Johnson',case_identifier:'EXAMPLE-INT-100001',
 ia_alcohol_plaintiff:'State of Iowa',conviction_date:'2022-01-15',ia_alcohol_address:'100 Example Lane',ia_alcohol_city:'Iowa City',
 ia_alcohol_state:'IA',ia_alcohol_zip:'52240',ia_alcohol_phone:'3195550101',ia_alcohol_email:'avery.example@example.org',
 ia_alcohol_disposition:'conviction',ia_alcohol_proceeding:'district_court',ia_alcohol_offense_kind:'statute',
 ia_alcohol_offense_citation:'123.46(2)',ia_alcohol_equivalent_to:'123.46',ia_alcohol_offense_checked:'Yes',
 ia_alcohol_self_represented:'Yes',ia_alcohol_history_complete:'Yes',ia_alcohol_conviction_checked:'Yes',
 ia_alcohol_period_checked:'Yes',ia_alcohol_ack_copy:'Yes',ia_alcohol_ack_confidential:'Yes',ia_alcohol_later_count:'0',
 financial_obligations:'No',ia_alcohol_filing_method:'paper',ia_alcohol_recipient_known:'Yes',
 ia_alcohol_recipient_name:'Johnson County Attorney',ia_alcohol_recipient_address:'500 S. Clinton Street, Suite 400',
 ia_alcohol_recipient_city:'Iowa City',ia_alcohol_recipient_state:'IA',ia_alcohol_recipient_zip:'52244-2450'};
const memo=JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/IA.memo.json'));
for(const[route,section]of[['IA:public-intoxication-12346','123.46'],['IA:underage-alcohol-12347','123.47']]){
 const citation=section==='123.46'?'123.46(2)':'123.47(3)';
 const expected={...structuredClone(frozen),offense:{kind:'statute',citation,equivalentTo:section,confirmation:true}};
 const a={...answers,ia_alcohol_offense_citation:citation,ia_alcohol_equivalent_to:section};
 const decode=x=>iowaAlcoholFactsFromAnswers(route,x,context),prepare=(x,c=context)=>evaluateIowaAlcoholPreparation(route,x,c);
 check(section+' adopted memo supports the exact two-year conviction route and no-debt rule',()=>{
  const t=memo.tracks.find(t=>t.trackId==='ia-'+section.replace('.',''));
  assert(t.waitingPeriods[0].condition==='The conviction');assert(JSON.stringify(t.legalDesignDecision).includes('Rule 2.83(3)'));
  assert(!JSON.stringify(t.waitingPeriods).includes('21'));assert.equal(t.legalDesignDecision.status,'legal_design_approved_with_limitations');
 });
 check(section+' independent literal native/transport fixture agrees with original guard',()=>{
  const d=decode(a);assert.deepEqual(d.missingFactIds,[]);assert.deepEqual(d.facts,expected);
  assert.deepEqual(validateAlcoholFacts(d.facts,section),oracle.validateAlcoholFacts(expected,section));
  assert.equal(prepare(a).status,'qualifying');assert.equal(prepare(a).scope,'SUPPORTED_DRAFT_PREPARATION_ONLY');assert.equal(prepare(a).filingReady,false);
 });
 for(const[label,patch,expectedError]of[
  ['day before',{convictionDate:'2024-09-08'},'Two-year period has not expired'],
  ['wrong disposition',{disposition:'dismissed'},'Wrong disposition/proceeding'],
  ['wrong proceeding',{proceeding:'juvenile_court'},'Wrong disposition/proceeding'],
  ['incomplete history',{historyComplete:false},'Missing or false participant confirmation'],
  ['unknown history',{historyComplete:{unknown:true,value:true}},'Missing or false participant confirmation'],
  ['wrong exact offense',{offense:{kind:'statute',citation:section==='123.46'?'123.47(3)':'123.47',equivalentTo:section,confirmation:true}},'Wrong statutory offense'],
  ['within-window criminal',{laterConvictions:[{date:'2023-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'Disqualifying conviction'],
  ['321J is not321',{laterConvictions:[{date:'2023-01-01',citation:'321J.2',kind:'chapter_321_simple',categoryConfirmed:true}]},'traffic exception is chapter 321'],
  ['unknown category',{laterConvictions:[{date:'2023-01-01',citation:'321.285',kind:'unknown',categoryConfirmed:true}]},'Unknown subsequent-conviction category'],
  ['unconfirmed category',{laterConvictions:[{date:'2023-01-01',citation:'321.285',kind:'chapter_321_simple',categoryConfirmed:false}]},'Unknown subsequent-conviction category'],
  ['contradictory history date',{laterConvictions:[{date:'2021-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'date is inconsistent'],
  ['future history date',{laterConvictions:[{date:'2027-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'date is inconsistent'],
  ['leap anniversary',{convictionDate:'2024-02-29'},'Leap-day anniversary'],
  ['exactanniversary criminal',{laterConvictions:[{date:'2024-01-15',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'exact anniversary needs timing review']
 ])check(section+' exact native boundary/refusal preserved '+label,()=>{
  const f={...structuredClone(expected),...patch},before=outcome(oracle.validateAlcoholFacts,f,section),after=outcome(validateAlcoholFacts,f,section);
  assert(before.error?.includes(expectedError));assert.deepEqual(after,before);
 });
 for(const debt of ['paid','unpaid','unknown'])check(section+' debt '+debt+' never becomes a prerequisite',()=>{
  const f={...structuredClone(expected),courtDebtBalanceStatus:debt},v=validateAlcoholFacts(f,section);assert.equal(v.courtDebtIsNotPrecondition,true);assert.equal(v.filingReady,false);
 });
 check(section+' permitted traffic and later-after-window convictions are not blanket exclusions',()=>{
  const f={...structuredClone(expected),laterConvictions:[{date:'2022-10-01',citation:'321.285',kind:'chapter_321_simple',categoryConfirmed:true},{date:'2023-01-01',citation:'Example traffic ordinance',kind:'local_traffic',categoryConfirmed:true},{date:'2025-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]};
  assert.deepEqual(validateAlcoholFacts(f,section),oracle.validateAlcoholFacts(f,section));assert.equal(validateAlcoholFacts(f,section).subsequentConvictions[2].withinTwoYearPeriod,false);
 });
 for(const[label,patch,status]of[
  ['day before',{conviction_date:'2024-09-08'},'not_yet'],['exact day',{conviction_date:'2024-09-07'},'qualifying'],['day after',{conviction_date:'2024-09-06'},'qualifying'],
  ['wrong broad alcohol citation',{ia_alcohol_offense_citation:section==='123.46'?'123.47(3)':'123.47'},'excluded'],
  ['unknown complete list',{ia_alcohol_later_count:{unknown:true,value:'0'}},'unknown'],
  ['unknown disposition',{ia_alcohol_disposition:'I am not sure'},'unknown'],['unreviewed history',{ia_alcohol_history_complete:'No'},'unknown'],
  ['unknown exact offense',{ia_alcohol_offense_citation:{unknown:true,value:citation}},'unknown'],['leap date',{conviction_date:'2024-02-29'},'needs_review']
 ])check(section+' transport/native preparation '+label,()=>{
  const d=prepare({...a,...patch});assert.equal(d.status,status);assert(d.reason&&d.reasonEs);assert.equal(d.filingReady,false);assert.equal(d.courtDebtIsNotPrecondition,true);
 });
 check(section+' raw/missing/unknown balances stay context only, no invented paid fact',()=>{
  const absent={...a};delete absent.financial_obligations;assert.equal(decode(absent).facts.courtDebtBalanceStatus,'unknown');assert.equal(prepare(absent).status,'qualifying');
  for(const raw of ['Yes','No','I am not sure',{unknown:true,value:'Yes'},null])assert.equal(prepare({...a,financial_obligations:raw}).status,'qualifying');
 });
 check(section+' local-equivalent branch requires actual recorded equivalent rather than route or bareYes',()=>{
  const local={...a,ia_alcohol_offense_kind:'local_equivalent',ia_alcohol_offense_citation:'Recorded example local alcohol ordinance'};
  assert.equal(prepare(local).status,'qualifying');
  const missing={...local};delete missing.ia_alcohol_equivalent_to;assert.equal(prepare(missing).status,'unknown');
  assert(prepare(missing).missingFactIds.includes('ia_alcohol_equivalent_to'));
  assert.equal(prepare({...local,ia_alcohol_equivalent_to:'Yes'}).status,'unknown');
  assert.equal(prepare({...local,ia_alcohol_equivalent_to:{unknown:true,value:section}}).status,'unknown');
 });
 check(section+' complete later conviction rows are actual facts, not a self-certified clean list',()=>{
  let facts={...a,ia_alcohol_later_count:'1',ia_alcohol_later_1_date:'2023-01-01',ia_alcohol_later_1_citation:'714.2(5)',ia_alcohol_later_1_kind:'other',ia_alcohol_later_1_category_checked:'Yes'};
  assert.equal(prepare(facts).status,'excluded');facts={...facts,ia_alcohol_later_1_date:'2025-01-01'};assert.equal(prepare(facts).status,'qualifying');
  assert.equal(prepare({...facts,ia_alcohol_later_1_date:'2024-01-15'}).status,'needs_review');
  const missing={...a};delete missing.ia_alcohol_later_count;assert.equal(prepare(missing).status,'unknown');assert.equal(decode(missing).facts,null);
 });
 check(section+' record inventory beyond input capacity is held without a new legal exclusion',()=>{
  const d=prepare({...a,ia_alcohol_later_count:'26'});assert.equal(d.status,'needs_review');assert.deepEqual(d.missingFactIds,[]);
  assert(d.reason.includes('intake limit, not a statutory exclusion'));assert(d.reasonEs.includes('no una exclusión legal'));
  const many={...structuredClone(expected),laterConvictions:Array.from({length:26},(_,i)=>({date:'2025-01-01',citation:'Synthetic later record '+i,kind:'other',categoryConfirmed:true}))};
  assert.equal(validateAlcoholFacts(many,section).filingReady,false,'The original statute guard itself has no invented25-record exclusion');
 });
 check(section+' active and retained question IDs are closed, bilingual and privacy bounded',()=>{
  assert.equal(IOWA_ALCOHOL_FACT_IDS.length,new Set(IOWA_ALCOHOL_FACT_IDS).size);
  assert(IOWA_ALCOHOL_FACT_IDS.includes('ia_alcohol_later_25_category_checked'));
  assert(!IOWA_ALCOHOL_FACT_IDS.includes('ia_alcohol_later_26_date'));assert(!IOWA_ALCOHOL_FACT_IDS.some(id=>/ssn|social_security|birth_date/.test(id)));
  assert(!iowaAlcoholQuestions(route,a).some(q=>q.id==='ia_alcohol_later_1_date'));
  assert(iowaAlcoholQuestions(route,{...a,ia_alcohol_later_count:'1'}).some(q=>q.id==='ia_alcohol_later_1_date'));
  for(const q of iowaAlcoholQuestions(route,{},true)){assert(q.en&&q.es);if(q.options){assert.equal(q.options.length,q.optionsEn.length);assert.equal(q.options.length,q.optionsEs.length);}}
 });
 check(section+' optional unknown/null contact and recipient states preserve the native partial draft',()=>{
  const partial={...a};for(const id of IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS)partial[id]={unknown:false,value:null};
  const f=decode(partial).facts;assert.equal(f.address,null);assert.equal(f.countyAttorney,null);assert.equal(prepare(partial).status,'qualifying');
  const missing={...a};delete missing.ia_alcohol_address;assert.equal(prepare(missing).status,'unknown');
 });
 check(section+' malformed wrappers, foreign SSN/serverfacts and unknown route cannot create source authority',()=>{
  assert.equal(prepare({...a,ia_alcohol_later_count:{unknown:'true',value:'0'}}).status,'unknown');
  const foreign={...a,ssn:'123456789',social_security_number:'123456789',synthetic:false,filingDate:'2099-01-01',legalSignoffStatus:'signed_off'};
  assert.deepEqual(decode(foreign).facts,expected);assert(!JSON.stringify(decode(foreign)).includes('123456789'));
  assert.equal(prepare(foreign,{}).status,'needs_review');
 });
}
check('unsupported route never selects a supported alcohol child',()=>{
 assert.deepEqual(iowaAlcoholQuestions('IA:misdemeanor-901c3',{},true),[]);
 assert.equal(evaluateIowaAlcoholPreparation('IA:underage-alcohol-12347-other',answers,context),null);
});
console.log(`${checks}/${checks} HG008/HG009 native-rule/closed-intake controls passed. Source-native rules preserved; no new Form4 renderer/provider adapter, packet generation, approval, checkout or production proof.`);
