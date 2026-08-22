import {
  nextActionOwnerLabel,
  sectionStatusLabel
} from "./partner-labels";
import { commercialState } from "./partner-copy";
import type {
  CommercialGateOutcome,
  OnboardingNextActionOwner,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OnboardingWorkspaceStatus
} from "./types";

// The two LegalEase-owned commercial states, authored by the copy contract and reused
// here so the milestone card cannot describe program terms differently from the
// Implementation Center or the section editor.
const COMMERCIAL_IN_PROGRESS = commercialState({ outcome: "legalease_owned" });
const COMMERCIAL_CONFIRMED = commercialState({ outcome: "cleared" });

export type PartnerImplementationTone =
  | "teal"
  | "navy"
  | "orange"
  | "slate";

export type PartnerImplementationFact = {
  key: string;
  label: string;
  description: string;
  tone: PartnerImplementationTone;
};

export type PartnerImplementationSectionInput = {
  key: OnboardingSectionKey;
  title: string;
  status: OnboardingSectionStatus;
  missingSummary: string | null;
  hasPendingPrefill: boolean;
  changeRequestStatus: "open" | "partner_responded" | null;
  submittedAt: string | null;
  approvedAt: string | null;
  updatedAt: string | null;
  resumeHref?: string;
  currentSubstepTitle?: string | null;
};

export type PartnerImplementationTeamMemberInput = {
  requestedRole: string;
  trainingStatus: "not_started" | "scheduled" | "in_progress" | "complete";
  trainingCompletedAt: string | null;
  invitationStatus: "not_invited" | "planned" | "released";
  membershipStatus: "planned" | "active" | "disabled";
  updatedAt: string;
};

export type PartnerImplementationReadinessInput = {
  ready: boolean;
  blockingFailures: number;
  primaryNextAction: {
    label: string;
    owner: "partner" | "legalease";
    action: string;
  } | null;
};

export type BuildPartnerImplementationPresentationInput = {
  workspaceStatus: OnboardingWorkspaceStatus;
  completionPercentage: number;
  commercialGateStatus: CommercialGateOutcome;
  commercialGateChangedAt: string | null;
  submittedAt: string | null;
  internalApprovedAt: string | null;
  launchedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  lastMeaningfulActivityAt: string | null;
  targetLaunchDate: string | null;
  blockerCopy: string;
  nextActionCopy: string;
  nextActionOwner: OnboardingNextActionOwner;
  defaultActionHref: string;
  defaultActionLabel: string;
  currentRole: "partner_admin" | "partner_staff";
  canEdit: boolean;
  sections: PartnerImplementationSectionInput[];
  teamMembers: PartnerImplementationTeamMemberInput[];
  readiness: PartnerImplementationReadinessInput | null;
  coBrandedPageArtifact: {
    available: boolean;
    approvalStatus: string | null;
    partnerReviewStatus: string | null;
    missingRequiredAssetCount?: number;
  } | null;
};

export type PartnerImplementationMilestone = {
  key:
    | "commercial_clearance"
    | "administrator_access"
    | "program_configuration"
    | "brand_participant_page"
    | "team_training"
    | "launch_readiness"
    | "go_live";
  title: string;
  description: string;
  state: PartnerImplementationFact;
  current: boolean;
  owner: string;
  dateLabel: "Completed" | "Submitted" | "Due date" | "Target date";
  date: string | null;
  dateFallback: string;
  blocker: string;
  nextAction: string;
  actionLabel: string;
  href: string;
};

