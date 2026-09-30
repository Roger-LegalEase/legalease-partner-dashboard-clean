#!/usr/bin/env node
// Read-only decision before any registry push or Fly deployment. Credentials and
// full Machine environment data never enter the evidence artifact.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { requireProductionPhaseAuthorization } from './grade-a-launch-control/production-preflight-authorization.mjs';
export const REQUIRED_NAMES = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
export const QUEUE_QUERY = "select count(*) filter (where status = 'queued' and coalesce(next_attempt_at, created_at) < now() - interval '10 minutes') as stale_queued, count(*) filter (where status = 'queued') as queued, count(*) filter (where status = 'claimed') as claimed, count(*) filter (where status = 'failed' and failure_disposition = 'terminal') as terminal_failed from public.packet_render_jobs";
class WorkerReadinessRefusal extends Error {
  constructor(code) { super(code); this.code = code; }
}
const refuse = (condition, code) => { if (!condition) throw new WorkerReadinessRefusal(code); };
const QUEUE_KEYS = ['stale_queued', 'queued', 'claimed', 'terminal_failed'];
const imageDigestOrNull = value => /^sha256:[a-f0-9]{64}$/.test(value ?? '') ? value : null;
const revisionOrNull = value => /^[a-f0-9]{40}$/.test(value ?? '') ? value : null;
const countOrNull = value => value !== null && value !== undefined && /^(0|[1-9][0-9]*)$/.test(String(value)) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const expectedRegistry = (machine, app) => String(machine?.config?.image ?? '').startsWith(`registry.fly.io/${app}:`) || String(machine?.config?.image ?? '').startsWith(`registry.fly.io/${app}@`);
function machineFacts(machine, digest, app) {
  const config = machine?.config;
  const state = machine?.state;
  const policy = config?.restart?.policy;
  return {
    state: ['created', 'starting', 'started', 'stopping', 'stopped', 'suspending', 'suspended', 'destroying', 'destroyed', 'replacing', 'updating', 'launch_failed', 'failed'].includes(state) ? state : 'unrecognized',
    imageDigest: imageDigestOrNull(machine?.image_ref?.digest),
    ociRevision: revisionOrNull(machine?.image_ref?.labels?.['org.opencontainers.image.revision']),
    imageRegistryExpected: expectedRegistry(machine, app),
    imageEquivalent: false,
    environmentDigestMatches: Boolean(digest) && config?.env?.RCAP_WORKER_CONTAINER_DIGEST === digest,
    partnerDataEnabledMatches: config?.env?.ENABLE_SUPABASE_PARTNER_DATA === 'true',
    restartPolicy: ['always', 'on-failure', 'no', 'never'].includes(policy) ? policy : null,
    inboundServiceCount: config && config.services === undefined ? 0 : Array.isArray(config?.services) ? config.services.length : null,
    memoryMb: countOrNull(config?.guest?.memory_mb)
  };
}
export function workerDisposition({ machines, names, queue, source, digest, imageEquivalent = false }) {
  refuse(Array.isArray(machines) && machines.length <= 1, 'worker_machine_inventory_unsafe');
  refuse(Array.isArray(names) && REQUIRED_NAMES.every(name => names.includes(name)), 'worker_required_secret_names_missing');
  refuse(queue && ['stale_queued', 'queued', 'claimed', 'terminal_failed'].every(key => queue[key] !== null && queue[key] !== undefined && /^(0|[1-9][0-9]*)$/.test(String(queue[key]))), 'worker_queue_unreadable');
  refuse(Number(queue.stale_queued) === 0 && Number(queue.terminal_failed) === 0, 'worker_queue_unhealthy');
  if (!machines.length) return 'WRITE_REQUIRED_AND_PROVEN';
  const machine = machines[0];
  refuse(machine && ['started', 'stopped', 'suspended'].includes(machine.state), 'worker_machine_state_unsafe');
  const config = machine.config;
  refuse(config && typeof config === 'object' && (config.services === undefined || Array.isArray(config.services)), 'worker_machine_config_unreadable');
  const exact = machine.state === 'started' && imageEquivalent
    && machine.image_ref?.labels?.['org.opencontainers.image.revision'] === source
    && config.env?.RCAP_WORKER_CONTAINER_DIGEST === digest
    && config.env?.ENABLE_SUPABASE_PARTNER_DATA === 'true'
    && config.restart?.policy === 'always'
    && (!config.services || config.services.length === 0)
    && Number(config.guest?.memory_mb) >= 1024;
  return exact ? 'NO_WRITE_PASS' : 'WRITE_REQUIRED_AND_PROVEN';
}
export async function readWorkerReadiness({ env = process.env, request = fetch, command = execFileSync, root = process.cwd() } = {}) {
  const evidence = {
    schemaVersion: 'rcap-production-worker-readiness/v1', recordedAt: new Date().toISOString(),
    disposition: 'REFUSED', refusalCode: null, machineCount: null, machines: [], machine: null,
    requiredSecretNames: [], requiredSecretPresence: Object.fromEntries(REQUIRED_NAMES.map(name => [name, null])),
    queue: Object.fromEntries(QUEUE_KEYS.map(key => [key, null])),
    productionDatabaseMutated: false, workerMutated: false
  };
  const directory = path.join(root, 'production-worker-evidence');
  const persist = () => {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'production-worker-readiness.json'), JSON.stringify(evidence, null, 2) + '\n');
  };
  let failureCode = 'worker_release_binding_unreadable';
  try {
    const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));
    failureCode = 'production_phase_not_authorized_for_current_release';
    requireProductionPhaseAuthorization(candidate, 'production_worker_deploy');
    const source = env.RCAP_WORKER_SOURCE_SHA, digest = env.RCAP_WORKER_DIGEST;
    refuse(source === candidate.workerSourceSha && digest === candidate.workerDigest, 'worker_tuple_mismatch');
    refuse(env.FLY_APP_NAME === 'legalease-rcap-render-worker' && env.IMAGE_REPOSITORY === 'ghcr.io/roger-legalease/rcap-render-worker' && env.RCAP_PRODUCTION_PROJECT_REF === candidate.productionProjectRef && candidate.productionProjectRef === 'wwtwtsmywnckfkdaqqeg', 'worker_target_mismatch');
    refuse(env.FLY_API_TOKEN && env.SUPABASE_ACCESS_TOKEN, 'worker_credentials_absent');
    const run = (program, args) => command(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env });
    const json = async (url, options) => {
      const response = await request(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20_000) });
      refuse(response.ok, 'worker_inventory_request_failed');
      return response.json();
    };
    failureCode = 'worker_inventory_request_failed';
    const machines = await json(`https://api.machines.dev/v1/apps/${env.FLY_APP_NAME}/machines`, { headers: { Authorization: `Bearer ${env.FLY_API_TOKEN}` } });
    evidence.machineCount = Array.isArray(machines) ? machines.length : null;
    evidence.machines = Array.isArray(machines) ? machines.map(machine => machineFacts(machine, digest, env.FLY_APP_NAME)) : [];
    evidence.machine = evidence.machines[0] ?? null;
    refuse(Array.isArray(machines) && machines.length <= 1, 'worker_machine_inventory_unsafe');
    failureCode = 'worker_secret_inventory_unreadable';
    const names = JSON.parse(run('flyctl', ['secrets', 'list', '--app', env.FLY_APP_NAME, '--json'])).map(row => row.Name ?? row.name).filter(name => REQUIRED_NAMES.includes(name)).sort();
    evidence.requiredSecretNames = names;
    evidence.requiredSecretPresence = Object.fromEntries(REQUIRED_NAMES.map(name => [name, names.includes(name)]));
    failureCode = 'worker_queue_unreadable';
    const rows = await json(`https://api.supabase.com/v1/projects/${candidate.productionProjectRef}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: QUEUE_QUERY, read_only: true }) });
    const queue = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    evidence.queue = Object.fromEntries(QUEUE_KEYS.map(key => [key, countOrNull(queue?.[key])]));

    // Validate unsafe inventories before registry authentication/pulls.
    workerDisposition({ machines, names, queue, source, digest });
    let imageEquivalent = false;
    let imageDigest = null;
    if (machines.length) {
      imageDigest = machines[0].image_ref?.digest;
      refuse(/^sha256:[a-f0-9]{64}$/.test(imageDigest ?? ''), 'worker_image_digest_unreadable');
      const accepted = `${env.IMAGE_REPOSITORY}@${digest}`;
      failureCode = 'worker_accepted_image_unreadable';
      const acceptedId = run('docker', ['image', 'inspect', '--format={{.Id}}', accepted]).trim();
      refuse(/^sha256:[a-f0-9]{64}$/.test(acceptedId), 'worker_accepted_image_unreadable');
      if (imageDigest === digest) imageEquivalent = true;
      else {
        // Mirror manifests can have different digests. Compare immutable image
        // config IDs (including rootfs diff IDs), never merely a revision label.
        refuse(String(machines[0].config?.image ?? '').startsWith(`registry.fly.io/${env.FLY_APP_NAME}:`) || String(machines[0].config?.image ?? '').startsWith(`registry.fly.io/${env.FLY_APP_NAME}@`), 'worker_image_registry_unexpected');
        failureCode = 'worker_existing_image_unreadable';
        run('flyctl', ['auth', 'docker']);
        const immutable = `registry.fly.io/${env.FLY_APP_NAME}@${imageDigest}`;
        run('docker', ['pull', immutable]);
        const existingId = run('docker', ['image', 'inspect', '--format={{.Id}}', immutable]).trim();
        refuse(/^sha256:[a-f0-9]{64}$/.test(existingId), 'worker_existing_image_unreadable');
        imageEquivalent = existingId === acceptedId;
      }
    }
    const disposition = workerDisposition({ machines, names, queue, source, digest, imageEquivalent });
    evidence.disposition = disposition;
    if (evidence.machine) evidence.machine.imageEquivalent = imageEquivalent;
    persist();
    failureCode = 'worker_workflow_output_unwritable';
    if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `disposition=${disposition}\n`);
    if (disposition === 'NO_WRITE_PASS' && env.GITHUB_ENV) fs.appendFileSync(env.GITHUB_ENV, `RCAP_FLY_IMAGE_DIGEST=${imageDigest}\n`);
    return evidence;
  } catch (error) {
    const code = error instanceof WorkerReadinessRefusal ? error.code : failureCode;
    evidence.disposition = 'REFUSED';
    evidence.refusalCode = code;
    persist();
    throw new WorkerReadinessRefusal(code);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  readWorkerReadiness().then(result => console.log(result.disposition)).catch(error => { console.error(`Production worker read-first inventory refused: ${error instanceof WorkerReadinessRefusal ? error.code : 'worker_readiness_evidence_write_failed'}; no deployment authorized by this readback.`); process.exitCode = 1; });
}
