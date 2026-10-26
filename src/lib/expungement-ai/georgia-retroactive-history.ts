import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

export const GA_RETROACTIVE_HISTORY_ROUTE = "retroactive-first-offender-treatment-under-42-8-66";
export const GA_RETROACTIVE_HISTORY_IDS = ["firstOffenderEverUsed", "informedOfEligibility", "historicalCategory"] as const;
// Adopted GA.memo ga-rfo participantInputs/4-6; verified against those exact source questions by the focused control.
const prompts = [
  "Had you ever been given First Offender treatment before this case?",
  "Were you told at the time that you could be sentenced as a first offender?",
  "Were you sentenced between 18 March 1968 and 31 October 1982 to incarceration of one year or less?"
];

export function gaRetroactiveHistoryQuestions(profile: EngineProfile | undefined, pathwayId: string | null | undefined): ProfileQuestion[] {
  if (profile?.jurisdiction.code !== "GA" || pathwayId !== GA_RETROACTIVE_HISTORY_ROUTE
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812") return [];
  const spanish = [
    "¿Había recibido alguna vez el tratamiento First Offender antes de este caso?",
    "¿Le dijeron en ese momento que podía recibir una sentencia como First Offender?",
    "¿Fue sentenciado entre el 18 de marzo de 1968 y el 31 de octubre de 1982 a un año de encarcelamiento o menos?"
  ];
  return GA_RETROACTIVE_HISTORY_IDS.map((id, index) => ({ id, stage: "packet_information", type: "yes_no_unsure",
    prompt: prompts[index], required: true, contextOnly: false, options: null,
    helperText: "Saved for your factual record at the attorney or legal-aid consent stage. Choose I am not sure if you do not know. This answer does not establish eligibility or prosecutor consent.",
    translations: { es: { prompt: spanish[index], helperText: "Se guarda en su registro de hechos para la etapa de consentimiento con un abogado o servicio de ayuda legal. Elija No estoy seguro/a si no lo sabe. Esta respuesta no establece la elegibilidad ni el consentimiento de la fiscalía." } }
  }));
}
