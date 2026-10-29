/** IA.memo ia-7251 / official August2024 Form5. Draft preparation only.
 * Age at conduct is an objective intake fact; Form5 item2 remains manual.
 * No DOB, underlying-act narrative, consent or government finding is inferred.
 */
import {dateValue,text,exact} from './iowa-alcohol-native.mjs';
export const IOWA_7251_ROUTE='IA:minor-prostitution-7251';
export function validateIowa7251Facts(input){
 exact(input,['synthetic','name','county','caseNumber','plaintiff','convictionDate','filingDate','disposition','proceeding','offense','ageAtAct','historyComplete','laterConvictions','address','city','state','zip','phoneAreaCode','phoneLocal','email','ackCopy','ackConfidential','filingMethod'],'Form5 source facts');
 const f=structuredClone(input);
 for(const key of ['name','county','caseNumber','plaintiff'])text(f[key],key);
 if(typeof f.synthetic!=='boolean')throw Error('synthetic_flag_required');
 if(f.disposition!=='conviction'||f.proceeding!=='district_court')throw Error('wrong_disposition_or_proceeding');
 if(!['paper','efile'].includes(f.filingMethod))throw Error('filing_method_unknown');
 exact(f.offense,['kind','citation','equivalentTo','confirmation'],'Form5 offense');
 if(!f.offense||f.offense.confirmation!==true||f.offense.equivalentTo!=='725.1(1)(a)')throw Error('statutory_ground_unconfirmed');
 text(f.offense.citation,'offense citation');
 if(f.offense.kind==='statute'){if(f.offense.citation!=='725.1(1)(a)')throw Error('wrong_statutory_ground');}
 else if(f.offense.kind!=='local_equivalent')throw Error('statutory_ground_unconfirmed');
 if(!Number.isInteger(f.ageAtAct)||f.ageAtAct<0)throw Error('age_at_conduct_unknown');
 if(f.ageAtAct>=18)throw Error('age_at_conduct_excluded');
 if(f.historyComplete!==true||!Array.isArray(f.laterConvictions))throw Error('complete_history_required');
 const conviction=dateValue(f.convictionDate),filing=dateValue(f.filingDate);
 const anniversary=String(conviction.getUTCFullYear()+2)+f.convictionDate.slice(4);
 let end;try{end=dateValue(anniversary);}catch{throw Error('leap_anniversary_review');}
 if(filing<end)throw Error('two_year_period_incomplete');
 for(const c of f.laterConvictions){
  if(!c||c.categoryConfirmed!==true||!['local_traffic','chapter_321_simple','other'].includes(c.kind))throw Error('later_conviction_category_unknown');
  text(c.citation,'later conviction citation');const entered=dateValue(c.date);
  if(entered<conviction||entered>filing)throw Error('later_conviction_chronology_conflict');
  if(c.kind==='chapter_321_simple'&&!/^321\./.test(c.citation))throw Error('chapter321_exception_unconfirmed');
  if(c.kind==='other'&&+entered===+end)throw Error('anniversary_conviction_review');
  if(c.kind==='other'&&entered>=conviction&&entered<end)throw Error('intervening_conviction_excluded');
 }
 for(const key of ['address','city','state','zip','phoneAreaCode','phoneLocal','email']){
  if(!Object.hasOwn(f,key))throw Error('explicit_contact_state_required:'+key);
  if(f[key]!==null)text(f[key],key);
 }
 if(f.state!==null&&!/^[A-Z]{2}$/.test(f.state))throw Error('mailing_state_invalid');
 if(f.zip!==null&&!/^\d{5}(?:-\d{4})?$/.test(f.zip))throw Error('mailing_zip_invalid');
 if(f.phoneAreaCode!==null&&!/^\d{3}$/.test(f.phoneAreaCode))throw Error('phone_area_invalid');
 if(f.email!==null&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))throw Error('email_invalid');
 for(const key of ['ackCopy','ackConfidential'])if(![true,false,null].includes(f[key]))throw Error('explicit_acknowledgment_state_required:'+key);
 return{facts:f,twoYearAnniversary:anniversary,courtDebtIsNotPrecondition:true,filingReady:false,ageAssertionManual:true};
}
