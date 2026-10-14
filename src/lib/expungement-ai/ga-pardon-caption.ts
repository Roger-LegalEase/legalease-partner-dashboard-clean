import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export const GA_PARDON_CAPTION_ROUTE = "GA:restriction-and-sealing-of-a-pardoned-felony";
export const GA_PARDON_CAPTION_INPUTS: Readonly<Record<string, readonly string[]>> = {
  court: ["court", "county"],
  county: ["court", "county"]
};

// GA-02 and GA.memo ga-pardon-j7: the caption identifies the convicting court.
// Earlier generic court-or-agency/location answers remain saved, but require
// explicit confirmation under this meaning before becoming filing facts.
// Supplemental Spanish is engineering copy pending qualified language review.
export const GA_PARDON_CAPTION_QUESTIONS: PublicQuestion[] = [
  {
    id: "court", stage: "packet_information", type: "text_or_unknown",
    required: true, contextOnly: false, lifecyclePhase: "postpay_packet_field", options: null,
    prompt: "What is the full name and level of the court that entered this conviction?",
    helperText: "Copy the convicting court from the final conviction record. An arresting agency or another court that handled part of the case is not the same court. Review any earlier saved answer before confirming it.",
    translations: { es: {
      prompt: "¿Cuál es el nombre completo y el nivel del tribunal que dictó esta condena?",
      helperText: "Copie el tribunal que dictó la condena del documento de la condena final. La agencia que realizó el arresto u otro tribunal que tramitó parte del caso no es el mismo tribunal. Revise cualquier respuesta guardada anteriormente antes de confirmarla."
    } }
  },
  {
    id: "county", stage: "packet_information", type: "text_or_unknown",
    required: true, contextOnly: false, lifecyclePhase: "postpay_packet_field", options: null,
    prompt: "In which Georgia county is that convicting court?",
    helperText: "Use the county of the court that entered this conviction, not your current residence or the arrest location. Review any earlier saved answer before confirming it.",
    translations: { es: {
      prompt: "¿En qué condado de Georgia está ese tribunal que dictó la condena?",
      helperText: "Use el condado del tribunal que dictó esta condena, no su residencia actual ni el lugar del arresto. Revise cualquier respuesta guardada anteriormente antes de confirmarla."
    } }
  }
];

export function gaPardonCaptionQuestion<T extends PublicQuestion>(question: T, routeKey: string): T {
  if (routeKey !== GA_PARDON_CAPTION_ROUTE) return question;
  const replacement = GA_PARDON_CAPTION_QUESTIONS.find(candidate => candidate.id === question.id);
  const originals: Record<string, string[]> = {
    court: ["Which court or agency handled the case?", "Which court handled this matter?"],
    county: ["Which county (or local area) handled the case?", "Which county handled this matter?"]
  };
  return replacement && ["text", "text_or_unknown"].includes(question.type)
    && [...originals[question.id], replacement.prompt].includes(question.prompt)
    ? { ...question, ...replacement } : question;
}
