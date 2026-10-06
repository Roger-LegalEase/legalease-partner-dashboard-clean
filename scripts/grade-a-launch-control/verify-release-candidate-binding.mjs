import {AUTHORIZED_FORWARD,verifyForwardProductionSuccessor} from './verify-forward-production-successor.mjs';
import {PUBLIC_VERIFICATION_CLOSURE_BASE,PUBLIC_VERIFICATION_CLOSED_STATUS,PUBLIC_VERIFICATION_CLOSED_SCOPE,BOUND_PUBLIC_VERIFICATION} from './production-preflight-authorization.mjs';
import {PUBLIC_VERIFICATION_BASE,PUBLIC_VERIFICATION_STATUS,PUBLIC_VERIFICATION_SCOPE,assertPublicVerificationAuthorization} from './production-preflight-authorization.mjs';
import {ACTIVATION_CLOSURE_BASE,ACTIVATION_CLOSED_STATUS,ACTIVATION_CLOSED_SCOPE,BOUND_ACTIVATION} from './production-preflight-authorization.mjs';
import {ACTIVATION_BASE,ACTIVATION_STATUS,ACTIVATION_SCOPE,assertActivationAuthorization} from './production-preflight-authorization.mjs';
import {PREACTIVATION_BASE,PREACTIVATION_SCOPE,PREACTIVATION_PHASES,BOUND_RESTAGE,BOUND_SMOKE,STAGED_DEPLOYMENT,PREACTIVATION_NOTE,assertPreactivationAuthorization} from './production-preflight-authorization.mjs';
import {PREFLIGHT_EVIDENCE_FILES,verifyProductionPreflightEvidence,verifyProductionRestageEvidence,verifyProductionSmokeEvidence,verifyProductionActivationEvidence,verifyProductionPublicVerificationEvidence} from './verify-production-preflight-evidence.mjs';
import {PREFLIGHT_BASE,PREFLIGHT_SCOPE,assertPreflightOnlyAuthorization} from './production-preflight-authorization.mjs';
import {HOSTED_BASE,HOSTED_EVIDENCE_FILES,PREVIEW,verifyHostedAcceptanceEvidence} from './verify-hosted-acceptance-evidence.mjs';
import {applicationInputManifest, applicationInputEquivalence} from '../rcap-application-inputs.mjs';
import {verifyPendingWorkerSuccessor,verifySuccessorPublication,assertSuccessorImageAcceptance} from './verify-pending-worker-successor.mjs';
import {verifyPinnedBinding,verifyPinnedForwardBinding} from './verify-pinned-worker-successor.mjs';
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
  // A pinned preparation record is descriptive and NEVER current/dispatchable.
  // Validate it before comparing the orchestration checkout to application
  // runtime inputs: publication evidence is intentionally newer here, while
  // the application build remains pinned to its unchanged source checkout.
  const pinnedRecordPath=path.join(root,'data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json');
  if(fs.existsSync(pinnedRecordPath)){
    try{
      if(JSON.parse(fs.readFileSync(pinnedRecordPath)).applicationSource===AUTHORIZED_FORWARD)
        return verifyForwardProductionSuccessor(root,candidate);
      if(JSON.parse(fs.readFileSync(pinnedRecordPath)).applicationSource==='pinned-source-forward')
        return verifyPinnedForwardBinding(root,candidate);
      if(JSON.parse(fs.readFileSync(pinnedRecordPath)).applicationSource==='pinned-source')
        return verifyPinnedBinding(root,candidate,verifyPendingWorkerSuccessor(root));
    }catch(error){return {current:false,status:'INVALID_PINNED_BINDING',reasons:[error.message]};}
  }
  if(candidate?.applicationSha){
    try {
      const application = applicationInputEquivalence(root,candidate.applicationSha,'HEAD');
      if(!application.equivalent)return {current:false,status:'STALE_APPLICATION_INPUTS',reasons:application.changedPaths};
      const manifest=applicationInputManifest(root,candidate.applicationSha);
      const dirty=execFileSync('git',['diff','--name-only',candidate.applicationSha],{cwd:root,encoding:'utf8'}).trim().split('\n');
      const runtime=new Set(manifest.files.map(f=>f.path));
      if(dirty.some(f=>runtime.has(f)))return {current:false,status:'STALE_APPLICATION_INPUTS',reasons:dirty.filter(f=>runtime.has(f))};
    } catch(error){return {current:false,status:'INVALID_APPLICATION_INPUTS',reasons:[error.message]};}
  }
  const pending = verifyPendingWorkerSuccessor(root);
  if(pending?.current && pending.releaseBaseSha)return verifyGenerationBinding(root,candidate,pending);
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
    // Only non-runtime release bookkeeping may follow the application freeze.
    // Runtime-consumed publication and authority are application inputs.
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
  fail(t?.schemaVersion==='rcap-successor-resume-tools/v1'&&t.baseSha===base&&binding.toolsSha===(t.signInCorrectionBaseSha??t.deployedNetworkCorrectionBaseSha??t.orderingCorrectionBaseSha??t.checkpointCorrectionBaseSha??t.networkCorrectionBaseSha??t.correctionBaseSha??base)&&t.commit==='single-commit-after-base','Exact successor tools base required');
  const correctionBase='77fa4c372278b722fd87f9cc4fec26fa560a0975';
  const networkBase='100377462ab83508be1d202472e42313a35bdfa2';
  const checkpointBase='1d47f0238670c36523ff9d7014126966b31aecde';
  const orderingBase='343023e84211b1bc7105f26a265b2a84c2b3245c';
  const commitBase=t.signInCorrectionBaseSha??t.deployedNetworkCorrectionBaseSha??t.orderingCorrectionBaseSha??t.checkpointCorrectionBaseSha??t.networkCorrectionBaseSha??t.correctionBaseSha??base;
  const deployedNetworkBase='658d2368fe54d0b369edc7768985ab8a74783262';
  const signInBase='7214b7cbec3566a9a9895eaaffb9dbc6d46baa7d';
  if(t.signInCorrectionBaseSha){
   fail(t.signInCorrectionBaseSha===signInBase&&t.deployedNetworkCorrectionBaseSha===deployedNetworkBase&&t.orderingCorrectionBaseSha===orderingBase&&t.checkpointCorrectionBaseSha===checkpointBase&&t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact sign-in correction base required');
   const permitted=["data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json", "data/rcap-grade-a/launch-control/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json", "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs", "scripts/grade-a-launch-control/accepted-successor-binding.test.mjs", "scripts/rcap-hosted-clinic-resume.mjs", "scripts/rcap-clinic-resume-sign-in.mjs", "scripts/rcap-clinic-resume-sign-in.test.mjs", "scripts/rcap-clinic-resume-sign-in-fixture.mjs", "scripts/rcap-clinic-resume-network-policy.mjs", "scripts/rcap-clinic-resume-network-policy.test.mjs", "scripts/rcap-clinic-resume-resource-loading.test.mjs", "scripts/rcap-clinic-resume-contract.mjs", "scripts/rcap-clinic-resume-contract.test.mjs", "scripts/rcap-clinic-resume-browser-reset.mjs", "scripts/rcap-clinic-resume-browser-reset.test.mjs", "scripts/rcap-clinic-resume-browser-lifecycle.mjs", "scripts/rcap-clinic-resume-browser-ports.mjs", "scripts/rcap-clinic-resume-connected-fixture.mjs", "scripts/rcap-clinic-resume-connected.test.mjs", "scripts/rcap-clinic-resume-delivery-guard.test.mjs", "scripts/rcap-clinic-resume-transport.test.mjs"];
   const changes=[...git(['diff','--name-only',signInBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Sign-in correction changes only');
   const previous=JSON.parse(git(['show',`${signInBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:signInBase,successorTools:{...previous.successorTools,signInCorrectionBaseSha:signInBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact sign-in correction binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.deployedNetworkCorrectionBaseSha&&!t.signInCorrectionBaseSha){
   fail(t.deployedNetworkCorrectionBaseSha===deployedNetworkBase&&t.orderingCorrectionBaseSha===orderingBase&&t.checkpointCorrectionBaseSha===checkpointBase&&t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact deployed network correction base required');
   const permitted=[toolingPath,'scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-network-policy.mjs','scripts/rcap-clinic-resume-network-policy.test.mjs','scripts/rcap-clinic-resume-resource-loading.test.mjs','scripts/rcap-clinic-resume-captcha.mjs','scripts/rcap-clinic-resume-captcha.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',deployedNetworkBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Deployed network correction changes only');
   const previous=JSON.parse(git(['show',`${deployedNetworkBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:deployedNetworkBase,successorTools:{...previous.successorTools,deployedNetworkCorrectionBaseSha:deployedNetworkBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact deployed network tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.orderingCorrectionBaseSha&&!t.deployedNetworkCorrectionBaseSha){
   // Fourth bounded correction: the reset write boundary. The browser adapter,
   // contract ordering, their tests and this verifier may move; nothing else.
   fail(t.orderingCorrectionBaseSha===orderingBase&&t.checkpointCorrectionBaseSha===checkpointBase&&t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact fourth tools correction base required');
   const permitted=[toolingPath,'scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-contract.mjs','scripts/rcap-clinic-resume-contract.test.mjs','scripts/rcap-clinic-resume-browser-reset.mjs','scripts/rcap-clinic-resume-browser-reset.test.mjs','scripts/rcap-clinic-resume-transport.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',orderingBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Ordering correction changes only');
   const previous=JSON.parse(git(['show',`${orderingBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:orderingBase,successorTools:{...previous.successorTools,orderingCorrectionBaseSha:orderingBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact ordering tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.checkpointCorrectionBaseSha&&!t.orderingCorrectionBaseSha){
   fail(t.checkpointCorrectionBaseSha===checkpointBase&&t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact third tools correction base required');
   const permitted=[toolingPath,'.github/workflows/rcap-hosted-acceptance-staging.yml','scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-contract.mjs','scripts/rcap-clinic-resume-contract.test.mjs','scripts/rcap-clinic-resume-queue-privacy.test.mjs','scripts/rcap-clinic-resume-workflow.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',checkpointBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Checkpoint correction changes only');
   const previous=JSON.parse(git(['show',`${checkpointBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:checkpointBase,successorTools:{...previous.successorTools,checkpointCorrectionBaseSha:checkpointBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact checkpoint tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.networkCorrectionBaseSha&&!t.checkpointCorrectionBaseSha){
   fail(t.networkCorrectionBaseSha===networkBase&&t.correctionBaseSha===correctionBase,'Exact second tools correction base required');
   const permitted=[toolingPath,'scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-network-policy.mjs','scripts/rcap-clinic-resume-network-policy.test.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','scripts/grade-a-launch-control/accepted-successor-binding.test.mjs'];
   const changes=[...git(['diff','--name-only',networkBase]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean);
   fail(changes.every(p=>permitted.includes(p)),'Network policy correction changes only');
   const previous=JSON.parse(git(['show',`${networkBase}:${toolingPath}`]));
   const expected={...previous,toolsSha:networkBase,successorTools:{...previous.successorTools,networkCorrectionBaseSha:networkBase,files:t.files}};
   fail(JSON.stringify(binding)===JSON.stringify(expected),'Only exact network policy tools binding may advance');
   for(const [rel,hash] of Object.entries(previous.successorTools.files))if(!permitted.includes(rel))fail(t.files[rel]===hash,`Prior tools evidence changed: ${rel}`);
  }
  if(t.correctionBaseSha&&!t.networkCorrectionBaseSha&&!t.checkpointCorrectionBaseSha){
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
  if(pending.applicationSha!==pending.workerSourceSha){
    expect(read('data/rcap-grade-a/launch-control/APPLICATION_INPUT_MANIFEST.json'),applicationInputManifest(root,pending.applicationSha),'candidate-derived application manifest');
  }
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

// The same bounded single-successor tools pattern, with a generation-specific
// release base and exact manifest. No future SHA is guessed or self-referenced.
const PRIOR_GENERATION_FILES=[
 'scripts/rcap-sponsor-funding-migration-prerequisite.mjs',
 'scripts/rcap-sponsor-funding-migration-prerequisite.test.mjs',
 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',
 'data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json',
 'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs',
 'scripts/grade-a-launch-control/verify-pending-worker-successor.test.mjs',
 'scripts/rcap-clinic-resume-workflow.test.mjs',
 'scripts/rcap-clinic-resume-captcha.test.mjs',
];
// DS-08 tools-only currentness successor; predecessor generations retain
// their original exact manifest and all historical validation.
const DS08_GENERATION_FILES=[
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json"
];
// Exact hosted-pin successor; no historical workflow pins are reclassified.
const HOSTED_PIN_GENERATION_FILES=[
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
 ".github/workflows/rcap-f1-ephemeral-staging.yml",
 ".github/workflows/rcap-hosted-acceptance-staging.yml",
 "scripts/rcap-clinic-resume-workflow.test.mjs"
];
// Runner-only continuity bootstrap successor; prior manifests remain exact.
const BOOTSTRAP_GENERATION_FILES=[
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
 ".github/workflows/rcap-hosted-acceptance-staging.yml",
 "scripts/rcap-hosted-preserved-keys.test.mjs"
];
// Exact Checkout digest-pin correction; prior generation boundaries persist.
const CHECKOUT_PIN_GENERATION_FILES=[
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
 "scripts/rcap-hosted-checkout-gate.mjs"
];
// Synthetic fixture lifecycle successor; accepted runtime and historical bindings are unchanged.
const CHECKOUT_LIFECYCLE_GENERATION_FILES=[
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
  "scripts/rcap-hosted-checkout-gate.mjs",
  "scripts/rcap-hosted-checkout-mapping-evidence.test.mjs",
  "scripts/rcap-hosted-final-verification.test.mjs",
  "scripts/verify-rcap-hosted-checkout-gate.mjs"
];
// Application authority successor: application and worker sources have separate custody.
const APPLICATION_AUTHORITY_GENERATION_FILES=[
  "scripts/verify-rcap-staging-scoped-preview-contract.mjs",
  "scripts/verify-rcap-hosted-checkout-gate.mjs",
  "scripts/verify-rcap-preview-reuse-contract.mjs",
  "scripts/rcap-clinic-resume-workflow.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-pending-worker-successor.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
  "data/rcap-grade-a/launch-control/APPLICATION_INPUT_MANIFEST.json",
  ".github/workflows/rcap-hosted-acceptance-staging.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-application-inputs.mjs",
  "scripts/rcap-application-inputs.test.mjs",
  "scripts/verify-rcap-application-candidate.mjs"
];
// Packet reference currentness successor; application and worker identities remain frozen.
const PACKET_DATABASE_GENERATION_FILES=[
  "scripts/rcap-clinic-resume-workflow.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-pending-worker-successor.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
  "data/rcap-grade-a/launch-control/PACKET_DATABASE_CONTRACT.json",
  "scripts/rcap-packet-database-reference.mjs",
  "scripts/rcap-packet-database-contract.test.mjs"
];
// Protected Preview Checkout return transport only; historical scopes remain exact.
const CHECKOUT_RETURN_GENERATION_FILES=[
  "scripts/rcap-stripe-checkout-browser.mjs",
  "scripts/rcap-stripe-checkout-browser.test.mjs",
  "scripts/test-rcap-stripe-checkout-browser-mutations.mjs",
  "scripts/rcap-hosted-acceptance-payment.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json"
];
const HOSTED_GENERATION_FILES=[
 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
 'scripts/grade-a-launch-control/verify-pending-worker-successor.mjs',
 'scripts/grade-a-launch-control/verify-hosted-acceptance-evidence.mjs',
 'scripts/grade-a-launch-control/verify-hosted-acceptance-evidence.test.mjs',
 'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs',
 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',
 'data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json',
 ...HOSTED_EVIDENCE_FILES
];
export const GENERATION_FILES=[
 '.github/workflows/deploy-rcap-render-worker-production.yml',
 'scripts/rcap-production-legal-aid-keys.mjs',
 'scripts/rcap-production-save-transition-probe.mjs',
 'scripts/grade-a-launch-control/verify-hosted-acceptance-evidence.test.mjs',
 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
 'scripts/grade-a-launch-control/verify-pending-worker-successor.mjs',
 'scripts/grade-a-launch-control/production-preflight-authorization.mjs',
 'scripts/grade-a-launch-control/production-preflight-authorization.test.mjs',
 'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs',
 'scripts/grade-a-launch-control/verify-pending-worker-successor.test.mjs',
 'scripts/rcap-production-migration-contract.mjs',
 'scripts/rcap-production-migration-contract.test.mjs',
 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',
 'data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json',
];
// Exact tools-only correction for run 36596128309; owner authorization and
// every accepted application/worker/evidence byte remain at the approved base.
export const PRODUCTION_DEPENDENCY_ORDER_BASE='4fd9a89707257927218c185e90006be348ac3d58';
export const PRODUCTION_DEPENDENCY_ORDER_FILES=[
 'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs',
 '.github/workflows/rcap-production-canary.yml',
 'scripts/rcap-production-workflow-dependency-order.test.mjs',
 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',
];
export const PREACTIVATION_FILES=[
 ".github/workflows/deploy-rcap-render-worker-production.yml",
 ".github/workflows/rcap-f1-ephemeral-staging.yml",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json",
 "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
 "hosted-acceptance-evidence/production-preflight-36600904357/11048744402.zip",
 "hosted-acceptance-evidence/production-preflight-36600904357/artifact.json",
 "hosted-acceptance-evidence/production-preflight-36600904357/jobs.json",
 "hosted-acceptance-evidence/production-preflight-36600904357/run.json",
 "scripts/grade-a-launch-control/accepted-successor-binding.test.mjs",
 "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
 "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
 "scripts/grade-a-launch-control/production-preflight-authorization.test.mjs",
 "scripts/grade-a-launch-control/verify-pending-worker-successor.mjs",
 "scripts/grade-a-launch-control/verify-production-preflight-evidence.mjs",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "scripts/rcap-production-preactivation-startup.test.mjs",
 "scripts/rcap-production-workflow-dependency-order.test.mjs"
];
const HOSTED_EVIDENCE_TEST_CORRECTION_BASE='07e4df91f92c243c638fc06823d73447fbf33383';
const HOSTED_EVIDENCE_TEST_CORRECTION_FILES=[
 'scripts/grade-a-launch-control/accepted-successor-binding.test.mjs',
 'scripts/grade-a-launch-control/verify-hosted-acceptance-evidence.test.mjs',
 'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',
 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json',
];
const READINESS_CORRECTION_BASE="d9a349986379679a70db3566fc570e3aea1cfa3a";
const READINESS_CORRECTION_FILES=[
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/fixtures/production-clinic-36625443428/11061205252.zip",
  "scripts/fixtures/production-clinic-36625443428/catalog.json",
  "scripts/fixtures/production-readiness-20260929/README.md",
  "scripts/fixtures/production-readiness-20260929/canonical_matter_rpc.json",
  "scripts/fixtures/production-readiness-20260929/clinic_baseline.json",
  "scripts/fixtures/production-readiness-20260929/clinic_inventory.json",
  "scripts/fixtures/production-readiness-20260929/clinic_source_catalog.json",
  "scripts/fixtures/production-readiness-20260929/forward_inventory.json",
  "scripts/fixtures/production-readiness-20260929/legal_forward_inventory.json",
  "scripts/fixtures/production-readiness-20260929/legal_inventory.json",
  "scripts/fixtures/production-readiness-20260929/packet_source_catalog.json",
  "scripts/fixtures/production-readiness-20260929/project.json",
  "scripts/fixtures/production-readiness-20260929/smoke_clinic.json",
  "scripts/fixtures/production-readiness-20260929/smoke_save_claim.json",
  "scripts/fixtures/production-readiness-20260929/worker_queue.json",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/rcap-production-clinic-certification.test.mjs",
  "scripts/rcap-production-legal-aid-keys.mjs",
  "scripts/rcap-production-legal-aid-keys.test.mjs",
  "scripts/rcap-production-migration-contract.mjs",
  "scripts/rcap-production-readiness-inventory.mjs",
  "scripts/rcap-production-readiness-inventory.test.mjs",
  "scripts/rcap-production-readiness-replay.test.mjs"
];
const CLOSURE_BASE="380865b07d4b57bbc6506117cc189bcb5f33d771";
const CLOSURE_FILES=[
  ".github/workflows/deploy-rcap-render-worker-production.yml",
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-hosted-acceptance-staging.yml",
  ".github/workflows/rcap-production-canary.yml",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-production-forward-chain-migration-authorization.json",
  "data/rcap-production-legal-aid-migration-authorization.json",
  "scripts/fixtures/production-legal-aid-browser-gate/10453896397.zip",
  "scripts/fixtures/production-packet-forward-correction/REVIEW.md",
  "scripts/fixtures/production-packet-forward-correction/captured-canonical-matter-full.json",
  "scripts/fixtures/production-packet-forward-correction/captured-canonical-matter.json",
  "scripts/fixtures/production-packet-forward-correction/captured-catalog.json",
  "scripts/fixtures/production-packet-forward-correction/captured-funding-default-privileges.json",
  "scripts/fixtures/production-packet-forward-correction/captured-funding-dependencies.json",
  "scripts/fixtures/production-packet-forward-correction/captured-funding-full.json",
  "scripts/fixtures/production-packet-forward-correction/captured-funding-prerequisites.json",
  "scripts/fixtures/production-packet-forward-correction/correction-manifest.json",
  "scripts/fixtures/production-packet-forward-correction/expected-funding-catalog.json",
  "scripts/fixtures/production-packet-forward-correction/proposed-forward-delta.sql",
  "scripts/fixtures/production-packet-forward-correction/source-funding-acceptance.json",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/rcap-hosted-legal-aid-browser.mjs",
  "scripts/rcap-hosted-legal-aid-seed.mjs",
  "scripts/rcap-legal-aid-preview.mjs",
  "scripts/rcap-legal-aid-preview.test.mjs",
  "scripts/rcap-production-clinic-certification.test.mjs",
  "scripts/rcap-production-forward-chain-correction.test.mjs",
  "scripts/rcap-production-forward-chain-migrate.mjs",
  "scripts/rcap-production-funding-dependency-contract.mjs",
  "scripts/rcap-production-legal-aid-browser-receipt.mjs",
  "scripts/rcap-production-legal-aid-browser-receipt.test.mjs",
  "scripts/rcap-production-legal-aid-keys.mjs",
  "scripts/rcap-production-legal-aid-keys.test.mjs",
  "scripts/rcap-production-legal-aid-migrate.mjs",
  "scripts/rcap-production-migration-contract.mjs",
  "scripts/rcap-production-migration-contract.test.mjs",
  "scripts/rcap-production-packet-forward-correction-pglite.test.mjs",
  "scripts/rcap-production-packet-forward-correction.mjs",
  "scripts/rcap-production-packet-forward-correction.test.mjs",
  "scripts/rcap-production-preactivation-startup.test.mjs",
  "scripts/rcap-production-readiness-replay.test.mjs",
  "scripts/rcap-production-worker-readiness.mjs",
  "scripts/rcap-production-worker-readiness.test.mjs",
  "scripts/test-rcap-production-forward-chain-migrate-mutations.mjs",
  "scripts/verify-rcap-hosted-legal-aid-browser.mjs",
  "scripts/verify-rcap-production-forward-chain-migrate.mjs"
];
const HARNESS_CORRECTION_BASE="c015c7dbf44596d1f77f405697af9a75c03e045a";
const HARNESS_CORRECTION_FILES=[
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "scripts/rcap-hosted-legal-aid-browser.mjs",
 "scripts/verify-rcap-hosted-legal-aid-browser.mjs",
 "scripts/rcap-hosted-legal-aid-captcha.test.mjs",
 "scripts/rcap-hosted-legal-aid-startup.test.mjs",
 "scripts/rcap-production-worker-readiness.mjs",
 "scripts/rcap-production-worker-readiness.test.mjs",
 "scripts/rcap-hosted-integration-contract.test.mjs",
 "scripts/verify-rcap-hosted-integration-verdict.mjs"
];
const RESTAGE_BINDING_BASE="38051f337879cfecbcafb89c2f3816c2c4a6c456";
const RESTAGE_BINDING_FILES=[
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-production-preflight-evidence.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "hosted-acceptance-evidence/production-restage-36764240971/run.json",
  "hosted-acceptance-evidence/production-restage-36764240971/jobs.json",
  "hosted-acceptance-evidence/production-restage-36764240971/artifact.json",
  "hosted-acceptance-evidence/production-restage-36764240971/11119334551.zip"
];
const RESTAGE_ROUTING_BASE="8d77414e30b7fe26084e7ab525ad8d81d82ae692";
const RESTAGE_ROUTING_FILES=[
  "scripts/rcap-production-canary.mjs",
  "scripts/test-rcap-production-canary-mutations.mjs",
  "scripts/verify-rcap-production-canary.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "scripts/grade-a-launch-control/test-release-candidate-binding-mutations.mjs"
];
const ACTIVATION_ARTIFACT_ISOLATION_BASE='ff85fd0d8ea131a9885885ebde308611bda9c152';
const ACTIVATION_ARTIFACT_ISOLATION_FILES=[
  ".github/workflows/rcap-production-canary.yml",
  "scripts/verify-rcap-production-activation.mjs",
  "scripts/test-rcap-production-activation-mutations.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/rcap-production-activation-artifact-isolation.test.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs"
];
const ACTIVATION_AUTHORIZATION_FILES=[
  "scripts/rcap-production-workflow-dependency-order.test.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs"
];
const SMOKE_EVIDENCE_BASE="eb5099862b664d82449ee20e90798fe9fc275a26";
const SMOKE_EVIDENCE_BINDING_FILES=[
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-production-preflight-evidence.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "hosted-acceptance-evidence/production-smoke-36779982696/run.json",
  "hosted-acceptance-evidence/production-smoke-36779982696/jobs.json",
  "hosted-acceptance-evidence/production-smoke-36779982696/artifact.json",
  "hosted-acceptance-evidence/production-smoke-36779982696/11127253731.zip"
];
const SMOKE_RESET_BASE="d087977b9de5ad7f6a49c0dd3abab59225e2b1f4";
const SMOKE_RESET_FILES=[
  "scripts/rcap-production-canary-smoke.mjs",
  "scripts/rcap-production-smoke-reset.mjs",
  "scripts/verify-rcap-production-smoke.mjs",
  "scripts/test-rcap-production-smoke-mutations.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs"
];
const RESTAGE_TRANSPORT_BASE="0eb8fbd6032f3f2d906f32e50c79e9fb6a2c76f8";
const RESTAGE_TRANSPORT_FILES=[
  "scripts/rcap-production-canary.mjs",
  "scripts/test-rcap-production-canary-mutations.mjs",
  "scripts/verify-rcap-production-canary.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs"
];
const PRODUCTION_RESTAGE_BASE="36f1e3f716aca14ba874cfdb3082edf1c8279ffa";
const PRODUCTION_RESTAGE_FILES=[
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-production-canary.yml",
  "scripts/rcap-production-canary.mjs",
  "scripts/verify-rcap-production-canary.mjs",
  "scripts/test-rcap-production-canary-mutations.mjs",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "scripts/rcap-production-workflow-dependency-order.test.mjs"
];
const PRODUCTION_LEGAL_AID_PROOF_BASE="80e014d35c6af4dcfd57957013781483bb4ffb52";
const PRODUCTION_LEGAL_AID_PROOF_FILES=[
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  ".github/workflows/rcap-production-canary.yml",
  "data/rcap-production-legal-aid-migration-authorization.json",
  "scripts/rcap-production-legal-aid-browser-receipt.mjs",
  "scripts/rcap-production-legal-aid-browser-receipt.test.mjs",
  "scripts/rcap-production-legal-aid-migrate.mjs",
  "scripts/verify-rcap-production-legal-aid-migrate.mjs",
  "scripts/test-rcap-production-legal-aid-migrate-mutations.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "scripts/rcap-hosted-legal-aid-actions.test.mjs",
  "scripts/rcap-production-readiness-replay.test.mjs"
];
const LEGAL_AID_RELATIONSHIPS_BASE="721530ba23f65b5fadd6e72ce83acd87e2d3b2d7";
const LEGAL_AID_RELATIONSHIPS_FILES=[
  "scripts/rcap-hosted-legal-aid-prerequisite.mjs",
  "scripts/rcap-hosted-legal-aid-actions.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs"
];
const LEGAL_AID_HARNESS_SUCCESSOR_BASE="ac9befc5972ebd24e5f1aba2e07ee9081d554698";
const LEGAL_AID_HARNESS_SUCCESSOR_FILES=[
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/rcap-hosted-legal-aid-browser.mjs",
  "scripts/rcap-hosted-legal-aid-captcha.test.mjs",
  "scripts/rcap-hosted-legal-aid-seed.mjs",
  "scripts/rcap-hosted-legal-aid-startup.test.mjs",
  "scripts/rcap-legal-aid/hosted-fixture.mjs",
  "scripts/rcap-legal-aid/hosted-actions.mjs",
  "scripts/rcap-hosted-legal-aid-actions.test.mjs",
  "scripts/verify-rcap-hosted-legal-aid-browser.mjs"
];
const LEGAL_AID_SEED_RERUN_CORRECTION_BASE="652793bb1469192ae3ec8c6dbdb5ae8402c05743";
const LEGAL_AID_SEED_RERUN_CORRECTION_FILES=[
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "scripts/rcap-hosted-legal-aid-seed.mjs",
 "scripts/rcap-hosted-legal-aid-startup.test.mjs"
];
const ACTIVATION_CLOSURE_FILES=[
  "scripts/rcap-production-workflow-dependency-order.test.mjs",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-production-preflight-evidence.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "hosted-acceptance-evidence/production-activate-36791436905/run.json",
  "hosted-acceptance-evidence/production-activate-36791436905/jobs.json",
  "hosted-acceptance-evidence/production-activate-36791436905/artifact.json",
  "hosted-acceptance-evidence/production-activate-36791436905/11132063144.zip"
];
const PUBLIC_VERIFICATION_FILES=[
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "scripts/rcap-production-workflow-dependency-order.test.mjs"
];
const PUBLIC_VERIFICATION_CLOSURE_FILES=[
  "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
  "scripts/grade-a-launch-control/production-preflight-authorization.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-production-preflight-evidence.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "hosted-acceptance-evidence/production-public-verify-36861106020/run.json",
  "hosted-acceptance-evidence/production-public-verify-36861106020/jobs.json",
  "hosted-acceptance-evidence/production-public-verify-36861106020/artifact.json",
  "hosted-acceptance-evidence/production-public-verify-36861106020/11160824476.zip"
];
const PACKET_CANARY_IMPLEMENTATION_BASE='acdc8e76671445f7d86e9842c103ac57961522eb';
const PACKET_CANARY_IMPLEMENTATION_FILES=[
  ".github/workflows/rcap-f1-ephemeral-staging.yml",
  "scripts/rcap-production-save-transition-probe.mjs",
  "scripts/verify-rcap-production-save-transition-probe.mjs",
  "scripts/rcap-production-packet-canary-contract.mjs",
  "scripts/rcap-production-packet-canary.test.mjs",
  "scripts/rcap-production-workflow-dependency-order.test.mjs",
  "scripts/grade-a-launch-control/production-preactivation-authorization.test.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
  "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs",
  "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json"
];
const PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE='cec5142a73246132b2f77ba7e1891f4776f8f234';
const PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES=[
 "scripts/rcap-production-migration-contract.test.mjs",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs"
];
const PACKET_CANARY_FLYCTL_PIN_BASE='c2f217f243f18b50c04ce1d61f8f150bf77c3023';
const PACKET_CANARY_FLYCTL_PIN_FILES=[
 ".github/workflows/rcap-f1-ephemeral-staging.yml",
 "scripts/rcap-production-workflow-dependency-order.test.mjs",
 "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.mjs",
 "scripts/grade-a-launch-control/verify-release-candidate-binding.test.mjs"
];
function verifyGenerationBinding(root,candidate,pending){
 try{
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
  const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
  const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
  const binding=read(toolsPath),t=binding.successorTools,base=pending.releaseBaseSha;
  const preflightOnly=base===PREFLIGHT_BASE,preactivation=base===PREACTIVATION_BASE,productionScoped=preflightOnly||preactivation;
  const correction=t.dependencyOrderCorrectionBaseSha;
  const hostedTestCorrection=t.hostedEvidenceTestCorrectionBaseSha;
  const readinessCorrection=t.preactivationReadinessCorrectionBaseSha;
  const closure=t.preactivationClosureBaseSha;
  const harnessCorrection=t.preactivationHarnessCorrectionBaseSha;
  const packetCanaryFlyctlPin=t.packetCanaryFlyctlPinBaseSha;
  const packetCanaryTestBoundaryCorrection=t.packetCanaryTestBoundaryCorrectionBaseSha;
  const packetCanaryImplementation=t.packetCanaryImplementationBaseSha;
  const publicVerificationClosure=t.publicVerificationClosureBaseSha;
  const publicVerification=t.publicVerificationAuthorizationAndWorkflowBaseSha;
  const activationClosure=t.activationClosureBaseSha;
  const artifactIsolation=t.activationArtifactIsolationBaseSha;
  const activationAuthorization=t.activationAuthorizationBaseSha;
  const smokeEvidence=t.preactivationSmokeEvidenceBaseSha;
  const smokeReset=t.preactivationSmokeResetBaseSha;
  const restageBinding=t.preactivationRestageBindingBaseSha;
  const restageRoutingCorrection=t.preactivationRestageRoutingBaseSha;
  const restageTransportCorrection=t.preactivationRestageTransportBaseSha;
  const restageCorrection=t.preactivationProductionRestageBaseSha;
  const productionLegalAidProofCorrection=t.preactivationProductionLegalAidProofCorrectionBaseSha;
  const relationshipsCorrection=t.preactivationLegalAidRelationshipsCorrectionBaseSha;
  const legalAidHarnessSuccessor=t.preactivationLegalAidHarnessSuccessorBaseSha;
  const seedRerunCorrection=t.preactivationLegalAidSeedRerunCorrectionBaseSha;
  const generationFiles=preactivation?[...new Set([...PREACTIVATION_FILES,...(packetCanaryFlyctlPin?PACKET_CANARY_FLYCTL_PIN_FILES:[]),...(packetCanaryTestBoundaryCorrection?PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES:[]),...(packetCanaryImplementation?PACKET_CANARY_IMPLEMENTATION_FILES:[]),...(publicVerificationClosure?PUBLIC_VERIFICATION_CLOSURE_FILES:[]),...(publicVerification?PUBLIC_VERIFICATION_FILES:[]),...(activationClosure?ACTIVATION_CLOSURE_FILES:[]),...(artifactIsolation?ACTIVATION_ARTIFACT_ISOLATION_FILES:[]),...(activationAuthorization?ACTIVATION_AUTHORIZATION_FILES:[]),...(smokeEvidence?SMOKE_EVIDENCE_BINDING_FILES:[]),...(smokeReset?SMOKE_RESET_FILES:[]),...(restageBinding?RESTAGE_BINDING_FILES:[]),...(restageCorrection?PRODUCTION_RESTAGE_FILES:[]),...(restageRoutingCorrection?RESTAGE_ROUTING_FILES:[]),...(productionLegalAidProofCorrection?PRODUCTION_LEGAL_AID_PROOF_FILES:[]),...(relationshipsCorrection?LEGAL_AID_RELATIONSHIPS_FILES:[]),...(legalAidHarnessSuccessor?LEGAL_AID_HARNESS_SUCCESSOR_FILES:[]),...(seedRerunCorrection?LEGAL_AID_SEED_RERUN_CORRECTION_FILES:[]),...(harnessCorrection?HARNESS_CORRECTION_FILES:[]),...(closure?CLOSURE_FILES:[]),...(readinessCorrection?READINESS_CORRECTION_FILES:[]),...(hostedTestCorrection?HOSTED_EVIDENCE_TEST_CORRECTION_FILES:[])])]:preflightOnly?[...new Set([...GENERATION_FILES,...(correction?PRODUCTION_DEPENDENCY_ORDER_FILES:[])])]:base===HOSTED_BASE?HOSTED_GENERATION_FILES:(base==='879463ec2ef60696da39a0367b4758d26074207b'
    ||base==='516b02ac1a68a6aaef41ca9825eae0ece5e3df37')?CHECKOUT_RETURN_GENERATION_FILES
    :base==='7556f87cee1cf3e6f4b503c76b8ba1d1bbc59456'?PACKET_DATABASE_GENERATION_FILES
    :base==='e312a5efa7b4882e0fbf61a5ff0ae7891ac23226'?APPLICATION_AUTHORITY_GENERATION_FILES
    :base==='3aeb5cdbeec1f84c61a4a6fca3297d72c40f719a'?CHECKOUT_LIFECYCLE_GENERATION_FILES
    :base==='bafe2536f560ddb93d115d591ea0a5b8af0fac90'?CHECKOUT_PIN_GENERATION_FILES
    :base==='d7adfbde5e19ef8025182dc755ba05fbf94e0a79'?BOOTSTRAP_GENERATION_FILES
    :base==='44916baaeb9815ba3dd61d94e8c51294f01e8166'?HOSTED_PIN_GENERATION_FILES
    :base==='9ce9233bde4e3c16d0dc9657524ae1a5f02eb2fa'?DS08_GENERATION_FILES:PRIOR_GENERATION_FILES;
  const expect=(actual,expected,message)=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(message);};
  const commitBase=packetCanaryFlyctlPin??packetCanaryTestBoundaryCorrection??packetCanaryImplementation??publicVerificationClosure??publicVerification??activationClosure??artifactIsolation??activationAuthorization??smokeEvidence??smokeReset??restageBinding??restageRoutingCorrection??restageTransportCorrection??restageCorrection??productionLegalAidProofCorrection??relationshipsCorrection??legalAidHarnessSuccessor??seedRerunCorrection??harnessCorrection??closure??readinessCorrection??hostedTestCorrection??correction??base;
  if(packetCanaryFlyctlPin||binding.toolsSha===PACKET_CANARY_FLYCTL_PIN_BASE){
   expect(preactivation,true,'packet canary capability only on closed Production release');
   expect(packetCanaryFlyctlPin,PACKET_CANARY_FLYCTL_PIN_BASE,'exact packet canary Flyctl pin base');
   const priorTools=JSON.parse(git(['show',`${packetCanaryFlyctlPin}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:packetCanaryFlyctlPin,successorTools:{...priorTools.successorTools,packetCanaryFlyctlPinBaseSha:packetCanaryFlyctlPin,files:t.files}},'only bounded packet canary Flyctl pin tools');
   const priorCandidate=JSON.parse(git(['show',`${packetCanaryFlyctlPin}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,priorCandidate,'packet canary Flyctl pin preserves all authorization and closure bytes');
   expect(binding.deploymentAuthorized,false,'no deployment authorization');
   expect(candidate.productionAuthorization.packetCanary,undefined,'no packet canary authorization');
   expect(candidate.packetCanaryReceipt,undefined,'no packet canary receipt');
   assertPublicVerificationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   expect(candidate.productionAuthorization.publicVerification.publicVerificationReceipt,verifyProductionPublicVerificationEvidence(root),'bound native successful public verification');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PACKET_CANARY_FLYCTL_PIN_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',packetCanaryFlyctlPin]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PACKET_CANARY_FLYCTL_PIN_FILES.slice().sort(),'exact packet canary Flyctl pin paths');
  }else if(packetCanaryTestBoundaryCorrection||binding.toolsSha===PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE){
   expect(preactivation,true,'packet canary capability only on closed Production release');
   expect(packetCanaryTestBoundaryCorrection,PACKET_CANARY_TEST_BOUNDARY_CORRECTION_BASE,'exact packet canary test boundary correction base');
   const priorTools=JSON.parse(git(['show',`${packetCanaryTestBoundaryCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:packetCanaryTestBoundaryCorrection,successorTools:{...priorTools.successorTools,packetCanaryTestBoundaryCorrectionBaseSha:packetCanaryTestBoundaryCorrection,files:t.files}},'only bounded packet canary test boundary correction tools');
   const priorCandidate=JSON.parse(git(['show',`${packetCanaryTestBoundaryCorrection}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,priorCandidate,'packet canary test boundary correction preserves all authorization and closure bytes');
   expect(binding.deploymentAuthorized,false,'no deployment authorization');
   expect(candidate.productionAuthorization.packetCanary,undefined,'no packet canary authorization');
   expect(candidate.packetCanaryReceipt,undefined,'no packet canary receipt');
   assertPublicVerificationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   expect(candidate.productionAuthorization.publicVerification.publicVerificationReceipt,verifyProductionPublicVerificationEvidence(root),'bound native successful public verification');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',packetCanaryTestBoundaryCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PACKET_CANARY_TEST_BOUNDARY_CORRECTION_FILES.slice().sort(),'exact packet canary test boundary correction paths');
  }else if(packetCanaryImplementation){
   expect(preactivation,true,'packet canary capability only on closed Production release');
   expect(packetCanaryImplementation,PACKET_CANARY_IMPLEMENTATION_BASE,'exact packet canary implementation base');
   const priorTools=JSON.parse(git(['show',`${packetCanaryImplementation}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:packetCanaryImplementation,successorTools:{...priorTools.successorTools,packetCanaryImplementationBaseSha:packetCanaryImplementation,files:t.files}},'only bounded packet canary implementation tools');
   const priorCandidate=JSON.parse(git(['show',`${packetCanaryImplementation}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,priorCandidate,'packet canary implementation preserves all authorization and closure bytes');
   assertPublicVerificationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   expect(candidate.productionAuthorization.publicVerification.publicVerificationReceipt,verifyProductionPublicVerificationEvidence(root),'bound native successful public verification');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PACKET_CANARY_IMPLEMENTATION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',packetCanaryImplementation]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PACKET_CANARY_IMPLEMENTATION_FILES.slice().sort(),'exact packet canary implementation paths');
  }else if(publicVerificationClosure){
   expect(preactivation,true,'public verification closure only on activated Production release');
   expect(publicVerificationClosure,PUBLIC_VERIFICATION_CLOSURE_BASE,'exact public verification closure base');
   const priorTools=JSON.parse(git(['show',`${publicVerificationClosure}:${toolsPath}`]));
   expect(binding,{...priorTools,status:PUBLIC_VERIFICATION_CLOSED_STATUS,toolsSha:publicVerificationClosure,successorTools:{...priorTools.successorTools,publicVerificationClosureBaseSha:publicVerificationClosure,files:t.files}},'only bounded public verification closure tools');
   const priorCandidate=JSON.parse(git(['show',`${publicVerificationClosure}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,status:PUBLIC_VERIFICATION_CLOSED_STATUS,scope:PUBLIC_VERIFICATION_CLOSED_SCOPE,productionAuthorization:{...priorCandidate.productionAuthorization,publicVerification:{...priorCandidate.productionAuthorization.publicVerification,state:'consumed_successfully',executedAttempts:1,publicVerificationReceipt:{...BOUND_PUBLIC_VERIFICATION}}}},'exact public verification closure preserves original decision, activation and authority');
   assertPublicVerificationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   expect(candidate.productionAuthorization.publicVerification.publicVerificationReceipt,verifyProductionPublicVerificationEvidence(root),'bound native successful public verification');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PUBLIC_VERIFICATION_CLOSURE_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',publicVerificationClosure]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PUBLIC_VERIFICATION_CLOSURE_FILES.slice().sort(),'exact public verification closure paths');
  }else if(publicVerification){
   expect(preactivation,true,'public verification only on activated Production release');
   expect(publicVerification,PUBLIC_VERIFICATION_BASE,'exact public verification successor base');
   const priorTools=JSON.parse(git(['show',`${publicVerification}:${toolsPath}`]));
   expect(binding,{...priorTools,status:PUBLIC_VERIFICATION_STATUS,toolsSha:publicVerification,successorTools:{...priorTools.successorTools,publicVerificationAuthorizationAndWorkflowBaseSha:publicVerification,files:t.files}},'only bounded public verification authorization and workflow ordering');
   const priorCandidate=JSON.parse(git(['show',`${publicVerification}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,status:PUBLIC_VERIFICATION_STATUS,scope:PUBLIC_VERIFICATION_SCOPE,productionAuthorization:{...priorCandidate.productionAuthorization,publicVerification:candidate.productionAuthorization?.publicVerification}},'public verification preserves exact activation closure and prior authority');
   assertPublicVerificationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   const recordedAt=Date.parse(candidate.productionAuthorization.publicVerification.recordedAt);
   expect(recordedAt>=Number(git(['show','-s','--format=%ct',publicVerification]))*1000 && recordedAt<=Date.now(),true,'public verification timestamp belongs to this successor');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PUBLIC_VERIFICATION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',publicVerification]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PUBLIC_VERIFICATION_FILES.slice().sort(),'exact public verification authorization and workflow paths');
  }else if(activationClosure){
   expect(preactivation,true,'activation closure only on the reviewed Production release');
   expect(activationClosure,ACTIVATION_CLOSURE_BASE,'exact activation closure base');
   const priorTools=JSON.parse(git(['show',`${activationClosure}:${toolsPath}`]));
   expect(binding,{...priorTools,status:ACTIVATION_CLOSED_STATUS,toolsSha:activationClosure,successorTools:{...priorTools.successorTools,activationClosureBaseSha:activationClosure,files:t.files}},'only bounded activation closure tools');
   const priorCandidate=JSON.parse(git(['show',`${activationClosure}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,status:ACTIVATION_CLOSED_STATUS,scope:ACTIVATION_CLOSED_SCOPE,productionAuthorization:{...priorCandidate.productionAuthorization,activation:{...priorCandidate.productionAuthorization.activation,state:'consumed_successfully',executedAttempts:1,activationReceipt:{...BOUND_ACTIVATION}}}},'exact activation closure preserves original decision and evidence; no new authority');
   assertActivationAuthorization(candidate);
   expect(candidate.productionAuthorization.activation.activationReceipt,verifyProductionActivationEvidence(root),'bound native successful activation');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!ACTIVATION_CLOSURE_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',activationClosure]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,ACTIVATION_CLOSURE_FILES.slice().sort(),'exact activation closure paths');
  }else if(artifactIsolation){
   expect(preactivation,true,'artifact isolation only on the reviewed activation release');
   expect(artifactIsolation,ACTIVATION_ARTIFACT_ISOLATION_BASE,'exact activation artifact isolation base');
   const priorTools=JSON.parse(git(['show',`${artifactIsolation}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:artifactIsolation,successorTools:{...priorTools.successorTools,activationArtifactIsolationBaseSha:artifactIsolation,files:t.files}},'only bounded activation artifact isolation tools');
   expect(candidate,JSON.parse(git(['show',`${artifactIsolation}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`])),'artifact isolation preserves exact authorization and evidence');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!ACTIVATION_ARTIFACT_ISOLATION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',artifactIsolation]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,ACTIVATION_ARTIFACT_ISOLATION_FILES.slice().sort(),'exact activation artifact isolation paths');
  }else if(activationAuthorization){
   expect(preactivation,true,'activation decision only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(activationAuthorization,ACTIVATION_BASE,'exact activation authorization base');
   const priorTools=JSON.parse(git(['show',`${activationAuthorization}:${toolsPath}`]));
   expect(binding,{...priorTools,status:ACTIVATION_STATUS,toolsSha:activationAuthorization,successorTools:{...priorTools.successorTools,activationAuthorizationBaseSha:activationAuthorization,files:t.files}},'only bounded activation authorization tools');
   const priorCandidate=JSON.parse(git(['show',`${activationAuthorization}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,status:ACTIVATION_STATUS,scope:ACTIVATION_SCOPE,productionAuthorization:{...priorCandidate.productionAuthorization,activation:candidate.productionAuthorization?.activation}},'only exact activation decision added; prior evidence and authority preserved');
   assertActivationAuthorization(candidate);
   const recordedAt=Date.parse(candidate.productionAuthorization.activation.recordedAt);
   expect(recordedAt>=Number(git(['show','-s','--format=%ct',activationAuthorization]))*1000 && recordedAt<=Date.now(),true,'activation timestamp belongs to this successor');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!ACTIVATION_AUTHORIZATION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',activationAuthorization]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,ACTIVATION_AUTHORIZATION_FILES.slice().sort(),'exact activation authorization paths');
  }else if(smokeEvidence){
   expect(preactivation,true,'smoke evidence only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(smokeEvidence,SMOKE_EVIDENCE_BASE,'exact smoke evidence base');
   const priorTools=JSON.parse(git(['show',`${smokeEvidence}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:smokeEvidence,successorTools:{...priorTools.successorTools,preactivationSmokeEvidenceBaseSha:smokeEvidence,files:t.files}},'only bounded smoke evidence binding');
   const priorCandidate=JSON.parse(git(['show',`${smokeEvidence}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,productionAuthorization:{...priorCandidate.productionAuthorization,smokeRunId:BOUND_SMOKE.runId,smokeArtifactSha256:BOUND_SMOKE.smokeArtifactSha256,smokeReceipt:{...BOUND_SMOKE}}},'only exact successful smoke evidence added; no activation authority');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!SMOKE_EVIDENCE_BINDING_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',smokeEvidence]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,SMOKE_EVIDENCE_BINDING_FILES.slice().sort(),'exact smoke evidence binding paths');
  }else if(smokeReset){
   expect(preactivation,true,'smoke reset only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(smokeReset,SMOKE_RESET_BASE,'exact smoke reset base');
   const priorTools=JSON.parse(git(['show',`${smokeReset}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:smokeReset,successorTools:{...priorTools.successorTools,preactivationSmokeResetBaseSha:smokeReset,files:t.files}},'only bounded smoke reset correction');
   expect(candidate,JSON.parse(git(['show',`${smokeReset}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`])),'smoke reset preserves release authority and successful restage receipt');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!SMOKE_RESET_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',smokeReset]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,SMOKE_RESET_FILES.slice().sort(),'exact smoke reset paths');
  }else if(restageBinding){
   expect(preactivation,true,'restage binding only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(restageBinding,RESTAGE_BINDING_BASE,'exact successful restage binding base');
   const priorTools=JSON.parse(git(['show',`${restageBinding}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:restageBinding,successorTools:{...priorTools.successorTools,preactivationRestageBindingBaseSha:restageBinding,files:t.files}},'only bounded successful restage binding');
   const priorCandidate=JSON.parse(git(['show',`${restageBinding}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,productionAuthorization:{...priorCandidate.productionAuthorization,note:PREACTIVATION_NOTE,stagedDeploymentId:STAGED_DEPLOYMENT,restage:{...priorCandidate.productionAuthorization.restage,successfulReceipt:{...BOUND_RESTAGE}}}},'only proven replacement and successful receipt bound');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!RESTAGE_BINDING_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',restageBinding]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,RESTAGE_BINDING_FILES.slice().sort(),'exact successful restage binding paths');
  }else if(restageRoutingCorrection){
   expect(preactivation,true,'restage routing only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(restageRoutingCorrection,RESTAGE_ROUTING_BASE,'exact restage routing base');
   const priorTools=JSON.parse(git(['show',`${restageRoutingCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:restageRoutingCorrection,successorTools:{...priorTools.successorTools,preactivationRestageRoutingBaseSha:restageRoutingCorrection,files:t.files}},'only bounded restage routing correction');
   expect(candidate,JSON.parse(git(['show',`${restageRoutingCorrection}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`])),'release authority unchanged');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!RESTAGE_ROUTING_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',restageRoutingCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,RESTAGE_ROUTING_FILES.slice().sort(),'exact restage routing paths');
  }else if(restageTransportCorrection){
   expect(preactivation,true,'restage transport only on reviewed preactivation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(restageTransportCorrection,RESTAGE_TRANSPORT_BASE,'exact restage transport base');
   const priorTools=JSON.parse(git(['show',`${restageTransportCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:restageTransportCorrection,successorTools:{...priorTools.successorTools,preactivationRestageTransportBaseSha:restageTransportCorrection,files:t.files}},'only bounded restage transport correction');
   expect(candidate,JSON.parse(git(['show',`${restageTransportCorrection}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`])),'release authority unchanged');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!RESTAGE_TRANSPORT_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',restageTransportCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,RESTAGE_TRANSPORT_FILES.slice().sort(),'exact restage transport paths');
  }else if(restageCorrection){
   expect(preactivation,true,'restage only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(restageCorrection,PRODUCTION_RESTAGE_BASE,'exact Production restage base');
   const priorTools=JSON.parse(git(['show',`${restageCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:restageCorrection,successorTools:{...priorTools.successorTools,preactivationProductionRestageBaseSha:restageCorrection,files:t.files}},'only bounded Production restage correction');
   const priorCandidate=JSON.parse(git(['show',`${restageCorrection}:data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json`]));
   expect(candidate,{...priorCandidate,productionAuthorization:{...priorCandidate.productionAuthorization,phases:[...priorCandidate.productionAuthorization.phases,'restage'],restage:candidate.productionAuthorization.restage}},'only owner restage authorization added');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PRODUCTION_RESTAGE_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',restageCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PRODUCTION_RESTAGE_FILES.slice().sort(),'exact Production restage paths');
  }else if(productionLegalAidProofCorrection){
   expect(preactivation,true,'Production Legal Aid proof correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(productionLegalAidProofCorrection,PRODUCTION_LEGAL_AID_PROOF_BASE,'exact Production Legal Aid proof correction base');
   const priorTools=JSON.parse(git(['show',`${productionLegalAidProofCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:productionLegalAidProofCorrection,successorTools:{...priorTools.successorTools,preactivationProductionLegalAidProofCorrectionBaseSha:productionLegalAidProofCorrection,files:t.files}},'only bounded Production Legal Aid proof correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PRODUCTION_LEGAL_AID_PROOF_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',productionLegalAidProofCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PRODUCTION_LEGAL_AID_PROOF_FILES.slice().sort(),'exact Production Legal Aid proof correction paths');
  }else if(relationshipsCorrection){
   expect(preactivation,true,'relationships correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(relationshipsCorrection,LEGAL_AID_RELATIONSHIPS_BASE,'exact Legal Aid relationships correction base');
   const priorTools=JSON.parse(git(['show',`${relationshipsCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:relationshipsCorrection,successorTools:{...priorTools.successorTools,preactivationLegalAidRelationshipsCorrectionBaseSha:relationshipsCorrection,files:t.files}},'only bounded Legal Aid relationships correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!LEGAL_AID_RELATIONSHIPS_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',relationshipsCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,LEGAL_AID_RELATIONSHIPS_FILES.slice().sort(),'exact Legal Aid relationships correction paths');
  }else if(legalAidHarnessSuccessor){
   expect(preactivation,true,'Legal Aid harness successor only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(legalAidHarnessSuccessor,LEGAL_AID_HARNESS_SUCCESSOR_BASE,'exact Legal Aid harness successor base');
   const priorTools=JSON.parse(git(['show',`${legalAidHarnessSuccessor}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:legalAidHarnessSuccessor,successorTools:{...priorTools.successorTools,preactivationLegalAidHarnessSuccessorBaseSha:legalAidHarnessSuccessor,files:t.files}},'only bounded Legal Aid harness successor');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!LEGAL_AID_HARNESS_SUCCESSOR_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',legalAidHarnessSuccessor]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,LEGAL_AID_HARNESS_SUCCESSOR_FILES.slice().sort(),'exact Legal Aid harness successor paths');
  }else if(seedRerunCorrection){
   expect(preactivation,true,'seed rerun correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(seedRerunCorrection,LEGAL_AID_SEED_RERUN_CORRECTION_BASE,'exact Legal Aid seed rerun correction base');
   expect(harnessCorrection,HARNESS_CORRECTION_BASE,'preserved approved harness correction base');
   const priorTools=JSON.parse(git(['show',`${seedRerunCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:seedRerunCorrection,successorTools:{...priorTools.successorTools,preactivationLegalAidSeedRerunCorrectionBaseSha:seedRerunCorrection,files:t.files}},'only bounded Legal Aid seed rerun tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!LEGAL_AID_SEED_RERUN_CORRECTION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',seedRerunCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,LEGAL_AID_SEED_RERUN_CORRECTION_FILES.slice().sort(),'exact Legal Aid seed rerun correction paths');
  }else if(harnessCorrection){
   expect(preactivation,true,'harness correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(harnessCorrection,HARNESS_CORRECTION_BASE,'exact harness correction base');
   const priorTools=JSON.parse(git(['show',`${harnessCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:harnessCorrection,successorTools:{...priorTools.successorTools,preactivationHarnessCorrectionBaseSha:harnessCorrection,files:t.files}},'only bounded pre-activation harness tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!HARNESS_CORRECTION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',harnessCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,HARNESS_CORRECTION_FILES.slice().sort(),'exact harness correction paths');
  }else if(closure){
   expect(preactivation,true,'closure only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(closure,CLOSURE_BASE,'exact readiness closure base');
   const priorTools=JSON.parse(git(['show',`${closure}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:closure,successorTools:{...priorTools.successorTools,preactivationClosureBaseSha:closure,files:t.files}},'only bounded integrated closure tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!CLOSURE_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',closure]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,CLOSURE_FILES.slice().sort(),'exact integrated closure paths');
  }else if(readinessCorrection){
   expect(preactivation,true,'readiness correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined dependency correction scope');
   expect(readinessCorrection,READINESS_CORRECTION_BASE,'exact reviewed readiness correction base');
   const priorTools=JSON.parse(git(['show',`${readinessCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:readinessCorrection,successorTools:{...priorTools.successorTools,preactivationReadinessCorrectionBaseSha:readinessCorrection,files:t.files}},'only bounded readiness tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!READINESS_CORRECTION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',readinessCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,READINESS_CORRECTION_FILES.slice().sort(),'exact readiness correction paths');
  }else if(hostedTestCorrection){
   expect(preactivation,true,'hosted test correction only on reviewed pre-activation release');
   expect(correction,undefined,'no combined correction scope');
   expect(hostedTestCorrection,HOSTED_EVIDENCE_TEST_CORRECTION_BASE,'exact reviewed pre-activation correction base');
   const priorTools=JSON.parse(git(['show',`${hostedTestCorrection}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:hostedTestCorrection,successorTools:{...priorTools.successorTools,hostedEvidenceTestCorrectionBaseSha:hostedTestCorrection,files:t.files}},'only exact hosted-evidence test tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!HOSTED_EVIDENCE_TEST_CORRECTION_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',hostedTestCorrection]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,HOSTED_EVIDENCE_TEST_CORRECTION_FILES.slice().sort(),'exact hosted-evidence test correction paths');
  }
  if(correction){
   expect(preflightOnly,true,'dependency correction only on approved preflight release');
   expect(correction,PRODUCTION_DEPENDENCY_ORDER_BASE,'exact dependency-order correction base');
   const priorTools=JSON.parse(git(['show',`${correction}:${toolsPath}`]));
   expect(binding,{...priorTools,toolsSha:correction,successorTools:{...priorTools.successorTools,dependencyOrderCorrectionBaseSha:correction,files:t.files}},'only exact dependency-order tools correction');
   for(const [rel,hash]of Object.entries(priorTools.successorTools.files))if(!PRODUCTION_DEPENDENCY_ORDER_FILES.includes(rel))expect(t.files[rel],hash,`preserved tools: ${rel}`);
   const delta=[...new Set([...git(['diff','--name-only',correction]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
   expect(delta,PRODUCTION_DEPENDENCY_ORDER_FILES.slice().sort(),'exact dependency-order correction paths');
  }
  expect(binding.toolsSha,commitBase,'tools base identity');expect(t.baseSha,base,'release/tools base');
  expect(t.schemaVersion,'rcap-successor-resume-tools/v1','tools schema');expect(t.commit,'single-commit-after-base','bounded successor');
  const head=git(['rev-parse','HEAD']);
  if(head!==commitBase)expect(git(['rev-list','--parents','-n','1',head]).split(' '),[head,commitBase],'one non-merge tools successor');
  expect(Object.keys(t.files).sort(),generationFiles.filter(p=>p!==toolsPath).sort(),'exact tools manifest paths');
  for(const [rel,hash]of Object.entries(t.files))expect(createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'),hash,`tools drift: ${rel}`);
  const changed=[...new Set([...git(['diff','--name-only',base]).split('\n'),...git(['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))].sort();
  expect(changed,generationFiles.slice().sort(),'exact generation change boundary');
  if(pending.applicationSha!==pending.workerSourceSha){
    expect(read('data/rcap-grade-a/launch-control/APPLICATION_INPUT_MANIFEST.json'),applicationInputManifest(root,pending.applicationSha),'candidate-derived application manifest');
  }
  const e=read('data/rcap-render/worker-publication-evidence.json');
  for(const record of [candidate,binding]){
   for(const k of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','runtimeAccepted','workerRebuildRequired','releaseBaseSha'])expect(record[k],pending[k],`current tuple ${k}`);
   expect(record.status,publicVerificationClosure?PUBLIC_VERIFICATION_CLOSED_STATUS:publicVerification?PUBLIC_VERIFICATION_STATUS:activationClosure?ACTIVATION_CLOSED_STATUS:activationAuthorization?ACTIVATION_STATUS:pending.status,'accepted status');expect(record.previewExecution,'held','Preview execution held');expect(record.productionAuthorized,productionScoped,'Production phase-scoped flag');
  }
  for(const k of ['deploymentAuthorized','migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized','hostedFullReady','clinicDispatchReady'])expect(binding[k],false,`tools cannot authorize ${k}`);
  if(productionScoped){
   if(preactivation){assertPreactivationAuthorization(candidate);expect(candidate.scope,publicVerificationClosure?PUBLIC_VERIFICATION_CLOSED_SCOPE:publicVerification?PUBLIC_VERIFICATION_SCOPE:activationClosure?ACTIVATION_CLOSED_SCOPE:activationAuthorization?ACTIVATION_SCOPE:PREACTIVATION_SCOPE,'bounded release scope');expect(candidate.productionAuthorization.preflight,verifyProductionPreflightEvidence(root),'bound native preflight');expect(candidate.productionAuthorization.restage.successfulReceipt,verifyProductionRestageEvidence(root),'bound native successful restage');expect(candidate.productionAuthorization.smokeReceipt,verifyProductionSmokeEvidence(root),'bound native successful smoke');}
   else {assertPreflightOnlyAuthorization(candidate);expect(candidate.scope,PREFLIGHT_SCOPE,'preflight-only scope');}
   const recordedAt=Date.parse(candidate.productionAuthorization.recordedAt);
   const predecessorAt=Number(git(['show','-s','--format=%ct',base]))*1000;
   expect(recordedAt>=predecessorAt&&recordedAt<=Date.now(),true,'authorization timestamp belongs to this successor');
  }
  else expect(candidate.productionAuthorization,null,'no Production authorization');
  expect(candidate.hostedAcceptanceStatus,pending.status,'hosted status');
  if(base===HOSTED_BASE||productionScoped)expect(candidate.hostedAcceptance,verifyHostedAcceptanceEvidence(root),'exact native hosted acceptance');
  else {expect(candidate.hostedAcceptance.preview,null,'no final Preview');expect(candidate.hostedAcceptance.naturalDelivery,null,'no delivery');expect(candidate.hostedAcceptance.journeys,[],'no hosted journeys');expect(candidate.hostedAcceptance.manualHostedFullReady,false,'not hosted-ready');}
  expect(candidate.previewExecutionInstruction.preview_hostname,(base===HOSTED_BASE||productionScoped)?PREVIEW.hostname:'','exact held hostname');expect(candidate.previewExecutionInstruction.preview_deployment_id,(base===HOSTED_BASE||productionScoped)?PREVIEW.deploymentId:'','exact held deployment');expect(candidate.previewExecutionInstruction.executionAuthorized,false,'no dispatch');
  expect(candidate.readOnlyImageAcceptance,e.imageAcceptance,'exact successful native acceptance');expect(candidate.workerDigestReference,e.digestPinnedReference,'immutable image reference');
  expect(candidate.publication,{runId:e.workflowRunId,runAttempt:e.workflowRunAttempt,artifactId:e.publicationArtifactId,artifactSha256:e.publicationArtifactSha256,conclusion:e.workflowConclusion},'exact publication');
  for(const rel of [toolsPath,CANDIDATE_PATH]){
   const before=JSON.parse(git(['show',`${base}:${rel}`]));expect(read(rel).supersededRecord,before,`historical binding: ${rel}`);
   expect(read(rel).supersededRecordSha256,createHash('sha256').update(Buffer.from(git(['show',`${base}:${rel}`])+'\n')).digest('hex'),`historical bytes: ${rel}`);
  }
  const previous=JSON.parse(git(['show',`${base}:${CANDIDATE_PATH}`]));
  const previousTools=JSON.parse(git(['show',`${base}:${toolsPath}`]));
  // Any field outside the explicit generation update retains its prior meaning.
  const candidateUpdates=new Set([...(productionScoped?['productionAuthorization']:[]),'hostedAcceptanceStatus','status','releaseBaseSha','applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','workerRebuildRequired','runtimeAccepted','previewExecution','productionAuthorized','workerDigestReference','publication','readOnlyImageAcceptance','supersededRecord','supersededRecordSha256','applicationPin','hostedAcceptance','scope','previewExecutionInstruction']);
  for(const key of new Set([...Object.keys(previous),...Object.keys(candidate)]))if(!candidateUpdates.has(key))expect(candidate[key],previous[key],`unchanged candidate field ${key}`);
  const toolsUpdates=new Set(['status','releaseBaseSha','applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','workerRebuildRequired','runtimeAccepted','previewExecution','productionAuthorized','toolsSha','successorTools','supersededRecord','supersededRecordSha256','manualPushAndDispatchOwner']);
  for(const key of new Set([...Object.keys(previousTools),...Object.keys(binding)]))if(!toolsUpdates.has(key))expect(binding[key],previousTools[key],`unchanged tools field ${key}`);
  expect(candidate.applicationPin,{...previous.applicationPin,sourceSha:pending.applicationSha,canonicalInputBaseline:pending.applicationSha,workerInputFingerprint:pending.workerInputFingerprint},'exact application pin');
  expect(candidate.previewExecutionInstruction,{...previous.previewExecutionInstruction,mode:null,...((base===HOSTED_BASE||productionScoped)?{preview_hostname:PREVIEW.hostname,preview_deployment_id:PREVIEW.deploymentId,firstExecution:'Hosted acceptance is complete; no execution authorized by this record.'}:{})},'exact Preview identity without execution authority');
  expect(Object.keys(t).sort(),['schemaVersion','baseSha','commit','files',...(correction?['dependencyOrderCorrectionBaseSha']:[]),...(hostedTestCorrection?['hostedEvidenceTestCorrectionBaseSha']:[]),...(readinessCorrection?['preactivationReadinessCorrectionBaseSha']:[]),...(closure?['preactivationClosureBaseSha']:[]),...(harnessCorrection?['preactivationHarnessCorrectionBaseSha']:[]),...(seedRerunCorrection?['preactivationLegalAidSeedRerunCorrectionBaseSha']:[]),...(legalAidHarnessSuccessor?['preactivationLegalAidHarnessSuccessorBaseSha']:[]),...(relationshipsCorrection?['preactivationLegalAidRelationshipsCorrectionBaseSha']:[]),...(productionLegalAidProofCorrection?['preactivationProductionLegalAidProofCorrectionBaseSha']:[]),...(restageCorrection?['preactivationProductionRestageBaseSha']:[]),...(restageTransportCorrection?['preactivationRestageTransportBaseSha']:[]),...(restageRoutingCorrection?['preactivationRestageRoutingBaseSha']:[]),...(restageBinding?['preactivationRestageBindingBaseSha']:[]),...(smokeReset?['preactivationSmokeResetBaseSha']:[]),...(smokeEvidence?['preactivationSmokeEvidenceBaseSha']:[]),...(activationAuthorization?['activationAuthorizationBaseSha']:[]),...(artifactIsolation?['activationArtifactIsolationBaseSha']:[]),...(activationClosure?['activationClosureBaseSha']:[]),...(publicVerification?['publicVerificationAuthorizationAndWorkflowBaseSha']:[]),...(publicVerificationClosure?['publicVerificationClosureBaseSha']:[]),...(packetCanaryImplementation?['packetCanaryImplementationBaseSha']:[]),...(packetCanaryTestBoundaryCorrection?['packetCanaryTestBoundaryCorrectionBaseSha']:[]),...(packetCanaryFlyctlPin?['packetCanaryFlyctlPinBaseSha']:[])].sort(),'no inherited tools correction scope');
  return {current:true,status:'CURRENT',hostedAcceptanceStatus:candidate.hostedAcceptanceStatus,releaseStatus:candidate.status,previewExecution:'held',productionAuthorized:productionScoped,productionPhases:preactivation?[...PREACTIVATION_PHASES,...(publicVerification&&!publicVerificationClosure?['public_verify']:[]),...(activationAuthorization&&!activationClosure?['activate']:[])]:preflightOnly?['preflight']:[],reasons:[]};
 }catch(error){return {current:false,status:'STALE_OR_UNVERIFIED',reasons:[error.message]};}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(runReleaseCandidateBindingCli());
