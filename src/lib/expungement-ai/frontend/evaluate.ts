/**
 * Adapter: evaluate a completed screening.
 *
 * This is the SECOND of the two integration points between the frontend and the engine.
 * Swapping the mock for the live endpoint must be limited to this file.
 *
 *   Production: POST /api/expungement-ai/evaluate
 *   This branch: a non-evaluating mock that returns a fixed, safe `needs_review` result.
 *
 * SAFETY (non-negotiable): the mock contains NO legal rules and infers NOTHING from the
 * answers. It does not read `normalizedAnswers` to choose an outcome. The frontend never
 * decides eligibility; it renders whatever the engine returns. There is deliberately no query
 * parameter, branch selector, or hidden input that can force a different result or
 * `paymentAllowed`.
 *
 * Every response (mock or live) is validated against the contract before it is returned, so a
 * malformed live response can never become a packet-ready or payment-allowed state.
 */
import { type EvaluateRequest, type ScreeningEvaluation } from "./contracts";
import { buildNeedsReviewEvaluation } from "./fixtures";
import { parseScreeningEvaluation } from "./schemas";

/**
 * Flip to `true` only once Codex's `/evaluate` endpoint is live and the backend branch has
 * merged to `main`. Until then the non-evaluating mock stands in.
 */
const USE_LIVE_EVALUATE_ENDPOINT = false;

export type EvaluateContext = {
  /** The jurisdiction code echoed back onto the result (e.g. "IL"). */
  jurisdiction: string;
};

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
 * @param request  The frozen request shape: { profileVersion, matterId, normalizedAnswers }.
 * @param context  Display context (jurisdiction code) used only to label the mock result; the
 *                 live engine returns its own jurisdiction and this is ignored once live.
 */
export async function evaluateScreening(
  request: EvaluateRequest,
  context: EvaluateContext
): Promise<EvaluateScreeningResult> {
  const raw = USE_LIVE_EVALUATE_ENDPOINT
    ? await postLiveEvaluation(request)
    : { ok: true as const, value: runMockEvaluation(request, context) };

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
 * The mock evaluator. It returns the SAME fixed safe result for every input. It intentionally
 * does not inspect `request.normalizedAnswers`; answers are referenced only to echo the matter
 * id / profile version, never to derive an outcome.
 */
function runMockEvaluation(request: EvaluateRequest, context: EvaluateContext): ScreeningEvaluation {
  return buildNeedsReviewEvaluation({
    jurisdiction: context.jurisdiction,
    profileVersion: request.profileVersion,
    matterId: request.matterId
  });
}

/**
 * Live evaluation POST. Not active on this branch (guarded by `USE_LIVE_EVALUATE_ENDPOINT`).
 * The response is validated by `evaluateScreening` before render; the engine's live response is
 * the source of truth for legal outcomes.
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
