/** Kentucky AOC-496.2 petition and conditional AOC-496 proposed-order adapter.
 *
 * The section-6 election is record driven. The adapter refuses a packet unless
 * one exact ground is established, and it never copies a participant election
 * into the court-owned proposed order.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFCheckBox, PDFDocument, PDFDropdown, PDFName, PDFString, PDFTextField, StandardFonts} from 'pdf-lib';
import {fitTextToWidget, applyFitToTextField, wrapToWidth} from '../rcap-official-forms/rcap-text-fitting.mjs';
import {ensureDefaultAppearances, sanitizeAndFlatten, scanBytesForActiveContent} from '../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata} from '../rcap-official-forms/rcap-official-form-finalize.mjs';
import {stampDeterministic} from '../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
import {readOutputGlyphs} from '../rcap-official-forms/rcap-output-glyph-reading.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FAMILY = 'ky_misdemeanor_expungement-set';
export const ROUTE = 'obligation:track-pathway:KY:ky_misdemeanor_expungement:misdemeanor-violation-traffic-conviction';
export const OUT = 'data/rcap-all50/overlays/census-v1/ky/ky-misdemeanor-expungement-set--official-pdf-fill';
const SOURCE_ROOT = 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/KY/02_PACKET_FORMS';
export const SOURCES = {
  'AOC-496.2': {
    path: `${SOURCE_ROOT}/KY__FORM__AOC-496.2__petition-for-expungement__REV-2016-07__EN.pdf`,
    sha256: '5d1ca608d94911a3f2fa0ed168ea43da2d72e685b85c48b3c220ed5ea6896bde',
    byteLength: 237812,
    pages: 2,
    fields: 31,
    role: 'primary_filing',
    componentId: 'ky_misdemeanor_expungement-primary-filing-1',
    url: 'https://www.kycourts.gov/Legal-Forms/Legal%20Forms/496.2.pdf'
  },
  'AOC-496': {
    path: `${SOURCE_ROOT}/KY__FORM__AOC-496__expungement-order__REV-2016-07__EN.pdf`,
    sha256: '4c4658780c576300d55f0262fd2455d6eae2a9b2d3e73972dece8a834ea1fdbd',
    byteLength: 218186,
    pages: 2,
    fields: 33,
    role: 'proposed_order',
    componentId: 'ky_misdemeanor_expungement-proposed-order-2',
    url: 'https://www.kycourts.gov/Legal-Forms/Legal%20Forms/496.pdf'
  }
};

export const ELECTION_FIELDS = {
  ordinary_five_year: 'Check Box19',
  controlled_substances_void_218A275_8: 'Check Box20',
  marijuana_synthetic_salvia_void_218A276_8: 'Check Box21'
};
export const COURT_SELECTION_FIELDS = ['Check Box2', 'Check Box3', 'Check Box4', 'Check Box5', 'Check Box6', 'Check Box7', 'Check Box8', 'Check Box9'];
const CLASSIFICATIONS = new Set(['misdemeanor', 'violation', 'qualifying_traffic_infraction']);
const VOID_276_CATEGORIES = new Set(['marijuana', 'synthetic_drug', 'salvia']);
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const clone = structuredClone;
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const displayDate = value => value ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : '';

function exactDate(value, label, asOf = null) {
  if (typeof value !== 'string' || !dateRe.test(value)) throw Error(`INVALID_DATE: ${label}`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw Error(`INVALID_DATE: ${label}`);
  if (asOf && value > asOf) throw Error(`FUTURE_CASE_FACT: ${label}`);
  return value;
}

function addCalendarYears(value, years) {
  const d = new Date(`${value}T00:00:00Z`);
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  d.setUTCFullYear(d.getUTCFullYear() + years);
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) {
    throw Error('CALENDAR_ANNIVERSARY_REVIEW: leap-day completion requires human confirmation');
  }
  return d.toISOString().slice(0, 10);
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim() || /^(unknown|tbd|see attached|enter |insert |test prose)/i.test(value.trim())) {
    throw Error(`ACTUAL_RECORD_FACT_REQUIRED: ${label}`);
  }
  return value.trim();
}

function requireExactBoolean(value, expected, label) {
  if (value === null || value === undefined) throw Error(`AMBIGUOUS_RECORD_FACT: ${label}`);
  if (value !== expected) throw Error(`CONDITION_NOT_MET: ${label}`);
}

/** Fail closed unless the record supports exactly one adopted section-6 ground. */
export function resolveElection(record, asOf) {
  if (!record || typeof record !== 'object') throw Error('RECORD_REQUIRED');
  if (!Array.isArray(record.groundsClaimed) || record.groundsClaimed.length !== 1) {
    throw Error('AMBIGUOUS_OR_CONFLICTING_GROUNDS');
  }
  const ground = record.groundsClaimed[0];
  if (!Object.hasOwn(ELECTION_FIELDS, ground)) throw Error('UNMAPPED_ELECTION_GROUND');
  requireExactBoolean(record.dispositionConfirmed, true, 'exact conviction or disposition confirmed');
  requireExactBoolean(record.classificationConfirmed, true, 'offense classification confirmed from court record');
  if (!CLASSIFICATIONS.has(record.offenseClassification)) throw Error('UNSUPPORTED_OR_UNKNOWN_CLASSIFICATION');

  if (ground === 'ordinary_five_year') {
    if (record.disposition !== 'convicted') throw Error('ORDINARY_ROUTE_REQUIRES_CONVICTION');
    requireExactBoolean(record.ordinaryKrs431078Route, true, 'ordinary KRS 431.078 route');
    if (record.expressVoidingStatute !== null) throw Error('CONFLICTING_ORDINARY_AND_VOID_GROUNDS');
    const sentence = exactDate(record.sentenceCompletionDate, 'sentence completion', asOf);
    if (typeof record.probationApplicable !== 'boolean') throw Error('AMBIGUOUS_RECORD_FACT: probation applicability');
    let probation = null;
    if (record.probationApplicable) probation = exactDate(record.probationCompletionDate, 'probation completion', asOf);
    else if (record.probationCompletionDate !== null) throw Error('CONFLICTING_PROBATION_FACTS');
    const laterCompletionDate = probation && probation > sentence ? probation : sentence;
    const firstEligibleDate = addCalendarYears(laterCompletionDate, 5);
    if (asOf < firstEligibleDate) throw Error(`WAIT_NOT_MET: first eligible date ${firstEligibleDate}`);
    return {ground, field: ELECTION_FIELDS[ground], laterCompletionDate, firstEligibleDate};
  }

  if (record.disposition !== 'voided') throw Error('VOID_ROUTE_REQUIRES_VOID_DISPOSITION');
  requireExactBoolean(record.ordinaryKrs431078Route, false, 'void route is not the ordinary five-year ground');
  if (record.sentenceCompletionDate !== null || record.probationCompletionDate !== null || record.probationApplicable !== false) {
    throw Error('CONFLICTING_VOID_AND_COMPLETION_FACTS');
  }
  if (ground === 'controlled_substances_void_218A275_8') {
    if (record.expressVoidingStatute !== 'KRS 218A.275(8)') throw Error('EXPRESS_218A275_8_VOID_REQUIRED');
    if (record.voidedOffenseCategory !== 'controlled_substances') throw Error('CONTROLLED_SUBSTANCES_CATEGORY_REQUIRED');
    requireExactBoolean(record.firstControlledSubstancesConviction, true, 'first controlled-substances conviction');
  } else {
    if (record.expressVoidingStatute !== 'KRS 218A.276(8)') throw Error('EXPRESS_218A276_8_VOID_REQUIRED');
    if (!VOID_276_CATEGORIES.has(record.voidedOffenseCategory)) throw Error('MARIJUANA_SYNTHETIC_SALVIA_CATEGORY_REQUIRED');
    if (record.firstControlledSubstancesConviction !== null) throw Error('CONFLICTING_FIRST_CONVICTION_FACT_ON_218A276_8');
  }
  return {ground, field: ELECTION_FIELDS[ground], laterCompletionDate: null, firstEligibleDate: null};
}

