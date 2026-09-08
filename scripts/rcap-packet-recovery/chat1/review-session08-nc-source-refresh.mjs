import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { annotationIsSourceBound, carryForwardIdentityRefresh } from '../../rcap-packet-completeness/identity-refresh.mjs';

const FAMILY = 'nc_146_dismissal_petition-set';
const TRACK = 'nc_146_dismissal_petition';
const ROUTE = 'obligation:track-only:NC:nc_146_dismissal_petition';
const DIRECTORY = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const RECEIPT = `${DIRECTORY}/source-receipt.json`;
const REGISTRY = 'data/record-clearing/legal-design-track-registry.json';
const OLD_COMMIT = '0489cca02685b98789f32da98d5fb90ff36a986e';
const CURRENT_COMMIT = '75647c8901618ee8aca94e6dc971cd769331e991';
const OLD_SHA = '9fe5d0ccf1b172877acdf6a5158e79dc040ce6f77ee47b2ee0403056acb0957f';
const CURRENT_SHA = 'baa26b2e882933329aea3caedb0a8b6e31c2eae26489b35557556173f3d119dc';
const OBJECT_SHA = '921ed18b2d24bf53924fc362b1c44d7c79183308fc5529417fb450d82a76d085';
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const SHA = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const BLOB = bytes => crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const canonical = value => `${JSON.stringify(sorted(value))}\n`;
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;
const clone = value => structuredClone(value);
const show = commit => execFileSync('git', ['show', `${commit}:${REGISTRY}`], { maxBuffer: 24_000_000 });
const oldBytes = show(OLD_COMMIT);
const currentBytes = fs.readFileSync(REGISTRY);
const immutableCurrentBytes = show(CURRENT_COMMIT);
assert.equal(SHA(oldBytes), OLD_SHA);
assert.equal(SHA(currentBytes), CURRENT_SHA);
assert.ok(currentBytes.equals(immutableCurrentBytes), 'Current registry must equal the named immutable current commit');
const before = JSON.parse(oldBytes), after = JSON.parse(currentBytes);
const receiptBytes = fs.readFileSync(RECEIPT);
const receipt = JSON.parse(receiptBytes);
const targetPin = value => {
  const pins = value.committedRecords.filter(pin => pin.pathInRepository === REGISTRY);
  assert.equal(pins.length, 1, 'Exactly one registry pin is required');
  return pins[0];
};
function validateReceipt(value) {
  assert.equal(value.familyId, FAMILY, 'Wrong receipt family');
  assert.deepEqual(value.routeKeys, [ROUTE], 'Wrong receipt route scope');
  const pin = targetPin(value);
  assert.equal(pin.recordId, `legal-design-track-registry:${TRACK}`, 'Wrong explicit track identity');
  assert.equal(pin.sha256, OLD_SHA, 'Old receipt digest is not the recovered historical source');
  assert.equal(pin.byteLength, oldBytes.length, 'Old receipt length is not the recovered historical source');
  assert.equal(pin.exactObject.kind, 'track');
  assert.equal(pin.exactObject.id, TRACK);
  assert.equal(pin.exactObject.canonicalObjectSha256, OBJECT_SHA, 'Wrong exact-object anchor');
}
function validateScope(oldDocument, newDocument) {
  const withoutTracks = ({ tracks, ...metadata }) => metadata;
  assert.deepEqual(withoutTracks(oldDocument), withoutTracks(newDocument), 'Global registry metadata changed');
  const index = document => {
    assert.ok(Array.isArray(document.tracks));
    const indexed = new Map(document.tracks.map(track => [track.trackId, track]));
    assert.equal(indexed.size, document.tracks.length, 'Duplicate registry track');
    return indexed;
  };
  const oldTracks = index(oldDocument), currentTracks = index(newDocument);
  assert.ok(oldTracks.has(TRACK) && currentTracks.has(TRACK), 'Bound NC track is missing');
  assert.deepEqual(oldTracks.get(TRACK), currentTracks.get(TRACK), 'Bound NC track changed');
  assert.equal(SHA(canonical(oldTracks.get(TRACK))), OBJECT_SHA, 'Historical exact-object anchor mismatch');
  assert.equal(SHA(canonical(currentTracks.get(TRACK))), OBJECT_SHA, 'Current exact-object anchor mismatch');
  return { oldTracks, currentTracks, track: oldTracks.get(TRACK) };
}
validateReceipt(receipt);
const scope = validateScope(before, after);
const changedTracks = [...new Set([...scope.oldTracks.keys(), ...scope.currentTracks.keys()])]
  .filter(id => canonical(scope.oldTracks.get(id)) !== canonical(scope.currentTracks.get(id)));
