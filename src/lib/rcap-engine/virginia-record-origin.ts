// Owner item12(c): explicit record origin, independent of residence and filing venue.
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const VA_RECORD_ORIGIN_ID = "va_record_origin";
export const VA_RECORD_ORIGIN_ROUTES = [
  "regime-1-expungement-available-now", "automatic-sealing-no-filing", "petition-based-sealing"
] as const;
export const VA_RECORD_ORIGIN_SOURCE = "owner-decision:2026-10-19:item-12c";
/** Source scope only. Residence, the filing county and a generic State/local
 * answer cannot establish which jurisdiction created the record. */
export function virginiaRecordOriginApplies(state: string, pathway?: string | null): boolean {
  return state === "VA" && (!pathway || VA_RECORD_ORIGIN_ROUTES.some(id => id === pathway));
}
export function virginiaRecordOrigin(answers: Record<string, unknown>): "virginia" | "other_state" | "federal" | "unknown" {
  if (answers.jurisdiction_scope === "Federal") return "federal";
  const value = answers[VA_RECORD_ORIGIN_ID];
  return value === "virginia" || value === "other_state" || value === "federal" ? value : "unknown";
}
export const VA_RECORD_ORIGIN_QUESTION: PublicQuestion = {
  id: VA_RECORD_ORIGIN_ID, stage: "pathway_routing", type: "single_choice", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_hard_disqualifier",
  prompt: "Which jurisdiction created the record you want cleared?",
  helperText: "Use the jurisdiction of this case or arrest record, not where you live now. A federal record is different from a Virginia state or local record, even if the federal case was in Virginia. The filing court and county are separate questions.",
  options: ["virginia", "other_state", "federal", "unknown"],
  optionDisplay: {
    virginia: { label: "Virginia state or local record", translations: { es: { label: "Expediente estatal o local de Virginia" } } },
    other_state: { label: "Another state's state or local record", translations: { es: { label: "Expediente estatal o local de otro estado" } } },
    federal: { label: "Federal record", translations: { es: { label: "Expediente federal" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro/a" } } }
  },
  translations: { es: {
    prompt: "¿Qué jurisdicción creó el expediente que desea limpiar?",
    helperText: "Use la jurisdicción del caso o del expediente de arresto, no el lugar donde vive ahora. Un expediente federal es distinto de un expediente estatal o local de Virginia, aunque el caso federal haya sido en Virginia. El tribunal y el condado de presentación son preguntas separadas."
  } }
};

export const VA_RECORD_ORIGIN_COPY = {
  unknown: ["Confirm which jurisdiction created this case or arrest record. An earlier location answer or a State or local answer does not establish that it is a Virginia record.", "Confirme qué jurisdicción creó el expediente del caso o arresto. Una respuesta anterior sobre el lugar o una respuesta de Estatal o local no establece que sea un expediente de Virginia."],
  outside: ["These Virginia record-clearing procedures apply to Virginia records. The other-state or federal record you identified needs the procedure for that jurisdiction; changing where you live or file does not change the record's origin.", "Estos procedimientos de limpieza de antecedentes de Virginia se aplican a expedientes de Virginia. El expediente de otro estado o federal que indicó necesita el procedimiento de esa jurisdicción; cambiar dónde vive o presenta la solicitud no cambia el origen del expediente."]
} as const;
