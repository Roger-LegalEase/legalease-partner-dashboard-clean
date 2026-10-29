import {adaptMarylandCannabisStructuredFacts,marylandCannabisStructuredQuestions} from "@/lib/rcap-engine/maryland-cannabis-structured-intake";
import { validateMdCannabis } from "./maryland-cannabis-rules.mjs";

export type MarylandCannabisResult = {
  reviewId: string; routeId: string; branchId: string;
  status: "qualifying" | "guidance" | "excluded" | "unknown" | "not_yet" | "attorney_review";
  missingFactIds: string[]; documentIds: string[]; externalDocumentIds: string[];
  reason: string; eligibleOn?: string;
};

export const MD_CANNABIS_ROUTE = "MD:cannabis-specific-expungement";
const SOURCE_ROUTE = "obligation:track-pathway:MD:md_cannabis_petition:cannabis-specific-expungement";
const CHOICE_LABELS: Record<string, readonly [string, string]> = {"alaska": ["Alaska", "Alaska"], "other_state_or_federal": ["Another state or the federal government", "Otro estado o el gobierno federal"], "unknown": ["I am not sure", "No estoy seguro/a"], "alaska_dps": ["Alaska Department of Public Safety (DPS)", "Departamento de Seguridad Pública de Alaska (DPS)"], "other_agency": ["Another record-holding agency", "Otra agencia que mantiene el expediente"], "initial_request": ["This is my initial request", "Esta es mi solicitud inicial"], "denied_or_contested": ["The request was denied or contested", "La solicitud fue denegada o cuestionada"], "mistaken_identity": ["Mistaken identity", "Identidad equivocada"], "false_accusation": ["False accusation", "Acusación falsa"], "dismissal_only": ["Only a dismissal; neither reason established", "Solo una desestimación; ninguna de las dos razones está establecida"], "pending": ["Charges are pending", "Los cargos están pendientes"], "dismissed": ["The charges were dismissed", "Se desestimaron los cargos"], "acquitted": ["I was acquitted", "Fui absuelto/a"], "conviction_reversed_or_vacated": ["The conviction was reversed or vacated", "La condena fue revocada o anulada"], "pardoned": ["I received a Governor’s pardon", "Recibí un indulto del gobernador"], "convicted_without_reversal_or_pardon": ["Convicted; no reversal, vacatur or pardon", "Condenado/a; sin revocación, anulación ni indulto"], "not_obtained": ["I have not obtained the statements yet", "Todavía no he obtenido las declaraciones"], "available": ["The actual statements are available", "Las declaraciones reales están disponibles"], "declined": ["A required official declined verification", "Un funcionario requerido se negó a verificar"], "453_336_3_conviction": ["Conviction and sentence under NRS 453.336(3)", "Condena y sentencia conforme a NRS 453.336(3)"], "453_3363_discharge": ["Discharge and dismissal under NRS 453.3363", "Alta y desestimación conforme a NRS 453.3363"], "other": ["A different category", "Una categoría diferente"], "no_longer_crime": ["The underlying conduct is no longer a crime", "La conducta ya no es un delito"], "possession": ["Cannabis possession", "Posesión de cannabis"], "pwid": ["Possession with intent to distribute cannabis", "Posesión con intención de distribuir cannabis"], "CR 5-601": ["Cannabis possession — Criminal Law § 5-601", "Posesión de cannabis — Derecho Penal, § 5-601"], "CR 5-602": ["Cannabis with intent to distribute — Criminal Law § 5-602", "Cannabis con intención de distribuir — Derecho Penal, § 5-602"], "guilty": ["Convicted and sentenced (guilty)", "Condenado/a y sentenciado/a (culpable)"], "not_guilty": ["Not guilty", "No culpable"], "pbj": ["Probation before judgment (PBJ)", "Libertad a prueba antes de sentencia (PBJ)"], "shown": ["The case appeared", "El caso apareció"], "not_shown": ["The case did not appear", "El caso no apareció"], "exists_unexpunged": ["The actual court record still needs expungement", "Todavía se necesita eliminar el expediente judicial real"], "already_expunged": ["The court record has already been expunged", "El expediente judicial ya se eliminó"], "not_ordered": ["Restitution was not ordered", "No se ordenó una restitución"], "paid": ["Pay the separate court fee", "Pagar la tasa judicial por separado"], "unable_to_pay": ["I cannot pay the restitution", "No puedo pagar la restitución"], "disputed": ["Restitution is disputed", "Se disputa la restitución"], "district": ["District Court", "Tribunal de Distrito"], "circuit": ["Circuit Court", "Tribunal de Circuito"], "none": ["No court transfer", "No hubo transferencia entre tribunales"], "adult": ["Transferred between adult courts", "Transferido entre tribunales de adultos"], "juvenile": ["Transferred to juvenile court", "Transferido al tribunal de menores"], "waiver": ["Request a court fee waiver", "Solicitar una exención de la tasa judicial"]};
const choices = (id: string, options: string[], en: string, es: string) => ({ id, type: "single_choice", options,
  optionsEn: options.map(option => id === "md_cannabis_restitution_status" && option === "paid" ? "Restitution is paid" : CHOICE_LABELS[option]?.[0] ?? option),
  optionsEs: options.map(option => id === "md_cannabis_restitution_status" && option === "paid" ? "La restitución está pagada" : CHOICE_LABELS[option]?.[1] ?? option), en, es });
