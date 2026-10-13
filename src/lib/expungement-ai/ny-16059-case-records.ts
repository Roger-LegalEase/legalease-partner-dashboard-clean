/** Packet preparation transport. An actual court case is not a legal conviction
 * group or a printed form row. No value here proves attachment or execution. */
export const NY_CASE_RECORDS_ID = "ny_16059_covered_case_records";
export const NY_CASE_RECORDS_CONTRACT = "ny_16059_case_records_v1" as const;
export const NY_STATEMENT_ID = "ny_16059_applicant_statement";
export const NY_STATEMENT_CONTRACT = "ny_16059_applicant_statement_v1" as const;

export type NySentenceEvent = {
  id: string;
  sentenceDate: string;
  sentenceTerms: string;
  postSentenceCustody: "" | "yes" | "no" | "unknown";
  releases: Array<{ id: string; releaseDate: string }>;
};
export type NyConvictionRecord = {
  id: string;
  charge: string;
  section: string;
  grade: string;
  convictionDate: string;
  sentences: NySentenceEvent[];
};
export type NyCourtCaseRecord = {
  id: string;
  priorCaseReference: "" | "first";
  caseNumbers: string;
  courtName: string;
  courtCounty: string;
  convictions: NyConvictionRecord[];
  certificateStatus: "" | "available" | "request_needed" | "unavailable" | "unknown";
  certificateExplanation: string;
};
type State = "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined";
const unknownTokens = new Set(["unknown", "unsure", "not sure", "i am not sure", "i'm not sure", "no estoy seguro", "no estoy segura", "no sé", "no se"]);
const uncertain = (value: string) => !value.trim() || unknownTokens.has(value.trim().toLowerCase().replace(/\u2019/g, "'")) || value.trim().toLowerCase() === "prefer not to say";
const line = (value: unknown): value is string => typeof value === "string" && !/[\x00-\x1f\x7f]/.test(value);
const narrative = (value: unknown): value is string => typeof value === "string" && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
const stableId = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const exactObject = (value: unknown, keys: string[]): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return (proto === Object.prototype || proto === null) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
};
const calendar = (value: unknown) => {
  if (!line(value)) return false;
  if (uncertain(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const caseKeys = ["id", "priorCaseReference", "caseNumbers", "courtName", "courtCounty", "convictions", "certificateStatus", "certificateExplanation"];
const convictionKeys = ["id", "charge", "section", "grade", "convictionDate", "sentences"];
const sentenceKeys = ["id", "sentenceDate", "sentenceTerms", "postSentenceCustody", "releases"];

/** The existing string[] wire carries one exact JSON object per stable case.
 * It is NOT multi-select. Object keys, nested facts, identities and date syntax
 * are checked before use; partial empty/unknown facts remain saveable. */
export function parseNyCourtCaseRecords(raw: unknown): NyCourtCaseRecord[] | null {
  if (!Array.isArray(raw) || raw.some(entry => typeof entry !== "string")) return null;
  const cases: NyCourtCaseRecord[] = [];
  const caseIds = new Set<string>(), convictionIds = new Set<string>(), sentenceIds = new Set<string>(), releaseIds = new Set<string>();
  let firstReferences = 0;
  for (const wire of raw) {
    let value: unknown;
    try { value = JSON.parse(wire); } catch { return null; }
    if (!exactObject(value, caseKeys) || !stableId(value.id) || caseIds.has(value.id)
      || !["", "first"].includes(String(value.priorCaseReference)) || typeof value.priorCaseReference !== "string"
      || !line(value.caseNumbers) || !line(value.courtName) || !line(value.courtCounty)
      || !Array.isArray(value.convictions) || !["", "available", "request_needed", "unavailable", "unknown"].includes(String(value.certificateStatus))
      || typeof value.certificateStatus !== "string" || !narrative(value.certificateExplanation)) return null;
    caseIds.add(value.id);
    if (value.priorCaseReference === "first" && ++firstReferences > 1) return null;
    for (const conviction of value.convictions) {
      if (!exactObject(conviction, convictionKeys) || !stableId(conviction.id) || convictionIds.has(conviction.id)
        || !line(conviction.charge) || !line(conviction.section) || !line(conviction.grade)
        || !line(conviction.convictionDate) || !Array.isArray(conviction.sentences)) return null;
      convictionIds.add(conviction.id);
      for (const sentence of conviction.sentences) {
        if (!exactObject(sentence, sentenceKeys) || !stableId(sentence.id) || sentenceIds.has(sentence.id)
          || !line(sentence.sentenceDate) || !narrative(sentence.sentenceTerms)
          || typeof sentence.postSentenceCustody !== "string" || !["", "yes", "no", "unknown"].includes(sentence.postSentenceCustody)
          || !Array.isArray(sentence.releases)) return null;
        sentenceIds.add(sentence.id);
        for (const release of sentence.releases) {
          if (!exactObject(release, ["id", "releaseDate"]) || !stableId(release.id) || releaseIds.has(release.id) || !line(release.releaseDate)) return null;
          releaseIds.add(release.id);
        }
      }
    }
    // Canonical wire prevents duplicate JSON keys and alternate spellings from
    // silently changing the owner's saved meaning. The editor writes this form.
    if (JSON.stringify(value) !== wire) return null;
    cases.push(value as unknown as NyCourtCaseRecord);
  }
  return cases;
}

export function nyCourtCaseRecordsState(raw: unknown, today = new Date().toISOString().slice(0, 10)): State {
  if (raw === undefined || raw === null || raw === "") return "unanswered";
  const cases = parseNyCourtCaseRecords(raw);
  if (!cases) return "invalid";
  if (!cases.length) return "unanswered";
  const pastDate = (value: string) => calendar(value) && !uncertain(value) && value <= today;
  const completeSentence = (sentence: NySentenceEvent, convictionDate: string) => {
    if (!pastDate(sentence.sentenceDate) || sentence.sentenceDate < convictionDate || uncertain(sentence.sentenceTerms)) return false;
    if (sentence.postSentenceCustody === "no") return true;
    return sentence.postSentenceCustody === "yes" && sentence.releases.length > 0
      && sentence.releases.every(release => pastDate(release.releaseDate) && release.releaseDate >= sentence.sentenceDate);
  };
  const completeConviction = (conviction: NyConvictionRecord) =>
    [conviction.charge, conviction.section, conviction.grade].every(value => !uncertain(value)) && pastDate(conviction.convictionDate)
    && conviction.sentences.length > 0 && conviction.sentences.every(sentence => completeSentence(sentence, conviction.convictionDate));
  const complete = cases.every(record =>
    [record.caseNumbers, record.courtName, record.courtCounty].every(value => !uncertain(value))
    && record.convictions.length > 0 && record.convictions.every(completeConviction)
    && ["available", "request_needed", "unavailable"].includes(record.certificateStatus)
    && (record.certificateStatus !== "unavailable" || !uncertain(record.certificateExplanation)));
  return complete ? "known_valid" : "uncertain";
}

export function nyApplicantStatementState(raw: unknown): State {
  if (raw === undefined || raw === null || raw === "") return "unanswered";
  let value: unknown = raw;
  if (typeof value === "object" && !Array.isArray(value) && value) {
    const wrapper = value as Record<string, unknown>;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null
      || Object.keys(wrapper).some(key => key !== "value" && key !== "unknown")
      || wrapper.unknown !== undefined && typeof wrapper.unknown !== "boolean"
      || wrapper.value !== undefined && wrapper.value !== null && typeof wrapper.value !== "string") return "invalid";
    if (wrapper.unknown === true) return "uncertain";
    value = wrapper.value;
  }
  if (!narrative(value)) return "invalid";
  if (!value.trim()) return "unanswered";
  if (value.trim().toLowerCase() === "prefer not to say") return "declined";
  return uncertain(value) ? "uncertain" : "known_valid";
}

export const emptyNySentenceEvent = (id: string): NySentenceEvent => ({ id, sentenceDate: "", sentenceTerms: "", postSentenceCustody: "", releases: [] });
export const emptyNyConvictionRecord = (id: string): NyConvictionRecord => ({ id, charge: "", section: "", grade: "", convictionDate: "", sentences: [] });
export const emptyNyCourtCaseRecord = (id: string): NyCourtCaseRecord => ({ id, priorCaseReference: "", caseNumbers: "", courtName: "", courtCounty: "", convictions: [], certificateStatus: "", certificateExplanation: "" });
export const encodeNyCourtCaseRecords = (records: readonly NyCourtCaseRecord[]) => records.map(record => JSON.stringify(record));

/** Display labels only are translated; all names and record narratives stay exact. */
export function formatNyCourtCaseRecords(raw: unknown, locale: "en" | "es") {
  const es = locale === "es";
  const records = parseNyCourtCaseRecords(raw);
  if (!records) return es ? "Revise la lista guardada en el editor de casos." : "Review the saved list in the case editor.";
  if (!records.length) return es ? "No se han registrado casos." : "No cases recorded.";
  const text = (value: string) => !value.trim() ? es ? "Sin respuesta" : "Unanswered" : unknownTokens.has(value.trim().toLowerCase()) ? es ? "No estoy seguro" : "I am not sure" : value;
  const certificate = { available: es ? "Original o copia legible disponible" : "Original or legible copy available", request_needed: es ? "Necesita obtener una copia" : "Needs to obtain a copy", unavailable: es ? "No puede obtenerlo" : "Cannot obtain it", unknown: es ? "No estoy seguro" : "I am not sure", "": es ? "Sin respuesta" : "Unanswered" };
  return records.map((record, index) => [
    `${es ? "Caso judicial" : "Court case"} ${index + 1}: ${text(record.caseNumbers)}`,
    `${es ? "Tribunal" : "Court"}: ${text(record.courtName)}; ${es ? "condado" : "county"}: ${text(record.courtCounty)}`,
    ...(record.priorCaseReference === "first" ? [es ? "Asociado con el primer caso guardado." : "Associated with the saved first case."] : []),
    ...record.convictions.flatMap((conviction, convictionIndex) => [
      `${es ? "Condena" : "Conviction"} ${convictionIndex + 1}: ${text(conviction.charge)}; ${text(conviction.section)}; ${text(conviction.grade)}; ${es ? "fecha" : "date"}: ${text(conviction.convictionDate)}`,
      ...conviction.sentences.flatMap((sentence, sentenceIndex) => [
        `${es ? "Sentencia" : "Sentence event"} ${sentenceIndex + 1}: ${text(sentence.sentenceDate)}; ${text(sentence.sentenceTerms)}`,
        `${es ? "Encarcelamiento posterior a la sentencia" : "Post-sentence incarceration"}: ${sentence.postSentenceCustody === "yes" ? es ? "Sí" : "Yes" : sentence.postSentenceCustody === "no" ? "No" : text(sentence.postSentenceCustody)}`,
        ...(sentence.postSentenceCustody === "yes" ? sentence.releases.map(release => `${es ? "Liberación" : "Release"}: ${text(release.releaseDate)}`) : [])
      ])
    ]),
    `${es ? "Certificado" : "Certificate"}: ${certificate[record.certificateStatus]}`,
    ...(record.certificateStatus === "unavailable" ? [text(record.certificateExplanation)] : [])
  ].join("\n")).join("\n\n");
}
