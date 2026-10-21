/** Six-form Missouri lane: this module maps ONLY CR301 / CR311 / FI-05.
 * It reuses the shared fitting, active-content and deterministic primitives.
 * It does not decide legal eligibility or claim independent verification.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PDFDocument, StandardFonts} from 'pdf-lib';
import {fitTextToWidget, applyFitToTextField, wrapToWidth} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten, scanBytesForActiveContent} from '../../rcap-official-forms/rcap-active-content.mjs';
import {postOrderFollowThrough} from './mistaken-identity-follow-through.mjs';
import {stampDeterministic} from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';

export const FAMILY = 'mo-610-145-mistaken-identity-set';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SOURCE_DIR = 'reference/chat-parallel-2026-09-07/chat7';
export const OUTPUT_DIR = `data/rcap-all50/overlays/census-v1/mo/${FAMILY}--official-pdf-fill`;
export const SOURCES = {
 'CR301.pdf':{sha256:'5f4fecf410664cc725e298e2d96f3aa0448acaa800dc559e548f8f2e38a3f9f8',pages:1,edition:'OSCA (07-17)',url:'https://www.courts.mo.gov/file.jsp?id=199599',custody:'Roger-held petition-for-expungement-mistaken-identity.pdf'},
 'CR311.pdf':{sha256:'3ce91ab2c9bbcdb4f20cb72e99ee786a1b2e1979c2bc72831452addaff0eef40',pages:1,edition:'OSCA (07-17)',url:'https://www.courts.mo.gov/file.jsp?id=199608',custody:'CODEX-CS1-SRC2__CR311__3ce91ab2c9bb.pdf'},
 'FI-05.pdf':{sha256:'53f1e04eba653d7ed8e2f2f059e57854d3780845e6364bb6b2a57c7728cd412e',pages:4,edition:'SJRC (04-23); case types (07-23)',url:'https://stlcountycourts.com/forms/associate-civil/confidential-case-filing-information-sheet/',custody:'GitHub Actions artifact 9934370357, retrieved/primary-ledger/sources/MO-FI-05/source.pdf'}
};
export const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const json = x => JSON.stringify(x,null,2)+'\n';
const text = x => x == null ? '' : String(x).trim();
const fullName = p => [p.firstName,p.middleName,p.lastName].map(text).filter(Boolean).join(' ');
const cityStateZip = p => [p.city,[p.state,p.zip].map(text).filter(Boolean).join(' ')].filter(Boolean).join(', ');
const kinds = ['circuit','associate','municipal','sheriff','police','mhp','repository','countyProsecutor','municipalProsecutor','other'];
function date(value, label) {
 if (!value) return '';
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) throw Error(`INVALID_DATE: ${label}`);
 return `${value.slice(5,7)}/${value.slice(8,10)}/${value.slice(0,4)}`;
}
/** Explicit importer: reject adjudicative input and contradictory attestation;
 * omitted optional facts stay blank. Rejected petition input can still use guidance.
 */
