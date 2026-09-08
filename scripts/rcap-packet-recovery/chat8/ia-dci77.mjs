/** Chat8 only: DCI76/77 record acquisition, never a court filing or returned report. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {PDFDocument,PDFTextField,PDFDropdown,PDFRadioGroup,StandardFonts,rgb} from 'pdf-lib';
import {ROOT,sha256,pretty,text,dateValue,finalizedBytes,proseDocument} from './ia-901c3.mjs';
import {fitTextToWidget,applyFitToTextField} from '../../rcap-official-forms/rcap-text-fitting.mjs';
import {sanitizeAndFlatten} from '../../rcap-official-forms/rcap-active-content.mjs';
import {preserveSourceMetadata,carryDates} from '../../rcap-official-forms/rcap-official-form-finalize.mjs';
import {extractTextItems} from '../../rcap-official-forms/rcap-pdf-anchor-capture.mjs';
import {auditFamily} from '../../rcap-packet-completeness/verify-packet-completeness.mjs';
export {ROOT,sha256,pretty};
export const FAMILY='ia-dci77-set';
export const OUTPUT='data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill';
export const SOURCE='reference/chat-parallel-2026-09-07/chat8/ia-dci76-77-2021-09-22.pdf';
export const SOURCE_SHA256='321062c91b3d9e2c8f255d62d20186352a2b5884e0ccd4310a18a3a073d7f516';
export const WEB='https://dps.iowa.gov/divisions-iowa-department-public-safety/iowa-division-criminal-investigation/criminal-history-record-check-information';
export const PDF_URL='https://dps.iowa.gov/media/152/download?inline=';
export const PORTAL='https://stateofiowa.seamlessdocs.com/f/DPS_DCI_Criminal_History_Billing_and_Request_Form';
export const EVIDENCE='data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-dci77-set';
const exact=(o,keys,label)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(o,k)))throw Error(label+': exact keys and explicit nulls required');};
const present=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
const optional=(v,key,max=180)=>{if(v!==null)text(v,key,max);};
const paymentOptions={check:'Check',money_order:'Money_Order',card:'Credit_Card_Debit_Card',prepaid:'PrePaid_DCI_Account',cash:'Cash'};
const full=n=>[n.first,n.middle,n.last].filter(Boolean).join(' ');
const phone=v=>v===null?null:`${v.slice(0,3)}-${v.slice(3,6)}-${v.slice(6)}`;
const formatDate=s=>s===null?null:`${s.slice(5,7)}/${s.slice(8,10)}/${s.slice(0,4)}`;
export function validateFacts(input){
 exact(input,['synthetic','subjectIsRequester','purpose','assessmentDate','channel','returnMethod','requester','names','dob','gender','genderAnswerSource','ssn','notarizedResults','payment'],'facts');
 const f=structuredClone(input);if(typeof f.synthetic!=='boolean'||f.subjectIsRequester!==true)throw Error('Only an explicit own-record request is supported');
 if(!['personal_record','901c3_preparation'].includes(f.purpose))throw Error('Acquisition purpose required, not relief');
 dateValue(f.assessmentDate);
 if(!['mail','fax','email','in_person','online_portal'].includes(f.channel))throw Error('Unsupported channel; no phone request');
 if(!['mail','fax','email'].includes(f.returnMethod))throw Error('Choose actual return method');
 exact(f.requester,['address','country','phone','fax','email'],'requester');
 for(const k of ['address','country','phone','fax','email'])optional(f.requester[k],k);
 for(const k of ['phone','fax'])if(f.requester[k]!==null&&!/^\d{10}$/.test(f.requester[k]))throw Error(k+': ten digits required');
 if(f.requester.email!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.requester.email))throw Error('Invalid return email');
 if(f.requester.country!==null&&!['US','CA','OTHER'].includes(f.requester.country))throw Error('Explicit return country classification required');
 if(f.returnMethod==='mail'&&f.requester.country==='OTHER')throw Error('DCI mails only to US/Canadian addresses; choose an actually available alternative');
 // This adapter accepts a US fax only; a non-US fax cannot be represented by a ten-digit guess.
 if(f.returnMethod==='fax'&&f.requester.country!==null&&f.requester.country!=='US')throw Error('US fax required for fax return');
 if(!Array.isArray(f.names)||f.names.length<1||f.names.length>40)throw Error('One to forty complete requested names supported; do not truncate');
 const surnames=new Set();for(const n of f.names){exact(n,['first','middle','last'],'name');text(n.first,'first',70);text(n.last,'last',70);optional(n.middle,'middle',70);if(surnames.has(n.last.toLowerCase()))throw Error('Duplicate surname request must be reconciled, not charged twice');surnames.add(n.last.toLowerCase());}
 if(f.dob!==null&&dateValue(f.dob)>=dateValue(f.assessmentDate))throw Error('DOB must precede assessment');
 if(f.ssn!==null&&!/^\d{9}$/.test(f.ssn))throw Error('SSN optional but must contain nine supplied digits');
 if(![null,'M','F','Other'].includes(f.gender))throw Error('Use only the actual supplied form option; never infer gender');
 if(f.gender===null?f.genderAnswerSource!==null:f.genderAnswerSource!=='participant')throw Error('Known gender requires an explicit participant answer');
 if(![true,false,null].includes(f.notarizedResults))throw Error('Notarized-results preference must be explicit or unknown');
 exact(f.payment,['method','reference','account','cardholderName'],'payment');
 if(f.payment.method!==null&&!Object.hasOwn(paymentOptions,f.payment.method))throw Error('Participant payment method not supported; no inter-agency authority');
 optional(f.payment.reference,'payment reference',40);optional(f.payment.account,'DCI account',50);optional(f.payment.cardholderName,'cardholder name',130);
 if(!['check','money_order'].includes(f.payment.method)&&f.payment.reference!==null)throw Error('Payment reference inapplicable');
 if(f.payment.method!=='prepaid'&&f.payment.account!==null)throw Error('Prepaid account inapplicable');
 if(f.payment.method!=='card'&&f.payment.cardholderName!==null)throw Error('Cardholder inapplicable');
 if(['fax','email','online_portal'].includes(f.channel)&&f.payment.method!==null&&!['card','prepaid'].includes(f.payment.method))throw Error('Remote channel needs card/prepaid details, not an assertion that a physical payment was sent');
 if(f.payment.method==='cash'&&f.channel!=='in_person')throw Error('Cash branch supported in person only; do not send cash by mail');
 const missing=[];
 for(const [k,v] of [['dob',f.dob],['requester.address',f.requester.address],['requester.phone',f.requester.phone]])if(!present(v))missing.push(k);
 if(['mail','fax'].includes(f.returnMethod)&&f.requester.country===null)missing.push('requester.country');
 if(f.returnMethod==='email'&&!present(f.requester.email))missing.push('requester.email');
 if(f.returnMethod==='fax'&&!present(f.requester.fax))missing.push('requester.fax');
 if(f.gender===null)missing.push('gender_requirement_conflict');
 if(f.payment.method===null)missing.push('payment.method');
 if(f.payment.method==='prepaid'&&f.payment.account===null)missing.push('payment.account');
 if(['check','money_order'].includes(f.payment.method)&&f.payment.reference===null)missing.push('payment.reference');
 return {facts:f,requestCount:f.names.length,totalFeeDollars:f.names.length*15,missing,kind:f.channel==='online_portal'?'ONLINE_GUIDANCE_ONLY':'PDF_REQUEST_PREPARATION',genderTreatment:f.gender===null?'UNRESOLVED_UNKNOWN_NOT_SUBMISSION_READY':'VOLUNTEERED_VALUE_MATCHES_PRINTED_FORM',sourceConflictResolvedByGuess:false};
}
const base={synthetic:true,subjectIsRequester:true,purpose:'901c3_preparation',assessmentDate:'2026-09-08',channel:'mail',returnMethod:'mail',requester:{address:'100 Example Lane, Iowa City, IA 52240',country:'US',phone:'3195550101',fax:null,email:'avery.example@example.org'},names:[{first:'Avery',middle:'Jordan',last:'Example'}],dob:'1990-04-12',gender:'Other',genderAnswerSource:'participant',ssn:null,notarizedResults:false,payment:{method:'check',reference:'1001',account:null,cardholderName:null}};
export function fixtureFacts(){const b=()=>structuredClone(base);return {
 canonical:b(),
 boundary:{...b(),returnMethod:'email',names:[{first:'Alexandra',middle:'Catherine',last:'Montgomery-Example'},{first:'Alexandra',middle:'Catherine',last:'Rivera-Example'}],requester:{...base.requester,address:'9999 Example Heritage Blvd Apt 1234, University Heights IA 52246',email:'alexandra.montgomery.example@example.org'},gender:'F'},
 'fax-card':{...b(),channel:'fax',returnMethod:'fax',requester:{...base.requester,fax:'3195550198'},payment:{method:'card',reference:null,account:null,cardholderName:'Avery Jordan Example'}},
 'email-prepaid':{...b(),channel:'email',returnMethod:'email',payment:{method:'prepaid',reference:null,account:'EXAMPLE-ACCOUNT-1',cardholderName:null}},
 'in-person-cash':{...b(),channel:'in_person',payment:{method:'cash',reference:null,account:null,cardholderName:null}},
 'money-order':{...b(),payment:{method:'money_order',reference:'EXAMPLE-MO-1001',account:null,cardholderName:null}},
 'unknown-gender':{...b(),gender:null,genderAnswerSource:null},
 'missing-required':{...b(),dob:null,requester:{address:null,country:null,phone:null,fax:null,email:null},payment:{method:null,reference:null,account:null,cardholderName:null},notarizedResults:null},
 'eleven-surnames':{...b(),names:['Example','Example-Alfa','Example-Bravo','Example-Charlie','Example-Delta','Example-Echo','Example-Foxtrot','Example-Golf','Example-Hotel','Example-India','Example-Juliet'].map(last=>({first:'Avery',middle:'Jordan',last}))},
 'portal-two-names':{...b(),channel:'online_portal',returnMethod:'email',gender:null,genderAnswerSource:null,names:[base.names[0],{first:'Avery',middle:'Jordan',last:'Sample'}],payment:{method:'card',reference:null,account:null,cardholderName:null}},
 'portal-known-answer':{...b(),channel:'online_portal',returnMethod:'email',payment:{method:'card',reference:null,account:null,cardholderName:'Avery Jordan Example'}},
 'notarized-results-request':{...b(),purpose:'personal_record',notarizedResults:true}
};}
const labels={Results:'Results delivery selection',Results_Notorized:'Request for notarized results: participant election',Gender:'Subject gender, printed form required / web optional',DCI_USE_DATE:'Agency search date',DCI_USE_Criminal_Record:'Agency record-search finding', 'DCI_USE_DCI#':'Agency assigned criminal-history number',DCI_USE_Processed_By:'Agency processing official',DCI_Account_Number:'Requester prepaid DCI account',Name_Business_Individual:'Requester full name',Mailing_Address:'Requester mailing address',Phone_Number:'Requester phone',Fax_Number:'Requester fax',Email_Address:'Requester email',Payment:'Selected payment method, not proof of payment',Credit_Card_Number:'Payment card number',Expiration_Date:'Payment card expiration',Cardholder_Name:'Payment cardholder name',CSV_Code:'Payment card security code',Check_Number:'Check number',Money_Order_Number:'Money order number',Date_af_date:'Actual request submission date',Email_Address2:'Requester email',Fax_Number2:'Requester fax',Phone_Number2:'Requester phone',Mailing_Address2:'Requester mailing address',Name_Business_Individual2:'Requester full name',DCI_Account_Number2:'Requester prepaid DCI account',Last_Name2:'Subject requested surname',First_Name2:'Subject first name',Middle_Name2:'Subject middle name, recommended',Date_of_Birth2:'Subject date of birth',Social_Security_Number2:'Subject SSN, recommended',Signature2:'Participant release authorization signature',Number_Requests:'Number of requested surnames',Total_Due:'DCI fee total, not proof of payment'};
function bindings(v,index){const f=v.facts,m=new Map(),n=f.names[index];const put=(k,value,fact)=>{if(present(value))m.set(k,{value,fact});};
 for(const suffix of ['', '2']){put('Name_Business_Individual'+suffix,full(f.names[0]),'requester.fullName');put('Mailing_Address'+suffix,f.requester.address,'requester.address');put('Phone_Number'+suffix,phone(f.requester.phone),'requester.phone');put('Fax_Number'+suffix,phone(f.requester.fax),'requester.fax');put('Email_Address'+suffix,f.requester.email,'requester.email');if(f.payment.method==='prepaid')put('DCI_Account_Number'+suffix,f.payment.account,'payment.account');}
 put('Last_Name2',n.last,`names.${index}.last`);put('First_Name2',n.first,`names.${index}.first`);put('Middle_Name2',n.middle,`names.${index}.middle`);put('Date_of_Birth2',formatDate(f.dob),'dob');put('Gender',f.gender,'gender');put('Social_Security_Number2',f.ssn,'ssn');
 put('Results',f.returnMethod[0].toUpperCase()+f.returnMethod.slice(1),'returnMethod');
 if(f.payment.method!==null)put('Payment',paymentOptions[f.payment.method],'payment.method');
 if(f.payment.method==='check')put('Check_Number',f.payment.reference,'payment.reference');if(f.payment.method==='money_order')put('Money_Order_Number',f.payment.reference,'payment.reference');if(f.payment.method==='card')put('Cardholder_Name',f.payment.cardholderName,'payment.cardholderName');
 put('Number_Requests',String(v.requestCount),'derived.requestCount');put('Total_Due',v.totalFeeDollars.toFixed(2),'derived.totalFeeDollars');f.names.slice(0,10).forEach((n,i)=>put(`Last_Name_${i+1}`,n.last,`names.${i}.last`));return m;
}
function blank(id,v){const f=v.facts,na=reason=>({completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:reason,reason}),need=(reason,fact=null)=>({completenessDisposition:'REQUIRED_BEFORE_FILING',requiredBeforeFiling:true,requiredBeforeSubmission:true,factAvailable:false,routeDetermined:false,fact,reason});
 if(id.startsWith('DCI_USE_'))return {completenessDisposition:'PROTECTED_FIELD',refusalClass:'court_prosecutor_clerk_or_agency_owned',fieldOwner:'DCI',reason:'Only DCI may enter a search date, result, record number or processing official. This is a blank request, not a returned report.'};
 if(id==='Signature2'||id==='Date_af_date')return {completenessDisposition:'PROTECTED_FIELD',refusalClass:'signature_or_date_participant_completion',reason:id==='Signature2'?'Subject signs the release personally before submission; no generated signature.':'Enter the actual submission date, not the assessment or build date.'};
 if(id==='Results_Notorized')return {completenessDisposition:'PARTICIPANT_ELECTION_GENUINE',refusalClass:'participant_sworn_narrative_or_legal_election',reason:'At submission personally choose Yes or No for the actual notarized-results requirement. This is not applicant notarization or an agency act.'};
 if(['Credit_Card_Number','Expiration_Date','CSV_Code','Cardholder_Name'].includes(id))return f.payment.method==='card'?need('Selected card payment: enter the actual '+labels[id].toLowerCase()+' privately on the billing form before submission. No card credentials are collected or fabricated.'):na('No card payment selected.');
 if(id.startsWith('DCI_Account_Number'))return f.payment.method==='prepaid'?need('Obtain your actual prepaid DCI account number before submitting.','payment.account'):na('No prepaid account selected.');
 if(id==='Check_Number')return f.payment.method==='check'?need('Write the actual check number before submission.','payment.reference'):na('No check selected.');
 if(id==='Money_Order_Number')return f.payment.method==='money_order'?need('Write the actual money-order number before submission.','payment.reference'):na('No money order selected.');
 if(id==='Payment')return {...need('Select a supported real payment method and include payment before submitting.','payment.method'),determinedByTheCaseNotTheRoute:true,whyTheRouteCannotDetermineIt:'The printed billing form asks for the requester\'s actual payment method; this acquisition route cannot select a payment instrument on their behalf.'};
 if(/^Last_Name_\d+$/.test(id))return na('No additional surname occupies this unused billing-summary slot.');
 if(id==='Gender')return {...need('Do not submit this PDF yet: the printed required-gender field conflicts with optional web guidance. Supply a volunteered answer or obtain agency clarification; no gender was inferred.','gender'),determinedByTheCaseNotTheRoute:true,whyTheRouteCannotDetermineIt:'Gender is an individual identity answer, not an election determined by this record-acquisition route. The source conflict is retained as an unresolved submission stop.'};
 if(id==='Social_Security_Number2'||id==='Middle_Name2')return na('Recommended, not required, and no value was supplied.');
 if(id.startsWith('Fax_Number'))return f.returnMethod==='fax'?need('Provide the actual US fax destination before requesting fax return.','requester.fax'):na('Fax is not the selected return channel and no fax number was supplied.');
 if(id.startsWith('Email_Address'))return f.returnMethod==='email'?need('Provide an actual email destination before requesting email return.','requester.email'):na('Email is not the selected return channel and no email address was supplied.');
 const key=id==='Date_of_Birth2'?'dob':id.startsWith('Mailing_Address')?'requester.address':id.startsWith('Phone_Number')?'requester.phone':null;
 if(key)return need('Supply the actual '+labels[id].toLowerCase()+' before submission; nothing was invented.',key);
 throw Error('Unaccounted DCI source field '+id);
}
async function component(v,index,sourcePages,id,sourceBytes=null){
 const raw=sourceBytes??await fs.readFile(path.join(ROOT,SOURCE));if(sha256(raw)!==SOURCE_SHA256)throw Error('DCI source drift');
 const d=await PDFDocument.load(raw,{updateMetadata:false}),fields=d.getForm().getFields();if(d.getPageCount()!==3||fields.length!==45)throw Error('DCI field inventory drift');
 const font=await d.embedFont(StandardFonts.Helvetica),wanted=bindings(v,index),writes=[],blanks=[],inventory=[];
 for(const field of fields){const name=field.getName(),type=field.constructor.name;const original=field.acroField.getWidgets().map(w=>({page:d.getPages().findIndex(p=>p.ref===w.P())+1,rect:w.getRectangle(),flags:w.getFlags(),selectionValue:w.getOnValue()?.decodeText()??null}));if(!original.every(w=>sourcePages.includes(w.page)))continue;
  const widgets=original.map(w=>{const r=w.rect;return {page:sourcePages.indexOf(w.page)+1,sourcePage:w.page,rect:{x:Math.min(r.x,r.x+r.width),y:Math.min(r.y,r.y+r.height),width:Math.abs(r.width),height:Math.abs(r.height)},sourceRect:r,flags:w.flags,selectionValue:w.selectionValue};});
  field.acroField.getWidgets().forEach((w,i)=>w.setRectangle(widgets[i].rect));
  const row={fieldId:name,sourceFieldId:name,field:name,documentId:id,label:labels[name]??'Billing surname slot '+name,type,widgets,isSelectionControl:field instanceof PDFRadioGroup||field instanceof PDFDropdown};if(name.startsWith('DCI_USE_')){
   const literal={DCI_USE_DATE:'As of',DCI_USE_Criminal_Record:'NO IOWA CRIMINAL HISTORY RECORD FOUND WITH DCI / AN IOWA CRIMINAL HISTORY RECORD WAS FOUND','DCI_USE_DCI#':'DCI#',DCI_USE_Processed_By:'Processed by'}[name];
   row.effectiveLabel='FOR DCI USE ONLY: '+literal;row.printedLabel=literal;
   row.sourceActorEvidence={sourceSha256:SOURCE_SHA256,sourcePage:2,printedHeading:'FOR DCI USE ONLY',sourceFieldId:name,owner:'DCI',reason:'The actual source reserves this entire block to DCI; distinct from requester or subject identity fields.'};
  }
  inventory.push({name,pdfType:type,widgets:original});
  const w=wanted.get(name);
  if(w){let fit=null;if(field instanceof PDFTextField){fit=fitTextToWidget({font,text:String(w.value),rect:widgets[0].rect,multiline:false,maxFontSize:11,minFontSize:8,evaluateDeclaredMinimumSize:true});if(!applyFitToTextField(field,fit))throw Error('Unreadable supplied DCI text: '+name);for(const widget of field.acroField.getWidgets())widget.setDefaultAppearance(`/Helv ${fit.fontSize} Tf 0 g`);}
   else if(field instanceof PDFDropdown){if(!field.getOptions().includes(w.value))throw Error('Unknown dropdown value');field.select(w.value);field.setFontSize(11);field.updateAppearances(font);}
   else if(field instanceof PDFRadioGroup){if(!field.getOptions().includes(w.value))throw Error('Unknown radio value');if(field.getSelected()!==undefined)throw Error('Held source unexpectedly preselected');row.selectionMode='retained_original_off_appearance_plus_inset_mark';/* Keep the actual issuer circle appearances; mark after flattening rather than replace them with empty off streams. */}
   else throw Error('Unknown field type');writes.push({...row,...w,fit});
  }else blanks.push({...row,...blank(name,v)});
 }
 const {clean,report:sanitation}=await sanitizeAndFlatten(d,{defaultFont:font,writtenFields:new Set(writes.filter(w=>w.type!=='PDFRadioGroup').map(w=>w.fieldId)),detachNestedControlFields:true,suppressSynthesizedAppearances:true,fitAppearancesToRect:true,suppressSynthesizedWidgetBorders:true,honorWidgetBorderStyle:true,preserveUnwrittenSelectionBackgrounds:true});
 preserveSourceMetadata(d,clean);carryDates(d,clean);
 // DCI's radio circles exist in its authored widget appearances, unlike Form1's
 // printed squares. Preserve all original circles, then draw only the selected
 // mark in the measured interior. The emitted PDF is flattened, not interactive.
 for(const w of writes.filter(w=>w.type==='PDFRadioGroup')){
  const selected=w.widgets.filter(x=>x.selectionValue===w.value);if(selected.length!==1)throw Error('Ambiguous source radio option');
  const z=selected[0],r=z.rect,p=clean.getPages()[z.sourcePage-1];
  p.drawLine({start:{x:r.x+4,y:r.y+4},end:{x:r.x+r.width-4,y:r.y+r.height-4},thickness:1,color:rgb(0,0,0)});
  p.drawLine({start:{x:r.x+4,y:r.y+r.height-4},end:{x:r.x+r.width-4,y:r.y+4},thickness:1,color:rgb(0,0,0)});
 }

 const single=await PDFDocument.create();for(const p of await single.copyPages(clean,sourcePages.map(n=>n-1)))single.addPage(p);preserveSourceMetadata(d,single);carryDates(d,single);
 const bytes=await finalizedBytes(single),read=await PDFDocument.load(bytes,{updateMetadata:false}),runs=read.getPages().map(extractTextItems);
 const textWrites=writes.filter(w=>['PDFTextField','PDFDropdown'].includes(w.type)).map(w=>{const z=w.widgets[0],r=z.rect;const found=runs[z.page-1].filter(t=>t.x>=r.x-.1&&t.x<=r.x+r.width&&t.y>=r.y&&t.y<=r.y+r.height).map(t=>t.text).join('').replace(/\s/g,'');const expected=String(w.value).replace(/\s/g,'');if(!found.includes(expected))throw Error('Final DCI text missing: '+id+':'+w.fieldId);return {fieldId:w.fieldId,expectedValue:w.value,nonWhitespaceGlyphs:expected.length,visible:true,rect:r,page:z.page};});
 return {id,bytes,pages:sourcePages.length,sourcePages,writes,blanks,sourceFields:inventory,sanitation,textWrites};
}
function instructions(v,blanks){const f=v.facts,portal=v.kind==='ONLINE_GUIDANCE_ONLY',missing=blanks.filter(b=>b.completenessDisposition==='REQUIRED_BEFORE_FILING');
 return [
 {heading:'1. What this prepares',paragraphs:[`This is a request for your own Iowa DCI criminal history, not an expungement petition or a returned criminal-history report. It changes no record and proves no search result. Requested surnames: ${f.names.map(n=>n.last).join('; ')}.`,portal?'ONLINE GUIDANCE ONLY. No DCI request or billing PDF has been generated for portal submission. Use the official portal yourself; no form has been submitted, signed or paid by LegalEase.':`The packet contains one DCI-76 billing page, ${v.requestCount} separate DCI-77 request page(s), the complete official instructions${f.names.length>10?', and an additional surname-summary sheet':''}. Keep this next-steps guide separate from the agency forms.`,f.synthetic?'All names, identifiers, account references and other personal facts in this example are synthetic. DO NOT SUBMIT THESE EXAMPLES.':'Check every supplied identity and contact value. No agency finding is provided.']},
 {heading:'2. Selected channel and requirements',paragraphs:[
 portal?'The official web instructions require a separate request AND billing submission for EACH requested surname. Use card/debit details or a real DCI account and supply the return address, fax or email on BOTH online forms. The paper rule of one billing form for a multi-request batch does not apply to separate online submissions.':'You selected '+f.channel.replaceAll('_',' ')+'. For these downloaded PDF forms, send one completed billing form with all the surname request forms and the total fee. Do not submit an extra duplicate bill for each surname in the same PDF batch.',
 'Current web instructions say gender is optional, while the linked PDF labels gender required. '+(portal?(f.gender===null?'Your answer is unknown and this guide does not resolve the conflicting requirement. This preparation is NOT submission-ready. Nothing was entered in the portal. Do not guess or choose Other as a substitute; ask DCI to clarify the requirement before submitting.':`You explicitly supplied ${f.gender}. Enter or correct your own answer in the official portal; this guide has not entered or submitted that answer.`):(f.gender===null?'Your answer is unknown. It remains blank and this preparation is NOT submission-ready. Do not guess, choose Other as a substitute, or treat the online page as a confirmed exemption in this PDF. Obtain agency clarification or provide your own volunteered answer.':`You explicitly supplied ${f.gender}; that exact allowed value is entered on the printed form. It was not derived from your name or any other characteristic.`)),
 portal?'The portal itself remains a participant-operated external workflow. This guide does not verify its dynamic required-field rules, acceptance, signatures or payment. Resolve any conflicting requirement with DCI before submitting.':(f.channel==='mail'?'Mail the completed signed request pages and billing/payment to DCI Support Operations Bureau, Dissemination Unit, 215 E 7th St, Des Moines, IA 50319. Do not mail cash.':f.channel==='fax'?'Fax completed signed request pages and billing details to 515-725-6080. Do not claim that a check, cash or money order was transmitted by fax.':f.channel==='email'?'The source permits scan/email submission to dcirecordchecks@dps.state.ia.us. Complete and sign the request yourself first. Consider the sensitivity of payment and identity data; use the official portal or another accepted channel instead when preferable. LegalEase does not send this email.':'Take government-issued photo ID and the prepared forms/payment to DCI at 215 E 7th St, Des Moines, IA 50319. The agency lists own-record in-person hours as 8 a.m.-4 p.m., Monday-Friday; verify access before travelling. Immediate results are limited to own-record requests, not guaranteed by this packet.')
 ]},
 {heading:'3. Complete payment and execution personally',paragraphs:[
 `DCI charges $15 per requested surname. ${v.requestCount} request(s) total $${v.totalFeeDollars.toFixed(2)}. This is the agency fee, not a court filing charge or a LegalEase payment. No fee was paid or waived by this generator.`,
 f.payment.method===null?'Payment method is unknown. Select an accepted method and supply payment before submission.':`Selected payment method: ${f.payment.method.replaceAll('_',' ')}. The selection is not payment. `+(f.payment.method==='card'?'Complete the real card number, expiration, cardholder name and CSV/security code privately on the billing form. No card credentials are stored by this generator.':f.payment.method==='prepaid'?'Confirm the real account number and available funds with DCI.':f.payment.method==='cash'?'Pay cash in person; the packet is not a cash receipt.':'Include the actual check or money order, payable to Iowa Division of Criminal Investigation; confirm its number and amount.'),
 'Enter the actual request date on the billing form. Personally sign EACH DCI-77 release authorization before submission. The release permits disclosure allowed by law and certifies the supplied information; no one has signed it for you. Do not fill any FOR DCI USE ONLY area.',
 'Personally select Yes or No for notarized results on each request. '+(f.notarizedResults===null?'You did not supply this preference.':f.notarizedResults?'You report needing notarized results. The form describes this option for specific requirements in another country; confirm the receiving authority requires it and accepts the return method.':'You report no notarized-results requirement.')+' This is a request for agency notarization of results, not a notarized applicant signature. No notarization is completed here.',
 portal?'Complete the actual identity, contact and payment fields in the official portal yourself. This guide has not filled either online form, signed a release, or paid a fee.':missing.length?'Unfinished source fields: '+[...new Set(missing.map(b=>b.label))].join('; ')+'. Complete the applicable fields before submission.':'Known source-required identity/payment-reference fields are entered, but signature, date, payment and personal notarized-results election remain real completion steps.',
 v.missing.includes('requester.country')?'The return country was not supplied. Resolve the actual mailing country or US fax destination before submission.':'SSN and middle name are recommended, not required. An omitted optional value is not an invented number or name.'
 ]},
 {heading:'4. Return, timing and downstream court use',paragraphs:[
 `Results requested by ${f.returnMethod}. DCI mails only to US/Canadian addresses and faxes only to US numbers; email may use a valid address elsewhere. Confirm the actual selected destination. Overseas authorities may not accept emailed results as originals.`,
 'Processing depends on volume, staffing, delivery and completeness. The current agency page gives 1-3 days in channel instructions and 2-5 business days in its FAQ. Do not treat either as a guaranteed arrival date; check current instructions and confirm receipt when needed.',
 f.purpose==='901c3_preparation'?'For a later section 901C.3 filing, Form 2 item 9 requires the RETURNED official DCI check dated within 30 days of filing and obtained with the DCI-77 signed release. Start the clock from the returned report issue date, not this request date. Submit the court application promptly and recheck timing. A blank request, billing page, payment or stated receipt is not the returned report.':'This acquisition packet has no universal court-filing expiry. A downstream court may have a separate timing rule; identify the actual remedy before relying on the report.',
 'A no-record finding can mean no releasable information rather than no criminal history. Unsigned release can limit disclosure of completed deferred judgments and older arrests without disposition. A release does not make confidential juvenile records available. Iowa DCI data do not include all other-state, FBI or federal records. Names and exact DOB alone are not fingerprint identification.',
 'When your actual report arrives, review it yourself. LegalEase does not receive, inspect or authenticate it. Contact DCI about disputed identity or accuracy; seek legal assistance for unexpected records, a missing required release or an expungement filing that cannot be completed in time. Keep your records private.'
 ]},
 {heading:'Official sources and contact',paragraphs:[WEB,PDF_URL,PORTAL,'DCI questions: 515-725-6066; dcirecordchecks@dps.state.ia.us. Forms DCI-76/DCI-77 dated 9/22/21. Check current agency instructions before submission.']}
 ];
}
export async function renderFixture(input,{sourceBytes=null}={}){const v=validateFacts(input),components=[],writes=[],blanks=[],sourceFields=[];
 if(v.kind!=='ONLINE_GUIDANCE_ONLY'){
  components.push(await component(v,0,[1],'billing',sourceBytes));
  for(let i=0;i<v.requestCount;i++)components.push(await component(v,i,[2],`request-${i+1}`,sourceBytes));
  components.push(await component(v,0,[3],'official-instructions',sourceBytes));
  if(v.requestCount>10){const extra=await proseDocument('Additional surnames for this DCI request',[{heading:'One batch, one billing form',paragraphs:[`Requester: ${full(v.facts.names[0])}. Total requests: ${v.requestCount}. Total fee: $${v.totalFeeDollars.toFixed(2)}. This is a surname-summary continuation, not a search result.`,...v.facts.names.slice(10).map((n,i)=>`Request ${i+11}: ${full(n)}`)]}],{synthetic:v.facts.synthetic});components.push({id:'additional-surnames',bytes:extra.bytes,pages:extra.pageCount,writes:[],blanks:[],sourceFields:[],textWrites:[]});}
 }
 for(const c of components){writes.push(...c.writes);blanks.push(...c.blanks);sourceFields.push(...c.sourceFields.map(f=>({...f,documentId:c.id})));}
 const sections=instructions(v,blanks);const guide=await proseDocument('Iowa DCI record request: next steps',sections,{synthetic:v.facts.synthetic,subtitle:full(v.facts.names[0])+' | '+(v.kind==='ONLINE_GUIDANCE_ONLY'?'Online instructions only':'Prepared request forms')});components.push({id:'participant-instructions',bytes:guide.bytes,pages:guide.pageCount,writes:[],blanks:[],sourceFields:[],textWrites:[]});
 const packet=await PDFDocument.create(),coverage=[];let p=1;
 for(const c of components){const d=await PDFDocument.load(c.bytes,{updateMetadata:false});for(const page of await packet.copyPages(d,d.getPageIndices()))packet.addPage(page);coverage.push({id:c.id,pages:c.pages,firstPacketPage:p,lastPacketPage:p+c.pages-1,sha256:sha256(c.bytes),sourcePages:c.sourcePages??[],sendToDci:v.kind!=='ONLINE_GUIDANCE_ONLY'&&!['participant-instructions','official-instructions'].includes(c.id)});p+=c.pages;}
 const pendingActions=v.kind==='ONLINE_GUIDANCE_ONLY'?['PARTICIPANT_COMPLETES_EXTERNAL_PORTAL',...v.missing]:['ACTUAL_SUBMISSION_DATE','SUBJECT_RELEASE_SIGNATURE_EACH_REQUEST','PAYMENT_COMPLETION','PERSONAL_NOTARIZED_RESULTS_ELECTION',...v.missing,...blanks.filter(b=>b.requiredBeforeSubmission).map(b=>`${b.documentId}:${b.fieldId}`)];
 return {bytes:await finalizedBytes(packet),pageCount:packet.getPageCount(),components,coverage,writes,blanks,sourceFields,instructions:sections,assessment:{...v,facts:undefined,pendingActions,candidateClass:v.kind==='ONLINE_GUIDANCE_ONLY'?'GUIDANCE_ONLY_NOT_SUBMITTED':v.missing.length?'DIAGNOSTIC_NOT_SUBMISSION_READY':'SUPPORTED_UNEXECUTED_REQUEST',submissionReady:false,agencyReportIncluded:false,releaseSignatureGenerated:false,paymentCompleted:false,filingMechanism:false}};
}
export async function buildFamily({outDir=path.join(ROOT,OUTPUT)}={}){
 const save=async(p,b)=>{const t=path.join(outDir,p);await fs.mkdir(path.dirname(t),{recursive:true});await fs.writeFile(t,typeof b==='string'||b instanceof Uint8Array?b:pretty(b));};
 const maps={schemaVersion:1,familyId:FAMILY,writes:[],refusals:[],availableFacts:{}},actual={familyId:FAMILY,artifacts:[],documents:[]},packets=[],readiness=[],census=[],receipt=[],guides=[];
 for(const [fixture,facts] of Object.entries(fixtureFacts())){
  const r=await renderFixture(facts);await save(`fixtures/${fixture}.json`,facts);await save(`fixtures/${fixture}.pdf`,r.bytes);
  for(const c of r.components)await save(`components/${fixture}/${c.id}.pdf`,c.bytes);
  await save(`reports/${fixture}.json`,{fixture,assessment:r.assessment,actualWrites:r.writes,blanks:r.blanks,sourceFields:r.sourceFields,components:r.coverage});
  const scope=x=>({...x,fieldId:`${fixture}:${x.documentId}:${x.fieldId}`,factId:x.fact?`${fixture}:${x.fact}`:null,documentId:`${fixture}/${x.documentId}`,fixture});maps.writes.push(...r.writes.map(scope));maps.refusals.push(...r.blanks.map(scope));
  const values={'requester.fullName':full(facts.names[0]),'requester.address':facts.requester.address,'requester.phone':facts.requester.phone,'requester.fax':facts.requester.fax,'requester.email':facts.requester.email,'payment.account':facts.payment.account,'payment.reference':facts.payment.reference,'payment.method':facts.payment.method,'payment.cardholderName':facts.payment.cardholderName,gender:facts.gender,dob:facts.dob,ssn:facts.ssn,returnMethod:facts.returnMethod,notarizedResults:facts.notarizedResults,'requester.country':facts.requester.country,'derived.requestCount':facts.names.length,'derived.totalFeeDollars':facts.names.length*15};facts.names.forEach((n,i)=>Object.entries(n).forEach(([k,v])=>values[`names.${i}.${k}`]=v));for(const[k,v]of Object.entries(values))maps.availableFacts[`${fixture}:${k}`]=v;
  for(const c of r.components.filter(c=>c.sourceFields.length)){
   const did=`${fixture}/${c.id}`;receipt.push({formNumber:did,path:SOURCE,sha256:SOURCE_SHA256,pages:3,selectedSourcePages:c.sourcePages});census.push({formNumber:did,sourceSha256:SOURCE_SHA256,fields:c.sourceFields});actual.documents.push({formNumber:did,fixture,actualWrites:c.writes.map(scope),sourceSha256:SOURCE_SHA256});
  }
  const measured=r.components.flatMap(c=>c.textWrites);actual.artifacts.push({fixture,finalPdf:`${OUTPUT}/fixtures/${fixture}.pdf`,valuesReportedByFinalizer:r.writes.length,addedGlyphsReadFromOutputBytes:measured.reduce((n,w)=>n+w.nonWhitespaceGlyphs,0),measuredTextWrites:measured});
  packets.push({fixture,path:`${OUTPUT}/fixtures/${fixture}.pdf`,relativePath:`fixtures/${fixture}.pdf`,sha256:sha256(r.bytes),bytes:r.bytes.length,pageCount:r.pageCount,documents:r.coverage.map(c=>({...c,documentId:`${fixture}/${c.id}`})),kind:r.assessment.kind});
  readiness.push({fixture,...r.assessment,missingControlAreas:r.blanks.filter(b=>b.requiredBeforeSubmission).map(scope),signatureAndPaymentStillRequired:r.assessment.kind!=='ONLINE_GUIDANCE_ONLY'});
  guides.push(`## ${fixture}\n\n`+r.instructions.map(s=>`### ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n')+'\n\n### Exact source completion areas\n\n'+r.blanks.map(b=>`${scope(b).fieldId}: ${b.label}. ${b.reason}`).join('\n\n'));
 }
 await save('production-field-map.json',maps);await save('field-census.census-v1.json',{familyId:FAMILY,documents:census});await save('source-receipt.json',{familyId:FAMILY,documents:receipt,sourceSha256:SOURCE_SHA256,sourcePath:SOURCE,edition:'DCI76/DCI77 9/22/21',pages:3,byteCount:1076864,sourceApproval:false,issuer:PDF_URL,retainedRequestDriveId:'15Ts_wps2vvJhPamwj-OFrez9IUZFsYac',retainedBillingDriveId:'1cgNkclodlyJ6MiMOMzLpHR4tdPcAirAt',twoLocatorsSameCombinedSource:true,webChecked:'2026-09-08',currentIssuerBytesMatched:false});
 await save('reports/actual-writes.json',actual);await save('reports/blank-dispositions.json',{familyId:FAMILY,blanks:maps.refusals});await save('reports/blanks-left-for-the-participant.json',{familyId:FAMILY,fixtures:readiness});await save('reports/packet-level-readiness.json',{familyId:FAMILY,fixtures:readiness,submissionReady:false,acquisitionOnly:true,externalRecordIncluded:false});await save('reports/rendered-artifacts.json',{familyId:FAMILY,packets});await save('participant-instructions.md','# DCI acquisition: fixture-specific source-bound instructions\n\n'+guides.join('\n\n'));
 await save('route-contract.json',{familyId:FAMILY,nodeType:'supporting_action',relief:false,commercialClearingMechanism:false,sourcePath:SOURCE,pdfChannels:['mail','fax','email','in_person'],online:'guidance only; no portal execution or generated submission PDFs',paperBatchBilling:'one billing form for the whole batch; one request and $15 per surname',onlineBilling:'separate request and billing submission per surname',gender:'known volunteered option filled; unknown remains unresolved and not submission-ready on either delivered diagnostic',dateAndRelease:'participant executes',agencyFields:'never written',cardCredentials:'manual private completion, not accepted generator inputs',downstream:'30-day report rule belongs to Form2 court filing, not request generation',authority:WEB,routeInput:'data/record-clearing/legal-design-intake/IA.memo.json'});
 await save('approval-request.json',{familyId:FAMILY,status:'REVIEW_REQUESTED_NOT_APPROVED'});await save('build-status.json',{familyId:FAMILY,status:'BUILT_ACQUISITION_CANDIDATE',terminal:false,runtimeInstalled:false,independentReview:'PENDING_CHAT10',centralRaster:'PENDING_OWNER',productionReady:false});
 // Real unmodified importer; report any actor/schema limitations instead of weakening it.
 const result=auditFamily(path.relative(ROOT,outDir),FAMILY);await save('reports/completeness-result.json',result);await save('reports/completeness-counters.json',result.counters);
 console.log(pretty({familyId:FAMILY,completeVariants:packets.length,completePages:packets.reduce((n,p)=>n+p.pageCount,0),importer:result.result,counters:result.counters}));return packets;
}