export function validateKy(input) {
  const f = clone(input);
  assert.equal(f.routeKey, ROUTE, 'WRONG_ROUTE');
  exactDate(f.asOf, 'asOf');
  if (typeof f.options?.includeProposedOrder !== 'boolean') throw Error('EXPLICIT_COMPONENT_ELECTION_REQUIRED');
  if (f.options.includeProposedOrder && f.options.localOrderPracticeConfirmed !== true) throw Error('ORDER_CONDITION_NOT_CONFIRMED');
  if (!f.options.includeProposedOrder && f.options.localOrderPracticeConfirmed === true) throw Error('CONFLICTING_ORDER_COMPONENT_FACTS');
  if (f.signature || f.notary || f.clerk || f.courtExecution || f.judicialFindings || f.agencyCertification
    || f.participant?.signature || f.participant?.signatureDate) throw Error('PROTECTED_EXECUTION_INPUT');
  if (f.participant?.ssn) throw Error('PRIVATE_IDENTIFIER_MANUAL_COMPLETION');
  for (const [value, label] of [[f.participant?.fullName, 'participant full name'], [f.participant?.street, 'street address'],
    [f.participant?.city, 'city'], [f.participant?.state, 'state'], [f.participant?.zip, 'ZIP'], [f.participant?.phone, 'phone'],
    [f.court?.county, 'county'], [f.court?.level, 'court level'], [f.case?.number, 'case number']]) requiredText(value, label);
  if (!['District', 'Circuit'].includes(f.court.level)) throw Error('COURT_LEVEL_REQUIRED');
  if (f.participant.state !== 'KENTUCKY') throw Error('SOURCE_DROPDOWN_STATE_REQUIRED');
  exactDate(f.participant.dateOfBirth, 'birthdate', f.asOf);
  exactDate(f.case.violationOrArrestDate, 'violation/arrest date', f.asOf);
  if (f.participant.dateOfBirth >= f.case.violationOrArrestDate) throw Error('INCONSISTENT_DOB');
  if (!Array.isArray(f.charges) || !f.charges.length) throw Error('CHARGES_REQUIRED');
  if (f.charges.length > 100) throw Error('EXCESSIVE_CHARGE_COUNT');
  const seen = new Set();
  for (const [index, charge] of f.charges.entries()) {
    const count = requiredText(charge.count, `charge ${index + 1} count`);
    if (seen.has(count)) throw Error('UNIQUE_CHARGE_COUNT_REQUIRED');
    seen.add(count);
    requiredText(charge.description, `charge ${index + 1} description`);
    if (charge.caseNumber !== f.case.number) throw Error('SEPARATE_PETITION_PER_CASE');
    if (!CLASSIFICATIONS.has(charge.classification)) throw Error('CHARGE_CLASSIFICATION_REQUIRED');
    if (charge.classification !== f.record.offenseClassification) throw Error('CHARGE_AND_RECORD_CLASSIFICATION_CONFLICT');
    requireExactBoolean(charge.recordVerified, true, `charge ${index + 1} record verification`);
  }
  if (!Array.isArray(f.agencies) || !f.agencies.length) throw Error('AGENCIES_REQUIRED');
  for (const [index, agency] of f.agencies.entries()) {
    requiredText(agency.name, `agency ${index + 1} name`);
    requiredText(agency.address, `agency ${index + 1} address`);
  }
  for (const [group, people] of [['victim', f.victims], ['relevant person', f.personsWithRelevantInformation]]) {
    if (!Array.isArray(people)) throw Error(`ACTUAL_RECORD_FACT_REQUIRED: ${group} list`);
    for (const [index, person] of people.entries()) {
      requiredText(person.name, `${group} ${index + 1} name`);
      requiredText(person.address, `${group} ${index + 1} address`);
    }
  }
  requireExactBoolean(f.confirmations?.allCaseChargesAccounted, true, 'all charges in this criminal case accounted for');
  requireExactBoolean(f.confirmations?.venueConfirmed, true, 'filing court and case number confirmed');
  requireExactBoolean(f.confirmations?.agencyListComplete, true, 'all record custodians identified');
  requireExactBoolean(f.confirmations?.noRecentFelonyOrMisdemeanorConviction, true, 'no disqualifying conviction in prior five years');
  requireExactBoolean(f.confirmations?.noPendingFelonyOrMisdemeanorProceeding, true, 'no pending or instituted felony or misdemeanor proceeding');
  requireExactBoolean(f.confirmations?.notSexOrChildOffense, true, 'not a sex offense or offense against a child');
  requireExactBoolean(f.confirmations?.enhancementInapplicableOrExpired, true, 'enhancement exclusion');
  if (f.confirmations?.multipleSeparateIncidents === true || f.confirmations?.countyAttorneyWillObject === true
    || f.confirmations?.victimWillObject === true || f.confirmations?.certificationDisputed === true
    || f.confirmations?.immigrationAdviceNeeded === true || f.confirmations?.attackingConviction === true
    || f.confirmations?.venueUnclear === true) throw Error('SELF_HELP_STOP: individualized assistance required');
  if (typeof f.confirmations?.singleIncident !== 'boolean') throw Error('AMBIGUOUS_RECORD_FACT: single incident');
  if (!f.confirmations.singleIncident) throw Error('SELF_HELP_STOP: separate-incident series is discretionary');
  const election = resolveElection(f.record, f.asOf);
  exactDate(f.record.dispositionDate, 'conviction or voiding disposition date', f.asOf);
  if (f.record.dispositionDate < f.case.violationOrArrestDate) throw Error('DISPOSITION_BEFORE_VIOLATION_OR_ARREST');
  return {facts: f, election};
}

