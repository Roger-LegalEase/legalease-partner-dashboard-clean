// GA-20 O17 CA tool-3: containment only; no approval or replacement remedy inferred.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const {getProfileByJurisdiction} = await import('../src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult: evaluate} = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {runExpungementAiEligibilityCheck} = await import('../src/lib/expungement-ai/eligibility-adapter.ts');
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/ca-tool3-containment.json', import.meta.url), 'utf8'));
const profile=getProfileByJurisdiction('CA'), route='tool-3-petition-based-felony-sealing';
const base={ownership_scope:'Yes',jurisdiction_scope:'State or local',county:'Los Angeles',court:'Superior Court of California, County of Los Angeles',state_exclusion_categories:['None of these']};
const common={new_convictions_during_waiting_period:'No',pardon_status:'No',pending_cases:'No',record_documents:'Yes',sentence_completion_date:'Yes',special_preconditions_confirmed:'Yes'};
function answersFor(row){return JSON.parse(JSON.stringify({...base,...common,financial_obligations:row.yi===1?'Yes':'No',...(row.yi===0?{criminal_history:'No'}:{}),case_outcome:row.co,offense_level:row.lvl,possible_pathway_context:row.h??undefined,resolved_timing_bucket:row.b??undefined,charge:row.c??undefined}));}
function run(answers){return evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'ca-tool3-containment',answers});}
for(const row of fixture.paidWitnesses){
 const answers=answersFor(row), original=structuredClone(answers), result=run(answers).evaluation;
 assert.equal(result.paymentAllowed,false,'Previously paid tool-3 witness must be held');
 assert.ok(!['packet_ready','packet_ready_with_caution'].includes(result.resultCode),'Held tool-3 must not claim packet readiness');
 assert.equal(result.pathwayId,route,'Keep the identified route for saved history');
 assert.deepEqual(answers,original,'Never rewrite saved screening facts');
}
for(const row of fixture.unchangedControls){
 const result=run(answersFor(row)).evaluation;
 assert.deepEqual({rc:result.resultCode,pay:result.paymentAllowed,pw:result.pathwayId??null,why:result.reasons.map(x=>x.code)},
 {rc:row.rc,pay:row.pay,pw:row.pw,why:row.why},'Other route outcomes must stay exactly as measured at base');
}
const witness=answersFor(fixture.paidWitnesses[0]);
for(const delta of [{ownership_scope:'No'},{jurisdiction_scope:'Federal'},{case_outcome:'I am not sure'},{state_exclusion_categories:['I am not sure']}]){
 assert.equal(run({...witness,...delta}).evaluation.paymentAllowed,false,'Refusal/uncertainty must remain unpaid');
}
const adapted=await runExpungementAiEligibilityCheck({state:'CA',answers:witness,matterId:'ca-tool3-containment'});
assert.equal(adapted.paymentAllowed,false);
// Generated metadata is not a runtime input; CI owns its separate regeneration (Lead 2026-10-21 14:02:35Z).
console.log(`PASS: ${fixture.paidWitnesses.length} former paid witnesses held, ${fixture.unchangedControls.length} unchanged outcome controls, 4 refusal/uncertainty cases, adapter closed; raw answers preserved`);
