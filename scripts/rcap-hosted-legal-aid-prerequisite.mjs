#!/usr/bin/env node
// B-owned transport only. A's executable owns Applicant A assertions and SQL.
// Protected snapshots/PDF stay outside uploaded evidence. Storage GET never
// traverses the participant download endpoint and cannot record a delivery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { RESUME } from './rcap-clinic-resume-contract.mjs';
import { LEGAL_AID_FIXTURE } from './rcap-legal-aid/hosted-fixture.mjs';
const VERIFIER = 'scripts/legal-aid/verify-applicant-a-prerequisite.mjs';
export function relationshipQuery(fixture = LEGAL_AID_FIXTURE) {
  // Scalar subqueries deliberately refuse multiple rows; absent rows become
  // null and A's verifier refuses them. No newest-row selection is allowed.
  return `begin transaction read only;
with e as (select * from public.clinic_events where id='${fixture.eventId}' and public_slug='${fixture.eventSlug}'),
r as (select r.* from public.clinic_registrations r join e on r.event_id=e.id where r.participant_user_id='${RESUME.owner}'),
i as (select i.* from public.legal_aid_intakes i join r on i.registration_id=r.id and i.event_id=r.event_id and i.participant_user_id=r.participant_user_id),
t as (select t.* from public.legal_aid_document_tasks t join i on t.intake_id=i.id where t.unsigned_render_job_id='${RESUME.job}')
select jsonb_build_object('event',(select to_jsonb(e) from e),
'profile',(select to_jsonb(p) from public.legal_aid_policy_profiles p join e on p.id=e.policy_profile_id),
'registration',(select to_jsonb(r) from r),'intake',(select to_jsonb(i) from i),
 'task',(select to_jsonb(t) from t)) as evidence;
commit;`;
}
export function verifierOutput(args, run = spawnSync) {
  const r = run(process.execPath, [VERIFIER, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  assert.equal(r.status, 0, `Applicant A verifier failed (${r.status}); no phase success`);
  assert.ok(r.stdout?.trim(), 'missing verifier output');
  return r.stdout;
}
export function oneEvidence(rows) {
  assert.ok(Array.isArray(rows) && rows.length === 1 && rows[0].evidence && typeof rows[0].evidence === 'object', 'exactly one checkpoint evidence object required');
  return rows[0].evidence;
}
export async function runLegalAidBoundary(mode, { env = process.env, fetchImpl = fetch } = {}) {
  assert.ok(['prerequisite','preservation','relationships'].includes(mode));
  assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF, RESUME.project);
  assert.match(env.HOSTED_APPLICATION_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.match(env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? '', /^dpl_[A-Za-z0-9]+$/);
  assert.ok(env.SUPABASE_ACCESS_TOKEN);
  const privateDir = path.join(env.RUNNER_TEMP || '/tmp', `rcap-legal-aid-${env.GITHUB_RUN_ID || 'local'}`);
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  const beforePath = path.join(privateDir, 'BEFORE.json'), pdfPath = path.join(privateDir, 'EXISTING.pdf');
  const context = { applicationSha: env.HOSTED_APPLICATION_SHA, project: RESUME.project,
    deploymentId: env.HOSTED_PREVIEW_DEPLOYMENT_ID, hostname: env.HOSTED_PREVIEW_HOSTNAME };
  const contextPath = path.join(privateDir, 'context.json');
  const api = async (suffix, options = {}) => {
    const res = await fetchImpl(`https://api.supabase.com/v1/projects/${RESUME.project}${suffix}`, {
      ...options, headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, redirect: 'error',
    });
    assert.ok(res.ok, `read-only management request refused: HTTP ${res.status}`);
    return res.json();
  };
  const collect = async sql => {
    assert.match(sql.toLowerCase(), /begin\s+(?:transaction\s+)?read only/);
    return oneEvidence(await api('/database/query', { method: 'POST', body: JSON.stringify({ query: sql }) }));
  };
  let args;
  if (mode === 'prerequisite') {
    assert.ok(!fs.existsSync(beforePath), 'existing BEFORE evidence must not be overwritten');
    const sql = verifierOutput(['--sql']);
    const before = await collect(sql);
    assert.equal(before.job?.id, RESUME.job);
    assert.equal(before.job?.sponsored_consumer_auth_user_id, RESUME.owner);
    assert.equal(before.job?.output_sha256, RESUME.hash);
    assert.equal(typeof before.job.output_storage_path, 'string');
    fs.writeFileSync(beforePath, JSON.stringify(before), { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(contextPath, JSON.stringify(context), { mode: 0o600, flag: 'wx' });
    const keys = await api('/api-keys?reveal=true');
    const key = keys.find(k => k.name === 'service_role')?.api_key;
    assert.ok(key, 'existing service-role storage read unavailable');
    const objectPath = before.job.output_storage_path.split('/').map(encodeURIComponent).join('/');
    const res = await fetchImpl(`https://${RESUME.project}.supabase.co/storage/v1/object/rcap-packet-artifacts-private/${objectPath}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key }, redirect: 'error',
    });
    assert.ok(res.ok, `historical storage GET refused: HTTP ${res.status}`);
    fs.writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()), { mode: 0o600, flag: 'wx' });
    args = [beforePath, pdfPath];
  } else {
    assert.deepEqual(JSON.parse(fs.readFileSync(contextPath, 'utf8')), context, 'prerequisite source/Preview context changed');
    if (mode === 'preservation') {
      const after = path.join(privateDir, 'AFTER.json');
      fs.writeFileSync(after, JSON.stringify(await collect(verifierOutput(['--sql']))), { mode: 0o600, flag: 'wx' });
      args = [beforePath, pdfPath, after];
    } else {
      const relationships = path.join(privateDir, 'RELATIONSHIPS.json');
      fs.writeFileSync(relationships, JSON.stringify(await collect(relationshipQuery())), { mode: 0o600, flag: 'wx' });
      args = ['--relationships', relationships];
    }
  }
  const native = JSON.parse(verifierOutput(args));
  assert.equal(native.result, 'PASS', 'A verifier did not emit PASS');
  const out = path.resolve('hosted-acceptance-evidence/legal-aid');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `${mode}.json`), JSON.stringify({ status: 'PASS', boundary: mode, ...context, native }, null, 2));
  console.log(`Legal Aid ${mode}: PASS; historical funding/packet read-only`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLegalAidBoundary(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