export function importFacts(input) {
 const f=structuredClone(input);
 if(f.confidentialSheetRequired!==undefined && typeof f.confidentialSheetRequired!=='boolean')throw Error('CLERK_COMPONENT_CHOICES_REQUIRED');
 if(f.participant?.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(f.participant.ssn))throw Error('FULL_SSN_REQUIRED_IF_SUPPLIED');
 if(f.familyId!==FAMILY || f.schemaVersion!==1) throw Error('WRONG_FAMILY_OR_SCHEMA');
 if(!['petition','automatic-on-notice'].includes(f.route)) throw Error('UNKNOWN_ROUTE');
 const forbidden=/^(signature|signedAt|notary|notarized|judgeSignature|judgmentDate|courtFinding|hearingDate|serviceCompleted|clerkCertification|courtApproved)$/i;
 const inspect=(v)=>{if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(forbidden.test(k)&&x!=null&&x!=='')throw Error(`PROTECTED_EXECUTION_INPUT: ${k}`);inspect(x);}};inspect(f);
 for(const [key,value]of Object.entries(f)){if(['records','convictions','cases'].includes(key)&&value!=null)throw Error('ONE_LAST_PENDING_CASE_PER_PETITION');}
 if(!f.participant||!text(f.participant.firstName)||!text(f.participant.lastName))throw Error('PARTICIPANT_NAME_REQUIRED');
 date(f.participant.dateOfBirth,'date of birth'); date(f.dispositionDate,'disposition'); date(f.arrest?.date,'arrest');
 if(f.participant.sex&&!['M','F'].includes(f.participant.sex))throw Error('SOURCE_SEX_CONTROL_UNREPRESENTABLE: leave blank rather than coerce');
 if(f.participant.dateOfBirth&&f.arrest?.date&&f.participant.dateOfBirth>=f.arrest.date)throw Error('INCOHERENT_DATE_ORDER');
 if(f.arrest?.date&&f.dispositionDate&&f.arrest.date>f.dispositionDate)throw Error('INCOHERENT_DATE_ORDER');
 if(f.route==='automatic-on-notice'){
  if(f.disposition!=='dismissed')throw Error('AUTOMATIC_NOTICE_REQUIRES_DISMISSAL');
  return f;
 }
 if(!['mistaken_identity','identifying_information_used'].includes(f.identityBasis)||f.identityBasisConfirmed!==true)throw Error('IDENTITY_BASIS_CONFIRMATION_REQUIRED');
 if(!['dismissed','acquitted'].includes(f.disposition)||f.allChargesDisposed!==true)throw Error('DISPOSITION_CONFIRMATION_REQUIRED');
 if(f.disposition==='dismissed'&&f.noticeRouteReviewed!==true)throw Error('REVIEW_AUTOMATIC_NOTICE_ROUTE_FIRST');
 if(f.court?.lastPendingConfirmed!==true||!text(f.court.county)||!text(f.court.circuit))throw Error('LAST_PENDING_COURT_CONFIRMATION_REQUIRED');
 if(!['circuit','associate','municipal'].includes(f.court.level))throw Error('COURT_LEVEL_REQUIRED');
 if(typeof f.opensNewCase!=='boolean'||typeof f.proposedOrderRequested!=='boolean')throw Error('CLERK_COMPONENT_CHOICES_REQUIRED');
 if(!Array.isArray(f.respondents)||f.respondents.length===0)throw Error('RECORD_HOLDERS_REQUIRED');
 const seen=new Set();
 for(const r of f.respondents){
  if(!kinds.includes(r.kind)||!text(r.organization))throw Error('INVALID_RECORD_HOLDER');
  if(r.kind!=='other'&&seen.has(r.kind))throw Error('DUPLICATE_SINGLE_FORM_SLOT');seen.add(r.kind);
  if(!['other','repository'].includes(r.kind)&&!text(r.label))throw Error('RECORD_HOLDER_LABEL_REQUIRED');
 }
 return f;
}
export async function loadSource(name, root=ROOT) {
 const bytes=await fs.readFile(path.join(root,SOURCE_DIR,name));
 if(hash(bytes)!==SOURCES[name]?.sha256)throw Error(`SOURCE_HASH_MISMATCH: ${name}`);
 const doc=await PDFDocument.load(bytes,{updateMetadata:false});
 if(doc.getPageCount()!==SOURCES[name].pages)throw Error(`SOURCE_PAGE_COUNT: ${name}`);
 // Some official Rect arrays have reversed y endpoints. Normalize the SAME
 // geometric region, never invent or move a box. Shared primitives are unchanged.
 for(const field of doc.getForm().getFields()){
  if(typeof field.isRichFormatted==='function'&&field.isRichFormatted())field.disableRichFormatting();
  for(const widget of field.acroField.getWidgets()){
  const r=widget.getRectangle();if(r.width<0||r.height<0)widget.setRectangle({x:Math.min(r.x,r.x+r.width),y:Math.min(r.y,r.y+r.height),width:Math.abs(r.width),height:Math.abs(r.height)});
  }
 }
 if(name==='CR301.pdf'){
  // Authored tall agency widget intrudes into the printed label; use only its
  // lower interior for the value. No printed form content is moved.
  const w=doc.getForm().getTextField('Arresting_Agency').acroField.getWidgets()[0];
  const r=w.getRectangle();w.setRectangle({...r,height:24.5});
 }
 if(name==='FI-05.pdf')doc.getForm().getTextField('Text1').enableMultiline();
 return doc;
}
async function finish(doc,written=new Set(),audit={}){
 const font=await doc.embedFont(StandardFonts.Helvetica);
 const {clean,report}=await sanitizeAndFlatten(doc,{defaultFont:font,writtenFields:written,detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true});
 stampDeterministic(clean); const bytes=await clean.save({useObjectStreams:false});
 const residue=scanBytesForActiveContent(bytes);
 if(residue.length)throw Error(`ACTIVE_CONTENT: ${JSON.stringify(residue)}`);
 return {bytes,audit:{...audit,sanitization:report},pages:clean.getPageCount()};
}
async function fillWidgets(doc, values, checks=[], label='') {
 const form=doc.getForm(),font=await doc.embedFont(StandardFonts.Helvetica),written=new Set(),mapped=[];
 for(const [name,value]of Object.entries(values)){
  if(!text(value))continue;
  const field=form.getTextField(name); const widgets=field.acroField.getWidgets();
  if(widgets.length!==1)throw Error(`UNEXPECTED_WIDGET_COUNT: ${name}`);
  const fit=fitTextToWidget({font,text:text(value),rect:widgets[0].getRectangle(),multiline:field.isMultiline(),minFontSize:6.5,maxFontSize:10,evaluateDeclaredMinimumSize:true});
  if(!applyFitToTextField(field,fit))throw Error(`FIELD_OVERFLOW: ${label}/${name}: ${fit.reason}`);
  written.add(name); mapped.push({field:name,value:text(value),outcome:fit.outcome,fontSize:fit.fontSize});
 }
 for(const name of checks){form.getCheckBox(name).check();written.add(name);mapped.push({field:name,checked:true});}
 const blanks=form.getFields().filter(x=>!written.has(x.getName())).map(x=>({field:x.getName(),value:'',disposition:'PRESERVE_BLANK'}));
 // All unmapped source controls are blank in the checksum-pinned originals.
 return finish(doc,written,{source:label,mapped,blanks});
}
export const needsConfidentialSheet = f => f.opensNewCase || f.confidentialSheetRequired === true;
export async function petition(f,root=ROOT){
 const p=f.participant,c=f.court,a=f.arrest||{};
 const values={
  'Circuit Number':c.circuit,'County Name':c.county,'Case number':f.opensNewCase?'':c.originalCaseNumber,
  'Petitioner':fullName(p),'Petitioners full name':fullName(p),'Race':p.race,'Date of birth':date(p.dateOfBirth,'DOB'),
  'Social Security Number':p.ssn,'Drivers License Number':p.driversLicense,
  'Address at time of arrest':a.address,'Offense charged':a.offense,'Date of arrest':date(a.date,'arrest'),
  'Arrest Citation Number if known':a.citationNumber,'Date of dismissal/acquittal':date(f.dispositionDate,'disposition'),
  'County and/or municipality where arrest occurred':a.countyMunicipality,'Arresting_Agency':a.agency,
  'Case Number':c.originalCaseNumber,'Division':c.division,'PETITIONER_ADDRESS':p.address,'CITY_ST_ZIP':cityStateZip(p)
 };
 const controls={circuit:['Circuit Court Division','Division of Circuit Court'],associate:['Associate Court Division','Division of Associate Court'],municipal:['Municipal Court Division','Division of Municipal Court'],sheriff:['County Sheriffs Department',"County Sheriff's Department"],police:['Municipal Police Department','Municipal Police Department name'],mhp:['Missouri State Highway Patrol','Missouri State Highway Patrol Troop'],repository:['Criminal Records Repository'],countyProsecutor:['Prosecuting Attorney','County of Prosecuting Attorney'],municipalProsecutor:['Municipal Prosecuting Attorney','Municipality of the Municipal Prosecuting Attorney'],other:['Other Agencies','Other_Agencies_Names']};
 const checks=[f.identityBasis==='mistaken_identity'?'Petitioner was the victim of mistaken identity':"Petitioner's identifying information was used by another person",{circuit:'Circuit Court',associate:'Associate Court',municipal:'Municipal Court 2'}[c.level]];
 if(p.sex)checks.push(p.sex==='M'?'Sex_Male':'Sex_Female');
 for(const r of f.respondents){const [box,field]=controls[r.kind];if(!checks.includes(box))checks.push(box);if(field){const value=r.kind==='other'?[r.organization,r.address,r.city,r.state,r.zip].map(text).filter(Boolean).join(', '):r.label;values[field]=values[field]?[values[field],value].join('\n'):value;}}
 return fillWidgets(await loadSource('CR301.pdf',root),values,checks,'CR301.pdf');
}
export async function confidentialSheet(f,root=ROOT){
 const p=f.participant; const parties=[{...p,kind:'person'},...f.respondents];
 const pageOnes=[],audits=[]; let last;
 for(let offset=0;offset<parties.length;offset+=3){
  const checks=[];
  const vals={'CountyCity of St Louis':f.court.county,'Text1':`${fullName(p)} v. ${f.respondents[0].organization}${f.respondents.length>1?' et al.':''}`,'Submitted by':fullName(p),'Phone':p.phone,'Email Address_4':p.email};
  parties.slice(offset,offset+3).forEach((party,i)=>{
   const suffix=i?`_${i+1}`:'';
   if(party.kind==='person'&&['M','F'].includes(party.gender))checks.push([['Check Box2','Check Box3'],['Check Box4','Check Box5'],['Check Box6','Check Box7']][i][party.gender==='M'?0:1]);
   // Party codes are clerk-confirmed completion items, not inferred from role.
   vals[`Party Type Description${suffix}`]=party.kind==='person'?'Petitioner':'Respondent';
   const fields=party.kind==='person'?{'Name if a person Last':party.lastName,'First':party.firstName,'Middle':party.middleName,'DOBDOD':date(party.dateOfBirth,'DOB'),'SSN':party.ssn}:{'Organization if nonperson':party.organization};
   Object.assign(fields,{'Address':party.address,'City':party.city,'State':party.state,'Zip':party.zip,'Contact Telephone Number':party.phone,'Email Address':party.email});
   for(const [k,v]of Object.entries(fields)) vals[k+suffix]=v;
  });
  const filled=await fillWidgets(await loadSource('FI-05.pdf',root),vals,checks,'FI-05.pdf');
  const doc=await PDFDocument.load(filled.bytes,{updateMetadata:false});pageOnes.push(doc);audits.push(filled.audit);last=doc;
 }
 const assembled=stampDeterministic(await PDFDocument.create());
 // Official page 1 repeats only to supply more party slots; retain pages 2-4 once.
 for(const doc of pageOnes)assembled.addPage((await assembled.copyPages(doc,[0]))[0]);
 for(const page of await assembled.copyPages(last,[1,2,3]))assembled.addPage(page);
 const bytes=await assembled.save({useObjectStreams:false});
 return {bytes,pages:assembled.getPageCount(),audit:{source:'FI-05.pdf',partyCount:parties.length,officialPageSequence:[...pageOnes.map(()=>1),2,3,4],fills:audits}};
}
/** Static CR311: only caption/record-holder identifiers are prefilled.
 * Judicial body, judicial case-finding blank, order edits and execution stay untouched.
 */
