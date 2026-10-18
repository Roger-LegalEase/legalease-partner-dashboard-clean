// GA-12 Q-2d80a89dd926657a1873 / Q-d33e933319baaaaf750b / QD-bd6b15fff22cbe1501cb.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {register} from 'node:module';
process.env.RCAP_EVALUATOR_TODAY='2026-07-01';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 nonconviction:['if (nonconviction)','if (false)'],
 settled:['const outstanding = reviewInputIds(facts.ids);','const outstanding = facts.ids;'],
 blank:['return state === "unanswered" || state === "invalid";','return false;']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent('let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith("/evaluator.ts")){if(!r.source.includes(m[0]))throw Error("mutation target absent");return {...r,source:r.source.replaceAll(m[0],m[1])}}return r}'),{data:mutations[mutation]});}
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const C=await import('../src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts');
const G=await import('../src/lib/rcap-engine/georgia-sb288-facts.ts');
const ledger=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json'));
const source=fs.readFileSync('scripts/generate-rcap-public-witness-answer-sets.mjs','utf8');
const ast=ts.createSourceFile('generator.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declaration=name=>{const node=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert(node);return node.getText(ast);};
const converge=new Function('evaluateAuthoritativeScreeningResult','CLEAR_RECORD',declaration('answerFor')+'\n'+declaration('converge')+'\nreturn converge;')(evaluate,ledger.determinism.clearRecord);
const projection=e=>({resultCode:e.resultCode,pathwayId:e.pathwayId??null,pathwayLabel:e.pathwayLabel??null,paymentAllowed:e.paymentAllowed===true,treatmentClassification:e.treatmentClassification??null,selectedTrackId:e.selectedTrackId??null,reasonCodes:e.reasons.map(r=>r.code).sort(),missingQuestionIds:[...e.missingQuestionIds].sort()});
let checks=0,failures=0;
function check(name,fn){try{fn();checks++;console.log(JSON.stringify({case:name,status:'PASS'}));}catch(e){failures++;console.error(JSON.stringify({failedCheck:name,assertion:e.message,actual:e.actual,expected:e.expected}));}}
const allFixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
for(const [state,route] of [['GA',G.GA_SB288_ROUTE],['CT',C.CT_PETITION_ROUTE]]){
 const w=ledger.witnesses.find(w=>w.pathwayKey===state+':'+route);assert(w);
 const profile=getProfileByJurisdiction(state),pub=projectPublicProfile(profile),questions=new Map();
 function visit(n){if(!n||typeof n!=='object')return;if(n.id&&n.type&&(n.prompt||n.label)&&!questions.has(n.id))questions.set(n.id,n);Object.values(n).forEach(visit);}visit(pub);
 const evalFor=answers=>evaluate({jurisdiction:state,profileVersion:profile.profileVersion,matterId:'public-witness',answers});
 check(state+' exact pinned witness round-by-round',()=>{
  const run=converge(state,profile,questions,w.seedAnswers);assert.equal(run.error,null,JSON.stringify(run.unresolvedEvaluation));assert.deepEqual(run.transcript,w.rounds);assert.deepEqual(run.answers,w.finalAnswers);assert.deepEqual(projection(run.evaluation),w.terminalEvaluation);
 });
 for(const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted','Acquitted or found not guilty','Arrest or citation with no charge filed'])check(state+' nonconviction '+outcome,()=>{
  const r=evalFor({...w.finalAnswers,case_outcome:outcome}).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.reasons.map(r=>r.code),[state.toLowerCase()+'.waiting_rule_not_executed']);assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);
 });
 const fixture=allFixtures.find(f=>f.pathwayKey===state+':'+route);assert(fixture);
 const base={...fixture.answers,case_outcome:'Misdemeanor conviction',...(state==='GA'?{ga_sb288_conviction_count:'1',ga_sb288_final_citations:'16-8-14',ga_sb288_convictions_before_filing:'No'}:{ct_petition_count:'1',ct_petition_citations:'53a-125b',ct_petition_offense_dates:'1995-02-28',ct_petition_historical_classes:'Class C misdemeanor (recorded)',ct_petition_historical_maxima:'3 months (recorded)',last_conviction_date:'2001-01-02',ct_petition_supervision_complete:'Yes',ct_petition_pending_state_charge:'No'})};
 const id=state==='GA'?'ga_sb288_final_citations':'ct_petition_historical_classes';
 for(const raw of ['unknown','I am not sure',{unknown:true},{value:base[id],unknown:true}])check(state+' explicit uncertainty '+JSON.stringify(raw),()=>{
  const a={...base,[id]:raw},before=structuredClone(a),r=evalFor(a);assert.equal(r.evaluation.resultCode,'needs_review');assert.deepEqual(r.evaluation.missingQuestionIds,[]);assert.equal(r.evaluation.paymentAllowed,false);assert(r.evaluation.nextSteps.length);assert.deepEqual(a,before);
  const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:r,screeningAnswers:a,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);assert.deepEqual(seed.snapshot.screeningAnswers[id],raw);
 });
 for(const question of (state==='GA'?G.GA_SB288_QUESTIONS:[...C.CT_PETITION_QUESTIONS,pub.questions.find(q=>q.id==='last_conviction_date')]))check(state+' uncertainty is an answer/'+question.id,()=>{
  const raw=question.type==='single_choice'?'I am not sure':{unknown:true};
  const r=evalFor({...base,[question.id]:raw}).evaluation;assert.equal(r.resultCode,'needs_review');assert.deepEqual(r.missingQuestionIds,[]);assert.equal(r.paymentAllowed,false);
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
}
console.log(JSON.stringify({checks,failures,liveCalls:0}));process.exitCode=failures?1:0;
