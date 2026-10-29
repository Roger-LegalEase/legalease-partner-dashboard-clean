/** Existing Iowa Form3/Form4 section-specific alcohol validation. No corpus or rendering side effects. */
export function text(v, name, max = 200) {
 if (typeof v !== 'string' || !v.trim() || v.trim() !== v || v.length > max || /[\x00-\x1f\x7f]/.test(v)) throw Error(`${name}: nonempty trimmed text required`);
 return v;
}
export function dateValue(s) {
 if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error('date: YYYY-MM-DD required');
 const d = new Date(`${s}T00:00:00Z`);
 if (!Number.isFinite(+d) || d.toISOString().slice(0, 10) !== s) throw Error('date: invalid calendar date');
 return d;
}
export function exact(o,keys,label){if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(o,k)))throw Error(label+': supply exactly the stated fields, including explicit nulls');}
const contacts=['address','city','state','zip','phone','email'];
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

export const IOWA_ALCOHOL_ROUTES=Object.freeze({
 'IA:public-intoxication-12346':Object.freeze({section:'123.46',trackId:'ia-12346',familyId:'ia-12346-set',formId:'Rule 2.86 Form 3'}),
 'IA:underage-alcohol-12347':Object.freeze({section:'123.47',trackId:'ia-12347',familyId:'ia-12347-set',formId:'Rule 2.86 Form 4'})
});
const routeFor=id=>Object.hasOwn(IOWA_ALCOHOL_ROUTES,id)?IOWA_ALCOHOL_ROUTES[id]:null;
const wrapper=v=>Boolean(v&&typeof v==='object'&&!Array.isArray(v)
 &&Object.keys(v).every(k=>k==='value'||k==='unknown')
 &&(!Object.hasOwn(v,'unknown')||typeof v.unknown==='boolean'));
const raw=v=>v&&typeof v==='object'?wrapper(v)&&v.unknown!==true?v.value:undefined:v;
const explicitUnknown=v=>wrapper(v)&&v.unknown===true||typeof raw(v)==='string'&&['unknown','i am not sure','not sure','no sé','no se'].includes(raw(v).trim().toLowerCase());
const boolean=v=>{if(explicitUnknown(v))return undefined;const x=raw(v),s=typeof x==='string'?x.trim().toLowerCase():'';return x===true||s==='yes'||s==='true'?true:x===false||s==='no'||s==='false'?false:undefined;};
const inventoryCount=v=>{const x=raw(v),s=typeof x==='number'?String(x):typeof x==='string'?x.trim():'';return /^(0|[1-9]\d*)$/.test(s)&&+s<=25?+s:undefined;};
/** @typedef {{id:string,type:string,en:string,es:string,allowsExplicitUnknown?:boolean,allowsExplicitNull?:boolean,options?:string[],optionsEn?:string[],optionsEs?:string[]}} AlcoholQuestion */
/** @returns {AlcoholQuestion} */
const question=(id,type,en,es,extra={})=>({id,type,en,es,...extra});
const yes=(id,en,es,optionalUnknown=false)=>question(id,'yes_no_unknown',en,es,{allowsExplicitUnknown:optionalUnknown,allowsExplicitNull:optionalUnknown});
const choice=(id,options,optionsEn,optionsEs,en,es)=>question(id,'single_choice',en,es,{options,optionsEn,optionsEs});
// Native path, ordinary protected ID, conversion, English, Spanish, nullable.
const fields=[
 ['name','participant_full_legal_name','text','What full name will you use on this court application? Check it against the existing case.','¿Qué nombre completo usará en esta solicitud judicial? Compárelo con el caso existente.'],
 ['county','county','text','In which Iowa county was this conviction entered?','¿En qué condado de Iowa se dictó esta condena?'],
 ['caseNumber','case_identifier','text','What is the existing conviction case number?','¿Cuál es el número del caso de la condena?'],
 ['plaintiff','ia_alcohol_plaintiff','text','Who is named as plaintiff in the original case caption?','¿Quién figura como demandante en el encabezamiento original del caso?'],
 ['convictionDate','conviction_date','date','On what date was this conviction entered? The two-year clock starts at conviction.','¿En qué fecha se dictó esta condena? El plazo de dos años comienza con la condena.'],
 ['address','ia_alcohol_address','text','What is your mailing street address? Keep it unknown if unavailable.','¿Cuál es su dirección postal (calle)? Déjela desconocida si no está disponible.',true],
 ['city','ia_alcohol_city','text','What is your mailing city?','¿Cuál es su ciudad postal?',true],
 ['state','ia_alcohol_state','text','What is your two-letter mailing state?','¿Cuál es la abreviatura de dos letras de su estado postal?',true],
 ['zip','ia_alcohol_zip','text','What is your mailing ZIP code?','¿Cuál es su código postal?',true],
 ['phone','ia_alcohol_phone','text','What is your ten-digit telephone number?','¿Cuál es su número de teléfono de diez dígitos?',true],
 ['email','ia_alcohol_email','text','What is your email address?','¿Cuál es su dirección de correo electrónico?',true],
 ['selfRepresented','ia_alcohol_self_represented','bool','Will you represent yourself for this application?','¿Se representará a sí mismo en esta solicitud?'],
 ['historyComplete','ia_alcohol_history_complete','bool','Have you listed every conviction after this conviction, including traffic matters and convictions after the first two years?','¿Ha enumerado todas las condenas posteriores a esta condena, incluidos asuntos de tránsito y condenas posteriores a los primeros dos años?'],
 ['convictionStatementConfirmed','ia_alcohol_conviction_checked','bool','Have you checked the application conviction statement against the actual case record?','¿Ha comparado la declaración de la solicitud sobre la condena con el expediente real del caso?'],
 ['cleanPeriodStatementConfirmed','ia_alcohol_period_checked','bool','Have you checked the official two-year criminal-history statement against the complete list below? A Yes cannot override a disqualifying conviction.','¿Ha comparado la declaración oficial sobre los antecedentes durante dos años con la lista completa que sigue? Un Sí no anula una condena que impida usar esta vía.'],
 ['acknowledgedCopy','ia_alcohol_ack_copy','bool','Have you read that the county attorney must receive a copy?','¿Ha leído que el fiscal del condado debe recibir una copia?'],
 ['acknowledgedConfidential','ia_alcohol_ack_confidential','bool','Have you read the explanation that the court record becomes confidential and comes off public access?','¿Ha leído la explicación de que el expediente judicial pasa a ser confidencial y deja de estar disponible al público?']
];

