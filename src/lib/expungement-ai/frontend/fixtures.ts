/**
 * Safe development fixtures for the Expungement.ai consumer frontend.
 *
 * CRITICAL SAFETY RULES (see the frontend handoff brief, sections 1 and 2):
 *   - These fixtures NEVER evaluate eligibility. They do not read answers and do not infer a
 *     result from anything the user entered. They are static, illustrative shapes only.
 *   - The normal mock flow returns a single fixed, safe result: `needs_review`.
 *   - The result gallery exists ONLY for development visual testing of all nine result screens.
 *     It must be rendered only behind a development-only route that is inaccessible in a
 *     production build. Never wire it into the live screening flow.
 *   - No fixture sets `paymentAllowed: true` except the two genuinely packet-ready codes, so the
 *     gallery faithfully reflects the contract's payment-visibility rule.
 */
import type { ScreeningEvaluation } from "./contracts";

/** The fixed, safe result the mock evaluator returns until the real engine is wired. */
export const SAFE_FALLBACK_RESULT_CODE = "needs_review" as const;

export type EvaluationContext = {
  jurisdiction: string;
  profileVersion: string;
  matterId: string;
};

/**
 * Build the fixed safe evaluation. This does not look at any answers; it only echoes the
 * jurisdiction/profileVersion/matterId so the result screen can name the right state. The
 * outcome is always `needs_review` with payment disallowed.
 */
export function buildNeedsReviewEvaluation(context: EvaluationContext): ScreeningEvaluation {
  return {
    jurisdiction: context.jurisdiction,
    profileVersion: context.profileVersion,
    matterId: context.matterId,
    resultCode: SAFE_FALLBACK_RESULT_CODE,
    userLabel: "This situation needs review.",
    reasons: [
      {
        code: "mock_engine_placeholder",
        text: "The eligibility engine is not connected on this branch yet, so your answers were saved for review instead of being scored."
      }
    ],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: [
      "Your answers are saved to your Briefcase.",
      "A reviewer will look at this record type before any next step.",
      "Nothing here is a decision about your eligibility."
    ],
    paymentAllowed: false
  };
}

/**
 * Development-only gallery: one example per result code for visual QA of every result screen.
 * These are hand-authored illustrative shapes, NOT computed outcomes. Do not import this into
 * the production screening flow.
 */
export const RESULT_GALLERY: readonly ScreeningEvaluation[] = [
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-packet-ready",
    pathwayId: "il_expungement_non_conviction",
    resultCode: "packet_ready",
    userLabel: "You may be eligible.",
    reasons: [
      { code: "gallery", text: "Illustrative example: an in-scope path with enough information and no blocker." }
    ],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Review what is included.", "Generate your self-help packet.", "Review every document before filing."],
    paymentAllowed: true,
    packetPlan: {
      pathwayId: "il_expungement_non_conviction",
      mode: "official_form_overlay_or_source_form_set",
      formMappingStatus: "source_candidate_identified",
      sourceFormIds: ["il-expungement-petition"],
      requiredInputIds: ["charge", "disposition_date", "court"],
      sourceRuleRefs: ["20 ILCS 2630/5.2"]
    }
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-packet-ready-caution",
    pathwayId: "il_sealing_with_caution",
    resultCode: "packet_ready_with_caution",
    userLabel: "You may have a path, with a few cautions.",
    reasons: [{ code: "gallery", text: "Illustrative example: a path is available but carries cautions to review first." }],
    missingQuestionIds: [],
    cautions: ["Some details on this path are sensitive to your exact charge.", "Court approval is not guaranteed."],
    nextSteps: ["Read the cautions carefully.", "Generate your self-help packet if you want to proceed.", "Review every document before filing."],
    paymentAllowed: true,
    packetPlan: {
      pathwayId: "il_sealing_with_caution",
      mode: "state_specific_custom_packet_from_source_rules",
      formMappingStatus: "custom_or_manual_mapping_required",
      sourceFormIds: [],
      requiredInputIds: ["charge", "disposition_date"],
      sourceRuleRefs: ["20 ILCS 2630/5.2(c)"]
    }
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-needs-more-info",
    resultCode: "needs_more_info",
    userLabel: "We need a few more details.",
    reasons: [{ code: "gallery", text: "Illustrative example: a couple of facts are missing before the engine can score this." }],
    missingQuestionIds: ["disposition_date", "case_outcome"],
    cautions: [],
    nextSteps: ["Add the missing case details.", "Run the check again.", "Your progress is saved in your Briefcase."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-not-yet",
    resultCode: "not_yet",
    userLabel: "You may need to wait.",
    reasons: [{ code: "gallery", text: "Illustrative example: a waiting period may not have passed yet." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Save this result.", "Set a reminder.", "Come back when the waiting period may be complete."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-guidance-only",
    resultCode: "guidance_only",
    userLabel: "We can give you next steps for your state.",
    reasons: [{ code: "gallery", text: "Illustrative example: a path with no packet template yet, so guidance is saved instead." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Save the guidance to your Briefcase.", "Read the filing next steps.", "Ask Wilma to explain the checklist."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-not-covered-yet",
    resultCode: "not_covered_yet",
    userLabel: "We do not support this record type yet.",
    reasons: [{ code: "gallery", text: "Illustrative example: this record type is not in scope yet." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Save this result.", "Ask to be notified when this record type is supported.", "Consider legal aid for more help."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-likely-not-eligible",
    resultCode: "likely_not_eligible",
    userLabel: "This record may not qualify.",
    reasons: [{ code: "gallery", text: "Illustrative example: based on the answers, this record may not qualify for self-help filing." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Save the result.", "Review the reasons.", "Consider a legal aid or attorney review."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-needs-review",
    resultCode: "needs_review",
    userLabel: "This situation needs review.",
    reasons: [{ code: "gallery", text: "Illustrative example: nothing else fit, so the situation is saved for review." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Your answers are saved.", "A reviewer will look at this record type.", "Nothing here is a decision about your eligibility."],
    paymentAllowed: false
  },
  {
    jurisdiction: "IL",
    profileVersion: "gallery",
    matterId: "gallery-hard-stop",
    resultCode: "hard_stop",
    userLabel: "We can't help with this type of record.",
    reasons: [{ code: "gallery", text: "Illustrative example: a record type this self-help tool cannot help with." }],
    missingQuestionIds: [],
    cautions: [],
    nextSteps: ["Do not use self-help filing for this issue.", "Contact legal aid or an attorney.", "Save this note in your Briefcase."],
    paymentAllowed: false
  }
];
