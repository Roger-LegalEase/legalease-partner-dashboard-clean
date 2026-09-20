import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Translate already-verified original custody into the existing receipt ingester.
// This runs after current-byte queue generation and before the final census pass.
export function rasterCustodyIntegrationSteps(root, custodyPath) {
  const read = relative => {
    assert.equal(typeof relative, 'string');
    const absolute = path.resolve(root, relative);
    assert.ok(absolute.startsWith(path.resolve(root) + path.sep));
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  };
  const custody = read(custodyPath);
  assert.ok(custody.conclusion === 'success' ||
    (custody.partialRunAdmission === true && custody.selectedFamiliesConclusion === 'success'));
  assert.ok(Array.isArray(custody.families) && custody.families.length > 0);
  assert.equal(new Set(custody.families.map(p => p.familyId)).size, custody.families.length);
  return custody.families.map(proof => {
    assert.equal(proof.verdict, 'RASTER_PASS');
    for (const key of ['currentAndPinnedPdfHashesVerified', 'originalArtifactAndJobLogAgree', 'originalPngBytesVerified'])
      assert.equal(proof[key], true, `${proof.familyId}: ${key} must be verified`);
    assert.ok(custody.selectedFamilies.includes(proof.familyId));
    assert.equal(proof.artifact.digest, 'sha256:' + proof.archiveSha256);
    assert.equal(String(proof.artifact.workflow_run.id), String(custody.runId));
    assert.equal(proof.packetCommit, custody.inputs.commit_sha);
    const verdict = read(proof.verdictPath);
    assert.equal(verdict.familyId, proof.familyId);
    assert.equal(verdict.verdict, 'RASTER_PASS');
    assert.equal(String(verdict.workflowRunId), String(custody.runId));
    assert.equal(verdict.packetCommitSha, proof.packetCommit);
    assert.equal(verdict.pagesMeasured, proof.pagesMeasured);
    assert.deepEqual(verdict.problems, []);
    assert.deepEqual(verdict.environmentProblems, []);
    assert.ok(Number.isSafeInteger(proof.jobId) && Number.isSafeInteger(proof.artifact.id));
    return {
      name: `ingest verified original receipt: ${proof.familyId}`,
      why: 'The existing ingester checks the receipt against the newly derived current-byte queue; no admission gate is skipped.',
      argv: ['scripts/grade-a-packet-factory-24h/ingest-raster-receipt.mjs',
        '--payload', proof.verdictPath, '--job-id', String(proof.jobId),
        '--artifact-id', String(proof.artifact.id), '--artifact-name', proof.artifact.name,
        '--artifact-digest', proof.artifact.digest, '--artifact-expires', proof.artifact.expires_at,
        '--job-conclusion', 'success'],
    };
  });
}