/** @returns {AlcoholQuestion[]} */
export function iowaAlcoholQuestions(routeId,answers={},includeInactive=false){
 if(!routeFor(routeId))return[];
 const q=fields.map(([,id,type,en,es,nullable])=>question(id,type==='bool'?'yes_no_unknown':type==='date'?'date_or_unknown':'text_or_unknown',en,es,{allowsExplicitUnknown:nullable===true,allowsExplicitNull:nullable===true}));
 q.push(choice('ia_alcohol_disposition',['conviction','dismissed','deferred','pending'],['Conviction','Dismissed','Deferred judgment/disposition','Pending'],['Condena','Desestimado','Sentencia o resolución diferida','Pendiente'],'What actual disposition appears in this case record?','¿Qué resolución real figura en el expediente de este caso?'),
  choice('ia_alcohol_proceeding',['district_court','juvenile_court','agency'],['District court','Juvenile court','Agency proceeding'],['Tribunal de distrito','Tribunal de menores','Procedimiento de una agencia'],'What type of proceeding produced this record?','¿Qué tipo de procedimiento produjo este expediente?'),
  choice('ia_alcohol_offense_kind',['statute','local_equivalent'],['Iowa Code offense','Local ordinance identified as equivalent in the record'],['Delito del Código de Iowa','Ordenanza local identificada como equivalente en el expediente'],'Does the conviction record cite an Iowa statute or a local ordinance?','¿La condena cita una ley de Iowa o una ordenanza local?'),
  question('ia_alcohol_offense_citation','text_or_unknown','What exact statute/subsection or local ordinance is recorded for this conviction?','¿Qué ley y subsección exactas u ordenanza local figuran en esta condena?'),
  choice('ia_alcohol_equivalent_to',['123.46','123.47'],['Section 123.46 public consumption/intoxication','Section 123.47(3) possession under the legal age'],['Sección 123.46 consumo o intoxicación en público','Sección 123.47(3) posesión siendo menor de edad legal'],'Which Iowa offense does the actual record identify? For a local ordinance, select an equivalent only if the court/prosecutor record establishes it; otherwise keep unknown. Similar wording or a Yes answer is not enough.','¿Qué delito de Iowa identifica el expediente real? Para una ordenanza local, seleccione un equivalente solo si el expediente del tribunal o fiscal lo establece; de lo contrario, manténgalo desconocido. Una redacción parecida o responder Sí no es suficiente.'),
  yes('ia_alcohol_offense_checked','Have you checked that exact conviction citation and any stated equivalence in the actual record?','¿Ha comprobado la cita exacta de la condena y cualquier equivalencia indicada en el expediente real?'),
  question('ia_alcohol_later_count','text_or_unknown','How many convictions followed this conviction? Enter 0 only if none. This intake supports up to 25 entries; do not omit others.','¿Cuántas condenas hubo después de esta condena? Escriba 0 solo si no hubo ninguna. Este formulario de datos admite hasta 25 entradas; no omita otras.'),
  choice('ia_alcohol_filing_method',['paper','efile'],['Paper filing','Electronic filing'],['Presentación en papel','Presentación electrónica'],'How will you file this application?','¿Cómo presentará esta solicitud?'));
 const n=includeInactive?25:inventoryCount(answers.ia_alcohol_later_count);
 if(n!==undefined)for(let i=1;i<=n;i++){const p=`ia_alcohol_later_${i}_`;q.push(
  question(p+'date','date_or_unknown',`On what date was subsequent conviction ${i} entered?`,`¿En qué fecha se dictó la condena posterior ${i}?`),
  question(p+'citation','text_or_unknown',`What exact citation appears for subsequent conviction ${i}?`,`¿Qué cita exacta figura para la condena posterior ${i}?`),
  choice(p+'kind',['local_traffic','chapter_321_simple','other'],['Local traffic violation','Chapter 321 simple misdemeanor','Other criminal conviction'],['Infracción local de tránsito','Delito menor simple del capítulo 321','Otra condena penal'],`Which classification does the actual record establish for conviction ${i}? Keep unknown if not established.`,`¿Qué clasificación establece el expediente real para la condena ${i}? Manténgala desconocida si no está establecida.`),
  yes(p+'category_checked',`Have you checked that recorded classification for conviction ${i}?`,`¿Ha comprobado la clasificación registrada de la condena ${i}?`));}
 if(includeInactive||raw(answers.ia_alcohol_filing_method)==='paper'){
  q.push(yes('ia_alcohol_recipient_known','Do you know the intended county attorney recipient name and address for paper service?','¿Conoce el nombre y la dirección del fiscal del condado destinatario de la entrega en papel?',true));
  if(includeInactive||boolean(answers.ia_alcohol_recipient_known)===true)for(const[key,en,es]of[['name','name','nombre'],['address','street address','dirección (calle)'],['city','city','ciudad'],['state','two-letter state','estado (dos letras)'],['zip','ZIP code','código postal']])q.push(question('ia_alcohol_recipient_'+key,'text_or_unknown',`What is the intended county attorney recipient's ${en}?`,`¿Cuál es ${es} del fiscal del condado destinatario?`));
 }
 return q;
}
export const IOWA_ALCOHOL_FACT_IDS=Object.freeze(iowaAlcoholQuestions('IA:public-intoxication-12346',{},true).map(q=>q.id));
export const IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS=Object.freeze(iowaAlcoholQuestions('IA:public-intoxication-12346',{},true).filter(q=>q.allowsExplicitUnknown).map(q=>q.id));

