import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
export const IN_LIMITED_ROUTES = { juvenile: "IN:juvenile-allegation-expungement", nonconviction: "IN:non-conviction-arrest-or-criminal-charge-expungement" } as const;
export const IN_CURRENT_GUIDES = ["https://www.in.gov/courts/iocs/files/pubs-trial-court-courtmgmt-expungement-detailed.pdf","https://www.in.gov/courts/iocs/files/pubs-trial-court-courtmgmt-expungement-statutes.pdf"] as const;
type Facts = Readonly<Record<string, unknown>>;
export type IndianaLimitedDecision = { status: "unknown" | "excluded" | "not_yet" | "guidance" | "petition_candidate" | "needs_review"; reviewId: "R028" | "R029"; branchId: string; childRouteId: string; existingTrackId: string | null; missingFactIds: string[]; eligibleOn?: string; documentSet: readonly string[]; checkoutAllowed: false; filingReady: false; reason: string; reasonEs: string };
function text(raw: unknown): string | undefined { if(raw&&typeof raw==="object"&&!Array.isArray(raw)){if((raw as {unknown?:unknown}).unknown===true)return undefined;raw=(raw as {value?:unknown}).value;}return typeof raw==="string"&&raw.trim()&&!/^(unknown|i am not sure)$/i.test(raw.trim())?raw.trim():undefined; }
function day(raw: unknown): string | undefined {const s=text(raw);if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return undefined;const n=new Date(s+"T00:00:00Z");return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===s?s:undefined;}
function anniversary(s:string,years=1):string|undefined {const n=new Date(s+"T00:00:00Z"),month=n.getUTCMonth();n.setUTCFullYear(n.getUTCFullYear()+years);return n.getUTCMonth()===month?n.toISOString().slice(0,10):undefined;}
const addDays=(s:string,n:number)=>new Date(new Date(s+"T00:00:00Z").getTime()+n*86400000).toISOString().slice(0,10);
export const IN_SECTION1_DOCUMENTS=["Verified Section1 petition with each arrest/charge/allegation identified","CCA participant FACTS inserts and actual disposition schedule","Proposed order and FINDINGS; judicial findings/signatures remain blank","Appearance for self-represented filer","Notice excluding confidential information from public access and separately handled confidential identifiers","Service materials/instructions for county prosecutor; court performs statutory service, participant follows applicable form","Filing instructions: no Section1 court filing fee, records sealed/restricted not destroyed, later prosecution remains possible for never-charged arrest"] as const;
export const IN_JUVENILE31_DOCUMENTS=["Verified juvenile-record petition in juvenile court of county of original action under31-39-8-3","Case/allegation/adjudication schedule, later adjudications/convictions and all pending actions","Truthful factual statement addressing statutory juvenile-court factors","Proposed juvenile order with court findings left blank; use sealing rather than removal for serious-violent-felony finding","Notice/service to prosecutor for delinquency or DCS for CHINS;30day response subject to court order","Confidential identifier handling and local juvenile filing instructions; never persist or place full SSN in public/service copy"] as const;
const messages={
 unknown:["A material Indiana case fact remains unknown. Do not infer it from a topic or generic completion answer.","Falta un dato material del caso de Indiana. No lo deduzca de un tema o de una respuesta general de cumplimiento."],
 excluded:["This Section1 branch does not cover the established disposition or pending-charge facts. No ordinary paid packet opens.","Esta rama de la sección1 no cubre la resolución o los cargos pendientes establecidos. No se ofrece un paquete de pago ordinario."],
 automatic:["The ordinary supported branch is court-ordered automatic relief. Check the actual order and implementation; paying LegalEase is not required for it.","La rama ordinaria aplicable es el alivio automático ordenado por el tribunal. Compruebe la orden y su aplicación; no es necesario pagar a LegalEase para recibirlo."],
 waiting:["The required event-based period has not elapsed; a dismissal or generic sentence-completion answer does not change its starting event.","No ha transcurrido el plazo exigido desde el evento correspondiente; una desestimación o respuesta general sobre cumplimiento de sentencia no cambia su inicio."],
 petition:["The facts support preparation of this specific petition branch, subject to its separate product, current-form, review and release controls. This is not a finding or filing-ready packet.","Los datos permiten preparar esta rama específica de petición, sujeta a controles separados del producto, formulario vigente, revisión y autorización. No es una determinación judicial ni un paquete listo para presentar."],
 consent:["Written shorter-wait agreement and active-diversion authorization are separate prosecutor acts. Silence is not consent; obtain applicable authorization rather than invent it.","El acuerdo escrito para acortar el plazo y la autorización por desvío activo son actos distintos del fiscal. El silencio no es consentimiento; obtenga la autorización aplicable sin inventarla."],
 review:["This exact Indiana branch needs targeted review; the existing generic reconfirmation label is not a new statutory question.","Esta rama exacta de Indiana requiere revisión específica; la etiqueta general existente de reconfirmación no plantea por sí sola una nueva cuestión legal."]
} as const;
/** Case-specific branch only. Never grants parent-wide checkout, packet adoption or court findings. */
export function indianaLimitedRouteFacts(routeKey:string,facts:Facts,asOf:string):IndianaLimitedDecision|null {
 if(!Object.values(IN_LIMITED_ROUTES).some(x=>x===routeKey))return null;
 const reviewId=routeKey===IN_LIMITED_ROUTES.juvenile?"R028":"R029";
 const out=(status:IndianaLimitedDecision["status"],branchId:string,ids:string[]=[],eligibleOn?:string,track:string|null=null,message:keyof typeof messages="unknown",docs:readonly string[]=[]):IndianaLimitedDecision=>({status,reviewId,branchId,childRouteId:routeKey+"::"+branchId,existingTrackId:track,missingFactIds:ids,...(eligibleOn?{eligibleOn}:{}),documentSet:docs,checkoutAllowed:false,filingReady:false,reason:messages[message][0],reasonEs:messages[message][1]});
 if(!day(asOf))return out("unknown","unknown",["asOf"]);
 const validDate=(id:string)=>{const s=day(facts[id]);return s&&s<=asOf?s:undefined;};
 const juvenileType=text(facts.in_juvenile_record_type);
 if(reviewId==="R028"&&juvenileType!=="nonadjudicated_allegation"){
  if(!["delinquency_adjudication","chins"].includes(juvenileType??""))return out("unknown","juvenile31_scope",["in_juvenile_record_type"]);
  if(["implemented","entered"].includes(text(facts.in_juvenile_existing_order)??""))return out("guidance","juvenile31_existing_order",[],undefined,null,"automatic");
  const base=[...(!["none","entered"].includes(text(facts.in_juvenile_existing_order)??"")?["in_juvenile_existing_order"]:[])];
  if(juvenileType==="delinquency_adjudication"){
   const adjud=validDate("in_juvenile_adjudication_date"),felony=text(facts.in_juvenile_felony_if_adult),weapons=text(facts.in_juvenile_weapons_35_47_2_or_10),withheld=text(facts.in_juvenile_automatic_withheld);
   const missing=[...base,...(!adjud?["in_juvenile_adjudication_date"]:[]),...(!["yes","no"].includes(felony??"")?["in_juvenile_felony_if_adult"]:[]),...(!["yes","no"].includes(weapons??"")?["in_juvenile_weapons_35_47_2_or_10"]:[])];
   if(missing.length)return out("unknown","juvenile_automatic_check",missing);
   if(adjud!>"2021-06-30"&&felony==="no"&&weapons==="no"&&withheld!=="yes"){
    if(withheld!=="no")return out("unknown","juvenile_automatic_check",["in_juvenile_automatic_withheld"]);
    const dob=validDate("in_juvenile_date_of_birth"),discharge=validDate("in_juvenile_discharge_date");
    if(!dob||!discharge)return out("unknown","juvenile_automatic_check",[...(!dob?["in_juvenile_date_of_birth"]:[]),...(!discharge?["in_juvenile_discharge_date"]:[])]);
    if(dob>adjud!||discharge<adjud!)return out("unknown","juvenile_automatic_check",["in_juvenile_event_chronology"]);
    const birthday=anniversary(dob,19),after=anniversary(discharge);if(!birthday||!after)return out("unknown","juvenile_automatic_check",["leap_day_anniversary_review"]);
    const eligibleOn=[birthday,after].sort().at(-1)!;
    return out("guidance","juvenile31_automatic_3_5",[],eligibleOn,null,asOf<eligibleOn?"waiting":"automatic");
   }
  }
  const serious=juvenileType==="chins"?"no":text(facts.in_juvenile_serious_violent_felony_finding);
  const ids=[...base,...(!["yes","no"].includes(serious??"")?["in_juvenile_serious_violent_felony_finding"]:[]),...(["in_juvenile_original_county","in_juvenile_original_court","in_juvenile_cause_number","in_juvenile_date_of_birth","in_juvenile_allegations_and_adjudications","in_juvenile_charging_agency_if_known","in_juvenile_later_adjudications_and_convictions","in_juvenile_pending_actions","in_juvenile_services_and_current_status","in_juvenile_confidential_identifier_plan"].filter(id=>!text(facts[id])))];
  if(!validDate("in_juvenile_date_of_birth")&&!ids.includes("in_juvenile_date_of_birth"))ids.push("in_juvenile_date_of_birth");
  if(ids.length)return out("unknown","juvenile31_petition",ids);
  const born=validDate("in_juvenile_date_of_birth"),adjudicated=validDate("in_juvenile_adjudication_date"),discharged=validDate("in_juvenile_discharge_date");
  if(juvenileType==="delinquency_adjudication"&&adjudicated&&(born!>adjudicated||!!discharged&&discharged<adjudicated))return out("unknown","juvenile31_petition",["in_juvenile_event_chronology"]);
  return out("petition_candidate",serious==="yes"?"juvenile31_sealing_serious_violent":"juvenile31_removal_petition",[],undefined,null,"petition",IN_JUVENILE31_DOCUMENTS);
 }
 // Section1 includes non-adjudicated juvenile allegations, but never an adjudicated juvenile31 packet.
 const outcome=text(facts.in_section1_outcome),pending=text(facts.in_pending_criminal_charges),diversion=text(facts.in_active_pretrial_diversion);
 if(reviewId==="R028"&&outcome==="never_charged")return out("needs_review","juvenile_allegation_scope",[],undefined,null,"review");
 if(outcome==="convicted"||pending==="yes")return out("excluded","section1_excluded",[],undefined,null,"excluded");
 const common=[...(!["never_charged","dismissed_all","acquitted_all","no_true_finding","vacated_on_appeal","infraction_only","conviction_already_expunged","juvenile_one_year_no_disposition"].includes(outcome??"")?["in_section1_outcome"]:[]),...(pending!=="no"?["in_pending_criminal_charges"]:[]),...(!["yes","no"].includes(diversion??"")?["in_active_pretrial_diversion"]:[])];
 if(common.length)return out("unknown","section1_scope",common);
 if(diversion==="yes"&&text(facts.in_diversion_prosecutor_authorization)!=="yes")return out(text(facts.in_diversion_prosecutor_authorization)==="no"?"needs_review":"unknown","section1_diversion_authorization",["in_diversion_prosecutor_authorization"],undefined,null,"consent");
 if(outcome==="conviction_already_expunged")return out("needs_review","section1_previously_expunged_conviction",[],undefined,null,"review");
 const order=text(facts.in_section1_order_status),needed=text(facts.in_section1_application_needed);
 if(order==="implemented"||needed==="no")return out("guidance","section1_status_only",[],undefined,"in_auto_expungement","automatic");
 if(!["none","entered"].includes(order??"")||needed!=="yes")return out("unknown","section1_application_check",[...(!["none","entered"].includes(order??"")?["in_section1_order_status"]:[]),...(needed!=="yes"?["in_section1_application_needed"]:[])]);
 if(order==="entered")return out("guidance","section1_existing_order",[],undefined,"in_auto_expungement","automatic");
 const wasArrested=text(facts.in_was_arrested);
 if(!["yes","no"].includes(wasArrested??""))return out("unknown","section1_event_dates",["in_was_arrested"]);
 const noArrest=wasArrested==="no",arrest=noArrest?undefined:validDate("in_arrest_date"),charge=validDate("in_charge_or_allegation_date");
 if(!arrest&&!noArrest)return out("unknown","section1_event_dates",["in_arrest_date"]);
 if(outcome!=="never_charged"&&!charge)return out("unknown","section1_event_dates",["in_charge_or_allegation_date"]);
 if(outcome==="never_charged"&&!arrest)return out("unknown","section1_event_dates",["in_arrest_date"]);
 if(outcome==="juvenile_one_year_no_disposition"){
  if(reviewId!=="R028")return out("excluded","section1_wrong_juvenile_scope",[],undefined,null,"excluded");
  const inactive=text(facts.in_juvenile_state_not_prosecuting),waived=text(facts.in_juvenile_waived_to_adult);
  if(!["yes","no"].includes(inactive??"")||!["yes","no"].includes(waived??""))return out("unknown","section1_juvenile_nonprosecution",[...(!["yes","no"].includes(inactive??"")?["in_juvenile_state_not_prosecuting"]:[]),...(!["yes","no"].includes(waived??"")?["in_juvenile_waived_to_adult"]:[])]);
  const eligibleOn=anniversary(charge!);if(!eligibleOn)return out("unknown","section1_juvenile_nonprosecution",["leap_day_anniversary_review"]);
  if(inactive!=="yes"||waived!=="no")return out("needs_review","section1_juvenile_nonprosecution",[],eligibleOn,null,"review");
  return out("guidance","section1_juvenile_nonprosecution_automatic",[],eligibleOn,"in_auto_expungement",asOf<eligibleOn?"waiting":"automatic");
 }
 const disposition=outcome==="never_charged"?undefined:validDate("in_disposition_date");
 if(outcome!=="never_charged"&&(!disposition||disposition<charge!||!!arrest&&disposition<arrest))return out("unknown","section1_event_dates",["in_disposition_date"]);
 const automatic=charge&&charge>"2022-06-30"&&["dismissed_all","acquitted_all","no_true_finding","vacated_on_appeal"].includes(outcome!);
 if(automatic){
  const delayed=text(facts.in_automatic_implementation_delayed);
  if(delayed==="yes"||(["dismissed_all","acquitted_all","no_true_finding"].includes(outcome!)&&asOf<addDays(disposition!,60)))return out("guidance","section1_automatic_b",[],disposition?addDays(disposition,60):undefined,"in_auto_expungement","automatic");
  if(delayed!=="no")return out("unknown","section1_automatic_check",["in_automatic_implementation_delayed"]);
  // Only an actual unimplemented-order/application-needed case falls through to the retained petition branch.
 }
 let anchor=[arrest,charge].filter((x):x is string=>!!x).sort().at(-1)!;
 if(outcome==="vacated_on_appeal") {const final=validDate("in_vacatur_opinion_final_date");if(!final||final<disposition!)return out("unknown","section1_vacatur",["in_vacatur_opinion_final_date"]);anchor=final;}
 const oneYear=anniversary(anchor);if(!oneYear)return out("unknown","section1_event_dates",["leap_day_anniversary_review"]);
 const specialized=reviewId==="R029"&&outcome==="never_charged"&&arrest!>"2022-06-30";
 if(asOf<oneYear){
  const consent=text(facts.in_written_shorter_wait_agreement);
  if(consent==="yes") {const given=validDate("in_written_agreement_date"),early=day(facts.in_agreed_earliest_filing_date);if(!given||!early||early<given||early>=oneYear)return out("unknown","section1_d_written_agreement",[...(!given?["in_written_agreement_date"]:[]),...(!early||!!given&&early<given||!!early&&early>=oneYear?["in_agreed_earliest_filing_date"]:[])]);return out(asOf<early?"not_yet":"petition_candidate","section1_d_written_agreement",[],early,"in_section1_petition",asOf<early?"waiting":"petition",IN_SECTION1_DOCUMENTS);}
  if(consent!=="no")return out("unknown","section1_wait_or_consent",["in_written_shorter_wait_agreement"]);
  return out("not_yet",specialized?"section1_c_never_charged":"section1_d_general",[],oneYear,specialized?"in_arrest_no_charges":"in_section1_petition","waiting");
 }
 return out("petition_candidate",specialized?"section1_c_never_charged":outcome==="vacated_on_appeal"?"section1_d_final_vacatur":"section1_d_general",[],oneYear,specialized?"in_arrest_no_charges":"in_section1_petition","petition",IN_SECTION1_DOCUMENTS);
}

