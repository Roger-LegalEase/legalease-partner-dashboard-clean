import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPrivacyPreview } from './rcap-hosted-participant-privacy.mjs';
import { expectedHostedReturnOrigin, HOSTED_VERCEL_TEAM_ID, HOSTED_VERCEL_PROJECT_ID } from './rcap-hosted-acceptance-vercel-identity.mjs';
const sha = 'a'.repeat(40);
const origin = expectedHostedReturnOrigin(sha);
const env = { HOSTED_APPLICATION_SHA: sha, HOSTED_WORKER_DIGEST: `sha256:${'b'.repeat(64)}`, ACCEPTANCE_SUPABASE_PROJECT_REF: 'hyflxnlhpmiqxvvcoiia', HOSTED_PREVIEW_DEPLOYMENT_ID: 'dpl_Test', HOSTED_PREVIEW_HOSTNAME: new URL(origin).hostname, HOSTED_PRIVACY_WRITE_AUTHORIZATION: `privacy:${sha}:dpl_Test`, VERCEL_TOKEN: 'synthetic', SUPABASE_ACCESS_TOKEN: 'synthetic', VERCEL_AUTOMATION_BYPASS_SECRET: 'synthetic' };
function transport(change = () => {}) {
  return async (url, options) => {
    const u = new URL(url);
    assert.equal(options.method ?? 'GET', 'GET');
    assert.equal(u.searchParams.get('teamId'), HOSTED_VERCEL_TEAM_ID);
    assert.notEqual(u.pathname, '/v2/teams');
    let body = u.pathname.startsWith('/v9/projects/') ? { id: HOSTED_VERCEL_PROJECT_ID, name: 'legalease-partner-dashboard-clean', accountId: HOSTED_VERCEL_TEAM_ID } : u.pathname.endsWith('/aliases') ? { aliases: [] } : { id: 'dpl_Test', projectId: HOSTED_VERCEL_PROJECT_ID, teamId: HOSTED_VERCEL_TEAM_ID, target: null, readyState: 'READY', meta: { rcapApplicationSha: sha, rcapAcceptanceProjectRef: env.ACCEPTANCE_SUPABASE_PROJECT_REF, rcapRouteState: 'staging_scoped', rcapReturnOrigin: origin } };
    change(body, u);
    return Response.json(body);
  };
}
test('scoped PAT reaches only pinned project and Preview reads, without team enumeration', async () => {
  assert.equal(await verifyPrivacyPreview({ env, fetchImpl: transport() }), origin);
});
for (const [name, mutate] of [
  ['production target', d => { if (d.meta) d.target = 'production'; }],
  ['wrong candidate', d => { if (d.meta) d.meta.rcapApplicationSha = 'c'.repeat(40); }],
  ['wrong project', d => { if (d.meta) d.projectId = 'prj_other'; }],
  ['wrong team', d => { if (d.meta) d.teamId = 'team_other'; }],
  ['missing aliases', d => { if (d.aliases) delete d.aliases; }],
  ['production alias', d => { if (d.aliases) d.aliases.push({ target: 'production' }); }],
  ['wrong staging database', d => { if (d.meta) d.meta.rcapAcceptanceProjectRef = 'other'; }],
  ['mutable alias', (d,u) => { if (u.pathname.includes(new URL(origin).hostname)) d.id = 'dpl_Other'; }],
  ['unready deployment', d => { if (d.meta) d.readyState = 'BUILDING'; }]
]) test(`refuses ${name} before any application mutation`, async () => {
  await assert.rejects(verifyPrivacyPreview({ env, fetchImpl: transport(mutate) }));
});
test('refuses missing write authorization without network access', async () => {
  await assert.rejects(verifyPrivacyPreview({ env: { ...env, HOSTED_PRIVACY_WRITE_AUTHORIZATION: '' }, fetchImpl: () => { throw Error('network forbidden'); } }));
});