const fixtureBase = {
  isSyntheticFixture: true,
  asOf: '2026-09-11',
  routeKey: ROUTE,
  participant: {fullName: 'Jordan Avery Reyes', street: '42 Larkspur Street', city: 'Lexington', state: 'KENTUCKY', zip: '40507', phone: '859-555-0142', jailId: null, dateOfBirth: '1988-02-17'},
  court: {level: 'District', county: 'Fayette', division: 'Criminal', clerkAddress: '150 N. Limestone, First Floor, Lexington, KY 40507', clerkPhone: '859-246-2228'},
  case: {number: '19-M-000001', violationOrArrestDate: '2018-04-10'},
  options: {includeProposedOrder: false, localOrderPracticeConfirmed: false},
  record: {groundsClaimed: ['ordinary_five_year'], disposition: 'convicted', dispositionDate: '2018-06-15', dispositionConfirmed: true, offenseClassification: 'misdemeanor', classificationConfirmed: true, ordinaryKrs431078Route: true, sentenceCompletionDate: '2020-09-11', probationApplicable: false, probationCompletionDate: null, expressVoidingStatute: null, voidedOffenseCategory: null, firstControlledSubstancesConviction: null},
  charges: [{count: '1', caseNumber: '19-M-000001', description: 'Criminal trespass, second degree', classification: 'misdemeanor', recordVerified: true}],
  victims: [{name: 'Taylor Morgan', address: '100 Main Street, Lexington, KY 40507'}],
  personsWithRelevantInformation: [],
  agencies: [{name: 'Lexington Police Department', address: '150 E. Main Street, Lexington, KY 40507', role: 'arresting agency'}, {name: 'Kentucky State Police', address: '1266 Louisville Road, Frankfort, KY 40601', role: 'state records'}],
  confirmations: {allCaseChargesAccounted: true, venueConfirmed: true, agencyListComplete: true, noRecentFelonyOrMisdemeanorConviction: true, noPendingFelonyOrMisdemeanorProceeding: true, notSexOrChildOffense: true, enhancementInapplicableOrExpired: true, singleIncident: true}
};

export function kyFixture(kind = 'ordinary_misdemeanor', includeOrder = false) {
  const f = clone(fixtureBase);
  f.options = {includeProposedOrder: includeOrder, localOrderPracticeConfirmed: includeOrder};
  if (kind === 'ordinary_violation') {
    f.record.offenseClassification = 'violation';
    f.charges[0].classification = 'violation';
    f.charges[0].description = 'Harassment';
  } else if (kind === 'ordinary_traffic') {
    f.record.offenseClassification = 'qualifying_traffic_infraction';
    f.charges[0].classification = 'qualifying_traffic_infraction';
    f.charges[0].description = 'Failure to illuminate headlamps';
  } else if (kind === 'void_218A275_8') {
    Object.assign(f.record, {groundsClaimed: ['controlled_substances_void_218A275_8'], disposition: 'voided', ordinaryKrs431078Route: false, sentenceCompletionDate: null, probationApplicable: false, probationCompletionDate: null, expressVoidingStatute: 'KRS 218A.275(8)', voidedOffenseCategory: 'controlled_substances', firstControlledSubstancesConviction: true});
    f.charges[0].description = 'Possession of a controlled substance, first conviction';
  } else if (kind === 'void_218A276_8') {
    Object.assign(f.record, {groundsClaimed: ['marijuana_synthetic_salvia_void_218A276_8'], disposition: 'voided', ordinaryKrs431078Route: false, sentenceCompletionDate: null, probationApplicable: false, probationCompletionDate: null, expressVoidingStatute: 'KRS 218A.276(8)', voidedOffenseCategory: 'marijuana', firstControlledSubstancesConviction: null});
    f.charges[0].description = 'Possession of marijuana';
  } else if (kind !== 'ordinary_misdemeanor') throw Error(`UNKNOWN_FIXTURE_KIND: ${kind}`);
  return f;
}

export function fixtures() {
  const canonical = kyFixture('ordinary_misdemeanor');
  const boundary = kyFixture('ordinary_traffic', true);
  boundary.participant = {...boundary.participant, fullName: "María-Alejandra O'Shaughnessy", street: '1188 Upper Coastal Crossing Road, Apt. 14B', zip: '40507', jailId: 'FAY-204981'};
  boundary.record.sentenceCompletionDate = '2019-09-10';
  boundary.record.probationApplicable = true;
  boundary.record.probationCompletionDate = '2021-09-11';
  boundary.charges = [
    ['Failure to illuminate headlamps', '1'], ['Failure to signal', '2'], ['Improper equipment', '3'],
    ['Failure to yield', '4'], ['Improper turn', '5'], ['Disregarding traffic-control device', '6'],
    ['Failure to maintain required lighting equipment', '7']
  ].map(([description, count]) => ({count, caseNumber: boundary.case.number, description, classification: 'qualifying_traffic_infraction', recordVerified: true}));
  boundary.victims = [];
  boundary.personsWithRelevantInformation = [{name: 'Morgan Lee', address: '200 Record Avenue, Lexington, KY 40507'}];
  return {
    canonical,
    boundary,
    'elections/ordinary-violation': kyFixture('ordinary_violation'),
    'elections/ordinary-traffic': kyFixture('ordinary_traffic'),
    'elections/void-218A275-8': kyFixture('void_218A275_8'),
    'elections/void-218A276-8': kyFixture('void_218A276_8')
  };
}

function heldSource(id, override = null) {
  const source = SOURCES[id];
  const bytes = override ?? fs.readFileSync(path.join(ROOT, source.path));
  assert.equal(bytes.length, source.byteLength, `SOURCE_LENGTH_DRIFT: ${id}`);
  assert.equal(sha256(bytes), source.sha256, `SOURCE_HASH_DRIFT: ${id}`);
  return bytes;
}

const blank = (documentId, field, effectiveLabel, reason, extra = {}) => ({documentId, field, fieldId: field, effectiveLabel, decision: 'refuse', reason, ...extra});