/** @param {string} routeId
 * @param {Readonly<Record<string,unknown>>} answers
 * @param {{synthetic:boolean,filingDate:string}} context
 * @returns {{facts:Record<string,any>|null,missingFactIds:string[],refusal:string|null}} */
export function iowaAlcoholFactsFromAnswers(routeId,answers,context){
 const route=routeFor(routeId);if(!route)return{facts:null,missingFactIds:[],refusal:'unsupported_route'};
 if(typeof context?.synthetic!=='boolean'||typeof context?.filingDate!=='string')return{facts:null,missingFactIds:[],refusal:'server_context_required'};
 const facts={synthetic:context.synthetic,filingDate:context.filingDate},missingFactIds=[];
 const take=(id,type='text',nullable=false)=>{const v=answers[id];if(nullable&&(explicitUnknown(v)||Object.hasOwn(answers,id)&&raw(v)===null))return null;let x=type==='bool'?boolean(v):type==='count'?inventoryCount(v):raw(v);if(type!=='bool'&&type!=='count'&&(typeof x!=='string'||!x.trim()||explicitUnknown(v)))x=undefined;if(x===undefined)missingFactIds.push(id);return x;};
 for(const[path,id,type,,,nullable]of fields)facts[path]=take(id,type,nullable);
 facts.disposition=take('ia_alcohol_disposition');facts.proceeding=take('ia_alcohol_proceeding');
 // This is the record's explicit statutory/equivalence fact, not the selected
 // product route or a participant's bare assertion of legal eligibility.
 facts.offense={kind:take('ia_alcohol_offense_kind'),citation:take('ia_alcohol_offense_citation'),equivalentTo:take('ia_alcohol_equivalent_to'),confirmation:take('ia_alcohol_offense_checked','bool')};
 if(facts.offense.equivalentTo!==undefined&&!['123.46','123.47'].includes(facts.offense.equivalentTo)){facts.offense.equivalentTo=undefined;missingFactIds.push('ia_alcohol_equivalent_to');}
 const suppliedCount=raw(answers.ia_alcohol_later_count);
 if((typeof suppliedCount==='number'&&Number.isInteger(suppliedCount)||typeof suppliedCount==='string'&&/^(0|[1-9]\d*)$/.test(suppliedCount.trim()))&&Number(suppliedCount)>25)return{facts:null,missingFactIds:[],refusal:'history_inventory_capacity'};
 const n=take('ia_alcohol_later_count','count');
 if(n!==undefined){facts.laterConvictions=[];for(let i=1;i<=n;i++){const p=`ia_alcohol_later_${i}_`;facts.laterConvictions.push({date:take(p+'date'),citation:take(p+'citation'),kind:take(p+'kind'),categoryConfirmed:take(p+'category_checked','bool')});}}
 facts.filingMethod=take('ia_alcohol_filing_method');
 if(facts.filingMethod==='efile')facts.countyAttorney=null;
 else if(facts.filingMethod==='paper'){const known=take('ia_alcohol_recipient_known','bool',true);if(known===false||known===null)facts.countyAttorney=null;else if(known===true){facts.countyAttorney={};for(const key of['name','address','city','state','zip'])facts.countyAttorney[key]=take('ia_alcohol_recipient_'+key);}}
 // Balance is irrelevant to eligibility under Rule2.83(3). An absent/unknown
 // optional context answer remains unknown, never invented paid or unpaid.
 const debt=boolean(answers.financial_obligations);facts.courtDebtBalanceStatus=debt===true?'paid':debt===false?'unpaid':'unknown';
 return{facts:missingFactIds.length?null:facts,missingFactIds:[...new Set(missingFactIds)],refusal:null};
}

