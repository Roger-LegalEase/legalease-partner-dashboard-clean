import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateFacts, iowaMisdemeanorQuestions, IOWA_MISDEMEANOR_FACT_IDS, IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS, IOWA_MISDEMEANOR_MANUAL_SSN, IOWA_MISDEMEANOR_PREPARATION_SCOPE, IOWA_MISDEMEANOR_FILING_TASKS, iowaMisdemeanorFactsFromAnswers, evaluateIowaMisdemeanorPreparation} from '../src/lib/rcap-engine/iowa-misdemeanor-native.mjs';

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
check('extracted native rules change only the confirmed citation-case exclusion bypass',()=>{
  const leaf=fs.readFileSync('src/lib/rcap-engine/iowa-misdemeanor-native.mjs','utf8');
  assert(leaf.includes(helpers.replace('const fail =','export const fail =')));
  const oldGuard="  if (excludedSections.some(s => f.offense.section === s || f.offense.section.startsWith(s + '(')) || excludedChapters.includes(f.offense.section.split('.')[0]) || /^123\\.47\\(3\\)|^708\\.2\\(3\\)|^716\\.8\\([34]\\)/.test(f.offense.section)) fail('Route stop: excluded or retained conservative source category');\n  if (['123.47','708.2','716.8'].includes(f.offense.section)) fail('offense.section: subsection needed to resolve statutory scope');";
  const fixedGuard="  // The accepted citation syntax is case-insensitive. Compare the same\n  // canonical spelling against existing guards while preserving the raw fact.\n  const citation = f.offense.section.toUpperCase();\n  if (excludedSections.some(s => citation === s || citation.startsWith(s + '(')) || excludedChapters.includes(citation.split('.')[0]) || /^123\\.47\\(3\\)|^708\\.2\\(3\\)|^716\\.8\\([34]\\)/.test(citation)) fail('Route stop: excluded or retained conservative source category');\n  if (['123.47','708.2','716.8'].includes(citation)) fail('offense.section: subsection needed to resolve statutory scope');";
  const currentRules=leaf.slice(leaf.indexOf('// These exact statutory exclusions'),leaf.indexOf('/** Transport only:'));
  assert(currentRules.includes(fixedGuard));assert.equal(currentRules.replace(fixedGuard,oldGuard),rules+'\n');
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
const privateCompletion={...structuredClone(frozen),ssn:null};
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
  ia_901c3_birth_date:'1988-04-12',ia_901c3_driver_license:'EXAMPLE0001',
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
check('ordinary canonical UIYesNo preserves frozen facts with SSN privately deferred',()=>{
  const d=decode(answers);assert.equal(d.refusal,null);assert.deepEqual(d.missingFactIds,[]);assert.deepEqual(d.facts,privateCompletion);
  assert.deepEqual(validateFacts(d.facts),oracle.validateFacts(privateCompletion));
});
check('ordinary lower-case booleans preserve the same known native facts',()=>{
  const lower=Object.fromEntries(Object.entries(answers).map(([k,v])=>[k,v==='Yes'?'yes':v==='No'?'no':v]));
  assert.deepEqual(decode(lower).facts,privateCompletion);
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
  for(const forged of ['ia_901c3_alias_31_first','ia_901c3_alias_1_secret','ia_901c3_anything','synthetic','filingDate','legalSignoffStatus','ia_901c3_ssn','social_security_number','ssn'])assert(!IOWA_MISDEMEANOR_FACT_IDS.includes(forged));
  for(const question of iowaMisdemeanorQuestions({},true)){assert(question.en&&question.es);if(question.options){assert.equal(question.options.length,question.optionsEn.length);assert.equal(question.options.length,question.optionsEs.length);}}
});
check('forged answer authority fields cannot alter native facts or server context',()=>{
  const d=decode({...answers,synthetic:false,filingDate:'2099-01-01',legalSignoffStatus:'signed_off',ia_901c3_alias_31_first:'FORGED'});
  assert.deepEqual(d.facts,privateCompletion);assert.equal(iowaMisdemeanorFactsFromAnswers({...answers,synthetic:true,filingDate:'2026-09-07'},{}).facts,null);
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
check('no active or retained intake question collects an unguarded SSN',()=>{
  for(const retained of [false,true])for(const question of iowaMisdemeanorQuestions(answers,retained)){
    assert(!/ssn|social_security_number/.test(question.id));
    assert(!/Social Security number|número de Seguro Social/i.test(question.en+' '+question.es));
  }
});
check('legacy/foreign raw SSN is ignored and never reaches returned native facts',()=>{
  const rawSsn='123456789';
  for(const patch of [{ia_901c3_ssn:rawSsn},{ssn:rawSsn},{social_security_number:rawSsn},{ia_901c3_ssn:{unknown:true,value:rawSsn}}]){
    const d=decode({...answers,...patch});assert.deepEqual(d.facts,privateCompletion);
    assert.equal(d.facts.ssn,null);assert(!JSON.stringify(d).includes(rawSsn));
  }
});
check('unknown legacy SSN does not establish payment eligibility or change material rules',()=>{
  for(const legacy of ['I am not sure',{unknown:true,value:'123456789'}]){
    const d=decode({...answers,ia_901c3_ssn:legacy});assert.equal(validateFacts(d.facts).filingReady,false);
    assert.throws(()=>validateFacts(decode({...answers,ia_901c3_ssn:legacy,financial_obligations:'No'}).facts),/financialObligationsPaid/);
    assert.throws(()=>validateFacts(decode({...answers,ia_901c3_ssn:legacy,pending_cases:'Yes'}).facts),/pending or unknown/);
    assert.equal(decode({...answers,ia_901c3_ssn:legacy,financial_obligations:'I am not sure'}).facts,null);
  }
});
check('existing private-completion source and retained output leave all SSN fields before-filing blanks',()=>{
  const report=JSON.parse(fs.readFileSync(fixtureRoot+'../reports/missing-identifiers.json'));
  assert.equal(report.assessment.facts.ssn,null);
  for(const id of ['2.86-2.01.12','2.86-2.01.13','2.86-2.01.14']){
    const blank=report.blanks.find(b=>b.fieldId===id);assert.equal(blank.requiredBeforeFiling,true);
    assert.equal(blank.completenessDisposition,'REQUIRED_BEFORE_FILING');assert(blank.reason.includes('privately before filing'));
    assert(!report.actualWrites.some(w=>w.fieldId===id));
  }
  assert.equal(IOWA_MISDEMEANOR_MANUAL_SSN.collectedOnline,false);
  assert.equal(IOWA_MISDEMEANOR_MANUAL_SSN.requiredBeforeFiling,true);
  assert(IOWA_MISDEMEANOR_MANUAL_SSN.en.includes('privately before filing'));
  assert(IOWA_MISDEMEANOR_MANUAL_SSN.en.includes('draft is incomplete'));
  assert(IOWA_MISDEMEANOR_MANUAL_SSN.es.includes('en privado antes de presentar'));
  assert(IOWA_MISDEMEANOR_MANUAL_SSN.es.includes('borrador está incompleto'));
});
const prepare=(a,c=context)=>evaluateIowaMisdemeanorPreparation(a,c);
check('preparation wrapper actually validates known source facts and only supports an incomplete draft',()=>{
  const d=prepare(answers);assert.equal(d.status,'qualifying');assert.equal(d.scope,IOWA_MISDEMEANOR_PREPARATION_SCOPE);
  assert.equal(d.scope,'SUPPORTED_DRAFT_PREPARATION_ONLY');assert.equal(d.filingReady,false);assert.equal(d.externalHistoryIncluded,false);
  assert.equal(d.manualSsn.collectedOnline,false);assert.equal(d.manualSsn.requiredBeforeFiling,true);
  assert(d.reason.includes('limited Form 2 draft'));assert(d.reasonEs.includes('borrador limitado'));
  assert(!Object.hasOwn(d,'facts'));assert(!Object.hasOwn(d,'paymentAllowed'));assert(!Object.hasOwn(d,'legalSignoffStatus'));
});
for(const[label,patch,status,en,es]of[
  ['fewer8years',{conviction_date:'2018-09-08'},'not_yet','fewer than eight years','menos de ocho años'],
  ['unpaid',{financial_obligations:'No'},'not_yet','paid in full','pago completo'],
  ['pending',{pending_cases:'Yes'},'not_yet','Pending criminal charges','cargos penales pendientes'],
  ['prior grant',{ia_901c3_prior_grant:'Yes'},'excluded','previously received','ya recibió'],
  ['two deferred',{ia_901c3_deferred_count:'2_or_more'},'excluded','two or more','dos o más'],
  ['wrong disposition',{ia_901c3_deferred_disposition:'Yes'},'excluded','misdemeanor conviction','condena por delito menor'],
  ['excluded offense',{ia_901c3_offense_section:'708.2A'},'excluded','offense category','categoría del delito'],
  ['235B20 source hold',{ia_901c3_offense_section:'235B.20'},'attorney_review','form and statutory','formulario oficial'],
  ['related cases',{ia_901c3_related_cases:'Yes'},'attorney_review','related-case','casos relacionados'],
  ['multiple convictions',{ia_901c3_other_convictions:'Yes'},'attorney_review','multiple convictions','varias condenas'],
  ['comparability',{ia_901c3_comparability_uncertain:'Yes'},'attorney_review','comparability','equivalencia'],
  ['sex offense',{ia_901c3_sex_offense:'Yes'},'attorney_review','sex-offense','delito sexual'],
  ['representation',{ia_901c3_self_represented:'No'},'attorney_review','self-represented','se representa a sí misma'],
  ['not reviewed',{ia_901c3_exclusions_reviewed:'No'},'unknown','official Form 2 instructions','instrucciones oficiales'],
  ['unacknowledged',{ia_901c3_ack_lifetime:'No'},'unknown','acknowledgment','reconocimiento']
])check('bounded native preparation result '+label,()=>{
  const d=prepare({...answers,...patch});assert.equal(d.status,status);assert(d.reason.includes(en));assert(d.reasonEs.includes(es));
  assert.equal(d.filingReady,false);assert.equal(d.externalHistoryIncluded,false);assert.equal(d.scope,'SUPPORTED_DRAFT_PREPARATION_ONLY');
  assert(!d.reason.includes('Route stop:'));assert(!d.reason.includes('participant confirmation:'));
});
check('exact8anniversary only supports draft with native blank-checkbox caution in both languages',()=>{
  const d=prepare({...answers,conviction_date:'2018-09-07'});assert.equal(d.status,'qualifying');assert.equal(d.exactAnniversary,true);
  assert(d.reason.includes('item 6 left blank'));assert(d.reason.includes('Wait until after the anniversary'));
  assert(d.reasonEs.includes('en blanco el punto 6'));assert(d.reasonEs.includes('Espere hasta después del aniversario'));assert.equal(d.filingReady,false);
});
check('unknown material facts remain explicit missing IDs rather than a supported draft',()=>{
  for(const[id,value]of[['financial_obligations',{unknown:true,value:'Yes'}],['ia_901c3_prior_grant','I am not sure'],['conviction_date',null],['ia_901c3_alias_count',undefined]]){
    const d=prepare({...answers,[id]:value});assert.equal(d.status,'unknown');assert(d.missingFactIds.includes(id));assert.equal(d.filingReady,false);
  }
});
check('technical refusals remain bounded and held without echoing raw values',()=>{
  for(const a of [{...answers,ia_901c3_first_name:'SECRET'.repeat(20)},{...answers,conviction_date:'PRIVATE INVALID DATE'},{...answers,ia_901c3_filing_method:'PRIVATE INVALID METHOD'}]){
    const d=prepare(a);assert.equal(d.status,'needs_review');assert(!JSON.stringify(d).includes('PRIVATE'));assert(!JSON.stringify(d).includes('SECRET'));
    assert(d.reason.includes('could not be safely validated'));assert(d.reasonEs.includes('No se pudo validar'));
  }
});
check('foreign synthetic/date flags cannot establish server context or change preparation',()=>{
  const legitimate=prepare(answers,{synthetic:false,filingDate:context.filingDate});
  assert.deepEqual(prepare({...answers,synthetic:true,filingDate:'2099-01-01'},{synthetic:false,filingDate:context.filingDate}),legitimate);
  const absent=prepare({...answers,synthetic:false,filingDate:context.filingDate},{});assert.equal(absent.status,'needs_review');assert.equal(absent.filingReady,false);
});
check('unknown/null permitted metadata is exact and distinct from absence or material uncertainty',()=>{
  const expected=['ia_901c3_birth_date','ia_901c3_driver_license','ia_901c3_address','ia_901c3_city','ia_901c3_state','ia_901c3_zip','ia_901c3_phone','ia_901c3_email','ia_901c3_history_availability','ia_901c3_history_release_signed','ia_901c3_recipient_known'];
  assert.deepEqual([...IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS].sort(),expected.sort());
  for(const q of iowaMisdemeanorQuestions({},true))assert.equal(q.allowsExplicitUnknown,expected.includes(q.id));
  for(const id of['financial_obligations','pending_cases','ia_901c3_prior_grant','conviction_date','ia_901c3_alias_count','ia_901c3_ssn'])assert(!IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS.includes(id));
  const a={...answers};delete a.ia_901c3_birth_date;assert(prepare(a).missingFactIds.includes('ia_901c3_birth_date'));
});
check('explicit nullable/contact/history/recipient states do not become universal preparation blocks',()=>{
  const a={...answers};for(const id of IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS)a[id]=null;
  const d=prepare(a);assert.equal(d.status,'qualifying');assert.equal(d.filingReady,false);assert.equal(d.externalHistoryIncluded,false);
  const f=decode(a).facts;assert.equal(f.dob,null);assert.equal(f.countyAttorney,null);assert.equal(f.historyReport.availability,'unknown');assert.equal(f.historyReport.releaseSigned,null);
  for(const h of['requested','not_requested','unknown'])assert.equal(prepare({...answers,ia_901c3_history_availability:h}).status,'qualifying');
});
check('source-linked manual instructions preserve lifetime, actualopposition/immigration and filing tasks',()=>{
  const d=prepare(answers);assert.equal(d.instructions,IOWA_MISDEMEANOR_FILING_TASKS);
  assert(fs.existsSync(d.instructions.instructionSource));assert.equal(d.instructions.memoTrackId,'ia-901c3');
  assert.equal(d.instructions.en.length,d.instructions.es.length);
  for(const phrase of['single-lifetime','items 3, 4 and 8','actual returned DCI','only after actual service','actual opposition','immigration consequences'])assert(d.instructions.en.join(' ').includes(phrase));
  for(const phrase of['oportunidad durante su vida','puntos 3, 4 y 8','informe DCI real','oposición real','consecuencias migratorias'])assert(d.instructions.es.join(' ').includes(phrase));
});
// Independent adopted expectations, not read back from the repaired guard list.
const adoptedExclusions=JSON.stringify(JSON.parse(fs.readFileSync('data/record-clearing/legal-design-intake/IA.memo.json')).tracks.find(t=>t.trackId==='ia-901c3').exclusions);
for(const[section,adoptedText,status]of[
  ['235b.20','235B.20','attorney_review'],['321j.2','321J.2','excluded'],['708.2a','708.2A','excluded'],
  ['321a.32','321A.32','excluded'],['717c.1','chapter 717C','excluded'],['901a.1','chapter 901A','excluded']
])check('adopted exclusion survives lowercase citation '+section,()=>{
  assert(adoptedExclusions.includes(adoptedText));
  const input={...structuredClone(frozen),offense:{section,title:'Synthetic exclusion-boundary probe'}};
  assert(outcome(oracle.validateFacts,input).value,'exact baseline accepted lowercase citation before repair');
  assert.throws(()=>validateFacts(input),/excluded or retained conservative source category/);
  const uppercase={...input,offense:{...input.offense,section:section.toUpperCase()}};
  assert.deepEqual(outcome(validateFacts,uppercase),outcome(oracle.validateFacts,uppercase));
  const d=prepare({...answers,ia_901c3_offense_section:section});assert.equal(d.status,status);assert.equal(d.filingReady,false);
  if(section==='235b.20'){assert(d.reason.includes('form and statutory'));assert(d.reasonEs.includes('formulario oficial'));}
});
check('case guard preserves raw accepted citation instead of rewriting a participant fact',()=>{
  // Format-preservation probe only, not an assertion that this is a qualifying
  // court case or a reviewed packet variant.
  const input={...structuredClone(frozen),offense:{section:'321a.2(1)',title:'Synthetic syntax-preservation probe'}};
  const v=validateFacts(input);assert.equal(v.facts.offense.section,'321a.2(1)');assert.equal(input.offense.section,'321a.2(1)');
});
console.log(`${checks}/${checks} IA901C.3 native extraction/transport/preparation controls passed. Existing validation preserved except the demonstrated citation-case exclusion repair; native writer/official form and retained artifacts unchanged; no new render, legal adoption, shared integration or commercial proof.`);
