#!/usr/bin/env node
// GA14-MD-JUVENILE / GA-14-M01031 / Q-d7118400a5658cf4acb7.
// A held census family: this build creates no runtime or commercial authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { ROOT, SOURCE, INDEX, hash, verifySource } from './rcap-corpus/import-md-juvenile-source.mjs';
import { finalizeOfficialForm } from './rcap-official-forms/rcap-official-form-finalize.mjs';
import { flattenedWidgets, drawnAt } from './rcap-official-forms/pdf-flattened-widgets.mjs';
import { extractTextItems, groupIntoLines } from './rcap-official-forms/rcap-pdf-anchor-capture.mjs';

process.chdir(ROOT);
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { recordFactConfirmationFor } = await import('../src/lib/expungement-ai/record-fact-clarification.ts');
const { mdJuvenileCaptionQuestion, MD_JUVENILE_CAPTION_SOURCE } = await import('../src/lib/expungement-ai/md-juvenile-county-source-purpose.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { mdJuvenileDocumentFacts } = await import('../src/lib/expungement-ai/md-juvenile-document-questions.ts');
const { scalarAnswerText, answerValueIsKnown } = await import('../src/lib/expungement-ai/question-answer-state.ts');

export const FAMILY_ID = 'md_juvenile_expungement-set';
export const ROUTE = 'MD:juvenile-expungement';
export const OUT = 'data/rcap-all50/overlays/census-v1/md/md-juvenile-expungement-set--official-pdf-fill';
const COMPONENT = 'md_juvenile_expungement-primary-filing-1';
const SCRIPT = 'scripts/build-census-v1-md_juvenile_expungement-set.mjs';
const COUNTY = 'City/County of Circuit Court';
const QUESTION = mdJuvenileCaptionQuestion(getProfileByJurisdiction('MD'), 'juvenile-expungement', null);
assert(QUESTION, 'adopted juvenile county contract is available');
assert.equal(MD_JUVENILE_CAPTION_SOURCE.sha256, SOURCE.sha256);

const WRITES = Object.freeze({
  [COUNTY]: 'matter.county', RespondentPetitioner: 'participant.full_legal_name',
  'Printed Name': 'participant.full_legal_name', 'I was charged with the offense of': 'matter.charge',
});
const SIGNING = new Set(['Signature', 'Date']);
const REVIEWER_ONLY = new Set(['Reset']);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function confirmedFixture(county = 'Baltimore City') {
  const answers = { county, court: 'Original juvenile court', charge: 'Synthetic juvenile charge',
    participant_full_legal_name: 'Jordan Example' };
  return { routeKey: ROUTE, answers,
    recordFactConfirmations: { county: recordFactConfirmationFor(ROUTE, 'county', answers, QUESTION) } };
}

export async function censusOf(bytes) {
  const document = await PDFDocument.load(verifySource(bytes), { updateMetadata: false });
  const pages = document.getPages();
  const pageText = pages.map((page, i) => ({ page: i + 1, lines: groupIntoLines(extractTextItems(page))
    .map(line => ({ y: line.y, text: line.text })) }));
  const rows = document.getForm().getFields().map(field => {
    const name = field.getName();
    const widgets = field.acroField.getWidgets().map(widget => {
      const index = pages.findIndex(page => page.ref === widget.P());
      assert(index >= 0, `widget page must be resolved: ${name}`);
      return { page: index + 1, rect: widget.getRectangle(), annotationFlags: widget.getFlags() };
    });
    assert(widgets.length > 0, `widget geometry: ${name}`);
    const policy = WRITES[name] ? 'write' : SIGNING.has(name) ? 'sign_later'
      : REVIEWER_ONLY.has(name) ? 'viewer_control' : 'hold';
    const type = field.constructor.name.replace(/^PDF/, '').toLowerCase().replace('textfield', 'text');
    return { name, key: name, field: name, page: widgets[0].page, rect: widgets[0].rect,
      widgets, type, pdfType: type, effectiveLabel: name, policy, factId: WRITES[name] ?? null,
      multiline: typeof field.isMultiline === 'function' && field.isMultiline(),
      maxLength: typeof field.getMaxLength === 'function' ? field.getMaxLength() ?? null : null,
      options: typeof field.getOptions === 'function' ? field.getOptions() : null,
      printedTextAtCoordinate: pageText[widgets[0].page - 1].lines.filter(line => Math.abs(line.y - widgets[0].rect.y) < 18),
      rectBasis: 'acroform_widget_rect_read_from_exact_original',
    };
  });
  assert.equal(rows.length, 45);
  for (const name of Object.keys(WRITES)) assert(rows.some(row => row.name === name), `mapped field: ${name}`);
  assert.equal(rows.find(row => row.name === COUNTY).type, 'dropdown');
  for (const row of rows.filter(row => row.policy === 'write')) {
    assert(row.widgets.every(widget => !(widget.annotationFlags & (1 | 2 | 32))), `visible write: ${row.name}`);
  }
  return { pageCount: pages.length, rows, pageText };
}

export function resolveFacts(input, census) {
  assert.equal(input.routeKey, ROUTE, 'juvenile family refuses other routes, including adult expungement');
  const answers = input.answers ?? {};
  const current = recordFactConfirmationFor(ROUTE, 'county', answers, QUESTION);
  const recorded = input.recordFactConfirmations?.county;
  const county = scalarAnswerText(answers.county)?.trim();
  const countyConfirmed = current && recorded?.status === 'confirmed'
    && ['version', 'routeKey', 'status', 'contractSha256', 'inputSha256', 'valueSha256'].every(key => same(current[key], recorded[key]))
    && census.rows.find(row => row.name === COUNTY).options.includes(county);
  const facts = {};
  const holds = [];
  if (countyConfirmed) facts['matter.county'] = county;
  else holds.push({ field: COUNTY, factId: 'county', reason: 'Confirm the exact original or actual transferee juvenile court county; no residence or incident-county inference.' });
  for (const [factId, destination] of [['participant_full_legal_name', 'participant.full_legal_name'], ['charge', 'matter.charge']]) {
    const text = scalarAnswerText(answers[factId])?.trim();
    if (answerValueIsKnown(answers[factId]) && text) facts[destination] = text;
    else holds.push({ factId, reason: 'No known collected value; the draft stays held.' });
  }
  return { facts, holds };
}

export async function renderCandidate(bytes, input, directory) {
  const census = await censusOf(bytes);
  const { facts, holds } = resolveFacts(input, census);
  const document = mdJuvenileDocumentFacts(input.answers ?? {});
  const narratives = Object.entries(document.fields).map(([field, held]) => {
    facts[held.factId] = held.value;
    return { factId: held.factId, fields: [field], ...(field === 'Law Enforcement Agency' ? { allowProtectedCategories: ['agency'] } : {}) };
  });
  if (document.incident) {
    facts.md_juvenile_incident = document.incident;
    narratives.push({ factId: 'md_juvenile_incident', fields: [1, 2, 3, 4].map(n => `Maryland as a result of the following incident ${n}`) });
  }
  const narrativeFields = new Set(narratives.flatMap(row => row.fields));
  const mappings = Object.fromEntries(Object.entries(WRITES).filter(([, fact]) => Object.hasOwn(facts, fact)));
  const result = await finalizeOfficialForm({ sourceBytes: bytes, expectedSha256: SOURCE.sha256,
    census: census.rows, facts, explicitMappings: mappings,
    narrativeAcrossFields: narratives, selectionsFromHeldFacts: document.selections,
    unwritableFields: census.rows.filter(row => !Object.hasOwn(mappings, row.name) && !narrativeFields.has(row.name) && !Object.hasOwn(document.selections, row.name)).map(row => ({ field: row.name })),
    documentTextLines: census.pageText.flatMap(page => page.lines.map(line => line.text)),
    title: 'Petition for Expungement of Juvenile Records — held draft',
    evaluateDeclaredMinimumSize: true, alignWidgetFontSizeToFit: true,
    detachNestedControlFields: true, suppressSynthesizedAppearances: true,
  });
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'candidate.pdf');
  fs.writeFileSync(file, result.bytes);
  const appearances = await flattenedWidgets(file);
  const written = new Map(result.report.written.filter(row => row.kind !== 'selection_settled_from_held_facts').map(row => [row.field, row]));
  const actualWrites = [];
  const narrativeWrites = new Map((result.report.narrativesWritten ?? []).flatMap(row => row.written.map(w => [w.field, { ...w, factId: row.factId }])));
  const refusedFieldsWithInk = [];
  for (const row of census.rows) {
    for (const widget of row.widgets) {
      const text = drawnAt(appearances, widget).map(item => item.text).join('').trim();
      if (written.has(row.name)) {
        assert(Object.hasOwn(mappings, row.name) || narrativeWrites.has(row.name), `unexpected finalizer write: ${row.name}`);
        const expected = narrativeWrites.get(row.name)?.text ?? facts[mappings[row.name]];
        assert.equal(text, expected, `output-byte readback: ${row.name}`);
        actualWrites.push({ field: row.name, factId: narrativeWrites.get(row.name)?.factId ?? mappings[row.name], ...widget, expected, drawnText: text });
      } else if (text) refusedFieldsWithInk.push({ field: row.name, ...widget, drawnText: text });
    }
    if (row.policy === 'hold' && !written.has(row.name) && !Object.hasOwn(document.selections, row.name)) holds.push({ field: row.name, reason: 'No exact collected fact or legal election for this field; leave blank and hold for review.' });
    if ((Object.hasOwn(mappings, row.name) || narrativeFields.has(row.name)) && !written.has(row.name) && !result.report.narrativesWritten?.some(n => n.linesLeftForTheParticipant.includes(row.name))) {
      holds.push({ field: row.name, reason: 'The finalizer refused the held value; preserve the answer and hold the draft.',
        refusal: result.report.refused.find(item => item.field === row.name) ?? null });
    }
  }
  assert.deepEqual(refusedFieldsWithInk, [], 'every refused widget is blank');
  const outside = appearances.filter(item => item.text.trim() && !actualWrites.some(write => write.page === item.page
    && Math.abs(write.rect.x - item.x) <= 2 && Math.abs(write.rect.y - item.y) <= 2));
  assert.deepEqual(outside, [], 'no new glyphs outside measured writes');
  for (const field of Object.keys(document.selections)) if (!result.report.selectionsMarked?.some(row => row.field === field)) {
    holds.push({ field, reason: 'The finalizer refused the explicit selection; preserve the answer and hold the draft.' });
  }
  for (const refusal of result.report.unfittable) holds.push({ field: refusal.field, reason: 'Value does not fit at the readable minimum; preserve the answer and hold the draft.' });
  return { bytes: result.bytes, census, report: result.report, actualWrites, refusedFieldsWithInk,
    holds, status: 'HELD_DRAFT', paymentAllowed: false, fulfillmentStatus: 'NO_RECORD',
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside.reduce((sum, row) => sum + row.text.replace(/\s/g, '').length, 0) };
}

