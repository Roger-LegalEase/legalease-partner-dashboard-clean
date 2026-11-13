import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectRegistryImage} from './registry-image.mjs';
import {cleanNativeExit, nativeExit, projectNativeEvents} from './fly-handoff-events.mjs';
import {nonsecretRollbackCapsule, validateQueueCapture, READINESS_QUEUE_SQL, effectiveProbeCommand} from '../qualified-worker-readonly-capture.mjs';

export const TARGET = Object.freeze({
  app: 'legalease-rcap-render-worker', machine: 'd8de5e4f759278', project: 'wwtwtsmywnckfkdaqqeg',
  source: '144dad959ee7fb9e1387d693bbcc16767edc6620',
  digest: 'sha256:18941445ab0bca954eaeb592353fb3350d3b615d8d3e4830841e38901f5efa87',
  config: 'sha256:b612afebb9953ed124449eb6adbf226837e4e45c8f1eb456fdb47ff91a8d066e',
  oldSource: 'e4d7faef0960c8b453bb88f2bf56456d3220567f',
  oldDigest: 'sha256:1858985f511a74725c9d45dea1cb7881f53b0b66422e2786615799dcb8e6d31d',
  oldMirror: 'sha256:1858985f511a74725c9d45dea1cb7881f53b0b66422e2786615799dcb8e6d31d',
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
  check(image.RootFS?.Layers?.length === 303 && image.RootFS.Layers.every(digest), 'image_diffids_mismatch');
}
// Only structural facts and recognized registry error classes leave a failed child.
export function safeRegistryFailure(error, stage, elapsedMs) {
  const codes = new Set(['ETIMEDOUT','ENOENT','EACCES','EPERM','ECONNREFUSED','ECONNRESET','ENETUNREACH','EHOSTUNREACH','ENOTFOUND','EAI_AGAIN','ENOBUFS','ENOSPC','ENOMEM','EPIPE','ERR_CHILD_PROCESS_STDIO_MAXBUFFER']);
  const signals = new Set(['SIGTERM','SIGKILL','SIGINT','SIGABRT','SIGPIPE','SIGSEGV','SIGHUP']);
  const stderr = Buffer.isBuffer(error?.stderr) ? error.stderr.subarray(0,8192).toString('utf8') : typeof error?.stderr === 'string' ? error.stderr.slice(0,8192) : '';
  const statuses = [...new Set([...stderr.matchAll(/\b(?:unexpected HTTP status(?: code)?|HTTP status(?: code)?|unexpected status code|invalid status code from registry|status\s*code)\s*:?\s*(401|403|404|405|408|409|413|415|429|500|502|503|504)\b/gi)].map(match => Number(match[1])))];
  const httpStatus = statuses.length === 1 ? statuses[0] : null;
  const reasons = [
    ['CREDENTIAL_HELPER_FAILURE', /error getting credentials|docker-credential-[^\s:]+[^\r\n]*(?:not found|not installed)/i],
    ['AUTHFILE_FORMAT_FAILURE', /(?:decoding|parsing|reading)[^\r\n]{0,80}(?:auth file|authfile|docker config)|invalid[^\r\n]{0,40}auth[^\r\n]{0,40}(?:format|base64)/i],
    ['TOOL_INTERFACE_REFUSED', /unknown flag:|unknown shorthand flag:|unrecognized option/i],
    ['TLS_VERIFICATION_OR_HANDSHAKE_FAILURE', /x509:|TLS handshake|remote error: tls/i],
    ['DNS_LOOKUP_FAILURE', /lookup [^\r\n]{1,260}(?:no such host|server misbehaving)/i],
    ['NETWORK_CONNECTION_FAILURE', /connection refused|network is unreachable|i\/o timeout|connection reset by peer/i],
    ['MANIFEST_UNKNOWN_REPORTED', /\bMANIFEST_UNKNOWN\b|\bmanifest unknown\b/i],
    ['REPOSITORY_UNKNOWN_REPORTED', /\bNAME_UNKNOWN\b|\bname unknown\b/i],
    ['AUTHENTICATION_REFUSED_REPORTED', /\bunauthorized\b|\bdenied: requested access to the resource is denied\b/i],
    ['MANIFEST_MEDIA_TYPE_REFUSED', /unsupported manifest (?:MIME|media) type|unrecognized manifest type|unsupported media type/i],
    ['TOKEN_EXCHANGE_FAILURE', /requesting bearer token:/i],
    ['REGISTRY_PING_FAILURE', /pinging (?:container|docker) registry/i],
  ];
  const reportedReason = reasons.find(([, pattern]) => pattern.test(stderr))?.[0] ?? (statuses.length > 1 ? 'MULTIPLE_HTTP_STATUSES_REPORTED' : httpStatus !== null ? 'HTTP_STATUS_REPORTED' : 'UNCLASSIFIED');
  return {
    stage: ['source_manifest','source_config','fly_manifest','fly_config','fly_tag_manifest','mirror_copy'].includes(stage) ? stage : 'unknown_registry_stage',
    code: codes.has(error?.code) ? error.code : null,
    status: Number.isInteger(error?.status) && error.status >= 0 && error.status <= 255 ? error.status : null,
    signal: signals.has(error?.signal) ? error.signal : null,
    killed: typeof error?.killed === 'boolean' ? error.killed : null,
    timeout: error?.code === 'ETIMEDOUT' ? true : Number.isInteger(error?.status) && error.status >= 0 && error.signal == null ? false : null,
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs <= 86400000 ? Math.round(elapsedMs) : null,
    httpStatus,
    reportedReason,
    httpClass: httpStatus === null ? null : [401,403].includes(httpStatus) ? 'AUTH_4XX' : httpStatus === 404 ? 'NOT_FOUND_4XX' : httpStatus === 429 ? 'THROTTLE_4XX' : httpStatus >= 500 ? 'SERVER_5XX' : 'CLIENT_4XX',
    manifestMissingReported: /\bMANIFEST_UNKNOWN\b|\bmanifest unknown\b/i.test(stderr),
    authenticationRefusedReported: /\bunauthorized\b|\bdenied: requested access to the resource is denied\b/i.test(stderr),
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
  check(typeof env.DOCKER_CONFIG === 'string' && env.DOCKER_CONFIG.startsWith('/tmp/') && fs.realpathSync(env.DOCKER_CONFIG) === env.DOCKER_CONFIG, 'private_registry_auth_directory_refused');
  const authDirectory = fs.lstatSync(env.DOCKER_CONFIG), authFile = fs.lstatSync(path.join(env.DOCKER_CONFIG, 'config.json'));
  check(authDirectory.isDirectory() && authDirectory.uid === process.getuid() && (authDirectory.mode & 0o777) === 0o700 && authFile.isFile() && authFile.nlink === 1 && authFile.uid === process.getuid() && (authFile.mode & 0o777) === 0o600, 'private_registry_auth_modes_refused');
  let childFailure;
  const boundedCommand = (_tool, args, options) => {
    const stage = (reference.startsWith('registry.fly.io/') ? 'fly_' : 'source_') + (args.includes('--config') ? 'config' : 'manifest');
    try { return registryChild(stage, args, {...options, timeout: 30000}, command); }
    catch (error) { childFailure = error.childFailure; throw error; }
  };
  try {
    const image = inspectRegistryImage(reference, {...TARGET, layers: 303}, {authFile: path.join(env.DOCKER_CONFIG, 'config.json'), command: boundedCommand, env});
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
  const keys = ['W', 'D', 'machine', 'runId', 'executionSha', 'updateAttempts', 'mirrorAttempts', 'leaseAttempts', 'outcome', 'runtimeQualified', 'hostedAccepted', 'automaticRetry', 'automaticRollback', 'registryIdentityProven', 'secretNamesStable', 'rollbackInverseValidated', 'beforeVersion', 'afterVersion', 'configUnchangedExceptImageFields', 'effectiveBindingProven', 'configuredNonrootProven', 'queueWindowProven', 'nativeHandoffProven', 'handoff', 'leaseReleased', 'refusalCode', 'releaseFailure', 'effectClassification', 'requestFailureOperation', 'currentRuntimeObserved', 'currentInstanceId', 'currentProviderVersion', 'newInstanceProven', 'currentConfigurationPredicatesProven', 'approvedPrivateProfileComparisonAvailable', 'approvedPrivateProfileEqualityProven', 'configStableDuringCapture', 'historicalExactBeforeComparisonProven', 'historicalBeforeDictRetained', 'originalStartedAtRetained', 'handoffWindowProvenance', 'writerWindowOutcome', 'observationFailures', 'transportFailure', 'execFailure', 'execProbePassed', 'machineUnchangedDuringDiagnostic', 'releaseFailureOperation', 'childFailure', 'destinationHttpProof', 'operation', 'execAttempts', 'databaseCalls', 'preservedRuntimeObserverRunId', 'nativeEventEvidence', 'eventTargetStable', 'diagnosticComplete', 'acceptedDigestReusable', 'destinationDigest', 'destinationTag', 'copyWriteCapabilityTested', 'layerBodiesRead'];
  return Object.fromEntries(keys.filter(key => Object.hasOwn(result, key)).map(key => [key, result[key]]));
}
export function requireExecutionContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-f1-ephemeral-staging.yml@refs/heads/captain-release' && env.GITHUB_JOB === 'deploy_144d' && env.GITHUB_REPOSITORY_ID === '1248656766' && env.GITHUB_ACTOR_ID === '287531360' && env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_RUN_ATTEMPT === '1' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? ''), 'execution_context_refused');
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
  registryChild('mirror_copy', ['copy', '--preserve-digests', '--authfile', path.join(env.DOCKER_CONFIG, 'config.json'), `docker://ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, `docker://registry.fly.io/${TARGET.app}:${TARGET.source}`], {env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000}, command);
}

// Pin the inspected CLI interface before a lease can be attempted.
function requireHeldLeaseSshInterface({env, command}) {
  let version, help;
  try {
    const options = {env, encoding: 'utf8', stdio: ['ignore','pipe','pipe'], timeout: 10000, maxBuffer: 32768};
    version = command('flyctl', ['version'], options);
    help = command('flyctl', ['ssh','console','--help'], options);
  } catch { throw new Error('fly_ssh_interface_unavailable'); }
  check(/\bflyctl v0\.5\.8(?:\s|$)/.test(version), 'fly_ssh_version_unqualified');
  check(['--machine','--app','--command','--quiet','--pty','--user'].every(flag => help.includes(flag)), 'fly_ssh_fixed_selection_interface_absent');
}
function heldLeaseEffectiveProbe(requireConfiguredUser, {env, ssh, now}) {
  const argv = requireConfiguredUser ? configuredEffectiveProbeCommand() : effectiveProbeCommand(TARGET.machine);
  const quoted = argv.map(value => "'" + value.replaceAll("'", "'\\''") + "'").join(' ');
  const childEnv = {...env};
  for (const key of ['SUPABASE_ACCESS_TOKEN','GH_TOKEN','GITHUB_TOKEN','GHCR_READ_TOKEN','DOCKER_CONFIG']) delete childEnv[key];
  const started = now(); let child;
  try {
    child = ssh('flyctl', ['ssh','console','--app',TARGET.app,'--machine',TARGET.machine,'--user','root','--quiet','--pty=false','--command',quoted], {env: childEnv, encoding: 'utf8', shell: false, stdio: ['ignore','pipe','pipe'], timeout: 20000, killSignal: 'SIGKILL', maxBuffer: 8192});
  } catch { child = {}; }
  if (child.error || child.status !== 0 || child.signal || typeof child.stdout !== 'string' || child.stdout.length >= 2000 || child.stderr !== '') {
    const stderr = typeof child.stderr === 'string' ? child.stderr.slice(0,8192) : '';
    const error = new Error('effective_ssh_transport_refused');
    error.requestOperation = 'FLY_MACHINE_EFFECTIVE_SSH';
    error.transportFailure = {
      operation: 'FLY_MACHINE_EFFECTIVE_SSH',
      code: ['ETIMEDOUT','ENOENT','EACCES','EPERM','ENOBUFS','ERR_CHILD_PROCESS_STDIO_MAXBUFFER'].includes(child.error?.code) ? child.error.code : null,
      status: Number.isInteger(child.status) && child.status >= 0 && child.status <= 255 ? child.status : null,
      signal: ['SIGTERM','SIGKILL','SIGINT','SIGPIPE','SIGABRT'].includes(child.signal) ? child.signal : null,
      timeout: child.error?.code === 'ETIMEDOUT',
      elapsedMs: Math.max(0, Math.min(86400000, Math.round(now() - started))),
      reportedReason: child.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : /permission denied|not authorized|unauthenticated|create ssh certificate/i.test(stderr) ? 'SSH_CAPABILITY_REFUSED_REPORTED' : /machine[^\r\n]{0,40}not started|no started VMs/i.test(stderr) ? 'TARGET_NOT_STARTED_REPORTED' : /unknown flag|executable file not found|command not found/i.test(stderr) || child.error?.code === 'ENOENT' ? 'SSH_INTERFACE_REFUSED_REPORTED' : child.status === 0 && child.stderr ? 'UNEXPECTED_STDERR' : 'SSH_TRANSPORT_UNPROVEN',
    };
    throw error;
  }
  return {exit_code: 0, exit_signal: 0, stdout: child.stdout, stderr: ''};
}

// A fixed metadata GET consumes the existing app-registry reference only in memory.
export async function readDestinationManifestResponse({env = process.env, request = fetch} = {}) {
  const url = `https://registry.fly.io/v2/${TARGET.app}/manifests/${TARGET.digest}`;
  const proof = {httpStatus: null, errorCodes: [], authenticationChallenge: 'NONE', responseShape: 'UNREAD', responseBytes: 0, diagnosticComplete: false, manifestExact: false, typedMissingProven: false, redirectsFollowed: 0, requestAttempts: 0};
  let fd, authorization, authPath, before;
  try {
    check(typeof env.DOCKER_CONFIG === 'string' && env.DOCKER_CONFIG.startsWith('/tmp/') && fs.realpathSync(env.DOCKER_CONFIG) === env.DOCKER_CONFIG, 'private_registry_auth_directory_refused');
    const directory = fs.lstatSync(env.DOCKER_CONFIG);
    check(directory.isDirectory() && directory.uid === process.getuid() && (directory.mode & 0o777) === 0o700, 'private_registry_auth_modes_refused');
    authPath = path.join(env.DOCKER_CONFIG, 'config.json');
    fd = fs.openSync(authPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    before = fs.fstatSync(fd);
    check(before.isFile() && before.uid === process.getuid() && before.nlink === 1 && (before.mode & 0o777) === 0o600 && before.size > 0 && before.size <= 65536, 'private_registry_auth_modes_refused');
    const authBytes = Buffer.alloc(65537);
    let document;
    try {
      const read = fs.readSync(fd, authBytes, 0, authBytes.length, 0);
      check(read === before.size && read <= 65536, 'private_registry_auth_size_drift');
      document = JSON.parse(authBytes.subarray(0, read));
    } finally { authBytes.fill(0); }
    check(!document.credsStore && !document.credHelpers?.['registry.fly.io'], 'private_registry_auth_interface_refused');
    const encoded = document.auths?.['registry.fly.io']?.auth;
    check(typeof encoded === 'string' && encoded.length <= 32768 && /^[A-Za-z0-9+/_-]+={0,2}$/.test(encoded), 'private_registry_auth_interface_refused');
    const decoded = Buffer.from(encoded, 'base64');
    try {
      check(decoded.length > 2 && decoded.length <= 16384 && decoded.subarray(0,2).toString() === 'x:' && !/[\x00-\x1f\x7f]/.test(decoded.toString()) && decoded.toString('base64').replace(/=+$/,'') === encoded.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,''), 'private_registry_auth_interface_refused');
      authorization = 'Basic ' + decoded.toString('base64');
    } finally { decoded.fill(0); }
  } catch {
    if (fd !== undefined) fs.closeSync(fd);
    proof.responseShape = 'AUTH_REFERENCE_UNPROVEN';
    return proof;
  }
  let response;
  try {
    proof.requestAttempts = 1;
    response = await request(url, {method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(30000), headers: {Authorization: authorization, Accept: 'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'}});
    if (!Number.isInteger(response?.status) || response.status < 100 || response.status > 599 || typeof response.headers?.get !== 'function') {
      proof.responseShape = 'INVALID_RESPONSE'; return proof;
    }
    proof.httpStatus = response.status;
    const challenge = response.headers.get('www-authenticate');
    proof.authenticationChallenge = challenge === null ? 'NONE' : /^\s*Basic(?:\s|$)/i.test(challenge) ? 'BASIC' : /^\s*Bearer(?:\s|$)/i.test(challenge) ? 'BEARER' : 'OTHER';
    if (response.redirected !== false || response.url !== url || (response.status >= 300 && response.status < 400)) {
      proof.responseShape = 'REDIRECT_REFUSED'; return proof;
    }
    if (typeof response.body?.getReader !== 'function') { proof.responseShape = 'BODY_UNREADABLE'; return proof; }
    const reader = response.body.getReader(), parts = [], limit = response.status === 200 ? 1048576 : 8192;
    try {
      for (;;) {
        const {done, value} = await reader.read(); if (done) break;
        if (!(value instanceof Uint8Array)) { proof.responseShape = 'BODY_UNREADABLE'; return proof; }
        proof.responseBytes = Math.min(limit + 1, proof.responseBytes + value.length);
        if (proof.responseBytes > limit) { proof.responseShape = 'BODY_TOO_LARGE'; return proof; }
        parts.push(Buffer.from(value));
      }
    } finally {
      try { await reader.cancel(); } catch {}
      try { reader.releaseLock(); } catch {}
    }
    const bytes = Buffer.concat(parts);
    let body;
    try { body = JSON.parse(bytes); } catch { proof.responseShape = 'NON_JSON'; proof.diagnosticComplete = true; return proof; }
    proof.responseShape = 'JSON_OTHER';
    const type = (response.headers.get('content-type') ?? '').split(';',1)[0].trim().toLowerCase();
    const codes = new Set(['MANIFEST_UNKNOWN','UNAUTHORIZED','DENIED','NAME_UNKNOWN','BLOB_UNKNOWN','UNSUPPORTED','TOOMANYREQUESTS','UNKNOWN']);
    if (Array.isArray(body?.errors) && body.errors.length > 0 && body.errors.length <= 8 && body.errors.every(e => e && typeof e === 'object' && !Array.isArray(e) && typeof e.code === 'string')) {
      proof.responseShape = 'REGISTRY_ERROR_JSON';
      proof.errorCodes = body.errors.map(e => codes.has(e.code) ? e.code : 'OTHER');
      proof.typedMissingProven = response.status === 404 && type === 'application/json' && proof.authenticationChallenge === 'NONE' && proof.errorCodes.length === 1 && proof.errorCodes[0] === 'MANIFEST_UNKNOWN';
    }
    if (response.status === 200 && ['application/vnd.oci.image.manifest.v1+json','application/vnd.docker.distribution.manifest.v2+json'].includes(type) && `sha256:${hash(bytes)}` === TARGET.digest && body?.schemaVersion === 2 && body.config?.digest === TARGET.config && body.layers?.length === 303) {
      proof.manifestExact = true; proof.responseShape = 'ACCEPTED_MANIFEST';
    }
    proof.diagnosticComplete = true;
    return proof;
  } catch {
    proof.responseShape = response ? 'BODY_UNREADABLE' : 'NETWORK_OR_TIMEOUT_UNPROVEN';
    return proof;
  } finally {
    authorization = undefined;
    try { await response?.body?.cancel(); } catch {}
    try {
      const final = fs.fstatSync(fd), named = fs.lstatSync(authPath), directory = fs.lstatSync(env.DOCKER_CONFIG);
      if (!directory.isDirectory() || directory.uid !== process.getuid() || (directory.mode & 0o777) !== 0o700 || fs.realpathSync(env.DOCKER_CONFIG) !== env.DOCKER_CONFIG || ![final,named].every(s => s.dev === before.dev && s.ino === before.ino && s.size === before.size && s.mtimeMs === before.mtimeMs && s.uid === before.uid && s.nlink === 1 && (s.mode & 0o777) === 0o600)) {
        proof.diagnosticComplete = false; proof.manifestExact = false; proof.typedMissingProven = false; proof.responseShape = 'AUTH_REFERENCE_DRIFT';
      }
    } catch { proof.diagnosticComplete = false; proof.manifestExact = false; proof.typedMissingProven = false; proof.responseShape = 'AUTH_REFERENCE_DRIFT'; }
    fs.closeSync(fd);
  }
}

export async function placeWorker({env = process.env, request = fetch, command = execFileSync, inspectImage = inspectAcceptedImage, ssh = spawnSync, root = process.cwd(), now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  requireExecutionContext(env);
  check(env.RCAP_WORKER_REGISTRY_READONLY !== 'true', 'readonly_mode_refuses_writer');
  check(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN && digest(env.RCAP_FLY_IMAGE_DIGEST), 'existing_credential_reference_or_mirror_absent');
  const directory = path.join(root, '144d-worker-placement-evidence');
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
  const machineAuth = () => nonce ? {...auth, 'fly-machine-lease-nonce': nonce} : auth;
  const operations = new Set(['SUPABASE_QUEUE_READONLY_QUERY', 'FLY_MACHINE_EFFECTIVE_EXEC', 'FLY_MACHINE_EFFECTIVE_SSH', 'FLY_MACHINE_INVENTORY_READ', 'FLY_MACHINE_READ', 'FLY_MACHINE_LEASE_ACQUIRE', 'FLY_MACHINE_UPDATE', 'FLY_MACHINE_LEASE_RELEASE']);
  const json = async (operation, url, options) => {
    check(operations.has(operation), 'request_operation_refused');
    const failure = code => Object.assign(new Error(code), {requestOperation: operation});
    let response; try { response = await request(url, {...options, redirect: 'error', signal: AbortSignal.timeout(20000)}); }
    catch { throw failure('request_transport_or_timeout_indeterminate'); }
    if (!response.ok) throw failure(`request_HTTP_${response.status}`);
    return response.json();
  };
  const queue = async () => {
    const rows = await json('SUPABASE_QUEUE_READONLY_QUERY', `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`, {method: 'POST', headers: {Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json'}, body: JSON.stringify({query: READINESS_QUEUE_SQL, read_only: false})});
    const proof = validateQueueCapture(rows); requireIdleQueue(proof); return proof;
  };
  const effective = async (requireConfiguredUser = false) => {
    try {
    const raw = nonce ? heldLeaseEffectiveProbe(requireConfiguredUser, {env, ssh, now}) : await json('FLY_MACHINE_EFFECTIVE_EXEC', `${BASE}/${TARGET.machine}/exec`, {method: 'POST', headers: machineAuth(), body: JSON.stringify({command: requireConfiguredUser ? configuredEffectiveProbeCommand() : effectiveProbeCommand(TARGET.machine), timeout: 15})});
    check((raw.exit_code === undefined || raw.exit_code === 0) && (raw.exit_signal === undefined || raw.exit_signal === 0) && !raw.stderr && typeof raw.stdout === 'string' && raw.stdout.length < 2000, 'effective_binding_exec_refused');
    let proof; try { proof = JSON.parse(raw.stdout); } catch { throw new Error('effective_binding_proof_json_refused'); }
    check(proof.schemaVersion === 'qualified-worker-effective-binding/v1' && proof.machineId === TARGET.machine && proof.projectRef === TARGET.project && proof.passed === true && proof.roleProven === true && proof.secretValuesIncluded === false && proof.customerRowsRead === false && [200,206].includes(proof.queueHeadStatus), 'effective_binding_unproven');
    if (requireConfiguredUser) check(proof.configuredUserProven === true, 'configured_nonroot_runtime_unproven');
    return Object.fromEntries(['schemaVersion', 'machineId', 'projectRef', 'passed', 'roleProven', 'queueHeadStatus', 'secretValuesIncluded', 'customerRowsRead'].map(k => [k, proof[k]]));
    } catch (error) { if (nonce) error.requestOperation = 'FLY_MACHINE_EFFECTIVE_SSH'; throw error; }
  };
  try {
    try { requireHeldLeaseSshInterface({env, command}); } catch (error) { error.requestOperation = 'FLY_MACHINE_EFFECTIVE_SSH'; throw error; }
    check(env.RCAP_FLY_IMAGE_DIGEST === TARGET.digest, 'mirror_digest_not_preserved');
    const source = inspectImage(`ghcr.io/roger-legalease/rcap-render-worker@${TARGET.digest}`, {env, command});
    requireImage(source); check(source.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
    const names = secretNames({env, command});
    const inventory = await json('FLY_MACHINE_INVENTORY_READ', BASE, {method: 'GET', headers: auth});
    check(Array.isArray(inventory) && inventory.length === 1 && inventory[0].id === TARGET.machine, 'machine_inventory_drift');
    const before = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method: 'GET', headers: machineAuth()});
    const planned = planUpdate(before, env.RCAP_FLY_IMAGE_DIGEST);
    result.rollbackInverseValidated = true;
    await queue(); await effective();
    const fresh = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method: 'GET', headers: machineAuth()});
    check(fresh.instance_id === before.instance_id && same(fresh.config, before.config) && fresh.state === 'started' && fresh.image_ref?.digest === before.image_ref.digest, 'pre_effect_machine_drift');
    // Reuse an exact destination; only a typed missing manifest permits this job's one copy.
    let mirror;
    try { mirror = inspectImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`, {env, command}); }
    catch (error) {
      const failure = error.childFailure;
      if (!(failure?.stage === 'fly_manifest' && [null,404].includes(failure.httpStatus) && failure.manifestMissingReported === true && failure.status > 0 && failure.code === null && failure.signal === null && failure.timeout === false && failure.killed !== true && !failure.authenticationRefusedReported)) throw error;
      // A missing CLI error is insufficient: require fresh typed HTTP proof before any copy.
      result.destinationHttpProof = await readDestinationManifestResponse({env, request});
      check(result.destinationHttpProof.diagnosticComplete && (result.destinationHttpProof.manifestExact || result.destinationHttpProof.typedMissingProven), 'destination_http_proof_unproven_no_copy');
      if (!result.destinationHttpProof.manifestExact) {
        result.mirrorAttempts = 1; write('mirror-attempt.public.json', result);
        mirrorImage({env, command});
      }
      mirror = inspectImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`, {env, command});
    }
    requireImage(mirror); check(mirror.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
    result.registryIdentityProven = true;
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    const preLease = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method: 'GET', headers: machineAuth()});
    check(preLease.instance_id === before.instance_id && same(preLease.config, before.config) && preLease.state === 'started' && preLease.image_ref?.digest === before.image_ref.digest, 'pre_effect_machine_drift');
    result.leaseAttempts = 1;
    const lease = await json('FLY_MACHINE_LEASE_ACQUIRE', `${BASE}/${TARGET.machine}/lease`, {method: 'POST', headers: auth, body: JSON.stringify({description: `144d-${env.GITHUB_RUN_ID}`, ttl: 300})});
    nonce = lease.data?.nonce;
    check(typeof nonce === 'string' && nonce.length > 0 && lease.data?.version === before.instance_id, 'lease_version_unproven');
    await queue(); await effective(true);
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    result.beforeVersion = before.instance_id;
    const startedAt = now(); result.updateAttempts = 1; result.outcome = 'UPDATE_ATTEMPTED_POSTSTATE_UNPROVEN'; write('attempt.json', result);
    await json('FLY_MACHINE_UPDATE', `${BASE}/${TARGET.machine}`, {method: 'POST', headers: machineAuth(), body: JSON.stringify(planned.body)});
    let after;
    for (let i = 0; i < 30; i++) {
      after = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method: 'GET', headers: machineAuth()});
      if (after.state === 'started' && after.instance_id !== before.instance_id) break;
      await sleep(2000);
    }
    requirePoststate(after, before, planned.body, env.RCAP_FLY_IMAGE_DIGEST, startedAt);
    await queue(); await effective(true);
    check(same(secretNames({env, command}), names), 'secret_reference_names_drift');
    result.queueWindowProven = true; result.effectiveBindingProven = true; result.configuredNonrootProven = true; result.secretNamesStable = true;
    const final = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method: 'GET', headers: machineAuth()});
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
    if (error.transportFailure) result.transportFailure = error.transportFailure;
    if (operations.has(error.requestOperation)) result.requestFailureOperation = error.requestOperation;
    // Arbitrary exception text and private custody field names never leave this job.
  } finally {
    if (nonce) {
      try { await json('FLY_MACHINE_LEASE_RELEASE', `${BASE}/${TARGET.machine}/lease`, {method: 'DELETE', headers: machineAuth()}); result.leaseReleased = true; }
      catch { result.leaseReleased = false; result.runtimeQualified = false; result.releaseFailure = 'own_lease_release_unproven_no_retry'; result.releaseFailureOperation = 'FLY_MACHINE_LEASE_RELEASE'; }
    }
    result.effectClassification = result.updateAttempts === 1 ? (result.runtimeQualified ? 'MACHINE_UPDATE_PROVEN' : result.nativeHandoffProven ? 'MACHINE_POSTSTATE_PROVEN_LEASE_RELEASE_UNPROVEN' : 'MACHINE_UPDATE_ATTEMPTED_EFFECT_UNPROVEN') : result.leaseAttempts === 1 ? 'LEASE_ATTEMPTED_NO_MACHINE_UPDATE' : result.mirrorAttempts === 1 ? 'MIRROR_ATTEMPTED_NO_MACHINE_UPDATE' : 'NO_WRITES_ATTEMPTED';
    write('result.public.json', result);
  }
  return publicResult(result);
}

