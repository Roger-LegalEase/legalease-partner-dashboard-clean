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

// Existing protected packet facts, separate from the court/county confirmation
// contract. These questions do not add screening facts or attestation markers.
export const GA_PARDON_DOCUMENT_QUESTIONS: PublicQuestion[] = [
  {
    id: "otn", stage: "packet_information", type: "text_or_unknown",
    required: false, contextOnly: false, lifecyclePhase: "postpay_packet_field", options: null,
    prompt: "If known, what is the GCIC Offender Tracking Number (OTN) for this case?",
    helperText: "Copy the OTN from the Georgia criminal history report. Leave it unknown if you do not have it; the packet can be generated with a blank for later completion. Do not substitute a court case number.",
    translations: { es: {
      prompt: "Si lo sabe, ¿cuál es el número de seguimiento de infractores (OTN) de GCIC para este caso?",
      helperText: "Copie el OTN del informe de antecedentes penales de Georgia. Déjelo como desconocido si no lo tiene; el paquete puede generarse con un espacio en blanco para completarlo después. No lo sustituya por un número de caso judicial."
    } }
  },
  {
    id: "case_number", stage: "packet_information", type: "text_or_unknown",
    required: true, contextOnly: false, lifecyclePhase: "postpay_packet_field", options: null,
    prompt: "What is the case number of the criminal case in which this conviction was entered?",
    helperText: "Copy the exact existing criminal case number from the final disposition or case papers. Do not enter a new civil case number or an agency tracking number.",
    translations: { es: {
      prompt: "¿Cuál es el número del caso penal en el que se dictó esta condena?",
      helperText: "Copie el número exacto del caso penal existente de la resolución final o de los documentos del caso. No ingrese un número de caso civil nuevo ni un número de seguimiento de una agencia."
    } }
  },
  {
    id: "participant_narrative", stage: "packet_information", type: "text_or_unknown", multiline: true,
    required: true, contextOnly: false, lifecyclePhase: "postpay_packet_field", options: null,
    prompt: "In the person's own words, what has changed and how has this record been a barrier?",
    helperText: "The account must belong to the person whose conviction is listed. Describe only facts they know first-hand. If you are helping, record that person's words. The packet formats this account; it does not write it or make the court's balancing decision.",
    translations: { es: {
      prompt: "En las propias palabras de la persona, ¿qué ha cambiado y qué obstáculos le ha causado este expediente?",
      helperText: "El relato debe ser de la persona cuya condena figura en este caso. Describa solo hechos que conozca de primera mano. Si está ayudando, registre las palabras de esa persona. El paquete da formato al relato; no lo redacta ni decide cómo debe sopesar el tribunal los intereses en juego."
    } }
  }
];

export function gaPardonCaptionQuestion<T extends PublicQuestion>(question: T, routeKey: string): T {
  if (routeKey !== GA_PARDON_CAPTION_ROUTE) return question;
  const documentQuestion = GA_PARDON_DOCUMENT_QUESTIONS.find(candidate => candidate.id === question.id);
  const fallbackPrompts: Record<string, string> = { otn: "Otn", case_number: "Case number", participant_narrative: "Participant narrative" };
  if (documentQuestion && question.stage === "packet_information" && question.type === "text_or_unknown"
    && question.prompt === fallbackPrompts[question.id]
    && question.helperText === "Enter the wording from your court or agency record when possible."
    && question.required === true && question.contextOnly === false
    && question.lifecyclePhase === "postpay_packet_field" && question.options === null
    && question.translations === undefined) {
    return { ...question, ...documentQuestion };
  }
  const replacement = GA_PARDON_CAPTION_QUESTIONS.find(candidate => candidate.id === question.id);
  const originals: Record<string, string[]> = {
    court: ["Which court or agency handled the case?", "Which court handled this matter?"],
    county: ["Which county (or local area) handled the case?", "Which county handled this matter?"]
  };
  return replacement && ["text", "text_or_unknown"].includes(question.type)
    && [...originals[question.id], replacement.prompt].includes(question.prompt)
    ? { ...question, ...replacement } : question;
}
