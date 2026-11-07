import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {TARGET, requirePoststate, requireIdleQueue} from './place-baa3-worker.mjs';
import {projectNativeEvents} from './fly-handoff-events.mjs';
import {captureQualifiedWorkerReadiness, nonsecretRollbackCapsule, READINESS_QUEUE_SQL, effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (ok, code) => { if (!ok) throw Error(code); };
const BASE = `https://api.machines.dev/v1/apps/${TARGET.app}/machines`;
const MACHINE = `${BASE}/${TARGET.machine}`;
const QUEUE = `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`;
const INPUT = 'scripts/acceptance/evidence/baa3-placement-42395572844.json';
const INPUT_HASH = '7b0d26f16492a0f7a2a93f6591499fd2617c332b37de4e31f3fe1c6cc0d10c1a';

export function readConsumedPlacement(root) {
  const bytes = fs.readFileSync(path.join(root, INPUT));
  check(hash(bytes) === INPUT_HASH, 'consumed_placement_input_changed');
  const input = JSON.parse(bytes), at = name => input.files[`baa3-worker-placement-evidence/${name}`].value;
  const begin = at('BEGIN.json'), attempt = at('attempt.json'), result = at('result.json'), rollback = at('rollback-config.nonsecret.private.json');
  check(input.runId === 42395572844 && attempt.updateAttempts === 1 && result.updateAttempts === 1 && result.leaseReleased === true && result.refusalCode === 'native_clean_handoff_unproven', 'consumed_placement_not_matching');
  check(begin.W === TARGET.source && begin.D === TARGET.digest && begin.mirrorDigest === TARGET.digest && begin.beforeVersion === rollback.instanceId && hash(JSON.stringify(rollback.config)) === begin.beforeConfigSha256, 'consumed_placement_identity_mismatch');
  const config = structuredClone(rollback.config);
  config.image = `registry.fly.io/${TARGET.app}@${TARGET.digest}`;
  config.env.RCAP_WORKER_CONTAINER_DIGEST = TARGET.digest;
  return {input, begin, rollback, config, from: Date.parse(input.window.from), to: Date.parse(input.window.to)};
}

// Only the existing metadata/process probe and explicit READ ONLY query are
// permitted POSTs. No deployment, lease, image transfer, restart or rollback.
export function readOnlyTransport(request = fetch) {
  return async (url, options = {}) => {
    const get = options.method === 'GET' && [BASE, MACHINE, `${MACHINE}/events?limit=50`].includes(url);
    const probe = options.method === 'POST' && url === `${MACHINE}/exec` && options.body === JSON.stringify({command: effectiveProbeCommand(TARGET.machine), timeout: 15});
    const queue = options.method === 'POST' && url === QUEUE && options.body === JSON.stringify({query: READINESS_QUEUE_SQL, read_only: false});
    check(get || probe || queue, 'read_only_operation_refused');
    return request(url, options);
  };
}

export function reconcileObservedPlacement(prior, before, after, events, readiness) {
  check(before?.instance_id === after?.instance_id, 'read_only_machine_version_drift');
  check(readiness.status === 'READINESS_CAPTURED_REQUIRES_C_REVIEW' && readiness.machineUnchangedDuringCapture === true && readiness.machine?.instanceId === before.instance_id && readiness.machine.id === TARGET.machine, 'current_readiness_unproven');
  check(readiness.machine.imageDigest === TARGET.digest && readiness.machine.ociRevision === TARGET.source && readiness.machine.exportedDigest === TARGET.digest, 'current_readiness_image_mismatch');
  const capsule = nonsecretRollbackCapsule(before), finalCapsule = nonsecretRollbackCapsule(after);
  check(capsule.configSha256 === finalCapsule.configSha256 && readiness.rollback?.configSha256 === capsule.configSha256 && readiness.rollback.durableVerified === true, 'read_only_config_drift');
  requireIdleQueue(readiness.observations.queue);
  check(readiness.observations.effectiveWorker?.passed === true && readiness.observations.effectiveWorker.roleProven === true && readiness.observations.effectiveWorker.projectRef === TARGET.project, 'current_effective_binding_unproven');
  const lifecycle = new Set(['exit', 'start', 'update', 'launch', 'destroy']);
  check(!events.some(e => lifecycle.has(e.type) && (!Number.isSafeInteger(e.timestamp) || e.timestamp > prior.to)), 'later_or_undated_machine_transition_unproven');
  const window = events.filter(e => Number.isSafeInteger(e.timestamp) && e.timestamp >= prior.from && e.timestamp <= prior.to && ['exit', 'start'].includes(e.type));
  check(window.filter(e => e.type === 'exit').length === 1 && window.filter(e => e.type === 'start').length === 1, 'placement_transition_history_ambiguous');
  const original = {instance_id: prior.begin.beforeVersion}, body = {config: prior.config};
  requirePoststate({...before, events: window}, original, body, TARGET.digest, prior.from);
  const proof = requirePoststate({...after, events: window}, original, body, TARGET.digest, prior.from);
  return {...proof, actualPlacementRunId: prior.input.runId, timeBoundSource: prior.input.window.provenance, observedStepWindow: prior.input.window, exactOriginalPostCutoffKnown: false};
}

export async function reconcileWorker({env = process.env, root = process.cwd(), request = fetch, captureReadiness = captureQualifiedWorkerReadiness, checkExecution = true} = {}) {
  check(env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_RUN_ATTEMPT === '1', 'execution_context_refused');
  check(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN, 'existing_credential_reference_absent');
  if (checkExecution) {
    check(execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim() === env.GITHUB_SHA, 'execution_checkout_mismatch');
    check(execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim() === '', 'execution_checkout_dirty');
  }
  const prior = readConsumedPlacement(root), readOnly = readOnlyTransport(request);
  const directory = path.join(root, 'worker-identity-evidence');
  const write = (name, value, raw = false) => {
    fs.mkdirSync(directory, {recursive: true, mode: 0o700});
    const bytes = raw ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n'), file = path.join(directory, name);
    const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    check(hash(fs.readFileSync(file)) === hash(bytes), 'read_only_custody_failed');
    const directoryFD = fs.openSync(directory, 'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
    return {path: name, sha256: hash(bytes)};
  };
  const result = {actualPlacementRunId: 42395572844, originalUpdateAttempts: 1, updateAttempts: 0, workerMutated: false, runtimeQualified: false, hostedAccepted: false, handoffProven: false, outcome: 'READ_ONLY_RECONCILIATION_UNPROVEN', priorArtifactSha256: prior.input.artifactSha256};
  const get = async url => {
    const response = await readOnly(url, {method: 'GET', headers: {Authorization: `Bearer ${env.FLY_API_TOKEN}`, Accept: 'application/json'}, redirect: 'error', signal: AbortSignal.timeout(20000)});
    check(response.ok, `request_HTTP_${response.status}`); return response.json();
  };
  try {
    // Existing collector retains current effective-role, queue and safe-config
    // evidence. This does not inherit its old historical smoke as a new pass.
    const readiness = await captureReadiness({env, root, fetchImpl: readOnly, checkExecution: false});
    result.currentReadinessStatus = readiness.status;
    const before = await get(MACHINE);
    result.currentBefore = write('baa3-current-before.json', {state: /^[a-z_]{1,32}$/.test(before.state ?? '') ? before.state : 'invalid', ...JSON.parse(nonsecretRollbackCapsule(before).bytes)});
    const events = projectNativeEvents(await get(`${MACHINE}/events?limit=50`));
    result.nativeEvents = write('baa3-native-events.json', {actualPlacementRunId: prior.input.runId, observedStepWindow: prior.input.window, projection: 'Allowlisted native values with missing fields preserved; no default values inserted', events});
    const after = await get(MACHINE);
    result.currentAfter = write('baa3-current-after.json', {state: /^[a-z_]{1,32}$/.test(after.state ?? '') ? after.state : 'invalid', ...JSON.parse(nonsecretRollbackCapsule(after).bytes)});
    // Classification happens only after all observed machine/event evidence is retained.
    const proof = reconcileObservedPlacement(prior, before, after, events, readiness);
    result.proof = write('baa3-reconciled-handoff.json', proof);
    result.runtimeQualified = true; result.handoffProven = true; result.outcome = 'EXISTING_BAA3_UPDATE_AND_CURRENT_READINESS_VERIFIED';
    result.afterVersion = after.instance_id;
  } catch (error) {
    result.refusalCode = /^(?:[a-z][a-z0-9_]+|request_HTTP_[0-9]{3})$/.test(error?.message ?? '') ? error.message : 'read_only_capture_or_classification_unproven';
  } finally { write('baa3-reconciliation-result.json', result); }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  reconcileWorker().then(result => { console.log(JSON.stringify(result)); if (!result.runtimeQualified) process.exitCode = 1; })
    .catch(() => { console.error('Read-only BAA3 reconciliation could not finish; no deployment or retry was performed.'); process.exitCode = 1; });
}
