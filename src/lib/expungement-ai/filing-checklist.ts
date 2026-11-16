/**
 * Briefcase filing checklist: the consumer's own progress tracker for a matter.
 *
 * Pure model (no I/O). The checklist is assembled from three sources:
 *   1. the matter's engine-authored next steps (state-specific, never edited here),
 *   2. the standard filing steps, shown once a packet has been generated, and
 *   3. steps the consumer adds themselves.
 * Only the consumer's progress (done / due date) and their own steps are stored,
 * under `artifact_refs_json.filingChecklist`, through the existing owner-scoped
 * `mergeBriefcaseArtifactRefs` writer. Patches are always nested objects keyed by
 * step id so a toggle merges into, and never overwrites, concurrent lifecycle refs.
 *
 * Tracking progress here is self-help bookkeeping. It does not change eligibility,
 * payment, packet or delivery state, and it never claims a court outcome.
 */
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";

export const FILING_CHECKLIST_REF_KEY = "filingChecklist";
export const MAX_CUSTOM_STEPS = 30;
/** Removed custom steps stay in the merge-only JSON; cap everything ever stored. */
export const MAX_STORED_CUSTOM_STEPS = 90;
export const MAX_CUSTOM_STEP_LENGTH = 200;
export const DUE_SOON_DAYS = 7;

export type FilingChecklistGroupKey = "result" | "prepare" | "file" | "follow_up" | "custom";
export type FilingChecklistStepSource = "engine" | "standard" | "custom";

export type FilingChecklistStep = {
  id: string;
  group: FilingChecklistGroupKey;
  source: FilingChecklistStepSource;
  text: string;
  /** Localization key for standard steps; engine and custom text is runtime text. */
  copyKey?: string;
  done: boolean;
  doneAt: string | null;
  /** Calendar date the consumer set, YYYY-MM-DD. */
  dueDate: string | null;
};

export type FilingChecklistGroup = {
  key: FilingChecklistGroupKey;
  label: string;
  copyKey: string;
  steps: FilingChecklistStep[];
};

export type FilingChecklist = {
  itemId: string;
  groups: FilingChecklistGroup[];
  total: number;
  done: number;
  packetGenerated: boolean;
  canAddSteps: boolean;
};

type StoredStepState = { done?: unknown; doneAt?: unknown; dueDate?: unknown };
type StoredCustomStep = { text?: unknown; createdAt?: unknown; removed?: unknown };
type StoredChecklist = {
  steps?: Record<string, StoredStepState>;
  custom?: Record<string, StoredCustomStep>;
};

/**
 * Standard post-generation steps, in filing order. Copy is deliberately
 * conditional ("if your court requires it") because requirements vary by state
 * and court; the packet's own filing instructions control.
 */
export const STANDARD_FILING_STEPS: ReadonlyArray<{ id: string; group: FilingChecklistGroupKey; text: string }> = [
  { id: "std-review-packet", group: "prepare", text: "Read your whole packet once, start to finish" },
  { id: "std-sign", group: "prepare", text: "Sign where the forms indicate" },
  { id: "std-notarize", group: "prepare", text: "Get it notarized if your court requires it" },
  { id: "std-copies", group: "prepare", text: "Make copies for your records" },
  { id: "std-file", group: "file", text: "File with the clerk or court named in your instructions" },
  { id: "std-fee", group: "file", text: "Pay the filing fee or ask for a fee waiver" },
  { id: "std-serve", group: "follow_up", text: "Serve the prosecutor or agency if your instructions say to" },
  { id: "std-track", group: "follow_up", text: "Watch for the court's response or a hearing date" }
];

export const FILING_CHECKLIST_GROUPS: ReadonlyArray<{ key: FilingChecklistGroupKey; label: string }> = [
  { key: "result", label: "From your result" },
  { key: "prepare", label: "Get your packet ready" },
  { key: "file", label: "File it" },
  { key: "follow_up", label: "Serve and follow up" },
  { key: "custom", label: "Your own steps" }
];

/** Result codes whose matters get a checklist. Hard stops and ineligible results do not. */
const CHECKLIST_RESULT_CODES = new Set<string>([
  "packet_ready",
  "packet_ready_with_caution",
  "guidance_only",
  "not_covered_yet",
  "needs_more_info",
  "needs_review",
  "not_yet"
]);

export function matterHasFilingChecklist(item: Pick<ConsumerBriefcaseItem, "type" | "resultCode">): boolean {
  return item.type === "result" && Boolean(item.resultCode && CHECKLIST_RESULT_CODES.has(item.resultCode));
}

