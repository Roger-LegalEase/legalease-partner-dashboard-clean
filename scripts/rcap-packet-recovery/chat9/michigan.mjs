/** MC227-only contract adapter. Rendering, geometry fitting and PDF sanitation are
 * reused from existing shared modules; no shared renderer is copied or changed.
 * Synthetic evidence is not an eligibility finding, a signed statement, a
 * certified court record, or permission to enable a production route. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { assessPriorApplications, historyInstructions } from './mi-history-policy.mjs';
import { fitTextToWidget, wrapToWidth } from '../../rcap-official-forms/rcap-text-fitting.mjs';
import { preserveSourceMetadata, carryDates } from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import { sanitizeAndFlatten, ensureDefaultAppearances, scanBytesForActiveContent } from '../../rcap-official-forms/rcap-active-content.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SOURCE = 'reference/chat-parallel-2026-09-07/chat9/mc227.pdf';
export const SOURCE_SHA = '9fec389975f06640aff057fbace9375866f64761c33e30c86e9798609f93b8a7';
export const FAMILY_IDS = ['mi_setaside_application-set', 'mi_setaside_first_owi-set'];
export const FORM_URL = 'https://www.courts.michigan.gov/siteassets/forms/scao-approved/mc227.pdf';
export const FAQ_URL = 'https://www.michigan.gov/ag/initiatives/expungement-assistance/questions';
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = data => JSON.stringify(data, null, 2) + '\n';
const clone = data => structuredClone(data);
export const familyDir = id => {
  assert(FAMILY_IDS.includes(id), `outside Chat 9 Michigan ownership: ${id}`);
  return `data/rcap-all50/overlays/census-v1/mi/${id.replaceAll('_', '-')}--official-pdf-fill`;
};
const REQUIRED = (x, label) => { assert(typeof x === 'string' && x.trim(), `required fact: ${label}`); return x.trim(); };
const DATE = (x, label) => { REQUIRED(x, label); assert(/^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(x).toISOString().slice(0,10) === x, `invalid date: ${label}`); return x; };
const datePrint = x => { DATE(x, 'record date'); return `${x.slice(5,7)}/${x.slice(8,10)}/${x.slice(0,4)}`; };
const fixedStamp = new Date('2026-01-01T00:00:00Z');
const PROTECTED = {
  judge: 'Assigned judge not supplied; never infer a judicial identity.',
  dattyinfo: 'Attorney block: self-represented applicant is not their own attorney.',
  sworndate: 'Actual oath date belongs to execution before clerk/notary.',
  appsig: 'Applicant must personally sign after reviewing the application.',
  notsig: 'Clerk/notary signature.', expcom: 'Notary commission expiration.',
  name: 'Printed NOTARY name, not participant name.', notcounty: 'Notary county.',
  actcountycheck: 'Notary acting-county election.', actcounty: 'Notary acting county.',
  electcheck: 'Actual electronic/remote notarization election.',
  proofficial: 'Part of clerk-completed notice of hearing, not service proof.',
  hdate: 'Court-set hearing date/time.', hloc: 'Court-set hearing location.', hjudge: 'Hearing judge.',
  posnoticecheck: 'Whether the notice was actually served is not known at generation.',
  proofficialcheck: 'Actual completed service on prosecutor.', posofficialdate: 'Actual prosecutor service date.',
  posattygencheck: 'Actual completed service on Attorney General.', posattygendate: 'Actual AG service date.',
  posmspdate: 'Actual MSP service date; also certifies enclosures not generated here.',
  sigdate: 'Actual execution date of proof of service.', sig: 'Personal signature on proof of service.'
};
const LABELS = {
  district: 'Judicial district', circuit: 'Judicial circuit', 'county ': 'County', caseno: 'Case number (three repeated widgets)',
  multcaseno: 'This application includes multiple case numbers as listed in item 1',
  ori: 'ORI (MI- prefix is printed)', prno: 'Police Report No.', ctaddress: 'Court address', cttelno: 'Court telephone no.',
  somcheck: 'The People of the State of Michigan', peoplecheck: 'The People of a local jurisdiction', peopleof: 'Name of local jurisdiction',
  dinfo: "Defendant's name, address, and telephone no.", ctntcn: 'CTN/TCN', sid: 'SID',
  fel1check: 'Item 2.a: multiple felonies; seven-year/no-new-conviction statement',
  seriouscheck: 'Item 2.b: serious misdemeanor; five-year/no-new-conviction statement',
  firstcheck: 'Item 2.c: first OWI; five-year/no-new-conviction/no-prior-granted-first-OWI-relief statement',
  fel5yearscheck: 'Item 2.d: single felony; five-year/no-new-conviction statement',
  mis1check: 'Item 2.e: ordinary misdemeanors; exclusions and three-year/no-new-conviction statement',
  noappcheck: 'Item 3.a: no prior application for a listed conviction', prevappcheck: 'Item 3.b: prior application for a listed conviction',
  noappcheck2: 'Item 4.a: no prior application for other convictions', prevappcheck2: 'Item 4.b: prior application for other convictions',
  anycheck: 'Item 5: no deferred-and-dismissed convictions', defercheck: 'Item 5: deferred-and-dismissed convictions exist',
  deferlist: 'Item 5: identify deferred-and-dismissed convictions'
};
for (let n=1;n<=4;n++) {
  for (const [prefix,label] of [['c','Crime'],['ch','Charge code(s) / MCL citation / PACC Code'],['cdate','Date of conviction'],['cno','Case number']]) LABELS[`${prefix}${n}`] = `Item 1 row ${n}: ${label}`;
  for (const [prefix,label] of [['c','Crime'],['ch','Charge code(s) / MCL citation / PACC Code'],['cdate','Date of conviction'],['cno','Case number'],['dispo','Disposition of earlier application']]) {
    LABELS[`prev${prefix}${n}`] = `Item 3 row ${n}: ${label}`;
    LABELS[`4prev${prefix}${n}`] = `Item 4 row ${n}: ${label}`;
  }
}
export async function readSource() {
  const bytes = fs.readFileSync(path.join(ROOT,SOURCE));
  assert.equal(sha256(bytes), SOURCE_SHA, 'MC227 source drift');
  const doc = await PDFDocument.load(bytes,{updateMetadata:false});
  assert.equal(doc.getPageCount(),4);
  const pages=doc.getPages();
  const census=doc.getForm().getFields().map(f=>({
    name:f.getName(), label:LABELS[f.getName()] ?? PROTECTED[f.getName()],
    type:f.constructor.name, multiline:typeof f.isMultiline==='function' && f.isMultiline(),
    sourceValue: typeof f.getText==='function' ? f.getText() ?? null : typeof f.isChecked==='function' ? f.isChecked() : null,
    widgets:f.acroField.getWidgets().map(w=>({page:pages.findIndex(p=>p.ref.toString()===w.P()?.toString())+1,rect:w.getRectangle()})),
    protectedReason:PROTECTED[f.getName()] ?? null
  }));
  assert.equal(census.length,106); assert(census.every(r=>r.label),'unclassified MC227 field');
  assert(census.every(r=>r.sourceValue===null || r.sourceValue===false),'source contains participant data/default answers');
  return {bytes,doc,census};
}

export function validateInput(familyId,input) {
  assert(FAMILY_IDS.includes(familyId),'wrong family'); assert.equal(input.familyId,familyId,'wrong-route family mismatch');
  for (const key of Object.keys(input)) assert(['familyId','synthetic','reviewAsOf','participant','court','prosecution','recordIdentifiers','convictions','attestations','previousSame','previousOther','deferred','attachments','feeRelief'].includes(key),`unsupported input / protected injection: ${key}`);
  assert.equal(input.synthetic,true,'This evidence builder accepts synthetic fixtures only; it is not a live participant endpoint.');
  for (const k of ['name','street','cityStateZip','phone']) REQUIRED(input.participant?.[k],`participant.${k}`);
  for (const k of ['key','county','number','address','phone']) REQUIRED(input.court?.[k],`court.${k}`);
  assert(['district','circuit'].includes(input.court.level),'court.level must be district or circuit');
  assert(['state','local'].includes(input.prosecution?.kind),'prosecution.kind required');
  if(input.prosecution.kind==='local') REQUIRED(input.prosecution.name,'prosecution.name');
  assert(Array.isArray(input.convictions) && input.convictions.length>0,'at least one conviction required');
  const seen=new Set();
  for(const [index,row] of input.convictions.entries()) {
    for(const key of ['crime','chargeCode','caseNumber','courtKey','category']) REQUIRED(row[key],`convictions[${index}].${key}`);
    DATE(row.date,`convictions[${index}].date`);
    assert.equal(row.courtKey,input.court.key,'separate application required for each convicting court');
    const rowKey=[row.caseNumber,row.crime,row.chargeCode,row.date].join('|'); assert(!seen.has(rowKey),'duplicate conviction row'); seen.add(rowKey);
    assert(['felony','seriousMisdemeanor','ordinaryMisdemeanor','firstOwi'].includes(row.category),'unresolved conviction category; no route inferred');
  }
  for (const key of Object.keys(input.recordIdentifiers ?? {})) assert(['ori','prno','ctntcn','sid'].includes(key), `unknown record identifier: ${key}`);
  const cats=new Set(input.convictions.map(r=>r.category));
  if(familyId===FAMILY_IDS[0]) assert(!cats.has('firstOwi'),'first OWI must not use the ordinary family');
  else {assert.equal(input.convictions.length,1,'first-OWI family requires exactly one OWI; mixed application needs separate route review');assert(cats.has('firstOwi'),'first-OWI family refuses ordinary convictions');}
  // These answers must be explicit. They are not manufactured from dates or fixture names.
  const a=input.attestations; assert(a && a.noPendingCharges===true,'item 6 requires explicit no-pending-charges answer');
  assert.equal(a.requestAndConsent,true,'item 1 request and nonpublic-record consent required');
  const want=[]; const felonies=input.convictions.filter(r=>r.category==='felony').length;
  if(felonies>1) want.push('a'); else if(felonies===1) want.push('d');
  if(cats.has('seriousMisdemeanor')) want.push('b'); if(cats.has('ordinaryMisdemeanor')) want.push('e'); if(cats.has('firstOwi')) want.push('c');
  assert.deepEqual(Object.keys(a.item2 ?? {}).sort(),want.sort(),'explicit item 2 statements must exactly match supplied row categories');
  for(const letter of want) assert.equal(a.item2[letter],true,`item 2.${letter} entire printed statement has not been affirmed`);
  for(const kind of ['previousSame','previousOther']) {
    assert(Array.isArray(input[kind]),`${kind} is required; absent does not mean no prior application`);
    for(const r of input[kind]) {
      for(const k of ['crime','chargeCode','caseNumber','disposition']) REQUIRED(r[k],`${kind}.${k}`); DATE(r.date,`${kind}.date`);
      if(kind==='previousSame') assert(input.convictions.some(c=>c.caseNumber===r.caseNumber && c.crime===r.crime && c.date===r.date),'item 3 history must refer to a conviction in item 1');
      else assert(!input.convictions.some(c=>c.caseNumber===r.caseNumber && c.crime===r.crime && c.date===r.date),'same conviction history belongs in item 3, not item 4');
    }
  }
  const history=assessPriorApplications(input);
  if(familyId===FAMILY_IDS[1]) {
    assert.equal(a.noPriorFirstOwiRelief,true,'item 2.c requires an explicit answer that prior first-OWI relief was not received');
    assert.equal(history.priorFirstOwiReliefReceived,false,'prior GRANTED first-OWI relief contradicts MC227 item 2.c; a denied application alone does not');
    assert(!history.reasons.some(r=>r.status==='PRIOR_OUTCOME_UNKNOWN'),'resolve the unknown first-OWI application outcome before affirming item 2.c; this is not a prior-grant finding');
  }
  assert(input.deferred && typeof input.deferred.hasHistory==='boolean','item 5 answer required');
  if(input.deferred.hasHistory) REQUIRED(input.deferred.description,'item 5 history');
  else assert(!input.deferred.description,'item 5 negative answer conflicts with supplied history');
  assert.equal(input.attachments?.certifiedCopies,'not_supplied','fixture must not pretend certified copies were provided');
  assert.equal(input.attachments?.fingerprintCard,'not_supplied','fixture must not pretend a fingerprint card was provided');
  assert.equal(input.feeRelief,'not_requested','MC227 does not supply a processing-fee waiver; no unrelated fee form is inserted');
  return want;
}

/** A source-bound MC227 profile, not a new generic form engine. */
export async function prepareProfile(familyId,input,source) {
  const wanted=validateInput(familyId,input), values={}, provenance={};
  const put=(field,value,basis)=>{ assert(!PROTECTED[field],`protected binding ${field}`); assert(Object.hasOwn(LABELS,field),`unknown MC227 binding ${field}`);values[field]=value;provenance[field]=basis; };
  put(input.court.level,input.court.number,`court.${input.court.level}`); put('county ',input.court.county,'court.county');
  put('ctaddress',input.court.address,'court.address');put('cttelno',input.court.phone,'court.phone');
  put('dinfo',[input.participant.name,input.participant.street,input.participant.cityStateZip,input.participant.phone].join('\n'),'participant name, street, locality and phone, all explicitly supplied');
  put('caseno',input.convictions[0].caseNumber,'lead case from item 1, repeated without changing identity');
  if(new Set(input.convictions.map(r=>r.caseNumber)).size>1) put('multcaseno',true,'more than one distinct case number is actually listed in item 1/continuation');
  put(input.prosecution.kind==='state'?'somcheck':'peoplecheck',true,'explicit prosecution.kind');
  if(input.prosecution.kind==='local') put('peopleof',input.prosecution.name,'explicit prosecution.name');
  for(const k of ['ori','prno','ctntcn','sid']) if(input.recordIdentifiers?.[k]) put(k,REQUIRED(input.recordIdentifiers[k],k),`supplied record identifier ${k}; not inferred from participant identity`);
  const tables=[['',input.convictions],['prev',input.previousSame],['4prev',input.previousOther]];
  for(const [prefix,rows] of tables) for(const [i,row] of rows.slice(0,4).entries()) {
    for(const [column,key] of [['c','crime'],['ch','chargeCode'],['cdate','date'],['cno','caseNumber'],...(prefix?[['dispo','disposition']]:[])]) put(`${prefix}${column}${i+1}`, key==='date'?datePrint(row[key]):row[key],`${prefix||'item1'}[${i}].${key}; transcribed synthetic record fact`);
  }
  for(const letter of wanted) put({a:'fel1check',b:'seriouscheck',c:'firstcheck',d:'fel5yearscheck',e:'mis1check'}[letter],true,`attestations.item2.${letter} explicitly affirms the entire printed statement; no eligibility finding`);
  put(input.previousSame.length?'prevappcheck':'noappcheck',true,'explicit item 3 history array');
  put(input.previousOther.length?'prevappcheck2':'noappcheck2',true,'explicit item 4 history array');
  put(input.deferred.hasHistory?'defercheck':'anycheck',true,'explicit item 5 answer');
  if(input.deferred.hasHistory) put('deferlist',input.deferred.description,'explicit deferred-and-dismissed history');
  const font=await source.doc.embedFont(StandardFonts.Helvetica), bindings=[], fitReport=[];
  // The existing renderer does not fit by geometry. Its profile gets only values
  // that the existing shared fitter has proven fit every repeated widget.
  for(const [field,value] of Object.entries(values)) {
    const row=source.census.find(r=>r.name===field);assert(row);
    if(typeof value==='boolean') {bindings.push({field,kind:'checkbox',factKey:field});continue;}
    const fits=row.widgets.map(w=>fitTextToWidget({font,text:value,rect:w.rect,multiline:row.multiline,maxFontSize:field==='dinfo'?9:10,minFontSize:7,evaluateDeclaredMinimumSize:true}));
    assert(fits.every(f=>f.outcome!=='refused'),`value does not fit without truncation: ${field}`);
    const size=Math.min(...fits.map(f=>f.fontSize));
    // One field's DA is shared across its widgets. Use the narrowest result.
    const settled=row.widgets.map(w=>fitTextToWidget({font,text:value,rect:w.rect,multiline:row.multiline,maxFontSize:size,minFontSize:size,evaluateDeclaredMinimumSize:true}));
    assert(settled.every(f=>f.outcome!=='refused'),`inconsistent repeated-widget fit: ${field}`);
    const lines=settled.reduce((x,y)=>x.lines.length>y.lines.length?x:y).lines;
    values[field]=row.multiline?lines.join('\n'):value;
    bindings.push({field,kind:'text',factKey:field,fontSize:size});
    fitReport.push({field,fontSize:size,widgets:row.widgets,outcome:fits.map(f=>f.outcome),lines});
  }
  const profile={profileId:`chat9-${familyId}-MC227-3-25`,profileVersion:'1',form:{formId:'MC 227',officialName:'Application to Set Aside Conviction(s)'},derivedSource:{path:SOURCE,sha256:SOURCE_SHA},protectedFields:Object.keys(PROTECTED),bindings,deterministicTimestamp:fixedStamp.toISOString()};
  const ledger=source.census.map(row=>({...row, disposition:Object.hasOwn(values,row.name)?'WRITTEN_FROM_EXPLICIT_FACT':PROTECTED[row.name]?'PROTECTED_FIELD':['ori','prno','ctntcn','sid'].includes(row.name)?'REQUIRED_BEFORE_FILING':'NOT_APPLICABLE_TO_SUPPLIED_SELECTION',basis:provenance[row.name]??PROTECTED[row.name]??(['ori','prno','ctntcn','sid'].includes(row.name)?'Not supplied; obtain/confirm the identifier with the convicting court; do not invent it.':'Unselected alternative, inactive court level, or unused table row under the explicit supplied answers.')}));
  return {profile,values,fitReport,ledger};
}

