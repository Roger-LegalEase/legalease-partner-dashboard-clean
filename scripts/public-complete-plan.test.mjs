import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readQualifiedPublicProgramCorrection,prepareQualifiedPublicVerificationRecords} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base='7efb315ac5e3b90a84e2590a724a5aaa1813bc15';
test('corrected public binding preserves both actual failed attempts and twelve accepted native verdicts',()=>{
 const prior=readQualifiedPublicProgramCorrection(process.cwd());assert.equal(prior.runId,40636454619);assert.equal(prior.stepNumber,8);assert.equal(prior.acceptedLiveVerdicts,12);
 const records=prepareQualifiedPublicVerificationRecords(process.cwd(),{toolsSha:head(),releaseBaseSha:base});assert.equal(Object.keys(records).length,3);for(const r of Object.values(records)){assert.deepEqual(r.productionAuthorization.phases,['public_verify']);assert.deepEqual(r.qualifiedWorkerDatabase.priorPublicAttempt,prior);assert.equal(r.supersededRecord.toolsSha,'90420c42b66441452b418a84eee6df7df365712f');assert.equal(r.qualifiedWorkerDatabase.completedWorker.historicalCleanExitObserved,false);assert.equal(r.canonicalSourceEquivalent,false);}
});
test('native inventory accounts both exact failed public jobs step8 and refuses missing, altered or additional attempts',async()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')),prior=readQualifiedPublicProgramCorrection(process.cwd()),sha='e'.repeat(40),id=40636669999;candidate.toolsSha=sha;candidate.qualifiedWorkerDatabase.priorPublicAttempt=prior;
 const current={id,head_sha:sha,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},created_at:'2026-10-28T05:30:00Z'},failed={...current,id:prior.runId,head_sha:prior.executionSha,status:'completed',conclusion:'failure',created_at:'2026-10-28T05:10:00Z'},step={name:'Verify the activated release on the public domain',number:8,status:'completed',conclusion:'failure'};
 const env={RCAP_PRODUCTION_PHASE:'public_verify',GITHUB_TOKEN:'fixture',GITHUB_RUN_ID:String(id),GITHUB_SHA:sha};
 const first={...failed,id:prior.previousAttempt.runId,head_sha:prior.previousAttempt.executionSha,created_at:'2026-10-28T05:00:00Z'};
 const request=mode=>async(url,{method})=>{assert.equal(method,'GET');const isFirst=url.includes('/runs/'+first.id+'/jobs?');const extra={...failed,id:prior.runId+1};const body=url.includes('/workflows/')?{workflow_runs:[current,...(mode==='missing-first'?[]:[first]),...(mode==='missing-second'?[]:[failed]),...(mode==='extra'?[extra]:[])]}:url.includes('/jobs?')?{jobs:[{id:isFirst?prior.previousAttempt.jobId:prior.jobId,steps:[{...step,number:mode==='wrong-step'?9:8}]}]}:current;return new Response(JSON.stringify(body),{status:200});};
 const result=await assertForwardSingleAttempt(candidate,{env,fetchImpl:request('exact')});assert.deepEqual(result.knownAttempts.map(p=>p.runId),[40635569139,40636454619]);for(const mode of ['missing-first','missing-second','wrong-step','extra'])await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:request(mode)}));
});

// Exercise the complete frozen projection instead of checking one prompt at a time.
test('all eight projected MS questions have exactly the synthetic answer in the visible plan',async()=>{
 const {register}=await import('node:module');register('./lib/ts-esm-loader.mjs',import.meta.url);const {runInNewContext}=await import('node:vm');
 const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts'),{projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts'),{selectScreeningQuestionIds}=await import('../src/lib/rcap-engine/screening-question-selection.ts'),{evaluateScreening}=await import('../src/lib/rcap-engine/evaluator.ts');
 const source=fs.readFileSync('scripts/rcap-production-public-verify.mjs','utf8'),plan=runInNewContext(source.match(/const SCREENING_PLAN = (\[[\s\S]*?\n\]);/)[1]);
 const answers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Non-conviction expungement for dismissal, no disposition, or acquittal',ms_program_order:'no_program_order',court_requirements_completed:'yes',resolved_timing_bucket:'years_1_to_2'};
 const profile=getProfileByJurisdiction('MS'),pub=projectPublicProfile(profile),ids=selectScreeningQuestionIds(profile,pub,answers);assert.deepEqual(ids,Object.keys(answers));assert.equal(plan.length,8);
 for(const id of ids){const q=pub.questions.find(q=>q.id===id),rules=plan.filter(([prompt])=>prompt.test(q.prompt));assert.equal(rules.length,1,id+' prompt covered exactly once');const options=q.options.filter(value=>rules[0][1].test((q.optionDisplay?.[value]?.label??value)+(q.optionDisplay?.[value]?.helperText??'')));assert.deepEqual(options,[answers[id]],id+' matches exactly its defined synthetic fact');}
 const result=evaluateScreening({jurisdiction:'MS',profileVersion:profile.profileVersion,matterId:'synthetic-public-complete-plan',answers});assert.equal(result.pathwayId,'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal');assert.deepEqual(result.missingQuestionIds,[]);
});
