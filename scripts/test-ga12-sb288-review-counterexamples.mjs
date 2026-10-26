// GA-12 Q-2d80a89dd926657a1873 / QD-bd6b15fff22cbe1501cb: lead's exact rejected-candidate regressions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const rejected='65d2f17124b83c89c519ab5e9f485aa1de93bafc';
const at=process.argv.includes('--rejected')?rejected:'WORKTREE';
if(at!== 'WORKTREE'){
 const paths=['src/lib/rcap-engine/georgia-sb288-facts.ts','src/lib/rcap-engine/evaluator.ts','src/lib/rcap-engine/public-profile-projection.ts','src/lib/rcap-engine/screening-question-selection.ts','src/lib/rcap-engine/route-fact-relevance.ts','src/components/expungement-ai/screening/screens.ts','src/lib/expungement-ai/packet-collection.ts','src/lib/expungement-ai/packet-information.ts','src/lib/expungement-ai/reviewed-result-copy.ts'];
 const sources=Object.fromEntries(paths.map(p=>[pathToFileURL(process.cwd()+'/'+p).href,ts.transpileModule(execFileSync('git',['show',at+':'+p],{encoding:'utf8'}),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText]));
 register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u in d?{format:"module",source:d[u],shortCircuit:true}:n(u,c)}'),{data:sources});
}
const G=await import('../src/lib/rcap-engine/georgia-sb288-facts.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {reviewedResultText}=await import('../src/lib/expungement-ai/reviewed-result-copy.ts');
const {resolveRuntimeText}=await import('../src/lib/expungement-ai/localization.ts');
const {packetMatterSummaryCopy}=await import('../src/lib/expungement-ai/packet-display-copy.ts');
const profile=getProfileByJurisdiction('GA'),route=G.GA_SB288_ROUTE;
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey==='GA:'+route);
const base={...witness.answers,case_outcome:'Misdemeanor conviction',ga_sb288_conviction_count:'1',ga_sb288_final_citations:'16-8-14',ga_sb288_convictions_before_filing:'No'};
const evaluated=answers=>evaluate({jurisdiction:'GA',profileVersion:profile.profileVersion,matterId:'synthetic-ga-review-counterexample',answers}).evaluation;
const cases=new Map();
for(const [id,patch,resultCode,reasonCode] of [
 ['GA-1',{state_exclusion_categories:['DUI/DWI or serious traffic']},'likely_not_eligible','ga.state_exclusion_selected'],
 ['GA-2',{state_exclusion_categories:['Other named excluded offense']},'likely_not_eligible','ga.state_exclusion_selected'],
 ['GA-3',{resolved_timing_bucket:'still_open'},'not_yet','ga.case_still_open'],
 ['GA-4',{court_requirements_completed:'no'},'not_yet','ga.timing_or_completion_blocker']
])cases.set(id,()=>{const r=evaluated({...base,...patch});assert.deepEqual({resultCode:r.resultCode,reasons:r.reasons.map(r=>r.code)},{resultCode,reasons:[reasonCode]});assert.equal(r.paymentAllowed,false);});
for(const [key,copy] of Object.entries(G.GA_SB288_COPY))cases.set('GA-5-'+key,()=>{
 const en=Array.isArray(copy)?copy[0]:copy;const pair=reviewedResultText(en);
 assert(pair?.es&&pair.es!==en,'Spanish result copy must exist for '+key);
 assert.equal(resolveRuntimeText('es',en),pair.es);
 assert.deepEqual(packetMatterSummaryCopy({authorityStatus:'available',summary:en}),pair);
});
for(const citation of ['16-5-20(d)(1)','16-5-23(f)(1)','16-5-23.1(f)(1)'])cases.set('GA-8-'+citation,()=>{
 const answers={...base,ga_sb288_final_citations:citation};
 assert.equal(G.georgiaSb288QuestionApplies(profile,route,answers,'ga_sb288_under21_at_arrest'),true);
 assert(G.georgiaSb288Facts(answers).ids.includes('ga_sb288_under21_at_arrest'));
});
cases.set('GA-9',()=>assert.equal(evaluated(witness.answers).reasons.find(r=>r.code==='ga.waiting_rule_not_executed')?.sourceRef,'waiting_periods:116-150'));
const requested=process.argv.find(a=>a.startsWith('--case='))?.slice(7);assert(!requested||cases.has(requested));
let failures=0;
for(const [id,test]of cases){if(requested&&requested!==id)continue;try{test();console.log(JSON.stringify({case:id,at,status:'PASS'}));}catch(error){failures++;console.error(JSON.stringify({case:id,at,status:'FAIL',assertion:error.message,actual:error.actual,expected:error.expected}));}}
process.exitCode=failures?1:0;
