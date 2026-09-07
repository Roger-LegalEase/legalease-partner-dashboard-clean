/**
 * Maryland CC-DC-CR-072A production packet, bounded to this exact form family.
 * Uses the existing shared fitting/sanitizing primitives. No shared host,
 * runtime selector, legal registry, receipt or admission state is changed.
 *
 * This is a packet constructor, not a replacement eligibility engine. The
 * caller supplies the selected disposition and every factual recital. Missing
 * answers are disclosed; signatures and execution dates are never synthesized.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { fitTextToWidget, applyFitToTextField, wrapToWidth } from '../../rcap-official-forms/rcap-text-fitting.mjs';
import { ensureDefaultAppearances, sanitizeAndFlatten, scanBytesForActiveContent } from '../../rcap-official-forms/rcap-active-content.mjs';
import { preserveSourceMetadata } from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import { stampDeterministic } from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FAMILY = 'md_10105_favorable-set';
export const ROUTE = 'obligation:track-pathway:MD:md_10105_favorable:adult-non-conviction-expungement-under-crim-proc-10-105';
export const OUT = 'data/rcap-all50/overlays/census-v1/md/md-10105-favorable-set--official-pdf-fill';
export const SOURCE = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072A.pdf';
export const SOURCE_SHA = '8dcb7b177cfb8900edc03158b064a57121170761e6f34e2456f08fdc68f82db2';
export const SOURCE_SIZE = 195791;
export const AS_OF = '2026-09-07';
export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const clone = value => structuredClone(value);
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_SIZE = 7;
const MAX_SIZE = 10;

export const BASIS_FIELDS = Object.freeze({
  acquittal: 'I was Acquitted/found not guilty of the charge',
  dismissal: 'The charge was otherwise dismissed',
  pbj_no_longer_crime: 'A Probation before Judgment was entered on the charge but the conduct on which the charge was based is no longer a crime',
  pbj: 'A Probation before Judgment was entered on the charge and the conduct on which the charge was based is still a crime. Either three years have passed or I have been discharged from probation, whichever is later',
  pbj_dui: 'A Probation before Judgment was entered on the violation and it has been fifteen years since being discharged from probation and more',
  nolle: 'Nolle Prosequi was entered',
  stet: 'A Stet was entered',
  ncr: 'I was found not criminally responsible',
  compromise: 'The case was compromised or dismissed',
  juvenile_transfer: 'The case was transferrred to Juvenile Court'
});
const EVENT_FIELDS = Object.freeze({ arrest: 'Arrested', summons: 'Served with a Summons', citation: 'Served with a Citation by an Officer' });
const TRANSFER_FIELD = 'The case began in one court and was transferred to another court other than Juvenile court';
const PROTECTED = [
  'Signature of Defendant', 'Date Defendant Signed', 'Signature of Attorney', 'Attorney Number', 'Date Attorney Signed',
  'Attorney Printed Name', 'Attorney Address', 'Attorney City, State, Zip', 'Attorney Telephone Number', 'Attorney E-mail', 'Attorney Fax'
];
const MAP = Object.freeze({
  'Case Number': 'case.number',
  'Tracking Number': 'case.trackingNumber',
  "Defendant's Name": 'participant.fullName',
  "Defendant's Date of Birth": 'participant.dob',
  'Date Arrested or Served': 'case.arrestOrServiceDate',
  'Law Enforcement Agency': 'case.agency',
  'City/County': 'case.incidentLocation',
  'List the Offense you were charged with': 'case.chargeDescription',
  'Date the charge was Disposed of': 'case.dispositionDate',
  'Defendant Printed Name': 'participant.fullName',
  'Defendant Address': 'participant.street',
  'Defendant City, State, Zip': 'participant.cityStateZip',
  'Defendant Telephone Number': 'participant.phone',
  'Defendant E-mail': 'participant.email',
  'Defendant Fax': 'participant.fax',
  "Court's City/County": 'court.sourceOption',
  "Court's Address": 'court.address'
});
const OPTIONAL = new Set(['case.trackingNumber', 'participant.email', 'participant.fax']);
const read = (obj, dotted) => dotted.split('.').reduce((o, k) => o?.[k], obj);
function iso(value, label) {
  if (typeof value !== 'string' || !DATE.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error(`INVALID_DATE: ${label}`);
  return value;
}
const printedDate = value => `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;
function anniversary(value, years) {
  // A leap-day statutory anniversary needs review rather than a guessed rule.
  if (value.slice(5) === '02-29') return `${Number(value.slice(0, 4)) + years}-03-01`;
  return `${Number(value.slice(0, 4)) + years}${value.slice(4)}`;
}
function problem(field, why, value = null, disposition = 'required_before_filing') {
  return { document: 'CC-DC-CR-072A', page: 1, field, why, value, disposition, requiredBeforeFiling: disposition === 'required_before_filing' };
}

/** Only source-A routes are accepted. An omitted recital is not a false one. */
export function validateMdFavorable(input) {
  const f = clone(input);
  assert.equal(f.routeKey, ROUTE, 'WRONG_ROUTE: do not render another Maryland instrument as 072A');
  iso(f.asOf, 'asOf');
  if (f.asOf >= '2026-10-01') throw new Error('LAW_VERSION_REVIEW: revalidate October 2026 changes before new-date rendering');
  if (!BASIS_FIELDS[f.case?.basis]) throw new Error('WRONG_INSTRUMENT: this constructor does not render a conviction, cannabis-conviction, pardon or early 072C petition');
  if (f.options?.generalWaiverRequested) throw new Error('CONDITIONAL_SOURCE_REQUIRED: use the separately reviewed early/release treatment; 072A alone cannot claim an attached release');
  if (f.participant?.signature || f.participant?.signatureDate || f.notary || f.judicialFindings || f.attorney?.signature) throw new Error('PROTECTED_EXECUTION_INPUT');
  for (const [key, label] of [['participant.dob', 'date of birth'], ['case.arrestOrServiceDate', 'arrest/service date'], ['case.dispositionDate', 'disposition date'], ['case.probationDischargeDate', 'probation discharge'], ['case.treatmentCompletionDate', 'treatment completion']]) {
    const v = read(f, key); if (v !== undefined && v !== null && v !== '') { iso(v, label); if (v > f.asOf) throw new Error(`FUTURE_CASE_FACT: ${label}`); }
  }
  if (f.case.arrestOrServiceDate && f.case.dispositionDate && f.case.arrestOrServiceDate > f.case.dispositionDate) throw new Error('INCONSISTENT_CASE_DATES');
  // CHAT4-MD-01: 10-105(c)(2) names PBJ grant and discharge as distinct
  // events. A supplied discharge cannot precede that same PBJ entry. Equal
  // dates remain valid; missing dates retain the existing disclosure path.
  if (['pbj', 'pbj_no_longer_crime', 'pbj_dui'].includes(f.case.basis) &&
      f.case.dispositionDate && f.case.probationDischargeDate &&
      f.case.probationDischargeDate < f.case.dispositionDate) {
    throw new Error('INCONSISTENT_PBJ_DATES: probation discharge precedes PBJ entry');
  }
  if (f.participant.dob && f.case.arrestOrServiceDate && f.participant.dob > f.case.arrestOrServiceDate) throw new Error('INCONSISTENT_DOB');
  if (f.court?.level && !['district', 'circuit'].includes(f.court.level)) throw new Error('COURT_LEVEL_NOT_SUPPORTED');
  if (f.case.event && !EVENT_FIELDS[f.case.event]) throw new Error('EVENT_NOT_SUPPORTED');
  if (f.court.sourceOption && f.court.level && !f.court.sourceOption.endsWith(f.court.level === 'district' ? '(DC)' : '(CC)')) throw new Error('COURT_OPTION_LEVEL_MISMATCH');
  if (!['none', 'adult', 'juvenile'].includes(f.court.transfer ?? 'none')) throw new Error('TRANSFER_NOT_SUPPORTED');
  if (f.case.basis === 'juvenile_transfer' && f.court.transfer !== 'juvenile') throw new Error('JUVENILE_TRANSFER_VENUE_REQUIRED');
  if (f.court.transfer === 'juvenile' && f.case.basis !== 'juvenile_transfer') throw new Error('JUVENILE_TRANSFER_BASIS_REQUIRED');
  if (!Array.isArray(f.case.chargesInIncident) || f.case.chargesInIncident.length === 0) throw new Error('ALL_INCIDENT_CHARGES_REQUIRED');
  // Do not collapse distinct dispositions/dates into a single checked recital.
  for (const ch of f.case.chargesInIncident) {
    if (ch.basis !== f.case.basis || ch.dispositionDate !== f.case.dispositionDate) throw new Error('MULTI_DISPOSITION_SOURCE_LAYOUT_REVIEW: do not merge unlike charge recitals');
    if (typeof ch.description !== 'string' || !ch.description.trim()) throw new Error('CHARGE_DESCRIPTION_REQUIRED');
    if (/^(unknown|tbd|n\/a|not supplied|insert|enter|see instructions|charge compromised under|test prose)\b/i.test(ch.description.trim())) throw new Error('CHARGE_PLACEHOLDER_NOT_FACT');
  }
  f.case.chargeDescription = f.case.chargesInIncident.map(ch => ch.description.trim()).join('; ');
  const missing = [];
  const conditions = [];
  const requireAnswer = (key, expected, label) => {
    const answer = read(f, key);
    if (answer === undefined || answer === null) missing.push(problem(label, 'The answer has not been supplied. Confirm it against the complete case record before selecting or signing this disposition.'));
    else if (answer !== expected) throw new Error(`CONDITION_NOT_MET: ${label}`);
    else conditions.push(key);
  };
  requireAnswer('confirmations.allIncidentChargesAccounted', true, 'All charges in the incident are accounted for');
  requireAnswer('confirmations.unitEligible', true, 'The unit is not precluded by Criminal Procedure 10-107');
  requireAnswer('confirmations.nonIncarcerableTrafficOnly', false, 'Not solely a non-incarcerable vehicle or traffic violation');
  requireAnswer('confirmations.pendingCriminalProceeding', false, 'No pending criminal proceeding');
  requireAnswer('confirmations.selectedStatementTrue', true, 'Every clause in the selected 072A statement is true');
  requireAnswer('court.filingVenueConfirmed', true, 'The correct original, transferee or appellate filing court is confirmed');
  if (f.court.transfer === 'adult') requireAnswer('confirmations.adultTransfereeIsFilingCourt', true, 'The receiving adult court is the filing court');
  if (f.case.basis === 'juvenile_transfer') {
    requireAnswer('confirmations.originalTransferCourtIsFilingCourt', true, 'File in the court that entered the juvenile-transfer order');
    requireAnswer('confirmations.criminalRecordsOnly', true, 'This petition addresses criminal-case records, not juvenile-court records');
  }
  if (['nolle', 'stet'].includes(f.case.basis)) {
    requireAnswer('case.treatmentRequired', f.case.treatmentRequired === true, 'Whether drug/alcohol treatment was required');
    if (f.case.treatmentRequired === true && !f.case.treatmentCompletionDate) missing.push(problem('Treatment completion date', 'The actual completion date is required; an expected completion date is not completion.'));
  }
  let earliest = null;
  if (f.case.dispositionDate) {
    if (['acquittal', 'dismissal', 'nolle', 'stet', 'ncr', 'compromise', 'pbj', 'pbj_no_longer_crime'].includes(f.case.basis)) earliest = anniversary(f.case.dispositionDate, 3);
    if (f.case.dispositionDate.endsWith('02-29')) missing.push(problem('Leap-day statutory anniversary', 'Confirm the legally applicable anniversary. The constructor does not infer a February 28 deadline.'));
  } else missing.push(problem('Disposition date', 'The actual disposition date is required to verify the printed timing statement.'));
  if (['pbj', 'pbj_no_longer_crime', 'pbj_dui'].includes(f.case.basis)) {
    if (!f.case.probationDischargeDate) missing.push(problem('Probation discharge date', 'Supply the actual probation-discharge date.'));
    else if (f.case.basis === 'pbj_dui') earliest = anniversary(f.case.probationDischargeDate, 15);
    else earliest = [earliest, f.case.probationDischargeDate].filter(Boolean).sort().at(-1);
    if (f.case.basis === 'pbj_no_longer_crime') requireAnswer('confirmations.conductNoLongerCrime', true, 'The conduct underlying the PBJ is no longer a crime');
    else {
      requireAnswer('confirmations.pbjExcludedOffensesAbsent', true, 'No excluded PBJ offense is alleged');
      requireAnswer('confirmations.pbjDisqualifyingConvictionsAbsent', true, 'No disqualifying intervening conviction in the applicable period');
    }
    if (f.case.basis === 'pbj_dui') {
      requireAnswer('confirmations.duiPbjIs21_902_a_or_b', true, 'PBJ is under Transportation 21-902(a) or (b), not (c), (d), (h) or (i)');
      requireAnswer('confirmations.noLaterDuiPbjInRelevantPeriod', true, 'No later 21-902 PBJ in the applicable period');
    }
  }
  if (f.case.treatmentRequired && f.case.treatmentCompletionDate) earliest = [earliest, f.case.treatmentCompletionDate].filter(Boolean).sort().at(-1);
  if (f.case.basis === 'ncr') requireAnswer('confirmations.ncrCoveredOffense', true, 'NCR finding concerns an offense identified in 10-105(a)(9) or (10)');
  if (f.case.basis === 'compromise') requireAnswer('confirmations.compromiseUnder3_207', true, 'Compromise or dismissal is under Criminal Law 3-207 / its predecessor');
  if (earliest && f.asOf < earliest) throw new Error(`TIMING_NOT_MET: ${earliest}; do not mark a false three-/fifteen-year statement or silently attach a release`);
  return { facts: f, missing, conditions, earliest, mayMarkDisposition: missing.length === 0 };
}

