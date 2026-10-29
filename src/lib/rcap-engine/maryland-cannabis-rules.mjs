/** Pure shared Maryland cannabis/cost predicates, extracted without changing legal rules.
 * No filesystem, PDF renderer, credentials or Node builtin dependency enters admission.
 */
function assert(condition,message){if(!condition)throw Error(message);}
assert.equal=(actual,expected,message)=>assert(actual===expected,message);
export const ROUTE='obligation:track-pathway:MD:md_cannabis_petition:cannabis-specific-expungement';
const get=(o,k)=>k.split('.').reduce((a,p)=>a?.[p],o),has=x=>x!==undefined&&x!==null&&x!=='';
const clone=x=>structuredClone(x);
const EVENTS={arrest:'Arrested',summons:'served with summons',citation:'served with citation'};
export const MD_CANNABIS_REVIEWED_THROUGH='2026-10-29';
export const BASIS={
 no_longer_crime:{field:'possession of controlled dangerous substance',statute:'CR 5-601',years:0,label:'Cannabis possession: conduct no longer a crime',authority:'Criminal Procedure 10-105(a)(11)'},
 possession:{field:'possession of cannabis',statute:'CR 5-601',years:0,label:'Cannabis possession after sentence completion',authority:'Criminal Procedure 10-105(a)(12), (c)(8)'},
 pwid:{field:'possession with intent to distribute cannabis',statute:'CR 5-602',years:3,label:'Cannabis possession with intent to distribute',authority:'Criminal Procedure 10-110(a)(2)(ii), (c)(5)'}
};
const W_INCOME={wages:1,commissions:1,ssi:1,retirement:1,unemployment:1,cashAssistance:1,alimony:1,rent:1,other:1};
const W_PROPERTY={realEstate:1,vehicles:1,bank:1,stocks:1,other:1};
const W_DEBT={creditCard:1,carLoan:1,other:1};
function amount(v,k){assert(Number.isSafeInteger(v)&&v>=0,'INVALID_CENTS: '+k);return (v/100).toFixed(2);}
function financialRecord(v,k){assert(v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v)),'FINANCIAL_OBJECT_REQUIRED: '+k);}
function safeText(v,k){if(!has(v))return;assert.equal(typeof v,'string','TEXT_REQUIRED: '+k);assert(v.trim()&&!/[\r\n\t]/.test(v),'SINGLE_LINE_REQUIRED: '+k);assert(!/^(tbd|unknown|insert|enter here|not supplied|see instructions|test prose)$/i.test(v.trim()),'PLACEHOLDER_NOT_FACT: '+k);}
export function validateMdCostRequest(f,need){
 assert(['paid','waiver'].includes(f.options.feeTreatment),'EXPLICIT_FEE_CHOICE_REQUIRED');
 if(f.options.feeTreatment==='paid')assert(!f.financial&&!f.options.finalOpenCostsRequested&&!f.options.prepaidWaiverRequested,'WAIVER_INPUT_ON_PAID_BRANCH');
 if(f.options.feeTreatment==='waiver'){
  assert.equal(f.options.prepaidWaiverRequested,true,'EXPLICIT_WAIVER_REQUEST_REQUIRED');need('options.unableToPrepay',true);need('court.restrictedCaseType',false);
  assert.equal(typeof f.options.finalOpenCostsRequested,'boolean','EXPLICIT_FINAL_COST_CHOICE_REQUIRED');
  if(f.options.finalOpenCostsRequested)need('options.noMaterialChangeAnticipated',true);
  const z=f.financial;
  if(has(z)){
   financialRecord(z,'financial');
   for(const key of ['incomeComplete','propertyComplete','debtsComplete'])need('financial.'+key,true,'Confirm the complete '+key.replace('Complete','')+' inventory');
   // A completion flag cannot replace the inventory it describes. An explicit
   // empty object represents none; omitted data remains unknown.
   for(const name of ['income','property','debts']){
    if(has(z[name]))financialRecord(z[name],'financial.'+name);
    if(z[name+'Complete']===true)assert(has(z[name]),'FINANCIAL_INVENTORY_REQUIRED: financial.'+name);
   }
   if(has(z.householdSize))assert(Number.isInteger(z.householdSize)&&z.householdSize>=1,'HOUSEHOLD_SIZE_INVALID');
   if(has(z.period))assert(['week','month','year'].includes(z.period),'INCOME_PERIOD_INVALID');
   if(has(z.totalCents))amount(z.totalCents,'total');
   if(z.income){for(const [key,v] of Object.entries(z.income)){assert(Object.hasOwn(W_INCOME,key),'UNKNOWN_INCOME_CATEGORY_OR_SNAP');amount(v,key);}if(z.incomeComplete===true&&has(z.totalCents))assert.equal(Object.values(z.income).reduce((a,b)=>a+b,0),z.totalCents,'INCOME_TOTAL_MISMATCH');}
   for(const [name,allowed] of [['property',W_PROPERTY],['debts',W_DEBT]])if(z[name])for(const [key,v] of Object.entries(z[name])){assert(Object.hasOwn(allowed,key),'UNKNOWN_FINANCIAL_CATEGORY');financialRecord(v,`financial.${name}.${key}`);amount(v.cents,`${name}.${key}`);if(name==='debts')amount(v.monthlyCents,`${name}.${key}.monthly`);if(name==='debts'||key==='other'){safeText(v.description,key);assert(has(v.description),'FINANCIAL_DESCRIPTION_REQUIRED');}}
   if(z.propertyComplete===true&&z.excludedHomeVehiclePersonalItems!==true)throw Error('PROPERTY_EXCLUSIONS_NOT_CONFIRMED');
   if(z.incomeComplete===true&&z.snapExcluded!==true)throw Error('SNAP_EXCLUSION_NOT_CONFIRMED');
  }
 }
}

