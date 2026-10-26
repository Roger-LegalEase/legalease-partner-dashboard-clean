/** Preserve protected legacy values separately from their safe question projection.
 * Never use restored raw maps as participant DTOs or authoritative evaluation inputs.
 * Source must already have passed the existing hash/profile/route authority checks.
 */
import { hasIncompatibleAnswerShape, questionAnswerState, scalarAnswerText } from '@/lib/expungement-ai/question-answer-state';

type Contract = Parameters<typeof hasIncompatibleAnswerShape>[0];
const sources = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'] as const;
type SourceName = typeof sources[number];
type RawMaps = Record<SourceName, Record<string, unknown>>;
type Identity = { jurisdiction: string; pathwayId: string | null; profileVersion: string;
  profileSourceFingerprint: string | null; profileAuthorityFingerprint: string };
type Entry = { factId: string; source: SourceName; value: unknown; meaning: 'prior_answer_for_shape_clarification';
  routeKey: string; profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string };
const own = (v: object, key: string) => Object.prototype.hasOwnProperty.call(v, key);
const cloneMaps = (maps: RawMaps): RawMaps => ({ screeningAnswers: { ...maps.screeningAnswers },
  prefilledAnswers: { ...maps.prefilledAnswers }, packetAnswers: { ...maps.packetAnswers } });
const canonical = (v: unknown): string => JSON.stringify(v, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);

/** Exact existing question semantics; no parsing, guessed unknown, or bool-to-text conversion. */
export function inspectProtectedLegacyShapes(identity: Identity, raw: RawMaps, questions: readonly Contract[]) {
  const contracts = new Map(questions.map(question => [question.id, question]));
  const entries: Entry[] = [];
  const supportedBooleanSlots: Array<{ factId: string; source: SourceName; value: boolean; question: Contract }> = [];
  const effectiveInvalidIds: string[] = [];
  const incompatibleSourceSlots: Array<{ factId: string; source: SourceName }> = [];
  for (const [id, question] of contracts) {
    let effectiveSource: SourceName | null = null;
    for (const source of sources) {
      if (!own(raw[source], id)) continue;
      effectiveSource = source;
      const original = raw[source][id];
      if (typeof original === 'boolean' && questionAnswerState(question, original) === 'known_valid')
        supportedBooleanSlots.push({ factId: id, source, value: original, question });
      if (hasIncompatibleAnswerShape(question, raw[source][id])) incompatibleSourceSlots.push({ factId: id, source });

    }
    if (effectiveSource && hasIncompatibleAnswerShape(question, raw[effectiveSource][id])) effectiveInvalidIds.push(id);
  }
  // Retain ALL original provenance slots for an affected fact, including a
  // lower known value shadowed by an incompatible higher-precedence value.
  for (const [id, question] of contracts) {
    if (!sources.some(source => own(raw[source], id) && hasIncompatibleAnswerShape(question, raw[source][id]))) continue;
    for (const source of sources) if (own(raw[source], id)) entries.push({ factId: id, source,
      value: structuredClone(raw[source][id]), meaning: 'prior_answer_for_shape_clarification',
      routeKey: `${identity.jurisdiction}:${identity.pathwayId ?? ''}`, profileVersion: identity.profileVersion,
      profileSourceFingerprint: identity.profileSourceFingerprint, profileAuthorityFingerprint: identity.profileAuthorityFingerprint });
  }
  const projected = cloneMaps(raw);
  for (const entry of entries) if (hasIncompatibleAnswerShape(contracts.get(entry.factId)!, entry.value)) delete projected[entry.source][entry.factId];
  // A higher-precedence incompatible answer must not resurrect a lower known one.
  for (const id of effectiveInvalidIds) for (const source of sources) delete projected[source][id];
  return { entries, effectiveInvalidIds, incompatibleSourceSlots, supportedBooleanSlots, projected };
}

/** Only AFTER current accepted answerDelta IDs are known; never infer edits from blanks in a DTO. */
export function preserveProtectedLegacyShapes<T extends RawMaps>(next: T,
  original: ReturnType<typeof inspectProtectedLegacyShapes>, explicitChangedIds: ReadonlySet<string>) {
  const maps = cloneMaps(next);
  for (const entry of original.entries) {
    if (explicitChangedIds.has(entry.factId)) continue;
    const effectiveInvalid = original.effectiveInvalidIds.includes(entry.factId);
    const originalSlotInvalid = original.incompatibleSourceSlots.some(slot => slot.factId === entry.factId && slot.source === entry.source);
    // Preserve all same-fact slots when the effective value is invalid. If a
    // higher known value is already authoritative, preserve only the bad raw
    // slot so legitimate current derivations can still update the known one.
    if (effectiveInvalid || originalSlotInvalid) maps[entry.source][entry.factId] = structuredClone(entry.value);
  }
  for (const slot of original.supportedBooleanSlots) {
    if (explicitChangedIds.has(slot.factId)) continue;
    // Source precedence can move a compatible screening boolean into a
    // higher map or omit a shadowed slot. Retain its original provenance only
    // while that higher slot still exists; never resurrect a removed fact.
    if (!own(maps[slot.source], slot.factId)
      && sources.slice(sources.indexOf(slot.source) + 1).some(source => own(maps[source], slot.factId))) {
      maps[slot.source][slot.factId] = slot.value;
      continue;
    }
    const value = maps[slot.source][slot.factId];
    const text = typeof value === 'boolean' ? value ? 'Yes' : 'No' : scalarAnswerText(value)?.trim();
    if (questionAnswerState(slot.question, value) === 'known_valid' && text === (slot.value ? 'Yes' : 'No'))
      maps[slot.source][slot.factId] = slot.value;
  }
  return { ...next, ...maps };
}

/** Existing protected semanticAnswerHistory only; whole key already omitted from display/SQL mirrors. */
export function archiveExplicitLegacyShapeReplacements<T>(previous: readonly T[] | undefined,
  original: ReturnType<typeof inspectProtectedLegacyShapes>, explicitChangedIds: ReadonlySet<string>): Array<T | Entry> {
  const history: Array<T | Entry> = [...(previous ?? [])];
  for (const entry of original.entries) {
    if (!explicitChangedIds.has(entry.factId)) continue;
    if (!history.some(old => canonical(old) === canonical(entry))) history.push(structuredClone(entry));
  }
  return history;
}

/** Safe per-question metadata only. Never serialized raw text/object/identifier. */
export function legacyShapeQuestionMetadata<T extends Contract>(questions: readonly T[], effectiveInvalidIds: readonly string[]) {
  const invalid = new Set(effectiveInvalidIds);
  return questions.map(question => invalid.has(question.id)
    ? { ...question, savedAnswerNeedsClarification: true as const } : question);
}
