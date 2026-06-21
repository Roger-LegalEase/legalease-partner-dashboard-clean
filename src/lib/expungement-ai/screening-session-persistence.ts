import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export type ScreeningSessionStatus = "in_progress" | "resumed" | "completed" | "abandoned";

export type ScreeningSessionInput = {
  sessionId?: string;
  jurisdiction: string;
  answers: Record<string, AnswerValue | undefined>;
  currentQuestionId?: string | null;
  furthestStage?: string | null;
  status?: ScreeningSessionStatus;
  lastDropQuestion?: string | null;
};

export type PersistedScreeningSession = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  jurisdiction: string;
  answers: Record<string, AnswerValue>;
  currentQuestionId: string | null;
  furthestStage: string | null;
  status: ScreeningSessionStatus;
  lastDropQuestion: string | null;
};

export type SerializedScreeningSession = Omit<PersistedScreeningSession, "answers"> & {
  answers: Record<string, SerializedAnswerValue>;
};

export type SerializedAnswerValue =
  | string
  | string[]
  | number
  | null
  | {
      value?: string | number | null;
      unknown?: boolean;
    };

export type ScreeningSessionStorage = {
  saveSession(input: {
    sessionId?: string;
    jurisdiction: string;
    answers: Record<string, SerializedAnswerValue>;
    currentQuestionId: string | null;
    furthestStage: string | null;
    status: ScreeningSessionStatus;
    lastDropQuestion: string | null;
  }): Promise<SerializedScreeningSession>;
  loadSession(sessionId: string): Promise<SerializedScreeningSession | null>;
};

const VALID_STATUSES = new Set<ScreeningSessionStatus>([
  "in_progress",
  "resumed",
  "completed",
  "abandoned"
]);

export async function saveScreeningSession(
  storage: ScreeningSessionStorage,
  input: ScreeningSessionInput
): Promise<PersistedScreeningSession> {
  const status = input.status ?? "in_progress";
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Unsupported screening session status: ${status}`);
  }

  const saved = await storage.saveSession({
    sessionId: input.sessionId,
    jurisdiction: normalizeJurisdiction(input.jurisdiction),
    answers: serializeScreeningAnswers(input.answers),
    currentQuestionId: input.currentQuestionId ?? null,
    furthestStage: input.furthestStage ?? null,
    status,
    lastDropQuestion: input.lastDropQuestion ?? null
  });
  return deserializeScreeningSession(saved);
}

export async function loadScreeningSession(
  storage: ScreeningSessionStorage,
  sessionId: string
): Promise<PersistedScreeningSession | null> {
  const row = await storage.loadSession(sessionId);
  return row ? deserializeScreeningSession(row) : null;
}

export function serializeScreeningAnswers(
  answers: Record<string, AnswerValue | undefined>
): Record<string, SerializedAnswerValue> {
  const out: Record<string, SerializedAnswerValue> = {};
  for (const [questionId, value] of Object.entries(answers)) {
    if (value === undefined) continue;
    out[questionId] = serializeAnswerValue(questionId, value);
  }
  return out;
}

export function deserializeScreeningAnswers(
  answers: Record<string, unknown>
): Record<string, AnswerValue> {
  const out: Record<string, AnswerValue> = {};
  for (const [questionId, value] of Object.entries(answers)) {
    out[questionId] = deserializeAnswerValue(questionId, value);
  }
  return out;
}

function deserializeScreeningSession(row: SerializedScreeningSession): PersistedScreeningSession {
  return {
    ...row,
    answers: deserializeScreeningAnswers(row.answers)
  };
}

function serializeAnswerValue(questionId: string, value: AnswerValue): SerializedAnswerValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item !== "string") {
        throw new Error(`Unsupported non-string multi-select value for ${questionId}.`);
      }
      return item;
    });
  }
  return serializeUnknownCapableValue(questionId, value);
}

function deserializeAnswerValue(questionId: string, value: unknown): AnswerValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item !== "string") {
        throw new Error(`Unsupported non-string multi-select value loaded for ${questionId}.`);
      }
      return item;
    });
  }
  if (isPlainObject(value)) return serializeUnknownCapableValue(questionId, value);
  throw new Error(`Unsupported answer value loaded for ${questionId}.`);
}

function serializeUnknownCapableValue(questionId: string, value: Record<string, unknown>): SerializedAnswerValue {
  const keys = Object.keys(value);
  for (const key of keys) {
    if (key !== "value" && key !== "unknown") {
      throw new Error(`Unsupported answer object key ${key} for ${questionId}.`);
    }
  }

  const out: { value?: string | number | null; unknown?: boolean } = {};
  if ("value" in value) {
    const raw = value.value;
    if (raw !== null && typeof raw !== "string" && typeof raw !== "number") {
      throw new Error(`Unsupported answer object value for ${questionId}.`);
    }
    out.value = raw;
  }
  if ("unknown" in value) {
    if (typeof value.unknown !== "boolean") {
      throw new Error(`Unsupported unknown sentinel for ${questionId}.`);
    }
    out.unknown = value.unknown;
  }
  return out;
}

function normalizeJurisdiction(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2,3}$/.test(normalized)) {
    throw new Error(`Unsupported jurisdiction code: ${value}`);
  }
  return normalized;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
