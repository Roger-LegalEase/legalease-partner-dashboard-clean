// The canonical partner-facing copy contract for RCAP onboarding.
//
// Every partner-visible surface reads its wording from here. Nothing in this module
// participates in a decision: status evaluation stays in the service, derivation and
// launch-readiness layers, and this module turns the result into the sentences a program
// director reads.
//
// The rule this module exists to enforce is that no stored value ever reaches a partner.
// A section whose stored status is `not_started` is a storage fact; "Getting started" is
// what a partner reads. Components must never receive the former.
//
// Every blocked, incomplete or waiting state answers the same five questions:
//   1. What is happening?          -> heading
//   2. Does the partner act?       -> owner
//   3. Who owns the next step?     -> ownerLabel
//   4. What is the one next step?  -> primaryAction  (exactly one, never two)
//   5. Where is help?              -> support        (only when a human can help)

import { nextActionOwnerLabel } from "./partner-labels";
import { getPartnerSupportContact } from "./support-contact";

export type PartnerStateOwner = "partner" | "legalease" | "none";

export type PartnerPrimaryAction = {
  label: string;
  href: string | null;
};

/** One designed partner state. Never assembled ad hoc inside a component. */
export type PartnerState = {
  heading: string;
  explanation: string;
  owner: PartnerStateOwner;
  ownerLabel: string;
  primaryAction: PartnerPrimaryAction | null;
  support: { label: string; href: string; accessibleName: string } | null;
};

// Section 4 requires ownership to read as the partner's own team, LegalEase, or nobody.
// "Your organization" was the previous wording and it made LegalEase-owned commercial work
// look like partner work on the one screen where that distinction decides who picks up the
// phone. The three sentences themselves belong to the status vocabulary module, which every
// other surface already reads; a second copy here would be free to drift from it.
export function partnerOwnerLabel(owner: PartnerStateOwner): string {
  return nextActionOwnerLabel(owner);
}

function supportPath(subject: string) {
  const contact = getPartnerSupportContact();
  return {
    label: contact.label,
    href: `mailto:${contact.email}?subject=${encodeURIComponent(`RCAP setup: ${subject}`)}`,
    accessibleName: contact.accessibleName
  };
}

function state(input: {
  heading: string;
  explanation: string;
  owner: PartnerStateOwner;
  action?: PartnerPrimaryAction | null;
  supportSubject?: string | null;
}): PartnerState {
  return {
    heading: input.heading,
    explanation: input.explanation,
    owner: input.owner,
    ownerLabel: partnerOwnerLabel(input.owner),
    primaryAction: input.action ?? null,
    support: input.supportSubject ? supportPath(input.supportSubject) : null
  };
}

/* ------------------------------------------------ prepared onboarding (§5) */

export const PREPARED_BANNER = state({
  heading: "Your starting setup is ready to review",
  explanation:
    "LegalEase used the program information already on file to prepare your workspace. Review each section, update anything that has changed, and complete the decisions only your team can make.",
  owner: "partner",
  action: { label: "Review prepared setup", href: "/partner/onboarding" }
});

/** The three summary cards. Counts of work, never counts of failures. */
export const PREPARATION_CARD_LABELS = {
  prepared: "Prepared by LegalEase",
  needsInput: "Needs your input",
  optional: "Optional"
} as const;

/** Per-field provenance. What a partner needs is why a value is already filled in. */
export const FIELD_COPY = {
  prepared: {
    label: "Prepared by LegalEase",
    supporting: "Based on the program information already on file.",
    action: "Edit"
  },
  shared: {
    label: "Please confirm",
    supporting: "Review this information and update it if anything has changed."
  },
  partnerOwned: {
    label: "Your input is needed",
    supporting: "Your team is the best source for this information."
  },
  optional: {
    label: "Optional",
    supporting: "Add this information when it would help LegalEase prepare your program."
  },
  // Once a partner edits a prepared value the field is theirs, and both sides need to see
  // that: the partner needs to know their edit stuck, and LegalEase must not quietly
  // replace it on a later preparation run.
  partnerUpdated: {
    label: "Partner updated",
    supporting: "Your team changed this prepared value. LegalEase will not replace it without asking."
  }
} as const;

/** Review summary labels. Work remaining, phrased as work rather than as defects. */
export const REVIEW_SUMMARY_LABELS = {
  sectionsConfirmed: "Sections confirmed",
  sectionsRemaining: "Sections remaining",
  decisionsRemaining: "Decisions remaining",
  changesSincePreparation: "Changes since preparation",
  requestsFromLegalEase: "Requests from LegalEase"
} as const;

