import { nyPacketTextAnswerState } from "@/lib/expungement-ai/ny-16059-packet-facts";
/** Intended applications are neither completed filings nor convictions to count. */
export const NY_FUTURE_ID = "ny_16059_future_sealing_records";
export const NY_FUTURE_CONTRACT = "ny_16059_future_applications_v1" as const;
export const NY_FUTURE_FACT_IDS = [NY_FUTURE_ID];
export type NyFutureCase = { id: string; source: "saved_future" | "additional"; savedReview: string; caseNumbers: string; courtName: string };
export type NyFutureApplication = { id: string; laws: Array<"16058" | "16059" | "unknown">; cases: NyFutureCase[] };
export type NyFutureApplications = { version: typeof NY_FUTURE_CONTRACT; applications: NyFutureApplication[] };
export type NyFutureReferences = { caseNumbers?: string; courtName?: string; reviewToken?: string };
export const emptyNyFutureApplications = (): NyFutureApplications => ({ version: NY_FUTURE_CONTRACT, applications: [] });
export const emptyNyFutureCase = (id: string): NyFutureCase => ({ id, source: "additional", savedReview: "", caseNumbers: "", courtName: "" });
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)));
const line = (v: unknown): v is string => typeof v === "string" && !/[\x00-\x1f\x7f]/.test(v);
const known = (s: string) => nyPacketTextAnswerState("ny_16059_future_court", s) === "known_valid";
export function parseNyFutureApplications(raw: unknown): NyFutureApplications | null {
  if (!Array.isArray(raw) || raw.length !== 1 || typeof raw[0] !== "string") return null;
  let v: unknown; try { v = JSON.parse(raw[0]); } catch { return null; }
  if (!exact(v, ["version", "applications"]) || v.version !== NY_FUTURE_CONTRACT || !Array.isArray(v.applications) || JSON.stringify(v) !== raw[0]) return null;
  const ids = new Set<string>();
  const id = (x: unknown) => { if (typeof x !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(x) || ids.has(x)) return false; ids.add(x); return true; };
  for (const a of v.applications) {
    if (!exact(a, ["id", "laws", "cases"]) || !id(a.id) || !Array.isArray(a.laws) || new Set(a.laws).size !== a.laws.length
      || !a.laws.every(l => ["16058", "16059", "unknown"].includes(l)) || a.laws.includes("unknown") && a.laws.length !== 1 || !Array.isArray(a.cases)) return null;
    for (const c of a.cases) if (!exact(c, ["id", "source", "savedReview", "caseNumbers", "courtName"]) || !id(c.id)
      || !["saved_future", "additional"].includes(String(c.source)) || ![c.savedReview, c.caseNumbers, c.courtName].every(line)) return null;
  }
  return v as unknown as NyFutureApplications;
}
export const encodeNyFutureApplications = (v: NyFutureApplications): string[] => [JSON.stringify(v)];
export function nyFutureApplicationsState(raw: unknown): "unanswered" | "invalid" | "uncertain" | "known_valid" {
  if (raw === undefined || raw === null || raw === "" || Array.isArray(raw) && !raw.length) return "unanswered";
  const v = parseNyFutureApplications(raw); if (!v) return "invalid";
  if (!v.applications.length || v.applications.some(a => !a.laws.length || a.laws.includes("unknown") || !a.cases.length
    || a.cases.some(c => c.source === "saved_future" ? !c.savedReview : ![c.caseNumbers, c.courtName].every(known)))) return "uncertain";
  return "known_valid";
}
function scalar(raw: unknown) { return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { value?: unknown }).value : raw; }
export function nyFutureIntent(answers: Readonly<Record<string, unknown>>): boolean | null {
  const raw = answers.ny_16059_future_application;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (Object.keys(raw).some(k => k !== "value" && k !== "unknown") || ![undefined, false].includes((raw as { unknown?: boolean }).unknown)) return null;
  }
  const value = scalar(raw);
  return value === "Yes" || value === true ? true : value === "No" || value === false ? false : null;
}
/** Canonical raw source binding: no parsing case numbers, guessing a court or
 * silently associating a saved freeform bundle with an actual case. */
export function nyFutureReferences(answers: Readonly<Record<string, unknown>>): NyFutureReferences {
  const ids = ["ny_16059_future_case_numbers", "ny_16059_future_court"];
  const valid = ids.map(id => nyPacketTextAnswerState(id, answers[id]) === "known_valid");
  const canonical = (v: unknown): unknown => v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical((v as Record<string, unknown>)[k])])) : v;
  return { ...(valid[0] ? { caseNumbers: scalar(answers[ids[0]]) as string } : {}), ...(valid[1] ? { courtName: scalar(answers[ids[1]]) as string } : {}),
    ...(valid.every(Boolean) ? { reviewToken: `reviewed:${JSON.stringify(ids.map(id => canonical(answers[id])))}` } : {}) };
}
export function nyFutureCaseReview(references: NyFutureReferences, c: NyFutureCase): string | undefined {
  if (!references.reviewToken) return undefined;
  return `case-reviewed:${JSON.stringify([references.reviewToken, c.source, c.caseNumbers, c.courtName])}`;
}
export function nyFutureApplicationsIssues(answers: Readonly<Record<string, unknown>>) {
  const v = parseNyFutureApplications(answers[NY_FUTURE_ID]);
  if (!v || nyFutureIntent(answers) !== true) return [];
  const references = nyFutureReferences(answers);
  const cases = v.applications.flatMap(a => a.cases);
  const issues: Array<{ id: string; code: string; en: string; es: string }> = [];
  if (!cases.some(c => c.savedReview && c.savedReview === nyFutureCaseReview(references, c)) || cases.some(c => (c.source === "saved_future" || c.savedReview) && c.savedReview !== nyFutureCaseReview(references, c))) issues.push({ id: NY_FUTURE_ID, code: "future_saved_case_review",
    en: "Review the saved future case numbers and court together, and explicitly associate them with the intended application. If the saved text combines different cases or courts, correct it and add separate case entries. A previous review does not cover changed facts.",
    es: "Revise juntos los números de caso y el tribunal guardados para la solicitud futura, y asócielos expresamente con la solicitud prevista. Si el texto combina casos o tribunales distintos, corríjalo y agregue entradas separadas. Una revisión anterior no cubre datos modificados." });
  return issues;
}
export function formatNyFutureApplications(raw: unknown, locale: string, references: NyFutureReferences = {}) {
  const es = locale === "es", v = parseNyFutureApplications(raw);
  if (!v) return es ? "Registro pendiente de revisión" : "Record needs review";
  const text = (s: string | undefined) => s && known(s) ? s : es ? "No registrado o desconocido" : "Not recorded or unknown";
  return v.applications.flatMap((a, i) => [
    `${es ? "Solicitud futura" : "Future application"} ${i + 1}: ${a.laws.length ? a.laws.map(l => l === "unknown" ? es ? "No estoy seguro" : "I am not sure" : l === "16058" ? "CPL 160.58" : "CPL 160.59").join("; ") : text("")}`,
    ...a.cases.map((c, j) => `${es ? "Caso" : "Case"} ${j + 1}: ${c.source === "saved_future" ? `${text(references.caseNumbers)}; ${text(references.courtName)}; ${c.savedReview && c.savedReview === nyFutureCaseReview(references, c) ? es ? "Datos guardados revisados" : "Saved details reviewed" : es ? "Revise de nuevo los datos guardados" : "Review the saved details again"}` : `${text(c.caseNumbers)}; ${text(c.courtName)}`}`)
  ]).join("\n") || (es ? "No hay solicitudes futuras registradas" : "No future applications recorded");
}
