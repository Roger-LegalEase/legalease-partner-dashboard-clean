import "server-only";

import { dispositionFromAnswers, selectComposedRoute } from "@/lib/rcap-engine/composed-route-selector";
import type {
  EngineProfile,
  ScreeningAnswerValue,
  ScreeningEvaluation,
  ScreeningEvaluationRequest
} from "@/lib/rcap-engine/contracts";
import { evaluateExpungementAiMatter } from "@/lib/rcap-engine/expungement-ai-adapter";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import type { ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";

/**
 * Re-runs a saved screening input through the same server-owned evaluator used
 * by the public evaluate route. A pending-result row is only a handoff for the
 * inputs; none of its client-visible result, route, packet, or payment fields is
 * authoritative when the matter is claimed.
 */
export function evaluateAuthoritativeScreeningResult(input: {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
  answers: Record<string, ScreeningAnswerValue>;
}): {
  evaluation: ScreeningEvaluation;
  profile: EngineProfile;
  pathwayLabel: string | null;
  packetType: ExpungementAiEligibilityResult["packetType"] | undefined;
  selectedTrackId: string | null;
} {
  const request: ScreeningEvaluationRequest = {
    jurisdiction: input.jurisdiction,
    profileVersion: input.profileVersion,
    matterId: input.matterId,
    answers: input.answers
  };

  const firstPass = evaluateExpungementAiMatter(request);
  const selection = selectComposedRoute({
    jurisdiction: firstPass.jurisdiction,
    pathwayId: firstPass.pathwayId ?? null,
    // Derived from the answers the server just evaluated, so a track whose
    // adopted record covers only one record class cannot be reached by a
    // participant whose record is a different one.
    disposition: dispositionFromAnswers(input.answers as Record<string, unknown> | undefined)
  });

  const evaluation: ScreeningEvaluation = selection.status === "identity_unavailable"
    ? {
      ...firstPass,
      resultCode: "guidance_only",
      paymentAllowed: false,
      packetPlan: undefined,
      selectedTrackId: null,
      cautions: [
        ...firstPass.cautions,
        "This route's identity could not be resolved on the server, so it is served as guidance with payment closed."
      ]
    }
    // The compiled pathway matched, but the composed route adopted for it covers
    // a narrower record class than the pathway does. This is an accurate
    // eligibility refusal rather than a missing mapping: there is relief here,
    // and it simply is not something this participant files.
    : selection.status === "route_conditions_unmet"
      ? {
        ...firstPass,
        resultCode: "guidance_only",
        paymentAllowed: false,
        packetPlan: undefined,
        selectedTrackId: null,
        cautions: [
          ...firstPass.cautions,
          `This record does not reach the filing route adopted for this pathway: ${selection.reason}. It is served as guidance with payment closed.`
        ]
      }
      : selection.status === "selected"
        ? evaluateExpungementAiMatter({ ...request, selectedTrackId: selection.trackId })
        : firstPass;

  const profile = getProfileByJurisdiction(evaluation.jurisdiction);
  if (!profile) {
    throw new Error(`No compiled profile is available for ${evaluation.jurisdiction}.`);
  }

  const pathwayLabel = exactPathwayLabel(profile, evaluation.pathwayId);
  const labeledEvaluation = pathwayLabel ? { ...evaluation, pathwayLabel } : evaluation;
  return {
    evaluation: labeledEvaluation,
    profile,
    pathwayLabel,
    packetType: packetTypeForEvaluation(labeledEvaluation),
    selectedTrackId: selection.status === "selected" ? selection.trackId : null
  };
}

function exactPathwayLabel(profile: EngineProfile, pathwayId: string | undefined) {
  if (!pathwayId) return null;
  return profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === pathwayId)?.pathwayLabel
    ?? profile.pathways.find((candidate) => candidate.id === pathwayId)?.label
    ?? null;
}

function packetTypeForEvaluation(
  evaluation: ScreeningEvaluation
): ExpungementAiEligibilityResult["packetType"] | undefined {
  if (evaluation.resultCode === "guidance_only" || evaluation.resultCode === "not_covered_yet") {
    return "guidance_packet";
  }
  if (evaluation.packetPlan?.mode === "official_form_overlay_or_source_form_set") {
    return "official_pdf_overlay";
  }
  if (evaluation.packetPlan?.mode === "state_specific_custom_packet_from_source_rules") {
    return "custom_pleading";
  }
  if (evaluation.packetPlan?.mode === "automatic_relief_verification_and_guidance") {
    return "guidance_packet";
  }
  return undefined;
}