export type PartnerImplementationPresentation = {
  overall: PartnerImplementationFact;
  setupInformation: PartnerImplementationFact;
  legalEaseReview: PartnerImplementationFact;
  launchReadiness: PartnerImplementationFact;
  publication: PartnerImplementationFact;
  programActivation: PartnerImplementationFact;
  dimensions: Array<{
    label: string;
    fact: PartnerImplementationFact;
  }>;
  targetLaunchDate: string | null;
  currentAction: {
    action: string;
    owner: string;
    dueDate: null;
    dueDateFallback: "Not scheduled";
    schedulingAction: string;
    whyItMatters: string;
    href: string;
    label: string;
  };
  milestones: PartnerImplementationMilestone[];
  configuration: {
    completionPercentage: number;
    unresolvedChangeRequests: number;
    lastMeaningfulActivityAt: string | null;
    sections: Array<{
      key: OnboardingSectionKey;
      title: string;
      state: PartnerImplementationFact;
      summary: string;
      changeRequest: string | null;
      lastStateLabel: string;
      lastStateAt: string | null;
      href: string;
      actionLabel: string;
      currentSubstepTitle: string | null;
    }>;
  };
  schedule: Array<{
    key:
      | "kickoff"
      | "administrator_orientation"
      | "team_training"
      | "leadership_review"
      | "rehearsal"
      | "launch";
    label: string;
    date: string | null;
    dateFallback: "Not scheduled";
    schedulingAction: string;
  }>;
};

/**
 * The one partner-facing implementation contract.
 *
 * It translates authoritative onboarding, readiness, artifact, and lifecycle
 * fields into a commercial implementation story. React receives this contract
 * and never formats a database enum or decides whether a gate passed.
 */