/**
 * The one action a partner is offered for program setup, wherever it is offered: the
 * dashboard program-setup card and the Implementation Center both point at the same next
 * step. Both surfaces derived this independently and could disagree about whether a staff
 * member sees "View setup" or "Continue setup" on the same workspace.
 */
export function setupActionLabel(input: {
  role: string;
  canEdit: boolean;
  workspaceStatus: string;
  reviewReady: boolean;
}): "Continue setup" | "Review and submit" | "View setup" | "View program setup" {
  if (["ready_to_launch", "live", "paused", "closed"].includes(input.workspaceStatus.trim().toLowerCase())) {
    return "View program setup";
  }
  if (input.role === "partner_staff" || !input.canEdit) return "View setup";
  return input.reviewReady ? "Review and submit" : "Continue setup";
}

export function reviewState(input: { readyToSubmit: boolean; submitHref: string; firstSectionHref: string | null }): PartnerState {
  if (input.readyToSubmit) {
    return state({
      heading: "Your setup is ready for final review",
      explanation:
        "Your required program information is complete. Review your answers one more time, then submit the setup to LegalEase.",
      owner: "partner",
      action: { label: "Review and submit", href: input.submitHref }
    });
  }
  return state({
    heading: "Your setup is partly prepared",
    explanation:
      "We completed the information already on file. Review it, update anything that has changed, and complete the remaining decisions before submitting your setup to LegalEase.",
    owner: "partner",
    action: { label: "Review prepared setup", href: input.firstSectionHref ?? "/partner/onboarding" }
  });
}

/**
 * The review page's "Current next action". Four states, one of which is the read-only staff
 * state below, and the page used to assemble all four from literals held in the component.
 * Two of those literals were already in this module, free to drift from it.
 */
export function reviewNextActionState(input: {
  submitted: boolean;
  submitEnabled: boolean;
  nextSectionTitle: string | null;
  nextSectionHref: string | null;
  submitHref: string;
  returnHref: string;
}): PartnerState {
  if (input.submitted) {
    return state({
      heading: "Your setup is with LegalEase",
      explanation:
        "LegalEase owns the next review decision. We'll let you know here if anything needs a change.",
      owner: "legalease"
    });
  }
  if (input.nextSectionTitle && input.nextSectionHref) {
    return state({
      heading: "Continue your next section",
      explanation: `Pick up where you left off in ${input.nextSectionTitle}.`,
      owner: "partner",
      action: { label: "Continue your next section", href: input.nextSectionHref }
    });
  }
  if (input.submitEnabled) {
    return state({
      heading: "Your setup is ready for final review",
      explanation:
        "Your required program information is complete. Submitting starts LegalEase review. It doesn't publish your page or activate your program.",
      owner: "partner",
      action: { label: "Submit for LegalEase review", href: input.submitHref }
    });
  }
  return {
    ...readOnlyStaffState(),
    primaryAction: { label: "Return to implementation center", href: input.returnHref }
  };
}

export function sectionConfirmationState(confirmHref: string): PartnerState {
  return state({
    heading: "Ready to confirm this section?",
    explanation:
      "Review the prepared information and make any changes your team needs. You can return to this section later if your program details change.",
    owner: "partner",
    action: { label: "Confirm this section", href: confirmHref }
  });
}

/* --------------------------------------------- commercial and procurement (§6) */

/**
 * The commercial gate has two entirely different meanings depending on who owns the
 * remaining step, and only one of them is a partner action. A LegalEase-owned gate is
 * never counted as partner work and never renders as a warning.
 */
export function commercialState(input: {
  outcome: "legalease_owned" | "partner_owned" | "cleared";
  partnerActionCopy?: string | null;
  partnerActionHref?: string | null;
}): PartnerState {
  if (input.outcome === "cleared") {
    return state({
      heading: "Program terms confirmed",
      explanation: "Your program can continue through implementation planning.",
      owner: "none"
    });
  }
  if (input.outcome === "legalease_owned") {
    return state({
      heading: "Program terms are being finalized",
      explanation:
        "LegalEase is confirming the remaining agreement details for your program. No action is needed from your team right now.",
      owner: "legalease"
    });
  }
  return state({
    heading: "One agreement step needs your attention",
    explanation:
      input.partnerActionCopy?.trim()
        ? `Complete the item below so LegalEase can continue preparing your program. ${input.partnerActionCopy.trim()}`
        : "Complete the item below so LegalEase can continue preparing your program.",
    owner: "partner",
    action: input.partnerActionHref ? { label: "Review agreement step", href: input.partnerActionHref } : null,
    supportSubject: "Agreement step"
  });
}

