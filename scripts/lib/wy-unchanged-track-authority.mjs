// Bounded reconciliation of a sibling-only memo addition. This is no new approval.
import crypto from 'node:crypto';
import { derivationReconciledSpecificationSha256 } from './specification-derivation-reconciliation.mjs';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const requireProof = (condition, message) => { if (!condition) throw new Error(`WY unchanged-track refusal: ${message}`); };
export const WY_CONTAINER = Object.freeze({
  familyId: 'wy_fel_1502-set',
  routeId: 'WY:felony-conviction-expungement-w-s-7-13-1502',
  trackId: 'wy_fel_1502',
  path: 'data/record-clearing/legal-design-intake/WY.memo.json',
  approvedCommit: 'ff9705a240c004ed7b9d2f022113abe865442d3f',
  approvedSha256: 'de2239036a9b2fbda8f6ce7c18a85c3da67c290cf68159929bd46d8c77ddb679',
  currentSha256: 'f210755837e1eecc6bae4505c812a2b4300cd1e282e8c90189291a9a50c8470b',
  selectedTrackSha256: '0917450737bf52e2371467090e57d4456ff4220cb56106534ff22a455abe5687',
});
const folder = 'data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading';
const SPECIFICATION_PATH = 'data/record-clearing/packet-specifications/WY-felony-conviction-expungement.v1.json';
const frozenFiles = Object.freeze({
  [`${folder}/fixtures/canonical.pdf`]: '3dcdbc4ec3d9f08b6c6302b84f254663aa9302a4f712d7451000e2ecda302e30',
  [`${folder}/fixtures/boundary.pdf`]: '703e8d3202e8ecc45aefc000346d65db8bec60ae2b9f1e8ce34796e97400f800',
  [`${folder}/source-receipt.json`]: '92c6d28709785008e9a5a20333523f034910068dd9d01e4eb525a7ef1fee194b',
  [`${folder}/production-field-map.json`]: '244a3aa2ece054596574ff99dff2c124d58d7a701c3af6311feb42126746e3cf',
  [`${folder}/reports/rendered-artifacts.json`]: '3697fe56e7c614e15d6f44fb12fee41383c4ed04196c346354d400eb20b1bed3',
  [`${folder}/participant-instructions.md`]: 'c6294b42fcb82670223e2812992b0e4f899fad818c4469c75e66b76f65ca8976',
  'scripts/build-census-v1-wy_fel_1502-set.mjs': '5ff1ae7b72ad6d52281c68fc18b7431ba5ca2a2c974aa67f6de3dc6880b5bf76',
  [SPECIFICATION_PATH]: '97572a2e564a1ae4c4ca857a90af2c6536fdd68ae1ac3ed7a2766827e1557d2f',
  'data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json': '32321a977941bf1724f0d6f993a7df2477f6b42a9a9d39b2a6d2e27d918e0eb3',
});