async function fillOfficial(id, review, sourceOverride = null) {
  const f = review.facts;
  const source = SOURCES[id];
  const sourceBytes = heldSource(id, sourceOverride);
  const pdf = await PDFDocument.load(sourceBytes, {updateMetadata: false});
  assert.equal(pdf.getPageCount(), source.pages, `SOURCE_PAGE_DRIFT: ${id}`);
  const form = pdf.getForm();
  const fields = form.getFields();
  assert.equal(fields.length, source.fields, `SOURCE_CENSUS_DRIFT: ${id}`);
  ensureDefaultAppearances(form);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  try { font.encodeText(JSON.stringify(f)); } catch { throw Error('UNSUPPORTED_TEXT_ENCODING: preserve original spelling; no partial packet emitted'); }
  const pageOf = widget => pdf.getPages().findIndex(page => page.ref === widget.P()) + 1;
  const census = fields.map(field => ({
    name: field.getName(), type: field.constructor.name,
    widgets: field.acroField.getWidgets().map(widget => ({page: pageOf(widget), rect: widget.getRectangle(), onState: widget.getOnValue()?.decodeText?.() ?? null}))
  }));
  const written = new Set();
  const writes = [];
  const blanks = [];
  const put = (fieldName, value, factId, {optional = false, multiline = false, attachmentFallback = null} = {}) => {
    const field = form.getField(fieldName);
    assert(field instanceof PDFTextField || field instanceof PDFDropdown, `BAD_TEXT_MAPPING: ${id}/${fieldName}`);
    if (value === null || value === undefined || value === '') {
      blanks.push(blank(id, fieldName, optional ? `${fieldName} (optional)` : fieldName,
        optional ? 'Optional participant-authored content; the platform does not invent it.' : 'The required fact is unavailable and must be completed before filing.',
        optional ? {} : {requiredBeforeFiling: true}));
      return;
    }
    assert.equal(typeof value, 'string', `FIELD_VALUE_NOT_TEXT: ${fieldName}`);
    if (multiline && field instanceof PDFTextField) field.enableMultiline();
    let actual = value;
    let fit;
    for (const pass of [0, 1]) {
      const fits = field.acroField.getWidgets().map(widget => fitTextToWidget({font, text: actual, rect: widget.getRectangle(), multiline, maxFontSize: 10, minFontSize: 7, evaluateDeclaredMinimumSize: true}));
      fit = fits.find(candidate => candidate.outcome === 'refused') ?? fits.reduce((a, b) => a.fontSize <= b.fontSize ? a : b);
      if (fit.outcome !== 'refused') break;
      if (pass === 0 && attachmentFallback) actual = attachmentFallback;
      else throw Error(`TEXT_DOES_NOT_FIT: ${id}/${fieldName}`);
    }
    if (field instanceof PDFDropdown) {
      if (!field.getOptions().includes(actual)) throw Error(`SOURCE_DROPDOWN_VALUE_REJECTED: ${id}/${fieldName}`);
      field.select(actual);
      field.setFontSize(fit.fontSize);
    } else applyFitToTextField(field, fit);
    for (const widget of field.acroField.getWidgets()) widget.dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${fit.fontSize} Tf 0 g`));
    written.add(fieldName);
    writes.push({documentId: id, field: fieldName, fieldId: fieldName, effectiveLabel: fieldName, factId, decision: 'write', value: actual, completeValue: value, outcome: fit.outcome, fontSize: fit.fontSize, widgets: field.acroField.getWidgets().map(widget => ({page: pageOf(widget), rect: widget.getRectangle()}))});
  };

  const divisionField = id === 'AOC-496.2' ? 'Court Division' : 'Text1';
  put('Case.CaseNum', f.case.number, 'case.number');
  put('Case.Division', `${f.court.level} Court`, 'court.level');
  put('Case.County', f.court.county, 'court.county');
  put(divisionField, f.court.division, 'court.division', {optional: true});
  put('Def.Name.Company', f.participant.fullName, 'participant.fullName');
  put('Def.Address.Line1', f.participant.street, 'participant.street');
  put('Def.Address.City', f.participant.city, 'participant.city');
  put('Def.Address.State', f.participant.state, 'participant.state');
  put('Def.Address.Zip', f.participant.zip, 'participant.zip');
  put('Def.PhoneNo', f.participant.phone, 'participant.phone');
  put('Def.Info.JailId', f.participant.jailId, 'participant.jailId', {optional: true});
  put('Def.VitalStats.DOB', displayDate(f.participant.dateOfBirth), 'participant.dateOfBirth');
  put('Charge.violation.date', displayDate(f.case.violationOrArrestDate), 'case.violationOrArrestDate');
  for (let index = 0; index < 6; index += 1) {
    const charge = f.charges[index];
    if (!charge) continue;
    put(`Charge${index + 1}`, index === 5 && f.charges.length > 6 ? 'Counts 6 onward: see attached schedule' : `Ct ${charge.count}: ${charge.description}`, `charges.${index}.description`, {attachmentFallback: `Count ${charge.count}: see attached schedule`});
  }
  if (id === 'AOC-496.2') {
    const victimText = f.victims.length ? f.victims.map(item => `${item.name}; ${item.address}`).join('\n') : 'None identified';
    const relevantText = f.personsWithRelevantInformation.length ? f.personsWithRelevantInformation.map(item => `${item.name}; ${item.address}`).join('\n') : 'None identified';
    const agencyText = f.agencies.map(item => `${item.name}; ${item.address}`).join('\n');
    put('Victims.List', victimText, 'victims', {multiline: true, attachmentFallback: 'See attached charge, victim, person, and agency schedule'});
    put('PWRI.List', relevantText, 'personsWithRelevantInformation', {multiline: true, attachmentFallback: 'See attached charge, victim, person, and agency schedule'});
    put('Agencies', agencyText, 'agencies', {multiline: true, attachmentFallback: 'See attached charge, victim, person, and agency schedule'});
    const selected = form.getField(review.election.field);
    assert(selected instanceof PDFCheckBox, 'ELECTION_FIELD_NOT_CHECKBOX');
    selected.check();
    written.add(review.election.field);
    writes.push({documentId: id, field: review.election.field, fieldId: review.election.field, effectiveLabel: `Section 6 ${review.election.ground} (selection)`, factId: 'record.section6Ground', decision: 'write', routeDetermined: true, isSelectionControl: true, value: true, widgets: selected.acroField.getWidgets().map(widget => ({page: pageOf(widget), rect: widget.getRectangle(), onState: widget.getOnValue()?.decodeText?.()}))});
    for (const [ground, fieldName] of Object.entries(ELECTION_FIELDS)) if (fieldName !== review.election.field) {
      const field = form.getField(fieldName);
      assert(field instanceof PDFCheckBox && !field.isChecked(), `UNSELECTED_ELECTION_NOT_BLANK: ${fieldName}`);
    }
  } else {
    put('Agencies', f.agencies.map(item => `${item.name}; ${item.address}`).join('\n'), 'agencies', {multiline: true, attachmentFallback: 'See attached charge, victim, person, and agency schedule'});
    for (const fieldName of COURT_SELECTION_FIELDS) {
      const field = form.getField(fieldName);
      assert(field instanceof PDFCheckBox && !field.isChecked(), `JUDICIAL_CONTROL_PREMARKED: ${fieldName}`);
    }
    assert(!writes.some(write => COURT_SELECTION_FIELDS.includes(write.field)), 'JUDICIAL_SELECTION_WRITTEN');
  }

  blanks.push(blank(id, 'Def.VitalStats.SSN', "Defendant's SSN", 'The platform does not hold this private identifier. Ask the clerk how to provide it securely and complete it before filing.', {requiredBeforeFiling: true}));
  for (const fieldName of ['Text11', 'Text12', ...(id === 'AOC-496.2' ? ['Text1'] : []), 'Print', 'Reset']) {
    blanks.push(blank(id, fieldName, `${fieldName} viewer/source presentation`, 'Viewer UI control; never a filing fact.'));
  }
  if (id === 'AOC-496.2') {
    blanks.push(blank(id, 'Participant signature/date and notary/clerk jurat', 'Participant signature, signature date, and notary or clerk jurat', 'Signature and date are completed by the participant before the notary or clerk; witness and clerk fields remain protected.', {refusalClass: 'signature_or_date_participant_completion'}));
  } else {
    for (const fieldName of COURT_SELECTION_FIELDS) blanks.push(blank(id, fieldName, `Court-owned judicial finding ${fieldName} (selection)`, 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned', isSelectionControl: true}));
    blanks.push(blank(id, 'Other', 'Court judicial findings: Other', 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned'}));
    blanks.push(blank(id, 'Judge/date and agency certification', 'Judge signature/date and agency certification', 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned'}));
  }

  const protectedFields = fields.filter(field => !written.has(field.getName())).map(field => field.getName());
  const sanitized = await sanitizeAndFlatten(pdf, {defaultFont: font, writtenFields: written, detachNestedControlFields: true, suppressSynthesizedAppearances: true, fitAppearancesToRect: true, suppressSynthesizedWidgetBorders: true, honorWidgetBorderStyle: true, preserveUnwrittenSelectionBackgrounds: true});
  preserveSourceMetadata(pdf, sanitized.clean);
  stampDeterministic(sanitized.clean);
  const bytes = Buffer.from(await sanitized.clean.save({useObjectStreams: false}));
  const scan = scanBytesForActiveContent(bytes);
  assert(scan.inspectable && scan.hits.length === 0, 'ACTIVE_CONTENT_REMAINS');
  const flattened = await PDFDocument.load(bytes, {updateMetadata: false});
  assert.equal(flattened.getForm().getFields().length, 0, 'INTERACTIVE_FIELDS_REMAIN');
  return {id, bytes, writes, blanks, census, protectedFields, sanitation: sanitized.report, activeContentScan: scan};
}

function instructionSections(review) {
  const f = review.facts;
  const electionCopy = review.election.ground === 'ordinary_five_year'
    ? `The court record shows a conviction disposition dated ${displayDate(f.record.dispositionDate)} and supports the ordinary five-year selection. The later completion date is ${displayDate(review.election.laterCompletionDate)} and the five-year date is ${displayDate(review.election.firstEligibleDate)}.`
    : review.election.ground === 'controlled_substances_void_218A275_8'
      ? `The disposition record dated ${displayDate(f.record.dispositionDate)} expressly states that this first controlled-substances conviction was voided under KRS 218A.275(8). The petition marks only that section-6 option.`
      : `The disposition record dated ${displayDate(f.record.dispositionDate)} expressly states that this marijuana, synthetic-drug, or salvia conviction was voided under KRS 218A.276(8). The petition marks only that section-6 option.`;
  return [
    ['Before filing', [
      `This packet is for case ${f.case.number} in ${f.court.county} County ${f.court.level} Court. Use one petition per criminal case. Confirm the caption and every charge against the current court record and certification before signing.`,
      electionCopy,
      'Attach the current KRS 431.079 expungement eligibility certification obtained through the Kentucky expungement-certification supporting action. File the petition within 30 days after receiving the certification. If the court has granted leave to proceed in forma pauperis, the controlling Kentucky record says the clerk may accept the petition without the fee or certification; obtain that order before relying on the exception.',
      "Defendant's SSN is intentionally blank. Ask the Circuit Court Clerk how to provide this private identifier securely and whether a public filing copy should be redacted. Never use a made-up number.",
      'If more than six charges, or the victims, relevant persons, or agency list exceeds the form space, file the attached schedule with the petition. Check every name and mailing address.'
    ]],
    ['Sign, file, and serve', [
      'Sign and date AOC-496.2 only in the presence of a notary or the Circuit Court Clerk. The witness completes the jurat. The software has not signed, notarized, filed, served, or certified anything.',
      `File with the Office of the Circuit Court Clerk in ${f.court.county} County, where the original charge was filed. ${f.court.clerkAddress}. Clerk telephone: ${f.court.clerkPhone}. Confirm copies, delivery method, and any local requirement directly with that clerk.`,
      'The controlling record states a $100 filing fee per criminal case and says the first $50 is non-refundable. The held AOC-496 proposed order separately says the clerk shall refund $50 when a petition is denied. Those sources leave the actual unsuccessful-petition refund treatment unresolved. This packet makes no refund promise; confirm current handling with the clerk or counsel before relying on any refund.',
      'The clerk serves the county attorney, each identified victim, and each person named as having relevant information. The participant does not serve them. The clerk sets any hearing no sooner than 30 days after filing. Leave every clerk service, hearing, and certification field blank.',
      f.options.includeProposedOrder
        ? 'AOC-496 is included only because local practice was confirmed to expect a tendered proposed order. Leave Check Box2 through Check Box8 and both Check Box9 choices blank. Leave all findings, grant/denial choices, Other findings, judge/date, and agency certification for the court and record custodians.'
        : 'AOC-496 is not included because no local proposed-order requirement was confirmed. Ask the Circuit Court Clerk whether the county expects that form before filing.'
    ]],
    ['Stop conditions and follow-up', [
      'Stop automated self-help and seek individualized legal help if the offenses came from separate incidents, the county attorney or a victim will object, enhancement status is uncertain, the certification lists a disputed conviction, immigration advice is needed, the conviction itself is being challenged, or venue is unclear.',
      'A filed petition or tendered proposed order does not mean the record is expunged. Attend the hearing if one is set. After a grant, the order directs named agencies to expunge and certify; keep the entered order and follow up with the clerk and agencies.',
      'Authority and source identity: KRS 431.078, KRS 431.079, KRS 453.190; AOC-496.2 and AOC-496, Rev. 7-16. Source bytes are held by exact SHA-256 in source-receipt.json. This build is a candidate awaiting central raster and independent review; it is not legal approval or a guaranteed result.'
    ]]
  ];
}

function scheduleSections(f) {
  return [['Charge, victim, relevant-person, and agency schedule', [
    `Attachment to AOC-496.2 for ${f.participant.fullName}, case ${f.case.number}, ${f.court.county} County.`,
    ...f.charges.map(charge => `Count ${charge.count}: ${charge.description}. Court-record classification: ${charge.classification}. Disposition: ${f.record.disposition} on ${displayDate(f.record.dispositionDate)}.`),
    'Victims:', ...(f.victims.length ? f.victims.map((item, index) => `${index + 1}. ${item.name}; ${item.address}`) : ['None identified in the supplied case facts.']),
    'Persons believed to have relevant information:', ...(f.personsWithRelevantInformation.length ? f.personsWithRelevantInformation.map((item, index) => `${index + 1}. ${item.name}; ${item.address}`) : ['None identified in the supplied case facts.']),
    'Agencies whose custody may contain records:', ...f.agencies.map((item, index) => `${index + 1}. ${item.name}; ${item.address}${item.role ? `; role: ${item.role}` : ''}.`)
  ]]];
}

async function appendComponent(pdf, title, sections, f, componentId, role) {
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const firstPage = pdf.getPageCount() + 1;
  let page;
  let y;
  const nextPage = () => {
    page = pdf.addPage([612, 792]);
    y = 742;
    page.drawText(title, {x: 42, y, size: 15, font: bold});
    y -= 22;
    const banner = f.isSyntheticFixture ? 'SYNTHETIC QA EXAMPLE - DO NOT FILE' : 'PARTICIPANT MATERIAL';
    page.drawText(banner, {x: 42, y, size: 9, font});
    y -= 25;
  };
  const line = (text, size = 9, indent = 0, gap = 4) => {
    const rows = wrapToWidth(font, text, size, 528 - indent);
    if (y - rows.length * 12 < 44) nextPage();
    for (const row of rows) { page.drawText(row, {x: 42 + indent, y, size, font}); y -= 12; }
    y -= gap;
  };
  nextPage();
  for (const [heading, paragraphs] of sections) {
    if (y < 90) nextPage();
    page.drawText(heading, {x: 42, y, size: 11, font: bold});
    y -= 17;
    for (const paragraph of paragraphs) line(paragraph);
    y -= 4;
  }
  return {documentId: componentId, role, firstPage, pageCount: pdf.getPageCount() - firstPage + 1, sourceSha256: null};
}

async function measureSourceComponents(packetBytes, componentPages) {
  const packet = await PDFDocument.load(packetBytes, {updateMetadata: false});
  let glyphs = 0;
  let appearances = 0;
  let outside = 0;
  const readings = [];
  for (const component of componentPages.filter(item => SOURCES[item.documentId])) {
    const extracted = await PDFDocument.create();
    const indices = Array.from({length: component.pageCount}, (_, index) => component.firstPage - 1 + index);
    const pages = await extracted.copyPages(packet, indices);
    pages.forEach(page => extracted.addPage(page));
    stampDeterministic(extracted);
    const bytes = Buffer.from(await extracted.save({useObjectStreams: false}));
    const sourceBytes = heldSource(component.documentId);
    const reading = await readOutputGlyphs(bytes, {sourceBytes});
    assert.equal(reading.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0, `${component.documentId}: glyph outside source widget`);
    assert.equal(reading.appearancesNotPlacedAtTheirOwnSourceWidget, 0, `${component.documentId}: appearance outside source widget`);
    glyphs += reading.addedGlyphsReadFromOutputBytes;
    appearances += reading.flattenedWidgetAppearancesReadFromOutputBytes;
    outside += reading.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes;
    readings.push({documentId: component.documentId, ...reading});
  }
  return {addedGlyphsReadFromOutputBytes: glyphs, flattenedWidgetAppearancesReadFromOutputBytes: appearances, nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outside, componentReadings: readings};
}

export async function renderKy(input, sourceOverrides = {}) {
  const review = validateKy(input);
  const f = review.facts;
  const petition = await fillOfficial('AOC-496.2', review, sourceOverrides['AOC-496.2']);
  const packet = await PDFDocument.load(petition.bytes, {updateMetadata: false});
  const components = [{documentId: 'AOC-496.2', componentId: SOURCES['AOC-496.2'].componentId, role: 'primary_filing', firstPage: 1, pageCount: 2, sourceSha256: SOURCES['AOC-496.2'].sha256}];
  const officialParts = [petition];
  if (f.options.includeProposedOrder) {
    const order = await fillOfficial('AOC-496', review, sourceOverrides['AOC-496']);
    const orderDoc = await PDFDocument.load(order.bytes, {updateMetadata: false});
    const copied = await packet.copyPages(orderDoc, orderDoc.getPageIndices());
    const firstPage = packet.getPageCount() + 1;
    copied.forEach(page => packet.addPage(page));
    components.push({documentId: 'AOC-496', componentId: SOURCES['AOC-496'].componentId, role: 'proposed_order', firstPage, pageCount: 2, sourceSha256: SOURCES['AOC-496'].sha256});
    officialParts.push(order);
  }
  components.push(await appendComponent(packet, 'Kentucky Expungement Certification Attachment Guide', [['Required certification attachment', instructionSections(review)[0][1].slice(0, 3)]], f, 'ky_misdemeanor_expungement-certification-attachment-3', 'certification_attachment'));
  components.push(await appendComponent(packet, 'Kentucky Filing Instructions', instructionSections(review), f, 'ky_misdemeanor_expungement-filing-instructions-4', 'filing_instructions'));
  const petitionUsedFallback = petition.writes.some(write => write.completeValue !== write.value);
  if (f.charges.length > 6 || petitionUsedFallback) {
    components.push(await appendComponent(packet, 'Attachment to Petition', scheduleSections(f), f, 'ky_misdemeanor_expungement-charge-agency-schedule', 'filing_attachment'));
  }
  stampDeterministic(packet);
  const bytes = Buffer.from(await packet.save({useObjectStreams: false}));
  const scan = scanBytesForActiveContent(bytes);
  assert(scan.inspectable && scan.hits.length === 0, 'ACTIVE_CONTENT_REMAINS_IN_PACKET');
  const proof = await measureSourceComponents(bytes, components);
  assert(proof.addedGlyphsReadFromOutputBytes > 0, 'NO_FILLED_WIDGET_GLYPHS_MEASURED');
  return {
    bytes, sha256: sha256(bytes), pageCount: packet.getPageCount(), review, components,
    writes: officialParts.flatMap(part => part.writes), blanks: officialParts.flatMap(part => part.blanks),
    sourceCensuses: Object.fromEntries(officialParts.map(part => [part.id, part.census])),
    sanitation: officialParts.map(part => ({documentId: part.id, report: part.sanitation})), activeContentScan: scan,
    proof, guide: instructionSections(review), schedule: scheduleSections(f)
  };
}

function fieldMapRows(censuses) {
  const writes = [];
  const refusals = [];
  const commonWrites = [
    ['Case.CaseNum', 'Case number', 'case.number'], ['Case.Division', 'Court name', 'court.level'], ['Case.County', 'County of court', 'court.county'],
    ['Def.Name.Company', 'Defendant name', 'participant.fullName'], ['Def.Address.Line1', 'Defendant address', 'participant.street'], ['Def.Address.City', 'Defendant city', 'participant.city'],
    ['Def.Address.State', 'Defendant state', 'participant.state'], ['Def.Address.Zip', 'Defendant ZIP', 'participant.zip'], ['Def.PhoneNo', 'Defendant phone', 'participant.phone'],
    ['Def.VitalStats.DOB', "Defendant's birthdate", 'participant.dateOfBirth'], ['Charge.violation.date', 'Violation or arrest date', 'case.violationOrArrestDate'],
    ...Array.from({length: 6}, (_, index) => [`Charge${index + 1}`, `Charge ${index + 1}`, `charges.${index}.description`])
  ];
  for (const id of ['AOC-496.2', 'AOC-496']) {
    for (const [field, effectiveLabel, factId] of commonWrites) writes.push({documentId: id, field, fieldId: field, effectiveLabel, factId, decision: 'write'});
    writes.push({documentId: id, field: id === 'AOC-496.2' ? 'Court Division' : 'Text1', fieldId: id === 'AOC-496.2' ? 'Court Division' : 'Text1', effectiveLabel: 'Court division', factId: 'court.division', decision: 'write'});
    writes.push({documentId: id, field: 'Def.Info.JailId', fieldId: 'Def.Info.JailId', effectiveLabel: 'Jail ID Number (optional)', factId: 'participant.jailId', decision: 'write'});
    writes.push({documentId: id, field: 'Agencies', fieldId: 'Agencies', effectiveLabel: 'Agency names and addresses', factId: 'agencies', decision: 'write'});
    refusals.push(blank(id, 'Def.VitalStats.SSN', "Defendant's SSN", 'The platform does not hold this private identifier. Ask the clerk how to provide it securely and complete it before filing.', {requiredBeforeFiling: true}));
    for (const field of ['Text12', 'Print', 'Reset', ...(id === 'AOC-496.2' ? ['Text11', 'Text1'] : [])]) refusals.push(blank(id, field, `${field} viewer/source presentation`, 'Viewer UI control; never a filing fact.'));
  }
  for (const [ground, field] of Object.entries(ELECTION_FIELDS)) writes.push({documentId: 'AOC-496.2', field, fieldId: field, effectiveLabel: `Section 6 ${ground} (selection)`, factId: 'record.section6Ground', decision: 'write', routeDetermined: true, isSelectionControl: true});
  for (const [field, label, factId] of [['Victims.List', 'Victim names and addresses', 'victims'], ['PWRI.List', 'Persons with relevant information names and addresses', 'personsWithRelevantInformation']]) writes.push({documentId: 'AOC-496.2', field, fieldId: field, effectiveLabel: label, factId, decision: 'write'});
  refusals.push(blank('AOC-496.2', 'Participant execution', 'Participant signature, signature date, and notary or clerk jurat', 'Signature and date are completed by the participant before the notary or clerk; witness and clerk fields remain protected.', {refusalClass: 'signature_or_date_participant_completion'}));
  for (const field of COURT_SELECTION_FIELDS) refusals.push(blank('AOC-496', field, `Court-owned judicial finding ${field} (selection)`, 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned', isSelectionControl: true}));
  refusals.push(blank('AOC-496', 'Other', 'Court judicial findings: Other', 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned'}));
  refusals.push(blank('AOC-496', 'Court execution', 'Judge signature/date and agency certification', 'Court, clerk, prosecutor, agency, or hearing field.', {refusalClass: 'court_prosecutor_clerk_or_agency_owned'}));
  return {writes, refusals, sourceCensuses: censuses};
}

export async function runKy({outDir = path.join(ROOT, OUT), inputFile = null} = {}) {
  if (inputFile && path.resolve(outDir) === path.join(ROOT, OUT)) throw Error('CUSTOM_INPUT_REQUIRES_ISOLATED_OUTPUT');
  const all = inputFile ? {supplied: JSON.parse(fs.readFileSync(inputFile, 'utf8'))} : fixtures();
  const packets = [];
  const actualWrites = [];
  let censuses = {};
  for (const [fixture, facts] of Object.entries(all)) {
    const rendered = await renderKy(facts);
    const relative = `fixtures/${fixture}.pdf`;
    const target = path.join(outDir, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, rendered.bytes);
    fs.writeFileSync(target.replace(/\.pdf$/, '.facts.json'), json(facts));
    const output = {file: path.relative(ROOT, target), sha256: rendered.sha256, byteLength: rendered.bytes.length, pageCount: rendered.pageCount};
    const report = {schemaVersion: 'ky-misdemeanor-author-build/v1', familyId: FAMILY, fixture, inputSha256: sha256(Buffer.from(json(facts))), output, election: rendered.review.election, components: rendered.components, writes: rendered.writes, blanks: rendered.blanks, sanitation: rendered.sanitation, activeContentScan: rendered.activeContentScan, proof: rendered.proof, independentReview: 'PENDING', centralRaster: 'PENDING'};
    const reportPath = path.join(outDir, `reports/${fixture}.json`);
    fs.mkdirSync(path.dirname(reportPath), {recursive: true});
    fs.writeFileSync(reportPath, json(report));
    packets.push({fixture, ...output, documents: rendered.components.map(component => ({documentId: component.documentId, componentId: component.componentId ?? component.documentId, role: component.role, firstPage: component.firstPage, pageCount: component.pageCount, sourceSha256: component.sourceSha256}))});
    actualWrites.push({fixture, ...output, valuesReportedByFinalizer: rendered.writes.length, ...rendered.proof, refusedFieldsWithInk: [], written: rendered.writes.map(write => ({field: write.field, documentId: write.documentId}))});
    censuses = {...censuses, ...rendered.sourceCensuses};
    if (fixture === 'canonical') fs.writeFileSync(path.join(outDir, 'participant-instructions.md'), rendered.guide.map(([heading, paragraphs]) => `## ${heading}\n\n${paragraphs.join('\n\n')}`).join('\n\n') + '\n');
  }
  const rows = fieldMapRows(censuses);
  fs.writeFileSync(path.join(outDir, 'production-field-map.json'), json({schemaVersion: 'rcap-official-form-field-map/v1-census-v1', familyId: FAMILY, routeKeys: [ROUTE], componentList: [
    {componentId: SOURCES['AOC-496.2'].componentId, role: 'primary_filing', requirement: 'required', outputStrategy: 'official_pdf_fill', documentId: 'AOC-496.2'},
    {componentId: SOURCES['AOC-496'].componentId, role: 'proposed_order', requirement: 'conditional', conditionDescription: 'Where local practice expects a proposed order to be tendered with the petition.', outputStrategy: 'official_pdf_fill', documentId: 'AOC-496'},
    {componentId: 'ky_misdemeanor_expungement-certification-attachment-3', role: 'certification_attachment', requirement: 'required', outputStrategy: 'process_guidance'},
    {componentId: 'ky_misdemeanor_expungement-filing-instructions-4', role: 'filing_instructions', requirement: 'required', outputStrategy: 'process_guidance'}
  ], conditionalAttachments: [{componentId: 'ky_misdemeanor_expungement-charge-agency-schedule', conditionDescription: 'Included when more than six charges or any complete victim, relevant-person, or agency value must continue beyond an official source cell.'}], selectionDispositionVocabulary: ['PARTICIPANT_ELECTION', 'COURT_OWNED'], electionMap: ELECTION_FIELDS, judicialControlsAlwaysBlank: COURT_SELECTION_FIELDS, ...rows, generationAllowed: false, runtimeSelectable: false}));
  fs.writeFileSync(path.join(outDir, 'field-census.census-v1.json'), json({schemaVersion: 'rcap-field-census/v1', familyId: FAMILY, documents: Object.entries(censuses).map(([formNumber, fields]) => ({formNumber, sourceSha256: SOURCES[formNumber].sha256, fields}))}));
  fs.writeFileSync(path.join(outDir, 'official-field-census.json'), json(censuses));
  fs.writeFileSync(path.join(outDir, 'reports/rendered-artifacts.json'), json({schemaVersion: 'rcap-rendered-artifacts/v1', familyId: FAMILY, componentIdentityMode: 'exact', artifacts: packets, packets, renderedFresh: true, derivedFromBytes: true, everyPageRastered: false, independentVerificationPending: true}));
  fs.writeFileSync(path.join(outDir, 'reports/actual-writes.json'), json({schemaVersion: 'rcap-actual-writes/v1', familyId: FAMILY, derivedFromArtifactBytes: true, artifacts: actualWrites, documents: []}));
  fs.writeFileSync(path.join(outDir, 'source-receipt.json'), json({schemaVersion: 'rcap-held-official-source/v1', familyId: FAMILY, allSourcesExact: true, sources: Object.entries(SOURCES).map(([documentId, source]) => ({documentId, sourceId: `official-form:${documentId}`, role: source.role, path: source.path, url: source.url, sha256: source.sha256, sha256Exact: true, byteLength: source.byteLength, pages: source.pages, fields: source.fields}))}));
  fs.writeFileSync(path.join(outDir, 'build-status.json'), json({familyId: FAMILY, status: 'BUILT_RASTER_PENDING', buildStatus: 'state_built', reviewStatus: 'qa_review_pending', independentVerificationStatus: 'PENDING', authorQaOnly: true, renderedArtifacts: packets.length, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false, rasterStatus: 'RASTER_PENDING'}));
  fs.writeFileSync(path.join(outDir, 'approval-request.json'), json({schemaVersion: 'rcap-approval-request/v1', familyId: FAMILY, status: 'AUTHOR_CANDIDATE_RASTER_PENDING', requestedReview: ['central raster of exact packet hashes', 'independent visual and substantive review'], sourceApprovalClaimed: false, legalApprovalClaimed: false, commercialAuthorityChanged: false, releaseBlocker: 'The unsuccessful-petition $50 refund treatment remains unresolved; do not promise a refund.'}));
  return packets;
}