export function buildPartnerImplementationPresentation(
  input: BuildPartnerImplementationPresentationInput
): PartnerImplementationPresentation {
  const completion = clampPercentage(input.completionPercentage);
  const openChangeRequests = input.sections.filter(
    (section) => section.changeRequestStatus === "open"
  ).length;
  const respondedChangeRequests = input.sections.filter(
    (section) => section.changeRequestStatus === "partner_responded"
  ).length;
  const terminal = input.workspaceStatus === "paused" || input.workspaceStatus === "closed";

  const setupInformation: PartnerImplementationFact = terminal
    ? {
        key: "recorded",
        label: `${completion}% recorded`,
        description: "Setup information remains on file for this program.",
        tone: "slate"
      }
    : {
        key: completion === 100 ? "complete" : "in_progress",
        label: `${completion}% complete`,
        description: "This percentage measures setup information only.",
        tone: completion === 100 ? "teal" : "navy"
      };

  const legalEaseReview = reviewFact(input, openChangeRequests, respondedChangeRequests);
  const launchReadiness = readinessFact(input, openChangeRequests);
  const publication: PartnerImplementationFact = {
    key: "private",
    label: "Private",
    description: "The authorized participant-page preview is not published.",
    tone: "slate"
  };
  const programActivation = activationFact(input);
  const overall = overallFact(input, legalEaseReview, launchReadiness);
  const currentAction = currentActionFor(input, overall);
  const currentMilestone = currentMilestoneKey(
    input,
    legalEaseReview,
    launchReadiness
  );
  const administrator = input.teamMembers.find(
    (member) => member.requestedRole === "partner_administrator"
  );
  const administratorActive =
    input.currentRole === "partner_admin" || administrator?.membershipStatus === "active";
  const training = trainingFact(input.teamMembers);
  const brandSection = input.sections.find(
    (section) => section.key === "brand_public_page"
  );
  const brandArtifactApproved =
    input.coBrandedPageArtifact?.available === true &&
    input.coBrandedPageArtifact.approvalStatus === "approved" &&
    input.coBrandedPageArtifact.partnerReviewStatus === "approved";

  const milestoneSeed: Array<
    Omit<PartnerImplementationMilestone, "current" | "owner">
  > = [
    {
      key: "commercial_clearance",
      title: "Program terms",
      description: "Billing, procurement, and agreement details for your program.",
      state:
        input.commercialGateStatus === "blocked"
          ? fact("blocked", "In progress", `${COMMERCIAL_IN_PROGRESS.heading}.`, "orange")
          : fact("cleared", "Confirmed", `${COMMERCIAL_CONFIRMED.heading}.`, "teal"),
      dateLabel: input.commercialGateStatus === "blocked" ? "Due date" : "Completed",
      date: input.commercialGateStatus === "blocked" ? null : input.commercialGateChangedAt,
      dateFallback:
        input.commercialGateStatus === "blocked" ? "Not scheduled" : "Date not recorded",
      blocker:
        input.commercialGateStatus === "blocked"
          ? input.blockerCopy
          : `${COMMERCIAL_CONFIRMED.heading}.`,
      nextAction:
        input.commercialGateStatus === "blocked"
          ? input.nextActionCopy
          : COMMERCIAL_CONFIRMED.explanation,
      actionLabel: "View program terms",
      href: "#commercial-support"
    },
    {
      key: "administrator_access",
      title: "Administrator access",
      description: "A partner administrator can manage implementation decisions.",
      state: administratorActive
        ? fact("active", "Access active", "Administrator access is active for this session.", "teal")
        : administrator?.invitationStatus === "released"
          ? fact("invited", "Invitation released", "Administrator activation has not been confirmed.", "navy")
          : fact("planned", "Access planned", "Administrator activation has not been confirmed.", "slate"),
      dateLabel: administratorActive ? "Completed" : "Due date",
      date:
        administrator?.membershipStatus === "active" ? administrator.updatedAt : null,
      dateFallback: administratorActive ? "Date not recorded" : "Not scheduled",
      blocker: administratorActive
        ? "Administrator access is confirmed."
        : "Administrator access isn't confirmed yet.",
      nextAction: administratorActive
        ? "Review team access when roles change."
        : "Ask LegalEase to confirm administrator access.",
      actionLabel: "Open team access",
      href: "/partner/team"
    },
    {
      key: "program_configuration",
      title: "Program configuration",
      description: "The eight setup sections and LegalEase review belong here.",
      state:
        openChangeRequests > 0
          ? fact("changes_requested", "Changes requested", "LegalEase needs a specific correction.", "orange")
          : legalEaseReview.key === "approved"
            ? fact("approved", "Approved", "LegalEase approved the submitted configuration.", "teal")
            : legalEaseReview.key === "in_review"
              ? fact("in_review", "In review", "LegalEase is reviewing the submitted configuration.", "navy")
              : completion === 100
                ? fact("ready_to_submit", "Ready to submit", "All required setup information is entered.", "navy")
                : fact("in_progress", "In progress", `${completion}% of setup information is entered.`, "navy"),
      dateLabel: input.internalApprovedAt
        ? "Completed"
        : input.submittedAt
          ? "Submitted"
          : "Due date",
      date: input.internalApprovedAt ?? input.submittedAt,
      dateFallback:
        input.internalApprovedAt || input.submittedAt
          ? "Date not recorded"
          : "Not scheduled",
      blocker:
        openChangeRequests > 0
          ? `${openChangeRequests} LegalEase change request${openChangeRequests === 1 ? " is" : "s are"} waiting on your reply.`
          : completion < 100
            ? input.blockerCopy
            // "Recorded" rather than "complete": this line is also read on a paused or
            // closed program, where claiming completion would overstate where things stand.
            : "Your setup information is recorded.",
      nextAction:
        currentMilestone === "program_configuration"
          ? currentAction.action
          : "Review the configuration and its decision history.",
      actionLabel: input.canEdit ? "Open configuration" : "Review configuration",
      href: input.defaultActionHref
    },
    {
      key: "brand_participant_page",
      title: "Brand and participant page",
      description: [
        brandSection?.currentSubstepTitle
          ? `Current editor task: ${brandSection.currentSubstepTitle}.`
          : "Brand inputs and the authorized private participant-page preview.",
        `Required assets missing: ${input.coBrandedPageArtifact?.missingRequiredAssetCount ?? 1}.`,
        `Partner factual and brand approval: ${artifactApprovalLabel(
          input.coBrandedPageArtifact?.partnerReviewStatus
        )}.`,
        `LegalEase approval: ${artifactApprovalLabel(
          input.coBrandedPageArtifact?.approvalStatus
        )}.`,
        "Publication: Private. Program activation: Inactive."
      ].join(" "),
      state: brandArtifactApproved
        ? fact("private_preview", "Private preview approved", "The preview is approved but remains private.", "teal")
        : brandSection
          ? sectionFact(brandSection.status, brandSection.hasPendingPrefill)
          : fact("not_started", "Not started", "Brand information has not been entered.", "slate"),
      dateLabel: brandSection?.approvedAt ? "Completed" : "Due date",
      date: brandSection?.approvedAt ?? null,
      dateFallback: brandSection?.approvedAt ? "Date not recorded" : "Not scheduled",
      blocker:
        (input.coBrandedPageArtifact?.missingRequiredAssetCount ?? 1) > 0
          ? `${input.coBrandedPageArtifact?.missingRequiredAssetCount ?? 1} brand asset still needs to be added.`
          : brandArtifactApproved
            ? "Brand content is approved. Publication and activation remain separate decisions."
            : "Brand content is waiting on review.",
      nextAction: brandSection?.currentSubstepTitle
        ? `Continue ${brandSection.currentSubstepTitle}.`
        : "Review brand inputs and the private preview configuration.",
      actionLabel: "Open brand workspace",
      href: brandSection?.resumeHref ?? "/partner/onboarding/brand_public_page"
    },
    {
      key: "team_training",
      title: "Team and training",
      description: "Dashboard roles, staff preparation, and training confirmation.",
      state: training,
      dateLabel: training.key === "complete" ? "Completed" : "Due date",
      date: latestTrainingCompletion(input.teamMembers),
      dateFallback: training.key === "complete" ? "Date not recorded" : "Not scheduled",
      blocker:
        training.key === "complete"
          ? "Team training is complete."
          : "A team training date isn't scheduled yet.",
      nextAction:
        training.key === "complete"
          ? "Review staff access as team responsibilities change."
          : "Confirm the team roster, then ask LegalEase to schedule training.",
      actionLabel: "Open team plan",
      href: "/partner/onboarding/staff_dashboard_plan"
    },
    {
      key: "launch_readiness",
      title: "Launch readiness",
      description: "Operational checks and approvals required before go-live.",
      state: launchReadiness,
      dateLabel: launchReadiness.key === "ready" ? "Completed" : "Due date",
      date: null,
      dateFallback: launchReadiness.key === "ready" ? "Date not recorded" : "Not scheduled",
      blocker:
        input.readiness && input.readiness.blockingFailures > 0
          ? `${input.readiness.blockingFailures} launch readiness ${input.readiness.blockingFailures === 1 ? "check is" : "checks are"} blocking go-live.`
          : launchReadiness.description,
      nextAction:
        legalEaseReviewAction(legalEaseReview, input.readiness?.primaryNextAction?.action) ??
        (launchReadiness.key === "ready"
          ? "Review the go-live decision."
          : "LegalEase will complete the remaining launch readiness review."),
      actionLabel: "Open launch readiness",
      href: "/partner/onboarding/resources"
    },
    {
      key: "go_live",
      title: "Go-live",
      description: "Participant intake activation after every launch gate passes.",
      state: programActivation,
      dateLabel:
        programActivation.key === "live" ||
        programActivation.key === "paused" ||
        programActivation.key === "closed"
          ? "Completed"
          : "Target date",
      date:
        input.closedAt ??
        input.pausedAt ??
        input.launchedAt ??
        input.targetLaunchDate,
      dateFallback: input.targetLaunchDate ? "Date not recorded" : "Not scheduled",
      blocker:
        programActivation.key === "inactive"
          ? "Participant intake is inactive."
          : programActivation.description,
      nextAction:
        programActivation.key === "inactive"
          ? input.targetLaunchDate
            ? "Complete launch readiness before the target date."
            : "Set a target launch date after readiness review."
          : "Review current program operations in the dashboard.",
      actionLabel: "Open implementation materials",
      href: "/partner/onboarding/artifacts"
    }
  ];

  const milestones = milestoneSeed.map((milestone) => {
    const current = milestone.key === currentMilestone;
    return {
      ...milestone,
      current,
      owner: current
        ? currentAction.owner
        : milestone.state.key === "cleared" ||
            milestone.state.key === "active" ||
            milestone.state.key === "approved" ||
            milestone.state.key === "complete" ||
            milestone.state.key === "ready" ||
            milestone.state.key === "live"
          ? nextActionOwnerLabel("none")
          : "Not assigned"
    };
  });

  const configurationSections = input.sections.map((section) => {
    const lastState = section.approvedAt
      ? { label: "Approved", at: section.approvedAt }
      : section.submittedAt
        ? { label: "Submitted", at: section.submittedAt }
        : section.updatedAt
          ? { label: "Last saved", at: section.updatedAt }
          : { label: "No saved date recorded", at: null };
    return {
      key: section.key,
      title: section.title,
      state: sectionFact(section.status, section.hasPendingPrefill),
      summary: section.missingSummary ?? fallbackSectionSummary(section.status),
      changeRequest:
        section.changeRequestStatus === "open"
          ? "LegalEase requested a correction in this section."
          : section.changeRequestStatus === "partner_responded"
            ? "Your response is awaiting LegalEase review."
            : null,
      lastStateLabel: lastState.label,
      lastStateAt: lastState.at,
      href:
        section.resumeHref ??
        `/partner/onboarding/${encodeURIComponent(section.key)}`,
      actionLabel:
        section.changeRequestStatus === "open"
          ? "Review correction"
          : input.canEdit
            ? "Continue task"
            : "Review section",
      currentSubstepTitle: section.currentSubstepTitle ?? null
    };
  });

  return {
    overall,
    setupInformation,
    legalEaseReview,
    launchReadiness,
    publication,
    programActivation,
    dimensions: [
      { label: "Setup information", fact: setupInformation },
      { label: "LegalEase review", fact: legalEaseReview },
      { label: "Launch readiness", fact: launchReadiness },
      { label: "Publication", fact: publication },
      { label: "Program activation", fact: programActivation }
    ],
    targetLaunchDate: input.targetLaunchDate,
    currentAction,
    milestones,
    configuration: {
      completionPercentage: completion,
      unresolvedChangeRequests: openChangeRequests,
      lastMeaningfulActivityAt: input.lastMeaningfulActivityAt,
      sections: configurationSections
    },
    schedule: [
      scheduleItem("kickoff", "Kickoff", null, "Ask LegalEase to schedule the implementation kickoff."),
      scheduleItem(
        "administrator_orientation",
        "Administrator orientation",
        null,
        "Confirm an orientation date with LegalEase after administrator access is active."
      ),
      scheduleItem(
        "team_training",
        "Team training",
        null,
        "Confirm the team roster, then ask LegalEase to schedule training."
      ),
      scheduleItem(
        "leadership_review",
        "Leadership review",
        null,
        "Schedule leadership review after LegalEase completes configuration review."
      ),
      scheduleItem(
        "rehearsal",
        "Rehearsal",
        null,
        "Schedule a rehearsal after the launch readiness checks are clear."
      ),
      scheduleItem(
        "launch",
        "Launch",
        input.targetLaunchDate,
        "Set a target launch date with LegalEase after readiness review."
      )
    ]
  };
}