export const IOWA_ALCOHOL_PREPARATION_SCOPE='SUPPORTED_DRAFT_PREPARATION_ONLY';
const alcoholOutcomeCopy=Object.freeze({
 capacity:['This intake collects at most 25 subsequent-conviction entries. Your record exceeds that input capacity; none may be omitted. Obtain assistance with a complete inventory before proceeding. This is an intake limit, not a statutory exclusion.','Este formulario de datos admite como máximo 25 condenas posteriores. Su expediente supera esa capacidad; no se puede omitir ninguna. Obtenga ayuda para completar el inventario antes de continuar. Es un límite del formulario de datos, no una exclusión legal.'],
 supported:['These answers support preparing the source-specific court application draft. Court debt is not a prerequisite on this route. Review the actual statements, finish private contact/signature fields and complete service before filing; the court determines relief.','Estas respuestas permiten preparar un borrador de la solicitud judicial específica. Las deudas judiciales no son un requisito en esta vía. Revise las declaraciones reales, complete los datos privados de contacto y firma y realice la entrega antes de presentar la solicitud; el tribunal determina la medida que corresponde.'],
 unknown:['A required conviction or complete-history fact is missing or uncertain. Keep it unknown and consult the actual record.','Falta un dato necesario de la condena o de los antecedentes completos, o es incierto. Manténgalo desconocido y consulte el expediente real.'],
 timing:['Two years have not elapsed since this conviction. The clock does not restart at sentence completion or payment.','No han transcurrido dos años desde esta condena. El plazo no comienza de nuevo al completar la condena impuesta ni al pagar.'],
 excluded:['The supplied record does not fit this supported conviction route, or shows a disqualifying criminal conviction during its two-year window. Check the exact record before choosing another route.','El expediente indicado no corresponde a esta vía de condena, o muestra una condena penal que impide usarla durante su plazo de dos años. Consulte el expediente exacto antes de elegir otra vía.'],
 review:['This source-specific draft needs record or legal review before preparation can proceed. Do not guess at dates, offense equivalence or conviction classifications.','Este borrador específico requiere revisión del expediente o revisión legal antes de continuar su preparación. No adivine fechas, equivalencias de delitos ni clasificaciones de condenas.'],
 leap:['The conviction was on February 29 and its two-year anniversary needs an explicit legal timing determination. Preparation remains held.','La condena se dictó el 29 de febrero y su segundo aniversario requiere una determinación jurídica expresa del plazo. La preparación sigue retenida.'],
 anniversary:['A nontraffic criminal conviction occurred on the exact second anniversary. Its timing needs review before this draft can proceed.','Hubo una condena penal que no era de tránsito en el segundo aniversario exacto. Su fecha requiere revisión antes de continuar con este borrador.']
});
export const IOWA_ALCOHOL_OUTCOME_COPY=Object.freeze(Object.values(alcoholOutcomeCopy));
/** @param {string} routeId
 * @param {Readonly<Record<string,unknown>>} answers
 * @param {{synthetic:boolean,filingDate:string}} context
 * @returns {{routeId:string,scope:string,status:string,reason:string,reasonEs:string,missingFactIds:string[],filingReady:boolean,courtDebtIsNotPrecondition:boolean}|null} */
