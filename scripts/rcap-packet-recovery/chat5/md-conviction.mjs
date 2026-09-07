/** Maryland 072B conviction adapter. Only this owned family is emitted.
 * The actual 072B/089/MDJ-008 sources are filled with the shared fitting and
 * sanitation primitives. This is not an eligibility engine or a new importer.
 * Stale AcroForm checkbox names do not override the current printed recitals.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PDFDocument,PDFTextField,PDFDropdown,PDFCheckBox,PDFButton,PDFName,PDFString,StandardFonts} from 'pdf-lib';
import {fitTextToWidget,applyFitToTextField,wrapToWidth} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {ensureDefaultAppearances,sanitizeAndFlatten,scanBytesForActiveContent} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import {flattenedWidgets,drawnAt} from '../../rcap-official-forms/pdf-flattened-widgets.mjs';
import {stampDeterministic} from '../../rcap-official-forms/rcap-deterministic-pdf-date.mjs';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
export const FAMILY='md_10110_conviction-set';
export const ROUTE='obligation:track-pathway:MD:md_10110_conviction:eligible-conviction-expungement-under-crim-proc-10-110';
export const OUT='data/rcap-all50/overlays/census-v1/md/md-10110-conviction-set--official-pdf-fill';
export const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
export const json=x=>JSON.stringify(x,null,2)+'\n';
const clone=x=>structuredClone(x),has=x=>x!==undefined&&x!==null&&x!=='';
const get=(o,k)=>k.split('.').reduce((a,p)=>a?.[p],o);
const date=s=>`${s.slice(5,7)}/${s.slice(8,10)}/${s.slice(0,4)}`;
export const SOURCES={
 'CC-DC-CR-072B':{path:'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072B.pdf',sha256:'3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469',bytes:764936,pages:1,edition:'10/01/2025-2',driveId:'1b5hj3E_trOLabgP_ltdDFo-pjCt7IiW-',url:'https://www.mdcourts.gov/sites/default/files/court-forms/courtforms/joint/ccdccr072B.pdf/ccdccr072B.pdf'},
 'CC-DC-089':{path:'reference/chat-parallel-2026-09-07/chat5/CC-DC-089.pdf',sha256:'eab9b1eb34b36beee57cb4ea3334ec7f8a6d825e853b73c87724c65066069384',bytes:1062198,pages:3,edition:'11/2025',driveId:'13h7vx-eqrv4DhDa9ZFHI-L5HTP-gAD72',url:'https://www.mdcourts.gov/sites/default/files/import/courtforms/joint/ccdc089.pdf'},
 'MDJ-008':{path:'reference/chat-parallel-2026-09-07/chat5/MDJ-008.pdf',sha256:'42510792803b979974b3967dfd0f871271e7518cf64e226d5a80e22b67a6e369',bytes:248175,pages:1,edition:'07/2026',driveId:'1RkaJsxPBJChjd0xJI32M6LdKzu7keIrl',url:'https://www.mdcourts.gov/sites/default/files/court-forms/mdj008.pdf'}
};
export const BASIS={
 misdemeanor:{years:5,field:'a misdemeanor crime specified in Criminal Procedure Article  10110 Ten years have passed since the satisfactory completion of',printed:'Eligible misdemeanor: five years',authority:'10-110(c)(1)'},
 assault_battery:{years:7,field:'a felony crime specified in Criminal Procedure Article  10110 Fifteen years have passed since the satisfactory completion of the',printed:'Second-degree assault/common law battery: seven years',authority:'10-110(c)(2)'},
 felony:{years:7,field:'a felony crime specified in Criminal Procedure Article  10110 Fifteen years have passed since the satisfactory completion of the',printed:'Other eligible felony: seven years',authority:'10-110(c)(4)'},
 burglary_theft:{years:10,field:'a crime specified in Criminal Law Article  3203 common law battery or for an offense classified as a domestically related crime',printed:'First/second-degree burglary or felony theft: ten years',authority:'10-110(c)(6)'},
 domestic:{years:15,field:'Check Box1',printed:'Domestically related crime: fifteen years',authority:'10-110(c)(3)'},
 nuisance:{years:3,field:'a crime specified in Criminal Procedure Article  10105a9 Three 3 years have passed since the later of the conviction or',printed:'Listed nuisance conviction: three years',authority:'10-105(a)(9), (c)(6)'},
 no_longer_crime:{years:0,field:'the charge but the conduct on which the charge is based is no longer a crime',printed:'Underlying conduct is no longer a crime',authority:'10-105(a)(11)'},
 repealed_sexual:{years:0,field:'the conviction was for sodomy and the conviction is not precluded from being expunged for any of the reasons listed in',printed:'Repealed sexual offense with all 10-105(a-1) exclusions absent',authority:'10-105(a)(11), (a-1)'}
};
const SEC110=new Set(['misdemeanor','assault_battery','felony','burglary_theft','domestic']);
const eventFields={arrest:'Check Box36',summons:'Check Box37',citation:'Check Box38'};
const bProtected=['Text28','CPF ID No','Date_3','Printed Name','Address','City State Zip','Telephone','Email','Fax','Text29','Date_4'];
const bMap={"Court's City/County":'court.option',"Court's Address":'court.address',"Court's Telephone Number":'court.phone','Case No':'case.number','Tracking':'case.tracking','Text24':'person.name','Text25':'person.dob','Text30':'case.eventDate','Law Enforcement Agency':'case.agency','Maryland as a result of the following incident':'case.locality','I was convicted found guilty of check all that apply making sure that the statement is true and':'case.chargeText','Text27':'case.convictionDate','Printed Name_2':'person.name','Address_2':'person.street','City State Zip_2':'person.cityStateZip','Telephone_2':'person.phone','Email_2':'person.email','Fax_2':'person.fax'};
const W_INCOME={wages:['Wages check box','Wages Amount'],commissions:['Commissions/Bonuses check box','Commissions Amount'],ssi:['Social Security/SSI check box','Social Security/SSI Amount'],retirement:['Retirement Income check box','Retirement Income'],unemployment:['Unemployment Insurance check box','Unemployment Insurance Amount'],cashAssistance:['Temporary Cash Assistance check box','Temporary Cash Assistance Amount'],alimony:['Alimony Spousal Support check box','Alimony/Spousal Support Amount'],rent:['Rent Received From Tenants check box','Rent From Tenants Amount'],other:['Other Income check box','Other Amount']};
const W_PROPERTY={realEstate:['Real Estate check box','Value of real estate other than princical home'],vehicles:['Other Vehicles check box','Value of other vehicles'],bank:['Bank Accounts check box','Balance of Accounts'],stocks:['Stocks or Other Securities check box','Value of stocks'],other:['Other Property check box','Value of Other Property','Describe Other Property']};
const W_DEBT={creditCard:['Credit Card check box','Credit Card Amount Owed','Monthly Payment for Credit Card','Name of Credit Card'],carLoan:['Car Loan check box','Car Loan Amount Owed','Monthly Payment for Car Loan','Name of Car Loan'],other:['Other Debt','Debt Amount Owed','Monthly Payment for Debt','Describe Debt']};
const W_COURT=['Meets Financial Eligibility check box','Does Not Meet Financial Eligibility check box','Unable to Pay due to Poverty check box','Not Unable to Pay due Poverty check box','Not Frivolous check box','Frivolous check box','Other Findings check box','Description of Other Findings Line 1','Description of Other Findings Line 2','Granted check box','Granted In Part check box','Ordered Fee to Prepay','Date to Prepay','Denied check box','Date of Judge Signature','Judge Signature','Judge ID Number'];
const W_PROTECTED=['Party Signature','Date of Party Signature','Attorney Full Name','On Behalf of Party Full Name','Attorney Signature','CPF ID No','Street Address of Attorney','City, State, and Zip of Attorney Address','Telephone/Fax for Attorney','E-mail for Attorney','Date of Attorney Signature',...W_COURT];
export const NOTICE_FINANCIAL=['Restricted Document - The entire document is not subject to inspection','Financial Information'];
function iso(v,k){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('INVALID_DATE: '+k);return v;}
function anniversary(v,n){const result=`${+v.slice(0,4)+n}${v.slice(4)}`;if(v.endsWith('02-29'))throw Error('LEAP_ANNIVERSARY_REVIEW: do not guess the applicable legal anniversary');return result;}
function amount(v,k){assert(Number.isSafeInteger(v)&&v>=0,'INVALID_CENTS: '+k);return (v/100).toFixed(2);}
function safeText(v,k){if(!has(v))return;assert.equal(typeof v,'string','TEXT_REQUIRED: '+k);assert(v.trim()&&!/[\r\n\t]/.test(v),'SINGLE_LINE_REQUIRED: '+k);assert(!/^(tbd|unknown|insert|enter here|not supplied|see instructions|test prose)$/i.test(v.trim()),'PLACEHOLDER_NOT_FACT: '+k);}
/** Dates are factual consistency checks, not a substitute for the route engine. */
export function validateMdConviction(input){
 const f=clone(input),missing=[];
 assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');iso(f.asOf,'asOf');if(f.asOf>='2026-10-01')throw Error('LAW_VERSION_REVIEW: revalidate the later law/form version');
 assert(f.person&&f.case&&f.court&&f.confirmations&&f.options,'MISSING_INPUT_SECTIONS');
 if(!BASIS[f.case.basis])throw Error('WRONG_INSTRUMENT_OR_BASIS: pardon, cannabis and nonconviction are separate families');
 if(f.person.signature||f.person.signatureDate||f.court.order||f.judicialFindings||f.notary||f.attorney||f.options.generalRelease)throw Error('PROTECTED_OR_UNSUPPORTED_EXECUTION');
 const need=(k,expected,label=k)=>{const v=get(f,k);if(!has(v))missing.push({factId:k,label,why:'Supply and verify this answer against the complete case record before selecting the recital or signing.',requiredBeforeFiling:true});else if(v!==expected)throw Error('CONDITION_NOT_MET: '+k);};
 for(const k of ['person.dob','case.eventDate','case.convictionDate','case.completionDate'])if(has(get(f,k))){iso(get(f,k),k);assert(get(f,k)<=f.asOf,'FUTURE_CASE_DATE: '+k);}
 if(has(f.person.dob)&&has(f.case.eventDate))assert(f.person.dob<=f.case.eventDate,'DOB_AFTER_EVENT');
 if(has(f.case.eventDate)&&has(f.case.convictionDate))assert(f.case.eventDate<=f.case.convictionDate,'EVENT_AFTER_CONVICTION');
 if(has(f.case.completionDate)&&has(f.case.convictionDate))assert(f.case.completionDate>=f.case.convictionDate,'COMPLETION_BEFORE_CONVICTION');
 need('confirmations.allIncidentChargesListed',true);need('confirmations.unitEligible',true);need('confirmations.selectedRecitalTrue',true);need('confirmations.pendingCriminalProceeding',false);need('confirmations.nonCannabis',true);
 need('court.venueConfirmed',true);
 if(!['district','circuit'].includes(f.court.level))throw Error('COURT_LEVEL_NOT_SUPPORTED');
 if(has(f.court.option))assert(f.court.option.endsWith(f.court.level==='district'?'(DC)':'(CC)'),'COURT_OPTION_LEVEL_MISMATCH');
 if(!['none','adult'].includes(f.court.transfer))throw Error('TRANSFER_REQUIRES_DIFFERENT_ROUTE');
 if(f.court.transfer==='adult')need('court.receivingCourtConfirmed',true);
 // Circuit court can be the appellate court for an appeal from District Court.
 // This is permitted only on supplied docket-confirmed venue, never inferred.
 if(typeof f.court.appealed!=='boolean')need('court.appealed',false);
 if(f.court.appealed){assert.equal(f.court.level,'circuit','APPELLATE_CAPTION_REVIEW');need('court.isAppellateFilingCourt',true);}
 if(has(f.case.event)&&!eventFields[f.case.event])throw Error('EVENT_NOT_SUPPORTED');
 assert(Array.isArray(f.case.charges)&&f.case.charges.length,'COMPLETE_CHARGE_UNIT_REQUIRED');
 for(const [i,c] of f.case.charges.entries()){
  safeText(c.description,`charges.${i}.description`);assert(has(c.description),'CHARGE_REQUIRED');safeText(c.statute,`charges.${i}.statute`);assert(has(c.statute),'EXACT_CHARGE_STATUTE_REQUIRED');
  assert.equal(c.disposition,'guilty','MIXED_DISPOSITION_REQUIRES_REVIEW');assert.equal(c.convictionDate,f.case.convictionDate,'MIXED_DATES_REQUIRES_CONTINUATION');
  assert.equal(c.basis,f.case.basis,'MIXED_BASES_REQUIRES_CONTINUATION');
  if(SEC110.has(c.basis)){
   if(!has(c.eligibleUnder10_110))missing.push({factId:`case.charges.${i}.eligibleUnder10_110`,label:'Exact charge-to-statute eligibility',why:'Resolve this charge against the current enumerated 10-110(a) list; no eligibility is inferred from its name.',requiredBeforeFiling:true});else assert.equal(c.eligibleUnder10_110,true,'INELIGIBLE_CHARGE');
   if(!has(c.domesticallyRelated))missing.push({factId:`case.charges.${i}.domesticallyRelated`,label:'Domestic classification',why:'Confirm whether the case was classified under Criminal Procedure 6-233. The 15-year rule cannot be skipped.',requiredBeforeFiling:true});else assert.equal(c.domesticallyRelated,c.basis==='domestic','DOMESTIC_CLASSIFICATION_MISMATCH');
   if(c.basis==='misdemeanor'){assert.equal(c.grade,'misdemeanor','MISDEMEANOR_GRADE_REQUIRED');assert(!['CR 3-203','common law battery'].includes(c.statute),'ASSAULT_SEVEN_YEARS');}
   if(c.basis==='assault_battery')assert(['CR 3-203','common law battery'].includes(c.statute),'ASSAULT_STATUTE_REQUIRED');
   if(c.basis==='felony'){assert.equal(c.grade,'felony','FELONY_GRADE_REQUIRED');assert(!['CR 6-202(a)','CR 6-203','CR 7-104'].includes(c.statute),'SPECIAL_FELONY_TEN_YEARS');}
   if(c.basis==='burglary_theft'){assert.equal(c.grade,'felony','FELONY_GRADE_REQUIRED');assert(['CR 6-202(a)','CR 6-203','CR 7-104'].includes(c.statute),'SPECIAL_FELONY_STATUTE_REQUIRED');}
  }
 }
 f.case.chargeText=f.case.charges.map(c=>`${c.description} (${c.statute})`).join('; ');
 if(SEC110.has(f.case.basis)){need('confirmations.allSentencesComplete',true);need('confirmations.interveningConvictionDisqualifies',false);}
 if(f.case.basis==='nuisance'){need('confirmations.listedNuisanceOffense',true);need('confirmations.allSentencesComplete',true);}
 if(['no_longer_crime','repealed_sexual'].includes(f.case.basis))need('confirmations.conductNoLongerCrime',true);
 if(f.case.basis==='repealed_sexual')need('confirmations.all10_105_a1ExclusionsAbsent',true);
 if(f.case.basis==='no_longer_crime'){if(f.case.formerSexualOffense===true)need('confirmations.all10_105_a1ExclusionsAbsent',true);else need('confirmations.not10_105_a1SexualOffense',true);}
 if(!has(f.case.convictionDate))missing.push({factId:'case.convictionDate',label:'Conviction date',why:'Supply the actual guilty disposition date.',requiredBeforeFiling:true});
 let earliest=null;
 if(BASIS[f.case.basis].years){if(!has(f.case.completionDate))missing.push({factId:'case.completionDate',label:'Sentence completion date',why:'Supply actual completion of all sentences, including probation, parole and supervision. A predicted date is not completion.',requiredBeforeFiling:true});else earliest=anniversary(f.case.completionDate,BASIS[f.case.basis].years);}
 if(earliest&&f.asOf<earliest)throw Error('WAITING_PERIOD_NOT_MET: '+earliest);
 if(!has(f.case.restitution?.status))missing.push({factId:'case.restitution.status',label:'Restitution status',why:'Ask the sentencing clerk whether restitution was ordered and the current balance.',requiredBeforeFiling:true});
 else {assert(['not_ordered','paid','unable_to_pay','disputed'].includes(f.case.restitution.status),'RESTITUTION_STATUS_INVALID');if(f.case.restitution.status==='disputed')throw Error('DISPUTED_RESTITUTION_HANDOFF');if(f.case.restitution.status==='unable_to_pay')need('case.restitution.inabilityAsserted',true);if(['paid','unable_to_pay'].includes(f.case.restitution.status))need('case.restitution.documentationAvailable',true);}
 if(f.confirmations.actualObjection||f.confirmations.hearingScheduled)throw Error('ACTUAL_CONTESTED_MATTER_HANDOFF');
 const mayMarkBasis=missing.length===0;
 assert(['paid','waiver'].includes(f.options.feeTreatment),'EXPLICIT_FEE_CHOICE_REQUIRED');
 if(f.options.feeTreatment==='paid')assert(!f.financial&&!f.options.finalOpenCostsRequested&&!f.options.prepaidWaiverRequested,'WAIVER_INPUT_ON_PAID_BRANCH');
 if(f.options.feeTreatment==='waiver'){
  assert.equal(f.options.prepaidWaiverRequested,true,'EXPLICIT_WAIVER_REQUEST_REQUIRED');need('options.unableToPrepay',true);need('court.restrictedCaseType',false);
  assert.equal(typeof f.options.finalOpenCostsRequested,'boolean','EXPLICIT_FINAL_COST_CHOICE_REQUIRED');
  if(f.options.finalOpenCostsRequested)need('options.noMaterialChangeAnticipated',true);
  const z=f.financial;
  if(z){
   for(const key of ['incomeComplete','propertyComplete','debtsComplete'])need('financial.'+key,true,'Confirm the complete '+key.replace('Complete','')+' inventory');
   if(has(z.householdSize))assert(Number.isInteger(z.householdSize)&&z.householdSize>=1,'HOUSEHOLD_SIZE_INVALID');
   if(has(z.period))assert(['week','month','year'].includes(z.period),'INCOME_PERIOD_INVALID');
   if(has(z.totalCents))amount(z.totalCents,'total');
   if(z.income){for(const [key,v] of Object.entries(z.income)){assert(W_INCOME[key],'UNKNOWN_INCOME_CATEGORY_OR_SNAP');amount(v,key);}if(z.incomeComplete===true&&has(z.totalCents))assert.equal(Object.values(z.income).reduce((a,b)=>a+b,0),z.totalCents,'INCOME_TOTAL_MISMATCH');}
   for(const [name,allowed] of [['property',W_PROPERTY],['debts',W_DEBT]])if(z[name])for(const [key,v] of Object.entries(z[name])){assert(allowed[key],'UNKNOWN_FINANCIAL_CATEGORY');amount(v.cents,`${name}.${key}`);if(name==='debts')amount(v.monthlyCents,`${name}.${key}.monthly`);if(name==='debts'||key==='other'){safeText(v.description,key);assert(has(v.description),'FINANCIAL_DESCRIPTION_REQUIRED');}}
   if(z.propertyComplete===true&&z.excludedHomeVehiclePersonalItems!==true)throw Error('PROPERTY_EXCLUSIONS_NOT_CONFIRMED');
   if(z.incomeComplete===true&&z.snapExcluded!==true)throw Error('SNAP_EXCLUSION_NOT_CONFIRMED');
  }
 }
 for(const [obj,ks] of [[f.person,['name','street','cityStateZip','phone','email','fax']],[f.court,['option','address','phone']],[f.case,['number','tracking','agency','locality','incident']]])for(const k of ks)safeText(obj[k],k);
 return {facts:f,missing,earliest,mayMarkBasis};
}

