import crypto from 'node:crypto';
export const IL_ARTIFACT_APPROVAL_PATH = 'data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_REREVIEW_IL_VACATUR_2026-09-14.json';
export const IL_ARTIFACT_APPROVAL_SHA256 = '6d0a4760360f036b7c163f07c9410c3706bcdef3ce1fc69cd33061609536ae34';
const pins = {
  canonical: 'd4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657',
  boundary: 'ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e'
};
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export const REQUIRED_ARTIFACT_OBLIGATIONS = Object.freeze(['ROUTE_IDENTITY', 'SOURCE_IDENTITY', 'COMPONENT_SET', 'KNOWN_PREFILLS', 'REQUIRED_BEFORE_FILING', 'ROUTE_OPTIONS', 'REPEATING_ROWS', 'PROTECTED_FIELDS', 'ARTIFACTS', 'PAGE_ORDER', 'CLIPPING_AND_OVERLAP', 'FILING_DESTINATION', 'FEE_AND_WAIVER', 'SERVICE', 'SELF_HELP_STOP']);
export function loadIlArtifactApproval(readBytes) {
  const bytes = readBytes(IL_ARTIFACT_APPROVAL_PATH);
  if (hash(bytes) !== IL_ARTIFACT_APPROVAL_SHA256) throw new Error('IL owner artifact decision bytes changed; new owner approval required');
  const decision = JSON.parse(bytes.toString('utf8'));
  if (decision.decision !== 'APPROVED_EXACT_SHIPPING_ARTIFACTS' || decision.decisionOwner !== 'Roger Roman' || decision.decidedOn !== '2026-09-14' || decision.familyId !== 'il-prostitution-j-vacate-set' || JSON.stringify(decision.routeIds) !== JSON.stringify(['IL:felony-prostitution-relief'])) throw new Error('IL owner artifact decision scope mismatch');
  if (decision.approvedArtifacts.length !== 2) throw new Error('IL owner decision must bind exactly two artifacts');
  for (const fixture of ['canonical', 'boundary']) {
    const artifact = decision.approvedArtifacts.find(a => a.fixture === fixture);
    const file = `data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/${fixture}.pdf`;
    if (artifact?.file !== file || artifact.sha256 !== pins[fixture] || hash(readBytes(file)) !== pins[fixture]) throw new Error(`IL ${fixture} is not the exact owner-approved shipping artifact`);
  }
  const verifierPath = 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json';
  const registryRows = JSON.parse(readBytes(verifierPath)).rows.filter(r => r.familyId === decision.familyId && r.superseded === false);
  if (registryRows.length !== 1) throw new Error('IL requires one current independent verifier row');
  const current = registryRows[0];
  if (current.verdict !== 'PASS_COMPLETE_INDEPENDENT' || current.isIndependentVerification !== true || current.failedObligations.length || current.unmeasuredObligations.length) throw new Error('IL current independent verification is incomplete');
  const evidenceRows = JSON.parse(readBytes(current.evidencePath)).rows.filter(r => r.itemId === decision.familyId && r.verifiedAtBase === current.verifiedAtBase && String(r.lane).toLowerCase() === current.lane.toLowerCase());
  if (evidenceRows.length !== 1) throw new Error('IL current verifier base must identify one exact evidence row');
  const evidence = evidenceRows[0];
  if (evidence.verdict !== 'PASS_COMPLETE_INDEPENDENT' || evidence.canonicalSha256 !== pins.canonical || evidence.boundarySha256 !== pins.boundary || Object.keys(evidence.proofObligations ?? {}).length !== REQUIRED_ARTIFACT_OBLIGATIONS.length || REQUIRED_ARTIFACT_OBLIGATIONS.some(key => evidence.proofObligations[key]?.result !== 'PASS')) throw new Error('IL independent evidence does not prove all fifteen obligations for approved bytes');
  const rasterPath = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
  const rasters = JSON.parse(readBytes(rasterPath)).rows.filter(r => r.familyId === decision.familyId);
  if (rasters.length !== 1) throw new Error('IL raster row is not unique');
  const raster = rasters[0], receipt = raster.rasterReceipt;
  if (raster.currentRasterState !== 'RASTER_PASS' || receipt.verdict !== 'RASTER_PASS' || receipt.jobConclusion !== 'success' || receipt.boundToCanonicalSha256 !== pins.canonical || receipt.boundToBoundarySha256 !== pins.boundary || receipt.coversTheWholeFamily !== true) throw new Error('IL current raster does not cover approved pair');
  const technicalEvidence = {
    independentVerification: {path: verifierPath, rowSha256: hash(JSON.stringify(current)), evidencePath: current.evidencePath, evidenceRowSha256: hash(JSON.stringify(evidence)), verifiedAtBase: current.verifiedAtBase, obligationsPassed: 15},
    raster: {path: rasterPath, rowSha256: hash(JSON.stringify(raster)), workflowRunId: receipt.workflowRunId, jobId: receipt.jobId, canonicalSha256: pins.canonical, boundarySha256: pins.boundary},
    purpose: 'Current exact-artifact technical proof. Fulfillment status is determined by the consuming successor record; historical productization receipts and revocations remain preserved.'
  };
  return {recordId: decision.recordId, path: IL_ARTIFACT_APPROVAL_PATH, sha256: IL_ARTIFACT_APPROVAL_SHA256, decidedOn: decision.decidedOn, familyId: decision.familyId, routeIds: decision.routeIds, status: 'APPROVED_EXACT_SHIPPING_ARTIFACTS', approvedArtifacts: decision.approvedArtifacts, technicalEvidence, artifactApprovalOnly: true, preservesFulfillmentRevocations: true, runtimeOrProductionAuthorization: false};
}

