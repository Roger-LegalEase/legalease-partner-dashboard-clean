import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { georgiaConvictionCitation } from "@/lib/rcap-engine/georgia-pardon-facts";

// GA-12 Q-2d80a89dd926657a1873 / QD-bd6b15fff22cbe1501cb; adopted GA.memo ga-misd-j4.
export const GA_SB288_ROUTE = "sb-288-misdemeanor-conviction-restriction-and-sealing";
export const GA_SB288_SOURCE = "GA.memo:ga-misd-j4;OCGA35-3-37(j)(4)(A)-(C)";
export function georgiaSb288Context(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "GA" && pathway === GA_SB288_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812"
    && profile.pathways.some(p => p.id === GA_SB288_ROUTE);
}
const choices = ["Yes", "No", "I am not sure"];
function question(id: string, prompt: string, helperText: string, type: string, esPrompt: string, esHelper: string): PublicQuestion {
  return { id, prompt, helperText, type, stage: "pathway_routing", required: false, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter", options: type === "single_choice" ? choices : null,
    ...(type === "single_choice" ? { optionDisplay: {
      Yes: { label: "Yes", translations: { es: { label: "Sí" } } },
      No: { label: "No", translations: { es: { label: "No" } } },
      "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    } } : {}), translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
// Supplemental EN/ES copy is source-grounded draft, pending qualified review.
export const GA_SB288_QUESTIONS: PublicQuestion[] = [
  question("ga_sb288_conviction_count", "How many final misdemeanor conviction counts are you asking to restrict in this case?", "Use the final disposition. Count each conviction separately, even when two counts use the same Code section. Do not count an original charge that was dismissed or amended away.", "number_or_range", "¿Cuántos cargos con condena final por delito menor solicita restringir en este caso?", "Use la resolución final. Cuente cada condena por separado, aunque dos cargos correspondan a la misma sección del Código. No cuente un cargo original desestimado o sustituido."),
  { ...question("ga_sb288_final_citations", "Which Georgia Code section and subsection appears for each final conviction?", "Enter one final conviction citation per line, in count order. Use the final amended conviction, not an original accusation or a broad offense category. Keep separate counts on separate lines, including repeated citations.", "text_or_unknown", "¿Qué sección y subsección del Código de Georgia corresponde a cada condena final?", "Ingrese una referencia de condena final por línea, en orden de los cargos. Use la condena final modificada, no la acusación original ni una categoría general. Mantenga cada cargo en una línea distinta, aunque se repita la referencia."), multiline: true },
  question("ga_sb288_single_incident", "Did all these misdemeanor convictions arise from one incident?", "This question concerns the convictions listed for this request. It does not establish how many lifetime restrictions you have used.", "single_choice", "¿Todas estas condenas por delitos menores surgieron de un solo incidente?", "La pregunta se refiere a las condenas de esta solicitud. No establece cuántas restricciones de por vida ha utilizado."),
  question("ga_sb288_under21_at_arrest", "Were you under 21 years old at the time of arrest for these convictions?", "Use your age at arrest, not at the offense or conviction. This exception concerns only family violence simple assault, simple battery or battery. It does not remove other exclusions.", "single_choice", "¿Tenía menos de 21 años al ser arrestado por estas condenas?", "Use su edad al ser arrestado, no al cometer el delito ni al ser condenado. Esta excepción solo se refiere a simple assault, simple battery o battery por violencia familiar. No elimina otras exclusiones."),
  question("ga_sb288_stalking_family_violence", "Does the final record identify the stalking conviction as involving family violence?", "Check the final conviction record for section 16-5-90. A generic stalking label does not resolve this fact.", "single_choice", "¿El expediente final identifica la condena por stalking como un caso de violencia familiar?", "Revise el expediente final de la condena por la sección 16-5-90. Una etiqueta general de stalking no resuelve este dato."),
  question("ga_sb288_convictions_before_filing", "During the four years immediately before the planned filing, were you convicted of any crime in any jurisdiction, excluding nonserious traffic offenses?", "Count backward from the planned filing date. This is separate from completing every sentence term; it is not four years after sentence completion. If a traffic offense's classification or an out-of-state conviction is uncertain, choose I am not sure.", "single_choice", "¿Durante los cuatro años inmediatamente anteriores a la presentación prevista, fue condenado por algún delito en cualquier jurisdicción, sin contar infracciones de tránsito no graves?", "Cuente hacia atrás desde la fecha prevista de presentación. Esto es independiente de completar todos los términos de la sentencia; no son cuatro años después de completarla. Si no sabe cómo se clasifica una infracción de tránsito o una condena de otro estado, elija No estoy seguro.")
];
export const GA_SB288_FACT_IDS = GA_SB288_QUESTIONS.map(q => q.id);
function known(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as Record<string, unknown>;
    return wrapped.unknown === false && Object.keys(wrapped).every(k => ["value", "unknown"].includes(k)) ? wrapped.value : undefined;
  }
  return value;
}
function citations(a: Record<string, unknown>) {
  const value = known(a.ga_sb288_final_citations);
  return typeof value === "string" && value.trim() ? value.trim().split(/\r?\n/).map(georgiaConvictionCitation) : [];
}
function familyAgeCitation(c: ReturnType<typeof georgiaConvictionCitation>): boolean {
  if (!c) return false;
  const subsection = ({ "16-5-20": "(d)", "16-5-23": "(f)", "16-5-23.1": "(f)" } as Record<string, string>)[c.section];
  return Boolean(subsection && c.subsection?.startsWith(subsection));
}
export function georgiaSb288QuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, a: Record<string, unknown>, id: string): boolean {
  if (!GA_SB288_FACT_IDS.includes(id)) return true;
  if (!georgiaSb288Context(profile, pathway)) return false;
  if (id === "ga_sb288_single_incident") return Number(known(a.ga_sb288_conviction_count)) > 1;
  if (id === "ga_sb288_under21_at_arrest") return citations(a).some(familyAgeCitation);
  if (id === "ga_sb288_stalking_family_violence") return citations(a).some(c => c?.section === "16-5-90");
  return true;
}
// Supplemental result EN/ES copy is source-grounded draft, pending qualified review.
export const GA_SB288_COPY = {
  classification: ["Check the final disposition and how this case ended. This request concerns misdemeanor convictions; neither an original accusation nor a broad saved category establishes that fact.", "Consulte la resolución final y cómo terminó este caso. Esta solicitud se refiere a condenas por delitos menores; ni una acusación original ni una categoría general guardada establece ese dato."],
  missing: ["Check the requested final conviction and four-year facts. Earlier category answers, age when the offense happened and general criminal history do not establish these different facts.", "Consulte los datos solicitados sobre la condena final y los cuatro años. Las categorías anteriores, la edad al cometer el delito y los antecedentes penales generales no establecen estos datos distintos."],
  citation_review: ["The final conviction citations and count need review. Enter one exact Georgia Code citation per final conviction, including its subsection where shown; do not combine original and amended charges or infer a citation from an offense name.", "Las referencias y el número de condenas finales requieren revisión. Ingrese una referencia exacta al Código de Georgia por cada condena final, incluida la subsección si aparece; no combine cargos originales y modificados ni deduzca una referencia del nombre de un delito."],
  incident_review: ["The reported convictions do not establish a series arising from one incident. Review the final counts and their incident before continuing; no lifetime restriction count has been inferred.", "Las condenas declaradas no establecen una serie surgida de un solo incidente. Revise los cargos finales y su incidente antes de continuar; no se ha deducido cuántas restricciones de por vida ha utilizado."],
  offense_review: ["The reported conviction facts raise a listed SB 288 offense exclusion. That classification needs review before you continue. This is not an eligibility decision or permission to purchase a packet.", "Los datos declarados sobre la condena plantean una exclusión por delito enumerada en SB 288. Esa clasificación requiere revisión antes de continuar. Esto no es una decisión de elegibilidad ni un permiso para comprar un paquete."],
  exception_review: ["The reported final citation needs its specific subsection or exception reviewed. Age under 21 at arrest concerns only the three listed family violence assault or battery exceptions; it does not remove other exclusions.", "La referencia final declarada requiere revisar su subsección o excepción específica. Tener menos de 21 años al ser arrestado solo se refiere a las tres excepciones enumeradas de agresión o lesiones por violencia familiar; no elimina otras exclusiones."],
  later_conviction_review: ["The reported conviction within four years before the planned filing needs review. That period runs backward from filing in every jurisdiction and is separate from sentence completion. A broad waiting-period answer does not resolve it.", "La condena declarada dentro de los cuatro años anteriores a la presentación prevista requiere revisión. Ese período se cuenta hacia atrás desde la presentación e incluye todas las jurisdicciones; es independiente de completar la sentencia. Una respuesta general sobre el período de espera no lo resuelve."],
  record_review: ["The exact final conviction facts have been retained for review. The offense classification, four-year period before filing, sentence completion, pending charges, prior restrictions and court decision still need verification. No eligibility or completed waiting period has been established, and no payment is available.", "Los datos exactos de la condena final se han conservado para revisión. Todavía deben verificarse la clasificación del delito, los cuatro años anteriores a la presentación, el cumplimiento de la sentencia, los cargos pendientes, las restricciones anteriores y la decisión judicial. No se ha establecido la elegibilidad ni el cumplimiento del período de espera, y no está disponible el pago."],
} as const;
type Decision = { status: "missing" | "review"; code: keyof typeof GA_SB288_COPY; ids: string[] };
export function georgiaSb288Facts(a: Record<string, unknown>): Decision {
  if (known(a.case_outcome) !== "Misdemeanor conviction") return { status: "missing", code: "classification", ids: ["case_outcome"] };
  const count = known(a.ga_sb288_conviction_count);
  const countValid = typeof count === "number" ? Number.isSafeInteger(count) && count > 0
    : typeof count === "string" && /^[1-9]\d*$/.test(count) && Number.isSafeInteger(Number(count));
  const missing = GA_SB288_FACT_IDS.filter(id => {
    if (id === "ga_sb288_conviction_count") return !countValid;
    if (id === "ga_sb288_final_citations") return !citations(a).length;
    if (id === "ga_sb288_single_incident" && !(countValid && Number(count) > 1)) return false;
    if (id === "ga_sb288_under21_at_arrest" && !citations(a).some(familyAgeCitation)) return false;
    if (id === "ga_sb288_stalking_family_violence" && !citations(a).some(c => c?.section === "16-5-90")) return false;
    return !["Yes", "No"].includes(String(known(a[id])));
  });
  if (missing.length) return { status: "missing", code: "missing", ids: missing };
  const parsed = citations(a);
  if (parsed.length !== Number(count) || parsed.some(c => c === null)) return { status: "review", code: "citation_review", ids: ["ga_sb288_conviction_count", "ga_sb288_final_citations"] };
  if (Number(count) > 1 && known(a.ga_sb288_single_incident) !== "Yes") return { status: "review", code: "incident_review", ids: ["ga_sb288_single_incident"] };
  for (const c of parsed) {
    if (!c) continue;
    if (familyAgeCitation(c)) {
      if (known(a.ga_sb288_under21_at_arrest) === "No") return { status: "review", code: "offense_review", ids: ["ga_sb288_final_citations", "ga_sb288_under21_at_arrest"] };
    } else if (["16-5-20", "16-5-23", "16-5-23.1", "16-6-8"].includes(c.section)) {
      if (c.section === "16-6-8" && c.subsection === "(b)") return { status: "review", code: "offense_review", ids: ["ga_sb288_final_citations"] };
      return { status: "review", code: "exception_review", ids: ["ga_sb288_final_citations"] };
    }
    if (["16-5-95", "16-6-4", "16-6-5", "16-6-5.1", "16-6-10", "16-6-11", "16-6-12", "16-6-22.1", "16-10-24.3", "16-11-61"].includes(c.section)
      || c.section === "16-5-90" && known(a.ga_sb288_stalking_family_violence) === "Yes") return { status: "review", code: "offense_review", ids: ["ga_sb288_final_citations"] };
    if (c.section.startsWith("16-8-") && !["16-8-14", "16-8-14.1"].includes(c.section)) return { status: "review", code: "exception_review", ids: ["ga_sb288_final_citations"] };
  }
  if (known(a.ga_sb288_convictions_before_filing) === "Yes") return { status: "review", code: "later_conviction_review", ids: ["ga_sb288_convictions_before_filing"] };
  // The adopted specification makes offense classification a review stop,
  // including unenumerated minors/traffic provisions; parsed syntax is not eligibility.
  return { status: "review", code: "record_review", ids: [] };
}
