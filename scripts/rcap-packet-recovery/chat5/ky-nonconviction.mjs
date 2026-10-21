/** Exact Kentucky AOC-497.2 petition and optional AOC-497 proposed-order adapter.
 * Shared geometry, appearances, sanitation and deterministic stamping are reused,
 * not forked. The charge-specific alternatives implement adopted Q-003 (8/28).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument, PDFTextField, PDFDropdown, PDFCheckBox, PDFName, PDFString, StandardFonts} from 'pdf-lib';
import {fitTextToWidget, applyFitToTextField, wrapToWidth} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {ensureDefaultAppearances, sanitizeAndFlatten, scanBytesForActiveContent} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import {stampDeterministic} from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const FAMILY='ky_nonconviction_expungement-set';
export const ROUTE='obligation:track-pathway:KY:ky_nonconviction_expungement:nonconviction-431076';
export const OUT='data/rcap-all50/overlays/census-v1/ky/ky-nonconviction-expungement-set--official-pdf-fill';
export const SOURCES={
 'AOC-497.2':{path:'reference/chat-parallel-2026-09-07/chat5/AOC-497.2.pdf',sha256:'080acd68f99ff84afb9b1d08721b5dbff516b8531f0ce53ca7ffc030e80f19e4',byteLength:159169,pages:2,fields:29,url:'https://www.kycourts.gov/Legal-Forms/Legal%20Forms/497.2.pdf'},
 'AOC-497':{path:'reference/chat-parallel-2026-09-07/chat5/AOC-497.pdf',sha256:'715c00db62e19f07f7dedde68e89309027f4ed9566198a3617cb9bb34a98368b',byteLength:176877,pages:2,fields:32,url:'https://www.kycourts.gov/Legal-Forms/Legal%20Forms/497.pdf'}
};
export const BASIS_FIELDS={acquittal:'check acquitted charges',dismissed_with_prejudice:'check chgs dismissed',felony_without_prejudice:'check dismissed without',misdemeanor_without_prejudice:'check felony chg',no_indictment:'check no current chg'};
export const BASIS_LABELS={acquittal:'Acquittal',dismissed_with_prejudice:'Dismissal with prejudice',felony_without_prejudice:'Felony dismissal without prejudice',misdemeanor_without_prejudice:'Misdemeanor dismissal without prejudice',no_indictment:'Felony held to grand jury; no indictment or information'};
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const clone=structuredClone;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const displayDate=v=>v?`${v.slice(5,7)}/${v.slice(8,10)}/${v.slice(0,4)}`:'';
const addDays=(v,n)=>new Date(Date.parse(v+'T00:00:00Z')+86400000*n).toISOString().slice(0,10);
function shiftMonths(v,n){const d=new Date(v+'T00:00:00Z');const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();if(day>max)throw Error('CALENDAR_ANNIVERSARY_REVIEW: confirm end-of-month statutory date');d.setUTCDate(day);return d.toISOString().slice(0,10);}
function date(v,label,asOf){if(typeof v!=='string'||!dateRe.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('INVALID_DATE: '+label);if(asOf&&v>asOf)throw Error('FUTURE_CASE_FACT: '+label);return v;}
const textMissing=(field,reason,value=null,kind='required_before_filing')=>({field,reason,heldValue:value,kind,requiredBeforeFiling:kind==='required_before_filing'});
function requireBoolean(value,expected,label,missing){if(value===null||value===undefined)missing.push(textMissing(label,'This answer is not held. Confirm it against the actual case record before signing or checking the related statement.'));else if(value!==expected)throw Error('CONDITION_NOT_MET: '+label);}
export function validateKy(input){
 const f=clone(input),missing=[];assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');date(f.asOf,'asOf');if(f.asOf>'2026-09-07')throw Error('AUTHORITY_REVALIDATION_REQUIRED');
 if(!['District','Circuit'].includes(f.court?.level))throw Error('COURT_LEVEL_REQUIRED');
 if(typeof f.options?.includeProposedOrder!=='boolean')throw Error('EXPLICIT_COMPONENT_ELECTION_REQUIRED');
 if(f.options.includeProposedOrder&&!f.options.localOrderPracticeConfirmed)throw Error('ORDER_CONDITION_NOT_CONFIRMED');
 if(f.signature||f.notary||f.judicialFindings||f.clerkService||f.agencyCertification||f.participant?.signature||f.participant?.signatureDate)throw Error('PROTECTED_EXECUTION_INPUT');
 // SSNs are deliberately completed privately with the clerk, not persisted in
 // generated fixture facts or casually printed on an unredacted filing copy.
 if(f.participant?.ssn)throw Error('PRIVATE_IDENTIFIER_MANUAL_COMPLETION');
 if(f.participant?.dob)date(f.participant.dob,'birthdate',f.asOf);
 if(f.case?.arrestDate)date(f.case.arrestDate,'arrest/violation',f.asOf);
 if(f.participant?.dob&&f.case?.arrestDate&&f.participant.dob>f.case.arrestDate)throw Error('INCONSISTENT_DOB');
 if(!Array.isArray(f.charges)||!f.charges.length)throw Error('CHARGES_REQUIRED');
 if(f.charges.length>100)throw Error('EXCESSIVE_CHARGE_COUNT');
 if(!Array.isArray(f.agencies)||!f.agencies.length)missing.push(textMissing('Agency list','Identify the arresting agency, any jail, and every other government custodian with records; include their mailing addresses.'));
 requireBoolean(f.confirmations?.allCaseChargesAccounted,true,'All charges in this criminal case are accounted for',missing);
 requireBoolean(f.confirmations?.venueConfirmed,true,'Filing court and case number confirmed',missing);
 if(f.confirmations?.immigrationAdviceNeeded===true||f.confirmations?.ambiguousDismissal===true||f.confirmations?.wantsAppellateSealing===true||f.confirmations?.expectsDcbsExpungement===true)throw Error('SELF_HELP_STOP: individualized assistance required');
 const seen=new Set(),eligibility=[];
 for(const [i,ch] of f.charges.entries()){
  if(typeof ch.count!=='string'||!ch.count.trim()||seen.has(ch.count))throw Error('UNIQUE_CHARGE_COUNT_REQUIRED');seen.add(ch.count);
  if(typeof ch.description!=='string'||!ch.description.trim()||/^(tbd|unknown|see attached|enter |insert |test prose)/i.test(ch.description))throw Error('ACTUAL_CHARGE_DESCRIPTION_REQUIRED');
  if(!BASIS_FIELDS[ch.basis])throw Error('WRONG_INSTRUMENT_OR_DISPOSITION');
  if(ch.caseNumber!==f.case.number)throw Error('SEPARATE_PETITION_PER_CASE');
  if(!['felony','misdemeanor'].includes(ch.chargeClass))throw Error('CHARGE_CLASS_REQUIRED');
  const own=[];let first=null;
  requireBoolean(ch.factsConfirmed,true,`Count ${ch.count}: disposition and charge facts verified`,own);
  if(ch.basis==='no_indictment'){
   if(ch.chargeClass!=='felony'||f.court.level!=='District')throw Error('NO_INDICTMENT_DISTRICT_FELONY_ONLY');
   requireBoolean(ch.originallyDistrict,true,`Count ${ch.count}: originally filed in District Court`,own);
   requireBoolean(ch.indictmentIssued,false,`Count ${ch.count}: no indictment`,own);
   requireBoolean(ch.informationFiled,false,`Count ${ch.count}: no information`,own);
   if(ch.grandJuryHoldDate){date(ch.grandJuryHoldDate,'grand jury hold',f.asOf);if(f.case.arrestDate&&ch.grandJuryHoldDate<f.case.arrestDate)throw Error('HOLD_BEFORE_ARREST');first=shiftMonths(ch.grandJuryHoldDate,6);}else own.push(textMissing(`Count ${ch.count}: grand jury hold date`,'Use the actual District Court decision date, not the arrest date.'));
  }else{
   requireBoolean(ch.alreadyExpunged,false,`Count ${ch.count}: record not already expunged`,own);
   if(ch.basis!=='acquittal')requireBoolean(ch.pleaExchange,false,`Count ${ch.count}: dismissal was not exchanged for a guilty plea`,own);
   if(ch.basis==='felony_without_prejudice'&&ch.chargeClass!=='felony')throw Error('CHARGE_CLASS_DISPOSITION_MISMATCH');
   if(ch.basis==='misdemeanor_without_prejudice'&&ch.chargeClass!=='misdemeanor')throw Error('CHARGE_CLASS_DISPOSITION_MISMATCH');
   if(ch.dispositionDate){date(ch.dispositionDate,'disposition',f.asOf);if(f.case.arrestDate&&ch.dispositionDate<f.case.arrestDate)throw Error('ARREST_AFTER_DISPOSITION');first=['acquittal','dismissed_with_prejudice'].includes(ch.basis)?addDays(ch.dispositionDate,60):shiftMonths(ch.dispositionDate,ch.basis==='felony_without_prejudice'?36:12);}
   else own.push(textMissing(`Count ${ch.count}: disposition date`,'Use the actual order date to verify the waiting period.'));
   if(['acquittal','dismissed_with_prejudice'].includes(ch.basis)&&ch.dispositionDate>='2020-07-15')requireBoolean(ch.automaticStatusChecked,true,`Count ${ch.count}: automatic-expungement status checked`,own);
  }
  if(first&&first>f.asOf)throw Error('WAIT_NOT_MET: count '+ch.count+' first '+first);
  eligibility.push({count:ch.count,basis:ch.basis,firstOrdinaryFilingDate:first,maySelect:!own.length});missing.push(...own);
 }
 const selectable=missing.length?[]:[...new Set(eligibility.filter(e=>e.maySelect).map(e=>e.basis))];
 return {facts:f,missing,eligibility,selectable};
}
const fixtureBase={isSyntheticFixture:true,asOf:'2026-09-07',routeKey:ROUTE,
 participant:{fullName:'Jordan Avery Reyes',dob:'1988-02-17',street:'42 Larkspur Street',cityStateZip:'Lexington, KY 40507',phoneArea:'859',phoneLocal:'555-0142'},
 court:{level:'District',county:'Fayette',division:'Criminal',address:'150 N. Limestone, First Floor, Lexington, KY 40507',phone:'859-246-2228',directoryUrl:'https://www.kycourts.gov/Courts/County-Information/Pages/Fayette-District.aspx'},
 case:{number:'19-M-000001',arrestDate:'2019-01-10'},
 options:{includeProposedOrder:false,localOrderPracticeConfirmed:false},
 confirmations:{allCaseChargesAccounted:true,venueConfirmed:true,agencyListComplete:true},
 charges:[{count:'1',caseNumber:'19-M-000001',description:'Criminal trespass, third degree',chargeClass:'misdemeanor',basis:'dismissed_with_prejudice',dispositionDate:'2019-04-02',pleaExchange:false,alreadyExpunged:false,factsConfirmed:true}],
 agencies:[{name:'Kentucky State Police',address:'1266 Louisville Road, Frankfort, KY 40601',role:'arresting agency'}]
};
// A third-degree criminal trespass is a violation. Use a real misdemeanor
// description in all generated QA cases instead of changing the legal class.
fixtureBase.charges[0].description='Criminal trespass, second degree';
export function kyFixture(basis='dismissed_with_prejudice',order=false){
 const f=clone(fixtureBase);f.options={includeProposedOrder:order,localOrderPracticeConfirmed:order};const c=f.charges[0];c.basis=basis;
 if(basis==='felony_without_prejudice'){c.chargeClass='felony';c.description='Criminal mischief, first degree';f.court.level='Circuit';f.court.address='120 N. Limestone, Suite C-103, Lexington, KY 40507';f.court.phone='859-246-2224';f.court.directoryUrl='https://www.kycourts.gov/Courts/County-Information/Fayette/Pages/Fayette-Circuit.aspx';f.case.number='19-CR-000001';c.caseNumber=f.case.number;}
 if(basis==='no_indictment'){f.case.number='26-F-000001';f.case.arrestDate='2026-01-10';Object.assign(c,{caseNumber:f.case.number,description:'Criminal mischief, first degree',chargeClass:'felony',originallyDistrict:true,grandJuryHoldDate:'2026-03-07',indictmentIssued:false,informationFiled:false});delete c.dispositionDate;delete c.pleaExchange;delete c.alreadyExpunged;}
 return f;
}
export function fixtures(){
 const r={canonical:kyFixture(),boundary:kyFixture('acquittal',true)};
 r.boundary.participant={...r.boundary.participant,fullName:"María-Alejandra O'Shaughnessy",street:'1188 Upper Coastal Crossing Road, Apt 14B',cityStateZip:'Lexington, KY 40507-2214',phoneLocal:null};
 const b=r.boundary;b.case.arrestDate='2019-01-10';
 b.charges=[['Criminal trespass, second degree','acquittal'],['Disorderly conduct, second degree','dismissed_with_prejudice'],['Harassment','misdemeanor_without_prejudice'],['Menacing','acquittal'],['Criminal mischief, third degree','dismissed_with_prejudice'],['Resisting arrest','misdemeanor_without_prejudice'],['Criminal trespass, first degree','dismissed_with_prejudice']].map(([description,basis],i)=>({...clone(fixtureBase.charges[0]),count:String(i+1),description,basis,caseNumber:b.case.number,dispositionDate:i%2?'2019-04-03':'2019-04-02'}));
 for(const basis of Object.keys(BASIS_FIELDS))for(const order of [false,true])r[`selectable/${basis}${order?'-with-order':''}`]=kyFixture(basis,order);
 const auto=kyFixture('acquittal');auto.charges[0].dispositionDate='2026-07-09';auto.charges[0].automaticStatusChecked=true;auto.case.arrestDate='2026-02-01';auto.case.number='26-M-000002';auto.charges[0].caseNumber=auto.case.number;r['selectable/automatic-missed-exact-60-days']=auto;
 return r;
}
function sourceBytes(id,provided){const s=SOURCES[id],b=provided??fs.readFileSync(path.join(ROOT,s.path));assert.equal(b.length,s.byteLength,'SOURCE_LENGTH_DRIFT');assert.equal(sha256(b),s.sha256,'SOURCE_HASH_DRIFT');return b;}
async function official(id,review,provided){
 const f=review.facts,s=SOURCES[id],pdf=await PDFDocument.load(sourceBytes(id,provided),{updateMetadata:false});assert.equal(pdf.getPageCount(),s.pages,'SOURCE_PAGE_DRIFT');
 const form=pdf.getForm(),font=await pdf.embedFont(StandardFonts.Helvetica);ensureDefaultAppearances(form);
 try{font.encodeText(JSON.stringify(f));}catch{throw Error('UNSUPPORTED_TEXT_ENCODING: preserve original spelling; no partial packet emitted');}
 const fields=form.getFields();assert.equal(fields.length,s.fields,'SOURCE_CENSUS_DRIFT');
 const pageOf=w=>pdf.getPages().findIndex(p=>p.ref===w.P())+1;
 const census=fields.map(h=>({field:h.getName(),type:h.constructor.name,widgets:h.acroField.getWidgets().map(w=>({page:pageOf(w),rect:w.getRectangle()}))}));
 const written=new Set(),writes=[],blanks=[];
 const put=(field,value,factId,{optional=false,multiline=false,attachmentFallback=null}={})=>{
  const h=form.getField(field);assert(h instanceof PDFTextField||h instanceof PDFDropdown,'BAD_TEXT_MAPPING');
  if(value===null||value===undefined||value===''){blanks.push({...textMissing(field,optional?'Not applicable or not supplied; this optional blank is intentional.':'The accurate value is not held. Complete it from the case record or your contact information before filing.',null,optional?'optional_blank':'required_before_filing'),documentId:id});return;}
  assert.equal(typeof value,'string','FIELD_VALUE_NOT_TEXT');
  const widgets=h.acroField.getWidgets();if(multiline&&h instanceof PDFTextField)h.enableMultiline();
  let v=value,fit;
  for(const pass of [0,1]){
   const fits=widgets.map(w=>fitTextToWidget({font,text:v,rect:w.getRectangle(),multiline,maxFontSize:10,minFontSize:7,evaluateDeclaredMinimumSize:true}));
   fit=fits.find(x=>x.outcome==='refused')??fits.reduce((a,b)=>a.fontSize<=b.fontSize?a:b);
   if(fit.outcome!=='refused')break;
   if(pass===0&&attachmentFallback)v=attachmentFallback;
   else{blanks.push({...textMissing(field,'The complete value does not fit at the readable minimum and was not truncated. Complete held value is disclosed in the instructions.',value),documentId:id});return;}
  }
  if(h instanceof PDFDropdown){if(!h.getOptions().includes(v))throw Error('COUNTY_NOT_IN_OFFICIAL_FORM');h.select(v);h.setFontSize(fit.fontSize);}else applyFitToTextField(h,fit);
  for(const w of widgets)w.dict.set(PDFName.of('DA'),PDFString.of(`/Helv ${fit.fontSize} Tf 0 g`));
  written.add(field);writes.push({documentId:id,field,kind:'held_text',factId,value:v,...(v!==value?{completeValueOnSchedule:value}:{}),fontSize:fit.fontSize,widgets:widgets.map(w=>({page:pageOf(w),rect:w.getRectangle()}))});
 };
 const petition=id==='AOC-497.2';
 const map={Court:f.court.level,[petition?'County':'County dropdown']:f.court.county,Division:f.court.division,NAME:f.participant.fullName,ADDRESS:f.participant.street,address2:f.participant.cityStateZip,[petition?'area':'area code']:f.participant.phoneArea,'phone number':f.participant.phoneLocal,'Jail ID Number':f.participant.jailId,'Defendants Birthdate':displayDate(f.participant.dob),'ViolationArrest Date':displayDate(f.case.arrestDate),[petition?'Case  No':'Case No']:f.case.number};
 for(const [field,value]of Object.entries(map))put(field,value,field,{optional:field==='Jail ID Number'||field==='Division'});
 // Both official sources ask for SSN; neither labels it optional. Do not invent
 // one, store it in test inputs, or assert a confidential submission occurred.
 blanks.push({documentId:id,field:petition?'Defendants SSN':'ssn',kind:'private_identifier_manual_completion',requiredBeforeFiling:true,reason:'Social Security number is not held. Ask the clerk how to provide it securely and whether the filing copy must be redacted. Complete the required identifier privately; do not use a made-up number.'});
 for(let i=0;i<Math.min(f.charges.length,6);i++){
  const ch=f.charges[i],field=i?'CHARGE_'+(i+1):'CHARGE';
  put(field,i===5&&f.charges.length>6?'Counts 6 onward: see attached schedule':`Ct ${ch.count}: ${ch.description}`,'charges.'+i+'.description',{attachmentFallback:`Count ${ch.count}: see attached schedule`});
 }
 if(petition){
  for(const basis of review.selectable){const field=BASIS_FIELDS[basis],h=form.getField(field);assert(h instanceof PDFCheckBox);h.check();written.add(field);writes.push({documentId:id,field,kind:'explicit_selection',value:true,chargeCounts:review.eligibility.filter(x=>x.basis===basis).map(x=>x.count),widgets:h.acroField.getWidgets().map(w=>({page:pageOf(w),rect:w.getRectangle()}))});}
  if(!review.selectable.length)blanks.push({documentId:id,...textMissing('Disposition selections','No eligibility checkbox was marked because one or more required case facts are unknown. Resolve them before signing.')});
  put('multiple agencies','See attached charge and agency schedule.','attachment.agencies',{multiline:true});
 }else{
  put('requiring expungement','See attached charge and agency schedule.','attachment.agencies',{multiline:true});
  assert(!writes.some(x=>x.kind==='explicit_selection'),'JUDICIAL_SELECTION_WRITTEN');
 }
 blanks.push({documentId:id,field:petition?'Participant signature/date and notary or clerk jurat':'Judicial findings, order selections, judge/date and agency certification',kind:petition?'signature_or_date_participant_completion':'court_clerk_agency_owned',requiredBeforeFiling:petition,reason:petition?'Sign and date personally before the notary or Circuit Court Clerk; the witness completes the jurat. No execution has occurred.':'Reserved for the court and record custodians. Do not mark, sign or date these sections.'});
 const protectedFields=fields.filter(h=>!written.has(h.getName())).map(h=>h.getName());
 const sanitized=await sanitizeAndFlatten(pdf,{defaultFont:font,writtenFields:written,detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true,preserveUnwrittenSelectionBackgrounds:true});
 preserveSourceMetadata(pdf,sanitized.clean);stampDeterministic(sanitized.clean);
 const bytes=Buffer.from(await sanitized.clean.save({useObjectStreams:false}));const scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_REMAINS');
 return {bytes,writes,blanks,census,protectedFields,sanitation:sanitized.report};
}
async function appendKyPages(pdf,sections,f,role){
 const font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);const first=pdf.getPageCount();let page,y=0;
 const next=(title)=>{page=pdf.addPage([612,792]);y=732;page.drawText(title,{x:42,y,size:15,font:bold});y-=25;const sub=role==='continuation'?`Case ${f.case.number} | ${f.participant.fullName??'Name not supplied'}`:(f.isSyntheticFixture?'SYNTHETIC QA EXAMPLE - DO NOT FILE':'PARTICIPANT INSTRUCTIONS - KEEP, DO NOT FILE');for(const line of wrapToWidth(font,sub,9,528)){page.drawText(line,{x:42,y,size:9,font});y-=13;}y-=12;page.drawText(`${role==='continuation'?'Attachment to AOC-497.2':'Kentucky KRS 431.076 instructions'} | ${pdf.getPageCount()-first}`,{x:42,y:28,size:8,font});};
 for(const [title,paragraphs]of sections){next(title);for(const p of paragraphs){const lines=wrapToWidth(font,p,10,528);if(y-lines.length*14<54&&lines.length*14<600)next(title+' (continued)');for(const line of lines){if(y<54)next(title+' (continued)');assert(font.widthOfTextAtSize(line,10)<=528.1,'TEXT_OVERFLOW');page.drawText(line,{x:42,y,size:10,font});y-=14;}y-=10;}}
 return {firstPage:first+1,pageCount:pdf.getPageCount()-first};
}
function instructions(review,blanks){const f=review.facts,m=[...review.missing,...blanks.filter(x=>x.requiredBeforeFiling)];const noIndict=f.charges.some(x=>x.basis==='no_indictment');return [
 ['Kentucky: review, complete and sign',[
  'This packet uses the actual two-page AOC-497.2 petition, Rev. 7-20. The charge and agency schedule is a filing attachment. Keep these instruction pages; do not file them.',
  f.options.includeProposedOrder?'The optional two-page AOC-497 proposed order is included because you confirmed that the local clerk expects one. Its findings, grant/denial, date, judge signature and agency certification remain blank. It is not an entered court order.':'A proposed order was not selected. Ask the clerk whether local practice expects AOC-497; if so, obtain the complete with-order version rather than drawing an order yourself.',
  'One petition is required for each criminal case. Compare every charge, count, classification, disposition and date in the schedule to the actual case record. Different charges can support different checkboxes. Check only the predicates established by the listed charges, not all boxes merely because they are printed.',
  'Get the acquittal/dismissal order or District Court grand-jury-hold order from the Circuit Court Clerk. For a missing indictment, check both the indictment and information status. An unresolved or ambiguous dismissal is not a dismissal with prejudice.',
  ...m.map(x=>`${x.documentId?x.documentId+' / ':''}${x.field}: ${x.reason}${x.heldValue?' Complete held value: '+x.heldValue:''}`),
  'Do not sign in advance. Take the complete petition and its charge/agency attachment to a notary or the Circuit Court Clerk and sign and date in that person\'s presence. The witness completes the notary/clerk block. The software has not performed a notarization or signing.',
  'Leave the For Clerk Use Only certificate on petition page 2 blank. Leave every finding, grant/denial box, judge/date line and agency certification on any proposed order blank. Never sign or certify for another actor.',
  'Personal identifiers may need confidential or redacted handling. Ask the clerk how to supply your SSN and whether the filing copy needs redaction before making copies or mailing. Keep accurate private records; do not put a made-up SSN on a petition.'
 ]],
 ['File and follow the result',[
  `Filing destination: Office of Circuit Court Clerk for ${f.court.county} County, ${f.court.level} Court. ${f.court.address??'Confirm the exact clerk address.'} Clerk telephone: ${f.court.phone??'Use the official directory.'}`,
  'For acquittal or dismissal, use the court that entered the disposition. For failure to indict, use the District Court where the felony charge was originally filed. Confirm the court, division, number of copies and mail instructions with that clerk. Do not send a petition to the AOC certification office or the county recording clerk.',
  'Filing fee: $0. No expungement eligibility certification and no certification payment are required for this KRS 431.076 nonconviction petition. A fee-waiver motion is unnecessary for a free filing. If asked to pay a conviction fee, identify KRS 431.076 and the Kentucky Department of Public Advocacy nonconviction guidance and ask the clerk to check the fee classification.',
  'Keep a complete copy, file the witnessed petition with all its filing attachments, and request a filed/stamped copy or receipt. In-person filing or mailing to the proper clerk is available; confirm delivery and postage locally. Do not assume general email submission is accepted. Any copy, mailing or optional notary expense is separate from the zero filing fee.',
  noIndict?'SERVICE / NO INDICTMENT: ask the clerk to send the petition to BOTH the county attorney and Commonwealth\'s attorney offices that prosecuted the case. The clerk handles the certificate; you do not pre-certify service. Keep the filing date. A response is due within 90 days after filing. With no response, the statute directs dismissal and expungement after that period; with a response, the statutory 90-day period runs from the response, and the no-indictment condition must still hold. A filed petition is not proof of expungement.':'SERVICE: the clerk sends the petition to you or your attorney and the appropriate County/Commonwealth\'s Attorney. Ask the clerk to confirm routing and retain the filed copy. Do not complete the clerk\'s service certificate yourself.',
  'A qualifying post-July 15, 2020 acquittal or all-charge dismissal with prejudice may already have been automatically expunged after 30 days. Verify whether that occurred before making an unnecessary petition. A petition fallback under this form waits at least 60 days; the automatic 30-day point does not shorten that printed petition requirement.',
  'Keep every notice and attend any required hearing. If the prosecutor contests the facts, an indictment/information appears, prejudice status or a plea bargain is disputed, or the court requires briefing, stop the automated self-help path and promptly obtain legal assistance. Do not ignore a hearing or response deadline.',
  'After an order is entered, each ordered agency must certify compliance to the court within 60 days. Ask the clerk whether the certifications arrived. Check the actual court and agency records; a proposed order or filed petition is not an expungement. Keep the order and prior case records securely.',
  'This statute does not clear Department for Community Based Services records. Appellate-record sealing, immigration consequences and disputes about what records must be cleared need individualized legal help. Contact Clean Slate Kentucky / Department of Public Advocacy using the official resources below.'
 ]],
 ['Official references and case-specific timing',[
  ...review.eligibility.map(x=>`Count ${x.count}: ${BASIS_LABELS[x.basis]}. Earliest ordinary filing date from the held facts: ${x.firstOrdinaryFilingDate?displayDate(x.firstOrdinaryFilingDate):'not established; missing facts must be resolved'}.`),
  'Authority: KRS 431.076(1)-(4), (5)-(8). Official source forms: AOC-497.2 and AOC-497, Rev. 7-20. The form\'s five predicates are charge-specific alternatives; the adopted LegalEase decision Q-003 (August 28, 2026) requires the attached charge/disposition mapping.',
  'https://apps.legislature.ky.gov/law/statutes/statute.aspx?id=50191',
  'https://dpa.ky.gov/kentucky-department-of-public-advocacy/findhelp/expungement/',
  'https://www.kycourts.gov/AOC/Information-and-Technology/Pages/Expungement.aspx',
  f.court.directoryUrl??'https://www.kycourts.gov/Courts/County-Information/Pages/default.aspx',
  'Primary sources checked September 7, 2026. The retained source bytes were acquired September 4 and hash-verified again for this build. This is form preparation and instructions, not representation or a guaranteed result.'
 ]]
];}
export async function renderKy(input,sourceOverrides={}){
 const review=validateKy(input),f=review.facts,primary=await official('AOC-497.2',review,sourceOverrides['AOC-497.2']);
 const pdf=await PDFDocument.load(primary.bytes,{updateMetadata:false});const records=[{documentId:'AOC-497.2',role:'primary_filing',firstPage:1,pageCount:2,sourceSha256:SOURCES['AOC-497.2'].sha256}];
 const schedule=[['Charge and agency schedule',[
  'Attachment to the petition in the identified criminal case. It also identifies the charges and agencies in the tendered AOC-497 when that optional component is included. No judicial finding or completed expungement is stated here.',
  ...f.charges.map(c=>`Count ${c.count}: ${c.description}. Classification: ${c.chargeClass}. ${BASIS_LABELS[c.basis]}. ${c.basis==='no_indictment'?'District Court hold date: '+(displayDate(c.grandJuryHoldDate)||'NOT SUPPLIED'):'Disposition order date: '+(displayDate(c.dispositionDate)||'NOT SUPPLIED')}.`),
  'Agencies and mailing addresses (identify all custodians, including any arresting agency and jail):',
  ...(f.agencies?.length?f.agencies.map((a,i)=>`${i+1}. ${a.name??'AGENCY NAME NOT SUPPLIED'}; ${a.address??'MAILING ADDRESS NOT SUPPLIED'}${a.role?'; role: '+a.role:''}.`):['Agency names and addresses have not been supplied. Complete this list before filing.'])
 ]]];
 const attached=await appendKyPages(pdf,schedule,f,'continuation');records.push({documentId:'charge-agency-schedule',role:'filing_attachment',...attached});
 const parts=[primary];
 if(f.options.includeProposedOrder){const order=await official('AOC-497',review,sourceOverrides['AOC-497']);const d=await PDFDocument.load(order.bytes,{updateMetadata:false});const pages=await pdf.copyPages(d,d.getPageIndices());const firstPage=pdf.getPageCount()+1;pages.forEach(p=>pdf.addPage(p));records.push({documentId:'AOC-497',role:'proposed_order',firstPage,pageCount:2,sourceSha256:SOURCES['AOC-497'].sha256});parts.push(order);}
 const blanks=parts.flatMap(x=>x.blanks);for(const [i,a] of (f.agencies??[]).entries())for(const k of ['name','address'])if(!a[k])blanks.push(textMissing('Agency '+(i+1)+' '+k,'Obtain the actual record custodian name and address before filing.'));
 if(f.confirmations.agencyListComplete!==true)blanks.push(textMissing('Complete agency list','Confirm that all known government record custodians have been included.'));
 const guide=instructions(review,blanks),gp=await appendKyPages(pdf,guide,f,'instructions');records.push({documentId:'participant-instructions',role:'participant_instructions',...gp});
 stampDeterministic(pdf);const bytes=Buffer.from(await pdf.save({useObjectStreams:false})),scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_REMAINS');
 return {bytes,sha256:sha256(bytes),pageCount:pdf.getPageCount(),componentPages:records,writes:parts.flatMap(x=>x.writes),blanks:[...review.missing,...blanks],eligibility:review.eligibility,selectedBases:review.selectable,sourceCensuses:Object.fromEntries(parts.map((x,i)=>[i?'AOC-497':'AOC-497.2',x.census])),sanitation:parts.map(x=>x.sanitation),guide,schedule,activeContentScan:scan};
}
export async function runKy({outDir=path.join(ROOT,OUT),inputFile=null}={}){
 if(inputFile&&path.resolve(outDir)===path.join(ROOT,OUT))throw Error('CUSTOM_INPUT_REQUIRES_ISOLATED_OUTPUT');
 const all=inputFile?{supplied:JSON.parse(fs.readFileSync(inputFile,'utf8'))}:fixtures(),pdfs=[];let censuses={};
 for(const [fixture,f]of Object.entries(all)){
  const r=await renderKy(f),rel=`fixtures/${fixture}.pdf`;const target=path.join(outDir,rel);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,r.bytes);fs.writeFileSync(target.replace(/\.pdf$/,'.facts.json'),json(f));
  const report={schemaVersion:'chat5-ky497-author-build/v1',familyId:FAMILY,fixture,inputSha256:sha256(Buffer.from(json(f))),output:{file:OUT+'/'+rel,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount},componentPages:r.componentPages,writes:r.writes,blanks:r.blanks,eligibility:r.eligibility,selectedBases:r.selectedBases,sanitation:r.sanitation,activeContentScan:r.activeContentScan,independentReview:'PENDING',centralRaster:'PENDING'};
  const rp=path.join(outDir,`reports/${fixture}.json`);fs.mkdirSync(path.dirname(rp),{recursive:true});fs.writeFileSync(rp,json(report));pdfs.push({fixture,...report.output,componentPages:r.componentPages});Object.assign(censuses,r.sourceCensuses);
  if(fixture==='canonical'){fs.writeFileSync(path.join(outDir,'participant-instructions.md'),r.guide.map(([t,ps])=>'## '+t+'\n\n'+ps.join('\n\n')).join('\n\n')+'\n');}
 }
 fs.writeFileSync(path.join(outDir,'official-field-census.json'),json(censuses));
 fs.writeFileSync(path.join(outDir,'reports/rendered-artifacts.json'),json({schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,pdfs,renderedFresh:true,derivedFromBytes:true,everyPageRastered:false,independentVerificationPending:true}));
 fs.writeFileSync(path.join(outDir,'production-field-map.json'),json({schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY,routeKeys:[ROUTE],componentSet:['AOC-497.2','charge-agency-schedule','AOC-497 (conditional)','participant-instructions'],sourceCensuses:censuses,dispositionMap:BASIS_FIELDS,chargeSpecificAlternatives:true,adoptedDecision:{path:'data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json',question:'Q-003',holdingSha256:'69721add81d33235aead4dbedb458b1aff61240d3eee22c5013cc196a40e256d'},protected:{petition:'All execution/notary/clerk certificate regions except repeated case caption',order:'All findings/other finding text, grant/denial, execution and certification regions'},generationAllowed:false,runtimeSelectable:false}));
 fs.writeFileSync(path.join(outDir,'source-receipt.json'),json({schemaVersion:'chat5-held-official-source/v1',familyId:FAMILY,sources:SOURCES,acquisition:{runId:33866926858,artifactId:9934370357,sha256:'7e30f1b2e49c6fa47714b24c18d88cd764e554fe22a6072bd6faf429fef0f813',byteLength:16154170,metadataDigestMatched:true,memberHashesMatched:true},sourceFaceComparedToLiveIssuerOn:'2026-09-07',liveIssuerBinaryDigestIndependentlyMeasured:false,noFilingFee:true,noEligibilityCertificate:true,privateSsnManualCompletion:true}));
 fs.writeFileSync(path.join(outDir,'build-status.json'),json({familyId:FAMILY,status:'BUILT_RASTER_PENDING',independentVerificationStatus:'PENDING',authorQaOnly:true,renderedArtifacts:pdfs.length,generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0,productionTouched:false,manualExecutionAndPrivateIdentifierCompletionRequired:true}));
 return pdfs;
}