async function preserveCourtIdentity(sourceDoc,bytes) {
  const doc=await PDFDocument.load(bytes,{updateMetadata:false});
  preserveSourceMetadata(sourceDoc,doc);carryDates(sourceDoc,doc);
  const result=await doc.save({useObjectStreams:false});
  const checked=await PDFDocument.load(result,{updateMetadata:false});
  assert(!/legalease|rcap/i.test([checked.getTitle(),checked.getCreator(),checked.getAuthor()].join(' ')),'partner branding in court-facing metadata');
  assert.equal(checked.getForm().getFields().length,0,'interactive field survived');
  const scan=scanBytesForActiveContent(result);assert.equal(scan.hits.length,0,`active content survived: ${JSON.stringify(scan)}`);
  return result;
}

/** MC227's expressly permitted additional sheets, used only for excess rows. */
async function continuation(sourceDoc,input) {
  const sections=[['Item 1 - convictions to be set aside',input.convictions.slice(4),false],['Item 3 - earlier applications for listed convictions',input.previousSame.slice(4),true],['Item 4 - earlier applications for other convictions',input.previousOther.slice(4),true]].filter(s=>s[1].length);
  if(!sections.length) return null;
  const doc=await PDFDocument.create(), font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
  for(const [title,rows,history] of sections) {
    let page,y;
    function newPage(){page=doc.addPage([612,792]);y=744;for(const [text,size] of [['MC 227 - Additional Sheet',14],[title,11],[input.participant.name,10],[`Lead case: ${input.convictions[0].caseNumber}`,10]]){page.drawText(text,{x:40,y,size,font:size>=11?bold:font});y-=20;}y-=8;}
    newPage();
    for(const [i,row] of rows.entries()) {
      const entries=[`Row ${i+5}: ${row.crime}`,`Charge code: ${row.chargeCode}`,`Date of conviction: ${datePrint(row.date)}`,`Case number: ${row.caseNumber}`,...(history?[`Earlier application disposition: ${row.disposition}`]:[])];
      const lines=entries.flatMap(t=>wrapToWidth(font,t,10,532));
      if(y-lines.length*14<64)newPage();
      for(const text of lines){page.drawText(text,{x:40,y,size:10,font});y-=14;}y-=15;
    }
  }
  preserveSourceMetadata(sourceDoc,doc);carryDates(sourceDoc,doc);
  return doc.save({useObjectStreams:false});
}

