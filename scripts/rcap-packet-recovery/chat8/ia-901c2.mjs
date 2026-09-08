/** Iowa Rule 2.86 Form 1 only. No shared builder, queue or runtime writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, StandardFonts, rgb, drawLine } from 'pdf-lib';
import { fitTextToWidget, applyFitToTextField, wrapToWidth } from '../../rcap-official-forms/rcap-text-fitting.mjs';
import { sanitizeAndFlatten, scanBytesForActiveContent } from '../../rcap-official-forms/rcap-active-content.mjs';
import { preserveSourceMetadata, carryDates } from '../../rcap-official-forms/rcap-official-form-finalize.mjs';

export const FAMILY = 'ia-901c2-set';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const OUTPUT = 'data/rcap-all50/overlays/census-v1/ia/ia-901c2-set--official-pdf-fill';
export const SOURCE = 'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-1-2024-08.pdf';
export const SOURCE_SHA256 = 'c7a6c42baa70cd327ee1567081791682d6a89ea121012fdd5de0b86876bfd0e5';
export const INPUT_COMMIT = '778d1254a1f76f949a6e7de4f940f48c5261d129';
const STAMP = new Date('2026-09-07T00:00:00Z');
const PREFIX = '2.86-1.';
export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const pretty = v => JSON.stringify(v, null, 2) + '\n';
const own = (v, k) => Object.hasOwn(v, k);
const fail = s => { throw new Error(s); };

export const sourceReceipt = {
  familyId: FAMILY, officialFormId: 'Rule 2.86 Form 1', edition: 'August 2024', pages: 3,
  sourcePath: SOURCE, sha256: SOURCE_SHA256, byteCount: 1449490,
  originalAcquisition: '2026-09-02', custodyRecoveredOn: '2026-09-07',
  retainedDriveId: '1Qoz3UfWxzVkA3dQnf2OKTKPGppMKunRO',
  issuerUrl: 'https://www.iowacourts.gov/collections/867/files/1962/embedDocument/',
  identity: 'Held fillable Form 1; three source pages inspected. Current issuer August-2024 instrument has the same title, requirements and embedded service certification. No claim that issuer-download and held-fillable bytes are identical.',
  embeddedService: { page: 3, title: 'Certification of Service by Mailing or Delivery', separateSourceNeeded: false },
  controls: { pushbuttons: 5, terminalFields: 56, widgets: 59 },
  sourceApprovalGrantedByThisBuild: false,
};
export const authorities = {
  statute: 'https://www.legis.iowa.gov/docs/code/2026/901C.2.pdf',
  rules: 'https://www.legis.iowa.gov/docs/ACO/CourtRulesChapter/02.pdf',
  form: sourceReceipt.issuerUrl,
  eFile: 'https://www.iowacourts.gov/efile',
  feePractice: 'https://studentlegal.uiowa.edu/know-the-law/criminal-law/expungement',
  serviceAddress: 'https://www.johnsoncountyiowa.gov/department-of-county-attorney',
  routeContract: 'data/record-clearing/legal-design-intake/IA.memo.json',
  routeContractGitBlob: '2617a0994c1daf51b92189ab99c94f107947d3d4',
  reviewedOn: '2026-09-07',
};
const allowedKeys = new Set(['synthetic', 'name', 'county', 'caseNumber', 'plaintiff', 'address', 'city', 'state', 'zip', 'phone', 'email', 'outcome', 'dispositionDate', 'assessmentDate', 'deferredJudgment', 'financialObligationsPaid', 'notNgri', 'notIncompetent', 'publicOffense', 'districtCourtRecord', 'selfRepresented', 'filingMethod', 'countyAttorney', 'requestsWaiverOf180Days', 'goodCauseNarrative', 'narrativeAuthorship', 'waiverBasis', 'acknowledgments']);
const requiredText = ['name', 'county', 'caseNumber', 'plaintiff'];
const contacts = ['address', 'city', 'state', 'zip', 'phone', 'email'];
const acknowledgments = ['provideCopy', 'confidentialNotDestroyed', 'notDeferredJudgment', 'publicOffense'];
const textValue = (v, label, max = 200) => {
  if (typeof v !== 'string' || !v.trim() || v !== v.trim() || v.length > max || /[\x00-\x1f\x7f]/.test(v)) fail(`${label}: nonempty trimmed text required`);
  return v;
};
export function dateValue(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) fail('date: YYYY-MM-DD required');
  const d = new Date(s + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) fail('date: invalid calendar date');
  return d;
}
export function validateFacts(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('facts: object required');
  for (const k of Object.keys(input)) if (!allowedKeys.has(k)) fail(`Unpermitted input: ${k}`);
  const f = structuredClone(input);
  if (typeof f.synthetic !== 'boolean') fail('synthetic flag must be explicit');
  for (const k of requiredText) textValue(f[k], k);
  for (const k of contacts) {
    if (!own(f, k)) fail(`${k}: supply known value or explicit null, never infer`);
    if (f[k] !== null) textValue(f[k], k);
  }
  if (!['dismissed_all', 'acquitted_all'].includes(f.outcome)) fail('Route stop: all charges in this case must be dismissed or acquitted');
  if (f.deferredJudgment !== false) fail('Route stop: deferred judgment or unknown disposition');
  for (const k of ['financialObligationsPaid', 'notNgri', 'notIncompetent', 'publicOffense', 'districtCourtRecord', 'selfRepresented']) if (f[k] !== true) fail(`Route stop or missing confirmation: ${k}`);
  if (!['paper', 'efile'].includes(f.filingMethod)) fail('filingMethod must be paper or efile');
  if (f.state !== null && !/^[A-Z]{2}$/.test(f.state)) fail('state: two-letter postal abbreviation required');
  if (f.zip !== null && !/^\d{5}(-\d{4})?$/.test(f.zip)) fail('zip: five digits with optional four-digit extension');
  if (f.phone !== null && !/^\d{10}$/.test(f.phone)) fail('phone: ten digits required');
  if (f.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) fail('email: invalid address');
  if (!f.acknowledgments || Object.keys(f.acknowledgments).some(k => !acknowledgments.includes(k))) fail('acknowledgments: explicit recognized answers required');
  for (const k of acknowledgments) if (f.acknowledgments[k] !== true) fail(`Missing participant acknowledgment: ${k}`);
  const days = (dateValue(f.assessmentDate) - dateValue(f.dispositionDate)) / 86400000;
  if (days < 0) fail('Disposition cannot postdate assessment');
  if (typeof f.requestsWaiverOf180Days !== 'boolean') fail('Waiting-period election required');
  if (f.requestsWaiverOf180Days) {
    if (f.narrativeAuthorship !== 'participant') fail('Good-cause narrative must be participant-authored');
    if (f.waiverBasis !== 'other') fail('Self-help stop: identity-theft, mistaken-identity or unspecified factual showing requires legal assistance');
    if (typeof f.goodCauseNarrative !== 'string' || !f.goodCauseNarrative.trim() || f.goodCauseNarrative.length > 12000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(f.goodCauseNarrative)) fail('Participant narrative required (maximum 12000 characters)');
  } else {
    if (days < 180) fail('Waiting period not met and no good-cause waiver requested');
    for (const k of ['goodCauseNarrative', 'narrativeAuthorship', 'waiverBasis']) if (f[k] !== null) fail(`${k}: inapplicable without waiver request`);
  }
  if (f.countyAttorney !== null) {
    const permitted = ['name', 'address', 'city', 'state', 'zip'];
    if (!f.countyAttorney || Object.keys(f.countyAttorney).some(k => !permitted.includes(k))) fail('countyAttorney: unexpected field');
    for (const k of permitted) textValue(f.countyAttorney[k], `countyAttorney.${k}`);
    if (!/^[A-Z]{2}$/.test(f.countyAttorney.state) || !/^\d{5}(-\d{4})?$/.test(f.countyAttorney.zip)) fail('countyAttorney: invalid state/ZIP');
  }
  return { facts: f, daysSinceDisposition: days, timingFormMismatch: !f.requestsWaiverOf180Days && days === 180 };
}

const SERVICE = { name: 'Johnson County Attorney', address: '500 S. Clinton Street, Suite 400', city: 'Iowa City', state: 'IA', zip: '52244-2450' };
const CANONICAL = {
  synthetic: true, name: 'Avery Jordan Example', county: 'Johnson', caseNumber: 'EXAMPLE-900001', plaintiff: 'State of Iowa',
  address: '100 Example Lane', city: 'Iowa City', state: 'IA', zip: '52240', phone: '3195550101', email: 'avery.example@example.org',
  outcome: 'dismissed_all', dispositionDate: '2025-09-01', assessmentDate: '2026-09-07', deferredJudgment: false,
  financialObligationsPaid: true, notNgri: true, notIncompetent: true, publicOffense: true, districtCourtRecord: true, selfRepresented: true,
  filingMethod: 'paper', countyAttorney: SERVICE, requestsWaiverOf180Days: false, goodCauseNarrative: null, narrativeAuthorship: null, waiverBasis: null,
  acknowledgments: Object.fromEntries(acknowledgments.map(k => [k, true])),
};
export function fixtureFacts() {
  const base = () => structuredClone(CANONICAL);
  return {
    canonical: base(),
    boundary: { ...base(), name: 'Alexandra Catherine Montgomery-Example', caseNumber: 'EXAMPLE-BOUNDARY-900002', outcome: 'acquitted_all', dispositionDate: '2026-03-10', filingMethod: 'efile', countyAttorney: null, address: '9999 Example Heritage Boulevard, Apartment 1234', city: 'University Heights', zip: '52246-1234', phone: '3195550199', email: 'alexandra.montgomery.example@example.org' },
    'good-cause-waiver': { ...base(), caseNumber: 'EXAMPLE-WAIVER-900003', dispositionDate: '2026-08-08', requestsWaiverOf180Days: true, narrativeAuthorship: 'participant', waiverBasis: 'other', goodCauseNarrative: 'I am requesting a waiver of the waiting period because I have a housing application deadline on September 20, 2026. The dismissed case is still appearing in the court-record search requested for that application. I would like the court to consider my request before that deadline. I understand that the court, not this application, decides whether there is good cause.' },
    'exact-day-180': { ...base(), caseNumber: 'EXAMPLE-DAY180-900004', dispositionDate: '2026-03-11', filingMethod: 'efile', countyAttorney: null },
    'missing-contact': { ...base(), caseNumber: 'EXAMPLE-MISSING-900005', address: null, city: null, state: null, zip: null, phone: null, email: null, countyAttorney: null },
  };
}

const label = {
  'cap.01': 'County of the existing case', 'cap.02': 'Other plaintiff, only if the caption is not State of Iowa', 'cap.03': 'Defendant name', 'cap.04': 'Existing case number',
  '01.00': 'Item 1: all charges resolved', '01.AB': 'Item 1.A or 1.B disposition election', '02': 'Item 2: financial obligations paid',
  '03.00': 'Item 3: waiting-period basis', '03.AB': 'Item 3.A ordinary wait or 3.B waiver request', '03.B.f': 'Participant statement attachment reference', '03.B.c': 'Attached good-cause sheet',
  '04': 'Item 4: not acquitted by reason of insanity', '05': 'Item 5: not found incompetent',
  '06.01': 'Acknowledgment: provide county attorney a copy', '06.02': 'Acknowledgment: confidential, not destroyed', '06.03': 'Acknowledgment: not deferred judgment', '06.04': 'Acknowledgment: public offenses only',
  'sig.AB': 'Participant checks signature election A at signing; attorney election B is not used',
  'sig.a.01': 'Printed participant name', 'sig.a.02': 'Signing month', 'sig.a.03': 'Signing day', 'sig.a.04': 'Signing year suffix',
  'sig.a.05': 'Mailing address', 'sig.a.06': 'City', 'sig.a.07': 'State', 'sig.a.08': 'ZIP code', 'sig.a.09': 'Telephone area code', 'sig.a.10': 'Telephone local number', 'sig.a.11': 'Email address',
  'cert.01': 'Person who will serve the application', 'cert.02': 'Actual service month', 'cert.03': 'Actual service day', 'cert.04': 'Actual service year suffix',
  'cert.05': 'County attorney recipient', 'cert.06': 'Service street address', 'cert.07': 'Service city', 'cert.08': 'Service state', 'cert.09': 'Service ZIP code',
};

/** Every source field gets a write or a reasoned blank; no raw field overrides. */
function bindings(v) {
  const f = v.facts;
  const writes = new Map();
  const put = (key, value, fact) => { if (value !== null && value !== undefined) writes.set(PREFIX + key, { value, fact }); };
  for (const [key, fact] of [['cap.01', 'county'], ['cap.03', 'name'], ['cap.04', 'caseNumber'], ['sig.a.01', 'name'], ['sig.a.05', 'address'], ['sig.a.06', 'city'], ['sig.a.07', 'state'], ['sig.a.08', 'zip'], ['sig.a.11', 'email']]) put(key, f[fact], fact);
  if (f.plaintiff !== 'State of Iowa') put('cap.02', f.plaintiff, 'plaintiff');
  if (f.phone !== null) { put('sig.a.09', f.phone.slice(0, 3), 'phone'); put('sig.a.10', f.phone.slice(3, 6) + '-' + f.phone.slice(6), 'phone'); }
  put('02', true, 'financialObligationsPaid'); put('04', true, 'notNgri'); put('05', true, 'notIncompetent');
  for (const [i, fact] of acknowledgments.entries()) put('06.0' + (i + 1), true, 'acknowledgments.' + fact);
  if (!v.timingFormMismatch) { put('03.00', true, 'requestsWaiverOf180Days/dispositionDate/assessmentDate'); put('03.AB', f.requestsWaiverOf180Days ? 'B' : 'A', 'requestsWaiverOf180Days'); }
  if (f.requestsWaiverOf180Days) { put('03.B.f', 'See attached participant statement.', 'goodCauseNarrative (full text on attached sheet)'); put('03.B.c', true, 'requestsWaiverOf180Days'); }
  if (f.filingMethod === 'paper') {
    put('cert.01', f.name, 'name (prepared identity, NOT proof of service)');
    for (const [key, fact] of [['cert.05', 'name'], ['cert.06', 'address'], ['cert.07', 'city'], ['cert.08', 'state'], ['cert.09', 'zip']]) put(key, f.countyAttorney?.[fact], 'countyAttorney.' + fact + ' (intended recipient, NOT proof of service)');
  }
  return writes;
}
function blankReason(key, type, v) {
  if (type === 'PDFButton') return ['NON_FILING_SOURCE_ELEMENT', 'Source Save/Print/Clear/Show/Hide controls suppressed; never part of a filing.'];
  if (key === 'cap.02') return ['NOT_APPLICABLE_ON_THIS_ROUTE', 'The participant supplied State of Iowa; that plaintiff is already printed.'];
  if (['01.00', '01.AB'].includes(key)) return ['PARTICIPANT_ELECTION_GENUINE', 'The adopted Iowa contract reserves item 1 to the participant. Check item 1 and A (all acquitted) or B (all dismissed) after reviewing the entire case.'];
  if (key.startsWith('sig.b.')) return ['NOT_APPLICABLE_ON_THIS_ROUTE', 'Self-represented fixture; attorney block B must remain blank.'];
  if (key === 'sig.AB') return ['PROTECTED_FIELD', 'At signing, participant checks A and signs under penalty of perjury; no automatic execution.'];
  if (['sig.a.02', 'sig.a.03', 'sig.a.04'].includes(key)) return ['PROTECTED_FIELD', 'Enter the actual date when signing, not the build or assessment date.'];
  if (key.startsWith('cert.') && v.facts.filingMethod === 'efile') return ['NOT_APPLICABLE_ON_THIS_ROUTE', 'eFile branch: embedded paper-service certification is not completed. Verify electronic service.'];
  if (['cert.02', 'cert.03', 'cert.04'].includes(key)) return ['PROTECTED_FIELD', 'Only enter the actual mailing or delivery date after service occurs.'];
  if (key.startsWith('cert.')) return ['REQUIRED_BEFORE_FILING', 'County attorney address is unknown. Obtain the correct recipient and address from the county office before paper service.'];
  if (key.startsWith('03.B.')) return ['NOT_APPLICABLE_ON_THIS_ROUTE', 'No good-cause waiver requested; no narrative or attachment election.'];
  if (['03.00', '03.AB'].includes(key) && v.timingFormMismatch) return ['REQUIRED_BEFORE_FILING', 'Day 180 meets the statutory minimum, but the form says MORE than 180. Do not auto-certify that statement. Update the filing assessment after day 180 or obtain court/legal guidance.'];
  if (key.startsWith('sig.a.')) return ['REQUIRED_BEFORE_FILING', 'Contact fact explicitly unknown. Complete this labeled blank before signing and filing; nothing was invented.'];
  fail(`Unclassified source field: ${key}`);
}

