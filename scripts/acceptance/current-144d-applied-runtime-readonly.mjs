import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {TARGET, requireIdleQueue, secretNames, configuredEffectiveProbeCommand, publicResult} from './place-144d-worker.mjs';
import {nonsecretRollbackCapsule, validateQueueCapture, READINESS_QUEUE_SQL} from '../qualified-worker-readonly-capture.mjs';
import {cleanNativeExit, projectNativeEvents} from './fly-handoff-events.mjs';
const BASE = `https://api.machines.dev/v1/apps/${TARGET.app}/machines`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => value && typeof value === 'object' ? Array.isArray(value) ? value.map(canonical) : Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const check = (ok,code) => {if(!ok)throw new Error(code);};
const digest = value => /^sha256:[a-f0-9]{64}$/.test(value ?? '');
const publicCurrentResult = result => ({...publicResult(result), ...Object.fromEntries(['observedState','observedImage','versionFieldEvidence','newVersionProven'].filter(k=>Object.hasOwn(result,k)).map(k=>[k,result[k]]))});

export function classifyExecFailure(httpStatus, text, bodyState = 'READ') {
  let body, state = bodyState;
  if (state === 'READ') {
    try { body = JSON.parse(text); state = body && typeof body === 'object' && !Array.isArray(body) ? 'JSON_OBJECT' : 'JSON_OTHER'; }
    catch { state = 'NON_JSON'; }
  }
  const codes = new Set(['conflict', 'invalid', 'failed_precondition', 'aborted', 'unavailable', 'deadline_exceeded', 'permission_denied', 'unauthenticated', 'not_found', 'exec_request_too_large', 'exec_output_too_large']);
  const statusCodes = state === 'JSON_OBJECT' ? [...new Set([body.status, body.code].filter(v => codes.has(v)))] : [];
  const message = state === 'JSON_OBJECT' ? [body.error, body.message].filter(v => typeof v === 'string').join('\n').slice(0,8192) : '';
  const reasons = [
    ['LEASE_CONFLICT_REPORTED', /(?:machine|lease)[^\r\n]{0,100}(?:currently held|already held|already leased|currently leased|lease conflict|lease mismatch)|lease[^\r\n]{0,80}(?:nonce|locked|held by)/i],
    ['STATE_CONFLICT_REPORTED', /machine[^\r\n]{0,80}(?:not running|not started|stopped|suspended|starting|restarting|migrating|not ready)|invalid machine state/i],
    ['VERSION_CONFLICT_REPORTED', /(?:machine|instance|current)[^\r\n]{0,40}version[^\r\n]{0,40}(?:mismatch|conflict|changed)|stale[^\r\n]{0,30}version/i],
    ['EXEC_BUSY_REPORTED', /exec[^\r\n]{0,60}(?:already running|in progress|busy)|another[^\r\n]{0,40}(?:exec|operation)[^\r\n]{0,30}(?:running|progress)/i],
    ['REQUEST_SCHEMA_REPORTED', /invalid[^\r\n]{0,40}(?:command|request|timeout)|(?:command|cmd)[^\r\n]{0,30}(?:required|missing|empty)|cannot unmarshal|unknown field/i],
    ['PERMISSION_REFUSAL_REPORTED', /permission denied|unauthenticated|not authorized|access denied|insufficient permission/i],
    ['EXEC_UNSUPPORTED_REPORTED', /exec[^\r\n]{0,40}(?:not supported|unsupported|disabled)|(?:container|namespace)[^\r\n]{0,40}(?:not found|not supported)/i],
    ['EXEC_TRANSPORT_REPORTED', /connection refused|connection reset|no route to host|host unreachable|failed to connect|transport[^\r\n]{0,30}(?:error|closed)/i],
    ['EXEC_DEADLINE_REPORTED', /deadline exceeded|context deadline|timed out|timeout exceeded/i],
  ].filter(([, pattern]) => pattern.test(message)).map(([reason]) => reason);
  return {httpStatus: Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : null, bodyState: ['JSON_OBJECT','JSON_OTHER','NON_JSON','TOO_LARGE','UNREADABLE'].includes(state) ? state : 'UNREADABLE', statusCodes, reportedReasons: reasons.length ? reasons : ['UNCLASSIFIED']};
}
async function boundedExecFailure(response) {
  const chunks = []; let bytes = 0;
  try {
    if (!response.body?.getReader) return classifyExecFailure(response.status, '', 'UNREADABLE');
    const reader = response.body.getReader();
    try {
      for (;;) {
        const {done, value} = await reader.read(); if (done) break;
        bytes += value.byteLength;
        if (bytes > 8192) { await reader.cancel(); return classifyExecFailure(response.status, '', 'TOO_LARGE'); }
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    return classifyExecFailure(response.status, Buffer.concat(chunks).toString('utf8'));
  } catch { return classifyExecFailure(response.status, '', 'UNREADABLE'); }
}

export function requireCurrentReadinessContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-worker-identity-readonly.yml@refs/heads/captain-release' && env.GITHUB_JOB === 'identity' && env.GITHUB_REPOSITORY_ID === '1248656766' && env.GITHUB_ACTOR_ID === '287531360' && env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_RUN_ATTEMPT === '1' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? ''), 'current_readiness_execution_context_refused');
  check(env.RCAP_QUALIFIED_WORKER_READINESS === '1' && env.RCAP_WORKER_HANDOFF_HISTORY !== '1' && env.INPUT_WORKER_SOURCE_SHA === TARGET.source && env.INPUT_WORKER_DIGEST === TARGET.digest, 'current_readiness_subject_or_mode_refused');
}

export function observedMachineVersions(machine) {
  const valid = value => typeof value === 'string' && /^[A-Za-z0-9]{10,50}$/.test(value);
  const instanceIdPresent = Object.hasOwn(machine,'instance_id'), versionPresent = Object.hasOwn(machine,'version');
  const instanceId = valid(machine.instance_id) ? machine.instance_id : null, providerVersion = valid(machine.version) ? machine.version : null;
  const aliasConflict = instanceIdPresent && versionPresent && instanceId !== null && providerVersion !== null && instanceId !== providerVersion;
  return {instanceIdPresent, instanceId, versionPresent, providerVersion, aliasConflict, canonicalVersionProven: versionPresent && providerVersion !== null && (!instanceIdPresent || instanceId === providerVersion)};
}

const CURRENT_POSTUPDATE = Object.freeze({"writerRunId":43462230699,"beforeVersion":"01M76WE6AKSD7FHTW8NAM1NK13","writerStepStartMs":1794587081000,"writerResultLoggedMs":1794587263873,"firstAppliedIdentityMs":1794587652844});

export function requireCurrentObservedConfiguration(machine) {
  const capsule = nonsecretRollbackCapsule(machine);
  check(machine.config.restart?.policy === 'always' && machine.config.env.ENABLE_SUPABASE_PARTNER_DATA === 'true' && machine.config.guest?.memory_mb >= 1024 && (!machine.config.services || machine.config.services.length === 0), 'machine_execution_policy_drift');
  check(!machine.config.mounts?.length, 'runtime_mount_override_refused');
  check(capsule.stopConfig?.signal === 'SIGTERM' && capsule.stopConfig.timeout === '30s', 'native_stop_policy_drift');
  check(machine.id === TARGET.machine && machine.state === 'started', 'observed_machine_state_unproven');
  check(machine.image_ref?.digest === TARGET.digest && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source, 'observed_image_identity_unproven');
  check(machine.config?.image === `registry.fly.io/${TARGET.app}@${TARGET.digest}` && machine.config.env?.RCAP_WORKER_CONTAINER_DIGEST === TARGET.digest, 'observed_image_marker_unproven');
}
export function requireCurrentObservedHandoff(machine, window) {
  const events = (machine.events ?? []).filter(e => Number.isSafeInteger(e.timestamp) && e.timestamp >= window.writerStepStartMs && e.timestamp <= window.firstAppliedIdentityMs);
  const exits = events.filter(e => e.type === 'exit'), starts = events.filter(e => e.type === 'start');
  check(exits.length === 1 && starts.length === 1 && starts[0].timestamp >= exits[0].timestamp, 'bounded_native_handoff_pair_unproven');
  const exit = cleanNativeExit(exits[0]); check(exit, 'native_clean_handoff_unproven');
  return {exitAt: exits[0].timestamp, startAt: starts[0].timestamp, requestedStop: exit.requested_stop, exitCode: exit.exit_code, guestExitCode: exit.guest_exit_code, guestSignal: exit.guest_signal, signal: exit.signal, oomKilled: exit.oom_killed, nativePayloads: exit.payloads};
}

// Fixed postupdate observer: no registry, lease, update, worker launch or rollback operation.
export async function observeCurrentAppliedWorker({env = process.env, request = fetch, command = execFileSync, root = process.cwd(), now = Date.now} = {}) {
  requireCurrentReadinessContext(env);
  check(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN, 'postupdate_observer_credential_references_unavailable');
  const directory = path.join(root, 'worker-identity-evidence'); fs.mkdirSync(directory, {mode: 0o700}); fs.chmodSync(directory, 0o700);
  const result = {W: TARGET.source, D: TARGET.digest, machine: TARGET.machine, runId: Number(env.GITHUB_RUN_ID), executionSha: env.GITHUB_SHA, operation: 'APPLIED_144D_READONLY_CURRENT_POSTUPDATE_OBSERVER', mirrorAttempts: 0, leaseAttempts: 0, updateAttempts: 0, runtimeQualified: false, hostedAccepted: false, automaticRetry: false, automaticRollback: false, beforeVersion: CURRENT_POSTUPDATE.beforeVersion, currentRuntimeObserved: false, approvedPrivateProfileComparisonAvailable: false, approvedPrivateProfileEqualityProven: false, historicalBeforeDictRetained: false, historicalExactBeforeComparisonProven: false, originalStartedAtRetained: false, handoffWindowProvenance: 'WRITER_STEP_START_THROUGH_FIRST_APPLIED_IDENTITY', observationFailures: [], outcome: 'CURRENT_POSTUPDATE_OBSERVATION_INCOMPLETE', effectClassification: 'READ_ONLY_NO_PROVIDER_WRITES'};
  const auth = {Authorization: `Bearer ${env.FLY_API_TOKEN}`, 'Content-Type': 'application/json'};
  const operations = new Set(['FLY_MACHINE_INVENTORY_READ','FLY_MACHINE_READ','FLY_MACHINE_EFFECTIVE_EXEC','SUPABASE_QUEUE_READONLY_QUERY']);
  const safeCode = error => /^(?:[a-z][a-z0-9_]+|request_HTTP_[0-9]{3})$/.test(error?.message ?? '') ? error.message : 'postupdate_observation_refused_details_withheld';
  const json = async (operation, url, options) => {
    check(operations.has(operation), 'readonly_request_operation_refused');
    const started = now(), failure = code => Object.assign(new Error(code), {requestOperation: operation});
    let response; try { response = await request(url, {...options, redirect:'error', signal:AbortSignal.timeout(20000)}); } catch { throw failure('request_transport_or_timeout_indeterminate'); }
    if (!response.ok) {
      const error = failure(`request_HTTP_${response.status}`);
      if (operation === 'FLY_MACHINE_EFFECTIVE_EXEC') error.execFailure = {...await boundedExecFailure(response), phase:'CURRENT_POSTUPDATE_NO_OWN_LEASE', elapsedMs:Math.max(0,Math.min(86400000,Math.round(now()-started)))};
      throw error;
    }
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try { for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.byteLength; if (size > 1048576) { await reader.cancel(); throw failure('readonly_response_too_large'); } chunks.push(Buffer.from(value)); } }
    finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw failure('readonly_response_json_refused'); }
  };
  const queue = async () => {
    const rows = await json('SUPABASE_QUEUE_READONLY_QUERY', `https://api.supabase.com/v1/projects/${TARGET.project}/database/query`, {method:'POST',headers:{Authorization:`Bearer ${env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:READINESS_QUEUE_SQL,read_only:false})});
    const proof = validateQueueCapture(rows); requireIdleQueue(proof);
  };
  try {
    const names = secretNames({env,command});
    const inventory = await json('FLY_MACHINE_INVENTORY_READ', BASE, {method:'GET',headers:auth});
    check(Array.isArray(inventory) && inventory.length === 1 && inventory[0].id === TARGET.machine, 'machine_inventory_drift');
    const before = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method:'GET',headers:auth});
    result.observedState = ['started','starting','stopped','stopping','suspended','suspending','replacing','destroying','destroyed','failed'].includes(before.state) ? before.state : 'UNKNOWN';
    result.versionFieldEvidence = observedMachineVersions(before);
    const observedDigest = value => digest(value) ? value : null;
    result.observedImage = {digest: observedDigest(before.image_ref?.digest), markerDigest: observedDigest(before.config?.env?.RCAP_WORKER_CONTAINER_DIGEST), source: /^[a-f0-9]{40}$/.test(before.image_ref?.labels?.['org.opencontainers.image.revision'] ?? '') ? before.image_ref.labels['org.opencontainers.image.revision'] : null};
    result.nativeEventEvidence = {collectionPresent: Object.hasOwn(before,'events'), collectionType: Array.isArray(before.events) ? 'array' : before.events === null ? 'null' : typeof before.events, count: Array.isArray(before.events) ? before.events.length : null};
    try { result.nativeEventEvidence.records = projectNativeEvents(before.events); } catch { result.nativeEventEvidence.projectionUnavailable = true; }
    check(before.id === TARGET.machine && before.state === 'started' && before.image_ref?.digest === TARGET.digest && before.image_ref?.labels?.['org.opencontainers.image.revision'] === TARGET.source && before.config?.image === `registry.fly.io/${TARGET.app}@${TARGET.digest}` && before.config.env?.RCAP_WORKER_CONTAINER_DIGEST === TARGET.digest, 'observed_current_subject_unproven');
    result.currentInstanceId = result.versionFieldEvidence.instanceId;
    result.currentProviderVersion = result.versionFieldEvidence.providerVersion;
    result.newInstanceProven = result.currentInstanceId !== null && result.currentInstanceId !== CURRENT_POSTUPDATE.beforeVersion;
    result.newVersionProven = result.versionFieldEvidence.canonicalVersionProven && result.currentProviderVersion !== CURRENT_POSTUPDATE.beforeVersion;
    if (!result.newVersionProven) result.observationFailures.push(result.versionFieldEvidence.aliasConflict ? 'conflicting_machine_version_aliases' : 'new_canonical_machine_version_unproven');
    try { requireCurrentObservedConfiguration(before); result.currentConfigurationPredicatesProven = true; } catch (error) { result.currentConfigurationPredicatesProven = false; result.observationFailures.push(safeCode(error)); }
    try {
      result.handoff = requireCurrentObservedHandoff(before, CURRENT_POSTUPDATE); result.nativeHandoffProven = true;
      result.writerWindowOutcome = result.handoff.startAt > CURRENT_POSTUPDATE.writerResultLoggedMs ? 'NATIVE_START_AFTER_WRITER_RESULT' : 'ORIGINAL_POLL_STOP_CAUSE_NOT_RETAINED';
    } catch (error) { result.nativeHandoffProven = false; result.observationFailures.push(safeCode(error)); }
    await queue();
    const raw = await json('FLY_MACHINE_EFFECTIVE_EXEC', `${BASE}/${TARGET.machine}/exec`, {method:'POST',headers:auth,body:JSON.stringify({command:configuredEffectiveProbeCommand(),timeout:15})});
    check((raw.exit_code === undefined || raw.exit_code === 0) && (raw.exit_signal === undefined || raw.exit_signal === 0) && !raw.stderr && typeof raw.stdout === 'string' && raw.stdout.length < 2000, 'effective_binding_exec_refused');
    let proof; try { proof = JSON.parse(raw.stdout); } catch { throw new Error('effective_binding_proof_json_refused'); }
    check(proof.schemaVersion === 'qualified-worker-effective-binding/v1' && proof.machineId === TARGET.machine && proof.projectRef === TARGET.project && proof.passed === true && proof.roleProven === true && proof.secretValuesIncluded === false && proof.customerRowsRead === false && [200,206].includes(proof.queueHeadStatus), 'effective_binding_unproven');
    check(proof.configuredUserProven === true, 'configured_nonroot_runtime_unproven');
    result.effectiveBindingProven = true; result.configuredNonrootProven = true;
    await queue(); result.queueWindowProven = true;
    const after = await json('FLY_MACHINE_READ', `${BASE}/${TARGET.machine}`, {method:'GET',headers:auth});
    check(after.id === before.id && after.state === 'started' && same(observedMachineVersions(after),result.versionFieldEvidence) && after.version === before.version && same(after.config,before.config) && same(after.image_ref,before.image_ref), 'postupdate_capture_state_or_configuration_drift');
    result.configStableDuringCapture = true;
    check(same(secretNames({env,command}),names), 'secret_reference_names_drift'); result.secretNamesStable = true;
    result.currentRuntimeObserved = result.observationFailures.length === 0;
    if (result.currentRuntimeObserved) result.outcome = 'CURRENT_RUNTIME_OBSERVED_REQUIRES_ROOT_ACTUAL_REVIEW';
  } catch (error) {
    result.refusalCode = safeCode(error); result.observationFailures.push(result.refusalCode);
    if (operations.has(error.requestOperation)) result.requestFailureOperation = error.requestOperation;
    if (error.execFailure) result.execFailure = error.execFailure;
  } finally {
    const bytes = Buffer.from(JSON.stringify(publicCurrentResult(result),null,2)+'\n'); check(bytes.length <= 16384, 'public_observer_result_too_large');
    const file = path.join(directory,'result.public.json'), fd = fs.openSync(file,'wx',0o600);
    try { fs.fchmodSync(fd,0o600); fs.writeFileSync(fd,bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    check(hash(fs.readFileSync(file)) === hash(bytes), 'custody_readback_failed');
    const directoryFD = fs.openSync(directory,'r'); try { fs.fsyncSync(directoryFD); } finally { fs.closeSync(directoryFD); }
  }
  return publicCurrentResult(result);
}



// Same qualified history transport; the previous transition's reader stays unchanged.
export function requireCurrentHandoffHistoryContext(env) {
  check(env.GITHUB_ACTIONS === 'true' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_WORKFLOW_REF === 'Roger-LegalEase/legalease-partner-dashboard-clean/.github/workflows/rcap-worker-identity-readonly.yml@refs/heads/captain-release' && env.GITHUB_JOB === 'identity' && env.GITHUB_REPOSITORY_ID === '1248656766' && env.GITHUB_ACTOR_ID === '287531360' && env.GITHUB_REPOSITORY?.toLowerCase() === 'roger-legalease/legalease-partner-dashboard-clean' && env.GITHUB_REF === 'refs/heads/captain-release' && env.GITHUB_RUN_ATTEMPT === '1' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') && /^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID ?? ''), 'current_history_execution_context_refused');
  check(env.RCAP_WORKER_HANDOFF_HISTORY === '1' && env.RCAP_QUALIFIED_WORKER_READINESS !== '1' && env.INPUT_WORKER_SOURCE_SHA === TARGET.source && env.INPUT_WORKER_DIGEST === TARGET.digest, 'current_history_subject_or_mode_refused');
}
const CURRENT_HISTORY = Object.freeze({version:'01M7AVQ3YP9QSSTZQCRX8QXJCF',startAt:1794587292939,knownStartRunId:43471533487,knownStartResultSha256:'17f51075a7114f749df308502321f0bc2d9aec140ef405420d84857ba69ccdf5'});
const publicHistoryResult = value => ({...publicCurrentResult(value),...Object.fromEntries(['historyOnly','historyEvidence','knownStartSource','oldExitBinding','preservedCurrentRuntimeRunId','machineUnchangedDuringHistoryRead'].filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]))});
export async function observeCurrentHandoffHistory({env=process.env,request=fetch,root=process.cwd()}={}) {
  requireCurrentHandoffHistoryContext(env);
  check(env.FLY_API_TOKEN, 'current_history_credential_reference_unavailable');
  const directory=path.join(root,'worker-identity-evidence');fs.mkdirSync(directory,{mode:0o700});fs.chmodSync(directory,0o700);
  const result={W:TARGET.source,D:TARGET.digest,machine:TARGET.machine,runId:Number(env.GITHUB_RUN_ID),executionSha:env.GITHUB_SHA,operation:'APPLIED_144D_NATIVE_HANDOFF_HISTORY_ONLY',historyOnly:true,mirrorAttempts:0,leaseAttempts:0,updateAttempts:0,execAttempts:0,databaseCalls:0,runtimeQualified:false,hostedAccepted:false,automaticRetry:false,automaticRollback:false,nativeHandoffProven:false,beforeVersion:CURRENT_POSTUPDATE.beforeVersion,preservedCurrentRuntimeRunId:43471533487,knownStartSource:{runId:CURRENT_HISTORY.knownStartRunId,resultSha256:CURRENT_HISTORY.knownStartResultSha256,timestamp:CURRENT_HISTORY.startAt},oldExitBinding:'FIXED_MACHINE_AND_CAPTURED_TRANSITION_WINDOW_ONLY',historicalBeforeDictRetained:false,historicalExactBeforeComparisonProven:false,approvedPrivateProfileComparisonAvailable:false,approvedPrivateProfileEqualityProven:false,outcome:'HOLD_NATIVE_HANDOFF_HISTORY_UNPROVEN',effectClassification:'READ_ONLY_NO_PROVIDER_WRITES'};
  const endpoint=`${BASE}/${TARGET.machine}`;
  const get=async url=>{
    check(url===endpoint||url===`${endpoint}/events?limit=50`,'current_history_destination_refused');
    let response;try{response=await request(url,{method:'GET',headers:{Authorization:`Bearer ${env.FLY_API_TOKEN}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw new Error('current_history_transport_or_timeout_indeterminate');}
    check(response.status===200,`request_HTTP_${response.status}`);
    const reader=response.body.getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576){await reader.cancel();throw new Error('current_history_response_too_large');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
    try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('current_history_response_json_refused');}
  };
  const requireCurrent=machine=>{requireCurrentObservedConfiguration(machine);const versions=observedMachineVersions(machine);check(versions.canonicalVersionProven&&versions.providerVersion===CURRENT_HISTORY.version,'current_history_version_drift');return versions;};
  try{
    const before=await get(endpoint);result.versionFieldEvidence=requireCurrent(before);result.currentProviderVersion=before.version;
    const history=await get(`${endpoint}/events?limit=50`);check(Array.isArray(history)&&history.length<=50,'native_event_history_shape_invalid');
    const window=history.filter(e=>Number.isSafeInteger(e?.timestamp)&&e.timestamp>=CURRENT_POSTUPDATE.writerStepStartMs&&e.timestamp<=CURRENT_POSTUPDATE.firstAppliedIdentityMs);
    result.historyEvidence={returnedCount:history.length,windowCount:window.length,exitCount:window.filter(e=>e.type==='exit').length,startCount:window.filter(e=>e.type==='start').length,historyCompleteness:'UNKNOWN',window:{from:CURRENT_POSTUPDATE.writerStepStartMs,to:CURRENT_POSTUPDATE.firstAppliedIdentityMs},records:projectNativeEvents(window)};
    const combined=window.slice();if(!combined.some(e=>e.type==='start'&&e.timestamp===CURRENT_HISTORY.startAt))combined.push({type:'start',timestamp:CURRENT_HISTORY.startAt});
    let handoff,refusal;try{handoff=requireCurrentObservedHandoff({events:combined},CURRENT_POSTUPDATE);}catch(error){refusal=error;}
    const after=await get(endpoint);requireCurrent(after);check(after.id===before.id&&same(observedMachineVersions(after),result.versionFieldEvidence)&&same(after.config,before.config)&&same(after.image_ref,before.image_ref),'current_history_machine_or_config_drift');result.machineUnchangedDuringHistoryRead=true;result.configStableDuringCapture=true;
    if(refusal)throw refusal;
    result.handoff=handoff;result.nativeHandoffProven=true;result.outcome='NATIVE_HANDOFF_HISTORY_OBSERVED_REQUIRES_ROOT_ACTUAL_REVIEW';
  }catch(error){result.refusalCode=/^(?:[a-z][a-z0-9_]+|request_HTTP_[0-9]{3})$/.test(error?.message??'')?error.message:'current_history_refused_details_withheld';}
  finally{
    const bytes=Buffer.from(JSON.stringify(publicHistoryResult(result),null,2)+'\n');check(bytes.length<=16384,'public_history_result_too_large');const file=path.join(directory,'result.public.json'),fd=fs.openSync(file,'wx',0o600);try{fs.fchmodSync(fd,0o600);fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}check(hash(fs.readFileSync(file))===hash(bytes),'custody_readback_failed');const dir=fs.openSync(directory,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
  }
  return publicHistoryResult(result);
}
