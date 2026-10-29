/** IA.memo ia-7251 / official August2024 Form5. Draft preparation only.
 * Age at conduct is an objective intake fact; Form5 item2 remains manual.
 * No DOB, underlying-act narrative, consent or government finding is inferred.
 */
import {dateValue,text,exact} from './iowa-alcohol-native.mjs';
export const IOWA_7251_ROUTE='IA:minor-prostitution-7251';
// Form 5 collects its actual age criterion and separate contact fields.
export const iowa7251LegacyQuestionApplies=(jurisdiction,pathwayId,factId)=>!(jurisdiction==='IA'&&pathwayId==='minor-prostitution-7251'&&['age_at_offense','contact_information'].includes(factId));
export function validateIowa7251Facts(input){
 exact(input,['synthetic','name','county','caseNumber','plaintiff','convictionDate','filingDate','disposition','proceeding','offense','ageAtAct','historyComplete','laterConvictions','address','city','state','zip','phoneAreaCode','phoneLocal','email','ackCopy','ackConfidential','filingMethod',...(Object.hasOwn(input??{},'under18AtAct')?['under18AtAct']:[])],'Form5 source facts');
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
 const binarySupplied=Object.hasOwn(f,'under18AtAct');
 if(binarySupplied&&typeof f.under18AtAct!=='boolean')throw Error('age_at_conduct_unknown');
 if(f.ageAtAct!==null&&(!Number.isInteger(f.ageAtAct)||f.ageAtAct<0))throw Error('age_at_conduct_unknown');
 if(binarySupplied&&f.ageAtAct!==null&&f.under18AtAct!==(f.ageAtAct<18))throw Error('age_at_conduct_conflict');
 if(binarySupplied?f.under18AtAct===false:f.ageAtAct!==null&&f.ageAtAct>=18)throw Error('age_at_conduct_excluded');
 if(f.ageAtAct===null&&(!binarySupplied||f.under18AtAct!==true))throw Error('age_at_conduct_unknown');
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

// Closed ordinary-intake transport. Server supplies date/synthetic context; no
// participant approval, entitlement, SSN, DOB or act narrative crosses this DTO.
const wrap=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>k==='value'||k==='unknown')&&(!Object.hasOwn(v,'unknown')||typeof v.unknown==='boolean'));
const raw=v=>v&&typeof v==='object'?wrap(v)&&v.unknown!==true?v.value:undefined:v;
const unknown=v=>wrap(v)&&v.unknown===true||typeof raw(v)==='string'&&['unknown','i am not sure','not sure','no sé','no se'].includes(raw(v).trim().toLowerCase());
const bool=v=>{if(unknown(v))return undefined;const x=raw(v),s=typeof x==='string'?x.trim().toLowerCase():'';return x===true||s==='yes'||s==='true'?true:x===false||s==='no'||s==='false'?false:undefined;};
const count=v=>{if(unknown(v))return undefined;const x=raw(v),s=typeof x==='number'?String(x):typeof x==='string'?x.trim():'';return /^(0|[1-9]\d*)$/.test(s)&&+s<=25?+s:undefined;};
/** @typedef {{id:string,type:'yes_no_unknown'|'text_or_unknown'|'date_or_unknown'|'single_choice',en:string,es:string,required?:boolean,allowsExplicitUnknown?:boolean,allowsExplicitNull?:boolean,options?:string[],optionsEn?:string[],optionsEs?:string[]}} Iowa7251Question */
/** @param {Iowa7251Question['type']} type @returns {Iowa7251Question} */
const q=(id,type,en,es,extra={})=>({id,type,en,es,...extra});
const yes=(id,en,es,nullable=false)=>q(id,'yes_no_unknown',en,es,{allowsExplicitUnknown:nullable,allowsExplicitNull:nullable});
const choice=(id,options,optionsEn,optionsEs,en,es)=>q(id,'single_choice',en,es,{options,optionsEn,optionsEs});
const fields=[
 ['name','participant_full_legal_name','What full name appears for you in the existing case?','¿Qué nombre completo figura para usted en el caso existente?'],
 ['county','county','In which Iowa county was this conviction entered?','¿En qué condado de Iowa se dictó esta condena?'],
 ['caseNumber','case_identifier','What is the existing conviction case number?','¿Cuál es el número del caso de la condena?'],
 ['plaintiff','ia_7251_plaintiff','Who is named as plaintiff in the original case caption?','¿Quién figura como demandante en el encabezamiento original del caso?'],
 ['convictionDate','conviction_date','On what date was this conviction entered? The two-year period starts at conviction.','¿En qué fecha se dictó esta condena? El plazo de dos años comienza con la condena.'],
 ...[['address','mailing street address','dirección postal (calle)'],['city','mailing city','ciudad postal'],['state','two-letter mailing state','estado postal (dos letras)'],['zip','mailing ZIP code','código postal'],['phoneAreaCode','telephone area code (three digits)','código de área telefónico (tres dígitos)'],['phoneLocal','local telephone number and any extension','número telefónico local y cualquier extensión'],['email','email address','dirección de correo electrónico']].map(([k,en,es])=>[k,'ia_7251_'+k,`What is your ${en}? Keep unknown if unavailable.`,`¿Cuál es su ${es}? Manténgalo desconocido si no está disponible.`,true])
];
export function iowa7251Questions(answers={},includeInactive=false){
 const questions=fields.map(([path,id,en,es,nullable])=>q(id,path==='convictionDate'?'date_or_unknown':'text_or_unknown',en,es,{allowsExplicitUnknown:nullable===true,allowsExplicitNull:nullable===true}));
 questions.push(
 choice('ia_7251_disposition',['conviction','dismissed','deferred','pending'],['Conviction','Dismissed','Deferred','Pending'],['Condena','Desestimado','Diferido','Pendiente'],'What actual disposition appears in the record?','¿Qué resolución real figura en el expediente?'),
 choice('ia_7251_proceeding',['district_court','juvenile_court','agency'],['District court','Juvenile court','Agency'],['Tribunal de distrito','Tribunal de menores','Agencia'],'What type of proceeding produced this record?','¿Qué tipo de procedimiento produjo este expediente?'),
 choice('ia_7251_offense_kind',['statute','local_equivalent'],['Iowa statute','Recorded equivalent local ordinance'],['Ley de Iowa','Ordenanza local equivalente según el expediente'],'Does the conviction record cite an Iowa statute or local ordinance?','¿La condena cita una ley de Iowa o una ordenanza local?'),
 q('ia_7251_offense_citation','text_or_unknown','What exact statute/subsection or ordinance is recorded?','¿Qué ley y subsección exactas u ordenanza figuran en el expediente?'),
 choice('ia_7251_equivalent_to',['725.1(1)(a)'],['Section 725.1(1)(a), established in the actual record'],['Sección 725.1(1)(a), establecida en el expediente real'],'Which Iowa offense does the actual record establish? For a local ordinance, keep unknown unless the court/prosecutor record establishes equivalence; a bare Yes is insufficient.','¿Qué delito de Iowa establece el expediente real? Para una ordenanza local, manténgalo desconocido salvo que el expediente del tribunal o fiscal establezca la equivalencia; responder Sí no basta.'),
 yes('ia_7251_offense_checked','Have you checked the exact conviction citation and any stated equivalence against the actual record?','¿Ha comprobado la cita exacta de la condena y cualquier equivalencia indicada en el expediente real?'),
 yes('ia_7251_under18_at_act','Can you truthfully confirm that you were under 18 when the act occurred? This is not your current age or age at conviction. Do not describe the act.','¿Puede confirmar verazmente que tenía menos de 18 años cuando ocurrió el acto? No se refiere a su edad actual ni a su edad al ser condenado. No describa el acto.'),
 q('ia_7251_age_at_act','text_or_unknown','Optional: if you know your exact age when the act occurred, enter that whole number. Otherwise keep unknown; do not guess.','Opcional: si conoce su edad exacta cuando ocurrió el acto, escriba ese número entero. De lo contrario, manténgala desconocida; no adivine.',{required:false,allowsExplicitUnknown:true,allowsExplicitNull:true}),
 yes('ia_7251_history_complete','Have you listed every conviction after this conviction, including traffic matters and convictions after the first two years?','¿Ha enumerado todas las condenas posteriores a esta condena, incluidos asuntos de tránsito y condenas posteriores a los primeros dos años?'),
 q('ia_7251_later_count','text_or_unknown','How many convictions followed this conviction? Enter 0 only if none. This intake supports up to 25 entries; do not omit others.','¿Cuántas condenas hubo después de esta condena? Escriba 0 solo si no hubo ninguna. Este formulario admite hasta 25 entradas; no omita otras.'),
 yes('ia_7251_ack_copy','Have you read that the county attorney must receive a copy? An unanswered acknowledgment remains blank for review before filing.','¿Ha leído que el fiscal del condado debe recibir una copia? Una confirmación sin responder queda en blanco para revisarla antes de presentar.',true),
 yes('ia_7251_ack_confidential','Have you read that this court record becomes confidential and leaves public access?','¿Ha leído que este expediente judicial pasa a ser confidencial y deja de estar disponible al público?',true),
 choice('ia_7251_filing_method',['paper','efile'],['Paper','Electronic filing'],['En papel','Presentación electrónica'],'How will you file the application?','¿Cómo presentará la solicitud?'),
 {...yes('ia_7251_wants_survivor_services','Would you like survivor-services information alongside the application? This is optional, does not affect eligibility, and requires no description of what happened.','¿Desea información sobre servicios para sobrevivientes junto con la solicitud? Es opcional, no afecta la elegibilidad y no requiere describir lo ocurrido.',true),required:false});
 const n=includeInactive?25:count(answers.ia_7251_later_count);
 if(n!==undefined)for(let i=1;i<=n;i++){const p=`ia_7251_later_${i}_`;questions.push(q(p+'date','date_or_unknown',`On what date was subsequent conviction ${i} entered?`,`¿En qué fecha se dictó la condena posterior ${i}?`),q(p+'citation','text_or_unknown',`What exact citation appears for conviction ${i}?`,`¿Qué cita exacta figura para la condena ${i}?`),choice(p+'kind',['local_traffic','chapter_321_simple','other'],['Local traffic violation','Chapter 321 simple misdemeanor','Other criminal conviction'],['Infracción local de tránsito','Delito menor simple del capítulo 321','Otra condena penal'],`Which classification does the actual record establish for conviction ${i}?`,`¿Qué clasificación establece el expediente real para la condena ${i}?`),yes(p+'category_checked',`Have you checked the recorded classification for conviction ${i}?`,`¿Ha comprobado la clasificación registrada de la condena ${i}?`));}
 return questions;
}
export const IOWA_7251_FACT_IDS=Object.freeze(iowa7251Questions({},true).map(q=>q.id));
export const IOWA_7251_EXPLICIT_UNKNOWN_FACT_IDS=Object.freeze(iowa7251Questions({},true).filter(q=>q.allowsExplicitUnknown).map(q=>q.id));
export const IOWA_7251_OPTIONAL_FACT_IDS=Object.freeze(iowa7251Questions({},true).filter(q=>q.required===false).map(q=>q.id));
/** @param {Readonly<Record<string,unknown>>} answers
 * @param {{synthetic:boolean,filingDate:string}} context
 * @returns {{facts:Record<string,any>|null,missingFactIds:string[],refusal:string|null}} */