export function nextSteps(input,variant) {
  const ordinary=input.familyId===FAMILY_IDS[0];
  const serious=input.convictions.some(r=>r.category==='seriousMisdemeanor');
  const missing=['Certified copy of every conviction: NOT PROVIDED. Obtain these from the convicting court and attach each before swearing that it is attached.','Fingerprint card RI-008: NOT PROVIDED. Obtain and complete it through law enforcement.','Applicant signature and notarization: intentionally blank. Review all statements and sign before the clerk or notary.','Notice of hearing and proof of service: intentionally blank. Do not certify service until it has actually occurred.'];
  for(const k of ['ori','prno','ctntcn','sid']) if(!input.recordIdentifiers?.[k])missing.push(`${LABELS[k]}: not supplied. Obtain or confirm the appropriate entry with the convicting court; do not substitute your name or guess a number.`);
  return `# ${ordinary?'Michigan ordinary set-aside application':'Michigan first-OWI set-aside application'}\n\n${variant} | SYNTHETIC REVIEW EXAMPLE - DO NOT FILE\n\nThis packet demonstrates completion from explicit synthetic answers. It is not an eligibility determination, a signed application, certified court records, proof of mailing, or a court decision. Every statement on the official application must be true before a real participant signs it.\n\n## Components\n\nMC227 pages 1-2: application and oath. Page 3: notice of hearing and proof of service. Page 4: official instructions, preserved. An additional sheet follows only when item 1, 3 or 4 has more than four rows. No proposed order or fee-waiver form is inserted into this family.\n\n## Route\n\n${ordinary?'This family refuses first-OWI rows and maps only the ordinary application categories explicitly supplied in the input. It does not decide whether an offense is excluded.':'This family uses MC227 item 2.c, not the ordinary misdemeanor item 2.e. The entire item 2.c statement must be explicitly affirmed. It refuses ordinary, mixed-route, and multiple-OWI inputs. Clearing a court conviction does not remove it from the driving record.'} Trafficking and the special misdemeanor-marihuana route use other forms and are not handled by this packet.\n\n${historyInstructions(input)}\n## Before signing or filing\n\n${missing.map(t=>'- '+t).join('\n')}\n\nThe identifying case and charge details are synthetic transcriptions. No certified attachment or fingerprint card is bundled or claimed to exist. Do not sign MC227 item 1 until every certified copy referenced in that statement is actually attached. Do not change a negative history answer to a positive answer without updating all related rows. An absent answer is never treated as a negative answer.\n\n## Filing and mailing\n\nFile with the court of conviction; separate applications are needed for different courts. Follow the included official instructions for copies, clerk scheduling, fingerprinting and distribution. MSP processing requires $50 sent with the application packet and fingerprint card to MSP, Criminal Justice Information Center - Criminal History, PO Box 30266, Lansing, MI 48909. The relevant county, city or township prosecutor must also receive the packet. The correct prosecutor's mailing address is not supplied in this synthetic fixture and must be confirmed before mailing.\n\n**Attorney General mailing destination:** use the receiving division's current expungement-specific instructions: Office of the Attorney General, Assistance with Convictions and Expungements Division, PO Box 30217, Lansing, MI 48909. The preserved MC227 instruction 11 prints PO Box 30212; this guide follows the AG's specific receiving instructions instead of silently changing the official form. MSP's separate box is 30266. This is a primary-source instruction, not a claim of a phone inquiry or a formally amended MC227.\n\nOnly after actual mailing should the applicant complete the corresponding service checkboxes and dates and sign the proof on page 3. Keep a copy and return the completed proof as the official instructions direct. The court supplies hearing details. The hearing cannot precede receipt of the required MSP report. A routine court appearance may be part of the process; an objection, contested legal question, denial or appeal requires attorney/legal-aid handoff rather than new self-help litigation from this packet.\n\n## Victim notice and participation\n\n${ordinary ? (serious ? 'This fixture includes a serious misdemeanor. ' : '')+'For an assaultive crime or a serious misdemeanor, the prosecuting attorney notifies the victim by first-class mail to the last known address. The victim may appear and make a written or oral statement. This is the prosecutor\'s duty, not the participant\'s: do not contact the victim or certify that the prosecutor sent notice. The participant still mails the required copies to the prosecutor, AG and MSP. Preparing this branch does not assert that victim notice has occurred. ' : ''}If a victim appears or submits a written or oral statement, stop self-help advocacy and give the packet, available records and the statement or hearing notice to an attorney or legal-aid provider, even without a formal objection. Do not miss a court date; obtain advice on attending or requesting relief. An unclear assaultive/serious-misdemeanor classification also requires review rather than a guessed category.\n\n## Effects and limits of relief\n\nSetting aside a conviction does not extinguish an obligation to pay restitution; the court retains jurisdiction to enforce that obligation. Setting aside the conviction does not entitle the participant to a refund of a fine, costs, or other money paid as a consequence of the conviction. Do not promise universal erasure or an automatic change to collateral rights. ${ordinary ? '' : 'The OWI conviction remains on the driving record; a court set-aside is not removal of that driving record.'}\n\n## Fees and relief\n\nThis family contains no fee-relief selection. Do not assume a court fee waiver waives the MSP processing charge, certification charges or fingerprinting charges. A requested fee waiver is refused by this builder instead of inserting an unrelated form or inventing financial answers.\n\n## Official sources checked September 7, 2026\n\nMC227 / INST MC227, rev. 3/25, all four pages: ${FORM_URL}\n\nAG expungement instructions and FAQ: ${FAQ_URL}\n\nAG receiving-division directory: https://www.michigan.gov/ag/ag-contact-directory\n\nPrior filing versus prior relief, MCL 780.621c(3): https://www.courts.michigan.gov/4a5755/siteassets/publications/benchbooks/criminal/crimv3responsivehtml5.zip/Crimv3/Ch_3_Postappeal_Relief/Operating_While_Intoxicated__First_Violation-s801a.htm\n\nRepeat application, MCL 780.621d(5), official court checklist (2022 edition; not described as a 2026 revision): https://www.courts.michigan.gov/4a1934/siteassets/publications/benchbooks/qrms/criminal/crim-pro-posttrial/setting-aside-a-conviction-checklist.pdf\n\nVictim notice, MCL 780.621d(10), 780.772a and 780.827a: https://www.courts.michigan.gov/4a3310/siteassets/publications/benchbooks/cvrb/cvrbresponsivehtml5.zip/CVRB/Ch_7_Post-Disposition_Procedures/Victim_Impact_Statement_at_Setting_Aside_Conviction_or_Adjudication_Hearings.htm\n\nRestitution and no refund, MCL 780.622(2) and (7): https://www.courts.michigan.gov/4a3310/siteassets/publications/benchbooks/cvrb/cvrbresponsivehtml5.zip/CVRB/Ch_8_Restitution/No_Remission_of_Restitution.htm\n\nHeld PDF SHA-256: ${SOURCE_SHA}. The held bytes were recovered from an official-source acquisition artifact and matched its receipt. The current web form's revision, text and page layout were examined; a fresh web byte hash was not available.\n`;
}