async function finalizedBytes(doc, title) {
  doc.setCreationDate(STAMP); doc.setModificationDate(STAMP);
  if (title) doc.setTitle(title);
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false }));
  const scan = scanBytesForActiveContent(bytes);
  if (!scan.inspectable || scan.hits.length) fail(`Active content in emitted PDF: ${pretty(scan)}`);
  const reopened = await PDFDocument.load(bytes, { updateMetadata: false });
  if (reopened.getForm().getFields().length) fail('Interactive fields survived finalization');
  return bytes;
}

async function proseDocument(title, sections, { synthetic = false, subtitle = '' } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page, y;
  const next = () => { page = doc.addPage([612, 792]); y = 735; page.drawText(title, { x: 48, y, font: bold, size: 14 }); y -= 22; if (subtitle) { for (const line of wrapToWidth(font, subtitle, 10, 516)) { page.drawText(line, { x: 48, y, font, size: 10 }); y -= 13; } y -= 5; } };
  next();
  for (const section of sections) {
    if (y < 140) next();
    page.drawText(section.heading, { x: 48, y, font: bold, size: 11 }); y -= 18;
    for (const paragraph of section.paragraphs) {
      for (const line of wrapToWidth(font, paragraph, 10, 516)) {
        if (y < 63) next();
        page.drawText(line, { x: 48, y, font, size: 10, color: rgb(0, 0, 0) }); y -= 13;
      }
      y -= 8;
    }
    y -= 3;
  }
  for (const [i, p] of doc.getPages().entries()) {
    p.drawText(`${synthetic ? 'SYNTHETIC EXAMPLE - DO NOT FILE | ' : ''}${i + 1} of ${doc.getPageCount()}`, { x: 48, y: 32, font, size: 8 });
  }
  return { bytes: await finalizedBytes(doc, title), pageCount: doc.getPageCount() };
}

