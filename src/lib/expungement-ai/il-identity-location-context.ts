import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { ilIdentityCategoryIsHistory } from "@/lib/expungement-ai/packet-collection";

// GA-16-M01461 / Q-39a50c13c26e2446fc45: reuse the exact reviewed IL profile/specification boundary.
export function ilIdentityLocationQuestion<T extends PublicQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || !ilIdentityCategoryIsHistory(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context and is not printed in this packet. The Illinois circuit where the arrest occurred and the mailing address are separate facts. Use the separate mailing-address question for contact details. Complete the arrest-circuit court fields as directed in the packet.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El circuito judicial de Illinois donde ocurrió el arresto y la dirección postal son datos distintos. Use la pregunta separada sobre la dirección postal para los datos de contacto. Complete los campos del tribunal de circuito del arresto según las instrucciones del paquete."
    } } };
}
