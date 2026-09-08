/** Family-only preparation of JDF 478's printed REQUIRED CBI recipient.
 * Keeps broad shared agency protection unchanged. Never used for an agency
 * certification, a discretionary agency, a court finding, or an attestation.
 * The original file is immutable; the prepared working copy has its own hash.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PDFDocument, PDFCheckBox, PDFName } from 'pdf-lib';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const PINS = Object.freeze({
  'JDF-477':'b9cbad7f3a66a1a952e10ad15e59d77afb9b68714465fe0e88333cf2c3159643',
  'JDF-478':'8208caab3019164f8f0671aea1f0dbcf460805d61455346887cfd1d133c0e159'
});
export async function prepareRequiredCbi(source) {
  assert.ok(Object.hasOwn(PINS, source.formNumber), 'CBI preparation accepts only the exact two Colorado forms');
  assert.equal(sha(source.bytes), PINS[source.formNumber], 'CBI original official source hash mismatch');
  const doc = await PDFDocument.load(source.bytes, {updateMetadata:false});
  const name = source.formNumber === 'JDF-477' ? '8C.0' : '478.3D.0';
  const form = doc.getForm(), field = form.getField(name);
  assert.ok(field instanceof PDFCheckBox, 'required recipient must be the pinned checkbox');
  if (source.formNumber === 'JDF-477') {
    assert.ok(field.isChecked(), 'JDF 477 required source-authored CBI mark missing');
    return {bytes:source.bytes,originalSha256:PINS[source.formNumber],preparedSha256:PINS[source.formNumber],field:name,sourceAuthored:true,changedFields:[]};
  }
  assert.ok(!field.isChecked(), 'JDF 478 source checkbox state changed');
  const before = new Map(form.getFields().map(f => [f.getName(), f.acroField.dict.toString()]));
  const widgets = field.acroField.getWidgets();
  assert.equal(widgets.length,1,'required checkbox count changed');
  const widget = widgets[0], rect=widget.getRectangle();
  const on = widget.getOnValue();
  assert.ok(on && on !== PDFName.of('Off'), 'official source has no checked appearance');
  const appearances = widget.getAppearances();
  assert.ok(appearances.normal.has(on), 'official checked appearance is absent');
  // Reuse the original checked appearance. No synthesized checkbox or mark.
  field.check();
  assert.ok(field.isChecked());
  for (const other of form.getFields()) {
    if (other.getName() !== name) assert.equal(other.acroField.dict.toString(),before.get(other.getName()),`unrelated field changed: ${other.getName()}`);
  }
  const bytes = Buffer.from(await doc.save({useObjectStreams:false, updateFieldAppearances:false}));
  const reopened=await PDFDocument.load(bytes,{updateMetadata:false});
  assert.ok(reopened.getForm().getCheckBox(name).isChecked(),'required selection did not persist');
  return {bytes,originalSha256:PINS[source.formNumber],preparedSha256:sha(bytes),field:name,sourceAuthored:false,changedFields:[name],rect,
    basis:'JDF 478 page 1 section 3 prints Colorado Bureau of Investigation (required). Only that recipient selection is set using its original on appearance.'};
}