export function isPacketGenerated(item: Pick<ConsumerBriefcaseItem, "artifactRefs">): boolean {
  const refs = item.artifactRefs;
  return Boolean(
    refs && typeof refs.generatedAt === "string" && typeof refs.downloadPath === "string" && typeof refs.fileName === "string"
  );
}

/** Stable id for an engine step: survives reordering, changes if the engine's wording changes. */
export function engineStepId(text: string): string {
  // FNV-1a 32-bit over the normalized text.
  let hash = 0x811c9dc5;
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `eng-${(hash >>> 0).toString(36)}`;
}

function storedChecklist(item: Pick<ConsumerBriefcaseItem, "artifactRefs">): StoredChecklist {
  const raw = item.artifactRefs?.[FILING_CHECKLIST_REF_KEY];
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as StoredChecklist) : {};
}

function stateFor(stored: StoredChecklist, id: string): Pick<FilingChecklistStep, "done" | "doneAt" | "dueDate"> {
  const state = stored.steps?.[id];
  const done = state?.done === true;
  return {
    done,
    doneAt: done && typeof state?.doneAt === "string" ? state.doneAt : null,
    dueDate: typeof state?.dueDate === "string" && isValidDueDate(state.dueDate) ? state.dueDate : null
  };
}

export function buildFilingChecklist(item: ConsumerBriefcaseItem): FilingChecklist {
  const stored = storedChecklist(item);
  const packetGenerated = isPacketGenerated(item);
  const steps: FilingChecklistStep[] = [];
  const seen = new Set<string>();

  for (const text of item.nextSteps ?? []) {
    if (typeof text !== "string" || !text.trim()) continue;
    const id = engineStepId(text);
    if (seen.has(id)) continue;
    seen.add(id);
    steps.push({ id, group: "result", source: "engine", text: text.trim(), ...stateFor(stored, id) });
  }

  if (packetGenerated) {
    for (const step of STANDARD_FILING_STEPS) {
      steps.push({
        id: step.id,
        group: step.group,
        source: "standard",
        text: step.text,
        copyKey: `briefcase.checklist.step.${step.id}`,
        ...stateFor(stored, step.id)
      });
    }
  }

  const storedCustomCount = Object.keys(stored.custom ?? {}).length;
  const custom = Object.entries(stored.custom ?? {})
    .filter(([id, value]) => isCustomStepId(id) && value && value.removed !== true && typeof value.text === "string" && value.text.trim())
    .sort(([, a], [, b]) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")));
  for (const [id, value] of custom) {
    steps.push({ id, group: "custom", source: "custom", text: String(value.text).trim(), ...stateFor(stored, id) });
  }

  const groups = FILING_CHECKLIST_GROUPS.map(({ key, label }) => ({
    key,
    label,
    copyKey: `briefcase.checklist.group.${key}`,
    steps: steps.filter((step) => step.group === key)
  })).filter((group) => group.steps.length > 0 || group.key === "custom");

  return {
    itemId: item.id,
    groups,
    total: steps.length,
    done: steps.filter((step) => step.done).length,
    packetGenerated,
    canAddSteps: custom.length < MAX_CUSTOM_STEPS && storedCustomCount < MAX_STORED_CUSTOM_STEPS
  };
}

export function findChecklistStep(checklist: FilingChecklist, stepId: string): FilingChecklistStep | null {
  for (const group of checklist.groups) {
    const step = group.steps.find((candidate) => candidate.id === stepId);
    if (step) return step;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Validation + patches                                                */
/* ------------------------------------------------------------------ */

export function isValidDueDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isCustomStepId(value: string): boolean {
  return /^cus-[a-z0-9]{6,32}$/.test(value);
}

export function normalizeCustomStepText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Plain text only: collapse whitespace and drop control characters.
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_CUSTOM_STEP_LENGTH) return null;
  return text;
}

export type FilingChecklistAction =
  | { type: "set_step"; stepId: string; done?: boolean; dueDate?: string | null }
  | { type: "add_step"; text: string; dueDate?: string | null }
  | { type: "remove_step"; stepId: string };

export type FilingChecklistActionError =
  | "invalid_action"
  | "step_not_found"
  | "invalid_due_date"
  | "invalid_text"
  | "too_many_steps"
  | "not_removable";

/** Parse an untrusted request body into an action. Unknown fields are ignored. */
export function parseFilingChecklistAction(body: unknown): FilingChecklistAction | { error: FilingChecklistActionError } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "invalid_action" };
  const input = body as Record<string, unknown>;
  const dueDate = input.dueDate === undefined ? undefined : input.dueDate === null || input.dueDate === "" ? null : input.dueDate;
  if (dueDate !== undefined && dueDate !== null && (typeof dueDate !== "string" || !isValidDueDate(dueDate))) {
    return { error: "invalid_due_date" };
  }

  if (input.type === "set_step") {
    if (typeof input.stepId !== "string" || input.stepId.length > 64) return { error: "invalid_action" };
    if (input.done !== undefined && typeof input.done !== "boolean") return { error: "invalid_action" };
    if (input.done === undefined && dueDate === undefined) return { error: "invalid_action" };
    return {
      type: "set_step",
      stepId: input.stepId,
      ...(input.done !== undefined ? { done: input.done } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate as string | null } : {})
    };
  }
  if (input.type === "add_step") {
    const text = normalizeCustomStepText(input.text);
    if (!text) return { error: "invalid_text" };
    return { type: "add_step", text, ...(dueDate !== undefined ? { dueDate: dueDate as string | null } : {}) };
  }
  if (input.type === "remove_step") {
    if (typeof input.stepId !== "string") return { error: "invalid_action" };
    return { type: "remove_step", stepId: input.stepId };
  }
  return { error: "invalid_action" };
}

