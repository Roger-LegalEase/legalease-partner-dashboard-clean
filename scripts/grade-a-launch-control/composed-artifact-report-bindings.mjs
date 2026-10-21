import crypto from 'node:crypto';
// Adapter for the two existing native v1 composed-report identities. It creates
// no approval; reconciliation still requires the exact native approval digest.
const FAMILIES = new Map([
  ['wy_fel_1502-set', 'data/rcap-all50/overlays/census-v1/wy/wy-fel-1502-set--custom-pleading'],
  ['dc_innocence_expungement-set', 'data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading']
]);
export function composedArtifactReportBindings({ familyId, directory, report, readBytes }) {
  const refuse = reason => ({ packets: [], refusal: reason, bytesVerified: false });
  if (!FAMILIES.has(familyId)) return refuse('No bounded composed-report adapter for this family.');
  if (directory !== FAMILIES.get(familyId) || report?.familyId !== familyId) return refuse('Exact family/directory identity mismatch.');
  if (report.schemaVersion !== 'rcap-rendered-artifacts/v1' || report.renderedFresh !== true || report.derivedFromBytes !== true || report.byteDerivedHashes !== true) return refuse('Native byte-derived report contract absent.');
  if (!Array.isArray(report.packets) || report.packets.length !== 2 || !Array.isArray(report.componentSet) || !report.componentSet.length || new Set(report.componentSet).size !== report.componentSet.length) return refuse('Native component-only packet inventory absent.');
  if (!Array.isArray(report.pdfs) || !Array.isArray(report.artifacts) || report.pdfs.length !== 2 || report.artifacts.length !== 2) return refuse('Exact canonical/boundary inventory absent.');
  const packets = [];
  for (const fixture of ['canonical', 'boundary']) {
    const pdfs = report.pdfs.filter(p => p.fixture === fixture);
    const artifacts = report.artifacts.filter(p => p.fixture === fixture);
    if (pdfs.length !== 1 || artifacts.length !== 1) return refuse('Missing or duplicate fixture.');
    const metadata = report.packets.filter(p => p.fixture === fixture);
    if (metadata.length !== 1 || metadata[0].sha256 !== undefined || !Array.isArray(metadata[0].documents) || JSON.stringify(metadata[0].documents) !== JSON.stringify(report.componentSet)) return refuse('Component-only packet metadata is missing, ambiguous, or incomplete.');
    const pdf = pdfs[0], artifact = artifacts[0];
    const file = `${directory}/fixtures/${fixture}.pdf`;
    if (pdf.file !== file || artifact.file !== file || pdf.documentId !== 'assembled_packet' || pdf.role !== 'assembled_packet_of_composed_pleadings') return refuse('Whole-packet file identity mismatch.');
    if (!/^[a-f0-9]{64}$/.test(pdf.sha256 ?? '') || !Number.isInteger(pdf.byteLength) || pdf.byteLength <= 0 || !Number.isInteger(pdf.pageCount) || pdf.pageCount <= 0) return refuse('Incomplete recorded packet identity.');
    if (['sha256','byteLength','pageCount'].some(k => pdf[k] !== artifact[k])) return refuse('Native pdfs/artifacts identities disagree.');
    if (!Array.isArray(artifact.pageManifest) || artifact.pageManifest.length !== pdf.pageCount || artifact.pageManifest.some((p,i) => p.packetPage !== i + 1)) return refuse('Recorded whole-packet page inventory is incomplete.');
    let bytes;
    try { bytes = readBytes(file); } catch { return refuse('Current packet bytes unavailable.'); }
    if (!Buffer.isBuffer(bytes) || bytes.length !== pdf.byteLength || bytes.subarray(0,5).toString() !== '%PDF-' || crypto.createHash('sha256').update(bytes).digest('hex') !== pdf.sha256) return refuse('Current packet bytes do not match report.');
    packets.push({ fixture, file, sha256: pdf.sha256, byteLength: pdf.byteLength, pageCount: pdf.pageCount });
  }
  return { packets, refusal: null, bytesVerified: true,
    measurementScope: 'Current saved whole-PDF bytes match both native pdfs/artifacts records. Page count is the matched report value; no new render, visual review, or approval.' };
}
