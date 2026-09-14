import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadIlArtifactApproval, loadMsArtifactApproval, REQUIRED_ARTIFACT_OBLIGATIONS } from './owner-artifact-approval.mjs';

// The last pre-approval records are immutable provenance, not current approval.
export const SUCCESSOR_BASE_SHA = '7cb3133a5ca8a5bac80550cb7bdc0e38d2359ce8';
export const SUCCESSOR_FAMILIES = ['il-prostitution-j-vacate-set', 'ms-misd-addl-set'];
const registryPath = 'data/rcap-grade-a/fulfillment-authority-registry.json';
const verifierPath = 'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json';
const rasterPath = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
export const MS_SUCCESSOR_VERIFICATION = 'data/rcap-grade-a/participant-data-rights/artifact-successor-20260914/ms-independent-verification.json';
export const MS_SUCCESSOR_RASTER = 'data/rcap-grade-a/participant-data-rights/artifact-successor-20260914/ms-raster-verdict.json';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const insist = (condition, message) => { if (!condition) throw new Error(`First-cohort evidence refusal: artifact successor ${message}`); };
export function artifactSuccessorInputs(familyId, readBytes) {
  insist(SUCCESSOR_FAMILIES.includes(familyId), 'family outside approval scope');
  const approval = familyId === SUCCESSOR_FAMILIES[0] ? loadIlArtifactApproval(readBytes) : loadMsArtifactApproval(readBytes);
  const currentVerifierPath = familyId === 'ms-misd-addl-set' ? MS_SUCCESSOR_VERIFICATION : verifierPath;
  const rows = JSON.parse(readBytes(currentVerifierPath)).rows.filter(r => r.familyId === familyId && r.superseded === false);
  insist(rows.length === 1, 'requires one current verifier');
  const row = rows[0];
  insist(row.isIndependentVerification === true && row.verdict === 'PASS_COMPLETE_INDEPENDENT' && row.failedObligations.length === 0 && row.unmeasuredObligations.length === 0, 'independent verification incomplete');
  const details = JSON.parse(readBytes(row.evidencePath)).rows.filter(r => r.itemId === familyId && r.verifiedAtBase === row.verifiedAtBase && String(r.lane).toLowerCase() === row.lane.toLowerCase());
  insist(details.length === 1, 'requires one exact current detail row');
  const detail = details[0];
  insist(detail.verdict === 'PASS_COMPLETE_INDEPENDENT' && JSON.stringify(Object.keys(detail.proofObligations ?? {}).sort()) === JSON.stringify([...REQUIRED_ARTIFACT_OBLIGATIONS].sort()) && Object.values(detail.proofObligations).every(o => o.result === 'PASS'), 'all fifteen obligations required');
  for (const fixture of ['canonical', 'boundary']) insist(detail[`${fixture}Sha256`] === approval.approvedArtifacts.find(a => a.fixture === fixture).sha256, `${fixture} independent proof is not owner-approved`);
  if (familyId === 'ms-misd-addl-set') {
    insist(Array.isArray(detail.evidence) && detail.evidence.length > 0, 'current technical inputs absent');
    for (const evidence of detail.evidence) insist(digest(readBytes(evidence.path)) === evidence.sha256, `technical input changed: ${evidence.path}`);
  }
  // Only a centrally published raster receipt is authority. A successful local
  // raster run is useful evidence but cannot satisfy the governing contract.
  const currentRasterPath = rasterPath;
  const rasterRows = JSON.parse(readBytes(currentRasterPath)).rows.filter(r => r.familyId === familyId);
  insist(rasterRows.length === 1, 'requires one current raster');
  const raster = rasterRows[0], receipt = raster.rasterReceipt;
  insist(raster.currentRasterState === 'RASTER_PASS' && receipt?.verdict === 'RASTER_PASS' && receipt.executionKind !== 'local_canonical_raster' && receipt.jobConclusion === 'success' && receipt.workflowRunId && receipt.jobId && receipt.coversTheWholeFamily === true, 'central published raster incomplete');
  const artifacts = {};
  for (const fixture of ['canonical', 'boundary']) {
    const approved = approval.approvedArtifacts.find(a => a.fixture === fixture);
    const bytes = readBytes(approved.file);
    insist(digest(bytes) === approved.sha256 && detail[`${fixture}Sha256`] === approved.sha256 && receipt[`boundTo${fixture[0].toUpperCase()}${fixture.slice(1)}Sha256`] === approved.sha256, `${fixture} independent/central raster proof does not bind owner-approved bytes`);
    const info = execFileSync('pdfinfo', [approved.file], {encoding:'utf8'});
    const pageCount = Number(info.match(/^Pages:\s+(\d+)$/m)?.[1]);
    insist(pageCount > 0, `${fixture} PDF pages missing`);
    artifacts[fixture] = {path: approved.file, sha256: approved.sha256, byteLength: bytes.length, pageCount};
  }
  return {approval, row, detail, raster, artifacts, currentVerifierPath, currentRasterPath,
    verification: {registryPath:currentVerifierPath, lane: row.lane, verifiedAtBase: row.verifiedAtBase, evidencePath: row.evidencePath, rowSha256: digest(JSON.stringify(row)), evidenceRowSha256: digest(JSON.stringify(detail))}};
}
export function historicalArtifactRecord(routeId) {
  const bytes = execFileSync('git', ['show', `${SUCCESSOR_BASE_SHA}:${registryPath}`], {maxBuffer:32*1024*1024});
  const record = JSON.parse(bytes).records.find(r => r.routeId === routeId);
  insist(record?.revocation?.revoked === true && record.history.some(h => h.changeKind === 'revoked'), 'baseline is not a preserved revoked record');
  return {record, sourceSha:SUCCESSOR_BASE_SHA, path:registryPath, fileSha256:digest(bytes), recordJsonSha256:digest(JSON.stringify(record))};
}
export function createArtifactSuccessor({routeId, readBytes, stableStringify, provider}) {
  const historical = historicalArtifactRecord(routeId);
  const record = structuredClone(historical.record);
  const inputs = artifactSuccessorInputs(record.packetFamilyId, readBytes);
  const {approval, row, detail, raster, artifacts, verification, currentVerifierPath, currentRasterPath} = inputs;
  insist(approval.routeIds.includes(routeId), 'route not named by owner');
  const b = record.evidenceBindings;
  const specificationBytes = readBytes(b.packetSpecification.path);
  insist(digest(specificationBytes) === record.packetSpecification.sha256, 'legal specification changed');
  const specification = JSON.parse(specificationBytes);
  insist(specification.packetFamily === record.packetFamilyId && specification.routeKeys.includes(routeId), 'specification identity changed');
  insist(digest(readBytes(b.sourceReceipt.path)) === b.sourceReceipt.sha256, 'source receipt changed');
  // Preserve the unchanged source/legal design evidence and its reconciliation.
  for (const authority of record.officialSources) {
    for (const input of authority.boundInputs?.authorityInputs ?? []) {
      if (input.role === 'packet_set_authority') {
        const selected = JSON.parse(readBytes(input.path)).packetSets.find(p => p.packetSetId === record.packetFamilyId);
        insist(digest(stableStringify(selected)) === input.sha256, 'packet-set legal design changed');
      } else if (input.unchangedTrackReconciliation) {
        insist(digest(readBytes(input.path)) === input.unchangedTrackReconciliation.currentMemo.sha256, 'reconciled track changed');
      } else insist(digest(readBytes(input.path)) === input.sha256, `${input.role} authority changed`);
    }
  }
  const renderedPath = b.provider.artifactProducer.renderedArtifactsPath;
  const rendered = JSON.parse(readBytes(renderedPath));
  insist(rendered.familyId === record.packetFamilyId && rendered.renderedFresh && rendered.derivedFromBytes && rendered.byteDerivedHashes, 'render receipt incomplete');
  for (const fixture of ['canonical', 'boundary']) {
    const a = rendered.artifacts.find(a => a.fixture === fixture), current = artifacts[fixture];
    insist(a?.sha256 === current.sha256 && a.byteLength === current.byteLength && a.pageCount === current.pageCount, `${fixture} render receipt stale`);
  }
  const witness = JSON.parse(readBytes(b.fixture.witnessFixturePath)).fixtures?.find(f => f.pathwayKey === routeId);
  // Witness fixture collections use the same canonical answers digest as the
  // original productization; a changed fixture requires its own proof refresh.
  insist(witness && digest(stableStringify(witness.answers ?? {})) === b.fixture.witnessFixtureSha256 && witness.expected?.paymentAllowed === false, 'participant fixture missing or changed');
  const builderHash = digest(Buffer.concat(b.provider.artifactProducer.providerPaths.map(readBytes)));
  const scope = {historicalLegalApproval:structuredClone(record.legalAuthority), artifactApproval:{recordId:approval.recordId,path:approval.path,sha256:approval.sha256}, routeId, familyId:record.packetFamilyId, artifacts};
  const scopeHash = digest(stableStringify(scope));
  record.revocation = {revoked:false, reason:null, revokedAt:null, revokedBy:null};
  record.effectiveFrom = approval.decidedOn;
  // Original legal treatment remains controlling; new scope binds its exact artifacts.
  record.legalAuthority.scopeSha256 = scopeHash;
  record.outputLegalApproval = {state:'passed',reviewerId:'Roger Roman',decidedAt:approval.decidedOn,scopeSha256:scopeHash};
  record.artifactValidation = {state:'validated',artifactSha256:artifacts.canonical.sha256,validatedAt:approval.decidedOn};
  record.provider = provider;
  record.packetCompleteness.filingFormatArtifact.sha256 = artifacts.canonical.sha256;
  record.packetCompleteness.filingFormatArtifact.pageCount = artifacts.canonical.pageCount;
  const identity = `${b.provider.artifactProducer.builderPath}@sha256:${builderHash}`;
  record.packetCompleteness.filingFormatArtifact.producedBy.renderer = identity;
  record.visualReview = {state:'passed',pagesReviewed:artifacts.canonical.pageCount,pageCount:artifacts.canonical.pageCount,evidenceSha256:digest(JSON.stringify(raster.rasterReceipt)),reviewedBy:`${raster.rasterReceipt.workflow}#job:${raster.rasterReceipt.jobId}`,reviewedAt:approval.decidedOn};
  const finalInputs = {contract:'rcap-independent-packet-final-verification/v1',routeId,familyId:record.packetFamilyId,packetSpecificationSha256:record.packetSpecification.sha256,canonicalArtifactSha256:artifacts.canonical.sha256,boundaryArtifactSha256:artifacts.boundary.sha256,verifierRegistry:{path:currentVerifierPath,evidenceRowSha256:verification.rowSha256},verifierEvidence:{path:row.evidencePath,evidenceRowSha256:verification.evidenceRowSha256,verifiedAtBase:row.verifiedAtBase,lane:row.lane},artifactApproval:{path:approval.path,sha256:approval.sha256,recordId:approval.recordId}};
  const finalHash = digest(stableStringify(finalInputs));
  record.finalVerification = {contract:finalInputs.contract,contractModule:'scripts/lib/artifact-approval-successor.mjs',state:'bound',verifierId:row.lane,boundInputsSha256:finalHash,verifiedAt:detail.verifiedAt ?? `base:${row.verifiedAtBase}`,verifiedAtBase:row.verifiedAtBase,evidencePath:row.evidencePath,evidenceRowSha256:verification.rowSha256,evidenceDetailRowSha256:verification.evidenceRowSha256,boundInputs:finalInputs};
  b.approvedArtifacts = artifacts;
  b.artifactApprovalSuccessor = {contract:'rcap-owner-artifact-successor/v1',approval,scope,scopeSha256:scopeHash,historical:{sourceSha:historical.sourceSha,path:historical.path,fileSha256:historical.fileSha256,recordJsonSha256:historical.recordJsonSha256},historicalReceiptsAreNotCurrentArtifactApprovals:true,changesLegalTreatment:false,opensRuntimeRoute:false};
  b.rasterReceipt = {path:currentRasterPath,rowSha256:digest(JSON.stringify(raster)),verdict:'RASTER_PASS',workflowRunId:raster.rasterReceipt.workflowRunId,jobId:raster.rasterReceipt.jobId,receiptArtifact:raster.rasterReceipt.receiptArtifact ?? null,canonicalSha256:artifacts.canonical.sha256,boundarySha256:artifacts.boundary.sha256,coversTheWholeFamily:true};
  b.independentVerification = {path:currentVerifierPath,rowSha256:verification.rowSha256,verdict:row.verdict,lane:row.lane,verifiedAtBase:row.verifiedAtBase,evidencePath:row.evidencePath,evidenceDocumentSha256:digest(readBytes(row.evidencePath)),evidenceRowSha256:verification.evidenceRowSha256,boundInputs:{packetSpecificationSha256:record.packetSpecification.sha256,canonicalSha256:artifacts.canonical.sha256,boundarySha256:artifacts.boundary.sha256},boundInputsSha256:finalHash};
  b.currentIndependentReviewReceipt = {path:row.evidencePath,sha256:digest(readBytes(row.evidencePath)),evidenceRowSha256:verification.evidenceRowSha256,base:row.verifiedAtBase,verdict:row.verdict,obligationsMeasured:15,failedObligations:[],unmeasuredObligations:[],currentBuilderSha256:builderHash,currentProductionFieldMapSha256:digest(readBytes(b.productionFieldMap.path)),freshCurrentByteReviewPerformed:true};
  b.provider.deliveryProvider = provider;
  b.provider.deliveryProviderEvidenceSha256 = digest(readBytes(b.provider.deliveryProviderEvidencePath));
  b.provider.artifactProducer.builderSha256 = builderHash;
  b.provider.artifactProducer.identity = identity;
  b.provider.artifactProducer.renderedArtifactsSha256 = digest(readBytes(renderedPath));
  b.productionFieldMap.sha256 = digest(readBytes(b.productionFieldMap.path));
  b.fixture.canonicalSha256 = artifacts.canonical.sha256;
  b.fixture.boundarySha256 = artifacts.boundary.sha256;
  return record;
}
