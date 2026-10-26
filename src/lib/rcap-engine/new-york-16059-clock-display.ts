/** Adopted NY-02 section 3 display policy; Spanish remains an engineering draft. */
export const NY_16059_CLOCK_POLICY_GUIDANCE = [
  "LegalEase recommends the next calendar day as a conservative filing policy, subject to the receiving court's filing availability and any case-specific direction. This is not a court-established earliest lawful filing date and does not by itself mean the law bars an earlier filing.",
  "LegalEase recomienda el día calendario siguiente como política prudente de presentación, sujeta a la disponibilidad del tribunal receptor para recibir escritos y a cualquier instrucción específica del caso. No es la primera fecha legal de presentación establecida por un tribunal ni significa, por sí sola, que la ley prohíba una presentación anterior."
] as const;
const labels = [
  ["Computed period-end date", "Fecha calculada de finalización del plazo"],
  ["LegalEase recommended filing date", "Fecha de presentación recomendada por LegalEase"]
] as const;
function calendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
/** Reuses existing rendered cautions. ISO calendar dates avoid time-zone shifts. */
export function ny16059ClockDisplayLines(clock: { computedPeriodEndDate?: string; recommendedFilingDate?: string }, locale: "en" | "es" = "en"): string[] {
  if (!calendarDate(clock.computedPeriodEndDate) || !calendarDate(clock.recommendedFilingDate)) return [];
  const language = locale === "es" ? 1 : 0;
  return [`${labels[0][language]}: ${clock.computedPeriodEndDate}.`, `${labels[1][language]}: ${clock.recommendedFilingDate}.`, NY_16059_CLOCK_POLICY_GUIDANCE[language]];
}
/** Exact route-owned translation seam for the existing runtime-copy resolver. */
export function ny16059ClockDisplayTranslation(text: string): string | undefined {
  if (text === NY_16059_CLOCK_POLICY_GUIDANCE[0]) return NY_16059_CLOCK_POLICY_GUIDANCE[1];
  for (const [english, spanish] of labels) {
    const prefix = `${english}: `;
    if (!text.startsWith(prefix) || !text.endsWith(".")) continue;
    const date = text.slice(prefix.length, -1);
    if (calendarDate(date)) return `${spanish}: ${date}.`;
  }
  return undefined;
}
