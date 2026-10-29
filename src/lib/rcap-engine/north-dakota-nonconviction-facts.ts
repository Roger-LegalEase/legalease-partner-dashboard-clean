/** Exact existing R053 date split/exclusions; no renderer, legal signature or commercial authority. */
export const ND_NONCONVICTION_ROUTE="ND:non-conviction-court-record-closing-under-n-d-c-c-12-60-1-05";
export const ND_NONCONVICTION_DATE_SPLIT="2025-08-01";
type Facts=Readonly<Record<string,unknown>>;
export const ND_NONCONVICTION_QUESTIONS=[
 {id:"nd_all_charges_nonconviction",type:"yes_no_unknown",en:"Were all criminal charges in this case dismissed, or were you acquitted of every charge?",es:"¿Se desestimaron todos los cargos penales de este caso, o fue absuelto de todos los cargos?"},
 {id:"nd_qualifying_disposition_date",type:"date_or_unknown",en:"On what date did the court enter the dismissal or acquittal order? Check the actual order rather than recalling a screening estimate.",es:"¿En qué fecha dictó el tribunal la orden de desestimación o absolución? Consulte la orden real en vez de recordar una fecha estimada de la evaluación inicial."},
 {id:"nd_dismissal_part_of_plea_agreement",type:"yes_no_unknown",en:"Was the dismissal part of a plea agreement involving a conviction for another offense?",es:"¿Formó parte la desestimación de un acuerdo de culpabilidad que incluyó una condena por otro delito?"},
 {id:"nd_not_fit_to_proceed",type:"yes_no_unknown",en:"Was the case dismissed because you were found not fit to proceed?",es:"¿Se desestimó el caso porque se determinó que no era apto para continuar el proceso?"},
 {id:"nd_lack_of_criminal_responsibility",type:"yes_no_unknown",en:"Was the not-guilty verdict based on lack of criminal responsibility?",es:"¿Se basó el veredicto de no culpabilidad en la falta de responsabilidad penal?"},
 {id:"nd_case_appealed",type:"yes_no_unknown",en:"Was this case appealed?",es:"¿Se apeló este caso?"}
]as const;
const COURT_QUESTION={id:"nd_nonconviction_court_type",type:"single_choice",options:["district","municipal","unknown"],optionsEn:["District Court","Municipal Court","I am not sure"],optionsEs:["Tribunal de distrito","Tribunal municipal","No estoy seguro/a"],en:"Was this criminal case filed in a District Court or Municipal Court? The existing district-court packet does not resolve the municipal form question.",es:"¿Se presentó este caso penal en un tribunal de distrito o municipal? El paquete existente del tribunal de distrito no resuelve qué formulario usar en un tribunal municipal."};
const EXCLUSIONS=[
 ["nd_dismissal_part_of_plea_agreement","The dismissal was part of a plea agreement involving conviction on another offense.","La desestimación formó parte de un acuerdo de culpabilidad con condena por otro delito."],
 ["nd_not_fit_to_proceed","The dismissal was due to a finding that the person was not fit to proceed.","La desestimación se debió a que se determinó que la persona no era apta para continuar el proceso."],
 ["nd_lack_of_criminal_responsibility","The not-guilty verdict was due to lack of criminal responsibility.","El veredicto de no culpabilidad se debió a la falta de responsabilidad penal."],
 ["nd_case_appealed","The case was appealed.","El caso fue apelado."]
]as const;
export const ND_NONCONVICTION_REASON_COPY=[
 ["A valid matter evaluation date is required.","Se necesita una fecha válida para evaluar el asunto."],
 ["This section requires dismissal or acquittal of every criminal charge in the case.","Esta sección exige la desestimación o absolución de todos los cargos penales del caso."],
 ["The complete nonconviction and each statutory exception must be established; no answer is inferred from an omission.","Se debe establecer que no hubo condena en ninguno de los cargos y comprobar cada excepción legal; no se deducen respuestas a partir de datos omitidos."],
 ["Court closure follows 61 complete days after the order. Verify on day 62 or the next court business day. No ordinary participant petition is needed; agency criminal-history errors use a separate correction process.","El cierre judicial se produce después de 61 días completos desde la orden. Verifíquelo el día 62 o el siguiente día hábil judicial. No se necesita una petición ordinaria del participante; los errores en antecedentes de agencias usan un procedimiento de corrección separado."],
 ["The municipal-court caption/form question remains unresolved for this exact branch; do not use the district-court packet for a municipal case.","La cuestión del encabezado y formulario del tribunal municipal sigue sin resolverse para esta rama; no use el paquete del tribunal de distrito para un caso municipal."],
 ["The actual district or municipal court must be established before choosing a packet.","Se debe establecer si el tribunal real es de distrito o municipal antes de elegir un paquete."],
 ["The pre-August 1, 2025 district-court branch permits a petition to close the court record; no court filing fee is charged under this section. Actual record verification, artifact authority and delivery remain separate.","La rama del tribunal de distrito anterior al 1 de agosto de 2025 permite pedir el cierre del expediente judicial; esta sección no impone una tasa judicial por presentar la petición. La verificación del expediente real, la autorización del documento y la entrega siguen siendo requisitos separados."]
]as const;
export const ND_NONCONVICTION_DOCUMENT_MANIFEST=[
 {documentId:"ND-INSTRUCTIONS-CLOSE-NONCONVICTION",audience:"participant",requirement:"required",startPage:1,endPage:2},
 {documentId:"ND-PETITION-CLOSE-NONCONVICTION",audience:"court",requirement:"required",startPage:3,endPage:4},
 {documentId:"ND-ORDER-CLOSE-NONCONVICTION",audience:"court",requirement:"required",startPage:5,endPage:6}
]as const;
function value(raw:unknown):unknown{if(raw&&typeof raw==="object"&&!Array.isArray(raw)){if(Object.keys(raw).some(k=>k!=="value"&&k!=="unknown")||![undefined,false,true].includes((raw as {unknown?:boolean}).unknown))return undefined;return(raw as {unknown?:boolean}).unknown===true?undefined:(raw as {value?:unknown}).value;}return raw;}
function text(raw:unknown):string{const v=value(raw);return typeof v==="string"?v.trim():"";}
function bool(raw:unknown):boolean|undefined{const v=value(raw),t=typeof v==="string"?v.trim().toLowerCase():v;return t===true||t==="true"||t==="yes"||t==="sí"||t==="si"?true:t===false||t==="false"||t==="no"?false:undefined;}
function date(raw:unknown):string|null{const s=text(raw),at=new Date(`${s}T00:00:00Z`);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!s.startsWith("0000")&&Number.isFinite(at.getTime())&&at.toISOString().slice(0,10)===s?s:null;}
export function northDakotaNonconvictionQuestions(facts:Facts,includeInactive=false){
 const day=date(facts.nd_qualifying_disposition_date),pre=day&&day<ND_NONCONVICTION_DATE_SPLIT&&bool(facts.nd_all_charges_nonconviction)===true&&EXCLUSIONS.every(([id])=>bool(facts[id])===false);
 return [...ND_NONCONVICTION_QUESTIONS,...(includeInactive||pre?[COURT_QUESTION]:[])];
}
export function northDakotaNonconvictionFactIds(facts:Facts,includeInactive=false){return northDakotaNonconvictionQuestions(facts,includeInactive).map(q=>q.id);}
export function evaluateNorthDakotaNonconviction(routeKey:string,facts:Facts,asOf:Date|string){
 if(routeKey!==ND_NONCONVICTION_ROUTE)return null;
 const result=(branchId:string,status:"qualifying"|"guidance"|"excluded"|"unknown"|"attorney_review",copy:number,missingFactIds:string[]=[])=>({reviewId:"R053",routeId:ND_NONCONVICTION_ROUTE,branchId,status,reason:ND_NONCONVICTION_REASON_COPY[copy][0] as string,reasonEs:ND_NONCONVICTION_REASON_COPY[copy][1] as string,missingFactIds,documentIds:status==="qualifying"?ND_NONCONVICTION_DOCUMENT_MANIFEST.map(d=>d.documentId):[],externalDocumentIds:status==="qualifying"?["actual_nonconviction_order"]:[]});
 const today=date(asOf instanceof Date&&Number.isFinite(asOf.getTime())?asOf.toISOString().slice(0,10):asOf);
 if(!today)return result("unknown","unknown",0,["as_of_date"]);
 const excluded=EXCLUSIONS.filter(([id])=>bool(facts[id])===true);if(excluded.length)return{...result("statutory_exclusion","excluded",2),reason:excluded.map(([,en])=>en).join(" "),reasonEs:excluded.map(([,,es])=>es).join(" ")};
 if(bool(facts.nd_all_charges_nonconviction)===false)return result("not_all_charges_nonconviction","excluded",1);
 const missing=["nd_all_charges_nonconviction",...EXCLUSIONS.map(([id])=>id)].filter(id=>bool(facts[id])===undefined),day=date(facts.nd_qualifying_disposition_date);
 if(!day||day>today)missing.push("nd_qualifying_disposition_date");if(missing.length)return result("unknown","unknown",2,missing);
 if(day!>=ND_NONCONVICTION_DATE_SPLIT){const at=new Date(`${day}T00:00:00Z`);at.setUTCDate(at.getUTCDate()+62);return{...result("post_effective_date_automatic","guidance",3),verificationOn:at.toISOString().slice(0,10)};}
 if(text(facts.nd_nonconviction_court_type)==="municipal")return result("municipal_form_review","attorney_review",4);
 if(text(facts.nd_nonconviction_court_type)!=="district")return result("unknown","unknown",5,["nd_nonconviction_court_type"]);
 return result("pre_effective_date_petition","qualifying",6);
}