export function iowa7251FactsFromAnswers(answers,context){
 if(typeof context?.synthetic!=='boolean'||typeof context?.filingDate!=='string')return{facts:null,missingFactIds:[],refusal:'server_context_required'};
 const facts={synthetic:context.synthetic,filingDate:context.filingDate},missingFactIds=[];
 const take=(id,type='text',nullable=false)=>{const v=answers[id];if(nullable&&(unknown(v)||Object.hasOwn(answers,id)&&raw(v)===null))return null;let x=type==='bool'?bool(v):type==='count'?count(v):raw(v);if(type==='text'&&(typeof x!=='string'||!x.trim()||unknown(v)))x=undefined;if(x===undefined)missingFactIds.push(id);return x;};
 for(const[path,id,,,nullable]of fields)facts[path]=take(id,'text',nullable===true);
 facts.disposition=take('ia_7251_disposition');facts.proceeding=take('ia_7251_proceeding');
 facts.offense={kind:take('ia_7251_offense_kind'),citation:take('ia_7251_offense_citation'),equivalentTo:take('ia_7251_equivalent_to'),confirmation:take('ia_7251_offense_checked','bool')};
 facts.under18AtAct=take('ia_7251_under18_at_act','bool');
 const age=answers.ia_7251_age_at_act;
 if(!Object.hasOwn(answers,'ia_7251_age_at_act')||unknown(age)||raw(age)===null||typeof raw(age)==='string'&&!raw(age).trim())facts.ageAtAct=null;
 else{const x=raw(age),s=typeof x==='number'?String(x):typeof x==='string'?x.trim():'';if(/^(0|[1-9]\d*)$/.test(s))facts.ageAtAct=+s;else missingFactIds.push('ia_7251_age_at_act');}
 // Retained known screening facts cannot silently contradict the new factual answers.
 const legacyAgeValue=raw(answers.age_at_offense);
 const legacyAge=!unknown(answers.age_at_offense)&&(typeof legacyAgeValue==='number'&&Number.isInteger(legacyAgeValue)&&legacyAgeValue>=0||typeof legacyAgeValue==='string'&&/^(0|[1-9]\d*)$/.test(legacyAgeValue.trim()))&&Number.isSafeInteger(Number(legacyAgeValue))?Number(legacyAgeValue):null;
 const ageConflict=legacyAge!==null&&(typeof facts.under18AtAct==='boolean'&&facts.under18AtAct!==(legacyAge<18)||Number.isInteger(facts.ageAtAct)&&facts.ageAtAct!==legacyAge);
 facts.historyComplete=take('ia_7251_history_complete','bool');const n=take('ia_7251_later_count','count');
 const supplied=raw(answers.ia_7251_later_count);if((typeof supplied==='number'||typeof supplied==='string'&&/^[0-9]+$/.test(supplied))&&Number(supplied)>25)return{facts:null,missingFactIds:[],refusal:'history_inventory_capacity'};
 if(n!==undefined){facts.laterConvictions=[];for(let i=1;i<=n;i++){const p=`ia_7251_later_${i}_`;facts.laterConvictions.push({date:take(p+'date'),citation:take(p+'citation'),kind:take(p+'kind'),categoryConfirmed:take(p+'category_checked','bool')});}}
 facts.ackCopy=take('ia_7251_ack_copy','bool',true);facts.ackConfidential=take('ia_7251_ack_confidential','bool',true);facts.filingMethod=take('ia_7251_filing_method');
 return{facts:missingFactIds.length||ageConflict?null:facts,missingFactIds:[...new Set(missingFactIds)],refusal:ageConflict?'age_at_conduct_conflict':null};
}
export const IOWA_7251_BEFORE_FILING=Object.freeze({
 en:'Draft only. Personally review and complete Form 5 item 2 about age when the act occurred; intake does not mark that declaration. Review any blank contact fields and acknowledgments, select the truthful representation option, then sign and date. For paper filing, serve the county attorney and truthfully complete the embedded certificate only after service; electronic filing uses court-system service. Seek legal or survivor-services assistance for age uncertainty, trafficking, coercion, exploitation, or actual opposition. No underlying-act narrative is requested.',
 es:'Solo borrador. Revise y complete personalmente el punto 2 del Formulario 5 sobre la edad cuando ocurrió el acto; los datos de admisión no marcan esa declaración. Revise los campos de contacto y las confirmaciones en blanco, seleccione la opción veraz de representación y luego firme y feche. Si presenta en papel, entregue una copia al fiscal del condado y complete verazmente el certificado incorporado solo después de la entrega; la presentación electrónica usa la notificación del sistema judicial. Busque asistencia jurídica o servicios para sobrevivientes si hay incertidumbre sobre la edad, trata, coacción, explotación u oposición real. No se solicita narrar el acto.'
});
export const IOWA_7251_SURVIVOR_SUPPORT=Object.freeze({alwaysOffer:true,preferenceAffectsEligibility:false,href:'/expungement-ai/resources',
 en:'Survivor-services and legal assistance may offer other or stronger remedies. Resource information is available alongside this draft, whether or not you answer the optional preference. You do not need to describe what happened; this offer does not contact a service or send your information.',
 es:'Los servicios para sobrevivientes y la asistencia jurídica pueden ofrecer otras medidas o medidas más amplias. La información sobre recursos está disponible junto con este borrador, responda o no a la preferencia opcional. No necesita describir lo ocurrido; esta oferta no contacta a ningún servicio ni envía sus datos.'});
