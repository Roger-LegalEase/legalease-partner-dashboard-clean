/** Chat 8: actual held Rule 2.86 Form 2. No runtime, shared host or registry writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFTextField, PDFCheckBox, StandardFonts } from 'pdf-lib';
import { fitTextToWidget, applyFitToTextField, wrapToWidth } from '../../rcap-official-forms/rcap-text-fitting.mjs';
import { sanitizeAndFlatten, scanBytesForActiveContent } from '../../rcap-official-forms/rcap-active-content.mjs';
import { preserveSourceMetadata, carryDates } from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import { extractTextItems } from '../../rcap-official-forms/rcap-pdf-anchor-capture.mjs';

export const FAMILY = 'ia-901c3-set';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const OUTPUT = 'data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill';
export const SOURCE = 'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-2-2024-08.pdf';
export const SOURCE_SHA256 = '5a1c67004e4ff551cefca4ced50f8f48c77586b25e7e32384defda7726d4f963';
export const INPUT_COMMIT = '9da680c4412a1d551d679c0f425f3c5f96cf1077';
export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
export const pretty = v => JSON.stringify(v, null, 2) + '\n';
const STAMP = new Date('2026-09-07T00:00:00Z');
const fail = m => { throw new Error(m); };
const own = (o, k) => Object.hasOwn(o, k);
const exactKeys = (o, keys, where) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) fail(`${where}: object required`);
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${where}: unpermitted input ${k}`);
  for (const k of keys) if (!own(o, k)) fail(`${where}: missing explicit ${k}`);
};
export function text(v, name, max = 200) {
  if (typeof v !== 'string' || !v.trim() || v.trim() !== v || v.length > max || /[\x00-\x1f\x7f]/.test(v)) fail(`${name}: nonempty trimmed text required`);
  return v;
}
export function dateValue(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) fail('date: YYYY-MM-DD required');
  const d = new Date(`${s}T00:00:00Z`);
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== s) fail('date: invalid calendar date');
  return d;
}
export const fullName = n => [n.first, n.middle, n.last].filter(Boolean).join(' ');
function nameValue(n, where) {
  exactKeys(n, ['first', 'middle', 'last'], where);
  text(n.first, `${where}.first`, 40); text(n.last, `${where}.last`, 40);
  // Empty middle explicitly means none; null/absent means unknown and is refused.
  if (n.middle !== '') text(n.middle, `${where}.middle`, 40);
  return n;
}
export const authorities = {
  form: 'https://www.iowacourts.gov/collections/867/files/1965/embedDocument/',
  statute: 'https://www.legis.iowa.gov/docs/code/2026/901C.3.pdf',
  rules: 'https://www.legis.iowa.gov/docs/ACO/CourtRulesChapter/02.pdf',
  dci: 'https://dps.iowa.gov/divisions-iowa-department-public-safety/iowa-division-criminal-investigation/criminal-history-record-check-information',
  efile: 'https://www.iowacourts.gov/efile',
  feePractice: 'https://studentlegal.uiowa.edu/know-the-law/criminal-law/expungement',
  routeContract: 'data/record-clearing/legal-design-intake/IA.memo.json',
  routeContractBlob: '2617a0994c1daf51b92189ab99c94f107947d3d4',
  serviceAddress: 'https://www.johnsoncountyiowa.gov/department-of-county-attorney',
  reviewedOn: '2026-09-07',
};
export const sourceReceipt = {
  familyId: FAMILY, allSourcesExact: true, editionApprovalGranted: false,
  documents: [{ documentId: 'Rule 2.86 Form 2', path: SOURCE, sha256: SOURCE_SHA256, byteCount: 2674736, pages: 3,
    edition: 'August 2024', issuerUrl: authorities.form, retainedDriveId: '1w5SQ5CIpGUSUyBO-vRt5LGNPdsjhBwpc',
    originalAcquisition: '2026-09-02', custodyRecovered: '2026-09-07',
    identity: 'All three held pages inspected. Current issuer instrument read for title, edition and requirements; not a claim of byte equality to a new issuer download.',
    sourceFields: 73, sourceWidgets: 74, viewerButtons: 7, additionalPrintedParticipantSignatureArea: 1,
    fieldPrefixCaution: 'Pages 1/2 use 2.86-2. but signing/service fields on page 3 actually use 2.86-1.; no Form 1 source substituted.',
    embeddedService: { page: 3, separateMissingForm: false } }],
};
// These exact statutory exclusions are guards, not a new eligibility engine. The manual
// item-4 judgment and adopted conservative 235B.20 hold remain. Comparability is not guessed.
const excludedSections = ['123.46','235B.20','321.218','321A.32','321J.21','321J.2','707.5','708.2A','708.7','708.11','708.12','721.2','721.10','723.1'];
const excludedChapters = ['717C','719','720','724','726','728','901A'];
export function validateFacts(input) {
  const keys = ['synthetic','name','aliases','county','caseNumber','plaintiff','dob','driversLicense','ssn','address','city','state','zip','phone','email','convictionDate','filingDate','offense','misdemeanorConviction','deferredJudgmentDisposition','hasPrior901c3Grant','hasOtherEligibleConvictions','relatedCases','pendingCharges','deferredJudgmentProceedings','financialObligationsPaid','exclusionsReviewed','comparabilityUncertain','sexOffense','selfRepresented','filingMethod','countyAttorney','historyReport','acknowledgments'];
  exactKeys(input, keys, 'facts'); const f = structuredClone(input);
  if (typeof f.synthetic !== 'boolean') fail('synthetic: boolean required');
  nameValue(f.name, 'name'); if (fullName(f.name).length > 60) fail('name exceeds the source full-name limit');
  if (!Array.isArray(f.aliases) || f.aliases.length > 30) fail('aliases: explicit array, maximum 30');
  f.aliases.forEach((n, i) => nameValue(n, `aliases[${i}]`));
  if (new Set(f.aliases.map(fullName)).size !== f.aliases.length || f.aliases.some(n => fullName(n) === fullName(f.name))) fail('aliases: duplicate/current legal name');
  for (const k of ['county','caseNumber','plaintiff']) text(f[k], k);
  for (const k of ['driversLicense','address','city','state','zip','phone','email']) if (f[k] !== null) text(f[k], k);
  if (f.state !== null && !/^[A-Z]{2}$/.test(f.state)) fail('state: postal abbreviation required');
  if (f.zip !== null && !/^\d{5}(-\d{4})?$/.test(f.zip)) fail('zip: invalid');
  if (f.phone !== null && !/^\d{10}$/.test(f.phone)) fail('phone: ten digits required');
  if (f.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) fail('email: invalid');
  if (f.ssn !== null && !/^\d{9}$/.test(f.ssn)) fail('ssn: exactly nine digits or explicit null');
  const filing = dateValue(f.filingDate), conviction = dateValue(f.convictionDate);
  if (f.dob !== null && dateValue(f.dob) >= conviction) fail('dob must precede conviction');
  const anniversary = new Date(conviction); anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 8);
  if (filing < anniversary) fail('Route stop: fewer than eight years since conviction');
  if (f.misdemeanorConviction !== true || f.deferredJudgmentDisposition !== false) fail('Route stop: Form 2 requires a misdemeanor conviction, not a deferred judgment');
  if (f.hasPrior901c3Grant !== false) fail('Route stop: prior or unknown lifetime 901C.3 grant');
  if (f.hasOtherEligibleConvictions !== false) fail('Self-help stop: strategic choice among multiple convictions');
  if (!Array.isArray(f.relatedCases) || f.relatedCases.length !== 0) fail('Self-help stop: related-case/same-transaction determination requires legal assistance');
  if (f.pendingCharges !== false) fail('Route stop: pending or unknown criminal charges');
  if (![0,1].includes(f.deferredJudgmentProceedings)) fail('Route stop: two or more or uncertain deferred-judgment proceedings');
  for (const k of ['financialObligationsPaid','exclusionsReviewed','selfRepresented']) if (f[k] !== true) fail(`Missing participant confirmation: ${k}`);
  if (f.comparabilityUncertain !== false || f.sexOffense !== false) fail('Self-help stop: sex offense or unresolved federal/prior-law comparability');
  exactKeys(f.offense, ['section','title'], 'offense'); text(f.offense.section, 'offense.section'); text(f.offense.title, 'offense.title');
  if (!/^\d+[A-Z]?\.\d+[A-Z]?(\(\d+[a-z]?\))*$/i.test(f.offense.section)) fail('offense.section: exact Iowa Code citation required');
  if (excludedSections.some(s => f.offense.section === s || f.offense.section.startsWith(s + '(')) || excludedChapters.includes(f.offense.section.split('.')[0]) || /^123\.47\(3\)|^708\.2\(3\)|^716\.8\([34]\)/.test(f.offense.section)) fail('Route stop: excluded or retained conservative source category');
  if (['123.47','708.2','716.8'].includes(f.offense.section)) fail('offense.section: subsection needed to resolve statutory scope');
  if (!['paper','efile'].includes(f.filingMethod)) fail('filingMethod: paper or efile required');
  if (f.countyAttorney !== null) {
    exactKeys(f.countyAttorney, ['name','address','city','state','zip'], 'countyAttorney');
    for (const [k,v] of Object.entries(f.countyAttorney)) text(v, `countyAttorney.${k}`);
    if (!/^[A-Z]{2}$/.test(f.countyAttorney.state) || !/^\d{5}(-\d{4})?$/.test(f.countyAttorney.zip)) fail('countyAttorney: invalid address components');
  }
  exactKeys(f.historyReport, ['availability','issuedOn','releaseSigned'], 'historyReport');
  const h = f.historyReport;
  if (!['available','requested','not_requested','unknown'].includes(h.availability)) fail('historyReport: unrecognized availability');
  if (![true,false,null].includes(h.releaseSigned)) fail('historyReport.releaseSigned: explicit boolean or null');
  let reportAgeDays = null;
  if (h.availability === 'available') {
    reportAgeDays = (filing - dateValue(h.issuedOn)) / 86400000;
    if (reportAgeDays < 0) fail('historyReport: issue date cannot postdate intended filing');
  } else if (h.issuedOn !== null) fail('historyReport: an unreceived report cannot have an asserted issue date');
  exactKeys(f.acknowledgments, ['copy','related','lifetime','confidential'], 'acknowledgments');
  for (const [k,v] of Object.entries(f.acknowledgments)) if (v !== true) fail(`Read-before-signing acknowledgment not supplied: ${k}`);
  const historyReadyByParticipantReport = h.availability === 'available' && reportAgeDays <= 30 && h.releaseSigned === true;
  return { facts: f, anniversary: anniversary.toISOString().slice(0,10), exactAnniversary: +filing === +anniversary, reportAgeDays, historyReadyByParticipantReport,
    externalHistoryIncluded: false, reportAvailabilityIsParticipantReported: true, filingReady: false };
}
const canonical = {
  synthetic: true, name: {first:'Avery',middle:'Jordan',last:'Example'}, aliases: [], county:'Johnson', caseNumber:'EXAMPLE-901C3-0001', plaintiff:'State of Iowa',
  dob:'1988-04-12', driversLicense:'EXAMPLE0001', ssn:'000120001', address:'100 Example Lane', city:'Iowa City', state:'IA', zip:'52240', phone:'3195550101', email:'avery.example@example.org',
  convictionDate:'2017-09-06', filingDate:'2026-09-07', offense:{section:'714.2(5)',title:'Theft in the fifth degree'}, misdemeanorConviction:true, deferredJudgmentDisposition:false,
  hasPrior901c3Grant:false, hasOtherEligibleConvictions:false, relatedCases:[], pendingCharges:false, deferredJudgmentProceedings:0, financialObligationsPaid:true,
  exclusionsReviewed:true, comparabilityUncertain:false, sexOffense:false, selfRepresented:true, filingMethod:'paper',
  countyAttorney:{name:'Johnson County Attorney',address:'500 S. Clinton Street, Suite 400',city:'Iowa City',state:'IA',zip:'52244-2450'},
  historyReport:{availability:'available',issuedOn:'2026-08-28',releaseSigned:true}, acknowledgments:{copy:true,related:true,lifetime:true,confidential:true},
};
export function fixtureFacts() {
  const b = () => structuredClone(canonical);
  return {
    canonical:b(),
    boundary:{...b(),caseNumber:'EXAMPLE-901C3-BOUNDARY',name:{first:'Alexandra',middle:'Catherine',last:'Montgomery-Example'}, aliases:[{first:'Alex',middle:'',last:'Example'}], filingMethod:'efile',countyAttorney:null,
      address:'9999 Example Heritage Boulevard, Apartment 1234',city:'University Heights',zip:'52246-1234',email:'alexandra.montgomery.example@example.org',phone:'3195550199',historyReport:{availability:'available',issuedOn:'2026-08-08',releaseSigned:true},deferredJudgmentProceedings:1},
    'additional-aliases':{...b(),caseNumber:'EXAMPLE-901C3-ALIASES',aliases:[{first:'Avery',middle:'Jordan',last:'Sample'},{first:'AJ',middle:'',last:'Sample'},{first:'Avery',middle:'',last:'Example-Sample'}]},
    'history-stale':{...b(),caseNumber:'EXAMPLE-901C3-STALE',historyReport:{availability:'available',issuedOn:'2026-08-07',releaseSigned:true}},
    'history-requested':{...b(),caseNumber:'EXAMPLE-901C3-REQUEST',historyReport:{availability:'requested',issuedOn:null,releaseSigned:true}},
    'release-missing':{...b(),caseNumber:'EXAMPLE-901C3-RELEASE',historyReport:{availability:'available',issuedOn:'2026-08-28',releaseSigned:null}},
    'exact-eight-years':{...b(),caseNumber:'EXAMPLE-901C3-YEAR8',convictionDate:'2018-09-07'},
    'missing-identifiers':{...b(),caseNumber:'EXAMPLE-901C3-MISSING',dob:null,driversLicense:null,ssn:null,phone:null,email:null,countyAttorney:null,historyReport:{availability:'unknown',issuedOn:null,releaseSigned:null}},
  };
}
// Keys come from the exact held source. Its page-3 field prefix really is 2.86-1.
const fieldKey = name => name.replace(/^2\.86-[12]\./, '');
const labels = {
  'cap.01':'County of the existing case','cap.02':'Other plaintiff','cap.03':'Defendant full name','cap.04.f':'Case number(s)',
  '01.01':'Current legal first name','01.02':'Current legal middle name','01.03':'Current legal last name',
  '01.04':'Other name first name','01.05':'Other name middle name','01.06':'Other name last name','01.07':'Additional alternate names attached',
  '01.08':'Birth month','01.09':'Birth day','01.10':'Birth year','01.11':'Driver license number','01.12':'Social Security number first three digits','01.13':'Social Security number middle two digits','01.14':'Social Security number last four digits',
  '02':'Item 2: no previous 901C.3 grant','03.00':'Item 3: related cases election','03.f':'Item 3: related cases and same-transaction determination','03.c':'Item 3: additional related-case sheet attached',
  '04':'Item 4: legal eligibility assertion','05':'Item 5: financial obligations paid','06':'Item 6: more than eight years since conviction','07':'Item 7: no pending criminal charges','08':'Item 8: deferred-judgment determination','09':'Item 9: returned DCI report actually attached within 30 days of filing',
  '10.01':'Acknowledgment: copy to county attorney','10.02':'Acknowledgment: related cases','10.03':'Acknowledgment: lifetime limitation','10.04':'Acknowledgment: confidential court record',
  'sig.a.01':'Printed participant full name','sig.a.02':'Actual signing month','sig.a.03':'Actual signing day','sig.a.04':'Actual signing year suffix',
  'sig.a.05':'Mailing address','sig.a.06':'City','sig.a.07':'State','sig.a.08':'ZIP code','sig.a.09':'Telephone area code','sig.a.10':'Telephone local number','sig.a.11':'Email address',
  'sig.AB':'Signature election A/B','cert.01':'Prepared name of person serving','cert.02':'Actual service month','cert.03':'Actual service day','cert.04':'Actual service year suffix',
  'cert.05':'Intended county attorney recipient','cert.06':'Service mailing address','cert.07':'Service city','cert.08':'Service state','cert.09':'Service ZIP code',
};
function bindings(v) {
  const f = v.facts, w = new Map(), put = (key,value,fact) => { if(value !== null && value !== undefined) w.set(key,{value,fact}); };
  put('cap.01',f.county,'county'); put('cap.03',fullName(f.name),'name'); put('cap.04.f',f.caseNumber,'caseNumber');
  if(f.plaintiff !== 'State of Iowa') put('cap.02',f.plaintiff,'plaintiff');
  for(const [suffix,k] of [['01','first'],['02','middle'],['03','last']]) put('01.'+suffix,f.name[k] || 'N/A','name.'+k);
  if(f.aliases.length) for(const [suffix,k] of [['04','first'],['05','middle'],['06','last']]) put('01.'+suffix,f.aliases[0][k] || 'N/A','aliases[0].'+k);
  if(f.aliases.length > 1) put('01.07',true,'aliases.length > 1; actual additional-names component generated');
  if(f.dob) { const [y,m,d] = f.dob.split('-'); for(const [key,value] of [['01.08',m],['01.09',d],['01.10',y]]) put(key,value,'dob'); }
  put('01.11',f.driversLicense,'driversLicense');
  if(f.ssn) for(const [k,val] of [['01.12',f.ssn.slice(0,3)],['01.13',f.ssn.slice(3,5)],['01.14',f.ssn.slice(5)]]) put(k,val,'ssn');
  put('02',true,'hasPrior901c3Grant === false'); put('05',true,'financialObligationsPaid'); if(!v.exactAnniversary) put('06',true,'convictionDate/filingDate'); put('07',true,'pendingCharges === false');
  for(const [i,k] of ['copy','related','lifetime','confidential'].entries()) put('10.0'+(i+1),true,'acknowledgments.'+k);
  put('sig.a.01',fullName(f.name),'name');
  for(const [key,k] of [['sig.a.05','address'],['sig.a.06','city'],['sig.a.07','state'],['sig.a.08','zip'],['sig.a.11','email']]) put(key,f[k],k);
  if(f.phone) { put('sig.a.09',f.phone.slice(0,3),'phone'); put('sig.a.10',f.phone.slice(3,6)+'-'+f.phone.slice(6),'phone'); }
  if(f.filingMethod === 'paper') {
    put('cert.01',fullName(f.name),'name (prepared identity, not completed service)');
    for(const [key,k] of [['cert.05','name'],['cert.06','address'],['cert.07','city'],['cert.08','state'],['cert.09','zip']]) put(key,f.countyAttorney?.[k],'countyAttorney.'+k+' (intended recipient)');
  }
  return w;
}
function blank(key,type,v) {
  const na = reason => ({completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',requiredBeforeFiling:false,routeConditionThatMakesItInapplicable:reason,reason});
  const protectedBlank = reason => ({completenessDisposition:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',reason});
  const manual = reason => ({completenessDisposition:'PARTICIPANT_ELECTION_GENUINE',refusalClass:'participant_sworn_narrative_or_legal_election',reason});
  const required = reason => ({completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,routeDetermined:false,factAvailable:false,determinedByTheCaseNotTheRoute:true,whyTheRouteCannotDetermineIt:reason,reason});
  if(type === 'PDFButton') return na('Viewer UI control, never a filing fact; source button and active behavior removed.');
  if(key === 'cap.02') return na('State of Iowa already printed; no different plaintiff was supplied.');
  if(['01.04','01.05','01.06'].includes(key)) return na('Participant explicitly reports no other names ever used.');
  if(key === '01.07') return na('Zero or one alternate name; no additional alternate-name sheet is attached.');
  if(key.startsWith('03.')) return na('Only one case selected and participant reports no related cases. The related-case branch is not reached. No same-transaction assertion or list is generated.');
  if(['04','08'].includes(key)) return manual(key === '04' ? 'Item 4 requires the participant legal eligibility judgment against the full exclusion list; the adopted route contract reserves it for manual completion.' : 'Item 8 requires the participant deferred-judgment counting judgment; the adopted route contract reserves it for manual completion.');
  if(key === '09') return manual('No returned DCI report is included in these generated bytes. Personally attach the actual timely report, obtained with a signed release, then review and check item 9. A participant availability answer is not attachment evidence.');
  if(key === '06') return required('Exact eight-year anniversary satisfies the statutory minimum but not the form statement more than eight years. Update the intended filing date after the anniversary or obtain legal/court guidance; do not certify a false statement.');
  if(key.startsWith('sig.b.')) return na('Attorney-only block B is inapplicable to this self-represented application; no attorney facts or signature are supplied.');
  if(key === 'sig.AB' || ['sig.a.02','sig.a.03','sig.a.04'].includes(key)) return protectedBlank('Participant completes the actual signature election and date when signing; generation and intended filing dates are not execution dates.');
  if(key.startsWith('cert.') && v.facts.filingMethod === 'efile') return na('eFile selected; paper-service certification not used. Verify electronic service and resolve a failed service rather than certify mailing.');
  if(['cert.02','cert.03','cert.04'].includes(key)) return protectedBlank('Actual mailing or delivery date is not known before service. Complete only after service occurs.');
  if(key.startsWith('cert.')) return required('Intended county attorney recipient/address was not supplied. Obtain the correct office details before paper service.');
  if(key.startsWith('sig.a.') || /^01\.(08|09|10|11|12|13|14)$/.test(key)) return required('This requested identity/contact fact is explicitly unknown. Enter the truthful value privately before filing; ask the clerk or legal aid how to complete it if you do not have one.');
  fail('Unclassified source field: '+key);
}
export async function finalizedBytes(doc,title) {
  doc.setCreationDate(STAMP); doc.setModificationDate(STAMP); if(title) doc.setTitle(title);
  const bytes = Buffer.from(await doc.save({useObjectStreams:false}));
  const scan = scanBytesForActiveContent(bytes);
  if(!scan.inspectable || scan.hits.length) fail('Active content survived finalization');
  const reopened = await PDFDocument.load(bytes,{updateMetadata:false});
  if(reopened.getForm().getFields().length) fail('Interactive fields survived finalization');
  return bytes;
}
// Lane-scoped participant prose, not a substitute for any official form.
export async function proseDocument(title,sections,{synthetic=false,subtitle=''}={}) {
  const doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page,y;
  const next = () => { page=doc.addPage([612,792]);y=739;page.drawText(title,{x:48,y,font:bold,size:14});y-=25;
    for(const line of wrapToWidth(font,subtitle,9.5,516)){page.drawText(line,{x:48,y,font,size:9.5});y-=13;} y-=7; };
  next();
  for(const s of sections) {
    if(y<125) next(); for(const line of wrapToWidth(bold,s.heading,11,516)){page.drawText(line,{x:48,y,font:bold,size:11});y-=16;}
    for(const paragraph of s.paragraphs) { for(const line of wrapToWidth(font,paragraph,10,516)){if(y<65)next();page.drawText(line,{x:48,y,font,size:10});y-=13;}y-=8;}y-=4;
  }
  for(const [i,p] of doc.getPages().entries()) p.drawText(`${synthetic?'SYNTHETIC EXAMPLE - DO NOT FILE | ':''}${i+1} of ${doc.getPageCount()}`,{x:48,y:32,font,size:8});
  return {bytes:await finalizedBytes(doc,title),pageCount:doc.getPageCount()};
}
function instructions(v,blanks) {
  const f=v.facts, h=f.historyReport, missing=[...new Set(blanks.filter(x=>x.completenessDisposition==='REQUIRED_BEFORE_FILING').map(x=>x.label))];
  return [
    {heading:'1. Review the packet before you use your one opportunity',paragraphs:[
      `This packet is for ${fullName(f.name)}, ${f.county} County, existing case ${f.caseNumber}. It contains all three official Form 2 pages, including the service certification on page 3,${f.aliases.length>1?' an additional alternate-names sheet,':''} and these instructions. Separate these instructions before filing.`,
      'No official returned DCI history report, proposed order, notarization, DCI request form or billing form is included. You must add your actual returned history report before filing. This draft is not a fully assembled filing and is not a grant of expungement.'+(f.synthetic?' All personal facts, identifiers and case numbers here are synthetic examples. DO NOT FILE THESE EXAMPLES.':''),
      'Section 901C.3 permits only one grant in a lifetime, with a limited same-transaction exception for multiple misdemeanors. Get legal advice before choosing among multiple convictions. This self-help build supports one case, not the legal determination that several cases arise from the same transaction.'
    ]},
    {heading:'2. Obtain the returned history report, not just a request form',paragraphs:[
      `Your reported history status is ${h.availability}; issue date ${h.issuedOn??'not known'}; age at intended filing ${v.reportAgeDays===null?'not determinable':v.reportAgeDays+' days'}; signed release ${h.releaseSigned===true?'reported completed':h.releaseSigned===false?'reported not completed':'not known'}. These answers are not proof of any report content or attachment.`,
      v.historyReadyByParticipantReport?'Your reported dates are within 30 days of the intended filing date and you report signing the release. Personally verify the actual returned report and attach it. Item 9 remains blank because this generated PDF does not contain that report.':'DO NOT FILE YET: the reported history is unavailable, more than 30 days old at intended filing, or a signed release has not been confirmed. Obtain a qualifying returned report and recheck its date before filing. Item 9 remains blank.',
      'Form 2 requires an official DCI Iowa criminal history records check dated within the past 30 days of filing. Submit DCI-77 with your release-authorization signature and the required DCI-76 payment form for the chosen mail/fax procedure. DCI charges $15 per last name. The request form, billing form and payment receipt are not the returned history report. Do not attach a blank request in its place.',
      'DCI accepts the documented mail/fax/in-person procedures. Mail to DCI Support Operations Bureau, 215 East 7th Street, Des Moines, IA 50319; fax 515-725-6080; questions 515-725-6066. DCI reports mail/fax processing ordinarily takes 1-3 days after receipt, not a guaranteed delivery date. Use the current DCI instructions for payment, identification and all names. LegalEase does not request, inspect or authenticate your returned history.',
      'Recheck the age against the actual filing date, not the build date. Day 30 is within the modeled limit; day 31 is not. A delayed filing can make a previously timely report stale. After you have physically/electronically attached the actual report to your filing and reviewed it, complete item 9 truthfully.'
    ]},
    {heading:'3. Confirm the exact conviction and the waiting period',paragraphs:[
      `Supplied conviction: ${f.offense.title}, Iowa Code ${f.offense.section}, entered ${f.convictionDate}. Eight-year anniversary: ${v.anniversary}. Intended filing: ${f.filingDate}. The clock runs from conviction, not sentence completion or payment.`,
      v.exactAnniversary?'EXACT-ANNIVERSARY CAUTION: The statute says a minimum of eight years, but item 6 says more than eight years. Item 6 is blank. Wait until after the anniversary and update your filing date, or obtain legal/court guidance rather than make an inaccurate certification.':'Item 6 is marked from supplied dates because the intended filing date is later than the eighth anniversary. Reconfirm those dates before signing.',
      'This is the misdemeanor-conviction route, not dismissal/acquittal, deferred judgment, public intoxication, underage possession or felony-conviction relief. You must have no pending criminal charges anywhere, no prior 901C.3 grant, not more than one counted deferred-judgment proceeding, and all financial obligations in this case paid. Ask the clerk for the actual case balance. Separate civil room-and-board fees under section 356.7 are treated separately by Rule 2.83(3).',
      'Review the full 2026 section 901C.3(2) list before personally checking item 4. It excludes sections 123.46, qualifying 123.47(3)/local offenses, 321.218, 321A.32, 321J.21, 321J.2, sex offenses defined in 692A.101, 707.5, 708.2(3), 708.2A, 708.7, 708.11, 708.12, 716.8(3)/(4), 721.2, 721.10, 723.1; chapters 717C, 719, 720, 724, 726, 728 and 901A; specified comparable federal commercial-driver offenses and comparable offenses under prior law. The form also lists 235B.20; that source/statute discrepancy remains a legal-review hold for that category, not a reason to certify it eligible.'
    ]},
    {heading:'4. Finish the genuine choices and execution blanks',paragraphs:[
      'Item 3 is not selected because only one case and no related cases were supplied. Do not infer relatedness from similar case numbers. Multiple same-transaction cases require legal assistance and separate filing in every case. No related-case sheet is attached.',
      `Personally review and complete item 4 (eligibility) and item 8 (deferred-judgment count). You reported ${f.deferredJudgmentProceedings} counted proceeding(s), but the form assertion remains your legal judgment. Charges deferred at the same time count as one. Do not check an unknown or untrue statement.`,
      f.aliases.length>1?'Your first alternate name is on page 1; the actual attached sheet contains the remaining names. Review every name and keep that sheet with the filing.':'No extra alternate-names sheet is attached. '+(f.aliases.length?'Your one supplied alternate name is entered on page 1.':'You explicitly reported no former names or nicknames; those lines remain inapplicable, not invented.'),
      missing.length?'Complete or resolve these specifically disclosed items before filing: '+missing.join('; ')+'.':'Check all prepared identity and contact entries against your actual information.',
      'Choose signature election A for self-representation, enter the actual signing date and sign under penalty of perjury. The printed full name is not a signature. The attorney election and block B remain blank. Follow the court instructions for a permitted digitized signature or print and hand-sign; no notary or proposed order is supplied. Keep SSN, birth date, history and other personal data private and follow the court confidential-filing instructions.'
    ]},
    {heading:'5. File in the existing case and serve the county attorney',paragraphs:[
      f.filingMethod==='paper'?`Paper selected: file with the ${f.county} County district court clerk in the existing case, using paper only when allowed, including when your case cannot be found in eFile. Mail or hand-deliver a complete copy of the signed application and required attachments to the county attorney.`:`eFile selected: use the Iowa Judicial Branch eFile System in the existing ${f.county} County case. Upload the signed application with the real DCI report and any alternate-names sheet. Confirm acceptance and electronic service on the county attorney. An upload alone proves neither.`,
      f.filingMethod==='paper'?(f.countyAttorney?`Prepared intended recipient: ${f.countyAttorney.name}, ${f.countyAttorney.address}, ${f.countyAttorney.city}, ${f.countyAttorney.state} ${f.countyAttorney.zip}. Verify current office details. The entries are not evidence that service occurred.`:'Recipient details are missing. Obtain the correct current county attorney name/address before sending. Do not guess or substitute the clerk.'):'The paper certification remains blank. If electronic service does not reach the county attorney, resolve service with the clerk or legal assistance instead of falsely certifying delivery.',
      'For paper service, enter the actual mailing/delivery date in the embedded certification only after service occurs. Follow clerk instructions for returning that certification. Keep the filed packet, filing acceptance and service proof. The county attorney may respond within 20 days after service unless otherwise ordered (Rule 2.83). A hearing may be set; silence is not an order.'
    ]},
    {heading:'6. Costs, outcome and when self-help stops',paragraphs:[
      'University of Iowa Student Legal Services reports no filing fee for an expungement request. Verify any case-specific charge with the clerk. No application-fee election or invented fee-waiver form is included. DCI record fees, copies and postage are separate from both filing and original case debt.',
      'Seek legal help for contested eligibility, opposition, immigration consequences, multiple convictions/related cases, uncertain prior relief or deferred judgments, pending charges, disputed debt, prior-law/federal comparability, or the retained 235B.20 discrepancy. Do not miss court dates or deadlines while seeking help.',
      'If granted, the court record becomes confidential under section 22.7 and may be made available by court order. Section 901C.3(5) separately requires the court to order removal of that conviction history from DPS files and prohibit further dissemination. That is not destruction of every record or a guarantee that every private background report updates. Keep the actual order and check court/DPS implementation.'
    ]},
    {heading:'Sources and official assistance',paragraphs:[
      'Iowa Code 901C.3 (2026); Rule 2.86 Form 2 (August 2024); Iowa Rules 2.80, 2.81 and 2.83. Use the official sources and your actual court notices. This packet is not legal advice or a court eligibility decision.',
      authorities.statute,authorities.form,authorities.dci,authorities.efile,authorities.feePractice
    ]},
  ];
}
export async function renderFixture(input,{sourceBytes}={}) {
  const v=validateFacts(input),raw=sourceBytes??await fs.readFile(path.join(ROOT,SOURCE));
  if(sha256(raw)!==SOURCE_SHA256)fail('Wrong or stale Form 2 source bytes');
  const doc=await PDFDocument.load(raw,{updateMetadata:false}); if(doc.getPageCount()!==3)fail('Form 2 page-count drift');
  const fields=doc.getForm().getFields(); if(fields.length!==73)fail('Form 2 field inventory drift');
  const font=await doc.embedFont(StandardFonts.Helvetica),writes=bindings(v),actualWrites=[],blanks=[],map=[],viewerElements=[];
  for(const field of fields) {
    const name=field.getName(),key=fieldKey(name),type=field.constructor.name;
    if(key===name || (key.startsWith('sig.')||key.startsWith('cert.') ? !name.startsWith('2.86-1.') : !name.startsWith('2.86-2.')))fail('Unexpected Form 2 field identity '+name);
    const widgets=field.acroField.getWidgets().map(w=>({page:doc.getPages().findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle()}));
    if(widgets.some(w=>w.page<1))fail('Unlocated Form 2 widget');
    const row={fieldId:name,sourceFieldId:name,label:labels[key]??(key.startsWith('sig.b.')?'Attorney-only block B '+key:type==='PDFButton'?'Viewer UI control '+key:key),type,widgets,isSelectionControl:type==='PDFCheckBox'||type==='PDFRadioGroup'};
    const w=writes.get(key);
    if(w) {
      let fit=null;
      if(field instanceof PDFTextField) {
        const value=String(w.value),max=field.getMaxLength(); if(max!==undefined&&value.length>max)fail('Source maximum length: '+name);
        fit=fitTextToWidget({font,text:value,rect:widgets[0].rect,multiline:field.isMultiline(),maxFontSize:11,minFontSize:8,evaluateDeclaredMinimumSize:true});
        if(!applyFitToTextField(field,fit))fail('Unreadable known fact: '+name);
        for(const widget of field.acroField.getWidgets())widget.setDefaultAppearance(`/Helv ${fit.fontSize} Tf 0 g`);
      } else if(field instanceof PDFCheckBox)field.check(); else fail('Unpermitted write type '+name);
      actualWrites.push({...row,value:w.value,fact:w.fact,fit});map.push({...row,action:'WRITE',fact:w.fact});
    } else {const why=blank(key,type,v);blanks.push({...row,...why});map.push({...row,action:'BLANK',...why});if(type==='PDFButton')viewerElements.push({...row,...why});}
  }
  const signature={fieldId:'printed.participant-signature',sourceFieldId:'printed.participant-signature',label:'Participant signature',type:'printed_rule',widgets:[{page:3,rect:{x:306,y:590.981,width:234,height:16.44}}],completenessDisposition:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',reason:'Real participant signs on the printed page-3 signature rule at execution; not an AcroForm field.'};
  blanks.push(signature);map.push({...signature,action:'BLANK'});
  if(map.length!==74||actualWrites.length+blanks.length!==74)fail('Form 2 complete field partition failed');
  const {clean,report:sanitation}=await sanitizeAndFlatten(doc,{defaultFont:font,writtenFields:new Set(actualWrites.map(w=>w.fieldId)),detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true,preserveUnwrittenSelectionBackgrounds:true});
  preserveSourceMetadata(doc,clean);carryDates(doc,clean);const application=await finalizedBytes(clean);
  const guideSections=instructions(v,blanks),guide=await proseDocument('Iowa misdemeanor expungement: next steps',guideSections,{synthetic:v.facts.synthetic,subtitle:`${fullName(v.facts.name)} | ${v.facts.county} County | ${v.facts.caseNumber}`});
  const components=[{id:'form-2',sourceDocumentId:'Rule 2.86 Form 2',bytes:application,pages:3,fileWithCourt:true}];
  if(v.facts.aliases.length>1) {
    const aliases=await proseDocument('Attachment to Rule 2.86 Form 2, item 1',[{heading:'Additional alternate names supplied by the participant',paragraphs:v.facts.aliases.slice(1).map(n=>`First: ${n.first}; middle: ${n.middle||'N/A (none)'}; last: ${n.last}.`)}],{synthetic:v.facts.synthetic,subtitle:`${v.facts.plaintiff} v. ${fullName(v.facts.name)} | ${v.facts.county} County | ${v.facts.caseNumber}`});
    components.push({id:'additional-alternate-names',bytes:aliases.bytes,pages:aliases.pageCount,fileWithCourt:true});
  }
  components.push({id:'participant-instructions',bytes:guide.bytes,pages:guide.pageCount,fileWithCourt:false});
  const packet=await PDFDocument.create(),coverage=[];let page=1;
  for(const c of components){const d=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const p of await packet.copyPages(d,d.getPageIndices()))packet.addPage(p);coverage.push({id:c.id,sourceDocumentId:c.sourceDocumentId??null,firstPacketPage:page,lastPacketPage:page+c.pages-1,pages:c.pages,sha256:sha256(c.bytes),fileWithCourt:c.fileWithCourt});page+=c.pages;}
  const readback = await PDFDocument.load(application,{updateMetadata:false});
  const runs = readback.getPages().map(extractTextItems);
  const measuredTextWrites = actualWrites.filter(w=>w.type==='PDFTextField').map(w=>{
    const q=w.widgets[0], b=q.rect, value=String(w.value).replace(/\s/g,'');
    const found=runs[q.page-1].filter(t=>t.x>=b.x-0.1&&t.x<=b.x+b.width&&t.y>=b.y&&t.y<=b.y+b.height).map(t=>t.text).join('').replace(/\s/g,'');
    if(!found.includes(value)) fail('Final PDF text readback missing: '+w.fieldId);
    return {fieldId:w.fieldId,verifiedValue:w.value,nonWhitespaceGlyphs:value.length,measurement:'shared content-stream parser; geometric extent separately tested by final-PDF importer'};
  });
  return {packet:await finalizedBytes(packet,'Iowa Rule 2.86 Form 2 packet'),measuredTextWrites,components,coverage,pageCount:packet.getPageCount(),map,actualWrites,blanks,viewerElements,sanitation,instructions:guideSections,assessment:v};
}
export async function buildFamily({outDir=path.join(ROOT,OUTPUT)}={}) {
  const write=async(p,b)=>{await fs.mkdir(path.dirname(path.join(outDir,p)),{recursive:true});await fs.writeFile(path.join(outDir,p),b);};
  const packets=[],maps={schemaVersion:1,familyId:FAMILY,writes:[],refusals:[]},actual={familyId:FAMILY,artifacts:[]},blankReport={familyId:FAMILY,fixtures:[]},allInstructions=[];
  for(const [fixture,facts]of Object.entries(fixtureFacts())) {
    const r=await renderFixture(facts),pdfPath=`fixtures/${fixture}.pdf`;
    await write(`fixtures/${fixture}.json`,pretty(facts));await write(pdfPath,r.packet);
    for(const c of r.components)await write(`components/${fixture}/${c.id}.pdf`,c.bytes);
    await write(`reports/${fixture}.json`,pretty({familyId:FAMILY,fixture,assessment:r.assessment,fieldMap:r.map,actualWrites:r.actualWrites,blanks:r.blanks,sourceElements:r.viewerElements,measuredTextWrites:r.measuredTextWrites,sanitation:r.sanitation,components:r.coverage}));
    const scoped=x=>({...x,fieldId:`${fixture}:${x.fieldId}`,factId:x.fact?`${fixture}:${x.fact}`:null,documentId:`${fixture}/form-2`,fixture});
    maps.writes.push(...r.actualWrites.map(scoped));maps.refusals.push(...r.blanks.map(scoped));
    actual.artifacts.push({fixture,finalPdf:`${OUTPUT}/${pdfPath}`,valuesReportedByFinalizer:r.actualWrites.length,actualWrites:r.actualWrites,addedGlyphsReadFromOutputBytes:r.measuredTextWrites.reduce((n,w)=>n+w.nonWhitespaceGlyphs,0),measuredTextWrites:r.measuredTextWrites});
    blankReport.fixtures.push({fixture,blanks:r.blanks,externalRequiredComponent:{id:'returned-dci-history',included:false,participantReportedStatus:facts.historyReport,requiredBeforeFiling:true}});
    packets.push({fixture,path:`${OUTPUT}/${pdfPath}`,relativePath:pdfPath,sha256:sha256(r.packet),bytes:r.packet.length,pageCount:r.pageCount,documents:r.coverage.map(c=>({...c,documentId:`${fixture}/${c.id}`})),externalHistoryIncluded:false,historyReadyByParticipantReport:r.assessment.historyReadyByParticipantReport,filingReady:false});
    allInstructions.push(`## ${fixture}\n\n`+r.instructions.map(s=>`### ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n')+'\n\n### Exact completion ledger\n\n'+r.blanks.map(b=>`${b.fieldId}: ${b.label}. ${b.reason}`).join('\n\n'));
  }
  maps.refusals.push({fieldId:'external.returned-dci-history',documentId:'returned-dci-history',label:'Supporting documentation: returned DCI Iowa criminal history',completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,routeDetermined:false,factAvailable:false,reason:'Participant must actually attach the timely returned official report, obtained with a signed release. No report is supplied or fabricated by this generator.'});
  allInstructions.push('## External component required before filing\n\nexternal.returned-dci-history: Supporting documentation: returned DCI Iowa criminal history. Obtain and attach the real returned report dated within 30 days of actual filing, with the signed-release process completed. No generated request replaces it.');
  await write('source-receipt.json',pretty(sourceReceipt));await write('production-field-map.json',pretty(maps));await write('reports/actual-writes.json',pretty(actual));await write('reports/blanks-left-for-the-participant.json',pretty(blankReport));
  await write('reports/rendered-artifacts.json',pretty({familyId:FAMILY,packets}));await write('participant-instructions.md','# Iowa Form 2: fixture-specific instructions and completion ledger\n\n'+allInstructions.join('\n\n'));
  await write('reports/packet-level-readiness.json',pretty({familyId:FAMILY,knownRequiredComponentsMissing:1,missingComponents:[{id:'returned-dci-history',requiredBeforeFiling:true,externalParticipantObtained:true,included:false,reason:'The actual returned history is not a generator-produced document. No blank request or fabricated report substitutes for it.'}],filingReady:false}));
  await write('approval-request.json',pretty({familyId:FAMILY,status:'REVIEW_REQUESTED_NOT_APPROVED',sourceApproval:false,independentReview:'PENDING_CHAT10',centralRaster:'PENDING_CHAT_A'}));
  await write('build-status.json',pretty({familyId:FAMILY,status:'BUILT_DRAFT_WITH_EXTERNAL_FILING_REQUIREMENT',inputCommit:INPUT_COMMIT,sourceApproval:false,independentReview:'PENDING_CHAT10',centralRaster:'PENDING_CHAT_A',runtimeInstalled:false,terminal:false,productionReady:false,externalHistoryIncluded:false,retainedRequirements:['Participant: actual timely returned DCI report, manual legal assertions, signing and real service','A: reconcile county-fee release question and retained 235B.20 source/statute discrepancy','Chat10: independent complete current-output review','A: exact-byte publication and central raster admission']}));
  await write('route-contract.json',pretty({familyId:FAMILY,trackId:'ia-901c3',instrument:'Rule 2.86 Form 2',strategy:'official_pdf_fill',scope:'one misdemeanor-conviction case; related-case strategic determinations stop for legal assistance',manualItems:['3 related-case determination (not applicable for supported one-case route)','4 eligibility','8 deferred-judgment determination','9 actual returned-report attachment','signature election, signature/signing date and service date'],historyContract:{requiredBeforeFiling:true,maxAgeDays:30,anchor:'actual filing date',signedReleaseRequired:true,availabilityIsParticipantReported:true,recordsCollectedOrAuthenticated:false,requestIsNotReport:true},noProposedOrder:true,noNotary:true,embeddedServicePage:3,feeElectionIncluded:false,authorities}));
  console.log(pretty({familyId:FAMILY,outDir,fixtures:packets.map(p=>({fixture:p.fixture,sha256:p.sha256,pageCount:p.pageCount})),completeGeneratedPages:packets.reduce((a,p)=>a+p.pageCount,0),externalHistoryIncluded:false,filingReady:false}));return packets;
}
