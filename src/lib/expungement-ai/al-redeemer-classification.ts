import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/AL.memo.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/production-field-map.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/source-receipt.json";

export const AL_REDEEMER_ROUTE = "eligible-conviction-expungement-under-the-redeemer-act";
/** GA12 Q0e115 / GA21 Q2f7b / exact GA42 route / GA49 Q0e115. The
 * retained al-misd-conviction memo requires independent participant answers,
 * not a category inferred from charge grade. This is a protected collection
 * contract only: no evaluator, family selection, form election or authority. */
export function alRedeemerClassificationContract(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "AL" && pathwayId === AL_REDEEMER_ROUTE && specification == null
    && contactRepresentationHash(profile) === "ca219c1a1419f8b2900fd6368ac7202ba779ac084dae7e4dd507be943a29011c"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "62ee8eb99e0c1a45090bdd37f838671f9d7637e20f792e60cf0dbdb218bf31de"
    && contactRepresentationHash(current.fieldMap === undefined ? fieldMap : current.fieldMap) === "db1c36bd38093d471de517c143444e51b980703e93248f67f9bc94622647d752"
    && contactRepresentationHash(current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt) === "f1f8e8c5512878d9673df913d51c17dfc52707dc4acd75e927cde7771be32cad";
}
const yesNo = ["Yes", "No", "I am not sure"];
const note = "Answer from the record. If unclear, keep that answer and seek legal advice about the classification. These answers do not establish eligibility, select the seven conditions on CR-65, or change the current limits of this service.";
const noteEs = "Responda según el expediente. Si no está claro, conserve esa respuesta y busque asesoría legal sobre la clasificación. Estas respuestas no establecen la elegibilidad, no seleccionan las siete condiciones del CR-65 ni cambian los límites actuales de este servicio.";
const question = (id: string, prompt: string, es: string, options = yesNo): ProfileQuestion => ({
  id, stage: "packet_information", type: "single_choice", required: true, contextOnly: false,
  lifecyclePhase: "guidance_only", prompt, options, helperText: note,
  translations: { es: { prompt: es, helperText: noteEs } }
});
const LEVELS = ["Misdemeanor", "Violation", "Traffic violation", "Municipal ordinance violation", "Felony", "I am not sure"];
const QUESTIONS = [
  question("al_misd_record_level", "What was the level of the offense at conviction, or of the underlying charge for a youthful offender adjudication?", "¿Cuál era el nivel del delito al momento de la condena, o del cargo subyacente en una adjudicación como joven infractor (youthful offender)?", LEVELS),
  question("al_misd_youthful_offender", "Was this a youthful offender adjudication rather than a conviction?", "¿Fue una adjudicación como joven infractor (youthful offender) en lugar de una condena?"),
  question("al_misd_violent_offense", "Is the offense a violent offense under Alabama Code section 12-25-32?", "¿Es el delito un delito violento según la sección 12-25-32 del Código de Alabama?"),
  question("al_misd_sex_offense", "Is the offense a sex offense under Alabama Code section 15-20A-5?", "¿Es el delito un delito sexual según la sección 15-20A-5 del Código de Alabama?"),
  question("al_misd_moral_turpitude", "Is the offense a crime involving moral turpitude under Alabama Code section 17-3-30.1?", "¿Es el delito uno que implica depravación moral según la sección 17-3-30.1 del Código de Alabama?"),
  question("al_misd_reclassified", "Was the crime classified as a felony at conviction but reclassified as a misdemeanor under Act 2015-185?", "¿El delito estaba clasificado como delito grave al momento de la condena, pero fue reclasificado como delito menor según la Ley 2015-185?"),
  question("al_misd_recent_arrest", "In the 15 years before filing, have you been arrested for any offense other than a minor traffic violation?", "¿En los 15 años anteriores a la presentación, ha sido arrestado por algún delito que no sea una infracción menor de tránsito?"),
  question("al_misd_serious_traffic", "Is the offense a serious traffic offense under Article 9 of Chapter 5A of Title 32?", "¿Es el delito un delito grave de tránsito según el artículo 9 del capítulo 5A del título 32?"),
  question("al_misd_enumerated_driving", "Is the conviction for an offense listed in 49 CFR section 383.51?", "¿Es la condena por un delito incluido en la sección 383.51 del título 49 del CFR?"),
  question("al_misd_cdl_clp", "At the time of that listed offense, did you hold a commercial driver license (CDL) or commercial learner permit (CLP)?", "¿Al momento de ese delito incluido en la lista, tenía una licencia de conducir comercial (CDL) o un permiso de aprendizaje comercial (CLP)?"),
  question("al_misd_commercial_vehicle", "At the time of that listed offense, were you operating a commercial motor vehicle?", "¿Al momento de ese delito incluido en la lista, operaba un vehículo motorizado comercial?")
];
export const AL_REDEEMER_CLASSIFICATION_IDS = QUESTIONS.map(q => q.id);
/** Conflicting protected copies are not a factual answer. Compare typed raw
 * values without case folding, coercion, or choosing a map as legal authority. */