assert.ok(!changedTracks.includes(TRACK));
const refreshed = clone(receipt);
const originalPin = targetPin(receipt), refreshedPin = targetPin(refreshed);
refreshedPin.sha256 = CURRENT_SHA;
refreshedPin.byteLength = currentBytes.length;
refreshedPin.identityRefresh = {
  refreshedOn: new Date().toISOString().slice(0, 10),
  was: { sha256: OLD_SHA, byteLength: oldBytes.length },
  recoveredFromCommit: OLD_COMMIT,
  refreshedAgainstCommit: CURRENT_COMMIT,
  previousIdentityRefresh: clone(originalPin.identityRefresh ?? null),
  anchorsCompared: 1,
  anchorsIdentical: 1,
  trackIds: [TRACK],
  identicalTrackSha256: { [TRACK]: OBJECT_SHA },
  canonicalisation: originalPin.exactObject.canonicalisation,
  why: 'The complete exact NC track object and all global metadata are identical in the immutable historical/current registries. Only five unrelated tracks changed. This source-only note refreshes the whole-file pin without changing packet bytes, source selection, legal treatment or any review disposition.',
  equivalenceEvidence: `${EVIDENCE}/nc-source-registry-equivalence.json`
};
const checks = [];
const test = (name, run) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.message }); }
};
test('Recovered old/current registry bytes match both immutable commits and the bound full NC object', () => {
  assert.equal(scope.oldTracks.size, 503);
  assert.equal(scope.currentTracks.size, 503);
  assert.deepEqual(changedTracks, ['il-seal-edu', 'mi_setaside_application', 'mi_setaside_first_owi', 'mo-art-xiv-marijuana', 'pa_790_nonconviction']);
});
test('Only the exact NC registry pin digest, length and source-only annotation change', () => {
  const normalized = clone(refreshed), pin = targetPin(normalized);
  for (const key of ['sha256', 'byteLength', 'identityRefresh']) {
    if (Object.hasOwn(originalPin, key)) pin[key] = clone(originalPin[key]);
    else delete pin[key];
  }
  assert.deepEqual(normalized, receipt);
  assert.equal(annotationIsSourceBound(refreshedPin.identityRefresh).ok, true);
});
for (const [name, change] of [
  ['wrong family', value => { value.familyId = 'other'; }],
  ['wrong route', value => { value.routeKeys = ['unrelated']; }],
  ['wrong historical digest', value => { targetPin(value).sha256 = '0'.repeat(64); }],
  ['wrong historical length', value => { targetPin(value).byteLength += 1; }],
  ['wrong exact-object anchor', value => { targetPin(value).exactObject.canonicalObjectSha256 = '0'.repeat(64); }],
  ['wrong bound track', value => { targetPin(value).recordId = 'legal-design-track-registry:other'; }],
  ['duplicate registry pin', value => { value.committedRecords.push(clone(targetPin(value))); }],
  ['missing registry pin', value => { value.committedRecords = value.committedRecords.filter(pin => pin.pathInRepository !== REGISTRY); }]
]) test(`Refuses ${name}`, () => { const value = clone(receipt); change(value); assert.throws(() => validateReceipt(value)); });
test('Refuses changed NC self-help treatment despite an otherwise unchanged registry', () => {
  const document = { ...after, tracks: after.tracks.map(track => track.trackId === TRACK ? { ...track, selfHelpStopConditions: ['ALTERED INDEPENDENT CONTROL'] } : track) };
  assert.throws(() => validateScope(before, document), /Bound NC track changed/);
});
test('Refuses a missing NC track', () => {
  assert.throws(() => validateScope(before, { ...after, tracks: after.tracks.filter(track => track.trackId !== TRACK) }), /Bound NC track is missing/);
});
test('Refuses a duplicate NC track', () => {
  assert.throws(() => validateScope(before, { ...after, tracks: [...after.tracks, scope.track] }), /Duplicate registry track/);
});
test('Refuses changed global metadata even when the NC object matches', () => {
  assert.throws(() => validateScope(before, { ...after, unreviewedGlobalCondition: true }), /Global registry metadata changed/);
});
const plainCurrent = clone(refreshed);
delete targetPin(plainCurrent).identityRefresh;
test('Existing preservation mechanism carries the complete valid source annotation verbatim', () => {
  const result = carryForwardIdentityRefresh(refreshed, clone(plainCurrent));
  assert.deepEqual(result.document, refreshed);
  assert.equal(result.carried.length, 1);
  assert.equal(result.dropped.length, 0);
});
for (const [name, digest] of [['source changes again', 'f'.repeat(64)], ['source reverts', OLD_SHA]]) {
  test(`Existing preservation mechanism refuses annotation when ${name}`, () => {
    const next = clone(plainCurrent); targetPin(next).sha256 = digest;
    const result = carryForwardIdentityRefresh(refreshed, next);
    assert.equal(result.carried.length, 0);
    assert.equal(result.dropped.length, 1);
    assert.equal(Object.hasOwn(targetPin(result.document), 'identityRefresh'), false);
  });
}
test('Existing preservation mechanism refuses artifact approval hidden in the source note', () => {
  const previous = clone(refreshed); targetPin(previous).identityRefresh.rasterReceipt = { verdict: 'RASTER_PASS' };
  const result = carryForwardIdentityRefresh(previous, clone(plainCurrent));
  assert.equal(result.carried.length, 0);
  assert.equal(result.dropped.length, 1);
});
const priorReviewPath = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/nc-independent-review.json';
const originalReview = JSON.parse(fs.readFileSync(priorReviewPath)).rows.find(row => row.familyId === FAMILY);
const preserved = [];
test('All ten reviewed PDFs and four retained original forms remain byte-identical', () => {
  for (const pdf of originalReview.wholePdfHashesMeasured) {
    const file = `${DIRECTORY}/${pdf.file}`, bytes = fs.readFileSync(file);
    assert.equal(SHA(bytes), pdf.sha256);
    assert.equal(BLOB(bytes), pdf.gitBlobSha);
    preserved.push({ path: file, sha256: SHA(bytes) });
  }
  for (const source of receipt.documents) {
    const bytes = fs.readFileSync(source.pathInRepository);
    assert.equal(SHA(bytes), source.sha256);
    preserved.push({ path: source.pathInRepository, sha256: SHA(bytes) });
  }
});
const failed = checks.filter(check => !check.passed).length;
assert.equal(failed, 0, JSON.stringify(checks.filter(check => !check.passed)));
const host = 'scripts/build-census-v1-nc_146_dismissal_petition-set.mjs';
const hostBytes = fs.readFileSync(host);
const hasPreservationHook = hostBytes.toString().includes('preserveIdentityRefresh(fs, absolute, value)');
const equivalence = {
  schemaVersion: 'rcap-nc-source-registry-equivalence/v1',
  familyId: FAMILY, routeKeys: [ROUTE], recordedAt: new Date().toISOString(),
  historicalRegistry: { path: REGISTRY, commit: OLD_COMMIT, sha256: OLD_SHA, gitBlob: BLOB(oldBytes), byteLength: oldBytes.length },
  currentRegistry: { path: REGISTRY, commit: CURRENT_COMMIT, sha256: CURRENT_SHA, gitBlob: BLOB(currentBytes), byteLength: currentBytes.length },
  globalMetadataIdentical: true, oldTrackCount: scope.oldTracks.size, currentTrackCount: scope.currentTracks.size,
  changedUnrelatedTrackIds: changedTracks, boundTrackId: TRACK, fullObjectIdentical: true,
  canonicalObjectSha256: OBJECT_SHA, canonicalisation: originalPin.exactObject.canonicalisation,
  boundTrackObject: scope.track,
  packetBytesChanged: false, officialSourceBytesChanged: false, legalTreatmentChanged: false,
  newApproval: false, previouslyTerminalStateAsserted: false, productionTouched: false
};
fs.writeFileSync(`${EVIDENCE}/nc-source-registry-equivalence.json`, serialize(equivalence));
const apply = process.argv.includes('--apply');
if (apply) {
  assert.equal(SHA(fs.readFileSync(RECEIPT)), SHA(receiptBytes), 'Receipt changed during bounded validation; refuse unexpected conflict');
  assert.equal(SHA(fs.readFileSync(REGISTRY)), CURRENT_SHA, 'Registry changed during bounded validation; refuse stale refresh');
  fs.writeFileSync(RECEIPT, serialize(refreshed));
}
const report = {
  schemaVersion: 'rcap-nc-bounded-source-identity-refresh/v1', familyId: FAMILY,
  reviewer: 'release_scope independent original-candidate reviewer; source-only refresh author', recordedAt: new Date().toISOString(),
  status: 'PASS', applied: apply, changedReceipt: RECEIPT,
  receiptBefore: { sha256: SHA(receiptBytes), gitBlob: BLOB(receiptBytes) },
  receiptAfter: { sha256: SHA(Buffer.from(serialize(refreshed))), gitBlob: BLOB(Buffer.from(serialize(refreshed))) },
  equivalenceEvidence: `${EVIDENCE}/nc-source-registry-equivalence.json`,
  tests: checks, passed: checks.length, failed,
  preservedArtifactAndSourceIdentities: preserved,
  builderPreservationHook: { path: host, measuredSha256: SHA(hostBytes), installed: hasPreservationHook, hostModifiedByThisTask: false,
    boundary: hasPreservationHook ? 'Presence only; independent writer execution belongs to the separately assigned hook review.' : 'Missing hook reported to Captain before this source-only refresh; unchanged-source regeneration would erase the note until separately repaired.' },
  existingMechanism: 'scripts/rcap-packet-completeness/identity-refresh.mjs',
  bulkRefreshNotInvoked: 'The older bulk refresher is restricted to previously terminal families. This exact-object source-only comparison does not fabricate that prior state or weaken the shared restriction.',
  packetRendererRuns: 0, newRasterRuns: 0, reviewVerdictsEdited: false, terminalPromotionClaimed: false, productionTouched: false
};
fs.writeFileSync(`${EVIDENCE}/nc-source-registry-refresh.json`, serialize(report));
console.log(JSON.stringify({ status: report.status, applied: apply, passed: checks.length, failed, changedReceipt: RECEIPT, preservedPdfs: originalReview.wholePdfHashesMeasured.length, preservedSources: receipt.documents.length, builderPreservationHookInstalled: hasPreservationHook }));
