import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { uncertaintyState } from "@/lib/expungement-ai/question-answer-state";

// GA-12 Q-51b8ea53b02426f2f685 / QD-bd6b15fff22cbe1501cb; adopted WY.memo wy_fel_1502 only.
export const WY_1502_ROUTE = "felony-conviction-expungement-w-s-7-13-1502";
export const WY_1502_SOURCE = "WY.memo:wy_fel_1502;WS7-13-1502;Lynch2026WY8";
export function wy1502Context(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "WY" && pathway === WY_1502_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "8be51e84e828de3bece45e51b68744cc68ba6662c7db7991bba8d70a565e00aa"
    && profile.pathways.some(p => p.id === WY_1502_ROUTE);
}
function question(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string, type = "single_choice"): PublicQuestion {
  return { id, prompt, helperText, type, stage: "pathway_routing", required: false, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
    options: type === "single_choice" ? ["Yes", "No", "I am not sure"] : null,
    ...(type === "single_choice" ? { optionDisplay: {
      Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } },
      "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    } } : {}), ...(id === "wy1502_citations" ? { multiline: true } : {}),
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
// Supplemental EN/ES is source-grounded draft copy, pending qualified review.
export const WY_1502_QUESTIONS = [
  question("wy1502_citations", "Which Wyoming statute section and subsection appears for each final felony on the judgment and sentence?", "Copy one final citation per line, including amendments. Do not substitute an original charge or decide whether an offense is excluded. The full statutory exclusion list requires attorney review.", "¿Qué sección y subsección de Wyoming aparece para cada delito grave final en la sentencia?", "Copie una referencia final por línea, incluidas las modificaciones. No sustituya un cargo original ni decida si el delito está excluido. La lista completa de exclusiones requiere revisión de un abogado.", "text_or_unknown"),
  question("wy1502_completed_deferral", "Was this a deferred prosecution or deferred sentencing you completed, followed by dismissal, rather than a conviction?", "Read the final disposition. A completed felony deferral under 7-13-301 is not a conviction for this route; a guilty plea at the start does not establish a final conviction.", "¿Fue un proceso o una sentencia aplazada que completó y que terminó en desestimación, en vez de una condena?", "Lea la resolución final. Un aplazamiento por delito grave completado conforme a 7-13-301 no es una condena para esta vía; una declaración inicial de culpabilidad no establece una condena final."),
  question("wy1502_multiple", "Are you asking to clear more than one felony?", "Keep each final felony separate. This does not decide whether they can be included together.", "¿Solicita borrar más de un delito grave?", "Mantenga separado cada delito grave final. Esto no decide si pueden incluirse juntos."),
  question("wy1502_related", "Did all the requested felonies arise from the same occurrence or a related course of events?", "Describe what happened from your records; the court must review whether the statutory grouping rule is met.", "¿Todos los delitos graves solicitados surgieron del mismo suceso o de una serie relacionada de hechos?", "Use los hechos de sus expedientes; el tribunal debe revisar si se cumple la regla legal de agrupación."),
  question("wy1502_terms_ended", "On what date did all terms of the sentence end, including probation?", "Use YYYY-MM-DD from discharge records. This is not the conviction date or release from custody. The ten-year period and completion of every term need review; an old Yes answer does not supply a date.", "¿En qué fecha terminaron todos los términos de la sentencia, incluida la probation?", "Use AAAA-MM-DD de los documentos de alta. No es la fecha de condena ni de salida de prisión. El plazo de diez años y todos los términos requieren revisión; una respuesta anterior Sí no aporta una fecha.", "text_or_unknown"),
  question("wy1502_program_complete", "Have you completed every court-ordered program in this case?", "If no program was ordered, answer Yes. This is separate from the date sentence and probation terms expired.", "¿Ha completado todos los programas ordenados por el tribunal en este caso?", "Si no se ordenó ningún programa, responda Sí. Esto es independiente de la fecha en que terminaron la sentencia y la probation."),
  question("wy1502_restitution_paid", "Has all court-ordered restitution in this case been paid in full?", "If no restitution was ordered, answer Yes. A general financial-obligations answer does not establish this specific fact.", "¿Se ha pagado por completo toda la restitución ordenada por el tribunal en este caso?", "Si no se ordenó restitución, responda Sí. Una respuesta general sobre obligaciones económicas no establece este dato específico."),
  question("wy1502_other_felony", "Other than the felonies in this request, have you ever pled guilty, pled no contest, or been convicted of a felony anywhere?", "Include your entire record, not only later convictions or Wyoming cases.", "Aparte de los delitos graves de esta solicitud, ¿alguna vez se declaró culpable, no se opuso a los cargos o fue condenado por un delito grave en cualquier lugar?", "Incluya todos sus antecedentes, no solo condenas posteriores o casos de Wyoming."),
  question("wy1502_firearm", "Did the offense involve use or attempted use of a firearm?", "Answer from the facts. Any Yes needs attorney review, including a claimed Title 23 exception; a weapons category or a No answer does not decide the exclusion list.", "¿El delito implicó el uso o intento de uso de un arma de fuego?", "Responda según los hechos. Cualquier Sí requiere revisión de un abogado, incluso si cree que se aplica una excepción del Título 23; una categoría de armas o un No no decide las exclusiones."),
  question("wy1502_prior_relief", "Have you previously received a felony-conviction expungement under W.S. 7-13-1502?", "This is the one-time limit for this section alone. A prior pardon, another section or a general prior-relief answer is not the same fact.", "¿Ha recibido anteriormente una eliminación de condena por delito grave conforme a W.S. 7-13-1502?", "Este es el límite de una vez para esta sección. Un indulto previo, otra sección o una respuesta general sobre medidas previas no es el mismo dato."),
  question("wy1502_victim", "Was there an identifiable victim in this case?", "This identifies a notice and review issue. It does not supply the victim's consent or the court's finding about danger.", "¿Hubo una víctima identificable en este caso?", "Esto identifica un asunto de notificación y revisión. No aporta el consentimiento de la víctima ni la determinación judicial sobre peligrosidad."),
  question("wy1502_registration", "Are you now, or have you ever been, required to register as a sex offender for this offense?", "Use the requirement for this offense. This fact is separate from other offenses and from the court's statutory exclusion review.", "¿Se le exige ahora, o se le ha exigido alguna vez, registrarse como delincuente sexual por este delito?", "Use el requisito correspondiente a este delito. Este dato es independiente de otros delitos y de la revisión judicial de exclusiones.")
];
export const WY_1502_FACT_IDS = WY_1502_QUESTIONS.map(q => q.id);
export function wy1502QuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, a: Record<string, unknown>, id: string): boolean {
  return !WY_1502_FACT_IDS.includes(id) || wy1502Context(profile, pathway) && (id !== "wy1502_related" || a.wy1502_multiple === "Yes");
}
function text(value: unknown): string | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    value = v.unknown === false && Object.keys(v).every(k => ["value", "unknown"].includes(k)) ? v.value : undefined;
  }
  return typeof value === "string" && value.trim() && !uncertaintyState(value) ? value.trim() : undefined;
}
export const WY_1502_COPY = {
  missing: "The final judgment, deferral, grouping, sentence-term date and separate history facts need confirmation. Old categories and generic completion or prior-relief answers cannot supply these facts. No eligibility or payment is established.",
  deferral: "A completed felony deferral ending in discharge and dismissal is not a conviction for 7-13-1502. The adopted review identifies no Wyoming expungement route for that completed felony deferral. Correction of an inaccurate criminal-history record is different and is not an expungement packet offered here. Stop for review.",
  disposition: "The saved disposition does not establish a final felony conviction for this route. Check the final judgment and any deferral or dismissal; do not classify the case from an old charge or category.",
  grouping: "The requested felonies are not reported as arising from the same occurrence or related events. Review each final judgment and the grouping rule before using this route.",
  completion: "The reported program or restitution is incomplete. Review all sentence and probation terms, court programs and restitution separately. No ten-year waiting period has been established.",
  history: "Another felony plea or conviction, registration for this offense, or prior relief under 7-13-1502 requires attorney review. General history answers and other Wyoming sections cannot replace these facts.",
  firearm: "Reported use or attempted use of a firearm requires attorney review, even if a Title 23 exception is claimed. No exception or eligibility has been established.",
  date: "Copy a real sentence-term expiration date from the record, including all probation. The ten-year period cannot be inferred from a conviction date, custody release or general timing bucket.",
  record_review: "The final citations and complete statutory exclusion list still require attorney review, including violent, sexual, domestic, child, weapons, corrections, escape, bribery and other listed offenses. The ten-year period runs from expiration of all sentence terms, including probation. The court decides grouping and danger; victim notice and objections remain separate. No eligibility, rights restoration, packet readiness or payment is established."
} as const;
export function wy1502Facts(a: Record<string, unknown>): { code: keyof typeof WY_1502_COPY; ids: string[] } {
  if (a.wy1502_completed_deferral === "Yes") return { code: "deferral", ids: [] };
  const ids = WY_1502_FACT_IDS.filter(id => {
    if (id === "wy1502_related" && a.wy1502_multiple !== "Yes") return false;
    return ["wy1502_citations", "wy1502_terms_ended"].includes(id) ? !text(a[id]) : !(typeof a[id] === "string" && ["Yes", "No"].includes(a[id] as string));
  });
  if (ids.length) return { code: "missing", ids };
  const review = (code: keyof typeof WY_1502_COPY) => ({ code, ids: [] });
  if (a.case_outcome !== "Felony conviction") return review("disposition");
  if (a.wy1502_multiple === "Yes" && a.wy1502_related !== "Yes") return review("grouping");
  if (a.wy1502_program_complete !== "Yes" || a.wy1502_restitution_paid !== "Yes") return review("completion");
  if (a.wy1502_other_felony === "Yes" || a.wy1502_prior_relief === "Yes" || a.wy1502_registration === "Yes") return review("history");
  if (a.wy1502_firearm === "Yes") return review("firearm");
  const date = text(a.wy1502_terms_ended)!;
  const parsed = new Date(date + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return { code: "date", ids: ["wy1502_terms_ended"] };
  return review("record_review");
}