function reviewFact(
  input: BuildPartnerImplementationPresentationInput,
  openChangeRequests: number,
  respondedChangeRequests: number
): PartnerImplementationFact {
  if (openChangeRequests > 0 || input.workspaceStatus === "waiting_on_partner") {
    return fact(
      "changes_requested",
      "Changes requested",
      "LegalEase is waiting for a specific partner correction.",
      "orange"
    );
  }
  if (
    input.internalApprovedAt ||
    ["ready_to_launch", "live", "paused", "closed"].includes(input.workspaceStatus)
  ) {
    return fact(
      "approved",
      "Approved",
      "LegalEase approved the submitted setup information.",
      "teal"
    );
  }
  if (
    input.submittedAt ||
    input.workspaceStatus === "ready_for_review" ||
    respondedChangeRequests > 0
  ) {
    return fact(
      "in_review",
      "In progress",
      "LegalEase is reviewing the submitted setup information.",
      "navy"
    );
  }
  return fact(
    "not_submitted",
    "Not submitted",
    "The setup package has not been submitted for LegalEase review.",
    "slate"
  );
}

function readinessFact(
  input: BuildPartnerImplementationPresentationInput,
  openChangeRequests: number
): PartnerImplementationFact {
  if (input.readiness?.ready || input.workspaceStatus === "live") {
    return fact("ready", "Ready", "All current launch readiness gates pass.", "teal");
  }
  if (input.commercialGateStatus === "blocked" || openChangeRequests > 0) {
    return fact(
      "blocked",
      "Blocked",
      "A required implementation gate is blocking launch readiness.",
      "orange"
    );
  }
  if (
    input.workspaceStatus === "draft" &&
    clampPercentage(input.completionPercentage) === 0
  ) {
    return fact(
      "not_started",
      "Not started",
      "Launch readiness begins after program configuration starts.",
      "slate"
    );
  }
  if (
    input.workspaceStatus === "ready_for_review" ||
    input.workspaceStatus === "ready_to_launch" ||
    input.readiness
  ) {
    return fact(
      "not_ready",
      "Not ready",
      "One or more launch readiness gates still need attention.",
      "navy"
    );
  }
  return fact(
    "in_progress",
    "In progress",
    "Launch readiness work follows the current configuration step.",
    "navy"
  );
}

