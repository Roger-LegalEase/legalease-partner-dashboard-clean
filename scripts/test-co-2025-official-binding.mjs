import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs',import.meta.url);
const {mergeFacts}=await import('../src/lib/rcap/state-packs/colorado/official-forms/derived-facts.ts');
const {bindField}=await import('../src/lib/rcap/state-packs/colorado/official-forms/bind.ts');
const {JDF_612_AUTHORED}=await import('../src/lib/rcap/state-packs/colorado/official-forms/jdf-612.authored.ts');
const caption={...JDF_612_AUTHORED.fields.find(f=>f.field==='D/C'),control:'text',condition:null,protectedCategory:null,maxLength:null,repeatIndex:null};
const base={'matter.division':'Division 12','matter.courtroom':'Courtroom 5H','service.mail_recipient_name_and_address':'Office, full address'};
let checks=0;
const run=(facts,spec=JDF_612_AUTHORED)=>{const saved=structuredClone(facts);const merged=mergeFacts(spec,facts);assert.deepEqual(facts,saved);checks++;return merged;};
const joined=run(base);assert.equal(joined['matter.division_or_courtroom'],'Division 12 / Courtroom 5H');
assert.equal(bindField(caption,joined).value,'Division 12 / Courtroom 5H');
for(const key of ['matter.division','matter.courtroom'])for(const missing of [undefined,'',' ','unknown-type']){
  const facts={...base};if(missing===undefined)delete facts[key];else facts[key]=missing==='unknown-type'?['invalid']:missing;
  const merged=run(facts);assert.equal(merged['matter.division_or_courtroom'],undefined);assert.equal(bindField(caption,merged).refusal,'fact_not_supplied');
}
assert.equal(run({...base,'matter.division_or_courtroom':'Owned combined caption'})['matter.division_or_courtroom'],'Owned combined caption');
assert.equal(run({...base,'matter.division_or_courtroom':'  '})['matter.division_or_courtroom'],'Division 12 / Courtroom 5H');
assert.equal(run(base,{...JDF_612_AUTHORED,revision:'REV-2024-08-07'})['matter.division_or_courtroom'],undefined);
assert.equal(run(base,{...JDF_612_AUTHORED,documentId:'JDF-417'})['matter.division_or_courtroom'],undefined);
for(const name of ['CoS_Name','CoS_Address']){
  const authored=JDF_612_AUTHORED.fields.find(f=>f.field===name);
  const field={...authored,control:'text',protectedCategory:null,maxLength:null,repeatIndex:null};
  assert.equal(bindField(field,run({...base,'service.method':'regular_mail'})).refusal,'fact_not_supplied');
}
assert.throws(()=>mergeFacts(JDF_612_AUTHORED,{...base,'derived.cbi_required':'no'}),/may not set document-derived/);
console.log(JSON.stringify({status:'PASS',savedInputChecks:checks,captionJoin:true,missingInputsRefused:true,explicitCombinedPreserved:true,otherRevisionsAndFormsUnchanged:true,serviceAddressNotParsed:true}));