export async function renderMichigan(familyId,input) {
  const source=await readSource(), prepared=await prepareProfile(familyId,input,source);
  // MC227's profile is a closed list of its own 106 fields. Generic appearance,
  // flattening, repeated-widget cleanup and active-content handling stay in the
  // existing shared sanitizer. The older hard-form host fails here on dangling
  // annotations; its existing caller in rcap-active-content already fixes that.
  const working=await PDFDocument.load(source.bytes,{updateMetadata:false});
  const form=working.getForm();ensureDefaultAppearances(form);
  const font=await working.embedFont(StandardFonts.Helvetica);
  const populated=[];
  for(const binding of prepared.profile.bindings){
    assert(!PROTECTED[binding.field],`protected MC227 write: ${binding.field}`);
    const value=prepared.values[binding.field];
    if(binding.kind==='checkbox') {assert.equal(value,true);form.getCheckBox(binding.field).check();}
    else {const field=form.getTextField(binding.field);field.setText(value);field.setFontSize(binding.fontSize);}
    populated.push({field:binding.field,value,kind:binding.kind});
  }
  const sanitized=await sanitizeAndFlatten(working,{defaultFont:font,
    writtenFields:new Set(populated.map(r=>r.field)),suppressSynthesizedAppearances:true,
    fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true});
  const rendered={report:{sourceSha256:SOURCE_SHA,populated,failed:[],overflowed:[],skippedNoFact:[],sanitizer:sanitized.report}};
  let bytes=await preserveCourtIdentity(source.doc,await sanitized.clean.save({useObjectStreams:false}));
  const additional=await continuation(source.doc,input);
  if(additional){const doc=await PDFDocument.load(bytes,{updateMetadata:false}),add=await PDFDocument.load(additional,{updateMetadata:false});for(const page of await doc.copyPages(add,add.getPageIndices()))doc.addPage(page);bytes=await preserveCourtIdentity(source.doc,await doc.save({useObjectStreams:false}));}
  return {...prepared,bytes,report:rendered.report,pageCount:(await PDFDocument.load(bytes,{updateMetadata:false})).getPageCount()};
}

