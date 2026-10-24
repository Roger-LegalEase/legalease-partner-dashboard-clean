import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { msFirstOffenderSourceContract } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";

// GA-16-M01514 / Q-7aaf83fbc78f127f31d1: reuse the existing scoped MS first-offender source contract.
export function msFirstLocationQuestion<T extends PublicQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || !msFirstOffenderSourceContract(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context and is not printed in this packet. The court of conviction and its county or municipality, the mailing address, and the prosecutor's service address are separate facts. Use the separate mailing-address question for contact details. Complete the court, county or municipality, and service fields as directed in the packet.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El tribunal donde se dictó la condena y su condado o municipio, la dirección postal y la dirección de notificación de la fiscalía son datos distintos. Use la pregunta separada sobre la dirección postal para los datos de contacto. Complete los campos del tribunal, del condado o municipio y de notificación según las instrucciones del paquete."
    } } };
}
