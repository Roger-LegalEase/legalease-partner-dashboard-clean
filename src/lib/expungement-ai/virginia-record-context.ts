import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { VA_RECORD_ORIGIN_ID, VA_RECORD_ORIGIN_QUESTION, virginiaRecordOrigin, virginiaRecordOriginApplies } from "@/lib/rcap-engine/virginia-record-origin";

// Owner item12(d): source-record context, never a filing destination or eligibility fact.
export const VA_RECORD_CONTEXT_IDS = ["va_disposition_locality", "va_court_level"];
export function virginiaRecordContextApplies(state: string, pathway: string | null, answers: Record<string, unknown>): boolean {
  return !!pathway && virginiaRecordOriginApplies(state, pathway)
    && questionAnswerState(VA_RECORD_ORIGIN_QUESTION, answers[VA_RECORD_ORIGIN_ID]) === "known_valid"
    && virginiaRecordOrigin({ ...answers, [VA_RECORD_ORIGIN_ID]: scalarAnswerText(answers[VA_RECORD_ORIGIN_ID]) }) === "virginia";
}
const helperText = "Optional context about this record. These answers do not choose a filing court or change eligibility. You may leave them blank or keep an unknown answer.";
const helperEs = "Contexto opcional sobre este expediente. Estas respuestas no eligen el tribunal de presentación ni cambian la elegibilidad. Puede dejarlas en blanco o mantener una respuesta desconocida.";
export const VA_RECORD_CONTEXT_QUESTIONS: ProfileQuestion[] = [
  {
    id: "va_disposition_locality", stage: "packet_information", type: "text_or_unknown", required: false, contextOnly: true, lifecyclePhase: "guidance_only",
    prompt: "In which Virginia county or city was this case disposed of?", helperText, options: null,
    translations: { es: { prompt: "¿En qué condado o ciudad de Virginia se resolvió este caso?", helperText: helperEs } }
  },
  {
    id: "va_court_level", stage: "packet_information", type: "single_choice", required: false, contextOnly: true, lifecyclePhase: "guidance_only",
    prompt: "Was this case in general district court, juvenile and domestic relations court, or circuit court?", helperText,
    options: ["general_district", "juvenile_domestic_relations", "circuit", "unknown", "Prefer not to say"],
    optionDisplay: {
      general_district: { label: "General district court", translations: { es: { label: "Tribunal de distrito general" } } },
      juvenile_domestic_relations: { label: "Juvenile and domestic relations court", translations: { es: { label: "Tribunal de menores y relaciones familiares" } } },
      circuit: { label: "Circuit court", translations: { es: { label: "Tribunal de circuito" } } },
      unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro/a" } } },
      "Prefer not to say": { label: "Prefer not to say", translations: { es: { label: "Prefiero no decirlo" } } }
    },
    translations: { es: { prompt: "¿Este caso se tramitó en un tribunal de distrito general, un tribunal de menores y relaciones familiares o un tribunal de circuito?", helperText: helperEs } }
  }
];
