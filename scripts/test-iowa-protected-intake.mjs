import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';

// Run from the repository under review. This permits a test-only worktree to
// exercise the coordinator's frozen source without copying or modifying it.
const root=process.cwd();
register(pathToFileURL(path.join(root,'scripts/lib/ts-esm-loader.mjs')));
const load=p=>import(pathToFileURL(path.join(root,p)));
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await load('src/lib/rcap-engine/public-profile-projection.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const I=await load('src/lib/expungement-ai/research115-intake.ts');
const H=await load('src/lib/rcap-engine/iowa-misdemeanor-native.mjs');
const {resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const route='IA:misdemeanor-901c3', asOf='2026-10-29';
console.log('LOCAL INTEGRATION TARGET '+execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
let checks=0;
function check(label,fn){try{fn();checks++;console.log('PASS '+label);}catch(error){console.error('FAIL '+label);throw error;}}
const profile=getProfileByJurisdiction('IA'),publicIds=new Set(projectPublicProfile(profile).questions.map(q=>q.id));
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w=>w.pathwayKey===route);
assert(witness,'Exact existing HG007 route witness required');
const publicAnswers={...Object.fromEntries(Object.entries(witness.finalAnswers).filter(([id])=>publicIds.has(id))),
  ownership_scope:'Yes',case_outcome:'Misdemeanor conviction',age_at_offense:'30',prior_relief:'No',
  county:'Johnson',court:'Iowa District Court for Johnson County',charge:'Theft in the fifth degree under Iowa Code714.2(5)',
  case_identifier:'EXAMPLE-901C3-0001',conviction_date:'2017-09-06',disposition_date:'2017-09-06',
  financial_obligations:'Yes',pending_cases:'No',new_convictions_during_waiting_period:'No',
  sentence_completion_date:'Yes',sentence_completion_actual_date:'2017-09-06'};
// Frozen, independent native expectation. It is not assembled from the new
// adapter, model defaults, returned PDF, or inventory witness mappings.
const expectedNative={synthetic:false,name:{first:'Avery',middle:'Jordan',last:'Example'},aliases:[],county:'Johnson',
  caseNumber:'EXAMPLE-901C3-0001',plaintiff:'State of Iowa',dob:'1988-04-12',driversLicense:'EXAMPLE0001',ssn:null,
  address:'100 Example Lane',city:'Iowa City',state:'IA',zip:'52240',phone:'3195550101',email:'avery.example@example.org',
  convictionDate:'2017-09-06',filingDate:asOf,offense:{section:'714.2(5)',title:'Theft in the fifth degree'},
  misdemeanorConviction:true,deferredJudgmentDisposition:false,hasPrior901c3Grant:false,hasOtherEligibleConvictions:false,
  relatedCases:[],pendingCharges:false,deferredJudgmentProceedings:0,financialObligationsPaid:true,exclusionsReviewed:true,
  comparabilityUncertain:false,sexOffense:false,selfRepresented:true,filingMethod:'paper',
  countyAttorney:{name:'Johnson County Attorney',address:'500 S. Clinton Street, Suite 400',city:'Iowa City',state:'IA',zip:'52244-2450'},
  historyReport:{availability:'available',issuedOn:'2026-10-01',releaseSigned:true},
  acknowledgments:{copy:true,related:true,lifetime:true,confidential:true}};
const sourceFacts={
  ia_901c3_first_name:'Avery',ia_901c3_last_name:'Example',ia_901c3_has_middle:'Yes',ia_901c3_middle_name:'Jordan',
  ia_901c3_alias_count:'0',county:'Johnson',case_identifier:'EXAMPLE-901C3-0001',ia_901c3_plaintiff:'State of Iowa',
  ia_901c3_birth_date:'1988-04-12',ia_901c3_driver_license:'EXAMPLE0001',ia_901c3_address:'100 Example Lane',
  ia_901c3_city:'Iowa City',ia_901c3_state:'IA',ia_901c3_zip:'52240',ia_901c3_phone:'3195550101',
  ia_901c3_email:'avery.example@example.org',conviction_date:'2017-09-06',ia_901c3_offense_section:'714.2(5)',
  ia_901c3_offense_title:'Theft in the fifth degree',ia_901c3_misdemeanor_conviction:'Yes',
  ia_901c3_deferred_disposition:'No',ia_901c3_prior_grant:'No',ia_901c3_other_convictions:'No',
  ia_901c3_related_cases:'No',pending_cases:'No',financial_obligations:'Yes',ia_901c3_deferred_count:'0',
  ia_901c3_exclusions_reviewed:'Yes',ia_901c3_comparability_uncertain:'No',ia_901c3_sex_offense:'No',
  ia_901c3_self_represented:'Yes',ia_901c3_filing_method:'paper',ia_901c3_ack_copy:'Yes',
  ia_901c3_ack_related:'Yes',ia_901c3_ack_lifetime:'Yes',ia_901c3_ack_confidential:'Yes',
  ia_901c3_history_availability:'available',ia_901c3_history_issued:'2026-10-01',ia_901c3_history_release_signed:'Yes',
  ia_901c3_recipient_known:'Yes',ia_901c3_recipient_name:'Johnson County Attorney',
  ia_901c3_recipient_address:'500 S. Clinton Street, Suite 400',ia_901c3_recipient_city:'Iowa City',
  ia_901c3_recipient_state:'IA',ia_901c3_recipient_zip:'52244-2450'};
const authoritative=evaluate({jurisdiction:'IA',profileVersion:profile.profileVersion,matterId:'synthetic-HG007-native',answers:publicAnswers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:publicAnswers,dependencies:{},capturedAt:asOf+'T00:00:00.000Z'});
assert(seed);
const original={status:'unverified',reason:'synthetic_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
const snap=v=>v.draftSnapshot??v.snapshot;
function model(v){const m=P.protectedPacketInformationModelFor(v);assert(m,'Existing held draft must retain its factual editor');return m;}
function save(previous,answers){
  const before=JSON.stringify(previous),patch=P.packetInformationPatch({protectedVerification:previous,answers});
  assert.equal(JSON.stringify(previous),before,'Patch must not mutate prior protected state');
  assert(patch?.protectedTransition,'Actual packetInformationPatch must accept the offered material correction');
  const next=patch.protectedTransition.nextVerification;
  assert.equal(snap(next).paymentAllowed,false);assert.notEqual(next.status,'verified');return next;
}
// Follow actual dynamic UI visibility. Initial parent selections cannot grant
// permission to save not-yet-visible alias/recipient/middle-name fields.
function collect(previous,desired){
  let next=previous;
  for(let round=0;round<5;round++){
    const m=model(next),active=new Set(m.questions.map(q=>q.id));
    const offered=Object.fromEntries(Object.entries(desired).filter(([id,value])=>active.has(id)&&JSON.stringify(m.initialAnswers[id])!==JSON.stringify(value)));
    if(!Object.keys(offered).length)return next;
    next=save(next,offered);
  }
  throw Error('Dynamic source facts did not converge through five ordinary saves');
}
const gate=v=>I.research115Eligibility(route,model(v).initialAnswers,asOf);
const form='Official Iowa Rule 2.86 Form 2 application, all three pages';
const guide='Participant instructions for private completion and obtaining the actual DCI report separately';
const service='Embedded paper-service certification, left unsigned until actual service';
const aliases='Additional alias continuation sheet';
let complete;
check('held public witness seeds an editable actual HG007 protected model',()=>{
  assert.equal(authoritative.evaluation.pathwayId,'misdemeanor-901c3');assert.equal(authoritative.evaluation.paymentAllowed,false);
  assert(!['packet_ready','packet_ready_with_caution'].includes(authoritative.evaluation.resultCode));
  assert(model(original).questions.some(q=>q.id==='ia_901c3_first_name'));
  assert.deepEqual(model(original).expectedComponents,[]);
});
check('ordinary canonical Yes/No saves produce the independent frozen native facts',()=>{
  complete=collect(original,sourceFacts);const m=model(complete),d=H.iowaMisdemeanorFactsFromAnswers(m.initialAnswers,{synthetic:false,filingDate:asOf});
  assert.equal(d.refusal,null);assert.deepEqual(d.missingFactIds,[]);assert.deepEqual(d.facts,expectedNative);
  assert.equal(snap(complete).packetAnswers.ia_901c3_first_name,'Avery');assert.equal(snap(complete).packetAnswers.ia_901c3_prior_grant,'No');
  assert.equal(gate(complete).status,'qualifying');assert.equal(gate(complete).scope,'SUPPORTED_DRAFT_PREPARATION_ONLY');
  assert.equal(gate(complete).filingReady,false);assert.equal(gate(complete).externalHistoryIncluded,false);
});
check('expected components are the existing three-page official form, blank paper service and separate instructions',()=>{
  assert.deepEqual(model(complete).expectedComponents,[form,service,guide]);
  assert(!model(complete).expectedComponents.some(c=>/proposed order|notar|DCI request|payment form/i.test(c)));
  for(const c of model(complete).expectedComponents)assert.notEqual(resolveRuntimeText('es',c),c);
});
check('native preparation success preserves every independent baseline/payment hold',()=>{
  assert.equal(I.constrainResearch115Evaluation(authoritative,route,model(complete).initialAnswers,asOf),authoritative);
  assert.equal(snap(complete).paymentAllowed,false);assert.notEqual(complete.status,'verified');
  assert.notEqual(model(complete).stage,'ready_to_generate');
});
for(const[label,patch,status]of[
  ['prior grant',{ia_901c3_prior_grant:'Yes'},'excluded'],
  ['lowercase excluded',{ia_901c3_offense_section:'708.2a'},'excluded'],
  ['lowercase source discrepancy',{ia_901c3_offense_section:'235b.20'},'attorney_review'],
  ['before eight years',{conviction_date:'2018-10-30'},'not_yet'],
  ['exact eight years',{conviction_date:'2018-10-29'},'qualifying'],
  ['after eight years',{conviction_date:'2018-10-28'},'qualifying'],
  ['unpaid',{financial_obligations:'No'},'not_yet'],
  ['pending',{pending_cases:'Yes'},'not_yet']
])check('actual saved '+label+' retains native result and bilingual copy',()=>{
  const next=save(complete,patch),g=gate(next);assert.equal(g.status,status);
  assert.equal(resolveRuntimeText('es',g.reason),g.reasonEs);assert.equal(g.filingReady,false);assert.equal(snap(next).paymentAllowed,false);
  if(status!=='qualifying')assert.deepEqual(model(next).expectedComponents,[]);
  if(label==='exact eight years'){assert.equal(g.exactAnniversary,true);assert(g.reason.includes('item 6 left blank'));}
});
check('absent material answers remain missing before a full save',()=>{
  const g=gate(original);assert.equal(g.status,'unknown');assert(g.missingFactIds.includes('ia_901c3_prior_grant'));
  assert(model(original).missingInputIds.includes('ia_901c3_prior_grant'));
});
check('actual saved material unknown retains its raw wrapper and cannot qualify',()=>{
  const value={unknown:true,value:'No'},next=save(complete,{ia_901c3_prior_grant:value}),m=model(next),g=gate(next);
  assert.deepEqual(snap(next).packetAnswers.ia_901c3_prior_grant,value);assert.equal(g.status,'unknown');
  assert(g.missingFactIds.includes('ia_901c3_prior_grant'));assert(m.missingInputIds.includes('ia_901c3_prior_grant'));
  assert.equal(m.stage,'in_progress');assert.deepEqual(m.expectedComponents,[]);
});
for(const[id,value]of[
  ['ia_901c3_history_availability',{unknown:true,value:'available'}],
  ['ia_901c3_history_release_signed',{unknown:true,value:'Yes'}],
  ['ia_901c3_recipient_known',{unknown:true,value:'Yes'}],
  ['ia_901c3_birth_date',{unknown:false,value:null}]
])check('actual saved native-permitted unknown/null is preserved '+id,()=>{
  const next=save(complete,{[id]:value}),m=model(next),g=gate(next);
  assert.deepEqual(snap(next).packetAnswers[id],value);assert.equal(g.status,'qualifying');
  assert(!g.missingFactIds.includes(id));assert(!m.missingInputIds.includes(id));
  assert.equal(g.filingReady,false);assert.equal(g.externalHistoryIncluded,false);assert.deepEqual(m.expectedComponents,[form,service,guide]);
});
check('declared nullable direct nulls remain unknown rather than payment or upload prerequisites',()=>{
  const unknowns=Object.fromEntries(H.IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS.map(id=>[id,null]));
  const next=save(complete,unknowns),m=model(next);assert.equal(gate(next).status,'qualifying');
  for(const id of Object.keys(unknowns)){assert.equal(snap(next).packetAnswers[id],null);assert(!m.missingInputIds.includes(id));}
});
check('malformed uncertainty wrappers cannot override an independently excluded or empty prior',()=>{
  const excluded=save(complete,{ia_901c3_prior_grant:'Yes'});
  assert.equal(gate(excluded).status,'excluded');
  const malformed={ia_901c3_prior_grant:{unknown:'true',value:'No'}};
  const patch=P.packetInformationPatch({protectedVerification:excluded,answers:malformed});
  const next=patch?.protectedTransition?.nextVerification??excluded;
  assert.deepEqual(next,excluded,'Rejected malformed input must preserve the complete known excluded draft');
  assert.equal(snap(next).packetAnswers.ia_901c3_prior_grant,'Yes');assert.equal(gate(next).status,'excluded');
  const emptyPatch=P.packetInformationPatch({protectedVerification:original,answers:malformed});
  const empty=emptyPatch?.protectedTransition?.nextVerification??original;
  assert(!Object.hasOwn(snap(empty).packetAnswers,'ia_901c3_prior_grant'));
  assert.equal(gate(empty).status,'unknown');assert(gate(empty).missingFactIds.includes('ia_901c3_prior_grant'));
  assert.equal(snap(empty).paymentAllowed,false);
});
check('conditional actual aliases are collected through their visible controls',()=>{
  let next=save(complete,{ia_901c3_alias_count:'2'});
  assert(model(next).questions.some(q=>q.id==='ia_901c3_alias_2_first'));assert.equal(gate(next).status,'unknown');
  next=collect(next,{ia_901c3_alias_1_first:'AJ',ia_901c3_alias_1_last:'Example',ia_901c3_alias_1_has_middle:'No',
    ia_901c3_alias_2_first:'Avery',ia_901c3_alias_2_last:'Earlier',ia_901c3_alias_2_has_middle:'Yes',ia_901c3_alias_2_middle:'Jordan'});
  assert.equal(gate(next).status,'qualifying');assert.deepEqual(model(next).expectedComponents,[form,aliases,service,guide]);
  const d=H.iowaMisdemeanorFactsFromAnswers(model(next).initialAnswers,{synthetic:false,filingDate:asOf});
  assert.deepEqual(d.facts.aliases,[{first:'AJ',last:'Example',middle:''},{first:'Avery',last:'Earlier',middle:'Jordan'}]);
  next=save(next,{ia_901c3_alias_count:'0'});assert.equal(snap(next).packetAnswers.ia_901c3_alias_2_last,'Earlier');
  assert(!model(next).questions.some(q=>q.id==='ia_901c3_alias_2_last'));assert.deepEqual(model(next).expectedComponents,[form,service,guide]);
});
check('electronic filing keeps all three official pages and removes only the paper-service task',()=>{
  const next=save(complete,{ia_901c3_filing_method:'efile'}),m=model(next);
  assert.equal(gate(next).status,'qualifying');assert.deepEqual(m.expectedComponents,[form,guide]);
  assert.equal(snap(next).packetAnswers.ia_901c3_recipient_name,'Johnson County Attorney');
  assert(!m.questions.some(q=>q.id==='ia_901c3_recipient_name'));
  assert.equal(H.iowaMisdemeanorFactsFromAnswers(m.initialAnswers,{synthetic:false,filingDate:asOf}).facts.countyAttorney,null);
});
check('foreign SSN, approvals and route authority are not writable through the actual save',()=>{
  const next=save(complete,{ia_901c3_first_name:'Avery',ia_901c3_offense_title:'Theft in the fifth degree (record checked)',
    ia_901c3_ssn:'123456789',social_security_number:'123456789',ssn:'123456789',legalSignoffStatus:'signed_off',
    paymentAllowed:true,synthetic:true,filingDate:'2099-01-01',jurisdiction:'NV',pathwayId:'other'});
  for(const id of['ia_901c3_ssn','social_security_number','ssn','legalSignoffStatus','paymentAllowed','synthetic','filingDate','jurisdiction','pathwayId'])assert(!Object.hasOwn(snap(next).packetAnswers,id));
  assert(!JSON.stringify(snap(next)).includes('123456789'));assert.equal(snap(next).jurisdiction,'IA');assert.equal(snap(next).pathwayId,'misdemeanor-901c3');
  assert.equal(H.iowaMisdemeanorFactsFromAnswers(model(next).initialAnswers,{synthetic:false,filingDate:asOf}).facts.ssn,null);
});
check('ownership stop cannot be relaxed by valid native preparation facts',()=>{
  const stopped=evaluate({jurisdiction:'IA',profileVersion:profile.profileVersion,matterId:'synthetic-HG007-owner-stop',answers:{...publicAnswers,ownership_scope:'No'}});
  assert.equal(stopped.evaluation.resultCode,'hard_stop');assert.equal(I.constrainResearch115Evaluation(stopped,route,sourceFacts,asOf),stopped);
});
console.log(`${checks}/${checks} HG007 actual protected seed/model/save controls passed. Local integration only; no renderer, provider, authentication, payment, delivery or production acceptance claimed.`);