/* ------------------------------------------------- save, error, recovery (§7) */

export const SAVE_COPY = {
  saving: "Saving your changes",
  saved: "Changes saved"
} as const;

export function saveFailureState(retryHref: string | null): PartnerState {
  return state({
    heading: "We could not save your changes",
    explanation:
      "Your changes are still on this page. Try saving again. If the problem continues, contact LegalEase support.",
    owner: "partner",
    action: { label: "Try saving again", href: retryHref },
    supportSubject: "Saving changes"
  });
}

export function concurrentUpdateState(refreshHref: string): PartnerState {
  return state({
    heading: "This section was updated in another session",
    explanation: "Refresh the page to review the latest information before saving again.",
    owner: "partner",
    action: { label: "Review latest version", href: refreshHref }
  });
}

export function expiredSessionState(signInHref: string): PartnerState {
  return state({
    heading: "Please sign in again to continue",
    explanation: "Your saved information is still available.",
    owner: "partner",
    action: { label: "Sign in", href: signInHref }
  });
}

export function readOnlyStaffState(): PartnerState {
  return state({
    heading: "You can view this program setup",
    explanation:
      "Only a partner administrator can make changes or submit information to LegalEase.",
    owner: "none"
  });
}

/**
 * The one sentence a partner reads when an action on a saved record could not be applied.
 * The artifacts board and the launch-readiness list both used to hold their own copy of it,
 * and both fell back to the service's own error text, which is internal diagnostic wording.
 */
export const ACTION_FAILURE_COPY = "That action could not be completed." as const;

/* ----------------------------------------------------- invitation states (§7) */

export function invitationSendFailureState(retryHref: string | null): PartnerState {
  return state({
    heading: "We could not send the invitation",
    explanation:
      "No additional invitation was created. Try again, or contact partners@legalease.com if the problem continues.",
    owner: "partner",
    action: retryHref ? { label: "Try sending again", href: retryHref } : null,
    supportSubject: "Administrator invitation"
  });
}

/**
 * Deliberately does not name the invited address. The person reading this screen is signed
 * in as somebody else, and telling them which mailbox was invited would disclose a
 * colleague's address to an account that has not been shown to own it.
 */
export function wrongAccountInvitationState(signOutHref: string): PartnerState {
  return state({
    heading: "Sign in with the invited email address",
    explanation:
      "This invitation was sent to a different email address. Sign out, then sign in with the address that received the invitation.",
    owner: "partner",
    action: { label: "Sign out", href: signOutHref },
    supportSubject: "Administrator invitation"
  });
}

/**
 * Partner staff invitation outcomes. The form and the endpoint that answers it both speak
 * these sentences: the endpoint returns them, and the form falls back to them when a
 * response cannot be read. They are authored here so the two can never disagree about what
 * happened to an invitation.
 */
export const INVITATION_DELIVERY_COPY = {
  unavailable: "Unable to invite partner staff right now.",
  rateLimited: "Too many invite attempts. Please try again later.",
  signedOut: "Sign in with a partner admin account and try again.",
  forbidden: "Partner admin access is required to invite staff.",
  failed: "Unable to invite partner staff.",
  alreadyMapped: "That user already has partner staff access.",
  existingUserMapped: "Existing user was granted partner staff access.",
  created: "Partner staff invitation created."
} as const;

/* ------------------------------------------------------------ status labels (§8) */

// Stored status values are turned into partner sentences by partner-labels.ts, which the
// onboarding home, the section editor, the review page and the dashboard card all read.
// This module deliberately keeps no second map of the same values: two vocabularies for
// one stored status is how "Not started" and "Getting started" end up on two screens
// describing the same section.
export {
  agreementStatusLabel,
  sectionStatusLabel,
  workspaceStatusLabel
} from "./partner-labels";

/**
 * The only place "Blocked" is allowed. The business reason is required, so a blocked
 * launch state can never render as a bare word with nothing a partner can act on.
 */
export function launchBlockedState(businessReason: string, href: string | null): PartnerState {
  return state({
    heading: "Blocked",
    explanation: businessReason,
    owner: "legalease",
    action: href ? { label: "Review launch readiness", href } : null,
    supportSubject: "Launch readiness"
  });
}
