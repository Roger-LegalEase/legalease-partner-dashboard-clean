import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectRegistryImage} from './registry-image.mjs';
import {cleanNativeExit} from './fly-handoff-events.mjs';
import {nonsecretRollbackCapsule, validateQueueCapture, READINESS_QUEUE_SQL, effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

export const TARGET = Object.freeze({
  app: 'legalease-rcap-render-worker', machine: 'd8de5e4f759278', project: 'wwtwtsmywnckfkdaqqeg',
  source: 'e4d7faef0960c8b453bb88f2bf56456d3220567f',
  digest: 'sha256:1858985f511a74725c9d45dea1cb7881f53b0b66422e2786615799dcb8e6d31d',
  config: 'sha256:2eeb157ef5fadba99823d836cdb8ca4f458b6f9a92594b5e08b8e619f4c42ad4',
  oldSource: 'baa3c993136ebb11f40ad565a01a9f28983d3b6a',
  oldDigest: 'sha256:dfe65f3cb99335888fb14306a1f0b68d2fa2bcf4e2c335a6cb43ef110ef4f0e2',
  oldMirror: 'sha256:dfe65f3cb99335888fb14306a1f0b68d2fa2bcf4e2c335a6cb43ef110ef4f0e2',
});
const BASE = `https://api.machines.dev/v1/apps/${TARGET.app}/machines`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const check = (ok, code) => { if (!ok) throw new Error(code); };
const digest = value => /^sha256:[a-f0-9]{64}$/.test(value ?? '');

export function requireIdleQueue(queue) {
  for (const key of ['claimed', 'rendering', 'validating', 'live_leases', 'expired_leases', 'missing_leases', 'eligible_queued', 'retryable_failed', 'terminal_failed', 'exposure_group_count'])
    check(queue[key] === 0, `queue_${key}_not_zero`);
  check(Array.isArray(queue.exposed_work) && queue.exposed_work.length === 0, 'unreviewed_queue_exposure');
}
export function requireImage(image) {
  check(image?.Id === TARGET.config && image.Os === 'linux' && image.Architecture === 'amd64', 'image_config_or_platform_mismatch');
  check(image.Config?.Labels?.['org.opencontainers.image.revision'] === TARGET.source, 'image_source_mismatch');
  check(image.RootFS?.Layers?.length === 250 && image.RootFS.Layers.every(digest), 'image_diffids_mismatch');
}
// Only structural facts and recognized registry error classes leave a failed child.
export function safeRegistryFailure(error, stage, elapsedMs) {
  const codes = new Set(['ETIMEDOUT','ENOENT','EACCES','EPERM','ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH','ENOTFOUND','EAI_AGAIN','ENOBUFS','ENOSPC','ENOMEM','EPIPE','ERR_CHILD_PROCESS_STDIO_MAXBUFFER']);
  const signals = new Set(['SIGTERM','SIGKILL','SIGINT','SIGABRT','SIGPIPE','SIGSEGV','SIGHUP']);
  const stderr = Buffer.isBuffer(error?.stderr) ? error.stderr.subarray(0,8192).toString('utf8') : typeof error?.stderr === 'string' ? error.stderr.slice(0,8192) : '';
  const statuses = [...new Set([...stderr.matchAll(/\b(?:unexpected HTTP status(?: code)?|HTTP status(?: code)?|unexpected status code|status code)\s*:?\s*(401|403|404|405|408|409|413|415|429|500|502|503|504)\b/gi)].map(match => Number(match[1])))];
  const httpStatus = statuses.length === 1 ? statuses[0] : null;
  return {
    stage: ['source_manifest','source_config','fly_manifest','fly_config','fly_tag_manifest','mirror_copy'].includes(stage) ? stage : 'unknown_registry_stage',
    code: codes.has(error?.code) ? error.code : null,
    status: Number.isInteger(error?.status) && error.status >= 0 && error.status <= 255 ? error.status : null,
    signal: signals.has(error?.signal) ? error.signal : null,
    killed: typeof error?.killed === 'boolean' ? error.killed : null,
    timeout: error?.code === 'ETIMEDOUT' ? true : Number.isInteger(error?.status) && error.status >= 0 && error.signal == null ? false : null,
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs <= 86400000 ? Math.round(elapsedMs) : null,
    httpStatus,
    httpClass: httpStatus === null ? null : [401,403].includes(httpStatus) ? 'AUTH_4XX' : httpStatus === 404 ? 'NOT_FOUND_4XX' : httpStatus === 429 ? 'THROTTLE_4XX' : httpStatus >= 500 ? 'SERVER_5XX' : 'CLIENT_4XX',
    manifestMissingReported: /\bMANIFEST_UNKNOWN\b|\bmanifest unknown: manifest unknown\b/i.test(stderr),
    authenticationRefusedReported: /\bunauthorized: authentication required\b|\bdenied: requested access to the resource is denied\b/i.test(stderr),
  };
}
function registryChild(stage, args, options, command, now = Date.now) {
  const started = now();
  try { return command('skopeo', args, {...options, stdio: ['ignore','pipe','pipe'], maxBuffer: 1024 * 1024}); }
  catch (error) {
    const failure = new Error('registry_child_failed');
    failure.childFailure = safeRegistryFailure(error, stage, now() - started);
    throw failure;
  }
}
export function inspectAcceptedImage(reference, {env = process.env, command = execFileSync} = {}) {
  check(typeof env.DOCKER_CONFIG === 'string' && path.isAbsolute(env.DOCKER_CONFIG), 'registry_authfile_reference_required');
  let childFailure;
  const boundedCommand = (_tool, args, options) => {
    const stage = (reference.startsWith('registry.fly.io/') ? 'fly_' : 'source_') + (args.includes('--config') ? 'config' : 'manifest');
    try { return registryChild(stage, args, {...options, timeout: 30000}, command); }
    catch (error) { childFailure = error.childFailure; throw error; }
  };
  try {
    const image = inspectRegistryImage(reference, {...TARGET, layers: 250}, {authFile: path.join(env.DOCKER_CONFIG, 'config.json'), command: boundedCommand, env});
    requireImage(image);
    return image;
  } catch (error) { if (childFailure) error.childFailure = childFailure; throw error; }
}
// The inverse changes only the two reviewed fields; all other configuration stays provider-owned.
export function inverseConfig(config) {
  check(config?.image === `registry.fly.io/${TARGET.app}@${TARGET.digest}` && config.env?.RCAP_WORKER_CONTAINER_DIGEST === TARGET.digest, 'rollback_image_binding_drift');
  const inverse = structuredClone(config);
  inverse.image = `registry.fly.io/${TARGET.app}@${TARGET.oldMirror}`;
  inverse.env.RCAP_WORKER_CONTAINER_DIGEST = TARGET.oldDigest;
  return inverse;
}
export function planRollback(machine, expectedVersion) {
  check(/^[A-Za-z0-9]{10,50}$/.test(expectedVersion ?? '') && machine?.instance_id === expectedVersion && machine.id === TARGET.machine && machine.state === 'started', 'rollback_current_version_unproven');
  check(machine.image_ref?.digest === TARGET.digest && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source, 'rollback_subject_drift');
  const capsule = nonsecretRollbackCapsule(machine);
  check(capsule.stopConfig?.signal === 'SIGTERM' && capsule.stopConfig.timeout === '30s', 'native_stop_policy_drift');
  return {config: inverseConfig(machine.config), current_version: expectedVersion, skip_launch: false};
}
export function planUpdate(machine, mirror) {
  check(digest(mirror), 'mirror_digest_invalid');
  check(machine?.id === TARGET.machine && machine.state === 'started' && /^[A-Za-z0-9]{10,50}$/.test(machine.instance_id ?? ''), 'machine_identity_or_state_mismatch');
  check(machine.image_ref?.digest === TARGET.oldMirror && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.oldSource, 'old_image_identity_drift');
  check(machine.config?.image === `registry.fly.io/${TARGET.app}@${TARGET.oldMirror}` && machine.config.env?.RCAP_WORKER_CONTAINER_DIGEST === TARGET.oldDigest, 'old_config_binding_drift');
  check(machine.config.restart?.policy === 'always' && machine.config.env.ENABLE_SUPABASE_PARTNER_DATA === 'true' && machine.config.guest?.memory_mb >= 1024 && (!machine.config.services || machine.config.services.length === 0), 'machine_execution_policy_drift');
  check(!machine.config.mounts?.length, 'runtime_mount_override_refused');
  const rollback = nonsecretRollbackCapsule(machine);
  check(rollback.stopConfig?.signal === 'SIGTERM' && rollback.stopConfig.timeout === '30s', 'native_stop_policy_drift');
  const config = structuredClone(machine.config);
  config.image = `registry.fly.io/${TARGET.app}@${mirror}`;
  config.env.RCAP_WORKER_CONTAINER_DIGEST = TARGET.digest;
  check(same(inverseConfig(config), machine.config), 'rollback_inverse_not_exact');
  return {rollback, body: {config, current_version: machine.instance_id, skip_launch: false}};
}
export function requirePoststate(machine, before, body, mirror, startedAt) {
  check(machine?.id === TARGET.machine && machine.state === 'started' && typeof machine.instance_id === 'string' && /^[A-Za-z0-9]{10,50}$/.test(machine.instance_id) && machine.instance_id !== before.instance_id, 'new_machine_version_unproven');
  check(machine.image_ref?.digest === mirror && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source, 'new_image_binding_unproven');
  check(same(machine.config, body.config), 'unrelated_config_drift');
  const events = (machine.events ?? []).filter(e => Number.isSafeInteger(e.timestamp) && e.timestamp >= startedAt);
  const exits = events.filter(e => e.type === 'exit').sort((a, b) => a.timestamp - b.timestamp);
  const starts = events.filter(e => e.type === 'start').sort((a, b) => a.timestamp - b.timestamp);
  const exited = exits.at(-1), start = starts.at(-1);
  check(exited && start && start.timestamp >= exited.timestamp && exits.every(e => cleanNativeExit(e)), 'native_clean_handoff_unproven');
  const exit = cleanNativeExit(exited);
  return {notBeforeEpochMs: startedAt, machineId: machine.id, beforeVersion: before.instance_id, afterVersion: machine.instance_id, state: machine.state, flyMirrorDigest: machine.image_ref.digest, ociRevision: machine.image_ref.labels['org.opencontainers.image.revision'], acceptedDigestMarker: machine.config.env.RCAP_WORKER_CONTAINER_DIGEST, handoff: {requestedStop: exit.requested_stop, exitCode: exit.exit_code, guestExitCode: exit.guest_exit_code, guestSignal: exit.guest_signal, signal: exit.signal, oomKilled: exit.oom_killed, exitAt: exited.timestamp, startAt: start.timestamp, nativePayloads: exit.payloads}};
}

// Only these fields may leave the job. Configuration, capsules, queue captures and hashes do not.
export function publicResult(result) {
  const keys = ['W', 'D', 'machine', 'runId', 'executionSha', 'updateAttempts', 'mirrorAttempts', 'leaseAttempts', 'outcome', 'runtimeQualified', 'hostedAccepted', 'automaticRetry', 'automaticRollback', 'registryIdentityProven', 'secretNamesStable', 'rollbackInverseValidated', 'beforeVersion', 'afterVersion', 'configUnchangedExceptImageFields', 'effectiveBindingProven', 'configuredNonrootProven', 'queueWindowProven', 'nativeHandoffProven', 'handoff', 'leaseReleased', 'refusalCode', 'releaseFailure', 'effectClassification', 'childFailure', 'operation', 'diagnosticComplete', 'acceptedDigestReusable', 'destinationDigest', 'destinationTag', 'copyWriteCapabilityTested', 'layerBodiesRead'];
  return Object.fromEntries(keys.filter(key => Object.hasOwn(result, key)).map(key => [key, result[key]]));
}
export function requireExecutionContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release' && env.GITHUB_JOB === 'deploy_e4d7' && env.GITHUB_REPOSITORY_ID === '1248656766' && env.GITHUB_ACTOR_ID === '287531360' && env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_RUN_ATTEMPT === '1' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? ''), 'execution_context_refused');
  check(env.INPUT_WORKER_SOURCE_SHA === TARGET.source && env.INPUT_WORKER_DIGEST === TARGET.digest, 'commissioned_tuple_refused');
}
export function secretNames({env, command}) {
  const raw = command('flyctl', ['secrets', 'list', '--app', TARGET.app, '--json'], {env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000, maxBuffer: 256 * 1024});
  const rows = JSON.parse(raw);
  check(Array.isArray(rows), 'secret_names_shape_refused');
  const names = rows.map(row => row.Name ?? row.name);
  check(names.every(name => typeof name === 'string' && /^[A-Z][A-Z0-9_]{0,119}$/.test(name)) && new Set(names).size === names.length, 'secret_names_shape_refused');
  for (const required of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) check(names.includes(required), 'required_secret_reference_absent');
  return names.sort();
}
export function configuredUserState(proc, pid) {
  try {
    if (!Number.isSafeInteger(pid) || pid <= 0) return false;
    const uid = /^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/m.exec(proc.readFileSync(`/proc/${pid}/status`, 'utf8'));
    return Boolean(uid && uid.slice(1).every(value => value === '999') && (proc.statSync('/').mode & 0o777) === 0o755 && (proc.statSync('/app').mode & 0o777) === 0o755);
  } catch { return false; }
}
export function configuredEffectiveProbeCommand() {
  const command = effectiveProbeCommand(TARGET.machine);
  const tail = '.then(r=>process.stdout.write(JSON.stringify(r)))';
  check(command[2].endsWith(tail), 'effective_probe_literal_changed');
  command[2] = command[2].slice(0, -tail.length) + `.then(r=>{r.configuredUserProven=(${configuredUserState.toString()})(require("node:fs"),r.workerPid);r.passed=r.passed&&r.configuredUserProven;process.stdout.write(JSON.stringify(r))})`;
  return command;
}
export function mirrorImage({env, command}) {
  check(typeof env.DOCKER_CONFIG === 'string' && path.isAbsolute(env.DOCKER_CONFIG), 'registry_authfile_reference_required');
  registryChild('mirror_copy', ['copy', '--preserve-digests', '--authfile', path.join(env.DOCKER_CONFIG, 'config.json'), `docker://ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, `docker://registry.fly.io/${TARGET.app}:${TARGET.source}`], {env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000}, command);
}

export async function placeWorker({env = process.env, request = fetch, command = execFileSync, inspectImage = inspectAcceptedImage, root = process.cwd(), now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  requireExecutionContext(env);
  check(env.RCAP_WORKER_REGISTRY_READONLY !== 'true', 'readonly_mode_refuses_writer');
  check(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN && digest(env.RCAP_FLY_IMAGE_DIGEST), 'existing_credential_reference_or_mirror_absent');
  const directory = path.join(root, 'e4d7-worker-placement-evidence');
  fs.mkdirSync(directory, {recursive: false, mode: 0o700});
  fs.chmodSync(directory, 0o700);
  const write = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(publicResult(value), null, 2) + '\n');
    const file = path.join(directory, name); const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.fchmodSync(fd, 0o600); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    check(hash(fs.readFileSync(file)) === hash(bytes), 'custody_readback_failed');
    const directoryFD = fs.openSync(directory, 'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
    return {path: name, bytes: bytes.length, sha256: hash(bytes)};
  };
  const result = {W: TARGET.source, D: TARGET.digest, machine: TARGET.machine, runId: Number(env.GITHUB_RUN_ID), executionSha: env.GITHUB_SHA, mirrorAttempts: 0, leaseAttempts: 0, updateAttempts: 0, outcome: 'NOT_ATTEMPTED', runtimeQualified: false, hostedAccepted: false, automaticRetry: false, automaticRollback: false};
  const auth = {Authorization: `Bearer ${env.FLY_API_TOKEN}`, 'Content-Type': 'application/json'};
  let nonce;
  const json = async (url, options) => {
    let response; try { response = await request(url, {...options, redirect: 'error', signal: AbortSignal.timeout(20000)}); }
    catch { throw new Error('request_transport_or_timeout_indeterminate'); }
    check(response.ok, `request_HTTP_${response.status}`);
    return response.json();
  };
  const queue = async () => {
    const rows = await json(`https://api.supabase.com/v1/projects/${TARGET.project}/database/query`, {method: 'POST', headers: {Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json'}, body: JSON.stringify({query: READINESS_QUEUE_SQL, read_only: false})});
    const proof = validateQueueCapture(rows); requireIdleQueue(proof); return proof;
  };
  const effective = async (requireConfiguredUser = false) => {
    const raw = await json(`${BASE}/${TARGET.machine}/exec`, {method: 'POST', headers: auth, body: JSON.stringify({command: requireConfiguredUser ? configuredEffectiveProbeCommand() : effectiveProbeCommand(TARGET.machine), timeout: 15})});
    check((raw.exit_code === undefined || raw.exit_code === 0) && (raw.exit_signal === undefined || raw.exit_signal === 0) && !raw.stderr && typeof raw.stdout === 'string' && raw.stdout.length < 2000, 'effective_binding_exec_refused');
    const proof = JSON.parse(raw.stdout);
    check(proof.schemaVersion === 'qualified-worker-effective-binding/v1' && proof.machineId === TARGET.machine && proof.projectRef === TARGET.project && proof.passed === true && proof.roleProven === true && proof.secretValuesIncluded === false && proof.customerRowsRead === false && [200,206].includes(proof.queueHeadStatus), 'effective_binding_unproven');
    if (requireConfiguredUser) check(proof.configuredUserProven === true, 'configured_nonroot_runtime_unproven');
    return Object.fromEntries(['schemaVersion', 'machineId', 'projectRef', 'passed', 'roleProven', 'queueHeadStatus', 'secretValuesIncluded', 'customerRowsRead'].map(k => [k, proof[k]]));
  };
  try {
    check(env.RCAP_FLY_IMAGE_DIGEST === TARGET.digest, 'mirror_digest_not_preserved');
    const source = inspectImage(`ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, {env, command});
    requireImage(source); check(source.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
    const names = secretNames({env, command});
    const inventory = await json(BASE, {method: 'GET', headers: auth});
    check(Array.isArray(inventory) && inventory.length === 1 && inventory[0].id === TARGET.machine, 'machine_inventory_drift');
    const before = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    const planned = planUpdate(before, env.RCAP_FLY_IMAGE_DIGEST);
    result.rollbackInverseValidated = true;
    await queue(); await effective();
    const fresh = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    check(fresh.instance_id === before.instance_id && same(fresh.config, before.config) && fresh.state === 'started' && fresh.image_ref?.digest === before.image_ref.digest, 'pre_effect_machine_drift');
    result.mirrorAttempts = 1;
    mirrorImage({env, command});
    const mirror = inspectImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`, {env, command});
    requireImage(mirror); check(mirror.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
    result.registryIdentityProven = true;
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    const preLease = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    check(preLease.instance_id === before.instance_id && same(preLease.config, before.config) && preLease.state === 'started' && preLease.image_ref?.digest === before.image_ref.digest, 'pre_effect_machine_drift');
    result.leaseAttempts = 1;
    const lease = await json(`${BASE}/${TARGET.machine}/lease`, {method: 'POST', headers: auth, body: JSON.stringify({description: `e4d7-${env.GITHUB_RUN_ID}`, ttl: 300})});
    nonce = lease.data?.nonce;
    check(typeof nonce === 'string' && nonce.length > 0 && lease.data?.version === before.instance_id, 'lease_version_unproven');
    await queue(); await effective();
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    result.beforeVersion = before.instance_id;
    const startedAt = now(); result.updateAttempts = 1; result.outcome = 'UPDATE_ATTEMPTED_POSTSTATE_UNPROVEN'; write('attempt.json', result);
    await json(`${BASE}/${TARGET.machine}`, {method: 'POST', headers: {...auth, 'fly-machine-lease-nonce': nonce}, body: JSON.stringify(planned.body)});
    let after;
    for (let i = 0; i < 30; i++) {
      after = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
      if (after.state === 'started' && after.instance_id !== before.instance_id) break;
      await sleep(2000);
    }
    requirePoststate(after, before, planned.body, env.RCAP_FLY_IMAGE_DIGEST, startedAt);
    await queue(); await effective(true);
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    result.queueWindowProven = true; result.effectiveBindingProven = true; result.configuredNonrootProven = true; result.secretNamesStable = true;
    const final = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    check(final.instance_id === after.instance_id, 'post_capture_version_drift');
    const postProof = requirePoststate(final, before, planned.body, env.RCAP_FLY_IMAGE_DIGEST, startedAt);
    const postCapsule = nonsecretRollbackCapsule(final);
    check(postCapsule.stopConfig?.signal === 'SIGTERM' && postCapsule.stopConfig.timeout === '30s', 'native_stop_policy_drift');
    result.configUnchangedExceptImageFields = true; result.nativeHandoffProven = true; result.handoff = postProof.handoff;
    result.outcome = 'SOURCE_BOUND_MACHINE_UPDATE_AND_HANDOFF_PROVEN'; result.runtimeQualified = true;
    result.beforeVersion = before.instance_id; result.afterVersion = after.instance_id;
  } catch (error) {
    result.refusalCode = /^(?:[a-z][a-z0-9_]+|request_HTTP_[0-9]{3})$/.test(error?.message ?? '') ? error.message : 'guard_or_command_refused_details_withheld';
    if (error.childFailure) result.childFailure = error.childFailure;
    // Arbitrary exception text and private custody field names never leave this job.
  } finally {
    if (nonce) {
      try { await json(`${BASE}/${TARGET.machine}/lease`, {method: 'DELETE', headers: {...auth, 'fly-machine-lease-nonce': nonce}}); result.leaseReleased = true; }
      catch { result.leaseReleased = false; result.runtimeQualified = false; result.releaseFailure = 'own_lease_release_unproven_no_retry'; }
    }
    result.effectClassification = result.updateAttempts === 1 ? (result.runtimeQualified ? 'MACHINE_UPDATE_PROVEN' : result.nativeHandoffProven ? 'MACHINE_POSTSTATE_PROVEN_LEASE_RELEASE_UNPROVEN' : 'MACHINE_UPDATE_ATTEMPTED_EFFECT_UNPROVEN') : result.leaseAttempts === 1 ? 'LEASE_ATTEMPTED_NO_MACHINE_UPDATE' : result.mirrorAttempts === 1 ? 'MIRROR_ATTEMPTED_NO_MACHINE_UPDATE' : 'NO_WRITES_ATTEMPTED';
    write('result.public.json', result);
  }
  return publicResult(result);
}

export function probeDestinationRegistry({env = process.env, command = execFileSync, inspectImage = inspectAcceptedImage, root = process.cwd()} = {}) {
  requireExecutionContext(env);
  check(env.RCAP_WORKER_REGISTRY_READONLY === 'true', 'readonly_diagnostic_mode_required');
  check(typeof env.DOCKER_CONFIG === 'string' && env.DOCKER_CONFIG.startsWith('/tmp/') && fs.realpathSync(env.DOCKER_CONFIG) === env.DOCKER_CONFIG, 'private_registry_auth_directory_refused');
  const authDirectory = fs.lstatSync(env.DOCKER_CONFIG), authFile = fs.lstatSync(path.join(env.DOCKER_CONFIG, 'config.json'));
  check(authDirectory.isDirectory() && authDirectory.uid === process.getuid() && (authDirectory.mode & 0o777) === 0o700 && authFile.isFile() && authFile.nlink === 1 && authFile.uid === process.getuid() && (authFile.mode & 0o777) === 0o600, 'private_registry_auth_modes_refused');
  const directory = path.join(root, 'e4d7-worker-placement-evidence');
  fs.mkdirSync(directory, {mode: 0o700}); fs.chmodSync(directory, 0o700);
  const result = {W: TARGET.source, D: TARGET.digest, machine: TARGET.machine, runId: Number(env.GITHUB_RUN_ID), executionSha: env.GITHUB_SHA, operation: 'DESTINATION_REGISTRY_READONLY', mirrorAttempts: 0, leaseAttempts: 0, updateAttempts: 0, outcome: 'DESTINATION_READ_UNPROVEN', runtimeQualified: false, hostedAccepted: false, automaticRetry: false, automaticRollback: false, effectClassification: 'READ_ONLY_NO_PROVIDER_WRITES', diagnosticComplete: false, acceptedDigestReusable: false, copyWriteCapabilityTested: false, layerBodiesRead: false};
  const missing = failure => failure?.manifestMissingReported === true && failure.status > 0 && failure.code === null && failure.signal === null && failure.timeout === false && failure.killed !== true && ![401,403].includes(failure.httpStatus) && !failure.authenticationRefusedReported;
  const refusal = error => ({state: missing(error.childFailure) ? 'MISSING_REPORTED' : 'FAILED', refusalCode: /^(?:registry|image)_[a-z0-9_]+$/.test(error?.message ?? '') ? error.message : 'registry_diagnostic_refused', ...(error.childFailure ? {childFailure: error.childFailure} : {})});
  try {
    const image = inspectImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`, {env, command});
    requireImage(image); check(image.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
    result.destinationDigest = {state: 'EXACT', sourceConfigPlatform250Verified: true};
    result.acceptedDigestReusable = true;
  } catch (error) { result.destinationDigest = refusal(error); }
  if (result.acceptedDigestReusable || result.destinationDigest.state === 'MISSING_REPORTED') {
    try {
      const bytes = registryChild('fly_tag_manifest', ['inspect','--authfile',path.join(env.DOCKER_CONFIG,'config.json'),'--raw',`docker://registry.fly.io/${TARGET.app}:${TARGET.source}`], {env, encoding: null, timeout: 30000}, command);
      check(Buffer.isBuffer(bytes), 'registry_raw_bytes_required');
      result.destinationTag = {state: `sha256:${hash(bytes)}` === TARGET.digest ? 'MATCHES_ACCEPTED_DIGEST' : 'OTHER_DIGEST_REFUSED'};
    } catch (error) { result.destinationTag = refusal(error); }
  } else result.destinationTag = {state: 'NOT_ATTEMPTED_AFTER_REFUSAL'};
  result.diagnosticComplete = (result.destinationDigest.state === 'EXACT' || result.destinationDigest.state === 'MISSING_REPORTED') && ['MATCHES_ACCEPTED_DIGEST','OTHER_DIGEST_REFUSED','MISSING_REPORTED'].includes(result.destinationTag.state);
  result.outcome = result.acceptedDigestReusable ? 'EXACT_DESTINATION_MANIFEST_AND_CONFIG_AVAILABLE' : result.diagnosticComplete ? 'DESTINATION_NAMED_REFERENCE_STATE_REPORTED_NO_COPY_AUTHORIZED' : 'DESTINATION_READ_UNPROVEN';
  const bytes = Buffer.from(JSON.stringify(publicResult(result), null, 2) + '\n');
  check(bytes.length <= 16384, 'public_diagnostic_result_too_large');
  const file = path.join(directory, 'result.public.json'), fd = fs.openSync(file, 'wx', 0o600);
  try { fs.fchmodSync(fd, 0o600); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  check(hash(fs.readFileSync(file)) === hash(bytes), 'custody_readback_failed');
  const directoryFD = fs.openSync(directory, 'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
  return publicResult(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  placeWorker().then(result => { console.log(JSON.stringify(result)); if (!result.runtimeQualified) process.exitCode = 1; })
    .catch(() => { console.error('Bounded E4D7 execution or custody failed; an update may already be consumed. Inspect the consumed run and bounded public result; no automatic retry.'); process.exitCode = 1; });
}
