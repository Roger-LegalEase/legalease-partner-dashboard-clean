// GA-12 Q-d33e933319baaaaf750b / QD-bd6b15fff22cbe1501cb: lead's exact rejected-candidate regressions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const rejected='1c948e2f3272599499fc7d7b3f3bfdc059a07a95';
const at=process.argv.includes('--rejected')?rejected:'WORKTREE';
if(at!== 'WORKTREE'){
 const paths=['src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts','src/lib/rcap-engine/evaluator.ts','src/lib/rcap-engine/public-profile-projection.ts','src/lib/rcap-engine/screening-question-selection.ts','src/lib/rcap-engine/route-fact-relevance.ts','src/components/expungement-ai/screening/screens.ts','src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/reviewed-result-copy.ts'];
 const sources=Object.fromEntries(paths.map(p=>[pathToFileURL(process.cwd()+'/'+p).href,ts.transpileModule(execFileSync('git',['show',at+':'+p],{encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText]));
 register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u in d?{format:"module",source:d[u],shortCircuit:true}:n(u,c)}'),{data:sources});
}
const mutant=process.argv.find(a=>a.startsWith('--mutant='))?.slice(9);
if(mutant){assert(['empty-corrections','leaking-corrections'].includes(mutant));
 register('data:text/javascript,'+encodeURIComponent('let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith("/packet-information.ts")){if(!r.source.includes(m[0]))throw Error("mutation target absent");return {...r,source:r.source.replace(m[0],m[1])}}return r}'),{data:mutant==='empty-corrections'
  ? ['function factualPathwayCorrectionIds(state, pathway, answers, includeInactive = false) {','function factualPathwayCorrectionIds(state, pathway, answers, includeInactive = false) { return [];']
  : ['if (ctPetitionContext(profile, pathway))','if (true)']});
}
const C=await import('../src/lib/rcap-engine/connecticut-clean-slate-petition-facts.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {sanitizeResumedAnswersForQuestionIds,screensFromQuestionIds}=await import('../src/components/expungement-ai/screening/screens.ts');
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const profile=getProfileByJurisdiction('CT'),route=C.CT_PETITION_ROUTE,pub=projectPublicProfile(profile),parsed=parseJurisdictionProfile(pub);assert(parsed.ok);
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const witness=fixtures.find(f=>f.pathwayKey==='CT:'+route);
const base={...witness.answers,case_outcome:'Misdemeanor conviction',ct_petition_count:'1',ct_petition_citations:'53a-125b',ct_petition_offense_dates:'1995-02-28',ct_petition_historical_classes:'Class C misdemeanor (recorded)',ct_petition_historical_maxima:'3 months (recorded)',last_conviction_date:'2001-01-02',ct_petition_supervision_complete:'Yes',ct_petition_pending_state_charge:'No'};
const evaluated=answers=>evaluate({jurisdiction:'CT',profileVersion:profile.profileVersion,matterId:'synthetic-ct-review-counterexample',answers}).evaluation;
const cases=new Map();
for(const [id,value] of [['CT-1','Sex offense or registration'],['CT-2','Firearm or weapons'],['CT-3','Other named excluded offense']])cases.set(id,()=>{
 const r=evaluated({...base,state_exclusion_categories:[value]});assert.deepEqual({resultCode:r.resultCode,reasons:r.reasons.map(r=>r.code)},{resultCode:'likely_not_eligible',reasons:['ct.state_exclusion_selected']});assert.equal(r.paymentAllowed,false);
});
for(const [key,copy] of Object.entries(C.CT_PETITION_COPY))cases.set('CT-5-'+key,()=>{
 const en=Array.isArray(copy)?copy[0]:copy,pair=reviewedResultText(en);
 assert(pair?.es&&pair.es!==en,'Spanish result copy must exist for '+key);
 assert.equal(resolveRuntimeText('es',en),pair.es);assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'available',summary:en}),pair);
});
const siblings=['absolute-pardon-resulting-in-erasure','petition-for-erasure-of-cannabis-conviction-records-under-54-142v'];
for(const sibling of siblings)cases.set('CT-6-'+sibling,()=>{
 const w=fixtures.find(f=>f.pathwayKey==='CT:'+sibling);assert(w);
 const resumed=sanitizeResumedAnswersForQuestionIds(parsed.data,w.answers,['ownership_scope']);
 assert.equal(Object.hasOwn(resumed,'financial_obligations'),false);assert.equal(Object.hasOwn(resumed,'sentence_completion_date'),false);
});
cases.set('CT-7-catalog',()=>{
 const q=pub.questions.find(q=>q.id==='last_conviction_date');
 assert.deepEqual({prompt:q.prompt,stage:q.stage,lifecyclePhase:q.lifecyclePhase},{prompt:'What is the most recent conviction date shown in the record?',stage:'packet_information',lifecyclePhase:'postpay_packet_field'});
});
cases.set('CT-7-petition',()=>{
 const ids=selectScreeningQuestionIds(profile,pub,base);assert(!ids.includes('last_conviction_date'));
 assert(!screensFromQuestionIds(parsed.data,[...ids,'last_conviction_date']).some(q=>q.id==='last_conviction_date'));
 const a=evaluate({jurisdiction:'CT',profileVersion:profile.profileVersion,matterId:'synthetic-ct-date',answers:base});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:base,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 const model=P.protectedPacketInformationModelFor({status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot});
 const q=model.questions.find(q=>q.id==='last_conviction_date');assert(q);
 assert.equal(q.prompt,'What is the date of your most recent judgment of conviction for any crime?');
 assert.equal(q.lifecyclePhase,'postpay_packet_field');assert.equal(q.stage,'packet_information');
 for(const sibling of siblings){const w=fixtures.find(f=>f.pathwayKey==='CT:'+sibling);assert(!screensFromQuestionIds(parsed.data,selectScreeningQuestionIds(profile,pub,w.answers)).some(q=>q.id==='last_conviction_date'));}
});
cases.set('CT-9',()=>assert.equal(evaluated(witness.answers).reasons.find(r=>r.code==='ct.waiting_rule_not_executed')?.sourceRef,'source:overview; section:75-102; section:48-74; section:163-202; section:239-249; section:323-333; corpus-unit:123; corpus-unit:24'));
cases.set('CT-10',()=>{
 const positive=P.factualPathwayCorrectionIds('CT',route,base,true);
 for(const id of C.CT_PETITION_FACT_IDS)assert(positive.includes(id),'matched route must include '+id);
 for(const sibling of siblings)for(const inactive of [false,true])for(const id of C.CT_PETITION_FACT_IDS)assert(!P.factualPathwayCorrectionIds('CT',sibling,base,inactive).includes(id),'unrelated route must exclude '+id);
});
const requested=process.argv.find(a=>a.startsWith('--case='))?.slice(7);assert(!requested||cases.has(requested));
let failures=0;
for(const[id,test]of cases){if(requested&&requested!==id)continue;try{test();console.log(JSON.stringify({case:id,at,mutant,status:'PASS'}));}catch(error){failures++;console.error(JSON.stringify({case:id,at,mutant,status:'FAIL',assertion:error.message,actual:error.actual,expected:error.expected}));}}
process.exitCode=failures?1:0;
