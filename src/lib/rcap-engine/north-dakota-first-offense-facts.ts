import type { QuestionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

export const ND_FIRST_OFFENSE_ROUTE = "first-offense-possession-sealing";
export const ND_FIRST_OFFENSE_SOURCE = "ND.memo:nd-marijuana-first-offense-seal;N.D.C.C.19-03.1-23(9);69b215d3673600b18ead7422699eb4e6636de6fe";
export function ndFirstOffenseFactContract(profile: EngineProfile, pathwayId: string | null | undefined): boolean {
  const route = profile.pathways.find(p => p.id === pathwayId);
  return profile.jurisdiction.code === "ND" && pathwayId === ND_FIRST_OFFENSE_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7"
    && route?.sourceRef === "section:90-95; corpus-unit:38" && (route as {automatic?: boolean}).automatic === false;
}
type Choice = [string, string, string];
const unknown: Choice = ["unknown", "I am not sure", "No estoy seguro"];
const scope = "Use the actual judgment and charging record for this case. Do not infer these facts from the offense level or a broad drug category. Unknown answers stay unresolved. These answers do not authorize a packet or decide what the court will grant.";
const scopeEs = "Use la sentencia y el documento de acusación reales de este caso. No deduzca estos hechos del nivel del delito ni de una categoría general de drogas. Las respuestas desconocidas quedan sin resolver. Estas respuestas no autorizan un paquete ni deciden lo que concederá el tribunal.";
function fact(id: string, prompt: string, es: string, choices?: Choice[], type: PublicQuestion["type"] = "single_choice"): PublicQuestion {
 return { id, prompt, helperText: scope, stage: "pathway_routing", type, required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
  options: choices?.map(c=>c[0]) ?? null,
  ...(choices ? { optionDisplay: Object.fromEntries(choices.map(([value,label,translated])=>[value,{label,translations:{es:{label:translated}}}])) } : {}),
  translations: {es:{prompt:es,helperText:scopeEs}} };
}
/** Exact adopted source keys, not aliases for nd_charged_quantity or
 * nd_first_offense_confirmation. The reviewed ND plan successor already names
 * their replacement. Earlier raw values remain history, never predicate input.
 * Offence date/case/county/court remain separate filing handbacks. */
export const ND_FIRST_OFFENSE_QUESTIONS: PublicQuestion[] = [
 fact("mjJudgmentDate", "On what date did the court enter the judgment of guilt?", "¿En qué fecha dictó el tribunal la sentencia de culpabilidad?", undefined, "date_or_unknown"),
 fact("mjSubstance", "Was the charge marijuana or tetrahydrocannabinol?", "¿El cargo fue por marihuana o tetrahidrocannabinol?", [["marijuana","Marijuana","Marihuana"],["thc","Tetrahydrocannabinol (THC)","Tetrahidrocannabinol (THC)"],["other","Another substance","Otra sustancia"],unknown]),
 fact("mjQuantity", "What quantity was charged?", "¿Qué cantidad figura en la acusación?", undefined, "text_or_unknown"),
 fact("mjFirstOffence", "Was this your first offence of this kind?", "¿Fue esta su primera infracción de este tipo?", [["yes","Yes","Sí"],["no","No","No"],unknown]),
 fact("mjSubsequentConviction", "After the judgment of guilt in this case, were you convicted of another violation of North Dakota's controlled substances chapter?", "Después de la sentencia de culpabilidad en este caso, ¿fue condenado por otra infracción del capítulo de sustancias controladas de Dakota del Norte?", [["No","No","No"],["Yes","Yes","Sí"],unknown]),
 fact("mjOtherCharges", "Were there any other charges in the same case besides the marijuana or THC possession?", "¿Hubo otros cargos en el mismo caso además de la posesión de marihuana o THC?", [["No","No","No"],["Yes","Yes","Sí"],unknown])
];
ND_FIRST_OFFENSE_QUESTIONS[2] = { ...ND_FIRST_OFFENSE_QUESTIONS[2], helperText: "Copy one amount and unit from the charging document, for example one ounce or 1.5 grams. Do not convert units or combine charges. " + scope,
 translations: {es:{prompt:ND_FIRST_OFFENSE_QUESTIONS[2].translations!.es!.prompt,
 helperText:"Copie una sola cantidad y unidad del documento de acusación, por ejemplo 1 ounce (onza) o 1.5 grams (gramos). No convierta unidades ni combine cargos. " + scopeEs}} };
export const ND_FIRST_OFFENSE_FACT_IDS = ND_FIRST_OFFENSE_QUESTIONS.map(q=>q.id);
const convictions = ["Misdemeanor conviction", "Felony conviction"];
export function ndFirstOffenseFactApplies(profile: EngineProfile, pathwayId: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
 const active = ndFirstOffenseFactContract(profile,pathwayId)
  && (convictions.includes(answers.case_outcome as string) || ND_FIRST_OFFENSE_FACT_IDS.some(key=>Object.hasOwn(answers,key)));
 // The neighbouring routes' timing bucket does not decide this source case.
 // This is collection applicability only; retained values are never rewritten.
 if (id === "resolved_timing_bucket" && active) return false;
 return !ND_FIRST_OFFENSE_FACT_IDS.includes(id) || active;
}
// Exact source parser body from the completed69b215 family. The caller below
// first restricts input to one unambiguous amount/unit; it never widens this
// parser's statutory unit/quantity semantics or calculates the disputed clock.
function parseQuantity(raw: string): { amount: number; unit: string } | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const words: Readonly<Record<string, number>> = {
    "one-half": 0.5, "a half": 0.5, half: 0.5, "one half": 0.5,
    "one-quarter": 0.25, "a quarter": 0.25, quarter: 0.25, "one quarter": 0.25,
    one: 1, two: 2, three: 3, four: 4, five: 5
  };
  const unitMatch = /\b(ounces?|oz|grams?|g|pounds?|lbs?|kilograms?|kg)\b/.exec(text);
  if (!unitMatch) return null;
  const unitRaw = unitMatch[1];
  const unit = /^(ounces?|oz)$/.test(unitRaw)
    ? "ounce"
    : /^(grams?|g)$/.test(unitRaw)
      ? "gram"
      : /^(pounds?|lbs?)$/.test(unitRaw)
        ? "pound"
        : "kilogram";

  const fraction = /\b(\d+)\s*\/\s*(\d+)\b/.exec(text);
  if (fraction) {
    const value = Number(fraction[1]) / Number(fraction[2]);
    return Number.isFinite(value) ? { amount: value, unit } : null;
  }
  const decimal = /\b(\d+(?:\.\d+)?)\b/.exec(text);
  if (decimal) return { amount: Number(decimal[1]), unit };
  for (const [word, value] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return { amount: value, unit };
  }
  return null;
}

