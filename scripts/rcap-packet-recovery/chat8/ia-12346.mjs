/** Chat8 Form3: source-specific public-intoxication packet; never touches other families. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
import {PDFDocument,PDFTextField,PDFCheckBox,StandardFonts} from 'pdf-lib';
import {ROOT,sha256,pretty,text,dateValue,finalizedBytes,proseDocument} from './ia-901c3.mjs';
import {fitTextToWidget,applyFitToTextField} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata,carryDates} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import {extractTextItems} from '../../rcap-official-forms/rcap-pdf-anchor-capture.mjs';
export {ROOT,sha256,pretty};
export const FAMILY='ia-12346-set';
export const OUTPUT='data/rcap-all50/overlays/census-v1/ia/ia-12346-set--official-pdf-fill';
export const SOURCE='reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-3-2024-08.pdf';
export const SOURCE_SHA256='dd7685c6caf6d87979a31ce1639be6d08067a5c006a3d57eab68c1d097df49a5';
export const authorities={
 form:'https://www.iowacourts.gov/browse/files/8a0a8591f13f4c068f8502b0d8d32ebb/download',
 statute:'https://www.legis.iowa.gov/docs/code/2026/123.46.pdf',
 rules:'https://www.legis.iowa.gov/docs/ACO/CourtRulesChapter/02.pdf',
 feePractice:'https://studentlegal.uiowa.edu/know-the-law/criminal-law/expungement',
 efile:'https://www.iowacourts.gov/efile',
 routeContract:'data/record-clearing/legal-design-intake/IA.memo.json',
 routeContractBlob:'2617a0994c1daf51b92189ab99c94f107947d3d4',
 reviewedOn:'2026-09-07'
};
export function exact(o,keys,label){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(o,k)))throw Error(label+': supply exactly the stated fields, including explicit nulls');}
const contacts=['address','city','state','zip','phone','email'];
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function validateAlcoholFacts(input,section='123.46') {
 exact(input,['synthetic','name','county','caseNumber','plaintiff','convictionDate','filingDate','disposition','proceeding','offense','laterConvictions','historyComplete','selfRepresented','convictionStatementConfirmed','cleanPeriodStatementConfirmed','acknowledgedCopy','acknowledgedConfidential','courtDebtBalanceStatus','filingMethod','countyAttorney',...contacts],'facts');
 const f=structuredClone(input);
 if(typeof f.synthetic!=='boolean')throw Error('Explicit synthetic flag required');
 for(const k of ['name','county','caseNumber','plaintiff'])text(f[k],k);
 if(f.disposition!=='conviction'||f.proceeding!=='district_court')throw Error('Wrong disposition/proceeding: this is the district-court conviction route');
 for(const k of ['selfRepresented','historyComplete','convictionStatementConfirmed','cleanPeriodStatementConfirmed','acknowledgedCopy','acknowledgedConfidential'])if(f[k]!==true)throw Error('Missing or false participant confirmation: '+k);
 exact(f.offense,['kind','citation','equivalentTo','confirmation'],'offense');text(f.offense.citation,'offense citation');
 if(f.offense.confirmation!==true||f.offense.equivalentTo!==section)throw Error('Wrong or unconfirmed statutory ground');
 if(f.offense.kind==='statute'){
  const valid=section==='123.46'?/^123\.46(?:\([23]\))?$/:/^123\.47\(3\)$/;
  if(!valid.test(f.offense.citation))throw Error('Wrong statutory offense; do not infer broad alcohol eligibility');
 }else if(f.offense.kind!=='local_equivalent')throw Error('Unknown offense kind');
 if(!['paid','unpaid','unknown'].includes(f.courtDebtBalanceStatus))throw Error('Explicit court-debt status, not an invented paid statement');
 if(!['paper','efile'].includes(f.filingMethod))throw Error('Unknown filing method');
 for(const k of contacts)if(f[k]!==null)text(f[k],k);
 if(f.state!==null&&!/^[A-Z]{2}$/.test(f.state))throw Error('Invalid state');
 if(f.zip!==null&&!/^\d{5}(?:-\d{4})?$/.test(f.zip))throw Error('Invalid ZIP');
 if(f.phone!==null&&!/^\d{10}$/.test(f.phone))throw Error('Telephone must contain ten digits');
 if(f.email!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))throw Error('Invalid email');
 if(f.countyAttorney!==null){exact(f.countyAttorney,['name','address','city','state','zip'],'intended recipient');for(const [k,v]of Object.entries(f.countyAttorney))text(v,'intended recipient '+k);if(!/^[A-Z]{2}$/.test(f.countyAttorney.state)||!/^\d{5}(?:-\d{4})?$/.test(f.countyAttorney.zip))throw Error('Invalid recipient state/ZIP');}
 const conviction=dateValue(f.convictionDate),filing=dateValue(f.filingDate);
 // No automatic Feb29 rollover: a date-only anniversary ambiguity is disclosed
 // as an exact timing review, not quietly converted into a 730-day rule.
 const endText=String(conviction.getUTCFullYear()+2)+f.convictionDate.slice(4);
 let end;try{end=dateValue(endText);}catch{throw Error('Leap-day anniversary requires an explicit legal timing determination');}
 if(filing<end)throw Error('Two-year period has not expired');
 if(!Array.isArray(f.laterConvictions))throw Error('Supply an explicit complete subsequent-conviction list');
 const evaluated=[];
 for(const c of f.laterConvictions){
  exact(c,['date','citation','kind','categoryConfirmed'],'subsequent conviction');text(c.citation,'subsequent citation');
  if(!['local_traffic','chapter_321_simple','other'].includes(c.kind)||c.categoryConfirmed!==true)throw Error('Unknown subsequent-conviction category');
  const d=dateValue(c.date);if(d<conviction||d>filing)throw Error('Subsequent-conviction date is inconsistent');
  if(c.kind==='chapter_321_simple'&&!/^321\./.test(c.citation))throw Error('The traffic exception is chapter 321, not321J or an unknown chapter');
  const within=d>=conviction&&d<end;
  if(c.kind==='other'&&+d===+end)throw Error('Subsequent conviction on the exact anniversary needs timing review');
  if(within&&c.kind==='other')throw Error('Disqualifying conviction within the two-year period');
  evaluated.push({...c,withinTwoYearPeriod:within,permittedTrafficException:c.kind!=='other'});
 }
 return {facts:f,twoYearAnniversary:endText,daysFromConviction:(filing-conviction)/86400000,subsequentConvictions:evaluated,courtDebtIsNotPrecondition:true,filingReady:false};
}
export const validateFacts=f=>validateAlcoholFacts(f);
export function alcoholFixtures(section='123.46'){
 const base={synthetic:true,name:'Avery Jordan Example',county:'Johnson',caseNumber:'EXAMPLE-INT-100001',plaintiff:'State of Iowa',convictionDate:'2022-01-15',filingDate:'2026-09-07',disposition:'conviction',proceeding:'district_court',offense:{kind:'statute',citation:section==='123.46'?'123.46(2)':'123.47(3)',equivalentTo:section,confirmation:true},laterConvictions:[],historyComplete:true,selfRepresented:true,convictionStatementConfirmed:true,cleanPeriodStatementConfirmed:true,acknowledgedCopy:true,acknowledgedConfidential:true,courtDebtBalanceStatus:'unpaid',filingMethod:'paper',countyAttorney:{name:'Johnson County Attorney',address:'500 S. Clinton Street, Suite 400',city:'Iowa City',state:'IA',zip:'52244-2450'},address:'100 Example Lane',city:'Iowa City',state:'IA',zip:'52240',phone:'3195550101',email:'avery.example@example.org'};
 const b=()=>structuredClone(base);
 const all={canonical:b(),boundary:{...b(),name:'Alexandra Catherine Montgomery-Example',caseNumber:'EXAMPLE-INT-BOUNDARY',address:'9999 Example Heritage Boulevard, Apartment 1234',city:'University Heights',zip:'52246-1234',email:'alexandra.montgomery.example@example.org',convictionDate:'2024-09-07',filingMethod:'efile',countyAttorney:null,courtDebtBalanceStatus:'unknown'},'permitted-traffic':{...b(),caseNumber:'EXAMPLE-INT-TRAFFIC',laterConvictions:[{date:'2022-10-01',citation:'321.285',kind:'chapter_321_simple',categoryConfirmed:true},{date:'2023-01-01',citation:'Example local traffic ordinance',kind:'local_traffic',categoryConfirmed:true}]},'later-conviction':{...b(),caseNumber:'EXAMPLE-INT-LATER',laterConvictions:[{date:'2025-01-01',citation:'714.2(5)',kind:'other',categoryConfirmed:true}]},'local-ordinance':{...b(),caseNumber:'EXAMPLE-INT-LOCAL',plaintiff:'City of Example',offense:{kind:'local_equivalent',citation:'Example municipal alcohol ordinance',equivalentTo:section,confirmation:true}},'missing-contact':{...b(),caseNumber:'EXAMPLE-INT-MISSING',address:null,city:null,state:null,zip:null,phone:null,email:null,countyAttorney:null}};
 if(section==='123.47(3)')for(const f of Object.values(all))f.caseNumber=f.caseNumber.replace('INT','PAULA');
 return all;
}
export const fixtureFacts=()=>alcoholFixtures();
export const labels={
 'cap.01':'County of the existing court case','cap.02':'Other plaintiff named in the existing case','cap.03':'Full defendant name','cap.04':'Existing case number',
 '01.00':'Item 1: conviction under the specified alcohol ground','01.01':'Conviction month','01.02':'Conviction day','01.03':'Conviction year','02':'Item2: two-year clean-period confirmation','03.01':'Participant acknowledgment: provide county attorney a copy','03.02':'Participant acknowledgment: court record confidentiality',
 'sig.AB':'Representation election at signing','sig.a.01':'Printed participant full name','sig.a.02':'Signature month','sig.a.03':'Signature day','sig.a.04':'Signature year','sig.a.05':'Participant mailing address','sig.a.06':'Participant city','sig.a.07':'Participant state','sig.a.08':'Participant ZIP','sig.a.09':'Participant telephone area code','sig.a.10':'Participant telephone local number','sig.a.11':'Participant email',
 'cert.01':'Prepared paper-service sender full name','cert.02':'Actual service month','cert.03':'Actual service day','cert.04':'Actual service year','cert.05':'Intended paper-service recipient name','cert.06':'Intended recipient mailing address','cert.07':'Intended recipient city','cert.08':'Intended recipient state','cert.09':'Intended recipient ZIP'
};
export const fieldFacts={'cap.01':'county','cap.02':'plaintiff','cap.03':'name','cap.04':'caseNumber','01.01':'convictionDate','01.02':'convictionDate','01.03':'convictionDate','sig.a.01':'name','sig.a.05':'address','sig.a.06':'city','sig.a.07':'state','sig.a.08':'zip','sig.a.09':'phone','sig.a.10':'phone','sig.a.11':'email','cert.05':'intendedRecipient.name','cert.06':'intendedRecipient.address','cert.07':'intendedRecipient.city','cert.08':'intendedRecipient.state','cert.09':'intendedRecipient.zip'};
export function alcoholBindings(v,{manualGround=false}={}){
 const f=v.facts,w=new Map(),put=(k,value,fact)=>{if(value!==null&&value!==undefined)w.set(k,{value,fact});};
 for(const [key,k]of [['cap.01','county'],['cap.03','name'],['cap.04','caseNumber'],['sig.a.01','name'],['sig.a.05','address'],['sig.a.06','city'],['sig.a.07','state'],['sig.a.08','zip'],['sig.a.11','email']])put(key,f[k],k);
 if(f.plaintiff!=='State of Iowa')put('cap.02',f.plaintiff,'plaintiff');
 const d=dateValue(f.convictionDate);put('01.01',monthNames[d.getUTCMonth()],'convictionDate');put('01.02',String(d.getUTCDate()),'convictionDate');put('01.03',String(d.getUTCFullYear()),'convictionDate');
 if(!manualGround)put('01.00',true,'convictionStatementConfirmed');put('02',true,'cleanPeriodStatementConfirmed');put('03.01',true,'acknowledgedCopy');put('03.02',true,'acknowledgedConfidential');
 if(f.phone){put('sig.a.09',f.phone.slice(0,3),'phone');put('sig.a.10',f.phone.slice(3,6)+'-'+f.phone.slice(6),'phone');}
 if(f.filingMethod==='paper'){put('cert.01',f.name,'name (prepared sender, not actual service)');for(const [key,k]of [['cert.05','name'],['cert.06','address'],['cert.07','city'],['cert.08','state'],['cert.09','zip']])put(key,f.countyAttorney?.[k],'intendedRecipient.'+k);}
 return w;
}
export function alcoholBlank(key,type,v,{manualGround=false}={}){
 const na=reason=>({completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:reason,reason});
 const prot=reason=>({completenessDisposition:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',reason});
 if(type==='PDFButton')return {completenessDisposition:'NON_FILING_SOURCE_ELEMENT',reason:'Measured source viewer button is not a filing blank; removed with active behavior.'};
 if(key==='cap.02')return na('State of Iowa is already printed and the supplied existing caption has no different plaintiff.');
 if(key==='01.00'&&manualGround)return {completenessDisposition:'PARTICIPANT_ELECTION_GENUINE',refusalClass:'participant_sworn_narrative_or_legal_election',reason:'The adopted Form 4 contract reserves item 1 to personal confirmation of subsection 3 or a similar local ordinance. Review the exact disposition and check it personally; broad123.47 is insufficient.'};
 if(key==='sig.AB'||['sig.a.02','sig.a.03','sig.a.04','printed.signature'].includes(key))return prot('The participant must make the actual signature election, enter the real signing date and sign at execution; no inferred signature or date.');
 if(key.startsWith('sig.b.'))return na('Attorney-only block B is not used by this self-represented participant.');
 if(key.startsWith('cert.')&&v.facts.filingMethod==='efile')return na('Electronic filing selected; this is the paper mailing/delivery certificate. Verify electronic service rather than claiming paper service.');
 if(['cert.02','cert.03','cert.04'].includes(key))return prot('Actual mailing/delivery date remains unknown until service has occurred; complete only then.');
 if(key.startsWith('cert.')||key.startsWith('sig.a.'))return {completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,factAvailable:false,reason:'Explicitly unknown participant contact or intended recipient. Supply the truthful value before signing/filing or paper service; the generator did not invent it.'};
 throw Error('Unclassified source area '+key);
}
export function alcoholInstructions(v,blanks,{formNumber=3,section='123.46',manualGround=false}={}){
 const f=v.facts,missing=blanks.filter(b=>b.completenessDisposition==='REQUIRED_BEFORE_FILING');
 return [
 {heading:'1. This packet and the correct route',paragraphs:[
 `For ${f.name}, ${f.county} County, existing case ${f.caseNumber}. The first two pages are official August 2024 Rule 2.86 Form ${formNumber}; page 2 includes the paper-service certification. These instructions are not filed. No proposed order, notarization, DCI request, billing form or returned history report is required in this packet.`,
 `This is the ${formNumber===3?'public consumption/intoxication':'possession of alcohol under the legal age'} conviction route, not a dismissal, deferred judgment or general misdemeanor application. Your supplied offense is ${f.offense.citation}${f.offense.kind==='local_equivalent'?', which you confirm is a similar local ordinance':''}. Verify the existing case and original caption.`,
 ...(f.synthetic?['SYNTHETIC EXAMPLE - DO NOT FILE. All participant names, identifiers, case facts and Example ordinance labels are fictional test inputs, not real court records.']:[])
 ]},
 {heading:'2. Check the dates and intervening convictions',paragraphs:[
 `Conviction: ${f.convictionDate}. Two-year anniversary: ${v.twoYearAnniversary}. Intended filing: ${f.filingDate}. The clock starts at conviction, not sentence completion. Recheck the facts on the actual filing date.`,
 'The two-year period following conviction must contain no other criminal conviction except a local traffic violation or a simple misdemeanor under chapter 321. Not all driving offenses are exceptions: an OWI or chapter 321J charge is not automatically exempt. A later conviction outside the fixed two-year window does not restart this particular clock.',
 f.laterConvictions.length?'You reported these later convictions: '+f.laterConvictions.map(c=>`${c.date}, ${c.citation}, reported category ${c.kind}`).join('; ')+'. Review each category; the generator does not authenticate your history.':'You reported no subsequent convictions. The checked statement comes from your explicit confirmation, not a record search.',
 'Stop for legal assistance if the history is incomplete, a conviction or its category is disputed, or a conviction occurred on a timing boundary that requires a legal determination.'
 ]},
 {heading:'3. Review, complete and sign',paragraphs:[
 manualGround?'Item 1 is deliberately unchecked. Personally confirm that the conviction is under section 123.47(3) or a similar local ordinance, then check item 1 only if true. The broad section 123.47 title alone is not enough.':'Item 1 is checked only from your express conviction confirmation. Verify its date and ground; untrue or uncertain declarations must be corrected before signing.',
 'Review every checked statement and acknowledgment. Check representation election A on page 2, enter the actual signing date and sign under penalty of perjury. The printed name is not a signature. Leave attorney block B blank. Use a permitted digitized signature or print and hand-sign as the source directs. No notary block is added.',
 missing.length?'DO NOT FILE YET. Complete these known-to-be-missing areas: '+missing.map(b=>b.label).join('; ')+'. Unknown values are blank, not filled or waived.':'Your supplied contact details are entered. Update any changed details before filing. The signature/date and actual service remain real later acts.'
 ]},
 {heading:'4. File in the existing case and provide notice',paragraphs:[
 `File this application in the existing ${f.county} County district-court case, not a new case in your county of residence. Keep a copy.`+(f.county==='Johnson'?' The Johnson County Clerk of Court is at 417 South Clinton Street, Iowa City, IA 52240; telephone 319-356-6060. Confirm current filing arrangements before visiting or mailing.':' Obtain the current county clerk address from the Iowa Judicial Branch before paper filing.'),
 f.filingMethod==='efile'?'Electronic filing selected. Locate the existing case in the Iowa eFile System, submit the signed application and verify acceptance and county-attorney electronic service. The paper-service certificate remains unused. An upload alone does not prove acceptance or service.':'Paper filing selected. Use paper only when permitted, including when the case cannot be found in eFile as the form directs. File with the county clerk of court; mail or hand-deliver a copy to that county attorney. Enter the real service date on page 2 only after delivery or mailing, and follow clerk instructions for returning the completed certification.',
 f.filingMethod==='paper'?(f.countyAttorney?`Intended recipient supplied: ${f.countyAttorney.name}, ${f.countyAttorney.address}, ${f.countyAttorney.city}, ${f.countyAttorney.state} ${f.countyAttorney.zip}. Confirm the current address. Prepared recipient fields do not certify that service occurred.`:'Obtain the actual current county-attorney recipient and address before paper service. No recipient was guessed.'):'Resolve unsuccessful electronic service with the clerk or legal assistance. Do not falsely complete a paper-service certificate.',
 'Under Rule 2.83, the county attorney generally has 20 days after service to respond unless the court orders otherwise. A hearing may be set. Follow all notices; silence is not an expungement order. Opposition or a contested hearing is a self-help stopping point.'
 ]},
 {heading:'5. Costs and effect of a court order',paragraphs:[
 'Payment of court debt is not a precondition on this route under Rule 2.83(3). You reported court debt as '+f.courtDebtBalanceStatus+'. This application does not forgive debt or convert unpaid amounts into paid amounts.',
 'University of Iowa Student Legal Services states there is no filing fee for an expungement request. Confirm case-specific charges with the clerk. Postage/copies may cost money. No application-fee election or invented fee-waiver form is included.',
 'Using this separate alcohol route does not use the once-per-lifetime section 901C.3 misdemeanor expungement. The court decides the application. Keep the signed order and verify that the clerk has made the court record confidential; it is not destroyed and court-authorized access remains possible.',
 formNumber===3?'Section 123.46(6) directs DPS to remove the conviction from its criminal-history data, if maintained there, after clerk notice of the expungement. An application alone does not do that. Check the order and clerk notice; no promise is made about every police or private background-check database.':(f.offense.kind==='statute'?'Section 123.47(9) directs removal of the subsection 3 conviction from DPS criminal-history files after clerk notice.':'For a similar local ordinance, confirm the precise DPS-record effect with the court; the statutory DPS-notice language specifically refers to subsection 3. No broader removal promise is made.')+' An expunged conviction is not a prior offense for enhancement under subsection 4 or a local ordinance unless the new violation occurred before entry of the expungement order. No order or agency action is presumed here.',
 'Seek an attorney or legal aid for opposition, contested factual issues, an incorrect remedy, immigration consequences or another problem outside this self-help application. Do not miss a court deadline while seeking help.'
 ]},
 {heading:'Sources and official assistance',paragraphs:[
 `Iowa Code ${formNumber===3?'123.46(6)':'123.47(9) and (3)'} (2026); Rule 2.86 Form ${formNumber} August 2024; Iowa Rules 2.82, 2.83 and 2.84. Read your official form and court notices. These instructions do not replace legal advice.`,
 formNumber===3?authorities.form:'https://www.iowacourts.gov/browse/files/0931114ef0c149baac1e450ac738ec7a/download',
 `https://www.legis.iowa.gov/docs/code/2026/${formNumber===3?'123.46':'123.47'}.pdf`,authorities.efile,authorities.feePractice
 ]}];
}
export async function renderFixture(input,{sourceBytes}={}){
 const v=validateFacts(input),raw=sourceBytes??await fs.readFile(path.join(ROOT,SOURCE));if(sha256(raw)!==SOURCE_SHA256)throw Error('Wrong/stale Form3 source');
 const doc=await PDFDocument.load(raw,{updateMetadata:false}),fields=doc.getForm().getFields();if(doc.getPageCount()!==2||fields.length!==48)throw Error('Form3 source inventory drift');
 const font=await doc.embedFont(StandardFonts.Helvetica),bindings=alcoholBindings(v),actualWrites=[],blanks=[],fieldMap=[],sourceFields=[];
 for(const field of fields){
  const id=field.getName(),type=field.constructor.name,key=id.replace(/^2\.86-[13]\./,'');
  if((key.startsWith('sig.')||key.startsWith('cert.'))?!id.startsWith('2.86-1.'):!id.startsWith('2.86-3.'))throw Error('Unexpected Form3 field prefix');
  const widgets=field.acroField.getWidgets().map(w=>({page:doc.getPages().findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle(),flags:w.getFlags()}));
  const row={fieldId:id,sourceFieldId:id,fact:fieldFacts[key]??null,label:labels[key]??(key.startsWith('sig.b.')?'Attorney-only block B '+key:'Source viewer control '+key),type,widgets,isSelectionControl:['PDFCheckBox','PDFRadioGroup'].includes(type)};
  sourceFields.push({name:id,pdfType:type,widgets});const w=bindings.get(key);
  if(w){let fit=null;if(field instanceof PDFTextField){const max=field.getMaxLength();if(max!==undefined&&String(w.value).length>max)throw Error('Source length limit '+id);fit=fitTextToWidget({font,text:String(w.value),rect:widgets[0].rect,multiline:field.isMultiline(),maxFontSize:11,minFontSize:8,evaluateDeclaredMinimumSize:true});if(!applyFitToTextField(field,fit))throw Error('Unreadable known fact '+id);for(const z of field.acroField.getWidgets())z.setDefaultAppearance(`/Helv ${fit.fontSize} Tf 0 g`);}else if(field instanceof PDFCheckBox)field.check();else throw Error('Unexpected Form3 write type');actualWrites.push({...row,...w,fit});fieldMap.push({...row,action:'WRITE',fact:w.fact});}
  else{const why=alcoholBlank(key,type,v);if(type==='PDFButton')why.sourcePresentation={kind:'viewer_button',sourceSha256:SOURCE_SHA256,sourceField:id};const b={...row,...why};blanks.push(b);fieldMap.push({...b,action:'BLANK'});}
 }
 const sig={fieldId:'printed.signature',sourceFieldId:'printed.signature',label:'Participant signature on page 2',type:'printed_rule',widgets:[{page:2,rect:{x:306,y:580.68,width:234,height:16.44}}],...alcoholBlank('printed.signature','printed_rule',v)};blanks.push(sig);fieldMap.push({...sig,action:'BLANK'});
 if(actualWrites.length+blanks.length!==49)throw Error('Unaccounted Form3 source area');
 const {clean,report:sanitation}=await sanitizeAndFlatten(doc,{defaultFont:font,writtenFields:new Set(actualWrites.map(w=>w.fieldId)),detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true,preserveUnwrittenSelectionBackgrounds:true});preserveSourceMetadata(doc,clean);carryDates(doc,clean);
 const application=await finalizedBytes(clean),instructions=alcoholInstructions(v,blanks),guide=await proseDocument('Iowa public intoxication: next steps',instructions,{synthetic:v.facts.synthetic,subtitle:`${v.facts.name} | ${v.facts.county} County | ${v.facts.caseNumber}`});
 return assembleAlcohol({v,application,instructions,guide,actualWrites,blanks,fieldMap,sourceFields,sanitation,formNumber:3});
}
export async function assembleAlcohol({v,application,instructions,guide,actualWrites,blanks,fieldMap,sourceFields,sanitation,formNumber}){
 const components=[{id:`form-${formNumber}`,bytes:application,pages:2,fileWithCourt:true},{id:'participant-instructions',bytes:guide.bytes,pages:guide.pageCount,fileWithCourt:false}],packet=await PDFDocument.create(),coverage=[];let page=1;
 for(const c of components){const d=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const p of await packet.copyPages(d,d.getPageIndices()))packet.addPage(p);coverage.push({id:c.id,firstPacketPage:page,lastPacketPage:page+c.pages-1,pages:c.pages,sha256:sha256(c.bytes),fileWithCourt:c.fileWithCourt});page+=c.pages;}
 const read=await PDFDocument.load(application,{updateMetadata:false}),runs=read.getPages().map(extractTextItems);
 const measuredTextWrites=actualWrites.filter(w=>['PDFTextField','printed_text'].includes(w.type)).map(w=>{const z=w.widgets[0],b=z.rect,value=String(w.value).replace(/\s/g,'');const found=runs[z.page-1].filter(t=>t.x>=b.x-.1&&t.x<=b.x+b.width&&t.y>=b.y&&t.y<=b.y+b.height).map(t=>t.text).join('').replace(/\s/g,'');if(!found.includes(value))throw Error('Final output missing known text '+w.fieldId);return {fieldId:w.fieldId,value:w.value,nonWhitespaceGlyphs:value.length,method:'read emitted PDF content stream at measured source area'};});
 return {packet:await finalizedBytes(packet,`Iowa Form ${formNumber} packet`),components,coverage,pageCount:packet.getPageCount(),assessment:v,instructions,actualWrites,blanks,fieldMap,sourceFields,sanitation,measuredTextWrites};
}
export async function buildAlcoholFamily({family=FAMILY,output=OUTPUT,source=SOURCE,sourceSha=SOURCE_SHA256,formNumber=3,renderer=renderFixture,fixtures=fixtureFacts(),authorityBindings=authorities,outDir=path.join(ROOT,output)}={}){
 const write=async(p,b)=>{await fs.mkdir(path.dirname(path.join(outDir,p)),{recursive:true});await fs.writeFile(path.join(outDir,p),b);};
 const map={schemaVersion:1,familyId:family,availableFacts:{},writes:[],refusals:[]},actual={familyId:family,artifacts:[]},census={familyId:family,documents:[]},receipt={familyId:family,documents:[],sourceApproval:false},packets=[],allInstructions=[],readiness=[];
 const sourceBytes=await fs.readFile(path.join(ROOT,source));if(sha256(sourceBytes)!==sourceSha)throw Error('Wrong source before build');
 for(const [fixture,facts]of Object.entries(fixtures)){
  for(const [k,value]of Object.entries(facts))if(value!==null&&['string','number','boolean'].includes(typeof value))map.availableFacts[`${fixture}:${k}`]=value;
  if(facts.countyAttorney)for(const [k,value]of Object.entries(facts.countyAttorney))map.availableFacts[`${fixture}:intendedRecipient.${k}`]=value;
  const r=await renderer(facts),relativePath=`fixtures/${fixture}.pdf`,docId=`${fixture}/form-${formNumber}`;
  await write(relativePath,r.packet);await write(`fixtures/${fixture}.json`,pretty(facts));for(const c of r.components)await write(`components/${fixture}/${c.id}.pdf`,c.bytes);
  await write(`reports/${fixture}.json`,pretty({familyId:family,fixture,assessment:r.assessment,fieldMap:r.fieldMap,actualWrites:r.actualWrites,blanks:r.blanks,components:r.coverage,measuredTextWrites:r.measuredTextWrites,sanitation:r.sanitation}));
  const scoped=x=>({...x,fieldId:`${fixture}:${x.fieldId}`,field:x.fieldId,fixture,documentId:docId,factId:x.fact&&x.completenessDisposition!=='NOT_APPLICABLE_ON_THIS_ROUTE'?`${fixture}:${x.fact}`:null});map.writes.push(...r.actualWrites.map(scoped));map.refusals.push(...r.blanks.map(scoped));
  census.documents.push({formNumber:docId,sourceSha256:sourceSha,fields:r.sourceFields,documentPolicy:{sourceFieldEvidence:Object.fromEntries(r.sourceFields.map(f=>[f.name,{pdfType:f.pdfType,annotationFlags:f.widgets.map(w=>w.flags??0)}]))}});
  receipt.documents.push({formNumber:docId,path:source,sha256:sourceSha,byteCount:sourceBytes.length,pages:2,edition:'August 2024',embeddedServicePage:2});
  actual.artifacts.push({fixture,path:`${output}/${relativePath}`,sha256:sha256(r.packet),valuesReportedByFinalizer:r.actualWrites.length,actualWrites:r.actualWrites,measuredTextWrites:r.measuredTextWrites,addedGlyphsReadFromOutputBytes:r.measuredTextWrites.reduce((a,w)=>a+w.nonWhitespaceGlyphs,0)});
  packets.push({fixture,path:`${output}/${relativePath}`,relativePath,sha256:sha256(r.packet),bytes:r.packet.length,pageCount:r.pageCount,documents:r.coverage.map(c=>({...c,documentId:`${fixture}/${c.id}`})),filingReady:false});
  const required=r.blanks.filter(x=>x.completenessDisposition==='REQUIRED_BEFORE_FILING');readiness.push({fixture,classification:required.length?'DIAGNOSTIC_NOT_FILING_POSITIVE':'SUPPORTED_UNEXECUTED_DRAFT',filingReady:false,missingRequiredAreas:required.map(x=>x.fieldId),courtDebtIsNotPrecondition:true,externalHistoryRequired:false});
  allInstructions.push(`## ${fixture}\n\n`+r.instructions.map(s=>`### ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n')+'\n\n### Exact completion ledger\n\n'+r.blanks.map(b=>`${fixture}:${b.fieldId}: ${b.label}. ${b.reason}`).join('\n\n'));
 }
 await write('source-receipt.json',pretty(receipt));await write('field-census.census-v1.json',pretty(census));await write('production-field-map.json',pretty(map));await write('reports/actual-writes.json',pretty(actual));await write('reports/blanks-left-for-the-participant.json',pretty({familyId:family,blanks:map.refusals}));await write('reports/blank-dispositions.json',pretty({familyId:family,blanks:map.refusals}));await write('reports/rendered-artifacts.json',pretty({familyId:family,packets}));await write('reports/packet-level-readiness.json',pretty({familyId:family,fixtures:readiness,filingReady:false}));await write('participant-instructions.md',allInstructions.join('\n\n'));
 await write('approval-request.json',pretty({familyId:family,status:'REVIEW_REQUESTED_NOT_APPROVED',independentReview:'PENDING_CHAT10',centralRaster:'PENDING_CHAT_A'}));await write('route-contract.json',pretty({familyId:family,formNumber,instrument:`Rule 2.86 Form ${formNumber}`,sourceSha256:sourceSha,clock:'two calendar years from conviction; fixed clean-history window',caseDebtPrecondition:false,requiredDciReport:false,proposedOrder:false,notarization:false,embeddedServicePage:2,feeReleaseReconciliation:'PENDING_A: university practice source says no application fee; no court fee schedule newly acquired',manualRepresentationAndExecution:true,manualItem1:formNumber===4,authorities:authorityBindings}));
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'chat8-alcohol-bytecheck-'));
 try {
  execFileSync('python',[path.join(ROOT,'scripts/rcap-packet-recovery/chat8/verify-ia-alcohol-pdfs.py'),'--form',String(formNumber),'--family-dir',outDir,'--evidence',temp,'--measure-only'],{maxBuffer:8*1024*1024});
  const measured=JSON.parse(await fs.readFile(path.join(temp,'pdf-verification.json'),'utf8'));
  for(const artifact of actual.artifacts){const m=measured.fixtures.find(x=>x.fixture===artifact.fixture);if(!m||m.sha256!==artifact.sha256)throw Error('Unbound final PDF readback');artifact.addedGlyphsReadFromOutputBytes=m.addedGlyphs;artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes=m.outsideGlyphs;artifact.measurements=m;}
  actual.derivedFromArtifactBytes=true;await write('reports/actual-writes.json',pretty(actual));await write('reports/pdf-byte-measurements.json',pretty(measured));
 } finally {await fs.rm(temp,{recursive:true,force:true});}
 const audit=auditFamily(path.relative(ROOT,outDir),family);audit.directory=output;
 await write('reports/completeness-counters.json',pretty(audit.counters));await write('reports/completeness-result.json',pretty(audit));
 console.log(pretty({familyId:family,fixtures:packets.length,pages:packets.reduce((a,p)=>a+p.pageCount,0),outputs:packets.map(p=>({fixture:p.fixture,sha256:p.sha256,pages:p.pageCount})),filingReady:false}));return packets;
}
export const buildFamily=options=>buildAlcoholFamily(options);
