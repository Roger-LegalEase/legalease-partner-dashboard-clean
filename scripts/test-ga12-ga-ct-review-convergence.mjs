// GA-12 Q-2d80a89dd926657a1873 / Q-d33e933319baaaaf750b / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {register} from 'node:module';
process.env.RCAP_EVALUATOR_TODAY='2026-07-01';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 disposition_correction:['outstanding.push(...reviewInputIds(["case_outcome"], false));',''],
 repeated_invalid:['if (gaCtFactIds.includes(id)','if (false','packet-information.ts'],
 correction_delta:['delete initialAnswers[id];\n            const question = questionSurface.questionById.get(id);','const question = questionSurface.questionById.get(id);','packet-information.ts'],
 disposition_history:['return [...extra, "case_outcome", ...CT_PETITION_FACT_IDS','return [...extra, ...CT_PETITION_FACT_IDS','packet-information.ts'],
 protected_projection:['if (sourceFacts?.code === "missing")','if (false)','packet-information.ts'],
 predecessor:['if (gaCtSourceFactReview &&','if (false &&','packet-information.ts'],
 correction_surface:['if (gaCtSourceFactReview)','if (false)','packet-information.ts'],
 nonconviction_validity:['questionAnswerState(question, request.answers.case_outcome) === "known_valid"','true'],
 source_validity:['if (missing && state === "known_valid"','if (false && state === "known_valid"'],
 nonconviction:['if (nonconviction)','if (false)'],
 settled:['const outstanding = reviewInputIds(facts.ids, facts.code === "missing");','const outstanding = facts.ids;'],
 blank:['return state === "unanswered" || state === "invalid";','return false;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent('let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith("/"+(m[2]??"evaluator.ts"))){if(!r.source.includes(m[0]))throw Error("mutation target absent");return {...r,source:r.source.replaceAll(m[0],m[1])}}return r}'),{data:mutations[mutation]});}
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const publicAPI=await import('../src/app/api/expungement-ai/evaluate/route.ts');
const C=await import('../src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts');
const G=await import('../src/lib/rcap-engine/georgia-sb288-facts.ts');
const ledger=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json'));
const source=fs.readFileSync('scripts/generate-rcap-public-witness-answer-sets.mjs','utf8');
const ast=ts.createSourceFile('generator.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=name=>{const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node);return node.getText(ast);};
const converge=new Function('evaluateAuthoritativeScreeningResult','CLEAR_RECORD',declaration('answerFor')+'\n'+declaration('converge')+'\nreturn converge;')(evaluate,ledger.determinism.clearRecord);
const projection=e=>({resultCode:e.resultCode,pathwayId:e.pathwayId??null,pathwayLabel:e.pathwayLabel??null,paymentAllowed:e.paymentAllowed===true,treatmentClassification:e.treatmentClassification??null,selectedTrackId:e.selectedTrackId??null,reasonCodes:e.reasons.map(r=>r.code).sort(),missingQuestionIds:[...e.missingQuestionIds].sort()});
let checks=0,failures=0;
function check(name,fn){try{fn();checks++;console.log(JSON.stringify({case:name,status:'PASS'}));}catch(e){failures++;console.error(JSON.stringify({failedCheck:name,assertion:e.message,actual:e.actual,expected:e.expected}));if(mutation)throw e;}}
const allFixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
// Captured from c98; these immutable hashes prove that the reconstructed held drafts are the actual predecessors.
const predecessorCases=[{"state":"GA","id":"case_outcome","raw":"dismissed","draftHash":"3ad7cfbdd6a822ca16895d32d9db433ab45c9b8aa81697648c6eee0b72a0cb31","wasReadable":true},{"state":"GA","id":"case_outcome","raw":["Dismissed, no-billed, nolle prosequi, or not prosecuted"],"draftHash":"052c635427f75c8d4d1f91da2a50f03e158c7a51cccaf7b56954d8aebd9b9d27","wasReadable":false},{"state":"GA","id":"ga_sb288_conviction_count","raw":"0","draftHash":"97afec6d4d877853bdc127c8e3a2a2b3a2a018598e24a4649ea25af4fbb495d3","wasReadable":true},{"state":"GA","id":"ga_sb288_conviction_count","raw":{"value":"1"},"draftHash":"85ebf9cdb6d2b4b83b1fabb184ec5f531c3a3b3437be507bc5c7b21f20f6d26b","wasReadable":true},{"state":"GA","id":"ga_sb288_convictions_before_filing","raw":true,"draftHash":"5788009babd20bcc5e37b724ea6cd89b48338b92d41338abfc2a9b1b67b7765d","wasReadable":true},{"state":"GA","id":"ga_sb288_convictions_before_filing","raw":false,"draftHash":"fdc8dec046f04e6748ec5400d903b7aa69d9e414e0f4b73225665fb5729354f0","wasReadable":true},{"state":"GA","id":"ga_sb288_convictions_before_filing","raw":{"value":"Yes"},"draftHash":"1394bba28e2ca07eafeb3e5703ee6818d8fd50cc70a34e92652dcc87db97acc0","wasReadable":true},{"state":"CT","id":"case_outcome","raw":"dismissed","draftHash":"5e3b8ba5b086991610c5c9587d63d6d305cb4379607c9ee63c95c3f19b727f70","wasReadable":true},{"state":"CT","id":"case_outcome","raw":["Dismissed, no-billed, nolle prosequi, or not prosecuted"],"draftHash":"09d44e6d040faaf5e285140bcecf7d5038be230c22c20c0274f2d14e61bcfbd4","wasReadable":false},{"state":"CT","id":"ct_petition_count","raw":"0","draftHash":"10f52faff71d22fc7cbabfc3c6022bee0f2c36bc011d10be7570a9948d36076f","wasReadable":true},{"state":"CT","id":"ct_petition_count","raw":{"value":"1"},"draftHash":"d6d1ffb8dd67210e55f734e508c89a745181c3acda905c2c21b7fb665094a6d6","wasReadable":true},{"state":"CT","id":"ct_petition_supervision_complete","raw":true,"draftHash":"e9bd08a05dbf539e983165c4f636d1e09ee5be98e04e54aa66c5d80c0e7d5eed","wasReadable":true},{"state":"CT","id":"ct_petition_supervision_complete","raw":false,"draftHash":"3a8a1f067f3f8a1a116f50a72001195b9ef0788e8d2db10dbc3bc17a66f45852","wasReadable":true},{"state":"CT","id":"ct_petition_supervision_complete","raw":{"value":"Yes"},"draftHash":"7cf56e58dca566ddb1d1645526a1da1a2ad2405d416b2f6303a2b8dc9bb8d36c","wasReadable":true}];
for(const [state,route] of [['GA',G.GA_SB288_ROUTE],['CT',C.CT_PETITION_ROUTE]]){
 const w=ledger.witnesses.find(w=>w.pathwayKey===state+':'+route);assert(w);
 const profile=getProfileByJurisdiction(state),pub=projectPublicProfile(profile),questions=new Map();
 function visit(n){if(!n||typeof n!=='object')return;if(n.id&&n.type&&(n.prompt||n.label)&&!questions.has(n.id))questions.set(n.id,n);Object.values(n).forEach(visit);}visit(pub);
 const evalFor=answers=>evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'public-witness',answers});
 check(state+' exact pinned witness round-by-round',()=>{
  const run=converge(state,profile,questions,w.seedAnswers);assert.equal(run.error,null,JSON.stringify(run.unresolvedEvaluation));assert.deepEqual(run.transcript,w.rounds);assert.deepEqual(run.answers,w.finalAnswers);assert.deepEqual(projection(run.evaluation),w.terminalEvaluation);
 });
 for(const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted','Acquitted or found not guilty'])check(state+' nonconviction '+outcome,()=>{
  assert(questions.get('case_outcome').options.includes(outcome));
  const r=evalFor({...w.finalAnswers,case_outcome:outcome}).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.reasons.map(r=>r.code),[state.toLowerCase()+'.waiting_rule_not_executed']);assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);
 });
 const fixture=allFixtures.find(f=>f.pathwayKey===state+':'+route);assert(fixture);
 const base={...fixture.answers,case_outcome:'Misdemeanor conviction',...(state==='GA'?{ga_sb288_conviction_count:'1',ga_sb288_final_citations:'16-8-14',ga_sb288_convictions_before_filing:'No'}:{ct_petition_count:'1',ct_petition_citations:'53a-125b',ct_petition_offense_dates:'1995-02-28',ct_petition_historical_classes:'Class C misdemeanor (recorded)',ct_petition_historical_maxima:'3 months (recorded)',last_conviction_date:'2001-01-02',ct_petition_supervision_complete:'Yes',ct_petition_pending_state_charge:'No'})};
 const id=state==='GA'?'ga_sb288_final_citations':'ct_petition_historical_classes';
 // F1: normalization of malformed labels must not bypass the record review.
 for(const raw of ['Arrest or citation with no charge filed','dismissed',['Dismissed, no-billed, nolle prosequi, or not prosecuted'],{value:'Dismissed, no-billed, nolle prosequi, or not prosecuted',unknown:true}])check(state+' invalid nonconviction cannot use settled shortcut '+JSON.stringify(raw),()=>{
  const r=evalFor({...base,case_outcome:raw}).evaluation;
  assert.notDeepEqual(r.reasons.map(x=>x.code),[state.toLowerCase()+'.waiting_rule_not_executed']);assert.equal(r.paymentAllowed,false);
  if(state==='CT'&&!(raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.unknown===true))assert(r.missingQuestionIds.includes('case_outcome'));
 });
 if(state==='CT')check('CT answered uncertain disposition is held without repeating intake',()=>{
  const r=evalFor({...base,case_outcome:'I am not sure'}).evaluation;assert(!r.missingQuestionIds.includes('case_outcome'));assert.equal(r.paymentAllowed,false);assert.equal(r.resultCode,'needs_review');
 });
 if(state==='CT')for(const [raw,correction]of [[['Dismissed, no-billed, nolle prosequi, or not prosecuted'],true],['dismissed',true],['I am not sure',false],['Misdemeanor conviction',false],['Dismissed, no-billed, nolle prosequi, or not prosecuted',false]]){
  const response=await publicAPI.POST(new Request('http://isolated.invalid/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'TEST-ct-disposition-correction',answers:{...base,case_outcome:raw}})}));
  const result=await response.json();
  check('CT public disposition correction/'+JSON.stringify(raw),()=>{assert.equal(response.status,200);assert.equal(result.missingQuestionIds.includes('case_outcome'),correction);assert.equal(result.paymentAllowed,false);assert.equal(result.consumerPacketAvailable,false);});
 }
 const countId=state==='GA'?'ga_sb288_conviction_count':'ct_petition_count';
 const yesId=state==='GA'?'ga_sb288_convictions_before_filing':'ct_petition_supervision_complete';
 for(const [factId,values]of [[countId,['0',0,'00','01',' 1 ',{value:'1'},'invalid-count']],[yesId,[true,false,'Yes ',{value:'Yes'}]]])for(const raw of values)check(state+' source-invalid shape requests correction '+factId+'/'+JSON.stringify(raw),()=>{
  const a={...base,[factId]:raw};const facts=state==='GA'?G.georgiaSb288Facts(a):C.ctPetitionFacts(a);
  assert.equal(facts.code,'missing');assert(facts.ids.includes(factId));
  const r=evalFor(a).evaluation;assert(r.missingQuestionIds.includes(factId));assert.equal(r.paymentAllowed,false);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(a),screeningAnswers:a,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  assert.deepEqual({...seed.snapshot.screeningAnswers,...seed.snapshot.prefilledAnswers,...seed.snapshot.packetAnswers}[factId],raw);
  const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
  const before=structuredClone(record);
  for(let attempt=0;attempt<3;attempt++){
   const repeat=P.packetInformationPatch({protectedVerification:record,answers:{[factId]:raw}});assert(repeat);
   assert.deepEqual(repeat.protectedTransition.answerDelta,{});assert.deepEqual(repeat.protectedTransition.nextVerification,before);assert.deepEqual(record,before);
  }
  const correction=P.packetInformationPatch({protectedVerification:record,answers:{[factId]:factId===countId?'1':'Yes'}});assert(correction);
  const next=correction.protectedTransition.nextVerification;assert.equal(next.revision,record.revision+1);assert.equal(next.draftSnapshot.paymentAllowed,false);
  assert(next.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===factId&&JSON.stringify(h.value)===JSON.stringify(raw)));
 });
 if(state==='GA')for(const outcome of ['Felony conviction','Other conviction or adjudication','Pardoned conviction'])check('GA supported alternate disposition settles '+outcome,()=>{
  const a={...base,case_outcome:outcome};const r=evalFor(a).evaluation;
  assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);assert(r.reasons.some(x=>x.code==='ga.sb288_classification'));
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(a),screeningAnswers:a,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);assert.equal({...seed.snapshot.screeningAnswers,...seed.snapshot.prefilledAnswers,...seed.snapshot.packetAnswers}.case_outcome,outcome);
  const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
 });

 for(const raw of ['unknown','I am not sure',{unknown:true},{value:base[id],unknown:true}])check(state+' explicit uncertainty '+JSON.stringify(raw),()=>{
  const a={...base,[id]:raw},before=structuredClone(a),r=evalFor(a);assert.equal(r.evaluation.resultCode,'needs_review');assert.deepEqual(r.evaluation.missingQuestionIds,[]);assert.equal(r.evaluation.paymentAllowed,false);assert(r.evaluation.nextSteps.length);assert.deepEqual(a,before);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:r,screeningAnswers:a,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);assert.deepEqual(seed.snapshot.screeningAnswers[id],raw);
 });
 for(const question of (state==='GA'?G.GA_SB288_QUESTIONS:[...C.CT_PETITION_QUESTIONS,pub.questions.find(q=>q.id==='last_conviction_date')]))check(state+' uncertainty is an answer/'+question.id,()=>{
  const raw=question.type==='single_choice'?'I am not sure':{unknown:true};
  const relevant=question.id==='ga_sb288_single_incident'?{ga_sb288_conviction_count:'2',ga_sb288_final_citations:'16-8-14\n16-8-14'}
   :question.id==='ga_sb288_under21_at_arrest'?{ga_sb288_final_citations:'16-5-23(f)'}
   :question.id==='ga_sb288_stalking_family_violence'?{ga_sb288_final_citations:'16-5-90'}
   :question.id==='ct_petition_repeat_14227a'?{ct_petition_citations:'14-227a'}:{};
  const a={...base,...relevant,[question.id]:raw};
  assert(state==='GA'?G.georgiaSb288QuestionApplies(profile,route,a,question.id):C.ctPetitionQuestionApplies(profile,route,a,question.id));
  const facts=state==='GA'?G.georgiaSb288Facts(a):C.ctPetitionFacts(a);assert(facts.ids.includes(question.id));
  const r=evalFor(a).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);
 });
 for(const raw of [undefined,'',[],{unexpected:true}])check(state+' blank or malformed still requires correction '+JSON.stringify(raw),()=>{
  const r=evalFor({...base,[id]:raw}).evaluation;assert(r.missingQuestionIds.includes(id));assert.equal(r.paymentAllowed,false);
 });
 if(state==='CT'){
  check('CT four unknown facts settle with pending charge held',()=>{
   const a={...base,ct_petition_citations:'unknown',ct_petition_historical_classes:'unknown',ct_petition_historical_maxima:'unknown',ct_petition_offense_dates:'unknown',ct_petition_pending_state_charge:'Yes'};
   const r=evalFor(a).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.missingQuestionIds,[]);assert(r.reasons.some(x=>x.code==='ct.petition_missing'));assert.equal(r.paymentAllowed,false);
  });
  for(const patch of [{ct_petition_supervision_complete:'No'},{ct_petition_pending_state_charge:'Yes'},{ct_petition_citations:'14-227a',ct_petition_repeat_14227a:'Yes'}])check('CT answered adverse facts remain held '+JSON.stringify(patch),()=>{
   const r=evalFor({...base,...patch}).evaluation;assert.equal(r.resultCode,'needs_review');assert.equal(r.paymentAllowed,false);assert.deepEqual(r.missingQuestionIds,[]);assert(r.reasons.some(x=>['ct.petition_completion_review','ct.petition_repeat_review'].includes(x.code)));
  });
 }else for(const patch of [{ga_sb288_convictions_before_filing:'Yes'},{ga_sb288_final_citations:'16-5-20(d)',ga_sb288_under21_at_arrest:'No'}])check('GA answered adverse facts remain held '+JSON.stringify(patch),()=>{
  const r=evalFor({...base,...patch}).evaluation;assert.equal(r.resultCode,'needs_review');assert.equal(r.paymentAllowed,false);assert.deepEqual(r.missingQuestionIds,[]);assert(r.reasons.some(x=>['ga.sb288_later_conviction_review','ga.sb288_offense_review'].includes(x.code)));
 });
 for(const {id,raw,draftHash,wasReadable}of predecessorCases.filter(x=>x.state===state))check(state+' saved predecessor '+id+'/'+JSON.stringify(raw),()=>{
  const a={...base,[id]:raw};
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:evalFor(a),screeningAnswers:a,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
  const record={status:'unverified',revision:0,draftHash,draftSnapshot:{...seed.snapshot,resultCode:'needs_review'}};
  assert.equal(P.protectedPacketDraftHash(record.draftSnapshot),draftHash);
  const before=structuredClone(record);const model=P.protectedPacketInformationModelFor(record);
  if(wasReadable){
   assert(model);assert(model.missingInputIds.includes(id));assert(model.builderQuestions.some(q=>q.id===id));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   const value=id==='case_outcome'?'Dismissed, no-billed, nolle prosequi, or not prosecuted':id.includes('count')?'1':id==='ct_petition_supervision_complete'?'Yes':'No';
   const patch=P.packetInformationPatch({protectedVerification:record,answers:{[id]:value}});assert(patch);
   const next=patch.protectedTransition.nextVerification.draftSnapshot;assert.equal(next.packetAnswers[id],value);assert.equal(next.paymentAllowed,false);
   for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])if(Object.hasOwn(before.draftSnapshot[source],id)){
    const history=next.dependencies.semanticAnswerHistory.find(h=>h.factId===id&&h.source===source);assert(history);assert.deepEqual(history.value,before.draftSnapshot[source][id]);
   }
  }else assert.equal(model,null);
  if(state==='GA'&&id==='ga_sb288_conviction_count'&&raw==='0'){
   const invalidated={...structuredClone(record),status:'invalidated',reason:'facts_saved_after_verification'};
   assert(P.protectedPacketInformationModelFor(invalidated));assert.deepEqual(P.packetInformationPatch({protectedVerification:invalidated,answers:{}}).protectedTransition.nextVerification,invalidated);
   for(const delta of [{paymentAllowed:true},{resultCode:'packet_ready'},{profileSourceFingerprint:'wrong'},{profileAuthorityFingerprint:'wrong'}]){
    const rejected=structuredClone(record);Object.assign(rejected.draftSnapshot,delta);rejected.draftHash=P.protectedPacketDraftHash(rejected.draftSnapshot);assert.equal(P.protectedPacketInformationModelFor(rejected),null);
   }
  }
  assert.deepEqual(record,before);
 });

}
console.log(JSON.stringify({checks,failures,liveCalls:0}));process.exitCode=failures?1:0;
