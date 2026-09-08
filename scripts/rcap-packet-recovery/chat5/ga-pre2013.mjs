/** Georgia's exact pre-2013 GCIC application, not a newer prosecutor-only route.
 * This source-specific adapter uses shared fitting, sanitization and date code.
 * The measured allowlist is ONLY Section One on PDF page 2. It does not change
 * the general semantic binder's protections or any shared packet host.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument, StandardFonts, rgb} from 'pdf-lib';
import {fitTextToWidget, wrapToWidth} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten, scanBytesForActiveContent} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import {extractTextItems} from '../../rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import {stampDeterministic} from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const FAMILY='ga-nonconv-pre2013-set';
export const ROUTE='obligation:track-pathway:GA:ga-nonconv-pre2013:non-conviction-record-restriction-through-the-agency-prosecutor-process';
export const OUT='data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill';
export const FORM='GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013';
export const SOURCE='reference/chat-parallel-2026-09-07/chat5/GCIC-pre2013-restriction.pdf';
export const SOURCE_SHA='5fe841de263070f192ddfb0e322e41b2c2a97e8d07e7e643e98fdf780aefa1ab';
export const SOURCE_SIZE=449903;
export const SOURCE_URL='https://gbi.georgia.gov/document/publication/request-restrict-arrest-record-instructions-and-request-form/download';
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const read=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
const printDate=x=>`${x.slice(5,7)}/${x.slice(8,10)}/${x.slice(0,4)}`;
const docId=FORM;
export const BASES=Object.freeze({
 offense_never_referred_to_prosecuting_attorney_and_case_closed_by_arresting_agency:'Not referred; arresting agency closed the case',
 referred_and_later_dismissed:'Referred to a prosecutor and later dismissed',
 grand_jury_returned_two_no_bills:'Grand jury returned two no bills',
 all_charged_offenses_dismissed:'All charged offenses dismissed',
 all_charged_offenses_nolle_prossed:'All charged offenses nolle prossed',
 all_charged_offenses_reduced_to_a_local_ordinance_violation:'All charged offenses reduced to a local ordinance violation',
 conditional_discharge_under_16_13_2_completed:'Conditional discharge under section 16-13-2 completed',
 underage_alcohol_disposition_under_3_3_23_1_completed:'Underage alcohol disposition under section 3-3-23.1 completed',
 drug_mental_health_or_veterans_court_completed_with_dismissal_or_nolle_prosse:'Drug, mental health or veterans court completed with dismissal or nolle prosequi',
 acquittal_of_all_charges:'Acquittal of all charges'
});
// Baselines and widths measured from the actual retained blank. Coordinates are
// bottom-left PDF points, raised 2pt to clear the printed underline. Only these
// boxes may receive participant ink. Race
// and arresting-agency name are explicitly participant fields on this source,
// not inferred demographics and not the same-named official fields on page 3.
export const FIELDS=Object.freeze([
 ['Name','participant.fullName',109,561,426],
 ['Date of Birth','participant.birthDate',143,534.2,146],
 ['Race','participant.race',326,534.2,98],
 ['Sex','participant.sex',452,534.2,83],
 ['Telephone Number','participant.phone',169,480.5,107],
 ['Email','participant.email',315,480.5,219],
 ['Street Address','participant.street',147,453.6,387],
 ['City','participant.city',99,426.7,208],
 ['State','participant.state',343,426.7,88],
 ['Zip Code','participant.zip',482,426.7,52],
 ['Arresting Agency','case.arrestingAgency',158,399.8,376],
 ['Date of Arrest','case.arrestDate',145,373.1,389]
].map(([label,factId,x,y,width])=>Object.freeze({fieldId:factId,label,factId,page:2,documentId:docId,writeBox:{x,y:y+2,width,height:12},maxFontSize:10,minFontSize:8})));
const CHARGE_BOXES=[{x:191,y:348.2,width:343,height:12},{x:75,y:321.3,width:459,height:12},{x:75,y:294.4,width:459,height:12}];
export const PROTECTED_REGIONS=Object.freeze([
 {page:1,rect:[0,0,612,792],owner:'issuer instructions'},
 {page:2,rect:[400,150,540,208],owner:'GBI Use Only'},
 {page:2,rect:[183,272,540,288],owner:'private manual Social Security Number'},
 {page:2,rect:[70,608,542,641],owner:'participant signature and actual signature date'},
 {page:3,rect:[0,0,612,792],owner:'Section Two: Completed by Arresting Agency'},
 {page:4,rect:[0,0,612,792],owner:'Section Three: Completed by Prosecuting Attorney'}
]); // rects use top-left coordinates for the complete-PDF pixel audit.
function iso(v,label,asOf){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('INVALID_DATE: '+label);if(asOf&&v>asOf)throw Error('FUTURE_FACT: '+label);return v;}
function keys(o,allowed,label){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('OBJECT_REQUIRED: '+label);for(const k of Object.keys(o))if(!allowed.includes(k))throw Error('UNSUPPORTED_OR_PROTECTED_INPUT: '+label+'.'+k);}
const validText=v=>typeof v==='string'&&v.trim()!=='';
function text(v,label){if(!validText(v)||v!==v.trim()||/[\r\n\x00-\x1f]/.test(v)||/^(?:unknown|tbd|n\/a|insert|enter here|see attached)$/i.test(v))throw Error('ACTUAL_TEXT_REQUIRED: '+label);return v;}
export function validateGa(input){
 const f=structuredClone(input),missing=[];
 keys(f,['schemaVersion','familyId','routeKey','asOf','sample','participant','case','confirmations','options'],'input');
 assert.equal(f.schemaVersion,1,'WRONG_SCHEMA');assert.equal(f.familyId,FAMILY,'WRONG_FAMILY');assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');
 iso(f.asOf,'asOf');if(f.asOf>'2026-09-07')throw Error('AUTHORITY_REVALIDATION_REQUIRED');assert.equal(typeof f.sample,'boolean','SAMPLE_FLAG_REQUIRED');
 keys(f.participant,['fullName','birthDate','race','sex','phone','email','street','city','state','zip'],'participant');
 keys(f.case,['arrestDate','arrestingAgency','offenses','basis','dispositionDate','historyPresence','dispositionOnGeorgiaHistory','officialDisposition','basisFacts'],'case');
 keys(f.confirmations,['selectedRouteVerified','entireArrestOutcomeConfirmed','sameIncidentGuiltyPlea','subsectionIExclusionReported','criminalHistoryReviewed','immigrationAdviceNeeded','deniedOrReturned','civilActionRequested'],'confirmations');
 keys(f.options,['feeDifficulty'],'options');assert.equal(typeof f.options.feeDifficulty,'boolean','FEE_DIFFICULTY_CHOICE_REQUIRED');
 for(const k of ['selectedRouteVerified','entireArrestOutcomeConfirmed','criminalHistoryReviewed'])if(f.confirmations[k]!==true)throw Error('REQUIRED_ROUTE_CONFIRMATION: '+k);
 for(const k of ['sameIncidentGuiltyPlea','subsectionIExclusionReported','immigrationAdviceNeeded','deniedOrReturned','civilActionRequested'])if(f.confirmations[k]!==false)throw Error('SELF_HELP_STOP_OR_UNKNOWN: '+k);
 iso(f.case.arrestDate,'arrestDate',f.asOf);if(f.case.arrestDate>='2013-07-01')throw Error('WRONG_POST_2013_PROCESS');
 iso(f.case.dispositionDate,'dispositionDate',f.asOf);if(f.case.dispositionDate<f.case.arrestDate)throw Error('DISPOSITION_PRECEDES_ARREST');
 if(!Object.hasOwn(BASES,f.case.basis))throw Error('UNSUPPORTED_DISPOSITION');
 if(!['georgia','fbi','both'].includes(f.case.historyPresence))throw Error('ARREST_MUST_APPEAR_ON_GEORGIA_OR_FBI_HISTORY');
 if(typeof f.case.dispositionOnGeorgiaHistory!=='boolean')throw Error('DISPOSITION_HISTORY_FACT_REQUIRED');
 if(f.case.historyPresence==='fbi'&&f.case.dispositionOnGeorgiaHistory)throw Error('INCONSISTENT_GEORGIA_HISTORY');
 if(!['available','needed','unavailable','not_required'].includes(f.case.officialDisposition))throw Error('DISPOSITION_DOCUMENT_STATUS_REQUIRED');
 if(!f.case.dispositionOnGeorgiaHistory&&f.case.officialDisposition==='unavailable')throw Error('SELF_HELP_STOP: official disposition unavailable; prosecutor alone may request an exception');
 if(!f.case.dispositionOnGeorgiaHistory&&f.case.officialDisposition==='not_required')throw Error('DISPOSITION_ATTACHMENT_REQUIRED');
 if(f.case.dispositionOnGeorgiaHistory&&f.case.officialDisposition!=='not_required')throw Error('INCONSISTENT_ATTACHMENT_SELECTION');
 keys(f.case.basisFacts,['outcomeConfirmed','neverReferred','caseClosed','allOffensesHaveSelectedOutcome','noBillDates','allReducedToOrdinance','programStatute','programCompleted','dismissedAfterProgram','programType','offenseDate'],'case.basisFacts');
 const specific={offense_never_referred_to_prosecuting_attorney_and_case_closed_by_arresting_agency:['neverReferred','caseClosed'],grand_jury_returned_two_no_bills:['noBillDates'],all_charged_offenses_reduced_to_a_local_ordinance_violation:['allReducedToOrdinance'],conditional_discharge_under_16_13_2_completed:['programStatute','programCompleted','dismissedAfterProgram'],underage_alcohol_disposition_under_3_3_23_1_completed:['programStatute','programCompleted','offenseDate'],drug_mental_health_or_veterans_court_completed_with_dismissal_or_nolle_prosse:['programType','programCompleted','dismissedAfterProgram']};
 keys(f.case.basisFacts,['outcomeConfirmed','allOffensesHaveSelectedOutcome',...(specific[f.case.basis]??[])],'selectedBasisFacts');
 const b=f.case.basisFacts;if(b.outcomeConfirmed!==true||b.allOffensesHaveSelectedOutcome!==true)throw Error('COMPLETE_DISPOSITION_FACTS_REQUIRED');
 if(f.case.basis.startsWith('offense_never')&&(b.neverReferred!==true||b.caseClosed!==true))throw Error('AGENCY_CLOSURE_FACTS_REQUIRED');
 if(f.case.basis==='grand_jury_returned_two_no_bills'){
  if(!Array.isArray(b.noBillDates)||b.noBillDates.length!==2)throw Error('TWO_NO_BILLS_REQUIRED');
  b.noBillDates.forEach(x=>iso(x,'noBillDate',f.asOf));if(b.noBillDates[0]<f.case.arrestDate||b.noBillDates[0]>=b.noBillDates[1]||b.noBillDates[1]!==f.case.dispositionDate)throw Error('NO_BILL_DATES_INCONSISTENT');
 }
 if(f.case.basis.includes('local_ordinance')&&b.allReducedToOrdinance!==true)throw Error('ORDINANCE_REDUCTION_REQUIRED');
 if(f.case.basis.includes('16_13_2')&&(b.programStatute!=='16-13-2'||b.programCompleted!==true||b.dismissedAfterProgram!==true))throw Error('CONDITIONAL_DISCHARGE_FACTS_REQUIRED');
 if(f.case.basis.includes('3_3_23_1')){
  if(b.programStatute!=='3-3-23.1'||b.programCompleted!==true)throw Error('UNDERAGE_ALCOHOL_COMPLETION_REQUIRED');
  iso(b.offenseDate,'offenseDate',f.asOf);iso(f.participant.birthDate,'birthDate',f.asOf);
  const bd=f.participant.birthDate;const years=Number(b.offenseDate.slice(0,4))-Number(bd.slice(0,4))-(b.offenseDate.slice(5)<bd.slice(5)?1:0);
  if(years<0||years>=21||b.offenseDate>f.case.arrestDate)throw Error('UNDERAGE_ALCOHOL_AGE_INCONSISTENT');
 }
 if(f.case.basis.includes('drug_mental_health')&&(!['drug','mental_health','veterans'].includes(b.programType)||b.programCompleted!==true||b.dismissedAfterProgram!==true))throw Error('ACCOUNTABILITY_COURT_FACTS_REQUIRED');
 if(!Array.isArray(f.case.offenses)||!f.case.offenses.length||f.case.offenses.length>25)throw Error('OFFENSES_REQUIRED_ONE_ARREST_DATE');
 f.case.offenses.forEach((v,i)=>text(v,'offenses['+i+']'));if(new Set(f.case.offenses).size!==f.case.offenses.length)throw Error('DUPLICATE_OFFENSE_WITHOUT_DISTINCT_COUNT');
 for(const a of FIELDS){const v=read(f,a.factId);if(v===null||v===undefined||v===''){missing.push({fieldId:a.factId,label:a.label,page:2,requiredBeforeFiling:true,reason:'Not supplied; complete this Section One blank accurately before signing and submitting.'});continue;}text(v,a.factId);if(a.factId.endsWith('Date'))iso(v,a.factId,f.asOf);}
 if(f.participant.birthDate&&f.participant.birthDate>f.case.arrestDate)throw Error('BIRTH_AFTER_ARREST');
 if(f.participant.state&&!/^[A-Z]{2}$/.test(f.participant.state))throw Error('STATE_TWO_LETTERS_REQUIRED');
 if(f.participant.zip&&!/^\d{5}(?:-\d{4})?$/.test(f.participant.zip))throw Error('ZIP_REQUIRED');
 if(f.participant.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.participant.email))throw Error('EMAIL_INVALID');
 missing.push({fieldId:'participant.ssn',label:'Social Security Number',page:2,requiredBeforeFiling:true,reason:'We have left this field blank. Enter your own number privately on the official paper form, not in ordinary email. Ask the agency how to proceed if you have no Social Security Number.'});
 if(!f.case.dispositionOnGeorgiaHistory)missing.push({fieldId:'officialDispositionAttachment',label:'Actual official disposition documentation',page:null,requiredBeforeFiling:true,reason:f.case.officialDisposition==='available'?'Attach the actual official document you have; this generated packet does not contain it.':'Obtain official documentation from the court clerk or responsible records office and attach it before submitting. The acquisition sheet is not that document.'});
 return {facts:f,missing,attachmentGuidance:!f.case.dispositionOnGeorgiaHistory};
}
function checkSource(bytes){if(bytes.length!==SOURCE_SIZE||sha256(bytes)!==SOURCE_SHA)throw Error('SOURCE_DRIFT');}
function protectedBlank(fieldId,label,page,owner){return {fieldId,label,page,documentId:docId,owner,disposition:'PROTECTED_FIELD',refusalClass:'court_prosecutor_clerk_or_agency_owned',reason:`Exact source page ${page} assigns this blank to ${owner}, not the applicant.`,sourceActorEvidence:page===3?'SECTION TWO - ARREST INFORMATION (Completed by Arresting Agency)':page===4?'SECTION THREE - PROSECUTING ATTORNEY (Completed by Prosecuting Attorney)':'GBI Use Only'};}
export function blankInventory(){
 const rows=[
  {fieldId:'participant.signature',label:'Signature',page:2,documentId:docId,refusalClass:'signature_or_date_participant_completion',reason:'Participant signs only after reviewing the actual request.'},
  {fieldId:'participant.signatureDate',label:'Signature date',printedLabel:'Date',page:2,documentId:docId,refusalClass:'signature_or_date_participant_completion',reason:'The participant supplies the actual date of signing.'},
  ...['Money Order','Certified Check','GBI Reference #'].map((s,i)=>protectedBlank('gbi.'+i,s,2,'GBI payment-processing official'))
 ];
 const agency=['Date Request Received','Applicant\'s State Identification Number (SID)','Offender Tracking Number (OTN)','Arresting Agency Name','Arresting Agency ORI Number','Case / Citation / Docket Number','Date of Arrest','Arrest appears on Georgia and/or FBI criminal history record? Yes / No','Arrest Charge Tracking Number(s) and Charges','Disposition of Arrest','Disposition appears on Georgia criminal history record? Yes / No','Prosecuting Attorney/Court Case Referred To','Official Completing Form: Title','Official Completing Form: Name','Official Completing Form: Telephone Number','Official Completing Form: Signature','Official Completing Form: Email'];
 const prosecutor=['Date Request Received','Judicial Circuit / County','Prosecuting Agency ORI Number','District Attorney / Solicitor General','Prosecutor Assigned to Case','Case / Citation / Docket Number','Approved - Record Restriction Meets Statutory Requirements','No Information Available; Record Restriction Forwarded Without Objection','Approved - No Further Action Anticipated','No Information Available at Prosecutor\'s Office; Returned to Arresting Agency for Further Research','Denied - Restriction Does Not Meet Statutory Requirements','Prosecutor Comments','Prosecutor Completing Form: Name','Prosecutor Completing Form: Telephone Number','Prosecutor Completing Form: Signature','Prosecutor Completing Form: Email'];
 agency.forEach((s,i)=>rows.push(protectedBlank('agency.'+i,s,3,'arresting agency official')));prosecutor.forEach((s,i)=>rows.push(protectedBlank('prosecutor.'+i,s,4,'prosecutor')));
 return rows;
}
const SOURCES_TEXT=[
 ['Official application and actor instructions',SOURCE_URL],
 ['Judicial Council of Georgia, Record Restrictions','https://georgiacourts.gov/a2j/self-help-resources/record-restrictions-expungement/'],
 ['Georgia.gov, File a Request to Expunge a Criminal Record','https://georgia.gov/file-request-expunge-criminal-record'],
 ['GCIC fee schedule, effective January 1, 2025','https://gbi.georgia.gov/document/document/gcic-fees/download'],
 ['GBI record restrictions and criminal-history information','https://gbi.georgia.gov/services/georgia-criminal-history-record-restrictions']
];
export function guideFor(review){
 const f=review.facts;
 const p1=[
 ['Purpose and packet contents',`This is the initial application for an arrest before July 1, 2013. It is not an approval, a court petition, or the procedure for a newer arrest. Keep all four official pages together: instructions; Section One (you); Section Two (arresting agency); Section Three (prosecutor). Only Section One is prepared. These added pages are instructions, not a filing substitute.`],
 ['Your selected route',`${BASES[f.case.basis]}. Arrest date: ${printDate(f.case.arrestDate)}. Reported outcome date: ${printDate(f.case.dispositionDate)}. These are supplied facts for the selected route, not a prosecutor's finding. Compare all charges from this arrest against the actual record before signing. Charges from another arrest date require a separate application.`],
 ['Complete and check Section One',`Review Name, Date of Birth, Race, Sex, Telephone Number, Email, Street Address, City, State, Zip Code, Arresting Agency, Date of Arrest and Offenses(s) Arrested For. Race and sex are only transcribed when supplied, never inferred. Keep the full offense wording. Do not shorten a charge or substitute an outcome for the offense.`],
 ['Information still needed',review.missing.filter(x=>x.page===2).map(x=>`${x.label}: ${x.reason}`).join('\n')],
 ['Sign only after checking',`Sign and date the applicant's Section One on the day you sign. No signature, signing date, notarial act or digital consent was inserted. This source does not call for notarization. Leave the GBI Use Only box and all of Sections Two and Three untouched, including the repeated arrest, agency and case facts.`]
 ];
 const p2=[
 ['Obtain and compare the record',`Obtain your own Georgia criminal history through a Georgia sheriff's office or police department. Ask that office about identification, request method and any record-copy charge before paying. A screening answer is not a criminal-record search. Confirm this arrest is on the Georgia or FBI history. This form cannot be processed if it appears on neither. Do not check the agency's history boxes yourself.`],
 ['Where to submit first',`Submit the complete official form to the arresting law enforcement agency named in Section One, not directly to GCIC and not to a court. Confirm that agency's records-unit mailing address, hours, delivery method and charge. No agency address or contact response has been invented in this packet. Keep a copy and proof of the date the agency received it.`],
 ['What the agency and prosecutor do',`The arresting agency completes Section Two and forwards the entire form to the prosecutor. The prosecutor completes Section Three and decides the action. Section 35-3-37(n)(2) provides a 90-day prosecutor review period and a presumption of no objection after nonresponse. Track actual receipt dates and ask the agency/prosecutor for the status; do not turn elapsed time into a fabricated signature, approval or completed application.`],
 ['Disposition document branch',review.attachmentGuidance?`The disposition is not reported on the Georgia history. The extra acquisition checklist is included. Attach actual official documentation of the disposition; neither that checklist nor this generated PDF is the missing official document. If documents are unavailable, stop and ask the agency/prosecutor about the source's exception process. Only the prosecutor may supply the explanation or exception in Prosecutor Comments.`:`The disposition is reported on the Georgia history. No additional disposition-acquisition component was selected. Compare the actual report and follow any specific request from the agency. A report or official case record has not been generated or attached here.`],
 ['Fees and inability to pay',`The arresting agency may charge a processing fee of no more than $50 under the official instructions. Its actual charge must be confirmed; do not assume it is $50. The separate $25 GCIC fee applies only when an approved complete application is forwarded to GCIC. It does not apply when the prosecutor enters the restriction directly in CCH. No statutory fee waiver or waiver form for these agency charges is established by this source set. ${f.options.feeDifficulty?'You reported difficulty paying. Ask the agency whether it offers reduced or no-cost processing before submitting payment, and ask a local record-restriction clinic about assistance. No waiver has been granted.':'If paying is difficult, ask the agency about reduced/no-cost processing and a local record-restriction clinic about assistance before paying.'} A product charge or sponsorship is separate from an agency charge.`]
 ];
 const p3=[
 ['After approval: distinguish the two paths',`If the prosecutor approves and enters the restriction in the GCIC CCH interface, do not send an application or $25 fee to GCIC. Ask for completion confirmation and keep it. If the prosecutor approves but cannot enter it in CCH, follow the agency's directions to forward the actual completed, approved form to GCIC. Do not mail this unsigned initial application as if Sections Two and Three were approved.`],
 ['Approved-paper forwarding only',`After actual approval and the agency's forwarding direction, send the complete approved form with a $25 money order or certified check payable to Georgia Bureau of Investigation to: Georgia Crime Information Center, Record Restrictions, P.O. Box 370808, Decatur, GA 30037-0808. Confirm current instructions before mailing. Incomplete or unpaid applications are returned. Do not pay by inserting invented payment details in the GBI Use Only box.`],
 ['Do not forward a denial or research return',`If denied, or returned for further research, do not forward to GCIC. Keep the response and its receipt date. Get prompt legal help rather than use this packet as an appeal. Georgia.gov tells applicants to seek judicial review within 30 days of denial; treat that as an urgent outside limit for obtaining advice, not a guarantee of the applicable filing deadline. A civil action, service on respondents or a contested hearing is outside this initial self-help packet.`],
 ['Check completion and keep copies',`For complete paper requests, Georgia.gov describes processing as typically two to three weeks; this is not a guarantee. GCIC sends a letter to the street address in Section One when it applies the restriction. Keep your submitted application, disposition records, proof of receipt, approval, payment proof when applicable, and the completion letter. Obtain an updated history and check the specific arrest cycle. Missing confirmation is not proof that the record is restricted.`],
 ['Limits and further help',`Restriction limits access for non-criminal-justice purposes; it is not record destruction or separate court sealing. Local sources and private databases may retain information. It does not settle federal or immigration disclosure duties. Stop for immigration consequences, a disputed outcome, a disqualifying same-incident plea, a statutory exclusion, a denial or a request for court enforcement. The Georgia Judicial Council record-restrictions page links to legal help and clinics. It is not a promise of representation.`]
 ];
 const pages=[{title:'Before you submit',sections:p1},{title:'Agency submission and charges',sections:p2},{title:'After the prosecutor responds',sections:p3}];
 if(review.attachmentGuidance)pages.push({title:'Disposition-document acquisition',sections:[
  ['This is NOT your official disposition',`This page is an acquisition checklist. It does not certify a disposition, replace a clerk's document or prove that any attachment is enclosed. Keep it with your instructions, not as a substitute exhibit.`],
  ['What to obtain',`Ask the clerk of the court that handled the case for official documentation of the final disposition for every charge in this arrest. For a case closed without referral, ask the arresting agency which official closing record the prosecutor requires. Give the clerk/records office your name, arrest date, charges and actual case/citation number if known. Ask about identity requirements, delivery method and copy/certification charges. Do not invent a case number or a court.`],
  ['Check the actual document',`Compare the name, arrest date and charge list with Section One and verify the outcome and dates. Your stated document status is ${f.case.officialDisposition==='available'?'available: attach that real document before submitting':'needed: obtain and attach the real document before submitting'}. A document held elsewhere is not automatically included in this PDF. Keep your own copy.`],
  ['When no official record can be obtained',`Do not write No Further Action Anticipated or another exception in the prosecutor's area. Ask the agency/prosecutor to address the problem. The source requires a disposition on file, official documentation, or the prosecutor's request for exception. This packet does not supply an exception request or substitute disposition.`]
 ]});
 return pages;
}
async function appendGuide(doc,review){
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const pages=guideFor(review);const sourceLine='Sources checked 2026-09-07. Official form: effective 07/01/2013.';
 for(const [i,content] of pages.entries()){
  const page=doc.addPage([612,792]);let y=742;
  const line=(text,size=10.4,usedFont=font)=>{page.drawText(text,{x:48,y,size,font:usedFont,color:rgb(0,0,0)});y-=size+4;};
  line('GEORGIA | PRE-JULY 1, 2013 ARREST',10,bold);y-=5;line(content.title,17,bold);y-=7;
  if(review.facts.sample){line('SYNTHETIC EXAMPLE - NOT FOR SUBMISSION',9,bold);y-=4;}
  for(const [heading,body] of content.sections){line(heading,11,bold);for(const paragraph of body.split('\n')){for(const l of wrapToWidth(font,paragraph,10.4,516))line(l);y-=3;}y-=5;}
  if(y<67)throw Error('GUIDE_OVERFLOW: '+content.title);
  page.drawText(sourceLine,{x:48,y:43,size:8,font});page.drawText(`Participant instructions ${i+1}/${pages.length} | Not an agency decision`,{x:48,y:30,size:8,font});
 }
 // Short source keys remain usable in the PDF; full URLs are in the matching
 // retained Markdown guide and the clickable link on the final instruction page.
 const last=doc.getPages().at(-1);last.drawText('Process and help: https://georgia.gov/file-request-expunge-criminal-record',{x:48,y:17,size:7.5,font});
 return pages;
}
export async function renderGa(input,{sourceBytes}={}){
 const review=validateGa(input);const raw=sourceBytes??fs.readFileSync(path.join(ROOT,SOURCE));checkSource(raw);
 const source=await PDFDocument.load(raw,{updateMetadata:false});assert.equal(source.getPageCount(),4,'SOURCE_PAGE_COUNT');assert.equal(source.getForm().getFields().length,0,'UNEXPECTED_WIDGETS');
 const font=await source.embedFont(StandardFonts.Helvetica);const writes=[];
 const write=(a,value)=>{
  let fit;try{font.encodeText(value);fit=fitTextToWidget({font,text:value,rect:a.writeBox,multiline:false,maxFontSize:a.maxFontSize??10,minFontSize:a.minFontSize??8});}catch{throw Error('UNSUPPORTED_GLYPH: '+a.fieldId);}
  if(fit.outcome==='refused')throw Error('KNOWN_VALUE_DOES_NOT_FIT: '+a.fieldId);
  source.getPage(1).drawText(value,{x:a.writeBox.x,y:a.writeBox.y,size:fit.fontSize,font,color:rgb(0,0,0)});
  writes.push({...a,value,drawnText:value,fontSize:fit.fontSize,outcome:fit.outcome});
 };
 for(const a of FIELDS){const v=read(review.facts,a.factId);if(v===null||v===undefined||v==='')continue;write(a,a.factId.endsWith('Date')?printDate(v):v);}
 const charges=review.facts.case.offenses.join('; ');
 // At most three physical source lines, no truncated offense, invented extra
 // filing or silently shortened count. Use one readable font size for all lines.
 let chargeLines=null,chargeSize=null;
 for(let size=10;size>=8;size-=0.5){
  const words=charges.split(' ');let at=0;const lines=[];
  for(const box of CHARGE_BOXES){let s='';while(at<words.length){const next=s?s+' '+words[at]:words[at];if(font.widthOfTextAtSize(next,size)>box.width-4)break;s=next;at++;}lines.push(s);}
  if(at===words.length){chargeLines=lines;chargeSize=size;break;}
 }
 if(!chargeLines)throw Error('KNOWN_VALUE_DOES_NOT_FIT: complete offense list needs agency-directed continuation');
 chargeLines.forEach((value,i)=>{if(value)write({fieldId:'case.offenses.line'+(i+1),factId:'case.offenses',label:'Offenses(s) Arrested For'+(i?' continuation '+(i+1):''),page:2,documentId:docId,writeBox:CHARGE_BOXES[i],maxFontSize:chargeSize,minFontSize:chargeSize},value);});
 assert.equal(chargeLines.filter(Boolean).join(' '),charges,'CHARGE_TEXT_LOSS');
 const sanitized=await sanitizeAndFlatten(source);preserveSourceMetadata(source,sanitized.clean);const doc=sanitized.clean;
 const guide=await appendGuide(doc,review);stampDeterministic(doc);
 const bytes=await doc.save({useObjectStreams:false,updateMetadata:false});const scan=scanBytesForActiveContent(bytes);assert.equal(scan.inspectable,true);assert.equal(scan.hits.length,0,'ACTIVE_CONTENT');
 const reread=await PDFDocument.load(bytes,{updateMetadata:false});
 const items=extractTextItems(reread.getPage(1));
 const actualWrites=writes.map(w=>{const found=items.filter(t=>Math.abs(t.x-w.writeBox.x)<0.01&&Math.abs(t.y-w.writeBox.y)<0.01&&Math.abs(t.size-w.fontSize)<0.01);const drawnText=found.map(t=>t.text).join('');if(drawnText!==w.value)throw Error('OUTPUT_TEXT_NOT_PROVEN: '+w.fieldId);return {fieldId:w.fieldId,factId:w.factId,page:2,expected:w.value,drawnText,matchesExpected:true,baseline:{x:w.writeBox.x,y:w.writeBox.y},glyphsRead:found.reduce((n,t)=>n+t.chars.filter(c=>c.text?.trim?.()??true).length,0),geometricWidthExact:found.every(t=>t.metricsExact)};});
 const blanks=[...blankInventory(),...review.missing.map(x=>({...x,documentId:x.page?docId:'disposition-acquisition-guidance',disposition:'REQUIRED_BEFORE_FILING',completenessClass:null}))];
 return {bytes,pageCount:doc.getPageCount(),sha256:sha256(bytes),writes,actualWrites,blanks,review,guide,activeContentScan:scan,sanitation:sanitized.report,componentPages:[{documentId:docId,role:'primary_filing',pages:[1,2,3,4],participantWritablePages:[2]},{documentId:'participant-instructions',role:'process_guidance',pages:[5,6,7]},...(review.attachmentGuidance?[{documentId:'disposition-acquisition-guidance',role:'process_guidance',pages:[8],isActualDisposition:false}]:[])]};
}
export function fixtures(){
 const f={schemaVersion:1,familyId:FAMILY,routeKey:ROUTE,asOf:'2026-09-07',sample:true,participant:{fullName:'Jordan Ellis',birthDate:'1991-05-12',race:'Black',sex:'Male',phone:'404-555-0142',email:'jordan.ellis@example.com',street:'125 Example Lane',city:'Atlanta',state:'GA',zip:'30303'},case:{arrestDate:'2010-06-15',arrestingAgency:'Atlanta Police Department',offenses:['Criminal trespass (O.C.G.A. 16-7-21)'],basis:'all_charged_offenses_dismissed',dispositionDate:'2011-02-10',historyPresence:'georgia',dispositionOnGeorgiaHistory:true,officialDisposition:'not_required',basisFacts:{outcomeConfirmed:true,allOffensesHaveSelectedOutcome:true}},confirmations:{selectedRouteVerified:true,entireArrestOutcomeConfirmed:true,sameIncidentGuiltyPlea:false,subsectionIExclusionReported:false,criminalHistoryReviewed:true,immigrationAdviceNeeded:false,deniedOrReturned:false,civilActionRequested:false},options:{feeDifficulty:false}};
 const all={canonical:structuredClone(f)};
 const boundary=structuredClone(f);Object.assign(boundary.participant,{fullName:'Alexandria Catherine Montgomery-Williams',phone:'404-555-0142',email:'alexandria.montgomery@example.com',street:'1275 Example Boulevard Apartment 1204',city:'Peachtree Corners',zip:'30092-1234'});Object.assign(boundary.case,{arrestDate:'2013-06-30',dispositionDate:'2014-01-15',arrestingAgency:'Gwinnett County Police Department',offenses:['Count 1: Criminal trespass (O.C.G.A. 16-7-21)','Count 2: Disorderly conduct (O.C.G.A. 16-11-39)','Count 3: Obstruction of a law enforcement officer, misdemeanor (O.C.G.A. 16-10-24)'],historyPresence:'both',dispositionOnGeorgiaHistory:false,officialDisposition:'needed'});boundary.options.feeDifficulty=true;all.boundary=boundary;
 for(const [i,basis] of Object.keys(BASES).entries()){
  const x=structuredClone(f);x.case.basis=basis;
  if(basis.startsWith('offense_never'))Object.assign(x.case.basisFacts,{neverReferred:true,caseClosed:true});
  if(basis.includes('no_bills')){x.case.offenses=['Burglary (O.C.G.A. 16-7-1)'];Object.assign(x.case.basisFacts,{noBillDates:['2010-10-12','2011-02-10']});}
  if(basis.includes('local_ordinance'))Object.assign(x.case.basisFacts,{allReducedToOrdinance:true});
  if(basis.includes('16_13_2')){x.case.offenses=['Possession of a controlled substance (O.C.G.A. 16-13-30)'];Object.assign(x.case.basisFacts,{programStatute:'16-13-2',programCompleted:true,dismissedAfterProgram:true});}
  if(basis.includes('3_3_23_1')){x.case.offenses=['Underage possession of alcohol (O.C.G.A. 3-3-23)'];Object.assign(x.case.basisFacts,{programStatute:'3-3-23.1',programCompleted:true,offenseDate:'2010-06-15'});}
  if(basis.includes('drug_mental_health')){x.case.offenses=['Possession of a controlled substance (O.C.G.A. 16-13-30)'];Object.assign(x.case.basisFacts,{programType:'drug',programCompleted:true,dismissedAfterProgram:true});}
  all['basis-'+String(i+1).padStart(2,'0')]=x;
 }
 const docs=structuredClone(f);Object.assign(docs.case,{dispositionOnGeorgiaHistory:false,officialDisposition:'available'});all['disposition-document-available']=docs;
 const partial=structuredClone(f);for(const k of ['email','race','sex','phone','street','city','state','zip'])partial.participant[k]=null;partial.case.arrestingAgency=null;partial.options.feeDifficulty=true;all['missing-participant-facts']=partial;
 const fbi=structuredClone(docs);fbi.case.historyPresence='fbi';all['fbi-record-only']=fbi;
 return all;
}
export async function runGa({outDir=path.join(ROOT,OUT),inputFile}={}){
 outDir=path.resolve(outDir);if(inputFile&&outDir===path.join(ROOT,OUT))throw Error('CUSTOM_FACTS_REQUIRE_ISOLATED_OUTPUT');
 const scenarios=inputFile?{participant:JSON.parse(fs.readFileSync(inputFile,'utf8'))}:fixtures();const results=[],actual=[];let first;
 const put=(p,v)=>{const target=path.join(outDir,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,typeof v==='string'||Buffer.isBuffer(v)||v instanceof Uint8Array?v:json(v));};
 for(const [fixture,f] of Object.entries(scenarios)){
  const r=await renderGa(f);first??=r;const rel=`fixtures/${fixture}.pdf`;put(rel,r.bytes);put(`fixtures/${fixture}.facts.json`,f);
  const report={schemaVersion:'chat5-ga-pre2013-complete-output/v1',familyId:FAMILY,fixture,inputSha256:sha256(Buffer.from(json(f))),output:{path:rel,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount},sourceSha256:SOURCE_SHA,componentPages:r.componentPages,writes:r.writes,actualWrites:r.actualWrites,blanks:r.blanks,selectedBasis:f.case.basis,missingParticipantFacts:r.review.missing,guide:r.guide,readyToSubmit:false,reason:'Applicant must complete missing facts and sign; agency/prosecutor execution has not occurred.',sanitation:r.sanitation,activeContentScan:r.activeContentScan,independentReview:'PENDING',centralRaster:'PENDING'};
  put(`reports/${fixture}.json`,report);results.push({fixture,...report.output,documents:r.componentPages.map(x=>x.documentId)});actual.push({fixture,sha256:r.sha256,valuesReportedByFinalizer:r.writes.length,addedGlyphsReadFromOutputBytes:r.actualWrites.reduce((n,w)=>n+w.glyphsRead,0),actualWrites:r.actualWrites,geometricMeasurement:'Use the separate complete-PDF glyph/pixel audit; the shared text reader does not have exact Standard-14 widths.'});
 }
 const receipt={schemaVersion:'chat5-held-official-source/v1',familyId:FAMILY,allSourcesExact:true,documents:[{formNumber:FORM,path:SOURCE,sha256:SOURCE_SHA,byteLength:SOURCE_SIZE,pages:4,edition:'Effective Date 07/01/2013',issuerUrl:SOURCE_URL}],sourceFaceComparedToLiveIssuerOn:'2026-09-07',liveIssuerBinaryDigestIndependentlyMeasured:false};
 put('source-receipt.json',receipt);
 put('reports/actual-writes.json',{schemaVersion:'chat5-ga-actual-output-text/v1',familyId:FAMILY,derivedFromArtifactBytes:true,artifacts:actual,documents:actual.map(x=>({fixture:x.fixture,documentId:FORM,actualWrites:x.actualWrites}))});
 put('production-field-map.json',{schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY,routeKeys:[ROUTE],sourceSha256:SOURCE_SHA,writes:first.writes,refusals:first.blanks,sourceSpecificAllowlist:FIELDS,protectedRegions:PROTECTED_REGIONS,fixtureReports:results.map(x=>'reports/'+x.fixture+'.json'),scope:'Canonical schema plus all per-fixture actual writes/blanks; later agency repeated facts belong to the named official, not to the participant.',runtimeInstalled:false});
 put('reports/rendered-artifacts.json',{schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,artifacts:results,packets:results,renderedFresh:true,byteHashesMeasured:true,independentVerificationPending:true,centralRasterPending:true});
 const md=['# Georgia pre-July 1, 2013 request: participant instructions','',...guideFor(first.review).flatMap(p=>['## '+p.title,'',...p.sections.flatMap(([h,b])=>['### '+h,b,''])]),'## Missing facts and conditional documents','Every unfilled applicant field is listed in that packet. Required before filing: Name; Date of Birth; Race; Sex; Telephone Number; Email; Street Address; City; State; Zip Code; Arresting Agency; Date of Arrest; Offenses(s) Arrested For; Social Security Number. Never supply invented identity, charge, case or outcome information. Actual official disposition documentation must be attached when absent from the Georgia history. No such record is contained in a generated acquisition sheet.','',...SOURCES_TEXT.flatMap(([h,u])=>[h+': '+u]),'', 'Authority: O.C.G.A. 35-3-37(h), (i), (n), (p), as adopted in the pinned legal-design track. This source-specific adapter is not the eligibility engine.',''];put('participant-instructions.md',md.join('\n'));
 put('field-census.census-v1.json',{schemaVersion:'chat5-source-actor-census/v1',sourceSha256:SOURCE_SHA,pageCount:4,widgetCount:0,documents:[{formNumber:FORM,sourceSha256:SOURCE_SHA,participantFields:FIELDS,manualFields:[{label:'Social Security Number',page:2},{label:'Signature',page:2},{label:'Date',page:2}],officialFields:blankInventory().filter(x=>x.owner),protectedRegions:PROTECTED_REGIONS}],noParticipantServiceCertificate:true,noNotaryField:true});
 put('build-status.json',{schemaVersion:'chat5-build-only/v1',familyId:FAMILY,status:'COMPLETE_CANDIDATE_AWAITING_REVIEW',pdfCount:results.length,pageCount:results.reduce((n,x)=>n+x.pageCount,0),sourceSha256:SOURCE_SHA,authorQaSeparate:true,independentReview:'PENDING',centralRaster:'PENDING',binaryPublication:'PENDING_A',runtimeInstalled:false,terminalClaim:false,manualCompletionRequired:true});
 return results;
}
