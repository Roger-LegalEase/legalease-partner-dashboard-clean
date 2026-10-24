import "server-only";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import type { RecordFactConfirmations } from "@/lib/expungement-ai/record-fact-clarification";
import { unresolvedRecordFactConfirmations } from "@/lib/expungement-ai/record-fact-clarification";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { MN_CASE_COUNTY, MN_PETITION_ROUTE, MN_TARGET_ORIGIN_ID,
  mnTwoCountySourceContract, mnTwoCountyQuestions, mnTargetOriginQuestion,
  mnProtectedStageContext } from "@/lib/expungement-ai/mn-two-county-source-facts";

/** Server-owned held preparation only. A reported county and confirmed origin
 * identify a caption; neither establishes eligibility or verifies court records. */
export function mnPetitionCaptionFacts(input: {
  profile: EngineProfile | undefined;
  pathwayId: string;
  specification: RegisteredSpecification | null | undefined;
  answers: Readonly<Record<string, unknown>>;
  confirmations?: RecordFactConfirmations;
  unresolved?: readonly string[];
}): { "matter.county": string } {
  const { profile, pathwayId, specification, answers, confirmations, unresolved = [] } = input;
  if (pathwayId !== MN_PETITION_ROUTE || !mnTwoCountySourceContract(profile, pathwayId, specification)) {
    throw new Error("Minnesota petition caption source mismatch");
  }
  const stage = mnProtectedStageContext(profile, pathwayId, specification, answers, unresolved)?.candidate;
  if (!stage?.candidate || stage.candidate.familyId !== "mn_petition_609a02_subd3-set" || stage.missingFactIds.length) {
    throw new Error("Minnesota petition caption needs current held case facts");
  }
  const origin = mnTargetOriginQuestion(profile, pathwayId, specification)!;
  if (unresolved.includes(MN_TARGET_ORIGIN_ID) || scalarAnswerText(answers[MN_TARGET_ORIGIN_ID]) !== "State or local"
    || unresolvedRecordFactConfirmations(`MN:${pathwayId}`, answers,
      new Map([[MN_TARGET_ORIGIN_ID, origin]]), confirmations, unresolved).length) {
    throw new Error("Minnesota petition caption target origin is not confirmed");
  }
  const countyQuestion = mnTwoCountyQuestions(pathwayId).find(question => question.id === MN_CASE_COUNTY)!;
  if (unresolved.includes(MN_CASE_COUNTY) || questionAnswerState(countyQuestion, answers[MN_CASE_COUNTY]) !== "known_valid") {
    throw new Error("Minnesota petition caption deciding-case county is missing or unknown");
  }
  const county = scalarAnswerText(answers[MN_CASE_COUNTY])!.trim();
  if (/[\r\n\x00-\x1f]/.test(county)) throw new Error("Minnesota petition caption county must be one line");
  return { "matter.county": county };
}