function sourceText(raw: unknown): string | undefined {
 if (raw && typeof raw === "object" && !Array.isArray(raw)) {
  const wrapper = raw as Record<string, unknown>;
  if (wrapper.unknown !== false || Object.keys(wrapper).some(key => key !== "value" && key !== "unknown")) return undefined;
  raw = wrapper.value;
 }
 return typeof raw === "string" ? raw : undefined;
}
function judgmentDateKnown(raw: unknown, today: string): boolean {
 if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
 const date = new Date(raw + "T00:00:00Z");
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === raw && raw <= today;
}
function sourceQuantity(raw: unknown, substance: unknown) {
 if (typeof raw !== "string" || !/^(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|one-half|a half|half|one half|one-quarter|a quarter|quarter|one quarter|one|two|three|four|five)\s+(?:ounces?|oz|grams?|g|pounds?|lbs?|kilograms?|kg)$/i.test(raw.trim())) return null;
 const quantity = parseQuantity(raw);
 const unit = substance === "marijuana" ? "ounce" : substance === "thc" ? "gram" : null;
 return quantity && quantity.amount > 0 && (!unit || quantity.unit === unit) ? quantity : null;
}
/** Presentation only: the same exact source-value test as evaluation. Never
 * rewrites raw answers or changes authority; known adverse quantities stay known. */
export function ndFirstOffenseAnswerState(state: string, pathwayId: string | null | undefined,
 id: string, raw: unknown, answers: Record<string, unknown>, fallback: QuestionAnswerState,
 today = new Date().toISOString().slice(0,10)): QuestionAnswerState {
 if (state !== "ND" || pathwayId !== ND_FIRST_OFFENSE_ROUTE || fallback !== "known_valid") return fallback;
 if (id === "mjJudgmentDate" && !judgmentDateKnown(sourceText(raw),today)) return "invalid";
 if (id === "mjQuantity" && !sourceQuantity(sourceText(raw),sourceText(answers.mjSubstance))) return "invalid";
 return fallback;
}

