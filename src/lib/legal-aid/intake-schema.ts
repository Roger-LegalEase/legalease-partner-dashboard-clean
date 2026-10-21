// MVLP confidential intake: the field map.
//
// Three things are kept apart on every field:
//   source   — what the public Cognito screen was observed to show
//              (inputs/MVLP_LIVE_INTAKE_BUILD_INPUTS, inspected 2026-09-15);
//   product  — what this intake does, and whether that is the observed
//              behaviour ("observed"), an explicit MVLP-product adaptation
//              ("adaptation"), or a detail the source did not resolve and this
//              product therefore decides explicitly rather than guesses
//              ("unresolved").
//
// Requiredness: a source "Yes" is a display observation, not tested server
// validation; `null` means unknown, and unknown is never treated as optional.
// A group-level required marker is never propagated to a subfield.

export const INTAKE_SCHEMA_VERSION = "mvlp-intake-v1";

export type AnswerState = "answered" | "unknown" | "not_applicable";
export type IntakeAnswer = { state: AnswerState; value?: string | string[] };
export type IntakeAnswers = Record<string, IntakeAnswer>;

export type FieldControl =
  | "text" | "textarea" | "radio" | "checkbox_group" | "dropdown" | "date"
  | "money" | "count" | "phone" | "email" | "restricted_ssn";

export type SourceObservation = {
  label: string;
  control: string;
  requiredReported: boolean | null;
  groupLabel?: string;
  groupRequiredReported?: boolean;
  options?: string[];
  note?: string;
};

export type ProductRule = {
  requirement: "required" | "optional" | "conditional" | "derived";
  category: "observed" | "adaptation" | "unresolved";
  conditionalOn?: { key: string; equals: string };
  allowUnknown?: boolean;
  note: string;
};

export type IntakeFieldSpec = {
  key: string;
  section: IntakeSectionKey;
  label: string;
  help?: string;
  control: FieldControl;
  options?: { value: string; label: string; adaptation?: boolean }[];
  source: SourceObservation;
  product: ProductRule;
};

export type IntakeSectionKey =
  | "clinic" | "legal_matter" | "personal" | "household" | "receipts" | "assets" | "accounts" | "expenses" | "legal_context" | "attestations";

export const INTAKE_SECTIONS: { key: IntakeSectionKey; title: string; intro: string }[] = [
  { key: "clinic", title: "Your clinic", intro: "Your clinic comes from your registration. You do not choose it again here." },
  { key: "legal_matter", title: "Your legal matter", intro: "Tell MVLP what kind of expungement you are asking about." },
  { key: "personal", title: "About you", intro: "Your name, how to reach you, and the details MVLP needs to identify your case." },
  { key: "household", title: "Your household and work", intro: "Who lives with you and where you work. Answer for your household as it is today." },
  { key: "receipts", title: "Monthly household receipts", intro: "Enter the monthly amount your household receives in each category. Enter 0 for a category you do not receive. If you do not know an amount, choose \"I don't know\" and MVLP will ask you about it." },
  { key: "assets", title: "Home and vehicle", intro: "Whether you own a home or a vehicle, and what they are worth." },
  { key: "accounts", title: "Bank accounts", intro: "Whether you have a checking or savings account, and the balance." },
  { key: "expenses", title: "Monthly expenses", intro: "Enter the monthly amount your household pays in each category. Enter 0 for a category that does not apply." },
  { key: "legal_context", title: "Your case and MVLP", intro: "Anything else about your legal matter, and whether you already have a case with MVLP or an attorney." },
  { key: "attestations", title: "Review and sign", intro: "Read each statement that applies to you and sign it. A volunteer may help you type, but only you sign." }
];

const MONEY_HELP = "Monthly amount in dollars. Enter 0 if none.";

const RECEIPT_CATEGORIES: [string, string][] = [
  ["wages", "Monthly Wages:"], ["disability", "Disability:"], ["food_stamps", "Food Stamps:"], ["unemployment", "Unemployment:"],
  ["tanf", "TANF:"], ["pension_retirement", "Pension/Retirement:"], ["family_friend_assistance", "Assistance from family or friends:"], ["other", "Other:"]
];

