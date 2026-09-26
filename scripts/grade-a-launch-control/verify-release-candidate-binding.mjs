import {verifyPendingWorkerSuccessor,verifySuccessorPublication,assertSuccessorImageAcceptance} from './verify-pending-worker-successor.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkerInputPlan } from '../rcap-hosted-acceptance-worker-input-plan.mjs';

/**
 * A successful build is not an accepted image.
 *
 * Publication proves only that a digest came back from the registry. It does
 * not prove the bytes can be pulled, that the process inside them fails closed,
 * or that anyone looked. Until this existed the verifier accepted a candidate
 * whose worker had been published and never accepted, which is the one thing
 * the read-only acceptance workflow exists to prevent -- so the acceptance was
 * run, recorded, and then not required by the control that gates the release.
 *
 * Exported so mutations reach these conditions directly rather than only
 * through a whole fixture repository.
 */
export function imageAcceptanceRefusals(publication, candidate) {
  const out = [];
  if (publication?.runtimeAccepted !== true) {
    out.push(`Publication is not runtime accepted (runtimeAccepted=${JSON.stringify(publication?.runtimeAccepted)}).`);
  }
  const acceptance = publication?.imageAcceptance;
  if (!acceptance || typeof acceptance !== 'object' || Array.isArray(acceptance)) {
    out.push('No recorded read-only image acceptance for this publication.');
    return out;
  }
  if (acceptance.conclusion !== 'success') {
    out.push(`Recorded image acceptance did not succeed (conclusion=${JSON.stringify(acceptance.conclusion)}).`);
  }
  if (acceptance.digest !== candidate.workerDigest) {
    out.push(`Image acceptance names digest ${acceptance.digest}, not the candidate digest ${candidate.workerDigest}.`);
  }
  if (candidate.workerSourceSha && acceptance.tag !== candidate.workerSourceSha) {
    out.push(`Image acceptance names tag ${acceptance.tag}, not the candidate worker source ${candidate.workerSourceSha}.`);
  }
  if (!Number.isInteger(acceptance.runId) || acceptance.runId <= 0) {
    out.push(`Image acceptance names no exact run id (runId=${JSON.stringify(acceptance.runId)}).`);
  }
  if (acceptance.readOnly !== true) {
    out.push('Image acceptance is not recorded as read-only.');
  }
  // When the candidate names its own acceptance run, it must be the run the
  // committed evidence records. A candidate that cites a different run is
  // citing an acceptance of something else.
  const cited = candidate?.readOnlyImageAcceptance?.runId;
  if (cited !== undefined && cited !== null && cited !== acceptance.runId) {
    out.push(`Candidate cites image acceptance run ${cited}; the evidence records ${acceptance.runId}.`);
  }
  return out;
}