const base = {
  isSyntheticFixture: true, asOf: AS_OF, routeKey: ROUTE,
  participant: { fullName: 'Jordan Avery Reyes', dob: '1988-02-17', street: '42 Larkspur Street', cityStateZip: 'Rockville, MD 20850', phone: '301-555-0142', email: 'jordan.reyes@example.org' },
  court: { level: 'district', sourceOption: 'Montgomery County-Rockville (DC)', address: '191 East Jefferson Street, Rockville, MD 20850', filingVenueConfirmed: true, transfer: 'none', directorySource: 'https://www.courts.state.md.us/district/directories/montgomeryROCKVILLE' },
  case: { number: 'D-06-CR-20-000001', trackingNumber: 'MD-QA-000001', arrestOrServiceDate: '2020-01-10', event: 'arrest', agency: 'Montgomery County Police Department', incidentLocation: 'Montgomery County', incidentNarrative: 'Alleged entry onto private property without permission.', basis: 'dismissal', dispositionDate: '2020-04-02', treatmentRequired: false, chargesInIncident: [{ description: 'Trespass on private property', basis: 'dismissal', dispositionDate: '2020-04-02' }] },
  confirmations: { allIncidentChargesAccounted: true, unitEligible: true, nonIncarcerableTrafficOnly: false, pendingCriminalProceeding: false, selectedStatementTrue: true }
};
export function withBasis(basis, patch = {}) {
  const f = clone(base); Object.assign(f.case, patch); f.case.basis = basis;
  f.case.chargesInIncident = [{ description: patch.description ?? f.case.chargesInIncident[0].description, basis, dispositionDate: f.case.dispositionDate }];
  f.confirmations = { ...f.confirmations, ...(patch.confirmations ?? {}) }; delete f.case.confirmations; delete f.case.description;
  return f;
}
export function fixtures() {
  const commonPbj = { probationDischargeDate: '2020-09-07', confirmations: { pbjExcludedOffensesAbsent: true, pbjDisqualifyingConvictionsAbsent: true } };
  const boundary = withBasis('pbj', { arrestOrServiceDate: '2022-06-01', dispositionDate: '2023-09-07', probationDischargeDate: '2026-09-07', confirmations: commonPbj.confirmations });
  boundary.participant = { fullName: "María-Alejandra O'Shaughnessy", dob: '1991-11-30', street: '1188 Upper Coastal Crossing Road, Apt 14B', cityStateZip: 'Gaithersburg, MD 20878-2214', phone: '301-555-0199', email: 'maria.oshaughnessy@example.org' };
  boundary.case.number = 'D-06-CR-23-999999'; boundary.case.trackingNumber = null; boundary.case.event = 'summons';
  boundary.case.incidentNarrative = 'Alleged presence on private property after a request to leave, arising from one identified incident.';
  boundary.case.agency = null; // A real missing fact, visibly disclosed rather than invented.
  const adultTransfer = withBasis('dismissal'); adultTransfer.court = { ...adultTransfer.court, level: 'circuit', sourceOption: 'Montgomery County (CC)', address: '50 Maryland Avenue, Rockville, MD 20850', transfer: 'adult', directorySource: 'https://msa.maryland.gov/msa/mdmanual/36loc/mo/html/moj.html' }; adultTransfer.confirmations.adultTransfereeIsFilingCourt = true; adultTransfer.case.number = 'C-15-CR-20-000001';
  const juvenile = withBasis('juvenile_transfer', { arrestOrServiceDate: '2004-01-10', dispositionDate: '2004-04-02', confirmations: { originalTransferCourtIsFilingCourt: true, criminalRecordsOnly: true } }); juvenile.court.transfer = 'juvenile'; juvenile.case.number = 'D-06-CR-04-000001';
  const citation = withBasis('acquittal'); citation.case.event = 'citation';
  return {
    canonical: clone(base), boundary,
    'selectable/acquittal': withBasis('acquittal'),
    'selectable/nolle': withBasis('nolle'),
    'selectable/nolle-treatment': withBasis('nolle', { treatmentRequired: true, treatmentCompletionDate: AS_OF }),
    'selectable/stet': withBasis('stet'),
    'selectable/stet-treatment': withBasis('stet', { treatmentRequired: true, treatmentCompletionDate: AS_OF }),
    'selectable/pbj': withBasis('pbj', commonPbj),
    'selectable/pbj-no-longer-crime': withBasis('pbj_no_longer_crime', { ...commonPbj, description: 'Possession of 10 grams of cannabis (former criminal offense)', incidentNarrative: 'Alleged possession of 10 grams of cannabis during one incident.', confirmations: { conductNoLongerCrime: true } }),
    'selectable/pbj-dui': withBasis('pbj_dui', { arrestOrServiceDate: '2008-02-01', dispositionDate: '2009-03-01', probationDischargeDate: '2011-09-07', number: 'D-06-CR-09-000001', description: 'Driving under the influence of alcohol, Transportation 21-902(a)', incidentNarrative: 'Alleged driving under the influence of alcohol during one incident.', confirmations: { ...commonPbj.confirmations, duiPbjIs21_902_a_or_b: true, noLaterDuiPbjInRelevantPeriod: true } }),
    'selectable/ncr': withBasis('ncr', { confirmations: { ncrCoveredOffense: true } }),
    'selectable/compromise': withBasis('compromise', { description: 'Second-degree assault, Criminal Law 3-203', incidentNarrative: 'Alleged unlawful offensive physical contact during a single dispute.', confirmations: { compromiseUnder3_207: true } }),
    'selectable/juvenile-transfer': juvenile,
    'selectable/adult-transfer-circuit': adultTransfer,
    'selectable/citation': citation
  };
}