const yesNo: Array<[string,string,string]> = [["yes","Yes","Sí"],["no","No","No"]];
const q=(id:string,en:string,es:string,options?:Array<[string,string,string]>):PublicQuestion=>({id,stage:"packet_information",prompt:en,type:options?"single_choice":id.endsWith("_date")||id==="in_juvenile_date_of_birth"?"date_or_unknown":"text",required:true,lifecyclePhase:"prepay_route_splitter",...(options?{options:[...options.map(x=>x[0]),"unknown"],optionDisplay:Object.fromEntries([...options,["unknown","I am not sure","No sé"]].map(([value,label,esLabel])=>[value,{label,translations:{es:{label:esLabel}}}]))}:{}),translations:{es:{prompt:es}}});
export const IN_LIMITED_ROUTE_QUESTIONS:readonly PublicQuestion[]=[
 q("in_juvenile_record_type","Which juvenile records are involved?","¿Qué expedientes juveniles están involucrados?",[["delinquency_adjudication","A juvenile delinquency adjudication","Una adjudicación de delincuencia juvenil"],["chins","A child-in-need-of-services case","Un caso de menor necesitado de servicios"],["nonadjudicated_allegation","An allegation that did not result in delinquency adjudication","Una alegación que no resultó en adjudicación de delincuencia"]]),
 q("in_section1_outcome","What was the actual outcome of every charge or allegation in this record?","¿Cuál fue la resolución real de todos los cargos o alegaciones de este expediente?",[["never_charged","Arrested, but no charges were ever filed","Hubo arresto, pero nunca se presentaron cargos"],["dismissed_all","All charges or allegations were dismissed","Se desestimaron todos los cargos o alegaciones"],["acquitted_all","Acquitted of all criminal charges","Absuelto de todos los cargos penales"],["no_true_finding","All juvenile allegations found not true","Se determinó que todas las alegaciones juveniles no eran ciertas"],["vacated_on_appeal","Conviction or adjudication vacated on appeal","Condena o adjudicación anulada en apelación"],["infraction_only","Only an infraction adjudication resulted","Solo resultó una adjudicación por infracción"],["conviction_already_expunged","The conviction was already expunged","La condena ya fue eliminada"],["juvenile_one_year_no_disposition","Juvenile allegation remains without a disposition","La alegación juvenil sigue sin resolución"],["convicted","A conviction remains","Persiste una condena"]]),
 q("in_pending_criminal_charges","Are any criminal charges pending against you anywhere?","¿Tiene cargos penales pendientes en algún lugar?",yesNo),
 q("in_active_pretrial_diversion","Are you currently participating in pretrial diversion?","¿Participa actualmente en un programa de desvío previo al juicio?",yesNo),
 q("in_diversion_prosecutor_authorization","Has the prosecuting attorney specifically authorized this petition while diversion is active?","¿El fiscal autorizó específicamente esta petición mientras el desvío sigue activo?",yesNo),
 q("in_section1_order_status","What do the court records show about an expungement order for this case?","¿Qué indican los registros judiciales sobre una orden de eliminación de este caso?",[["none","No order has been entered","No se ha dictado una orden"],["entered","An order was entered but is not implemented","Se dictó una orden, pero no se ha aplicado"],["implemented","The order has been implemented","La orden se ha aplicado"]]),
 q("in_section1_application_needed","Do the records still lack a completed expungement order, and are you requesting an application rather than status information?","¿Aún falta en el expediente una orden de eliminación aplicada y solicita una petición en vez de información sobre su estado?",yesNo),
 q("in_was_arrested","Were you actually arrested for this matter?","¿Fue arrestado realmente por este asunto?",yesNo),
 q("in_arrest_date","On what exact date were you arrested?","¿En qué fecha exacta fue arrestado?"),
 q("in_charge_or_allegation_date","On what exact date was the criminal charge or juvenile allegation filed?","¿En qué fecha exacta se presentó el cargo penal o la alegación juvenil?"),
 q("in_disposition_date","On what exact date did the dismissal, acquittal, no-true finding or vacatur occur?","¿En qué fecha exacta ocurrió la desestimación, absolución, determinación de alegación no cierta o anulación?"),
 q("in_vacatur_opinion_final_date","On what date did the appellate opinion vacating the conviction or adjudication become final?","¿En qué fecha quedó firme la opinión de apelación que anuló la condena o adjudicación?"),
 q("in_automatic_implementation_delayed","Has the court ordered delayed implementation of automatic expungement on the prosecutor's motion?","¿El tribunal ordenó retrasar la aplicación de la eliminación automática a petición del fiscal?",yesNo),
 q("in_written_shorter_wait_agreement","Has the prosecuting attorney agreed in writing to a shorter waiting period for this petition? Silence or diversion permission alone is not that agreement.","¿El fiscal acordó por escrito un plazo de espera menor para esta petición? El silencio o la autorización de desvío por sí solos no son ese acuerdo.",yesNo),
 q("in_written_agreement_date","On what date was the written shorter-wait agreement given?","¿En qué fecha se otorgó el acuerdo escrito para acortar el plazo?"),
 q("in_agreed_earliest_filing_date","What earliest filing date does that written agreement authorize?","¿Qué fecha de presentación más temprana autoriza ese acuerdo escrito?"),
 q("in_juvenile_existing_order","What do the juvenile court records show about an expungement or sealing order?","¿Qué indican los registros del tribunal juvenil sobre una orden de eliminación o sellado?",[["none","No order has been entered","No se ha dictado una orden"],["entered","An order has been entered","Se ha dictado una orden"],["implemented","An order has been implemented","Se ha aplicado una orden"]]),
 q("in_juvenile_adjudication_date","On what date was the delinquency adjudication entered?","¿En qué fecha se dictó la adjudicación de delincuencia?"),
 q("in_juvenile_felony_if_adult","Was the adjudicated act an offense that would be a felony if committed by an adult?","¿El acto adjudicado sería un delito grave si lo hubiera cometido un adulto?",yesNo),
 q("in_juvenile_weapons_35_47_2_or_10","Was the adjudicated act a firearm offense under Indiana Code35-47-2 or35-47-10?","¿Fue el acto adjudicado un delito de armas conforme al Código de Indiana35-47-2 o35-47-10?",yesNo),
 q("in_juvenile_automatic_withheld","Has the juvenile court found that automatic expungement would not serve the interests of justice?","¿El tribunal juvenil determinó que la eliminación automática no serviría a los intereses de la justicia?",yesNo),
 q("in_juvenile_date_of_birth","What is the person's exact date of birth?","¿Cuál es la fecha de nacimiento exacta de la persona?"),
 q("in_juvenile_discharge_date","On what date did the juvenile court discharge the child under Indiana Code31-37-20-7?","¿En qué fecha dio de alta el tribunal juvenil al menor conforme al Código de Indiana31-37-20-7?"),
 q("in_juvenile_serious_violent_felony_finding","Does the actual court finding identify an act that would be a serious violent felony under Indiana Code35-31.5-2-294? Keep uncertainty unknown.","¿La determinación judicial real identifica un acto que sería un delito grave violento de los definidos en el Código de Indiana35-31.5-2-294? Si no lo sabe, indíquelo.",yesNo),
 q("in_juvenile_original_county","In which county was the original juvenile action filed?","¿En qué condado se presentó la acción juvenil original?"),
 q("in_juvenile_original_court","Which juvenile court handled that original action?","¿Qué tribunal juvenil tramitó esa acción original?"),
 q("in_juvenile_cause_number","What is the original juvenile case or cause number?","¿Cuál es el número del caso o causa juvenil original?"),
 q("in_juvenile_allegations_and_adjudications","Identify the actual allegations, disposition and adjudication date if any. Do not invent a finding.","Identifique las alegaciones reales, resolución y fecha de adjudicación, si la hubo. No invente una determinación."),
 q("in_juvenile_charging_agency_if_known","Which agency employed the charging officer, if known? State that it is unknown if you do not know.","¿Qué agencia empleaba al agente que presentó los cargos, si lo sabe? Indique que lo desconoce si no lo sabe."),
 q("in_juvenile_later_adjudications_and_convictions","List all later juvenile/CHINS adjudications and criminal convictions, or state none if that is true.","Enumere todas las adjudicaciones juveniles o de servicios posteriores y condenas penales, o indique ninguna si es cierto."),
 q("in_juvenile_pending_actions","List all pending delinquency, CHINS and criminal cases, or state none if that is true.","Enumere todos los casos pendientes de delincuencia, servicios y penales, o indique ninguno si es cierto."),
 q("in_juvenile_services_and_current_status","Describe participation in services, later court/law-enforcement contact, current situation and why removal is requested.","Describa la participación en servicios, contacto posterior con tribunales o policía, situación actual y motivo de la solicitud."),
 q("in_juvenile_confidential_identifier_plan","How will required identifiers be supplied through the court's confidential process without placing a full Social Security number in public or service copies? Do not enter the full number here.","¿Cómo proporcionará los identificadores exigidos mediante el proceso confidencial del tribunal sin incluir el número completo de Seguro Social en copias públicas o de notificación? No escriba aquí el número completo."),
 q("in_juvenile_state_not_prosecuting","Is the state no longer actively prosecuting the unresolved juvenile allegations?","¿El estado dejó de procesar activamente las alegaciones juveniles sin resolver?",yesNo),
 q("in_juvenile_waived_to_adult","Has this juvenile matter been waived to adult court?","¿Se remitió este asunto juvenil al tribunal de adultos?",yesNo)
];
export function indianaLimitedRouteQuestionApplies(routeKey:string,id:string,facts:Facts):boolean {
 if(!Object.values(IN_LIMITED_ROUTES).some(x=>x===routeKey)||!IN_LIMITED_ROUTE_QUESTIONS.some(q=>q.id===id))return false;
 const juvenile=routeKey===IN_LIMITED_ROUTES.juvenile,type=text(facts.in_juvenile_record_type);
 if(id==="in_juvenile_record_type")return juvenile;
 if(juvenile&&!type)return false;
 const juvenile31=juvenile&&["chins","delinquency_adjudication"].includes(type??"");
 const section1=!juvenile||type==="nonadjudicated_allegation";
 const juvenileSection1=["in_juvenile_state_not_prosecuting","in_juvenile_waived_to_adult"];
 if(juvenileSection1.includes(id))return section1&&juvenile&&text(facts.in_section1_outcome)==="juvenile_one_year_no_disposition";
 if(id.startsWith("in_juvenile_"))return juvenile31&&(type!=="chins"||!["in_juvenile_adjudication_date","in_juvenile_felony_if_adult","in_juvenile_weapons_35_47_2_or_10","in_juvenile_automatic_withheld","in_juvenile_discharge_date","in_juvenile_serious_violent_felony_finding"].includes(id));
 if(!section1)return false;
 if(id==="in_diversion_prosecutor_authorization")return text(facts.in_active_pretrial_diversion)==="yes";
 if(id==="in_arrest_date")return text(facts.in_was_arrested)==="yes";
 if(id==="in_charge_or_allegation_date")return text(facts.in_section1_outcome)!=="never_charged";
 if(id==="in_disposition_date")return !["never_charged","juvenile_one_year_no_disposition"].includes(text(facts.in_section1_outcome)??"");
 if(id==="in_vacatur_opinion_final_date")return text(facts.in_section1_outcome)==="vacated_on_appeal";
 if(id==="in_automatic_implementation_delayed")return ["dismissed_all","acquitted_all","no_true_finding","vacated_on_appeal"].includes(text(facts.in_section1_outcome)??"");
 if(["in_written_agreement_date","in_agreed_earliest_filing_date"].includes(id))return text(facts.in_written_shorter_wait_agreement)==="yes";
 return true;
}
export function indianaLimitedRouteQuestions(routeKey:string,facts:Facts={}) {return IN_LIMITED_ROUTE_QUESTIONS.filter(q=>indianaLimitedRouteQuestionApplies(routeKey,q.id,facts));}
