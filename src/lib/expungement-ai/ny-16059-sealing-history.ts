/** Actual earlier filings and entered orders are separate records. A court may
 * act without a participant application; neither inventory grants legal authority. */
export const NY_SEALING_HISTORY_ID = "ny_16059_prior_sealing_records";
export const NY_SEALING_HISTORY_CONTRACT = "ny_16059_sealing_history_v1" as const;
export type NyPriorApplication = {
  id: string; law: "" | "16058" | "16059" | "unknown";
  courtName: string; caseNumbers: string;
  outcome: "" | "pending" | "denied" | "withdrawn" | "granted" | "partial" | "other" | "unknown";
  outcomeDetails: string;
  copyStatus: "" | "available" | "request_needed" | "unavailable" | "unknown"; copyExplanation: string;
};
export type NySealedConviction = {
  id: string; caseNumbers: string; courtName: string; charge: string; section: string; grade: string;
  role: "" | "treatment" | "additional_misdemeanor" | "16059" | "unknown";
};
export type NyPriorOrder = {
  id: string; law: "" | "16058" | "16059" | "unknown";
  courtName: string; reference: string; enteredDate: string;
  currentStatus: "" | "sealed" | "unsealed" | "modified" | "unknown"; statusDetails: string;
  convictions: NySealedConviction[];
};
export type NySealingHistory = {
  version: typeof NY_SEALING_HISTORY_CONTRACT;
  prior16058Application: "" | "yes" | "no" | "unknown";
  applications: NyPriorApplication[]; orders: NyPriorOrder[];
};
export const emptyNySealingHistory = (): NySealingHistory => ({ version: NY_SEALING_HISTORY_CONTRACT, prior16058Application: "", applications: [], orders: [] });
export const emptyNyPriorApplication = (id: string): NyPriorApplication => ({ id, law: "", courtName: "", caseNumbers: "", outcome: "", outcomeDetails: "", copyStatus: "", copyExplanation: "" });
export const emptyNyPriorOrder = (id: string): NyPriorOrder => ({ id, law: "", courtName: "", reference: "", enteredDate: "", currentStatus: "", statusDetails: "", convictions: [] });
export const emptyNySealedConviction = (id: string): NySealedConviction => ({ id, caseNumbers: "", courtName: "", charge: "", section: "", grade: "", role: "" });
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)));
const line = (v: unknown): v is string => typeof v === "string" && !/[\x00-\x1f\x7f]/.test(v);
const option = (v: unknown, values: readonly string[]) => typeof v === "string" && values.includes(v);
export const NY_HISTORY_OPTIONS = {
  declaration: { "": ["Choose an answer", "Seleccione una respuesta"], yes: ["Yes", "Sí"], no: ["No", "No"], unknown: ["I am not sure", "No estoy seguro"] },
  law: { "": ["Choose a law", "Seleccione una ley"], "16058": ["CPL 160.58", "CPL 160.58"], "16059": ["CPL 160.59", "CPL 160.59"], unknown: ["I am not sure", "No estoy seguro"] },
  outcome: { "": ["Choose an outcome", "Seleccione un resultado"], pending: ["Still pending", "Aún pendiente"], denied: ["Denied", "Denegada"], withdrawn: ["Withdrawn", "Retirada"], granted: ["Granted", "Concedida"], partial: ["Partly granted", "Concedida en parte"], other: ["Another outcome", "Otro resultado"], unknown: ["I am not sure", "No estoy seguro"] },
  copyStatus: { "": ["Choose an answer", "Seleccione una respuesta"], available: ["I have a copy", "Tengo una copia"], request_needed: ["I need to obtain a copy", "Necesito obtener una copia"], unavailable: ["I cannot obtain a copy", "No puedo obtener una copia"], unknown: ["I am not sure", "No estoy seguro"] },
  currentStatus: { "": ["Choose an answer", "Seleccione una respuesta"], sealed: ["The record remains sealed", "El registro sigue sellado"], unsealed: ["The record was later unsealed", "El registro se abrió posteriormente"], modified: ["The order was later changed", "La orden se modificó posteriormente"], unknown: ["I am not sure", "No estoy seguro"] },
  role: { "": ["Choose the order component", "Seleccione el componente de la orden"], treatment: ["CPL 160.58 treatment-related conviction", "Condena relacionada con tratamiento bajo CPL 160.58"], additional_misdemeanor: ["CPL 160.58 additional earlier misdemeanor", "Delito menor anterior adicional bajo CPL 160.58"], "16059": ["Conviction sealed under CPL 160.59", "Condena sellada bajo CPL 160.59"], unknown: ["I am not sure", "No estoy seguro"] }
} satisfies Record<string, Record<string, [string, string]>>;
export function parseNySealingHistory(raw: unknown): NySealingHistory | null {
  if (!Array.isArray(raw) || raw.length !== 1 || typeof raw[0] !== "string") return null;
  let v: unknown; try { v = JSON.parse(raw[0]); } catch { return null; }
  if (!exact(v, ["version", "prior16058Application", "applications", "orders"]) || v.version !== NY_SEALING_HISTORY_CONTRACT
    || !option(v.prior16058Application, Object.keys(NY_HISTORY_OPTIONS.declaration)) || !Array.isArray(v.applications) || !Array.isArray(v.orders) || JSON.stringify(v) !== raw[0]) return null;
  const ids = new Set<string>();
  const id = (x: unknown) => { if (typeof x !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(x) || ids.has(x)) return false; ids.add(x); return true; };
  for (const app of v.applications) if (!exact(app, ["id", "law", "courtName", "caseNumbers", "outcome", "outcomeDetails", "copyStatus", "copyExplanation"])
    || !id(app.id) || !option(app.law, Object.keys(NY_HISTORY_OPTIONS.law)) || !option(app.outcome, Object.keys(NY_HISTORY_OPTIONS.outcome))
    || !option(app.copyStatus, Object.keys(NY_HISTORY_OPTIONS.copyStatus)) || ![app.courtName, app.caseNumbers, app.outcomeDetails, app.copyExplanation].every(line)) return null;
  for (const order of v.orders) {
    if (!exact(order, ["id", "law", "courtName", "reference", "enteredDate", "currentStatus", "statusDetails", "convictions"]) || !id(order.id)
      || !option(order.law, Object.keys(NY_HISTORY_OPTIONS.law)) || ![order.courtName, order.reference, order.enteredDate, order.statusDetails].every(line) || !option(order.currentStatus, Object.keys(NY_HISTORY_OPTIONS.currentStatus)) || !Array.isArray(order.convictions)) return null;
    for (const c of order.convictions) if (!exact(c, ["id", "caseNumbers", "courtName", "charge", "section", "grade", "role"]) || !id(c.id)
      || ![c.caseNumbers, c.courtName, c.charge, c.section, c.grade].every(line) || !option(c.role, Object.keys(NY_HISTORY_OPTIONS.role))) return null;
  }
  return v as unknown as NySealingHistory;
}
export const encodeNySealingHistory = (value: NySealingHistory): string[] => [JSON.stringify(value)];
const known = (s: string) => Boolean(s.trim()) && !["unknown", "unsure", "not sure", "i am not sure", "i'm not sure", "no sé", "no se", "no estoy seguro", "no estoy segura", "prefer not to say"].includes(s.trim().toLowerCase().replace(/\u2019/g, "'"));
const pastDate = (s: string, today: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || s.startsWith("0000") || s > today) return false; const d = new Date(s + "T00:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s; };
export function nyKnownPrior16058Application(answers: Readonly<Record<string, unknown>>): boolean {
  const raw = answers.ny_16059_16058_grants;
  if (typeof raw === "string") return ["denied", "pending"].includes(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || Object.keys(raw).some(k => k !== "value" && k !== "unknown")) return false;
  const v = raw as { value?: unknown; unknown?: unknown };
  return (v.unknown === undefined || v.unknown === false) && typeof v.value === "string" && ["denied", "pending"].includes(v.value);
}
export function nySealingHistoryState(raw: unknown, today = new Date().toISOString().slice(0, 10), knownPriorApplication = false): "unanswered" | "invalid" | "uncertain" | "known_valid" {
  if (raw === undefined || raw === null || raw === "" || Array.isArray(raw) && raw.length === 0) return "unanswered";
  const v = parseNySealingHistory(raw); if (!v) return "invalid";
  if (!["yes", "no"].includes(v.prior16058Application) && !(knownPriorApplication && v.prior16058Application === "")) return "uncertain";
  if (v.applications.some(a => !["16058", "16059"].includes(a.law) || ![a.courtName, a.caseNumbers].every(known)
    || !["pending", "denied", "withdrawn", "granted", "partial", "other"].includes(a.outcome)
    || ["partial", "other"].includes(a.outcome) && !known(a.outcomeDetails))) return "uncertain";
  // Copy availability describes later assembly work. Missing copies cannot turn
  // a saved application into no application, or impose a mandatory upload.
  if (v.orders.some(o => !["16058", "16059"].includes(o.law) || ![o.courtName, o.reference].every(known) || !pastDate(o.enteredDate, today)
    || !o.convictions.length || o.convictions.some(c => ![c.caseNumbers, c.courtName, c.charge, c.section, c.grade].every(known)
      || !(o.law === "16058" ? ["treatment", "additional_misdemeanor"] : ["16059"]).includes(c.role)))) return "uncertain";
  return "known_valid";
}
/** Cross-answer contradictions require correction, never rewriting an earlier
 * answer or inferring a grant from an application. Counts await order review. */
export function nySealingHistoryIssues(answers: Readonly<Record<string, unknown>>) {
  const v = parseNySealingHistory(answers[NY_SEALING_HISTORY_ID]);
  if (!v) return [];
  const scalar = (id: string) => { const r = answers[id]; return r && typeof r === "object" && !Array.isArray(r) ? (r as { unknown?: unknown }).unknown === true ? undefined : (r as { value?: unknown }).value : r; };
  const issues: Array<{ id: string; code: string; en: string; es: string }> = [];
  const issue = (code: string, en: string, es: string) => issues.push({ id: NY_SEALING_HISTORY_ID, code, en, es });
  const apps58 = v.applications.filter(a => a.law === "16058"), apps59 = v.applications.filter(a => a.law === "16059");
  if ((v.prior16058Application === "yes" || nyKnownPrior16058Application(answers)) && !apps58.length || v.prior16058Application === "no" && (apps58.length || nyKnownPrior16058Application(answers))) issue("prior_16058_application_conflict", "The CPL 160.58 application answer and the recorded applications disagree. Check both; an entered order alone does not prove that you filed an application.", "La respuesta sobre solicitudes bajo CPL 160.58 no concuerda con las solicitudes registradas. Revise ambas; una orden concedida por sí sola no demuestra que usted presentó una solicitud.");
  const status59 = scalar("ny_16059_application_status");
  if (status59 === "none" && apps59.length || ["denied", "pending", "granted", "mixed"].includes(String(status59)) && !apps59.length
    || status59 === "denied" && apps59.some(a => !["denied", "withdrawn"].includes(a.outcome))
    || status59 === "pending" && apps59.some(a => a.outcome !== "pending")
    || status59 === "granted" && apps59.some(a => !["granted", "partial"].includes(a.outcome))
    || status59 === "mixed" && new Set(apps59.flatMap(a => a.outcome === "partial" ? ["granted", "denied"] : [a.outcome])).size < 2) issue("prior_16059_application_conflict", "The earlier CPL 160.59 application answer and the individual applications disagree. Preserve every actual application and correct the answer or record that is wrong.", "La respuesta anterior sobre solicitudes bajo CPL 160.59 no concuerda con las solicitudes individuales. Conserve todas las solicitudes reales y corrija la respuesta o el registro incorrecto.");
  const grants58 = scalar("ny_16059_16058_grants"), orders58 = v.orders.filter(o => o.law === "16058"), orders59 = v.orders.filter(o => o.law === "16059");
  if (grants58 === "granted" && !orders58.length || ["none", "denied", "pending"].includes(String(grants58)) && orders58.length
    || ["denied", "pending"].includes(String(grants58)) && v.prior16058Application === "no"
    || grants58 === "denied" && apps58.some(a => !["denied", "withdrawn"].includes(a.outcome))
    || grants58 === "pending" && apps58.some(a => a.outcome !== "pending")
    || ["none", "denied", "pending"].includes(String(grants58)) && apps58.some(a => ["granted", "partial"].includes(a.outcome))) issue("prior_16058_order_conflict", "The earlier CPL 160.58 answer and the entered-order records disagree. Pending or denied applications are not entered sealing orders.", "La respuesta anterior sobre CPL 160.58 no concuerda con las órdenes concedidas registradas. Las solicitudes pendientes o denegadas no son órdenes de sellado concedidas.");
  const rawGranted59 = scalar("ny_16059_granted_total");
  const granted59 = typeof rawGranted59 === "number" && Number.isSafeInteger(rawGranted59) && rawGranted59 >= 0 ? rawGranted59
    : typeof rawGranted59 === "string" && /^\d+$/.test(rawGranted59) && Number.isSafeInteger(Number(rawGranted59)) ? Number(rawGranted59) : null;
  if (granted59 !== null && granted59 > 0 && !orders59.length || granted59 === 0 && (orders59.length || apps59.some(a => ["granted", "partial"].includes(a.outcome)))) issue("prior_16059_order_conflict", "The earlier CPL 160.59 sealed-conviction count and the entered-order inventory disagree. Review the actual orders; application status alone does not establish the convictions sealed.", "El recuento anterior de condenas selladas bajo CPL 160.59 no concuerda con el inventario de órdenes concedidas. Revise las órdenes reales; el estado de una solicitud por sí solo no establece las condenas selladas.");
  if (v.orders.some(o => o.currentStatus !== "sealed")) issue("prior_order_current_status_review", "Check the current effect of each earlier order, including any later change or unsealing. Keep the original order and later records for review; no current legal effect is inferred.", "Revise el efecto actual de cada orden anterior, incluido cualquier cambio posterior o apertura del registro. Conserve la orden original y los registros posteriores para revisión; no se supone ningún efecto legal actual.");
  return issues;
}
export function formatNySealingHistory(raw: unknown, locale: "en" | "es", knownPriorApplication = false): string {
  const v = parseNySealingHistory(raw), es = locale === "es", ix = es ? 1 : 0;
  if (!v) return es ? "Registro pendiente de revisión" : "Record needs review";
  const text = (s: string) => known(s) ? s : es ? "No registrado o desconocido" : "Not recorded or unknown";
  const label = (group: keyof typeof NY_HISTORY_OPTIONS, value: string) => (NY_HISTORY_OPTIONS[group] as Record<string, [string, string]>)[value]?.[ix] ?? text(value);
  return [ `${es ? "Solicitud anterior bajo CPL 160.58" : "Earlier CPL 160.58 application"}: ${knownPriorApplication && v.prior16058Application === "" ? es ? "Sí, según su respuesta guardada" : "Yes, from your saved answer" : label("declaration", v.prior16058Application)}`,
    ...v.applications.map((a, i) => `${es ? "Solicitud" : "Application"} ${i + 1}: ${label("law", a.law)}; ${text(a.courtName)}; ${text(a.caseNumbers)}; ${label("outcome", a.outcome)}${a.outcomeDetails ? "; " + text(a.outcomeDetails) : ""}; ${es ? "copia" : "copy"}: ${label("copyStatus", a.copyStatus)}${a.copyExplanation ? "; " + text(a.copyExplanation) : ""}`),
    ...v.orders.flatMap((o, i) => [`${es ? "Orden concedida" : "Entered order"} ${i + 1}: ${label("law", o.law)}; ${text(o.courtName)}; ${text(o.reference)}; ${text(o.enteredDate)}; ${label("currentStatus", o.currentStatus)}${o.statusDetails ? "; " + text(o.statusDetails) : ""}`,
      ...o.convictions.map((c, j) => `  ${es ? "Condena sellada" : "Sealed conviction"} ${j + 1}: ${text(c.caseNumbers)}; ${text(c.courtName)}; ${text(c.charge)}; ${text(c.section)}; ${text(c.grade)}; ${label("role", c.role)}`)]) ].join("\n");
}
