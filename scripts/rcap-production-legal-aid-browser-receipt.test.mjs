import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyFreshLegalAidBrowserReceipt, verifyBrowserRecords } from './rcap-production-legal-aid-browser-receipt.mjs';
const candidate = JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'));
const authorization = JSON.parse(fs.readFileSync('data/rcap-production-legal-aid-migration-authorization.json'));
const runId = '99999999999', tools = 'a'.repeat(40), preview = candidate.hostedAcceptance.preview;
function records() {
  const identity = { passed: true, applicationSha: candidate.applicationSha, acceptanceProjectRef: 'hyflxnlhpmiqxvvcoiia', previewDeploymentId: preview.deploymentId, previewUrl: `https://${preview.hostname}` };
  const result = { 'legal-aid/browser.json': { ...identity, schemaVersion: 'rcap-hosted-legal-aid-browser/v1', cases: { actual: { passed: true } }, ...Object.fromEntries(['workerRun', 'migrationApplied', 'checkoutCreated', 'paymentCompleted', 'productionTouched', 'stripeTouched', 'secretsRecorded', 'protectedValueRecorded'].map(k => [k, false])) }, 'legal-aid/seed.json': { ...identity, schemaVersion: 'rcap-hosted-legal-aid-seed/v1', passwordsRecorded: false } };
  for (const mode of ['prerequisite','preservation','relationships']) result[`legal-aid/${mode}.json`] = { status: 'PASS', boundary: mode, native: { result: 'PASS' }, applicationSha: candidate.applicationSha, project: 'hyflxnlhpmiqxvvcoiia', deploymentId: preview.deploymentId, hostname: preview.hostname };
  return result;
}
function zip(object) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-browser-gate-test-'));
  try {
    const input = path.join(temporary, 'input.json'); fs.writeFileSync(input, JSON.stringify(object));
    return execFileSync('python3', ['-c', "import sys,json,io,zipfile\nb=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z:\n for n,v in json.load(open(sys.argv[1])).items(): z.writestr(n,json.dumps(v))\nsys.stdout.buffer.write(b.getvalue())", input], { stdio: ['ignore','pipe','pipe'], timeout: 30000 });
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
const stepNames = ['Legal Aid historical Applicant A prerequisite','Seed the synthetic MVLP Legal Aid training cohort','Run the hosted MVLP Legal Aid Clinic Mode browser proof','Legal Aid historical Applicant A preservation','Legal Aid historical Applicant A relationships'];
async function gate(mutate = () => {}) {
  const r = { policy: structuredClone(authorization), env: { GITHUB_TOKEN: 'fixture-secret', RCAP_TOOLS_SHA: tools, RCAP_LEGAL_AID_BROWSER_RUN_ID: runId }, records: records(), run: { id: runId, repository: { full_name: 'Roger-LegalEase/legalease-partner-dashboard-clean' }, status: 'completed', conclusion: 'success', head_sha: tools, path: '.github/workflows/rcap-f1-ephemeral-staging.yml', event: 'workflow_dispatch', created_at: '2030-01-01T00:00:00Z' }, jobs: { total_count: 1, jobs: [{ conclusion: 'success', steps: stepNames.map(name => ({name, conclusion: 'success'})) }] } };
  mutate(r); const bytes = zip(r.records); const artifact = { id: 9999, name: `rcap-hosted-legal_aid_browser-${runId}`, expired: false, workflow_run: { id: runId, head_sha: tools }, digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex') }; if(r.artifact)Object.assign(artifact,r.artifact);
  const calls = [];
  const fetch = async (url, options) => { calls.push({url,options}); assert.equal(options.method, 'GET');
    if(url.endsWith('/zip')) return { ok:true, status:200, arrayBuffer:async()=>r.corruptZip ? Buffer.from('corrupt') : bytes };
    return { ok: true, json: async () => url.includes('/jobs?') ? r.jobs : url.includes('/artifacts?') ? {total_count:1,artifacts:[artifact]} : r.run };
  };
  const result = await verifyFreshLegalAidBrowserReceipt({ env:r.env, candidate, authorization:r.policy, fetch });
  assert.ok(!JSON.stringify(result).includes('fixture-secret')); return {result,calls};
}
test('fresh native success binds exact run ZIP hash and Preview without secrets', async()=>{const {result,calls}=await gate();assert.equal(result.runId,runId);assert.equal(result.deploymentId,preview.deploymentId);assert.equal(calls.length,4);});
for (const [name, mutate] of [
 ['historical failed run',x=>x.env.RCAP_LEGAL_AID_BROWSER_RUN_ID='35112897060'],
 ['other historical failed run',x=>x.env.RCAP_LEGAL_AID_BROWSER_RUN_ID='35114496743'],
 ['absent run',x=>delete x.env.RCAP_LEGAL_AID_BROWSER_RUN_ID],
 ['legacy authorization',x=>x.policy.status='authorized_after_hosted_acceptance'],
 ['wrong tuple',x=>x.policy.releaseTuple.workerDigest='sha256:'+'0'.repeat(64)],
 ['wrong migrate artifact',x=>x.policy.hostedAcceptance.migration.artifactId='100'],
 ['failed workflow',x=>x.run.conclusion='failure'],
 ['unfinished workflow',x=>x.run.status='in_progress'],
 ['other repo',x=>x.run.repository.full_name='other/repo'],
 ['wrong tools commit',x=>x.run.head_sha='b'.repeat(40)],
 ['wrong workflow',x=>x.run.path='.github/workflows/other.yml'],
 ['wrong event',x=>x.run.event='pull_request'],
 ['old receipt',x=>x.run.created_at='2020-01-01T00:00:00Z'],
 ['missing step',x=>x.jobs.jobs[0].steps.pop()],
 ['skipped prerequisite',x=>x.jobs.jobs[0].steps[0].conclusion='skipped'],
 ['failed job',x=>x.jobs.jobs[0].conclusion='failure'],
 ['expired ZIP',x=>x.artifact={expired:true}],
 ['wrong artifact run',x=>x.artifact={workflow_run:{id:'1',head_sha:tools}}],
 ['wrong digest',x=>x.artifact={digest:'sha256:'+'0'.repeat(64)}],
 ['corrupt ZIP',x=>x.corruptZip=true],
 ['failed browser',x=>x.records['legal-aid/browser.json'].passed=false],
 ['empty browser cases',x=>x.records['legal-aid/browser.json'].cases={}],
 ['failed browser case',x=>x.records['legal-aid/browser.json'].cases.actual.passed=false],
 ['wrong application',x=>x.records['legal-aid/browser.json'].applicationSha=tools],
 ['wrong acceptance',x=>x.records['legal-aid/browser.json'].acceptanceProjectRef=candidate.productionProjectRef],
 ['wrong Preview',x=>x.records['legal-aid/browser.json'].previewDeploymentId='dpl_wrong'],
 ['wrong hostname',x=>x.records['legal-aid/browser.json'].previewUrl='https://wrong.example'],
 ['failed seed',x=>x.records['legal-aid/seed.json'].passed=false],
 ['seed different application',x=>x.records['legal-aid/seed.json'].applicationSha=tools],
 ['seed password leakage',x=>x.records['legal-aid/seed.json'].passwordsRecorded=true],
 ...['workerRun','migrationApplied','checkoutCreated','paymentCompleted','productionTouched','stripeTouched','secretsRecorded','protectedValueRecorded'].map(key=>[key,x=>x.records['legal-aid/browser.json'][key]=true]),
 ...['prerequisite','preservation','relationships'].flatMap(mode=>[
  [`${mode} failed`,x=>x.records[`legal-aid/${mode}.json`].status='FAIL'],
  [`${mode} wrong mode`,x=>x.records[`legal-aid/${mode}.json`].boundary='other'],
  [`${mode} wrong identity`,x=>x.records[`legal-aid/${mode}.json`].deploymentId='dpl_wrong'],
 ])
]) test(`refuses ${name}`,async()=>assert.rejects(()=>gate(mutate)));
test('empty state fresh receipt gate precedes SQL; complete path preserves no-op',()=>{const s=fs.readFileSync('scripts/rcap-production-legal-aid-migrate.mjs','utf8');assert.match(s,/if \(before\.empty && identityAuthorized\)/);assert.ok(s.indexOf('await verifyFreshLegalAidBrowserReceipt')<s.indexOf('await managementQuery(sql, "legal_aid_migration_applied")'));assert.match(s,/!before\.empty \|\| authorized/);});
test('old authorization preserved exactly under existing nested record',()=>{assert.equal(createHash('sha256').update(JSON.stringify(authorization.supersededRecord)).digest('hex'),'fa51325f62f1088e2f7c7df26c4623e9f593b1b7ea644a21190fb123c5b293bf');assert.equal(authorization.hostedAcceptance.browserRunId,null);assert.equal(authorization.dropAuthorized,false);});
