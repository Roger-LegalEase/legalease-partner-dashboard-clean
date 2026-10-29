/** Existing Iowa Rule 2.86 Form 2 facts, extracted without changing native validation.
 * No filesystem, corpus audit, renderer or legal approval side effects. */
export const fail = m => { throw new Error(m); };
const own = (o, k) => Object.hasOwn(o, k);
const exactKeys = (o, keys, where) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) fail(`${where}: object required`);
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(`${where}: unpermitted input ${k}`);
  for (const k of keys) if (!own(o, k)) fail(`${where}: missing explicit ${k}`);
};
export function text(v, name, max = 200) {
  if (typeof v !== 'string' || !v.trim() || v.trim() !== v || v.length > max || /[\x00-\x1f\x7f]/.test(v)) fail(`${name}: nonempty trimmed text required`);
  return v;
}
export function dateValue(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) fail('date: YYYY-MM-DD required');
  const d = new Date(`${s}T00:00:00Z`);
  if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== s) fail('date: invalid calendar date');
  return d;
}
export const fullName = n => [n.first, n.middle, n.last].filter(Boolean).join(' ');
function nameValue(n, where) {
  exactKeys(n, ['first', 'middle', 'last'], where);
  text(n.first, `${where}.first`, 40); text(n.last, `${where}.last`, 40);
  // Empty middle explicitly means none; null/absent means unknown and is refused.
  if (n.middle !== '') text(n.middle, `${where}.middle`, 40);
  return n;
}
// These exact statutory exclusions are guards, not a new eligibility engine. The manual
// item-4 judgment and adopted conservative 235B.20 hold remain. Comparability is not guessed.
const excludedSections = ['123.46','235B.20','321.218','321A.32','321J.21','321J.2','707.5','708.2A','708.7','708.11','708.12','721.2','721.10','723.1'];
const excludedChapters = ['717C','719','720','724','726','728','901A'];
export function validateFacts(input) {
  const keys = ['synthetic','name','aliases','county','caseNumber','plaintiff','dob','driversLicense','ssn','address','city','state','zip','phone','email','convictionDate','filingDate','offense','misdemeanorConviction','deferredJudgmentDisposition','hasPrior901c3Grant','hasOtherEligibleConvictions','relatedCases','pendingCharges','deferredJudgmentProceedings','financialObligationsPaid','exclusionsReviewed','comparabilityUncertain','sexOffense','selfRepresented','filingMethod','countyAttorney','historyReport','acknowledgments'];
  exactKeys(input, keys, 'facts'); const f = structuredClone(input);
  if (typeof f.synthetic !== 'boolean') fail('synthetic: boolean required');
  nameValue(f.name, 'name'); if (fullName(f.name).length > 60) fail('name exceeds the source full-name limit');
  if (!Array.isArray(f.aliases) || f.aliases.length > 30) fail('aliases: explicit array, maximum 30');
  f.aliases.forEach((n, i) => nameValue(n, `aliases[${i}]`));
  if (new Set(f.aliases.map(fullName)).size !== f.aliases.length || f.aliases.some(n => fullName(n) === fullName(f.name))) fail('aliases: duplicate/current legal name');
  for (const k of ['county','caseNumber','plaintiff']) text(f[k], k);
  for (const k of ['driversLicense','address','city','state','zip','phone','email']) if (f[k] !== null) text(f[k], k);
  if (f.state !== null && !/^[A-Z]{2}$/.test(f.state)) fail('state: postal abbreviation required');
  if (f.zip !== null && !/^\d{5}(-\d{4})?$/.test(f.zip)) fail('zip: invalid');
  if (f.phone !== null && !/^\d{10}$/.test(f.phone)) fail('phone: ten digits required');
  if (f.email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) fail('email: invalid');
  if (f.ssn !== null && !/^\d{9}$/.test(f.ssn)) fail('ssn: exactly nine digits or explicit null');
  const filing = dateValue(f.filingDate), conviction = dateValue(f.convictionDate);
  if (f.dob !== null && dateValue(f.dob) >= conviction) fail('dob must precede conviction');
  const anniversary = new Date(conviction); anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 8);
  if (filing < anniversary) fail('Route stop: fewer than eight years since conviction');
  if (f.misdemeanorConviction !== true || f.deferredJudgmentDisposition !== false) fail('Route stop: Form 2 requires a misdemeanor conviction, not a deferred judgment');
  if (f.hasPrior901c3Grant !== false) fail('Route stop: prior or unknown lifetime 901C.3 grant');
  if (f.hasOtherEligibleConvictions !== false) fail('Self-help stop: strategic choice among multiple convictions');
  if (!Array.isArray(f.relatedCases) || f.relatedCases.length !== 0) fail('Self-help stop: related-case/same-transaction determination requires legal assistance');
  if (f.pendingCharges !== false) fail('Route stop: pending or unknown criminal charges');
  if (![0,1].includes(f.deferredJudgmentProceedings)) fail('Route stop: two or more or uncertain deferred-judgment proceedings');
  for (const k of ['financialObligationsPaid','exclusionsReviewed','selfRepresented']) if (f[k] !== true) fail(`Missing participant confirmation: ${k}`);
  if (f.comparabilityUncertain !== false || f.sexOffense !== false) fail('Self-help stop: sex offense or unresolved federal/prior-law comparability');
  exactKeys(f.offense, ['section','title'], 'offense'); text(f.offense.section, 'offense.section'); text(f.offense.title, 'offense.title');
  if (!/^\d+[A-Z]?\.\d+[A-Z]?(\(\d+[a-z]?\))*$/i.test(f.offense.section)) fail('offense.section: exact Iowa Code citation required');
  if (excludedSections.some(s => f.offense.section === s || f.offense.section.startsWith(s + '(')) || excludedChapters.includes(f.offense.section.split('.')[0]) || /^123\.47\(3\)|^708\.2\(3\)|^716\.8\([34]\)/.test(f.offense.section)) fail('Route stop: excluded or retained conservative source category');
  if (['123.47','708.2','716.8'].includes(f.offense.section)) fail('offense.section: subsection needed to resolve statutory scope');
  if (!['paper','efile'].includes(f.filingMethod)) fail('filingMethod: paper or efile required');
  if (f.countyAttorney !== null) {
    exactKeys(f.countyAttorney, ['name','address','city','state','zip'], 'countyAttorney');
    for (const [k,v] of Object.entries(f.countyAttorney)) text(v, `countyAttorney.${k}`);
    if (!/^[A-Z]{2}$/.test(f.countyAttorney.state) || !/^\d{5}(-\d{4})?$/.test(f.countyAttorney.zip)) fail('countyAttorney: invalid address components');
  }
  exactKeys(f.historyReport, ['availability','issuedOn','releaseSigned'], 'historyReport');
  const h = f.historyReport;
  if (!['available','requested','not_requested','unknown'].includes(h.availability)) fail('historyReport: unrecognized availability');
  if (![true,false,null].includes(h.releaseSigned)) fail('historyReport.releaseSigned: explicit boolean or null');
  let reportAgeDays = null;
  if (h.availability === 'available') {
    reportAgeDays = (filing - dateValue(h.issuedOn)) / 86400000;
    if (reportAgeDays < 0) fail('historyReport: issue date cannot postdate intended filing');
  } else if (h.issuedOn !== null) fail('historyReport: an unreceived report cannot have an asserted issue date');
  exactKeys(f.acknowledgments, ['copy','related','lifetime','confidential'], 'acknowledgments');
  for (const [k,v] of Object.entries(f.acknowledgments)) if (v !== true) fail(`Read-before-signing acknowledgment not supplied: ${k}`);
  const historyReadyByParticipantReport = h.availability === 'available' && reportAgeDays <= 30 && h.releaseSigned === true;
  return { facts: f, anniversary: anniversary.toISOString().slice(0,10), exactAnniversary: +filing === +anniversary, reportAgeDays, historyReadyByParticipantReport,
    externalHistoryIncluded: false, reportAvailabilityIsParticipantReported: true, filingReady: false };
}

