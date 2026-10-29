/** Server-only Form5 writer. Explicit pinned source bytes; no filesystem, corpus lookup, cwd change or build on import. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fitTextToWidget} from '../../../../scripts/rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten,scanBytesForActiveContent} from '../../../../scripts/rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata,carryDates} from '../../../../scripts/rcap-official-forms/rcap-official-form-finalize.mjs';
import {validateIowa7251Facts} from '../../rcap-engine/iowa-7251-native.mjs';
const require=createRequire(import.meta.url);
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const FAMILY_ID='ia-7251-set';
const FORM_ID='Rule 2.86 Form 5';
const FIXED_DATE=new Date('2026-09-04T00:00:00.000Z');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const SOURCE = Object.freeze({
  sourceId: `official-form:${FORM_ID}`,
  path: "STATES/IA/02_PACKET_FORMS/IA__FORM__RULE-2.86-FORM-5__rule-2-86-form-5-application-to-expunge-prostitution-court-records-under-iowa-code-section__REV-2024-08__EN.pdf",
  sha256: "ed46614b0b182dca05020009f1add549e07ac7d0bbd7328bbd9cc7ae26934cef"
});
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const dateParts = f => {const [year,month,day]=f.convictionDate.split("-");return {year,month:monthNames[Number(month)-1],day:String(Number(day))};};
// Measured source slots, PDF bottom-left coordinates. No source labels/rules
// are painted over; all text has a measured readable floor of eight points.
const WRITES = [
  {page:1,id:"filing_county",label:"County",factId:"case.filing_county",x:301,y:682,width:131,value:f=>f.county},
  {page:1,id:"other_plaintiff",label:"Other plaintiff named in the actual case",factId:"case.plaintiff",x:165,y:640.5,width:127,applicable:f=>f.plaintiff!=="State of Iowa",value:f=>f.plaintiff},
  {page:1,id:"case_number",label:"Case number",factId:"case.case_number",x:363,y:640.5,width:172,value:f=>f.caseNumber},
  {page:1,id:"defendant_name",label:"Defendant name",factId:"participant.full_legal_name",x:72,y:584,width:220,value:f=>f.name},
  {page:1,id:"conviction_7251_selected",label:"Conviction under section725.1(1)(a) or recorded equivalent",factId:"case.checked_conviction_record",x:91.5,y:394.32,width:8,value:f=>f.offense.confirmation===true?"X":null,selection:true},
  {page:1,id:"conviction_month",label:"Conviction month",factId:"case.conviction_date",x:108,y:371,width:71,value:f=>dateParts(f).month},
  {page:1,id:"conviction_day",label:"Conviction day",factId:"case.conviction_date",x:189,y:371,width:27,value:f=>dateParts(f).day},
  {page:1,id:"conviction_year",label:"Conviction year",factId:"case.conviction_date",x:225,y:371,width:40,value:f=>dateParts(f).year},
  {page:1,id:"no_disqualifying_conviction_selected",label:"No disqualifying conviction in actual two-year window",factId:"case.validated_complete_history",x:91.5,y:304.2,width:8,value:f=>f.historyComplete===true?"X":null,selection:true},
  {page:1,id:"service_acknowledgment",label:"Service acknowledgment",factId:"participant.ackCopy",x:73.5,y:209.16,width:8,value:f=>f.ackCopy===true?"X":null,selection:true},
  {page:1,id:"confidentiality_acknowledgment",label:"Confidentiality acknowledgment",factId:"participant.ackConfidential",x:73.5,y:189.356,width:8,value:f=>f.ackConfidential===true?"X":null,selection:true},
  {page:2,id:"self_represented_name",label:"Printed participant name, not a signature",factId:"participant.full_legal_name",x:119,y:654.6,width:198,value:f=>f.name},
  {page:2,id:"mailing_address",label:"Mailing address",factId:"participant.address",x:108,y:566,width:432,value:f=>f.address},
  {page:2,id:"city",label:"City",factId:"participant.city",x:108,y:535,width:187,value:f=>f.city},
  {page:2,id:"state",label:"State",factId:"participant.state",x:306,y:535,width:115,value:f=>f.state},
  {page:2,id:"zip",label:"ZIP code",factId:"participant.zip",x:432,y:535,width:108,value:f=>f.zip},
  {page:2,id:"phone_area",label:"Telephone area code",factId:"participant.phoneAreaCode",x:114,y:503.3,width:23,value:f=>f.phoneAreaCode},
  {page:2,id:"phone_local",label:"Telephone local number and supplied extension",factId:"participant.phoneLocal",x:151,y:503.3,width:144,value:f=>f.phoneLocal},
  {page:2,id:"email",label:"Email address",factId:"participant.email",x:306,y:503.3,width:234,value:f=>f.email}
];

async function packetFor(sourceBytes, fixtureName, input) {
  assert.equal(sha256(sourceBytes), SOURCE.sha256, "Wrong Form5 source bytes");
  const {facts} = validateIowa7251Facts(input);
  const pdf = await PDFDocument.load(sourceBytes, {updateMetadata:false});
  assert.equal(pdf.getPageCount(), 2, "Rule 2.86 Form 5 must remain a two-page filing plus service certificate");
  assert.equal(pdf.getForm().getFields().length, 0, "Rule 2.86 Form 5 must remain the measured flat source");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const actualWrites = [], blankFields = [];
  for (const row of WRITES) {
    if(row.applicable&&!row.applicable(facts)) continue;
    const text = row.value(facts);
    if(text===null){blankFields.push({fieldId:`${FORM_ID}:${row.id}`,fieldName:row.id,effectiveLabel:row.label,documentId:FORM_ID,page:row.page,
      completenessDisposition:"REQUIRED_BEFORE_FILING",requiredBeforeFiling:true,factAvailable:false,reason:"The participant supplied an explicit unknown or has not made this acknowledgment. Complete truthfully before filing; no value or certification was invented."});continue;}
    let size=9;
    if(!row.selection){const fit=fitTextToWidget({font,text,rect:{x:row.x,y:row.y-2,width:row.width,height:12},maxFontSize:9,minFontSize:8,evaluateDeclaredMinimumSize:true});
      assert.notEqual(fit.outcome,"refused",`Unreadable supplied fact: ${row.id}`);size=fit.fontSize;}
    pdf.getPage(row.page - 1).drawText(text, { x: row.x, y: row.y, size, font, color: rgb(0, 0, 0), maxWidth: row.width });
    actualWrites.push({ fieldId: `${FORM_ID}:${row.id}`, fieldName: row.id, effectiveLabel: row.label, documentId: FORM_ID, page: row.page, factId: row.factId, drawnText: text, rect: { x: row.x, y: row.y-2, width: row.width, height: 12 }, fontSize: size });
  }
  pdf.setTitle(`${FAMILY_ID} ${fixtureName}`);
  pdf.setAuthor("LegalEase packet factory");
  pdf.setCreator("LegalEase deterministic flat-form builder");
  pdf.setProducer("pdf-lib 1.17.1");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  const {clean,report:sanitation}=await sanitizeAndFlatten(pdf,{defaultFont:font});
  preserveSourceMetadata(pdf,clean);carryDates(pdf,clean);
  const bytes = Buffer.from(await clean.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  const scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&scan.hits.length===0,"Active content survived finalization");
  const reopened=await PDFDocument.load(bytes,{updateMetadata:false});assert.equal(reopened.getForm().getFields().length,0);
  return { bytes, actualWrites, sanitation, blankFields };
}

export {packetFor,WRITES,SOURCE};
