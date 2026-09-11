import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Preserve the ordered identity that the original RI run actually rendered.
// A changed role, path, hash or member count follows normal invalidation instead.
export function retainRiNonconvictionRasterOrder(familyId, documents, receipt) {
  if (familyId !== 'ri_nonconviction_sealing-set') return documents;
  if (!receipt || receipt.familyId !== familyId || receipt.verdict !== 'RASTER_PASS'
      || receipt.workflowRunId !== '34602562081'
      || receipt.problems?.length || receipt.environmentProblems?.length) return documents;
  const key = d => JSON.stringify([d.role, d.path, d.sha256 ?? d.pinned]);
  const rendered = receipt.documentsRendered;
  if (!Array.isArray(rendered) || rendered.length !== documents.length) return documents;
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(rendered.map(d => [d.role, d.path, d.pinned]))).digest('hex'),
    receipt.documentsDigest, 'Original RI ordered digest disagrees with its own document list');
  const current = new Map(documents.map(d => [key(d), d]));
  const original = rendered.map(key);
  assert.equal(current.size, documents.length, 'Duplicate current RI raster document');
  assert.equal(new Set(original).size, original.length, 'Duplicate original RI raster document');
  if (!original.every(k => current.has(k))) return documents;
  return original.map(k => current.get(k));
}
