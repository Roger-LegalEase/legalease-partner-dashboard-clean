/**
 * Adapter: evaluate a completed screening.
 *
 * This is the SECOND of the two integration points between the frontend and the engine.
 * The live/mock switch is confined to this file.
 *
 *   Live (now active): POST /api/expungement-ai/evaluate  (source-engine deterministic evaluator)
 *   Mock (fallback):   a non-evaluating fixture that returns a fixed, safe `needs_review` result.
 *
 * SAFETY (non-negotiable): the frontend never decides eligibility. It sends the collected answers
 * and renders whatever `ScreeningEvaluation` the engine returns. The mock contains NO legal rules.
 * There is deliberately no query parameter, branch selector, or hidden input that can force a
 * result or `paymentAllowed`.
 *
 * Every response (live or mock) is validated against the contract before it is returned, so a
 * malformed response can never become a packet-ready or payment-allowed state.
 */
import { type EvaluateRequest, type ScreeningEvaluation } from "./contracts";
import { buildNeedsReviewEvaluation } from "./fixtures";
import { parseScreeningEvaluation } from "./schemas";

/** Live wiring active: the request goes to the real `/evaluate` endpoint. */
const USE_LIVE_EVALUATE_ENDPOINT = true;

/**
 * Discriminated result so the UI can show distinct, calm states:
 *   - `api_error`          -> the request itself failed (network / non-2xx). Offer retry.
 *   - `malformed_response` -> a response came back but violated the contract. We refuse to
 *                             render it rather than risk a wrong outcome. Offer retry.
 * A malformed response can never become a packet-ready or payment-allowed state.
 */
export type EvaluateScreeningResult =
  | { ok: true; data: ScreeningEvaluation }
  | { ok: false; kind: "api_error" | "malformed_response"; error: string };

/**
 * Evaluate a screening. Returns a discriminated result so callers render a calm error state
 * instead of catching exceptions.
 *
 * @param request The frozen request shape: { jurisdiction, profileVersion, matterId, answers }.
 */
export async function evaluateScreening(request: EvaluateRequest): Promise<EvaluateScreeningResult> {
  const raw = USE_LIVE_EVALUATE_ENDPOINT
    ? await postLiveEvaluation(request)
    : { ok: true as const, value: runMockEvaluation(request) };

  if (!raw.ok) {
    return { ok: false, kind: "api_error", error: raw.error };
  }

  const parsed = parseScreeningEvaluation(raw.value);
  if (!parsed.ok) {
    return { ok: false, kind: "malformed_response", error: parsed.error };
  }

  return { ok: true, data: parsed.data };
}

/**
 * The mock evaluator (kept for offline/fallback use behind the flag). It returns the SAME fixed
 * safe result for every input and never inspects `answers` to derive an outcome.
 */
function runMockEvaluation(request: EvaluateRequest): ScreeningEvaluation {
  return buildNeedsReviewEvaluation({
    jurisdiction: request.jurisdiction,
    profileVersion: request.profileVersion,
    matterId: request.matterId
  });
}

/**
 * Live evaluation POST. The response is validated by `evaluateScreening` before render; the
 * engine's live response is the source of truth for legal outcomes. Non-2xx responses (including
 * 404 unsupported_jurisdiction, 409 profile_version_mismatch, 400 invalid_question_ids) surface
 * as a calm, retryable error; they never become a result.
 */
async function postLiveEvaluation(
  request: EvaluateRequest
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    const response = await fetch("/api/expungement-ai/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      return { ok: false, error: `Evaluation request failed (${response.status}).` };
    }
    return { ok: true, value: (await response.json()) as unknown };
  } catch {
    return { ok: false, error: "We could not check this record right now. Please try again." };
  }
}
