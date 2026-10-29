import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateFacts, iowaMisdemeanorQuestions, IOWA_MISDEMEANOR_FACT_IDS, iowaMisdemeanorFactsFromAnswers} from '../src/lib/rcap-engine/iowa-misdemeanor-native.mjs';

const modulePath='scripts/rcap-packet-recovery/chat8/ia-901c3.mjs';
const original=execFileSync('git',['show','b41315541ecfc45a4e9ec7494253d62d0313387b:'+modulePath],{encoding:'utf8'});
const helpers=original.slice(original.indexOf('const fail ='),original.indexOf('export const authorities ='));
const rules=original.slice(original.indexOf('// These exact statutory exclusions'),original.indexOf('const canonical ='));
const oracle=await import('data:text/javascript;base64,'+Buffer.from(helpers+rules).toString('base64'));
const actual=fs.readFileSync(modulePath,'utf8');
const nativeImport="import { fail, text, dateValue, fullName, validateFacts } from '../../../src/lib/rcap-engine/iowa-misdemeanor-native.mjs';\nexport { text, dateValue, fullName, validateFacts };\n";
let checks=0;
const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
check('all native writer/source/bindings/instructions/fixtures bytes remain unchanged',()=>{
  const stripped=original.replace(helpers,'').replace(rules,'');
  const p=stripped.indexOf('\nexport const FAMILY =');
  assert.equal(actual,stripped.slice(0,p)+'\n'+nativeImport+stripped.slice(p));
});
check('extracted native rule source is verbatim, including anniversary and conservative guards',()=>{
  const leaf=fs.readFileSync('src/lib/rcap-engine/iowa-misdemeanor-native.mjs','utf8');
  assert(leaf.includes(helpers.replace('const fail =','export const fail =')+rules));
});
check('pure native validation loads without corpus environment or renderer dependencies',()=>{
  const env={...process.env};delete env.MASTER_LIBRARY_SOURCE_DIR;delete env.RCAP_BUNDLE_EXTRACT;
  const output=execFileSync(process.execPath,['--input-type=module','-e',"import {validateFacts} from './src/lib/rcap-engine/iowa-misdemeanor-native.mjs'; console.log(typeof validateFacts)"],{encoding:'utf8',env});
  assert.equal(output.trim(),'function');
  assert(!/^import\s/m.test(fs.readFileSync('src/lib/rcap-engine/iowa-misdemeanor-native.mjs','utf8')));
});
const outcome=(fn,input)=>{try{return{value:fn(input)}}catch(e){return{error:e.message}}};
const fixtureRoot='data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill/fixtures/';
const names=['canonical','boundary','additional-aliases','history-stale','history-requested','release-missing','exact-eight-years','missing-identifiers'];
for(const name of names)check('same native output for existing '+name,()=>{
  const input=JSON.parse(fs.readFileSync(fixtureRoot+name+'.json'));
  assert.deepEqual(outcome(validateFacts,input),outcome(oracle.validateFacts,input));
});
check('all eight retained packet artifacts still match their existing hashes, without rerender',()=>{
  const report=JSON.parse(fs.readFileSync(fixtureRoot+'../reports/rendered-artifacts.json'));
  assert.equal(report.packets.length,8);
  for(const row of report.packets)assert.equal(createHash('sha256').update(fs.readFileSync(row.path)).digest('hex'),row.sha256);
});
const frozen=JSON.parse(fs.readFileSync(fixtureRoot+'canonical.json'));
for(const[label,patch,expected]of[
  ['before8years',{convictionDate:'2018-09-08'},'fewer than eight years'],
  ['unknown pending',{pendingCharges:null},'pending or unknown'],
  ['pending',{pendingCharges:true},'pending or unknown'],
  ['prior grant',{hasPrior901c3Grant:true},'prior or unknown lifetime'],
  ['unknown prior',{hasPrior901c3Grant:{unknown:true,value:false}},'prior or unknown lifetime'],
  ['multiple convictions',{hasOtherEligibleConvictions:true},'strategic choice'],
  ['related case',{relatedCases:['SYNTHETIC-RELATED-CASE']},'legal assistance'],
  ['two deferred',{deferredJudgmentProceedings:2},'two or more'],
  ['unpaid',{financialObligationsPaid:false},'financialObligationsPaid'],
  ['unknown paid',{financialObligationsPaid:{unknown:true,value:true}},'financialObligationsPaid'],
  ['deferred disposition',{deferredJudgmentDisposition:true},'not a deferred judgment'],
  ['unreviewed',{exclusionsReviewed:false},'exclusionsReviewed'],
  ['source235B20hold',{offense:{section:'235B.20',title:'Conservative source category'}},'excluded or retained'],
  ['needs subsection',{offense:{section:'708.2',title:'Unresolved subsection'}},'subsection needed'],
  ['sex offense',{sexOffense:true},'sex offense'],
  ['comparability',{comparabilityUncertain:true},'comparability'],
  ['bad calendar',{convictionDate:'2017-02-30'},'invalid calendar'],
  ['future report',{historyReport:{availability:'available',issuedOn:'2026-09-08',releaseSigned:true}},'cannot postdate'],
  ['unreceived issue',{historyReport:{availability:'requested',issuedOn:'2026-08-28',releaseSigned:true}},'unreceived report'],
  ['unknown middle',{name:{...frozen.name,middle:null}},'nonempty trimmed']
])check('same precise native refusal '+label,()=>{
  const input={...structuredClone(frozen),...patch},old=outcome(oracle.validateFacts,input),current=outcome(validateFacts,input);
  assert(old.error?.includes(expected));assert.deepEqual(current,old);
});
check('exact8year boundary retains native flag; writer keeps checkbox6 blank and caution',()=>{
  const v=validateFacts({...frozen,convictionDate:'2018-09-07'});
  assert.equal(v.exactAnniversary,true);assert.equal(v.filingReady,false);
  assert(actual.includes("if(!v.exactAnniversary) put('06',true"));
  assert(actual.includes('EXACT-ANNIVERSARY CAUTION:'));assert(actual.includes('Item6')||actual.includes('Item 6 is blank.'));
});
check('30day history boundary stays participant-reported and never actually attached',()=>{
  const within=validateFacts({...frozen,historyReport:{availability:'available',issuedOn:'2026-08-08',releaseSigned:true}});
  const old=validateFacts({...frozen,historyReport:{availability:'available',issuedOn:'2026-08-07',releaseSigned:true}});
  assert.equal(within.historyReadyByParticipantReport,true);assert.equal(old.historyReadyByParticipantReport,false);
  for(const v of[within,old]){assert.equal(v.externalHistoryIncluded,false);assert.equal(v.reportAvailabilityIsParticipantReported,true);assert.equal(v.filingReady,false);}
});

