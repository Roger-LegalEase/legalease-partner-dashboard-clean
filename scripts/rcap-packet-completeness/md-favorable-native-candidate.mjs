/** Import only the retained, independently reviewed Maryland 072A candidate.
 * Every source field is accounted for separately in every fixture. This adapts
 * native reports to the existing completeness contract; it is not a renderer,
 * intake implementation, legal rule engine or fulfillment authorization.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {PASS_COUNTERS} from './completeness-contract.mjs';

export const MD_NATIVE_FAMILY = 'md_10105_favorable-set';
export const MD_NATIVE_DIRECTORY = 'data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill';
const FORM = 'CC-DC-CR-072A';
const SOURCE = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf';
const SOURCE_SHA = '8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2';
const HELPER = 'scripts/rcap-packet-recovery/chat5/md-favorable.mjs';
const HELPER_BLOB = '4f7f87558c98691b1ff77825ede2f13dbf7ebd7c';
const REVIEW = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review/';
const BINDING = path.join(path.dirname(fileURLToPath(import.meta.url)), 'md-reviewed-candidate-inputs.json');
const BINDING_SHA = 'b5006d7fd203571627af2dbc4cd4bf68a0086b5ba89b045738655f36a9ba0ca9';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const held = value => value !== undefined && value !== null && value !== '';
const at = (facts, key) => key.split('.').reduce((value, part) => value?.[part], facts);
const dateText = value => `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;
const normalizeSpace = value => String(value).replace(/\s+/g, ' ').trim();
const TEXT_FACTS = Object.freeze({
  'Case Number': 'case.number', 'Tracking Number': 'case.trackingNumber',
  "Defendant's Name": 'participant.fullName', "Defendant's Date of Birth": 'participant.dob',
  'Date Arrested or Served': 'case.arrestOrServiceDate', 'Law Enforcement Agency': 'case.agency',
  'City/County': 'case.incidentLocation', 'List the Offense you were charged with': 'case.chargeDescription',
  'Date the charge was Disposed of': 'case.dispositionDate', 'Defendant Printed Name': 'participant.fullName',
  'Defendant Address': 'participant.street', 'Defendant City, State, Zip': 'participant.cityStateZip',
  'Defendant Telephone Number': 'participant.phone', 'Defendant E-mail': 'participant.email',
  'Defendant Fax': 'participant.fax', "Court's City/County": 'court.sourceOption', "Court's Address": 'court.address'
});
// Optionality is the reviewed native source-A mapping, not a label rewrite or
// a generic exemption for all contact fields. Phone/address remain required.
const OPTIONAL_FACTS = new Set(['case.trackingNumber', 'participant.email', 'participant.fax']);
const DATE_FACTS = new Set(['participant.dob', 'case.arrestOrServiceDate', 'case.dispositionDate']);
const ATTORNEY_FIELDS = new Set([
  'Signature of Attorney', 'Attorney Number', 'Date Attorney Signed', 'Attorney Printed Name',
  'Attorney Address', 'Attorney City, State, Zip', 'Attorney Telephone Number', 'Attorney E-mail', 'Attorney Fax'
]);
const PARTICIPANT_EXECUTION = new Set(['Signature of Defendant', 'Date Defendant Signed']);
const EVENTS = Object.freeze({arrest: 'Arrested', summons: 'Served with a Summons', citation: 'Served with a Citation by an Officer'});
const COURTS = Object.freeze({district: 'District Court', circuit: 'Circuit Court'});
const TRANSFER = 'The case began in one court and was transferred to another court other than Juvenile court';
const NARRATIVE_FIELDS = ['List the Incident', 'Incident Continued'];

function read(root, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw Error('unsafe candidate path');
  const base = fs.realpathSync(root), target = path.resolve(base, relative);
  if (fs.lstatSync(target).isSymbolicLink() || !fs.realpathSync(target).startsWith(base + path.sep)) throw Error('candidate path escapes checkout');
  return fs.readFileSync(target);
}
function requireCondition(condition, message) { if (!condition) throw Error(message); }
function failure(directory, familyId, error) {
  return {familyId, directory, result: 'FAIL_COMPONENT_SET', auditable: false,
    counters: Object.fromEntries(PASS_COUNTERS.map(key => [key, key === 'requiredComponentsMissing' ? 1 : null])),
    totals: {terminalFields: 0, written: 0, blank: 0, blanksByDisposition: {}, rowsInspected: 0},
    findings: [{counter: 'requiredComponentsMissing', why: error instanceof Error ? error.message : String(error)}], findingsTruncated: 0,
    runtimeIntakeCounters: null, independentReviewReused: false, publicationOrFulfillmentClaimed: false};
}
export function isMdNativeCandidate(familyId, map) {
  return familyId === MD_NATIVE_FAMILY && map?.familyId === MD_NATIVE_FAMILY
    && map?.schemaVersion === 'rcap-official-form-field-map/v1-census-v1'
    && map.maps?.length === 1 && map.maps[0].documentId === FORM && !!map.fixtures && !map.writes;
}

/** Pure normalization for engineering tests. This function grants no candidate
 * PASS: auditMdNativeCandidate must first authenticate the retained bytes.
 * checked is the result of executing the actual accepted native validator.
 */