function activationFact(
  input: BuildPartnerImplementationPresentationInput
): PartnerImplementationFact {
  if (input.workspaceStatus === "closed" || input.closedAt) {
    return fact("closed", "Closed", "Participant intake is closed.", "slate");
  }
  if (input.workspaceStatus === "paused" || input.pausedAt) {
    return fact("paused", "Paused", "Participant intake is paused.", "orange");
  }
  if (input.workspaceStatus === "live" && input.launchedAt) {
    return fact("live", "Live", "Participant intake is active.", "teal");
  }
  return fact("inactive", "Inactive", "Participant intake is not active.", "slate");
}

function overallFact(
  input: BuildPartnerImplementationPresentationInput,
  review: PartnerImplementationFact,
  readiness: PartnerImplementationFact
): PartnerImplementationFact {
  if (input.workspaceStatus === "closed") {
    return fact("closed", "Program closed", "Implementation activity has ended.", "slate");
  }
  if (input.workspaceStatus === "paused") {
    return fact("paused", "Program paused", "Implementation activity is paused.", "orange");
  }
  if (input.workspaceStatus === "live") {
    return fact("live", "Program live", "Participant intake is active.", "teal");
  }
  if (input.commercialGateStatus === "blocked") {
    // The gate's own vocabulary is internal. What a program director needs here is who
    // owns the remaining step, which the copy contract answers for every surface.
    return fact(
      "commercial_action",
      "Program terms in progress",
      COMMERCIAL_IN_PROGRESS.explanation,
      "orange"
    );
  }
  if (review.key === "changes_requested") {
    return fact(
      "partner_action",
      "Partner changes requested",
      "LegalEase needs a specific correction before review continues.",
      "orange"
    );
  }
  if (review.key === "in_review") {
    return fact(
      "review_in_progress",
      "LegalEase review in progress",
      "Setup information is submitted and launch gates remain separate.",
      "navy"
    );
  }
  if (readiness.key === "ready") {
    return fact(
      "ready_for_go_live",
      "Ready for go-live",
      "Readiness gates pass, but participant intake is not active yet.",
      "teal"
    );
  }
  if (input.workspaceStatus === "ready_to_launch") {
    return fact(
      "launch_preparation",
      "Launch preparation in progress",
      "LegalEase approval is recorded and readiness work remains.",
      "navy"
    );
  }
  return fact(
    "implementation_in_progress",
    "Implementation in progress",
    "The current action below moves implementation forward.",
    "navy"
  );
}

