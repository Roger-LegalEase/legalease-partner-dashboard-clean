import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {assessDeReviewedGuidance} from './de-reviewed-guidance.mjs';
import {DE_DIRECTORY, DE_FAMILY, DE_ROUTE, DE_DECISION} from './de-guidance-binding.mjs';

// RV-11 remains the extracted return; its author's supplement supplies explicit
// v2 attestations without fabricating a second independent review.
const root = process.cwd();
const VF02_REVIEW = 'data/rcap-grade-a/packet-factory-24h/vf02/rows-vf02-20261020-reverify-de-mandatory-1b4dfeaa1.json';
const VF02_SUPPLEMENT = 'data/rcap-grade-a/packet-factory-24h/vf02-v2-supplements/rows-vf02-20261020-reverify-de-mandatory-1b4dfeaa1.v2.json';
const read = relative => fs.readFileSync(relative);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const originalBytes = read(VF02_REVIEW), supplementBytes = read(VF02_SUPPLEMENT);
const original = JSON.parse(originalBytes), supplement = JSON.parse(supplementBytes);
const row = original.rows.find(item => item.itemId === DE_FAMILY);
const returned = {familyId: DE_FAMILY, verdict: row.verdict, lane: row.lane,
  verifiedAtBase: row.verifiedAtBase, isIndependentVerification: true,
  evidencePath: VF02_REVIEW, evidenceSha256: hash(originalBytes)};
const currentFamily = {familyId: DE_FAMILY, directory: DE_DIRECTORY, routeKeys: [DE_ROUTE]};
const history = new Map();
const readHistorical = (commit, relative) => {
  const key = `${commit}:${relative}`;
  if (!history.has(key)) history.set(key, execFileSync('git', ['show', key], {maxBuffer: 1 << 24}));
  return history.get(key);
};
const unchangedFiles = ['fixtures/canonical.pdf', 'fixtures/boundary.pdf', 'source-receipt.json',
  'product-wiring.json', 'participant-instructions.md', 'production-field-map.json',
  'reports/actual-writes.json', 'reports/blanks-left-for-the-participant.json', 'reports/rendered-artifacts.json']
  .map(relative => `${DE_DIRECTORY}/${relative}`);
const originalHashes = Object.fromEntries(unchangedFiles.map(relative => [relative, hash(read(relative))]));
const options = () => ({currentFamily, readHistorical});
const accepted = assessDeReviewedGuidance(root, returned, options());
assert.equal(accepted.eligible, true, accepted.reason);
assert.equal(accepted.terminalTreatment, 'GUIDANCE_READY');
assert.equal(accepted.reviewPath, VF02_REVIEW);
assert.equal(accepted.reviewSha256, hash(originalBytes));
assert.equal(accepted.supplementPath, VF02_SUPPLEMENT);
assert.equal(accepted.supplementSha256, hash(supplementBytes));
assert.equal(accepted.outputs.length, 2);
assert.equal(accepted.outputs.reduce((sum, output) => sum + output.pageCount, 0), 8);
assert.equal(accepted.sourceChecks.length, 9);
const refreshed = accepted.sourceChecks.filter(source => !source.matched);
assert.equal(refreshed.length, 2);
assert.ok(refreshed.every(source => source.scopeUnchanged));
assert.ok(refreshed.some(source => source.routeKey === DE_ROUTE && /^[a-f0-9]{64}$/.test(source.routeSha256)));
for (const key of ['reviewAuthoredByIntegrator', 'packetBytesChanged', 'runtimeInstalled',
  'filingPermitted', 'paymentEligible', 'sponsorshipEligible']) assert.equal(accepted[key], false);

const rejections = [];
function reject(name, changes = {}, override = {}) {
  const result = assessDeReviewedGuidance(root, {...returned, ...changes}, {...options(), ...override});
  assert.equal(result?.eligible, false, `${name}: ${JSON.stringify(result)}`);
  rejections.push({name, reason: result.reason});
}
function rejectSupplement(name, mutate) {
  const doc = structuredClone(supplement); mutate(doc, doc.rows[0]);
  reject(name, {}, {readBytes: relative => relative === VF02_SUPPLEMENT ? Buffer.from(JSON.stringify(doc)) : read(relative)});
}
for (const [name, mutate] of [
  ['self-built', doc => {doc.builtAnything = true;}],
  ['missing no-build attestation', doc => {delete doc.builtAnything;}],
  ['repairing reviewer', doc => {doc.repairsMade = 1;}],
  ['missing session', doc => {delete doc.sessionIdentity;}],
  ['unresolved attestation', doc => {doc.attestations.notStated.push('builtAnything');}],
  ['wrong original path', doc => {doc.supplements.path = 'other.json';}],
  ['wrong original digest', doc => {doc.supplements.sha256 = '0'.repeat(64);}],
  ['wrong original commit', doc => {doc.supplements.commit = '0'.repeat(40);}],
  ['wrong actual review head', doc => {doc.actualHeadAtReview = '0'.repeat(40);}],
  ['duplicate family', doc => {doc.rows.push(structuredClone(doc.rows[0]));}],
  ['changed original verdict', (_doc, item) => {item.verdict = 'FAIL_REPAIR_REQUIRED';}],
  ['changed original source', (_doc, item) => {item.sourceBindings[0].sha256 = '0'.repeat(64);}],
  ['missing source', (_doc, item) => {item.sourceBindings.pop();}],
  ['unmeasured service', (_doc, item) => {item.proofObligations.SERVICE.measured = false;}],
  ['changed original obligation', (_doc, item) => {item.proofObligations.SERVICE.detail += 'changed';}],
  ['nonzero counter', (_doc, item) => {item.nineCounters.visualDefects = 1;}],
  ['wrong route', (_doc, item) => {item.routeKeys = ['other'];}],
  ['wrong family directory', (_doc, item) => {item.familyDirectory = 'other';}],
  ['self-verified row', (_doc, item) => {item.selfVerified = true;}],
  ['wrong raster run', (_doc, item) => {item.rasterAcceptance.runId = 'other';}],
  ['wrong raster pages', (_doc, item) => {item.rasterAcceptance.pages = 6;}]
]) rejectSupplement(name, mutate);
reject('wrong extracted digest', {evidenceSha256: '0'.repeat(64)});
reject('wrong extracted base', {verifiedAtBase: '0'.repeat(40)});
reject('unapproved review path', {evidencePath: 'data/rcap-grade-a/packet-factory-24h/vf02/other.json'});
reject('missing supplement', {}, {readBytes: relative => {
  if (relative === VF02_SUPPLEMENT) throw new Error('independent supplement unavailable');
  return read(relative);
}});
reject('changed original review', {}, {readBytes: relative => relative === VF02_REVIEW
  ? Buffer.concat([originalBytes, Buffer.from(' ')]) : read(relative)});
