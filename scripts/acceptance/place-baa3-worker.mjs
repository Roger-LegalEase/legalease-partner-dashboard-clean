import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectRegistryImage} from './registry-image.mjs';
import {nonsecretRollbackCapsule, validateQueueCapture, READINESS_QUEUE_SQL, effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

export const TARGET = Object.freeze({
  app: 'legalease-rcap-render-worker', machine: 'd8de5e4f759278', project: 'wwtwtsmywnckfkdaqqeg',
  source: 'baa3c993136ebb11f40ad565a01a9f28983d3b6a',
  digest: 'sha256:dfe65f3cb99335888fb14306a1f0b68d2fa2bcf4e2c335a6cb43ef110ef4f0e2',
  config: 'sha256:3b17630db930e704611985ad847e454fdb381a93b8a6e559e94be2079920bfd0',
  oldSource: '84a75b6e65dc69e6c371afac44f1284e0debf722',
  oldDigest: 'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1',
  oldMirror: 'sha256:d419035c8968664ef6d6865bb2942ed92e2fed6beb6c0236d3557dbdf5d88c1e',
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
  check(image.RootFS?.Layers?.length === 153 && image.RootFS.Layers.every(digest), 'image_diffids_mismatch');
}
export function inspectAcceptedImage(reference, {env = process.env, command = execFileSync} = {}) {
  check(typeof env.DOCKER_CONFIG === 'string' && path.isAbsolute(env.DOCKER_CONFIG), 'registry_authfile_reference_required');
  const image = inspectRegistryImage(reference, {...TARGET, layers: 153}, {authFile: path.join(env.DOCKER_CONFIG, 'config.json'), command, env});
  requireImage(image);
  return image;
}
export function planUpdate(machine, mirror) {
  check(digest(mirror), 'mirror_digest_invalid');
  check(machine?.id === TARGET.machine && machine.state === 'started' && /^[A-Za-z0-9]{10,50}$/.test(machine.instance_id ?? ''), 'machine_identity_or_state_mismatch');
  check(machine.image_ref?.digest === TARGET.oldMirror && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.oldSource, 'old_image_identity_drift');
  check(machine.config?.image === `registry.fly.io/${TARGET.app}@${TARGET.oldMirror}` && machine.config.env?.RCAP_WORKER_CONTAINER_DIGEST === TARGET.oldDigest, 'old_config_binding_drift');
  check(machine.config.restart?.policy === 'always' && machine.config.env.ENABLE_SUPABASE_PARTNER_DATA === 'true' && machine.config.guest?.memory_mb >= 1024 && (!machine.config.services || machine.config.services.length === 0), 'machine_execution_policy_drift');
  const rollback = nonsecretRollbackCapsule(machine);
  check(rollback.stopConfig?.signal === 'SIGTERM' && rollback.stopConfig.timeout === '30s', 'native_stop_policy_drift');
  const config = structuredClone(machine.config);
  config.image = `registry.fly.io/${TARGET.app}@${mirror}`;
  config.env.RCAP_WORKER_CONTAINER_DIGEST = TARGET.digest;
  return {rollback, body: {config, current_version: machine.instance_id, skip_launch: false}};
}
export function requirePoststate(machine, before, body, mirror, startedAt) {
  check(machine?.id === TARGET.machine && machine.state === 'started' && typeof machine.instance_id === 'string' && /^[A-Za-z0-9]{10,50}$/.test(machine.instance_id) && machine.instance_id !== before.instance_id, 'new_machine_version_unproven');
  check(machine.image_ref?.digest === mirror && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source, 'new_image_binding_unproven');
  check(same(machine.config, body.config), 'unrelated_config_drift');
  const events = (machine.events ?? []).filter(e => Number.isSafeInteger(e.timestamp) && e.timestamp >= startedAt);
  const exited = events.find(e => e.type === 'exit' && e.request?.exit_event?.requested_stop === true && e.request.exit_event.exit_code === 0 && e.request.exit_event.guest_exit_code === 0 && e.request.exit_event.guest_signal !== 9 && e.request.exit_event.signal !== 9 && e.request.exit_event.oom_killed === false);
  check(exited && events.some(e => e.type === 'start' && e.timestamp >= exited.timestamp), 'native_clean_handoff_unproven');
  const start = events.find(e => e.type === 'start' && e.timestamp >= exited.timestamp);
  return {notBeforeEpochMs: startedAt, machineId: machine.id, beforeVersion: before.instance_id, afterVersion: machine.instance_id, state: machine.state, flyMirrorDigest: machine.image_ref.digest, ociRevision: machine.image_ref.labels['org.opencontainers.image.revision'], acceptedDigestMarker: machine.config.env.RCAP_WORKER_CONTAINER_DIGEST, handoff: {requestedStop: exited.request.exit_event.requested_stop, exitCode: exited.request.exit_event.exit_code, guestExitCode: exited.request.exit_event.guest_exit_code, guestSignal: exited.request.exit_event.guest_signal ?? null, signal: exited.request.exit_event.signal ?? null, oomKilled: exited.request.exit_event.oom_killed, exitAt: exited.timestamp, startAt: start.timestamp}};
}

export async function placeWorker({env = process.env, request = fetch, command = execFileSync, inspectImage = inspectAcceptedImage, root = process.cwd(), now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  check(env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_RUN_ATTEMPT === '1', 'execution_context_refused');
  check(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN && digest(env.RCAP_FLY_IMAGE_DIGEST), 'existing_credential_reference_or_mirror_absent');
  const directory = path.join(root, 'baa3-worker-placement-evidence');
  fs.mkdirSync(directory, {recursive: false, mode: 0o700});
  const write = (name, value, raw = false) => {
    const bytes = raw ? value : Buffer.from(JSON.stringify(value, null, 2) + '\n');
    const file = path.join(directory, name); const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    check(hash(fs.readFileSync(file)) === hash(bytes), 'custody_readback_failed');
    const directoryFD = fs.openSync(directory, 'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
    return {path: name, bytes: bytes.length, sha256: hash(bytes)};
  };
  const result = {W: TARGET.source, D: TARGET.digest, machine: TARGET.machine, updateAttempts: 0, outcome: 'NOT_ATTEMPTED', runtimeQualified: false, hostedAccepted: false, automaticRetry: false, automaticRollback: false};
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
  const effective = async () => {
    const raw = await json(`${BASE}/${TARGET.machine}/exec`, {method: 'POST', headers: auth, body: JSON.stringify({command: effectiveProbeCommand(TARGET.machine), timeout: 15})});
    check((raw.exit_code === undefined || raw.exit_code === 0) && (raw.exit_signal === undefined || raw.exit_signal === 0) && !raw.stderr && typeof raw.stdout === 'string' && raw.stdout.length < 2000, 'effective_binding_exec_refused');
    const proof = JSON.parse(raw.stdout);
    check(proof.schemaVersion === 'qualified-worker-effective-binding/v1' && proof.machineId === TARGET.machine && proof.projectRef === TARGET.project && proof.passed === true && proof.roleProven === true && proof.secretValuesIncluded === false && proof.customerRowsRead === false && [200,206].includes(proof.queueHeadStatus), 'effective_binding_unproven');
    return Object.fromEntries(['schemaVersion', 'machineId', 'projectRef', 'passed', 'roleProven', 'queueHeadStatus', 'secretValuesIncluded', 'customerRowsRead'].map(k => [k, proof[k]]));
  };
  try {
    check(env.RCAP_FLY_IMAGE_DIGEST === TARGET.digest, 'mirror_digest_not_preserved');
    const images = [
      inspectImage(`ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, {env, command}),
      inspectImage(`registry.fly.io/${TARGET.app}@${env.RCAP_FLY_IMAGE_DIGEST}`, {env, command}),
    ];
    for (const image of images) { requireImage(image); check(image.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch'); }
    write('registry-images.json', {source: images[0], mirror: images[1]});
    const inventory = await json(BASE, {method: 'GET', headers: auth});
    check(Array.isArray(inventory) && inventory.length === 1 && inventory[0].id === TARGET.machine, 'machine_inventory_drift');
    const before = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    const planned = planUpdate(before, env.RCAP_FLY_IMAGE_DIGEST);
    write('rollback-config.nonsecret.private.json', planned.rollback.bytes, true);
    write('pre-queue.json', await queue()); write('pre-effective-binding.json', await effective());
    const fresh = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    check(fresh.instance_id === before.instance_id && same(fresh.config, before.config) && fresh.state === 'started' && fresh.image_ref?.digest === before.image_ref.digest, 'pre_effect_machine_drift');
    const lease = await json(`${BASE}/${TARGET.machine}/lease`, {method: 'POST', headers: auth, body: JSON.stringify({description: `baa3-${env.GITHUB_RUN_ID}`, ttl: 300})});
    nonce = lease.data?.nonce;
    check(typeof nonce === 'string' && nonce.length > 0 && lease.data?.version === before.instance_id, 'lease_version_unproven');
    write('leased-queue.json', await queue());
    write('BEGIN.json', {W: TARGET.source, D: TARGET.digest, mirrorDigest: env.RCAP_FLY_IMAGE_DIGEST, beforeVersion: before.instance_id, beforeConfigSha256: planned.rollback.configSha256});
    const startedAt = now(); result.updateAttempts = 1; result.outcome = 'UPDATE_ATTEMPTED_POSTSTATE_UNPROVEN'; write('attempt.json', result);
    await json(`${BASE}/${TARGET.machine}`, {method: 'POST', headers: {...auth, 'fly-machine-lease-nonce': nonce}, body: JSON.stringify(planned.body)});
    let after;
    for (let i = 0; i < 30; i++) {
      after = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
      if (after.state === 'started' && after.instance_id !== before.instance_id) break;
      await sleep(2000);
    }
    requirePoststate(after, before, planned.body, env.RCAP_FLY_IMAGE_DIGEST, startedAt);
    write('post-queue.json', await queue()); write('post-effective-binding.json', await effective());
    const final = await json(`${BASE}/${TARGET.machine}`, {method: 'GET', headers: auth});
    check(final.instance_id === after.instance_id, 'post_capture_version_drift');
    const postProof = requirePoststate(final, before, planned.body, env.RCAP_FLY_IMAGE_DIGEST, startedAt);
    const postCapsule = nonsecretRollbackCapsule(final);
    postProof.configCapsule = write('post-config.nonsecret.private.json', postCapsule.bytes, true);
    postProof.configSha256 = postCapsule.configSha256;
    result.postMachineProof = write('post-machine-and-handoff.json', postProof);
    result.outcome = 'SOURCE_BOUND_MACHINE_UPDATE_AND_HANDOFF_PROVEN'; result.runtimeQualified = true;
    result.beforeVersion = before.instance_id; result.afterVersion = after.instance_id; result.flyMirrorDigest = after.image_ref.digest;
  } catch (error) {
    result.refusalCode = /^(?:[a-z][a-z0-9_]+|request_HTTP_[0-9]{3})$/.test(error?.message ?? '') ? error.message : 'guard_or_command_refused_details_withheld';
    if (error?.message === 'rollback_custody_guard_refused') result.rollbackCustodyRefusal = {category: error.category, fieldPath: error.fieldPath};
  } finally {
    if (nonce) {
      try { await json(`${BASE}/${TARGET.machine}/lease`, {method: 'DELETE', headers: {...auth, 'fly-machine-lease-nonce': nonce}}); result.leaseReleased = true; }
      catch { result.leaseReleased = false; result.runtimeQualified = false; result.releaseFailure = 'own_lease_release_unproven_no_retry'; }
    }
    write('result.json', result);
  }
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  placeWorker().then(result => { console.log(JSON.stringify(result)); if (!result.runtimeQualified) process.exitCode = 1; })
    .catch(() => { console.error('Bounded BAA3 execution or custody failed; an update may already be consumed. Inspect retained BEGIN/attempt/result evidence; no automatic retry.'); process.exitCode = 1; });
}
