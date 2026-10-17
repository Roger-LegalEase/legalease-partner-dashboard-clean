import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { CA_PROP64_CAPTION_ANSWER_CONTRACT } from "@/lib/expungement-ai/ca-prop64-caption-answer";

/** CR-400/401/403 captions: defendant, court case and filing court are distinct
 * from the account, an arrest identifier and the place that handled a record.
 * These are packet facts, never new screening or legal-eligibility predicates. */
export const CA_PROP64_CAPTION_QUESTIONS: readonly ProfileQuestion[] = [
  {
    id: "participant_full_legal_name", stage: "packet_information", contextOnly: false, type: "text_or_unknown", required: true, answerContract: CA_PROP64_CAPTION_ANSWER_CONTRACT,
    prompt: "What is the defendant's full legal name for this court filing?", options: null,
    helperText: "Use the name of the person whose conviction this filing concerns.",
    translations: { es: { prompt: "¿Cuál es el nombre legal completo del acusado para esta presentación judicial?", helperText: "Use el nombre de la persona cuya condena es objeto de esta presentación." } }
  },
  {
    id: "ca_prop64_court_case_number", stage: "packet_information", contextOnly: false, type: "text_or_unknown", required: true, answerContract: CA_PROP64_CAPTION_ANSWER_CONTRACT,
    prompt: "What is the court case number for the conviction in this filing?", options: null,
    helperText: "Copy the case number from the court record. A separate police or arrest number does not answer this question.",
    translations: { es: { prompt: "¿Cuál es el número de caso judicial de la condena en esta presentación?", helperText: "Copie el número de caso del expediente judicial. Un número separado de la policía o de arresto no responde a esta pregunta." } }
  },
  {
    id: "ca_prop64_filing_court_county", stage: "packet_information", contextOnly: false, type: "text_or_unknown", required: true, answerContract: CA_PROP64_CAPTION_ANSWER_CONTRACT,
    prompt: "Which county is the Superior Court receiving this filing in?", options: null,
    helperText: "Use the county in the court's caption. Your home county or the place of arrest may be different.",
    translations: { es: { prompt: "¿En qué condado está el Tribunal Superior que recibirá esta presentación?", helperText: "Use el condado del encabezado del tribunal. Su condado de residencia o el lugar del arresto pueden ser diferentes." } }
  },
  {
    id: "ca_prop64_filer_representation", stage: "packet_information", contextOnly: false, type: "single_choice", required: true,
    prompt: "Who is filing this petition or application?", options: ["self_represented", "attorney", "unknown"],
    helperText: "This identifies the party or attorney for this filing, not a lawyer who handled an earlier case.",
    optionDisplay: {
      self_represented: { label: "The defendant, without an attorney", translations: { es: { label: "El acusado, sin abogado" } } },
      attorney: { label: "An attorney representing the defendant", translations: { es: { label: "Un abogado que representa al acusado" } } },
      unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
    },
    translations: { es: { prompt: "¿Quién presenta esta petición o solicitud?", helperText: "Esto identifica a la parte o al abogado para esta presentación, no a un abogado que atendió un caso anterior." } }
  }
];
export const CA_PROP64_CAPTION_FACT_IDS = CA_PROP64_CAPTION_QUESTIONS.map(question => question.id);

const destinations: Record<string, string> = {
  participant_full_legal_name: "participant.full_legal_name",
  ca_prop64_court_case_number: "matter.case_number",
  ca_prop64_filing_court_county: "matter.county",
  ca_prop64_filer_representation: "filer.representation"
};

/** Call with protected, interpreted answers. This maps meaning; it grants no
 * ownership, source approval, generation permission or filing readiness. */
export function caProp64CaptionFacts(state: string, pathway: string | null, answers: Readonly<Record<string, unknown>>) {
  if (!isCaProp64Pathway(state, pathway)) return null;
  const facts: Record<string, string> = {};
  const missing: string[] = [];
  for (const question of CA_PROP64_CAPTION_QUESTIONS) {
    const raw = answers[question.id];
    const scalar = raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as { value?: unknown }).value : raw;
    const exactShape = !raw || typeof raw !== "object" || !Array.isArray(raw)
      && Object.keys(raw).every(key => key === "value" || key === "unknown");
    if (!exactShape || questionAnswerState(question, raw) !== "known_valid"
      || typeof scalar !== "string" || !scalar.trim() || /[\x00-\x1f\x7f]/.test(scalar)
      || scalar === "unknown") missing.push(question.id);
    else facts[destinations[question.id]] = scalar;
  }
  return { facts, missing, generationAllowed: false as const };
}
