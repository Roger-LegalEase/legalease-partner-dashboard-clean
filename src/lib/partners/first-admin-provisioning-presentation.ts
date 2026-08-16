import type { FirstAdminAccessView } from "./first-admin-service";
import type { OnboardingWorkspaceStatus } from "./onboarding/types";
import type { PartnerProvisioningStatus } from "./types";

export type FirstAdminProvisioningPresentationInput = {
  access: FirstAdminAccessView;
  jurisdiction: string;
  selectedPackage: string;
  workspaceStatus?: OnboardingWorkspaceStatus;
  completionPercentage?: number;
  provisioningStatus?: PartnerProvisioningStatus;
  owner?: string;
  dueDate?: string;
  onboardingHref: string;
};

export function buildFirstAdminProvisioningPresentation(
  input: FirstAdminProvisioningPresentationInput
) {
  const access = accessFact(input.access.accessStatus);
  const configuration = configurationFact(
    input.workspaceStatus,
    input.completionPercentage
  );
  const publication = {
    label: "Private",
    description: "The participant-facing program page is not published."
  };
  const activation = activationFact(
    input.workspaceStatus,
    input.provisioningStatus
  );
  const missingInformation = [
    input.jurisdiction === "Not recorded"
      ? "Jurisdiction is not recorded. The partner administrator must provide it in Program configuration before LegalEase can confirm jurisdiction-specific scope. Open the onboarding workspace to request or record it."
      : null,
    input.selectedPackage === "Not selected"
      ? "A program package has not been selected. The LegalEase program owner must confirm the commercial scope before configuration can be approved. Open the onboarding workspace to record the decision."
      : null
  ].filter((value): value is string => Boolean(value));

  return {
    access,
    account: input.access.administrator ? "Active" : "Not established",
    membership: input.access.administrator ? "Active" : "Not established",
    configuration,
    publication,
    activation,
    nextAction: nextActionFor(
      input.access.accessStatus,
      input.workspaceStatus
    ),
    owner: input.owner?.trim() || "LegalEase implementation team",
    dueDate: readableDate(input.dueDate),
    primaryAction: {
      label: "Open onboarding workspace",
      href: input.onboardingHref
    },
    missingInformation
  };
}

function accessFact(status: FirstAdminAccessView["accessStatus"]) {
  const facts: Record<FirstAdminAccessView["accessStatus"], { label: string; description: string }> = {
    no_administrator: {
      label: "Not configured",
      description: "No administrator invitation or active membership exists."
    },
    invitation_pending: {
      label: "Pending",
      description: "The invitation is active, but account setup and membership creation have not finished."
    },
    administrator_active: {
      label: "Active",
      description: "The administrator account and partner membership are active. This does not approve configuration, publication, activation, or launch."
    },
    invitation_expired: {
      label: "Expired",
      description: "The setup deadline passed. The link cannot create administrator access."
    },
    invitation_revoked: {
      label: "Revoked",
      description: "LegalEase withdrew the invitation. The link cannot create administrator access."
    },
    access_needs_attention: {
      label: "Needs attention",
      description: "The access record is inconsistent or incomplete and requires LegalEase review."
    }
  };
  return facts[status];
}

function configurationFact(
  status?: OnboardingWorkspaceStatus,
  completionPercentage = 0
) {
  const facts: Record<
    OnboardingWorkspaceStatus,
    { label: string; description: string }
  > = {
    draft: {
      label: "Not started",
      description: "Program setup information has not been entered."
    },
    commercially_blocked: {
      label: "Waiting on LegalEase",
      description: "Commercial clearance must be recorded before setup can continue."
    },
    setup_in_progress: {
      label: completionPercentage > 0 ? "In progress" : "Not started",
      description:
        completionPercentage > 0
          ? `${Math.round(completionPercentage)}% of program setup information is recorded.`
          : "Program setup information has not been entered."
    },
    waiting_on_partner: {
      label: "Changes requested",
      description: "LegalEase requested updates to the submitted setup information."
    },
    ready_for_review: {
      label: "Submitted",
      description: "The partner submitted setup information for LegalEase review."
    },
    ready_to_launch: {
      label: "Approved",
      description: "LegalEase approved the recorded program setup information."
    },
    live: {
      label: "Approved",
      description: "LegalEase approved the recorded program setup information."
    },
    paused: {
      label: "Paused",
      description: "Program setup remains recorded while implementation is paused."
    },
    closed: {
      label: "Closed",
      description: "The implementation workspace is closed."
    }
  };
  return facts[status ?? "draft"];
}

function activationFact(
  workspaceStatus?: OnboardingWorkspaceStatus,
  provisioningStatus?: PartnerProvisioningStatus
) {
  if (
    workspaceStatus === "live" ||
    provisioningStatus === "active" ||
    provisioningStatus === "provisioned"
  ) {
    return { label: "Active", description: "The canonical provisioning record marks the program active." };
  }
  return { label: "Inactive", description: "Administrator access alone does not activate the program." };
}

function nextActionFor(
  status: FirstAdminAccessView["accessStatus"],
  workspaceStatus?: OnboardingWorkspaceStatus
) {
  if (status === "invitation_pending") return "Ask the named administrator to use the current invitation before it expires.";
  if (status === "invitation_expired") return "Replace the expired invitation after confirming the administrator and work email.";
  if (status === "invitation_revoked") return "Create a new invitation only after confirming access should be restored.";
  if (status === "no_administrator") return "Create the first Partner Administrator invitation.";
  if (status === "access_needs_attention") return "Review the access history and reconcile the administrator record.";
  if (workspaceStatus === "ready_for_review") return "Wait for LegalEase to review the submitted Program configuration.";
  if (workspaceStatus === "waiting_on_partner") return "Open the onboarding workspace and address the requested changes.";
  if (workspaceStatus === "ready_to_launch" || workspaceStatus === "live") return "Review publication and activation gates before scheduling launch.";
  return "Open the onboarding workspace and continue Program configuration.";
}

function readableDate(value?: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date);
}
