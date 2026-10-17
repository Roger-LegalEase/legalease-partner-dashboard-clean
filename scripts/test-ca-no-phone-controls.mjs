import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const providerUrl = pathToFileURL(path.resolve('src/components/expungement-ai/LocalizationProvider.tsx')).href;
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), {
  data: { url: providerUrl, source: 'export function useLocalization(){return {locale:globalThis.__caPhoneLocale}}' }
});
const C = await import('../src/lib/expungement-ai/ca-prop64-contact-answer.ts');
const { FilingContactFields } = await import('../src/components/expungement-ai/screening/fields/FilingContactFields.tsx');
const { renderToStaticMarkup } = await import('react-dom/server');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { caProp64JuvenileDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ca-prop64-juvenile-document-preparation.ts');
const { caProp64CaptionBindings: bind } = await import('./lib/ca-prop64-caption-bindings.mjs');
const nodes = tree => Array.isArray(tree) ? tree.flatMap(nodes) : tree && typeof tree === 'object' && tree.props ? [tree, ...nodes(tree.props.children)] : [];
let checks = 0;
for (const locale of ['en', 'es']) for (const representation of ['self_represented', 'attorney']) for (const phone of ['530-555-0100', 'None', { status: 'known', value: '530-555-0100' }, { status: 'unknown', value: 'earlier number' }, { status: 'absent', value: 'earlier number' }]) {
  globalThis.__caPhoneLocale = locale;
  const context = { representation, defendantName: 'Synthetic Filer', county: 'Yolo' };
  const contact = { ...C.emptyCaContact(C.CA_FILER_CONTACT, context), version: typeof phone === 'string' ? 'ca_prop64_contacts_v1' : C.CA_CONTACT_CONTRACT,
    phone, email: { status: 'known', value: 'authorized-alternative@example.test' } };
  const raw = [JSON.stringify(contact)], before = structuredClone(raw), saves = [];
  const tree = FilingContactFields({ id: 'phone-test', factId: C.CA_FILER_CONTACT, value: raw, context, onChange: x => saves.push(x), ariaLabelledBy: 'question' });
  assert.equal(saves.length, 0);
  assert.deepEqual(raw, before);
  const elements = nodes(tree), select = elements.find(x => x.type === 'select' && x.props.id === 'phone-test-phone-status');
  assert(select);
  assert.deepEqual(nodes(select.props.children).map(x => x.props.value), ['', 'known', 'absent', 'unknown']);
  assert(elements.some(x => x.type === 'label' && x.props.htmlFor === select.props.id));
  const html = renderToStaticMarkup(tree);
  assert(html.includes(locale === 'es' ? 'Número de teléfono' : 'Phone number'));
  if (typeof phone === 'string' && phone === 'None') { assert.equal(select.props.value, 'unknown'); assert(html.includes('None')); }
  select.props.onChange({ target: { value: 'absent' } });
  assert.equal(saves.length, 1);
  const changed = C.parseCaContact(C.CA_FILER_CONTACT, saves[0]);
  assert.equal(changed.version, 'ca_prop64_contacts_v2');
  assert.deepEqual(changed.phone, { status: 'absent', value: typeof phone === 'string' ? phone : phone.value });
  assert.deepEqual(changed.email, contact.email);
  assert.deepEqual(raw, before);
  checks++;
}
// The binder accepts only explicit, scoped absence; it never fills unrelated facts.
const absent = bind({ familyId: 'ca-prop64-set', facts: { 'filer.representation': 'self_represented' }, absentContactFactIds: ['participant.phone', 'court.phone'] });
assert.equal(absent.facts['participant.phone'], 'None');
assert.equal(absent.facts['court.phone'], undefined);
assert.equal(bind({ familyId: 'other-family', facts: {}, absentContactFactIds: ['participant.phone'] }), null);
checks++;
console.log(JSON.stringify({ status: 'PASS_CA_PHONE_EDITOR', checks, controlledEvents: true, locales: ['en', 'es'], mountWrites: 0 }));

const evidence = process.argv[2];
assert(evidence && path.isAbsolute(evidence), 'retained official-source evidence directory required');
const spec = JSON.parse(fs.readFileSync('data/record-clearing/packet-specifications/drafts/CA-prop64-juvenile-review.v1.json'));
const sources = Object.fromEntries(spec.documents.map(d => [d.documentId, fs.readFileSync(path.join(evidence, d.documentId.toLowerCase().replace('-', '') + '-official-v1.pdf'))]));
for (const doc of spec.documents) assert.equal(createHash('sha256').update(sources[doc.documentId]).digest('hex'), doc.sourceSha256);
for (const branch of ['completed', 'currently-serving']) for (const role of ['self_represented', 'attorney']) {
  const original = JSON.parse(fs.readFileSync(path.join(evidence, `CONTACT-OWNER-RECORD-${branch}-${role}-en-v4.json`)));
  assert.equal(prepare(original, sources), null, 'adult record never acquires juvenile mapping');
  let record = P.packetInformationPatch({ protectedVerification: original, answers: { ca_prop64_court_type: 'juvenile', ca_prop64_age_at_offense: 17 } }).protectedTransition.nextVerification;
  const inputs = { ca_prop64_juvenile_case_name: 'In the Matter of Jordan Avery Reyes', ca_prop64_juvenile_case_number: '0012-CR-0099', ca_prop64_juvenile_full_name: 'Jordan Avery Reyes',
    ca_prop64_juvenile_date_of_birth: '1983-01-01', ca_prop64_juvenile_disposition: branch === 'completed' ? 'completed' : 'probation',
    ca_prop64_juvenile_finding_date: '2000-02-01', ca_prop64_juvenile_finding_sections: ['11357', '11358'], ca_prop64_juvenile_additional_scope: 'none' };
  record = P.packetInformationPatch({ protectedVerification: record, answers: inputs, caJuvenilePreparation: true }).protectedTransition.nextVerification;
  const model = P.caProp64JuvenilePreparationModelFor(record), prior = C.parseCaContact(C.CA_FILER_CONTACT, model.initialAnswers[C.CA_FILER_CONTACT]);
  assert(prior);
  for (const phone of [{ status: 'absent', value: 'earlier number' }, { status: 'known', value: '530-555-0102' }, { status: '', value: '' }, { status: 'unknown', value: 'earlier number' }, { status: 'known', value: 'None' }]) {
    const wire = [JSON.stringify({ ...prior, version: C.CA_CONTACT_CONTRACT, phone })];
    const patch = P.packetInformationPatch({ protectedVerification: record, answers: { [C.CA_FILER_CONTACT]: wire }, caJuvenilePreparation: true });
    assert(patch, branch + '/' + role);
    assert.equal(patch.readyToGenerate, false);
    const saved = patch.protectedTransition.nextVerification, projection = prepare(saved, sources), actor = role === 'attorney' ? 'attorney' : 'participant';
    assert(projection);
    assert.equal(projection.originalResultCode, 'needs_review');
    assert.equal(projection.generationAllowed, false);
    assert.equal(projection.paymentAllowed, false);
    assert.equal(projection.authorizedDeliveryEstablished, false);
    const complete = phone.status === 'absent' || phone.value === '530-555-0102';
    assert.equal(projection.status, complete ? 'mapped_for_review' : 'needs_facts', JSON.stringify(projection.reviewReasons));
    assert.equal(projection.missingFactIds.includes(actor + '.phone'), !complete);
    for (const documentId of ['JV-744', 'JV-746']) {
      const write = projection.sourceWrites.find(w => w.documentId === documentId && w.field.endsWith('Phone_ft[0]'));
      if (complete) { assert(write); assert.equal(write.value, phone.status === 'absent' ? 'None' : phone.value); assert.equal(write.sourceFactId, actor + '.phone'); }
      else assert.equal(write, undefined);
    }
    assert.deepEqual(P.caProp64JuvenilePreparationModelFor(saved).initialAnswers[C.CA_FILER_CONTACT], wire);
    assert.deepEqual(P.packetInformationPatch({ protectedVerification: saved, answers: {}, caJuvenilePreparation: true }).protectedTransition.nextVerification, saved);
    checks++;
  }
}
console.log(JSON.stringify({ status: 'PASS_CA_PHONE_JUVENILE', checks, families: ['JV-744', 'JV-746'], sourceBytesVerified: true, sourceRendering: false, authorityGranted: false }));