function instructionSections(v, blanks) {
  const f = v.facts;
  const unknown = [...new Set(blanks.filter(x => x.disposition === 'REQUIRED_BEFORE_FILING').map(x => x.label))];
  return [
    { heading: '1. What is in this packet', paragraphs: [
      'The first three pages are the official August 2024 Rule 2.86 Form 1. Page 3 includes the paper-service certification. No separate service form, proposed order, notarization, DCI request, criminal-history result or billing form is part of this court application.',
      f.requestsWaiverOf180Days ? 'The attached good-cause sheet reproduces your supplied statement. It asks the court to waive the 180-day wait; it does not say the court granted a waiver.' : 'You did not request a good-cause waiver. No waiver statement has been inserted.',
      'These instructions are not filed with the court. Separate them from the application and any selected good-cause attachment.' + (f.synthetic ? ' Fixture names, case numbers and personal facts are invented examples, not real court records. DO NOT FILE THESE EXAMPLES.' : '')
    ] },
    { heading: '2. Check the exact case and timing', paragraphs: [
      `Use the existing ${f.county} County case, ${f.caseNumber}, not a new case in the county where you live. Use one application per separately numbered case. Confirm the original caption, name and case number.`,
      `Your supplied disposition date is ${f.dispositionDate}; the assessment date is ${f.assessmentDate} (${v.daysSinceDisposition} days later). The statute requires a minimum of 180 days from entry of acquittal or the dismissal order, not sentence completion. Recheck timing when you file.`,
      v.timingFormMismatch ? 'DAY-180 WARNING: You meet the statutory minimum on this assessment date, but item 3.A says more than 180 days. Items 3 and 3.A remain blank. Do not make an inaccurate certification; update the assessment after day 180 or obtain court/legal guidance about completing this form.' : (f.requestsWaiverOf180Days ? 'You selected a request for early filing. You must review and keep your own complete good-cause statement attached. The court decides whether the stated reason is enough.' : 'Item 3.A is marked because your supplied dates exceed 180 days. That is not a court eligibility decision.'),
      'This route requires all charges in this case to have been dismissed or acquitted. It is not a deferred-judgment, partial-disposition, insanity-acquittal, incompetency or felony-conviction expungement application. Nonconviction relief is not limited to misdemeanor charges. It concerns district-court public-offense records, not an appellate record except an appeal of a simple misdemeanor to district court.'
    ] },
    { heading: '3. Finish the blanks and sign', paragraphs: [
      `You must personally finish item 1 and its A/B election. Your supplied outcome is ${f.outcome === 'dismissed_all' ? 'all charges dismissed' : 'all charges acquitted'}. Verify the entire case, check item 1, then check B for all dismissed or A for all acquitted. Do not check both.`,
      'Review every checked statement and acknowledgment for accuracy. If anything is untrue or uncertain, stop and correct it. For self-representation, check election A on page 2, enter the actual signing date, and sign under penalty of perjury. A printed name is not a signature. The attorney election and all of block B remain blank. Follow the court instructions for a permitted digitized signature or print and sign; no notarization is required.',
      unknown.length ? 'Complete these unknown items before filing: ' + unknown.join('; ') + '. The packet did not invent missing information.' : 'Known contact facts are already entered. Check them and correct changes before filing.'
    ] },
    { heading: '4. File and serve the county attorney', paragraphs: [
      f.filingMethod === 'paper' ? `You selected paper filing. Use paper only as permitted by the court, including the form's instruction when the case cannot be found in eFile. File at the clerk of the district court for ${f.county} County. Mail or hand-deliver a copy of the signed application and any attachment to that county attorney. Keep a copy and proof of delivery.` : `You selected eFile. Register or sign in to the Iowa Judicial Branch eFile System, locate this existing ${f.county} County case, and submit the signed application with any required attachment. Verify acceptance and electronic service on the county attorney. Keep the filing and service notices; an upload alone is not proof of either.`,
      f.filingMethod === 'paper' ? (f.countyAttorney ? `Intended paper recipient supplied: ${f.countyAttorney.name}, ${f.countyAttorney.address}, ${f.countyAttorney.city}, ${f.countyAttorney.state} ${f.countyAttorney.zip}. Verify the address before sending. Prepared identity/address entries are not proof that service happened.` : 'The county attorney address was not supplied. Obtain the correct current office address; do not substitute the clerk or a guessed address.') : 'Do not complete the embedded paper-service certification merely because this PDF contains it. If electronic service does not reach the county attorney, resolve service with the clerk or legal help rather than claiming successful service.',
      'For paper service, enter the actual mailing/delivery month, day and two-digit year on page 3 only after sending or delivering the copy. The service date is deliberately blank. Follow the clerk instructions for submitting the completed certification. The county attorney generally has 20 days after service to respond, unless the court orders otherwise (Rule 2.83(1)). A hearing may be set; do not assume silence is an order.'
    ] },
    { heading: '5. Costs, decision and self-help stopping point', paragraphs: [
      'University of Iowa Student Legal Services states there is no fee to file this expungement request. Verify any case-specific amount with the clerk. This packet includes no application-fee payment selection or generic fee-waiver form. Copies, postage or other services can cost money.',
      'Original case debt is different from an application fee: all financial obligations in this case must be paid. Obtain the case balance from the clerk before filing. Separate civil room-and-board charges under section 356.7 are not included in this case-debt requirement. You obtain and keep supporting records; this draft does not authenticate them or condition generation on uploading them.',
      'Stop self-help and seek an attorney or legal aid if the county attorney opposes, a hearing becomes contested, only some charges qualify, the case is a deferred judgment, you rely on identity theft or mistaken identity for a waiver, debt is disputed, immigration consequences are involved, or you seek an appellate-record remedy. Do not miss a hearing or court deadline while seeking help.',
      'An order makes the court record confidential and removes public access; it does not destroy the record. The defendant and persons or agencies authorized under section 907.4(2) can still obtain access as provided by law. This packet does not promise removal from DCI, police, private background reports or every database. Keep the order and confirm the public court record has been updated.'
    ] },
    { heading: 'Sources and help', paragraphs: [
      'Iowa Code 901C.2 (2026); Iowa Rules of Criminal Procedure 2.80, 2.83 and 2.84; Rule 2.86 Form 1 (August 2024). Read the official source and your court notices; these instructions do not replace legal advice.',
      authorities.statute, authorities.form, authorities.eFile, authorities.feePractice,
    ] },
  ];
}

