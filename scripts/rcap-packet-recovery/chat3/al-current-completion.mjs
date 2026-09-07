/** Source-bound repair for the two retained CR-65 / C-10 family hosts only.
 * This consumes held case facts. It never verifies eligibility, issues a docket,
 * grants a waiver, or certifies a participant's answers.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {ssnLastFour,ssnLastFourRefusal,SSN_LAST_FOUR_FACT,SSN_LAST_FOUR_LABEL} from './al-ssn-last-four.mjs';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
export const C10_SSN='Last 4 Digits of Social Security Number';
const HEADERS=new Set(['Text1','Text4','Text5','Text7','Court Case Number','Court Case Number_2','Court Case Number_3','Court Case Number_4']);
export function isPetitionHeader(documentId,name){return documentId==='CR-65'?HEADERS.has(name):documentId==='C-10-CRIMINAL'&&/^Court Case Number(?:_[23])?$/.test(name);}
export function isLastFour(documentId,name){return (documentId==='CR-65'&&name==='Text2')||(documentId==='C-10-CRIMINAL'&&name===C10_SSN);}

/** A bare docket value is insufficient. The trusted upstream caller must supply
 * the actual retained assignment record plus its independently retained digest.
 * The digest checks the binding, not the authenticity of an external issuer.
 * Synthetic test records are explicitly labelled and barred in non-test facts.
 * Real source acquisition/verification remains the upstream owner's boundary.
 */