export function fixturesFor(familyId) {
  const ordinary=familyId===FAMILY_IDS[0];
  const row={crime:ordinary?'Retail fraud - third degree':'Operating while intoxicated',chargeCode:ordinary?'MCL 750.356d(4)':'MCL 257.625(1)',date:'2014-03-12',caseNumber:'14-001234-SM',courtKey:'SYNTHETIC-DISTRICT-A',category:ordinary?'ordinaryMisdemeanor':'firstOwi'};
  const canonical={familyId,synthetic:true,reviewAsOf:'2026-09-07',participant:{name:'Jordan Avery Reyes',street:'125 Example Lane',cityStateZip:'Sample City, MI 49000',phone:'269-555-0147'},court:{key:row.courtKey,level:'district',number:'99th',county:'Sample',address:'100 Example Court, Sample City, MI 49000',phone:'269-555-0100'},prosecution:{kind:'state'},recordIdentifiers:{},convictions:[row],attestations:{requestAndConsent:true,noPendingCharges:true,item2:ordinary?{e:true}:{c:true}},previousSame:[],previousOther:[],deferred:{hasHistory:false},attachments:{certifiedCopies:'not_supplied',fingerprintCard:'not_supplied'},feeRelief:'not_requested'};
  if(!ordinary) canonical.attestations.noPriorFirstOwiRelief=true;
  const boundary=clone(canonical);boundary.participant={name:"Alexandria-Marguerite O'Connell-Santiago",street:'1450 North Example Terrace, Apartment 204',cityStateZip:'Sample City, MI 49000-1234',phone:'269-555-0199'};
  boundary.previousSame=ordinary?[{...row,disposition:'Denied 03/01/2017'}]:[];
  boundary.previousOther=[{crime:'Disorderly conduct',chargeCode:'MCL 750.167',category:'ordinaryMisdemeanor',date:'2003-04-15',caseNumber:'03-001200-SM',disposition:'Set aside 06/2012'}];
  boundary.deferred={hasHistory:true,description:'2001-005678-SM: marijuana possession (MCL 333.7403); MCL 333.7411 deferral; dismissed 06/15/2002.'};
  boundary.recordIdentifiers={ori:'9900000',prno:'SYN-2014-001',ctntcn:'SYN-CTN-001234',sid:'SYN-SID-001234'};
  if(ordinary){for(let i=2;i<=5;i++)boundary.convictions.push({...row,crime:`Retail fraud - third degree`,date:`201${i}-03-12`,caseNumber:`1${i}-00234${i}-SM`});}
  const out={canonical,boundary};
  if(ordinary){
    const extended=clone(boundary);
    extended.previousSame=extended.convictions.map(r=>({...r,disposition:'Denied 03/01/2017'}));
    extended.previousOther=Array.from({length:5},(_,n)=>({crime:'Disorderly conduct',chargeCode:'MCL 750.167',category:'ordinaryMisdemeanor',date:`200${n}-04-15`,caseNumber:`0${n}-00456${n}-SM`,disposition:'Set aside 06/2023'}));
    out['extended-history']=extended;
    const single=clone(canonical);single.court.level='circuit';single.court.number='99th';single.convictions[0]={...row,crime:'Larceny in a building',chargeCode:'MCL 750.360',category:'felony',caseNumber:'14-001234-FH'};single.attestations.item2={d:true};out['single-felony']=single;
    const multi=clone(single);multi.convictions.push({...single.convictions[0],caseNumber:'13-001111-FH',date:'2013-02-01'});multi.attestations.item2={a:true};out['multiple-felonies']=multi;
    const serious=clone(canonical);serious.convictions[0]={...row,crime:'Domestic assault',chargeCode:'MCL 750.81',category:'seriousMisdemeanor'};serious.attestations.item2={b:true};out['serious-misdemeanor']=serious;
    const local=clone(canonical);local.prosecution={kind:'local',name:'City of Example'};local.convictions[0].crime='Local retail fraud';local.convictions[0].chargeCode='Example Code 10-10';out['local-ordinance']=local;
    const mixed=clone(single);mixed.convictions.push({...row,caseNumber:'13-002345-SM',date:'2013-03-12'});mixed.attestations.item2={d:true,e:true};out['mixed-ordinary-categories']=mixed;
  }
  if(!ordinary){
    const denied=clone(canonical);
    denied.previousSame=[{...row,outcome:'denied',decisionDate:'2022-01-15',disposition:'Denied 01/15/2022'}];
    out['prior-denial-interval-elapsed-handoff']=denied;
    const recent=clone(denied);Object.assign(recent.previousSame[0],{decisionDate:'2025-01-15',disposition:'Denied 01/15/2025'});
    out['prior-denial-within-three-years-handoff']=recent;
    const earlier=clone(recent);Object.assign(earlier.previousSame[0],{earlierReapplyDate:'2026-08-01',disposition:'Denied 01/15/2025'});
    out['prior-denial-earlier-order-date-handoff']=earlier;
    const pending=clone(canonical);pending.previousSame=[{...row,outcome:'pending',disposition:'Application pending'}];
    out['prior-application-pending-handoff']=pending;
  }
  return out;
}