const outcomes={
 supported:['These facts support only preparation of the source-specific Form 5 draft. They do not establish complete court eligibility, filing readiness, payment authority or delivery. Court debt is not a prerequisite.','Estos hechos respaldan únicamente la preparación del borrador del Formulario 5 correspondiente a la fuente. No establecen la elegibilidad judicial completa, que esté listo para presentar, la autorización de pago ni la entrega. La deuda judicial no es un requisito.'],
 unknown:['A required actual case fact is unknown or invalid. Keep it unknown; do not guess or describe the underlying act.','Se desconoce un hecho material real del caso o no es válido. Manténgalo desconocido; no adivine ni describa el acto.'],
 excluded:['The supplied facts do not meet this Form 5 route. Do not use this draft for another disposition, proceeding, statutory ground, age category or a disqualifying conviction in the two-year period.','Los hechos proporcionados no cumplen esta vía del Formulario 5. No use este borrador para otra resolución, procedimiento, fundamento legal, categoría de edad o una condena que impida usar esta vía durante el plazo de dos años.'],
 not_yet:['Two years have not elapsed from the conviction date. This period does not start at payment, discharge or consent.','No han transcurrido dos años desde la fecha de la condena. Este plazo no comienza con el pago, el cumplimiento de la pena ni el consentimiento.'],
 review:['These facts require targeted assistance before this draft can be prepared: resolve the age contradiction, exact-anniversary or leap-day timing, recorded ordinance equivalence, or conviction classification actually at issue. No missing fact or legal determination was supplied.','Estos hechos requieren asistencia específica antes de preparar este borrador: resuelva la contradicción sobre la edad, el cómputo en el aniversario exacto o un día bisiesto, la equivalencia registrada de la ordenanza o la clasificación de la condena que realmente esté en cuestión. No se ha suplido ningún hecho ni determinación jurídica faltante.'],
 capacity:['This intake supports at most 25 subsequent convictions. Do not omit others; obtain assistance with a complete inventory. This is an intake limit, not a statutory exclusion.','Este formulario admite como máximo 25 condenas posteriores. No omita otras; obtenga ayuda para completar el inventario. Es un límite del formulario, no una exclusión legal.']
};
export const IOWA_7251_OUTCOME_COPY=Object.freeze(Object.values(outcomes));
export function evaluateIowa7251Preparation(answers,context){
 const decoded=iowa7251FactsFromAnswers(answers,context);let status='unknown',key='unknown',validation=null;
 if(decoded.refusal==='history_inventory_capacity'){status='needs_review';key='capacity';}
 else if(decoded.refusal==='age_at_conduct_conflict'){status='needs_review';key='review';}
 else if(decoded.facts){try{validation=validateIowa7251Facts(decoded.facts);status='qualifying';key='supported';}catch(e){
  const code=e instanceof Error?e.message:'';
  if(code==='two_year_period_incomplete'){status='not_yet';key='not_yet';}
  else if(['age_at_conduct_excluded','intervening_conviction_excluded','wrong_disposition_or_proceeding','wrong_statutory_ground'].includes(code)){status='excluded';key='excluded';}
  else if(['age_at_conduct_conflict','leap_anniversary_review','anniversary_conviction_review','statutory_ground_unconfirmed','chapter321_exception_unconfirmed'].includes(code)){status='needs_review';key='review';}
 }}
 return{status,scope:'SUPPORTED_DRAFT_PREPARATION_ONLY',reason:outcomes[key][0],reasonEs:outcomes[key][1],missingFactIds:decoded.missingFactIds,facts:validation?.facts??null,filingReady:false,courtDebtIsNotPrecondition:true,beforeFiling:IOWA_7251_BEFORE_FILING,survivorSupport:IOWA_7251_SURVIVOR_SUPPORT};
}