/** Complete this family's exact source widgets; not an exported generic host. */
async function formWriter(id,provided){
 const s=SOURCES[id],raw=provided??fs.readFileSync(path.join(ROOT,s.path));assert.equal(raw.length,s.bytes,'SOURCE_LENGTH_DRIFT: '+id);assert.equal(hash(raw),s.sha256,'SOURCE_HASH_DRIFT: '+id);
 const doc=await PDFDocument.load(raw,{updateMetadata:false});assert.equal(doc.getPageCount(),s.pages,'SOURCE_PAGE_DRIFT');const form=doc.getForm();ensureDefaultAppearances(form);
 // On the actual 072B source, the Date caption extends into the agency
 // widget's left half. Start agency ink after that printed caption, retaining
 // the original source page/rule; do not draw across the Date word.
 const originalRects=new Map();
 if(id==='CC-DC-CR-072B')for(const w of form.getTextField('Law Enforcement Agency').acroField.getWidgets()){
  const r=w.getRectangle();originalRects.set(w,r);w.setRectangle({...r,x:292,width:r.x+r.width-292});
 }
 const font=await doc.embedFont(StandardFonts.Helvetica),writes=[],blanks=[],states=new Map();
 const pos=w=>{const p=doc.getPages().findIndex(p=>(p.node.Annots()?.asArray()??[]).some(r=>doc.context.lookup(r)===w.dict));assert(p>=0,'WIDGET_PAGE_NOT_FOUND');return {page:p+1,rect:w.getRectangle(),...(originalRects.has(w)?{originalSourceRect:originalRects.get(w),adjustment:'Agency ink starts after the printed Date caption; source text/rule unchanged.'}:{})};};
 const census=form.getFields().filter(f=>!(f instanceof PDFButton)).map(f=>({field:f.getName(),type:f.constructor.name,widgets:f.acroField.getWidgets().map(pos)}));
 const missing=(field,factId,why,value=null)=>{states.set(field,'required_before_filing');const ws=census.find(x=>x.field===field)?.widgets??[];blanks.push({documentId:id,field,factId,page:ws[0]?.page??1,widgets:ws,why,value,completenessClass:'required_before_filing',requiredBeforeFiling:true});};
 const blank=(field,kind,why)=>{if(!states.has(field)){states.set(field,kind);const ws=census.find(x=>x.field===field)?.widgets??[];blanks.push({documentId:id,field,page:ws[0]?.page??1,widgets:ws,why,completenessClass:kind,requiredBeforeFiling:false});}};
 function text(field,factId,value,optional=false){
  if(!has(value)){if(optional)blank(field,'not_applicable_optional','Optional information not supplied.');else missing(field,factId,'Supply this actual fact; the filing blank was not invented.');return;}
  assert.equal(typeof value,'string','TEXT_REQUIRED: '+factId);try{font.encodeText(value);}catch{throw Error('UNSUPPORTED_TEXT_ENCODING: '+factId);}
  const h=form.getField(field);assert(h instanceof PDFTextField||h instanceof PDFDropdown,'TEXT_MAPPING_TYPE');const widgets=h.acroField.getWidgets(),fits=widgets.map(w=>fitTextToWidget({font,text:value,rect:w.getRectangle(),maxFontSize:10,minFontSize:7,evaluateDeclaredMinimumSize:true}));
  if(fits.some(x=>x.outcome==='refused')){missing(field,factId,'The complete value does not fit at the 7-point minimum. It was not clipped or shortened. Obtain help with an accurate shorter statement or permitted continuation.',value);return;}
  const fit=fits.reduce((a,b)=>a.fontSize<=b.fontSize?a:b);
  if(h instanceof PDFDropdown){assert(h.getOptions().includes(value),'UNKNOWN_OFFICIAL_COURT_OPTION');h.select(value);h.setFontSize(fit.fontSize);}else applyFitToTextField(h,fit);
  for(const w of widgets)w.dict.set(PDFName.of('DA'),PDFString.of(`/Helv ${fit.fontSize} Tf 0 g`));
  states.set(field,'written');writes.push({documentId:id,field,factId,value,kind:'text',fontSize:fit.fontSize,widgets:widgets.map(pos)});
 }
 function mark(field,factId){assert(form.getField(field) instanceof PDFCheckBox,'CHECKBOX_MAPPING_TYPE');form.getCheckBox(field).check();states.set(field,'written');writes.push({documentId:id,field,factId,value:true,kind:'checkbox',widgets:form.getField(field).acroField.getWidgets().map(pos)});}
 function lines(fields,factId,value,optional=false){
  if(!has(value)){for(const name of fields)optional?blank(name,'not_applicable_optional','Optional narrative not supplied.'):missing(name,factId,'Supply the incident facts accurately; no narrative was invented.');return;}
  let fit=null;for(let size=10;size>=7&&!fit;size-=.5){const words=value.split(/\s+/),texts=[];for(const name of fields){const width=form.getTextField(name).acroField.getWidgets()[0].getRectangle().width-4;let t='';while(words.length&&font.widthOfTextAtSize([t,words[0]].filter(Boolean).join(' '),size)<=width)t=[t,words.shift()].filter(Boolean).join(' ');texts.push(t);}if(!words.length)fit=texts;}
  if(!fit){for(const name of fields)missing(name,factId,'The complete narrative does not fit the actual printed lines; no words were dropped.',value);return;}
  fit.forEach((v,i)=>has(v)?text(fields[i],factId,v):blank(fields[i],'not_applicable_optional','The complete narrative fits preceding lines.'));
 }
 async function finish(protectedFields){
  for(const n of protectedFields){assert(!writes.some(w=>w.field===n),'PROTECTED_FIELD_WRITE: '+n);blank(n,'court_or_execution_owned','Leave for the actual participant signature/date, attorney or judge. No execution, certification or judicial finding is supplied.');}
  for(const x of census)if(!states.has(x.field))blank(x.field,'not_selected_or_not_applicable','Not selected on this explicit branch; do not infer an election or fact from a blank.');
  const writtenFields=new Set(writes.map(w=>w.field));const sanitized=await sanitizeAndFlatten(doc,{defaultFont:font,writtenFields,detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true,preserveUnwrittenSelectionBackgrounds:true});
  preserveSourceMetadata(doc,sanitized.clean);stampDeterministic(sanitized.clean);const bytes=Buffer.from(await sanitized.clean.save({useObjectStreams:false})),scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_REMAINS');
  assert.equal((await PDFDocument.load(bytes)).getForm().getFields().length,0,'INTERACTIVE_FIELDS_REMAIN');
  return {documentId:id,bytes,sha256:hash(bytes),pageCount:s.pages,writes,blanks,census,source:s,sourceGeometryAdjustments:id==='CC-DC-CR-072B'?[{field:'Law Enforcement Agency',sourcePage:1,sourceRect:{x:157.56,y:563.815,width:414.24,height:10.8},writeX:292,reason:'The printed Date caption spans x274.56..289.77 and overlaps this source widget; preserve it and move only agency ink past x292.'}]:[],sanitation:sanitized.report};
 }
 return {text,mark,lines,blank,missing,finish};
}
async function petition(v,source){
 const f=v.facts,w=await formWriter('CC-DC-CR-072B',source);
 for(const [name,key] of Object.entries(bMap)){let value=get(f,key);if(has(value)&&['person.dob','case.eventDate','case.convictionDate'].includes(key))value=date(value);w.text(name,key,value,['case.tracking','person.email','person.fax'].includes(key));}
 w.lines(['Text26','2 I was charged with the offense of'],'case.incident',f.case.incident);
 w.mark(f.court.level==='district'?'Check Box33':'Check Box32','court.level');
 if(has(f.case.event))w.mark(eventFields[f.case.event],'case.event');else w.missing('Check Box36','case.event','Confirm arrest, summons or citation.');
 if(v.mayMarkBasis){w.mark(BASIS[f.case.basis].field,'case.basis');if(f.case.basis==='repealed_sexual')w.mark(BASIS.no_longer_crime.field,'The underlying conduct is also no longer a crime');if(f.case.basis==='no_longer_crime'&&f.case.formerSexualOffense)w.mark(BASIS.repealed_sexual.field,'All special 10-105(a-1) exclusions expressly absent');}else w.missing(BASIS[f.case.basis].field,'case.basis','Left unmarked while required case predicates or dates are missing.');
 if(f.court.transfer==='adult')w.mark('The case began in one court and was transferred to another court other than juvenile court Note This petition must be filed in','court.transfer');
 if(f.court.appealed)w.mark('The case was appealed to a court exercising appellate jurisdiction Note This petition must be filed in the appellate court','court.appealed');
 return w.finish(bProtected);
}
async function waiver(v,source){
 const f=v.facts,w=await formWriter('CC-DC-089',source),z=f.financial??{};
 const map={"Court's City/County":'court.option','Court Full Address':'court.address','Court Telephone Number':'court.phone','Case Number':'case.number','Respondent/Defendant Full Name':'person.name','Name of Party for Request':'person.name','Name of Party for Court Order':'person.name','Printed Full Name of Party':'person.name','Street Address of Party':'person.street','City, State, and Zip Code of Party Address':'person.cityStateZip','Telephone of Party/Fax of Party':'person.phone','E-mail Address of Party':'person.email'};
 for(const [n,k] of Object.entries(map))w.text(n,k,get(f,k),k==='person.email');w.text('Petitioner/Plaintiff Full Name','case.prosecution','State of Maryland');w.mark(f.court.level==='district'?'District Court check box':'Circuit Court check box','court.level');
 w.text('Total Number of Family Members','financial.householdSize',has(z.householdSize)?String(z.householdSize):null);
 w.text('Total Gross Household Income','financial.totalCents',has(z.totalCents)?amount(z.totalCents,'total'):null);
 const period={week:['Total Gross per Week check box','Itemized Gross Income per Week check box (list below)'],month:['Total Gross per Month','Itemized Gross Income per Month check box (list below)'],year:['Total Gross per Year check box','Itemized Gross Income per Year check box (list below)']};
 if(z.period)for(const n of period[z.period])w.mark(n,'financial.period');else w.missing('Total Gross per Month','financial.period','Select the actual income reporting period.');
 for(const [key,[box,field]] of Object.entries(W_INCOME))if(has(z.income?.[key])){w.mark(box,`financial.income.${key}`);w.text(field,`financial.income.${key}`,amount(z.income[key],key));}else if(z.incomeComplete!==true)w.missing(field,`financial.income.${key}`,'Supply the amount or explicitly confirm this source is absent. SNAP is excluded.');
 for(const [name,items,none] of [['property',W_PROPERTY,'None'],['debts',W_DEBT,'No Debt check box']]){
  const vals=z[name],complete=z[`${name==='debts'?'debts':'property'}Complete`]===true;
  if(vals&&complete&&Object.keys(vals).length===0)w.mark(none,`financial.${name}Complete`);
  for(const [key,fields] of Object.entries(items))if(vals?.[key]){const value=vals[key];w.mark(fields[0],`financial.${name}.${key}`);w.text(fields[1],`financial.${name}.${key}.cents`,amount(value.cents,key));if(name==='debts'){w.text(fields[2],`financial.debts.${key}.monthlyCents`,amount(value.monthlyCents,key));w.text(fields[3],`financial.debts.${key}.description`,value.description);}else if(fields[2])w.text(fields[2],`financial.property.${key}.description`,value.description);}else if(!complete)w.missing(fields[1],`financial.${name}.${key}`,'Supply the actual amount or explicitly confirm this item is absent. No financial zero or NONE selection was inferred.');
 }
 w.lines(['Describe Line 1','Describe Line 2','Describe Line 3'],'financial.otherInformation',z.otherInformation,true);
 w.mark('Request a Waiver of the Prepaid Costs check box','options.prepaidWaiverRequested');
 if(f.options.finalOpenCostsRequested&&f.options.noMaterialChangeAnticipated===true)w.mark('No Anticipated Material Changes check box','options.finalOpenCostsRequested');
 else if(f.options.finalOpenCostsRequested)w.missing('No Anticipated Material Changes check box','options.noMaterialChangeAnticipated','The final-open-cost request includes a no-material-change assertion; confirm it truthfully before selecting.');
 return w.finish(W_PROTECTED);
}
async function notice(v,source){
 const f=v.facts,w=await formWriter('MDJ-008',source);
 const map={'City/County':'court.option','Court Address':'court.address','Court Telephone Number':'court.phone','Case Number':'case.number',"Defendant/Respondent's Name":'person.name','Telephone Number':'person.phone','E-mail':'person.email','Fax':'person.fax','Printed Name':'person.name','Street Address':'person.street','City, State, Zip':'person.cityStateZip'};
 for(const [n,k] of Object.entries(map))w.text(n,k,get(f,k),['person.email','person.fax'].includes(k));
 w.mark(f.court.level==='district'?'District Court':'Circuit Court','court.level');
 w.text('Title of Confidential Submission','selected component','Request for Waiver of Costs (CC-DC-089)');for(const n of NOTICE_FINANCIAL)w.mark(n,'Financial information in this selected CC-DC-089, not the criminal case as a whole');
 return w.finish(['Date','Signature','Attorney Number','Date of Court Order']);
}
function instructionSections(v,missing,components){
 const f=v.facts,waived=f.options.feeTreatment==='waiver',sec110=SEC110.has(f.case.basis);
 return [
 ['Maryland conviction: review before filing',[
  `${f.person.name??'Name not supplied'} | case ${f.case.number??'not supplied'} | facts as of ${f.asOf}. ${BASIS[f.case.basis].printed}.`,
  'The official filing is CC-DC-CR-072B, revision 10/01/2025-2. These companion pages are instructions, not an additional petition or court order. This packet is not a finding that relief has been granted.',
  `Filing court: ${f.court.option??'confirm court'}; ${f.court.address??'confirm address'}; telephone ${f.court.phone??'not supplied'}. Confirm case venue and the current clerk address against the docket before mailing.`,
  'Normally file where the proceeding began. If transferred between adult courts, use the receiving court. If appealed, file in the court exercising appellate jurisdiction; it may remand. Circuit Court may hear a District Court appeal. Do not select a circuit caption for an appeal in the Appellate or Supreme Court. A juvenile-transfer record is a different route.',
  `Case chronology: conviction ${f.case.convictionDate?date(f.case.convictionDate):'not supplied'}; actual sentence completion ${f.case.completionDate?date(f.case.completionDate):(BASIS[f.case.basis].years?'not supplied':'not used for this no-wait ground')}. ${v.earliest?'Selected ordinary clock matures '+date(v.earliest)+'.':(BASIS[f.case.basis].years?'The waiting period cannot be verified until the actual completion date is supplied.':'No waiting period is added to this repealed-conduct ground.')}`,
  'Sentence completion includes probation, parole and supervision. A probation violation is not treated here as an automatic permanent bar. No completion date, conviction grade, domestic classification or new-conviction eligibility is inferred from the offense name.',
  'Check every incident charge and disposition using free Maryland Judiciary Case Search and the clerk records. Keep your original records before expungement. Confirm the entire unit under Criminal Procedure 10-107, including its applicable exceptions. Unlike disposition/date/basis units need individualized preparation; this packet does not collapse them into one recital.',
  'A pardon, cannabis conviction, PBJ or other nonconviction uses its own exact route and form. This packet does not attach a general release of tort claims. Do not use a waiver of claims to shorten a conviction waiting period.',
  missing.length?`COMPLETE BEFORE FILING: ${missing.length} unresolved field or predicate item(s) are identified below. Resolve them and re-render before personally signing.`:'All supplied filing fields are prepared. Verify them and personally sign/date the applicable documents; no signature was generated.'
 ]],
 ['Complete missing facts and execution',[
  ...missing.map(x=>`${x.documentId??'Case facts'} / ${x.displayLabel??x.field??x.label}: ${x.why}${has(x.value)?' Complete held value: '+x.value:''}`),
  'Read every selected statement on the actual petition. Sign and date the Defendant block only after it is true. Leave the attorney block blank when self-represented. The petition and financial affidavit use affirmations under penalties of perjury, not a required notarization.',
  ...(waived?['On CC-DC-089, review all household income, sources, property and debts. Count family members, not renters or temporary guests; exclude SNAP from income and exclude your home, one vehicle and personal household items from the property section. Do not claim NONE or zero unless that is your actual answer.',
  'Sign and date the Party block of CC-DC-089. Leave all attorney certifications blank when self-represented. All three official pages are included: retain the complete third-page proposed costs order with identifying caption only. Leave every court finding, grant/denial, amount, payment deadline, judge name/ID, date and signature for the court.',
  'Sign and date MDJ-008. It identifies only the financial CC-DC-089 submission as restricted, not the entire criminal case. The Financial Information basis is selected; a family-law Financial Statement or a sealing order is not invented. Do not file this notice in a restricted case type excluded on its face.']:[]),
  `Restitution status supplied: ${f.case.restitution?.status??'unknown'}. If ordered, obtain the clerk balance and actual payment records, or financial documentation of inability to pay. External records are not manufactured or claimed attached by this packet. A claimed inability is not the court finding required if a hearing occurs.`
 ]],
 ['Fees, filing, service and follow-up',[
  waived?'FEE REQUEST SELECTED: file the petition, all three pages of CC-DC-089 and the required MDJ-008 notice together. No fee is due with the waiver request initially. The judge decides; sponsorship or generation does not grant a waiver.':'PAID BRANCH: the CC-DC-CR-072B filing fee is $30, non-refundable, per case, not per charge. Bring or send payment as the clerk directs. No CC-DC-089 or MDJ-008 waiver-only component is included. This court fee is separate from any product, copy or postage charge.',
  ...(waived?[f.options.finalOpenCostsRequested?'You expressly requested prepaid costs and a final waiver of open costs, with the no-material-change assertion supplied. The final request is decided at the conclusion, not automatically with the prepaid request.':'You requested prepaid costs only. The final-open-cost election remains unselected. A prepaid waiver does not remove possible costs at the end; a separate later request is possible.',
  'If a prepaid waiver is denied or only partly granted, follow the actual order: the unwaived costs must be paid within 10 days of that order or the papers may be treated as withdrawn. Do not fill that date or a payment amount for the judge.']:[]),
  'Keep a complete copy. File signed documents with the proper clerk in person, by mail, or through MDEC using its filing categories and restricted-document handling. Confirm any required copies and payment method with the clerk. A general contact email is not a filing address. Registered e-filers must follow continuing e-filing requirements.',
  sec110?"SERVICE: the court serves the State's Attorney and sends notice to listed victims at addresses in the court file. Their objection period is 30 days after service. Do not contact a victim or fabricate a participant certificate of service.":"SERVICE: the court serves the State's Attorney; the ordinary objection period is 30 days after service. This packet contains no participant service certificate.",
  'STOP AND GET HELP if an actual objection is filed, a hearing is set, restitution is disputed, domestic classification is uncertain, or eligibility of an intervening conviction is unclear. Preserve the initial packet and all notices for a lawyer or legal-aid provider; do not ignore court deadlines.',
  sec110?'At a contested hearing, the court must decide eligibility, public safety, restitution payment or inability to pay, and the interest of justice. The packet cannot supply those judicial findings or promise a favorable result.':'The court decides any contested statutory conditions. Neither a checkbox nor the absence of an objection proves that records have actually been removed.',
  'After an expungement order, unless stayed on appeal, custodians must advise the court and you of compliance within 60 days. Keep the order and compliance certificates. Follow up with the clerk when compliance is missing. Maryland relief does not guarantee removal of every federal or private record or settle immigration disclosure questions.',
  `Contents: ${components.join(' + ')} + these participant instructions. There is no proposed expungement order. ${waived?'The third page of CC-DC-089 is a costs order, not an expungement grant.':''}`,
  'Help: Maryland Court Help Center, 410-260-1392. Bring the docket, dispositions, completion and restitution records, this packet and any notices.'
 ]],
 ['Source notes and scope',[
  'Authorities checked September 7, 2026: Criminal Procedure 10-110, 10-105 and 10-107; actual 072B/089/MDJ-008 source faces and Judiciary fee-waiver instructions. Sources are official retained bytes, not replacement form drawings. This build grants no runtime or commercial authority.',
  'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-110',
  'https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcp&section=10-105',
  'https://www.mdcourts.gov/legalhelp/expungement',
  'https://www.mdcourts.gov/legalhelp/filingfeewaivers',
  'https://www.mdcourts.gov/district/directories/courtmap',
  'https://www.mdcourts.gov/clerks'
 ]]
 ];
}
async function guidePdf(sections,synthetic){
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);let page,y,num=0;
 const start=title=>{page=doc.addPage([612,792]);y=734;num++;page.drawText(title,{x:44,y,font:bold,size:15});y-=26;page.drawText(synthetic?'SYNTHETIC QA EXAMPLE - DO NOT FILE':'PARTICIPANT INSTRUCTIONS - KEEP, DO NOT FILE',{x:44,y,font:bold,size:9});y-=26;page.drawText(`Maryland 072B companion | instruction page ${num}`,{x:44,y:26,font,size:8});};
 for(const [title,paragraphs] of sections){start(title);for(const p of paragraphs){const lines=wrapToWidth(font,p,10,524);if(y-lines.length*14<52)start(title+' (continued)');for(const l of lines){if(y<52)start(title+' (continued)');assert(font.widthOfTextAtSize(l,10)<=524.1,'GUIDE_LINE_OVERFLOW');page.drawText(l,{x:44,y,font,size:10});y-=14;}y-=10;}}
 stampDeterministic(doc);return Buffer.from(await doc.save({useObjectStreams:false}));
}
export async function renderMdConviction(input,sourceOverrides={}){
 const v=validateMdConviction(input),components=[await petition(v,sourceOverrides['CC-DC-CR-072B'])];
 if(v.facts.options.feeTreatment==='waiver'){components.push(await waiver(v,sourceOverrides['CC-DC-089']));components.push(await notice(v,sourceOverrides['MDJ-008']));}
 const missing=[...v.missing,...components.flatMap(c=>c.blanks.filter(x=>x.requiredBeforeFiling))].map(x=>x.factId==='case.basis'?{...x,displayLabel:'Disposition selection - '+BASIS[v.facts.case.basis].printed}:x);const sections=instructionSections(v,missing,components.map(c=>c.documentId));
 const guide=await guidePdf(sections,input.isSyntheticFixture===true),doc=await PDFDocument.create(),pageManifest=[];
 for(const c of components){const part=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const [i,p] of (await doc.copyPages(part,part.getPageIndices())).entries()){doc.addPage(p);pageManifest.push({packetPage:pageManifest.length+1,documentId:c.documentId,sourcePage:i+1,sourceSha256:c.source.sha256,componentSha256:c.sha256});}}
 const g=await PDFDocument.load(guide,{updateMetadata:false});for(const p of await doc.copyPages(g,g.getPageIndices())){doc.addPage(p);pageManifest.push({packetPage:pageManifest.length+1,documentId:'participant-instructions',role:'not_filed'});}
 stampDeterministic(doc);const bytes=Buffer.from(await doc.save({useObjectStreams:false}));const scan=scanBytesForActiveContent(bytes);assert(scan.inspectable&&!scan.hits.length,'ACTIVE_CONTENT_IN_PACKET');
 return {bytes,sha256:hash(bytes),pageCount:doc.getPageCount(),components,pageManifest,missing,sections,earliest:v.earliest,mayMarkBasis:v.mayMarkBasis,selectedBasis:v.facts.case.basis,allKnownFactsPrepared:missing.length===0,sourceScan:scan};
}
const base={isSyntheticFixture:true,asOf:'2026-09-07',routeKey:ROUTE,
 person:{name:'Jordan Avery Reyes',dob:'1979-02-17',street:'42 Larkspur Street',cityStateZip:'Westminster, MD 21157',phone:'410-555-0142',email:'jordan.reyes@example.org'},
 court:{level:'district',option:'Carroll County (DC)',address:'101 North Court Street, Westminster, MD 21157',phone:'410-871-3500',venueConfirmed:true,restrictedCaseType:false,transfer:'none',appealed:false,directorySource:'https://www.mdcourts.gov/district/directories/carroll'},
 case:{number:'D-10-CR-18-000001',tracking:'MD-QA-000001',eventDate:'2018-01-10',event:'arrest',agency:'Westminster Police Department',locality:'Carroll County',incident:'Taking merchandise from a store without paying.',basis:'misdemeanor',convictionDate:'2018-04-02',completionDate:'2021-09-07',charges:[{description:'Misdemeanor theft under $100',statute:'CR 7-104',grade:'misdemeanor',basis:'misdemeanor',disposition:'guilty',convictionDate:'2018-04-02',eligibleUnder10_110:true,domesticallyRelated:false}],restitution:{status:'paid',documentationAvailable:true}},
 confirmations:{allIncidentChargesListed:true,unitEligible:true,selectedRecitalTrue:true,pendingCriminalProceeding:false,nonCannabis:true,allSentencesComplete:true,interveningConvictionDisqualifies:false},options:{feeTreatment:'paid'}};
