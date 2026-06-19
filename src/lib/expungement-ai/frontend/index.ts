/**
 * Frontend-owned adapter boundary for the Expungement.ai consumer flow.
 *
 * The whole frontend talks to the engine through exactly two functions exported here:
 *   - `loadJurisdictionProfile(state)`  -> GET  /api/expungement-ai/profiles/{state}
 *   - `evaluateScreening(request, ctx)` -> POST /api/expungement-ai/evaluate
 *
 * Both are mocked on this branch; the swap to live endpoints is isolated to the two adapter
 * files. See `./contracts.ts` for the (temporary) shared contract mirror.
 */
export * from "./contracts";
export {
  parseJurisdictionProfile,
  parseScreeningEvaluation,
  parseEvaluateRequest,
  type ParseResult
} from "./schemas";
export {
  loadJurisdictionProfile,
  listAvailableStateKeys,
  listAvailableJurisdictions,
  normalizeStateKey,
  type LoadProfileResult,
  type JurisdictionListItem
} from "./profile-loader";
export {
  evaluateScreening,
  type EvaluateContext,
  type EvaluateScreeningResult
} from "./evaluate";
export {
  buildNeedsReviewEvaluation,
  SAFE_FALLBACK_RESULT_CODE,
  RESULT_GALLERY,
  type EvaluationContext
} from "./fixtures";
