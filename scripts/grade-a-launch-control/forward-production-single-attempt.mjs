import assert from 'node:assert/strict';
// GET-only native run inventory prevents replay after ANY executed attempt,
// including failure. A new separately recorded owner decision is required.
export async function assertForwardSingleAttempt(candidate,{env=process.env,fetchImpl=fetch}={}){
 const qualified=candidate?.qualifiedWorkerDatabase;
 if(!candidate?.forwardProduction&&!qualified)return;
 const phase=env.RCAP_PRODUCTION_PHASE;const step=qualified&&phase==='forward_chain_migrate'?'Apply and directly read back the exact Production forward migration chain':{activate:'Activate the exact staged Production deployment with rollback protection',public_verify:'Verify the activated release on the public domain'}[phase];if(!step)return;
 const token=env.GITHUB_TOKEN,runId=Number(env.GITHUB_RUN_ID);assert(token&&Number.isSafeInteger(runId)&&runId>0,'native attempt identity and read token required');
 const base='https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean';
 async function get(p){const r=await fetchImpl(base+p,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok,'native attempt inventory GET failed');return r.json();}
 const current=await get('/actions/runs/'+runId);assert.equal(current.id,runId);assert.equal(current.head_sha,env.GITHUB_SHA);assert.equal(current.run_attempt,1);assert.equal(current.event,'workflow_dispatch');assert.equal(current.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(current.head_branch,'captain-release');assert.equal(current.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 const rearm=qualified?.priorNoEffectRearm,partial=qualified?.priorAcceptedCommit;let accounted=false,partialAccounted=false;
 if(partial){assert(rearm,'Known no-effect predecessor stays required');assert.deepEqual(partial.remainingCanonicalIndices,[1]);assert.equal(partial.runId,40615885933);assert.equal(candidate.toolsSha===partial.toolsSha||candidate.toolsSha===partial.executionSha,false,'New remaining-transaction tools required');assert.notEqual(current.head_sha,partial.executionSha);assert.ok(Date.parse(current.created_at)>=Math.ceil(Date.parse(partial.at)/1000)*1000,'Current native run must follow actual C partial-commit acceptance');}
 if(rearm){assert.equal(candidate.toolsSha===rearm.toolsSha||candidate.toolsSha===rearm.executionSha,false,'New corrected tools required');assert.notEqual(current.head_sha,rearm.executionSha,'Prior controller cannot be redispatched');assert.ok(Date.parse(current.created_at)>=Math.ceil(Date.parse(rearm.at)/1000)*1000,'Current native run must follow actual C no-effect disposition');}
 const finish=()=>{
  if(!rearm)return;assert(accounted,'Exact accepted no-effect attempt must remain accounted in original inventory');
  const knownAttempts=[{classification:'KNOWN_ACCEPTED_NO_EFFECT',runId:rearm.runId,jobId:rearm.jobId,stepNumber:20,priorControllerSha:rearm.executionSha,priorToolsSha:rearm.toolsSha,disposition:rearm.disposition,actualResult:rearm.result,artifactId:rearm.artifactId,artifactSha256:rearm.artifactSha256}];
  if(partial){assert(partialAccounted,'Exact accepted partial commit must remain accounted in original inventory');knownAttempts.push({classification:'KNOWN_ACCEPTED_STEP1_COMMIT_REMAINING_STEP2_ONLY',runId:partial.runId,jobId:partial.jobId,stepNumber:20,priorControllerSha:partial.executionSha,priorToolsSha:partial.toolsSha,disposition:partial.disposition,actualResult:partial.result,artifactId:partial.artifactId,artifactSha256:partial.artifactSha256,committedCanonicalIndex:0,allowedNextCanonicalIndex:1});}
  return{originalTechnicalAdmissionAt:qualified.technicalAdmissionAt,currentRunId:runId,workflowExecutionSha:current.head_sha,knownAttempts,rearmNotBefore:partial?.at??rearm.at};
 };
 // GitHub created_at is second-granular; include the entire original approval second.
 const after=Math.floor(Date.parse(qualified?qualified.technicalAdmissionAt:candidate.forwardProduction.owner.recordedAt)/1000)*1000;assert(Number.isFinite(after));
 for(let page=1;page<=100;page++){
  const inventory=await get('/actions/workflows/rcap-f1-ephemeral-staging.yml/runs?event=workflow_dispatch&per_page=100&page='+page);assert(Array.isArray(inventory.workflow_runs));
  for(const run of inventory.workflow_runs){if(run.id===runId||Date.parse(run.created_at)<after)continue;assert(run.id<runId,'another later native dispatch exists; stop');let jobPage=1;
   while(jobPage<=100){const jobs=await get('/actions/runs/'+run.id+'/jobs?per_page=100&page='+jobPage);assert(Array.isArray(jobs.jobs));for(const job of jobs.jobs)for(const s of job.steps??[])if(s.name===step&&s.conclusion!=='skipped'){
     const prior=partial&&run.id===partial.runId?partial:rearm&&run.id===rearm.runId?rearm:null;
     if(prior){
      assert.equal(run.head_sha,prior.executionSha);assert.equal(run.run_attempt,1);assert.equal(run.event,'workflow_dispatch');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.head_branch,'captain-release');assert.equal(run.repository?.full_name?.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');assert.equal(run.status,'completed');assert.equal(run.conclusion,'failure');assert.ok(Date.parse(run.created_at)<Date.parse(prior.at));
      assert.equal(job.id,prior.jobId);assert.equal(s.number,20);assert.equal(s.status,'completed');assert.equal(s.conclusion,'failure');if(prior===partial)partialAccounted=true;else accounted=true;
     }else assert(s.status==='queued'&&s.conclusion===null,'owner-authorized phase already attempted, running or failed; explicit new decision required');
    }
    if(jobs.jobs.length<100)break;jobPage++;}assert(jobPage<=100,'complete native job inventory required');
  }
  if(inventory.workflow_runs.length<100||inventory.workflow_runs.every(r=>Date.parse(r.created_at)<after))return finish();
 }
 throw Error('complete native attempt inventory required');
}
