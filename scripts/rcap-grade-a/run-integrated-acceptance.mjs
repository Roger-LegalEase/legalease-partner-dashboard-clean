// One run of the owner's 103 scenarios. Reuse the real application journeys;
// never import an earlier campaign's PASS rows or private browser sessions.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(process.env.RCAP_FROZEN_SHA,sha,'Explicit frozen candidate required');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,'http://127.0.0.1:54321');
assert.equal(process.env.VERCEL_ENV,'development');
assert.equal(execFileSync('git',['diff','HEAD','--','src','supabase/migrations','scripts/rcap-grade-a'],{encoding:'utf8'}),'');
const root=`artifacts/rcap-grade-a-final/${sha}`;
assert.equal(fs.existsSync(root),false,'Preserve an existing run; do not overwrite or repeat it');
const ownerPlan='/workspaces/training-modules-09-10/output/LegalEase_RCAP_Grade_A_Final_Integrated_Build_and_Release_Plan_2026-10-10.md';
execFileSync(process.execPath,['scripts/rcap-grade-a/import-contract.mjs',ownerPlan,root],{stdio:'inherit'});
for(const dir of ['server','providers','journeys','logs'])fs.mkdirSync(`${root}/${dir}`,{recursive:true});
const development='artifacts/rcap-grade-a-final/ba81792225d6d82ef57c104061e9d5eb9d7db395';
for(const file of ['creation-development-check.json','staff-development-access.private.json']) {
 fs.copyFileSync(`${development}/server/${file}`,`${root}/server/${file}`);
 if(file.includes('.private.'))fs.chmodSync(`${root}/server/${file}`,0o600);
}
// Existing hosted-Checkout browser driver: preserve its exact byte identity;
// it uses only the explicitly configured Stripe TEST account.
const checkoutDriver='artifacts/rcap-grade-a-final/c6cf9a8070ae18e795d532c6d85ed205fcba591a/server/local-stripe-checkout-browser.mjs';
fs.copyFileSync(checkoutDriver,`${root}/server/local-stripe-checkout-browser.mjs`);
const manifest=JSON.parse(fs.readFileSync(`${root}/manifest.json`));
const buildIdentity=JSON.parse(fs.readFileSync('.next/rcap-grade-a-identity.json'));
assert.equal(buildIdentity.sourceSha,sha);
assert.equal(buildIdentity.buildId,fs.readFileSync('.next/BUILD_ID','utf8').trim());
manifest.finalCampaign={status:'RUNNING',sourceSha:sha,...buildIdentity,startedAt:new Date().toISOString()};
manifest.finalCampaign.checkoutDriverSha256=createHash('sha256').update(fs.readFileSync(checkoutDriver)).digest('hex');
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2));
const env={...process.env,RCAP_CAMPAIGN_DIR:root,RCAP_ACCEPTANCE_BASE_URL:'http://127.0.0.1:3100'};
const steps=[
 ['campaign-admin',[]],['campaign-scale',[]],
 ['check-partner-transition',[]],['check-clinic-integration',[]],
 ['check-clinic-queue-reset',['check-clinic-integration']],
 ['campaign-clinic-lifecycle',['check-clinic-queue-reset']],
 ['campaign-clinic-boundaries',[]],['campaign-clinic-optional-mode',[]],
 ['campaign-invitation-recovery',['check-clinic-integration']],
 ['campaign-spanish-failures',[]],['campaign-spanish-update',['campaign-spanish-failures']],
 ['campaign-partner-spanish',['campaign-invitation-recovery']],
 ['campaign-partner-scope-codes',['campaign-invitation-recovery']],
 ['campaign-partner-staff',['check-partner-transition']],
 ['campaign-partner-delegation',['campaign-partner-spanish','campaign-partner-scope-codes']],
 ['campaign-partner-navigation',['check-partner-transition','campaign-admin']],
 ['campaign-admin-boundaries',['campaign-scale']],['campaign-admin-diagnostics',['campaign-scale']],
 ['campaign-launch-authority-denial',['check-partner-transition']],
 ['campaign-public-boundaries',['campaign-spanish-update','campaign-scale']],
 ['campaign-access-code-claim',[]],['campaign-account-claim',[]],
 ['campaign-account-claim-readback',['campaign-account-claim']],
 ['campaign-participant-boundaries',['campaign-account-claim-readback']],
 ['campaign-participant-packet',['campaign-scale']],
 ['campaign-payment',['campaign-participant-packet']],
 ['campaign-render-recovery',['campaign-payment']],
 ['campaign-packet-delivery',['campaign-render-recovery']],
 ['campaign-funding-dependency',['check-partner-transition']],
 ['campaign-navigation-controls',['campaign-admin']],
 ['campaign-configuration-controls',['campaign-scale']],
 ['campaign-admin-remaining-controls',['campaign-scale']],
 ['campaign-operational-controls',['campaign-partner-delegation']],
 ['campaign-partner-field-controls',[]],['campaign-preview-contact-controls',['campaign-partner-delegation']],
 ['campaign-clinic-control-audit',[]],['campaign-clinic-capacity-controls',[]],['campaign-clinic-empty-team-controls',[]],
 ['campaign-account-recovery-controls',['campaign-account-claim-readback']],
 ['campaign-consumer-support-controls',['campaign-account-claim-readback']],
 ['campaign-consumer-global-controls',['campaign-account-claim-readback']],
 ['campaign-public-control-audit',['campaign-partner-delegation']],
 ['campaign-launch-response-recovery',['campaign-scale']],
 ['campaign-terminal-claim-controls',['campaign-account-claim-readback']],
 ['campaign-legacy-upgrade-controls',[]],
 ['campaign-wilma-controls',['campaign-account-claim-readback']],
 ['campaign-wilma-matter-link',['campaign-account-claim-readback']],
 ['campaign-packet-question-controls',['campaign-account-claim-readback']],
 ['census-retained-controls',['campaign-partner-delegation','campaign-account-claim-readback']],
 ['audit-extra-controls',['census-retained-controls']],
 ['campaign-extra-navigation',['audit-extra-controls']],
 ['campaign-extra-inputs',['audit-extra-controls']],
 ['campaign-extra-disclosures',['audit-extra-controls']],
 ['campaign-program-capacity-controls',['campaign-partner-delegation']],
 ['campaign-diagnostic-revocation-controls',['campaign-partner-delegation']],
 ['campaign-extra-admin-actions',['campaign-diagnostic-revocation-controls']]
];
const compositeCases={
 'check-partner-transition':['P-T04','P-T09','P-T11','P-T12'],
 'check-clinic-integration':['C-T01','C-T03','C-T04','C-T05','C-T07','C-T09','C-T12','C-T14','C-T17','C-T18'],
 'check-clinic-queue-reset':['C-T06','C-T19','C-T20','C-T21','C-T22','U-T22','U-T23']
};
const outcomes=[];
function rows(){return fs.readFileSync(`${root}/acceptance-ledger.jsonl`,'utf8').trim().split('\n').map(JSON.parse);}
function saveRows(value){fs.writeFileSync(`${root}/acceptance-ledger.jsonl`,value.map(JSON.stringify).join('\n')+'\n');}
for(const [name,dependencies] of steps) {
 const python=name==='audit-extra-controls';
 const script=`scripts/rcap-grade-a/${name}.${python?'py':'mjs'}`;
 const ids=compositeCases[name]??[...new Set(fs.readFileSync(script,'utf8').match(/[APCU]-T\d{2}/g)??[])];
 const failedDependency=dependencies.find(dep=>outcomes.find(s=>s.name===dep)?.result!=='PASS');
 const log=`logs/${name}.log`,startedAt=new Date().toISOString();
 let result,exitCode=null;
 if(failedDependency){result='BLOCKED';fs.writeFileSync(`${root}/${log}`,`Dependency ${failedDependency} did not pass. No dependent mutation attempted.\n`);}
 else {
  const fd=fs.openSync(`${root}/${log}`,'wx');
  console.log(JSON.stringify({step:name,status:'RUNNING',sourceSha:sha}));
  const run=spawnSync(python?'python3':process.execPath,[script],{env,stdio:['ignore',fd,fd],timeout:600000});fs.closeSync(fd);
  exitCode=run.status;result=run.status===0?'PASS':'FAIL';
  if(run.error)fs.appendFileSync(`${root}/${log}`,`\nHarness error: ${run.error.code??run.error.name}\n`);
 }
 outcomes.push({name,result,exitCode,dependencies,failedDependency:failedDependency??null,caseIds:ids,log,startedAt,finishedAt:new Date().toISOString(),logSha256:createHash('sha256').update(fs.readFileSync(`${root}/${log}`)).digest('hex')});
 if(result!=='PASS') {
  const value=rows();for(const row of value)if(ids.includes(row.caseId)&&row.result==='NOT_RUN')Object.assign(row,{result,observed:failedDependency?`Not executed: ${failedDependency} did not pass`:`Journey stopped before this assertion; see ${log}`,issue:failedDependency?'DEPENDENCY_FAILED':'JOURNEY_FAILED_REQUIRES_DIAGNOSIS',evidence:[log]});saveRows(value);
 }
 fs.writeFileSync(`${root}/run-steps.json`,JSON.stringify(outcomes,null,2));
 console.log(JSON.stringify({step:name,result,exitCode}));
}
// Capture only stages executed by these source-bound suites, including partial
// campaigns. The mapper never imports a prior run and validates each stage SHA.
const mapped=spawnSync(process.execPath,['scripts/rcap-grade-a/record-campaign-replays.mjs'],{env,encoding:'utf8'});
fs.writeFileSync(`${root}/logs/composite-evidence.log`,mapped.stdout+mapped.stderr);
for(const name of ['bind-controls','reconcile-controls']) {
 const result=spawnSync(process.execPath,[`scripts/rcap-grade-a/${name}.mjs`],{env,encoding:'utf8'});
 fs.writeFileSync(`${root}/logs/${name}.log`,result.stdout+result.stderr);
 outcomes.push({name,result:result.status===0?'PASS':'FAIL',exitCode:result.status,log:`logs/${name}.log`});
}
if(fs.existsSync(`${root}/extra-control-ledger.jsonl`)) {
 const result=spawnSync('python3',['scripts/rcap-grade-a/reconcile-extra-controls.py'],{env,encoding:'utf8'});
 fs.writeFileSync(`${root}/logs/reconcile-extra-controls.log`,result.stdout+result.stderr);
 outcomes.push({name:'reconcile-extra-controls',result:result.status===0?'PASS':'FAIL',exitCode:result.status,log:'logs/reconcile-extra-controls.log'});
}
const scenarios=rows().map(row=>({...row,executionResult:row.result,result:row.result==='CONDITIONAL_NOT_OFFERED'?'NOT_APPLICABLE':row.result==='NOT_RUN'?'BLOCKED':row.result,issue:row.result==='NOT_RUN'?'No final-candidate execution receipt; not accepted':row.issue}));
assert.equal(scenarios.length,103);
const counts=scenarios.reduce((out,row)=>(out[row.result]=(out[row.result]??0)+1,out),{PASS:0,FAIL:0,BLOCKED:0,NOT_APPLICABLE:0});
const controls=fs.readFileSync(`${root}/control-ledger.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
assert.equal(controls.length,417);
const record={sourceSha:sha,buildIdentity,startedAt:manifest.finalCampaign.startedAt,completedAt:new Date().toISOString(),counts,releaseReady:false,independentBlindReview:'NOT_RUN',productionOwnerAcceptance:'NOT_RUN',productionWrites:0,outcomes,scenarios,controls};
fs.writeFileSync(`${root}/final-acceptance.json`,JSON.stringify(record,null,2));
manifest.finalCampaign={...manifest.finalCampaign,status:'COMPLETED_WITH_OPEN_GATES',completedAt:record.completedAt,counts};
fs.writeFileSync(`${root}/manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({root,sourceSha:sha,counts,releaseReady:false}));
process.exitCode=counts.FAIL||counts.BLOCKED?1:0;
