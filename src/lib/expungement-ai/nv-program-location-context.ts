import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { nvProgramCategoryIsHistory } from "@/lib/expungement-ai/packet-collection";

// GA-16-M01571 / Q-3243544293c0222d2708: reuse the exact reviewed NV profile/specification boundary.
export function nvProgramLocationQuestion<T extends PublicQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || !nvProgramCategoryIsHistory(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context and is not printed in this packet. The court and county, mailing address, and agencies holding the record are separate facts. Use the separate mailing-address question for contact details. Complete the court and agency fields as directed in the packet before filing.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El tribunal y el condado, la dirección postal y las agencias que conservan el expediente son datos distintos. Use la pregunta separada sobre la dirección postal para los datos de contacto. Complete los campos del tribunal y de las agencias según las instrucciones del paquete antes de presentarlo."
    } } };
}