export function reconcileWyUnchangedTrack({ familyId, routeId, approvedBytes, currentBytes, readBytes }) {
  const c = WY_CONTAINER;
  requireProof(familyId === c.familyId && routeId === c.routeId, 'different family or route');
  requireProof(hash(approvedBytes) === c.approvedSha256, 'approved memo bytes changed');
  requireProof(hash(currentBytes) === c.currentSha256, 'current memo is not the exact reconciled container');
  const before = JSON.parse(approvedBytes), after = JSON.parse(currentBytes);
  const selected = doc => {
    const tracks = doc.tracks.filter(t => t.trackId === c.trackId);
    requireProof(tracks.length === 1, 'selected track absent or duplicate');
    return JSON.stringify(tracks[0]);
  };
  requireProof(selected(before) === selected(after) && hash(selected(after)) === c.selectedTrackSha256, 'selected approved track changed');
  const withoutTracks = ({ tracks, ...rest }) => JSON.stringify(rest);
  requireProof(withoutTracks(before) === withoutTracks(after), 'shared memo authority changed');
  requireProof(after.tracks.length === before.tracks.length + 1, 'unexpected track inventory');
  for (const track of before.tracks) {
    const matches = after.tracks.filter(t => t.trackId === track.trackId);
    requireProof(matches.length === 1 && JSON.stringify(track) === JSON.stringify(matches[0]), 'pre-existing track changed');
  }
  requireProof(after.tracks.filter(t => t.trackId === 'wy_traffick_6_2_708').length === 1, 'expected sibling addition absent');
  /*
   * The frozen set is still exact, with one file allowed to move through a
   * recorded reconciliation rather than not at all.
   *
   * The packet specification is in this list because a moved specification is,
   * by default, moved legal content. But this family's specification moved for
   * a reason that is neither: it had kept a description of an approved
   * component and dropped its substance, and the repair transcribed the adopted
   * words back in from this family's own build host. The approved artifacts --
   * which are also in this list, and are still checked against their exact
   * pins -- did not move at all.
   *
   * So the specification is admitted at the digest the derivation
   * reconciliation proves, and at no other. With no reconciliation the frozen
   * pin stands and this refuses exactly as before.
   */
  const reconciled = derivationReconciledSpecificationSha256({
    familyId: c.familyId, routeId: c.routeId,
    specificationPath: SPECIFICATION_PATH,
    specificationBytes: readBytes(SPECIFICATION_PATH),
    recordSpecificationSha256: frozenFiles[SPECIFICATION_PATH],
    readBytes
  });
  const admitted = { ...frozenFiles };
  if (reconciled) admitted[SPECIFICATION_PATH] = reconciled.specificationSha256;
  for (const [path, sha256] of Object.entries(admitted)) requireProof(hash(readBytes(path)) === sha256, `approved supporting bytes changed: ${path}`);
  const auditPath = 'data/rcap-grade-a/legal-decisions/POST_APPROVAL_CHANGE_AUDIT_2026-09-02.json';
  const audit = JSON.parse(readBytes(auditPath)).families.filter(r => r.familyId === familyId);
  requireProof(audit.length === 1 && hash(JSON.stringify(audit[0])) === '8daf694071c249b9c888e7083cf9e9a86de4493f65466db7b2ffeb7e6a8cb712', 'approved successor audit changed');
  const registryPath = 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json';
  const selectedRows = JSON.parse(readBytes(registryPath)).rows.filter(r => r.familyId === familyId && r.superseded === false);
  requireProof(selectedRows.length === 1 && hash(JSON.stringify(selectedRows[0])) === 'ddb864aa2052a5acf9dfdfaeabc3cf28cbb2543a2364e8b99216752bb3758169', 'current independent successor changed');
  const reviewPath = 'data/rcap-grade-a/packet-factory-24h/vf07/rows.json';
  const reviewRows = JSON.parse(readBytes(reviewPath)).rows.filter(r => r.itemId === familyId);
  requireProof(reviewRows.length === 1 && hash(JSON.stringify(reviewRows[0])) === '68ec092ccbeeed2b5c25fe87aaf03721cba07124e1295a560866b34e40a2d4db', 'independent successor evidence changed');
  return {
    contract: 'rcap-wy-unchanged-track-container/v1',
    familyId, routeId, trackId: c.trackId,
    approvedMemo: { path: c.path, commit: c.approvedCommit, sha256: c.approvedSha256 },
    currentMemo: { path: c.path, sha256: c.currentSha256 },
    selectedTrackSha256: c.selectedTrackSha256,
    delta: 'Only wy_traffick_6_2_708 added; all pre-existing tracks and shared memo properties unchanged.',
    unchangedSupportingFiles: { ...admitted },
    specificationDerivationReconciliation: reconciled ?? null,
    successor: { auditPath, reviewPath, registryPath, lane: 'vf07', verifiedAtBase: 'aefd46f7c', evidenceRowSha256: '68ec092ccbeeed2b5c25fe87aaf03721cba07124e1295a560866b34e40a2d4db' },
    createsApproval: false, changesShippingArtifacts: false,
  };
}
