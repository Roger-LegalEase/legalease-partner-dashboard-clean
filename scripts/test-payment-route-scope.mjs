// F-NE-2: retained native PRE cases; only the adopted payment bit may change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
process.env.RCAP_EVALUATOR_TODAY='2026-10-18';
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};
register('./lib/ts-esm-loader.mjs',import.meta.url);
const mode=process.argv[2]??'candidate';
assert(['candidate','guard_removed','rule_ignored','contradiction_removed'].includes(mode));
if(mode!=='candidate')register('data:text/javascript,'+encodeURIComponent(`let mode;export function initialize(m){mode=m}export async function load(u,c,next){const r=await next(u,c);let s=String(r.source);if(mode==='guard_removed'&&u.endsWith('/evaluator.ts')){const a='paymentRouteScopeHeld(evaluated, normalizeCaseOutcome(request.answers.case_outcome), request.answers)';if(s.split(a).length!==2)throw Error('nonunique guard');s=s.replace(a,'false');}if(u.endsWith('/payment-route-scope.ts')){if(mode==='contradiction_removed'){const a='if (explicitConvictionLevelConflict(answers))';if(s.split(a).length!==2)throw Error('nonunique contradiction');s=s.replace(a,'if (false)');}if(mode==='rule_ignored'){const a='return !!rule && !!HELD_OUTCOMES[\`\${evaluation.jurisdiction}:\${evaluation.pathwayId}:\${rule}\`]?.includes(outcome);';if(s.split(a).length!==2)throw Error('nonunique scope');s=s.replace(a,'return Object.entries(HELD_OUTCOMES).some(([key,outcomes]) => key.startsWith(\`\${evaluation.jurisdiction}:\${evaluation.pathwayId}:\`) && outcomes.includes(outcome));');}}return {...r,source:s};}`),{data:mode});
const {evaluateScreening}=await import('../src/lib/rcap-engine/evaluator.ts');
const {evaluateAuthoritativeScreeningResult}=await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {explicitConvictionLevelConflict}=await import('../src/lib/rcap-engine/payment-route-scope.ts');
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/payment-route-scope-cases.json',import.meta.url)));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
let checks=0;const failures=[];const check=(name,fn)=>{checks++;try{fn();}catch(e){failures.push({name,error:e.message});}};
for(const row of fixture.rows){
 const answers=structuredClone(row.answers),original=structuredClone(answers),jurisdiction=row.target.split(':')[0];
 const request={jurisdiction,profileVersion:getProfileByJurisdiction(jurisdiction).profileVersion,matterId:'f-ne-2-synthetic',answers};
 const actual={raw:evaluateScreening(request),product:evaluateAuthoritativeScreeningResult(request).evaluation};
 for(const kind of ['raw','product']){
  const {paymentAllowed,...rest}=actual[kind];
  check(`${row.index}:${kind}:payment`,()=>assert.equal(paymentAllowed,row.hold?false:row.before[kind].paymentAllowed));
  check(`${row.index}:${kind}:all-other-fields`,()=>assert.equal(hash(rest),row.before[kind].nonPaymentSha256));
 }
 check(`${row.index}:saved-answers-unchanged`,()=>{assert.equal(hash(answers),row.answerSha256);assert.deepEqual(answers,original);});
}
for(const [name,outcome,level,expected]of [
 ['felony-conflict','Felony conviction','Misdemeanor',true],['misdemeanor-conflict','Misdemeanor conviction','Felony',true],
 ['consistent-felony','Felony conviction','Felony',false],['consistent-misdemeanor','Misdemeanor conviction','Misdemeanor',false],
 ['unknown-outcome','I am not sure','Felony',false],['unknown-level','Misdemeanor conviction','I am not sure',false],
 ['missing',undefined,'Felony',false],['nonconviction','Acquitted / not guilty','Felony',false],
 ['known-legacy-wrapper',{value:'Felony conviction',unknown:false},{value:'Misdemeanor',unknown:false},true],
 ['unknown-wrapper',{value:'Felony conviction',unknown:true},'Misdemeanor',false],
 ['array-is-not-scalar',['Felony conviction'],'Misdemeanor',false]
])check(`explicit-conflict:${name}`,()=>assert.equal(explicitConvictionLevelConflict({case_outcome:outcome,offense_level:level}),expected));
console.log(JSON.stringify({mode,checks,passed:checks-failures.length,failures},null,2));process.exitCode=failures.length?1:0;
