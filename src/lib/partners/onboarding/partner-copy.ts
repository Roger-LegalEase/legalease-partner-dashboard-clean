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
// phone.
const OWNER_LABELS: Record<PartnerStateOwner, string> = {
  partner: "Your team",
  legalease: "LegalEase",
  none: "No action needed"
};

export function partnerOwnerLabel(owner: PartnerStateOwner): string {
  return OWNER_LABELS[owner] ?? OWNER_LABELS.none;
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

/* ------------------------------------------------------------ status labels (§8) */

// Short, commercial and truthful. "Blocked" is reserved for a true launch-readiness
// status and always arrives with a business reason attached.
const PARTNER_STATUS_LABELS: Record<string, string> = {
  not_started: "Getting started",
  prepared: "Prepared for review",
  in_progress: "Getting started",
  needs_partner_input: "Needs your input",
  ready_to_submit: "Ready to submit",
  submitted: "Under LegalEase review",
  under_review: "Under LegalEase review",
  needs_changes: "Changes requested",
  approved: "Approved",
  not_ready: "Not ready",
  private: "Private",
  inactive: "Inactive",
  not_scheduled: "Not scheduled",
  none: "No action needed"
};

/**
 * Any value missing from the map returns neutral partner copy rather than a prettified
 * stored value. A status added to storage without being added here must never reach a
 * partner as machine vocabulary.
 */
export function partnerStatusLabel(value: string): string {
  return PARTNER_STATUS_LABELS[value.trim().toLowerCase()] ?? "In progress";
}

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