export function financialFixture(){return {householdSize:2,period:'month',totalCents:85000,income:{wages:65000,cashAssistance:20000},incomeComplete:true,snapExcluded:true,property:{bank:{cents:4500}},propertyComplete:true,excludedHomeVehiclePersonalItems:true,debts:{creditCard:{cents:90000,monthlyCents:3500,description:'Bank card'}},debtsComplete:true};}
export function withWaiver(f,final=false){f=clone(f);f.options={feeTreatment:'waiver',prepaidWaiverRequested:true,unableToPrepay:true,finalOpenCostsRequested:final,...(final?{noMaterialChangeAnticipated:true}:{})};f.financial=financialFixture();return f;}
export function convictionFixtures(){
 const rows={canonical:clone(base)},patch=(basis,description,statute,grade,completion)=>{const f=clone(base);f.case.basis=basis;f.case.eventDate='2008-01-10';f.case.convictionDate='2009-04-02';f.case.completionDate=completion;f.case.number='D-10-CR-09-000002';f.case.charges=[{description,statute,grade,basis,disposition:'guilty',convictionDate:f.case.convictionDate,eligibleUnder10_110:true,domesticallyRelated:basis==='domestic'}];f.case.restitution={status:'not_ordered'};f.case.incident=({assault_battery:'Unlawful physical contact during a dispute at a private residence.',felony:'Unauthorized entry into a dwelling with intent to steal property.',burglary_theft:'Unauthorized entry into a storehouse with intent to steal property.',domestic:'Unlawful physical contact with a household member during a dispute.',nuisance:'Drinking an alcoholic beverage on public property without authorization.',repealed_sexual:'Consensual oral sex between adults unrelated by blood or marriage.'})[basis];return f;};
 const types={misdemeanor:clone(base),assault_battery:patch('assault_battery','Second-degree assault','CR 3-203','misdemeanor','2019-09-07'),felony:patch('felony','Third-degree burglary','CR 6-204','felony','2019-09-07'),burglary_theft:patch('burglary_theft','Second-degree burglary','CR 6-203','felony','2016-09-07'),domestic:patch('domestic','Domestically related second-degree assault','CR 3-203','misdemeanor','2011-09-07'),nuisance:patch('nuisance','Drinking alcohol in a public place','Former Article 2B, section 19-202','misdemeanor','2009-04-02'),repealed_sexual:patch('repealed_sexual','Consensual adult conduct under repealed sexual-practices offense','Former CR 3-322','misdemeanor',null)};
 types.nuisance.confirmations.listedNuisanceOffense=true;types.repealed_sexual.confirmations.conductNoLongerCrime=true;types.repealed_sexual.confirmations.all10_105_a1ExclusionsAbsent=true;
 types.no_longer_crime=clone(types.repealed_sexual);types.no_longer_crime.case.basis='no_longer_crime';types.no_longer_crime.case.charges[0].basis='no_longer_crime';types.no_longer_crime.case.formerSexualOffense=true;
 for(const [k,f] of Object.entries(types)){
  if(['felony','burglary_theft'].includes(k)){f.court={...f.court,level:'circuit',option:'Carroll County (CC)',address:'55 North Court Street, Westminster, MD 21157',phone:'410-386-8720',directorySource:'https://www.mdcourts.gov/clerks/carroll'};f.case.number='C-06-CR-09-000001';}
  rows[`selectable/${k}-paid`]=f;rows[`selectable/${k}-waiver`]=withWaiver(f);
 }
 const boundary=withWaiver(types.burglary_theft,true);boundary.person={name:"María-Alejandra O'Shaughnessy",dob:'1978-11-30',street:'1188 Upper Coastal Crossing Road, Apt 14B',cityStateZip:'Westminster, MD 21157-2214',phone:'410-555-0199',email:'maria.oshaughnessy@example.org'};boundary.case.number='C-06-CR-09-999999';boundary.case.event='summons';boundary.case.tracking=null;
 rows.boundary=boundary;
 const none=withWaiver(base);none.financial={householdSize:1,period:'month',totalCents:0,income:{other:0},incomeComplete:true,snapExcluded:true,property:{},propertyComplete:true,excludedHomeVehiclePersonalItems:true,debts:{},debtsComplete:true};rows['selectable/waiver-zero-explicit']=none;
 const absent=withWaiver(base);delete absent.financial;rows['diagnostic/waiver-missing-financial']=absent;
 const missing=clone(base);missing.case.completionDate=null;rows['diagnostic/missing-completion']=missing;
 const inability=clone(base);inability.case.restitution={status:'unable_to_pay',inabilityAsserted:true,documentationAvailable:true};rows['selectable/restitution-inability']=inability;
 const transfer=clone(types.felony);transfer.court.transfer='adult';transfer.court.receivingCourtConfirmed=true;rows['selectable/adult-transfer']=transfer;
 const appeal=clone(types.assault_battery);appeal.court={...types.felony.court,appealed:true,isAppellateFilingCourt:true};rows['selectable/circuit-appellate']=appeal;
 const citation=clone(base);citation.case.event='citation';rows['selectable/citation']=citation;
 return rows;
}
// The existing completeness reader accepts writes/refusals. This author-side
// schema projection preserves exact source field IDs, labels and per-fixture
// conditions; it does not implement a second completeness decision procedure.
export function mdConvictionFieldMap(facts,report,census){
 const opaque={'Text24':'Defendant name','Text25':'Defendant date of birth','Text26':'Incident narrative, first line','2 I was charged with the offense of':'Incident narrative, continued','Text27':'Conviction date','Text28':'Attorney signature','Text29':'Defendant signature','Text30':'Arrest or service date','Date_3':'Attorney signature date','Date_4':'Defendant signature date','Check Box1':'Domestically related conviction: fifteen years after sentence completion'};
 const semantic=(id,field)=>id==='CC-DC-CR-072B'?(opaque[field]??Object.values(BASIS).find(b=>b.field===field)?.printed??field):field;
 const normalize=row=>({...row,fieldId:row.field,sourceIdentity:row.field,sourceLabel:semantic(row.documentId,row.field),label:semantic(row.documentId,row.field),page:row.page??row.widgets?.[0]?.page,isSelectionControl:(census[row.documentId]??[]).some(c=>c.field===row.field&&c.type==='PDFCheckBox')});
 const writes=report.writes.map(normalize),refusals=report.blanks.map(raw=>{
  const r=normalize(raw);r.reason=raw.why;
  if(raw.requiredBeforeFiling){r.completenessDisposition='REQUIRED_BEFORE_FILING';r.completenessClass=null;return r;}
  if(raw.completenessClass==='court_or_execution_owned'){
   r.refusalClass=/signature|date|^Text28$|^Text29$|^Date_/.test(raw.field.toLowerCase())?'signature_or_date_participant_completion':'court_prosecutor_clerk_or_agency_owned';
   if(/attorney|cpf/i.test(raw.field)){r.reason='Attorney-only certification/contact block; participant is self-represented.';}
   return r;
  }
  delete r.completenessClass;
  r.completenessDisposition='NOT_APPLICABLE_ON_THIS_ROUTE';
  const context=raw.documentId==='CC-DC-CR-072B'?`Selected ${facts.case.basis}, ${facts.court.level}, ${facts.case.event}, transfer ${facts.court.transfer}, appeal ${facts.court.appealed}; all other basis/court/event controls are not selected and any unused narrative line is unnecessary.`:
   raw.documentId==='CC-DC-089'?`Only the explicitly supplied financial categories apply. Complete inventories are income=${facts.financial?.incomeComplete===true}, property=${facts.financial?.propertyComplete===true}, debts=${facts.financial?.debtsComplete===true}; final-open-cost request=${facts.options.finalOpenCostsRequested===true}. Other categories and their amount/detail blanks are not applicable; optional extra narrative is not requested.`:
   'Only the financial CC-DC-089 document is restricted for Financial Information; all alternative confidential document/category/reason controls and their detail blanks are not applicable.';
  r.routeConditionThatMakesItInapplicable=raw.completenessClass==='not_applicable_optional'?`Optional ${raw.field} not supplied or not applicable; no value was shortened or omitted.`:context;
  return r;
 });
 const factMap={};const walk=(x,k='')=>{if(x&&typeof x==='object')for(const [n,v]of Object.entries(x))walk(v,k?k+'.'+n:n);else if(has(x))factMap[k]=x;};walk(facts);
 return {schemaVersion:'rcap-official-form-field-map/v1-census-v1',familyId:FAMILY,routeKeys:[ROUTE],renderStrategy:'official_pdf_fill',writes,refusals,factMap,casePredicateDisclosures:report.requiredBeforeFiling.filter(x=>!x.documentId),sourceCensus:census,requiresExternalEligibilityVerification:true,allKnownFactsPrepared:report.allKnownFactsPrepared,runtimeSelectable:false};
}

