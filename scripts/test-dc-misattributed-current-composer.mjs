import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { packetSpecificationFor, composablePacketSpecificationFor, specificationContentSha256 } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { composeGradeAPacket, GradeAPacketCompositionError } = await import('../src/lib/rcap/grade-a/composer.ts');
const { factoryV2RouteFor, resetFactoryV2RegistryCache } = await import('../src/lib/rcap/documents/factory-v2-registry.ts');
const { resolvePacketRoute } = await import('../src/lib/rcap/documents/packet-route-resolver.ts');
const routeKey = 'DC:dc_correct_misattributed_arrest';
const track = 'dc_correct_misattributed_arrest';
const spec = packetSpecificationFor(routeKey);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(stable).join(',')}]`
    : `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
let checks = 0;
const check = (name, fn) => { try { fn(); checks++; } catch (error) { error.message = `${name}: ${error.message}`; throw error; } };
const record = read(spec.artifactSuccessor.path);
const audit = read(spec.postApprovalChangeAudit.path);
const snapshot = structuredClone(spec);
const factory = () => { resetFactoryV2RegistryCache(); return factoryV2RouteFor('DC', track, track); };
check('dated exact artifact adoption and audit are bound to actual bytes', () => {
  assert.equal(sha(fs.readFileSync(spec.artifactSuccessor.path)), spec.artifactSuccessor.sha256);
  assert.equal(sha(fs.readFileSync(spec.postApprovalChangeAudit.path)), spec.postApprovalChangeAudit.sha256);
  assert.equal(audit.families[0].ownerArtifactSuccessor.sha256, spec.artifactSuccessor.sha256);
  assert.equal(record.provenance.adoptionVersion, 4);
  for (const key of ['runtimeAuthorized','deploymentAuthorized','publicationAuthorized','commercialAuthorityGranted','currentComposerAcceptanceGranted']) assert.equal(record.scope[key], false);
  assert.equal(sha(fs.readFileSync(audit.historicalAuditPreserved.path)), audit.historicalAuditPreserved.sha256);
});
check('all seven treatments bind exact retained sections, not a true flag alone', () => {
  assert.equal(spec.legalSectionsBound, true);
  assert.equal(Object.keys(spec.legalSections).length, 7);
  for (const [key, binding] of Object.entries(spec.legalSections)) {
    assert.equal(binding.bound, true);
    assert.equal(binding.boundBy, record.recordId);
    assert.deepEqual(binding.sources, audit.families[0].sectionBindings[key]);
    for (const source of binding.sources) {
      const section = source.pointer.split('/').slice(1).reduce((o,k) => o[k], spec);
      assert.equal(sha(stable(section)), source.representationSha256);
      assert.equal(section.heading, source.heading);
    }
  }
  assert.equal(spec.documents.reduce((n,d) => n + d.sections.length, 0), 25);
  const historicalDocuments = structuredClone(spec.documents);
  delete historicalDocuments[0].sections[0].captionContract.blankFields;
  delete historicalDocuments[0].sections[0].fieldLabels;
  assert.equal(historicalDocuments[1].presentation, 'pleading');
  historicalDocuments[1].presentation = 'guidance';
  assert.equal(sha(JSON.stringify(historicalDocuments)), '3002ef55562bf27baf0fd0f102a0c9fb582d28779390fa78c0ee78b8d93146de');
  assert.deepEqual(spec.documents[0].sections[0].captionContract.blankFields, ['dc_motion_case_number']);
  assert.deepEqual(spec.documents[0].sections[0].fieldLabels, {dc_motion_case_number:spec.documents[0].sections[0].captionContract.motionCaseNumberLabel});
  assert.equal(sha(JSON.stringify(spec.requiredFacts)), '34e805b3be547f92e9a8d5035c17c2f7bd2ec88a37d0de3c76017a572bc2990a');
  assert.ok(spec.requiredFacts.every(f => f.requiredForGeneration === undefined));
  assert.equal(specificationContentSha256(spec), spec.specificationSha256);
});
check('exact factory connection leaves historical tuple and commerce unchanged', () => {
  assert.equal(composablePacketSpecificationFor(routeKey), spec);
  const f = factory(); assert.ok(f);
  assert.equal(f.exactRouteProductization.postApprovalChangeAudit.path, spec.postApprovalChangeAudit.path);
  assert.equal(f.exactRouteProductization.postApprovalChangeAudit.scope, 'exact_dc_current_composer_only');
  assert.equal(f.exactRouteProductization.nextGate, spec.nextGate);
  assert.equal(spec.nextGate, "exact fulfillment-authority evidence and authorized protected generation/delivery acceptance; no route or commercial authority is granted");
  assert.equal(f.exactRouteProductization.createsCommercialAuthority, false);
  assert.equal(f.exactRouteProductization.opensRoute, false);
  assert.equal(spec.historicalProductization.legalSectionsBound, false);
  const r = resolvePacketRoute({ state:'DC', pathway:track, trackId:track });
  assert.equal(r.routeKind, 'factory_v2');
  assert.equal(r.sellable, false); assert.equal(r.creditConsumable, false);
  assert.equal(r.availability, 'UNFINISHED');
  assert.equal(r.factoryV2.postApprovalChangeAuditEstablished, true);
  assert.equal(r.factoryV2.nextGate, spec.nextGate);
  assert.ok(r.reason.includes('current-composer source audit'));
  assert.ok(!r.reason.includes('audit is not established'));
  const ct = resolvePacketRoute({state:'CT',pathway:'petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202',trackId:'ct-cleanslate-petition'});
  assert.equal(ct.factoryV2.postApprovalChangeAuditEstablished, false);
  assert.equal(ct.sellable, false); assert.equal(ct.creditConsumable, false);
  assert.equal(spec.documents[0].documentContract.localVariant, 'unresolved');
  assert.ok(spec.documents[0].documentContract.unresolvedReasons.localVariant);
  assert.equal(read('data/rcap-grade-a/fulfillment-authority-registry.json').records.some(r => r.routeId === routeKey), false);
});
// Existing census synthetic person supplies the identity/contact examples.
// The other facts below are explicit synthetic known prerequisites solely for
// mechanical composition. They are not participant facts or owner acceptance.
const facts = {
  participant_full_legal_name:'Jordan Avery Reyes', date_of_birth:'1991-04-17',
  mailing_address:'1400 Girard Street NW, Apartment 3, Washington, DC 20009',
  phone_number:'202-555-0142', email_address:'jordan.reyes@example.org',
  contact_information:'Synthetic complete contact context',
  underlying_case_number:'SYNTHETIC-CASE-ONLY',
  misidentification_facts:'Synthetic participant-authored context for a mechanical test only',
  no_fingerprints_taken:'Yes', no_other_identification:'Yes',
  prosecuting_office_name_address:'Synthetic clerk-confirmed context; never printed as service recipient'
};
const matter = { routeKey, jurisdiction:'DC', pathwayId:track, facts,
  verificationHash:'synthetic-internal-review-only', verifiedAt:'2026-10-16T00:00:00.000Z', generationPurpose:'internal_review' };