/**
 * Turn a validated action into an `artifact_refs_json` patch for this matter.
 * Steps must belong to the matter's current checklist; only custom steps can be removed.
 */
export function filingChecklistPatch(
  checklist: FilingChecklist,
  action: FilingChecklistAction,
  options: { now: Date; newStepId: () => string }
): { patch: Record<string, unknown> } | { error: FilingChecklistActionError } {
  const nowIso = options.now.toISOString();

  if (action.type === "add_step") {
    if (!checklist.canAddSteps) return { error: "too_many_steps" };
    const id = options.newStepId();
    if (!isCustomStepId(id)) return { error: "invalid_action" };
    return {
      patch: {
        [FILING_CHECKLIST_REF_KEY]: {
          custom: { [id]: { text: action.text, createdAt: nowIso } },
          ...(action.dueDate ? { steps: { [id]: { done: false, doneAt: null, dueDate: action.dueDate } } } : {})
        }
      }
    };
  }

  const step = findChecklistStep(checklist, action.stepId);
  if (!step) return { error: "step_not_found" };

  if (action.type === "remove_step") {
    if (step.source !== "custom") return { error: "not_removable" };
    return { patch: { [FILING_CHECKLIST_REF_KEY]: { custom: { [step.id]: { removed: true } } } } };
  }

  const next: Record<string, unknown> = {};
  if (action.done !== undefined) {
    next.done = action.done;
    next.doneAt = action.done ? (step.done && step.doneAt ? step.doneAt : nowIso) : null;
  }
  if (action.dueDate !== undefined) next.dueDate = action.dueDate;
  return { patch: { [FILING_CHECKLIST_REF_KEY]: { steps: { [step.id]: next } } } };
}

/* ------------------------------------------------------------------ */
/* Reminders: dated steps and check-back dates across matters         */
/* ------------------------------------------------------------------ */

export type BriefcaseReminder = {
  key: string;
  kind: "step" | "check_back";
  itemId: string;
  matterTitle: string;
  state: string;
  text: string;
  copyKey?: string;
  stepId?: string;
  /** YYYY-MM-DD */
  date: string;
};

export function collectBriefcaseReminders(items: ConsumerBriefcaseItem[]): BriefcaseReminder[] {
  const reminders: BriefcaseReminder[] = [];
  for (const item of items) {
    if (item.reminderAt) {
      const date = item.reminderAt.slice(0, 10);
      if (isValidDueDate(date)) {
        reminders.push({
          key: `${item.id}:check-back`,
          kind: "check_back",
          itemId: item.id,
          matterTitle: item.title,
          state: item.state,
          text: "Check back on this matter",
          copyKey: "briefcase.reminders.check_back",
          date
        });
      }
    }
    if (!matterHasFilingChecklist(item)) continue;
    for (const group of buildFilingChecklist(item).groups) {
      for (const step of group.steps) {
        if (step.done || !step.dueDate) continue;
        reminders.push({
          key: `${item.id}:${step.id}`,
          kind: "step",
          itemId: item.id,
          matterTitle: item.title,
          state: item.state,
          text: step.text,
          copyKey: step.copyKey,
          stepId: step.id,
          date: step.dueDate
        });
      }
    }
  }
  return reminders.sort((a, b) => a.date.localeCompare(b.date) || a.matterTitle.localeCompare(b.matterTitle));
}

/** Whole days from `today` to `date` (both YYYY-MM-DD); negative when past. */
export function daysUntil(date: string, today: string): number {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

export type DueStatus = "overdue" | "today" | "soon" | "later";

export function dueStatus(date: string, today: string): DueStatus {
  const days = daysUntil(date, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= DUE_SOON_DAYS) return "soon";
  return "later";
}

/** The viewer's local calendar date as YYYY-MM-DD. */
export function localIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