export function alRedeemerClassificationConflicts(...maps: Readonly<Record<string, unknown>>[]): string[] {
  return AL_REDEEMER_CLASSIFICATION_IDS.filter(id => {
    const values = maps.filter(map => Object.hasOwn(map, id)).map(map => contactRepresentationHash(map[id]));
    return new Set(values).size > 1;
  });
}
const scalar = (answers: Readonly<Record<string, unknown>>, id: string): string | null => {
  const raw = answers[id];
  // The ordinary protected single-choice transport also accepts this exact
  // known-value wrapper. Decode it without rewriting its stored representation;
  // unknown, malformed and extended objects remain unresolved.
  const value = raw !== null && typeof raw === "object" && !Array.isArray(raw)
    && Object.keys(raw).length === 2 && Object.hasOwn(raw, "value") && Object.hasOwn(raw, "unknown")
    && (raw as { unknown: unknown }).unknown === false
    ? (raw as { value: unknown }).value : raw;
  return typeof value === "string" && value !== "I am not sure" ? value : null;
};
/** A saved label, age, charge grade or selected route never supplies conviction.
 * Juvenile adjudication is not automatically a youthful-offender adjudication. */
export function alRedeemerClassificationIds(answers: Readonly<Record<string, unknown>>): string[] {
  const knownConviction = ["Misdemeanor conviction", "Felony conviction"].some(outcome => answers.case_outcome === outcome);
  const possibleAdjudication = ["Other conviction or adjudication", "Juvenile adjudication or offense committed as a minor"].some(outcome => answers.case_outcome === outcome);
  if (!knownConviction && !possibleAdjudication) return [];
  const ids: string[] = [];
  const read = (id: string) => { ids.push(id); return scalar(answers, id); };
  const youthful = read("al_misd_youthful_offender");
  if (!["Yes", "No"].includes(youthful ?? "") || possibleAdjudication && youthful !== "Yes") return ids;
  const level = read("al_misd_record_level");
  if (!level || !LEVELS.includes(level)) return ids;
  // Reclassification is an explicit record fact, never inferred from an old
  // charge/conviction grade disagreement or from a chosen misdemeanor route.
  if (level === "Felony" && read("al_misd_reclassified") !== "Yes") return ids;
  if (read("al_misd_violent_offense") !== "No") return ids;
  if (read("al_misd_sex_offense") !== "No") return ids;
  const moral = read("al_misd_moral_turpitude");
  if (!["Yes", "No"].includes(moral ?? "")) return ids;
  if (moral === "Yes") {
    const reclassified = level === "Felony" ? scalar(answers, "al_misd_reclassified") : read("al_misd_reclassified");
    // A misdemeanor-at-conviction answer cannot simultaneously establish a
    // felony-at-conviction reclassification. Retain both and stop for correction.
    if (reclassified !== "Yes" || level !== "Felony" || read("al_misd_recent_arrest") !== "No") return ids;
  }
  if (read("al_misd_serious_traffic") !== "No") return ids;
  const enumerated = read("al_misd_enumerated_driving");
  if (enumerated !== "Yes") return ids;
  if (read("al_misd_cdl_clp") !== "No") return ids;
  read("al_misd_commercial_vehicle");
  return ids;
}
export function alRedeemerClassificationQuestions(answers: Readonly<Record<string, unknown>>, includeInactive = false): ProfileQuestion[] {
  const active = new Set(alRedeemerClassificationIds(answers));
  const ordered = includeInactive ? QUESTIONS : alRedeemerClassificationIds(answers).map(id => QUESTIONS.find(q => q.id === id)!);
  return ordered.filter(q => includeInactive || active.has(q.id)).map(q => ({ ...structuredClone(q),
    optionDisplay: q.id === "al_misd_record_level" ? Object.fromEntries(LEVELS.map((value, i) => [value, { label: value, translations: { es: { label: ["Delito menor", "Infracción", "Infracción de tránsito", "Infracción de ordenanza municipal", "Delito grave", "No estoy seguro"][i] } } }])) : undefined }));
}
export function alRedeemerCategoryQuestion<T extends ProfileQuestion>(question: T): T {
  if (question.id !== "offense_category" || question.type !== "text_or_unknown"
    || question.prompt !== "What category does the court record use for this offense?") return question;
  return { ...question, required: false, prompt: "Earlier offense-category answer (optional history)",
    helperText: "This earlier description remains history. It does not supply the separate statutory classifications, the conviction grade, or any condition selected on CR-65.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre la categoría del delito (historial opcional)",
      helperText: "Esta descripción anterior se conserva como historial. No proporciona las clasificaciones legales separadas, el nivel de la condena ni ninguna condición seleccionada en el CR-65." } } };
}