export const ND_FIRST_OFFENSE_COPY = {
 missing: ["Confirm the judgment, charged substance and quantity, first-offence status and later case history from the records. A broad category does not establish these facts.", "Confirme en los expedientes la sentencia, la sustancia y cantidad acusadas, la condición de primera infracción y los antecedentes posteriores. Una categoría general no establece estos hechos."],
 outcome: ["This route requires a guilty plea or finding and a judgment of guilt. Confirm the actual disposition; a dismissed case or an ambiguous adjudication does not establish that conviction.", "Esta vía requiere una declaración o determinación de culpabilidad y una sentencia de culpabilidad. Confirme la resolución real; un caso desestimado o una adjudicación ambigua no establece esa condena."],
 quantity: ["The charged quantity is not established as one amount in the source unit: ounces for marijuana or grams for THC. Keep the record's wording and obtain clarification rather than converting or guessing.", "La cantidad acusada no está establecida como una sola cantidad en la unidad de la fuente: onzas para marihuana o gramos para THC. Conserve el texto del expediente y pida aclaración en lugar de convertir o adivinar."],
 above_threshold: ["The charged quantity exceeds this route's one-ounce marijuana or two-gram THC limit. This finding does not decide another North Dakota remedy.", "La cantidad acusada supera el límite de esta vía de una onza de marihuana o dos gramos de THC. Esta conclusión no decide otro recurso de Dakota del Norte."],
 substance: ["This source-defined route concerns marijuana or tetrahydrocannabinol possession. The stated substance does not establish that scope.", "Esta vía definida por la fuente se refiere a la posesión de marihuana o tetrahidrocannabinol. La sustancia indicada no establece ese alcance."],
 first_offence: ["The record answer says this was not a first offence of this kind. This route requires that fact; it is not a general clean-record rule.", "La respuesta indica que esta no fue una primera infracción de este tipo. Esta vía exige ese hecho; no es una regla general de antecedentes limpios."],
 subsequent: ["A further controlled-substance conviction needs review. The retained source does not resolve the two-year anchor, so no date calculation or assumption clears that conviction here.", "Una condena posterior por sustancias controladas necesita revisión. La fuente conservada no resuelve desde qué fecha contar los dos años, por lo que aquí ningún cálculo ni suposición permite omitir esa condena."],
 other_charges: ["Other charges in the same case need separate review. This source reaches the court record of this possession conviction, not every charge in the case.", "Otros cargos en el mismo caso necesitan revisión por separado. Esta fuente abarca el expediente judicial de esta condena por posesión, no todos los cargos del caso."],
 supported: ["The supplied facts fit the retained first-offence possession criteria with no subsequent controlled-substance conviction reported. The court determines relief; packet verification and delivery remain unavailable.", "Los hechos proporcionados concuerdan con los criterios conservados de primera infracción de posesión, sin una condena posterior por sustancias controladas declarada. El tribunal determina la reparación; la verificación y entrega del paquete siguen sin estar disponibles."]
} as const;
type Code = keyof typeof ND_FIRST_OFFENSE_COPY;
type Decision = { status: "not_applicable" | "missing" | "review" | "excluded" | "supported"; code: Code; ids: string[] };
export function ndFirstOffenseFacts(profile: EngineProfile, pathwayId: string | null | undefined, a: Record<string, unknown>, today: string): Decision {
 const fail = (status: Decision["status"], code: Code, ids: string[] = []): Decision => ({status,code,ids});
 if (!ndFirstOffenseFactApplies(profile,pathwayId,a,"mjJudgmentDate")) return fail("not_applicable","missing");
 if (!convictions.includes(a.case_outcome as string)) return fail("review","outcome",["case_outcome"]);
 const missing = ND_FIRST_OFFENSE_QUESTIONS.filter(q=>{
  const raw=a[q.id];
  if(typeof raw!=="string" || !raw.trim() || ["unknown","I am not sure"].includes(raw)) return true;
  if(Array.isArray(q.options)) return !q.options.includes(raw);
  if(q.id==="mjJudgmentDate") return !judgmentDateKnown(raw,today);
  return false;
 }).map(q=>q.id);
 if(missing.length) return fail("missing","missing",missing);
 if(a.mjSubstance==="other") return fail("excluded","substance",["mjSubstance"]);
 const quantity=sourceQuantity(a.mjQuantity,a.mjSubstance);
 if(!quantity) return fail("missing","quantity",["mjQuantity"]);
 if(quantity.amount>(a.mjSubstance==="marijuana"?1:2)) return fail("excluded","above_threshold",["mjQuantity"]);
 if(a.mjFirstOffence!=="yes") return fail("excluded","first_offence",["mjFirstOffence"]);
 if(a.mjSubsequentConviction!=="No") return fail("review","subsequent",["mjSubsequentConviction"]);
 if(a.mjOtherCharges!=="No") return fail("review","other_charges",["mjOtherCharges"]);
 return fail("supported","supported");
}