const yesNo = (id: string, en: string, es: string) => ({ id, type: "yes_no_unknown", en, es });
const entry = (id: string, type: string, en: string, es: string) => ({ id, type, en, es });
export const MD_CANNABIS_QUESTIONS = [
  choices("md_cannabis_basis", ["no_longer_crime", "possession", "pwid", "other", "unknown"], "Which cannabis conviction is this: conduct no longer a crime, possession under section 5-601, or possession with intent to distribute under section 5-602?", "¿Qué condena por cannabis es: una conducta que ya no es delito, posesión conforme a la sección 5-601, o posesión con intención de distribuir conforme a la sección 5-602?"),
  entry("md_cannabis_charge_id", "text", "What is the recorded charge number for the cannabis conviction?", "¿Cuál es el número de cargo registrado de la condena por cannabis?"),
  choices("md_cannabis_charge_statute", ["CR 5-601", "CR 5-602", "other", "unknown"], "Which statute is listed for that conviction?", "¿Qué disposición legal figura para esa condena?"),
  choices("md_cannabis_charge_disposition", ["guilty", "not_guilty", "dismissed", "pbj", "unknown"], "What is the actual recorded disposition of that charge?", "¿Cuál es el resultado real registrado de ese cargo?"),
  entry("md_cannabis_conviction_date", "date", "On what date was the cannabis conviction entered?", "¿En qué fecha se registró la condena por cannabis?"),
  yesNo("md_cannabis_only_charge", "Was this the only charge in the incident? List any other charge in the matter's charge inventory.", "¿Fue este el único cargo del incidente? Incluya cualquier otro cargo en el inventario de cargos del caso."),
  yesNo("md_cannabis_all_charges_listed", "Have all charges from the same incident been identified?", "¿Se han identificado todos los cargos del mismo incidente?"),
  yesNo("md_cannabis_pending_proceeding", "Are you a defendant in a pending criminal proceeding?", "¿Es usted acusado en un proceso penal pendiente?"),
  yesNo("md_cannabis_recital_confirmed", "Have you confirmed that the selected cannabis conviction description is true for your actual case?", "¿Ha confirmado que la descripción seleccionada de la condena por cannabis corresponde a su caso real?"),
  yesNo("md_cannabis_conduct_no_longer_crime", "If using the no-longer-a-crime ground, is the underlying conduct no longer a crime?", "Si utiliza la razón de que la conducta ya no es delito, ¿ha dejado esa conducta de ser un delito?"),
  yesNo("md_cannabis_sentence_complete", "Have you completed the sentence, including probation, parole and mandatory supervision?", "¿Ha cumplido la sentencia, incluida la libertad a prueba, la libertad condicional y la supervisión obligatoria?"),
  entry("md_cannabis_completion_date", "date", "What was the actual date all sentence and supervision terms ended?", "¿Cuál fue la fecha real en que terminaron todas las condiciones de la sentencia y la supervisión?"),
  yesNo("md_cannabis_new_conviction_during_wait", "For possession with intent to distribute, were you convicted of a new crime during the waiting period?", "Para la posesión con intención de distribuir, ¿fue condenado por un nuevo delito durante el período de espera?"),
  yesNo("md_cannabis_new_conviction_now_eligible", "If there was a new conviction, has it now become eligible for expungement?", "Si hubo una nueva condena, ¿ya reúne los requisitos para su eliminación?"),
  yesNo("md_cannabis_case_search_checked", "Have you checked Maryland Judiciary Case Search? A missing search result does not prove that the court record was expunged.", "¿Ha consultado Maryland Judiciary Case Search? La ausencia de un resultado no demuestra que se haya eliminado el expediente judicial."),
  choices("md_cannabis_case_search_result", ["shown", "not_shown", "unknown"], "Did the case appear in that search?", "¿Apareció el caso en esa búsqueda?"),
  choices("md_cannabis_court_record_status", ["exists_unexpunged", "already_expunged", "unknown"], "Does the actual court record still need expungement, or has the court already expunged it?", "¿Todavía se necesita eliminar el expediente judicial real, o el tribunal ya lo eliminó?"),
  entry("md_cannabis_record_reference", "text", "Identify the actual docket information or clerk confirmation used to establish the court record's status. Do not invent a contact.", "Identifique la información real del expediente o la confirmación del secretario utilizada para establecer su estado. No invente un contacto."),
  choices("md_cannabis_restitution_status", ["not_ordered", "paid", "unable_to_pay", "disputed", "unknown"], "Was restitution ordered, and is it paid, unaffordable, or disputed?", "¿Se ordenó una restitución y está pagada, no puede pagarla o se disputa?"),
  yesNo("md_cannabis_restitution_inability_asserted", "If you cannot pay restitution, are you asking the court to consider that inability?", "Si no puede pagar la restitución, ¿pide al tribunal que tenga en cuenta esa imposibilidad?"),
  yesNo("md_cannabis_restitution_documentation", "If restitution was ordered, is the actual payment or inability-to-pay information available?", "Si se ordenó una restitución, ¿está disponible la información real sobre el pago o la imposibilidad de pagarlo?"),
  choices("md_cannabis_court_level", ["district", "circuit", "unknown"], "Is the proper filing court a District Court or Circuit Court?", "¿Es el tribunal correspondiente un tribunal de distrito o de circuito?"),
  yesNo("md_cannabis_filing_court_confirmed", "Have you confirmed the proper filing court, including any adult transfer?", "¿Ha confirmado el tribunal correcto para presentar la solicitud, incluida cualquier transferencia entre tribunales de adultos?"),
  choices("md_cannabis_court_transfer", ["none", "adult", "juvenile", "unknown"], "Was the case transferred to another court?", "¿Se transfirió el caso a otro tribunal?"),
  yesNo("md_cannabis_case_appealed", "Was the case appealed? An appealed case requires confirmation of the appellate filing court.", "¿Se apeló el caso? Un caso apelado requiere confirmar el tribunal de apelación en el que debe presentarse la solicitud."),
  yesNo("md_cannabis_appellate_court_confirmed", "If appealed, is this the proper appellate filing court or a court to which the matter was remanded?", "Si se apeló, ¿es este el tribunal de apelación correcto o el tribunal al que se devolvió el asunto?"),
  yesNo("md_cannabis_contested", "Has an actual objection been filed or a contested hearing been scheduled?", "¿Se ha presentado una objeción real o se ha programado una audiencia contenciosa?"),
  yesNo("md_cannabis_prepaid_waiver_requested", "If requesting a court fee waiver, do you expressly request waiver of prepaid court costs?", "Si solicita una exención de la tasa judicial, ¿solicita expresamente que se eximan los costos judiciales anticipados?"),
  yesNo("md_cannabis_unable_to_prepay", "If requesting a waiver, are you unable to prepay the court costs?", "Si solicita una exención, ¿no puede pagar los costos judiciales por adelantado?"),
  yesNo("md_cannabis_final_costs_requested", "Do you also request a final waiver of open court costs? This is separate from the prepaid-cost request.", "¿También solicita una exención final de los costos judiciales pendientes? Es independiente de la solicitud para costos anticipados."),
  yesNo("md_cannabis_no_material_change", "If requesting final costs relief, do you anticipate no material change in your financial condition?", "Si solicita una exención final, ¿prevé que no habrá cambios importantes en su situación económica?"),
  yesNo("md_cannabis_restricted_case_type", "Is this an adoption, guardianship, juvenile or other separately restricted case type? The financial document is treated separately.", "¿Es este un caso de adopción, tutela, menores u otra categoría restringida por separado? El documento financiero se trata por separado."),
  choices("md_cannabis_fee_choice", ["paid", "waiver", "unknown"], "Will you pay the separate court filing fee or request a waiver? Any LegalEase software charge is separate.", "¿Pagará la tasa judicial por separado o solicitará una exención? Cualquier cargo de software de LegalEase es independiente.")
];

