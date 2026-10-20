import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadCurrentCommercialArtifactApprovals } from './lib/current-commercial-artifact-approval.mjs';
import { bindCurrentCommercialArtifact } from './lib/current-commercial-artifact.mjs';

const route = 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const prefix = 'data/rcap-grade-a/legal-decisions/';
const decisionPath = `${prefix}OWNER_CURRENT_COMMERCIAL_ARTIFACT_APPROVAL_MS_NONCONVICTION_2026-10-20.json`;
const movePath = `${prefix}MS_NONCONVICTION_ARTIFACT_MOVE_2026-10-20.json`;
const dcMove = `${prefix}DC_ACTUAL_INNOCENCE_ARTIFACT_MOVE_2026-10-16.json`;
const cache = new Map();
const read = file => {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(file));
  return cache.get(file);
};
const load = (reader = read) => loadCurrentCommercialArtifactApprovals(process.cwd(), reader);
const failRead = code => { throw Object.assign(new Error('synthetic evidence refusal'), { code }); };
const without = file => name => name === file ? failRead('ENOENT') : read(name);
const baseline = load(without(movePath));
const current = load();
const next = JSON.parse(read(decisionPath));
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function onlyMsHeld(reader) {
  const result = load(reader);
  assert.equal(result.has(route), false);
  assert.deepEqual([...result], [...baseline].filter(([id]) => id !== route));
}
check('exact owner-approved full-es successor; unchanged English and court-only', () => {
  assert.equal(current.size, baseline.size);
  const actual = current.get(route);
  assert.equal(actual.recordId, 'OWNER-CURRENT-COMMERCIAL-ARTIFACT-APPROVAL-MS-NONCONVICTION-20261020');
  assert.equal(actual.approvedArtifacts.find(a => a.artifactId === 'full-es').sha256,
    'f80520fbb425435b19b1e5d97d3214c56d2c469fcc7c660035258d0d57926fcd');
  for (const id of ['full-en', 'court-only']) {
    const before = baseline.get(route).approvedArtifacts.find(a => a.artifactId === id);
    const after = actual.approvedArtifacts.find(a => a.artifactId === id);
    for (const key of ['path', 'sha256', 'pageCount', 'locale', 'variant']) assert.equal(after[key], before[key]);
  }
  assert.equal(actual.commercialAuthorityGranted, false);
  assert.equal(actual.productionAuthorized, false);
  assert.deepEqual([...current].filter(([id]) => id !== route), [...baseline].filter(([id]) => id !== route));
});
check('genuine missing move preserves historical baseline', () => {
  assert.equal(baseline.get(route).recordId, 'OWNER-CURRENT-COMMERCIAL-ARTIFACT-APPROVAL-20260920');
});
for (const code of ['EACCES', 'EIO']) check(`unreadable MS move ${code} holds only MS`, () => {
  onlyMsHeld(file => file === movePath ? failRead(code) : read(file));
});
const touched = new Set();
load(file => { touched.add(file); return read(file); });
// The baseline reads historical/global/DC bindings too. New successor custody
// failures must not remove their independent route approvals.
const priorReads = new Set();
load(file => { priorReads.add(file); return file === movePath ? failRead('ENOENT') : read(file); });
const successorReads = [...touched].filter(file => !priorReads.has(file) || file === movePath);
for (const file of successorReads) {
  check(`changed successor custody holds only MS: ${file}`, () => onlyMsHeld(name => name === file ? Buffer.from('changed evidence') : read(name)));
  if (file !== movePath) check(`missing successor custody holds only MS: ${file}`, () => onlyMsHeld(without(file)));
}
for (const flag of ['productionAuthorized', 'liveChargesAuthorized', 'commercialAuthorityGranted', 'publicationAuthorized', 'workerDeliveryAuthorized']) {
  check(`source pin refuses forged ${flag}`, () => onlyMsHeld(file => file === decisionPath
    ? Buffer.from(JSON.stringify({ ...next, [flag]: true })) : read(file)));
}
check('DC read refusal cannot skip the MS successor', () => {
  for (const code of ['EACCES', 'EIO']) {
    const result = load(file => file === dcMove ? failRead(code) : read(file));
    assert.deepEqual(result.get(route), current.get(route));
    assert.deepEqual([...result], [...current].filter(([id]) => id !== 'DC:dc_actual_innocence_expungement_16_803'));
  }
});
check('all eighteen historical approved artifacts and owner record remain exact', () => {
  const prior = next.supersedesArtifactDigestConditionOnly;
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha(read(prior.path)), prior.sha256);
  const old = JSON.parse(read(prior.path));
  assert.equal(old.approvedArtifacts.length, 18);
  for (const artifact of old.approvedArtifacts) assert.equal(sha(read(artifact.path)), artifact.sha256);
});
check('completeness consumer receives successor and holds damaged replacement', () => {
  const record = () => ({ routeId: route, packetCompleteness: { filingFormatArtifact: {
    producedBy: { renderer: 'adopted_build_host' }, sha256: 'unchanged-fixture'
  } } });
  const get = reader => bindCurrentCommercialArtifact(record(), process.cwd(), reader)
    .packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview;
  assert.equal(get(read).approval.recordId, next.decisionId);
  const pdf = next.approvedArtifacts.find(a => a.artifactId === 'full-es').path;
  assert.equal(get(file => file === pdf ? Buffer.from('changed output') : read(file)).state, 'pending_owner_review');
});
console.log(JSON.stringify({ passed, failed: 0, successorCustodyInputs: successorReads.length, historicalArtifacts: 18 }));
