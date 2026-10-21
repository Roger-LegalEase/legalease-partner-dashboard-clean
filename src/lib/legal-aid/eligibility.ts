import { answerValue, normalizeMoney, type IntakeAnswers } from "./intake-schema";

// Financial review under a versioned, partner-approved policy profile.
//
// Reported amounts are never changed. The profile says which reported receipt
// categories count as cash income; everything else stays reported-but-excluded
// (for example food benefits, which are noncash under 45 CFR 1611.2(i)).
// Expenses are never deducted automatically. When the profile carries no
// approved income guideline the outcome is manual review, not an invented
// threshold.

export type FinancePolicy = {
  countableReceiptCategories: string[];
  excludedReceiptCategories: string[];
  incomeGuideline: null | {
    basis: string;
    effectiveFrom: string;
    monthlyLimitByHouseholdSize: Record<string, number>;
    additionalMemberMonthly?: number;
  };
  assetPolicy: null | { basis: string; note: string };
};

export type PolicyProfileDocument = {
  profileId: string;
  partnerSlug: string;
  version: number;
  intakeSchemaVersion: string;
  finance: FinancePolicy;
  citizenship: { attestationRequiredWhenYes: boolean; confidentialReviewWhenNoOrUnsure: boolean; basis: string };
  service: { permittedMatters: string[]; acceptanceAuthority: string; note: string };
  documents: { key: string; title: string; requiredSigner: string; executionMethod: string; authorityNote: string; templateVersion: string }[];
  records: { caseFileOwner: string; exportRecipientNote: string; retentionNote: string };
};

export type EligibilitySummary = {
  reportedReceipts: Record<string, { state: "amount" | "unknown" | "missing"; amount: number | null }>;
  reportedExpenses: Record<string, { state: "amount" | "unknown" | "missing"; amount: number | null }>;
  countable: {
    monthlyCashIncome: number | null;
    countedCategories: string[];
    excludedCategories: string[];
    unknownCategories: string[];
    missingCategories: string[];
  };
  householdSize: number | null;
  guideline: { basis: string; monthlyLimit: number } | null;
  outcome: "manual_review" | "within_guideline" | "over_guideline";
  reasons: string[];
};

const RECEIPT_KEYS = ["wages", "disability", "food_stamps", "unemployment", "tanf", "pension_retirement", "family_friend_assistance", "other"];
const EXPENSE_KEYS = ["rent_mortgage", "child_support", "medical", "nursing_home_care", "taxes", "child_care", "transportation", "employment_related"];

function reported(answers: IntakeAnswers, key: string): { state: "amount" | "unknown" | "missing"; amount: number | null } {
  const answer = answers[key];
  if (!answer) return { state: "missing", amount: null };
  if (answer.state === "unknown") return { state: "unknown", amount: null };
  if (answer.state !== "answered") return { state: "missing", amount: null };
  const normalized = normalizeMoney(typeof answer.value === "string" ? answer.value : "");
  return normalized === null ? { state: "missing", amount: null } : { state: "amount", amount: Number(normalized) };
}

export function computeEligibilitySummary(answers: IntakeAnswers, finance: FinancePolicy): EligibilitySummary {
  const reportedReceipts: EligibilitySummary["reportedReceipts"] = {};
  const reportedExpenses: EligibilitySummary["reportedExpenses"] = {};
  for (const key of RECEIPT_KEYS) reportedReceipts[key] = reported(answers, `monthly_receipts.${key}`);
  for (const key of EXPENSE_KEYS) reportedExpenses[key] = reported(answers, `monthly_expenses.${key}`);

  const countedCategories: string[] = [];
  const excludedCategories: string[] = [];
  const unknownCategories: string[] = [];
  const missingCategories: string[] = [];
  let total = 0;
  for (const key of RECEIPT_KEYS) {
    const entry = reportedReceipts[key];
    if (!finance.countableReceiptCategories.includes(key)) { excludedCategories.push(key); continue; }
    if (entry.state === "unknown") { unknownCategories.push(key); continue; }
    if (entry.state === "missing") { missingCategories.push(key); continue; }
    countedCategories.push(key);
    total += entry.amount ?? 0;
  }
  const complete = unknownCategories.length === 0 && missingCategories.length === 0;
  const monthlyCashIncome = complete ? Math.round(total * 100) / 100 : null;

  const adults = answerValue(answers, "household.adult_count");
  const children = answerValue(answers, "household.child_count");
  const householdSize = adults !== undefined && children !== undefined && /^\d+$/.test(adults) && /^\d+$/.test(children)
    ? Number(adults) + Number(children)
    : null;

  const reasons: string[] = [];
  let guideline: EligibilitySummary["guideline"] = null;
  let outcome: EligibilitySummary["outcome"] = "manual_review";

  if (!finance.incomeGuideline) {
    reasons.push("The approved profile carries no income guideline table; MVLP staff decide program eligibility.");
  } else if (householdSize === null || householdSize < 1) {
    reasons.push("Household size is not established; review with the applicant.");
  } else if (monthlyCashIncome === null) {
    reasons.push("At least one countable receipt is unknown or unanswered; ask the applicant before deciding.");
  } else {
    const table = finance.incomeGuideline.monthlyLimitByHouseholdSize;
    const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);
    const largest = sizes[sizes.length - 1];
    const limit = table[String(householdSize)] ?? (householdSize > largest && finance.incomeGuideline.additionalMemberMonthly
      ? table[String(largest)] + (householdSize - largest) * finance.incomeGuideline.additionalMemberMonthly
      : undefined);
    if (limit === undefined) {
      reasons.push("The guideline table does not cover this household size; review manually.");
    } else {
      guideline = { basis: finance.incomeGuideline.basis, monthlyLimit: limit };
      outcome = monthlyCashIncome <= limit ? "within_guideline" : "over_guideline";
      reasons.push(outcome === "within_guideline"
        ? "Countable monthly cash income is within the approved guideline for this household size."
        : "Countable monthly cash income is above the approved guideline; only an authorized reviewer may apply an exception.");
    }
  }
  if (excludedCategories.some((key) => reportedReceipts[key].state === "amount" && (reportedReceipts[key].amount ?? 0) > 0)) {
    reasons.push("Reported noncash or excluded receipts are shown separately and are not counted as cash income.");
  }

  return {
    reportedReceipts,
    reportedExpenses,
    countable: { monthlyCashIncome, countedCategories, excludedCategories, unknownCategories, missingCategories },
    householdSize,
    guideline,
    outcome,
    reasons
  };
}