function sourceBytes(root = ROOT) {
  const index = JSON.parse(fs.readFileSync(path.join(root, INDEX), 'utf8'));
  const entries = index.entries.filter(row => row.path === SOURCE.path && row.custody === SOURCE.custody);
  assert.equal(entries.length, 1, 'exact juvenile source must be installed in the corpus index');
  assert.equal(entries[0].sha256, SOURCE.sha256);
  assert.equal(entries[0].byteLength, SOURCE.byteLength);
  return verifySource(fs.readFileSync(path.join(root, SOURCE.path)));
}

export async function runFamily(argv = process.argv.slice(2)) {
  const bytes = sourceBytes();
  const census = await censusOf(bytes);
  if (argv.includes('--check')) return { familyId: FAMILY_ID, status: 'CHECK_ONLY', pages: census.pageCount, fields: census.rows.length, sourceSha256: hash(bytes) };
  const outputArg = argv.indexOf('--output');
  const output = outputArg < 0 ? path.join(ROOT, OUT) : path.resolve(argv[outputArg + 1]);
  const write = (name, data) => {
    const target = path.join(output, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
  };
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'md-juvenile-build-'));
  const rendered = [];
  try {
    const fixtures = { canonical: confirmedFixture(), boundary: confirmedFixture('Prince George’s County') };
    for (const [fixture, input] of Object.entries(fixtures)) {
      const result = await renderCandidate(bytes, input, path.join(temporary, fixture));
      const file = `fixtures/${fixture}.pdf`;
      fs.mkdirSync(path.join(output, 'fixtures'), { recursive: true });
      fs.writeFileSync(path.join(output, file), result.bytes);
      rendered.push({ fixture, input, result, artifact: { fixture, file: `${OUT}/${file}`, sha256: hash(result.bytes),
        byteLength: result.bytes.length, pageCount: 2, documents: [SOURCE.formNumber], components: [COMPONENT],
        pageManifest: [1, 2].map(page => ({ packetPage: page, sourcePage: page, formNumber: SOURCE.formNumber, componentId: COMPONENT, sourceSha256: SOURCE.sha256 })) } });
    }
    write('fixtures/inputs.json', Object.fromEntries(rendered.map(row => [row.fixture, row.input])));
    const common = { familyId: FAMILY_ID, routeKey: ROUTE, commercialRoutesOpened: 0 };
    write('source-receipt.json', { schemaVersion: 'rcap-family-source-receipt/v1', ...common, worklistGroupId: FAMILY_ID,
      jurisdiction: 'MD', implementationStrategy: 'official_pdf_fill', custodyClass: 'NEWLY_ACQUIRED_OFFICIAL_PUBLICATION', acquisitionCommissioned: true,
      retrievalReceipt: 'source-custody-md-juvenile-20261018/JUV-11-506.1-RETRIEVAL-RECEIPT-v1.json',
      retrievedAt: '2026-10-18T12:14:27.240661+00:00', allSourcesExact: true, sourceBinaryCommitted: false,
      documents: [{ ...SOURCE, documentId: SOURCE.formNumber, componentId: COMPONENT, instrumentKind: 'primary_filing', componentRequirement: 'required',
        pathInArchive: SOURCE.path, boundFromCustody: SOURCE.custody, sha256RecomputedFromBytes: hash(bytes), corpusIndexAcroFieldCount: 45, corpusIndexPageCount: 2 }],
      sourceMeaning: MD_JUVENILE_CAPTION_SOURCE,
      controllingInputs: ['src/lib/expungement-ai/md-juvenile-county-source-purpose.ts', 'src/lib/expungement-ai/record-fact-clarification.ts']
        .map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(ROOT, file))) })),
    });
    write('field-census.census-v1.json', { schemaVersion: 'rcap-official-form-field-census/v1-census-v1', ...common,
      documents: [{ documentId: SOURCE.formNumber, sourceSha256: SOURCE.sha256, pageCount: 2, fieldCount: 45, fields: census.rows }] });
    const mapRow = row => ({ field: `${SOURCE.formNumber}/${row.name}`, acroFieldName: row.name, document: SOURCE.formNumber,
      componentId: COMPONENT, page: row.page, rect: row.rect, rectBasis: row.rectBasis, effectiveLabel: row.name, factId: row.factId });
    const columns = Object.fromEntries(rendered.flatMap(({ fixture, result }) => [
      [`${fixture}Writes`, result.actualWrites.map(write => ({ ...mapRow(census.rows.find(row => row.name === write.field)), factId: write.factId, kind: 'source_bound_fact' }))],
      [`${fixture}Refusals`, census.rows.filter(row => !result.actualWrites.some(write => write.field === row.name)).map(row => ({ ...mapRow(row),
        reason: row.policy === 'sign_later' ? 'Signature and signing date remain for later participant completion.'
          : row.policy === 'viewer_control' ? 'Viewer reset control is not filing content.' : 'No exact collected value or election; unresolved draft hold.',
        disposition: row.policy === 'hold' || row.policy === 'write' ? null : row.policy === 'sign_later' ? 'PROTECTED_FIELD' : 'NOT_APPLICABLE_ON_THIS_ROUTE',
        category: row.policy === 'sign_later' ? 'signature_or_date_participant_completion' : null,
        draftHold: row.policy === 'hold' || row.policy === 'write' }))],
    ]));
    write('production-field-map.json', { schemaVersion: 'rcap-official-form-field-map/v1-census-v1', ...common,
      routeKeys: [ROUTE], jurisdiction: 'MD', implementationStrategy: 'official_pdf_fill', renderStrategy: 'acroform_fill',
      componentSet: [COMPONENT], generationAllowed: false, runtimeSelectable: false,
      maps: [{ formNumber: SOURCE.formNumber, documentId: SOURCE.formNumber, componentId: COMPONENT, structuralClass: 'acroform',
        explicitMappings: WRITES, documentPolicy: { mode: 'participant', routeKey: ROUTE }, ...columns }],
      countyRule: 'Exact dropdown option plus current record-fact confirmation; never residence or incident county.',
      serviceOwner: 'court', participantCompletedServiceCertification: false,
    });
    write('reports/rendered-artifacts.json', { schemaVersion: 'rcap-rendered-artifacts/v1', ...common, renderedFresh: true,
      componentSet: [COMPONENT], artifacts: rendered.map(row => row.artifact),
      rasterState: 'BUILT_RASTER_PENDING', rasterSkipped: true, everyPageRastered: false, independentVerificationPending: true });
    write('reports/actual-writes.json', { schemaVersion: 'rcap-actual-writes-byte-proof/v1', ...common, derivedFromArtifactBytes: true,
      documents: rendered.map(({ fixture, result }) => ({ fixture, formNumber: SOURCE.formNumber, sourceSha256: SOURCE.sha256,
        actualWrites: result.actualWrites, refusedFieldsWithInk: result.refusedFieldsWithInk,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: result.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
        unfittable: result.report.unfittable, holds: result.holds })) });
    write('reports/caption-evidence.json', { ...common, method: 'Printed lines at each original widget coordinate; field names are not claimed verbatim printed captions.', pageText: census.pageText });
    write('reports/completeness-counters.json', { schemaVersion: 'rcap-builder-completeness-counters/v1', ...common,
      status: 'HELD_UNVERIFIED', measured: false, counters: null,
      reason: 'Uncollected facts and elections remain explicit holds. No completeness verdict before the independent factory lane.' });
    write('build-status.json', { schemaVersion: 'rcap-build-status/v1', ...common, status: 'overlay_samples_rendered',
      rasterState: 'BUILT_RASTER_PENDING', fulfillmentStatus: 'NO_RECORD', resultCode: 'not_covered_yet', paymentAllowed: false,
      approvedForLive: false, live: false });
    write('build-findings.json', { ...common, holds: rendered.map(({ fixture, result }) => ({ fixture, fields: result.holds })),
      reviewRequired: ['Source field meanings and unresolved legal elections', 'Central raster and independent completeness', 'Runtime wiring and exact-family fulfillment proof'] });
    write('product-wiring.json', { schemaVersion: 'rcap-census-v1-product-wiring/v1', family: FAMILY_ID, routeKey: ROUTE, routeKeys: [ROUTE],
      workType: 'PRODUCT_WIRING_REQUIRED', status: 'DECLARED_NOT_INSTALLED', authorityCreated: 'none', generatedBy: SCRIPT,
      binding: { family: FAMILY_ID, jurisdiction: 'MD', routeKeys: [ROUTE], deliveryType: 'official_pdf_fill',
        fieldMap: `${OUT}/production-field-map.json`, sourceReceipt: `${OUT}/source-receipt.json`,
        renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`, paymentEligible: false, sponsorshipEligible: false,
        acceptanceReceipt: null, lastIndependentVerification: null, maintenanceRelationship: { rebuiltFrom: SCRIPT } },
      currentState: { fulfillmentStatus: 'NO_RECORD', generationAllowed: false } });
    const blankNames = census.rows.filter(row => row.policy === 'hold').map(row => `- ${row.name}`).join('\n');
    write('participant-instructions.md', `# Maryland juvenile expungement — held draft\n\nThis draft is not ready to file. Confirm the county of the court where the juvenile petition or citation was originally filed, or the actual transferee juvenile court. An unknown or unconfirmed county stays blank. Residence and incident location do not establish that court.\n\nThe court arranges service; this draft supplies no participant service certification. Signatures and signing dates stay blank for later completion. Adult CC-DC-CR-072A, B, C and D are excluded.\n\nThese uncollected facts and unresolved choices remain blank and hold the draft for review; their appearance here does not establish that every one applies to your case:\n\n${blankNames}\n`);
    write('filing-instructions.md', '# Filing hold\n\nDo not file this unverified draft. Resolve its listed fact and election holds, confirm the original or actual transferee juvenile court, and complete independent factory review. The court performs service under the adopted source rule. This build does not authorize payment or delivery.\n');
    write('approval-request.json', { schemaVersion: 'rcap-family-approval-request/v1', ...common,
      status: 'HELD_PENDING_INDEPENDENT_VERIFICATION', requested: 'Source/output, central raster and independent completeness review', approvedForLive: false });
    return { ...common, status: 'HELD_DRAFT_BUILT', directory: output, artifacts: rendered.map(row => row.artifact),
      writes: rendered.map(({ fixture, result }) => ({ fixture, count: result.actualWrites.length, holds: result.holds.length })),
      fulfillmentStatus: 'NO_RECORD', paymentAllowed: false };
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await runFamily(), null, 2));
}
