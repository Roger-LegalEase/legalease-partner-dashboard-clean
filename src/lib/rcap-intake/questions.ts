import type { RcapIntakeStepId } from "./types";

export type RcapIntakeQuestion = {
  id: RcapIntakeStepId;
  prompt: string;
  helper?: string;
  type: "choice" | "text" | "boolean" | "contact";
  options?: Array<{ label: string; value: string }>;
};

export const rcapIntakeQuestions: RcapIntakeQuestion[] = [
  {
    id: "understand_goal",
    prompt: "What are you trying to understand today?",
    helper: "Choose the closest option. It is okay if you are not sure.",
    type: "choice",
    options: [
      { label: "An old arrest", value: "old_arrest" },
      { label: "Charged but not convicted", value: "charged_not_convicted" },
      { label: "A past conviction", value: "past_conviction" },
      { label: "Not sure what shows up", value: "not_sure_what_shows" },
      { label: "A background check concern", value: "background_check_concern" }
    ]
  },
  {
    id: "state",
    prompt: "What state did this happen in?",
    helper: "Use the state where the arrest, charge, or case happened.",
    type: "text"
  },
  {
    id: "county",
    prompt: "What county or local area was involved?",
    helper: "A best guess is enough for now.",
    type: "text"
  },
  {
    id: "case_outcome",
    prompt: "What happened with the case?",
    helper: "This does not decide eligibility. It helps us suggest the next review step.",
    type: "choice",
    options: [
      { label: "Dismissed", value: "dismissed" },
      { label: "No bill / not prosecuted", value: "not_prosecuted" },
      { label: "Convicted", value: "convicted" },
      { label: "Completed sentence", value: "completed_sentence" },
      { label: "Not sure", value: "not_sure" }
    ]
  },
  {
    id: "approximate_case_year",
    prompt: "About when did this happen?",
    helper: "You can enter a year or an approximate timeframe.",
    type: "text"
  },
  {
    id: "has_documents",
    prompt: "Do you have any paperwork or case information?",
    helper: "Do not upload documents here. We are only asking whether you have them.",
    type: "boolean"
  },
  {
    id: "needs_record_check",
    prompt: "Would you like help getting your record checked?",
    helper: "A record check may be helpful if you are not sure what appears.",
    type: "boolean"
  },
  {
    id: "contact_information",
    prompt: "Where can the program follow up?",
    helper: "We only need basic contact information for this foundation. Do not enter SSN or date of birth.",
    type: "contact"
  }
];

export const illinoisIntakeIntro =
  "Illinois has two main record-clearing paths: expungement and sealing. Expungement usually applies when the case did not end in a conviction. Sealing is often used for eligible convictions and hides the record from most public searches. I’ll ask a few simple questions to see which path may be worth reviewing.";

export const illinoisCaseOutcomeOptions = [
  { label: "No charges were filed", value: "no_charges_filed" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Not guilty / acquitted", value: "not_guilty" },
  { label: "Court supervision", value: "court_supervision" },
  { label: "Qualified probation", value: "qualified_probation" },
  { label: "Conviction", value: "convicted" },
  { label: "Not sure", value: "not_sure" }
];

export const illinoisSealingExclusionOptions = [
  "DUI / aggravated DUI",
  "reckless driving",
  "domestic battery",
  "order of protection violation",
  "sex offense / registration issue",
  "violent offense / serious violent felony",
  "animal cruelty category",
  "not sure"
];

export const pennsylvaniaIntakeIntro =
  "Pennsylvania has three record relief paths to sort through: expungement, limited access / sealing, and Clean Slate. Expungement is narrow and usually means destruction. Sealing or limited access usually hides a record from most public searches. I’ll ask a few simple questions so the next step can be reviewed.";

export const pennsylvaniaCaseOutcomeOptions = [
  { label: "Dismissed", value: "dismissed" },
  { label: "No charges were filed", value: "no_charges_filed" },
  { label: "Not guilty / acquitted", value: "not_guilty" },
  { label: "No disposition shows", value: "not_sure" },
  { label: "Convicted", value: "convicted" },
  { label: "Completed sentence", value: "completed_sentence" },
  { label: "Not sure", value: "not_sure" }
];

export const rcapIntakeStepOrder = rcapIntakeQuestions.map((question) => question.id);

export function getRcapIntakeQuestion(stepId: RcapIntakeStepId) {
  return rcapIntakeQuestions.find((question) => question.id === stepId);
}

export function getNextRcapIntakeStep(stepId: RcapIntakeStepId): RcapIntakeStepId | "completed" {
  const index = rcapIntakeStepOrder.indexOf(stepId);
  return rcapIntakeStepOrder[index + 1] ?? "completed";
}
