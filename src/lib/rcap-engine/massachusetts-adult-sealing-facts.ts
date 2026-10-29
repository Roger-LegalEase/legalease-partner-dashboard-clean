/** R038 only: isolated from the existing reviewed implementation; qualification grants no checkout authority. */
export const MASSACHUSETTS_ADULT_SEALING_ROUTE = "MA:adult-conviction-sealing-under-m-g-l-c-276-100a";
type Answers = Readonly<Record<string, unknown>>;
export type MassachusettsAdultSealingResult = {
  status: "qualifying" | "excluded" | "unknown" | "not_yet" | "needs_review";
  reviewId: "R038";
  branchId: string;
  reason: string;
  reasonEs: string;
  missingFactIds: string[];
  eligibleOn?: string;
};
export type MassachusettsAdultSealingQuestion = {
  id: string;
  type: "date" | "number" | "text" | "single_choice" | "yes_no_unsure";
  prompt: string;
  promptEs: string;
  options?: string[];
  optionsEs?: string[];
  optionsEn?: string[];
};

export function massachusettsAdultSealingQuestions(routeKey: string): readonly MassachusettsAdultSealingQuestion[] {
  if (routeKey !== MASSACHUSETTS_ADULT_SEALING_ROUTE) return [];
  return [
      { id: "ma_100a_whole_record_reviewed", type: "yes_no_unsure", prompt: "Have you considered every Massachusetts court entry, not only one case, for this whole-record administrative request? Do not upload your CORI. Later not-guilty, dismissed-for-want-of-prosecution, dismissed-at-complainant-request, nol-prossed and no-bill entries do not interrupt the statutory period.", promptEs: "¿Consideró todas las entradas judiciales de Massachusetts, no solo un caso, para esta solicitud administrativa del registro completo? No cargue su CORI. Las entradas posteriores de no culpable, desestimación por falta de prosecución o a petición del denunciante, nol prossed y no bill no interrumpen el plazo legal." },
      { id: "ma_100a_all_dispositions_description", type: "text", prompt: "List every Massachusetts court entry, its disposition and offense classification, including dismissals and continuances without a finding. Identify which entries control each date below. Do not send the underlying CORI or a Social Security number.", promptEs: "Enumere todas las entradas judiciales de Massachusetts, su resolución y categoría del delito, incluidas las desestimaciones y continuaciones sin determinación de culpabilidad. Identifique qué entradas determinan cada fecha siguiente. No envíe el CORI ni un número de Seguro Social." },
      { id: "ma_100a_all_record_classifications_confirmed", type: "yes_no_unsure", prompt: "Can you establish the actual misdemeanor/felony classification of every entry and which latest events control? If a classification or controlling entry is unclear, this self-help preparation stops for review; do not guess a misdemeanor default.", promptEs: "¿Puede establecer la categoría real de delito menor o grave de cada entrada y cuáles son los últimos eventos determinantes? Si una categoría o entrada determinante no está clara, esta preparación de autoayuda se detiene para revisión; no suponga que es delito menor." },
      { id: "ma_100a_latest_misdemeanor_event", type: "text", prompt: "What is the latest court appearance, disposition, incarceration or custody end date for all misdemeanor records in this Massachusetts record? Include a former felony now classified as a misdemeanor. Enter YYYY-MM-DD, 'none' if no such record, or 'unknown'.", promptEs: "¿Cuál es la fecha más reciente de comparecencia, resolución o fin de encarcelamiento/custodia de todos los delitos menores de este registro de Massachusetts? Incluya un delito antes grave que ahora sea menor. Ingrese AAAA-MM-DD, 'no se aplicó' si no hay tal registro, o 'no sé'." },
      { id: "ma_100a_latest_felony_event", type: "text", prompt: "What is the latest court appearance, disposition, incarceration or custody end date for all felony records in this Massachusetts record? Violations of chapter209A section7 or chapter258E section9 count as felonies. Enter YYYY-MM-DD, 'none', or 'unknown'.", promptEs: "¿Cuál es la fecha más reciente de comparecencia, resolución o fin de encarcelamiento/custodia de todos los delitos graves de este registro de Massachusetts? Las infracciones del capítulo209A sección7 o capítulo258E sección9 cuentan como graves. Ingrese AAAA-MM-DD, 'no se aplicó', o 'no sé'." },
      { id: "ma_100a_latest_sex_offense_completion", type: "text", prompt: "If any record is a sex offense under chapter6 section178C, what is the latest disposition, supervision, probation or incarceration end date? Enter YYYY-MM-DD, 'none' if there is no such offense, or 'unknown'.", promptEs: "Si algún registro es por un delito sexual conforme al capítulo6 sección178C, ¿cuál es la fecha más reciente de resolución o fin de supervisión, libertad condicional o encarcelamiento? Ingrese AAAA-MM-DD, 'no se aplicó' si no existe tal delito, o 'no sé'." },
      { id: "ma_100a_excluded_firearms_or_public_integrity_record", type: "yes_no_unsure", prompt: "Does the record include a conviction under chapter140 sections121 through131H (firearms), chapter268 other than resisting arrest, or chapter268A?", promptEs: "¿Incluye el registro una condena conforme al capítulo140 secciones121 a131H (armas), capítulo268 excepto resistencia al arresto, o capítulo268A?" },
      ...[
        ["ma_100a_recent_finding_three_years", "In the past 3 years, have you had a guilty finding in Massachusetts or a conviction in another state, U.S. possession or federal court, except a motor vehicle offense whose penalty did not exceed a $50 fine?", "¿En los últimos 3 años se le declaró culpable en Massachusetts o tuvo una condena en otro estado, posesión de EE. UU. o tribunal federal, excepto una infracción de tránsito cuya pena no superó $50?"],
        ["ma_100a_recent_custody_three_years", "Have you been imprisoned in any state or county in the past 3 years?", "¿Ha estado encarcelado en cualquier estado o condado en los últimos 3 años?"],
        ["ma_100a_recent_finding_seven_years", "For felony records, have you had a guilty finding or outside-state/federal conviction in the past 7 years, except the same maximum-$50 motor vehicle exception?", "Para registros de delitos graves, ¿ha tenido una declaración de culpabilidad o condena fuera del estado/federal en los últimos 7 años, excepto la misma excepción de tránsito de multa máxima de $50?"],
        ["ma_100a_recent_custody_seven_years", "For felony records, have you been imprisoned in any state or county in the past 7 years?", "Para registros de delitos graves, ¿ha estado encarcelado en cualquier estado o condado en los últimos 7 años?"],
        ["ma_100a_ever_sex_level_two_or_three", "If sealing a sex offense, have you ever been classified as a level2 or level3 sex offender?", "Si desea sellar un delito sexual, ¿alguna vez se le clasificó como infractor sexual de nivel2 o nivel3?"],
        ["ma_100a_sex_registration_duty", "If sealing a sex offense, are you still required to register in Massachusetts, where you reside, or if you resided in Massachusetts?", "Si desea sellar un delito sexual, ¿todavía debe registrarse en Massachusetts, en su lugar de residencia o si residiera en Massachusetts?"]
      ].map(([id,prompt,promptEs])=>({id,type:"yes_no_unsure" as const,prompt,promptEs}))
    ];
}
function answer(facts: Answers, id: string): unknown {
  const value = facts[id];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as { value?: unknown; unknown?: boolean };
    return wrapped.unknown === true ? undefined : wrapped.value;
  }
  return value;
}
function text(facts: Answers, id: string): string {
  const value = answer(facts, id);
  return typeof value === "string" ? value.trim() : "";
}
function yesNo(facts: Answers, id: string): boolean | undefined {
  const value = answer(facts, id);
  if (value === true || value === "Yes" || value === "yes") return true;
  if (value === false || value === "No" || value === "no") return false;
  return undefined;
}
function date(facts: Answers, id: string): string | null {
  const value = text(facts, id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
export function evaluateMassachusettsAdultSealing(routeKey: string, facts: Answers, asOf: string): MassachusettsAdultSealingResult | null {
  if (routeKey !== MASSACHUSETTS_ADULT_SEALING_ROUTE) return null;
  if (!date({ asOf }, "asOf")) throw new Error("Research route evaluation requires an exact valid as-of date");
  const result = (status: MassachusettsAdultSealingResult["status"], reason: string, missingFactIds: string[] = [], eligibleOn?: string): MassachusettsAdultSealingResult =>
    ({ status, reviewId: "R038", branchId: "R038:participant_application", reason, reasonEs: requiredSpanish(reason), missingFactIds, ...(eligibleOn ? { eligibleOn } : {}) });

    const wholeRecord = yesNo(facts,"ma_100a_whole_record_reviewed");
    const classifications = yesNo(facts,"ma_100a_all_record_classifications_confirmed");
    const entries = text(facts,"ma_100a_all_dispositions_description");
    const inventoryAnswer = entries.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const inventoryUnknown = !inventoryAnswer || ["unknown", "unsure", "none", "no se", "not sure", "i am not sure", "i'm not sure", "i do not know", "i don't know", "do not know", "don't know", "no estoy seguro", "no estoy segura"].includes(inventoryAnswer);
    const scopeMissing = [wholeRecord === undefined && "ma_100a_whole_record_reviewed", classifications === undefined && "ma_100a_all_record_classifications_confirmed", inventoryUnknown && "ma_100a_all_dispositions_description"].filter(Boolean) as string[];
    if(scopeMissing.length) return result("unknown","Establish the complete Massachusetts record, its actual offense classifications and controlling entries; a single selected case or missing inventory is insufficient.",scopeMissing);
    if(!wholeRecord || !classifications) return result("needs_review","The adopted whole-record design stops when only one case is considered or an offense classification or controlling entry cannot be established. Do not guess the misdemeanor default.");
    const eventIds = ["ma_100a_latest_misdemeanor_event", "ma_100a_latest_felony_event", "ma_100a_latest_sex_offense_completion"];
    const isNone = (id: string) => ["none", "no se aplicó", "nunca"].includes(text(facts,id).toLowerCase());
    const dates = eventIds.map(id=>date(facts,id));
    const excluded = yesNo(facts,"ma_100a_excluded_firearms_or_public_integrity_record");
    const hasFelony = Boolean(dates[1]); const hasSex = Boolean(dates[2]);
    const historyIds = hasFelony ? ["ma_100a_recent_finding_seven_years","ma_100a_recent_custody_seven_years"] : ["ma_100a_recent_finding_three_years","ma_100a_recent_custody_three_years"];
    const sexIds = hasSex ? ["ma_100a_ever_sex_level_two_or_three","ma_100a_sex_registration_duty"] : [];
    const missing = [...eventIds.filter((id,i)=>!dates[i]&&!isNone(id)),...(excluded===undefined?["ma_100a_excluded_firearms_or_public_integrity_record"]:[]),...historyIds.filter(id=>yesNo(facts,id)===undefined),...sexIds.filter(id=>yesNo(facts,id)===undefined)];
    if(missing.length)return result("unknown","Establish every record class's exact latest event, applicable history and any sex-offense classification/registration; an unknown event is not no event.",missing);
    if(excluded)return result("excluded","Section100A excludes the specified firearms and public-integrity convictions, with the resisting-arrest exception. Do not substitute ordinary expungement.");
    if(!dates.some(Boolean))return result("needs_review","No adult record was identified for this request; choose the actual record mechanism rather than generate an empty application.");
    if(dates.some(d=>d&&d>asOf))return result("unknown","A reported completed event is in the future. Confirm actual completion dates.",eventIds.filter((_,i)=>dates[i]&&dates[i]!>asOf));
    if(hasSex && !dates[0] && !dates[1]) return result("unknown","A sex-offense completion date does not establish the underlying misdemeanor/felony record class and its event. Identify the actual class and controlling event rather than infer one.",["ma_100a_latest_misdemeanor_event","ma_100a_latest_felony_event"]);
    if(hasSex&&yesNo(facts,"ma_100a_ever_sex_level_two_or_three"))return result("excluded","Section100A does not permit sealing a sex offense for someone ever classified as level2 or level3. Any separate eligible non-sex records need their own scoped analysis.");
    if(hasSex&&yesNo(facts,"ma_100a_sex_registration_duty"))return result("not_yet","The sex-offense registration duty still applies. The15-year period does not override a longer registration duty.");
    if(hasFelony && ((yesNo(facts,"ma_100a_recent_finding_three_years")===true && yesNo(facts,"ma_100a_recent_finding_seven_years")===false) || (yesNo(facts,"ma_100a_recent_custody_three_years")===true && yesNo(facts,"ma_100a_recent_custody_seven_years")===false))) return result("unknown","The three-year and seven-year history answers contradict each other. Correct the actual record; a more recent event is also within the longer period.",["ma_100a_recent_finding_three_years","ma_100a_recent_finding_seven_years","ma_100a_recent_custody_three_years","ma_100a_recent_custody_seven_years"]);
    if(historyIds.some(id=>yesNo(facts,id)))return result("not_yet",`The applicable ${hasFelony?7:3}-year clean-history/custody period is not satisfied. The maximum-$50-fine motor-vehicle exception applies only where stated.`);
    const due = dates.map((value,i)=>{
      if(!value)return ""; const at=new Date(`${value}T00:00:00Z`);at.setUTCFullYear(at.getUTCFullYear()+[3,7,15][i]);return at.toISOString().slice(0,10);
    }).filter(Boolean).sort().at(-1)!;
    if(asOf<due)return result("not_yet","The applicable3/7/15-year period has not elapsed for every record sought to be sealed. Each class uses its own statutory event anchor.",[],due);
    return result("qualifying","The supported administrative100A request uses the official Commissioner form and applicable adult affidavit. A former felony now a misdemeanor uses the misdemeanor clock; protective-order violations specified by statute use the felony clock. This is sealing, not expungement.",[],due);
  }
export function massachusettsAdultSealingDocumentManifest(routeKey: string) {
  if (routeKey !== MASSACHUSETTS_ADULT_SEALING_ROUTE) return null;
  return {
      reviewId:"R038",relief:"sealing",forum:"Commissioner_of_Probation",required:["official_MA_Petition_to_Seal_Section100A","corresponding_adult_perjury_affidavit","participant_submission_instructions"],conditional:[],external:["participant_obtains_own_DCJIS_CORI_before_filing_without_LegalEase_collection_or_inspection","dockets_if_needed_to_identify_controlling_entries"],source:"https://www.mass.gov/doc/petition-to-seal-form/download",filingReady:false,
      note:"Misdemeanor, felony and sex-offense dates and history are separately evaluated. Select only the supported adult request/affidavit. The public administrative request is free; LegalEase's optional software charge is distinct. No court proposed order, signature or approval is invented."
    };
}
const OUTCOME_COPY_ES: Readonly<Record<string,string>> = {
"A sex-offense completion date does not establish the underlying misdemeanor/felony record class and its event. Identify the actual class and controlling event rather than infer one.":"La fecha de cumplimiento de un delito sexual no establece la categoría subyacente de delito menor o grave ni su evento. Identifique la categoría y el evento determinante reales en vez de suponerlos.",
"Establish the complete Massachusetts record, its actual offense classifications and controlling entries; a single selected case or missing inventory is insufficient.":"Confirme el registro completo de Massachusetts, las categorías reales de los delitos y las entradas determinantes; no basta con seleccionar un solo caso o carecer del inventario.",
"The adopted whole-record design stops when only one case is considered or an offense classification or controlling entry cannot be established. Do not guess the misdemeanor default.":"El diseño adoptado para el registro completo se detiene si solo se considera un caso o no puede establecerse la categoría de un delito o la entrada determinante. No suponga que es delito menor.",
"Establish every record class's exact latest event, applicable history and any sex-offense classification/registration; an unknown event is not no event.":"Confirme el último evento exacto de cada categoría de registro, los antecedentes aplicables y cualquier clasificación o deber de registro por delito sexual; un evento desconocido no equivale a que no haya ocurrido.",
"Section100A excludes the specified firearms and public-integrity convictions, with the resisting-arrest exception. Do not substitute ordinary expungement.":"La sección100A excluye las condenas indicadas de armas e integridad pública, con la excepción de resistencia al arresto. No sustituya este procedimiento por una eliminación ordinaria.",
"No adult record was identified for this request; choose the actual record mechanism rather than generate an empty application.":"No se identificó ningún registro de adulto para esta solicitud; seleccione el procedimiento que corresponda al registro real antes de preparar una solicitud.",
"A reported completed event is in the future. Confirm actual completion dates.":"Un evento declarado como concluido tiene fecha futura. Confirme las fechas reales de cumplimiento.",
"Section100A does not permit sealing a sex offense for someone ever classified as level2 or level3. Any separate eligible non-sex records need their own scoped analysis.":"La sección100A no permite sellar un delito sexual de una persona que alguna vez fue clasificada de nivel2 o nivel3. Los registros no sexuales que puedan cumplir los requisitos necesitan su propio análisis específico.",
"The sex-offense registration duty still applies. The15-year period does not override a longer registration duty.":"El deber de registro por delito sexual sigue vigente. El plazo de15años no anula un deber de registro más prolongado.",
"The three-year and seven-year history answers contradict each other. Correct the actual record; a more recent event is also within the longer period.":"Las respuestas de antecedentes de tres y siete años se contradicen. Corrija el registro real; un evento más reciente también está dentro del plazo más largo.",
"The applicable3/7/15-year period has not elapsed for every record sought to be sealed. Each class uses its own statutory event anchor.":"No ha transcurrido el plazo aplicable de3,7o15años para cada registro que se desea sellar. Cada categoría usa el evento inicial previsto por la ley.",
"The supported administrative100A request uses the official Commissioner form and applicable adult affidavit. A former felony now a misdemeanor uses the misdemeanor clock; protective-order violations specified by statute use the felony clock. This is sealing, not expungement.":"La solicitud administrativa100A usa el formulario oficial del Comisionado y la declaración jurada de adulto aplicable. Un delito antes grave que ahora es menor usa el plazo de delito menor; las infracciones de órdenes de protección especificadas por la ley usan el plazo de delito grave. Este procedimiento sella el registro; no lo elimina.",
};
export function massachusettsAdultSealingOutcomeSpanish(reason: string): string | null {
  if (OUTCOME_COPY_ES[reason]) return OUTCOME_COPY_ES[reason];
  const history = /^The applicable (3|7)-year clean-history\/custody period is not satisfied\. The maximum-\$50-fine motor-vehicle exception applies only where stated\.$/.exec(reason);
  return history ? `No se cumple el período aplicable de${history[1]}años sin antecedentes ni encarcelamiento. La excepción de tránsito de multa máxima de$50se aplica únicamente donde se indica.` : null;
}

function requiredSpanish(reason: string): string {
  const translated = massachusettsAdultSealingOutcomeSpanish(reason);
  if (!translated) throw new Error("Research route outcome translation is missing");
  return translated;
}
