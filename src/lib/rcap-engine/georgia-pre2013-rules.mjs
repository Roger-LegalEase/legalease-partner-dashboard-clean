/** Existing exact pre2013GCIC rule engine, extracted for protected admission. No Node/PDF imports. */
function assert(condition,message){if(!condition)throw Error(message);}
assert.equal=(actual,expected,message)=>assert(actual===expected,message);
export const GA_PRE2013_REVIEWED_THROUGH='2026-10-29';
export const FAMILY='ga-nonconv-pre2013-set';
export const ROUTE='obligation:track-pathway:GA:ga-nonconv-pre2013:non-conviction-record-restriction-through-the-agency-prosecutor-process';
export const FORM='GBI-GCIC-REQUEST-TO-RESTRICT-ARREST-RECORD-PRIOR-TO-07-01-2013';
const docId=FORM;const read=(o,p)=>p.split('.').reduce((v,k)=>v?.[k],o);
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
function iso(v,label,asOf){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('INVALID_DATE: '+label);if(asOf&&v>asOf)throw Error('FUTURE_FACT: '+label);return v;}
function keys(o,allowed,label){if(!o||typeof o!=='object'||Array.isArray(o))throw Error('OBJECT_REQUIRED: '+label);for(const k of Object.keys(o))if(!allowed.includes(k))throw Error('UNSUPPORTED_OR_PROTECTED_INPUT: '+label+'.'+k);}
const validText=v=>typeof v==='string'&&v.trim()!=='';
function text(v,label){if(!validText(v)||v!==v.trim()||/[\r\n\x00-\x1f]/.test(v)||/^(?:unknown|tbd|n\/a|insert|enter here|see attached)$/i.test(v))throw Error('ACTUAL_TEXT_REQUIRED: '+label);return v;}
export function validateGa(input){
 const f=structuredClone(input),missing=[];
 keys(f,['schemaVersion','familyId','routeKey','asOf','sample','participant','case','confirmations','options'],'input');
 assert.equal(f.schemaVersion,1,'WRONG_SCHEMA');assert.equal(f.familyId,FAMILY,'WRONG_FAMILY');assert.equal(f.routeKey,ROUTE,'WRONG_ROUTE');
 iso(f.asOf,'asOf');if(f.asOf>GA_PRE2013_REVIEWED_THROUGH)throw Error('AUTHORITY_REVALIDATION_REQUIRED');assert.equal(typeof f.sample,'boolean','SAMPLE_FLAG_REQUIRED');
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
 if(f.case.basis==='acquittal_of_all_charges'){const permitted=new Date(Date.parse(f.case.dispositionDate+'T00:00:00Z')+10*86400000).toISOString().slice(0,10);if(f.asOf<permitted)throw Error('ACQUITTAL_TEN_DAY_WINDOW: '+permitted);}
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