/** Transport only: the native validator above remains the rule authority.
 * Nullable source fields require an explicit unknown answer, never an absent
 * answer. No uploaded report, signature, service or attachment is asserted.
 */
export const IOWA_MISDEMEANOR_ROUTE = 'IA:misdemeanor-901c3';
const raw = v => v && typeof v === 'object' && !Array.isArray(v)
  ? v.unknown === true ? undefined : Object.hasOwn(v, 'value') ? v.value : v : v;
const unknownText = v => typeof raw(v) === 'string' && ['unknown','i am not sure','not sure','no sé','no se'].includes(raw(v).trim().toLowerCase());
const explicitUnknown = v => Boolean(v && typeof v === 'object' && v.unknown === true) || unknownText(v);
const boolean = v => {
  if (explicitUnknown(v)) return undefined;
  const x = raw(v), s = typeof x === 'string' ? x.trim().toLowerCase() : '';
  return x === true || s === 'yes' || s === 'true' ? true : x === false || s === 'no' || s === 'false' ? false : undefined;
};
const count = v => {
  const x = raw(v), s = typeof x === 'number' ? String(x) : typeof x === 'string' ? x.trim() : '';
  return /^(0|[1-9]\d*)$/.test(s) && +s <= 30 ? +s : undefined;
};
/** @typedef {{id:string,type:string,en:string,es:string,nullable?:boolean,options?:string[],optionsEn?:string[],optionsEs?:string[]}} IowaQuestion */
/** @returns {IowaQuestion} */
const q = (id, type, en, es, extra = {}) => ({id,type,en,es,...extra});
const yes = (id,en,es) => q(id,'yes_no_unknown',en,es);
const choice = (id,options,optionsEn,optionsEs,en,es) => q(id,'single_choice',en,es,{options,optionsEn,optionsEs});
// path, existing/native fact ID, wire type, English, Spanish, explicit null allowed.
const fields = [
  ['name.first','ia_901c3_first_name','text','What is your current legal first name?','¿Cuál es su nombre legal actual?'],
  ['name.last','ia_901c3_last_name','text','What is your current legal last name?','¿Cuál es su apellido legal actual?'],
  ['county','county','text','In which Iowa county was this conviction entered?','¿En qué condado de Iowa se dictó esta condena?'],
  ['caseNumber','case_identifier','text','What is the existing conviction case number?','¿Cuál es el número del caso de la condena?'],
  ['plaintiff','ia_901c3_plaintiff','text','Who is named as plaintiff in the original case caption?','¿Quién figura como demandante en el encabezamiento original del caso?'],
  ['dob','ia_901c3_birth_date','date','What is your birth date? Keep it unknown if you do not know.','¿Cuál es su fecha de nacimiento? Déjela desconocida si no la sabe.',true],
  ['driversLicense','ia_901c3_driver_license','text','What is your driver license number? Keep it unknown if unavailable.','¿Cuál es su número de licencia de conducir? Déjelo desconocido si no está disponible.',true],
  ['ssn','ia_901c3_ssn','text','What is your Social Security number? Keep it unknown if unavailable.','¿Cuál es su número de Seguro Social? Déjelo desconocido si no está disponible.',true],
  ['address','ia_901c3_address','text','What is your mailing street address?','¿Cuál es su dirección postal (calle)?',true],
  ['city','ia_901c3_city','text','What is your mailing city?','¿Cuál es su ciudad postal?',true],
  ['state','ia_901c3_state','text','What is your two-letter mailing state?','¿Cuál es la abreviatura de dos letras de su estado postal?',true],
  ['zip','ia_901c3_zip','text','What is your mailing ZIP code?','¿Cuál es su código postal?',true],
  ['phone','ia_901c3_phone','text','What is your ten-digit telephone number?','¿Cuál es su número de teléfono de diez dígitos?',true],
  ['email','ia_901c3_email','text','What is your email address?','¿Cuál es su dirección de correo electrónico?',true],
  ['convictionDate','conviction_date','date','On what date was this misdemeanor conviction entered?','¿En qué fecha se dictó esta condena por delito menor?'],
  ['offense.section','ia_901c3_offense_section','text','What exact Iowa Code section and subsection appear in the conviction record?','¿Qué sección y subsección exactas del Código de Iowa figuran en la condena?'],
  ['offense.title','ia_901c3_offense_title','text','What offense title appears in the conviction record?','¿Qué nombre del delito figura en la condena?'],
  ['misdemeanorConviction','ia_901c3_misdemeanor_conviction','bool','Does the record show a misdemeanor conviction?','¿El expediente muestra una condena por delito menor?'],
  ['deferredJudgmentDisposition','ia_901c3_deferred_disposition','bool','Was this case a deferred judgment instead of a conviction?','¿Este caso fue una sentencia diferida en vez de una condena?'],
  ['hasPrior901c3Grant','ia_901c3_prior_grant','bool','Have you previously received an expungement under Iowa Code section 901C.3?','¿Ha recibido antes una eliminación de antecedentes conforme a la sección 901C.3 del Código de Iowa?'],
  ['hasOtherEligibleConvictions','ia_901c3_other_convictions','bool','Are there other misdemeanor convictions you are considering for this one-time section 901C.3 application?','¿Hay otras condenas por delitos menores que esté considerando para esta solicitud única conforme a la sección 901C.3?'],
  ['pendingCharges','pending_cases','bool','Do you have any pending criminal charges?','¿Tiene algún cargo penal pendiente?'],
  ['financialObligationsPaid','financial_obligations','bool','Have all court costs, fees, fines, restitution and other financial obligations in this case been paid in full?','¿Se han pagado por completo las costas, tasas, multas, restitución y demás obligaciones económicas de este caso?'],
  ['exclusionsReviewed','ia_901c3_exclusions_reviewed','bool','Have you reviewed the excluded-offense list in the official Form 2 instructions against this conviction record? This answer does not override the exact offense check.','¿Ha revisado la lista de delitos excluidos en las instrucciones oficiales del Formulario 2 y la ha comparado con esta condena? Esta respuesta no anula la comprobación del delito exacto.'],
  ['comparabilityUncertain','ia_901c3_comparability_uncertain','bool','Is there an unresolved question about a federal or earlier-law offense being comparable to an excluded offense?','¿Hay una duda sin resolver sobre si un delito federal o de una ley anterior es comparable a un delito excluido?'],
  ['sexOffense','ia_901c3_sex_offense','bool','Does the conviction involve a sex offense?','¿La condena corresponde a un delito sexual?'],
  ['selfRepresented','ia_901c3_self_represented','bool','Will you represent yourself for this application?','¿Se representará a sí mismo en esta solicitud?'],
  ['acknowledgments.copy','ia_901c3_ack_copy','bool','Have you read that a copy must be provided to the county attorney?','¿Ha leído que debe entregar una copia al fiscal del condado?'],
  ['acknowledgments.related','ia_901c3_ack_related','bool','Have you read the Form 2 instructions about related cases and separate applications?','¿Ha leído las instrucciones del Formulario 2 sobre casos relacionados y solicitudes separadas?'],
  ['acknowledgments.lifetime','ia_901c3_ack_lifetime','bool','Have you read the one-expungement-per-lifetime limitation?','¿Ha leído la limitación de una eliminación de antecedentes durante su vida?'],
  ['acknowledgments.confidential','ia_901c3_ack_confidential','bool','Have you read the explanation of the confidential court record after expungement?','¿Ha leído la explicación sobre el expediente judicial confidencial después de la eliminación?']
];
const nameQuestions = (prefix, en, es, includeMiddle) => [
  q(prefix+'first','text_or_unknown',`What first name appears in ${en}?`,`¿Qué nombre figura en ${es}?`),
  q(prefix+'last','text_or_unknown',`What last name appears in ${en}?`,`¿Qué apellido figura en ${es}?`),
  yes(prefix+'has_middle',`Does ${en} include a middle name?`,`¿Incluye ${es} un segundo nombre?`),
  ...(includeMiddle ? [q(prefix+'middle','text_or_unknown',`What middle name appears in ${en}?`,`¿Qué segundo nombre figura en ${es}?`)] : [])
];
/** @returns {IowaQuestion[]} */
export function iowaMisdemeanorQuestions(answers={},includeInactive=false) {
  const out=fields.map(([,id,type,en,es,nullable])=>q(id,type==='bool'?'yes_no_unknown':type==='date'?'date_or_unknown':'text_or_unknown',en,es,{nullable:nullable===true}));
  out.push(yes('ia_901c3_has_middle','Does your current legal name include a middle name?','¿Incluye su nombre legal actual un segundo nombre?'));
  if(includeInactive||boolean(answers.ia_901c3_has_middle)===true)out.push(q('ia_901c3_middle_name','text_or_unknown','What is your current legal middle name?','¿Cuál es su segundo nombre legal actual?'));
  out.push(q('ia_901c3_alias_count','text_or_unknown','How many other names have you used? Enter 0 only if none; the supported maximum is 30.','¿Cuántos otros nombres ha usado? Escriba 0 solo si no hay ninguno; el máximo admitido es 30.'));
  const n=includeInactive?30:count(answers.ia_901c3_alias_count);
  if(n!==undefined)for(let i=1;i<=n;i++){const prefix=`ia_901c3_alias_${i}_`;out.push(...nameQuestions(prefix,`other name ${i}`,`el otro nombre ${i}`,includeInactive||boolean(answers[prefix+'has_middle'])===true));}
  out.push(yes('ia_901c3_related_cases','Are there other cases from the same transaction or occurrence that may relate to this application?','¿Hay otros casos del mismo hecho o suceso que puedan estar relacionados con esta solicitud?'),
    choice('ia_901c3_deferred_count',['0','1','2_or_more'],['None','One','Two or more'],['Ninguno','Uno','Dos o más'],'How many deferred-judgment proceedings have you been granted?','¿Cuántos procedimientos de sentencia diferida le han concedido?'),
    choice('ia_901c3_filing_method',['paper','efile'],['Paper filing','Electronic filing'],['Presentación en papel','Presentación electrónica'],'How will you file this application?','¿Cómo presentará esta solicitud?'),
    choice('ia_901c3_history_availability',['available','requested','not_requested','unknown'],['Received','Requested but not received','Not requested','I am not sure'],['Recibido','Solicitado pero no recibido','No solicitado','No lo sé'],'What is the status of your returned Iowa DCI criminal-history report? LegalEase does not create or attach that government report.','¿Cuál es el estado de su informe de antecedentes penales de Iowa DCI? LegalEase no crea ni adjunta ese informe gubernamental.'),
    yes('ia_901c3_history_release_signed','Have you actually signed the release required for the history report? Keep unknown if you do not know.','¿Ha firmado realmente la autorización necesaria para el informe de antecedentes? Déjelo desconocido si no lo sabe.'));
  if(includeInactive||raw(answers.ia_901c3_history_availability)==='available')out.push(q('ia_901c3_history_issued','date_or_unknown','On what date was the actual returned DCI report issued?','¿En qué fecha se emitió el informe DCI que recibió?'));
  if(includeInactive||raw(answers.ia_901c3_filing_method)==='paper'){
    out.push(yes('ia_901c3_recipient_known','Do you know the county attorney name and address for intended paper service?','¿Conoce el nombre y la dirección del fiscal del condado para la entrega prevista en papel?'));
    if(includeInactive||boolean(answers.ia_901c3_recipient_known)===true)for(const [key,en,es]of[['name','name','nombre'],['address','street address','dirección (calle)'],['city','city','ciudad'],['state','two-letter state','estado (dos letras)'],['zip','ZIP code','código postal']])out.push(q('ia_901c3_recipient_'+key,'text_or_unknown',`What is the intended county attorney recipient's ${en}?`,`¿Cuál es ${es} del fiscal del condado destinatario?`));
  }
  return out;
}
export const IOWA_MISDEMEANOR_FACT_IDS=Object.freeze(iowaMisdemeanorQuestions({},true).map(q=>q.id));