export async function proposedOrder(f,root=ROOT){
 const doc=await loadSource('CR311.pdf',root),page=doc.getPage(0),font=await doc.embedFont(StandardFonts.Helvetica),mapped=[];
 const draw=(label,value,x,top,width,height=12)=>{
  if(!text(value))return;
  const fit=fitTextToWidget({font,text:text(value),rect:{x,y:792-top-height,width,height},minFontSize:6.5,maxFontSize:9,evaluateDeclaredMinimumSize:true});
  if(fit.outcome==='refused')throw Error(`FIELD_OVERFLOW: CR311/${label}`);
  page.drawText(text(value),{x:x+2,y:792-top-height+2,size:fit.fontSize,font});mapped.push({field:label,value:text(value),rect:[x,top,width,height],fontSize:fit.fontSize});
 };
 draw('circuit',f.court.circuit,136,39,36,14);draw('county',f.court.county,288,39,35,14);
 draw('petitioner',fullName(f.participant),40,124,315,14);
 if(!f.opensNewCase)draw('caption case number',f.court.originalCaseNumber,300,75,180,13);
 // Caption controls are not findings. Select the SAME named record holders as CR301.
 const slots={circuit:[44.5,166.5,166,159,56],associate:[44.5,184,181,176,41],municipal:[44.5,201,180,193,42],sheriff:[233,166.5,374,159,106],police:[233,184,376,176,104],mhp:[233,201,391,193,80],repository:[233,218],countyProsecutor:[44.5,267.5,100,260,130],municipalProsecutor:[44.5,285,110,277,120]};
 for(const r of f.respondents){
  if(r.kind==='other')continue;
  const [x,top,tx,tt,w]=slots[r.kind];page.drawText('X',{x:x-2.5,y:792-top-3,size:9,font});mapped.push({field:`respondent:${r.kind}`,checked:true});
  if(w)draw(`respondent label:${r.kind}`,r.label,tx,tt,w);
 }
 const other=f.respondents.filter(r=>r.kind==='other').map(r=>[r.organization,r.address,r.city,r.state,r.zip].map(text).filter(Boolean).join(', ')).join('; ');
 if(other){const lines=wrapToWidth(font,other,8,220);if(lines.length>3)throw Error('FIELD_OVERFLOW: CR311/other');lines.forEach((line,i)=>draw(`other:${i}`,line,246,246+i*11,236,12));}
 return finish(doc,new Set(),{source:'CR311.pdf',mapped,protectedBlankRegions:[{page:1,rect:[34,319,545,350],reason:'Entire judicial findings, order directions and execution block'}]});
}
export function instructionPages(f){
 return [...baseInstructionPages(f),postOrderFollowThrough()];
}
function baseInstructionPages(f){
 const p=f.participant,c=f.court||{};
 const identity=`Prepared for ${fullName(p)}. ${f.synthetic?'SYNTHETIC EXAMPLE: not an actual person or case. ':''}Route: ${f.route}.`;
 if(f.route==='automatic-on-notice')return [
  {title:'Mistaken identity: check the court record first',paragraphs:[identity,'This is the court-notice route under section 610.145.1(2), not a petition packet. No CR301, FI-05 or proposed order is generated for this selection.','Ask the clerk of the court where the charge was last pending for the dismissal entry, docket and any expungement order. Explain that another person used your identity or that you were misidentified. Ask whether the prosecutor or dismissing judicial officer provided the dismissal notice and whether an expungement order was entered. Do not represent that notice or an order already exists without checking.','Keep a copy of the order and ask which listed record holders were notified. Check that the wrong entries have been removed from the relevant records. If an entry remains, send the responsible clerk or record holder the order and identify the entry. An automatic route does not mean that you must ignore an uncorrected record.','If no order was entered or the record remains unresolved, review the participant petition/written-motion route under section 610.145.1(1) in the court where the charge was last pending. The separate petition selection provides CR301 after confirming its statements. Seek legal help for disputed identity, a contested hearing, a denial or an appeal; this packet does not litigate those issues.','Authority: Missouri Revised Statutes section 610.145.1(1)-(2), .3 and .7. Official text: https://revisor.mo.gov/main/OneSection.aspx?section=610.145']}
 ];
 const missing=[];
 for(const [label,v]of [['date of birth',p.dateOfBirth],['arrest date',f.arrest?.date],['address at arrest',f.arrest?.address],['offense charged',f.arrest?.offense],['dismissal/acquittal date',f.dispositionDate],['arresting agency',f.arrest?.agency],['original case number',c.originalCaseNumber]])if(!text(v))missing.push(label);
 return [
 {title:'Your mistaken-identity filing packet',paragraphs:[identity,`File in the court where the charge was last pending: ${c.county} County, Judicial Circuit ${c.circuit}, ${c.level} court${c.division?`, Division ${c.division}`:''}. Prior case: ${c.originalCaseNumber||'verify with the clerk'}. Do not use an unrelated court or a case-number guess. The sample case number is not a usable court identifier.`,
 'This CR301 route addresses charges brought under your identity because someone used your identifying information or because you were mistaken for someone else, with all resulting charges dismissed or a not-guilty finding. It is not ordinary arrest expungement, conviction expungement, or the separate identity-theft record-correction procedure under section 575.120.',
 'For a dismissal involving stolen or mistaken identity, first ask the clerk whether the prosecutor or judicial officer provided notice and whether the court already entered the automatic expungement order under section 610.145.1(2). Do not file a duplicate petition merely because the process is called automatic. If that route has not resolved the matter, review the petition route with the clerk.',
 `Included: CR301 petition; ${needsConfidentialSheet(f)?(f.opensNewCase?'FI-05 confidential filing sheet because a new case is selected':'FI-05 confidential filing sheet because the receiving clerk requires it in the existing case'):'no FI-05 because the original case is selected'}; ${f.proposedOrderRequested?'CR311 proposed judgment because the court requests one':'no CR311 because the court does not request a proposed order'}; these instructions. FI-05 includes all four official pages and extra copies of its party page when needed.`,
 'CR311 is only an unsigned proposed order. Printed court language is not a decision. No judge signature, judicial date, finding, hearing event, service return or notarial act has been supplied. Do not sign or date the order.']},
 {title:'Check, complete and file',paragraphs:[
 'Compare CR301 against the docket, dismissal entry or acquittal judgment, arrest record and your identification. Request copies from the clerk who holds the case. These records help establish the facts; do not invent an arrest citation, social security number, license number or court identifier. Bring relevant records to the hearing and follow the court\'s directions about filing attachments.',
 missing.length?`Still needed before filing, unless the clerk confirms an item does not apply: ${missing.join('; ')}.`:'The principal case-detail fields have been supplied in this example. Confirm each against the actual records before signing.',
 'Optional or unavailable identifiers remain blank, not zero, NONE or guessed text. The arrest-citation field says "if known." Supply other reasonably available personal identifiers as directed by the form and clerk. Race and sex are not inferred. Unsupported values are not coerced into a checkbox. Verify privacy/redaction handling before filing a form containing sensitive identifiers.',
 'Name all known agencies or officials holding affected entries. Check respondent names against the records; obtain their correct addresses from the clerk or agency where service requires them. FI-05 is confidential: give it to the clerk through the designated confidential channel, not as a public exhibit. Complete reasonably available party details and confirm the blank case-type and party-type codes with the clerk before filing. The unredacted-document-attached box stays unchecked unless that document is actually attached.',
 'Use the clerk\'s confirmed filing location and method for the court identified on page 1. Ask whether this proceeds under the original case number or a new filing, whether FI-05 or a proposed order is expected, how many copies to supply, and how notice/service is handled locally. Leave new case assignment, ORI, judge assignment and file-stamp spaces for the clerk. No mailing address or e-filing access is assumed.',
 'Review CR301\'s statements before personally signing its penalty-of-perjury declaration. This held CR301 has no notarial jurat. Do not add a fabricated notarization or sign for anyone else. Keep a filed copy and proof of any delivery you actually make. These instructions are not a certificate of service.']},
 {title:'Notice, hearing and follow-through',paragraphs:[
 'Section 610.145.1(1) provides notice to the prosecuting attorney and a court hearing. Ask the clerk for the actual hearing date, notice procedure and any additional steps the court requires. The CR301 clerk instruction directs notice to the prosecuting attorney. Do not fill a notice date or claim service occurred merely because the packet was prepared.',
 'Section 610.145.3 says expungement costs under this chapter are not taxed against the eligible person. Do not import ordinary conviction-expungement fees, waiting periods or fingerprint requirements into this route. If a charge is requested, ask the clerk to identify its basis and explain section 610.145.3. GN10 is not an automatic component of this family; no fees-paid or indigency declaration is fabricated.',
 'Bring the actual dismissal/acquittal record and any reliable material showing the identity error. The judge, not this packet, determines entitlement. For prosecutor opposition, contested identity evidence, a denial, appeal or a need to litigate further, stop the automated self-help litigation steps and take the packet, docket, notices and evidence to legal aid or counsel. General preparation and locating legal help may continue.',
 'After an order is entered, obtain a copy and ask the clerk which named officials and agencies received it. Verify corrections with each relevant record holder. Report any remaining specific entry with a copy of the actual order; do not treat the proposed CR311 as an issued order. Section 610.145 also addresses related administrative records. Keep your copy securely.',
 'Forms in this packet: CR301 and, when selected, CR311 (OSCA 07-17), plus FI-05 (SJRC 04-23 with a 07-23 case-type page). Ask the clerk whether a newer edition or a local filing instruction applies before submitting. The official authorities below explain the route; the packet itself is not a court ruling.',
 'Authority: https://revisor.mo.gov/main/OneSection.aspx?section=610.145\nOfficial form index: https://www.16thcircuit.org/miscellaneous-forms']}
 ];
}
async function instructions(f){
 const doc=stampDeterministic(await PDFDocument.create()),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),pages=instructionPages(f);
 pages.forEach((section,index)=>{
  const page=doc.addPage([612,792]);page.drawText('LEGALEASE | MISSOURI', {x:44,y:749,size:10,font:bold});
  page.drawText(section.title,{x:44,y:721,size:17,font:bold});let y=693;
  for(const paragraph of section.paragraphs){for(const block of paragraph.split('\n')){
   const lines=wrapToWidth(font,block,10,524);
   for(const line of lines){if(y<55)throw Error(`INSTRUCTIONS_OVERFLOW: page ${index+1}`);page.drawText(line,{x:44,y,size:10,font});y-=13.3;}
  }y-=10;}
  page.drawText(`Instructions ${index+1} of ${pages.length} | Keep separate from court forms`,{x:44,y:28,size:8,font});
 });
 return {bytes:await doc.save({useObjectStreams:false}),pages:pages.length,audit:{source:'participant-instructions',judicialDecision:false}};
}
export async function buildPacket(input,root=ROOT){
 const f=importFacts(input),components=[];
 if(f.route==='petition'){
  components.push({id:'CR301',...await petition(f,root)});
  if(needsConfidentialSheet(f))components.push({id:'FI-05',...await confidentialSheet(f,root)});
  if(f.proposedOrderRequested)components.push({id:'CR311',...await proposedOrder(f,root)});
 }
 components.push({id:'instructions',...await instructions(f)});
 const doc=stampDeterministic(await PDFDocument.create()),coverage=[];let start=1;
 for(const component of components){const d=await PDFDocument.load(component.bytes,{updateMetadata:false});for(const page of await doc.copyPages(d,d.getPageIndices()))doc.addPage(page);coverage.push({component:component.id,firstPage:start,lastPage:start+component.pages-1,pages:component.pages,sha256:hash(component.bytes),audit:component.audit});start+=component.pages;}
 const bytes=await doc.save({useObjectStreams:false});
 return {bytes,components,coverage,pages:doc.getPageCount(),facts:f};
}
export async function buildFamily({root=ROOT,outDir=path.join(root,OUTPUT_DIR)}={}){
 const helper=path.join(root,'scripts/rcap-packet-recovery/chat7');
 const fixtures={canonical:JSON.parse(await fs.readFile(path.join(helper,'canonical.json'),'utf8')),boundary:JSON.parse(await fs.readFile(path.join(helper,'boundary.json'),'utf8'))};
 // Fail before mutating any output when source custody differs.
 for(const name of Object.keys(SOURCES))await loadSource(name,root);
 await fs.mkdir(path.join(outDir,'instructions'),{recursive:true});const manifest={schemaVersion:1,familyId:FAMILY,status:'BUILT_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED',rasterAdmission:'PENDING_CHAT_A',variants:[]};
 const write=(name,data)=>fs.writeFile(path.join(outDir,name),data);
 const writeGuide=(name,facts)=>write(`instructions/${name}.md`,instructionPages(facts).map(x=>`# ${x.title}\n\n${x.paragraphs.join('\n\n')}`).join('\n\n')+'\n');
 for(const [fixture,input]of Object.entries(fixtures)){
  await write(`${fixture}.fixture.json`,json(input));
  for(const opensNewCase of [false,true])for(const proposedOrderRequested of [false,true]){
   const facts={...input,opensNewCase,proposedOrderRequested};const result=await buildPacket(facts,root);
   const name=`${fixture}.${opensNewCase?'new-case':'existing-case'}.${proposedOrderRequested?'with-order':'no-order'}`;
   await writeGuide(name,result.facts);await write(`${name}.packet.pdf`,result.bytes);await write(`${name}.coverage.json`,json(result.coverage));
   manifest.variants.push({id:name,packet:`${name}.packet.pdf`,sha256:hash(result.bytes),pages:result.pages,components:result.coverage.map(({component,firstPage,lastPage,pages})=>({component,firstPage,lastPage,pages}))});
   if(opensNewCase&&proposedOrderRequested){await write(`${fixture}.packet.pdf`,result.bytes);for(const c of result.components)await write(`${fixture}.${c.id}.pdf`,c.bytes);}
  }
 }
 for(const [fixture,input]of Object.entries(fixtures))for(const proposedOrderRequested of [false,true]){
  const result=await buildPacket({...input,opensNewCase:false,confidentialSheetRequired:true,proposedOrderRequested},root);
  const name=`${fixture}.existing-case.clerk-requires-sheet.${proposedOrderRequested?'with-order':'no-order'}`;
  await writeGuide(name,result.facts);await write(`${name}.packet.pdf`,result.bytes);await write(`${name}.coverage.json`,json(result.coverage));
  manifest.variants.push({id:name,packet:`${name}.packet.pdf`,sha256:hash(result.bytes),pages:result.pages,components:result.coverage.map(({component,firstPage,lastPage,pages})=>({component,firstPage,lastPage,pages}))});
 }
 const automatic={...fixtures.boundary,route:'automatic-on-notice'};const auto=await buildPacket(automatic,root);
 await writeGuide('automatic-on-notice',auto.facts);
 await write('automatic-on-notice.fixture.json',json(automatic));await write('automatic-on-notice.packet.pdf',auto.bytes);
 manifest.variants.push({id:'automatic-on-notice',packet:'automatic-on-notice.packet.pdf',sha256:hash(auto.bytes),pages:auto.pages,components:auto.coverage.map(({component,firstPage,lastPage,pages})=>({component,firstPage,lastPage,pages}))});
 await write('post-order-follow-through.md',instructionPages(fixtures.canonical).slice(-1).map(x=>`# ${x.title}\n\n${x.paragraphs.join('\n\n')}`).join('\n\n')+'\n');
 await write('participant-instructions.md',instructionPages(fixtures.canonical).map(x=>`# ${x.title}\n\n${x.paragraphs.join('\n\n')}`).join('\n\n')+'\n');
 await write('source-manifest.json',json({sources:SOURCES,authorityChecked:'2026-09-07',authorityUrl:'https://revisor.mo.gov/main/OneSection.aspx?section=610.145',editionCheck:'Held editions inspected in full. Current official 16th Circuit index identifies CR301. Fresh byte-for-byte retrieval from courts.mo.gov was not established; do not construe custody hashes as legal approval.'}));
 await write('packet-manifest.json',json(manifest));
 return manifest;
}
