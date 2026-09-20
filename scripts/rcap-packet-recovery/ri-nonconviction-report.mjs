import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { MIN_READABLE_FONT_SIZE, usableWidthOf } from '../rcap-official-forms/rcap-text-fitting.mjs';

const directory = 'data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// The finalizer's raw fallback categories are diagnostic output, not authority
// over this family's source-grounded field declarations or measured fit result.
export function reconcileRiRefusals(report, fieldMap, font) {
  assert.equal(report.familyId, 'ri_nonconviction_sealing-set');
  assert.equal(fieldMap.familyId, report.familyId);
  const corrected = [];
  for (const artifact of report.artifacts) {
    const document = fieldMap.documents.find(d => d.documentId === artifact.documentId);
    assert.ok(document, 'Missing document field map');
    for (const refusal of artifact.refused) {
      const field = document.fields.find(f => f.field === refusal.field);
      const held = artifact.heldButNotPrinted.find(f => f.field === refusal.field);
      let reason, category, basis;
      if (['1 Counts 1', '3 Dispositions 1'].includes(refusal.field)) {
        assert.equal(field?.requiredBeforeFiling, true);
        assert.equal(field.refusalClass, null);
        assert.equal(field.factId, null);
        reason = 'required_before_filing';
        category = 'participant_case_fact';
        basis = field.reason;
      } else if (refusal.field === '2 Charges 1') {
        assert.equal(field?.factId, 'matter.charge');
        assert.equal(held?.reason, artifact.fixture === 'canonical'
          ? 'withheld_for_row_integrity' : 'value_exceeds_widget_width_at_minimum_font');
        assert.ok(held.valueHeld);
        reason = held.reason;
        category = artifact.fixture === 'canonical' ? 'row_integrity' : 'unfittable';
        basis = held.why;
      } else if (refusal.field === 'Case Number_2' && artifact.fixture === 'boundary') {
        assert.equal(held?.reason, 'value_exceeds_widget_width_at_minimum_font');
        reason = held.reason;
        category = 'unfittable';
        basis = held.why;
      } else continue;
      if (category === 'unfittable') {
        const required = font.widthOfTextAtSize(held.valueHeld, MIN_READABLE_FONT_SIZE);
        const available = usableWidthOf(field.widgets[0].rect);
        assert.ok(required > available, 'Recorded width refusal is not reproduced');
        refusal.fitMeasurement = { requiredWidthPt: required, usableWidthPt: available,
          minimumFontSize: MIN_READABLE_FONT_SIZE, font: 'Helvetica' };
      }
      assert.ok(!artifact.written.some(w => w.field === refusal.field), 'Refusal contradicts an actual write');
      if (refusal.reason !== reason || refusal.category !== category) {
        refusal.rawFinalizerDiagnostic ??= { reason: refusal.reason, category: refusal.category };
        refusal.reason = reason;
        refusal.category = category;
        refusal.classificationBasis = basis;
        corrected.push({fixture: artifact.fixture, field: refusal.field, reason, category});
      }
    }
  }
  return corrected;
}

export async function repairRiNonconvictionReport() {
  const file = `${directory}/reports/actual-writes.json`;
  const report = JSON.parse(fs.readFileSync(file));
  const fieldMap = JSON.parse(fs.readFileSync(`${directory}/production-field-map.json`));
  // Never repair metadata describing different packet bytes.
  for (const artifact of report.artifacts) {
    const bytes = fs.readFileSync(artifact.file);
    assert.equal(hash(bytes), artifact.sha256);
    assert.equal(bytes.length, artifact.byteLength);
  }
  const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const corrected = reconcileRiRefusals(report, fieldMap, font);
  if (corrected.length) fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  return {familyId: report.familyId, corrected, packetBytesChanged: false};
}