// A receipt's asserted candidate identity is not proof that current inputs still
// match that candidate. Only explicitly named acceptance evidence may follow it.
export function verifyReleaseCandidateBinding(root, candidate, receiptPaths = []) {
  const pending = verifyPendingWorkerSuccessor(root);
  if (pending?.current === true && pending.status === 'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING') return verifyAcceptedSuccessorBinding(root,candidate,pending);
  if (pending) return pending;
  if (!candidate) return { current: false, status: 'NOT_FROZEN', reasons: ['No release candidate binding exists.'] };
  // A product repair can be exactly frozen without yet having a published or
  // accepted successor image. This is a descriptive refusal, never admission.
  if (candidate.status === 'AWAITING_WORKER_PUBLICATION') {
    try {
      if (candidate.workerRebuildRequired !== true || candidate.runtimeAccepted !== false
        || candidate.workerDigest !== null || candidate.workerDigestReference !== null
        || candidate.publication !== null || candidate.readOnlyImageAcceptance !== null
        || candidate.productionAuthorized !== false || candidate.productionAuthorization !== null
        || candidate.workerSourceSha !== candidate.applicationSha) throw new Error('Pending publication must not claim acceptance or a digest');
      const publication = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-render/worker-publication-evidence.json')));
      const plan = createWorkerInputPlan({rootDir: root, candidateSha: candidate.applicationSha,
        acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest});
      if (!plan.rebuildRequired || plan.missingCanonicalInputs.length
        || plan.aggregateInputSha256 !== candidate.workerInputFingerprint) throw new Error('Pending worker input proof mismatch');
      const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
      git(['merge-base', '--is-ancestor', candidate.applicationSha, 'HEAD']);
      const bindingPath = 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
      const binding = JSON.parse(fs.readFileSync(path.join(root, bindingPath)));
      for (const key of ['applicationSha', 'workerSourceSha', 'workerDigest', 'workerInputFingerprint']) {
        if (binding[key] !== candidate[key]) throw new Error(`Pending tools ${key} mismatch`);
      }
      if (binding.toolsSha !== candidate.applicationSha || !Array.isArray(binding.orchestrationFiles) || binding.orchestrationFiles.length !== 0
        || binding.deploymentAuthorized !== false || binding.additionalWorkerPublicationAuthorized !== false) throw new Error('Pending tools snapshot mismatch');
      const allowed = new Set([CANDIDATE_PATH, bindingPath]);
      const delta = git(['diff', '--name-only', candidate.applicationSha]).split('\n').filter(Boolean);
      const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
      if ([...delta, ...untracked].some(p => !allowed.has(p))) throw new Error('Pending source or tools changed after freeze');
      return {current: false, status: 'AWAITING_WORKER_PUBLICATION', reasons: [
        'Successor source and tools are frozen; worker rebuild, publication and read-only image acceptance are required. No hosted dispatch is admitted.'
      ]};
    } catch (error) {
      return {current: false, status: 'INVALID_PENDING_PUBLICATION', reasons: [error.message]};
    }
  }
  const reasons = [];
  if (!/^[a-f0-9]{40}$/.test(candidate.applicationSha ?? '') || !/^sha256:[a-f0-9]{64}$/.test(candidate.workerDigest ?? '')) {
    return { current: false, status: 'INVALID', reasons: ['Exact application SHA and worker digest are required.'] };
  }
  const generated = new Set([
    'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
    'data/rcap-grade-a/launch-control/PACKET_DATABASE_REPAIR_EVIDENCE.json',
    'data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json',
    'docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md',
    'data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json',
    'data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json',
    // Preserved pre-existing operating notes are not application inputs.
    'CAPTAIN_RESTART.md',
    // Release records regenerated or updated after the application freeze
    // (publication evidence, image acceptance, staging action, fulfillment
    // authority). Data, not orchestration: the orchestration set is
    // scripts/ and .github/ only.
    'data/rcap-render/worker-publication-evidence.json',
    'data/rcap-staging-action.json',
    'data/rcap-grade-a/fulfillment-authority-projection.json',
    'data/rcap-grade-a/fulfillment-authority-registry.json',
    'data/rcap-grade-a/fulfillment-observation-snapshot.json',
    // The successor-freeze receipt: written after the freeze it describes, so
    // it can never be inside it. A release record, like the ones above --
    // evidence about the release, not an input the image is built from.
    'data/rcap-grade-a/mission-lock/successor-application-freeze.json',
    // Roger's independent Production Legal Aid migration authorization: filled
    // only from passing acceptance run ids, read by the migrate control.
    'data/rcap-production-legal-aid-migration-authorization.json',
    // Roger's 2026-09-16 production incident authorization: the forward
    // migration chain Production lacks, filled from the readback run id.
    'data/rcap-production-forward-chain-migration-authorization.json',
    ...receiptPaths.filter(p => /^(data\/rcap-grade-a\/participant-data-rights|private\/rcap-hosted-acceptance)\//.test(p))
  ]);
  try {
    // Exact release-specific tooling binding. No prefix or arbitrary post-freeze exemption.
    const toolingPath = 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
    if (fs.existsSync(path.join(root, toolingPath))) {
      const binding = JSON.parse(fs.readFileSync(path.join(root, toolingPath)));
      // The tuple is read from the controlling candidate record, not written
      // here. A literal tuple made the check exact for exactly one release and
      // unsatisfiable for every later one: a correctly bound successor was
      // refused for the sole reason that it was not the September tuple, which
      // is a verifier defect rather than a finding about the successor. The
      // invariant is unchanged and the strictness is not relaxed — the binding
      // must still equal the candidate on all four identities, exactly, and the
      // candidate is itself anchored below to the publication evidence and to
      // the current worker inputs, so nothing self-certifies.
      const frozen = {
        applicationSha: candidate.applicationSha,
        workerSourceSha: candidate.workerSourceSha,
        workerDigest: candidate.workerDigest,
        workerInputFingerprint: candidate.workerInputFingerprint
      };
      const shapes = {
        applicationSha: /^[a-f0-9]{40}$/,
        workerSourceSha: /^[a-f0-9]{40}$/,
        workerDigest: /^sha256:[a-f0-9]{64}$/,
        workerInputFingerprint: /^sha256:[a-f0-9]{64}$/
      };
      for (const [key, value] of Object.entries(frozen)) {
        if (!shapes[key].test(value ?? '')) throw new Error(`Candidate ${key} is absent or not an exact identity`);
        if (binding[key] !== value) throw new Error(`Tooling binding ${key} does not equal the candidate's`);
      }
      if (!/^[a-f0-9]{40}$/.test(binding.toolsSha ?? '')) throw new Error('Exact tools SHA required');
      const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
      git(['merge-base', '--is-ancestor', candidate.applicationSha, binding.toolsSha]);
      git(['merge-base', '--is-ancestor', binding.toolsSha, 'HEAD']);
      // One-commit local-only repair receipt: exact content pins avoid a
      // self-referential tools commit SHA. This admits ONLY this finite repair,
      // never a path prefix, runtime input or permission to execute/publish.
      const localRepairPaths = [
        'scripts/rcap-acceptance-fixture-retention.mjs',
        'scripts/rcap-acceptance-queue-reconciliation.mjs',
        'scripts/rcap-acceptance-queue-reconciliation.test.mjs',
        'scripts/rcap-hosted-acceptance-payment.mjs',
        'scripts/verify-rcap-target-worker-journey.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
        'scripts/grade-a-launch-control/test-acceptance-queue-tools-binding.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs',
        'scripts/grade-a-launch-control/verify-hosted-tools-binding.test.mjs',
        'docs/rcap/grade-a/handoffs/ACCEPTANCE_QUEUE_36186574507_INVENTORY.json',
        'docs/rcap/grade-a/handoffs/ACCEPTANCE_QUEUE_36186574507_REPAIR.md'
      ];
      const localPinned = new Set();
      const clinicContextPaths = [
        'scripts/verify-rcap-commercial-browser.mjs',
        'scripts/rcap-clinic-worker-context.mjs',
        'scripts/rcap-clinic-worker-context.test.mjs',
        'scripts/rcap-clinic-failed-target-reconciliation.mjs',
        'scripts/rcap-clinic-failed-target-reconciliation.test.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
        'scripts/grade-a-launch-control/test-clinic-context-tools-binding.mjs',
        'scripts/grade-a-launch-control/test-acceptance-queue-tools-binding.mjs',
        'docs/rcap/grade-a/handoffs/CLINIC_RUNTIME_36204248464_INVENTORY.json',
        'docs/rcap/grade-a/handoffs/CLINIC_RUNTIME_36204248464_REPAIR.md'
      ];
      const downstreamPaths = [
        'scripts/rcap-clinic-packet-capacity.mjs',
        'scripts/rcap-clinic-downstream-closure.mjs',
        'scripts/rcap-hosted-ms-clinic-preview-seed.mjs',
        'scripts/verify-rcap-commercial-browser.mjs',
        'scripts/verify-rcap-hosted-ms-clinic-preview.mjs',
        'scripts/test-rcap-sponsored-delivery-binding.mjs',
        'scripts/rcap-clinic-failed-target-reconciliation.mjs',
        'scripts/rcap-clinic-failed-target-reconciliation.test.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
        'scripts/grade-a-launch-control/test-clinic-downstream-tools-binding.mjs',
        'docs/rcap/grade-a/handoffs/CLINIC_DOWNSTREAM_36204248464_INVENTORY.json',
        'docs/rcap/grade-a/handoffs/CLINIC_DOWNSTREAM_36204248464_REPAIR.md'
      ];
      const accessHistoryPaths = [
        'scripts/rcap-hosted-ms-clinic-preview-seed.mjs',
        'scripts/rcap-clinic-access-code-history.test.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'
      ];
      if (binding.localClinicAccessHistoryRepair) {
        const repair=binding.localClinicAccessHistoryRepair;
        if (repair.baseSha !== '84f0fe2ef1ab2072ebb452cab5fb025baaf079a7'
          || repair.schemaVersion !== 'rcap-local-clinic-access-history-tools/v1'
          || repair.executionAuthorized !== false || repair.pushAuthorized !== false
          || ['clinicDispatchReady','hostedFullReady','productionAuthorized','deploymentAuthorized',
            'migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized',
            'imageAcceptanceRerunAuthorized'].some(k=>binding[k]!==false))
          throw new Error('Clinic access history repair must remain execution-held');
        git(['merge-base','--is-ancestor',repair.baseSha,'HEAD']);
        if(JSON.stringify(Object.keys(repair.files??{}).sort())!==JSON.stringify([...accessHistoryPaths].sort()))throw new Error('Clinic access history file set differs');
        for(const p of accessHistoryPaths){
          if(repair.files[p]!==createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'))throw new Error(`Clinic access history content drift: ${p}`);
          localPinned.add(p);generated.add(p);
        }
      }
      if (binding.localClinicDownstreamRepair) {
        const repair=binding.localClinicDownstreamRepair;
        if (repair.baseSha !== '51ad71a326112eda76f089ef27284b1bc15cba7f'
          || repair.schemaVersion !== 'rcap-local-clinic-downstream-tools/v1'
          || repair.executionAuthorized !== false || repair.pushAuthorized !== false
          || binding.clinicDispatchReady !== false || binding.hostedFullReady !== false
          || binding.productionAuthorized !== false || binding.deploymentAuthorized !== false
          || binding.migrationReplayAuthorized !== false || binding.housekeepingReplayAuthorized !== false
          || binding.additionalWorkerPublicationAuthorized !== false || binding.imageAcceptanceRerunAuthorized !== false)
          throw new Error('Clinic downstream repair must remain execution-held');
        git(['merge-base','--is-ancestor',repair.baseSha,'HEAD']);
        if(JSON.stringify(Object.keys(repair.files??{}).sort())!==JSON.stringify([...downstreamPaths].sort()))throw new Error('Clinic downstream file set differs');
        for(const p of downstreamPaths){
          const bytes=localPinned.has(p)?execFileSync('git',['show',`${binding.localClinicAccessHistoryRepair.baseSha}:${p}`],{cwd:root}):fs.readFileSync(path.join(root,p));
          if(repair.files[p]!==createHash('sha256').update(bytes).digest('hex'))throw new Error(`Clinic downstream content drift: ${p}`);
          localPinned.add(p);generated.add(p);
        }
      }
      if (binding.localClinicRuntimeRepair) {
        const repair = binding.localClinicRuntimeRepair;
        if (repair.baseSha !== '579febaaddc5a004d824b74f486e567115db4db2'
          || repair.schemaVersion !== 'rcap-local-clinic-runtime-tools/v1'
          || repair.executionAuthorized !== false || repair.pushAuthorized !== false
          || binding.clinicDispatchReady !== false || binding.hostedFullReady !== false
          || binding.productionAuthorized !== false || binding.deploymentAuthorized !== false
          || binding.migrationReplayAuthorized !== false || binding.housekeepingReplayAuthorized !== false
          || binding.additionalWorkerPublicationAuthorized !== false || binding.imageAcceptanceRerunAuthorized !== false)
          throw new Error('Clinic runtime repair must remain execution-held');
        git(['merge-base','--is-ancestor',repair.baseSha,'HEAD']);
        if (JSON.stringify(Object.keys(repair.files ?? {}).sort()) !== JSON.stringify([...clinicContextPaths].sort()))
          throw new Error('Clinic runtime repair file set differs');
        for (const p of clinicContextPaths) {
          const bytes=localPinned.has(p)?execFileSync('git',['show',`${binding.localClinicDownstreamRepair.baseSha}:${p}`],{cwd:root}):fs.readFileSync(path.join(root,p));
          if (repair.files[p] !== createHash('sha256').update(bytes).digest('hex'))
            throw new Error(`Clinic runtime repair content drift: ${p}`);
          localPinned.add(p);generated.add(p);
        }
      }

      if (binding.localQueueLifecycleRepair) {
        const repair = binding.localQueueLifecycleRepair;
        if (repair.schemaVersion !== 'rcap-local-queue-lifecycle-tools/v1'
          || repair.baseSha !== '18d26b2fd2280d34b105bb69da2f0e26cb05613e'
          || repair.executionAuthorized !== false || repair.pushAuthorized !== false
          || binding.clinicDispatchReady !== false || binding.hostedFullReady !== false
          || binding.productionAuthorized !== false || binding.deploymentAuthorized !== false
          || binding.migrationReplayAuthorized !== false || binding.housekeepingReplayAuthorized !== false
          || binding.additionalWorkerPublicationAuthorized !== false || binding.imageAcceptanceRerunAuthorized !== false)
          throw new Error('Local queue repair must remain execution-held');
        git(['merge-base','--is-ancestor',repair.baseSha,'HEAD']);
        if (JSON.stringify(Object.keys(repair.files ?? {}).sort()) !== JSON.stringify([...localRepairPaths].sort()))
          throw new Error('Local queue repair file set differs');
        for (const p of localRepairPaths) {
          // Preserve the previous immutable receipt; only explicitly superseded files use its base blob.
          const bytes = localPinned.has(p) ? execFileSync('git',['show',`${binding.localClinicRuntimeRepair.baseSha}:${p}`],{cwd:root}) : fs.readFileSync(path.join(root,p));
          const hash = createHash('sha256').update(bytes).digest('hex');
          if (repair.files[p] !== hash) throw new Error(`Local queue repair content drift: ${p}`);
          localPinned.add(p);
          generated.add(p);
        }
      }
      const bounded = new Set([
        ...accessHistoryPaths,
        ...downstreamPaths.filter(p => p.startsWith('scripts/')),
        ...clinicContextPaths.filter(p => p.startsWith('scripts/')),
        ...localRepairPaths.filter(p => p.startsWith('scripts/')),
        // Roger's run 36151713747 tools-only hosted ledger reconciliation.
        // Exact reviewed blobs remain pinned; no migration/source exemption.
        'scripts/rcap-hosted-clinic-migrate.mjs',
        'scripts/verify-rcap-hosted-clinic-migrate.mjs',
        'scripts/test-briefcase-presentation-authority.mjs',
        'data/rcap-staging-authorization-readiness.json',
        '.github/workflows/rcap-hosted-acceptance-staging.yml',
        '.github/workflows/rcap-f1-ephemeral-staging.yml',
        'scripts/rcap-hosted-checkout-gate.mjs',
        // Bounded hosted #336 metadata and remaining-surface controls.
        'scripts/rcap-checkout-metadata-contract.mjs',
        'scripts/rcap-hosted-response-contract.mjs',
        'scripts/rcap-hosted-surface-inspection.mjs',
        'scripts/test-rcap-hosted-surface-contract.mjs',
        'scripts/verify-rcap-checkout-metadata-contract.mjs',
        'scripts/verify-rcap-hosted-evidence-completion.mjs',
        'scripts/test-expungement-checkout-guards.mjs',
        // #338 participant fixture regression, already executed by the hosted workflow.
        'scripts/rcap-hosted-final-verification.test.mjs',
        'scripts/verify-expungement-consumer-checkout.mjs',
        'scripts/verify-rcap-hosted-checkout-gate.mjs',
        'scripts/rcap-hosted-colorado-clinic-browser.mjs',
        'scripts/verify-rcap-hosted-browser.mjs',
        'scripts/rcap-hosted-acceptance-payment.mjs',
        // #345 bounded forward database correction and exact certification.
        // These exact database/tool authorities are outside application/worker
        // inputs; additional migrations still fail this closed path allowlist.
        'supabase/migrations/20260924111541_packet_render_retry_and_phase50_reconciliation.sql',
        'supabase/migrations/20260924120347_packet_delivery_dependency_and_retry_errors.sql',
        'data/rcap-grade-a/launch-control/PACKET_DATABASE_CONTRACT.json',
        'scripts/rcap-hosted-acceptance-migrate.mjs',
        'scripts/rcap-packet-database-contract.mjs',
        'scripts/rcap-packet-database-contract.test.mjs',
        'scripts/rcap-packet-database-reference.mjs',
        'scripts/verify-rcap-packet-database.mjs',
        'scripts/rcap-migration-certification.mjs',
        'scripts/rcap-migration-certification.test.mjs',
        'scripts/rcap-production-clinic-migrate.mjs',
        'scripts/verify-rcap-production-clinic-migrate.mjs',
        'scripts/test-rcap-production-clinic-migrate-mutations.mjs',
        'scripts/rcap-production-migration-contract.mjs',
        'scripts/rcap-production-migration-contract.test.mjs',
        // #345 bounded target retry and explicit promotion-input controls.
        'scripts/verify-rcap-target-worker-journey.mjs',
        'scripts/rcap-hosted-target-retry.test.mjs',
        // Hosted #333 correction controls: source-pruning semantics and the
        // downstream runner's environment/readiness account. Exact files only.
        'scripts/rcap-hosted-acceptance-matrix.mjs',
        'scripts/verify-rcap-deployment-closure.mjs',
        'scripts/rcap-deployment-source-ignore.mjs',
        'scripts/rcap-deployment-source-ignore.test.mjs',
        'scripts/verify-rcap-hosted-job-read-columns.mjs',
        'scripts/rcap-hosted-acceptance-auth-config.mjs',
        'scripts/rcap-hosted-acceptance-gallery.mjs',
        'scripts/verify-rcap-immutable-image-preflight.mjs',
        'scripts/rcap-hosted-acceptance-deploy.mjs',
        'scripts/rcap-hosted-resolve-preview.mjs',
        'scripts/rcap-vercel-identity-recheck.mjs',
        'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
        'scripts/grade-a-launch-control/verify-hosted-tools-binding.test.mjs',
        'scripts/rcap-hosted-vercel-rest-transport.mjs',
        'scripts/rcap-hosted-vercel-diagnostics.mjs',
        'scripts/rcap-hosted-vercel-rest-transport.test.mjs',
        'scripts/rcap-hosted-acceptance-preflight.mjs',
        'scripts/rcap-hosted-acceptance-vercel-identity.test.mjs',
        'scripts/rcap-hosted-acceptance-vercel-identity.mjs',
        'scripts/rcap-hosted-acceptance-redaction.test.mjs',
        'scripts/verify-rcap-staging-scoped-preview-contract.mjs',
        'scripts/verify-rcap-packet-contract.mjs',
        // Production release controls: the same exact-identity pins, moved to
        // the successor tuple under Roger's 2026-09-16 production authorization.
        '.github/workflows/rcap-production-canary.yml',
        '.github/workflows/deploy-rcap-render-worker-production.yml',
        'scripts/verify-rcap-production-worker-execution.mjs',
        'scripts/rcap-production-canary.mjs',
        'scripts/rcap-production-canary-smoke.mjs',
        'scripts/rcap-production-activate.mjs',
        'scripts/rcap-production-public-verify.mjs',
        'scripts/verify-rcap-production-canary.mjs',
        'scripts/verify-rcap-production-smoke.mjs',
        'scripts/verify-rcap-production-activation.mjs',
        'scripts/test-rcap-production-canary-mutations.mjs',
        'scripts/test-rcap-production-smoke-mutations.mjs',
        'scripts/test-rcap-production-activation-mutations.mjs',
        // MVLP rollout controls (Roger's 2026-09-16 MVLP rollout and onboarding
        // authorizations): the hosted Legal Aid phase, the exact Legal Aid
        // migration controls, and the successor worker publication record.
        'scripts/rcap-hosted-legal-aid-seed.mjs',
        'scripts/rcap-hosted-legal-aid-browser.mjs',
        'scripts/rcap-legal-aid/hosted-fixture.mjs',
        'scripts/verify-rcap-hosted-legal-aid-browser.mjs',
        'scripts/rcap-production-legal-aid-migrate.mjs',
        'scripts/verify-rcap-production-legal-aid-migrate.mjs',
        'scripts/test-rcap-production-legal-aid-migrate-mutations.mjs',
        'scripts/rcap-production-legal-aid-keys.mjs',
        'scripts/verify-rcap-production-legal-aid-keys.mjs',
        'scripts/verify-rcap-commercial-browser.mjs',
        'scripts/verify-rcap-partner-result-cta.mjs',
        // Bounded Clinic natural-delivery proof; exact bytes remain declared
        // in HOSTED_TOOLS_BINDING, with application and worker inputs equal.
        'scripts/verify-rcap-hosted-ms-clinic-preview.mjs',
        'scripts/rcap-hosted-ms-clinic-preview-audit.mjs',
        // 2026-09-16 production incident controls: the forward migration
        // chain apply/readback and the public save-transition probe.
        'scripts/rcap-production-forward-chain-migrate.mjs',
        'scripts/verify-rcap-production-forward-chain-migrate.mjs',
        'scripts/test-rcap-production-forward-chain-migrate-mutations.mjs',
        'scripts/rcap-production-save-transition-probe.mjs',
        'scripts/verify-rcap-production-save-transition-probe.mjs',
        // 2026-09-22 release-control repair, bound to the successor freeze.
        // The GitHub-hosted fallback is CALLABLE, so its workflow, gate,
        // verifier and post-payment control are release controls in exactly
        // the sense this set means: leaving them out would let an alternate
        // path earn current evidence against an older worker while the bounded
        // set said nothing had moved. The two mutation suites are the controls
        // that keep the repair honest, so they are bound with it.
        '.github/workflows/rcap-github-hosted-acceptance.yml',
        'scripts/rcap-github-acceptance-gate.mjs',
        'scripts/verify-rcap-github-hosted-acceptance.mjs',
        'scripts/test-rcap-github-hosted-acceptance-mutations.mjs',
        'scripts/rcap-github-post-payment-acceptance.mjs',
        'scripts/grade-a-launch-control/test-release-candidate-binding-mutations.mjs',
        'scripts/grade-a-launch-control/test-release-control-boundary-mutations.mjs',
        'scripts/test-rcap-release-containment.mjs',
        // Mississippi proof-currentness controls read evidence and assert its
        // history/behavior; they do not change application or worker inputs.
        // They still require an exact declaration and the tools commit's bytes.
        'scripts/verify-ms-paid-packet-proof-reconciliation.mjs',
        'scripts/test-ms-proof-currentness.mjs'
      ]);
      const delta = git(['diff', '--name-only', candidate.applicationSha, binding.toolsSha]).split('\n').filter(Boolean);
      if (delta.some(p => !generated.has(p) && p !== toolingPath && !bounded.has(p))) throw new Error('Unbounded tooling delta');
      const declared = binding.orchestrationFiles;
      const actual = delta.filter(p => bounded.has(p)).sort();
      if (!Array.isArray(declared) || JSON.stringify([...declared].sort()) !== JSON.stringify(actual)) throw new Error('Tooling file set mismatch');
      // The approved commit's exact blobs must still be present: future changes refuse.
      const unchangedTools = actual.filter(p => !localPinned.has(p));
      if (unchangedTools.length > 0) git(['diff', '--exit-code', binding.toolsSha, '--', ...unchangedTools]);
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
    // The candidate names a worker source SHA; it must be the one that was
    // actually published, not merely an ancestor of the application. Without
    // this the candidate could name any tree and still satisfy the line below.
    if (candidate.workerSourceSha && publication.sourceSha !== candidate.workerSourceSha) {
      reasons.push(`Candidate worker source ${candidate.workerSourceSha} is not the published source ${publication.sourceSha}.`);
    }
    reasons.push(...imageAcceptanceRefusals(publication, candidate));
    execFileSync('git', ['merge-base', '--is-ancestor', publication.sourceSha, candidate.applicationSha], { cwd: root, stdio: 'pipe' });
    const plan = createWorkerInputPlan({ rootDir: root, candidateSha: candidate.applicationSha,
      acceptedSourceSha: publication.sourceSha, acceptedDigest: publication.immutableRegistryDigest });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    const roots = [...plan.comparedInputs, 'src', 'public', 'deploy', 'workers', 'scripts', 'package.json', 'package-lock.json', 'next.config.js', 'next.config.ts', 'next.config.mjs', 'tsconfig.json', 'vercel.json'];
    const untrackedRuntime = untracked.filter(p => roots.some(root => p === root || p.startsWith(root.replace(/\/$/, '') + '/')) && !generated.has(p));
    const changedInputs = [...changed.filter(p => !generated.has(p)), ...untrackedRuntime];
    if (changedInputs.length) reasons.push(`Candidate inputs changed: ${changedInputs.join(', ')}`);
    if (plan.rebuildRequired !== false) reasons.push('Current application requires a successor worker publication.');
  } catch (error) {
    // Name what refused. A single opaque sentence for ten distinct checks made
    // a legitimate "not yet bound" state indistinguishable from a broken
    // verifier, which is how the historical hard pin survived unnoticed.
    const detail = (error?.message ?? String(error)).split('\n')[0].trim();
    reasons.push(`Candidate ancestry or current worker input proof could not be verified: ${detail || 'no detail reported'}`);
  }
  return { current: reasons.length === 0, status: reasons.length ? 'STALE_OR_UNVERIFIED' : 'CURRENT', reasons };
}

export const CANDIDATE_PATH = 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';

// Release consumers share the controlling record and its existing verifier.
// A worker source or a later tools commit never becomes application authority
// merely because it is current. Missing, forged or stale bindings refuse.
export function requireCurrentReleaseCandidate(root = process.cwd()) {
  const candidate = JSON.parse(fs.readFileSync(path.join(root, CANDIDATE_PATH), 'utf8'));
  const result = verifyReleaseCandidateBinding(root, candidate, candidate?.participantReceiptPaths ?? []);
  if (result.current !== true || result.status !== 'CURRENT') {
    throw new Error(`Current release candidate required: ${result.reasons.join('; ')}`);
  }
  return candidate;
}

/**
 * The same single implementation, runnable.
 *
 * Executing this module used to do nothing and exit 0, so a workflow that
 * "ran the verifier" would have proved nothing at all -- a green step that
 * never asked a question. There is no second verifier here: this loads the
 * controlling record, calls the exported function, prints every refusal, and
 * exits nonzero unless the answer is exactly CURRENT.
 */
export function runReleaseCandidateBindingCli(root = process.cwd(), out = console) {
  const candidatePath = path.join(root, CANDIDATE_PATH);
  if (!fs.existsSync(candidatePath)) {
    out.error(`status : NOT_FROZEN\ncurrent: false\nreason : ${CANDIDATE_PATH} does not exist.`);
    return 1;
  }
  let candidate;
  try {
    candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  } catch (error) {
    out.error(`status : INVALID\ncurrent: false\nreason : ${CANDIDATE_PATH} is not readable JSON: ${error?.message ?? error}`);
    return 1;
  }
  const result = verifyReleaseCandidateBinding(root, candidate, candidate.participantReceiptPaths ?? []);
  const lines = [
    `status : ${result.status}`,
    `current: ${result.current}`,
    `candidate application ${result.applicationSha ?? candidate.applicationSha}`,
    `candidate worker      ${result.workerSourceSha ?? candidate.workerSourceSha}`,
    `candidate digest      ${Object.hasOwn(result, 'workerDigest') ? result.workerDigest ?? 'pending' : candidate.workerDigest}`
  ];
  for (const reason of result.reasons) lines.push(`refused: ${reason}`);
  const ok = result.current === true && result.status === 'CURRENT';
  (ok ? out.log : out.error).call(out, lines.join('\n'));
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runReleaseCandidateBindingCli());
}


// The accepted successor has one evidence/tools commit after its publication
// binding. Exact content hashes solve the one-commit self-SHA problem without
// granting an arbitrary later tools overlay or changing the application source.
export function verifyAcceptedSuccessorBinding(root,candidate,pending=verifyPendingWorkerSuccessor(root)) {
 try {
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
  const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
  const toolingPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
  const binding=read(toolingPath),t=binding.successorTools;
  if(!pending?.current)throw new Error('Accepted successor required');
  const fail=(ok,msg)=>{if(!ok)throw new Error(msg);};
  const base='c5942743b657b6a17165b72a308efd1cabc2d90e';
  fail(t?.schemaVersion==='rcap-successor-resume-tools/v1'&&t.baseSha===base&&binding.toolsSha===(t.networkCorrectionBaseSha??t.correctionBaseSha??base)&&t.commit==='single-commit-after-base','Exact successor tools base required');
  const correctionBase='77fa4c372278b722fd87f9cc4fec26fa560a0975';
  const networkBase='100377462ab83508be1d202472e42313a35bdfa2';
  const commitBase=t.networkCorrectionBaseSha??t.correctionBaseSha??base;
  if(t.networkCorrectionBaseSha){
   fail(t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact second tools correction base required');
   const permitted=[toolingPath,'scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-network-policy.mjs','scripts/rcap-clinic-resume-network-policy.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',networkBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Network policy correction changes only');
   const previous=JSON.parse(git(['show',`${networkBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:networkBase,successorTools:{...previous.successorTools,networkCorrectionBaseSha:networkBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact network policy tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.correctionBaseSha&&!t.networkCorrectionBaseSha){
   fail(t.correctionBaseSha===correctionBase,'Exact transport correction base required');
   const permitted=[toolingPath,'scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-transport.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',correctionBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Transport correction changes only');
   const previous=JSON.parse(git(['show',`${correctionBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:correctionBase,successorTools:{...previous.successorTools,correctionBaseSha:correctionBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact transport tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  const head=git(['rev-parse','HEAD']);
  if(head!==commitBase)fail(git(['rev-parse',`${head}^`])===commitBase&&git(['rev-list','--parents','-n','1',head]).split(' ').length===2,'One non-merge successor tools commit required');
  for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','runtimeAccepted','workerRebuildRequired']){
   fail(candidate?.[key]===pending[key]&&binding[key]===pending[key],`Accepted tuple mismatch: ${key}`);
  }
  for(const k of ['productionAuthorized','deploymentAuthorized','migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized','hostedFullReady','clinicDispatchReady'])fail(binding[k]===false,`Tools cannot authorize ${k}`);
  fail(binding.previewExecution==='held'&&candidate.previewExecution==='held'&&candidate.productionAuthorized===false&&candidate.productionAuthorization===null,'Execution remains held');
  fail(candidate.status===pending.status&&candidate.hostedAcceptanceStatus===pending.status&&binding.status===pending.status,'Accepted Preview-pending state required');
  fail(candidate.hostedAcceptance?.preview===null&&candidate.hostedAcceptance?.naturalDelivery===null&&candidate.hostedAcceptance?.manualHostedFullReady===false&&candidate.hostedAcceptance?.journeys?.length===0,'No successor hosted acceptance yet');
  const e=read('data/rcap-render/worker-publication-evidence.json');assertSuccessorImageAcceptance(root,e);
  fail(imageAcceptanceRefusals(e,candidate).length===0,'Native image acceptance mismatch');
  fail(JSON.stringify(candidate.readOnlyImageAcceptance)===JSON.stringify(e.imageAcceptance),'Candidate must bind complete native acceptance');
  fail(candidate.publication?.runId===e.workflowRunId&&candidate.publication?.artifactId===e.publicationArtifactId&&candidate.publication?.artifactSha256===e.publicationArtifactSha256&&candidate.publication?.conclusion==='success','Publication binding mismatch');
  fail(candidate.workerDigestReference===e.digestPinnedReference,'Digest reference mismatch');
  for(const [rel,hash] of Object.entries(t.files??{})){
   fail(/^[0-9a-f]{64}$/.test(hash),'Exact tools content hash required');
   fail(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex')===hash,`Successor tools drift: ${rel}`);
  }
  const delta=git(['diff','--name-only',base]).split('\n').filter(Boolean);
  const untracked=git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);
  // Native evidence may be ignored until explicitly staged during preparation.
  const all=new Set([...delta,...untracked,...Object.keys(t.files??{})]);all.delete(toolingPath);
  fail(JSON.stringify([...all].sort())===JSON.stringify(Object.keys(t.files??{}).sort()),'Undeclared successor tools changes');
  if(head!==commitBase)fail(JSON.stringify(delta.filter(p=>p!==toolingPath).sort())===JSON.stringify(Object.keys(t.files??{}).sort()),'Exact committed successor change set required');
  for(const rel of [toolingPath,CANDIDATE_PATH]){
   const historical=JSON.parse(git(['show',`${base}:${rel}`]));
   fail(JSON.stringify(read(rel).supersededRecord)===JSON.stringify(historical),`Historical binding changed: ${rel}`);
  }
  fail(verifySuccessorPublication(root).current===true,'Canonical worker inputs or publication drift');
  return {current:true,status:'CURRENT',hostedAcceptanceStatus:pending.status,previewExecution:'held',productionAuthorized:false,reasons:[]};
 }catch(error){return {current:false,status:'STALE_OR_UNVERIFIED',reasons:[error.message]};}
}
