import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { SD_SIS_STAGE_FACT_ID, SD_SIS_STAGE_RECORD_CORRECTED, SD_SIS_STAGE_RECORD_NOT_CORRECTED } from "@/lib/rcap-engine/south-dakota-23a-27-17-escalation";

// GA-12 Q-cde3ef0a5bed58e60545 / QD-bd6b15fff22cbe1501cb; SD.memo sd_sis_sealing.
export const SD_SIS_ROUTE = "suspended-imposition-of-sentence-sealing";
export const SD_SIS_SOURCE = "SD.memo:sd_sis_sealing;SDCL23A-27-13,14,17";
export function southDakotaSisContext(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "SD" && pathway === SD_SIS_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "9751a66fc4ad5ef892db26209da7a07121035065b07f216db1bfa6689c6f1100"
    && profile.pathways.some(p => p.id === SD_SIS_ROUTE);
}
function question(id: string, prompt: string, helperText: string, esPrompt: string, esHelper: string): PublicQuestion {
  return { id, prompt, helperText, stage: "packet_information", type: "single_choice", required: false,
    contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "postpay_packet_field", options: ["Yes", "No", "I am not sure"],
    optionDisplay: { Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } }, "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } } },
    translations: { es: { prompt: esPrompt, helperText: esHelper } } };
}
// Supplemental EN/ES is source-grounded draft copy, pending qualified review.
export const SD_SIS_QUESTIONS = [
  question("sd_sis_granted", "Does the court order grant a suspended imposition of sentence under SDCL 23A-27-13?", "Check the order in this case. A drug deferral under 23A-27-53 is a separate procedure; a drug category or completed treatment does not establish an SIS order.", "¿La orden judicial concede una suspended imposition of sentence conforme a SDCL 23A-27-13?", "Consulte la orden de este caso. Un aplazamiento por drogas conforme a 23A-27-53 es un procedimiento distinto; una categoría de drogas o un tratamiento completado no establece una orden SIS."),
  question("sd_sis_discharge_dismissal", "Did the court enter an order discharging you and dismissing this case?", "Completion of conditions and the court's discharge and dismissal order are separate facts. A general completion answer does not establish that the order issued.", "¿El tribunal dictó una orden que le da el alta y desestima este caso?", "Completar las condiciones y la orden judicial de alta y desestimación son hechos distintos. Una respuesta general sobre cumplimiento no establece que se dictó la orden."),
  question("sd_sis_record_public", "Does this case still appear on a public record search now?", "This concerns public visibility. It does not establish that every government record was removed, or answer whether you already filed a written correction request.", "¿Este caso todavía aparece en una búsqueda pública de antecedentes?", "La pregunta se refiere a la visibilidad pública. No establece que se eliminaron todos los registros gubernamentales ni responde si ya presentó una solicitud escrita de corrección."),
  question("sd_sis_prior_felony", "Had you been convicted of a felony before this case?", "Use the record before this case. A broad history answer or the charge level in this case does not supply this fact.", "¿Había sido condenado por un delito grave antes de este caso?", "Use los antecedentes anteriores a este caso. Una respuesta general sobre antecedentes o el nivel del cargo en este caso no establece este dato."),
  question("sd_sis_prior_sis", "Have you had a suspended imposition of sentence in another case?", "A previous SIS needs separate review of its level and order. Answering Yes does not by itself mean this case is disqualified.", "¿Ha recibido una suspended imposition of sentence en otro caso?", "Una SIS anterior requiere revisar por separado su nivel y su orden. Responder Sí no significa por sí solo que este caso esté descalificado."),
  question("sd_sis_teaching_licence", "Do you hold, or are you seeking, a South Dakota certified teaching licence?", "The source has a separate teaching-licence exception. This is not a finding that sealing removes licensing consequences.", "¿Tiene, o está solicitando, una licencia de docente certificado de Dakota del Sur?", "La fuente contiene una excepción independiente para la licencia docente. Esto no establece que el sellado elimine las consecuencias para la licencia."),
  question("sd_sis_specified_charge", "Does the underlying charge record cite SDCL 22-22-1 or 22-22-7?", "Read the charge citation. Any relevant subdivision and teaching-licence consequences need review; do not infer this from a broad category.", "¿El expediente del cargo subyacente cita SDCL 22-22-1 o 22-22-7?", "Lea la referencia del cargo. Las subdivisiones pertinentes y las consecuencias para la licencia docente requieren revisión; no infiera este dato de una categoría general.")
];
export const SD_SIS_FACT_IDS = SD_SIS_QUESTIONS.map(q => q.id);
export function southDakotaSisQuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, answers: Record<string, unknown>, id: string): boolean {
  return !SD_SIS_FACT_IDS.includes(id) || southDakotaSisContext(profile, pathway)
    && (id !== "sd_sis_specified_charge" || answers.sd_sis_teaching_licence === "Yes");
}
export const SD_SIS_COPY = {
  missing: "Check the SIS order, discharge and dismissal, public-record status and the separate history facts. An earlier category, drug deferral or general completion answer does not establish them.",
  order_review: "The reported order does not establish a suspended imposition of sentence under 23A-27-13. Review the actual order; the separate drug-deferral procedure under 23A-27-53 cannot substitute for SIS.",
  duty_review: "The reported facts do not establish both completed court conditions and a discharge and dismissal order. Confirm those events before relying on the SIS sealing duty or a correction request.",
  felony_review: "The reported felony SIS needs review outside this self-help scope. No new eligibility, sentence completion or sealing finding has been made.",
  prior_review: "The prior felony or SIS needs review with the specific orders and levels. A prior SIS alone is not a blanket disqualification; one felony SIS and one misdemeanor SIS are distinct limits.",
  licence_review: "The reported charge and teaching-licence facts need separate review, including the exact subdivision. Sealing does not establish that a teaching application must be accepted or that a licence cannot be revoked.",
  stage_review: "The public-record answer and the saved correction-request stage disagree. Check both facts. Neither answer will replace the other or establish that a remedial filing is appropriate.",
  public_status_review: "The reported case no longer appears publicly. This is not verification that sealing occurred or that every record is gone. DCI retains a nonpublic disposition; keep the correction-request stage separate.",
  record_review: "The reported SIS facts are retained for review. Confirm the order, discharge and dismissal and current record status. DCI retains a nonpublic disposition. The existing written-request and enforcement stages remain separate; no eligibility, completed sealing or payment authority is established."
} as const;
export function southDakotaSisFacts(a: Record<string, unknown>): { code: keyof typeof SD_SIS_COPY; ids: string[] } {
  const ids = SD_SIS_FACT_IDS.filter(id => (id !== "sd_sis_specified_charge" || a.sd_sis_teaching_licence === "Yes") && !(typeof a[id] === "string" && ["Yes", "No"].includes(a[id] as string)));
  if (typeof a.offense_level !== "string" || !["Felony", "Misdemeanor", "Infraction or violation", "Traffic or driving matter", "Municipal or ordinance matter"].includes(a.offense_level)) ids.push("offense_level");
  if (typeof a.court_requirements_completed !== "string" || !["yes", "no", "not_sure", "not_applicable"].includes(a.court_requirements_completed)) ids.push("court_requirements_completed");
  if (ids.length) return { code: "missing", ids };
  const review = (code: keyof typeof SD_SIS_COPY) => ({ code, ids: [] });
  if (a.sd_sis_granted !== "Yes") return review("order_review");
  if (a.court_requirements_completed !== "yes" || a.sd_sis_discharge_dismissal !== "Yes") return review("duty_review");
  if (a.offense_level === "Felony") return review("felony_review");
  if (a.sd_sis_prior_felony === "Yes" || a.sd_sis_prior_sis === "Yes") return review("prior_review");
  if (a.sd_sis_teaching_licence === "Yes" && a.sd_sis_specified_charge === "Yes") return review("licence_review");
  if (a.sd_sis_record_public === "Yes" && a[SD_SIS_STAGE_FACT_ID] === SD_SIS_STAGE_RECORD_CORRECTED
    || a.sd_sis_record_public === "No" && a[SD_SIS_STAGE_FACT_ID] === SD_SIS_STAGE_RECORD_NOT_CORRECTED) return review("stage_review");
  return review(a.sd_sis_record_public === "No" ? "public_status_review" : "record_review");
}