export async function checkKy({outDir = path.join(ROOT, OUT)} = {}) {
  const required = ['production-field-map.json', 'field-census.census-v1.json', 'source-receipt.json', 'build-status.json', 'approval-request.json', 'participant-instructions.md', 'reports/rendered-artifacts.json', 'reports/actual-writes.json'];
  for (const file of required) assert(fs.existsSync(path.join(outDir, file)), `MISSING_BUILD_ARTIFACT: ${file}`);
  const rendered = JSON.parse(fs.readFileSync(path.join(outDir, 'reports/rendered-artifacts.json'), 'utf8'));
  const fieldMap = JSON.parse(fs.readFileSync(path.join(outDir, 'production-field-map.json'), 'utf8'));
  const status = JSON.parse(fs.readFileSync(path.join(outDir, 'build-status.json'), 'utf8'));
  const receipt = JSON.parse(fs.readFileSync(path.join(outDir, 'source-receipt.json'), 'utf8'));
  assert.equal(fieldMap.familyId, FAMILY);
  assert.deepEqual(fieldMap.electionMap, ELECTION_FIELDS);
  assert.deepEqual(fieldMap.judicialControlsAlwaysBlank, COURT_SELECTION_FIELDS);
  assert.equal(status.rasterStatus, 'RASTER_PENDING');
  assert.equal(status.independentVerificationStatus, 'PENDING');
  assert(!fs.existsSync(path.join(outDir, 'raster')), 'LOCAL_RASTER_NOT_ALLOWED');
  for (const source of receipt.sources) assert.equal(sha256(fs.readFileSync(path.join(ROOT, source.path))), source.sha256, `SOURCE_DRIFT: ${source.documentId}`);
  for (const packet of rendered.packets) {
    const bytes = fs.readFileSync(path.join(ROOT, packet.file));
    assert.equal(sha256(bytes), packet.sha256, `ARTIFACT_HASH_MISMATCH: ${packet.fixture}`);
    const pdf = await PDFDocument.load(bytes, {updateMetadata: false});
    assert.equal(pdf.getPageCount(), packet.pageCount, `ARTIFACT_PAGE_MISMATCH: ${packet.fixture}`);
    assert.equal(pdf.getForm().getFields().length, 0, `INTERACTIVE_FIELDS_REMAIN: ${packet.fixture}`);
    assert(packet.documents.some(document => document.documentId === 'AOC-496.2'));
    if (packet.fixture === 'boundary') assert(packet.documents.some(document => document.documentId === 'AOC-496'));
  }
  return {familyId: FAMILY, result: 'CHECK_PASS_RASTER_PENDING', packets: rendered.packets.length, sources: receipt.sources.length, rasterStatus: status.rasterStatus, independentVerificationStatus: status.independentVerificationStatus};
}
