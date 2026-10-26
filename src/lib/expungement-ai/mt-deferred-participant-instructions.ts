import "server-only";
import { createHash } from "node:crypto";
import { montanaDeferredDocumentInputs } from "@/lib/expungement-ai/mt-deferred-document-inputs";

/** Source-matched companion draft only. These translations do not replace the
 * English court pleadings or retained official DOJ form, approve their use,
 * decide a new legal question, or authorize any runtime delivery. The caller
 * must preserve the qualified-language-review status when presenting a draft.
 * Source paragraphs retain their original English identities for exact review. */
export const MT_DEFERRED_INSTRUCTION_LANGUAGE_STATUS = {
  en: "retained_source_text", es: "draft_pending_qualified_language_review",
  courtDocumentLanguage: "en", officialFormLanguage: "en"
} as const;
export const MT_DEFERRED_INSTRUCTION_SOURCE = {
  trackId: "mt_deferred_dismissal", decisionId: "LD-MT-01",
  retainedBuilder: "scripts/build-census-v1-mt_deferred_dismissal-set.mjs",
  stagedEnglishCommit: "77bf601538ee93990231175d98efc53adb1665d7",
  stagedEnglishPath: "src/lib/rcap/render/montana-deferred-document-renderer.ts",
  stagedEnglishSha256: "dd99b2877ea89a621719818252db240381f58af2dc4e8f036cd3dbff6730133e"
} as const;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ascii = (s: string) => s.replace(/[\u2010-\u2015]/g, "-").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, " ");
type Paragraph = { sourceId: string; en: string; es: string };
const spanish: Record<number, string> = {
  "0": "ANTES DE USAR ESTOS DOCUMENTOS: todo participante que no sea ciudadano de los Estados Unidos debe detenerse y obtener asesoramiento de inmigración. Una desestimación después del aplazamiento de la imposición de la sentencia puede seguir siendo una condena para fines migratorios. Esta vía se refiere únicamente al sellado y a la información confidencial de justicia penal. No suponga que puede negar el cargo.",
  "1": "COMUNÍQUESE PRIMERO CON LA SECRETARÍA DEL TRIBUNAL QUE DICTÓ LA SENTENCIA. Pregunte: ¿Cuál es su procedimiento para una moción conforme a MCA 46-18-204? ¿Exigen un formulario local, una carátula o un anexo? ¿El tribunal ya desestimó y selló mi caso por iniciativa propia? Un procedimiento o formulario local vigente tiene prioridad sobre esta moción redactada. Deténgase si corresponde usar uno; no presente una moción duplicada si ya se concedió la medida.",
  "2": "Obtenga la orden de sentencia aplazada y confirme el número del caso penal existente, el tribunal que dictó la sentencia, la fecha de la sentencia, el delito y su clasificación, la declaración de culpabilidad o de no oposición o el veredicto, el período de aplazamiento y su cumplimiento. El aplazamiento de la imposición de la sentencia es distinto de una sentencia suspendida; una sentencia suspendida no reúne los requisitos de este conjunto de documentos.",
  "3": "Pida a la secretaría que confirme en el expediente si la fiscalía presentó alguna petición de revocación durante el aplazamiento conforme a MCA 46-18-203. No afirme que no se presentó ninguna sin esa confirmación. Una petición presentada impide aplicar la regla obligatoria para delitos graves y exige revisión jurídica incluso en un caso de delito menor. Verifique que se cumplieron todas las condiciones, incluidas las multas y tasas. Obtenga constancias de cumplimiento si se las solicitan; si existe una disputa, debe detenerse.",
  "4": "Para un delito grave que reúne los requisitos, cuyo aplazamiento se cumplió y respecto del cual no se presentó una petición de revocación, MCA 46-18-204(1)(a) usa el término obligatorio «deberá»; la medida para delitos menores sigue siendo discrecional. Estos documentos son únicamente para un aplazamiento ya cumplido. La terminación anticipada conforme a MCA 46-18-208 requiere una revisión por separado; no se debe suponer que venció el período.",
  "5": "Revise todos los hechos de la moción; firme la declaración bajo pena de perjurio conforme a la ley de Montana e indique la fecha real y la ciudad y el estado. Esa declaración no requiere certificación notarial. No complete las determinaciones, la fecha de la orden ni la firma que corresponden al juez.",
  "6": "PRIMERO PRESENTE LOS DOCUMENTOS Y DESPUÉS NOTIFÍQUELOS. Presente la moción, el certificado de notificación y la propuesta de orden ante la secretaría del tribunal que dictó la sentencia, en el MISMO caso penal existente. Pregunte cómo quiere la secretaría que se tramite el certificado antes de que se complete la notificación; no firme un certificado falso. Notifique por correo o mediante entrega personal una copia de la moción sellada como presentada al fiscal del condado o de la ciudad que llevó el caso. Después de la notificación, registre el método, el destinatario y la fecha reales y la firma de la persona que realizó la notificación. No se presuponen respuestas ni audiencias del tribunal o de la fiscalía, ni se les asignan plazos inventados.",
  "7": "No se inicia un caso civil nuevo. No se espera una tasa por la moción, pero sigue sin resolverse si un tribunal local cobra una: pregunte a la secretaría; estos documentos no indican un importe de tasas judiciales. Las instrucciones adoptadas indican que la solicitud a CRISS no tiene costo.",
  "8": "DESPUÉS DE LA ORDEN DEL TRIBUNAL: obtenga la orden de desestimación firmada. El acusado es responsable de hacer un envío POR SEPARADO a DOJ CRISS; el sellado por el tribunal, por sí solo, no completa la actualización del registro del DOJ. Use el formulario CRISS Expungement/Removal Request Form de 2024, únicamente con el tipo de solicitud correspondiente a la imposición de sentencia aplazada. Adjunte la orden de sentencia aplazada y la orden de desestimación; como medida de precaución sobre los documentos adjuntos, solicite copias certificadas de la sentencia e incluya, por defecto, una identificación con fotografía válida. No seleccione expurgación de delito menor, expurgación de marihuana ni eliminación por ausencia de condena.",
  "9": "Dirección postal de CRISS indicada en el formulario conservado: CRISS Expungement, 2225 11th Ave., PO Box 201403, Helena, MT 59620. Consultas: 406-444-3625. El formulario indica que se permitan 30 días para la tramitación y que CRISS proporciona una carta de confirmación. Conserve el comprobante de envío, las copias y la respuesta.",
  "10": "VERIFIQUE AMBOS SISTEMAS: después de la orden y de la tramitación del DOJ, consulte los portales de acceso público de Montana y obtenga un registro de antecedentes penales actualizado de CRISS. Verifique que el caso esté sellado y se trate como información confidencial de justicia penal; si sigue siendo público o el cargo permanece en el registro del DOJ, comuníquese con la secretaría correspondiente o con CRISS y obtenga ayuda jurídica según sea necesario. El sellado no es destrucción ni una promesa de que se puede negar un cargo.",
  "13": "Dato que debe completarse antes de presentar el certificado de notificación: nombre en letra de molde de la persona que realmente efectuó la notificación. No se supone que esa persona sea el acusado."
};
const spanishStops = [
  "Se presentó una petición de revocación, lo que impide aplicar la regla para delitos graves y complica la regla para delitos menores.",
  "La sentencia fue suspendida en lugar de aplazarse su imposición.",
  "El participante solicita una terminación anticipada en lugar de una desestimación posterior al cumplimiento.",
  "Existe alguna disputa sobre si se cumplieron las condiciones o venció el período de aplazamiento.",
  "La secretaría informa de un procedimiento específico del tribunal o de un formulario local diferente.",
  "El participante no es ciudadano de los Estados Unidos. Una desestimación después del aplazamiento de la imposición de la sentencia puede seguir siendo una condena para fines migratorios; esto exige detenerse.",
  "Existe alguna pregunta sobre si el participante puede ahora negar el cargo."
];

