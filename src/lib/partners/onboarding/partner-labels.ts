// The single partner-facing vocabulary for onboarding status values.
//
// Every partner-visible surface reads its status wording from here: the onboarding home,
// the section editor, the review page, and the dashboard program-setup card. Before this
// module the same maps were copied across those four files and one copy had drifted into a
// mechanical underscore-to-Title-Case transform, so the identical section status read
// "Not started" in one place and "Not Started" in another.
//
// These are display strings only. Nothing here participates in a decision — status
// evaluation stays in the service and derivation layers.

import type {
  OnboardingAgreementStatus,
  OnboardingSectionStatus,
  OnboardingWorkspaceStatus
} from "./types";

const WORKSPACE_STATUS_LABELS: Record<OnboardingWorkspaceStatus, string> = {
  draft: "Draft",
  commercially_blocked: "Commercial step required",
  setup_in_progress: "Setup in progress",
  waiting_on_partner: "Updates requested",
  ready_for_review: "Awaiting LegalEase review",
  ready_to_launch: "Ready for launch preparation",
  live: "Live",
  paused: "Paused",
  closed: "Closed"
};

const SECTION_STATUS_LABELS: Record<OnboardingSectionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  needs_changes: "LegalEase requested changes",
  approved: "Approved",
  waived: "Waived",
  not_applicable: "Not applicable"
};

// Agreement wording says who owes the next step. "Requested" and "Under review" on their
// own leave the partner unable to answer "who owns the next action", which every screen
// is required to answer without a phone call.
const AGREEMENT_STATUS_LABELS: Record<OnboardingAgreementStatus, string> = {
  not_required: "Not required",
  not_started: "Not started",
  requested: "Waiting on your organization",
  under_review: "Waiting on LegalEase",
  finalized: "Finalized",
  executed: "Executed",
  approved: "Approved",
  waived: "Waived"
};

const OWNER_LABELS: Record<"partner" | "legalease" | "none", string> = {
  partner: "Your organization",
  legalease: "LegalEase",
  none: "No action needed"
};

// Unknown values fall back to a neutral, partner-safe phrase rather than to a prettified
// enum. A status added to the database without being added here must never reach a partner
// as machine vocabulary.
export function workspaceStatusLabel(status: string): string {
  return WORKSPACE_STATUS_LABELS[status as OnboardingWorkspaceStatus] ?? "Program setup";
}

export function sectionStatusLabel(status: string): string {
  return SECTION_STATUS_LABELS[status as OnboardingSectionStatus] ?? "Pending";
}

export function agreementStatusLabel(status: string): string {
  return AGREEMENT_STATUS_LABELS[status as OnboardingAgreementStatus] ?? "Pending";
}

export function nextActionOwnerLabel(owner: "partner" | "legalease" | "none"): string {
  return OWNER_LABELS[owner] ?? OWNER_LABELS.none;
}

// Copy for the dashboard program-setup card once launch work is no longer the dominant
// story. All four statuses share the compact layout, but they are four different facts: a
// closed program has not "completed setup", and a paused one is owed a reason.
export function setupHistoryHeading(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paused") return "Your program is paused";
  if (normalized === "closed") return "Your program is closed";
  return "Your setup history";
}

export function setupHistoryBody(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paused") {
    return "Your program is paused, so nothing new is being processed. Your setup information is unchanged and remains available. LegalEase will contact you about resuming.";
  }
  if (normalized === "closed") {
    return "Your program is closed. Your setup information and approved documents remain available here as a record.";
  }
  if (normalized === "ready_to_launch") {
    return "Your setup is complete and approved. Launch preparation is underway; anything still outstanding is shown on the program setup page.";
  }
  return "Your program setup is complete. The workspace remains available as a record of approved configuration.";
}

export function agreementTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    order_form: "Order Form",
    master_services_agreement: "Master Services Agreement",
    data_privacy_security_addendum: "Data / Privacy / Security Addendum",
    procurement_requirements: "Procurement requirements"
  };
  return labels[type] ?? "Agreement";
}

const ONBOARDING_OPTION_LABELS: Readonly<Record<string, string>> = {
  nonprofit: "Nonprofit",
  government: "Government",
  legal_services: "Legal services",
  workforce: "Workforce organization",
  faith_based: "Faith-based organization",
  other: "Other",
  executive_sponsor: "Executive sponsor",
  program_operator: "Program operator",
  communications_lead: "Communications lead",
  reporting_evaluation_lead: "Reporting and evaluation lead",
  legal_services_referral_contact: "Legal services referral contact",
  finance_procurement_contact: "Finance and procurement contact",
  technical_security_contact: "Technical and security contact",
  media_contact: "Media contact",
  year_round: "Year-round",
  clinic: "Clinic",
  event: "Event",
  campaign: "Campaign",
  referral_only: "Referral only",
  cohort: "Cohort",
  allowed: "Allowed",
  redirected: "Redirected",
  case_by_case: "Case by case",
  open: "Open access",
  optional_code: "Optional access code",
  required_code: "Required access code",
  invite_only: "Invitation only",
  shared: "Shared code",
  limited_use: "Limited-use codes",
  single_use: "Single-use codes",
  mixed: "Mixed code structure",
  partner_administrator: "Partner administrator",
  program_staff: "Program staff",
  reporting_viewer: "Reporting viewer",
  manage_codes: "Manage access codes",
  view_reports: "View reports",
  export_reports: "Export reports",
  manage_users: "Manage users",
  technology_access: "Technology access",
  documentation: "Documentation",
  transportation: "Transportation",
  language: "Language",
  community_trust: "Community trust",
  legal_referral_capacity: "Legal referral capacity",
  private: "Private",
  pending_review: "Pending review",
  approved_for_use: "Approved for use",
  rejected: "Needs replacement",
  superseded: "Replaced",
  active: "Active"
};

/**
 * Curated partner copy for stored option values. Unknown values remain neutral
 * instead of exposing an enum or mechanically generated Title Case.
 */
export function onboardingOptionLabel(value: string): string {
  return ONBOARDING_OPTION_LABELS[value] ?? "Recorded option";
}
