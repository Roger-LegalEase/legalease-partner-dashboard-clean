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
    // Exact release-specific tooling binding. No prefix or arbitrary post-freeze exemption.
    const toolingPath = 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
    if (fs.existsSync(path.join(root, toolingPath))) {
      const binding = JSON.parse(fs.readFileSync(path.join(root, toolingPath)));
      const frozen = {
        applicationSha: '300a0edbf0a75daf5249f94d7a33f51570a00ba0',
        workerSourceSha: 'b64701c16ab2a6c78d0d187143882407111c0778',
        workerDigest: 'sha256:f99ebc19732e994cfb9c0ebfc0734345e857be050d8bda8952b852f78b611301',
        workerInputFingerprint: 'sha256:ed3d0e1fac48515de4eb641f48ad266da566cc1e42bddda3d75e859fadb65b4e'
      };
      for (const [key, value] of Object.entries(frozen)) {
        if (binding[key] !== value || candidate[key] !== value) throw new Error('Frozen identity mismatch');
      }
      if (!/^[a-f0-9]{40}$/.test(binding.toolsSha ?? '')) throw new Error('Exact tools SHA required');
      const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
      git(['merge-base', '--is-ancestor', candidate.applicationSha, binding.toolsSha]);
      git(['merge-base', '--is-ancestor', binding.toolsSha, 'HEAD']);
      const bounded = new Set([
        '.github/workflows/rcap-hosted-acceptance-staging.yml',
        'scripts/rcap-hosted-acceptance-deploy.mjs',
        'scripts/rcap-vercel-identity-recheck.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
        'scripts/grade-a-launch-control/verify-hosted-tools-binding.test.mjs',
        'scripts/rcap-hosted-vercel-rest-transport.mjs',
        'scripts/rcap-hosted-vercel-diagnostics.mjs',
        'scripts/rcap-hosted-vercel-rest-transport.test.mjs',
        'scripts/rcap-hosted-acceptance-preflight.mjs',
        'scripts/rcap-hosted-acceptance-vercel-identity.test.mjs'
      ]);
      const delta = git(['diff', '--name-only', candidate.applicationSha, binding.toolsSha]).split('\n').filter(Boolean);
      if (delta.some(p => !generated.has(p) && p !== toolingPath && !bounded.has(p))) throw new Error('Unbounded tooling delta');
      const declared = binding.orchestrationFiles;
      const actual = delta.filter(p => bounded.has(p)).sort();
      if (!Array.isArray(declared) || JSON.stringify([...declared].sort()) !== JSON.stringify(actual)) throw new Error('Tooling file set mismatch');
      // The approved commit's exact blobs must still be present: future changes refuse.
      git(['diff', '--exit-code', binding.toolsSha, '--', ...actual]);
      const toolPlan = createWorkerInputPlan({rootDir: root, candidateSha: binding.toolsSha,
        acceptedSourceSha: frozen.workerSourceSha, acceptedDigest: frozen.workerDigest});
      if (toolPlan.rebuildRequired || toolPlan.aggregateInputSha256 !== frozen.workerInputFingerprint) throw new Error('Tool worker mismatch');
      git(['diff', '--exit-code', binding.toolsSha, '--', ...toolPlan.canonicalInputs]);
      for (const p of actual) generated.add(p);
      generated.add(toolingPath);
    }
    execFileSync('git', ['merge-base', '--is-ancestor', candidate.applicationSha, 'HEAD'], { cwd: root, stdio: 'pipe' });
    const changed = execFileSync('git', ['diff', '--name-only', candidate.applicationSha], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const publication = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-render/worker-publication-evidence.json')));
    if (publication.immutableRegistryDigest !== candidate.workerDigest || publication.workflowConclusion !== 'success') reasons.push('Worker digest is not the successful native publication.');
    execFileSync('git', ['merge-base', '--is-ancestor', publication.sourceSha, candidate.applicationSha], { cwd: root, stdio: 'pipe' });
    const plan = createWorkerInputPlan({ rootDir: root, candidateSha: candidate.applicationSha,
      acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const roots = [...plan.comparedInputs, 'src', 'public', 'deploy', 'workers', 'scripts', 'package.json', 'package-lock.json', 'next.config.js', 'next.config.ts', 'next.config.mjs', 'tsconfig.json', 'vercel.json'];
    const untrackedRuntime = untracked.filter(p => roots.some(root => p === root || p.startsWith(root.replace(/\/$/, '') + '/')) && !generated.has(p));
    const changedInputs = [...changed.filter(p => !generated.has(p)), ...untrackedRuntime];
    if (changedInputs.length) reasons.push(`Candidate inputs changed: ${changedInputs.join(', ')}`);
    if (plan.rebuildRequired !== false) reasons.push('Current application requires a successor worker publication.');
  } catch {
    reasons.push('Candidate ancestry or current worker input proof could not be verified.');
  }
  return { current: reasons.length === 0, status: reasons.length ? 'STALE_OR_UNVERIFIED' : 'CURRENT', reasons };
}
