import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const AR_RECORD_ORIGIN_ID = "ar_record_origin";
export const AR_RECORD_ORIGIN_ROUTES = [
  "situation-a-non-convictions", "situation-b-misdemeanor-convictions", "situation-c-felony-convictions"
] as const;
export const AR_RECORD_ORIGIN_SOURCE = "AR:exclusions:149-178";
/** Source scope only. Residence, the filing county and a generic State/local
 * answer cannot establish which jurisdiction created the record. */
export function arkansasRecordOriginApplies(state: string, pathway?: string | null): boolean {
  return state === "AR" && (!pathway || AR_RECORD_ORIGIN_ROUTES.some(id => id === pathway));
}
export function arkansasRecordOrigin(answers: Record<string, unknown>): "arkansas" | "other_state" | "federal" | "unknown" {
  const value = answers[AR_RECORD_ORIGIN_ID];
  return value === "arkansas" || value === "other_state" || value === "federal" ? value : "unknown";
}
export const AR_RECORD_ORIGIN_QUESTION: PublicQuestion = {
  id: AR_RECORD_ORIGIN_ID, stage: "pathway_routing", type: "single_choice", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_hard_disqualifier",
  prompt: "Which jurisdiction created the record you want to seal?",
  helperText: "Use the jurisdiction of this case or arrest record, not where you live now. A federal record is different from an Arkansas state or local record, even if the federal case was in Arkansas. The filing court and county are separate questions.",
  options: ["arkansas", "other_state", "federal", "unknown"],
  optionDisplay: {
    arkansas: { label: "Arkansas state or local record", translations: { es: { label: "Expediente estatal o local de Arkansas" } } },
    other_state: { label: "Another state's state or local record", translations: { es: { label: "Expediente estatal o local de otro estado" } } },
    federal: { label: "Federal record", translations: { es: { label: "Expediente federal" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro/a" } } }
  },
  translations: { es: {
    prompt: "¿Qué jurisdicción creó el expediente que desea sellar?",
    helperText: "Use la jurisdicción del caso o del expediente de arresto, no el lugar donde vive ahora. Un expediente federal es distinto de un expediente estatal o local de Arkansas, aunque el caso federal haya sido en Arkansas. El tribunal y el condado de presentación son preguntas separadas."
  } }
};

export const AR_RECORD_ORIGIN_COPY = {
  unknown: ["Confirm which jurisdiction created this case or arrest record. An earlier location answer or a State or local answer does not establish that it is an Arkansas record.", "Confirme qué jurisdicción creó el expediente del caso o arresto. Una respuesta anterior sobre el lugar o una respuesta de Estatal o local no establece que sea un expediente de Arkansas."],
  outside: ["This Arkansas sealing procedure applies to Arkansas records. The other-state or federal record you identified needs the procedure for that jurisdiction; changing where you live or file does not change the record's origin.", "Este procedimiento de sellado de Arkansas se aplica a expedientes de Arkansas. El expediente de otro estado o federal que indicó necesita el procedimiento de esa jurisdicción; cambiar dónde vive o presenta la solicitud no cambia el origen del expediente."]
} as const;
