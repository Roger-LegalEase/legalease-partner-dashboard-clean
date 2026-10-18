import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { uncertaintyState } from "@/lib/expungement-ai/question-answer-state";

// GA-12 Q-d33e933319baaaaf750b / QD-bd6b15fff22cbe1501cb; CT.memo ct-cleanslate-petition.
export const CT_PETITION_ROUTE = "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202";
export const CT_PETITION_SOURCE = "CT.memo:ct-cleanslate-petition;CGS54-142a(e),(i)";
export function ctPetitionContext(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "CT" && pathway === CT_PETITION_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "9417e1863420e1df725060c38960b7ac19da40f59f1f329e30436a0d31a8589a"
    && profile.pathways.some(p => p.id === CT_PETITION_ROUTE);
}
function question(id: string, prompt: string, helperText: string, type: string, esPrompt: string, esHelper: string): PublicQuestion {
  return { id, prompt, helperText, type, stage: "pathway_routing", required: false, contextOnly: false,
    doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
    options: type === "single_choice" ? ["Yes", "No", "I am not sure"] : null,
    ...(type === "single_choice" ? { optionDisplay: {
      Yes: { label: "Yes", translations: { es: { label: "Sí" } } },
      No: { label: "No", translations: { es: { label: "No" } } },
      "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    } } : {}), ...(type === "text_or_unknown" ? { multiline: true } : {}),
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
// Supplemental EN/ES copy is a source-grounded draft pending qualified review.
export const CT_PETITION_QUESTIONS: PublicQuestion[] = [
  question("ct_petition_count", "How many counts are on this docket?", "Copy the total from this case record, including counts that did not end in conviction. Do not decide which counts can be erased. Use a separate request for each docket.", "number_or_range", "¿Cuántos cargos hay en este expediente?", "Copie el total del expediente, incluidos los cargos sin condena. No decida cuáles pueden borrarse. Use una solicitud distinta para cada expediente."),
  question("ct_petition_citations", "Which statute section and subsection appears for each final conviction?", "Copy one final conviction citation per line, in count order, including repeated citations. Use the final amended conviction, not the original charge. Keep counts without a conviction out of this list; they still need review.", "text_or_unknown", "¿Qué sección y subsección de la ley aparece para cada condena final?", "Copie una referencia por línea, en orden de los cargos, aunque se repita. Use la condena final modificada, no el cargo original. No incluya cargos sin condena en esta lista; aún requieren revisión."),
  question("ct_petition_offense_dates", "What date did the conduct for each listed conviction happen?", "Copy one date per line as YYYY-MM-DD, in the same order as the final citations. These are conduct dates, not arrest, sentencing or conviction dates. Keep an uncertain date unknown.", "text_or_unknown", "¿En qué fecha ocurrió la conducta de cada condena indicada?", "Copie una fecha por línea como AAAA-MM-DD, en el mismo orden que las referencias finales. Son fechas de la conducta, no del arresto, sentencia o condena. Si no sabe una fecha, indíquelo."),
  question("ct_petition_historical_classes", "What historical offense class does the sentencing record identify for each listed conviction?", "Copy one recorded class per line in citation order, under the law at the time of the conduct. Do not classify the offense yourself or substitute today's law. If the record does not establish it, choose I don't know.", "text_or_unknown", "¿Qué clase histórica del delito identifica el expediente de sentencia para cada condena?", "Copie una clase registrada por línea en orden de las referencias, según la ley vigente cuando ocurrió la conducta. No clasifique el delito ni sustituya la ley actual. Si el expediente no lo establece, indique que no lo sabe."),
  question("ct_petition_historical_maxima", "What statutory maximum sentence does that historical record identify for each listed conviction?", "Copy one maximum with its unit per line in citation order, under the law at the time of the conduct. This is not the sentence you received. If it is absent or unclear, keep it unknown for review.", "text_or_unknown", "¿Qué pena máxima legal identifica ese expediente histórico para cada condena?", "Copie una pena máxima con su unidad por línea en orden de las referencias, según la ley de la fecha de la conducta. No es la pena que recibió. Si falta o no está clara, manténgala como desconocida para revisión."),
  question("ct_petition_supervision_complete", "Have you completed all imprisonment, parole, special parole, transitional supervision and probation covered by this request?", "Include these convictions and any other crime for which you were convicted in state court on or after January 1, 2000. A completion date for just this case does not answer that broader question.", "single_choice", "¿Ha completado toda prisión, libertad condicional, libertad condicional especial, supervisión transitoria y probation que abarca esta solicitud?", "Incluya estas condenas y cualquier otro delito por el que fue condenado en un tribunal estatal desde el 1 de enero de 2000. La fecha de cumplimiento de solo este caso no responde esa pregunta más amplia."),
  question("ct_petition_pending_state_charge", "Do you have any pending state criminal charge?", "Check your current records. This is separate from the final convictions and from completing supervision.", "single_choice", "¿Tiene algún cargo penal estatal pendiente?", "Consulte sus expedientes actuales. Esto es independiente de las condenas finales y del cumplimiento de la supervisión."),
  question("ct_petition_repeat_14227a", "Were you convicted of another section 14-227a violation within ten years after any listed section 14-227a conviction?", "Use conviction dates for this separate repeat-conviction question. It does not answer the seven- or ten-year waiting-period question measured from the most recent judgment for any crime.", "single_choice", "¿Fue condenado por otra infracción de la sección 14-227a dentro de los diez años posteriores a alguna condena indicada de esa sección?", "Use las fechas de condena para esta pregunta independiente sobre reincidencia. No responde el plazo de siete o diez años desde la sentencia de condena más reciente por cualquier delito.")
];
export const CT_PETITION_FACT_IDS = [...CT_PETITION_QUESTIONS.map(q => q.id), "last_conviction_date"];
export const CT_PETITION_MULTILINE_IDS = CT_PETITION_QUESTIONS.filter(q => q.multiline).map(q => q.id);
function known(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const wrapped = value as Record<string, unknown>;
    return wrapped.unknown === false && Object.keys(wrapped).every(k => ["value", "unknown"].includes(k)) ? wrapped.value : undefined;
  }
  return value;
}
function lines(raw: unknown): string[] {
  const value = known(raw);
  return typeof value === "string" && value.trim() && !uncertaintyState(value) ? value.trim().split(/\r?\n/).map(s => s.trim()) : [];
}
function date(value: unknown): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function hasDui(a: Record<string, unknown>): boolean {
  return lines(a.ct_petition_citations).some(c => /^14-227a(?:\([a-z0-9]+\))*$/.test(c));
}
export function ctPetitionQuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, a: Record<string, unknown>, id: string): boolean {
  if (profile?.jurisdiction.code === "CT" && id === "last_conviction_date") return ctPetitionContext(profile, pathway);
  if (!CT_PETITION_QUESTIONS.some(q => q.id === id)) return true;
  return ctPetitionContext(profile, pathway) && (id !== "ct_petition_repeat_14227a" || hasDui(a));
}
// Supplemental result EN/ES copy is source-grounded draft, pending qualified review.
export const CT_PETITION_COPY = {
  missing: ["Some final conviction, historical record or completion facts are missing or uncertain. Keep them unknown until the records establish them. A broad category, current offense class or this case's completion date cannot supply these different facts.", "Faltan o son inciertos algunos datos de la condena final, del expediente histórico o del cumplimiento. Manténgalos como desconocidos hasta que los expedientes los establezcan. Una categoría general, la clase actual del delito o la fecha de cumplimiento de este caso no puede aportar estos datos distintos."],
  count_review: ["The docket count and final conviction rows need review together. Keep each conviction separate, including repeated citations and amended charges. Counts without a conviction also need review; no count has been found erasable.", "El número de cargos del expediente y las filas de condenas finales requieren revisión conjunta. Mantenga cada condena por separado, incluidas referencias repetidas y cargos modificados. Los cargos sin condena también requieren revisión; no se ha determinado que pueda borrarse ningún cargo."],
  record_review: ["The recorded facts have been retained for review. Historical classification and maximum sentences, the pre-2000 date rule, the specific statutory exclusions and every count still need verification. The seven- or ten-year period runs from the most recent judgment of conviction for any crime; no waiting period or eligibility has been established. No payment is available.", "Los datos registrados se han conservado para revisión. Aún deben verificarse la clasificación histórica y las penas máximas, la regla de fecha anterior al año 2000, las exclusiones legales específicas y cada cargo. El período de siete o diez años se cuenta desde la sentencia de condena más reciente por cualquier delito; no se ha establecido ningún período de espera ni elegibilidad. No está disponible el pago."],
  date_review: ["The conduct dates and most recent conviction date need review. Use real calendar dates from the records; a conviction or sentencing date cannot replace the date of conduct. No date rule or waiting period has been decided.", "Las fechas de la conducta y de la condena más reciente requieren revisión. Use fechas reales del calendario que figuren en los expedientes; la fecha de condena o sentencia no puede sustituir la fecha de la conducta. No se ha decidido ninguna regla de fecha ni período de espera."],
  citation_review: ["Copy the final statute section and subsection for each conviction from the record. An original charge, offense name or broad category cannot establish a final citation or a statutory exclusion.", "Copie del expediente la sección y subsección de la ley de cada condena final. Un cargo original, el nombre de un delito o una categoría general no puede establecer una referencia final ni una exclusión legal."],
  completion_review: ["The reported supervision or pending state charge needs review. Completing just this case does not establish completion of all covered supervision. No eligibility or permission to purchase has been established.", "La supervisión o el cargo estatal pendiente declarado requiere revisión. Completar solo este caso no establece el cumplimiento de toda la supervisión incluida. No se ha establecido la elegibilidad ni el permiso para comprar."],
  repeat_review: ["The reported additional section 14-227a conviction within ten years needs separate review. It does not establish the waiting period measured from the most recent judgment for any crime.", "La condena adicional declarada conforme a la sección 14-227a dentro de diez años requiere revisión independiente. No establece el período de espera contado desde la sentencia de condena más reciente por cualquier delito."],
} as const;
export function ctPetitionFacts(a: Record<string, unknown>): { code: keyof typeof CT_PETITION_COPY; ids: string[] } {
  const count = known(a.ct_petition_count);
  const validCount = typeof count === "number" ? Number.isSafeInteger(count) && count > 0
    : typeof count === "string" && /^[1-9]\d*$/.test(count) && Number.isSafeInteger(Number(count));
  const missing = CT_PETITION_FACT_IDS.filter(id => {
    if (id === "ct_petition_count") return !validCount;
    if (id === "last_conviction_date") return !lines(a[id]).length;
    if (CT_PETITION_MULTILINE_IDS.includes(id)) return !lines(a[id]).length || lines(a[id]).some(v => !v || uncertaintyState(v));
    if (id === "ct_petition_repeat_14227a" && !hasDui(a)) return false;
    return !["Yes", "No"].includes(String(known(a[id])));
  });
  if (missing.length) return { code: "missing", ids: missing };
  const citations = lines(a.ct_petition_citations);
  if (CT_PETITION_MULTILINE_IDS.some(id => lines(a[id]).length !== Number(count))) return { code: "count_review", ids: ["ct_petition_count", ...CT_PETITION_MULTILINE_IDS] };
  // Syntax is only a record check; no historical statute or exclusion list is inferred.
  if (citations.some(c => !/^\d+[a-z]?-\d+[a-z]?(?:\([a-z0-9]+\))*$/.test(c))) return { code: "citation_review", ids: ["ct_petition_citations"] };
  if (!date(known(a.last_conviction_date)) || lines(a.ct_petition_offense_dates).some(d => !date(d))) return { code: "date_review", ids: ["ct_petition_offense_dates", "last_conviction_date"] };
  if (hasDui(a) && known(a.ct_petition_repeat_14227a) === "Yes") return { code: "repeat_review", ids: ["ct_petition_repeat_14227a"] };
  if (known(a.ct_petition_supervision_complete) === "No" || known(a.ct_petition_pending_state_charge) === "Yes") return { code: "completion_review", ids: ["ct_petition_supervision_complete", "ct_petition_pending_state_charge"] };
  return { code: "record_review", ids: [] };
}
