import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {register} from 'node:module';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
register(pathToFileURL(path.join(root,'scripts/lib/ts-esm-loader.mjs')));
const load=p=>import(pathToFileURL(path.join(root,p)));
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await load('src/lib/rcap-engine/public-profile-projection.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const I=await load('src/lib/expungement-ai/research115-intake.ts');
const H=await load('src/lib/rcap-engine/iowa-alcohol-native.mjs');
const {resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const asOf='2026-10-29',profile=getProfileByJurisdiction('IA');
const publicIds=new Set(projectPublicProfile(profile).questions.map(q=>q.id));
const witnesses=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
console.log('LOCAL INTEGRATION TARGET '+execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
let checks=0;
function check(label,fn){try{fn();checks++;console.log('PASS '+label);}catch(error){console.error('FAIL '+label);throw error;}}
const snap=v=>v.draftSnapshot??v.snapshot;
function model(v){const m=P.protectedPacketInformationModelFor(v);assert(m,'Held factual editor must remain available');return m;}
function save(previous,answers){const before=JSON.stringify(previous),p=P.packetInformationPatch({protectedVerification:previous,answers});
 assert.equal(JSON.stringify(previous),before);assert(p?.protectedTransition,'Actual protected correction must produce a transition');
 const next=p.protectedTransition.nextVerification;assert.equal(snap(next).paymentAllowed,false);assert.notEqual(next.status,'verified');return next;}
function collect(previous,desired){let next=previous;for(let round=0;round<5;round++){
 const m=model(next),active=new Set(m.questions.map(q=>q.id)),offered=Object.fromEntries(Object.entries(desired).filter(([id,v])=>active.has(id)&&JSON.stringify(m.initialAnswers[id])!==JSON.stringify(v)));
 if(!Object.keys(offered).length)return next;next=save(next,offered);
 }throw Error('Ordinary dynamic material intake did not converge');}
const nativeBase={synthetic:false,name:'Avery Jordan Example',county:'Johnson',caseNumber:'EXAMPLE-INT-100001',plaintiff:'State of Iowa',
 convictionDate:'2022-01-15',filingDate:asOf,disposition:'conviction',proceeding:'district_court',
 offense:{kind:'statute',citation:'123.46(2)',equivalentTo:'123.46',confirmation:true},laterConvictions:[],historyComplete:true,
 selfRepresented:true,convictionStatementConfirmed:true,cleanPeriodStatementConfirmed:true,acknowledgedCopy:true,acknowledgedConfidential:true,
 courtDebtBalanceStatus:'unpaid',filingMethod:'paper',countyAttorney:{name:'Johnson County Attorney',address:'500 S. Clinton Street, Suite 400',city:'Iowa City',state:'IA',zip:'52244-2450'},
 address:'100 Example Lane',city:'Iowa City',state:'IA',zip:'52240',phone:'3195550101',email:'avery.example@example.org'};
// Independent literal wire facts: do not derive expected results from the
// adapter's mapping, returned model defaults or any generated PDF.
const wireBase={participant_full_legal_name:'Avery Jordan Example',county:'Johnson',case_identifier:'EXAMPLE-INT-100001',ia_alcohol_plaintiff:'State of Iowa',
 conviction_date:'2022-01-15',ia_alcohol_address:'100 Example Lane',ia_alcohol_city:'Iowa City',ia_alcohol_state:'IA',ia_alcohol_zip:'52240',
 ia_alcohol_phone:'3195550101',ia_alcohol_email:'avery.example@example.org',ia_alcohol_disposition:'conviction',ia_alcohol_proceeding:'district_court',
 ia_alcohol_offense_kind:'statute',ia_alcohol_offense_citation:'123.46(2)',ia_alcohol_equivalent_to:'123.46',ia_alcohol_offense_checked:'Yes',
 ia_alcohol_self_represented:'Yes',ia_alcohol_history_complete:'Yes',ia_alcohol_conviction_checked:'Yes',ia_alcohol_period_checked:'Yes',
 ia_alcohol_ack_copy:'Yes',ia_alcohol_ack_confidential:'Yes',ia_alcohol_later_count:'0',ia_alcohol_filing_method:'paper',
 ia_alcohol_recipient_known:'Yes',ia_alcohol_recipient_name:'Johnson County Attorney',ia_alcohol_recipient_address:'500 S. Clinton Street, Suite 400',
 ia_alcohol_recipient_city:'Iowa City',ia_alcohol_recipient_state:'IA',ia_alcohol_recipient_zip:'52244-2450'};
const cases=[
 {route:'IA:public-intoxication-12346',form:3,age:'30',native:structuredClone(nativeBase),wire:structuredClone(wireBase)},
 {route:'IA:underage-alcohol-12347',form:4,age:'19',native:{...structuredClone(nativeBase),name:'Dana Willow Example',county:'Linn',caseNumber:'EXAMPLE-PAULA-200002',
  offense:{kind:'statute',citation:'123.47(3)',equivalentTo:'123.47',confirmation:true},address:'22 Synthetic Terrace',city:'Cedar Rapids',zip:'52401',email:'dana.example@example.org',
  countyAttorney:{name:'Linn County Attorney',address:'51 Third Avenue Bridge',city:'Cedar Rapids',state:'IA',zip:'52401'}},
  wire:{...wireBase,participant_full_legal_name:'Dana Willow Example',county:'Linn',case_identifier:'EXAMPLE-PAULA-200002',ia_alcohol_offense_citation:'123.47(3)',ia_alcohol_equivalent_to:'123.47',
   ia_alcohol_address:'22 Synthetic Terrace',ia_alcohol_city:'Cedar Rapids',ia_alcohol_zip:'52401',ia_alcohol_email:'dana.example@example.org',
   ia_alcohol_recipient_name:'Linn County Attorney',ia_alcohol_recipient_address:'51 Third Avenue Bridge',ia_alcohol_recipient_city:'Cedar Rapids',ia_alcohol_recipient_zip:'52401'}}
];
function components(m,form,paper=true){
 assert.equal(m.expectedComponents.length,paper?3:2);assert(m.expectedComponents[0].includes('Rule 2.86 Form '+form));
 assert(m.expectedComponents[0].includes('both pages'));assert(!m.expectedComponents.some(s=>s.includes('Rule 2.86 Form '+(form===3?4:3))));
 assert(m.expectedComponents.at(-1).includes('Participant instructions'));
 if(paper)assert(m.expectedComponents[1].includes('left unsigned until actual service'));
 else assert(!m.expectedComponents.some(s=>s.includes('paper-service certification')));
 for(const component of m.expectedComponents)assert.notEqual(resolveRuntimeText('es',component),component);
}
const completed=new Map();
for(const c of cases){
 const witness=witnesses.find(w=>w.pathwayKey===c.route);assert(witness);
 const publicAnswers={...Object.fromEntries(Object.entries(witness.finalAnswers).filter(([id])=>publicIds.has(id))),ownership_scope:'Yes',case_outcome:'Misdemeanor conviction',age_at_offense:c.age,
  prior_relief:'No',county:c.wire.county,court:'Iowa District Court for '+c.wire.county+' County',case_identifier:c.wire.case_identifier,charge:c.wire.ia_alcohol_offense_citation,
  conviction_date:'2022-01-15',disposition_date:'2022-01-15',sentence_completion_date:'Yes',sentence_completion_actual_date:'2022-01-15',
  financial_obligations:'No',pending_cases:'No',new_convictions_during_waiting_period:'No'};
 const start=(answers=publicAnswers)=>{
  const a=evaluate({jurisdiction:'IA',profileVersion:profile.profileVersion,matterId:'synthetic-'+c.route,answers});
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:asOf+'T00:00:00.000Z'});assert(seed);
  return{authoritative:a,record:{status:'unverified',reason:'synthetic_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot}};};
 const {record:original,authoritative}=start();const gate=v=>I.research115Eligibility(c.route,model(v).initialAnswers,asOf);
 let complete;
 check(c.route+' actual witness seeds an editable held model',()=>{
  assert.equal(authoritative.evaluation.pathwayId,c.route.slice(3));assert.equal(authoritative.evaluation.paymentAllowed,false);
  assert(model(original).questions.some(q=>q.id==='ia_alcohol_later_count'));assert.deepEqual(model(original).expectedComponents,[]);
 });
 check(c.route+' ordinary saves match independently frozen native facts',()=>{
  complete=collect(original,c.wire);const m=model(complete),d=H.iowaAlcoholFactsFromAnswers(c.route,m.initialAnswers,{synthetic:false,filingDate:asOf});
  assert.deepEqual(d.missingFactIds,[]);assert.deepEqual(d.facts,c.native);assert.equal(gate(complete).status,'qualifying');
  assert.equal(gate(complete).scope,'SUPPORTED_DRAFT_PREPARATION_ONLY');assert.equal(gate(complete).filingReady,false);components(m,c.form);
  assert.equal(I.constrainResearch115Evaluation(authoritative,c.route,m.initialAnswers,asOf),authoritative);
  assert.notEqual(complete.status,'verified');assert.equal(snap(complete).paymentAllowed,false);completed.set(c.route,complete);
 });
 for(const[label,patch,status]of[
  ['wrong disposition',{ia_alcohol_disposition:'dismissed'},'excluded'],
  ['wrong exact statute',{ia_alcohol_offense_citation:c.form===3?'123.47(3)':'123.47'},'excluded'],
  ['before two years',{conviction_date:'2024-10-30'},'not_yet'],['exact two years',{conviction_date:'2024-10-29'},'qualifying'],
  ['after two years',{conviction_date:'2024-10-28'},'qualifying'],['leap anniversary',{conviction_date:'2024-02-29'},'needs_review']
 ])check(c.route+' actual saved '+label,()=>{
  const next=save(complete,patch),g=gate(next);assert.equal(g.status,status);assert.equal(g.filingReady,false);assert.equal(resolveRuntimeText('es',g.reason),g.reasonEs);
  if(status!=='qualifying')assert.deepEqual(model(next).expectedComponents,[]);
 });
 check(c.route+' absent and unknown balances remain optional context, not payment prerequisites',()=>{
  const selected=model(complete),question=selected.questions.find(q=>q.id==='financial_obligations');
  assert(!selected.requiredInputIds.includes('financial_obligations'),'Legacy requiredInputIds must not retain the optional balance');
  assert(!selected.missingInputIds.includes('financial_obligations'));
  if(question){assert.equal(question.required,false);assert.equal(question.contextOnly,true);assert.equal(question.lifecyclePhase,'optional_or_later');}
  const answers={...publicAnswers};delete answers.financial_obligations;
  const absent=collect(start(answers).record,c.wire),m=model(absent);assert.equal(gate(absent).status,'qualifying');assert(!m.missingInputIds.includes('financial_obligations'));
  assert.equal(H.iowaAlcoholFactsFromAnswers(c.route,m.initialAnswers,{synthetic:false,filingDate:asOf}).facts.courtDebtBalanceStatus,'unknown');
  for(const value of ['Yes','I am not sure']){const next=save(complete,{financial_obligations:value});assert.equal(gate(next).status,'qualifying');assert(!model(next).missingInputIds.includes('financial_obligations'));}
 });
 check(c.route+' required history unknown stays missing, never an empty clean list',()=>{
  const value={unknown:true,value:'0'},next=save(complete,{ia_alcohol_later_count:value}),m=model(next),g=gate(next);
  assert.deepEqual(snap(next).packetAnswers.ia_alcohol_later_count,value);assert.equal(g.status,'unknown');assert(g.missingFactIds.includes('ia_alcohol_later_count'));
  assert(m.missingInputIds.includes('ia_alcohol_later_count'));assert.deepEqual(m.expectedComponents,[]);
 });
 check(c.route+' actual history rows enforce traffic, chronology and later-conviction boundaries',()=>{
  const selected=save(complete,{ia_alcohol_later_count:'1'});assert.equal(gate(selected).status,'unknown');assert(model(selected).questions.some(q=>q.id==='ia_alcohol_later_1_date'));
  const traffic=collect(selected,{ia_alcohol_later_1_date:'2023-01-01',ia_alcohol_later_1_citation:'321.285',ia_alcohol_later_1_kind:'chapter_321_simple',ia_alcohol_later_1_category_checked:'Yes'});
  assert.equal(gate(traffic).status,'qualifying');components(model(traffic),c.form);
  assert.equal(gate(save(traffic,{ia_alcohol_later_1_citation:'321J.2'})).status,'needs_review');
  const criminal=save(traffic,{ia_alcohol_later_1_citation:'714.2(5)',ia_alcohol_later_1_kind:'other'});assert.equal(gate(criminal).status,'excluded');
  assert.equal(gate(save(criminal,{ia_alcohol_later_1_date:'2024-01-15'})).status,'needs_review');
  assert.equal(gate(save(criminal,{ia_alcohol_later_1_date:'2025-01-01'})).status,'qualifying');
  const unknown=save(traffic,{ia_alcohol_later_1_date:{unknown:true,value:'2023-01-01'}});assert.equal(gate(unknown).status,'unknown');assert(gate(unknown).missingFactIds.includes('ia_alcohol_later_1_date'));
  const cleared=save(traffic,{ia_alcohol_later_count:'0'});assert.equal(snap(cleared).packetAnswers.ia_alcohol_later_1_citation,'321.285');
  assert(!model(cleared).questions.some(q=>q.id==='ia_alcohol_later_1_date'));assert.equal(gate(cleared).status,'qualifying');
 });
 check(c.route+' explicit nullable unknowns survive actual saves and do not require a new DCI packet',()=>{
  const answers={};for(const id of H.IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS)answers[id]={unknown:true,value:id==='ia_alcohol_recipient_known'?'Yes':'retained contact'};
  const next=save(complete,answers),m=model(next);assert.equal(gate(next).status,'qualifying');
  for(const[id,value]of Object.entries(answers)){assert.deepEqual(snap(next).packetAnswers[id],value);assert(!m.missingInputIds.includes(id));}
  const d=H.iowaAlcoholFactsFromAnswers(c.route,m.initialAnswers,{synthetic:false,filingDate:asOf});assert.equal(d.facts.address,null);assert.equal(d.facts.countyAttorney,null);
 });
 check(c.route+' bare local Yes cannot supply an unestablished record equivalence',()=>{
  const unknown=save(complete,{ia_alcohol_offense_kind:'local_equivalent',ia_alcohol_offense_citation:'Recorded local alcohol ordinance',ia_alcohol_equivalent_to:{unknown:true,value:c.native.offense.equivalentTo}});
  assert.equal(gate(unknown).status,'unknown');assert(gate(unknown).missingFactIds.includes('ia_alcohol_equivalent_to'));
  const patch=P.packetInformationPatch({protectedVerification:unknown,answers:{ia_alcohol_equivalent_to:'Yes'}}),next=patch?.protectedTransition?.nextVerification??unknown;
  assert.equal(gate(next).status,'unknown');assert(gate(next).missingFactIds.includes('ia_alcohol_equivalent_to'));
  assert.equal(snap(next).paymentAllowed,false,'An invalid choice can never establish ordinance equivalence or payment authority');
 });
 check(c.route+' electronic service changes only its task, keeping both official pages',()=>{
  const next=save(complete,{ia_alcohol_filing_method:'efile'});assert.equal(gate(next).status,'qualifying');components(model(next),c.form,false);
  assert.equal(snap(next).packetAnswers.ia_alcohol_recipient_name,c.wire.ia_alcohol_recipient_name);
  assert(!model(next).questions.some(q=>q.id==='ia_alcohol_recipient_name'));
 });
 check(c.route+' foreign authority and private identifiers cannot be saved or sent to native facts',()=>{
  const next=save(complete,{ia_alcohol_email:c.form===3?'avery.updated@example.org':'dana.updated@example.org',ssn:'123456789',social_security_number:'123456789',
   ia_alcohol_ssn:'123456789',date_of_birth:'1900-01-01',legalSignoffStatus:'signed_off',paymentAllowed:true,synthetic:true,filingDate:'2099-01-01',jurisdiction:'NV',pathwayId:'other'});
  for(const id of ['ssn','social_security_number','ia_alcohol_ssn','date_of_birth','legalSignoffStatus','paymentAllowed','synthetic','filingDate','jurisdiction','pathwayId'])assert(!Object.hasOwn(snap(next).packetAnswers,id));
  assert(!JSON.stringify(snap(next)).includes('123456789'));assert.equal(snap(next).pathwayId,c.route.slice(3));assert.equal(gate(next).status,'qualifying');
  const facts=H.iowaAlcoholFactsFromAnswers(c.route,model(next).initialAnswers,{synthetic:false,filingDate:asOf}).facts;
  assert(!Object.hasOwn(facts,'ssn'));assert(!Object.hasOwn(facts,'dob'));
 });
 check(c.route+' repeated held save creates no new authority or changed facts',()=>{
  const patch=P.packetInformationPatch({protectedVerification:complete,answers:{ia_alcohol_later_count:'0'}}),next=patch?.protectedTransition?.nextVerification??complete;
  assert.deepEqual(next,complete);assert.equal(snap(next).paymentAllowed,false);assert.notEqual(next.status,'verified');
 });
 check(c.route+' ownership hard stop cannot be loosened by complete native facts',()=>{
  const stopped=evaluate({jurisdiction:'IA',profileVersion:profile.profileVersion,matterId:'synthetic-stop-'+c.form,answers:{...publicAnswers,ownership_scope:'No'}});
  assert.equal(stopped.evaluation.resultCode,'hard_stop');assert.equal(I.constrainResearch115Evaluation(stopped,c.route,c.wire,asOf),stopped);
 });
}
check('exact route identity separates both products and preserves each participant snapshot',()=>{
 const first=completed.get(cases[0].route),second=completed.get(cases[1].route);assert.equal(model(first).initialAnswers.participant_full_legal_name,'Avery Jordan Example');
 assert.equal(model(second).initialAnswers.participant_full_legal_name,'Dana Willow Example');
 assert.equal(I.research115Eligibility(cases[0].route,model(second).initialAnswers,asOf).status,'excluded');
 assert.equal(I.research115Eligibility(cases[1].route,model(first).initialAnswers,asOf).status,'excluded');
 assert.equal(I.research115Eligibility(cases[0].route+'-other',model(first).initialAnswers,asOf),null);
});
console.log(`${checks}/${checks} HG008/HG009 actual protected seed/model/save controls passed. Local integration only; no Form4 renderer, packet-generation, authentication, entitlement consumption, delivery or production proof.`);