function currentActionFor(
  input: BuildPartnerImplementationPresentationInput,
  overall: PartnerImplementationFact
): PartnerImplementationPresentation["currentAction"] {
  if (
    input.workspaceStatus === "ready_to_launch" &&
    !input.readiness?.ready &&
    input.readiness?.primaryNextAction
  ) {
    return {
      action: input.readiness.primaryNextAction.action,
      owner: nextActionOwnerLabel(input.readiness.primaryNextAction.owner),
      dueDate: null,
      dueDateFallback: "Not scheduled",
      schedulingAction: "Ask LegalEase to confirm the due date for this readiness action.",
      whyItMatters: "This is the next unmet launch readiness check.",
      href: "/partner/onboarding/resources",
      label: "Open launch readiness"
    };
  }
  if (input.workspaceStatus === "live") {
    return {
      action: "Review current program operations and participant activity.",
      owner: nextActionOwnerLabel("none"),
      dueDate: null,
      dueDateFallback: "Not scheduled",
      schedulingAction: "No implementation due date is required while the program is live.",
      whyItMatters: "The dashboard is the source for current program operations.",
      href: "/partner/dashboard",
      label: "Open program dashboard"
    };
  }
  if (input.workspaceStatus === "paused" || input.workspaceStatus === "closed") {
    return {
      action: "Review the program record and contact LegalEase with questions.",
      owner: nextActionOwnerLabel("none"),
      dueDate: null,
      dueDateFallback: "Not scheduled",
      schedulingAction: "No implementation due date is scheduled for this program state.",
      whyItMatters: overall.description,
      href: "/partner/dashboard",
      label: "Open program dashboard"
    };
  }
  return {
    action: input.nextActionCopy,
    owner: nextActionOwnerLabel(input.nextActionOwner),
    dueDate: null,
    dueDateFallback: "Not scheduled",
    schedulingAction: "Ask LegalEase to confirm the due date for this action.",
    whyItMatters: whyCurrentActionMatters(input.workspaceStatus),
    href: input.defaultActionHref,
    label: input.defaultActionLabel
  };
}

