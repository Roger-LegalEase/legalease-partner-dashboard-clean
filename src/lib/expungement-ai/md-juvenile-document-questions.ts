import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

// GA-14-M01031 / Q-d7118400a5658cf4acb7: exact JUV-11-506.1 participant statements.
export const MD_JUVENILE_SOURCE_SHA256 = "24fcb98eb0af35906252a424011a00d14ed393ed5451b01219ed5653c4c10a92";
const text = (id: string, prompt: string, es: string, type = "text_or_unknown"): ProfileQuestion => ({
  id, prompt, stage: "packet_information", type, required: false, contextOnly: false, options: null,
  helperText: "Use this juvenile case's actual record. Keep unknown details unknown. Saving does not sign, file, or establish eligibility.",
  translations: { es: { prompt: es, helperText: "Use el expediente real de este caso de menores. Mantenga desconocidos los datos que no conoce. Guardar no firma ni presenta la petición ni establece elegibilidad." } }
});
const choice = (id: string, prompt: string, es: string, options: readonly (readonly string[])[]): ProfileQuestion => ({
  ...text(id, prompt, es, "single_choice"), options: options.map(([value]) => value),
  optionDisplay: Object.fromEntries(options.map(([value, label, translated]) => [value, { label, translations: { es: { label: translated } } }]))
});
export const MD_JUVENILE_TEXT_FIELDS = [
  [
    "md_juvenile_case_number",
    "Case Number",
    "What is the case number on this juvenile record?",
    "¿Cuál es el número de caso en este expediente de menores?"
  ],
  [
    "md_juvenile_court_address",
    "Address of Court",
    "What is the address of the original or actual transferee juvenile court?",
    "¿Cuál es la dirección del tribunal de menores original o del tribunal al que se trasladó el caso?"
  ],
  [
    "md_juvenile_birth_date",
    "Date of Birth",
    "What is your date of birth?",
    "¿Cuál es su fecha de nacimiento?"
  ],
  [
    "md_juvenile_tracking_number",
    "Tracking Number",
    "What tracking number appears on this juvenile record, if any?",
    "¿Qué número de seguimiento aparece en este expediente de menores, si lo hay?"
  ],
  [
    "md_juvenile_other_reference",
    "Other Reference Numbers",
    "What other reference numbers appear on this juvenile record, if any?",
    "¿Qué otros números de referencia aparecen en este expediente de menores, si los hay?"
  ],
  [
    "md_juvenile_incident_date",
    "Incident Date",
    "On or about what date were you arrested or served with the citation?",
    "¿En qué fecha aproximada fue arrestado o recibió la citación?"
  ],
  [
    "md_juvenile_agency",
    "Law Enforcement Agency",
    "Which law enforcement agency arrested you or served the citation?",
    "¿Qué agencia del orden público lo arrestó o le entregó la citación?"
  ],
  [
    "md_juvenile_incident_place",
    "at",
    "Where in Maryland did that incident occur?",
    "¿En qué lugar de Maryland ocurrió ese incidente?"
  ],
  [
    "md_juvenile_disposed_date",
    "Disposed date",
    "On or about what date was this charge disposed of?",
    "¿En qué fecha aproximada se resolvió este cargo?"
  ],
  [
    "md_juvenile_phone",
    "Telephone Number",
    "What telephone number should appear on this petition?",
    "¿Qué número de teléfono debe aparecer en esta petición?"
  ],
  [
    "md_juvenile_fax",
    "Fax",
    "What fax number should appear, if any?",
    "¿Qué número de fax debe aparecer, si lo hay?"
  ],
  [
    "md_juvenile_email",
    "Email",
    "What email address should appear, if any?",
    "¿Qué dirección de correo electrónico debe aparecer, si la hay?"
  ],
  [
    "md_juvenile_address",
    "Address",
    "What mailing street address should appear on this petition?",
    "¿Qué dirección postal debe aparecer en esta petición?"
  ],
  [
    "md_juvenile_city_state_zip",
    "City State Zip",
    "What mailing city, state and ZIP code should appear?",
    "¿Qué ciudad, estado y código postal deben aparecer?"
  ]
] as const;
export const MD_JUVENILE_DISPOSITIONS = [
  [
    "nolle_prosequi",
    "The State’s Attorney entered a nolle prosequi.",
    "El fiscal del estado presentó un nolle prosequi.",
    "The States Attorney entered a nolle prosequi"
  ],
  [
    "dismissed",
    "The delinquency or Child in Need of Supervision petition or citation was dismissed.",
    "Se desestimó la petición de delincuencia juvenil o de menor que necesita supervisión, o la citación.",
    "The delinquency or Child in Need of Supervision petition or the citation was dismissed"
  ],
  [
    "not_true",
    "The court, in an adjudicatory hearing, did not find that the allegations in the petition or citation were true.",
    "En una audiencia de adjudicación, el tribunal no determinó que fueran ciertas las alegaciones de la petición o citación.",
    "The court in an adjudicatory hearing did not find that the allegations in the delinquency"
  ],
  [
    "no_hearing",
    "The adjudicatory hearing was not held within two years after the petition or citation was filed.",
    "No se celebró la audiencia de adjudicación dentro de los dos años posteriores a la presentación de la petición o citación.",
    "The adjudicatory hearing was not held within two 2 years after the delinquency or Child"
  ],
  [
    "no_treatment",
    "The court, in a disposition hearing, found that I did not require guidance, treatment, or rehabilitation.",
    "En una audiencia de disposición, el tribunal determinó que no necesitaba orientación, tratamiento ni rehabilitación.",
    "The court in a disposition hearing found that I did not require guidance treatment or"
  ],
  [
    "treatment",
    "The court, in a disposition hearing, found that I did require guidance, treatment, or rehabilitation.",
    "En una audiencia de disposición, el tribunal determinó que sí necesitaba orientación, tratamiento o rehabilitación.",
    "The court in a disposition hearing found that I did require guidance treatment or"
  ]
] as const;
export const MD_JUVENILE_DECLARATIONS = [
  [
    "md_juvenile_at_least_18",
    "I am at least 18 years old.",
    "Tengo al menos 18 años.",
    "I am at least 18 years old"
  ],
  [
    "md_juvenile_two_years",
    "At least two (2) years have elapsed since the last official action in my juvenile record.",
    "Han pasado al menos dos (2) años desde la última actuación oficial en mi expediente de menores.",
    "At least two 2 years have elapsed since the last official action in my juvenile record"
  ],
  [
    "md_juvenile_at_most_one",
    "I have never been adjudicated delinquent, or I was only adjudicated delinquent one time.",
    "Nunca se me ha declarado responsable de un delito como menor, o se me ha declarado responsable solo una vez.",
    "I have never been adjudicated delinquent or I was only adjudicated delinquent one time"
  ],
  [
    "md_juvenile_no_later_conviction",
    "I have not subsequently been convicted of any offense.",
    "No he sido condenado posteriormente por ningún delito.",
    "I have not subsequently been convicted of any offense"
  ],
  [
    "md_juvenile_no_pending",
    "No delinquency petition or criminal charge is pending against me.",
    "No tengo pendiente ninguna petición de delincuencia juvenil ni cargo penal.",
    "No delinquency petition or criminal charge is pending against me"
  ],
  [
    "md_juvenile_no_excluded_offense",
    "I have not been adjudicated delinquent for an offense that, if committed by an adult, would constitute a crime of violence (Criminal Law §14-101), a violation of Criminal Law §3-308, or a felony.",
    "No se me ha declarado responsable como menor de un delito que, cometido por un adulto, constituiría un delito violento (Criminal Law §14-101), una infracción de Criminal Law §3-308 o un delito grave.",
    "I have not been adjudicated delinquent for an offense that if committed by an adult"
  ],
  [
    "md_juvenile_no_registration",
    "I have not been required to register as a sex offender under Criminal Procedure §11-704.",
    "No he tenido la obligación de registrarme como delincuente sexual conforme a Criminal Procedure §11-704.",
    "I have not been required to register as a sex offender under Code Criminal Procedure"
  ],
  [
    "md_juvenile_no_firearm",
    "I have not been adjudicated delinquent for an offense involving the use of a firearm (Public Safety §5-101) in a crime of violence (Criminal Law §14-101).",
    "No se me ha declarado responsable como menor de un delito que implique usar un arma de fuego (Public Safety §5-101) al cometer un delito violento (Criminal Law §14-101).",
    "I have not been adjudicated delinquent for an offense involving the use of a firearm as"
  ],
  [
    "md_juvenile_restitution",
    "I have fully paid any monetary restitution ordered by the court in the delinquency proceeding.",
    "He pagado por completo toda restitución monetaria ordenada por el tribunal en el procedimiento de menores.",
    "I have fully paid any monetary restitution ordered by the court in the delinquency"
  ],
  [
    "md_juvenile_understand_review",
    "I understand that the court shall consider my best interests, my stability in the community, and the safety of the public in considering this petition.",
    "Entiendo que el tribunal considerará mi interés superior, mi estabilidad en la comunidad y la seguridad pública al evaluar esta petición.",
    "I understand that the court shall consider my best interests my stability in the"
  ]
] as const;
export const MD_JUVENILE_ARREST_FIELDS = {"arrest": "arrested or", "citation": "served with a citation by an officer of the"} as const;
const uncertain = ["unknown", "I am not sure", "No estoy seguro"] as const;
export const MD_JUVENILE_DOCUMENT_QUESTIONS: ProfileQuestion[] = [
  text("participant_full_legal_name", "What is your full legal name for this juvenile petition?", "¿Cuál es su nombre legal completo para esta petición de menores?"),
  text("court", "What is the original or actual transferee juvenile court named on the case?", "¿Cuál es el tribunal de menores original o al que se trasladó el caso que figura en el expediente?"),
  text("charge", "What exact offense was charged in this juvenile case?", "¿Cuál es el delito exacto imputado en este caso de menores?"),
  ...MD_JUVENILE_TEXT_FIELDS.map(([id, , en, es]) => text(id, en, es, id.endsWith("_date") ? "date_or_unknown" : "text_or_unknown")),
  text("md_juvenile_incident", "Describe the incident that led to this juvenile charge in your own words.", "Describa con sus propias palabras el incidente que dio lugar a este cargo de menores."),
  choice("md_juvenile_arrest_or_citation", "For this incident, were you arrested or served with a citation? Choose one.", "Por este incidente, ¿fue arrestado o recibió una citación? Elija una opción.", [["arrest", "Arrested", "Arrestado"], ["citation", "Served with a citation", "Recibí una citación"], uncertain]),
  choice("md_juvenile_disposition", "Which exact disposition does the juvenile record show for this charge? Choose one.", "¿Qué resolución exacta consta en el expediente de menores para este cargo? Elija una opción.", [...MD_JUVENILE_DISPOSITIONS, uncertain]),
  ...MD_JUVENILE_DECLARATIONS.map(([id, en, es]) => choice(id, `Is this statement true for you? ${en}`, `¿Es verdadera esta afirmación en su caso? ${es}`, [["Yes", "Yes", "Sí"], ["No", "No", "No"], uncertain]))
];

