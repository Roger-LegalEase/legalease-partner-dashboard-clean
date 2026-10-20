import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFName, decodePDFRawStream } from 'pdf-lib';
import { censusOf, renderCandidate } from './build-census-v1-md_juvenile_expungement-set.mjs';
import { SOURCE, verifySource } from './rcap-corpus/import-md-juvenile-source.mjs';
import { flattenedWidgets, drawnAt } from './rcap-official-forms/pdf-flattened-widgets.mjs';
const root = process.cwd(), out = process.env.MD_CONNECTION_EVIDENCE;
assert(out && path.isAbsolute(out) && !fs.existsSync(out), 'fresh external evidence directory required');
fs.mkdirSync(out, { recursive: true });
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const Q = await import('../src/lib/expungement-ai/md-juvenile-document-questions.ts');
const { default: ts } = await import('typescript');
const original = { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', case_outcome: 'Dismissed, no-billed, nolle prosequi, or not prosecuted', offense_level: 'Misdemeanor', possible_pathway_context: 'Juvenile expungement', age_at_offense: '30', prior_relief: 'Yes', pardon_status: 'No', sentence_completion_date: 'Yes', financial_obligations: 'Yes', pending_cases: 'No', resolved_timing_bucket: 'gt_10_years', state_exclusion_categories: ['None of these'] };
const item = { id: 'synthetic-md-document-owner', jurisdiction: 'MD', artifactRefs: {} }, owner = 'synthetic-md-owner';
const authoritative = evaluate({ jurisdiction: 'MD', profileVersion: getProfileByJurisdiction('MD').profileVersion, matterId: item.id, answers: original });
assert.equal(authoritative.evaluation.pathwayId, 'juvenile-expungement');
assert.equal(authoritative.evaluation.resultCode, 'not_covered_yet');
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: original, prefilledAnswers: {}, packetAnswers: {}, dependencies: { commercialFlowVersion: 1 }, capturedAt: '2026-10-16T00:00:00Z' });
let stored = { status: 'unverified', reason: 'synthetic-original124B', revision: 0, draftHash: P.protectedPacketDraftHash(seed.snapshot), draftSnapshot: seed.snapshot, hash: null, snapshot: null };
let requestOwner = owner, authenticated = true, verified = true, casConflict = false, writes = 0;
const checks = [], artifacts = [], http = [];
function check(name, fn) { fn(); checks.push(name); }
const originalRecord = structuredClone(stored);
fs.writeFileSync(path.join(out, 'initial-protected-record.json'), JSON.stringify(originalRecord, null, 2) + '\n');
globalThis.__mdDocumentTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: requestOwner }),
  getBriefcaseItem: async (user, id) => user === owner && id === item.id ? item : null,
  readProtectedPacketVerification: async () => ({ ok: true, value: stored }),
  persistProtectedPacketVerification: async ({ transition }) => {
    if (casConflict) return { ok: false, reason: 'protected_verification_transition_refused' };
    assert.equal(transition.expectedPriorRevision, stored.revision); writes++;
    stored = structuredClone(transition.nextVerification); return { ok: true, value: stored };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: { fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false } }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('no substituted seed'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('no substituted authority'); }
};
const apiFile = path.join(root, 'src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');
let apiSource = fs.readFileSync(apiFile, 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(apiSource)); apiSource = apiSource.replace(pattern, bindings.map(b => `const ${b}=(...args:unknown[])=>(globalThis as any).__mdDocumentTransport.${b}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(apiFile).href, source: ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(pathToFileURL(apiFile).href), context = { params: Promise.resolve({ itemId: item.id }) };
const url = `http://local.test/api/expungement-ai/briefcase/${item.id}/packet-information?preparation=md-juvenile`;
async function request(method = 'GET', body, target = url) {
  const r = await API[method](new Request(target, method === 'POST' ? { method, body: JSON.stringify({ expectedRevision: stored.revision, answers: {}, ...body }) } : {}), context);
  const value = await r.json(); http.push({ method, status: r.status, value }); return { status: r.status, value };
}
async function save(answers, extra = {}) {
  const r = await request('POST', { answers, ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.value)); assert.equal(r.value.readyToGenerate, false);
  assert.deepEqual(r.value.commercialActions, { fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false });
  return r.value;
}
const first = await request();
check('actual protected API offers exact juvenile source questions', () => { assert.equal(first.status, 200); assert(first.value.questions.some(q => q.id === 'md_juvenile_disposition')); });
check('GET preserves complete owner record', () => assert.deepEqual(stored, originalRecord));
await save({}); check('preparation no-op preserves complete owner record', () => assert.deepEqual(stored, originalRecord));
const input = {
  participant_full_legal_name: 'Jordan Example', court: 'Original juvenile court', county: 'Baltimore City', charge: 'Synthetic juvenile charge',
  md_juvenile_case_number: 'J-2020-01234', md_juvenile_court_address: '100 Example Court Road', md_juvenile_birth_date: '2000-01-01',
  md_juvenile_tracking_number: 'T-0012', md_juvenile_other_reference: 'R-0034', md_juvenile_incident_date: '2016-03-02', md_juvenile_agency: 'Synthetic County Police',
  md_juvenile_incident_place: 'Example City', md_juvenile_incident: 'I was present at the recorded incident. This is a synthetic participant statement.',
  md_juvenile_disposed_date: '2016-06-04', md_juvenile_phone: '202-555-0123', md_juvenile_fax: '202-555-0124', md_juvenile_email: 'jordan@example.test',
  md_juvenile_address: '123 Example Road', md_juvenile_city_state_zip: 'Example City, MD 21201', md_juvenile_arrest_or_citation: 'arrest', md_juvenile_disposition: 'dismissed',
  ...Object.fromEntries(Q.MD_JUVENILE_DECLARATIONS.map(([id]) => [id, 'Yes']))
};
await save(input, { confirmRecordFacts: ['county'] });
check('all exact owner values persist through API', () => { for (const [id, value] of Object.entries(input)) assert.deepEqual(stored.draftSnapshot.packetAnswers[id], value, id); });
check('original screening remains exact', () => assert.deepEqual(stored.draftSnapshot.screeningAnswers, originalRecord.draftSnapshot.screeningAnswers));
const positiveRecord = structuredClone(stored);
const preparationAnswers = Object.fromEntries(Object.entries(positiveRecord.draftSnapshot.packetAnswers)
  .filter(([id]) => id.startsWith('md_juvenile_')));
const ordinarySave = await request('POST', { answers: { county: 'Baltimore County' } }, url.split('?')[0]);
check('ordinary county save preserves the 27 source answers', () => {
  assert.equal(Object.keys(preparationAnswers).length, 27);
  assert.equal(ordinarySave.status, 200, JSON.stringify(ordinarySave.value));
  assert.equal(stored.draftSnapshot.packetAnswers.county, 'Baltimore County');
  for (const [id, value] of Object.entries(positiveRecord.draftSnapshot.packetAnswers))
    if (id !== 'county') assert.deepEqual(stored.draftSnapshot.packetAnswers[id], value, id);
  assert.deepEqual(stored.draftSnapshot.screeningAnswers, positiveRecord.draftSnapshot.screeningAnswers);
  assert.deepEqual(stored.draftSnapshot.prefilledAnswers, positiveRecord.draftSnapshot.prefilledAnswers);
  assert.deepEqual(ordinarySave.value.commercialActions, { fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false });
});
const afterOrdinarySave = structuredClone(stored);
const ordinaryNoop = await request('POST', { answers: {} }, url.split('?')[0]);
check('ordinary no-op after preparation preserves the complete record', () => {
  assert.equal(ordinaryNoop.status, 200); assert.deepEqual(stored, afterOrdinarySave);
});
check('preparation verification is refused at the shared save boundary', () => {
  assert.equal(P.packetInformationPatch({ existingItem: item, answers: {}, verify: true,
    mdJuvenilePreparation: true, protectedVerification: stored }), null);
  assert.deepEqual(stored, afterOrdinarySave);
});
stored = structuredClone(positiveRecord);

const { mdJuvenileProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/md-juvenile-document-preparation.ts');
const sourceBytes = verifySource(fs.readFileSync(path.join(root, SOURCE.path))), census = await censusOf(sourceBytes), source = await PDFDocument.load(sourceBytes, { updateMetadata: false });
const decoded = (doc, ref) => Buffer.from(decodePDFRawStream(doc.context.lookup(ref)).decode());
async function render(name, expectedSelected) {
  const before = structuredClone(stored), response = await request(), preparation = response.value.mdJuvenilePreparation;
  assert.deepEqual(preparation, JSON.parse(JSON.stringify(prepare(stored))));
  const directory = path.join(out, name), result = await renderCandidate(sourceBytes, preparation.input, directory);
  const appearances = await flattenedWidgets(path.join(directory, 'candidate.pdf')), pdf = await PDFDocument.load(result.bytes, { updateMetadata: false });
  const comparisons = [];
  for (const row of census.rows.filter(r => r.type === 'checkbox')) {
    const at = drawnAt(appearances, row.widgets[0]); assert.equal(at.length, 1);
    const widget = source.getForm().getCheckBox(row.name).acroField.getWidgets()[0], normal = widget.getAppearances().normal;
    const on = normal.entries().find(([key]) => key.toString() !== '/Off')[1], off = normal.get(PDFName.of('Off'));
    if (!off) assert.equal(widget.getAppearanceState().toString(), '/Off');
    const objects = pdf.context.lookup(pdf.context.lookup(pdf.getPage(at[0].page - 1).node.get(PDFName.of('Resources'))).get(PDFName.of('XObject')));
    const actual = decoded(pdf, objects.get(PDFName.of(at[0].appearance)));
    const selected = expectedSelected.includes(row.name), expected = selected ? decoded(source, on) : off ? decoded(source, off) : Buffer.alloc(0);
    assert(actual.equals(expected), `${name}/${row.name}: exact source ${selected ? 'On' : 'Off'} appearance`);
    comparisons.push({ field: row.name, selected, sourceOff: off ? 'explicit' : 'absent_with_Off_state', sha256: createHash('sha256').update(actual).digest('hex') });
  }
  for (const name of ['Signature', 'Date', 'Filing Date']) assert(!result.actualWrites.some(row => row.field === name));
  assert.deepEqual(result.refusedFieldsWithInk, []); assert.equal(result.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0);
  assert.deepEqual(stored, before); assert.equal(result.status, 'HELD_DRAFT'); assert.equal(result.paymentAllowed, false);
  artifacts.push({ name, sha256: createHash('sha256').update(result.bytes).digest('hex'), comparisons, writes: result.actualWrites, holds: result.holds });
  fs.writeFileSync(path.join(out, 'render-progress.json'), JSON.stringify(artifacts, null, 2) + '\n');
  return result;
}
let result = await render('positive', [Q.MD_JUVENILE_ARREST_FIELDS.arrest, Q.MD_JUVENILE_DISPOSITIONS[1][3], ...Q.MD_JUVENILE_DECLARATIONS.map(row => row[3])]);
check('both case-number widgets contain actual saved case', () => assert.deepEqual(result.actualWrites.filter(w => w.field === 'Case Number').map(w => [w.page, w.drawnText]), [[1, input.md_juvenile_case_number], [2, input.md_juvenile_case_number]]));
check('every supplied text destination reaches saved PDF', () => { for (const [id, field] of Q.MD_JUVENILE_TEXT_FIELDS) assert(result.actualWrites.some(w => w.field === field && w.drawnText === input[id]), field); });
check('accepted four writes remain connected', () => { for (const field of ['City/County of Circuit Court', 'RespondentPetitioner', 'Printed Name', 'I was charged with the offense of']) assert(result.actualWrites.some(w => w.field === field), field); });
for (const [choice, , , field] of Q.MD_JUVENILE_DISPOSITIONS) {
  await save({ md_juvenile_disposition: choice, md_juvenile_arrest_or_citation: 'citation', ...Object.fromEntries(Q.MD_JUVENILE_DECLARATIONS.map(([id]) => [id, 'No'])) });
  await render('disposition-' + choice, [Q.MD_JUVENILE_ARREST_FIELDS.citation, field]);
}
check('negative declarations stay saved and unmarked', () => { for (const [id] of Q.MD_JUVENILE_DECLARATIONS) assert.equal(stored.draftSnapshot.packetAnswers[id], 'No'); });
await save({ md_juvenile_disposition: 'unknown', md_juvenile_arrest_or_citation: 'unknown', md_juvenile_case_number: { value: input.md_juvenile_case_number, unknown: true }, md_juvenile_restitution: 'unknown' });
result = await render('uncertainty', []);
check('unknown values stay stored and unprinted', () => { assert(!result.actualWrites.some(w => w.field === 'Case Number')); assert.deepEqual(stored.draftSnapshot.packetAnswers.md_juvenile_case_number, { value: input.md_juvenile_case_number, unknown: true }); });
const uncertain = structuredClone(stored); await save({}); check('uncertain no-op preserves entire saved row', () => assert.deepEqual(stored, uncertain));
await save({ md_juvenile_case_number: input.md_juvenile_case_number });
check('correction keeps previous raw unknown in history', () => assert(stored.draftSnapshot.dependencies.semanticAnswerHistory.some(h => h.factId === 'md_juvenile_case_number' && h.value?.unknown === true)));
for (const [name, body, target, code] of [
  ['categorical unknown wrapper refuses', { answers: { md_juvenile_disposition: { value: 'dismissed', unknown: true } } }, url, 422],
  ['exclusive choice rejects array', { answers: { md_juvenile_disposition: ['dismissed', 'nolle_prosequi'] } }, url, 422],
  ['verify forbidden', { verify: true }, url, 422], ['stale revision', { expectedRevision: stored.revision - 1, answers: { md_juvenile_agency: 'must not save' } }, url, 409],
  ['foreign signature', { answers: { signature: 'must not save' } }, url, 422],
  ['ordinary mode cannot write declaration', { answers: { md_juvenile_restitution: 'Yes' } }, url.split('?')[0], 422]
]) { const before = structuredClone(stored), count = writes, r = await request('POST', body, target); check(name, () => { assert.equal(r.status, code, JSON.stringify(r.value)); assert.deepEqual(stored, before); assert.equal(writes, count); }); }
for (const [name, alter, restore, code] of [
  ['wrong owner', () => { requestOwner = 'other'; }, () => { requestOwner = owner; }, 404],
  ['unauthenticated', () => { authenticated = false; }, () => { authenticated = true; }, 401],
  ['unverified account', () => { verified = false; }, () => { verified = true; }, 403],
  ['CAS refusal', () => { casConflict = true; }, () => { casConflict = false; }, 409]
]) { const before = structuredClone(stored); alter(); const r = await request('POST', { answers: { md_juvenile_agency: 'must not save' } }); restore(); check(name, () => { assert.equal(r.status, code); assert.deepEqual(stored, before); }); }
for (const [key, value] of [['profileSourceFingerprint', '0'.repeat(64)], ['profileAuthorityFingerprint', '0'.repeat(64)], ['pathwayId', 'adult-non-conviction-expungement-under-crim-proc-10-105'], ['paymentAllowed', true]]) {
  const before = structuredClone(stored); stored.draftSnapshot[key] = value; stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
  const r = await request(); check('changed protected scope refuses ' + key, () => assert.equal(r.status, 409)); stored = before;
}
stored = structuredClone(positiveRecord); stored.draftHash = '0'.repeat(64); check('corrupt protected hash refuses projection', () => assert.equal(prepare(stored), null)); stored = structuredClone(positiveRecord);
stored.draftSnapshot.screeningAnswers.md_juvenile_case_number = 'conflicting saved case'; stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
result = await render('conflict', Object.keys(prepare(stored).documentFacts.selections));
check('conflicting maps cannot silently choose a case', () => assert(!result.actualWrites.some(w => w.field === 'Case Number')));
await save({}, { confirmRecordFacts: ['md_juvenile_case_number'] });
check('explicit conflict confirmation archives prior source', () => { assert(!prepare(stored).conflictingOrUnconfirmedFactIds.includes('md_juvenile_case_number')); assert(stored.draftSnapshot.dependencies.semanticAnswerHistory.some(h => h.factId === 'md_juvenile_case_number' && h.value === 'conflicting saved case')); });
await save({ court: 'Different transferee juvenile court' });
result = await render('stale-county', Object.keys(prepare(stored).documentFacts.selections));
check('court change invalidates county write', () => assert(!result.actualWrites.some(w => w.field === 'City/County of Circuit Court')));
check('all read/save/render paths preserve hold', () => { assert.equal(stored.draftSnapshot.paymentAllowed, false); assert.notEqual(stored.status, 'verified'); assert.equal(stored.hash, undefined); assert.equal(stored.snapshot, undefined); });
check('exact original source unchanged', () => assert.deepEqual(fs.readFileSync(path.join(root, SOURCE.path)), sourceBytes));
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ status: 'PASS', checks, artifacts, http, sourceSha256: SOURCE.sha256, limitations: ['Synthetic owner transport; no live database, independent output acceptance or authorized delivery claimed.'] }, null, 2) + '\n');
console.log(JSON.stringify({ status: 'PASS', checks: checks.length, renderedCases: artifacts.length, sourceAppearanceComparisons: artifacts.reduce((n, r) => n + r.comparisons.length, 0), http: http.length }));