/** @param {Readonly<Record<string,unknown>>} answers
 * @param {{synthetic:boolean,filingDate:string}} context
 * @returns {{facts:Record<string,any>|null,missingFactIds:string[],refusal:string|null}} */
export function iowaMisdemeanorFactsFromAnswers(answers,context) {
  if(typeof context?.synthetic!=='boolean'||typeof context?.filingDate!=='string')return{facts:null,missingFactIds:[],refusal:'Server-supplied synthetic flag and intended filing/reference date are required.'};
  const facts={synthetic:context.synthetic,filingDate:context.filingDate},missingFactIds=[];
  const take=(id,type='text',nullable=false)=>{
    const v=answers[id];
    if(nullable&&explicitUnknown(v))return null;
    let value=type==='bool'?boolean(v):type==='count'?count(v):raw(v);
    if(type!=='bool'&&type!=='count'&&(typeof value!=='string'||!value.trim()||explicitUnknown(v)))value=undefined;
    if(value===undefined){missingFactIds.push(id);return undefined;}return value;
  };
  const set=(path,value)=>{const keys=path.split('.');let target=facts;for(const key of keys.slice(0,-1))target=target[key]??(target[key]={});target[keys.at(-1)]=value;};
  for(const[path,id,type,,,nullable]of fields)set(path,take(id,type,nullable));
  const middle=take('ia_901c3_has_middle','bool');
  facts.name.middle=middle===false?'':middle===true?take('ia_901c3_middle_name'):undefined;
  const n=take('ia_901c3_alias_count','count');
  if(n!==undefined){facts.aliases=[];for(let i=1;i<=n;i++){const p=`ia_901c3_alias_${i}_`,hasMiddle=take(p+'has_middle','bool');facts.aliases.push({first:take(p+'first'),last:take(p+'last'),middle:hasMiddle===false?'':hasMiddle===true?take(p+'middle'):undefined});}}
  const related=take('ia_901c3_related_cases','bool');
  if(related===true)return{facts:null,missingFactIds:[...new Set(missingFactIds)],refusal:'Self-help stop: related-case/same-transaction determination requires legal assistance'};
  if(related===false)facts.relatedCases=[];
  const deferred=raw(answers.ia_901c3_deferred_count);
  facts.deferredJudgmentProceedings=deferred==='0'||deferred===0?0:deferred==='1'||deferred===1?1:deferred==='2_or_more'?2:undefined;
  if(facts.deferredJudgmentProceedings===undefined)missingFactIds.push('ia_901c3_deferred_count');
  facts.filingMethod=take('ia_901c3_filing_method');
  if(facts.filingMethod==='efile')facts.countyAttorney=null;
  else if(facts.filingMethod==='paper'){
    const known=take('ia_901c3_recipient_known','bool',true);
    if(known===false||known===null)facts.countyAttorney=null;
    else if(known===true){facts.countyAttorney={};for(const key of['name','address','city','state','zip'])facts.countyAttorney[key]=take('ia_901c3_recipient_'+key);}
  }
  // 'unknown' is an explicit native availability code, not an invented report.
  const availability=explicitUnknown(answers.ia_901c3_history_availability)?'unknown':raw(answers.ia_901c3_history_availability);
  if(!['available','requested','not_requested','unknown'].includes(availability))missingFactIds.push('ia_901c3_history_availability');
  facts.historyReport={availability,issuedOn:availability==='available'?take('ia_901c3_history_issued'):null,releaseSigned:take('ia_901c3_history_release_signed','bool',true)};
  return{facts:missingFactIds.length?null:facts,missingFactIds:[...new Set(missingFactIds)],refusal:null};
}