const memoPath = 'data/record-clearing/legal-design-intake/DE.memo.json';
const changedMemo = Buffer.from(read(memoPath));
const stateNameOffset = changedMemo.indexOf('Delaware');
assert.ok(stateNameOffset >= 0, 'same-length source probe requires the held state name');
changedMemo[stateNameOffset + 1] = 0x45;
assert.equal(changedMemo.length, read(memoPath).length);
assert.notEqual(hash(changedMemo), hash(read(memoPath)));
reject('same-length current source edit', {}, {readBytes: relative =>
  relative === memoPath ? changedMemo : read(relative)});
const rewrittenOriginal = Buffer.from(JSON.stringify({...original, note: 'rewritten after extraction'}, null, 2));
const reboundSupplement = structuredClone(supplement);
reboundSupplement.supplements.sha256 = hash(rewrittenOriginal);
reject('rewritten original with rebound supplement and extracted digest',
  {evidenceSha256: hash(rewrittenOriginal)}, {readBytes: relative =>
    relative === VF02_REVIEW ? rewrittenOriginal :
      relative === VF02_SUPPLEMENT ? Buffer.from(JSON.stringify(reboundSupplement)) : read(relative)});
for (const relative of [...unchangedFiles, DE_DECISION,
  ...supplement.rows[0].sourceBindings.map(source => source.path),
  'data/rcap-grade-a/packet-factory-24h/fix112/de-family-court-form283-source-adoption-20260912.json']) {
  reject(`changed bound bytes ${relative}`, {}, {readBytes: target => {
    if (target !== relative) return read(target);
    if (target === `${DE_DIRECTORY}/product-wiring.json`) {
      const wiring = JSON.parse(read(target)); wiring.binding.deliveryType = 'court_filing';
      return Buffer.from(JSON.stringify(wiring));
    }
    return Buffer.concat([read(target), Buffer.from(' ')]);
  }});
}
reject('missing raster', {}, {rasterEvaluation: {proven: false}});
reject('changed historical receipt source', {}, {readHistorical: (commit, relative) => {
  const bytes = readHistorical(commit, relative);
  return commit === 'a3ca119bd26536cdde7a1b325f7ac3e3594e75c8'
    ? Buffer.concat([bytes, Buffer.from(' ')]) : bytes;
}});
const wiringPath = `${DE_DIRECTORY}/product-wiring.json`;
const pointersOnly = JSON.parse(read(wiringPath));
pointersOnly.binding.lastIndependentVerification = {verdict: 'PASS_COMPLETE_INDEPENDENT', lane: 'vf02'};
pointersOnly.binding.independentReviewStatus = 'CURRENT_REVIEW';
const consumed = assessDeReviewedGuidance(root, returned, {...options(), readBytes: relative =>
  relative === wiringPath ? Buffer.from(JSON.stringify(pointersOnly)) : read(relative)});
assert.equal(consumed.eligible, true, consumed.reason);
for (const key of ['filingPermitted', 'paymentEligible', 'sponsorshipEligible']) {
  const wiring = structuredClone(pointersOnly); wiring.binding[key] = true;
  reject(`delivery cannot grant ${key}`, {}, {readBytes: relative => relative === wiringPath
    ? Buffer.from(JSON.stringify(wiring)) : read(relative)});
}
for (const [relative, digest] of Object.entries(originalHashes))
  assert.equal(hash(read(relative)), digest, `test changed ${relative}`);
console.log(JSON.stringify({suite: 'de-vf02-reviewed-guidance', status: 'PASS',
  accepted: 2, rejectionControls: rejections.length, rejections, admission: accepted,
  packetRebuilds: 0, receiptAndPacketFilesUnchanged: unchangedFiles.length}, null, 2));
