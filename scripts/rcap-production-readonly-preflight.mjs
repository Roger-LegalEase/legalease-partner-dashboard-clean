#!/usr/bin/env node
// Control-plane evidence only. Never deploys, executes SQL, or admits a release.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sha = /^[a-f0-9]{40}$/;
const digest = /^sha256:[a-f0-9]{64}$/;
const id = /^dpl_[A-Za-z0-9]+$/;
const PROJECT = 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV';
const PRODUCTION = 'wwtwtsmywnckfkdaqqeg';
const ACCEPTANCE = 'hyflxnlhpmiqxvvcoiia';

export async function inspectProductionReadiness({ manifest, vercelToken, supabaseToken, fetchImpl = fetch }) {
  const evidence = {
    schemaVersion: 'rcap-production-readonly-preflight/v1',
    operation: 'read_only_control_plane',
    passed: false,
    checks: [],
    requestCount: 0, requestTimeoutMs: 15000,
    remoteMethodsUsed: ['GET'],
    deploymentCreated: false, sqlExecuted: false, secretValuesIncluded: false,
    runtimeOriginVerified: false, hostedContractAccepted: false,
    releaseAuthorityGranted: false
  };
  function requireCheck(caseId, value) {
    evidence.checks.push({ caseId, passed: value === true });
    if (value !== true) throw new Error(caseId);
  }
  try {
    requireCheck('manifest_shape', Boolean(manifest && sha.test(manifest.applicationSha)
      && sha.test(manifest.workerSourceSha) && digest.test(manifest.workerDigest)
      && id.test(manifest.previewDeploymentId) && id.test(manifest.stagedDeploymentId)
      && id.test(manifest.rollbackDeploymentId)
      && new Set([manifest.previewDeploymentId, manifest.stagedDeploymentId, manifest.rollbackDeploymentId]).size === 3
      && manifest.vercelProjectId === PROJECT && /^team_[A-Za-z0-9]+$/.test(manifest.vercelTeamId)
      && manifest.productionProjectRef === PRODUCTION && manifest.acceptanceProjectRef === ACCEPTANCE));
    requireCheck('credentials_present', Boolean(vercelToken && supabaseToken));
    // Copy only validated identity fields; never spread caller input into evidence.
    const tuple = Object.fromEntries(['applicationSha', 'workerSourceSha', 'workerDigest',
      'previewDeploymentId', 'stagedDeploymentId', 'rollbackDeploymentId', 'vercelProjectId',
      'vercelTeamId', 'productionProjectRef', 'acceptanceProjectRef'].map(k => [k, manifest[k]]));
    evidence.requestedIdentity = tuple;
    evidence.manifestIdentitySha256 = hash(tuple);
    async function get(provider, pathname) {
      const origin = provider === 'vercel' ? 'https://api.vercel.com' : 'https://api.supabase.com';
      const url = new URL(pathname, origin);
      if (provider === 'vercel') url.searchParams.set('teamId', tuple.vercelTeamId);
      const allowed = provider === 'vercel'
        ? (/^\/v13\/deployments\/dpl_[A-Za-z0-9]+$/.test(url.pathname)
          || url.pathname === `/v9/projects/${PROJECT}`
          || url.pathname === `/v9/projects/${PROJECT}/domains`
          || url.pathname === `/v9/projects/${PROJECT}/env`
          || /^\/v4\/aliases\/[^/]+$/.test(url.pathname))
        : [PRODUCTION, ACCEPTANCE].some(ref => url.pathname === `/v1/projects/${ref}`);
      if (!allowed || url.origin !== origin) throw new Error('request_not_allowlisted');
      evidence.lastOperation = provider === 'supabase' ? 'READ_SUPABASE_PROJECT'
        : url.pathname.startsWith('/v13/deployments/') ? 'READ_EXACT_DEPLOYMENT'
        : url.pathname.startsWith('/v4/aliases/') ? 'READ_ALIAS_MAPPING'
        : url.pathname.endsWith('/env') ? 'READ_ENVIRONMENT_METADATA'
        : url.pathname.endsWith('/domains') ? 'READ_DOMAIN_INVENTORY' : 'READ_VERCEL_PROJECT';
      evidence.requestCount++;
      const response = await fetchImpl(url.href, { method: 'GET', redirect: 'error',
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${provider === 'vercel' ? vercelToken : supabaseToken}` } });
      if (response.status !== 200) throw new Error('remote_read_refused');
      return response.json();
    }
    const ready = d => (d.readyState ?? d.state) === 'READY';
    // gitSource.sha is Vercel's build source identity; rcap metadata alone is caller-supplied.
    const exactTuple = d => d.gitSource?.sha === tuple.applicationSha
      && d.meta?.rcapApplicationSha === tuple.applicationSha
      && d.meta?.rcapWorkerSourceSha === tuple.workerSourceSha && d.meta?.rcapWorkerDigest === tuple.workerDigest;
    async function deployment(which) {
      const d = await get('vercel', `/v13/deployments/${tuple[which]}`);
      requireCheck(`${which}_identity`, (d.id ?? d.uid) === tuple[which] && d.projectId === PROJECT && ready(d));
      return d;
    }
    async function controls() {
      const env = await get('vercel', `/v9/projects/${PROJECT}/env?decrypt=false`);
      if (!Array.isArray(env.envs) || env.pagination?.next) throw new Error('environment_inventory_incomplete');
      const metadata = env.envs.map(e => ({ key: e.key ?? null, id: e.id ?? null,
        type: e.type ?? null, target: [...(Array.isArray(e.target) ? e.target : [e.target].filter(Boolean))].sort(),
        updatedAt: e.updatedAt ?? null, gitBranch: e.gitBranch ?? null })).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      const inventory = await get('vercel', `/v9/projects/${PROJECT}/domains?limit=100`);
      if (!Array.isArray(inventory.domains) || !inventory.domains.length || inventory.pagination?.next) throw new Error('domain_inventory_incomplete');
      const mappings = [];
      for (const domain of inventory.domains) {
        if (typeof domain.name !== 'string' || !/^[a-zA-Z0-9.-]+$/.test(domain.name)) throw new Error('domain_identity_invalid');
        const alias = await get('vercel', `/v4/aliases/${encodeURIComponent(domain.name)}`);
        if ((alias.deploymentId ?? alias.deployment?.id) !== tuple.rollbackDeploymentId) throw new Error('rollback_alias_mismatch');
        mappings.push([domain.name, tuple.rollbackDeploymentId]);
      }
      mappings.sort((a,b) => a[0].localeCompare(b[0]));
      return { environmentMetadataSha256: hash(metadata), aliasMappingSha256: hash(mappings), domainCount: mappings.length };
    }
    const project = await get('vercel', `/v9/projects/${PROJECT}`);
    requireCheck('vercel_project_identity', project.id === PROJECT && project.accountId === tuple.vercelTeamId);
    const before = await controls();
    const preview = await deployment('previewDeploymentId');
    requireCheck('preview_tuple', [null, 'preview'].includes(preview.target) && exactTuple(preview)
      && preview.meta?.rcapAcceptanceProjectRef === ACCEPTANCE);
    const staged = await deployment('stagedDeploymentId');
    requireCheck('staged_tuple', staged.target === 'production' && exactTuple(staged) && staged.meta?.rcapStagedProduction === 'true');
    const rollback = await deployment('rollbackDeploymentId');
    requireCheck('rollback_ready', rollback.target === 'production');
    for (const ref of [PRODUCTION, ACCEPTANCE]) {
      const p = await get('supabase', `/v1/projects/${ref}`);
      requireCheck(ref === PRODUCTION ? 'production_project_identity' : 'acceptance_project_identity',
        (p.ref ?? p.id) === ref && p.status === 'ACTIVE_HEALTHY');
    }
    const after = await controls();
    requireCheck('controls_unchanged', hash(before) === hash(after));
    evidence.controls = { before, after };
    evidence.passed = true;
  } catch {
    // No raw error, remote payload, token, URL, environment value or hostname escapes.
    evidence.failure = 'READ_ONLY_PREFLIGHT_REFUSED';
    evidence.failedOperation = evidence.lastOperation ?? 'VALIDATE_LOCAL_INPUTS';
    evidence.failedCase = evidence.checks.find(check => !check.passed)?.caseId ?? 'REMOTE_READ_OR_CONTROL_INVENTORY_REFUSED';
  }
  return evidence;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch { /* fail closed */ }
  const result = await inspectProductionReadiness({ manifest,
    vercelToken: process.env.VERCEL_TOKEN, supabaseToken: process.env.SUPABASE_ACCESS_TOKEN });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.passed ? 0 : 1;
}
