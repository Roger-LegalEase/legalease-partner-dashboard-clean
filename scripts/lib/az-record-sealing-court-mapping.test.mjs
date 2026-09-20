import assert from 'node:assert/strict';
import { mapArizonaRecordSealingCourt } from './az-record-sealing-court-mapping.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PDFDocument, PDFName } from 'pdf-lib';
import { markSituation } from './az-record-sealing-official-builder.mjs';

assert.deepEqual(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_arrest_no_charges-set',
  record: { noChargesFiled: true, initialAppearanceOccurred: true, initialAppearanceCourt: 'Maricopa County Superior Court' }
}), { status: 'ROUTED', court: 'Maricopa County Superior Court', basis: 'initial-appearance record identifies the court' });
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_arrest_no_charges-set',
  record: { noChargesFiled: true, initialAppearanceOccurred: true }
}).status, 'AMBIGUOUS');
assert.deepEqual(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_arrest_no_charges-set',
  record: { noChargesFiled: true, initialAppearanceOccurred: false, countyOfArrest: 'Pima' }
}), { status: 'ROUTED', court: 'Superior Court of Pima County', basis: 'record establishes no initial appearance and county of arrest' });
assert.deepEqual(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_dismissal_not_guilty-set',
  record: { justiceCourtComplaintFollowedByInformation: true, chargingInstrumentProgression: 'justice_complaint_then_information', superiorCourt: 'Pima County Superior Court' }
}), { status: 'ROUTED', court: 'Pima County Superior Court', basis: 'justice-court complaint followed by an information; superior court identified' });
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_dismissal_not_guilty-set',
  record: { justiceCourtComplaintFollowedByInformation: true, chargingInstrumentProgression: 'justice_complaint_then_information' }
}).status, 'AMBIGUOUS');
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_dismissal_not_guilty-set',
  record: { justiceCourtComplaintFollowedByInformation: false, chargingInstrumentProgression: 'direct_charging_document' }
}).status, 'AMBIGUOUS');
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_arrest_no_charges-set',
  record: { initialAppearanceOccurred: false, countyOfArrest: 'Pima' }
}).status, 'AMBIGUOUS');
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_arrest_no_charges-set',
  record: { noChargesFiled: false, initialAppearanceOccurred: false, countyOfArrest: 'Pima' }
}).status, 'AMBIGUOUS');
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_dismissal_not_guilty-set',
  record: { justiceCourtComplaintFollowedByInformation: true, chargingInstrumentProgression: 'direct_charging_document', superiorCourt: 'Pima' }
}).status, 'AMBIGUOUS');
assert.equal(mapArizonaRecordSealingCourt({
  familyId: 'az_record_sealing_dismissal_not_guilty-set',
  record: { justiceCourtComplaintFollowedByInformation: true, chargingInstrumentProgression: 'justice_complaint_then_information', superiorCourt: 'Pima' }
}).status, 'ROUTED');

// Bind the situation-state test to the actual pinned official petition source.
const source = path.resolve('private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/AZ/02_PACKET_FORMS/AZ__FORM__AOCCRSL1F-050825__petition-to-seal-criminal-case-records__REV-2025-05-08__EN.pdf');
const sourceBytes = fs.readFileSync(source);
assert.equal(sourceBytes.length, 299110);
assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'), '32c1e54d8a4135cfefe5d85d25f62afdb7c212f6a475e18664188524de34db05');
const sourceText = (await import('node:child_process')).execFileSync('pdftotext', [source, '-'], { encoding: 'utf8' });
assert.match(sourceText, /I was arrested[\s\S]*no charges/i);
assert.match(sourceText, /I was charged[\s\S]*dismissed or resulted in a not guilty/i);
assert.match(sourceText, /I was charged[\s\S]*judgment of guilt/i);
for (const state of ['1', '2', '3']) {
  const doc = await PDFDocument.load(sourceBytes);
  const form = doc.getForm();
  const field = form.getCheckBox('Check Box9');
  const widgets = field.acroField.getWidgets();
  assert.equal(widgets.length, 3);
  assert.deepEqual(widgets.map(w => w.getOnValue()?.decodeText()), ['1', '2', '3']);
  const evidence = markSituation(form, state, []);
  assert.equal(field.acroField.dict.get(PDFName.of('V')).decodeText(), state);
  assert.deepEqual(evidence.map(w => w.appearanceState), ['1', '2', '3'].map(v => v === state ? state : 'Off'));
  assert.deepEqual(evidence.map(w => w.onState), ['1', '2', '3']);
  for (const control of ['Check Box2', 'Check Box4']) {
    const controls = form.getCheckBox(control).acroField.getWidgets();
    assert.ok(controls.length > 0, `${control} missing from source`);
    assert.ok(controls.every(w => !w.dict.get(PDFName.of('AS')) || w.dict.get(PDFName.of('AS')).decodeText() === 'Off'), `${control} must remain off`);
  }
}
const invalidDoc = await PDFDocument.load(sourceBytes);
assert.throws(() => markSituation(invalidDoc.getForm(), '4', []), /source-defined Check Box9 state/);
console.log('AZ record-sealing court mapping tests passed');