export async function renderFixture(input, { sourceBytes } = {}) {
  const v = validateFacts(input);
  const raw = sourceBytes ?? await fs.readFile(path.join(ROOT, SOURCE));
  if (sha256(raw) !== SOURCE_SHA256) fail('Wrong or stale Form 1 source bytes');
  const doc = await PDFDocument.load(raw, { updateMetadata: false });
  if (doc.getPageCount() !== 3) fail('Wrong Form 1 page count');
  const form = doc.getForm(), fields = form.getFields();
  if (fields.length !== 56) fail('Source field inventory drift');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const allowedWrites = bindings(v), actualWrites = [], blanks = [], map = [];
  for (const field of fields) {
    const name = field.getName();
    if (!name.startsWith(PREFIX)) fail('Unknown form field prefix');
    const key = name.slice(PREFIX.length), type = field.constructor.name;
    const widgets = field.acroField.getWidgets().map(w => ({ page: doc.getPages().findIndex(p => p.ref === w.P()) + 1, rect: w.getRectangle() }));
    if (widgets.some(w => w.page < 1)) fail(`Unlocated widget: ${name}`);
    const row = { fieldId: name, label: label[key] ?? (key.startsWith('sig.b.') ? 'Attorney-only block B: ' + key : key), type, widgets };
    const write = allowedWrites.get(name);
    if (write) {
      let fit = null;
      if (field instanceof PDFTextField) {
        const value = String(write.value), max = field.getMaxLength();
        if (max !== undefined && value.length > max) fail(`Source maximum length: ${name}`);
        fit = fitTextToWidget({ font, text: value, rect: widgets[0].rect, multiline: field.isMultiline(), maxFontSize: 11, minFontSize: 8, evaluateDeclaredMinimumSize: true });
        if (!applyFitToTextField(field, fit)) fail(`Unreadable known fact: ${name}`);
        for (const widget of field.acroField.getWidgets()) widget.setDefaultAppearance(`/Helv ${fit.fontSize} Tf 0 g`);
      } else if (field instanceof PDFCheckBox) field.check();
      else if (field instanceof PDFRadioGroup) {
        if (!field.getOptions().includes(write.value)) fail(`Invalid source radio option: ${name}`);
        field.select(write.value);
        // Form 1 PRINTS squares. pdf-lib's default radio provider adds circles
        // to BOTH choices. Paint only the selected X, leaving printed boxes intact.
        field.updateAppearances((_field, widget) => {
          const { width, height } = widget.getRectangle();
          const line = (a, b) => drawLine({ start: a, end: b, thickness: 0.85, color: rgb(0, 0, 0) });
          return { normal: { on: [
            ...line({ x: 2, y: 2 }, { x: width - 2, y: height - 2 }),
            ...line({ x: 2, y: height - 2 }, { x: width - 2, y: 2 }),
          ], off: [] } };
        });
      }
      else fail(`Unwritable control: ${name}`);
      actualWrites.push({ ...row, value: write.value, fact: write.fact, fit });
      map.push({ ...row, action: 'WRITE', fact: write.fact });
    } else {
      const [disposition, reason] = blankReason(key, type, v);
      blanks.push({ ...row, disposition, reason }); map.push({ ...row, action: 'BLANK', disposition, reason });
    }
  }
  const signature = { fieldId: 'printed.participant-signature-rule', label: 'Participant signature on page 2', type: 'printed_rule', widgets: [{ page: 2, rect: { x: 306, y: 380.799, width: 234, height: 16.44 } }], disposition: 'PROTECTED_FIELD', reason: 'Real participant signature required at signing; this area is not an AcroForm field.' };
  blanks.push(signature); map.push({ ...signature, action: 'BLANK' });
  if (map.length !== 57 || actualWrites.length + blanks.length !== 57) fail('Incomplete field/write/blank partition');
  const { clean, report: sanitation } = await sanitizeAndFlatten(doc, { defaultFont: font, writtenFields: new Set(actualWrites.map(w => w.fieldId)), detachNestedControlFields: true, suppressSynthesizedAppearances: true, fitAppearancesToRect: true, suppressSynthesizedWidgetBorders: true, honorWidgetBorderStyle: true, preserveUnwrittenSelectionBackgrounds: true });
  preserveSourceMetadata(doc, clean); carryDates(doc, clean);
  const application = await finalizedBytes(clean);
  const instructions = instructionSections(v, blanks);
  const guide = await proseDocument('Iowa nonconviction expungement: next steps', instructions, { synthetic: v.facts.synthetic, subtitle: `${v.facts.name} | ${v.facts.county} County | ${v.facts.caseNumber}` });
  let attachment = null;
  if (v.facts.requestsWaiverOf180Days) attachment = await proseDocument('Attachment to Rule 2.86 Form 1, item 3.B', [{ heading: 'Participant statement requesting a waiting-period waiver', paragraphs: v.facts.goodCauseNarrative.split(/\r?\n/).filter(Boolean) }], { synthetic: v.facts.synthetic, subtitle: `${v.facts.plaintiff} v. ${v.facts.name} | ${v.facts.county} County | ${v.facts.caseNumber}` });
  const packet = await PDFDocument.create();
  const components = [{ id: 'application-with-embedded-service', bytes: application, pages: 3, fileWithCourt: true }];
  if (attachment) components.push({ id: 'participant-good-cause-statement', bytes: attachment.bytes, pages: attachment.pageCount, fileWithCourt: true });
  components.push({ id: 'participant-instructions', bytes: guide.bytes, pages: guide.pageCount, fileWithCourt: false });
  let page = 1;
  const coverage = [];
  for (const c of components) {
    const componentDoc = await PDFDocument.load(c.bytes, { updateMetadata: false });
    for (const p of await packet.copyPages(componentDoc, componentDoc.getPageIndices())) packet.addPage(p);
    coverage.push({ id: c.id, pages: c.pages, firstPacketPage: page, lastPacketPage: page + c.pages - 1, sha256: sha256(c.bytes), fileWithCourt: c.fileWithCourt }); page += c.pages;
  }
  return { packet: await finalizedBytes(packet, 'Iowa Rule 2.86 Form 1 packet'), components, actualWrites, blanks, map, sanitation, coverage, instructions, facts: v.facts, timing: { daysSinceDisposition: v.daysSinceDisposition, statutoryMinimumMet: v.daysSinceDisposition >= 180, formWordingNeedsManualResolution: v.timingFormMismatch }, pageCount: packet.getPageCount() };
}

