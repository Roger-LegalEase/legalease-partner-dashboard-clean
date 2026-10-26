import type { QuestionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

export const WY_1401_ROUTE = "adult-non-conviction-expungement-w-s-7-13-1401";
export const WY_1401_SOURCE = "WY.memo:wy_nc_1401;wy-published-source-filing-requirements;WS7-13-1401;Q-48142fcca6b72da012e4";
/** Exact retained source identity. Normalization does not ratify or enable the route. */
export function wy1401Contract(profile: EngineProfile | undefined, route: string | null | undefined = WY_1401_ROUTE): boolean {
  const pathway=profile?.pathways.find(p=>p.id===WY_1401_ROUTE) as {sourceRef?:string;automatic?:boolean;filingRequired?:boolean;routeType?:string;lawrenceRatification?:{status?:string;payment_allowed_when_engine_confirms?:boolean}}|undefined;
  const plan=profile?.packetGenerator.pathways.find(p=>p.pathwayId===WY_1401_ROUTE);
  const original=pathway?.automatic===true && pathway.filingRequired===false && pathway.routeType==="automatic" && plan?.mode==="automatic_relief_verification_and_guidance" && plan.formMappingStatus==="not_required";
  const corrected=pathway?.automatic===false && pathway.filingRequired===true && pathway.routeType==="court_filing" && plan?.mode==="state_specific_custom_packet_from_source_rules" && plan.formMappingStatus==="custom_or_manual_mapping_required";
  return (original||corrected) && pathway?.lawrenceRatification?.status==="corrected_awaiting_reconfirmation"
    && pathway.lawrenceRatification.payment_allowed_when_engine_confirms===false
    && profile?.jurisdiction.code === "WY" && route === WY_1401_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa"
    && profile.pathways.find(p => p.id === route)?.sourceRef === "section:44-59";
}
export function withWyoming1401Procedure(profile: EngineProfile): EngineProfile {
  if (!wy1401Contract(profile)) return profile;
  return {...profile, pathways: profile.pathways.map(p => p.id !== WY_1401_ROUTE ? p : {
    ...p, automatic:false, filingRequired:true, routeType:"court_filing", suggestedResultCode:"needs_review",
    summary:"W.S. 7-13-1401 requires a verified petition to the Wyoming court where the proceeding occurred or would have occurred. Incident facts and the applicable 180-day period require review; this is not automatic relief.",
    frontendBranch:{...(p as {frontendBranch?:Record<string,unknown>}).frontendBranch,matchedResult:"needs_review",paymentAllowed:false}
  }),packetGenerator:{...profile.packetGenerator,pathways:profile.packetGenerator.pathways.map(p => p.pathwayId !== WY_1401_ROUTE ? p : {
    ...p,mode:"state_specific_custom_packet_from_source_rules",formMappingStatus:"custom_or_manual_mapping_required"
  })}};
}
export function wy1401Text(raw:unknown):string|null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const w=raw as Record<string,unknown>;
    if (Object.keys(w).length!==2 || !Object.hasOwn(w,"value") || w.unknown!==false) return null;
    raw=w.value;
  }
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
export function wy1401Context(profile:EngineProfile|undefined,route:string|null|undefined,a:Record<string,unknown>):boolean {
  if (!wy1401Contract(profile)) return false;
  if (route===WY_1401_ROUTE) return true;
  if (route!=null) return false;
  const hint=a.possible_pathway_context;
  return hint===WY_1401_ROUTE || hint===profile!.pathways.find(p=>p.id===WY_1401_ROUTE)!.label
    || WY_1401_NEW_IDS.some(id=>Object.hasOwn(a,id))
    || (hint===undefined || hint===null || hint==="") && ["Arrest or citation with no charge filed","Dismissed, no-billed, nolle prosequi, or not prosecuted","Acquitted"].includes(String(a.case_outcome));
}
type Choice=[string,string,string];
const unsure:Choice=["unknown","I am not sure","No estoy seguro"];
const yesNo:Choice[]=[["yes","Yes","Sí"],["no","No","No"],unsure];
const helper="Use the records for the entire incident. Do not infer an answer from a general completion answer. These facts help review a verified petition. They do not establish that a court will grant relief.";
const helperEs="Use los expedientes de todo el incidente. No deduzca una respuesta de una respuesta general sobre el cumplimiento. Estos hechos ayudan a revisar una petición verificada. No establecen que un tribunal concederá la reparación.";
function question(id:string,prompt:string,es:string,choices?:Choice[]):PublicQuestion {
  return {id,prompt,helperText:helper,type:choices?"single_choice":"date_or_unknown",required:false,stage:"pathway_routing",contextOnly:false,doesNotSelectPathway:true,lifecyclePhase:"prepay_route_splitter",options:choices?.map(c=>c[0])??null,
    ...(choices?{optionDisplay:Object.fromEntries(choices.map(([v,label,translated])=>[v,{label,translations:{es:{label:translated}}}]))}:{}),translations:{es:{prompt:es,helperText:helperEs}}};
}
export const WY_1401_QUESTIONS:PublicQuestion[]=[
  question("wy_1401_incident_result","What happened to all charges from this incident?","¿Qué ocurrió con todos los cargos de este incidente?",[
    ["no_charges_filed","No charges were filed","No se presentaron cargos"],
    ["not_convicted","Charges were filed, but none resulted in conviction (for example, acquittal)","Se presentaron cargos, pero ninguno resultó en condena (por ejemplo, absolución)"],
    ["dismissed_by_prosecutor","The prosecutor dismissed all charges","El fiscal desestimó todos los cargos"],
    ["dismissed_by_court","The court dismissed all charges","El tribunal desestimó todos los cargos"],
    ["conviction","At least one charge resulted in conviction","Al menos un cargo resultó en condena"],unsure]),
  // One explicit incident-wide answer replaces no source facts implicitly. The
  // retained family has two fields because it prints original/lesser separately;
  // this screening predicate is their union, including any different charge.
  question("wy_1401_listed_deferral","Did any charge from this incident—including a different or lesser charge—receive a disposition under W.S. 7-13-301, W.S. 35-7-1037, or former W.S. 7-13-203?","¿Algún cargo de este incidente, incluido un cargo diferente o menor, recibió una resolución conforme a W.S. 7-13-301, W.S. 35-7-1037 o el anterior W.S. 7-13-203?",yesNo),
  question("wy_1401_repository_record","Is the record maintained in Wyoming's state central repository at the Division of Criminal Investigation (DCI), rather than only in an agency investigative file?","¿Se conserva el expediente en el repositorio central del estado de Wyoming de la División de Investigación Criminal (DCI), y no únicamente en un archivo de investigación de una agencia?",yesNo),
  question("arrest_date","On what date were you arrested for this incident?","¿En qué fecha fue arrestado por este incidente?"),
  question("disposition_date","On what date were all charges from this incident dismissed?","¿En qué fecha se desestimaron todos los cargos de este incidente?")
];
export const WY_1401_NEW_IDS=WY_1401_QUESTIONS.slice(0,3).map(q=>q.id);
export const WY_1401_FACT_IDS=[...WY_1401_QUESTIONS.map(q=>q.id),"pending_cases"];
const dismissed=(s:string|null)=>s==="dismissed_by_prosecutor"||s==="dismissed_by_court";
export function wy1401Date(raw:unknown):string|null {
  const s=wy1401Text(raw);
  if(!s || !/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  const d=new Date(s+"T00:00:00.000Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;
}
export const WY_1401_COPY={
  missing:["Confirm the entire incident's disposition, listed deferrals, pending charges, repository record and applicable date. Keep unknown facts unknown.","Confirme la resolución de todo el incidente, las resoluciones diferidas indicadas, los cargos pendientes, el expediente del repositorio y la fecha aplicable. Conserve como desconocidos los hechos que no conoce."],
  outcome:["The incident and case outcomes do not establish a consistent non-conviction record. Clarify the actual records without changing a true outcome; no different procedure has been selected.","Los resultados del incidente y del caso no establecen un expediente coherente sin condena. Aclare los expedientes reales sin cambiar un resultado verdadero; no se ha seleccionado otro procedimiento."],
  conviction:["A conviction from this incident does not satisfy this non-conviction procedure. No other expungement route has been selected for you.","Una condena de este incidente no cumple este procedimiento para casos sin condena. No se ha seleccionado otra vía de eliminación de antecedentes."],
  deferral:["A listed deferred disposition on any charge from this incident, including a different or lesser charge, is excluded from this non-conviction procedure. No alternative procedure has been selected.","Una resolución diferida de las indicadas sobre cualquier cargo de este incidente, incluido un cargo diferente o menor, está excluida de este procedimiento para casos sin condena. No se ha seleccionado un procedimiento alternativo."],
  pending:["Formal charges are pending. This petition requires no formal charges pending when it is filed; correct the answer only if the facts change or were inaccurate.","Hay cargos formales pendientes. Esta petición requiere que no haya cargos formales pendientes al presentarla; corrija la respuesta solo si los hechos cambian o eran inexactos."],
  repository:["This procedure does not cover a record held only outside the state central repository, including an agency's investigative file. Preserve the actual record information.","Este procedimiento no cubre un expediente conservado únicamente fuera del repositorio central del estado, incluido un archivo de investigación de una agencia. Conserve la información real del expediente."],
  arrest_wait:["The 180-day period runs from the arrest for this non-conviction or no-charge incident and has not yet elapsed.","El plazo de 180 días corre desde el arresto por este incidente sin condena o sin cargos y todavía no ha transcurrido."],
  dismissal_wait:["The 180-day period runs from dismissal of the charges and has not yet elapsed.","El plazo de 180 días corre desde la desestimación de los cargos y todavía no ha transcurrido."],
  review:["The stated incident facts and 180-day period support review of a verified W.S. 7-13-1401 petition. Relief is not automatic. Further review is still needed before a packet can be prepared through this service. The court decides whether to grant relief.","Los hechos declarados del incidente y el plazo de 180 días permiten revisar una petición verificada conforme a W.S. 7-13-1401. La reparación no es automática. Aún se necesita una revisión adicional antes de que se pueda preparar un paquete mediante este servicio. El tribunal decide si concede la reparación."]
} as const;
type Decision={status:"missing"|"review"|"excluded"|"not_yet";code:keyof typeof WY_1401_COPY;ids:string[]};
export function wy1401Facts(a:Record<string,unknown>,today:string):Decision {
  const decision=(status:Decision["status"],code:Decision["code"],...ids:string[]):Decision=>({status,code,ids});
  const deferred=wy1401Text(a.wy_1401_listed_deferral);
  if(deferred==="yes")return decision("excluded","deferral","wy_1401_listed_deferral");
  if(deferred!=="no")return decision("missing","missing","wy_1401_listed_deferral");
  const pending=wy1401Text(a.pending_cases);
  if(pending==="Yes")return decision("not_yet","pending","pending_cases");
  if(pending!=="No")return decision("missing","missing","pending_cases");
  const result=wy1401Text(a.wy_1401_incident_result),outcome=wy1401Text(a.case_outcome);
  if(!["no_charges_filed","not_convicted","dismissed_by_prosecutor","dismissed_by_court","conviction"].includes(result??""))return decision("missing","missing","wy_1401_incident_result");
  if(result==="conviction")return decision("excluded","conviction","wy_1401_incident_result");
  const noCharge=outcome==="Arrest or citation with no charge filed";
  const broadDismissed=outcome==="Dismissed, no-billed, nolle prosequi, or not prosecuted";
  const program=outcome==="Diversion, deferred disposition, supervision, or similar program";
  // Grouped non-conviction wording needs the explicit incident fact. A known
  // conviction, unknown outcome, or contradictory no-charge answer cannot be
  // overwritten by a pathway hint or this supplemental answer.
  if((!noCharge&&!broadDismissed&&!program&&outcome!=="Acquitted") || noCharge&&result!=="no_charges_filed" || program&&result==="no_charges_filed" || outcome==="Acquitted"&&result!=="not_convicted")return decision("review","outcome","case_outcome","wy_1401_incident_result");
  const repository=wy1401Text(a.wy_1401_repository_record);
  if(repository==="no")return decision("review","repository","wy_1401_repository_record");
  if(repository!=="yes")return decision("missing","missing","wy_1401_repository_record");
  const dateId=dismissed(result)?"disposition_date":"arrest_date", date=wy1401Date(a[dateId]);
  if(!date || !wy1401Date(today) || date>today)return decision("missing","missing",dateId);
  if((Date.parse(today+"T00:00:00Z")-Date.parse(date+"T00:00:00Z"))/86400000<180)return decision("not_yet",dismissed(result)?"dismissal_wait":"arrest_wait",dateId);
  return decision("review","review");
}
export const WY_1401_IRRELEVANT_IDS=["financial_obligations","court_requirements_completed","sentence_completion_date","resolved_timing_bucket","special_preconditions_confirmed"];
export function wy1401QuestionApplies(profile:EngineProfile,route:string|null|undefined,a:Record<string,unknown>,id:string):boolean {
  const context=wy1401Context(profile,route,a);
  if(!context)return !WY_1401_NEW_IDS.includes(id);
  // The adopted complete incident predicate list, not its $0 filing fee, is
  // the basis for withholding generic conviction debt/completion gates.
  if(WY_1401_IRRELEVANT_IDS.includes(id))return false;
  if(!WY_1401_FACT_IDS.includes(id))return true;
  if(id==="wy_1401_listed_deferral")return true;
  if(wy1401Text(a.wy_1401_listed_deferral)==="yes")return false;
  if(id==="pending_cases")return true;
  if(wy1401Text(a.pending_cases)==="Yes")return false;
  if(id==="wy_1401_incident_result")return true;
  const result=wy1401Text(a.wy_1401_incident_result);
  if(result==="conviction")return false;
  if(id==="wy_1401_repository_record")return true;
  if(wy1401Text(a.wy_1401_repository_record)==="no")return false;
  return id==="disposition_date"?dismissed(result):["no_charges_filed","not_convicted"].includes(result??"");
}

/** A saved-date presentation state, not a second legal clock. A participant's
 * edit leaves the stale saved warning and is reassessed by the existing save. */
export function wy1401DateAnswerState(state:string,route:string|null|undefined,id:string,current:unknown,initial:unknown,
  sourceNeedsClarification:boolean|undefined,base:QuestionAnswerState):QuestionAnswerState {
  if(state!=="WY" || route!==WY_1401_ROUTE || !["arrest_date","disposition_date"].includes(id)
    || base!=="known_valid" || !sourceNeedsClarification)return base;
  return wy1401Text(current)===wy1401Text(initial)?"invalid":base;
}