const { currentSourceCensus, loadFamilyContext, sha256 } = await import('../src/lib/rcap/state-packs/colorado/official-forms/pipeline.ts');
const { SPECIFIED_FAMILIES } = await import('../src/lib/rcap/state-packs/colorado/official-forms/families.ts');
const { bindForm } = await import('../src/lib/rcap/state-packs/colorado/official-forms/bind.ts');
const { extractTextItems } = await import('./rcap-official-forms/rcap-pdf-anchor-capture.mjs');
const family = SPECIFIED_FAMILIES.find(f => f.authored.documentId === 'JDF-612');
const context = await loadFamilyContext(process.cwd(), family);
assert.equal(context.spec.fieldCount, 64);
assert.deepEqual(context.spec.fields.filter(f => f.fieldClass === 'protected').map(f => f.field).sort(), ['Sig', 'Sig_Aty', 'Sig_Date']);
const plan = facts => {
  const saved = structuredClone(facts);
  const outcomes = bindForm(context.spec, mergeFacts(context.spec, facts), context.specSha256).outcomes;
  assert.deepEqual(facts, saved);
  return Object.fromEntries(outcomes.map(o => [o.field, o]));
};
const positive = plan(family.fixtures.canonical);
for (const field of context.spec.fields.filter(f => f.requiredInCanonicalFixture)) assert(positive[field.field].written, field.field);
for (const [field, fact] of Object.entries({ '∆ Street Address': 'participant.street_address', '∆ CSZ': 'participant.city_state_zip', '4D.2': 'service.law_enforcement_1_address', '4E.2': 'service.law_enforcement_2_address', '3F.2': 'service.other_agency_1_address', '3G.2': 'service.other_agency_2_address', CoS_Name: 'service.mail_recipient_name', CoS_Address: 'service.mail_recipient_address' })) {
  if (family.fixtures.canonical[fact]) assert.equal(positive[field].value, family.fixtures.canonical[fact]);
}
let elections = 0;
for (const field of context.spec.fields.filter(f => ['radio', 'dropdown'].includes(f.control))) {
  for (const option of field.options) {
    const facts = { ...family.fixtures.canonical, [field.factId]: option.selectsWhenFactEquals };
    if (field.condition) facts[field.condition.factId] = field.condition.equals;
    assert.equal(plan(facts)[field.field].value, option.label, field.field);
    elections++;
  }
}
const uncertain = plan({ ...family.fixtures.canonical, 'election.interpreter_needed': 'unknown', 'election.appearance_mode': 'unknown', 'matter.court_type': 'unknown' });
for (const field of ['Court', 'Group_Interp', 'Group_Event']) assert.equal(uncertain[field].refusal, 'value_not_an_offered_option');
assert.equal(uncertain.Language.refusal, 'condition_not_met');
const inactive = plan({ ...family.fixtures.canonical, 'election.interpreter_needed': 'no', 'service.method': 'other' });
for (const field of ['Language', 'CoS_Name', 'CoS_Address']) assert.equal(inactive[field].refusal, 'condition_not_met');
assert.deepEqual(Object.values(plan(family.fixtures.negative)).filter(o => o.written).map(o => o.field).sort(), ['3C', 'County']);

// Read the flattened bytes, including font sizes; a binding plan cannot prove appearance.
const reports = JSON.parse(fs.readFileSync(path.join(context.familyDir, 'reports/current-fixtures.json'))).fixtures;
let renderedTextChecks = 0;
for (const report of reports) {
  const bytes = fs.readFileSync(path.join(context.familyDir, `fixtures/${report.fixture}-filled.pdf`));
  assert.equal(sha256(bytes), report.outputSha256);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), 5);
  assert.equal(pdf.getForm().getFields().length, 0);
  const pages = pdf.getPages().map(page => extractTextItems(page));
  for (const write of report.textWrites) {
    const field = context.spec.fields.find(f => f.field === write.field);
    for (const anchor of field.anchors) {
      const items = pages[anchor.page - 1].filter(item => item.x >= anchor.rect.x - 1 && item.x <= anchor.rect.x + anchor.rect.width + 1 && item.y >= anchor.rect.y - 2 && item.y <= anchor.rect.y + anchor.rect.height + 2);
      const normal = text => text.replace(/\s+/g, '').toLowerCase();
      assert(normal(items.map(item => item.text).join(' ')).includes(normal(write.value)), `${report.fixture}/${write.field}: value visible in its own widget`);
      for (const item of items.filter(item => item.text.trim())) assert(item.size >= 6 && item.size <= 11, `${report.fixture}/${write.field}: readable fitted font ${item.size}`);
      renderedTextChecks++;
    }
  }
  assert.deepEqual(report.refused.map(r => r.field).sort(), report.fixture === 'boundary' ? ['3Z.1', 'Case Number'] : []);
  for (const field of ['Sig', 'Sig_Date', 'Sig_Aty']) assert(!report.writtenFields.includes(field));
}
const orderDir = 'data/rcap-all50/overlays/production/colorado/jdf-615-form-order-en';
const orderSource = JSON.parse(fs.readFileSync(`${orderDir}/source-record.json`));
const orderBytes = fs.readFileSync(orderSource.sourcePath);
const orderCensus = await currentSourceCensus(orderBytes, orderSource.sha256);
assert.equal(orderCensus.fieldCount, 21);
assert.deepEqual(JSON.parse(fs.readFileSync(`${orderDir}/field-census.json`)), { schemaVersion: 'rcap-field-census/v3-first-hand', ...orderCensus });
assert.deepEqual(JSON.parse(fs.readFileSync(`${orderDir}/reports/protected-fields.json`)).unwritableFields.map(f => f.field), orderCensus.fields.map(f => f.name));
assert.equal(orderCensus.fields.find(f => f.name === '∆').widgets.length, 2);
await assert.rejects(() => currentSourceCensus(Buffer.concat([orderBytes, Buffer.from('drift')]), orderSource.sha256), /source drift/);
console.log(JSON.stringify({ status: 'PASS', fields: 64, elections, renderedTextChecks, orderFieldsProtected: 21, sourceDriftRefused: true }));