export async function runMdConviction({outDir=path.join(ROOT,OUT),inputFile=null}={}){
 if(inputFile&&path.resolve(outDir)===path.join(ROOT,OUT))throw Error('CUSTOM_INPUT_REQUIRES_ISOLATED_OUTPUT');
 const inputs=inputFile?{supplied:JSON.parse(fs.readFileSync(inputFile,'utf8'))}:convictionFixtures();
 // Validate/render every selected input before touching destination files.
 const ready=[];for(const [fixture,facts] of Object.entries(inputs))ready.push({fixture,facts,r:await renderMdConviction(facts)});
 const artifacts=[],maps={},censuses={},importerMaps={},reports={},actualDocuments=[],actualArtifacts=[];const write=(file,b)=>{const p=path.join(outDir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
 for(const {fixture,facts,r} of ready){
  const rel=`fixtures/${fixture}.pdf`,inputPath=`fixtures/${fixture}.facts.json`;write(rel,r.bytes);write(inputPath,json(facts));
  const appearances=await flattenedWidgets(path.join(outDir,rel));
  const decoder=new TextDecoder('windows-1252'),decode=t=>decoder.decode(Buffer.from(t,'latin1'));
  const apparent=appearances.map(a=>({...a,text:decode(a.text)}));
  for(const c of r.components){
   const offset=r.pageManifest.findIndex(p=>p.documentId===c.documentId);
   const actualWrites=c.writes.filter(w=>w.kind==='text').flatMap(w=>w.widgets.map(widget=>{
    const found=drawnAt(apparent,{page:offset+widget.page,rect:widget.rect,tolerance:0.2}).filter(x=>x.text);
    const drawnText=found.map(x=>x.text).join('');
    assert.equal(drawnText,w.value,'ACTUAL_APPEARANCE_MISMATCH: '+fixture+'/'+c.documentId+'/'+w.field);
    return {field:w.field,factId:w.factId,page:offset+widget.page,expected:w.value,drawnText,readFromFinalArtifact:true};
   }));
   actualDocuments.push({fixture,formNumber:c.documentId,sourceSha256:c.source.sha256,actualWrites});
  }
  actualArtifacts.push({fixture,file:`${OUT}/${rel}`,sha256:r.sha256,valuesReportedByFinalizer:r.components.reduce((n,c)=>n+c.writes.length,0),flattenedWidgetAppearancesReadFromOutputBytes:apparent.filter(x=>x.text).length,scope:'Nonempty flattened appearance count, not a full glyph-bound or protected-pixel audit. The separate Python full-PDF audit measures those.'});

  const docs=r.components.map(c=>({documentId:c.documentId,role:c.documentId==='CC-DC-CR-072B'?'primary_filing':c.documentId==='CC-DC-089'?'fee_waiver':'restricted_information_notice',pages:c.pageCount,sourceSha256:c.source.sha256,componentSha256:c.sha256}));
  const report={schemaVersion:'chat5-md072b-author-build/v1',familyId:FAMILY,fixture,inputPath,inputSha256:hash(Buffer.from(json(facts))),output:{file:`${OUT}/${rel}`,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount},documents:docs,pageManifest:r.pageManifest,sourceGeometryAdjustments:r.components.flatMap(c=>c.sourceGeometryAdjustments),writes:r.components.flatMap(c=>c.writes),blanks:r.components.flatMap(c=>c.blanks),requiredBeforeFiling:r.missing,earliest:r.earliest,mayMarkBasis:r.mayMarkBasis,allKnownFactsPrepared:r.allKnownFactsPrepared,signatureExecuted:false,judicialDecisionSupplied:false,independentReview:'PENDING',centralRaster:'PENDING'};
  reports[fixture]=report;write(`reports/${fixture}.json`,json(report));maps[fixture]={writes:report.writes,blanks:report.blanks,requiredBeforeFiling:r.missing};
  for(const c of r.components)censuses[c.documentId]=c.census;
  artifacts.push({fixture,file:`${OUT}/${rel}`,sha256:r.sha256,byteLength:r.bytes.length,pageCount:r.pageCount,documents:docs,pageManifest:r.pageManifest,diagnostic:fixture.startsWith('diagnostic/')});
  write(`instructions/${fixture}.md`,r.sections.map(([t,ps])=>`## ${t}\n\n${ps.join('\n\n')}`).join('\n\n')+'\n');
  if(fixture==='canonical')write('participant-instructions.md',r.sections.map(([t,ps])=>`## ${t}\n\n${ps.join('\n\n')}`).join('\n\n')+'\n');
 }
 for(const {fixture,facts} of ready)importerMaps[fixture]=mdConvictionFieldMap(facts,reports[fixture],censuses);
 write('official-field-census.json',json(censuses));write('production-field-map.json',json({...importerMaps[ready[0].fixture],fixtures:maps,printedRecitals:BASIS,conditionalMaps:importerMaps}));
 write('reports/actual-writes.json',json({schemaVersion:'rcap-actual-writes/v1',familyId:FAMILY,derivedFromArtifactBytes:true,documents:actualDocuments,artifacts:actualArtifacts}));
 write('reports/rendered-artifacts.json',json({schemaVersion:'rcap-rendered-artifacts/v1',familyId:FAMILY,pdfs:artifacts,artifacts,renderedFresh:true,derivedFromBytes:true,independentVerificationPending:true}));
 write('source-receipt.json',json({schemaVersion:'chat5-exact-official-sources/v1',familyId:FAMILY,sourceCatalog:SOURCES,sources:Object.entries(SOURCES).map(([documentId,s])=>({documentId,...s})),allSourcesExact:true,officialFacesReadOn:'2026-09-07',liveIssuerBinaryShaMeasured:false,conditionalComponent:'CC-DC-089 ALL THREE pages plus MDJ-008 only on explicit waiver request',globalRelationshipCorrection:'A-owned; MDJ-008 conditional addition requested in comment5574693015'}));
 write('build-status.json',json({familyId:FAMILY,buildStatus:'state_built',reviewStatus:'qa_review_pending',pdfCount:artifacts.length,completePages:artifacts.reduce((n,x)=>n+x.pageCount,0),runtimeSelectable:false,generationAllowed:false,commercialRoutesOpened:0,selfVerified:false,limitations:['Same disposition/date/selected-basis unit only; mixed units require a continuation design, not silent collapse.','Pardon, cannabis and nonconviction remain separate families.','Charge-to-statute eligibility and restitution evidence are supplied facts, not software judicial findings.','Final-open-cost election is not a final waiver grant.','Registry MDJ-008 relationship, binary publication, central raster and runtime remain A-owned.']}));
 return artifacts;
}
