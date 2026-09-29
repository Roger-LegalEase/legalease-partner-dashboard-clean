import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const REPO = 'Roger-LegalEase/legalease-partner-dashboard-clean';
const PROJECT = 'hyflxnlhpmiqxvvcoiia';
const DIGEST = 'fad3384b88249d8cd2411089867b2971c97f66b258269e5958f7a12c29be45db';
const SHA = bytes => createHash('sha256').update(bytes).digest('hex');
const STEPS = ['Legal Aid historical Applicant A prerequisite', 'Seed the synthetic MVLP Legal Aid training cohort', 'Run the hosted MVLP Legal Aid Clinic Mode browser proof', 'Legal Aid historical Applicant A preservation', 'Legal Aid historical Applicant A relationships'];
export function extractReceiptZip(bytes, files) {
  assert.ok(bytes.length < 64 * 1024 * 1024, 'receipt ZIP too large');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-native-receipt-'));
  try {
  const zipPath = path.join(temporary, 'artifact.zip'); fs.writeFileSync(zipPath, bytes, { mode: 0o600 });
  return JSON.parse(execFileSync('python3', ['-c', `import sys,zipfile,json
z=zipfile.ZipFile(sys.argv[2])
files=json.loads(sys.argv[1]); result={}
for name in files:
 matches=[i for i in z.infolist() if i.filename==name]
 assert len(matches)==1 and matches[0].file_size<8000000, 'missing, duplicate, or oversized receipt'
 result[name]=json.loads(z.read(matches[0]))
print(json.dumps(result))`, JSON.stringify(files), zipPath], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 30000, maxBuffer: 40 * 1024 * 1024 }));
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
export function verifyBrowserRecords(records, candidate) {
  const preview = candidate.hostedAcceptance.preview;
  const browser = records['legal-aid/browser.json'], seed = records['legal-aid/seed.json'];
  for (const [record, schema] of [[browser, 'rcap-hosted-legal-aid-browser/v1'], [seed, 'rcap-hosted-legal-aid-seed/v1']]) {
    assert.equal(record?.schemaVersion, schema); assert.equal(record.passed, true);
    assert.equal(record.applicationSha, candidate.applicationSha); assert.equal(record.acceptanceProjectRef, PROJECT);
    assert.equal(record.previewDeploymentId, preview.deploymentId); assert.equal(record.previewUrl, `https://${preview.hostname}`);
  }
  assert.equal(seed.passwordsRecorded, false);
  for (const key of ['workerRun', 'migrationApplied', 'checkoutCreated', 'paymentCompleted', 'productionTouched', 'stripeTouched', 'secretsRecorded', 'protectedValueRecorded']) assert.equal(browser[key], false, key);
  assert.ok(Object.keys(browser.cases ?? {}).length > 0 && Object.values(browser.cases).every(row => row.passed === true), 'browser cases must all pass');
  for (const mode of ['prerequisite', 'preservation', 'relationships']) {
    const record = records[`legal-aid/${mode}.json`];
    assert.equal(record?.status, 'PASS'); assert.equal(record.boundary, mode); assert.equal(record.native?.result, 'PASS');
    assert.equal(record.applicationSha, candidate.applicationSha); assert.equal(record.project, PROJECT);
    assert.equal(record.deploymentId, preview.deploymentId); assert.equal(record.hostname, preview.hostname);
  }
}
export async function verifyFreshLegalAidBrowserReceipt({ env = process.env, rootDir = process.cwd(), fetch = globalThis.fetch, authorization, candidate }) {
  assert.equal(authorization.status, 'conditional_on_fresh_hosted_browser');
  assert.deepEqual(authorization.releaseTuple, Object.fromEntries(['applicationSha', 'workerSourceSha', 'workerDigest', 'workerInputFingerprint', 'productionProjectRef'].map(key => [key, candidate[key]])));
  const migration = authorization.hostedAcceptance.migration;
  assert.equal(migration.runId, '35114154196'); assert.equal(migration.artifactId, '10453896397'); assert.equal(migration.artifactZipSha256, `sha256:${DIGEST}`);
  const historicalBytes = fs.readFileSync(path.join(rootDir, 'scripts/fixtures/production-legal-aid-browser-gate/10453896397.zip'));
  assert.equal(SHA(historicalBytes), DIGEST);
  const historical = extractReceiptZip(historicalBytes, ['legal-aid-migrate.json'])['legal-aid-migrate.json'];
  assert.equal(historical.passed, true); assert.equal(historical.acceptanceProjectRef, PROJECT); assert.equal(historical.productionTouched, false); assert.equal(historical.readbackAfter.complete, true); assert.deepEqual(historical.exactMigration, authorization.migration);
  const runId = String(env.RCAP_LEGAL_AID_BROWSER_RUN_ID ?? '');
  assert.match(runId, /^[1-9][0-9]{5,}$/); assert.ok(!['35112897060', '35114496743'].includes(runId), 'historical failures are not receipts');
  assert.match(env.RCAP_TOOLS_SHA ?? '', /^[a-f0-9]{40}$/); assert.ok(env.GITHUB_TOKEN, 'GitHub receipt token required');
  const request = async suffix => {
    const res = await fetch(`https://api.github.com/repos/${REPO}${suffix}`, { method: 'GET', headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.ok(res.ok, 'GitHub native receipt request failed'); return res.json();
  };
  const run = await request(`/actions/runs/${runId}`);
  assert.equal(String(run.id), runId); assert.equal(run.repository?.full_name, REPO); assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success');
  assert.equal(run.head_sha, env.RCAP_TOOLS_SHA); assert.equal(run.path, '.github/workflows/rcap-f1-ephemeral-staging.yml'); assert.equal(run.event, 'workflow_dispatch');
  assert.ok(Date.parse(run.created_at) >= Date.parse(authorization.recordedAt), 'browser receipt predates conditional authorization');
  const jobs = await request(`/actions/runs/${runId}/jobs?per_page=100`);
  assert.ok(jobs.total_count <= 100 && Array.isArray(jobs.jobs), 'complete jobs inventory required');
  for (const name of STEPS) {
    const matching = jobs.jobs.flatMap(job => (job.steps ?? []).filter(step => step.name === name).map(step => ({ job, step })));
    assert.equal(matching.length, 1, `one native step required: ${name}`); assert.equal(matching[0].job.conclusion, 'success'); assert.equal(matching[0].step.conclusion, 'success');
  }
  const inventory = await request(`/actions/runs/${runId}/artifacts?per_page=100`);
  assert.ok(inventory.total_count <= 100 && Array.isArray(inventory.artifacts), 'complete artifact inventory required');
  const artifacts = inventory.artifacts.filter(a => a.name === `rcap-hosted-legal_aid_browser-${runId}`);
  assert.equal(artifacts.length, 1); const artifact = artifacts[0]; assert.equal(artifact.expired, false); assert.equal(String(artifact.workflow_run?.id), runId); assert.equal(artifact.workflow_run.head_sha, env.RCAP_TOOLS_SHA); assert.match(artifact.digest ?? '', /^sha256:[a-f0-9]{64}$/);
  let response = await fetch(`https://api.github.com/repos/${REPO}/actions/artifacts/${artifact.id}/zip`, { method: 'GET', headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}` }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  if (response.status === 302) {
    const url = new URL(response.headers.get('location'));
    assert.ok(url.protocol === 'https:' && /(?:\.blob\.core\.windows\.net|\.githubusercontent\.com|\.actions\.githubusercontent\.com)$/.test(url.hostname), 'unexpected artifact download host');
    response = await fetch(url.href, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30000) });
  }
  assert.ok(response.ok, 'native artifact ZIP unavailable');
  const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(`sha256:${SHA(bytes)}`, artifact.digest);
  const files = ['browser', 'seed', 'prerequisite', 'preservation', 'relationships'].map(name => `legal-aid/${name}.json`);
  verifyBrowserRecords(extractReceiptZip(bytes, files), candidate);
  return { runId, artifactId: String(artifact.id), artifactZipSha256: artifact.digest, toolsSha: run.head_sha, applicationSha: candidate.applicationSha, acceptanceProjectRef: PROJECT, deploymentId: candidate.hostedAcceptance.preview.deploymentId, hostname: candidate.hostedAcceptance.preview.hostname, migrationRunId: migration.runId, migrationArtifactId: migration.artifactId, migrationArtifactZipSha256: migration.artifactZipSha256, verifiedAt: new Date().toISOString() };
}
