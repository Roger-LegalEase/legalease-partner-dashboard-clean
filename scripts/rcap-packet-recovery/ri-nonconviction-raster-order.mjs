import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Preserve the ordered identity that the original RI run actually rendered.
// A changed role, path, hash or member count follows normal invalidation instead.
export function retainRiNonconvictionRasterOrder(familyId, documents, receipt) {
  if (familyId !== 'ri_nonconviction_sealing-set') return documents;
  if (!receipt || receipt.familyId !== familyId || receipt.verdict !== 'RASTER_PASS'
      || receipt.workflowRunId !== '34602562081'
      || receipt.problems?.length || receipt.environmentProblems?.length) return documents;
  return retainProvenOrder(documents, receipt, 'RI');
}

function retainProvenOrder(documents, receipt, label) {
  const key = d => JSON.stringify([d.role, d.path, d.sha256 ?? d.pinned]);
  const rendered = receipt.documentsRendered;
  if (!Array.isArray(rendered) || rendered.length !== documents.length) return documents;
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(rendered.map(d => [d.role, d.path, d.pinned]))).digest('hex'),
    receipt.documentsDigest, `Original ${label} ordered digest disagrees with its own document list`);
  const current = new Map(documents.map(d => [key(d), d]));
  const original = rendered.map(key);
  assert.equal(current.size, documents.length, `Duplicate current ${label} raster document`);
  assert.equal(new Set(original).size, original.length, `Duplicate original ${label} raster document`);
  if (!original.every(k => current.has(k))) return documents;
  return original.map(k => current.get(k));
}

// This exception retains only the enumeration proven by the original Act 346 run.
// It neither changes document discovery/coverage nor supplies historical objects.
export function retainAct346RasterOrder(familyId, documents, receipt, manifest, custody) {
  if (familyId !== 'ar-act346-set') return documents;
  if (!receipt || receipt.familyId !== familyId || receipt.workflowRunId !== '34732930032'
      || receipt.verdict !== 'RASTER_PASS') return documents;
  assert.deepEqual(receipt.problems, []);
  assert.deepEqual(receipt.environmentProblems, []);
  assert.equal(receipt.coversTheWholeFamily, true);
  assert.equal(receipt.packetPdfsModified, 0);
  assert.equal(manifest?.familyId, familyId);
  assert.equal(manifest.coverage?.complete, true);
  for (const role of ['canonical', 'boundary']) {
    assert.equal(receipt.hashesBound?.[role]?.path, manifest[`${role}PdfPath`]);
    assert.equal(receipt.hashesBound?.[role]?.pinned, manifest[`${role}PdfSha256`]);
    assert.ok(receipt.documentsRendered.some(d => d.role === role
      && d.path === receipt.hashesBound[role].path && d.pinned === receipt.hashesBound[role].pinned));
  }
  assert.equal(custody?.runId, 34732930032);
  assert.equal(custody.conclusion, 'success');
  assert.equal(custody.runStatusAtVerification, 'completed');
  assert.deepEqual(custody.inputs, {
    commit_sha: 'ad98a571b8507f68371240c2d429e1207054eb9e',
    raster_manifest_path: 'data/rcap-grade-a/packet-factory-24h/fix112/ar-act346-current-raster-manifest-20260912.json',
    family_batch: familyId,
    requested_scale: '2.5'
  });
  assert.equal(custody.selectedFamiliesConclusion, 'success');
  assert.equal(custody.partialRunAdmission, false);
  assert.deepEqual(custody.excludedJobFailures, []);
  assert.deepEqual(custody.selectedFamilies, [familyId]);
  assert.ok(custody.selectedFamilies.includes(familyId));
  const proofs = custody.families.filter(p => p.familyId === familyId);
  assert.equal(proofs.length, 1);
  const proof = proofs[0];
  assert.equal(proof.verdict, 'RASTER_PASS');
  for (const key of ['currentAndPinnedPdfHashesVerified', 'originalArtifactAndJobLogAgree', 'originalPngBytesVerified'])
    assert.equal(proof[key], true);
  assert.equal(proof.packetCommit, receipt.packetCommitSha);
  assert.equal(proof.packetCommit, custody.inputs.commit_sha);
  assert.equal(proof.pagesMeasured, receipt.pagesMeasured);
  assert.equal(proof.artifact.id, 10309667574);
  assert.equal(proof.jobId, 103659416593);
  assert.equal(String(proof.artifact.workflow_run.id), receipt.workflowRunId);
  assert.equal(proof.artifact.digest, 'sha256:' + proof.archiveSha256);
  assert.equal(proof.verdictPath, 'data/rcap-grade-a/packet-factory-24h/raster-runs/34732930032/ar-act346-set.verdict.json');
  const tuples = docs => docs.map(d => [d.role, d.path, d.sha256 ?? d.pinned]);
  assert.deepEqual(tuples(manifest.documents), tuples(receipt.documentsRendered));
  assert.equal(manifest.documentsDigest, receipt.documentsDigest);
  return retainProvenOrder(documents, receipt, 'Act346');
}
