import { nvProgramLocationQuestion } from "@/lib/expungement-ai/nv-program-location-context";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { dcInnocenceLocationQuestion } from "@/lib/rcap-engine/dc-innocence-location-context";
import "server-only";
import catalog from "@/lib/expungement-ai/frontend/reviewed-question-spanish.json";
import participantCatalog from "@/lib/expungement-ai/frontend/reviewed-participant-copy.json";
import assistedContactCatalog from "@/lib/expungement-ai/frontend/reviewed-assisted-contact-copy.json";
import sourceCatalog from "@/lib/expungement-ai/frontend/reviewed-source-question-copy.json";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { gaPardonCaptionQuestion } from "@/lib/expungement-ai/ga-pardon-caption";
import { gaPardonCategoryQuestion } from "@/lib/expungement-ai/ga-pardon-category-context";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";

type Context = { state: string; pathwayId?: string | null };
type Entry = (typeof catalog.entries)[number];
const byDescriptor = new Map<string, Entry[]>();
type ParticipantEntry = (typeof participantCatalog.entries)[number];
const participantByDescriptor = new Map<string, ParticipantEntry[]>();
type SourceEntry = (typeof sourceCatalog.entries)[number];
const sourceByDescriptor = new Map<string, SourceEntry[]>();
for (const entry of sourceCatalog.entries) {
  const key = JSON.stringify(entry.descriptor);
  sourceByDescriptor.set(key, [...(sourceByDescriptor.get(key) ?? []), entry]);
}
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

/** Reviewed display corrections preserve the question's original answer and applicability contracts. */
function reviewedSourceQuestion<T extends PublicQuestion>(question: T, context: Context): T {
  const descriptor = JSON.stringify([
    question.id, question.type, question.prompt, question.helperText ?? "", question.options ?? null,
    question.stage ?? null, Object.hasOwn(question, "required") ? ["present", question.required] : ["absent"],
    Object.hasOwn(question, "contextOnly") ? ["present", question.contextOnly] : ["absent"], question.lifecyclePhase ?? null
  ]);
  const surface = context.pathwayId === undefined ? "screening" : "packet_information";
  const routeKey = context.pathwayId ? `${context.state}:${context.pathwayId}` : null;
  const matches = (sourceByDescriptor.get(descriptor) ?? []).filter((entry) => entry.scope.some((scope) =>
    scope.state === context.state && scope.surface === surface && scope.routeKey === routeKey));
  let reviewed = question;
  if (matches.length === 1) {
    const copy = matches[0].successor;
    reviewed = { ...reviewed, prompt: copy.en.prompt, helperText: copy.en.helperText,
      translations: { ...reviewed.translations, es: { ...reviewed.translations?.es, prompt: copy.es.prompt, helperText: copy.es.helperText } } };
  }
  for (const entry of sourceCatalog.optionEntries) {
    if (question.id !== entry.questionId || question.type !== entry.inputType || !Array.isArray(question.options)) continue;
    const options = question.options;
    const existing = reviewed.optionDisplay?.[entry.wire];
    if (!existing) continue;
    const bindings = entry.bindings.filter((binding) => binding.state === context.state
      && options[binding.index] === entry.wire
      && existing.label === binding.display.label
      && (existing.helperText ?? "") === binding.display.helperText
      && existing.translations?.es?.label === binding.display.translations.es.label
      && (existing.translations?.es?.helperText ?? "") === binding.display.translations.es.helperText);
    if (bindings.length !== 1) continue;
    reviewed = { ...reviewed, optionDisplay: { ...reviewed.optionDisplay, [entry.wire]: {
      ...existing, label: entry.successor.label, helperText: entry.successor.helperText,
      translations: { ...existing.translations, es: { ...existing.translations?.es, ...entry.successor.translations.es } }
    } } };
  }
  return reviewed;
}

/** Shared source-backed wording also applies to existing screening definitions. */
export function reviewedScreeningQuestion<T extends PublicQuestion>(question: T, context: Context): T {
  return reviewedSourceQuestion(reviewedSpanishQuestion(question, context), context);
}

/** Paired EN/ES successor copy, only for the exact reviewed participant wording and route. */
export function reviewedPacketQuestion<T extends PublicQuestion>(question: T, context: Context & { participantOwnsRecord: boolean; participantHelpingRecord?: boolean }): T {
  if (question.id === "residency_or_location" && context.state === "NV") {
    const location = nvProgramLocationQuestion(question, getProfileByJurisdiction(context.state), context.pathwayId ?? null,
      packetSpecificationFor(`${context.state}:${context.pathwayId ?? ""}`));
    if (location !== question) return location;
  }
  if (question.id === "residency_or_location" && context.state === "DC") {
    const location = dcInnocenceLocationQuestion(question, getProfileByJurisdiction(context.state), context.pathwayId ?? null,
      packetSpecificationFor(`${context.state}:${context.pathwayId ?? ""}`));
    if (location !== question) return location;
  }
  const caption = gaPardonCaptionQuestion(question, `${context.state}:${context.pathwayId ?? ""}`);
  if (caption !== question) return caption;
  if (question.id === "offense_category") {
    const category = gaPardonCategoryQuestion(question, context.state, context.pathwayId ?? null,
      packetSpecificationFor(`${context.state}:${context.pathwayId ?? ""}`) ?? null);
    if (category !== question) return category;
  }
  const localized = reviewedSourceQuestion(reviewedSpanishQuestion(question, context), context);
  const multiline = MULTILINE_PACKET_FACTS[`${context.state}:${context.pathwayId}`]?.includes(question.id);
  const translated = multiline && ["text", "text_or_unknown", "textarea"].includes(question.type) ? { ...localized, multiline: true } : localized;
  if (!context.participantOwnsRecord && context.participantHelpingRecord === true && context.pathwayId) {
    const routeKey = `${context.state}:${context.pathwayId}`;
    const routeIndex = assistedContactCatalog.routeKeys.indexOf(routeKey);
    const descriptor = JSON.stringify([question.id, question.type, question.prompt, question.helperText ?? "", question.options ?? null]);
    const matches = assistedContactCatalog.entries.filter((entry) =>
      JSON.stringify([entry.questionId, entry.source.inputType, entry.source.prompt, entry.source.helperText, entry.source.wireOptions]) === descriptor
      && routeIndex >= 0 && entry.bindings.some((binding) => binding.routeIndex === routeIndex));
    if (matches.length === 1) {
      const copy = matches[0].successor;
      return { ...translated, prompt: copy.en.prompt, helperText: copy.en.helperText,
        translations: { ...translated.translations, es: { ...translated.translations?.es, prompt: copy.es.prompt, helperText: copy.es.helperText } } };
    }
  }
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