/** These are explicit source answers, never deductions from broad screening facts. */
export function mdJuvenileDocumentFacts(answers: Record<string, AnswerValue>) {
  const known = (id: string) => {
    const q = MD_JUVENILE_DOCUMENT_QUESTIONS.find(row => row.id === id);
    return q && questionAnswerState(q, answers[id]) === "known_valid" ? scalarAnswerText(answers[id])?.trim() ?? null : null;
  };
  const fields: Record<string, { factId: string; value: string }> = {};
  for (const [id, field] of MD_JUVENILE_TEXT_FIELDS) {
    const value = known(id); if (value) fields[field] = { factId: id, value };
  }
  const selections: Record<string, { checked: boolean; basis: string; factId: string }> = {};
  const arrest = known("md_juvenile_arrest_or_citation");
  if (arrest && Object.hasOwn(MD_JUVENILE_ARREST_FIELDS, arrest)) selections[MD_JUVENILE_ARREST_FIELDS[arrest as keyof typeof MD_JUVENILE_ARREST_FIELDS]] = { checked: true, basis: "Explicit participant arrest/citation election", factId: "md_juvenile_arrest_or_citation" };
  const disposition = MD_JUVENILE_DISPOSITIONS.find(([id]) => id === known("md_juvenile_disposition"));
  if (disposition) selections[disposition[3]] = { checked: true, basis: "Explicit participant statement of the recorded disposition", factId: "md_juvenile_disposition" };
  for (const [id, , , field] of MD_JUVENILE_DECLARATIONS) if (known(id) === "Yes") selections[field] = { checked: true, basis: "Explicit participant statement for this exact form declaration", factId: id };
  return { fields, selections, incident: known("md_juvenile_incident") };
}