const EXPENSE_CATEGORIES: [string, string][] = [
  ["rent_mortgage", "Rent/Mortgage: $"], ["child_support", "Child Support: $"], ["medical", "Medical: $"], ["nursing_home_care", "Nursing Home/Medical Home Care: $"],
  ["taxes", "Taxes: $"], ["child_care", "Child Care: $"], ["transportation", "Transportation: $"], ["employment_related", "Employment Related: $"]
];

const YES_NO = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];

export const US_STATES: { value: string; label: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"],
  ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"],
  ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["AS", "American Samoa"], ["GU", "Guam"], ["MP", "Northern Mariana Islands"], ["PR", "Puerto Rico"], ["VI", "U.S. Virgin Islands"],
  ["AA", "Armed Forces Americas"], ["AE", "Armed Forces Europe"], ["AP", "Armed Forces Pacific"]
].map(([value, label]) => ({ value, label }));

export const INTAKE_FIELDS: IntakeFieldSpec[] = [
  {
    key: "clinic_choices", section: "clinic", label: "Which legal clinic are you requesting to attend?", control: "text",
    source: { label: "Which legal clinic are you requesting to attend?", control: "checkbox_group", requiredReported: true,
      options: ["September 22, 2026 - Vicksburg, MS (Warren County) - 10:00 am", "September 25, 2026 - Oxford, MS (Lafayette, MS) - 10:00am", "October 24, 2026 - Jackson, MS (Hinds County) - 9:00am", "November 12, 2026 - Charleston, MS (Tallahatchie County) - 10:00am", "Loving Health Care"],
      note: "The public options are a dated snapshot, not the configured event." },
    product: { requirement: "derived", category: "adaptation", note: "Taken from the clinic registration the applicant already completed; the event is saved configuration, never a copied date." }
  },
  {
    key: "legal_matter", section: "legal_matter", label: "What is your legal matter?", control: "radio",
    options: [{ value: "felony_expungement", label: "Felony Expungement" }, { value: "misdemeanor_expungement", label: "Misdemeanor Expungement" }],
    help: "If your matter is not listed, MVLP's direct-representation intake is the right place to start.",
    source: { label: "What is your legal matter", control: "radio_group", requiredReported: true, options: ["Felony Expungement", "Misdemeanor Expungement"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." }
  },
  { key: "name.first", section: "personal", label: "First name", control: "text",
    source: { label: "First", control: "text", requiredReported: null, groupLabel: "Name", groupRequiredReported: true },
    product: { requirement: "required", category: "unresolved", note: "Subfield requiredness was not established; a first name is needed to identify the applicant, so this product requires it." } },
  { key: "name.last", section: "personal", label: "Last name", control: "text",
    source: { label: "Last", control: "text", requiredReported: null, groupLabel: "Name", groupRequiredReported: true },
    product: { requirement: "required", category: "unresolved", note: "Subfield requiredness was not established; a last name is needed to identify the applicant, so this product requires it." } },
  { key: "ssn", section: "personal", label: "Social Security number", control: "restricted_ssn",
    help: "MVLP asks for this for the expungement court filing and does not use it for any other purpose. It is stored encrypted, shown only to the MVLP attorney or coordinator handling your case, and never appears in ordinary lists, messages, or exports.",
    source: { label: "SSN:", control: "text", requiredReported: true, note: "Source help says it is needed for court filing; that is the form's statement, not a verified universal court requirement." },
    product: { requirement: "required", category: "observed", note: "Collected only in this confidential intake, in a restricted encrypted field with audited reveal. Document-level necessity governs any later use." } },
  { key: "phone", section: "personal", label: "Phone number", control: "phone",
    source: { label: "Phone Number", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Source requiredness preserved." } },
  { key: "email", section: "personal", label: "Email", control: "email",
    source: { label: "Email", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Source requiredness preserved; pre-filled from the registration when available." } },
  { key: "address.line1", section: "personal", label: "Address line 1", control: "text",
    source: { label: "Address Line 1", control: "text", requiredReported: null, groupLabel: "Address", groupRequiredReported: true },
    product: { requirement: "required", category: "unresolved", note: "Subfield requiredness not established; a mailing address is needed for MVLP correspondence, so this product requires it." } },
  { key: "address.line2", section: "personal", label: "Address line 2", control: "text",
    source: { label: "Address Line 2", control: "text", requiredReported: null, groupLabel: "Address", groupRequiredReported: true },
    product: { requirement: "optional", category: "adaptation", note: "A group-level marker does not make line 2 mandatory; it is optional here." } },
  { key: "address.city", section: "personal", label: "City", control: "text",
    source: { label: "City", control: "text", requiredReported: null, groupLabel: "Address", groupRequiredReported: true },
    product: { requirement: "required", category: "unresolved", note: "Subfield requiredness not established; required here as part of a usable mailing address." } },
  { key: "address.state", section: "personal", label: "State", control: "dropdown", options: US_STATES,
    source: { label: "State", control: "dropdown", requiredReported: null, groupLabel: "Address", groupRequiredReported: true, note: "Only part of the menu and no default were reported." },
    product: { requirement: "required", category: "unresolved", note: "Full state and territory list used; no default is preselected." } },
  { key: "address.postal_code", section: "personal", label: "ZIP code", control: "text",
    source: { label: "Zip Code", control: "text", requiredReported: null, groupLabel: "Address", groupRequiredReported: true },
    product: { requirement: "required", category: "unresolved", note: "Subfield requiredness not established; required here as part of a usable mailing address." } },
  { key: "is_us_citizen", section: "personal", label: "Are you a U.S. citizen?", control: "radio", options: YES_NO,
    help: "If you answer No or are not sure, MVLP reviews your status privately. You will not be asked to sign a statement that you are a citizen.",
    source: { label: "Are you a U.S. Citizen?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved; a No answer routes to confidential review instead of the citizenship statement." } },
  { key: "gender", section: "personal", label: "Do you identify as a:", control: "radio",
    options: [{ value: "man", label: "Man" }, { value: "woman", label: "Woman" }, { value: "prefer_not_to_say", label: "Prefer not to say", adaptation: true }],
    source: { label: "Do you identify as a:", control: "radio_group", requiredReported: true, options: ["Man", "Woman"] },
    product: { requirement: "required", category: "adaptation", note: "Source choices preserved and a third choice added so the required question can be answered truthfully by everyone." } },
  { key: "date_of_birth", section: "personal", label: "What is your date of birth?", control: "date",
    source: { label: "What is your date of birth?", control: "date", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Source requiredness preserved." } },
  { key: "race", section: "personal", label: "What is your race?", control: "text",
    source: { label: "What is your race?", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Free text as in the source." } },
  { key: "household.adult_count", section: "household", label: "How many adults live in your household?", control: "count",
    source: { label: "How many adults live in your household?", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Counted, never defaulted to one." } },
  { key: "household.child_count", section: "household", label: "How many children live in your household?", control: "count",
    source: { label: "How many children live in your household?", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Counted, never defaulted." } },
  { key: "household.member_ages", section: "household", label: "Ages of all members in the household:", control: "text",
    source: { label: "Ages of all members in the household:", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Free text as in the source." } },
  { key: "household.disabled_member_count", section: "household", label: "Number in household who are disabled:", control: "count",
    source: { label: "Number in household who are disabled:", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Counted; 0 is an explicit answer." } },
  { key: "household.occupation", section: "household", label: "Occupation", control: "text", help: "Write \"none\" if you are not working.",
    source: { label: "Occupation", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Source requiredness preserved." } },
  { key: "household.employer", section: "household", label: "Employer", control: "text", help: "Write \"none\" if you do not have an employer.",
    source: { label: "Employer", control: "text", requiredReported: true },
    product: { requirement: "required", category: "observed", note: "Source requiredness preserved." } },
  ...RECEIPT_CATEGORIES.map(([slug, label]): IntakeFieldSpec => ({
    key: `monthly_receipts.${slug}`, section: "receipts", label: label.replace(/:$/, ""), control: "money", help: MONEY_HELP,
    source: { label, control: "text", requiredReported: true, note: "Source instructs applicants to enter $0 for categories they do not receive." },
    product: { requirement: "required", category: "observed", allowUnknown: true,
      note: slug === "food_stamps"
        ? "Reported as in the source. Collection does not make it countable cash income; the approved profile decides what counts."
        : "Reported amount; an explicit 0 and an unanswered field are different. \"I don't know\" is allowed and goes to MVLP review." }
  })),
  { key: "assets.owns_home", section: "assets", label: "Do you own a home?", control: "radio", options: YES_NO,
    source: { label: "Do you own a home?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "assets.owns_vehicle", section: "assets", label: "Do you own a vehicle?", control: "radio", options: YES_NO,
    source: { label: "Do you own a vehicle?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "assets.home_value", section: "assets", label: "If so, what is the value of your home?", control: "money", help: "Your best estimate in dollars.",
    source: { label: "If so, what is the value of your home?", control: "text", requiredReported: null, note: "Reported to appear when Do you own a home? is Yes; the complete truth table was not verified." },
    product: { requirement: "conditional", conditionalOn: { key: "assets.owns_home", equals: "yes" }, category: "adaptation", allowUnknown: true, note: "Asked when the applicant owns a home. This is this product's rule, not a claim about the source's full behaviour." } },
  { key: "assets.principal_residence", section: "assets", label: "Is this your main/principal residence?", control: "radio", options: YES_NO,
    source: { label: "Is this your main/principal residence?", control: "text", requiredReported: true, note: "Observed as a text control." },
    product: { requirement: "conditional", conditionalOn: { key: "assets.owns_home", equals: "yes" }, category: "adaptation", note: "Asked as Yes/No when the applicant owns a home." } },
  { key: "assets.vehicle_value", section: "assets", label: "If so, what is the value of your vehicle?", control: "money", help: "Your best estimate in dollars.",
    source: { label: "If so, what is the value of your vehicle?", control: "text", requiredReported: null, note: "Reported alongside the home questions; vehicle-only behaviour was not verified." },
    product: { requirement: "conditional", conditionalOn: { key: "assets.owns_vehicle", equals: "yes" }, category: "adaptation", allowUnknown: true, note: "Asked when the applicant owns a vehicle. This is this product's rule." } },
  { key: "assets.principal_vehicle", section: "assets", label: "Is this your main/principal vehicle?", control: "radio", options: YES_NO,
    source: { label: "Is this your main/principal vehicle?", control: "text", requiredReported: true, note: "Observed as a text control." },
    product: { requirement: "conditional", conditionalOn: { key: "assets.owns_vehicle", equals: "yes" }, category: "adaptation", note: "Asked as Yes/No when the applicant owns a vehicle." } },
  { key: "accounts.has_checking", section: "accounts", label: "Do you own a checking account?", control: "radio", options: YES_NO,
    source: { label: "Do you own a checking account?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "accounts.checking_balance", section: "accounts", label: "If so, how much is in this account?", control: "money", help: "Current balance in dollars.",
    source: { label: "If so, how much is in this account?", control: "text", requiredReported: null, note: "Browser report on the checking/savings combination was ambiguous." },
    product: { requirement: "conditional", conditionalOn: { key: "accounts.has_checking", equals: "yes" }, category: "unresolved", allowUnknown: true, note: "The source's combination matrix was not verified; this product asks for the balance of each account the applicant says they have." } },
  { key: "accounts.has_savings", section: "accounts", label: "Do you own a savings account?", control: "radio", options: YES_NO,
    source: { label: "Do you own a savings account?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "accounts.savings_balance", section: "accounts", label: "If so, how much is in this account?", control: "money", help: "Current balance in dollars.",
    source: { label: "If so, how much is in this account?", control: "text", requiredReported: null, note: "Browser report on the checking/savings combination was ambiguous." },
    product: { requirement: "conditional", conditionalOn: { key: "accounts.has_savings", equals: "yes" }, category: "unresolved", allowUnknown: true, note: "Asked for each account the applicant says they have." } },
  ...EXPENSE_CATEGORIES.map(([slug, label]): IntakeFieldSpec => ({
    key: `monthly_expenses.${slug}`, section: "expenses", label: label.replace(/:\s*\$$/, ""), control: "money", help: MONEY_HELP,
    source: { label, control: "text", requiredReported: true, note: "Source instructs applicants to enter $0 for categories that do not apply." },
    product: { requirement: "required", category: "observed", allowUnknown: true, note: "Reported expense; never deducted automatically from income." }
  })),
  { key: "matter_details", section: "legal_context", label: "Additional information regarding your legal matter:", control: "textarea",
    source: { label: "Additional information regarding your legal matter:", control: "textarea", requiredReported: false },
    product: { requirement: "optional", category: "observed", note: "Optional as in the source." } },
  { key: "has_open_mvlp_case", section: "legal_context", label: "Do you currently have a case open with MVLP?", control: "radio", options: YES_NO,
    source: { label: "Do you currently have a case open with MVLP?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "has_attorney", section: "legal_context", label: "Do you currently have an attorney?", control: "radio", options: YES_NO,
    source: { label: "Do you currently have an attorney?", control: "radio_group", requiredReported: true, options: ["Yes", "No"] },
    product: { requirement: "required", category: "observed", note: "Source choices preserved." } },
  { key: "referral_source", section: "legal_context", label: "How did you hear about the clinic?", control: "text",
    source: { label: "How did you hear about the clinic?", control: "text", requiredReported: false },
    product: { requirement: "optional", category: "observed", note: "Optional as in the source." } }
];

export type StatementKey = "financial_attestation" | "citizenship_attestation" | "noncitizen_review_acknowledgment" | "information_sharing_consent";

export type IntakeStatement = {
  key: StatementKey;
  version: string;
  title: string;
  text: string;
  appliesWhen: (answers: IntakeAnswers) => boolean;
  source: { observed: boolean; note: string };
  category: "observed" | "adaptation";
};

export const INTAKE_STATEMENTS: IntakeStatement[] = [
  {
    key: "financial_attestation", version: "mvlp-v1",
    title: "Financial statement",
    text: "I confirm that the financial information in this application and the facts I have given about my legal problem are true and accurate to the best of my knowledge.",
    appliesWhen: () => true,
    source: { observed: true, note: "The source has a financial statement with signature and date. Its exact wording was not captured; this is the product's plain-English statement of the same confirmation." },
    category: "adaptation"
  },
  {
    key: "citizenship_attestation", version: "mvlp-v1",
    title: "Citizenship statement",
    text: "I am a citizen of the United States of America.",
    appliesWhen: (answers) => answerValue(answers, "is_us_citizen") === "yes",
    source: { observed: true, note: "Verbatim source statement. The source displayed it even when the citizenship answer was No; this product shows it only to applicants who answered Yes." },
    category: "observed"
  },
  {
    key: "noncitizen_review_acknowledgment", version: "mvlp-v1",
    title: "Confidential status review",
    text: "I answered that I am not a U.S. citizen, or I am not sure. I understand that MVLP will review my status privately to decide whether it can help me, and that I am not being asked to sign a statement that I am a citizen.",
    appliesWhen: (answers) => answerValue(answers, "is_us_citizen") === "no",
    source: { observed: false, note: "Product adaptation: a person answering No is never asked to sign the citizenship statement; the answer is routed to confidential MVLP review." },
    category: "adaptation"
  },
  {
    key: "information_sharing_consent", version: "mvlp-v1",
    title: "Who may see this application",
    text: "I agree that MVLP staff and volunteer attorneys assigned to my clinic may review my application and documents to decide whether MVLP can help me and to prepare my documents. My answers are not shared with other participants, other organizations, or anyone who is not assigned to my clinic.",
    appliesWhen: () => true,
    source: { observed: false, note: "Product adaptation: an explicit, versioned consent for the assigned MVLP team." },
    category: "adaptation"
  }
];

export function answerValue(answers: IntakeAnswers, key: string): string | undefined {
  const answer = answers[key];
  if (!answer || answer.state !== "answered") return undefined;
  return Array.isArray(answer.value) ? answer.value.join(",") : answer.value;
}

export function fieldApplies(field: IntakeFieldSpec, answers: IntakeAnswers): boolean {
  if (field.product.requirement === "derived") return false;
  if (field.product.requirement !== "conditional" || !field.product.conditionalOn) return true;
  return answerValue(answers, field.product.conditionalOn.key) === field.product.conditionalOn.equals;
}

export function applicableStatements(answers: IntakeAnswers): IntakeStatement[] {
  return INTAKE_STATEMENTS.filter((statement) => statement.appliesWhen(answers));
}

export type IntakeValidation = {
  valid: boolean;
  errors: Record<string, string>;
  missingRequired: string[];
  unknownFields: string[];
  answeredCount: number;
  applicableCount: number;
};

const MONEY_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

/** Normalises a money entry ("$1,200.50" → "1200.50"); returns null when not a number. */
export function normalizeMoney(input: string): string | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!MONEY_PATTERN.test(cleaned)) return null;
  return cleaned;
}

/** Validates a full answer set for the current schema. Missing and unknown are distinct from an explicit zero. */
export function validateIntakeAnswers(answers: IntakeAnswers): IntakeValidation {
  const errors: Record<string, string> = {};
  const missingRequired: string[] = [];
  const unknownFields: string[] = [];
  let answeredCount = 0;
  let applicableCount = 0;

  for (const field of INTAKE_FIELDS) {
    if (!fieldApplies(field, answers)) continue;
    if (field.control === "restricted_ssn") continue; // stored and validated separately
    applicableCount += 1;
    const answer = answers[field.key];
    const required = field.product.requirement === "required" || field.product.requirement === "conditional";
    if (!answer) {
      if (required) missingRequired.push(field.key);
      continue;
    }
    if (answer.state === "unknown") {
      if (!field.product.allowUnknown) errors[field.key] = "Please answer this question.";
      else unknownFields.push(field.key);
      continue;
    }
    if (answer.state === "not_applicable") {
      if (required) errors[field.key] = "This question applies to you; please answer it.";
      continue;
    }
    const raw = Array.isArray(answer.value) ? answer.value.join(",") : answer.value ?? "";
    const value = raw.trim();
    if (value === "") {
      if (required) missingRequired.push(field.key);
      continue;
    }
    answeredCount += 1;
    switch (field.control) {
      case "money":
        if (normalizeMoney(value) === null) errors[field.key] = "Enter a dollar amount, such as 0 or 850.50.";
        break;
      case "count":
        if (!/^\d{1,3}$/.test(value)) errors[field.key] = "Enter a whole number, such as 0, 1, or 2.";
        break;
      case "date":
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) errors[field.key] = "Enter a date as year, month, and day.";
        else if (Date.parse(value) > Date.now()) errors[field.key] = "The date cannot be in the future.";
        break;
      case "phone":
        if (value.replace(/\D/g, "").length < 10) errors[field.key] = "Enter a phone number with area code.";
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) errors[field.key] = "Enter a valid email address.";
        break;
      case "radio":
      case "dropdown":
        if (field.options && !field.options.some((option) => option.value === value)) errors[field.key] = "Choose one of the listed options.";
        break;
      case "textarea":
        if (value.length > 4000) errors[field.key] = "Please shorten this to 4,000 characters.";
        break;
      default:
        if (value.length > 300) errors[field.key] = "Please shorten this answer.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0 && missingRequired.length === 0,
    errors,
    missingRequired,
    unknownFields,
    answeredCount,
    applicableCount
  };
}

/** Keeps only known schema keys and well-formed answers; anything else is dropped before persistence. */
export function sanitizeIntakeAnswers(input: unknown): IntakeAnswers {
  const known = new Set(INTAKE_FIELDS.filter((field) => field.control !== "restricted_ssn" && field.product.requirement !== "derived").map((field) => field.key));
  const output: IntakeAnswers = {};
  if (!input || typeof input !== "object") return output;
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!known.has(key) || !raw || typeof raw !== "object") continue;
    const state = (raw as { state?: unknown }).state;
    if (state !== "answered" && state !== "unknown" && state !== "not_applicable") continue;
    if (state !== "answered") { output[key] = { state }; continue; }
    const value = (raw as { value?: unknown }).value;
    if (typeof value === "string") output[key] = { state, value: value.slice(0, 4000) };
    else if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) output[key] = { state, value: value.map((entry) => entry.slice(0, 300)).slice(0, 20) };
  }
  return output;
}

/** Canonical JSON (sorted keys) so the answer hash is stable across clients. */
export function canonicalAnswersJson(answers: IntakeAnswers): string {
  const sorted: Record<string, IntakeAnswer> = {};
  for (const key of Object.keys(answers).sort()) {
    const answer = answers[key];
    sorted[key] = answer.state === "answered" ? { state: "answered", value: answer.value } : { state: answer.state };
  }
  return JSON.stringify(sorted);
}

export function fieldByKey(key: string): IntakeFieldSpec | undefined {
  return INTAKE_FIELDS.find((field) => field.key === key);
}

export const SSN_FIELD_KEY = "ssn";

/** A well-formed U.S. SSN: nine digits, valid area/group/serial. */
export function normalizeSsn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  const area = digits.slice(0, 3);
  const group = digits.slice(3, 5);
  const serial = digits.slice(5);
  if (area === "000" || area === "666" || area.startsWith("9") || group === "00" || serial === "0000") return null;
  return digits;
}