export const MS_ARTIFACT_APPROVAL_PATH = 'data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_REREVIEW_MS_ADDITIONAL_MISDEMEANOR_2026-09-14.json';
export const MS_ARTIFACT_APPROVAL_SHA256 = '9c04b146893f71d09cbf043317a6af6147a31dbe40395ab362ada8a2509abddd';
export function loadMsArtifactApproval(readBytes) {
  const bytes = readBytes(MS_ARTIFACT_APPROVAL_PATH);
  if (hash(bytes) !== MS_ARTIFACT_APPROVAL_SHA256) throw new Error('MS owner artifact decision bytes changed; new owner approval required');
  const decision = JSON.parse(bytes.toString('utf8'));
  const expected = {
    canonical: 'c2938658151e650ff20791a8b14ba4a9197a339ced3645407914a2066bafbb7b',
    boundary: '61c429c2135a6b3b79de26adea8eb6f6ed1288aaf21c0a604dd656c431848c84'
  };
  const routes = ['MS:additional-justice-court-misdemeanor-relief-9-11-15-3', 'MS:additional-municipal-court-misdemeanor-relief-21-23-7-6'];
  if (decision.decision !== 'APPROVED_EXACT_SHIPPING_ARTIFACTS' || decision.decisionOwner !== 'Roger Roman' || decision.decidedOn !== '2026-09-14' || decision.familyId !== 'ms-misd-addl-set' || JSON.stringify(decision.routeIds) !== JSON.stringify(routes) || decision.approvedArtifacts.length !== 2) throw new Error('MS owner artifact decision scope mismatch');
  for (const fixture of ['canonical', 'boundary']) {
    const artifact = decision.approvedArtifacts.find(a => a.fixture === fixture);
    const file = `data/rcap-all50/overlays/census-v1/ms/ms-misd-addl-set--custom-pleading/fixtures/${fixture}.pdf`;
    if (artifact?.file !== file || artifact.sha256 !== expected[fixture] || hash(readBytes(file)) !== expected[fixture]) throw new Error(`MS ${fixture} is not the exact owner-approved repaired artifact`);
  }
  const rejection = decision.preservedRejection;
  if (hash(readBytes(rejection.path)) !== rejection.sha256) throw new Error('MS rejected-pair decision history changed');
  for (const fixture of ['canonical', 'boundary']) {
    if (hash(readBytes(`data/rcap-grade-a/artifact-rereview-20260914/ms-misd-addl-set/reviewed-pdfs/${fixture}.pdf`)) !== rejection[fixture]) throw new Error('MS rejected-pair bytes were replaced');
  }
  const reviewBytes = readBytes(decision.provenance.reviewPackage);
  if (hash(reviewBytes) !== decision.provenance.reviewPackageSha256AtDecision) throw new Error('MS owner-reviewed package snapshot changed');
  const review = JSON.parse(reviewBytes);
  for (const artifact of review.artifacts) {
    if (artifact.sha256 !== expected[artifact.fixture] || artifact.pageCount !== 7 || artifact.normalizedTextIdentical !== true || artifact.noteOnSignaturePage !== 3) throw new Error('MS approved layout review scope changed');
    for (const image of artifact.images) if (hash(readBytes(image.path)) !== image.sha256) throw new Error('MS reviewed raster bytes changed');
  }
  if (hash(readBytes(review.independentReview.path)) !== review.independentReview.sha256) throw new Error('MS independent review snapshot changed');
  return {recordId: decision.recordId, path: MS_ARTIFACT_APPROVAL_PATH, sha256: MS_ARTIFACT_APPROVAL_SHA256, decidedOn: decision.decidedOn, familyId: decision.familyId, routeIds: decision.routeIds, status: 'APPROVED_EXACT_SHIPPING_ARTIFACTS', approvedArtifacts: decision.approvedArtifacts, ownerReviewedEvidence: {path: decision.provenance.reviewPackage, sha256: decision.provenance.reviewPackageSha256AtDecision, independentReview: review.independentReview}, preservedRejection: rejection, artifactApprovalOnly: true, preservesFulfillmentRevocations: true, runtimeOrProductionAuthorization: false};
}
