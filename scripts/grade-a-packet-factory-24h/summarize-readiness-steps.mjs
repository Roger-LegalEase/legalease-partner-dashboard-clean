#!/usr/bin/env node
/** Report actual step outcomes; skipped or absent checks never become PASS. */
import assert from 'node:assert/strict';
export const REQUIRED_READINESS_STEPS=Object.freeze([
 'exact_commit','syntax','yaml','convergence','factory_checks','factory_mutations',
 'conveyor_checks','conveyor_mutations','manifest','handoff_checks','handoff_mutations',
 'summary_controls','clean','source_preflight','setup_contract','lane_contracts','source_relationship',
 'source_relationship_mutations','lane_mutations',
]);
export function summarizeReadiness(steps){
 const checks=REQUIRED_READINESS_STEPS.map(id=>({id,outcome:steps?.[id]?.outcome??'not_run',
  status:steps?.[id]?.outcome==='success'?'PASS':steps?.[id]?.outcome==='failure'?'FAIL':steps?.[id]?.outcome==='cancelled'?'CANCELLED':'NOT_RUN'}));
 return {verdict:checks.every(x=>x.status==='PASS')?'READY_TO_RUN':'REFUSED',checks};
}
if(process.argv.includes('--self-test')){
 const good=Object.fromEntries(REQUIRED_READINESS_STEPS.map(id=>[id,{outcome:'success'}]));
 assert.equal(summarizeReadiness(good).verdict,'READY_TO_RUN');
 for(const outcome of ['failure','skipped','cancelled',undefined])for(const id of REQUIRED_READINESS_STEPS){
  const changed={...good,[id]:{outcome,conclusion:'success'}};const summary=summarizeReadiness(changed);
  assert.equal(summary.verdict,'REFUSED');assert.notEqual(summary.checks.find(x=>x.id===id).status,'PASS');
 }
 assert.equal(summarizeReadiness({}).checks.filter(x=>x.status==='NOT_RUN').length,REQUIRED_READINESS_STEPS.length);
 console.log(`readiness-summary: ${2+REQUIRED_READINESS_STEPS.length*4} controls PASS`);
}else if(process.env.STEP_RESULTS!==undefined){
 let steps;try{steps=JSON.parse(process.env.STEP_RESULTS);}catch{throw new Error('Invalid STEP_RESULTS; refusing a readiness claim');}
 const summary=summarizeReadiness(steps);
 console.log(`# ${summary.verdict}\n\nCommit: \`${process.env.GITHUB_SHA??'NOT_PROVIDED'}\`\n\n| Check | Outcome |\n|---|---|`);
 for(const {id,status}of summary.checks)console.log(`| ${id} | ${status} |`);
 console.log('\nThis is the result for this checkout, not a packet or production approval.');
}