/** Complete only the actual 072A widgets; no drawn replacement petition. */
export async function renderMdFavorable(input, sourceBytes = fs.readFileSync(path.join(ROOT, SOURCE))) {
  assert.equal(sourceBytes.length, SOURCE_SIZE, 'SOURCE_LENGTH_DRIFT');
  assert.equal(sha256(sourceBytes), SOURCE_SHA, 'SOURCE_HASH_DRIFT');
  const checked = validateMdFavorable(input), f = checked.facts;
  const pdf = await PDFDocument.load(sourceBytes, { updateMetadata: false });
  assert.equal(pdf.getPageCount(), 1, 'SOURCE_PAGE_DRIFT');
  const form = pdf.getForm(); ensureDefaultAppearances(form);
  // This source's first incident widget begins at the final printed word.
  // Add two points of separation without moving the source text or its rule.
  const incidentWidget = form.getTextField('List the Incident').acroField.getWidgets()[0];
  const originalIncidentRect = incidentWidget.getRectangle();
  incidentWidget.setRectangle({ ...originalIncidentRect, x: originalIncidentRect.x + 2, width: originalIncidentRect.width - 2 });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  // WinAnsi accents and punctuation are preserved, not transliterated. A
  // character absent from the common font requires handoff before any file
  // is written; a partial filing with a silently dropped character is unsafe.
  try { font.encodeText(JSON.stringify(input)); }
  catch { throw new Error('UNSUPPORTED_TEXT_ENCODING: preserve the original input and obtain supported-font/manual assistance; no partial packet was generated'); }
  const census = form.getFields().map(field => ({ name: field.getName(), type: field.constructor.name, widgets: field.acroField.getWidgets().map(w => ({ page: 1, rect: w.getRectangle() })) }));
  assert.equal(census.length, 47, 'SOURCE_FIELD_CENSUS_DRIFT');
  const writes = [], blanks = [...checked.missing], written = new Set();
  const required = (name, key, why, value) => blanks.push(problem(name, why, value ?? null, OPTIONAL.has(key) ? 'optional_blank' : 'required_before_filing'));
  const writeText = (name, key, raw) => {
    if (raw === undefined || raw === null || raw === '') { required(name, key, 'This fact was not supplied. Complete this printed blank from the case record or your own accurate contact information.'); return; }
    assert.equal(typeof raw, 'string', `WRONG_VALUE_TYPE: ${key}`);
    const handle = form.getField(name), widgets = handle.acroField.getWidgets();
    if (!(handle instanceof PDFTextField || handle instanceof PDFDropdown)) throw new Error(`NON_TEXT_MAPPING: ${name}`);
    const value = ['participant.dob', 'case.arrestOrServiceDate', 'case.dispositionDate'].includes(key) ? printedDate(raw) : raw;
    const fits = widgets.map(w => fitTextToWidget({ font, text: value, rect: w.getRectangle(), maxFontSize: MAX_SIZE, minFontSize: MIN_SIZE, evaluateDeclaredMinimumSize: true }));
    const refusal = fits.find(x => x.outcome === 'refused');
    if (refusal) { required(name, key, `The complete held value does not fit the printed blank at the ${MIN_SIZE}-point minimum. It was not clipped or shortened.`, value); return; }
    const fit = fits.reduce((a, b) => a.fontSize <= b.fontSize ? a : b);
    if (handle instanceof PDFDropdown) { if (!handle.getOptions().includes(value)) throw new Error(`COURT_OPTION_NOT_IN_SOURCE: ${value}`); handle.select(value); handle.setFontSize(fit.fontSize); }
    else applyFitToTextField(handle, fit);
    // The source declares /DA on BOTH the field and widget. Use the fitted
    // size on the actual appearance too, or a long value reverts to 11pt.
    for (const w of widgets) w.dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${fit.fontSize} Tf 0 g`));
    written.add(name); writes.push({ field: name, page: 1, factId: key, value, fontSize: fit.fontSize, widgets: widgets.map(w => ({ rect: w.getRectangle() })), kind: 'held_text' });
  };
  for (const [name, key] of Object.entries(MAP)) writeText(name, key, read(f, key));
  // The incident has unequal ruled lines. Lay out the held narrative against
  // each actual width instead of treating the first 174pt line as 520pt.
  const narrative = f.case.incidentNarrative;
  const names = ['List the Incident', 'Incident Continued'];
  if (!narrative) required(names.join(' / '), 'case.incidentNarrative', 'Describe the incident accurately in your own words; no narrative was supplied.');
  else {
    const handles = names.map(n => form.getTextField(n));
    let fitted = null;
    for (let size = MAX_SIZE; size >= MIN_SIZE && !fitted; size -= 0.5) {
      const words = narrative.split(/\s+/), lines = [];
      for (const handle of handles) {
        const width = handle.acroField.getWidgets()[0].getRectangle().width - 4; let line = '';
        while (words.length && font.widthOfTextAtSize([line, words[0]].filter(Boolean).join(' '), size) <= width) line = [line, words.shift()].filter(Boolean).join(' ');
        lines.push(line);
      }
      if (!words.length) fitted = { size, lines };
    }
    if (!fitted) required(names.join(' / '), 'case.incidentNarrative', 'The complete held narrative does not fit both printed lines. No words were discarded. Supply an accurate concise incident statement or obtain help with a continuation.', narrative);
    else fitted.lines.forEach((line, i) => { if (line) writeText(names[i], 'case.incidentNarrative', line); });
  }
  const mark = (name, basis) => { const h = form.getField(name); assert(h instanceof PDFCheckBox); h.check(); written.add(name); writes.push({ field: name, page: 1, kind: 'explicit_selection', basis, value: true, widgets: h.acroField.getWidgets().map(w => ({ rect: w.getRectangle() })) }); };
  if (f.court.level) mark(f.court.level === 'district' ? 'District Court' : 'Circuit Court', 'Explicit court.level agrees with the exact official court option.');
  else blanks.push(problem('Circuit Court / District Court', 'Confirm the court level. Neither was guessed.'));
  if (f.case.event) mark(EVENT_FIELDS[f.case.event], 'Explicit arrest/summons/citation event from the held case record.');
  else blanks.push(problem('Arrested / summons / citation', 'Confirm which event actually occurred.'));
  if (checked.mayMarkDisposition) mark(BASIS_FIELDS[f.case.basis], `Explicit ${f.case.basis} selection; its required factual recitals are supplied and its printed clock is met.`);
  else blanks.push(problem('Disposition checkbox', 'Left unmarked because one or more required factual recitals are unknown. Do not check or sign until all are resolved.'));
  if (f.court.transfer === 'adult' && f.confirmations.adultTransfereeIsFilingCourt === true) mark(TRANSFER_FIELD, 'Explicit adult transfer and receiving filing court.');
  for (const name of PROTECTED) assert(!written.has(name), `PROTECTED_FIELD_WRITTEN: ${name}`);
  blanks.push(problem('Signature of Defendant / Date Defendant Signed', 'Read every statement and sign and date the petition yourself only when accurate. No notarization is required by this form.', null, 'signature_or_date_participant_completion'));
  for (const field of PROTECTED.filter(n => n.startsWith('Attorney') || n.includes('Attorney'))) blanks.push(problem(field, 'The self-represented packet leaves the attorney block blank; no attorney, signature or execution act was invented.', null, 'not_applicable_pro_se'));
  const sanitized = await sanitizeAndFlatten(pdf, { defaultFont: font, writtenFields: written, detachNestedControlFields: true, suppressSynthesizedAppearances: true, fitAppearancesToRect: true, suppressSynthesizedWidgetBorders: true, honorWidgetBorderStyle: true, preserveUnwrittenSelectionBackgrounds: true });
  preserveSourceMetadata(pdf, sanitized.clean); stampDeterministic(sanitized.clean);
  const official = Buffer.from(await sanitized.clean.save({ useObjectStreams: false }));
  const cleanScan = scanBytesForActiveContent(official); assert(cleanScan.inspectable && cleanScan.hits.length === 0, 'ACTIVE_CONTENT_REMAINS');
  const guide = instructionSections(f, blanks, checked.earliest);
  const packet = await PDFDocument.load(official, { updateMetadata: false });
  await appendInstructions(packet, guide, input.isSyntheticFixture === true);
  stampDeterministic(packet);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false }));
  const reread = await PDFDocument.load(bytes, { updateMetadata: false });
  assert.equal(reread.getForm().getFields().length, 0, 'INTERACTIVE_FIELDS_REMAIN');
  const scan = scanBytesForActiveContent(bytes); assert(scan.inspectable && scan.hits.length === 0, 'ACTIVE_CONTENT_REMAINS');
  return { bytes, officialBytes: official, facts: f, writes, blanks, census, guide, sanitation: sanitized.report, activeContentScan: scan, pageCount: reread.getPageCount(), sourceSha256: SOURCE_SHA, sha256: sha256(bytes), conditions: checked.conditions, earliest: checked.earliest, selectedComponents: ['CC-DC-CR-072A'] };
}

function instructionSections(f, blanks, earliest) {
  const missing = blanks.filter(b => b.requiredBeforeFiling);
  return [
    ['Maryland expungement: before you file', [
      'The first page is the official CC-DC-CR-072A petition. These following pages are instructions for you, not additional pleadings or a court order.',
      `Selected disposition: ${f.case.basis.replaceAll('_', ' ')}. Case: ${f.case.number ?? 'not supplied'}. Prepared using the facts supplied as of ${f.asOf}.`,
      missing.length ? `COMPLETE BEFORE FILING: ${missing.length} item(s) below remain unresolved. The petition is not ready to sign and file until those items are resolved.` : 'The supplied text and selections are populated. Verify them against your complete court record, then personally sign and date the petition. The software has not signed it for you.',
      `Filing court: ${f.court.sourceOption ?? 'not supplied'}. ${f.court.address ?? 'Obtain the correct clerk mailing or filing address.'}`,
      'Confirm the venue against the case docket. Normally use the court in which the proceeding began. For an adult-court transfer use the receiving court. For a juvenile transfer use the original court that entered the transfer, and request only the criminal-case records. An appealed case may require filing in the appellate court; obtain help rather than assume the original court is still correct.',
      'Use free Maryland Judiciary Case Search and obtain any missing docket/disposition records from the clerk. Account for every charge in the incident and confirm the unit rule in Criminal Procedure 10-107. Do not select only an attractive charge while hiding another charge in the unit.',
      ...(earliest ? [`The ordinary printed waiting-period statement used in this packet is met no earlier than ${printedDate(earliest)}. A future treatment or probation completion is not a completed event.`] : []),
      'Do not use this petition for an ordinary conviction, a pardon application, or a cannabis-conviction petition. Do not use it as a substitute for CC-DC-CR-072C on the early automatic-expungement route. When all charges qualify under 10-105.1 and were disposed on/after October 1, 2021, check the automatic-expungement status before filing an unnecessary petition.',
      'For an acquittal, dismissal or nolle before the ordinary three-year period, a general waiver and release may be required. It gives up tort claims arising from the charge. No release is attached or elected in this ordinary packet. Do not falsely check the statement that a release is attached. Get the correct early/release packet and consider legal advice before giving up claims.'
    ]],
    ['Finish, file, and follow the result', [
      ...missing.map(b => `${b.field}: ${b.why}${b.value ? ` Complete held value: ${b.value}` : ''}`),
      'Review the date of birth, case number, agency, incident, every charge and every checked statement. If any known value was not fitted, the complete value is disclosed above; it was not shortened on the court form. Correct the source fact or obtain help with a permitted continuation, then re-render or complete the blank legibly.',
      'Sign and date the Defendant block yourself after checking every statement. Leave the attorney block blank when self-represented. Do not sign for a witness, notary, clerk or judge. This 072A form uses an affirmation under penalties of perjury and does not require notarization.',
      'FILING FEE: $0 for this 072A nonconviction petition. Do not pay the $30 guilty-disposition fee and do not add a prepaid-costs waiver to a free filing. A waiver of tort claims is not a fee waiver.',
      'Make and retain a complete copy before filing. File the signed official petition with the proper clerk in person, by mail, or through MDEC when using electronic filing. Confirm any required copy count and the current mailing address with that clerk; do not email the petition to a general website-contact address. Once registered to e-file, follow the continuing e-filing requirement.',
      "SERVICE: the court serves the State's Attorney. You do not need to certify that you served anyone. This packet contains no participant certificate of service and no proposed order.",
      "AFTER FILING: the State's Attorney ordinarily has 30 days after service to object. A timely objection requires a hearing. If an objection, hearing, disputed unit, excluded PBJ offense or appeal arises, keep all papers and promptly seek a lawyer or legal-aid help; do not ignore notices or response deadlines.",
      'AFTER AN ORDER: unless stayed on appeal, record custodians must report compliance to the court and you within 60 days after entry. Keep the order and Certificates of Compliance. A filed petition or a signed order alone does not prove all record holders complied. Follow up with the clerk if certificates or corrections remain missing.',
      'Keep your original case/disposition records before expungement, especially for immigration or other proceedings outside Maryland law. Maryland expungement does not guarantee that every federal, immigration, licensing or private-background-check question can be answered the same way.',
      'Court help: Maryland Court Help Center, 410-260-1392. Bring your docket, dispositions, this packet and any objection or notice. This packet supplies forms and instructions, not representation or a promise of an expungement.'
    ]],
    ['Official sources and packet contents', [
      'CC-DC-CR-072A, revision 09/2025: the held official form is the one-page filing in this packet. The other pages are participant instructions. No new petition template was drawn.',
      'Maryland Criminal Procedure 10-105 (instrument, waiting periods, venue, service, objections and compliance), 10-105.1 (automatic expungement), 10-107 (unit rule), and Maryland Rule 4-510 (custodian compliance).',
      'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105',
      'https://www.mdcourts.gov/legalhelp/expungement',
      'https://www.mdcourts.gov/district/directories/courtmap',
      'https://www.mdcourts.gov/guideandfile',
      'https://www.mdcourts.gov/helpcenter/inperson/dc',
      'Source and legal-page checks: September 7, 2026. A later law or form edition needs revalidation. This renderer does not enable live delivery, payment, or a commercial route.'
    ]]
  ];
}

async function appendInstructions(doc, sections, synthetic) {
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = null, y = 0, number = 0;
  const newPage = title => {
    page = doc.addPage([612, 792]); number += 1; y = 728;
    page.drawText(title, { x: 48, y, font: bold, size: 16 }); y -= 27;
    page.drawText(synthetic ? 'SYNTHETIC QA EXAMPLE - DO NOT FILE' : 'PARTICIPANT INSTRUCTIONS - KEEP, DO NOT FILE', { x: 48, y, font: bold, size: 9 }); y -= 25;
    page.drawText(`CC-DC-CR-072A companion | instruction page ${number}`, { x: 48, y: 28, font, size: 8 });
  };
  for (const [title, paragraphs] of sections) {
    newPage(title);
    for (const paragraph of paragraphs) {
      const lines = wrapToWidth(font, paragraph, 10, 516);
      if (y - lines.length * 14 < 55) newPage(`${title} (continued)`);
      for (const line of lines) {
        if (y < 55) newPage(`${title} (continued)`);
        assert(font.widthOfTextAtSize(line, 10) <= 516.1, 'INSTRUCTION_LINE_OVERFLOW');
        page.drawText(line, { x: 48, y, font, size: 10 }); y -= 14;
      }
      y -= 10;
    }
  }
}

export async function runMdFavorable({ outDir = path.join(ROOT, OUT), inputFile = null } = {}) {
  if (inputFile && path.resolve(outDir) === path.join(ROOT, OUT)) throw new Error('CUSTOM_INPUT_REQUIRES_ISOLATED_OUTPUT: supply --out for participant facts');
  const runs = inputFile ? { supplied: JSON.parse(fs.readFileSync(inputFile, 'utf8')) } : fixtures();
  const records = [], maps = {};
  for (const [fixture, f] of Object.entries(runs)) {
    const rendered = await renderMdFavorable(f);
    const file = `fixtures/${fixture}.pdf`, target = path.join(outDir, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, rendered.bytes);
    const inputPath = `fixtures/${fixture}.facts.json`; fs.writeFileSync(path.join(outDir, inputPath), json(f));
    const reportPath = `reports/${fixture}.json`; fs.mkdirSync(path.dirname(path.join(outDir, reportPath)), { recursive: true });
    const report = { schemaVersion: 'chat5-md072a-author-build/v1', familyId: FAMILY, fixture, sourceSha256: SOURCE_SHA, sourcePath: SOURCE, inputPath, inputSha256: sha256(Buffer.from(json(f))), output: { file: `${OUT}/${file}`, sha256: rendered.sha256, byteLength: rendered.bytes.length, pageCount: rendered.pageCount }, selectedComponents: rendered.selectedComponents, writes: rendered.writes, blanks: rendered.blanks, confirmedConditions: rendered.conditions, earliestOrdinaryFilingDate: rendered.earliest, activeContentScan: rendered.activeContentScan, sanitation: rendered.sanitation, independentReview: 'PENDING', centralRaster: 'PENDING' };
    fs.writeFileSync(path.join(outDir, reportPath), json(report));
    records.push({ fixture, documentId: 'CC-DC-CR-072A', role: 'assembled_official_petition_packet', file: `${OUT}/${file}`, sha256: rendered.sha256, byteLength: rendered.bytes.length, pageCount: rendered.pageCount, components: rendered.selectedComponents, pageManifest: Array.from({ length: rendered.pageCount }, (_, i) => i === 0 ? { packetPage: 1, documentId: 'CC-DC-CR-072A', role: 'primary_filing', sourcePage: 1, sourceSha256: SOURCE_SHA } : { packetPage: i + 1, documentId: 'participant-instructions', role: 'participant_instructions' }) });
    maps[fixture] = { writes: rendered.writes, blanks: rendered.blanks };
    if (fixture === 'canonical') {
      fs.writeFileSync(path.join(outDir, 'official-field-census.json'), json(rendered.census));
      fs.writeFileSync(path.join(outDir, 'participant-instructions.md'), rendered.guide.map(([t, ps]) => `## ${t}\n\n${ps.join('\n\n')}`).join('\n\n') + '\n');
    }
  }
  fs.mkdirSync(path.join(outDir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'reports/rendered-artifacts.json'), json({ schemaVersion: 'rcap-rendered-artifacts/v1', familyId: FAMILY, renderedFresh: true, derivedFromBytes: true, componentSet: ['CC-DC-CR-072A'], pdfs: records, artifacts: records, everyPageRastered: false, independentVerificationPending: true, byteDerivedHashes: true }));
  fs.writeFileSync(path.join(outDir, 'production-field-map.json'), json({ schemaVersion: 'rcap-official-form-field-map/v1-census-v1', familyId: FAMILY, jurisdiction: 'MD', implementationStrategy: 'official_pdf_fill', renderStrategy: 'official_pdf_fill', routeKeys: [ROUTE], componentSet: ['CC-DC-CR-072A'], maps: [{ documentId: 'CC-DC-CR-072A', documentRole: 'primary_filing', structuralClass: 'acroform_official_pdf', explicitMappings: MAP, protectedFields: PROTECTED, canonicalWrites: maps.canonical?.writes ?? [], boundaryWrites: maps.boundary?.writes ?? [], canonicalRefusals: maps.canonical?.blanks ?? [], boundaryRefusals: maps.boundary?.blanks ?? [] }], fixtures: maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0 }));
  fs.writeFileSync(path.join(outDir, 'build-status.json'), json({ schemaVersion: 'rcap-family-build-status/v1', familyId: FAMILY, buildStatus: 'state_built', reviewStatus: 'qa_review_pending', builtBy: 'scripts/build-census-v1-md_10105_favorable-set.mjs', renderedArtifacts: records.length, rasterState: 'BUILT_RASTER_PENDING', independentVerificationStatus: 'PENDING', selfVerified: false, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0, productionTouched: false, scopeLimitations: ['Ordinary 072A with a single disposition/date per incident. Unlike charge dispositions are not collapsed.', 'Early 072C, waiver/release, conviction, cannabis-conviction and pardon instruments are separate families; no source-A substitution.', 'Current track registry also lists conviction-related subroutes that must not be mislabeled as 072A. Central mapping correction remains required.'] }));
  fs.writeFileSync(path.join(outDir, 'source-receipt.json'), json({ schemaVersion: 'chat5-held-official-source/v1', familyId: FAMILY, officialFormId: 'CC-DC-CR-072A', edition: '09/2025', sourcePath: SOURCE, sha256: SOURCE_SHA, byteLength: SOURCE_SIZE, sourcePageCount: 1, acquisition: { channel: 'connected Google Drive retained official source', fileId: '1uAzzy61RUarShj92Z1K482mrUPwT9xE5', retrievedAndHashedOn: AS_OF }, issuerUrl: 'https://www.mdcourts.gov/sites/default/files/court-forms/courtforms/joint/ccdccr072A.pdf/ccdccr072A.pdf', issuerPageAndEditionVisuallyCheckedOn: AS_OF, liveIssuerBinaryDigestIndependentlyMeasured: false, requiredComponents: ['CC-DC-CR-072A'], fee: { dollars: 0, feeWaiverSelected: false }, noParticipantServiceCertificate: true, noProposedOrder: true, independentReview: 'PENDING' }));
  return records;
}
