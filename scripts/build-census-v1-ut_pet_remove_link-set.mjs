#!/usr/bin/env node
// Exclusive PF01 Utah search-link remedy. No shared registry or runtime writes.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sanitizeAndFlatten, scanBytesForActiveContent } from './rcap-official-forms/rcap-active-content.mjs';
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FAMILY_ID = 'ut_pet_remove_link-set';
const OUT = 'data/rcap-all50/overlays/census-v1/ut/ut-pet-remove-link-set--official-pdf-fill';
const OWN = 'data/rcap-grade-a/packet-factory-24h/pf01/ut-remove-link-continuation-20260913';
const PRIOR = 'data/rcap-grade-a/packet-factory-24h/pf01/rows-pf01-ut-pet-remove-link-20260913.json';
const DECISION = 'data/rcap-grade-a/source-wave-integration/UT_REMOVE_LINK_NEXT_BLOCKER_2026-09-11.json';
const REGISTRY = 'data/record-clearing/legal-design-track-registry.json';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const write = (p,v) => { fs.mkdirSync(path.dirname(path.join(ROOT,p)),{recursive:true});fs.writeFileSync(path.join(ROOT,p), typeof v==='string'||Buffer.isBuffer(v)?v:JSON.stringify(v,null,2)+'\n'); };
const fixedDate = new Date('2026-09-13T00:00:00Z');
export function selectRemoveLinkForms(input) {
  if (!['judge','commissioner'].includes(input?.judgeOrCommissioner) || !['clerk-confirmed','court-confirmed'].includes(input?.factSource))
    return { status:'configuration_ambiguous', generateFilingPacket:false, reason:'clerk-confirmation-required', forms:[] };
  return { status:'selected', generateFilingPacket:true, reason:'confirmed-deciding-officer', forms:input.judgeOrCommissioner==='judge'?['1501CR','1502CR','1110GE']:['1501CR-C','1502CR','1111GE'] };
}
export function eligibilityGate(input) {
  const selection=selectRemoveLinkForms(input); if(!selection.generateFilingPacket)return selection;
  for(const key of ['caseDismissed','dismissalOrderObtained','courtConfirmed','identityConfirmed']) if(input[key]!==true)return {status:'STOP',generateFilingPacket:false,reason:`confirm-${key}`,forms:[]};
  for(const key of ['appealFiled','domesticViolenceCharge','unpaidCaseObligations','pendingNonTrafficCase','currentSupervision','activeProtectiveOrder']) if(input[key]!==false)return {status:'STOP',generateFilingPacket:false,reason:`resolve-${key}`,forms:[]};
  if(input.caseKind!=='criminal')return {status:'STOP',generateFilingPacket:false,reason:'civil-branch-outside-scope',forms:[]};
  const validDate=s=> typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  if(!validDate(input.dismissalDate)||!validDate(input.asOf)||(Date.parse(input.asOf)-Date.parse(input.dismissalDate))/86400000<30)return {status:'STOP',generateFilingPacket:false,reason:'dismissal-date-or-30-day-wait',forms:[]};
  for(const key of ['name','address','cityStateZip','phone','email','county','judicialDistrict','courtAddress','plaintiff','caseNumber','judge','dob'])if(typeof input[key]!=='string'||!input[key].trim())return {status:'STOP',generateFilingPacket:false,reason:`missing-${key}`,forms:[]};
  if(!['district','justice'].includes(input.courtType))return {status:'STOP',generateFilingPacket:false,reason:'confirm-court-type',forms:[]};
  return selection;
}
const baseFacts={caseKind:'criminal',caseDismissed:true,dismissalOrderObtained:true,courtConfirmed:true,identityConfirmed:true,appealFiled:false,domesticViolenceCharge:false,unpaidCaseObligations:false,pendingNonTrafficCase:false,currentSupervision:false,activeProtectiveOrder:false,dismissalDate:'2026-08-01',asOf:'2026-09-13',name:'Jordan Avery Morgan',address:'125 Example Avenue',cityStateZip:'Salt Lake City, UT 84111',phone:'801-555-0142',email:'jordan.morgan@example.test',courtType:'district',judicialDistrict:'Third',county:'Salt Lake',courtAddress:'450 South State Street, Salt Lake City, UT 84111',plaintiff:'State of Utah',caseNumber:'251900123',judge:'Taylor Example',dob:'1990-04-12',aliases:[],alsoWantsExpungement:true};
const boundaryFacts={...baseFacts,name:'Alexandrina Katherine Montgomery Reyes',address:'12875 West Example Meadows Boulevard, Apt 204',cityStateZip:'West Valley City, UT 84120-1234',phone:'801-555-0198',email:'alexandrina.montgomery.reyes@example.test',courtType:'justice',caseNumber:'251900987-CR-REM',judge:'Alexandra Elizabeth Sample',dob:'1988-11-23',aliases:['Alexandrina Katherine Montgomery'],alsoWantsExpungement:false};
export const FIXTURES=Object.freeze([
  {fixture:'canonical',...baseFacts,judgeOrCommissioner:'judge',factSource:'clerk-confirmed'},
  {fixture:'boundary',...boundaryFacts,judgeOrCommissioner:'judge',factSource:'court-confirmed'},
  {fixture:'commissioner-canonical',...baseFacts,judgeOrCommissioner:'commissioner',factSource:'court-confirmed',commissioner:'Casey Example'},
  {fixture:'commissioner-boundary',...boundaryFacts,judgeOrCommissioner:'commissioner',factSource:'clerk-confirmed',commissioner:'Alexandra Catherine Sample'}
]);
// Coordinates use original PDF points, with top-origin baseline, measured from
// the exact source's pdftotext bounding boxes. All protected source ink remains.
const field=(id,page,x,baseline,width,key,disposition='AUTO_FILL')=>({blankId:id,page,x,baseline,width,height:12,key,disposition});
const control=(id,page,x,baseline,key,value,disposition='AUTO_SELECT')=>({...field(id,page,x,baseline,6,key,disposition),selectionId:id,value,height:7});
function census(form) {
  let a=[]; const add=(...v)=>a.push(field(...v)); const c=(...v)=>a.push(control(...v));
  const contact=(x,ys,width=222)=>['name','address','cityStateZip','phone','email'].forEach((k,i)=>add(k,1,x,ys[i]-4,width,k));
  const caption=(x,pl,def,rx,cs,j)=>{add('plaintiff',1,x,pl,242,'plaintiff');add('defendant',1,x,def,242,'name');add('caseNumber',1,rx,cs,200,'caseNumber');add('judge',1,rx,j,200,'judge');};
  if(['1501CR','1501CR-C'].includes(form)) {
    const d=form==='1501CR-C'?36:0;
    contact(73,[89.7+d,117.4+d,145+d,172.7+d,203.2+d]);
    c('respondent',1,101,229+d,'selfRepresented',true);c('attorney',1,220,229+d,null,null,'ACTOR_PROTECTED');add('barNumber',1,450,227+d,54,null,'ACTOR_PROTECTED');
    c('district',1,228.6,260+d,'courtType','district');c('justice',1,295.3,260+d,'courtType','justice');
    add('judicialDistrict',1,156,283+d,64,'judicialDistrict');add('county',1,310,283+d,103,'county');add('courtAddress',1,169,309+d,352,'courtAddress');
    caption(73,369+d,432+d,331,form==='1501CR'?449:499,form==='1501CR'?486:536);
    c('criminalDismissal',1,147.6,594.5+(form==='1501CR-C'?49.8:0),'caseKind','criminal');c('civilDenied',1,147.6,614.3+(form==='1501CR-C'?49.8:0),null,null,'OUTSIDE_ROUTE');
    const s=form==='1501CR-C'?87.6:0;
    add('signedAt',2,119,176+s,295,null,'MANUAL_EVENT');add('signature',2,337,205+s,195,null,'SIGNATURE_PROTECTED');add('signatureDate',2,73,206+s,174,null,'SIGNATURE_PROTECTED');add('printedName',2,337,229+s,194,'name');
  } else if(form==='1502CR') {
    contact(68,[125.7,153.4,181,208.7,239.2]);
    c('district',1,224,286,'courtType','district');c('justice',1,289,286,'courtType','justice');
    add('judicialDistrict',1,151,309,64,'judicialDistrict');add('county',1,305,309,103,'county');add('courtAddress',1,164,335,352,'courtAddress');
    caption(68,379,439,326,480,517);
    for(const [id,p,x,y]of [['findingCriminal',1,139,704],['findingCivil',2,139,119],['findingNoAppeal',2,111,159],['findingNoDV',2,111,185],['grant',2,197,262],['deny',2,268,262],['removeLink',2,111,288]])c(id,p,x,y,null,null,'COURT_PROTECTED');
    add('orderDate',2,69,413,178,null,'COURT_PROTECTED');add('judgeSignature',2,337,413,195,null,'COURT_PROTECTED');add('judgePrintedName',2,337,435,195,null,'COURT_PROTECTED');
  } else if(form==='1110GE') {
    contact(60,[122,153.2,184.5,218.8,250.1],235);
    c('respondent',1,204,270.3,'selfRepresented',true);c('plaintiffRole',1,100,270.3,null,null,'OUTSIDE_ROUTE');
    for(const [id,x,y]of [['plaintiffAttorney',99,289],['defendantAttorney',274,289],['plaintiffLPP',99,309],['defendantLPP',99,325]])c(id,1,x,y,null,null,'ACTOR_PROTECTED');
    add('attorneyBarNumber',1,510,290,37,null,'ACTOR_PROTECTED');add('lppBarNumber',1,510,326,37,null,'ACTOR_PROTECTED');
    c('district',1,228,353,'courtType','district');c('justice',1,296,353,'courtType','justice');
    add('judicialDistrict',1,166,381,80,'judicialDistrict');add('county',1,338,381,120,'county');add('courtAddress',1,163,409,388,'courtAddress');
    caption(71,509,569,314,509,546);add('commissionerDomestic',1,314,583,219,null,'NOT_APPLICABLE');
    c('hearingRequestedHeading',1,316,488,null,null,'MANUAL_EVENT');
    add('motionName',1,180,630,217,'motionShortName');add('motionFiledDate',1,146,655,100,null,'MANUAL_EVENT');
    // The opposition choices are printed across a page break; do not move them.
    c('oppositionNotFiled',1,101,725,null,null,'MANUAL_EVENT');c('oppositionFiled',1,199,725,null,null,'MANUAL_EVENT');add('oppositionDate',2,286,153,170,null,'MANUAL_EVENT');
    for(const [id,y]of [['reply',185],['stipulation',233]]){c(id+'NotFiled',2,101,y,null,null,'MANUAL_EVENT');c(id+'Filed',2,199,y,null,null,'MANUAL_EVENT');add(id+'Date',2,286,y,170,null,'MANUAL_EVENT');}
    c('hearingYes',2,101,278,null,null,'MANUAL_EVENT');c('hearingNo',2,254,278,null,null,'MANUAL_EVENT');
    add('signedAt',2,102,403,289,null,'MANUAL_EVENT');add('signature',2,332,441,218,null,'SIGNATURE_PROTECTED');add('signatureDate',2,59,444,186,null,'SIGNATURE_PROTECTED');add('printedName',2,332,463,218,'name');
    add('attorneySignature',2,332,541,218,null,'ACTOR_PROTECTED');add('attorneyDate',2,59,544,186,null,'ACTOR_PROTECTED');add('attorneyPrintedName',2,332,566,218,null,'ACTOR_PROTECTED');
  } else if(form==='1111GE') {
    contact(73,[128,155.8,183.5,211.2,241.6]);
    c('district',1,223.5,273,'courtType','district');c('justice',1,290,273,'courtType','justice');
    add('judicialDistrict',1,151,298,64,'judicialDistrict');add('county',1,305,298,103,'county');add('courtAddress',1,164,324,352,'courtAddress');
    caption(68,395,461,326,393,431);add('commissionerDomestic',1,326,468,201,null,'NOT_APPLICABLE');
    add('toPetitioner',1,73,533,457,'plaintiff');add('toRespondent',1,73,570,457,'name');
    add('hearingSubjectEnglish',1,296,611,228,null,'COURT_SCHEDULE_REQUIRED');add('hearingSubjectSpanish',1,332,644,199,null,'COURT_SCHEDULE_REQUIRED');add('hearingLocation',1,73,708,460,null,'COURT_SCHEDULE_REQUIRED');
    add('hearingDate',2,151,118,150,null,'COURT_SCHEDULE_REQUIRED');add('hearingTime',2,389,118,73,null,'COURT_SCHEDULE_REQUIRED');c('am',2,468,118,null,null,'COURT_SCHEDULE_REQUIRED');c('pm',2,514,118,null,null,'COURT_SCHEDULE_REQUIRED');add('room',2,153,144,149,null,'COURT_SCHEDULE_REQUIRED');add('hearingOfficer',2,313,170,224,null,'COURT_SCHEDULE_REQUIRED');
    add('signature',3,360,370,172,null,'SIGNATURE_PROTECTED');add('signatureDate',3,73,374,195,null,'SIGNATURE_PROTECTED');add('printedName',3,360,392,172,'name');
  }
  const servicePage={'1501CR':4,'1501CR-C':4,'1502CR':3,'1110GE':3,'1111GE':4}[form];
  const rowCount=['1110GE','1111GE'].includes(form)?3:2;
  for(let n=1;n<=rowCount;n++)for(const k of ['recipientName','serviceAddress','serviceDate','mail','handDelivery','efile','email','businessDelivery','homeDelivery'])a.push({blankId:`service-${n}-${k}`,page:servicePage,disposition:'SERVICE_ACT_PROTECTED',key:null,selectionId:['recipientName','serviceAddress','serviceDate'].includes(k)?undefined:`service-${n}-${k}`,location:`Certificate of Service, row ${n}, ${k}`,geometryBasis:'printed table row; entire certificate protected from all writes'});
  for(const k of ['signature','date','printedName'])a.push({blankId:`service-${k}`,page:servicePage,disposition:'SERVICE_ACT_PROTECTED',key:null,location:`Certificate of Service, ${k}`,geometryBasis:'entire certificate protected from all writes'});
  return a;
}
function instructionPages(f,forms) {
  const officer=f.judgeOrCommissioner;
  return [
    ['Remove a name-to-case search link',
      'This motion asks the court that dismissed your criminal case to remove the link between your personal identifying information and that case in Utah state courts\' publicly searchable database. It does not expunge the case or clear your record. Prosecuting, arresting and other agency records are unchanged. Unless separately expunged, the case history stays public and searchable by case number. Understand these limits before paying for help or filing.',
      'The court forms and court self-help information are available without buying this packet. You may obtain them from the Utah Courts or the clerk and file yourself. This packet does not promise a court result.',
      'Before filing: obtain the dismissal order from the clerk of the district or justice court that dismissed the case. Check the dismissal date and every charge against that order. At least 30 days must have passed. No appeal may have been filed within that 30-day period, and no charge may have been a domestic violence offense under Utah Code 77-36-1. If an appeal has been filed or you are unsure, stop and obtain legal help; the printed motion declares that no appeal has been filed.',
      'Stop if a charge was or may have been domestic violence, if the case is unfinished, or if the request concerns a denied civil protective order or stalking injunction. Although the official forms also print that civil option, this criminal-case packet does not select or implement it. Resolve unpaid case fines, fees, restitution or interest; a pending non-traffic criminal case; current incarceration, probation or parole; or an active civil/criminal protective order or criminal stalking injunction before using this adopted self-help route.',
      'Confirm every name used in the case (including former names, nicknames and aliases) and your date of birth against the court record. The published forms do not supply a separate date-of-birth or alias field. Ask the clerk how to identify any differing court-record identity; do not add private identifying information to unrelated public blanks.',
      'Removing the link can be an interim step. It does not prevent automatic expungement or a separate expungement request. A dismissal with prejudice has a separate 180-day automatic-expungement process; if automatic expungement has not occurred, a separate petition may still be available. Expungement means sealing or restricting agency access, not destruction; BCI retains an expungement file released only by court order.'],
    [`Your confirmed ${officer} branch`,
      `The ${f.factSource==='clerk-confirmed'?'clerk':'court'} confirmed that a ${officer} handles motions in this case. Use ${forms.join(' + ')}. Do not select a branch from the county or case category alone. If that confirmation is absent, conflicting or uncertain, stop and ask the clerk; no filing packet is generated until the branch is confirmed.`,
      `File in the existing dismissed case at the court shown in the caption: ${f.courtType==='district'?'District':'Justice'} Court, ${f.judicialDistrict} Judicial District, ${f.county} County; ${f.courtAddress}. Verify the court address and case number with the clerk before filing. These review-fixture facts are synthetic; use the actual case record for a real packet.`,
      'Keep the complete motion, including its bilingual responding-party notice and Certificate of Service, and proposed order 1502CR. The proposed order is caption-filled only. The judge or commissioner supplies findings, grant/deny selections, order date and signature. Do not mark those controls yourself.',
      officer==='judge'?'Judge branch: form 1110GE is titled Request to Submit for Decision (General). File the motion first, serve it, and wait until the response time has run before submitting that request. The official motion notice ordinarily gives the responding party 14 days after the motion is filed; a statute or court order can change the deadline. Record actual motion, opposition, reply and stipulation filing dates and whether a hearing was requested. Do not assert that a later filing or hearing has occurred before it happens.':'Commissioner branch: form 1111GE retains its printed 1111GEJ footer and Notice of Hearing title. Obtain the actual hearing date, time, location, room and deciding officer from the court before completing and serving the notice. The commissioner motion warns that a written response may be filed at least 14 days before the hearing. Attend the scheduled hearing; absence can lead to a decision without your input. Request an interpreter or disability accommodation from court staff when needed.',
      'Serve the prosecuting attorney under the applicable motion-service rules. This is a motion in an existing case, not first papers in a new civil action. Use the actual permitted service method and address; ask the clerk or legal help if unsure. Serve the motion and the applicable submission/hearing notice and keep proof. Complete each Certificate of Service only after the stated filing and service actually occur. Leave an order-service certificate blank until there is an actual order to serve.',
      'No filing-fee amount is established for this motion by the held route materials. Ask the clerk of the existing criminal case whether a fee is charged and its current amount. Do not assume the civil-expungement cover sheet or civil filing fee applies. If you cannot pay a fee the clerk charges, ask for the ordinary court fee-waiver process and the required application; Utah Courts lists 1306GE, Order on Motion to Waive Fees for Criminal Expungement. That order is not itself a completed waiver application. No BCI certificate application is included for this search-link motion.'],
    ['Complete and check before filing',
      'Review all typed participant contact details, the State of Utah plaintiff caption, your defendant name, case number, court level, judicial district, county, address and assigned judge. A name in a judge caption identifies the assigned judicial officer; it is not a judicial signature or a finding. The defendant/self-represented and criminal-dismissal options are selected from the recorded fixture facts. Attorney/bar-number and civil-case options remain blank.',
      `Motion ${forms[0]}, page 2: write the actual city and state or country where you sign; personally sign and date the declaration after checking its truth. Your printed name is supplied. No notarization is required by the held statute or published motion. The motion's last page is a Certificate of Service: the actual server supplies recipient, method, service address, service date, printed name, signature and date after the event.`,
      'Order 1502CR: leave all findings and outcome boxes on pages 1-2, the order date and judicial signature blank for the court. Its last-page service certificate records an actual later service event and remains blank now. Do not sign for a judge or commissioner.',
      officer==='judge'?'Request 1110GE: page 1 supplies the motion name, but its filed-on date and page 1-2 opposition/reply/stipulation dates and filing choices await the actual docket. Complete the hearing-request choices truthfully. Page 2: supply the actual signing place, signature and date. The separate attorney/LPP signature block is only for an attorney/LPP of record. Its Commissioner (domestic cases) caption is not applicable to this criminal judge branch. Page 3 records actual service.':'Notice 1111GE: page 1-2 hearing subject (including the Spanish line), courthouse location, date, time, AM/PM, room and deciding officer must match the court-issued schedule. Obtain help from the court to accurately complete the Spanish line if needed. The Commissioner (domestic cases) caption is not a place to turn a criminal case into a domestic case; the actual hearing officer belongs in page 2\'s Judge or Commissioner field. Page 3: personally sign and date; printed name is supplied. Page 4 records actual service.',
      'The dismissal order is an external document you must obtain; this packet does not create or fabricate it. No hearing is represented as scheduled and no service is certified by generating this packet. Blank later-event, actor-owned and court-owned controls are deliberately preserved. Ask the clerk which filing methods are accepted and how to retain a filed copy and obtain the entered order.',
      'Required limits and stop checks are taken from this search-link route\'s adopted record and the enclosed official forms. This is an internal diagnostic packet pending independent review and original-page raster acceptance; it does not open a commercial route.']
  ];
}
function linesFor(text,font,size,width) {const out=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(font.widthOfTextAtSize(next,size)>width){assert.ok(line,'instruction word wider than line');out.push(line);line=word;}else line=next;}if(line)out.push(line);return out;}
async function appendInstructions(doc,f,forms) {
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let count=0;
  for(const [title,...paragraphs]of instructionPages(f,forms)) {
    let page=doc.addPage([612,792]),y=744;count++;
    page.drawText(title,{x:48,y,size:15,font:bold}); y-=27;
    for(const paragraph of paragraphs){const lines=linesFor(paragraph,font,10.5,516);assert.ok(y-lines.length*14>55,`instruction page overflow ${title}`);for(const line of lines){page.drawText(line,{x:48,y,size:10.5,font});y-=14;}y-=10;}
    page.drawText(`Utah search-link instructions | ${f.fixture} | ${count}/3`,{x:48,y:30,size:8,font});
  }
  return count;
}
async function main() {
  process.chdir(ROOT);
  const claim=spawnSync('node',['scripts/grade-a-packet-factory-24h/claim.mjs','--assert','PF01',FAMILY_ID],{encoding:'utf8'});assert.equal(claim.status,0,claim.stderr||claim.stdout);
  const sources=read(PRIOR).sourceBinding.queuePinnedSources.map(s=>{const b=fs.readFileSync(s.declaredPath);assert.equal(sha(b),s.sha256,s.sourceId+' source drift');return {sourceId:s.sourceId,formNumber:s.sourceId.replace('official-form:',''),path:s.declaredPath,sha256:s.sha256,byteLength:b.length};});
  assert.equal(sources.length,5);assert.ok(fs.existsSync(DECISION));
  const track=read(REGISTRY).tracks.find(t=>t.trackId==='ut_pet_remove_link');assert.ok(track);
  const documents=[];const sourceDocs=new Map();
  for(const s of sources){const d=await PDFDocument.load(fs.readFileSync(s.path));assert.equal(d.getForm().getFields().length,0);sourceDocs.set(s.formNumber,d);documents.push({...s,sourceSha256:s.sha256,pageCount:d.getPageCount(),structuralClass:'flat_official_pdf',fields:census(s.formNumber)});}
  const allWrites=[],artifacts=[],savedChecks=[];
  for(const f0 of FIXTURES) {
    const f={...f0,selfRepresented:true,motionShortName:'Remove Link to Personal Identifying Information'};const gate=eligibilityGate(f);assert.equal(gate.generateFilingPacket,true,JSON.stringify(gate));
    const doc=await PDFDocument.create();doc.setCreationDate(fixedDate);doc.setModificationDate(fixedDate);doc.setProducer('LegalEase UT remove-link diagnostic official PDF overlay');
    const font=await doc.embedFont(StandardFonts.Helvetica);const pageManifest=[];const writes=[];
    for(const form of gate.forms){const src=documents.find(d=>d.formNumber===form);const offset=doc.getPageCount();for(const p of await doc.copyPages(sourceDocs.get(form),sourceDocs.get(form).getPageIndices()))doc.addPage(p);
      for(let p=1;p<=src.pageCount;p++)pageManifest.push({packetPage:offset+p,formNumber:form,sourcePage:p,sourceSha256:src.sha256,classification:form==='1502CR'?'PROPOSED_ORDER':'OFFICIAL_FORM'});
      for(const field of src.fields){if(!['AUTO_FILL','AUTO_SELECT'].includes(field.disposition))continue;let text=field.selectionId?(f[field.key]===field.value?'X':''):f[field.key];if(!text)continue;const p=doc.getPage(offset+field.page-1);let size=field.selectionId?7:10;
        while(font.widthOfTextAtSize(text,size)>field.width&&size>8)size-=0.25;assert.ok(font.widthOfTextAtSize(text,size)<=field.width,`${f.fixture}/${form}/${field.blankId}: full value does not fit`);
        const y=p.getHeight()-field.baseline;assert.ok(field.x>=0&&field.x+field.width<=p.getWidth()&&y>0&&y+size<p.getHeight());
        p.drawText(text,{x:field.x,y,size,font,color:rgb(0,0,0)});writes.push({fixture:f.fixture,formNumber:form,blankId:field.blankId,packetPage:offset+field.page,sourcePage:field.page,text,x:field.x,y,width:font.widthOfTextAtSize(text,size),boxWidth:field.width,fontSize:size,isSelection:!!field.selectionId,participantFact:field.key});
      }
    }
    const officialPages=doc.getPageCount();const instructionCount=await appendInstructions(doc,f,gate.forms);
    for(let p=1;p<=instructionCount;p++)pageManifest.push({packetPage:officialPages+p,formNumber:'UT-REMOVE-LINK-INSTRUCTIONS',sourcePage:p,classification:'PARTICIPANT_INSTRUCTIONS'});
    await sanitizeAndFlatten(doc);const bytes=await doc.save({useObjectStreams:false,addDefaultPage:false});const file=`${OUT}/fixtures/${f.fixture}.pdf`;write(file,Buffer.from(bytes));
    const reopened=await PDFDocument.load(fs.readFileSync(file));assert.equal(reopened.getPageCount(),officialPages+3);assert.equal(reopened.getForm().getFields().length,0);
    const textResult=spawnSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});assert.equal(textResult.status,0,textResult.stderr);const savedText=textResult.stdout;assert.ok(savedText.includes(f.name),`${f.fixture}: full name absent from saved PDF`);
    for(const w of writes.filter(w=>!w.isSelection)){assert.ok(savedText.replace(/\s+/g,' ').includes(w.text),`${f.fixture}: saved value absent ${w.blankId}`);}
    for(const warning of ['searchable by case number','agency records are unchanged','not expunge','before paying','domestic violence','30 days','fee-waiver','prosecuting attorney'])assert.ok(savedText.includes(warning),`saved warning absent ${warning}`);
    const active=await scanBytesForActiveContent(bytes);artifacts.push({fixture:f.fixture,file,sha256:sha(bytes),byteLength:bytes.length,pageCount:reopened.getPageCount(),officialPages,instructionPages:3,includedDocuments:gate.forms,pageManifest,activeContentScan:active,rasterPages:[],classification:'DIAGNOSTIC_NON_FILING'});
    allWrites.push(...writes);savedChecks.push({fixture:f.fixture,file,pageCount:reopened.getPageCount(),fullNamePresent:true,allDeclaredTextValuesPresent:true,declaredWrites:writes.length,protectedFieldWrites:0,sourcePageCoverage:pageManifest.filter(p=>p.sourceSha256).length,activeContentScan:active});
    write(`${OUT}/fixtures/${f.fixture}.json`,f);write(`${OUT}/instructions/${f.fixture}.md`,instructionPages(f,gate.forms).map(([h,...p])=>'# '+h+'\n\n'+p.join('\n\n')).join('\n\n'));
  }
  const refusals=[];for(const [name,patch]of [['ambiguous',{}],['unknown-officer',{judgeOrCommissioner:'unknown',factSource:'clerk-confirmed'}],['unconfirmed-judge',{judgeOrCommissioner:'judge',factSource:'inferred'}],['unconfirmed-commissioner',{judgeOrCommissioner:'commissioner',factSource:null}],['civil',{judgeOrCommissioner:'judge',factSource:'clerk-confirmed',caseKind:'civil'}],['appeal',{judgeOrCommissioner:'judge',factSource:'clerk-confirmed',appealFiled:true}],['dv-unknown',{judgeOrCommissioner:'judge',factSource:'clerk-confirmed',domesticViolenceCharge:null}],['short-wait',{judgeOrCommissioner:'judge',factSource:'clerk-confirmed',dismissalDate:'2026-09-01'}]]){const result=eligibilityGate({...baseFacts,...patch});assert.equal(result.generateFilingPacket,false,name);refusals.push({fixture:name,result,filingPacket:null});}
  write(`${OUT}/source-receipt.json`,{schemaVersion:'rcap-source-receipt/v1',familyId:FAMILY_ID,sources,documents:sources,sourceHashesExact:true,selectorDecision:{path:DECISION,sha256:sha(fs.readFileSync(DECISION))},adoptedTrack:{path:REGISTRY,trackId:track.trackId,trackSha256:sha(JSON.stringify(track))}});
  write(`${OUT}/packet-set-manifest.json`,{schemaVersion:'rcap-packet-set-manifest/v2',familyId:FAMILY_ID,components:track.packetSet.components,selector:{requiredFact:'judgeOrCommissioner',factSources:['clerk-confirmed','court-confirmed'],judge:['1501CR','1502CR','1110GE'],commissioner:['1501CR-C','1502CR','1111GE'],otherwise:'configuration_ambiguous; no filing packet'},externalRequiredDocuments:track.participantFilingRequirements,sourcePagesPreserved:true,instructionsLast:true});
  write(`${OUT}/field-census.census-v1.json`,{schemaVersion:'rcap-field-census/v1',familyId:FAMILY_ID,censusBasis:'first_hand_inspection_of_each_exact_hash_bound_source',documents:documents.map(d=>({...d,fieldCount:d.fields.length,selectionControlCount:d.fields.filter(f=>f.selectionId).length}))});
  write(`${OUT}/production-field-map.json`,{schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY_ID,maps:documents.map(d=>({formNumber:d.formNumber,sourceSha256:d.sha256,fields:d.fields,canonicalWrites:allWrites.filter(w=>w.fixture==='canonical'&&w.formNumber===d.formNumber),boundaryWrites:allWrites.filter(w=>w.fixture==='boundary'&&w.formNumber===d.formNumber)}))});
  write(`${OUT}/reports/rendered-artifacts.json`,{schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY_ID,renderedFresh:true,artifacts,pdfs:artifacts.map(a=>({...a,role:'conditional_assembled_packet',baseFixture:a.fixture.endsWith('boundary')?'boundary':'canonical',branch:a.fixture.startsWith('commissioner-')?'commissioner':'judge'}))});
  write(`${OUT}/reports/actual-writes.json`,{schemaVersion:'rcap-actual-writes/v1',familyId:FAMILY_ID,writes:allWrites,proofMethod:'pdf-lib measured write geometry plus reopened saved PDF page and pdftotext value checks; original-page visual review pending'});
  write(`${OUT}/reports/manual-blank-inventory.json`,{familyId:FAMILY_ID,rows:documents.flatMap(d=>d.fields.filter(f=>!['AUTO_FILL','AUTO_SELECT'].includes(f.disposition)).map(f=>({formNumber:d.formNumber,...f}))),participantCompletionInstructions:`${OUT}/instructions/`});
  write(`${OUT}/reports/saved-page-checks.json`,{familyId:FAMILY_ID,checks:savedChecks,refusals,finalRasterAcceptance:'PENDING'});
  write(`${OUT}/build-status.json`,{schemaVersion:'rcap-family-build-status/v1',familyId:FAMILY_ID,status:'BUILT_REVIEW_PENDING',independentVerificationStatus:'PENDING',renderedArtifacts:artifacts.length,builtDocuments:5,rasterState:'UNVERIFIED_NO_RASTER',generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0});
  write(`${OUT}/build-findings.json`,{familyId:FAMILY_ID,blocking:[],findingCount:0,observations:['Original official pages and all court/service controls preserved.','The required 1110GE Request to Submit for Decision title and 1111GEJ printed footer are unchanged.','No district-based branch guess; absent confirmed deciding-officer fact refuses packet.','No source acquisition, runtime installation, shared queue or custody writes.','Author saved-output checks only; independent semantic and original-page raster gates remain.']});
  write(`${OWN}/author-handoff.json`,{schemaVersion:'rcap-packet-build-return/v1',lane:'PF01',laneKind:'packet-build',workerId:'/root/mt_deferred_final_review',isIndependentVerification:false,status:'COMPLETED_AUTHOR_BUILD_PENDING_INDEPENDENT_REVIEW',claim:{command:'node scripts/grade-a-packet-factory-24h/claim.mjs --assert PF01 ut_pet_remove_link-set',result:claim.stdout.trim()},rows:[{itemId:FAMILY_ID,familyId:FAMILY_ID,status:'COMPLETED',jurisdiction:'UT',routeKeys:['obligation:track-only:UT:ut_pet_remove_link'],implementationStrategy:'official_pdf_fill',buildScript:'scripts/build-census-v1-ut_pet_remove_link-set.mjs',overlayDirectory:OUT,artifacts,savedPageChecks:`${OUT}/reports/saved-page-checks.json`,sourceReceipt:`${OUT}/source-receipt.json`,fieldCensus:`${OUT}/field-census.census-v1.json`,productionFieldMap:`${OUT}/production-field-map.json`,actualWrites:`${OUT}/reports/actual-writes.json`,manualBlankInventory:`${OUT}/reports/manual-blank-inventory.json`,fixtureCount:artifacts.length,totalPages:artifacts.reduce((n,a)=>n+a.pageCount,0),sourcePdfCount:5,ambiguousStopCases:refusals.length,rasterState:'UNVERIFIED_NO_RASTER',independentVerificationStatus:'PENDING'}]});
  console.log(JSON.stringify({familyId:FAMILY_ID,status:'COMPLETE_SAVED_RENDER',fixtures:artifacts.length,totalPages:artifacts.reduce((n,a)=>n+a.pageCount,0),handoff:`${OWN}/author-handoff.json`}));
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url))await main();