export async function buildFamily({ outDir = path.join(ROOT, OUTPUT) } = {}) {
  await fs.mkdir(path.join(outDir, 'fixtures'), { recursive: true });
  await fs.mkdir(path.join(outDir, 'reports'), { recursive: true });
  const write = async (p, b) => { await fs.mkdir(path.dirname(path.join(outDir, p)), { recursive: true }); await fs.writeFile(path.join(outDir, p), b); };
  const results = [];
  for (const [name, facts] of Object.entries(fixtureFacts())) {
    const r = await renderFixture(facts);
    await write(`fixtures/${name}.json`, pretty(facts));
    await write(`fixtures/${name}.pdf`, r.packet);
    for (const c of r.components) await write(`components/${name}/${c.id}.pdf`, c.bytes);
    await write(`reports/${name}.json`, pretty({ familyId: FAMILY, fixture: name, sourceSha256: SOURCE_SHA256, timing: r.timing, actualWrites: r.actualWrites, blanks: r.blanks, fieldMap: r.map, sanitation: r.sanitation, components: r.coverage }));
    results.push({ fixture: name, path: `fixtures/${name}.pdf`, bytes: r.packet.length, sha256: sha256(r.packet), pageCount: r.pageCount, components: r.coverage, mappedWriteAreas: r.map.length, actualWrites: r.actualWrites.length, deliberateBlanks: r.blanks.length, protectedSignatureAndDatesRemainBlank: true });
  }
  await write('source-receipt.json', pretty(sourceReceipt));
  await write('reports/rendered-artifacts.json', pretty({ familyId: FAMILY, fixtures: results }));
  await write('participant-instructions.md', '# Iowa Rule 2.86 Form 1 instructions\n\n' + instructionSections(validateFacts(fixtureFacts().canonical), []).map(s => '## ' + s.heading + '\n\n' + s.paragraphs.join('\n\n')).join('\n\n') + '\n');
  await write('build-status.json', pretty({ familyId: FAMILY, status: 'BUILT_CANDIDATE_NOT_ADMITTED', inputCommit: INPUT_COMMIT, strategy: 'official_pdf_fill', sourceApprovalGranted: false, independentReview: 'PENDING_CHAT10', centralRaster: 'PENDING_CHAT_A', runtimeInstalled: false, productionReady: false, filingPermittedByThisBuild: false, retainedRequirements: ['A: reconcile original fee release question using the identified no-filing-fee practice source, not a fabricated court fee selection', 'A: retain narrow court-record effect; no unproved DCI erasure promise', 'Chat10: independently review all current outputs and sources', 'A: publish current binary files, integrate and admit central raster', 'Real participant: confirm manual disposition, sign/date and complete actual service; unknown fields disclosed per fixture'] }));
  await write('route-contract.json', pretty({ familyId: FAMILY, routeKey: 'obligation:track-pathway:IA:ia-901c2:nonconviction-901c2', instrument: 'Rule 2.86 Form 1', actor: 'self-represented defendant', destination: 'Existing case, district court clerk in county of case', service: 'Embedded paper certification or verified eFile service to county attorney', courtResponseDays: 20, noProposedOrder: true, noNotary: true, dciRequestIncluded: false, requiredSupportingRecordsAreParticipantObtained: true, noThirdPartyRecordUploadGate: true, authorities }));
  console.log(pretty({ familyId: FAMILY, outDir, completeFixturePdfs: results.length, completePacketPages: results.reduce((n, r) => n + r.pageCount, 0), fixtures: results.map(({ fixture, sha256, pageCount }) => ({ fixture, sha256, pageCount })) }));
  return results;
}
