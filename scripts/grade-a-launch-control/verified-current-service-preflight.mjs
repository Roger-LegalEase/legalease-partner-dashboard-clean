import crypto from 'node:crypto';

// Owner-confirmed successful successor. This is a service evidence binding,
// not an independent application review or any release authorization.
export const CURRENT_SERVICE_REVIEW = 'data/rcap-grade-a/participant-data-rights/service-preflight-evidence-34869440888.json';
const prefix = 'private/transfers/national-release-preservation-20260914/service-preflight-34869440888';
const pins = {
  '/original.zip': '914568aabb0b7f12ee995d71f7083e39cbcca57282e43f374f18596d6d77ce8e',
  '/original/preflight.json': '2fb770099148dee430145b4f1861b347d3f9af6c15941987c4202fc73f031851',
  '/original/worker-input-plan.json': '0b9edf2bdba15c2a93d03209058b60d4e477bd444eafe3422ef27d21de8d4237'
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function verifiedCurrentServicePreflight(review, readBytes) {
  if (review?.schemaVersion !== 'rcap-service-preflight-evidence/v1' || review.runId !== 34869440888
      || review.toolsSha !== '53b8deb6d02a92852ef70b06e5e81078cba74a5e' || review.serviceOnly !== true
      || ['applicationAccepted','workerImageAccepted','participantAcceptanceEstablished','releaseAuthorityGranted','migrationsRan','deploymentsRan'].some(k=>review[k] !== false)) return null;
  try {
    const originals = {};
    for (const [suffix, digest] of Object.entries(pins)) {
      const bytes = readBytes(prefix + suffix);
      if (!Buffer.isBuffer(bytes) || hash(bytes) !== digest) return null;
      if (suffix.endsWith('.json')) originals[suffix] = JSON.parse(bytes);
    }
    // Metadata and job evidence must also retain their recorded custody.
    for (const suffix of ['/artifacts.json','/run.json','/jobs.json']) {
      const refs = review.custody.filter(c=>c.path === prefix + suffix);
      if (refs.length !== 1) return null;
      const bytes = readBytes(prefix + suffix);
      if (hash(bytes) !== refs[0].sha256 || bytes.length !== refs[0].byteLength) return null;
      originals[suffix] = JSON.parse(bytes);
    }
    const p = originals['/original/preflight.json'], plan = originals['/original/worker-input-plan.json'];
    const run = originals['/run.json'], jobs = originals['/jobs.json'].jobs;
    const artifacts = originals['/artifacts.json'].artifacts.filter(a=>a.id===10358087045);
    if (artifacts.length !== 1 || artifacts[0].digest !== 'sha256:' + pins['/original.zip']
        || artifacts[0].workflow_run.id !== review.runId || artifacts[0].workflow_run.head_sha !== review.toolsSha
        || run.id !== review.runId || run.run_attempt !== 1 || run.run_number !== 118 || run.head_sha !== review.toolsSha || run.conclusion !== 'success'
        || p.applicationSha !== review.applicationSha || p.toolsSha !== review.toolsSha || !p.serviceOnly || !p.passed
        || p.requiredCases.length !== 9 || p.requiredCases.some(k=>p.cases.verdicts[k] !== true)
        || p.failedCases.length || p.missingCases.length || plan.candidateSha !== p.applicationSha
        || plan.rebuildRequired !== p.workerRebuildRequired || review.workerRebuildRequired !== plan.rebuildRequired) return null;
    const job = jobs.find(j=>j.id===104061418936);
    if (job?.conclusion !== 'success') return null;
    for (const name of ['Apply the authorized sequence to the acceptance project','Deploy the frozen application SHA to Vercel Preview']) {
      if (!job.steps.some(s=>s.name===name && s.conclusion==='skipped')) return null;
    }
    for (const [service, count] of [['supabase',5],['vercel',4]]) {
      if (review.services[service].passedChecks !== count || review.services[service].requiredChecks !== count || review.services[service].status !== 'PASS_SERVICE_ONLY') return null;
    }
    return {review:CURRENT_SERVICE_REVIEW,runId:review.runId,toolsSha:review.toolsSha,applicationSha:p.applicationSha,
      status:'SUCCESSFUL_SERVICE_PREFLIGHT',originalCustodyVerified:true,services:review.services,
      workerRebuildRequired:plan.rebuildRequired,candidateAcceptanceEstablished:false,releaseAuthorityGranted:false,
      verificationBasis:'Owner-confirmed run and digest; exact downloaded archive and receipt bytes verified. No independent implementation-review claim.'};
  } catch { return null; }
}
