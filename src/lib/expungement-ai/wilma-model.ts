import "server-only";

import type { WilmaContext } from "@/lib/expungement-ai/wilma-context";
import { buildWilmaSystemPrompt } from "@/lib/expungement-ai/wilma-system-prompt";
import { draftWilmaPlaceholderResponse, wilmaLiveModelVersion, wilmaModelVersion } from "@/lib/expungement-ai/wilma";

export type WilmaReply = {
  text: string;
  // Identifies which path produced `text`, for telemetry: the live model id when the
  // provider answered, or the deterministic placeholder id on fallback.
  modelVersion: string;
  // Token usage from the live model call, when one happened. Absent on the deterministic
  // fallback. The public route uses this to meter the global daily spend cap.
  usage?: { inputTokens: number; outputTokens: number };
};

// The public/landing endpoint is LOCKED to the same model the adversarial suite is gated
// against. Do not make this env-tunable and do not swap it to a cheaper model — the public
// surface must serve exactly what was tested. The authenticated path keeps its own default.
export const WILMA_PUBLIC_MODEL = "gpt-4o";

// Tighter bounds for the anonymous surface (vs the authenticated 12 turns / 4000 chars):
// smaller history and a hard per-message length, to bound untrusted token cost.
export const MAX_HISTORY_TURNS_PUBLIC = 8;
export const MAX_TURN_CHARS_PUBLIC = 600;
export const MAX_MESSAGE_CHARS_PUBLIC = 1000;

// A prior turn in the same conversation. Roles mirror the client UI vocabulary
// ("user" and "guide"); the live model maps "guide" -> "assistant".
export type WilmaTurn = {
  role: "user" | "guide";
  text: string;
};

// Bounds on replayed history, to keep payloads and token cost in check. These cap how
// much prior conversation the model sees; they do not affect the deterministic fallback.
const MAX_HISTORY_TURNS = 12;
const MAX_TURN_CHARS = 4000;

// Validates and bounds caller-supplied history: keeps only well-formed user/guide turns
// with non-empty text, trims/caps each turn, and retains the most recent MAX_HISTORY_TURNS.
export function normalizeWilmaHistory(
  history: unknown,
  opts?: { maxTurns?: number; maxTurnChars?: number }
): WilmaTurn[] {
  const maxTurns = opts?.maxTurns ?? MAX_HISTORY_TURNS;
  const maxTurnChars = opts?.maxTurnChars ?? MAX_TURN_CHARS;
  if (!Array.isArray(history)) {
    return [];
  }
  const cleaned: WilmaTurn[] = [];
  for (const entry of history) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as { role?: unknown }).role;
    const text = (entry as { text?: unknown }).text;
    if (role !== "user" && role !== "guide") continue;
    if (typeof text !== "string") continue;
    const trimmed = text.trim();
    if (!trimmed) continue;
    cleaned.push({ role, text: trimmed.slice(0, maxTurnChars) });
  }
  return cleaned.slice(-maxTurns);
}

// Generates Wilma's draft reply. The provider is OPTIONAL by design: when OPENAI_API_KEY
// is unset (or the call fails/empties/times out), we fall back to the deterministic,
// guardrail-safe placeholder — so Wilma never *requires* a live provider. Either way, the
// returned draft is still run through guardWilmaResponse() before it reaches the user.
export async function generateWilmaReply({
  message,
  context,
  history = [],
  surface = "authenticated",
  model,
  forceFallback = false
}: {
  message: string;
  context: WilmaContext;
  // Prior turns in this conversation, oldest first, EXCLUDING the current message.
  history?: WilmaTurn[];
  // Selects the system-prompt reference block (no case visibility for public_landing).
  surface?: "authenticated" | "public_landing";
  // Overrides the model id. Public callers pass WILMA_PUBLIC_MODEL (locked gpt-4o);
  // when omitted the authenticated default applies.
  model?: string;
  // When true (e.g. the daily spend cap is exhausted, or the rate store is unreachable),
  // skip the provider entirely and serve the deterministic, guardrail-safe fallback.
  forceFallback?: boolean;
}): Promise<WilmaReply> {
  const fallbackText = draftWilmaPlaceholderResponse(message);
  const apiKey = process.env.OPENAI_API_KEY;
  if (forceFallback || !apiKey) {
    return { text: fallbackText, modelVersion: wilmaModelVersion };
  }

  const resolvedModel = model ?? process.env.OPENAI_WILMA_MODEL ?? "gpt-4.1-mini";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: resolvedModel,
        input: [
          { role: "system", content: buildWilmaSystemPrompt(context, { surface }) },
          ...history.map((turn) => ({
            role: turn.role === "guide" ? "assistant" : "user",
            content: turn.text
          })),
          { role: "user", content: message }
        ],
        temperature: 0.5,
        max_output_tokens: 500
      })
    });

    if (!response.ok) {
      return { text: fallbackText, modelVersion: wilmaModelVersion };
    }

    const body = await response.json() as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = readResponseText(body).trim();
    if (!text) {
      return { text: fallbackText, modelVersion: wilmaModelVersion };
    }
    const usage = {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0
    };
    // Telemetry records the actual model when it differs from the authed default.
    const modelVersion = model ? `${wilmaLiveModelVersion}:${resolvedModel}` : wilmaLiveModelVersion;
    return { text, modelVersion, usage };
  } catch {
    return { text: fallbackText, modelVersion: wilmaModelVersion };
  }
}

function readResponseText(body: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (body.output_text) {
    return body.output_text;
  }
  return body.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("\n")
    .trim() ?? "";
}
