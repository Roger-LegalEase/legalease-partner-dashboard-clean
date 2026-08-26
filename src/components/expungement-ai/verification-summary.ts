import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

type SummaryQuestion = { id: string; prompt?: string };

export type VerificationSummaryRow = {
  id: string;
  label: string;
  value: string;
  editId: string | null;
};

export type VerificationSummary = {
  context: Array<{ id: "jurisdiction" | "pathway_id"; label: string; value: string }>;
  screeningAnswers: VerificationSummaryRow[];
  packetAnswers: VerificationSummaryRow[];
};

const CONTEXT_IDS = new Set(["jurisdiction", "pathway_id"]);

/** Build a complete, de-duplicated participant review from the model available to this UI. */
export function verificationSummary(model: {
  stateName: string;
  pathwayLabel: string;
  screeningAnswers: Record<string, AnswerValue>;
  initialAnswers: Record<string, AnswerValue>;
  questions: SummaryQuestion[];
  builderQuestions: Array<{ id: string }>;
}): VerificationSummary {
  const packetIds = new Set(Object.keys(model.initialAnswers));
  const editableIds = new Set(model.builderQuestions.map((question) => question.id));
  const questionLabels = new Map(model.questions.map((question) => [question.id, question.prompt]));
  const row = (id: string, value: AnswerValue, editId: string | null): VerificationSummaryRow => ({
    id,
    label: questionLabels.get(id) || fallbackLabel(id),
    value: displayAnswer(value),
    editId
  });

  return {
    context: [
      { id: "jurisdiction", label: "State", value: model.stateName },
      { id: "pathway_id", label: "Record-clearing option", value: model.pathwayLabel }
    ],
    screeningAnswers: Object.entries(model.screeningAnswers)
      .filter(([id]) => !CONTEXT_IDS.has(id) && !packetIds.has(id))
      .map(([id, value]) => row(id, value, null)),
    packetAnswers: Object.entries(model.initialAnswers)
      .filter(([id]) => !CONTEXT_IDS.has(id))
      .map(([id, value]) => row(id, value, editableIds.has(id) ? id : null))
  };
}

function fallbackLabel(id: string) {
  return id.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());
}

function displayAnswer(value: AnswerValue) {
  if (value === undefined || value === null || value === "") return "Missing";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return value.unknown ? "I’m not sure" : String(value.value ?? "Missing");
  const labels: Record<string, string> = {
    gt_10_years: "More than 10 years ago",
    yes: "Yes",
    no: "No"
  };
  return labels[String(value)] ?? String(value);
}
