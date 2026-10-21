/** Integrate an independently reviewed non-filed guide, never a filing or
 * runtime grant. Recheck bytes and every bound source; do not author a review. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {acceptedRasterFor, candidateRowsByFamily} from './acceptance-identity.mjs';
import {bindDeclaredDeGuidance, pdfPageCount, DE_FAMILY, DE_ROUTE, DE_DIRECTORY, DE_DECISION, DE_DECISION_ID, DE_DECISION_SHA256} from './de-guidance-binding.mjs';
import {chatRowProblem} from './chat-review-inputs.mjs';
const OBLIGATIONS = ['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS',
  'REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS',
  'PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const SOURCE_REGISTRY = 'data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const ORIGINAL_REGISTRY_COMMIT = '97d5b4ba933537f8baf0371c7ba99c0dae5e6d00';
const REVIEW = 'data/rcap-grade-a/chat-parallel-2026-09-07/review/de-current-review-reconciliation.json';
export const CURRENT_REVIEW = 'data/rcap-grade-a/packet-factory-24h/vf62/rows-vf62-20260911-de-mandatory-final.json';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');

const DEFC_FAMILY = 'de_discretionary_family_court-set';
const DEFC_ADOPTION_PROOF = 'data/rcap-grade-a/packet-factory-24h/fix112/de-family-court-form283-source-adoption-20260912.json';
const DEFC_HISTORICAL_REGISTRY_SHA256 = '054e593f77130eb76100edd8239c8781a6d6a1032ed1017b839b5eeb8bc03982';
const DEFC_HISTORICAL_REGISTRY_BYTES = 82180;
const DEFC_CURRENT_REGISTRY_SHA256 = 'ef7ac045778cbb1e3ef340e2bddb2545b7662cb9a6381896f95d7254d12815e1';
const DEFC_CURRENT_REGISTRY_BYTES = 82712;
const DEFC_ADOPTION_PROOF_SHA256 = '416bed5e70f2cba68f4f1a2aa9cdb416980c58e4e7a2cbc5ff95b09c272427d5';
const DEFC_ADOPTION_PROOF_BYTES = 1088;
const DEFC_FORM_283_SHA256 = 'f2c8a0b1b8a4b3d82e4041f25b8bbf62a61e8e93b8d243274c06aa1cc11fb602';
const DEFC_ADOPTION_PROOF_RECORD = {
  schemaVersion: 'rcap-source-acquisition-return/v1',
  familyId: DEFC_FAMILY,
  itemId: `${DEFC_FAMILY}::official-form:FORM-283`,
  result: 'OFFICIAL_SOURCE_ALREADY_HELD',
  heldCorpusPath: 'private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/reference-only/Form-1021IP__adult-expungement-instruction-packet__rev-2023-10.pdf',
  sha256: DEFC_FORM_283_SHA256,
  byteLength: 630042,
  pageCount: 15,
  selectedSourcePages: [15],
  sourcePageIdentity: 'Form 283, Rev 6/20; official proposed-order page within Form1021IP Rev10/23',
  officialReaderUrl: 'https://courts.delaware.gov/forms/download.aspx?id=118608',
  currentRemoteBinaryHashMeasured: false,
  independentSourceReview: {
    path: 'data/rcap-grade-a/packet-factory-24h/vf44/de-family-court-source-input-review-20260912.json',
    sha256: '99df3191d6714364158b36f2b1f39826d6c739e7b6d42e39e760b4b96a4d2ce1',
    byteLength: 11161
  },
  packetAcceptanceGranted: false
};
const DEFC_HISTORICAL_FAMILY = {
  familyId: DEFC_FAMILY,
  group: 'D',
  disposition: 'SOURCE_READY',
  relationshipNote: 'Form 281 is the parent initiating petition. Form 281E is only its continuation/charge-extension sheet.',
  exactNextAction: 'Build Form 281 with Form 281E only where charge continuation is required.'
};
const DEFC_CURRENT_FAMILY = {
  familyId: DEFC_FAMILY,
  group: 'D',
  disposition: 'SOURCE_READY',
  relationshipNote: 'Form 281 is the initiating petition;281E is conditional charge continuation. Held Form 1021IP pages 2–4 require proposedorderForm 283, held on its page 15.',
  exactNextAction: 'Build Form 281, conditional 281E, requiredForm 283(source1021IPpage 15), then assembly guidance; obtain independent current-byte acceptance.',
  additionalRequiredSourceIds: ['official-form:FORM-283'],
  requiredPacketSourceBindings: [{sourceId: 'official-form:FORM-283', sha256: DEFC_FORM_283_SHA256}]
};

function parseDefcAdoptionProof(proofBytes) {
  assert.ok(proofBytes, 'DE Family Court source adoption proof unavailable');
  assert.equal(sha(proofBytes), DEFC_ADOPTION_PROOF_SHA256, 'DE Family Court source adoption proof changed');
  assert.equal(proofBytes.length, DEFC_ADOPTION_PROOF_BYTES, 'DE Family Court source adoption proof byte length changed');
  let proof;
  try { proof = JSON.parse(Buffer.from(proofBytes).toString('utf8')); }
  catch (error) { throw new Error(`DE Family Court source adoption proof is invalid JSON: ${error.message}`); }
  assert.deepEqual(proof, DEFC_ADOPTION_PROOF_RECORD, 'DE Family Court source adoption proof contents changed');
  return proof;
}

// The current VF62 review predates one independently accepted DE Family Court
// source-determination record. Permit that one source-registry refresh only
// after proving the old receipt pin, the exact DEFC-only delta, and the
// immutable source-adoption proof. This does not refresh the receipt or grant
// packet, filing, payment, or sponsorship authority.
export function deFamilyCourtSourceDelta(oldBytes, currentBytes, {proofBytes} = {}) {
  assert.equal(sha(oldBytes), DEFC_HISTORICAL_REGISTRY_SHA256, 'DE Family Court historical source registry pin changed');
  assert.equal(oldBytes.length, DEFC_HISTORICAL_REGISTRY_BYTES, 'DE Family Court historical source registry byte length changed');
  assert.equal(sha(currentBytes), DEFC_CURRENT_REGISTRY_SHA256, 'DE Family Court current source registry is not the accepted refresh');
  assert.equal(currentBytes.length, DEFC_CURRENT_REGISTRY_BYTES, 'DE Family Court current source registry byte length changed');
  const proof = parseDefcAdoptionProof(proofBytes);
  let old, current;
  try {
    old = JSON.parse(Buffer.from(oldBytes).toString('utf8'));
    current = JSON.parse(Buffer.from(currentBytes).toString('utf8'));
  } catch (error) { throw new Error(`DE Family Court source registry is invalid JSON: ${error.message}`); }
  const oldReconciliation = old.reconciliation42;
  const currentReconciliation = current.reconciliation42;
  assert.ok(oldReconciliation && currentReconciliation, 'DE Family Court source registry reconciliation is missing');
  assert.deepEqual(Object.keys(current), Object.keys(old), 'DE Family Court global source authority shape changed');
  const oldOutsideReconciliation = structuredClone(old);
  const currentOutsideReconciliation = structuredClone(current);
  delete oldOutsideReconciliation.reconciliation42;
  delete currentOutsideReconciliation.reconciliation42;
  assert.deepEqual(currentOutsideReconciliation, oldOutsideReconciliation,
    'DE Family Court global authority outside reconciliation42 changed');
  assert.deepEqual(currentReconciliation.sharedExactBindings, oldReconciliation.sharedExactBindings,
    'DE Family Court shared exact bindings changed');

  const oldEvidencePaths = oldReconciliation.acquisitionEvidencePaths;
  const currentEvidencePaths = currentReconciliation.acquisitionEvidencePaths;
  assert.ok(Array.isArray(oldEvidencePaths) && Array.isArray(currentEvidencePaths),
    'DE Family Court source evidence paths are missing');
  assert.equal(new Set(oldEvidencePaths).size, oldEvidencePaths.length, 'historical DE Family Court evidence paths are duplicated');
  assert.equal(new Set(currentEvidencePaths).size, currentEvidencePaths.length, 'current DE Family Court evidence paths are duplicated');
  assert.deepEqual(currentEvidencePaths.slice(0, oldEvidencePaths.length), oldEvidencePaths,
    'DE Family Court source evidence was removed or reordered');
  assert.deepEqual(currentEvidencePaths.slice(oldEvidencePaths.length), [DEFC_ADOPTION_PROOF],
    'DE Family Court source evidence delta is not the exact adopted Form 283 proof');

  const oldSharedReconciliation = structuredClone(oldReconciliation);
  const currentSharedReconciliation = structuredClone(currentReconciliation);
  delete oldSharedReconciliation.families;
  delete currentSharedReconciliation.families;
  currentSharedReconciliation.acquisitionEvidencePaths = oldEvidencePaths;
  assert.deepEqual(currentSharedReconciliation, oldSharedReconciliation,
    'DE Family Court shared reconciliation metadata changed outside the proof path');

  const oldFamilyIds = oldReconciliation.families?.map(row => row.familyId);
  const currentFamilyIds = currentReconciliation.families?.map(row => row.familyId);
  assert.ok(Array.isArray(oldFamilyIds) && Array.isArray(currentFamilyIds), 'DE Family Court family determinations are missing');
  assert.deepEqual(currentFamilyIds, oldFamilyIds, 'DE Family Court source determination family set or order changed');
  const oldFamilies = new Map(oldReconciliation.families.map(row => [row.familyId, row]));
  const currentFamilies = new Map(currentReconciliation.families.map(row => [row.familyId, row]));
  const changedFamilyIds = oldFamilyIds.filter(id => JSON.stringify(oldFamilies.get(id)) !== JSON.stringify(currentFamilies.get(id)));
  assert.deepEqual(changedFamilyIds, [DEFC_FAMILY], 'DE Family Court source registry changed outside the exact DEFC family');
  assert.deepEqual(oldFamilies.get(DEFC_FAMILY), DEFC_HISTORICAL_FAMILY, 'DE Family Court historical family anchor changed');
  assert.deepEqual(currentFamilies.get(DEFC_FAMILY), DEFC_CURRENT_FAMILY, 'DE Family Court current family delta is unknown');
  assert.deepEqual(currentFamilies.get(DE_FAMILY), oldFamilies.get(DE_FAMILY), 'DE mandatory source determination changed');
  const sharedAnchorBytes = Buffer.from(JSON.stringify(oldSharedReconciliation));
  const mandatoryAnchorBytes = Buffer.from(JSON.stringify(oldFamilies.get(DE_FAMILY)));
  return {
    comparison: 'historical DE source pin and all source authority remain identical except the exact DE Family Court Form 283 adoption delta',
    scopeUnchanged: true,
    historicalSource: {path: SOURCE_REGISTRY, sha256: sha(oldBytes), byteLength: oldBytes.length},
    currentSource: {path: SOURCE_REGISTRY, sha256: sha(currentBytes), byteLength: currentBytes.length},
    changedFamilyIds,
    addedEvidencePaths: [DEFC_ADOPTION_PROOF],
    sourceAdoptionProof: {
      path: DEFC_ADOPTION_PROOF,
      sha256: sha(proofBytes),
      byteLength: proofBytes.length,
      familyId: proof.familyId,
      itemId: proof.itemId,
      sourceSha256: proof.sha256,
      sourceByteLength: proof.byteLength,
      selectedSourcePages: proof.selectedSourcePages
    },
    unchangedAnchors: {
      sharedReconciliationSha256: sha(sharedAnchorBytes),
      deMandatoryFamilySha256: sha(mandatoryAnchorBytes)
    }
  };
}

// The receipt retains its historical pin and records an explicit identity
// refresh. Only the measured DE-pardon and UT-PCRA changes may explain the new
// whole-registry hash; Delaware mandatory and all other authority must compare
// exactly. Any broader edit, removal, or reordering refuses.
export function additiveOtherFamilyRegistry(oldBytes, currentBytes, familyId) {
  const old = JSON.parse(oldBytes), now = JSON.parse(currentBytes);
  const a = old.reconciliation42, b = now.reconciliation42;
  assert.ok(a && b, 'missing structured source determination');
  assert.deepEqual(Object.keys(now), Object.keys(old), 'global source authority shape changed');
  const beforeOutside = structuredClone(old), afterOutside = structuredClone(now);
  delete beforeOutside.reconciliation42; delete afterOutside.reconciliation42;
  assert.deepEqual(afterOutside, beforeOutside, 'global authority outside reconciliation42 changed');
  assert.deepEqual(b.sharedExactBindings, a.sharedExactBindings, 'shared exact bindings changed');
  const changedFamilyIds = a.families.filter(prior => {
    const current = b.families.find(row => row.familyId === prior.familyId);
    assert.ok(current, `source determination removed: ${prior.familyId}`);
    return JSON.stringify(current) !== JSON.stringify(prior);
  }).map(row => row.familyId).sort();
  const permittedChanges = [
    'census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement',
    'de_pardon_expungement-set'
  ];
  assert.ok(changedFamilyIds.every(id => permittedChanges.includes(id)),
    'registry changed outside the measured DE-pardon/UT-PCRA reconciliation');
  assert.ok(!changedFamilyIds.includes(familyId), 'reviewed family source determination changed');
  const unchangedBefore = a.families.filter(row => !changedFamilyIds.includes(row.familyId));
  const unchangedAfter = b.families.filter(row => !changedFamilyIds.includes(row.familyId));
  assert.deepEqual(unchangedAfter, unchangedBefore, 'an unlisted family source determination changed');
  const addedPaths = b.acquisitionEvidencePaths.filter(p => !a.acquisitionEvidencePaths.includes(p));
  assert.deepEqual(addedPaths, ['data/rcap-grade-a/packet-factory-24h/checkpoint-232-to-250/ut-pcra-source-adoption-20260911.json']);
  assert.deepEqual(b.acquisitionEvidencePaths.filter(p => a.acquisitionEvidencePaths.includes(p)), a.acquisitionEvidencePaths,
    'existing source evidence removed or reordered');
  return {comparison: 'all Delaware mandatory and global authority is identical; only DE-pardon and UT-PCRA reconciliation records changed',
    pinnedSha256: sha(oldBytes), currentSha256: sha(currentBytes),
    unchangedPriorFamilyEntries: unchangedBefore.length,
    changedFamilyIds, addedEvidencePaths: addedPaths};
}

function assessLegacyDeReviewedGuidance(root, returned, overrides = {}) {
  if (returned?.familyId !== DE_FAMILY || returned.verdict !== 'PASS_COMPLETE_INDEPENDENT') return null;
  const bytes = overrides.readBytes ?? (p => fs.readFileSync(path.join(root, p)));
  const json = p => JSON.parse(bytes(p));
  const hashFile = p => sha(bytes(p));
  const historical = overrides.readHistorical ?? ((commit, p) => execFileSync('git', ['show', `${commit}:${p}`], {cwd:root, maxBuffer:1<<24, stdio:['ignore','pipe','ignore']}));
  try {
    assert.equal(returned.evidencePath, REVIEW, 'this admission consumes only the reconciled guidance review');
    assert.equal(hashFile(REVIEW), returned.evidenceSha256, 'review bytes changed since extraction');
    const doc = json(REVIEW), row = doc.rows.find(r => r.familyId === DE_FAMILY);
    assert.equal(chatRowProblem(doc, row, OBLIGATIONS), null);
    assert.equal(row.verdict, returned.verdict);
    assert.equal(row.verifiedAtBase, returned.verifiedAtBase);
    assert.deepEqual(row.routeKeys, [DE_ROUTE]);
    assert.equal(row.integrationProposalForA.candidateTerminalTreatment, 'GUIDANCE_READY');
    const directory = 'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill';
    assert.equal(row.familyDirectory, directory);
    const currentFamily = overrides.currentFamily ?? json('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json').families.find(f => f.familyId === DE_FAMILY);
    assert.equal(currentFamily.familyId, DE_FAMILY);
    assert.equal(currentFamily.directory, directory);
    assert.deepEqual(currentFamily.routeKeys, [DE_ROUTE]);
    const a = row.anchors;
    const identities = {
      'production-field-map.json': a.map.gitBlobSha,
      'reports/actual-writes.json': a.actualWrites.gitBlobSha,
      'reports/blanks-left-for-the-participant.json': a.blankReport.gitBlobSha,
      'participant-instructions.md': a.instructionsGitBlobSha,
      'source-receipt.json': a.sourceReceiptGitBlobSha,
      'reports/rendered-artifacts.json': a.renderedArtifactsGitBlobSha,
    };
    for (const [p, expected] of Object.entries(identities)) assert.equal(blob(bytes(`${directory}/${p}`)), expected, `reviewed input changed: ${p}`);
    assert.equal(blob(bytes('data/record-clearing/legal-decisions/2026-09-07-de-sbi-fee-scope-correction.json')), a.feeCorrectionGitBlobSha);
    const outputs = [];
    for (const fixture of ['canonical','boundary']) {
      const p = `${directory}/fixtures/${fixture}.pdf`, b = bytes(p);
      assert.equal(blob(b), a[fixture].gitBlobSha);
      assert.equal(sha(b), a[fixture].centralAndInventorySha256);
      assert.equal(b.length, a[fixture].bytes);
      assert.equal(a[fixture].pages, 3);
      outputs.push({fixture, file:p, sha256:sha(b), byteLength:b.length, pageCount:3});
    }
    const report = json(`${directory}/reports/rendered-artifacts.json`);
    const receipt = json(`${directory}/source-receipt.json`);
    const wiring = json(`${directory}/product-wiring.json`);
    assert.equal(wiring.binding.deliveryType, 'process_guidance');
    assert.equal(wiring.binding.filingPermitted, false);
    assert.equal(wiring.proposedRepresentation.outputStrategy, 'process_guidance');
    assert.equal(wiring.proposedRepresentation.components.length, 1);
    assert.equal(wiring.proposedRepresentation.components[0].role, 'participant_guide');
    const expected = bindDeclaredDeGuidance(wiring, {familyId:DE_FAMILY, routeKeys:[DE_ROUTE],directory,state:'GUIDANCE_READY'},
      {report,receipt,pageCountFile:p=>pdfPageCount(bytes(p)),instructions:bytes(`${directory}/participant-instructions.md`).toString('utf8'),hashFile});
    assert.deepEqual(wiring.proposedRepresentation.components, expected.proposedRepresentation.components);
    assert.deepEqual(wiring.proposedRepresentation.fixtureBindings, expected.proposedRepresentation.fixtureBindings);
    const sourceChecks = [];
    for (const s of receipt.compositionSources) {
      const b = bytes(s.path), current = sha(b);
      if (current === s.sha256) {sourceChecks.push({path:s.path,sha256:current,matched:true});continue;}
      assert.equal(s.path, SOURCE_REGISTRY, 'bound composition source changed');
      const old = historical(ORIGINAL_REGISTRY_COMMIT, s.path);
      assert.equal(sha(old), s.sha256, 'historical registry does not match the author’s pin');
      sourceChecks.push({path:s.path, matched:false, scopeUnchanged:true,
        historicalCommit:ORIGINAL_REGISTRY_COMMIT,
        ...additiveOtherFamilyRegistry(old,b,DE_FAMILY,bytes)});
    }
    assert.equal(sourceChecks.length, 9);
    const rq = json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json');
    // Actual central receipt validator rehashes disk, not the queue's own copy.
    const ev = overrides.rasterEvaluation ?? acceptedRasterFor(root, candidateRowsByFamily(rq).get(DE_FAMILY), {requireReceiptDeclaredCoverage:true});
    assert.equal(ev.proven, true, 'no admitted current whole-family raster');
    const r = ev.row.rasterReceipt;
    assert.equal(ev.documents.length, 2);
    assert.equal(r.documentsMeasured, 2); assert.equal(r.pagesMeasured, 6);
    assert.equal(r.coversTheWholeFamily, true);
    assert.equal(String(r.workflowRunId ?? r.runId), String(row.centralEvidence.runId));
    assert.equal(String(r.receiptArtifact?.id), String(row.centralEvidence.artifactId));
    assert.equal(r.receiptArtifact?.zipSha256?.replace(/^sha256:/,''), row.centralEvidence.zipSha256RecomputedHere);
    for (const d of outputs) {
      const match = ev.documents.find(x => x.path === d.file);
      assert.ok(match, 'raster omitted a guide output');
      assert.equal(match.actual,d.sha256);
      assert.equal(ev.row.documents.find(x => x.path === d.file)?.pageCount,3);
    }
    return {eligible:true, terminalTreatment:'GUIDANCE_READY', reviewPath:REVIEW,
      reviewSha256:hashFile(REVIEW), reviewer:doc.reviewer, sessionIdentity:doc.sessionIdentity,
      outputs, sourceChecks, rasterRunId:row.centralEvidence.runId, rasterArtifactId:r.receiptArtifact.id,
      reviewAuthoredByIntegrator:false, packetBytesChanged:false,
      runtimeInstalled:false, filingPermitted:false, paymentEligible:false,sponsorshipEligible:false};
  } catch (e) {return {eligible:false,reason:e.message,reviewPath:REVIEW};}
}

function assessCurrentDeReviewedGuidance(root, returned, overrides = {}) {
  const bytes = overrides.readBytes ?? (relative => fs.readFileSync(path.join(root, relative)));
  const json = relative => JSON.parse(bytes(relative));
  const historical = overrides.readHistorical ?? ((commit, relative) => execFileSync('git', ['show', `${commit}:${relative}`],
    {cwd: root, maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'ignore']}));
  try {
    assert.equal(returned.evidencePath, CURRENT_REVIEW);
    assert.equal(returned.familyId, DE_FAMILY);
    assert.equal(returned.verdict, 'PASS_COMPLETE_INDEPENDENT');
    assert.equal(returned.isIndependentVerification, true);
    assert.match(returned.verifiedAtBase, /^[0-9a-f]{40}$/);
    const doc = json(CURRENT_REVIEW);
    assert.equal(doc.schemaVersion, 'rcap-verifier-rows/v2');
    assert.equal(doc.laneKind, 'independent-verification');
    assert.equal(doc.isIndependentVerification, true);
    assert.equal(doc.builtAnything, false);
    assert.equal(doc.repairsMade, 0);
    assert.equal(doc.packetsSelfVerified, 0);
    assert.notEqual(String(doc.lane).toUpperCase(), 'FIX07');
    assert.equal(String(doc.lane).toLowerCase(), String(returned.lane).toLowerCase());
    assert.ok(typeof doc.reviewer === 'string' && doc.reviewer.trim());
    assert.ok(typeof doc.sessionIdentity === 'string' && doc.sessionIdentity.trim());
    const rows = doc.rows.filter(row => (row.familyId ?? row.itemId) === DE_FAMILY);
    assert.equal(rows.length, 1, 'current review must carry one exact family row');
    const row = rows[0];
    assert.equal(row.itemId, DE_FAMILY);
    assert.equal(row.verdict, 'PASS_COMPLETE_INDEPENDENT');
    assert.equal(row.verifiedAtBase, returned.verifiedAtBase);
    assert.equal(doc.verifiedAtBase, returned.verifiedAtBase);
    assert.equal(doc.actualHeadAtReview, returned.verifiedAtBase);
    assert.equal(row.reviewer, doc.reviewer);
    assert.equal(row.sessionIdentity, doc.sessionIdentity);
    assert.equal(row.builtThisFamily, false);
    assert.equal(row.selfVerified, false);
    assert.equal(row.packetsSelfVerified, 0);
    assert.deepEqual(row.routeKeys, [DE_ROUTE]);
    assert.equal(row.familyDirectory, DE_DIRECTORY);
    assert.equal(row.allRequiredObligationsScored, OBLIGATIONS.length);
    assert.deepEqual(row.obligationSummary, {PASS: 15, FAIL: 0, NOT_MEASURABLE_HERE: 0, BLOCKED_LEGAL_INPUT: 0});
    assert.deepEqual(row.failedObligations, []);
    assert.deepEqual(row.unmeasuredObligations ?? [], []);
    for (const obligation of OBLIGATIONS) {
      assert.equal(row.proofObligations?.[obligation]?.result, 'PASS', `${obligation} not passed`);
      assert.equal(row.proofObligations?.[obligation]?.measured, true, `${obligation} not measured`);
    }
    const counters = ['knownRequiredFieldsMissing', 'requiredFactsNotCollected', 'unclassifiedBlanks',
      'incompleteRows', 'requiredOptionsMissing', 'requiredComponentsMissing', 'invisibleWrites', 'protectedWrites', 'visualDefects'];
    assert.equal(row.nineCounters?.measuredHere, true);
    assert.equal(row.nineCounters?.allZero, true);
    for (const counter of counters) assert.equal(row.nineCounters[counter], 0, `${counter} is not zero`);

    const currentFamily = overrides.currentFamily ?? json('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json').families.find(f => f.familyId === DE_FAMILY);
    assert.equal(currentFamily.familyId, DE_FAMILY);
    assert.equal(currentFamily.directory, DE_DIRECTORY);
    assert.deepEqual(currentFamily.routeKeys, [DE_ROUTE]);
    const reviewedFiles = [
      `${DE_DIRECTORY}/fixtures/canonical.pdf`, `${DE_DIRECTORY}/fixtures/boundary.pdf`,
      `${DE_DIRECTORY}/production-field-map.json`, `${DE_DIRECTORY}/reports/actual-writes.json`,
      `${DE_DIRECTORY}/reports/blanks-left-for-the-participant.json`, `${DE_DIRECTORY}/participant-instructions.md`,
      `${DE_DIRECTORY}/source-receipt.json`, `${DE_DIRECTORY}/reports/rendered-artifacts.json`,
      `${DE_DIRECTORY}/product-wiring.json`
    ];
    for (const relative of reviewedFiles) {
      if (relative === `${DE_DIRECTORY}/product-wiring.json`) {
        // Consuming this review updates its own generated review pointers. Those
        // pointers are not packet content or proof of approval; the independent
        // rows and exact source/raster checks below remain the admission evidence.
        const declaration = raw => {
          const value = JSON.parse(raw);
          for (const key of ['lastIndependentVerification', 'historicalIndependentVerification', 'independentReviewStatus'])
            delete value.binding[key];
          return value;
        };
        assert.deepEqual(declaration(bytes(relative)), declaration(historical(row.verifiedAtBase, relative)),
          `review base does not bind current delivery declaration: ${relative}`);
        continue;
      }
      assert.equal(sha(bytes(relative)), sha(historical(row.verifiedAtBase, relative)), `review base does not bind current file: ${relative}`);
    }
    assert.equal(sha(bytes(DE_DECISION)), DE_DECISION_SHA256, 'current final decision changed');
    assert.equal(sha(historical(row.verifiedAtBase, DE_DECISION)), DE_DECISION_SHA256, 'review base lacked the final decision');
    const decision = json(DE_DECISION).decisions.find(item => item.decisionId === DE_DECISION_ID);
    assert.equal(decision?.disposition, 'LEGAL_CLEAR');
    assert.deepEqual(decision.familyIds, [DE_FAMILY]);

    const report = json(`${DE_DIRECTORY}/reports/rendered-artifacts.json`);
    const receipt = json(`${DE_DIRECTORY}/source-receipt.json`);
    const wiring = json(`${DE_DIRECTORY}/product-wiring.json`);
    const expected = bindDeclaredDeGuidance(wiring, {familyId: DE_FAMILY, routeKeys: [DE_ROUTE], directory: DE_DIRECTORY, state: 'GUIDANCE_READY'},
      {report, receipt, pageCountFile: relative => pdfPageCount(bytes(relative)),
        instructions: bytes(`${DE_DIRECTORY}/participant-instructions.md`).toString('utf8'), hashFile: relative => sha(bytes(relative))});
    assert.deepEqual(wiring.proposedRepresentation.components, expected.proposedRepresentation.components);
    assert.deepEqual(wiring.proposedRepresentation.fixtureBindings, expected.proposedRepresentation.fixtureBindings);
    const outputs = report.pdfs.map(item => {
      const actual = bytes(item.file);
      const pages = pdfPageCount(actual);
      assert.equal(sha(actual), item.sha256);
      assert.equal(actual.length, item.byteLength);
      assert.equal(pages, item.pageCount);
      return {fixture: item.fixture, file: item.file, sha256: item.sha256, byteLength: actual.length, pageCount: pages};
    });
    assert.deepEqual(outputs.map(item => item.fixture).sort(), ['boundary', 'canonical']);
    const totalPages = outputs.reduce((sum, item) => sum + item.pageCount, 0);

    const declaredSources = new Map((row.sourceBindings ?? []).map(source => [source.path, source]));
    assert.equal(declaredSources.size, receipt.compositionSources.length, 'review did not bind every composition source');
    const sourceChecks = receipt.compositionSources.map(source => {
      const declared = declaredSources.get(source.path);
      assert.ok(declared, `review omitted source ${source.path}`);
      assert.equal(declared.sha256, source.sha256);
      const currentBytes = bytes(source.path);
      const historicalBytes = historical(row.verifiedAtBase, source.path);
      assert.equal(sha(historicalBytes), source.sha256, `reviewed source changed: ${source.path}`);
      const currentSha256 = sha(currentBytes);
      if (currentSha256 !== source.sha256) {
        assert.equal(source.path, SOURCE_REGISTRY, `current source changed: ${source.path}`);
        const delta = deFamilyCourtSourceDelta(historicalBytes, currentBytes, {
          proofBytes: bytes(DEFC_ADOPTION_PROOF)
        });
        return {path: source.path, sha256: source.sha256, byteLength: source.byteLength,
          matched: false, currentSha256, currentByteLength: currentBytes.length, ...delta};
      }
      return {path: source.path, sha256: source.sha256, byteLength: currentBytes.length, matched: true};
    });

    const rasterQueue = json('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json');
    const evaluation = overrides.rasterEvaluation ?? acceptedRasterFor(root, candidateRowsByFamily(rasterQueue).get(DE_FAMILY), {requireReceiptDeclaredCoverage: true});
    assert.equal(evaluation.proven, true, 'no admitted current whole-family raster');
    const raster = evaluation.row.rasterReceipt;
    assert.equal(raster.coversTheWholeFamily, true);
    assert.equal(raster.documentsMeasured, outputs.length);
    assert.equal(raster.pagesMeasured, totalPages);
    assert.equal(row.rasterAcceptance?.status, 'RASTER_PASS');
    assert.equal(String(row.rasterAcceptance.runId), String(raster.workflowRunId ?? raster.runId));
    assert.equal(row.rasterAcceptance.pdfs, outputs.length);
    assert.equal(row.rasterAcceptance.pages, totalPages);
    assert.equal(evaluation.documents.length, outputs.length);
    for (const output of outputs) {
      const measured = evaluation.documents.find(document => document.path === output.file);
      assert.ok(measured, `raster omitted ${output.fixture}`);
      assert.equal(measured.actual, output.sha256);
      const queued = evaluation.row.documents.find(document => document.path === output.file);
      assert.equal(queued?.sha256, output.sha256);
      assert.equal(queued?.pageCount, output.pageCount);
    }
    return {eligible: true, terminalTreatment: 'GUIDANCE_READY', reviewPath: CURRENT_REVIEW,
      reviewSha256: sha(bytes(CURRENT_REVIEW)), reviewer: doc.reviewer, sessionIdentity: doc.sessionIdentity,
      reviewedAtBase: row.verifiedAtBase, outputs, sourceChecks, rasterRunId: String(row.rasterAcceptance.runId),
      reviewAuthoredByIntegrator: false, packetBytesChanged: false, runtimeInstalled: false,
      filingPermitted: false, paymentEligible: false, sponsorshipEligible: false};
  } catch (error) {
    return {eligible: false, reason: error.message, reviewPath: CURRENT_REVIEW};
  }
}

export function assessDeReviewedGuidance(root, returned, overrides = {}) {
  if (returned?.familyId !== DE_FAMILY || returned.verdict !== 'PASS_COMPLETE_INDEPENDENT') return null;
  if (returned.evidencePath === CURRENT_REVIEW) return assessCurrentDeReviewedGuidance(root, returned, overrides);
  return assessLegacyDeReviewedGuidance(root, returned, overrides);
}
