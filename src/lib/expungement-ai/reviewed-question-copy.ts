import "server-only";
import catalog from "@/lib/expungement-ai/frontend/reviewed-question-spanish.json";
import participantCatalog from "@/lib/expungement-ai/frontend/reviewed-participant-copy.json";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

type Context = { state: string; pathwayId?: string | null };
type Entry = (typeof catalog.entries)[number];
const byDescriptor = new Map<string, Entry[]>();
type ParticipantEntry = (typeof participantCatalog.entries)[number];
const participantByDescriptor = new Map<string, ParticipantEntry[]>();
for (const entry of participantCatalog.entries) {
  const key = JSON.stringify([entry.questionId, entry.source.inputType, entry.source.prompt, entry.source.helperText, entry.source.wireOptions]);
  participantByDescriptor.set(key, [...(participantByDescriptor.get(key) ?? []), entry]);
}
for (const entry of catalog.entries) {
  const key = JSON.stringify([entry.questionId, entry.inputType, entry.english.prompt, entry.english.helperText,
    entry.english.options, entry.english.optionDisplay.map((option) => [option.value, option.label, option.helperText])]);
  byDescriptor.set(key, [...(byDescriptor.get(key) ?? []), entry]);
}

/** Exact displayed copy and explicit source scope are both required. Never match by ID alone. */
export function reviewedSpanishQuestion<T extends PublicQuestion>(question: T, context: Context): T {
  const raw = question.type === "yes_no_unsure" ? ["Yes", "No", "I am not sure"]
    : question.type === "yes_no_prefer_not_to_say" ? ["Yes", "No", "Prefer not to say"] : question.options ?? [];
  if (!Array.isArray(raw)) return question;
  const options: string[] = [];
  const displays: string[][] = [];
  for (const option of raw) {
    const value: unknown = typeof option === "string" ? option : option?.value;
    if (typeof value !== "string") return question;
    const display = question.optionDisplay?.[value];
    const label: unknown = display?.label ?? (typeof option === "string" ? option : option?.label ?? value);
    const helper: unknown = display?.helperText ?? (typeof option === "string" ? "" : option?.helperText ?? "");
    if (typeof label !== "string" || typeof helper !== "string") return question;
    options.push(value); displays.push([value, label, helper]);
  }
  const key = JSON.stringify([question.id, question.type, question.prompt, question.helperText ?? "", options, displays]);
  const routeIndex = context.pathwayId ? catalog.routeKeys.indexOf(`${context.state}:${context.pathwayId}`) : -1;
  const matches = (byDescriptor.get(key) ?? []).filter((entry) => context.pathwayId === undefined
    ? entry.scope.publicStates.includes(context.state) : routeIndex >= 0 && entry.scope.packetRouteIndexes.includes(routeIndex));
  if (matches.length !== 1) return question;
  const entry = matches[0];
  const optionDisplay = { ...question.optionDisplay };
  for (const option of entry.spanish.optionDisplay) {
    const prior = optionDisplay[option.value];
    optionDisplay[option.value] = {
      ...prior,
      label: prior?.label ?? entry.english.optionDisplay.find((display) => display.value === option.value)?.label ?? option.value,
      translations: { ...prior?.translations, es: { ...prior?.translations?.es, label: option.label, helperText: option.helperText } }
    };
  }
  return { ...question, translations: { ...question.translations, es: { ...question.translations?.es, prompt: entry.spanish.prompt, helperText: entry.spanish.helperText } },
    ...(entry.spanish.optionDisplay.length ? { optionDisplay } : {}) };
}

/** Paired EN/ES successor copy, only for the exact reviewed participant wording and route. */
export function reviewedPacketQuestion<T extends PublicQuestion>(question: T, context: Context & { participantOwnsRecord: boolean }): T {
  const localized = reviewedSpanishQuestion(question, context);
  const multiline = MULTILINE_PACKET_FACTS[`${context.state}:${context.pathwayId}`]?.includes(question.id);
  const translated = multiline && ["text", "text_or_unknown", "textarea"].includes(question.type) ? { ...localized, multiline: true } : localized;
  if (!context.participantOwnsRecord || !context.pathwayId) return translated;
  const routeIndex = participantCatalog.routeKeys.indexOf(`${context.state}:${context.pathwayId}`);
  if (routeIndex < 0) return translated;
  const key = JSON.stringify([question.id, question.type, question.prompt, question.helperText ?? "", question.options ?? null]);
  const entries = (participantByDescriptor.get(key) ?? []).filter((entry) => entry.bindings.some((binding) => binding.routeIndex === routeIndex));
  if (entries.length !== 1) return translated;
  const entry = entries[0];
  const overrides = entry.routeHelperOverrides.filter((override) => override.routeIndexes.includes(routeIndex));
  if (overrides.length > 1 || (entry.routeHelperOverrides.length > 0 && overrides.length !== 1)) return translated;
  return { ...translated, prompt: entry.successor.en.prompt, helperText: overrides[0]?.helperTextEn ?? entry.successor.en.helperText,
    translations: { ...translated.translations, es: { ...translated.translations?.es, prompt: entry.successor.es.prompt, helperText: overrides[0]?.helperTextEs ?? entry.successor.es.helperText } } };
}

// GA-27: narrative/list bindings established by the seven existing route contracts.
const MULTILINE_PACKET_FACTS: Readonly<Record<string, readonly string[]>> = {
  "GA:restriction-and-sealing-of-a-pardoned-felony": ["participant_narrative"],
  "GA:sb-288-misdemeanor-conviction-restriction-and-sealing": ["participant_narrative"],
  "IL:criminal-identity-theft-mistaken-identity-relief": ["identity_theft_report_and_mismatched_identifiers"],
  "IL:felony-prostitution-relief": ["adverse_consequences"],
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3": ["conviction_list"],
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6": ["conviction_list"],
  "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal": ["other_recordkeeping_agencies", "personal_impact_statement"]
};
