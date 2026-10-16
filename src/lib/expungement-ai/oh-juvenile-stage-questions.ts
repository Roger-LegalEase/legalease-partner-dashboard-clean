import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

// Browser-safe descriptors only. These new meanings never reinterpret a saved court answer.
export const OH_JUVENILE_ROUTE = "juvenile-sealing-and-expungement";
export const OH_JUVENILE_STAGE_IDS = ["oh_juvenile_requested_service", "oh_juvenile_record_forum", "oh_juvenile_sealed_record_status"] as const;
const labels = {
  court_status_information: ["Information about court action or record status", "Información sobre las actuaciones del tribunal o el estado del registro"],
  sealing_application: ["Help with a juvenile sealing application", "Ayuda con una solicitud para sellar un expediente de menores"],
  earlier_expungement_request: ["Help requesting earlier expungement of a sealed juvenile record", "Ayuda para solicitar la eliminación anticipada de un expediente de menores ya sellado"],
  juvenile_court_record: ["A juvenile court record", "Un expediente del tribunal de menores"],
  adult_criminal_case: ["An adult criminal case, including a case transferred to adult court", "Un caso penal de adultos, incluido un caso transferido al tribunal de adultos"],
  yes: ["Yes", "Sí"], no: ["No", "No"], unknown: ["I am not sure", "No estoy seguro"]
} as const;
function question(id: string, prompt: string, es: string, helper: string, esHelper: string, options: (keyof typeof labels)[]): ProfileQuestion {
  return { id, stage: "packet_information", type: "single_choice", required: false, contextOnly: false,
    lifecyclePhase: "optional_or_later", prompt, helperText: helper, options,
    optionDisplay: Object.fromEntries(options.map(value => [value, { label: labels[value][0], translations: { es: { label: labels[value][1] } } }])),
    translations: { es: { prompt: es, helperText: esHelper } } };
}
export const OH_JUVENILE_STAGE_QUESTIONS = [
  question(OH_JUVENILE_STAGE_IDS[0], "What help do you want with this record?", "¿Qué ayuda desea con este expediente?",
    "Court action and participant applications are different steps. You can save your choice or say you are not sure. No application is prepared or filed here; application timing, the proper juvenile court and the required documents still need review.",
    "Las actuaciones del tribunal y las solicitudes del participante son pasos distintos. Puede guardar su elección o indicar que no está seguro. Aquí no se prepara ni presenta ninguna solicitud; todavía deben revisarse los plazos, el tribunal de menores competente y los documentos necesarios.",
    ["court_status_information", "sealing_application", "earlier_expungement_request", "unknown"]),
  question(OH_JUVENILE_STAGE_IDS[1], "Which kind of court record is this?", "¿De qué tipo de expediente judicial se trata?",
    "Use the actual case record. Being under 18 when something happened does not by itself establish a juvenile court record. A case handled in adult criminal court is different. An earlier court name is not confirmation of this fact.",
    "Consulte el expediente real del caso. Tener menos de 18 años cuando ocurrió algo no establece por sí solo que exista un expediente del tribunal de menores. Un caso tramitado en un tribunal penal de adultos es distinto. El nombre de un tribunal guardado anteriormente no confirma este dato.",
    ["juvenile_court_record", "adult_criminal_case", "unknown"]),
  question(OH_JUVENILE_STAGE_IDS[2], "Does a juvenile sealing order already apply to this record?", "¿Ya existe una orden de sellado de menores aplicable a este expediente?",
    "The earlier-expungement request described in section 2151.358 concerns a sealed juvenile record. Do not infer a sealing order from completion, age or an earlier relief answer. This answer does not establish rehabilitation or that expungement has occurred.",
    "La solicitud de eliminación anticipada descrita en la sección 2151.358 se refiere a un expediente de menores sellado. No deduzca que existe una orden de sellado a partir del cumplimiento, la edad o una respuesta anterior sobre otra medida. Esta respuesta no establece la rehabilitación ni que se haya eliminado el expediente.",
    ["yes", "no", "unknown"])
] as const;
