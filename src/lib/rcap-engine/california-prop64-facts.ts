import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { caProp64Choice, CA_PROP64_CURRENT, CA_PROP64_COMPLETED } from "@/lib/expungement-ai/ca-prop64-choices";
import { CA_PROP64_QUANTITY_CONTRACT, caProp64GramsExceed } from "@/lib/expungement-ai/ca-prop64-quantity";

type Answers = Record<string, unknown>;
type Decision = { status: "satisfied" | "missing" | "review"; code?: string; ids: string[]; classification?: "no_offense" | "infraction" | "misdemeanor" };
export const CA_PROP64_SOURCE = "HSC11361.8(a)-(h),(m);11357-11360;11362.1-11362.4;CR400(2024-01-01)";
export const CA_PROP64_REASON_COPY: Record<string, [string, string]> = {
  facts_missing: ["Check the conviction record and the conduct details shown here. An answer that the offense qualifies does not supply those facts.", "Revise el registro de condena y los detalles de la conducta que se indican aquí. Decir que el delito califica no aporta esos hechos."],
  record_conflict: ["These details about the same conviction do not agree. Review the original record and correct the affected answers.", "Estos detalles sobre la misma condena no coinciden. Revise el registro original y corrija las respuestas afectadas."],
  different_statute: ["This statute needs a record-specific Proposition 64 review; it cannot be treated as a different marijuana conviction.", "Esta ley necesita una revisión específica del registro bajo la Proposición 64; no puede tratarse como otra condena por cannabis."],
  service_election: ["Checking existing relief or considering another procedure does not request a new Proposition 64 court filing.", "Verificar una reparación existente o considerar otro procedimiento no solicita una nueva presentación judicial bajo la Proposición 64."],
  date_or_current_statute: ["The offense date or current statute needs review before applying the prior-conviction procedure. This does not determine that no relief is available.", "La fecha del delito o la ley actual necesita revisión antes de aplicar el procedimiento para condenas anteriores. Esto no determina que no haya reparación disponible."],
  juvenile_forms: ["Proposition 64 also applies to juvenile adjudications. This record needs the juvenile procedure and forms, not the adult CR-400 packet.", "La Proposición 64 también se aplica a resoluciones de menores. Este registro necesita el procedimiento y los formularios para menores, no el paquete CR-400 para adultos."],
  prior_relief: ["Review the existing order and the additional result requested. Automatic relief may make a filing unnecessary, but it does not always provide every available benefit.", "Revise la orden existente y el resultado adicional solicitado. La reparación automática puede hacer innecesaria una presentación, pero no siempre otorga todos los beneficios disponibles."],
  substance: ["The substance in the conviction needs review. A marijuana rule cannot be applied to a different or unidentified drug.", "La sustancia de la condena necesita revisión. Una regla de cannabis no puede aplicarse a una droga distinta o no identificada."],
  possession_context: ["The place and circumstances of possession need review under the rules for that conduct.", "El lugar y las circunstancias de la posesión necesitan revisión bajo las reglas de esa conducta."],
  restricted_conduct: ["Possession, public smoking, vehicle use and school-related conduct have different rules. Review the exact conduct before selecting the requested relief.", "La posesión, fumar en público, el uso en vehículos y la conducta relacionada con escuelas tienen reglas distintas. Revise la conducta exacta antes de elegir la reparación solicitada."],
  concentrate_amendment: ["This concentrate quantity falls within a statutory amendment boundary that needs review for this record.", "Esta cantidad de concentrado cae dentro del límite de una modificación legal que necesita revisión para este registro."],
  transfer_conduct: ["Review whether this was a sale, unpaid gift, personal transport, or other conduct. These have different legal consequences.", "Revise si fue una venta, un regalo sin compensación, transporte personal u otra conducta. Tienen consecuencias legales distintas."],
  cross_border_exception: ["This cross-border conduct and quantity may permit a felony charge. The court must assess the specific exception; it is not an automatic denial.", "Esta conducta transfronteriza y cantidad pueden permitir un cargo de delito grave. El tribunal debe evaluar la excepción específica; no es una denegación automática."],
  cross_border_conduct: ["Review the exact import or export conduct before treating it as lawful possession or a lesser offense.", "Revise la conducta exacta de importación o exportación antes de tratarla como posesión legal o un delito de menor gravedad."],
  felony_exception: ["These facts may permit felony treatment under this particular offense section. Record-specific review is needed; the same facts are not a blanket bar to all Proposition 64 relief.", "Estos hechos pueden permitir el tratamiento como delito grave bajo esta sección particular. Se necesita revisión del registro; no son una prohibición general de toda reparación bajo la Proposición 64."],
  conviction_record: ["Confirm the final conviction or juvenile adjudication for this request. An arrest, charge or program alone is not a conviction.", "Confirme la condena final o resolución de menores para esta solicitud. Un arresto, cargo o programa por sí solo no es una condena."],
  no_reduction_shown: ["The current facts do not yet establish a reduction from the recorded offense level. Review the record and any other applicable relief.", "Los hechos actuales aún no establecen una reducción del nivel de delito registrado. Revise el registro y cualquier otra reparación aplicable."],
  remedy_conflict: ["The requested remedy and the conduct facts do not agree. Dismissal and sealing concerns conduct that became lawful; redesignation concerns conduct that became a lesser offense.", "La reparación solicitada y los hechos de la conducta no coinciden. La desestimación y el sellado corresponden a conducta que se volvió legal; la reclasificación, a conducta que se volvió un delito de menor gravedad."]
};
export const CA_PROP64_LEGACY_IDS = ["ca_prop64_qualifying_marijuana_offense", "ca_prop64_lesser_or_no_offense"];
export const CA_PROP64_PROCEDURE_COPY: Record<string, [string, string]> = {
  current: ["For a sentence still being served, including probation, parole, PRCS or mandatory supervision, the court presumes eligibility unless the opposing party proves otherwise by clear and convincing evidence. The court may deny relief for an unreasonable risk of danger to public safety. These are court decisions, not facts you must certify.", "Para una sentencia que aún se cumple, incluidas la libertad a prueba (probation), la libertad condicional (parole), supervisión comunitaria posterior a la liberación (PRCS) o supervisión obligatoria, el tribunal presume la elegibilidad salvo prueba clara y convincente en contrario de la parte opositora. El tribunal puede denegar la reparación por un riesgo irrazonable de peligro para la seguridad pública. Son decisiones judiciales, no hechos que usted deba certificar."],
  completed: ["For a completed sentence, the court presumes eligibility unless the opposing party proves otherwise by clear and convincing evidence. The currently-serving branch's public-safety exception does not apply to this application. The court decides dismissal and sealing or redesignation; a hearing is not required unless requested by the applicant.", "Para una sentencia cumplida, el tribunal presume la elegibilidad salvo prueba clara y convincente en contrario de la parte opositora. La excepción de seguridad pública de la vía para sentencias aún en cumplimiento no se aplica a esta solicitud. El tribunal decide la desestimación y el sellado o la reclasificación; no se requiere audiencia salvo que la persona solicitante la pida."]
};
const sections = ["11357", "11358", "11359", "11360", "11362.1"];
function scalar(v: unknown): unknown {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const a = v as Record<string, unknown>;
    return Object.keys(a).every(k => ["value", "unknown"].includes(k)) && (a.unknown === undefined || a.unknown === false) ? a.value : undefined;
  }
  return v;
}
const normalized = (a: Answers): Answers => Object.fromEntries(Object.entries(a).map(([id, value]) => [id, scalar(value)]));
function number(v: unknown): number | undefined {
  v = scalar(v);
  if (typeof v !== "number" && (typeof v !== "string" || !/^\d+(\.\d+)?$/.test(v))) return undefined;
  const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function date(v: unknown, today: string): string | undefined {
  v = scalar(v);
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v.startsWith("0000-") || v > today) return undefined;
  const d = new Date(v + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : undefined;
}
/** An exact citation in the existing charge answer may supply the same fact.
 * Decimal siblings (11357.5), multiple sections and contradictory new answers
 * cannot be silently narrowed to a cannabis conviction. Raw answers are retained.
 */
export function caProp64Section(a: Answers): string | undefined {
  const charge = scalar(a.charge);
  const text = typeof charge === "string" ? charge.trim() : "";
  const codes = [...new Set(text.match(/(?<![\d.])113\d{2}(?:\.\d+)?\b/g) ?? [])];
  const explicit = scalar(a.ca_prop64_record_section);
  // A docket number or citation to another code is not a Health and Safety
  // Code conviction. Prose remains raw record information; use the separate
  // factual question to identify its section, without discarding conflicts.
  const otherCode = /\b(?:P\.?C\.?|Penal\s+Code|V\.?C\.?|Vehicle\s+Code|B\.?P\.?C\.?|Business\s+and\s+Professions\s+Code|W\.?I\.?C\.?|Welfare\s+and\s+Institutions\s+Code|U\.?S\.?C\.?)\s*(?:§\s*|section\s*)?\d/i.test(text);
  if (otherCode) return explicit && explicit !== "unknown" || codes.length > 0 ? "conflict" : undefined;
  if (codes.length > 1 || codes.length === 1 && explicit && explicit !== "unknown" && codes[0] !== explicit) return "conflict";
  const exact = /^(?:(?:California|Cal\.?|CA)\s+)?(?:H\.?S\.?C\.?|H\s*&\s*S(?:\s*(?:C|Code))?|HS|Health\s+(?:and|&)\s+Safety\s+Code)\s*(?:§\s*|section\s*)?(113\d{2}(?:\.\d+)?)(?:\s*\([a-z0-9]+\))*\s*$/i.exec(text);
  if (exact) return exact[1];
  return typeof explicit === "string" ? explicit : undefined;
}
export const caProp64ApplicationRequested = (a: Answers): boolean => scalar(a.ca_prop64_next_step) === "apply";
export function caProp64Pathway(a: Answers): string | undefined {
  a = normalized(a);
  if (a.ca_prop64_next_step === "other_relief" || a.ca_prop64_next_step === "check_status") return undefined;
  const branch = caProp64Choice("ca_prop64_branch", a.ca_prop64_branch);
  return branch === "currently-serving petition" ? CA_PROP64_CURRENT : branch === "completed-sentence application" ? CA_PROP64_COMPLETED : undefined;
}
const knownChoice = (a: Answers, id: string) => {
  const q = CA_PROP64_FACT_QUESTIONS.find(q => q.id === id);
  return scalar(a[id]) !== "unknown" && Array.isArray(q?.options) && q.options.includes(String(scalar(a[id])));
};
const yes = (a: Answers, id: string) => scalar(a[id]) === "Yes";
const missing = (ids: string[]): Decision => ({ status: "missing", code: "facts_missing", ids: [...new Set(ids)] });
const review = (code: string, ids: string[] = []): Decision => ({ status: "review", code, ids });
const amountIds = (a: Answers) => a.ca_prop64_substance === "flower" ? ["ca_prop64_flower_grams"]
  : a.ca_prop64_substance === "concentrate" ? ["ca_prop64_concentrate_grams"]
  : a.ca_prop64_substance === "both" ? ["ca_prop64_flower_grams", "ca_prop64_concentrate_grams"] : [];
const priorIds = ["ca_prop64_prior_superstrike", "ca_prop64_prior_290c", "ca_prop64_same_section_priors"];
function exceptionApplies(a: Answers) {
  const s = caProp64Section(a), age = number(a.ca_prop64_age_at_offense);
  if (s === "11360" && (a.ca_prop64_cross_border === "none" || a.ca_prop64_cross_border === "export_for_sale" && a.ca_prop64_transfer_conduct === "transport_for_sale") && a.ca_prop64_substance === "flower"
    && !caProp64GramsExceed(a.ca_prop64_flower_grams, 28.5) && caProp64GramsExceed(a.ca_prop64_flower_grams, 0)
    && ["unpaid_gift", "transport_for_sale"].includes(String(a.ca_prop64_transfer_conduct))) return false;
  if (s === "11360" && age !== undefined && age >= 21 && a.ca_prop64_cross_border === "none"
    && ["flower", "concentrate", "both"].includes(String(a.ca_prop64_substance))) {
    const ids = amountIds(a), quantities = ids.map(id => number(a[id]));
    const small = quantities.every(n => n !== undefined) && ids.some(id => caProp64GramsExceed(a[id], 0))
      && (!ids.includes("ca_prop64_flower_grams") || !caProp64GramsExceed(a.ca_prop64_flower_grams, 28.5))
      && (!ids.includes("ca_prop64_concentrate_grams") || !caProp64GramsExceed(a.ca_prop64_concentrate_grams, 8));
    if (small && (a.ca_prop64_transfer_conduct === "personal_transport"
      || a.ca_prop64_transfer_conduct === "unpaid_gift" && (number(a.ca_prop64_recipient_age) ?? -1) >= 21)) return false;
  }
  return age !== undefined && age >= 18 && (s === "11359" || s === "11360" || s === "11358" && (number(a.ca_prop64_plant_count) ?? 0) > 6);
}
export function caProp64ActiveFactIds(a: Answers): string[] {
  a = normalized(a);
  const ids = ["ca_prop64_record_section"];
  const s = caProp64Section(a);
  if (sections.includes(s ?? "") || caProp64Pathway(a)) ids.push("ca_prop64_next_step");
  if (!sections.includes(s ?? "") || ["other_relief", "check_status"].includes(String(a.ca_prop64_next_step))) return ids;
  ids.push("ca_prop64_offense_date", "ca_prop64_age_at_offense", "ca_prop64_court_type", "ca_prop64_existing_relief");
  if (a.ca_prop64_existing_relief !== "none" && knownChoice(a, "ca_prop64_existing_relief")) ids.push("ca_prop64_additional_benefit");
  if (["11357", "11360", "11362.1"].includes(s!)) ids.push("ca_prop64_substance", ...amountIds(a));
  if (["11357", "11362.1"].includes(s!)) ids.push("ca_prop64_possession_context");
  if (s === "11358") {
    ids.push("ca_prop64_plant_count");
    if ((number(a.ca_prop64_age_at_offense) ?? 0) >= 21 && (number(a.ca_prop64_plant_count) ?? Infinity) <= 6) {
      ids.push("ca_prop64_residence_total", "ca_prop64_private_residence", "ca_prop64_locked", "ca_prop64_public_visible", "ca_prop64_local_violation");
    }
  }
  if (exceptionApplies(a)) {
    ids.push(...priorIds);
    if (s === "11358") ids.push("ca_prop64_environmental_record");
    if (s === "11359" || s === "11360") ids.push("ca_prop64_knowing_minor_transaction");
    if (s === "11359" && (number(a.ca_prop64_age_at_offense) ?? 0) >= 21) ids.push("ca_prop64_used_young_person");
  }
  if (s === "11360") {
    ids.push("ca_prop64_transfer_conduct", "ca_prop64_cross_border");
    if (a.ca_prop64_transfer_conduct === "unpaid_gift") ids.push("ca_prop64_recipient_age");
  }
  return [...new Set(ids)];
}

/** Factual predicates for the two retained routes. Neither old legal conclusion
 * is read. A possible felony exception is a review question, not a blanket ban.
 * Court presumptions, burdens and discretion are never participant assertions.
 */
export function caProp64Facts(a: Answers, today: string): Decision {
  a = normalized(a);
  const s = caProp64Section(a);
  if (!s || s === "unknown") return missing(["ca_prop64_record_section"]);
  if (s === "conflict") return review("record_conflict", ["charge", "ca_prop64_record_section"]);
  if (!sections.includes(s)) return review("different_statute", ["ca_prop64_record_section"]);
  if (!knownChoice(a, "ca_prop64_next_step")) return missing(["ca_prop64_next_step"]);
  if (["other_relief", "check_status"].includes(String(a.ca_prop64_next_step))) return review("service_election", ["ca_prop64_next_step"]);
  const ids = caProp64ActiveFactIds(a).filter(id => id !== "ca_prop64_record_section");
  const absent = ids.filter(id => {
    const q = CA_PROP64_FACT_QUESTIONS.find(q => q.id === id)!;
    if (q.type === "date_or_unknown") return !date(a[id], today);
    if (q.type === "number_or_range") return number(a[id]) === undefined;
    return !knownChoice(a, id);
  });
  if (absent.length) return missing(absent);
  const age = number(a.ca_prop64_age_at_offense)!;
  if (!Number.isInteger(age) || age > 120) return missing(["ca_prop64_age_at_offense"]);
  if (date(a.conviction_date, today) && date(a.conviction_date, today)! < date(a.ca_prop64_offense_date, today)!) return review("record_conflict", ["conviction_date", "ca_prop64_offense_date"]);
  // A later record may involve an earlier offense. Do not reject on the date
  // of conviction alone or represent a post-AUMA citation as an earlier crime.
  if (date(a.ca_prop64_offense_date, today)! >= "2016-11-09" || s === "11362.1") return review("date_or_current_statute", ["ca_prop64_offense_date", "ca_prop64_record_section"]);
  if (a.ca_prop64_court_type === "juvenile") return review("juvenile_forms", ["ca_prop64_court_type"]);
  if (a.ca_prop64_existing_relief !== "none") return review("prior_relief", ["ca_prop64_existing_relief", "ca_prop64_additional_benefit"]);
  const flower = amountIds(a).includes("ca_prop64_flower_grams") ? a.ca_prop64_flower_grams : 0;
  const concentrate = amountIds(a).includes("ca_prop64_concentrate_grams") ? a.ca_prop64_concentrate_grams : 0;
  if (["11357", "11360"].includes(s) && amountIds(a).length && !caProp64GramsExceed(flower, 0) && !caProp64GramsExceed(concentrate, 0)) return review("record_conflict", amountIds(a));
  const small = !caProp64GramsExceed(flower, 28.5) && !caProp64GramsExceed(concentrate, 8);
  if (["11357", "11360"].includes(s) && a.ca_prop64_substance === "other") return review("substance", ["ca_prop64_substance"]);
  let classification: Decision["classification"];
  if (s === "11357") {
    const context = a.ca_prop64_possession_context;
    if (context === "custody" || context === "other") return review("possession_context", ["ca_prop64_possession_context"]);
    if (context === "public_or_vehicle_use") return review("restricted_conduct", ["ca_prop64_possession_context"]);
    if (age < 18) classification = "infraction";
    else if (context === "school_children") classification = "misdemeanor";
    else if (age >= 21 && small) classification = "no_offense";
    else if (age < 21 && caProp64GramsExceed(concentrate, 4) && !caProp64GramsExceed(concentrate, 8)) return review("concentrate_amendment", ["ca_prop64_concentrate_grams"]);
    else classification = age < 21 && small ? "infraction" : "misdemeanor";
  } else if (s === "11358") {
    const plants = number(a.ca_prop64_plant_count)!;
    if (!Number.isSafeInteger(plants) || plants < 1) return missing(["ca_prop64_plant_count"]);
    if (age < 18 || age < 21 && plants <= 6) classification = "infraction";
    else if (plants > 6) classification = "misdemeanor";
    else {
      const total = number(a.ca_prop64_residence_total)!;
      if (!Number.isSafeInteger(total) || total < plants) return review("record_conflict", ["ca_prop64_plant_count", "ca_prop64_residence_total"]);
      classification = total <= 6 && yes(a, "ca_prop64_private_residence") && yes(a, "ca_prop64_locked")
        && !yes(a, "ca_prop64_public_visible") && !yes(a, "ca_prop64_local_violation") ? "no_offense" : "infraction";
    }
  } else if (s === "11359") classification = age < 18 ? "infraction" : "misdemeanor";
  else if (s === "11360") {
    const conduct = a.ca_prop64_transfer_conduct;
    if (conduct === "other") return review("transfer_conduct", ["ca_prop64_transfer_conduct"]);
    if (conduct === "unpaid_gift" && (!Number.isInteger(number(a.ca_prop64_recipient_age)) || number(a.ca_prop64_recipient_age)! > 120)) return missing(["ca_prop64_recipient_age"]);
    if (a.ca_prop64_cross_border === "other") return review("cross_border_conduct", ["ca_prop64_cross_border"]);
    if (a.ca_prop64_cross_border === "export_for_sale" && !["sale", "transport_for_sale"].includes(String(conduct))) return review("record_conflict", ["ca_prop64_cross_border", "ca_prop64_transfer_conduct"]);
    if (age >= 18 && a.ca_prop64_cross_border !== "none" && (caProp64GramsExceed(flower, 28.5) || caProp64GramsExceed(concentrate, 4))) return review("cross_border_exception", ["ca_prop64_cross_border"]);
    classification = age < 18 ? "infraction" : a.ca_prop64_cross_border === "import" ? "misdemeanor" : age >= 21 && small && a.ca_prop64_cross_border === "none"
      && (conduct === "personal_transport" || conduct === "unpaid_gift" && number(a.ca_prop64_recipient_age)! >= 21) ? "no_offense"
      : a.ca_prop64_substance === "flower" && !caProp64GramsExceed(flower, 28.5) && ["unpaid_gift", "transport_for_sale"].includes(String(conduct)) ? "infraction" : "misdemeanor";
  }
  if (exceptionApplies(a) && classification !== "no_offense") {
    const priors = number(a.ca_prop64_same_section_priors)!;
    if (!Number.isSafeInteger(priors)) return missing(["ca_prop64_same_section_priors"]);
    if (yes(a, "ca_prop64_prior_superstrike") || yes(a, "ca_prop64_prior_290c") || priors >= 2
      || s === "11358" && yes(a, "ca_prop64_environmental_record")
      || (s === "11359" || s === "11360") && yes(a, "ca_prop64_knowing_minor_transaction")
      || s === "11359" && age >= 21 && yes(a, "ca_prop64_used_young_person")) return review("felony_exception", priorIds);
  }
  const levels: Record<string, number> = { Infraction: 1, Misdemeanor: 2, Felony: 3 };
  const level = levels[String(a.offense_level)];
  if (!level) return missing(["offense_level"]);
  if (a.case_outcome === "Felony conviction" && level !== 3 || a.case_outcome === "Misdemeanor conviction" && level !== 2) return review("record_conflict", ["case_outcome", "offense_level"]);
  if (!["Felony conviction", "Misdemeanor conviction", "Other conviction or adjudication"].includes(String(a.case_outcome))) return review("conviction_record", ["case_outcome"]);
  if (!classification || ({ no_offense: 0, infraction: 1, misdemeanor: 2 }[classification]) >= level) return review("no_reduction_shown", ["offense_level"]);
  const branch = caProp64Pathway(a);
  if (!branch) return missing(["ca_prop64_branch"]);
  if (branch === CA_PROP64_COMPLETED) {
    const elected = caProp64Choice("ca_prop64_relief_requested", a.ca_prop64_relief_requested);
    if (!elected || elected === "I am not sure") return missing(["ca_prop64_relief_requested"]);
    if ((elected === "dismissal/sealing") !== (classification === "no_offense")) return review("remedy_conflict", ["ca_prop64_relief_requested"]);
  }
  return { status: "satisfied", ids: [], classification };
}

type Choice = [string, string, string];
const yesNo: Choice[] = [["Yes", "Yes", "Sí"], ["No", "No", "No"], ["unknown", "I am not sure", "No estoy seguro"]];
function q(id: string, prompt: string, es: string, options?: Choice[], helper?: [string, string], type: PublicQuestion["type"] = "single_choice"): PublicQuestion {
  return { id, stage: "timing_and_completion", type, required: false, contextOnly: false, doesNotSelectPathway: true,
    ...(["ca_prop64_flower_grams", "ca_prop64_concentrate_grams"].includes(id) ? { answerContract: CA_PROP64_QUANTITY_CONTRACT } : {}),
    lifecyclePhase: "prepay_timing_gate", prompt, helperText: helper?.[0], options: options?.map(([wire]) => wire) ?? null,
    ...(options ? { optionDisplay: Object.fromEntries(options.map(([wire, label, translation]) => [wire, { label, translations: { es: { label: translation } } }])) } : {}),
    translations: { es: { prompt: es, ...(helper ? { helperText: helper[1] } : {}) } } };
}
// Engineering drafts; independent language and legal approval remain required.
export const CA_PROP64_FACT_QUESTIONS: PublicQuestion[] = [
  q("ca_prop64_record_section", "Which Health and Safety Code section is on the marijuana conviction record?", "¿Qué sección del Código de Salud y Seguridad figura en el registro de la condena por cannabis?", [...sections.map(s => [s, `HSC § ${s}`, `HSC § ${s}`] as Choice), ["other", "Another law", "Otra ley"], ["unknown", "I am not sure", "No estoy seguro"]], ["Use the final conviction, including any amended charge. Different charges need separate review.", "Use la condena final, incluido cualquier cargo modificado. Los cargos distintos necesitan revisión por separado."]),
  q("ca_prop64_next_step", "What help do you want with this marijuana record?", "¿Qué ayuda desea con este registro de cannabis?", [["apply", "Ask the court for Proposition 64 relief", "Pedir al tribunal reparación bajo la Proposición 64"], ["check_status", "Check relief already granted", "Verificar la reparación ya concedida"], ["other_relief", "Consider other record-clearing options", "Considerar otras opciones para limpiar el registro"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_offense_date", "When did the conduct in this conviction happen?", "¿Cuándo ocurrió la conducta de esta condena?", undefined, ["Use the offense date, which may differ from the conviction date.", "Use la fecha del delito, que puede ser distinta de la fecha de condena."], "date_or_unknown"),
  q("ca_prop64_age_at_offense", "How old were you when that conduct happened?", "¿Cuántos años tenía cuando ocurrió esa conducta?", undefined, undefined, "number_or_range"),
  q("ca_prop64_court_type", "Was this an adult criminal conviction or a juvenile court adjudication?", "¿Fue una condena penal de adulto o una resolución del tribunal de menores?", [["adult", "Adult criminal court", "Tribunal penal de adultos"], ["juvenile", "Juvenile court", "Tribunal de menores"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_existing_relief", "What Proposition 64 relief has the court already ordered for this conviction?", "¿Qué reparación bajo la Proposición 64 ya ordenó el tribunal para esta condena?", [["none", "No relief ordered", "Ninguna reparación ordenada"], ["reduced", "Reduced to a misdemeanor or infraction", "Reducida a delito menor o infracción"], ["dismissed", "Dismissed", "Desestimada"], ["dismissed_sealed", "Dismissed and sealed", "Desestimada y sellada"], ["unknown", "I am not sure", "No estoy seguro"]], ["Some records were cleared automatically. A new request may offer an additional benefit. A RAP sheet is optional.", "Algunos registros se limpiaron automáticamente. Una nueva solicitud puede ofrecer un beneficio adicional. El historial penal RAP es opcional."]),
  q("ca_prop64_additional_benefit", "What additional result are you asking for?", "¿Qué resultado adicional solicita?", [["sealing", "Seal a dismissed conviction", "Sellar una condena desestimada"], ["dismissal", "Dismiss a conviction already reduced", "Desestimar una condena ya reducida"], ["record_update", "Correct records to reflect the existing order", "Corregir los registros para reflejar la orden existente"], ["other", "Another result", "Otro resultado"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_substance", "What substance did the conviction involve?", "¿Qué sustancia involucró la condena?", [["flower", "Cannabis other than concentrate", "Cannabis que no era concentrado"], ["concentrate", "Concentrated cannabis", "Cannabis concentrado"], ["both", "Both", "Ambos"], ["other", "Another or mixed substance", "Otra sustancia o mezcla"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_flower_grams", "How many grams of cannabis, excluding concentrate, were involved?", "¿Cuántos gramos de cannabis, sin incluir concentrado, estaban involucrados?", undefined, undefined, "number_or_range"),
  q("ca_prop64_concentrate_grams", "How many grams of concentrated cannabis were involved?", "¿Cuántos gramos de cannabis concentrado estaban involucrados?", undefined, undefined, "number_or_range"),
  q("ca_prop64_possession_context", "Where and how was the cannabis possessed or used?", "¿Dónde y cómo se poseía o usaba el cannabis?", [["ordinary", "Possession only, outside the places listed below", "Solo posesión, fuera de los lugares indicados abajo"], ["school_children", "On K–12 school grounds while school or related programs were open", "En una escuela de kínder a grado 12 durante clases o programas relacionados"], ["public_or_vehicle_use", "Smoking or use in public, near children, or in a vehicle", "Fumar o consumir en público, cerca de menores o en un vehículo"], ["custody", "In a jail, prison, or other correctional facility", "En una cárcel, prisión u otro centro correccional"], ["other", "Another context or more than one", "Otro contexto o más de uno"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_plant_count", "How many living cannabis plants did your conduct involve?", "¿Cuántas plantas vivas de cannabis involucró su conducta?", undefined, undefined, "number_or_range"),
  q("ca_prop64_residence_total", "How many living cannabis plants were at the residence in total, including other people's plants?", "¿Cuántas plantas vivas de cannabis había en total en la residencia, incluidas las de otras personas?", undefined, undefined, "number_or_range"),
  q("ca_prop64_private_residence", "Were the plants kept inside a private residence or on its grounds?", "¿Se guardaban las plantas dentro de una residencia privada o en su terreno?", yesNo),
  q("ca_prop64_locked", "Were the plants kept in a locked space?", "¿Se guardaban las plantas en un espacio cerrado con llave?", yesNo),
  q("ca_prop64_public_visible", "Could the plants be seen with unaided vision from a public place?", "¿Se podían ver las plantas a simple vista desde un lugar público?", yesNo),
  q("ca_prop64_local_violation", "Does the case record identify a violated local cultivation ordinance?", "¿Identifica el expediente una ordenanza local de cultivo que se infringió?", yesNo),
  q("ca_prop64_prior_superstrike", "Before this offense, were you convicted of any offense listed below?", "¿Antes de este delito, fue condenado por alguno de los delitos indicados abajo?", yesNo, ["A sexually violent offense; a sexual act with a child under 14 while more than 10 years older; a lewd act with a child under 14; homicide or attempted homicide; soliciting murder; assault with a machine gun on a peace officer or firefighter; possessing a weapon of mass destruction; or a serious or violent felony punishable by life imprisonment or death. Check the conviction record; this is not a question about every felony.", "Un delito sexual violento; un acto sexual con un menor de 14 años siendo más de 10 años mayor; un acto lascivo con un menor de 14 años; homicidio o tentativa de homicidio; solicitar un asesinato; agredir con una ametralladora a un agente del orden o bombero; poseer un arma de destrucción masiva; o un delito grave serio o violento castigado con cadena perpetua o muerte. Revise el registro; esta pregunta no abarca todos los delitos graves."]),
  q("ca_prop64_prior_290c", "Did an earlier conviction require sex-offender registration under Penal Code section 290(c)?", "¿Una condena anterior exigió registro como delincuente sexual bajo la sección 290(c) del Código Penal?", yesNo, ["Check the earlier conviction and registration order, even if you no longer register. Current registration by itself does not answer this question.", "Revise la condena anterior y la orden de registro, aunque ya no deba registrarse. El registro actual por sí solo no responde esta pregunta."]),
  q("ca_prop64_same_section_priors", "How many earlier convictions are recorded under the adult misdemeanor subsection for this same offense?", "¿Cuántas condenas anteriores constan bajo la subsección de delito menor para adultos de este mismo delito?", undefined, ["For cultivation: HSC 11358(c); possession for sale: 11359(b); sale or transport: 11360(a)(2). Count only those exact subsections. If the record does not identify them, choose I am not sure.", "Para cultivo: HSC 11358(c); posesión para venta: 11359(b); venta o transporte: 11360(a)(2). Cuente solo esas subsecciones exactas. Si el registro no las identifica, elija No estoy seguro."], "number_or_range"),
  q("ca_prop64_environmental_record", "Does the cultivation record include any of these environmental violations or findings?", "¿Incluye el registro de cultivo alguna de estas infracciones o determinaciones ambientales?", yesNo, ["Water Code 1052, 13260, 13264, 13272 or 13387; Fish and Game Code 5650, 5652, 1602, 2080 or 3513; Penal Code 374.8; Health and Safety Code 25189.5, 25189.6 or 25189.7; or intentional or grossly negligent substantial harm to public lands or resources.", "Código de Aguas 1052, 13260, 13264, 13272 o 13387; Código de Pesca y Caza 5650, 5652, 1602, 2080 o 3513; Código Penal 374.8; Código de Salud y Seguridad 25189.5, 25189.6 o 25189.7; o daño sustancial intencional o por negligencia grave a tierras o recursos públicos."]),
  q("ca_prop64_knowing_minor_transaction", "Did the offense involve knowingly selling or attempting to sell cannabis to someone under 18?", "¿Involucró el delito vender o intentar vender cannabis a sabiendas a alguien menor de 18 años?", yesNo, ["For a sale/transport conviction under 11360, also include knowingly offering to sell, furnish, administer, or give cannabis to someone under 18.", "Para una condena de venta o transporte bajo 11360, incluya también ofrecer a sabiendas vender, suministrar, administrar o regalar cannabis a alguien menor de 18 años."]),
  q("ca_prop64_used_young_person", "Did you knowingly hire, employ, or use someone age 20 or younger in the cannabis activity?", "¿Contrató, empleó o utilizó a sabiendas a alguien de 20 años o menos en la actividad de cannabis?", yesNo),
  q("ca_prop64_transfer_conduct", "What did the sale or transportation conviction involve?", "¿Qué involucró la condena por venta o transporte?", [["sale", "Sale or offer to sell", "Venta u oferta de venta"], ["transport_for_sale", "Transport for sale without a sale or offer to sell", "Transporte para venta sin venta ni oferta de venta"], ["unpaid_gift", "Gift without payment or compensation", "Regalo sin pago ni compensación"], ["personal_transport", "Transport for personal use, with no sale or gift", "Transporte para uso personal, sin venta ni regalo"], ["other", "Other conduct or more than one", "Otra conducta o más de una"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_cross_border", "Did this conduct cross California's state border?", "¿Cruzó esta conducta la frontera del estado de California?", [["none", "No", "No"], ["import", "Import, attempted import, or offer to import", "Importación, intento u oferta de importar"], ["export_for_sale", "Transport out of California for sale, or an attempt or offer", "Transporte fuera de California para venta, o intento u oferta"], ["other", "Another border crossing", "Otro cruce de frontera"], ["unknown", "I am not sure", "No estoy seguro"]]),
  q("ca_prop64_recipient_age", "How old was the person receiving the unpaid gift?", "¿Cuántos años tenía la persona que recibió el regalo sin compensación?", undefined, undefined, "number_or_range")
];
export const CA_PROP64_FACT_IDS = CA_PROP64_FACT_QUESTIONS.map(q => q.id);
export function caProp64QuestionApplies(a: Answers, id: string): boolean {
  if (CA_PROP64_LEGACY_IDS.includes(id)) return false;
  if (!CA_PROP64_FACT_IDS.includes(id)) return true;
  if (id === "ca_prop64_record_section") return true;
  return caProp64ActiveFactIds(a).includes(id);
}
