/** Integrate an independently reviewed non-filed guide, never a filing or
 * runtime grant. Recheck bytes and every bound source; do not author a review. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {acceptedRasterFor, candidateRowsByFamily} from './acceptance-identity.mjs';
import {bindDeclaredDeGuidance, DE_FAMILY, DE_ROUTE} from './de-guidance-binding.mjs';
import {chatRowProblem} from './chat-review-inputs.mjs';
const OBLIGATIONS = ['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS',
  'REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS',
  'PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const SOURCE_REGISTRY = 'data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const ORIGINAL_REGISTRY_COMMIT = 'c6af0d84134216c5d0757e5543ccf3fcaa42f19c';
const REVIEW = 'data/rcap-grade-a/chat-parallel-2026-09-07/review/de-current-review-reconciliation.json';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const blob = b => crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');

// The historical receipt accurately describes its old whole-registry bytes.
// Appending an unrelated family does not change an existing family's source.
// Any edit/removal/reordering of old data, or an added same-family entry,
// refuses. No hash is silently rewritten in the author's source receipt.
export function additiveOtherFamilyRegistry(oldBytes, currentBytes, familyId) {
  const old = JSON.parse(oldBytes), now = JSON.parse(currentBytes);
  const a = old.reconciliation42, b = now.reconciliation42;
  assert.ok(a && b, 'missing structured source determination');
  const additions = [];
  for (const key of ['families', 'acquisitionEvidencePaths']) {
    assert.ok(Array.isArray(a[key]) && Array.isArray(b[key]));
    assert.ok(b[key].length >= a[key].length, 'source entries removed');
    assert.deepEqual(b[key].slice(0, a[key].length), a[key], 'existing source determination changed');
    if (key === 'families') {
      for (const r of b[key].slice(a[key].length)) {
        assert.equal(typeof r.familyId, 'string');
        assert.notEqual(r.familyId, familyId, 'same-family source determination added');
        assert.ok(!a[key].some(x => x.familyId === r.familyId), 'existing family replaced');
        assert.equal(typeof r.evidencePath, 'string');
        additions.push(r);
      }
    }
  }
  assert.ok(additions.length > 0, 'no unrelated family addition explains this hash change');
  const addedPaths = b.acquisitionEvidencePaths.slice(a.acquisitionEvidencePaths.length);
  assert.ok(addedPaths.every(p => additions.some(r => r.evidencePath === p)), 'unexplained source evidence addition');
  const normal = structuredClone(now);
  normal.reconciliation42.families = a.families;
  normal.reconciliation42.acquisitionEvidencePaths = a.acquisitionEvidencePaths;
  assert.deepEqual(normal, old, 'other source registry content changed');
  return {comparison: 'all prior structured content identical; only other-family entries appended',
    pinnedSha256: sha(oldBytes), currentSha256: sha(currentBytes),
    unchangedPriorFamilyEntries: a.families.length,
    appendedFamilyIds: additions.map(r => r.familyId), addedEvidencePaths: addedPaths};
}

export function assessDeReviewedGuidance(root, returned, overrides = {}) {
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
      {report,receipt,instructions:bytes(`${directory}/participant-instructions.md`).toString('utf8'),hashFile});
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
        ...additiveOtherFamilyRegistry(old,b,DE_FAMILY)});
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
