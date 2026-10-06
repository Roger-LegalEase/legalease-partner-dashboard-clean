import assert from 'node:assert/strict';
// GET-only native run inventory prevents replay after ANY executed attempt,
// including failure. A new separately recorded owner decision is required.
export async function assertForwardSingleAttempt(candidate,{env=process.env,fetchImpl=fetch}={}){
 if(!candidate?.forwardProduction)return;
 const phase=env.RCAP_PRODUCTION_PHASE;const step={activate:'Activate the exact staged Production deployment with rollback protection',public_verify:'Verify the activated release on the public domain'}[phase];if(!step)return;
 const token=env.GITHUB_TOKEN,runId=Number(env.GITHUB_RUN_ID);assert(token&&Number.isSafeInteger(runId)&&runId>0,'native attempt identity and read token required');
 const base='https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean';
 async function get(p){const r=await fetchImpl(base+p,{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok,'native attempt inventory GET failed');return r.json();}
 const current=await get('/actions/runs/'+runId);assert.equal(current.id,runId);assert.equal(current.head_sha,env.GITHUB_SHA);assert.equal(current.run_attempt,1);assert.equal(current.event,'workflow_dispatch');assert.equal(current.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(current.head_branch,'captain-release');assert.equal(current.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 const after=Date.parse(candidate.forwardProduction.owner.recordedAt);assert(Number.isFinite(after));
 for(let page=1;page<=100;page++){
  const inventory=await get('/actions/workflows/rcap-f1-ephemeral-staging.yml/runs?event=workflow_dispatch&per_page=100&page='+page);assert(Array.isArray(inventory.workflow_runs));
  for(const run of inventory.workflow_runs){if(run.id===runId||Date.parse(run.created_at)<after)continue;assert(run.id<runId,'another later native dispatch exists; stop');let jobPage=1;
   while(jobPage<=100){const jobs=await get('/actions/runs/'+run.id+'/jobs?per_page=100&page='+jobPage);assert(Array.isArray(jobs.jobs));for(const job of jobs.jobs)for(const s of job.steps??[])if(s.name===step&&s.conclusion!=='skipped'){assert(s.status==='queued'&&s.conclusion===null,'owner-authorized phase already attempted, running or failed; explicit new decision required');}
    if(jobs.jobs.length<100)break;jobPage++;}assert(jobPage<=100,'complete native job inventory required');
  }
  if(inventory.workflow_runs.length<100||inventory.workflow_runs.every(r=>Date.parse(r.created_at)<after))return;
 }
 throw Error('complete native attempt inventory required');
}
