import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { gaSb288CategoryIsHistory } from "@/lib/expungement-ai/packet-collection";

// GA-16-M01455 / Q-921725114b8166900e39: reuse the exact reviewed GA profile/specification boundary.
export function gaSb288LocationQuestion<T extends PublicQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || !gaSb288CategoryIsHistory(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context and is not printed in this packet. The court of conviction, its county, the mailing address, and the prosecutor's service address are separate facts. The separate jurisdiction question identifies whether the case is a Georgia case and not federal. Complete the court, county, and service fields as directed in the packet.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El tribunal donde se dictó la condena, su condado, la dirección postal y la dirección de notificación de la fiscalía son datos distintos. La pregunta separada sobre la jurisdicción identifica si el caso corresponde a Georgia y no es federal. Complete los campos del tribunal, del condado y de notificación según las instrucciones del paquete."
    } } };
}
