import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const ORIGINAL_RUNS = {
  'ca-17b-reduction-set': '34690713553',
  'pa_6308_underage-set': '34692245137',
  'rcap-or-official-pdf-fill': '34707426827',
};
const digest = documents => crypto.createHash('sha256')
  .update(JSON.stringify(documents.map(d => [d.role, d.path, d.sha256 ?? d.pinned]))).digest('hex');
const fixture = role => /^(canonical|boundary)(?:-|$)/.exec(role)?.[1];

// The successful batch named each form in its role. Ordinary discovery uses
// one role per fixture. Preserve that original identity only for the complete,
// unchanged set; any byte, page-count, fixture or membership change follows
// normal receipt invalidation. Never rewrite the original receipt.
export function retainCa17RasterIdentity(row, manifest, receipt) {
  const RUN = ORIGINAL_RUNS[row.familyId];
  if (!RUN || manifest?.familyId !== row.familyId
      || receipt?.familyId !== row.familyId || receipt.verdict !== 'RASTER_PASS'
      || String(receipt.workflowRunId) !== RUN
      || receipt.problems?.length || receipt.environmentProblems?.length) return row;
  assert.equal(digest(receipt.documentsRendered), receipt.documentsDigest);
  assert.equal(digest(manifest.documents), receipt.documentsDigest);
  assert.equal(manifest.documentsDigest, receipt.documentsDigest);
  const key = d => JSON.stringify([fixture(d.role), d.path, d.sha256, d.pageCount]);
  const current = new Map(row.documents.map(d => [key(d), d]));
  const expected = manifest.documents.map(key);
  if (current.size !== row.documents.length || new Set(expected).size !== expected.length
      || expected.length !== current.size || !expected.every(k => current.has(k))) return row;
  for (const role of ['canonical', 'boundary']) {
    if (row[`${role}PdfPath`] !== manifest[`${role}PdfPath`]
        || row[`${role}PdfSha256`] !== manifest[`${role}PdfSha256`]
        || receipt.hashesBound?.[role]?.pinned !== row[`${role}PdfSha256`]) return row;
  }
  const names = new Map();
  const documents = manifest.documents.map((original, i) => {
    const discovered = current.get(expected[i]);
    names.set(discovered.name, original.name);
    return { ...discovered, name: original.name, role: original.role };
  });
  const coverage = { ...row.coverage };
  for (const field of ['documents', 'rastered', 'notRastered', 'notRenderedByThisGate']) {
    if (Array.isArray(coverage[field])) coverage[field] = coverage[field].map(name => names.get(name) ?? name);
  }
  return { ...row, documents, documentsDigest: digest(documents), coverage,
    originalDocumentIdentity: { workflowRunId: RUN,
      basis: 'Exact complete path/hash/page-count/fixture set matches the original batch; retain its role and document names.' } };
}
