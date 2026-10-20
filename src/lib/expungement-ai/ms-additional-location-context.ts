import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { msAdditionalCategoryIsHistory } from "@/lib/expungement-ai/packet-collection";

// GA-16-M01508 / Q-1fd626b49f5c694da45b and M01510 / Q-8da4428f5701a867dcca: distinct lower-court routes.
export function msAdditionalLocationQuestion<T extends PublicQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "residency_or_location" || !msAdditionalCategoryIsHistory(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  const municipal = pathwayId === "additional-municipal-court-misdemeanor-relief-21-23-7-6";
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: municipal
      ? "This earlier answer is kept as context and is not printed in this packet. The municipal court of conviction and its municipality, the mailing address, and the prosecutor's service address are separate facts. Use the separate mailing-address question for contact details. Complete the court, municipality, and service fields as directed in the packet."
      : "This earlier answer is kept as context and is not printed in this packet. The justice court of conviction and its county, the mailing address, and the prosecutor's service address are separate facts. Use the separate mailing-address question for contact details. Complete the court, county, and service fields as directed in the packet.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: municipal
        ? "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El tribunal municipal donde se dictó la condena y su municipio, la dirección postal y la dirección de notificación de la fiscalía son datos distintos. Use la pregunta separada sobre la dirección postal para los datos de contacto. Complete los campos del tribunal, del municipio y de notificación según las instrucciones del paquete."
        : "La respuesta anterior se conserva como contexto y no se imprime en este paquete. El tribunal de justicia donde se dictó la condena y su condado, la dirección postal y la dirección de notificación de la fiscalía son datos distintos. Use la pregunta separada sobre la dirección postal para los datos de contacto. Complete los campos del tribunal, del condado y de notificación según las instrucciones del paquete."
    } } };
}