type Facts = Readonly<Record<string, unknown>>;
function value(x: unknown): unknown { if(x && typeof x === "object" && !Array.isArray(x) && (x as {unknown?: unknown}).unknown===true)return undefined; return x && typeof x === "object" && !Array.isArray(x) && "value" in x ? (x as {value: unknown}).value : x; }
function text(x: unknown) { const v=value(x); return typeof v === "string" ? v.trim() : ""; }
function bool(x: unknown): boolean | undefined { const v=value(x),answer=text(x).toLowerCase(); if(v===true||answer==="yes"||answer==="true")return true;if(v===false||answer==="no"||answer==="false")return false;return undefined; }

/** The existing Maryland branch conditions, isolated from the multi-route adapter. */
function questionApplies(id: string, facts: Facts): boolean {
  const basis=text(facts.md_cannabis_basis);
  if(id==="md_cannabis_conduct_no_longer_crime")return basis==="no_longer_crime";
  if(["md_cannabis_sentence_complete","md_cannabis_completion_date"].includes(id))return basis==="possession"||basis==="pwid";
  if(id==="md_cannabis_new_conviction_during_wait")return basis==="pwid";
  if(id==="md_cannabis_new_conviction_now_eligible")return basis==="pwid"&&bool(facts.md_cannabis_new_conviction_during_wait)===true;
  if(id==="md_cannabis_restitution_inability_asserted")return text(facts.md_cannabis_restitution_status)==="unable_to_pay";
  if(id==="md_cannabis_restitution_documentation")return ["paid","unable_to_pay"].includes(text(facts.md_cannabis_restitution_status));
  if(["md_cannabis_prepaid_waiver_requested","md_cannabis_unable_to_prepay","md_cannabis_final_costs_requested","md_cannabis_restricted_case_type"].includes(id))return text(facts.md_cannabis_fee_choice)==="waiver";
  if(id==="md_cannabis_no_material_change")return text(facts.md_cannabis_fee_choice)==="waiver"&&bool(facts.md_cannabis_final_costs_requested)===true;
  if(id==="md_cannabis_appellate_court_confirmed")return bool(facts.md_cannabis_case_appealed)===true;
  return true;
}