export function evaluateIowaAlcoholPreparation(routeId,answers,context){
 const route=routeFor(routeId);if(!route)return null;
 const done=(status,pair,missingFactIds=[])=>({routeId,scope:IOWA_ALCOHOL_PREPARATION_SCOPE,status,reason:pair[0],reasonEs:pair[1],missingFactIds,filingReady:false,courtDebtIsNotPrecondition:true});
 try{
  const decoded=iowaAlcoholFactsFromAnswers(routeId,answers,context);
  if(decoded.refusal)return done('needs_review',decoded.refusal==='history_inventory_capacity'?alcoholOutcomeCopy.capacity:alcoholOutcomeCopy.review);
  if(!decoded.facts)return done('unknown',alcoholOutcomeCopy.unknown,decoded.missingFactIds);
  try{validateAlcoholFacts(decoded.facts,route.section);return done('qualifying',alcoholOutcomeCopy.supported);}
  catch(error){const m=error instanceof Error?error.message:'';
   if(m==='Two-year period has not expired')return done('not_yet',alcoholOutcomeCopy.timing);
   if(m==='Leap-day anniversary requires an explicit legal timing determination')return done('needs_review',alcoholOutcomeCopy.leap);
   if(m==='Subsequent conviction on the exact anniversary needs timing review')return done('needs_review',alcoholOutcomeCopy.anniversary);
   if(m==='Wrong or unconfirmed statutory ground'&&decoded.facts.offense.confirmation!==true)return done('unknown',alcoholOutcomeCopy.unknown,['ia_alcohol_offense_checked']);
   const incomplete={historyComplete:'ia_alcohol_history_complete',convictionStatementConfirmed:'ia_alcohol_conviction_checked',cleanPeriodStatementConfirmed:'ia_alcohol_period_checked',acknowledgedCopy:'ia_alcohol_ack_copy',acknowledgedConfidential:'ia_alcohol_ack_confidential'};
   const confirmation=m.match(/^Missing or false participant confirmation: (.+)$/);
   if(confirmation&&Object.hasOwn(incomplete,confirmation[1]))return done('unknown',alcoholOutcomeCopy.unknown,[incomplete[confirmation[1]]]);
   if(['Wrong disposition/proceeding: this is the district-court conviction route','Wrong statutory offense; do not infer broad alcohol eligibility','Disqualifying conviction within the two-year period','Wrong or unconfirmed statutory ground'].includes(m))return done('excluded',alcoholOutcomeCopy.excluded);
   return done('needs_review',alcoholOutcomeCopy.review);
  }
 }catch{return done('needs_review',alcoholOutcomeCopy.review);}
}
