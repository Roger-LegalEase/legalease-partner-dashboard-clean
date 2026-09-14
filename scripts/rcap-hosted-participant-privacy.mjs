#!/usr/bin/env node
// Write-bearing acceptance runner. Never called by read-only preflight or hosted_full.
// Requires separately approved synthetic fixture accounts; creates no deployment/migration.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { verifyReleaseCandidateBinding } from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import { runPrivacyJourneys } from './rcap-participant-privacy-journeys.mjs';
import { prepareHostedAcceptanceEvidenceLayout } from './rcap-hosted-acceptance-evidence-layout.mjs';
import { expectedHostedReturnOrigin, resolveHostedVercelIdentity, hostedVercelScopedUrl } from './rcap-hosted-acceptance-vercel-identity.mjs';

export async function verifyPrivacyPreview({ env, fetchImpl = fetch }) {
  const sha = env.HOSTED_APPLICATION_SHA;
  assert.match(sha ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.HOSTED_WORKER_DIGEST ?? '', /^sha256:[a-f0-9]{64}$/);
  assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF, 'hyflxnlhpmiqxvvcoiia');
  assert.equal(env.HOSTED_PRIVACY_WRITE_AUTHORIZATION, `privacy:${sha}:${env.HOSTED_PREVIEW_DEPLOYMENT_ID}`);
  const origin = expectedHostedReturnOrigin(sha);
  assert.equal(env.HOSTED_PREVIEW_HOSTNAME, new URL(origin).hostname);
  assert.match(env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? '', /^dpl_[a-zA-Z0-9]+$/);
  assert.ok(env.VERCEL_AUTOMATION_BYPASS_SECRET && env.SUPABASE_ACCESS_TOKEN);
  const identity = await resolveHostedVercelIdentity({ token: env.VERCEL_TOKEN, fetchImpl });
  const get = async p => {
    const r = await fetchImpl(hostedVercelScopedUrl(p, identity), { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    assert.equal(r.ok, true, 'Vercel read must succeed'); return r.json();
  };
  const [d, alias, aliases] = await Promise.all([
    get(`/v13/deployments/${env.HOSTED_PREVIEW_DEPLOYMENT_ID}`),
    get(`/v13/deployments/${new URL(origin).hostname}`),
    get(`/v2/deployments/${env.HOSTED_PREVIEW_DEPLOYMENT_ID}/aliases`)
  ]);
  assert.equal(d.id ?? d.uid, env.HOSTED_PREVIEW_DEPLOYMENT_ID);
  assert.equal(alias.id ?? alias.uid, env.HOSTED_PREVIEW_DEPLOYMENT_ID);
  assert.equal(d.projectId, identity.projectId);
  assert.equal(d.teamId ?? d.ownerId, identity.teamId);
  assert.ok(d.target === null || d.target === 'preview');
  assert.equal(d.readyState ?? d.state, 'READY');
  assert.equal(d.meta?.rcapApplicationSha, sha);
  assert.equal(d.meta?.rcapAcceptanceProjectRef, env.ACCEPTANCE_SUPABASE_PROJECT_REF);
  assert.equal(d.meta?.rcapRouteState, 'staging_scoped');
  assert.equal(d.meta?.rcapReturnOrigin, origin);
  assert.ok(Array.isArray(aliases.aliases), 'alias readback required');
  assert.equal(aliases.aliases.some(a => a.target === 'production' || a.deployment?.target === 'production'), false);
  return origin;
}

export async function main(env = process.env) {
  const evidence = { schemaVersion: 'rcap-hosted-participant-privacy-execution/v1', candidateSha: env.HOSTED_APPLICATION_SHA, workerDigest: env.HOSTED_WORKER_DIGEST, projectRef: env.ACCEPTANCE_SUPABASE_PROJECT_REF, deploymentId: env.HOSTED_PREVIEW_DEPLOYMENT_ID, cases: [], status: 'FAILED', runtimeAccepted: false, independentReview: null };
  const { root } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });
  try {
    const binding = JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json', 'utf8'));
    assert.equal(binding.applicationSha, env.HOSTED_APPLICATION_SHA);
    assert.equal(binding.workerDigest, env.HOSTED_WORKER_DIGEST);
    assert.equal(verifyReleaseCandidateBinding(process.cwd(), binding).current, true, 'existing native publication and candidate equivalence gates must pass');
    const origin = await verifyPrivacyPreview({ env });
    const bytes = fs.readFileSync(env.HOSTED_PRIVACY_FIXTURE_PATH);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), env.HOSTED_PRIVACY_FIXTURE_SHA256, 'approved fixture bytes required');
    const fixture = JSON.parse(bytes);
    assert.equal(fixture.syntheticOnly, true);
    assert.equal(fixture.candidateSha, env.HOSTED_APPLICATION_SHA);
    assert.equal(fixture.projectRef, env.ACCEPTANCE_SUPABASE_PROJECT_REF);
    const actors = [fixture.owner, fixture.peer, fixture.otherTenant];
    for (const id of [...actors.map(a => a.id), fixture.matterId, fixture.remainingMatterId]) assert.match(id ?? '', /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
    for (const a of actors) assert.ok(a.cookie && a.password && a.tenant, 'synthetic authenticated fixture credentials and tenant required');
    evidence.fixtureSha256 = env.HOSTED_PRIVACY_FIXTURE_SHA256;
    const result = await runPrivacyJourneys({
      fixture,
      request: async (actor, endpoint, body, options) => {
        assert.ok(['export', 'matter', 'account', 'reauth'].includes(endpoint));
        const r = await fetch(`${origin}/api/expungement-ai/privacy/${endpoint}`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
          headers: { 'content-type': 'application/json', origin: options?.origin ?? origin, 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET, ...(actor ? { cookie: actor.cookie } : {}) },
          body: JSON.stringify(body)
        });
        return { status: r.status, body: await r.json(), headers: r.headers };
      },
      observe: async () => {
        // Fixed SELECT, validated UUIDs, read-only transaction; never caller-provided SQL.
        const ids = actors.map(a => `'${a.id}'`).join(',');
        const query = `begin read only; select 'matter' as kind,id,user_id from public.consumer_briefcase_items where user_id in (${ids}) union all select 'auth' as kind,id,id as user_id from auth.users where id in (${ids}) order by kind,id; commit;`;
        const r = await fetch(`https://api.supabase.com/v1/projects/${env.ACCEPTANCE_SUPABASE_PROJECT_REF}/database/query`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
        assert.equal(r.ok, true, 'independent database postcondition read required');
        const rows = await r.json(); assert.ok(Array.isArray(rows));
        assert.ok(rows.every(r => ['matter', 'auth'].includes(r.kind) && actors.some(a => a.id === r.user_id)), 'only scoped observation rows allowed');
        return {
          ...Object.fromEntries(actors.map((a, i) => [['ownerMatters', 'peerMatters', 'otherTenantMatters'][i], rows.filter(r => r.kind === 'matter' && r.user_id === a.id).map(r => r.id).sort()])),
          authUserIds: rows.filter(r => r.kind === 'auth').map(r => r.id).sort()
        };
      },
      record: row => evidence.cases.push(row)
    });
    evidence.status = 'COMPLETED'; evidence.journeySchema = result.schemaVersion;
  } catch {
    // Assertion messages may include actual API bodies/credentials. Save only fixed diagnostics.
    evidence.failure = 'Boundary, request, or postcondition failed; inspect the last recorded case in the protected run.';
    process.exitCode = 1;
  } finally {
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'hosted-participant-privacy.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
