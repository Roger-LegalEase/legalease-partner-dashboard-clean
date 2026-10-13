import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

export const NY_PACKET_ROUTE = "discretionary-conviction-sealing-by-petition-under-cpl-160-59";
export const NY_PACKET_TEXT_CONTRACT = "ny_16059_packet_text_v1" as const;
export const isNy16059Packet = (state: string, route: string | null) => state === "NY" && route === NY_PACKET_ROUTE;

function fact(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string, choice = false): ProfileQuestion {
  return { id, stage: "packet_information", contextOnly: false, required: true,
    type: choice ? "yes_no_unsure" : "text_or_unknown", options: null,
    ...(!choice ? { answerContract: NY_PACKET_TEXT_CONTRACT } : {}), prompt, helperText,
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}

/** Source-specific preparation facts, not new eligibility predicates. Current
 * and retained pro-se instructions share these meanings. The older six-page
 * application's broader alias/NYSID wording remains a separate source issue. */
export const NY_PACKET_QUESTIONS: readonly ProfileQuestion[] = [
  fact("ny_16059_first_case_numbers", "What are all the court case numbers for the first case covered by this application?",
    "Copy every docket, indictment or superior court information number for this actual case. Keep police, arrest and person-identification numbers separate.",
    "¿Cuáles son todos los números de caso judicial del primer caso incluido en esta solicitud?",
    "Copie todos los números de expediente, acusación formal o información de tribunal superior de este caso real. Mantenga separados los números policiales, de arresto y de identificación personal."),
  fact("ny_16059_additional_cases", "Does this application cover any other court case?",
    "Count actual court cases included here. Several convictions or counts in one case do not by themselves establish another case. This is separate from the legal rule for counting convictions.",
    "¿Incluye esta solicitud algún otro caso judicial?",
    "Cuente los casos judiciales reales incluidos aquí. Varias condenas o cargos en un mismo caso no establecen por sí solos otro caso. Esto es distinto de la regla legal para contar condenas.", true),
  fact("ny_16059_additional_case_numbers", "What are all the court case numbers for each additional case included here?",
    "Keep the numbers for each actual case together and distinguish the cases. Include every additional case; do not omit one because a form prints only two rows.",
    "¿Cuáles son todos los números de caso judicial de cada caso adicional incluido aquí?",
    "Agrupe los números de cada caso real y distinga los casos. Incluya todos los casos adicionales; no omita uno porque un formulario solo tenga dos filas."),
  fact("ny_16059_case_alias", "Did you use another name in any case covered by this application?",
    "This asks only about names used in the covered cases, not every other name you have used elsewhere.",
    "¿Usó otro nombre en algún caso incluido en esta solicitud?",
    "Se pregunta únicamente por los nombres usados en los casos incluidos, no por todos los demás nombres que haya usado en otros lugares.", true),
  fact("ny_16059_case_alias_names", "What other names did you use in the covered cases?",
    "Copy the actual names from the case records and identify the case when needed. Do not supply an invented alias.",
    "¿Qué otros nombres usó en los casos incluidos?",
    "Copie los nombres reales de los expedientes e identifique el caso cuando sea necesario. No ingrese un alias inventado."),
  fact("ny_16059_nysid_known", "Do you know your New York State Identification Number (NYSID)?",
    "Use your criminal-history record if available. A court case number, driver's license number or Social Security number is not a NYSID. An unknown NYSID must not be invented.",
    "¿Conoce su número de identificación del Estado de Nueva York (NYSID)?",
    "Use su registro de antecedentes penales si lo tiene. Un número de caso judicial, de licencia de conducir o de Seguro Social no es un NYSID. No invente un NYSID que desconoce.", true),
  fact("ny_16059_nysid_number", "What is your NYSID as shown on the record?",
    "Copy the complete identifier, including any leading zeros or letters.",
    "¿Cuál es su NYSID tal como aparece en el registro?",
    "Copie el identificador completo, incluidos los ceros iniciales o las letras."),
  fact("ny_16059_future_application", "Do you intend to make another application under CPL 160.58 or CPL 160.59 for a different case?",
    "This concerns a future application, not one already filed or a case included in this application.",
    "¿Tiene intención de presentar otra solicitud bajo CPL 160.58 o CPL 160.59 para un caso diferente?",
    "Se trata de una solicitud futura, no de una ya presentada ni de un caso incluido en esta solicitud.", true),
  fact("ny_16059_future_case_numbers", "What are the court case numbers for the intended future application?",
    "Use the actual separate case record. Do not copy the current case numbers into this answer.",
    "¿Cuáles son los números de caso judicial de la solicitud futura prevista?",
    "Use el expediente real del caso separado. No copie aquí los números del caso actual."),
  fact("ny_16059_future_court", "Which court handled the case for the intended future application?",
    "Use that case's court name. This does not identify the filing court for the current application.",
    "¿Qué tribunal atendió el caso de la solicitud futura prevista?",
    "Use el nombre del tribunal de ese caso. Esto no identifica el tribunal donde se presentará la solicitud actual.")
];
export const NY_PACKET_FACT_IDS = NY_PACKET_QUESTIONS.map(question => question.id);
export const NY_PACKET_CONDITIONS: Record<string, string> = {
  ny_16059_additional_case_numbers: "ny_16059_additional_cases",
  ny_16059_case_alias_names: "ny_16059_case_alias",
  ny_16059_nysid_number: "ny_16059_nysid_known",
  ny_16059_future_case_numbers: "ny_16059_future_application",
  ny_16059_future_court: "ny_16059_future_application"
};

export function nyPacketTextAnswerState(id: string, raw: unknown): "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined" {
  if (!NY_PACKET_QUESTIONS.some(question => question.id === id && question.answerContract === NY_PACKET_TEXT_CONTRACT)) return "invalid";
  let value = raw;
  if (value === undefined || value === null || value === "") return "unanswered";
  if (typeof value === "object" && !Array.isArray(value)) {
    const wrapper = value as Record<string, unknown>;
    if (Object.keys(wrapper).some(key => key !== "value" && key !== "unknown")
      || wrapper.unknown !== undefined && typeof wrapper.unknown !== "boolean") return "invalid";
    if (wrapper.unknown === true) return "uncertain";
    if (!Object.hasOwn(wrapper, "value")) return "invalid";
    value = wrapper.value;
  }
  if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value)) return "invalid";
  const text = value.trim().toLowerCase().replace(/\u2019/g, "'");
  if (!text) return "unanswered";
  if (["unknown", "not sure", "unsure", "i am not sure", "i'm not sure", "no estoy seguro", "no estoy segura", "no sé", "no se"].includes(text)) return "uncertain";
  return text === "prefer not to say" ? "declined" : "known_valid";
}