export async function runMichiganFamily(familyId) {
  const dir=path.join(ROOT,familyDir(familyId)); fs.mkdirSync(path.join(dir,'reports'),{recursive:true});
  const variants=fixturesFor(familyId),artifacts=[]; let canonical;
  const outputs=new Set();const write=(file,data)=>{fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),data);outputs.add(file);};
  for(const [name,input] of Object.entries(variants)) {
    const result=await renderMichigan(familyId,input);canonical??=result;
    write(`fixtures/${name}.pdf`,result.bytes);write(`fixtures/${name}.json`,json(input));
    write(`reports/${name}-render.json`,json({profile:result.profile,explicitFacts:result.values,geometryFits:result.fitReport,fieldLedger:result.ledger,renderer:result.report,historyTreatment:assessPriorApplications(input),artifactSha256:sha256(result.bytes),pageCount:result.pageCount}));
    write(`${name}-next-steps.md`,nextSteps(input,name));
    artifacts.push({fixture:name,variant:name,file:`${familyDir(familyId)}/fixtures/${name}.pdf`,path:`fixtures/${name}.pdf`,documents:['MC227'],sha256:sha256(result.bytes),bytes:result.bytes.length,pageCount:result.pageCount,componentCoverage:[{role:'application',sourcePages:[1,2],outputPages:[1,2]},{role:'hearing_notice_and_service',sourcePages:[3],outputPages:[3]},{role:'official_instructions',sourcePages:[4],outputPages:[4]},...(result.pageCount>4?[{role:'conditional_additional_sheet',outputPages:Array.from({length:result.pageCount-4},(_,i)=>i+5)}]:[])],fileable:false,historyTreatment:assessPriorApplications(input),missingAttachments:['certified conviction copies','RI-008 fingerprint card'],executionComplete:false});
  }
  write('participant-instructions.md',nextSteps(variants.canonical,'canonical'));
  write('source-receipt.json',json({schemaVersion:'rcap-family-source-receipt/v1',familyId,jurisdiction:'MI',documents:[{formNumber:'MC227',documentId:'MC227',sourcePath:SOURCE,sha256:SOURCE_SHA,byteLength:fs.statSync(path.join(ROOT,SOURCE)).size,pageCount:4,revision:'3/25'}],sourcePath:SOURCE,sourceSha256:SOURCE_SHA,sourceBytes:fs.statSync(path.join(ROOT,SOURCE)).size,sourcePages:4,revision:'MC227 and INST MC227 3/25',acquisitionRun:33603361022,acquisitionArtifact:9836069874,acquisitionZipSha256:'442f6164eba2d149fc495fd38d40ec82769c9f280e9bab8c7833684970427095',currentWebReview:'2026-09-07: all pages, text and revision examined; fresh web byte equality not claimed',officialUrl:FORM_URL,addressResolution:{formPrintedBox:'PO Box 30212',selectedReceivingBox:'PO Box 30217',basis:FAQ_URL,sourceFaceUnaltered:true,externalInquiryMade:false,scope:'Use receiving division current expungement-specific instruction; no formal source amendment claimed'},sourceApprovalInvented:false}));
  write('field-census.census-v1.json',json({schemaVersion:'rcap-official-form-field-census/v1-census-v1',familyId,documents:[{formNumber:'MC227',sourceSha256:SOURCE_SHA,fields:canonical.ledger}],sourceSha256:SOURCE_SHA,fields:canonical.ledger}));
  const mapRows=canonical.ledger.map(r=>{
    const row={...r,field:r.name,fieldId:r.name,sourceLabel:r.label,formNumber:'MC227',page:r.widgets[0]?.page,isSelectionControl:r.type==='PDFCheckBox',reason:r.basis};
    const tableCell=r.name.match(/^(4prev|prev)?(?:c|ch|cdate|cno|dispo)([1-4])$/);
    if(tableCell) row.fieldName=`MC227.Item${tableCell[1]==='4prev'?4:tableCell[1]==='prev'?3:1}.${r.name}.Row${tableCell[2]}`;
    if(r.disposition==='WRITTEN_FROM_EXPLICIT_FACT') row.factId=`canonical.MC227.${r.name}`;
    else if(r.disposition==='REQUIRED_BEFORE_FILING') row.requiredBeforeFiling=true;
    else if(r.disposition==='PROTECTED_FIELD') row.completenessClass=r.name==='dattyinfo'?null:['judge','proofficial','hdate','hloc','hjudge','name','notcounty','actcounty','expcom'].includes(r.name)?'court_prosecutor_clerk_or_agency_owned':'signature_or_date_participant_completion';
    if(r.disposition==='NOT_APPLICABLE_TO_SUPPLIED_SELECTION' || r.name==='dattyinfo') {
      row.completenessDisposition='NOT_APPLICABLE_ON_THIS_ROUTE';
      row.routeConditionThatMakesItInapplicable=r.name==='dattyinfo'?'Applicant is self-represented and no attorney is appointed in this fixture.':`MC227 ${r.label}: the explicit canonical answers select only the populated categories, history branches, court level and ${variants.canonical.convictions.length} conviction row(s). This alternative or unused row is not reached.`;
    }
    return row;
  });
  write('production-field-map.json',json({schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId,sourceSha256:SOURCE_SHA,syntheticReviewOnly:true,generationAllowed:false,runtimeSelectable:false,renderStrategy:'acroform_fill',maps:[{formNumber:'MC227',canonicalWrites:mapRows.filter(r=>r.disposition==='WRITTEN_FROM_EXPLICIT_FACT'),canonicalRefusals:mapRows.filter(r=>r.disposition!=='WRITTEN_FROM_EXPLICIT_FACT')}],all106FieldsClassified:true}));
  write('reports/rendered-artifacts.json',json({schemaVersion:'rcap-rendered-artifacts/v1',familyId,renderedFresh:true,centralRasterPending:true,artifacts}));
  write('packet-set-manifest.json',json({schemaVersion:'chat9-family-packet-set/v1',familyId,sourceSha256:SOURCE_SHA,artifacts,requiredBeforeSigning:['Attach actual certified copy of every conviction','Review all substantive affirmations','Complete actual oath and signature'],requiredBeforeMailing:['Obtain RI-008 and processing fee','Confirm prosecutor destination','Use AG expungement-specific PO Box 30217 destination, distinct from MSP 30266'],intentionallyExcluded:['unrelated Michigan special-route forms','proposed judicial order','unselected fee-relief forms'],independentReview:'PENDING_CHAT10',centralRaster:'PENDING_A',terminalAccounting:'UNCHANGED'}));
  write('approval-request.json',json({schemaVersion:'rcap-family-approval-request/v1',familyId,status:'PENDING_INDEPENDENT_REVIEW',approved:false,generationAllowed:false,runtimeSelectable:false,requestedReviewer:'Chat 10',centralRaster:'PENDING_A',remainingRequirements:['Confirm actual prosecutor destination and any applicable denial-order restrictions','Actual certified records and participant execution for a real filing']}));
  write('build-status.json',json({familyId,status:'BUILT_SYNTHETIC_REVIEW_CANDIDATES',fullRendererExecuted:true,independentVerificationStatus:'PENDING',generationAllowed:false,runtimeSelectable:false,productionTouched:false,selfApproval:false,remaining:['Chat 10 independent review','A integration and central raster','Confirm actual prosecutor destination and any applicable denial-order restrictions','Participant attachments and execution for any real filing']}));
  // Deterministic inventory includes every generated family file, not just PDFs.
  write('generated-files.json',json([...outputs].sort()));
  const hashes=Object.fromEntries([...outputs].sort().map(file=>[file,sha256(fs.readFileSync(path.join(dir,file)))]));
  return {familyId,directory:familyDir(familyId),artifacts,generatedFiles:hashes};
}
