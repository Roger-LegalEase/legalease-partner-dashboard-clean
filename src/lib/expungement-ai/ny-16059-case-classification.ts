/** Owner declarations tied to exact record text, not legal/source approval. */
export const NY_CLASSIFICATION_VERSION = "ny_16059_conviction_classification_v1" as const;
export const NY_EXCLUDED_CATEGORIES = [
  "article_130", "article_263", "article_125_felony", "violent_felony_70_02",
  "class_a_felony", "article_105_ineligible_felony", "ineligible_felony_attempt", "registration_6c"
] as const;
export type NyExcludedCategory = typeof NY_EXCLUDED_CATEGORIES[number];
export type NyRecordClass = "" | "felony" | "misdemeanor" | "violation" | "unknown";
type RecordBinding = { convictionId: string; charge: string; section: string; grade: string };
export type NyConvictionClassification = {
  version: typeof NY_CLASSIFICATION_VERSION;
  recordClass: { value: NyRecordClass; record: RecordBinding };
  excluded: { value: Array<NyExcludedCategory | "none" | "unknown">; record: RecordBinding };
};
type Conviction = { id: string; charge: string; section: string; grade: string; classification?: NyConvictionClassification };
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const line = (value: unknown): value is string => typeof value === "string" && !/[\x00-\x1f\x7f]/.test(value);
const binding = (value: unknown) => exact(value, ["convictionId", "charge", "section", "grade"])
  && Object.values(value).every(line) && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value.convictionId as string);

export function isNyConvictionClassification(value: unknown): value is NyConvictionClassification {
  if (!exact(value, ["version", "recordClass", "excluded"]) || value.version !== NY_CLASSIFICATION_VERSION
    || !exact(value.recordClass, ["value", "record"]) || !binding(value.recordClass.record)
    || typeof value.recordClass.value !== "string" || !["", "felony", "misdemeanor", "violation", "unknown"].includes(value.recordClass.value)
    || !exact(value.excluded, ["value", "record"]) || !binding(value.excluded.record) || !Array.isArray(value.excluded.value)) return false;
  const choices = value.excluded.value;
  return choices.every(choice => typeof choice === "string" && [...NY_EXCLUDED_CATEGORIES, "none", "unknown"].includes(choice))
    && new Set(choices).size === choices.length && (!choices.includes("none") && !choices.includes("unknown") || choices.length === 1);
}
export const nyClassificationRecordBinding = (conviction: Conviction): RecordBinding => ({
  convictionId: conviction.id, charge: conviction.charge, section: conviction.section, grade: conviction.grade
});
export function nyClassificationAnswerCurrent(conviction: Conviction, kind: "recordClass" | "excluded") {
  const held = conviction.classification?.[kind]?.record;
  const current = nyClassificationRecordBinding(conviction);
  return !!held && (Object.keys(current) as Array<keyof RecordBinding>).every(key => held[key] === current[key]);
}
export function nyClassificationComplete(conviction: Conviction) {
  const value = conviction.classification;
  return !!value && isNyConvictionClassification(value) && nyClassificationAnswerCurrent(conviction, "recordClass")
    && ["felony", "misdemeanor", "violation"].includes(value.recordClass.value)
    && nyClassificationAnswerCurrent(conviction, "excluded") && value.excluded.value.length > 0 && !value.excluded.value.includes("unknown");
}
/** Changing one answer never renews the other answer's older record binding. */
export function withNyClassificationAnswer(conviction: Conviction, kind: "recordClass", value: NyRecordClass): NyConvictionClassification;
export function withNyClassificationAnswer(conviction: Conviction, kind: "excluded", value: NyConvictionClassification["excluded"]["value"]): NyConvictionClassification;
export function withNyClassificationAnswer(conviction: Conviction, kind: "recordClass" | "excluded", value: NyRecordClass | NyConvictionClassification["excluded"]["value"]): NyConvictionClassification {
  const record = nyClassificationRecordBinding(conviction);
  const current = structuredClone(conviction.classification ?? { version: NY_CLASSIFICATION_VERSION,
    recordClass: { value: "", record }, excluded: { value: [], record } });
  return { ...current, [kind]: { value, record } } as NyConvictionClassification;
}
export const NY_RECORD_CLASS_LABELS: Record<NyRecordClass, { en: string; es: string }> = {
  "": { en: "Choose an answer", es: "Seleccione una respuesta" },
  felony: { en: "Felony", es: "Delito grave (felony)" },
  misdemeanor: { en: "Misdemeanor", es: "Delito menor (misdemeanor)" },
  violation: { en: "Violation, not a misdemeanor or felony", es: "Infracción (violation), no un delito menor ni grave" },
  unknown: { en: "I am not sure", es: "No estoy seguro" }
};
export const NY_EXCLUDED_CATEGORY_LABELS: Record<NyExcludedCategory | "none" | "unknown", { en: string; es: string }> = {
  article_130: { en: "A sex offense under Penal Law article 130", es: "Un delito sexual conforme al artículo 130 de la Ley Penal" },
  article_263: { en: "An offense under Penal Law article 263", es: "Un delito conforme al artículo 263 de la Ley Penal" },
  article_125_felony: { en: "A felony under Penal Law article 125", es: "Un delito grave conforme al artículo 125 de la Ley Penal" },
  violent_felony_70_02: { en: "A violent felony listed in Penal Law 70.02", es: "Un delito grave violento enumerado en la sección 70.02 de la Ley Penal" },
  class_a_felony: { en: "A class A felony under the Penal Law", es: "Un delito grave de clase A conforme a la Ley Penal" },
  article_105_ineligible_felony: { en: "A felony conspiracy under article 105 whose underlying offense is excluded", es: "Una conspiración de nivel de delito grave conforme al artículo 105 cuyo delito subyacente está excluido" },
  ineligible_felony_attempt: { en: "A felony attempt to commit an excluded offense", es: "Una tentativa de nivel de delito grave de cometer un delito excluido" },
  registration_6c: { en: "An offense requiring sex-offender registration under Correction Law article 6-C", es: "Un delito que exige inscripción en el registro de delincuentes sexuales conforme al artículo 6-C de la Ley Correccional" },
  none: { en: "None of these categories applies to this conviction", es: "Ninguna de estas categorías corresponde a esta condena" },
  unknown: { en: "I am not sure", es: "No estoy seguro" }
};
