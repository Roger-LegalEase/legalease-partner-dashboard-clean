import "server-only";

import type { ScreeningEvaluation, ScreeningEvaluationRequest } from "@/lib/rcap-engine/contracts";
import {
  componentDeferralForTrack,
  exactDeferralForPathway,
  type ExactSupportedDeferral
} from "@/lib/rcap/documents/guidance-packet-registry";

/**
 * The single component-deferral clamp on the screening engine.
 *
 * It runs between `evaluateScreening` and every server-side caller, so a
 * composed route whose official-form component is not supplied can never leave
 * the engine boundary as packet_ready. `invalid_component_deferral` is clamped
 * exactly as hard as a valid deferral: a broken treatment record is a reason to
 * close payment, not a reason to fall through to a sibling packet route.
 *
 * It lives beside the evaluator rather than inside it because
 * `src/lib/rcap-engine/evaluator.ts` is byte-pinned by the reviewed screening
 * parity approval (data/expungement-ai/screening-parity-approved-deltas.json).
 * Editing those bytes would silently re-authorize a file Roger approved at an
 * exact hash, so the clamp is applied at the two server adapters instead —
 * `expungement-ai-adapter.ts` and `rcap-adapter.ts`, which together are every
 * server-side path into the engine.
 *
 * `selectedTrackId` is server-owned. The HTTP boundaries refuse the field on a
 * client body, so nothing a participant sends can reach — or evade — this.
 */
export function applyComponentDeferralClamp(
  request: ScreeningEvaluationRequest,
  evaluation: ScreeningEvaluation
): ScreeningEvaluation {
  const exact = exactDeferralForPathway(evaluation.jurisdiction, evaluation.pathwayId ?? null);
  if (exact) return applyExactDeferralClamp(exact, evaluation);

  const deferral = componentDeferralForTrack(request.selectedTrackId ?? null);
  if (!deferral) return evaluation;

  const { packetPlan: _discardedPaidPlan, ...withoutPlan } = evaluation;
  void _discardedPaidPlan;

  return {
    ...withoutPlan,
    resultCode: "guidance_only",
    userLabel: "This route is guidance-only while a required official form is outstanding.",
    paymentAllowed: false,
    cautions: [...evaluation.cautions, cautionFor(deferral.classification)],
    nextSteps: nextStepsFor(deferral),
    treatmentClassification: "component_deferral",
    selectedTrackId: deferral.trackId,
    deferralComponentIds: deferral.componentIds
  };
}

function cautionFor(classification: "component_deferral" | "invalid_component_deferral") {
  return classification === "component_deferral"
    ? "This route needs at least one official form we do not supply, so it is served as guidance and no packet is sold for it."
    : "This route's deferred-component record did not validate, so the route fails closed as guidance with payment and credit disabled.";
}

function nextStepsFor(deferral: {
  components: Array<{ absentComponent: { en: string }; nextAction: { en: string } }>;
}) {
  // English here, because the engine contract carries no locale. The full
  // bilingual participant treatment travels with the Briefcase item, which is
  // where the participant actually reads it.
  const steps = ["Your saved work stays in your Briefcase; nothing is purchased and no packet credit is used."];
  for (const component of deferral.components) {
    steps.push(`${component.absentComponent.en} ${component.nextAction.en}`);
  }
  return steps;
}

/**
 * The exact-supported-deferral clamp.
 *
 * A route whose accepted treatment says no packet is prepared or sold must not
 * leave the engine as packet_ready with payment open — otherwise the
 * participant is shown a price for something the route itself says does not
 * exist, and only later surfaces refuse it. Matched on the compiled pathway,
 * because that is what the participant actually arrives through.
 *
 * An invalid record clamps exactly as hard as a valid one.
 */
function applyExactDeferralClamp(
  exact: ExactSupportedDeferral,
  evaluation: ScreeningEvaluation
): ScreeningEvaluation {
  const { packetPlan: _discardedPaidPlan, ...withoutPlan } = evaluation;
  void _discardedPaidPlan;

  const valid = exact.classification === "exact_supported_deferral";
  return {
    ...withoutPlan,
    resultCode: "guidance_only",
    userLabel: valid
      ? exact.routeLabel.en
      : "This route is guidance-only while its deferral record is being corrected.",
    paymentAllowed: false,
    cautions: [
      ...evaluation.cautions,
      valid
        ? "No packet is prepared or sold for this route; it is served as an exact supported deferral."
        : "This route's deferral record did not validate, so it fails closed as guidance with payment and credit disabled.",
    ],
    nextSteps: valid
      ? [exact.exactReason.en, exact.whatNotToFileOrAssume.en, exact.destination.en, ...exact.gather.en, exact.nextAction.en, exact.handoff.en]
      : evaluation.nextSteps,
    treatmentClassification: "exact_supported_deferral",
    selectedTrackId: exact.trackId,
  };
}