function currentMilestoneKey(
  input: BuildPartnerImplementationPresentationInput,
  review: PartnerImplementationFact,
  readiness: PartnerImplementationFact
): PartnerImplementationMilestone["key"] {
  if (input.commercialGateStatus === "blocked") return "commercial_clearance";
  const administrator = input.teamMembers.find(
    (member) => member.requestedRole === "partner_administrator"
  );
  if (
    input.currentRole !== "partner_admin" &&
    administrator?.membershipStatus !== "active"
  ) {
    return "administrator_access";
  }
  if (
    clampPercentage(input.completionPercentage) < 100 ||
    review.key === "changes_requested" ||
    review.key === "in_review" ||
    review.key === "not_submitted"
  ) {
    return "program_configuration";
  }
  const training = trainingFact(input.teamMembers);
  if (training.key !== "complete") return "team_training";
  if (readiness.key !== "ready") return "launch_readiness";
  return "go_live";
}

function trainingFact(
  teamMembers: PartnerImplementationTeamMemberInput[]
): PartnerImplementationFact {
  const attendees = teamMembers.filter(
    (member) => member.requestedRole !== "reporting_viewer"
  );
  if (attendees.length > 0 && attendees.every((member) => member.trainingStatus === "complete")) {
    return fact("complete", "Training complete", "Training completion is recorded for the team.", "teal");
  }
  if (attendees.some((member) => member.trainingStatus === "in_progress")) {
    return fact("in_progress", "In progress", "Team training is underway.", "navy");
  }
  if (attendees.some((member) => member.trainingStatus === "scheduled")) {
    return fact("scheduled", "Scheduled", "LegalEase recorded scheduled team training.", "navy");
  }
  return fact("not_scheduled", "Not scheduled", "A team training date is not recorded.", "slate");
}