// This existing-flag operation observes only the named destination and never calls the writer.
export async function observeDestinationRegistry({env = process.env, request = fetch, command = execFileSync, inspectImage = inspectAcceptedImage, root = process.cwd()} = {}) {
  requireExecutionContext(env);
  check(env.RCAP_WORKER_REGISTRY_READONLY === 'true', 'readonly_registry_mode_required');
  const directory = path.join(root, '144d-worker-placement-evidence');
  fs.mkdirSync(directory, {mode: 0o700}); fs.chmodSync(directory, 0o700);
  const result = {W: TARGET.source, D: TARGET.digest, machine: TARGET.machine, runId: Number(env.GITHUB_RUN_ID), executionSha: env.GITHUB_SHA, operation: 'DESTINATION_REGISTRY_READONLY', mirrorAttempts: 0, leaseAttempts: 0, updateAttempts: 0, outcome: 'DESTINATION_OBSERVATION_UNPROVEN', runtimeQualified: false, hostedAccepted: false, automaticRetry: false, automaticRollback: false, registryIdentityProven: false, diagnosticComplete: false, effectClassification: 'READ_ONLY_NO_PROVIDER_WRITES'};
  const inspect = () => {
    const image = inspectImage(`registry.fly.io/${TARGET.app}@${TARGET.digest}`, {env, command});
    requireImage(image); check(image.ManifestDigest === TARGET.digest, 'registry_manifest_digest_mismatch');
  };
  try {
    try { inspect(); result.registryIdentityProven = true; }
    catch (error) {
      const failure = error.childFailure;
      if (!(failure?.stage === 'fly_manifest' && [null,404].includes(failure.httpStatus) && failure.manifestMissingReported === true && failure.status > 0 && failure.code === null && failure.signal === null && failure.timeout === false && failure.killed !== true && !failure.authenticationRefusedReported)) throw error;
      result.destinationHttpProof = await readDestinationManifestResponse({env, request});
      check(result.destinationHttpProof.diagnosticComplete && (result.destinationHttpProof.manifestExact || result.destinationHttpProof.typedMissingProven), 'destination_http_proof_unproven_no_copy');
      if (result.destinationHttpProof.manifestExact) { inspect(); result.registryIdentityProven = true; }
    }
    result.diagnosticComplete = true;
    result.outcome = result.registryIdentityProven ? 'EXACT_DESTINATION_MANIFEST_CONFIG_303_PROVEN_NO_COPY' : 'DESTINATION_404_MANIFEST_UNKNOWN_PROVEN_NO_COPY';
  } catch (error) {
    result.refusalCode = /^(?:registry|image|destination|private_registry)_[a-z0-9_]+$/.test(error?.message ?? '') ? error.message : 'destination_registry_observation_refused';
    if (error.childFailure) result.childFailure = error.childFailure;
  } finally {
    const bytes = Buffer.from(JSON.stringify(publicResult(result), null, 2) + '\n');
    check(bytes.length <= 16384, 'public_registry_result_too_large');
    const file = path.join(directory, 'result.public.json'), fd = fs.openSync(file, 'wx', 0o600);
    try { fs.fchmodSync(fd, 0o600); fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    check(hash(fs.readFileSync(file)) === hash(bytes), 'custody_readback_failed');
    const directoryFD = fs.openSync(directory, 'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
  }
  return publicResult(result);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  placeWorker().then(result => { console.log(JSON.stringify(result)); if (!result.runtimeQualified) process.exitCode = 1; })
    .catch(() => { console.error('Bounded 144D execution or custody failed; an update may already be consumed. Inspect the consumed run and bounded public result; no automatic retry.'); process.exitCode = 1; });
}
