#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectProductionReadiness } from './rcap-production-readonly-preflight.mjs';

const manifest = { applicationSha: 'a'.repeat(40), workerSourceSha: 'b'.repeat(40),
  workerDigest: `sha256:${'c'.repeat(64)}`, previewDeploymentId: 'dpl_preview',
  stagedDeploymentId: 'dpl_staged', rollbackDeploymentId: 'dpl_rollback',
  vercelProjectId: 'prj_cdgwGzFqIHgEUlzEburSLaZETdQV', vercelTeamId: 'team_synthetic',
  productionProjectRef: 'wwtwtsmywnckfkdaqqeg', acceptanceProjectRef: 'hyflxnlhpmiqxvvcoiia',
  ignoredSecret: 'NEVER_EMIT_ME' };
const secret = 'NEVER_EMIT_ME';
const meta = { rcapApplicationSha: manifest.applicationSha, rcapWorkerSourceSha: manifest.workerSourceSha,
  rcapWorkerDigest: manifest.workerDigest, rcapAcceptanceProjectRef: manifest.acceptanceProjectRef,
  rcapStagedProduction: 'true' };

async function run(change = () => {}, input = manifest) {
  const requests = []; let envReads = 0;
  const result = await inspectProductionReadiness({ manifest: input, vercelToken: secret, supabaseToken: secret,
    fetchImpl: async (raw, options) => {
      const url = new URL(raw); requests.push(url);
      assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error');
      assert(options.signal instanceof AbortSignal);
      assert(!raw.includes(secret)); assert(!raw.includes('/database/query'));
      let body;
      if (url.pathname.endsWith('/env')) {
        assert.equal(url.searchParams.get('decrypt'), 'false'); envReads++;
        body = { envs: [{ key: 'SOME_SECRET', value: secret, target: ['production'], updatedAt: 1 }] };
      } else if (url.pathname.endsWith('/domains')) body = { domains: [{ name: 'private.example.test' }] };
      else if (url.pathname.startsWith('/v4/aliases/')) body = { deploymentId: manifest.rollbackDeploymentId };
      else if (url.pathname.startsWith('/v13/deployments/')) {
        const id = url.pathname.split('/').at(-1);
        body = { id, projectId: manifest.vercelProjectId, readyState: 'READY', gitSource: {sha: manifest.applicationSha},
          target: id === manifest.previewDeploymentId ? 'preview' : 'production', meta: { ...meta } };
      } else if (url.hostname === 'api.supabase.com') body = { ref: url.pathname.split('/').at(-1), status: 'ACTIVE_HEALTHY' };
      else body = { id: manifest.vercelProjectId, accountId: manifest.vercelTeamId };
      const response = { status: 200, body }; change({ url, response, envReads });
      return { status: response.status, json: async () => response.body };
    } });
  const serialized = JSON.stringify(result);
  assert(!serialized.includes(secret)); assert(!serialized.includes('private.example.test'));
  assert.equal(result.deploymentCreated, false); assert.equal(result.sqlExecuted, false);
  assert.equal(result.releaseAuthorityGranted, false); assert.equal(result.hostedContractAccepted, false);
  return { result, requests };
}
assert.equal((await run()).result.passed, true);
const mutations = [
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.body.gitSource.sha = 'd'.repeat(40); },
  ({url,response}) => { if(url.pathname.endsWith('dpl_preview')) delete response.body.gitSource; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.status = 404; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.body.meta.rcapWorkerDigest = `sha256:${'d'.repeat(64)}`; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.body.meta.rcapApplicationSha = 'd'.repeat(40); },
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.body.meta.rcapWorkerSourceSha = 'd'.repeat(40); },
  ({url,response}) => { if(url.pathname.endsWith('dpl_staged')) response.body.target = 'preview'; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_preview')) response.body.target = 'production'; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_preview')) response.body.meta.rcapAcceptanceProjectRef = manifest.productionProjectRef; },
  ({url,response}) => { if(url.pathname.endsWith('dpl_rollback')) response.body.readyState = 'ERROR'; },
  ({url,response}) => { if(url.pathname.startsWith('/v4/aliases/')) response.body.deploymentId = manifest.stagedDeploymentId; },
  ({url,response}) => { if(url.pathname.endsWith('/domains')) response.body.pagination = {next:123}; },
  ({url,response}) => { if(url.pathname.endsWith('/domains')) response.body.domains = []; },
  ({url,response}) => { if(url.pathname.endsWith('/env')) response.body.pagination = {next:123}; },
  ({url,response,envReads}) => { if(url.pathname.endsWith('/env') && envReads === 2) response.body.envs[0].updatedAt = 2; },
  ({url,response}) => { if(url.hostname === 'api.supabase.com') response.body.ref = 'wrong'; },
  ({url,response}) => { if(url.hostname === 'api.supabase.com') response.body.status = 'INACTIVE'; },
  ({url,response}) => { if(url.pathname.endsWith(manifest.vercelProjectId)) response.body.accountId = 'team_wrong'; },
  () => { throw new Error(secret); }
];
for (const mutation of mutations) {
  const {result} = await run(mutation); assert.equal(result.passed, false);
  assert(result.failedOperation); assert(result.failedCase);
}
for (const field of Object.keys(manifest).filter(x => x !== 'ignoredSecret')) {
  const malformed = {...manifest, [field]: 'invalid'};
  const r = await run(() => {}, malformed); assert.equal(r.result.passed, false); assert.equal(r.requests.length, 0);
}
const missing = await inspectProductionReadiness({manifest, fetchImpl: () => {throw Error('must not request');}});
assert.equal(missing.passed, false); assert.equal(missing.requestCount, 0);
const source = fs.readFileSync(new URL('./rcap-production-readonly-preflight.mjs', import.meta.url), 'utf8');
assert(!source.includes('child_process')); assert(!source.includes('method: \'POST\''));
assert(!source.includes('method: \'PATCH\'')); assert(!source.includes('method: \'DELETE\''));
console.log(`PASS read-only preflight: positive control, ${mutations.length} remote defects, 10 malformed identities, absent credentials, secret redaction and no mutation capability.`);