export function assignedPetitionNumber(facts){
  const a=facts.petitionAssignment;
  if(a===undefined||a===null)return null;
  assert.ok(a&&typeof a==='object'&&!Array.isArray(a),'INVALID_PETITION_ASSIGNMENT');
  const e=a.evidence;
  assert.ok(e&&typeof e==='object'&&typeof e.content==='string'&&e.content.length>0,'ASSIGNMENT_EVIDENCE_REQUIRED');
  assert.match(e.sha256??'',/^[0-9a-f]{64}$/,'ASSIGNMENT_DIGEST_REQUIRED');
  assert.equal(digest(Buffer.from(e.content,'utf8')),e.sha256,'ASSIGNMENT_EVIDENCE_DIGEST_MISMATCH');
  const record=JSON.parse(e.content);
  assert.equal(record.recordType,'clerk_petition_docket_assignment','ASSIGNMENT_RECORD_KIND');
  assert.equal(record.issuingActor,'circuit_court_clerk','ASSIGNMENT_ISSUER_REQUIRED');
  assert.ok(typeof record.sourceReference==='string'&&record.sourceReference.trim(),'ASSIGNMENT_SOURCE_REFERENCE_REQUIRED');
  assert.equal(record.underlyingCaseNumber,facts.caseNumber,'ASSIGNMENT_UNDERLYING_CASE_MISMATCH');
  assert.equal(record.county,facts.county,'ASSIGNMENT_COUNTY_MISMATCH');
  assert.ok(typeof record.petitionNumber==='string'&&record.petitionNumber.trim()===record.petitionNumber&&record.petitionNumber.length>0,'ASSIGNMENT_NUMBER_REQUIRED');
  assert.equal(a.number,record.petitionNumber,'ASSIGNMENT_NUMBER_MISMATCH');
  assert.ok(record.synthetic===false||(record.synthetic===true&&facts.synthetic===true),'SYNTHETIC_ASSIGNMENT_FORBIDDEN_OUTSIDE_FIXTURE');
  assert.equal(e.status,'verified_retained_record','ASSIGNMENT_VERIFICATION_REQUIRED');
  assert.ok(typeof e.verificationReference==='string'&&e.verificationReference.trim(),'ASSIGNMENT_VERIFICATION_REFERENCE_REQUIRED');
  return {value:record.petitionNumber,factId:'matter.clerk_assigned_petition_number',provenance:{sourceReference:record.sourceReference,sha256:e.sha256,verificationReference:e.verificationReference,issuingActor:record.issuingActor,synthetic:record.synthetic}};
}
function bool(v,label){assert.ok(v===undefined||v===null||typeof v==='boolean',`${label}: boolean or unknown required`);return v??null;}
function text(v,label){if(v===undefined||v===null||v==='')return null;assert.ok(typeof v==='string'&&v.trim()===v&&v.length>0,`${label}: held text required`);return v;}
function money(v,label){const t=text(v,label);if(t!==null)assert.match(t,/^(?:0|[1-9]\d*)(?:\.\d{2})?$/,`${label}: nonnegative held dollar amount required`);return t;}
export function validateAlCompletion(facts){
  ssnLastFour(facts);assignedPetitionNumber(facts);
  assert.equal(typeof facts.requestFeeWaiver,'boolean','EXPLICIT_FEE_WAIVER_SELECTION_REQUIRED');
  // These petition families have the State caption. Do not turn a local
  // underlying offense into a municipal-court expungement proceeding.
  assert.equal(facts.captionParty,'state','STATE_CAPTION_REQUIRED_FOR_THIS_FAMILY');
  const f=facts.finances??{};assert.ok(f&&typeof f==='object'&&!Array.isArray(f),'FINANCIAL_CONTEXT_REQUIRED');
  const married=bool(f.married,'married'),maritalOffense=bool(f.maritalOffense,'maritalOffense'),property=bool(f.ownsOtherProperty,'ownsOtherProperty');
  const spouseName=text(f.spouseName,'spouseName'),spouseIncome=money(f.spouseMonthlyGross,'spouseMonthlyGross');
  const propertyDescription=text(f.otherPropertyDescription,'otherPropertyDescription'),propertyValue=money(f.otherPropertyValue,'otherPropertyValue');
  assert.ok(spouseName===null||married===true,'SPOUSE_NAME_REQUIRES_MARRIAGE_FACT');
  assert.ok(spouseIncome===null||(married===true&&maritalOffense===false),'SPOUSE_INCOME_NOT_APPLICABLE_OR_UNRESOLVED');
  assert.ok((propertyDescription===null&&propertyValue===null)||property===true,'PROPERTY_DETAIL_REQUIRES_YES');
  return {married,maritalOffense,property,spouseName,spouseIncome,propertyDescription,propertyValue};
}
const inactive=(label,reason,requiredWhen=null)=>({effectiveLabel:label,reason,completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',requiredBeforeFiling:false,factAvailable:false,requiredWhen,role:'participant',routeDetermined:true});
const conditional=(label,requiredWhen,applicable,reason)=>({effectiveLabel:label,reason,completenessDisposition:applicable===false?'NOT_APPLICABLE_ON_THIS_ROUTE':applicable===true?'REQUIRED_BEFORE_FILING':'CONDITIONAL_REQUIRED_BEFORE_FILING',requiredBeforeFiling:applicable===true,requiredWhen,applicability:applicable===null?'unresolved':applicable?'applies':'not_applicable',factAvailable:false,role:'participant',routeDetermined:false});
export function completionForField(documentId,name,page,facts){
  if(isLastFour(documentId,name)){
    const value=ssnLastFour(facts);
    return value===null?{refusal:{...ssnLastFourRefusal(),effectiveLabel:`${documentId} page ${page}: ${SSN_LAST_FOUR_LABEL}`}}:{write:{value,factId:SSN_LAST_FOUR_FACT,label:SSN_LAST_FOUR_LABEL}};
  }
  if(isPetitionHeader(documentId,name)){
    const a=assignedPetitionNumber(facts);
    return a?{write:{...a,label:'Petition court case number actually assigned by the circuit clerk'}}:{refusal:{effectiveLabel:'Petition court case number assigned by the clerk',reason:'No verified clerk-assignment record is held. Leave this header blank for the clerk; the underlying case belongs only in the case-to-be-expunged field.',completenessDisposition:'PROTECTED_ACTOR_COMPLETION',requiredBeforeFiling:false,factAvailable:false,factId:'matter.clerk_assigned_petition_number',refusalClass:'court_prosecutor_clerk_or_agency_owned',completionActor:'clerk',role:'court'}};
  }
  if(documentId!=='C-10-CRIMINAL'||page>=3)return null;
  const f=validateAlCompletion(facts);
  if(name==='MUNICIPALITY OF'||name==='Check Box1.1')return{refusal:{...inactive('Municipality caption alternative (not used in this State-caption petition)','State of Alabama is the actual caption; do not enter a municipality or mark the municipal alternative.'),isSelectionControl:name.startsWith('Check Box')}};
  if(name==='Check Box2.0'||name==='Check Box2.1')return{refusal:{...inactive('Other C-10 request purpose, not this expungement-fee request','Appointment of counsel and ignition-interlock requests are different purposes; neither is inferred.'),isSelectionControl:true}};
  if(name==='Check Box2.2')return{refusal:{...conditional('Expungement-fee hardship request: check only if the printed inability-to-pay statement is true',{factId:'participant.requests_fee_waiver',equals:true},true,'Requesting this component does not establish inability to pay. The participant must confirm and mark the truthful statement; no hardship fact is inferred.'),isSelectionControl:true,factId:'participant.cannot_pay_expungement_fee'}};
  if(name==='Spouses Full Name if married'){
    const condition={all:[{factId:'participant.requests_fee_waiver',equals:true},{factId:'participant.married',equals:true}]};
    return f.spouseName!==null?{write:{value:f.spouseName,factId:'participant.spouse_full_name',label:"Spouse's full name (married applicant)"}}:{refusal:conditional("Spouse's full name, only if married",condition,f.married,'Confirm whether married. Supply the actual spouse name only if married; do not invent one.')};
  }
  if(name==='undefined_3'){
    const applies=f.married===false||f.maritalOffense===true?false:f.married===true&&f.maritalOffense===false?true:null;
    const condition={all:[{factId:'participant.requests_fee_waiver',equals:true},{factId:'participant.married',equals:true},{factId:'matter.marital_offense',equals:false}]};
    return f.spouseIncome!==null?{write:{value:f.spouseIncome,factId:'participant.spouse_monthly_gross_income',label:'Spouse monthly gross income (married; not a marital offense)'}}:{refusal:conditional('Spouse monthly gross income, only if married and this is not a marital offense',condition,applies,'The printed form excludes a marital offense. Resolve the actual marriage/offense facts; no income amount is invented.')};
  }
  if(name==='If so describe'||name==='undefined_30'){
    const isDescription=name==='If so describe',value=isDescription?f.propertyDescription:f.propertyValue;
    const label=isDescription?'Description of additional property, only if the answer is Yes':'Value of additional property, only if the answer is Yes';
    const condition={all:[{factId:'participant.requests_fee_waiver',equals:true},{factId:'participant.owns_other_property',equals:true}]};
    return value!==null?{write:{value,factId:isDescription?'participant.other_property_description':'participant.other_property_value',label}}:{refusal:conditional(label,condition,f.property,'Complete the property Yes/No question truthfully. Supply these details only for an actual Yes; leave them blank for No.')};
  }
  if(name==='Check Box5.0'||name==='Check Box5.1'){
    if(f.property===null)return{refusal:{...conditional('Additional property: confirm one truthful Yes/No answer',{factId:'participant.requests_fee_waiver',equals:true},true,'Ownership is unknown; the participant supplies the answer, not the software.'),isSelectionControl:true,completionGroup:'additional_property_select_one'}};
    if((name==='Check Box5.0')===f.property)return{selection:{checked:true,label:'Additional property: held participant answer',factId:'participant.owns_other_property'}};
    return{refusal:{...inactive('Unselected additional-property alternative','The other alternative matches the separately held participant answer.'),isSelectionControl:true}};
  }
  if(name==='Home'||name==='Other')return{refusal:{effectiveLabel:`Optional ${name.toLowerCase()} telephone number (if you use one)`,reason:'A secondary telephone is not invented when only the cell number is held.',completenessDisposition:'OPTIONAL',requiredBeforeFiling:false,factAvailable:false,role:'participant'}};
  return null;
}

/** pdf-lib flatten does not normalize inverted Rect endpoints. CR-65's exact
 * Check Box10.2 has bottom/top reversed. Native viewers normalize it, whereas
 * flatten translated its opaque Off stream upward across the word "expired".
 * Normalize that exact source widget only, retaining all AP bytes and printed ink.
 */
export function normalizeCr65Appearance(document,documentId){
  const repairs=[];
  for(const field of document.getForm().getFields())for(const w of field.acroField.getWidgets()){
    const r=w.getRectangle();if(r.width>=0&&r.height>=0)continue;
    assert.equal(documentId,'CR-65','UNREVIEWED_INVERTED_WIDGET');assert.equal(field.getName(),'Check Box10.2','UNREVIEWED_INVERTED_WIDGET');
    for(const[k,v]of Object.entries({x:45.317,y:623.137,width:11.2171,height:-14.358}))assert.ok(Math.abs(r[k]-v)<0.001,'SOURCE_WIDGET_RECT_DRIFT');
    const normalized={x:Math.min(r.x,r.x+r.width),y:Math.min(r.y,r.y+r.height),width:Math.abs(r.width),height:Math.abs(r.height)};
    w.setRectangle(normalized);repairs.push({field:field.getName(),sourceRect:r,normalizedRect:normalized,sourceAppearanceRewritten:false});
  }
  if(documentId==='CR-65')assert.equal(repairs.length,1,'EXPECTED_CR65_INVERTED_WIDGET_MISSING');
  return repairs;
}
export function packetVariants(fixtures){
  const variants={};
  for(const [name,source]of Object.entries(fixtures)){
    const f={...source,synthetic:true,captionParty:'state',requestFeeWaiver:true,finances:{married:null,maritalOffense:null,ownsOtherProperty:null}};
    const assignedNumber=name==='canonical'?'CV-2026-009012':'CV-2026-091103.02';
    const record={recordType:'clerk_petition_docket_assignment',issuingActor:'circuit_court_clerk',sourceReference:`SYNTHETIC test docket record ${name}; not a real filing`,underlyingCaseNumber:f.caseNumber,county:f.county,petitionNumber:assignedNumber,synthetic:true};
    const content=JSON.stringify(record);
    const assigned={number:assignedNumber,evidence:{content,sha256:digest(content),status:'verified_retained_record',verificationReference:`SYNTHETIC test record verification ${name}; not external clerk verification`}};
    variants[name]=f;
    variants[`${name}-ssn-missing`]={...f,ssnLast4:null};
    variants[`${name}-assigned`]={...f,petitionAssignment:assigned};
    variants[`${name}-unmarried-no-property`]={...f,finances:{married:false,maritalOffense:false,ownsOtherProperty:false}};
    variants[`${name}-married-property`]={...f,finances:{married:true,maritalOffense:false,spouseName:name==='canonical'?'Morgan Reyes':'Morgan Montgomery-Washington',spouseMonthlyGross:'1250.00',ownsOtherProperty:true,otherPropertyDescription:'Bicycle',otherPropertyValue:'75.00'}};
    variants[`${name}-married-marital-offense`]={...f,finances:{married:true,maritalOffense:true,spouseName:'Morgan Sample',ownsOtherProperty:false}};
    variants[`${name}-no-waiver`]={...f,requestFeeWaiver:false};
    variants[`${name}-no-waiver-ssn-missing`]={...f,requestFeeWaiver:false,ssnLast4:null};
  }
  return variants;
}
export const AL_CURRENT_GUIDANCE=`### Case identifiers and clerk assignment\n\nThe COURT CASE NUMBER TO BE EXPUNGED identifies the underlying case. It is not evidence that the clerk has assigned that number to this petition. Header case-number boxes on CR-65 and any selected C-10 are filled only from a separately held, verified clerk-assignment record. Otherwise leave those assignment boxes blank for the clerk. Do not copy the underlying identifier into them yourself merely to fill a blank. A matching number is used only when the actual clerk record establishes it.\n\n### Requested hardship affidavit: conditional information\n\nC-10 is included only when you actually request an expungement filing-fee waiver. The no-waiver packet omits all three C-10 pages. Neither sponsorship nor a missing fact requests or grants a waiver. The State of Alabama caption applies to this circuit-court petition; leave MUNICIPALITY OF and its alternative box blank. The expungement-fee request box also states inability to pay: check it only if that statement is true. Component selection alone does not establish hardship, and the packet leaves this factual choice unmarked.\n\nSupply your spouse's actual name only if married. Supply spouse monthly gross income only if married and this is not a marital offense, as the source states. If either controlling fact is unknown, resolve it; do not invent a spouse, income or an exception. For the question about anything else of value, give one truthful Yes/No answer. Describe and value that additional property only for Yes; leave those follow-up fields blank for No. All other applicable financial questions remain yours to answer accurately, including an actual zero where true, never a software-inferred zero. Secondary telephone numbers are optional if none are used. The same separately held four-digit SSN is reused on both identity forms; missing digits remain disclosed on both, not replaced with a case or full Social Security number. The judge's decisions and the affidavit's signature/notarial execution remain unfilled.\n\n`;
export function completenessFromLedger(packet){
  const r=packet.refusals;return{
    knownRequiredFieldsMissing:r.filter(x=>x.requiredBeforeFiling&&x.factAvailable===true).length,
    requiredFactsNotCollected:r.filter(x=>x.requiredBeforeFiling&&x.factAvailable===false).length,
    unclassifiedBlanks:r.filter(x=>!x.reason).length,
    conditionalRequirementsUnresolved:r.filter(x=>x.applicability==='unresolved').length,
    clerkAssignmentPending:r.filter(x=>x.factId==='matter.clerk_assigned_petition_number'&&x.factAvailable===false).length,
    requiredComponentsMissing:0,
    invisibleWrites:null,visualDefects:null,protectedWrites:0,
    note:'Counts are per field in this fixture, not unique facts or independent acceptance. Required participant completion is not silently converted to a complete filing.'
  };
}

/** Preserve C-10's authored checkbox ink while fitting its existing appearance
 * box to the exact widget rectangle, as native PDF readers do. pdf-lib's plain
 * flatten omits this fit, producing small double/offset borders. Each appearance
 * is cloned; neither the held source nor another widget's stream is mutated.
 * This is scoped to the two pinned Alabama sources, not a shared renderer change.
 */
export function fitAlabamaSourceCheckboxes(document,documentId,PDFName,PDFDict){
  assert.ok(['CR-65','C-10-CRIMINAL'].includes(documentId));
  const fitted=[];
  for(const field of document.getForm().getFields()){
    if(field.constructor.name!=='PDFCheckBox')continue;
    for(const w of field.acroField.getWidgets()){
      const r=w.getRectangle(),normal=w.getAppearances()?.normal;if(!(normal instanceof PDFDict))continue;
      const states=document.context.obj({});let changed=false;
      for(const [state,ref]of normal.entries()){
        const stream=document.context.lookup(ref),bbox=stream.dict.lookup(PDFName.of('BBox')).asArray().map(x=>x.asNumber());
        const matrix=(stream.dict.lookup(PDFName.of('Matrix'))?.asArray()??[]).map(x=>x.asNumber());
        assert.ok(matrix.length===0||JSON.stringify(matrix)===JSON.stringify([1,0,0,1,0,0]),'UNREVIEWED_AL_CHECKBOX_MATRIX');
        const width=bbox[2]-bbox[0],height=bbox[3]-bbox[1];assert.ok(width>0&&height>0&&r.width>0&&r.height>0);
        if(Math.abs(width-r.width)<0.00001&&Math.abs(height-r.height)<0.00001&&bbox[0]===0&&bbox[1]===0){states.set(state,ref);continue;}
        const copy=stream.clone(document.context),sx=r.width/width,sy=r.height/height;
        copy.dict.set(PDFName.of('Matrix'),document.context.obj([sx,0,0,sy,-bbox[0]*sx,-bbox[1]*sy]));
        states.set(state,document.context.register(copy));changed=true;
      }
      if(changed){w.setNormalAppearance(states);fitted.push({field:field.getName(),rect:r,existingAppearanceContentPreserved:true});}
    }
  }
  return fitted;
}
