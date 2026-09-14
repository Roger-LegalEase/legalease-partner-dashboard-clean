import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createWorkerInputPlan } from '../rcap-hosted-acceptance-worker-input-plan.mjs';

// A receipt's asserted candidate identity is not proof that current inputs still
// match that candidate. Only explicitly named acceptance evidence may follow it.
export function verifyReleaseCandidateBinding(root, candidate, receiptPaths = []) {
  if (!candidate) return { current: false, status: 'NOT_FROZEN', reasons: ['No release candidate binding exists.'] };
  const reasons = [];
  if (!/^[a-f0-9]{40}$/.test(candidate.applicationSha ?? '') || !/^sha256:[a-f0-9]{64}$/.test(candidate.workerDigest ?? '')) {
    return { current: false, status: 'INVALID', reasons: ['Exact application SHA and worker digest are required.'] };
  }
  const generated = new Set([
    'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
    'data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json',
    'docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md',
    'data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json',
    'data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json',
    // Preserved pre-existing operating notes are not application inputs.
    'CAPTAIN_RESTART.md',
    ...receiptPaths.filter(p => /^(data\/rcap-grade-a\/participant-data-rights|private\/rcap-hosted-acceptance)\//.test(p))
  ]);
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', candidate.applicationSha, 'HEAD'], { cwd: root, stdio: 'pipe' });
    const changed = execFileSync('git', ['diff', '--name-only', candidate.applicationSha], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const untrackedRuntime = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'src', 'public', 'deploy', 'workers'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const changedInputs = [...changed.filter(p => !generated.has(p)), ...untrackedRuntime];
    if (changedInputs.length) reasons.push(`Candidate inputs changed: ${changedInputs.join(', ')}`);
    const publication = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-render/worker-publication-evidence.json')));
    if (publication.immutableRegistryDigest !== candidate.workerDigest || publication.workflowConclusion !== 'success') reasons.push('Worker digest is not the successful native publication.');
    const plan = createWorkerInputPlan({ rootDir: root, candidateSha: candidate.applicationSha,
      acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest });
    if (plan.rebuildRequired !== false) reasons.push('Current application requires a successor worker publication.');
  } catch {
    reasons.push('Candidate ancestry or current worker input proof could not be verified.');
  }
  return { current: reasons.length === 0, status: reasons.length ? 'STALE_OR_UNVERIFIED' : 'CURRENT', reasons };
}