export function montanaDeferredParticipantInstructions(
  snapshot: Parameters<typeof montanaDeferredDocumentInputs>[0],
  current: Parameters<typeof montanaDeferredDocumentInputs>[1]
) {
  const mapping = montanaDeferredDocumentInputs(snapshot, current);
  if (mapping.status !== "mapped_for_review") return null;
  const track = current.contract.track as { selfHelpStopConditions: string[] };
  const stops = track.selfHelpStopConditions.map(ascii);
  const retainedInstructions = [
  'BEFORE GENERATION: any noncitizen participant must stop for immigration advice. Dismissal after deferred imposition may still be a conviction for immigration purposes. This route describes sealing and confidential criminal justice information only. Do not assume the charge may be denied.',
  'CONTACT THE SENTENCING COURT CLERK FIRST. Ask: What is your process for a motion under MCA 46-18-204? Do you require a local form, cover sheet, or addendum? Has my case already been dismissed and sealed on the court\'s own motion? A current local procedure or form overrides this drafted motion. Stop if one applies; do not file a duplicate motion if relief already occurred.',
  'Obtain the deferred sentence order and confirm the existing criminal case number, sentencing court, sentencing date, crime and classification, plea or verdict, deferral period and completion. Deferred imposition is different from a suspended sentence; a suspended sentence does not qualify for this packet.',
  'Ask the clerk to confirm from the case record whether the prosecutor filed any petition to revoke during deferral under MCA 46-18-203. Do not assert absence without that confirmation. A filed petition defeats the mandatory felony limb and requires legal review even on a misdemeanor. Verify all conditions, including fines and fees, were completed. Obtain compliance records if asked; disputes require a stop.',
  'For a qualifying completed felony with no revocation petition, MCA 46-18-204(1)(a) uses shall; misdemeanor relief remains discretionary. This packet is for completed deferral only. Early termination under MCA 46-18-208 requires separate review, not an assumed expired period.',
  'Review all motion facts; sign the declaration under penalty of perjury under Montana law, giving the actual date and city/state. No notarization is required for that declaration. Do not fill the judge\'s findings, order date or signature.',
  'FILE FIRST, THEN SERVE. File the motion, certificate of service and proposed order with the clerk of the sentencing court in the SAME existing criminal case. Ask how the clerk wants the certificate handled before service is completed; do not sign a false certificate. Serve the file-stamped motion by mail or hand delivery on the county attorney or city attorney who prosecuted the case. Record actual method, recipient, date and server signature after service. Court and prosecutor responses/hearings are not assumed or assigned invented deadlines.',
  'No new civil case is commenced. No motion fee is expected, but whether a local court charges a motion fee remains unresolved: ask the clerk; this packet quotes no court fee. The adopted instructions state no fee for the CRISS request.',
  'AFTER THE COURT ORDER: obtain the signed dismissal order. The defendant is responsible for a SEPARATE DOJ CRISS submission; court sealing alone does not complete the DOJ record update. Use the retained 2024 CRISS Expungement/Removal Request Form, deferred-imposition request type only. Enclose the deferred sentence order and dismissal order; request certified judgment copies and include valid photo identification by default under the adopted fail-closed attachment treatment. Do not select misdemeanor expungement, marijuana expungement, or non-conviction removal.',
  'CRISS mailing destination from the held form: CRISS Expungement, 2225 11th Ave., PO Box 201403, Helena, MT 59620. Questions: 406-444-3625. The form says to allow 30 days for processing and that CRISS supplies a confirmation letter. Preserve mailing proof, copies and the response.',
  'VERIFY BOTH SYSTEMS: after the order and DOJ processing, check both Montana Public Access Portals and obtain a fresh CRISS criminal history record. Verify the case is sealed and treated as confidential criminal justice information; if it remains public or the DOJ charge remains, contact the relevant clerk/CRISS and obtain legal help as needed. Sealing is not destruction or a promise about permission to deny a charge.',
  'SELF-HELP STOPS: '+stops.join(' '),
  'REVIEW ARTIFACT LIMIT: these fixtures contain synthetic facts and example contact details. The court documents and instructions are drafted, and the required DOJ source-derived form is supplied separately for use only after the court order. Do not file these synthetic review fixtures.',
  'Required completion before service certificate filing: Printed name of actual server. The server is not assumed to be the defendant.',
  'RELEASE NOTES RETAINED: local procedure/fee, DOJ 2023-versus-2024 attachment practice, supporting-process asset-role mismatch, and denial-of-charge legal effect remain the adopted release blockers. No source-index reclassification or commercial authority is created.'
 ];
  const selected = mapping.stage === "court_motion" ? [0,1,2,3,4,5,6,7,8,9,10,11,13] : [0,8,9,10];
  const paragraphs: Paragraph[] = selected.map(index => ({
    sourceId: `retained-mt-instructions:${index}`,
    en: index === 0 ? retainedInstructions[index].replace("BEFORE GENERATION:", "BEFORE USING THESE DOCUMENTS:") : retainedInstructions[index],
    es: index === 11 ? "CUÁNDO DETENER LA AUTOAYUDA: " + spanishStops.join(" ") : spanish[index]
  }));
  if (mapping.stage === "court_motion" && mapping.inputs.deferralTerminatedByOrder === true) {
    const orderDate = mapping.inputs.terminationOrderDate;
    paragraphs[4] = { sourceId: "staged-mt-instructions:existing-termination-order",
      en: "The court already terminated the remaining deferral time by an order entered on " + orderDate + ". Confirm that order and the applicable conditions; do not allege that the original full period expired. This motion requests dismissal under MCA 46-18-204, not a new early-termination order. The qualifying felony no-revocation limb is mandatory; misdemeanor relief remains discretionary.",
      es: "El tribunal ya terminó el tiempo restante del aplazamiento mediante una orden dictada el " + orderDate + " (mes/día/año). Confirme esa orden y las condiciones aplicables; no afirme que venció todo el período original. Esta moción solicita la desestimación conforme a MCA 46-18-204, no una nueva orden de terminación anticipada. La regla para delitos graves que reúnen los requisitos y sin petición de revocación es obligatoria; la medida para delitos menores sigue siendo discrecional." };
  }
  if (mapping.stage === "doj_after_order") paragraphs.push({ sourceId: "staged-mt-instructions:existing-dismissal-order",
    en: "Your supplied facts identify an existing dismissal order. This stage contains only the separate DOJ request and these instructions. Do not file a duplicate court motion. Sign and date the request yourself after checking its facts and the required enclosures; the optional last four SSN digits remain blank unless you choose to supply them yourself.",
    es: "Los hechos que proporcionó identifican una orden de desestimación ya existente. Esta etapa contiene únicamente la solicitud por separado al DOJ y estas instrucciones. No presente una moción judicial duplicada. Firme y feche usted mismo la solicitud después de revisar sus datos y los documentos adjuntos requeridos; los últimos cuatro dígitos opcionales del número de Seguro Social permanecen en blanco, a menos que usted decida proporcionarlos personalmente." });
  paragraphs.push({ sourceId: "staged-mt-instructions:retained-agency-access",
    en: "If the court has ordered sealing, records are treated as confidential criminal justice information. Agencies listed in MCA 44-5-103 retain access; DOJ identifies law enforcement, including the military and Border Patrol. Sealing does not destroy or erase the record and does not establish permission to deny a charge.",
    es: "Si el tribunal ha ordenado el sellado, los registros se tratan como información confidencial de justicia penal. Las agencias enumeradas en MCA 44-5-103 conservan acceso; el DOJ identifica a las fuerzas del orden, incluidas las fuerzas armadas y la Patrulla Fronteriza. El sellado no destruye ni borra el registro y no establece autorización para negar un cargo." });
  return { stage: mapping.stage, paragraphs,
    title: { en: "PARTICIPANT INSTRUCTIONS AND SEQUENTIAL CHECKLIST", es: "INSTRUCCIONES PARA EL PARTICIPANTE Y LISTA DE PASOS" },
    languageStatus: MT_DEFERRED_INSTRUCTION_LANGUAGE_STATUS, source: MT_DEFERRED_INSTRUCTION_SOURCE,
    contractSha256: hash(current.contract), inputSha256: hash({ inputs: mapping.inputs, inputSources: mapping.inputSources }),
    englishTextSha256: hash(paragraphs.map(p => p.en)), spanishDraftSha256: hash(paragraphs.map(p => p.es)),
    generationAllowed: false as const, admissionGranted: false as const, qualifiedSpanishApproval: false as const };
}
