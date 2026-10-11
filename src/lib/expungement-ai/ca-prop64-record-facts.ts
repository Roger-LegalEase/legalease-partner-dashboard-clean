import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { CA_PROP64_RECORD_ANSWER_CONTRACT, CA_PROP64_RECORD_FACT_IDS } from "@/lib/expungement-ai/ca-prop64-record-answer";

type RecordQuestion = Pick<PublicQuestion, "id" | "stage" | "prompt" | "type" | "required"> &
  Partial<Pick<PublicQuestion, "helperText" | "options" | "contextOnly" | "lifecyclePhase">>;

/** Reuse the two existing record facts. No county, offense-category or legal-qualifier alias. */
export function caProp64RecordQuestion<T extends RecordQuestion>(jurisdiction: string, question: T): T | null {
  if (jurisdiction !== "CA" || question.stage !== "case_details" || !question.required
    || question.contextOnly === true || question.options != null) return null;
  const matches = question.id === "court"
    ? question.prompt === "Which court or agency handled the case?" && question.type === "text" && !question.helperText
    : question.id === "charge" && question.prompt === "What does the record say you were charged with?"
      && question.type === "text_or_unknown" && question.helperText === "the charge name or code, however it's written";
  return matches ? { ...question, type: "text_or_unknown", lifecyclePhase: "prepay_required", answerContract: CA_PROP64_RECORD_ANSWER_CONTRACT } : null;
}

/** Scope this collection adapter to the exact authored child-route consumers. Drift must be reviewed. */
export function caProp64RecordQuestions(profile: EngineProfile, questions: readonly PublicQuestion[], pathwayId?: string | null): PublicQuestion[] {
  if (!isCaProp64Pathway(profile.jurisdiction.code, pathwayId)) return [];
  const rules = (profile.orderedDecisionRules ?? []).filter((rule) => rule.id === `route-${pathwayId}`);
  if (profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "0fddd0751f1ac9d006244dd220f5eb99ba7cf2bbc3e0b3d26ec70b4680f789ac"
    || rules.length !== 1 || rules[0].when?.backendPathwayId !== pathwayId
    || JSON.stringify(rules[0].candidatePathwayIds) !== JSON.stringify([pathwayId])
    || !rules[0].when?.requiredFields?.includes("court") || !rules[0].when?.fieldsReferenced?.includes("charge")) {
    throw new Error("California Proposition 64 record-fact source contract changed.");
  }
  return CA_PROP64_RECORD_FACT_IDS.map((id) => {
    const matches = questions.filter((question) => question.id === id);
    const question = matches.length === 1 ? caProp64RecordQuestion(profile.jurisdiction.code, matches[0]) : null;
    if (!question) throw new Error(`California Proposition 64 record question changed: ${id}`);
    return question;
  });
}