// Independent literal transport expected result is the existing frozen native
// fixture above. Do not construct these answers from the adapter's field map.
const answers={
  ia_901c3_first_name:'Avery',ia_901c3_last_name:'Example',ia_901c3_has_middle:'Yes',ia_901c3_middle_name:'Jordan',
  ia_901c3_alias_count:'0',county:'Johnson',case_identifier:'EXAMPLE-901C3-0001',ia_901c3_plaintiff:'State of Iowa',
  ia_901c3_birth_date:'1988-04-12',ia_901c3_driver_license:'EXAMPLE0001',ia_901c3_ssn:'000120001',
  ia_901c3_address:'100 Example Lane',ia_901c3_city:'Iowa City',ia_901c3_state:'IA',ia_901c3_zip:'52240',
  ia_901c3_phone:'3195550101',ia_901c3_email:'avery.example@example.org',conviction_date:'2017-09-06',
  ia_901c3_offense_section:'714.2(5)',ia_901c3_offense_title:'Theft in the fifth degree',
  ia_901c3_misdemeanor_conviction:'Yes',ia_901c3_deferred_disposition:'No',ia_901c3_prior_grant:'No',
  ia_901c3_other_convictions:'No',ia_901c3_related_cases:'No',pending_cases:'No',financial_obligations:'Yes',
  ia_901c3_deferred_count:'0',ia_901c3_exclusions_reviewed:'Yes',ia_901c3_comparability_uncertain:'No',
  ia_901c3_sex_offense:'No',ia_901c3_self_represented:'Yes',ia_901c3_filing_method:'paper',
  ia_901c3_ack_copy:'Yes',ia_901c3_ack_related:'Yes',ia_901c3_ack_lifetime:'Yes',ia_901c3_ack_confidential:'Yes',
  ia_901c3_history_availability:'available',ia_901c3_history_issued:'2026-08-28',ia_901c3_history_release_signed:'Yes',
  ia_901c3_recipient_known:'Yes',ia_901c3_recipient_name:'Johnson County Attorney',
  ia_901c3_recipient_address:'500 S. Clinton Street, Suite 400',ia_901c3_recipient_city:'Iowa City',
  ia_901c3_recipient_state:'IA',ia_901c3_recipient_zip:'52244-2450'
};
const context={synthetic:true,filingDate:'2026-09-07'};
const decode=a=>iowaMisdemeanorFactsFromAnswers(a,context);
check('ordinary canonical UIYesNo builds the independently frozen native input exactly',()=>{
  const d=decode(answers);assert.equal(d.refusal,null);assert.deepEqual(d.missingFactIds,[]);assert.deepEqual(d.facts,frozen);
  assert.deepEqual(validateFacts(d.facts),oracle.validateFacts(frozen));
});
check('ordinary lower-case booleans preserve the same known native facts',()=>{
  const lower=Object.fromEntries(Object.entries(answers).map(([k,v])=>[k,v==='Yes'?'yes':v==='No'?'no':v]));
  assert.deepEqual(decode(lower).facts,frozen);
});
for(const id of ['financial_obligations','ia_901c3_prior_grant','pending_cases','ia_901c3_alias_count','ia_901c3_deferred_count','ia_901c3_has_middle','conviction_date','ia_901c3_offense_section']){
  for(const value of ['I am not sure',{unknown:true,value:answers[id]}])check(id+' explicit uncertainty cannot retain a qualifying value '+JSON.stringify(value),()=>{
    const d=decode({...answers,[id]:value});assert.equal(d.facts,null);assert(d.missingFactIds.includes(id));
  });
}
check('missing alias inventory never becomes no aliases',()=>{const a={...answers};delete a.ia_901c3_alias_count;const d=decode(a);assert.equal(d.facts,null);assert(d.missingFactIds.includes('ia_901c3_alias_count'));});
check('known related-case answer preserves self-help stop without invented IDs',()=>{
  const d=decode({...answers,ia_901c3_related_cases:'Yes'});assert.equal(d.facts,null);
  assert.equal(d.refusal,'Self-help stop: related-case/same-transaction determination requires legal assistance');
});
check('known two-or-more deferred proceedings keeps exact native refusal',()=>{
  const d=decode({...answers,ia_901c3_deferred_count:'2_or_more'});assert.throws(()=>validateFacts(d.facts),/two or more/);
});
check('known unpaid and pending statements do not become confirmations',()=>{
  for(const patch of [{financial_obligations:'No'},{pending_cases:'Yes'},{ia_901c3_prior_grant:'Yes'}])assert(outcome(validateFacts,decode({...answers,...patch}).facts).error);
});
check('explicit unknown optional identifiers stay null, not invented',()=>{
  const d=decode({...answers,ia_901c3_birth_date:'I am not sure',ia_901c3_driver_license:{unknown:true,value:'STALE'},ia_901c3_ssn:'unknown'});
  assert.equal(d.facts.dob,null);assert.equal(d.facts.driversLicense,null);assert.equal(d.facts.ssn,null);
  assert.equal(validateFacts(d.facts).filingReady,false);
});
check('unreceived history keeps stale inactive date out without fabricating attachment',()=>{
  const d=decode({...answers,ia_901c3_history_availability:'requested',ia_901c3_history_issued:'2099-01-01'});
  assert.equal(d.facts.historyReport.issuedOn,null);assert.equal(validateFacts(d.facts).externalHistoryIncluded,false);
  assert.equal(validateFacts(d.facts).historyReadyByParticipantReport,false);
});
check('explicit native unknown report and release remain unknown rather than payment blockers or attachments',()=>{
  for(const availability of ['unknown','I am not sure',{unknown:true,value:'available'}]){
    const d=decode({...answers,ia_901c3_history_availability:availability,ia_901c3_history_release_signed:{unknown:true,value:true}});
    assert.deepEqual(d.facts.historyReport,{availability:'unknown',issuedOn:null,releaseSigned:null});
    const v=validateFacts(d.facts);assert.equal(v.historyReadyByParticipantReport,false);assert.equal(v.externalHistoryIncluded,false);assert.equal(v.filingReady,false);
  }
});
check('electronic service branch ignores retained inactive paper-recipient answers',()=>{
  const d=decode({...answers,ia_901c3_filing_method:'efile',ia_901c3_recipient_name:'RETAINED INACTIVE NAME'});
  assert.equal(d.facts.countyAttorney,null);assert.equal(validateFacts(d.facts).filingReady,false);
  assert(!iowaMisdemeanorQuestions({...answers,ia_901c3_filing_method:'efile'}).some(q=>q.id.startsWith('ia_901c3_recipient_')));
});
check('closed declared IDs contain every inactive conditional field and no arbitrary prefixes',()=>{
  assert.equal(IOWA_MISDEMEANOR_FACT_IDS.length,new Set(IOWA_MISDEMEANOR_FACT_IDS).size);
  assert(IOWA_MISDEMEANOR_FACT_IDS.includes('ia_901c3_alias_30_middle'));
  for(const forged of ['ia_901c3_alias_31_first','ia_901c3_alias_1_secret','ia_901c3_anything','synthetic','filingDate','legalSignoffStatus'])assert(!IOWA_MISDEMEANOR_FACT_IDS.includes(forged));
  for(const question of iowaMisdemeanorQuestions({},true)){assert(question.en&&question.es);if(question.options){assert.equal(question.options.length,question.optionsEn.length);assert.equal(question.options.length,question.optionsEs.length);}}
});
check('forged answer authority fields cannot alter native facts or server context',()=>{
  const d=decode({...answers,synthetic:false,filingDate:'2099-01-01',legalSignoffStatus:'signed_off',ia_901c3_alias_31_first:'FORGED'});
  assert.deepEqual(d.facts,frozen);assert.equal(iowaMisdemeanorFactsFromAnswers({...answers,synthetic:true,filingDate:'2026-09-07'},{}).facts,null);
});
check('bounded alias and middle-name branches collect only actual active facts',()=>{
  const a={...answers,ia_901c3_alias_count:'1',ia_901c3_alias_1_first:'AJ',ia_901c3_alias_1_last:'Example',ia_901c3_alias_1_has_middle:'No',ia_901c3_alias_1_middle:'RETAINED INACTIVE'};
  const d=decode(a);assert.deepEqual(d.facts.aliases,[{first:'AJ',last:'Example',middle:''}]);
  assert(!iowaMisdemeanorQuestions(a).some(q=>q.id==='ia_901c3_alias_1_middle'));
  assert(iowaMisdemeanorQuestions(a,true).some(q=>q.id==='ia_901c3_alias_1_middle'));
  assert(!iowaMisdemeanorQuestions(a).some(q=>q.id==='ia_901c3_alias_2_first'));
  assert(decode({...a,ia_901c3_alias_count:'31'}).missingFactIds.includes('ia_901c3_alias_count'));
});
check('transport never mutates raw saved answers or creates payment/readiness claims',()=>{
  const before=structuredClone(answers),d=decode(answers);assert.deepEqual(answers,before);
  for(const k of ['paymentAllowed','packet_ready','signed_off','entitlement','externalHistoryIncluded'])assert(!Object.hasOwn(d,k));
});
console.log(`${checks}/${checks} IA901C.3 native extraction/transport controls passed. Native writer/source unchanged by exact source comparison; retained artifacts unchanged; no new render, legal adoption, shared integration or commercial proof.`);