function iso(v,k){assert(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'INVALID_DATE: '+k);return v;}
function text(v,k){if(!has(v))return;assert(typeof v==='string'&&v.trim()&&!/[\n\r\t]/.test(v),'INVALID_TEXT: '+k);assert(!/^(unknown|tbd|insert|not supplied|see instructions)$/i.test(v),'PLACEHOLDER_NOT_FACT: '+k);}
/** The possession carve-out is NOT extended to PWID. Missing facts remain explicit. */
export function validateMdCannabis(input){
 const f=clone(input),missing=[];assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');iso(f.asOf,'asOf');assert(f.asOf<=MD_CANNABIS_REVIEWED_THROUGH,'LAW_VERSION_REVIEW');
 assert(f.person&&f.case&&f.court&&f.confirmations&&f.options&&f.records,'MISSING_INPUT_SECTIONS');assert(BASIS[f.case.basis],'WRONG_072D_BASIS');
 if(f.person.signature||f.person.signatureDate||f.attorney||f.notary||f.judicialFindings||f.court.order||f.options.generalRelease)throw Error('PROTECTED_OR_DIFFERENT_INSTRUMENT');
 const need=(k,want,label=k)=>{const v=get(f,k);if(!has(v))missing.push({factId:k,label,why:'Supply and verify this exact case fact before selecting the recital or filing.',requiredBeforeFiling:true});else assert.equal(v,want,'CONDITION_NOT_MET: '+k);};
 for(const k of ['person.dob','case.eventDate','case.convictionDate','case.completionDate'])if(has(get(f,k))){iso(get(f,k),k);assert(get(f,k)<=f.asOf,'FUTURE_CASE_FACT: '+k);}
 if(has(f.person.dob)&&has(f.case.eventDate))assert(f.person.dob<=f.case.eventDate,'DOB_AFTER_EVENT');
 if(has(f.case.eventDate)&&has(f.case.convictionDate))assert(f.case.eventDate<=f.case.convictionDate,'EVENT_AFTER_CONVICTION');
 if(has(f.case.completionDate)&&has(f.case.convictionDate))assert(f.case.completionDate>=f.case.convictionDate,'COMPLETION_BEFORE_CONVICTION');
 assert(['district','circuit'].includes(f.court.level),'COURT_LEVEL');if(has(f.court.option))assert(f.court.option.endsWith(f.court.level==='district'?'(DC)':'(CC)'),'COURT_OPTION_LEVEL_MISMATCH');
 need('court.venueConfirmed',true);assert(['none','adult'].includes(f.court.transfer),'TRANSFER_ROUTE_REVIEW');if(f.court.transfer==='adult')need('court.receivingCourtConfirmed',true);
 need('court.appealed',f.court.appealed===true);if(f.court.appealed){assert.equal(f.court.level,'circuit','APPELLATE_CAPTION_REVIEW');need('court.isAppellateFilingCourt',true);}
 if(has(f.case.event))assert(EVENTS[f.case.event],'EVENT_NOT_SUPPORTED');
 need('confirmations.allIncidentChargesListed',true);need('confirmations.pendingCriminalProceeding',false);need('confirmations.selectedRecitalTrue',true);
 need('records.caseSearchChecked',true);if(has(f.records.caseSearchResult))assert(['shown','not_shown'].includes(f.records.caseSearchResult),'CASE_SEARCH_RESULT');else missing.push({factId:'records.caseSearchResult',label:'Case Search result',why:'Check Case Search, but do not infer court expungement from a missing search result.',requiredBeforeFiling:true});
 if(f.records.courtRecordStatus==='already_expunged')throw Error('COURT_RECORD_ALREADY_EXPUNGED: do not request or pay for duplicate relief');
 if(!has(f.records.courtRecordStatus)||f.records.courtRecordStatus==='unknown')missing.push({factId:'records.courtRecordStatus',label:'Court record still requires expungement',why:'Ask the clerk to verify the actual court record and any existing expungement order. CJIS removal or absence from Case Search is not court expungement.',requiredBeforeFiling:true});
 else assert.equal(f.records.courtRecordStatus,'exists_unexpunged','COURT_RECORD_STATUS');
 if(!has(f.records.confirmationReference))missing.push({factId:'records.confirmationReference',label:'Record verification source',why:'Record the actual docket or clerk confirmation used; no contact or court response is invented.',requiredBeforeFiling:true});else text(f.records.confirmationReference,'records.confirmationReference');
 assert(Array.isArray(f.case.charges)&&f.case.charges.length,'ALL_CHARGES_REQUIRED');const ids=new Set();
 for(const [i,c] of f.case.charges.entries()){
  for(const k of ['id','description','statute','disposition']){text(c[k],`charges.${i}.${k}`);assert(has(c[k]),'CHARGE_FIELD_REQUIRED: '+k);}assert(!ids.has(c.id),'DUPLICATE_CHARGE_ID');ids.add(c.id);assert.equal(typeof c.requested,'boolean','EXPLICIT_REQUESTED_CHARGE');
  if(c.requested){assert.equal(c.disposition,'guilty','NOT_A_CONVICTION_USE_ANOTHER_FORM');assert.equal(c.substance,'cannabis','NOT_CANNABIS');assert.equal(c.basis,f.case.basis,'MIXED_072D_BASES_REQUIRE_SEPARATE_RECITALS');assert.equal(c.statute,BASIS[f.case.basis].statute,'WRONG_STATUTE');assert.equal(c.convictionDate,f.case.convictionDate,'MIXED_CONVICTION_DATES');}
 }
 const requested=f.case.charges.filter(c=>c.requested);assert(requested.length,'NO_REQUESTED_CHARGE');const others=f.case.charges.filter(c=>!c.requested);
 if(!has(f.case.otherOffenses))missing.push({factId:'case.otherOffenses',label:'Fourth checkbox: other offenses',why:'Confirm all charges from this incident. Do not infer NO from an incomplete inventory.',requiredBeforeFiling:true});
 else {assert.equal(typeof f.case.otherOffenses,'boolean','OTHER_OFFENSES_BOOLEAN');assert.equal(f.case.otherOffenses,f.case.charges.length>1,'OTHER_OFFENSES_INVENTORY_MISMATCH');}
 if(!has(f.case.convictionDate))missing.push({factId:'case.convictionDate',label:'Conviction date',why:'Confirm the actual guilty disposition, not a PBJ or a dismissal.',requiredBeforeFiling:true});
 let earliest=null;
 if(f.case.basis==='no_longer_crime')need('confirmations.conductNoLongerCrime',true);
 else {
  need('confirmations.sentenceComplete',true);
  if(!has(f.case.completionDate))missing.push({factId:'case.completionDate',label:'Actual sentence completion date',why:'Obtain the actual completion date including applicable supervision; an anticipated date is not completion.',requiredBeforeFiling:true});
  else if(f.case.basis==='pwid'){assert(!f.case.completionDate.endsWith('02-29'),'LEAP_ANNIVERSARY_REVIEW');earliest=String(+f.case.completionDate.slice(0,4)+3)+f.case.completionDate.slice(4);}
  else earliest=f.case.completionDate;
 }
 if(f.case.basis==='pwid'){
  need('confirmations.unitEligible',true);
  for(const c of others){if(c.minorTraffic===true||c.statute==='CR 5-601'&&c.substance==='cannabis')continue;throw Error('OTHER_UNIT_CHARGE_REQUIRES_COMPONENT_REVIEW: '+c.id);}
  need('confirmations.newCrimeDuringWaiting',f.confirmations.newCrimeDuringWaiting===true);
  if(f.confirmations.newCrimeDuringWaiting===true)need('confirmations.newConvictionNowEligible',true);
 }
 if(earliest)assert(f.asOf>=earliest,'WAITING_PERIOD_NOT_MET: '+earliest);
 if(!has(f.case.restitution?.status))missing.push({factId:'case.restitution.status',label:'Restitution status',why:'Confirm whether restitution was ordered and the current status; inability to pay is not automatically treated as ineligibility.',requiredBeforeFiling:true});
 else {assert(['not_ordered','paid','unable_to_pay','disputed'].includes(f.case.restitution.status),'RESTITUTION_STATUS');if(f.case.restitution.status==='disputed')throw Error('DISPUTED_RESTITUTION_HANDOFF');if(f.case.restitution.status==='unable_to_pay')need('case.restitution.inabilityAsserted',true);if(['paid','unable_to_pay'].includes(f.case.restitution.status))need('case.restitution.documentationAvailable',true);}
 if(f.confirmations.actualObjection||f.confirmations.hearingScheduled)throw Error('CONTESTED_MATTER_HANDOFF');
 const mayMarkBasis=missing.length===0;validateMdCostRequest(f,need);
 for(const [o,ks] of [[f.person,['name','street','cityStateZip','phone','email','fax']],[f.court,['option','address','phone']],[f.case,['number','tracking','agency','locality','incident']]])for(const k of ks)text(o[k],k);
 return {facts:f,missing,earliest,mayMarkBasis,requested,others};
}