function latestTrainingCompletion(
  teamMembers: PartnerImplementationTeamMemberInput[]
): string | null {
  const dates = teamMembers
    .map((member) => member.trainingCompletedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates.at(-1) ?? null;
}

function sectionFact(
  status: OnboardingSectionStatus,
  hasPendingPrefill: boolean
): PartnerImplementationFact {
  if (hasPendingPrefill) {
    return fact(
      "prefill_review",
      "Pre-filled, review needed",
      "LegalEase pre-filled information that needs partner review.",
      "orange"
    );
  }
  const descriptions: Record<OnboardingSectionStatus, string> = {
    not_started: "This section has not been started.",
    in_progress: "Work is saved in this section.",
    submitted: "This section is submitted for LegalEase review.",
    needs_changes: "LegalEase requested a correction in this section.",
    approved: "LegalEase approved this section.",
    waived: "LegalEase waived this section requirement.",
    not_applicable: "This section does not apply to the program."
  };
  const tones: Record<OnboardingSectionStatus, PartnerImplementationTone> = {
    not_started: "slate",
    in_progress: "navy",
    submitted: "navy",
    needs_changes: "orange",
    approved: "teal",
    waived: "teal",
    not_applicable: "slate"
  };
  return fact(status, sectionStatusLabel(status), descriptions[status], tones[status]);
}

function fallbackSectionSummary(status: OnboardingSectionStatus): string {
  if (["approved", "waived", "not_applicable"].includes(status)) {
    return "No partner action is needed.";
  }
  return "Open this section to review its requirements.";
}

function whyCurrentActionMatters(status: OnboardingWorkspaceStatus): string {
  const copy: Record<OnboardingWorkspaceStatus, string> = {
    draft: "This starts the implementation record.",
    commercially_blocked: "LegalEase is finalizing your program terms before configuration continues.",
    setup_in_progress: "The setup package must be complete before LegalEase can review it.",
    waiting_on_partner: "LegalEase cannot continue review until the requested correction is submitted.",
    ready_for_review: "LegalEase review is required before launch preparation can proceed.",
    ready_to_launch: "Launch readiness remains separate from setup approval.",
    live: "The dashboard is the source for active program operations.",
    paused: "The program record explains the current inactive state.",
    closed: "The program record preserves the completed history."
  };
  return copy[status];
}

function legalEaseReviewAction(
  review: PartnerImplementationFact,
  readinessAction: string | undefined
): string | null {
  if (review.key === "in_review") {
    return "LegalEase must complete configuration review before readiness work continues.";
  }
  if (review.key === "changes_requested") {
    return "Submit the requested configuration correction before readiness work continues.";
  }
  return readinessAction ?? null;
}

function scheduleItem(
  key: PartnerImplementationPresentation["schedule"][number]["key"],
  label: string,
  date: string | null,
  schedulingAction: string
): PartnerImplementationPresentation["schedule"][number] {
  return { key, label, date, dateFallback: "Not scheduled", schedulingAction };
}

function artifactApprovalLabel(status: string | null | undefined) {
  if (status === "approved") return "Approved";
  if (status === "changes_requested" || status === "rejected") {
    return "Changes requested";
  }
  return "Not reviewed";
}

function fact(
  key: string,
  label: string,
  description: string,
  tone: PartnerImplementationTone
): PartnerImplementationFact {
  return { key, label, description, tone };
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}