export function prepareMdNativeFixture({fixture, census, fieldMap, report, checked, basisFields}) {
  requireCondition(isMdNativeCandidate(MD_NATIVE_FAMILY, fieldMap), 'native map schema mismatch');
  requireCondition(same(fieldMap.maps[0].explicitMappings, TEXT_FACTS), 'source fact mapping changed');
  requireCondition(report.fixture === fixture && report.familyId === MD_NATIVE_FAMILY, 'fixture/report identity mismatch');
  requireCondition(same(fieldMap.fixtures[fixture], {writes: report.writes, blanks: report.blanks}), 'fixture map/report differs');
  requireCondition(checked?.mayMarkDisposition === true && checked.missing.length === 0, 'selected disposition lacks required facts');
  requireCondition(same(report.confirmedConditions, checked.conditions)
    && report.earliestOrdinaryFilingDate === checked.earliest, 'report/validator chronology or confirmations differ');
  const facts = checked.facts;
  requireCondition(!facts.attorney || Object.values(facts.attorney).every(value => !held(value)), 'attorney facts are outside this reviewed self-represented candidate');
  const expectedSelections = new Map([
    [COURTS[facts.court.level], {key: 'court.level', expected: facts.court.level}],
    [EVENTS[facts.case.event], {key: 'case.event', expected: facts.case.event}],
    [basisFields[facts.case.basis], {key: 'case.basis', expected: facts.case.basis}]
  ]);
  requireCondition(!expectedSelections.has(undefined), 'selected court, event or disposition fact is missing');
  if (facts.court.transfer === 'adult') expectedSelections.set(TRANSFER, {key: 'court.transfer', expected: 'adult'});
  const selections = new Map([
    ...Object.entries(COURTS).map(([value, field]) => [field, {key: 'court.level', value}]),
    ...Object.entries(EVENTS).map(([value, field]) => [field, {key: 'case.event', value}]),
    ...Object.entries(basisFields).map(([value, field]) => [field, {key: 'case.basis', value}]),
    [TRANSFER, {key: 'court.transfer', value: 'adult'}]
  ]);
  requireCondition(Object.keys(basisFields).length === 10 && selections.size === 16, 'source selection vocabulary differs');
  const expectedFields = new Set([...Object.keys(TEXT_FACTS), ...NARRATIVE_FIELDS,
    ...ATTORNEY_FIELDS, ...PARTICIPANT_EXECUTION, ...selections.keys(), 'Reset Form']);
  requireCondition(census.length === 47 && expectedFields.size === 47
    && new Set(census.map(field => field.name)).size === 47, 'incomplete or duplicate 47-field census');
  for (const sourceField of census) requireCondition(expectedFields.has(sourceField.name), 'unbound source field or unknown actor: ' + sourceField.name);
  const recorded = new Map();
  for (const write of report.writes) {
    requireCondition(!recorded.has(write.field) && expectedFields.has(write.field), 'duplicate or non-source native write: ' + write.field);
    requireCondition(!write.owner && !write.role && !write.sourceActorEvidence, 'unrecognized native actor declaration: ' + write.field);
    recorded.set(write.field, write);
  }
  const blankByField = new Map();
  for (const blank of report.blanks) {
    requireCondition(!blankByField.has(blank.field), 'duplicate native blank: ' + blank.field);
    requireCondition(expectedFields.has(blank.field) || blank.field === 'Signature of Defendant / Date Defendant Signed', 'unbound native blank or unknown actor: ' + blank.field);
    requireCondition(blank.document === FORM && blank.page === 1, 'native blank source identity differs');
    requireCondition(!blank.owner && !blank.role && !blank.sourceActorEvidence, 'unrecognized native actor declaration: ' + blank.field);
    blankByField.set(blank.field, blank);
  }
  const mapped = {writes: [], refusals: [], availableFacts: {}}, ledger = [];
  for (const key of Object.values(TEXT_FACTS)) if (held(at(facts, key))) mapped.availableFacts[key] = at(facts, key);
  for (const sourceField of census) {
    const name = sourceField.name, write = recorded.get(name), blank = blankByField.get(name);
    const expectedType = selections.has(name) ? 'PDFCheckBox' : name === 'Reset Form' ? 'PDFButton'
      : name === "Court's City/County" ? 'PDFDropdown' : 'PDFTextField';
    requireCondition(sourceField.type === expectedType && sourceField.widgets.length === 1 && sourceField.widgets[0].page === 1, 'source type/page mismatch: ' + name);
    const row = {fieldId: name, fieldName: name, field: name, label: name, documentId: FORM, page: 1,
      factId: TEXT_FACTS[name] ?? (NARRATIVE_FIELDS.includes(name) ? 'case.incidentNarrative' : FORM + '/' + name),
      isSelectionControl: selections.has(name)};
    let accounting, reason;
    if (write) {
      requireCondition(!blank && !ATTORNEY_FIELDS.has(name) && !PARTICIPANT_EXECUTION.has(name)
        && name !== 'Reset Form', 'protected or simultaneously blank field written: ' + name);
      requireCondition(write.page === 1 && same(write.widgets, sourceField.widgets.map(widget => ({rect: widget.rect}))), 'source write geometry differs: ' + name);
      if (selections.has(name)) {
        requireCondition(write.kind === 'explicit_selection' && write.value === true && expectedSelections.has(name), 'unsupported selected field: ' + name);
        row.factId = FORM + '/' + name;
      } else {
        requireCondition(write.kind === 'held_text' && write.factId === row.factId && typeof write.value === 'string' && !!write.value.trim(), 'text fact identity differs: ' + name);
        if (TEXT_FACTS[name]) {
          const fact = at(facts, row.factId);
          requireCondition(held(fact) && write.value === (DATE_FACTS.has(row.factId) ? dateText(fact) : fact), 'known text fact differs or is missing: ' + name);
        }
      }
      mapped.writes.push({...row, value: write.value}); recorded.delete(name);
      accounting = 'WRITTEN'; reason = 'Exact source field and native write, bound to this fixture and accepted validator.';
    } else if (ATTORNEY_FIELDS.has(name)) {
      requireCondition(blank?.disposition === 'not_applicable_pro_se' && blank.requiredBeforeFiling === false && !held(blank.value), 'attorney role blank not explicitly self-represented: ' + name);
      reason = 'This exact self-represented fixture has no attorney; the source attorney block does not take participant identity or contact information.';
      mapped.refusals.push({...row, reason, completenessDisposition: 'NOT_APPLICABLE_ON_THIS_ROUTE', routeConditionThatMakesItInapplicable: reason});
      accounting = 'ATTORNEY_BLOCK_NOT_APPLICABLE';
    } else if (PARTICIPANT_EXECUTION.has(name)) {
      const execution = blankByField.get('Signature of Defendant / Date Defendant Signed');
      requireCondition(execution?.disposition === 'signature_or_date_participant_completion' && !held(execution.value), 'participant execution disclosure missing');
      reason = execution.why;
      mapped.refusals.push({...row, reason, refusalClass: 'signature_or_date_participant_completion'});
      accounting = 'PROTECTED_EXECUTION';
    } else if (name === 'Reset Form') {
      reason = 'Exact source PDFButton Reset Form is a viewer UI control; never a filing fact.';
      mapped.refusals.push({...row, reason}); accounting = 'SOURCE_VIEWER_CONTROL';
    } else if (selections.has(name)) {
      requireCondition(!expectedSelections.has(name), 'required selected field is missing: ' + name);
      const alternative = selections.get(name);
      requireCondition(at(facts, alternative.key) !== alternative.value, 'selected fact was misclassified as an alternative');
      reason = `This fixture supplies ${alternative.key}=${at(facts, alternative.key)}; the source alternative ${alternative.value} is not selected.`;
      mapped.refusals.push({...row, reason, completenessDisposition: 'NOT_APPLICABLE_ON_THIS_ROUTE', routeConditionThatMakesItInapplicable: reason});
      accounting = 'UNSELECTED_SOURCE_ALTERNATIVE';
    } else if (TEXT_FACTS[name]) {
      requireCondition(!held(at(facts, row.factId)) && blank && !held(blank.value), 'known field missing its native write: ' + name);
      if (OPTIONAL_FACTS.has(row.factId)) {
        requireCondition(blank.disposition === 'optional_blank' && blank.requiredBeforeFiling === false, 'optional source fact falsely required: ' + name);
        reason = `The accepted 072A mapping makes ${row.factId} optional; this exact fixture supplies no value. The contact channel or tracking identifier is not invoked.`;
        mapped.refusals.push({...row, reason, completenessDisposition: 'NOT_APPLICABLE_ON_THIS_ROUTE', routeConditionThatMakesItInapplicable: reason});
        accounting = 'OPTIONAL_FACT_NOT_SUPPLIED';
      } else {
        requireCondition(blank.disposition === 'required_before_filing' && blank.requiredBeforeFiling === true, 'required missing fact is not disclosed: ' + name);
        reason = blank.why;
        mapped.refusals.push({...row, reason, completenessDisposition: 'REQUIRED_BEFORE_FILING', requiredBeforeFiling: true, factAvailable: false});
        accounting = 'REQUIRED_BEFORE_FILING';
      }
    } else throw Error('unclassified source blank: ' + name);
    ledger.push({fixture, documentId: FORM, sourceSha256: SOURCE_SHA, sourcePage: 1, field: name,
      sourceType: sourceField.type, accounting, reason, factId: row.factId});
  }
  requireCondition(recorded.size === 0, 'native report has unconsumed writes');
  const narrative = NARRATIVE_FIELDS.map(name => report.writes.find(write => write.field === name)?.value ?? '').join(' ');
  requireCondition(held(facts.case.incidentNarrative) && normalizeSpace(narrative) === normalizeSpace(facts.case.incidentNarrative), 'complete incident narrative was not written');
  requireCondition(mapped.writes.length + mapped.refusals.length === 47, 'source accounting is incomplete');
  return {fieldMap: mapped, ledger};
}