/** Active questions collect facts; includeInactive declares only the bounded retention vocabulary. */
export function marylandCannabisQuestions(facts: Facts, includeInactive=false) {
  return [...MD_CANNABIS_QUESTIONS.filter(q=>includeInactive||questionApplies(q.id,facts)),
    ...marylandCannabisStructuredQuestions(facts,includeInactive)];
}
export function marylandCannabisFactIds(facts: Facts, includeInactive=false): string[] {
  return marylandCannabisQuestions(facts,includeInactive).map(q=>q.id);
}

/** Adapt protected matter facts to the already-adopted 072D predicate, rather than maintain another legal engine. */
export function evaluateMarylandCannabis(answers: Facts, asOf: Date | string): MarylandCannabisResult {
  const structured=adaptMarylandCannabisStructuredFacts(answers),facts=structured.facts;
  const result=(status: MarylandCannabisResult["status"],reason: string,missingFactIds: string[]=[],documentIds: string[]=[]): MarylandCannabisResult=>({reviewId:"R041",routeId:MD_CANNABIS_ROUTE,branchId:text(facts.md_cannabis_basis)||"unknown",status,reason,missingFactIds,documentIds,externalDocumentIds:[]});
  const clock=asOf instanceof Date&&Number.isFinite(asOf.getTime())?asOf.toISOString().slice(0,10):asOf;
  if(text(facts.md_cannabis_court_record_status)==="already_expunged")return result("guidance","The actual court record is already expunged. Do not purchase a duplicate petition; repository-only removal and Case Search absence are different facts.");
  if(text(facts.md_cannabis_basis)==="other")return result("excluded","A different cannabis procedure cannot use this three-ground conviction petition.");
  if(bool(facts.md_cannabis_contested)===true)return result("attorney_review","An actual objection or contested hearing requires the separately supported assistance workflow.");
  if(structured.missingFactIds.length)return result("unknown","Complete the actual other-charge or requested-waiver fields; unknown values never become qualifying answers or zero amounts.",structured.missingFactIds);
  const required=["md_cannabis_basis","md_cannabis_charge_id","md_cannabis_charge_statute","md_cannabis_charge_disposition","md_cannabis_conviction_date","md_cannabis_court_record_status","md_cannabis_case_search_result","md_cannabis_record_reference","md_cannabis_restitution_status","md_cannabis_court_level","md_cannabis_court_transfer","md_cannabis_fee_choice"];
  const missing=required.filter(id=>!text(facts[id])||text(facts[id])==="unknown");
  for(const id of ["md_cannabis_only_charge","md_cannabis_all_charges_listed","md_cannabis_pending_proceeding","md_cannabis_recital_confirmed","md_cannabis_case_search_checked","md_cannabis_filing_court_confirmed","md_cannabis_case_appealed","md_cannabis_contested"])if(bool(facts[id])===undefined)missing.push(id);
  if(missing.length)return result("unknown","Resolve the actual conviction, complete charge inventory, court status and filing choices before selecting any recital.",missing);
  if(text(facts.md_cannabis_fee_choice)==="waiver"){
    const waiverMissing=["md_cannabis_prepaid_waiver_requested","md_cannabis_unable_to_prepay","md_cannabis_final_costs_requested","md_cannabis_restricted_case_type"].filter(id=>bool(facts[id])===undefined);
    if(bool(facts.md_cannabis_final_costs_requested)===true&&bool(facts.md_cannabis_no_material_change)===undefined)waiverMissing.push("md_cannabis_no_material_change");
    const financial=value(facts.md_cannabis_financial_inventory);
    if(!financial||typeof financial!=="object"||Array.isArray(financial))waiverMissing.push("md_cannabis_financial_inventory");
    else for(const key of ["householdSize","period","totalCents","income","property","debts","incomeComplete","propertyComplete","debtsComplete","excludedHomeVehiclePersonalItems","snapExcluded"]){const v=(financial as Record<string,unknown>)[key];if(v===undefined||v===null||v==="")waiverMissing.push("md_cannabis_financial_inventory."+key);}
    if(waiverMissing.length)return result("unknown","The express waiver request requires complete actual financial facts; missing inventories never become zeros or NONE.",waiverMissing);
  }
  const only=bool(facts.md_cannabis_only_charge);
  if(only===false&&text(facts.md_cannabis_basis)==="pwid")return result("attorney_review","A mixed PWID incident requires a supported server determination of the other charges and exact required components. A participant answer about unit eligibility cannot authorize this branch. The source-native adapter remains separate from ordinary applicant answers.");
  const inventory=value(facts.md_cannabis_charge_inventory);
  if(!only&&!Array.isArray(inventory))return result("unknown","Other incident charges require the actual structured charge inventory; no negative answer or unit eligibility is inferred.",["md_cannabis_charge_inventory"]);
  const basis=text(facts.md_cannabis_basis),statute=text(facts.md_cannabis_charge_statute),convictionDate=text(facts.md_cannabis_conviction_date);
  const charges=only?[{id:text(facts.md_cannabis_charge_id),description:text(facts.charge)||"Cannabis charge",statute,substance:"cannabis",disposition:text(facts.md_cannabis_charge_disposition),convictionDate,basis,requested:true}]:inventory;
  const f={isSyntheticFixture:false,asOf:clock,routeKey:SOURCE_ROUTE,person:{},court:{level:text(facts.md_cannabis_court_level),transfer:text(facts.md_cannabis_court_transfer),venueConfirmed:bool(facts.md_cannabis_filing_court_confirmed),receivingCourtConfirmed:bool(facts.md_cannabis_filing_court_confirmed),appealed:bool(facts.md_cannabis_case_appealed),isAppellateFilingCourt:bool(facts.md_cannabis_appellate_court_confirmed),restrictedCaseType:bool(facts.md_cannabis_restricted_case_type)},case:{basis,convictionDate,completionDate:text(facts.md_cannabis_completion_date)||undefined,otherOffenses:!only,charges,restitution:{status:text(facts.md_cannabis_restitution_status),inabilityAsserted:bool(facts.md_cannabis_restitution_inability_asserted),documentationAvailable:bool(facts.md_cannabis_restitution_documentation)}},records:{caseSearchChecked:bool(facts.md_cannabis_case_search_checked),caseSearchResult:text(facts.md_cannabis_case_search_result),courtRecordStatus:text(facts.md_cannabis_court_record_status),confirmationReference:text(facts.md_cannabis_record_reference)},confirmations:{allIncidentChargesListed:bool(facts.md_cannabis_all_charges_listed),pendingCriminalProceeding:bool(facts.md_cannabis_pending_proceeding),selectedRecitalTrue:bool(facts.md_cannabis_recital_confirmed),conductNoLongerCrime:bool(facts.md_cannabis_conduct_no_longer_crime),sentenceComplete:bool(facts.md_cannabis_sentence_complete),unitEligible:only===true?true:bool(facts.md_cannabis_unit_eligible),newCrimeDuringWaiting:bool(facts.md_cannabis_new_conviction_during_wait),newConvictionNowEligible:bool(facts.md_cannabis_new_conviction_now_eligible),actualObjection:false,hearingScheduled:false},options:{feeTreatment:text(facts.md_cannabis_fee_choice),prepaidWaiverRequested:bool(facts.md_cannabis_prepaid_waiver_requested),unableToPrepay:bool(facts.md_cannabis_unable_to_prepay),finalOpenCostsRequested:bool(facts.md_cannabis_final_costs_requested),noMaterialChangeAnticipated:bool(facts.md_cannabis_no_material_change)},financial:value(facts.md_cannabis_financial_inventory)};
  try {
    const evaluated=validateMdCannabis(f);
    if(evaluated.missing.length)return result("unknown","Required actual case or requested-waiver facts remain unresolved.",evaluated.missing.map(m=>({"case.completionDate":"md_cannabis_completion_date","confirmations.sentenceComplete":"md_cannabis_sentence_complete","confirmations.conductNoLongerCrime":"md_cannabis_conduct_no_longer_crime","confirmations.newCrimeDuringWaiting":"md_cannabis_new_conviction_during_wait","confirmations.newConvictionNowEligible":"md_cannabis_new_conviction_now_eligible","confirmations.unitEligible":"md_cannabis_unit_eligible","case.restitution.documentationAvailable":"md_cannabis_restitution_documentation","case.restitution.inabilityAsserted":"md_cannabis_restitution_inability_asserted","court.isAppellateFilingCourt":"md_cannabis_appellate_court_confirmed"}[m.factId]??m.factId)));
    if(!evaluated.mayMarkBasis)return result("unknown","The selected conviction recital cannot yet be verified.");
    const docs=["CC-DC-CR-072D",...(f.options.feeTreatment==="waiver"?["CC-DC-089","MDJ-008"]:[]),"participant_instructions"];
    return {...result("qualifying","The exact 072D cannabis conviction branch is supported. The court serves required recipients and enters its own order. The optional software charge is separate from the court's $30 eligible-guilty fee; an express waiver request selects the actual fee-waiver documents.",[],docs),...(evaluated.earliest?{eligibleOn:evaluated.earliest}:{})};
  } catch(error) {
    const message=error instanceof Error?error.message:String(error);
    if(message.includes("WAITING_PERIOD_NOT_MET"))return {...result("not_yet","The actual sentence-completion waiting period has not elapsed."),eligibleOn:message.match(/\d{4}-\d{2}-\d{2}/)?.[0]};
    if(message.includes("LAW_VERSION_REVIEW"))return result("unknown","The matter's date is beyond the current source review; a targeted authority refresh is needed.",["md_cannabis_current_authority_review"]);
    if(message.includes("LEAP_ANNIVERSARY_REVIEW"))return result("unknown","The preserved source adapter requires a precise leap-day anniversary determination before selecting the PWID recital.",["md_cannabis_leap_anniversary_review"]);
    if(message.includes("OTHER_UNIT_CHARGE_REQUIRES_COMPONENT_REVIEW"))return result("unknown","The other PWID unit charge needs its own actual eligibility and document component; it cannot inherit the simple-possession carve-out.",["md_cannabis_unit_component_review"]);
    if(message.includes("CONTESTED")||message.includes("DISPUTED_RESTITUTION"))return result("attorney_review",message);
    if(message.includes("CONDITION_NOT_MET: confirmations.sentenceComplete"))return result("not_yet","Actual sentence and supervision completion is required for this branch.");
    if(/NOT_A_CONVICTION|NOT_CANNABIS|WRONG_STATUTE|WRONG_072D_BASIS|CONDITION_NOT_MET: confirmations.pendingCriminalProceeding|CONDITION_NOT_MET: confirmations.newConvictionNowEligible/.test(message))return result("excluded",message);
    return result("unknown",`The existing source predicate refused the supplied facts: ${message}`);
  }
}
