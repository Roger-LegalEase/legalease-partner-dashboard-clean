import { nyClassificationAnswerCurrent, nyClassificationRecordBinding, type NyConvictionClassification } from "@/lib/expungement-ai/ny-16059-case-classification";

/** A record declaration, never a classification inferred from charge text. */
export const NY_STATUTORY_CLASS_VERSION = "ny_16059_statutory_class_v1" as const;
export const NY_STATUTORY_CLASS_LABELS = {
  "": { en: "Choose an answer", es: "Seleccione una respuesta" },
  felony_a: { en: "Class A felony", es: "Delito grave de clase A" },
  felony_b: { en: "Class B felony", es: "Delito grave de clase B" },
  felony_c: { en: "Class C felony", es: "Delito grave de clase C" },
  felony_d: { en: "Class D felony", es: "Delito grave de clase D" },
  felony_e: { en: "Class E felony", es: "Delito grave de clase E" },
  misdemeanor_a: { en: "Class A misdemeanor", es: "Delito menor de clase A" },
  misdemeanor_b: { en: "Class B misdemeanor", es: "Delito menor de clase B" },
  misdemeanor_unclassified: { en: "Unclassified misdemeanor", es: "Delito menor sin clasificación" },
  unknown: { en: "I am not sure", es: "No estoy seguro" }
} as const;
export type NyStatutoryClassValue = keyof typeof NY_STATUTORY_CLASS_LABELS;
type Conviction = { id: string; charge: string; section: string; grade: string; classification?: NyConvictionClassification; statutoryClass?: NyStatutoryClass };
export type NyStatutoryClass = {
  version: typeof NY_STATUTORY_CLASS_VERSION;
  value: NyStatutoryClassValue;
  record: ReturnType<typeof nyClassificationRecordBinding> & { recordClass: string };
};
const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
export function isNyStatutoryClass(raw: unknown): raw is NyStatutoryClass {
  return exact(raw, ["version", "value", "record"]) && raw.version === NY_STATUTORY_CLASS_VERSION
    && typeof raw.value === "string" && Object.hasOwn(NY_STATUTORY_CLASS_LABELS, raw.value)
    && exact(raw.record, ["convictionId", "charge", "section", "grade", "recordClass"])
    && Object.values(raw.record).every(value => typeof value === "string" && !/[\x00-\x1f\x7f]/.test(value))
    && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(raw.record.convictionId as string)
    && ["", "felony", "misdemeanor", "violation", "unknown"].includes(raw.record.recordClass as string);
}
export function withNyStatutoryClass(conviction: Conviction, value: NyStatutoryClassValue): NyStatutoryClass {
  return { version: NY_STATUTORY_CLASS_VERSION, value, record: { ...nyClassificationRecordBinding(conviction),
    recordClass: nyClassificationAnswerCurrent(conviction, "recordClass") ? conviction.classification!.recordClass.value : "" } };
}
export function nyStatutoryClassCurrent(conviction: Conviction) {
  const held = conviction.statutoryClass;
  if (!isNyStatutoryClass(held) || !nyClassificationAnswerCurrent(conviction, "recordClass")) return false;
  const current = withNyStatutoryClass(conviction, held.value).record;
  return (Object.keys(current) as Array<keyof typeof current>).every(key => current[key] === held.record[key]);
}
export function nyStatutoryClassCoherent(conviction: Conviction) {
  return nyStatutoryClassCurrent(conviction) && conviction.statutoryClass!.value.startsWith(`${conviction.classification!.recordClass.value}_`);
}