export function auditMdNativeCandidate({root, directory, familyId}, auditPrepared) {
  try {
    requireCondition(familyId === MD_NATIVE_FAMILY && directory === MD_NATIVE_DIRECTORY, 'native candidate family/directory mismatch');
    const bytes = fs.readFileSync(BINDING);
    requireCondition(sha(bytes) === BINDING_SHA, 'review-input binding changed');
    const binding = JSON.parse(bytes);
    for (const file of binding.files) {
      const actual = read(root, file.path);
      requireCondition(actual.length === file.byteLength && sha(actual) === file.sha256, 'reviewed input mismatch: ' + file.path);
    }
    const get = relative => JSON.parse(read(root, directory + '/' + relative));
    const fieldMap = get('production-field-map.json'), census = get('official-field-census.json');
    const receipt = get('source-receipt.json'), index = get('reports/rendered-artifacts.json').pdfs;
    requireCondition(isMdNativeCandidate(familyId, fieldMap), 'native source map schema mismatch');
    requireCondition(receipt.officialFormId === FORM && receipt.sourcePath === SOURCE && receipt.sha256 === SOURCE_SHA
      && receipt.sourcePageCount === 1 && receipt.edition === '09/2025' && sha(read(root, SOURCE)) === SOURCE_SHA, 'exact 072A source receipt mismatch');
    requireCondition(index.length === 15 && new Set(index.map(item => item.fixture)).size === 15
      && index.reduce((sum, item) => sum + item.pageCount, 0) === 60, 'incomplete or duplicate 15-PDF/60-page inventory');
    const original = JSON.parse(read(root, REVIEW + 'md-independent-review.json')).rows.find(row => row.familyId === familyId);
    const delta = JSON.parse(read(root, REVIEW + 'md-guard-delta-03.json')).rows.find(row => row.familyId === familyId);
    const measurements = JSON.parse(read(root, REVIEW + 'md-measurements.json'));
    requireCondition(original?.suppliedPdfVerdict === 'PASS_REVIEWED_FIXTURES' && delta?.verdict === 'PASS'
      && delta.failedObligations.length === 0 && delta.measuredIdentities.newHelperGitBlob === HELPER_BLOB
      && measurements.familyId === familyId && measurements.wholePdfs.length === 15, 'independent source/output or guard review binding differs');
    const helperBytes = read(root, HELPER);
    requireCondition(createHash('sha1').update(Buffer.from(`blob ${helperBytes.length}\0`)).update(helperBytes).digest('hex') === HELPER_BLOB, 'accepted chronology helper differs');
    const allFacts = index.map(item => get('fixtures/' + item.fixture + '.facts.json'));
    // Execute validation only. No renderer, raster or output generation occurs.
    const helper = pathToFileURL(path.join(root, HELPER)).href;
    const program = `import fs from 'node:fs';import {validateMdFavorable,BASIS_FIELDS} from ${JSON.stringify(helper)};console.log(JSON.stringify({basisFields:BASIS_FIELDS,checked:JSON.parse(fs.readFileSync(0,'utf8')).map(validateMdFavorable)}));`;
    const checked = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program],
      {input: JSON.stringify(allFacts), encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024}));
    const fixtureResults = [];
    for (const [i, item] of index.entries()) {
      const report = get('reports/' + item.fixture + '.json');
      const measured = measurements.wholePdfs.find(pdf => directory + '/' + pdf.file === item.file);
      requireCondition(item.file === `${directory}/fixtures/${item.fixture}.pdf` && report.inputPath === `fixtures/${item.fixture}.facts.json`
        && report.inputSha256 === sha(read(root, directory + '/' + report.inputPath)), 'fixture fact path/digest differs: ' + item.fixture);
      requireCondition(measured?.sha256 === item.sha256 && measured.bytes === item.byteLength && measured.pages.length === 4
        && report.output.sha256 === item.sha256 && report.output.file === item.file
        && report.output.byteLength === item.byteLength && report.output.pageCount === 4 && item.pageCount === 4
        && report.sourceSha256 === SOURCE_SHA && report.sourcePath === SOURCE, 'reviewed output identity differs: ' + item.fixture);
      requireCondition(same(report.selectedComponents, [FORM]) && same(item.components, [FORM]) && item.pageManifest.length === 4,
        'selected component set differs: ' + item.fixture);
      for (const [pageIndex, page] of item.pageManifest.entries()) requireCondition(page.packetPage === pageIndex + 1
        && (pageIndex === 0 ? page.documentId === FORM && page.sourcePage === 1 && page.sourceSha256 === SOURCE_SHA && page.role === 'primary_filing'
          : page.documentId === 'participant-instructions' && page.role === 'participant_instructions'), 'source/component page sequence differs');
      const instructions = execFileSync('pdftotext', ['-f', '2', '-l', '4', '-layout', path.join(root, item.file), '-'],
        {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024});
      const prepared = prepareMdNativeFixture({fixture: item.fixture, census, fieldMap, report,
        checked: checked.checked[i], basisFields: checked.basisFields});
      const result = auditPrepared({fieldMap: prepared.fieldMap, census: null, actualWrites: null,
        receipt: {allSourcesExact: true, documents: [{formNumber: FORM, sha256: SOURCE_SHA, path: SOURCE}]},
        rendered: {componentIdentityMode: 'exact', packets: [{documents: [FORM, 'participant-instructions']}]},
        approval: {status: 'INDEPENDENT_CANDIDATE_PASS_NOT_ADMITTED'}, instructions});
      fixtureResults.push({...result, fixture: item.fixture, pdfSha256: item.sha256, pageCount: item.pageCount,
        selectedComponentIds: [FORM, 'participant-instructions'], ledger: prepared.ledger});
    }
    const counters = Object.fromEntries(PASS_COUNTERS.map(key => [key, fixtureResults.reduce((sum, result) => sum + result.counters[key], 0)]));
    const blanksByDisposition = {};
    for (const result of fixtureResults) for (const [key, count] of Object.entries(result.totals.blanksByDisposition)) blanksByDisposition[key] = (blanksByDisposition[key] ?? 0) + count;
    const total = key => fixtureResults.reduce((sum, result) => sum + result.totals[key], 0);
    return {familyId, directory, result: fixtureResults.find(result => result.result !== 'PASS_COMPLETE')?.result ?? 'PASS_COMPLETE',
      auditable: true, counters, totals: {terminalFields: total('terminalFields'), written: total('written'), blank: total('blank'),
        blanksByDisposition, rowsInspected: total('rowsInspected'), fieldMapSchema: 'native-md-47-source-fields-per-fixture'},
      findings: fixtureResults.flatMap(result => result.findings.map(finding => ({...finding, fixture: result.fixture}))), findingsTruncated: 0,
      sourceCurrentness: 'EXACT', fixtureResults, reviewInputFilesMatched: binding.files.length, independentReviewReused: binding.review,
      staticCounterScope: 'Exhaustive 47-source-field classification for all 15 exact retained fixtures, using each fixture facts and actual delivered instructions. Existing independent visual/source/output and guard evidence is reused only for its unchanged bounded scope.',
      visualProofReuse: {originalReviewCommit: binding.review.originalCommit, guardDeltaCommit: binding.review.guardDeltaCommit,
        unchangedPdfs: 15, unchangedPages: 60, actualTextChecksReused: 268, selectedInkChecksReused: 46, protectedRegionChecksReused: 165, freshVisualReview: false},
      runtimeIntakeCounters: null, runtimeInstalled: false, centralRasterAdmission: false, terminalPromotions: 0, packetRebuilds: 0};
  } catch (error) { return failure(directory, familyId, error); }
}