const packet = composeGradeAPacket(spec, matter);
check('existing composer includes all three components and DOB body consumer', () => {
  assert.deepEqual(packet.documents.map(d => d.documentId), ['primary_filing','prosecutor_service','filing_instructions']);
  assert.ok(JSON.stringify(packet).includes('date of birth 1991-04-17'));
  for (const value of [facts.participant_full_legal_name,facts.mailing_address,facts.phone_number,facts.email_address]) assert.ok(JSON.stringify(packet).includes(value));
  assert.ok(!JSON.stringify(packet).includes('SYNTHETIC-CASE-ONLY'));
});
const manual = ['dc_case_number','dc_motion_case_number','dc_fingerprints_knowledge','dc_other_identification_knowledge','dc_misattribution_statement_1','dc_misattribution_statement_2','dc_misattribution_statement_3','dc_prosecuting_office_1','dc_prosecuting_office_2','dc_service_date'];
check('all 14 original field occurrences retain four values and ten explicit manual slots', () => {
  const fields = spec.documents.flatMap(d => d.sections.flatMap(s => s.fields ?? []));
  assert.equal(fields.length, 14);
  assert.deepEqual(fields.filter(f => !manual.includes(f)), ['participant_full_legal_name','mailing_address','phone_number','email_address']);
  assert.equal(manual.length,10);
  assert.deepEqual([...spec.fieldOwnership.participantCompletesBeforeFilingFields,...spec.fieldOwnership.participantAtServiceFields,...spec.fieldOwnership.courtOwnedFields].sort(), manual.slice().sort());
  const items = packet.documents.flatMap(d => d.blocks).filter(b => b.kind === 'pleading_identity_list').flatMap(b => b.items);
  assert.equal(items.filter(i => i.blank).length,8); // Two remaining blanks are the caption's two case-number slots.
  assert.ok(items.filter(i => i.blank).every(i => i.value === '' && i.completedBy === 'participant'));
  const caption = packet.documents[0].blocks.find(b => b.kind === 'pleading_caption');
  assert.equal(caption.caseNumber, ''); assert.equal(caption.caseNumberBlank,true);
  assert.ok(caption.blankFields.some(f => f.field === 'dc_motion_case_number' && f.completedBy === 'court'));
});
check('attempted manual/service/court values never fill blank output or sign/date it', () => {
  const injected = Object.fromEntries([...manual,'signature','signed_at','service_date'].map(f => [f,`UNTRUSTED-${f}`]));
  assert.deepEqual(composeGradeAPacket(spec,{...matter,facts:{...facts,...injected}}), packet);
  assert.ok(!JSON.stringify(packet).includes('UNTRUSTED-'));
});
for (const required of [...spec.requiredFacts.map(f => f.factId),'mailing_address','phone_number','email_address']) check(`missing ${required} refuses entire composition`, () => {
  const f = {...facts}; delete f[required];
  assert.throws(() => composeGradeAPacket(spec,{...matter,facts:f}), e => e instanceof GradeAPacketCompositionError && e.missingFactIds.includes(required));
});
for (const [name,mutate] of [
  ['route', s => s.routeKeys = ['DC:other']], ['family',s => s.packetFamily='other'], ['track',s => s.trackId='other'],
  ['source',s => s.sourceIdentities[0].sha256='0'.repeat(64)], ['prerequisite',s => s.requiredFacts[5].requiredForGeneration=false],
  ['ownership',s => s.fieldOwnership.courtOwnedFields=[]], ['section source',s => s.legalSections.serviceAndNotice.sources.pop()],
  ['text',s => s.documents[0].sections[2].body='changed'], ['artifact',s => s.artifactEvidence[0].sha256='0'.repeat(64)],
  ['audit',s => s.postApprovalChangeAudit.sha256='0'.repeat(64)],
  ['missing caption slot',s => delete s.documents[0].sections[0].captionContract.blankFields],
  ['duplicate caption slot',s => s.documents[0].sections[0].captionContract.blankFields.push('dc_motion_case_number')],
  ['wrong caption ownership',s => s.documents[0].sections[0].fieldTreatments.dc_motion_case_number='ruled_blank']
]) check(`exact successor refuses changed ${name}`, () => {
  try { mutate(spec); assert.equal(factory(),null); }
  finally { for(const k of Object.keys(spec)) delete spec[k]; Object.assign(spec,structuredClone(snapshot)); resetFactoryV2RegistryCache(); }
});
for (const file of [spec.artifactSuccessor.path,spec.postApprovalChangeAudit.path,'data/record-clearing/legal-design-intake/DC.memo.json']) check(`changed repository evidence refused: ${file}`, () => {
  const original = fs.readFileSync;
  try { fs.readFileSync = function(f,...args) { return path.resolve(String(f)) === path.resolve(file) ? Buffer.from('{}') : original.call(this,f,...args); }; assert.equal(factory(),null); }
  finally { fs.readFileSync=original;resetFactoryV2RegistryCache(); }
});
check('wrong track and sibling route remain refused', () => {
  assert.equal(factoryV2RouteFor('DC',track,'other'),null);
  assert.equal(factoryV2RouteFor('DC','dc_motion_seal_nonconviction_16_806'),null);
});
// This regression measures the actual renderer drawing calls. The long label
// is source text; the short CASE NO. copy below is an explicitly synthetic fit
// control of the same packet, not another route or qualification witness.
const { PDFPage, PDFDocument } = await import('pdf-lib');
const { renderGradeAPacketPdf } = await import('../src/lib/rcap/grade-a/renderer.ts');
const captureRender = async input => {
  const events = [];
  const originalText = PDFPage.prototype.drawText;
  const originalLine = PDFPage.prototype.drawLine;
  PDFPage.prototype.drawText = function(text, options = {}) {
    events.push({ kind:'text', page:this.ref.toString(), text, x:options.x, y:options.y,
      size:options.size, width:options.font?.widthOfTextAtSize(text, options.size),
      withTrailingSpaceWidth:options.font?.widthOfTextAtSize(`${text} `, options.size) });
    return originalText.call(this, text, options);
  };
  PDFPage.prototype.drawLine = function(options) {
    events.push({ kind:'line', page:this.ref.toString(), start:options.start, end:options.end, thickness:options.thickness });
    return originalLine.call(this, options);
  };
  try { return { bytes:await renderGradeAPacketPdf(structuredClone(input), {variant:'court_only'}), events }; }
  finally { PDFPage.prototype.drawText = originalText; PDFPage.prototype.drawLine = originalLine; }
};
const courtOutputIndex = process.argv.indexOf('--court-output');
const courtOutput = courtOutputIndex === -1 ? null : path.resolve(process.argv[courtOutputIndex + 1] ?? '');
if (courtOutputIndex !== -1) {
  assert.ok(process.argv[courtOutputIndex + 1] && path.extname(courtOutput) === '.pdf' && !courtOutput.startsWith(process.cwd() + path.sep), 'fresh external PDF path required');
  assert.equal(fs.existsSync(courtOutput), false, 'preserve prior output evidence');
}
const courtOnly = await captureRender(packet);
check('actual long-label rule remains inside page margins on the next line', () => {
  const label = packet.documents[0].blocks.find(b => b.kind === 'pleading_caption').caseNumberLabel;
  const start = courtOnly.events.findIndex(e => e.kind === 'text' && e.text.startsWith('Case number') && label.startsWith(e.text));
  assert.ok(start >= 0);
  const labelEvents = [];
  for (let i = start; i < courtOnly.events.length && courtOnly.events[i].kind === 'text' && courtOnly.events[i].size === 12; i++) {
    labelEvents.push(courtOnly.events[i]);
    if (labelEvents.map(e => e.text).join(' ') === label) break;
  }
  assert.equal(labelEvents.map(e => e.text).join(' '), label);
  assert.ok(labelEvents.every(e => e.x === 72 && e.x + e.width <= 540 + 0.001));
  const last = labelEvents.at(-1);
  const rule = courtOnly.events.find(e => e.kind === 'line' && e.page === last.page && e.start.x === 72 && e.end.x === 312 && Math.abs(e.start.y - (last.y - 18 - 2)) < 0.001);
  assert.ok(rule, 'the actual 240pt rule must start at the left margin below the full label');
  assert.equal(rule.end.x - rule.start.x, 240);
  assert.ok(courtOnly.events.filter(e => e.kind === 'line').every(e => e.start.x >= 0 && e.end.x <= 612));
  assert.ok(!courtOnly.events.filter(e => e.kind === 'text').some(e => e.text.includes('UNTRUSTED-')));
});
const fitPacket = structuredClone(packet);
fitPacket.documents[0].blocks.find(b => b.kind === 'pleading_caption').caseNumberLabel = 'CASE NO.';
const fit = await captureRender(fitPacket);
check('existing fit branch retains the original same-line label plus 240pt rule geometry', () => {
  const label = fit.events.find(e => e.kind === 'text' && e.text === 'CASE NO.' && e.size === 12);
  assert.ok(label); assert.equal(label.x,72);
  const expectedStart = label.x + label.withTrailingSpaceWidth;
  const rule = fit.events.find(e => e.kind === 'line' && e.page === label.page && Math.abs(e.start.x - expectedStart) < 0.001 && e.start.y === label.y - 2);
  assert.ok(rule); assert.ok(Math.abs((rule.end.x - rule.start.x) - 240) < 0.001);
  assert.ok(rule.end.x <= 540);
});
const pdf = await PDFDocument.load(courtOnly.bytes);
const renderEvidence = {scope:'Synthetic real court_only renderer regression only; no owner, qualification, visual or legal/output approval',
  sha256:sha(courtOnly.bytes),byteLength:courtOnly.bytes.length,pages:pdf.getPageCount(),geometry:courtOnly.events,
  fitGeometry:fit.events.filter(e => (e.kind === 'text' && e.text === 'CASE NO.') || e.kind === 'line')};
if (courtOutput) fs.writeFileSync(courtOutput,courtOnly.bytes,{flag:'wx'});

const receiptIndex = process.argv.indexOf('--receipt');
if (receiptIndex !== -1) {
  const output = path.resolve(process.argv[receiptIndex + 1] ?? '');
  assert.ok(process.argv[receiptIndex + 1] && !output.startsWith(process.cwd() + path.sep), 'receipt must be external to application source');
  fs.writeFileSync(output, JSON.stringify({scope:'Synthetic internal mechanical composition only; no owner, qualification or output approval',checks,matter,packet,renderEvidence},null,2)+'\n',{flag:'wx'});
}
console.log(`PASS: ${checks} DC current-composer/source/14-field/manual/prerequisite/refusal controls. Synthetic internal composition only; no owner, semantic-qualification or commercial acceptance.`);
